/**
 * Chapter 1 in one continuous run, played like a normal player: no level boosts, no repel, no warps.
 * Title → Neues Spiel → intro (names) → Mutter → Labor (starter, rival 1) → Pfad 1 (wild battles, a catch,
 * Beni / Lea / Sepp) → Kieselstadt (Sammler, Heilstation, Laden) → Halle 1 (Urs, Vreni, Jost) → closing beat →
 * east gate → Pfad 2 → save (start menu) → reload → title → WEITER resumes on Pfad 2.
 *
 * Battles: the driver (scripts/lib/playthrough.mjs) presses real buttons (command grid, move grid, bag pockets,
 * party) and plays like the balance sim's sensible player: best expected damage (Brandmal first on a fresh physical
 * attacker), Kräutertee below 1/3 LP in battle and below 60 % before the next trainer. A lost Halle battle means
 * Heilstation and back. Plays all three starters (fresh page each); env CH1_STARTER = sproessli | zuendli |
 * biberli plays only one. CH1_SHOTS=1 writes the screenshot tour of the first run to out/shots/ch1/.
 * The message log of each run goes to out/e2e/50-chapter1-<starter>.log.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { HELPERS, PT } from '../lib/playthrough.mjs';

export const name = 'chapter 1: title → lab → Pfad 1 (wild, catch, trainers) → Kieselstadt (heal, shop) → Halle 1 → closing beat → Pfad 2 → save → WEITER';

const STARTERS = process.env.CH1_STARTER ? [process.env.CH1_STARTER] : ['sproessli', 'zuendli', 'biberli'];
const TOUR = process.env.CH1_SHOTS === '1';


const expect = (cond, what, data) => {
  if (!cond) throw new Error(`${what}${data === undefined ? '' : `: ${JSON.stringify(data)}`}`);
};
const expectPos = (actual, want, what) => {
  for (const [k, v] of Object.entries(want)) expect(actual[k] === v, `${what}: expected ${JSON.stringify(want)}`, actual);
};

export async function run(h) {
  for (const [i, starter] of STARTERS.entries()) {
    if (i > 0) {
      // fresh game: no save, title screen again
      await h.page.evaluate(() => localStorage.clear());
      await h.page.reload();
      await h.page.waitForFunction(() => !!window.__game);
    }
    if (TOUR && i === 0) {
      mkdirSync('out/shots/ch1', { recursive: true });
      await h.page.exposeFunction('ptShot', (file) => h.page.locator('canvas').screenshot({ path: `out/shots/ch1/${file}.png` }).then(() => true));
    }
    await playChapter(h, starter, TOUR && i === 0);
    const errors = await h.allErrors();
    if (errors.length) throw new Error(`${starter}: runtime errors:\n${errors.join('\n')}`);
  }
}

async function playChapter(h, STARTER, tour) {
  const CRYSTAL_X = { sproessli: 4, zuendli: 5, biberli: 6 }[STARTER];
  const RIVAL = { sproessli: 'zuendli', zuendli: 'biberli', biberli: 'sproessli' }[STARTER];
  await h.run(HELPERS);
  if (!tour) await h.run('window.ptShot = null;');
  const run = (code) => h.run(`${PT} ${code}`);
  const said = (re) => h.run(`return window.pt_state.log.some((t) => ${re}.test(t))`);
  const party = () => run(`return g.state.party.map((c) => [c.species, c.level, c.hp, maxHp(c)])`);
  const flag = (f) => run(`return g.state.flags[${JSON.stringify(f)}] === true`);

  // --- title → Neues Spiel → intro (names) ------------------------------------------------------------
  await run(`await g.advance(200); await snap('01-title'); await g.tap('start'); await g.advance(4); await snap('02-title-menu');`);
  expect((await h.run('return g.stack().join()')) === 'title', 'title screen');
  await run(`
    await g.tap('a'); // NEUES SPIEL (no save yet)
    const want = { Mia: true, Finn: true };
    for (let i = 0, shot = false; i < 4000 && g.top() !== 'overworld'; i++) {
      const t = top();
      if (t?.name === 'intro' && !shot && i > 60) { shot = true; await snap('03-intro'); }
      if (t?.name === 'message' && t.menu) {
        const pick = t.menu.options.find((o) => want[o]);
        if (!pick) throw new Error('unexpected intro question: ' + t.menu.options.join(', '));
        if (pick === 'Mia') await snap('03b-intro-name');
        while (t.menu.options[t.menu.index] !== pick) await g.tap('down');
        await g.tap('a');
      } else if (t?.name === 'message') await g.tap('a');
      else await g.advance(4);
    }
    await g.advance(40);
  `);
  const names = await run(`return { stack: g.stack(), player: g.state.playerName, rival: g.state.rivalName }`);
  expect(JSON.stringify(names.stack) === '["overworld"]' && names.player === 'Mia' && names.rival === 'Finn', 'intro sets the names', names);

  // --- player's room: mom calls, mom talks ---------------------------------------------------------------
  expectPos(await run('return pos()'), { map: 'player_house', x: 1, y: 1 }, 'new game starts in the room');
  await run(`for (let k = 0; k < 200 && g.top() !== 'message'; k++) await g.advance(1); await snap('04-player-house'); await drive();`);
  await run(`await walk('DDDRRRRR'); await talk();`);
  expect(await said('/Professorin Arven hat nach dir gefragt/'), 'mom sends the player to Arven');

  // --- Moosbach → lab: starter, rival 1 ---------------------------------------------------------------------
  await run(`await walk('DDLLD'); await g.advance(30); await snap('05-moosbach'); await walk('RRRRR DDDDDD LLL U');`);
  expectPos(await run('return pos()'), { map: 'arven_lab', x: 6, y: 8 }, 'lab door');
  await run(`await walk('UU');`); // Arven notices the player
  expect(await said('/Hier liegen drei Fangkristalle/'), 'Arven greets');
  await run(`
    await walk('UU${'L'.repeat(6 - CRYSTAL_X)}'); await face('up'); await snap('06-lab');
    shotWhen('07-starter-choice', (t) => t.name === 'message' && !!t.menu && /nehmen/.test(topText()));
    shotWhen('08-rival-intro', (t) => t.name === 'battle' && t.trainers.enemy?.visible && /fordert/.test(topText()));
    shotWhen('09-rival-battle', (t) => t.name === 'battle' && t.bottom.kind === 'command');
    await talk();
  `);
  const lab = await run(`return { flags: g.state.flags, starter: g.state.starter, party: g.state.party.map((c) => [c.species, c.level]), crystal: g.state.bag.crystal }`);
  expect(lab.starter === STARTER && lab.party[0][0] === STARTER, 'starter received', lab);
  expect(lab.flags.got_starter && lab.flags.rival1_done && lab.crystal === 5, 'rival battle + 5 crystals', lab);
  const rivalWon = !!lab.flags[`trainer:rival1_${RIVAL}`];

  // --- home: mom's potions + heal, then north -----------------------------------------------------------
  await run(`await walk('${'R'.repeat(6 - CRYSTAL_X)}DDDDD');`);
  expectPos(await run('return pos()'), { map: 'moosbach', x: 6, y: 12 }, 'out of the lab');
  await run(`await walk('RRRUUUUUULLLLLU UURR'); await talk();`);
  expect(await run(`return g.state.flags.gift_mom_potions && g.state.bag.potion === 2`), 'mom gives 2 Kräutertee');
  await run(`await walk('DDLLD RRRRRUUUUUU U');`);
  expectPos(await run('return pos()'), { map: 'pfad_1', x: 9, y: 39 }, 'Pfad 1');
  await run(`await g.advance(30); await snap('10-pfad1');`);

  // --- Pfad 1: Beni, the west grass (wild battles + a catch), potion, Lea, Sepp ---------------------------------
  await run(`await walk('UUUUUUUUUU');`); // Beni spots the player at (9,32)
  expect(await flag('trainer:pfad1_beni'), 'Beni beaten', await party());
  await run(`
    await fieldHeal(); await walk('LLLL UUUU'); // into the west grass (row 25)
    S.wantCatch = true;
    shotWhen('11-wild-command', (t) => t.name === 'battle' && t.setup.kind === 'wild' && t.bottom.kind === 'command');
    S.onCommand = async () => { await g.tap('a'); await g.advance(2); await snap('12-wild-moves'); await g.tap('b'); await g.advance(2); };
    shotWhen('13-catch', (t) => t.name === 'battle' && t.bottom.kind === 'message' && t.box.lastPageShown && /gefangen/.test(topText()));
    for (let i = 0; i < 8 && g.state.party.length < 2; i++) await grass(1, 'L', 'R');
    S.wantCatch = false;
  `);
  const caught = await run(`return { party: g.state.party.map((c) => [c.species, c.level]), thrown: S.thrown, wild: S.wild }`);
  expect(caught.party.length === 2, 'caught a wild creature on Pfad 1', caught);
  // the player looks at the new team member: TEAM → STATUS, BEUTEL, LEXIKON
  await run(`
    await startMenu('party'); await snap('14-party');
    await g.tap('right'); await g.tap('a'); await g.tap('a'); await g.advance(4); await snap('15-summary'); // 2nd → STATUS
    await g.tap('right'); await g.advance(4); await snap('16-summary-stats');
    await closeMenus(); await startMenu('bag'); await snap('17-bag');
    await closeMenus(); await startMenu('dex'); await snap('18-lexikon');
    await closeMenus();
  `);
  // a few more wild battles while crossing the grass, like a normal player
  await run(`await fieldHeal(); await grass(3, 'L', 'R'); await fieldHeal();`);
  await run(`await goto(5, 15); await face('up'); await talk();`); // the Kräutertee by the pond (5,14)
  expect(await flag('item:pfad_1:potion'), 'picked up the potion on Pfad 1');
  await run(`await fieldHeal(); await walk('RRRRRRRR U');`); // Lea spots the player at (13,14)
  expect(await flag('trainer:pfad1_lea'), 'Lea beaten', await party());
  await run(`await fieldHeal(); await walk('UUUUUU LLLL UUUU');`); // Sepp spots the player at (9,4)
  expect(await flag('trainer:pfad1_sepp'), 'Sepp beaten', await party());
  const route = await party();
  await run(`await walk('UUUU U');`);
  expectPos(await run('return pos()'), { map: 'kieselstadt', x: 11, y: 21 }, 'Kieselstadt');

  // --- Kieselstadt: collector, Heilstation, Laden --------------------------------------------------------------
  await run(`await walk('UUURRRRRRU UURR'); await talk(); await walk('LLDDD');`);
  expect(await flag('gift_kiesel_crystals'), 'collector gift');
  await run(`await walk('LLLLLL UUUUUU LLLLLLL U');`);
  expectPos(await run('return pos()'), { map: 'kiesel_center', x: 5, y: 7 }, 'Heilstation');
  await run(`
    await walk('UUUU');
    shotWhen('19-heilstation', (t) => t.name === 'message');
    await talk(); await walk('DDDDD');
  `);
  expect(await run(`return g.state.lastHeal.mapId === 'kiesel_center' && lead().hp === maxHp(lead())`), 'nurse heals');
  await run(`await walk('RRRRRRR UUUU RRRRRRR U UUUU LLLL'); await face('up');`);
  expectPos(await run('return pos()'), { map: 'kiesel_shop', x: 1, y: 3 }, 'shop counter');
  const money = await run(`return g.state.money`);
  await run(`
    await g.tap('a');
    for (let k = 0; k < 20 && !(top().name === 'message' && top().menu); k++) { if (g.top() === 'message') await g.tap('a'); else await g.advance(2); }
    await g.tap('a'); // KAUFEN
    if (g.top() !== 'shop-buy') throw new Error('no buy list: ' + g.stack());
    await g.tap('down'); // Kräutertee
    await g.tap('a'); await g.tap('up'); await g.tap('up'); // 3×
    await snap('20-shop');
    await g.tap('a'); await g.tap('a'); // confirm, Ja
    for (let k = 0; k < 10 && g.top() === 'message'; k++) await g.tap('a');
    await g.tap('b'); // leave the list
    for (let k = 0; k < 10 && g.top() !== 'overworld'; k++) {
      const t = top();
      if (t.name === 'message' && t.menu) { await g.tap('down'); await g.tap('down'); await g.tap('a'); } else await g.tap('a');
    }
    await settle();
  `);
  const bought = await run(`return { money: g.state.money, potion: g.state.bag.potion }`);
  expect(bought.money === money - 900, 'bought 3 Kräutertee', { money, bought });

  // --- Halle 1: Urs, Vreni, Jost; a lost battle means Heilstation and back ------------------------------------
  const atHall = await party();
  await run(`await walk('RRRR DDDDD LLLLLLL UU U'); await g.advance(20); await snap('21-hall');`);
  expectPos(await run('return pos()'), { map: 'kiesel_hall', x: 5, y: 12 }, 'Halle door');
  await run(`
    shotWhen('22-jost-battle', (t) => t.name === 'battle' && t.setup.trainer?.id === 'leader_jost' && t.bottom.kind === 'command');
    shotWhen('23-badge', (t) => t.name === 'message' && /erhält das Felsabzeichen/.test(topText()));
    /** Walks the path tile by tile; false if a lost battle sent the player to the Heilstation. */
    const hallWalk = async (path) => {
      for (const c of path.replace(/ /g, '')) { if (pos().map !== 'kiesel_hall') return false; await walk(c); }
      return pos().map === 'kiesel_hall';
    };
    for (let attempt = 0; attempt < 6 && !g.state.badges.includes('badge_earth'); attempt++) {
      if (pos().map === 'kiesel_center') await walk('DDDDD RRRRRRR UUUUUU U'); // after a blackout
      await fieldHeal();
      if (!(await hallWalk('UU LLLL UU RRRRRRRR U'))) { S.lost.push('hall1_urs'); continue; } // Urs guards the right gap
      await fieldHeal();
      if (!(await hallWalk('UU LLLLLLLL U'))) { S.lost.push('hall1_vreni'); continue; } // Vreni guards the left gap
      await fieldHeal();
      await walk('UU RRRR'); await face('up'); await talk();
      if (!g.state.badges.includes('badge_earth')) S.lost.push('leader_jost');
    }
  `);
  const hall = await run(`return { badges: g.state.badges, sp: g.state.bag.super_potion, party: g.state.party.map((c) => [c.species, c.level]), pos: pos() }`);
  expect(hall.badges.includes('badge_earth') && hall.sp === 2, 'Felsabzeichen + 2 Arnikabalsam', hall);
  expect(await said('/erhält das Felsabzeichen/'), 'badge message');
  expectPos(hall.pos, { map: 'kiesel_hall', x: 5, y: 2 }, 'in front of Jost');

  // --- closing beat outside the Halle → east gate → Pfad 2 → save (start menu) → reload → WEITER ----------------
  await run(`await walk('LLLL DDD RRRRRRRR DDD LLLLLLLL DD RRRR DD');`);
  await run(`
    g.down('down'); for (let k = 0; k < 120 && ow().map.id !== 'kieselstadt'; k++) await g.advance(1); g.up('down');
    const free = () => g.top() === 'overworld' && !ow().busy && !ow().player.moving;
    for (let k = 0; k < 3000 && !free(); k++) {
      if (g.top() === 'message') {
        record();
        await g.advance(2);
        if (!S.endShot && /^Arven:/.test(topText())) { S.endShot = true; await snap('24-ending'); }
        await g.tap('a');
      } else await g.advance(1);
    }
    await settle();
  `);
  const ending = await run(`return { stack: g.stack(), flags: g.state.flags, rival: !!ow().findNpc('rival'), arven: !!ow().findNpc('arven') }`);
  expect(ending.stack.join() === 'overworld' && ending.flags.chapter1_cleared && !ending.rival && !ending.arven, 'closing beat, no credits', ending);
  expect((await said('/Seewil hat auch eine Halle/')) && (await said('/mein Kollege Matti/')), 'the closing beat points east');
  await run(`await walk('DDDD RRRRRRRRRR'); await face('up'); await talk();`);
  expect(await said('/Gute Reise! Pfad 2 führt zum Flüsterwald/'), 'the east guard lets the player through');
  await run(`await walk('RRR'); await g.advance(30); await snap('25-pfad2');`);
  expectPos(await run('return pos()'), { map: 'pfad_2', x: 0, y: 8 }, 'east to Pfad 2');
  await run(`
    await startMenu('save');
    for (let k = 0; k < 40 && g.top() !== 'overworld'; k++) { if (g.top() === 'message') { record(); await g.tap('a'); } else await g.advance(2); }
    await settle();
  `);
  const save = await run(`return JSON.parse(localStorage.getItem('wildlinge-save-test') || 'null')`);
  expect(save && save.player.mapId === 'pfad_2' && save.flags.chapter1_cleared, 'saved on Pfad 2 via the start menu', save && save.player);
  const stats = await run(`return { wild: S.wild, potions: S.potions, lost: S.lost, rests: S.rests, log: S.log }`);
  mkdirSync('out/e2e', { recursive: true });
  writeFileSync(`out/e2e/50-chapter1-${STARTER}.log`, stats.log.join('\n'));

  // the player quits and comes back: title → WEITER resumes on Pfad 2
  await h.page.reload();
  await h.page.waitForFunction(() => !!window.__game);
  await h.run(`await g.advance(160); await g.tap('start'); await g.advance(4); await g.tap('a'); await g.waitFor('overworld', 300); await g.advance(60);`);
  if (tour) await h.shot('out/shots/ch1/26-resumed.png');
  const resumed = await h.run(`return { stack: g.stack(), pos: g.state.player, badges: g.state.badges }`);
  expect(JSON.stringify(resumed.stack) === '["overworld"]' && resumed.badges.includes('badge_earth'), 'WEITER loads the save', resumed);
  expectPos({ map: resumed.pos.mapId, x: resumed.pos.x, y: resumed.pos.y }, { map: 'pfad_2', x: 0, y: 8 }, 'resumes on Pfad 2');

  console.log(
    `    ${STARTER}: rival 1 ${rivalWon ? 'won' : 'lost'} · ${stats.wild} wild battles · caught ${caught.party[1][0]} · ` +
      `after Pfad 1 ${JSON.stringify(route)} · at the Halle ${JSON.stringify(atHall)} · after Jost ${JSON.stringify(hall.party)} · ` +
      `Kräutertee used ${stats.potions} · rests ${stats.rests} · lost ${JSON.stringify(stats.lost)}`,
  );
}
