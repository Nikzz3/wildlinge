/** Title screen: logo, alpine panorama with the legendary guardian, then the main menu. */
import { creatureSprite, icon } from '../art';
import type { GameContext, Gfx, Scene } from '../core/contracts';
import { COLORS } from '../engine/gfx';
import { createOverworld } from '../overworld';
import { newGameState, playTime } from '../state';
import { openOptions } from '../ui/screens';
import { START } from '../world';
import { clamp01, drawBottom, sparkle, withAlpha } from './fx';
import { runIntro } from './intro';
import { copyrightSign, drawShine, titleLogo } from './logo';
import { SUMMIT, drawPanoramaBack, drawPanoramaFront } from './panorama';

/** The fire/light guardian of the Alpenglut. */
const LEGEND_SPECIES = 'lindglut';
/** Its sun-ray mane sits left of the sprite center: shift it so the face is right above the summit. */
const LEGEND_DX = 5;
/** Height of the face above the sprite's bottom edge (the sparkle ring bursts from there). */
const LEGEND_FACE_Y = 32;

const LOGO_Y = 6;
const LETTER_DELAY = 5;
const DROP_FRAMES = 24;
const SUBTITLE_AT = 64;
const REVEAL_AT = 84;
const REVEAL_FRAMES = 48;
const READY_AT = 140;
const SHINE_EVERY = 300;

/** 'confirm' = overwrite question open (menu hidden), 'busy' = a menu action is running. */
type Mode = 'attract' | 'menu' | 'confirm' | 'busy';
type EntryId = 'continue' | 'new' | 'options';

interface Entry {
  id: EntryId;
  label: string;
  h: number;
}

const MENU_X = 20;
const MENU_W = 200;
const ROW_H = 24;
const CONTINUE_H = 52;
const MENU_GAP = 3;
/** Save summary: label x and value right edge per column; the left one fits an 8-letter uppercase name. */
const SUMMARY_COLS = [
  { x: MENU_X + 20, right: MENU_X + 116 },
  { x: MENU_X + 126, right: MENU_X + MENU_W - 12 },
] as const;

function bounce(t: number): number {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t - 1.5 / d) ** 2 + 0.75;
  if (t < 2.5 / d) return n * (t - 2.25 / d) ** 2 + 0.9375;
  return n * (t - 2.625 / d) ** 2 + 0.984375;
}

class TitleScene implements Scene {
  readonly name = 'title';
  private t = 0;
  private mode: Mode = 'attract';
  private entries: Entry[] = [];
  private index = 0;
  /** null until the menu is opened the first time (the save is loaded once per title visit). */
  private hasSave: boolean | null = null;
  private readonly legend = creatureSprite(LEGEND_SPECIES, 'front');

  onEnter(g: GameContext): void {
    g.audio.playMusic('title');
    void g.fadeIn(24);
  }

  update(g: GameContext): void {
    this.t++;
    if (this.mode === 'attract') this.updateAttract(g);
    else if (this.mode === 'menu') this.updateMenu(g);
  }

  private updateAttract(g: GameContext): void {
    if (!g.input.pressed('start') && !g.input.pressed('a')) return;
    if (this.t < READY_AT) {
      this.t = READY_AT; // skip the opening animation
      return;
    }
    g.audio.playSfx('confirm');
    this.hasSave ??= g.hasSave() && g.load();
    this.entries = [
      ...(this.hasSave ? [{ id: 'continue', label: 'WEITER', h: CONTINUE_H } as const] : []),
      { id: 'new', label: 'NEUES SPIEL', h: ROW_H },
      { id: 'options', label: 'OPTIONEN', h: ROW_H },
    ];
    this.index = 0;
    this.mode = 'menu';
  }

  private updateMenu(g: GameContext): void {
    const n = this.entries.length;
    if (g.input.repeat('up')) {
      this.index = (this.index - 1 + n) % n;
      g.audio.playSfx('cursor');
    } else if (g.input.repeat('down')) {
      this.index = (this.index + 1) % n;
      g.audio.playSfx('cursor');
    } else if (g.input.pressed('b')) {
      g.audio.playSfx('cancel');
      this.mode = 'attract';
    } else if (g.input.pressed('a') || g.input.pressed('start')) {
      g.audio.playSfx('confirm');
      const id = this.entries[this.index]!.id;
      this.mode = 'busy';
      void this.choose(g, id).then(
        (stay) => {
          if (stay) this.mode = 'menu';
        },
        (err: unknown) => {
          this.recover(g);
          throw err; // surfaces through the game's unhandledrejection error reporter
        },
      );
    }
  }

  /** A menu action failed: drop whatever it left above the title and hand the menu back (no soft-lock). */
  private recover(g: GameContext): void {
    if (!g.stack.includes(this)) return; // the game already moved on (e.g. the overworld is running)
    while (g.stack[g.stack.length - 1] !== this) g.pop();
    if (this.hasSave) g.load(); // a half-started new game must not replace the loaded save
    this.mode = 'menu';
    void g.fadeIn(16);
  }

  /** Runs a menu action. Resolves true if the title stays active (back to the menu). */
  private async choose(g: GameContext, id: EntryId): Promise<boolean> {
    if (id === 'options') {
      await openOptions(g);
      return true;
    }
    if (id === 'continue') {
      // the save was loaded when the menu opened (options changed meanwhile are kept)
      await g.fadeOut(24);
      g.reset(createOverworld(g));
      await g.fadeIn(24);
      return false;
    }
    if (this.hasSave) {
      this.mode = 'confirm';
      const pick = await g.ui.ask(
        'Es gibt bereits einen Spielstand. Er wird beim Speichern überschrieben.\fTrotzdem ein neues Spiel beginnen?',
        ['Ja', 'Nein'],
        { initial: 1, cancel: 1 }, // replacing a save: the safe answer is the default
      );
      this.mode = 'busy';
      if (pick !== 0) return true;
    }
    await startNewGame(g);
    return false;
  }

  render(gfx: Gfx, g: GameContext): void {
    const f = g.frame;
    drawPanoramaBack(gfx, f);
    this.drawLegend(gfx, f);
    drawPanoramaFront(gfx, f);
    if (this.mode !== 'attract') gfx.overlay('#100818', 0.5);
    this.drawLogo(gfx);
    if (this.mode === 'attract') this.drawPrompt(gfx, f);
    else if (this.mode !== 'confirm') this.drawMenu(gfx, g);
  }

  private drawLegend(gfx: Gfx, f: number): void {
    const sprite = this.legend;
    const bottom = SUMMIT.y + Math.round(Math.sin(f / 30) * 2);
    const cx = SUMMIT.x + LEGEND_DX;
    // a dark silhouette with a bright rim, revealed after the logo has landed; then a soft pulsing glow
    const reveal = clamp01((this.t - REVEAL_AT) / REVEAL_FRAMES);
    const rim = reveal >= 1 ? 0.35 + 0.15 * Math.sin(f / 22) : 0.9;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const)
      drawBottom(gfx, sprite, cx + dx, bottom + dy, { tint: '#ffe0a0', alpha: rim });
    if (reveal > 0) drawBottom(gfx, sprite, cx, bottom);
    if (reveal < 1) drawBottom(gfx, sprite, cx, bottom, { tint: '#2a1030', alpha: 1 - reveal });
    // expanding ring of sparkles when the guardian appears
    const ring = (this.t - REVEAL_AT) / 40;
    if (ring > 0 && ring < 1) {
      const r = 10 + ring * 60;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + ring;
        sparkle(gfx, SUMMIT.x + Math.cos(a) * r, bottom - LEGEND_FACE_Y + Math.sin(a) * r * 0.8, ring < 0.5 ? 2 : 1, withAlpha('#ffd080', 1 - ring));
      }
    }
  }

  private drawLogo(gfx: Gfx): void {
    const logo = titleLogo();
    const x = Math.round((240 - logo.w) / 2);
    logo.letters.forEach((l, i) => {
      const p = clamp01((this.t - i * LETTER_DELAY) / DROP_FRAMES);
      if (p <= 0) return;
      const y = LOGO_Y - Math.round((1 - bounce(p)) * 56);
      gfx.drawBitmap(l.full, x + l.x, y);
    });
    const since = this.t - READY_AT;
    if (since >= 0 && since % SHINE_EVERY < 50) {
      drawShine(gfx, logo, x, LOGO_Y, Math.round(((since % SHINE_EVERY) / 50) * (logo.w + 20)) - 10);
    }
    if (this.t >= SUBTITLE_AT) {
      const y = LOGO_Y + logo.h - 2;
      const text = 'Alpenglühen';
      const half = Math.ceil(gfx.measureText(text) / 2);
      gfx.drawText(text, 120, y, { align: 'center', color: '#ffe8c0', shadow: '#5a1c3c' });
      const tw = Math.sin(this.t / 16) > 0 ? 2 : 1;
      sparkle(gfx, 120 - half - 9, y + 8, tw, '#f8b060', '#fff8e0');
      sparkle(gfx, 120 + half + 9, y + 8, 3 - tw, '#f8b060', '#fff8e0');
    }
  }

  private drawPrompt(gfx: Gfx, f: number): void {
    if (this.t < READY_AT) return;
    if (f % 60 < 40) gfx.drawText('Drücke START', 120, 118, { align: 'center', color: '#fff8e8', shadow: '#3a1838' });
    const line = '2026 Wildlinge-Team';
    const w = gfx.measureText(line) + 10;
    const x = Math.round(120 - w / 2);
    gfx.drawBitmap(copyrightSign(), x, 145, { tint: '#c8b0d0' });
    gfx.drawText(line, x + 10, 140, { color: '#c8b0d0', shadow: '#140a20' });
  }

  private drawMenu(gfx: Gfx, g: GameContext): void {
    const total = this.entries.reduce((n, e) => n + e.h + MENU_GAP, -MENU_GAP);
    let y = Math.max(48, Math.round(104 - total / 2));
    this.entries.forEach((e, i) => {
      const selected = i === this.index;
      gfx.drawWindow(MENU_X, y, MENU_W, e.h);
      if (selected) gfx.strokeRect(MENU_X + 2, y + 2, MENU_W - 4, e.h - 4, '#e86030');
      if (selected) gfx.drawBitmap(icon('cursor'), MENU_X + 9, y + 8);
      gfx.drawText(e.label, MENU_X + 20, y + 4, selected ? { color: '#c04020' } : {});
      if (e.id === 'continue') this.drawSaveSummary(gfx, g, y);
      y += e.h + MENU_GAP;
    });
  }

  private drawSaveSummary(gfx: Gfx, g: GameContext, y: number): void {
    const s = g.state;
    const label = { color: COLORS.windowFrame };
    const rows: [string, string, 0 | 1][] = [
      ['Name', s.playerName, 0],
      ['Lexikon', String(s.dexCaught.length), 1],
      ['Zeit', playTime(s), 0],
      ['Abzeichen', String(s.badges.length), 1],
    ];
    rows.forEach(([key, value, col], i) => {
      const rowY = y + 19 + Math.floor(i / 2) * 14;
      const { x, right } = SUMMARY_COLS[col];
      gfx.drawText(key, x, rowY, label);
      // clipped so an unusually wide value can never run into its label
      const left = x + gfx.measureText(key) + 4;
      gfx.clipped(left, rowY, right - left + 2, gfx.lineHeight, () => gfx.drawText(value, right, rowY, { align: 'right' }));
    });
  }
}

/** Title → main menu (Weiter / Neues Spiel / Optionen). Starts the game itself. */
export function createTitleScene(_g: GameContext): Scene {
  return new TitleScene();
}

/** Fresh state (keeping the options chosen on the title), intro, then the overworld. */
async function startNewGame(g: GameContext): Promise<void> {
  const options = { ...g.state.options };
  await g.fadeOut(30);
  g.state = newGameState(START);
  g.state.options = options;
  await runIntro(g);
  g.reset(createOverworld(g));
  await g.fadeIn(30);
}
