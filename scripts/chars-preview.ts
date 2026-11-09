/**
 * Character art preview (owned by the characters art task).
 * Usage: npx tsx scripts/chars-preview.ts [id...]
 * Writes out/sheets/chars-preview.png (all frames per id, zoomed, on grass) and
 * out/sheets/chars-scene.png (every sprite at 1× on a grass field, upscaled 3×).
 * Flags: --portraits (portraits only), --big, --zoom, --walk (walk strip), --tiles (contrast on
 * ground tiles, out/sheets/chars-tiles.png), --qa (stray pixel report).
 */
import { mkdirSync } from 'node:fs';
import { type Bitmap, blit, createBitmap, parseColor, setPixel } from '../src/core/bitmap';
import { CHAR_SPRITE_IDS, type CharSpriteId, type Dir } from '../src/core/types';
import { charFrame, trainerPortrait } from '../src/art/characters';
import { tileFrames } from '../src/art/tiles';
import type { TileId } from '../src/core/tiles-meta';
import { writePng } from './lib/png';

const OUT = 'out/sheets';
mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const portraitsOnly = args.includes('--portraits');
const ids = (args.filter((a) => !a.startsWith('--')) as CharSpriteId[]).filter((a) => CHAR_SPRITE_IDS.includes(a));
const list: readonly CharSpriteId[] = ids.length ? ids : CHAR_SPRITE_IDS;

function fill(b: Bitmap, color: string, checker?: string): void {
  const c = parseColor(color);
  const c2 = checker ? parseColor(checker) : c;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) setPixel(b, x, y, (x >> 4) % 2 === (y >> 4) % 2 ? c : c2);
}

const dirs: Dir[] = ['down', 'up', 'left', 'right'];

if (!portraitsOnly) {
  // Zoomed frames: one row per id: 12 frames.
  const cell = 18;
  const sheet = createBitmap(12 * cell + 2, list.length * cell + 2);
  fill(sheet, '#88c070', '#80b868');
  list.forEach((id, row) => {
    dirs.forEach((d, di) =>
      ([0, 1, 2] as const).forEach((f, fi) => blit(sheet, charFrame(id, d, f), 2 + (di * 3 + fi) * cell, 2 + row * cell)),
    );
  });
  writePng(`${OUT}/chars-preview.png`, sheet, args.includes('--zoom') ? 12 : 6);

  // Scene: all sprites at 1x, like in game, upscaled 3x.
  const scene = createBitmap(240, 160);
  fill(scene, '#88c070', '#80b868');
  list.forEach((id, i) => {
    const x = 8 + (i % 12) * 19;
    const y = 8 + Math.floor(i / 12) * 24;
    blit(scene, charFrame(id, 'down', 0), x, y);
  });
  const walkY = 8 + Math.ceil(list.length / 12) * 24;
  ['player', 'rival', 'prof', 'grunt'].forEach((id, i) =>
    dirs.forEach((d, di) => blit(scene, charFrame(id as CharSpriteId, d, (di % 2) as 0 | 1), 8 + (i * 4 + di) * 14, walkY)),
  );
  writePng(`${OUT}/chars-scene.png`, scene, 3);
}

const portraits = list.map(trainerPortrait);
const pw = 50;
const ph = 66;
const psheet = createBitmap(Math.min(8, portraits.length) * pw + 2, Math.ceil(portraits.length / 8) * ph + 2);
fill(psheet, '#e8e0c8');
portraits.forEach((p, i) => blit(psheet, p, 2 + (i % 8) * pw + Math.floor((48 - p.w) / 2), 2 + Math.floor(i / 8) * ph + (64 - p.h)));
writePng(`${OUT}/chars-portraits-preview.png`, psheet, args.includes('--big') ? 6 : 3);
console.log('ok');

// Walk cycle strip (frames 1,0,2,0 per direction) for animation review.
if (args.includes('--walk')) {
  const cycle = [1, 0, 2, 0] as const;
  const strip = createBitmap(16 * cycle.length * 4 + 2, list.length * 18 + 2);
  fill(strip, '#88c070', '#80b868');
  list.forEach((id, row) =>
    dirs.forEach((d, di) => cycle.forEach((f, fi) => blit(strip, charFrame(id, d, f), 2 + (di * 4 + fi) * 16, 2 + row * 18))),
  );
  writePng(`${OUT}/chars-walk.png`, strip, 8);
}

// Contrast check: every sprite (down, standing) on the ground tiles it may stand on.
if (args.includes('--tiles')) {
  const grounds: TileId[] = ['grass', 'path', 'sand', 'snow', 'snow_grass', 'ice_rock', 'cave_floor', 'bridge'];
  const board = createBitmap(list.length * 16, grounds.length * 16);
  grounds.forEach((t, row) =>
    list.forEach((id, col) => {
      blit(board, tileFrames(t)[0]!, col * 16, row * 16);
      blit(board, charFrame(id, 'down', 0), col * 16, row * 16);
    }),
  );
  writePng(`${OUT}/chars-tiles.png`, board, 4);
}

// QA: report opaque pixels with at most one opaque 8-neighbour (stray / dangling pixels).
if (args.includes('--qa')) {
  const objects: readonly CharSpriteId[] = ['item_ball', 'crystal', 'legend', 'boulder'];
  let issues = 0;
  for (const id of list.filter((i) => !objects.includes(i)))
    for (const d of dirs)
      for (const f of [0, 1, 2] as const) {
        const b = charFrame(id, d, f);
        const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < b.w && y < b.h && b.data[(y * b.w + x) * 4 + 3]! > 0;
        for (let y = 0; y < b.h; y++)
          for (let x = 0; x < b.w; x++) {
            if (!opaque(x, y)) continue;
            let n = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && opaque(x + dx, y + dy)) n++;
            if (n <= 1) {
              issues++;
              console.log(`${id} ${d} ${f}: stray pixel at ${x},${y}`);
            }
          }
      }
  console.log(`qa: ${issues} issue(s)`);
}
