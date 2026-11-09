import type { TrackDef } from '../mml';

/**
 * Kampf (Trainer) – fast D-minor theme over a galloping bass. The A section rides the
 * descending i–VII–VI–V progression, B lifts to F major, A returns with a harmony voice.
 * Chords A: Dm C Bb A7 | Dm C Bb-Gm A7   B: F C Dm Bb | F C Bb A7
 */
const A = `o5 d8. d16 f8 a8 ^4 g8 f8 | e8. e16 g8 > c8 ^4 < b-8 a8 | d8. d16 f8 b-8 ^4 a8 g8 | a4. g8 f8 e8 c+4 |
  d8. d16 f8 a8 ^4 g8 f8 | e8. e16 g8 > c8 ^4 d8 e8 | f4. e8 d4 < b-4 | a2 g8 f8 e8 c+8 |`;
const B = `o5 a4. g8 a4 > c4 < | g2 e4 c4 | f4. e8 f4 a4 | > d2 c4 < b-4 |
  a4. g8 a4 > c4 < | > e2 c4 < g4 | > d4. c8 < b-4 g4 | a2 > c+4 e4 |`;

/** Off-beat stabs (A, first time). */
const STAB = `@1 w25 v8 q4 o4 l8 [r a r f]2 | [r g r e]2 | [r f r d]2 | [r e r c+]2 |
  [r a r f]2 | [r g r e]2 | r f r d r g r d | [r e r c+]2 |`;
/** Harmony to B. */
const BH = `@2 w25 v8 q7 o5 c2 f2 | e2 < g4 e4 > | d2. f4 | b-2 f4 d4 | c2 f2 | > c2 < e2 | f2 d2 | e2 a4 > c+4 |`;
/** Harmony to A (second time), mostly a third below. */
const AH = `@0 w12 v8 q7 o4 a8. a16 > d8 f8 ^4 e8 d8 | c8. c16 e8 g8 ^4 g8 f8 | < b-8. b-16 > d8 f8 ^4 f8 d8 |
  e4. e8 d8 c+8 < a4 > | < a8. a16 > d8 f8 ^4 e8 d8 | c8. c16 e8 g8 ^4 b-8 > c8 < | > d4. c8 < b-4 g4 |
  e2 e8 d8 c+8 < a8 |`;

const gallop = (n: string) => `[${n}8 ${n}16 ${n}16]4`;
const TA = `@6 q6 o2 ${gallop('d')} | ${gallop('c')} | o1 ${gallop('b-')} | ${gallop('a')} |
  o2 ${gallop('d')} | ${gallop('c')} | o1 [b-8 b-16 b-16]2 o2 [g8 g16 g16]2 | o1 ${gallop('a')} |`;
const TB = `q6 l8 o2 [f > f <]4 | [c > c <]4 | [d > d <]4 | o1 [b- > b- <]4 |
  o2 [f > f <]4 | [c > c <]4 | o1 [b- > b- <]4 | [a > a <]4 |`;

const DA = `l8 [k8 h16 h16 s8 h8 k8 k8 s8 h8]7 | k8 h8 s8 h8 l16 s s s s t t t t l8 |`;
const DB = `c8 o8 s8 h8 k8 k8 s8 o8 | [k8 o8 s8 h8 k8 k8 s8 o8]6 | k8 h8 s8 h8 l16 s s s s s s s s l8 |`;

const track: TrackDef = {
  title: 'Kampf (Trainer)',
  tempo: 176,
  intro: {
    p1: `@0 w50 v12 o5 l16 d > d < r8 d > d < r8 f > f < r8 g > g < a > a < | l8 o5 a4 r a o4 l16 c+ d e f g a b- > c+`,
    p2: `@0 w12 v9 o4 l16 d > d < r8 d > d < r8 f > f < r8 g > g < a > a < | l8 o5 e4 r e o3 l16 a b- > c+ d e f g a`,
    tri: `@6 q6 o2 l16 d > d < r8 d > d < r8 f > f < r8 g > g < a > a < | o1 a4 r8 a8 [a8 a16 a16]2`,
    noise: `l16 k k r8 k k r8 k k r8 s s s s | k4 r8 k8 s s s s s s s s`,
  },
  body: {
    p1: `@0 w50 v12 ~1 ${A} w25 ~2 ${B} w50 ~1 ${A}`,
    p2: `${STAB} ${BH} ${AH}`,
    tri: `${TA} ${TB} ${TA}`,
    noise: `v12 ${DA} ${DB} ${DA}`,
  },
};

export default track;
