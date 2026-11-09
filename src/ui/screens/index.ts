/** Menu screens. Each opens a modal scene via g.open and resolves when closed. */
import type { GameContext } from '../../core/contracts';
import type { Creature } from '../../core/types';
import { runBag } from './bag';
import { runDex } from './dex';
import { askForgetMove as askForget, learnMoveFlow as learnFlow } from './learn';
import { runNameEntry } from './name-entry';
import { runOptions } from './options';
import { type PartyMode, runParty } from './party';
import { runPc } from './pc';
import { runSaveMenu } from './save';
import { runShop } from './shop';
import { runStartMenu } from './start-menu';
import { openSummary as runSummary } from './summary';
import { runTrainerCard } from './trainer-card';

export type { PartyMode };

/** START menu: Lexikon, Team, Beutel, <Spielername>, Speichern, Optionen, Zurück. */
export function openStartMenu(g: GameContext): Promise<void> {
  return runStartMenu(g);
}

/** Party screen. Returns the chosen party index (battleSwitch/itemTarget/pick) or null if canceled / field mode. */
export function openParty(g: GameContext, mode: PartyMode): Promise<number | null> {
  return runParty(g, mode);
}

/** Summary pages (info, stats, moves) for list[index]; left/right switch pages, up/down switch creatures. */
export async function openSummary(g: GameContext, list: readonly Creature[], index: number): Promise<void> {
  await runSummary(g, list, index);
}

/** Bag. Field mode handles item use itself. Battle mode returns the chosen item (+ target for healing items) without consuming it. */
export function openBag(
  g: GameContext,
  mode: 'field' | 'battle',
): Promise<{ itemId: string; partyIndex?: number } | null> {
  return runBag(g, mode);
}

export function openDex(g: GameContext): Promise<void> {
  return runDex(g);
}

/** Buy (from itemIds) / sell (from bag) menu. */
export function openShop(g: GameContext, itemIds: readonly string[]): Promise<void> {
  return runShop(g, itemIds);
}

/** PC storage: deposit / withdraw between party and box (party must keep ≥ 1 healthy creature). */
export function openPc(g: GameContext): Promise<void> {
  return runPc(g);
}

/** On-screen keyboard. Returns the entered name (never empty: falls back to `initial`). */
export function openNameEntry(g: GameContext, opts: { title: string; initial: string; maxLen: number }): Promise<string> {
  return runNameEntry(g, opts);
}

export function openOptions(g: GameContext): Promise<void> {
  return runOptions(g);
}

export function openTrainerCard(g: GameContext): Promise<void> {
  return runTrainerCard(g);
}

/** "Spiel speichern?" flow with summary (name, badges, Lexikon, time). Returns true if saved. */
export function openSaveMenu(g: GameContext): Promise<boolean> {
  return runSaveMenu(g);
}

/**
 * Dialog for a creature that wants to learn `moveId` but already knows 4 moves:
 * "X möchte Y lernen … Soll X eine Attacke vergessen?" → pick the move to forget (shows move details).
 * Returns the index 0..3 to forget, or null if the new move should not be learned. Does NOT mutate.
 */
export function askForgetMove(g: GameContext, creature: Creature, moveId: string): Promise<number | null> {
  return askForget(g, creature, moveId);
}

/**
 * Full learn flow outside battle (evolution, candy): learns directly if a slot is free, otherwise
 * askForgetMove + replace. Shows the German messages. Returns true if learned.
 */
export function learnMoveFlow(g: GameContext, creature: Creature, moveId: string): Promise<boolean> {
  return learnFlow(g, creature, moveId);
}
