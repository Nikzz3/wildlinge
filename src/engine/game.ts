import { icon } from '../art';
import { createAudio } from '../audio';
import type { AudioApi, GameContext, Scene, UiApi } from '../core/contracts';
import { createRng, type Rng } from '../core/rng';
import type { SaveData } from '../core/types';
import { newGameState } from '../state';
import { START } from '../world';
import { CanvasGfx, SCREEN_H, SCREEN_W } from './gfx';
import { KeyboardInput } from './input';
import { createStorage, type Storage } from './storage';
import { createUi } from './ui';

const FRAME_MS = 1000 / 60;
/** Play time between autosaves (2 minutes). */
const AUTOSAVE_FRAMES = 60 * 120;
/** How long the save icon stays on screen after an autosave. */
const SAVE_ICON_FRAMES = 90;

interface Fade {
  alpha: number;
  color: string;
  target: number;
  step: number;
  resolve: (() => void) | null;
}

export interface GameOptions {
  testMode: boolean;
  /** No rAF loop; frames are advanced via step() (debug API). */
  manual: boolean;
  seed: number;
}

export class Game implements GameContext {
  readonly input = new KeyboardInput();
  readonly audio: AudioApi = createAudio();
  readonly ui: UiApi;
  readonly rng: Rng;
  readonly testMode: boolean;
  readonly manual: boolean;
  readonly gfx: CanvasGfx;
  readonly errors: string[] = [];
  state: SaveData = newGameState(START);
  frame = 0;
  private scenes: Scene[] = [];
  private readonly fade: Fade = { alpha: 0, color: '#000000', target: 0, step: 0, resolve: null };
  private waiters: { at: number; resolve: () => void }[] = [];
  private readonly storage: Storage;
  /** Play frames since the last save or load. */
  private sinceSave = 0;
  /** The state object last saved or loaded. Autosave only overwrites the save of the game being played. */
  private persisted: SaveData | null = null;
  private saveIconAt = -SAVE_ICON_FRAMES;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    opts: GameOptions,
  ) {
    this.testMode = opts.testMode;
    this.manual = opts.manual;
    this.rng = createRng(opts.seed);
    this.storage = createStorage(opts.testMode);
    this.gfx = new CanvasGfx(canvas.getContext('2d')!);
    this.ui = createUi(() => this);
    this.input.attach(window);
    this.input.onFirstInput = () => this.audio.unlock();
    window.addEventListener('resize', () => this.fitCanvas());
    window.addEventListener('error', (e) => this.reportError(e.error ?? e.message));
    window.addEventListener('unhandledrejection', (e) => this.reportError(e.reason));
    this.fitCanvas();
  }

  get stack(): readonly Scene[] {
    return this.scenes;
  }

  reportError(err: unknown): void {
    const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
    console.error(err);
    this.errors.push(msg);
  }

  // --- scene stack ----------------------------------------------------------

  push(scene: Scene): void {
    this.scenes.push(scene);
    scene.onEnter?.(this);
  }

  pop(scene?: Scene): void {
    const target = scene ?? this.scenes[this.scenes.length - 1];
    if (!target) return;
    const i = this.scenes.lastIndexOf(target);
    if (i < 0) return;
    const wasTop = i === this.scenes.length - 1;
    this.scenes.splice(i, 1);
    target.onExit?.(this);
    if (wasTop) this.scenes[this.scenes.length - 1]?.onResume?.(this);
  }

  replace(scene: Scene): void {
    const top = this.scenes.pop();
    top?.onExit?.(this);
    this.push(scene);
  }

  reset(scene: Scene): void {
    for (const s of this.scenes.splice(0).reverse()) s.onExit?.(this);
    this.push(scene);
  }

  open<T>(make: (close: (result: T) => void) => Scene): Promise<T> {
    return new Promise<T>((resolve) => {
      let done = false;
      let scene: Scene | null = null;
      const close = (result: T) => {
        if (done) return;
        done = true;
        if (scene) this.pop(scene);
        this.input.consume();
        resolve(result);
      };
      scene = make(close);
      if (!done) this.push(scene);
    });
  }

  // --- timing & fades ---------------------------------------------------------

  wait(frames: number): Promise<void> {
    if (frames <= 0) return Promise.resolve();
    return new Promise((resolve) => this.waiters.push({ at: this.frame + frames, resolve }));
  }

  fadeOut(frames = 16, color = '#000000'): Promise<void> {
    return this.startFade(1, frames, color);
  }

  fadeIn(frames = 16): Promise<void> {
    return this.startFade(0, frames, this.fade.color);
  }

  private startFade(target: number, frames: number, color: string): Promise<void> {
    this.fade.resolve?.();
    const n = this.testMode ? 1 : Math.max(1, frames);
    this.fade.color = color;
    this.fade.target = target;
    this.fade.step = Math.abs(target - this.fade.alpha) / n || 1;
    return new Promise((resolve) => {
      this.fade.resolve = resolve;
    });
  }

  /** True while the screen is (partly) covered by a fade. */
  get fading(): boolean {
    return this.fade.alpha > 0 || this.fade.resolve !== null;
  }

  // --- persistence ------------------------------------------------------------

  save(): void {
    if (!this.write()) this.reportError(new Error('Speichern fehlgeschlagen'));
  }

  private write(): boolean {
    if (!this.storage.write(this.state)) return false;
    this.persisted = this.state;
    this.sinceSave = 0;
    return true;
  }

  /** Saves every AUTOSAVE_FRAMES of play, once the overworld is the only scene and at rest. */
  private autosave(): void {
    if (this.sinceSave < AUTOSAVE_FRAMES || this.fading || this.scenes.length !== 1) return;
    if (!this.scenes[0]!.canAutosave?.()) return;
    this.sinceSave = 0;
    // a new game started over an existing save must not silently replace it; a manual save takes over
    if (this.state !== this.persisted && this.storage.exists()) return;
    if (this.write()) this.saveIconAt = this.frame;
    else this.reportError(new Error('Automatisches Speichern fehlgeschlagen'));
  }

  hasSave(): boolean {
    return this.storage.exists();
  }

  load(): boolean {
    const data = this.storage.read();
    if (!data) return false;
    this.state = data;
    this.persisted = data;
    this.sinceSave = 0;
    this.applyOptions();
    return true;
  }

  applyOptions(): void {
    this.audio.setVolumes(this.state.options.musicVolume, this.state.options.sfxVolume);
  }

  // --- loop -----------------------------------------------------------------

  /** One fixed 60 Hz tick: input, top-scene update, timers, fade. Rendering is separate. */
  tick(): void {
    this.input.update();
    const top = this.scenes[this.scenes.length - 1];
    try {
      top?.update(this);
    } catch (err) {
      this.reportError(err);
    }
    this.frame++;
    if (this.scenes[0]?.name === 'overworld') {
      this.state.playFrames++;
      this.sinceSave++;
      this.autosave();
    }
    if (this.waiters.length) {
      const due = this.waiters.filter((w) => w.at <= this.frame);
      this.waiters = this.waiters.filter((w) => w.at > this.frame);
      for (const w of due) w.resolve();
    }
    const f = this.fade;
    if (f.alpha !== f.target) {
      f.alpha = f.alpha < f.target ? Math.min(f.target, f.alpha + f.step) : Math.max(f.target, f.alpha - f.step);
    } else if (f.resolve) {
      const r = f.resolve;
      f.resolve = null;
      r();
    }
  }

  render(): void {
    const g = this.gfx;
    let from = this.scenes.length - 1;
    while (from > 0 && this.scenes[from]!.overlay) from--;
    g.clear('#000000');
    for (let i = Math.max(0, from); i < this.scenes.length; i++) {
      try {
        this.scenes[i]!.render(g, this);
      } catch (err) {
        this.reportError(err);
      }
    }
    this.drawSaveIcon();
    g.overlay(this.fade.color, this.fade.alpha);
    if (this.errors.length && !this.testMode) {
      g.fillRect(0, 0, 240, 12, '#600000');
      g.drawText(`Fehler: ${this.errors[this.errors.length - 1]!.split('\n')[0]!.slice(0, 44)}`, 2, -2, {
        color: '#ffffff',
        shadow: null,
      });
    }
  }

  /** Floppy in the top-right corner after an autosave; hidden as soon as a menu or dialog opens. */
  private drawSaveIcon(): void {
    const t = this.frame - this.saveIconAt;
    if (t >= SAVE_ICON_FRAMES || this.scenes.length !== 1) return;
    const alpha = Math.min(1, t / 8, (SAVE_ICON_FRAMES - t) / 16);
    this.gfx.drawBitmap(icon('save'), this.gfx.width - 16, 4, { alpha });
  }

  step(): void {
    this.tick();
    this.render();
  }

  start(): void {
    if (this.manual) {
      this.render();
      return;
    }
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      acc += Math.min(250, now - last);
      last = now;
      let ticks = 0;
      while (acc >= FRAME_MS && ticks < 5) {
        this.tick();
        acc -= FRAME_MS;
        ticks++;
      }
      if (ticks > 0) this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private fitCanvas(): void {
    const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / SCREEN_W, window.innerHeight / SCREEN_H)));
    this.canvas.style.width = `${SCREEN_W * scale}px`;
    this.canvas.style.height = `${SCREEN_H * scale}px`;
  }
}

export function createGame(canvas: HTMLCanvasElement, opts: GameOptions): Game {
  return new Game(canvas, opts);
}
