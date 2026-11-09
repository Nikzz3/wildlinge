# WILDLINGE – World, Story & Map Spec (Alvenland)

This is the build spec for the four map areas. Four agents build one AREA each in parallel
(`src/world/area1.ts` … `area4.ts`), so everything that two areas share is fixed here.

**Binding vs. free:**

- **Binding** (never change without updating this file): map ids, map sizes marked *(binding)*,
  every edge connection (path range + offset), story flags, trainer ids, item/flag names,
  gate conditions, interior arrival/exit rules.
- **Free** (area builder decides): exact tile layout, building positions, NPC coordinates,
  dialogue wording of plain NPCs (keep the meaning), decoration. Sizes not marked *(binding)*
  may change by a few tiles if both sides of every in-area connection still match.

Data you use (all in `src/data/`, ids are binding):

| file | what |
|---|---|
| `trainers.ts` | `TRAINERS` (every trainer), `rivalTrainerId(battle, starter)`, `RIVAL_STARTER`, `LEFTOVER_STARTER` |
| `encounters.ts` | `ENCOUNTERS[mapId]` → `{ grass?, cave? }` → use as `encounters: ENCOUNTERS['pfad_1']` |
| `shops.ts` | `SHOPS[townMapId]` → item ids for `makeShop({ shopItems })` |
| `badges.ts` | `BADGES` (id, German name, leader trainer id, town) |
| `index.ts` | `getTrainer(id)` for intro/after lines in scripts |

`src/data/index.ts` does not re-export the helpers above; import them from their files
(`import { rivalTrainerId } from '../data/trainers'`).

---

## 1. Overview

### 1.1 Region and main path

```
                                   ★ GIPFELHORN  (summit: Alpenglut, boss, rival 4, Lindglut)
                                   │
                                   GIPFELPFAD    (snowy mountain path, Frostmantel, Bise 2)
                                   │
                                   FROSTALP      [Halle 4 Frost]   rival 3 at the entrance
                                   │
                                   PFAD 4        (mountain route, grass → snow)
                                   │
                                   FUNKENSTADT   [Halle 3 Blitz]   Funkenwerk (Bise 1)
                                   ╎ cave mouth (warp)
                                   GLIMMERHÖHLE 2
                                   ╎ passage (warp)
                                   GLIMMERHÖHLE 1
                                   ╎ cave mouth (warp)
                                   PFAD 3        (lake shore → cliffs)
                                   │
                                   SEEWIL        [Halle 2 Wasser]  (~ lake ~)
                                   │
                                   FLÜSTERWALD   (first Frostmantel)
                                   │ west entrance (rival 2)
     KIESELSTADT ──── PFAD 2 ──────┘
     [Halle 1 Erde]
          │
        PFAD 1
          │
       MOOSBACH  (start: home, rival's house, Arven's lab – rival 1)
```

`│ ─` = edge connection, `╎` = warp (cave entrance). Main path:
Moosbach → Pfad 1 → Kieselstadt → Pfad 2 → Flüsterwald → Seewil → Pfad 3 → Glimmerhöhle 1 → 2 →
Funkenstadt → Pfad 4 → Frostalp → Gipfelpfad → Gipfelhorn → credits.

### 1.2 All maps

| area | id | name (popup) | kind | music | battleBg | size w×h | border |
|---|---|---|---|---|---|---|---|
| 1 | `moosbach` | Moosbach | town | home | grass | 20×18 | tree |
| 1 | `player_house` | Moosbach | indoor | home | indoor | 10×8 | void |
| 1 | `rival_house` | Moosbach | indoor | home | indoor | 10×8 | void |
| 1 | `arven_lab` | Moosbach | indoor | lab | indoor | 12×10 | void |
| 1 | `pfad_1` | Pfad 1 | route | route | grass | 20×40 | tree |
| 1 | `kieselstadt` | Kieselstadt | town | town | grass | **24×22 (binding)** | tree |
| 1 | `kiesel_center` | Kieselstadt | indoor | center | indoor | 11×9 (template) | void |
| 1 | `kiesel_shop` | Kieselstadt | indoor | center | indoor | 10×9 (template) | void |
| 1 | `kiesel_hall` | Kieselstadt | indoor | hall | hall | 11×14 | void |
| 1 | `kiesel_house_1` | Kieselstadt | indoor | home | indoor | 10×8 (template) | void |
| 1 | `kiesel_house_2` | Kieselstadt | indoor | home | indoor | 10×8 (template) | void |
| 2 | `pfad_2` | Pfad 2 | route | route | grass | **40×20 (binding)** | tree |
| 2 | `fluesterwald` | Flüsterwald | route | forest | forest | 30×30 | tree |
| 2 | `seewil` | Seewil | town | town | water | **26×22 (binding)** | tree |
| 2 | `seewil_center` | Seewil | indoor | center | indoor | 11×9 (template) | void |
| 2 | `seewil_shop` | Seewil | indoor | center | indoor | 10×9 (template) | void |
| 2 | `seewil_hall` | Seewil | indoor | hall | hall | 12×16 | void |
| 2 | `seewil_house_1` | Seewil | indoor | home | indoor | 10×8 (template) | void |
| 2 | `seewil_house_2` | Seewil | indoor | home | indoor | 10×8 (template) | void |
| 3 | `pfad_3` | Pfad 3 | route | route | grass | **20×44 (binding)** | tree |
| 3 | `glimmerhoehle_1` | Glimmerhöhle | cave | cave | cave | 28×24 | cave_wall |
| 3 | `glimmerhoehle_2` | Glimmerhöhle | cave | cave | cave | 24×24 | cave_wall |
| 3 | `funkenstadt` | Funkenstadt | town | city | grass | **28×24 (binding)** | tree |
| 3 | `funken_center` | Funkenstadt | indoor | center | indoor | 11×9 (template) | void |
| 3 | `funken_shop` | Funkenstadt | indoor | center | indoor | 10×9 (template) | void |
| 3 | `funken_hall` | Funkenstadt | indoor | hall | hall | 12×16 | void |
| 3 | `funken_werk` | Funkenstadt | indoor | villain | indoor | 12×10 | void |
| 3 | `funken_house_1` | Funkenstadt | indoor | home | indoor | 10×8 (template) | void |
| 4 | `pfad_4` | Pfad 4 | route | route_mountain | grass | **20×48 (binding)** | tree |
| 4 | `frostalp` | Frostalp | town | town | snow | 24×22 | tree |
| 4 | `frostalp_center` | Frostalp | indoor | center | indoor | 11×9 (template) | void |
| 4 | `frostalp_shop` | Frostalp | indoor | center | indoor | 10×9 (template) | void |
| 4 | `frostalp_hall` | Frostalp | indoor | hall | hall | 12×16 | void |
| 4 | `frostalp_house_1` | Frostalp | indoor | home | indoor | 10×8 (template) | void |
| 4 | `frostalp_house_2` | Frostalp | indoor | home | indoor | 10×8 (template) | void |
| 4 | `gipfelpfad` | Gipfelpfad | route | route_mountain | snow | 22×50 | cliff |
| 4 | `gipfelhorn` | Gipfelhorn | route | summit | summit | 20×20 | cliff |

Snowy outdoor maps (`frostalp`, `gipfelpfad`, `gipfelhorn`) use `baseTile: 'snow'`; caves use
`baseTile: 'cave_floor'`. Interior `name` is the town name (it becomes "met at").

### 1.3 Badges, leaders, level curve

| # | badge id (state.badges) | name | leader trainer | Halle | type | leader Lv | after-badge gift |
|---|---|---|---|---|---|---|---|
| 0 | `badge_earth` | Felsabzeichen | `leader_jost` (Hüter Jost) | `kiesel_hall` | Erde | 10–12 | 2× `super_potion` |
| 1 | `badge_water` | Wellenabzeichen | `leader_undine` (Hüterin Undine) | `seewil_hall` | Wasser | 16–18 | 2× `revive` |
| 2 | `badge_spark` | Funkenabzeichen | `leader_zita` (Hüterin Zita) | `funken_hall` | Blitz | 22–25 | 2× `ether` |
| 3 | `badge_frost` | Firnabzeichen | `leader_firna` (Hüterin Firna) | `frostalp_hall` | Frost | 28–31 | 2× `full_potion` |

Wild/trainer levels per map: the balanced table (wild Lv, trainers, story fights, the starter's level there) is the
"Level curve" in `docs/DESIGN.md`; data in `src/data/encounters.ts` and `src/data/trainers.ts`. Lindglut is Lv 40.

### 1.4 Naming conventions

- **Map ids, NPC ids, flags, trainer ids:** lowercase `snake_case`.
- **Story flags** (`ctx.setFlag('got_starter')`): plain snake_case, full list in §4.
- **Badges are not flags:** check `s.badges.includes('badge_earth')`; give with
  `ctx.giveBadge(b.id, b.name)` using `BADGES`.
- **Trainer defeated:** the engine sets `trainer:<trainerId>` on a win (never set it by hand).
- **Visible items:** flag `item:<mapId>:<itemId>`; a second copy of the same item on the same
  map gets `item:<mapId>:<itemId>_2`. **Hidden items:** `hidden:<mapId>:<itemId>` (same suffix rule).
- **One-time gifts from NPCs:** `gift_<what>` (listed per map below).
- **Game text characters:** the font has ASCII, `ÄÖÜäöüßé`, `– … „ “ ‚ ‘ ’ × ♪`, but no `·` or `—`
  (the `·` in this file is only a separator, not game text). `{PLAYER}`/`{RIVAL}` work in
  messages and sign texts.
- **NPC id of a trainer NPC:** the trainer id (e.g. NPC `pfad1_beni` with `trainer: { id: 'pfad1_beni', sight: 3 }`).
  The NPC sprite must equal the trainer's `sprite`.

### 1.5 Script patterns (use these so all areas behave the same)

**Plain trainer** – NPC with `trainer: { id, sight }`. The engine shows `intro`, battles, and shows
`after` when talked to later. Sight 3–4 on routes, 3 in Hallen.

**Leader** – *no* `trainer` field (the engine would battle without giving the badge). Use onTalk:

```ts
onTalk: async (ctx) => {
  const t = getTrainer('leader_jost');
  const badge = BADGES[0]!;
  if (ctx.state.badges.includes(badge.id)) return ctx.say(t.after);
  await ctx.say(t.intro);
  if (!(await ctx.battle(t.id))) return; // a loss blacks out and aborts the script anyway
  await ctx.say('Hier, das hast du dir verdient!');
  await ctx.giveBadge(badge.id, badge.name);
  await ctx.giveItem('super_potion', 2);
  await ctx.say(t.after);
},
```

**Scripted battle** (rivals, blockade grunts, Bise, Eisner): `ctx.battle()` does *not* show the
intro – say `getTrainer(id).intro` yourself first. Play `ctx.playMusic('villain')` when Frostmantel
shows up and `ctx.playMusic('rival')` when the rival shows up (map music resumes after battles).

**Rival id:** `rivalTrainerId('rival2', ctx.state.starter)` → e.g. `rival2_zuendli`. Rule: the rival
takes the starter that beats the player's (Sprössli → rival Zündli, Zündli → rival Biberli,
Biberli → rival Sprössli). Trainer ids are `<battle>_<rivalStarterSpeciesId>` for battle ∈
`rival1`…`rival4`.

**Gate guard** (badge or story gate on a wide path): a guard NPC stands *beside* the path
(not on it); a trigger strip across the path pushes the player back:

```ts
triggers: [{
  x: 12, y: 2, w: 3, when: (s) => !s.badges.includes('badge_water'),
  script: async (ctx) => { ctx.npcFacePlayer('guard_north'); await ctx.say('…'); await ctx.movePlayer('D'); },
}],
```

**Blockade NPC** (narrow pass): the NPC stands on a 1-tile gap, `visible: (s) => !s.flags['<flag>']`.
Start the scene from its `onTalk` *and* from a trigger on the tile in front of it (same script),
then `ctx.setFlag(flag)` and `ctx.refreshNpcs()` after the win.

---

## 2. Areas

### AREA 1 – Moosbach, Pfad 1, Kieselstadt

#### `moosbach` – Moosbach (town, home, grass, 20×18, border tree)

- **Connections:** `up → { map: 'pfad_1', offset: 0 }`. North edge (y = 0) walkable only at
  x = 9..10 (path). All other edges solid (trees; a small pond with reeds in the south-east).
- **Buildings:**
  - player house: `house_red`, ~5×3, door → `player_house` at `HOUSE_ARRIVAL` (4, 6).
  - rival house: `house_blue`, ~5×3, door → `rival_house` at (4, 6).
  - Arven's lab: `lab`, ~7×4, door → `arven_lab` at (6, 8).
- **NPCs:**
  - `kid_north` (kid) beside the north path: after `got_starter`: "Pfad 1 führt nach Kieselstadt.
    Im hohen Gras wohnen wilde Wildlinge!"
  - `woman` (woman, wander): "Moosbach ist klein, aber hier wächst das weichste Moos im ganzen Tal."
  - `oldman` (oldman, turn) by the pond: "Siehst du den Gipfel dort oben? Dort brennt die Alpenglut.
    Ohne sie hätten wir ewigen Winter."
- **Trigger (gate):** strip `{ x: 9, y: 2, w: 2 }`, when `!got_starter`: `kid_north` emote `exclaim`,
  "Halt! Ohne eigenen Wildling ins hohe Gras? Viel zu gefährlich!\fGeh erst zu Professorin Arven
  ins Labor." → `movePlayer('D')`.
- **Signs:** town sign: "MOOSBACH\nWo der Morgentau am längsten bleibt." · lab: "LABOR VON
  PROFESSORIN ARVEN\nWildlingforschung und Arventee" · player house: "Hier wohnt {PLAYER}." ·
  rival house: "Hier wohnt {RIVAL}."
- **Hidden:** `potion` (`hidden:moosbach:potion`) in a flower corner.
- **Encounters:** none (no tall grass in Moosbach).

#### `player_house` – START

- `makeHouse({ id: 'player_house', name: 'Moosbach', variant: 0, exit: <tile below the door> })`.
- **START = `{ mapId: 'player_house', x: 1, y: 1, facing: 'down' }`** (next to the bed). Area 1 sets
  `src/world/start.ts`. Before any Heilstation, `lastHeal` = START (blackouts return home).
- NPC `mom` (mom) at (7, 4) facing left, onTalk:
  - before `got_starter`: "Guten Morgen, {PLAYER}! Professorin Arven hat nach dir gefragt.\fIhr
    Labor ist das große Haus mit dem flachen Dach."
  - after `got_starter`, first time (`gift_mom_potions`): "Ein eigener Wildling! Wie aufregend!\fHier,
    nimm das für unterwegs." → `giveItem('potion', 2)`.
  - every time after `got_starter`: "Ruh dich kurz aus." → `ctx.heal()` → "Pass gut auf dich auf!"

#### `rival_house`

- `makeHouse` variant 1. NPC `grandma` (oldwoman) at (7, 4): before `rival1_done`: "{RIVAL} ist
  schon vor Sonnenaufgang zum Labor gerannt. Typisch!" · after: "{RIVAL} will immer der Erste
  sein. Den Dickkopf hat er von mir!"

#### `arven_lab` – Professorin Arven's lab (indoor, lab, indoor, 12×10)

- Custom interior: tile floor, bookshelves `b` on the top wall, `lab_machine` along the side walls,
  a counter/table row in the middle. Mat `d` at (6, 9), arrival (6, 8); mat warp → moosbach tile
  below the lab door, facing down.
- **NPCs:**
  - `arven` (prof). Before `got_starter`: "Da bist du ja, {PLAYER}! Hier liegen drei Fangkristalle.
    \fIn jedem wartet ein junger Wildling. Such dir einen aus!" After `rival1_done`: "Na, wie geht
    es deinen Wildlingen? Ich päpple sie kurz auf." → `ctx.heal()` → "Kieselstadt liegt im
    Norden, hinter Pfad 1."
  - `rival` (rival) next to the crystals, `visible: !rival1_done`. Before choosing: "Ich war
    zuerst da! Aber such du ruhig zuerst aus. Ich nehm dann den Besseren."
  - `crystal_sproessli`, `crystal_zuendli`, `crystal_biberli` (sprite `crystal`) side by side on
    counter tiles (talkable across the counter), `visible: (s) => !s.flags['got_starter']`.
  - `assistant` (scientist): "Die Professorin trinkt jeden Morgen drei Tassen Arventee. Mindestens!"
- **Starter scene** (onTalk of crystal X ∈ sproessli/zuendli/biberli):
  1. "In diesem Kristall schläft {Name}, ein {Typ}-Wildling." (Sprössli/Pflanze, Zündli/Feuer,
     Biberli/Wasser) → `confirm('Möchtest du {Name} nehmen?')`; no → return.
  2. `giveCreature(X, 5, { nickname: true })`; `ctx.state.starter = X`; `setFlag('got_starter')`;
     `refreshNpcs()` (all three crystals vanish – Arven packs the others away).
  3. `playMusic('rival')`; rival: "Dann nehme ich {RivalName}! Der ist stark gegen deinen!"
     (RivalName = species name of `RIVAL_STARTER[X]`); Arven: "Den dritten Wildling bringt mein
     Kollege Matti nach Seewil."
  4. Rival: `getTrainer(id).intro`, `ctx.battle(rivalTrainerId('rival1', X), { allowLoss: true })`.
  5. Win or lose: rival: "Ich geh schon mal vor nach Kieselstadt. Bis bald, Schnecke!" → `moveNpc`
     to the mat → `setFlag('rival1_done')` → `refreshNpcs()`.
  6. Arven: "Nimm diese Fangkristalle. Damit fängst du wilde Wildlinge." → `giveItem('crystal', 5)`
     → "Im Norden liegt Kieselstadt. Dort steht die erste Halle!"

#### `pfad_1` – Pfad 1 (route, route, grass, 20×40, border tree)

- **Connections:** `down → { map: 'moosbach', offset: 0 }` (south edge y = 39, x = 9..10);
  `up → { map: 'kieselstadt', offset: 2 }` (north edge y = 0, x = 9..10).
- **Layout:** a winding path north, 3–4 tall-grass patches, a row of south-facing ledges as a
  shortcut back home, a small pond.
- **Trainers:** `pfad1_beni` (kid, sight 3, south third, by the first grass), `pfad1_lea` (girl,
  sight 4, middle), `pfad1_sepp` (hiker, sight 4, north third).
- **NPCs:** `boy_tip` (boy) near the start: "Schwäche wilde Wildlinge erst, dann wirf einen
  Fangkristall. So klappt's am besten!"
- **Items:** `potion` (`item:pfad_1:potion`), `crystal` ×2 (`item:pfad_1:crystal`, in a dead end).
  **Hidden:** `antidote` (`hidden:pfad_1:antidote`).
- **Signs:** south: "PFAD 1\nNorden: Kieselstadt / Süden: Moosbach".
- **Encounters:** `ENCOUNTERS.pfad_1`.

#### `kieselstadt` – Kieselstadt (town, town, grass, **24×22 binding**, border tree)

- **Connections:** `down → { map: 'pfad_1', offset: -2 }` (south edge y = 21, x = 11..12);
  `right → { map: 'pfad_2', offset: -2 }` – **cross-area, see §3** (east edge x = 23, y = 10..12).
- **Look:** a town built on rock: gravel paths, sand, boulders `o`, a quarry corner in the
  north-west.
- **Buildings:** `heal` ~5×4 → `kiesel_center` (5, 7) · `shop` ~4×4 → `kiesel_shop` (5, 7) ·
  `hall` ~7×5 (north centre) → `kiesel_hall` (5, 12) · `house_green` → `kiesel_house_1` (4, 6) ·
  `house_red` → `kiesel_house_2` (4, 6).
- **NPCs:**
  - `guard_east` (guard) beside the east path. Gate trigger strip `{ x: 21, y: 10, h: 3 }` when
    `!badge_earth`: "Halt! Der Weg nach Osten ist steinig und steil.\fNur wer das Felsabzeichen
    von Hüter Jost trägt, darf hier durch." → `movePlayer('L')`. After badge (talk): "Gute Reise!
    Pfad 2 führt zum Flüsterwald."
  - `worker` (man): "Kieselstadt ist auf Fels gebaut. Unsere Halle auch – und Hüter Jost sowieso."
  - `kid` (kid, wander): "Im Laden gibt's Fangkristalle! Ich spare schon seit Wochen."
  - `oldwoman` (oldwoman): "Pfad 2 im Osten führt zum Flüsterwald. Dahinter liegt Seewil am See."
- **Signs:** south entrance: "KIESELSTADT\nSteinig, stur und herzlich." · hall: "HALLE
  KIESELSTADT\nHüter: Jost – Fest wie Granit!" · east: "Osten: Pfad 2, Flüsterwald".
- **Items:** `repel` (`item:kieselstadt:repel`). **Hidden:** `candy` (`hidden:kieselstadt:candy`)
  in the quarry rocks.
- **Encounters:** none.

#### Kieselstadt interiors

- `kiesel_center` = `makeHealCenter`, `kiesel_shop` = `makeShop({ shopItems: SHOPS.kieselstadt })`.
- `kiesel_house_1` (variant 2): `collector` (oldman), gift once (`gift_kiesel_crystals`): "Ich
  sammle Steine, du sammelst Wildlinge. Hier, für deine Sammlung!" → `giveItem('crystal', 3)`.
  After: "Der schönste Stein ist der, den man selbst findet."
- `kiesel_house_2` (variant 1): `girl` (girl): "Pflanze schlägt Wasser, Wasser schlägt Feuer, Feuer
  schlägt Pflanze. Ganz einfach!" · `man` (man): "Blitze können Erde-Wildlingen gar nichts anhaben.
  Merk dir das für später!"
- `kiesel_hall` – Halle 1 (11×14, hall_floor `g`, statues `h` flanking the entrance, boulders):
  mat (5, 13), arrival (5, 12). Leader `leader_jost` (leader_earth) at the top centre (leader
  script, badge 0, gift 2× `super_potion`). Trainers `hall1_urs` (man, sight 3) and `hall1_vreni`
  (woman, sight 3) along a zig-zag path. `advisor` (man) by the entrance: "Tipp: Erde fürchtet
  Pflanzen, Wasser und Frost!\fFeuer und Blitz haben hier einen schweren Stand."

---

### AREA 2 – Pfad 2, Flüsterwald, Seewil

#### `pfad_2` – Pfad 2 (route, route, grass, **40×20 binding**, border tree)

- **Connections:** `left → { map: 'kieselstadt', offset: 2 }` – **cross-area, see §3** (west edge
  x = 0, y = 8..10); `right → { map: 'fluesterwald', offset: 12 }` (east edge x = 39, y = 8..10).
- **Layout:** horizontal route through fields: fences `f` along field edges, tall grass, a small
  stream crossed by a bridge `=`, a few ledges.
- **Trainers:** `pfad2_nico` (boy, sight 4, west), `pfad2_rosa` (woman, sight 3, by a flower bed),
  `pfad2_kurt` (hiker, sight 4, at a field edge), `pfad2_ida` (kid, sight 3, east end).
- **NPCs:** `farmer` (man) at a fence: "Die Wühli graben mir den ganzen Acker um. Aber dafür ist
  die Erde schön locker!"
- **Items:** `potion` (`item:pfad_2:potion`), `para_cure` (`item:pfad_2:para_cure`). **Hidden:**
  `repel` (`hidden:pfad_2:repel`), `crystal` (`hidden:pfad_2:crystal`).
- **Signs:** west: "PFAD 2\nWesten: Kieselstadt / Osten: Flüsterwald" · east: "FLÜSTERWALD\nBitte
  leise sein – der Wald hört zu."
- **Encounters:** `ENCOUNTERS.pfad_2`.

#### `fluesterwald` – Flüsterwald (route, forest, forest, 30×30, border tree)

- **Connections:** `left → { map: 'pfad_2', offset: -12 }` (west edge x = 0, y = 20..22);
  `up → { map: 'seewil', offset: -2 }` (north edge y = 0, x = 14..16).
- **Layout:** dense trees; a winding 2–3 wide path from the west entrance (south-west) to the north
  exit, tall grass, two clearings, a pond. Just before the north exit the path narrows to a
  **1-tile gap** between trees (suggested (15, 4)) – the Frostmantel blockade – then widens to
  x = 14..16 at the edge.
- **Story:**
  1. **Rival 2** – NPC `rival` (rival) a few tiles inside the entrance, `visible: !rival2_done`.
     Trigger strip `{ x: 2, y: 20, h: 3 }` when `!rival2_done`: `playMusic('rival')`, rival walks
     up (`moveNpc`), says intro, `ctx.battle(rivalTrainerId('rival2', s.starter))` (normal battle:
     a loss blacks out, the trigger fires again later). Win: rival says `after`, "Ich geh
     schon mal vor. Wer zuerst in Seewil ist!" → `moveNpc` deeper into the forest →
     `setFlag('rival2_done')` → `refreshNpcs()`.
  2. **First Frostmantel** – `grunt_wald_1` (grunt, sight 4) mid-forest (plain trainer).
  3. **Blockade** – NPC `grunt_grete` (grunt) on the 1-tile gap, `visible: !forest_cleared`.
     Scene (onTalk + trigger on the tile in front): `playMusic('villain')`, intro of `grunt_wald_2`,
     `ctx.battle('grunt_wald_2')`. Win: "Grr! Merk dir eins: Der Frostmantel wird die Alpenglut
     löschen!\fDann gehört Alvenland dem ewigen Winter!" → `setFlag('forest_cleared')` → `refreshNpcs()`.
- **Trainers:** `wald_ferdi` (oldman, sight 3), `wald_jana` (girl, sight 4), `wald_otto`
  (scientist, sight 4), `grunt_wald_1` (grunt, sight 4). Scripted: `rival2_*`, `grunt_wald_2`.
- **NPCs:** `ranger` (ranger) near the entrance: before `forest_cleared`: "Seltsame Leute in
  eisblauen Kutten treiben sich im Wald herum. Sei vorsichtig!" After, once
  (`gift_ranger_potions`): "Du hast die Kuttenleute vertrieben? Danke! Nimm das." →
  `giveItem('super_potion', 2)`. Then: "Der Wald flüstert wieder ganz normal."
- **Items:** `crystal_great` (`item:fluesterwald:crystal_great`), `antidote` ×2
  (`item:fluesterwald:antidote`). **Hidden:** `candy` (`hidden:fluesterwald:candy`), `wake_herb`
  (`hidden:fluesterwald:wake_herb`).
- **Signs:** inside the entrance: "FLÜSTERWALD\nNorden: Seewil".
- **Encounters:** `ENCOUNTERS.fluesterwald`.

#### `seewil` – Seewil (town, town, water, **26×22 binding**, border tree)

The lake town – nobody fishes here; the Wildlinge in the lake are neighbours.

- **Connections:** `down → { map: 'fluesterwald', offset: 2 }` (south edge y = 21, x = 12..14);
  `up → { map: 'pfad_3', offset: -3 }` – **cross-area, see §3** (north edge y = 0, x = 12..14).
- **Layout:** the lake `~` fills the east third; boardwalk bridges `=`, sand beach `s`, reeds
  (tall grass) along the shore. Halle 2 stands on a peninsula reached over a bridge.
- **Buildings:** `heal` → `seewil_center` · `shop` → `seewil_shop` · `hall` → `seewil_hall`
  arrival (6, 14) · `house_blue` → `seewil_house_1` · `house_green` → `seewil_house_2`.
- **NPCs:**
  - `guard_north` (guard) beside the north path. Trigger strip `{ x: 12, y: 2, w: 3 }` when
    `!badge_water`: "Der Weg nach Norden führt zur Glimmerhöhle.\fOhne das Wellenabzeichen von
    Hüterin Undine lasse ich niemanden durch." → `movePlayer('D')`. After: "Pfad 3 führt am Ufer
    entlang zur Glimmerhöhle."
  - `fisher` (fisher) on a pier: "Angeln? Nein, nein. Ich schaue den Tauchli nur beim Tauchen zu."
  - `girl` (girl, wander): "Siehst du die Tauchli im Schilf? Sie reiten auf dem Rücken ihrer Eltern!"
  - `man` (man) at the hall bridge: "Hüterin Undine schwimmt jeden Morgen durch den eiskalten See."
- **Signs:** "SEEWIL\nDas Dorf am stillen See." · lake: "Angeln verboten!\nDie Wildlinge im See
  sind unsere Nachbarn." · hall: "HALLE SEEWIL\nHüterin: Undine – Ruhig wie der See, stark wie
  die Flut."
- **Hidden:** `super_potion` (`hidden:seewil:super_potion`) on the beach.
- **Encounters:** `ENCOUNTERS.seewil` (reeds on the shore).

#### Seewil interiors

- `seewil_center` = `makeHealCenter`, `seewil_shop` = `makeShop({ shopItems: SHOPS.seewil })`.
- `seewil_house_1` (variant 0) – **gift creature:** `matti` (scientist), once (`gift_starter`):
  "Ich bin Matti, Arvens Kollege. Sie hat mir einen Wildling mitgegeben –\fden, den niemand gewählt
  hat. Bei dir hat er es bestimmt gut!" →
  `giveCreature(LEFTOVER_STARTER[ctx.state.starter], 12, { nickname: true })`.
  After: "Arven sagt: Ein Wildling ohne Freund ist wie Tee ohne Tasse."
- `seewil_house_2` (variant 2): `oldwoman` (oldwoman) – legend, part 1: "Auf dem Gipfelhorn wacht
  ein Wildling über die Alpenglut.\fMan sagt, sein Atem färbt die Berge am Abend rotgolden."
- `seewil_hall` – Halle 2 (12×16): hall floor with water channels `~` and bridges `=`; mat (6, 15),
  arrival (6, 14). Leader `leader_undine` (leader_water) at the top (leader script, badge 1, gift
  2× `revive`). Trainers `hall2_sina` (girl), `hall2_ruben` (boy), `hall2_alois` (fisher), sight 3.
  `advisor` (man): "Tipp: Wasser fürchtet Pflanzen, Blitz und Frost!\fFeuer verdampft hier nur."

---

### AREA 3 – Pfad 3, Glimmerhöhle, Funkenstadt

#### `pfad_3` – Pfad 3 (route, route, grass, **20×44 binding**, border tree)

- **Connections:** `down → { map: 'seewil', offset: 3 }` – **cross-area, see §3** (south edge
  y = 43, x = 9..11). No north connection.
- **Glimmerhöhle mouth:** a `cave_entrance` tile `E` in the cliff row at the top (suggested
  (10, 1), cliffs `M` around it, walkable (10, 2) below) with a warp → `glimmerhoehle_1`.
- **Layout:** lake shore in the south (water on the east side), a river crossed by a bridge in the
  middle, rocky terrain with south-facing ledges and cliffs further north.
- **Trainers:** `pfad3_beat` (fisher, sight 3, shore), `pfad3_nora` (girl, sight 4), `pfad3_heidi`
  (woman, sight 4, at the bridge), `pfad3_toni` (hiker, sight 4), `pfad3_emil` (scientist, sight 3,
  near the cave).
- **NPCs:** `hiker` (hiker) resting: "Die Höhle ist ein Labyrinth. Aber keine Sorge – es gibt
  nur einen Weg nach drüben."
- **Items:** `super_potion` (`item:pfad_3:super_potion`), `crystal_great`
  (`item:pfad_3:crystal_great`). **Hidden:** `burn_salve` (`hidden:pfad_3:burn_salve`), `candy`
  (`hidden:pfad_3:candy`).
- **Signs:** south: "PFAD 3\nSüden: Seewil / Norden: Glimmerhöhle" · by the cave: "GLIMMERHÖHLE\n
  Durchgang nach Funkenstadt. Vorsicht, Steinschlag!"
- **Encounters:** `ENCOUNTERS.pfad_3`.

#### `glimmerhoehle_1` – Glimmerhöhle (cave, cave, cave, 28×24, border cave_wall)

- **Exits (warps):** entrance `E` on the bottom row ↔ the `pfad_3` mouth; a passage `E` in the
  north part ↔ `glimmerhoehle_2`.
- **Layout:** cave floor `_` (every floor tile can trigger `cave` encounters), rock walls `#`,
  boulders `o`, a few ledges; a winding route with one or two dead ends holding items.
- **Trainers:** `hoehle_godi` (hiker, sight 4), `grunt_hoehle_1` (grunt, sight 4).
- **Items:** `revive` (`item:glimmerhoehle_1:revive`), `para_cure` (`item:glimmerhoehle_1:para_cure`).
  **Hidden:** `ether` (`hidden:glimmerhoehle_1:ether`).
- **Encounters:** `ENCOUNTERS.glimmerhoehle_1` (cave).

#### `glimmerhoehle_2` – Glimmerhöhle (cave, cave, cave, 24×24, border cave_wall)

- **Exits (warps):** passage `E` ↔ `glimmerhoehle_1`; exit `E` ↔ the `funkenstadt` cave mouth.
- **Blockade:** a **1-tile corridor** before the exit with NPC `grunt_petra` (grunt),
  `visible: !cave_cleared`. Scene (onTalk + trigger in front): `playMusic('villain')`, intro of
  `grunt_hoehle_2`, `ctx.battle('grunt_hoehle_2')`. Win: "Der Glimmerquarz ist längst im
  Funkenwerk!\fDie Kommandantin baut dort unseren Frostkern zusammen!" → `setFlag('cave_cleared')`
  → `refreshNpcs()`.
- **Trainers:** `hoehle_fredi` (hiker, sight 4). Scripted: `grunt_hoehle_2`.
- **Items:** `crystal_great` ×2 (`item:glimmerhoehle_2:crystal_great`), `candy`
  (`item:glimmerhoehle_2:candy`). **Hidden:** `super_potion` (`hidden:glimmerhoehle_2:super_potion`).
- **Encounters:** `ENCOUNTERS.glimmerhoehle_2` (cave).

#### `funkenstadt` – Funkenstadt (town, city, grass, **28×24 binding**, border tree)

The busy city of tinkerers and power lines; home of the Funkenwerk.

- **Connections:** `up → { map: 'pfad_4', offset: -4 }` – **cross-area, see §3** (north edge y = 0,
  x = 13..15). South: cliffs with the **cave mouth** `E` (warp ↔ `glimmerhoehle_2`), suggested in the
  south-west.
- **Layout:** paved paths, fences, cable-car pylons (decoration from fence/rock tiles), a patch of
  tall grass on the outskirts.
- **Buildings:** `heal` → `funken_center` · `shop` → `funken_shop` · `hall` → `funken_hall`
  arrival (6, 14) · `lab` ~8×5 (the Funkenwerk) → `funken_werk` arrival (6, 8) · `house_red` →
  `funken_house_1`.
- **NPCs:**
  - `hall_blocker` (scientist) **on the tile directly below the Halle door**, `visible: !werk_cleared`:
    "Die Halle ist zu! Hüterin Zita ist ins Funkenwerk gerannt –\fder Frostmantel hat es besetzt!"
  - `guard_north` (guard) beside the north path. Trigger strip `{ x: 13, y: 2, w: 3 }` when
    `!badge_spark`: "Pfad 4 führt hinauf in die Berge.\fOhne Funkenabzeichen lasse ich niemanden
    durch." → `movePlayer('D')`.
  - `boy` (boy): "Unsere Gondeli fahren an selbst gesponnenen Stromseilen. Cool, oder?"
  - `woman` (woman): before `werk_cleared`: "Seit der Frostmantel im Werk ist, flackert überall das
    Licht." After: "Das Licht brennt wieder! Danke dir!"
- **Signs:** "FUNKENSTADT\nDie Stadt, die niemals schläft – und immer summt." · Werk: "FUNKENWERK\n
  Strom für ganz Alvenland" · hall: "HALLE FUNKENSTADT\nHüterin: Zita – Volle Ladung voraus!"
- **Hidden:** `cure_all` (`hidden:funkenstadt:cure_all`).
- **Encounters:** `ENCOUNTERS.funkenstadt` (outskirts grass).

#### Funkenstadt interiors

- `funken_center` = `makeHealCenter`, `funken_shop` = `makeShop({ shopItems: SHOPS.funkenstadt })`.
- `funken_werk` – Funkenwerk (12×10, music `villain`, floor tile, rows of `lab_machine`, counters
  as conveyor belts): mat (6, 9), arrival (6, 8).
  - `onEnter`: if `werk_cleared` → `ctx.playMusic('lab')`.
  - Trainers `grunt_werk_1`, `grunt_werk_2`, `grunt_werk_3` (grunt, sight 3) along the way.
  - `bise` (grunt) at the back, `visible: !werk_cleared`; `zita` (leader_spark) next to her,
    `visible: !werk_cleared`. Scene (onTalk on Bise + trigger in front): `playMusic('villain')`,
    intro of `admin_bise_1`, `ctx.battle('admin_bise_1')`. Win: Bise: "Pah! Den Urkristall aus
    eurem Tresor haben wir trotzdem.\fMit ihm fangen wir den Wächter der Alpenglut – dann erlischt
    sie!" → Bise walks out (`moveNpc`). Zita: "Danke! Ohne dich wäre das Werk eingefroren.\fIch
    warte in der Halle auf dich!" → `setFlag('werk_cleared')` → `refreshNpcs()`.
  - `engineer` (scientist), `visible: werk_cleared`: "Der Tresor ist leer … Der Urkristall ist weg.
    Er kann jeden Wildling fangen!"
  - Items: `hyper_potion` (`item:funken_werk:hyper_potion`), `revive` (`item:funken_werk:revive`).
- `funken_house_1` (variant 1) – **gift creature:** `anton` (oldman), the clockmaker. Before
  `werk_cleared`: "Mein Guggerli ruft nicht mehr pünktlich. Der Strom flackert dauernd!" After,
  once (`gift_guggerli`): "Endlich wieder Strom! Mein Guggerli hatte Junge.\fNimm eins – es ist
  pünktlicher als jede Uhr!" → `giveCreature('guggerli', 24, { nickname: true })`.
- `funken_hall` – Halle 3 (12×16, hall floor with `lab_machine` rows): mat (6, 15), arrival (6, 14).
  Leader `leader_zita` (leader_spark) at the top (leader script, badge 2, gift 2× `ether`).
  Trainers `hall3_jola` (girl), `hall3_max` (scientist), `hall3_ben` (man), sight 3. `advisor`
  (man): "Tipp: Blitz fürchtet Erde und Metall!\fWasser- und Wind-Wildlinge kriegen hier eine
  gewischt."

---

### AREA 4 – Pfad 4, Frostalp, Gipfelpfad, Gipfelhorn

#### `pfad_4` – Pfad 4 (route, route_mountain, grass, **20×48 binding**, border tree)

- **Connections:** `down → { map: 'funkenstadt', offset: 4 }` – **cross-area, see §3** (south edge
  y = 47, x = 9..11); `up → { map: 'frostalp', offset: 2 }` (north edge y = 0, x = 9..11).
- **Layout:** switchbacks climbing north; the lower half grass and tall grass, the upper third snow
  `n` with snow grass `"`; south-facing ledges; cable-car pylons along one side; rocks.
- **Trainers:** `pfad4_luca` (kid, sight 3, lower part), `pfad4_rolf` (man, sight 4, at a pylon),
  `pfad4_resi` (woman, sight 4), `pfad4_hans` (hiker, sight 4, upper part).
- **NPCs:** `girl` (girl) where the snow begins: "Ab hier liegt Schnee! In Frostalp gibt's die
  beste heiße Schokolade."
- **Items:** `hyper_potion` (`item:pfad_4:hyper_potion`), `crystal_ultra` (`item:pfad_4:crystal_ultra`).
  **Hidden:** `repel_max` (`hidden:pfad_4:repel_max`), `candy` (`hidden:pfad_4:candy`).
- **Signs:** south: "PFAD 4\nSüden: Funkenstadt / Norden: Frostalp".
- **Encounters:** `ENCOUNTERS.pfad_4` (tall grass and snow grass both use `grass`).

#### `frostalp` – Frostalp (town, town, snow, 24×22, border tree, baseTile snow)

The last village below the summit.

- **Connections:** `down → { map: 'pfad_4', offset: -2 }` (south edge y = 21, x = 11..13);
  `up → { map: 'gipfelpfad', offset: -1 }` (north edge y = 0, x = 11..13).
- **Buildings:** `heal` → `frostalp_center` · `shop` → `frostalp_shop` · `hall` → `frostalp_hall`
  arrival (6, 14) · `house_blue` → `frostalp_house_1` (Gasthaus Edelweiß) · `house_red` →
  `frostalp_house_2`.
- **Story – Rival 3:** NPC `rival` (rival) near the entrance, `visible: !rival3_done`. Trigger strip
  `{ x: 11, y: 20, w: 3 }` – the first row inside the map, where the path is the only way in (the rows above are open
  snow, a strip there could be walked around) – when `!rival3_done`: `playMusic('rival')`, "{PLAYER}! Da bist du ja
  endlich!", intro, `ctx.battle(rivalTrainerId('rival3', s.starter))` (normal battle). Win: `after`,
  "Ich trainiere noch ein bisschen. Wir sehen uns oben!" → `moveNpc` away →
  `setFlag('rival3_done')` → `refreshNpcs()`.
- **NPCs:**
  - `ranger_gate` (ranger) beside the north path. Trigger strip `{ x: 11, y: 2, w: 3 }` when
    `!badge_frost`; row 1 beside the path is trees, so the strip cannot be walked around: "Der Gipfelpfad ist gefährlich, und oben treibt sich der Frostmantel herum.\f
    Hüterin Firna lässt nur mit Firnabzeichen jemanden hinauf." → `movePlayer('D')`.
  - `kid` (kid, wander): "Heiße Schokolade! Im Gasthaus gibt's die beste!"
  - `oldman` (oldman): "Seit Tagen wird es kälter. Die Alpenglut da oben flackert nur noch."
- **Signs:** "FROSTALP\nDas letzte Dorf vor dem Gipfel." · hall: "HALLE FROSTALP\nHüterin: Firna –
  Klar wie Eis, still wie Schnee." · north: "Norden: Gipfelpfad, Gipfelhorn" · inn: "GASTHAUS
  EDELWEISS".
- **Hidden:** `full_potion` (`hidden:frostalp:full_potion`).
- **Encounters:** `ENCOUNTERS.frostalp` (snow grass at the village edge).

#### Frostalp interiors

- `frostalp_center` = `makeHealCenter`, `frostalp_shop` = `makeShop({ shopItems: SHOPS.frostalp })`.
- `frostalp_house_1` (variant 2) – Gasthaus Edelweiß: `arven` (prof), once
  (`gift_arven_crystals`): "{PLAYER}! Ich erforsche hier oben die Alpenglut. Sie wird schwächer –\f
  der Frostmantel steckt dahinter. Nimm diese, du wirst sie brauchen!" →
  `giveItem('crystal_ultra', 3)`. After: "Der Wächter der Alpenglut heißt Lindglut. Wenn du ihm
  begegnest – sei behutsam." · `innkeeper` (woman): "Heiße Schokolade gibt's erst, wenn die
  Alpenglut wieder brennt. Versprochen!"
- `frostalp_house_2` (variant 0): `oldwoman` (oldwoman) – legend, part 2, gift once
  (`gift_frostalp_candy`): "Erlischt die Alpenglut, kommt der ewige Winter.\fDoch solange jemand
  mit warmem Herzen den Gipfel erreicht, brennt sie weiter." → `giveItem('candy', 1)`.
- `frostalp_hall` – Halle 4 (12×16, hall floor with snow `n` patches and `ice_rock` obstacles): mat
  (6, 15), arrival (6, 14). Leader `leader_firna` (leader_frost) at the top (leader script, badge 3,
  gift 2× `full_potion`). Trainers `hall4_anouk` (girl), `hall4_walter` (hiker), `hall4_svea`
  (woman), sight 3. `advisor` (man): "Tipp: Frost fürchtet Feuer, Metall und ganz normale
  Treffer!\fWasser und Wind frieren hier ein."

#### `gipfelpfad` – Gipfelpfad (route, route_mountain, snow, 22×50, border cliff, baseTile snow)

- **Connections:** `down → { map: 'frostalp', offset: 1 }` (south edge y = 49, x = 10..12);
  `up → { map: 'gipfelhorn', offset: -1 }` (north edge y = 0, x = 10..12).
- **Layout:** steep switchbacks with south-facing ledges, `ice_rock` and cliffs, snow grass patches.
  Near the top the path squeezes through a **1-tile pass** (suggested (11, 5)).
- **Story – Bise 2 blockade:** NPC `bise` (grunt) on the pass, `visible: !gipfelpfad_cleared`. Scene
  (onTalk + trigger in front): `playMusic('villain')`, intro of `admin_bise_2`,
  `ctx.battle('admin_bise_2')`. Win: "Geh nur. Eisner wartet an der Flamme – mit dem Urkristall.\f
  Ich … ich hab genug vom Winter." → `setFlag('gipfelpfad_cleared')` → `refreshNpcs()`.
- **Trainers:** `grunt_gipfel_1` (grunt, sight 4, lower), `gipfel_carla` (woman, sight 4),
  `grunt_gipfel_2` (grunt, sight 4), `gipfel_rico` (hiker, sight 3), `grunt_gipfel_3` (grunt,
  sight 4, upper). Scripted: `admin_bise_2`.
- **NPCs:** `rescuer` (ranger) half-way up, heals every time: "Ein Schluck Tee aus dem Fässchen
  meines Bernhardin?" → `ctx.heal()` (also makes this the respawn point for the summit) → "Weiter
  oben ist es eisig. Gib nicht auf!"
- **Items:** `full_potion`, `revive`, `ether_full`, `crystal_ultra` ×2 (flags
  `item:gipfelpfad:<itemId>`). **Hidden:** `candy` (`hidden:gipfelpfad:candy`), `restore`
  (`hidden:gipfelpfad:restore`).
- **Signs:** bottom: "GIPFELPFAD\nNur für geübte Bergsteiger!" · top: "GIPFELHORN, 3412 m\nDie
  Alpenglut ist nah."
- **Encounters:** `ENCOUNTERS.gipfelpfad`.

#### `gipfelhorn` – Gipfelhorn (route, summit, summit, 20×20, border cliff, baseTile snow)

- **Connections:** `down → { map: 'gipfelpfad', offset: 1 }` (south edge y = 19, x = 9..11). No
  other exits.
- **Layout:** a snowy plateau with a rocky rim. In the top centre a stone ring (`o`) around the
  **Alpenglut**: flame tiles `F` at (9..11, 3); a `lab_machine` beside it is the Frostkern. The path from the south
  edge to the flame is ≤ 5 tiles wide at row y = 10.
- **NPCs:**
  - `eisner` (boss) facing the flame, `visible: !boss_done`; `grunt_a`, `grunt_b` (grunt, plain
    text "…") beside him, `visible: !boss_done`.
  - `rival` (rival) below the neck, `visible: boss_done && !rival4_done` (scene B walks him up to the stage);
    `rival_post` (rival) beside the flame, `visible: rival4_done` (post-game: "Weißt du noch? Als Kinder wollten wir
    immer als Erste hier oben sein.").
  - `lindglut` (sprite `legend`) in front of the flame,
    `visible: (s) => !!s.flags['rival4_done'] && !s.dexCaught.includes('lindglut') && !s.flags['lindglut_resting']`.
- **Story:** one trigger strip across the path at y = 10 when `!rival4_done`, running scene A (if
  `!boss_done`) and then scene B. Lindglut is started from its `onTalk` (scene C). See §4 steps 33–36.
  Retries after a loss replay the open scene with a shorter intro (flags `eisner_met`, `rival4_met`).
- **Encounters:** none.

---

## 3. Cross-area connections (exact)

Rule (from `connectionLanding`): walking off the edge at coordinate `c` arrives at `c + offset` on
the target's opposite edge (`x` for up/down, `y` for left/right). Every walkable tile on a
connected edge must land on a walkable tile (checked by `validateMap`), so **on each connected edge
exactly the listed tiles are walkable** (path `:` or grass), everything else on that edge is solid
(trees/cliffs). Keep the path at full width for at least 3 tiles into each map and keep NPCs,
items, signs and triggers off the edge tile itself.

| link | map A (area) | edge of A | walkable on A | map B (area) | edge of B | walkable on B | A.connections | B.connections |
|---|---|---|---|---|---|---|---|---|
| 1 | `kieselstadt` (1), 24×22 | east, x = 23 | y = 10, 11, 12 | `pfad_2` (2), 40×20 | west, x = 0 | y = 8, 9, 10 | `right: { map: 'pfad_2', offset: -2 }` | `left: { map: 'kieselstadt', offset: 2 }` |
| 2 | `seewil` (2), 26×22 | north, y = 0 | x = 12, 13, 14 | `pfad_3` (3), 20×44 | south, y = 43 | x = 9, 10, 11 | `up: { map: 'pfad_3', offset: -3 }` | `down: { map: 'seewil', offset: 3 }` |
| 3 | `funkenstadt` (3), 28×24 | north, y = 0 | x = 13, 14, 15 | `pfad_4` (4), 20×48 | south, y = 47 | x = 9, 10, 11 | `up: { map: 'pfad_4', offset: -4 }` | `down: { map: 'funkenstadt', offset: 4 }` |

Worked example (link 2): leaving `seewil` north at (13, 0) → `pfad_3` (13 − 3, 43) = (10, 43);
leaving `pfad_3` south at (9, 43) → `seewil` (9 + 3, 0) = (12, 0).

The gates next to these edges belong to the town side: Kieselstadt guard (badge_earth), Seewil
guard (badge_water), Funkenstadt guard (badge_spark).

In-area connections (each area owns both sides; listed for completeness):

| from | edge, walkable | to | edge, walkable | offset (from → to) |
|---|---|---|---|---|
| `moosbach` 20×18 | up, x = 9..10 | `pfad_1` 20×40 | down, x = 9..10 | 0 / 0 |
| `pfad_1` | up, x = 9..10 | `kieselstadt` | down, x = 11..12 | +2 / −2 |
| `pfad_2` | right, y = 8..10 | `fluesterwald` 30×30 | left, y = 20..22 | +12 / −12 |
| `fluesterwald` | up, x = 14..16 | `seewil` | down, x = 12..14 | −2 / +2 |
| `pfad_4` | up, x = 9..11 | `frostalp` 24×22 | down, x = 11..13 | +2 / −2 |
| `frostalp` | up, x = 11..13 | `gipfelpfad` 22×50 | down, x = 10..12 | −1 / +1 |
| `gipfelpfad` | up, x = 10..12 | `gipfelhorn` 20×20 | down, x = 9..11 | −1 / +1 |

Area 3 warps: `pfad_3` mouth ↔ `glimmerhoehle_1` entrance, `glimmerhoehle_1` passage ↔
`glimmerhoehle_2` passage, `glimmerhoehle_2` exit ↔ `funkenstadt` mouth (see §5 for landing tiles).

---

## 4. Story script outline (intro → credits)

The Frostmantel (ice-blue hooded cloaks, snowflake emblem) wants to put out the Alpenglut so that
Alvenland sleeps forever under ice ("ewige Stille"). Leader: **Anführer Eisner**. Second in
command: **Kommandantin Bise** (named after the cold north wind). Their plan: (1) a freezing
machine, the **Frostkern**, powered by Glimmerquarz – tested in the Flüsterwald, quartz mined in the
Glimmerhöhle, assembled in the Funkenwerk; (2) the **Urkristall** (`crystal_master`, a relic from the
Funkenwerk vault that catches any Wildling) to capture **Lindglut**, the flame's guardian.
The rival (`{RIVAL}`, sprite `rival`) is cocky, competitive and good-hearted; he always runs ahead.

| # | where | what | flags / items / trainers |
|---|---|---|---|
| 1 | intro scene | names set (`runIntro`) | – |
| 2 | `player_house` | START (1, 1). Mom: Arven is looking for you | – |
| 3 | `moosbach` | north exit blocked until a starter | gate: `got_starter` |
| 4 | `arven_lab` | choose starter (Lv 5, nickname); `state.starter` set | **`got_starter`** |
| 5 | `arven_lab` | rival takes `RIVAL_STARTER[starter]`; **rival 1** (allowLoss) | `rival1_<id>`; **`rival1_done`** (win or lose) |
| 6 | `arven_lab` | Arven gives 5× `crystal`; heals on talk from now on | – |
| 7 | `player_house` | Mom gives 2× `potion` once, heals on talk | `gift_mom_potions` |
| 8 | `pfad_1` | 3 trainers | `pfad1_beni`, `pfad1_lea`, `pfad1_sepp` |
| 9 | `kieselstadt` | collector gift 3× `crystal` | `gift_kiesel_crystals` |
| 10 | `kiesel_hall` | Halle 1 → **Felsabzeichen** + 2× `super_potion` | `hall1_urs`, `hall1_vreni`, `leader_jost`; `badge_earth` |
| 11 | `kieselstadt` | east gate opens | gate: `badge_earth` |
| 12 | `pfad_2` | 4 trainers | `pfad2_nico`, `pfad2_rosa`, `pfad2_kurt`, `pfad2_ida` |
| 13 | `fluesterwald` entrance | **rival 2** | `rival2_<id>`; **`rival2_done`** |
| 14 | `fluesterwald` | first Frostmantel; forest trainers | `wald_ferdi`, `wald_jana`, `wald_otto`, `grunt_wald_1` |
| 15 | `fluesterwald` north gap | Grete's blockade → reveals the plan | `grunt_wald_2`; **`forest_cleared`** |
| 16 | `fluesterwald` | ranger gift 2× `super_potion` | `gift_ranger_potions` |
| 17 | `seewil_house_1` | Matti gives the leftover starter (Lv 15) | `gift_starter` |
| 18 | `seewil_hall` | Halle 2 → **Wellenabzeichen** + 2× `revive` | `hall2_sina`, `hall2_ruben`, `hall2_alois`, `leader_undine`; `badge_water` |
| 19 | `seewil` | north gate opens | gate: `badge_water` |
| 20 | `pfad_3` | 5 trainers | `pfad3_beat`, `pfad3_nora`, `pfad3_heidi`, `pfad3_toni`, `pfad3_emil` |
| 21 | `glimmerhoehle_1` | miners and a grunt | `hoehle_godi`, `grunt_hoehle_1` |
| 22 | `glimmerhoehle_2` | Petra's blockade before the exit | `hoehle_fredi`, `grunt_hoehle_2`; **`cave_cleared`** |
| 23 | `funkenstadt` | Halle blocked: Zita is in the occupied Funkenwerk | gate: `werk_cleared` |
| 24 | `funken_werk` | 3 grunts, **Bise 1**; Bise escapes with the Urkristall; Zita freed | `grunt_werk_1..3`, `admin_bise_1`; **`werk_cleared`** |
| 25 | `funken_house_1` | clockmaker gives Guggerli Lv 24 | `gift_guggerli` (needs `werk_cleared`) |
| 26 | `funken_hall` | Halle 3 → **Funkenabzeichen** + 2× `ether` | `hall3_jola`, `hall3_max`, `hall3_ben`, `leader_zita`; `badge_spark` |
| 27 | `funkenstadt` / `pfad_4` | north gate opens; 4 trainers | gate: `badge_spark`; `pfad4_luca`, `pfad4_rolf`, `pfad4_resi`, `pfad4_hans` |
| 28 | `frostalp` entrance | **rival 3** | `rival3_<id>`; **`rival3_done`** |
| 29 | `frostalp` | Arven gives 3× `crystal_ultra`; legend part 2 + `candy` | `gift_arven_crystals`, `gift_frostalp_candy` |
| 30 | `frostalp_hall` | Halle 4 → **Firnabzeichen** + 2× `full_potion` | `hall4_anouk`, `hall4_walter`, `hall4_svea`, `leader_firna`; `badge_frost` |
| 31 | `frostalp` / `gipfelpfad` | north gate opens; trainers; rescuer heals | gate: `badge_frost`; `grunt_gipfel_1..3`, `gipfel_carla`, `gipfel_rico` |
| 32 | `gipfelpfad` pass | **Bise 2** blockade | `admin_bise_2`; **`gipfelpfad_cleared`** (`bise2_met`) |
| 33 | `gipfelhorn` scene A | `playMusic('villain')`; Eisner at the flame (`getTrainer('boss_eisner').intro`, his motive: the glacier he loved is melting); **boss battle** `ctx.battle('boss_eisner')`. Win: "Mein Frostkern … zerbrochen." The flame flares up and **heals the team** (the respawn point stays below); Eisner hands over the Urkristall → `giveItem('crystal_master', 1)`; "Behalte ihn. Vielleicht weißt du besser, was er wert ist." Frostmantel leaves → `setFlag('boss_done')`, `refreshNpcs()` | `boss_eisner`; **`boss_done`** (`eisner_met`) |
| 34 | `gipfelhorn` scene B | `playMusic('rival')`; rival runs up from the south (`moveNpc`): "Ich hab's nicht rechtzeitig geschafft … aber du!"; intro; **rival 4** `ctx.battle(rivalTrainerId('rival4', s.starter))` (normal battle; on a loss the trigger runs scene B again). Win: rival `after`; `playSfx('confirm')`/emote: "Die Alpenglut lodert hell auf!" → `setFlag('rival4_done')`, `refreshNpcs()` (Lindglut appears) | `rival4_<id>`; **`rival4_done`** (`rival4_met`) |
| 35 | `gipfelhorn` scene C | talk to `lindglut`: "Ein gewaltiger Wildling steigt aus der Flamme!" → `ctx.wildBattle('lindglut', 40, { canRun: true, music: 'battle_legend' })`. Outcome `caught`, `win` or `run` all end the story (a loss blacks out; try again). Rival: "Die Alpenglut brennt wieder. Danke, {PLAYER}." → `setFlag('lindglut_done')`, `setFlag('game_cleared')`, the save position becomes the Gasthaus in Frostalp, `ctx.g.save()`, `ctx.credits()` | **`lindglut_done`**, **`game_cleared`** |
| 36 | post-game | "Weiter" resumes in the Gasthaus (hot chocolate heals, a reformed Bise, Arven). If Lindglut was not caught it sinks into the flame (`lindglut_resting`) and is back on the next visit to the summit; talking battles it again without credits | (`lindglut_resting`) |

Complete story flag list: `got_starter`, `rival1_done`, `rival2_done`, `forest_cleared`,
`cave_cleared`, `werk_cleared`, `rival3_done`, `gipfelpfad_cleared`, `boss_done`, `rival4_done`,
`lindglut_done`, `game_cleared`; gifts: `gift_mom_potions`, `gift_kiesel_crystals`,
`gift_ranger_potions`, `gift_starter`, `gift_guggerli`, `gift_arven_crystals`,
`gift_frostalp_candy`. Scene bookkeeping: `lab_greeted`, `chapter1_cleared` and `chapter2_cleared` (the closing
beats after Jost and Undine), `bise2_met`, `eisner_met`, `rival4_met` (shorter intros on a retry),
`lindglut_resting`.

`tests/world-graph.test.ts` walks the whole world in this order: at each stage the next maps and story NPCs are
reachable, the maps behind the next gate are not, every reachable tile can walk back to a Heilstation, and at the end
every map is reachable and no dev map.

Gates at a glance:

| gate | map | blocks the way to | open when |
|---|---|---|---|
| trigger strip by `kid_north` | `moosbach` | `pfad_1` | `got_starter` |
| trigger strip by `guard_east` | `kieselstadt` | `pfad_2` | `badge_earth` |
| `grunt_grete` on a 1-tile gap | `fluesterwald` | `seewil` | `forest_cleared` |
| trigger strip by `guard_north` | `seewil` | `pfad_3` | `badge_water` |
| `grunt_petra` in a 1-tile corridor | `glimmerhoehle_2` | `funkenstadt` | `cave_cleared` |
| `hall_blocker` below the Halle door | `funkenstadt` | `funken_hall` | `werk_cleared` |
| trigger strip by `guard_north` | `funkenstadt` | `pfad_4` | `badge_spark` |
| trigger strip by `ranger_gate` | `frostalp` | `gipfelpfad` | `badge_frost` |
| `bise` on a 1-tile pass | `gipfelpfad` | `gipfelhorn` | `gipfelpfad_cleared` |

---

## 5. Interior and entrance conventions

- **Exit mat:** every interior's exit is a `mat` tile (`d`) on the **bottom row**; the rest of the
  bottom row is `void` (`x`). The mat is a warp to the outdoor tile **directly below the building
  door**, with `facing: 'down'`.
- **Entering:** the building door (`BuildingDef.door`) targets the tile **directly above the
  interior mat**; the player keeps facing up. No warp, NPC or item may sit on an arrival tile.
- **Templates** (`src/world/templates.ts`) already follow this: `makeHealCenter` (11×9, arrival
  (5, 7)), `makeShop` (10×9, arrival (5, 7)), `makeHouse` (10×8, arrival (4, 6), variants 0–2, free
  NPC tiles (2, 4), (7, 4), (8, 5), (1, 6)). Use them for every Heilstation, Laden and house.
- **Heilstation:** `isHealCenter: true`, nurse behind the counter, PC beside it (template).
  Talking to the nurse heals and sets `lastHeal`.
- **Laden:** clerk behind a counter, `makeShop({ shopItems: SHOPS[<townMapId>] })`.
- **Custom interiors** (`arven_lab`, Hallen, `funken_werk`): same mat/arrival rule; mat in the
  middle column of the bottom row (positions listed per map above).
- **Hallen:** leader at the top centre facing down, the entrance mat at the bottom centre, 2–3
  trainers on the way, an `advisor` NPC beside the arrival tile with a type tip.
- **Cave entrances / passages** (`cave_entrance` tile `E` + warp): arriving puts the player on the
  walkable tile in front of the target `E` (the side you would walk out to), facing away from it.
  Example: `pfad_3` mouth at (10, 1) → arrival (10, 2) facing down; the cave's bottom-row entrance at
  (x, 23) → arrival (x, 22) facing up.
- **Building footprints:** w 3–9, h 3–6 tiles; door on the bottom row; the tile below every door
  must be walkable.
- Preview maps with `npx tsx scripts/render-map.ts <mapId…>` and run `npx vitest run tests/maps.test.ts`.
