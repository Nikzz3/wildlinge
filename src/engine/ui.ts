/** Reusable UI components (TextBox, Menu) and the g.ui modal helpers built on them. */
import { icon } from '../art';
import type { GameContext, Gfx, MenuOpts, MessageOpts, Scene, UiApi } from '../core/contracts';
import { fmt } from '../state';
import { COLORS } from './gfx';
import { LINE_HEIGHT, measureText, paginate } from './text';

export const DIALOG = { x: 0, y: 112, w: 240, h: 48 } as const;

const SPEED: Record<'slow' | 'normal' | 'fast', number> = { slow: 0.4, normal: 0.8, fast: 2 };

export function textSpeed(g: GameContext): number {
  return g.testMode ? Infinity : SPEED[g.state.options.textSpeed];
}

export interface TextBoxOpts {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  style?: 'light' | 'dark';
  lines?: number;
  padX?: number;
  padY?: number;
}

/**
 * Typewriter text box with paging. Embed it in any scene:
 * call show(), then update(g) each frame and render(gfx, g); check `finished`.
 */
export class TextBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly style: 'light' | 'dark';
  readonly lines: number;
  readonly padX: number;
  readonly padY: number;
  private pages: string[][] = [['']];
  private page = 0;
  private shown = 0;
  private acc = 0;
  private autoTimer = 0;
  private auto = false;
  /** All pages shown and confirmed (or auto-closed). */
  finished = true;

  constructor(opts: TextBoxOpts = {}) {
    this.x = opts.x ?? DIALOG.x;
    this.y = opts.y ?? DIALOG.y;
    this.w = opts.w ?? DIALOG.w;
    this.h = opts.h ?? DIALOG.h;
    this.style = opts.style ?? 'light';
    this.lines = opts.lines ?? 2;
    this.padX = opts.padX ?? 10;
    this.padY = opts.padY ?? 7;
  }

  /** auto: don't wait for a button on the last page; finish ~0.5s after it is fully shown. */
  show(text: string, auto = false): void {
    this.pages = paginate(text, this.w - this.padX * 2 - 8, this.lines);
    this.page = 0;
    this.shown = 0;
    this.acc = 0;
    this.autoTimer = 0;
    this.auto = auto;
    this.finished = false;
  }

  private get pageLength(): number {
    return this.pages[this.page]!.reduce((n, l) => n + l.length, 0);
  }

  /** Current page is still being typed. */
  get typing(): boolean {
    return !this.finished && this.shown < this.pageLength;
  }

  /** Last page fully revealed (it may still wait for confirmation). */
  get lastPageShown(): boolean {
    return this.page === this.pages.length - 1 && !this.typing;
  }

  update(g: GameContext): void {
    if (this.finished) return;
    const len = this.pageLength;
    if (this.shown < len) {
      const speed = textSpeed(g);
      const boost = g.input.held('a') || g.input.held('b') ? 2 : 1;
      if (g.input.pressed('a') || g.input.pressed('b') || speed === Infinity) this.shown = len;
      else {
        const before = this.shown;
        this.acc += speed * boost;
        this.shown = Math.min(len, Math.floor(this.acc));
        if (Math.floor(this.shown / 3) !== Math.floor(before / 3)) g.audio.playSfx('text');
      }
      return;
    }
    const last = this.page === this.pages.length - 1;
    if (last && this.auto) {
      if (++this.autoTimer >= (g.testMode ? 1 : 30)) this.finished = true;
      return;
    }
    if (g.input.pressed('a') || g.input.pressed('b')) {
      if (last) this.finished = true;
      else {
        this.page++;
        this.shown = 0;
        this.acc = 0;
      }
    }
  }

  /** Draws the box. Set `frame` false to draw only the text (custom backgrounds). */
  render(gfx: Gfx, g: GameContext, frame = true): void {
    if (frame) gfx.drawWindow(this.x, this.y, this.w, this.h, this.style);
    const color = this.style === 'light' ? COLORS.text : COLORS.textLight;
    const shadow = this.style === 'light' ? COLORS.textShadow : COLORS.textLightShadow;
    let budget = this.shown;
    this.pages[this.page]!.forEach((line, i) => {
      const visible = line.slice(0, Math.max(0, budget));
      budget -= line.length;
      gfx.drawText(visible, this.x + this.padX, this.y + this.padY + i * LINE_HEIGHT, { color, shadow });
    });
    const waiting = !this.finished && !this.typing && !(this.auto && this.page === this.pages.length - 1);
    if (waiting) {
      const bob = Math.floor(g.frame / 16) % 2;
      gfx.drawBitmap(icon('arrow_down'), this.x + this.w - this.padX - 6, this.y + this.h - 14 + bob, {
        tint: this.style === 'light' ? '#e05838' : '#f8f8f8',
      });
    }
  }
}

export interface MenuConfig {
  x: number;
  y: number;
  width?: number;
  initial?: number;
  /** Value returned on B; null = not cancelable. */
  cancel?: number | null;
  /** Options that are shown greyed out and cannot be chosen. */
  disabled?: readonly boolean[];
}

/** Vertical cursor menu in a window. update() returns the chosen index / cancel value once, else null. */
export class Menu {
  index: number;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  private readonly cancel: number | null;

  constructor(
    public options: readonly string[],
    private readonly cfg: MenuConfig,
  ) {
    this.index = Math.max(0, Math.min(options.length - 1, cfg.initial ?? 0));
    this.cancel = cfg.cancel === undefined ? -1 : cfg.cancel;
    this.x = cfg.x;
    this.y = cfg.y;
    this.w = cfg.width ?? Menu.autoWidth(options);
    this.h = Menu.heightFor(options.length);
  }

  static autoWidth(options: readonly string[]): number {
    return Math.max(...options.map((o) => measureText(o)), 16) + 28;
  }

  static heightFor(rows: number): number {
    return rows * LINE_HEIGHT + 10;
  }

  update(g: GameContext): number | null {
    const n = this.options.length;
    if (g.input.repeat('up')) {
      this.index = (this.index - 1 + n) % n;
      g.audio.playSfx('cursor');
    } else if (g.input.repeat('down')) {
      this.index = (this.index + 1) % n;
      g.audio.playSfx('cursor');
    } else if (g.input.pressed('a')) {
      if (this.cfg.disabled?.[this.index]) {
        g.audio.playSfx('bump');
        return null;
      }
      g.audio.playSfx('confirm');
      return this.index;
    } else if (g.input.pressed('b') && this.cancel !== null) {
      g.audio.playSfx('cancel');
      return this.cancel;
    }
    return null;
  }

  render(gfx: Gfx): void {
    gfx.drawWindow(this.x, this.y, this.w, this.h);
    this.options.forEach((opt, i) => {
      const rowY = this.y + 5 + i * LINE_HEIGHT;
      const disabled = this.cfg.disabled?.[i];
      gfx.drawText(opt, this.x + 18, rowY, disabled ? { color: '#a0a098' } : {});
      if (i === this.index) gfx.drawBitmap(icon('cursor'), this.x + 7, rowY + 4);
    });
  }
}

// ---------------------------------------------------------------------------
// Modal scenes
// ---------------------------------------------------------------------------

class MessageScene implements Scene {
  readonly name = 'message';
  readonly overlay = true;
  private readonly box = new TextBox();
  private menu: Menu | null = null;

  constructor(
    g: GameContext,
    text: string,
    private readonly opts: MessageOpts,
    private readonly close: (result: number) => void,
    private readonly choices: readonly string[] | null = null,
    private readonly menuOpts: MenuOpts = {},
  ) {
    this.box.show(fmt(g.state, text), opts.auto === true || choices !== null);
  }

  update(g: GameContext): void {
    if (this.choices) {
      if (!this.menu) {
        this.box.update(g);
        if (this.box.lastPageShown) {
          const w = this.menuOpts.width ?? Menu.autoWidth(this.choices);
          const h = Menu.heightFor(this.choices.length);
          const cancel = this.menuOpts.cancel === undefined ? this.choices.length - 1 : this.menuOpts.cancel;
          this.menu = new Menu(this.choices, {
            x: this.menuOpts.x ?? DIALOG.w - w,
            y: this.menuOpts.y ?? DIALOG.y - h,
            width: w,
            initial: this.menuOpts.initial,
            cancel,
          });
        }
        return;
      }
      const r = this.menu.update(g);
      if (r !== null) this.close(r);
      return;
    }
    this.box.update(g);
    if (this.box.finished) this.close(0);
  }

  render(gfx: Gfx, g: GameContext): void {
    this.box.render(gfx, g);
    this.menu?.render(gfx);
  }
}

class MenuScene implements Scene {
  readonly name = 'menu';
  readonly overlay = true;
  private readonly menu: Menu;

  constructor(
    options: readonly string[],
    opts: MenuOpts,
    private readonly close: (r: number) => void,
  ) {
    const w = opts.width ?? Menu.autoWidth(options);
    this.menu = new Menu(options, {
      x: opts.x ?? 240 - w,
      y: opts.y ?? 0,
      width: w,
      initial: opts.initial,
      cancel: opts.cancel === undefined ? -1 : opts.cancel,
    });
  }

  update(g: GameContext): void {
    const r = this.menu.update(g);
    if (r !== null) this.close(r);
  }

  render(gfx: Gfx): void {
    this.menu.render(gfx);
  }
}

class QuantityScene implements Scene {
  readonly name = 'quantity';
  readonly overlay = true;
  private value = 1;

  constructor(
    private readonly max: number,
    private readonly opts: { unitPrice?: number; x?: number; y?: number },
    private readonly close: (r: number | null) => void,
  ) {}

  update(g: GameContext): void {
    const before = this.value;
    if (g.input.repeat('up')) this.value = this.value >= this.max ? 1 : this.value + 1;
    else if (g.input.repeat('down')) this.value = this.value <= 1 ? this.max : this.value - 1;
    else if (g.input.repeat('right')) this.value = Math.min(this.max, this.value + 10);
    else if (g.input.repeat('left')) this.value = Math.max(1, this.value - 10);
    else if (g.input.pressed('a')) {
      g.audio.playSfx('confirm');
      this.close(this.value);
    } else if (g.input.pressed('b')) {
      g.audio.playSfx('cancel');
      this.close(null);
    }
    if (before !== this.value) g.audio.playSfx('cursor');
  }

  render(gfx: Gfx): void {
    const priced = this.opts.unitPrice !== undefined;
    const w = priced ? 104 : 48;
    const h = 26;
    const x = this.opts.x ?? 240 - w;
    const y = this.opts.y ?? DIALOG.y - h;
    gfx.drawWindow(x, y, w, h);
    gfx.drawText(`×${String(this.value).padStart(2, '0')}`, x + 9, y + 5);
    if (priced) gfx.drawText(`${this.value * this.opts.unitPrice!} Fr.`, x + w - 9, y + 5, { align: 'right' });
  }
}

export function createUi(g: () => GameContext): UiApi {
  return {
    message: (text, opts = {}) =>
      g()
        .open<number>((close) => new MessageScene(g(), text, opts, close))
        .then(() => undefined),
    ask: (text, options, opts = {}) => g().open<number>((close) => new MessageScene(g(), text, {}, close, options, opts)),
    confirm: (text) =>
      g()
        .open<number>((close) => new MessageScene(g(), text, {}, close, ['Ja', 'Nein'], { cancel: 1 }))
        .then((r) => r === 0),
    menu: (options, opts = {}) => g().open<number>((close) => new MenuScene(options, opts, close)),
    quantity: (max, opts = {}) => g().open<number | null>((close) => new QuantityScene(Math.max(1, max), opts, close)),
  };
}
