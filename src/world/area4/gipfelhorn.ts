/**
 * Gipfelhorn – the summit and the finale (docs/WORLD.md §4 steps 33–36). One trigger strip across the neck of the
 * plateau (y = 10) runs scene A (Eisner at the Alpenglut, boss battle; the freed flame heals the team) and scene B
 * (the final rival battle); scene C is talking to Lindglut, which rises from the flame once {RIVAL} is beaten.
 * A lost battle blacks out as usual (respawn at the rescuer's tea on the Gipfelpfad or a Heilstation); the strip then
 * replays the scene that is still open, with a shorter intro.
 *
 * Lindglut is met once in the story: caught, defeated or fled, the story ends with a save and the credits
 * (a loss blacks out – talk to it again). "Weiter" then resumes in the Gasthaus in Frostalp. If it was not
 * caught, Lindglut retreats into the flame (`lindglut_resting`) and is back at the flame on the next visit, where
 * talking to it starts the battle again (without credits).
 */
import type { GameContext, Gfx, MapDef, Scene, ScriptContext } from '../../core/contracts';
import type { SaveData } from '../../core/types';
import { getTrainer } from '../../data';
import { rivalTrainerId } from '../../data/trainers';
import { HOUSE_ARRIVAL } from '../templates';

/** Where the player stands during scenes A and B (walked there from the strip). */
const STAGE = { x: 10, y: 7 } as const;
/** The neck of the plateau, the only way up to the flame. */
const NECK = { x: 8, y: 10, w: 5 } as const;
/** Set after Lindglut was defeated or fled from; cleared when the summit is entered again. */
const RESTING = 'lindglut_resting';

const lindglutHere = (s: SaveData) => !!s.flags['rival4_done'] && !s.dexCaught.includes('lindglut') && !s.flags[RESTING];

/**
 * The flame flares up: a warm, flickering wash over the map (stronger towards the sky). An overlay scene above
 * the overworld and below the dialog box; push it, say a few lines, pop it. Nothing may walk meanwhile (only the
 * top scene updates).
 */
class GlowScene implements Scene {
  readonly name = 'alpenglut-glow';
  readonly overlay = true;
  private start = -1;

  update(): void {}

  render(gfx: Gfx, g: GameContext): void {
    if (this.start < 0) this.start = g.frame;
    const t = Math.min(1, (g.frame - this.start) / 40);
    const flicker = 0.9 + 0.1 * Math.sin(g.frame / 5);
    for (let y = 0; y < gfx.height; y += 4) {
      const alpha = Math.round(t * flicker * (0.42 - (0.24 * y) / gfx.height) * 255);
      gfx.fillRect(0, y, gfx.width, 4, `#f87028${alpha.toString(16).padStart(2, '0')}`);
    }
  }
}

async function withGlow(ctx: ScriptContext, lines: readonly string[]): Promise<void> {
  const glow = new GlowScene();
  ctx.g.push(glow);
  await ctx.wait(45);
  for (const line of lines) await ctx.say(line);
  ctx.g.pop(glow);
}

async function flash(ctx: ScriptContext, color: string, out: number, back: number, between?: () => void): Promise<void> {
  await ctx.g.fadeOut(out, color);
  between?.();
  await ctx.g.fadeIn(back);
}

/** Heals the party (fade + jingle) without moving the respawn point up to the summit. */
async function warmHeal(ctx: ScriptContext): Promise<void> {
  const respawn = { ...ctx.state.lastHeal };
  await ctx.heal();
  ctx.state.lastHeal = respawn;
}

/** From anywhere on the strip to the stage below the flame. */
async function walkToStage(ctx: ScriptContext): Promise<void> {
  const p = ctx.player;
  const h = p.x < STAGE.x ? 'R'.repeat(STAGE.x - p.x) : 'L'.repeat(p.x - STAGE.x);
  await ctx.movePlayer(h + 'U'.repeat(Math.max(0, p.y - STAGE.y)));
  ctx.facePlayer('up');
}

/** Scene A: Anführer Eisner at the flame, the boss battle, the Frostkern breaks and the Frostmantel leaves. */
async function eisnerScene(ctx: ScriptContext): Promise<void> {
  const t = getTrainer('boss_eisner');
  ctx.playMusic('villain');
  await ctx.emote('grunt_a', 'exclaim');
  ctx.faceNpc('grunt_a', 'down');
  await ctx.say('Frostmantel: Chef! Da kommt jemand den Grat herauf!');
  await walkToStage(ctx);
  ctx.faceNpc('eisner', 'down');
  ctx.faceNpc('grunt_b', 'down');
  await ctx.wait(20);
  if (!ctx.flag('eisner_met')) {
    ctx.setFlag('eisner_met');
    await ctx.say('Eisner: Du bist also das Kind, das Bise den Wind aus den Segeln genommen hat.');
    await ctx.say('Eisner: Als ich klein war, reichte der Gletscher bis hinunter nach Frostalp.\fJedes Jahr schmolz er ein Stück. Jedes Jahr ging etwas verloren.');
    await ctx.say('Eisner: Die Alpenglut wärmt das Tal – und frisst mein Eis.\fErlischt sie, bleibt alles, wie es ist. Für immer. Ewige Stille.');
    await ctx.say('Eisner: Der Frostkern löscht die Flamme. Der Urkristall fängt ihren Wächter.\fUnd du, Kind, wirst mich nicht aufhalten.');
  } else {
    await ctx.say('Eisner: Du schon wieder. Mein Frostkern braucht nur noch ein paar Minuten.\fDiesmal bleibst du liegen.');
  }
  await ctx.say(`Eisner: ${t.intro}`);
  await ctx.battle(t.id); // a loss blacks out and aborts; the strip starts the scene again (shorter) next time

  ctx.playMusic(null);
  await ctx.say('Eisner: Mein Frostkern … zerbrochen.');
  ctx.playSfx('hit_super');
  await flash(ctx, '#ffffff', 4, 14);
  for (const id of ['eisner', 'grunt_a', 'grunt_b']) ctx.faceNpc(id, 'up');
  ctx.playMusic('summit');
  await withGlow(ctx, [
    'Knack! Der Frostkern zerspringt – und die Alpenglut lodert hoch auf!',
    'Rotgoldenes Licht fällt über den Gletscher. Der ganze Berg glüht.',
    'Eisner: … Der Gletscher. Er leuchtet.\fGenau so hat er ausgesehen, als ich ein Junge war.',
    'Eisner: Ich wollte das Eis retten. Dabei glüht es nur, weil die Flamme es wärmt.\fOhne Glut kein Glühen. Nur Eis im Dunkeln.',
    'Die Wärme der Alpenglut strömt durch dich und dein ganzes Team.',
  ]);
  await warmHeal(ctx); // the final rival battle follows right away
  ctx.faceNpc('eisner', 'down');
  await ctx.say('Eisner: Hier. Der Urkristall.');
  await ctx.giveItem('crystal_master', 1);
  await ctx.say('Eisner: Behalte ihn. Vielleicht weißt du besser, was er wert ist.');
  await ctx.say('Eisner: Frostmantel! Wir gehen nach Hause.\fDer Winter kommt auch ohne uns. Zu seiner Zeit.');
  // down past the player (who stands at x = 10) and out of view (y = 14)
  await Promise.all([
    ctx.moveNpc('eisner', 'RDDDDDDDDD'),
    ctx.moveNpc('grunt_a', 'DDDDDDDDD'),
    ctx.moveNpc('grunt_b', 'DDDDDDDDD'),
  ]);
  ctx.setFlag('boss_done');
  ctx.refreshNpcs();
}

/** Scene B: {RIVAL} runs up from the south; the final rival battle; the flame flares and Lindglut appears. */
async function rivalScene(ctx: ScriptContext): Promise<void> {
  const id = rivalTrainerId('rival4', ctx.state.starter);
  const t = getTrainer(id);
  ctx.playMusic('rival');
  await ctx.say('{RIVAL}: {PLAYER}! Waaarte!');
  ctx.facePlayer('down');
  await ctx.moveNpc('rival', 'UUUUUUU');
  ctx.npcFacePlayer('rival');
  if (!ctx.flag('rival4_met')) {
    ctx.setFlag('rival4_met');
    await ctx.say('{RIVAL}: Die Kuttentypen sind gerade an mir vorbeigerannt. Ganz schön kleinlaut!');
    await ctx.say('{RIVAL}: Ich hab\'s nicht rechtzeitig geschafft … aber du!\fDu hast die Alpenglut gerettet. Ehrlich: Respekt.');
    await ctx.say('{RIVAL}: Aber eine Sache ist noch offen zwischen uns.\fUnd die klären wir hier oben, an der Flamme!');
  } else {
    await ctx.say('{RIVAL}: Noch eine Runde? Klar doch. Ich bin bereit, wenn du es bist!');
  }
  await ctx.say(`{RIVAL}: ${t.intro}`);
  await ctx.battle(id); // a loss blacks out and aborts; the strip starts this scene again next time
  ctx.npcFacePlayer('rival');
  await ctx.say(`{RIVAL}: ${t.after}`);
  await ctx.moveNpc('rival', 'RU'); // beside the player, both facing the flame
  ctx.faceNpc('rival', 'up');
  ctx.facePlayer('up');
  ctx.playMusic(null);
  ctx.playSfx('confirm');
  await withGlow(ctx, ['Die Alpenglut lodert hell auf!']);
  await flash(ctx, '#fff4d8', 14, 50, () => {
    ctx.setFlag('rival4_done');
    ctx.refreshNpcs(); // Lindglut appears; {RIVAL} stays beside the player (rival_post)
  });
  ctx.g.audio.playCry('lindglut');
  await ctx.wait(40);
  await ctx.emote('rival_post', 'exclaim');
  ctx.npcFacePlayer('rival_post');
  await ctx.say('{RIVAL}: Da! Mitten in der Flamme! Ist das … der Wächter?');
  await ctx.say('{RIVAL}: Geh du, {PLAYER}. Er schaut die ganze Zeit nur dich an.');
  ctx.faceNpc('rival_post', 'up');
}

async function summitStrip(ctx: ScriptContext): Promise<void> {
  if (ctx.flag('rival4_done')) return;
  if (!ctx.flag('boss_done')) await eisnerScene(ctx);
  else await walkToStage(ctx);
  await rivalScene(ctx);
}

/** The story's last words, the save that "Weiter" resumes from, and the credits (once). */
async function finale(ctx: ScriptContext, caughtIt: boolean): Promise<void> {
  ctx.playMusic('summit');
  await ctx.moveNpc('rival_post', 'UU'); // beside the player in front of the flame
  ctx.npcFacePlayer('rival_post');
  ctx.facePlayer('right');
  if (caughtIt) await ctx.say('{RIVAL}: Lindglut hat sich für dich entschieden … Wahnsinn.\fUnd schau: Die Flamme brennt trotzdem weiter!');
  await ctx.say('{RIVAL}: Die Alpenglut brennt wieder. Danke, {PLAYER}.');
  await ctx.say('{RIVAL}: Und wer war jetzt zuerst oben?\fSagen wir … unentschieden. Ausnahmsweise.');
  await ctx.emote('player', 'heart');
  ctx.setFlag('lindglut_done');
  ctx.setFlag('game_cleared');
  // after the ending, "Weiter" resumes in the Gasthaus in Frostalp, where there is finally hot chocolate
  ctx.state.player = { mapId: 'frostalp_house_1', x: HOUSE_ARRIVAL.x, y: HOUSE_ARRIVAL.y, facing: 'up' };
  ctx.g.save();
  await ctx.credits();
}

/** Scene C: Lindglut. In the story it leads to the finale whatever happens (except a loss); later it is a rematch. */
async function lindglutScene(ctx: ScriptContext): Promise<void> {
  const story = !ctx.flag('game_cleared');
  ctx.g.audio.playCry('lindglut');
  if (story) {
    ctx.playMusic(null);
    await ctx.say('Ein gewaltiger Wildling steigt aus der Flamme!');
  } else {
    await ctx.say('Lindglut wacht über die Alpenglut. Seine Augen glühen wie Abendrot.');
  }
  const outcome = await ctx.wildBattle('lindglut', 40, { canRun: true, music: 'battle_legend' });
  // a loss blacked out and aborted the script: Lindglut stays at the flame
  if (outcome !== 'caught') ctx.setFlag(RESTING);
  ctx.refreshNpcs();
  if (outcome === 'caught') await ctx.say('Lindglut glüht warm in seinem Kristall.');
  else if (outcome === 'win') await ctx.say('Lindglut sinkt erschöpft in die Flamme zurück.\fDie Glut lodert nur noch heller.');
  else await ctx.say('Lindglut blickt dir lange nach …\fdann taucht es zurück in die Flamme.');
  if (story) await finale(ctx, outcome === 'caught');
}

export const GIPFELHORN: MapDef = {
  id: 'gipfelhorn',
  name: 'Gipfelhorn',
  kind: 'route',
  music: 'summit',
  battleBg: 'summit',
  border: 'cliff',
  baseTile: 'snow',
  tiles: [
    'MMMMMMMMMMMMMMMMMMMM',
    'MMMMMMMinnnnniMMMMMM',
    'MMMMMiinoooooniMMMMM',
    'MMMMinnnoFFFonLiMMMM',
    'MMMinnnnoonoonnnnMMM',
    'MMinnnnnnn:nnnnnnnMM',
    'MMnnonnnnn:nnnnnnnMM',
    'MMMnnininn:nnininnMM',
    'MMMinnnnnn:nnnnnniMM',
    'MMMMinnnnn:nnnnniMMM',
    'MMMMMMMMnn:nnMMMMMMM',
    'MMMMMMinnn:nnniMMMMM',
    'MMMMMinnnn:nnnniMMMM',
    'MMMMinonnn:nnnnniMMM',
    'MMMinnnnnn:nnnnnniMM',
    'MMMinnnnn:::nnnnniMM',
    'MMMMinnnn:::nnnniMMM',
    'MMMMMinnn:::nnniMMMM',
    'MMMMMMMnn:::nnMMMMMM',
    'MMMMMMMMM:::MMMMMMMM',
  ],
  connections: { down: { map: 'gipfelpfad', offset: 1 } },
  npcs: [
    { id: 'eisner', x: 10, y: 5, facing: 'up', sprite: 'boss', visible: (s) => !s.flags['boss_done'], text: '…' },
    { id: 'grunt_a', x: 8, y: 5, facing: 'up', sprite: 'grunt', visible: (s) => !s.flags['boss_done'], text: '…' },
    { id: 'grunt_b', x: 12, y: 5, facing: 'up', sprite: 'grunt', visible: (s) => !s.flags['boss_done'], text: '…' },
    {
      // waits below the neck after a lost final battle; scene B walks him up to the stage
      id: 'rival', x: 10, y: 15, facing: 'up', sprite: 'rival',
      visible: (s) => !!s.flags['boss_done'] && !s.flags['rival4_done'],
      text: '{RIVAL}: Oben an der Flamme, {PLAYER}. Da machen wir es aus!',
    },
    {
      id: 'rival_post', x: 11, y: 7, facing: 'up', sprite: 'rival',
      visible: (s) => !!s.flags['rival4_done'],
      onTalk: async (ctx) => {
        if (!ctx.flag('game_cleared')) {
          await ctx.say('{RIVAL}: Geh schon, {PLAYER}. Lindglut wartet auf dich.');
          return;
        }
        await ctx.say('{RIVAL}: Weißt du noch? Als Kinder wollten wir immer als Erste hier oben sein.');
        await ctx.say('{RIVAL}: Jetzt waren wir es beide. Das zählt doch auch, oder?');
      },
    },
    { id: 'lindglut', x: 10, y: 4, facing: 'down', sprite: 'legend', visible: lindglutHere, onTalk: lindglutScene },
  ],
  signs: [
    { x: 14, y: 3, text: 'FROSTKERN – Eigentum des Frostmantels.\nZerbrochen. Aus ihm tropft nur noch Schmelzwasser.' },
    { x: 10, y: 3, text: 'Die Alpenglut.\nSie wärmt dein Gesicht, aber sie brennt nicht.' },
  ],
  triggers: [{ ...NECK, when: (s) => !s.flags['rival4_done'], script: summitStrip }],
  onEnter: async (ctx) => {
    if (!ctx.flag(RESTING)) return;
    ctx.setFlag(RESTING, false);
    ctx.refreshNpcs();
  },
};
