/**
 * Area 3 critical path from a chapter-2-complete save (Felsabzeichen + Wellenabzeichen, the chapter-2 closing beat
 * already seen, standing outside Halle 2 in Seewil – exactly what a save from the chapter-2 release looks like):
 * north gate → Pfad 3 (5 trainers, the resting hiker) → Glimmerhöhle 1 (Godi, Lars) → Glimmerhöhle 2 (Fredi, Petra's
 * blockade) → Funkenstadt (north gate closed, Halle blocked, Heilstation) → Funkenwerk (Udo, Rita, Egon, Bise; Zita
 * freed) → the clockmaker's Guggerli, Laden → Halle 3 (Jola, Max, Ben, Zita) → north gate opens → Pfad 4.
 * Real walking and talking (scripts/lib/playthrough.mjs drives battles like the balance sim's sensible player); no
 * warps. A repel keeps random wild battles out of the scripted walk (trainers still spot the player); a heal between
 * trainers stands in for the player's potions.
 * Level top-ups (the story run, not the balance): Lv 26 at the start (where chapter 2 leaves the team), Lv 30 before
 * the Funkenwerk (Bise's Fratzgeist sends a mashed Lv 28 team to sleep and drains it), Lv 30 for Halle 3.
 * Env A3_STARTER = sproessli (default) | zuendli | biberli picks the starter (and so the team).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { HELPERS, PT } from '../lib/playthrough.mjs';

const STARTER = process.env.A3_STARTER ?? 'sproessli';
const RIVAL = { sproessli: 'zuendli', zuendli: 'biberli', biberli: 'sproessli' }[STARTER];
const LEFTOVER = { sproessli: 'biberli', zuendli: 'sproessli', biberli: 'zuendli' }[STARTER];

export const name = 'area 3: Seewil → Pfad 3 → Glimmerhöhle (Godi, Lars, Fredi, Petra) → Funkenstadt → Funkenwerk (Bise) → Halle 3 (Zita) → Pfad 4';

const TOP_UP = `
  /**
   * Test stand-in for grinding: raise the party to at least \`level\` (exp = level³, medium growth) with the moves a
   * levelling player would know by then (the last four of the learnset), then heal (lastHeal stays as it was).
   */
  window.pt.topUp = async (level = 0) => {
    const D = g.data;
    const lastHeal = { ...g.state.lastHeal };
    for (const c of g.state.party) {
      if (c.level >= level) continue;
      c.level = level; c.exp = Math.max(c.exp, level ** 3);
      const ids = [...new Set(D.getSpecies(c.species).learnset.filter((e) => e.level <= level).map((e) => e.move))].slice(-4);
      c.moves = ids.map((id) => ({ id, pp: D.getMove(id).pp }));
    }
    window.pt.ow().enqueue(() => window.pt.ow().ctx.heal());
    await window.pt.settle();
    g.state.lastHeal = lastHeal;
  };
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
    const log = await h.run('return window.pt_state ? window.pt_state.log : []').catch(() => []);
    mkdirSync('out/e2e', { recursive: true });
    writeFileSync('out/e2e/42-area3.log', log.join('\n'));
  }
}

async function play(h) {
  await h.run(HELPERS);
  await h.run('window.ptShot = null;');
  await h.run(TOP_UP);
  const run = (code) => h.run(`${PT} const topUp = window.pt.topUp; ${code}`);
  const said = (re) => h.run(`return window.pt_state.log.some((t) => ${re}.test(t))`);
  const flags = () => run(`return g.state.flags`);
  const party = () => run(`return g.state.party.map((c) => [c.species, c.level])`);
  const pos = () => run('return pos()');
  const beaten = async (...ids) => {
    const f = await flags();
    for (const id of ids) expect(f[`trainer:${id}`], `${id} beaten on the way`, { pos: await pos(), party: await party() });
  };

  // --- chapter-2-complete state in Seewil (old save: the closing beat was already seen) -----------------------
  await run(`
    const D = g.data;
    const evolved = (id, lv) => { let sp = D.getSpecies(id); while (sp.evolves && sp.evolves.level <= lv) sp = D.getSpecies(sp.evolves.to); return sp.id; };
    g.newGame({ name: 'Kai' });
    const s = g.state;
    s.starter = '${STARTER}';
    s.rivalName = 'Lio';
    g.give(evolved('${STARTER}', 24), 24); g.give(evolved('${LEFTOVER}', 21), 21); g.give(evolved('munggli', 21), 21);
    for (const f of ['got_starter', 'rival1_done', 'lab_greeted', 'gift_mom_potions', 'gift_kiesel_crystals', 'chapter1_cleared',
      'rival2_done', 'forest_cleared', 'gift_ranger_potions', 'gift_starter', 'chapter2_cleared',
      'trainer:rival1_${RIVAL}', 'trainer:rival2_${RIVAL}', 'trainer:leader_jost', 'trainer:leader_undine']) g.flag(f);
    s.badges.push('badge_earth', 'badge_water');
    g.item('potion', 3); g.item('super_potion', 4); g.item('revive', 2); g.item('crystal', 6); g.item('crystal_great', 2);
    s.money = 6000;
    s.repelSteps = 3000;
    s.lastHeal = { mapId: 'seewil_center', x: 5, y: 3, facing: 'up' };
    g.warp('seewil', 22, 6, 'down');
    await g.advance(30); await settle();
    await topUp(26);
  `);
  const start = await run(`return { pos: pos(), rival: !!ow().findNpc('rival'), stack: g.stack() }`);
  expect(!start.rival && start.stack.join() === 'overworld', 'the chapter-2 closing beat does not replay', start);
  const atStart = await party();

  // --- Seewil: the north gate is open → Pfad 3 ------------------------------------------------------------------
  await run(`await goto(13, 1); await walk('U'); await walk('U'); await g.advance(30);`);
  expectPos(await pos(), { map: 'pfad_3', x: 10, y: 43 }, 'north connection to Pfad 3');
  await h.shot('out/e2e/42-area3-pfad3.png');

  // --- Pfad 3: Beat on the shore, Heidi at the bridge, Nora, Toni, the hiker, Emil at the cave ---------------------
  await run(`await walk('UUUUUUU');`);
  await beaten('pfad3_beat');
  await run(`await topUp(); await walk('U LLL UUUUUUUU RRR UUU UUU');`);
  await beaten('pfad3_heidi');
  await run(`await topUp(); await walk('UU LLLLL UU');`);
  await beaten('pfad3_nora');
  await run(`await topUp(); await walk('UUUU UUU RRRR');`);
  await beaten('pfad3_toni');
  await run(`await walk('RRRRR UUU R'); await face('right'); await talk();`);
  expect(await said('/Labyrinth/'), 'the resting hiker');
  await run(`await topUp(); await walk('U UU LLLLL U');`);
  await beaten('pfad3_emil');
  const afterPfad3 = await party();
  await run(`await walk('U'); await walk('U'); await g.advance(30);`);
  expectPos(await pos(), { map: 'glimmerhoehle_1', x: 6, y: 22, facing: 'up' }, 'cave mouth → Glimmerhöhle 1');
  await h.shot('out/e2e/42-area3-cave1.png');

  // --- Glimmerhöhle 1: Godi behind the tunnel, Lars in the upper gallery ----------------------------------------------
  await run(`await topUp(); await walk('UU RRRRRRRRRR');`);
  await beaten('hoehle_godi');
  await run(`await topUp(); await walk('R UUUUUUUU UUUU LLLLLLLLL UUUU RRRRRR');`);
  await beaten('grunt_hoehle_1');
  await run(`await walk('RRRRRRR UU'); await walk('U'); await g.advance(30);`);
  expectPos(await pos(), { map: 'glimmerhoehle_2', x: 4, y: 22, facing: 'up' }, 'passage → Glimmerhöhle 2');

  // --- Glimmerhöhle 2: Fredi at the tunnel, Petra's blockade before the exit -------------------------------------------
  await run(`await topUp(); await walk('UUUUUUUUUUUUU RRRRRRRRRRR');`);
  await beaten('hoehle_fredi');
  await run(`await topUp(); await walk('UUUU RR');`);
  await h.shot('out/e2e/42-area3-petra.png');
  await run(`await walk('U');`); // (17,4) is the trigger tile in front of Petra
  let f = await flags();
  expect(f.cave_cleared && f['trainer:grunt_hoehle_2'], 'Petra beaten, cave cleared', { pos: await pos(), party: await party() });
  expect(await said('/Funkenwerk/') && (await said('/Frostkern zusammen/')), 'Petra lets the Funkenwerk plan slip');
  expect(!(await run(`return !!ow().findNpc('grunt_petra')`)), 'Petra gone');
  await run(`await walk('UU'); await walk('U'); await g.advance(30);`);
  expectPos(await pos(), { map: 'funkenstadt', x: 4, y: 20, facing: 'up' }, 'cave exit → Funkenstadt');
  await h.shot('out/e2e/42-area3-funkenstadt.png');

  // --- Funkenstadt: the north gate is closed, the Halle is blocked ---------------------------------------------------
  await run(`await goto(14, 3); await walk('U');`);
  expectPos(await pos(), { map: 'funkenstadt', x: 14, y: 3 }, 'north guard pushes the player back');
  expect(await said('/Ohne Funkenabzeichen/'), 'north gate text');
  await run(`await goto(5, 9); await face('up'); await talk();`);
  expect(await said('/Die Halle ist zu/'), 'Halle blocked while the Werk is occupied');
  await run(`await goto(5, 9); await walk('U').catch(() => {});`);
  expectPos(await pos(), { map: 'funkenstadt', x: 5, y: 9 }, 'cannot enter the Halle yet');
  await run(`await goto(6, 16); await walk('U');`);
  expectPos(await pos(), { map: 'funken_center', x: 5, y: 7 }, 'Heilstation');
  await run(`await walk('UUUU'); await talk(); await walk('DDDDD');`);
  expect(await run(`return g.state.lastHeal.mapId === 'funken_center'`), 'nurse sets lastHeal in Funkenstadt');

  // --- Funkenwerk: Udo, Rita, Egon along the aisle, then Bise; Zita freed ------------------------------------------------
  await run(`await topUp(30); await goto(22, 8); await walk('U');`);
  expectPos(await pos(), { map: 'funken_werk', x: 6, y: 8 }, 'Funkenwerk door');
  expect((await run(`return g.game.audio.currentMusic()`)) === 'villain', 'villain music in the occupied Werk');
  await run(`await walk('U');`);
  await beaten('grunt_werk_1');
  await run(`await topUp(); await walk('UUU');`);
  await beaten('grunt_werk_2');
  await run(`await topUp(); await walk('UU');`);
  await beaten('grunt_werk_3');
  await h.shot('out/e2e/42-area3-bise.png');
  await run(`await topUp(); await face('up'); await talk();`);
  f = await flags();
  expect(f.werk_cleared && f['trainer:admin_bise_1'], 'Bise beaten, Werk cleared', { pos: await pos(), party: await party() });
  expect(await said('/Urkristall aus eurem Tresor/') && (await said('/Ich warte in der Halle/')), 'Bise escapes with the Urkristall, Zita freed');
  const werk = await run(`return { music: g.game.audio.currentMusic(), bise: !!ow().findNpc('bise'), zita: !!ow().findNpc('zita'), pos: pos() }`);
  expect(werk.music === 'lab' && !werk.bise && !werk.zita, 'Werk freed: lab music, Bise and Zita gone', werk);
  await run(`await walk('R'); await face('right'); await talk();`);
  expect(await said('/Tresor ist leer/'), 'engineer');
  await run(`await goto(6, 8); await walk('D');`);
  expectPos(await pos(), { map: 'funkenstadt', x: 22, y: 8 }, 'out of the Werk');
  expect(!(await run(`return !!ow().findNpc('hall_blocker')`)), 'the Halle is open again');

  // --- the clockmaker's Guggerli, Laden -------------------------------------------------------------------------------
  await run(`await goto(21, 16); await walk('U');`);
  expectPos(await pos(), { map: 'funken_house_1', x: 4, y: 6 }, "clockmaker's house");
  await run(`await walk('UU RR'); await face('right'); await talk(); await goto(4, 6); await walk('D');`);
  const gift = await run(`return { flag: g.state.flags.gift_guggerli, party: g.state.party.map((c) => [c.species, c.level, c.metAt]) }`);
  expect(gift.flag && gift.party.some(([sp, lv, met]) => sp === 'guggerli' && lv === 24 && met === 'Funkenstadt'), 'Anton gives Guggerli Lv 24', gift);

  await run(`await goto(11, 16); await walk('U'); await walk('UUUU LLLL'); await face('up');`);
  expectPos(await pos(), { map: 'funken_shop', x: 1, y: 3 }, 'shop counter');
  const shop = await run(`
    await g.tap('a');
    for (let k = 0; k < 20 && !(top().name === 'message' && top().menu); k++) { if (g.top() === 'message') await g.tap('a'); else await g.advance(2); }
    await g.tap('a'); // KAUFEN
    const list = top();
    const items = list.items ? list.items.map((it) => it.id) : [];
    for (let k = 0; k < 4 && g.top() !== 'overworld'; k++) await g.tap('b');
    for (let k = 0; k < 10 && g.top() !== 'overworld'; k++) {
      const t = top();
      if (t.name === 'message' && t.menu) { await g.tap('down'); await g.tap('down'); await g.tap('a'); } else await g.tap('a');
    }
    await settle();
    await goto(5, 7); await walk('D');
    return { name: list.name, items, stack: g.stack() };
  `);
  expect(shop.name === 'shop-buy' && shop.items.includes('hyper_potion') && shop.stack.join() === 'overworld', 'Funkenstadt Laden sells its stock', shop);

  // --- Halle 3: Jola, Max, Ben at the gaps in the machine rows, then Zita ---------------------------------------------------
  await run(`await topUp(30); await goto(5, 8); await walk('U');`);
  expectPos(await pos(), { map: 'funken_hall', x: 6, y: 14, facing: 'up' }, 'Halle door');
  await h.shot('out/e2e/42-area3-hall.png');
  await run(`await walk('UU RR UU U');`);
  await beaten('hall3_jola');
  await run(`await topUp(); await walk('U LLLLL U U');`);
  await beaten('hall3_max');
  await run(`await topUp(); await walk('U RRRRR U U');`);
  await beaten('hall3_ben');
  await run(`await topUp(); await walk('U LL'); await face('up'); await talk();`);
  const hall = await run(`return { badges: g.state.badges, ether: g.state.bag.ether, zita: g.state.flags['trainer:leader_zita'], party: g.state.party.map((c) => [c.species, c.level]) }`);
  expect(hall.badges.includes('badge_spark') && hall.ether === 2 && hall.zita, 'Funkenabzeichen + 2 ethers', hall);
  expect(await said('/erhält das Funkenabzeichen/') && (await said('/auf Pfad 4/')), 'badge + after-text');

  // --- the north gate opens: on to Pfad 4 (area 4) -----------------------------------------------------------------
  await run(`await goto(6, 14); await walk('D');`);
  expectPos(await pos(), { map: 'funkenstadt', x: 5, y: 8 }, 'out of the Halle');
  await run(`await goto(15, 3); await walk('U'); await face('right'); await talk();`);
  expect(await said('/hinauf nach Frostalp/'), 'north guard after the badge');
  expectPos(await pos(), { map: 'funkenstadt', x: 15, y: 2 }, 'the gate strip lets badge holders through');
  const exit = await run(`
    await walk('UU');
    try { await walk('U'); } catch { return { pos: pos(), blocked: true }; }
    await g.advance(30);
    return { pos: pos(), blocked: false };
  `);
  if (exit.blocked) {
    // area 4 (built in parallel) may not be in this build yet: the edge then simply bumps
    expectPos(exit.pos, { map: 'funkenstadt', x: 15, y: 0 }, 'north edge without Pfad 4');
    console.log('    note: pfad_4 is not in this build yet – the Funkenstadt north edge bumped');
  } else {
    expectPos(exit.pos, { map: 'pfad_4', x: 11, y: 47 }, 'north connection to Pfad 4');
    await h.shot('out/e2e/42-area3-pfad4.png');
  }

  console.log(
    `    ${STARTER}: start ${JSON.stringify(atStart)} · after Pfad 3 ${JSON.stringify(afterPfad3)} · after Zita ${JSON.stringify(hall.party)} · ` +
      'top-ups: Lv 26 (start), Lv 30 (Funkenwerk), Lv 30 (Halle 3)',
  );
}
