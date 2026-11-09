/** Draws the overworld: tiles (autotiled, animated), buildings, y-sorted characters/items, emotes, area banner. */
import { buildingBitmap, charFrame, icon, TILE_ANIM_TICKS, tileOverlay } from '../art';
import type { Bitmap } from '../core/bitmap';
import type { Gfx } from '../core/contracts';
import { TILE_META, type TileId } from '../core/tiles-meta';
import { type Actor, TILE } from './actor';
import type { MapModel } from './map-model';
import type { OverworldScene } from './scene';

/** Screen pixel of the player's tile (camera anchor). */
export const PLAYER_SCREEN_X = 112;
export const PLAYER_SCREEN_Y = 72;
/** Characters are drawn 4px above their tile so they appear to stand in it. */
const SPRITE_DY = -4;
const COLS = 16;
const ROWS = 11;
/** Area banner lifetime incl. slide in/out. */
export const BANNER_FRAMES = 120;

/** Area-name popup; `start` is the g.frame it appeared on. */
export interface Banner {
  text: string;
  start: number;
}
const BANNER_SLIDE = 12;

function animFrame(frames: readonly Bitmap[], clock: number): Bitmap {
  return frames[Math.floor(clock / TILE_ANIM_TICKS) % frames.length]!;
}

export function drawOverworld(gfx: Gfx, ow: OverworldScene, clock: number): void {
  if (ow.curtain) {
    gfx.clear('#000000');
    return;
  }
  const camX = ow.player.pixelX() - PLAYER_SCREEN_X;
  const camY = ow.player.pixelY() - PLAYER_SCREEN_Y;
  drawTiles(gfx, ow.model, camX, camY, clock);
  drawBuildings(gfx, ow.model, camX, camY);
  drawCharacters(gfx, ow, camX, camY, clock);
  drawBanner(gfx, ow.banner, clock);
}

function drawTiles(gfx: Gfx, model: MapModel, camX: number, camY: number, clock: number): void {
  const x0 = Math.floor(camX / TILE);
  const y0 = Math.floor(camY / TILE);
  for (let ty = y0; ty < y0 + ROWS; ty++)
    for (let tx = x0; tx < x0 + COLS; tx++) gfx.drawBitmap(animFrame(model.frames(tx, ty), clock), tx * TILE - camX, ty * TILE - camY);
}

function drawBuildings(gfx: Gfx, model: MapModel, camX: number, camY: number): void {
  for (const b of model.def.buildings ?? []) {
    const sx = b.x * TILE - camX;
    const sy = b.y * TILE - camY;
    if (sx > gfx.width || sy > gfx.height || sx + b.w * TILE < 0 || sy + b.h * TILE < 0) continue;
    gfx.drawBitmap(buildingBitmap(b.style, b.w, b.h, b.door.dx), sx, sy);
  }
}

interface Drawable {
  y: number;
  draw: () => void;
}

function drawCharacters(gfx: Gfx, ow: OverworldScene, camX: number, camY: number, clock: number): void {
  const model = ow.model;
  const tallOverlay = (tx: number, ty: number) => {
    const id: TileId | null = model.tile(tx, ty);
    const over = id && TILE_META[id].tall ? tileOverlay(id) : null;
    if (over) gfx.drawBitmap(over, tx * TILE - camX, ty * TILE - camY);
  };
  const list: Drawable[] = [];
  const itemBall = charFrame('item_ball', 'down', 0);
  for (const item of ow.map.items ?? []) {
    if (ow.itemAt(item.x, item.y) !== item) continue;
    list.push({
      y: item.y * TILE,
      draw: () => {
        gfx.drawBitmap(itemBall, item.x * TILE - camX, item.y * TILE - camY + SPRITE_DY);
        tallOverlay(item.x, item.y);
      },
    });
  }
  const actors: Actor[] = [...ow.npcs, ow.player];
  for (const a of actors) {
    list.push({
      y: a.pixelY(),
      draw: () => {
        const sx = a.pixelX() - camX;
        const sy = a.pixelY() - camY;
        if (a.jumping) gfx.drawBitmap(icon('shadow'), sx, sy + 8);
        gfx.drawBitmap(charFrame(a.sprite, a.facing, a.frame(clock)), sx, sy + SPRITE_DY - a.lift());
        if (a.jumping) return;
        tallOverlay(a.x, a.y);
        if (a.moving) tallOverlay(a.fromX, a.fromY);
      },
    });
  }
  list.sort((a, b) => a.y - b.y);
  for (const d of list) d.draw();
  for (const a of actors) {
    if (!a.emote) continue;
    gfx.drawBitmap(icon(`emote_${a.emote.kind}`), a.pixelX() - camX, a.pixelY() - camY + SPRITE_DY - 15 - a.lift());
  }
}

/** The banner runs on the global frame clock, so it keeps sliding while a dialog covers the overworld. */
function drawBanner(gfx: Gfx, banner: Banner | null, clock: number): void {
  const t = banner ? clock - banner.start : BANNER_FRAMES;
  if (!banner || t >= BANNER_FRAMES) return;
  const w = gfx.measureText(banner.text) + 22;
  const h = 24;
  const hidden = t < BANNER_SLIDE ? 1 - t / BANNER_SLIDE : t > BANNER_FRAMES - BANNER_SLIDE ? (t - (BANNER_FRAMES - BANNER_SLIDE)) / BANNER_SLIDE : 0;
  const y = 3 - Math.round(hidden * (h + 4));
  gfx.drawWindow(3, y, w, h);
  gfx.drawText(banner.text, 14, y + 4);
}
