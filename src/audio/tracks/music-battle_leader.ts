import type { TrackDef } from '../mml';

/**
 * Kampf (Hüter) – intense, heroic C-minor battle. Hook: a quartal leap (C – F – G, held)
 * that falls back by step; it climbs a fourth per phrase. B turns heroic over Ab–Bb–Eb and
 * peaks on an augmented G before the G7 run-down. A' returns with a harmony voice.
 * Chords A: Cm Ab Fm G7 | Cm Ab Fm-G7 Cm   B: Ab Bb Eb Cm | Ab Bb G(+) G7   A' ends: Cm-G7
 */
const A7 = `o5 c8 f8 g4 ^8 > c8 < b-8 g8 | a-4 g8 f8 ^8 e-8 f4 | f8 b-8 > c4 ^8 f8 e-8 c8 | d4 < b8 g8 ^8 f8 d8 < b8 |
  o5 c8 f8 g4 ^8 > c8 < b-8 g8 | a-4 > c8 < b-8 ^8 a-8 e-4 | f4 a-8 f8 g4 b8 > d8 |`;
const B = `o5 a-4. g8 a-4 > c4 | < b-2 f2 | g4. f8 g4 b-4 | > c2 < g2 |
  > c4. < b-8 > c4 e-4 | d4. c8 d4 f4 | e-2. d4 | < b4 g4 f8 d8 < b8 g8 |`;

/** One beat of a broken chord (16ths): low, mid, high, mid. */
const arp = (a: string, b: string, c: string) => `${a} ${b} ${c} ${b}`;
/** G7 broken chord starting on o3 b, back in o3 afterwards. */
const G7 = `b > d f d <`;
const ARPS = `@1 w12 v6 q8 l16 o4
  [${arp('c', 'e-', 'g')}]4 | [${arp('c', 'e-', 'a-')}]4 | [${arp('c', 'f', 'a-')}]4 | o3 [${G7}]4 o4 |
  [${arp('c', 'e-', 'g')}]4 | [${arp('c', 'e-', 'a-')}]4 | [${arp('c', 'f', 'a-')}]2 o3 [${G7}]2 o4 |
  [${arp('c', 'e-', 'g')}]4 |`;
const BH = `@2 w25 v8 q7 ~1 o5 c2 e-2 | d2 < b-2 > | e-2. g4 | g2 e-2 | a-1 | f2 b-2 | g2 b2 | f2 < b4 d4 |`;
/** Harmony to A', mostly a third or sixth below. */
const H1 = `o4 g8 > c8 e-4 ^8 g8 g8 e-8 |`;
const AH = `@0 w25 v8 q7
  ${H1} o5 c4 c8 < a-8 ^8 a-8 a-4 | o5 c8 f8 a-4 ^8 > c8 < b-8 a-8 | o5 b4 g8 d8 ^8 d8 < b8 g8 |
  ${H1} o5 e-4 a-8 e-8 ^8 f8 c4 | o5 c4 f8 c8 d4 g8 b8 | o5 g4 e-4 d8 < b8 g8 d8 |`;

const oct = (n: string) => `[${n} > ${n} <]4`;
const TA7 = `o2 ${oct('c')} | o1 ${oct('a-')} | o2 ${oct('f')} | ${oct('g')} |
  ${oct('c')} | o1 ${oct('a-')} | o2 [f > f <]2 [g > g <]2 |`;
const eighths = (n: string) => `${n} ${n} ${n} ${n} ${n} ${n} > ${n} < ${n}`;
const TB = `o1 ${eighths('a-')} | ${eighths('b-')} | o2 ${eighths('e-')} | ${eighths('c')} |
  o1 ${eighths('a-')} | ${eighths('b-')} | ${eighths('g')} | g g > g < g b b > d d |`;

const DA = `l8 [k h16 h16 s h k k16 k16 s h]7 | k h s h l16 s s s s t t t t l8 |`;
const DB = `c h s h k o s h | [k h s h k o s h]6 | k h s h l16 s s t t s s t t l8 |`;

const track: TrackDef = {
  title: 'Kampf (Hüter)',
  tempo: 174,
  intro: {
    p1: `@0 w50 v12 o4 l16 g8 g g a-8 a- a- b-8 b- b- b8 b b | > d4 < b8 r8 g b > d f e- d c < b`,
    p2: `@0 w25 v9 o3 l16 b-8 b- b- > c8 c c d8 d d d8 d d | < b4 g8 r8 d g b > d c < b a- g`,
    tri: `@6 q6 o1 l16 [g8 g g]4 | g4 g8 r8 g8 g8 g8 g8`,
    noise: `l16 k8 k k s8 k k s8 k k s8 s s | c4 k8 r8 s s s s s s t t`,
  },
  body: {
    p1: `@0 w50 v12 ~1 ${A7} c4 < g8 e-8 c4 r4 |
      w25 ~2 ${B}
      w50 ~1 ${A7} c4 < g4 f8 d8 < b8 g8 |`,
    p2: `${ARPS} ${BH} ${AH}`,
    tri: `@6 q6 l8 ${TA7} o2 ${oct('c')} |
      q5 ${TB}
      q6 ${TA7} o2 c > c < c > c < o1 g g a b |`,
    noise: `v12 ${DA} ${DB} ${DA}`,
  },
};

export default track;
