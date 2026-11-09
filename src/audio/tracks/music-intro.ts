import type { TrackDef } from '../mml';

/**
 * Intro (Professorin) – warm, wondrous E-flat major theme for Professorin Arven's speech.
 * Music-box intro with an echo voice; the lydian A natural (F major chord) gives the
 * "look at this world" sparkle. A (Alberti arpeggios) + B (soft counter-voice, chromatic
 * rising bass F–G–Ab–A–Bb back to the tonic).
 * Chords A: Eb F Ab Bb | Eb Cm Ab-Bb Eb   B: Ab Bb Gm Cm | Fm Eb/G Ab-F/A Bb
 */
const track: TrackDef = {
  title: 'Intro (Professorin)',
  tempo: 96,
  intro: {
    p1: `@5 w12 v9 o4 l8 e- g b- > e- g b- > e- < b- | o4 c e- a- > c o4 d f b- > d |`,
    p2: `@5 w12 v5 o4 l8 r16 e- g b- > e- g b- > e- < b-16 | ^16 o4 c e- a- > c o4 d f b- > d16 |`,
    tri: `@2 o2 e-1 | a-2 b-2 |`,
  },
  body: {
    p1: `@2 w50 v11 ~1
      ; A
      o5 e-4. f8 g4 b-4 | a4. g8 f4 c4 | a-4. g8 a-4 > c4 | d4. c8 < b-2 |
      e-4. f8 g4 b-4 | > c4. < b-8 g4 e-4 | a-4. g8 f4 d4 | e-2 r8 e-8 g8 b-8 |
      ; B
      @0 w25 ~2
      > c4. < b-8 a-4 e-4 | f4. g8 a-4 b-4 | g4. f8 d4 < b-4 > | c4. d8 e-4 g4 |
      a-4. g8 f4 > c4 < | b-4. a-8 g4 e-4 | e-4 a-4 a4 > c4 | d2 < b-8 a-8 g8 f8 |`,
    p2: `@1 w12 v7 q8 o4 l8
      [e- b- g b-]2 | [c a f a]2 | [c a- e- a-]2 | [d b- f b-]2 |
      [e- b- g b-]2 | [e- > c < g > c <]2 | c a- e- a- d b- f b- | [e- b- g b-]2 |
      @2 w25 v8 q7 ~1
      o5 e-2 c2 | d2 f2 | d2 < g2 | g2 > c2 | c2 < a-2 | > e-2 < b-2 | > c2 f2 | f2 d2 |`,
    tri: `@0 q6
      o2 e-4 b-4 > e-4 < b-4 | f4 > c4 f4 c4 < | o1 a-4 > e-4 a-4 e-4 | o1 b-4 > f4 b-4 f4 |
      o2 e-4 b-4 > e-4 < b-4 | c4 g4 > c4 < g4 | o1 a-4 > e-4 < b-4 > f4 | o2 e-4 b-4 > e-4 < b-4 |
      q7 o2 a-4. a-8 > e-4 < a-4 | b-4. b-8 > f4 < b-4 | g4. g8 > d4 < g4 | c4. c8 g4 > c4 < |
      f4. f8 > c4 < f4 | g4. g8 b-4 g4 | a-4. a-8 a4. a8 | b-4. b-8 f4 d4 |`,
    noise: `v6 l8
      [k r h r x r h h]7 | k r h r x x x h |
      [k h h h x h h h]7 | k h x h l16 x x x x t t t t l8 |`,
  },
};

export default track;
