import type { TrackDef } from '../mml';

/** Wildling gefangen – bouncy G-major celebration, G | D – G (3.2 s). */
const track: TrackDef = {
  title: 'Gefangen',
  tempo: 150,
  body: {
    p1: `@0 w50 v12 o5 g8 g16 g16 b8 > d8 ^4 c8 < b8 | a8 b8 > c8 < a8 g2`,
    p2: `@0 w25 v9 o5 d8 d16 d16 g8 b8 ^4 a8 g8 | f+8 g8 a8 f+8 d2`,
    tri: `@6 q7 o2 g4 > d4 < b4 > d4 < | d4 f+4 g2`,
    noise: `l8 k k16 k16 s8 k8 r8 k8 s8 s8 | k8 h8 s8 h8 c4 r4`,
  },
};

export default track;
