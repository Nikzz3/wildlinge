import type { TrackDef } from '../mml';

/**
 * Halle – determined, proud C minor march before facing a Hüter/Hüterin. Hook: a dotted
 * pickup that springs up a fourth and climbs on (G G C… D Eb F). A with off-beat stabs,
 * A' with a brassy harmony voice in thirds, B is the build-up: the bass climbs
 * Ab–Bb–C–D–Eb–F–G under a rising melodic sequence, 16th arpeggios and a closing snare roll.
 * Chords A: Cm Cm Ab Bb | Cm Fm Ab-Bb G   A': Cm Cm Ab Bb | Eb Fm Dø-G Cm
 *        B: Ab Bb Cm Bb/D | Eb Fm G G7
 */
const HEAD = `o4 g8. g16 > c4 ^8 d8 e-8 f8 | g4. f8 e-4 c4 | e-8. e-16 a-4 ^8 g8 f8 e-8 | f4. e-8 d4 < b-4 |`;
const A_END = `o4 g8. g16 > c4 ^8 d8 e-8 f8 | a-4. g8 f4 c4 | e-4 c4 d4 f4 | g2 < b4 > d4 |`;
const A2_END = `o5 g8. g16 b-4 ^8 a-8 g8 f8 | a-8. a-16 > c4 ^8 < b-8 a-8 g8 | f4. a-8 g4 < b4 > | c2 r8 < g8 a-8 b-8 |`;
const B = `o5 c2 e-4. c8 | d2 f4. d8 | e-2 g4. e-8 | f2 b-4. f8 |
  g2 b-4. g8 | a-2 > c4. < a-8 | b4. > c8 d4 < b4 | > d8 c8 < b8 a-8 g8 f8 d8 < b8 |`;

/** Off-beat stabs, one bar. */
const stab = (x: string, y: string) => `[r8 ${x}8 r8 ${y}8]2`;
const STABS = `@1 w25 v7 q4 o4 ${stab('e-', 'c')} | ${stab('g', 'e-')} | ${stab('a-', 'e-')} | ${stab('f', 'd')} |
  ${stab('e-', 'c')} | ${stab('a-', 'f')} | r8 a-8 r8 e-8 r8 f8 r8 d8 | ${stab('g', 'b')} |`;
/** Harmony to A' (thirds and sixths below the lead). */
const HARM = `@0 w12 v8 q7 o4 e-8. e-16 g4 ^8 b8 > c8 d8 | o5 e-4. d8 c4 < g4 | o5 c8. c16 e-4 ^8 e-8 d8 c8 |
  o5 d4. c8 < b-4 f4 | o5 e-8. e-16 g4 ^8 f8 e-8 d8 | o5 f8. f16 a-4 ^8 g8 f8 e-8 | o5 d4. f8 d4 < g4 |
  o4 g2 r8 e-8 f8 g8 |`;
const ARPS = `@1 w12 v7 q6 o4 l16 [c e- a- e-]4 | [d f b- f]4 | [e- g > c < g]4 | [d f b- f]4 |
  [e- g b- g]4 | [f a- > c < a-]4 | [g b > d < b]4 | [f g b > d <]4 | l8`;

/** Dotted march bass, one bar. */
const march = (n: string) => `[${n}8. ${n}16 > ${n}8 < ${n}8]2`;
const half = (n: string) => `${n}8. ${n}16 > ${n}8 < ${n}8`;
const T_HEAD = `o2 ${march('c')} | ${march('c')} | o1 ${march('a-')} | ${march('b-')} |`;
const T_A_END = `o2 ${march('c')} | ${march('f')} | o1 ${half('a-')} ${half('b-')} | o2 ${march('g')} |`;
const T_A2_END = `o2 ${march('e-')} | ${march('f')} | ${half('d')} ${half('g')} | ${march('c')} |`;
const T_B = `q5 l8 o1 [a-]8 | [b-]8 | o2 [c]8 | [d]8 | [e-]8 | [f]8 | [g]8 | g g g g l16 [g]8 l8 | q6`;

const GROOVE = `k8 h8 s8 h8 k8 k8 s8 h8`;
const DA = `c8 h8 s8 h8 k8 k8 s8 h8 | [${GROOVE} |]6 k8 h8 s8 h8 l16 s s s s t t t t l8 |`;
const DB = `[k8 h8 s8 h8 k8 h8 s8 s8 |]4 [k8 s8 k8 s8 k8 s8 k8 s8 |]2 k8 s8 s8 s8 k8 s8 s8 s8 | l16 [s]16 l8 |`;

const track: TrackDef = {
  title: 'Halle',
  tempo: 140,
  body: {
    p1: `@0 w50 v12 ~1 ${HEAD} ${A_END} ${HEAD} ${A2_END} w25 ~2 ${B}`,
    p2: `${STABS} ${HARM} ${ARPS}`,
    tri: `@6 q6 ${T_HEAD} ${T_A_END} ${T_HEAD} ${T_A2_END} ${T_B}`,
    noise: `v11 l8 ${DA} ${DA} ${DB}`,
  },
};

export default track;
