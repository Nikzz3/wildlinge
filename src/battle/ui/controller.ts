/** Battle prompt loop: intro → events → (choose action / replacement / move to forget → events)* → outcome. */
import type { BattleEngine, BattlePrompt, PlayerAction } from '../../core/contracts';
import type { BattleOutcome } from '../../core/types';
import { displayName } from '../../creature';
import { askForgetMove, openBag, openParty } from '../../ui/screens';
import type { BattleScene } from '../scene';
import { intro } from './anims';
import { playEvents } from './playback';

export async function runBattle(s: BattleScene, engine: BattleEngine): Promise<BattleOutcome> {
  await s.entered;
  await intro(s);
  await playEvents(s, engine.start(), engine);
  for (;;) {
    s.syncShadows();
    const p = engine.prompt;
    if (p.kind === 'done') return p.outcome;
    let events;
    if (p.kind === 'action') events = engine.act(await chooseAction(s, engine));
    else if (p.kind === 'switch') events = engine.switchTo(await chooseReplacement(s, engine));
    else events = engine.learn(await chooseForget(s, p));
    await playEvents(s, events, engine);
  }
}

/** Command menu → sub menus until a valid action is chosen. */
async function chooseAction(s: BattleScene, engine: BattleEngine): Promise<PlayerAction> {
  const g = s.g;
  for (;;) {
    const creature = g.state.party[engine.playerActive];
    if (!creature) throw new Error(`battle: no active party creature at ${engine.playerActive}`);
    const command = await s.chooseCommand(displayName(creature));
    let action: PlayerAction | null = null;
    if (command === 0) action = await chooseMove(s, engine);
    else if (command === 1) {
      const pick = await openBag(g, 'battle');
      if (pick) action = pick.partyIndex === undefined ? { kind: 'item', itemId: pick.itemId } : { kind: 'item', itemId: pick.itemId, partyIndex: pick.partyIndex };
    } else if (command === 2) {
      const index = await openParty(g, { kind: 'battleSwitch', activeIndex: engine.playerActive, forced: false });
      if (index !== null) action = { kind: 'switch', partyIndex: index };
    } else action = { kind: 'run' };
    if (!action) continue;
    const reason = engine.validate(action);
    if (!reason) return action;
    await refuse(s, reason);
  }
}

/** Move menu; null when canceled. Invalid picks (no EN) show the reason and stay in the menu. */
async function chooseMove(s: BattleScene, engine: BattleEngine): Promise<PlayerAction | null> {
  for (;;) {
    const creature = s.g.state.party[engine.playerActive];
    if (!creature) return null;
    const index = await s.chooseMove(creature.moves);
    if (index === null) return null;
    const action: PlayerAction = { kind: 'move', index };
    const reason = engine.validate(action);
    if (!reason) return action;
    await refuse(s, reason);
  }
}

/** A refused action ("Keine EN mehr!"): error sound + the reason. */
function refuse(s: BattleScene, reason: string): Promise<void> {
  s.g.audio.playSfx('bump');
  return s.say(reason, true);
}

/** Forced switch after a faint. Falls back to the first healthy creature if the screen gives nothing usable. */
async function chooseReplacement(s: BattleScene, engine: BattleEngine): Promise<number> {
  const party = s.g.state.party;
  const usable = (i: number | null): i is number => i !== null && i !== engine.playerActive && (party[i]?.hp ?? 0) > 0;
  const picked = await openParty(s.g, { kind: 'battleSwitch', activeIndex: engine.playerActive, forced: true });
  if (usable(picked)) return picked;
  const fallback = party.findIndex((c, i) => usable(i) && c.hp > 0);
  return fallback >= 0 ? fallback : engine.playerActive;
}

async function chooseForget(s: BattleScene, p: Extract<BattlePrompt, { kind: 'learn' }>): Promise<number | null> {
  const creature = s.g.state.party[p.partyIndex];
  if (!creature) return null;
  return askForgetMove(s.g, creature, p.moveId);
}
