/**
 * App icon from the game's own art: Zündli in front of the Alpenglut on a rounded square in the title's
 * sunset palette. Drawn at 64×64 and scaled with nearest neighbour to build/icon.png (1024 px), then
 * build/icon-256.png (Linux), build/icon.icns via sips (small sizes) + iconutil (macOS). scripts/package.mjs picks both up.
 * Usage: npx tsx scripts/make-icon.ts
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { creatureSprite } from '../src/art';
import { blit, type Bitmap, createBitmap, parseColor, setPixel } from '../src/core/bitmap';
import { encodePng, writePng } from './lib/png';

const N = 64;
const INSET = 5;
const RADIUS = 12;
/** Title sky, top → bottom (src/scenes/panorama.ts). */
const SKY = ['#262252', '#3a2860', '#58306c', '#80386e', '#a8486c', '#d06462', '#ec8c60', '#f8b868'];

function insideRounded(x: number, y: number, inset: number, r: number): boolean {
  const lo = inset;
  const hi = N - 1 - inset;
  if (x < lo || x > hi || y < lo || y > hi) return false;
  const cx = Math.min(Math.max(x, lo + r), hi - r);
  const cy = Math.min(Math.max(y, lo + r), hi - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * 0.6;
}

function paint(b: Bitmap, test: (x: number, y: number) => boolean, color: string): void {
  const c = parseColor(color);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (insideRounded(x, y, INSET, RADIUS) && test(x, y)) setPixel(b, x, y, c);
}

function drawIcon(): Bitmap {
  const b = createBitmap(N, N);
  const top = INSET;
  const h = N - 2 * INSET;
  // stepped sunset sky
  paint(b, () => true, SKY[0]!);
  SKY.forEach((color, i) => paint(b, (_x, y) => y >= top + Math.floor((i * h) / SKY.length), color));
  // the Alpenglut: concentric glow behind the creature
  const gx = 32;
  const gy = 30;
  for (const [r, color] of [[20, '#f06040'], [16, '#f87848'], [12, '#ffa058'], [8, '#ffd088']] as const) {
    paint(b, (x, y) => (x - gx) ** 2 + (y - gy) ** 2 <= r * r, color);
  }
  // a few stars
  for (const [x, y] of [[12, 12], [20, 8], [47, 10], [54, 16], [9, 20]] as const) paint(b, (px, py) => px === x && py === y, '#f8f0ff');
  // mountains: a back range and the front peak
  paint(b, (x, y) => y >= 44 - Math.max(0, 9 - Math.abs(x - 14) * 0.9) || y >= 44 - Math.max(0, 10 - Math.abs(x - 50) * 0.8), '#8a5276');
  paint(b, (x, y) => y >= 50 - Math.max(0, 14 - Math.abs(x - 32) * 0.75), '#562a5a');
  paint(b, (_x, y) => y >= 54, '#40204a');
  // Zündli, standing in front of the glow
  const sprite = creatureSprite('zuendli', 'front');
  blit(b, sprite, Math.round((N - sprite.w) / 2), 58 - sprite.h);
  // dark rim
  const rim = parseColor('#1a1030');
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const inside = insideRounded(x, y, INSET, RADIUS);
      const edge = inside && !insideRounded(x, y, INSET + 1, RADIUS - 1);
      if (edge) setPixel(b, x, y, rim);
      if (!inside) setPixel(b, x, y, [0, 0, 0, 0]);
    }
  return b;
}

const icon = drawIcon();
mkdirSync('build', { recursive: true });
writePng('build/icon.png', icon, 1024 / N);
// Linux AppImage icon (scripts/appimage.mjs): hicolor/256x256, the size desktop integrators install.
writePng('build/icon-256.png', icon, 256 / N);

// macOS .icns: crisp integer scales from the 64 px art, sips for the two small sizes.
const set = 'build/icon.iconset';
rmSync(set, { recursive: true, force: true });
mkdirSync(set);
const sizes: [string, number][] = [
  ['icon_16x16', 16], ['icon_16x16@2x', 32], ['icon_32x32', 32], ['icon_32x32@2x', 64], ['icon_128x128', 128],
  ['icon_128x128@2x', 256], ['icon_256x256', 256], ['icon_256x256@2x', 512], ['icon_512x512', 512], ['icon_512x512@2x', 1024],
];
for (const [file, px] of sizes) {
  const out = `${set}/${file}.png`;
  if (px >= N) writePng(out, icon, px / N);
  else execFileSync('sips', ['-z', String(px), String(px), 'build/icon.png', '--out', out], { stdio: 'ignore' });
}
execFileSync('iconutil', ['-c', 'icns', set, '-o', 'build/icon.icns']);
rmSync(set, { recursive: true, force: true });
// Windows .ico: PNG-compressed entries (supported since Vista).
const pngAt = (px: number): Buffer => {
  if (px >= N) return encodePng(icon, px / N);
  const tmp = `build/icon-${px}.png`;
  execFileSync('sips', ['-z', String(px), String(px), 'build/icon.png', '--out', tmp], { stdio: 'ignore' });
  const data = readFileSync(tmp);
  rmSync(tmp);
  return data;
};
const images = [16, 32, 48, 64, 128, 256].map((px) => ({ px, data: pngAt(px) }));
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach(({ px, data }, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(px % 256, e); // 0 means 256
  header.writeUInt8(px % 256, e + 1);
  header.writeUInt16LE(1, e + 4); // planes
  header.writeUInt16LE(32, e + 6); // bits per pixel
  header.writeUInt32LE(data.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += data.length;
});
writeFileSync('build/icon.ico', Buffer.concat([header, ...images.map((i) => i.data)]));
console.log('wrote build/icon.png (1024 px), build/icon-256.png, build/icon.icns and build/icon.ico');
