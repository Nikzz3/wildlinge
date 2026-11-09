import type { TrackDef } from '../mml';

/**
 * Glimmerhöhle – slow, sparse D minor with a phrygian Eb. Every melody note comes back
 * one beat later as a quiet, dry echo (p2 plays the same line shifted by a quarter,
 * half-gated so it never spills into the next chord); in the empty bars high bell
 * "glimmers" ring and echo too. Low pulsing bass, dripping clicks.
 * Chords A: Dm Eb Dm Dm | Bb A Dm A   B: Gm Dm Eb A | Gm Dm Eb A
 */
const melody = (v: number, glint: number) => `
  o5 d4 f4 a2 | g4. f8 e-2 | d1 | @5 w12 v${glint} o6 r4 a8 r8 d8 r8 r4 @2 w25 v${v} |
  o5 d4 f4 b-2 | a4. g8 e2 | f1 | @5 w12 v${glint} o6 r4 e8 r8 a8 r8 r4 @2 w25 v${v} |
  o5 g4 b-4 > d2 < | a4. f8 d2 | e-4 g4 b-2 | a1 |
  g4 b-4 > d2 | d4. c8 < a2 | b-4. g8 e-2 | e2`;

/** Bass: long note with a soft re-strike at the end of the bar. */
const pulse = (n: string) => `${n}2.. ${n}8`;

const track: TrackDef = {
  title: 'Glimmerhöhle',
  tempo: 80,
  body: {
    p1: `@2 w25 v10 ~2 ${melody(10, 7)} c+2 |`,
    p2: `@2 w25 v4 ~2 q4 r4 ${melody(4, 3).replace(/\|/g, '')} c+4 |`,
    tri: `@2 q7 o2 ${pulse('d')} | ${pulse('e-')} | ${pulse('d')} | ${pulse('d')} |
      o1 ${pulse('b-')} | ${pulse('a')} | o2 ${pulse('d')} | o1 ${pulse('a')} |
      o2 ${pulse('g')} | ${pulse('d')} | ${pulse('e-')} | o1 ${pulse('a')} |
      o2 ${pulse('g')} | ${pulse('d')} | ${pulse('e-')} | o1 a2 > c+2 |`,
    noise: `v6
      [k4 r8 x8 r2 | r2 r8 x8 r4 | k4 r4 x8 r8 r4 | r4 x16 x16 r8 r2 |]3
      k4 r8 x8 r2 | r2 r8 x8 r4 | k4 r4 x8 r8 r4 | k4 r4 t8 r8 t8 t8 |`,
  },
};

export default track;
