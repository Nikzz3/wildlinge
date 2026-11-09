/** New-game intro: Professorin Arven welcomes the player, names for player and rival, off into Alvenland. */
import { charFrame, creatureSprite, icon, introFigure } from '../art';
import type { Bitmap } from '../core/bitmap';
import type { GameContext, Gfx, Scene } from '../core/contracts';
import { getSpecies } from '../data';
import { openNameEntry } from '../ui/screens';
import { clamp01, drawBottom, ease, fillEllipse, gradientBitmap, lazy, lerp, sparkle, tween, withAlpha } from './fx';
import { farRangeBitmap } from './panorama';

/** The Wildling Arven shows off (an early, friendly species). */
const DEMO_SPECIES = 'munggli';
const PLAYER_NAMES = ['Kai', 'Mia', 'Noah', 'Lea'] as const;
const RIVAL_NAMES = ['Lio', 'Ben', 'Finn', 'Timo'] as const;
const OWN_NAME = 'EIGENER NAME';
const STAGE_FLOOR = 112;
/** Where the full-body figures stand (a little in front of the text window). */
const FIGURE_FLOOR = 106;

interface Actor {
  readonly bmp: Bitmap;
  x: number;
  bottom: number;
  scale: number;
  alpha: number;
  tint: string | null;
  visible: boolean;
  shadow: boolean;
}

function actor(bmp: Bitmap, x: number, bottom: number, scale: number, shadow = false): Actor {
  return { bmp, x, bottom, scale, alpha: 1, tint: null, visible: false, shadow };
}

const backdrop = lazy(() => gradientBitmap(240, STAGE_FLOOR, ['#fbf4e4', '#f6e8dc', '#e8e4dc', '#d4e6de', '#bcdcd4']));

class IntroStage implements Scene {
  readonly name = 'intro';
  readonly prof = actor(introFigure('prof'), 120, FIGURE_FLOOR, 1, true);
  readonly rival = actor(introFigure('rival'), 300, FIGURE_FLOOR, 1, true);
  readonly player = actor(introFigure('player'), -60, FIGURE_FLOOR, 1, true);
  /** The overworld sprite the player turns into at the very end. */
  readonly walker = actor(charFrame('player', 'down', 0), 120, FIGURE_FLOOR, 1, true);
  readonly mon = actor(creatureSprite(DEMO_SPECIES, 'front'), 184, 100, 1, true);
  readonly crystal = { x: 0, y: 0, visible: false };
  /** Burst at the crystal: progress 0..1 (or -1 = none). */
  burst = -1;

  update(): void {}

  render(gfx: Gfx, g: GameContext): void {
    gfx.drawBitmap(backdrop(), 0, 0);
    gfx.drawBitmap(farRangeBitmap(), 0, -14, { tint: '#ffffff', alpha: 0.45 });
    this.drawBokeh(gfx, g.frame);
    for (const a of [this.prof, this.rival, this.player, this.walker, this.mon]) this.drawActor(gfx, a);
    if (this.crystal.visible) drawBottom(gfx, icon('crystal_throw'), this.crystal.x, this.crystal.y + 6);
    if (this.burst >= 0 && this.burst < 1) {
      const r = 4 + this.burst * 30;
      fillEllipse(gfx, this.mon.x, this.mon.bottom - 22, r, r, withAlpha('#ffffff', 0.8 * (1 - this.burst)));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        sparkle(gfx, this.mon.x + Math.cos(a) * r * 1.3, this.mon.bottom - 22 + Math.sin(a) * r * 1.3, 2, '#f8d878');
      }
    }
    // The text window stays in place between messages so the figures always stand in front of it.
    gfx.drawWindow(0, STAGE_FLOOR, 240, 160 - STAGE_FLOOR);
  }

  private drawBokeh(gfx: Gfx, frame: number): void {
    for (let i = 0; i < 7; i++) {
      const x = (i * 41 + Math.sin(frame / 90 + i) * 12 + 240) % 240;
      const y = 100 - ((frame * (0.08 + i * 0.015) + i * 37) % 120);
      fillEllipse(gfx, x, y, 5 + (i % 3) * 3, 5 + (i % 3) * 3, withAlpha('#ffffff', 0.22));
    }
  }

  private drawActor(gfx: Gfx, a: Actor): void {
    if (!a.visible || a.alpha <= 0) return;
    if (a.shadow) {
      const shadow = withAlpha('#5c8078', 0.3 * a.alpha);
      fillEllipse(gfx, a.x, a.bottom - 1, (a.bmp.w * a.scale) / 3, Math.max(1, a.scale), shadow);
    }
    drawBottom(gfx, a.bmp, a.x, a.bottom, { scale: a.scale, alpha: a.alpha });
    if (a.tint) drawBottom(gfx, a.bmp, a.x, a.bottom, { scale: a.scale, tint: a.tint, alpha: a.alpha });
  }
}

/** Slides an actor horizontally (eased). */
function slide(g: GameContext, a: Actor, to: number, frames = 22): Promise<void> {
  const from = a.x;
  a.visible = true;
  return tween(g, frames, (t) => {
    a.x = lerp(from, to, ease(t));
  });
}

async function throwCrystal(g: GameContext, stage: IntroStage): Promise<void> {
  // from the hand holding the clipboard
  const from = { x: stage.prof.x + 14, y: stage.prof.bottom - 32 };
  const to = { x: stage.mon.x, y: stage.mon.bottom - 22 };
  stage.crystal.visible = true;
  g.audio.playSfx('throw');
  await tween(g, 28, (t) => {
    stage.crystal.x = lerp(from.x, to.x, t);
    stage.crystal.y = lerp(from.y, to.y, t) - Math.sin(t * Math.PI) * 36;
  });
  stage.crystal.visible = false;
  stage.mon.visible = true;
  stage.mon.tint = '#ffffff';
  g.audio.playCry(DEMO_SPECIES);
  await tween(g, 24, (t) => {
    stage.burst = t;
    stage.mon.scale = Math.min(1, 0.3 + t * 1.4);
  });
  stage.burst = -1;
  stage.mon.scale = 1;
  stage.mon.tint = null;
}

/** Quick name choice with a custom-name option. */
async function chooseName(g: GameContext, question: string, names: readonly string[], entryTitle: string): Promise<string> {
  const pick = await g.ui.ask(question, [OWN_NAME, ...names], { cancel: null });
  if (pick > 0) return names[pick - 1]!;
  return openNameEntry(g, { title: entryTitle, initial: names[0]!, maxLen: 8 });
}

/** New-game intro. Sets player/rival names in g.state; leaves the screen faded to white (caller fades in). */
export async function runIntro(g: GameContext): Promise<void> {
  const stage = new IntroStage();
  const say = (text: string) => g.ui.message(text);
  g.push(stage);
  g.audio.playMusic('intro');
  stage.prof.visible = true;
  await g.fadeIn(30);

  await say('Hallo, hallo! Da bist du ja!\fWillkommen in Alvenland, der Heimat der Wildlinge!');
  await say('Ich bin Professorin Arven und erforsche in Moosbach die Wildlinge.\fNebenbei koche ich den besten Tee im ganzen Tal!');
  await say('Wildlinge sind wundersame Wesen. Sie leben in Wäldern, Seen und Höhlen –\fund sogar hoch oben auf den Gletschern.');
  await slide(g, stage.prof, 76);
  await throwCrystal(g, stage);
  await say(`Das ist ${getSpecies(DEMO_SPECIES).name}! Wenn es pfeift, hört man es bis ins nächste Dorf.`);
  await say('Viele Menschen ziehen mit Wildlingen als Partnern durchs Land.\fAndere erforschen sie – so wie ich.');

  await tween(g, 16, (t) => {
    stage.mon.alpha = 1 - t;
  });
  stage.mon.visible = false;
  await slide(g, stage.prof, 120);
  await say('Aber genug von mir. Erzähl doch mal von dir!');
  await slide(g, stage.prof, -80);
  stage.prof.visible = false;
  await slide(g, stage.player, 92);
  g.state.playerName = await chooseName(g, 'Wie heißt du denn?', PLAYER_NAMES, 'Wie heißt du?');
  await say('{PLAYER} also! Ein schöner Name.');

  await slide(g, stage.player, 330);
  stage.player.visible = false;
  stage.rival.x = 300;
  await slide(g, stage.rival, 92);
  await say('Und das ist dein Nachbar. Ihr kennt euch, seit ihr laufen könnt –\fund ihr streitet, seit ihr reden könnt!');
  g.state.rivalName = await chooseName(g, 'Wie heißt er noch gleich?', RIVAL_NAMES, 'Wie heißt dein Nachbar?');
  await say('Genau, {RIVAL}! Ihr zwei wollt immer als Erste oben am Hang sein.');

  await slide(g, stage.rival, -80);
  stage.rival.visible = false;
  stage.prof.x = 320;
  await slide(g, stage.prof, 120);
  await say('Hoch über Alvenland, auf dem Gipfelhorn, brennt die Alpenglut.\fIhr warmes Licht hält das ewige Eis von unseren Tälern fern.');
  await say('Man erzählt sich, dass ein uralter Wildling über die Flamme wacht.\fGesehen haben ihn nur die wenigsten.');
  await slide(g, stage.prof, -80);
  stage.prof.visible = false;
  stage.player.x = -60;
  await slide(g, stage.player, 120);
  await say(
    '{PLAYER}! Heute beginnt deine eigene Geschichte.\fNeue Freunde, wilde Pfade und manches Geheimnis warten auf dich.\fAlso los – Alvenland ruft!',
  );

  // the figure shrinks down to overworld size and fades into the walking sprite
  const { player, walker } = stage;
  walker.x = player.x;
  walker.alpha = 0;
  walker.visible = true;
  await tween(g, 40, (t) => {
    player.scale = lerp(1, walker.bmp.h / player.bmp.h, ease(t));
    walker.alpha = clamp01((t - 0.6) / 0.4);
    player.alpha = 1 - walker.alpha;
  });
  await g.wait(10);
  await g.fadeOut(48, '#ffffff');
  g.pop(stage);
}
