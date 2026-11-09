/**
 * Chapters 1 + 2 balance check with the real battle engine. Each run plays chapter 1 like a normal player
 * (scripts/lib/chapters.ts: starter leads, a Pfad-1 catch rides along) and continues with the same team through
 * chapter 2: Pfad 2 (4 trainers + wild battles), Flüsterwald (rival 2, a catch, 3 trainers, Knut, Grete), Seewil
 * (Matti's gift) and Halle 2 (Sina, Ruben, Alois, Undine). Prints first-attempt win rates and the party's levels.
 * Usage: npx tsx scripts/balance-ch2.ts [runs=200] [wildBattles=8]   (wildBattles per area; chapter 1 uses 6)
 * Experiment hooks: PARTY / AI / ITEMS / LEARN env (see scripts/lib/sim.ts).
 */
import { chapter1, chapter2, newRun, STARTERS } from './lib/chapters';
import { Tally } from './lib/sim';

const RUNS = Number(process.argv[2] ?? 200);
const WILD = Number(process.argv[3] ?? 8);

const short = (id: string) => id.replace(/^(pfad2_|wald_|hall2_|leader_)/, '').replace('grunt_wald_1', 'knut');

console.log('--- first-attempt win rate @ level of the lead at the first attempt; end = levels after Undine (starter/Pfad-1 catch/forest catch/gift)');
for (const starter of STARTERS) {
  const t = new Tally();
  const end: number[][] = [];
  for (let run = 0; run < RUNS; run++) {
    const { s, rng } = newRun(starter, 3000 + run);
    chapter1(s, rng, new Tally(), { wild: 6, catch: true });
    chapter2(s, rng, t, { wild: WILD, catch: true });
    end.push(s.party.map((c) => c.level));
  }
  const lv = (i: number) => (end.reduce((a, l) => a + (l[i] ?? 0), 0) / end.filter((l) => l[i] !== undefined).length).toFixed(1);
  console.log(`${starter.padEnd(10)} ${t.format(short).join(' · ')} · end Lv ${[0, 1, 2, 3].map(lv).join('/')}`);
}
