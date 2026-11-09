import type { TrackDef } from '../mml';

/**
 * Kampf (Legende) – epic, otherworldly D-minor climax against the guardian of the Alpenglut.
 * A: a rising sequence (D – F – G – A on each downbeat) over a galloping bass.
 * B: major chords a major third apart (Bb – D – F# – Bb) with a lydian "3 – #4 – 5" figure
 *    and bell arpeggios. C: the title's alphorn arpeggio returns in D major, darkens to Gm, A7.
 * Chords A: Dm Bb C Dm | Dm Bb Gm A   B: Bb D F# Bb | Gm Eb A A7   C: D G Bm A | D G Gm A7
 */
const A = `o5 d4 a4 ^8 g8 f8 e8 | f4 d4 ^8 < b-8 > d8 f8 | g4 e4 ^8 c8 e8 g8 | a2. a16 b-16 > c16 d16 |
  e4. d8 c4 < a4 | > d4. c8 < b-4 f4 | g4 b-4 > d4 c8 < b-8 | a2 e4 c+4 |`;
const B = `o5 d4. e8 f2 | f+4. g+8 a2 | a+4. b+8 > c+2 | d2. c4 |
  < b-4. a8 g4 d4 | e-2 g4 b-4 | a2 > c+4 e4 | < g4 f4 e4 c+4 |`;
const C = `o4 a4 > d4 f+4 a4 | b2 > d4. c+8 | d2 < b4 f+4 | a2. e4 |
  f+4 a4 > d4 f+4 | e2 d4 < b4 | b-4. a8 g4 e4 | f4 e4 c+4 < a4 |`;

const arp = (a: string, b: string, c: string) => `[${a} ${b} ${c} ${b}]4`;
const ARPS = `@1 w12 v6 q8 l16 o4
  ${arp('d', 'f', 'a')} | ${arp('d', 'f', 'b-')} | ${arp('c', 'e', 'g')} | ${arp('d', 'f', 'a')} |
  ${arp('d', 'f', 'a')} | ${arp('d', 'f', 'b-')} | ${arp('d', 'g', 'b-')} | ${arp('c+', 'e', 'a')} |`;
const BELLS = `@5 w25 v6 q8 l16 o4
  ${arp('d', 'f', 'b-')} | ${arp('d', 'f+', 'a')} | ${arp('c+', 'f+', 'a+')} | ${arp('d', 'f', 'b-')} |
  ${arp('d', 'g', 'b-')} | ${arp('e-', 'g', 'b-')} | ${arp('c+', 'e', 'a')} | ${arp('c+', 'e', 'g')} |`;
/** Harmony to the climax C, mostly a third below. */
const CH = `@0 w25 v8 q7 ~1
  o4 f+4 a4 > d4 f+4 | g2 b4. a8 | b2 f+4 d4 | e2. c+4 |
  d4 f+4 a4 > d4 | < b2 g4 d4 | g4. f8 d4 c+4 | d4 c+4 < a4 e4 |`;

/** Timpani-like gallop with octave hits on beats 2 and 4. */
const gal = (n: string) => `${n}8 ${n}16 ${n}16 ${n}8 > ${n}8 < ${n}8 ${n}16 ${n}16 ${n}8 > ${n}8 <`;
const TA = `o2 ${gal('d')} | o1 ${gal('b-')} | o2 ${gal('c')} | ${gal('d')} |
  ${gal('d')} | o1 ${gal('b-')} | ${gal('g')} | ${gal('a')} |`;
const oct = (n: string) => `[${n} > ${n} <]4`;
const TB = `l8 o1 ${oct('b-')} | o2 ${oct('d')} | ${oct('f+')} | o1 ${oct('b-')} |
  ${oct('g')} | o2 ${oct('e-')} | o1 ${oct('a')} | a > a < a > a < a b > c+ e |`;
const TC = `o2 ${gal('d')} | o1 ${gal('g')} | ${gal('b')} | ${gal('a')} |
  o2 ${gal('d')} | o1 ${gal('g')} | ${gal('g')} | ${gal('a')} |`;

const DA = `l8 [k h s h k t16 t16 s h]7 | k h s h l16 s s t t t t t t l8 |`;
const DB = `c h h h s h h h | [k h h h s h h h]6 | k h s h l16 t t t t s s s s l8 |`;
const DC = `c o s h k k s o | [k o s h k k s o]6 | k h s h l16 s s s s t t t t l8 |`;

const track: TrackDef = {
  title: 'Kampf (Legende)',
  tempo: 152,
  intro: {
    p1: `@4 w25 v10 ~3 o5 a1 | b-1 | > c+1 | @0 w50 v12 ~0 < a8 r8 a8 r8 a8 r8 l16 g e c+ < a`,
    p2: `@5 w12 v7 l8 o4 d a > d e f e d < a | d f b- > c d c < b- f | c+ e a b > c+ < b a e |
      @0 w25 v9 o5 e8 r8 e8 r8 e8 r8 l16 c+ < a g e`,
    tri: `@4 o2 d1 | o1 b-1 | a1 | @6 q6 l8 a r a r a r l16 a a a a`,
    noise: `c1 | r1 | r2 l16 t8 t t t8 t t | l8 k r k r k r l16 s s s s`,
  },
  body: {
    p1: `@0 w50 v12 ~1 ${A} w25 ~3 ${B} w50 ~2 ${C}`,
    p2: `${ARPS} ${BELLS} ${CH}`,
    tri: `@6 q6 ${TA} q7 ${TB} q6 ${TC}`,
    noise: `v12 ${DA} ${DB} ${DC}`,
  },
};

export default track;
