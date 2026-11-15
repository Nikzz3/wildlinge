/**
 * Game version (semver). package.json holds MAJOR.MINOR (bumped by hand); every master build
 * releases the next PATCH: the release workflow tags v<version>, and the build bakes it into the game.
 * Usage: node scripts/version.mjs   (prints the version for $GITHUB_SHA: its existing tag, or the next one)
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const REPO = 'Nikzz3/wildlinge';
const SEMVER_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;

/** @typedef {{ name: string, sha: string }} Tag */

/** The version a commit is already tagged with, if any (re-runs and the website build reuse it). */
export function taggedVersion(/** @type {Tag[]} */ tags, /** @type {string} */ sha) {
  return tags.find((t) => t.sha === sha && SEMVER_TAG.test(t.name))?.name.slice(1) ?? null;
}

/** The next release for package.json's MAJOR.MINOR: one above its highest released patch. */
export function nextVersion(/** @type {string} */ base, /** @type {Tag[]} */ tags) {
  const [major, minor, patch] = base.split('.').map(Number);
  const released = tags
    .map((t) => SEMVER_TAG.exec(t.name))
    .filter((m) => m && Number(m[1]) === major && Number(m[2]) === minor)
    .map((m) => Number(m[3]));
  return `${major}.${minor}.${Math.max(patch, ...released.map((p) => p + 1))}`;
}

export function packageVersion() {
  return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
}

/** All tags of the repo (lightweight tags point straight at their commit). */
export async function fetchTags() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${REPO}/git/matching-refs/tags/v`, {
    headers: { Accept: 'application/vnd.github+json', ...(token && { Authorization: `Bearer ${token}` }) },
  });
  if (!res.ok) throw new Error(`GitHub tags: HTTP ${res.status}`);
  const refs = await res.json();
  return refs.map((r) => ({ name: r.ref.replace('refs/tags/', ''), sha: r.object.sha }));
}

/**
 * Version baked into a build: $WILDLINGE_VERSION (set by the release workflow), else the release tag of
 * $RAILWAY_GIT_COMMIT_SHA (the website is deployed after the release of its commit), else a dev version.
 */
export async function buildVersion() {
  if (process.env.WILDLINGE_VERSION) return process.env.WILDLINGE_VERSION;
  const dev = `${packageVersion()}-dev`;
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA;
  if (!sha) return dev;
  try {
    const version = taggedVersion(await fetchTags(), sha);
    if (version) return version;
    console.warn(`no release tag for ${sha}, using ${dev}`);
  } catch (err) {
    console.warn(`release tag lookup failed (${err}), using ${dev}`);
  }
  return dev;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const sha = process.env.GITHUB_SHA;
  if (!sha) throw new Error('GITHUB_SHA is not set');
  const tags = await fetchTags();
  console.log(taggedVersion(tags, sha) ?? nextVersion(packageVersion(), tags));
}
