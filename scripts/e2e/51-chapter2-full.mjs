/**
 * Chapter 2 in one continuous run, played like a normal player at natural levels (no level boosts, no repel):
 * from the state after chapter 1 (as 50-chapter1-full.mjs leaves it: Felsabzeichen, the starter at Lv 14 and the
 * Pfad-1 Chäferli, saved on Pfad 2) → Pfad 2 (Nico, Kurt, Rosa, Ida, wild battles) → Flüsterwald (rival 2, a catch,
 * Jana, Ferdi, Knut, Otto, Grete's blockade, the ranger's gift) → Seewil (Heilstation, Matti's gift, Laden) →
 * Halle 2 (Sina, Ruben, Alois, Undine) → the closing beat (no credits: {RIVAL} points north) → Pfad 3.
 *
 * Real walking, talking and battles (scripts/lib/playthrough.mjs, the balance sim's sensible player). Warps only
 * stand in for long walks: back to rest at the Heilstation, back to the ranger and to a fight after a blackout.
 * Plays all three starters (fresh page each); env CH2_STARTER = sproessli | zuendli | biberli plays one.
 * CH2_SHOTS=1 writes the screenshot tour of the first run to out/shots/ch2/ (incl. the intro with Arven).
 * The message log of each run goes to out/e2e/51-chapter2-<starter>.log.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { HELPERS, PT } from '../lib/playthrough.mjs';

export const name = 'chapter 2: Pfad 2 (4 trainers, wild) → Flüsterwald (rival 2, catch, trainers, Grete) → Seewil (heal, Matti, shop) → Halle 2 → closing beat → Pfad 3';

const STARTERS = process.env.CH2_STARTER ? [process.env.CH2_STARTER] : ['sproessli', 'zuendli', 'biberli'];
const TOUR = process.env.CH2_SHOTS === '1';
const RIVAL = { sproessli: 'zuendli', zuendli: 'biberli', biberli: 'sproessli' };
const LEFTOVER = { sproessli: 'biberli', zuendli: 'sproessli', biberli: 'zuendli' };

const expect = (cond, what, data) => {
  if (!cond) throw new Error(`${what}${data === undefined ? '' : `: ${JSON.stringify(data)}`}`);
};
const expectPos = (actual, want, what) => {
  for (const [k, v] of Object.entries(want)) expect(actual[k] === v, `${what}: expected ${JSON.stringify(want)}`, actual);
};

export async function run(h) {
  for (const [i, starter] of STARTERS.entries()) {
    const tour = TOUR && i === 0;
    if (i > 0) {
      await h.page.evaluate(() => localStorage.clear());
      await h.page.reload();
      await h.page.waitForFunction(() => !!window.__game);
    }
    if (tour) {
      mkdirSync('out/shots/ch2', { recursive: true });
      await h.page.exposeFunction('ptShot', (file) => h.page.locator('canvas').screenshot({ path: `out/shots/ch2/${file}.png` }).then(() => true));
    }
    try {
      await play(h, starter, tour);
    } finally {
      const log = await h.run('return window.pt_state ? window.pt_state.log : []').catch(() => []);
      mkdirSync('out/e2e', { recursive: true });
      writeFileSync(`out/e2e/51-chapter2-${starter}.log`, log.join('\n'));
    }
    const errors = await h.allErrors();
    if (errors.length) throw new Error(`${starter}: runtime errors:\n${errors.join('\n')}`);
  }
}

async function play(h, STARTER, tour) {
  const RIV = RIVAL[STARTER];
  if (tour) {
    // the intro with Arven (title → NEUES SPIEL), then a fresh page for the chapter
    await h.run(`
      await g.advance(200); await g.tap('start'); await g.advance(4); await g.tap('a');
      const text = () => (g.top() === 'message' ? g.game.stack.at(-1).box.pages.flat().join(' ') : '');
      for (let i = 0; i < 400 && !/Professorin Arven/.test(text()); i++) { if (g.top() === 'message') await g.tap('a'); else await g.advance(2); }
      await g.advance(6); g.game.render(); await window.ptShot('01-intro-arven');
    `);
    await h.page.reload();
    await h.page.waitForFunction(() => !!window.__game);
  }
  await h.run(HELPERS);
  if (!tour) await h.run('window.ptShot = null;');
  const run = (code) => h.run(`${PT} ${code}`);
  const said = (re) => h.run(`return window.pt_state.log.some((t) => ${re}.test(t))`);
  const party = () => run(`return g.state.party.map((c) => [c.species, c.level])`);
  const flag = (f) => run(`return g.state.flags[${JSON.stringify(f)}] === true`);

  // --- the state after chapter 1, saved on Pfad 2 -------------------------------------------------------------
  await run(`
    g.newGame({ starter: '${STARTER}', level: 14, name: 'Mia' });
    g.give('chaeferli', 4);
    const s = g.state;
    s.rivalName = 'Finn';
    for (const f of ['got_starter', 'rival1_done', 'lab_greeted', 'gift_mom_potions', 'gift_kiesel_crystals', 'chapter1_cleared',
      'trainer:rival1_${RIV}', 'trainer:pfad1_beni', 'trainer:pfad1_lea', 'trainer:pfad1_sepp', 'trainer:hall1_urs',
      'trainer:hall1_vreni', 'trainer:leader_jost', 'item:pfad_1:potion']) g.flag(f);
    s.badges.push('badge_earth');
    g.item('potion', 2); g.item('super_potion', 2); g.item('crystal', 6);
    s.money = 4200;
    for (const id of ['${STARTER}', 'chaeferli', 'zwitschli', 'munggli', 'schneggli', 'wuehli', 'steimandli', '${RIV}']) if (!s.dexSeen.includes(id)) s.dexSeen.push(id);
    s.lastHeal = { mapId: 'kiesel_center', x: 5, y: 3, facing: 'up' };
    g.warp('pfad_2', 0, 8, 'right');
    await g.advance(30); await settle(); await snap('02-pfad2');
  `);
  // walkHere / retry (scripts/lib/playthrough.mjs): a lost fight means the Heilstation, then back (warped) and again
  const R = `${PT} const beaten = (id) => g.state.flags['trainer:' + id] === true;`;
  const step = (code) => h.run(`${R} ${code}`);

  // --- Pfad 2: Nico, wild battles in the south-west grass, Kurt, Rosa, Ida ----------------------------------------
  await step(`await retry('pfad2_nico', ['pfad_2', 0, 8, 'right'], () => walkHere('DD RRRRRRRR'), () => beaten('pfad2_nico'));`);
  await step(`
    await goto(8, 10); await fieldHeal(); await goto(8, 13);
    shotWhen('03-pfad2-wild', (t) => t.name === 'battle' && t.setup.kind === 'wild' && t.bottom.kind === 'command');
    await grass(2, 'L', 'R'); await fieldHeal(); await grass(2, 'L', 'R');
    await goto(8, 10);
  `);
  await step(`await retry('pfad2_kurt', ['pfad_2', 8, 10, 'right'], () => walkHere('RRRRRRRRR'), () => beaten('pfad2_kurt'));`);
  await step(`await retry('pfad2_rosa', ['pfad_2', 17, 10, 'right'], () => walkHere('RRRRRR'), () => beaten('pfad2_rosa'));`);
  await step(`await retry('pfad2_ida', ['pfad_2', 23, 10, 'right'], () => walkHere('${'R'.repeat(16)}'), () => beaten('pfad2_ida'));`);
  for (const t of ['pfad2_nico', 'pfad2_kurt', 'pfad2_rosa', 'pfad2_ida']) expect(await flag(`trainer:${t}`), `${t} beaten`, await party());
  const afterPfad2 = await party();
  await step(`await fieldHeal(); await walk('R'); await g.advance(30); await snap('04-fluesterwald');`);
  expectPos(await run('return pos()'), { map: 'fluesterwald', x: 0, y: 22 }, 'Flüsterwald entrance');

  // --- Flüsterwald: rival 2 at the entrance ------------------------------------------------------------------
  await step(`
    shotWhen('05-rival2-battle', (t) => t.name === 'battle' && t.setup.trainer?.id?.startsWith('rival2') && t.bottom.kind === 'command');
    await retry('rival2', ['fluesterwald', 0, 22, 'right'], () => walkHere('RR'), () => g.state.flags.rival2_done === true);
  `);
  expect((await flag('rival2_done')) && (await flag(`trainer:rival2_${RIV}`)), `rival 2 (${RIV} variant) beaten`, await party());
  expect(await said('/Der deckt genau meine Schwäche ab/'), 'rival 2 intro');
  const atRival = await run(`return { lost: S.lost.filter((x) => x === 'rival2').length }`);

  // a catch in the south-west grass, a few more wild battles
  await step(`
    await fieldHeal(); await goto(6, 24);
    S.wantCatch = true;
    shotWhen('06-catch', (t) => t.name === 'battle' && t.bottom.kind === 'message' && t.box.lastPageShown && /gefangen/.test(topText()));
    for (let i = 0; i < 10 && g.state.party.length < 3; i++) await grass(1, 'R', 'L');
    S.wantCatch = false;
    await fieldHeal(); await grass(2, 'R', 'L'); await fieldHeal(); await grass(2, 'R', 'L');
  `);
  const caught = await party();
  expect(caught.length === 3, 'caught a wild creature in the Flüsterwald', caught);

  // Jana (watches x 9..12 on row 18), Ferdi (row 13 east of him), Knut (x 16 south of him), Otto (row 9 west of him)
  await step(`await goto(11, 21); await retry('wald_jana', ['fluesterwald', 11, 21, 'up'], () => walkHere('UUU'), () => beaten('wald_jana'));`);
  await step(`await goto(11, 14); await retry('wald_ferdi', ['fluesterwald', 11, 14, 'up'], () => walkHere('L U'), () => beaten('wald_ferdi'));`);
  await step(`
    shotWhen('07-frostmantel-knut', (t) => t.name === 'message' && /Der Frostmantel hat zu tun/.test(topText()));
    await goto(12, 14); await retry('grunt_wald_1', ['fluesterwald', 12, 14, 'right'], () => walkHere('RRRRR'), () => beaten('grunt_wald_1'));
  `);
  await step(`await goto(21, 13); await retry('wald_otto', ['fluesterwald', 21, 13, 'up'], () => walkHere('UUUU'), () => beaten('wald_otto'));`);
  for (const t of ['wald_jana', 'wald_ferdi', 'grunt_wald_1', 'wald_otto']) expect(await flag(`trainer:${t}`), `${t} beaten`, await party());

  // Grete's blockade at the gap in front of the frosted clearing
  await step(`
    await goto(16, 7); await g.advance(10); await snap('08-frost-clearing');
    shotWhen('09-grete', (t) => t.name === 'message' && /Frostkern/.test(topText()));
    await retry('grunt_wald_2', ['fluesterwald', 15, 7, 'up'], async () => { await goto(15, 6); await walkHere('U'); }, () => g.state.flags.forest_cleared === true);
  `);
  expect((await flag('forest_cleared')) && (await said('/Alpenglut löschen/')), 'Grete beaten, the plan revealed');
  // the ranger's thanks (long walk back → warp), then north through the gap
  await step(`g.warp('fluesterwald', 5, 20, 'up'); await settle(); await talk();`);
  expect(await run(`return g.state.flags.gift_ranger_potions === true`), "ranger's gift");
  await step(`g.warp('fluesterwald', 15, 5, 'up'); await settle(); await fieldHeal(); await walk('UUUUU'); await walk('U'); await g.advance(30); await snap('10-seewil');`);
  expectPos(await run('return pos()'), { map: 'seewil', x: 13, y: 21 }, 'Seewil');
  const atSeewil = await party();

  // --- Seewil: Heilstation, Matti's gift, Laden -----------------------------------------------------------------
  await step(`
    await goto(3, 5); await walk('U'); await walk('UUUU');
    shotWhen('11-heilstation', (t) => t.name === 'message');
    await talk(); await walk('DDDDD');
  `);
  expect(await run(`return g.state.lastHeal.mapId === 'seewil_center' && g.state.party.every((c) => c.hp === maxHp(c))`), 'nurse heals in Seewil');
  await step(`await goto(3, 12); await walk('U'); await walk('UU RR'); await face('right'); await talk(); await goto(4, 6); await walk('D');`);
  const matti = await run(`return g.state.party.map((c) => [c.species, c.level, c.metAt])`);
  expect(matti.some(([sp, lv, met]) => sp === LEFTOVER[STARTER] && lv === 15 && met === 'Seewil'), `Matti gives ${LEFTOVER[STARTER]} Lv 15`, matti);
  const shop = await step(`
    await goto(8, 5); await walk('U'); await walk('UUUU LLLL'); await face('up');
    const money = g.state.money;
    await g.tap('a');
    for (let k = 0; k < 20 && !(top().name === 'message' && top().menu); k++) { if (g.top() === 'message') await g.tap('a'); else await g.advance(2); }
    await g.tap('a'); // KAUFEN
    if (g.top() !== 'shop-buy') throw new Error('no buy list: ' + g.stack());
    const list = top();
    const buy = async (id, n) => {
      const idx = list.items.findIndex((it) => it.id === id);
      for (let k = 0; k < 12 && list.cursor.index !== idx; k++) await g.tap(list.cursor.index < idx ? 'down' : 'up');
      await g.tap('a');
      for (let k = 1; k < n; k++) await g.tap('up');
      await snap('12-shop');
      await g.tap('a'); await g.tap('a'); // confirm, Ja
      for (let k = 0; k < 10 && g.top() === 'message'; k++) await g.tap('a');
    };
    const sp = Math.min(3, Math.floor((g.state.money - 600) / 700));
    if (sp > 0) await buy('super_potion', sp);
    await g.tap('b'); // leave the list
    for (let k = 0; k < 10 && g.top() !== 'overworld'; k++) {
      const t = top();
      if (t.name === 'message' && t.menu) { await g.tap('down'); await g.tap('down'); await g.tap('a'); } else await g.tap('a');
    }
    await settle();
    await goto(5, 7); await walk('D');
    return { money, after: g.state.money, sp: g.state.bag.super_potion ?? 0, bought: sp };
  `);
  expect(shop.bought > 0 && shop.after === shop.money - shop.bought * 700, 'bought Arnikabalsam in Seewil', shop);

  // --- Halle 2: Sina, Ruben, Alois along the canals, then Undine; a loss means Heilstation and back --------------------
  const atHall = await party();
  await step(`
    await goto(22, 6); await walk('U'); await g.advance(20); await snap('13-halle2');
    shotWhen('14-undine-battle', (t) => t.name === 'battle' && t.setup.trainer?.id === 'leader_undine' && t.bottom.kind === 'command');
    shotWhen('15-badge', (t) => t.name === 'message' && /erhält das Wellenabzeichen/.test(topText()));
    const inHall = () => pos().map === 'seewil_hall';
    for (let attempt = 0; attempt < 8 && !g.state.badges.includes('badge_water'); attempt++) {
      if (!inHall()) { await goto(5, 7); await walk('D'); await goto(22, 6); await walk('U'); } // after a blackout
      await fieldHeal(); if (!inHall()) continue;
      if (!beaten('hall2_sina')) { await goto(6, 13); if (!(await walkHere('LLLL UU RRRRRR')) || !inHall()) { S.lost.push('hall2_sina'); continue; } }
      await fieldHeal(); if (!inHall()) continue;
      if (!beaten('hall2_ruben')) { await goto(8, 11); if (!(await walkHere('UUUU LLLLL')) || !inHall()) { S.lost.push('hall2_ruben'); continue; } }
      await fieldHeal(); if (!inHall()) continue;
      if (!beaten('hall2_alois')) { await goto(3, 7); if (!(await walkHere('UUUU')) || !inHall()) { S.lost.push('hall2_alois'); continue; } }
      await fieldHeal(); if (!inHall()) continue;
      await goto(6, 2); await face('up'); await talk();
      if (!g.state.badges.includes('badge_water')) S.lost.push('leader_undine');
    }
  `);
  const hall = await run(`return { badges: g.state.badges, revive: g.state.bag.revive, party: g.state.party.map((c) => [c.species, c.level]), pos: pos(), lost: S.lost }`);
  expect(hall.badges.includes('badge_water') && hall.revive === 2, 'Wellenabzeichen + 2 Lebensfunken', hall);
  for (const t of ['hall2_sina', 'hall2_ruben', 'hall2_alois', 'leader_undine']) expect(await flag(`trainer:${t}`), `${t} beaten`, hall);
  expect(await said('/nach Norden zur Glimmerhöhle/'), "Undine's after-text");

  // --- out of the Halle: the closing beat ({RIVAL} points north, no credits), then on to Pfad 3 ------------------------
  const end = await step(`
    await goto(6, 14);
    g.down('down'); for (let k = 0; k < 120 && ow().map.id !== 'seewil'; k++) await g.advance(1); g.up('down');
    for (let k = 0; k < 4000 && (g.top() !== 'overworld' || ow().busy); k++) {
      if (g.top() === 'message') {
        record();
        if (!S.endShot && /Alpenglühen/.test(topText())) { S.endShot = true; await g.advance(4); await snap('16-ending'); }
        if (!S.northShot && /dritten Halle/.test(topText())) { S.northShot = true; await g.advance(4); await snap('17-north'); }
        await g.tap('a');
      } else await g.advance(1);
    }
    await settle();
    return { stack: g.stack(), chapter2: g.state.flags.chapter2_cleared === true, rival: !!ow().findNpc('rival') };
  `);
  expect(end.stack.join() === 'overworld' && end.chapter2 && !end.rival, 'closing beat ends in the overworld, rival gone', end);
  expect((await said('/Abgemacht/')) && (await said('/dritten Halle/')), 'closing beat, the rival points north');
  expect(!(await said('/Ende von Kapitel 2/')), 'no chapter-2 credits any more');
  await step(`await goto(13, 1); await walk('U'); await walk('U'); await g.advance(30); await snap('18-pfad3');`);
  expectPos(await run('return pos()'), { map: 'pfad_3', x: 10, y: 43 }, 'north to Pfad 3');

  const stats = await run(`return { wild: S.wild, potions: S.potions, lost: S.lost, rests: S.rests, bag: g.state.bag, money: g.state.money, moves: g.state.party.map((c) => c.moves.map((m) => m.id).join('/')) }`);
  console.log(
    `    ${STARTER}: after Pfad 2 ${JSON.stringify(afterPfad2)} · rival 2 ${atRival.lost ? `lost ${atRival.lost}× first` : 'won'} · caught ${caught[2][0]} · ` +
      `at Seewil ${JSON.stringify(atSeewil)} · at the Halle ${JSON.stringify(atHall)} · after Undine ${JSON.stringify(hall.party)} · ` +
      `${stats.wild} wild battles · heal items ${stats.potions} · rests ${stats.rests} · lost ${JSON.stringify(stats.lost)} · ` +
      `end: ${stats.money} Fr., bag ${JSON.stringify(stats.bag)}, moves ${stats.moves.join(' | ')}`,
  );
}
