import type { SaveData } from '../core/types';

interface NativeBridge {
  readSave(): string | null;
  writeSave(json: string): boolean;
}

declare global {
  interface Window {
    wildlingeNative?: NativeBridge;
  }
}

export interface Storage {
  read(): SaveData | null;
  /** The stored save as JSON, exactly as written (null if there is no valid save). */
  raw(): string | null;
  write(state: SaveData): boolean;
  exists(): boolean;
}

function parse(json: string | null): SaveData | null {
  if (!json) return null;
  try {
    const data = JSON.parse(json) as SaveData;
    return data && data.version === 1 && Array.isArray(data.party) ? data : null;
  } catch {
    return null;
  }
}

/** Electron save file when available, else localStorage. Test mode uses a separate key and never touches the real save. */
export function createStorage(testMode: boolean): Storage {
  const native = !testMode ? window.wildlingeNative : undefined;
  const key = testMode ? 'wildlinge-save-test' : 'wildlinge-save';
  const readRaw = (): string | null => {
    try {
      return native ? native.readSave() : window.localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  return {
    read: () => parse(readRaw()),
    raw: () => {
      const json = readRaw();
      return parse(json) ? json : null;
    },
    exists: () => parse(readRaw()) !== null,
    write: (state) => {
      const json = JSON.stringify(state);
      try {
        if (native) return native.writeSave(json);
        window.localStorage.setItem(key, json);
        return true;
      } catch {
        return false;
      }
    },
  };
}
