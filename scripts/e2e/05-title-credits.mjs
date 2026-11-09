export const name = 'credits: wait for A at ENDE, no parade with an empty Lexikon, scene popped';

export async function run(h) {
  // fresh game without a starter: empty party and Lexikon
  const before = await h.run(`
    g.newGame();
    await g.advance(30);
    window.__credits = { done: false, phases: [] };
    g.scenes.runCredits(g.game).then(() => { window.__credits.done = true; });
    const scene = () => g.game.stack.find((s) => s.name === 'credits');
    for (let i = 0; i < 3000 && !window.__credits.done; i++) {
      const phase = scene()?.phase;
      if (phase && !window.__credits.phases.includes(phase)) window.__credits.phases.push(phase);
      if (phase === 'end') break;
      if (g.top() === 'message') await g.tap('a');
      else await g.advance(1);
    }
    await g.advance(240); // well past the point where A is accepted: must keep waiting
    return { ...window.__credits, stack: g.stack(), dex: g.state.dexCaught.length };
  `);
  if (before.dex !== 0) throw new Error(`expected an empty Lexikon: ${JSON.stringify(before)}`);
  if (JSON.stringify(before.phases) !== '["flame","scroll","end"]')
    throw new Error(`unexpected phases (parade must be skipped): ${JSON.stringify(before)}`);
  if (before.done || before.stack.at(-1) !== 'credits')
    throw new Error(`credits must wait for A at ENDE: ${JSON.stringify(before)}`);
  await h.shot('out/e2e/05-title-credits-end.png');

  const after = await h.run("await g.tap('a'); await g.advance(10); return { done: window.__credits.done, stack: g.stack() }");
  if (!after.done) throw new Error('runCredits did not resolve after A');
  if (JSON.stringify(after.stack) !== '["overworld"]') throw new Error(`credits scene not popped: ${JSON.stringify(after.stack)}`);
}
