/** Bottom 48px of the battle screen: message box, command menu (2×2) and move menu (2×2 + info panel). */
import { icon } from '../../art';
import type { GameContext, Gfx } from '../../core/contracts';
import { TYPE_COLORS, TYPE_NAMES } from '../../core/types';
import { getMove } from '../../data';
import { COLORS } from '../../engine/gfx';
import type { BattleScene } from '../scene';
import { BOX_Y } from './layout';

const COMMANDS = ['KAMPF', 'BEUTEL', 'TEAM', 'FLUCHT'] as const;

const ROW_Y = [BOX_Y + 7, BOX_Y + 23] as const;
const LIGHT = { color: COLORS.textLight, shadow: COLORS.textLightShadow } as const;

/** 2×2 grid target (index = row * 2 + col) for a direction; absolute, so holding a direction never flips back. */
export function gridTarget(index: number, dir: 'up' | 'down' | 'left' | 'right'): number {
  const row = index >> 1;
  const col = index & 1;
  if (dir === 'left') return row * 2;
  if (dir === 'right') return row * 2 + 1;
  if (dir === 'up') return col;
  return 2 + col;
}

/** 2×2 cursor movement; ignores targets ≥ count. */
export function navigateGrid(g: GameContext, index: number, count: number): number {
  const input = g.input;
  const dir = (['left', 'right', 'up', 'down'] as const).find((d) => input.repeat(d));
  if (!dir) return index;
  const next = gridTarget(index, dir);
  if (next === index || next >= count) return index;
  g.audio.playSfx('cursor');
  return next;
}

function grid(gfx: Gfx, labels: readonly string[], cursor: number, x: number, colW: number): void {
  labels.forEach((label, i) => {
    const tx = x + (i % 2) * colW;
    const ty = ROW_Y[i < 2 ? 0 : 1];
    gfx.drawText(label, tx, ty);
    if (i === cursor) gfx.drawBitmap(icon('cursor'), tx - 10, ty + 4);
  });
}

export function drawBottom(gfx: Gfx, g: GameContext, s: BattleScene): void {
  const mode = s.bottom;
  switch (mode.kind) {
    case 'empty':
      gfx.drawWindow(0, BOX_Y, 240, 48, 'dark');
      return;
    case 'message':
      s.box.render(gfx, g);
      if (s.awaitingA) {
        const bob = Math.floor(g.frame / 16) % 2;
        gfx.drawBitmap(icon('arrow_down'), 240 - 10 - 6, BOX_Y + 48 - 14 + bob, { tint: '#f8f8f8' });
      }
      return;
    case 'command': {
      gfx.drawWindow(0, BOX_Y, 120, 48, 'dark');
      gfx.drawText('Was soll', 10, ROW_Y[0], LIGHT);
      gfx.drawText(`${mode.name} tun?`, 10, ROW_Y[1], LIGHT);
      gfx.drawWindow(120, BOX_Y, 120, 48);
      grid(gfx, COMMANDS, s.cmdCursor, 138, 48);
      return;
    }
    case 'moves': {
      gfx.drawWindow(0, BOX_Y, 182, 48);
      const names = [0, 1, 2, 3].map((i) => {
        const slot = mode.moves[i];
        return slot ? getMove(slot.id).name : '-';
      });
      grid(gfx, names, s.moveCursor, 16, 86);
      gfx.drawWindow(182, BOX_Y, 58, 48);
      const slot = mode.moves[s.moveCursor];
      if (!slot) return;
      const def = getMove(slot.id);
      const color = slot.pp === 0 ? '#d03020' : slot.pp <= def.pp / 4 ? '#d07818' : COLORS.text;
      gfx.drawText('EN', 190, ROW_Y[0]);
      gfx.drawText(`${slot.pp}/${def.pp}`, 232, ROW_Y[0], { align: 'right', color });
      gfx.fillRect(188, BOX_Y + 28, 46, 12, TYPE_COLORS[def.type]);
      gfx.fillRect(188, BOX_Y + 39, 46, 1, '#00000040');
      gfx.drawText(TYPE_NAMES[def.type], 211, BOX_Y + 25, { align: 'center', color: '#ffffff', shadow: '#00000080' });
      return;
    }
  }
}
