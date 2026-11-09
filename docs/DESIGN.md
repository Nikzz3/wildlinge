# WILDLINGE – Alpenglühen

An original monster-collecting RPG in the style of 2000s handheld games, rendered at
240×160 pixels, shipped as an Electron desktop app. All game text is **German**; all
code identifiers, ids and comments are **English**.

## Originality rule (hard requirement)

This is our own game in the genre, not a copy of any existing one.

- No names, creatures, characters, places, items, music, or text from Pokémon (or other
  existing franchises). No "-mon" suffixes. No near-misses of existing creature names.
- Avoid franchise-specific terms: say *Wildling* (creature), *Fangkristall* (capture item),
  *Lexikon* (creature index), *Halle* + *Hüter/Hüterin* (badge leaders), *Abzeichen*
  (badges), *Heilstation* (healing building), *Laden* (shop).
- Stat labels: `LP` (HP), `ANG`, `VER`, `MAG`, `RES`, `TEM` (speed); move charges `EN`;
  experience `ERF`. Currency: `Fr.` (e.g. `1200 Fr.`).
- Pixel art, melodies and maps are created from scratch in this repo.

## Setting

Region **Alvenland**: alpine valleys, lakes, forests, glaciers. At the top of the
mountain **Gipfelhorn** burns the *Alpenglut*, an eternal glow kept alive by a
legendary Wildling. The villain group **Frostmantel** wants to extinguish it to cast
the land into an endless winter. The player (named by the player), their rival (named
by the player, default `Lio`) and **Professorin Arven** (Moosbach lab) start the story.

Progression: Moosbach → Pfad 1 → Kieselstadt (Halle 1, Erde) → Pfad 2 → Flüsterwald →
Seewil (Halle 2, Wasser) → Pfad 3 → Glimmerhöhle → Funkenstadt (Halle 3, Blitz) →
Pfad 4 → Frostalp (Halle 4, Frost) → Gipfelpfad → Gipfelhorn (Frostmantel boss, final
rival battle, legendary Wildling) → credits. Details live in `docs/WORLD.md`.

Target length: about 1.5–2 hours. Level curve: see below.

## Level curve

**EXP** (`src/battle/logic/calc.ts`): a defeated foe gives `baseExp × min(level, 9) / 3.5` ERF, ×1.5 from a
trainer, the full amount to every participant; medium growth needs `L³` in total. Foes count as at most Lv 9 – the
highest level beaten before Hüter Jost, so chapter 1 levels fast and is unaffected. After that the EXP per foe only
grows with evolved species (higher `baseExp`) while every level costs more, so the long later chapters cannot run
away. It also decouples the levers: **the number of battles sets the player's level, enemy levels set the difficulty.**

**The normal player** (`scripts/lib/sim.ts`; also the player of the e2e playthroughs 50–53, `scripts/lib/playthrough.mjs`): the starter leads
every fight, about 8 wild battles per stretch, every trainer; a catch on Pfad 1 and in the Flüsterwald, then one fresh
catch per area from Pfad 3 on (the weakest goes to the box), the gifts (Matti's starter, Guggerli); Heilstation when
someone faints, heal items and Lebensfunken in battle, full heal + Laden before each Halle battle, rested before Bise
and Eisner. The catches trail the starter by 4–15 levels, so every story fight is mostly the starter against a whole
team: it needs a few levels on the ace. A player who levels the team evenly is lower but has real backup.

| stretch | wild Lv | trainers | story fight (ace in bold) | starter Lv there | 1st-try win % plant/fire/water |
|---|---|---|---|---|---|
| Labor, Pfad 1 | 2–4 | 3–6 | rival 1: **5** | 5 | 77 / 77 / 77 |
| Halle 1 | – | 8–9 | Jost 10, 11, **12** | 12 | 76 / 62 / 82 |
| Pfad 2 | 6–10 | 9–12 | – | 14–17 | ≥ 95 |
| Flüsterwald | 9–13 | 11–14 | rival 2: 11–12, **13–14** | 17 | 69 / 72 / 82 |
| Halle 2 (reeds 12–15) | – | 14–15 | Undine 15, 15, **17** | 22 | 68 / 61 / 68 |
| Pfad 3 | 18–22 | 17–19 | – | 23–25 | ≥ 98 |
| Glimmerhöhle | 20–25 | 20–21 | – | 25–27 | ≥ 99 |
| Funkenwerk | – | 22–23 | Bise 21, 24, **25** | 27–28 | 73 / 86 / 93 |
| Halle 3 (outskirts 22–25) | – | 21–23 | Zita 23, 24, **25** | 29 | 98 / 90 / 55 |
| Pfad 4 | 27–31 | 26–28 | – | 30–31 | ≥ 93 |
| Frostalp (snow grass 30–33) | – | – | rival 3: 23–27, **25–28** | 32 | 68 / 71 / 73 |
| Halle 4 | – | 26–28 | Firna 27, 28, 29, **31** | 33–34 | 65 / 96 / 68 |
| Gipfelpfad | 33–37 | 30–32 | Bise 32, 33, **34** | 36–37 | 79 / 98 / 61 |
| Gipfelhorn | – | – | Eisner 33, 34, 34, **35** | 36–38 | 64 / 86 / 50 |
| | | | rival 4: 29–33, **33–34** (after the flame heals) | 37–39 | 61 / 62 / 65 |
| | | | Lindglut **40** (wild) | 38–40 | defeated 66 / 86 / 72 |

Targets (first attempt): route trainers and grunts ≥ 90 %, rivals 65–80 %, Hüter and Bise 65–85 %, Eisner and the
final rival 60–80 %; the starter with the type disadvantage may dip to ~50–55 % (water against Zita's sparks and
Eisner's frost), the advantaged one may go above (fire against the frost finale). Rival parties are tuned per rival
starter (`RIVAL3`, `RIVAL4` in `src/data/trainers.ts`). Lindglut has catch rate 8: the Urkristall always works, and
a determined player can also catch it with Gipfelkristallen at low LP (best while it sleeps).

The e2e playthroughs add what the sim leaves out: money (a blackout halves it), so a lost boss fight is retried
after the Heilstation and the Laden while the money lasts; after a lost summit fight the player trains in the
Gipfelpfad snow grass (counted as "extra training" in the output of `53-chapter4-full.mjs`).

Check with `npx tsx scripts/balance-ch1.ts` … `balance-ch4.ts` (each plays the story up to its chapter; the table
above is from 400 runs) and `npx tsx scripts/balance-at.ts <trainerId> <level> [backups]` for a single fight.

## Tech

- TypeScript (strict), bundled with esbuild (`scripts/build.mjs`) into `dist/`.
- Electron shell: `electron/main.cjs` + `electron/preload.cjs` (save file in userData).
  The renderer is a plain web page and also runs in a normal browser (localStorage save).
- Rendering: one 240×160 canvas, scaled with integer factors and `image-rendering: pixelated`.
- Audio: Web Audio API chiptune synth (pulse / triangle / noise), all music composed in code.
- Tests: Vitest (`npm test`) for pure logic and data validation; Playwright e2e
  (`npm run e2e`) drives the built game in headless Chromium through the debug API.
- `npm run sheets` renders all art to PNG sprite sheets in `out/sheets/` for visual review.

## Architecture

```
src/
  core/          contracts shared by everyone (types.ts, contracts.ts, bitmap.ts, rng.ts, tiles-meta.ts)
  engine/        game loop, scene stack, input, Gfx, text, UI components + modal helpers, storage, debug API
  art/           all pixel art as code: font, ui icons, tiles, buildings, characters, creatures
  audio/         synth, music tracks, jingles, sfx, creature cries
  data/          type chart, moves, species, items, trainers + lookup helpers (data/index.ts)
  creature/      pure creature helpers: stats, exp, learnsets, evolution, item effects
  state/         pure SaveData helpers: bag, party, box, dex, flags, badges, money, new game
  battle/        engine.ts (pure turn logic, events) + scene.ts (battle UI) + index.ts (startBattle)
  overworld/     map runtime, movement, NPCs, camera, warps, encounters, trainers, script runner
  world/         map definitions per area + templates for standard interiors
  ui/screens/    start menu, party, summary, bag, Lexikon, shop, PC box, name entry, options, save, trainer card
  scenes/        title, intro, evolution, credits
  main.ts        bootstrap
```

### Contracts

`src/core/*` is the contract between modules. **Do not change files in `src/core/` unless
your task explicitly owns them.** If you truly need a contract change, make the smallest
additive change (new optional field / new union member), keep everything compiling, and
note it in `docs/CHANGELOG-CONTRACTS.md`.

Module entry points (`src/*/index.ts`) start as typed stubs. The owning agent replaces the
body but keeps the exported signatures; other modules import only from these entry points
(or from `src/core`).

### Key flows

- `main.ts` → `createGame()` → title scene. *Neues Spiel* → `runIntro(g)` → `g.reset(createOverworld(g))`.
  *Weiter* → load save → overworld.
- The scene stack renders from the top-most non-overlay scene upward; only the top scene
  gets `update()`. Modal UI is opened with `g.open(close => scene)` which returns a promise.
- World logic is written as async scripts: `async (ctx: ScriptContext) => { await ctx.say('…') }`.
- Battles: `startBattle(g, setup)` pushes the battle scene, which drives the pure
  `BattleEngine` (`createBattle`) and animates its `BattleEvent`s. It resolves with the
  outcome after rewards, catching (party/box + Lexikon + nickname) and evolutions.
  On `'lose'` the caller (overworld) performs the blackout (warp to `state.lastHeal`,
  heal party, lose half the money), unless `allowLoss` was set.

### Screen layout conventions (240×160)

- Dialog box: x=0, y=112, w=240, h=48, 2 text lines (line height 16, text inset 10px).
- Overworld: 16×16 tiles, 15×10 visible. Camera centers on the player (player drawn at
  screen pixel 112,72). Outside-map area shows the map's `border` tile.
- Battle: enemy creature (48×48 front sprite) top-right on a platform, enemy HUD top-left;
  player creature (64×64 back sprite) bottom-left, player HUD right; text/command box
  bottom 48px.

### Input

Arrows/WASD = d-pad, `Z`/`Space`/`J` = A (confirm/interact), `X`/`Backspace`/`K`/`Esc` = B
(cancel; hold to run), `Enter` = START (menu), `Shift`/`Tab` = SELECT.

### Determinism & testing

All randomness goes through `g.rng` (seeded). URL params: `?test=1` (fixed seed, instant
text, short transitions), `?manual=1` (no rAF loop; frames advanced via the debug API).
The debug API is `window.__game` (see `src/engine/debug.ts`).

## Visual style guide

- Bright, saturated handheld palette; 1px dark outlines on characters, creatures and UI
  icons (outline = darkened version of the fill hue, not pure black); tiles mostly without
  outlines but with 2–3 tone texture. Light source top-left.
- UI windows: off-white fill `#f8f8f0`, frame in deep teal `#285860` with a light inner
  line `#88c0b8`, 2px rounded corners. Text `#383838` with shadow `#d0d0c8` on light
  windows; white text with shadow `#203038` on dark windows.
- Overworld characters: 16×16, 4 directions, 3 frames (stand, step A, step B).
- Creatures: front 48×48, back 64×64, icon 24×24, rendered from a resolution-independent
  shape description (see `src/art/shapes.ts`).

## Coding conventions

- TypeScript strict, no `any`, no non-null assertions on data lookups without a reason.
- Keep it simple. Pure logic (battle, creature, state, data) has no DOM access and is unit tested.
- German UI strings directly in code. Use `{PLAYER}` / `{RIVAL}` placeholders in messages
  (the message box substitutes them).
- Files you do not own: read them, don't edit them. If you find a bug in someone else's
  file, describe it in your final report instead of fixing it (unless told otherwise).
