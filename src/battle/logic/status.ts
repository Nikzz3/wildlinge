/** Major status conditions and stat stages: inflicting, pre-move checks, end-of-turn damage. */
import type { Side } from '../../core/contracts';
import type { BattleStat, Creature, StatusId, TypeId } from '../../core/types';
import { BATTLE_STAT_NAMES } from '../../core/types';
import { getSpecies } from '../../data';
import { clampStage, staged } from './calc';
import { type Ctx, changeHp, creature, emit, say, stats, who, whoDat } from './context';

/** Types that can never get a status. */
const IMMUNE: Record<StatusId, readonly TypeId[]> = {
  burn: ['fire'],
  poison: ['toxic', 'metal'],
  paralysis: ['spark'],
  sleep: [],
};

/** The creature's types rule the status out (fire can't burn, …). */
export function typeImmune(c: Creature, status: StatusId): boolean {
  return getSpecies(c.species).types.some((t) => IMMUNE[status].includes(t));
}

/** A standing creature without a major status whose types allow it. */
export function canInflict(c: Creature, status: StatusId): boolean {
  return c.hp > 0 && c.status === null && !typeImmune(c, status);
}

const INFLICTED: Record<StatusId, string> = {
  burn: 'erleidet einen Brand!',
  poison: 'wird vergiftet!',
  paralysis: 'wird paralysiert!',
  sleep: 'schläft ein!',
};

/** Sets the status if possible (with event + message). Returns false if it had no effect. */
export function inflict(ctx: Ctx, side: Side, status: StatusId): boolean {
  const c = creature(ctx, side);
  if (!canInflict(c, status)) return false;
  c.status = status;
  c.statusTurns = status === 'sleep' ? ctx.rng.int(1, 3) : 0;
  emit(ctx, { t: 'status', side, status });
  say(ctx, `${who(ctx, side)} ${INFLICTED[status]}`);
  return true;
}

/** "Der Angriff", "Die Verteidigung", "Das Tempo", … */
const STAT_ARTICLE: Record<BattleStat, string> = {
  atk: 'Der', def: 'Die', mag: 'Die', res: 'Die', spd: 'Das', acc: 'Die',
};

/**
 * Changes a stat stage with event + message. `announceLimit` controls whether hitting the
 * ±6 cap is reported (status moves) or silently ignored (side effects of damaging moves).
 */
export function changeStage(ctx: Ctx, side: Side, stat: BattleStat, delta: number, announceLimit: boolean): void {
  const stages = ctx.fighters[side].stages;
  const before = stages[stat];
  const after = clampStage(before + delta);
  const label = `${STAT_ARTICLE[stat]} ${BATTLE_STAT_NAMES[stat]} von ${whoDat(ctx, side)}`;
  if (after === before) {
    if (announceLimit) say(ctx, `${label} kann nicht weiter ${delta > 0 ? 'steigen' : 'sinken'}!`);
    return;
  }
  stages[stat] = after;
  const applied = after - before;
  emit(ctx, { t: 'stat', side, stat, stages: applied });
  const size = Math.abs(applied);
  const strength = size >= 3 ? ' drastisch' : size === 2 ? ' stark' : '';
  say(ctx, `${label} ${applied > 0 ? 'steigt' : 'sinkt'}${strength}!`);
}

/** Sleep, flinch and paralysis checks before a move. Returns false if the creature cannot act. */
export function canAct(ctx: Ctx, side: Side): boolean {
  const c = creature(ctx, side);
  const fighter = ctx.fighters[side];
  fighter.moved = true;
  if (c.status === 'sleep') {
    if (c.statusTurns > 0) {
      c.statusTurns--;
      say(ctx, `${who(ctx, side)} schläft tief und fest.`);
      return false;
    }
    c.status = null;
    emit(ctx, { t: 'status', side, status: null });
    say(ctx, `${who(ctx, side)} ist aufgewacht!`);
  }
  if (fighter.flinch) {
    fighter.flinch = false;
    say(ctx, `${who(ctx, side)} schreckt zurück!`);
    return false;
  }
  if (c.status === 'paralysis' && ctx.rng.chance(0.25)) {
    say(ctx, `${who(ctx, side)} ist paralysiert! Es kann sich nicht bewegen!`);
    return false;
  }
  return true;
}

/** Burn (1/16 max HP) and poison (1/8) damage at the end of the turn. */
export function residualDamage(ctx: Ctx, side: Side): void {
  const c = creature(ctx, side);
  if (c.hp <= 0 || (c.status !== 'burn' && c.status !== 'poison')) return;
  const burn = c.status === 'burn';
  const dmg = Math.max(1, Math.floor(stats(ctx, side).hp / (burn ? 16 : 8)));
  changeHp(ctx, side, -dmg);
  say(ctx, `${who(ctx, side)} ${burn ? 'wird durch den Brand verletzt!' : 'leidet unter dem Gift!'}`);
}

/** Effective speed for turn order and escape: stages applied, halved by paralysis. */
export function effectiveSpeed(ctx: Ctx, side: Side): number {
  const spd = staged(stats(ctx, side).spd, ctx.fighters[side].stages.spd);
  return creature(ctx, side).status === 'paralysis' ? Math.max(1, Math.floor(spd / 2)) : spd;
}
