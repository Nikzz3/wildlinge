/**
 * Launches the real Electron app (dev: electron/main.cjs, or a packaged binary via argv[2]),
 * checks that the title screen renders, saving goes through the native bridge, and no errors occur.
 * Usage: npm run build && node scripts/electron-smoke.mjs [path/to/packaged/executable]
 */
import { _electron as electron } from 'playwright';
import { mkdirSync } from 'node:fs';

const executablePath = process.argv[2];
const app = await electron.launch(executablePath ? { executablePath, args: [] } : { args: ['.'] });
const errors = [];
try {
  const win = await app.firstWindow();
  win.on('pageerror', (e) => errors.push(String(e.stack || e)));
  win.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await win.waitForFunction(() => !!window.__game, null, { timeout: 15000 });
  await win.waitForTimeout(1500);
  const info = await win.evaluate(() => ({
    top: window.__game.top(),
    native: typeof window.wildlingeNative?.writeSave === 'function',
    errors: window.__game.errors.slice(),
  }));
  if (!info.native) throw new Error('native save bridge missing');
  if (info.errors.length) errors.push(...info.errors);
  mkdirSync('out/electron', { recursive: true });
  await win.screenshot({ path: 'out/electron/title.png' });
  const userData = await app.evaluate(({ app }) => app.getPath('userData'));
  console.log(`top scene: ${info.top}, userData: ${userData}`);
  if (errors.length) throw new Error(`errors:\n${errors.join('\n')}`);
  console.log('✔ electron smoke passed (screenshot: out/electron/title.png)');
} finally {
  await app.close();
}
