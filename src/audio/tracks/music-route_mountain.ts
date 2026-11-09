import type { TrackDef } from '../mml';

/**
 * Bergpfad – brisk mountain trek in D dorian (the bright B natural over Dm and the major
 * G chord). Rolling 8th-triplet arpeggios like gusts of wind, a marching octave bass;
 * B section opens up with long notes over a chilly swelling pad.
 * Form: A A1 A A2 B A A2 (32 bars).
 * Chords A: Dm G Dm C   A1: Dm G Am C   A2: F G A7 Dm   B: F C G Dm | F C G A
 */
const P1 = `a4. d8 e8 f8 g8 a8 |`;
const A = `o5 ${P1} b4 a8 g8 ^4 d4 | f4. e8 f8 a8 > d8 < a8 | g4. f8 e4 c4 |`;
const A1 = `${P1} b4 a8 g8 ^4 > d4 < | > c4. < b8 a4 e4 | g4 f8 e8 ^4 g4 |`;
const A2 = `a4. > c8 < a4 f4 | b4. a8 g4 d4 | e4. g8 e4 c+4 | d2 r8 e8 f8 g8 |`;
const B = `o6 c2 < a4. g8 | g2 e4. g8 | b2 > d4. < b8 | a2. r8 a8 |
  > c2 < a4 > c4 | e2 d4 c4 | < b2 a4 g4 | a4 e4 c+4 e4 |`;

/** Rolling triplet arpeggio (root position up and down), one bar. */
const roll = (a: string, b: string, c: string) => `[${a} ${b} ${c} > ${a} < ${c} ${b}]2`;
const DM = roll('d', 'f', 'a');
const G = `[< b > d g b g d]2`;
const C = `[< g > c e g e c]2`;
const AM = roll('c', 'e', 'a');
const F = roll('c', 'f', 'a');
const AMAJ = `[< a > c+ e a e c+]2`;
const DM_LOW = `[< a > d f a f d]2`;
const RA = `${DM} | ${G} | ${DM} | ${C} |`;
const RA1 = `${DM} | ${G} | ${AM} | ${C} |`;
const RA2 = `${F} | ${G} | ${AMAJ} | ${DM_LOW} |`;
const ARPS = `@1 w12 v6 q6 ~0 o4 l12`;
const PAD = `@4 w12 v6 q8 ~3 o5 f1 | c1 | d1 | f1 | f1 | g1 | d1 | o4 a1 |`;

/** Marching bass: root, root, octave, root – twice. */
const trek = (n: string) => `[${n} ${n} > ${n} < ${n}]2`;
const TA = `o2 ${trek('d')} | ${trek('g')} | ${trek('d')} | ${trek('c')} |`;
const TA1 = `o2 ${trek('d')} | ${trek('g')} | o1 ${trek('a')} | o2 ${trek('c')} |`;
const TA2 = `o2 ${trek('f')} | ${trek('g')} | o1 ${trek('a')} | o2 ${trek('d')} |`;
const TB = `q7 o2 f4. f8 > c4 < f4 | c4. c8 g4 c4 | g4. g8 > d4 < g4 | d4. d8 a4 d4 |
  f4. f8 > c4 < f4 | c4. c8 g4 c4 | g4. g8 > d4 < g4 | o1 a4. a8 > e4 c+4 | q6 l8`;

const FILL = `k8 h8 s8 h8 t8 t8 l16 t t t t l8`;
const DA = `[k8 h8 s8 h8 k8 k8 s8 o8 |]3 k8 h8 s8 h8 k8 h8 s16 s16 s8 |`;
const DA_END = `[k8 h8 s8 h8 k8 k8 s8 o8 |]3 ${FILL} |`;
const DB = `c4 h8 h8 s4 h8 h8 | [k4 h8 h8 s4 h8 h8 |]6 ${FILL} |`;

const track: TrackDef = {
  title: 'Bergpfad',
  tempo: 132,
  intro: {
    p1: `@0 w25 v10 ~2 o5 a4 > d2. | c4 < a4 f4 e4 |`,
    p2: `@4 w12 v6 ~3 o4 f1 | a2 g2 |`,
    tri: `@6 q6 o2 l8 [d d > d < d]4 |`,
    noise: `l8 r2 r4 h8 h8 | k8 h8 s8 h8 t8 t8 l16 t t s s |`,
  },
  body: {
    p1: `@0 w50 v12 ~1 ${A} ${A1} ${A} ${A2} w25 ~2 ${B} w50 ~1 ${A} ${A2}`,
    p2: `${ARPS} ${RA} ${RA1} ${RA} ${RA2} ${PAD} ${ARPS} ${RA} ${RA2}`,
    tri: `@6 q6 l8 ${TA} ${TA1} ${TA} ${TA2} ${TB} ${TA} ${TA2}`,
    noise: `v11 l8 ${DA} ${DA_END} ${DA} ${DA_END} ${DB} ${DA} ${DA_END}`,
  },
};

export default track;
