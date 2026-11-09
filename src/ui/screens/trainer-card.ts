/** Trainer card: name, number, money, Lexikon, play time and the 4 badge slots. */
import { badgeIcon, trainerPortrait } from '../../art';
import type { GameContext, Gfx } from '../../core/contracts';
import { playTime } from '../../state';
import { drawBackdrop, labelText, lightText, PAL, Screen, shade, text } from './common';
import { badgeSlots, trainerNumber } from './logic';

const CARD = { x: 6, y: 6, w: 228, h: 148 } as const;
const BAND = '#3f8088';

class TrainerCardScreen extends Screen {
  readonly name = 'trainer-card';

  constructor(private readonly close: () => void) {
    super();
  }

  protected step(g: GameContext): void {
    if (g.input.pressed('a') || g.input.pressed('b') || g.input.pressed('start')) {
      g.audio.playSfx('cancel');
      this.close();
    }
  }

  render(gfx: Gfx, g: GameContext): void {
    drawBackdrop(gfx, g, 'violet');
    const { x, y, w, h } = CARD;
    const s = g.state;
    // card body with a light paper texture
    gfx.drawWindow(x, y, w, h);
    for (let sy = y + 24; sy < y + h - 3; sy += 4) gfx.fillRect(x + 3, sy, w - 6, 1, '#f0eee2');
    gfx.fillRect(x + 3, y + 3, w - 6, 19, BAND);
    gfx.fillRect(x + 3, y + 22, w - 6, 1, shade(BAND, 0.7));
    lightText(gfx, 'TRAINERPASS', x + 9, y + 4);
    lightText(gfx, `ID-Nr. ${trainerNumber(s.playerName)}`, x + w - 9, y + 4, 'right');

    const rows: readonly [string, string][] = [
      ['NAME', s.playerName],
      ['GELD', `${s.money} Fr.`],
      ['LEXIKON', String(s.dexCaught.length)],
      ['SPIELZEIT', playTime(s)],
    ];
    rows.forEach(([label, value], i) => {
      const ry = y + 27 + i * 17;
      labelText(gfx, label, x + 12, ry);
      text(gfx, value, x + 142, ry, 'right');
      gfx.fillRect(x + 12, ry + 15, 130, 1, shade(PAL.inner, 1.25));
    });

    // portrait
    const px = x + w - 78;
    const py = y + 28;
    gfx.fillRect(px, py, 68, 66, shade(BAND, 1.75));
    gfx.strokeRect(px, py, 68, 66, shade(BAND, 1.2));
    const portrait = trainerPortrait('player');
    gfx.clipped(px + 1, py + 1, 66, 64, () =>
      gfx.drawBitmap(portrait, px + 34 - Math.floor(portrait.w / 2), py + 65 - portrait.h),
    );

    // badges
    labelText(gfx, 'ABZEICHEN', x + 12, y + 99);
    const earned = badgeSlots(s.badges);
    earned.forEach((has, i) => {
      const bx = x + 12 + i * 34;
      const by = y + 117;
      gfx.fillRect(bx, by, 26, 24, has ? '#fff8e0' : '#e8e6d8');
      gfx.strokeRect(bx, by, 26, 24, has ? '#c8a050' : '#c0beb0');
      if (has) gfx.drawBitmap(badgeIcon(i), bx + 5, by + 4);
      else gfx.drawBitmap(badgeIcon(i), bx + 5, by + 4, { tint: '#d0cec0' });
    });
    labelText(gfx, `${s.badges.length}/4`, x + w - 12, y + 121, 'right');
  }
}

export function runTrainerCard(g: GameContext): Promise<void> {
  return g.open<void>((close) => new TrainerCardScreen(() => close()));
}
