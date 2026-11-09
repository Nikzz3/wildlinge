/** Moosbach (home village) with the player's and the rival's house. See docs/WORLD.md "AREA 1". */
import type { MapDef } from '../../core/contracts';
import { HOUSE_ARRIVAL, makeHouse } from '../templates';
import { LAB_ARRIVAL, MOOSBACH_DOORS, PLAYER_ROOM } from './doors';

export const MOOSBACH: MapDef = {
  id: 'moosbach',
  name: 'Moosbach',
  kind: 'town',
  music: 'home',
  battleBg: 'grass',
  border: 'tree',
  tiles: [
    'TTTTTTTTT::TTTTTTTTT',
    'TTTTTT*.T::TTTTTTTTT',
    'TTT*....S::.......TT',
    'TT.......::........T',
    'T........::........T',
    'T........::........T',
    'T.S.::::::::::::.S.T',
    'T.......*::*.......T',
    'T........::........T',
    'T........::..ffffffT',
    'T........::..f****fT',
    'T........::..ffffffT',
    'T....S::::::::.....T',
    'T*...........:.sss.T',
    'T**.fffff....:s~~~sT',
    'TT*.f***f...*.s~~~sT',
    'TTT.fffff.TT..sssTTT',
    'TTTTTTTTTTTTTTTTTTTT',
  ],
  buildings: [
    { x: 2, y: 3, w: 5, h: 3, style: 'house_red', door: { dx: 2, to: 'player_house', tx: HOUSE_ARRIVAL.x, ty: HOUSE_ARRIVAL.y } },
    { x: 13, y: 3, w: 5, h: 3, style: 'house_blue', door: { dx: 2, to: 'rival_house', tx: HOUSE_ARRIVAL.x, ty: HOUSE_ARRIVAL.y } },
    { x: 2, y: 8, w: 7, h: 4, style: 'lab', door: { dx: 4, to: 'arven_lab', tx: LAB_ARRIVAL.x, ty: LAB_ARRIVAL.y } },
  ],
  connections: { up: { map: 'pfad_1', offset: 0 } },
  npcs: [
    {
      id: 'kid_north', x: 11, y: 2, facing: 'left', sprite: 'kid',
      onTalk: async (ctx) => {
        if (!ctx.flag('got_starter')) {
          await ctx.say('Ich pass hier auf, dass niemand ohne Wildling ins hohe Gras läuft.\fIch bin nämlich sehr wichtig!');
          return;
        }
        await ctx.say('Pfad 1 führt nach Kieselstadt. Im hohen Gras wohnen wilde Wildlinge!');
      },
    },
    {
      id: 'woman', x: 10, y: 14, facing: 'down', sprite: 'woman', movement: 'wander',
      text: 'Moosbach ist klein, aber hier wächst das weichste Moos im ganzen Tal.',
    },
    {
      id: 'oldman', x: 13, y: 15, facing: 'right', sprite: 'oldman', movement: 'turn',
      text: [
        'Siehst du den Gipfel dort oben? Dort brennt die Alpenglut.\fOhne sie hätten wir ewigen Winter.',
      ],
    },
    {
      id: 'girl', x: 12, y: 10, facing: 'right', sprite: 'girl',
      text: 'Das sind Omas Moosglöckchen. Sie läuten, wenn es regnet.\fEhrlich! Na gut, ganz leise.',
    },
  ],
  signs: [
    { x: 8, y: 2, text: 'MOOSBACH\nWo der Morgentau am längsten bleibt.' },
    { x: 2, y: 6, text: 'Hier wohnt {PLAYER}.' },
    { x: 17, y: 6, text: 'Hier wohnt {RIVAL}.' },
    { x: 5, y: 12, text: 'LABOR VON PROFESSORIN ARVEN\nWildlingforschung und Arventee' },
  ],
  hiddenItems: [{ x: 1, y: 14, item: 'potion', flag: 'hidden:moosbach:potion' }],
  triggers: [
    {
      x: 9, y: 2, w: 2,
      when: (s) => !s.flags['got_starter'],
      script: async (ctx) => {
        await ctx.emote('kid_north', 'exclaim');
        ctx.npcFacePlayer('kid_north');
        await ctx.say('Halt! Ohne eigenen Wildling ins hohe Gras? Viel zu gefährlich!\fGeh erst zu Professorin Arven ins Labor.');
        await ctx.movePlayer('D');
      },
    },
  ],
};

export const PLAYER_HOUSE: MapDef = {
  ...makeHouse({
    id: 'player_house',
    name: 'Moosbach',
    variant: 0,
    exit: { map: 'moosbach', ...MOOSBACH_DOORS.playerHouse },
    npcs: [
      {
        id: 'mom', x: 7, y: 4, facing: 'left', sprite: 'mom',
        onTalk: async (ctx) => {
          if (!ctx.flag('got_starter')) {
            await ctx.say('Guten Morgen, {PLAYER}! Professorin Arven hat nach dir gefragt.\fIhr Labor ist das große Haus mit dem flachen Dach.');
            return;
          }
          if (!ctx.flag('gift_mom_potions')) {
            await ctx.emote('mom', 'heart');
            await ctx.say('Ein eigener Wildling! Wie aufregend!\fHier, nimm das für unterwegs.');
            await ctx.giveItem('potion', 2);
            ctx.setFlag('gift_mom_potions');
          } else if (ctx.state.badges.includes('badge_earth')) {
            await ctx.say('Das Felsabzeichen! Das kommt in die Vitrine, gleich neben dein Schwimmabzeichen.');
          }
          await ctx.say('Ruh dich kurz aus.');
          await ctx.heal();
          await ctx.say('Pass gut auf dich auf!');
        },
      },
    ],
  }),
  // first morning: mom calls from the kitchen while the player (no Wildling yet) is still next to the bed
  onEnter: async (ctx) => {
    const inBed = ctx.player.x === PLAYER_ROOM.x && ctx.player.y === PLAYER_ROOM.y;
    if (ctx.flag('got_starter') || ctx.state.party.length > 0 || !inBed) return;
    await ctx.wait(30);
    await ctx.emote('mom', 'exclaim');
    await ctx.say('{PLAYER}, bist du endlich wach? Komm mal kurz her, Schlafmütze!');
  },
};

export const RIVAL_HOUSE: MapDef = makeHouse({
  id: 'rival_house',
  name: 'Moosbach',
  variant: 1,
  exit: { map: 'moosbach', ...MOOSBACH_DOORS.rivalHouse },
  npcs: [
    {
      id: 'grandma', x: 7, y: 4, facing: 'left', sprite: 'oldwoman',
      onTalk: async (ctx) => {
        if (!ctx.flag('rival1_done')) {
          await ctx.say('{RIVAL} ist schon vor Sonnenaufgang zum Labor gerannt. Typisch!');
          return;
        }
        await ctx.say('{RIVAL} will immer der Erste sein. Den Dickkopf hat er von mir!');
      },
    },
  ],
});
