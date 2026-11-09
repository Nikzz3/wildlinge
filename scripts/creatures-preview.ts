/**
 * Creature art review sheets. Writes:
 *  - out/sheets/creatures-preview.png: per species front / back / icon side by side, with name (3×).
 *  - out/sheets/creatures-battle.png: battle mockups (enemy front + player back on the real
 *    backdrop and platforms) at 2×, to judge sprites at their real size in context.
 * Usage: npx tsx scripts/creatures-preview.ts [speciesId... | 1-15]   (default: all species)
 */
import { mkdirSync } from 'node:fs';
import { type Bitmap, blit, createBitmap, parseColor, setPixel } from '../src/core/bitmap';
import type { BattleBg } from '../src/core/types';
import { creatureSprite } from '../src/art/creatures';
import { backdrop, platform, platformPos } from '../src/battle/ui/backdrop';
import { ANCHOR } from '../src/battle/ui/layout';
import { SPECIES } from '../src/data';
import { writePng } from './lib/png';
import { renderText } from './lib/text';

const OUT = 'out/sheets';
mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const range = args.length === 1 ? /^(\d+)-(\d+)$/.exec(args[0]!) : null;
const species = SPECIES.filter((s) =>
  range ? s.dexNo >= Number(range[1]) && s.dexNo <= Number(range[2]) : args.length === 0 || args.includes(s.id),
);

function fill(b: Bitmap, color: string): void {
  const c = parseColor(color);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) setPixel(b, x, y, c);
}

// Preview: one row per species: [name] front | back | icon (icon also on a dark strip).
{
  const cellW = 48 + 4 + 64 + 4 + 24 + 4 + 24 + 4;
  const cellH = 64 + 14;
  const cols = Math.min(3, species.length);
  const rows = Math.ceil(species.length / cols);
  const out = createBitmap(cols * cellW + 4, rows * cellH + 4);
  fill(out, '#f8f8f0');
  species.forEach((s, i) => {
    const x = 4 + (i % cols) * cellW;
    const y = 4 + Math.floor(i / cols) * cellH;
    blit(out, renderText(`#${String(s.dexNo).padStart(3, '0')} ${s.name}`, '#383838', '#f8f8f0'), x - 2, y - 4);
    blit(out, creatureSprite(s.id, 'front'), x, y + 12 + 16);
    blit(out, creatureSprite(s.id, 'back'), x + 52, y + 12);
    blit(out, creatureSprite(s.id, 'icon'), x + 120, y + 12 + 40);
    const dark = createBitmap(24, 24);
    fill(dark, '#283840');
    blit(dark, creatureSprite(s.id, 'icon'), 0, 0);
    blit(out, dark, x + 148, y + 12 + 40);
  });
  writePng(`${OUT}/creatures-preview.png`, out, species.length === 1 ? 8 : species.length <= 2 ? 6 : species.length <= 6 ? 4 : 3);
}

// Battle mockups: pairs (enemy = species i, player = species i+1), 2 per row.
{
  const bgs: BattleBg[] = ['grass', 'forest', 'cave', 'water', 'snow', 'summit'];
  const scenes = species.map((s, i) => {
    const bg = bgs[i % bgs.length]!;
    const player = species[(i + 1) % species.length]!;
    const b = createBitmap(240, 112);
    blit(b, backdrop(bg), 0, 0);
    for (const side of ['enemy', 'player'] as const) {
      const pp = platformPos(side);
      blit(b, platform(bg, side), pp.x, pp.y);
      const sprite = creatureSprite(side === 'enemy' ? s.id : player.id, side === 'enemy' ? 'front' : 'back');
      const a = ANCHOR[side];
      blit(b, sprite, a.x - sprite.w / 2, a.y - sprite.h);
    }
    return b;
  });
  const cols = 2;
  const out = createBitmap(cols * 244 + 4, Math.ceil(scenes.length / cols) * 116 + 4);
  fill(out, '#202020');
  scenes.forEach((b, i) => blit(out, b, 4 + (i % cols) * 244, 4 + Math.floor(i / cols) * 116));
  writePng(`${OUT}/creatures-battle.png`, out, 2);
}

console.log(`${OUT}/creatures-preview.png\n${OUT}/creatures-battle.png`);
