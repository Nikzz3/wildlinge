/**
 * Runs every scenario in scripts/e2e/*.mjs (each exports `name` and `async run(h)`; throw to fail).
 * Usage: node scripts/e2e.mjs [filter]   (npm run e2e builds first). Screenshots go to out/e2e/.
 */
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { launch } from './lib/harness.mjs';

const filter = process.argv[2] ?? '';
const files = readdirSync('scripts/e2e').filter((f) => f.endsWith('.mjs') && f.includes(filter)).sort();
let failed = 0;
for (const file of files) {
  const mod = await import(pathToFileURL(resolve('scripts/e2e', file)).href);
  const h = await launch(mod.query ? { query: mod.query } : {});
  const t0 = Date.now();
  try {
    await mod.run(h);
    const errors = await h.allErrors();
    if (errors.length) throw new Error(`runtime errors:\n${errors.join('\n')}`);
    console.log(`✔ ${mod.name ?? file} (${Date.now() - t0}ms)`);
  } catch (e) {
    failed++;
    console.log(`✘ ${mod.name ?? file}\n  ${String(e.stack ?? e).split('\n').join('\n  ')}`);
    await h.shot(`out/e2e/FAILED-${file.replace('.mjs', '')}.png`).catch(() => {});
  } finally {
    await h.close();
  }
}
console.log(failed ? `${failed} scenario(s) failed` : `all ${files.length} scenario(s) passed`);
process.exit(failed ? 1 : 0);
