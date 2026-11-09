import type { BattleEngine, BattleEvent, BattlePrompt, BattleSetup, PlayerAction } from '../core/contracts';
import type { Rng } from '../core/rng';
import type { SaveData } from '../core/types';
import { type Answer, createCtx } from './logic/context';
import { battleFlow } from './logic/flow';
import { validateAction, validateForget, validateSwitch } from './logic/validate';

/**
 * Pure battle engine: mutates state.party / setup.enemy creatures, state.bag and state.money,
 * and returns events in display order. The battle itself is a coroutine (logic/flow.ts) that
 * pauses at prompts ('action', 'switch', 'learn') and resumes with the player's answer.
 */
export function createBattle(state: SaveData, setup: BattleSetup, rng: Rng): BattleEngine {
  const ctx = createCtx(state, setup, rng);
  const flow = battleFlow(ctx);
  let prompt: BattlePrompt = { kind: 'action' };
  let started = false;

  const drain = (): BattleEvent[] => ctx.events.splice(0);

  /** Runs the coroutine to its next prompt (or the end) and returns the produced events. */
  const resume = (answer?: Answer): BattleEvent[] => {
    const step = answer === undefined ? flow.next() : flow.next(answer);
    if (step.done) {
      prompt = { kind: 'done', outcome: step.value };
      ctx.events.push({ t: 'end', outcome: step.value });
    } else {
      prompt = step.value;
    }
    return drain();
  };

  const expect = (kind: BattlePrompt['kind']): void => {
    if (!started) throw new Error('battle: call start() first');
    if (prompt.kind !== kind) throw new Error(`battle: prompt is '${prompt.kind}', not '${kind}'`);
  };

  /** Rejected choices keep the prompt and only explain why. */
  const refuse = (text: string): BattleEvent[] => [{ t: 'msg', text }];

  return {
    setup,
    get playerActive() {
      return ctx.fighters.player.index;
    },
    get enemyActive() {
      return ctx.fighters.enemy.index;
    },
    get prompt() {
      return prompt;
    },
    leveledUp: ctx.leveledUp,
    stages: (side) => ({ ...ctx.fighters[side].stages }),
    start() {
      if (started) throw new Error('battle: start() called twice');
      started = true;
      return resume();
    },
    validate(action: PlayerAction) {
      if (started && prompt.kind === 'action') return validateAction(ctx, action);
      if (started && prompt.kind === 'switch' && action.kind === 'switch') return validateSwitch(ctx, action.partyIndex);
      return 'Jetzt nicht!';
    },
    act(action) {
      expect('action');
      const reason = validateAction(ctx, action);
      return reason ? refuse(reason) : resume({ kind: 'action', action });
    },
    switchTo(partyIndex) {
      expect('switch');
      const reason = validateSwitch(ctx, partyIndex);
      return reason ? refuse(reason) : resume({ kind: 'switch', partyIndex });
    },
    learn(forgetIndex) {
      expect('learn');
      const reason = prompt.kind === 'learn' && forgetIndex !== null ? validateForget(ctx, prompt.partyIndex, forgetIndex) : null;
      return reason ? refuse(reason) : resume({ kind: 'learn', forget: forgetIndex });
    },
  };
}
