/** Shared look & building blocks for all menu screens (backdrops, headers, pills, bars, lists, base scene). */
import { creatureSprite } from '../../art';
import { type Bitmap, createBitmap, parseColor, setPixel, toHex } from '../../core/bitmap';
import type { GameContext, Gfx, Scene } from '../../core/contracts';
import {
  type Creature, type MoveCategory, STATUS_SHORT, type StatusId, TYPE_COLORS, TYPE_NAMES, type TypeId,
} from '../../core/types';
import { Menu } from '../../engine/ui';

export const W = 240;

export const PAL = {
  ink: '#383838',
  inkShadow: '#d0d0c8',
  muted: '#8c9490',
  label: '#2f7078',
  labelShadow: '#d8e8e0',
  light: '#f8f8f8',
  lightShadow: '#203038',
  frame: '#285860',
  inner: '#88c0b8',
  fill: '#f8f8f0',
  highlight: '#d4ede4',
  accent: '#e86838',
  good: '#389840',
  bad: '#b84838',
  exp: '#48a0e8',
} as const;

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

/** Multiplies a color's RGB by f (f < 1 darkens, f > 1 lightens towards white). */
export function shade(color: string, f: number): string {
  const [r, g, b] = parseColor(color);
  const ch = (v: number) => Math.round(f <= 1 ? v * f : v + (255 - v) * (f - 1));
  return toHex([Math.min(255, ch(r)), Math.min(255, ch(g)), Math.min(255, ch(b)), 255]);
}

// ---------------------------------------------------------------------------
// Backdrop & header
// ---------------------------------------------------------------------------

export type Theme = 'teal' | 'blue' | 'amber' | 'red' | 'green' | 'slate' | 'violet';

const THEMES: Record<Theme, readonly [string, string]> = {
  teal: ['#58a8a0', '#64b4ac'],
  blue: ['#6088c8', '#6c94d4'],
  amber: ['#d09848', '#dca454'],
  red: ['#c05850', '#cc645c'],
  green: ['#68a860', '#74b46c'],
  slate: ['#587888', '#648494'],
  violet: ['#8070b0', '#8c7cbc'],
};

const patternCache = new Map<Theme, Bitmap>();

/** 16×16 tile: diagonal stripes with a small diamond accent. */
function pattern(theme: Theme): Bitmap {
  let tile = patternCache.get(theme);
  if (tile) return tile;
  const [base, alt] = THEMES[theme];
  const dot = parseColor(shade(alt, 1.12));
  tile = createBitmap(16, 16);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const stripe = (x + y) % 16 < 8;
      const diamond = Math.abs(x - 11) + Math.abs(y - 4) <= 1;
      setPixel(tile, x, y, diamond ? dot : parseColor(stripe ? alt : base));
    }
  patternCache.set(theme, tile);
  return tile;
}

/** Full-screen slowly scrolling pattern. */
export function drawBackdrop(gfx: Gfx, g: GameContext, theme: Theme): void {
  const tile = pattern(theme);
  const off = Math.floor(g.frame / 6) % 16;
  for (let y = -16; y < 160; y += 16) for (let x = -16; x < W; x += 16) gfx.drawBitmap(tile, x + off, y + off);
}

export const HEADER_H = 18;

/** Empty dark teal title bar at the top. */
export function drawHeaderBar(gfx: Gfx): void {
  gfx.fillRect(0, 0, W, HEADER_H, PAL.frame);
  gfx.fillRect(0, HEADER_H - 2, W, 1, PAL.inner);
  gfx.fillRect(0, HEADER_H - 1, W, 1, '#183840');
}

/** Title bar with a title on the left and optional info on the right. */
export function drawHeader(gfx: Gfx, title: string, right?: string): void {
  drawHeaderBar(gfx);
  lightText(gfx, title, 6, 0);
  if (right) lightText(gfx, right, W - 6, 0, 'right');
}

/** Tabs inside the header bar starting at x (active tab drawn as a light pill). */
export function drawTabs(gfx: Gfx, labels: readonly string[], active: number, x: number): void {
  let cx = x;
  labels.forEach((label, i) => {
    const w = gfx.measureText(label) + 10;
    if (i === active) {
      gfx.fillRect(cx + 1, 2, w - 2, 13, PAL.fill);
      gfx.fillRect(cx, 3, w, 11, PAL.fill);
      gfx.drawText(label, cx + 5, 0, { color: PAL.frame, shadow: null });
    } else gfx.drawText(label, cx + 5, 0, { color: PAL.inner, shadow: PAL.lightShadow });
    cx += w + 2;
  });
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

type Align = 'left' | 'center' | 'right';

export function text(gfx: Gfx, s: string, x: number, y: number, align: Align = 'left'): void {
  gfx.drawText(s, x, y, { align });
}

export function mutedText(gfx: Gfx, s: string, x: number, y: number, align: Align = 'left'): void {
  gfx.drawText(s, x, y, { color: PAL.muted, shadow: null, align });
}

export function labelText(gfx: Gfx, s: string, x: number, y: number, align: Align = 'left'): void {
  gfx.drawText(s, x, y, { color: PAL.label, shadow: PAL.labelShadow, align });
}

export function lightText(gfx: Gfx, s: string, x: number, y: number, align: Align = 'left'): void {
  gfx.drawText(s, x, y, { color: PAL.light, shadow: PAL.lightShadow, align });
}

export function colorText(gfx: Gfx, s: string, x: number, y: number, color: string, align: Align = 'left'): void {
  gfx.drawText(s, x, y, { color, shadow: PAL.inkShadow, align });
}

/** Text drawn into a box with a one-line, vertically centered layout (window of height h). */
export function promptBox(gfx: Gfx, s: string, y = 128, h = 32, hint?: string): void {
  gfx.drawWindow(0, y, W, h);
  const ty = y + Math.floor((h - 16) / 2);
  text(gfx, s, 10, ty);
  if (hint) mutedText(gfx, hint, W - 10, ty, 'right');
}

// ---------------------------------------------------------------------------
// Pills, bars, icons
// ---------------------------------------------------------------------------

export const PILL_H = 12;

/** Rounded colored label, 12px high. Text is centered. */
export function drawPill(gfx: Gfx, x: number, y: number, w: number, label: string, color: string): void {
  const edge = shade(color, 0.62);
  gfx.fillRect(x + 1, y, w - 2, PILL_H, edge);
  gfx.fillRect(x, y + 1, w, PILL_H - 2, edge);
  gfx.fillRect(x + 1, y + 1, w - 2, PILL_H - 2, color);
  gfx.fillRect(x + 2, y + 1, w - 4, 1, shade(color, 1.35));
  gfx.drawText(label, x + Math.floor(w / 2), y - 2, { color: PAL.light, shadow: edge, align: 'center' });
}

export const TYPE_PILL_W = 42;

export function drawTypePill(gfx: Gfx, x: number, y: number, type: TypeId): void {
  drawPill(gfx, x, y, TYPE_PILL_W, TYPE_NAMES[type], TYPE_COLORS[type]);
}

const STATUS_COLORS: Record<StatusId, string> = {
  burn: '#e06030',
  poison: '#a050b0',
  paralysis: '#d0a018',
  sleep: '#8090a0',
};

/** Status label (BRA/GIF/PAR/SLF) or K.O. for fainted creatures; nothing when healthy. */
export function drawStatusPill(gfx: Gfx, x: number, y: number, c: Creature): void {
  if (c.hp <= 0) drawPill(gfx, x, y, 26, 'K.O.', '#606060');
  else if (c.status) drawPill(gfx, x, y, 26, STATUS_SHORT[c.status], STATUS_COLORS[c.status]);
}

/** HP bar with 1px dark frame (outer size w+2 × 6). */
export function drawHpBar(gfx: Gfx, x: number, y: number, w: number, hp: number, max: number): void {
  const frac = max > 0 ? hp / max : 0;
  gfx.fillRect(x - 1, y - 1, w + 2, 6, '#283838');
  gfx.drawBar(x, y, w, 4, frac, gfx.hpColor(frac), '#506058');
  if (frac > 0) gfx.fillRect(x, y, Math.max(1, Math.round(w * Math.min(1, frac))), 1, '#ffffff60');
}

/** Generic framed progress bar (EXP, volumes…). */
export function drawMeter(gfx: Gfx, x: number, y: number, w: number, frac: number, color: string): void {
  gfx.fillRect(x - 1, y - 1, w + 2, 5, '#283838');
  gfx.drawBar(x, y, w, 3, frac, color, '#506058');
}

/** 24×24 party icon with a little idle bob. `active` bobs faster. */
export function drawCreatureIcon(
  gfx: Gfx,
  g: GameContext,
  species: string,
  x: number,
  y: number,
  opts: { active?: boolean; still?: boolean; alpha?: number } = {},
): void {
  const period = opts.active ? 8 : 24;
  const bob = opts.still ? 0 : Math.floor(g.frame / period) % 2;
  gfx.drawBitmap(creatureSprite(species, 'icon'), x, y - bob, { alpha: opts.alpha ?? 1 });
}

/** Colored "stage" behind a sprite: light tint with thin horizontal stripes. */
export function drawStage(gfx: Gfx, x: number, y: number, w: number, h: number, color: string): void {
  gfx.fillRect(x, y, w, h, shade(color, 1.55));
  for (let sy = y + 2; sy < y + h; sy += 4) gfx.fillRect(x, sy, w, 1, shade(color, 1.42));
  gfx.fillRect(x, y + h - 1, w, 1, shade(color, 1.1));
}

const CATEGORY_NAMES: Record<MoveCategory, string> = { physical: 'Physisch', special: 'Magisch', status: 'Status' };
const CATEGORY_COLORS: Record<MoveCategory, string> = { physical: '#d06038', special: '#5878d0', status: '#8c8c84' };

export function drawCategoryPill(gfx: Gfx, x: number, y: number, cat: MoveCategory): void {
  drawPill(gfx, x, y, 48, CATEGORY_NAMES[cat], CATEGORY_COLORS[cat]);
}

/** Light highlight bar behind the selected list row. */
export function drawRowHighlight(gfx: Gfx, x: number, y: number, w: number, h = 14): void {
  gfx.fillRect(x, y, w, h, PAL.highlight);
  gfx.fillRect(x, y + h - 1, w, 1, shade(PAL.highlight, 0.9));
}

// ---------------------------------------------------------------------------
// Lists & menus
// ---------------------------------------------------------------------------

/** Vertical list cursor with scrolling. Handles up/down with key repeat (wraps around). */
export class ListCursor {
  index: number;
  top = 0;

  constructor(
    public count: number,
    readonly rows: number,
    initial = 0,
  ) {
    this.index = 0;
    this.select(initial);
  }

  select(i: number): void {
    this.index = Math.max(0, Math.min(this.count - 1, i));
    this.follow();
  }

  setCount(n: number): void {
    this.count = n;
    this.select(this.index);
    this.top = Math.max(0, Math.min(this.top, n - this.rows));
  }

  /** Returns true if the cursor moved (cursor sfx already played). */
  update(g: GameContext): boolean {
    if (this.count <= 1) return false;
    let d = 0;
    if (g.input.repeat('up')) d = -1;
    else if (g.input.repeat('down')) d = 1;
    if (d === 0) return false;
    this.index = (this.index + d + this.count) % this.count;
    this.follow();
    g.audio.playSfx('cursor');
    return true;
  }

  private follow(): void {
    if (this.index < this.top) this.top = this.index;
    if (this.index >= this.top + this.rows) this.top = this.index - this.rows + 1;
    this.top = Math.max(0, this.top);
  }

  /** Indexes currently visible (top … top+rows-1). */
  visible(): number[] {
    const out: number[] = [];
    for (let i = this.top; i < Math.min(this.count, this.top + this.rows); i++) out.push(i);
    return out;
  }

  get canScrollUp(): boolean {
    return this.top > 0;
  }

  get canScrollDown(): boolean {
    return this.top + this.rows < this.count;
  }
}

/** Space a list window reserves at its right inner edge for the scrollbar. */
export const SCROLLBAR_W = 3;

/**
 * Slim scrollbar inside a list window: track + thumb at x (use window right edge - 7), from y with height h.
 * Drawn only while the list has more entries than visible rows.
 */
export function drawScrollbar(gfx: Gfx, x: number, y: number, h: number, cursor: ListCursor): void {
  if (cursor.count <= cursor.rows) return;
  gfx.fillRect(x, y, SCROLLBAR_W, h, shade(PAL.inner, 1.3));
  const thumb = Math.max(6, Math.round((h * cursor.rows) / cursor.count));
  const ty = y + Math.round(((h - thumb) * cursor.top) / (cursor.count - cursor.rows));
  gfx.fillRect(x, ty, SCROLLBAR_W, thumb, PAL.frame);
}

export interface ChooseOpts {
  /** Right edge of the menu window (default 240). */
  right?: number;
  /** Bottom edge of the menu window (default 112 = top of the dialog box). */
  bottom?: number;
  initial?: number;
  /** Value on B; null = not cancelable. Default -1. */
  cancel?: number | null;
  disabled?: readonly boolean[];
}

/** Small modal menu (engine Menu) anchored at its bottom-right corner; supports disabled options. */
export function choose(g: GameContext, options: readonly string[], o: ChooseOpts = {}): Promise<number> {
  const w = Menu.autoWidth(options);
  const h = Menu.heightFor(options.length);
  const menu = new Menu(options, {
    x: (o.right ?? W) - w,
    y: (o.bottom ?? 112) - h,
    width: w,
    initial: o.initial,
    cancel: o.cancel === undefined ? -1 : o.cancel,
    disabled: o.disabled,
  });
  return g.open<number>((close) => ({
    name: 'menu',
    overlay: true,
    update: (gg) => {
      const r = menu.update(gg);
      if (r !== null) close(r);
    },
    render: (gfx) => menu.render(gfx),
  }));
}

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

/**
 * Base class for interactive screens. `step` handles input while no async sub-flow
 * (messages, submenus, other screens) started with `run` is in progress.
 */
export abstract class Screen implements Scene {
  abstract readonly name: string;
  readonly overlay: boolean = false;
  private busy = false;

  update(g: GameContext): void {
    if (!this.busy) this.step(g);
  }

  protected abstract step(g: GameContext): void;
  abstract render(gfx: Gfx, g: GameContext): void;

  /** Runs an async sub-flow; input is ignored until it settles. Errors reach the game's error handler. */
  protected run(task: () => Promise<void>): void {
    this.busy = true;
    void task().finally(() => {
      this.busy = false;
    });
  }

  protected get isBusy(): boolean {
    return this.busy;
  }
}

/**
 * Keeps a passive scene (e.g. a money window) on the stack while `flow` runs its own modals
 * on top of it. Resolves with the flow's result after removing the scene.
 */
export async function withBackdrop<T>(
  g: GameContext,
  name: string,
  render: (gfx: Gfx, g: GameContext) => void,
  flow: () => Promise<T>,
): Promise<T> {
  let close: (r: null) => void = () => {};
  const closed = g.open<null>((c) => {
    close = c;
    return { name, overlay: true, update: () => {}, render };
  });
  try {
    return await flow();
  } finally {
    close(null);
    await closed;
  }
}
