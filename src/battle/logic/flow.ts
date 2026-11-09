/** The battle as a coroutine: intro, turns, faints and replacements. Yields prompts, returns the outcome. */
import type { PlayerAction, Side } from '../../core/contracts';
import type { BattleOutcome } from '../../core/types';
import { displayName } from '../../creature';
import { firstHealthy } from '../../state';
import { planEnemy } from './ai';
import { type Ctx, creature, emit, type Flow, isTrainer, other, say, sendOut, team, trainerLabel, who } from './context';
import { tryRun, useBagItem, useTrainerItem } from './items';
import { hasUsableMove, type MoveChoice, moveOf, useMove } from './moves';
import { awardExp, trainerVictory } from './rewards';
import { effectiveSpeed, residualDamage } from './status';

export function* battleFlow(ctx: Ctx): Flow<BattleOutcome> {
  intro(ctx);
  if (firstHealthy(ctx.state) < 0) return lose(ctx);
  sendPlayer(ctx, firstHealthy(ctx.state));
  for (;;) {
    const answer = yield { kind: 'action' };
    if (answer.kind !== 'action') throw new Error(`battle: expected an action, got ${answer.kind}`);
    const outcome = yield* turn(ctx, answer.action);
    if (outcome) return outcome;
  }
}

function intro(ctx: Ctx): void {
  const index = ctx.fighters.enemy.index;
  const enemy = ctx.setup.enemy[index];
  if (!enemy) throw new Error('battle: setup.enemy is empty');
  if (isTrainer(ctx)) {
    say(ctx, `${trainerLabel(ctx)} fordert dich heraus!`);
    sendOut(ctx, 'enemy', index, `${trainerLabel(ctx)} schickt ${displayName(enemy)} in den Kampf!`);
  } else {
    sendOut(ctx, 'enemy', index, `Ein wildes ${displayName(enemy)} erscheint!`);
  }
}

function sendPlayer(ctx: Ctx, partyIndex: number): void {
  const c = ctx.state.party[partyIndex];
  if (!c) throw new Error(`battle: no party member ${partyIndex}`);
  sendOut(ctx, 'player', partyIndex, `Los, ${displayName(c)}!`);
}

function lose(ctx: Ctx): BattleOutcome {
  say(ctx, '{PLAYER} hat keine kampffähigen Wildlinge mehr!');
  return 'lose';
}

/**
 * One full turn: switch/item/run first, then moves by priority and speed, then status damage.
 * The first side to run out of creatures loses, even if the other side runs out later in the same
 * turn (e.g. the player's last creature knocks out the last enemy and then faints from recoil).
 */
function* turn(ctx: Ctx, action: PlayerAction): Flow<BattleOutcome | null> {
  for (const side of SIDES) {
    ctx.fighters[side].moved = false;
    ctx.fighters[side].flinch = false;
  }
  const plan = planEnemy(ctx);

  switch (action.kind) {
    case 'run':
      if (tryRun(ctx)) return 'run';
      break;
    case 'switch':
      say(ctx, `${displayName(creature(ctx, 'player'))}, komm zurück!`);
      emit(ctx, { t: 'withdraw', side: 'player' });
      sendPlayer(ctx, action.partyIndex);
      break;
    case 'item':
      if (useBagItem(ctx, action.itemId, action.partyIndex)) return 'caught';
      break;
    case 'move':
      break;
  }
  if (plan.kind === 'item') useTrainerItem(ctx, plan.itemIndex);

  const moves: Move[] = [];
  if (action.kind === 'move') {
    moves.push({ side: 'player', choice: hasUsableMove(creature(ctx, 'player')) ? action.index : 'struggle' });
  }
  if (plan.kind === 'move') moves.push({ side: 'enemy', choice: plan.choice });
  let beaten: Side | null = null;
  for (const { side, choice } of moveOrder(ctx, moves)) {
    if (ctx.fighters[side].down || ctx.fighters[other(side)].down) continue;
    useMove(ctx, side, choice);
    const wiped = yield* faints(ctx, [other(side), side]);
    beaten ??= wiped;
  }

  // Status damage only while both sides still have creatures.
  for (const side of speedOrder(ctx)) {
    if (beaten || ctx.fighters[side].down) continue;
    residualDamage(ctx, side);
    beaten = yield* faints(ctx, [side]);
  }
  for (const side of SIDES) ctx.fighters[side].turns++;
  if (beaten) return finish(ctx, beaten);
  yield* replaceFainted(ctx);
  return null;
}

const SIDES: readonly Side[] = ['player', 'enemy'];

interface Move {
  side: Side;
  choice: MoveChoice;
}

/** Higher priority first, then higher effective speed, ties random. */
function moveOrder(ctx: Ctx, moves: Move[]): Move[] {
  const [a, b] = moves;
  if (!a || !b) return moves;
  const priority = (m: Move) => moveOf(creature(ctx, m.side), m.choice).priority ?? 0;
  if (priority(a) !== priority(b)) return priority(a) > priority(b) ? [a, b] : [b, a];
  const speedA = effectiveSpeed(ctx, a.side);
  const speedB = effectiveSpeed(ctx, b.side);
  if (speedA !== speedB) return speedA > speedB ? [a, b] : [b, a];
  return ctx.rng.chance(0.5) ? [a, b] : [b, a];
}

/** Faster side first (player on ties) — used for end-of-turn effects. */
function speedOrder(ctx: Ctx): Side[] {
  return effectiveSpeed(ctx, 'enemy') > effectiveSpeed(ctx, 'player') ? ['enemy', 'player'] : ['player', 'enemy'];
}

/**
 * Announces newly fainted creatures (in the given order); a fainted enemy gives EXP right away.
 * Returns the first of these sides that has no creature left, else null.
 */
function* faints(ctx: Ctx, sides: Side[]): Flow<Side | null> {
  let beaten: Side | null = null;
  for (const side of sides) {
    const fighter = ctx.fighters[side];
    const c = creature(ctx, side);
    if (fighter.down || c.hp > 0) continue;
    fighter.down = true;
    emit(ctx, { t: 'faint', side });
    say(ctx, `${who(ctx, side)} ist kampfunfähig!`);
    c.status = null;
    c.statusTurns = 0;
    if (side === 'enemy') yield* awardExp(ctx, fighter.index);
    if (!beaten && !team(ctx, side).some((m) => m.hp > 0)) beaten = side;
  }
  return beaten;
}

/** The battle is decided: `beaten` has no creatures left. */
function finish(ctx: Ctx, beaten: Side): BattleOutcome {
  if (beaten === 'player') return lose(ctx);
  if (isTrainer(ctx)) trainerVictory(ctx);
  return 'win';
}

/** Both sides still have creatures: bring in replacements (enemy first, then the player's choice). */
function* replaceFainted(ctx: Ctx): Flow {
  if (ctx.fighters.enemy.down) {
    const next = ctx.setup.enemy.findIndex((c) => c.hp > 0);
    const c = ctx.setup.enemy[next];
    if (c) sendOut(ctx, 'enemy', next, `${trainerLabel(ctx)} schickt ${displayName(c)} in den Kampf!`);
  }
  if (ctx.fighters.player.down) {
    const answer = yield { kind: 'switch' };
    if (answer.kind !== 'switch') throw new Error(`battle: expected a switch, got ${answer.kind}`);
    sendPlayer(ctx, answer.partyIndex);
  }
}
