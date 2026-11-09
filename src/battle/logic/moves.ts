/** Executing one move: accuracy, damage, secondary effects. */
import type { Side } from '../../core/contracts';
import type { Creature, MoveDef, MoveEffect } from '../../core/types';
import { getMove, getSpecies, typeEffectiveness } from '../../data';
import { accuracyMultiplier, calcDamage, clampStage, rollHits, staged } from './calc';
import { type Ctx, changeHp, creature, emit, other, say, stats, who, whoAcc, whoDat } from './context';
import { canAct, canInflict, changeStage, inflict, typeImmune } from './status';

/** Used automatically when no move has EN left. Typeless (no STAB, neutral against everything). */
export const STRUGGLE = 'struggle';

const FAILED = 'Die Attacke schlägt fehl!';

/** The move a side uses this turn: a move slot index or struggle. */
export type MoveChoice = number | 'struggle';

export function hasUsableMove(c: Creature): boolean {
  return c.moves.some((m) => m.pp > 0);
}

export function moveOf(c: Creature, choice: MoveChoice): MoveDef {
  if (choice === 'struggle') return getMove(STRUGGLE);
  const slot = c.moves[choice];
  if (!slot) throw new Error(`battle: no move in slot ${choice}`);
  return getMove(slot.id);
}

/** True with probability chance/100 (no rng call for certain events). */
function percent(ctx: Ctx, chance: number): boolean {
  return chance >= 100 || ctx.rng.next() * 100 < chance;
}

function alive(ctx: Ctx, side: Side): boolean {
  return creature(ctx, side).hp > 0;
}

/** Type multiplier of the move against the side's active creature. */
export function effectivenessOn(ctx: Ctx, move: MoveDef, side: Side): number {
  if (move.id === STRUGGLE) return 1;
  return typeEffectiveness(move.type, getSpecies(creature(ctx, side).species).types);
}

/** Full move turn of `side`: status checks, EN, accuracy, damage and effects. */
export function useMove(ctx: Ctx, side: Side, choice: MoveChoice): void {
  if (!canAct(ctx, side)) return;
  const user = creature(ctx, side);
  const move = moveOf(user, choice);
  if (choice === 'struggle') say(ctx, `${who(ctx, side)} hat keine EN mehr!`);
  else {
    const slot = user.moves[choice];
    if (slot) slot.pp = Math.max(0, slot.pp - 1);
  }
  say(ctx, `${who(ctx, side)} setzt ${move.name} ein!`);
  const effectiveness = effectivenessOn(ctx, move, other(side));
  if (failsOutright(ctx, side, move, effectiveness)) return;
  if (!hits(ctx, side, move)) {
    emit(ctx, { t: 'move', side, moveId: move.id, miss: true });
    say(ctx, 'Die Attacke verfehlt ihr Ziel!');
    return;
  }
  emit(ctx, { t: 'move', side, moveId: move.id });
  if (move.category === 'status') statusMove(ctx, side, move.effects ?? []);
  else damagingMove(ctx, side, move, effectiveness);
}

/**
 * Moves that cannot work at all (immune target, status already set, stat at its limit, HP full)
 * fail before the accuracy roll and without the 'move' animation. Says why and returns true.
 */
function failsOutright(ctx: Ctx, side: Side, move: MoveDef, effectiveness: number): boolean {
  if (move.category !== 'status') {
    if (effectiveness > 0) return false;
    say(ctx, `Das hat keine Wirkung auf ${whoAcc(ctx, other(side))} …`);
    return true;
  }
  const effects = move.effects ?? [];
  if (effects.some((fx) => canWork(ctx, side, fx))) return false;
  const before = ctx.events.length;
  for (const fx of effects) explainNoEffect(ctx, side, fx);
  if (ctx.events.length === before) say(ctx, FAILED);
  return true;
}

/** Accuracy × accuracy-stage multiplier; accuracy 0 never misses. */
function hits(ctx: Ctx, side: Side, move: MoveDef): boolean {
  if (move.accuracy <= 0) return true;
  return percent(ctx, move.accuracy * accuracyMultiplier(ctx.fighters[side].stages.acc));
}

function damagingMove(ctx: Ctx, side: Side, move: MoveDef, effectiveness: number): void {
  const target = other(side);
  const count = move.multiHit ? rollHits(move.multiHit, ctx.rng) : 1;
  let dealt = 0;
  let landed = 0;
  while (landed < count && alive(ctx, target)) {
    const crit = ctx.rng.chance(move.highCrit ? 1 / 8 : 1 / 16);
    dealt += changeHp(ctx, target, -damage(ctx, side, move, effectiveness, crit), { effectiveness, crit });
    landed++;
    if (crit) say(ctx, 'Volltreffer!');
  }
  if (effectiveness > 1) say(ctx, 'Das ist sehr wirkungsvoll!');
  else if (effectiveness < 1) say(ctx, 'Das ist nicht sehr wirkungsvoll …');
  if (move.multiHit) say(ctx, `${landed} Treffer!`);
  for (const fx of move.effects ?? []) sideEffect(ctx, side, fx, dealt);
}

/** Damage of one hit (see calcDamage). Crits ignore the user's drops and the target's boosts. */
function damage(ctx: Ctx, side: Side, move: MoveDef, effectiveness: number, crit: boolean): number {
  const target = other(side);
  const user = creature(ctx, side);
  const physical = move.category === 'physical';
  const own = stats(ctx, side);
  const foe = stats(ctx, target);
  const atkStage = ctx.fighters[side].stages[physical ? 'atk' : 'mag'];
  const defStage = ctx.fighters[target].stages[physical ? 'def' : 'res'];
  return calcDamage({
    level: user.level,
    power: move.power,
    attack: staged(physical ? own.atk : own.mag, crit ? Math.max(0, atkStage) : atkStage),
    defense: staged(physical ? foe.def : foe.res, crit ? Math.min(0, defStage) : defStage),
    stab: move.id !== STRUGGLE && getSpecies(user.species).types.includes(move.type),
    effectiveness,
    crit,
    roll: ctx.rng.int(85, 100),
    burned: physical && user.status === 'burn',
  });
}

/** Secondary effect of a damaging move (after the hits). Silent when it doesn't apply. */
function sideEffect(ctx: Ctx, side: Side, fx: MoveEffect, dealt: number): void {
  const target = other(side);
  switch (fx.kind) {
    case 'status':
      if (alive(ctx, target) && percent(ctx, fx.chance)) inflict(ctx, target, fx.status);
      return;
    case 'stat': {
      const affected = fx.who === 'self' ? side : target;
      if (alive(ctx, affected) && percent(ctx, fx.chance)) changeStage(ctx, affected, fx.stat, fx.stages, false);
      return;
    }
    case 'flinch':
      if (alive(ctx, target) && !ctx.fighters[target].moved && percent(ctx, fx.chance)) ctx.fighters[target].flinch = true;
      return;
    case 'drain':
      if (dealt > 0 && alive(ctx, side) && creature(ctx, side).hp < stats(ctx, side).hp) {
        changeHp(ctx, side, Math.max(1, Math.floor(dealt * fx.fraction)));
        say(ctx, `${who(ctx, side)} saugt Energie ab!`);
      }
      return;
    case 'recoil':
      if (dealt > 0 && alive(ctx, side)) {
        changeHp(ctx, side, -Math.max(1, Math.floor(dealt * fx.fraction)));
        say(ctx, `${who(ctx, side)} erleidet Rückstoß!`);
      }
      return;
    case 'heal':
      healUser(ctx, side, fx.fraction);
      return;
  }
}

/** Whether a status-move effect would change anything right now. */
function canWork(ctx: Ctx, side: Side, fx: MoveEffect): boolean {
  switch (fx.kind) {
    case 'status':
      return canInflict(creature(ctx, other(side)), fx.status);
    case 'stat': {
      const stage = ctx.fighters[fx.who === 'self' ? side : other(side)].stages[fx.stat];
      return clampStage(stage + fx.stages) !== stage;
    }
    case 'heal':
      return creature(ctx, side).hp < stats(ctx, side).hp;
    case 'flinch':
    case 'drain':
    case 'recoil':
      return false;
  }
}

/** Why an effect does nothing (see canWork). */
function explainNoEffect(ctx: Ctx, side: Side, fx: MoveEffect): void {
  const target = other(side);
  switch (fx.kind) {
    case 'status':
      say(ctx, typeImmune(creature(ctx, target), fx.status) ? `Das hat keine Wirkung auf ${whoAcc(ctx, target)} …` : FAILED);
      return;
    case 'stat':
      // The stage is at its limit: changeStage only announces "… kann nicht weiter steigen/sinken!".
      changeStage(ctx, fx.who === 'self' ? side : target, fx.stat, fx.stages, true);
      return;
    case 'heal':
      say(ctx, `Die LP von ${whoDat(ctx, side)} sind bereits voll!`);
      return;
    case 'flinch':
    case 'drain':
    case 'recoil':
      return;
  }
}

/** Effects of a status move that hit (at least one of them can work). */
function statusMove(ctx: Ctx, side: Side, effects: readonly MoveEffect[]): void {
  let worked = false;
  for (const fx of effects) {
    if (!canWork(ctx, side, fx)) {
      explainNoEffect(ctx, side, fx);
    } else if (fx.kind === 'heal') {
      healUser(ctx, side, fx.fraction);
      worked = true;
    } else if (fx.kind === 'status' && percent(ctx, fx.chance)) {
      worked = inflict(ctx, other(side), fx.status) || worked;
    } else if (fx.kind === 'stat' && percent(ctx, fx.chance)) {
      changeStage(ctx, fx.who === 'self' ? side : other(side), fx.stat, fx.stages, true);
      worked = true;
    }
  }
  if (!worked) say(ctx, FAILED);
}

function healUser(ctx: Ctx, side: Side, fraction: number): void {
  const max = stats(ctx, side).hp;
  if (creature(ctx, side).hp >= max) {
    say(ctx, `Die LP von ${whoDat(ctx, side)} sind bereits voll!`);
    return;
  }
  changeHp(ctx, side, Math.max(1, Math.floor(max * fraction)));
  say(ctx, `${who(ctx, side)} erholt sich!`);
}
