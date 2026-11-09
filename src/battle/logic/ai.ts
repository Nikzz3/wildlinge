/** Enemy decisions: trainers use their healing items when low; 'basic' picks a random usable move, 'smart' scores moves. */
import type { MoveDef } from '../../core/types';
import { useItemOn } from '../../creature';
import { getItem, getMove, getSpecies } from '../../data';
import { staged } from './calc';
import { type Ctx, copyCreature, creature, stats } from './context';
import { effectivenessOn, hasUsableMove, type MoveChoice, STRUGGLE } from './moves';
import { canInflict } from './status';

export type EnemyPlan =
  | { kind: 'move'; choice: MoveChoice }
  /** Index into setup.trainer.items. */
  | { kind: 'item'; itemIndex: number };

/** Trainers use a healing item below this HP fraction. */
const HEAL_ITEM_BELOW = 0.25;
/** Chance to open with a useful status / stat move during the first turns on the field. */
const EARLY_SUPPORT_CHANCE = 0.35;
const EARLY_TURNS = 2;

export function planEnemy(ctx: Ctx): EnemyPlan {
  const c = creature(ctx, 'enemy');
  if (!hasUsableMove(c)) return { kind: 'move', choice: STRUGGLE };
  // Any trainer with healing items uses them when low; only 'smart' ones also pick moves carefully.
  const itemIndex = ctx.setup.kind === 'trainer' ? healingItem(ctx) : -1;
  if (itemIndex >= 0) return { kind: 'item', itemIndex };
  const smart = ctx.setup.kind === 'trainer' && ctx.setup.trainer?.ai === 'smart';
  if (!smart) return { kind: 'move', choice: ctx.rng.pick(usableSlots(ctx)) };
  return { kind: 'move', choice: smartMove(ctx) };
}

function usableSlots(ctx: Ctx): number[] {
  return creature(ctx, 'enemy').moves.flatMap((m, i) => (m.pp > 0 ? [i] : []));
}

/** First unused trainer item that would heal the low-HP enemy, or -1. */
function healingItem(ctx: Ctx): number {
  const c = creature(ctx, 'enemy');
  const items = ctx.setup.trainer?.items ?? [];
  if (c.hp >= stats(ctx, 'enemy').hp * HEAL_ITEM_BELOW) return -1;
  return items.findIndex((id, i) => {
    if (ctx.usedItems.has(i)) return false;
    const item = getItem(id);
    const heals = item.use.kind === 'heal' || item.use.kind === 'restore';
    return heals && useItemOn(copyCreature(c), item).ok;
  });
}

function smartMove(ctx: Ctx): number {
  const user = creature(ctx, 'enemy');
  const slots = usableSlots(ctx);
  const moveAt = (i: number): MoveDef => getMove(user.moves[i]?.id ?? STRUGGLE);
  const lowHp = user.hp < stats(ctx, 'enemy').hp / 2;

  const healing = slots.filter((i) => moveAt(i).effects?.some((fx) => fx.kind === 'heal') && moveAt(i).power === 0);
  if (lowHp && healing.length > 0 && ctx.rng.chance(0.6)) return ctx.rng.pick(healing);

  const support = slots.filter((i) => isUsefulSupport(ctx, moveAt(i)));
  if (ctx.fighters.enemy.turns < EARLY_TURNS && support.length > 0 && ctx.rng.chance(EARLY_SUPPORT_CHANCE)) {
    return ctx.rng.pick(support);
  }

  const scored = slots.map((i) => ({ i, score: expectedDamage(ctx, moveAt(i)) }));
  const best = Math.max(...scored.map((s) => s.score));
  if (best > 0) return ctx.rng.pick(scored.filter((s) => s.score === best)).i;
  // Nothing hurts the target: try support, else anything.
  return ctx.rng.pick(support.length > 0 ? support : slots);
}

/** power × STAB × effectiveness × accuracy × hits × own attack / target defense (stages applied). */
function expectedDamage(ctx: Ctx, move: MoveDef): number {
  if (move.category === 'status' || move.power <= 0) return 0;
  const user = creature(ctx, 'enemy');
  const physical = move.category === 'physical';
  const own = stats(ctx, 'enemy');
  const foe = stats(ctx, 'player');
  const attack = staged(physical ? own.atk : own.mag, ctx.fighters.enemy.stages[physical ? 'atk' : 'mag']);
  const defense = staged(physical ? foe.def : foe.res, ctx.fighters.player.stages[physical ? 'def' : 'res']);
  const stab = getSpecies(user.species).types.includes(move.type) ? 1.5 : 1;
  const accuracy = move.accuracy > 0 ? move.accuracy / 100 : 1;
  const hits = move.multiHit ? (move.multiHit[0] + move.multiHit[1]) / 2 : 1;
  return move.power * hits * stab * effectivenessOn(ctx, move, 'player') * accuracy * (attack / defense);
}

/** Status/stat moves that would actually do something right now (healing is handled separately). */
function isUsefulSupport(ctx: Ctx, move: MoveDef): boolean {
  if (move.category !== 'status') return false;
  const target = creature(ctx, 'player');
  return (move.effects ?? []).some((fx) => {
    if (fx.kind === 'status') return canInflict(target, fx.status);
    if (fx.kind !== 'stat') return false;
    const stages = ctx.fighters[fx.who === 'self' ? 'enemy' : 'player'].stages;
    return fx.stages > 0 ? stages[fx.stat] < 2 : stages[fx.stat] > -2;
  });
}
