/** Map registry. Each area module exports its maps; START is the new-game spawn (defined by area 1). */
import type { MapDef } from '../core/contracts';
import type { Position } from '../core/types';
import { AREA1_MAPS } from './area1';
import { AREA2_MAPS } from './area2';
import { AREA3_MAPS } from './area3';
import { AREA4_MAPS } from './area4';
import { DEV_MAPS } from './dev';
import { START_POSITION } from './start';

const ALL: MapDef[] = [...AREA1_MAPS, ...AREA2_MAPS, ...AREA3_MAPS, ...AREA4_MAPS, ...DEV_MAPS];

export const MAPS: Readonly<Record<string, MapDef>> = Object.fromEntries(ALL.map((m) => [m.id, m]));

export const START: Position = START_POSITION;

export function getMap(id: string): MapDef {
  const m = MAPS[id];
  if (!m) throw new Error(`Unknown map "${id}"`);
  return m;
}
