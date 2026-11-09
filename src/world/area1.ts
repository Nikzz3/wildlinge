/** AREA 1 maps (chapter 1: Moosbach → Pfad 1 → Kieselstadt) — see docs/WORLD.md and src/world/area1/. */
import type { MapDef } from '../core/contracts';
import { MOOSBACH, PLAYER_HOUSE, RIVAL_HOUSE } from './area1/moosbach';
import { ARVEN_LAB } from './area1/lab';
import { PFAD_1 } from './area1/pfad1';
import { KIESEL_CENTER, KIESEL_HALL, KIESEL_HOUSE_1, KIESEL_HOUSE_2, KIESEL_SHOP, KIESELSTADT } from './area1/kieselstadt';

export const AREA1_MAPS: MapDef[] = [
  MOOSBACH,
  PLAYER_HOUSE,
  RIVAL_HOUSE,
  ARVEN_LAB,
  PFAD_1,
  KIESELSTADT,
  KIESEL_CENTER,
  KIESEL_SHOP,
  KIESEL_HOUSE_1,
  KIESEL_HOUSE_2,
  KIESEL_HALL,
];
