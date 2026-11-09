/**
 * Chapters 1–3 balance check with the real battle engine. Each run plays chapters 1 and 2 like balance-ch2.ts and
 * continues with the same team through chapter 3: Pfad 3 (a catch, 5 trainers, wild battles), the Glimmerhöhle (a
 * catch, Godi, Lars, Fredi, Petra), the Funkenwerk (Udo, Rita, Egon, Bise 1), Anton's Guggerli and Halle 3 (Jola,
 * Max, Ben, Zita). The starter leads every fight (like the e2e playthroughs); the catches ride along.
 * Prints first-attempt win rates @ the starter's level, and the levels after Zita (starter / the rest of the party).
 * Usage: npx tsx scripts/balance-ch3.ts [runs=200] [wildBattles=8]   (wild battles per stretch, as in balance-ch2.ts)
 * Experiment hooks: PARTY / AI / ITEMS / LEARN env (see scripts/lib/sim.ts).
 */
import { chapter1, chapter2, chapter3, newRun, STARTERS, teamLevels } from './lib/chapters';
import { Tally } from './lib/sim';

const RUNS = Number(process.argv[2] ?? 200);
const WILD = Number(process.argv[3] ?? 8);

const short = (id: string) => id.replace(/^(pfad3_|hall3_|leader_)/, '');

console.log('--- first-attempt win rate @ the starter\'s level; end = levels after Zita (starter / the rest, highest first)');
for (const starter of STARTERS) {
  const t = new Tally();
  const end: number[][] = [];
  for (let run = 0; run < RUNS; run++) {
    const { s, rng } = newRun(starter, 3000 + run);
    chapter1(s, rng, new Tally(), { wild: 6, catch: true });
    chapter2(s, rng, new Tally(), { wild: WILD, catch: true });
    chapter3(s, rng, t, { wild: WILD, catch: true });
    end.push(s.party.map((c) => c.level));
  }
  console.log(`${starter.padEnd(10)} ${t.format(short).join(' · ')} · end Lv ${teamLevels(end)}`);
}
