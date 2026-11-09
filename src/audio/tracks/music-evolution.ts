import type { TrackDef } from '../mml';

/**
 * Entwicklung – tense, mystical C-minor build that loops until the evolution finishes.
 * Bars 1–4 float over a C pedal, bars 5–8 climb chromatically in the bass (Ab A Bb B) through
 * diminished chords; the melody rises in fourths and steps, then falls back so the final
 * Ab resolves to the opening G. Arpeggios, volume and drums get denser every two bars.
 * Chords: Cm Ab/C Fm/C Db/C | Ab Adim7 Bb7 Bdim7
 */
const track: TrackDef = {
  title: 'Entwicklung',
  tempo: 120,
  body: {
    p1: `@2 w25 ~3
      v9 o4 g2 > c4 d4 | e-1 | v10 c2 f4 g4 | a-1 |
      v11 f2 b-4 > c4 | e-1 | v12 d2 c4 < a-4 | f4 d4 < b4 a-4 |`,
    p2: `@3 w12 q6
      v5 l8 o4 [c e- g > c <]2 | [c e- a- > c <]2 |
      v6 l16 [c f a- > c <]4 | [c f a- > d- <]4 |
      v7 [e- a- > c e- <]4 | [e- a > c e- <]4 |
      v8 [f a- > d f <]4 | l32 [f a- b > d <]8 |`,
    tri: `@4 o2 c1 | c1 | @6 q5 l8 [c > c <]4 | [c > c <]4 |
      o1 [a- > a- <]4 | [a > a <]4 | [b- > b- <]4 | l16 [b > b <]8 |`,
    noise: `v6 l4 x x x x | x x x l8 x x |
      v7 [x h]4 | [x h]4 |
      v8 [k h x h]2 | [k h x h]2 |
      v9 l16 [k h h h s h h h]2 | v8 s s s s v9 s s s s v10 s s s s v11 s s t t |`,
  },
};

export default track;
