import { describe, expect, it } from 'vitest';
import { FONT } from '../src/art/font';
import { CHAR_SPRITE_IDS, MUSIC_IDS } from '../src/core/types';
import { getItem, getMove, getSpecies, hasSpecies, typeEffectiveness } from '../src/data';
import { BADGES } from '../src/data/badges';
import { DEV_TRAINERS } from '../src/data/dev-trainers';
import { ENCOUNTERS } from '../src/data/encounters';
import { SHOPS } from '../src/data/shops';
import { LEFTOVER_STARTER, RIVAL_STARTER, rivalTrainerId, TRAINERS } from '../src/data/trainers';

const SNAKE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
const STARTERS = ['sproessli', 'zuendli', 'biberli'];

/** Characters the dialog box can draw (plus line/page breaks). */
function unrenderable(text: string): string[] {
  return [...text].filter((ch) => ch !== ' ' && ch !== '\n' && ch !== '\f' && !(ch in FONT.glyphs));
}

/** The species and everything it evolves into. */
function line(speciesId: string): string[] {
  const s = getSpecies(speciesId);
  return s.evolves ? [s.id, ...line(s.evolves.to)] : [s.id];
}

describe('trainers', () => {
  it('have unique snake_case ids, valid sprites, music, parties and items', () => {
    const ids = [...TRAINERS, ...DEV_TRAINERS].map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TRAINERS) {
      expect(t.id, t.id).toMatch(SNAKE);
      expect(CHAR_SPRITE_IDS, t.id).toContain(t.sprite);
      if (t.music) expect(MUSIC_IDS, t.id).toContain(t.music);
      expect(t.party.length, t.id).toBeGreaterThanOrEqual(1);
      expect(t.party.length, t.id).toBeLessThanOrEqual(6);
      expect(t.reward, t.id).toBeGreaterThan(0);
      for (const m of t.party) {
        expect(hasSpecies(m.species), `${t.id}: ${m.species}`).toBe(true);
        expect(m.level, t.id).toBeGreaterThanOrEqual(2);
        expect(m.level, t.id).toBeLessThanOrEqual(50);
        if (m.moves) {
          expect(m.moves.length, t.id).toBeLessThanOrEqual(4);
          for (const mv of m.moves) expect(() => getMove(mv), `${t.id}: ${mv}`).not.toThrow();
        }
      }
      for (const item of t.items ?? []) expect(getItem(item).pocket, `${t.id}: ${item}`).toBe('items');
    }
  });

  it('have short, renderable German lines', () => {
    for (const t of TRAINERS) {
      for (const text of [t.intro, t.defeat, t.after]) {
        expect(text.length, `${t.id}: "${text}"`).toBeGreaterThan(0);
        expect(text.length, `${t.id}: "${text}"`).toBeLessThanOrEqual(90);
        expect(unrenderable(text), `${t.id}: "${text}"`).toEqual([]);
      }
    }
  });

  it('every rival battle exists for all three rival starters and ends with that starter line', () => {
    for (const battle of ['rival1', 'rival2', 'rival3', 'rival4'] as const) {
      for (const player of STARTERS) {
        const id = rivalTrainerId(battle, player);
        const t = TRAINERS.find((x) => x.id === id);
        expect(t, id).toBeDefined();
        const ace = t!.party[t!.party.length - 1]!;
        expect(line(RIVAL_STARTER[player]!), id).toContain(ace.species);
        expect(t!.sprite).toBe('rival');
      }
    }
    expect(() => rivalTrainerId('rival1', '')).toThrow();
  });

  it('the rival starter beats the player starter; the leftover is the third one', () => {
    for (const player of STARTERS) {
      const rival = RIVAL_STARTER[player]!;
      const leftover = LEFTOVER_STARTER[player]!;
      expect(typeEffectiveness(getSpecies(rival).types[0], getSpecies(player).types)).toBe(2);
      expect(new Set([player, rival, leftover])).toEqual(new Set(STARTERS));
    }
  });
});

describe('level curve (docs/DESIGN.md)', () => {
  const ace = (id: string) => Math.max(...TRAINERS.find((t) => t.id === id)!.party.map((m) => m.level));

  it('story fights get stronger along the story; the rival always brings his starter as his strongest', () => {
    const story = ['leader_jost', 'leader_undine', 'admin_bise_1', 'leader_zita', 'leader_firna', 'admin_bise_2', 'boss_eisner'];
    story.slice(1).forEach((id, i) => expect(ace(id), id).toBeGreaterThanOrEqual(ace(story[i]!)));
    for (const player of STARTERS) {
      const ids = (['rival1', 'rival2', 'rival3', 'rival4'] as const).map((b) => rivalTrainerId(b, player));
      ids.slice(1).forEach((id, i) => expect(ace(id), id).toBeGreaterThan(ace(ids[i]!)));
      for (const id of ids) expect(TRAINERS.find((t) => t.id === id)!.party.at(-1)!.level, id).toBe(ace(id));
    }
  });
});

describe('badges', () => {
  it('are the four leaders in story order', () => {
    expect(BADGES.map((b) => b.id)).toEqual(['badge_earth', 'badge_water', 'badge_spark', 'badge_frost']);
    const sprites = ['leader_earth', 'leader_water', 'leader_spark', 'leader_frost'];
    BADGES.forEach((b, i) => {
      const leader = TRAINERS.find((t) => t.id === b.leader);
      expect(leader, b.leader).toBeDefined();
      expect(leader!.sprite).toBe(sprites[i]);
      expect(['Hüter', 'Hüterin']).toContain(leader!.className);
      expect(leader!.music).toBe('battle_leader');
      // every leader picks moves carefully; Jost's ace carries no earth move, which keeps Halle 1 fair for fire
      expect(leader!.ai).toBe('smart');
      expect(unrenderable(b.name)).toEqual([]);
    });
  });
});

describe('encounters', () => {
  it('reference valid species with sane levels, weights and rates', () => {
    for (const [mapId, tables] of Object.entries(ENCOUNTERS)) {
      expect(mapId).toMatch(SNAKE);
      for (const table of [tables.grass, tables.cave]) {
        if (!table) continue;
        expect(table.rate, mapId).toBeGreaterThanOrEqual(0.05);
        expect(table.rate, mapId).toBeLessThanOrEqual(0.2);
        expect(table.slots.length, mapId).toBeGreaterThan(0);
        for (const s of table.slots) {
          expect(hasSpecies(s.species), `${mapId}: ${s.species}`).toBe(true);
          expect(s.minLevel, mapId).toBeGreaterThanOrEqual(1);
          expect(s.minLevel, mapId).toBeLessThanOrEqual(s.maxLevel);
          expect(s.weight, mapId).toBeGreaterThan(0);
          expect(getSpecies(s.species).catchRate, `${mapId}: no legendaries in the wild`).toBeGreaterThan(3);
        }
      }
    }
  });
});

describe('shops', () => {
  it('exist for every Halle town and only sell buyable items', () => {
    expect(Object.keys(SHOPS).sort()).toEqual(BADGES.map((b) => b.town).sort());
    for (const [town, stock] of Object.entries(SHOPS)) {
      expect(new Set(stock).size, town).toBe(stock.length);
      for (const id of stock) {
        const item = getItem(id);
        expect(item.price, `${town}: ${id}`).toBeGreaterThan(0);
        expect(item.pocket, `${town}: ${id}`).not.toBe('key');
      }
    }
  });
});
