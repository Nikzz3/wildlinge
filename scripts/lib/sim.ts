/**
 * Balance simulation with the real battle engine: a "normal player" fights with the same policy as the e2e
 * playthroughs (scripts/e2e/50-chapter1-full.mjs, 51-chapter2-full.mjs), so the win rates here predict them. The
 * additions for the later chapters (Lebensfunken, new coverage moves, bigger heal items) never trigger in chapters 1–2.
 *
 * Player policy: the starter leads; a fresh foe gets one status move (two tries; Brandmal only when the foe's
 * strongest attack is physical); a strong self boost (Kampfjodel) once while healthy; otherwise the best expected
 * damage. Heal items below 1/3 LP (the smallest that does the job). After a faint the healthy member with the best
 * move against the foe comes in; in a trainer battle a fainted member at least 3 levels above the fighter gets a
 * Lebensfunke (there are none in chapters 1–2). New moves per forgetFor(). Evolutions are accepted.
 *
 * Experiment hooks (env): PARTY='{"leader_jost":[["wuehli",11],["steimandli",12,["kieselkick","stupser"]]]}',
 * AI='{"leader_jost":"smart"}', ITEMS='{"leader_jost":["potion","potion"]}',
 * LEARN='{"sproessli":[[13,"saftzapfen"]]}' (moves an existing learnset move to a new level, or adds it),
 * TRACE=rival2 (prints the messages of every battle against a trainer id starting with it).
 */
import { createBattle } from '../../src/battle/engine';
import type { BattleEngine, BattleEvent, BattleSetup, PlayerAction } from '../../src/core/contracts';
import type { Rng } from '../../src/core/rng';
import type { Creature, SaveData, TrainerDef } from '../../src/core/types';
import { calcStats, createCreature, evolutionTarget, evolve, healCreature, movesLearnedAt, replaceMove, tryAddMove } from '../../src/creature';
import { getItem, getMove, getSpecies, getTrainer, typeEffectiveness } from '../../src/data';
import { ENCOUNTERS } from '../../src/data/encounters';
import { addCreature, nextUid } from '../../src/state';

for (const [id, party] of Object.entries((JSON.parse(process.env.PARTY || '{}') ?? {}) as Record<string, [string, number, string[]?][]>)) {
  getTrainer(id).party = party.map(([species, level, moves]) => (moves ? { species, level, moves } : { species, level }));
}
for (const [id, ai] of Object.entries((JSON.parse(process.env.AI || '{}') ?? {}) as Record<string, TrainerDef['ai']>)) getTrainer(id).ai = ai;
for (const [id, items] of Object.entries((JSON.parse(process.env.ITEMS || '{}') ?? {}) as Record<string, string[]>)) getTrainer(id).items = items;
for (const [id, entries] of Object.entries((JSON.parse(process.env.LEARN || '{}') ?? {}) as Record<string, [number, string][]>)) {
  const sp = getSpecies(id);
  const rest = sp.learnset.filter((e) => !entries.some(([, move]) => move === e.move));
  sp.learnset = [...rest, ...entries.map(([level, move]) => ({ level, move }))].sort((a, b) => a.level - b.level);
}

export const VERBOSE = !!process.env.V;

const maxHp = (c: Creature) => calcStats(c).hp;
const isPlainStat = (id: string) => getMove(id).category === 'status' && !getMove(id).effects?.some((e) => e.kind === 'status');
const inflicts = (id: string) => getMove(id).category === 'status' && !!getMove(id).effects?.some((e) => e.kind === 'status');

/** Expected damage score of a move against the foe (0 for status moves / no EN). */
export function score(user: Creature, foe: Creature, slot: { id: string; pp: number }): number {
  const m = getMove(slot.id);
  if (m.category === 'status' || slot.pp <= 0) return 0;
  const us = calcStats(user);
  const them = calcStats(foe);
  const [a, d] = m.category === 'physical' ? [us.atk, them.def] : [us.mag, them.res];
  const stab = getSpecies(user.species).types.includes(m.type) ? 1.5 : 1;
  const eff = typeEffectiveness(m.type, getSpecies(foe.species).types);
  const hits = m.multiHit ? (m.multiHit[0] + m.multiHit[1]) / 2 : 1;
  return m.power * hits * (a / d) * stab * eff * ((m.accuracy || 100) / 100);
}

const bestScore = (user: Creature, foe: Creature) => Math.max(0, ...user.moves.map((m) => score(user, foe, m)));

/** Heal item for a creature that lost `missing` LP: the smallest that covers it, else the biggest there is. */
function healItem(s: SaveData, missing: number): string | null {
  const have = ['potion', 'super_potion', 'hyper_potion', 'full_potion'].filter((id) => (s.bag[id] ?? 0) > 0);
  const enough = have.find((id) => {
    const use = getItem(id).use;
    return use.kind === 'heal' && use.hp !== 'full' && use.hp >= missing * 0.6;
  });
  return enough ?? have[have.length - 1] ?? null;
}

/** Burn only pays off when the foe's strongest attack on me is physical; sleep, paralysis and poison always do. */
export function worthInflicting(moveId: string, foe: Creature, me: Creature): boolean {
  if (!getMove(moveId).effects?.some((e) => e.kind === 'status' && e.status === 'burn')) return true;
  const st = calcStats(foe);
  let best = { value: 0, physical: false };
  for (const slot of foe.moves) {
    const m = getMove(slot.id);
    if (m.category === 'status') continue;
    const stat = m.category === 'physical' ? st.atk : st.mag;
    const value = moveValue(foe, slot.id) * stat * typeEffectiveness(m.type, getSpecies(me.species).types);
    if (value > best.value) best = { value, physical: m.category === 'physical' };
  }
  return best.physical;
}

function choose(b: BattleEngine, s: SaveData, tries: Map<Creature, number>): PlayerAction {
  const me = s.party[b.playerActive]!;
  const foe = b.setup.enemy[b.enemyActive]!;
  const item = me.hp < maxHp(me) / 3 ? healItem(s, maxHp(me) - me.hp) : null;
  if (item) {
    const heal: PlayerAction = { kind: 'item', itemId: item, partyIndex: b.playerActive };
    if (!b.validate(heal)) return heal;
  }
  // a Lebensfunke for a fainted member clearly stronger than the one fighting (it comes back after the next faint)
  const fallen = s.party.filter((c) => c.hp <= 0).reduce<Creature | null>((a, c) => (!a || c.level > a.level ? c : a), null);
  if (b.setup.kind === 'trainer' && fallen && fallen.level >= me.level + 3 && (s.bag.revive ?? 0) > 0) {
    return { kind: 'item', itemId: 'revive', partyIndex: s.party.indexOf(fallen) };
  }
  if (b.setup.kind === 'wild' && catching && (s.bag[catching.crystal] ?? 0) > 0 && foe.hp <= maxHp(foe) * catching.below) {
    return { kind: 'item', itemId: catching.crystal };
  }
  // status the foe first (Brandmal only against a physical attacker), two tries per foe
  const status = me.moves.findIndex((m) => m.pp > 0 && inflicts(m.id) && worthInflicting(m.id, foe, me));
  const tried = tries.get(foe) ?? 0;
  if (status >= 0 && foe.status === null && foe.hp > maxHp(foe) / 3 && tried < 2) {
    tries.set(foe, tried + 1);
    return { kind: 'move', index: status };
  }
  // set up once per foe with a strong self boost (e.g. Kampfjodel) while healthy
  const boost = me.moves.findIndex((m) => m.pp > 0 && getMove(m.id).effects?.some((e) => e.kind === 'stat' && e.who === 'self' && e.stat === 'atk' && e.stages >= 2));
  if (boost >= 0 && b.stages('player').atk < 2 && me.hp > maxHp(me) / 2 && foe.hp > maxHp(foe) / 2) return { kind: 'move', index: boost };
  let best = 0;
  let top = -1;
  me.moves.forEach((slot, i) => {
    const sc = score(me, foe, slot);
    if (sc > top) [best, top] = [i, sc];
  });
  return { kind: 'move', index: best };
}

/** Value of a known damaging move for the forget rule. */
function moveValue(c: Creature, id: string): number {
  const m = getMove(id);
  const hits = m.multiHit ? (m.multiHit[0] + m.multiHit[1]) / 2 : 1;
  return m.power * hits * (getSpecies(c.species).types.includes(m.type) ? 1.5 : 1) * ((m.accuracy || 100) / 100);
}

/**
 * Slot to forget for a new move, or null to skip it. A damaging move replaces a plain stat move (Brummbass,
 * Frechgrinsen) first, else a weaker move of the same type (an upgrade), else a weaker plain Normal move without
 * STAB (Stupser gives way to new coverage), else – for a type it has no move of yet – a weaker move whose type is
 * covered twice. A status-inflicting move (Mohnduft) only replaces a plain stat move.
 */
export function forgetFor(c: Creature, moveId: string): number | null {
  const learn = getMove(moveId);
  const plain = c.moves.findIndex((m) => isPlainStat(m.id));
  if (learn.category === 'status') return inflicts(moveId) && plain >= 0 ? plain : null;
  if (plain >= 0) return plain;
  const value = moveValue(c, moveId);
  const weakest = (pick: (id: string) => boolean): number => {
    let at = -1;
    c.moves.forEach((m, i) => {
      if (getMove(m.id).category !== 'status' && pick(m.id) && moveValue(c, m.id) <= value && (at < 0 || moveValue(c, m.id) < moveValue(c, c.moves[at]!.id))) at = i;
    });
    return at;
  };
  const upgrade = weakest((id) => getMove(id).type === learn.type);
  if (upgrade >= 0) return upgrade;
  const filler = weakest((id) => getMove(id).type === 'normal' && !getSpecies(c.species).types.includes('normal'));
  if (filler >= 0) return filler;
  // new coverage (e.g. Stahlschnitt for a water creature) replaces a weaker move whose type another move still covers
  const types = c.moves.map((m) => getMove(m.id).type);
  if (types.includes(learn.type)) return null;
  const twice = (id: string) => types.filter((t) => t === getMove(id).type).length >= 2;
  const redundant = weakest(twice);
  return redundant >= 0 ? redundant : null;
}

/** Crystals are thrown once the foe's LP fraction is at most `below` (1 = right away). */
export interface CatchPlan {
  crystal: string;
  below: number;
}

let catching: CatchPlan | null = null;

export type Outcome = 'win' | 'lose' | 'run' | 'caught' | 'stuck';

/** One battle to the end. Evolutions afterwards; a caught creature joins the party. */
export function fight(
  s: SaveData,
  setup: Omit<BattleSetup, 'background'>,
  rng: Rng,
  opts: { catch?: boolean | CatchPlan; swapOut?: boolean } = {},
): Outcome {
  catching = opts.catch === true ? { crystal: 'crystal', below: 1 } : opts.catch || null;
  const b = createBattle(s, { ...setup, background: 'grass' }, rng);
  const tries = new Map<Creature, number>();
  const trace = !!process.env.TRACE && setup.trainer?.id.startsWith(process.env.TRACE);
  const show = (events: BattleEvent[]) => {
    if (!trace) return;
    for (const e of events) {
      if (e.t === 'msg' && !/ERF-Punkte/.test(e.text)) console.log(`    ${e.text}`);
      else if (e.t === 'hp') console.log(`      ${e.side} ${e.from} → ${e.to}/${e.max}`);
    }
  };
  if (trace) console.log(`  ${s.party.map((c) => `${c.species}${c.level} [${c.moves.map((m) => m.id).join(',')}]`).join(' · ')}`);
  show(b.start());
  for (let guard = 0; b.prompt.kind !== 'done' && guard < 600; guard++) {
    const p = b.prompt;
    if (p.kind === 'action' && opts.swapOut && guard === 0) show(b.act(swapOut(b, s, tries)));
    else if (p.kind === 'action') show(b.act(choose(b, s, tries)));
    else if (p.kind === 'switch') show(b.switchTo(bestSwitch(s, b.setup.enemy[b.enemyActive]!)));
    else if (p.kind === 'learn') show(b.learn(forgetFor(s.party[p.partyIndex]!, p.moveId)));
  }
  catching = null;
  const outcome: Outcome = b.prompt.kind === 'done' ? b.prompt.outcome : 'stuck';
  if (outcome === 'caught') {
    const c = setup.enemy[0]!;
    c.uid = nextUid(s);
    addCreature(s, c);
  }
  for (const uid of b.leveledUp) {
    const c = s.party.find((m) => m.uid === uid);
    const to = c && c.hp > 0 ? evolutionTarget(c) : null;
    if (!c || !to) continue;
    evolve(c, to);
    for (const move of movesLearnedAt(to, c.level)) {
      if (c.moves.some((m) => m.id === move) || tryAddMove(c, move)) continue;
      const forget = forgetFor(c, move);
      if (forget !== null) replaceMove(c, forget, move);
    }
  }
  if (VERBOSE) {
    const foes = setup.enemy.map((e) => `${e.species}${e.level}`).join('+');
    const team = s.party.map((c) => `${c.species}${c.level}(${c.hp}/${maxHp(c)})`).join(' ');
    console.log(`  ${setup.trainer?.id ?? 'wild'} ${foes}: ${outcome} → ${team} bag ${JSON.stringify(s.bag)}`);
  }
  return outcome;
}

/**
 * Switch training: a lead more than 3 levels below the foe makes way for the strongest member at once; it still
 * shares the EXP (every participant gets the full amount).
 */
function swapOut(b: BattleEngine, s: SaveData, tries: Map<Creature, number>): PlayerAction {
  const me = s.party[b.playerActive]!;
  const foe = b.setup.enemy[b.enemyActive]!;
  let top = b.playerActive;
  s.party.forEach((c, i) => {
    if (c.hp > 0 && c.level > s.party[top]!.level) top = i;
  });
  if (me.level >= foe.level - 3 || top === b.playerActive) return choose(b, s, tries);
  return { kind: 'switch', partyIndex: top };
}

/** Healthy member with the best move against the foe. */
function bestSwitch(s: SaveData, foe: Creature): number {
  let best = -1;
  s.party.forEach((c, i) => {
    if (c.hp > 0 && (best < 0 || bestScore(c, foe) > bestScore(s.party[best]!, foe))) best = i;
  });
  return best;
}

export function healParty(s: SaveData): void {
  s.party.forEach(healCreature);
}

/**
 * Before a trainer: statuses are cured (Entgifter & co.), heal items from the bag until the lead is above 60 %; a
 * fainted team member or a still weak lead means walking back to the Heilstation (or Mutter).
 */
export function fieldHeal(s: SaveData): void {
  const lead = s.party[0]!;
  for (const c of s.party) if (c.hp > 0 && c.status) [c.status, c.statusTurns] = [null, 0]; // Entgifter & co.
  for (let i = 0; i < 6 && lead.hp > 0 && lead.hp < maxHp(lead) * 0.6; i++) {
    const id = healItem(s, maxHp(lead) - lead.hp);
    if (!id) break;
    const use = getItem(id).use;
    s.bag[id]! -= 1;
    if (use.kind === 'heal') lead.hp = use.hp === 'full' ? maxHp(lead) : Math.min(maxHp(lead), lead.hp + use.hp);
  }
  if (lead.hp < maxHp(lead) * 0.4 || s.party.some((c) => c.hp === 0)) healParty(s);
}

/** Buys heal items up to the wanted counts while the money lasts. */
export function shop(s: SaveData, wants: readonly [string, number][]): void {
  for (const [id, upTo] of wants) {
    const price = getItem(id).price;
    while ((s.bag[id] ?? 0) < upTo && s.money >= price) {
      s.money -= price;
      s.bag[id] = (s.bag[id] ?? 0) + 1;
    }
  }
}

export function trainerParty(id: string, rng: Rng): Creature[] {
  return getTrainer(id).party.map((m) => createCreature(m.species, m.level, rng, { moves: m.moves }));
}

/** Trainer battle (the lead is the starter); a loss blacks out (full heal). */
export function trainerBattle(s: SaveData, id: string, rng: Rng, allowLoss = false): Outcome {
  const outcome = fight(s, { kind: 'trainer', enemy: trainerParty(id, rng), trainer: getTrainer(id), allowLoss }, rng);
  if (outcome === 'lose') healParty(s);
  return outcome;
}

/**
 * A random wild encounter of the map; a loss blacks out. `train`: the lowest-level healthy member leads (a player
 * levelling a new catch; if it is far below the foe it is switched out for the strongest at once), the party order
 * is restored afterwards.
 */
export function wildBattle(s: SaveData, mapId: string, rng: Rng, opts: { catch?: boolean; train?: boolean } = {}): Outcome {
  const tables = ENCOUNTERS[mapId];
  const table = tables?.grass ?? tables?.cave;
  if (!table) throw new Error(`wildBattle: no encounters on ${mapId}`);
  const total = table.slots.reduce((n, sl) => n + sl.weight, 0);
  let r = rng.int(1, total);
  const slot = table.slots.find((sl) => (r -= sl.weight) <= 0)!;
  const enemy = [createCreature(slot.species, rng.int(slot.minLevel, slot.maxLevel), rng)];
  const order = [...s.party];
  if (opts.train) {
    const healthy = s.party.filter((c) => c.hp > 0);
    const weakest = healthy.reduce((a, c) => (c.level < a.level ? c : a), healthy[0]!);
    s.party = [weakest, ...s.party.filter((c) => c !== weakest)];
  }
  const outcome = fight(s, { kind: 'wild', enemy }, rng, { catch: opts.catch, swapOut: opts.train });
  s.party = [...order.filter((c) => s.party.includes(c)), ...s.party.filter((c) => !order.includes(c))];
  if (outcome === 'lose') healParty(s);
  return outcome;
}

/** Per-battle log: first-attempt wins and the party levels at the first attempt. */
export class Tally {
  readonly rows = new Map<string, { wins: number; tries: number; levels: number[][] }>();

  /** Fights trainer `id`; on a first-attempt loss the player heals and retries (up to `retries` times). */
  battle(s: SaveData, id: string, rng: Rng, opts: { key?: string; allowLoss?: boolean; retries?: number; prepare?: () => void } = {}): boolean {
    const key = opts.key ?? id;
    const row = this.rows.get(key) ?? { wins: 0, tries: 0, levels: [] };
    this.rows.set(key, row);
    row.tries++;
    row.levels.push(s.party.map((c) => c.level));
    let won = trainerBattle(s, id, rng, opts.allowLoss) === 'win';
    if (won) row.wins++;
    for (let i = 0; !won && !opts.allowLoss && i < (opts.retries ?? 3); i++) {
      opts.prepare?.();
      won = trainerBattle(s, id, rng) === 'win';
    }
    return won;
  }

  /** "name 85% @12.3" per battle: the lead's average level at the first attempt (`members` > 1: "/" + the others'). */
  format(rename: (id: string) => string = (id) => id, members = 1): string[] {
    return [...this.rows].map(([id, r]) => {
      const avg = (i: number) => {
        const ls = r.levels.map((l) => l[i]).filter((l): l is number => l !== undefined);
        return ls.length ? (ls.reduce((a, b) => a + b, 0) / ls.length).toFixed(1) : '-';
      };
      const lv = [avg(0), ...Array.from({ length: members - 1 }, (_, i) => avg(i + 1))].join('/');
      return `${rename(id)} ${Math.round((r.wins / r.tries) * 100)}% @${lv}`;
    });
  }
}

export function newCreature(s: SaveData, species: string, level: number, rng: Rng): Creature {
  return createCreature(species, level, rng, { uid: nextUid(s) });
}
