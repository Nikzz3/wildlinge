export const name = 'area 1: new game → lab (starter, rival 1) → Pfad 1 → Halle 1 badge → closing beat → east gate → Pfad 2';

/**
 * In-page helpers (window.a1). Walking is real (tile by tile); `mash` confirms messages and battles,
 * answering "Nein" to nickname / forget-move prompts.
 */
export const HELPERS = `
  const ow = () => g.game.stack.find((s) => s.name === 'overworld');
  const pos = () => { const s = g.state.player; return { map: s.mapId, x: s.x, y: s.y, facing: s.facing }; };
  const free = () => g.top() === 'overworld' && !ow().busy && !ow().player.moving;
  const settle = async (max = 600) => {
    for (let k = 0; k < max && g.top() === 'overworld' && (ow().busy || ow().player.moving); k++) await g.advance(1);
    await g.advance(2);
  };
  /** Text of the top message box (prompts included). */
  const topText = () => {
    const top = g.game.stack[g.game.stack.length - 1];
    return top && top.box && top.box.pages ? top.box.pages.flat().join(' ') : '';
  };
  const isPrompt = () => {
    const top = g.game.stack[g.game.stack.length - 1];
    return g.top() === 'message' && !!top.choices;
  };
  /** Sprössli's sensible move: plant moves against everything except plant foes (they resist them). */
  const PLANT_FOES = /^(chaeferli|sproessli|moosdachs)$/;
  const MOVE_PRIORITY = ['saftzapfen', 'zweigschlag', 'stupser'];
  const pickMove = (battle) => {
    const moves = battle.bottom.moves.map((m) => m.id);
    const foe = battle.mons.enemy.species ?? '';
    const order = PLANT_FOES.test(foe) ? ['stupser'] : MOVE_PRIORITY;
    for (const id of order) if (moves.includes(id) && battle.bottom.moves[moves.indexOf(id)].pp > 0) return moves.indexOf(id);
    return 0;
  };
  /** Confirms everything until the overworld is idle again (choosing moves in battle). Records every message. */
  const mash = async (max = 4000) => {
    for (let k = 0; k < max && !free(); k++) {
      if (g.top() === 'overworld') { await g.advance(1); continue; }
      const battle = g.top() === 'battle' ? g.game.stack[g.game.stack.length - 1] : null;
      if (battle && battle.bottom.kind === 'moves') battle.moveCursor = pickMove(battle);
      const text = topText();
      if (text && window.a1.log[window.a1.log.length - 1] !== text) window.a1.log.push(text);
      if (isPrompt() && /Spitznamen|eine Attacke vergessen/.test(text)) await g.tap('b');
      else await g.tap('a');
    }
    await settle();
    if (!free()) throw new Error('stuck in ' + g.stack().join(' > ') + ': ' + topText());
  };
  const DIRS = { U: 'up', D: 'down', L: 'left', R: 'right' };
  /** One tile (turning first if needed); trainers/scripts that start on the way are mashed through. */
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
  /** Turn in place without walking. */
  const face = async (dir) => { await g.tap(dir); await g.advance(8); await settle(); };
  const talk = async () => { await g.tap('a'); await mash(); };
  /**
   * Test stand-in for potions / grinding: optional level boost (starters grow 'medium': exp = level³),
   * then a full heal that keeps the respawn point.
   */
  const PP = { stupser: 35, brummbass: 30, zweigschlag: 30, saftzapfen: 25 };
  const topUp = async (level = 0, moves = null) => {
    const lastHeal = { ...g.state.lastHeal };
    for (const c of g.state.party) if (c.level < level) { c.level = level; c.exp = Math.max(c.exp, level ** 3); }
    if (moves) g.state.party[0].moves = moves.map((id) => ({ id, pp: PP[id] }));
    ow().enqueue(() => ow().ctx.heal());
    await settle();
    g.state.lastHeal = lastHeal;
  };
  window.a1 = { ow, pos, settle, mash, walk, face, talk, topUp, topText, log: [] };
`;

const expect = (cond, what, data) => {
  if (!cond) throw new Error(`${what}${data === undefined ? '' : `: ${JSON.stringify(data)}`}`);
};
const expectPos = (actual, want, what) => {
  for (const [k, v] of Object.entries(want)) expect(actual[k] === v, `${what}: expected ${JSON.stringify(want)}`, actual);
};

export async function run(h) {
  await h.run(HELPERS);
  const run = (code) => h.run(`const { ow, pos, settle, mash, walk, face, talk, topUp, topText } = window.a1; ${code}`);
  const said = (re) => h.run(`return window.a1.log.some((t) => ${re}.test(t))`);

  // --- START: the player's room, mom calls -----------------------------------------------------------
  await run(`g.newGame(); await g.advance(5);`);
  expectPos(await run('return pos()'), { map: 'player_house', x: 1, y: 1, facing: 'down' }, 'START');
  await run(`for (let k = 0; k < 200 && g.top() !== 'message'; k++) await g.advance(1); await mash();`);
  expect(await said('/Schlafmütze/'), 'mom calls on the first morning');
  await run(`await walk('DDDRRRRR'); await talk();`);
  expect(await said('/Professorin Arven hat nach dir gefragt/'), 'mom points to Arven');
  await h.shot('out/e2e/40-area1-home.png');

  // --- Moosbach: the north exit is blocked without a starter -------------------------------------------
  await run(`await walk('DDLLD');`);
  expectPos(await run('return pos()'), { map: 'moosbach', x: 4, y: 6, facing: 'down' }, 'out of the house');
  await run(`await walk('RRRRRUUU'); await walk('U');`);
  expectPos(await run('return pos()'), { map: 'moosbach', x: 9, y: 3 }, 'kid_north pushes the player back');
  expect(await said('/Ohne eigenen Wildling ins hohe Gras/'), 'gate text');

  // --- Arven's lab: greeting, starter, rival battle, crystals ------------------------------------------
  await run(`await walk('DDDDDDDDDLLLU');`);
  expectPos(await run('return pos()'), { map: 'arven_lab', x: 6, y: 8, facing: 'up' }, 'lab door');
  await run(`await walk('UU');`); // Arven notices the player
  expect(await said('/Hier liegen drei Fangkristalle/'), 'Arven greets');
  await run(`await walk('UULL'); await face('up');`);
  await h.shot('out/e2e/40-area1-lab.png');
  await run(`await talk();`);
  const lab = await run(`return {
    flags: g.state.flags, starter: g.state.starter, party: g.state.party.map((c) => [c.species, c.level, c.nickname]),
    crystal: g.state.bag.crystal, rival: !!ow().findNpc('rival'), crystals: ow().npcs.filter((n) => n.def.sprite === 'crystal').length,
  }`);
  expect(lab.flags.got_starter && lab.flags.rival1_done && lab.flags.lab_greeted, 'starter flags', lab.flags);
  expect(lab.starter === 'sproessli' && lab.party.length === 1 && lab.party[0][0] === 'sproessli' && lab.party[0][2] === null, 'starter', lab);
  expect(lab.crystal === 5 && !lab.rival && lab.crystals === 0, 'crystals given, rival and crystals gone', lab);
  expect(await said('/Dann nehme ich Zündli/'), 'rival takes the counter-starter');
  expect(await said('/Bis bald, Schnecke/'), 'rival leaves');
  const rivalWon = lab.flags['trainer:rival1_zuendli'] === true;

  // --- back home: mom's potions + heal --------------------------------------------------------------
  await run(`await walk('RRDDDDD');`);
  expectPos(await run('return pos()'), { map: 'moosbach', x: 6, y: 12, facing: 'down' }, 'out of the lab');
  await run(`await walk('RRRUUUUUULLLLLU'); await walk('UURR'); await talk();`);
  const home = await run(`return { gift: g.state.flags.gift_mom_potions, potion: g.state.bag.potion, lastHeal: g.state.lastHeal }`);
  expect(home.gift && home.potion === 2 && home.lastHeal.mapId === 'player_house', 'mom gives potions and heals', home);

  // --- north to Pfad 1 (the gate is open now) ----------------------------------------------------------
  await run(`await walk('DDLLD'); await walk('RRRRRUUUUUU'); await walk('U');`);
  expectPos(await run('return pos()'), { map: 'pfad_1', x: 9, y: 39, facing: 'up' }, 'north connection to Pfad 1');
  // Keep random wild battles out of the scripted walk; the three trainers still spot the player on the path.
  // This scenario checks the story scripts, not the balance: it plays the route at Lv 12 and heals after each
  // trainer. 50-chapter1-full.mjs plays the chapter at natural levels.
  await run(`g.state.repelSteps = 400; await topUp(12, ['stupser', 'brummbass', 'zweigschlag', 'saftzapfen']);`);
  await run(`await walk('UUUUUUUUUU'); await topUp();`); // V4 past Beni
  await run(`await walk('LLLL UUUUUUUUUU');`); // west loop through the first grass
  await run(`await walk('RRRRRRRR UUUUUUUUUUU'); await topUp();`); // up past Lea
  await run(`await walk('LLLL UUUUUUUU'); await topUp();`); // past Sepp to the north edge
  const route = await run(`return { flags: g.state.flags, party: g.state.party.map((c) => [c.species, c.level, c.hp]) }`);
  for (const t of ['pfad1_beni', 'pfad1_lea', 'pfad1_sepp']) expect(route.flags[`trainer:${t}`], `${t} beaten on the way`, route);
  await run(`await walk('U');`);
  expectPos(await run('return pos()'), { map: 'kieselstadt', x: 11, y: 21, facing: 'up' }, 'north connection to Kieselstadt');
  await h.shot('out/e2e/40-area1-kieselstadt.png');

  // --- Kieselstadt: collector gift, east gate, Heilstation ---------------------------------------------
  await run(`await walk('UUURRRRRRU'); await walk('UURR'); await talk();`);
  expect(await run(`return g.state.flags.gift_kiesel_crystals && g.state.bag.crystal === 8`), 'collector gives 3 crystals');
  await run(`await walk('LLDDD');`);
  expectPos(await run('return pos()'), { map: 'kieselstadt', x: 17, y: 18 }, 'out of the collector house');
  await run(`await walk('LLLLLL UUUUUU RRRRRRRRR'); await walk('R');`);
  expectPos(await run('return pos()'), { map: 'kieselstadt', x: 20, y: 12 }, 'guard_east pushes the player back');
  expect(await said('/Felsabzeichen von Hüter Jost/'), 'east gate text');
  await run(`await walk('LLLLLLLLLLLLLLLL U');`);
  expectPos(await run('return pos()'), { map: 'kiesel_center', x: 5, y: 7 }, 'Heilstation');
  await run(`await walk('UUUU'); await talk(); await walk('DDDDD');`);
  expect(await run(`return g.state.lastHeal.mapId === 'kiesel_center'`), 'nurse sets lastHeal');

  // --- Halle 1 -----------------------------------------------------------------------------------------
  // Lv 14 keeps the scripted run safe (and below evolution at 16).
  const before = await run(`return g.state.party[0].level`);
  await run(`await topUp(14);`);
  await run(`await walk('RRRRRRR UUUUUU'); await walk('U');`);
  expectPos(await run('return pos()'), { map: 'kiesel_hall', x: 5, y: 12, facing: 'up' }, 'Halle door');
  await run(`await walk('UU LLLL UU RRRRRRRR'); await walk('U'); await topUp();`); // Urs sees the player in the gap
  expect(await run(`return g.state.flags['trainer:hall1_urs'] === true`), 'Urs beaten');
  await run(`await walk('UU LLLLLLLL'); await walk('U'); await topUp();`); // Vreni sees the player in the gap
  expect(await run(`return g.state.flags['trainer:hall1_vreni'] === true`), 'Vreni beaten');
  await run(`await walk('UU RRRR'); await face('up');`);
  await h.shot('out/e2e/40-area1-jost.png');
  await run(`await talk();`);
  const hall = await run(`return { badges: g.state.badges, sp: g.state.bag.super_potion, jost: g.state.flags['trainer:leader_jost'], party: g.state.party.map((c) => [c.species, c.level]) }`);
  expect(hall.badges.includes('badge_earth') && hall.sp === 2 && hall.jost, 'badge + 2 super potions', hall);
  expect(await said('/Wache nach Osten/'), "Jost's after-text");

  // --- closing beat outside the Halle (no credits any more): rival + Arven send the player east -------------
  await run(`await walk('LLLL DDD RRRRRRRR DDD LLLLLLLL DD RRRR DD');`);
  await run(`
    g.down('down');
    for (let k = 0; k < 120 && ow().map.id !== 'kieselstadt'; k++) await g.advance(1);
    g.up('down');
    // up to Arven's first line (screenshot), then the rest of the scene
    for (let k = 0; k < 2000 && !/^Arven:/.test(topText()); k++) {
      if (g.top() === 'message') { const t = topText(); if (window.a1.log[window.a1.log.length - 1] !== t) window.a1.log.push(t); await g.tap('a'); }
      else await g.advance(1);
    }
    await g.advance(2);
  `);
  await h.shot('out/e2e/40-area1-ending.png');
  await run(`await mash();`);
  const ending = await run(`return { stack: g.stack(), pos: pos(), flags: g.state.flags, rival: !!ow().findNpc('rival'), arven: !!ow().findNpc('arven') }`);
  expect(ending.stack.join() === 'overworld' && ending.flags.chapter1_cleared, 'closing beat ends in the overworld (no credits)', ending);
  expect(!ending.rival && !ending.arven, 'rival and Arven walked off', ending);
  expectPos(ending.pos, { map: 'kieselstadt', x: 11, y: 6 }, 'player stays at the Halle door');
  expect(await said('/Felsabzeichen! Nicht schlecht, Schnecke/'), 'rival congratulates');
  expect(await said('/mein Kollege Matti/') && (await said('/Gute Reise, Kai/')), 'Arven points east to Seewil');
  expect(await said('/Seewil hat auch eine Halle/'), 'rival runs ahead');
  expect(!(await said('/Steinschlag|Ende von Kapitel/')), 'no rockfall, no credits');

  // the beat does not replay when leaving the Halle again
  await run(`await walk('U'); await walk('D');`);
  const again = await run(`return { pos: pos(), stack: g.stack(), rival: !!ow().findNpc('rival') }`);
  expect(again.stack.join() === 'overworld' && !again.rival, 'closing beat plays once', again);

  // --- east: the guard lets badge holders through to Pfad 2 -----------------------------------------------------
  await run(`await walk('DDDDRRRRRRRRRR'); await face('up'); await talk();`);
  expect(await said('/Gute Reise! Pfad 2 führt zum Flüsterwald/'), 'guard after the badge');
  await run(`await walk('RR'); await walk('R');`);
  expectPos(await run('return pos()'), { map: 'pfad_2', x: 0, y: 8, facing: 'right' }, 'east connection to Pfad 2');
  await h.shot('out/e2e/40-area1-after.png');

  console.log(`    rival 1 ${rivalWon ? 'won' : 'lost'}; after Pfad 1: ${JSON.stringify(route.party)}; level before the Halle: ${before}; after Jost: ${JSON.stringify(hall.party)}`);
}
