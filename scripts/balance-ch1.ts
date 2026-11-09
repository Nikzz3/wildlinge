/**
 * Chapter 1 balance check with the real battle engine: a "normal player" (scripts/lib/sim.ts) plays rival 1 →
 * Pfad 1 (wild battles + 3 trainers) → Halle 1 with only the starter, per starter and seed. Prints first-attempt
 * win rates and the levels per battle. A second block catches a Chäferli on Pfad 1 and trains it first (TRAIN=10).
 * Usage: npx tsx scripts/balance-ch1.ts [runs=200] [wildBattles=6]
 *        npx tsx scripts/balance-ch1.ts --at leader_jost 11     (one battle at a fixed level; MOVES=a,b,c optional)
 * Experiment hooks: PARTY / AI / ITEMS / LEARN env (see scripts/lib/sim.ts).
 */
import { createRng } from '../src/core/rng';
import { createCreature } from '../src/creature';
import { newGameState } from '../src/state';
import { chapter1, newRun, STARTERS } from './lib/chapters';
import { Tally, trainerBattle } from './lib/sim';

const AT = process.argv[2] === '--at' ? { id: process.argv[3] ?? 'leader_jost', level: Number(process.argv[4] ?? 11) } : null;
const RUNS = AT ? 300 : Number(process.argv[2] ?? 200);
const WILD = Number(process.argv[3] ?? 6);

const pct = (n: number) => `${Math.round((n / RUNS) * 100)}%`;
const short = (id: string) => id.replace(/^(pfad1_|hall1_|leader_)/, '');

if (AT) {
  const row = STARTERS.map((starter) => {
    let wins = 0;
    for (let run = 0; run < RUNS; run++) {
      const rng = createRng(5000 + run);
      const s = newGameState({ mapId: 'x', x: 0, y: 0, facing: 'down' });
      s.party = [createCreature(starter, AT.level, rng, { uid: 1, moves: process.env.MOVES?.split(',') })];
      s.bag.potion = 3;
      if (trainerBattle(s, AT.id, rng) === 'win') wins++;
    }
    return `${starter} ${pct(wins)}`;
  });
  console.log(`${AT.id} @Lv${AT.level}: ${row.join(' · ')}`);
} else {
  const TRAIN = Number(process.env.TRAIN ?? 10);
  for (const caught of [false, 'chaeferli'] as const) {
    console.log(caught ? `--- + Chäferli caught on Pfad 1, trained to Lv ${TRAIN} (levels: starter/Chäferli)` : '--- starter only');
    for (const starter of STARTERS) {
      const t = new Tally();
      let grind = 0;
      for (let run = 0; run < RUNS; run++) {
        const { s, rng } = newRun(starter, 1000 + run);
        grind += chapter1(s, rng, t, { wild: WILD, catch: caught, trainTo: caught ? TRAIN : undefined });
      }
      const extra = caught ? ` · +${(grind / RUNS).toFixed(1)} training battles` : '';
      console.log(`${starter.padEnd(10)} ${t.format(short, caught ? 2 : 1).join(' · ')}${extra}`);
    }
  }
}
