import type { TrackDef } from '../mml';

/**
 * Kampf (wild) – driving E-minor battle theme with a syncopated hook and a Phrygian-dominant
 * run in the intro. Form: A (ends on B7) – A' (harmony, cadence on Em) – B (heroic, relative major).
 * Chords A: Em Em C D | Em G C-Am B7   A' ending: Am-B7 Em   B: C D Bm Em | C D B7 B7
 */
const A16 = `o5 e4 < b8 > e8 ^8 f+8 g4 | f+8 e8 d8 e4. < b4 > | c4 < g8 > c8 ^8 d8 e4 | f+4. e8 d4 < a4 > |
  e4 < b8 > e8 ^8 f+8 g4 | a8 g8 f+8 g4. b4 |`;
const A78 = `> c4. < b8 a4 g8 a8 | b2 a8 g8 f+8 d+8 |`;
const A78b = `> c4. < b8 a4 f+8 d+8 | e2. r4 |`;
const B = `o5 g2 e4 g4 | a2. f+4 | b4. a8 f+4 d4 | g4. f+8 e2 |
  > c2 < g4 e4 | > d2 < a4 f+4 | b4. a8 f+4 d+4 | e8 f+8 g8 a8 b4 d+4 |`;

/** Bass: root, root, octave, root, root, octave, root, octave. */
const bass = (n: string) => `${n} ${n} > ${n} < ${n} ${n} > ${n} < ${n} > ${n} <`;

const track: TrackDef = {
  title: 'Kampf (wild)',
  tempo: 168,
  intro: {
    p1: `@0 w50 v12 o5 l8 e r r e r e g r | f+ r r f+ l16 < b > c d+ e f+ g a b`,
    p2: `@0 w25 v9 o4 l8 b r r b r b > e r | d+ r r d+ l16 < < b > c d+ e f+ g a b`,
    tri: `@6 q7 o2 l8 e r r e r e g r | o1 b r r b l16 b > c d+ e f+ g a b`,
    noise: `l8 c r r k r k k r | k r r k l16 s s s s s s s s`,
  },
  body: {
    p1: `@0 w50 v12 ~1 [${A16} : ${A78}]2 ${A78b} ~2 ${B}`,
    p2: `@1 w12 v6 q8 o3 l16
      [b > e g e <]4 | [b > e g e <]4 | [g > c e c <]4 | [a > d f+ d <]4 |
      [b > e g e <]4 | [b > d g d <]4 | [g > c e c <]2 [a > c e c <]2 | [b > d+ f+ a <]4 |
      @0 w25 v8 q7
      o4 b4 g8 b8 ^8 > d8 e4 | d8 c8 < b8 g4. e4 | e4 e8 g8 ^8 f8 g4 | > d4. c8 < a4 f+4 |
      b4 g8 b8 ^8 > d8 e4 | d8 < b8 a8 b4. > d4 | e4. d8 d+4 < f+4 | g2. r4 |
      @2 w25 v8 ~1
      o5 e2 c2 | f+2 d2 | d2 < b2 | b2 g2 | > e2 c2 | f+2 d2 | f+2 d+4 < b4 | b2 > d+4 < f+4 |`,
    tri: `@6 q6 l8
      [o2 ${bass('e')} | ${bass('e')} | ${bass('c')} | ${bass('d')} | ${bass('e')} | ${bass('g')} |
       : c c > c < c o1 a a > a < a | ${bass('b')} | ]2
      o1 a a > a < a b b > b < b | o2 e e > e < e e4 r4 |
      q5 o2 [c]8 | [d]8 | o1 [b]8 | o2 [e]8 | [c]8 | [d]8 | o1 [b]8 | b b > d+ d+ f+ f+ a a |`,
    noise: `l8 v12
      [ [k h s h k k s h]6 | : k h s h k k s h | k h s h s s l16 s s s s l8 | ]2
      k h s h k k s h | k h s h k4 l16 s s t t l8 |
      c h s h k h s h | [k h s h k h s h]6 | k h s h l16 s s s s t t t t l8 |`,
  },
};

export default track;
