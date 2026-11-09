/** Using items from the bag outside of battle. */
import type { GameContext } from '../../core/contracts';
import type { ItemDef } from '../../core/types';
import { evolutionTarget, movesLearnedAt, useItemOn } from '../../creature';
import { runEvolution } from '../../scenes';
import { removeItem } from '../../state';
import { learnMoveFlow } from './learn';
import { isCreatureTargeted, usableInField } from './logic';
import { runParty } from './party';

const NOT_NOW = 'Das geht jetzt nicht.';

/** BENUTZEN in the field bag. Consumes the item only if it had an effect. */
export async function useItemInField(g: GameContext, item: ItemDef): Promise<void> {
  if (!usableInField(item)) return g.ui.message(NOT_NOW);
  if (item.use.kind === 'repel') return useRepel(g, item, item.use.steps);
  if (!isCreatureTargeted(item)) return g.ui.message(NOT_NOW);
  if (g.state.party.length === 0) return g.ui.message('Du hast noch keine Wildlinge dabei.');
  await runParty(g, { kind: 'itemTarget', itemId: item.id }, (i) => applyToCreature(g, item, i));
}

async function useRepel(g: GameContext, item: ItemDef, steps: number): Promise<void> {
  if (g.state.repelSteps > 0) return g.ui.message('Der Duft von vorhin wirkt noch.');
  g.state.repelSteps = steps;
  removeItem(g.state, item.id);
  g.audio.playSfx('confirm');
  await g.ui.message(`{PLAYER} versprüht ${item.name}.\nSchwache Wildlinge bleiben fern.`);
}

/** Applies the item to party[i] while the party screen is visible. Returns true to close the party screen. */
async function applyToCreature(g: GameContext, item: ItemDef, i: number): Promise<boolean> {
  const c = g.state.party[i];
  if (!c) return false;
  const result = useItemOn(c, item);
  if (!result.ok) {
    await g.ui.message(result.text);
    return false;
  }
  removeItem(g.state, item.id);
  if (item.use.kind !== 'candy') {
    g.audio.playSfx('heal_hp');
    await g.ui.message(result.text);
    return true;
  }
  void g.audio.playJingle('level_up');
  await g.ui.message(result.text);
  for (const moveId of movesLearnedAt(c.species, c.level)) await learnMoveFlow(g, c, moveId);
  const to = evolutionTarget(c);
  if (to) await runEvolution(g, i, to);
  return true;
}
