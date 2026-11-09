import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { TYPE_IDS } from '../src/core/types';
import type { MoveDef, SpeciesDef } from '../src/core/types';
import { calcStats, createCreature } from '../src/creature';
import { ITEMS, MOVES, SPECIES, TYPE_CHART, getMove, getSpecies, hasSpecies, typeEffectiveness } from '../src/data';

const bst = (s: SpeciesDef) => Object.values(s.base).reduce((a, b) => a + b, 0);
const preEvolution = new Map(SPECIES.flatMap((s) => (s.evolves ? [[s.evolves.to, s.id] as const] : [])));

type Stage = 'first' | 'middle' | 'final' | 'twoStageFinal' | 'single' | 'legendary';
function stageOf(s: SpeciesDef): Stage {
  const from = preEvolution.get(s.id);
  if (s.evolves) return from ? 'middle' : 'first';
  if (from) return preEvolution.has(from) ? 'final' : 'twoStageFinal';
  return s.catchRate < 10 ? 'legendary' : 'single';
}

/** The species and all its evolutions, in order. */
function evolutionChain(id: string): SpeciesDef[] {
  const s = getSpecies(id);
  return s.evolves ? [s, ...evolutionChain(s.evolves.to)] : [s];
}

describe('ids and names', () => {
  it('ids are unique and dexNos are contiguous from 1', () => {
    for (const list of [SPECIES, MOVES, ITEMS]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    const dex = SPECIES.map((s) => s.dexNo).sort((a, b) => a - b);
    expect(dex).toEqual(dex.map((_, i) => i + 1));
  });

  it('species ids are the ascii-lowercased names', () => {
    const toId = (name: string) =>
      name.toLowerCase().replaceAll('ä', 'ae').replaceAll('ö', 'oe').replaceAll('ü', 'ue').replaceAll('ß', 'ss');
    for (const s of SPECIES) expect(s.id).toBe(toId(s.name));
  });

  it('names and texts respect length limits', () => {
    for (const s of SPECIES) {
      expect(s.name.length, s.id).toBeLessThanOrEqual(10);
      expect(s.dex.text.length, s.id).toBeLessThanOrEqual(140);
    }
    for (const m of MOVES) {
      expect(m.name.length, m.id).toBeLessThanOrEqual(12);
      expect(m.desc.length, m.id).toBeLessThanOrEqual(60);
    }
    for (const item of ITEMS) expect(item.name.length, item.id).toBeLessThanOrEqual(14);
  });
});

describe('type chart', () => {
  it('uses only 0 / 0.5 / 2 and stays balanced', () => {
    let immunities = 0;
    for (const attacker of TYPE_IDS) {
      const row = Object.entries(TYPE_CHART[attacker] ?? {});
      for (const [defender, value] of row) {
        expect(TYPE_IDS, defender).toContain(defender);
        expect([0, 0.5, 2], `${attacker}→${defender}`).toContain(value);
      }
      const count = (v: number) => row.filter(([, x]) => x === v).length;
      expect(count(2), attacker).toBeGreaterThanOrEqual(2);
      expect(count(2), attacker).toBeLessThanOrEqual(3);
      expect(count(0.5), attacker).toBeGreaterThanOrEqual(2);
      expect(count(0.5), attacker).toBeLessThanOrEqual(3);
      immunities += count(0);
    }
    expect(immunities).toBeLessThanOrEqual(3);
  });

  it('the starter types beat each other in a circle', () => {
    expect(typeEffectiveness('plant', ['water'])).toBe(2);
    expect(typeEffectiveness('water', ['fire'])).toBe(2);
    expect(typeEffectiveness('fire', ['plant'])).toBe(2);
  });

  it('every type appears on at least 3 species', () => {
    for (const t of TYPE_IDS) {
      expect(SPECIES.filter((s) => s.types.includes(t)).length, t).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('moves', () => {
  it('has the struggle fallback', () => {
    const s = getMove('struggle');
    expect(s).toMatchObject({ type: 'normal', category: 'physical', power: 50, accuracy: 0, pp: 1 });
    expect(s.effects).toContainEqual({ kind: 'recoil', fraction: 0.25 });
  });

  it('status moves have no power, damaging moves do', () => {
    for (const m of MOVES) {
      if (m.category === 'status') expect(m.power, m.id).toBe(0);
      else expect(m.power, m.id).toBeGreaterThan(0);
    }
  });

  it('no move is strictly better than a plain move of the same type and category', () => {
    const plain = (m: MoveDef) => !m.effects && !m.multiHit && !m.highCrit && !m.priority;
    const hasDrawback = (m: MoveDef) =>
      (m.effects ?? []).some((e) => e.kind === 'recoil' || (e.kind === 'stat' && e.who === 'self' && e.stages < 0));
    const accuracy = (m: MoveDef) => (m.accuracy === 0 ? 101 : m.accuracy);
    for (const weak of MOVES.filter((m) => m.category !== 'status' && plain(m))) {
      for (const strong of MOVES) {
        if (strong === weak || strong.id === 'struggle' || strong.multiHit || hasDrawback(strong)) continue;
        if (strong.type !== weak.type || strong.category !== weak.category) continue;
        const dominates = strong.power >= weak.power && accuracy(strong) >= accuracy(weak) && strong.pp >= weak.pp;
        expect(dominates, `${strong.id} dominates ${weak.id}`).toBe(false);
      }
    }
  });
});

describe('learnsets', () => {
  it('reference existing moves, are sorted and start with a damaging move', () => {
    for (const s of SPECIES) {
      const levels = s.learnset.map((e) => e.level);
      expect(levels, s.id).toEqual([...levels].sort((a, b) => a - b));
      expect(s.learnset.length, s.id).toBeGreaterThanOrEqual(8);
      expect(s.learnset.length, s.id).toBeLessThanOrEqual(12);
      const moves = s.learnset.map((e) => e.move);
      expect(new Set(moves).size, s.id).toBe(moves.length);
      expect(moves, s.id).not.toContain('struggle');
      for (const id of moves) getMove(id);

      const start = s.learnset.filter((e) => e.level === 1).map((e) => getMove(e.move));
      expect(start.length, s.id).toBe(2);
      expect(start.some((m) => m.category !== 'status'), s.id).toBe(true);
    }
  });
});

describe('evolution', () => {
  it('targets exist, levels are reachable and chains do not cycle', () => {
    for (const s of SPECIES) {
      if (!s.evolves) continue;
      expect(hasSpecies(s.evolves.to), s.id).toBe(true);
      expect(s.evolves.level, s.id).toBeGreaterThanOrEqual(2);
      expect(s.evolves.level, s.id).toBeLessThanOrEqual(36);
      const from = preEvolution.get(s.id);
      const fromLevel = from ? SPECIES.find((x) => x.id === from)?.evolves?.level : undefined;
      if (fromLevel !== undefined) expect(s.evolves.level, s.id).toBeGreaterThan(fromLevel);
    }
    for (const s of SPECIES) {
      const seen = new Set<string>();
      let cur: SpeciesDef | undefined = s;
      while (cur?.evolves) {
        expect(seen.has(cur.id), s.id).toBe(false);
        seen.add(cur.id);
        const to: string = cur.evolves.to;
        cur = SPECIES.find((x) => x.id === to);
      }
    }
  });

  it('each species has at most one pre-evolution', () => {
    const targets = SPECIES.flatMap((s) => (s.evolves ? [s.evolves.to] : []));
    expect(new Set(targets).size).toBe(targets.length);
  });
});

describe('balance', () => {
  const ranges: Record<Stage, readonly [number, number][]> = {
    first: [[290, 320]],
    middle: [[400, 430]],
    final: [[500, 535]],
    twoStageFinal: [[420, 490]],
    single: [[280, 330], [430, 480]],
    legendary: [[580, 600]],
  };

  it('base stat totals fit the evolution stage', () => {
    for (const s of SPECIES) {
      const total = bst(s);
      const ok = ranges[stageOf(s)].some(([lo, hi]) => total >= lo && total <= hi);
      expect(ok, `${s.id} (${stageOf(s)}) BST ${total}`).toBe(true);
    }
  });

  it('starters evolve at the same levels with matching stat totals', () => {
    const lines = ['sproessli', 'zuendli', 'biberli'].map(evolutionChain);
    for (const line of lines) expect(line.length).toBe(3);
    for (let stage = 0; stage < 3; stage++) {
      const species = lines.flatMap((line) => line.slice(stage, stage + 1));
      const totals = species.map(bst);
      expect(Math.max(...totals) - Math.min(...totals), `stage ${stage}`).toBeLessThanOrEqual(10);
      expect(new Set(species.map((s) => s.evolves?.level)).size, `stage ${stage}`).toBe(1);
    }
  });

  it('there is exactly one legendary', () => {
    expect(SPECIES.filter((s) => stageOf(s) === 'legendary').map((s) => s.id)).toEqual(['lindglut']);
  });
});

describe('creatures', () => {
  it('every species can be created at levels 1, 25 and 50', () => {
    for (const s of SPECIES) {
      for (const level of [1, 25, 50]) {
        const c = createCreature(s.id, level, createRng(1));
        const st = calcStats(c);
        for (const v of Object.values(st)) expect(v, `${s.id} L${level}`).toBeGreaterThan(0);
        expect(c.hp).toBe(st.hp);
        expect(c.moves.length, `${s.id} L${level}`).toBeGreaterThanOrEqual(1);
        expect(c.moves.length, `${s.id} L${level}`).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe('items', () => {
  it('contains every item the game relies on', () => {
    const required = [
      'potion', 'super_potion', 'hyper_potion', 'full_potion', 'restore', 'antidote', 'burn_salve', 'wake_herb',
      'para_cure', 'cure_all', 'revive', 'ether', 'crystal', 'crystal_great', 'crystal_ultra', 'crystal_master',
      'repel', 'repel_max', 'candy',
    ];
    const ids = ITEMS.map((i) => i.id);
    for (const id of required) expect(ids, id).toContain(id);
    for (const item of ITEMS.filter((i) => i.use.kind === 'crystal')) {
      expect(item.pocket, item.id).toBe('crystals');
      expect(item.usable, item.id).toBe('battle');
    }
  });
});
