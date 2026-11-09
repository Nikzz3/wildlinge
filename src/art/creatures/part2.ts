/**
 * Creature art, part 2: Lexikon #016–#030
 * (stinkkaefer, schneggli, farnli, farnwicht, laervli, fratzgeist, tuepfli, moormolch,
 * tauchli, seefuerst, wuehli, erdwuehler, stachli, erzborst, bergmaennli).
 * Drawn so far: #016–#027 (everything chapters 1–2 can show, plus their evolutions); stachli, erzborst and
 * bergmaennli still use the generic art.
 * Coordinates are in 48×48 space, ground line y ≈ 45, creatures face left. See src/art/creatures/part1.ts.
 */
import { beads, circ, type CreatureDef, type CreatureDefs, curve, ell, line, type Part, pixels, poly, type Pt, rect, type Shape } from '../shapes';

const EYE = { k: '#202028', w: '#f8f8f8' };

/** Star-nosed mole snout seen head-on: a ring of fleshy feelers around two nostrils. */
const STAR_NOSE = {
  pal: { l: '#fad0c8', p: '#e8a0a0', s: '#c47884', n: '#8a3048' },
  px: [
    '....l.l....',
    '.l..l.p..p.',
    '..l..l..p..',
    '...lllpp...',
    'll.llppp.pp',
    '..lpnpnps..',
    'pp.pppps.ss',
    '...pppss...',
    '..p..s..s..',
    '.p..s.s..s.',
    '....s.s....',
  ],
  small: ['l.l.p', '.lpp.', 'lnpns', '.pss.', 'p.s.s'],
} as const;

/** Points of a spiral around (cx, cy): from radius r0 at angle a0 (degrees, clockwise from +x) winding `turns` times to r1. */
function spiral(cx: number, cy: number, r0: number, r1: number, a0: number, turns: number): Pt[] {
  const n = Math.max(4, Math.round(turns * 10));
  return Array.from({ length: n + 1 }, (_, i) => {
    const f = i / n;
    const a = ((a0 + f * turns * 360) * Math.PI) / 180;
    const r = r0 + (r1 - r0) * f;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt;
  });
}

/** Maps local (u, v) offsets around (cx, cy) into 48-space, rotated by `deg` (clockwise): for tilted heads and masks. */
function tilt(cx: number, cy: number, deg: number): (u: number, v: number) => Pt {
  const t = (deg * Math.PI) / 180;
  const [c, s] = [Math.cos(t), Math.sin(t)];
  return (u, v) => [cx + u * c - v * s, cy + u * s + v * c];
}

/** Leaf (or feather, or ray) as an ellipse growing from its base (x, y), `len` long, `wid` wide, pointing at `deg`. */
function leaf(x: number, y: number, len: number, wid: number, deg: number): Shape {
  const t = (deg * Math.PI) / 180;
  return ell(x + (Math.cos(t) * len) / 2, y + (Math.sin(t) * len) / 2, len / 2, wid / 2, deg);
}

/** Pointed spike from base (x, y), `len` long, base `wid` wide, pointing at `deg`. */
function spike(x: number, y: number, len: number, wid: number, deg: number): Shape {
  const t = (deg * Math.PI) / 180;
  const [c, s] = [Math.cos(t), Math.sin(t)];
  const h = wid / 2;
  return poly([x - s * h, y + c * h], [x + c * len, y + s * len], [x + s * h, y - c * h]);
}

/** Stone shovel blade: palm at (x, y), `len` long, `wid` wide, pointing at `deg` (0 = right, clockwise), three claws at the tip. */
function shovel(x: number, y: number, len: number, wid: number, deg: number): Shape {
  const t = (deg * Math.PI) / 180;
  const [c, s] = [Math.cos(t), Math.sin(t)];
  const P = (u: number, v: number): Pt => [x + u * c - v * s, y + u * s + v * c];
  const [L, h] = [len, wid / 2];
  return poly(
    P(-h * 0.5, 0), P(-h * 0.2, -h * 0.85), P(L * 0.5, -h), P(L, -h * 0.8), P(L * 0.66, -h * 0.3),
    P(L * 1.1, 0), P(L * 0.66, h * 0.3), P(L, h * 0.8), P(L * 0.5, h), P(-h * 0.2, h * 0.85),
  );
}

export const PART2: CreatureDefs = {
  // -------------------------------------------------------------------------
  // #016 Stinkkäfer – shield bug, rear raised, puffing a stink cloud
  // -------------------------------------------------------------------------
  stinkkaefer: {
    pal: {
      green: '#4a8a38', leaf: '#68a848', dark: '#2a5a28', hi: '#d0e070', vent: '#9040a8', puff: ['#e0d0ec', '#c0a0d0', '#a080b8', '#7a5a98'], legs: '#2a3a20',
    },
    parts: [
      // far legs
      { c: 'legs', s: [line([2, 1.6], [20, 33], [17, 37], [18, 41.5]), line([2, 1.6], [28, 31], [30, 35.5], [32.5, 40]), line([2, 1.6], [34, 28], [38, 31], [40.5, 36])], dim: true },
      // underside, vents + angular pentagon shield of overlapping leaf plates
      { c: 'dark', s: ell(24, 31.5, 14, 5, -18) },
      { c: 'vent', s: [ell(40, 21, 2, 1.5, -40), ell(43, 17.8, 1.9, 1.4, -40)] },
      { c: 'green', s: poly([7, 30], [12, 20], [25, 14], [45, 13], [37, 28], [21, 35]) },
      // overlapping leaf plates: curved plate edges bowing toward the rear, a midrib, fine veins
      { c: 'leaf', s: [ell(14, 25, 8.5, 9, -20), ell(26, 22, 6, 8.5, -20)], mark: true, line: true },
      {
        c: 'dark',
        s: [
          line(0.8, [10, 25.5], [44, 13.5]), line(0.6, [14, 24], [16, 19.5]), line(0.6, [18, 22.5], [20.5, 18]), line(0.6, [13, 25.5], [16, 30]), line(0.6, [17.5, 24], [21, 28.5]),
          line(0.6, [27.5, 20.5], [29.5, 26.5]), line(0.6, [32, 18.5], [34, 23]), line(0.6, [36, 17], [37.5, 20.5]), line(0.6, [27, 20.5], [29.5, 16]), line(0.6, [32.5, 18.5], [34.5, 15]),
        ],
        mark: true, detail: true,
      },
      { c: 'hi', s: [line(1.2, [7.5, 29], [12, 20.5]), line(1.2, [12, 20.5], [25, 14.5]), line(1, [25, 14.5], [44, 13.5])], mark: true, flat: true },
      // curly stink clouds puffing out of the raised rear
      { c: 'puff', s: [circ(43.5, 11.5, 2.8), circ(46, 9.5, 2), circ(41.5, 9, 2.2)], flat: true },
      { c: 'puff', s: [circ(37, 5.5, 2.2), circ(39.5, 4.5, 1.8)], flat: true },
      { c: 'puff', s: circ(44, 3, 1.5), flat: true },
      { c: '#f4ecf8', s: [curve(0.9, [41.5, 10], [42.5, 8.5], [44, 9.2], [43.4, 10.6]), curve(0.9, [36.5, 5.5], [37.5, 4.2], [38.8, 4.8])], mark: true, flat: true },
      // near legs, jointed
      { c: 'legs', s: [line([2.2, 1.8], [13.5, 34], [10, 38], [10.5, 43.5]), line([2.2, 1.8], [22, 35.5], [22, 40], [25, 44]), line([2.2, 1.8], [30, 33], [34, 37], [36.5, 42.5])] },
      { c: 'legs', s: [ell(10, 44.2, 1.8, 1), ell(25.5, 44.5, 1.8, 1), ell(37, 43.2, 1.8, 1)] },
      // head turned toward the viewer, stubby horn antennae
      { c: 'dark', s: [curve([2.2, 0.8], [6, 28.5], [4, 25], [2, 24]), curve([2.2, 0.8], [10, 28], [11.5, 24.5], [14, 23.5])] },
      { c: 'dark', s: ell(8, 32, 5, 4.2) },
      pixels([4.5, 30], EYE, ['.kk.', 'kwkk', 'kkkk', '.kk.'], { face: true }),
      pixels([9.5, 30], EYE, ['.kk.', 'kwkk', 'kkkk', '.kk.'], { face: true }),
    ],
  },


  // -------------------------------------------------------------------------
  // #017 Schneggli – snail carrying a tiny chalet, stretched forward
  // -------------------------------------------------------------------------
  schneggli: {
    pal: {
      body: '#e8c0a0', wood: '#a06838', red: '#c83030', window: '#f8f0e0', roof: '#6a4a3a', leaf: '#58a040', stone: '#9a948a',
    },
    parts: [
      // far eye stalk
      { c: 'body', s: [curve([2.2, 1.6], [10, 31], [8, 26], [6, 22.5]), circ(5.5, 21, 2.6)], dim: true },
      // soft foot stretched forward, tail tapering off behind the house
      { c: 'body', s: [ell(27, 42.5, 14, 3), poly([36, 40], [47, 45], [34, 45.5]), curve([8, 7], [20, 42], [15, 38.5], [12.5, 34])] },
      { c: 'body', s: ell(11.5, 33, 6, 5.5) },
      // chalet: side wall receding to the right, chimney, wide shallow roof
      { c: 'wood', s: poly([34, 29], [41.5, 26], [41.5, 37], [34, 40.5]), dim: true },
      { c: 'stone', s: rect(35, 17, 3.2, 7, 0.8) },
      { c: 'wood', s: rect(21.5, 28, 12.5, 12.5, 1) },
      { c: 'wood', s: [line(0.7, [21.5, 31], [34, 31]), line(0.7, [21.5, 35], [34, 35]), line(0.7, [21.5, 39], [34, 39])], mark: true, dim: true, detail: true },
      { c: 'wood', s: poly([20, 30.5], [28, 22], [36, 30.5]) },
      { c: 'wood', s: [line(0.7, [25, 25.5], [25, 30]), line(0.7, [31, 25.5], [31, 30])], mark: true, dim: true, detail: true },
      // one roof: side plane running back from the ridge + the overhanging front gable
      {
        c: 'roof',
        s: [poly([28, 18], [34, 15.5], [44, 26], [39.5, 30.5]), poly([16.5, 30.5], [28, 18], [39.5, 30.5], [36.5, 30.5], [28, 21.5], [19.5, 30.5])],
      },
      { c: 'roof', s: [line(0.7, [31.5, 21], [41, 28.5]), line(0.7, [34.5, 18.5], [42.5, 26.5])], mark: true, dim: true, detail: true },
      { c: 'window', s: [line(1.2, [17, 30], [28, 18.5]), line(1.2, [28, 18.5], [39, 30])], mark: true, flat: true },
      // window with red shutters and a box of geraniums
      { c: 'red', s: [rect(22.8, 31, 2.4, 5.5), rect(30.3, 31, 2.4, 5.5)] },
      { c: 'window', s: rect(25.2, 31, 5.1, 5.5) },
      pixels([25.5, 31.5], { f: '#7a4a28' }, ['..f..', 'fffff', '..f..', '..f..'], { detail: true }),
      { c: 'wood', s: rect(23.5, 36.5, 8.5, 2, 0.8) },
      pixels([23.5, 34.5], { r: 'red', g: 'leaf', p: '#f07060' }, ['.p..p..p.', 'rgrgrrgrg']),
      pixels([27, 24.5], { d: '#3a2418', w: 'window' }, ['.w.', 'wdw'], { detail: true }),
      // near eye stalk, bent toward the viewer
      { c: 'body', s: [curve([2.6, 1.8], [13.5, 30], [15, 25], [13, 20.5]), circ(12.5, 19.5, 3.2)] },
      pixels([11, 17.5], EYE, ['.kk.', 'kwkk', 'kkkk', '.kk.'], { face: true }),
      pixels([4.5, 19.5], EYE, ['kk', 'wk', 'kk'], { face: true }),
      pixels([7, 34.5], { m: '#a05848' }, ['m...m', '.mmm.'], { face: true }),
      pixels([10.5, 33], { c: '#f09898' }, ['cc'], { face: true, detail: true }),
    ],
  },

  // -------------------------------------------------------------------------
  // #018 Farnli – fern fiddlehead sprite, half uncurled, waving a leaf arm
  // -------------------------------------------------------------------------
  farnli: {
    pal: { fern: '#78c050', dark: '#3e7838', groove: '#2a5428', frond: '#c8e890', face: '#a8dc78', root: '#5a4030', mouth: '#2a4a26' },
    parts: [
      // the unrolled end of the curl: a frond rising behind, two pairs of leaflets and a hooked tip
      {
        c: 'fern',
        s: [
          curve([2.4, 1.8, 1.4], [27.5, 23], [30, 18], [31, 13.5], [29.5, 10.5], [27, 11], [27, 13]),
          leaf(29.5, 19.5, 6, 3, -150), leaf(29.5, 19.5, 6.5, 3, -5),
          leaf(30.8, 14.5, 4.5, 2.4, -145), leaf(30.8, 14.5, 4.8, 2.4, -15),
        ],
      },
      { c: 'dark', s: [line(0.6, [29.5, 19.5], [25.5, 17.5]), line(0.6, [29.5, 19.5], [35, 19])], mark: true, detail: true },
      // far leaf arm hanging down behind the curl
      { c: 'fern', s: [curve(1.4, [28, 36], [32.5, 38]), leaf(32, 37.5, 6.5, 3.2, 35)], dim: true },
      // little stalk body on root feet
      { c: 'root', s: [curve([1.4, 0.6], [19, 44.5], [16.5, 45.5], [15, 45]), curve([1.4, 0.6], [27.5, 44.5], [30.5, 45.5], [32, 44.8])], detail: true },
      { c: 'fern', s: ell(23, 40.5, 5, 4.2) },
      { c: 'frond', s: ell(21.5, 42, 3, 2.2), mark: true, face: true },
      { c: 'root', s: [ell(19.5, 44.6, 2.8, 1.4), ell(26.5, 44.6, 2.8, 1.4)] },
      // the curl itself: a coiled frond, its groove spiralling in around a pale face
      { c: 'fern', s: circ(22, 30, 9.8) },
      { c: 'face', s: circ(22, 30.5, 5), mark: true, face: true },
      { c: 'frond', s: curve([1.4, 1.6, 1.2], ...spiral(22, 30, 8.3, 7.6, 150, 0.4)), mark: true, flat: true },
      { c: 'groove', s: curve([1.3, 1.2, 1.1, 1], ...spiral(22, 30, 8.7, 5.7, -45, 1.3)), mark: true },
      pixels([17.5, 28], { k: '#1c2818', w: '#f8f8f8' }, ['.kk.', 'kwkk', 'kkkk', '.kk.'], { face: true }),
      pixels([22.5, 28], { k: '#1c2818', w: '#f8f8f8' }, ['.kk.', 'kwkk', 'kkkk', '.kk.'], { face: true }),
      pixels([20.5, 32.5], { m: 'mouth' }, ['m..m', '.mm.'], { face: true }),
      // near leaf arm raised high, waving
      { c: 'fern', s: [curve([1.6, 1.3], [14.5, 34], [11.5, 31], [10, 27]), leaf(10, 27.5, 9, 4.2, -100)] },
      { c: 'dark', s: [line(0.6, [10, 27], [9, 19.5]), line(0.6, [9.5, 23], [7.5, 21.5]), line(0.6, [9.5, 23], [11, 21])], mark: true, detail: true },
    ],
  },

  // -------------------------------------------------------------------------
  // #019 Farnwicht – slender fern goblin in a pointed frond hood, leaning in, beckoning
  // -------------------------------------------------------------------------
  farnwicht: {
    pal: {
      fern: ['#5a8a50', '#3e6a3a', '#2c5030', '#142414'], frond: ['#a8d888', '#78b060', '#58904a', '#203818'],
      spirit: ['#9088c8', '#6858a0', '#4c4080', '#201838'], deep: '#2a2440', glow: '#d0f0a0',
    },
    parts: [
      // below the waist the body thins into floating root wisps, trailing back in spirit shadow
      { c: 'spirit', s: [curve([5, 3.4, 2, 0.8], [24, 33], [25, 38], [29, 41.5], [33, 41], [36, 44.5]), curve([3, 2, 1, 0.5], [28, 33], [32, 35.5], [36, 34.5], [39.5, 37.5]), curve([3, 2, 1.2, 0.5], [21, 34], [20, 39], [23, 43], [21.5, 46.5])] },
      { c: '#8a6a48', s: [curve([0.9, 0.5], [25, 36], [27.5, 40], [31, 40.5]), curve([0.8, 0.5], [21.5, 37], [21.5, 41], [23, 43.5])], mark: true, flat: true, detail: true },
      // far arm hanging behind, fiddlehead fingers
      { c: 'fern', s: [curve([2.4, 1.8], [30, 22], [34, 28], [36.5, 33]), circ(37, 34, 1.6)], dim: true },
      // leafy cloak: fronds hanging from the shoulders down to the waist
      { c: 'frond', s: [leaf(22, 23, 13, 4.4, 100), leaf(25, 23, 13, 4.4, 80), leaf(28.5, 22, 12, 4, 60), leaf(19.5, 23.5, 11, 4, 120)] },
      { c: 'fern', s: [line(0.6, [22, 24], [20.5, 34]), line(0.6, [25.5, 24], [27, 34]), line(0.6, [29, 23], [34, 31])], mark: true, detail: true },
      // pointed hood of fern fronds, the tip curling back
      {
        c: 'fern',
        s: [
          poly([9.5, 22], [10.5, 14], [15, 7.5], [22, 3.5], [30, 2], [36, 3.5], [33, 5], [28, 8.5], [25.5, 14], [26, 21], [21, 25], [13, 25]),
          curve([2.6, 1.6, 1], [34, 3.5], [38.5, 5], [39, 8.5], [36.5, 9], [36, 7]),
          ...[[13, 10, -150], [17, 6.5, -120], [22, 4, -100], [27, 3, -85], [26, 11, 10], [26.5, 17, 20], [24.5, 22, 40]].map(([x, y, d]) => leaf(x!, y!, 4.5, 2.2, d!)),
        ],
      },
      { c: 'frond', s: [curve([1.6, 1.2, 0.6], [11, 21], [12, 13.5], [17, 7.5], [25, 4], [33, 3.5])], mark: true },
      { c: 'fern', s: [line(0.6, [20, 6.5], [25.5, 11]), line(0.6, [16, 9.5], [21, 14]), line(0.6, [26.5, 4.5], [27.5, 9])], mark: true, dim: true, detail: true },
      // the face is pure shadow, two pale eyes glowing in it
      { c: 'deep', s: [ell(15.5, 18.5, 5, 5.5, 15)], flat: true, face: true },
      pixels([12.5, 17], { g: 'glow', w: '#f4fff0' }, ['gg.', 'wgg'], { face: true }),
      pixels([17, 17.5], { g: 'glow', w: '#f4fff0' }, ['.gg', 'wgg'], { face: true }),
      // near arm reaching forward, curled fiddlehead fingers beckoning
      { c: 'fern', s: [curve([3, 2.4, 2], [20, 25], [14, 30], [8.5, 30.5], [5.5, 27.5])] },
      { c: 'frond', s: [curve([1.8, 1], [5.5, 27.5], [3.5, 24.5], [4.5, 22.5], [6, 23.5]), curve([1.6, 1], [6.5, 27.5], [7.5, 24], [9.5, 24], [9.5, 25.5]), curve([1.4, 0.8], [5, 29], [2.5, 29.5], [2, 27.5], [3.5, 27])] },
    ],
  },

  // -------------------------------------------------------------------------
  // #020 Lärvli – floating carved wooden mask with a ghost inside, cowbell swinging
  // -------------------------------------------------------------------------
  laervli: ((): CreatureDef => {
    const P = tilt(23.5, 22.5, -12);
    const B = tilt(21.5, 39.5, 22);
    /** Shaggy strand hanging from the rim of the mask at local (u, v), pointing at `deg`. */
    const strand = (u: number, v: number, len: number, deg: number, bend: number): Shape => {
      const [x, y] = P(u, v);
      const t = ((deg - 12) * Math.PI) / 180;
      const tb = ((deg - 12 + bend) * Math.PI) / 180;
      return curve([3.2, 2.2, 0.8], [x, y], [x + Math.cos(t) * len * 0.55, y + Math.sin(t) * len * 0.55], [x + Math.cos(tb) * len, y + Math.sin(tb) * len]);
    };
    return {
      pal: {
        wood: ['#d8a878', '#a87848', '#86582f', '#3a2210'], dark: '#6a4428', tooth: ['#fffcf0', '#e8e0d0', '#c0b4a0', '#4a3a2a'],
        fur: ['#b0a690', '#8a8070', '#6a6254', '#2e2a24'], ghost: ['#c0b0f8', '#8070c8', '#5c4ca0', '#2a2050'], hole: '#24182e', glow: '#c8b8ff',
        brass: ['#f8e888', '#c8a840', '#987828', '#4a3810'], strap: '#7a3828',
      },
      parts: [
        // the ghost's wispy tail curling out from under the mask
        { c: 'ghost', s: curve([7, 6, 4.5, 3, 1.4], [27, 28], [31, 35], [29.5, 40], [33, 44], [38, 42.5], [39, 39.5]) },
        { c: 'glow', s: [curve(0.8, [29.5, 32], [31, 36.5], [30.5, 39.5])], mark: true, flat: true, detail: true },
        // shaggy goat-fur fringe around the forehead and cheeks
        {
          c: 'fur',
          s: [
            ...beads([3.4, 4, 3.6, 3.4, 3.6, 4, 3.4], 2.2, P(-9.5, 6), P(-11, -2), P(-8.5, -9.5), P(0, -12.8), P(8.5, -9.5), P(11, -2), P(9.5, 6)),
            strand(-10, 5, 9, 105, 25), strand(-11.5, -1, 8, 160, -25), strand(-9, -9, 7, -140, -25), strand(-3, -12.5, 7, -100, -25),
            strand(4, -12.5, 7, -75, 25), strand(10, -8, 7, -30, 25), strand(11.5, 0, 8, 15, 25), strand(10, 5.5, 8, 70, -20),
          ],
        },
        { c: 'fur', s: [curve(0.7, P(-10, -5), P(-13, 0), P(-14, 4)), curve(0.7, P(-5, -12), P(-7, -15.5)), curve(0.7, P(6.5, -11.5), P(9, -14.5)), curve(0.7, P(11, -4), P(14.5, 0)), curve(0.7, P(-11, 3), P(-13, 10))], mark: true, dim: true, detail: true },
        // the mask
        { c: 'wood', s: ell(23.5, 22.5, 9, 11.5, -12) },
        // back view: the hollow inside of the mask, the ghost glowing in it
        { c: 'dark', s: ell(23.5, 22.5, 7.2, 9.6, -12), backOnly: true },
        { c: 'ghost', s: ell(...P(0, 1), 4.5, 6, -12), flat: true, backOnly: true },
        { c: 'glow', s: ell(...P(-1, -1), 1.8, 2.6, -12), flat: true, backOnly: true },
        // carved brows, cheek grooves
        { c: 'dark', s: [curve([1.6, 1], P(-7.5, -6.5), P(-4.5, -7.8), P(-1.5, -6.2)), curve([1.6, 1], P(7.5, -6.5), P(4.5, -7.8), P(1.5, -6.2))], mark: true, face: true },
        { c: 'dark', s: [curve(0.8, P(-8, -1), P(-8.2, 3), P(-7, 5.5)), curve(0.8, P(8, -1), P(8.2, 3), P(7, 5))], mark: true, face: true, detail: true },
        // round eye holes with a faint violet glow inside
        { c: 'hole', s: [ell(...P(-4.3, -3), 2.6, 2.5), ell(...P(4.3, -3), 2.4, 2.4)], flat: true, face: true },
        pixels(P(-5.3, -4.3), { g: 'glow', v: '#8070c0' }, ['vg', 'gv'], { face: true }),
        pixels(P(3.3, -4.3), { g: 'glow', v: '#8070c0' }, ['vg', 'gv'], { face: true }),
        // gaping grin with big blocky teeth
        { c: 'hole', s: poly(P(-7.5, 4.5), P(7.2, 4.2), P(5.2, 10.8), P(-5.2, 11)), flat: true, face: true },
        {
          c: 'tooth',
          s: [poly(P(-6.6, 4.4), P(-4.2, 4.4), P(-4.4, 6.8), P(-6.2, 6.8)), poly(P(-3.4, 4.4), P(-0.6, 4.4), P(-0.8, 7.2), P(-3.2, 7.2)), poly(P(0.4, 4.3), P(3.2, 4.3), P(3, 7.1), P(0.6, 7.1)), poly(P(4.2, 4.3), P(6.6, 4.3), P(6.2, 6.6), P(4.4, 6.6)), poly(P(-3.6, 10.8), P(-1.2, 10.8), P(-1.2, 8.8), P(-3.4, 8.8)), poly(P(0.6, 10.8), P(3.2, 10.8), P(3, 8.8), P(0.8, 8.8))],
          face: true,
        },
        // crooked hooked nose
        { c: 'wood', s: poly(P(-1.3, -4.5), P(1.6, -4.5), P(1.6, 1), P(-0.8, 3.6), P(-4.8, 3.4), P(-3, 1.2)), face: true },
        // cowbell on a leather strap, swinging
        { c: 'strap', s: curve(1, P(-0.5, 10.5), [22.5, 36.5], [21.5, 37.5]) },
        { c: 'brass', s: [poly(B(-1.6, -1.8), B(1.6, -1.8), B(2.8, 2.8), B(-2.8, 2.8)), ell(...B(0, -1.6), 1.7, 1.2, 22)] },
        { c: 'brass', s: circ(...B(0.3, 3.6), 0.9), dim: true },
        pixels([18.5, 38.5], { w: '#fff8d0' }, ['w', 'w'], { detail: true }),
      ],
    };
  })(),

  // -------------------------------------------------------------------------
  // #021 Fratzgeist – towering shaggy carnival spirit, carved horned mask, bell belt, ghost hands raised
  // -------------------------------------------------------------------------
  fratzgeist: {
    pal: {
      fur: ['#5a4c48', '#3a3030', '#2a2222', '#120c0c'], mask: ['#c88a58', '#a06a40', '#7a4a28', '#341c0c'], horn: ['#e0c8a0', '#b89870', '#8a6a48', '#3a2818'],
      tooth: ['#fffaf0', '#e8d8b0', '#c0ac80', '#4a3a20'], brass: ['#f8e888', '#c0a040', '#907020', '#40300c'], ghost: ['#e8e4fc', '#b8b0e0', '#8c80c0', '#2c2450'],
      hole: '#1c1220', glow: '#d8c8ff', dark: '#5a3418', strap: '#6a2a20',
    },
    parts: [
      // long pale ghost hands raised wide behind the shaggy sleeves
      { c: 'ghost', s: [ell(5.5, 10, 3, 2.6, -30), ...[-165, -135, -108, -82].map((d, i) => curve([1.4, 1, 0.6], [5.5, 10], [5.5 + Math.cos((d * Math.PI) / 180) * 5, 10 + Math.sin((d * Math.PI) / 180) * 5], [5.5 + Math.cos(((d - 15) * Math.PI) / 180) * [7, 8.5, 8.5, 7.5][i]!, 10 + Math.sin(((d - 15) * Math.PI) / 180) * [7, 8.5, 8.5, 7.5][i]!]))] },
      { c: 'ghost', s: [ell(42.5, 10, 3, 2.6, 30), ...[-15, -45, -72, -98].map((d, i) => curve([1.4, 1, 0.6], [42.5, 10], [42.5 + Math.cos((d * Math.PI) / 180) * 5, 10 + Math.sin((d * Math.PI) / 180) * 5], [42.5 + Math.cos(((d + 15) * Math.PI) / 180) * [7, 8.5, 8.5, 7.5][i]!, 10 + Math.sin(((d + 15) * Math.PI) / 180) * [7, 8.5, 8.5, 7.5][i]!]))], dim: true },
      // raised shaggy sleeves
      { c: 'fur', s: [curve([8, 7, 5.5], [15, 22], [9, 17], [6, 12]), curve([8, 7, 5.5], [33, 22], [39, 17], [42, 12])] },
      { c: 'fur', s: [line(0.6, [12, 20], [8, 15]), line(0.6, [36, 20], [40, 15]), line(0.6, [10, 22], [6, 18])], mark: true, dim: true, detail: true },
      // bell-shaped cloak of matted fur reaching the ground, ragged hem
      {
        c: 'fur',
        s: [
          poly([14, 16], [34, 16], [38, 26], [43, 40], [46, 45], [2, 45], [5, 40], [10, 26]),
          ...[4, 9, 14, 19, 24, 29, 34, 39, 44].map((x, i) => poly([x - 3, 44], [x + 0.5 * (i % 2 ? 1 : -1), 47.5], [x + 3, 44])),
        ],
      },
      { c: 'fur', s: [curve(0.7, [12, 30], [9, 38], [7, 44]), curve(0.7, [18, 36], [16, 41], [16, 46]), curve(0.7, [30, 36], [32, 41], [32, 46]), curve(0.7, [36, 30], [39, 38], [41, 44]), curve(0.7, [24, 37], [24, 46])], mark: true, dim: true, detail: true },
      { c: 'fur', s: [curve(0.7, [14, 25], [12, 30]), curve(0.7, [34, 25], [36, 30]), curve(0.7, [21, 39], [20, 44]), curve(0.7, [27, 39], [28, 44])], mark: true, detail: true },
      // belt of brass cowbells
      { c: 'strap', s: curve(1.6, [9, 31.5], [16, 34.5], [24, 35.5], [32, 34.5], [39, 31.5]) },
      ...[[10.5, 33, 1], [17, 35.5, 1.15], [24, 36.5, 1.25], [31, 35.5, 1.15], [37.5, 33, 1]].map(([x, y, k]): Part => ({
        c: 'brass', s: [poly([x! - 1.7 * k!, y!], [x! + 1.7 * k!, y!], [x! + 3 * k!, y! + 4.6 * k!], [x! - 3 * k!, y! + 4.6 * k!]), ell(x!, y! + 0.2, 1.8 * k!, 1.4 * k!)],
      })),
      pixels([23.5, 41], { c: '#40300c' }, ['cc'], { detail: true }),
      pixels([16.5, 40], { c: '#40300c' }, ['c'], { detail: true }),
      pixels([30.5, 40], { c: '#40300c' }, ['c'], { detail: true }),
      // wooden horns curling up from the mask
      { c: 'horn', s: [curve([3.6, 2.6, 1.4], [18, 9], [14.5, 4.5], [15.5, 1], [18.5, 0.8]), curve([3.6, 2.6, 1.4], [30, 9], [33.5, 4.5], [32.5, 1], [29.5, 0.8])] },
      { c: 'horn', s: [line(0.6, [15.5, 6], [17.5, 5]), line(0.6, [32.5, 6], [30.5, 5])], mark: true, dim: true, detail: true },
      // the great carved mask
      { c: 'mask', s: ell(24, 16, 9, 11) },
      // back view: shaggy fur covers the back of the head
      { c: 'fur', s: ell(24, 16, 9.5, 11.5), backOnly: true },
      { c: 'fur', s: [curve(0.7, [20, 8], [19, 16]), curve(0.7, [24, 6], [24, 15]), curve(0.7, [28, 8], [29, 16])], mark: true, dim: true, backOnly: true },
      { c: 'dark', s: [curve([1.8, 1.2], [17, 9.5], [20, 8.5], [22.5, 10]), curve([1.8, 1.2], [31, 9.5], [28, 8.5], [25.5, 10])], mark: true, face: true },
      { c: 'dark', s: [curve(0.8, [16, 15], [16, 19], [17.5, 22]), curve(0.8, [32, 15], [32, 19], [30.5, 22])], mark: true, face: true, detail: true },
      { c: 'hole', s: [ell(19.5, 13, 2.6, 2.6), ell(28.5, 13, 2.6, 2.6)], flat: true, face: true },
      pixels([18.5, 12], { g: 'glow', v: '#8070c0' }, ['vg', 'gv'], { face: true }),
      pixels([27.5, 12], { g: 'glow', v: '#8070c0' }, ['vg', 'gv'], { face: true }),
      { c: 'hole', s: poly([16, 20.5], [32, 20.5], [29.5, 26.5], [18.5, 26.5]), flat: true, face: true },
      { c: 'tooth', s: [rect(17, 20.5, 2.2, 2.6), rect(20.2, 20.5, 2.4, 3), rect(23.6, 20.5, 2.4, 3), rect(27, 20.5, 2.2, 2.6), rect(19.6, 24.3, 2.4, 2.2), rect(25.8, 24.3, 2.4, 2.2)], face: true },
      { c: 'mask', s: poly([22.6, 11.5], [25.4, 11.5], [26, 17.5], [24, 19.5], [20.5, 19], [22, 17]), face: true },
    ],
  },

  // -------------------------------------------------------------------------
  // #022 Tüpfli – tiny glossy spotted newt, crawling, head raised to look up
  // -------------------------------------------------------------------------
  tuepfli: {
    pal: {
      skin: ['#6a6a88', '#2a2a38', '#1c1c28', '#0c0c16'], spot: ['#fff09a', '#f0c830', '#c89820', '#4a3410'],
      belly: ['#c070d0', '#a050b0', '#7a3890', '#301038'], shine: '#c8c8e0',
    },
    parts: [
      // far legs, splayed
      { c: 'skin', s: [curve([2.2, 1.6], [20.5, 39], [23, 41.5], [24.5, 44]), curve([2.2, 1.6], [33, 39], [35.5, 41], [37.5, 43])], dim: true },
      // tail curling up at the tip
      { c: 'skin', s: curve([5, 4, 2.6, 1.2], [32, 39.5], [38, 40], [42.5, 38], [44.5, 34]) },
      // long low body, violet belly
      { c: 'skin', s: ell(26, 39.5, 9.5, 4.6) },
      { c: 'belly', s: ell(25.5, 44, 9, 2), mark: true },
      // near legs, little splayed toes
      { c: 'skin', s: [curve([2.4, 1.8], [19, 41], [16, 43], [14, 44.5]), curve([2.4, 1.8], [31, 41.5], [32.5, 43.5], [35, 44.8])] },
      pixels([11.5, 44], { t: 'skin' }, ['t.t', '.t.'], { detail: true }),
      pixels([34.5, 44.5], { t: 'skin' }, ['.t', 't.', '.t'], { detail: true }),
      // yellow warning spots
      { c: 'spot', s: [circ(23, 36.4, 1.9), circ(29, 36, 1.7), circ(34, 37.6, 1.4), circ(26, 40.6, 1.2), circ(39, 38.3, 1.1), circ(43.2, 35.2, 0.9)], mark: true },
      // big round head raised, bulging eyes on top
      { c: 'skin', s: circ(17, 27.5, 3), dim: true },
      { c: 'skin', s: ell(13.5, 33, 8, 6.2, -10) },
      { c: 'belly', s: ell(11.5, 38.8, 5, 1.5, -10), mark: true, face: true },
      { c: 'spot', s: [circ(19.5, 31.5, 1.6), circ(17.5, 36, 1.1)], mark: true },
      { c: 'skin', s: circ(10, 28.5, 3.4) },
      pixels([7.5, 26.5], { r: '#9898b8', k: '#06060a', w: '#ffffff' }, ['.rrr.', 'rwwkr', 'rwkkr', 'rkkkr', '.rrr.'], { face: true, small: ['rr', 'wk', 'kk'] }),
      pixels([15.5, 26], { r: '#9898b8', k: '#06060a', w: '#ffffff' }, ['.rr', 'rwk', 'rkk', 'rkk', '.rr'], { face: true }),
      // wide newt smile, glossy highlights
      { c: 'shine', s: curve(0.8, [5.5, 33.5], [9, 35.8], [14.5, 35.6]), mark: true, flat: true, face: true },
      pixels([20, 35.5], { w: 'shine' }, ['ww'], { detail: true }),
      pixels([8.5, 31.5], { w: 'shine' }, ['w'], { detail: true }),
    ],
  },

  // -------------------------------------------------------------------------
  // #023 Moormolch – big crested newt lying on a mossy stone, head raised, saw crest bristling
  // -------------------------------------------------------------------------
  moormolch: {
    pal: {
      skin: ['#4a5468', '#2a3040', '#1e2230', '#0c0e16'], blot: ['#a060c0', '#8040a0', '#603080', '#2a1038'], toxic: '#c070d0',
      belly: ['#f8b050', '#e88830', '#c06820', '#4a2008'], crest: ['#3a4458', '#2a3040', '#1e2230', '#0c0e16'], edge: '#3890e0',
      stone: '#8a8478', moss: '#6a9048', eye: '#e8c040',
    },
    parts: [
      // mossy stone
      { c: 'stone', s: [ell(25, 44.5, 19, 4), ell(14, 43, 7, 3)] },
      { c: 'moss', s: [ell(25, 41.5, 17, 1.6), ell(12, 40.8, 5, 1.2)], mark: true },
      // far legs
      { c: 'skin', s: [curve([2.6, 2], [17, 36], [19.5, 40], [21.5, 41.5]), curve([2.6, 2], [32, 36], [35, 39.5], [37, 41])], dim: true },
      // saw-blade crest from the nape along the spine and down the paddle tail, edged in blue
      {
        c: 'crest',
        s: [
          poly([13, 29], [15, 23], [17, 27], [19.5, 21.5], [21.5, 26.5], [24.5, 21], [26.5, 26.5], [29.5, 21.5], [31, 27], [34, 23], [35, 28.5], [38.5, 25.5], [38.5, 30.5], [42.5, 28.5], [41.5, 33], [46, 32], [44, 36], [36, 36], [20, 32]),
        ],
      },
      { c: 'edge', s: [line(0.9, [15, 23.5], [17, 27]), line(0.9, [19.5, 22], [21.5, 26.5]), line(0.9, [24.5, 21.5], [26.5, 26.5]), line(0.9, [29.5, 22], [31, 27]), line(0.9, [34, 23.5], [35, 28.5]), line(0.9, [38.5, 26], [38.5, 30.5]), line(0.9, [42.5, 29], [41.5, 33]), line(0.9, [45.5, 32.5], [44, 36])], mark: true, flat: true },
      // long body and flat paddle tail
      { c: 'skin', s: [ell(25, 34.5, 12, 6), curve([7, 6, 4.5, 2.5], [33, 35], [38.5, 35.5], [43, 35], [47, 33.5])] },
      { c: 'belly', s: [ell(24, 39.5, 10.5, 2.6)], mark: true },
      pixels([17, 39], { k: '#2a1408' }, ['k...k...', '...k...k'], { detail: true }),
      // violet blotches oozing toxic droplets, warts
      { c: 'blot', s: [ell(20, 31, 3, 1.8, -10), ell(28, 30.5, 3.4, 2, 10), ell(33.5, 33.5, 2.4, 1.6), ell(24, 35, 2, 1.3), ell(40, 34, 1.8, 1.2)], mark: true },
      pixels([20, 30.5], { t: 'toxic' }, ['t'], { detail: true }),
      pixels([28, 30], { t: 'toxic' }, ['tt'], { detail: true }),
      pixels([17, 34], { w: '#4a5468' }, ['w...w', '..w..'], { detail: true }),
      { c: 'toxic', s: [ell(30, 41.5, 0.9, 1.3), ell(36, 40.5, 0.8, 1.2)], flat: true, detail: true },
      // near legs gripping the stone
      { c: 'skin', s: [curve([3, 2.4], [17, 37], [13.5, 39.5], [11, 41.5]), curve([3, 2.4], [32, 37.5], [34, 40], [36.5, 42])] },
      pixels([8.5, 41], { t: 'skin' }, ['t.t.', '.t.t'], { detail: true }),
      pixels([35.5, 41.5], { t: 'skin' }, ['.t.', 't.t'], { detail: true }),
      // smooth, flat, wide-mouthed head raised
      { c: 'skin', s: ell(10, 29.5, 8.5, 5, -18) },
      { c: 'belly', s: ell(9, 33, 6, 1.6, -18), mark: true, face: true },
      { c: 'skin', s: circ(9.5, 25.5, 2.3) },
      { c: 'blot', s: ell(14.5, 27.5, 2, 1.3, -18), mark: true },
      pixels([8, 24.5], { y: 'eye', k: '#0c0e16', w: '#ffffff' }, ['yyy', 'ykw', 'yyk'], { face: true }),
      { c: '#0c0e16', s: curve(0.8, [2.5, 31.5], [7, 31.5], [12, 30], [15.5, 28.5]), flat: true, mark: true, face: true },
    ],
  },

  // -------------------------------------------------------------------------
  // #024 Tauchli – fluffy grebe chick bobbing on the lake, zebra-striped head
  // -------------------------------------------------------------------------
  tauchli: {
    pal: {
      white: ['#ffffff', '#f8f8f0', '#d0d4d8', '#505860'], stripe: '#383838', beak: '#f08898', down: '#8090a0',
      water: ['#a8d8f8', '#78b8e8', '#3890e0', '#1c4c80'], foam: '#e8f8ff',
    },
    parts: [
      // ripple ring around it
      { c: 'water', s: ell(25, 43.5, 20, 3.8), cut: ell(25, 43.3, 17.5, 2.8), flat: true },
      // round downy body, tail tuft
      { c: 'down', s: [poly([34, 35], [41, 31.5], [39, 35], [42, 36], [37, 39])] },
      { c: 'down', s: [ell(27, 38, 10, 6.5), ...beads([2.2, 2.8, 2.6, 2.2], 2.4, [21, 33], [26.5, 31.5], [32.5, 32.5], [36.5, 35.5])] },
      { c: 'white', s: ell(19.5, 39, 4.5, 5), mark: true, face: true },
      // wing stub
      { c: 'down', s: ell(30, 37, 4.4, 2.6, -18) },
      { c: 'down', s: line(0.6, [27.5, 37.5], [33, 35.5]), mark: true, dim: true, detail: true },
      // fluffy round head: black crown with a pink bare spot, zebra stripes along the face
      { c: 'white', s: [circ(16, 27.5, 7.6), ...beads(1.5, 1.6, [10.5, 22], [14.5, 20], [20, 20.8])] },
      { c: 'stripe', s: [ell(17.5, 20.8, 6.5, 2.6, 6), curve([1.2, 1.4, 1], [15.5, 27.6], [19, 28], [23.4, 29.6])], mark: true, flat: true },
      { c: 'stripe', s: [curve([0.8, 1.2, 0.8], [13, 31.8], [17, 32.4], [21, 33.6]), curve([0.8, 1.1, 0.8], [17, 24], [20, 24.4], [22.5, 25.6])], mark: true, flat: true, detail: true },
      pixels([17, 20.5], { p: '#f07080' }, ['pp'], { detail: true }),
      pixels([12, 18.5], { s: 'stripe' }, ['s..s.', '.s..s'], { detail: true }),
      { c: 'beak', s: poly([10, 27.2], [4.2, 28.8], [10, 30.4]) },
      pixels([6, 28], { d: '#383838' }, ['d'], { detail: true }),
      pixels([11.5, 23.5], { k: '#202028', w: '#ffffff' }, ['.kk.', 'kwkk', 'kkkk', '.kk.'], { face: true }),
      // the water around its belly
      { c: 'water', s: ell(26, 44, 15, 2.6), flat: true },
      { c: 'foam', s: [curve(0.9, [12, 43], [18, 41.6], [24, 41.4]), curve(0.9, [30, 41.6], [36, 42], [40, 43])], flat: true, outline: false },
    ],
  },

  // -------------------------------------------------------------------------
  // #025 Seefürst – crested grebe rising in its dance on the water, ruff flared
  // -------------------------------------------------------------------------
  seefuerst: {
    pal: {
      white: ['#ffffff', '#f8f8f0', '#c8d0d8', '#405060'], crest: ['#4a4a58', '#2a2a30', '#1c1c22', '#0c0c10'],
      ruff: ['#f8a868', '#d86830', '#a84420', '#401808'], back: '#607080', beak: ['#a07080', '#5a4048', '#3a2830', '#1c1014'],
      streamer: ['#e8f4fc', '#a8c4dc', '#7890b0', '#283850'], water: ['#a8d8f8', '#78b8e8', '#3890e0', '#1c4c80'], foam: '#e8f8ff',
    },
    parts: [
      { c: 'water', s: ell(26, 44.5, 21, 3.4), cut: ell(26, 44.3, 18.5, 2.4), flat: true },
      // far wing's streamer trailing behind
      { c: 'streamer', s: curve([2.6, 2.2, 1.4, 0.6], [32, 29], [36, 25.5], [39.5, 26], [43, 22.5], [46.5, 22]), dim: true },
      // upright body, white breast
      { c: 'back', s: ell(27.5, 34.5, 8.5, 10.5, 8) },
      { c: 'white', s: ell(24, 34.5, 5.5, 9.8, 6), mark: true, face: true },
      // near wing folded at the side, its flight feathers drawn out into long streamers curling up behind
      { c: 'streamer', s: [curve([3.4, 3, 2, 1.2, 0.6], [33, 33], [37, 30], [40.5, 31], [44, 28], [47.5, 28]), curve([3, 2.6, 1.8, 1, 0.6], [34, 37.5], [38, 35.5], [41.5, 36.5], [45, 34], [47.5, 34.5])] },
      { c: 'back', s: [ell(30.5, 33.5, 5.5, 8.5, -25), poly([31, 38], [38, 36], [35, 41])] },
      { c: 'white', s: curve([1.4, 1.2], [26.5, 30], [30, 26.5], [33.5, 27]), mark: true },
      { c: 'back', s: [line(0.6, [28, 35], [36, 37.5]), line(0.6, [29.5, 31.5], [35.5, 34])], mark: true, dim: true, detail: true },
      { c: '#e8f4fc', s: [curve(0.7, [35.5, 31], [37.5, 29.5], [40.5, 30.2], [43.5, 27.6]), curve(0.7, [36.5, 35.8], [38.5, 34.8], [41.5, 35.6], [44.5, 33.6])], mark: true, flat: true, detail: true },
      // long white neck, dark stripe down the nape
      { c: 'white', s: curve([5, 4.8, 4.4], [25, 29], [23.5, 23], [21, 17.5], [19, 13]) },
      { c: 'crest', s: curve([1.6, 1.4], [27, 27], [25.5, 21.5], [23, 16]), mark: true },
      // chestnut ruff flared into a collar around the face, dark-tipped
      { c: 'ruff', s: [ell(20, 12, 5.5, 5), ...[-45, -10, 25, 60, 95, 130, 165].map((d) => leaf(20, 12, 7.6, 3.2, d))] },
      { c: 'crest', s: [circ(20, 12, 8.5)], cut: circ(20, 12, 6.6), mark: true },
      { c: 'ruff', s: [line(0.6, [22, 12.5], [26, 10]), line(0.6, [22.5, 14], [26.5, 15.5]), line(0.6, [21, 15.5], [22.5, 18.5])], mark: true, dim: true, detail: true },
      // head: black cap with two ear tufts, white cheeks, dagger beak, red eye
      { c: 'crest', s: [spike(17, 7.5, 7, 3, -100), spike(19.5, 7.5, 7, 3, -70)] },
      { c: 'white', s: ell(16.5, 10.5, 4.8, 4) },
      { c: 'crest', s: ell(17.3, 7.6, 5.2, 2.4, 5), mark: true },
      { c: 'beak', s: poly([12.8, 9.6], [2.5, 11.2], [12.8, 12.4]) },
      pixels([13, 9], { k: '#200810', r: '#e04050' }, ['rr', 'rk'], { face: true }),
      // rising out of the water, splashing
      { c: 'water', s: ell(27, 45, 16, 2.4), flat: true },
      { c: 'foam', s: [circ(13, 43, 1.1), circ(40, 42.5, 1), circ(15.5, 41.5, 0.7)], flat: true, detail: true },
      { c: 'foam', s: [curve(0.9, [14, 44], [20, 42.8], [26, 42.6]), curve(0.9, [31, 42.8], [37, 43.3], [41, 44.3])], flat: true, outline: false },
    ],
  },

  // -------------------------------------------------------------------------
  // #026 Wühli – star-nosed mole standing up, spade paws raised, sniffing
  // -------------------------------------------------------------------------
  wuehli: {
    pal: {
      velvet: ['#605670', '#4a4050', '#383040', '#1e1824'], sheen: ['#6a6078', '#5a5066', '#463e52', '#1e1824'], pink: '#e8a0a0',
      pebble: '#8a7a70', soil: '#a07848',
    },
    parts: [
      { c: 'pink', s: [ell(19, 44.6, 4, 1.7), ell(31, 44.6, 4, 1.7)] },
      // pebble stuck in the fur on top of the fuzzy oval body
      { c: 'pebble', s: ell(28, 18, 4, 2.8, 12) },
      { c: 'velvet', s: [ell(25, 31.5, 11, 13), curve([2, 0.6], [19, 21.5], [17, 19]), curve([2, 0.6], [34, 24], [36.5, 22])] },
      { c: 'sheen', s: ell(23, 38, 7, 6), mark: true, face: true },
      // tiny squinting eyes over a star of fleshy feelers
      pixels([16, 22.5], { k: '#100c16', l: '#a898c0' }, ['kkk', 'l.l'], { face: true }),
      pixels([24, 22.5], { k: '#100c16', l: '#a898c0' }, ['kkk', 'l.l'], { face: true }),
      pixels([15.5, 24], STAR_NOSE.pal, STAR_NOSE.px, { small: STAR_NOSE.small, face: true }),
      // huge spade forepaws held up beside the face
      {
        c: 'pink',
        s: [
          ell(10.5, 36.5, 4.6, 4.3, -20),
          line([2, 1.7], [7.5, 34.5], [6, 31]), line([2, 1.7], [9.8, 33], [9.3, 29.5]), line([2, 1.7], [12.5, 33], [12.8, 29.5]), line([2, 1.7], [14.8, 34.5], [16, 31.5]),
        ],
      },
      {
        c: 'pink',
        s: [
          ell(38.5, 36.5, 4.6, 4.3, 20),
          line([2, 1.7], [35.2, 34.5], [34, 31.5]), line([2, 1.7], [37.5, 33], [37.2, 29.5]), line([2, 1.7], [40.2, 33], [40.7, 29.5]), line([2, 1.7], [42.5, 34.5], [44, 31]),
        ],
      },
      // soil crumbs
      pixels([30, 39], { s: 'soil' }, ['s.', '.s'], { detail: true }),
      pixels([33, 28], { s: 'soil' }, ['s'], { detail: true }),
      pixels([25, 44], { s: 'soil' }, ['s.s'], { detail: true }),
    ],
  },

  // -------------------------------------------------------------------------
  // #027 Erdwühler – burly mole, crouched, shovel claws raised to dig
  // -------------------------------------------------------------------------
  erdwuehler: {
    pal: {
      fur: ['#5a4e5c', '#3e3440', '#2e2632', '#18121c'], claw: '#9a8a78', snout: '#e89090', shard: '#6a5a50', earth: '#b08040',
    },
    parts: [
      { c: 'earth', s: [ell(24.5, 47.5, 17, 4), circ(13, 45, 2.5), circ(36, 45, 2.5)] },
      pixels([3, 43], { e: 'earth' }, ['e...', '..e.'], { detail: true }),
      pixels([42, 42.5], { e: 'earth' }, ['.e..', '...e'], { detail: true }),
      // jagged rock shards along the back, rising over the hunched shoulders
      { c: 'shard', s: [poly([13.5, 22], [14.5, 10.5], [20, 19]), poly([18.5, 19], [22.5, 5], [27.5, 17]), poly([25.5, 18], [32.5, 3.5], [34, 19]), poly([31.5, 20], [40.5, 8.5], [39, 22]), poly([36.5, 23], [45.5, 15.5], [42, 27])] },
      // hunched, heavy body
      { c: 'fur', s: [ell(25, 27, 15, 11.5), ell(25, 36, 11.5, 8.5)] },
      { c: 'snout', s: [ell(17.5, 44.5, 4.5, 1.8), ell(31, 44.5, 4.5, 1.8)] },
      // shoulders + both arms raised, stone shovel blades up
      { c: 'fur', s: [curve([7, 6], [14, 27], [9, 23], [8, 18]), curve([7, 6], [35, 27], [40, 23], [41, 18])] },
      { c: 'claw', s: shovel(7.5, 18.5, 10, 9.5, -105) },
      { c: 'claw', s: shovel(41.5, 18.5, 10, 9.5, -75) },
      { c: 'shard', s: [line(0.8, [6, 13], [4, 15]), line(0.8, [43, 12], [44, 14.5]), line(0.8, [10, 14], [11, 11])], mark: true, detail: true },
      // head sunk between the shoulders, thick brow bumps hiding the eyes, wide fan of feelers
      { c: 'fur', s: ell(23, 25, 8, 7), face: true },
      { c: 'fur', s: [ell(19.5, 21.5, 3.6, 2.3, -10), ell(26.5, 21.5, 3.6, 2.3, 10)], face: true },
      // back view: the rock ridge runs down the spine
      { c: 'shard', s: [poly([21, 20], [25, 9], [28, 19]), poly([21.5, 27], [25, 16.5], [28.5, 26]), poly([22, 34], [25, 24.5], [28, 33])], backOnly: true },
      {
        c: 'snout',
        s: [...Array.from({ length: 9 }, (_, i) => {
          const t = ((-15 + i * 26.25) * Math.PI) / 180;
          return line([1.6, 1.3], [23 + Math.cos(t) * 1.5, 26.5 + Math.sin(t) * 1.5], [23 + Math.cos(t) * 7, 26.5 + Math.sin(t) * 5.5]);
        }), ell(23, 26.5, 3.4, 2.4)],
        line: false, face: true,
      },
      pixels([21.5, 26], { n: '#8a3048' }, ['n.n'], { face: true }),
    ],
  },
};
