/** Instrument envelopes, vibrato presets, drum kit and channel mix. Pure data (see docs/MUSIC.md). */
import type { Envelope, TimedVoice, Vibrato } from './synth';

export interface Instrument {
  name: string;
  env: Envelope;
}

/** Selected with `@n` on p1 / p2 / tri. */
export const INSTRUMENTS: readonly Instrument[] = [
  { name: 'lead', env: { a: 0.006, d: 0.15, s: 0.7, r: 0.05 } },
  { name: 'pluck', env: { a: 0.002, d: 0.4, s: 0, r: 0.03 } },
  { name: 'soft', env: { a: 0.05, d: 0.25, s: 0.8, r: 0.15 } },
  { name: 'blip', env: { a: 0.002, d: 0.07, s: 0.15, r: 0.02 } },
  { name: 'swell', env: { a: 0.35, d: 0, s: 1, r: 0.25 } },
  { name: 'bell', env: { a: 0.002, d: 1.2, s: 0, r: 0.5 } },
  { name: 'flat', env: { a: 0.004, d: 0, s: 1, r: 0.02 } },
];

/** Selected with `~n`. Depth in cents; the vibrato fades in after `delay` seconds. */
export const VIBRATOS: readonly (Vibrato | null)[] = [
  null,
  { cents: 12, rate: 5.5, delay: 0.2 },
  { cents: 25, rate: 5.5, delay: 0.15 },
  { cents: 50, rate: 6, delay: 0.1 },
];

export type DrumId = 'kick' | 'snare' | 'hat' | 'openhat' | 'crash' | 'tom' | 'click';

/** Letters used on the noise channel. */
export const DRUM_LETTERS: Readonly<Record<string, DrumId>> = {
  k: 'kick', s: 'snare', h: 'hat', o: 'openhat', c: 'crash', t: 'tom', x: 'click',
};

/** Peak gain of a note at v15 per tonal channel (triangle is perceived quieter than pulse). */
export const CHANNEL_GAIN = { p1: 0.16, p2: 0.16, tri: 0.34 } as const;

const PERC: Envelope = { a: 0.001, d: 0.12, s: 0, r: 0.02 };

/** Voices for one drum hit at full volume (scaled by the caller). */
export const DRUMS: Readonly<Record<DrumId, readonly TimedVoice[]>> = {
  kick: [
    { at: 0, wave: 'triangle', freq: 170, to: 42, slide: 0.09, dur: 0.11, gain: 0.6, env: { ...PERC, d: 0.13 } },
    { at: 0, wave: 'noise', freq: 0.25, dur: 0.02, gain: 0.18, env: { ...PERC, d: 0.03 }, filter: { type: 'lowpass', freq: 1500 } },
  ],
  snare: [
    { at: 0, wave: 'noise', freq: 1, dur: 0.14, gain: 0.3, env: { ...PERC, d: 0.15 }, filter: { type: 'highpass', freq: 1200 } },
    { at: 0, wave: 'triangle', freq: 230, to: 150, dur: 0.05, gain: 0.3, env: { ...PERC, d: 0.06 } },
  ],
  hat: [{ at: 0, wave: 'noise', freq: 1, dur: 0.03, gain: 0.14, env: { ...PERC, d: 0.035 }, filter: { type: 'highpass', freq: 7000 } }],
  openhat: [
    { at: 0, wave: 'noise', freq: 1, dur: 0.2, gain: 0.12, env: { ...PERC, d: 0.22, r: 0.05 }, filter: { type: 'highpass', freq: 6000 } },
  ],
  crash: [
    { at: 0, wave: 'noise', freq: 1, dur: 0.8, gain: 0.16, env: { ...PERC, d: 0.9, r: 0.2 }, filter: { type: 'highpass', freq: 3500 } },
    { at: 0, wave: 'metal', freq: 520, dur: 0.3, gain: 0.04, env: { ...PERC, d: 0.35 } },
  ],
  tom: [{ at: 0, wave: 'triangle', freq: 210, to: 105, dur: 0.16, gain: 0.5, env: { ...PERC, d: 0.18 } }],
  click: [{ at: 0, wave: 'metal', freq: 1400, dur: 0.03, gain: 0.1, env: { ...PERC, d: 0.04 } }],
};
