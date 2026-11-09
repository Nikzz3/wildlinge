import type { TrackDef } from '../mml';

/** Item erhalten – short rising D-major figure (2.4 s). */
const track: TrackDef = {
  title: 'Item',
  tempo: 150,
  body: {
    p1: `@0 w50 v12 o5 l8 d f+ a > d4 < a b > c+ | d2`,
    p2: `@0 w25 v9 o4 l8 a > d f+ a4 f+ g a | f+2`,
    tri: `@6 q7 o2 d4 a4 > d4 < a4 | > d2`,
    noise: `l4 k h k s | c2`,
  },
};

export default track;
