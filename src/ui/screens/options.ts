/**
 * Options: text speed, music / sfx volume, battle animations (live, stored in state.options),
 * and moving the save to another machine.
 */
import { icon } from '../../art';
import type { GameContext, Gfx } from '../../core/contracts';
import type { Options } from '../../core/types';
import {
  drawBackdrop, drawHeader, drawRowHighlight, labelText, ListCursor, PAL, promptBox, Screen, shade, text,
} from './common';
import { runSaveTransfer } from './transfer';

const SPEEDS: readonly Options['textSpeed'][] = ['slow', 'normal', 'fast'];
const SPEED_NAMES: Record<Options['textSpeed'], string> = { slow: 'langsam', normal: 'normal', fast: 'schnell' };

type Row = 'speed' | 'music' | 'sfx' | 'anims' | 'transfer' | 'back';
const ROWS: readonly { id: Row; label: string; help: string }[] = [
  { id: 'speed', label: 'TEXTTEMPO', help: 'Wie schnell Texte erscheinen.' },
  { id: 'music', label: 'MUSIK', help: 'Lautstärke der Musik.' },
  { id: 'sfx', label: 'EFFEKTE', help: 'Lautstärke der Geräusche.' },
  { id: 'anims', label: 'KAMPFANIMATION', help: 'Attacken im Kampf animieren?' },
  { id: 'transfer', label: 'SPIELSTAND ÜBERTRAGEN', help: 'Als Datei exportieren / importieren.' },
  { id: 'back', label: 'ZURÜCK', help: 'Zurück zum Menü.' },
];

/** Window spans y 21..127, clear of the help box at y 128. */
const BOX = { x: 6, y: 21, w: 228, rowH: 16 } as const;
const VALUE_X = 120;

/** Volume 0..1 → 0..10 steps. */
const steps = (v: number) => Math.round(v * 10);

class OptionsScreen extends Screen {
  readonly name = 'options';
  private readonly cursor = new ListCursor(ROWS.length, ROWS.length);

  constructor(private readonly close: () => void) {
    super();
  }

  protected step(g: GameContext): void {
    if (this.cursor.update(g)) return;
    const row = ROWS[this.cursor.index]?.id ?? 'back';
    const input = g.input;
    if (input.repeat('left') || input.repeat('right')) {
      if (this.change(g, row, input.repeat('left') ? -1 : 1)) g.audio.playSfx('cursor');
    } else if (input.pressed('a')) {
      if (row === 'back') return this.exit(g);
      if (row === 'transfer') return this.transfer(g);
      if (this.change(g, row, 1, true)) g.audio.playSfx('cursor');
    } else if (input.pressed('b')) this.exit(g);
  }

  private exit(g: GameContext): void {
    g.audio.playSfx('cancel');
    this.close();
  }

  /** Import replaces the save, so it is only offered on the title screen (no game running yet). */
  private transfer(g: GameContext): void {
    g.audio.playSfx('confirm');
    this.run(() => runSaveTransfer(g, g.stack[0]?.name === 'title'));
  }

  /** Changes the value of a row by d. `wrap` cycles at the ends (A button). Returns true if something changed. */
  private change(g: GameContext, row: Row, d: number, wrap = false): boolean {
    const o = g.state.options;
    const shift = (i: number, n: number) => (wrap ? (i + d + n) % n : Math.max(0, Math.min(n - 1, i + d)));
    switch (row) {
      case 'speed': {
        const i = SPEEDS.indexOf(o.textSpeed);
        o.textSpeed = SPEEDS[shift(i, SPEEDS.length)] ?? o.textSpeed;
        return SPEEDS.indexOf(o.textSpeed) !== i;
      }
      case 'music':
      case 'sfx': {
        const cur = steps(row === 'music' ? o.musicVolume : o.sfxVolume);
        const next = shift(cur, 11);
        if (row === 'music') o.musicVolume = next / 10;
        else o.sfxVolume = next / 10;
        g.audio.setVolumes(o.musicVolume, o.sfxVolume);
        return next !== cur;
      }
      case 'anims': {
        const i = o.battleAnims ? 0 : 1;
        o.battleAnims = shift(i, 2) === 0;
        return shift(i, 2) !== i;
      }
      case 'transfer':
      case 'back':
        return false;
    }
  }

  render(gfx: Gfx, g: GameContext): void {
    drawBackdrop(gfx, g, 'slate');
    drawHeader(gfx, 'OPTIONEN');
    const o = g.state.options;
    const { x, y, w, rowH } = BOX;
    gfx.drawWindow(x, y, w, ROWS.length * rowH + 10);
    ROWS.forEach((row, i) => {
      const ry = y + 5 + i * rowH;
      const selected = i === this.cursor.index;
      if (selected) {
        drawRowHighlight(gfx, x + 3, ry, w - 6, rowH);
        gfx.drawBitmap(icon('cursor'), x + 6, ry + 6);
      }
      if (row.id === 'transfer' || row.id === 'back') {
        text(gfx, row.label, x + 18, ry + 2);
        return;
      }
      labelText(gfx, row.label, x + 18, ry + 2);
      const vx = x + VALUE_X;
      if (row.id === 'speed') drawChoice(gfx, vx, ry, SPEEDS.map((s) => SPEED_NAMES[s]), SPEEDS.indexOf(o.textSpeed));
      else if (row.id === 'anims') drawChoice(gfx, vx, ry, ['an', 'aus'], o.battleAnims ? 0 : 1);
      else drawVolume(gfx, vx, ry, steps(row.id === 'music' ? o.musicVolume : o.sfxVolume), selected);
    });
    promptBox(gfx, ROWS[this.cursor.index]?.help ?? '', 128, 32);
  }
}

/** Shows only the current choice between small arrows. */
function drawChoice(gfx: Gfx, x: number, y: number, labels: readonly string[], index: number): void {
  const label = labels[index] ?? '';
  const w = 90;
  if (index > 0) text(gfx, '<', x, y + 2);
  text(gfx, label, x + w / 2, y + 2, 'center');
  if (index < labels.length - 1) text(gfx, '>', x + w, y + 2, 'right');
}

/** 10 segments + number. */
function drawVolume(gfx: Gfx, x: number, y: number, value: number, selected: boolean): void {
  for (let i = 0; i < 10; i++) {
    const on = i < value;
    const h = 4 + Math.floor(i / 2);
    const sx = x + i * 7;
    const color = on ? (selected ? PAL.accent : PAL.frame) : shade(PAL.inner, 1.3);
    gfx.fillRect(sx, y + 14 - h, 5, h, color);
  }
  text(gfx, String(value), x + 90, y + 2, 'right');
}

export function runOptions(g: GameContext): Promise<void> {
  return g.open<void>((close) => new OptionsScreen(() => close()));
}
