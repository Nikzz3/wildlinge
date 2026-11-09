/** Playwright harness: launches the built game (dist/) in headless Chromium and exposes helpers. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * @param {{ query?: string, headless?: boolean }} [opts] query defaults to 'test=1&manual=1'
 * run(code): evaluates an async function body in the page (window.__game is available as __game) and returns its result.
 * shot(file): screenshot of the 240x160 canvas at 3x.
 */
export async function launch({ query = 'test=1&manual=1', headless = true } = {}) {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ viewport: { width: 720, height: 480 }, bypassCSP: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.stack || e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(pathToFileURL(resolve('dist/index.html')).href + '?' + query);
  await page.waitForFunction(() => !!window.__game);
  const run = (code) => page.evaluate(`(async () => { const g = window.__game; ${code} })()`);
  const shot = async (file) => {
    mkdirSync(dirname(file), { recursive: true });
    await page.evaluate(() => window.__game.game.render());
    await page.locator('canvas').screenshot({ path: file });
    return file;
  };
  const allErrors = async () => [...errors, ...(await page.evaluate(() => window.__game.errors.slice()))];
  return { browser, page, run, shot, allErrors, close: () => browser.close() };
}
