/** Font metrics and word wrapping (pure; shared by Gfx and UI components). */
import { FONT } from '../art/font';

export const LINE_HEIGHT = 16;
/** Vertical offset of the glyph box inside a 16px line. */
export const GLYPH_OFFSET_Y = Math.max(0, Math.floor((LINE_HEIGHT - FONT.height) / 2));

const FALLBACK = '?';

export function glyphFor(ch: string) {
  return FONT.glyphs[ch] ?? FONT.glyphs[FALLBACK];
}

export function charAdvance(ch: string): number {
  if (ch === ' ') return FONT.spaceWidth + FONT.spacing;
  return (glyphFor(ch)?.w ?? 5) + FONT.spacing;
}

export function measureText(text: string): number {
  let w = 0;
  for (const ch of text) w += charAdvance(ch);
  return Math.max(0, w - (text.length > 0 ? FONT.spacing : 0));
}

/** Greedy wrap; honors '\n'. Very long words are split by character. */
export function wrapText(text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (measureText(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) out.push(line);
      line = '';
      let rest = word;
      while (measureText(rest) > maxWidth) {
        let cut = rest.length - 1;
        while (cut > 1 && measureText(rest.slice(0, cut)) > maxWidth) cut--;
        out.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    out.push(line);
  }
  return out;
}

/** Splits text into pages of `lines` lines. '\f' forces a page break. */
export function paginate(text: string, maxWidth: number, lines: number): string[][] {
  const pages: string[][] = [];
  for (const chunk of text.split('\f')) {
    const wrapped = wrapText(chunk, maxWidth);
    for (let i = 0; i < wrapped.length; i += lines) pages.push(wrapped.slice(i, i + lines));
  }
  return pages.length ? pages : [['']];
}
