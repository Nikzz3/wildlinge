/**
 * Plays a parsed track through the synth with lookahead scheduling: the engine calls `pump()`
 * every ~25 ms and every event starting within the next ~120 ms is handed to Web Audio, which
 * then plays it sample-accurately. Positions are absolute ticks on the timeline
 * intro, body, body, body, … so looping is seamless.
 */
import { CHANNEL_GAIN, DRUMS, INSTRUMENTS, VIBRATOS } from './instruments';
import { midiToHz, type ParsedChannel, type ParsedSection, type ParsedTrack, type SeqEvent } from './mml';
import type { Synth } from './synth';

export class TrackPlayer {
  private readonly out: GainNode;
  private readonly introTicks: number;
  /** Start tick of the section currently being scheduled. */
  private segTick: number;
  private seg: ParsedSection;
  private cursors: number[];
  private stopped = false;
  /** Context time of absolute tick 0. */
  private readonly t0: number;

  constructor(
    private readonly synth: Synth,
    private readonly track: ParsedTrack,
    private readonly loop: boolean,
    start: number,
    /** Absolute tick to start from (resume after a jingle). */
    from = 0,
    fadeIn = 0,
  ) {
    this.out = synth.ctx.createGain();
    this.out.connect(synth.music);
    if (fadeIn > 0) {
      this.out.gain.value = 0;
      this.out.gain.setValueAtTime(0, start);
      this.out.gain.linearRampToValueAtTime(1, start + fadeIn);
    }
    this.introTicks = track.intro?.ticks ?? 0;
    const pos = this.normalize(from);
    this.t0 = start - pos * track.secondsPerTick;
    if (pos < this.introTicks && track.intro) {
      this.seg = track.intro;
      this.segTick = 0;
    } else {
      this.seg = track.body;
      this.segTick = this.introTicks;
    }
    const rel = pos - this.segTick;
    this.cursors = this.seg.channels.map((ch) => firstAtOrAfter(ch.events, rel));
  }

  /** Context time at which a non-looping track has finished. */
  get endTime(): number {
    return this.loop ? Infinity : this.t0 + (this.introTicks + this.track.body.ticks) * this.track.secondsPerTick;
  }

  /** Absolute tick (within intro + one body pass) that is audible at context time t. */
  tickAt(t: number): number {
    return this.normalize(Math.max(0, Math.round((t - this.t0) / this.track.secondsPerTick)));
  }

  /** Schedules every event that starts before `until`. */
  pump(until: number): void {
    const spt = this.track.secondsPerTick;
    const late = this.synth.now - 0.02;
    while (!this.stopped) {
      const segStart = this.t0 + this.segTick * spt;
      if (segStart >= until) return;
      this.seg.channels.forEach((ch, i) => {
        let c = this.cursors[i] ?? 0;
        for (; c < ch.events.length; c++) {
          const ev = ch.events[c]!;
          const t = segStart + ev.tick * spt;
          if (t >= until) break;
          if (t >= late) this.schedule(ch, ev, t);
        }
        this.cursors[i] = c;
      });
      if (segStart + this.seg.ticks * spt > until) return;
      // Section fully scheduled: continue with the (next) body pass.
      if (this.seg === this.track.body && !this.loop) return;
      this.segTick += this.seg.ticks;
      this.seg = this.track.body;
      this.cursors = this.seg.channels.map(() => 0);
    }
  }

  /** Fades out and releases the player. It must not be used afterwards. */
  stop(fade: number): void {
    if (this.stopped) return;
    this.stopped = true;
    const g = this.out.gain;
    const t = this.synth.now;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + fade);
    // Scheduled notes keep running into the muted node until they end on their own.
    setTimeout(() => this.out.disconnect(), (fade + 1) * 1000);
  }

  private normalize(tick: number): number {
    if (tick < this.introTicks) return tick;
    const body = this.track.body.ticks;
    return this.introTicks + ((tick - this.introTicks) % body);
  }

  private schedule(ch: ParsedChannel, ev: SeqEvent, t: number): void {
    if (ev.vol === 0) return;
    if (ev.kind === 'drum') {
      this.synth.playAll(DRUMS[ev.drum], t, this.out, ev.vol / 15);
      return;
    }
    const spt = this.track.secondsPerTick;
    const inst = INSTRUMENTS[ev.inst] ?? INSTRUMENTS[0]!;
    const vibrato = VIBRATOS[ev.vib] ?? null;
    const gain = (ch.name === 'tri' ? CHANNEL_GAIN.tri : CHANNEL_GAIN.p1) * (ev.vol / 15);
    this.synth.play(
      {
        wave: ch.name === 'tri' ? 'triangle' : (`pulse${ev.duty}` as const),
        freq: midiToHz(ev.midi),
        dur: (ev.ticks * spt * ev.gate) / 8,
        gain,
        env: inst.env,
        ...(vibrato ? { vibrato } : {}),
      },
      t,
      this.out,
    );
  }
}

function firstAtOrAfter(events: readonly SeqEvent[], tick: number): number {
  const i = events.findIndex((e) => e.tick >= tick);
  return i < 0 ? events.length : i;
}
