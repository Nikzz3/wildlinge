/**
 * Creature art, part 4: Lexikon #028–#034
 * (stachli, erzborst, bergmaennli, zuckli, zuckwiesel, voltmarder, gondeli).
 * Coordinates are in 48×48 space, ground line y ≈ 45, creatures face left. See src/art/creatures/part1.ts.
 */
import { beads, circ, type CreatureDef, type CreatureDefs, curve, ell, line, type Part, pixels, poly, type Pt, type Shape } from '../shapes';

const EYE = { k: '#202028', w: '#f8f8f8' };

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Point at angle `deg` (0 = right, clockwise) on an ellipse around (cx, cy). */
const onEll = (cx: number, cy: number, rx: number, ry: number, deg: number): Pt => [cx + Math.cos(rad(deg)) * rx, cy + Math.sin(rad(deg)) * ry];

/** Maps local (u, v) offsets around (cx, cy) into 48-space, rotated by `deg` (clockwise): for tilted bodies. */
function tilt(cx: number, cy: number, deg: number): (u: number, v: number) => Pt {
  const [c, s] = [Math.cos(rad(deg)), Math.sin(rad(deg))];
  return (u, v) => [cx + u * c - v * s, cy + u * s + v * c];
}

/** Rounded rectangle centered at (cx, cy), `w`×`h`, corner radius `r`, rotated by `deg`. */
function roundRect(cx: number, cy: number, w: number, h: number, r: number, deg: number): Shape {
  const P = tilt(cx, cy, deg);
  const [hw, hh] = [w / 2 - r, h / 2 - r];
  const corners: readonly (readonly [number, number, number])[] = [[hw, hh, 0], [-hw, hh, 90], [-hw, -hh, 180], [hw, -hh, 270]];
  return poly(...corners.flatMap(([u, v, a0]) => [0, 1, 2, 3].map((k) => P(u + Math.cos(rad(a0 + k * 30)) * r, v + Math.sin(rad(a0 + k * 30)) * r))));
}

/** Pointed spike from base (x, y), `len` long, base `wid` wide, pointing at `deg`. */
function spike(x: number, y: number, len: number, wid: number, deg: number): Shape {
  const [c, s] = [Math.cos(rad(deg)), Math.sin(rad(deg))];
  const h = wid / 2;
  return poly([x - s * h, y + c * h], [x + c * len, y + s * len], [x + s * h, y - c * h]);
}

/** The outer `f` part of a spike (same tip, same taper): metal tips on quills. */
function spikeTip(x: number, y: number, len: number, wid: number, deg: number, f: number): Shape {
  const [c, s] = [Math.cos(rad(deg)), Math.sin(rad(deg))];
  return spike(x + c * len * (1 - f), y + s * len * (1 - f), len * f, wid * f, deg);
}

/** Crystal prism from base (x, y), `len` long, `wid` wide, pointing at `deg`: [whole, the half facing the light]. */
function crystal(x: number, y: number, len: number, wid: number, deg: number): [Shape, Shape] {
  const P = tilt(x, y, deg);
  const h = wid / 2;
  const lit = 0.6 * Math.sin(rad(deg)) - 0.8 * Math.cos(rad(deg)) > 0 ? h : -h;
  return [poly(P(0, -h), P(len * 0.68, -h), P(len, 0), P(len * 0.68, h), P(0, h)), poly(P(0, 0), P(0, lit), P(len * 0.68, lit), P(len, 0))];
}

/** Jagged polyline from a to b in `n` segments, kinks alternating `amp` to either side: sparks, static, zigzag stripes. */
function zigzag(a: Pt, b: Pt, n: number, amp: number): Pt[] {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len = Math.hypot(dx, dy) || 1;
  const [nx, ny] = [-dy / len, dx / len];
  return Array.from({ length: n + 1 }, (_, i): Pt => {
    const o = i === 0 || i === n ? 0 : i % 2 ? amp : -amp;
    return [a[0] + (dx * i) / n + nx * o, a[1] + (dy * i) / n + ny * o];
  });
}

/** Quills of a hedgehog: base on an ellipse around (cx, cy) at each angle, pointing at `dir(angle)`. */
function quills(cx: number, cy: number, rx: number, ry: number, angles: readonly number[], len: (a: number) => number, wid: number, dir: (a: number) => number) {
  return angles.map((a) => {
    const [x, y] = onEll(cx, cy, rx, ry, a);
    return { x, y, len: len(a), wid, d: dir(a) };
  });
}

// -----------------------------------------------------------------------------
// Stachli quills: laid back over the dome in three rows (outer silhouette, middle, front).
// -----------------------------------------------------------------------------
const lay = (a: number) => a * 0.55 - 22;
const STACHLI_ROWS = [
  quills(29.5, 36.5, 10.5, 9.5, [-168, -147, -126, -105, -84, -63, -42, -21, 0], () => 8.5, 5.4, lay),
  quills(30, 37.5, 7.5, 6.5, [-158, -130, -102, -74, -46, -18], () => 8, 5.2, lay),
  quills(30.5, 38.5, 4, 3, [-140, -100, -60, -20], () => 7.5, 5, lay),
];

// -----------------------------------------------------------------------------
// Erzborst nails: long steel spikes radiating from the half-rolled body.
// -----------------------------------------------------------------------------
const ERZ_C: Pt = [27.5, 26.5];
/** Angle on the ball and visible length of each nail. */
const ERZ_NAILS: readonly (readonly [number, number])[] = [
  [-176, 8], [-156, 10], [-136, 10.5], [-116, 10.5], [-96, 10.5], [-76, 10.5], [-56, 10.5], [-36, 10], [-16, 9], [4, 8.5], [24, 8], [44, 7],
];
/** A nail rooted inside the ball, leaning back a little: long steel shaft, short sharp point. */
const erzNail = ([a, len]: readonly [number, number]): Shape => {
  const [x, y] = onEll(...ERZ_C, 11.5, 11.5, a);
  return line([3.6, 3.2, 2.7, 0.6], [x, y], onEll(x, y, len + 3, len + 3, a + 8));
};

/** A crystal cluster: [base x, base y, length, width, direction] per prism → [prisms, lit faces]. */
function cluster(prisms: readonly (readonly [number, number, number, number, number])[]): [Shape[], Shape[]] {
  const cs = prisms.map(([x, y, l, w, d]) => crystal(x, y, l, w, d));
  return [cs.map((c) => c[0]), cs.map((c) => c[1])];
}
const ERZ_COPPER = cluster([[32.5, 13.5, 7.5, 3.4, -70], [35, 14.5, 6, 3, -35], [30.5, 14, 5, 2.8, -105], [40, 23, 6, 3.2, -15], [39.5, 25.5, 5, 2.8, 15]]);
const BERG_QUARTZ = cluster([[8.5, 14, 9, 3.8, -92], [10, 14, 6.5, 3, -55], [7, 14, 6, 3, -130]]);

/** Zuckli's static: [base x, base y, direction] of each spike standing up along its back. */
const ZUCKLI_STATIC: readonly (readonly [number, number, number])[] = [[24.5, 22.5, -40], [26, 25.5, -25], [27, 28.5, -10], [28, 31.5, 0], [29, 34.5, 10]];

/** Voltmarder's mane of charged fur: [base x, base y, length, direction] per spike, brow to shoulders. */
const VOLT_MANE: readonly (readonly [number, number, number, number])[] = [[14, 20.5, 5.5, -120], [17.5, 20.5, 7.5, -98], [21.5, 21.5, 8.5, -78], [25.5, 23, 8, -62], [29.5, 25, 6.5, -48]];

export const PART4: CreatureDefs = {
  // -------------------------------------------------------------------------
  // #028 Stachli – little iron hedgehog trotting forward, nose raised, sniffing
  // -------------------------------------------------------------------------
  stachli: {
    pal: {
      iron: ['#98a0a8', '#707880', '#566068', '#22262e'], silver: ['#f4f8fc', '#c8d0d8', '#a0aab4', '#3a4048'],
      face: '#c89a70', cream: '#ecd2b0', paw: '#9a7050', nose: '#3a3a40', rust: '#a05a30',
    },
    parts: [
      // far legs
      { c: 'paw', s: [ell(22, 44.4, 2.6, 1.6), ell(35.5, 44.4, 2.6, 1.6)], dim: true },
      // dome of quills: three rows laid back, silver tips
      ...STACHLI_ROWS.flatMap((row, i): Part[] => [
        { c: 'iron', s: [...row.map((q) => spike(q.x, q.y, q.len, q.wid, q.d)), ...(i === 0 ? [ell(30, 38.5, 11, 6.5)] : [])] },
        { c: 'silver', s: row.map((q) => spikeTip(q.x, q.y, q.len, q.wid, q.d, 0.38)), mark: true },
      ]),
      // rivets at the quill bases, a few rust spots
      pixels([27.5, 39.5], { r: 'silver' }, ['r...r...r'], { detail: true }),
      pixels([32, 30.5], { r: 'rust', d: '#7a4020' }, ['rd', 'd.'], { detail: true }),
      pixels([39, 35], { r: 'rust' }, ['r'], { detail: true }),
      pixels([24, 30], { r: 'rust' }, ['r'], { detail: true }),
      // head: round tan face tapering into a pointed snout, raised to sniff; round ear
      { c: 'face', s: circ(21.5, 32.8, 2.3) },
      { c: 'cream', s: circ(21.5, 33, 1.1), mark: true, face: true },
      { c: 'face', s: [ell(17.5, 38, 6, 5.4), poly([15, 33], [9, 33], [7, 34.5], [9.5, 37], [15, 42])] },
      { c: 'cream', s: ell(15, 41.5, 5.5, 2.4, -15), mark: true, face: true },
      { c: 'iron', s: [spike(21, 36, 7, 5, -120), spike(18.5, 36.5, 6.5, 4.6, -145), spike(22.5, 38, 6, 4.6, -100)], backOnly: true },
      { c: 'silver', s: [spikeTip(21, 36, 7, 5, -120, 0.38), spikeTip(18.5, 36.5, 6.5, 4.6, -145, 0.38), spikeTip(22.5, 38, 6, 4.6, -100, 0.38)], mark: true, backOnly: true },
      pixels([6, 33], { n: 'nose', w: '#8a8a94' }, ['wn', 'nn']),
      pixels([13, 34], EYE, ['.kk.', 'kwkk', 'kkkk', '.kk.'], { face: true }),
      pixels([10, 37.5], { m: '#8a5a40' }, ['m..', '.mm'], { face: true, detail: true }),
      // near legs, trotting: fore leg lifted, hind leg pushing off
      { c: 'paw', s: [curve([3, 2.6], [18.5, 42], [15.5, 43], [13, 42.2])] },
      { c: 'paw', s: ell(31.5, 44.5, 3, 1.7) },
    ],
  },

  // -------------------------------------------------------------------------
  // #029 Erzborst – boulder hedgehog half rolled into a ball of nails, peeking out from under its brow
  // -------------------------------------------------------------------------
  erzborst: {
    pal: {
      steel: ['#96a2b0', '#64707c', '#4a5260', '#1e2028'], nail: ['#e8eef4', '#a8b4c0', '#7a8692', '#2a2c34'],
      copper: ['#ffc080', '#e07a38', '#b05428', '#3a1a08'], ore: ['#8a8490', '#4a4650', '#34303a', '#16141a'],
      face: '#b08040', muzzle: '#e0bc88', paw: '#6a4828', nose: '#2a2228', claw: '#f0e8d8',
    },
    parts: [
      // far hind foot
      { c: 'paw', s: ell(38, 43.5, 4.5, 2.4), dim: true },
      // big nails around the hunched, half-rolled back
      { c: 'nail', s: ERZ_NAILS.map(erzNail) },
      // the face, peeking out from under the steel mantle
      { c: 'face', s: [ell(14, 34.5, 8.5, 7), ell(6.5, 37, 5, 3.6, -8)] },
      { c: 'muzzle', s: ell(7, 39.5, 6, 2.6, -8), mark: true, face: true },
      { c: 'steel', s: [circ(...ERZ_C, 14.5), ell(26, 36, 13, 7)], cut: poly([0, 33], [8, 31], [16, 32.5], [23, 30.5], [25, 36], [22, 48], [0, 48]) },
      // seams running from the nail roots over the mantle
      {
        c: 'steel',
        s: ERZ_NAILS.slice(1, 10).map(([a]) => line([0.6, 1.2], onEll(...ERZ_C, 6, 6, a + 8), onEll(...ERZ_C, 13.5, 13.5, a + 8))),
        mark: true, dim: true, detail: true,
      },
      // copper crystals and a lump of iron ore studded in the back, sticking out between the nails
      { c: 'ore', s: poly([18.5, 16.5], [18, 13], [21, 10.5], [24.5, 11.5], [25, 15], [22, 17.5]), flat: true },
      { c: '#7a7484', s: poly([18, 13], [21, 10.5], [24.5, 11.5], [21.5, 13.5]), mark: true, flat: true },
      pixels([19.5, 14], { h: '#e0e4f0', c: 'copper' }, ['h.c', '..h'], { detail: true }),
      // copper flecks in the mantle
      pixels([30, 19], { c: 'copper', d: '#984a20' }, ['cc.', '.dc'], { detail: true }),
      pixels([24, 25], { c: 'copper' }, ['c.', '.c'], { detail: true }),
      pixels([36, 30], { c: 'copper', d: '#984a20' }, ['.c', 'cd'], { detail: true }),
      { c: 'copper', s: ERZ_COPPER[0], flat: true },
      { c: '#ffc890', s: ERZ_COPPER[1], mark: true, flat: true },
      // narrowed, determined eyes under the heavy brow
      pixels([8.5, 32], { d: '#3a2418', k: '#141014', w: '#fff4e0' }, ['ddd..', '.dddd', '.wkkd', '..kk.'], { face: true }),
      pixels([16, 32], { d: '#3a2418', k: '#141014', w: '#fff4e0' }, ['..dd', 'ddd.', 'wkk.', 'kk..'], { face: true }),
      pixels([1, 35.5], { n: 'nose', w: '#7a6a70' }, ['wn', 'nn']),
      pixels([4, 40], { m: '#6a4020' }, ['m..', '.mm'], { face: true, detail: true }),
      // short powerful legs, claws gripping the ground
      { c: 'paw', s: [ell(21, 41.5, 4.6, 3.6), ell(19.5, 44.3, 5, 2)] },
      { c: 'paw', s: [ell(32.5, 41.5, 4.6, 3.6), ell(31, 44.3, 5, 2)] },
      pixels([14, 44.5], { c: 'claw' }, ['c.c.c'], { detail: true }),
      pixels([25.5, 44.5], { c: 'claw' }, ['c.c.c'], { detail: true }),
    ],
  },

  // -------------------------------------------------------------------------
  // #030 Bergmännli – tiny ghost miner floating along, quartz lantern raised high, peering ahead
  // -------------------------------------------------------------------------
  bergmaennli: {
    pal: {
      hood: ['#9484d0', '#6858a0', '#4c3e80', '#1e1838'], band: ['#b8acec', '#9a8cd8', '#7466b0', '#2a2250'],
      robe: ['#6a5ca0', '#4c4080', '#3a3060', '#16122a'], wisp: ['#c8c0f0', '#a098d8', '#7c72b8', '#2a2450'],
      beard: ['#ffffff', '#ececf4', '#bcbccc', '#4a4860'], pick: ['#b8aa98', '#8a7a68', '#66584a', '#2a2018'],
      metal: ['#d0d4e0', '#9096a8', '#686e80', '#24262e'], quartz: ['#ffffff', '#a0f0f0', '#60c8d0', '#1a5060'],
      glow: '#e0fcfc', shadow: '#3a3060', nose: '#f0b8c8', skin: '#f0d0c0', eye: '#c8ffff',
    },
    parts: [
      // lantern glow
      { c: 'glow', s: circ(8.5, 8, 7), flat: true, outline: false, detail: true },
      // pickaxe slung across the back
      { c: 'pick', s: line(2, [37, 12], [28, 31]) },
      { c: 'metal', s: curve([1.4, 3, 1.4], [30, 10], [35, 9.5], [39.5, 12], [42.5, 16.5]) },
      // wispy ghost tail curling away below the beard
      { c: 'wisp', s: curve([7, 6, 4.5, 2.6, 1], [23, 33], [25.5, 38.5], [31, 42], [37, 41], [40, 37.5]) },
      // little robed body; the far arm raised behind the beard, holding up the quartz crystal like a lantern
      { c: 'robe', s: ell(24.5, 27.5, 7, 7.5) },
      { c: 'robe', s: curve([3.8, 3.2, 2.8], [16, 26], [11.5, 23], [9, 17.5]) },
      { c: 'skin', s: circ(8.5, 15.5, 2.3) },
      { c: 'quartz', s: BERG_QUARTZ[0], flat: true },
      { c: '#e0ffff', s: BERG_QUARTZ[1], mark: true, flat: true },
      // hood: tall pointed cap, tip flopping backwards, a pale band around the brim
      { c: 'hood', s: poly([12.5, 16.5], [15, 10], [19, 5], [24.5, 1.8], [30, 1], [34.5, 2.8], [37, 6.8], [33, 5.3], [29.5, 7.8], [28.5, 11.5], [30.5, 16.5]) },
      { c: 'hood', s: curve([1, 0.5], [20, 7], [17.5, 11.5], [16.5, 14]), mark: true, dim: true, detail: true },
      { c: 'band', s: roundRect(21.5, 15.8, 19.5, 3, 1.5, 0) },
      // back view: the robe covers the back, no beard
      { c: 'robe', s: ell(20, 25.5, 8, 8.5), backOnly: true },
      // face in the shadow of the hood: glowing eyes, big round nose, long white beard falling to a point
      { c: 'shadow', s: ell(19.5, 20, 7, 3.6), flat: true, face: true },
      pixels([13.5, 18], { e: 'eye', w: '#ffffff' }, ['ee.', 'wee'], { face: true }),
      pixels([20, 18], { e: 'eye', w: '#ffffff' }, ['.ee', 'wee'], { face: true }),
      {
        c: 'beard',
        s: [poly([12.5, 21.5], [26, 21.5], [25, 27.5], [22.5, 33.5], [19, 38.5], [16, 33], [13, 27.5]), ...beads([2, 1.8, 1.2], 2, [12.5, 22.5], [13.5, 29], [18.5, 37.5])],
        face: true,
      },
      { c: 'beard', s: [curve(0.6, [17, 25.5], [18, 31], [19, 35.5]), curve(0.6, [21.5, 25.5], [21.5, 30.5])], mark: true, dim: true, face: true, detail: true },
      { c: 'nose', s: ell(17, 22, 2.5, 2.2), face: true },
      pixels([2, 2.5], { g: 'quartz' }, ['g...', '....', '...g'], { detail: true }),
      pixels([14, 1.5], { g: 'quartz' }, ['g'], { detail: true }),
    ],
  },

  // -------------------------------------------------------------------------
  // #031 Zuckli – stoat kit standing up on its hind legs, alert, whiskers sparking
  // -------------------------------------------------------------------------
  zuckli: {
    pal: {
      fur: ['#c07a48', '#9a5a30', '#784424', '#2e1608'], dark: '#5a3418', belly: '#f8f0d0', tip: '#2a2a2a', spark: '#c8b8ff',
      ear: '#e8a898', nose: '#2a1a14',
    },
    parts: [
      // tail swept out behind, black tip
      { c: 'fur', s: curve([3.6, 3.2, 2.8, 2.6], [28, 41], [35, 43], [40, 40], [41.5, 34]) },
      { c: 'tip', s: curve([2.8, 2.6, 2], [41, 37], [41.5, 34], [40.5, 31.5]) },
      { c: 'fur', s: ell(21.5, 44.5, 2.8, 1.6), dim: true },
      // static: the fur along the back stands up in zigzag spikes, sparks at the tips
      { c: 'fur', s: ZUCKLI_STATIC.map(([x, y, d]) => spike(x, y, 4.5, 3.6, d)) },
      { c: 'spark', s: ZUCKLI_STATIC.map(([x, y, d]) => spikeTip(x, y, 4.5, 3.6, d, 0.35)), mark: true, flat: true },
      // slim upright body, cream front
      { c: 'fur', s: curve([7, 8.5, 9.5], [22.5, 24], [24, 31], [25.5, 38]) },
      { c: 'belly', s: ell(20.5, 32, 3.5, 8.5, -8), mark: true, face: true },
      // haunch and long hind foot
      { c: 'fur', s: [ell(27.5, 39, 5, 5), ell(25.5, 44.5, 4.5, 1.6)] },
      // forepaws held up at the chest
      { c: 'fur', s: curve([2.4, 2], [21.5, 27.5], [18.5, 29], [17.5, 31]) },
      { c: 'dark', s: ell(17.5, 31.2, 1.4, 1.1) },
      // head: long and flat, pointed muzzle, small round ears pricked
      { c: 'fur', s: circ(24.5, 14.5, 2), dim: true },
      { c: 'fur', s: circ(21, 13.8, 2.3) },
      { c: 'ear', s: circ(20.8, 14.1, 1.1), mark: true, face: true },
      { c: 'fur', s: [ell(19.5, 18.5, 6.2, 4.6), ell(13.5, 20, 4.2, 2.6, -8)] },
      { c: 'belly', s: ell(15, 22, 5.5, 2, -8), mark: true, face: true },
      pixels([9, 18.5], { n: 'nose', w: '#7a5a50' }, ['wn', 'nn']),
      pixels([14, 15.5], EYE, ['.kk.', 'kwkk', 'kkkk', '.kk.'], { face: true }),
      pixels([20.5, 16], EYE, ['kk', 'wk', 'kk'], { face: true }),
      pixels([11, 21.5], { m: '#7a3a20' }, ['m.m', '.m.'], { face: true, detail: true }),
      // long stiff whiskers like antennae, sparks crackling at the tips
      { c: '#6a4a38', s: [line(0.6, [11, 19.8], [3, 13.5]), line(0.6, [10.5, 20.6], [1.5, 19.5]), line(0.6, [11, 21.4], [3.5, 26])], flat: true, outline: false, face: true },
      pixels([1.5, 12], { s: 'spark', w: '#ffffff' }, ['.s.', 'sws', '.s.'], { face: true }),
      pixels([0, 18.5], { s: 'spark', w: '#ffffff' }, ['.s.', 'sws', '.s.'], { face: true }),
      pixels([2.5, 25], { s: 'spark', w: '#ffffff' }, ['.s.', 'sws', '.s.'], { face: true, detail: true }),
      pixels([0.5, 15], { s: 'spark' }, ['s', '.', 's'], { face: true, detail: true }),
    ],
    icon: { box: [5, 10, 43, 46] },
  },

  // -------------------------------------------------------------------------
  // #032 Zuckwiesel – sleek weasel dashing diagonally in an S-curve, whiskers trailing arcs of light
  // -------------------------------------------------------------------------
  zuckwiesel: {
    pal: {
      fur: ['#8a5434', '#6a3a20', '#522c18', '#200c04'], cream: '#fff0c0', black: '#303030', zig: ['#e8f4ff', '#88b8f8', '#5a88d0', '#1a3060'],
      arc: '#c8b8ff', ear: '#e0a088',
    },
    parts: [
      // arcs of light trailing from the whisker tips
      { c: '#9a88e8', s: [curve([1.8, 1.4, 0.6], [5.5, 14], [12, 9.5], [22, 8.5], [32, 6]), curve([1.6, 1.2, 0.5], [8.5, 15.5], [15, 12.5], [24, 12.5], [31, 11])], flat: true, outline: false, detail: true },
      { c: 'arc', s: [curve([1, 0.8, 0.3], [5.5, 13.6], [12, 9.1], [22, 8.1], [30, 6]), curve([0.9, 0.6, 0.3], [8.5, 15.1], [15, 12.1], [24, 12.1])], flat: true, outline: false, detail: true },
      // far legs (dim): hind stretched back, fore reaching forward
      { c: 'fur', s: curve([3, 2.4, 2], [33, 23], [38.5, 28], [43, 31]), dim: true },
      { c: 'black', s: ell(44, 31.5, 1.8, 1.3, 30), dim: true },
      { c: 'fur', s: curve([3, 2.4, 2], [18, 30], [13, 33], [9.5, 36.5]), dim: true },
      { c: 'black', s: ell(8.5, 37, 1.8, 1.3, -30), dim: true },
      // tail streaming up behind, black tip
      { c: 'fur', s: curve([4, 3.6, 3.4], [35, 20], [40, 16], [43, 11]) },
      { c: 'black', s: curve([3.4, 3, 1.6], [42.5, 12.5], [44.5, 8], [47, 5.5]) },
      // long body in an S-curve, low chest rising to the hips
      { c: 'fur', s: curve([7, 8, 7.5, 6.5], [14, 25.5], [20, 29], [28, 25.5], [36, 20]) },
      { c: 'cream', s: curve([3, 3.6, 3], [15, 29.5], [21, 32.5], [29, 29]), mark: true, face: true },
      { c: 'zig', s: line(1.6, ...zigzag([17, 27.5], [34, 20.5], 6, 1.3)), mark: true, flat: true },
      // near legs stretched to the limit
      { c: 'fur', s: [ell(33.5, 22, 4.6, 4.4), curve([3.4, 2.8, 2.2], [35, 24], [40.5, 27.5], [45.5, 28.5])] },
      { c: 'black', s: ell(46, 28.6, 2, 1.4, 10) },
      { c: 'fur', s: curve([3.6, 3, 2.4], [18, 30.5], [12, 35.5], [6.5, 39.5]) },
      { c: 'black', s: ell(5.5, 40, 2.2, 1.5, -30) },
      // head reaching forward: small round ears, cream chin
      { c: 'fur', s: circ(14, 17.5, 2.4) },
      { c: 'ear', s: circ(14, 17.8, 1.1), mark: true, face: true },
      { c: 'fur', s: [ell(10, 22, 6.5, 5.2, -5), ell(4, 24, 4, 2.8, -5)] },
      { c: 'cream', s: ell(6.5, 26.5, 6, 2.2, -5), mark: true, face: true },
      pixels([0, 22], { n: '#201008', w: '#7a5a50' }, ['wn', 'nn']),
      pixels([6, 19.5], EYE, ['.kk.', 'kwkk', 'kkkk', '.kk.'], { face: true }),
      pixels([12, 20], EYE, ['kk', 'wk', 'kk'], { face: true }),
      // whiskers swept back by the wind
      { c: '#3a2a20', s: [line(0.6, [2.5, 22], [5.5, 14]), line(0.6, [3, 22.5], [8.5, 15.5])], flat: true, outline: false, face: true },
    ],
  },

  // -------------------------------------------------------------------------
  // #033 Voltmarder – storm marten pouncing, storm-cloud tail arched over its back, arcs crackling
  // -------------------------------------------------------------------------
  voltmarder: {
    pal: {
      fur: ['#7a84a0', '#485066', '#363c52', '#161822'], mane: ['#a8b0d0', '#6a7294', '#50587a', '#1c1e30'], bib: ['#fff4b8', '#f0d878', '#c8a850', '#4a3a10'], cream: '#f8f0d0',
      arc: ['#ffffff', '#c8b8ff', '#9a88e0', '#3a2c78'], dark: ['#3a3e50', '#202028', '#18181e', '#08080c'],
      cloud: ['#e0e6f0', '#b0b8c8', '#8890a8', '#2c3044'], storm: '#6a7290', bolt: '#fff090',
    },
    parts: [
      // storm-cloud tail arched over the back: billowing puffs, dark underside, lightning inside
      {
        c: 'cloud',
        s: [
          curve([5, 7, 8, 7, 5], [40, 32], [43, 22], [40, 12], [32, 8], [25, 9]),
          circ(41.5, 31, 3.6), circ(45, 24.5, 4.2), circ(45, 16.5, 4.6), circ(40.5, 9.5, 5), circ(33, 5.5, 4.6), circ(26, 6.5, 3.8), circ(22.5, 10, 2.8),
        ],
      },
      { c: 'storm', s: curve([3, 4, 4.4, 3.4, 2], [37.5, 31], [39, 23], [37, 15.5], [31.5, 12], [24.5, 12.5]), mark: true },
      { c: '#f4f8fc', s: [circ(39.5, 7.5, 1.6), circ(31.5, 3.5, 1.4), circ(43.5, 14.5, 1.4)], mark: true, flat: true, detail: true },
      { c: 'bolt', s: line(1.1, ...zigzag([42, 12], [44, 26], 4, 1.4)), mark: true, flat: true },
      // far legs (dim): fore paw raised, claws out; hind foot
      { c: 'fur', s: [curve([4, 3.4, 3], [17, 30], [11, 28.5], [6.5, 27.5]), ell(5, 27.5, 2.4, 2)], dim: true },
      pixels([1.5, 26], { c: '#c8c8d8' }, ['c.', '..', 'c.'], { detail: true }),
      { c: 'fur', s: [curve([4, 3.4], [42, 34], [44.5, 43]), ell(45, 44.3, 3.2, 1.6)], dim: true },
      // mane of charged fur standing up from the brow down the shoulders, sparking at the tips
      { c: 'mane', s: VOLT_MANE.map(([x, y, l, d]) => spike(x, y, l, 4.4, d)) },
      { c: 'arc', s: VOLT_MANE.map(([x, y, l, d]) => spikeTip(x, y, l, 4.4, d, 0.35)), mark: true, flat: true },
      // muscular body, pouncing: hips up, chest low, pale bib on the chest
      { c: 'fur', s: [ell(27, 30, 12.5, 7.5, -18), ell(17.5, 32.5, 7.5, 7)] },
      { c: 'bib', s: [ell(14.5, 31.5, 6, 5), poly([10, 33], [14.5, 39.5], [18.5, 34])], mark: true, face: true },
      // hind leg bunched to spring
      { c: 'fur', s: [ell(36, 31, 6, 7.5, -25), curve([4.6, 3.6], [37.5, 35], [40, 43.5])] },
      { c: 'fur', s: ell(39, 44.5, 4.8, 1.8) },
      // near fore leg reaching out, claws spread
      { c: 'fur', s: curve([5, 4.2, 3.4], [20, 38], [12, 40.5], [5, 40.5]) },
      { c: 'dark', s: ell(4, 40.6, 2.6, 2) },
      pixels([0, 40], { c: '#f0f0f8' }, ['c.', '..', 'c.'], { detail: true }),
      // sharp head held low: pointed ears, wedge muzzle with a pale underside
      { c: 'fur', s: poly([7.5, 21], [8, 14.5], [12, 19]), dim: true },
      { c: 'fur', s: poly([13, 20], [15.5, 13.5], [18.5, 20]) },
      { c: 'bib', s: poly([14.2, 18.5], [15.3, 15.5], [16.6, 18.8]), mark: true, face: true },
      { c: 'fur', s: [ell(12.5, 24, 6.5, 5.2), poly([8, 21], [0.5, 25.5], [1.5, 27], [9, 28.5])] },
      { c: 'cream', s: poly([0.5, 26.2], [9, 26], [11, 29.5], [5, 29]), mark: true, face: true },
      pixels([-0.5, 24.5], { n: 'dark' }, ['nn', 'n.']),
      pixels([4.5, 21.5], { k: '#101018', y: '#f0e060', w: '#ffffff' }, ['k..', 'wyk', '.kk'], { face: true }),
      pixels([10.5, 21], { k: '#101018', y: '#f0e060', w: '#ffffff' }, ['kkk..', '.wyyk', '..kk.'], { face: true }),
      // whiskers; an arc jumps from their tips up to the storm tail
      { c: '#101018', s: [line(0.6, [3.5, 26], [-1, 20]), line(0.6, [3.5, 27], [-1.5, 28.5])], flat: true, outline: false, face: true },
      { c: 'arc', s: line(1.3, ...zigzag([-0.5, 19], [21.5, 8.5], 6, 1.6)), flat: true, detail: true },
    ],
  },

  // -------------------------------------------------------------------------
  // #034 Gondeli – living cable-car cabin swinging from a crackling cable
  // -------------------------------------------------------------------------
  gondeli: ((): CreatureDef => {
    const P = tilt(24, 31, -7);
    return {
      pal: {
        red: ['#f86858', '#d03830', '#a02828', '#401010'], glass: ['#ffffff', '#f8f8f0', '#c8d8e0', '#40505a'],
        metal: ['#c0ccd8', '#8898a8', '#647484', '#283038'], trim: ['#5a6470', '#303840', '#202830', '#101418'],
        cable: ['#7a828c', '#505860', '#3a4048', '#181c20'], spark: '#f0d040',
      },
      parts: [
        // the cable crossing the box
        { c: 'cable', s: line(1.2, [-2, 4], [50, 15]) },
        // hook arm gripping the cable, pulley wheels
        { c: 'metal', s: [curve(2.4, P(1, -11), P(1, -15), [25.5, 13.5], [27, 10.5], [24.5, 9])] },
        { c: 'trim', s: [circ(20.5, 8.5, 2), circ(29, 10.3, 2)] },
        pixels([20, 8], { h: 'metal' }, ['h']),
        pixels([28.5, 10], { h: 'metal' }, ['h']),
        // wheel hands on short arms
        { c: 'metal', s: [line(1.6, P(-12, 2), P(-15.5, 4))], dim: true },
        { c: 'metal', s: [line(1.6, P(12, 2), P(15.5, 4))] },
        // the cabin: red body, metal roof cap, dark skirt with a white stripe
        { c: 'red', s: roundRect(24, 31, 24, 20, 5, -7) },
        { c: 'metal', s: roundRect(...P(0, -10), 15, 3.4, 1.7, -7) },
        { c: 'trim', s: poly(P(-12, 6), P(12, 6), P(12, 10), P(-12, 10)), mark: true },
        { c: '#f8f8f0', s: poly(P(-12, 4.2), P(12, 4.2), P(12, 5.2), P(-12, 5.2)), mark: true, flat: true },
        // window eyes looking ahead
        { c: 'glass', s: [roundRect(...P(-5.5, -2.5), 8.5, 8, 2.5, -7), roundRect(...P(5, -2.5), 8, 8, 2.5, -7)], face: true },
        pixels(P(-8.5, -3.5), EYE, ['.kk.', 'kwkk', 'kkkk', '.kk.'], { face: true }),
        pixels(P(1.5, -3.5), EYE, ['.kk.', 'kwkk', 'kkkk', '.kk.'], { face: true }),
        pixels(P(-1.5, 3), { m: '#401010' }, ['m..m', '.mm.'], { face: true }),
        // back view: one wide rear window
        { c: 'glass', s: roundRect(...P(0, -3), 19, 7, 2.5, -7), backOnly: true },
        { c: 'trim', s: line(1, P(0, -6.5), P(0, 0.5)), mark: true, backOnly: true },
        // wheel hands: rims with a dark hub
        { c: 'metal', s: circ(...P(-15.5, 4), 3), dim: true },
        { c: 'metal', s: circ(...P(15.5, 4), 3) },
        pixels(P(-17, 2.5), { h: 'trim', s: '#a0acb8' }, ['.s.', 'shs', '.s.']),
        pixels(P(14, 2.5), { h: 'trim', s: '#c0ccd8' }, ['.s.', 'shs', '.s.']),
        // sparks crackling on the cable
        { c: 'spark', s: [line(0.9, ...zigzag([18, 7.5], [14, 1.5], 3, 1)), line(0.9, ...zigzag([31.5, 10.5], [36, 5], 3, 1))], flat: true, detail: true },
        pixels([13, 0.5], { s: 'spark', w: '#fffce0' }, ['.s.', 'sws', '.s.'], { detail: true }),
        pixels([35.5, 3.5], { s: 'spark', w: '#fffce0' }, ['.s.', 'sws', '.s.'], { detail: true }),
      ],
      icon: { box: [8, 6, 40, 42] },
    };
  })(),
};
