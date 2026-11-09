/** Lookup helpers over static data. Throw on unknown ids (fail fast on typos). */
import type { ItemDef, MoveDef, SpeciesDef, TrainerDef, TypeId } from '../core/types';
import { DEV_TRAINERS } from './dev-trainers';
import { ITEMS } from './items';
import { MOVES } from './moves';
import { SPECIES } from './species';
import { TRAINERS } from './trainers';
import { TYPE_CHART } from './typechart';

export { ITEMS, MOVES, SPECIES, TRAINERS, TYPE_CHART };

function index<T extends { id: string }>(items: readonly T[], what: string): (id: string) => T {
  let byId: Map<string, T> | null = null;
  return (id) => {
    byId ??= new Map(items.map((it) => [it.id, it]));
    const found = byId.get(id);
    if (!found) throw new Error(`Unknown ${what} "${id}"`);
    return found;
  };
}

export const getSpecies: (id: string) => SpeciesDef = index(SPECIES, 'species');
export const getMove: (id: string) => MoveDef = index(MOVES, 'move');
export const getItem: (id: string) => ItemDef = index(ITEMS, 'item');
export const getTrainer: (id: string) => TrainerDef = index([...TRAINERS, ...DEV_TRAINERS], 'trainer');

export function hasSpecies(id: string): boolean {
  return SPECIES.some((s) => s.id === id);
}

/** Combined multiplier of an attacking type against a defender's types. */
export function typeEffectiveness(attack: TypeId, defender: readonly TypeId[]): number {
  return defender.reduce((m, t) => m * (TYPE_CHART[attack]?.[t] ?? 1), 1);
}

/** Species sorted by Lexikon number. */
export function speciesByDex(): SpeciesDef[] {
  return [...SPECIES].sort((a, b) => a.dexNo - b.dexNo);
}
