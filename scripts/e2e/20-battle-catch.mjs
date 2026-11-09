export const name = 'battle: catching a wild creature adds it to the party with uid and met data';

export async function run(h) {
  await h.run(`
    g.newGame({ starter: 'zuendli', level: 10 });
    await g.advance(5);
    g.give('biberli', 4);
    window.__enemy = g.state.party.pop();
    window.__enemy.uid = 0;
    g.item('crystal_master', 1);
    window.__outcome = null;
    g.battle({ kind: 'wild', enemy: [window.__enemy], background: 'water' }).then((o) => (window.__outcome = o));
    await g.waitFor('battle');
  `);

  // BEUTEL → KRISTALLE → Urkristall; decline the nickname (B = Nein).
  const outcome = await h.run(`
    const battle = () => g.game.stack.find((s) => s.name === 'battle');
    let threw = false;
    for (let i = 0; i < 2000 && !window.__outcome; i++) {
      const top = g.top();
      if (top === 'message') await g.tap('b');
      else if (top === 'bag') { await g.tap('right'); await g.tap('a'); threw = true; }
      else if (top === 'battle' && !threw && battle().bottom.kind === 'command') {
        // real navigation: right twice stays on BEUTEL (absolute grid moves)
        await g.tap('right'); await g.tap('right');
        if (battle().cmdCursor !== 1) throw new Error('cursor not on BEUTEL: ' + battle().cmdCursor);
        await g.tap('a');
      }
      else await g.tap('a');
    }
    return window.__outcome;
  `);
  if (outcome !== 'caught') throw new Error(`expected 'caught', got ${outcome}`);

  const r = await h.run(`
    const c = g.state.party[1];
    return { size: g.state.party.length, same: c === window.__enemy, uid: c && c.uid, nick: c && c.nickname, metAt: c && c.metAt,
      caught: g.state.dexCaught.includes('biberli'), crystals: g.state.bag.crystal_master ?? 0, top: g.top() };
  `);
  if (r.size !== 2 || !r.same) throw new Error(`caught creature not in party: ${JSON.stringify(r)}`);
  if (!(r.uid > 0)) throw new Error(`caught creature got no uid: ${JSON.stringify(r)}`);
  if (r.nick !== null) throw new Error(`nickname should be declined: ${JSON.stringify(r)}`);
  if (!r.metAt) throw new Error(`metAt not set: ${JSON.stringify(r)}`);
  if (!r.caught) throw new Error('Lexikon not marked caught');
  if (r.crystals !== 0) throw new Error('crystal was not used up');
  await h.run('await g.advance(30)');
  await h.shot('out/e2e/20-battle-catch-after.png');
}
