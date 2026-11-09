/** Pure helpers over SaveData. No DOM, no game context. */
import type { Creature, Position, SaveData } from '../core/types';
import { healCreature, isFainted } from '../creature';
import { getItem } from '../data';

export const PARTY_MAX = 6;

/** Fresh state for a new game. The intro sets names; world code sets the start position. */
export function newGameState(start: Position): SaveData {
  return {
    version: 1,
    playerName: 'Kai',
    rivalName: 'Lio',
    starter: '',
    player: { ...start },
    lastHeal: { ...start },
    money: 3000,
    playFrames: 0,
    party: [],
    box: [],
    bag: {},
    dexSeen: [],
    dexCaught: [],
    badges: [],
    flags: {},
    vars: {},
    repelSteps: 0,
    nextUid: 1,
    options: { textSpeed: 'normal', musicVolume: 0.7, sfxVolume: 0.8, battleAnims: true },
  };
}

/** Replaces {PLAYER} and {RIVAL}. */
export function fmt(s: SaveData, text: string): string {
  return text.replaceAll('{PLAYER}', s.playerName).replaceAll('{RIVAL}', s.rivalName);
}

// --- bag -------------------------------------------------------------------

export function itemCount(s: SaveData, itemId: string): number {
  return s.bag[itemId] ?? 0;
}

export function addItem(s: SaveData, itemId: string, qty = 1): void {
  getItem(itemId); // validate id
  s.bag[itemId] = Math.min(999, itemCount(s, itemId) + qty);
}

export function removeItem(s: SaveData, itemId: string, qty = 1): boolean {
  const have = itemCount(s, itemId);
  if (have < qty) return false;
  if (have === qty) delete s.bag[itemId];
  else s.bag[itemId] = have - qty;
  return true;
}

// --- creatures ------------------------------------------------------------

/** Takes a uid from the state counter (use for creatures the player will own). */
export function nextUid(s: SaveData): number {
  return s.nextUid++;
}

/** Adds to the party, or to the box if the party is full. */
export function addCreature(s: SaveData, c: Creature): 'party' | 'box' {
  markCaught(s, c.species);
  if (s.party.length < PARTY_MAX) {
    s.party.push(c);
    return 'party';
  }
  s.box.push(c);
  return 'box';
}

export function healParty(s: SaveData): void {
  s.party.forEach(healCreature);
}

/** Index of the first non-fainted party member, or -1. */
export function firstHealthy(s: SaveData): number {
  return s.party.findIndex((c) => !isFainted(c));
}

export function allFainted(s: SaveData): boolean {
  return firstHealthy(s) < 0;
}

// --- Lexikon ----------------------------------------------------------------

export function markSeen(s: SaveData, speciesId: string): void {
  if (!s.dexSeen.includes(speciesId)) s.dexSeen.push(speciesId);
}

export function markCaught(s: SaveData, speciesId: string): void {
  markSeen(s, speciesId);
  if (!s.dexCaught.includes(speciesId)) s.dexCaught.push(speciesId);
}

// --- flags, badges, money -------------------------------------------------

export function getFlag(s: SaveData, name: string): boolean {
  return s.flags[name] === true;
}

export function setFlag(s: SaveData, name: string, value = true): void {
  if (value) s.flags[name] = true;
  else delete s.flags[name];
}

export function trainerFlag(trainerId: string): string {
  return `trainer:${trainerId}`;
}

export function hasBadge(s: SaveData, badgeId: string): boolean {
  return s.badges.includes(badgeId);
}

export function giveBadge(s: SaveData, badgeId: string): void {
  if (!hasBadge(s, badgeId)) s.badges.push(badgeId);
}

export function addMoney(s: SaveData, amount: number): void {
  s.money = Math.max(0, Math.min(999999, s.money + amount));
}

export function spendMoney(s: SaveData, amount: number): boolean {
  if (s.money < amount) return false;
  s.money -= amount;
  return true;
}

/** "1:23" from frames. */
export function playTime(s: SaveData): string {
  const minutes = Math.floor(s.playFrames / 3600);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}
