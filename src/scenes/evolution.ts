/** Evolution sequence: white silhouettes alternate with an accelerating rhythm; B cancels. */
import { creatureSprite } from '../art';
import type { Bitmap } from '../core/bitmap';
import type { GameContext, Gfx, Scene } from '../core/contracts';
import { displayName, evolve, movesLearnedAt } from '../creature';
import { getSpecies } from '../data';
import { COLORS } from '../engine/gfx';
import { DIALOG } from '../engine/ui';
import { markCaught } from '../state';
import { learnMoveFlow } from '../ui/screens';
import { clamp01, drawCentered, fillDisc, fillEllipse, gradientBitmap, hash01, lazy, sparkle, withAlpha } from './fx';

const CX = 120;
const CY = 58;

type Phase = 'idle' | 'morph' | 'cancel' | 'reveal' | 'done';

const background = lazy(() => gradientBitmap(240, 160, ['#0a0e24', '#10183a', '#18244c', '#22305a', '#2a3a62']));

interface Timing {
  whiten: number;
  morph: number;
  settle: number;
}

/** Number of old/new switches after n morph frames (rate accelerates from every 30 to every 3 frames). */
function morphPhase(n: number, total: number): number {
  const r0 = 1 / 30;
  const r1 = 1 / 3;
  return r0 * n + ((r1 - r0) * n * n) / (2 * total);
}

class EvolutionScene implements Scene {
  readonly name = 'evolution';
  private phase: Phase = 'idle';
  private t = 0;
  private finish: ((evolved: boolean) => void) | null = null;
  /** After the sequence: show the new form (evolved) or the old one (canceled). */
  private showNew = false;

  constructor(
    private readonly from: Bitmap,
    private readonly to: Bitmap,
    private readonly timing: Timing,
    /** Display name (nickname kept) for the status line during the morph. */
    private readonly label: string,
  ) {}

  /** Runs the transformation; resolves true when complete, false if the player pressed B. */
  play(): Promise<boolean> {
    this.phase = 'morph';
    this.t = 0;
    return new Promise((resolve) => {
      this.finish = resolve;
    });
  }

  update(g: GameContext): void {
    this.t++;
    const { whiten, morph, settle } = this.timing;
    if (this.phase === 'morph') {
      if (g.input.pressed('b')) {
        g.audio.playSfx('cancel');
        this.phase = 'cancel';
        this.t = 0;
      } else if (this.t >= whiten + morph) {
        g.audio.playSfx('stat_up');
        this.phase = 'reveal';
        this.t = 0;
      }
    } else if ((this.phase === 'cancel' || this.phase === 'reveal') && this.t >= settle) {
      const evolved = this.phase === 'reveal';
      this.phase = 'done';
      this.showNew = evolved;
      this.finish?.(evolved);
      this.finish = null;
    }
  }

  render(gfx: Gfx, g: GameContext): void {
    gfx.drawBitmap(background(), 0, 0);
    const { whiten, morph, settle } = this.timing;
    const intensity =
      this.phase === 'morph' ? clamp01(this.t / (whiten + morph)) : this.phase === 'reveal' ? 1 - this.t / settle : 0;
    this.drawRays(gfx, g.frame, intensity);
    fillEllipse(gfx, CX, CY + 30, 30, 6, withAlpha('#5878c0', 0.35));
    fillDisc(gfx, CX, CY, 34, withAlpha('#c8d8ff', 0.06 + intensity * 0.2));

    switch (this.phase) {
      case 'idle':
        drawCentered(gfx, this.from, CX, CY);
        break;
      case 'done':
        drawCentered(gfx, this.showNew ? this.to : this.from, CX, CY);
        break;
      case 'morph': {
        if (this.t < whiten) {
          drawCentered(gfx, this.from, CX, CY);
          drawCentered(gfx, this.from, CX, CY, { tint: '#ffffff', alpha: this.t / whiten });
        } else {
          const n = this.t - whiten;
          const showNew = Math.floor(morphPhase(n, morph)) % 2 === 1;
          drawCentered(gfx, showNew ? this.to : this.from, CX, CY, { tint: '#ffffff' });
        }
        this.drawConverging(gfx, this.t, intensity);
        break;
      }
      case 'cancel':
        drawCentered(gfx, this.from, CX, CY);
        drawCentered(gfx, this.from, CX, CY, { tint: '#ffffff', alpha: 1 - this.t / settle });
        break;
      case 'reveal': {
        const p = this.t / settle;
        drawCentered(gfx, this.to, CX, CY);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const r = 12 + p * 90;
          sparkle(gfx, CX + Math.cos(a) * r, CY + Math.sin(a) * r * 0.8, p < 0.5 ? 2 : 1, withAlpha('#ffe890', 1 - p));
        }
        break;
      }
    }
    this.drawDialog(gfx, g.frame);
    if (this.phase === 'reveal') gfx.overlay('#ffffff', 1 - this.t / settle);
  }

  /** The dialog window stays on screen; while morphing it says what is happening and that B stops it. */
  private drawDialog(gfx: Gfx, frame: number): void {
    const { x, y, w, h } = DIALOG;
    gfx.drawWindow(x, y, w, h);
    if (this.phase !== 'morph') return;
    const dots = '.'.repeat(1 + (Math.floor(frame / 20) % 3));
    gfx.drawText(`${this.label} entwickelt sich${dots}`, x + 10, y + 7);
    gfx.drawText('B: Abbrechen', x + w - 12, y + 23, { color: COLORS.windowFrame, align: 'right' });
  }

  private drawRays(gfx: Gfx, frame: number, intensity: number): void {
    if (intensity <= 0) return;
    const rays = 12;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + frame * 0.01;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      for (let r = 28; r < 150; r += 2) {
        const alpha = intensity * 0.45 * (1 - r / 150);
        gfx.fillRect(Math.round(CX + cos * r), Math.round(CY + sin * r), 1, 1, withAlpha('#d8e4ff', alpha));
      }
    }
  }

  /** Sparkles drawn into the creature from all sides. */
  private drawConverging(gfx: Gfx, t: number, intensity: number): void {
    for (let i = 0; i < 20; i++) {
      const a = hash01(i + 31) * Math.PI * 2;
      const k = (t * (0.012 + hash01(i + 77) * 0.01) + hash01(i + 5)) % 1;
      const r = 100 * (1 - k);
      const color = i % 3 === 0 ? '#fff0a0' : '#c8e0ff';
      sparkle(gfx, CX + Math.cos(a) * r, CY + Math.sin(a) * r * 0.8, k > 0.7 ? 1 : 0, withAlpha(color, intensity));
    }
  }
}

/**
 * Evolution sequence for state.party[partyIndex] → `to`. B cancels. Returns true if it evolved
 * (species changed, Lexikon updated, new moves offered). Keeps the nickname.
 * fadeIn: false leaves the screen faded out at the end (the caller fades in, e.g. after a battle).
 */
export async function runEvolution(g: GameContext, partyIndex: number, to: string, opts: { fadeIn?: boolean } = {}): Promise<boolean> {
  const c = g.state.party[partyIndex];
  if (!c) return false;
  const name = displayName(c);
  const prevMusic = g.audio.currentMusic();
  const timing: Timing = g.testMode ? { whiten: 10, morph: 60, settle: 20 } : { whiten: 40, morph: 240, settle: 40 };
  const scene = new EvolutionScene(creatureSprite(c.species, 'front'), creatureSprite(to, 'front'), timing, name);

  await g.fadeOut(16);
  g.push(scene);
  g.audio.playMusic('evolution');
  await g.fadeIn(16);
  g.audio.playCry(c.species);
  await g.ui.message(`Nanu? ${name} entwickelt sich!`);
  const evolved = await scene.play();

  if (evolved) {
    const from = c.species;
    // A late evolution (e.g. the creature fainted at its evolution level) must still teach the new
    // form's moves from the evolution level up to now.
    const fromLevel = Math.min(getSpecies(from).evolves?.level ?? c.level, c.level);
    evolve(c, to);
    markCaught(g.state, to);
    g.audio.playCry(to);
    await g.wait(40);
    const jingle = g.audio.playJingle('evolved');
    await g.ui.message(`Glückwunsch! ${name} hat sich zu ${getSpecies(to).name} entwickelt!`);
    if (!g.testMode) await jingle; // real-time audio; test runs advance frames only
    for (let level = fromLevel; level <= c.level; level++) {
      const known = level < c.level ? movesLearnedAt(from, level) : [];
      for (const move of movesLearnedAt(to, level)) {
        if (!known.includes(move) && !c.moves.some((m) => m.id === move)) await learnMoveFlow(g, c, move);
      }
    }
  } else {
    await g.ui.message(`${name} hat sich nicht entwickelt.`);
  }

  await g.fadeOut(16);
  g.pop(scene);
  g.audio.playMusic(prevMusic);
  if (opts.fadeIn ?? true) await g.fadeIn(16);
  return evolved;
}
