/**
 * Chapter 4 and the ending in one continuous run, played like a normal player at natural levels (no level boosts, no
 * repel): from the state after chapter 3 (as 52-chapter3-full.mjs leaves it: three badges, the starter at Lv 30, Guggerli,
 * standing below the Funkenstadt north gate) → Funkenstadt (Heilstation, a full team makes room in the PC box, Laden)
 * → Pfad 4 (a catch, Luca, Rolf, Resi, Hans, the items) → Frostalp (rival 3 at the entrance, Heilstation, Arven's
 * Gipfelkristalle, the legend, a catch in the snow grass) → Halle 4 (Anouk, Walter, Svea, Firna; Heilstation and Laden
 * before each) → stocking up for the summit → Gipfelpfad (a catch, Holger, Carla, the rescuer's tea, Wilma, Rico, Sven,
 * the items; rested and restocked, Bise's blockade; the climber) → Gipfelhorn (rested: Eisner, the flame heals, the
 * final rival battle) → Lindglut → credits → title → WEITER (Gasthaus, hot chocolate).
 *
 * The balance sim's normal player (scripts/lib/chapters.ts chapter4) on real buttons (scripts/lib/playthrough.mjs):
 * the starter leads, two wild battles before each route trainer, one catch per new area while Fangkristalle last.
 * Lindglut: Sprössli and Biberli throw the Urkristall, Zündli fights it to the end (both endings save and roll the
 * credits). Warps only stand in for long walks: back to rest or to the Laden, back to a fight after a blackout.
 * Plays all three starters (fresh page each); env CH4_STARTER = sproessli | zuendli | biberli plays one.
 * CH4_SHOTS=1 writes a screenshot tour of the first run to out/shots/ch34/4-*.png (with the other chapter's).
 * The message log of each run goes to out/e2e/53-chapter4-<starter>.log.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { HELPERS, PT } from '../lib/playthrough.mjs';

export const name =
  'chapter 4: Pfad 4 (catch, 4 trainers) → Frostalp (rival 3, Arven, catch) → Halle 4 (Firna) → Gipfelpfad (catch, 5 trainers, Bise) → Gipfelhorn (Eisner, rival 4) → Lindglut → credits → WEITER';

const STARTERS = process.env.CH4_STARTER ? [process.env.CH4_STARTER] : ['sproessli', 'zuendli', 'biberli'];
const TOUR = process.env.CH4_SHOTS === '1';
const RIVAL = { sproessli: 'zuendli', zuendli: 'biberli', biberli: 'sproessli' };
/** What the player does with Lindglut. */
const LINDGLUT = { sproessli: 'catch', zuendli: 'fight', biberli: 'catch' };

/** The team, box, bag and money at the end of 52-chapter3-full.mjs (same seed, same choices). */
const CH3_END = {
  sproessli: {
    party: [
      ['moosdachs', 30, 'geroellwalze/mohnduft/enzianregen/distelhieb'],
      ['chaeferli', 4, 'stupser/brummbass/gifttropfen'],
      ['chaeferli', 11, 'brummbass/gifttropfen/zweigschlag/faulhauch'],
      ['biberli', 12, 'stupser/brummbass/spritzer/kellenschlag'],
      ['dohlerich', 20, 'bergbrise/flitzstoss/federhieb/federsalve'],
      ['guggerli', 20, 'bergbrise/flitzstoss/jodelschall/stahlschnitt'],
    ],
    box: [],
    bag: { revive: 2, ether: 2 },
    money: 5188,
  },
  zuendli: {
    party: [
      ['glutbock', 30, 'kohlenhieb/brandmal/jodelschall/zuckfunke'],
      ['tuepfli', 12, 'gifttropfen/brummbass/spritzer/nesselstich'],
      ['sproessli', 12, 'stupser/brummbass/zweigschlag/saftzapfen'],
      ['zwitschli', 19, 'bergbrise/flitzstoss/federhieb/federsalve'],
      ['stachli', 24, 'nietensalve/blechpanzer/stahlschnitt/quietschen'],
      ['guggerli', 20, 'bergbrise/flitzstoss/jodelschall/stahlschnitt'],
    ],
    box: [['chaeferli', 4, 'stupser/brummbass/gifttropfen']],
    bag: { crystal: 5, super_potion: 2, hyper_potion: 3, revive: 1, ether: 2 },
    money: 10208,
  },
  biberli: {
    party: [
      ['bachbiber', 30, 'geroellwalze/wildbach/gischthieb/stahlschnitt'],
      ['farnli', 10, 'saftzapfen/frechgrinsen/zweigschlag/mohnduft'],
      ['zuendli', 14, 'flaemmchen/brandmal/jodelschall/zuckfunke'],
      ['tuepfli', 19, 'spritzer/nesselstich/faulhauch/kellenschlag'],
      ['bergmaennli', 22, 'schauder/kieselkick/traumbann/geroellwalze'],
      ['guggerli', 20, 'bergbrise/flitzstoss/jodelschall/stahlschnitt'],
    ],
    box: [['chaeferli', 4, 'stupser/brummbass/gifttropfen']],
    bag: { crystal: 3, revive: 1, hyper_potion: 1, ether: 2 },
    money: 8158,
  },
};

const AREA3_FLAGS = [
  'cave_cleared', 'werk_cleared', 'gift_guggerli', 'item:pfad_3:super_potion', 'item:glimmerhoehle_1:revive',
  'item:funken_werk:hyper_potion', 'item:funken_werk:revive',
  ...['pfad3_beat', 'pfad3_heidi', 'pfad3_nora', 'pfad3_toni', 'pfad3_emil', 'hoehle_godi', 'grunt_hoehle_1', 'hoehle_fredi',
    'grunt_hoehle_2', 'grunt_werk_1', 'grunt_werk_2', 'grunt_werk_3', 'admin_bise_1', 'hall3_jola', 'hall3_max', 'hall3_ben',
    'leader_zita'].map((id) => `trainer:${id}`),
];

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
      await h.page.exposeFunction('ptShot', (file) => h.page.locator('canvas').screenshot({ path: `out/shots/ch34/4-${file}.png` }).then(() => true));
    }
    try {
      await play(h, starter, tour);
    } finally {
      const log = await h.run('return window.pt_state ? window.pt_state.log : []').catch(() => []);
      mkdirSync('out/e2e', { recursive: true });
      writeFileSync(`out/e2e/53-chapter4-${starter}.log`, log.join('\n'));
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
  const said = (re, from = 0) => h.run(`return window.pt_state.log.slice(${from}).some((t) => ${re}.test(t))`);
  const party = () => step(`return g.state.party.map((c) => [c.species, c.level])`);
  const pos = () => step('return pos()');
  const flag = (f) => step(`return g.state.flags[${JSON.stringify(f)}] === true`);
  const expectBeaten = async (...ids) => {
    for (const id of ids) expect(await flag(`trainer:${id}`), `${id} beaten`, { pos: await pos(), party: await party() });
  };

  // --- the state after chapter 3, below the Funkenstadt north gate -------------------------------------------------
  const end = CH3_END[STARTER];
  await step(`
    g.newGame({ name: 'Mia' });
    const s = g.state;
    s.starter = '${STARTER}';
    s.rivalName = 'Finn';
    const make = ([species, level, moves]) => {
      g.give(species, level);
      const c = s.party.pop();
      c.moves = moves.split('/').map((id) => ({ id, pp: g.data.getMove(id).pp }));
      if (!s.dexSeen.includes(species)) s.dexSeen.push(species);
      if (!s.dexCaught.includes(species)) s.dexCaught.push(species);
      return c;
    };
    s.box = ${JSON.stringify(end.box)}.map(make); // first, while the team is still empty
    s.party = ${JSON.stringify(end.party)}.map(make);
    for (const f of ['got_starter', 'rival1_done', 'lab_greeted', 'gift_mom_potions', 'gift_kiesel_crystals', 'chapter1_cleared',
      'rival2_done', 'forest_cleared', 'gift_ranger_potions', 'gift_starter', 'chapter2_cleared',
      'trainer:rival1_${RIV}', 'trainer:rival2_${RIV}', 'trainer:leader_jost', 'trainer:leader_undine', ...${JSON.stringify(AREA3_FLAGS)}]) g.flag(f);
    s.badges.push('badge_earth', 'badge_water', 'badge_spark');
    for (const [id, n] of Object.entries(${JSON.stringify(end.bag)})) g.item(id, n);
    s.money = ${end.money};
    s.lastHeal = { mapId: 'funken_center', x: 5, y: 3, facing: 'up' };
    g.warp('funkenstadt', 14, 3, 'up');
    await g.advance(30); await settle();
  `);
  const atStart = await party();

  /** Into the box: the weakest member (never the starter) when the team is full – in a Heilstation. */
  const makeRoom = `
    if (g.state.party.length === 6) {
      const others = g.state.party.slice(1);
      const weakest = 1 + others.indexOf(others.reduce((a, c) => (c.level < a.level ? c : a)));
      S.boxed.push(g.state.party[weakest].species + ' ' + g.state.party[weakest].level);
      await deposit(weakest);
    }
  `;
  /** Tries to catch the next wild creatures here while Fangkristalle last (thrown right away); a, b = the back-and-forth steps. */
  const catchHere = (a, b) => `
    const size = g.state.party.length + g.state.box.length;
    const spot = pos();
    S.wantCatch = true;
    await grass(8, '${a}', '${b}', () => g.state.party.length + g.state.box.length > size || !g.state.bag.crystal);
    S.wantCatch = false;
    if (g.state.party.length + g.state.box.length > size) S.caught.push(g.state.party.at(-1).species);
    await goto(spot.x, spot.y);
  `;
  await step('S.caught = []; S.boxed = [];');

  // --- Funkenstadt: Heilstation (room for a catch), Laden; north to Pfad 4 ------------------------------------------
  await step(`
    await goto(6, 16); await walk('U'); await goto(5, 3); await face('up'); await talk();
    ${makeRoom}
    await goto(5, 7); await walk('D');
    await goto(11, 16); await walk('U');
    await shop([['crystal', 5], ['hyper_potion', 3], ['super_potion', 3], ['revive', 2]]);
    await walk('D');
    await goto(14, 0); await walk('U'); await g.advance(30); await snap('01-pfad4');
  `);
  expectPos(await pos(), { map: 'pfad_4', x: 10, y: 47 }, 'Funkenstadt north edge → Pfad 4');

  // --- Pfad 4: a catch in the east grass, then two wild battles before Luca, Rolf, Resi, Hans; the items ---------------
  await step(`
    await goto(15, 42); ${catchHere('L', 'R')}
    await fieldHeal(); await grass(2, 'L', 'R');
    await goto(8, 40); await retry('pfad4_luca', ['pfad_4', 8, 40, 'left'], () => walkHere('L'), () => beaten('pfad4_luca'));
  `);
  await step(`
    await goto(4, 28); await fieldHeal(); await grass(2, 'L', 'R');
    await pickUp(1, 27);
    await goto(12, 28); await retry('pfad4_rolf', ['pfad_4', 12, 28, 'right'], () => walkHere('R'), () => beaten('pfad4_rolf'));
  `);
  await step(`
    await goto(12, 18); await fieldHeal(); await grass(2, 'L', 'R');
    await goto(10, 22); await retry('pfad4_resi', ['pfad_4', 10, 22, 'left'], () => walkHere('L'), () => beaten('pfad4_resi'));
    await goto(4, 17); await face('right'); await talk();
  `);
  expect(await said('/Ab hier liegt Schnee/'), 'the girl where the snow begins');
  await step(`
    await goto(4, 10); await fieldHeal(); await grass(2, 'L', 'R');
    shotWhen('02-pfad4-snow', (t) => t.name === 'battle' && t.setup.trainer?.id === 'pfad4_hans' && t.bottom.kind === 'command');
    await goto(7, 12); await retry('pfad4_hans', ['pfad_4', 7, 12, 'right'], () => walkHere('R'), () => beaten('pfad4_hans'));
    await pickUp(18, 13);
  `);
  await expectBeaten('pfad4_luca', 'pfad4_rolf', 'pfad4_resi', 'pfad4_hans');
  expect((await flag('item:pfad_4:hyper_potion')) && (await flag('item:pfad_4:crystal_ultra')), 'Pfad 4 items');
  const afterPfad4 = await party();
  await step(`await fieldHeal(); await goto(10, 0); await walk('U'); await g.advance(30); await snap('03-frostalp');`);
  expectPos(await pos(), { map: 'frostalp', x: 12, y: 21 }, 'Pfad 4 north edge → Frostalp');

  // --- Frostalp: rival 3 at the entrance; Heilstation, Arven, the legend, a catch in the snow grass ----------------------
  await step(`
    shotWhen('04-rival3', (t) => t.name === 'battle' && t.setup.trainer?.id === 'rival3_${RIV}' && t.bottom.kind === 'command');
    await retry('rival3', ['frostalp', 12, 21, 'up'], () => walkHere('U'), () => g.state.flags.rival3_done === true);
  `);
  expect((await flag(`trainer:rival3_${RIV}`)) && (await said('/Da bist du ja endlich/')) && (await said('/Wir sehen uns oben/')), `rival 3 (${RIV} variant)`);
  await step(`
    await goto(18, 6); await walk('U'); await goto(5, 3); await face('up'); await talk();
    ${makeRoom}
    await goto(5, 7); await walk('D');
    await goto(5, 13); await walk('U'); await goto(6, 4); await face('right'); await talk(); await goto(4, 6); await walk('D');
    await goto(17, 18); await walk('U'); await goto(6, 4); await face('right'); await talk(); await goto(4, 6); await walk('D');
    await goto(21, 19); ${catchHere('L', 'R')}
  `);
  expect(await step(`return g.state.flags.gift_arven_crystals && g.state.bag.crystal_ultra >= 3 && g.state.flags.gift_frostalp_candy`), "Arven's Gipfelkristalle, the legend");
  expect(await step(`return g.state.lastHeal.mapId === 'frostalp_center'`), 'healed in Frostalp');

  // --- Halle 4: the Heilstation and the Laden before each battle --------------------------------------------------------
  await step(`
    window.pt.prepare = async () => {
      await rest();
      await errand(['frostalp_shop', 5, 7, 'up'], () => shop([['hyper_potion', 3], ['super_potion', 3]]));
    };
    await goto(5, 6); await walk('U'); await snap('05-halle4');
    g.warp('frostalp_hall', 6, 2, 'up'); await settle(); await snap('05b-firna'); g.warp('frostalp_hall', 6, 14, 'up'); await settle();
  `);
  expectPos(await pos(), { map: 'frostalp_hall', x: 6, y: 14 }, 'into Halle 4');
  const atHall = await party();
  await step(`
    const { prepare } = window.pt;
    await retry('hall4_anouk', ['frostalp_hall', 6, 14, 'up'], async () => { await prepare(); await walkHere('U RR'); }, () => beaten('hall4_anouk'));
    await retry('hall4_walter', ['frostalp_hall', 8, 13, 'up'], async () => { await prepare(); await walkHere('RR UUU LLLLL'); }, () => beaten('hall4_walter'));
    await retry('hall4_svea', ['frostalp_hall', 5, 10, 'up'], async () => { await prepare(); await walkHere('LLL UUUU RRRR'); }, () => beaten('hall4_svea'));
    shotWhen('06-firna-battle', (t) => t.name === 'battle' && t.setup.trainer?.id === 'leader_firna' && t.bottom.kind === 'command');
    await retry('leader_firna', ['frostalp_hall', 6, 6, 'up'], async () => { await prepare(); await walkHere('RRR UUUU LLL'); await face('up'); await talk(); },
      () => g.state.badges.includes('badge_frost'));
  `);
  await expectBeaten('hall4_anouk', 'hall4_walter', 'hall4_svea', 'leader_firna');
  const hall = await step(`return { full: g.state.bag.full_potion, party: g.state.party.map((c) => [c.species, c.level]) }`);
  expect(hall.full >= 2 && (await said('/erhält das Firnabzeichen/')), 'Firnabzeichen + 2 Gletscherquell', hall);

  // --- stocking up for the summit (Heilstation: room for a catch; Laden), then the Gipfelpfad --------------------------------
  await step(`
    await goto(6, 14); await walk('D');
    await goto(18, 6); await walk('U'); await goto(5, 3); await face('up'); await talk();
    ${makeRoom}
    await goto(5, 7); await walk('D');
    await goto(17, 12); await walk('U');
    await shop([['hyper_potion', 5], ['revive', 3], ['full_potion', 2]]);
    await walk('D');
    await goto(12, 0); await walk('U'); await g.advance(30); await snap('07-gipfelpfad');
  `);
  expectPos(await pos(), { map: 'gipfelpfad', x: 11, y: 49 }, 'Frostalp north edge → Gipfelpfad');

  // --- Gipfelpfad: a catch, two wild battles before each trainer, the rescuer's tea half-way up, the items --------------------
  await step(`
    await goto(19, 44); ${catchHere('L', 'R')}
    await fieldHeal(); await grass(2, 'L', 'R');
    await goto(8, 45); await retry('grunt_gipfel_1', ['gipfelpfad', 8, 45, 'left'], () => walkHere('L'), () => beaten('grunt_gipfel_1'));
  `);
  await step(`
    await goto(16, 39); await fieldHeal(); await grass(2, 'L', 'R');
    await pickUp(19, 39);
    await goto(12, 38); await retry('gipfel_carla', ['gipfelpfad', 12, 38, 'left'], () => walkHere('L'), () => beaten('gipfel_carla'));
    await goto(17, 28); await face('right'); await talk();
  `);
  const rescue = await step(`return { heal: g.state.lastHeal, ok: g.state.party.every((c) => c.hp === maxHp(c)) }`);
  expect(rescue.heal.mapId === 'gipfelpfad' && rescue.ok && (await said('/Fässchen meines Bernhardin/')), "the rescuer's tea heals and sets the respawn point", rescue);
  await step(`
    await goto(18, 24); await fieldHeal(); await grass(2, 'L', 'R');
    await goto(10, 27); await retry('grunt_gipfel_2', ['gipfelpfad', 10, 27, 'left'], () => walkHere('L'), () => beaten('grunt_gipfel_2'));
  `);
  await step(`
    await goto(8, 18); await fieldHeal(); await grass(2, 'L', 'R');
    await goto(9, 16); await retry('gipfel_rico', ['gipfelpfad', 9, 16, 'right'], () => walkHere('R'), () => beaten('gipfel_rico'));
  `);
  await step(`
    await pickUp(19, 13);
    await goto(19, 12); await fieldHeal(); await grass(2, 'D', 'U');
    await goto(15, 8); await retry('grunt_gipfel_3', ['gipfelpfad', 15, 8, 'left'], () => walkHere('L'), () => beaten('grunt_gipfel_3'));
    await pickUp(3, 7);
  `);
  await expectBeaten('grunt_gipfel_1', 'gipfel_carla', 'grunt_gipfel_2', 'gipfel_rico', 'grunt_gipfel_3');
  for (const it of ['full_potion', 'revive', 'crystal_ultra']) expect(await flag(`item:gipfelpfad:${it}`), `Gipfelpfad item ${it}`);
  const afterPfad = await party();

  // --- Bise's blockade: rested (the rescuer) and restocked (the Laden in Frostalp) before each try ---------------------------
  await step(`
    window.pt.ready = async () => {
      await rest();
      await errand(['frostalp_shop', 5, 7, 'up'], () => shop([['hyper_potion', 5], ['revive', 3], ['full_potion', 2]]));
    };
    // after a loss (a blackout halves the money, so restocking soon fails) the player trains in the snow grass by the rescuer
    window.pt.train = () => errand(['gipfelpfad', 18, 24, 'left'], () => grass(6, 'L', 'R'));
    shotWhen('08-bise2', (t) => t.name === 'message' && /genug vom Winter/.test(topText()));
    await goto(11, 7);
    await retry('bise2', ['gipfelpfad', 11, 7, 'up'], async () => { await window.pt.ready(); await walkHere('U'); }, () => g.state.flags.gipfelpfad_cleared === true, window.pt.train);
    await goto(10, 3); await face('left'); await talk();
  `);
  expect((await flag('trainer:admin_bise_2')) && (await said('/START, dann SPEICHERN/')), 'Bise beaten, the climber says save');
  await step(`await goto(11, 0); await walk('U'); await g.advance(30); await snap('09-gipfelhorn');`);
  expectPos(await pos(), { map: 'gipfelhorn', x: 10, y: 19 }, 'Gipfelpfad north edge → Gipfelhorn');

  // --- Gipfelhorn: rested, then the strip at the neck: Eisner (the flame heals), the final rival battle ----------------------
  const atSummit = await party();
  await step(`
    shotWhen('10-eisner', (t) => t.name === 'message' && /Ewige Stille/.test(topText()));
    shotWhen('11-boss-battle', (t) => t.name === 'battle' && t.setup.trainer?.id === 'boss_eisner' && t.bottom.kind === 'command');
    shotWhen('12-flame', (t) => t.name === 'message' && /lodert hoch auf/.test(topText()));
    shotWhen('13-rival4-battle', (t) => t.name === 'battle' && t.setup.trainer?.id === 'rival4_${RIV}' && t.bottom.kind === 'command');
    shotWhen('14-lindglut-rises', (t) => t.name === 'message' && /Mitten in der Flamme/.test(topText()));
    await goto(10, 11);
    await retry('summit', ['gipfelhorn', 10, 11, 'up'], async () => { await window.pt.ready(); await walkHere('U'); }, () => g.state.flags.rival4_done === true, window.pt.train);
  `);
  await expectBeaten('boss_eisner', `rival4_${RIV}`);
  expect(await step(`return g.state.bag.crystal_master === 1 && !!ow().findNpc('lindglut')`), 'the Urkristall, Lindglut at the flame');
  for (const re of ['/Ewige Stille/', '/zerbrochen/', '/Behalte ihn/', '/nicht rechtzeitig geschafft/', '/lodert hell auf/'])
    expect(await said(re), `summit scene line ${re}`);
  const afterSummit = await party();

  // --- Lindglut: thrown the Urkristall at, or fought to the end; then the credits roll to the title ---------------------------
  const lindglut = LINDGLUT[STARTER];
  await step(`
    S.wantCatch = ${lindglut === 'catch'}; S.catchCrystal = 'crystal_master';
    shotWhen('15-lindglut-battle', (t) => t.name === 'battle' && t.setup.kind === 'wild' && t.bottom.kind === 'command');
    await goto(10, 5); await face('up');
    for (let i = 0; i < 6 && g.top() !== 'credits'; i++) {
      if (i > 0) { S.lost.push('lindglut'); await window.pt.train(); g.warp('gipfelhorn', 10, 5, 'up'); await settle(); await window.pt.ready(); await goto(10, 5); await face('up'); }
      await talk();
    }
    S.wantCatch = false;
    if (g.top() !== 'credits') throw new Error('no credits after Lindglut: ' + g.stack());
  `);
  const outcome = await step(`return { caught: g.state.dexCaught.includes('lindglut'), done: g.state.flags.lindglut_done, cleared: g.state.flags.game_cleared }`);
  expect(outcome.done && outcome.cleared && outcome.caught === (lindglut === 'catch'), `Lindglut ${lindglut === 'catch' ? 'caught' : 'defeated'}, the story ends`, outcome);
  expect(await said('/Danke, Mia/'), "the rival's last words");
  const credits = await step(`
    const phases = [];
    for (let k = 0; k < 30000 && g.top() !== 'title'; k++) {
      const c = g.game.stack.find((sc) => sc.name === 'credits');
      if (c && !phases.includes(c.phase)) {
        phases.push(c.phase);
        const shot = { scroll: '16-credits', parade: '17-parade' }[c.phase];
        if (shot) { await g.advance(60); await snap(shot); }
      }
      if (g.top() === 'message') { record(); await g.tap('a'); }
      else if (c && c.phase === 'end') await g.tap('a');
      else await g.advance(1);
    }
    return { top: g.top(), phases, save: JSON.parse(localStorage.getItem('wildlinge-save-test') || 'null') };
  `);
  expect(credits.top === 'title' && credits.phases.join() === 'flame,scroll,parade,end', 'the credits play back to the title', credits.phases);
  expect((await said('/Alvenland ist gerettet/')) && !(await said('/Fortsetzung folgt/')), 'the real epilogue');
  const save = credits.save;
  expect(save && save.flags.game_cleared && save.player.mapId === 'frostalp_house_1', 'the ending saved the game (Gasthaus)', save && save.player);

  // --- WEITER: back in the Gasthaus; the hot chocolate ----------------------------------------------------------------------
  const resumed = await step(`
    await g.advance(160); await g.tap('start'); await g.advance(3); await g.tap('a');
    await g.waitFor('overworld', 300); await g.advance(60); await settle();
    await snap('18-weiter');
    const at = pos();
    await goto(3, 4); await face('left'); await talk();
    return { stack: g.stack(), at };
  `);
  expect(resumed.stack.join() === 'overworld', 'WEITER resumes without replaying the ending', resumed);
  expectPos(resumed.at, { map: 'frostalp_house_1', x: 4, y: 6 }, 'resumed in the Gasthaus');
  expect(await said('/heiße Schokolade für dich und deine Wildlinge/'), 'post-game hot chocolate');

  const stats = await step(`return {
    wild: S.wild, trained: S.trained ?? 0, potions: S.potions, revives: S.revives ?? 0, lost: S.lost, rests: S.rests, boxed: S.boxed, caught: S.caught,
    team: g.state.party.map((c) => c.species + ' ' + c.level),
  }`);
  console.log(
    `    ${STARTER}: start ${JSON.stringify(atStart)} · after Pfad 4 ${JSON.stringify(afterPfad4)} · at the Halle ${JSON.stringify(atHall)} · ` +
      `after Firna ${JSON.stringify(hall.party)} · after the Gipfelpfad ${JSON.stringify(afterPfad)} · at the summit ${JSON.stringify(atSummit)} · ` +
      `after rival 4 ${JSON.stringify(afterSummit)} · Lindglut ${lindglut === 'catch' ? 'caught' : 'defeated'} · caught ${stats.caught.join(', ') || '-'} · ` +
      `boxed ${stats.boxed.join(', ') || '-'} · ${stats.wild} wild battles (${stats.trained} extra training after losses) · heal items ${stats.potions} · Lebensfunken ${stats.revives} · ` +
      `rests ${stats.rests} · lost ${JSON.stringify(stats.lost)} · end team ${stats.team.join(' | ')}`,
  );
}
