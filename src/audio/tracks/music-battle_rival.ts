import type { TrackDef } from '../mml';

/**
 * Kampf (Rivale) – energetic B-minor battle built on the rival motif (5 – 1 held – 2-3 snap –
 * 2 1 b7) from the rival theme. B grows the motif into a broad D-major tune over a
 * descending bass; A' returns with a harmony voice and turns around on F#7.
 * Chords A: Bm G Bm F# | Bm G Em-F# Bm   B: D A/C# Bm F#m/A | G D/F# Em F#   A' ends: Bm-F#7
 */
const M = `o5 f+8 b8 ^8 > c+16 d16 ^8 c+8 < b8 a8 |`;
const A7 = `${M} g4 r16 g16 a16 a+16 b4 > d8 < b8 | ${M} a+4 r16 a+16 b16 > c+16 ^4 < a+8 f+8 |
  ${M} g8 b8 > d8 e8 ^8 d8 < b8 g8 | e8 g8 b8 > e8 ^8 d8 c+8 < a+8 |`;
const B = `o5 a4 > d2 e8 f+8 | e2. c+4 | d4 < b2 > c+8 d8 | c+2. < a4 |
  b4 g8 b8 > d4 e8 d8 | c+4 d4 < a2 | g4. f+8 e4 d4 | c+2 < a+4 > c+8 e8 |`;

/** One beat of a broken chord: a in the current octave, b and c one octave up. */
const arp = (a: string, b: string, c: string) => `${a} > ${b} ${c} ${b} <`;
const ARPS = `@1 w12 v6 q8 l16 o3
  [${arp('b', 'd', 'f+')}]4 | [${arp('b', 'd', 'g')}]4 | [${arp('b', 'd', 'f+')}]4 | [${arp('a+', 'c+', 'f+')}]4 |
  [${arp('b', 'd', 'f+')}]4 | [${arp('b', 'd', 'g')}]4 | [${arp('b', 'e', 'g')}]2 [${arp('a+', 'c+', 'f+')}]2 |
  [${arp('b', 'd', 'f+')}]4 |`;
const BH = `@2 w25 v8 q7 ~1 o5 f+2 a2 | a2. e4 | f+2. a4 | a2. f+4 | d2 g2 | a2 f+2 | o4 b2 g2 | a+2 f+2 |`;
/** Harmony to A', mostly a third below the melody. */
const H1 = `o5 d8 f+8 ^8 a16 b16 ^8 a8 d8 f+8 |`;
const AH = `@0 w25 v8 q7 ~0
  ${H1} o5 d4 r16 d16 e16 f+16 g4 b8 g8 | ${H1} o5 f+4 r16 f+16 g16 a+16 ^4 f+8 c+8 |
  ${H1} o5 e8 g8 b8 > c8 ^8 < b8 g8 e8 | o4 b8 > e8 g8 b8 ^8 b8 a+8 f+8 | f+4 d4 a+8 f+8 c+8 < a+8 |`;

/** Pumping bass: root with octave kicks on beat 2 and the "and" of 3. */
const pump = (n: string) => `${n}8 ${n}8 > ${n}16 ${n}16 < ${n}8 ${n}8 ${n}8 > ${n}8 < ${n}8`;
const TA7 = `o1 ${pump('b')} | ${pump('g')} | ${pump('b')} | ${pump('f+')} | ${pump('b')} | ${pump('g')} |
  o2 e8 e8 > e16 e16 < e8 o1 f+8 f+8 > f+8 < f+8 |`;
const eighths = (n: string) => `${n} ${n} ${n} ${n} ${n} ${n} > ${n} < ${n}`;
const TB = `l8 o2 ${eighths('d')} | ${eighths('c+')} | o1 ${eighths('b')} | ${eighths('a')} |
  ${eighths('g')} | ${eighths('f+')} | ${eighths('e')} | f+ f+ f+ f+ a+ a+ > c+ c+ < |`;

const DA = `l8 [k h s k16 k16 h k s h]7 | k h s h l16 s s t t s s t t l8 |`;
const DB = `c h s h k k s o | [k o s h k k s o]6 | k h s h l16 s s s s s s s s l8 |`;

const track: TrackDef = {
  title: 'Kampf (Rivale)',
  tempo: 170,
  intro: {
    p1: `@0 w50 v12 o4 l16 b8 b b > d8 d d f+8 f+ f+ e8 d8 | c+4 r8 c+8 < f+ g a a+ b > c+ d e`,
    p2: `@0 w25 v9 o3 l16 b8 b b > d8 d d f+8 f+ f+ e8 d8 | c+4 r8 c+8 < f+ g a a+ b > c+ d e`,
    tri: `@6 q6 o1 l16 b8 b b > d8 d d f+8 f+ f+ e8 d8 | < f+4 r8 f+8 f+8 f+ f+ f+8 f+ f+`,
    noise: `l16 k8 k k s8 k k s8 k k s8 s8 | c4 r8 k8 s s s s s s s s`,
  },
  body: {
    p1: `@0 w50 v12 ~1 ${A7} b4 f+4 d4 r4 |
      w25 ~2 ${B}
      w50 ~1 ${A7} b4 f+4 > c+8 < a+8 f+8 e8 |`,
    p2: `${ARPS} ${BH} ${AH}`,
    tri: `@6 q6 ${TA7} o1 ${pump('b')} |
      q5 ${TB}
      q6 ${TA7} o1 b8 b8 > b16 b16 < b8 f+8 a+8 > c+8 e8 |`,
    noise: `v12 ${DA} ${DB} ${DA}`,
  },
};

export default track;
