import type { TrackDef } from '../mml';

/**
 * Rivale – cocky, upbeat A-major swagger over a boogie bass. The rival motif (5 – 1 held
 * across the beat – 2-3 snap – 2 1 b7) returns in minor in the rival battle.
 * Form: A (off-beat stabs) – B (rock cadence F G -> A) – A' (harmony, E7 turnaround).
 * Chords A: A7 D A7 E | A7 D Bm7-E A   B: D E C#m F#m | Bm E F G   A' ends: A-E7
 */
const R = `o5 e8 a8 ^8 b16 > c+16 ^8 < b8 a8 g8 |`;
const A6 = `${R} f+4 r16 f+16 g16 g+16 a4 > d8 < a8 | ${R} e4 r16 e16 f+16 g+16 b4 > e8 < b8 |
  ${R} f+8 a8 > d8 e8 ^8 d8 c+8 < a8 |`;
const A7 = `o5 b8 a8 f+8 d8 e8 g+8 b8 > d8 |`;
const B = `o5 a2 f+8 a8 > d8 < a8 | b2 g+8 b8 > e8 < b8 | > c+2 < g+8 b8 > e8 c+8 | < a4. g+8 f+8 e8 c+8 e8 |
  f+2 d8 f+8 b8 f+8 | g+2 e8 g+8 b8 g+8 | a4. g8 f8 g8 a8 > c8 | d4. c8 < b8 a8 g8 d8 |`;

/** Ska-like off-beat stabs (x and y carry their own octave). */
const st = (x: string, y: string) => `r ${x} r ${y} r ${x} r ${y}`;
const A7ST = `r o4 c+ r e r c+ r g`;
const STABS = `@1 w25 v7 q4 l8
  ${A7ST} | ${st('o4 f+', 'o4 a')} | ${A7ST} | ${st('o4 e', 'o4 g+')} |
  ${A7ST} | ${st('o4 f+', 'o4 a')} | r o4 d r f+ r e r g+ | ${st('o4 c+', 'o4 e')} |`;
const arp = (a: string, b: string, c: string) => `[${a} ${b} ${c} ${b}]4`;
const ARPS = `@1 w12 v6 q8 l16 o4
  ${arp('d', 'f+', 'a')} | ${arp('e', 'g+', 'b')} | ${arp('c+', 'e', 'g+')} | ${arp('c+', 'f+', 'a')} |
  ${arp('d', 'f+', 'b')} | ${arp('e', 'g+', 'b')} | ${arp('c', 'f', 'a')} | ${arp('d', 'g', 'b')} |`;
/** Harmony to the A section, mostly a third below. */
const H1 = `o5 c+8 e8 ^8 g+16 a16 ^8 g+8 e8 c+8 |`;
const HARM = `@0 w25 v8 q7
  ${H1} o5 d4 r16 d16 e16 e16 f+4 a8 f+8 | ${H1} o4 b4 r16 b16 > d16 e16 g+4 b8 g+8 |
  ${H1} o5 d8 f+8 f+8 a8 ^8 f+8 e8 f+8 | f+8 d8 d8 < b8 b8 > e8 g+8 b8 | a4 e4 g+8 e8 < b8 g+8 |`;

/** Boogie bass on A7 and D7. */
const BA = `o1 a > c+ e f+ g f+ e c+`;
const BD = `o2 d f+ a b > c < b a f+`;
const TA6 = `${BA} | ${BD} | ${BA} | o2 e g+ b g+ e d c+ < b | ${BA} | ${BD} |`;
const drive = (n: string) => `${n} ${n} > ${n} < ${n} ${n} > ${n} < ${n} ${n}`;
const TB = `q6 o2 ${drive('d')} | ${drive('e')} | ${drive('c+')} | ${drive('f+')} |
  o1 ${drive('b')} | o2 ${drive('e')} | ${drive('f')} | o1 g g > g < g a a b b | q5`;

const DA = `l8 [k h s h k k s h]7 | k h s h l16 s s s s t t t t l8 |`;
const DB = `c h s h k k s o | [k h s o k k s o]6 | k h s h l16 s s s s s s s s l8 |`;

const track: TrackDef = {
  title: 'Rivale',
  tempo: 150,
  intro: {
    p1: `@0 w50 v12 o5 l8 a r r a r a > c+ e | d4 c+ < b ^2`,
    p2: `@0 w25 v9 o4 l8 e r r e r e a > c+ | < b4 a g+ ^2`,
    tri: `@6 q6 o1 l8 a r r a r a > a < a | o2 e4 e e e2`,
    noise: `l8 c r r k r k s s | k4 k8 k8 l16 s s s s s s s s`,
  },
  body: {
    p1: `@0 w50 v12 ~1 ${A6} ${A7} c+4 < a8 e8 a4 r4 |
      w25 ~2 ${B}
      w50 ~1 ${A6} ${A7} c+4 < a4 b8 g+8 e8 d8 |`,
    p2: `${STABS} ${ARPS} ${HARM}`,
    tri: `@6 q5 l8 ${TA6} o1 b b > d < b > e e d < b | ${BA} |
      ${TB}
      ${TA6} o1 b b > d < b > e e d < b | a a > c+ < a > e e d < b |`,
    noise: `v11 ${DA} ${DB} ${DA}`,
  },
};

export default track;
