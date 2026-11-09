/**
 * Fuzz from chapter-3/4 spots (see 60-chapter1-fuzz.mjs; shared body scripts/lib/fuzz.mjs): Pfad 3, the Glimmerhöhle
 * and Petra's corridor, Funkenstadt (Halle still shut, north gate), the Funkenwerk with Bise, Anton's gift (nickname
 * prompt), Halle 3, Pfad 4, the Frostalp entrance with rival 3, Halle 4, Bise's pass on the Gipfelpfad, the summit
 * strip (Eisner, then the final rival), Lindglut at the flame (the ending: credits, then the title) and the Gasthaus
 * after the ending. Random inputs, then recovery to a free overworld or the title; no soft-locks, no runtime errors.
 * Env: FUZZ_SEEDS (default 28: every spot twice), FUZZ_FRAMES (default 3000).
 */
import { fuzzSpots } from '../lib/fuzz.mjs';

export const name = 'fuzz: random inputs from chapter 3–4 spots (incl. Petra, Bise, rival 3, the summit, Lindglut, the ending), no errors, always recoverable';

const SEEDS = Number(process.env.FUZZ_SEEDS ?? 28);
const FRAMES = Number(process.env.FUZZ_FRAMES ?? 3000);

const STORY = [
  'got_starter', 'rival1_done', 'lab_greeted', 'gift_mom_potions', 'gift_kiesel_crystals', 'chapter1_cleared',
  'rival2_done', 'forest_cleared', 'gift_ranger_potions', 'gift_starter', 'chapter2_cleared',
];
const AREA3 = ['cave_cleared', 'werk_cleared', 'gift_guggerli'];
const AREA4 = ['rival3_done', 'gift_arven_crystals', 'gift_frostalp_candy', 'gipfelpfad_cleared'];

/**
 * A team for the spot: the evolved starter at `level`, three catches a few levels below, items, money; `flags` = story
 * flags beyond chapter 2, `badges` = how many badges, `heal` = lastHeal map.
 */
const state = (seed, { level, flags = [], badges = 2, heal = 'seewil_center' }) => `{
  const D = g.data;
  const evolved = (id, lv) => { let sp = D.getSpecies(id); while (sp.evolves && sp.evolves.level <= lv) sp = D.getSpecies(sp.evolves.to); return sp.id; };
  const starter = ['sproessli', 'zuendli', 'biberli'][${seed} % 3];
  g.newGame({ name: 'Kai' });
  const s = g.state;
  s.starter = starter;
  g.give(evolved(starter, ${level}), ${level});
  g.give(evolved('zwitschli', ${level - 4}), ${level - 4}); g.give('stachli', ${level - 6}); g.give(evolved('farnli', ${level - 8}), ${level - 8});
  g.item('super_potion', 3); g.item('hyper_potion', 2); g.item('revive', 1); g.item('crystal', 5); g.item('crystal_great', 2);
  for (const f of [...${JSON.stringify(STORY)}, ...${JSON.stringify(flags)}]) g.flag(f);
  s.badges.push(...['badge_earth', 'badge_water', 'badge_spark', 'badge_frost'].slice(0, ${badges}));
  s.money = 8000;
  s.lastHeal = { mapId: ${JSON.stringify(heal)}, x: 5, y: 3, facing: 'up' };
}`;

const SPOTS = [
  ['pfad_3', 10, 23, state(1, { level: 23 })], // the bridge, Heidi and Nora around, grass on both sides
  ['glimmerhoehle_1', 6, 21, state(2, { level: 25 })], // cave encounters, Godi's tunnel
  ['glimmerhoehle_2', 17, 6, state(3, { level: 26 })], // Petra's corridor (blockade scene)
  ['funkenstadt', 5, 10, state(4, { level: 27, flags: ['cave_cleared'], heal: 'funken_center' })], // Halle shut, north gate
  ['funken_werk', 6, 8, state(5, { level: 28, flags: ['cave_cleared'], heal: 'funken_center' })], // grunts, Bise, Zita
  ['funken_house_1', 4, 6, state(6, { level: 28, flags: ['cave_cleared', 'werk_cleared'], heal: 'funken_center' })], // Anton's gift
  ['funken_hall', 6, 14, state(7, { level: 30, flags: ['cave_cleared', 'werk_cleared'], heal: 'funken_center' })],
  ['pfad_4', 10, 40, state(8, { level: 31, flags: AREA3, badges: 3, heal: 'funken_center' })],
  ['frostalp', 12, 21, state(9, { level: 32, flags: AREA3, badges: 3, heal: 'funken_center' })], // rival 3 at the entrance
  ['frostalp_hall', 6, 14, state(10, { level: 34, flags: [...AREA3, 'rival3_done'], badges: 3, heal: 'frostalp_center' })],
  ['gipfelpfad', 11, 8, state(11, { level: 37, flags: [...AREA3, 'rival3_done'], badges: 4, heal: 'frostalp_center' })], // Bise's pass
  ['gipfelhorn', 10, 12, state(12, { level: 39, flags: [...AREA3, ...AREA4], badges: 4, heal: 'frostalp_center' })], // the summit strip
  // Lindglut at the flame: the ending (credits, the title) or a rematch
  ['gipfelhorn', 10, 5, state(13, { level: 40, flags: [...AREA3, ...AREA4, 'boss_done', 'eisner_met', 'rival4_met', 'rival4_done'], badges: 4, heal: 'frostalp_center' })],
  ['frostalp_house_1', 4, 6, state(14, { level: 40, flags: [...AREA3, ...AREA4, 'boss_done', 'rival4_done', 'lindglut_done', 'game_cleared'], badges: 4, heal: 'frostalp_center' })],
];

export async function run(h) {
  await fuzzSpots(h, SPOTS, { seeds: SEEDS, frames: FRAMES });
}
