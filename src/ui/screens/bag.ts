/** Bag: pockets ITEMS / KRISTALLE / BASIS. Field (use/toss), battle (pick without consuming) and sell (shop) modes. */
import { icon, itemIcon } from '../../art';
import type { GameContext, Gfx } from '../../core/contracts';
import type { ItemDef, ItemPocket } from '../../core/types';
import { addMoney, itemCount, removeItem } from '../../state';
import {
  choose, drawBackdrop, drawHeaderBar, drawRowHighlight, drawScrollbar, drawTabs, HEADER_H, labelText, ListCursor, lightText,
  mutedText, PAL, Screen, text, W,
} from './common';
import { useItemInField } from './item-use';
import { canSell, isCreatureTargeted, itemPreview, pocketItems, sellMax, sellPrice, usableInBattle } from './logic';
import { runParty } from './party';

export type BagMode = 'field' | 'battle' | 'sell';
export type BagChoice = { itemId: string; partyIndex?: number };

const POCKETS: readonly { id: ItemPocket; label: string }[] = [
  { id: 'items', label: 'ITEMS' },
  { id: 'crystals', label: 'KRISTALLE' },
  { id: 'key', label: 'BASIS' },
];

/** Last pocket and cursor per pocket, kept between openings. */
const memory = { pocket: 0, index: [0, 0, 0] };

const ROWS = 5;
const LIST = { x: 84, y: HEADER_H + 2, w: 154, h: ROWS * 16 + 10 } as const;
const SIDE = { x: 2, y: HEADER_H + 2, w: 80, h: LIST.h } as const;
const DESC_Y = LIST.y + LIST.h + 2;

class BagScreen extends Screen {
  readonly name = 'bag';
  private pocket = memory.pocket;
  private cursor: ListCursor;

  constructor(
    g: GameContext,
    private readonly mode: BagMode,
    private readonly close: (r: BagChoice | null) => void,
  ) {
    super();
    this.cursor = new ListCursor(this.items(g).length + 1, ROWS, memory.index[this.pocket] ?? 0);
  }

  /** Pocket currently shown (also read by e2e tests). */
  get pocketId(): ItemPocket {
    return POCKETS[this.pocket]?.id ?? 'items';
  }

  private items(g: GameContext): ItemDef[] {
    return pocketItems(g.state, this.pocketId, this.mode === 'battle' ? usableInBattle : undefined);
  }

  protected step(g: GameContext): void {
    const items = this.items(g);
    this.cursor.setCount(items.length + 1);
    const input = g.input;
    if (input.repeat('left') || input.repeat('right')) this.switchPocket(g, input.repeat('left') ? -1 : 1);
    else if (!this.cursor.update(g)) this.confirmOrBack(g, items[this.cursor.index]);
    memory.pocket = this.pocket;
    memory.index[this.pocket] = this.cursor.index;
  }

  private switchPocket(g: GameContext, d: number): void {
    this.pocket = (this.pocket + d + POCKETS.length) % POCKETS.length;
    this.cursor = new ListCursor(this.items(g).length + 1, ROWS, memory.index[this.pocket] ?? 0);
    g.audio.playSfx('cursor');
  }

  /** A on an item starts its action; A on ZURÜCK or B closes the bag. */
  private confirmOrBack(g: GameContext, item: ItemDef | undefined): void {
    if (g.input.pressed('a') && item) {
      g.audio.playSfx('confirm');
      this.run(() => this.select(g, item));
    } else if (g.input.pressed('a') || g.input.pressed('b')) {
      g.audio.playSfx('cancel');
      this.close(null);
    }
  }

  private async select(g: GameContext, item: ItemDef): Promise<void> {
    if (this.mode === 'field') await this.fieldAction(g, item);
    else if (this.mode === 'battle') await this.battlePick(g, item);
    else await this.sell(g, item);
  }

  private async fieldAction(g: GameContext, item: ItemDef): Promise<void> {
    const key = item.pocket === 'key';
    const r = await choose(g, ['BENUTZEN', 'WEGWERFEN', 'ZURÜCK'], { bottom: DESC_Y, disabled: [key, key, false] });
    if (r === 0) await useItemInField(g, item);
    else if (r === 1) await this.toss(g, item);
  }

  private async toss(g: GameContext, item: ItemDef): Promise<void> {
    const have = itemCount(g.state, item.id);
    const n = have > 1 ? await g.ui.quantity(have, { x: W - 48, y: DESC_Y - 26 }) : 1;
    if (n === null) return;
    if (!(await g.ui.confirm(`${n}× ${item.name} wegwerfen?`))) return;
    removeItem(g.state, item.id, n);
    await g.ui.message(`${n}× ${item.name} weggeworfen.`);
  }

  private async battlePick(g: GameContext, item: ItemDef): Promise<void> {
    if (!isCreatureTargeted(item)) {
      this.close({ itemId: item.id });
      return;
    }
    const index = await runParty(g, { kind: 'itemTarget', itemId: item.id }, async (i) => {
      const c = g.state.party[i];
      if (c && itemPreview(c, item).ok) return true;
      await g.ui.message('Es hätte keine Wirkung.');
      return false;
    });
    if (index !== null) this.close({ itemId: item.id, partyIndex: index });
  }

  private async sell(g: GameContext, item: ItemDef): Promise<void> {
    if (!canSell(item)) {
      await g.ui.message('Das kann ich dir leider nicht abkaufen.');
      return;
    }
    const unit = sellPrice(item);
    const max = sellMax(itemCount(g.state, item.id), unit, g.state.money);
    if (max <= 0) {
      await g.ui.message('Mehr Geld passt nicht in deine Geldbörse.');
      return;
    }
    const n = await g.ui.quantity(max, { unitPrice: unit, x: W - 104, y: DESC_Y - 26 });
    if (n === null) return;
    if (!(await g.ui.confirm(`Ich zahle dir ${n * unit} Fr. für ${n}× ${item.name}. Einverstanden?`))) return;
    removeItem(g.state, item.id, n);
    addMoney(g.state, n * unit);
    g.audio.playSfx('buy');
    await g.ui.message(`Du hast ${n}× ${item.name} verkauft und ${n * unit} Fr. erhalten.`);
  }

  render(gfx: Gfx, g: GameContext): void {
    drawBackdrop(gfx, g, 'amber');
    const title = this.mode === 'sell' ? 'VERKAUFEN' : 'BEUTEL';
    drawHeaderBar(gfx);
    lightText(gfx, title, 6, 0);
    drawTabs(gfx, POCKETS.map((p) => p.label), this.pocket, gfx.measureText(title) + 16);

    const items = this.items(g);
    this.cursor.setCount(items.length + 1);
    const selected = items[this.cursor.index];
    this.renderSide(gfx, g, selected);
    this.renderList(gfx, g, items);
    gfx.drawWindow(0, DESC_Y, W, 160 - DESC_Y);
    let desc = 'Den Beutel schließen.';
    if (selected) desc = selected.desc;
    else if (items.length === 0) desc = this.mode === 'battle' ? 'Hier ist nichts, das jetzt hilft.' : 'Diese Tasche ist leer.';
    gfx.wrapText(desc, W - 20).slice(0, 2).forEach((line, i) => text(gfx, line, 10, DESC_Y + 6 + i * 16));
  }

  private renderSide(gfx: Gfx, g: GameContext, selected: ItemDef | undefined): void {
    const { x, y, w, h } = SIDE;
    gfx.drawWindow(x, y, w, h);
    if (this.mode === 'sell') return this.renderSellSide(gfx, g, selected);
    drawPedestal(gfx, x + w / 2, y + 50, w - 24);
    if (selected) gfx.drawBitmap(itemIcon(selected.id), x + 16, y + 4, { scale: 3 });
    if (this.mode === 'battle') return;
    labelText(gfx, 'Geld', x + 7, y + 56);
    text(gfx, `${g.state.money} Fr.`, x + w - 7, y + 70, 'right');
  }

  /** Sell mode: smaller icon, then the unit price and the current money. */
  private renderSellSide(gfx: Gfx, g: GameContext, selected: ItemDef | undefined): void {
    const { x, y, w } = SIDE;
    drawPedestal(gfx, x + w / 2, y + 32, w - 36);
    if (selected) gfx.drawBitmap(itemIcon(selected.id), x + w / 2 - 16, y + 3, { scale: 2 });
    labelText(gfx, 'Preis', x + 7, y + 36);
    if (selected && canSell(selected)) text(gfx, `${sellPrice(selected)} Fr.`, x + w - 7, y + 48, 'right');
    else mutedText(gfx, '---', x + w - 7, y + 48, 'right');
    gfx.fillRect(x + 6, y + 62, w - 12, 1, PAL.inner);
    labelText(gfx, 'Geld', x + 7, y + 62);
    text(gfx, `${g.state.money} Fr.`, x + w - 7, y + 74, 'right');
  }

  private renderList(gfx: Gfx, g: GameContext, items: readonly ItemDef[]): void {
    const { x, y, w, h } = LIST;
    gfx.drawWindow(x, y, w, h);
    this.cursor.visible().forEach((i, row) => {
      const ry = y + 5 + row * 16;
      if (i === this.cursor.index) {
        drawRowHighlight(gfx, x + 3, ry, w - 6, 16);
        gfx.drawBitmap(icon('cursor'), x + 5, ry + 4);
      }
      const item = items[i];
      if (!item) {
        text(gfx, 'ZURÜCK', x + 32, ry);
        return;
      }
      gfx.drawBitmap(itemIcon(item.id), x + 14, ry);
      const unusable = this.mode === 'sell' && !canSell(item);
      gfx.drawText(item.name, x + 32, ry, unusable ? { color: PAL.muted, shadow: null } : {});
      if (item.pocket !== 'key') text(gfx, `×${itemCount(g.state, item.id)}`, x + w - 11, ry, 'right');
    });
    drawScrollbar(gfx, x + w - 7, y + 5, h - 10, this.cursor);
  }
}

/** Two-step sandstone pedestal under the item icon, centered at cx. */
function drawPedestal(gfx: Gfx, cx: number, y: number, w: number): void {
  gfx.fillRect(cx - w / 2 + 2, y, w - 4, 4, '#e8dcc0');
  gfx.fillRect(cx - w / 2, y + 2, w, 3, '#c8b890');
}

/** Opens the bag. Battle mode returns the chosen item (+ party target) without consuming it. */
export function runBag(g: GameContext, mode: BagMode): Promise<BagChoice | null> {
  return g.open<BagChoice | null>((close) => new BagScreen(g, mode, close));
}
