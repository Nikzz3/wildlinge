/**
 * Chapters 1–4 balance check with the real battle engine. Each run plays chapters 1–3 like balance-ch3.ts and
 * continues with the same team through chapter 4: Pfad 4 (a catch, 4 trainers, wild battles), rival 3 at the Frostalp
 * entrance, a catch at Frostalp, Halle 4 (Anouk, Walter, Svea, Firna), the Gipfelpfad (a catch, Holger, Carla, the
 * rescuer's tea, Wilma, Rico, Sven, Bise 2) and the Gipfelhorn (Eisner, the flame heals, rival 4). Then Lindglut
 * (Lv 40, rested team) on copies of the run: fought to the end, and caught with the Gipfelkristalle in the bag instead
 * of the Urkristall (thrown once it is at half LP or less).
 * Prints first-attempt win rates @ the starter's level, the team's levels after rival 4, the Lindglut outcomes and the
 * catch chance per crystal.
 * Usage: npx tsx scripts/balance-ch4.ts [runs=200] [wildBattles=8]
 * Experiment hooks: PARTY / AI / ITEMS / LEARN env (see scripts/lib/sim.ts).
 */
import { createCreature } from '../src/creature';
import { getItem, getSpecies } from '../src/data';
import { chapter1, chapter2, chapter3, chapter4, newRun, STARTERS, teamLevels } from './lib/chapters';
import { fight, healParty, type Outcome, Tally } from './lib/sim';

const RUNS = Number(process.argv[2] ?? 200);
const WILD = Number(process.argv[3] ?? 8);
const LINDGLUT = 40;

const short = (id: string) => id.replace(/^(pfad4_|hall4_|leader_)/, '');
const pct = (n: number, of: number) => `${Math.round((n / of) * 100)}%`;

/** Chance that one crystal catches (four shake checks of rollCapture), for an LP fraction and a status bonus. */
function catchChance(catchRate: number, rate: number, hpFraction: number, bonus: number): number {
  const max = 300;
  const hp = Math.max(1, Math.round(max * hpFraction));
  const a = Math.max(1, Math.floor((((3 * max - 2 * hp) * catchRate * rate) / (3 * max)) * bonus));
  if (a >= 255) return 1;
  const b = Math.floor(1048560 / Math.floor(Math.sqrt(Math.floor(Math.sqrt(Math.floor(16711680 / a))))));
  return (b / 65536) ** 4;
}

console.log('--- first-attempt win rate @ the starter\'s level; end = levels after rival 4 (starter / the rest, highest first)');
for (const starter of STARTERS) {
  const t = new Tally();
  const end: number[][] = [];
  const legend: Record<Outcome, number> = { win: 0, lose: 0, run: 0, caught: 0, stuck: 0 };
  const caught: Record<Outcome, number> = { win: 0, lose: 0, run: 0, caught: 0, stuck: 0 };
  let ultra = 0;
  for (let run = 0; run < RUNS; run++) {
    const { s, rng } = newRun(starter, 3000 + run);
    chapter1(s, rng, new Tally(), { wild: 6, catch: true });
    chapter2(s, rng, new Tally(), { wild: WILD, catch: true });
    chapter3(s, rng, new Tally(), { wild: WILD, catch: true });
    chapter4(s, rng, t, { wild: WILD, catch: true });
    end.push(s.party.map((c) => c.level));
    healParty(s); // nothing heals after rival 4: a careful player walks back to the rescuer's tea first
    const a = structuredClone(s);
    legend[fight(a, { kind: 'wild', enemy: [createCreature('lindglut', LINDGLUT, rng)], canRun: true }, rng)]++;
    const b = structuredClone(s);
    ultra += b.bag.crystal_ultra ?? 0;
    const plan = { crystal: 'crystal_ultra', below: 0.5 };
    caught[fight(b, { kind: 'wild', enemy: [createCreature('lindglut', LINDGLUT, rng)], canRun: true }, rng, { catch: plan })]++;
  }
  console.log(`${starter.padEnd(10)} ${t.format(short).join(' · ')} · end Lv ${teamLevels(end)}`);
  const show = (r: Record<Outcome, number>) => `win ${pct(r.win, RUNS)} · caught ${pct(r.caught, RUNS)} · lose ${pct(r.lose, RUNS)}`;
  console.log(`${''.padEnd(10)} Lindglut Lv ${LINDGLUT} fought: ${show(legend)} | with ${(ultra / RUNS).toFixed(1)} Gipfelkristalle: ${show(caught)}`);
}

const { catchRate } = getSpecies('lindglut');
const rows = ['crystal_great', 'crystal_ultra'].map((id) => {
  const use = getItem(id).use;
  const rate = use.kind === 'crystal' ? use.rate : 1;
  const cells = [[1, 1], [0.5, 1], [0.1, 1], [0.1, 1.5], [0.1, 2]].map(([hp, bonus]) => `${(catchChance(catchRate, rate, hp!, bonus!) * 100).toFixed(1)}%`);
  return `${getItem(id).name.padEnd(14)} ${cells.join(' · ')}`;
});
console.log(`--- Lindglut (catch rate ${catchRate}) per crystal: full LP · half LP · 10% LP · 10% + paralysed/burnt/poisoned · 10% + asleep`);
for (const r of rows) console.log(r);
