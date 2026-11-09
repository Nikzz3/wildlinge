/** Lexikon: list of all species by number, detail page for seen species. */
import { creatureSprite, icon } from '../../art';
import type { GameContext, Gfx } from '../../core/contracts';
import { type SpeciesDef, TYPE_COLORS } from '../../core/types';
import { speciesByDex } from '../../data';
import {
  drawBackdrop, drawHeader, drawRowHighlight, drawScrollbar, drawStage, drawTypePill, HEADER_H, labelText, ListCursor,
  mutedText, PAL, Screen, text, TYPE_PILL_W, W,
} from './common';
import { decimal, dexNo } from './logic';

const ROWS = 8;
const LIST = { x: 96, y: HEADER_H + 2, w: 142, h: ROWS * 16 + 10 } as const;
const SILHOUETTE = '#384050';
/** Dex text in the detail page: wrap width (keeps clear of the scroll arrows at the right edge) and max lines. */
const TEXT_W = W - 36;
const TEXT_LINES = 4;

/** Cursor position kept between openings. */
let rememberedIndex = 0;

type Knowledge = 'unseen' | 'seen' | 'caught';

class DexScreen extends Screen {
  readonly name = 'dex';
  private readonly species: SpeciesDef[] = speciesByDex();
  private readonly cursor: ListCursor;
  private detail = false;

  constructor(private readonly close: () => void) {
    super();
    this.cursor = new ListCursor(this.species.length, ROWS, rememberedIndex);
  }

  private knowledge(g: GameContext, id: string): Knowledge {
    if (g.state.dexCaught.includes(id)) return 'caught';
    return g.state.dexSeen.includes(id) ? 'seen' : 'unseen';
  }

  protected step(g: GameContext): void {
    if (this.detail) this.stepDetail(g);
    else this.stepList(g);
    rememberedIndex = this.cursor.index;
  }

  private stepList(g: GameContext): void {
    const input = g.input;
    if (this.cursor.update(g)) return;
    if (input.repeat('left') || input.repeat('right')) {
      const d = input.repeat('left') ? -ROWS : ROWS;
      const before = this.cursor.index;
      this.cursor.select(before + d);
      if (this.cursor.index !== before) g.audio.playSfx('cursor');
    } else if (input.pressed('a')) {
      const sp = this.species[this.cursor.index];
      if (!sp || this.knowledge(g, sp.id) === 'unseen') {
        g.audio.playSfx('bump');
        return;
      }
      g.audio.playSfx('confirm');
      this.detail = true;
      g.audio.playCry(sp.id);
    } else if (input.pressed('b')) {
      g.audio.playSfx('cancel');
      this.close();
    }
  }

  /** Index of the previous (d = -1) / next (d = 1) seen species, wrapping around; null if there is no other. */
  private nextSeen(g: GameContext, d: number): number | null {
    const n = this.species.length;
    for (let k = 1; k < n; k++) {
      const i = (((this.cursor.index + d * k) % n) + n) % n;
      const sp = this.species[i];
      if (sp && this.knowledge(g, sp.id) !== 'unseen') return i;
    }
    return null;
  }

  /** Up/down jump to the previous/next seen species. */
  private stepDetail(g: GameContext): void {
    const input = g.input;
    if (input.repeat('up') || input.repeat('down')) {
      const i = this.nextSeen(g, input.repeat('up') ? -1 : 1);
      const sp = i === null ? undefined : this.species[i];
      if (i === null || !sp) return;
      this.cursor.select(i);
      g.audio.playCry(sp.id);
    } else if (input.pressed('a') || input.pressed('b')) {
      g.audio.playSfx('cancel');
      this.detail = false;
    }
  }

  render(gfx: Gfx, g: GameContext): void {
    drawBackdrop(gfx, g, 'red');
    const sp = this.species[this.cursor.index];
    if (this.detail && sp) return this.renderDetail(gfx, g, sp);
    drawHeader(gfx, 'LEXIKON', `Gesehen ${g.state.dexSeen.length}  Gefangen ${g.state.dexCaught.length}`);
    if (sp) this.renderPreview(gfx, g, sp);
    this.renderList(gfx, g);
  }

  private renderPreview(gfx: Gfx, g: GameContext, sp: SpeciesDef): void {
    const x = 2;
    const y = HEADER_H + 2;
    const w = 92;
    gfx.drawWindow(x, y, w, LIST.h);
    const k = this.knowledge(g, sp.id);
    drawStage(gfx, x + 3, y + 3, w - 6, 60, k === 'caught' ? TYPE_COLORS[sp.types[0]] : '#a0a8b0');
    if (k === 'unseen') gfx.drawText('?', x + w / 2, y + 22, { color: PAL.light, shadow: SILHOUETTE, align: 'center' });
    else gfx.drawBitmap(creatureSprite(sp.id, 'front'), x + 22, y + 9, k === 'seen' ? { tint: SILHOUETTE } : {});
    labelText(gfx, `Nr.${dexNo(sp.dexNo)}`, x + 7, y + 64);
    text(gfx, k === 'unseen' ? '-----' : sp.name, x + 7, y + 80);
    if (k === 'caught') sp.types.forEach((t, i) => drawTypePill(gfx, x + 3 + i * (TYPE_PILL_W + 1), y + 100, t));
    else if (k === 'seen') mutedText(gfx, 'Gesehen', x + 7, y + 98);
    if (k !== 'unseen') mutedText(gfx, 'A: Details', x + w - 6, y + 116, 'right');
  }

  private renderList(gfx: Gfx, g: GameContext): void {
    const { x, y, w, h } = LIST;
    gfx.drawWindow(x, y, w, h);
    this.cursor.visible().forEach((i, row) => {
      const sp = this.species[i];
      if (!sp) return;
      const ry = y + 5 + row * 16;
      if (i === this.cursor.index) {
        drawRowHighlight(gfx, x + 3, ry, w - 6, 16);
        gfx.drawBitmap(icon('cursor'), x + 5, ry + 4);
      }
      const k = this.knowledge(g, sp.id);
      labelText(gfx, dexNo(sp.dexNo), x + 15, ry);
      if (k === 'unseen') mutedText(gfx, '-----', x + 40, ry);
      else text(gfx, sp.name, x + 40, ry);
      if (k === 'caught') gfx.drawBitmap(icon('crystal_throw'), x + w - 22, ry + 2);
    });
    drawScrollbar(gfx, x + w - 7, y + 5, h - 10, this.cursor);
  }

  private renderDetail(gfx: Gfx, g: GameContext, sp: SpeciesDef): void {
    drawHeader(gfx, 'LEXIKON', `Nr. ${dexNo(sp.dexNo)}`);
    const caught = this.knowledge(g, sp.id) === 'caught';
    const top = HEADER_H + 2;
    gfx.drawWindow(2, top, 80, 76);
    drawStage(gfx, 5, top + 3, 74, 70, caught ? TYPE_COLORS[sp.types[0]] : '#a0a8b0');
    const bob = Math.floor(g.frame / 30) % 2;
    gfx.drawBitmap(creatureSprite(sp.id, 'front'), 18, top + 14 - bob, caught ? {} : { tint: SILHOUETTE });

    const ix = 84;
    gfx.drawWindow(ix, top, W - ix - 2, 76);
    text(gfx, sp.name, ix + 8, top + 3);
    if (caught) {
      labelText(gfx, sp.dex.category, ix + 8, top + 18);
      sp.types.forEach((t, i) => drawTypePill(gfx, ix + 8 + i * (TYPE_PILL_W + 2), top + 38, t));
    } else mutedText(gfx, '?????-Wildling', ix + 8, top + 18);
    labelText(gfx, 'Gr.', ix + 8, top + 54);
    text(gfx, caught ? `${decimal(sp.dex.heightM)} m` : '???', ix + 26, top + 54);
    labelText(gfx, 'Gew.', ix + 72, top + 54);
    text(gfx, caught ? `${decimal(sp.dex.weightKg)} kg` : '???', ix + 98, top + 54);

    const ty = top + 78;
    gfx.drawWindow(2, ty, W - 4, 160 - ty - 2);
    if (caught) {
      const lines = gfx.wrapText(sp.dex.text, TEXT_W).slice(0, TEXT_LINES);
      const step = lines.length > 3 ? 13 : 16;
      lines.forEach((line, i) => text(gfx, line, 11, ty + 4 + i * step));
    } else mutedText(gfx, 'Noch keine Daten vorhanden.', 11, ty + 5);
    // up/down browse the other seen species
    if (this.nextSeen(g, 1) === null) return;
    const arrowBob = Math.floor(g.frame / 16) % 2;
    gfx.drawBitmap(icon('arrow_up'), W - 16, ty + 6 - arrowBob);
    gfx.drawBitmap(icon('arrow_down'), W - 16, 160 - 15 + arrowBob);
  }
}

export function runDex(g: GameContext): Promise<void> {
  return g.open<void>((close) => new DexScreen(() => close()));
}
