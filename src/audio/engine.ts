/**
 * The live audio engine (only exists once an AudioContext could be created).
 * Music: one TrackPlayer at a time; switching fades the old track out quickly.
 * Jingles pause the music, play once, then the music resumes from where it was paused.
 */
import type { JingleId, MusicId, SfxId } from '../core/types';
import { cryVoices, type CryOpts } from './cry';
import { parseTrack, trackSeconds, type ParsedTrack, type TrackDef } from './mml';
import { TrackPlayer } from './sequencer';
import { SFX } from './sfx';
import { Synth } from './synth';
import { JINGLES, MUSIC } from './tracks';

const TICK_MS = 25;
const LOOKAHEAD = 0.12;
const SWITCH_FADE = 0.3;
const RESUME_FADE = 0.5;

interface Jingle {
  player: TrackPlayer;
  timer: ReturnType<typeof setTimeout>;
  resolve: () => void;
}

export class AudioEngine {
  private music: { id: MusicId; player: TrackPlayer } | null = null;
  private want: MusicId | null = null;
  /** Music position saved while a jingle plays. */
  private paused: { id: MusicId; tick: number } | null = null;
  private jingle: Jingle | null = null;
  private readonly cache = new Map<TrackDef, ParsedTrack | null>();

  private constructor(private readonly synth: Synth) {
    setInterval(() => this.pump(), TICK_MS);
    synth.ctx.onstatechange = () => this.sync();
  }

  /** Returns null when Web Audio is unavailable (Node, old browsers). */
  static create(): AudioEngine | null {
    const Ctor = globalThis.AudioContext as typeof AudioContext | undefined;
    if (!Ctor) return null;
    try {
      return new AudioEngine(new Synth(new Ctor()));
    } catch (err) {
      console.warn('[audio] Web Audio unavailable', err);
      return null;
    }
  }

  private get running(): boolean {
    return this.synth.ctx.state === 'running';
  }

  resume(): void {
    if (this.running) return this.sync();
    this.synth.ctx.resume().then(
      () => this.sync(),
      () => {},
    );
  }

  setVolumes(music: number, sfx: number): void {
    this.synth.setVolumes(music, sfx);
  }

  setMusic(id: MusicId | null): void {
    this.want = id;
    if (this.paused && this.paused.id !== id) this.paused = null;
    this.sync();
  }

  playSfx(id: SfxId): void {
    if (!this.running) return;
    this.synth.playAll(SFX[id], this.synth.now + 0.005, this.synth.sfx);
  }

  playCry(speciesId: string, opts?: CryOpts): void {
    if (!this.running) return;
    this.synth.playAll(cryVoices(speciesId, opts), this.synth.now + 0.005, this.synth.sfx);
  }

  playJingle(id: JingleId): Promise<void> {
    const track = this.parsed(JINGLES[id], `jingle ${id}`);
    if (!track || !this.running) return Promise.resolve();
    this.endJingle(false);
    const now = this.synth.now;
    if (this.music) {
      this.paused = { id: this.music.id, tick: this.music.player.tickAt(now) };
      this.music.player.stop(0.08);
      this.music = null;
    }
    const start = now + 0.1;
    const player = new TrackPlayer(this.synth, track, false, start);
    player.pump(now + LOOKAHEAD);
    return new Promise((resolve) => {
      const ms = (start - now + trackSeconds(track) + 0.1) * 1000;
      this.jingle = { player, resolve, timer: setTimeout(() => this.endJingle(), ms) };
    });
  }

  /**
   * Finishes the current jingle (if any) and resolves its promise. At its natural end the last
   * notes ring out while the music fades back in; when interrupted by another jingle it is cut.
   */
  private endJingle(natural = true): void {
    const j = this.jingle;
    if (!j) return;
    this.jingle = null;
    clearTimeout(j.timer);
    j.player.stop(natural ? 0.4 : 0.05);
    j.resolve();
    if (natural) this.sync();
  }

  /** Brings the playing music in line with `want`. */
  private sync(): void {
    if (!this.running || this.jingle) return;
    if ((this.music?.id ?? null) === this.want) return;
    this.music?.player.stop(SWITCH_FADE);
    this.music = null;
    const id = this.want;
    if (!id) return;
    const track = this.parsed(MUSIC[id], `music ${id}`);
    if (!track) return;
    const resume = this.paused?.id === id ? this.paused.tick : 0;
    this.paused = null;
    const player = new TrackPlayer(this.synth, track, true, this.synth.now + 0.05, resume, resume > 0 ? RESUME_FADE : 0);
    this.music = { id, player };
    player.pump(this.synth.now + LOOKAHEAD);
  }

  private pump(): void {
    if (!this.running) return;
    const until = this.synth.now + LOOKAHEAD;
    this.music?.player.pump(until);
    this.jingle?.player.pump(until);
  }

  /** Parses on first use; a broken track is logged once and stays silent instead of crashing. */
  private parsed(def: TrackDef, label: string): ParsedTrack | null {
    let t = this.cache.get(def);
    if (t === undefined) {
      try {
        t = parseTrack(def, label);
      } catch (err) {
        console.error('[audio]', err);
        t = null;
      }
      this.cache.set(def, t);
    }
    return t;
  }
}
