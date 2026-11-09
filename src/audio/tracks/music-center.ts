import type { TrackDef } from '../mml';

/**
 * Heilstation – calm, soothing G major. The melody rocks gently in a "long – short – step"
 * rhythm (B. G A B) that settles a little lower each time; chime-like bell arpeggios flow
 * underneath, soft legato bass, barely-there percussion.
 * A (8 bars, settles on G) – B (rising triads, ends on D7 back into the top).
 * Chords A: G D/F# Em C | G/B C Am7-D G   B: C D Bm Em | C D Am7 D7
 */
const A = `o5 b4. g8 a4 b4 | a4. f+8 d2 | g4. e8 f+4 g4 | e4. d8 e4 g4 |
  b4. g8 a4 b4 | > c4. < a8 e4 g4 | a4. g8 f+4 a4 | g2. r4 |`;
const B = `o5 e4 g4 > c2 < | d4 f+4 a2 | d4 f+4 b2 | b4. a8 g4 e4 |
  e4 g4 > c4 e4 | d2 c4 < a4 | a4. g8 e4 c4 | f+4 a4 > c4 < a4 |`;

const arp = (notes: string) => `[${notes}]2`;
const G = arp('d g b g');
const D = arp('d f+ a f+');
const EM = arp('e g b g');
const C = arp('e g > c < g');
const BM = arp('d f+ b f+');
const PA = `${G} | ${D} | ${EM} | ${C} | ${G} | ${C} | e a > c < a d f+ a f+ | ${G} |`;
const PB = `${C} | ${D} | ${BM} | ${EM} | ${C} | ${D} | ${arp('c e g e')} | ${arp('c d f+ a')} |`;

const track: TrackDef = {
  title: 'Heilstation',
  tempo: 90,
  body: {
    p1: `@2 w25 v10 ~1 ${A} w12 ${B}`,
    p2: `@5 w25 v5 q8 o4 l8 ${PA} ${PB}`,
    tri: `@2 q8 o2 g2 d2 | f+2 d2 | e2 b2 | c2 g2 | o1 b2 > d2 | c2 g2 | o1 a2 > d2 | g2 d2 |
      c2 g2 | d2 a2 | o1 b2 > f+2 | e2 b2 | c2 g2 | d2 a2 | o1 a2 > e2 | d2 f+2 |`,
    noise: `v5 [k4 h4 x4 h4 |]7 k4 h4 x8 x8 h4 | [k4 h4 x4 h4 |]7 k4 h8 h8 x8 x8 x8 h8 |`,
  },
};

export default track;
