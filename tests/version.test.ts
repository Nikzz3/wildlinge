import { describe, expect, it } from 'vitest';
import { nextVersion, taggedVersion } from '../scripts/version.mjs';

const tag = (name: string, sha = 'old') => ({ name, sha });

describe('nextVersion', () => {
  it('releases one patch above the highest release of the same MAJOR.MINOR', () => {
    const tags = [tag('v1.0.0'), tag('v1.0.9'), tag('v1.0.10'), tag('v0.9.40')];
    expect(nextVersion('1.0.0', tags)).toBe('1.0.11');
  });

  it("starts a new MAJOR.MINOR at package.json's patch", () => {
    expect(nextVersion('1.1.0', [tag('v1.0.7')])).toBe('1.1.0');
    expect(nextVersion('2.0.0', [])).toBe('2.0.0');
  });

  it('ignores tags that are not plain semver releases', () => {
    expect(nextVersion('1.0.0', [tag('v1.0.5-beta'), tag('1.0.8'), tag('v1.0.x')])).toBe('1.0.0');
  });
});

describe('taggedVersion', () => {
  it("returns the commit's release, so re-runs and the website reuse it", () => {
    const tags = [tag('v1.0.3', 'abc'), tag('v1.0.4', 'def')];
    expect(taggedVersion(tags, 'abc')).toBe('1.0.3');
    expect(taggedVersion(tags, 'zzz')).toBeNull();
  });
});
