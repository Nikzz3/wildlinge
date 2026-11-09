import type { TrackDef } from '../mml';

/**
 * Zuhause – cozy, warm lullaby in F major. Soft harmony voice in half notes,
 * gentle walking bass, quiet rim-click groove.
 * Chords A: F Am Bb C | F Dm Gm-C F   B: Bb C Am Dm | Gm C7 F-Dm Gm7-C7
 */
const track: TrackDef = {
  title: 'Zuhause',
  tempo: 92,
  body: {
    p1: `@0 w25 v11 ~1
      ; A
      o5 c8 f8 a4 g8 f8 g4 | e4. c8 e4 a4 | f4. d8 < b-4 > d8 f8 | e2. r4 |
      c8 f8 a4 g8 f8 > c4 < | a4. f8 d4 f4 | g4 b-8 a8 g4 e4 | f2. r4 |
      ; B
      > d4. c8 < b-4 f4 | e4. f8 g2 | > c4. < a8 e4 a4 | f4. e8 d2 |
      b-4. a8 g4 d4 | e4. f8 g4 b-4 | a4. g8 f4 d4 | g4. f8 e4 g4 |`,
    p2: `@2 w12 v7
      o4 a2 > c2 | < a2 > c2 | < b-2 f2 | > c2 < g4 b-4 |
      a4 > c4 < b-4 a4 | > d2 < a2 | > d2 c4 < b-4 | a2. r4 |
      > f2 d2 | c2 e2 | e2 c2 | d4 c4 < a2 |
      > d2 < b-2 | > c2 e2 | c2 < a2 | b-2 g4 b-4 |`,
    tri: `@0 q6
      o2 f4 > c4 f4 c4 < | a4 > e4 a4 e4 < | b-4 > f4 b-4 f4 < | c4 g4 > c4 < g4 |
      f4 > c4 f4 c4 < | d4 a4 > d4 < a4 | g4 > d4 < c4 g4 | f4 > c4 f4 < f4 |
      b-4 > f4 b-4 f4 < | c4 g4 > c4 < g4 | a4 > e4 a4 e4 < | d4 a4 > d4 < a4 |
      g4 > d4 g4 d4 < | c4 g4 > c4 < g4 | f4 > c4 < d4 a4 | g4 > d4 < c4 g4 |`,
    noise: `v7 [k4 h8 h8 x4 h8 h8]15 | k4 h8 h8 x8 x8 x8 h8 |`,
  },
};

export default track;
