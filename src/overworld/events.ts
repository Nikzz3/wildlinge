/** Overworld flows that run as queued tasks: talking, trainer approaches, pickups, signs, PC, wild encounters. */
import { getTrainer } from '../data';
import { addItem, setFlag, trainerFlag } from '../state';
import { openPc } from '../ui/screens';
import { JUMP_FRAMES, type Npc, WALK_FRAMES } from './actor';
import { approachSteps, OPPOSITE } from './rules';
import type { OverworldScene } from './scene';
import { itemLabel, playJingle } from './script';

/** Talk to an NPC: face the player, then trainer battle / onTalk / trainer after-text / plain text. */
export async function talkTo(ow: OverworldScene, npc: Npc): Promise<void> {
  const ctx = ow.ctx;
  if (!npc.isObject) npc.facing = OPPOSITE[ow.player.facing];
  const tr = npc.def.trainer;
  if (tr && !ctx.flag(trainerFlag(tr.id))) {
    await ctx.say(getTrainer(tr.id).intro);
    if (ctx.state.party.length > 0) await ctx.battle(tr.id);
    return;
  }
  if (npc.def.onTalk) return npc.def.onTalk(ctx);
  if (tr) return ctx.say(getTrainer(tr.id).after);
  const text = npc.def.text;
  for (const line of typeof text === 'string' ? [text] : (text ?? [])) await ctx.say(line);
}

/** A trainer spotted the player: "!" bubble, walk up to the player, intro text, battle. */
export async function trainerApproach(ow: OverworldScene, npc: Npc, distance: number): Promise<void> {
  const tr = npc.def.trainer;
  if (!tr) return;
  const ctx = ow.ctx;
  await ctx.emote(npc.id, 'exclaim');
  const steps = approachSteps(npc, distance, (x, y) => ow.model.isLedge(x, y)).map((st) => ({
    ...st,
    frames: st.tiles === 2 ? JUMP_FRAMES : WALK_FRAMES,
  }));
  const hop = steps.findIndex((st) => st.tiles === 2);
  if (hop < 0) await npc.followPath(steps);
  else {
    await npc.followPath(steps.slice(0, hop));
    ow.g.audio.playSfx('ledge');
    await npc.followPath(steps.slice(hop));
  }
  ow.player.facing = OPPOSITE[npc.facing];
  ow.syncState();
  await ctx.say(getTrainer(tr.id).intro);
  await ctx.battle(tr.id);
}

/** Ground or hidden item. */
export async function pickUp(ow: OverworldScene, item: { item: string; qty?: number; flag: string }): Promise<void> {
  const g = ow.g;
  const qty = item.qty ?? 1;
  const label = itemLabel(item.item, qty);
  setFlag(g.state, item.flag);
  addItem(g.state, item.item, qty);
  const jingle = playJingle(g, 'item');
  await g.ui.message(`{PLAYER} findet ${label}!`);
  await jingle;
}

export function readSign(ow: OverworldScene, text: string): Promise<void> {
  return ow.g.ui.message(text);
}

export async function usePc(ow: OverworldScene): Promise<void> {
  ow.g.audio.playSfx('confirm');
  await ow.g.ui.message('{PLAYER} schaltet den PC ein.');
  await openPc(ow.g);
}

export async function wildEncounter(ow: OverworldScene, species: string, level: number): Promise<void> {
  await ow.ctx.wildBattle(species, level);
}
