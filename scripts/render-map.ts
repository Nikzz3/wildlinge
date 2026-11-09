/**
 * Renders whole maps to PNG without a browser: npx tsx scripts/render-map.ts <mapId…|all>
 * Writes out/maps/<id>.png at 2x: autotiled tiles, buildings, ground items, NPCs (facing), and markers:
 *   red outline = warp / door, yellow = trigger rect, cyan = sign text, magenta = hidden item,
 *   orange dots = trainer line of sight.
 * A footer lists exits, connections, NPCs and validation problems (also printed to the console).
 */
import { mkdirSync } from 'node:fs';
import { buildingBitmap, charFrame, tileOverlay } from '../src/art';
import { type Bitmap, blit, createBitmap, parseColor, scaleNearest, setPixel } from '../src/core/bitmap';
import type { MapDef } from '../src/core/contracts';
import { TILE_META } from '../src/core/tiles-meta';
import { doorTile, MapModel } from '../src/overworld/map-model';
import { DIR_DELTA } from '../src/overworld/rules';
import { validateMap } from '../src/overworld/validate';
import { MAPS, START } from '../src/world';
import { writePng } from './lib/png';
import { renderText } from './lib/text';

const OUT = 'out/maps';
const SCALE = 2;
const T = 16;
const COLORS = { warp: '#ff2020', trigger: '#ffe020', sign: '#20e0ff', hidden: '#ff40ff', sight: '#ff9020' } as const;

/** Draws `src` over `dst` at (x, y) with alpha blending ("source over"), like the canvas does. */
function blendBlit(dst: Bitmap, src: Bitmap, x0: number, y0: number): void {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const dx = x0 + x;
      const dy = y0 + y;
      if (dx < 0 || dy < 0 || dx >= dst.w || dy >= dst.h) continue;
      const si = (y * src.w + x) * 4;
      const sa = src.data[si + 3]! / 255;
      if (sa === 0) continue;
      const di = (dy * dst.w + dx) * 4;
      const da = (dst.data[di + 3]! / 255) * (1 - sa);
      const oa = sa + da;
      for (let c = 0; c < 3; c++) dst.data[di + c] = Math.round((src.data[si + c]! * sa + dst.data[di + c]! * da) / oa);
      dst.data[di + 3] = Math.round(oa * 255);
    }
}

/** Map composed at 1x: the game's cell frames, buildings, items and NPCs (y-sorted, tall-grass overlay). */
function composeMap(m: MapModel): Bitmap {
  const def = m.def;
  const out = createBitmap(m.w * T, m.h * T);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) blendBlit(out, m.frames(x, y)[0]!, x * T, y * T);
  for (const b of def.buildings ?? []) blendBlit(out, buildingBitmap(b.style, b.w, b.h, b.door.dx), b.x * T, b.y * T);
  const sprites = [
    ...(def.items ?? []).map((i) => ({ x: i.x, y: i.y, frame: charFrame('item_ball', 'down', 0) })),
    ...(def.npcs ?? []).map((n) => ({ x: n.x, y: n.y, frame: charFrame(n.sprite, n.facing, 0) })),
  ].sort((a, b) => a.y - b.y);
  for (const s of sprites) {
    blendBlit(out, s.frame, s.x * T, s.y * T - 4);
    const id = m.tile(s.x, s.y);
    const over = id && TILE_META[id].tall ? tileOverlay(id) : null;
    if (over) blendBlit(out, over, s.x * T, s.y * T);
  }
  return out;
}

function outline(b: Bitmap, x: number, y: number, w: number, h: number, color: string): void {
  const c = parseColor(color);
  for (let i = 0; i < w; i++) {
    setPixel(b, x + i, y, c);
    setPixel(b, x + i, y + h - 1, c);
  }
  for (let j = 0; j < h; j++) {
    setPixel(b, x, y + j, c);
    setPixel(b, x + w - 1, y + j, c);
  }
}

function dot(b: Bitmap, x: number, y: number, size: number, color: string): void {
  const c = parseColor(color);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) setPixel(b, x + i, y + j, c);
}

/** Markers drawn on the scaled image so outlines stay 1px thin. */
function drawMarkers(b: Bitmap, def: MapDef, m: MapModel): void {
  const S = T * SCALE;
  const tileBox = (x: number, y: number, color: string, inset = 1) =>
    outline(b, x * S + inset, y * S + inset, S - 2 * inset, S - 2 * inset, color);
  for (const t of def.triggers ?? []) outline(b, t.x * S + 3, t.y * S + 3, (t.w ?? 1) * S - 6, (t.h ?? 1) * S - 6, COLORS.trigger);
  for (const s of def.signs ?? []) tileBox(s.x, s.y, COLORS.sign, 2);
  for (const h of def.hiddenItems ?? []) tileBox(h.x, h.y, COLORS.hidden, 4);
  for (const e of m.exits()) tileBox(e.x, e.y, COLORS.warp, 1);
  for (const n of def.npcs ?? []) {
    if (!n.trainer) continue;
    const { dx, dy } = DIR_DELTA[n.facing];
    for (let d = 1; d <= n.trainer.sight; d++) {
      const x = n.x + dx * d;
      const y = n.y + dy * d;
      if (m.blocksSight(x, y, n.facing)) break;
      dot(b, x * S + S / 2 - 2, y * S + S / 2 - 2, 4, COLORS.sight);
    }
  }
}

function describe(def: MapDef, m: MapModel, problems: readonly string[]): string {
  const lines = [`${def.id} "${def.name}" (${def.kind}, ${m.w}×${m.h}, music ${def.music}, battle ${def.battleBg})`];
  for (const w of def.warps ?? []) lines.push(`warp (${w.x},${w.y}) -> ${w.to} (${w.tx},${w.ty})`);
  for (const b of def.buildings ?? []) {
    const d = doorTile(b);
    lines.push(`door ${b.style} (${d.x},${d.y}) -> ${b.door.to} (${b.door.tx},${b.door.ty})`);
  }
  for (const [dir, c] of Object.entries(def.connections ?? {})) if (c) lines.push(`connection ${dir} -> ${c.map} offset ${c.offset}`);
  for (const n of def.npcs ?? []) {
    const extra = [n.movement && n.movement !== 'static' ? n.movement : '', n.trainer ? `trainer ${n.trainer.id} sight ${n.trainer.sight}` : '', n.visible ? 'conditional' : '']
      .filter(Boolean)
      .join(', ');
    lines.push(`npc ${n.id} (${n.x},${n.y}) ${n.sprite}${extra ? ` [${extra}]` : ''}`);
  }
  for (const p of problems) lines.push(`PROBLEM ${p}`);
  return lines.join('\n');
}

function renderOne(def: MapDef): string {
  const m = new MapModel(def);
  const problems = validateMap(def, MAPS, { startMapId: START.mapId });
  const map = scaleNearest(composeMap(m), SCALE);
  drawMarkers(map, def, m);
  const footer = scaleNearest(renderText(describe(def, m, problems), '#f8f8f8', '#283840'), SCALE);
  const out = createBitmap(Math.max(map.w, footer.w), map.h + footer.h);
  const bg = parseColor('#283840');
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) setPixel(out, x, y, bg);
  blit(out, map, 0, 0);
  blit(out, footer, 0, map.h);
  const file = `${OUT}/${def.id}.png`;
  writePng(file, out);
  for (const p of problems) console.warn(`  ! ${p}`);
  return file;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: npx tsx scripts/render-map.ts <mapId…|all>');
  console.log(`Maps: ${Object.keys(MAPS).join(', ')}`);
  process.exit(1);
}
const ids = args.includes('all') ? Object.keys(MAPS) : args;
mkdirSync(OUT, { recursive: true });
let failed = false;
for (const id of ids) {
  const def = MAPS[id];
  if (!def) {
    console.error(`Unknown map "${id}". Maps: ${Object.keys(MAPS).join(', ')}`);
    failed = true;
    continue;
  }
  try {
    console.log(renderOne(def));
  } catch (err) {
    console.error(`${id}: ${err instanceof Error ? err.message : String(err)}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
