import { build } from 'esbuild';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { buildVersion } from './version.mjs';

const version = await buildVersion();
mkdirSync('dist', { recursive: true });
await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  outfile: 'dist/game.js',
  sourcemap: true,
  logLevel: 'warning',
  define: { __WILDLINGE_VERSION__: JSON.stringify(version) },
});
copyFileSync('src/index.html', 'dist/index.html');
// read by package.mjs (app metadata) and build-site.mjs (website's version.json)
writeFileSync('dist/version.json', JSON.stringify({ version }));
console.log(`built dist/ (v${version})`);
