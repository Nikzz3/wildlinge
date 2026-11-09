/**
 * The whole world as one walking graph, checked in story order (docs/WORLD.md §4): at each stage (the flags and
 * badges a player has by then) the next maps and story NPCs are reachable from START, the ones behind the next gate
 * are not, every reachable tile can walk back to a Heilstation, and at the end every map is reachable and no dev map.
 *
 * Walking follows the overworld rules: solid tiles, one-way ledges (2-tile hop down), doors and warps, edge
 * connections. Visible NPCs block their tile; an active trigger (a gate strip or a story scene) blocks its tiles
 * until the stage that sets its flag.
 */
import { describe, expect, it } from 'vitest';
import type { MapDef } from '../src/core/contracts';
import { TILE_META } from '../src/core/tiles-meta';
import type { SaveData } from '../src/core/types';
import { mapModel } from '../src/overworld/map-model';
import { connectionLanding, DIR_DELTA, DIRS } from '../src/overworld/rules';
import { newGameState } from '../src/state';
import { MAPS, START } from '../src/world';

type Node = string; // "mapId,x,y"
const node = (map: string, x: number, y: number): Node => `${map},${x},${y}`;
const parse = (n: Node) => {
  const [map, x, y] = n.split(',');
  return { map: map!, x: Number(x), y: Number(y) };
};

/** Why the player cannot stand on (x, y): a solid tile or NPC, an active trigger (it runs instead), or not blocked. */
function blocked(s: SaveData, def: MapDef, x: number, y: number): 'solid' | 'trigger' | null {
  if (mapModel(def).isSolid(x, y)) return 'solid';
  if ((def.npcs ?? []).some((n) => n.x === x && n.y === y && (n.visible?.(s) ?? true))) return 'solid';
  const trigger = (def.triggers ?? []).some(
    (t) => x >= t.x && x < t.x + (t.w ?? 1) && y >= t.y && y < t.y + (t.h ?? 1) && (t.when?.(s) ?? true),
  );
  return trigger ? 'trigger' : null;
}

interface World {
  /** Reachable tiles → where one step from there leads. */
  graph: Map<Node, Node[]>;
  /** Active trigger tiles next to a reachable tile (stepping there starts the gate text or a story scene). */
  triggers: Set<Node>;
}

/** Every tile reachable from START, with the steps between them (warps, doors, ledges and connections followed). */
function explore(s: SaveData): World {
  const graph = new Map<Node, Node[]>();
  const triggers = new Set<Node>();
  const todo = [node(START.mapId, START.x, START.y)];
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    if (graph.has(n)) continue;
    const { map, x, y } = parse(n);
    const def = MAPS[map]!;
    const m = mapModel(def);
    const next: Node[] = [];
    const tryEnter = (target: MapDef, tx: number, ty: number, follow: boolean) => {
      const why = blocked(s, target, tx, ty);
      if (why === 'trigger') triggers.add(node(target.id, tx, ty));
      if (why) return;
      const exit = follow ? mapModel(target).exitAt(tx, ty) : null;
      next.push(exit ? node(exit.to, exit.tx, exit.ty) : node(target.id, tx, ty));
    };
    for (const dir of DIRS) {
      const nx = x + DIR_DELTA[dir].dx;
      const ny = y + DIR_DELTA[dir].dy;
      if (!m.inBounds(nx, ny)) {
        const conn = def.connections?.[dir];
        const target = conn && MAPS[conn.map];
        if (!conn || !target) continue;
        const land = connectionLanding(dir, x, y, conn, mapModel(target));
        tryEnter(target, land.x, land.y, false);
      } else if (dir === 'down' && m.isLedge(nx, ny)) tryEnter(def, x, y + 2, true);
      else tryEnter(def, nx, ny, true);
    }
    graph.set(n, next);
    for (const q of next) if (!graph.has(q)) todo.push(q);
  }
  return { graph, triggers };
}

/** Reachable tiles from which no Heilstation (or the player's home) can be reached on foot. */
function strandedTiles(graph: Map<Node, Node[]>): Node[] {
  const back = new Map<Node, Node[]>();
  for (const [from, tos] of graph) for (const to of tos) back.set(to, [...(back.get(to) ?? []), from]);
  const isHeal = (n: Node) => {
    const map = MAPS[parse(n).map]!;
    return map.isHealCenter === true || map.id === START.mapId;
  };
  const safe = new Set([...graph.keys()].filter(isHeal));
  const todo = [...safe];
  for (let n = todo.pop(); n !== undefined; n = todo.pop())
    for (const prev of back.get(n) ?? []) if (!safe.has(prev)) (safe.add(prev), todo.push(prev));
  return [...graph.keys()].filter((n) => !safe.has(n));
}

/**
 * Can the player meet the NPC: stand next to it (or across a counter) and talk, or step on the active trigger in
 * front of it (blockades start their scene from there)?
 */
function meets(s: SaveData, { graph, triggers }: World, mapId: string, npcId: string): boolean {
  const def = MAPS[mapId]!;
  const npc = def.npcs?.find((n) => n.id === npcId);
  if (!npc || !(npc.visible?.(s) ?? true)) return false;
  const m = mapModel(def);
  return DIRS.some((dir) => {
    const { dx, dy } = DIR_DELTA[dir];
    const [x, y] = [npc.x + dx, npc.y + dy];
    const t = m.tile(x, y);
    if (t && TILE_META[t].counter) return graph.has(node(mapId, x + dx, y + dy));
    return graph.has(node(mapId, x, y)) || triggers.has(node(mapId, x, y));
  });
}

interface Stage {
  name: string;
  flags?: string[];
  badges?: string[];
  /** Maps that must be reachable from this stage on. */
  reach: string[];
  /** Maps behind the next gate. */
  notYet?: string[];
  /** Story NPCs [map, npc id] the player must be able to meet. */
  talk?: [string, string][];
  /** Story NPCs that must not be reachable yet (the scene before them cannot be skipped). */
  notYetTalk?: [string, string][];
  /** Scene strips [map, x, y] the player must be able to step on (the scene walks the NPC up). */
  scenes?: [string, number, number][];
}

const STAGES: Stage[] = [
  {
    name: 'new game', flags: ['lab_greeted'],
    reach: ['player_house', 'moosbach', 'rival_house', 'arven_lab'], notYet: ['pfad_1'],
    talk: [['arven_lab', 'crystal_sproessli'], ['arven_lab', 'crystal_zuendli'], ['arven_lab', 'crystal_biberli']],
  },
  {
    name: 'starter', flags: ['got_starter', 'rival1_done'],
    reach: ['pfad_1', 'kieselstadt', 'kiesel_center', 'kiesel_shop', 'kiesel_hall', 'kiesel_house_1', 'kiesel_house_2'],
    notYet: ['pfad_2'], talk: [['kiesel_hall', 'leader_jost']],
  },
  {
    name: 'Felsabzeichen', badges: ['badge_earth'], reach: ['pfad_2', 'fluesterwald'], notYet: ['seewil'],
    scenes: [['fluesterwald', 2, 21]], notYetTalk: [['fluesterwald', 'grunt_grete']],
  },
  { name: 'rival 2', flags: ['rival2_done'], reach: [], notYet: ['seewil'], talk: [['fluesterwald', 'grunt_grete']] },
  {
    name: 'Grete', flags: ['forest_cleared'],
    reach: ['seewil', 'seewil_center', 'seewil_shop', 'seewil_hall', 'seewil_house_1', 'seewil_house_2'],
    notYet: ['pfad_3'], talk: [['seewil_hall', 'leader_undine'], ['seewil_house_1', 'matti']],
  },
  {
    name: 'Wellenabzeichen', badges: ['badge_water'], reach: ['pfad_3', 'glimmerhoehle_1', 'glimmerhoehle_2'],
    notYet: ['funkenstadt'], talk: [['glimmerhoehle_2', 'grunt_petra']],
  },
  {
    name: 'Petra', flags: ['cave_cleared'],
    reach: ['funkenstadt', 'funken_center', 'funken_shop', 'funken_house_1', 'funken_werk'],
    notYet: ['funken_hall', 'pfad_4'], talk: [['funken_werk', 'bise']],
  },
  {
    name: 'Bise 1', flags: ['werk_cleared'], reach: ['funken_hall'], notYet: ['pfad_4'],
    talk: [['funken_hall', 'leader_zita'], ['funken_house_1', 'anton']],
  },
  {
    name: 'Funkenabzeichen', badges: ['badge_spark'], reach: ['pfad_4', 'frostalp'], notYet: ['frostalp_center', 'gipfelpfad'],
    scenes: [['frostalp', 12, 20]],
  },
  {
    name: 'rival 3', flags: ['rival3_done'],
    reach: ['frostalp_center', 'frostalp_shop', 'frostalp_hall', 'frostalp_house_1', 'frostalp_house_2'],
    notYet: ['gipfelpfad'], talk: [['frostalp_hall', 'leader_firna'], ['frostalp_house_1', 'arven']],
  },
  {
    name: 'Firnabzeichen', badges: ['badge_frost'], reach: ['gipfelpfad'], notYet: ['gipfelhorn'],
    talk: [['gipfelpfad', 'bise'], ['gipfelpfad', 'rescuer']],
  },
  { name: 'Bise 2', flags: ['gipfelpfad_cleared'], reach: ['gipfelhorn'], scenes: [['gipfelhorn', 10, 10]] },
  { name: 'final rival', flags: ['boss_done', 'rival4_done'], reach: [], talk: [['gipfelhorn', 'lindglut']] },
  {
    name: 'game cleared', flags: ['lindglut_done', 'game_cleared', 'lindglut_resting'],
    reach: Object.keys(MAPS).filter((id) => !id.startsWith('dev_')),
    talk: [['frostalp_house_1', 'innkeeper'], ['gipfelhorn', 'rival_post']],
  },
];

describe('world graph in story order', () => {
  const s = newGameState(START);
  for (const stage of STAGES) {
    it(stage.name, () => {
      for (const f of stage.flags ?? []) s.flags[f] = true;
      s.badges.push(...(stage.badges ?? []));
      const world = explore(s);
      const maps = new Set([...world.graph.keys()].map((n) => parse(n).map));
      expect(stage.reach.filter((id) => !maps.has(id)), 'unreachable maps').toEqual([]);
      expect((stage.notYet ?? []).filter((id) => maps.has(id)), 'maps reachable before their gate opens').toEqual([]);
      expect([...maps].filter((id) => id.startsWith('dev_')), 'dev maps reachable').toEqual([]);
      for (const [map, npc] of stage.talk ?? []) expect(meets(s, world, map, npc), `meet ${npc} on ${map}`).toBe(true);
      for (const [map, x, y] of stage.scenes ?? []) expect(world.triggers.has(node(map, x, y)), `scene strip on ${map} (${x},${y})`).toBe(true);
      for (const [map, npc] of stage.notYetTalk ?? []) expect(meets(s, world, map, npc), `${npc} on ${map} too early`).toBe(false);
      expect(strandedTiles(world.graph).slice(0, 10), 'tiles without a way back to a Heilstation').toEqual([]);
    });
  }
});
