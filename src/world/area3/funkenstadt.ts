/**
 * Funkenstadt, the busy city of tinkerers and power lines: its interiors, the clockmaker's gift and Halle 3
 * (Hüterin Zita). The Halle stays shut until the Funkenwerk is freed (funkenwerk.ts); the north path to Pfad 4
 * (area 4) opens with the Funkenabzeichen. See docs/WORLD.md "AREA 3".
 */
import type { MapDef } from '../../core/contracts';
import { getTrainer } from '../../data';
import { BADGES } from '../../data/badges';
import { ENCOUNTERS } from '../../data/encounters';
import { SHOPS } from '../../data/shops';
import { HEAL_CENTER_ARRIVAL, HOUSE_ARRIVAL, makeHealCenter, makeHouse, makeShop, SHOP_ARRIVAL } from '../templates';
import { caveWarp, FUNKEN_DOORS, FUNKEN_HALL_ARRIVAL, FUNKEN_WERK_ARRIVAL, MOUTHS } from './doors';

const BADGE = BADGES[2]!;
const GATE_TEXT = 'Pfad 4 führt hinauf in die Berge.\fOhne Funkenabzeichen lasse ich niemanden durch.';

export const FUNKENSTADT: MapDef = {
  id: 'funkenstadt',
  name: 'Funkenstadt',
  kind: 'town',
  music: 'city',
  battleBg: 'grass',
  border: 'tree',
  tiles: [
    'TTTTTTTTTTTTT:::TTTTTTTTTTTT',
    'T,,,,,,..L..f:::f..L....o..T',
    'T,,,,,.......:::...........T',
    'T...........Sqqq..........fT',
    'T............qqq...........T',
    'T............qqq...........T',
    'T............qqq..........fT',
    'T........S...qqq.S.........T',
    'T.qqqqqqqqqqqqqqqqqqqqqqqq.T',
    'T.qqqqqqqqqqqqqqqqqqqqqqqq.T',
    'TT*......**...qqqqq......*.T',
    'TT*......*.L..q~~~q.L.....TT',
    'T.............q~~~q.......TT',
    'T.............qqqqq........T',
    'T*............qqqqq........T',
    'T.............qqqqq.......fT',
    'T..qqqqqqqqqqqqqqqqqqqqqq..T',
    'T*.qqqqqqqqqqqqqqqqqqqqqq..T',
    'T..:::............fff::ffffT',
    'T.*:::S.o.......*.f,,,,,,,,T',
    'TM.:::.o..o.o.TT.*f,,,,,,,,T',
    'TMMMEMMMMMMMMTTTT.f,,,,,,,,T',
    'TMMMMMMMMMMMMMTTTTf,,,,,,,,T',
    'TMMMMMMMMMMMMMTTTTTTTTTTTTTT',
  ],
  buildings: [
    { x: 2, y: 3, w: 7, h: 5, style: 'hall', door: { dx: 3, to: 'funken_hall', tx: FUNKEN_HALL_ARRIVAL.x, ty: FUNKEN_HALL_ARRIVAL.y } },
    { x: 18, y: 3, w: 8, h: 5, style: 'lab', door: { dx: 4, to: 'funken_werk', tx: FUNKEN_WERK_ARRIVAL.x, ty: FUNKEN_WERK_ARRIVAL.y } },
    { x: 4, y: 12, w: 5, h: 4, style: 'heal', door: { dx: 2, to: 'funken_center', tx: HEAL_CENTER_ARRIVAL.x, ty: HEAL_CENTER_ARRIVAL.y } },
    { x: 10, y: 12, w: 4, h: 4, style: 'shop', door: { dx: 1, to: 'funken_shop', tx: SHOP_ARRIVAL.x, ty: SHOP_ARRIVAL.y } },
    { x: 19, y: 13, w: 5, h: 3, style: 'house_red', door: { dx: 2, to: 'funken_house_1', tx: HOUSE_ARRIVAL.x, ty: HOUSE_ARRIVAL.y } },
  ],
  warps: [caveWarp(MOUTHS.funken, 'glimmerhoehle_2', MOUTHS.g2Exit)],
  connections: { up: { map: 'pfad_4', offset: -4 } },
  npcs: [
    {
      id: 'hall_blocker', x: FUNKEN_DOORS.hall.x, y: FUNKEN_DOORS.hall.y, facing: 'down', sprite: 'scientist',
      visible: (s) => !s.flags['werk_cleared'],
      text: 'Die Halle ist zu! Hüterin Zita ist ins Funkenwerk gerannt –\fder Frostmantel hat es besetzt!',
    },
    {
      id: 'guard_north', x: 16, y: 2, facing: 'left', sprite: 'guard',
      onTalk: async (ctx) => {
        if (!ctx.state.badges.includes(BADGE.id)) await ctx.say(GATE_TEXT);
        else await ctx.say('Gute Reise! Pfad 4 führt hinauf nach Frostalp.\fZieh dich warm an – da oben liegt schon Schnee.');
      },
    },
    {
      id: 'boy', x: 24, y: 11, facing: 'up', sprite: 'boy',
      text: 'Unsere Gondeli fahren an selbst gesponnenen Stromseilen. Cool, oder?',
    },
    {
      id: 'woman', x: 19, y: 10, facing: 'left', sprite: 'woman', movement: 'wander',
      onTalk: async (ctx) => {
        if (!ctx.flag('werk_cleared')) await ctx.say('Seit der Frostmantel im Werk ist, flackert überall das Licht.');
        else await ctx.say('Das Licht brennt wieder! Danke dir!');
      },
    },
    {
      id: 'tinkerer', x: 11, y: 10, facing: 'down', sprite: 'scientist',
      text: 'Hörst du das Summen? Dieser Kasten summt in Fis-Dur.\fDer am Stadttor nur in F. Ich hab Ohren für so was.',
    },
    {
      id: 'oldman', x: 19, y: 12, facing: 'left', sprite: 'oldman', movement: 'turn',
      text: 'Früher war Funkenstadt ein stilles Bergdorf.\fDann schlug hier der erste Blitz ein – und ist einfach geblieben.',
    },
  ],
  signs: [
    { x: 6, y: 19, text: 'FUNKENSTADT\nDie Stadt, die niemals schläft – und immer summt.' },
    { x: 17, y: 7, text: 'FUNKENWERK\nStrom für ganz Alvenland' },
    { x: 9, y: 7, text: 'HALLE FUNKENSTADT\nHüterin: Zita – Volle Ladung voraus!' },
    { x: 12, y: 3, text: 'Norden: Pfad 4, Frostalp' },
  ],
  hiddenItems: [{ x: 8, y: 19, item: 'cure_all', flag: 'hidden:funkenstadt:cure_all' }],
  triggers: [
    {
      x: 13, y: 2, w: 3,
      when: (s) => !s.badges.includes(BADGE.id),
      script: async (ctx) => {
        ctx.npcFacePlayer('guard_north');
        await ctx.say(GATE_TEXT);
        await ctx.movePlayer('D');
      },
    },
  ],
  encounters: ENCOUNTERS['funkenstadt'],
};

const exitTo = (door: { x: number; y: number }) => ({ map: 'funkenstadt', x: door.x, y: door.y });

export const FUNKEN_CENTER: MapDef = makeHealCenter({ id: 'funken_center', name: 'Funkenstadt', exit: exitTo(FUNKEN_DOORS.center) });

export const FUNKEN_SHOP: MapDef = makeShop({
  id: 'funken_shop',
  name: 'Funkenstadt',
  shopItems: SHOPS['funkenstadt'] ?? [],
  exit: exitTo(FUNKEN_DOORS.shop),
});

export const FUNKEN_HOUSE_1: MapDef = makeHouse({
  id: 'funken_house_1',
  name: 'Funkenstadt',
  variant: 1,
  exit: exitTo(FUNKEN_DOORS.house1),
  npcs: [
    {
      id: 'anton', x: 7, y: 4, facing: 'left', sprite: 'oldman',
      onTalk: async (ctx) => {
        if (!ctx.flag('werk_cleared')) {
          await ctx.say('Mein Guggerli ruft nicht mehr pünktlich. Der Strom flackert dauernd!');
          return;
        }
        if (!ctx.flag('gift_guggerli')) {
          await ctx.emote('anton', 'heart');
          await ctx.say('Endlich wieder Strom! Mein Guggerli hatte Junge.\fNimm eins – es ist pünktlicher als jede Uhr!');
          await ctx.giveCreature('guggerli', 24, { nickname: true });
          ctx.setFlag('gift_guggerli');
          return;
        }
        await ctx.say('Kuckuck! … Ah, schon wieder Viertel nach.\fSeit das Werk läuft, stimmt hier jede Uhr.');
      },
    },
  ],
});

export const FUNKEN_HALL: MapDef = {
  id: 'funken_hall',
  name: 'Funkenstadt',
  kind: 'indoor',
  music: 'hall',
  battleBg: 'hall',
  border: 'void',
  baseTile: 'hall_floor',
  tiles: [
    'wWwwwwwwwwWw',
    'hggggrrggggh',
    'gggggrrggggg',
    'gggggggggggg',
    'LLLLLLLgggLL',
    'kggggggggggk',
    'gggggggggggg',
    'LLgggLLLLLLL',
    'gggggggggggg',
    'kggggggggggk',
    'LLLLLLLLggLL',
    'gggggggggggg',
    'gggggggggggg',
    'kggghgghgggk',
    'gggggggggggg',
    'xxxxxxdxxxxx',
  ],
  warps: [{ x: 6, y: 15, to: 'funkenstadt', tx: FUNKEN_DOORS.hall.x, ty: FUNKEN_DOORS.hall.y, facing: 'down' }],
  npcs: [
    {
      id: 'leader_zita', x: 6, y: 1, facing: 'down', sprite: 'leader_spark',
      onTalk: async (ctx) => {
        const t = getTrainer(BADGE.leader);
        if (ctx.state.badges.includes(BADGE.id)) {
          await ctx.say(t.after);
          return;
        }
        await ctx.say(t.intro);
        if (!(await ctx.battle(t.id))) return;
        await ctx.say('Was für eine Spannung! Du hast mehr Energie als mein ganzes Werk.\fHier, das hast du dir verdient!');
        await ctx.giveBadge(BADGE.id, BADGE.name);
        await ctx.giveItem('ether', 2);
        await ctx.say(t.after);
        await ctx.say('Und pass auf dich auf. Bise ist mit dem Urkristall in die Berge.\fWenn jemand den Frostmantel aufhält, dann du.');
      },
    },
    // each trainer watches the gap in a row of machines, so the player has to pass in front of them
    { id: 'hall3_jola', x: 10, y: 9, facing: 'left', sprite: 'girl', trainer: { id: 'hall3_jola', sight: 3 } },
    { id: 'hall3_max', x: 5, y: 6, facing: 'left', sprite: 'scientist', trainer: { id: 'hall3_max', sight: 3 } },
    { id: 'hall3_ben', x: 10, y: 3, facing: 'left', sprite: 'man', trainer: { id: 'hall3_ben', sight: 3 } },
    {
      id: 'advisor', x: 7, y: 14, facing: 'left', sprite: 'man',
      text: 'Tipp: Blitz fürchtet Erde und Metall!\fWasser- und Wind-Wildlinge kriegen hier eine gewischt.',
    },
  ],
};
