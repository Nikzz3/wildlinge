/** Plays a batch of engine events on the scene, one after another. */
import type { BattleEngine, BattleEvent } from '../../core/contracts';
import type { BattleOutcome } from '../../core/types';
import { markSeen } from '../../state';
import type { BattleScene } from '../scene';
import { dodge, expGain, faint, hpChange, levelUp, sendOut, statChange, statusChange, throwCrystal, trainerReturn, withdraw } from './anims';
import { playMoveFx } from './move-fx';
import { levelUpWindows, needsFinalConfirm, outcomeOf, trainerReturnIndex, victoryMusic, waitingMessage } from './sequence';

export { battleMusic } from './sequence';

export async function playEvents(s: BattleScene, events: readonly BattleEvent[], engine: BattleEngine): Promise<void> {
  const prompt = engine.prompt;
  const outcome = outcomeOf(prompt);
  const waitAt = waitingMessage(events);
  const returnAt = trainerReturnIndex(events, s.setup.trainer, prompt);
  const windows = levelUpWindows(events);
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!;
    const next = events[i + 1];
    if (i === returnAt) await trainerReturn(s);
    if (ev.t === 'msg' && next?.t === 'money') s.g.audio.playSfx('buy');
    if (ev.t === 'msg' && next?.t === 'end' && next.outcome === 'run') s.g.audio.playSfx('run');
    await playEvent(s, ev, events[i - 1], i === waitAt, outcome);
    for (const at of windows.get(i) ?? []) {
      const lv = events[at];
      if (lv?.t === 'levelUp') await s.showLevelUp(lv);
    }
  }
  if (needsFinalConfirm(events, prompt)) await s.confirmMessage();
}

async function playEvent(
  s: BattleScene, ev: BattleEvent, prev: BattleEvent | undefined, waitForA: boolean, outcome: BattleOutcome | null,
): Promise<void> {
  const g = s.g;
  switch (ev.t) {
    case 'msg':
      return s.say(ev.text, waitForA);
    case 'sendOut': {
      if (ev.side === 'enemy') {
        const c = s.setup.enemy[ev.partyIndex];
        if (c) markSeen(g.state, c.species);
      }
      return sendOut(s, ev.side, ev.partyIndex);
    }
    case 'withdraw':
      return withdraw(s, ev.side);
    case 'move':
      if (ev.miss) return dodge(s, ev.side === 'player' ? 'enemy' : 'player');
      if (s.anims) return playMoveFx(s, ev.side, ev.moveId);
      return s.wait(s.dur(8));
    case 'hp':
      // HP that grows with a level-up is not a heal: update quietly.
      return hpChange(s, ev, prev?.t === 'levelUp');
    case 'status':
      return statusChange(s, ev.side, ev.status);
    case 'stat':
      return statChange(s, ev.side, ev.stat, ev.stages);
    case 'faint':
      await faint(s, ev.side);
      // The last enemy is down and the battle is won (not a double knock-out the player loses).
      if (ev.side === 'enemy' && outcome === 'win' && s.shadows.enemy.every((m) => m.hp <= 0)) {
        g.audio.playMusic(victoryMusic(s.setup));
      }
      return;
    case 'exp':
      return expGain(s, ev);
    case 'levelUp':
      return levelUp(s, ev);
    case 'throw':
      return throwCrystal(s, ev);
    case 'money':
      if (prev?.t !== 'msg') g.audio.playSfx('buy'); // else it played with the prize message
      return;
    case 'end':
      if (ev.outcome === 'win' || ev.outcome === 'caught') g.audio.playMusic(victoryMusic(s.setup));
      return;
  }
}
