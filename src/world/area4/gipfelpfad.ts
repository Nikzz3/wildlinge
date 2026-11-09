/**
 * Gipfelpfad: Frostalp → Gipfelhorn. Five snowy terraces between cliff bands, climbed in switchbacks (ledges let
 * you hop back down), the Frostmantel's last outposts, a mountain rescuer with tea half-way up and Kommandantin
 * Bise on the one-tile pass below the summit. See docs/WORLD.md "AREA 4".
 */
import type { MapDef, ScriptContext } from '../../core/contracts';
import { getTrainer } from '../../data';
import { ENCOUNTERS } from '../../data/encounters';

/** Bise stands on the one-tile pass; the player always faces her from the tile below. */
const PASS = { x: 11, y: 5 } as const;

async function biseBlockade(ctx: ScriptContext): Promise<void> {
  if (ctx.flag('gipfelpfad_cleared')) return;
  const t = getTrainer('admin_bise_2');
  ctx.playMusic('villain');
  await ctx.emote('bise', 'exclaim');
  ctx.npcFacePlayer('bise');
  ctx.facePlayer('up');
  if (!ctx.flag('bise2_met')) {
    ctx.setFlag('bise2_met');
    await ctx.say('Bise: Du schon wieder. Das Kind aus dem Funkenwerk.\fWeißt du eigentlich, wie kalt es hier oben ist?');
    await ctx.say('Bise: Eisner steht an der Flamme. Noch ein paar Minuten,\fdann ist es vorbei mit dem Sommer. Für immer.');
  }
  await ctx.say(`Bise: ${t.intro}`);
  await ctx.battle(t.id); // a loss blacks out and aborts; the trigger starts the scene again next time
  ctx.npcFacePlayer('bise');
  await ctx.say('Bise: Geh nur. Eisner wartet an der Flamme – mit dem Urkristall.\fIch … ich hab genug vom Winter.');
  await ctx.say('Bise: Drei Jahre friere ich schon für seinen Traum.\fIch geh nach Hause. Irgendwohin, wo es Suppe gibt.');
  await ctx.moveNpc('bise', 'UUUUU'); // over the pass and out of view
  ctx.setFlag('gipfelpfad_cleared');
  ctx.refreshNpcs();
}

export const GIPFELPFAD: MapDef = {
  id: 'gipfelpfad',
  name: 'Gipfelpfad',
  kind: 'route',
  music: 'route_mountain',
  battleBg: 'snow',
  border: 'cliff',
  baseTile: 'snow',
  tiles: [
    'MMMMMMMMMM:::MMMMMMMMM',
    'MMMMMMMMin:::nSiMMMMMM',
    'MMMMMMMinn:::nnnMMMMMM',
    'MMMMMMMMin:::nnMMMMMMM',
    'MMMMMMMMMMn:nMMMMMMMMM',
    'MMMMMMMMMMM:MMMMMMMMMM',
    'MMMMi"nnnnn:nnnn"iMMMM',
    'MMMn""nnnnn::::::nnMMM',
    'MMin"nnoinn::::::nn"MM',
    'MMMinnn"nnnnnnn::nnnMM',
    'MMMMMMMMMMMMMMM::MMMMM',
    'MMMMMMMMMMMMMMM::MMMMM',
    'MMn""nnnnnnnnnn::nn"MM',
    'MMn"nnnnnninnnn::nn"MM',
    'MMnnnnoinnnnnnn::nnnMM',
    'MMn::::::::::::::nnnMM',
    'MMn::::::::::::::nnnMM',
    'MMn::nnn""nnnnnnnn"nMM',
    'MMn::nn"""nnnnninnnnMM',
    'MMn::nnnnnnnnnnnnnoMMM',
    'MMn::nnnnnnnnnnnnnnnMM',
    'MMM::MMMM.......MMMMMM',
    'MMM::MMMMvvvvvvvMMMMMM',
    'MMn::nnn..*......nnnMM',
    'MMn::nn""n....nn""nnMM',
    'MMn::nn""nnoinnnn"nnMM',
    'MMn::::::::::::::::nMM',
    'MMn::::::::::::::::nMM',
    'MMn"""nnnnnnnnnn::nnMM',
    'MMnn""nnnninnnnn::nnMM',
    'MMnnnnnnnnnnnnnn::nnMM',
    'MMMMM........MMM::MMMM',
    'MMMMMvvvvvvvvMMM::MMMM',
    'MMnn..........nn::nnMM',
    'MMn""n.....nnnnn::nnMM',
    'MMn""nnnnnnninnn::nnMM',
    'MMn::::::::::::::::nMM',
    'MMn::::::::::::::::nMM',
    'MMn::nnnninnnnn"""nnMM',
    'MMn::nnnnnnnnnn"""nnMM',
    'MMn::nnnnnnnnnnnnnnnMM',
    'MMM::MMMM........MMMMM',
    'MMM::MMMMvvvvvvvvMMMMM',
    'MMn::nnn...*......""MM',
    'MMn::::::::::...nn""MM',
    'MMn::::::::::nnnoinnMM',
    'MMnnninnnS:::nnnnn"nMM',
    'MMMinnnnnn:::nnnnnnMMM',
    'MMMMinnnnn:::nnnnniMMM',
    'MMMMMMMMMM:::MMMMMMMMM',
  ],
  connections: {
    down: { map: 'frostalp', offset: 1 },
    up: { map: 'gipfelhorn', offset: -1 },
  },
  npcs: [
    { id: 'grunt_gipfel_1', x: 7, y: 43, facing: 'down', sprite: 'grunt', trainer: { id: 'grunt_gipfel_1', sight: 4 } },
    { id: 'gipfel_carla', x: 11, y: 34, facing: 'down', sprite: 'woman', trainer: { id: 'gipfel_carla', sight: 4 } },
    { id: 'grunt_gipfel_2', x: 9, y: 24, facing: 'down', sprite: 'grunt', trainer: { id: 'grunt_gipfel_2', sight: 4 } },
    { id: 'gipfel_rico', x: 10, y: 14, facing: 'down', sprite: 'hiker', trainer: { id: 'gipfel_rico', sight: 3 } },
    { id: 'grunt_gipfel_3', x: 14, y: 9, facing: 'up', sprite: 'grunt', trainer: { id: 'grunt_gipfel_3', sight: 4 } },
    {
      // half-way up; healing here also makes this the respawn point for the summit
      id: 'rescuer', x: 18, y: 28, facing: 'left', sprite: 'ranger',
      onTalk: async (ctx) => {
        await ctx.say('Ein Schluck Tee aus dem Fässchen meines Bernhardin?');
        await ctx.heal();
        await ctx.say('Weiter oben ist es eisig. Gib nicht auf!');
      },
    },
    {
      id: 'bise', x: PASS.x, y: PASS.y, facing: 'down', sprite: 'grunt',
      visible: (s) => !s.flags['gipfelpfad_cleared'],
      onTalk: biseBlockade,
    },
    {
      // the last word before the summit: save first
      id: 'climber', x: 9, y: 3, facing: 'right', sprite: 'hiker',
      onTalk: async (ctx) => {
        if (ctx.flag('game_cleared')) {
          await ctx.say('Die Alpenglut brennt wieder! Sogar meine Knie sind ganz warm.');
          return;
        }
        await ctx.say('Da oben wartet etwas Großes. Das spür ich in den Knien.');
        await ctx.say('Speicher lieber vorher – START, dann SPEICHERN.\fWer weiß, ob du so schnell wieder herunterkommst.');
      },
    },
  ],
  signs: [
    { x: 9, y: 46, text: 'GIPFELPFAD\nNur für geübte Bergsteiger!' },
    { x: 14, y: 1, text: 'GIPFELHORN, 3412 m\nDie Alpenglut ist nah.' },
  ],
  items: [
    { x: 3, y: 7, item: 'full_potion', flag: 'item:gipfelpfad:full_potion' },
    { x: 19, y: 13, item: 'revive', flag: 'item:gipfelpfad:revive' },
    { x: 3, y: 29, item: 'ether_full', flag: 'item:gipfelpfad:ether_full' },
    { x: 19, y: 39, item: 'crystal_ultra', qty: 2, flag: 'item:gipfelpfad:crystal_ultra' },
  ],
  hiddenItems: [
    { x: 7, y: 14, item: 'candy', flag: 'hidden:gipfelpfad:candy' },
    { x: 12, y: 25, item: 'restore', flag: 'hidden:gipfelpfad:restore' },
  ],
  triggers: [{ x: PASS.x, y: PASS.y + 1, when: (s) => !s.flags['gipfelpfad_cleared'], script: biseBlockade }],
  encounters: ENCOUNTERS['gipfelpfad'],
};
