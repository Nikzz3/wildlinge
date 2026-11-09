/** Creature summary: INFO / WERTE / ATTACKEN pages. Left/right = page, up/down = creature, A on ATTACKEN = move details. */
import { creatureSprite, icon } from '../../art';
import type { GameContext, Gfx } from '../../core/contracts';
import { type Creature, STAT_LABELS, STATUS_NAMES, type StatId, TYPE_COLORS } from '../../core/types';
import { calcStats, displayName, expForLevel, expProgress, MAX_LEVEL } from '../../creature';
import { getMove, getSpecies } from '../../data';
import {
  drawBackdrop, drawHeaderBar, drawCategoryPill, drawHpBar, drawMeter, drawRowHighlight, drawStage, drawStatusPill, drawTabs,
  drawTypePill, HEADER_H, labelText, mutedText, PAL, Screen, text, TYPE_PILL_W, W,
} from './common';
import { dexNo, isHealthy } from './logic';

const PAGES = ['INFO', 'WERTE', 'ATTACKEN'] as const;

const LEFT = { x: 2, y: HEADER_H + 2, w: 90, h: 138 } as const;
const RIGHT = { x: 94, y: HEADER_H + 2, w: 144, h: 138 } as const;
/** Move description lines that fit in the left panel in move-detail mode. */
const DESC_LINES = 6;

class SummaryScreen extends Screen {
  readonly name = 'summary';
  private page = 0;
  /** Selected move on the ATTACKEN page, null while not selecting. */
  private moveCursor: number | null = null;

  constructor(
    g: GameContext,
    private readonly list: readonly Creature[],
    private index: number,
    private readonly close: (index: number) => void,
  ) {
    super();
    this.cry(g);
  }

  private get creature(): Creature | undefined {
    return this.list[this.index];
  }

  private cry(g: GameContext): void {
    const c = this.creature;
    if (c) g.audio.playCry(c.species, { faint: !isHealthy(c) });
  }

  protected step(g: GameContext): void {
    const c = this.creature;
    if (!c) {
      this.close(0);
      return;
    }
    if (this.moveCursor !== null) return this.stepMoves(g, c);
    const input = g.input;
    if (input.repeat('left') || input.repeat('right')) {
      const next = Math.max(0, Math.min(PAGES.length - 1, this.page + (input.repeat('left') ? -1 : 1)));
      if (next !== this.page) {
        this.page = next;
        g.audio.playSfx('cursor');
      }
    } else if ((input.repeat('up') || input.repeat('down')) && this.list.length > 1) {
      const d = input.repeat('up') ? -1 : 1;
      this.index = (this.index + d + this.list.length) % this.list.length;
      this.cry(g);
    } else if (input.pressed('a')) {
      if (PAGES[this.page] === 'ATTACKEN' && c.moves.length > 0) {
        g.audio.playSfx('confirm');
        this.moveCursor = 0;
      }
    } else if (input.pressed('b')) {
      g.audio.playSfx('cancel');
      this.close(this.index);
    }
  }

  private stepMoves(g: GameContext, c: Creature): void {
    const n = c.moves.length;
    const cur = this.moveCursor ?? 0;
    if (g.input.repeat('up') || g.input.repeat('down')) {
      const d = g.input.repeat('up') ? -1 : 1;
      this.moveCursor = (cur + d + n) % n;
      g.audio.playSfx('cursor');
    } else if (g.input.pressed('b') || g.input.pressed('a')) {
      g.audio.playSfx('cancel');
      this.moveCursor = null;
    }
  }

  render(gfx: Gfx, g: GameContext): void {
    const c = this.creature;
    drawBackdrop(gfx, g, 'blue');
    drawHeaderBar(gfx);
    drawTabs(gfx, PAGES, this.page, 3);
    if (this.list.length > 1) {
      gfx.drawText(`${this.index + 1}/${this.list.length}`, W - 6, 0, { color: PAL.inner, shadow: PAL.lightShadow, align: 'right' });
    }
    if (!c) return;
    if (this.moveCursor !== null) renderMoveDetails(gfx, c, this.moveCursor);
    else renderIdentity(gfx, g, c);
    gfx.drawWindow(RIGHT.x, RIGHT.y, RIGHT.w, RIGHT.h);
    const page = PAGES[this.page];
    if (page === 'INFO') renderInfo(gfx, g, c);
    else if (page === 'WERTE') renderStats(gfx, c);
    else renderMoves(gfx, g, c, this.moveCursor);
  }
}

/** Left panel: sprite on a type-colored stage, name, level, status, types. */
function renderIdentity(gfx: Gfx, g: GameContext, c: Creature): void {
  const { x, y, w, h } = LEFT;
  const sp = getSpecies(c.species);
  gfx.drawWindow(x, y, w, h);
  drawStage(gfx, x + 3, y + 3, w - 6, 59, TYPE_COLORS[sp.types[0]]);
  const bob = isHealthy(c) ? Math.floor(g.frame / 30) % 2 : 0;
  gfx.drawBitmap(creatureSprite(c.species, 'front'), x + 21, y + 9 - bob);
  text(gfx, displayName(c), x + w / 2, y + 62, 'center');
  labelText(gfx, `Lv${c.level}`, x + 8, y + 78);
  drawStatusPill(gfx, x + w - 34, y + 81, c);
  sp.types.forEach((t, i) => drawTypePill(gfx, x + 3 + i * (TYPE_PILL_W + 1), y + 100, t));
  const max = calcStats(c).hp;
  drawHpBar(gfx, x + 8, y + 122, w - 16, Math.max(0, c.hp), max);
}

/** Left panel in move-select mode: category, power, accuracy, description. */
function renderMoveDetails(gfx: Gfx, c: Creature, cursor: number): void {
  const { x, y, w, h } = LEFT;
  gfx.drawWindow(x, y, w, h);
  const slot = c.moves[cursor];
  if (!slot) return;
  const m = getMove(slot.id);
  drawCategoryPill(gfx, x + 7, y + 6, m.category);
  labelText(gfx, 'Stärke', x + 7, y + 19);
  text(gfx, m.power > 0 ? String(m.power) : '-', x + w - 7, y + 19, 'right');
  labelText(gfx, 'Genauigk.', x + 7, y + 33);
  text(gfx, m.accuracy > 0 ? String(m.accuracy) : '-', x + w - 7, y + 33, 'right');
  gfx.fillRect(x + 6, y + 50, w - 12, 1, PAL.inner);
  // 6 lines at a 13px step fit above the bottom frame (the longest descriptions wrap to 6 lines)
  gfx.wrapText(m.desc, w - 12).slice(0, DESC_LINES).forEach((line, i) => text(gfx, line, x + 6, y + 52 + i * 13));
}

function infoRow(gfx: Gfx, label: string, value: string, row: number): void {
  labelText(gfx, label, RIGHT.x + 8, RIGHT.y + 4 + row * 16);
  text(gfx, value, RIGHT.x + 62, RIGHT.y + 4 + row * 16);
}

function renderInfo(gfx: Gfx, g: GameContext, c: Creature): void {
  const sp = getSpecies(c.species);
  infoRow(gfx, 'Nr.', dexNo(sp.dexNo), 0);
  infoRow(gfx, 'Art', sp.name, 1);
  infoRow(gfx, 'Trainer', g.state.playerName, 2);
  const state = !isHealthy(c) ? 'Besiegt' : c.status ? STATUS_NAMES[c.status] : 'Gesund';
  infoRow(gfx, 'Zustand', state, 3);
  const { x, y, w } = RIGHT;
  gfx.fillRect(x + 6, y + 70, w - 12, 1, PAL.inner);
  labelText(gfx, 'Notizen', x + 8, y + 72);
  // "auf Pfad 1", "in Moosbach"
  const where = c.metAt ? `${/^Pfad /.test(c.metAt) ? 'auf' : 'in'} ${c.metAt} ` : '';
  const met = `Getroffen ${where}mit Level ${c.metLevel}.`;
  gfx.wrapText(met, w - 16).slice(0, 3).forEach((line, i) => text(gfx, line, x + 8, y + 88 + i * 14));
}

const STAT_ORDER: readonly StatId[] = ['atk', 'def', 'mag', 'res', 'spd'];

function renderStats(gfx: Gfx, c: Creature): void {
  const { x, y, w } = RIGHT;
  const stats = calcStats(c);
  labelText(gfx, STAT_LABELS.hp, x + 8, y + 3);
  text(gfx, `${Math.max(0, c.hp)}/${stats.hp}`, x + w - 8, y + 3, 'right');
  drawHpBar(gfx, x + 30, y + 10, 50, Math.max(0, c.hp), stats.hp);
  const top = Math.max(...STAT_ORDER.map((s) => stats[s]), 1);
  STAT_ORDER.forEach((s, i) => {
    const ry = y + 19 + i * 14;
    labelText(gfx, STAT_LABELS[s], x + 8, ry);
    drawMeter(gfx, x + 38, ry + 7, 56, stats[s] / top, '#78b8a8');
    text(gfx, String(stats[s]), x + w - 8, ry, 'right');
  });
  gfx.fillRect(x + 6, y + 91, w - 12, 1, PAL.inner);
  const growth = getSpecies(c.species).growth;
  labelText(gfx, 'ERF', x + 8, y + 93);
  text(gfx, String(c.exp), x + w - 8, y + 93, 'right');
  labelText(gfx, 'Nächstes Lv', x + 8, y + 107);
  const toNext = c.level >= MAX_LEVEL ? 0 : expForLevel(growth, c.level + 1) - c.exp;
  text(gfx, String(Math.max(0, toNext)), x + w - 8, y + 107, 'right');
  drawMeter(gfx, x + 8, y + 126, w - 16, expProgress(c), PAL.exp);
}

function renderMoves(gfx: Gfx, g: GameContext, c: Creature, cursor: number | null): void {
  const { x, y, w } = RIGHT;
  for (let i = 0; i < 4; i++) {
    const ry = y + 4 + i * 28;
    const slot = c.moves[i];
    if (cursor === i) drawRowHighlight(gfx, x + 3, ry, w - 6, 27);
    if (!slot) {
      mutedText(gfx, '-', x + 18, ry);
      continue;
    }
    const m = getMove(slot.id);
    if (cursor === i) gfx.drawBitmap(icon('cursor'), x + 6, ry + 4);
    text(gfx, m.name, x + 18, ry - 1);
    drawTypePill(gfx, x + 18, ry + 15, m.type);
    const low = slot.pp === 0 ? PAL.bad : PAL.ink;
    labelText(gfx, 'EN', x + 70, ry + 12);
    gfx.drawText(`${slot.pp}/${m.pp}`, x + w - 8, ry + 12, { color: low, align: 'right' });
  }
  if (cursor === null && c.moves.length > 0) {
    const blink = Math.floor(g.frame / 30) % 2 === 0;
    if (blink) mutedText(gfx, 'A: Details', x + w - 8, y + 118, 'right');
  }
}

/** Opens the summary for list[index]; resolves with the index shown last (up/down browse the list). */
export function openSummary(g: GameContext, list: readonly Creature[], index: number): Promise<number> {
  if (list.length === 0) return Promise.resolve(index);
  const start = Math.max(0, Math.min(list.length - 1, index));
  return g.open<number>((close) => new SummaryScreen(g, list, start, close));
}
