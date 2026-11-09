/** Professorin Arven's lab: starter choice and the first rival battle. See docs/WORLD.md "AREA 1". */
import type { MapDef, NpcDef, ScriptContext } from '../../core/contracts';
import { getSpecies, getTrainer } from '../../data';
import { RIVAL_STARTER, rivalTrainerId } from '../../data/trainers';
import { MOOSBACH_DOORS } from './doors';

const STARTERS = [
  // German type word as used in compounds ("ein Pflanzen-Wildling") + a little flavour per crystal
  { id: 'sproessli', x: 4, type: 'Pflanzen', hint: 'Ein winziges Blatt wippt im Kristall hin und her.' },
  { id: 'zuendli', x: 5, type: 'Feuer', hint: 'Im Kristall flackert ein kleines, warmes Licht.' },
  { id: 'biberli', x: 6, type: 'Wasser', hint: 'Im Kristall blubbert es leise vor sich hin.' },
] as const;

/** Walk from the rival's spot beside the counter to the exit mat, around the player and the furniture. */
const RIVAL_EXIT_PATH = 'DDDDDLLD';

async function chooseStarter(ctx: ScriptContext, id: string, type: string, hint: string): Promise<void> {
  if (ctx.flag('got_starter')) return;
  const name = getSpecies(id).name;
  ctx.g.audio.playCry(id);
  await ctx.say(`${hint}\fIn diesem Kristall schläft ${name}, ein ${type}-Wildling.`);
  if (!(await ctx.confirm(`Möchtest du ${name} nehmen?`))) return;

  await ctx.giveCreature(id, 5, { nickname: true });
  ctx.state.starter = id;
  ctx.setFlag('got_starter');
  ctx.refreshNpcs(); // Arven packs the other two crystals away

  ctx.playMusic('rival');
  const rivalName = getSpecies(RIVAL_STARTER[id] ?? '').name;
  await ctx.emote('rival', 'exclaim');
  ctx.npcFacePlayer('rival');
  await ctx.say(`{RIVAL}: Dann nehme ich ${rivalName}! Der ist stark gegen deinen!`);
  ctx.npcFacePlayer('arven');
  await ctx.say('Arven: Den dritten Wildling bringt mein Kollege Matti nach Seewil.');

  const trainerId = rivalTrainerId('rival1', id);
  ctx.npcFacePlayer('rival');
  await ctx.say(`{RIVAL}: ${getTrainer(trainerId).intro}`);
  const won = await ctx.battle(trainerId, { allowLoss: true });

  ctx.npcFacePlayer('rival');
  if (!won) await ctx.say('{RIVAL}: Ha! Siehst du? Ich hab eben den Besseren genommen!');
  await ctx.say('{RIVAL}: Ich geh schon mal vor nach Kieselstadt. Bis bald, Schnecke!');
  await ctx.moveNpc('rival', RIVAL_EXIT_PATH);
  ctx.playSfx('door');
  ctx.setFlag('rival1_done');
  ctx.refreshNpcs();

  await ctx.wait(20);
  ctx.npcFacePlayer('arven');
  await ctx.say('Arven: Typisch {RIVAL}. Immer mit dem Kopf durch die Wand.\fDein Wildling braucht jetzt erst mal eine Pause.');
  await ctx.heal();
  await ctx.say('Arven: Nimm diese Fangkristalle. Damit fängst du wilde Wildlinge.');
  await ctx.giveItem('crystal', 5);
  await ctx.say('Arven: Im Norden liegt Kieselstadt. Dort steht die erste Halle!\fUnd sag vorher deiner Mutter Tschüss, ja?');
}

const crystals: NpcDef[] = STARTERS.map((s) => ({
  id: `crystal_${s.id}`,
  x: s.x,
  y: 3,
  facing: 'down',
  sprite: 'crystal',
  visible: (st) => !st.flags['got_starter'],
  onTalk: (ctx) => chooseStarter(ctx, s.id, s.type, s.hint),
}));

export const ARVEN_LAB: MapDef = {
  id: 'arven_lab',
  name: 'Moosbach',
  kind: 'indoor',
  music: 'lab',
  battleBg: 'indoor',
  border: 'void',
  baseTile: 'floor_tile',
  tiles: [
    'wWwbbbbbbwWw',
    'LqqqqqqqqqqL',
    'LqqqqqqqqqqL',
    'kqqcccccqqqk',
    'qqqqqqqqqqqq',
    'qqqqqqqqqqqq',
    'LttqqqqqqqqL',
    'LttqqqqqqqbL',
    'kqqqqqqqqqqk',
    'xxxxxxdxxxxx',
  ],
  warps: [{ x: 6, y: 9, to: 'moosbach', tx: MOOSBACH_DOORS.lab.x, ty: MOOSBACH_DOORS.lab.y, facing: 'down' }],
  npcs: [
    {
      id: 'arven', x: 5, y: 2, facing: 'down', sprite: 'prof',
      onTalk: async (ctx) => {
        if (!ctx.flag('got_starter')) {
          await ctx.say('Da bist du ja, {PLAYER}! Hier liegen drei Fangkristalle.\fIn jedem wartet ein junger Wildling. Such dir einen aus!');
          return;
        }
        await ctx.say('Na, wie geht es deinen Wildlingen? Ich päpple sie kurz auf.');
        await ctx.heal();
        await ctx.say('Kieselstadt liegt im Norden, hinter Pfad 1.');
      },
    },
    {
      id: 'rival', x: 8, y: 3, facing: 'left', sprite: 'rival',
      visible: (s) => !s.flags['rival1_done'],
      text: 'Ich war zuerst da! Aber such du ruhig zuerst aus. Ich nehm dann den Besseren.',
    },
    ...crystals,
    {
      id: 'assistant', x: 9, y: 5, facing: 'left', sprite: 'scientist', movement: 'turn',
      text: 'Die Professorin trinkt jeden Morgen drei Tassen Arventee. Mindestens!',
    },
  ],
  triggers: [
    {
      // Arven notices the player walking in (once)
      x: 1, y: 6, w: 10,
      when: (s) => !s.flags['got_starter'] && !s.flags['lab_greeted'],
      script: async (ctx) => {
        ctx.setFlag('lab_greeted');
        await ctx.emote('arven', 'exclaim');
        await ctx.say('Arven: Da bist du ja, {PLAYER}! Hier liegen drei Fangkristalle.\fIn jedem wartet ein junger Wildling. Such dir einen aus!');
        await ctx.emote('rival', 'exclaim');
        ctx.npcFacePlayer('rival');
        await ctx.say('{RIVAL}: Ich war zuerst da! Aber such du ruhig zuerst aus.\fIch nehm dann den Besseren.');
        ctx.faceNpc('rival', 'left');
      },
    },
  ],
};

