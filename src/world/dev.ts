/**
 * Development/test maps (not reachable in the real game). dev_town exercises every outdoor tile,
 * the standard interiors, NPC behaviours, items, a sight trainer and a connection to dev_route.
 * Preview: npx tsx scripts/render-map.ts dev_town dev_route
 */
import type { EncounterTable, MapDef } from '../core/contracts';
import { HEAL_CENTER_ARRIVAL, HOUSE_ARRIVAL, makeHealCenter, makeHouse, makeShop, SHOP_ARRIVAL } from './templates';

const DEV_GRASS: EncounterTable = {
  rate: 0.15,
  slots: [
    { species: 'zwitschli', minLevel: 2, maxLevel: 4, weight: 40 },
    { species: 'munggli', minLevel: 2, maxLevel: 4, weight: 40 },
    { species: 'chaeferli', minLevel: 3, maxLevel: 5, weight: 20 },
  ],
};

const DEV_TOWN: MapDef = {
  id: 'dev_town',
  name: 'Dev-Stadt',
  kind: 'town',
  music: 'town',
  battleBg: 'grass',
  border: 'tree',
  tiles: [
    'TTTTTTTTTTTT::TTTTTTTTTT',
    'T...........::.....*.*.T',
    'T...........::.........T',
    'T...........::.........T',
    'T...........::.........T',
    'T.::::::::::::::::::::.T',
    'T.:.S.......::.......:.T',
    'T*:.........::..ffff.:*T',
    'T*:...o.....::.......:.T',
    'Tvvvvvvv....::..,,,,,:.T',
    'T.:.........::.,,,,,,:.T',
    'T.:......*..::.,,,,,,:.T',
    'Ts:sssss....::..,,,,.:.T',
    'T~=~~~~~s...::.......:.T',
    'T~=~~~~~so..::MMMMM..:.T',
    'Ts:sssss....::nnnnnn.:.T',
    'T.:.........::n"""in.:.T',
    'T.::::::::::::::::::::.T',
    'T......................T',
    'TTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  buildings: [
    { x: 1, y: 1, w: 5, h: 4, style: 'heal', door: { dx: 2, to: 'dev_center', ...txy(HEAL_CENTER_ARRIVAL) } },
    { x: 7, y: 1, w: 4, h: 4, style: 'shop', door: { dx: 1, to: 'dev_shop', ...txy(SHOP_ARRIVAL) } },
    { x: 15, y: 2, w: 4, h: 3, style: 'house_red', door: { dx: 1, to: 'dev_house', ...txy(HOUSE_ARRIVAL) } },
  ],
  connections: { up: { map: 'dev_route', offset: -6 } },
  npcs: [
    {
      id: 'girl', x: 8, y: 7, facing: 'down', sprite: 'girl', movement: 'wander',
      text: ['Ich laufe hier einfach herum.', 'Im hohen Gras östlich von hier leben wilde Wildlinge!'],
    },
    { id: 'oldman', x: 10, y: 10, facing: 'left', sprite: 'oldman', movement: 'turn', text: 'Früher war hier alles Wiese …' },
    {
      id: 'boy', x: 17, y: 6, facing: 'down', sprite: 'boy',
      onTalk: async (ctx) => {
        if (ctx.flag('dev_town_gift')) {
          await ctx.say('Pass gut auf deine Wildlinge auf!');
          return;
        }
        await ctx.emote('boy', 'question');
        await ctx.say('Oh, du hast ja noch kaum Ausrüstung dabei!');
        await ctx.emote('boy', 'heart');
        await ctx.giveItem('potion', 2);
        ctx.setFlag('dev_town_gift');
      },
    },
    { id: 'hiker', x: 21, y: 12, facing: 'up', sprite: 'hiker', trainer: { id: 'dev_hiker', sight: 4 } },
  ],
  signs: [{ x: 4, y: 6, text: 'DEV-STADT\nTestgelände für die Oberwelt.' }],
  items: [{ x: 10, y: 15, item: 'crystal', qty: 3, flag: 'item:dev_town:crystal' }],
  hiddenItems: [{ x: 9, y: 14, item: 'potion', flag: 'hidden:dev_town:potion' }],
  triggers: [
    {
      x: 12, y: 1, w: 2,
      when: (s) => !s.flags['dev_town_north_hint'],
      script: async (ctx) => {
        await ctx.say('Im Norden beginnt die Dev-Route.');
        ctx.setFlag('dev_town_north_hint');
      },
    },
  ],
  encounters: { grass: DEV_GRASS },
};

const DEV_ROUTE: MapDef = {
  id: 'dev_route',
  name: 'Dev-Route',
  kind: 'route',
  music: 'route',
  battleBg: 'grass',
  border: 'tree',
  tiles: [
    'TTTTTTTTTTTTTT',
    'T..,,,,,,,,..T',
    'T..,,,,,,,,..T',
    'T..,,,,,,,,..T',
    'T............T',
    'T.vvvv::vvvv.T',
    'T.....::.....T',
    'T.,,,.::.,,,.T',
    'T.,,,.::.,,,.T',
    'T.,,,.::.,,,.T',
    'T.....::.....T',
    'T..S..::.....T',
    'T.....::..o..T',
    'T.....::.....T',
    'T.....::.....T',
    'TTTTTT::TTTTTT',
  ],
  connections: { down: { map: 'dev_town', offset: 6 } },
  npcs: [
    { id: 'kid', x: 10, y: 10, facing: 'left', sprite: 'kid', trainer: { id: 'dev_kid', sight: 3 } },
    // looks down over the ledge and hops it to reach the player
    { id: 'ranger', x: 11, y: 3, facing: 'down', sprite: 'ranger', trainer: { id: 'dev_ranger', sight: 4 } },
  ],
  signs: [{ x: 3, y: 11, text: 'DEV-ROUTE\nSüden: Dev-Stadt' }],
  encounters: {
    grass: {
      rate: 0.12,
      slots: [
        { species: 'zwitschli', minLevel: 3, maxLevel: 6, weight: 35 },
        { species: 'munggli', minLevel: 3, maxLevel: 6, weight: 35 },
        { species: 'schneggli', minLevel: 4, maxLevel: 6, weight: 30 },
      ],
    },
  },
};

function txy(p: { x: number; y: number }): { tx: number; ty: number } {
  return { tx: p.x, ty: p.y };
}

export const DEV_MAPS: MapDef[] = [
  DEV_TOWN,
  DEV_ROUTE,
  makeHealCenter({ id: 'dev_center', name: 'Dev-Stadt', exit: { map: 'dev_town', x: 3, y: 5 } }),
  makeShop({ id: 'dev_shop', name: 'Dev-Stadt', shopItems: ['potion', 'antidote', 'crystal', 'repel'], exit: { map: 'dev_town', x: 8, y: 5 } }),
  makeHouse({
    id: 'dev_house',
    name: 'Dev-Stadt',
    exit: { map: 'dev_town', x: 16, y: 5 },
    npcs: [{ id: 'woman', x: 7, y: 4, facing: 'left', sprite: 'woman', text: 'Schön, dass du vorbeischaust!' }],
  }),
];
