import type { GameContext, Scene } from '../core/contracts';
import { OverworldScene } from './scene';

export { mapModel, MapModel } from './map-model';
export { validateMap } from './validate';

/** Overworld scene for g.state.player (map, position, facing). */
export function createOverworld(g: GameContext): Scene {
  return new OverworldScene(g);
}
