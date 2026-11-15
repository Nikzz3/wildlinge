/** Injected by scripts/build.mjs (see scripts/version.mjs); absent when src/ runs unbundled (tests, tsx scripts). */
declare const __WILDLINGE_VERSION__: string | undefined;

/** The game's semver version, e.g. "1.0.3" (local builds: "1.0.0-dev"). */
export const VERSION = typeof __WILDLINGE_VERSION__ === 'string' ? __WILDLINGE_VERSION__ : 'dev';
