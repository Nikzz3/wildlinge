/**
 * Turns the packaged macOS app (npm run package -- darwin <arch>) into a Wildlinge-macos-<arch>.dmg:
 * opening it shows Wildlinge.app next to an Applications link, so installing is one drag.
 * The app is ad-hoc signed first (macOS only), otherwise Apple Silicon reports it as "damaged".
 * Usage: node scripts/dmg.mjs [packagedDir] [out.dmg]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arch = process.arch;
const [src = `release/Wildlinge-darwin-${arch}`, out = `release/Wildlinge-macos-${arch}.dmg`] = process.argv.slice(2);
const app = `${src}/Wildlinge.app`;
if (!existsSync(app)) throw new Error(`${app} not found – run: npm run package -- darwin ${arch}`);

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });

run('codesign', ['--force', '--deep', '--sign', '-', app]);

const stage = mkdtempSync(join(tmpdir(), 'wildlinge-dmg-'));
try {
  run('ditto', [app, `${stage}/Wildlinge.app`]); // keeps the bundle's symlinks, modes and signature intact
  symlinkSync('/Applications', `${stage}/Applications`);
  rmSync(out, { force: true });
  // ULMO (LZMA) is the smallest format; it needs macOS 10.15+, Electron itself needs 12+.
  run('hdiutil', ['create', '-volname', 'Wildlinge', '-srcfolder', stage, '-fs', 'HFS+', '-format', 'ULMO', '-ov', out]);
} finally {
  rmSync(stage, { recursive: true, force: true });
}
console.log(`dmg: ${out} (${(statSync(out).size / 1e6).toFixed(0)} MB)`);
