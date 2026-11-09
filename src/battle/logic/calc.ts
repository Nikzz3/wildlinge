/** Pure battle math: stages, damage, capture, escape, EXP. No battle state. */
import type { Rng } from '../../core/rng';
import type { StatusId } from '../../core/types';

export const MIN_STAGE = -6;
export const MAX_STAGE = 6;

/** Stat stage multiplier: (2+s)/2 above zero, 2/(2-s) below. */
export function stageMultiplier(stage: number): number {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
}

/** Accuracy stage multiplier: (3+s)/3 above zero, 3/(3-s) below. */
export function accuracyMultiplier(stage: number): number {
  return stage >= 0 ? (3 + stage) / 3 : 3 / (3 - stage);
}

export function clampStage(stage: number): number {
  return Math.max(MIN_STAGE, Math.min(MAX_STAGE, stage));
}

/** A stat with its stage applied (at least 1). */
export function staged(stat: number, stage: number): number {
  return Math.max(1, Math.floor(stat * stageMultiplier(stage)));
}

export interface DamageInput {
  level: number;
  power: number;
  /** Attacking stat (atk or mag) with stages applied. */
  attack: number;
  /** Defending stat (def or res) with stages applied. */
  defense: number;
  stab: boolean;
  /** Type multiplier 0..4. */
  effectiveness: number;
  crit: boolean;
  /** Random factor in percent, 85..100. */
  roll: number;
  /** Physical move by a burned attacker. */
  burned: boolean;
}

/** floor(floor(floor(2L/5+2)·P·A/D)/50)+2, then STAB, type, crit, random, burn; min 1 unless immune. */
export function calcDamage(i: DamageInput): number {
  if (i.effectiveness <= 0) return 0;
  const levelFactor = Math.floor((2 * i.level) / 5 + 2);
  let dmg = Math.floor(Math.floor((levelFactor * i.power * i.attack) / Math.max(1, i.defense)) / 50) + 2;
  if (i.stab) dmg = Math.floor(dmg * 1.5);
  dmg = Math.floor(dmg * i.effectiveness);
  if (i.crit) dmg = Math.floor(dmg * 1.5);
  dmg = Math.floor((dmg * i.roll) / 100);
  if (i.burned) dmg = Math.floor(dmg / 2);
  return Math.max(1, dmg);
}

/** Number of hits for a multi-hit move: 2–5 uses the classic 3:3:1:1 spread, other ranges are uniform. */
export function rollHits(range: readonly [number, number], rng: Rng): number {
  const [min, max] = range;
  if (min === 2 && max === 5) return rng.pick([2, 2, 2, 3, 3, 3, 4, 5]);
  return rng.int(min, max);
}

export interface CaptureInput {
  maxHp: number;
  hp: number;
  catchRate: number;
  /** Crystal multiplier; 255 = always catches. */
  rate: number;
  status: StatusId | null;
}

export interface CaptureResult {
  shakes: 0 | 1 | 2 | 3;
  caught: boolean;
}

/** Gen-3-like capture: a = (3·max − 2·hp)·catchRate·rate / (3·max) × status bonus, then four shake checks. */
export function rollCapture(i: CaptureInput, rng: Rng): CaptureResult {
  if (i.rate >= 255) return { shakes: 3, caught: true };
  const bonus = i.status === 'sleep' ? 2 : i.status ? 1.5 : 1;
  const a = Math.max(1, Math.floor((((3 * i.maxHp - 2 * i.hp) * i.catchRate * i.rate) / (3 * i.maxHp)) * bonus));
  if (a >= 255) return { shakes: 3, caught: true };
  const b = Math.floor(1048560 / Math.floor(Math.sqrt(Math.floor(Math.sqrt(Math.floor(16711680 / a))))));
  for (let check = 0; check < 4; check++) {
    if (rng.int(0, 65535) >= b) return { shakes: Math.min(3, check) as CaptureResult['shakes'], caught: false };
  }
  return { shakes: 3, caught: true };
}

/** Wild escape: always if at least as fast, else (pSpd·128/eSpd + 30·attempts) / 256. */
export function rollEscape(playerSpd: number, enemySpd: number, attempts: number, rng: Rng): boolean {
  if (playerSpd >= enemySpd) return true;
  const odds = Math.floor((playerSpd * 128) / Math.max(1, enemySpd)) + 30 * attempts;
  return odds > 255 || rng.int(0, 255) < odds;
}

/**
 * EXP divisor of the yield formula (Gen 3 uses 7). Lower because the game is short:
 * a player who fights most route trainers should reach Halle 1 around Lv 12.
 */
export const EXP_DIVISOR = 3.5;

/**
 * A foe counts as at most this level for EXP – the highest level a player beats before Hüter Jost, so chapter 1 is
 * untouched. Later the EXP per foe stops growing with its level (evolved foes still give more through their baseExp)
 * while every level needs more EXP (cubic): the curve flattens instead of running away in the long later chapters,
 * and the player arrives at each Halle a few levels above its ace (docs/DESIGN.md, level curve).
 */
export const EXP_LEVEL_CAP = 9;

/** EXP each participant gets for defeating an enemy. */
export function expYield(baseExp: number, enemyLevel: number, trainer: boolean): number {
  return Math.floor(((baseExp * Math.min(enemyLevel, EXP_LEVEL_CAP)) / EXP_DIVISOR) * (trainer ? 1.5 : 1));
}
