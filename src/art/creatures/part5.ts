/**
 * Creature art, part 5: guggerli, foehngeier, bernhardin, wyssli, edelwyss, firngeist.
 * Same style as src/art/creatures/part1.ts (coordinates in 48×48 space, ground line y ≈ 45,
 * creatures face left).
 */
import { beads, circ, type CreatureDef, type CreatureDefs, curve, ell, line, type Part, pixels, poly, type Pt, rect, type Shape } from '../shapes';

const EYE = { k: '#202028', w: '#f8f8f8' };
const SNOWFLAKE = ['.w.w.', 'wwiww', '.iwi.', 'wwiww', '.w.w.'];

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Pointed spike from base (x, y), `len` long, base `wid` wide, pointing at `deg`. */
function spike(x: number, y: number, len: number, wid: number, deg: number): Shape {
  const [c, s] = [Math.cos(rad(deg)), Math.sin(rad(deg))];
  const h = wid / 2;
  return poly([x - s * h, y + c * h], [x + c * len, y + s * len], [x + s * h, y - c * h]);
}

/** Points of a spiral around (cx, cy): from radius r0 at angle a0 (degrees, clockwise from +x) winding `turns` times to r1. */
function spiral(cx: number, cy: number, r0: number, r1: number, a0: number, turns: number): Pt[] {
  const n = Math.max(4, Math.round(turns * 10));
  return Array.from({ length: n + 1 }, (_, i) => {
    const f = i / n;
    const a = rad(a0 + f * turns * 360);
    const r = r0 + (r1 - r0) * f;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt;
  });
}

/** Pointed petal (bract, feather) from its base (x, y): round base, widest at a third, sharp tip; `len` long, `wid` wide, pointing at `deg`. */
function petal(x: number, y: number, len: number, wid: number, deg: number): Shape {
  const [c, s] = [Math.cos(rad(deg)), Math.sin(rad(deg))];
  const P = (u: number, v: number): Pt => [x + u * c - v * s, y + u * s + v * c];
  const prof = [0, 0.3, 0.55, 0.8, 0.95, 1, 0.92, 0.75, 0.52, 0.28, 0];
  const side = prof.map((k, i) => [(i / (prof.length - 1)) * len, (k * wid) / 2] as const);
  return poly(...side.map(([u, v]) => P(u, -v)), ...side.slice(1, -1).reverse().map(([u, v]) => P(u, v)));
}

/** Coil spring from a to b: `n` flat rings across the path, `r` wide. One part per ring so each gets a contour. */
function coil(a: Pt, b: Pt, n: number, r: number, c: string): Part[] {
  const deg = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI + 90;
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return { c, s: ell(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r, r * 0.42, deg) };
  });
}

/** Vulture wing from the shoulder (right wing; mirrored for the left one, its tip raised by `lift`): long arm, five fingered primaries, serrated trailing edge, pale shafts. */
function vultureWing(mirror: boolean, lift: number): { wing: Shape; shafts: Shape[] } {
  const p = (x: number, y: number): Pt => (mirror ? [49 - x, y - lift * Math.max(0, (x - 28) / 20)] : [x, y]);
  const wing = poly(
    p(28, 19), p(32, 15.5), p(37, 13), p(41, 11.5), p(47.5, 10.5), p(43.5, 13.6), p(47.6, 14.6), p(43.4, 16.6), p(47, 18.8), p(42.8, 19.6),
    p(45.5, 22.8), p(41.2, 22), p(42.5, 25.8), p(38.8, 24), p(37.5, 26.5), p(36, 25), p(34.5, 27.5), p(33, 26), p(31.5, 28), p(28, 27),
  );
  const shafts = [
    [p(41.5, 12.6), p(46, 11)], [p(42, 15), p(46.2, 14.6)], [p(41.8, 17.6), p(45.5, 18.6)], [p(40.5, 20.5), p(43.8, 22.4)], [p(39, 22.5), p(41.5, 25)],
    [p(34, 22), p(36.5, 25)], [p(31.5, 23), p(33.5, 26.5)],
  ].map(([a, b]) => line(0.5, a!, b!));
  return { wing, shafts };
}

export const PART5: CreatureDefs = {
  // -------------------------------------------------------------------------
  // #035 Guggerli – carved clockwork cuckoo popping forward on its spring neck, "Gugger!"
  // -------------------------------------------------------------------------
  guggerli: {
    pal: {
      wood: ['#c08a50', '#8a5a30', '#6a4022', '#2e1a0c'], carv: ['#e0b878', '#c09050', '#9a7038', '#3e2810'], brass: ['#f8e888', '#d0b040', '#a08428', '#4a3a10'],
      spring: ['#e8f0f8', '#a8b0b8', '#7a8494', '#303844'], clock: '#f8f0e0', mouth: '#b83838', dark: '#3a2414',
    },
    parts: [
      // far wing: brass blade raised behind the back
      { c: 'brass', s: poly([30, 30], [35, 25], [41.5, 20.5], [40, 24], [44, 23], [41, 27], [44, 28], [38, 31]), dim: true },
      // pendulum tail swinging out behind
      { c: 'brass', s: line(1.3, [36, 37], [41.5, 41.5]) },
      { c: 'brass', s: circ(42.5, 42.5, 3) },
      pixels([41, 41], { w: '#fff8d0' }, ['w'], { detail: true }),
      // little feet
      { c: 'dark', s: [line(1.3, [26, 41], [25, 44.5]), line(1.3, [31, 41], [31.5, 44.5])] },
      { c: 'dark', s: [line(1, [22.5, 45], [27, 45]), line(1, [29.5, 45], [34, 45])] },
      // carved wooden body with leaf patterns
      { c: 'wood', s: ell(29.5, 35, 9.5, 7.5, -15) },
      { c: 'carv', s: [petal(25, 40.5, 4.2, 2.2, 15), petal(28.5, 40.8, 4.2, 2.2, 10), petal(32, 40.3, 4.2, 2.2, 0), petal(35.5, 38.8, 3.6, 2, -15)], mark: true, line: true, detail: true },
      { c: 'carv', s: [petal(30, 29.2, 3.6, 2, -125), petal(33.5, 28, 3.6, 2, -80), petal(37, 28.5, 3.6, 2, -40)], mark: true, line: true, detail: true },
      // clock face on the chest
      { c: 'brass', s: circ(22.5, 37, 3.6), face: true },
      { c: 'clock', s: circ(22.5, 37, 2.6), flat: true, face: true },
      pixels([21.5, 35.5], { h: 'dark' }, ['.h.', '.h.', '.hh'], { face: true, detail: true }),
      // near wing: a thin brass blade with feather notches
      { c: 'brass', s: poly([27, 33.5], [32, 30.5], [37, 29], [43, 27], [40.5, 30], [44, 31], [40.5, 33], [42.5, 35], [36.5, 35.5], [31, 37.5]) },
      { c: 'brass', s: [line(0.6, [32, 32.3], [40.5, 29.6]), line(0.6, [32, 34.6], [40.5, 33])], mark: true, dim: true, detail: true },
      pixels([28.5, 33], { r: '#4a3a10', w: '#fff8d0' }, ['wr', 'rr']),
      // spring neck popping forward
      ...coil([25, 30.5], [15, 20.5], 6, 3.3, 'spring'),
      // head with a swept-back carved crest, beak wide open: "Gugger!"
      { c: 'carv', s: curve([2.6, 2, 1.2], [13, 10.5], [14, 6.5], [17.5, 4.5], [20, 6], [18.5, 8]) },
      { c: 'mouth', s: poly([9, 13.5], [2.5, 14], [3, 19.8], [9, 19]), flat: true, face: true },
      { c: 'wood', s: circ(13, 15.5, 6.2) },
      { c: 'carv', s: ell(14, 19.5, 3.5, 1.6), mark: true, face: true },
      { c: 'brass', s: poly([9.5, 11], [0.6, 12.4], [9.5, 15.2]) },
      { c: 'brass', s: poly([9.5, 18], [1.4, 21.6], [9.5, 21.2]), face: true },
      pixels([4.5, 18.5], { t: '#e87878' }, ['.tt', 'ttt'], { face: true, detail: true }),
      pixels([10, 13], EYE, ['.kk.', 'kwkk', 'kkkk', 'kkkk', '.kk.'], { face: true }),
    ],
  },

  // -------------------------------------------------------------------------
  // #039 Föhngeier – bearded vulture soaring, wings spread, head turned down to the viewer
  // -------------------------------------------------------------------------
  foehngeier: ((): CreatureDef => {
    const far = vultureWing(true, 2.5);
    const near = vultureWing(false, 0);
    return {
      pal: {
        rust: ['#f0a050', '#d07830', '#a85a24', '#4a200c'], slate: ['#58626e', '#384048', '#262c34', '#101418'], cream: '#f0e0c0', ring: '#e03838',
        wind: '#88c8e0', beak: ['#e0d8c8', '#b0a898', '#807a6c', '#302c28'], beard: '#1c1c1c',
      },
      parts: [
        // warm wind swirling around the wingtips
        { c: 'wind', s: [curve(1, ...spiral(4.5, 28, 0.5, 3.2, 0, 1.2)), curve(1, [8, 31.5], [12, 32], [16, 30])], flat: true, outline: false, detail: true },
        { c: 'wind', s: [curve(1, ...spiral(44.5, 29, 0.5, 3.2, 180, -1.2)), curve(1, [41, 32.5], [37, 33], [33, 31])], flat: true, outline: false, detail: true },
        // far wing (left), tip raised a little
        { c: 'slate', s: far.wing, dim: true },
        { c: 'cream', s: far.shafts, mark: true, detail: true },
        // long wedge tail
        { c: 'slate', s: poly([21.5, 30], [27.5, 30], [27.8, 37.5], [24.5, 43.5], [21.2, 37.5]) },
        { c: 'cream', s: line(0.5, [24.5, 33], [24.5, 40.5]), mark: true, flat: true, detail: true },
        // near wing (right)
        { c: 'slate', s: near.wing },
        { c: 'cream', s: near.shafts, mark: true, detail: true },
        { c: 'cream', s: curve(0.8, [29, 18.5], [33, 15.5], [37.5, 13.5], [41, 12.3]), mark: true, flat: true, detail: true },
        // slim rust body, feathered legs with talons tucked
        { c: 'rust', s: ell(24.5, 26, 5, 7.5) },
        { c: 'slate', s: ell(24.5, 26.5, 4.6, 7), mark: true, backOnly: true },
        { c: 'rust', s: [ell(22.5, 31.5, 1.8, 2.2), ell(26.5, 31.5, 1.8, 2.2)], dim: true },
        pixels([21, 33.5], { t: 'beard' }, ['t.t', '.t.'], { detail: true }),
        pixels([25.5, 33.5], { t: 'beard' }, ['t.t', '.t.'], { detail: true }),
        // head turned down toward the viewer: black mask through red-ringed eyes, hooked beak, bristle beard
        { c: 'rust', s: beads([1.8, 2.2, 1.8], 1.6, [19.5, 18], [24.5, 20.5], [29.5, 18]) },
        { c: 'rust', s: ell(24.5, 13.8, 6, 5.4) },
        pixels([19, 10.5], { r: 'ring', y: '#f8f0c0', k: '#141414', b: '#c8c0b0', d: '#8a8478', h: '#4a4438' }, [
          '.rr.....rr.',
          'rykk...kkyr',
          '.rrkk.kkrr.',
          '....kbdk...',
          '....bbd....',
          '....bbd....',
          '...kbbdk...',
          '...kkbdkk..',
          '...kkkhk...',
          '....kkk....',
          '....k.k....',
        ], { face: true }),
      ],
    };
  })(),

  // -------------------------------------------------------------------------
  // #040 Bernhardin – big gentle rescue dog standing, tongue out, tail mid-wag
  // -------------------------------------------------------------------------
  bernhardin: {
    pal: {
      fur: ['#ffffff', '#f0f0f0', '#c4d0dc', '#405870'], frost: ['#a8d0e8', '#7ab0d0', '#5888b0', '#304868'],
      ice: ['#ffffff', '#d8f0fc', '#a8d0e8', '#405870'], barrel: '#a06a40', hoop: '#5a3a20', collar: '#c83030', tongue: '#e87888',
      nose: '#283040',
    },
    parts: [
      // tail mid-wag, curled up
      { c: 'fur', s: curve([5, 4.5, 3.5, 2.2], [40, 27], [44, 22], [45.5, 16], [43.5, 12]) },
      { c: 'frost', s: curve([3, 2.2], [45.3, 15], [43.5, 12]), mark: true },
      pixels([46.5, 9], { w: 'frost' }, ['w.', '.w', '.w'], { detail: true }),
      // far legs
      { c: 'fur', s: rect(37.5, 32, 5.5, 13, 2.5), dim: true },
      { c: 'fur', s: rect(19.5, 33, 5.5, 12, 2.5), dim: true },
      // heavy body, frost saddle
      { c: 'fur', s: [ell(30, 29, 14, 9.5), ell(20, 30, 8, 8)] },
      { c: 'frost', s: [ell(32, 23.5, 10.5, 5.5, 5), ell(42, 27, 3, 5)], mark: true },
      // icicles hanging from the belly fringe
      { c: 'ice', s: [spike(22, 37.5, 3.5, 1.6, 95), spike(27, 38.5, 4, 1.6, 90), spike(31, 38.5, 3, 1.4, 88), spike(35, 37.5, 3.5, 1.6, 92)], line: false },
      // near legs
      { c: 'fur', s: [ell(38, 33, 6, 7), rect(34, 33, 6.5, 12, 3)] },
      { c: 'fur', s: rect(14.5, 33, 6.5, 12, 3) },
      { c: 'fur', s: [line(0.6, [16.5, 44.5], [16.5, 43]), line(0.6, [18.5, 44.5], [18.5, 43]), line(0.6, [36.5, 44.5], [36.5, 43]), line(0.6, [38.5, 44.5], [38.5, 43])], mark: true, dim: true, detail: true },
      // red collar with the little barrel
      { c: 'collar', s: curve(2.4, [9, 26.5], [14, 29], [21, 27.5]) },
      { c: 'barrel', s: rect(10.5, 29, 6, 5, 1.5) },
      { c: 'hoop', s: [line(0.7, [12, 29.2], [12, 33.8]), line(0.7, [15, 29.2], [15, 33.8])], mark: true },
      // big head: frost mask around the eyes, white blaze, droopy ears, heavy jowls, tongue out
      { c: 'frost', s: ell(7.5, 12.5, 2.6, 4.5, 30), dim: true },
      { c: 'fur', s: [ell(14, 16.5, 8, 7), ell(8.5, 21.5, 6, 4.2)] },
      { c: 'frost', s: [ell(9.5, 14, 3.6, 3.4), ell(16.5, 14, 5, 4.4), ell(15, 9.5, 6, 2)], mark: true },
      { c: 'fur', s: curve([2.4, 3.6], [8.5, 19], [11.5, 14], [12.5, 9]), mark: true },
      { c: 'tongue', s: [ell(7.5, 27, 2.2, 3), ell(8, 25, 2.5, 1.2)], face: true },
      { c: 'fur', s: [ell(5.5, 24, 3.5, 2.6), ell(11.5, 25, 4, 2.8)] },
      { c: 'ice', s: [spike(5, 26, 2.5, 1.2, 95), spike(12, 27.5, 3, 1.3, 90)], line: false, detail: true },
      { c: 'frost', s: ell(20, 19.5, 3.4, 6.5, -12) },
      pixels([2.5, 19.5], { n: 'nose', w: '#7888a0' }, ['wnn', 'nnn', '.n.'], { face: true }),
      pixels([8.5, 14], EYE, ['kk', 'wk', 'kk'], { face: true }),
      pixels([14, 14], EYE, ['.kk.', 'kwkk', 'kkkk', '.kk.'], { face: true }),
    ],
  },

  // -------------------------------------------------------------------------
  // #041 Wyssli – tiny edelweiss sprite clinging to a rock ledge, bracts spread, peeking over
  // -------------------------------------------------------------------------
  wyssli: ((): CreatureDef => {
    const [cx, cy] = [23.5, 30];
    const near = [-162, -90, -18, 54, 126];
    const tip = (d: number, r: number): Pt => [cx + Math.cos(rad(d)) * r, cy + Math.sin(rad(d)) * r];
    return {
      pal: {
        felt: ['#ffffff', '#f8f8f0', '#d8d8c8', '#6a6a58'], face: ['#fffff8', '#fcf8ec', '#e4dcc8', '#6a6a58'], tipc: '#d4dcc0',
        gold: ['#fff4b0', '#f0d878', '#d0b050', '#6a5420'], leaf: '#58b048', glow: '#fff8d0', root: '#e8dcb0', rock: '#8a8478',
      },
      parts: [
        // rock ledge
        { c: 'rock', s: poly([9, 47], [11, 41.5], [16, 39], [31, 38.5], [37, 41], [39, 47]) },
        { c: '#a8a296', s: poly([11.5, 41.2], [16, 39], [31, 38.5], [36.5, 40.8], [31, 41], [17, 41.4]), mark: true },
        { c: '#6a6458', s: [line(0.7, [15, 43], [17, 45.5]), line(0.7, [32, 42.5], [33.5, 44.5])], mark: true, detail: true },
        // fine root threads gripping the ledge and hanging over its edge
        {
          c: 'root',
          s: [
            curve([1, 0.5], [20, 35], [16.5, 38.5], [12.5, 40], [11.5, 43]), curve([1, 0.5], [27, 35], [30.5, 38.5], [34.5, 39.8], [35.5, 42.5]),
            curve([0.9, 0.4], [21.5, 37], [19, 39.5], [17.5, 42.5]), curve([0.9, 0.4], [25.5, 37], [28, 39.5], [29.5, 42.5]),
          ],
          outline: false,
        },
        // narrow green leaves behind the rosette
        { c: 'leaf', s: [petal(cx, cy + 1, 13, 3.4, 168), petal(cx, cy + 1, 13, 3.4, 12)] },
        // star of woolly felt bracts with grey-green tips
        { c: 'felt', s: [-126, -54, 18, 162].map((d) => petal(cx, cy, 12, 5.4, d)), dim: true },
        { c: 'felt', s: near.map((d) => petal(cx, cy, 13.5, 6.4, d)) },
        { c: 'tipc', s: near.map((d) => circ(...tip(d, 12.5), 2)), mark: true },
        // round sleepy face, fluffy golden topknot
        { c: 'face', s: circ(cx, cy + 1.2, 5.8) },
        { c: 'gold', s: [[-3.2, -3.6, 1.7], [-1.7, -5.7, 1.8], [0.2, -6.6, 1.7], [2, -5.6, 1.8], [3.4, -3.6, 1.7], [0, -3.8, 2.6]].map(([u, v, r]) => circ(cx + u!, cy + v!, r!)) },
        pixels([cx - 2.5, cy - 7.5], { d: '#c8a040', l: '#fff8c8' }, ['..l..', 'l..d.', '.d..l', 'd..d.'], { detail: true }),
        pixels([cx - 4, cy], { k: '#3a3828', w: '#ffffff' }, ['kkk', 'kwk', '.k.'], { face: true }),
        pixels([cx + 1, cy], { k: '#3a3828', w: '#ffffff' }, ['kkk', 'kwk', '.k.'], { face: true }),
        pixels([cx - 1, cy + 4], { m: '#9a7a60' }, ['mm'], { face: true, detail: true }),
        pixels([cx - 5.5, cy + 3], { c: '#f8c0b0' }, ['cc'], { face: true, detail: true }),
        pixels([cx + 3.5, cy + 3], { c: '#f8c0b0' }, ['cc'], { face: true, detail: true }),
        // faint glow sparkles
        pixels([9, 22], { g: 'gold', w: 'glow' }, ['.g.', 'gwg', '.g.'], { detail: true }),
        pixels([37, 20], { g: 'gold', w: 'glow' }, ['.g.', 'gwg', '.g.'], { detail: true }),
        pixels([30, 14.5], { g: 'gold' }, ['g'], { detail: true }),
      ],
    };
  })(),

  // -------------------------------------------------------------------------
  // #042 Edelwyss – edelweiss spirit gliding on an updraft, parasol rosette, root threads streaming
  // -------------------------------------------------------------------------
  edelwyss: ((): CreatureDef => {
    // The rosette lies in a plane seen slightly from above (squashed by `k`) and tilted up at the front.
    const [cx, cy, k, tiltDeg] = [22, 17, 0.5, 6];
    const P = (x: number, y: number): Pt => {
      const [c, s] = [Math.cos(rad(tiltDeg)), Math.sin(rad(tiltDeg))];
      return [cx + x * c - y * k * s, cy + x * s + y * k * c];
    };
    /** Bract in the rosette plane pointing at `a`, projected. */
    const bract = (a: number, len: number, wid: number): Shape => {
      const [c, s] = [Math.cos(rad(a)), Math.sin(rad(a))];
      const prof = [0.35, 0.6, 0.85, 1, 0.95, 0.75, 0.45, 0];
      const side = prof.map((w, i) => [((i + 1) / prof.length) * len, (w * wid) / 2] as const);
      const pt = (u: number, v: number) => P(c * u - s * v, s * u + c * v);
      return poly(pt(0, -wid * 0.2), ...side.map(([u, v]) => pt(u, -v)), ...side.slice(0, -1).reverse().map(([u, v]) => pt(u, v)), pt(0, wid * 0.2));
    };
    const ring = (n: number, off: number) => Array.from({ length: n }, (_, i) => (i * 360) / n + off);
    return {
      pal: {
        white: ['#ffffff', '#fffff0', '#dcdcc4', '#5a5a48'], felt: ['#f0f4e4', '#e0e8d0', '#b8c4a8', '#4a5440'], tipc: '#c8d4b4',
        gold: ['#fff4b0', '#f0d878', '#d0b050', '#6a5420'], leaf: '#58a048', glow: ['#fffce8', '#f8e8a0', '#e8d080', '#a08840'],
      },
      icon: { box: [0, 3, 44, 33] },
      parts: [
        // glowing root threads streaming behind like a comet tail
        {
          c: 'glow',
          s: [
            curve([2, 1.6, 1, 0.5], [23.5, 22], [28, 27], [33, 30], [39, 33.5], [45, 34.5]),
            curve([2, 1.6, 1, 0.5], [22.5, 22.5], [25.5, 29], [30, 34], [35, 37], [40, 38]),
          ],
        },
        {
          c: 'glow',
          s: [curve([1.6, 1.2, 0.8, 0.4], [24, 21.5], [30, 24.5], [36, 26], [42, 28], [46.5, 28]), curve([1.4, 1, 0.6, 0.3], [22, 23], [22.5, 29], [24.5, 34], [27.5, 38])],
          line: false,
          detail: true,
        },
        { c: '#ffffff', s: [curve(0.6, [26, 26], [31, 29.2], [36, 31.5]), curve(0.6, [24.5, 27.5], [28, 32.5], [32, 35.5])], mark: true, flat: true, outline: false, detail: true },
        // two felted leaf fins hanging beneath the rosette
        { c: 'leaf', s: petal(25, 20, 10, 4.4, 70), dim: true },
        { c: 'leaf', s: petal(19, 20, 12, 5, 100) },
        { c: 'felt', s: line([0.6, 1.2, 0.6], [18.7, 21.5], [17.5, 30.5]), mark: true, flat: true, detail: true },
        // the parasol of narrow bracts: back layer of felt, front layer radiant white, grey-green tips
        { c: 'felt', s: ring(8, 22.5).map((a) => bract(a, 19.5, 6)) },
        { c: 'white', s: ring(8, 0).map((a) => bract(a, 21.5, 6.6)) },
        { c: 'tipc', s: ring(8, 0).map((a) => circ(...P(Math.cos(rad(a)) * 19.8, Math.sin(rad(a)) * 19.8), 1.8)), mark: true },
        // golden dome of florets with two calm eyes
        {
          c: 'gold',
          s: [ell(cx, cy - 3, 7, 5), ...[[-5.4, -1.2, 2], [-3.2, -4, 2.1], [0, -5.2, 2.2], [3.2, -4, 2.1], [5.4, -1.2, 2]].map(([u, v, r]) => circ(cx + u!, cy - 3 + v!, r!))],
        },
        pixels([cx - 5, cy - 9], { d: '#c8a040', l: '#fff8c8' }, ['...l....l.', 'l...d..d..', '..d.....l.', '.......d..'], { detail: true }),
        pixels([cx - 4.5, cy - 4], { k: '#3a3018', w: '#ffffff' }, ['kkk', 'kwk', '.k.'], { face: true }),
        pixels([cx + 1.5, cy - 4], { k: '#3a3018', w: '#ffffff' }, ['kkk', 'kwk', '.k.'], { face: true }),
        pixels([cx - 1, cy - 0.5], { m: '#a07830' }, ['m.m', '.m.'], { face: true, detail: true }),
        // glow sparkles
        pixels([5, 5], { g: 'gold', w: '#fff8d0' }, ['.g.', 'gwg', '.g.'], { detail: true }),
        pixels([38, 4], { g: 'gold', w: '#fff8d0' }, ['.g.', 'gwg', '.g.'], { detail: true }),
        pixels([45, 25], { g: 'gold' }, ['g'], { detail: true }),
        pixels([7, 30], { g: 'gold' }, ['g'], { detail: true }),
      ],
    };
  })(),

  // -------------------------------------------------------------------------
  // #043 Firngeist – tall veil of frozen fog drifting sideways, wailing, icicle fingers reaching
  // -------------------------------------------------------------------------
  firngeist: {
    pal: {
      fog: ['#ffffff', '#e0ecf4', '#a8c4dc', '#304060'], ice: ['#d0e8f8', '#90b8d8', '#6890b8', '#304060'],
      spirit: ['#8878c0', '#6858a0', '#4c4080', '#201838'], deep: '#304060', glow: '#a8e8ff', flake: '#ffffff',
    },
    parts: [
      // rear layer of the veil billowing out behind, tattered
      {
        c: 'fog',
        s: poly([22, 8], [29, 9.5], [35, 12.5], [41, 13], [47.5, 15.5], [43.5, 18], [47, 22.5], [42, 22], [44, 28], [38, 25], [30, 22]),
        dim: true,
      },
      // icicle fingers of the far hand poking out behind
      { c: 'ice', s: [spike(37, 26, 7, 2, -20), spike(38, 28, 7.5, 2, -4), spike(38, 30, 6.5, 2, 12)], dim: true },
      // the veil: round hood, wavy back, sweeping down into long tattered streamers
      {
        c: 'fog',
        s: [
          circ(16.5, 12, 7.8),
          poly(
            [8.8, 14], [9.5, 22], [11, 30], [12.5, 36], [14, 42.5], [16.5, 37.5], [19.5, 45.5], [22, 38.5], [26, 46.5], [28, 39], [33, 45], [34, 37.5],
            [40, 41.5], [39, 34], [46, 36.5], [41.5, 30], [44, 27], [36, 23], [30, 18], [26, 12], [21, 5], [15, 4.2],
          ),
        ],
      },
      // frozen-fog gradient: ice blue toward the hem, spirit violet in the tatters
      { c: 'ice', s: ell(34, 46, 28, 16, -20), mark: true },
      { c: 'spirit', s: ell(33, 52, 26, 14, -20), mark: true },
      // folds of the veil streaming back
      { c: 'ice', s: [curve([0.8, 0.6], [21, 14], [26, 21], [32, 28], [37, 35]), curve([0.8, 0.6], [16.5, 22], [20, 30], [23.5, 37.5])], mark: true, detail: true },
      // wailing face: dark eye holes with icy glowing eyes, dark open mouth
      pixels([10.5, 8.5], { d: 'deep', i: 'glow', w: '#ffffff' }, ['.dd.', 'dddd', 'dwid', 'diid', '.dd.'], { face: true }),
      pixels([17, 8.5], { d: 'deep', i: 'glow', w: '#ffffff' }, ['.dd.', 'dddd', 'dwid', 'diid', '.dd.'], { face: true }),
      pixels([13.5, 15.5], { d: 'deep', s: 'spirit' }, ['.dd.', 'dddd', 'ddsd', 'dssd', '.dd.'], { face: true }),
      // frost glitter
      pixels([22, 12], { w: '#ffffff', i: 'glow' }, ['.w.', 'wiw', '.w.'], { detail: true }),
      pixels([27, 30], { w: '#ffffff' }, ['w'], { detail: true }),
      pixels([15, 30], { w: '#ffffff' }, ['w'], { detail: true }),
      // icicle fingers of the near hand poking out of the veil, reaching forward
      { c: 'deep', s: ell(10.8, 25.5, 1.4, 2.6, 15), flat: true, outline: false },
      { c: 'ice', s: [spike(10.5, 23.5, 7, 2, -165), spike(10, 25.5, 8, 2, 178), spike(10.5, 27.5, 6.5, 2, 162)] },
      // snowflakes orbiting
      pixels([2, 12], { w: 'flake', i: 'ice' }, SNOWFLAKE, { detail: true }),
      pixels([36, 3], { w: 'flake', i: 'ice' }, SNOWFLAKE, { detail: true }),
      pixels([5, 36], { w: 'flake', i: 'ice' }, SNOWFLAKE, { detail: true }),
      pixels([26, 1.5], { w: 'flake', i: 'ice' }, ['.w.', 'wiw', '.w.'], { detail: true }),
      pixels([44.5, 42], { w: 'flake', i: 'ice' }, ['.w.', 'wiw', '.w.'], { detail: true }),
    ],
  },
};
