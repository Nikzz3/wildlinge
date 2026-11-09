/** AREA 2 maps (chapter 2: Pfad 2 → Flüsterwald → Seewil) — see docs/WORLD.md and src/world/area2/. */
import type { MapDef } from '../core/contracts';
import { FLUESTERWALD } from './area2/fluesterwald';
import { PFAD_2 } from './area2/pfad2';
import { SEEWIL, SEEWIL_CENTER, SEEWIL_HALL, SEEWIL_HOUSE_1, SEEWIL_HOUSE_2, SEEWIL_SHOP } from './area2/seewil';

export const AREA2_MAPS: MapDef[] = [
  PFAD_2,
  FLUESTERWALD,
  SEEWIL,
  SEEWIL_CENTER,
  SEEWIL_SHOP,
  SEEWIL_HOUSE_1,
  SEEWIL_HOUSE_2,
  SEEWIL_HALL,
];
