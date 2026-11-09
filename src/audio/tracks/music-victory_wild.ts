import type { TrackDef } from '../mml';

/**
 * Sieg (wild) – short, happy G-major fanfare (leap G – D – G, held, then a step climb),
 * followed by a bouncy 8-bar loop with off-beat stabs and an oom-pah bass.
 * Fanfare: G | G-D   Loop: G Em C D | G Bm C D7
 */
const st = (x: string, y: string) => `r ${x} r ${y} r ${x} r ${y}`;

const track: TrackDef = {
  title: 'Sieg (wild)',
  tempo: 140,
  intro: {
    p1: `@0 w50 v12 o4 g8 > d8 g4 ^8 f+8 g8 a8 | b8 > c8 d4 < a4 f+8 a8 |`,
    p2: `@0 w25 v9 o4 d8 b8 > d4 ^8 d8 e8 f+8 | g8 a8 b4 f+4 d8 f+8 |`,
    tri: `@6 q6 o2 g8 r8 g4 ^8 d8 e8 f+8 | g4 b4 > d4 < d4 |`,
    noise: `l8 c k s4 ^8 k k s | k k s4 k4 l16 s s s s |`,
  },
  body: {
    p1: `@0 w50 v11 ~1 l8
      o5 d g b g > d4 < b4 | a g e g b4 g4 | e g > c < g > e4 d c | d4 < a4 f+4 a4 |
      o5 d g b g > d4 < b4 | > d < b f+ b > d4 < b4 | > e d c < b a g e g | a4 f+ g a > c < a f+ |`,
    p2: `@1 w25 v7 q4 l8
      ${st('o4 g', 'o4 b')} | ${st('o4 g', 'o4 b')} | ${st('o4 g', 'o5 c')} | ${st('o4 f+', 'o4 a')} |
      ${st('o4 g', 'o4 b')} | ${st('o4 f+', 'o4 b')} | ${st('o4 e', 'o4 g')} | ${st('o4 f+', 'o5 c')} |`,
    tri: `@6 q5 l4
      o2 g d g d | e < b > e < b | > c < g > c e | d < a > d f+ |
      o2 g d g d | o1 b > f+ < b > d | c g c e | d a d > c < |`,
    noise: `v10 l8 [k h s h k h s h]3 | k h s h k k s h |
      [k h s h k h s h]3 | k h s h l16 s s s s t t t t l8 |`,
  },
};

export default track;
