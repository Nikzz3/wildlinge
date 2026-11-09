/** AREA 4 maps (Pfad 4 → Frostalp → Gipfelpfad → Gipfelhorn, the finale) — see docs/WORLD.md and src/world/area4/. */
import type { MapDef } from '../core/contracts';
import {
  FROSTALP, FROSTALP_CENTER, FROSTALP_HALL, FROSTALP_HOUSE_1, FROSTALP_HOUSE_2, FROSTALP_SHOP,
} from './area4/frostalp';
import { GIPFELHORN } from './area4/gipfelhorn';
import { GIPFELPFAD } from './area4/gipfelpfad';
import { PFAD_4 } from './area4/pfad4';

export const AREA4_MAPS: MapDef[] = [
  PFAD_4,
  FROSTALP,
  FROSTALP_CENTER,
  FROSTALP_SHOP,
  FROSTALP_HOUSE_1,
  FROSTALP_HOUSE_2,
  FROSTALP_HALL,
  GIPFELPFAD,
  GIPFELHORN,
];
