import { describe, expect, it } from 'vitest';
import { createBattle } from '../src/battle/engine';
import { accuracyMultiplier, calcDamage, type DamageInput, rollCapture, stageMultiplier, staged } from '../src/battle/logic/calc';
import { type Ctx, createCtx, sendOut } from '../src/battle/logic/context';
import { STRUGGLE, useMove } from '../src/battle/logic/moves';
import { canInflict, effectiveSpeed } from '../src/battle/logic/status';
import type { BattleEngine, BattleEvent, BattleSetup, PlayerAction, Side } from '../src/core/contracts';
import { createRng, type Rng } from '../src/core/rng';
import type { Creature, ItemDef, MoveDef, SaveData, SpeciesDef, StatusId, TrainerDef, TypeId } from '../src/core/types';
import { calcStats, createCreature, displayName, expForLevel, maxHp } from '../src/creature';
import { getMove, getSpecies, ITEMS, MOVES, SPECIES, typeEffectiveness } from '../src/data';
import { newGameState } from '../src/state';

// --- fixtures (picked by property, not by id) ------------------------------------------------

let nextUid = 1;
function mon(species: string, level: number, moves: string[], hp?: number): Creature {
  const c = createCreature(species, level, createRng(level * 31 + nextUid), { moves, uid: nextUid++ });
  if (hp !== undefined) c.hp = hp;
  return c;
}

function stateWith(...party: Creature[]): SaveData {
  const s = newGameState({ mapId: 'test', x: 0, y: 0, facing: 'down' });
  s.party = party;
  return s;
}

const wild = (enemy: Creature, extra: Partial<BattleSetup> = {}): BattleSetup => ({
  kind: 'wild', enemy: [enemy], background: 'grass', ...extra,
});

function trainerDef(extra: Partial<TrainerDef> = {}): TrainerDef {
  return {
    id: 'test', className: 'Wanderer', name: 'Hans', sprite: 'hiker', party: [], reward: 240,
    intro: 'Hallo!', defeat: 'Uff, du bist stark!', after: 'Gut gemacht.', ai: 'basic', ...extra,
  };
}

const trainerSetup = (enemy: Creature[], trainer = trainerDef()): BattleSetup => ({
  kind: 'trainer', enemy, trainer, background: 'grass',
});

const LABEL = 'Wanderer Hans';
const wildName = (c: Creature) => `Wildes ${displayName(c)}`;

const texts = (events: readonly BattleEvent[]): string[] =>
  events.flatMap((e) => (e.t === 'msg' ? [e.text] : []));

const ofType = <T extends BattleEvent['t']>(events: readonly BattleEvent[], t: T) =>
  events.filter((e): e is Extract<BattleEvent, { t: T }> => e.t === t);

/** Answers prompts until the battle ends: actions via `pick`, switches with the first healthy, learns nothing. */
function playOn(b: BattleEngine, state: SaveData, events: BattleEvent[], pick = (): PlayerAction => ({ kind: 'move', index: 0 })) {
  for (let guard = 0; b.prompt.kind !== 'done'; guard++) {
    if (guard > 200) throw new Error('battle did not end');
    const p = b.prompt;
    if (p.kind === 'action') events.push(...b.act(pick()));
    else if (p.kind === 'switch') events.push(...b.switchTo(state.party.findIndex((c) => c.hp > 0)));
    else if (p.kind === 'learn') events.push(...b.learn(null));
  }
  return events;
}

const play = (b: BattleEngine, state: SaveData, pick?: () => PlayerAction) => playOn(b, state, b.start(), pick);

/** Rng whose next() is always `value`: < 1/16 forces crits, < 1/4 full paralysis, ≈ 1 failed escapes/throws. */
function fixedRng(value: number): Rng {
  return {
    ...createRng(0),
    next: () => value,
    int: (min, max) => min + Math.floor(value * (max - min + 1)),
    chance: (p) => value < p,
    pick: (items) => items[Math.floor(value * items.length)]!,
  };
}

/** Both creatures on the field, events cleared — for driving single moves with useMove. */
function duel(player: Creature, enemy: Creature, rng: Rng = createRng(1)): Ctx {
  const ctx = createCtx(stateWith(player), wild(enemy), rng);
  sendOut(ctx, 'enemy', 0, '');
  sendOut(ctx, 'player', 0, '');
  ctx.events.splice(0);
  return ctx;
}

const hpLost = (events: readonly BattleEvent[], side: Side) =>
  ofType(events, 'hp').filter((e) => e.side === side).reduce((sum, e) => sum + e.from - e.to, 0);

const speciesOfType = (t: TypeId): SpeciesDef => {
  const s = SPECIES.find((sp) => sp.types.length === 1 && sp.types[0] === t);
  if (!s) throw new Error(`no pure ${t} species`);
  return s;
};

function find<T>(items: readonly T[], pred: (it: T) => boolean, what: string): T {
  const it = items.find(pred);
  if (!it) throw new Error(`test fixture: no ${what}`);
  return it;
}

const findMove = (pred: (m: MoveDef) => boolean): MoveDef => find(MOVES, (m) => m.id !== STRUGGLE && pred(m), 'move');
const statusMoveFor = (status: StatusId) => findMove((m) => m.category === 'status'
  && m.effects?.length === 1 && m.effects[0]?.kind === 'status' && m.effects[0].status === status);

const selfBoost = findMove((m) => m.category === 'status' && m.accuracy === 0
  && m.effects?.length === 1 && m.effects[0]?.kind === 'stat' && m.effects[0].who === 'self' && m.effects[0].stages === 2);
/** Damaging moves without side effects, priority, crit bonus or multiple hits that never miss at stage 0. */
const PLAIN = MOVES.filter((m) => m.id !== STRUGGLE && m.category !== 'status' && m.accuracy === 100
  && !m.effects && !m.multiHit && !m.priority && !m.highCrit);
const normalSp = speciesOfType('normal');
const plainNormal = find(PLAIN, (m) => m.type === 'normal' && m.category === 'physical', 'plain normal move');
const priorityMove = findMove((m) => (m.priority ?? 0) > 0 && m.category !== 'status' && m.accuracy === 100);
const flinchMove = findMove((m) => m.category !== 'status' && m.accuracy === 100 && !!m.effects?.some((fx) => fx.kind === 'flinch'));
const healMove = findMove((m) => m.category === 'status' && !!m.effects?.every((fx) => fx.kind === 'heal'));
const fastest = SPECIES.reduce((a, b) => (b.base.spd > a.base.spd ? b : a));
const slowest = SPECIES.reduce((a, b) => (b.base.spd < a.base.spd ? b : a));

const healItem = ITEMS.filter((it) => it.use.kind === 'heal' && typeof it.use.hp === 'number')
  .reduce((a, b) => (a.use.kind === 'heal' && b.use.kind === 'heal' && b.use.hp < a.use.hp ? b : a));
const crystalWithRate = (pred: (rate: number) => boolean): ItemDef =>
  find(ITEMS, (it) => it.use.kind === 'crystal' && pred(it.use.rate), 'crystal');
const basicCrystal = crystalWithRate((r) => r === 1);
const masterCrystal = crystalWithRate((r) => r >= 255);

// --- pure math ---------------------------------------------------------------------------------

describe('damage formula', () => {
  const base: DamageInput = {
    level: 10, power: 40, attack: 20, defense: 20, stab: false, effectiveness: 1, crit: false, roll: 100, burned: false,
  };

  it('follows floor(floor(floor(2L/5+2)·P·A/D)/50)+2', () => {
    // floor(2·10/5+2) = 6 → floor(6·40·20/20) = 240 → floor(240/50)+2 = 6
    expect(calcDamage(base)).toBe(6);
  });

  it('applies STAB, effectiveness, crit, random roll and burn', () => {
    expect(calcDamage({ ...base, stab: true })).toBe(9);
    expect(calcDamage({ ...base, effectiveness: 2 })).toBe(12);
    expect(calcDamage({ ...base, effectiveness: 0.5 })).toBe(3);
    expect(calcDamage({ ...base, crit: true })).toBe(9);
    expect(calcDamage({ ...base, roll: 85 })).toBe(5);
    expect(calcDamage({ ...base, burned: true })).toBe(3);
    expect(calcDamage({ ...base, stab: true, effectiveness: 2 })).toBe(18);
  });

  it('deals at least 1 unless immune', () => {
    expect(calcDamage({ ...base, power: 1, attack: 1, defense: 500, effectiveness: 0.25, roll: 85 })).toBe(1);
    expect(calcDamage({ ...base, effectiveness: 0 })).toBe(0);
  });

  it('uses stage multipliers (2+s)/2 and 2/(2-s), accuracy (3+s)/3 and 3/(3-s)', () => {
    expect(stageMultiplier(2)).toBe(2);
    expect(stageMultiplier(-2)).toBe(0.5);
    expect(stageMultiplier(6)).toBe(4);
    expect(accuracyMultiplier(3)).toBe(2);
    expect(accuracyMultiplier(-3)).toBe(0.5);
  });
});

describe('capture with normal crystals', () => {
  const sample = (hpFraction: number, status: StatusId | null, catchRate = 45, rate = 1) => {
    const rng = createRng(77);
    const shakes = [0, 0, 0, 0];
    let caught = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      const r = rollCapture({ maxHp: 100, hp: Math.max(1, Math.round(100 * hpFraction)), catchRate, rate, status }, rng);
      if (r.caught) {
        expect(r.shakes).toBe(3);
        caught++;
      } else shakes[r.shakes]!++;
    }
    return { rate: caught / n, shakes };
  };

  it('catches about 6 % at full HP with catch rate 45 and more when weakened, asleep or with better crystals', () => {
    const full = sample(1, null);
    expect(full.rate).toBeGreaterThan(0.045);
    expect(full.rate).toBeLessThan(0.08);
    expect(sample(0.01, null).rate).toBeGreaterThan(full.rate * 1.8);
    expect(sample(1, 'paralysis').rate).toBeGreaterThan(full.rate);
    expect(sample(1, 'sleep').rate).toBeGreaterThan(sample(1, 'paralysis').rate);
    expect(sample(1, null, 45, 2).rate).toBeGreaterThan(full.rate);
    expect(sample(0.01, 'sleep', 255).rate).toBe(1);
  });

  it('shakes 0–3 times on failure, more often 3 times the easier the catch', () => {
    const hard = sample(1, null, 3).shakes;
    const easy = sample(0.3, null, 120).shakes;
    const threeShakeShare = (counts: number[]) => counts[3]! / counts.reduce((a, b) => a + b, 0);
    expect(threeShakeShare(easy)).toBeGreaterThan(threeShakeShare(hard) * 3);
    for (const counts of [hard, easy]) {
      expect(counts.every((c) => c > 0)).toBe(true);
      expect(counts[0]).toBeGreaterThan(counts[3]!);
    }
  });
});

// --- moves -----------------------------------------------------------------------------------

describe('damage in battle', () => {
  const other = find(PLAIN, (m) => m.category === plainNormal.category && m.power === plainNormal.power
    && !normalSp.types.includes(m.type), 'non-STAB twin of the plain normal move');
  const neutral = find(SPECIES, (s) => typeEffectiveness(plainNormal.type, s.types) === 1
    && typeEffectiveness(other.type, s.types) === 1, 'neutral target');

  /**
   * A L20 normal creature hits a L50 `targetSp` once with `move`. Returns the damage dealt and the formula
   * for the same creatures; the formula defaults to no STAB, neutral, no crit and fixedRng(0.5)'s roll of 93.
   */
  const hit = (move: MoveDef, targetSp: SpeciesDef, rng: Rng, prepare: (ctx: Ctx, user: Creature) => void = () => {}) => {
    const user = mon(normalSp.id, 20, [move.id]);
    const target = mon(targetSp.id, 50, [selfBoost.id]);
    const ctx = duel(user, target, rng);
    prepare(ctx, user);
    useMove(ctx, 'player', 0);
    const physical = move.category === 'physical';
    const attack = calcStats(user)[physical ? 'atk' : 'mag'];
    const defense = calcStats(target)[physical ? 'def' : 'res'];
    const formula = (extra: Partial<DamageInput>) => calcDamage({
      level: user.level, power: move.power, attack, defense, stab: false, effectiveness: 1, crit: false, roll: 93, burned: false,
      ...extra,
    });
    return { dealt: hpLost(ctx.events, 'enemy'), formula, events: ctx.events, attack, defense };
  };

  it('adds STAB for moves of the user’s type', () => {
    const stab = hit(plainNormal, neutral, fixedRng(0.5));
    expect(stab.dealt).toBe(stab.formula({ stab: true }));
    expect(stab.formula({ stab: true })).toBeGreaterThan(stab.formula({}));
    const plain = hit(other, neutral, fixedRng(0.5));
    expect(plain.dealt).toBe(plain.formula({}));
  });

  it('applies type effectiveness with the special stats and reports it', () => {
    const special = find(PLAIN, (m) => m.category === 'special' && !normalSp.types.includes(m.type)
      && SPECIES.some((s) => typeEffectiveness(m.type, s.types) === 2), 'special move with a weak target');
    const weak = find(SPECIES, (s) => typeEffectiveness(special.type, s.types) === 2, 'weak target');
    const r = hit(special, weak, fixedRng(0.5));
    expect(r.dealt).toBe(r.formula({ effectiveness: 2 }));
    expect(ofType(r.events, 'hp')[0]).toMatchObject({ effectiveness: 2, crit: false });
    expect(texts(r.events)).toContain('Das ist sehr wirkungsvoll!');
  });

  it('halves physical damage of a burned attacker', () => {
    const r = hit(plainNormal, neutral, fixedRng(0.5), (_, user) => (user.status = 'burn'));
    expect(r.dealt).toBe(r.formula({ stab: true, burned: true }));
  });

  it('crits ignore the attacker’s drops and the target’s boosts, but keep the opposite stages', () => {
    const staging = (atk: number, def: number) => (ctx: Ctx) => {
      ctx.fighters.player.stages.atk = atk;
      ctx.fighters.enemy.stages.def = def;
    };
    // fixedRng(0.01): every hit crits, random factor 85.
    const ignored = hit(plainNormal, neutral, fixedRng(0.01), staging(-2, 2));
    expect(ignored.dealt).toBe(ignored.formula({ stab: true, crit: true, roll: 85 }));
    const kept = hit(plainNormal, neutral, fixedRng(0.01), staging(2, -2));
    expect(kept.dealt).toBe(kept.formula({
      stab: true, crit: true, roll: 85, attack: staged(kept.attack, 2), defense: staged(kept.defense, -2),
    }));
    const normal = hit(plainNormal, neutral, fixedRng(0.5), staging(-2, 2));
    expect(normal.dealt).toBe(normal.formula({
      stab: true, attack: staged(normal.attack, -2), defense: staged(normal.defense, 2),
    }));
  });
});

describe('moves', () => {
  const missesAtMinusSix = (choice: 0 | 'struggle') => {
    let misses = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const ctx = duel(mon(normalSp.id, 20, [plainNormal.id]), mon(slowest.id, 50, [selfBoost.id]), createRng(seed));
      ctx.fighters.player.stages.acc = -6;
      useMove(ctx, 'player', choice);
      if (texts(ctx.events).includes('Die Attacke verfehlt ihr Ziel!')) misses++;
    }
    return misses;
  };

  it('accuracy-0 moves never miss, even at accuracy −6; others do', () => {
    expect(getMove(STRUGGLE).accuracy).toBe(0);
    expect(missesAtMinusSix('struggle')).toBe(0);
    expect(missesAtMinusSix(0)).toBeGreaterThan(10);
  });

  it('a miss is announced by a move event flagged miss, right before the message', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const ctx = duel(mon(normalSp.id, 20, [plainNormal.id]), mon(slowest.id, 50, [selfBoost.id]), createRng(seed));
      ctx.fighters.player.stages.acc = -6;
      useMove(ctx, 'player', 0);
      const at = ctx.events.findIndex((e) => e.t === 'msg' && e.text === 'Die Attacke verfehlt ihr Ziel!');
      if (at < 0) continue;
      expect(ctx.events[at - 1]).toEqual({ t: 'move', side: 'player', moveId: plainNormal.id, miss: true });
      return;
    }
    throw new Error('no miss in 40 seeds');
  });

  it('uses struggle when no move has EN left', () => {
    const player = mon(normalSp.id, 20, [plainNormal.id, selfBoost.id]);
    const b = createBattle(stateWith(player), wild(mon(slowest.id, 20, [selfBoost.id])), createRng(5));
    b.start();
    player.moves[0]!.pp = 0;
    expect(b.validate({ kind: 'move', index: 0 })).toBe('Keine EN mehr!');
    player.moves[1]!.pp = 0;
    expect(b.validate({ kind: 'move', index: 0 })).toBeNull();
    const msgs = texts(b.act({ kind: 'move', index: 0 }));
    const name = displayName(player);
    expect(msgs).toContain(`${name} hat keine EN mehr!`);
    expect(msgs).toContain(`${name} setzt ${getMove(STRUGGLE).name} ein!`);
    expect(msgs).toContain(`${name} erleidet Rückstoß!`);
  });

  it('lets priority moves go first, otherwise the faster creature', () => {
    const order = (playerMove: string) => {
      const state = stateWith(mon(slowest.id, 20, [playerMove]));
      const b = createBattle(state, wild(mon(fastest.id, 20, [selfBoost.id])), createRng(9));
      b.start();
      return texts(b.act({ kind: 'move', index: 0 })).filter((t) => t.includes(' setzt '));
    };
    expect(order(priorityMove.id)[0]).toMatch(new RegExp(`^${slowest.name} `));
    expect(order(selfBoost.id)[0]).toMatch(/^Wildes /);
  });

  it('raises stages with messages; at +6 the move fails without animation', () => {
    const stat = selfBoost.effects?.[0];
    if (stat?.kind !== 'stat') throw new Error('expected a stat move');
    const b = createBattle(stateWith(mon(normalSp.id, 30, [selfBoost.id])), wild(mon(normalSp.id, 2, [selfBoost.id])), createRng(1));
    b.start();
    const first = b.act({ kind: 'move', index: 0 });
    expect(ofType(first, 'stat')).toContainEqual({ t: 'stat', side: 'player', stat: stat.stat, stages: 2 });
    expect(texts(first).some((t) => t.endsWith('steigt stark!'))).toBe(true);
    b.act({ kind: 'move', index: 0 });
    b.act({ kind: 'move', index: 0 });
    expect(b.stages('player')[stat.stat]).toBe(6);
    const capped = b.act({ kind: 'move', index: 0 });
    expect(texts(capped).some((t) => t.endsWith('kann nicht weiter steigen!'))).toBe(true);
    expect(ofType(capped, 'move').filter((e) => e.side === 'player')).toEqual([]);
    expect(b.stages('player')[stat.stat]).toBe(6);
  });

  it('status moves that cannot work fail before the animation', () => {
    const para = statusMoveFor('paralysis');
    const immune = speciesOfType('spark');
    const cases: [Creature, string, Creature][] = [];
    const poisoned = mon(normalSp.id, 10, [selfBoost.id]);
    poisoned.status = 'poison';
    cases.push([mon(normalSp.id, 10, [para.id]), 'Die Attacke schlägt fehl!', poisoned]);
    const sparky = mon(immune.id, 10, [selfBoost.id]);
    cases.push([mon(normalSp.id, 10, [para.id]), `Das hat keine Wirkung auf wildes ${displayName(sparky)} …`, sparky]);
    const healthy = mon(normalSp.id, 10, [healMove.id]);
    cases.push([healthy, `Die LP von ${displayName(healthy)} sind bereits voll!`, mon(normalSp.id, 10, [selfBoost.id])]);
    for (const [user, reason, target] of cases) {
      const ctx = duel(user, target);
      useMove(ctx, 'player', 0);
      expect(texts(ctx.events).at(-1)).toBe(reason);
      expect(ofType(ctx.events, 'move')).toEqual([]);
      expect(user.moves[0]!.pp).toBe(getMove(user.moves[0]!.id).pp - 1);
    }
    expect(poisoned.status).toBe('poison');
  });

  it('flinches a slower target that has not moved yet', () => {
    const flinchOrder = (playerSp: SpeciesDef, enemySp: SpeciesDef) => {
      const enemy = mon(enemySp.id, 20, [plainNormal.id]);
      // fixedRng(0.01): the flinch chance always hits.
      const b = createBattle(stateWith(mon(playerSp.id, 20, [flinchMove.id])), wild(enemy), fixedRng(0.01));
      b.start();
      return texts(b.act({ kind: 'move', index: 0 }));
    };
    const first = flinchOrder(fastest, slowest);
    expect(first.some((t) => t.endsWith('schreckt zurück!'))).toBe(true);
    expect(first.some((t) => t.startsWith('Wildes ') && t.includes(' setzt '))).toBe(false);
    const second = flinchOrder(slowest, fastest);
    expect(second.some((t) => t.endsWith('schreckt zurück!'))).toBe(false);
  });
});

// --- status ----------------------------------------------------------------------------------

describe('status', () => {
  it('burn and poison hurt 1/16 and 1/8 at the end of the turn and persist', () => {
    for (const [status, div] of [['burn', 16], ['poison', 8]] as const) {
      const player = mon(normalSp.id, 30, [selfBoost.id]);
      player.status = status;
      const b = createBattle(stateWith(player), wild(mon(slowest.id, 10, [selfBoost.id])), createRng(2));
      b.start();
      const tick = ofType(b.act({ kind: 'move', index: 0 }), 'hp').find((e) => e.side === 'player');
      expect(tick && tick.from - tick.to).toBe(Math.floor(maxHp(player) / div));
      b.act({ kind: 'run' });
      expect(player.status).toBe(status);
    }
  });

  it('sleeps for statusTurns turns, then wakes up and acts', () => {
    const enemy = mon(slowest.id, 10, [selfBoost.id]);
    enemy.status = 'sleep';
    enemy.statusTurns = 2;
    const b = createBattle(stateWith(mon(normalSp.id, 30, [selfBoost.id])), wild(enemy), createRng(4));
    b.start();
    const asleep = `${wildName(enemy)} schläft tief und fest.`;
    expect(texts(b.act({ kind: 'move', index: 0 }))).toContain(asleep);
    expect(texts(b.act({ kind: 'move', index: 0 }))).toContain(asleep);
    const third = texts(b.act({ kind: 'move', index: 0 }));
    expect(third).toContain(`${wildName(enemy)} ist aufgewacht!`);
    expect(third.some((t) => t.startsWith(`${wildName(enemy)} setzt`))).toBe(true);
    expect(enemy.status).toBeNull();
  });

  it('paralysis halves speed and sometimes stops the move (without using EN)', () => {
    const order = (paralyzed: boolean) => {
      const player = mon(normalSp.id, 30, [selfBoost.id]);
      const enemy = mon(normalSp.id, 20, [selfBoost.id]);
      player.ivs.spd = enemy.ivs.spd = 15;
      if (paralyzed) player.status = 'paralysis';
      // fixedRng(0.5): never fully paralyzed.
      const b = createBattle(stateWith(player), wild(enemy), fixedRng(0.5));
      b.start();
      return texts(b.act({ kind: 'move', index: 0 })).find((t) => t.includes(' setzt '));
    };
    expect(order(false)).not.toMatch(/^Wildes /);
    expect(order(true)).toMatch(/^Wildes /);

    const player = mon(normalSp.id, 30, [plainNormal.id]);
    player.status = 'paralysis';
    const ctx = duel(player, mon(slowest.id, 30, [selfBoost.id]), fixedRng(0.1));
    expect(effectiveSpeed(ctx, 'player')).toBe(Math.floor(calcStats(player).spd / 2));
    useMove(ctx, 'player', 0);
    expect(texts(ctx.events)).toEqual([`${displayName(player)} ist paralysiert! Es kann sich nicht bewegen!`]);
    expect(player.moves[0]!.pp).toBe(plainNormal.pp);
  });

  it('respects type immunities and the one-status rule', () => {
    const of = (t: TypeId) => mon(speciesOfType(t).id, 10, [plainNormal.id]);
    expect(canInflict(of('fire'), 'burn')).toBe(false);
    expect(canInflict(of('toxic'), 'poison')).toBe(false);
    expect(canInflict(of('metal'), 'poison')).toBe(false);
    expect(canInflict(of('spark'), 'paralysis')).toBe(false);
    expect(canInflict(of('water'), 'paralysis')).toBe(true);
    const poisoned = of('water');
    poisoned.status = 'poison';
    expect(canInflict(poisoned, 'burn')).toBe(false);
  });
});

// --- wild battles ----------------------------------------------------------------------------

describe('wild battles', () => {
  it('runs to victory with EXP events', () => {
    const player = mon(normalSp.id, 12, [plainNormal.id]);
    const enemy = mon(slowest.id, 3, [plainNormal.id]);
    const state = stateWith(player);
    const expBefore = player.exp;
    const events = play(createBattle(state, wild(enemy), createRng(11)), state);
    expect(texts(events)[0]).toBe(`Ein wildes ${displayName(enemy)} erscheint!`);
    expect(texts(events)[1]).toBe(`Los, ${displayName(player)}!`);
    expect(events.slice(0, 4).map((e) => e.t)).toEqual(['msg', 'sendOut', 'msg', 'sendOut']);
    const exp = ofType(events, 'exp');
    expect(exp).toEqual([{ t: 'exp', partyIndex: 0, from: expBefore, to: player.exp }]);
    expect(player.exp).toBeGreaterThan(expBefore);
    expect(events.at(-1)).toEqual({ t: 'end', outcome: 'win' });
  });

  it('handles several level-ups in a row: message, levelUp, HP gain, new moves', () => {
    const sp = find(SPECIES, (s) => s.learnset.some((e) => e.level > 5 && e.level <= 10), 'species learning early moves');
    const player = mon(sp.id, 5, [priorityMove.id]);
    const state = stateWith(player);
    const strongest = SPECIES.filter((s) => typeEffectiveness(priorityMove.type, s.types) > 0)
      .reduce((a, b) => (b.baseExp > a.baseExp ? b : a));
    const b = createBattle(state, wild(mon(strongest.id, 30, [selfBoost.id], 1)), createRng(12));
    const events = play(b, state);
    const ups = ofType(events, 'levelUp');
    expect(ups.length).toBeGreaterThan(2);
    expect(ups.map((e) => e.level)).toEqual(ups.map((_, i) => 6 + i));
    expect(player.level).toBe(ups.at(-1)?.level);
    for (const up of ups) {
      const i = events.indexOf(up);
      expect(events[i - 1]).toEqual({ t: 'msg', text: `${displayName(player)} erreicht Level ${up.level}!` });
      if (up.after.hp > up.before.hp) {
        expect(events[i + 1]).toMatchObject({ t: 'hp', side: 'player', max: up.after.hp });
      }
    }
    // EXP segments are contiguous.
    const exp = ofType(events, 'exp');
    exp.slice(1).forEach((e, i) => expect(e.from).toBe(exp[i]?.to));
    const learned = sp.learnset.filter((e) => e.level > 5 && e.level <= player.level).map((e) => e.move);
    expect(player.moves.map((m) => m.id)).toEqual([...new Set([priorityMove.id, ...learned])].slice(0, 4));
    expect(b.leveledUp.has(player.uid)).toBe(true);
    expect(b.prompt).toEqual({ kind: 'done', outcome: 'win' });
  });

  it('asks which move to forget when 4 moves are known and rejects invalid answers', () => {
    const sp = find(SPECIES, (s) => s.learnset.some((e) => e.level > 1), 'species with a learnable move');
    const entry = sp.learnset.find((e) => e.level > 1)!;
    const four = [plainNormal.id, ...MOVES.filter((m) => ![entry.move, STRUGGLE, plainNormal.id].includes(m.id)).slice(0, 3).map((m) => m.id)];
    for (const forget of [1, null]) {
      const player = mon(sp.id, entry.level - 1, four);
      player.exp = expForLevel(sp.growth, entry.level) - 1;
      const b = createBattle(stateWith(player), wild(mon(normalSp.id, 5, [selfBoost.id], 1)), createRng(13));
      b.start();
      b.act({ kind: 'move', index: 0 });
      expect(b.prompt).toEqual({ kind: 'learn', partyIndex: 0, moveId: entry.move });
      expect(b.learn(4)).toEqual([{ t: 'msg', text: 'Diese Attacke gibt es nicht.' }]);
      expect(b.learn(-1)).toEqual([{ t: 'msg', text: 'Diese Attacke gibt es nicht.' }]);
      expect(b.prompt.kind).toBe('learn');
      const after = b.learn(forget);
      while (b.prompt.kind === 'learn') after.push(...b.learn(null));
      expect(after.at(-1)).toEqual({ t: 'end', outcome: 'win' });
      const name = getMove(entry.move).name;
      if (forget === null) {
        expect(player.moves.map((m) => m.id)).toEqual(four);
        expect(texts(after)).toContain(`${displayName(player)} hat ${name} nicht erlernt.`);
      } else {
        expect(player.moves[1]?.id).toBe(entry.move);
      }
    }
  });

  it('gives EXP to every standing creature that faced the enemy, also after switching out', () => {
    const first = mon(normalSp.id, 20, [selfBoost.id]);
    const second = mon(normalSp.id, 20, [plainNormal.id]);
    const bench = mon(normalSp.id, 20, [plainNormal.id]);
    const state = stateWith(first, second, bench);
    const b = createBattle(state, wild(mon(slowest.id, 8, [selfBoost.id])), createRng(21));
    const events = b.start();
    events.push(...b.act({ kind: 'move', index: 0 }));
    events.push(...b.act({ kind: 'switch', partyIndex: 1 }));
    playOn(b, state, events);
    const exp = ofType(events, 'exp');
    expect(exp.map((e) => e.partyIndex)).toEqual([0, 1]);
    expect(exp[0]!.to - exp[0]!.from).toBe(exp[1]!.to - exp[1]!.from);
  });

  it('can run from a slower creature, not when canRun is false; a failed escape costs the turn', () => {
    const state = stateWith(mon(fastest.id, 30, [plainNormal.id]));
    const b = createBattle(state, wild(mon(slowest.id, 3, [selfBoost.id])), createRng(14));
    b.start();
    expect(b.act({ kind: 'run' }).at(-1)).toEqual({ t: 'end', outcome: 'run' });
    const locked = createBattle(state, wild(mon(slowest.id, 3, [selfBoost.id]), { canRun: false }), createRng(14));
    locked.start();
    expect(locked.validate({ kind: 'run' })).toBe('Du kannst nicht fliehen!');

    const slow = stateWith(mon(slowest.id, 5, [plainNormal.id]));
    const enemy = mon(fastest.id, 50, [selfBoost.id]);
    const stuck = createBattle(slow, wild(enemy), fixedRng(0.99));
    stuck.start();
    const msgs = texts(stuck.act({ kind: 'run' }));
    expect(msgs[0]).toBe('Flucht gescheitert!');
    expect(msgs.some((t) => t.startsWith(`${wildName(enemy)} setzt`))).toBe(true);
    expect(stuck.prompt).toEqual({ kind: 'action' });
  });

  it('skips status damage once the player has no creature left', () => {
    const enemy = mon(normalSp.id, 30, [plainNormal.id]);
    enemy.status = 'burn';
    const state = stateWith(mon(normalSp.id, 10, [selfBoost.id], 1));
    const events = play(createBattle(state, wild(enemy), fixedRng(0.5)), state);
    expect(ofType(events, 'hp').filter((e) => e.side === 'enemy')).toEqual([]);
    expect(texts(events)).toContain('{PLAYER} hat keine kampffähigen Wildlinge mehr!');
    expect(events.at(-1)).toEqual({ t: 'end', outcome: 'lose' });
  });
});

describe('items', () => {
  it('the master crystal always catches and is used up', () => {
    const rare = SPECIES.reduce((a, b) => (b.catchRate < a.catchRate ? b : a));
    const enemy = mon(rare.id, 50, [plainNormal.id]);
    const state = stateWith(mon(normalSp.id, 5, [plainNormal.id]));
    state.bag[masterCrystal.id] = 1;
    const b = createBattle(state, wild(enemy), createRng(15));
    b.start();
    const events = b.act({ kind: 'item', itemId: masterCrystal.id });
    expect(ofType(events, 'throw')).toEqual([{ t: 'throw', itemId: masterCrystal.id, shakes: 3, caught: true }]);
    expect(events.at(-1)).toEqual({ t: 'end', outcome: 'caught' });
    expect(state.bag[masterCrystal.id]).toBeUndefined();
    expect(b.setup.enemy[b.enemyActive]).toBe(enemy);
    expect(state.party).toHaveLength(1);
  });

  it('a failed throw uses up the crystal and the turn', () => {
    const rare = SPECIES.reduce((a, b) => (b.catchRate < a.catchRate ? b : a));
    const enemy = mon(rare.id, 50, [selfBoost.id]);
    const state = stateWith(mon(normalSp.id, 5, [plainNormal.id]));
    state.bag[basicCrystal.id] = 2;
    const b = createBattle(state, wild(enemy), fixedRng(0.99));
    b.start();
    const events = b.act({ kind: 'item', itemId: basicCrystal.id });
    expect(ofType(events, 'throw')).toEqual([{ t: 'throw', itemId: basicCrystal.id, shakes: 0, caught: false }]);
    expect(texts(events).some((t) => t.startsWith(`${wildName(enemy)} setzt`))).toBe(true);
    expect(state.bag[basicCrystal.id]).toBe(1);
    expect(b.prompt).toEqual({ kind: 'action' });
  });

  it('heals with potions, consumes the turn and blocks useless items', () => {
    const amount = healItem.use.kind === 'heal' && typeof healItem.use.hp === 'number' ? healItem.use.hp : 0;
    const player = mon(normalSp.id, 30, [selfBoost.id]);
    const enemy = mon(slowest.id, 3, [selfBoost.id]);
    const state = stateWith(player);
    state.bag[healItem.id] = 2;
    const b = createBattle(state, wild(enemy), createRng(16));
    b.start();
    expect(b.validate({ kind: 'item', itemId: healItem.id, partyIndex: 0 })).not.toBeNull();
    player.hp = 5;
    const events = b.act({ kind: 'item', itemId: healItem.id, partyIndex: 0 });
    expect(ofType(events, 'hp')[0]).toMatchObject({ side: 'player', from: 5, to: 5 + amount });
    expect(texts(events).some((t) => t.startsWith(`${wildName(enemy)} setzt`))).toBe(true);
    expect(state.bag[healItem.id]).toBe(1);
    const missing = find(ITEMS, (it) => it.use.kind === 'heal' && it.id !== healItem.id, 'second heal item');
    expect(b.validate({ kind: 'item', itemId: missing.id, partyIndex: 0 })).toBe('Davon hast du nichts mehr!');
  });
});

// --- trainer battles -------------------------------------------------------------------------

describe('trainer battles', () => {
  it('sends out every enemy in turn and pays the reward after the defeat line', () => {
    const state = stateWith(mon(normalSp.id, 30, [priorityMove.id]));
    state.money = 1000;
    const [a, b] = SPECIES.filter((s) => s.id !== normalSp.id);
    const enemies = [mon(a!.id, 5, [plainNormal.id], 1), mon(b!.id, 6, [plainNormal.id], 1)];
    const events = play(createBattle(state, trainerSetup(enemies), createRng(17)), state);
    const msgs = texts(events);
    expect(msgs[0]).toBe(`${LABEL} fordert dich heraus!`);
    for (const e of enemies) expect(msgs).toContain(`${LABEL} schickt ${displayName(e)} in den Kampf!`);
    expect(ofType(events, 'sendOut').filter((e) => e.side === 'enemy').map((e) => e.partyIndex)).toEqual([0, 1]);
    expect(ofType(events, 'exp')).toHaveLength(2);
    expect(msgs.slice(-3)).toEqual([`{PLAYER} hat ${LABEL} besiegt!`, 'Uff, du bist stark!', '{PLAYER} erhält 240 Fr. Preisgeld!']);
    expect(events.slice(-2)).toEqual([{ t: 'money', amount: 240 }, { t: 'end', outcome: 'win' }]);
    expect(state.money).toBe(1240);
  });

  it('cannot run or throw crystals', () => {
    const state = stateWith(mon(normalSp.id, 10, [plainNormal.id]));
    state.bag[basicCrystal.id] = 5;
    const b = createBattle(state, trainerSetup([mon(slowest.id, 5, [plainNormal.id])]), createRng(18));
    b.start();
    expect(b.validate({ kind: 'run' })).toBe('Vor einem Trainerkampf kann man nicht fliehen!');
    expect(b.validate({ kind: 'item', itemId: basicCrystal.id })).toBe('Das geht hier nicht!');
    expect(b.act({ kind: 'run' })).toEqual([{ t: 'msg', text: 'Vor einem Trainerkampf kann man nicht fliehen!' }]);
    expect(b.prompt.kind).toBe('action');
  });

  it('forces a switch when the active creature faints and loses when none are left', () => {
    const fainting = mon(normalSp.id, 5, [selfBoost.id], 1);
    const state = stateWith(fainting, mon(normalSp.id, 5, [selfBoost.id], 1));
    const b = createBattle(state, trainerSetup([mon(slowest.id, 40, [plainNormal.id])]), createRng(19));
    b.start();
    const first = b.act({ kind: 'move', index: 0 });
    expect(ofType(first, 'faint')).toEqual([{ t: 'faint', side: 'player' }]);
    expect(b.prompt).toEqual({ kind: 'switch' });
    const down = `${displayName(fainting)} ist kampfunfähig!`;
    expect(b.validate({ kind: 'switch', partyIndex: 0 })).toBe(down);
    expect(b.validate({ kind: 'switch', partyIndex: 1 })).toBeNull();
    expect(b.validate({ kind: 'move', index: 0 })).toBe('Jetzt nicht!');
    expect(b.switchTo(0)).toEqual([{ t: 'msg', text: down }]);
    expect(b.switchTo(1)).toContainEqual({ t: 'sendOut', side: 'player', partyIndex: 1 });
    expect(b.playerActive).toBe(1);
    const last = b.act({ kind: 'move', index: 0 });
    expect(texts(last)).toContain('{PLAYER} hat keine kampffähigen Wildlinge mehr!');
    expect(last.at(-1)).toEqual({ t: 'end', outcome: 'lose' });
    expect(b.prompt).toEqual({ kind: 'done', outcome: 'lose' });
  });

  it('a double knockout goes against the side whose last creature fell first', () => {
    const outOfEn = (c: Creature) => {
      for (const m of c.moves) m.pp = 0;
      return c;
    };
    // The player's struggle knocks out the last enemy, then the recoil knocks out the player: win.
    const won = stateWith(outOfEn(mon(normalSp.id, 20, [plainNormal.id], 1)));
    const winEvents = play(createBattle(won, trainerSetup([mon(slowest.id, 20, [selfBoost.id], 1)]), createRng(22)), won);
    expect(ofType(winEvents, 'faint').map((e) => e.side)).toEqual(['enemy', 'player']);
    expect(texts(winEvents)).toContain('Uff, du bist stark!');
    expect(texts(winEvents)).not.toContain('{PLAYER} hat keine kampffähigen Wildlinge mehr!');
    expect(ofType(winEvents, 'money')).toHaveLength(1);
    expect(winEvents.at(-1)).toEqual({ t: 'end', outcome: 'win' });
    // The enemy's struggle knocks out the player's last creature first: lose, no prize.
    const lost = stateWith(mon(normalSp.id, 20, [selfBoost.id], 1));
    const enemy = outOfEn(mon(slowest.id, 20, [plainNormal.id], 1));
    const loseEvents = play(createBattle(lost, trainerSetup([enemy]), createRng(23)), lost);
    expect(ofType(loseEvents, 'faint').map((e) => e.side)).toEqual(['player', 'enemy']);
    expect(ofType(loseEvents, 'money')).toEqual([]);
    expect(loseEvents.at(-1)).toEqual({ t: 'end', outcome: 'lose' });
  });

  it('smart AI avoids ineffective moves and uses a healing item once when low', () => {
    const earth = speciesOfType('earth');
    const useless = findMove((m) => m.category !== 'status' && typeEffectiveness(m.type, earth.types) === 0);
    const enemy = mon(normalSp.id, 12, [useless.id, plainNormal.id]);
    const trainer = trainerDef({ ai: 'smart', items: [healItem.id] });
    const b = createBattle(stateWith(mon(earth.id, 20, [selfBoost.id])), trainerSetup([enemy], trainer), createRng(20));
    b.start();
    const used: string[] = [];
    for (let i = 0; i < 4; i++) used.push(...texts(b.act({ kind: 'move', index: 0 })));
    expect(used.some((t) => t.includes(useless.name))).toBe(false);
    const heal = `${LABEL} setzt ${healItem.name} ein!`;
    enemy.hp = 2;
    expect(texts(b.act({ kind: 'move', index: 0 }))).toContain(heal);
    enemy.hp = 2;
    expect(texts(b.act({ kind: 'move', index: 0 }))).not.toContain(heal);
  });

  it('a basic trainer with a healing item also uses it when low', () => {
    const enemy = mon(normalSp.id, 12, [plainNormal.id]);
    const trainer = trainerDef({ ai: 'basic', items: [healItem.id] });
    const b = createBattle(stateWith(mon(normalSp.id, 20, [selfBoost.id])), trainerSetup([enemy], trainer), createRng(21));
    b.start();
    enemy.hp = 2;
    expect(texts(b.act({ kind: 'move', index: 0 }))).toContain(`${LABEL} setzt ${healItem.name} ein!`);
  });
});
