/** ScriptContext implementation for world scripts, plus battles and the blackout. */
import { startBattle } from '../battle';
import type { GameContext, ScriptContext } from '../core/contracts';
import type { BattleOutcome, JingleId } from '../core/types';
import { createCreature, displayName } from '../creature';
import { getItem, getSpecies, getTrainer } from '../data';
import { createTitleScene, runCredits } from '../scenes';
import {
  addCreature, addItem, addMoney, getFlag, giveBadge, healParty, itemCount, nextUid, removeItem, setFlag, spendMoney,
  trainerFlag,
} from '../state';
import { openNameEntry, openPc, openShop } from '../ui/screens';
import { MAPS, START } from '../world';
import { EMOTE_FRAMES } from './actor';
import { dirTowards, parsePath } from './rules';
import type { OverworldScene } from './scene';

/** Thrown to end the running script (blackout, credits). Swallowed by the script runner. */
export class ScriptAbort extends Error {
  constructor() {
    super('script aborted');
  }
}

/** Plays a jingle; in test mode the returned promise does not wait for it (jingles run in real time). */
export function playJingle(g: GameContext, id: JingleId): Promise<void> {
  const done = g.audio.playJingle(id);
  return g.testMode ? Promise.resolve() : done;
}

/** "3× Kräutertee" (key items without quantity). */
export function itemLabel(itemId: string, qty: number): string {
  const item = getItem(itemId);
  return item.pocket === 'key' ? item.name : `${qty}× ${item.name}`;
}

/** Lost battle without allowLoss: black screen, message, lose half the money, back to lastHeal, heal. Throws ScriptAbort. */
export async function blackout(ow: OverworldScene): Promise<never> {
  const g = ow.g;
  const s = g.state;
  const lost = Math.floor(s.money / 2);
  await g.fadeOut(24);
  ow.curtain = true;
  await g.fadeIn(1);
  const money = lost > 0 ? `\f{PLAYER} verliert in der Aufregung ${lost} Fr. …` : '';
  await g.ui.message(`{PLAYER} hat keine kampffähigen Wildlinge mehr!${money}\f… {PLAYER} ist in Ohnmacht gefallen …`);
  spendMoney(s, lost);
  const home = MAPS[s.lastHeal.mapId] ? s.lastHeal : START;
  healParty(s);
  await g.fadeOut(1);
  ow.curtain = false;
  ow.loadMap(home.mapId, home.x, home.y, home.facing);
  await g.fadeIn(24);
  ow.entered();
  throw new ScriptAbort();
}

/** startBattle resolves while the screen is still faded out: black out on a loss, else fade back in. */
async function afterBattle(ow: OverworldScene, outcome: BattleOutcome, allowLoss: boolean): Promise<void> {
  if (outcome === 'lose') {
    if (!allowLoss) await blackout(ow);
    healParty(ow.g.state);
  }
  await ow.g.fadeIn(16);
}

export function createScriptContext(ow: OverworldScene): ScriptContext {
  const g = ow.g;
  const npc = (id: string) => {
    const n = ow.findNpc(id);
    if (!n) throw new Error(`${ow.map.id}: no visible NPC "${id}"`);
    return n;
  };

  const ctx: ScriptContext = {
    g,
    get state() {
      return g.state;
    },
    get mapId() {
      return ow.map.id;
    },
    say: (text) => g.ui.message(text),
    ask: (text, options) => g.ui.ask(text, options),
    confirm: (text) => g.ui.confirm(text),
    flag: (name) => getFlag(g.state, name),
    setFlag: (name, value = true) => setFlag(g.state, name, value),

    async giveItem(itemId, qty = 1) {
      const label = itemLabel(itemId, qty); // throws on an unknown id before the bag is touched
      addItem(g.state, itemId, qty);
      const jingle = playJingle(g, 'item');
      await g.ui.message(`{PLAYER} erhält ${label}!`);
      await jingle;
    },
    takeItem: (itemId, qty = 1) => removeItem(g.state, itemId, qty),
    hasItem: (itemId, qty = 1) => itemCount(g.state, itemId) >= qty,

    async giveCreature(speciesId, level, opts = {}) {
      const s = g.state;
      const c = createCreature(speciesId, level, g.rng, { uid: nextUid(s), metAt: ow.map.name, moves: opts.moves });
      const where = addCreature(s, c);
      const name = getSpecies(speciesId).name;
      const jingle = playJingle(g, 'fanfare');
      await g.ui.message(`{PLAYER} erhält ${name}!`);
      await jingle;
      if (opts.nickname && (await g.ui.confirm(`Möchtest du ${name} einen Spitznamen geben?`))) {
        const nick = await openNameEntry(g, { title: `Spitzname für ${name}`, initial: name, maxLen: 10 });
        c.nickname = nick && nick !== name ? nick : null;
      }
      if (where === 'box') await g.ui.message(`${displayName(c)} wurde in die Box geschickt.`);
    },
    giveMoney: (amount) => addMoney(g.state, amount),
    takeMoney: (amount) => spendMoney(g.state, amount),

    async giveBadge(badgeId, label) {
      giveBadge(g.state, badgeId);
      const jingle = playJingle(g, 'badge');
      await g.ui.message(`{PLAYER} erhält das ${label.replace(/^das /i, '')}!`);
      await jingle;
    },

    async heal() {
      await g.fadeOut(16);
      healParty(g.state);
      const p = ow.player;
      g.state.lastHeal = { mapId: ow.map.id, x: p.x, y: p.y, facing: 'up' };
      await playJingle(g, 'heal');
      await g.fadeIn(16);
    },

    async battle(trainerId, opts = {}) {
      const trainer = getTrainer(trainerId);
      const enemy = trainer.party.map((m) => createCreature(m.species, m.level, g.rng, { moves: m.moves }));
      const outcome = await startBattle(g, {
        kind: 'trainer', enemy, trainer, allowLoss: opts.allowLoss, background: ow.map.battleBg,
      });
      if (outcome === 'win') setFlag(g.state, trainerFlag(trainerId));
      await afterBattle(ow, outcome, opts.allowLoss === true);
      return outcome === 'win';
    },

    async wildBattle(speciesId, level, opts = {}): Promise<BattleOutcome> {
      const enemy = [createCreature(speciesId, level, g.rng, { metAt: ow.map.name })];
      const outcome = await startBattle(g, {
        kind: 'wild', enemy, canRun: opts.canRun, music: opts.music, background: ow.map.battleBg,
      });
      await afterBattle(ow, outcome, false);
      return outcome;
    },

    warp: (mapId, x, y, facing) => ow.transition(mapId, x, y, facing ?? ow.player.facing),

    moveNpc: (npcId, path) => npc(npcId).walkPath(parsePath(path)),
    async movePlayer(path) {
      await ow.player.walkPath(parsePath(path));
      ow.syncState();
    },
    faceNpc(npcId, dir) {
      npc(npcId).facing = dir;
    },
    npcFacePlayer(npcId) {
      const n = npc(npcId);
      const p = ow.player;
      const dx = p.x - n.x;
      const dy = p.y - n.y;
      n.facing =
        dirTowards(n.x, n.y, p.x, p.y) ??
        (Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down');
    },
    facePlayer(dir) {
      ow.player.facing = dir;
      ow.syncState();
    },
    refreshNpcs: () => ow.refreshNpcs(),

    async emote(target, kind) {
      const actor = target === 'player' ? ow.player : npc(target);
      actor.emote = { kind, frames: EMOTE_FRAMES };
      if (kind === 'exclaim') g.audio.playSfx('exclaim');
      await g.wait(EMOTE_FRAMES);
    },
    wait: (frames) => g.wait(frames),
    playMusic: (id) => ow.setMusicOverride(id),
    playSfx: (id) => g.audio.playSfx(id),
    jingle: (id) => playJingle(g, id),
    shop: (itemIds) => openShop(g, itemIds),
    pc: () => openPc(g),

    async credits() {
      await runCredits(g);
      g.reset(createTitleScene(g));
      throw new ScriptAbort();
    },

    get player() {
      const p = ow.player;
      return { x: p.x, y: p.y, facing: p.facing };
    },
    npcPos(npcId) {
      const n = ow.findNpc(npcId);
      return n ? { x: n.x, y: n.y, facing: n.facing } : null;
    },
  };
  return ctx;
}
