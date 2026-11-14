export const name = 'autosave: every 2 min of idle overworld, waits for menus, never overwrites another game';

const AUTOSAVE = 60 * 120;

export async function run(h) {
  const saved = () => h.run(`return JSON.parse(localStorage.getItem('wildlinge-save-test') || 'null')`);
  const expect = (ok, what, got) => {
    if (!ok) throw new Error(`${what}: ${JSON.stringify(got)}`);
  };

  // first game, nothing on disk: saves once the interval has passed
  await h.run(`g.newGame({ starter: 'sproessli', name: 'Rina' }); g.warp('dev_town', 12, 6, 'down'); await g.advance(${AUTOSAVE - 10});`);
  expect((await saved()) === null, 'no save before the interval', await saved());
  // an open menu holds the autosave back until the overworld is alone again
  await h.run(`void g.screens.openStartMenu(g.game); await g.advance(60);`);
  expect((await saved()) === null, 'no autosave while a menu is open', await h.run('return g.stack()'));
  await h.run(`await g.tap('b'); await g.advance(4);`);
  const first = await saved();
  expect(first?.playerName === 'Rina' && first.playFrames >= AUTOSAVE, 'autosaved after closing the menu', first);
  await h.run('await g.advance(20)'); // icon fully faded in
  await h.shot('out/e2e/15-autosave-icon.png');

  // a new game over that save must not replace it …
  await h.run(`g.newGame({ starter: 'sproessli', name: 'Kai' }); g.warp('dev_town', 12, 6, 'down'); await g.advance(${AUTOSAVE + 60});`);
  expect((await saved())?.playerName === 'Rina', 'other game not overwritten', await saved());
  // … until the player saves it by hand; from then on autosave continues the new game
  await h.run(`g.game.save(); await g.advance(${AUTOSAVE + 10});`);
  const next = await saved();
  expect(next?.playerName === 'Kai' && next.playFrames >= 2 * AUTOSAVE, 'autosave continues after a manual save', next);
}
