/**
 * Fuzz: from a mid-chapter-1 state, random inputs (mostly directions + A, some B / START / SELECT) for a few
 * thousand frames per seed and start spot. Afterwards a recovery phase (A through messages and battles, B out
 * of menus, START in the name entry) must reach a free overworld or the title again: no soft-locks, and no
 * runtime errors (checked by the runner). Env: FUZZ_SEEDS (default 4), FUZZ_FRAMES (default 3000).
 * Chapter-2 spots: 61-chapter2-fuzz.mjs (shared body: scripts/lib/fuzz.mjs).
 */
import { fuzzSpots } from '../lib/fuzz.mjs';

export const name = 'fuzz: random inputs from chapter 1 spots, no errors, always recoverable';

const SEEDS = Number(process.env.FUZZ_SEEDS ?? 4);
const FRAMES = Number(process.env.FUZZ_FRAMES ?? 3000);

/** chapter-1 state: starter + a caught Chäferli, some items, story flags up to Pfad 1 */
const state = (seed) => `
  g.newGame({ starter: ['sproessli', 'zuendli', 'biberli'][${seed} % 3], level: 9 });
  g.give('chaeferli', 6);
  g.item('potion', 4); g.item('crystal', 5); g.item('antidote', 1); g.item('candy', 1);
  for (const f of ['got_starter', 'rival1_done', 'lab_greeted', 'gift_mom_potions']) g.flag(f);
  g.state.lastHeal = { mapId: 'kiesel_center', x: 5, y: 3, facing: 'up' };
`;

const SPOTS = [
  ['pfad_1', 5, 24], // west grass
  ['kieselstadt', 11, 12],
  ['kiesel_hall', 5, 12],
  ['moosbach', 9, 8],
  ['pfad_1', 10, 30],
  ['kiesel_center', 5, 6],
].map(([map, x, y], i) => [map, x, y, state(i + 1)]);

export async function run(h) {
  await fuzzSpots(h, SPOTS, { seeds: SEEDS, frames: FRAMES });
}
