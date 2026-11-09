/**
 * Packages the built game (dist/) + electron/ into a desktop app under release/.
 * Usage: npm run package [-- <platform> <arch>]   (defaults: current platform/arch)
 * Uses build/icon.icns (macOS) / build/icon.ico (Windows) / build/icon.png when present.
 * Windows from macOS: npm run package -- win32 x64
 */
import { packager } from '@electron/packager';
import { existsSync } from 'node:fs';

const [platform = process.platform, arch = process.arch] = process.argv.slice(2);
const icon = { darwin: 'build/icon.icns', win32: 'build/icon.ico' }[platform] ?? 'build/icon.png';

const paths = await packager({
  dir: '.',
  out: 'release',
  overwrite: true,
  platform,
  arch,
  name: 'Wildlinge',
  executableName: 'wildlinge',
  appBundleId: 'ch.wildlinge.alpengluehen',
  appCategoryType: 'public.app-category.role-playing-games',
  icon: existsSync(icon) ? icon : undefined,
  asar: true,
  prune: true,
  // Only electron/, dist/ and package.json belong in the app.
  ignore: (file) => file !== '' && !/^\/(electron|dist)(\/|$)|^\/package\.json$/.test(file),
});
console.log(`packaged: ${paths.join(', ')}`);
