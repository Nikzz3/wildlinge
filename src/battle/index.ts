import type { BattleSetup, GameContext } from '../core/contracts';
import type { BattleOutcome, Creature } from '../core/types';
import { displayName, evolutionTarget } from '../creature';
import { getSpecies } from '../data';
import { runEvolution } from '../scenes';
import { addCreature, nextUid } from '../state';
import { openNameEntry } from '../ui/screens';
import { getMap } from '../world';
import { createBattle } from './engine';
import { BattleScene } from './scene';
import { runBattle } from './ui/controller';
import { battleMusic } from './ui/playback';
import { BattleTransition } from './ui/transition';

export { createBattle } from './engine';

/**
 * Runs a full battle: transition, battle scene, rewards, capture handling (party/box, Lexikon,
 * nickname), evolutions after the battle. Resolves with the outcome while the screen is still
 * faded out: the caller fades back in (and performs the blackout on 'lose').
 */
export async function startBattle(g: GameContext, setup: BattleSetup): Promise<BattleOutcome> {
  const engine = createBattle(g.state, setup, g.rng);
  const scene = new BattleScene(g, setup);
  g.audio.playMusic(battleMusic(setup));
  g.push(new BattleTransition(g, () => g.replace(scene)));
  let outcome: BattleOutcome;
  try {
    outcome = await runBattle(scene, engine);
  } catch (err) {
    // Never soft-lock the game on a battle bug: report it and leave the battle.
    console.error('[battle]', err);
    outcome = 'run';
  }
  if (outcome === 'caught') await keepCaught(g, setup.enemy[engine.enemyActive]);
  await g.fadeOut(20);
  g.pop(scene);
  if (outcome !== 'lose') await runEvolutions(g, engine.leveledUp);
  return outcome;
}

function currentMapName(g: GameContext): string {
  try {
    return getMap(g.state.player.mapId).name;
  } catch {
    return '';
  }
}

/** uid, met data, party or box — then the optional nickname (a failing prompt never loses the creature). */
async function keepCaught(g: GameContext, c: Creature | undefined): Promise<void> {
  if (!c) return;
  c.uid = nextUid(g.state);
  c.metAt = currentMapName(g);
  c.metLevel = c.level;
  const where = addCreature(g.state, c);
  try {
    const species = getSpecies(c.species).name;
    if (await g.ui.confirm(`Möchtest du ${species} einen Spitznamen geben?`)) {
      const name = (await openNameEntry(g, { title: `Spitzname für ${species}?`, initial: species, maxLen: 10 })).trim();
      c.nickname = name && name !== species ? name : null;
    }
    if (where === 'box') await g.ui.message(`${displayName(c)} wurde in die Box geschickt.`);
  } catch (err) {
    console.error('[battle] nickname', err);
  }
}

/** Evolves healthy party members that leveled up and reached their evolution level; the screen stays faded out. */
async function runEvolutions(g: GameContext, uids: ReadonlySet<number>): Promise<void> {
  for (const uid of uids) {
    const index = g.state.party.findIndex((c) => c.uid === uid);
    const c = g.state.party[index];
    const to = c && c.hp > 0 ? evolutionTarget(c) : null;
    if (to) await runEvolution(g, index, to, { fadeIn: false });
  }
}
