export const name = 'menus: start menu, party, summary, bag item use, options, shop';

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

export async function run(h) {
  const top = () => h.run('return g.top()');
  const tap = (b, n = 1) => h.run(`for (let i = 0; i < ${n}; i++) await g.tap('${b}'); await g.advance(2);`);
  const expectTop = async (scene, where) => {
    const t = await top();
    expect(t === scene, `${where}: expected top scene "${scene}", got "${t}" (${JSON.stringify(await h.run('return g.stack()'))})`);
  };

  await h.run(`
    g.newGame({ starter: 'sproessli', level: 12 });
    g.give('biberli', 9);
    g.item('potion', 3);
    g.state.party[0].hp = 5;
    await g.advance(5);
  `);

  // --- start menu → TEAM → summary pages ------------------------------------------------------
  await h.run('g.screens.openStartMenu(g.game); await g.advance(3);');
  await expectTop('startmenu', 'open start menu');
  await h.shot('out/e2e/30-startmenu.png');
  await tap('down'); // TEAM
  await tap('a');
  await expectTop('party', 'TEAM');
  await h.shot('out/e2e/30-party.png');
  await tap('a'); // creature submenu
  await tap('a'); // STATUS
  await expectTop('summary', 'STATUS');
  await tap('right');
  await h.shot('out/e2e/30-summary-stats.png');
  await tap('right');
  await tap('a'); // move details
  await h.shot('out/e2e/30-summary-moves.png');
  await tap('b'); // leave move details
  await tap('down'); // browse to the second creature
  await tap('b');
  await expectTop('party', 'back from summary');
  expect((await h.run('return g.game.stack.at(-1).index')) === 1, 'party cursor follows the creature browsed in the summary');

  // reorder: TAUSCHEN second ↔ first
  const before = await h.run('return g.state.party.map((c) => c.species)');
  await tap('a');
  await tap('down'); // TAUSCHEN
  await tap('a');
  await tap('left');
  await tap('a');
  const after = await h.run('return g.state.party.map((c) => c.species)');
  expect(after[0] === before[1] && after[1] === before[0], `swap failed: ${before} → ${after}`);
  await tap('b');
  await expectTop('startmenu', 'back from party');

  // --- BEUTEL: use a potion on the hurt creature (now in slot 2) -------------------------------
  await tap('down'); // BEUTEL
  await tap('a');
  await expectTop('bag', 'BEUTEL');
  expect((await h.run('return g.game.stack.at(-1).pocketId')) === 'items', 'bag opens on ITEMS');
  await h.shot('out/e2e/30-bag.png');
  await tap('a'); // potion → submenu
  await tap('a'); // BENUTZEN
  await expectTop('party', 'item target');
  await tap('right');
  await h.shot('out/e2e/30-item-target.png');
  const hpBefore = await h.run('return g.state.party[1].hp');
  await tap('a');
  await expectTop('message', 'heal message');
  await h.run("await g.mash('message')");
  const healed = await h.run('return { hp: g.state.party[1].hp, potions: g.state.bag.potion }');
  expect(healed.hp === hpBefore + 20, `potion should heal 20 LP: ${hpBefore} → ${healed.hp}`);
  expect(healed.potions === 2, `potion should be consumed, have ${healed.potions}`);
  await expectTop('bag', 'back in bag after use');
  await tap('b');
  await expectTop('startmenu', 'back from bag');

  // --- OPTIONEN: lower music volume -----------------------------------------------------------
  await tap('down', 3); // card, save, options
  await tap('a');
  await expectTop('options', 'OPTIONEN');
  const vol = await h.run('return g.state.options.musicVolume');
  await tap('down'); // MUSIK
  await tap('left');
  const vol2 = await h.run('return g.state.options.musicVolume');
  expect(Math.abs(vol2 - (vol - 0.1)) < 1e-9, `music volume ${vol} → ${vol2}`);
  await h.shot('out/e2e/30-options.png');
  await tap('b');
  await expectTop('startmenu', 'back from options');
  await tap('start');
  await expectTop('overworld', 'START closes the menu');

  // --- shop: buy 2 potions ----------------------------------------------------------------------
  await h.run("g.screens.openShop(g.game, ['potion', 'crystal']); await g.advance(3);");
  await expectTop('message', 'shop greeting');
  await tap('a'); // KAUFEN
  await expectTop('shop-buy', 'buy list');
  const money = await h.run('return g.state.money');
  await tap('a'); // potion
  await expectTop('quantity', 'quantity');
  await tap('up'); // 2
  await h.shot('out/e2e/30-shop-quantity.png');
  await tap('a');
  await tap('a'); // Ja
  await h.run("await g.mash('message')");
  const bought = await h.run('return { money: g.state.money, potions: g.state.bag.potion }');
  expect(bought.money === money - 600, `money ${money} → ${bought.money}`);
  expect(bought.potions === 4, `expected 4 potions, have ${bought.potions}`);
  await tap('b'); // leave buy list
  await tap('down', 2); // ZURÜCK
  await tap('a');
  await h.run("await g.mash('message')");
  await expectTop('overworld', 'shop closed');
}
