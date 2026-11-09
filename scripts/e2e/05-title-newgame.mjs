export const name = 'title: Neues Spiel → intro (names) → overworld';

/**
 * Drives the real flow from the title screen. Name questions are answered by moving the menu cursor to a
 * quick-pick name (reads the open choice menu of the top 'message' scene); everything else is tapped through.
 */
export async function run(h) {
  await h.run('await g.advance(160)');
  if ((await h.run('return g.top()')) !== 'title') throw new Error('title scene expected');
  await h.run("await g.tap('start'); await g.advance(3)");
  await h.shot('out/e2e/05-title-menu.png');
  await h.run("await g.tap('a')"); // NEUES SPIEL (fresh test storage has no save → first entry)

  const result = await h.run(`
    const answers = { Mia: 'Mia', Finn: 'Finn' };
    const picked = [];
    let sawIntro = false;
    for (let i = 0; i < 3000 && g.top() !== 'overworld'; i++) {
      sawIntro ||= g.stack().includes('intro');
      const top = g.game.stack[g.game.stack.length - 1];
      const menu = top?.name === 'message' ? top.menu : null;
      if (menu) {
        const want = menu.options.find((o) => answers[o]);
        if (!want) throw new Error('unexpected choice menu: ' + menu.options.join(', '));
        while (menu.options[menu.index] !== want) await g.tap('down');
        picked.push(want);
        await g.tap('a');
      } else if (top?.name === 'message') await g.tap('a');
      else await g.advance(4);
    }
    await g.advance(40);
    return { stack: g.stack(), player: g.state.playerName, rival: g.state.rivalName, picked, sawIntro };
  `);
  if (!result.sawIntro) throw new Error('intro scene never appeared');
  // title and intro must both be gone, not just covered
  if (JSON.stringify(result.stack) !== '["overworld"]') throw new Error(`expected only the overworld, got ${JSON.stringify(result.stack)}`);
  if (result.player !== 'Mia' || result.rival !== 'Finn')
    throw new Error(`names not set: ${JSON.stringify(result)}`);
  await h.shot('out/e2e/05-title-newgame.png');
}
