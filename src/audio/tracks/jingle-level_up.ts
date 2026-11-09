import type { TrackDef } from '../mml';

/** Level-up – one bright bar in E major (1.5 s). */
const track: TrackDef = {
  title: 'Level-Up',
  tempo: 160,
  body: {
    p1: `@0 w50 v12 o5 l16 e f+ g+ b > e8 < b8 > e4 r4`,
    p2: `@0 w25 v9 o4 l16 b > d+ e g+ b8 g+8 b4 r4`,
    tri: `@6 o2 e4 b4 > e4 r4`,
    noise: `l16 k r r r k8 s8 c4 r4`,
  },
};

export default track;
