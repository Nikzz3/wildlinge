/** Overworld → battle transition: the screen flashes, then black stripes wipe in from alternating sides. */
import type { GameContext, Gfx, Scene } from '../../core/contracts';

const STRIPES = 10;

export class BattleTransition implements Scene {
  readonly name = 'battle-transition';
  readonly overlay = true;
  private frame = 0;
  private readonly flashFrames: number;
  private readonly wipeFrames: number;

  /** onDone runs inside update() on the last (fully black) frame — replace this scene there. */
  constructor(
    private readonly g: GameContext,
    private readonly onDone: () => void,
  ) {
    this.flashFrames = g.testMode ? 2 : 36;
    this.wipeFrames = g.testMode ? 3 : 30;
  }

  onEnter(): void {
    this.g.audio.playSfx('encounter');
  }

  update(): void {
    this.frame++;
    if (this.frame === this.flashFrames + this.wipeFrames) this.onDone();
  }

  render(gfx: Gfx): void {
    if (this.frame < this.flashFrames) {
      // three white pulses
      const phase = (this.frame % 12) / 12;
      gfx.overlay('#ffffff', phase < 0.5 ? phase * 1.6 : (1 - phase) * 1.6);
      return;
    }
    const t = Math.min(1, (this.frame - this.flashFrames) / this.wipeFrames);
    const h = gfx.height / STRIPES;
    for (let i = 0; i < STRIPES; i++) {
      const local = Math.max(0, Math.min(1, t * 1.5 - (i / STRIPES) * 0.5));
      const w = Math.ceil(gfx.width * local);
      const x = i % 2 === 0 ? 0 : gfx.width - w;
      gfx.fillRect(x, Math.floor(i * h), w, Math.ceil(h), '#000000');
    }
  }
}
