import type { TrackDef } from '../mml';

/**
 * Pfad – bright walking theme in G major with a hopping, syncopated motif.
 * Form: A (question, ends on D) – A' (answer, ends on G, with harmony a third below) – B (broad).
 * Phrases are TS constants so they can be reused; `[X : Y]2 Z` plays X Y X Z.
 * Chords X: G Em C D | G Bm C-D   Y: D   Z: G   B: C D Bm Em | Am D G/B-C D
 */
const X = `o5 d8 g4 f+8 g8 a8 b4 | b8 a8 g8 e4 d8 e4 | e8 g4 > c8 < b8 a8 g4 | a4. g8 f+8 e8 d4 |
  d8 g4 f+8 g8 a8 b4 | > d8 < b8 a8 f+4 e8 f+4 | e8 g4 > c8 < b8 a8 g8 a8 |`;
const Y = `f+4. e8 f+8 g8 a4 |`;
const Z = `b4. a8 g2 |`;
const B = `o5 e2 g4. e8 | f+2 a4. f+8 | b4. a8 f+4 d4 | g4. f+8 e2 |
  a2 > c4. < a8 | f+4. g8 a2 | b4 a8 g8 > c4 < b8 a8 | a2 r8 a8 f+8 a8 |`;

/** Harmony to X + Z (mostly a third below the melody). */
const HX = `o4 b8 > e4 d8 e8 f+8 g4 | g8 f+8 e8 < b4 b8 b4 | > c8 e4 g8 g8 e8 e4 | f+4. e8 d8 c8 < a4 |
  b8 > e4 d8 e8 f+8 g4 | b8 f+8 f+8 d4 < b8 > d4 | c8 e4 g8 f+8 f+8 d8 f+8 |
  g4. f+8 d2 |`;

const track: TrackDef = {
  title: 'Pfad',
  tempo: 140,
  body: {
    p1: `@0 w50 v12 ~1 [${X} : ${Y}]2 ${Z} w25 ~2 ${B}`,
    p2: `@1 w12 v7 q8 l8 o4
      [d g b g]2 | [e g b g]2 | [e g > c < g]2 | [d f+ a f+]2 |
      [d g b g]2 | [d f+ b f+]2 | e g > c < g d f+ a f+ | [d f+ a f+]2 |
      @0 w25 v8 q7 ${HX}
      @1 w12 v7 q8 l8 o4
      [c e g > c <]2 | [d f+ a > d <]2 | [< b > d f+ b]2 | [e g b > e <]2 |
      [< a > c e a]2 | [d f+ a > d <]2 | < b > d g b c e g > c < | [d f+ a > d <]2 |`,
    tri: `@6 q6 l8
      [o2 [g > g <]4 | [e > e <]4 | [c > c <]4 | [d > d <]4 | [g > g <]4 | o1 [b > b <]4 | o2 [c > c <]2 [d > d <]2 |
      : [d > d <]4 | ]2
      [g > g <]2 g f+ e d |
      q7 o2 c4. c8 g4 c4 | d4. d8 a4 d4 | o1 b4. b8 > f+4 < b4 | o2 e4. e8 b4 e4 |
      o1 a4. a8 > e4 < a4 | o2 d4. d8 a4 d4 | o1 b4. b8 o2 c4. c8 | d4. d8 e4 f+4 |`,
    noise: `l8 v12
      [ [k h s h k k s h]7 | : k h s h k k s s | ]2
      k h s h l16 s s s s t t t t l8 |
      c h s o k h s h | [k h s o k h s h]6 | k h s h l16 s s t t s s t t l8 |`,
  },
};

export default track;
