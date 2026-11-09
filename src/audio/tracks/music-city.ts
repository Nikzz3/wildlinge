import type { TrackDef } from '../mml';

/**
 * Stadt (groß) – busy, bright B-flat major city theme with electric energy (Funkenstadt).
 * Syncopated "spark" hook (8th + two 16ths + 16th rest), buzzing 16th arpeggios, funky
 * octave bass, the mixolydian Ab chord for drive. Form: A – A' – B (broad, off-beat stabs).
 * Chords A: Bb Ab Eb F | Bb Ab Eb-F Bb   A': Bb Ab Eb F | Gm Eb C7 F
 *        B: Gm Cm F Bb | Gm Eb C7 F
 */
const H = `o5 f8 f16 g16 r16 f8. d8 c8 d4 | e-8 e-16 f16 r16 e-8. c8 < b-8 > c4 |`;
const X34 = `b-8 b-16 > c16 r16 < b-8. g8 e-8 f8 g8 | a4. g8 f4 c4 |`;
const X78 = `g8 g16 a-16 r16 g8. f8 e-8 f8 a8 | b-2 r8 d8 e-8 e8 |`;
const Y = `g8 b-16 > d16 r16 c8. < b-8 a8 g4 | g8 g16 b-16 r16 b-8. a-8 g8 e-4 |
  e8 e16 g16 r16 b-8. a8 g8 e4 | f2 r8 f8 g8 a8 |`;
const B = `o5 b-4. a8 b-4 > d4 < | > c4. < b-8 g4 e-4 | f4. e-8 f4 a4 | b-2 r8 f8 g8 a8 |
  b-4. a8 b-4 > d4 < | > e-4. d8 < b-4 g4 | > c4. < b-8 g4 e4 | f4 a8 > c8 ^8 < a8 g8 e8 |`;

/** One bar of 16th arpeggios on two chords (4 notes each, played twice). */
const arp = (x: string, y: string) => `[${x}]2 [${y}]2`;
const ARP_A = `o4 l16 ${arp('d f b- f', 'd f b- f')} | ${arp('c e- a- e-', 'c e- a- e-')} |
  ${arp('e- g b- g', 'e- g b- g')} | ${arp('c f a f', 'c f a f')} |`;
const ARP_78 = `${arp('e- g b- g', 'c f a f')} | ${arp('d f b- f', 'd f b- f')} |`;
const ARP_Y = `${arp('d g b- g', 'd g b- g')} | ${arp('e- g b- g', 'e- g b- g')} |
  ${arp('e g b- g', 'e g b- g')} | ${arp('c f a f', 'c f a f')} |`;
/** Off-beat stabs for B. */
const stab = (x: string, y: string) => `[r ${x} r ${y}]2`;
const STAB_B = `@1 w25 v7 q4 o4 l8 ${stab('b-', 'g')} | ${stab('g', 'e-')} | ${stab('a', 'f')} | ${stab('f', 'd')} |
  ${stab('b-', 'g')} | ${stab('b-', 'g')} | ${stab('b-', 'e')} | r a r > c < r a r > c < |`;

/** Funky octave bass: one bar, or half a bar. */
const bass = (n: string) => `${n}8. ${n}16 > ${n}8 < ${n}8 r8 ${n}8 > ${n}8 < ${n}8`;
const half = (n: string) => `${n}8. ${n}16 > ${n}8 < ${n}8`;
const TA = `o1 ${bass('b-')} | ${bass('a-')} | o2 ${bass('e-')} | ${bass('f')} |`;

const GROOVE = `k8 h16 h16 s8 h8 r16 k16 k8 s8 o8`;
const FILL = `k8 h16 h16 s8 h8 l16 s s s s t t t t l8`;

const track: TrackDef = {
  title: 'Funkenstadt',
  tempo: 126,
  intro: {
    p1: `@1 w12 v9 o5 l16 [b- f d f]4 | [a f c f]2 a8 r8 c d e- e |`,
    p2: `@1 w12 v6 o4 l16 [d f b- f]4 | [c f a f]2 c8 r8 r4 |`,
    tri: `@6 q5 o1 l8 [b- > b- <]4 | o2 [f > f <]3 c8 < a8 |`,
    noise: `l16 [h h h h]3 h h s s | k8 r8 k8 r8 s s s s s s s s |`,
  },
  body: {
    p1: `@0 w25 v11 ~1 ${H} ${X34} ${H} ${X78} ${H} ${X34} ${Y} w50 ~2 ${B}`,
    p2: `@1 w12 v6 q6 ${ARP_A} o4 ${arp('d f b- f', 'd f b- f')} | ${arp('c e- a- e-', 'c e- a- e-')} | ${ARP_78}
      ${ARP_A} ${ARP_Y} ${STAB_B}`,
    tri: `@6 q5
      ${TA} o1 ${bass('b-')} | ${bass('a-')} | o2 ${half('e-')} ${half('f')} |
      o1 b-8. b-16 > b-8 < b-8 > d8 c8 < b-8 a8 |
      ${TA} o2 ${bass('g')} | ${bass('e-')} | ${bass('c')} | f8. f16 > f8 < f8 r8 f8 > f8 < f+8 |
      q7 o2 g4. g8 > d4 < g4 | c4. c8 g4 c4 | f4. f8 > c4 < f4 | o1 b-4. b-8 > f4 < b-4 |
      o2 g4. g8 > d4 < g4 | e-4. e-8 b-4 e-4 | c4. c8 g4 b-4 | f4. f8 c4 < a4 |`,
    noise: `v11 l8
      [${GROOVE} |]7 ${FILL} | [${GROOVE} |]7 ${FILL} |
      c8 h8 s8 h8 k8 k8 s8 h8 | [k8 h8 s8 h8 k8 k8 s8 h8 |]6 ${FILL} |`,
  },
};

export default track;
