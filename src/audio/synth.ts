/**
 * Web Audio chiptune voices: band-limited pulse waves (12.5 / 25 / 50 % duty), triangle, sine,
 * white noise and short-period "metallic" noise, each with an ADSR envelope, optional vibrato,
 * pitch slide and filter. Routing: voices → music bus / sfx bus → master → limiter → speakers.
 */

export type Wave = 'pulse12' | 'pulse25' | 'pulse50' | 'triangle' | 'sine' | 'noise' | 'metal';

/** Times in seconds; `s` is the sustain level relative to the peak (0..1). */
export interface Envelope {
  a: number;
  d: number;
  s: number;
  r: number;
}

export interface Vibrato {
  cents: number;
  rate: number;
  delay: number;
}

export interface Voice {
  wave: Wave;
  /** Hz for tonal waves and 'metal'; playback rate for 'noise' (1 = bright, 0.1 = dark rumble). */
  freq: number;
  /** Exponential slide of `freq` to this value… */
  to?: number;
  /** …reached after this many seconds (default: dur). */
  slide?: number;
  /** Seconds the note is held before the release starts. */
  dur: number;
  /** Peak amplitude 0..1. */
  gain: number;
  env: Envelope;
  vibrato?: Vibrato;
  filter?: { type: 'lowpass' | 'highpass' | 'bandpass'; freq: number; to?: number; q?: number };
}

/** A voice with a start offset in seconds (sfx, cries, drum kits). */
export interface TimedVoice extends Voice {
  at: number;
}

/** Sound effects sit above the music in the mix. */
const SFX_LEVEL = 1.6;
const METAL_STEPS = 93;
const METAL_HOLD = 2;

function pulseWave(ctx: AudioContext, duty: number): PeriodicWave {
  const n = 128;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    real[k] = Math.sin(2 * Math.PI * k * duty) / (k * Math.PI);
    imag[k] = (2 * Math.sin(Math.PI * k * duty) ** 2) / (k * Math.PI);
  }
  return ctx.createPeriodicWave(real, imag);
}

function whiteNoise(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** One period of the 15-bit LFSR in short mode (the buzzy, tonal noise of old consoles). */
function metalNoise(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, METAL_STEPS * METAL_HOLD, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let reg = 1;
  for (let step = 0; step < METAL_STEPS; step++) {
    const bit = (reg ^ (reg >> 6)) & 1;
    reg = (reg >> 1) | (bit << 14);
    for (let h = 0; h < METAL_HOLD; h++) data[step * METAL_HOLD + h] = reg & 1 ? 0.8 : -0.8;
  }
  return buf;
}

/** Schedules a linear ADSR on `p`: gate from `t` to `end`, then release. */
function envelope(p: AudioParam, t: number, end: number, peak: number, env: Envelope): number {
  const a = Math.max(env.a, 0.002);
  const r = Math.max(env.r, 0.01);
  const sus = peak * env.s;
  const dur = end - t;
  // The intrinsic value applies before the first event; a new GainNode defaults to 1 (click).
  p.value = 0;
  p.setValueAtTime(0, t);
  if (dur <= a) {
    p.linearRampToValueAtTime((peak * dur) / a, end);
  } else {
    p.linearRampToValueAtTime(peak, t + a);
    if (env.d <= 0) {
      p.setValueAtTime(sus, t + a);
      p.setValueAtTime(sus, end);
    } else if (dur <= a + env.d) {
      p.linearRampToValueAtTime(peak + ((sus - peak) * (dur - a)) / env.d, end);
    } else {
      p.linearRampToValueAtTime(sus, t + a + env.d);
      p.setValueAtTime(sus, end);
    }
  }
  p.linearRampToValueAtTime(0, end + r);
  return end + r;
}

export class Synth {
  readonly master: GainNode;
  readonly music: GainNode;
  readonly sfx: GainNode;
  private readonly pulses: Record<'pulse12' | 'pulse25' | 'pulse50', PeriodicWave>;
  private readonly noise: AudioBuffer;
  private readonly metal: AudioBuffer;
  private readonly metalHz: number;

  constructor(readonly ctx: AudioContext) {
    // Gentle limiter so loud sfx on top of music don't clip.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -4;
    limiter.knee.value = 4;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.1;
    limiter.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(limiter);
    this.music = ctx.createGain();
    this.music.connect(this.master);
    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);
    this.pulses = { pulse12: pulseWave(ctx, 0.125), pulse25: pulseWave(ctx, 0.25), pulse50: pulseWave(ctx, 0.5) };
    this.noise = whiteNoise(ctx);
    this.metal = metalNoise(ctx);
    this.metalHz = ctx.sampleRate / (METAL_STEPS * METAL_HOLD);
  }

  get now(): number {
    return this.ctx.currentTime;
  }

  setVolumes(music: number, sfx: number): void {
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(clamp01(music), t, 0.02);
    this.sfx.gain.setTargetAtTime(clamp01(sfx) * SFX_LEVEL, t, 0.02);
  }

  /** Plays a voice starting at context time `t` into `dest`. */
  play(v: Voice, t: number, dest: AudioNode): void {
    const ctx = this.ctx;
    const start = Math.max(t, ctx.currentTime);
    const end = start + Math.max(v.dur, 0.005);

    let src: OscillatorNode | AudioBufferSourceNode;
    let pitch: AudioParam;
    let scale = 1;
    if (v.wave === 'noise' || v.wave === 'metal') {
      const b = ctx.createBufferSource();
      b.buffer = v.wave === 'noise' ? this.noise : this.metal;
      b.loop = true;
      pitch = b.playbackRate;
      if (v.wave === 'metal') scale = 1 / this.metalHz;
      src = b;
    } else {
      const o = ctx.createOscillator();
      if (v.wave === 'triangle' || v.wave === 'sine') o.type = v.wave;
      else o.setPeriodicWave(this.pulses[v.wave]);
      pitch = o.frequency;
      src = o;
    }
    pitch.value = v.freq * scale;
    pitch.setValueAtTime(v.freq * scale, start);
    if (v.to !== undefined) pitch.exponentialRampToValueAtTime(Math.max(v.to * scale, 0.001), start + (v.slide ?? v.dur));

    const amp = ctx.createGain();
    const stop = envelope(amp.gain, start, end, v.gain, v.env) + 0.02;
    const nodes: AudioNode[] = [src, amp];

    let last: AudioNode = src;
    if (v.filter) {
      const f = ctx.createBiquadFilter();
      f.type = v.filter.type;
      f.Q.value = v.filter.q ?? 1;
      f.frequency.value = v.filter.freq;
      f.frequency.setValueAtTime(v.filter.freq, start);
      if (v.filter.to !== undefined) f.frequency.exponentialRampToValueAtTime(v.filter.to, start + (v.slide ?? v.dur));
      src.connect(f);
      last = f;
      nodes.push(f);
    }
    last.connect(amp);
    amp.connect(dest);

    if (v.vibrato && v.dur > v.vibrato.delay) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = v.vibrato.rate;
      const depth = ctx.createGain();
      depth.gain.value = 0;
      depth.gain.setValueAtTime(0, start + v.vibrato.delay);
      depth.gain.linearRampToValueAtTime(v.vibrato.cents, start + v.vibrato.delay + 0.12);
      lfo.connect(depth);
      depth.connect(src.detune);
      lfo.start(start);
      lfo.stop(stop);
      nodes.push(lfo, depth);
    }

    // Random offset so consecutive noise hits don't sound identical.
    src.start(start, v.wave === 'noise' ? Math.random() * 0.5 : 0);
    src.stop(stop);
    src.onended = () => {
      for (const n of nodes) n.disconnect();
    };
  }

  /** Plays a list of timed voices starting at `t`, gain scaled by `gain`. */
  playAll(voices: readonly TimedVoice[], t: number, dest: AudioNode, gain = 1): void {
    for (const v of voices) this.play(gain === 1 ? v : { ...v, gain: v.gain * gain }, t + v.at, dest);
  }
}

function clamp01(x: number): number {
  return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;
}
