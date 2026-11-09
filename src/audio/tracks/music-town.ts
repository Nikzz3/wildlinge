import type { TrackDef } from '../mml';

/**
 * Stadt (Dorf) – cozy alpine Ländler in A major, 3/4. Yodel-like leaping hook (A–C#–E–A),
 * "oom" bass on beat one, rolled "pah-pah" chord stabs on beats two and three.
 * Form A A' B A (32 bars), B is a legato song line over a soft counter-voice.
 * Chords A: A A D A | F#m Bm E E7   A': F#m Bm-E A-E A
 *        B: D A/C# Bm E | D A/C# Bm-E A
 */
const A = `o4 a4 > c+8 e8 a4 | g+8 a8 b8 a8 e4 | f+4 a8 f+8 d4 | e4. d8 c+4 |`;
const A1 = `c+4 > c+8 < a8 f+4 | d4 > d8 < b8 f+4 | e4 g+8 b8 > e4 < | > d8 c+8 < b8 g+8 e4 |`;
const A2 = `c+4 > c+8 < a8 f+4 | d4 > d8 < b8 g+4 | a4 > c+8 < b8 a8 g+8 | a2 r4 |`;
const B = `o5 a2 f+4 | e2 c+4 | d4 f+4 b4 | a2 g+4 | a2 > d4 < | > c+2 < a4 | b4 a4 g+4 | a4 e4 c+4 |`;

/** Rolled two-note stab on beats two and three. */
const pah = (a: string, b: string) => `r4 ${a}16 ${b}8. ${a}16 ${b}8.`;
const PA = `${pah('e', 'a')} | ${pah('e', 'a')} | ${pah('f+', 'a')} | ${pah('e', 'a')} |`;
const PA1 = `${pah('f+', 'a')} | ${pah('f+', 'b')} | ${pah('g+', 'b')} | ${pah('d', 'g+')} |`;
const PA2 = `${pah('f+', 'a')} | r4 f+16 b8. g+16 b8. | r4 e16 a8. c+16 e8. | ${pah('e', 'a')} |`;
const PB = `@2 w12 v7 q7 ~1 o5 f+2 d4 | c+2 < a4 | b4 > d4 f+4 | e2. | f+2 a4 | e2 c+4 | f+2 e4 | c+2 r4 |`;

const TA = `o2 a4 r2 | e4 r2 | d4 r2 | o1 a4 > c+4 e4 |`;
const TA1 = `f+4 r2 | o1 b4 r2 | o2 e4 r2 | e4 g+4 b4 |`;
const TA2 = `o2 f+4 r2 | o1 b4 r4 > e4 | a4 r4 e4 | a4 e4 c+4 |`;
const TB = `o2 d4 r2 | c+4 r2 | o1 b4 r2 | o2 e4 r2 | d4 r2 | c+4 r2 | o1 b4 r4 > e4 | a4 r4 e4 |`;

const DA = `[k4 h4 h4 | k4 h4 h8 h8 |]2`;
const DB = `[k4 x4 x4 | k4 x4 x8 x8 |]3 k4 x4 x4 | k8 s8 s8 s16 s16 t8 t8 |`;

const track: TrackDef = {
  title: 'Dorf am See',
  tempo: 120,
  meter: 3,
  body: {
    p1: `@0 w50 v11 ~1 ${A} ${A1} ${A} ${A2} w25 ~2 ${B} w50 ~1 ${A} ${A1}`,
    p2: `@1 w25 v7 q5 o4 ${PA} ${PA1} ${PA} ${PA2} ${PB} @1 w25 v7 q5 ~0 o4 ${PA} ${PA1}`,
    tri: `@6 q6 ${TA} ${TA1} ${TA} ${TA2} ${TB} ${TA} ${TA1}`,
    noise: `v8 ${DA} ${DA} ${DA} ${DA} ${DB} ${DA} k4 h4 h4 | k4 h4 h8 h8 | k4 h4 h4 | k8 s8 s16 s16 s8 t8 t8 |`,
  },
};

export default track;
