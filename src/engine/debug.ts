/**
 * window.__game — test/debug API. Used by e2e tests (scripts/e2e.mjs) and handy in DevTools.
 * In ?manual=1 mode nothing runs until advance()/tap() are called.
 */
import { startBattle } from '../battle';
import type { BattleSetup, Button } from '../core/contracts';
import type { Dir, SaveData } from '../core/types';
import { calcStats, createCreature } from '../creature';
import { getMove, getSpecies, typeEffectiveness } from '../data';
import { createOverworld } from '../overworld';
import * as screens from '../ui/screens';
import * as scenes from '../scenes';
import { addCreature, addItem, newGameState, nextUid, setFlag } from '../state';
import { START } from '../world';
import type { Game } from './game';

const channel = new MessageChannel();
const pending: (() => void)[] = [];
channel.port1.onmessage = () => pending.shift()?.();
/** Yields to the event loop so promise chains (scripts, modals) settle between frames. */
const yieldTask = () =>
  new Promise<void>((resolve) => {
    pending.push(resolve);
    channel.port2.postMessage(0);
  });

export interface DebugApi {
  game: Game;
  readonly state: SaveData;
  /** Scene names bottom → top. */
  stack(): string[];
  top(): string;
  errors: string[];
  /** Advance n frames (manual mode) or wait n frames (real-time mode). */
  advance(n?: number): Promise<void>;
  down(b: Button): void;
  up(b: Button): void;
  /** Press and release a button. */
  tap(b: Button, holdFrames?: number): Promise<void>;
  hold(b: Button, frames: number): Promise<void>;
  /** Taps A until the top scene is no longer `sceneName` (max taps). */
  mash(sceneName?: string, maxTaps?: number): Promise<void>;
  /** Advances until the top scene has the given name; returns false on timeout. */
  waitFor(sceneName: string, maxFrames?: number): Promise<boolean>;
  /** Skips intro: fresh state with a starter, placed at START (or a given position), overworld running. */
  newGame(opts?: { starter?: string; level?: number; name?: string }): void;
  warp(mapId: string, x: number, y: number, facing?: Dir): void;
  give(speciesId: string, level: number): void;
  item(itemId: string, qty?: number): void;
  flag(name: string, value?: boolean): void;
  battle(setup: BattleSetup): Promise<string>;
  /** Menu screens (openParty, openBag, …) for tests: g.screens.openBag(g.game, 'field'). */
  screens: typeof screens;
  /** Meta scenes (runIntro, runEvolution, runCredits, createTitleScene). */
  scenes: typeof scenes;
  /** Read-only game data for smarter test drivers (move picks by type). */
  data: { getMove: typeof getMove; getSpecies: typeof getSpecies; typeEffectiveness: typeof typeEffectiveness; calcStats: typeof calcStats };
}

declare global {
  interface Window {
    __game?: DebugApi;
  }
}

export function installDebug(game: Game): DebugApi {
  const advance = async (n = 1) => {
    if (!game.manual) {
      await game.wait(n);
      return;
    }
    for (let i = 0; i < n; i++) {
      game.tick();
      await yieldTask();
    }
    game.render();
  };
  const topName = () => game.stack[game.stack.length - 1]?.name ?? '';
  const api: DebugApi = {
    game,
    get state() {
      return game.state;
    },
    stack: () => game.stack.map((s) => s.name),
    top: topName,
    errors: game.errors,
    advance,
    down: (b) => game.input.setButton(b, true),
    up: (b) => game.input.setButton(b, false),
    tap: async (b, holdFrames = 1) => {
      game.input.setButton(b, true);
      await advance(holdFrames);
      game.input.setButton(b, false);
      await advance(2);
    },
    hold: async (b, frames) => {
      game.input.setButton(b, true);
      await advance(frames);
      game.input.setButton(b, false);
      await advance(1);
    },
    mash: async (sceneName = 'message', maxTaps = 50) => {
      for (let i = 0; i < maxTaps && topName() === sceneName; i++) await api.tap('a');
    },
    waitFor: async (sceneName, maxFrames = 600) => {
      for (let i = 0; i < maxFrames; i++) {
        if (topName() === sceneName) return true;
        await advance(1);
      }
      return topName() === sceneName;
    },
    newGame: (opts = {}) => {
      game.state = newGameState(START);
      game.state.playerName = opts.name ?? 'Kai';
      if (opts.starter) {
        game.state.starter = opts.starter;
        addCreature(game.state, createCreature(opts.starter, opts.level ?? 5, game.rng, { uid: nextUid(game.state), metAt: 'Moosbach' }));
      }
      game.reset(createOverworld(game));
    },
    warp: (mapId, x, y, facing = 'down') => {
      game.state.player = { mapId, x, y, facing };
      game.reset(createOverworld(game));
    },
    give: (speciesId, level) => {
      addCreature(game.state, createCreature(speciesId, level, game.rng, { uid: nextUid(game.state), metAt: 'Debug' }));
    },
    item: (itemId, qty = 1) => addItem(game.state, itemId, qty),
    flag: (name, value = true) => setFlag(game.state, name, value),
    battle: async (setup) => {
      const outcome = await startBattle(game, setup);
      await game.fadeIn(16); // startBattle leaves the screen faded out for the caller
      return outcome;
    },
    screens,
    scenes,
    data: { getMove, getSpecies, typeEffectiveness, calcStats },
  };
  window.__game = api;
  return api;
}
