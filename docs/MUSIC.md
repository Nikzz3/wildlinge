# WILDLINGE – Music format (composer reference)

All music is composed as text in TypeScript files and played by our own chiptune synth
(`src/audio/`): two pulse channels, a triangle bass and a noise drum channel, in the style
of 2000s handheld games. This document plus the example tracks is everything you need.

**Originality:** every melody must be your own. Do not quote, paraphrase or "pay homage" to
melodies from Pokémon or any other game, film or song. No famous jingles (coin sounds,
level-up fanfares, …).

## 1. Where tracks live

- One file per track: `src/audio/tracks/music-<id>.ts` for every `MusicId` and
  `src/audio/tracks/jingle-<id>.ts` for every `JingleId` (ids in `src/core/types.ts`;
  file names use the id exactly, e.g. `music-battle_wild.ts`).
- `src/audio/tracks/index.ts` imports every file; you never need to touch it. To replace
  a track, overwrite its file and keep the shape below.
- Check your work: `npx vitest run tests/audio.test.ts` (parses every track and checks
  lengths, ranges and tempo) and `npx tsc --noEmit`.

Every file looks like this:

```ts
import type { TrackDef } from '../mml';

/** One-line description: mood, key, form, chord plan. */
const track: TrackDef = {
  title: 'Pfad',          // human-readable name (German is fine)
  tempo: 140,             // quarter-note beats per minute
  meter: 4,               // optional, quarter notes per bar (default 4) – used by `|`
  intro: { ... },         // optional: played once before the body
  body: {                 // music: loops forever after the intro; jingles: played once
    p1: `...`,            // pulse 1 – lead melody
    p2: `...`,            // pulse 2 – harmony / counter-melody / arpeggios
    tri: `...`,           // triangle – bass
    noise: `...`,         // drums
  },
};

export default track;
```

Every channel is optional (a missing channel is silent), but every track needs `p1`.

## 2. Channels and their roles

| Channel | Sound | Typical role | Defaults |
|---|---|---|---|
| `p1` | pulse wave | lead melody | `o4 l4 v12 @0 w50 ~0 q7 k0` |
| `p2` | pulse wave | harmony a 3rd/6th below, counter-melody, arpeggios, off-beat stabs | `o4 l4 v12 @0 w50 ~0 q7 k0` |
| `tri` | triangle | bass line (roots, octave jumps, walking, gallops) | `o3 l4 v15 @0 q7 k0` |
| `noise` | noise kit | drums (kick, snare, hats, …) | `l8 v12` |

Each channel is **monophonic** (one note at a time) – chords are implied by the three tonal
channels together or by arpeggios. Mix guide: lead `v11`–`v12`, p2 `v6`–`v9` (2–5 below
the lead), triangle `v15` (it is naturally soft), drums `v10`–`v12` (`v6`–`v8` for calm
pieces).

**Every section (intro, body) and every channel string starts from the defaults above.**
Nothing carries over from the intro into the body, so start each string with the settings
you need (e.g. `@1 w12 v7 o4 l8`).

## 3. Time

The grid is 48 ticks per quarter note (192 per 4/4 bar). A length number `n` means
"1/n of a whole note":

| Length | Name | Ticks | | Length | Name | Ticks |
|---|---|---|---|---|---|---|
| `1` | whole | 192 | | `3` | half-note triplet | 64 |
| `2` | half | 96 | | `6` | quarter triplet | 32 |
| `4` | quarter | 48 | | `12` | eighth triplet | 16 |
| `8` | eighth | 24 | | `24` | 16th triplet | 8 |
| `16` | sixteenth | 12 | | `48` | 32nd triplet | 4 |
| `32` | 32nd | 6 | | | | |

A dot adds half the value, each further dot half of that: `4.` = 72, `8.` = 36, `2..` = 168.
Three `12`s fill one quarter: `l12 c d e` = 48 ticks.

## 4. Syntax

Whitespace and line breaks are ignored. Write one or two bars per line and put `|` at
every bar line.

| Write | Meaning | Example |
|---|---|---|
| `c d e f g a b` | note in the current octave, optional length and dots | `c4` `e8.` `g` |
| `+` or `#` / `-` after a note | sharp / flat (may repeat) | `f+8` `b-4` `c#2` |
| `r` | rest, optional length | `r4` `r8.` |
| `^` | tie: extends the previous note (or rest) by a length | `c2^8` `g4 ^4` |
| `o0`…`o8` | set octave. `o4 c` is middle C, `o4 a` is 440 Hz | `o5` |
| `>` / `<` | octave up / down | `c e g > c` |
| `l` | default length for notes without a number (dots allowed) | `l8` `l16` `l8.` |
| `v0`…`v15` | volume | `v12` |
| `@0`…`@6` | instrument (envelope), see §5 | `@1` |
| `w12` `w25` `w50` | pulse duty 12.5 % / 25 % / 50 % (`p1`/`p2` only) | `w25` |
| `~0`…`~3` | vibrato off / light / medium / wide | `~1` |
| `q1`…`q8` | gate: the note sounds for q/8 of its length (`q8` legato, `q4` staccato) | `q6` |
| `k-24`…`k24` | transpose following notes by semitones (`k0` = off) | `k-2` |
| `[ ... ]n` | repeat n times (default 2), nestable | `[c d e f]4` |
| `[ A : B ]n` | `B` is skipped on the last pass → A B A B … A | `[c d : e f]3` |
| `\|` | bar line, **checked**: must fall exactly on a bar boundary | `c2 g2 \| a1` |
| `;` | comment until the end of the line | `; B section` |

Notes:

- Octave changes (`>`, `<`, `o`) apply until changed again – also inside and after repeats.
  Every pass of a repeat continues with the state the previous pass ended with, so keep
  `>` and `<` balanced inside a repeat, or start the repeated phrase with an explicit `o`.
- `^` can follow a bar line: `e2. g4 | ^2 r2` holds the `g` across the bar line.
- `[X : Y]2 Z` is the classic first/second ending: X Y X Z.
- Errors name the track, section, channel and position, e.g.
  `music route body.p1 (line 3, col 41): bar line 1.5 beats into bar 7 (72 ticks): notes before it are too long or too short`.

### Drums (`noise` channel only)

On the noise channel letters are drum hits instead of notes; length, dots, `^`, `r`, `l`,
`v`, repeats, `:` , `|` and `;` work as above. The length is the time until the next hit;
each drum has its own fixed decay.

| Letter | Drum | Character |
|---|---|---|
| `k` | kick | pitched thump (triangle sweep + click) |
| `s` | snare | bright noise burst with a tonal body |
| `h` | closed hi-hat | very short, high |
| `o` | open hi-hat | longer, high |
| `c` | crash | long noise wash – section starts, final hits |
| `t` | tom | pitched triangle drop – fills |
| `x` | click | short metallic tick (rim / woodblock) – calm pieces |

One hit at a time: write a crash instead of the kick on a downbeat (`c h s h …`).
Basic grooves: `l8 k h s h k k s h` (rock), `l8 k8 h16 h16 s8 h8 k8 k8 s8 h8` (driving),
`k4 h8 h8 x4 h8 h8` (soft), fill: `k h s h l16 s s t t t t s s l8`.

## 5. Instruments, duty, vibrato

Instruments are volume envelopes (attack, decay, sustain level, release). They work on all
three tonal channels.

| `@` | Name | A / D / S / R | Use for |
|---|---|---|---|
| `@0` | lead | 6 ms / 150 ms / 70 % / 50 ms | melodies (default) |
| `@1` | pluck | 2 ms / 400 ms / 0 / 30 ms | arpeggios, broken chords, stabs |
| `@2` | soft | 50 ms / 250 ms / 80 % / 150 ms | harmony voices, gentle melodies |
| `@3` | blip | 2 ms / 70 ms / 15 % / 20 ms | very short, percussive notes |
| `@4` | swell | 350 ms / 0 / 100 % / 250 ms | slow fade-in pads, drones |
| `@5` | bell | 2 ms / 1.2 s / 0 / 500 ms | chimes, music box, jingles |
| `@6` | flat | 4 ms / 0 / 100 % / 20 ms | organ-like constant tone; bass |

Duty (pulse channels): `w50` round and full (lead), `w25` brighter, nasal (lead or
harmony), `w12` thin and buzzy (arpeggios, background). Using different duties on `p1` and
`p2` keeps them apart in the mix.

Vibrato fades in after the note started, so only long notes wobble: `~1` 12 cents (subtle
lead), `~2` 25 cents (expressive lead), `~3` 50 cents (eerie / dramatic).

Gate (`q`) shapes the articulation: `q7` (default) leaves a tiny gap, `q8` connects notes,
`q4`–`q6` for bouncy bass and staccato stabs.

## 6. Ranges

| Channel | Allowed (checked by the test) | Sweet spot |
|---|---|---|
| `p1` | `o2 c` … `o7 c` | melody `o4 g` … `o6 e` |
| `p2` | `o2 c` … `o7 c` | `o3 g` … `o5 g`, usually below `p1` |
| `tri` | `o1 c` … `o6 c` | bass roots `o1 a` … `o2 g`, octave jumps up to `o3` |

## 7. Intro, loop, jingles – how playback works

- **Music** plays the `intro` once, then the `body` loops forever without a gap. Make the
  last bar of the body lead back into its first bar (e.g. end on the dominant, or with a
  pickup that resolves into bar 1).
- **Jingles** play `intro` + `body` once. Keep them 1.5–5 s (hard limit 8 s); no `|`
  needed if a jingle ends on half a bar.
- Switching tracks fades the old one out over 0.3 s while the new one starts right away.
  Requesting the track that is already playing does nothing.
- A jingle pauses the music; when it ends, the music **resumes from the paused position**
  with a 0.5 s fade-in.
- Every channel of a section must have the **same length**, and a music body must be a
  whole number of bars – otherwise the channels drift apart on every loop. The test reports
  each channel's length in bars.

## 8. Reusing phrases

Tracks are TypeScript, so phrases can be constants and helpers (see `music-route.ts`,
`music-battle_wild.ts`, `music-battle_trainer.ts`):

```ts
const A = `o5 d8. d16 f8 a8 ^4 g8 f8 | ...`;           // start phrases with an explicit octave
const gallop = (n: string) => `[${n}8 ${n}16 ${n}16]4`;  // one bar of galloping bass
body: {
  p1: `@0 w50 v12 ${A} w25 ${B} w50 ${A}`,
  tri: `@6 q6 o2 ${gallop('d')} | ${gallop('c')} | ...`,
}
```

## 9. A complete small example

```ts
const track: TrackDef = {
  title: 'Beispiel',
  tempo: 120,
  intro: {
    p1: `@0 w50 v12 o5 l8 c r c r e r g4`,                  // 1 bar
    tri: `@6 o2 l8 c r c r c r c4`,
  },
  body: {
    // C | Am | F | G  – melody, harmony mostly a third below, bouncing bass, simple beat
    p1: `@0 w50 v12 ~1 o5 e4. d8 c4 g4 | a2 e4 c4 | f4. e8 d4 a4 | g2. r4 |`,
    p2: `@2 w25 v8 o5 c4. < b8 a4 > e4 | e2 c4 < a4 | a4. > c8 < a4 > f4 | < b2. r4 |`,
    tri: `@6 q6 o2 l8 [c > c <]4 | o1 [a > a <]4 | o2 [f > f <]4 | [g > g <]4 |`,
    noise: `l8 [k h s h k k s h]3 | k h s h l16 s s s s t t t t |`,
  },
};
```

## 10. Composer checklist

1. `npx vitest run tests/audio.test.ts` passes (parsing, equal channel lengths, whole-bar
   loop, ranges, tempo 50–220, jingles ≤ 8 s).
2. `|` after every bar in every channel – the bar check finds wrong lengths immediately.
3. One key per section; write down the chord per bar in the file comment and keep `p2` and
   `tri` on chord tones on strong beats. Watch accidentals (`f+` in G major, `b-` in F).
4. `p2` sits below `p1` (or clearly above as a descant), 2–5 volume steps quieter; avoid
   both pulses holding the same note.
5. Bass on roots/fifths on beat 1, octave jumps or walking lines in between; triangle in
   `o1`–`o2` for roots.
6. Loop seam: the last bar flows into bar 1 (dominant → tonic, pickup notes), drums fill
   in the last bar.
7. Mood/tempo fit the place (table below); melodies are singable, with a recognizable
   rhythmic motif that returns.
8. 16–48 bars for location and battle themes, 4–16 for victory loops.
9. Everything original.

## 11. Track list

Composed: `title`, `home`, `route`, `battle_wild`, `battle_trainer` and all jingles.
All other music files are 4-bar placeholders marked `PLACEHOLDER` (their comment lists
the suggested mood, key and chords).

| Id | Plays at | Suggested mood / tempo |
|---|---|---|
| `title` | title screen | heroic alpine, D major, 128 |
| `intro` | Professorin Arven's introduction | calm, warm, ~96 |
| `home` | player's house | cozy lullaby, F major, 92 |
| `town` | Moosbach and small villages | cheerful, ~112 |
| `city` | Kieselstadt, Seewil, Funkenstadt | busy, confident, ~120 |
| `route` | Pfad 1–3 | bright walking theme, G major, 140 |
| `route_mountain` | Pfad 4, Gipfelpfad | windy, modal (dorian), ~128 |
| `forest` | Flüsterwald | mysterious, minor, ~100 |
| `cave` | Glimmerhöhle | dark, sparse, echoing, ~80 |
| `lab` | Professorin's lab | curious, bouncy, ~104 |
| `center` | Heilstation | gentle, soothing, ~92 |
| `hall` | Halle (badge buildings) | determined, minor, ~140 |
| `villain` | Frostmantel scenes | ominous march, ~132 |
| `rival` | rival appears | cocky, upbeat, ~150 |
| `battle_wild` | wild battle | driving E minor, 168 |
| `battle_trainer` | trainer battle | fast D minor, 176 |
| `battle_leader` | Hüter/Hüterin battle | intense, ~172 |
| `battle_rival` | rival battle | personal, energetic, ~170 |
| `battle_boss` | Frostmantel boss | dark, relentless, ~180 |
| `battle_legend` | legendary Wildling | epic, grand, ~150 |
| `victory_wild` / `victory_trainer` / `victory_leader` | after winning (loops) | triumphant, short loop, 132–140 |
| `summit` | Gipfelhorn | majestic, ~116 |
| `credits` | ending credits | warm, nostalgic, ~110 |
| `evolution` | evolution scene (loops until done) | suspenseful, rising, ~120 |

| Jingle | When | Length |
|---|---|---|
| `heal` | healing at a Heilstation / at home | ~3.4 s |
| `level_up` | a Wildling reaches a new level | ~1.5 s |
| `caught` | capture succeeded | ~3.2 s |
| `badge` | receiving an Abzeichen | ~5 s |
| `item` | receiving an item | ~2.4 s |
| `evolved` | evolution finished | ~3.3 s |
| `fanfare` | important story moments (e.g. receiving the starter) | ~3.6 s |
