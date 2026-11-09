/**
 * Wild encounter tables keyed by map id (see docs/WORLD.md). Maps use them as
 * `encounters: ENCOUNTERS['pfad_1']`. 'grass' covers tall grass and snow grass, 'cave' covers cave floor.
 */
import type { EncounterTable } from '../core/contracts';

export const ENCOUNTERS: Record<string, { grass?: EncounterTable; cave?: EncounterTable }> = {
  // --- AREA 1 ----------------------------------------------------------------------------------
  pfad_1: {
    grass: {
      rate: 0.12,
      slots: [
        { species: 'zwitschli', minLevel: 2, maxLevel: 4, weight: 40 },
        { species: 'munggli', minLevel: 2, maxLevel: 4, weight: 35 },
        { species: 'chaeferli', minLevel: 2, maxLevel: 4, weight: 25 },
      ],
    },
  },

  // --- AREA 2 ----------------------------------------------------------------------------------
  pfad_2: {
    grass: {
      rate: 0.12,
      slots: [
        { species: 'zwitschli', minLevel: 6, maxLevel: 9, weight: 25 },
        { species: 'munggli', minLevel: 6, maxLevel: 9, weight: 25 },
        { species: 'schneggli', minLevel: 7, maxLevel: 9, weight: 20 },
        { species: 'chaeferli', minLevel: 7, maxLevel: 9, weight: 15 },
        { species: 'wuehli', minLevel: 7, maxLevel: 10, weight: 15 },
      ],
    },
  },
  fluesterwald: {
    grass: {
      rate: 0.14,
      slots: [
        { species: 'farnli', minLevel: 10, maxLevel: 13, weight: 30 },
        { species: 'chaeferli', minLevel: 9, maxLevel: 12, weight: 20 },
        { species: 'tuepfli', minLevel: 10, maxLevel: 12, weight: 20 },
        { species: 'laervli', minLevel: 10, maxLevel: 13, weight: 15 },
        { species: 'zwitschli', minLevel: 10, maxLevel: 12, weight: 15 },
      ],
    },
  },
  /** Reeds on the lake shore. */
  seewil: {
    grass: {
      rate: 0.1,
      slots: [
        { species: 'tauchli', minLevel: 12, maxLevel: 15, weight: 65 },
        { species: 'tuepfli', minLevel: 12, maxLevel: 14, weight: 35 },
      ],
    },
  },

  // --- AREA 3 ----------------------------------------------------------------------------------
  pfad_3: {
    grass: {
      rate: 0.12,
      slots: [
        { species: 'tauchli', minLevel: 18, maxLevel: 21, weight: 30 },
        { species: 'tuepfli', minLevel: 18, maxLevel: 21, weight: 25 },
        { species: 'zwitschli', minLevel: 18, maxLevel: 19, weight: 20 },
        { species: 'dohlerich', minLevel: 20, maxLevel: 22, weight: 15 },
        { species: 'stinkkaefer', minLevel: 20, maxLevel: 22, weight: 10 },
      ],
    },
  },
  glimmerhoehle_1: {
    cave: {
      rate: 0.08,
      slots: [
        { species: 'wuehli', minLevel: 20, maxLevel: 23, weight: 45 },
        { species: 'stachli', minLevel: 20, maxLevel: 23, weight: 40 },
        { species: 'bergmaennli', minLevel: 21, maxLevel: 23, weight: 15 },
      ],
    },
  },
  glimmerhoehle_2: {
    cave: {
      rate: 0.08,
      slots: [
        { species: 'stachli', minLevel: 22, maxLevel: 25, weight: 40 },
        { species: 'wuehli', minLevel: 22, maxLevel: 25, weight: 35 },
        { species: 'bergmaennli', minLevel: 23, maxLevel: 25, weight: 25 },
      ],
    },
  },
  /** Tall grass on the city outskirts. */
  funkenstadt: {
    grass: {
      rate: 0.1,
      slots: [
        { species: 'zuckli', minLevel: 22, maxLevel: 25, weight: 70 },
        { species: 'guggerli', minLevel: 23, maxLevel: 25, weight: 30 },
      ],
    },
  },

  // --- AREA 4 ----------------------------------------------------------------------------------
  pfad_4: {
    grass: {
      rate: 0.12,
      slots: [
        { species: 'zuckli', minLevel: 27, maxLevel: 29, weight: 20 },
        { species: 'dohlerich', minLevel: 27, maxLevel: 30, weight: 20 },
        { species: 'stachli', minLevel: 27, maxLevel: 29, weight: 15 },
        { species: 'zuckwiesel', minLevel: 28, maxLevel: 30, weight: 15 },
        { species: 'steimandli', minLevel: 29, maxLevel: 31, weight: 10 },
        { species: 'gondeli', minLevel: 28, maxLevel: 30, weight: 8 },
        { species: 'guggerli', minLevel: 28, maxLevel: 30, weight: 7 },
        { species: 'pfiffmungg', minLevel: 29, maxLevel: 31, weight: 5 },
      ],
    },
  },
  /** Snow grass around the village. */
  frostalp: {
    grass: {
      rate: 0.1,
      slots: [
        { species: 'floeckli', minLevel: 30, maxLevel: 33, weight: 65 },
        { species: 'bernhardin', minLevel: 31, maxLevel: 33, weight: 35 },
      ],
    },
  },
  gipfelpfad: {
    grass: {
      rate: 0.12,
      slots: [
        { species: 'floeckli', minLevel: 33, maxLevel: 35, weight: 22 },
        { species: 'steimandli', minLevel: 34, maxLevel: 36, weight: 15 },
        { species: 'foehngeier', minLevel: 34, maxLevel: 37, weight: 15 },
        { species: 'bernhardin', minLevel: 34, maxLevel: 36, weight: 12 },
        { species: 'dohlerich', minLevel: 34, maxLevel: 36, weight: 10 },
        { species: 'firnhase', minLevel: 35, maxLevel: 37, weight: 8 },
        { species: 'wyssli', minLevel: 34, maxLevel: 36, weight: 7 },
        { species: 'firngeist', minLevel: 35, maxLevel: 37, weight: 6 },
        { species: 'sturmdohle', minLevel: 36, maxLevel: 38, weight: 5 },
      ],
    },
  },
};
