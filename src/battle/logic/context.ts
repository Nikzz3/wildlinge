/** Shared battle state + small helpers (events, names, send-out). Pure, no DOM. */
import type { BattleEvent, BattlePrompt, BattleSetup, PlayerAction, Side } from '../../core/contracts';
import type { Rng } from '../../core/rng';
import type { BattleStat, Creature, SaveData, Stats } from '../../core/types';
import { calcStats, displayName } from '../../creature';

export type Stages = Record<BattleStat, number>;

/** Per-side battle-only state of the active creature (reset on send-out). */
export interface Fighter {
  /** Index into state.party (player) or setup.enemy (enemy). */
  index: number;
  stages: Stages;
  flinch: boolean;
  /** Already had its chance to move this turn (flinching only affects creatures moving later). */
  moved: boolean;
  /** Its faint was already announced. */
  down: boolean;
  /** Full turns spent on the field (the smart AI likes setup moves early). */
  turns: number;
}

export interface Ctx {
  readonly state: SaveData;
  readonly setup: BattleSetup;
  readonly rng: Rng;
  /** Events produced since the last drain (display order). */
  readonly events: BattleEvent[];
  readonly fighters: Record<Side, Fighter>;
  /** Enemy index → party indices that were active against it (EXP receivers). */
  readonly participants: Map<number, Set<number>>;
  readonly leveledUp: Set<number>;
  /** Indices into setup.trainer.items the trainer already used. */
  readonly usedItems: Set<number>;
  runAttempts: number;
}

/** What the player answers to a prompt; the generator receives it from `yield`. */
export type Answer =
  | { kind: 'action'; action: PlayerAction }
  | { kind: 'switch'; partyIndex: number }
  | { kind: 'learn'; forget: number | null };

/** Turn-runner coroutine: yields prompts, receives answers. */
export type Flow<T = void> = Generator<BattlePrompt, T, Answer>;

export function freshStages(): Stages {
  return { atk: 0, def: 0, mag: 0, res: 0, spd: 0, acc: 0 };
}

function freshFighter(index: number): Fighter {
  return { index, stages: freshStages(), flinch: false, moved: false, down: false, turns: 0 };
}

export function createCtx(state: SaveData, setup: BattleSetup, rng: Rng): Ctx {
  // Indices before start(): the creatures that will be sent out first.
  const firstEnemy = Math.max(0, setup.enemy.findIndex((c) => c.hp > 0));
  const firstPlayer = Math.max(0, state.party.findIndex((c) => c.hp > 0));
  return {
    state, setup, rng,
    events: [],
    fighters: { player: freshFighter(firstPlayer), enemy: freshFighter(firstEnemy) },
    participants: new Map(),
    leveledUp: new Set(),
    usedItems: new Set(),
    runAttempts: 0,
  };
}

export const other = (side: Side): Side => (side === 'player' ? 'enemy' : 'player');

export function team(ctx: Ctx, side: Side): Creature[] {
  return side === 'player' ? ctx.state.party : ctx.setup.enemy;
}

export function creature(ctx: Ctx, side: Side): Creature {
  const c = team(ctx, side)[ctx.fighters[side].index];
  if (!c) throw new Error(`battle: no ${side} creature at ${ctx.fighters[side].index}`);
  return c;
}

/** Deep copy for dry runs (e.g. checking whether an item would have an effect). */
export function copyCreature(c: Creature): Creature {
  return { ...c, ivs: { ...c.ivs }, moves: c.moves.map((m) => ({ ...m })) };
}

export function stats(ctx: Ctx, side: Side): Stats {
  return calcStats(creature(ctx, side));
}

export function emit(ctx: Ctx, ev: BattleEvent): void {
  ctx.events.push(ev);
}

export function say(ctx: Ctx, text: string): void {
  ctx.events.push({ t: 'msg', text });
}

/** Sentence-initial name: "Wildes Flämmli" / "Gegnerisches Flämmli" / "Flämmli". */
export function who(ctx: Ctx, side: Side): string {
  const name = displayName(creature(ctx, side));
  if (side === 'player') return name;
  return `${ctx.setup.kind === 'wild' ? 'Wildes' : 'Gegnerisches'} ${name}`;
}

/** Mid-sentence nominative/accusative: "… auf wildes Flämmli". */
export function whoAcc(ctx: Ctx, side: Side): string {
  const name = displayName(creature(ctx, side));
  if (side === 'player') return name;
  return `${ctx.setup.kind === 'wild' ? 'wildes' : 'gegnerisches'} ${name}`;
}

/** Dative form for "… von wildem Flämmli". */
export function whoDat(ctx: Ctx, side: Side): string {
  const name = displayName(creature(ctx, side));
  if (side === 'player') return name;
  return `${ctx.setup.kind === 'wild' ? 'wildem' : 'gegnerischem'} ${name}`;
}

/** "Wanderer Hans" (falls back to a generic label if the setup lacks a TrainerDef). */
export function trainerLabel(ctx: Ctx): string {
  const t = ctx.setup.trainer;
  return t ? `${t.className} ${t.name}` : 'Der Gegner';
}

export function isTrainer(ctx: Ctx): boolean {
  return ctx.setup.kind === 'trainer';
}

/** Puts a creature on the field: resets its battle state, records EXP participants, emits sendOut. */
export function sendOut(ctx: Ctx, side: Side, index: number, text: string): void {
  ctx.fighters[side] = freshFighter(index);
  if (side === 'enemy') ctx.participants.set(index, new Set());
  noteParticipant(ctx);
  say(ctx, text);
  emit(ctx, { t: 'sendOut', side, partyIndex: index });
}

/** The current player creature has faced the current enemy (both must be standing). */
function noteParticipant(ctx: Ctx): void {
  const p = ctx.state.party[ctx.fighters.player.index];
  const e = ctx.setup.enemy[ctx.fighters.enemy.index];
  if (!p || !e || p.hp <= 0 || e.hp <= 0) return;
  const set = ctx.participants.get(ctx.fighters.enemy.index) ?? new Set<number>();
  set.add(ctx.fighters.player.index);
  ctx.participants.set(ctx.fighters.enemy.index, set);
}

/** Changes HP (clamped) and emits an 'hp' event. Returns the HP actually lost (negative = healed). */
export function changeHp(
  ctx: Ctx, side: Side, delta: number, extra: { effectiveness?: number; crit?: boolean } = {},
): number {
  const c = creature(ctx, side);
  const max = stats(ctx, side).hp;
  const from = c.hp;
  c.hp = Math.max(0, Math.min(max, c.hp + delta));
  emit(ctx, { t: 'hp', side, from, to: c.hp, max, ...extra });
  return from - c.hp;
}
