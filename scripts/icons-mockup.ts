/**
 * Icon review sheets. Writes:
 *  - out/sheets/icons_mockup.png: every UI icon, the real item icons (data/items.ts) plus one
 *    sample per ItemUse variant, crystal throw variants, badges and the unknown-id fallback —
 *    on the sheet background, a light window and a dark window (5×).
 *  - out/sheets/icons_bag.png: 1× bag list (icon + name) on a light window and badges on a
 *    trainer-card strip, scaled 3× to judge readability at real size.
 * Usage: npx tsx scripts/icons-mockup.ts
 */
import { mkdirSync } from 'node:fs';
import { type Bitmap, blit, createBitmap, parseColor, setPixel } from '../src/core/bitmap';
import type { ItemDef, ItemPocket, ItemUse } from '../src/core/types';
import { badgeIcon, crystalThrowIcon, icon, ICON_IDS, iconForItem, itemIcon } from '../src/art/icons';
import { ITEMS } from '../src/data';
import { writePng } from './lib/png';
import { sheet } from './lib/sheet';
import { renderText } from './lib/text';

const sample = (id: string, use: ItemUse, pocket: ItemPocket = 'items'): ItemDef => ({
  id, name: id, pocket, price: 0, desc: '', use, usable: 'both',
});

const samples: ItemDef[] = [
  sample('repel150', { kind: 'repel', steps: 150 }),
  sample('nugget', { kind: 'none' }),
  sample('old_key', { kind: 'none' }, 'key'),
  sample('prof_letter', { kind: 'none' }, 'key'),
  sample('parcel', { kind: 'none' }, 'key'),
];

const all: Bitmap[] = [
  ...ICON_IDS.map(icon),
  ...ITEMS.map((i) => itemIcon(i.id)),
  ...samples.map(iconForItem),
  itemIcon('does-not-exist'),
  ...ITEMS.filter((i) => i.use.kind === 'crystal').map((i) => crystalThrowIcon(i.id)),
  ...[0, 1, 2, 3, 4].map(badgeIcon),
];

const grids = ['#506070', '#f8f8f0', '#283840'].map((bg) => sheet(all, 12, 3, bg));
const out = createBitmap(grids[0]!.w, grids.reduce((h, g) => h + g.h, 0));
grids.reduce((y, g) => (blit(out, g, 0, y), y + g.h), 0);

mkdirSync('out/sheets', { recursive: true });
writePng('out/sheets/icons_mockup.png', out, 5);
console.log('out/sheets/icons_mockup.png');

// --- 1× bag list ---------------------------------------------------------------------------

const ROW = 18;
const COL_W = 104;
const perCol = Math.ceil(ITEMS.length / 2);
const bag = createBitmap(COL_W * 2 + 8, perCol * ROW + 8 + 24);
const fill = (b: Bitmap, x: number, y: number, w: number, h: number, color: string) => {
  const c = parseColor(color);
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setPixel(b, xx, yy, c);
};
fill(bag, 0, 0, bag.w, bag.h, '#f8f8f0');
ITEMS.forEach((item, i) => {
  const x = 4 + Math.floor(i / perCol) * COL_W;
  const y = 4 + (i % perCol) * ROW;
  blit(bag, itemIcon(item.id), x, y);
  blit(bag, renderText(item.name), x + 18, y - 1);
});
const by = bag.h - 22;
fill(bag, 0, by - 2, bag.w, 24, '#283840');
[0, 1, 2, 3].forEach((i) => blit(bag, badgeIcon(i), 4 + i * 20, by + 2));
blit(bag, icon('cursor_light'), 96, by + 6);
[0, 1, 2, 3].forEach((i) => blit(bag, badgeIcon(i), 116 + i * 20, by + 2));
fill(bag, 112, by - 2, bag.w - 112, 24, '#f8f8f0');
[0, 1, 2, 3].forEach((i) => blit(bag, badgeIcon(i), 116 + i * 20, by + 2));
blit(bag, icon('cursor'), 196, by + 6);
blit(bag, icon('cursor_hollow'), 204, by + 6);
writePng('out/sheets/icons_bag.png', bag, 3);
console.log('out/sheets/icons_bag.png');

// --- zoomed detail of the item icons and badges on the light window colour -----------------

const detail = sheet(
  [...ITEMS.map((i) => itemIcon(i.id)), ...[0, 1, 2, 3].map(badgeIcon), icon('cursor'), icon('cursor_light'), icon('cursor_hollow'), icon('arrow_down')],
  8, 2, '#f8f8f0',
);
writePng('out/sheets/icons_zoom.png', detail, 8);
console.log('out/sheets/icons_zoom.png');
