import type { TrackDef } from '../mml';

/** Abzeichen erhalten – grand dotted fanfare in C major, C | F – G | C (5 s). */
const track: TrackDef = {
  title: 'Abzeichen',
  tempo: 144,
  body: {
    p1: `@0 w50 v12 ~1 o5 c8. e16 g4 > c4. < g8 | a8. b16 > c8. d16 < b4 g4 | > c2. r4`,
    p2: `@0 w25 v9 o4 g8. > c16 e4 g4. e8 | f8. g16 a8. b16 g4 d4 | e2. r4`,
    tri: `@6 q7 o2 c4. c8 > c4 < c4 | f4. f8 g4 > g4 | c2. r4`,
    noise: `k8. k16 s4 k4. k8 | k8. k16 k8. k16 s4 s4 | c2. r4`,
  },
};

export default track;
