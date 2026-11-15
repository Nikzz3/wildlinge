/**
 * Turns the packaged Linux app (npm run package -- linux x64) into a single Wildlinge-linux-x64.AppImage
 * with a launcher entry and icon, so Gear Lever / AppImageLauncher can install it as a normal app.
 * Uses the static type2 runtime: needs only FUSE (fusermount3), no libfuse2 – works on Fedora Atomic / Bazzite.
 * Usage: node scripts/appimage.mjs [packagedDir] [out.AppImage]
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [src = 'release/Wildlinge-linux-x64', out = 'release/Wildlinge-linux-x64.AppImage'] = process.argv.slice(2);

// Pinned tools, verified by checksum.
const TOOLS = {
  appimagetool: {
    url: 'https://github.com/AppImage/appimagetool/releases/download/1.9.1/appimagetool-x86_64.AppImage',
    sha256: 'ed4ce84f0d9caff66f50bcca6ff6f35aae54ce8135408b3fa33abfc3cb384eb0',
  },
  runtime: {
    url: 'https://github.com/AppImage/type2-runtime/releases/download/20251108/runtime-x86_64',
    sha256: '2fca8b443c92510f1483a883f60061ad09b46b978b2631c807cd873a47ec260d',
  },
};

async function tool(name) {
  const { url, sha256 } = TOOLS[name];
  const path = resolve('node_modules/.cache/appimage', `${name}-${sha256.slice(0, 12)}`);
  if (!existsSync(path)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download ${url}: ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== sha256) throw new Error(`checksum mismatch for ${name}: ${actual}`);
    mkdirSync(resolve(path, '..'), { recursive: true });
    writeFileSync(path, bytes, { mode: 0o755 });
  }
  return path;
}

if (!existsSync(`${src}/wildlinge`)) throw new Error(`${src}/wildlinge not found – run: npm run package -- linux x64`);

const appDir = resolve('release/Wildlinge.AppDir');
rmSync(appDir, { recursive: true, force: true });
cpSync(src, appDir, { recursive: true, verbatimSymlinks: true });

// Desktop entry + icon at the AppDir root; integrators copy them into the user's app menu.
// StartupWMClass matches the window's Wayland app_id (from "desktopName" in package.json) and X11
// instance name, so the running window shows this icon in the taskbar instead of a generic one.
writeFileSync(
  `${appDir}/wildlinge.desktop`,
  `[Desktop Entry]
Type=Application
Name=Wildlinge
GenericName=Monster-Sammel-RPG
Comment=Wildlinge – Alpenglühen: ein Monster-Sammel-Rollenspiel im Retro-Pixelstil
Exec=wildlinge %U
Icon=wildlinge
Terminal=false
Categories=Game;RolePlaying;
Keywords=RPG;Pixel;Monster;
StartupWMClass=wildlinge
`,
);
// Integrators (libappimage, Gear Lever) look for the icon in hicolor/<size>/apps first; 1024 px is not a
// hicolor size and AppImageLauncher fails to install it from .DirIcon, so ship the 256 px one everywhere.
const iconDir = `${appDir}/usr/share/icons/hicolor/256x256/apps`;
mkdirSync(iconDir, { recursive: true });
for (const to of [`${iconDir}/wildlinge.png`, `${appDir}/wildlinge.png`, `${appDir}/.DirIcon`]) copyFileSync('build/icon-256.png', to);

// Chromium's sandbox needs unprivileged user namespaces (the setuid chrome-sandbox helper can't
// work from a read-only AppImage mount). Fedora/Bazzite allow them; Ubuntu 24.04+ restricts them via
// AppArmor, where Electron would crash at start – there, fall back to --no-sandbox. The game only
// loads its own bundled files.
writeFileSync(
  `${appDir}/AppRun`,
  `#!/bin/sh
HERE="$(dirname "$(readlink -f "$0")")"
if ! unshare -Ur true 2>/dev/null; then set -- --no-sandbox "$@"; fi
exec "$HERE/wildlinge" "$@"
`,
);
chmodSync(`${appDir}/AppRun`, 0o755);

const [appimagetool, runtime] = [await tool('appimagetool'), await tool('runtime')];
rmSync(out, { force: true });
execFileSync(appimagetool, ['--no-appstream', '--runtime-file', runtime, appDir, out], {
  stdio: 'inherit',
  // Run the tool without mounting it, so building doesn't need FUSE (CI containers).
  env: { ...process.env, ARCH: 'x86_64', APPIMAGE_EXTRACT_AND_RUN: '1' },
});
rmSync(appDir, { recursive: true });
console.log(`appimage: ${out} (${(readFileSync(out).length / 1e6).toFixed(0)} MB)`);
