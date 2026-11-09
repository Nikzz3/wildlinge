/** Learning moves outside of the battle engine: forget dialog + full learn flow. */
import { icon } from '../../art';
import type { GameContext, Gfx } from '../../core/contracts';
import type { Creature, MoveDef } from '../../core/types';
import { displayName, replaceMove, tryAddMove } from '../../creature';
import { getMove } from '../../data';
import {
  drawBackdrop, drawCategoryPill, drawHeader, drawPill, drawRowHighlight, drawTypePill, labelText, ListCursor, PAL, Screen,
  text, W,
} from './common';

const LIST = { x: 2, y: 20, w: 236, step: 15 } as const;

/** Lists the 4 known moves + the new one; resolves with the chosen row (4 = the new move) or null on B. */
class ForgetScreen extends Screen {
  readonly name = 'forget-move';
  private readonly cursor = new ListCursor(5, 5);
  private readonly moves: MoveDef[];

  constructor(
    private readonly creature: Creature,
    newMove: string,
    private readonly close: (r: number | null) => void,
  ) {
    super();
    this.moves = [...creature.moves.map((m) => getMove(m.id)), getMove(newMove)];
    this.cursor.setCount(this.moves.length);
  }

  protected step(g: GameContext): void {
    if (this.cursor.update(g)) return;
    if (g.input.pressed('a')) {
      g.audio.playSfx('confirm');
      this.close(this.cursor.index);
    } else if (g.input.pressed('b')) {
      g.audio.playSfx('cancel');
      this.close(null);
    }
  }

  render(gfx: Gfx, g: GameContext): void {
    drawBackdrop(gfx, g, 'blue');
    drawHeader(gfx, 'Welche Attacke vergessen?', displayName(this.creature));
    const n = this.moves.length;
    const listH = n * LIST.step + 12;
    gfx.drawWindow(LIST.x, LIST.y, LIST.w, listH);
    this.moves.forEach((m, i) => {
      const isNew = i === n - 1;
      const ry = LIST.y + 4 + i * LIST.step + (isNew ? 3 : 0);
      if (i === this.cursor.index) {
        drawRowHighlight(gfx, LIST.x + 3, ry, LIST.w - 6, 15);
        gfx.drawBitmap(icon('cursor'), LIST.x + 6, ry + 4);
      }
      drawTypePill(gfx, LIST.x + 16, ry + 2, m.type);
      text(gfx, m.name, LIST.x + 62, ry - 2);
      if (isNew) drawPill(gfx, LIST.x + 140, ry + 2, 26, 'NEU', PAL.accent);
      const pp = isNew ? m.pp : (this.creature.moves[i]?.pp ?? 0);
      labelText(gfx, 'EN', LIST.x + 172, ry - 2);
      text(gfx, `${pp}/${m.pp}`, LIST.x + LIST.w - 8, ry - 2, 'right');
    });
    gfx.fillRect(LIST.x + 6, LIST.y + 4 + (n - 1) * LIST.step + 1, LIST.w - 12, 1, PAL.inner);
    const m = this.moves[this.cursor.index];
    if (!m) return;
    const dy = LIST.y + listH + 2;
    gfx.drawWindow(0, dy, W, 160 - dy);
    drawCategoryPill(gfx, 8, dy + 6, m.category);
    labelText(gfx, 'Stärke', 64, dy + 3);
    text(gfx, m.power > 0 ? String(m.power) : '-', 118, dy + 3, 'right');
    labelText(gfx, 'Genauigk.', 132, dy + 3);
    text(gfx, m.accuracy > 0 ? String(m.accuracy) : '-', 198, dy + 3, 'right');
    gfx.wrapText(m.desc, W - 18).slice(0, 2).forEach((line, i) => text(gfx, line, 9, dy + 19 + i * 13));
  }
}

function openForgetScreen(g: GameContext, c: Creature, moveId: string): Promise<number | null> {
  return g.open<number | null>((close) => new ForgetScreen(c, moveId, close));
}

/**
 * "X möchte Y erlernen …" → pick the move to forget. Returns the index 0..3 to forget, or null if the new
 * move should not be learned. Does NOT mutate.
 */
export async function askForgetMove(g: GameContext, creature: Creature, moveId: string): Promise<number | null> {
  const name = displayName(creature);
  const move = getMove(moveId).name;
  await g.ui.message(`${name} möchte ${move} erlernen.\fAber ${name} kann nicht mehr als vier Attacken kennen.`);
  for (;;) {
    if (await g.ui.confirm(`Soll ${name} eine Attacke vergessen, um ${move} zu erlernen?`)) {
      const pick = await openForgetScreen(g, creature, moveId);
      if (pick !== null && pick < creature.moves.length) return pick;
    }
    if (await g.ui.confirm(`Soll ${name} wirklich darauf verzichten, ${move} zu erlernen?`)) return null;
  }
}

/** Learns directly if a slot is free, otherwise askForgetMove + replace. Returns true if learned. */
export async function learnMoveFlow(g: GameContext, creature: Creature, moveId: string): Promise<boolean> {
  if (creature.moves.some((m) => m.id === moveId)) return false;
  const name = displayName(creature);
  const move = getMove(moveId).name;
  if (tryAddMove(creature, moveId)) {
    void g.audio.playJingle('item');
    await g.ui.message(`${name} hat ${move} erlernt!`);
    return true;
  }
  const index = await askForgetMove(g, creature, moveId);
  const old = index === null ? undefined : creature.moves[index];
  if (index === null || !old) {
    await g.ui.message(`${name} hat ${move} nicht erlernt.`);
    return false;
  }
  const oldName = getMove(old.id).name;
  replaceMove(creature, index, moveId);
  await g.ui.message(`1, 2 und … Schwupps!\f${name} hat ${oldName} vergessen …\f… und ${move} erlernt!`);
  return true;
}
