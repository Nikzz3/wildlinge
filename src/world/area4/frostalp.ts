/**
 * Frostalp – the last village below the summit – its interiors (Gasthaus Edelweiß with Arven, the legend house)
 * and Halle 4 (Hüterin Firna). Rival 3 waits at the south entrance; the ranger at the north path only lets
 * badge holders up the Gipfelpfad. After the ending the Gasthaus finally serves hot chocolate (the save after
 * the credits resumes in there). See docs/WORLD.md "AREA 4".
 */
import type { MapDef, ScriptContext } from '../../core/contracts';
import type { SaveData } from '../../core/types';
import { getTrainer } from '../../data';
import { BADGES } from '../../data/badges';
import { ENCOUNTERS } from '../../data/encounters';
import { SHOPS } from '../../data/shops';
import { rivalTrainerId } from '../../data/trainers';
import { HEAL_CENTER_ARRIVAL, HOUSE_ARRIVAL, makeHealCenter, makeHouse, makeShop, SHOP_ARRIVAL } from '../templates';
import { FROSTALP_DOORS, FROSTALP_HALL_ARRIVAL } from './doors';

const BADGE = BADGES[3]!;
const cleared = (s: SaveData) => !!s.flags['game_cleared'];

/** Path from (x, y) to (tx, ty): vertical first, then horizontal. */
function pathTo(x: number, y: number, tx: number, ty: number): string {
  const v = ty < y ? 'U'.repeat(y - ty) : 'D'.repeat(ty - y);
  const h = tx < x ? 'L'.repeat(x - tx) : 'R'.repeat(tx - x);
  return v + h;
}

/**
 * Rival 3 waits beside the entrance; the strip lies on the first row inside the map (y = 20), where the only way in
 * is the path (x = 11..13), so nobody walks around him on the open snow.
 */
const RIVAL = { x: 15, y: 19 } as const;
const ENTRANCE_STRIP = { x: 11, y: 20, w: 3 } as const;
/** Where he wanders off to after the battle: the snow grass at the east edge (out of view). */
const RIVAL_TRAINING_SPOT = { x: 22, y: 19 } as const;

async function rival3Scene(ctx: ScriptContext): Promise<void> {
  if (ctx.flag('rival3_done')) return;
  const id = rivalTrainerId('rival3', ctx.state.starter);
  const t = getTrainer(id);
  ctx.playMusic('rival');
  await ctx.emote('rival', 'exclaim');
  await ctx.say('{RIVAL}: {PLAYER}! Da bist du ja endlich!');
  const r = ctx.npcPos('rival');
  const p = ctx.player;
  // walk up to the tile east of the player (talking to him directly needs no walk)
  if (r && Math.abs(r.x - p.x) + Math.abs(r.y - p.y) > 1) {
    await ctx.moveNpc('rival', pathTo(r.x, r.y, p.x + 1, p.y));
    ctx.facePlayer('right');
  }
  ctx.npcFacePlayer('rival');
  await ctx.say('{RIVAL}: Ich warte hier schon seit Stunden! Na gut … seit zehn Minuten.\fAber es waren sehr kalte zehn Minuten.');
  await ctx.say(`{RIVAL}: ${t.intro}`);
  await ctx.battle(id); // a loss blacks out and aborts; the strip starts the scene again next time
  ctx.npcFacePlayer('rival');
  await ctx.say(`{RIVAL}: ${t.after}`);
  await ctx.say('{RIVAL}: Ich trainiere noch ein bisschen. Wir sehen uns oben!');
  const at = ctx.npcPos('rival');
  if (at) await ctx.moveNpc('rival', pathTo(at.x, at.y, RIVAL_TRAINING_SPOT.x, RIVAL_TRAINING_SPOT.y));
  ctx.setFlag('rival3_done');
  ctx.refreshNpcs();
}

const GATE_TEXT =
  'Der Gipfelpfad ist gefährlich, und oben treibt sich der Frostmantel herum.\fHüterin Firna lässt nur mit Firnabzeichen jemanden hinauf.';

export const FROSTALP: MapDef = {
  id: 'frostalp',
  name: 'Frostalp',
  kind: 'town',
  music: 'town',
  battleBg: 'snow',
  border: 'tree',
  baseTile: 'snow',
  tiles: [
    'TTTTTTTTTTT:::TTTTTTTTTT',
    'TTnnnnnnnTT:::TTTTTTTTTT',
    'Tinnnnnnnnn:::nnnnnn""TT',
    'Tnnnnnnnnnn:::nnnnnnn"nT',
    'Tnnnnnnnnnn:::SnnnnnnnnT',
    'TnnnnnnnnSn:::nnnnnnnnnT',
    'Tnn:::::::::::::::::nniT',
    'Tnnnnnnnnnn:::nnnnnnnnnT',
    'T""nnnnninn:::nnnnnnnnnT',
    'T"nnnnnnnnn:::nnnnnnnn"T',
    'Tnnnnnnnnnn:::nnnnnnnTTT',
    'Tnnnnnnnnnn:::nnnnnnnTTT',
    'TnnnnnnnSnn::::::::nnnnT',
    'Tnn:::::::::::nnnnnnnnnT',
    'TTnninnnnnn:::nnnnnnnnnT',
    'Tni~~~~iSnn:::nnnnnnnnnT',
    'Tn~~~~~~nnn:::nnnnnnnnnT',
    'Ti~~~~~innn:::nnnnnnnnnT',
    'Tnni~~innnn::::::::nn""T',
    'TnnnninnnnS:::nnnnnn"""T',
    'TTnnnnnnnnn:::nnnnnn""TT',
    'TTTTTTTTTTT:::TTTTTTTTTT',
  ],
  buildings: [
    { x: 2, y: 1, w: 7, h: 5, style: 'hall', door: { dx: 3, to: 'frostalp_hall', tx: FROSTALP_HALL_ARRIVAL.x, ty: FROSTALP_HALL_ARRIVAL.y } },
    { x: 16, y: 2, w: 5, h: 4, style: 'heal', door: { dx: 2, to: 'frostalp_center', tx: HEAL_CENTER_ARRIVAL.x, ty: HEAL_CENTER_ARRIVAL.y } },
    { x: 16, y: 8, w: 4, h: 4, style: 'shop', door: { dx: 1, to: 'frostalp_shop', tx: SHOP_ARRIVAL.x, ty: SHOP_ARRIVAL.y } },
    { x: 2, y: 9, w: 6, h: 4, style: 'house_blue', door: { dx: 3, to: 'frostalp_house_1', tx: HOUSE_ARRIVAL.x, ty: HOUSE_ARRIVAL.y } },
    { x: 15, y: 15, w: 5, h: 3, style: 'house_red', door: { dx: 2, to: 'frostalp_house_2', tx: HOUSE_ARRIVAL.x, ty: HOUSE_ARRIVAL.y } },
  ],
  connections: {
    down: { map: 'pfad_4', offset: -2 },
    up: { map: 'gipfelpfad', offset: -1 },
  },
  npcs: [
    {
      id: 'ranger_gate', x: 14, y: 2, facing: 'left', sprite: 'ranger',
      onTalk: async (ctx) => {
        if (!ctx.state.badges.includes(BADGE.id)) return ctx.say(GATE_TEXT);
        if (cleared(ctx.state)) return ctx.say('Siehst du das Leuchten da oben? Die Alpenglut brennt wieder!\fDas hab ich dir zu verdanken.');
        await ctx.say('Das Firnabzeichen! Dann darfst du hinauf.\fAuf halber Höhe hilft dir der Bergretter, wenn es eng wird.');
      },
    },
    {
      id: 'kid', x: 7, y: 7, facing: 'down', sprite: 'kid', movement: 'wander',
      onTalk: async (ctx) => {
        if (cleared(ctx.state)) return ctx.say('Ich hatte schon drei Tassen heiße Schokolade! Ich kann Farben hören!');
        await ctx.say('Heiße Schokolade! Im Gasthaus gibt\'s die beste!');
      },
    },
    {
      id: 'oldman', x: 15, y: 13, facing: 'left', sprite: 'oldman',
      onTalk: async (ctx) => {
        if (cleared(ctx.state)) return ctx.say('Spürst du das? Es wird wieder wärmer.\fDa oben brennt die Alpenglut wie früher.');
        await ctx.say('Seit Tagen wird es kälter. Die Alpenglut da oben flackert nur noch.');
      },
    },
    {
      id: 'rival', x: RIVAL.x, y: RIVAL.y, facing: 'left', sprite: 'rival',
      visible: (s) => !s.flags['rival3_done'],
      onTalk: rival3Scene,
    },
  ],
  signs: [
    { x: 10, y: 19, text: 'FROSTALP\nDas letzte Dorf vor dem Gipfel.' },
    { x: 9, y: 5, text: 'HALLE FROSTALP – Hüterin: Firna\nKlar wie Eis, still wie Schnee.' },
    { x: 14, y: 4, text: 'Norden: Gipfelpfad, Gipfelhorn' },
    { x: 8, y: 15, text: 'EISWEIHER\nWarme Quelle – friert nie zu. Baden auf eigene Gefahr!' },
    { x: 8, y: 12, text: 'GASTHAUS EDELWEISS' },
  ],
  hiddenItems: [{ x: 8, y: 8, item: 'full_potion', flag: 'hidden:frostalp:full_potion' }],
  triggers: [
    { ...ENTRANCE_STRIP, when: (s) => !s.flags['rival3_done'], script: rival3Scene },
    {
      x: 11, y: 2, w: 3,
      when: (s) => !s.badges.includes(BADGE.id),
      script: async (ctx) => {
        ctx.npcFacePlayer('ranger_gate');
        await ctx.say(GATE_TEXT);
        await ctx.movePlayer('D');
      },
    },
  ],
  encounters: ENCOUNTERS['frostalp'],
};

const exitTo = (door: { x: number; y: number }) => ({ map: 'frostalp', x: door.x, y: door.y });

export const FROSTALP_CENTER: MapDef = makeHealCenter({ id: 'frostalp_center', name: 'Frostalp', exit: exitTo(FROSTALP_DOORS.center) });

export const FROSTALP_SHOP: MapDef = makeShop({
  id: 'frostalp_shop',
  name: 'Frostalp',
  shopItems: SHOPS['frostalp'] ?? [],
  exit: exitTo(FROSTALP_DOORS.shop),
});

/** Gasthaus Edelweiß: Arven's research base. After the ending there is hot chocolate (and a reformed Bise). */
export const FROSTALP_HOUSE_1: MapDef = makeHouse({
  id: 'frostalp_house_1',
  name: 'Frostalp',
  variant: 2,
  exit: exitTo(FROSTALP_DOORS.house1),
  npcs: [
    {
      id: 'arven', x: 7, y: 4, facing: 'left', sprite: 'prof',
      onTalk: async (ctx) => {
        const gift = async () => {
          await ctx.giveItem('crystal_ultra', 3);
          ctx.setFlag('gift_arven_crystals');
        };
        if (cleared(ctx.state)) {
          await ctx.say('Ich hab das Leuchten bis hier unten gesehen, {PLAYER}.\fDu hast Alvenland gerettet. Ich bin so stolz auf dich!');
          if (ctx.state.dexCaught.includes('lindglut')) await ctx.say('Und Lindglut hat sich dir angeschlossen …\fDas hat noch nie jemand geschafft. Pass gut auf ihn auf.');
          else await ctx.say('Lindglut wacht wieder über die Flamme.\fVielleicht besuchst du ihn mal? Ich glaube, er mag dich.');
          if (ctx.flag('gift_arven_crystals')) return;
          await ctx.say('Ach, und die hier wollte ich dir längst geben. Für deine Sammlung!');
          return gift();
        }
        if (!ctx.flag('gift_arven_crystals')) {
          await ctx.emote('arven', 'exclaim');
          await ctx.say('{PLAYER}! Ich erforsche hier oben die Alpenglut. Sie wird schwächer –\fder Frostmantel steckt dahinter. Nimm diese, du wirst sie brauchen!');
          return gift();
        }
        await ctx.say('Der Wächter der Alpenglut heißt Lindglut. Wenn du ihm begegnest – sei behutsam.');
      },
    },
    {
      id: 'innkeeper', x: 2, y: 4, facing: 'right', sprite: 'woman',
      onTalk: async (ctx) => {
        if (!cleared(ctx.state)) {
          await ctx.say('Heiße Schokolade gibt\'s erst, wenn die Alpenglut wieder brennt. Versprochen!');
          return;
        }
        await ctx.say('Die Alpenglut brennt! Versprochen ist versprochen –\fheiße Schokolade für dich und deine Wildlinge!');
        await ctx.heal();
        await ctx.say('Mit extra Sahne. Geht aufs Haus!');
      },
    },
    {
      id: 'bise', x: 8, y: 5, facing: 'left', sprite: 'grunt', visible: cleared,
      text: [
        'Nenn mich nicht mehr Kommandantin. Einfach Bise.',
        'Die Schokolade hier ist … gar nicht übel.\fSag das bloß keinem.',
      ],
    },
  ],
});

/** Legend house, part 2: the old woman knows why the Alpenglut keeps burning. */
export const FROSTALP_HOUSE_2: MapDef = makeHouse({
  id: 'frostalp_house_2',
  name: 'Frostalp',
  variant: 0,
  exit: exitTo(FROSTALP_DOORS.house2),
  npcs: [
    {
      id: 'oldwoman', x: 7, y: 4, facing: 'left', sprite: 'oldwoman',
      onTalk: async (ctx) => {
        await ctx.say('Erlischt die Alpenglut, kommt der ewige Winter.\fDoch solange jemand mit warmem Herzen den Gipfel erreicht, brennt sie weiter.');
        if (ctx.flag('gift_frostalp_candy')) return;
        await ctx.say('Du hast so ein warmes Herz, das sehe ich. Hier, für unterwegs.');
        await ctx.giveItem('candy', 1);
        ctx.setFlag('gift_frostalp_candy');
      },
    },
  ],
});

/**
 * Halle 4: three stretches between rows of ice rocks, each with one gap on alternating sides. Every trainer
 * stands mid-stretch facing down, so the player has to pass right in front of them.
 */
export const FROSTALP_HALL: MapDef = {
  id: 'frostalp_hall',
  name: 'Frostalp',
  kind: 'indoor',
  music: 'hall',
  battleBg: 'hall',
  border: 'void',
  baseTile: 'hall_floor',
  tiles: [
    'wWwwwwwwwwWw',
    'hngggrrgggnh',
    'nggggrrggggn',
    'iiiiiiiiiggi',
    'nngggggggggn',
    'gggggggggggg',
    'gggnngggggng',
    'iggiiiiiiiii',
    'gggggggggnnn',
    'gggggggggggg',
    'nngggggggggg',
    'iiiiiiiiiggi',
    'knggggggggnk',
    'gggggggggggg',
    'kggggggggggk',
    'xxxxxxdxxxxx',
  ],
  warps: [{ x: 6, y: 15, to: 'frostalp', tx: FROSTALP_DOORS.hall.x, ty: FROSTALP_DOORS.hall.y, facing: 'down' }],
  npcs: [
    {
      id: 'leader_firna', x: 6, y: 1, facing: 'down', sprite: 'leader_frost',
      onTalk: async (ctx) => {
        const t = getTrainer(BADGE.leader);
        if (ctx.state.badges.includes(BADGE.id)) {
          await ctx.say(t.after);
          return;
        }
        await ctx.say(t.intro);
        if (!(await ctx.battle(t.id))) return;
        await ctx.say('Selbst mein Eis ist dir geschmolzen.\fHier, das hast du dir verdient!');
        await ctx.giveBadge(BADGE.id, BADGE.name);
        await ctx.giveItem('full_potion', 2);
        await ctx.say(t.after);
      },
    },
    { id: 'hall4_svea', x: 6, y: 4, facing: 'down', sprite: 'woman', trainer: { id: 'hall4_svea', sight: 3 } },
    { id: 'hall4_walter', x: 5, y: 8, facing: 'down', sprite: 'hiker', trainer: { id: 'hall4_walter', sight: 3 } },
    { id: 'hall4_anouk', x: 8, y: 12, facing: 'down', sprite: 'girl', trainer: { id: 'hall4_anouk', sight: 3 } },
    {
      id: 'advisor', x: 7, y: 14, facing: 'left', sprite: 'man',
      text: 'Tipp: Frost fürchtet Feuer, Metall und ganz normale Treffer!\fWasser und Wind frieren hier ein.',
    },
  ],
};
