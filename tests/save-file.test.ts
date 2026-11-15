import { describe, expect, it } from 'vitest';
import { parseSaveFile } from '../src/engine/save-file';
import { newGameState } from '../src/state';

const save = () => newGameState({ mapId: 'moosbach', x: 3, y: 4, facing: 'down' });

describe('parseSaveFile', () => {
  it('accepts a save written by the game', () => {
    const s = save();
    s.playerName = 'Rina';
    expect(parseSaveFile(JSON.stringify(s))).toEqual(s);
  });

  it.each([
    ['not JSON', 'hello'],
    ['another JSON file', '{"name":"package"}'],
    ['a future save version', JSON.stringify({ ...save(), version: 2 })],
    ['a missing field', JSON.stringify({ ...save(), badges: undefined })],
    ['a field of the wrong type', JSON.stringify({ ...save(), party: {} })],
  ])('rejects %s', (_, json) => {
    expect(parseSaveFile(json)).toBeNull();
  });
});
