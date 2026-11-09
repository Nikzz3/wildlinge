/** AREA 3 maps (Pfad 3 → Glimmerhöhle → Funkenstadt) — see docs/WORLD.md and src/world/area3/. */
import type { MapDef } from '../core/contracts';
import { FUNKEN_CENTER, FUNKEN_HALL, FUNKEN_HOUSE_1, FUNKEN_SHOP, FUNKENSTADT } from './area3/funkenstadt';
import { FUNKEN_WERK } from './area3/funkenwerk';
import { GLIMMERHOEHLE_1, GLIMMERHOEHLE_2 } from './area3/glimmerhoehle';
import { PFAD_3 } from './area3/pfad3';

export const AREA3_MAPS: MapDef[] = [
  PFAD_3,
  GLIMMERHOEHLE_1,
  GLIMMERHOEHLE_2,
  FUNKENSTADT,
  FUNKEN_CENTER,
  FUNKEN_SHOP,
  FUNKEN_HOUSE_1,
  FUNKEN_HALL,
  FUNKEN_WERK,
];
