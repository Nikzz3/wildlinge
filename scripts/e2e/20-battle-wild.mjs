export const name = 'battle: wild battle runs to an outcome and returns to the overworld';

export async function run(h) {
  await h.run(`
    g.newGame({ starter: 'zuendli', level: 10 });
    await g.advance(5);
    g.give('sproessli', 3);
    const enemy = g.state.party.pop();
    g.state.dexSeen = [];
    g.state.dexCaught = [];
    window.__outcome = null;
    g.battle({ kind: 'wild', enemy: [enemy], background: 'grass' }).then((o) => (window.__outcome = o));
    await g.waitFor('battle');
    await g.advance(60);
  `);
  await h.shot('out/e2e/20-battle-wild-intro.png');

  // Mashing A: KAMPF → first move, confirms every message / level-up window.
  const outcome = await h.run(`
    for (let i = 0; i < 2000 && !window.__outcome; i++) await g.tap('a');
    return window.__outcome;
  `);
  if (!['win', 'lose', 'run', 'caught'].includes(outcome)) throw new Error(`no outcome: ${outcome}`);
  if (outcome !== 'win') throw new Error(`expected a win against a Lv3 creature, got ${outcome}`);

  const after = await h.run(`await g.advance(30); return { stack: g.stack(), seen: g.state.dexSeen, fading: g.game.fading }`);
  if (after.stack.at(-1) !== 'overworld') throw new Error(`expected overworld on top, got ${JSON.stringify(after.stack)}`);
  if (!after.seen.includes('sproessli')) throw new Error('enemy was not marked as seen');
  if (after.fading) throw new Error('screen still faded out after a won battle');
}
