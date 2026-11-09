import type { Button, Input } from '../core/contracts';
import type { Dir } from '../core/types';

const KEYS: Record<string, Button> = {
  arrowup: 'up', w: 'up',
  arrowdown: 'down', s: 'down',
  arrowleft: 'left', a: 'left',
  arrowright: 'right', d: 'right',
  z: 'a', y: 'a', ' ': 'a', j: 'a',
  x: 'b', backspace: 'b', k: 'b', escape: 'b',
  enter: 'start',
  shift: 'select', tab: 'select',
};

const BUTTONS: readonly Button[] = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];
const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];
const REPEAT_DELAY = 18;
const REPEAT_EVERY = 5;

export class KeyboardInput implements Input {
  private down = new Set<Button>();
  private latch = new Set<Button>();
  private pressedNow = new Set<Button>();
  private holdFrames = new Map<Button, number>();
  private dirOrder: Dir[] = [];
  /** Called once on the first key press (audio unlock). */
  onFirstInput: (() => void) | null = null;

  attach(target: Window): void {
    target.addEventListener('keydown', (e) => {
      const b = KEYS[e.key.toLowerCase()];
      if (!b) return;
      e.preventDefault();
      if (!e.repeat) this.setButton(b, true);
    });
    target.addEventListener('keyup', (e) => {
      const b = KEYS[e.key.toLowerCase()];
      if (b) this.setButton(b, false);
    });
    target.addEventListener('blur', () => {
      for (const b of [...this.down]) this.setButton(b, false);
    });
  }

  /** Programmatic input (keyboard handler and debug API). */
  setButton(b: Button, isDown: boolean): void {
    if (isDown) {
      if (this.onFirstInput) {
        this.onFirstInput();
        this.onFirstInput = null;
      }
      if (!this.down.has(b)) this.latch.add(b);
      this.down.add(b);
      if ((DIRS as readonly string[]).includes(b)) {
        this.dirOrder = this.dirOrder.filter((d) => d !== b);
        this.dirOrder.push(b as Dir);
      }
    } else {
      this.down.delete(b);
      this.dirOrder = this.dirOrder.filter((d) => d !== b);
    }
  }

  /** Call once per frame before scene updates. */
  update(): void {
    this.pressedNow = this.latch;
    this.latch = new Set();
    for (const b of BUTTONS) {
      const held = this.down.has(b) || this.pressedNow.has(b);
      this.holdFrames.set(b, held ? (this.holdFrames.get(b) ?? 0) + 1 : 0);
    }
  }

  held(b: Button): boolean {
    return this.down.has(b);
  }

  pressed(b: Button): boolean {
    return this.pressedNow.has(b);
  }

  repeat(b: Button): boolean {
    if (this.pressedNow.has(b)) return true;
    const n = this.holdFrames.get(b) ?? 0;
    return this.down.has(b) && n >= REPEAT_DELAY && (n - REPEAT_DELAY) % REPEAT_EVERY === 0;
  }

  heldDir(): Dir | null {
    return this.dirOrder[this.dirOrder.length - 1] ?? null;
  }

  consume(): void {
    this.pressedNow = new Set();
    for (const b of BUTTONS) this.holdFrames.set(b, 0);
  }
}
