/**
 * Glimmerhöhle 1 + 2: the crystal cave between Pfad 3 and Funkenstadt. Glimmerquarz (the blue crystals) grows
 * out of the walls; Frostmantel grunts haul it off for their Frostkern, and Petra blocks the last corridor before
 * the exit to Funkenstadt. See docs/WORLD.md "AREA 3".
 */
import type { MapDef, ScriptContext } from '../../core/contracts';
import { getTrainer } from '../../data';
import { ENCOUNTERS } from '../../data/encounters';
import { caveWarp, MOUTHS } from './doors';

/** Petra stands in the 1-tile corridor below the exit; the player always faces her from the tile below. */
const PETRA = { x: 17, y: 3 } as const;

async function petrasBlockade(ctx: ScriptContext): Promise<void> {
  if (ctx.flag('cave_cleared')) return;
  const t = getTrainer('grunt_hoehle_2');
  ctx.playMusic('villain');
  await ctx.emote('grunt_petra', 'exclaim');
  ctx.npcFacePlayer('grunt_petra');
  ctx.facePlayer('up');
  await ctx.say('Halt! Hier wird gerade streng geheimer Glimmerquarz geliefert.\fAlso … wurde. Die letzte Kiste ist schon weg.');
  await ctx.say(t.intro);
  await ctx.battle(t.id); // a loss blacks out and aborts the script
  ctx.npcFacePlayer('grunt_petra');
  await ctx.say('Der Glimmerquarz ist längst im Funkenwerk!\fDie Kommandantin baut dort unseren Frostkern zusammen!');
  await ctx.say('Ups. Das war auch geheim.\fVergiss es bitte wieder. Am besten sofort. Brrr!');
  await ctx.moveNpc('grunt_petra', 'UU');
  ctx.setFlag('cave_cleared');
  ctx.refreshNpcs();
}

export const GLIMMERHOEHLE_1: MapDef = {
  id: 'glimmerhoehle_1',
  name: 'Glimmerhöhle',
  kind: 'cave',
  music: 'cave',
  battleBg: 'cave',
  border: 'cave_wall',
  tiles: [
    '############################',
    '#####################E######',
    '###i____i#####_#####____####',
    '##i______________________###',
    '##_____________________i####',
    '##o______##########_____i###',
    '###i_____###########o___i###',
    '#######__############___####',
    '#######___________##########',
    '######o__i_~~i_____i##i___##',
    '######____~~~~____________##',
    '#######___~~~_____________##',
    '########_____i____o_###__i##',
    '##___####______##__#########',
    '##___############__#########',
    '##___i###########__#########',
    '##_______########__#########',
    '##i____i_o####o_____i#######',
    '##________####_______i##_i##',
    '##__i_____________________##',
    '##_________________i______##',
    '##_______i####________o__o##',
    '###i____o###################',
    '######E#####################',
  ],
  warps: [
    caveWarp(MOUTHS.g1Entrance, 'pfad_3', MOUTHS.pfad3),
    caveWarp(MOUTHS.g1Passage, 'glimmerhoehle_2', MOUTHS.g2Passage),
  ],
  npcs: [
    // Godi watches the room behind the tunnel; every way north crosses his column
    { id: 'hoehle_godi', x: 16, y: 21, facing: 'up', sprite: 'hiker', trainer: { id: 'hoehle_godi', sight: 4 } },
    // Lars waits in a niche above the upper gallery, looking across it
    { id: 'grunt_hoehle_1', x: 14, y: 2, facing: 'down', sprite: 'grunt', trainer: { id: 'grunt_hoehle_1', sight: 4 } },
  ],
  items: [
    { x: 25, y: 10, item: 'revive', flag: 'item:glimmerhoehle_1:revive' },
    { x: 2, y: 13, item: 'para_cure', flag: 'item:glimmerhoehle_1:para_cure' },
  ],
  hiddenItems: [{ x: 25, y: 18, item: 'ether', flag: 'hidden:glimmerhoehle_1:ether' }],
  encounters: ENCOUNTERS['glimmerhoehle_1'],
};

export const GLIMMERHOEHLE_2: MapDef = {
  id: 'glimmerhoehle_2',
  name: 'Glimmerhöhle',
  kind: 'cave',
  music: 'cave',
  battleBg: 'cave',
  border: 'cave_wall',
  tiles: [
    '########################',
    '#################E######',
    '#################_##i__#',
    '#################_##___#',
    '#################_##___#',
    '###############________#',
    '###____i######i_______o#',
    '##i______#####_______i##',
    '##_______i#####______i##',
    '##____________________##',
    '##o_____i_#####______i##',
    '###___i__#####______o###',
    '###__##########i__~~####',
    '###__###########_~~#####',
    '###__###################',
    '##___###################',
    '##_____#################',
    '##i_____o###############',
    '##_______####i___i######',
    '##_________________#####',
    '##_________________#####',
    '##_______####i____######',
    '###i__o#################',
    '####E###################',
  ],
  warps: [
    caveWarp(MOUTHS.g2Passage, 'glimmerhoehle_1', MOUTHS.g1Passage),
    caveWarp(MOUTHS.g2Exit, 'funkenstadt', MOUTHS.funken),
  ],
  npcs: [
    // Fredi watches the mouth of the narrow tunnel into the crystal hall (and stops beside it, not in it)
    { id: 'hoehle_fredi', x: 19, y: 9, facing: 'left', sprite: 'hiker', trainer: { id: 'hoehle_fredi', sight: 4 } },
    {
      id: 'grunt_petra', x: PETRA.x, y: PETRA.y, facing: 'down', sprite: 'grunt',
      visible: (s) => !s.flags['cave_cleared'],
      onTalk: petrasBlockade,
    },
  ],
  items: [
    { x: 21, y: 2, item: 'crystal_great', qty: 2, flag: 'item:glimmerhoehle_2:crystal_great' },
    { x: 17, y: 20, item: 'candy', flag: 'item:glimmerhoehle_2:candy' },
  ],
  hiddenItems: [{ x: 2, y: 7, item: 'super_potion', flag: 'hidden:glimmerhoehle_2:super_potion' }],
  triggers: [{ x: PETRA.x, y: PETRA.y + 1, when: (s) => !s.flags['cave_cleared'], script: petrasBlockade }],
  encounters: ENCOUNTERS['glimmerhoehle_2'],
};
