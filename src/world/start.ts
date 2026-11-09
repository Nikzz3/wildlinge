import type { Position } from '../core/types';
import { PLAYER_ROOM } from './area1/doors';

/** New-game spawn (docs/WORLD.md "player_house – START"): the player's room, next to the bed. */
export const START_POSITION: Position = { ...PLAYER_ROOM };
