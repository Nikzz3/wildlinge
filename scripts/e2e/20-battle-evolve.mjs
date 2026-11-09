export const name = 'battle: a level-up to the evolution level evolves after the battle, then the overworld fades back in';

export async function run(h) {
  // Sprössli Lv15, a few ERF short of Lv16 (Moosdachs), against a weak wild Munggli.
  await h.run(`
    g.newGame({ starter: 'sproessli', level: 15 });
    await g.advance(5);
    g.state.party[0].exp = 16 ** 3 - 5;
    g.state.party[0].moves = [{ id: 'zweigschlag', pp: 30 }];
    g.give('munggli', 4);
    window.__enemy = g.state.party.pop();
    window.__outcome = null;
    g.battle({ kind: 'wild', enemy: [window.__enemy], background: 'grass' }).then((o) => (window.__outcome = o));
    await g.waitFor('battle');
  `);
  const r = await h.run(`
    const seen = new Set();
    for (let i = 0; i < 3000 && !window.__outcome; i++) {
      seen.add(g.top());
      // decline learning (B on the question), A for everything else; A lets the evolution happen
      const t = g.game.stack.at(-1);
      await g.tap(t.name === 'message' && t.menu && /vergessen/.test(t.box.pages.flat().join(' ')) ? 'b' : 'a');
    }
    await g.advance(40);
    return { outcome: window.__outcome, seen: [...seen], species: g.state.party[0].species, level: g.state.party[0].level,
      stack: g.stack(), fading: g.game.fading, music: g.game.audio.currentMusic() };
  `);
  if (r.outcome !== 'win') throw new Error(`expected a win: ${JSON.stringify(r)}`);
  if (!r.seen.includes('evolution')) throw new Error(`no evolution scene after the battle: ${JSON.stringify(r)}`);
  if (r.species !== 'moosdachs' || r.level !== 16) throw new Error(`did not evolve: ${JSON.stringify(r)}`);
  if (JSON.stringify(r.stack) !== '["overworld"]' || r.fading) throw new Error(`overworld not back: ${JSON.stringify(r)}`);
  await h.shot('out/e2e/20-battle-evolve-after.png');
}
