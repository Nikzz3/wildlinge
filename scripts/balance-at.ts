/**
 * One story battle at fixed levels, per starter: the starter (evolved for its level, the last four moves of its
 * learnset) leads, optional backups ride along, 3 Arnikabalsam + 2 Enziantonika in the bag. Prints the win rate.
 * Rival ids take the battle name only (rival3 → rival3_<rival's starter>).
 * Usage: npx tsx scripts/balance-at.ts <trainerId> <starterLevel> [backups e.g. "leftover:20,guggerli:22"] [runs=300]
 *        ("leftover" = Matti's gift, the starter nobody picked)
 * Experiment hooks: PARTY / AI / ITEMS / LEARN env (see scripts/lib/sim.ts).
 */
import { createRng } from '../src/core/rng';
import { createCreature } from '../src/creature';
import { getSpecies } from '../src/data';
import { LEFTOVER_STARTER, type RivalBattle, rivalTrainerId } from '../src/data/trainers';
import { newGameState } from '../src/state';
import { STARTERS } from './lib/chapters';
import { trainerBattle } from './lib/sim';

const [id = 'leader_undine', lv = '20', backups = '', runs = '300'] = process.argv.slice(2);
const LEVEL = Number(lv);
const RUNS = Number(runs);

/** The species a creature of `species` has become by `level`. */
function evolved(species: string, level: number): string {
  let sp = getSpecies(species);
  while (sp.evolves && sp.evolves.level <= level) sp = getSpecies(sp.evolves.to);
  return sp.id;
}

const row = STARTERS.map((starter) => {
  let wins = 0;
  for (let run = 0; run < RUNS; run++) {
    const rng = createRng(5000 + run);
    const s = newGameState({ mapId: 'x', x: 0, y: 0, facing: 'down' });
    s.starter = starter;
    s.party = [createCreature(evolved(starter, LEVEL), LEVEL, rng, { uid: 1 })];
    for (const spec of backups.split(',').filter(Boolean)) {
      const [name = '', level = '5'] = spec.split(':');
      const species = name === 'leftover' ? LEFTOVER_STARTER[starter]! : name;
      s.party.push(createCreature(evolved(species, Number(level)), Number(level), rng, { uid: s.party.length + 1 }));
    }
    s.bag.super_potion = 3;
    s.bag.hyper_potion = 2;
    const trainer = /^rival\d$/.test(id) ? rivalTrainerId(id as RivalBattle, starter) : id;
    if (trainerBattle(s, trainer, rng) === 'win') wins++;
  }
  return `${starter} ${Math.round((wins / RUNS) * 100)}%`;
});
console.log(`${id} @Lv${LEVEL}${backups ? ` + ${backups}` : ''}: ${row.join(' · ')}`);
