/** Checks player choices before they are executed. Returns a German reason or null. */
import type { PlayerAction } from '../../core/contracts';
import { displayName, useItemOn } from '../../creature';
import { ITEMS } from '../../data';
import { itemCount } from '../../state';
import { type Ctx, copyCreature, creature, isTrainer } from './context';
import { hasUsableMove } from './moves';

export function canRun(ctx: Ctx): boolean {
  return ctx.setup.canRun ?? ctx.setup.kind === 'wild';
}

export function validateAction(ctx: Ctx, action: PlayerAction): string | null {
  switch (action.kind) {
    case 'move': {
      const c = creature(ctx, 'player');
      const slot = c.moves[action.index];
      if (!slot) return 'Diese Attacke gibt es nicht.';
      // With no EN left at all, any choice becomes struggle.
      return slot.pp <= 0 && hasUsableMove(c) ? 'Keine EN mehr!' : null;
    }
    case 'switch':
      return validateSwitch(ctx, action.partyIndex);
    case 'item':
      return validateItem(ctx, action.itemId, action.partyIndex);
    case 'run':
      if (isTrainer(ctx)) return 'Vor einem Trainerkampf kann man nicht fliehen!';
      return canRun(ctx) ? null : 'Du kannst nicht fliehen!';
  }
}

/** Switching to a party member (voluntary or after a faint). */
export function validateSwitch(ctx: Ctx, partyIndex: number): string | null {
  const c = ctx.state.party[partyIndex];
  if (!c) return 'Diesen Wildling gibt es nicht.';
  if (c.hp <= 0) return `${displayName(c)} ist kampfunfähig!`;
  if (partyIndex === ctx.fighters.player.index) return `${displayName(c)} kämpft bereits!`;
  return null;
}

/** Index of the move to forget when learning a fifth one. */
export function validateForget(ctx: Ctx, partyIndex: number, forgetIndex: number): string | null {
  const known = ctx.state.party[partyIndex]?.moves.length ?? 0;
  return Number.isInteger(forgetIndex) && forgetIndex >= 0 && forgetIndex < known ? null : 'Diese Attacke gibt es nicht.';
}

function validateItem(ctx: Ctx, itemId: string, partyIndex: number | undefined): string | null {
  const item = ITEMS.find((it) => it.id === itemId);
  if (!item || itemCount(ctx.state, itemId) < 1) return 'Davon hast du nichts mehr!';
  if (item.usable !== 'battle' && item.usable !== 'both') return 'Das geht hier nicht!';
  if (item.use.kind === 'crystal') return isTrainer(ctx) ? 'Das geht hier nicht!' : null;
  const target = partyIndex === undefined ? undefined : ctx.state.party[partyIndex];
  if (!target) return 'Wähle einen Wildling!';
  const result = useItemOn(copyCreature(target), item);
  return result.ok ? null : result.text;
}
