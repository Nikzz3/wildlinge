/**
 * Seewil (the lake town), its interiors, Halle 2 (Hüterin Undine) and the closing beat of chapter 2. See
 * docs/WORLD.md "AREA 2". The north path leads to Pfad 3 (area 3) once the player has the Wellenabzeichen.
 */
import type { GameContext, Gfx, MapDef, Scene, ScriptContext } from '../../core/contracts';
import { getTrainer } from '../../data';
import { BADGES } from '../../data/badges';
import { ENCOUNTERS } from '../../data/encounters';
import { SHOPS } from '../../data/shops';
import { LEFTOVER_STARTER } from '../../data/trainers';
import { HEAL_CENTER_ARRIVAL, HOUSE_ARRIVAL, makeHealCenter, makeHouse, makeShop, SHOP_ARRIVAL } from '../templates';
import { SEEWIL_DOORS, SEEWIL_HALL_ARRIVAL } from './doors';

const BADGE = BADGES[1]!;
/**
 * Set once the closing beat outside Halle 2 has played. (Saves from the chapter-2 release, where this beat ended
 * with the credits, already have it – they simply continue north.)
 */
const CHAPTER2_FLAG = 'chapter2_cleared';
/** Staged exit: from beside the Halle door (21,6) west over the bridge and up the north path, out of view. */
const RIVAL_EXIT_PATH = 'LLLLLLLL' + 'UUUUUU';
const endingPending = (s: { badges: string[]; flags: Record<string, boolean> }) =>
  s.badges.includes(BADGE.id) && !s.flags[CHAPTER2_FLAG];

/**
 * Closing beat after the second badge: a dripping {RIVAL} waits on the hall island; the two watch the
 * mountains glow over the lake (Alpenglühen) and promise to protect the Alpenglut. Then {RIVAL} points the way
 * north (Pfad 3, Glimmerhöhle, Funkenstadt) and runs ahead. `staged` = the player just walked out of the Halle
 * door, so the rival can step up and run off afterwards.
 */
async function chapterEnding(ctx: ScriptContext, staged: boolean): Promise<void> {
  ctx.playMusic('rival');
  await ctx.emote('rival', 'exclaim');
  if (staged) {
    await ctx.moveNpc('rival', 'UR');
    ctx.facePlayer('left');
  }
  ctx.npcFacePlayer('rival');
  await ctx.say('{RIVAL}: {PLAYER}! Du hast Undine geschafft? Echt jetzt?\fZeig her … Das Wellenabzeichen!');
  await ctx.say('{RIVAL}: Ich hab es vorhin auch versucht. Undine war sehr nett.\fSie hat mich trotzdem in den See gespült. Wörtlich.');
  await ctx.say('{RIVAL}: Und dann diese Kuttentypen im Wald …\fDie wollen echt die Alpenglut löschen? Für ewigen Winter?');
  ctx.playMusic('home');
  await ctx.emote('rival', 'question');
  await ctx.say('{RIVAL}: … Hey, schau mal! Da drüben, über dem See!');
  ctx.facePlayer('down');
  ctx.faceNpc('rival', 'down');
  const glow = new AlpenglowScene();
  ctx.g.push(glow);
  await ctx.wait(70);
  await ctx.say('Die Gipfel rund um den See leuchten rotgolden in der Abendsonne.');
  await ctx.say('{RIVAL}: Alpenglühen! Oma sagt, das ist der Atem vom Wächter der Alpenglut.');
  await ctx.say('{RIVAL}: Ziemlich kitschig, was? … Aber schön.\fDas lassen wir uns nicht wegfrieren.');
  ctx.npcFacePlayer('rival');
  ctx.facePlayer(staged ? 'left' : ctx.player.facing);
  await ctx.say('{RIVAL}: Abgemacht? Wir zwei passen auf die Alpenglut auf.\fUnd wer zuerst oben am Gipfel ist, hat gewonnen!');
  await ctx.emote('player', 'heart');
  await glow.fadeOut();
  ctx.playMusic('rival');
  await ctx.say('{RIVAL}: Mit dem Abzeichen lässt dich die Wache am Nordweg durch.\fPfad 3 führt am See entlang zur Glimmerhöhle.');
  await ctx.say('{RIVAL}: Hinter der Höhle liegt Funkenstadt mit der dritten Halle.\fDiesmal bin ich zuerst dort. Bis dann, Schnecke!');
  if (staged) await ctx.moveNpc('rival', RIVAL_EXIT_PATH);
  ctx.setFlag(CHAPTER2_FLAG);
  ctx.refreshNpcs();
}

/** Length of the glow's fade-out in frames. */
const GLOW_FADE_OUT = 40;

/**
 * The evening glow for the Alpenglühen beat: a warm wash over the map (stronger towards the sky), fading in over
 * about a second. An overlay scene above the overworld and below the dialog box; fadeOut() removes it again.
 */
class AlpenglowScene implements Scene {
  readonly name = 'alpenglow';
  readonly overlay = true;
  private start = -1;
  private fadeStart = -1;
  private onFaded: (() => void) | null = null;

  /** Fades the glow out and removes the scene (it is the top scene once the dialog box has closed). */
  fadeOut(): Promise<void> {
    return new Promise((resolve) => {
      this.onFaded = resolve;
    });
  }

  update(g: GameContext): void {
    if (!this.onFaded) return;
    if (this.fadeStart < 0) this.fadeStart = g.frame;
    if (g.frame - this.fadeStart < GLOW_FADE_OUT) return;
    g.pop(this);
    this.onFaded();
  }

  render(gfx: Gfx, g: GameContext): void {
    if (this.start < 0) this.start = g.frame;
    const fadeIn = Math.min(1, (g.frame - this.start) / 60);
    const fadeOut = this.fadeStart < 0 ? 1 : Math.max(0, 1 - (g.frame - this.fadeStart) / GLOW_FADE_OUT);
    const t = fadeIn * fadeOut;
    for (let y = 0; y < gfx.height; y += 4) {
      const alpha = Math.round(t * (0.36 - (0.2 * y) / gfx.height) * 255);
      gfx.fillRect(0, y, gfx.width, 4, `#f06030${alpha.toString(16).padStart(2, '0')}`);
    }
  }
}

const GATE_TEXT = 'Der Weg nach Norden führt zur Glimmerhöhle.\fOhne das Wellenabzeichen von Hüterin Undine lasse ich niemanden durch.';

export const SEEWIL: MapDef = {
  id: 'seewil',
  name: 'Seewil',
  kind: 'town',
  music: 'town',
  battleBg: 'water',
  border: 'tree',
  tiles: [
    'TTTTTTTTTTTT:::TTTTTTTTTTT',
    'T..........T:::TT~~.......',
    'T..........T:::TT~~.......',
    'T...........:::..~~.......',
    'T..........S:::..~~.......',
    'T::::::::::::::..~~.......',
    'T.:::::::::::::::==::::Sss',
    'T..T........::..s~~~sssss~',
    'T...........::..s~~~~~=~~~',
    'T...........::..,s~~~~~~~~',
    'T...........::.,,s~~~~~~~~',
    'T...........::.,,~~~~~~~~~',
    'T:::::::::::::sss~~~~~~~~~',
    'T.*......o..::ssss~~~~~~~~',
    'TT..T.......::.sS,~~~~~~~~',
    'T....*......::::::=====~~~',
    'T..TT.......::.ss,,~~~~~~~',
    'T..T.fffff..::.s,,,,~~~~~~',
    'TT...f***f..::.ss,,,,~~~~T',
    'TTT..fffff.S:::.ss,,,~~TTT',
    'TTTT...o....:::..ss,,TTTTT',
    'TTTTTTTTTTTT:::TTTTTTTTTTT',
  ],
  buildings: [
    { x: 1, y: 1, w: 5, h: 4, style: 'heal', door: { dx: 2, to: 'seewil_center', tx: HEAL_CENTER_ARRIVAL.x, ty: HEAL_CENTER_ARRIVAL.y } },
    { x: 7, y: 1, w: 4, h: 4, style: 'shop', door: { dx: 1, to: 'seewil_shop', tx: SHOP_ARRIVAL.x, ty: SHOP_ARRIVAL.y } },
    { x: 19, y: 1, w: 7, h: 5, style: 'hall', door: { dx: 3, to: 'seewil_hall', tx: SEEWIL_HALL_ARRIVAL.x, ty: SEEWIL_HALL_ARRIVAL.y } },
    { x: 1, y: 9, w: 5, h: 3, style: 'house_blue', door: { dx: 2, to: 'seewil_house_1', tx: HOUSE_ARRIVAL.x, ty: HOUSE_ARRIVAL.y } },
    { x: 6, y: 9, w: 5, h: 3, style: 'house_green', door: { dx: 2, to: 'seewil_house_2', tx: HOUSE_ARRIVAL.x, ty: HOUSE_ARRIVAL.y } },
  ],
  connections: {
    down: { map: 'fluesterwald', offset: 2 },
    up: { map: 'pfad_3', offset: -3 },
  },
  npcs: [
    {
      id: 'guard_north', x: 15, y: 3, facing: 'left', sprite: 'guard',
      onTalk: async (ctx) => {
        if (!ctx.state.badges.includes(BADGE.id)) await ctx.say(GATE_TEXT);
        else await ctx.say('Pfad 3 führt am Ufer entlang zur Glimmerhöhle.');
      },
    },
    {
      id: 'fisher', x: 22, y: 15, facing: 'right', sprite: 'fisher',
      text: 'Angeln? Nein, nein. Ich schaue den Tauchli nur beim Tauchen zu.',
    },
    {
      id: 'girl', x: 15, y: 17, facing: 'down', sprite: 'girl', movement: 'wander',
      text: 'Siehst du die Tauchli im Schilf? Sie reiten auf dem Rücken ihrer Eltern!',
    },
    {
      id: 'man', x: 16, y: 7, facing: 'up', sprite: 'man',
      text: 'Hüterin Undine schwimmt jeden Morgen durch den eiskalten See.',
    },
    // chapter-2 ending: waiting on the hall island after the second badge
    {
      id: 'rival', x: 20, y: 7, facing: 'up', sprite: 'rival', visible: endingPending,
      onTalk: (ctx) => chapterEnding(ctx, false),
    },
  ],
  signs: [
    { x: 11, y: 19, text: 'SEEWIL\nDas Dorf am stillen See.' },
    { x: 16, y: 14, text: 'Angeln verboten!\fDie Wildlinge im See sind unsere Nachbarn.' },
    { x: 23, y: 6, text: 'HALLE SEEWIL – Hüterin: Undine\nRuhig wie der See, stark wie die Flut.' },
    { x: 11, y: 4, text: 'Norden: Pfad 3, Glimmerhöhle\nDahinter: Funkenstadt' },
  ],
  hiddenItems: [{ x: 16, y: 19, item: 'super_potion', flag: 'hidden:seewil:super_potion' }],
  triggers: [
    {
      x: 12, y: 2, w: 3,
      when: (s) => !s.badges.includes(BADGE.id),
      script: async (ctx) => {
        ctx.npcFacePlayer('guard_north');
        await ctx.say(GATE_TEXT);
        await ctx.movePlayer('D');
      },
    },
  ],
  encounters: ENCOUNTERS['seewil'],
  onEnter: async (ctx) => {
    if (!endingPending(ctx.state)) return;
    const atHallDoor = ctx.player.x === SEEWIL_DOORS.hall.x && ctx.player.y === SEEWIL_DOORS.hall.y;
    if (atHallDoor) await chapterEnding(ctx, true);
  },
};

const exitTo = (door: { x: number; y: number }) => ({ map: 'seewil', x: door.x, y: door.y });

export const SEEWIL_CENTER: MapDef = makeHealCenter({ id: 'seewil_center', name: 'Seewil', exit: exitTo(SEEWIL_DOORS.center) });

export const SEEWIL_SHOP: MapDef = makeShop({
  id: 'seewil_shop',
  name: 'Seewil',
  shopItems: SHOPS['seewil'] ?? [],
  exit: exitTo(SEEWIL_DOORS.shop),
});

export const SEEWIL_HOUSE_1: MapDef = makeHouse({
  id: 'seewil_house_1',
  name: 'Seewil',
  variant: 0,
  exit: exitTo(SEEWIL_DOORS.house1),
  npcs: [
    {
      id: 'matti', x: 7, y: 4, facing: 'left', sprite: 'scientist',
      onTalk: async (ctx) => {
        const species = LEFTOVER_STARTER[ctx.state.starter];
        if (ctx.flag('gift_starter') || !species) {
          await ctx.say('Arven sagt: Ein Wildling ohne Freund ist wie Tee ohne Tasse.');
          return;
        }
        await ctx.say('Ich bin Matti, Arvens Kollege. Sie hat mir einen Wildling mitgegeben –\fden, den niemand gewählt hat. Bei dir hat er es bestimmt gut!');
        await ctx.giveCreature(species, 15, { nickname: true });
        ctx.setFlag('gift_starter');
      },
    },
  ],
});

export const SEEWIL_HOUSE_2: MapDef = makeHouse({
  id: 'seewil_house_2',
  name: 'Seewil',
  variant: 2,
  exit: exitTo(SEEWIL_DOORS.house2),
  npcs: [
    {
      id: 'oldwoman', x: 2, y: 4, facing: 'right', sprite: 'oldwoman',
      text: 'Auf dem Gipfelhorn wacht ein Wildling über die Alpenglut.\fMan sagt, sein Atem färbt die Berge am Abend rotgolden.',
    },
  ],
});

export const SEEWIL_HALL: MapDef = {
  id: 'seewil_hall',
  name: 'Seewil',
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
    '~~~=~~~~~~~~',
    'kggggggggggg',
    'gggggggggggg',
    'gggggggggggk',
    '~~~~~~~~=~~~',
    'gggggggggggk',
    'gggggggggggg',
    'kggggggggggg',
    '~~=~~~~~~~~~',
    'gggggggggggg',
    'kggggggggggk',
    'xxxxxxdxxxxx',
  ],
  warps: [{ x: 6, y: 15, to: 'seewil', tx: SEEWIL_DOORS.hall.x, ty: SEEWIL_DOORS.hall.y, facing: 'down' }],
  npcs: [
    {
      id: 'leader_undine', x: 6, y: 1, facing: 'down', sprite: 'leader_water',
      onTalk: async (ctx) => {
        const t = getTrainer(BADGE.leader);
        if (ctx.state.badges.includes(BADGE.id)) {
          await ctx.say(t.after);
          return;
        }
        await ctx.say(t.intro);
        if (!(await ctx.battle(t.id))) return;
        await ctx.say('Du fließt um jedes Hindernis herum wie ein Bergbach.\fHier, das hast du dir verdient!');
        await ctx.giveBadge(BADGE.id, BADGE.name);
        await ctx.giveItem('revive', 2);
        await ctx.say(t.after);
        await ctx.say('Ach, und draußen wartet jemand auf dich.\fEr ist vorhin … ein bisschen nass geworden.');
      },
    },
    // each trainer watches the stretch between two bridges, so the player has to pass in front of them
    { id: 'hall2_sina', x: 5, y: 9, facing: 'down', sprite: 'girl', trainer: { id: 'hall2_sina', sight: 3 } },
    { id: 'hall2_ruben', x: 6, y: 5, facing: 'down', sprite: 'boy', trainer: { id: 'hall2_ruben', sight: 3 } },
    { id: 'hall2_alois', x: 5, y: 3, facing: 'left', sprite: 'fisher', trainer: { id: 'hall2_alois', sight: 3 } },
    {
      id: 'advisor', x: 7, y: 14, facing: 'left', sprite: 'man',
      text: 'Tipp: Wasser fürchtet Pflanzen, Blitz und Frost!\fFeuer verdampft hier nur.',
    },
  ],
};
