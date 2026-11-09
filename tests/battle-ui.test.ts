import { describe, expect, it } from 'vitest';
import { createBattle } from '../src/battle/engine';
import { gridTarget } from '../src/battle/ui/menus';
import {
  battleMusic, levelUpWindows, needsFinalConfirm, trainerReturnIndex, victoryMusic, waitingMessage,
} from '../src/battle/ui/sequence';
import type { BattleEvent, BattleSetup } from '../src/core/contracts';
import { createRng } from '../src/core/rng';
import type { Stats, TrainerDef } from '../src/core/types';
import { createCreature } from '../src/creature';
import { newGameState } from '../src/state';

const STATS: Stats = { hp: 20, atk: 10, def: 10, mag: 10, res: 10, spd: 10 };
const msg = (text: string): BattleEvent => ({ t: 'msg', text });

const trainer: TrainerDef = {
  id: 't', className: 'Wanderer', name: 'Hans', sprite: 'hiker', party: [], reward: 100,
  intro: '', defeat: 'Uff!', after: '', ai: 'basic',
};

/** Plays a Lv 50 Zündli (Stupser) against a Lv 2 enemy party until the battle ends; returns the last batch. */
function finalBatch(setup: Omit<BattleSetup, 'enemy' | 'background'>, enemies = 1) {
  const state = newGameState({ mapId: 'test', x: 0, y: 0, facing: 'down' });
  state.party = [createCreature('zuendli', 50, createRng(1), { uid: 1, moves: ['stupser'] })];
  const enemy = Array.from({ length: enemies }, (_, i) => createCreature('munggli', 2, createRng(2 + i), { moves: ['brummbass'] }));
  const b = createBattle(state, { ...setup, enemy, background: 'grass' }, createRng(7));
  b.start();
  let events: BattleEvent[] = [];
  for (let guard = 0; b.prompt.kind === 'action' && guard < 20; guard++) events = b.act({ kind: 'move', index: 0 });
  return { events, prompt: b.prompt };
}

describe('battle menus', () => {
  it('moves the 2×2 cursor to absolute cells, so holding a direction never flips back', () => {
    expect([0, 1, 2, 3].map((i) => gridTarget(i, 'right'))).toEqual([1, 1, 3, 3]);
    expect([0, 1, 2, 3].map((i) => gridTarget(i, 'left'))).toEqual([0, 0, 2, 2]);
    expect([0, 1, 2, 3].map((i) => gridTarget(i, 'down'))).toEqual([2, 3, 2, 3]);
    expect([0, 1, 2, 3].map((i) => gridTarget(i, 'up'))).toEqual([0, 1, 0, 1]);
  });
});

describe('battle event sequencing', () => {
  it('a won wild battle ends with an exp fill after the last message, so it is confirmed before the fade-out', () => {
    const { events, prompt } = finalBatch({ kind: 'wild' });
    expect(prompt).toEqual({ kind: 'done', outcome: 'win' });
    expect(waitingMessage(events)).toBe(-1);
    expect(needsFinalConfirm(events, prompt)).toBe(true);
  });

  it('a won trainer battle waits on the prize message and brings the trainer back at the victory line', () => {
    const { events, prompt } = finalBatch({ kind: 'trainer', trainer });
    const texts = events.map((e) => (e.t === 'msg' ? e.text : e.t));
    expect(texts[waitingMessage(events)]).toBe('{PLAYER} erhält 100 Fr. Preisgeld!');
    expect(needsFinalConfirm(events, prompt)).toBe(false);
    expect(texts[trainerReturnIndex(events, trainer, prompt)]).toBe('{PLAYER} hat Wanderer Hans besiegt!');
    expect(trainerReturnIndex(events, trainer, { kind: 'action' })).toBe(-1);
  });

  it('a message followed by an animation does not wait; one followed only by money/end does', () => {
    expect(waitingMessage([msg('Los, Zündli!'), { t: 'sendOut', side: 'player', partyIndex: 0 }])).toBe(-1);
    expect(waitingMessage([msg('a'), msg('Glücklich entkommen!'), { t: 'end', outcome: 'run' }])).toBe(1);
  });

  it('opens each level-up window after its message and HP gain, before the next level-up', () => {
    const level = (n: number): BattleEvent[] => [
      msg(`Zündli erreicht Level ${n}!`),
      { t: 'levelUp', partyIndex: 0, level: n, before: STATS, after: STATS },
      { t: 'hp', side: 'player', from: 10, to: 12, max: 22 },
    ];
    const events: BattleEvent[] = [
      msg('Zündli erhält 90 ERF-Punkte!'), { t: 'exp', partyIndex: 0, from: 0, to: 10 }, ...level(7),
      { t: 'exp', partyIndex: 0, from: 10, to: 20 }, ...level(8), msg('Zündli erlernt Flämmchen!'),
    ];
    expect([...levelUpWindows(events)]).toEqual([[4, [3]], [8, [7]]]);
  });

  it('picks battle and victory music by kind, trainer music and leader class', () => {
    const wild: BattleSetup = { kind: 'wild', enemy: [], background: 'grass' };
    const leader: BattleSetup = { kind: 'trainer', enemy: [], background: 'hall', trainer: { ...trainer, className: 'Hüter', music: 'battle_leader' } };
    const rival: BattleSetup = { kind: 'trainer', enemy: [], background: 'indoor', trainer: { ...trainer, music: 'battle_rival' } };
    expect([battleMusic(wild), victoryMusic(wild)]).toEqual(['battle_wild', 'victory_wild']);
    expect([battleMusic(leader), victoryMusic(leader)]).toEqual(['battle_leader', 'victory_leader']);
    expect([battleMusic(rival), victoryMusic(rival)]).toEqual(['battle_rival', 'victory_trainer']);
    expect(battleMusic({ ...wild, music: 'battle_legend' })).toBe('battle_legend');
  });
});
