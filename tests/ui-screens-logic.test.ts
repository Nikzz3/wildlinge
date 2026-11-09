import { describe, expect, it } from 'vitest';
import type { Creature, SaveData } from '../src/core/types';
import { createRng } from '../src/core/rng';
import { createCreature, maxHp } from '../src/creature';
import { getItem } from '../src/data';
import { newGameState } from '../src/state';
import {
  badgeSlots, finalName, itemPreview, keyAt, MONEY_MAX, pocketItems, sellMax, trainerNumber, usableInBattle,
} from '../src/ui/screens/logic';

const creature = (level = 10): Creature => createCreature('sproessli', level, createRng(1), { uid: 1 });

describe('itemPreview', () => {
  it('shows the healed amount and does not mutate the creature', () => {
    const c = creature();
    c.hp = 5;
    const before = structuredClone(c);
    expect(itemPreview(c, getItem('potion'))).toEqual({ ok: true, label: '+20 LP' });
    expect(c).toEqual(before);
  });

  it('caps healing at max HP and reports useless items', () => {
    const c = creature();
    c.hp = maxHp(c) - 3;
    expect(itemPreview(c, getItem('potion')).label).toBe('+3 LP');
    c.hp = maxHp(c);
    expect(itemPreview(c, getItem('potion'))).toEqual({ ok: false, label: 'Nutzlos' });
    expect(itemPreview(c, getItem('revive')).ok).toBe(false);
  });

  it('labels cures, revives and candy', () => {
    const c = creature(10);
    c.status = 'poison';
    expect(itemPreview(c, getItem('antidote'))).toEqual({ ok: true, label: 'Heilt' });
    expect(itemPreview(c, getItem('burn_salve')).ok).toBe(false);
    expect(itemPreview(c, getItem('candy'))).toEqual({ ok: true, label: 'Lv11' });
    c.hp = 0;
    expect(itemPreview(c, getItem('revive'))).toEqual({ ok: true, label: `+${Math.floor(maxHp(c) / 2)} LP` });
  });
});

describe('badgeSlots', () => {
  it('maps known badge ids to their story slot regardless of earning order', () => {
    expect(badgeSlots([])).toEqual([false, false, false, false]);
    expect(badgeSlots(['badge_spark', 'badge_earth'])).toEqual([true, false, true, false]);
  });

  it('puts unknown ids into the first free slots without overflowing', () => {
    expect(badgeSlots(['badge_water', 'mystery'])).toEqual([true, true, false, false]);
    expect(badgeSlots(['a', 'b', 'c', 'd', 'e'])).toEqual([true, true, true, true]);
  });
});

describe('trainerNumber', () => {
  it('is a stable 5-digit number derived from the name', () => {
    expect(trainerNumber('Kai')).toBe('14088');
    expect(trainerNumber('Kai')).toBe(trainerNumber('Kai'));
    expect(trainerNumber('Lio')).not.toBe(trainerNumber('Kai'));
    expect(trainerNumber('Ä')).toMatch(/^\d{5}$/);
  });
});

describe('name entry keyboard', () => {
  it('returns characters for cells and null for empty or missing ones', () => {
    expect(keyAt(0, 0, 0)).toBe('A');
    expect(keyAt(1, 0, 0)).toBe('a');
    expect(keyAt(2, 0, 0)).toBe('Ä');
    expect(keyAt(2, 1, 9)).toBeNull(); // blank cell
    expect(keyAt(0, 3, 0)).toBeNull();
    expect(keyAt(9, 0, 0)).toBeNull();
  });

  it('never yields an empty name', () => {
    expect(finalName('  Mia ', 'Kai')).toBe('Mia');
    expect(finalName('   ', 'Kai')).toBe('Kai');
    expect(finalName('', 'Lio')).toBe('Lio');
  });
});

describe('pocketItems', () => {
  const state = (): SaveData => {
    const s = newGameState({ mapId: 'test', x: 0, y: 0, facing: 'down' });
    s.bag = { candy: 1, potion: 2, crystal: 3, repel: 0 };
    return s;
  };

  it('lists owned items of one pocket in data order', () => {
    expect(pocketItems(state(), 'items').map((i) => i.id)).toEqual(['potion', 'candy']);
    expect(pocketItems(state(), 'crystals').map((i) => i.id)).toEqual(['crystal']);
    expect(pocketItems(state(), 'key')).toEqual([]);
  });

  it('applies the filter (battle bag hides field-only items)', () => {
    expect(pocketItems(state(), 'items', usableInBattle).map((i) => i.id)).toEqual(['potion']);
  });
});

describe('sellMax', () => {
  it('limits the quantity so the money cap never swallows proceeds', () => {
    expect(sellMax(5, 100, 0)).toBe(5);
    expect(sellMax(999, 1250, 0)).toBe(Math.floor(MONEY_MAX / 1250));
    expect(sellMax(3, 100, MONEY_MAX - 150)).toBe(1);
    expect(sellMax(3, 100, MONEY_MAX)).toBe(0);
    expect(sellMax(3, 0, 0)).toBe(0);
  });
});
