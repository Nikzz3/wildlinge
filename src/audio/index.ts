import type { AudioApi } from '../core/contracts';
import type { MusicId } from '../core/types';
import { AudioEngine } from './engine';

/**
 * Chiptune audio (Web Audio). The AudioContext is created on the first unlock() (first user
 * gesture); until then playMusic only remembers the track and everything else is silent.
 * Never throws: without Web Audio (Node tests) every call is a no-op and jingles resolve at once.
 */
export function createAudio(): AudioApi {
  let current: MusicId | null = null;
  let volumes: [number, number] = [0.8, 0.8];
  let engine: AudioEngine | null = null;
  let unavailable = false;

  const guard = (fn: () => void): void => {
    try {
      fn();
    } catch (err) {
      console.warn('[audio]', err);
    }
  };

  return {
    playMusic(id) {
      if (id === current) return;
      current = id;
      guard(() => engine?.setMusic(id));
    },
    currentMusic: () => current,
    playJingle(id) {
      try {
        return engine ? engine.playJingle(id) : Promise.resolve();
      } catch (err) {
        console.warn('[audio]', err);
        return Promise.resolve();
      }
    },
    playSfx(id) {
      guard(() => engine?.playSfx(id));
    },
    playCry(speciesId, opts) {
      guard(() => engine?.playCry(speciesId, opts));
    },
    setVolumes(music, sfx) {
      volumes = [music, sfx];
      guard(() => engine?.setVolumes(music, sfx));
    },
    unlock() {
      guard(() => {
        if (!engine && !unavailable) {
          engine = AudioEngine.create();
          unavailable = engine === null;
          engine?.setVolumes(...volumes);
          engine?.setMusic(current);
        }
        engine?.resume();
      });
    },
  };
}
