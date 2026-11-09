/**
 * Flüsterwald: Pfad 2 → Seewil. Rival 2 at the west entrance, the first Frostmantel, and Grete's blockade at the
 * north gap in front of a frosted clearing (their Frostkern test). See docs/WORLD.md "AREA 2".
 */
import type { MapDef, ScriptContext } from '../../core/contracts';
import { getTrainer } from '../../data';
import { ENCOUNTERS } from '../../data/encounters';
import { rivalTrainerId } from '../../data/trainers';

/** Rival 2 waits a few tiles inside the entrance; the strip at x = 2 spans the whole entrance path. */
const RIVAL = { x: 7, y: 21 } as const;
const ENTRANCE_STRIP = { x: 2, y: 20, h: 3 } as const;
/** Grete stands in the 1-tile gap; the player always faces her from the tile below. */
const GAP = { x: 15, y: 4 } as const;

/** Path from (x, y) to (tx, ty): vertical first, then horizontal. */
function pathTo(x: number, y: number, tx: number, ty: number): string {
  const v = ty < y ? 'U'.repeat(y - ty) : 'D'.repeat(ty - y);
  const h = tx < x ? 'L'.repeat(x - tx) : 'R'.repeat(tx - x);
  return v + h;
}

async function rivalScene(ctx: ScriptContext): Promise<void> {
  if (ctx.flag('rival2_done')) return;
  const id = rivalTrainerId('rival2', ctx.state.starter);
  const t = getTrainer(id);
  ctx.playMusic('rival');
  await ctx.emote('rival', 'exclaim');
  await ctx.say('{RIVAL}: Hey, {PLAYER}! Warte mal!');
  const r = ctx.npcPos('rival');
  const p = ctx.player;
  // walk up to the tile east of the player (talking to him directly needs no walk)
  if (r && Math.abs(r.x - p.x) + Math.abs(r.y - p.y) > 1) {
    await ctx.moveNpc('rival', pathTo(r.x, r.y, p.x + 1, p.y));
    ctx.facePlayer('right');
  }
  ctx.npcFacePlayer('rival');
  await ctx.say(`{RIVAL}: ${t.intro}`);
  await ctx.battle(id); // a loss blacks out and aborts; the strip starts the scene again next time
  ctx.npcFacePlayer('rival');
  await ctx.say(`{RIVAL}: ${t.after}`);
  await ctx.say('{RIVAL}: Ich geh schon mal vor. Wer zuerst in Seewil ist!');
  const at = ctx.npcPos('rival');
  // off along the entrance path (row 21) and up the trail north (x = 11), out of view
  if (at) await ctx.moveNpc('rival', pathTo(at.x, at.y, 11, 21) + 'UUUUUU');
  ctx.setFlag('rival2_done');
  ctx.refreshNpcs();
}

async function gretesBlockade(ctx: ScriptContext): Promise<void> {
  if (ctx.flag('forest_cleared')) return;
  const t = getTrainer('grunt_wald_2');
  ctx.playMusic('villain');
  await ctx.emote('grunt_grete', 'exclaim');
  ctx.npcFacePlayer('grunt_grete');
  ctx.facePlayer('up');
  await ctx.say('Halt! Hier testet der Frostmantel gerade seinen Frostkern.\fStreng geheim. Und sehr, sehr kalt. Brrr!');
  await ctx.say(t.intro);
  await ctx.battle(t.id); // a loss blacks out and aborts the script
  ctx.npcFacePlayer('grunt_grete');
  await ctx.say('Grr! Merk dir eins: Der Frostmantel wird die Alpenglut löschen!\fDann gehört Alvenland dem ewigen Winter!');
  await ctx.say('Und jetzt … muss ich zurück zum Stützpunkt.\fMir frieren nämlich die Zehen ab.');
  await ctx.moveNpc('grunt_grete', 'UUUU');
  ctx.setFlag('forest_cleared');
  ctx.refreshNpcs();
}

export const FLUESTERWALD: MapDef = {
  id: 'fluesterwald',
  name: 'Flüsterwald',
  kind: 'route',
  music: 'forest',
  battleBg: 'forest',
  border: 'tree',
  tiles: [
    'TTTTTTTTTTTTTT:::TTTTTTTTTTTTT',
    'TTTTTTTTTTTTTT:::TTTTTTTTTTTTT',
    'TTTTTTTTTTTTT.:::.TTTTTTTTTTTT',
    'TTTTTTTTTTTTTT.:.TTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTT:TTTTTTTTTTTTTT',
    'TTTTTTTTTTTTnin:nnTTTTTTTTTTTT',
    'TTTTTTTTTTTnnnn:nnnniTTTTTTTTT',
    'TTTTTTTTTTinnnn:::::::TTTTTTTT',
    'TTT..TTTTTTTnnin::::::.TTTTTTT',
    'TT...*TTTTTTTnnnn..,::.TTTTTTT',
    'TT..~~~.TTTTTT,,,,,,::.TTTTTTT',
    'TT.~~~~..TTTTT,,,,nn::TTTTTTTT',
    'TT.~~~o..TTTT,,,n...::.TTTTTTT',
    'TTT.~~...,::::::::::::..TTTTTT',
    'TT.......,::::::::::::...TTTTT',
    'TTTo.*..TT:::,,TTTTTTT..,,TTTT',
    'TTTTTTTTT,:::,,TTTTTTT.,,,,TTT',
    'TTTTTTTTT.:::.TTTTTTTTo,,,,TTT',
    'TTTT..TTT,:::..TTTTTTT..,,.TTT',
    'TTTS....T,:::,TTTTTTTTT.,,TTTT',
    '::::.....::::.TTTTTTTTT..,.TTT',
    '::::::::::::..TTTTTTTTTT.,..TT',
    '::::::::::::.TTTTTTTTTTTT...TT',
    'TT.......,,,TTTTTTTTTTTTT..TTT',
    'TTT..,,,,,,TTTTTTTTTTTTTT.,.TT',
    'TTTT.o,,,,TTTTTTTTTTTTTTT...TT',
    'TTTTTT..TTTTTTTTTTTTTTTTT*..TT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  connections: {
    left: { map: 'pfad_2', offset: -12 },
    up: { map: 'seewil', offset: -2 },
  },
  npcs: [
    {
      id: 'ranger', x: 5, y: 19, facing: 'down', sprite: 'ranger',
      onTalk: async (ctx) => {
        if (!ctx.flag('forest_cleared')) {
          await ctx.say('Seltsame Leute in eisblauen Kutten treiben sich im Wald herum.\fSei vorsichtig!');
          return;
        }
        if (!ctx.flag('gift_ranger_potions')) {
          await ctx.emote('ranger', 'heart');
          await ctx.say('Du hast die Kuttenleute vertrieben? Danke! Nimm das.');
          await ctx.giveItem('super_potion', 2);
          ctx.setFlag('gift_ranger_potions');
        }
        await ctx.say('Der Wald flüstert wieder ganz normal.');
      },
    },
    {
      id: 'rival', x: RIVAL.x, y: RIVAL.y, facing: 'left', sprite: 'rival',
      visible: (s) => !s.flags['rival2_done'],
      onTalk: rivalScene,
    },
    { id: 'wald_ferdi', x: 7, y: 13, facing: 'right', sprite: 'oldman', trainer: { id: 'wald_ferdi', sight: 3 } },
    { id: 'wald_jana', x: 13, y: 18, facing: 'left', sprite: 'girl', trainer: { id: 'wald_jana', sight: 4 } },
    { id: 'grunt_wald_1', x: 16, y: 12, facing: 'down', sprite: 'grunt', trainer: { id: 'grunt_wald_1', sight: 4 } },
    { id: 'wald_otto', x: 22, y: 9, facing: 'left', sprite: 'scientist', trainer: { id: 'wald_otto', sight: 4 } },
    {
      id: 'grunt_grete', x: GAP.x, y: GAP.y, facing: 'down', sprite: 'grunt',
      visible: (s) => !s.flags['forest_cleared'],
      onTalk: gretesBlockade,
    },
  ],
  signs: [{ x: 3, y: 19, text: 'FLÜSTERWALD\nNorden: Seewil' }],
  items: [
    { x: 3, y: 8, item: 'crystal_great', flag: 'item:fluesterwald:crystal_great' },
    { x: 27, y: 26, item: 'antidote', qty: 2, flag: 'item:fluesterwald:antidote' },
  ],
  hiddenItems: [
    { x: 7, y: 27, item: 'candy', flag: 'hidden:fluesterwald:candy' },
    { x: 6, y: 12, item: 'wake_herb', flag: 'hidden:fluesterwald:wake_herb' },
  ],
  triggers: [
    { ...ENTRANCE_STRIP, when: (s) => !s.flags['rival2_done'], script: rivalScene },
    { x: GAP.x, y: GAP.y + 1, when: (s) => !s.flags['forest_cleared'], script: gretesBlockade },
  ],
  encounters: ENCOUNTERS['fluesterwald'],
};
