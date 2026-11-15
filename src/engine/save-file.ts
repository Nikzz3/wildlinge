/** Save transfer between machines: the save as a downloadable .json file, and a file picker to bring one back. */
import type { SaveData } from '../core/types';
import { newGameState } from '../state';

export const SAVE_FILE_NAME = 'wildlinge-spielstand.json';

/** Shape reference: a save must have every field of a new game with the same JSON type. */
const TEMPLATE = newGameState({ mapId: '', x: 0, y: 0, facing: 'down' });
const kind = (v: unknown) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);

/** Parses an imported save file. Null if it is not a version-1 Wildlinge save. */
export function parseSaveFile(json: string): SaveData | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (kind(data) !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.version !== 1) return null;
  for (const [key, value] of Object.entries(TEMPLATE) as [string, unknown][]) if (kind(d[key]) !== kind(value)) return null;
  return data as SaveData;
}

/** Offers `json` as a file download (Electron shows a save dialog, browsers save to Downloads). */
export function downloadSave(json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = SAVE_FILE_NAME;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Opens the system file picker and resolves with the chosen file's text (null if canceled or unreadable).
 * Must run shortly after a key press: browsers only open the picker with recent user activation.
 */
export function pickSaveFile(): Promise<string | null> {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  return new Promise((resolve) => {
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        file.text().then(resolve, () => resolve(null));
      },
      { once: true },
    );
    input.click();
  });
}
