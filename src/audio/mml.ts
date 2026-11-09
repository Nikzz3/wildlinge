/**
 * The WILDLINGE music text format (an MML dialect) and its parser.
 * Pure logic: no Web Audio, runs in Node. Composer reference: docs/MUSIC.md.
 */
import { DRUM_LETTERS, INSTRUMENTS, VIBRATOS, type DrumId } from './instruments';

export const CHANNELS = ['p1', 'p2', 'tri', 'noise'] as const;
export type ChannelName = (typeof CHANNELS)[number];

/** One MML string per channel. Missing channels are silent. */
export type Channels = Partial<Record<ChannelName, string>>;

export interface TrackDef {
  /** Human-readable title (shown in test output and docs). */
  title: string;
  /** Quarter-note beats per minute. */
  tempo: number;
  /** Quarter notes per bar, used by the `|` bar check. Default 4. */
  meter?: number;
  /** Played once before the body. */
  intro?: Channels;
  /** Music: repeats forever after the intro. Jingles: played once. */
  body: Channels;
}

export type Duty = 12 | 25 | 50;

export const TICKS_PER_QUARTER = 48;
export const TICKS_PER_WHOLE = TICKS_PER_QUARTER * 4;

/** Playable MIDI note ranges per tonal channel (inclusive). o4 c = 60 = middle C. */
export const RANGES: Record<'p1' | 'p2' | 'tri', { min: number; max: number }> = {
  p1: { min: 36, max: 96 }, // o2 c .. o7 c
  p2: { min: 36, max: 96 },
  tri: { min: 24, max: 84 }, // o1 c .. o6 c
};

export interface NoteEvent {
  kind: 'note';
  /** Start, in ticks from the start of the section. */
  tick: number;
  /** Length in ticks including ties (the sounding part is ticks * gate / 8). */
  ticks: number;
  midi: number;
  /** 0..15 */
  vol: number;
  /** Index into INSTRUMENTS. */
  inst: number;
  duty: Duty;
  /** Index into VIBRATOS (0 = off). */
  vib: number;
  /** 1..8 eighths of the length that sound. */
  gate: number;
}

export interface DrumEvent {
  kind: 'drum';
  tick: number;
  ticks: number;
  drum: DrumId;
  vol: number;
}

export type SeqEvent = NoteEvent | DrumEvent;

export interface ParsedChannel {
  name: ChannelName;
  events: SeqEvent[];
  /** Total length in ticks. */
  ticks: number;
}

export interface ParsedSection {
  channels: ParsedChannel[];
  /** Length of the longest channel. */
  ticks: number;
}

export interface ParsedTrack {
  title: string;
  tempo: number;
  meter: number;
  intro: ParsedSection | null;
  body: ParsedSection;
  secondsPerTick: number;
}

export class MmlError extends Error {}

const SEMITONES: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const DUTIES: readonly number[] = [12, 25, 50];
const MAX_REPEAT = 64;

interface State {
  tick: number;
  octave: number;
  len: number;
  vol: number;
  inst: number;
  duty: Duty;
  vib: number;
  gate: number;
  transpose: number;
  /** What a following `^` extends. */
  tieTarget: SeqEvent | 'rest' | null;
}

function lineCol(src: string, pos: number): string {
  const before = src.slice(0, pos);
  const line = before.split('\n').length;
  const col = pos - before.lastIndexOf('\n');
  return `line ${line}, col ${col}`;
}

/** Parses one channel string. `label` prefixes error messages (e.g. "route body"). */
export function parseChannel(src: string, name: ChannelName, label: string, meter = 4): ParsedChannel {
  const drums = name === 'noise';
  const pulse = name === 'p1' || name === 'p2';
  const barTicks = meter * TICKS_PER_QUARTER;
  const st: State = {
    tick: 0,
    octave: name === 'tri' ? 3 : 4,
    len: drums ? TICKS_PER_WHOLE / 8 : TICKS_PER_QUARTER,
    vol: name === 'tri' ? 15 : 12,
    inst: 0,
    duty: 50,
    vib: 0,
    gate: 7,
    transpose: 0,
    tieTarget: null,
  };
  const events: SeqEvent[] = [];

  function fail(pos: number, msg: string): never {
    throw new MmlError(`${label}.${name} (${lineCol(src, pos)}): ${msg}`);
  }

  /** Reads an optionally signed integer at i. */
  const readInt = (i: number, signed = false): { value: number; next: number } | null => {
    let j = i;
    if (signed && (src[j] === '-' || src[j] === '+')) j++;
    const start = j;
    while (j < src.length && src[j]! >= '0' && src[j]! <= '9') j++;
    if (j === start) return null;
    return { value: Number(src.slice(i, j)), next: j };
  };

  const requireInt = (i: number, cmd: string, min: number, max: number, signed = false) => {
    const n = readInt(i, signed);
    if (!n) fail(i, `"${cmd}" needs a number`);
    if (n.value < min || n.value > max) fail(i, `"${cmd}${n.value}" out of range (${min}..${max})`);
    return n;
  };

  /** Reads `[length][dots]`; without a number the default length is used. */
  const readLength = (i: number): { ticks: number; next: number } => {
    let ticks = st.len;
    let j = i;
    const n = readInt(j);
    if (n) {
      if (n.value <= 0 || TICKS_PER_WHOLE % n.value !== 0) {
        fail(j, `length ${n.value} is not supported (use 1 2 3 4 6 8 12 16 24 32 48)`);
      }
      ticks = TICKS_PER_WHOLE / n.value;
      j = n.next;
    }
    let add = ticks;
    while (src[j] === '.') {
      add /= 2;
      if (!Number.isInteger(add)) fail(j, 'too many dots for this length');
      ticks += add;
      j++;
    }
    return { ticks, next: j };
  };

  const findClose = (open: number, end: number): number => {
    let depth = 0;
    for (let j = open; j < end; j++) {
      const c = src[j];
      if (c === ';') {
        while (j < end && src[j] !== '\n') j++;
      } else if (c === '[') depth++;
      else if (c === ']' && --depth === 0) return j;
    }
    return fail(open, 'unclosed "["');
  };

  const findColon = (from: number, to: number): number => {
    let depth = 0;
    let found = -1;
    for (let j = from; j < to; j++) {
      const c = src[j];
      if (c === ';') {
        while (j < to && src[j] !== '\n') j++;
      } else if (c === '[') depth++;
      else if (c === ']') depth--;
      else if (c === ':' && depth === 0) {
        if (found >= 0) fail(j, 'only one ":" per repeat');
        found = j;
      }
    }
    return found;
  };

  const run = (start: number, end: number): void => {
    let i = start;
    while (i < end) {
      const c = src[i]!;
      if (c === ' ' || c === '\n' || c === '\t' || c === '\r') {
        i++;
      } else if (c === ';') {
        while (i < end && src[i] !== '\n') i++;
      } else if (c === '|') {
        if (st.tick % barTicks !== 0) {
          const bar = Math.floor(st.tick / barTicks) + 1;
          const off = st.tick % barTicks;
          fail(i, `bar line ${off / TICKS_PER_QUARTER} beats into bar ${bar} (${off} ticks): notes before it are too long or too short`);
        }
        i++;
      } else if (c === '[') {
        const close = findClose(i, end);
        const colon = findColon(i + 1, close);
        const n = readInt(close + 1);
        const count = n ? n.value : 2;
        if (count < 1 || count > MAX_REPEAT) fail(close + 1, `repeat count ${count} out of range (1..${MAX_REPEAT})`);
        for (let pass = 0; pass < count; pass++) {
          run(i + 1, colon >= 0 ? colon : close);
          if (colon >= 0 && pass < count - 1) run(colon + 1, close);
        }
        i = n ? n.next : close + 1;
      } else if (c === ']') {
        fail(i, 'unmatched "]"');
      } else if (c === ':') {
        fail(i, '":" is only allowed inside [ ]');
      } else if (c === 'r') {
        const l = readLength(i + 1);
        st.tick += l.ticks;
        st.tieTarget = 'rest';
        i = l.next;
      } else if (c === '^') {
        if (st.tieTarget === null) fail(i, '"^" (tie) needs a note or rest before it');
        const l = readLength(i + 1);
        if (st.tieTarget !== 'rest') st.tieTarget.ticks += l.ticks;
        st.tick += l.ticks;
        i = l.next;
      } else if (c === 'l') {
        const l = readLength(i + 1);
        if (l.next === i + 1) fail(i, '"l" needs a length');
        st.len = l.ticks;
        i = l.next;
      } else if (c === 'v') {
        const n = requireInt(i + 1, 'v', 0, 15);
        st.vol = n.value;
        i = n.next;
      } else if (drums) {
        // On the noise channel every other letter is a drum hit.
        const drum = DRUM_LETTERS[c];
        if (!drum) fail(i, `unknown drum or command "${c}" (drums: ${Object.keys(DRUM_LETTERS).join(' ')})`);
        const l = readLength(i + 1);
        const ev: DrumEvent = { kind: 'drum', tick: st.tick, ticks: l.ticks, drum, vol: st.vol };
        events.push(ev);
        st.tick += l.ticks;
        st.tieTarget = ev;
        i = l.next;
      } else if (c in SEMITONES) {
        let j = i + 1;
        let acc = 0;
        while (src[j] === '+' || src[j] === '#' || src[j] === '-') {
          acc += src[j] === '-' ? -1 : 1;
          j++;
        }
        const l = readLength(j);
        const midi = 12 * (st.octave + 1) + (SEMITONES[c] ?? 0) + acc + st.transpose;
        const ev: NoteEvent = {
          kind: 'note', tick: st.tick, ticks: l.ticks, midi, vol: st.vol, inst: st.inst, duty: st.duty, vib: st.vib,
          gate: st.gate,
        };
        events.push(ev);
        st.tick += l.ticks;
        st.tieTarget = ev;
        i = l.next;
      } else if (c === 'o') {
        const n = requireInt(i + 1, 'o', 0, 8);
        st.octave = n.value;
        i = n.next;
      } else if (c === '>' || c === '<') {
        st.octave += c === '>' ? 1 : -1;
        if (st.octave < 0 || st.octave > 8) fail(i, `octave ${st.octave} out of range (0..8)`);
        i++;
      } else if (c === '@') {
        const n = requireInt(i + 1, '@', 0, INSTRUMENTS.length - 1);
        st.inst = n.value;
        i = n.next;
      } else if (c === 'w') {
        if (!pulse) fail(i, '"w" (duty) is only available on p1/p2');
        const n = readInt(i + 1);
        if (!n || !DUTIES.includes(n.value)) fail(i, '"w" needs 12, 25 or 50');
        st.duty = n.value as Duty;
        i = n.next;
      } else if (c === '~') {
        const n = requireInt(i + 1, '~', 0, VIBRATOS.length - 1);
        st.vib = n.value;
        i = n.next;
      } else if (c === 'q') {
        const n = requireInt(i + 1, 'q', 1, 8);
        st.gate = n.value;
        i = n.next;
      } else if (c === 'k') {
        const n = requireInt(i + 1, 'k', -24, 24, true);
        st.transpose = n.value;
        i = n.next;
      } else {
        fail(i, `unknown command "${c}"`);
      }
    }
  };

  run(0, src.length);
  return { name, events, ticks: st.tick };
}

function parseSection(chs: Channels, label: string, meter: number): ParsedSection {
  const channels: ParsedChannel[] = [];
  for (const name of CHANNELS) {
    const src = chs[name];
    if (src !== undefined) channels.push(parseChannel(src, name, label, meter));
  }
  return { channels, ticks: Math.max(0, ...channels.map((c) => c.ticks)) };
}

/** Parses a track definition. Throws MmlError with a readable position on syntax errors. */
export function parseTrack(def: TrackDef, label = def.title): ParsedTrack {
  const meter = def.meter ?? 4;
  const body = parseSection(def.body, `${label} body`, meter);
  if (body.ticks === 0) throw new MmlError(`${label}: body is empty`);
  if (!(def.tempo > 0)) throw new MmlError(`${label}: tempo must be positive`);
  return {
    title: def.title,
    tempo: def.tempo,
    meter,
    intro: def.intro ? parseSection(def.intro, `${label} intro`, meter) : null,
    body,
    secondsPerTick: 60 / (def.tempo * TICKS_PER_QUARTER),
  };
}

/** Seconds for one pass of intro + body (the full length of a jingle). */
export function trackSeconds(t: ParsedTrack): number {
  return ((t.intro?.ticks ?? 0) + t.body.ticks) * t.secondsPerTick;
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** 60 → "c4", 61 → "c#4". For messages and tests. */
export function midiName(midi: number): string {
  const names = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
  return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}
