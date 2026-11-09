/**
 * Kieselstadt, its interiors, Halle 1 (Hüter Jost) and the closing beat of chapter 1. See docs/WORLD.md "AREA 1".
 * The east exit leads to Pfad 2 (area 2) once the player has the Felsabzeichen.
 */
import type { MapDef, ScriptContext } from '../../core/contracts';
import { getTrainer } from '../../data';
import { BADGES } from '../../data/badges';
import { SHOPS } from '../../data/shops';
import { HEAL_CENTER_ARRIVAL, HOUSE_ARRIVAL, makeHealCenter, makeHouse, makeShop, SHOP_ARRIVAL } from '../templates';
import { HALL_ARRIVAL, KIESEL_DOORS } from './doors';

const BADGE = BADGES[0]!;
/**
 * Set once the closing beat in front of the Halle has played. (Saves from the chapter-1 release, where this
 * beat ended with the credits, already have it – they simply continue east.)
 */
const CHAPTER1_FLAG = 'chapter1_cleared';
const endingPending = (s: { badges: string[]; flags: Record<string, boolean> }) =>
  s.badges.includes(BADGE.id) && !s.flags[CHAPTER1_FLAG];

/** Staged walks: from beside the Halle door (12,6) down and out of view towards the east gate / the south. */
const RIVAL_EXIT_PATH = 'DDDDRRRRRRRRR';
const ARVEN_EXIT_PATH = 'DDDDDD';

/**
 * Closing beat after the first badge: {RIVAL} and Professorin Arven wait outside the Halle, then send the
 * player east (Pfad 2 → Flüsterwald → Seewil). `staged` = the player just walked out of the Halle door, so
 * the two can step up to them and walk off afterwards.
 */
async function chapterEnding(ctx: ScriptContext, staged: boolean): Promise<void> {
  ctx.playMusic('rival');
  await ctx.emote('rival', 'exclaim');
  if (staged) {
    await ctx.moveNpc('rival', 'L');
    ctx.facePlayer('right');
  }
  ctx.npcFacePlayer('rival');
  await ctx.say('{RIVAL}: Da bist du ja! Und? Zeig her …\fDas Felsabzeichen! Nicht schlecht, Schnecke.');
  await ctx.say('{RIVAL}: Ich hab Jost vorhin auch herausgefordert.\fSagen wir … er hatte einen sehr guten Tag.');
  ctx.playMusic('lab');
  if (staged) {
    await ctx.moveNpc('arven', 'U');
    ctx.facePlayer('down');
  }
  ctx.npcFacePlayer('arven');
  await ctx.say('Arven: {PLAYER}! Ich musste einfach selbst vorbeikommen.\fDein erstes Abzeichen – und das schon am ersten Tag!');
  await ctx.emote('arven', 'heart');
  await ctx.say('Arven: Ich bin stolz auf dich. Und auf deine Wildlinge.\fIhr seid ein richtig gutes Team geworden.');
  await ctx.say('Arven: Mit dem Abzeichen lässt dich die Wache am Osttor durch.\fPfad 2 führt zum Flüsterwald und weiter nach Seewil.');
  await ctx.say('Arven: In Seewil wohnt mein Kollege Matti.\fEr hat den dritten Wildling dabei – schau bei ihm vorbei!');
  ctx.playMusic('rival');
  if (staged) ctx.facePlayer('right');
  ctx.npcFacePlayer('rival');
  await ctx.say('{RIVAL}: Seewil hat auch eine Halle. Diesmal bin ich zuerst dort!\fWer trödelt, verliert. Bis dann, Schnecke!');
  if (staged) await ctx.moveNpc('rival', RIVAL_EXIT_PATH);
  ctx.playMusic('lab');
  if (staged) ctx.facePlayer('down');
  ctx.npcFacePlayer('arven');
  await ctx.say('Arven: Typisch {RIVAL}. Na los, hinterher!\fIch fahre zurück ins Labor. Gute Reise, {PLAYER}!');
  if (staged) await ctx.moveNpc('arven', ARVEN_EXIT_PATH);
  ctx.setFlag(CHAPTER1_FLAG);
  ctx.refreshNpcs();
}

export const KIESELSTADT: MapDef = {
  id: 'kieselstadt',
  name: 'Kieselstadt',
  kind: 'town',
  music: 'town',
  battleBg: 'grass',
  border: 'tree',
  tiles: [
    'TTTTTTTTTTTTTTTTTTTTTTTT',
    'TMMMMMMT........TMMMMMMT',
    'TMsossMs.........MMMMMMT',
    'TMssssss...........MMMMT',
    'TMosssss.....*.......oTT',
    'TMMsso.................T',
    'TT.ss....S.::.........TT',
    'T*.........::.........TT',
    'T..........::::::::...TT',
    'T....ss....::.........oT',
    'T..........:::::::::::::',
    'T..........:::::::::::::',
    'T...::::::::::::::::::::',
    'T..........::.......S.oT',
    'T.*........::...*.....TT',
    'T........o.::..........T',
    'T*.........::..........T',
    'T..........::.......o..T',
    'T....::::::::::::::....T',
    'T.*..o....S::.....o..*.T',
    'TT*........::.........TT',
    'TTTTTTTTTTT::TTTTTTTTTTT',
  ],
  buildings: [
    { x: 8, y: 1, w: 7, h: 5, style: 'hall', door: { dx: 3, to: 'kiesel_hall', tx: HALL_ARRIVAL.x, ty: HALL_ARRIVAL.y } },
    { x: 2, y: 8, w: 5, h: 4, style: 'heal', door: { dx: 2, to: 'kiesel_center', tx: HEAL_CENTER_ARRIVAL.x, ty: HEAL_CENTER_ARRIVAL.y } },
    { x: 17, y: 4, w: 4, h: 4, style: 'shop', door: { dx: 1, to: 'kiesel_shop', tx: SHOP_ARRIVAL.x, ty: SHOP_ARRIVAL.y } },
    { x: 15, y: 15, w: 5, h: 3, style: 'house_green', door: { dx: 2, to: 'kiesel_house_1', tx: HOUSE_ARRIVAL.x, ty: HOUSE_ARRIVAL.y } },
    { x: 3, y: 15, w: 5, h: 3, style: 'house_red', door: { dx: 2, to: 'kiesel_house_2', tx: HOUSE_ARRIVAL.x, ty: HOUSE_ARRIVAL.y } },
  ],
  connections: {
    down: { map: 'pfad_1', offset: -2 },
    right: { map: 'pfad_2', offset: -2 },
  },
  npcs: [
    {
      id: 'guard_east', x: 21, y: 9, facing: 'down', sprite: 'guard',
      onTalk: async (ctx) => {
        if (!ctx.state.badges.includes(BADGE.id)) {
          await ctx.say('Halt! Der Weg nach Osten ist steinig und steil.\fNur wer das Felsabzeichen von Hüter Jost trägt, darf hier durch.');
          return;
        }
        await ctx.say('Gute Reise! Pfad 2 führt zum Flüsterwald.');
      },
    },
    {
      id: 'worker', x: 7, y: 5, facing: 'left', sprite: 'man',
      text: 'Kieselstadt ist auf Fels gebaut. Unsere Halle auch – und Hüter Jost sowieso.',
    },
    {
      id: 'kid', x: 15, y: 13, facing: 'down', sprite: 'kid', movement: 'wander',
      text: 'Im Laden gibt\'s Fangkristalle! Ich spare schon seit Wochen.',
    },
    {
      id: 'oldwoman', x: 18, y: 13, facing: 'up', sprite: 'oldwoman',
      text: 'Pfad 2 im Osten führt zum Flüsterwald. Dahinter liegt Seewil am See.',
    },
    // closing scene: waiting outside the Halle after the first badge
    {
      id: 'rival', x: 13, y: 6, facing: 'left', sprite: 'rival', visible: endingPending,
      onTalk: (ctx) => chapterEnding(ctx, false),
    },
    {
      id: 'arven', x: 11, y: 8, facing: 'up', sprite: 'prof', visible: endingPending,
      onTalk: (ctx) => chapterEnding(ctx, false),
    },
  ],
  signs: [
    { x: 10, y: 19, text: 'KIESELSTADT\nSteinig, stur und herzlich.' },
    { x: 9, y: 6, text: 'HALLE KIESELSTADT\nHüter: Jost – Fest wie Granit!' },
    { x: 20, y: 13, text: 'Osten: Pfad 2, Flüsterwald' },
  ],
  items: [{ x: 21, y: 19, item: 'repel', flag: 'item:kieselstadt:repel' }],
  hiddenItems: [{ x: 3, y: 2, item: 'candy', flag: 'hidden:kieselstadt:candy' }],
  triggers: [
    {
      x: 21, y: 10, h: 3,
      when: (s) => !s.badges.includes(BADGE.id),
      script: async (ctx) => {
        ctx.npcFacePlayer('guard_east');
        await ctx.say('Halt! Der Weg nach Osten ist steinig und steil.\fNur wer das Felsabzeichen von Hüter Jost trägt, darf hier durch.');
        await ctx.movePlayer('L');
      },
    },
  ],
  onEnter: async (ctx) => {
    if (!endingPending(ctx.state)) return;
    const atHallDoor = ctx.player.x === KIESEL_DOORS.hall.x && ctx.player.y === KIESEL_DOORS.hall.y;
    if (atHallDoor) await chapterEnding(ctx, true);
  },
};

const exitTo = (door: { x: number; y: number }) => ({ map: 'kieselstadt', x: door.x, y: door.y });

export const KIESEL_CENTER: MapDef = makeHealCenter({ id: 'kiesel_center', name: 'Kieselstadt', exit: exitTo(KIESEL_DOORS.center) });

export const KIESEL_SHOP: MapDef = makeShop({
  id: 'kiesel_shop',
  name: 'Kieselstadt',
  shopItems: SHOPS['kieselstadt'] ?? [],
  exit: exitTo(KIESEL_DOORS.shop),
});

export const KIESEL_HOUSE_1: MapDef = makeHouse({
  id: 'kiesel_house_1',
  name: 'Kieselstadt',
  variant: 2,
  exit: exitTo(KIESEL_DOORS.house1),
  npcs: [
    {
      id: 'collector', x: 7, y: 4, facing: 'left', sprite: 'oldman',
      onTalk: async (ctx) => {
        if (ctx.flag('gift_kiesel_crystals')) {
          await ctx.say('Der schönste Stein ist der, den man selbst findet.');
          return;
        }
        await ctx.say('Ich sammle Steine, du sammelst Wildlinge. Hier, für deine Sammlung!');
        await ctx.giveItem('crystal', 3);
        ctx.setFlag('gift_kiesel_crystals');
      },
    },
  ],
});

export const KIESEL_HOUSE_2: MapDef = makeHouse({
  id: 'kiesel_house_2',
  name: 'Kieselstadt',
  variant: 1,
  exit: exitTo(KIESEL_DOORS.house2),
  npcs: [
    {
      id: 'girl', x: 2, y: 4, facing: 'right', sprite: 'girl',
      text: 'Pflanze schlägt Wasser, Wasser schlägt Feuer, Feuer schlägt Pflanze. Ganz einfach!',
    },
    {
      id: 'man', x: 7, y: 4, facing: 'left', sprite: 'man',
      text: 'Blitze können Erde-Wildlingen gar nichts anhaben. Merk dir das für später!',
    },
  ],
});

export const KIESEL_HALL: MapDef = {
  id: 'kiesel_hall',
  name: 'Kieselstadt',
  kind: 'indoor',
  music: 'hall',
  battleBg: 'hall',
  border: 'void',
  baseTile: 'hall_floor',
  tiles: [
    'wWwwwwwwwWw',
    'hgggrrrgggh',
    'ggggrrrgggg',
    'ggooooooooo',
    'ggggggggggg',
    'ggggggggggg',
    'ooooooooogg',
    'ggggggggggg',
    'ggggggggggg',
    'ggooooooooo',
    'ggggggggggg',
    'gggghghgggg',
    'kgggggggggk',
    'xxxxxdxxxxx',
  ],
  warps: [{ x: 5, y: 13, to: 'kieselstadt', tx: KIESEL_DOORS.hall.x, ty: KIESEL_DOORS.hall.y, facing: 'down' }],
  npcs: [
    {
      id: 'leader_jost', x: 5, y: 1, facing: 'down', sprite: 'leader_earth',
      onTalk: async (ctx) => {
        const t = getTrainer(BADGE.leader);
        if (ctx.state.badges.includes(BADGE.id)) {
          await ctx.say(t.after);
          return;
        }
        await ctx.say(t.intro);
        if (!(await ctx.battle(t.id))) return;
        await ctx.say('Hier, das hast du dir verdient!');
        await ctx.giveBadge(BADGE.id, BADGE.name);
        await ctx.giveItem('super_potion', 2);
        await ctx.say(t.after);
      },
    },
    { id: 'hall1_urs', x: 10, y: 7, facing: 'left', sprite: 'man', trainer: { id: 'hall1_urs', sight: 3 } },
    { id: 'hall1_vreni', x: 0, y: 4, facing: 'right', sprite: 'woman', trainer: { id: 'hall1_vreni', sight: 3 } },
    {
      id: 'advisor', x: 4, y: 12, facing: 'right', sprite: 'man',
      text: 'Tipp: Erde fürchtet Pflanzen, Wasser und Frost!\fFeuer und Blitz haben hier einen schweren Stand.',
    },
  ],
};
