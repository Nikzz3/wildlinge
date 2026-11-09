import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  outfile: 'dist/game.js',
  sourcemap: true,
  logLevel: 'warning',
});
copyFileSync('src/index.html', 'dist/index.html');
console.log('built dist/');
