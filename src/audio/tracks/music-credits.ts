import type { TrackDef } from '../mml';

/**
 * Abspann – warm, nostalgic and finally triumphant credits theme, 56 bars.
 * Main theme in G (a falling third, a leap up and a sighing step: B G D'. C'), a reflective
 * E minor bridge, then Professorin Arven's theme from the intro returns in C ("where it
 * all began"), a rising build-up modulates up a whole step and the main theme comes back
 * in A major; the coda turns via C–D back to G for the loop.
 * Chords A: G D/F# Em C | G/B C Am7-D G   A': … | G/B C D7 G   B: Em C G D | Em C Am7 G7
 *        Recall (C): C D F G | C Am F-G C   Build: Am F C G | Am F D E7
 *        A'' = A' in A major   Coda: D E C#m F#m | D E C D7
 */
const HEAD = `o5 b4 g4 > d4. c8 < | b4 a4 f+4 d4 | g4 e4 b4. a8 | g4. f+8 e4 d4 |`;
const A_END = `b4 g4 > d4. c8 < | a4 e4 > c4. < b8 | > c4 < b4 a4 f+4 | g2. r4 |`;
const A2_END = `b4 g4 > d4. c8 < | a4 e4 > c4. < b8 | > d4 c4 < a4 f+4 | g2. r4 |`;
const B = `o5 e4 g4 b4. a8 | g2 e2 | d4 g4 b4. a8 | a2 f+2 |
  e4 g4 b4. a8 | g2 > c2 < | > c4. < b8 a4 e4 | f4 d4 < b4 > d4 |`;
/** Professorin Arven's theme (music-intro, E-flat major), played here with k-3 in C major. */
const RECALL = `o5 e-4. f8 g4 b-4 | a4. g8 f4 c4 | a-4. g8 a-4 > c4 | d4. c8 < b-2 |
  e-4. f8 g4 b-4 | > c4. < b-8 g4 e-4 | a-4. g8 f4 d4 | e-2 r8 e-8 g8 b-8 |`;
const BUILD = `o5 a4. g8 a4 > c4 < | a4. g8 f4 c4 | g4. f8 g4 > c4 < | b4. a8 g4 d4 |
  > c4. < b8 > c4 e4 < | > c4. < a8 f4 a4 | > d4. c+8 d4 < a4 | g+8 a8 b8 > c+8 d8 e8 d8 < b8 |`;
const CODA = `o5 a4 f+4 > d4. c+8 < | b4 g+4 > e4. d8 < | > c+4 < g+4 e4 g+4 | a2 > c+2 < |
  a4 f+4 > d4. c+8 < | b4 g+4 > e2 < | > c2 < g4 e4 | f+4 a4 > c4 < a4 |`;

const arp = (notes: string) => `[${notes}]2`;
const P_A = `@1 w12 v6 q6 o4 l8 ${arp('d b g b')} | ${arp('d a f+ a')} | ${arp('e b g b')} | ${arp('e > c < g > c <')} |
  ${arp('d b g b')} | ${arp('e > c < g > c <')} | e > c < a > c < d a f+ a | ${arp('d b g b')} |`;
/** Harmony to A' (thirds and sixths below the lead); reused a whole step up for A''. */
const HARM = `@2 w25 v8 q7 ~1 o5 g4 d4 b4. a8 | g4 f+4 d4 < a4 > | e4 < b4 > g4. f+8 | e4. d8 c4 < b4 > |
  g4 d4 b4. a8 | e4 c4 a4. g8 | f+4 a4 f+4 d4 | < b2. r4 |`;
const P_B = `@5 w25 v6 q8 ~0 o4 l8 ${arp('e g b g')} | ${arp('e g > c < g')} | ${arp('d g b g')} | ${arp('d f+ a f+')} |
  ${arp('e g b g')} | ${arp('e g > c < g')} | ${arp('e a > c < a')} | ${arp('d f g b')} |`;
const P_RECALL = `@1 w12 v6 q8 ~0 o4 l8 [e- b- g b-]2 | [c a f a]2 | [c a- e- a-]2 | [d b- f b-]2 |
  [e- b- g b-]2 | [e- > c < g > c <]2 | c a- e- a- d b- f b- | [e- b- g b-]2 |`;
const P_BUILD = `@1 w12 v7 q6 ~0 o4 l16 [e a > c < a]4 | [c f a f]4 | [e g > c < g]4 | [d g b g]4 |
  [e a > c < a]4 | [c f a f]4 | [d f+ a f+]4 | [d e g+ b]4 |`;
const P_CODA = `@1 w12 v7 q6 ~0 o4 l8 ${arp('d f+ a f+')} | ${arp('e g+ b g+')} | ${arp('e g+ > c+ < g+')} | ${arp('f+ a > c+ < a')} |
  ${arp('d f+ a f+')} | ${arp('e g+ b g+')} | ${arp('e g > c < g')} | ${arp('d f+ a > c <')} |`;

const T_A = `@6 q6 o2 g4 > d4 g4 d4 < | f+4 a4 > d4 < a4 | e4 b4 > e4 < b4 | c4 g4 > c4 < g4 |
  o1 b4 > g4 d4 g4 | c4 g4 > c4 < g4 | o1 a4 > e4 d4 a4 | g4 > d4 g4 d4 < |`;
const oct = (n: string) => `[${n} > ${n} <]4`;
const T_A2 = `@6 q6 l8 o2 ${oct('g')} | ${oct('d')} | ${oct('e')} | ${oct('c')} |
  o1 ${oct('b')} | o2 ${oct('c')} | ${oct('d')} | ${oct('g')} |`;
const T_B = `@2 q8 o2 e2 b2 | c2 g2 | g2 d2 | d2 a2 | e2 b2 | c2 g2 | o1 a2 > e2 | g2 d2 |`;
const T_RECALL = `@0 q6 o2 e-4 b-4 > e-4 < b-4 | f4 > c4 f4 c4 < | o1 a-4 > e-4 a-4 e-4 | o1 b-4 > f4 b-4 f4 |
  o2 e-4 b-4 > e-4 < b-4 | c4 g4 > c4 < g4 | o1 a-4 > e-4 < b-4 > f4 | o2 e-4 b-4 > e-4 < b-4 |`;
const T_BUILD = `@6 q6 l8 o1 ${oct('a')} | o2 ${oct('f')} | ${oct('c')} | ${oct('g')} |
  o1 ${oct('a')} | o2 ${oct('f')} | ${oct('d')} | e e > e < e g+ g+ b b |`;
const T_CODA = `@6 q7 o2 d4. d8 a4 d4 | e4. e8 b4 e4 | c+4. c+8 g+4 c+4 | f+4. f+8 > c+4 < f+4 |
  d4. d8 a4 d4 | e4. e8 b4 e4 | c4. c8 g4 c4 | d4. d8 a4 f+4 |`;

const ROCK = `k8 h8 s8 h8 k8 k8 s8 h8`;
const FILL = `k8 h8 s8 h8 l16 s s s s t t t t l8`;
const SOFT = `k4 h8 h8 x4 h8 h8`;
const D_A = `c4 h4 s4 h4 | [k4 h4 s4 h4 |]6 k4 h4 s8 s8 h4 |`;
const D_FULL = `c8 h8 s8 h8 k8 k8 s8 h8 | [${ROCK} |]6 ${FILL} |`;
const D_SOFT = `[${SOFT} |]7 k4 h8 h8 l16 x x x x t t t t l8 |`;
const D_BUILD = `[k8 h8 s8 h8 k8 h8 s8 h8 |]4 [k8 s8 k8 s8 k8 s8 k8 s8 |]2 k8 s8 s8 s8 k8 s8 s8 s8 | l16 [s]16 l8 |`;
const D_CODA = `c4 h8 h8 s4 h8 h8 | [k4 h8 h8 s4 h8 h8 |]5 ${ROCK} | ${FILL} |`;

const track: TrackDef = {
  title: 'Abspann',
  tempo: 112,
  body: {
    p1: `@0 w50 v11 ~1 ${HEAD} ${A_END} ${HEAD} ${A2_END}
      @2 w12 ~2 ${B}
      @2 w25 v10 ~1 k-3 ${RECALL} k0
      @0 w50 v11 ~1 ${BUILD}
      v12 ~2 k2 ${HEAD} ${A2_END} k0
      w25 ${CODA}`,
    p2: `${P_A} ${HARM} ${P_B} k-3 ${P_RECALL} k0 ${P_BUILD} k2 ${HARM} k0 ${P_CODA}`,
    tri: `${T_A} ${T_A2} ${T_B} k-3 ${T_RECALL} k0 ${T_BUILD} k2 ${T_A2} k0 ${T_CODA}`,
    noise: `v10 l8 ${D_A} ${D_FULL} ${D_SOFT} ${D_SOFT} ${D_BUILD} ${D_FULL} ${D_CODA}`,
  },
};

export default track;
