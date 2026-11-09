/** Seeded PRNG (mulberry32). All game randomness goes through an Rng so tests are deterministic. */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** True with probability p (0..1). */
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Weighted pick; weights must be > 0. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
  getState(): number;
  setState(state: number): void;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (items) => {
      if (items.length === 0) throw new Error('rng.pick on empty array');
      return items[Math.floor(next() * items.length)]!;
    },
    weighted: (items, weight) => {
      const total = items.reduce((sum, it) => sum + weight(it), 0);
      let r = next() * total;
      for (const it of items) {
        r -= weight(it);
        if (r < 0) return it;
      }
      return items[items.length - 1]!;
    },
    getState: () => s,
    setState: (state) => {
      s = state >>> 0;
    },
  };
  return rng;
}
