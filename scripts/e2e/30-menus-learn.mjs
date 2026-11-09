export const name = 'menus: candy → forget-move screen, candy → evolution, askForgetMove decline loop';

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

export async function run(h) {
  const tap = (b, n = 1) => h.run(`for (let i = 0; i < ${n}; i++) await g.tap('${b}'); await g.advance(2);`);
  const top = () => h.run('return g.top()');
  const moves = () => h.run('return g.state.party[0].moves.map((m) => m.id)');
  /** Pages through plain messages until a Ja/Nein question shows its choice menu. */
  const untilChoice = async () => {
    const ok = await h.run(`
      for (let i = 0; i < 120; i++) {
        const s = g.game.stack.at(-1);
        if (s.name === 'message' && s.menu) return true;
        if (s.name === 'message' && !s.choices) await g.tap('a');
        else await g.advance(2);
      }
      return false;`);
    expect(ok, `no question appeared (top: ${await top()})`);
  };
  const yes = async () => {
    await untilChoice();
    await tap('a');
  };
  const no = async () => {
    await untilChoice();
    await tap('b'); // B = Nein
  };

  // Sprössli Lv14 knows 4 moves; Lv15 brings Mohnduft, Lv16 evolves into Moosdachs.
  await h.run(`
    g.newGame({ starter: 'sproessli', level: 14 });
    g.state.bag = {};
    g.item('candy', 2);
    await g.advance(5);
  `);
  const before = await moves();
  expect(before.length === 4, `expected 4 known moves, got ${before}`);

  // --- candy → level 15 → forget screen → replace slot 0 -----------------------------------------
  await h.run("g.screens.openBag(g.game, 'field'); await g.advance(3);");
  expect((await h.run('return g.game.stack.at(-1).pocketId')) === 'items', 'bag opens on ITEMS');
  await tap('a'); // Honigwabe
  await tap('a'); // BENUTZEN
  expect((await top()) === 'party', 'candy asks for a target');
  await tap('a'); // Sprössli
  await yes(); // "Soll Sprössli eine Attacke vergessen …?"
  expect((await top()) === 'forget-move', `expected the forget screen, got ${await top()}`);
  await h.shot('out/e2e/30-learn-forget.png');
  await tap('a'); // forget slot 0
  await h.run("await g.mash('message', 20)");
  const after = await moves();
  expect(after[0] === 'mohnduft', `slot 0 should now be mohnduft: ${after}`);
  expect(after.slice(1).join() === before.slice(1).join(), `other moves must stay: ${before} → ${after}`);
  expect((await h.run('return g.state.party[0].level')) === 15, 'candy raised the level');
  expect((await top()) === 'bag', `back in the bag, got ${await top()}`);

  // --- second candy → level 16 → evolution --------------------------------------------------------
  await tap('a');
  await tap('a');
  await tap('a');
  const settled = await h.run(`
    for (let i = 0; i < 400 && g.top() !== 'bag'; i++) {
      if (g.top() === 'message') await g.tap('a');
      else await g.advance(5);
    }
    return g.top() === 'bag';`);
  expect(settled, `evolution flow did not return to the bag (stack ${JSON.stringify(await h.run('return g.stack()'))})`);
  const evolved = await h.run('return { species: g.state.party[0].species, level: g.state.party[0].level, candy: g.state.bag.candy ?? 0 }');
  expect(evolved.species === 'moosdachs' && evolved.level === 16, `evolution: ${JSON.stringify(evolved)}`);
  expect(evolved.candy === 0, 'both candies used');
  expect(await h.run("return g.state.dexCaught.includes('moosdachs')"), 'evolution registers in the Lexikon');
  await tap('b');

  // --- askForgetMove: Nein → Nein → Ja → choose the new move itself → verzichten → null -----------
  const known = await moves();
  await h.run(`
    window.__res = 'pending';
    g.screens.askForgetMove(g.game, g.state.party[0], 'enzianregen').then((r) => { window.__res = r; });
    await g.advance(3);`);
  await no(); // "Soll … vergessen?" → Nein
  await no(); // "… wirklich darauf verzichten?" → Nein → asks again
  await yes(); // "Soll … vergessen?" → Ja
  expect((await top()) === 'forget-move', 'forget screen after Ja');
  await tap('up'); // wraps to the new move (NEU)
  await tap('a');
  await yes(); // "… wirklich darauf verzichten?" → Ja
  await h.run('await g.advance(3)');
  expect((await h.run('return window.__res')) === null, `askForgetMove should return null, got ${await h.run('return window.__res')}`);
  expect((await moves()).join() === known.join(), 'askForgetMove must not mutate the moves');
  expect((await top()) === 'overworld', `all dialogs closed, got ${await top()}`);
}
