/**
 * DOM-free map parsing shared by the overworld scene, the map validator and scripts/render-map.ts:
 * legend resolution, tile lookup, per-cell tile frames, building footprints, exits and solidity.
 */
// cellFrames/TileNeighbours are not re-exported from src/art/index.ts yet (art owner: please export them).
import { cellFrames, type TileNeighbours } from '../art/tiles';
import type { Bitmap } from '../core/bitmap';
import type { BuildingDef, MapDef } from '../core/contracts';
import { DEFAULT_LEGEND, TILE_IDS, TILE_META, type TileId } from '../core/tiles-meta';
import type { Dir } from '../core/types';

/** A tile that moves the player to another map: a WarpDef or a building door. */
export interface Exit {
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
  facing?: Dir;
  door: boolean;
}

const TILE_ID_SET: ReadonlySet<string> = new Set(TILE_IDS);

export function isTileId(id: string): id is TileId {
  return TILE_ID_SET.has(id);
}

export function resolveLegend(def: MapDef): Readonly<Record<string, TileId>> {
  return { ...DEFAULT_LEGEND, ...def.legend };
}

/** Tile under transparent pixels, buildings and objects. Caves default to cave floor. */
export function baseTileOf(def: MapDef): TileId {
  if (def.baseTile) return def.baseTile;
  if (def.kind === 'indoor') return 'floor_wood';
  if (def.kind === 'cave') return 'cave_floor';
  return 'grass';
}

/** Door tile of a building (bottom row of its footprint). */
export function doorTile(b: BuildingDef): { x: number; y: number } {
  return { x: b.x + b.door.dx, y: b.y + b.h - 1 };
}

/** Parsed, immutable view of a MapDef. Throws on ragged rows or unknown legend characters. */
export class MapModel {
  readonly w: number;
  readonly h: number;
  readonly base: TileId;
  readonly border: TileId;
  private readonly ids: TileId[];
  /** Per-cell opaque frames (art-aware edges + ground underlay), filled on first use. */
  private readonly cells: (readonly Bitmap[] | undefined)[];
  private borderFrames: readonly Bitmap[] | null = null;
  private readonly footprint: (BuildingDef | null)[];
  private readonly exitByTile = new Map<number, Exit>();

  constructor(readonly def: MapDef) {
    const legend = resolveLegend(def);
    this.h = def.tiles.length;
    this.w = def.tiles[0]?.length ?? 0;
    this.base = baseTileOf(def);
    this.border = def.border;
    this.ids = [];
    def.tiles.forEach((row, y) => {
      if (row.length !== this.w) throw new Error(`${def.id}: row ${y} has length ${row.length}, expected ${this.w}`);
      for (const ch of row) {
        const id = legend[ch];
        if (!id) throw new Error(`${def.id}: unknown legend character "${ch}" in row ${y}`);
        this.ids.push(id);
      }
    });
    this.cells = new Array<readonly Bitmap[] | undefined>(this.w * this.h);

    this.footprint = new Array<BuildingDef | null>(this.w * this.h).fill(null);
    for (const b of def.buildings ?? []) {
      for (let y = b.y; y < b.y + b.h; y++)
        for (let x = b.x; x < b.x + b.w; x++) if (this.inBounds(x, y)) this.footprint[y * this.w + x] = b;
      const d = doorTile(b);
      if (this.inBounds(d.x, d.y)) this.exitByTile.set(d.y * this.w + d.x, { ...d, to: b.door.to, tx: b.door.tx, ty: b.door.ty, door: true });
    }
    for (const wp of def.warps ?? []) {
      if (this.inBounds(wp.x, wp.y)) this.exitByTile.set(wp.y * this.w + wp.x, { ...wp, door: false });
    }
  }

  get id(): string {
    return this.def.id;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  /** Tile id, or null outside the map. */
  tile(x: number, y: number): TileId | null {
    return this.inBounds(x, y) ? this.ids[y * this.w + x]! : null;
  }

  /** Tile ids of the four neighbours (null outside the map). */
  neighbours(x: number, y: number): TileNeighbours {
    return { n: this.tile(x, y - 1), e: this.tile(x + 1, y), s: this.tile(x, y + 1), w: this.tile(x - 1, y) };
  }

  /** Opaque animation frames to draw at (x, y); the border tile outside the map. */
  frames(x: number, y: number): readonly Bitmap[] {
    if (!this.inBounds(x, y)) {
      const b = this.border;
      this.borderFrames ??= cellFrames(b, { n: b, e: b, s: b, w: b }, this.base);
      return this.borderFrames;
    }
    const i = y * this.w + x;
    return (this.cells[i] ??= cellFrames(this.ids[i]!, this.neighbours(x, y), this.base));
  }

  buildingAt(x: number, y: number): BuildingDef | null {
    return this.inBounds(x, y) ? this.footprint[y * this.w + x]! : null;
  }

  exitAt(x: number, y: number): Exit | null {
    return this.inBounds(x, y) ? (this.exitByTile.get(y * this.w + x) ?? null) : null;
  }

  exits(): Exit[] {
    return [...this.exitByTile.values()];
  }

  /** One-way ledge tile (not covered by a building). */
  isLedge(x: number, y: number): boolean {
    const id = this.tile(x, y);
    return id !== null && TILE_META[id].ledge === true && !this.buildingAt(x, y);
  }

  /** Stops a trainer's view in direction `facing`: solids, except ledges seen from above (trainers hop down them). */
  blocksSight(x: number, y: number, facing: Dir): boolean {
    return this.isSolid(x, y) && !(facing === 'down' && this.isLedge(x, y));
  }

  /** Blocks movement: outside the map, solid tile, or a building footprint (except its door). */
  isSolid(x: number, y: number): boolean {
    const id = this.tile(x, y);
    if (id === null) return true;
    const b = this.buildingAt(x, y);
    if (b) return this.exitAt(x, y)?.door !== true;
    return TILE_META[id].solid;
  }
}

const modelCache = new WeakMap<MapDef, MapModel>();

/** Cached MapModel per MapDef. */
export function mapModel(def: MapDef): MapModel {
  let m = modelCache.get(def);
  if (!m) {
    m = new MapModel(def);
    modelCache.set(def, m);
  }
  return m;
}
