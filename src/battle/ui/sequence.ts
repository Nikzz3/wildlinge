/** Pure sequencing decisions for playing a batch of battle events (unit tested; used by playback.ts). */
import type { BattleEvent, BattlePrompt, BattleSetup } from '../../core/contracts';
import type { BattleOutcome, MusicId, TrainerDef } from '../../core/types';

const LEADER_CLASSES = ['Hüter', 'Hüterin'];

export function battleMusic(setup: BattleSetup): MusicId {
  return setup.music ?? setup.trainer?.music ?? (setup.kind === 'wild' ? 'battle_wild' : 'battle_trainer');
}

export function victoryMusic(setup: BattleSetup): MusicId {
  if (setup.kind === 'wild') return 'victory_wild';
  const leader = LEADER_CLASSES.includes(setup.trainer?.className ?? '') || battleMusic(setup) === 'battle_leader';
  return leader ? 'victory_leader' : 'victory_trainer';
}

export function outcomeOf(prompt: BattlePrompt): BattleOutcome | null {
  return prompt.kind === 'done' ? prompt.outcome : null;
}

/**
 * Index of the message that waits for A: the last message of the batch, unless an animation still
 * follows it (e.g. "Los, Flämmli!" + sendOut, or "… erhält 12 ERF-Punkte!" + the exp fill). -1 = none.
 */
export function waitingMessage(events: readonly BattleEvent[]): number {
  let last = -1;
  events.forEach((e, i) => {
    if (e.t === 'msg') last = i;
  });
  if (last < 0 || events.slice(last + 1).some((e) => e.t !== 'money' && e.t !== 'end')) return -1;
  return last;
}

/** The battle ends with this batch but no message waited for A: confirm the last one before the fade-out. */
export function needsFinalConfirm(events: readonly BattleEvent[], prompt: BattlePrompt): boolean {
  return prompt.kind === 'done' && waitingMessage(events) < 0 && events.some((e) => e.t === 'msg');
}

/**
 * In a won trainer battle the trainer slides back in for the closing messages: at the first message
 * naming the trainer after the last faint / exp / level-up, else right after those. Returns the index or -1.
 */
export function trainerReturnIndex(events: readonly BattleEvent[], trainer: TrainerDef | undefined, prompt: BattlePrompt): number {
  if (!trainer || outcomeOf(prompt) !== 'win') return -1;
  let last = -1;
  events.forEach((e, i) => {
    if (e.t === 'faint' || e.t === 'exp' || e.t === 'levelUp') last = i;
  });
  const label = `${trainer.className} ${trainer.name}`;
  const named = events.findIndex((e, i) => i > last && e.t === 'msg' && e.text.includes(label));
  if (named >= 0) return named;
  return last + 1 < events.length ? last + 1 : -1;
}

/**
 * When the level-up stats windows open: after-event index → indices of the 'levelUp' events whose window
 * opens right after it. A window opens once its "… erreicht Level N!" message has been shown (the message
 * may come before or after the event) and the HP gain that follows the event has been applied; a pending
 * window opens before the next level-up, and at the latest after the last event.
 */
export function levelUpWindows(events: readonly BattleEvent[]): Map<number, number[]> {
  const windows = new Map<number, number[]>();
  const open = (after: number, levelUp: number) => windows.set(after, [...(windows.get(after) ?? []), levelUp]);
  let pending = -1;
  let afterMsg = false;
  events.forEach((ev, i) => {
    if (ev.t === 'levelUp') {
      if (pending >= 0) open(i - 1, pending);
      pending = i;
      afterMsg = events[i - 1]?.t !== 'msg';
    }
    const due = afterMsg ? ev.t === 'msg' : events[i + 1]?.t !== 'hp';
    if (pending >= 0 && due) {
      open(i, pending);
      pending = -1;
    }
  });
  if (pending >= 0) open(events.length - 1, pending);
  return windows;
}
