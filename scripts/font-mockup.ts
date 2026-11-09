/**
 * Font review mockup: dialog boxes and menus at 240×160 using FONT with the engine's
 * metrics (line height 16, glyph offset 2, shadow +1/+1). Writes out/sheets/font_mockup.png.
 * Usage: npx tsx scripts/font-mockup.ts
 */
import { mkdirSync } from 'node:fs';
import { type Bitmap, createBitmap, parseColor, setPixel } from '../src/core/bitmap';
import { FONT } from '../src/art/font';
import { writePng } from './lib/png';
import { renderText } from './lib/text';

const W = 240;
const H = 160 * 3;
const img = createBitmap(W, H);
/** Vertical offset of the screen currently being drawn. */
let oy = 0;

function rect(x: number, y: number, w: number, h: number, color: string): void {
  const c = parseColor(color);
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setPixel(img, xx, oy + yy, c);
}

function text(s: string, x: number, y: number, color: string, shadow: string | null): number {
  const draw = (ox: number, by: number, col: string) => {
    const c = parseColor(col);
    let cx = ox;
    for (const ch of s) {
      if (ch === ' ') {
        cx += FONT.spaceWidth + FONT.spacing;
        continue;
      }
      const g = FONT.glyphs[ch] ?? FONT.glyphs['?']!;
      g.rows.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') setPixel(img, cx + rx, oy + by + 2 + ry, c);
      });
      cx += g.w + FONT.spacing;
    }
    return cx - ox;
  };
  if (shadow) draw(x + 1, y + 1, shadow);
  return draw(x, y, color);
}

function window(x: number, y: number, w: number, h: number, dark = false): void {
  rect(x + 2, y, w - 4, h, '#285860');
  rect(x, y + 2, w, h - 4, '#285860');
  rect(x + 1, y + 1, w - 2, h - 2, '#285860');
  rect(x + 2, y + 2, w - 4, h - 4, '#88c0b8');
  rect(x + 3, y + 3, w - 6, h - 6, dark ? '#305068' : '#f8f8f0');
}

function light(s: string, x: number, y: number): number {
  return text(s, x, y, '#383838', '#d0d0c8');
}
function darkText(s: string, x: number, y: number): number {
  return text(s, x, y, '#f8f8f8', '#203038');
}

function screen(y: number, bg: string, draw: () => void): void {
  oy = y;
  rect(0, 0, W, 160, bg);
  draw();
}

screen(0, '#78b060', () => {
  window(0, 112, 240, 48);
  light('PROFESSORIN ARVEN: Willkommen in', 10, 112 + 8);
  light('Alvenland! Hier leben Wildlinge…', 10, 112 + 24);
  window(150, 4, 86, 100);
  ['Lexikon', 'Wildlinge', 'Beutel', 'Spielerpass', 'Sichern', 'Optionen', 'Zurück'].forEach((o, i) => {
    if (i === 1) light('▶', 158, 8 + i * 13);
    light(o, 166, 8 + i * 13);
  });
  window(4, 4, 140, 44);
  light('Größe: 0,4 m  ×3  1000', 12, 8);
  light('Übung: Äpfel für Öle ♪', 12, 24);
});

screen(160, '#a8c8d8', () => {
  window(0, 112, 240, 48, true);
  darkText('Ein wildes Glutfuchs erscheint!', 10, 112 + 8);
  darkText('Was soll Kai tun?', 10, 112 + 24);
  window(4, 4, 124, 36);
  light('GLUTFUCHS  Lv 15', 10, 6);
  light('LP 100/100  EN 10/10', 10, 22);
  window(124, 60, 112, 48);
  light('KAMPF   BEUTEL', 136, 66);
  light('TEAM    FLUCHT', 136, 82);
  light('▶', 128, 66);
});

screen(320, '#d8c8a0', () => {
  window(0, 112, 240, 48);
  light('Kai erhält 3× Kräutertee! "Geh jetzt"', 10, 112 + 8);
  light('Café-Rösterei: 1200 Fr. (quäkend) ▼', 10, 112 + 24);
  window(4, 4, 232, 100);
  light('Die jüngste Hüterin von Seewil ist', 10, 8);
  light('überaus geschickt. Sie füttert ihre', 10, 24);
  light('Wildlinge mit Quellwasser & Moos.', 10, 40);
  light('Zwölf Boxkämpfer jagen Viktor quer', 10, 56);
  light('über den großen Sylter Deich. #42?', 10, 72);
  light('WILDLINGE: Wasser, Wind & Wolken.', 10, 88);
});

const out = 'out/sheets';
mkdirSync(out, { recursive: true });
writePng(`${out}/font_mockup.png`, img as Bitmap, 3);
console.log(`${out}/font_mockup.png`);

// Zoomed glyph table for pixel-level review.
writePng(`${out}/font_zoom.png`, renderText(
  'ABCDEFGHIJKLM ÄÖÜ\nNOPQRSTUVWXYZ\nabcdefghijklm äöü\nnopqrstuvwxyz ßé\n0123456789 …▶▼×♪\n' +
  '!"#$%&\'()*+,-./\n:;<=>?@[\\]^_`{|}~\nWildlinge Wasser ij jj\nGipfelhorn Ärger jäh\n3000 Fr. 10/10 Orte',
), 6);
console.log(`${out}/font_zoom.png`);
