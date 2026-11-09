/** Procedural sound effects as voice lists (pure data). Times in seconds, frequencies in Hz. */
import type { SfxId } from '../core/types';
import type { Envelope, TimedVoice, Wave } from './synth';

const SEMI: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

/** 'a4' → 440, 'c#6' → 1108.7 */
function hz(note: string): number {
  const m = /^([a-g])(#?)(\d)$/.exec(note);
  if (!m) throw new Error(`bad note ${note}`);
  const midi = 12 * (Number(m[3]) + 1) + (SEMI[m[1]!] ?? 0) + (m[2] ? 1 : 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const BLIP: Envelope = { a: 0.002, d: 0.04, s: 0.5, r: 0.02 };
const FLAT: Envelope = { a: 0.003, d: 0, s: 1, r: 0.03 };
const BELL: Envelope = { a: 0.002, d: 0.35, s: 0, r: 0.15 };
const perc = (d: number): Envelope => ({ a: 0.001, d, s: 0, r: 0.02 });

function v(at: number, wave: Wave, freq: number, dur: number, gain: number, extra: Partial<TimedVoice> = {}): TimedVoice {
  return { at, wave, freq, dur, gain, env: BLIP, ...extra };
}

function times<T>(n: number, f: (i: number) => T): T[] {
  return Array.from({ length: n }, (_, i) => f(i));
}

export const SFX: Readonly<Record<SfxId, readonly TimedVoice[]>> = {
  cursor: [v(0, 'pulse25', hz('e6'), 0.03, 0.12, { env: { a: 0.001, d: 0.03, s: 0.3, r: 0.015 } })],
  confirm: [v(0, 'pulse25', hz('a5'), 0.04, 0.13), v(0.045, 'pulse25', hz('e6'), 0.07, 0.13)],
  cancel: [v(0, 'pulse25', hz('e6'), 0.04, 0.12), v(0.045, 'pulse25', hz('a5'), 0.06, 0.12)],
  bump: [
    v(0, 'triangle', 120, 0.09, 0.45, { to: 55, env: perc(0.1) }),
    v(0, 'noise', 0.12, 0.05, 0.2, { env: perc(0.06), filter: { type: 'lowpass', freq: 500 } }),
  ],
  door: [
    v(0, 'noise', 0.6, 0.18, 0.25, { env: { a: 0.02, d: 0.16, s: 0, r: 0.03 }, filter: { type: 'bandpass', freq: 600, to: 2400, q: 1.5 } }),
    v(0.16, 'triangle', 300, 0.04, 0.3, { to: 150, env: perc(0.05) }),
  ],
  stairs: ['g3', 'e3', 'c3', 'g2'].flatMap((n, i) => [
    v(i * 0.08, 'triangle', hz(n), 0.06, 0.4, { env: perc(0.07) }),
    v(i * 0.08, 'noise', 0.3, 0.02, 0.1, { env: perc(0.03), filter: { type: 'lowpass', freq: 1500 } }),
  ]),
  save: [
    ...['c6', 'e6', 'g6', 'c7'].map((n, i) => v(i * 0.07, 'pulse12', hz(n), 0.1, 0.1, { env: { ...BELL, d: 0.5 } })),
    v(0, 'pulse25', hz('c5'), 0.35, 0.05, { env: { a: 0.02, d: 0.3, s: 0.3, r: 0.2 } }),
  ],
  menu_open: [v(0, 'pulse25', 600, 0.06, 0.12, { to: 1500 })],
  exclaim: [
    v(0, 'pulse50', hz('b6'), 0.05, 0.11),
    v(0.06, 'pulse50', hz('e7'), 0.1, 0.11, { env: { ...BELL, d: 0.18 } }),
  ],
  encounter: [
    ...times(6, (i) => v(i * 0.08, 'pulse50', 400, 0.07, 0.12, { to: 1600, env: FLAT })),
    v(0, 'noise', 1, 0.5, 0.1, { env: perc(0.5), filter: { type: 'highpass', freq: 3000 } }),
  ],
  hit: [
    v(0, 'noise', 0.5, 0.1, 0.35, { env: perc(0.12), filter: { type: 'lowpass', freq: 2500 } }),
    v(0, 'triangle', 160, 0.08, 0.4, { to: 50, env: perc(0.09) }),
  ],
  hit_super: [
    v(0, 'noise', 0.7, 0.2, 0.4, { env: perc(0.22), filter: { type: 'lowpass', freq: 4000 } }),
    v(0, 'triangle', 200, 0.14, 0.5, { to: 40, env: perc(0.15) }),
    v(0.07, 'noise', 0.4, 0.12, 0.3, { env: perc(0.12) }),
    v(0, 'pulse50', 900, 0.1, 0.08, { to: 200, env: perc(0.12) }),
  ],
  hit_weak: [
    v(0, 'noise', 0.35, 0.06, 0.25, { env: perc(0.07), filter: { type: 'lowpass', freq: 1200 } }),
    v(0, 'triangle', 120, 0.05, 0.25, { to: 70, env: perc(0.06) }),
  ],
  miss: [
    v(0, 'noise', 1, 0.2, 0.22, { env: { a: 0.08, d: 0.12, s: 0, r: 0.03 }, filter: { type: 'bandpass', freq: 500, to: 3500, q: 2 } }),
  ],
  faint: [
    v(0, 'pulse25', 900, 0.7, 0.14, { to: 80, env: { a: 0.005, d: 0, s: 1, r: 0.1 }, vibrato: { cents: 30, rate: 9, delay: 0 } }),
    v(0, 'triangle', 300, 0.7, 0.2, { to: 50, env: { a: 0.005, d: 0.6, s: 0.2, r: 0.1 } }),
  ],
  throw: [
    v(0, 'noise', 1, 0.3, 0.2, { env: { a: 0.02, d: 0.28, s: 0, r: 0.03 }, filter: { type: 'bandpass', freq: 2500, to: 700, q: 3 } }),
    v(0, 'pulse12', 1300, 0.25, 0.06, { to: 500, env: { a: 0.01, d: 0.24, s: 0, r: 0.02 } }),
  ],
  shake: times(3, (i) => i * 0.06).flatMap((at) => [
    v(at, 'metal', 900, 0.03, 0.12, { env: perc(0.04) }),
    v(at, 'triangle', 260, 0.03, 0.25, { to: 200, env: perc(0.04) }),
  ]),
  catch_fail: [
    v(0, 'pulse50', 250, 0.07, 0.14, { to: 1300 }),
    v(0.05, 'noise', 0.8, 0.08, 0.2, { env: perc(0.09), filter: { type: 'highpass', freq: 1000 } }),
    v(0.08, 'pulse25', 1000, 0.12, 0.08, { to: 300, env: perc(0.13) }),
  ],
  run: [0.18, 0.13, 0.08].flatMap((g, i) => [
    v(i * 0.1, 'noise', 1, 0.09, g, { env: perc(0.1), filter: { type: 'bandpass', freq: 2000, to: 500, q: 2 } }),
    v(i * 0.1, 'pulse12', 800, 0.08, g / 3, { to: 300, env: perc(0.09) }),
  ]),
  exp_fill: times(14, (i) => v(i * 0.04, 'pulse12', 500 * Math.pow(2, i / 7), 0.03, 0.07)),
  stat_up: [
    ...times(3, (i) => v(i * 0.12, 'pulse25', 500, 0.1, 0.11, { to: 1000, env: FLAT })),
    v(0.36, 'pulse25', 1000, 0.15, 0.11, { to: 2000, env: { a: 0.003, d: 0.15, s: 0, r: 0.03 } }),
  ],
  stat_down: [
    ...times(3, (i) => v(i * 0.12, 'pulse25', 1000, 0.1, 0.11, { to: 500, env: FLAT })),
    v(0.36, 'pulse25', 500, 0.15, 0.11, { to: 250, env: { a: 0.003, d: 0.15, s: 0, r: 0.03 } }),
  ],
  status: [
    v(0, 'pulse12', 500, 0.4, 0.1, { env: { a: 0.01, d: 0.2, s: 0.6, r: 0.08 }, vibrato: { cents: 300, rate: 12, delay: 0 } }),
    v(0, 'pulse25', 707, 0.4, 0.06, { env: { a: 0.01, d: 0.2, s: 0.6, r: 0.08 }, vibrato: { cents: 200, rate: 9, delay: 0 } }),
  ],
  heal_hp: [
    ...['c6', 'e6', 'g6', 'c7', 'e7', 'g7'].map((n, i) => v(i * 0.05, 'pulse12', hz(n), 0.06, 0.07, { env: { ...BELL, d: 0.25 } })),
    v(0, 'triangle', 400, 0.3, 0.1, { to: 800, env: { a: 0.02, d: 0.28, s: 0, r: 0.05 } }),
  ],
  buy: [
    v(0, 'metal', 1800, 0.02, 0.1, { env: perc(0.03) }),
    v(0.03, 'pulse50', hz('g6'), 0.05, 0.1),
    v(0.09, 'pulse50', hz('d7'), 0.2, 0.1, { env: { ...BELL, d: 0.3 } }),
  ],
  ledge: [
    v(0, 'pulse25', 300, 0.08, 0.12, { to: 800, env: FLAT }),
    v(0.08, 'pulse25', 800, 0.12, 0.1, { to: 250, env: { a: 0.002, d: 0.12, s: 0, r: 0.02 } }),
    v(0.2, 'triangle', 120, 0.05, 0.3, { to: 60, env: perc(0.06) }),
  ],
  text: [v(0, 'pulse25', 1200, 0.012, 0.035, { env: { a: 0.001, d: 0.012, s: 0, r: 0.005 } })],
  grass: [
    v(0, 'noise', 1, 0.06, 0.09, { env: { a: 0.01, d: 0.07, s: 0, r: 0.02 }, filter: { type: 'highpass', freq: 2500 } }),
    v(0.06, 'noise', 1, 0.05, 0.06, { env: { a: 0.01, d: 0.06, s: 0, r: 0.02 }, filter: { type: 'highpass', freq: 3000 } }),
  ],
};
