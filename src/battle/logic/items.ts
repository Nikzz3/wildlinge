/** Bag items in battle (player), trainer items (enemy), capture and escape. */
import type { ItemDef } from '../../core/types';
import { calcStats, displayName, useItemOn } from '../../creature';
import { getItem, getSpecies } from '../../data';
import { removeItem } from '../../state';
import { rollCapture, rollEscape } from './calc';
import { type Ctx, creature, emit, say, stats, trainerLabel, who } from './context';
import { effectiveSpeed } from './status';

/** Uses a bag item (removing one). Returns true if a crystal caught the wild creature. */
export function useBagItem(ctx: Ctx, itemId: string, partyIndex: number | undefined): boolean {
  const item = getItem(itemId);
  removeItem(ctx.state, itemId);
  if (item.use.kind === 'crystal') return throwCrystal(ctx, item, item.use.rate);
  const target = partyIndex === undefined ? undefined : ctx.state.party[partyIndex];
  if (!target) throw new Error(`battle: item ${itemId} needs a party target`);
  say(ctx, `{PLAYER} setzt ${item.name} ein!`);
  const hp = target.hp;
  const status = target.status;
  const result = useItemOn(target, item);
  if (partyIndex === ctx.fighters.player.index) {
    if (target.hp !== hp) emit(ctx, { t: 'hp', side: 'player', from: hp, to: target.hp, max: calcStats(target).hp });
    if (target.status !== status) emit(ctx, { t: 'status', side: 'player', status: target.status });
  }
  say(ctx, result.text);
  return false;
}

const BROKE_FREE = [
  'Oh nein! Es hat sich sofort befreit!',
  'Schade! Es ist wieder frei!',
  'Mist! Fast hätte es geklappt!',
  'Argh! Das war ganz knapp!',
] as const;

function throwCrystal(ctx: Ctx, item: ItemDef, rate: number): boolean {
  const target = creature(ctx, 'enemy');
  say(ctx, `{PLAYER} wirft einen ${item.name}!`);
  const { shakes, caught } = rollCapture(
    {
      maxHp: stats(ctx, 'enemy').hp,
      hp: target.hp,
      catchRate: getSpecies(target.species).catchRate,
      rate,
      status: target.status,
    },
    ctx.rng,
  );
  emit(ctx, { t: 'throw', itemId: item.id, shakes, caught });
  say(ctx, caught ? `Geschafft! ${displayName(target)} wurde gefangen!` : BROKE_FREE[shakes]);
  return caught;
}

/** A smart trainer uses one of its items on its active creature (each item once). */
export function useTrainerItem(ctx: Ctx, itemIndex: number): void {
  const id = ctx.setup.trainer?.items?.[itemIndex];
  if (id === undefined) return;
  ctx.usedItems.add(itemIndex);
  const item = getItem(id);
  const c = creature(ctx, 'enemy');
  const hp = c.hp;
  const status = c.status;
  say(ctx, `${trainerLabel(ctx)} setzt ${item.name} ein!`);
  const result = useItemOn(c, item);
  if (c.hp !== hp) emit(ctx, { t: 'hp', side: 'enemy', from: hp, to: c.hp, max: stats(ctx, 'enemy').hp });
  if (c.status !== status) emit(ctx, { t: 'status', side: 'enemy', status: c.status });
  say(ctx, c.hp > hp ? `${who(ctx, 'enemy')} wurde um ${c.hp - hp} LP geheilt.` : result.text);
}

/** Wild escape attempt; each failed attempt improves the odds. */
export function tryRun(ctx: Ctx): boolean {
  ctx.runAttempts++;
  const ok = rollEscape(effectiveSpeed(ctx, 'player'), effectiveSpeed(ctx, 'enemy'), ctx.runAttempts, ctx.rng);
  say(ctx, ok ? 'Glücklich entkommen!' : 'Flucht gescheitert!');
  return ok;
}
