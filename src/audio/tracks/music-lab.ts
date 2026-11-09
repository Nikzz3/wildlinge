import type { TrackDef } from '../mml';

/**
 * Labor – curious, bouncy C major. A staccato "hm? hm?" hook that sneaks up through a
 * chromatic neighbour note (F#–G, G#–A), climbs in sequence and slides back down the
 * scale; off-beat "computer beeps" in p2. B: legato sequence over bubbling 16th
 * arpeggios. Form A B A (24 bars), 1-bar boot-up intro.
 * Chords A: C D7 Dm7 G7 | C A7 Dm7 G7   B: F Em Dm G | F E7 Am-D7 G7
 */
const A = `o5 c8 r8 e8 g8 f+8 g8 r8 e8 | d8 r8 f+8 a8 g+8 a8 r8 f+8 |
  f8 r8 a8 > c8 < b8 > c8 < r8 a8 | g8 r8 f8 r8 d8 r8 < b8 > d8 |
  c8 r8 e8 g8 f+8 g8 r8 e8 | c+8 r8 e8 a8 g+8 a8 r8 g8 | f8 r8 a8 > d8 c+8 d8 < r8 a8 |`;
/** Bar 8: into B, or down the scale back to the top. */
const TO_B = `g8 f8 e8 d8 < b8 > d8 f8 g8 |`;
const TO_TOP = `g8 f8 e8 d8 c8 < b8 a8 b8 > |`;
const B = `o5 a4. g8 f8 g8 a8 > c8 < | b4. a8 g8 a8 b8 > e8 < | > d4. c8 < a8 b8 > c8 d8 < | b2 g4 r4 |
  a4. g8 f8 g8 a8 > c8 < | b4. a8 g+8 a8 b8 > d8 < | > c4 < a4 f+4 a4 | g8 r8 f8 r8 d8 r8 < b8 > d8 |`;

/** Off-beat 16th "beeps", one bar. */
const beep = (a: string, b: string) => `[r8 ${a}16 ${b}16]4`;
const BEEPS = `@3 w25 v7 q6 o4 ${beep('e', 'g')} | ${beep('c', 'f+')} | ${beep('f', 'a')} | ${beep('f', 'b')} |
  ${beep('e', 'g')} | ${beep('c+', 'g')} | ${beep('f', 'a')} | ${beep('f', 'b')} |`;
const BUBBLES = `@1 w12 v6 q6 o4 l16 [c f a > c <]4 | [< b > e g b]4 | [d f a > d <]4 | [d g b > d <]4 |
  [c f a > c <]4 | [d e g+ b]4 | [c e a > c <]2 [c d f+ a]2 | [d f g b]4 |`;

const TA = `o2 c4 g4 > c4 < g4 | d4 a4 > c4 < a4 | d4 a4 > d4 < a4 | g4 > d4 < b4 g4 |
  c4 g4 > c4 < g4 | a4 > e4 < a4 g4 | d4 a4 > d4 < a4 | g4 > d4 < b4 g4 |`;
const TB = `o2 f4 > c4 < f4 > c4 < | e4 b4 e4 b4 | d4 a4 d4 a4 | g4 > d4 < g4 > d4 < |
  f4 > c4 < f4 > c4 < | e4 b4 e4 g+4 | a4 e4 d4 f+4 | g4 > d4 < b4 g4 |`;

const DA = `[k8 h8 x8 h8 r8 k8 x8 h8 |]7 k8 h8 x8 h8 l16 x x x x t t t t l8 |`;
const DB = `[k8 h16 h16 x8 h8 k8 h16 h16 x8 h8 |]7 k8 h8 x8 h8 l16 x x t t t t x x l8 |`;

const track: TrackDef = {
  title: 'Labor',
  tempo: 108,
  intro: {
    p1: `@3 w25 v10 o4 l16 g r b r > d r g r < b r > d r g8 r8 |`,
    tri: `@6 q4 o2 l8 g r g r g r g g |`,
    noise: `v8 l16 x x r x x r x x r x x r x8 x8 |`,
  },
  body: {
    p1: `@1 w25 v11 q6 ${A} ${TO_B} @0 w50 q7 ~1 ${B} @1 w25 q6 ~0 ${A} ${TO_TOP}`,
    p2: `${BEEPS} ${BUBBLES} ${BEEPS}`,
    tri: `@6 q4 ${TA} q6 ${TB} q4 ${TA}`,
    noise: `v9 l8 ${DA} ${DB} ${DA}`,
  },
};

export default track;
