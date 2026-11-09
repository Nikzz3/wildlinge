/** On-screen keyboard for naming the player, the rival and creatures. */
import type { GameContext, Gfx } from '../../core/contracts';
import { drawBackdrop, drawHeader, mutedText, PAL, Screen, shade, text, W } from './common';
import { finalName, KEY_COLS, KEY_PAGES, keyAt } from './logic';

export interface NameEntryOpts {
  title: string;
  initial: string;
  maxLen: number;
}

const CONTROLS = [...KEY_PAGES.map((p) => p.label), 'ENTF', 'OK'] as const;
const DELETE = KEY_PAGES.length;
const OK = KEY_PAGES.length + 1;
const GRID_ROWS = 3;
/** Row index of the control buttons. */
const CTRL_ROW = GRID_ROWS;

const PREVIEW = { x: 30, y: 24, w: 180, h: 34 } as const;
const KEYS = { x: 6, y: 62, w: 228, h: 96 } as const;
const CELL_W = 20;
const CELL_H = 17;
const BTN_W = 40;
const BTN_GAP = 4;

class NameEntryScreen extends Screen {
  readonly name = 'name-entry';
  private page = 0;
  private row = 0;
  private col = 0;
  /** Grid column remembered while the cursor is on the control row. */
  private gridCol = 0;
  private value = '';

  constructor(
    private readonly opts: NameEntryOpts,
    private readonly close: (name: string) => void,
  ) {
    super();
  }

  private get maxLen(): number {
    return Math.max(1, this.opts.maxLen);
  }

  protected step(g: GameContext): void {
    const input = g.input;
    if (input.pressed('start')) return this.confirm(g);
    if (input.pressed('select')) {
      this.page = (this.page + 1) % KEY_PAGES.length;
      g.audio.playSfx('cursor');
      return;
    }
    if (this.navigate(g)) return;
    if (input.pressed('a')) this.press(g);
    else if (input.pressed('b')) this.erase(g);
  }

  private navigate(g: GameContext): boolean {
    const input = g.input;
    if (input.repeat('left') || input.repeat('right')) {
      const d = input.repeat('left') ? -1 : 1;
      const n = this.row === CTRL_ROW ? CONTROLS.length : KEY_COLS;
      this.col = (this.col + d + n) % n;
      if (this.row !== CTRL_ROW) this.gridCol = this.col;
    } else if (input.repeat('up') || input.repeat('down')) {
      const d = input.repeat('up') ? -1 : 1;
      const from = this.row;
      this.row = (this.row + d + GRID_ROWS + 1) % (GRID_ROWS + 1);
      if (this.row === CTRL_ROW) this.col = Math.min(CONTROLS.length - 1, Math.floor(this.gridCol / 2));
      else if (from === CTRL_ROW) this.col = Math.floor(this.gridCol / 2) === this.col ? this.gridCol : this.col * 2;
      if (this.row !== CTRL_ROW) this.gridCol = this.col;
    } else return false;
    g.audio.playSfx('cursor');
    return true;
  }

  private press(g: GameContext): void {
    if (this.row === CTRL_ROW) {
      if (this.col === OK) return this.confirm(g);
      if (this.col === DELETE) return this.erase(g);
      this.page = this.col;
      g.audio.playSfx('confirm');
      return;
    }
    const ch = keyAt(this.page, this.row, this.col);
    if (!ch) return;
    if (this.value.length >= this.maxLen) {
      g.audio.playSfx('bump');
      return;
    }
    this.value += ch;
    g.audio.playSfx('confirm');
    if (this.value.length >= this.maxLen) {
      this.row = CTRL_ROW;
      this.col = OK;
    }
  }

  private erase(g: GameContext): void {
    if (this.value.length === 0) return;
    this.value = [...this.value].slice(0, -1).join('');
    g.audio.playSfx('cancel');
  }

  private confirm(g: GameContext): void {
    g.audio.playSfx('confirm');
    this.close(finalName(this.value, this.opts.initial));
  }

  render(gfx: Gfx, g: GameContext): void {
    drawBackdrop(gfx, g, 'slate');
    drawHeader(gfx, this.opts.title);
    this.renderPreview(gfx, g);
    this.renderKeys(gfx);
  }

  private renderPreview(gfx: Gfx, g: GameContext): void {
    const { x, y, w, h } = PREVIEW;
    gfx.drawWindow(x, y, w, h);
    const cell = 12;
    const chars = [...this.value];
    const ghost = chars.length === 0 ? [...this.opts.initial] : [];
    const left = Math.round(x + w / 2 - (this.maxLen * cell) / 2);
    const blink = Math.floor(g.frame / 20) % 2 === 0;
    for (let i = 0; i < this.maxLen; i++) {
      const cx = left + i * cell;
      const ch = chars[i];
      if (ch) text(gfx, ch, cx + cell / 2, y + 7, 'center');
      else if (ghost[i]) mutedText(gfx, ghost[i] ?? '', cx + cell / 2, y + 7, 'center');
      const isCursor = i === chars.length;
      const color = isCursor ? (blink ? PAL.accent : PAL.inner) : PAL.label;
      gfx.fillRect(cx + 1, y + 24, cell - 2, isCursor ? 2 : 1, color);
    }
  }

  private renderKeys(gfx: Gfx): void {
    const { x, y, w, h } = KEYS;
    gfx.drawWindow(x, y, w, h);
    const gridX = x + Math.floor((w - KEY_COLS * CELL_W) / 2);
    for (let r = 0; r < GRID_ROWS; r++)
      for (let c = 0; c < KEY_COLS; c++) {
        const cx = gridX + c * CELL_W;
        const cy = y + 5 + r * CELL_H;
        if (r === this.row && c === this.col) drawKeyHighlight(gfx, cx + 2, cy, CELL_W - 4, CELL_H - 1);
        const ch = keyAt(this.page, r, c);
        if (ch) text(gfx, ch, cx + CELL_W / 2, cy, 'center');
      }
    const by = y + 5 + GRID_ROWS * CELL_H + 4;
    const bx = x + Math.floor((w - (CONTROLS.length * BTN_W + (CONTROLS.length - 1) * BTN_GAP)) / 2);
    CONTROLS.forEach((label, i) => {
      const cx = bx + i * (BTN_W + BTN_GAP);
      const selected = this.row === CTRL_ROW && this.col === i;
      const current = i === this.page;
      const fill = selected ? PAL.accent : current ? PAL.frame : PAL.highlight;
      gfx.fillRect(cx + 1, by, BTN_W - 2, 15, shade(fill, 0.75));
      gfx.fillRect(cx, by + 1, BTN_W, 13, shade(fill, 0.75));
      gfx.fillRect(cx + 1, by + 1, BTN_W - 2, 13, fill);
      const light = selected || current;
      gfx.drawText(label, cx + BTN_W / 2, by - 1, {
        align: 'center',
        color: light ? PAL.light : PAL.ink,
        shadow: light ? shade(fill, 0.6) : null,
      });
    });
    mutedText(gfx, 'B Löschen   START Fertig   SELECT Seite', W / 2, by + 17, 'center');
  }
}

function drawKeyHighlight(gfx: Gfx, x: number, y: number, w: number, h: number): void {
  gfx.fillRect(x + 1, y, w - 2, h, PAL.accent);
  gfx.fillRect(x, y + 1, w, h - 2, PAL.accent);
  gfx.fillRect(x + 1, y + 1, w - 2, h - 2, '#fff0e0');
}

export function runNameEntry(g: GameContext, opts: NameEntryOpts): Promise<string> {
  return g.open<string>((close) => new NameEntryScreen(opts, close));
}
