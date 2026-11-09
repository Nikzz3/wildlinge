/**
 * Renders all art to PNG sheets in out/sheets/ for visual review.
 * Usage: npx tsx scripts/render-sheets.ts [section...]   sections: font icons tiles buildings chars creatures
 */
import { mkdirSync } from 'node:fs';
import { buildingBitmap, charFrame, creatureSprite, icon, ICON_IDS, itemIcon, badgeIcon, tileFrames, tileOverlay, trainerPortrait } from '../src/art';
import { BUILDING_STYLES, CHAR_SPRITE_IDS, type Dir } from '../src/core/types';
import { TILE_IDS } from '../src/core/tiles-meta';
import { SPECIES, ITEMS } from '../src/data';
import { writePng } from './lib/png';
import { sheet } from './lib/sheet';
import { renderText } from './lib/text';

const OUT = 'out/sheets';
mkdirSync(OUT, { recursive: true });
const want = new Set(process.argv.slice(2));
const on = (s: string) => want.size === 0 || want.has(s);
const done: string[] = [];
const out = (name: string, b: Parameters<typeof writePng>[1], scale: number) => {
  writePng(`${OUT}/${name}.png`, b, scale);
  done.push(`${OUT}/${name}.png`);
};

if (on('font')) {
  out('font', renderText(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ ÄÖÜ\nabcdefghijklmnopqrstuvwxyz äöüß é\n0123456789 .,:;!?\'"-+*/()[]<>=%&#@_~|\\{}^`$ … ▶ ▼ × ♪\n' +
    'Ein wildes Flammo erscheint! Was soll Kai tun?\nPROFESSORIN ARVEN: Willkommen in Alvenland!\nLP 23/41  ANG 12  Lv 15  3000 Fr.  EN 10/10',
  ), 3);
}
if (on('icons')) {
  out('icons', sheet([...ICON_IDS.map(icon), ...ITEMS.map((i) => itemIcon(i.id)), ...[0, 1, 2, 3].map(badgeIcon)], 12, 2), 4);
}
if (on('tiles')) {
  const frames = TILE_IDS.flatMap((id) => [...tileFrames(id), ...(tileOverlay(id) ? [tileOverlay(id)!] : [])]);
  out('tiles', sheet(frames, 12, 2), 4);
}
if (on('buildings')) {
  out('buildings', sheet(BUILDING_STYLES.map((s, i) => buildingBitmap(s, 4 + (i % 3), 3 + (i % 2), 1)), 4, 4), 3);
}
if (on('chars')) {
  const dirs: Dir[] = ['down', 'up', 'left', 'right'];
  const frames = CHAR_SPRITE_IDS.flatMap((id) => dirs.flatMap((d) => ([0, 1, 2] as const).map((f) => charFrame(id, d, f))));
  out('chars', sheet(frames, 12, 2), 4);
  out('portraits', sheet(CHAR_SPRITE_IDS.map(trainerPortrait), 8, 2), 3);
}
if (on('creatures')) {
  out('creatures_front', sheet(SPECIES.map((s) => creatureSprite(s.id, 'front')), 8, 2, '#f8f8f0'), 3);
  out('creatures_back', sheet(SPECIES.map((s) => creatureSprite(s.id, 'back')), 8, 2, '#f8f8f0'), 2);
  out('creatures_icon', sheet(SPECIES.map((s) => creatureSprite(s.id, 'icon')), 12, 2, '#f8f8f0'), 4);
}
console.log(done.join('\n'));
