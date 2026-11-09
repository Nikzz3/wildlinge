/** The ending: the Alpenglut above the valley, epilogue, scrolling credits, creature parade, stats and "ENDE". */
import { creatureSprite } from '../art';
import type { Bitmap } from '../core/bitmap';
import type { GameContext, Gfx, Scene } from '../core/contracts';
import type { SaveData } from '../core/types';
import { SPECIES, getSpecies } from '../data';
import { COLORS } from '../engine/gfx';
import { fmt, playTime } from '../state';
import { clamp01, drawBottom, easeOut } from './fx';
import { drawWord, endLogo, titleLogo } from './logo';
import { FOREGROUND, SUMMIT, drawFlame, drawPanoramaBack, drawPanoramaFront } from './panorama';

const EPILOGUE = [
  'Auf dem Gipfelhorn lodert die Alpenglut wieder hell und warm.\fAm Abend glühen die Berge rotgolden wie seit jeher.',
  'Im Flüsterwald taut das letzte Eis. In Funkenstadt summen die Lichter,\fund über dem See von Seewil tanzen die Tauchli.',
  'Der Frostmantel hat seine Kutten an den Nagel gehängt.\fEisner führt jetzt Wanderer über den Gletscher. Er erklärt ihnen jeden Stein.',
  'In Frostalp gibt es endlich heiße Schokolade.\f{RIVAL} trinkt drei Tassen. Mindestens. Professorin Arven auch.',
  'Und die Alpenglut? Sie brennt weiter –\fsolange jemand mit warmem Herzen den Gipfel erreicht.',
  'Alvenland ist gerettet. Danke, {PLAYER}!',
] as const;

type CreditLine =
  | { kind: 'logo' }
  | { kind: 'role'; text: string }
  | { kind: 'name'; text: string }
  | { kind: 'gap'; h: number };

const TEAM = 'Das Wildlinge-Team';

const CREDITS: readonly CreditLine[] = [
  { kind: 'logo' },
  { kind: 'name', text: 'Eine Geschichte aus Alvenland' },
  { kind: 'gap', h: 40 },
  ...(
    [
      ['IDEE & DESIGN', TEAM],
      ['PROGRAMMIERUNG', TEAM],
      ['PIXELKUNST', TEAM],
      ['MUSIK & KLANG', TEAM],
      ['WELT & GESCHICHTEN', TEAM],
      ['WILDLING-FORSCHUNG', 'Professorin Arven'],
      ['TESTSPIEL', TEAM],
    ] as const
  ).flatMap(([role, name]): CreditLine[] => [
    { kind: 'role', text: role },
    { kind: 'name', text: name },
    { kind: 'gap', h: 22 },
  ]),
  { kind: 'role', text: 'BESONDERER DANK' },
  { kind: 'name', text: 'allen Wildlingen in Alvenland' },
  { kind: 'name', text: 'und dir, {PLAYER}!' },
];

const lineHeight = (l: CreditLine): number => (l.kind === 'logo' ? 52 : l.kind === 'gap' ? l.h : 16);
const CREDITS_HEIGHT = CREDITS.reduce((n, l) => n + lineHeight(l), 0);

const PARADE_GAP = 72;
const PARADE_BASE = 104;
const END_LOGO_AT = 90;
const END_INPUT_AT = 130;
const FLAME_RAISE = 22;

type Phase = 'flame' | 'scroll' | 'parade' | 'end';

interface Marcher {
  name: string;
  sprite: Bitmap;
}

class CreditsScene implements Scene {
  readonly name = 'credits';
  private phase: Phase = 'flame';
  private t = 0;
  private pos = 0;
  private done: (() => void) | null = null;
  private readonly marchers: Marcher[];
  private readonly team: Bitmap[];
  private readonly stats: [string, string][];

  constructor(
    private readonly state: SaveData,
    private readonly speed: number,
  ) {
    this.marchers = [...state.dexCaught]
      .map(getSpecies)
      .sort((a, b) => a.dexNo - b.dexNo)
      .map((s) => ({ name: s.name, sprite: creatureSprite(s.id, 'front') }));
    this.team = state.party.map((c) => creatureSprite(c.species, 'icon'));
    this.stats = [
      ['Name', state.playerName],
      ['Spielzeit', playTime(state)],
      ['Lexikon', `${state.dexCaught.length} / ${SPECIES.length} gefangen`],
    ];
  }

  /** Switches to a phase and resolves when it is finished. */
  run(phase: Exclude<Phase, 'flame'>): Promise<void> {
    this.phase = phase;
    this.t = 0;
    this.pos = 0;
    return new Promise((resolve) => {
      this.done = resolve;
    });
  }

  private complete(): void {
    const done = this.done;
    this.done = null;
    done?.();
  }

  update(g: GameContext): void {
    this.t++;
    const fast = g.input.held('a') || g.input.held('b') ? 4 : 1;
    if (this.phase === 'scroll') {
      this.pos += this.speed * 0.5 * fast;
      if (this.pos > 160 + CREDITS_HEIGHT) this.complete();
    } else if (this.phase === 'parade') {
      this.pos += this.speed * 1.25 * fast;
      if (this.pos > 240 + this.marchers.length * PARADE_GAP + 40) this.complete();
    } else if (this.phase === 'end' && this.done && this.t >= END_INPUT_AT && g.input.pressed('a')) {
      // only once: after this the scene just fades out
      g.audio.playSfx('confirm');
      this.complete();
    }
  }

  render(gfx: Gfx, g: GameContext): void {
    const f = g.frame;
    if (this.phase === 'flame') {
      // raised so the peak stays visible above the epilogue text box
      gfx.clear(FOREGROUND);
      gfx.translated(0, -FLAME_RAISE, () => {
        drawPanoramaBack(gfx, f, { glow: 1.6 });
        drawFlame(gfx, SUMMIT.x, SUMMIT.y + 1, 1.2, f);
        drawPanoramaFront(gfx, f);
      });
      return;
    }
    drawPanoramaBack(gfx, f, { glow: 1.3 });
    drawFlame(gfx, SUMMIT.x, SUMMIT.y + 1, 0.8, f);
    drawPanoramaFront(gfx, f);
    gfx.overlay('#0c0818', 0.6);
    if (this.phase === 'scroll') this.drawCredits(gfx);
    else if (this.phase === 'parade') this.drawParade(gfx);
    else this.drawEnd(gfx, f);
  }

  private drawCredits(gfx: Gfx): void {
    let y = Math.round(160 - this.pos);
    for (const l of CREDITS) {
      const h = lineHeight(l);
      if (y > -h && y < 160) {
        if (l.kind === 'logo') {
          const logo = titleLogo();
          drawWord(gfx, logo, Math.round((240 - logo.w) / 2), y);
          gfx.drawText('Alpenglühen', 120, y + logo.h, { align: 'center', color: '#ffe8c0', shadow: '#5a1c3c' });
        } else if (l.kind === 'role') {
          gfx.drawText(l.text, 120, y, { align: 'center', color: '#f8c060', shadow: '#401828' });
        } else if (l.kind === 'name') {
          gfx.drawText(fmt(this.state, l.text), 120, y, { align: 'center', color: '#f8f0ff', shadow: '#201030' });
        }
      }
      y += h;
    }
  }

  private drawParade(gfx: Gfx): void {
    gfx.drawText('Deine Wildlinge', 120, 16, { align: 'center', color: '#f8c060', shadow: '#401828' });
    this.marchers.forEach((m, i) => {
      const x = 240 + 30 + i * PARADE_GAP - this.pos;
      if (x < -40 || x > 280) return;
      const hop = Math.round(Math.abs(Math.sin((this.pos + i * 23) / 10)) * 5);
      drawBottom(gfx, m.sprite, x, PARADE_BASE - hop);
      gfx.fillRect(Math.round(x) - 12, PARADE_BASE, 24, 2, '#00000060');
      gfx.drawText(m.name, x, PARADE_BASE + 4, { align: 'center', color: '#f8f0ff', shadow: '#201030' });
    });
  }

  private drawEnd(gfx: Gfx, f: number): void {
    const winY = 12;
    gfx.drawWindow(36, winY, 168, 60);
    this.stats.forEach(([key, value], i) => {
      gfx.drawText(key, 48, winY + 6 + i * 16, { color: COLORS.windowFrame });
      gfx.drawText(value, 192, winY + 6 + i * 16, { align: 'right' });
    });
    const teamW = this.team.length * 26;
    this.team.forEach((icon, i) => gfx.drawBitmap(icon, Math.round(120 - teamW / 2 + i * 26), 76));
    const p = easeOut(clamp01((this.t - END_LOGO_AT) / 30));
    if (p > 0) {
      const logo = endLogo();
      drawWord(gfx, logo, Math.round((240 - logo.w) / 2), Math.round(114 - (1 - p) * 20));
    }
    if (this.done && this.t >= END_INPUT_AT && f % 60 < 40) gfx.drawText('▼', 222, 140, { color: '#f8f0ff', shadow: '#201030' });
  }
}

/** Ending + credits. Resolves with the screen faded to black (caller returns to the title). */
export async function runCredits(g: GameContext): Promise<void> {
  const scene = new CreditsScene(g.state, g.testMode ? 8 : 1);
  await g.fadeOut(40);
  g.push(scene);
  g.audio.playMusic('credits');
  await g.fadeIn(60);
  await g.wait(60);
  for (const line of EPILOGUE) await g.ui.message(line);
  await g.fadeOut(40);
  const scroll = scene.run('scroll');
  await g.fadeIn(40);
  await scroll;
  if (g.state.dexCaught.length > 0) await scene.run('parade');
  await scene.run('end');
  await g.fadeOut(60);
  g.pop(scene);
}
