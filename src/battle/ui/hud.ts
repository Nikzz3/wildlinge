/** Battle HUD drawing: creature panels, HP/ERF bars, status badges, party indicator, level-up window. */
import { icon } from '../../art';
import type { Gfx, Side } from '../../core/contracts';
import { STAT_LABELS, type StatId, type Stats, STATUS_SHORT, type StatusId } from '../../core/types';
import { COLORS } from '../../engine/gfx';
import { HUD } from './layout';

/** What the HUD shows for one creature (kept in sync with battle events, not with live state). */
export interface ShadowMon {
  name: string;
  species: string;
  level: number;
  hp: number;
  maxHp: number;
  status: StatusId | null;
  /** Total experience points. */
  exp: number;
}

export const STATUS_COLORS: Record<StatusId, string> = {
  burn: '#e06030',
  poison: '#a050b0',
  paralysis: '#c8a020',
  sleep: '#8088a0',
};

const TAG_FILL = '#384850';
const EXP_COLOR = '#48a8f8';

function drawStatusBadge(gfx: Gfx, x: number, y: number, status: StatusId): void {
  gfx.fillRect(x, y, 21, 10, STATUS_COLORS[status]);
  gfx.fillRect(x, y + 9, 21, 1, '#00000040');
  gfx.drawText(STATUS_SHORT[status], x + 2, y - 3, { color: '#ffffff', shadow: null });
}

/** "LP" tag (or the status badge) followed by the framed HP bar. */
function hpRow(gfx: Gfx, x: number, y: number, w: number, frac: number, status: StatusId | null): void {
  if (status) drawStatusBadge(gfx, x, y, status);
  else {
    gfx.fillRect(x, y, 15, 10, TAG_FILL);
    gfx.drawText('LP', x + 2, y - 3, { color: '#f8d030', shadow: null });
  }
  const bx = x + 24;
  const bw = w - 24;
  gfx.fillRect(bx - 1, y + 2, bw + 2, 6, TAG_FILL);
  gfx.drawBar(bx, y + 3, bw, 4, frac, gfx.hpColor(frac), '#506860');
}

function nameRow(gfx: Gfx, x: number, y: number, w: number, mon: ShadowMon): void {
  gfx.drawText(mon.name, x, y);
  gfx.drawText(`Lv${mon.level}`, x + w, y, { align: 'right' });
}

/** hp is the animated display value. */
export function drawEnemyHud(gfx: Gfx, mon: ShadowMon, hp: number, dx: number): void {
  const { x, y, w, h } = HUD.enemy;
  const left = x + dx;
  gfx.drawWindow(left, y, w, h);
  nameRow(gfx, left + 8, y + 1, w - 16, mon);
  hpRow(gfx, left + 8, y + 18, w - 16, mon.maxHp > 0 ? hp / mon.maxHp : 0, mon.status);
}

/** hp is the animated display value; expFrac 0..1 towards the next level. */
export function drawPlayerHud(gfx: Gfx, mon: ShadowMon, hp: number, expFrac: number, dx: number): void {
  const { x, y, w, h } = HUD.player;
  const left = x + dx;
  gfx.drawWindow(left, y, w, h);
  nameRow(gfx, left + 8, y + 1, w - 16, mon);
  hpRow(gfx, left + 8, y + 18, w - 16, mon.maxHp > 0 ? hp / mon.maxHp : 0, mon.status);
  gfx.drawText(`${Math.round(hp)}/${mon.maxHp}`, left + w - 8, y + 24, { align: 'right' });
  gfx.fillRect(left + 7, y + h - 9, w - 14, 4, TAG_FILL);
  gfx.drawBar(left + 8, y + h - 8, w - 16, 2, expFrac, EXP_COLOR, '#506860');
}

/** Row of 6 party indicator crystals (trainer battle intro). */
export function drawPartyBalls(gfx: Gfx, side: Side, team: readonly ShadowMon[], dx: number): void {
  const hud = HUD[side];
  const y = side === 'enemy' ? hud.y + 14 : hud.y + 24;
  const x0 = (side === 'enemy' ? hud.x + 12 : hud.x + 20) + dx;
  gfx.fillRect(x0 - 6, y + 9, 6 * 12 + 10, 2, TAG_FILL);
  for (let i = 0; i < 6; i++) {
    const m = team[i];
    const id = !m ? 'party_ball_empty' : m.hp <= 0 ? 'party_ball_fainted' : m.status ? 'party_ball_status' : 'party_ball';
    gfx.drawBitmap(icon(id), x0 + i * 12, y);
  }
}

export interface LevelUpView {
  before: Stats;
  after: Stats;
  /** 'delta' shows +gains, 'total' the new values. */
  phase: 'delta' | 'total';
}

const STAT_ORDER: readonly StatId[] = ['hp', 'atk', 'def', 'mag', 'res', 'spd'];

export function drawLevelUp(gfx: Gfx, v: LevelUpView): void {
  const x = 148;
  const y = 4;
  const w = 88;
  gfx.drawWindow(x, y, w, STAT_ORDER.length * gfx.lineHeight + 10);
  STAT_ORDER.forEach((stat, i) => {
    const rowY = y + 5 + i * gfx.lineHeight;
    gfx.drawText(STAT_LABELS[stat], x + 9, rowY);
    const value = v.phase === 'delta' ? `+${v.after[stat] - v.before[stat]}` : String(v.after[stat]);
    gfx.drawText(value, x + w - 9, rowY, { align: 'right', color: v.phase === 'delta' ? '#c04030' : COLORS.text });
  });
}
