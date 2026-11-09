import { describe, expect, it } from 'vitest';
import type { MapDef } from '../src/core/contracts';
import { createRng } from '../src/core/rng';
import { MapModel } from '../src/overworld/map-model';
import { approachSteps, connectionLanding, parsePath, rollEncounter, sightDistance } from '../src/overworld/rules';
import { validateMap } from '../src/overworld/validate';
import { MAPS, START } from '../src/world';
import { HEAL_CENTER_ARRIVAL, makeHealCenter, makeShop, SHOP_ARRIVAL } from '../src/world/templates';

describe('world maps', () => {
  it('every map passes validation', () => {
    const problems = Object.values(MAPS).flatMap((m) => validateMap(m, MAPS, { startMapId: START.mapId }));
    expect(problems, `\n${problems.join('\n')}\n`).toEqual([]);
  });

  it('START is a walkable tile of an existing map', () => {
    const map = MAPS[START.mapId];
    expect(map, `START map "${START.mapId}"`).toBeDefined();
    expect(new MapModel(map!).isSolid(START.x, START.y)).toBe(false);
  });
});

const room = (over: Partial<MapDef> = {}): MapDef => ({
  id: 'room',
  name: 'Raum',
  kind: 'indoor',
  music: 'home',
  battleBg: 'indoor',
  border: 'void',
  tiles: ['wwwww', 'ppppp', 'ptppp', 'xxdxx'],
  warps: [{ x: 2, y: 3, to: 'yard', tx: 1, ty: 1 }],
  ...over,
});
const yard: MapDef = {
  id: 'yard',
  name: 'Hof',
  kind: 'town',
  music: 'town',
  battleBg: 'grass',
  border: 'tree',
  tiles: ['TTTT', 'T..T', 'TTTT'],
  warps: [{ x: 2, y: 1, to: 'room', tx: 2, ty: 2 }],
};

describe('validateMap', () => {
  const check = (m: MapDef) => validateMap(m, { room: m, yard }, {});

  it('accepts a consistent pair of maps', () => {
    expect(check(room())).toEqual([]);
  });

  it('reports ragged rows, unknown characters and bad landings', () => {
    expect(check(room({ tiles: ['wwwww', 'pppp', 'ppppp', 'xxdxx'] }))).toEqual(['room: row 1 has length 4, expected 5']);
    expect(check(room({ tiles: ['wwwww', 'pp?pp', 'ppppp', 'xxdxx'] })).join()).toContain('unknown legend character "?"');
    expect(check(room({ warps: [{ x: 2, y: 3, to: 'yard', tx: 0, ty: 0 }] })).join()).toContain('landing tile is solid');
    expect(check(room({ warps: [{ x: 2, y: 3, to: 'yard', tx: 2, ty: 1 }] })).join()).toContain('itself a warp');
    expect(check(room({ warps: [{ x: 2, y: 3, to: 'nowhere', tx: 1, ty: 1 }] })).join()).toContain('unknown map "nowhere"');
  });

  it('reports misplaced objects, unknown trainers and species', () => {
    const problems = check(
      room({
        npcs: [{ id: 'a', x: 1, y: 2, facing: 'down', sprite: 'man', trainer: { id: 'nobody', sight: 2 } }],
        items: [{ x: 9, y: 9, item: 'potion', flag: 'f' }],
        encounters: { grass: { rate: 0.1, slots: [{ species: 'nichtda', minLevel: 2, maxLevel: 3, weight: 1 }] } },
      }),
    ).join('\n');
    expect(problems).toContain('unknown trainer "nobody"');
    expect(problems).toContain('item "potion" (9,9) is out of bounds');
    expect(problems).toContain('unknown species "nichtda"');
  });

  it('allows a clerk on a solid tile behind a counter', () => {
    const shop = room({
      tiles: ['wwwww', 'ptppp', 'pcppp', 'ppppp', 'xxdxx'],
      warps: [{ x: 2, y: 4, to: 'yard', tx: 1, ty: 1 }],
      npcs: [{ id: 'clerk', x: 1, y: 1, facing: 'down', sprite: 'clerk' }],
    });
    const shopYard: MapDef = { ...yard, warps: [{ x: 2, y: 1, to: 'room', tx: 2, ty: 3 }] };
    expect(validateMap(shop, { room: shop, yard: shopYard })).toEqual([]);
  });

  it('requires a way in for non-dev maps (warps, connections or a script warp)', () => {
    const island: MapDef = { ...yard, id: 'island', warps: [{ x: 2, y: 1, to: 'yard', tx: 1, ty: 1 }] };
    expect(validateMap(island, { island, yard }).join()).toContain('has no way in');
    const ferry: MapDef = {
      ...yard,
      triggers: [{ x: 1, y: 1, script: (ctx) => ctx.warp('island', 1, 1) }],
    };
    expect(validateMap(island, { island, yard: ferry })).toEqual([]);
  });

  it('checks that a door/warp and the exit back line up', () => {
    // arrival two tiles above the mat instead of directly above it
    const farYard: MapDef = { ...yard, warps: [{ x: 2, y: 1, to: 'room', tx: 2, ty: 1 }] };
    expect(validateMap(farYard, { room: room(), yard: farYard }).join()).toContain("not next to any of room's exits back here");
    // mat leads back to a tile that is not next to the yard's warp
    const twoTiles: MapDef = { ...yard, tiles: ['TTTTT', 'T...T', 'TTTTT'], warps: [{ x: 3, y: 1, to: 'room', tx: 2, ty: 2 }] };
    expect(validateMap(twoTiles, { room: room(), yard: twoTiles }).join()).toContain('not next to (3,1)');
  });

  it('reports item flags shared between maps', () => {
    const a = room({ items: [{ x: 1, y: 1, item: 'potion', flag: 'item:x' }] });
    const b: MapDef = { ...yard, hiddenItems: [{ x: 1, y: 1, item: 'potion', flag: 'item:x' }] };
    expect(validateMap(a, { room: a, yard: b }).join()).toContain('item flag "item:x" is also used by an item on yard');
  });

  it('checks that connection edges line up', () => {
    const north: MapDef = { ...yard, id: 'north', warps: [], tiles: ['T..T', 'T..T'], connections: { down: { map: 'south', offset: 1 } } };
    const south: MapDef = { ...yard, id: 'south', warps: [], tiles: ['TT.T', 'T..T'], connections: { up: { map: 'north', offset: -1 } } };
    const all = { north, south };
    // north's walkable bottom tiles x=1,2 land on south x=2 (walkable) and x=3 (tree)
    expect(validateMap(north, all).join()).toContain('(2,1) leads to blocked south (3,0)');
    const guarded: MapDef = { ...south, npcs: [{ id: 'guard', x: 2, y: 0, facing: 'up', sprite: 'man' }] };
    expect(validateMap(north, { north, south: guarded }).join()).toContain('occupied by NPC "guard"');
  });
});

describe('MapModel', () => {
  const m = new MapModel({
    ...yard,
    tiles: ['~~..', '~~..', '....', '....'],
    buildings: [{ x: 1, y: 1, w: 3, h: 3, style: 'house_red', door: { dx: 1, to: 'room', tx: 2, ty: 1 } }],
  });

  it('gives every cell (and the border) opaque frames', () => {
    expect(m.neighbours(0, 0)).toEqual({ n: null, e: 'water', s: 'water', w: null });
    for (const [x, y] of [[0, 0], [2, 1], [3, 3], [-1, 0]] as const)
      for (const f of m.frames(x, y)) expect(f.data.every((v, i) => i % 4 !== 3 || v === 255)).toBe(true);
  });

  it('lets trainers see down over ledges, but not up or sideways', () => {
    const ledged = new MapModel({ ...yard, tiles: ['...', 'vvv', '...'] });
    expect(ledged.blocksSight(1, 1, 'down')).toBe(false);
    expect(ledged.blocksSight(1, 1, 'up')).toBe(true);
    expect(ledged.blocksSight(1, 1, 'left')).toBe(true);
  });

  it('makes building footprints solid except the door, which is an exit', () => {
    expect(m.isSolid(1, 1)).toBe(true);
    expect(m.isSolid(2, 3)).toBe(false);
    expect(m.exitAt(2, 3)).toMatchObject({ to: 'room', door: true });
    expect(m.isSolid(-1, 0)).toBe(true);
  });
});

describe('overworld rules', () => {
  it('parses script paths', () => {
    expect(parsePath('UuL r')).toEqual(['up', 'up', 'left', 'right']);
    expect(() => parsePath('UX')).toThrow(/Invalid path character "X"/);
  });

  it('lands connections on the opposite edge with the offset', () => {
    const target = { w: 10, h: 8 };
    expect(connectionLanding('up', 5, 0, { map: 't', offset: -2 }, target)).toEqual({ x: 3, y: 7 });
    expect(connectionLanding('down', 5, 9, { map: 't', offset: 1 }, target)).toEqual({ x: 6, y: 0 });
    expect(connectionLanding('left', 0, 4, { map: 't', offset: 3 }, target)).toEqual({ x: 9, y: 7 });
    expect(connectionLanding('right', 9, 4, { map: 't', offset: 0 }, target)).toEqual({ x: 0, y: 4 });
  });

  it('trainer sight stops at obstacles', () => {
    const viewer = { x: 0, y: 0, facing: 'right' as const };
    expect(sightDistance(viewer, 4, { x: 3, y: 0 }, () => false)).toBe(3);
    expect(sightDistance(viewer, 2, { x: 3, y: 0 }, () => false)).toBeNull();
    expect(sightDistance(viewer, 4, { x: 3, y: 0 }, (x) => x === 2)).toBeNull();
    expect(sightDistance(viewer, 4, { x: 0, y: 2 }, () => false)).toBeNull();
  });

  it('approaches the player, hopping down ledges and stopping in front of unhoppable ones', () => {
    const ledgeAt = (ly: number) => (_x: number, y: number) => y === ly;
    const down = { x: 0, y: 0, facing: 'down' as const };
    expect(approachSteps(down, 4, () => false)).toEqual([1, 1, 1].map(() => ({ dir: 'down', tiles: 1 })));
    expect(approachSteps(down, 4, ledgeAt(2))).toEqual([{ dir: 'down', tiles: 1 }, { dir: 'down', tiles: 2 }]);
    expect(approachSteps(down, 3, ledgeAt(2))).toEqual([{ dir: 'down', tiles: 1 }]);
    expect(approachSteps({ x: 0, y: 4, facing: 'up' }, 4, ledgeAt(2))).toEqual([{ dir: 'up', tiles: 1 }]);
  });

  it('rolls encounters by rate, slot weight and level range; repel skips weaker creatures', () => {
    const table = {
      rate: 0.5,
      slots: [
        { species: 'a', minLevel: 2, maxLevel: 4, weight: 3 },
        { species: 'b', minLevel: 10, maxLevel: 10, weight: 1 },
      ],
    };
    const rng = createRng(7);
    const rolls = Array.from({ length: 2000 }, () => rollEncounter(table, rng, null));
    const hits = rolls.filter((r) => r !== null);
    expect(hits.length / rolls.length).toBeCloseTo(0.5, 1);
    expect(hits.filter((r) => r.species === 'a').length / hits.length).toBeCloseTo(0.75, 1);
    expect(hits.every((r) => (r.species === 'a' ? r.level >= 2 && r.level <= 4 : r.level === 10))).toBe(true);
    const repelled = Array.from({ length: 500 }, () => rollEncounter(table, rng, 5)).filter((r) => r !== null);
    expect(repelled.length).toBeGreaterThan(0);
    expect(repelled.every((r) => r.species === 'b')).toBe(true);
  });
});

describe('interior templates', () => {
  const exit = { map: 'dev_town', x: 3, y: 5 };
  /** Tiles the player can reach from the arrival tile. */
  const reachable = (map: MapDef, from: { x: number; y: number }) => {
    const m = new MapModel(map);
    const seen = new Set([`${from.x},${from.y}`]);
    const todo = [from];
    for (let p = todo.pop(); p; p = todo.pop())
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
        const q = { x: p.x + dx, y: p.y + dy };
        if (m.isSolid(q.x, q.y) || m.exitAt(q.x, q.y) || seen.has(`${q.x},${q.y}`)) continue;
        seen.add(`${q.x},${q.y}`);
        todo.push(q);
      }
    return seen;
  };

  it('keeps the player in front of the heal center counter, with nurse and PC usable', () => {
    const center = makeHealCenter({ id: 'c', name: 'C', exit });
    const tiles = reachable(center, HEAL_CENTER_ARRIVAL);
    expect([...tiles].filter((t) => Number(t.split(',')[1]) <= 2)).toEqual([]);
    expect(tiles.has('5,3') && tiles.has('9,3')).toBe(true);
    expect(new MapModel(center).tile(5, 2)).toBe('counter');
    expect(new MapModel(center).tile(9, 2)).toBe('pc');
  });

  it('keeps the player in front of the shop counter', () => {
    const shop = makeShop({ id: 's', name: 'S', shopItems: ['potion'], exit });
    const tiles = reachable(shop, SHOP_ARRIVAL);
    expect(tiles.has('1,1')).toBe(false);
    expect(tiles.has('1,3')).toBe(true);
  });
});
