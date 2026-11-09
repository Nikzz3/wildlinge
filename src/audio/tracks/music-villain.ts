import type { TrackDef } from '../mml';

/**
 * Frostmantel – sneaky, cold march in G minor. The Frostmantel motif leaps up a minor sixth
 * and slips back down by half steps (G – Eb – D – C# – D); it returns in the boss battle.
 * Form: A (tiptoe stabs) – B (icicle bells, march bass, Neapolitan Ab before D7) – A' (harmony).
 * Chords A: Gm Gm Cm D7 | Gm Eb Am7b5-D7 Gm   B: Eb Cm6 Ab D7 | Eb C Ab D7   A' ends: Am7b5 D7
 */
const A6 = `o4 g8. g16 > e-4 ^8 d8 c+8 d8 | < b-8 r16 a16 g8 f+8 g4 r8 g8 | > c8. c16 a-4 ^8 g8 f+8 g8 |
  e-8 r16 d16 c8 < b-8 a4 f+4 | o4 g8. g16 > e-4 ^8 d8 c+8 d8 | g8. f16 e-8 g8 b-4 ^8 a-8 |`;
/** Bars 7–8 leading into B (cadence on Gm) or back to the top (half cadence on D7). */
const A78a = `o5 g4. e-8 f+4 a4 | g2 r8 d8 f8 a8 |`;
const A78b = `o5 g4. e-8 c4 < a4 | > d4 c4 < a4 f+8 d8 |`;
const B = `o4 b-2 g8 f8 e-8 g8 | a2 g8 e-8 c8 e-8 | a-2 f8 e-8 c8 e-8 | g4 f+8 e-8 d4 f+4 |
  b-2 > d8 c8 < b-8 g8 | > c2 < a8 g8 e8 g8 | a-8 > c8 e-8 f8 a-4. g8 | f+4. e-8 d4 < a4 |`;

/** Tiptoe off-beat stabs: x and y alternate on the off-beats (each with an explicit octave). */
const st = (x: string, y: string) => `r ${x} r ${y} r ${x} r ${y}`;
const STABS = `@1 w12 v7 q4 l8
  ${st('o3 g', 'o3 b-')} | ${st('o3 b-', 'o4 d')} | r o4 c r e- r c r o3 a | ${st('o3 a', 'o4 c')} |
  ${st('o3 g', 'o3 b-')} | ${st('o3 b-', 'o4 e-')} | r o4 c r e- r o3 a r o4 c | ${st('o3 b-', 'o4 d')} |`;
/** Falling icicles above the low B melody. */
const ice = (a: string, b: string, c: string) => `${a} ${b} ${c} ${b} ${a} r ${b} r`;
const ICE = `@5 w25 v6 q8 l8
  ${ice('o5 g', 'o5 b-', 'o6 e-')} | ${ice('o5 a', 'o6 c', 'o6 e-')} | ${ice('o5 a-', 'o6 c', 'o6 e-')} | ${ice('o5 a', 'o6 c', 'o6 d')} |
  ${ice('o5 g', 'o5 b-', 'o6 d')} | ${ice('o5 g', 'o6 c', 'o6 e')} | ${ice('o6 c', 'o6 e-', 'o6 f')} | ${ice('o5 a', 'o6 c', 'o6 d')} |`;
/** Harmony to A6 + A78b, mostly a third or sixth below. */
const HARM = `@2 w25 v7 q7
  o4 d8. d16 g4 ^8 b-8 a8 b-8 | g8 r16 f+16 d8 c8 < b-4 r8 > d8 | g8. g16 > c4 ^8 e-8 d8 e-8 |
  c8 r16 < b-16 a8 g8 f+4 d4 | d8. d16 g4 ^8 b-8 a8 b-8 | > e-8. d16 < b-8 > e-8 g4 ^8 f8 |
  e-4. c8 < a4 e-4 | a4 f+4 d4 c8 < a8 |`;

const TA6 = `o2 g r g r g r f+ r | g r d r g f e- d | c r c r c r d r | f+ r a r d r c r |
  g r g r g r f+ r | e- r b- r e- r b- r |`;
const TB = `l4 o2 e- < b- > e- < b- | o2 c < g > c < g | o1 a- > e- < a- > e- | o2 d < a > d f+ |
  o2 e- < b- > e- < b- | o2 c < g > c e | o1 a- > e- < a- > c | o2 d < a > d f+ |`;

const DA = `l8 [k h x h s h x h]7 | k h x h l16 s s s s s s s s l8 |`;
const DB = `c4 s8. s16 k8 k8 s4 | [k4 s8. s16 k8 k8 s4]6 | k8 h8 s8 h8 l16 s s s s t t t t l8 |`;

const track: TrackDef = {
  title: 'Frostmantel',
  tempo: 132,
  intro: {
    p1: `@4 w12 v8 ~3 o5 d1 | e-2 d2`,
    p2: `@4 w12 v6 o4 g1 | g2 f+2`,
    tri: `@6 q4 l8 o2 g r d r g r d r | g r g r d r f+ r`,
    noise: `v9 l8 x r x r x r x r | x r x r l16 s s s s s s s s`,
  },
  body: {
    p1: `@0 w25 v11 ~1 ${A6} ${A78a} w50 ~3 ${B} w25 ~1 ${A6} ${A78b}`,
    p2: `${STABS} ${ICE} ${HARM}`,
    tri: `@6 q4 l8 ${TA6} a r e- r d r c r | g r d r g r f r |
      q6 ${TB}
      q4 l8 ${TA6} a r e- r d r c r | d r a r > d < r a f+ |`,
    noise: `v10 ${DA} ${DB} ${DA}`,
  },
};

export default track;
