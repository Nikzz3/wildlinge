import type { TrackDef } from '../mml';

/**
 * Kampf (Boss) – dark, driving F-minor battle against Frostmantel over a relentless 16th bass.
 * The Frostmantel motif from the villain theme (up a minor sixth, slipping back by half steps:
 * F – Db – C – B – C) leads A; the Neapolitan Gb and C7b9 add menace. B soars over a
 * diminished turn; A' returns with a harmony voice.
 * Chords A: Fm Fm Db C | Fm Gb Bbm-C7 Fm   B: Db C Bbm C | Db Gb Edim7 C7   A' ends: Fm-C7
 */
const A7 = `o5 f8. f16 > d-4 ^8 c8 < b8 > c8 | < a-8 g8 f8 e8 f4 c4 | d-8. d-16 b-4 ^8 a-8 g8 a-8 |
  g8 f8 e8 d-8 c4 e4 | f8. f16 > d-4 ^8 c8 < b8 > c8 | < g-8 f8 e-8 d-8 ^8 e-8 g-4 | f4 d-8 b-8 > c8 < b-8 g8 e8 |`;
const B = `o5 f2 a-4 > d-4 | c2. < g4 | b-2 > d-4 f4 | e2. c4 |
  d-4 c8 < b-8 a-4 f4 | g-4 f8 e-8 d-4 < b-4 > | e4 g4 b-4 > d-4 | c4 < b-4 g4 e4 |`;

/** Off-beat stabs: x and y carry their own octave. */
const st = (x: string, y: string) => `r ${x} r ${y} r ${x} r ${y}`;
const FM = st('o4 f', 'o4 a-');
const STABS = `@1 w25 v7 q4 l8
  ${FM} | ${FM} | ${FM} | ${st('o4 g', 'o4 b-')} |
  ${FM} | ${st('o4 b-', 'o4 g-')} | r o4 f r b- r e r g | ${FM} |`;
const arp = (a: string, b: string, c: string) => `[${a} ${b} ${c} ${b}]4`;
const ARPS = `@1 w12 v6 q8 l16 o4
  ${arp('d-', 'f', 'a-')} | ${arp('c', 'e', 'g')} | ${arp('d-', 'f', 'b-')} | ${arp('c', 'e', 'g')} |
  ${arp('d-', 'f', 'a-')} | ${arp('d-', 'g-', 'b-')} | [e g b- > d- <]4 | [c e g b-]4 |`;
/** Harmony to A', mostly a third or sixth below. */
const H1 = `o5 c8. c16 f4 ^8 a-8 g8 a-8 |`;
const AH = `@0 w25 v8 q7
  ${H1} o5 f8 e8 c8 c8 c4 < a-4 | o4 a-8. a-16 > f4 ^8 f8 d-8 f8 | e8 d-8 c8 < b-8 g4 > c4 |
  ${H1} o5 d-8 d-8 c8 < b-8 ^8 > c8 e-4 | o5 d-4 < b-8 > f8 g8 e8 c8 < b-8 | o5 c4 < a-4 g8 g8 b-8 > c8 |`;

/** Relentless 16th bass: root, root, octave, root. */
const drive = (n: string) => `[${n} ${n} > ${n} < ${n}]4`;
const TA7 = `l16 o2 ${drive('f')} | [f f > f < f]3 f e e- d- | ${drive('d-')} | [c c > c < c]3 c e g e |
  ${drive('f')} | ${drive('g-')} | o1 [b- b- > b- < b-]2 o2 [c c > c < c]2 |`;
const oct = (n: string) => `[${n} > ${n} <]4`;
const TB = `l8 o2 ${oct('d-')} | ${oct('c')} | o1 ${oct('b-')} | o2 ${oct('c')} |
  ${oct('d-')} | ${oct('g-')} | ${oct('e')} | [c > c <]2 c d- e g |`;

const DA = `l16 [k8 h h s8 h h k8 k8 s8 k h]7 | k8 h8 s8 h8 s s s s t t t t |`;
const DB = `l16 c8 h h s8 h h k8 h h s8 h h | [k8 h h s8 h h k8 h h s8 h h]6 | k8 h8 s8 h8 s s t t s s t t |`;

const track: TrackDef = {
  title: 'Kampf (Boss)',
  tempo: 182,
  intro: {
    p1: `@0 w50 v12 o4 l8 f r f r f > d- c < b | > c2. e4`,
    p2: `@0 w25 v9 o3 l8 a- r a- r a- > f e f | g2. b-4`,
    tri: `@6 q6 o2 l16 ${drive('f')} | ${drive('c')}`,
    noise: `l16 k8 r8 k8 r8 k8 s s s8 s8 | c4 r8 k8 s s s s s s s s`,
  },
  body: {
    p1: `@0 w50 v12 ~1 ${A7} f2 r8 c8 d-8 e-8 |
      w25 ~3 ${B}
      w50 ~1 ${A7} f4 c4 < b-8 > c8 d-8 e8 |`,
    p2: `${STABS} ${ARPS} ${AH}`,
    tri: `@6 q6 ${TA7} [f f > f < f]3 f e- d- c |
      ${TB}
      ${TA7} [f f > f < f]2 [c c > c < c]2 |`,
    noise: `v12 ${DA} ${DB} ${DA}`,
  },
};

export default track;
