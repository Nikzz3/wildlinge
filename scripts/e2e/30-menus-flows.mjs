export const name = 'menus: battle switch/bag, candy, repel, sell, PC, name entry, save, dex, card';

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

/** Fresh game: sproessli Lv12 (hurt), biberli Lv9 (fainted), zwitschli Lv5 + some items. */
const SETUP = `
  g.newGame({ starter: 'sproessli', level: 12 });
  g.give('biberli', 9);
  g.give('zwitschli', 5);
  g.state.party[0].hp = 3;
  g.state.party[1].hp = 0;
  for (const [id, n] of [['potion', 2], ['crystal', 3], ['repel', 1], ['candy', 2]]) g.item(id, n);
  await g.advance(5);
`;

/** Opens a screen without awaiting; its result lands in window.__res. */
const open = (call) => `window.__res = 'pending'; ${call}.then((r) => { window.__res = r; }); await g.advance(3);`;

export async function run(h) {
  const tap = (b, n = 1) => h.run(`for (let i = 0; i < ${n}; i++) await g.tap('${b}'); await g.advance(2);`);
  const result = () => h.run('return window.__res');
  const top = () => h.run('return g.top()');
  /** Switches the open bag to a pocket (the bag remembers its last pocket between openings). */
  const toPocket = async (id) => {
    const pocket = () => h.run('return g.game.stack.at(-1).pocketId');
    for (let i = 0; i < 3 && (await pocket()) !== id; i++) await tap('right');
    expect((await pocket()) === id, `bag pocket should be ${id}, is ${await pocket()}`);
  };

  // --- forced battle switch: B does nothing, fainted creature refused, healthy one chosen --------
  await h.run(SETUP + open("g.screens.openParty(g.game, { kind: 'battleSwitch', activeIndex: 0, forced: true })"));
  await tap('b');
  expect((await top()) === 'party', 'forced switch must not be cancelable');
  await tap('up'); // index 2 → 0 (active)
  await tap('a');
  await tap('a'); // EINWECHSELN on the active one
  expect((await top()) === 'message', 'active creature should be refused with a message');
  await h.shot('out/e2e/30-switch-refused.png');
  await h.run("await g.mash('message')");
  await tap('right'); // index 1: fainted
  await tap('a');
  await tap('a');
  expect((await top()) === 'message', 'fainted creature should be refused');
  await h.run("await g.mash('message')");
  await tap('left'); // index 1 → 0, then down → 2
  await tap('down');
  await tap('a');
  await tap('a');
  expect((await result()) === 2, `battle switch result ${await result()}`);

  // --- battle bag: potion → target (+ refusal on full HP); crystal returns without target ---------
  await h.run(SETUP + open("g.screens.openBag(g.game, 'battle')"));
  await toPocket('items');
  await tap('a'); // potion
  await tap('down'); // zwitschli (full HP)
  await tap('a');
  expect((await top()) === 'message', 'potion on full HP should say no effect');
  await h.run("await g.mash('message')");
  await tap('up');
  await tap('a');
  const potion = await result();
  expect(potion?.itemId === 'potion' && potion.partyIndex === 0, `battle bag potion: ${JSON.stringify(potion)}`);
  expect((await h.run('return g.state.bag.potion')) === 2, 'battle bag must not consume');
  await h.run(open("g.screens.openBag(g.game, 'battle')"));
  await toPocket('crystals');
  await tap('a');
  const crystal = await result();
  expect(crystal?.itemId === 'crystal' && crystal.partyIndex === undefined, `battle crystal: ${JSON.stringify(crystal)}`);

  // --- field bag: crystal not usable, repel, candy -----------------------------------------------
  await h.run(SETUP + "g.screens.openBag(g.game, 'field'); await g.advance(3);");
  await toPocket('crystals');
  await tap('a');
  await tap('a'); // BENUTZEN
  expect((await top()) === 'message', 'crystal use in field should show a message');
  await h.run("await g.mash('message')");
  await toPocket('items'); // potion, repel, candy (data order)
  await tap('down'); // repel
  await tap('a');
  await tap('a');
  await h.run("await g.mash('message')");
  expect((await h.run('return g.state.repelSteps')) === 100, 'repel should set repelSteps');
  const level = await h.run('return g.state.party[2].level');
  await tap('down'); // candy (repel is gone → candy is now at index 1)
  await tap('up');
  await h.shot('out/e2e/30-bag-candy.png');
  await tap('a');
  await tap('a'); // BENUTZEN → party
  await tap('down'); // index 2: zwitschli
  await tap('a');
  await h.run("await g.mash('message', 20)");
  const after = await h.run('return { level: g.state.party[2].level, candy: g.state.bag.candy }');
  expect(after.level === level + 1 && after.candy === 1, `candy: ${level} → ${JSON.stringify(after)}`);
  expect((await top()) === 'bag', `after candy expected bag, got ${await top()}`);

  // --- sell: crystal at half price -----------------------------------------------------------------
  await h.run(SETUP + "g.screens.openShop(g.game, ['potion']); await g.advance(3);");
  await tap('down'); // VERKAUFEN
  await tap('a');
  expect((await top()) === 'bag', 'sell opens the bag');
  const money = await h.run('return g.state.money');
  await toPocket('crystals');
  await tap('a'); // quantity 1
  await tap('a');
  await tap('a'); // Ja
  await h.run("await g.mash('message')");
  expect((await h.run('return g.state.money')) === money + 100, 'crystal sells for 100');
  expect((await h.run('return g.state.bag.crystal')) === 2, 'one crystal sold');

  // --- PC: deposit keeps a healthy creature, withdraw respects the party limit ---------------------
  await h.run(SETUP + 'g.state.party.splice(2, 1); g.screens.openPc(g.game); await g.advance(3);');
  await h.run("await g.mash('message', 1)"); // "{PLAYER} schaltet den PC ein."
  await tap('a'); // ABLEGEN
  expect((await top()) === 'pc-list', 'deposit list');
  await tap('a');
  await tap('a'); // ABLEGEN the only healthy one → refused
  expect((await top()) === 'message', 'last healthy creature must stay');
  await h.run("await g.mash('message')");
  expect((await h.run('return g.state.party.length')) === 2, 'party unchanged');
  await tap('down');
  await tap('a');
  await tap('a'); // deposit the fainted one
  await h.run("await g.mash('message')");
  expect((await h.run('return [g.state.party.length, g.state.box.length].join()')) === '1,1', 'deposit moved to box');
  await h.shot('out/e2e/30-pc.png');
  await tap('b');
  await tap('down'); // HOLEN
  await tap('a');
  await tap('a');
  await tap('a');
  await h.run("await g.mash('message')");
  expect((await h.run('return [g.state.party.length, g.state.box.length].join()')) === '2,0', 'withdraw moved to party');

  // --- name entry: type, delete, confirm; empty falls back to initial -------------------------------
  await h.run(SETUP + open("g.screens.openNameEntry(g.game, { title: 'Wie heißt du?', initial: 'Kai', maxLen: 5 })"));
  await tap('a'); // A
  await tap('right');
  await tap('a'); // B
  await tap('a'); // B
  await tap('b'); // delete
  await tap('select'); // abc page
  await tap('right');
  await tap('a'); // c
  await h.shot('out/e2e/30-name.png');
  await tap('start');
  expect((await result()) === 'ABc', `name entry result ${await result()}`);
  await h.run(open("g.screens.openNameEntry(g.game, { title: 'Rivale', initial: 'Lio', maxLen: 10 })"));
  await tap('start');
  expect((await result()) === 'Lio', 'empty name falls back to initial');

  // --- save, dex, trainer card ------------------------------------------------------------------
  await h.run(SETUP + open('g.screens.openSaveMenu(g.game)'));
  await tap('a'); // Ja
  await h.run("await g.mash('message')");
  expect((await result()) === true, 'save returns true');
  expect(await h.run('return g.game.hasSave()'), 'save written');

  await h.run('g.screens.openDex(g.game); await g.advance(3);');
  await tap('a');
  await h.shot('out/e2e/30-dex-detail.png');
  await tap('b');
  await tap('b');
  expect((await top()) === 'overworld', 'dex closed');

  await h.run("g.state.badges.push('badge_earth'); g.screens.openTrainerCard(g.game); await g.advance(3);");
  await h.shot('out/e2e/30-trainer-card.png');
  await tap('b');
  expect((await top()) === 'overworld', 'trainer card closed');
}
