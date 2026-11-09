import type { TrackDef } from '../mml';

/**
 * Sieg (Hüter) – triumphant D-major victory. The fanfare climbs the title's alphorn
 * arpeggio and darkens briefly to G minor (minor plagal colour) before landing on D.
 * Loop: a quarter + triplet + half-note motif that rises and falls in sequence; A' adds a
 * harmony voice and turns around on A7.
 * Fanfare: D | G | Gm-A7 | D   A: D G Em A | D Bm G-A D   A': D G Em A | F#m-Bm G Em7 A7
 */
const A4 = `o5 d4 l12 f+ g a l2 > d < | b4 l12 a g f+ l2 g | e4 l12 g a b l2 > e < | > c+4 < l12 b a g l2 a | l4`;
const H4 = `o4 a4 l12 > d e f+ l2 a | g4 l12 f+ e d l2 d | < b4 l12 > e f+ g l2 b | a4 l12 g f+ e l2 e | l4`;

const track: TrackDef = {
  title: 'Sieg (Hüter)',
  tempo: 132,
  intro: {
    p1: `@0 w50 v12 o4 a8 r16 a16 > d4 f+4 a4 | > d4. < b8 g4 b4 | b-4. a8 g4 e4 | ~2 f+1 |`,
    p2: `@0 w25 v9 o4 f+8 r16 f+16 a4 > d4 f+4 | b4. g8 d4 g4 | g4. f8 e4 c+4 | ~1 d1 |`,
    tri: `@6 q7 o2 d8 r16 d16 f+4 a4 > d4 < | g4. g8 b4 g4 | g4. g8 a4 > a4 < | d1 |`,
    noise: `c8 r16 k16 k4 k4 s4 | k4. k8 s4 k4 | k4. k8 s4 s4 | c2 l16 s s s s t t t t |`,
  },
  body: {
    p1: `@0 w50 v12 ~1
      ${A4} f+4. e8 d4 f+4 | b4. a8 f+4 d4 | g4 b4 a4 > c+4 | d2. r4 |
      ${A4} a4. g+8 f+4 b4 | > d4. < b8 g4 b4 | g4. f+8 e4 d4 | e4 a4 g4 c+4 |`,
    p2: `@1 w12 v7 q8 l8 o4
      [d f+ a f+]2 | [d g b g]2 | [e g b g]2 | [c+ e a e]2 |
      [d f+ a f+]2 | [d f+ b f+]2 | d g b g c+ e a e | [d f+ a f+]2 |
      @0 w25 v8 q7 ${H4} o5 f+4. e8 d4 f+4 | b4. g8 d4 g4 | e4. d8 < b4 b4 | > c+4 e4 e4 < a4 |`,
    tri: `@6 q6 l8
      o2 [d > d <]4 | [g > g <]4 | [e > e <]4 | o1 [a > a <]4 |
      o2 [d > d <]4 | o1 [b > b <]4 | o2 [g > g <]2 o1 [a > a <]2 | o2 [d > d <]4 |
      o2 [d > d <]4 | [g > g <]4 | [e > e <]4 | o1 [a > a <]4 |
      o2 [f+ > f+ <]2 o1 [b > b <]2 | o2 [g > g <]4 | [e > e <]4 | o1 a > a < a > a < a b > c+ e |`,
    noise: `v11 l8 c h s h k h s h | [k h s h k h s h]6 | k h s h l16 s s s s t t t t l8 |
      c o s h k h s h | [k o s h k h s h]6 | k h s h l16 s s t t s s t t l8 |`,
  },
};

export default track;
