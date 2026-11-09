import { describe, expect, it } from 'vitest';
import { createAudio } from '../src/audio';
import { cryVoices } from '../src/audio/cry';
import {
  midiName, MmlError, parseChannel, parseTrack, RANGES, TICKS_PER_QUARTER, trackSeconds, type ParsedSection,
  type TrackDef,
} from '../src/audio/mml';
import { SFX } from '../src/audio/sfx';
import { JINGLES, MUSIC } from '../src/audio/tracks';
import { JINGLE_IDS, MUSIC_IDS, SFX_IDS } from '../src/core/types';

const tracks: [string, TrackDef, 'music' | 'jingle'][] = [
  ...MUSIC_IDS.map((id): [string, TrackDef, 'music'] => [`music ${id}`, MUSIC[id], 'music']),
  ...JINGLE_IDS.map((id): [string, TrackDef, 'jingle'] => [`jingle ${id}`, JINGLES[id], 'jingle']),
];

const bars = (ticks: number, meter: number) => ticks / (meter * TICKS_PER_QUARTER);

function checkSection(label: string, s: ParsedSection, meter: number): void {
  const lengths = s.channels.map((c) => `${c.name}=${bars(c.ticks, meter)} bars`).join(', ');
  for (const ch of s.channels) {
    expect(ch.ticks, `${label}: all channels must have the same length (${lengths})`).toBe(s.ticks);
    if (ch.name === 'noise') continue;
    const range = RANGES[ch.name];
    for (const ev of ch.events) {
      if (ev.kind !== 'note') continue;
      const where = `${label}.${ch.name} bar ${Math.floor(bars(ev.tick, meter)) + 1}`;
      expect(ev.midi, `${where}: ${midiName(ev.midi)} below ${midiName(range.min)}`).toBeGreaterThanOrEqual(range.min);
      expect(ev.midi, `${where}: ${midiName(ev.midi)} above ${midiName(range.max)}`).toBeLessThanOrEqual(range.max);
    }
  }
}

describe('tracks', () => {
  it.each(tracks)('%s parses and is consistent', (label, def, kind) => {
    const t = parseTrack(def, label);
    expect(t.tempo).toBeGreaterThanOrEqual(50);
    expect(t.tempo).toBeLessThanOrEqual(220);
    expect(t.body.channels.some((c) => c.name === 'p1'), `${label}: needs a p1 melody`).toBe(true);
    checkSection(`${label} body`, t.body, t.meter);
    if (t.intro) checkSection(`${label} intro`, t.intro, t.meter);
    if (kind === 'music') {
      expect(t.body.ticks % (t.meter * TICKS_PER_QUARTER), `${label}: loop must be whole bars`).toBe(0);
    } else {
      expect(trackSeconds(t), `${label}: jingles should be short`).toBeLessThanOrEqual(8);
    }
  });
});

describe('mml parser', () => {
  const ticks = (src: string) => parseChannel(src, 'p1', 'test').events.map((e) => e.ticks);

  it('reads lengths, dots, triplets and default length', () => {
    expect(ticks('c4 d8. e16 l12 f g a')).toEqual([48, 36, 12, 16, 16, 16]);
  });

  it('reads pitches with octaves and accidentals', () => {
    const notes = parseChannel('o4 c c+ d- > c < b k2 c', 'p1', 'test').events;
    expect(notes.map((e) => (e.kind === 'note' ? e.midi : -1))).toEqual([60, 61, 61, 72, 71, 62]);
  });

  it('expands repeats with a last-pass break', () => {
    const notes = parseChannel('[c : d]3 e', 'p1', 'test').events;
    expect(notes.map((e) => (e.kind === 'note' ? midiName(e.midi) : ''))).toEqual(['c4', 'd4', 'c4', 'd4', 'c4', 'e4']);
  });

  it('ties extend notes and rests', () => {
    const ch = parseChannel('c4^8 r4^4 d4', 'p1', 'test');
    expect(ch.events.map((e) => [e.tick, e.ticks])).toEqual([[0, 72], [168, 48]]);
  });

  it('parses drums on the noise channel', () => {
    const ch = parseChannel('l8 k h s o c t x r', 'noise', 'test');
    expect(ch.events.map((e) => (e.kind === 'drum' ? e.drum : ''))).toEqual([
      'kick', 'hat', 'snare', 'openhat', 'crash', 'tom', 'click',
    ]);
    expect(ch.ticks).toBe(192);
  });

  it('reports misplaced bar lines and bad commands with a position', () => {
    expect(() => parseChannel('c4 d4 e4 | f4', 'p1', 'test')).toThrow(/line 1, col 10\): bar line 3 beats into bar 1/);
    expect(() => parseChannel('c4 z4', 'p1', 'test')).toThrow(MmlError);
    expect(() => parseChannel('w30 c', 'p1', 'test')).toThrow(/12, 25 or 50/);
    expect(() => parseChannel('c4 [d e', 'p1', 'test')).toThrow(/unclosed/);
  });
});

describe('audio api without Web Audio', () => {
  it('never throws and resolves jingles immediately', async () => {
    const audio = createAudio();
    audio.playMusic('route');
    audio.playMusic('route');
    expect(audio.currentMusic()).toBe('route');
    audio.unlock();
    for (const id of SFX_IDS) audio.playSfx(id);
    audio.playCry('anything', { faint: true });
    audio.setVolumes(0.5, 0.5);
    await audio.playJingle('heal');
    audio.playMusic(null);
    expect(audio.currentMusic()).toBe(null);
  });

  it('has a sound for every sfx id', () => {
    for (const id of SFX_IDS) expect(SFX[id].length, id).toBeGreaterThan(0);
  });

  it('derives cries deterministically from the species id', () => {
    const end = (id: string, faint = false) => Math.max(...cryVoices(id, { faint }).map((v) => v.at + v.dur));
    expect(cryVoices('flammkatz')).toEqual(cryVoices('flammkatz'));
    expect(cryVoices('flammkatz')).not.toEqual(cryVoices('kieselkrabbe'));
    for (const id of ['a', 'flammkatz', 'kieselkrabbe', 'glutfuchs', 'x9']) {
      expect(end(id)).toBeGreaterThanOrEqual(0.399);
      expect(end(id)).toBeLessThanOrEqual(0.801);
      expect(end(id, true)).toBeGreaterThan(end(id));
    }
  });
});
