import type { TrackDef } from '../mml';

/**
 * Gipfelhorn – majestic, sacred E major hymn on the wind-swept peak. The Alpenglut glows in
 * the lydian A# (F#/E chord) and in bell arpeggios; wind is a swelling, wobbling pad.
 * A: hymn over organ-pedal bass. B: the bright bVI–bVII–I climb (C D E) to the climax.
 * A': the hymn with a harmony voice and a marching pulse. 2-bar bell intro.
 * Chords A: E F#/E A/E E | C#m A F#m-B E   B: C D E E | C D Bsus4-B B
 */
const A = `o4 b4 > e4 b2 | a+4. g+8 f+2 | a4 > c+4 < b4 a4 | g+2. r4 |
  g+4. f+8 e4 g+4 | a4 > c+4 e2 < | > c+4. < b8 a4 f+4 | g+2 e2 |`;
const B = `o5 g2 e4 g4 | a2 f+4 a4 | b2 g+4 b4 | > e2. < b4 |
  > c2 < g4 > c4 | d2 < a4 > d4 | e2 d+2 | < b1 |`;

const PAD = `@4 w12 v6 q8 ~3 o4 g+1 | a+1 | a1 | g+1 | g+1 | a1 | > c+2 d+2 < | b1 |`;
const arp = (notes: string) => `[${notes}]2`;
const BELLS = `@5 w25 v6 q8 o4 l8 ${arp('c e g > c <')} | ${arp('d f+ a > d <')} | ${arp('e g+ b > e <')} |
  ${arp('e g+ b > e <')} | ${arp('c e g > c <')} | ${arp('d f+ a > d <')} | e f+ b f+ d+ f+ b f+ |
  ${arp('d+ f+ b f+')} |`;
const HARM = `@2 w12 v8 q7 ~1 o4 g+4 b4 > e2 | f+4. e8 c+2 | e4 a4 g+4 e4 | e2. r4 |
  e4. d+8 c+4 e4 | e4 a4 > c+2 < | a4. g+8 f+4 d+4 | e2 < b2 |`;

const TA = `@6 q8 o2 e1 | e1 | e1 | e1 | c+1 | o1 a1 | o2 f+2 o1 b2 | o2 e1 |`;
const TB = `@6 q6 o2 c2 > c2 < | d2 > d2 < | e2 > e2 < | e2 > e2 < | c2 > c2 < | d2 > d2 < | o1 b2 > b2 < | b2 > b2 < |`;
const pulse = (n: string) => `${n}4. ${n}8 > ${n}2 <`;
const TA2 = `@6 q6 o2 ${pulse('e')} | ${pulse('e')} | ${pulse('e')} | ${pulse('e')} |
  ${pulse('c+')} | o1 ${pulse('a')} | o2 f+4. f+8 o1 b4. b8 | o2 e4. e8 b4 g+4 |`;

const track: TrackDef = {
  title: 'Gipfelhorn',
  tempo: 108,
  intro: {
    p1: `@5 w12 v8 o5 l8 e r b r g+ r > e r < | f+ r a+ r > c+ r < b4 |`,
    p2: `@4 w12 v6 ~3 o4 b1 | a+2 b2 |`,
    tri: `@4 o2 e1 | e1 |`,
    noise: `v6 l8 [r o]4 | r o r o l16 t t t t t t t t |`,
  },
  body: {
    p1: `@0 w25 v11 ~2 ${A} w50 ${B} w25 ${A}`,
    p2: `${PAD} ${BELLS} ${HARM}`,
    tri: `${TA} ${TB} ${TA2}`,
    noise: `v9 l8
      c2 r2 | [k4 r4 o4 r4 |]6 k4 r4 t8 t8 t8 t8 |
      c8 h8 o8 h8 s8 h8 o8 h8 | [k8 h8 o8 h8 s8 h8 o8 h8 |]6 k8 h8 s8 h8 l16 s s t t t t t t l8 |
      c8 h8 s8 h8 k8 h8 s8 h8 | [k8 h8 s8 h8 k8 h8 s8 h8 |]6 k8 h8 s8 h8 l16 t t t t s s s s l8 |`,
  },
};

export default track;
