/**
 * Creature sprites: shape definitions per species (src/art/creatures/part*.ts) rendered by the
 * shape DSL (src/art/shapes.ts). Species without a definition get a generic silhouette.
 */
import type { Bitmap } from '../core/bitmap';
import { PART1 } from './creatures/part1';
import { PART2 } from './creatures/part2';
import { PART3 } from './creatures/part3';
import { PART4 } from './creatures/part4';
import { PART5 } from './creatures/part5';
import { type CreatureDef, type CreatureDefs, type CreatureView, ell, pixels, renderCreature } from './shapes';

export type { CreatureView } from './shapes';
export const CREATURE_VIEW_SIZE: Record<CreatureView, number> = { front: 48, back: 64, icon: 24 };

export const CREATURE_DEFS: CreatureDefs = { ...PART1, ...PART2, ...PART3, ...PART4, ...PART5 };

const EYE = { k: '#282830', w: '#f8f8f8' };

/** Neutral round critter for species that have no art yet. */
export const GENERIC_CREATURE: CreatureDef = {
  pal: { body: '#a8a0b8', belly: '#e8e4f0' },
  parts: [
    { c: 'body', s: ell(17, 22, 3.5, 6, -20) },
    { c: 'body', s: ell(30, 21, 3.5, 6, 20), dim: true },
    { c: 'body', s: [ell(24, 34, 12, 11), ell(18, 46, 3.5, 2), ell(30, 46, 3.5, 2)] },
    { c: 'belly', s: ell(22, 38, 6, 6), mark: true, face: true },
    pixels([18, 30], EYE, ['kk', 'wk', 'kk'], { face: true }),
    pixels([26, 30], EYE, ['kk', 'wk', 'kk'], { face: true }),
  ],
};

const cache = new Map<string, Bitmap>();

/** Creature sprite: front 48×48, back 64×64, icon 24×24. Transparent background, cached. */
export function creatureSprite(speciesId: string, view: CreatureView): Bitmap {
  const key = `${speciesId}:${view}`;
  let b = cache.get(key);
  if (!b) {
    const def = CREATURE_DEFS[speciesId] ?? GENERIC_CREATURE;
    try {
      b = renderCreature(def, view);
    } catch (e) {
      console.warn(`creatureSprite(${speciesId}, ${view}) failed, using generic art`, e);
      b = renderCreature(GENERIC_CREATURE, view);
    }
    cache.set(key, b);
  }
  return b;
}
