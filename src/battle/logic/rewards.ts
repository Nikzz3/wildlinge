/** EXP, level-ups, learning moves and the trainer's prize. */
import { displayName, expForLevel, MAX_LEVEL, movesLearnedAt, replaceMove, setLevel, tryAddMove } from '../../creature';
import { getMove, getSpecies } from '../../data';
import { addMoney } from '../../state';
import { expYield } from './calc';
import { type Ctx, emit, type Flow, isTrainer, say, trainerLabel } from './context';

/** Gives EXP for the defeated enemy at `enemyIndex` to every standing participant. */
export function* awardExp(ctx: Ctx, enemyIndex: number): Flow {
  const enemy = ctx.setup.enemy[enemyIndex];
  if (!enemy) return;
  const amount = expYield(getSpecies(enemy.species).baseExp, enemy.level, isTrainer(ctx));
  const receivers = [...(ctx.participants.get(enemyIndex) ?? [])].sort((a, b) => a - b);
  for (const partyIndex of receivers) {
    const c = ctx.state.party[partyIndex];
    if (c && c.hp > 0 && c.level < MAX_LEVEL) yield* gainExp(ctx, partyIndex, amount);
  }
}

/** Adds EXP; emits one 'exp' event per level segment so EXP bars can fill, reset and fill again. */
function* gainExp(ctx: Ctx, partyIndex: number, amount: number): Flow {
  const c = ctx.state.party[partyIndex];
  if (!c) return;
  const growth = getSpecies(c.species).growth;
  const total = Math.min(c.exp + amount, expForLevel(growth, MAX_LEVEL));
  say(ctx, `${displayName(c)} erhält ${amount} ERF-Punkte!`);
  for (;;) {
    const from = c.exp;
    const next = c.level < MAX_LEVEL ? expForLevel(growth, c.level + 1) : Number.POSITIVE_INFINITY;
    const to = Math.min(total, next);
    if (to > from) {
      c.exp = to;
      emit(ctx, { t: 'exp', partyIndex, from, to });
    }
    if (to < next) return;
    yield* levelUp(ctx, partyIndex);
    if (c.exp >= total) return;
  }
}

function* levelUp(ctx: Ctx, partyIndex: number): Flow {
  const c = ctx.state.party[partyIndex];
  if (!c) return;
  const hp = c.hp;
  const { before, after } = setLevel(c, c.level + 1);
  ctx.leveledUp.add(c.uid);
  say(ctx, `${displayName(c)} erreicht Level ${c.level}!`);
  emit(ctx, { t: 'levelUp', partyIndex, level: c.level, before, after });
  // The HP gain of the active creature follows as its own 'hp' event (the UI must not pre-apply it).
  if (partyIndex === ctx.fighters.player.index && c.hp !== hp) {
    emit(ctx, { t: 'hp', side: 'player', from: hp, to: c.hp, max: after.hp });
  }
  for (const moveId of movesLearnedAt(c.species, c.level)) yield* learnMove(ctx, partyIndex, moveId);
}

/** Learns into a free slot, or asks which move to forget (prompt 'learn'). */
function* learnMove(ctx: Ctx, partyIndex: number, moveId: string): Flow {
  const c = ctx.state.party[partyIndex];
  if (!c || c.moves.some((m) => m.id === moveId)) return;
  const name = displayName(c);
  const move = getMove(moveId).name;
  if (tryAddMove(c, moveId)) {
    say(ctx, `${name} erlernt ${move}!`);
    return;
  }
  const answer = yield { kind: 'learn', partyIndex, moveId };
  const forget = answer.kind === 'learn' ? answer.forget : null;
  const old = forget === null ? undefined : c.moves[forget];
  if (forget === null || !old) {
    say(ctx, `${name} hat ${move} nicht erlernt.`);
    return;
  }
  replaceMove(c, forget, moveId);
  say(ctx, `${name} vergisst ${getMove(old.id).name} und erlernt ${move}!`);
}

/** Victory text, the trainer's defeat line and the prize money (msg first, then the 'money' event). */
export function trainerVictory(ctx: Ctx): void {
  const trainer = ctx.setup.trainer;
  say(ctx, `{PLAYER} hat ${trainerLabel(ctx)} besiegt!`);
  if (!trainer) return;
  if (trainer.defeat) say(ctx, trainer.defeat);
  if (trainer.reward > 0) {
    addMoney(ctx.state, trainer.reward);
    say(ctx, `{PLAYER} erhält ${trainer.reward} Fr. Preisgeld!`);
    emit(ctx, { t: 'money', amount: trainer.reward });
  }
}
