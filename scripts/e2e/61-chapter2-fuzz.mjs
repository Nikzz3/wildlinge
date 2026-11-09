/**
 * Fuzz from chapter-2 spots (see 60-chapter1-fuzz.mjs; shared body scripts/lib/fuzz.mjs): Pfad 2 grass, the
 * Flüsterwald entrance with rival 2 waiting, the forest trainers, Grete's gap, Seewil, Matti's house, the
 * Heilstation, Halle 2, and the Halle door with the badge (the chapter ending and the credits start). Random inputs,
 * then recovery to a free overworld or the title; no soft-locks, no runtime errors.
 * Env: FUZZ_SEEDS (default 6), FUZZ_FRAMES (default 3000).
 */
import { fuzzSpots } from '../lib/fuzz.mjs';

export const name = 'fuzz: random inputs from chapter 2 spots (incl. rival 2, Grete, the ending), no errors, always recoverable';

const SEEDS = Number(process.env.FUZZ_SEEDS ?? 6);
const FRAMES = Number(process.env.FUZZ_FRAMES ?? 3000);

/** chapter-2 state: Felsabzeichen, starter Lv 18 + two catches, items; `flags` = extra story flags, `badge` = Wellenabzeichen */
const state = (seed, flags = [], badge = false) => `
  g.newGame({ starter: ['sproessli', 'zuendli', 'biberli'][${seed} % 3], level: 18 });
  g.give('chaeferli', 9); g.give('laervli', 12);
  g.item('potion', 4); g.item('super_potion', 2); g.item('crystal', 6); g.item('antidote', 2); g.item('repel', 1);
  for (const f of ['got_starter', 'rival1_done', 'lab_greeted', 'gift_mom_potions', 'gift_kiesel_crystals', 'chapter1_cleared',
    ${flags.map((f) => JSON.stringify(f)).join(', ')}]) g.flag(f);
  g.state.badges.push('badge_earth'${badge ? ", 'badge_water'" : ''});
  g.state.money = 5000;
  g.state.lastHeal = { mapId: ${JSON.stringify(flags.includes('forest_cleared') ? 'seewil_center' : 'kiesel_center')}, x: 5, y: 3, facing: 'up' };
`;
const FOREST = ['rival2_done'];
const SEEWIL = ['rival2_done', 'forest_cleared'];

const SPOTS = [
  ['pfad_2', 8, 13, state(1)], // south-west grass, trainers on the path
  ['fluesterwald', 1, 21, state(2)], // rival 2 waits behind the entrance strip
  ['fluesterwald', 12, 14, state(3, FOREST)], // Ferdi, Knut, Jana around
  ['fluesterwald', 15, 7, state(4, FOREST)], // Grete's gap
  ['seewil', 13, 10, state(5, SEEWIL)],
  ['seewil_hall', 6, 14, state(6, SEEWIL)],
  ['seewil_house_1', 4, 6, state(7, SEEWIL)], // Matti's gift (nickname prompt)
  ['seewil_center', 5, 6, state(8, SEEWIL)],
  // back out of Halle 2 with the badge: the closing beat starts at once, then the credits and the title
  ['seewil', 22, 6, state(9, [...SEEWIL, 'trainer:hall2_sina', 'trainer:hall2_ruben', 'trainer:hall2_alois', 'trainer:leader_undine'], true)],
];

export async function run(h) {
  await fuzzSpots(h, SPOTS, { seeds: SEEDS, frames: FRAMES });
}
