/** Save flow: summary window + confirmation. */
import type { GameContext, Gfx } from '../../core/contracts';
import { playTime } from '../../state';
import { labelText, text, withBackdrop } from './common';

function drawSummary(gfx: Gfx, g: GameContext): void {
  const s = g.state;
  const x = 2;
  const y = 2;
  const w = 136;
  gfx.drawWindow(x, y, w, 74);
  text(gfx, s.playerName, x + 9, y + 4);
  const rows: readonly [string, string][] = [
    ['Abzeichen', String(s.badges.length)],
    ['Lexikon', String(s.dexCaught.length)],
    ['Spielzeit', playTime(s)],
  ];
  rows.forEach(([label, value], i) => {
    labelText(gfx, label, x + 9, y + 20 + i * 16);
    text(gfx, value, x + w - 9, y + 20 + i * 16, 'right');
  });
}

/** Returns true if the game was saved. */
export function runSaveMenu(g: GameContext): Promise<boolean> {
  return withBackdrop(g, 'save', drawSummary, async () => {
    if (!(await g.ui.confirm('Möchtest du das Spiel speichern?'))) return false;
    g.save();
    g.audio.playSfx('save');
    await g.ui.message('{PLAYER} hat das Spiel gespeichert.');
    return true;
  });
}
