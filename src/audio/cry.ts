/** Procedural creature cries: 2–3 swept pulse/noise segments derived from a hash of the species id. */
import { createRng } from '../core/rng';
import type { TimedVoice, Wave } from './synth';

export interface CryOpts {
  /** Pitch factor (1 = normal). */
  pitch?: number;
  /** Lower, slower and fading (fainting creature). */
  faint?: boolean;
}

/** FNV-1a 32-bit. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const PULSES: readonly Wave[] = ['pulse12', 'pulse25', 'pulse50'];

/** Deterministic voice list for a species' cry (same id → same cry). */
export function cryVoices(speciesId: string, opts: CryOpts = {}): TimedVoice[] {
  const rng = createRng(hash(speciesId));
  const segments = rng.int(2, 3);
  const base = 220 * Math.pow(2, rng.next() * 2); // 220..880 Hz
  const wave = rng.pick(PULSES);
  const growl = rng.chance(0.4);

  const raw = Array.from({ length: segments }, () => ({
    ratio: 0.7 + rng.next() * 0.9,
    sweep: 0.55 + rng.next() * 1.2,
    dur: 0.12 + rng.next() * 0.16,
    gap: -0.02 + rng.next() * 0.06,
    warble: rng.chance(0.5) ? 20 + rng.next() * 60 : 0,
    wave: rng.chance(0.25) ? rng.pick(PULSES) : wave,
  }));
  // Scale durations so the whole cry lasts 0.4–0.8 s (the last gap does not count).
  const total = raw.reduce((s, r, i) => s + r.dur + (i < raw.length - 1 ? r.gap : 0), 0);
  const target = Math.min(0.8, Math.max(0.4, total));
  const stretch = (target / total) * (opts.faint ? 1.5 : 1);
  const pitch = (opts.pitch ?? 1) * (opts.faint ? 0.75 : 1);

  const voices: TimedVoice[] = [];
  let at = 0;
  raw.forEach((r, i) => {
    const last = i === raw.length - 1;
    const freq = base * r.ratio * pitch;
    const dur = r.dur * stretch;
    const to = freq * r.sweep * (opts.faint && last ? 0.5 : 1);
    voices.push({
      at, wave: r.wave, freq, to, dur, gain: 0.13,
      env: { a: 0.01, d: dur * 0.6, s: 0.6, r: 0.04 },
      ...(r.warble > 0 ? { vibrato: { cents: r.warble, rate: 9 + r.warble / 10, delay: 0 } } : {}),
    });
    if (growl) {
      voices.push({
        at, wave: 'noise', freq: 0.3 + r.ratio * 0.3, dur, gain: 0.07,
        env: { a: 0.01, d: dur, s: 0.3, r: 0.04 },
        filter: { type: 'lowpass', freq: freq * 4 },
      });
    }
    at += dur + r.gap * stretch;
  });
  return voices;
}
