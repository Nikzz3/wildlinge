import type { TrackDef } from '../mml';

/**
 * Titelbild – heroic alpine theme in D major. Alphorn-like rising arpeggio motif.
 * A (8 bars, arpeggio accompaniment) + B (8 bars, sustained counter-voice).
 * Chords A: D G Bm A | D G Em-A D   B: Bm F#m G D | Em F#7 G A
 */
const track: TrackDef = {
  title: 'Titel',
  tempo: 128,
  intro: {
    p1: `@0 w25 v11 o4 l16 d f+ a > d f+ a > d < a f+ d < a f+ d f+ a > d | l8 c+ r c+ r e r g4`,
    p2: `@4 w12 v9 o4 f+1 | @0 w25 v9 l8 a r a r > c+ r e4`,
    tri: `@6 q6 o2 l8 [d d > d < d]2 | o1 a r a r a r a4`,
    noise: `l8 k h h k s h h h | k r k r k r l16 s s s s`,
  },
  body: {
    p1: `@0 w50 v12 ~1
      ; A
      o4 a4. > d8 f+4 a4 | b4. a8 g4 d4 | f+4. e8 d4 f+8 e8 | e2. r8 < a8 |
      > d4. f+8 a4 > d4 | < b4. a8 g8 a8 b4 | g4. f+8 e4 c+4 | d2. r4 |
      ; B
      f+2 e8 d8 c+8 d8 | c+2. < a4 | b4 > d8 g8 ^4 f+8 g8 | a2. f+4 |
      g4. f+8 e4 < b4 | a+4. > c+8 e4 f+4 | g4. f+8 e4 d4 | e4. f+8 e4 c+4 |`,
    p2: `@1 w12 v8 q8 o4 l8
      [d f+ a f+]2 | [d g b g]2 | [d f+ b f+]2 | [c+ e a e]2 |
      [d f+ a f+]2 | [d g b g]2 | e g b g c+ e a e | d f+ a f+ d4 r4 |
      @2 w25 v8 q7 ~1 o5 d2 < b2 | a2. f+4 | g2 b2 | > f+2 d2 |
      e2 < g2 | f+2 a+2 | b2 g2 | > c+2 < a2 |`,
    tri: `@6 q6 l8
      o2 [d > d <]4 | [g > g <]4 | o1 [b > b <]4 | [a > a <]4 |
      o2 [d > d <]4 | [g > g <]4 | [e > e <]2 o1 [a > a <]2 | o2 [d > d <]2 d4 r4 |
      q7 o1 b4. b8 b4 > b4 | o2 f+4. f+8 f+4 > f+4 | o2 g4. g8 g4 > g4 | o2 d4. d8 d4 > d4 |
      o2 e4. e8 e4 > e4 | o2 f+4. f+8 a+4 > c+4 | o2 g4. g8 g4 > g4 | o1 a4. a8 > c+4 e4 |`,
    noise: `l8 v12
      [k h s h k k s h]7 | k h s h k4 l16 s s s s l8 |
      c h h k s h h h | [k h h k s h h h]6 | k h s h l16 s s t t t t s s l8 |`,
  },
};

export default track;
