/**
 * The story battles of chapters 1–4 in walking order, played by the sim player (scripts/lib/sim.ts).
 * Healing follows the e2e playthroughs: heal items before a trainer, the Heilstation (or Mutter) when a team
 * member fainted or the lead is low, a full heal + the Laden before every Halle battle (the Heilstation is next door).
 * Visible heal items on the way go into the bag; hidden items and Honigwaben are left out (many players miss them).
 */
import { createRng, type Rng } from '../../src/core/rng';
import type { SaveData } from '../../src/core/types';
import { createCreature } from '../../src/creature';
import { LEFTOVER_STARTER, rivalTrainerId } from '../../src/data/trainers';
import { addCreature, newGameState } from '../../src/state';
import { fieldHeal, healParty, newCreature, shop, type Tally, wildBattle } from './sim';

export const STARTERS = ['sproessli', 'zuendli', 'biberli'] as const;

export function newRun(starter: string, seed: number): { s: SaveData; rng: Rng } {
  const rng = createRng(seed);
  const s = newGameState({ mapId: 'x', x: 0, y: 0, facing: 'down' });
  s.starter = starter;
  s.party = [createCreature(starter, 5, rng, { uid: 1 })];
  s.nextUid = 2;
  return { s, rng };
}

/** Picks up / receives an item. */
const gain = (s: SaveData, id: string, n = 1) => {
  s.bag[id] = (s.bag[id] ?? 0) + n;
};

/** Makes room in a full party: the lowest-level member (never the starter) goes to the box. */
function makeRoom(s: SaveData): void {
  if (s.party.length < 6) return;
  const weakest = s.party.slice(1).reduce((a, c) => (c.level < a.level ? c : a));
  s.party = s.party.filter((c) => c !== weakest);
  s.box.push(weakest);
}

/** A gift creature joins the party (the weakest member makes room if it is full). */
function join(s: SaveData, species: string, level: number, rng: Rng): void {
  makeRoom(s);
  addCreature(s, newCreature(s, species, level, rng));
}

/**
 * Catches one creature: the first wild encounter of the map (crystals until it sticks), or a given species at Lv 3.
 * In a full party the weakest member makes room.
 */
function catchOne(s: SaveData, rng: Rng, mapId: string, species: boolean | string): void {
  if (typeof species === 'string') {
    s.party.push(newCreature(s, species, 3, rng));
    return;
  }
  makeRoom(s);
  s.bag.crystal = Math.max(s.bag.crystal ?? 0, 10);
  const before = s.party.length;
  for (let i = 0; i < 6 && s.party.length === before; i++) wildBattle(s, mapId, rng, { catch: true });
}

/** Extra wild battles led by the lowest-level member until every member reaches `level` (max 40); returns the count. */
function train(s: SaveData, rng: Rng, mapId: string, level: number): number {
  let n = 0;
  for (; n < 40 && Math.min(...s.party.map((c) => c.level)) < level; n++) {
    fieldHeal(s);
    wildBattle(s, mapId, rng, { train: true });
  }
  return n;
}

export interface Ch1Opts {
  /** Wild battles on Pfad 1 (split into three stretches), led by the starter. */
  wild: number;
  /** Catch the first wild creature on Pfad 1 (true), or a given species at Lv 3 (e.g. 'chaeferli'). */
  catch: boolean | string;
  /** Before Kieselstadt the catch leads extra wild battles until it reaches this level (a player training it). */
  trainTo?: number;
}

/** Rival 1 → Pfad 1 → Halle 1 (Jost). Returns the number of extra training battles. */
export function chapter1(s: SaveData, rng: Rng, t: Tally, opts: Ch1Opts): number {
  t.battle(s, rivalTrainerId('rival1', s.starter), rng, { key: 'rival1', allowLoss: true });
  healParty(s); // Arven
  s.bag.crystal = 5;
  s.bag.potion = 2; // Mutter
  const wild = (n: number) => {
    for (let i = 0; i < n; i++) wildBattle(s, 'pfad_1', rng);
  };
  wild(opts.wild / 3);
  if (opts.catch) catchOne(s, rng, 'pfad_1', opts.catch);
  for (const [id, n] of [['pfad1_beni', opts.wild / 3], ['pfad1_lea', opts.wild / 3], ['pfad1_sepp', 0]] as const) {
    fieldHeal(s);
    t.battle(s, id, rng, { retries: 1 });
    wild(n);
  }
  const grind = opts.trainTo ? train(s, rng, 'pfad_1', opts.trainTo) : 0;
  s.bag.crystal = (s.bag.crystal ?? 0) + 3; // Sammler
  // Kieselstadt: Heilstation + Laden (Kräutertee, up to 4 in the bag) before each Halle battle
  const prepare = () => {
    healParty(s);
    shop(s, [['potion', 4]]);
  };
  for (const id of ['hall1_urs', 'hall1_vreni', 'leader_jost']) {
    prepare();
    t.battle(s, id, rng, { prepare });
  }
  s.bag.super_potion = (s.bag.super_potion ?? 0) + 2; // Jost's gift
  s.badges.push('badge_earth');
  return grind;
}

export interface Ch2Opts {
  /** Wild battles on Pfad 2 and in the Flüsterwald each (led by the starter). */
  wild: number;
  /** Catch the first wild creature in the Flüsterwald. */
  catch: boolean;
  /** Before Halle 2 the weakest member leads extra wild battles in the reeds until every member reaches this level. */
  trainTo?: number;
}

/** Pfad 2 → Flüsterwald (rival 2, grunts, Grete) → Seewil (Matti) → Halle 2 (Undine). Returns the training battles. */
export function chapter2(s: SaveData, rng: Rng, t: Tally, opts: Ch2Opts): number {
  healParty(s);
  shop(s, [['potion', 4]]);
  const wild = (map: string, n: number) => {
    for (let i = 0; i < n; i++) wildBattle(s, map, rng);
  };
  const trainer = (id: string, key = id) => {
    fieldHeal(s);
    t.battle(s, id, rng, { key });
  };
  // Pfad 2: Nico, Kurt, Rosa, Ida along the path, grass in between
  const per = opts.wild / 4;
  for (const id of ['pfad2_nico', 'pfad2_kurt', 'pfad2_rosa', 'pfad2_ida']) {
    wild('pfad_2', per);
    trainer(id);
  }
  // Flüsterwald: rival 2 at the entrance, a catch, the forest trainers, Grete's blockade, the ranger's gift
  trainer(rivalTrainerId('rival2', s.starter), 'rival2');
  if (opts.catch) catchOne(s, rng, 'fluesterwald', true);
  for (const id of ['wald_jana', 'grunt_wald_1', 'wald_otto', 'wald_ferdi']) {
    wild('fluesterwald', per);
    trainer(id);
  }
  trainer('grunt_wald_2', 'grete');
  s.bag.super_potion = (s.bag.super_potion ?? 0) + 2; // ranger
  // Seewil: Heilstation, Matti's gift, training in the reeds, Laden before each Halle battle
  healParty(s);
  const gift = LEFTOVER_STARTER[s.starter];
  if (gift) s.party.push(newCreature(s, gift, 12, rng));
  const grind = opts.trainTo ? train(s, rng, 'seewil', opts.trainTo) : 0;
  const prepare = () => {
    healParty(s);
    shop(s, [['super_potion', 3], ['potion', 4]]);
  };
  for (const id of ['hall2_sina', 'hall2_ruben', 'hall2_alois', 'leader_undine']) {
    prepare();
    t.battle(s, id, rng, { prepare });
  }
  gain(s, 'revive', 2); // Undine's gift
  s.badges.push('badge_water');
  return grind;
}

/** "starter / others (highest first)": average levels over runs, e.g. "29.4 / 24.1 21.0 19.8 12.2 11.5". */
export function teamLevels(rows: number[][]): string {
  const avg = (ls: number[]) => (ls.length ? (ls.reduce((a, b) => a + b, 0) / ls.length).toFixed(1) : '-');
  const others = rows.map((l) => l.slice(1).sort((a, b) => b - a));
  const width = Math.max(0, ...others.map((l) => l.length));
  const cols = Array.from({ length: width }, (_, i) => avg(others.flatMap((l) => (l[i] === undefined ? [] : [l[i]!]))));
  return `${avg(rows.map((l) => l[0]!))} / ${cols.join(' ')}`;
}

export interface LateOpts {
  /** Wild battles per stretch: Pfad 3 and the Glimmerhöhle (chapter 3), Pfad 4 and the Gipfelpfad (chapter 4). */
  wild: number;
  /**
   * Catch the first wild creature of each new area (chapter 3: Pfad 3, Glimmerhöhle; chapter 4: Pfad 4, Frostalp,
   * Gipfelpfad), as a player who keeps the team fresh; the weakest member goes to the box when the party is full.
   */
  catch: boolean;
  /** Before the Halle the weakest member leads extra wild battles until every member reaches this level. */
  trainTo?: number;
}

/** A story trainer after the field heal (statuses cured, heal items, back to rest if needed). */
function trainer(s: SaveData, rng: Rng, t: Tally, id: string, key = id): void {
  fieldHeal(s);
  t.battle(s, id, rng, { key });
}

/** Wild battles in a row, led by the starter (as in chapters 1–2: no healing in between, a loss blacks out). */
function wilds(s: SaveData, rng: Rng, map: string, n: number): void {
  for (let i = 0; i < n; i++) wildBattle(s, map, rng);
}

/** A careful player walks back to rest (full LP and EN) before a Frostmantel boss fight. */
function rested(s: SaveData): void {
  healParty(s);
}

/** The four Halle battles; before each a full heal and the Laden (`wants`), also after a loss. */
function halle(s: SaveData, rng: Rng, t: Tally, ids: readonly string[], wants: readonly [string, number][]): void {
  const prepare = () => {
    healParty(s);
    shop(s, wants);
  };
  for (const id of ids) {
    prepare();
    t.battle(s, id, rng, { prepare });
  }
}

/**
 * Seewil → Pfad 3 (5 trainers) → Glimmerhöhle 1 (a catch, Godi, Lars) → 2 (Fredi, Petra) → Funkenstadt (Heilstation,
 * Laden) → Funkenwerk (Udo, Rita, Egon, Bise 1) → Anton's Guggerli → Halle 3 (Jola, Max, Ben, Zita). Returns the
 * training battles.
 */
export function chapter3(s: SaveData, rng: Rng, t: Tally, opts: LateOpts): number {
  healParty(s);
  shop(s, [['super_potion', 4]]); // Seewil
  if (opts.catch) catchOne(s, rng, 'pfad_3', true);
  const per = opts.wild / 5;
  for (const id of ['pfad3_beat', 'pfad3_heidi', 'pfad3_nora', 'pfad3_toni', 'pfad3_emil']) {
    wilds(s, rng, 'pfad_3', per);
    trainer(s, rng, t, id);
  }
  gain(s, 'super_potion');
  if (opts.catch) catchOne(s, rng, 'glimmerhoehle_1', true);
  gain(s, 'revive'); // in a dead end of the Glimmerhöhle
  wilds(s, rng, 'glimmerhoehle_1', opts.wild / 4);
  trainer(s, rng, t, 'hoehle_godi', 'godi');
  wilds(s, rng, 'glimmerhoehle_1', opts.wild / 4);
  trainer(s, rng, t, 'grunt_hoehle_1', 'lars');
  wilds(s, rng, 'glimmerhoehle_2', opts.wild / 4);
  trainer(s, rng, t, 'hoehle_fredi', 'fredi');
  wilds(s, rng, 'glimmerhoehle_2', opts.wild / 4);
  trainer(s, rng, t, 'grunt_hoehle_2', 'petra');
  // Funkenstadt: Heilstation and Laden, then the Funkenwerk next door
  healParty(s);
  shop(s, [['super_potion', 4], ['hyper_potion', 2], ['revive', 1]]);
  for (const [id, key] of [['grunt_werk_1', 'udo'], ['grunt_werk_2', 'rita'], ['grunt_werk_3', 'egon']]) trainer(s, rng, t, id!, key);
  rested(s); // Bise waits at the back of the Werk; the Heilstation is next door
  t.battle(s, 'admin_bise_1', rng, { key: 'bise1', prepare: () => rested(s) });
  gain(s, 'hyper_potion');
  gain(s, 'revive'); // Funkenwerk
  healParty(s);
  join(s, 'guggerli', 20, rng); // Anton
  const grind = opts.trainTo ? train(s, rng, 'funkenstadt', opts.trainTo) : 0;
  halle(s, rng, t, ['hall3_jola', 'hall3_max', 'hall3_ben', 'leader_zita'], [['hyper_potion', 2], ['super_potion', 3]]);
  gain(s, 'ether', 2); // Zita's gift
  s.badges.push('badge_spark');
  return grind;
}

/**
 * Funkenstadt → Pfad 4 (a catch, 4 trainers) → Frostalp (rival 3 at the entrance, Heilstation, Arven's
 * Gipfelkristalle, a catch, Laden) → Halle 4 (Anouk, Walter, Svea, Firna) → Laden (stocking up for the summit) →
 * Gipfelpfad (a catch, Holger, Carla, the rescuer's tea, Wilma, Rico, Sven, Bise 2) → Gipfelhorn (Eisner, the flame
 * heals, rival 4). Lindglut is left to the caller. Returns the training battles.
 */
export function chapter4(s: SaveData, rng: Rng, t: Tally, opts: LateOpts): number {
  healParty(s);
  shop(s, [['hyper_potion', 3], ['super_potion', 3], ['revive', 2]]); // Funkenstadt
  if (opts.catch) catchOne(s, rng, 'pfad_4', true);
  const per = opts.wild / 4;
  for (const id of ['pfad4_luca', 'pfad4_rolf', 'pfad4_resi', 'pfad4_hans']) {
    wilds(s, rng, 'pfad_4', per);
    trainer(s, rng, t, id);
  }
  gain(s, 'hyper_potion');
  gain(s, 'crystal_ultra');
  trainer(s, rng, t, rivalTrainerId('rival3', s.starter), 'rival3');
  healParty(s); // Frostalp Heilstation
  gain(s, 'crystal_ultra', 3); // Arven
  if (opts.catch) catchOne(s, rng, 'frostalp', true);
  const grind = opts.trainTo ? train(s, rng, 'frostalp', opts.trainTo) : 0;
  halle(s, rng, t, ['hall4_anouk', 'hall4_walter', 'hall4_svea', 'leader_firna'], [['hyper_potion', 3], ['super_potion', 3]]);
  gain(s, 'full_potion', 2); // Firna's gift
  s.badges.push('badge_frost');
  healParty(s);
  shop(s, [['hyper_potion', 5], ['revive', 3], ['full_potion', 2]]); // Frostalp: stocking up for the summit
  const gipfel = (n: number) => wilds(s, rng, 'gipfelpfad', n);
  if (opts.catch) catchOne(s, rng, 'gipfelpfad', true);
  const per2 = opts.wild / 5;
  gipfel(per2);
  trainer(s, rng, t, 'grunt_gipfel_1', 'holger');
  gipfel(per2);
  trainer(s, rng, t, 'gipfel_carla', 'carla');
  healParty(s); // the rescuer's tea
  for (const [id, key] of [['grunt_gipfel_2', 'wilma'], ['gipfel_rico', 'rico'], ['grunt_gipfel_3', 'sven']]) {
    gipfel(per2);
    trainer(s, rng, t, id!, key);
  }
  gain(s, 'full_potion');
  gain(s, 'revive');
  gain(s, 'crystal_ultra', 2);
  // the rescuer's tea is a short walk back down (a loss respawns there anyway)
  rested(s);
  t.battle(s, 'admin_bise_2', rng, { key: 'bise2', prepare: () => rested(s) });
  rested(s);
  t.battle(s, 'boss_eisner', rng, { key: 'eisner', prepare: () => rested(s) });
  healParty(s); // the freed flame
  t.battle(s, rivalTrainerId('rival4', s.starter), rng, { key: 'rival4' });
  return grind;
}
