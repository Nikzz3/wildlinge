export const name = 'evolution: A evolves (species, Lexikon, music restored), B cancels';

/**
 * Starts runEvolution (Zündli → Glutbock at level 16, no new move) from the overworld and drives it until
 * the morph animation runs. The promise result lands in window.__evo.
 */
async function startEvolution(h) {
  return h.run(`
    g.newGame({ starter: 'zuendli', level: 16 });
    await g.advance(30);
    window.__evo = { music: g.game.audio.currentMusic(), result: undefined };
    g.scenes.runEvolution(g.game, 0, 'glutbock').then((r) => { window.__evo.result = r; });
    const scene = () => g.game.stack.find((s) => s.name === 'evolution');
    for (let i = 0; i < 300 && scene()?.phase !== 'morph'; i++) {
      if (g.top() === 'message') await g.tap('a');
      else await g.advance(1);
    }
    return { phase: scene()?.phase, music: g.game.audio.currentMusic() };
  `);
}

/** Taps through the remaining messages until runEvolution resolves; returns the aftermath. */
async function finishEvolution(h) {
  return h.run(`
    for (let i = 0; i < 600 && window.__evo.result === undefined; i++) {
      if (g.top() === 'message') await g.tap('a');
      else await g.advance(1);
    }
    await g.advance(5);
    const c = g.state.party[0];
    return {
      result: window.__evo.result,
      species: c.species,
      caught: g.state.dexCaught.includes('glutbock'),
      stack: g.stack(),
      musicBefore: window.__evo.music,
      musicAfter: g.game.audio.currentMusic(),
    };
  `);
}

function check(label, cond, data) {
  if (!cond) throw new Error(`${label}: ${JSON.stringify(data)}`);
}

export async function run(h) {
  // A path: let the animation finish
  const started = await startEvolution(h);
  check('morph did not start / no evolution music', started.phase === 'morph' && started.music === 'evolution', started);
  await h.run('await g.advance(30)');
  await h.shot('out/e2e/05-title-evolution-morph.png');
  const done = await finishEvolution(h);
  check('A: expected an evolved Glutbock', done.result === true && done.species === 'glutbock' && done.caught, done);
  check('A: evolution scene not popped', JSON.stringify(done.stack) === '["overworld"]', done);
  check('A: music not restored', done.musicBefore !== null && done.musicAfter === done.musicBefore, done);

  // B path: cancel mid-morph
  await startEvolution(h);
  await h.run("await g.advance(10); await g.tap('b')");
  const canceled = await finishEvolution(h);
  check('B: expected no evolution', canceled.result === false && canceled.species === 'zuendli' && !canceled.caught, canceled);
  check('B: evolution scene not popped', JSON.stringify(canceled.stack) === '["overworld"]', canceled);
  check('B: music not restored', canceled.musicAfter === canceled.musicBefore, canceled);
}
