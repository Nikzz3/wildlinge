/**
 * Area 4 critical path from an area-3-complete save (three badges, Funkenwerk freed, Guggerli, standing below the
 * Funkenstadt north gate – or on Pfad 4 when area 3 is not in the build): Pfad 4 (4 trainers) → Frostalp (rival 3,
 * Heilstation, north gate closed, Arven's gift, legend part 2, Laden) → Halle 4 (Anouk, Walter, Svea, Firna) →
 * north gate opens → Gipfelpfad (5 trainers, the rescuer's tea, Bise's blockade, the climber's save hint) →
 * Gipfelhorn (scene A: Eisner + Urkristall, scene B: the final rival battle, Lindglut rises) → Lindglut, FLED →
 * credits → title → WEITER (Gasthaus: hot chocolate, Bise, Arven) → back at the flame Lindglut is there again and
 * is CAUGHT without credits. Then the save from before the first Lindglut talk is restored and the story path where
 * Lindglut is CAUGHT is played → credits → WEITER.
 * Real walking and talking (scripts/lib/playthrough.mjs drives battles like the balance sim's sensible player); warps
 * only for long walks after the ending. A repel keeps random wild battles out of the scripted walk.
 * Level top-ups (the story run, not the balance): Lv 30 at the start (where area 3 leaves the team), Lv 34 before
 * Halle 4, Lv 36 before the Gipfelpfad, Lv 42 before the summit (Eisner Lv 33–35, then rival 4 Lv 36–40 right after the flame's heal; with four members at Lv 40–44 the mashed sproessli team lost to Voltmarder, so the team has a fifth member, an Erdwühler from the Glimmerhöhle).
 * Env A4_STARTER = sproessli (default) | zuendli | biberli picks the starter (and so the team and the rival variant).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { HELPERS, PT } from '../lib/playthrough.mjs';

const STARTER = process.env.A4_STARTER ?? 'sproessli';
const RIVAL = { sproessli: 'zuendli', zuendli: 'biberli', biberli: 'sproessli' }[STARTER];
const LEFTOVER = { sproessli: 'biberli', zuendli: 'sproessli', biberli: 'zuendli' }[STARTER];

export const name =
  'area 4: Pfad 4 → Frostalp (rival 3, Halle 4) → Gipfelpfad (Bise) → Gipfelhorn (Eisner, rival 4, Lindglut fled + caught) → credits → WEITER';

const EXTRA = `
  const pt = window.pt;
  /**
   * Test stand-in for grinding: raise the party to at least \`level\` (exp = level³) with the moves a levelling
   * player would know by then (the last four of the learnset), then heal (lastHeal stays as it was).
   */
  pt.topUp = async (level) => {
    const D = g.data;
    const lastHeal = { ...g.state.lastHeal };
    for (const c of g.state.party) {
      if (c.level >= level) continue;
      c.level = level; c.exp = Math.max(c.exp, level ** 3);
      const ids = [...new Set(D.getSpecies(c.species).learnset.filter((e) => e.level <= level).map((e) => e.move))].slice(-4);
      c.moves = ids.map((id) => ({ id, pp: D.getMove(id).pp }));
    }
    pt.ow().enqueue(() => pt.ow().ctx.heal());
    await pt.settle();
    g.state.lastHeal = lastHeal;
  };
  const idle = () => g.top() === 'overworld' && !pt.ow().busy && !pt.ow().player.moving;
  /**
   * Talks to Lindglut (the player faces it) and plays the wild battle: 'run' picks FLUCHT until it works, 'catch'
   * throws the Urkristall. Returns when the overworld is idle again or the credits start.
   */
  pt.lindglut = async (action) => {
    const S = pt.S;
    let runs = 0, throws = 0, battle = false;
    await g.tap('a');
    for (let k = 0; k < 6000; k++) {
      const t = pt.top();
      const name = t?.name;
      pt.record();
      if (name === 'credits' || name === 'title') break;
      if (idle() && k > 5) break;
      if (name === 'overworld' || name === 'battle-transition') { await g.advance(1); continue; }
      if (name === 'battle') {
        battle = true;
        if (t.bottom.kind === 'command') {
          if (!S.lindglutShot) { S.lindglutShot = true; await pt.snap('lindglut-battle'); }
          if (action === 'run') { await g.tap('right'); await g.tap('down'); runs++; }
          else { await g.tap('right'); await g.tap('up'); }
          await g.tap('a');
        } else if (t.bottom.kind === 'moves') await g.tap('b');
        else await g.tap('a');
        continue;
      }
      if (name === 'bag') {
        for (let i = 0; i < 3 && t.pocketId !== 'crystals'; i++) await g.tap('right');
        const idx = t.items(g.game).findIndex((it) => it.id === 'crystal_master');
        if (idx < 0) throw new Error('no Urkristall in the bag');
        for (let i = 0; i < 16 && t.cursor.index !== idx; i++) await g.tap(t.cursor.index < idx ? 'down' : 'up');
        throws++;
        await g.tap('a');
        continue;
      }
      if (name === 'party') {
        // forced switch after a faint: the first healthy member
        const i = g.state.party.findIndex((c, j) => c.hp > 0 && j !== (t.mode?.activeIndex ?? -1));
        for (let n = 0; n < 8 && t.index !== i; n++) await g.tap(t.index % 2 !== i % 2 ? 'right' : t.index < i ? 'down' : 'up');
        await g.tap('a');
        continue;
      }
      if (name === 'message' && t.menu && /Spitznamen/.test(pt.topText())) { await g.tap('b'); continue; }
      await g.tap('a');
    }
    await pt.settle();
    return { runs, throws, battle, top: g.top() };
  };
  /** Plays the credits to the title screen; returns the phases seen and the save in localStorage. */
  pt.credits = async () => {
    const phases = [];
    for (let k = 0; k < 30000 && g.top() !== 'title'; k++) {
      const credits = g.game.stack.find((s) => s.name === 'credits');
      if (credits && !phases.includes(credits.phase)) phases.push(credits.phase);
      if (g.top() === 'message') {
        pt.record();
        if (!pt.S.epilogueShot && /Alpenglut wieder hell/.test(pt.topText())) { pt.S.epilogueShot = true; await g.advance(30); await pt.snap('epilogue'); }
        await g.tap('a');
      } else if (credits && credits.phase === 'end') await g.tap('a');
      else await g.advance(1);
    }
    return { top: g.top(), phases, save: JSON.parse(localStorage.getItem('wildlinge-save-test') || 'null') };
  };
  /** Title → WEITER → overworld. */
  pt.weiter = async () => {
    await g.advance(160); await g.tap('start'); await g.advance(3); await g.tap('a');
    await g.waitFor('overworld', 300); await g.advance(60); await pt.settle();
    return { stack: g.stack(), pos: pt.pos() };
  };
`;

const expect = (cond, what, data) => {
  if (!cond) throw new Error(`${what}${data === undefined ? '' : `: ${JSON.stringify(data)}`}`);
};
const expectPos = (actual, want, what) => {
  for (const [k, v] of Object.entries(want)) expect(actual[k] === v, `${what}: expected ${JSON.stringify(want)}`, actual);
};

export async function run(h) {
  mkdirSync('out/e2e', { recursive: true });
  await h.page.exposeFunction('ptShot', (file) => h.page.locator('canvas').screenshot({ path: `out/e2e/43-area4-${file}.png` }).then(() => true));
  try {
    await play(h);
  } finally {
    const log = await h.run('return window.pt_state ? window.pt_state.log : []').catch(() => []);
    writeFileSync('out/e2e/43-area4.log', log.join('\n'));
  }
}

async function play(h) {
  await h.run(HELPERS);
  await h.run(EXTRA);
  const run = (code) => h.run(`${PT} const { topUp, lindglut, credits, weiter } = window.pt; ${code}`);
  const said = (re, from = 0) => h.run(`return window.pt_state.log.slice(${from}).some((t) => ${re}.test(t))`);
  const mark = () => h.run('return window.pt_state.log.length');
  const flags = () => run(`return g.state.flags`);
  const party = () => run(`return g.state.party.map((c) => [c.species, c.level])`);
  const pos = () => run('return pos()');
  const beaten = async (...ids) => {
    const f = await flags();
    for (const id of ids) expect(f[`trainer:${id}`], `${id} beaten on the way`, { pos: await pos(), party: await party() });
  };

  // --- area-3-complete state below the Funkenstadt north gate ------------------------------------------------------
  const startMap = await run(`
    const D = g.data;
    const evolved = (id, lv) => { let sp = D.getSpecies(id); while (sp.evolves && sp.evolves.level <= lv) sp = D.getSpecies(sp.evolves.to); return sp.id; };
    g.newGame({ name: 'Kai' });
    const s = g.state;
    s.starter = '${STARTER}';
    s.rivalName = 'Lio';
    g.give(evolved('${STARTER}', 29), 29); g.give(evolved('${LEFTOVER}', 26), 26); g.give(evolved('munggli', 26), 26); g.give('guggerli', 23); g.give(evolved('wuehli', 26), 26);
    for (const f of ['got_starter', 'rival1_done', 'lab_greeted', 'gift_mom_potions', 'gift_kiesel_crystals', 'chapter1_cleared',
      'rival2_done', 'forest_cleared', 'gift_ranger_potions', 'gift_starter', 'chapter2_cleared', 'cave_cleared', 'werk_cleared',
      'gift_guggerli', 'trainer:rival1_${RIVAL}', 'trainer:rival2_${RIVAL}', 'trainer:leader_jost', 'trainer:leader_undine',
      'trainer:admin_bise_1', 'trainer:leader_zita']) g.flag(f);
    s.badges.push('badge_earth', 'badge_water', 'badge_spark');
    g.item('super_potion', 4); g.item('hyper_potion', 2); g.item('revive', 3); g.item('ether', 2); g.item('crystal_great', 4);
    s.money = 9000;
    s.repelSteps = 5000;
    s.lastHeal = { mapId: 'funken_center', x: 5, y: 3, facing: 'up' };
    g.warp('funkenstadt', 14, 3, 'up');
    await g.advance(30); await settle();
    if (pos().map !== 'funkenstadt') { s.lastHeal = { mapId: 'pfad_4', x: 10, y: 46, facing: 'up' }; g.warp('pfad_4', 10, 47, 'up'); await g.advance(30); await settle(); }
    await topUp(30);
    return pos().map;
  `);
  const atStart = await party();

  // --- Funkenstadt → Pfad 4: Luca, Rolf at a pylon, Resi, Hans in the snow ------------------------------------------------
  if (startMap === 'funkenstadt') {
    await run(`await walk('UUU'); await walk('U'); await g.advance(30);`);
    expectPos(await pos(), { map: 'pfad_4', x: 10, y: 47 }, 'Funkenstadt north edge → Pfad 4 (WORLD.md §3 link 3)');
  } else console.log('    note: funkenstadt is not in this build – starting on Pfad 4');
  await h.shot('out/e2e/43-area4-pfad4.png');
  await run(`await walk('UUUUUUU LLL');`);
  await beaten('pfad4_luca');
  await run(`await walk('LLLL UUUUUUUUU RRRRRRRRRRRR UUU');`);
  await beaten('pfad4_rolf');
  await run(`await walk('UUUUUU LLLLLL');`);
  await beaten('pfad4_resi');
  await run(`await walk('LLLLL UUUUU'); await face('right'); await talk();`);
  expect(await said('/Ab hier liegt Schnee/'), 'the girl where the snow begins');
  await run(`await walk('UUUUU RRRR');`);
  await beaten('pfad4_hans');
  await h.shot('out/e2e/43-area4-pfad4-snow.png');
  const afterPfad4 = await party();
  await run(`await walk('RRRR UUUUUUUU LL UUUU'); await walk('U'); await g.advance(30);`);
  expectPos(await pos(), { map: 'frostalp', x: 12, y: 21 }, 'Pfad 4 north edge → Frostalp');

  // --- Frostalp: rival 3 at the entrance ---------------------------------------------------------------------------------
  // (12,20) is on the entrance strip; a lost story fight (the shared retry) means the Heilstation and back
  await run(`await topUp(31); await retry('rival3', ['frostalp', 12, 21, 'up'], () => walkHere('U'), () => g.state.flags.rival3_done === true); await walk('U');`);
  let f = await flags();
  expect(f.rival3_done && f[`trainer:rival3_${RIVAL}`], `rival 3 (${RIVAL} variant) beaten`, { party: await party() });
  expect((await said('/Da bist du ja endlich/')) && (await said('/Wir sehen uns oben/')), 'rival 3 scene');
  expect(!(await run(`return !!ow().findNpc('rival')`)), 'rival 3 left to train');
  await h.shot('out/e2e/43-area4-frostalp.png');

  // Heilstation, north gate (closed), Gasthaus (Arven), legend house, Laden
  await run(`await goto(18, 6); await walk('U');`);
  expectPos(await pos(), { map: 'frostalp_center', x: 5, y: 7 }, 'Heilstation');
  await run(`await walk('UUUU'); await talk(); await goto(5, 7); await walk('D');`);
  expect(await run(`return g.state.lastHeal.mapId === 'frostalp_center'`), 'nurse sets lastHeal in Frostalp');
  await run(`await goto(12, 3); await walk('U');`);
  expectPos(await pos(), { map: 'frostalp', x: 12, y: 3 }, 'the ranger pushes the player back without the Firnabzeichen');
  expect(await said('/nur mit Firnabzeichen/'), 'north gate text');

  await run(`await goto(5, 13); await walk('U');`);
  expectPos(await pos(), { map: 'frostalp_house_1', x: 4, y: 6 }, 'Gasthaus Edelweiß');
  await run(`await walk('UU RR'); await face('right'); await talk(); await talk();`);
  const arven = await run(`return { flag: g.state.flags.gift_arven_crystals, ultra: g.state.bag.crystal_ultra }`);
  expect(arven.flag && arven.ultra === 3, 'Arven gives 3 Gipfelkristalle', arven);
  expect(await said('/heißt Lindglut/'), "Arven's warning about Lindglut");
  await run(`await walk('LLL'); await face('left'); await talk(); await goto(4, 6); await walk('D');`);
  expect(await said('/erst, wenn die Alpenglut wieder brennt/'), 'no hot chocolate yet');

  await run(`await goto(17, 18); await walk('U');`);
  expectPos(await pos(), { map: 'frostalp_house_2', x: 4, y: 6 }, 'legend house');
  await run(`await walk('UU RR'); await face('right'); await talk(); await goto(4, 6); await walk('D');`);
  const legend = await run(`return { flag: g.state.flags.gift_frostalp_candy, candy: g.state.bag.candy }`);
  expect(legend.flag && legend.candy === 1 && (await said('/warmem Herzen/')), 'legend part 2 + Honigwabe', legend);

  await run(`await goto(17, 12); await walk('U'); await walk('UUUU LLLL'); await face('up');`);
  expectPos(await pos(), { map: 'frostalp_shop', x: 1, y: 3 }, 'shop counter');
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
  expect(shop.name === 'shop-buy' && shop.items.includes('full_potion') && shop.stack.join() === 'overworld', 'Frostalp Laden sells its stock', shop);

  // --- Halle 4: Anouk, Walter, Svea at the gaps in the ice rows, then Firna -------------------------------------------------
  await run(`await topUp(34); await goto(5, 6); await walk('U');`);
  expectPos(await pos(), { map: 'frostalp_hall', x: 6, y: 14, facing: 'up' }, 'Halle door');
  await h.shot('out/e2e/43-area4-hall.png');
  await run(`await walk('U RR');`);
  await beaten('hall4_anouk');
  await run(`await walk('RR UUU LLLLL');`);
  await beaten('hall4_walter');
  await run(`await walk('LLL UUUU RRRR');`);
  await beaten('hall4_svea');
  await run(`await walk('RRR UUUU LLL'); await retry('leader_firna', ['frostalp_hall', 6, 2, 'up'], async () => { await face('up'); await talk(); }, () => g.state.badges.includes('badge_frost'));`);
  const hall = await run(`return { badges: g.state.badges, full: g.state.bag.full_potion, firna: g.state.flags['trainer:leader_firna'], party: g.state.party.map((c) => [c.species, c.level]) }`);
  expect(hall.badges.includes('badge_frost') && hall.full === 2 && hall.firna, 'Firnabzeichen + 2 Gletscherquell', hall);
  expect(await said('/erhält das Firnabzeichen/') && (await said('/Gipfelpfad steht dir offen/')), 'badge + after-text');

  // --- the north gate opens: Gipfelpfad ------------------------------------------------------------------------------------
  await run(`await goto(6, 14); await walk('D'); await goto(13, 2); await face('right'); await talk();`);
  expect(await said('/Dann darfst du hinauf/'), 'the ranger lets badge holders up');
  await run(`await topUp(36); await walk('L UU'); await walk('U'); await g.advance(30);`);
  expectPos(await pos(), { map: 'gipfelpfad', x: 11, y: 49 }, 'Frostalp north edge → Gipfelpfad');
  await h.shot('out/e2e/43-area4-gipfelpfad.png');
  await run(`await walk('UUUU LLLL');`);
  await beaten('grunt_gipfel_1');
  await run(`await walk('LLLL UUUUUUUU RRRRRRRR');`);
  await beaten('gipfel_carla');
  await run(`await walk('RRRRR UUUUUU UU R U'); await face('right'); await talk();`);
  const rescue = await run(`return { heal: g.state.lastHeal, hp: g.state.party.every((c) => c.hp > 0) }`);
  expect(rescue.heal.mapId === 'gipfelpfad' && rescue.hp && (await said('/Fässchen meines Bernhardin/')), 'the rescuer heals and sets the respawn point', rescue);
  await run(`await walk('U LLLLLLLL');`);
  await beaten('grunt_gipfel_2');
  await run(`await walk('LLLLLL UUUU UUUUUUU RRRRRRR');`);
  await beaten('gipfel_rico');
  await run(`await walk('RRRRR UUUU UU U U L');`);
  await beaten('grunt_gipfel_3');
  await run(`await topUp(36); await walk('LLL U');`);
  await h.shot('out/e2e/43-area4-bise.png');
  await run(`await retry('bise2', ['gipfelpfad', 11, 7, 'up'], () => walkHere('U'), () => g.state.flags.gipfelpfad_cleared === true);`); // (11,6): the trigger tile in front of Bise
  f = await flags();
  expect(f.gipfelpfad_cleared && f['trainer:admin_bise_2'], 'Bise beaten, pass cleared', { pos: await pos(), party: await party() });
  expect(await said('/genug vom Winter/'), 'Bise gives up');
  expect(!(await run(`return !!ow().findNpc('bise')`)), 'Bise gone');
  await run(`await walk('UUU L'); await face('left'); await talk();`);
  expect(await said('/START, dann SPEICHERN/'), 'the climber suggests saving before the summit');
  const afterPfad = await party();
  await run(`await topUp(42); await walk('R UUU'); await walk('U'); await g.advance(30);`);
  expectPos(await pos(), { map: 'gipfelhorn', x: 10, y: 19 }, 'Gipfelpfad north edge → Gipfelhorn');

  // --- Gipfelhorn: scene A (Eisner), scene B (rival 4), Lindglut rises -------------------------------------------------------
  await run(`
    shotWhen('eisner', (t) => t.name === 'message' && /Ewige Stille/.test(topText()));
    shotWhen('frostkern', (t) => t.name === 'message' && /lodert hoch auf/.test(topText()));
    shotWhen('boss-battle', (t) => t.name === 'battle' && t.setup.trainer?.id === 'boss_eisner' && t.bottom.kind === 'command');
    shotWhen('rival4-battle', (t) => t.name === 'battle' && t.setup.trainer?.id === 'rival4_${RIVAL}' && t.bottom.kind === 'command');
    shotWhen('lindglut-rises', (t) => t.name === 'message' && /der Wächter/.test(topText()));
    await walk('UUUUUUUU');
  `);
  await h.shot('out/e2e/43-area4-summit.png');
  await run(`await retry('summit', ['gipfelhorn', 10, 11, 'up'], () => walkHere('U'), () => g.state.flags.rival4_done === true);`); // (10,10): the strip across the neck
  f = await flags();
  expect(f.boss_done && f['trainer:boss_eisner'], 'Eisner beaten', { party: await party(), pos: await pos() });
  expect(f.rival4_done && f[`trainer:rival4_${RIVAL}`], `rival 4 (${RIVAL} variant) beaten`, { party: await party() });
  expect(await run(`return g.state.bag.crystal_master === 1`), 'Eisner hands over the Urkristall');
  for (const re of ['/Ewige Stille/', '/zerbrochen/', '/Ohne Glut kein Glühen/', '/Behalte ihn/', '/nicht rechtzeitig geschafft/', '/lodert hell auf/'])
    expect(await said(re), `summit scene line ${re}`);
  const stage = await run(`return { pos: pos(), lindglut: !!ow().findNpc('lindglut'), rival: !!ow().findNpc('rival_post'), eisner: !!ow().findNpc('eisner') }`);
  expect(stage.lindglut && stage.rival && !stage.eisner, 'Lindglut at the flame, rival beside the player, Frostmantel gone', stage);
  expectPos(stage.pos, { map: 'gipfelhorn', x: 10, y: 7 }, 'the player on the stage');
  // the save state right before scene C, for the second ending below
  await run(`window.a4snap = JSON.stringify(g.state);`);

  // --- scene C, first ending: flee from Lindglut → credits → WEITER --------------------------------------------------------
  await run(`await walk('UU'); await face('up');`);
  await h.shot('out/e2e/43-area4-lindglut.png');
  const fled = await run(`return await lindglut('run');`);
  expect(fled.battle && fled.runs >= 1 && fled.top === 'credits', 'fleeing from Lindglut still ends the story', fled);
  expect((await said('/gewaltiger Wildling steigt aus der Flamme/')) && (await said('/blickt dir lange nach/')), 'Lindglut scene (fled)');
  expect((await said('/Danke, Kai/')) && (await said('/unentschieden/')), 'the rival’s last words');
  let end = await run(`return await credits();`);
  expect(end.top === 'title' && end.phases.join() === 'flame,scroll,parade,end', 'credits back to the title', end.phases);
  expect((await said('/Alvenland ist gerettet/')) && !(await said('/Fortsetzung folgt/')), 'the real epilogue');
  let save = end.save;
  expect(save && save.flags.lindglut_done && save.flags.game_cleared && !save.dexCaught.includes('lindglut'), 'the ending saved the game (not caught)', save && save.flags);
  expectPos({ map: save.player.mapId, x: save.player.x, y: save.player.y }, { map: 'frostalp_house_1', x: 4, y: 6 }, 'saved position: the Gasthaus');

  let resumed = await run(`return await weiter();`);
  expect(resumed.stack.join() === 'overworld', 'WEITER resumes the game', resumed);
  expectPos(resumed.pos, { map: 'frostalp_house_1', x: 4, y: 6 }, 'resumed in the Gasthaus');
  await run(`await walk('UU L'); await face('left'); await talk();`);
  expect(await said('/heiße Schokolade für dich und deine Wildlinge/'), 'post-game: hot chocolate');
  expect(await run(`return !!ow().findNpc('bise')`), 'post-game: Bise in the Gasthaus');
  await run(`await walk('RRR'); await face('right'); await talk();`);
  expect(await said('/Du hast Alvenland gerettet/'), 'post-game: Arven');
  await h.shot('out/e2e/43-area4-gasthaus.png');

  // back at the flame (a long walk → warp): Lindglut is there again; caught, without credits
  await run(`g.warp('gipfelhorn', 10, 18, 'up'); await g.advance(30); await settle();`);
  expect(await run(`return !!ow().findNpc('lindglut') && !g.state.flags.lindglut_resting`), 'Lindglut is back at the flame');
  await run(`await walk('UUUUUUUUUUUUU'); await face('up');`);
  const rematch = await run(`return await lindglut('catch');`);
  expect(rematch.throws === 1 && rematch.top === 'overworld', 'post-game Lindglut caught with the Urkristall, no credits', rematch);
  const post = await run(`return { caught: g.state.dexCaught.includes('lindglut'), npc: !!ow().findNpc('lindglut'), stack: g.stack() }`);
  expect(post.caught && !post.npc && post.stack.join() === 'overworld', 'Lindglut joined the team and left the flame', post);
  await run(`await walk('DD'); await face('right'); await talk();`);
  expect(await said('/Als Kinder wollten wir immer/'), 'post-game rival at the flame');

  // --- second ending from the save before scene C: catch Lindglut in the story → credits → WEITER ------------------------------
  const second = await mark();
  await run(`
    g.game.state = JSON.parse(window.a4snap);
    g.warp('gipfelhorn', 10, 5, 'up'); await g.advance(30); await settle();
  `);
  expect(await run(`return !!ow().findNpc('lindglut')`), 'restored: Lindglut at the flame');
  const caught = await run(`return await lindglut('catch');`);
  expect(caught.throws === 1 && caught.top === 'credits', 'catching Lindglut ends the story', caught);
  expect((await said('/hat sich für dich entschieden/', second)) && (await said('/Danke, Kai/', second)), 'the rival reacts to the catch');
  end = await run(`return await credits();`);
  expect(end.top === 'title' && end.phases.join() === 'flame,scroll,parade,end', 'credits back to the title (2)', end.phases);
  save = end.save;
  expect(save && save.flags.game_cleared && save.dexCaught.includes('lindglut'), 'the ending saved the game (caught)', save && save.flags);
  resumed = await run(`return await weiter();`);
  expectPos(resumed.pos, { map: 'frostalp_house_1', x: 4, y: 6 }, 'resumed in the Gasthaus (2)');
  expect(resumed.stack.join() === 'overworld', 'no ending replay after WEITER', resumed);

  console.log(
    `    ${STARTER}: start ${JSON.stringify(atStart)} · after Pfad 4 ${JSON.stringify(afterPfad4)} · after Firna ${JSON.stringify(hall.party)} · ` +
      `after the Gipfelpfad ${JSON.stringify(afterPfad)} · top-ups: Lv 30 (start), 31 (rival 3), 34 (Halle 4), 36 (Gipfelpfad), 42 (summit)`,
  );
}
