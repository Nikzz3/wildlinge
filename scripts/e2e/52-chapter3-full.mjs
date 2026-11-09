/**
 * Chapter 3 in one continuous run, played like a normal player at natural levels (no level boosts, no repel): from
 * the state after chapter 2 (as 51-chapter2-full.mjs leaves it: two badges, the starter at Lv 22, the Pfad-1 Chäferli,
 * the Flüsterwald catch and Matti's gift, standing outside Halle 2) → Seewil (Heilstation, Laden) → Pfad 3 (a catch,
 * wild battles, Beat, Heidi, Nora, Toni, Emil, an Arnikabalsam) → Glimmerhöhle 1 (a catch, Godi, the Lebensfunke,
 * Lars) → Glimmerhöhle 2 (Fredi, Petra's blockade) → Funkenstadt (Heilstation, the weakest member into the PC box,
 * Laden) → Funkenwerk (Udo, Rita, Egon; rested and restocked, Bise; the items) → Anton's Guggerli → Halle 3 (Jola, Max, Ben, Zita;
 * Heilstation and Laden before each) → the north gate → Pfad 4.
 *
 * The balance sim's normal player (scripts/lib/chapters.ts chapter3) on real buttons (scripts/lib/playthrough.mjs):
 * the starter leads, two wild battles before each route/cave trainer, one catch per new area. Warps only stand in
 * for long walks: back to rest at the Heilstation (or to the Laden), back to a fight after a blackout.
 * Plays all three starters (fresh page each); env CH3_STARTER = sproessli | zuendli | biberli plays one.
 * CH3_SHOTS=1 writes a screenshot tour of the first run to out/shots/ch34/3-*.png (with the other chapter's).
 * The message log of each run goes to out/e2e/52-chapter3-<starter>.log; the end state (party, bag, money) is
 * printed – 53-chapter4-full.mjs starts from it.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { HELPERS, PT } from '../lib/playthrough.mjs';

export const name =
  'chapter 3: Seewil → Pfad 3 (catch, 5 trainers) → Glimmerhöhle (catch, Godi, Lars, Fredi, Petra) → Funkenstadt (PC, Laden) → Funkenwerk (Bise) → Guggerli → Halle 3 (Zita) → Pfad 4';

const STARTERS = process.env.CH3_STARTER ? [process.env.CH3_STARTER] : ['sproessli', 'zuendli', 'biberli'];
const TOUR = process.env.CH3_SHOTS === '1';
const RIVAL = { sproessli: 'zuendli', zuendli: 'biberli', biberli: 'sproessli' };

/** The team, bag and money at the end of 51-chapter2-full.mjs (same seed, same choices). */
const CH2_END = {
  sproessli: {
    party: [
      ['moosdachs', 22, 'stupser/mohnduft/zweigschlag/distelhieb'],
      ['chaeferli', 4, 'stupser/brummbass/gifttropfen'],
      ['chaeferli', 11, 'brummbass/gifttropfen/zweigschlag/faulhauch'],
      ['biberli', 12, 'stupser/brummbass/spritzer/kellenschlag'],
    ],
    bag: { crystal: 4, super_potion: 1, revive: 2 },
    money: 3995,
  },
  zuendli: {
    party: [
      ['glutbock', 22, 'fackelzug/brandmal/jodelschall/zuckfunke'],
      ['chaeferli', 4, 'stupser/brummbass/gifttropfen'],
      ['tuepfli', 12, 'gifttropfen/brummbass/spritzer/nesselstich'],
      ['sproessli', 12, 'stupser/brummbass/zweigschlag/saftzapfen'],
    ],
    bag: { crystal: 2, revive: 2 },
    money: 6190,
  },
  biberli: {
    party: [
      ['bachbiber', 22, 'geroellwalze/tropfenregen/gischthieb/kellenschlag'],
      ['chaeferli', 4, 'stupser/brummbass/gifttropfen'],
      ['farnli', 10, 'saftzapfen/frechgrinsen/zweigschlag/mohnduft'],
      ['zuendli', 13, 'flaemmchen/brandmal/jodelschall/zuckfunke'],
    ],
    bag: { crystal: 3, revive: 2 },
    money: 6190,
  },
};

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
      mkdirSync('out/shots/ch34', { recursive: true });
      await h.page.exposeFunction('ptShot', (file) => h.page.locator('canvas').screenshot({ path: `out/shots/ch34/3-${file}.png` }).then(() => true));
    }
    try {
      await play(h, starter, tour);
    } finally {
      const log = await h.run('return window.pt_state ? window.pt_state.log : []').catch(() => []);
      mkdirSync('out/e2e', { recursive: true });
      writeFileSync(`out/e2e/52-chapter3-${starter}.log`, log.join('\n'));
    }
    const errors = await h.allErrors();
    if (errors.length) throw new Error(`${starter}: runtime errors:\n${errors.join('\n')}`);
  }
}

async function play(h, STARTER, tour) {
  const RIV = RIVAL[STARTER];
  await h.run(HELPERS);
  if (!tour) await h.run('window.ptShot = null;');
  const R = `${PT} const beaten = (id) => g.state.flags['trainer:' + id] === true;`;
  const step = (code) => h.run(`${R} ${code}`);
  const said = (re) => h.run(`return window.pt_state.log.some((t) => ${re}.test(t))`);
  const party = () => step(`return g.state.party.map((c) => [c.species, c.level])`);
  const pos = () => step('return pos()');
  const flag = (f) => step(`return g.state.flags[${JSON.stringify(f)}] === true`);
  const expectBeaten = async (...ids) => {
    for (const id of ids) expect(await flag(`trainer:${id}`), `${id} beaten`, { pos: await pos(), party: await party() });
  };

  // --- the state after chapter 2, outside Halle 2 in Seewil -------------------------------------------------------
  const end = CH2_END[STARTER];
  await step(`
    g.newGame({ name: 'Mia' });
    const s = g.state;
    s.starter = '${STARTER}';
    s.rivalName = 'Finn';
    for (const [species, level, moves] of ${JSON.stringify(end.party)}) {
      g.give(species, level);
      const c = s.party[s.party.length - 1];
      c.moves = moves.split('/').map((id) => ({ id, pp: g.data.getMove(id).pp }));
      c.metAt = species === '${STARTER}' || c.uid === 1 ? 'Moosbach' : 'Seewil';
    }
    for (const f of ['got_starter', 'rival1_done', 'lab_greeted', 'gift_mom_potions', 'gift_kiesel_crystals', 'chapter1_cleared',
      'rival2_done', 'forest_cleared', 'gift_ranger_potions', 'gift_starter', 'chapter2_cleared',
      'trainer:rival1_${RIV}', 'trainer:rival2_${RIV}', 'trainer:leader_jost', 'trainer:leader_undine', 'trainer:grunt_wald_2']) g.flag(f);
    s.badges.push('badge_earth', 'badge_water');
    for (const [id, n] of Object.entries(${JSON.stringify(end.bag)})) g.item(id, n);
    s.money = ${end.money};
    for (const c of s.party) { if (!s.dexSeen.includes(c.species)) s.dexSeen.push(c.species); if (!s.dexCaught.includes(c.species)) s.dexCaught.push(c.species); }
    s.lastHeal = { mapId: 'seewil_center', x: 5, y: 3, facing: 'up' };
    g.warp('seewil', 22, 6, 'down');
    await g.advance(30); await settle();
  `);
  const atStart = await party();

  // --- Seewil: Heilstation, Laden (Arnikabalsam, Fangkristalle for the catches), north to Pfad 3 ---------------------
  await step(`
    await goto(3, 5); await walk('U'); await goto(5, 3); await face('up'); await talk(); await goto(5, 7); await walk('D');
    await goto(8, 5); await walk('U');
    S.bought = await shop([['super_potion', 4], ['crystal', 10]]);
    await walk('D');
    await goto(13, 1); await walk('U'); await walk('U'); await g.advance(30); await snap('01-pfad3');
  `);
  expectPos(await pos(), { map: 'pfad_3', x: 10, y: 43 }, 'north to Pfad 3');
  expect(await step(`return (g.state.bag.super_potion ?? 0) >= 4 && (g.state.bag.crystal ?? 0) >= 8`), 'bought in Seewil', await step('return g.state.bag'));

  // --- Pfad 3: a catch by the beach, then two wild battles before each trainer -------------------------------------------
  /**
   * Tries to catch the next wild creatures here while Fangkristalle last (thrown right away, as the sim's player);
   * a, b = the back-and-forth steps. \`required\`: fail without a catch.
   */
  const catchHere = (a, b, required = false) => `
    const size = g.state.party.length + g.state.box.length;
    const spot = pos();
    S.wantCatch = true;
    await grass(8, '${a}', '${b}', () => g.state.party.length + g.state.box.length > size || !g.state.bag.crystal);
    S.wantCatch = false;
    await goto(spot.x, spot.y);
    if (g.state.party.length + g.state.box.length > size) S.caught.push(g.state.party.at(-1).species);
    ${required ? "else throw new Error('no catch on ' + pos().map);" : ''}
  `;
  await step('S.caught = [];');
  await step(`
    await goto(14, 39);
    shotWhen('02-pfad3-catch', (t) => t.name === 'battle' && t.setup.kind === 'wild' && t.bottom.kind === 'command');
    ${catchHere('R', 'L', true)}
    await fieldHeal(); await grass(2, 'R', 'L');
  `);
  const caught1 = await party();
  expect(caught1.length === 5, 'caught a wild creature on Pfad 3', caught1);
  await step(`await goto(10, 37); await retry('pfad3_beat', ['pfad_3', 10, 37, 'up'], () => walkHere('U'), () => beaten('pfad3_beat'));`);
  await step(`
    await goto(4, 26); await fieldHeal(); await grass(2, 'L', 'R');
    await goto(10, 23); await retry('pfad3_heidi', ['pfad_3', 10, 23, 'up'], () => walkHere('UU'), () => beaten('pfad3_heidi'));
  `);
  await step(`
    await goto(12, 15); await fieldHeal(); await grass(2, 'L', 'R');
    await goto(6, 18); await retry('pfad3_nora', ['pfad_3', 6, 18, 'up'], () => walkHere('U'), () => beaten('pfad3_nora'));
  `);
  await step(`
    await goto(3, 9); await fieldHeal(); await grass(2, 'L', 'R');
    await goto(8, 9); await retry('pfad3_toni', ['pfad_3', 8, 9, 'right'], () => walkHere('R'), () => beaten('pfad3_toni'));
  `);
  await step(`
    await goto(4, 5); await fieldHeal(); await grass(2, 'L', 'R');
    shotWhen('03-pfad3-trainer', (t) => t.name === 'battle' && t.setup.trainer?.id === 'pfad3_emil' && t.bottom.kind === 'command');
    await goto(10, 4); await retry('pfad3_emil', ['pfad_3', 10, 4, 'up'], () => walkHere('U'), () => beaten('pfad3_emil'));
    await pickUp(2, 3);
  `);
  await expectBeaten('pfad3_beat', 'pfad3_heidi', 'pfad3_nora', 'pfad3_toni', 'pfad3_emil');
  expect(await flag('item:pfad_3:super_potion'), 'picked up the Arnikabalsam');
  const afterPfad3 = await party();
  await step(`await fieldHeal(); await goto(10, 2); await walk('U'); await g.advance(30); await snap('04-cave1');`);
  expectPos(await pos(), { map: 'glimmerhoehle_1', x: 6, y: 22 }, 'cave mouth → Glimmerhöhle 1');

  // --- Glimmerhöhle 1: a catch at the entrance, Godi, the Lebensfunke in the east, Lars in the upper gallery ---------------
  await step(`
    await goto(6, 21); ${catchHere('L', 'R')}
    await fieldHeal(); await grass(2, 'L', 'R');
    await goto(15, 20); await retry('hoehle_godi', ['glimmerhoehle_1', 15, 20, 'right'], () => walkHere('R'), () => beaten('hoehle_godi'));
    await pickUp(25, 10);
    await goto(20, 10); await fieldHeal(); await grass(2, 'L', 'R');
    shotWhen('05-grunt-lars', (t) => t.name === 'battle' && t.setup.trainer?.id === 'grunt_hoehle_1' && t.bottom.kind === 'command');
    await goto(13, 4); await retry('grunt_hoehle_1', ['glimmerhoehle_1', 13, 4, 'right'], () => walkHere('R'), () => beaten('grunt_hoehle_1'));
  `);
  await expectBeaten('hoehle_godi', 'grunt_hoehle_1');
  expect(await flag('item:glimmerhoehle_1:revive'), 'Lebensfunke picked up in the cave');
  await step(`await fieldHeal(); await goto(21, 2); await walk('U'); await g.advance(30);`);
  expectPos(await pos(), { map: 'glimmerhoehle_2', x: 4, y: 22 }, 'passage → Glimmerhöhle 2');

  // --- Glimmerhöhle 2: Fredi at the tunnel, Petra's blockade before the exit -----------------------------------------------
  await step(`
    await goto(4, 18); await fieldHeal(); await grass(2, 'U', 'D');
    await goto(14, 9); await retry('hoehle_fredi', ['glimmerhoehle_2', 14, 9, 'right'], () => walkHere('R'), () => beaten('hoehle_fredi'));
    await goto(16, 7); await fieldHeal(); await grass(2, 'L', 'R');
    shotWhen('06-petra', (t) => t.name === 'message' && /Glimmerquarz ist längst im/.test(topText()));
    await goto(17, 5); await retry('petra', ['glimmerhoehle_2', 17, 5, 'up'], () => walkHere('U'), () => g.state.flags.cave_cleared === true);
  `);
  await expectBeaten('hoehle_fredi', 'grunt_hoehle_2');
  expect((await flag('cave_cleared')) && (await said('/Frostkern zusammen/')), 'Petra beaten, the plan slips out');
  const afterCave = await party();
  await step(`await goto(17, 2); await walk('U'); await g.advance(30); await snap('07-funkenstadt');`);
  expectPos(await pos(), { map: 'funkenstadt', x: 4, y: 20 }, 'cave exit → Funkenstadt');

  // --- Funkenstadt: Heilstation (a full team makes room for Anton's gift: the weakest goes into the box), Laden ------------
  await step(`
    await goto(6, 16); await walk('U'); await goto(5, 3); await face('up'); await talk();
    if (g.state.party.length === 6) {
      const others = g.state.party.slice(1);
      const weakest = 1 + others.indexOf(others.reduce((a, c) => (c.level < a.level ? c : a)));
      S.boxed = g.state.party[weakest].species + ' ' + g.state.party[weakest].level;
      await deposit(weakest);
    }
    await goto(5, 7); await walk('D');
    await goto(11, 16); await walk('U');
    await shop([['super_potion', 4], ['hyper_potion', 2], ['revive', 1]], '08-laden');
    await walk('D');
  `);
  expect(await step(`return g.state.lastHeal.mapId === 'funken_center' && g.state.party.length === 5`), 'healed in Funkenstadt, room for the gift');

  // --- Funkenwerk: Udo, Rita, Egon along the aisle; rested, then Bise; the items -------------------------------------------
  await step(`await goto(22, 8); await walk('U'); await snap('09-werk');`);
  expectPos(await pos(), { map: 'funken_werk', x: 6, y: 8 }, 'into the Funkenwerk');
  await step(`
    await retry('grunt_werk_1', ['funken_werk', 6, 8, 'up'], () => walkHere('U'), () => beaten('grunt_werk_1'));
    await retry('grunt_werk_2', ['funken_werk', 6, 7, 'up'], () => walkHere('UUU'), () => beaten('grunt_werk_2'));
    await retry('grunt_werk_3', ['funken_werk', 6, 4, 'up'], () => walkHere('UU'), () => beaten('grunt_werk_3'));
    shotWhen('10-bise-battle', (t) => t.name === 'battle' && t.setup.trainer?.id === 'admin_bise_1' && t.bottom.kind === 'command');
    shotWhen('11-zita-freed', (t) => t.name === 'message' && /Ich warte in der Halle/.test(topText()));
    // rested and restocked before each try (the Heilstation and the Laden are next door)
    const restock = () => errand(['funken_shop', 5, 7, 'up'], () => shop([['super_potion', 4], ['hyper_potion', 2], ['revive', 1]]));
    await retry('bise1', ['funken_werk', 6, 2, 'up'], async () => { await rest(); await restock(); await face('up'); await talk(); }, () => g.state.flags.werk_cleared === true);
    await pickUp(1, 1); await pickUp(11, 7);
  `);
  await expectBeaten('grunt_werk_1', 'grunt_werk_2', 'grunt_werk_3', 'admin_bise_1');
  expect(await said('/Urkristall aus eurem Tresor/'), 'Bise escapes with the Urkristall');
  expect((await flag('item:funken_werk:hyper_potion')) && (await flag('item:funken_werk:revive')), 'Werk items');
  const afterWerk = await party();

  // --- Anton's Guggerli (after a rest), then Halle 3 with the Heilstation and the Laden before each battle --------------------
  await step(`
    await goto(6, 8); await walk('D'); await rest();
    await goto(21, 16); await walk('U'); await goto(6, 4); await face('right'); await talk(); await goto(4, 6); await walk('D');
  `);
  const gugg = await step(`return g.state.party.map((c) => [c.species, c.level, c.metAt])`);
  expect(gugg.some(([sp, lv, met]) => sp === 'guggerli' && lv === 24 && met === 'Funkenstadt'), 'Anton gives Guggerli Lv 24 (into the party)', gugg);
  await step(`
    window.pt.prepare = async () => {
      await rest();
      await errand(['funken_shop', 5, 7, 'up'], () => shop([['hyper_potion', 2], ['super_potion', 3]]));
    };
    await goto(5, 8); await walk('U'); await snap('12-halle3');
    g.warp('funken_hall', 6, 3, 'up'); await settle(); await snap('12b-zita'); g.warp('funken_hall', 6, 14, 'up'); await settle();
  `);
  expectPos(await pos(), { map: 'funken_hall', x: 6, y: 14 }, 'into Halle 3');
  const atHall = await party();
  await step(`
    const { prepare } = window.pt;
    await retry('hall3_jola', ['funken_hall', 6, 14, 'up'], async () => { await prepare(); await walkHere('UU RR UU U'); }, () => beaten('hall3_jola'));
    await retry('hall3_max', ['funken_hall', 8, 9, 'up'], async () => { await prepare(); await walkHere('U LLLLL UU'); }, () => beaten('hall3_max'));
    await retry('hall3_ben', ['funken_hall', 3, 6, 'up'], async () => { await prepare(); await walkHere('U RRRRR UU'); }, () => beaten('hall3_ben'));
    shotWhen('13-zita-battle', (t) => t.name === 'battle' && t.setup.trainer?.id === 'leader_zita' && t.bottom.kind === 'command');
    shotWhen('14-badge', (t) => t.name === 'message' && /erhält das Funkenabzeichen/.test(topText()));
    await retry('leader_zita', ['funken_hall', 8, 3, 'up'], async () => { await prepare(); await walkHere('U LL'); await face('up'); await talk(); },
      () => g.state.badges.includes('badge_spark'));
  `);
  await expectBeaten('hall3_jola', 'hall3_max', 'hall3_ben', 'leader_zita');
  const hall = await step(`return { ether: g.state.bag.ether, party: g.state.party.map((c) => [c.species, c.level]) }`);
  expect(hall.ether === 2 && (await said('/Bise ist mit dem Urkristall in die Berge/')), 'Funkenabzeichen + 2 Kraftbrühen, Zita warns about Bise', hall);

  // --- the north gate opens: Pfad 4 --------------------------------------------------------------------------------------
  await step(`await goto(6, 14); await walk('D'); await goto(14, 0); await walk('U'); await g.advance(30); await snap('15-pfad4');`);
  expectPos(await pos(), { map: 'pfad_4', x: 10, y: 47 }, 'north to Pfad 4');

  const stats = await step(`return {
    wild: S.wild, potions: S.potions, revives: S.revives ?? 0, lost: S.lost, rests: S.rests, boxed: S.boxed ?? '-', caught: S.caught, bag: g.state.bag, money: g.state.money,
    team: g.state.party.map((c) => c.species + ' ' + c.level + ' ' + c.moves.map((m) => m.id).join('/')),
  }`);
  console.log(
    `    ${STARTER}: start ${JSON.stringify(atStart)} · after Pfad 3 ${JSON.stringify(afterPfad3)} · after the cave ${JSON.stringify(afterCave)} · ` +
      `after the Werk ${JSON.stringify(afterWerk)} · at the Halle ${JSON.stringify(atHall)} · after Zita ${JSON.stringify(hall.party)} · ` +
      `caught ${stats.caught.join(', ')} · boxed ${stats.boxed} · ${stats.wild} wild battles · heal items ${stats.potions} · Lebensfunken ${stats.revives} · rests ${stats.rests} · ` +
      `lost ${JSON.stringify(stats.lost)} · end: ${stats.money} Fr., bag ${JSON.stringify(stats.bag)}, team ${stats.team.join(' | ')}`,
  );
}
