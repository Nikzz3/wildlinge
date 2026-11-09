import type { TrackDef } from '../mml';

/**
 * Sieg (Trainer) – bigger C-major fanfare: dotted triad climb, then the rock cadence
 * Ab – Bb – C held over a snare roll. The 8-bar loop rides an arpeggio motif that climbs
 * a fourth (C -> F) and turns around on G7.
 * Fanfare: C | F-G | Ab-Bb | C   Loop: C Em F G | Am F Dm7 G7
 */
const track: TrackDef = {
  title: 'Sieg (Trainer)',
  tempo: 140,
  intro: {
    p1: `@0 w50 v12 o4 g8. g16 > c8. c16 e4 g4 | a8. a16 > c8. c16 < b4 > d4 | e-4. c8 f4. d8 | ~2 e1 |`,
    p2: `@0 w25 v9 o4 e8. e16 g8. g16 > c4 e4 | f8. f16 a8. a16 g4 b4 | > c4. < a-8 > d4. < b-8 | ~1 > c1 |`,
    tri: `@6 q7 o2 c8. c16 e8. e16 g4 > c4 < | f8. f16 f8. f16 g4 g4 | o1 a-4. a-8 b-4. b-8 | o2 c1 |`,
    noise: `k8. k16 k8. k16 s4 s4 | k8. k16 k8. k16 s4 s4 | k4. k8 k4. k8 | c4 l16 s s s s s s s s s s s s |`,
  },
  body: {
    p1: `@0 w50 v11 ~1
      o5 c8 e8 g8 > c8 ^8 < b8 g8 e8 | g4 e8 < b8 > e4 g4 | f8 a8 > c8 f8 ^8 e8 c8 < a8 | b4 g8 d8 g4 b4 |
      > c8 < a8 e8 a8 > c4 e4 | d8 c8 < a8 f8 a4 > c4 | < f4 a8 f8 d4 f4 | g8 a8 b8 > d8 ^8 < b8 g8 d8 |`,
    p2: `@1 w12 v7 q8 l8 o4
      [c e g e]2 | [< b > e g e]2 | [c f a f]2 | [< b > d g d]2 |
      [c e a e]2 | [c f a f]2 | [d f a > c <]2 | [< b > d f d]2 |`,
    tri: `@6 q5 l4
      o2 c g c g | e b e b | f > c < f > c < | g d g d |
      o1 a > e < a > e | o2 f c f c | d a d a | g f d < b > |`,
    noise: `v10 l8 c h s h k h s h | [k h s h k h s h]2 | k h s h k k s h |
      [k h s h k h s h]3 | k h s h l16 s s s s t t t t l8 |`,
  },
};

export default track;
