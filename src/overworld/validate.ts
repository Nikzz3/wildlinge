/** Static map checks used by tests/maps.test.ts. Returns readable problems ("<mapId>: …"); empty = valid. */
import type { MapDef } from '../core/contracts';
import { TILE_META } from '../core/tiles-meta';
import type { Dir } from '../core/types';
import { getTrainer, hasSpecies } from '../data';
import { doorTile, isTileId, MapModel, mapModel, resolveLegend } from './map-model';
import { connectionLanding, DIR_DELTA, OPPOSITE } from './rules';

type AllMaps = Readonly<Record<string, MapDef>>;

export function validateMap(map: MapDef, allMaps: AllMaps, opts: { startMapId?: string } = {}): string[] {
  const problems: string[] = [];
  const report = (msg: string) => problems.push(`${map.id}: ${msg}`);
  if (!checkGrid(map, report)) return problems;
  const m = new MapModel(map);
  checkBuildings(map, m, report);
  checkExits(m, allMaps, report);
  checkConnections(map, m, allMaps, report);
  checkObjects(map, m, report);
  checkItemFlags(map, allMaps, report);
  checkEncounters(map, report);
  checkReachable(map, m, allMaps, opts.startMapId, report);
  return problems;
}

type Report = (msg: string) => void;

const at = (x: number, y: number) => `(${x},${y})`;

/** Rows, legend and special tiles. Returns false if the grid cannot be parsed. */
function checkGrid(map: MapDef, report: Report): boolean {
  let ok = true;
  const legend = resolveLegend(map);
  for (const [ch, id] of Object.entries(legend)) {
    if (!isTileId(id)) report(`legend "${ch}" maps to unknown tile "${id}"`);
  }
  if (!isTileId(map.border)) report(`border "${map.border}" is not a tile id`);
  if (map.baseTile !== undefined && !isTileId(map.baseTile)) report(`baseTile "${map.baseTile}" is not a tile id`);
  const w = map.tiles[0]?.length ?? 0;
  if (map.tiles.length === 0 || w === 0) {
    report('map has no tiles');
    return false;
  }
  map.tiles.forEach((row, y) => {
    if (row.length !== w) {
      report(`row ${y} has length ${row.length}, expected ${w}`);
      ok = false;
    }
    [...row].forEach((ch, x) => {
      if (!legend[ch] || !isTileId(legend[ch])) {
        report(`unknown legend character "${ch}" at ${at(x, y)}`);
        ok = false;
      }
    });
  });
  return ok;
}

function checkBuildings(map: MapDef, m: MapModel, report: Report): void {
  const owner = new Map<string, number>();
  (map.buildings ?? []).forEach((b, i) => {
    const name = `building #${i} (${b.style} at ${at(b.x, b.y)})`;
    if (b.w < 3 || b.h < 3) report(`${name} is smaller than 3×3`);
    if (!m.inBounds(b.x, b.y) || !m.inBounds(b.x + b.w - 1, b.y + b.h - 1)) report(`${name} footprint is out of bounds`);
    if (b.door.dx < 0 || b.door.dx >= b.w) report(`${name} door.dx ${b.door.dx} is outside its width`);
    for (let y = b.y; y < b.y + b.h; y++)
      for (let x = b.x; x < b.x + b.w; x++) {
        const other = owner.get(at(x, y));
        if (other !== undefined) report(`${name} overlaps building #${other} at ${at(x, y)}`);
        owner.set(at(x, y), i);
      }
    const d = doorTile(b);
    if (m.isSolid(d.x, d.y + 1)) report(`${name} door ${at(d.x, d.y)} has no walkable tile below it`);
  });
}

function checkExits(m: MapModel, allMaps: AllMaps, report: Report): void {
  const map = m.def;
  const seen = new Set<string>();
  const exits = [
    ...(map.warps ?? []).map((w) => ({ ...w, door: false })),
    ...(map.buildings ?? []).map((b) => ({ ...doorTile(b), to: b.door.to, tx: b.door.tx, ty: b.door.ty, door: true })),
  ];
  for (const e of exits) {
    const name = `${e.door ? 'door' : 'warp'} ${at(e.x, e.y)}`;
    if (!m.inBounds(e.x, e.y)) {
      report(`${name} is out of bounds`);
      continue;
    }
    if (seen.has(at(e.x, e.y))) report(`${name}: more than one warp/door on this tile`);
    seen.add(at(e.x, e.y));
    if (!e.door && m.isSolid(e.x, e.y)) report(`${name} is on a solid tile and can never be entered`);
    const target = allMaps[e.to];
    if (!target) {
      report(`${name} leads to unknown map "${e.to}"`);
      continue;
    }
    const problem = landingProblem(target, e.tx, e.ty);
    if (problem) report(`${name} → ${e.to} ${at(e.tx, e.ty)}: ${problem}`);
    else {
      const trip = roundTripProblem(map, e, target);
      if (trip) report(`${name} → ${e.to} ${at(e.tx, e.ty)}: ${trip}`);
    }
  }
}

const adjacent = (ax: number, ay: number, bx: number, by: number) => Math.abs(ax - bx) + Math.abs(ay - by) === 1;

/**
 * Door/warp pairs must line up: if the target map has exits back to this map, one of them must sit next to
 * the landing tile (e.g. arrival = tile above the mat) and lead back next to this exit (tile below the door).
 * One-way warps (no exit back) are not checked.
 */
function roundTripProblem(map: MapDef, e: { x: number; y: number; tx: number; ty: number }, target: MapDef): string | null {
  let tm: MapModel;
  try {
    tm = mapModel(target);
  } catch {
    return null;
  }
  const backs = tm.exits().filter((b) => b.to === map.id);
  if (backs.length === 0) return null;
  if (backs.some((b) => adjacent(b.x, b.y, e.tx, e.ty) && adjacent(b.tx, b.ty, e.x, e.y))) return null;
  const list = backs.map((b) => `${at(b.x, b.y)} → ${at(b.tx, b.ty)}`).join(', ');
  const nearLanding = backs.filter((b) => adjacent(b.x, b.y, e.tx, e.ty));
  if (nearLanding.length === 0)
    return `landing is not next to any of ${target.id}'s exits back here (${list}); use the tile next to the mat/stairs (templates: *_ARRIVAL)`;
  return `the exit next to the landing leads back to ${nearLanding.map((b) => at(b.tx, b.ty)).join('/')}, not next to ${at(e.x, e.y)} (template exit should be the tile below the door)`;
}

/** Why the player cannot arrive on (x, y) of `target`, or null. */
function landingProblem(target: MapDef, x: number, y: number): string | null {
  let tm: MapModel;
  try {
    tm = mapModel(target);
  } catch {
    return null; // the target's own validation reports its grid
  }
  if (!tm.inBounds(x, y)) return 'landing tile is out of bounds';
  if (tm.isSolid(x, y)) return `landing tile is solid (${tm.tile(x, y)})`;
  if (tm.exitAt(x, y)) return 'landing tile is itself a warp/door';
  return occupantProblem(target, x, y);
}

/** An always-visible NPC or a ground item on (x, y) would block an arriving player. */
function occupantProblem(target: MapDef, x: number, y: number): string | null {
  const npc = target.npcs?.find((n) => n.x === x && n.y === y && !n.visible);
  if (npc) return `landing tile is occupied by NPC "${npc.id}"`;
  if (target.items?.some((i) => i.x === x && i.y === y)) return 'landing tile has a ground item on it';
  return null;
}

function checkConnections(map: MapDef, m: MapModel, allMaps: AllMaps, report: Report): void {
  for (const [dir, conn] of Object.entries(map.connections ?? {}) as [Dir, { map: string; offset: number }][]) {
    const target = allMaps[conn.map];
    if (!target) {
      report(`connection ${dir} leads to unknown map "${conn.map}"`);
      continue;
    }
    let tm: MapModel;
    try {
      tm = mapModel(target);
    } catch {
      continue; // the target's own validation reports its grid
    }
    const back = target.connections?.[OPPOSITE[dir]];
    if (back && back.map === map.id && back.offset !== -conn.offset)
      report(`connection ${dir} offset ${conn.offset} does not match ${conn.map}'s ${OPPOSITE[dir]} offset ${back.offset} (expected ${-conn.offset})`);
    for (const { x, y } of edgeTiles(m, dir)) {
      if (m.isSolid(x, y)) continue;
      const land = connectionLanding(dir, x, y, conn, tm);
      const occupant = tm.inBounds(land.x, land.y) ? occupantProblem(target, land.x, land.y) : null;
      if (!tm.inBounds(land.x, land.y) || tm.isSolid(land.x, land.y))
        report(`connection ${dir}: walkable edge tile ${at(x, y)} leads to blocked ${conn.map} ${at(land.x, land.y)}`);
      else if (occupant) report(`connection ${dir}: edge tile ${at(x, y)} → ${conn.map} ${at(land.x, land.y)}: ${occupant}`);
    }
  }
}

function edgeTiles(m: MapModel, dir: Dir): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  if (dir === 'up' || dir === 'down') {
    const y = dir === 'up' ? 0 : m.h - 1;
    for (let x = 0; x < m.w; x++) out.push({ x, y });
  } else {
    const x = dir === 'left' ? 0 : m.w - 1;
    for (let y = 0; y < m.h; y++) out.push({ x, y });
  }
  return out;
}

function checkObjects(map: MapDef, m: MapModel, report: Report): void {
  const occupied = new Map<string, string>();
  const place = (what: string, x: number, y: number) => {
    const other = occupied.get(at(x, y));
    if (other) report(`${what} shares tile ${at(x, y)} with ${other}`);
    occupied.set(at(x, y), what);
  };
  const nextToCounter = (x: number, y: number) =>
    Object.values(DIR_DELTA).some(({ dx, dy }) => {
      const t = m.tile(x + dx, y + dy);
      return t !== null && TILE_META[t].counter === true;
    });

  const ids = new Set<string>();
  for (const n of map.npcs ?? []) {
    const name = `npc "${n.id}"`;
    if (ids.has(n.id)) report(`${name}: duplicate NPC id`);
    ids.add(n.id);
    if (!m.inBounds(n.x, n.y)) {
      report(`${name} at ${at(n.x, n.y)} is out of bounds`);
      continue;
    }
    if (m.isSolid(n.x, n.y) && !nextToCounter(n.x, n.y)) report(`${name} stands on solid ${m.tile(n.x, n.y)} at ${at(n.x, n.y)}`);
    if (m.exitAt(n.x, n.y)) report(`${name} stands on a warp/door at ${at(n.x, n.y)}`);
    if (!n.visible) place(name, n.x, n.y);
    if (n.trainer) {
      try {
        getTrainer(n.trainer.id);
      } catch {
        report(`${name} uses unknown trainer "${n.trainer.id}"`);
      }
      if (n.trainer.sight < 0) report(`${name} has negative sight`);
    }
  }

  const flags = new Set<string>();
  const checkFlag = (what: string, flag: string) => {
    if (flags.has(flag)) report(`${what}: flag "${flag}" is used by more than one item`);
    flags.add(flag);
  };
  for (const it of map.items ?? []) {
    const name = `item "${it.item}" ${at(it.x, it.y)}`;
    checkFlag(name, it.flag);
    if (!m.inBounds(it.x, it.y)) {
      report(`${name} is out of bounds`);
      continue;
    }
    if (m.isSolid(it.x, it.y)) report(`${name} lies on solid ${m.tile(it.x, it.y)}`);
    if (m.exitAt(it.x, it.y)) report(`${name} lies on a warp/door`);
    place(name, it.x, it.y);
  }
  for (const it of map.hiddenItems ?? []) {
    const name = `hidden item "${it.item}" ${at(it.x, it.y)}`;
    checkFlag(name, it.flag);
    if (!m.inBounds(it.x, it.y)) report(`${name} is out of bounds`);
  }

  const signTiles = new Set<string>();
  for (const s of map.signs ?? []) {
    signTiles.add(at(s.x, s.y));
    if (!m.inBounds(s.x, s.y)) report(`sign ${at(s.x, s.y)} is out of bounds`);
    else if (!m.isSolid(s.x, s.y)) report(`sign ${at(s.x, s.y)} is on walkable ${m.tile(s.x, s.y)} (put it on a sign tile)`);
  }
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++)
      if (m.tile(x, y) === 'sign' && !signTiles.has(at(x, y))) report(`sign tile ${at(x, y)} has no text in MapDef.signs`);

  (map.triggers ?? []).forEach((t, i) => {
    const w = t.w ?? 1;
    const h = t.h ?? 1;
    if (w < 1 || h < 1 || !m.inBounds(t.x, t.y) || !m.inBounds(t.x + w - 1, t.y + h - 1))
      report(`trigger #${i} ${at(t.x, t.y)} ${w}×${h} is out of bounds`);
  });
}

/** Item flags must be unique across all maps, else picking one up hides the other. */
function checkItemFlags(map: MapDef, allMaps: AllMaps, report: Report): void {
  const flagsOf = (m: MapDef) => [...(m.items ?? []), ...(m.hiddenItems ?? [])].map((i) => i.flag);
  const own = new Set(flagsOf(map));
  for (const other of Object.values(allMaps)) {
    if (other.id === map.id) continue;
    for (const flag of new Set(flagsOf(other))) if (own.has(flag)) report(`item flag "${flag}" is also used by an item on ${other.id}`);
  }
}

function checkEncounters(map: MapDef, report: Report): void {
  for (const [kind, table] of Object.entries(map.encounters ?? {})) {
    if (!table) continue;
    if (!(table.rate > 0 && table.rate <= 1)) report(`encounters.${kind}: rate ${table.rate} must be in (0, 1]`);
    if (table.slots.length === 0) report(`encounters.${kind} has no slots`);
    for (const s of table.slots) {
      if (!hasSpecies(s.species)) report(`encounters.${kind}: unknown species "${s.species}"`);
      if (s.minLevel < 1 || s.maxLevel > 100 || s.minLevel > s.maxLevel)
        report(`encounters.${kind}: ${s.species} has invalid levels ${s.minLevel}–${s.maxLevel}`);
      if (!(s.weight > 0)) report(`encounters.${kind}: ${s.species} needs a weight > 0`);
    }
  }
}

/** Non-dev maps need a way out and a way in (an exit/connection of another map, or the start position). */
function checkReachable(map: MapDef, m: MapModel, allMaps: AllMaps, startMapId: string | undefined, report: Report): void {
  if (map.id.startsWith('dev_')) return;
  const connections = Object.values(map.connections ?? {});
  if (m.exits().length === 0 && connections.length === 0) report('has no way out (no warps, doors or connections)');
  if (startMapId === map.id) return;
  const leadsHere = (other: MapDef) =>
    (other.warps ?? []).some((w) => w.to === map.id) ||
    (other.buildings ?? []).some((b) => b.door.to === map.id) ||
    Object.values(other.connections ?? {}).some((c) => c?.map === map.id);
  if (!Object.values(allMaps).some((other) => other.id !== map.id && (leadsHere(other) || scriptsMention(other, map.id))))
    report('has no way in (no other map warps, connects or script-warps here)');
}

/** Heuristic for maps reached only via ctx.warp: some script of `other` contains the id as a string literal. */
function scriptsMention(other: MapDef, id: string): boolean {
  const scripts = [other.onEnter, ...(other.triggers ?? []).map((t) => t.script), ...(other.npcs ?? []).map((n) => n.onTalk)];
  return scripts.some((fn) => {
    const src = fn?.toString() ?? '';
    return src.includes(`'${id}'`) || src.includes(`"${id}"`) || src.includes(`\`${id}\``);
  });
}
