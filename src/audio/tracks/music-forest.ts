import type { TrackDef } from '../mml';

/**
 * Flüsterwald – mysterious, light-but-eerie A minor theme. The hook is a whispered
 * triplet turn with a chromatic lower neighbour; the bass sinks chromatically
 * (A G# G F# F E). A: rustling 16th tremolo; B: rising sequence over bell arpeggios
 * (B natural over F for a lydian glint); A': the melody comes back with a ghostly
 * echo an octave lower and a 16th late.
 * Chords A: Am Am/G# Am/G D/F# | F E Am E   B: F G Em Am | Dm E Am E
 */
const A = `o5 e4 l12 f e d+ l4 e4 a4 | b2 g+4 e4 | g4 l12 a g f+ l4 g4 > c4 < | > d2 < a4 f+4 |
  a4 l12 b- a g+ l4 a4 > c4 < | > d2 < b4 g+4 | a4 l12 b a g+ l4 a4 e4 | b4 a4 g+4`;
const B = `o5 f4. g8 a4 > c4 < | g4. a8 b4 > d4 < | > e2 d4 < b4 | > c2. < a4 |
  f4. g8 a4 > d4 < | > e2 d4 < b4 | > c4. < b8 a4 e4 | g+2. r4 |`;

const RUSTLE = `@3 w12 v5 q6 o4 l16 [e a]8 | [e b]8 | [e a]8 | [f+ a]8 | [f a]8 | [g+ b]8 | [e a]8 | [d g+]8 |`;
const BELLS = `@5 w25 v6 q8 o4 l8 [f a > c < a]2 | [g b > d < b]2 | [e g b g]2 | [e a > c < a]2 |
  [d f a f]2 | [e g+ b g+]2 | [e a > c < a]2 | [d g+ b g+]2 |`;
/** The melody an octave lower and a 16th late (bar lines removed, last note shortened). */
const ECHO = `@2 w25 v5 q7 ~1 k-12 r16 ${A.replace(/\|/g, '')} e8. | k0`;

const TA = `o2 a2 > e4 < a4 | g+2 > e4 < g+4 | g2 > e4 < g4 | f+2 > d4 < f+4 |
  f2 > c4 < f4 | e2 b4 e4 | a2 > e4 < a4 | e2 b4 g+4 |`;
const TB = `o2 f2 > c4 < f4 | g2 > d4 < g4 | e2 b4 e4 | a2 > e4 < a4 |
  d2 a4 d4 | e2 b4 e4 | a2 > e4 < a4 | e2 b4 g+4 |`;

const GROOVE = `k8 h16 h16 x8 h8 r8 h8 x8 h8`;
const FILL = `k8 h8 x8 h8 l16 t t t t x x x x l8`;

const track: TrackDef = {
  title: 'Flüsterwald',
  tempo: 100,
  intro: {
    p1: `@4 w12 v7 ~3 o5 b1 | g+2 r2 |`,
    p2: `@3 w12 v5 q6 o4 l16 [e a]8 | [e g+]8 |`,
    tri: `@0 q7 o2 a1 | e1 |`,
    noise: `v6 l8 [r h]4 | r h r h l16 x x x x t t t t |`,
  },
  body: {
    p1: `@2 w12 v11 ~2 ${A} e4 | @0 w25 ~1 ${B} @2 w12 ~2 ${A} e4 |`,
    p2: `${RUSTLE} ${BELLS} ${ECHO}`,
    tri: `@0 q7 ${TA} ${TB} ${TA}`,
    noise: `v7 l8 [${GROOVE} |]7 ${FILL} | [k4 h8 h8 x4 h8 h8 |]7 ${FILL} | [${GROOVE} |]7 ${FILL} |`,
  },
};

export default track;
