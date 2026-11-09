import type { TrackDef } from '../mml';

/** Heilstation – calm rising bell arpeggio, C – F | G – C (about 3.4 s). */
const track: TrackDef = {
  title: 'Heilung',
  tempo: 140,
  body: {
    p1: `@5 w25 v12 o5 l8 c e g > c < a f a > c < | b g b > d c2`,
    p2: `@2 w12 v8 o4 g2 a2 | b2 > e2`,
    tri: `@0 o3 c2 < f2 | g2 > c2`,
  },
};

export default track;
