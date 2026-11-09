import { describe, expect, it } from 'vitest';
import { CREATURE_DEFS, CREATURE_VIEW_SIZE } from '../src/art/creatures';
import { renderCreature } from '../src/art/shapes';
import { SPECIES } from '../src/data/species';

describe('creature art', () => {
  it('every species has its own art (not the generic stand-in) that renders in all three views', () => {
    for (const s of SPECIES) {
      const def = CREATURE_DEFS[s.id];
      expect(def, `${s.id} has no art`).toBeDefined();
      for (const view of ['front', 'back', 'icon'] as const) {
        const b = renderCreature(def!, view);
        expect([b.w, b.h], `${s.id} ${view}`).toEqual([CREATURE_VIEW_SIZE[view], CREATURE_VIEW_SIZE[view]]);
      }
    }
  });
});
