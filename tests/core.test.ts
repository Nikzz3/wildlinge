import { describe, expect, it } from 'vitest';
import { bitmapFromRows, flipX, getPixel, recolor } from '../src/core/bitmap';
import { createRng } from '../src/core/rng';
import { measureText, paginate, wrapText } from '../src/engine/text';

describe('bitmap', () => {
  it('parses rows with a palette and treats "." as transparent', () => {
    const b = bitmapFromRows(['#.', '.#'], { '#': '#ff0000' });
    expect(getPixel(b, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(getPixel(b, 1, 0)[3]).toBe(0);
  });

  it('rejects ragged rows and unknown characters', () => {
    expect(() => bitmapFromRows(['##', '#'], { '#': '#fff' })).toThrow(/row 1/);
    expect(() => bitmapFromRows(['#x'], { '#': '#fff' })).toThrow(/"x"/);
  });

  it('flips and recolors without touching transparency', () => {
    const b = bitmapFromRows(['#.'], { '#': '#ff0000' });
    expect(getPixel(flipX(b), 1, 0)).toEqual([255, 0, 0, 255]);
    expect(getPixel(recolor(b, { '#ff0000': '#00ff00' }), 0, 0)).toEqual([0, 255, 0, 255]);
  });
});

describe('rng', () => {
  it('is deterministic per seed and stays in range', () => {
    const a = createRng(42);
    const b = createRng(42);
    const xs = Array.from({ length: 50 }, () => a.int(1, 6));
    expect(xs).toEqual(Array.from({ length: 50 }, () => b.int(1, 6)));
    expect(xs.every((x) => x >= 1 && x <= 6)).toBe(true);
  });
});

describe('text layout', () => {
  it('wraps to the width and keeps forced line breaks', () => {
    const lines = wrapText('eins zwei drei vier fünf sechs sieben acht', 60);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((l) => measureText(l) <= 60)).toBe(true);
    expect(wrapText('a\nb', 200)).toEqual(['a', 'b']);
  });

  it('paginates by line count and on form feeds', () => {
    expect(paginate('a\nb\nc', 200, 2)).toEqual([['a', 'b'], ['c']]);
    expect(paginate('a\fb', 200, 2)).toEqual([['a'], ['b']]);
  });
});
