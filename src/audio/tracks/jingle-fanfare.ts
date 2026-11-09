import type { TrackDef } from '../mml';

/** Fanfare – generic event fanfare in F major, F | C7 – F (3.6 s). */
const track: TrackDef = {
  title: 'Fanfare',
  tempo: 132,
  body: {
    p1: `@0 w50 v12 o5 c8 c16 c16 f4 c8 f8 a4 | g8 a16 b-16 a8 g8 f2`,
    p2: `@0 w25 v9 o4 a8 a16 a16 > c4 < a8 > c8 f4 | e8 f16 g16 f8 e8 < a2`,
    tri: `@6 q7 o2 f4 > c4 < f4 > c4 < | c4 > c4 < f2`,
    noise: `k8 k16 k16 s4 k8 k8 s4 | k8 s16 s16 s8 s8 c2`,
  },
};

export default track;
