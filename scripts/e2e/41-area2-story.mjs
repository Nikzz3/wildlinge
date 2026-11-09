/**
 * Chapter 2 critical path from a chapter-1-complete save (Felsabzeichen, chapter-1 ending already seen, standing
 * in Kieselstadt – exactly what a save from the chapter-1 release looks like): east gate → Pfad 2 (4 trainers) →
 * Flüsterwald (rival 2, ranger, forest trainers, Grete's blockade) → Seewil (Heilstation, Matti's gift, legend,
 * Laden, north gate) → Halle 2 (3 trainers, Undine) → closing beat (no credits) → the north gate opens → Pfad 3.
 * Real walking and talking; warps only for the optional walk back to the ranger. Battles are mashed with a
 * best-damage move pick. Pfad 2 is played at natural levels (a heal between trainers stands in for potions).
 * Level top-ups (the story run, not the balance): Lv 17 before the Flüsterwald, Lv 21
 * before Halle 2, Lv 24 before Undine (at Lv 21 the mashed plant team lost to Tüpfli and Seefürst's Alpenrast).
 * Env A2_STARTER = sproessli (default) | zuendli | biberli picks the starter (rival variant, Matti's gift).
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const STARTER = process.env.A2_STARTER ?? 'sproessli';
const RIVAL = { sproessli: 'zuendli', zuendli: 'biberli', biberli: 'sproessli' }[STARTER];
const LEFTOVER = { sproessli: 'biberli', zuendli: 'sproessli', biberli: 'zuendli' }[STARTER];

export const name = 'area 2: Kieselstadt east gate → Pfad 2 → Flüsterwald (rival 2, Grete) → Seewil → Halle 2 → closing beat → north to Pfad 3';

const HELPERS = `
  const S = (window.a2 = { log: [] });
  const D = g.data;
  const top = () => g.game.stack[g.game.stack.length - 1];
  const ow = () => g.game.stack.find((s) => s.name === 'overworld');
  const pos = () => { const s = g.state.player; return { map: s.mapId, x: s.x, y: s.y, facing: s.facing }; };
  const free = () => g.top() === 'overworld' && !ow().busy && !ow().player.moving;
  const settle = async (max = 600) => {
    for (let k = 0; k < max && g.top() === 'overworld' && (ow().busy || ow().player.moving); k++) await g.advance(1);
    await g.advance(2);
  };
  const topText = () => { const t = top(); return t && t.box && t.box.pages ? t.box.pages.flat().join(' ') : ''; };
  const record = () => { const t = topText(); if (t && S.log[S.log.length - 1] !== t) S.log.push(t); };
  /** Best expected damage against the active foe. */
  const score = (user, foe, slot) => {
    const m = D.getMove(slot.id);
    if (m.category === 'status' || slot.pp <= 0) return 0;
    const us = D.calcStats(user), th = D.calcStats(foe);
    const [a, d] = m.category === 'physical' ? [us.atk, th.def] : [us.mag, th.res];
    const stab = D.getSpecies(user.species).types.includes(m.type) ? 1.5 : 1;
    return m.power * (a / d) * stab * D.typeEffectiveness(m.type, D.getSpecies(foe.species).types) * ((m.accuracy || 100) / 100);
  };
  const pickMove = (b) => {
    const me = g.state.party[b.active.player ?? 0];
    const foe = b.setup.enemy[b.active.enemy ?? 0];
    let best = 0, bestScore = -1;
    me.moves.forEach((m, i) => { const sc = score(me, foe, m); if (sc > bestScore) { best = i; bestScore = sc; } });
    return best;
  };
  /** "Soll X eine Attacke vergessen, um Y zu erlernen?": a new damaging move replaces a plain stat move (S.forgetIndex). */
  const learnPrompt = () => {
    const m = /Soll (.+) eine Attacke vergessen, um (.+) zu erlernen/.exec(topText());
    const c = m && g.state.party.find((p) => (p.nickname ?? D.getSpecies(p.species).name) === m[1]);
    const entry = c && D.getSpecies(c.species).learnset.find((e) => D.getMove(e.move).name === m[2]);
    if (!c || !entry || D.getMove(entry.move).category === 'status') return false;
    S.forgetIndex = c.moves.findIndex((mv) => D.getMove(mv.id).category === 'status' && !(D.getMove(mv.id).effects ?? []).some((e) => e.kind === 'status'));
    return S.forgetIndex >= 0;
  };
  /** Plays messages, battles, prompts and evolutions until the overworld is idle (or credits/title show up). */
  const mash = async (max = 6000) => {
    for (let k = 0; k < max && !free(); k++) {
      const t = top();
      const name = t?.name;
      record();
      if (name === 'overworld' || name === 'battle-transition') { await g.advance(1); continue; }
      if (name === 'credits' || name === 'title') return;
      if (name === 'battle' && t.bottom.kind === 'moves') t.moveCursor = pickMove(t);
      if (name === 'message' && t.choices && /Spitznamen/.test(topText())) await g.tap('b');
      else if (name === 'message' && t.choices && /eine Attacke vergessen/.test(topText())) await g.tap(learnPrompt() ? 'a' : 'b');
      else if (name === 'forget-move') {
        for (let i = 0; i < 6 && t.cursor.index !== S.forgetIndex; i++) await g.tap(t.cursor.index < S.forgetIndex ? 'down' : 'up');
        await g.tap('a');
      } else await g.tap('a');
    }
    await settle();
    if (!free()) throw new Error('stuck in ' + g.stack().join(' > ') + ': ' + topText());
  };
  const DIRS = { U: 'up', D: 'down', L: 'left', R: 'right' };
  /** One tile (turning first if needed); trainers/scripts that start on the way are played through. */
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
      if (!free()) await mash();
      if (moved) return true;
      await g.advance(40); // a wandering NPC was in the way
    }
    return false;
  };
  const walk = async (path) => {
    for (const c of path.replace(/ /g, '')) if (!(await step(DIRS[c]))) throw new Error('blocked at ' + JSON.stringify(pos()) + ' going ' + c);
  };
  /** Shortest walk to (x, y) on the current map, around solids, ledges, NPCs, ground items and doors. */
  const goto = async (x, y) => {
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
        if (m.exitAt(nx, ny) && !(nx === x && ny === y)) continue;
        prev.set(key(nx, ny), [cx, cy, c]);
        queue.push([nx, ny]);
      }
    }
    if (!prev.has(key(x, y))) throw new Error('no path to ' + x + ',' + y + ' from ' + JSON.stringify(start));
    let path = '';
    for (let at = prev.get(key(x, y)); at; at = prev.get(key(at[0], at[1]))) path = at[2] + path;
    await walk(path);
  };
  const face = async (dir) => { await g.tap(dir); await g.advance(8); await settle(); };
  const talk = async () => { await g.tap('a'); await mash(); };
  /**
   * Test stand-in for grinding: raise the party to at least \`level\` (exp = level³, medium growth) with the moves a
   * levelling player would know by then (the last four of the learnset), then heal.
   */
  const topUp = async (level = 0) => {
    const lastHeal = { ...g.state.lastHeal };
    for (const c of g.state.party) {
      if (c.level >= level) continue;
      c.level = level; c.exp = Math.max(c.exp, level ** 3);
      const ids = [...new Set(D.getSpecies(c.species).learnset.filter((e) => e.level <= level).map((e) => e.move))].slice(-4);
      c.moves = ids.map((id) => ({ id, pp: D.getMove(id).pp }));
    }
    ow().enqueue(() => ow().ctx.heal());
    await settle();
    g.state.lastHeal = lastHeal;
  };
  window.a2h = { S, top, ow, pos, settle, mash, walk, goto, face, talk, topUp, topText, record };
`;

const expect = (cond, what, data) => {
  if (!cond) throw new Error(`${what}${data === undefined ? '' : `: ${JSON.stringify(data)}`}`);
};
const expectPos = (actual, want, what) => {
  for (const [k, v] of Object.entries(want)) expect(actual[k] === v, `${what}: expected ${JSON.stringify(want)}`, actual);
};

export async function run(h) {
  try {
    await play(h);
  } finally {
    // the message log of the run (also on failure)
    const log = await h.run('return window.a2 ? window.a2.log : []').catch(() => []);
    mkdirSync('out/e2e', { recursive: true });
    writeFileSync('out/e2e/41-area2.log', log.join('\n'));
  }
}

async function play(h) {
  await h.run(HELPERS);
  const run = (code) => h.run(`const { S, top, ow, pos, settle, mash, walk, goto, face, talk, topUp, topText, record } = window.a2h; ${code}`);
  const said = (re) => h.run(`return window.a2.log.some((t) => ${re}.test(t))`);
  const flags = () => run(`return g.state.flags`);
  const party = () => run(`return g.state.party.map((c) => [c.species, c.level])`);

  // --- chapter-1-complete state in Kieselstadt (old save: the chapter-1 ending was already seen) --------------
  await run(`
    g.newGame({ starter: '${STARTER}', level: 15, name: 'Kai' }); // the repel skips Pfad 2's wild battles: one level for them
    g.give('munggli', 9);
    const s = g.state;
    s.rivalName = 'Lio';
    for (const f of ['got_starter', 'rival1_done', 'lab_greeted', 'gift_mom_potions', 'gift_kiesel_crystals', 'chapter1_cleared',
      'trainer:rival1_${RIVAL}', 'trainer:pfad1_beni', 'trainer:pfad1_lea', 'trainer:pfad1_sepp', 'trainer:hall1_urs',
      'trainer:hall1_vreni', 'trainer:leader_jost']) g.flag(f);
    s.badges.push('badge_earth');
    g.item('potion', 3); g.item('super_potion', 2); g.item('crystal', 8);
    s.money = 3000;
    s.repelSteps = 600; // keeps random wild battles out of the scripted walk (trainers still spot the player)
    s.lastHeal = { mapId: 'kiesel_center', x: 5, y: 3, facing: 'up' };
    g.warp('kieselstadt', 11, 6, 'down');
    await g.advance(30); await settle();
  `);
  const start = await run(`return { pos: pos(), rival: !!ow().findNpc('rival'), arven: !!ow().findNpc('arven'), stack: g.stack() }`);
  expect(!start.rival && !start.arven && start.stack.join() === 'overworld', 'the chapter-1 closing beat does not replay', start);

  // --- Kieselstadt: the east guard lets badge holders through ---------------------------------------------
  await run(`await walk('DDDD RRRRRRRRRR'); await face('up'); await talk();`);
  expect(await said('/Gute Reise! Pfad 2 führt zum Flüsterwald/'), 'east guard after the badge');
  await run(`await walk('RR'); await walk('R');`);
  expectPos(await run('return pos()'), { map: 'pfad_2', x: 0, y: 8 }, 'east connection to Pfad 2');
  await h.shot('out/e2e/41-area2-pfad2.png');

  // --- Pfad 2: all four trainers spot the player on the path ------------------------------------------------
  // natural levels; a heal between the trainers stands in for the player's potions
  await run(`await walk('DD RRRRRRRR'); await topUp(); await walk('RRRRRRRRR'); await topUp(); await walk('RRRRRR'); await topUp();`);
  await run(`await walk('${'R'.repeat(16)}');`);
  let f = await flags();
  for (const t of ['pfad2_nico', 'pfad2_kurt', 'pfad2_rosa', 'pfad2_ida']) expect(f[`trainer:${t}`], `${t} beaten on the way`, await party());
  const afterPfad2 = await party();
  await run(`await walk('R');`);
  expectPos(await run('return pos()'), { map: 'fluesterwald', x: 0, y: 22 }, 'east connection to the Flüsterwald');

  // --- Flüsterwald: rival 2 at the entrance -------------------------------------------------------------------
  await run(`await topUp(17);`);
  await run(`await walk('R'); await walk('R');`); // the entrance strip at x = 2 starts the scene
  f = await flags();
  expect(f.rival2_done && f[`trainer:rival2_${RIVAL}`], `rival 2 (${RIVAL} variant) beaten`, f);
  expect(await said('/Hey, Kai! Warte mal/') && (await said('/Wer zuerst in Seewil ist/')), 'rival 2 scene');
  expect(!(await run(`return !!ow().findNpc('rival')`)), 'rival left');
  await run(`await walk('UU RRR'); await face('up'); await talk();`); // ranger before the forest is cleared
  expect(await said('/eisblauen Kutten/'), 'ranger warns');

  // forest trainers on the path: Jana, Knut (first Frostmantel), Otto
  await run(`await topUp(); await walk('D RRRRRR UUUUUUUU');`);
  expect((await flags())['trainer:wald_jana'], 'Jana spots the player', await party());
  await run(`await topUp(); await walk('RRRRRRRRR');`);
  expect((await flags())['trainer:grunt_wald_1'], 'Knut (first Frostmantel) battles the player', await party());
  await run(`await topUp(); await walk('UUUUU');`);
  expect((await flags())['trainer:wald_otto'], 'Otto spots the player', await party());

  // Grete's blockade at the gap in front of the frosted clearing
  await run(`await topUp(); await walk('U LLLLL');`);
  await h.shot('out/e2e/41-area2-frost.png');
  await run(`await walk('U'); await walk('U');`); // (15,5) is the trigger tile
  f = await flags();
  expect(f.forest_cleared && f['trainer:grunt_wald_2'], 'Grete beaten, forest cleared', f);
  expect(await said('/Alpenglut löschen/'), 'Grete reveals the plan');
  expect(!(await run(`return !!ow().findNpc('grunt_grete')`)), 'Grete gone');

  // optional: back to the ranger (long walk → warp), then through the gap
  await run(`g.warp('fluesterwald', 5, 20, 'up'); await g.advance(20); await settle(); await talk();`);
  const ranger = await run(`return { flag: g.state.flags.gift_ranger_potions, sp: g.state.bag.super_potion }`);
  expect(ranger.flag && ranger.sp === 4, 'ranger gives 2 super potions', ranger);
  await run(`g.warp('fluesterwald', 15, 5, 'up'); await g.advance(20); await settle(); await walk('UUUUU'); await walk('U');`);
  expectPos(await run('return pos()'), { map: 'seewil', x: 13, y: 21 }, 'north connection to Seewil');
  await h.shot('out/e2e/41-area2-seewil.png');

  // --- Seewil: Heilstation, Matti, legend, Laden, north gate ----------------------------------------------------
  await run(`await goto(3, 5); await walk('U');`);
  expectPos(await run('return pos()'), { map: 'seewil_center', x: 5, y: 7 }, 'Heilstation');
  await run(`await walk('UUUU'); await talk(); await walk('DDDDD');`);
  expect(await run(`return g.state.lastHeal.mapId === 'seewil_center'`), 'nurse sets lastHeal in Seewil');

  await run(`await goto(3, 12); await walk('U');`);
  expectPos(await run('return pos()'), { map: 'seewil_house_1', x: 4, y: 6 }, "Matti's house");
  await run(`await walk('UU RR'); await face('right'); await talk();`);
  const matti = await run(`return { flag: g.state.flags.gift_starter, party: g.state.party.map((c) => [c.species, c.level, c.metAt]) }`);
  expect(matti.flag && matti.party.some(([sp, lv, met]) => sp === LEFTOVER && lv === 15 && met === 'Seewil'), `Matti gives the leftover starter (${LEFTOVER} Lv 15)`, matti);
  await run(`await talk();`);
  expect(await said('/Tee ohne Tasse/'), "Matti's after-text");
  await run(`await goto(4, 6); await walk('D'); await goto(8, 12); await walk('U');`);
  expectPos(await run('return pos()'), { map: 'seewil_house_2', x: 4, y: 6 }, 'legend house');
  await run(`await walk('UU L'); await face('left'); await talk(); await goto(4, 6); await walk('D');`);
  expect(await said('/sein Atem färbt die Berge/'), 'legend, part 1');

  await run(`await goto(8, 5); await walk('U'); await walk('UUUU LLLL'); await face('up');`);
  expectPos(await run('return pos()'), { map: 'seewil_shop', x: 1, y: 3 }, 'shop counter');
  const shop = await run(`
    await g.tap('a');
    for (let k = 0; k < 20 && !(top().name === 'message' && top().menu); k++) { if (g.top() === 'message') await g.tap('a'); else await g.advance(2); }
    await g.tap('a'); // KAUFEN
    const list = g.top();
    for (let k = 0; k < 4 && g.top() !== 'overworld'; k++) await g.tap('b');
    for (let k = 0; k < 10 && g.top() !== 'overworld'; k++) {
      const t = top();
      if (t.name === 'message' && t.menu) { await g.tap('down'); await g.tap('down'); await g.tap('a'); } else await g.tap('a');
    }
    await settle();
    return { list, stack: g.stack() };
  `);
  expect(shop.list === 'shop-buy' && shop.stack.join() === 'overworld', 'Seewil Laden opens its buy list', shop);
  await run(`await goto(5, 7); await walk('D');`);

  await run(`await goto(13, 3); await walk('U');`);
  expectPos(await run('return pos()'), { map: 'seewil', x: 13, y: 3 }, 'north guard pushes the player back');
  expect(await said('/Ohne das Wellenabzeichen/'), 'north gate text');

  // --- Halle 2: Sina, Ruben, Alois along the canals, then Undine ------------------------------------------------
  await run(`await topUp(21); await goto(22, 6); await walk('U');`);
  expectPos(await run('return pos()'), { map: 'seewil_hall', x: 6, y: 14, facing: 'up' }, 'Halle door');
  await h.shot('out/e2e/41-area2-hall.png');
  await run(`await walk('U LLLL UU RRRRRR');`);
  expect((await flags())['trainer:hall2_sina'], 'Sina watches the first stretch', await party());
  await run(`await topUp(); await walk('UUUU LLLLL');`);
  expect((await flags())['trainer:hall2_ruben'], 'Ruben watches the second stretch', await party());
  await run(`await topUp(); await walk('UUUU');`);
  expect((await flags())['trainer:hall2_alois'], 'Alois watches the last bridge', await party());
  await run(`await topUp(24); await walk('U RRR'); await face('up'); await talk();`); // Lv 21 lost to Tüpfli + Seefürst's Alpenrast
  const hall = await run(`return { badges: g.state.badges, revive: g.state.bag.revive, undine: g.state.flags['trainer:leader_undine'], party: g.state.party.map((c) => [c.species, c.level]) }`);
  expect(hall.badges.includes('badge_water') && hall.revive === 2 && hall.undine, 'Wellenabzeichen + 2 revives', hall);
  expect(await said('/erhält das Wellenabzeichen/') && (await said('/nach Norden zur Glimmerhöhle/')), 'badge + after-text');

  // --- chapter-2 closing beat outside the Halle: Alpenglühen, then {RIVAL} points north and runs ahead ----------------
  await run(`await goto(6, 14);`);
  const ending = await run(`
    g.down('down');
    for (let k = 0; k < 120 && ow().map.id !== 'seewil'; k++) await g.advance(1);
    g.up('down');
    // play the closing beat up to the Alpenglühen line (screenshot), the rest runs below
    for (let k = 0; k < 3000 && g.top() !== 'title'; k++) {
      if (g.top() !== 'message') { await g.advance(1); continue; }
      record();
      if (/Alpenglühen/.test(topText())) return { pause: true };
      await g.tap('a');
    }
    return { pause: false };
  `);
  if (ending.pause) await h.shot('out/e2e/41-area2-ending.png');
  const after = await run(`
    await mash();
    return { stack: g.stack(), pos: pos(), chapter2: g.state.flags.chapter2_cleared, rival: !!ow().findNpc('rival') };
  `);
  expect(ending.pause, 'closing beat reached the Alpenglühen line');
  expect(after.stack.join() === 'overworld' && after.chapter2 && !after.rival, 'closing beat ends in the overworld (no credits), rival gone', after);
  expectPos(after.pos, { map: 'seewil', x: 22, y: 6 }, 'still outside the Halle');
  expect(await said('/in den See gespült/') && (await said('/Abgemacht/')), 'closing beat with the rival');
  expect(await said('/Funkenstadt mit der dritten Halle/'), 'the rival points north to Funkenstadt');
  expect(!(await said('/Ende von Kapitel 2/')), 'no chapter-2 credits any more');

  // --- the north gate is open now: Pfad 3 ------------------------------------------------------------------------------
  await run(`await goto(14, 3); await face('right'); await talk();`);
  expect(await said('/Pfad 3 führt am Ufer entlang zur Glimmerhöhle/'), 'north guard after the badge');
  await run(`await goto(13, 1); await walk('U'); await walk('U');`);
  expectPos(await run('return pos()'), { map: 'pfad_3', x: 10, y: 43 }, 'north connection to Pfad 3');
  await h.shot('out/e2e/41-area2-after.png');

  console.log(`    ${STARTER}: after Pfad 2 ${JSON.stringify(afterPfad2)} · after Undine ${JSON.stringify(hall.party)} · top-ups: Lv 17 (Flüsterwald), Lv 21 (Halle 2), Lv 24 (Undine)`);
}
