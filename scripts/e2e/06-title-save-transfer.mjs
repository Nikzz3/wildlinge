export const name = 'options: export the save as a file, import it on another machine (fresh browser profile)';

import { launch } from '../lib/harness.mjs';

/** Moves the cursor of the open choice menu to `want` (A is pressed by the caller). */
const select = (want) => `
  const top = g.game.stack[g.game.stack.length - 1];
  const menu = top?.name === 'message' ? top.menu : null;
  if (!menu) throw new Error('no choice menu open, stack: ' + g.stack().join(','));
  if (!menu.options.includes(${JSON.stringify(want)})) throw new Error('no option ${want}: ' + menu.options.join(', '));
  while (menu.options[menu.index] !== ${JSON.stringify(want)}) await g.tap('down');
`;

/** Title → OPTIONEN → SPIELSTAND ÜBERTRAGEN → choice menu open. */
async function openTransfer(h) {
  await h.run("await g.advance(160); await g.tap('start'); await g.advance(3)");
  await h.run(`
    const title = g.game.stack[0];
    while (title.entries[title.index].id !== 'options') await g.tap('down');
    await g.tap('a'); await g.advance(5);
    while (g.top() === 'options' && g.game.stack.at(-1).cursor.index !== 4) await g.tap('down');
    await g.tap('a'); await g.advance(5);
  `);
}

/** Taps A through message pages until the options screen is on top again. */
const closeMessages = "for (let i = 0; i < 20 && g.top() === 'message'; i++) await g.tap('a'); await g.advance(3);";

export async function run(h) {
  // machine A: a saved game
  await h.run(
    "g.game.state.playerName = 'Rina'; g.game.state.badges = ['erde', 'wasser']; g.game.state.playFrames = 3600 * 75; g.game.save();",
  );
  const saved = await h.run("return localStorage.getItem('wildlinge-save-test')");
  await openTransfer(h);
  await h.run(select('Exportieren'));
  const [download] = await Promise.all([h.page.waitForEvent('download'), h.run("await g.tap('a'); await g.advance(3)")]);
  if (download.suggestedFilename() !== 'wildlinge-spielstand.json') throw new Error(`file name: ${download.suggestedFilename()}`);
  const file = await download.path();
  const { readFileSync } = await import('node:fs');
  if (readFileSync(file, 'utf8') !== saved) throw new Error('exported file differs from the stored save');
  await h.shot('out/e2e/06-transfer-exported.png');
  await h.run(closeMessages);

  // machine B: a fresh profile with its own save, which the import replaces
  const b = await launch();
  try {
    await b.run("g.game.state.playerName = 'Otto'; g.game.save();");
    await openTransfer(b);
    await b.run(select('Importieren'));
    // a real key press: the browser opens the file picker only with user activation
    const [chooser] = await Promise.all([
      b.page.waitForEvent('filechooser'),
      b.page.keyboard.press('z').then(() => b.run('await g.advance(3)')),
    ]);
    await chooser.setFiles(file);
    await b.run("for (let i = 0; i < 60 && g.game.stack.at(-1).menu == null; i++) { if (g.top() === 'message' && i % 10 === 9) await g.tap('a'); else await g.advance(1); }");
    await b.shot('out/e2e/06-transfer-import-confirm.png');
    await b.run(select('Ja') + "await g.tap('a');" + closeMessages);
    if ((await b.run('return g.top()')) !== 'options') throw new Error('not back in the options after the import');
    await b.run("await g.tap('b'); await g.advance(5)"); // back to the title menu: WEITER now shows the import
    await b.shot('out/e2e/06-transfer-title.png');
    const title = await b.run("const t = g.game.stack[0]; return { first: t.entries[t.index].id, name: g.state.playerName }");
    if (title.first !== 'continue' || title.name !== 'Rina') throw new Error(`title after import: ${JSON.stringify(title)}`);
    const stored = await b.run("return localStorage.getItem('wildlinge-save-test')");
    if (stored !== saved) throw new Error('imported save not written to storage');
    await b.run("await g.tap('a'); await g.waitFor('overworld', 300); await g.advance(30)");
    const result = await b.run('return { stack: g.stack(), name: g.state.playerName, badges: g.state.badges }');
    if (JSON.stringify(result) !== JSON.stringify({ stack: ['overworld'], name: 'Rina', badges: ['erde', 'wasser'] }))
      throw new Error(`continue after import: ${JSON.stringify(result)}`);
    const errors = await b.allErrors();
    if (errors.length) throw new Error(`machine B errors:\n${errors.join('\n')}`);
  } finally {
    await b.close();
  }
}
