/**
 * In-page driver for the full playthroughs (scripts/e2e/50-chapter1-full.mjs … 53-chapter4-full.mjs): real button
 * presses for walking, talking, battles, bag, party and start menu. `HELPERS` is evaluated in the page once per
 * run and installs `window.pt`; scenarios destructure it with `PT`.
 *
 * Battles follow the same "sensible player" as the balance sim (scripts/lib/sim.ts): the lead fights; a fresh foe
 * gets one status move (Brandmal only when the foe's strongest attack is physical, two tries); otherwise the best
 * expected damage. Heal items below 1/3 LP (the smallest that does the job). In a trainer battle a fainted member at
 * least 3 levels above the fighter gets a Lebensfunke. After a faint the member with the best move against the foe
 * comes in. New moves replace a plain stat move, else (damaging ones) a weaker move of the same type, else a plain
 * Normal move, else – for a new type – a weaker move whose type is covered twice. Before a trainer: heal items up to
 * 60 %; a fainted member, a status or a weak lead means walking back to rest (warped – the long walk – then really
 * talking to Mutter or the Heilstation). The later-chapter rules (Lebensfunken, coverage, bigger heal items) never
 * trigger in chapters 1–2, as in the balance sim.
 */
export const PT =
  'const { S, top, ow, pos, settle, drive, walk, goto, face, talk, grass, startMenu, closeMenus, fieldHeal, rest, topText, lead, maxHp, snap, shotWhen, record, walkHere, retry, pickUp, shop, deposit, errand } = window.pt;';

export const HELPERS = `
  const S = (window.pt_state = { log: [], wild: 0, trainer: [], potions: 0, lost: [], mode: null, tries: new WeakMap(), seen: new WeakSet(), shots: [], rests: 0 });
  const D = g.data;
  const top = () => g.game.stack[g.game.stack.length - 1];
  const ow = () => g.game.stack.find((s) => s.name === 'overworld');
  const pos = () => { const p = g.state.player; return { map: p.mapId, x: p.x, y: p.y, facing: p.facing }; };
  const free = () => g.top() === 'overworld' && !ow().busy && !ow().player.moving;
  const settle = async (max = 600) => {
    for (let k = 0; k < max && g.top() === 'overworld' && (ow().busy || ow().player.moving); k++) await g.advance(1);
    await g.advance(2);
  };
  const topText = () => { const t = top(); return t && t.box && t.box.pages ? t.box.pages.flat().join(' ') : ''; };
  const record = () => { const t = topText(); if (t && S.log[S.log.length - 1] !== t) S.log.push(t); };
  const maxHp = (c) => D.calcStats(c).hp;
  const lead = () => g.state.party[0];
  /** "species level hp/max moves" per party member (for the log). */
  const team = () => g.state.party.map((c) => c.species + ' ' + c.level + ' ' + c.hp + '/' + maxHp(c) + ' ' + c.moves.map((m) => m.id).join('/'));

  // --- screenshots (tour) -----------------------------------------------------------------------------
  const snap = async (name) => { if (!window.ptShot) return; g.game.render(); await window.ptShot(name); };
  /** Screenshot once, the first time when(top scene) holds while driving. */
  const shotWhen = (name, when) => S.shots.push({ name, when });
  const checkShots = async (t) => {
    for (const s of S.shots) if (!s.done && s.when(t)) { s.done = true; if (t?.name === 'message') await g.advance(6); await snap(s.name); }
  };

  // --- move choice (mirrors scripts/lib/sim.ts) ---------------------------------------------------------
  const stab = (c, m) => (D.getSpecies(c.species).types.includes(m.type) ? 1.5 : 1);
  const hits = (m) => (m.multiHit ? (m.multiHit[0] + m.multiHit[1]) / 2 : 1);
  const value = (c, id) => { const m = D.getMove(id); return m.power * hits(m) * stab(c, m) * ((m.accuracy || 100) / 100); };
  const score = (user, foe, slot) => {
    const m = D.getMove(slot.id);
    if (m.category === 'status' || slot.pp <= 0) return 0;
    const us = D.calcStats(user), th = D.calcStats(foe);
    const [a, d] = m.category === 'physical' ? [us.atk, th.def] : [us.mag, th.res];
    return value(user, slot.id) * (a / d) * D.typeEffectiveness(m.type, D.getSpecies(foe.species).types);
  };
  const bestScore = (c, foe) => Math.max(0, ...c.moves.map((m) => score(c, foe, m)));
  const inflicts = (id) => D.getMove(id).category === 'status' && (D.getMove(id).effects ?? []).some((e) => e.kind === 'status');
  const isPlainStat = (id) => D.getMove(id).category === 'status' && !inflicts(id);
  /** Burn only pays off when the foe's strongest attack on me is physical. */
  const worthInflicting = (id, foe, me) => {
    if (!(D.getMove(id).effects ?? []).some((e) => e.kind === 'status' && e.status === 'burn')) return true;
    const st = D.calcStats(foe);
    let best = { v: 0, physical: false };
    for (const slot of foe.moves) {
      const m = D.getMove(slot.id);
      if (m.category === 'status') continue;
      const v = value(foe, slot.id) * (m.category === 'physical' ? st.atk : st.mag) * D.typeEffectiveness(m.type, D.getSpecies(me.species).types);
      if (v > best.v) best = { v, physical: m.category === 'physical' };
    }
    return best.physical;
  };
  const pickMove = (user, foe) => {
    const status = user.moves.findIndex((m) => m.pp > 0 && inflicts(m.id) && worthInflicting(m.id, foe, user));
    const tried = S.tries.get(foe) ?? 0;
    if (status >= 0 && foe.status === null && foe.hp > maxHp(foe) / 3 && tried < 2) { S.tries.set(foe, tried + 1); return status; }
    let best = 0, top = -1;
    user.moves.forEach((m, i) => { const sc = score(user, foe, m); if (m.pp > 0 && sc > top) { best = i; top = sc; } });
    return best; // no EN left at all: the engine struggles
  };
  /**
   * Slot to forget for a new move (-1 = skip): a damaging move replaces a plain stat move, else a weaker same-type
   * move, else a plain Normal move; a status-inflicting move (Mohnduft) only replaces a plain stat move.
   */
  const forgetFor = (c, moveId) => {
    const learn = D.getMove(moveId);
    const plain = c.moves.findIndex((m) => isPlainStat(m.id));
    if (learn.category === 'status') return inflicts(moveId) ? plain : -1;
    if (plain >= 0) return plain;
    const v = value(c, moveId);
    const weakest = (pick) => {
      let at = -1;
      c.moves.forEach((m, i) => {
        if (D.getMove(m.id).category !== 'status' && pick(m.id) && value(c, m.id) <= v && (at < 0 || value(c, m.id) < value(c, c.moves[at].id))) at = i;
      });
      return at;
    };
    const upgrade = weakest((id) => D.getMove(id).type === learn.type);
    if (upgrade >= 0) return upgrade;
    const filler = weakest((id) => D.getMove(id).type === 'normal' && !D.getSpecies(c.species).types.includes('normal'));
    if (filler >= 0) return filler;
    const types = c.moves.map((m) => D.getMove(m.id).type);
    if (types.includes(learn.type)) return -1;
    return weakest((id) => types.filter((t) => t === D.getMove(id).type).length >= 2);
  };
  /** Heal item for a creature missing \`missing\` LP: the smallest that covers it, else the biggest there is. */
  const HEALS = { potion: 20, super_potion: 60, hyper_potion: 150 };
  const healItem = (missing) => {
    const have = ['potion', 'super_potion', 'hyper_potion', 'full_potion'].filter((id) => (g.state.bag[id] ?? 0) > 0);
    return have.find((id) => HEALS[id] >= missing * 0.6) ?? have[have.length - 1] ?? null;
  };

  // --- modal scenes -----------------------------------------------------------------------------------
  const gridTo = async (target) => {
    await g.tap(target & 1 ? 'right' : 'left');
    await g.tap(target >> 1 ? 'down' : 'up');
  };
  const battleStep = async (b) => {
    if (!S.seen.has(b)) {
      S.seen.add(b);
      if (b.setup.kind === 'wild') S.wild++;
      else {
        S.trainer.push(b.setup.trainer.id);
        S.log.push('[' + b.setup.trainer.id + '] ' + JSON.stringify({ team: team(), bag: g.state.bag, money: g.state.money }));
      }
    }
    const me = g.state.party[b.active.player ?? 0];
    const foe = b.setup.enemy[b.active.enemy ?? 0];
    if (b.bottom.kind === 'command' && me && foe) {
      if (S.onCommand) { const f = S.onCommand; S.onCommand = null; await f(b); }
      const item = me.hp < maxHp(me) / 3 ? healItem(maxHp(me) - me.hp) : null;
      const fallen = g.state.party.filter((c) => c.hp <= 0).reduce((a, c) => (!a || c.level > a.level ? c : a), null);
      if (item) { S.mode = 'heal'; S.healItem = item; S.healTarget = b.active.player ?? 0; }
      else if (b.setup.kind === 'trainer' && fallen && fallen.level >= me.level + 3 && (g.state.bag.revive ?? 0) > 0) {
        S.mode = 'heal'; S.healItem = 'revive'; S.healTarget = g.state.party.indexOf(fallen); S.revives = (S.revives ?? 0) + 1;
      } else if (b.setup.kind === 'wild' && S.wantCatch && (g.state.bag[S.catchCrystal ?? 'crystal'] ?? 0) > 0) S.mode = 'catch';
      else S.mode = null;
      const want = S.mode ? 1 : 0;
      await gridTo(want);
      if (b.cmdCursor !== want) throw new Error('battle cursor did not move: ' + b.cmdCursor);
      await g.tap('a');
    } else if (b.bottom.kind === 'moves' && me && foe) {
      await gridTo(pickMove(me, foe));
      await g.tap('a');
    } else await g.tap('a');
  };
  const bagStep = async (bag) => {
    const want = S.mode === 'catch' ? ['crystals', S.catchCrystal ?? 'crystal'] : S.mode === 'heal' ? ['items', S.healItem] : null;
    S.mode = null;
    if (!want) return g.tap('b');
    for (let k = 0; k < 3 && bag.pocketId !== want[0]; k++) await g.tap('right');
    const idx = bag.items(g.game).findIndex((it) => it.id === want[1]);
    if (idx < 0) return g.tap('b');
    for (let k = 0; k < 16 && bag.cursor.index !== idx; k++) await g.tap(bag.cursor.index < idx ? 'down' : 'up');
    if (want[0] === 'items') S.potions++;
    else S.thrown = (S.thrown ?? 0) + 1;
    await g.tap('a');
  };
  /** Party grid (2 columns): move the cursor to index i. */
  const partyTo = async (t, i) => {
    for (let k = 0; k < 8 && t.index !== i; k++) await g.tap(t.index % 2 !== i % 2 ? 'right' : t.index < i ? 'down' : 'up');
  };
  /** Party screen in battle: Kräutertee target = the fighter; forced switch = the best move against the foe. */
  const partyStep = async (t) => {
    if (t.mode?.kind === 'itemTarget') { await partyTo(t, S.healTarget ?? 0); return g.tap('a'); }
    if (t.mode?.kind === 'battleSwitch') {
      const b = g.game.stack.find((s) => s.name === 'battle');
      const foe = b && b.setup.enemy[b.active.enemy ?? 0];
      let best = -1;
      g.state.party.forEach((c, i) => {
        if (c.hp > 0 && i !== t.mode.activeIndex && (best < 0 || (foe && bestScore(c, foe) > bestScore(g.state.party[best], foe)))) best = i;
      });
      if (best >= 0) await partyTo(t, best);
      S.switchMenu = true;
      return g.tap('a');
    }
    return g.tap('b');
  };
  /** Ja/Nein questions: no nickname; learn a damaging move per forgetFor; Ja to everything else. */
  const questionStep = async () => {
    const text = topText();
    if (/Spitznamen/.test(text)) return g.tap('b');
    const learn = /Soll (.+) eine Attacke vergessen, um (.+) zu erlernen/.exec(text);
    if (learn) {
      const c = g.state.party.find((p) => (p.nickname ?? D.getSpecies(p.species).name) === learn[1]);
      const entry = c && D.getSpecies(c.species).learnset.find((e) => D.getMove(e.move).name === learn[2]);
      S.forgetIndex = c && entry ? forgetFor(c, entry.move) : -1;
      return g.tap(S.forgetIndex >= 0 ? 'a' : 'b');
    }
    return g.tap('a'); // starter, Heilstation, Laden, "wirklich darauf verzichten?"
  };
  const forgetStep = async (f) => {
    for (let k = 0; k < 6 && f.cursor.index !== S.forgetIndex; k++) await g.tap(f.cursor.index < S.forgetIndex ? 'down' : 'up');
    await g.tap('a');
  };
  /** Plays everything (messages, battles, menus, evolutions) until the overworld is idle again (or credits/title). */
  const drive = async (max = 12000) => {
    for (let k = 0; k < max && !free(); k++) {
      const t = top();
      const name = t?.name;
      record();
      await checkShots(t);
      if (name === 'overworld' || name === 'battle-transition') await g.advance(1);
      else if (name === 'battle') await battleStep(t);
      else if (name === 'bag') await bagStep(t);
      else if (name === 'forget-move') await forgetStep(t);
      else if (name === 'party') await partyStep(t);
      else if (name === 'menu' && S.switchMenu) { S.switchMenu = false; await g.tap('a'); } // EINWECHSELN
      else if (name === 'message' && t.menu) await questionStep();
      else if (name === 'credits' || name === 'title') return;
      else await g.tap('a');
    }
    await settle();
    if (!free()) throw new Error('stuck in ' + g.stack().join(' > ') + ': ' + topText());
  };

  // --- walking ----------------------------------------------------------------------------------------
  const DIRS = { U: 'up', D: 'down', L: 'left', R: 'right' };
  /** One tile (turning first if needed); battles and scripts on the way are played through. */
  const step = async (dir) => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const p = ow().player; const bx = p.x, by = p.y, bm = ow().map.id;
      g.down(dir);
      let moved = false;
      for (let k = 0; k < 40; k++) {
        await g.advance(1);
        const q = ow().player;
        if (q.x !== bx || q.y !== by || ow().map.id !== bm) { moved = true; break; }
      }
      g.up(dir);
      await settle();
      if (!free()) await drive();
      if (moved) return true;
      await g.advance(40); // a wandering NPC was in the way
    }
    return false;
  };
  /** A blackout (to a Heilstation – or the rescuer's tea on the same map) teleports: another map or a jump > 2 tiles. */
  const jumped = (a, b) => a.map !== b.map || Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 2;
  const walk = async (path) => {
    for (const c of path.replace(/ /g, '')) if (!(await step(DIRS[c]))) throw new Error('blocked at ' + JSON.stringify(pos()) + ' going ' + c);
  };
  /** Shortest path (U/D/L/R) to (x, y) on the current map, around walls, ledges, NPCs, ground items and doors. */
  const route = (x, y) => {
    const o = ow(), m = o.model, start = pos();
    const key = (a, b) => a + ',' + b;
    const prev = new Map([[key(start.x, start.y), null]]);
    const queue = [[start.x, start.y]];
    const steps = [['U', 0, -1], ['D', 0, 1], ['L', -1, 0], ['R', 1, 0]];
    while (queue.length && !prev.has(key(x, y))) {
      const [cx, cy] = queue.shift();
      for (const [c, dx, dy] of steps) {
        const nx = cx + dx, ny = cy + dy;
        if (prev.has(key(nx, ny)) || !m.inBounds(nx, ny) || m.isSolid(nx, ny) || m.isLedge(nx, ny) || o.npcAt(nx, ny) || o.itemAt(nx, ny)) continue;
        if (m.exitAt && m.exitAt(nx, ny) && !(nx === x && ny === y)) continue;
        prev.set(key(nx, ny), [cx, cy, c]);
        queue.push([nx, ny]);
      }
    }
    if (!prev.has(key(x, y))) throw new Error('no path to ' + x + ',' + y + ' from ' + JSON.stringify(start));
    let path = '';
    for (let at = prev.get(key(x, y)); at; at = prev.get(key(at[0], at[1]))) path = at[2] + path;
    return path;
  };
  /**
   * Walks the shortest way to (x, y) on the current map. A battle lost on the way (wild or a trainer's sight) blacks
   * out to the Heilstation: the player comes back (warped – the long walk) and walks again.
   */
  const goto = async (x, y) => {
    const start = pos();
    const target = ow().model.exitAt(x, y);
    for (let attempt = 0; attempt < 6; attempt++) {
      if (attempt > 0) { S.lost.push('walk'); g.warp(start.map, start.x, start.y, start.facing); await settle(); }
      const path = route(x, y);
      let ok = true;
      for (let i = 0; i < path.length && ok; i++) {
        const before = pos();
        await walk(path[i]);
        ok = !jumped(before, pos()) || (i === path.length - 1 && !!target);
      }
      if (ok) return;
    }
    throw new Error('cannot walk to ' + x + ',' + y + ' on ' + start.map);
  };
  const face = async (dir) => { await g.tap(dir); await g.advance(8); await settle(); };
  const talk = async () => { await g.tap('a'); await drive(); };
  /**
   * Walks back and forth (a, b = single steps) until n more wild battles happened (or \`until()\` holds); after a
   * blackout it comes back (warped), also when the last battle was lost.
   */
  const grass = async (n, a, b, until = () => false) => {
    const goal = S.wild + n;
    const spot = pos();
    const back = async () => { S.lost.push('wild'); g.warp(spot.map, spot.x, spot.y, spot.facing); await settle(); };
    for (let i = 0; i < 300 && S.wild < goal && !until(); i++) {
      if (jumped(spot, pos())) { await back(); i = 0; }
      await walk(i % 2 ? b : a);
    }
    if (jumped(spot, pos())) await back();
    if (S.wild < goal && !until()) throw new Error('not enough wild encounters');
  };

  // --- start menu -------------------------------------------------------------------------------------
  const startMenu = async (entry) => {
    await g.tap('start'); await g.advance(4);
    const m = top();
    if (m.name !== 'startmenu') throw new Error('start menu did not open: ' + g.stack());
    const idx = m.entries.indexOf(entry);
    for (let k = 0; k < 8 && m.menu.index !== idx; k++) await g.tap(m.menu.index < idx ? 'down' : 'up');
    await g.tap('a'); await g.advance(4);
  };
  const closeMenus = async () => {
    for (let k = 0; k < 10 && g.top() !== 'overworld'; k++) await g.tap('b');
    await settle();
  };
  /**
   * A long walk back to rest (warped, then really talking): Mutter before the first Heilstation, else the
   * Heilstation of state.lastHeal. Returns to where the player stood.
   */
  const rest = async () => {
    const back = pos();
    S.rests++;
    const h = g.state.lastHeal;
    if (h.mapId === 'player_house') g.warp('player_house', 6, 4, 'right'); // Mutter at (7,4)
    else g.warp(h.mapId, h.x, h.y, h.facing);
    await settle();
    // the nurse is across the counter ahead; a healer outside a Heilstation (the rescuer's tea) stands beside the tile
    const o = ow(), p = pos();
    const DELTA = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [fx, fy] = DELTA[p.facing];
    if (!o.npcAt(p.x + fx, p.y + fy) && !o.npcAt(p.x + 2 * fx, p.y + 2 * fy)) {
      const side = Object.keys(DELTA).find((d) => o.npcAt(p.x + DELTA[d][0], p.y + DELTA[d][1]));
      if (side) await face(side);
    }
    await talk();
    g.warp(back.map, back.x, back.y, back.facing); await settle();
  };
  /** Before the next trainer: heal items until the lead is above 60 %; rest if a member fainted, has a status or the lead stays low. */
  const fieldHeal = async () => {
    for (let i = 0; i < 6 && lead().hp > 0 && lead().hp < maxHp(lead()) * 0.6; i++) {
      const id = healItem(maxHp(lead()) - lead().hp);
      if (!id) break;
      const before = g.state.bag[id];
      await startMenu('bag');
      const bag = top();
      for (let k = 0; k < 3 && bag.pocketId !== 'items'; k++) await g.tap('right');
      const idx = bag.items(g.game).findIndex((it) => it.id === id);
      for (let k = 0; k < 16 && bag.cursor.index !== idx; k++) await g.tap(bag.cursor.index < idx ? 'down' : 'up');
      await g.tap('a'); await g.tap('a'); // item → BENUTZEN
      if (g.top() !== 'party') throw new Error('heal target screen missing: ' + g.stack());
      await partyTo(top(), 0);
      await g.tap('a');
      for (let k = 0; k < 20 && g.top() === 'message'; k++) await g.tap('a');
      await closeMenus();
      if ((g.state.bag[id] ?? 0) !== before - 1) throw new Error(id + ' not used: ' + JSON.stringify(g.state.bag));
      S.potions++;
    }
    if (lead().hp < maxHp(lead()) * 0.4 || g.state.party.some((c) => c.hp === 0 || c.status)) await rest();
  };

  // --- story steps ------------------------------------------------------------------------------------
  /** Walks a path on one map; false if a lost battle (blackout to the Heilstation) ended it early. */
  const walkHere = async (path) => {
    for (const c of path.replace(/ /g, '')) {
      const before = pos();
      await walk(c);
      if (jumped(before, pos())) return false;
    }
    return true;
  };
  /**
   * A story fight that may be lost: each retry first comes back to \`from\` ([map, x, y, facing]; warped – the long
   * walk) and heals up in the field. Done when \`done()\` holds; at most 8 tries (a stubborn player). \`train\`: what
   * the player does after a loss before trying again (e.g. a few wild battles: extra levels, counted in S.trained).
   */
  const retry = async (what, from, fn, done, train = null) => {
    for (let i = 0; i < 8 && !(await done()); i++) {
      if (i > 0) {
        S.lost.push(what);
        if (train) { const before = S.wild; await train(); S.trained = (S.trained ?? 0) + S.wild - before; }
        g.warp(from[0], from[1], from[2], from[3]); await settle();
      }
      await fieldHeal();
      await fn();
    }
    if (!(await done())) throw new Error(what + ' still not done: ' + JSON.stringify({ pos: pos(), team: team(), bag: g.state.bag, money: g.state.money }));
  };
  /** Picks up the ground item at (x, y): walks next to it, faces it, A. */
  const pickUp = async (x, y) => {
    const o = ow(), m = o.model;
    for (const [dx, dy, dir] of [[0, 1, 'up'], [-1, 0, 'right'], [1, 0, 'left'], [0, -1, 'down']]) {
      const sx = x + dx, sy = y + dy;
      if (!m.inBounds(sx, sy) || m.isSolid(sx, sy) || o.npcAt(sx, sy)) continue;
      try { await goto(sx, sy); } catch { continue; }
      await face(dir); await talk();
      return;
    }
    throw new Error('cannot reach the item at ' + x + ',' + y);
  };
  /** Away and back (warped – the long walk): \`fn\` runs at [map, x, y, facing], then the player returns. */
  const errand = async (at, fn) => {
    const back = pos();
    g.warp(at[0], at[1], at[2], at[3]); await settle();
    await fn();
    g.warp(back.map, back.x, back.y, back.facing); await settle();
  };
  /**
   * In a Laden (from its arrival tile): buys each [itemId, upTo] up to that count while the money lasts, then walks
   * back to the mat's tile above. Returns what was bought. \`shot\`: screenshot name of the buy list (tour).
   */
  const shop = async (wants, shot = null) => {
    await goto(1, 3); await face('up');
    await g.tap('a');
    for (let k = 0; k < 20 && !(top().name === 'message' && top().menu); k++) { if (g.top() === 'message') await g.tap('a'); else await g.advance(2); }
    await g.tap('a'); // KAUFEN
    if (g.top() !== 'shop-buy') throw new Error('no buy list: ' + g.stack());
    const list = top();
    if (shot) await snap(shot);
    const bought = {};
    for (const [id, upTo] of wants) {
      const idx = list.items.findIndex((it) => it.id === id);
      const n = Math.min(upTo - (g.state.bag[id] ?? 0), Math.floor(g.state.money / (list.items[idx]?.price ?? Infinity)));
      if (idx < 0 || n <= 0) continue;
      for (let k = 0; k < 16 && list.cursor.index !== idx; k++) await g.tap(list.cursor.index < idx ? 'down' : 'up');
      await g.tap('a');
      for (let k = 1; k < n; k++) await g.tap('up');
      await g.tap('a'); await g.tap('a'); // quantity, Ja
      for (let k = 0; k < 10 && g.top() === 'message'; k++) await g.tap('a');
      bought[id] = n;
    }
    await g.tap('b'); // leave the list
    for (let k = 0; k < 10 && g.top() !== 'overworld'; k++) {
      const t = top();
      if (t.name === 'message' && t.menu) { await g.tap('down'); await g.tap('down'); await g.tap('a'); } else await g.tap('a');
    }
    await settle();
    await goto(5, 7);
    return bought;
  };
  /** In a Heilstation: the PC (9, 2) puts party member \`index\` into the box. */
  const deposit = async (index) => {
    const before = g.state.box.length;
    await goto(9, 3); await face('up');
    await g.tap('a');
    for (let k = 0; k < 20 && !(top().name === 'message' && top().menu); k++) { if (g.top() === 'message') await g.tap('a'); else await g.advance(2); }
    await g.tap('a'); // ABLEGEN
    if (g.top() !== 'pc-list') throw new Error('no PC list: ' + g.stack());
    const list = top();
    for (let k = 0; k < 8 && list.cursor.index !== index; k++) await g.tap(list.cursor.index < index ? 'down' : 'up');
    await g.tap('a'); await g.tap('a'); // the creature → ABLEGEN
    for (let k = 0; k < 10 && g.top() === 'message' && !top().menu; k++) await g.tap('a');
    await g.tap('b'); // leave the list
    for (let k = 0; k < 10 && g.top() !== 'overworld'; k++) {
      const t = top();
      if (t.name === 'message' && t.menu) { await g.tap('down'); await g.tap('down'); await g.tap('a'); } else await g.tap('a');
    }
    await settle();
    if (g.state.box.length !== before + 1) throw new Error('deposit failed: ' + g.stack());
  };
  window.pt = { S, top, ow, pos, settle, drive, walk, goto, face, talk, grass, startMenu, closeMenus, fieldHeal, rest, topText, lead, maxHp, snap, shotWhen, record, walkHere, retry, pickUp, shop, deposit, errand };
`;
