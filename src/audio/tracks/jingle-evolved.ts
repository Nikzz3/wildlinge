import type { TrackDef } from '../mml';

/** Entwicklung abgeschlossen – soaring A-major phrase with a plagal (D – A) ending (3.3 s). */
const track: TrackDef = {
  title: 'Entwickelt',
  tempo: 144,
  body: {
    p1: `@0 w50 v12 ~1 o5 l8 e a > c+ e4 c+ d e | f+4 e4 < a2`,
    p2: `@0 w25 v9 o5 l8 c+ e a > c+4 < a b > c+ | d4 c+4 < e2`,
    tri: `@6 q7 o2 a4 > e4 a4 e4 < | d4 > d4 < a2`,
    noise: `l8 k h s h k h s h | k h s h c2`,
  },
};

export default track;
