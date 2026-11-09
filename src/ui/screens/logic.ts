/** Pure helpers for the menu screens (no DOM, no game context). */
import type { Creature, ItemDef, ItemPocket, SaveData } from '../../core/types';
import { useItemOn } from '../../creature';
import { ITEMS } from '../../data';
import { BADGES } from '../../data/badges';

/** Items that are applied to one creature (party target needed). */
export function isCreatureTargeted(item: ItemDef): boolean {
  switch (item.use.kind) {
    case 'heal':
    case 'cure':
    case 'restore':
    case 'revive':
    case 'pp':
    case 'candy':
      return true;
    default:
      return false;
  }
}

export function usableInBattle(item: ItemDef): boolean {
  return item.usable === 'battle' || item.usable === 'both';
}

export function usableInField(item: ItemDef): boolean {
  return item.usable === 'field' || item.usable === 'both';
}

export function sellPrice(item: ItemDef): number {
  return Math.floor(item.price / 2);
}

export function canSell(item: ItemDef): boolean {
  return item.pocket !== 'key' && item.price > 0;
}

/** Money cap (same as addMoney in src/state). */
export const MONEY_MAX = 999999;

/** How many of `have` items can be sold at `unit` each without the money cap swallowing any of the proceeds. */
export function sellMax(have: number, unit: number, money: number): number {
  if (unit <= 0) return 0;
  return Math.max(0, Math.min(have, Math.floor((MONEY_MAX - money) / unit)));
}

/** Bag contents of one pocket in data order. */
export function pocketItems(s: SaveData, pocket: ItemPocket, filter: (item: ItemDef) => boolean = () => true): ItemDef[] {
  return ITEMS.filter((it) => it.pocket === pocket && (s.bag[it.id] ?? 0) > 0 && filter(it));
}

export interface ItemPreview {
  ok: boolean;
  label: string;
}

/** What the item would do to this creature, as a short label ("+20 LP", "Heilt", "Nutzlos"). Does not mutate. */
export function itemPreview(c: Creature, item: ItemDef): ItemPreview {
  const clone = structuredClone(c);
  const r = useItemOn(clone, item);
  if (!r.ok) return { ok: false, label: 'Nutzlos' };
  const gained = clone.hp - Math.max(0, c.hp);
  switch (item.use.kind) {
    case 'heal':
    case 'revive':
      return { ok: true, label: `+${gained} LP` };
    case 'restore':
      return { ok: true, label: gained > 0 ? `+${gained} LP` : 'Heilt' };
    case 'pp':
      return { ok: true, label: '+EN' };
    case 'candy':
      return { ok: true, label: `Lv${clone.level}` };
    default:
      return { ok: true, label: 'Heilt' };
  }
}

/** Healthy = not fainted. */
export function isHealthy(c: Creature): boolean {
  return c.hp > 0;
}

/** Stable 5-digit trainer number derived from the name (FNV-1a). */
export function trainerNumber(name: string): string {
  let h = 0x811c9dc5;
  for (const ch of name) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return String(h % 100000).padStart(5, '0');
}

/**
 * Which of the 4 badge slots (story order of data/badges.ts: Erde, Wasser, Blitz, Frost) are earned.
 * Unknown ids fill the first free slots in the order earned.
 */
export function badgeSlots(badges: readonly string[]): boolean[] {
  const slots = BADGES.map((b) => badges.includes(b.id));
  let unknown = 0;
  for (const id of badges) if (!BADGES.some((b) => b.id === id)) unknown++;
  for (let n = 0; n < unknown; n++) {
    const free = slots.indexOf(false);
    if (free >= 0) slots[free] = true;
  }
  return slots;
}

/** "0,4 m" style German decimal. */
export function decimal(v: number, digits = 1): string {
  return v.toFixed(digits).replace('.', ',');
}

export function dexNo(n: number): string {
  return String(n).padStart(3, '0');
}

// ---------------------------------------------------------------------------
// Name entry keyboard
// ---------------------------------------------------------------------------

export const KEY_COLS = 10;

/** Keyboard pages: 3 rows × 10 columns each; ' ' = empty cell. */
export const KEY_PAGES: readonly { label: string; rows: readonly string[] }[] = [
  { label: 'ABC', rows: ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ-.!?'] },
  { label: 'abc', rows: ['abcdefghij', 'klmnopqrst', 'uvwxyz-.!?'] },
  { label: 'ÄÖ1', rows: ['ÄÖÜäöüß-.!', "?',&      ", '0123456789'] },
];

/** Character at a keyboard cell, or null for an empty cell. */
export function keyAt(page: number, row: number, col: number): string | null {
  const ch = KEY_PAGES[page]?.rows[row]?.[col];
  return ch && ch !== ' ' ? ch : null;
}

/** Final name: trimmed, or the fallback when empty. */
export function finalName(entered: string, fallback: string): string {
  const t = entered.trim();
  return t.length > 0 ? t : fallback;
}
