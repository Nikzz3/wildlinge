/** Battle screen geometry (240×160; field above the 48px text/command box). */
import type { Side } from '../../core/contracts';

export const FIELD_H = 112;
export const BOX_Y = 112;

/** Bottom-center of the creature sprites (front 48×48 / back 64×64). */
export const ANCHOR: Record<Side, { x: number; y: number }> = {
  enemy: { x: 176, y: 58 },
  player: { x: 64, y: 114 },
};

/** Ground platform ellipses under the creatures. */
export const PLATFORM: Record<Side, { cx: number; cy: number; rx: number; ry: number }> = {
  enemy: { cx: 176, cy: 55, rx: 46, ry: 10 },
  player: { cx: 64, cy: 111, rx: 60, ry: 12 },
};

export const SPRITE_SIZE: Record<Side, number> = { enemy: 48, player: 64 };

export const HUD: Record<Side, { x: number; y: number; w: number; h: number }> = {
  enemy: { x: 4, y: 6, w: 120, h: 34 },
  player: { x: 118, y: 65, w: 118, h: 46 },
};

/** Visual center of a side's creature (effects aim here). */
export function centerOf(side: Side): { x: number; y: number } {
  const a = ANCHOR[side];
  return side === 'enemy' ? { x: a.x, y: a.y - 22 } : { x: a.x, y: a.y - 30 };
}

/** Sprite bounding box (for overlays like stat chevrons). */
export function spriteBox(side: Side): { x: number; y: number; w: number; h: number } {
  const s = SPRITE_SIZE[side];
  const a = ANCHOR[side];
  return { x: a.x - s / 2, y: a.y - s, w: s, h: side === 'player' ? BOX_Y - (a.y - s) : s };
}
