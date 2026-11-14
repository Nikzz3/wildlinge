/**
 * Assembles the download website into _site/: website/ + the browser build of the game under play/
 * + version.json (read by website/main.js). Used by CI and for manual deploys.
 * Usage: npm run site
 */
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const commit = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || gitHead();

function gitHead() {
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
}

rmSync('_site', { recursive: true, force: true });
cpSync('website', '_site', { recursive: true, filter: (src) => !/(Dockerfile|Caddyfile)$/.test(src) });
mkdirSync('_site/play');
for (const f of ['index.html', 'game.js']) cpSync(`dist/${f}`, `_site/play/${f}`);
writeFileSync('_site/version.json', JSON.stringify({ version, commit }));

// Cloudflare caches .css/.js for hours while HTML is always fresh, so new HTML would run against
// old styles/scripts after a deploy. Versioned URLs make every deploy fetch matching assets.
const v = commit.slice(0, 12);
for (const [html, assets] of [['_site/index.html', ['style.css', 'main.js']], ['_site/play/index.html', ['game.js']]]) {
  let src = readFileSync(html, 'utf8');
  for (const a of assets) {
    const ref = `"${a}"`;
    if (!src.includes(ref)) throw new Error(`${html}: no reference to ${a}`);
    src = src.replaceAll(ref, `"${a}?v=${v}"`);
  }
  writeFileSync(html, src);
}
console.log(`assembled _site/ (v${version})`);
