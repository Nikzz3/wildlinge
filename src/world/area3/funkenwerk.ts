/**
 * The Funkenwerk, occupied by the Frostmantel: three grunts along the aisle through the conveyor belts, then
 * Kommandantin Bise at the Frostkern with Hüterin Zita held next to her. Winning frees the Werk (werk_cleared):
 * the Halle opens and the music turns friendly. See docs/WORLD.md "AREA 3".
 */
import type { MapDef, ScriptContext } from '../../core/contracts';
import type { MusicId } from '../../core/types';
import { getTrainer } from '../../data';
import { FUNKEN_DOORS } from './doors';

/** Bise stands in a niche between two machines; the player always faces her from the tile below. */
const BISE = { x: 6, y: 1 } as const;
/** Straight down the aisle (x = 6) to the exit mat. */
const AISLE_TO_MAT = 'DDDDDDDD';

/**
 * MapDef.music is static, and script music only lasts until the script ends, so the Werk's music is a getter
 * over this value: 'villain' while occupied, 'lab' once freed (synced on every entry and by Bise's scene).
 */
let werkMusic: MusicId = 'villain';

function syncMusic(ctx: ScriptContext): void {
  const id: MusicId = ctx.flag('werk_cleared') ? 'lab' : 'villain';
  if (id === werkMusic) return;
  werkMusic = id;
  ctx.playMusic(id);
}

async function bisesScene(ctx: ScriptContext): Promise<void> {
  if (ctx.flag('werk_cleared')) return;
  const t = getTrainer('admin_bise_1');
  ctx.playMusic('villain');
  await ctx.emote('bise', 'exclaim');
  ctx.npcFacePlayer('bise');
  ctx.facePlayer('up');
  await ctx.say('Bise: Sieh an. Das Kind aus dem Wald und der Höhle.\fGrete und Petra haben mir alles erzählt. Leider.');
  ctx.faceNpc('zita', 'down');
  await ctx.say('Zita: Pass auf! Sie haben mein Werk angezapft –\fmit dem Strom bauen sie ihren Frostkern fertig!');
  await ctx.say(`Bise: ${t.intro}`);
  await ctx.battle(t.id); // a loss blacks out and aborts the script
  ctx.npcFacePlayer('bise');
  await ctx.say('Bise: Pah! Den Urkristall aus eurem Tresor haben wir trotzdem.\fMit ihm fangen wir den Wächter der Alpenglut – dann erlischt sie!');
  await ctx.say('Bise: Der Frostkern ist sowieso fertig. Wir sehen uns am Gipfel!\fUnd jetzt: Platz da!');
  await ctx.movePlayer('R'); // shoved aside (Egon, beaten, stands somewhere left of the player)
  ctx.facePlayer('left');
  await ctx.moveNpc('bise', AISLE_TO_MAT); // waits on the exit mat, out of view, until the refresh below
  ctx.npcFacePlayer('zita');
  ctx.facePlayer('right');
  await ctx.emote('zita', 'heart');
  await ctx.say('Zita: Danke! Ohne dich wäre das Werk eingefroren.\fIch warte in der Halle auf dich!');
  await ctx.g.fadeOut(16); // Zita runs off to her Halle, the engineers come back
  ctx.setFlag('werk_cleared');
  syncMusic(ctx);
  ctx.refreshNpcs();
  await ctx.g.fadeIn(16);
}

export const FUNKEN_WERK: MapDef = {
  id: 'funken_werk',
  name: 'Funkenstadt',
  kind: 'indoor',
  get music(): MusicId {
    return werkMusic;
  },
  battleBg: 'indoor',
  border: 'void',
  baseTile: 'floor_tile',
  tiles: [
    'wWwwLLLLwwWw',
    'LqqqqLqLqbbL',
    'qqqqqqqqqqqL',
    'cccccqqccccc',
    'qqqqqqqqqqqq',
    'LLLqqqqqqLLL',
    'cccccqqccccc',
    'qqqqqqqqqqqq',
    'LqqqqqqqqqqL',
    'xxxxxxdxxxxx',
  ],
  warps: [{ x: 6, y: 9, to: 'funkenstadt', tx: FUNKEN_DOORS.werk.x, ty: FUNKEN_DOORS.werk.y, facing: 'down' }],
  npcs: [
    { id: 'grunt_werk_1', x: 3, y: 7, facing: 'right', sprite: 'grunt', trainer: { id: 'grunt_werk_1', sight: 3 } },
    { id: 'grunt_werk_2', x: 8, y: 4, facing: 'left', sprite: 'grunt', trainer: { id: 'grunt_werk_2', sight: 3 } },
    { id: 'grunt_werk_3', x: 3, y: 2, facing: 'right', sprite: 'grunt', trainer: { id: 'grunt_werk_3', sight: 3 } },
    {
      id: 'bise', x: BISE.x, y: BISE.y, facing: 'down', sprite: 'grunt',
      visible: (s) => !s.flags['werk_cleared'],
      onTalk: bisesScene,
    },
    {
      id: 'zita', x: 8, y: 1, facing: 'left', sprite: 'leader_spark',
      visible: (s) => !s.flags['werk_cleared'],
      text: 'Zita: Bise hat den Tresor geknackt! Halt sie auf – bitte!',
    },
    {
      id: 'engineer', x: 9, y: 2, facing: 'up', sprite: 'scientist',
      visible: (s) => !!s.flags['werk_cleared'],
      text: 'Der Tresor ist leer … Der Urkristall ist weg.\fEr kann jeden Wildling fangen!',
    },
  ],
  items: [
    { x: 1, y: 1, item: 'hyper_potion', flag: 'item:funken_werk:hyper_potion' },
    { x: 11, y: 7, item: 'revive', flag: 'item:funken_werk:revive' },
  ],
  // Egon (who watches this tile) battles first; then the tile in front of Bise starts her scene
  triggers: [{ x: BISE.x, y: BISE.y + 1, when: (s) => !s.flags['werk_cleared'] && !!s.flags['trainer:grunt_werk_3'], script: bisesScene }],
  onEnter: async (ctx) => syncMusic(ctx),
};
