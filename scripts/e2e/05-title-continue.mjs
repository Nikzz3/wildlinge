export const name = 'title: WEITER loads the save and enters the overworld';

export async function run(h) {
  // write a save, then change the live state so we can tell the save was loaded
  await h.run("g.game.state.playerName = 'Rina'; g.game.state.playFrames = 3600 * 75; g.game.save(); g.game.state.playerName = 'X'");
  await h.run("await g.advance(160); await g.tap('start'); await g.advance(3)");
  const summary = await h.run('return g.state.playerName');
  if (summary !== 'Rina') throw new Error(`save not loaded for the menu summary: ${summary}`);
  await h.shot('out/e2e/05-title-continue-menu.png');
  await h.run("await g.tap('a')"); // WEITER is the first entry when a save exists
  await h.run("await g.waitFor('overworld', 300); await g.advance(30)");
  const result = await h.run('return { stack: g.stack(), name: g.state.playerName }');
  // the title must be gone, not just covered
  if (JSON.stringify(result.stack) !== '["overworld"]' || result.name !== 'Rina')
    throw new Error(`continue failed: ${JSON.stringify(result)}`);
}
