/**
 * Creature art, part 3: Lexikon #031–#044
 * (zuckli, zuckwiesel, voltmarder, gondeli, guggerli, floeckli, firnhase, steimandli,
 * foehngeier, bernhardin, wyssli, edelwyss, firngeist, lindglut).
 * Drawn so far: floeckli + firnhase (Frostmantel's grunts bring Flöckli to the Flüsterwald), steimandli (Hüter
 * Jost's ace) and lindglut (the guardian on the title screen); the others still use the generic art.
 * Coordinates are in 48×48 space, ground line y ≈ 45, creatures face left. See src/art/creatures/part1.ts.
 */
import { beads, circ, type CreatureDefs, curve, ell, line, pixels, poly, type Shape } from '../shapes';

/** Pointed ray of a sunburst around (cx, cy): base `hw` wide at radius r0, tip at r1, direction `deg` (0 = right, clockwise). */
function ray(cx: number, cy: number, deg: number, r0: number, r1: number, hw: number): Shape {
  const t = (deg * Math.PI) / 180;
  const [c, s] = [Math.cos(t), Math.sin(t)];
  return poly([cx + c * r0 - s * hw, cy + s * r0 + c * hw], [cx + c * r1, cy + s * r1], [cx + c * r0 + s * hw, cy + s * r0 - c * hw]);
}

/** Leaf-shaped part (ears, feathers) growing from its base (x, y), `len` long, `wid` wide, pointing at `deg`. */
function leaf(x: number, y: number, len: number, wid: number, deg: number): Shape {
  const t = (deg * Math.PI) / 180;
  return ell(x + (Math.cos(t) * len) / 2, y + (Math.sin(t) * len) / 2, len / 2, wid / 2, deg);
}

const EYE = { k: '#202830', w: '#ffffff' };
const SNOWFLAKE = ['..b..', 'b.b.b', '.bbb.', 'b.b.b', '..b..'];

export const PART3: CreatureDefs = {
  // -------------------------------------------------------------------------
  // #036 Flöckli – round snow hare kit, crouched low, ears straight up
  // -------------------------------------------------------------------------
  floeckli: {
    pal: {
      snow: ['#ffffff', '#f8f8f8', '#b8d8e8', '#607888'], tip: ['#c8f4fc', '#90d8e8', '#60acc8', '#385868'], ear: '#f4c8d0',
      nose: '#e8a0b0', flake: '#78c0dc',
    },
    parts: [
      // far ear, far fore paw, tail puff
      { c: 'snow', s: leaf(20.5, 24, 16, 5.6, -78), dim: true },
      { c: 'tip', s: leaf(22.5, 15, 9, 6, -78), mark: true, dim: true },
      { c: 'snow', s: ell(20, 44.6, 2.4, 1.4), dim: true },
      { c: 'snow', s: circ(38.5, 33, 3.4) },
      // round body, big haunch and oversized hind foot
      { c: 'snow', s: ell(28, 37.5, 10.5, 7.8) },
      { c: 'snow', s: ell(32, 38.5, 6, 6) },
      { c: 'snow', s: ell(30.5, 44.2, 7.5, 2.4) },
      pixels([25, 44.5], { t: 'tip' }, ['t.t.t'], { detail: true }),
      // head with fluffy cheeks
      { c: 'snow', s: [ell(17.5, 30, 8, 7), ...beads([1.8, 2.2, 1.8], 2.2, [10.5, 33.5], [15, 36.5], [21, 36.5])] },
      // near ear standing straight up: pink inside, frosty blue tip
      { c: 'snow', s: leaf(15.5, 25, 17, 6, -94) },
      { c: 'tip', s: leaf(14.9, 15, 9.5, 6.4, -94), mark: true },
      { c: 'ear', s: leaf(15.6, 24, 11, 2.6, -94), mark: true, face: true },
      // snowflake on the forehead, big eyes, pink nose
      pixels([15.5, 23.5], { b: 'flake' }, SNOWFLAKE, { face: true, detail: true }),
      pixels([11.5, 27.5], EYE, ['.kk.', 'kwkk', 'kkkk', 'kkkk', '.kk.'], { face: true }),
      pixels([19.5, 27.5], EYE, ['kk.', 'wkk', 'kkk', 'kkk', '.k.'], { face: true }),
      pixels([10, 32.5], { n: 'nose' }, ['nn'], { face: true }),
      pixels([10, 34], { m: '#8898a8' }, ['m.m', '.m.'], { face: true, detail: true }),
      // near fore paw
      { c: 'snow', s: ell(14.5, 44.6, 2.6, 1.5) },
    ],
  },

  // -------------------------------------------------------------------------
  // #037 Firnhase – lean glacier hare mid-leap, icicle ears and ice mane streaming back
  // -------------------------------------------------------------------------
  firnhase: {
    pal: {
      frost: ['#ffffff', '#e8f0f8', '#b0c8dc', '#384860'], ice: ['#d0f0fc', '#90c8e0', '#5890b8', '#384860'],
      deep: ['#80b0d0', '#5890b8', '#3c6c98', '#203048'], spark: '#ffffff',
    },
    parts: [
      // far legs: hind stretched back, fore reaching forward
      { c: 'frost', s: [curve([3, 2.4, 2], [33, 30], [38.5, 34], [42.5, 36]), ell(44.5, 36.3, 2.8, 1.4, 15)], dim: true },
      { c: 'frost', s: [curve([2.6, 2.2, 2], [17, 24.5], [12, 25.5], [7.5, 24.5]), ell(5.5, 24.3, 2.6, 1.5, -10)], dim: true },
      // far icicle ear streaming back
      { c: 'frost', s: poly([14, 9.5], [21, 4.5], [31, 0.8], [22.5, 7.5], [16.5, 12]), dim: true },
      { c: 'ice', s: poly([20, 5.3], [31, 0.8], [22.5, 7.5]), mark: true, dim: true },
      // tail puff, lean body stretched along the leap
      { c: 'frost', s: circ(39.5, 24.5, 2.8) },
      { c: 'frost', s: ell(26, 26, 13, 6.8, 20) },
      { c: 'ice', s: ell(23.5, 30.5, 10, 2.4, 20), mark: true, face: true },
      // flowing ice-blue mane: three locks from the nape along the back
      { c: 'ice', s: [leaf(16, 13.5, 14, 4.4, 8), leaf(18.5, 16.5, 15, 4.4, 14), leaf(21, 19.5, 14, 4, 20)] },
      { c: 'frost', s: [curve([1, 0.5], [18, 14], [27, 14.5]), curve([1, 0.5], [21, 17.5], [30.5, 19.5])], mark: true, flat: true, detail: true },
      // near hind leg kicked back, long foot, frost crystals on the ankle like crampons
      { c: 'frost', s: [ell(35, 30, 6.4, 5.4, 25), curve([3.8, 3, 2.6], [37, 32.5], [40.5, 36.5], [42.5, 39])] },
      { c: 'frost', s: ell(44.5, 41, 3.8, 1.8, 35) },
      { c: 'ice', s: [poly([39.5, 36.5], [40.5, 33], [42, 36]), poly([42, 38], [45.5, 36.8], [43.2, 39.6]), poly([40, 38.5], [38.5, 41], [41.5, 39.6])] },
      // near foreleg reaching forward, crystal at the wrist
      { c: 'frost', s: [curve([3.2, 2.6, 2.2], [18.5, 27.5], [12.5, 30.5], [7.5, 31])] },
      { c: 'frost', s: ell(5, 31.2, 2.9, 1.7, 5) },
      { c: 'ice', s: [poly([9.5, 29.5], [10.5, 26.8], [11.5, 29.6]), poly([9.5, 32.2], [9, 34.5], [11, 32.4])] },
      // head pushed forward, near icicle ear swept back
      { c: 'frost', s: [ell(11.5, 15.5, 6.4, 5, 20), ell(6.5, 18.5, 3.4, 2.8, 25)] },
      { c: 'frost', s: poly([12.5, 11.5], [20, 6.5], [32, 3.5], [22, 9.8], [15, 14.5]) },
      { c: 'ice', s: poly([20.5, 6.6], [32, 3.5], [22.5, 9.4]), mark: true },
      { c: 'deep', s: line(0.7, [15, 12], [21.5, 8.2]), mark: true, detail: true },
      pixels([9.5, 13.8], { k: '#203048', w: '#ffffff', i: '#5890b8' }, ['kkkk', 'kiwk', '.kk.'], { face: true }),
      pixels([3.5, 18], { n: 'deep' }, ['nn'], { face: true }),
      pixels([4.5, 20.5], { m: '#7890a8' }, ['mm'], { face: true, detail: true }),
      // ice dust kicked up behind
      pixels([43, 29], { s: 'ice', w: 'spark' }, ['.s..', 'sws.', '.s..', '...s'], { detail: true }),
      pixels([46.5, 25], { w: 'ice' }, ['w'], { detail: true }),
    ],
  },

  // -------------------------------------------------------------------------
  // #038 Steimandli – living trail cairn, one stone arm pointing the way
  // -------------------------------------------------------------------------
  steimandli: {
    pal: { stone: '#8a8478', light: '#b0a898', dark: '#6a6458', moss: '#88a858', lichen: '#c0c070', snow: '#f0f4f8' },
    parts: [
      // stubby far arm hanging at the side, joined by lichen
      { c: 'lichen', s: ell(33, 27.5, 2.2, 1.7) },
      { c: 'dark', s: ell(35.8, 31, 2.8, 4, -20) },
      // the stack, flat stones getting smaller toward the top
      { c: 'dark', s: ell(24, 40.5, 13, 5) },
      { c: 'light', s: ell(23, 31.5, 11, 4.8, -4) },
      { c: 'stone', s: ell(24.5, 23, 8.8, 4.3, 5) },
      // pointing arm: a long flat stone held out sideways like a signpost
      { c: 'lichen', s: ell(15.5, 23, 2.6, 2) },
      { c: 'light', s: ell(8.5, 22, 6.5, 2.6, -6) },
      // head stone with pebble eyes, snow cap and a tuft of moss
      { c: 'light', s: ell(23, 14.5, 7.5, 5.5) },
      { c: 'moss', s: beads([1.8, 1.3], 1.4, [28.5, 11], [30.5, 12.8], [31, 15.5]) },
      { c: 'snow', s: [ell(22.5, 10, 6.5, 2.8), circ(18.2, 11.5, 1.4), circ(26, 11.8, 1.2)] },
      pixels([17.5, 13.5], { k: '#3a3630', w: '#e8e4dc' }, ['wk', 'kk'], { face: true }),
      pixels([22.5, 13.5], { k: '#3a3630', w: '#e8e4dc' }, ['wk', 'kk'], { face: true }),
      pixels([19, 17], { m: '#4a463e' }, ['mmm'], { face: true, detail: true }),
      // lichen spots and cracks
      pixels([28.5, 32.5], { l: 'lichen', d: '#98a050' }, ['.l', 'ld'], { detail: true }),
      pixels([15, 30], { l: 'lichen' }, ['l'], { detail: true }),
      pixels([27.5, 39.5], { l: 'lichen', d: '#98a050' }, ['ll.', '.dl'], { detail: true }),
      pixels([16.5, 42], { l: 'lichen' }, ['l.', '.l'], { detail: true }),
      pixels([28, 21.5], { l: 'lichen' }, ['l'], { detail: true }),
      { c: 'dark', s: [line(0.7, [31.5, 37.5], [33.5, 40.5]), line(0.7, [13.5, 31], [15.5, 33]), line(0.7, [4, 21], [6, 22.5])], mark: true, detail: true },
    ],
  },

  // -------------------------------------------------------------------------
  // #044 Lindglut – serpentine flame lynx, guardian of the Alpenglut: rearing in an S, roaring
  // -------------------------------------------------------------------------
  lindglut: {
    pal: {
      flame: ['#ffa048', '#f06828', '#c84424', '#5a1810'],
      coral: ['#ffb08c', '#f4846c', '#cc5a5c', '#5c1c28'],
      pink: ['#ffd8e8', '#f8a8c8', '#d47c9c', '#6a2848'],
      gold: ['#fff4c0', '#ffd050', '#f0a030', '#8a4210'],
      light: ['#fffcf0', '#fff4c0', '#f8d890', '#9a5020'],
      ember: ['#d04a20', '#a03018', '#782010', '#401008'],
      tooth: ['#ffffff', '#fffcf0', '#f0e0c8', '#5a1810'],
    },
    parts: [
      // sunrise mane: a glowing disc behind the head, golden rays fanning upward (shorter straight up to stay
      // inside the box), pale rays between them
      { c: 'gold', s: [-195, -165, -135, -105, -75, -45, -15, 15].map((d) => ray(19, 16, d, 9, Math.abs(d + 90) < 30 ? 16.5 : 19, 2.6)) },
      { c: 'light', s: [-180, -150, -120, -90, -60, -30, 0].map((d) => ray(19, 16, d, 9, 15, 1.8)) },
      { c: 'light', s: circ(19, 16, 11), flat: true },
      // tail rising on the right, an eternal ember at its tip
      { c: 'pink', s: curve([5.5, 4.5, 3.6, 2.8, 2.2], [41, 36], [44, 28.5], [40.5, 21], [43, 14.5], [41.5, 10]) },
      { c: 'flame', s: poly([37.5, 9.5], [39, 4.5], [41, 1], [42, 4.5], [44.5, 2], [45.5, 7], [43.5, 11.5], [39.5, 12]), flat: true },
      { c: 'gold', s: poly([39, 10], [40.5, 5.5], [42, 7], [43.5, 5], [44, 8.5], [42.5, 11]), flat: true, line: false },
      { c: 'light', s: ell(41.5, 9.5, 1.4, 1.6), flat: true, line: false },
      // body: chest under the head, curling down to the left, coiled along the ground
      { c: 'flame', s: curve([10, 10, 9, 8.5, 7.5, 7, 6.5], [19, 22], [20, 29], [17, 35], [12, 39.5], [16.5, 43.5], [28, 43.5], [37.5, 41], [42.5, 35]) },
      { c: 'coral', s: curve(12, [9, 41], [16.5, 46.5], [28, 46.5], [39, 43], [45, 35]), mark: true },
      { c: 'gold', s: curve([2.5, 2, 1.5], [19.5, 21], [20.5, 29], [17.5, 35]), mark: true, backOnly: true }, // spine
      pixels([22, 40.5], { s: 'ember' }, ['s...s', '..s..'], { detail: true }),
      pixels([31.5, 40], { s: 'ember' }, ['s..s'], { detail: true }),
      pixels([10.5, 37.5], { s: 'ember' }, ['.s', 's.'], { detail: true }),
      // fluffy chest bib
      { c: 'light', s: poly([13.5, 24], [25, 24], [25, 30], [23, 29], [22, 34.5], [20, 31], [18, 35.5], [16.5, 31], [14, 32.5]), face: true },
      // near hind paw planted on the ground
      { c: 'flame', s: [curve([4.5, 4], [16, 41], [14.5, 44]), ell(14, 44.5, 3, 1.8)] },
      pixels([11, 45], { w: 'tooth' }, ['w.w.w'], { detail: true }),
      // near fore paw raised, claws out
      { c: 'flame', s: curve([5.5, 5, 4.5], [17, 33], [12, 34], [8.5, 31.5]) },
      { c: 'flame', s: ell(7.5, 30, 3.2, 2.6, -25) },
      { c: 'flame', s: [line(0.6, [6, 28], [8, 30]), line(0.6, [5, 30], [7.5, 31.5])], mark: true, dim: true, detail: true },
      pixels([3.5, 27.5], { w: 'tooth' }, ['.w', '..', 'w.', '..', 'w.'], { detail: true }),
      // head: lynx face, cheek ruffs, ember-tufted ears, jaws wide open in a roar
      { c: 'flame', s: [poly([12, 12], [10.5, 2.5], [16.5, 9]), poly([21.5, 9], [27.5, 2.5], [26, 12])] },
      { c: 'pink', s: [poly([13, 10.5], [12, 5.5], [15.5, 9]), poly([22.5, 9], [26, 5.5], [25, 10.5])], mark: true },
      { c: 'ember', s: [curve([2.4, 0.5], [10.5, 3.5], [9.5, 2], [10, 0.8], [8.5, 0]), curve([2.4, 0.5], [27.5, 3.5], [28.5, 2], [28, 0.8], [29.5, 0])] },
      { c: 'light', s: [poly([12, 18], [6.5, 23], [9.5, 23], [8.5, 26.5], [13, 24]), poly([26, 18], [32.5, 23.5], [29, 23.2], [30.5, 28], [25, 24])] },
      { c: 'flame', s: [ell(19, 15, 7.5, 6.2), ell(19, 19.5, 8, 4.5)] },
      { c: 'ember', s: [line(0.8, [19, 9.5], [19, 14]), line(0.8, [15.5, 11], [16.5, 14.5]), line(0.8, [22.5, 11], [21.5, 14.5])], mark: true, backOnly: true }, // tabby stripes
      // face turned a little toward the left: pale muzzle, forehead stripes, open jaws with fangs and tongue, glowing eyes
      { c: 'light', s: ell(18.3, 22, 5, 3.4), mark: true, face: true },
      { c: 'ember', s: [line(0.8, [18.5, 9.5], [18.5, 12]), line(0.8, [16, 10], [16.5, 12]), line(0.8, [21, 10], [20.5, 12])], mark: true, face: true },
      { c: 'ember', s: poly([14.8, 21], [21.8, 21], [20.8, 25.5], [15.8, 25.5]), flat: true, face: true },
      pixels([15.3, 24.5], { p: '#e07898' }, ['.ppp.', 'ppppp'], { face: true }),
      pixels([15.3, 21], { w: 'tooth' }, ['w....w', 'w....w'], { face: true }),
      pixels([17.3, 19], { n: '#802838' }, ['nnn', '.n.'], { face: true }),
      pixels([12.8, 14.5], { k: '#401810', y: '#ffd050', w: '#fffcf0' }, ['kk...', '.kkkk', '.kywk'], { face: true }),
      pixels([20.2, 14.5], { k: '#401810', y: '#ffd050', w: '#fffcf0' }, ['...kk', 'kkkk.', 'kwyk.'], { face: true }),
    ],
  },
};
