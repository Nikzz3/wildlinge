/** Shop: KAUFEN (list with prices) / VERKAUFEN (bag in sell mode) / ZURÜCK. */
import { icon, itemIcon } from '../../art';
import type { GameContext, Gfx } from '../../core/contracts';
import type { ItemDef } from '../../core/types';
import { getItem } from '../../data';
import { addItem, itemCount, spendMoney } from '../../state';
import { runBag } from './bag';
import { drawRowHighlight, drawScrollbar, labelText, ListCursor, Screen, text, W, withBackdrop } from './common';

const MAX_STACK = 999;

/** Money window in the top-left corner. */
function drawMoney(gfx: Gfx, g: GameContext): void {
  gfx.drawWindow(2, 2, 84, 40);
  labelText(gfx, 'Geld', 10, 5);
  text(gfx, `${g.state.money} Fr.`, 78, 21, 'right');
}

const ROWS = 6;
const LIST = { x: 90, y: 2, w: 148, h: ROWS * 16 + 10 } as const;

class BuyScreen extends Screen {
  readonly name = 'shop-buy';
  override readonly overlay = true;
  private readonly cursor: ListCursor;

  constructor(
    private readonly items: readonly ItemDef[],
    private readonly close: () => void,
  ) {
    super();
    this.cursor = new ListCursor(items.length + 1, ROWS);
  }

  protected step(g: GameContext): void {
    if (this.cursor.update(g)) return;
    if (g.input.pressed('a')) {
      const item = this.items[this.cursor.index];
      if (!item) {
        g.audio.playSfx('cancel');
        this.close();
        return;
      }
      g.audio.playSfx('confirm');
      this.run(() => buy(g, item));
    } else if (g.input.pressed('b')) {
      g.audio.playSfx('cancel');
      this.close();
    }
  }

  render(gfx: Gfx, g: GameContext): void {
    drawMoney(gfx, g);
    const { x, y, w, h } = LIST;
    gfx.drawWindow(x, y, w, h);
    this.cursor.visible().forEach((i, row) => {
      const ry = y + 5 + row * 16;
      if (i === this.cursor.index) {
        drawRowHighlight(gfx, x + 3, ry, w - 6, 16);
        gfx.drawBitmap(icon('cursor'), x + 5, ry + 4);
      }
      const item = this.items[i];
      if (!item) return text(gfx, 'ZURÜCK', x + 16, ry);
      text(gfx, item.name, x + 16, ry);
      text(gfx, `${item.price} Fr.`, x + w - 11, ry, 'right');
    });
    drawScrollbar(gfx, x + w - 7, y + 5, h - 10, this.cursor);

    const item = this.items[this.cursor.index];
    gfx.drawWindow(2, 46, 84, 62);
    if (item) {
      gfx.drawBitmap(itemIcon(item.id), 28, 50, { scale: 2 });
      labelText(gfx, 'Im Beutel', 9, 82);
      text(gfx, `×${itemCount(g.state, item.id)}`, 78, 90, 'right');
    }
    gfx.drawWindow(0, 112, W, 48);
    const desc = item ? item.desc : 'Zurück zur Auswahl.';
    gfx.wrapText(desc, W - 20).slice(0, 2).forEach((line, i) => text(gfx, line, 10, 118 + i * 16));
  }
}

async function buy(g: GameContext, item: ItemDef): Promise<void> {
  const affordable = item.price > 0 ? Math.floor(g.state.money / item.price) : 0;
  const room = MAX_STACK - itemCount(g.state, item.id);
  const max = Math.min(99, affordable, room);
  if (room <= 0) return g.ui.message('Davon kannst du nicht noch mehr tragen.');
  if (max <= 0) return g.ui.message('Dafür reicht dein Geld leider nicht.');
  const n = await g.ui.quantity(max, { unitPrice: item.price, x: W - 104, y: 112 - 26 });
  if (n === null) return;
  const total = n * item.price;
  if (!(await g.ui.confirm(`${n}× ${item.name} macht ${total} Fr. Einverstanden?`))) return;
  if (!spendMoney(g.state, total)) return g.ui.message('Dafür reicht dein Geld leider nicht.');
  addItem(g.state, item.id, n);
  g.audio.playSfx('buy');
  await g.ui.message('Bitte sehr! Vielen Dank!');
}

export function runShop(g: GameContext, itemIds: readonly string[]): Promise<void> {
  const items = itemIds.map(getItem).filter((it) => it.price > 0);
  return withBackdrop(g, 'shop', (gfx) => drawMoney(gfx, g), async () => {
    let text = 'Willkommen im Laden! Was darf es sein?';
    for (;;) {
      const r = await g.ui.ask(text, ['KAUFEN', 'VERKAUFEN', 'ZURÜCK']);
      if (r === 0) await g.open<void>((close) => new BuyScreen(items, () => close()));
      else if (r === 1) await runBag(g, 'sell');
      else break;
      text = 'Kann ich sonst noch etwas für dich tun?';
    }
    await g.ui.message('Vielen Dank und bis bald!');
  });
}
