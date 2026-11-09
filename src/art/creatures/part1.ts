/**
 * Creature art, part 1: Lexikon #001–#015
 * (sproessli, moosdachs, dornachs, zuendli, glutbock, brandhorn, biberli, bachbiber, dammbaron,
 * zwitschli, dohlerich, sturmdohle, munggli, pfiffmungg, chaeferli).
 * Coordinates are in 48×48 space, ground line y ≈ 45, creatures face left. See docs/CREATURE-ART.md.
 */
import { beads, circ, type CreatureDefs, curve, ell, line, pixels, poly, rect } from '../shapes';

const EYE = { k: '#202028', w: '#f8f8f8' };
/** Big round eye (near side) and its narrower far-side partner. */
const EYE_NEAR = ['.kk.', 'kwkk', 'kkkk', '.kk.'];
const EYE_FAR = ['kk', 'wk', 'kk', 'k.'];
/** Eyes for dark plumage: light ring around a dark pupil. */
const RING_EYE = { r: '#c8d0e0', k: '#101018', w: '#ffffff' };

export const PART1: CreatureDefs = {
  // -------------------------------------------------------------------------
  // #001 Sprössli – grass badger cub, sitting, waving
  // -------------------------------------------------------------------------
  sproessli: {
    pal: { fur: '#8a9a6a', dark: '#3e5a34', cream: '#f0ecd8', grass: '#68c048', nose: '#4a3a34' },
    parts: [
      // grass tuft tail + blade tips curling loose behind the ears
      { c: 'grass', s: [curve([3, 1], [31, 40], [36, 37], [39, 32]), curve([3, 1], [32, 42], [37, 41], [41, 38])] },
      { c: 'grass', s: curve([3.5, 1.5], [18.5, 16], [20.5, 10.5], [25.5, 7.5], [28.5, 9.5], [26.5, 12.5]) },
      { c: 'grass', s: curve([3.5, 1.5], [24, 17], [29, 13.5], [34, 13.5], [35, 17.5], [32, 18.5]) },
      // body, legs
      { c: 'dark', s: ell(30, 44, 3.5, 1.8), dim: true },
      { c: 'fur', s: ell(24, 37.5, 9.5, 8) },
      { c: 'cream', s: ell(21.5, 40, 5.5, 5), mark: true, face: true },
      { c: 'fur', s: ell(29.5, 40.5, 4.5, 4.5) },
      { c: 'dark', s: [ell(18, 44.3, 3.8, 1.8), ell(27, 44.5, 3.5, 1.6)] },
      { c: 'dark', s: rect(22.5, 37, 4, 7.5, 2), face: true },
      // waving forepaw, raised beside the face
      { c: 'dark', s: [curve(3.5, [17, 36], [11, 33.5], [9, 29]), circ(8.5, 27.5, 2.6)] },
      // ears + badger head: cream face, grass blades through the eyes framing a cream stripe
      { c: 'dark', s: circ(12, 16, 3) },
      { c: 'dark', s: circ(29, 16, 3) },
      { c: 'cream', s: [circ(11.5, 14.8, 1.4), circ(29.5, 14.8, 1.4)], mark: true },
      { c: 'fur', s: [ell(20.5, 21.5, 10, 7.5), ell(20, 26.5, 7, 5.5)], face: true },
      { c: 'cream', s: ell(20, 26.5, 9, 5.5), mark: true, face: true },
      { c: 'cream', s: curve([2.5, 4], [20, 30], [20.5, 22], [20.5, 14.5]), mark: true, face: true },
      { c: 'grass', s: curve([1.8, 4, 3], [18, 30.5], [14.5, 25], [12.5, 19], [15, 14.5]), mark: true, face: true },
      { c: 'grass', s: curve([1.8, 4, 3], [22, 30.5], [26, 25], [28, 19], [25.5, 14.5]), mark: true, face: true },
      pixels([18.5, 29.5], { n: 'nose', w: '#9a8a84' }, ['wnn', 'nnn'], { face: true }),
      pixels([12.5, 20.5], EYE, ['.kk.', 'kwkk', 'kkkk', 'kkkk', '.kk.'], { face: true }),
      pixels([23.5, 20.5], EYE, ['.kk.', 'kwkk', 'kkkk', 'kkkk', '.kk.'], { face: true }),
      pixels([18, 32], { m: 'nose' }, ['m...m', '.mmm.'], { face: true, detail: true }),
      // back of the head: the blades lie flat down the neck
      { c: 'fur', s: ell(20.5, 22, 10, 8), backOnly: true },
      { c: 'cream', s: curve([3, 4], [20.5, 14], [20.5, 30]), mark: true, backOnly: true },
      { c: 'grass', s: [curve([3.5, 3], [16.5, 14], [16, 30]), curve([3.5, 3], [24.5, 14], [25, 30])], mark: true, backOnly: true },
    ],
  },

  // -------------------------------------------------------------------------
  // #002 Moosdachs – moss badger on all fours, head low, sniffing
  // -------------------------------------------------------------------------
  moosdachs: {
    pal: { fur: '#94a072', moss: '#5f7a46', dark: '#3a4c30', cream: '#dcdcb4', flower: '#f8f4e8', claw: '#c8a888', nose: '#2e2a28' },
    parts: [
      { c: 'moss', s: beads([2.6, 1.4], 2, [41, 28], [45, 26], [47, 22.5]) },
      // far legs
      { c: 'dark', s: rect(37, 34, 5, 10.5, 2.5), dim: true },
      { c: 'dark', s: rect(18, 36, 5, 8.5, 2.5), dim: true },
      // body; two fluffy moss bands run along the back to the tail
      { c: 'fur', s: [ell(31, 31, 13, 9), ell(22, 33, 7, 6.5)] },
      { c: 'cream', s: ell(29, 40, 11, 2.5), mark: true, face: true },
      { c: 'moss', s: beads(2.8, 2.3, [18, 24.5], [25, 21.5], [34, 21], [42, 23.5]) },
      { c: 'moss', s: beads([2.2, 2.7, 2.2], 2.3, [20, 29], [27, 27], [35, 27], [43, 29.5]), mark: true, line: true },
      // near legs, pale digging claws
      { c: 'fur', s: ell(37.5, 34, 6, 6.5) },
      { c: 'dark', s: rect(33, 37, 6.5, 8, 2.5) },
      { c: 'dark', s: rect(21.5, 37, 6.5, 8, 2.5) },
      { c: 'claw', s: [poly([21, 43.5], [23.5, 43.5], [21.5, 46.5]), poly([23.5, 43.5], [26, 43.5], [24, 46.5]), poly([32.5, 43.5], [35, 43.5], [33, 46.5])], line: false },
      // big badger face, low and sniffing
      { c: 'dark', s: circ(7, 24.5, 2.7) },
      { c: 'dark', s: circ(21, 24.5, 2.7) },
      { c: 'cream', s: [circ(6.5, 23.5, 1.3), circ(21.5, 23.5, 1.3)], mark: true },
      { c: 'fur', s: [ell(14, 29.5, 8.5, 6.5), poly([6, 30], [22, 30], [15, 41.5], [12.5, 41.5])], face: true },
      { c: 'cream', s: ell(13.5, 33.5, 9, 7.5), mark: true, face: true },
      { c: 'moss', s: [curve([2, 4, 3.5], [12, 40], [9.5, 34], [8, 28.5], [10.5, 24.5]), curve([2, 4, 3.5], [15, 40], [18.5, 34], [20, 28.5], [17.5, 24.5])], mark: true, line: true, face: true },
      pixels([12, 40], { n: 'nose', w: '#6a6058' }, ['wn', 'nn']),
      pixels([8, 30], EYE, ['kk', 'wk', 'kk'], { face: true }),
      pixels([17.5, 30], EYE, ['kk', 'wk', 'kk'], { face: true }),
      { c: 'fur', s: ell(14, 31, 8.5, 7), backOnly: true },
      { c: 'moss', s: [curve(4, [10, 25], [10.5, 37]), curve(4, [18, 25], [17.5, 37])], mark: true, line: true, backOnly: true },
      // tiny star flowers on the moss
      pixels([23, 19.5], { f: 'flower' }, ['.f.', 'fff', '.f.'], { detail: true }),
      pixels([33, 19], { f: 'flower' }, ['.f.', 'fff', '.f.'], { detail: true }),
      pixels([40.5, 22], { f: 'flower' }, ['f'], { detail: true }),
      pixels([29, 26], { f: 'flower' }, ['f'], { detail: true }),
      pixels([38, 27], { f: 'flower' }, ['f'], { detail: true }),
      pixels([22, 28], { f: 'flower' }, ['f'], { detail: true }),
    ],
  },

  // -------------------------------------------------------------------------
  // #003 Dornachs – nettle badger, reared up, growling
  // -------------------------------------------------------------------------
  dornachs: {
    pal: {
      fur: '#6a7458', mane: '#3f6a3a', nettle: '#b8d060', toxic: '#9a4ab0', stripe: '#e8e0c8', claw: '#2e2a34',
      mouth: '#6a2838', eye: '#e8d040',
    },
    parts: [
      // raised far arm with claws (behind)
      { c: 'fur', s: curve([5.5, 4.5], [30, 19], [37, 12], [41, 7.5]), dim: true },
      { c: 'claw', s: [line([2, 0.8], [41, 6], [43, 1.5]), line([2, 0.8], [42.5, 7], [46.5, 4.5]), line([2, 0.8], [39.5, 5.5], [38.5, 1])] },
      // bristling mane of nettle leaves from the forehead down the spine
      {
        c: 'mane',
        s: [
          ell(17, 4.5, 4.5, 2, -85), ell(22.5, 4, 5.5, 2.2, -60), ell(28.5, 7, 5.5, 2.2, -35), ell(33.5, 12.5, 5.5, 2.2, -15),
          ell(36.5, 19, 5.5, 2.2, 0), ell(38, 25.5, 5, 2.2, 15), ell(37.5, 31.5, 4.5, 2, 30), ell(26, 12, 9, 7),
        ],
      },
      { c: 'nettle', s: [line([1.2, 0.5], [17, 8], [17, 1]), line([1.2, 0.5], [21, 8], [25, 1.5]), line([1.2, 0.5], [27, 10], [32.5, 4.5]), line([1.2, 0.5], [32, 14], [38, 11.5]), line([1.2, 0.5], [35, 19], [41, 19]), line([1.2, 0.5], [36, 25], [42, 26.5])], mark: true },
      // legs + body
      { c: 'fur', s: ell(17, 44, 5, 2.2), dim: true },
      { c: 'fur', s: [ell(27, 31, 11.5, 12), ell(24, 23, 11, 7)] },
      { c: 'stripe', s: ell(21, 33, 6, 8.5), mark: true, face: true },
      { c: 'fur', s: ell(32, 39, 6, 6) },
      { c: 'fur', s: ell(29, 44.5, 6, 2.2) },
      { c: 'claw', s: [poly([23, 44], [24.5, 47], [26, 44]), poly([26, 44], [27.5, 47], [29, 44])], line: false },
      // wedge-shaped badger head, jaws open in a growl
      { c: 'fur', s: circ(10.5, 8, 2.5) },
      { c: 'mouth', s: poly([11, 19], [20.5, 19], [17.5, 25.5], [14, 25.5]), face: true },
      { c: 'fur', s: ell(16, 25.5, 4, 1.6), face: true },
      { c: 'fur', s: [ell(17, 12.5, 8.5, 6), poly([8.5, 13], [25.5, 13], [17, 21], [15, 21])], face: true },
      { c: 'stripe', s: ell(16.5, 16, 8.5, 5.5), mark: true, face: true },
      { c: 'stripe', s: curve([2, 4.5], [16, 20], [16.5, 12], [18, 6]), mark: true, face: true },
      { c: 'mane', s: curve([1.8, 4, 3], [14.5, 20], [11.5, 14], [10, 9], [13, 6.5]), mark: true, face: true },
      { c: 'mane', s: curve([1.8, 4, 3], [18, 20], [22, 14], [24.5, 9.5], [22, 6.5]), mark: true, face: true },
      { c: 'fur', s: ell(17, 13.5, 8.5, 7), backOnly: true },
      { c: 'mane', s: [curve(3.5, [12.5, 8], [12, 20]), curve(3.5, [21.5, 8], [22, 20])], mark: true, backOnly: true },
      pixels([14, 19.5], { n: '#202028' }, ['nnn', '.n.'], { face: true }),
      pixels([11.5, 21], { t: '#f0ece0' }, ['t......t', 't......t'], { face: true }),
      pixels([10, 12], { k: 'eye', d: '#181820' }, ['dd..', '.ddd', '.kkd'], { face: true }),
      pixels([19, 12], { k: 'eye', d: '#181820' }, ['..dd', 'ddd.', 'dkk.'], { face: true }),
      // near arm, claws spread forward
      { c: 'fur', s: curve([6, 5], [26, 25], [18, 29.5], [10, 31.5]) },
      { c: 'claw', s: [line([2, 0.8], [9, 29.5], [4.5, 26]), line([2, 0.8], [8, 31.5], [3, 31.5]), line([2, 0.8], [9, 33.5], [4.5, 36])] },
      // toxic droplets on the mane tips
      { c: 'toxic', s: [circ(17, 0.8, 1.3), circ(26, 1, 1.3), circ(36, 4.5, 1.3), circ(41.5, 11.5, 1.3), circ(42.5, 19, 1.3), circ(42.5, 28.5, 1.3)], flat: true, detail: true },
    ],
  },

  // -------------------------------------------------------------------------
  // #004 Zündli – fire ibex kid, mid-hop
  // -------------------------------------------------------------------------
  zuendli: {
    pal: { fur: '#c88848', cream: '#f4e0c0', tip: '#f05a28', core: '#ffd040', hoof: '#5a5560', smoke: '#d8d0c8', horn: '#8a6a50' },
    parts: [
      { c: 'smoke', s: curve(1.5, [19, 8], [17, 5], [20, 3], [18, 0.5]), flat: true, outline: false, detail: true },
      // far legs (dim)
      { c: 'fur', s: curve(2.2, [31, 33], [33.5, 38], [36, 41.5]), dim: true },
      { c: 'hoof', s: ell(36.5, 42, 1.7, 1.3, 30), dim: true },
      { c: 'fur', s: curve(2.2, [26, 33], [23.5, 37], [26.5, 39.5]), dim: true },
      { c: 'hoof', s: ell(27.5, 39.8, 1.7, 1.3), dim: true },
      // body mid-hop, short plain tail
      { c: 'fur', s: ell(36.5, 25.5, 1.8, 2.5, 30) },
      { c: 'fur', s: ell(29, 29.5, 8.5, 5.5, -10) },
      { c: 'cream', s: ell(27.5, 33, 6.5, 2.2, -10), mark: true, face: true },
      // near legs: hind kicked back, fore tucked under the chest
      { c: 'fur', s: [ell(33.5, 30.5, 4, 4.2, -20), curve(2.4, [35, 33.5], [38, 37.5], [41, 40.5])] },
      { c: 'hoof', s: ell(41.5, 41, 1.9, 1.4, 35) },
      { c: 'fur', s: curve(2.4, [23.5, 32.5], [20.5, 36], [23.5, 38.5]) },
      { c: 'hoof', s: ell(24.5, 38.8, 1.8, 1.4) },
      // sparks struck from the hooves
      pixels([42, 43], { a: 'core', b: 'tip' }, ['a.b', '.a.'], { detail: true }),
      pixels([24, 41], { a: 'core', b: 'tip' }, ['b.a'], { detail: true }),
      // oversized ears, big head
      { c: 'fur', s: ell(9.5, 18, 5.5, 2.3, -18) },
      { c: 'fur', s: ell(29, 17, 5.5, 2.3, 18), dim: true },
      { c: 'cream', s: ell(9.5, 18, 3.5, 1, -18), mark: true, face: true },
      { c: 'fur', s: ell(19, 19.5, 8, 7.5) },
      { c: 'cream', s: ell(17.5, 25, 4.5, 2.6), mark: true, flat: true, face: true },
      // match-head horn buds
      { c: 'horn', s: ell(15.5, 12.5, 1.8, 2.5, -15) },
      { c: 'horn', s: ell(22.5, 12.5, 1.8, 2.5, 15) },
      { c: 'tip', s: circ(15, 10.5, 1.6), flat: true },
      { c: 'tip', s: circ(23, 10.5, 1.6), flat: true },
      pixels([14.5, 10], { c: 'core' }, ['c']),
      pixels([22.5, 10], { c: 'core' }, ['c']),
      pixels([12, 17], EYE, ['.kk.', 'kwkk', 'kkkk', 'kkkk', '.kk.'], { face: true }),
      pixels([19, 17], EYE, ['.kk.', 'kwkk', 'kkkk', 'kkkk', '.kk.'], { face: true }),
      pixels([15.5, 24], { n: '#6a4030' }, ['n.n', '.n.'], { face: true }),
    ],
  },

  // -------------------------------------------------------------------------
  // #005 Glutbock – ember ibex buck on a rock tip, foreleg raised
  // -------------------------------------------------------------------------
  glutbock: {
    pal: { fur: '#a86a3a', belly: '#e8c8a0', ember: '#e84820', glow: '#ffb030', hoof: '#4a3020', horn: '#5a4438', rock: '#8a8478' },
    parts: [
      { c: 'rock', s: poly([16, 47], [21, 40], [27, 38], [35, 39], [41, 47]) },
      // horns sweep back in a long arc, ember ridges like stacked coals
      { c: 'horn', s: curve([3.5, 1.5], [15, 9], [20, 3.5], [28, 2], [35, 5], [38, 11]), dim: true },
      { c: 'horn', s: curve([4, 1.5], [18, 9], [23, 4], [31, 3.5], [37, 7], [40, 13]) },
      pixels([22.5, 4], { e: 'ember', g: 'glow' }, ['g', 'e']),
      pixels([27, 3], { e: 'ember', g: 'glow' }, ['g', 'e']),
      pixels([31.5, 3.5], { e: 'ember', g: 'glow' }, ['g', 'e']),
      pixels([35.5, 6], { e: 'ember', g: 'glow' }, ['g', 'e']),
      pixels([38, 9.5], { e: 'ember', g: 'glow' }, ['ge']),
      // far legs
      { c: 'fur', s: line(2.5, [35, 30], [36, 39]), dim: true },
      { c: 'fur', s: line(2.5, [22, 30], [22, 39.5]), dim: true },
      { c: 'hoof', s: [rect(34.8, 38.5, 3, 2.2, 1), rect(20.8, 39, 3, 2.2, 1)], dim: true },
      { c: 'fur', s: ell(38.5, 23.5, 2.2, 1.6, -30) },
      { c: 'fur', s: ell(29, 26, 10, 6) },
      { c: 'belly', s: ell(28, 31, 8, 2.5), mark: true, face: true },
      // glowing ember spots along the spine
      { c: 'ember', s: [circ(24.5, 20.8, 1.6), circ(29, 20.3, 1.6), circ(33.5, 20.8, 1.6)], flat: true, line: false },
      pixels([24, 20], { g: 'glow' }, ['g']),
      pixels([28.5, 19.5], { g: 'glow' }, ['g']),
      pixels([33, 20], { g: 'glow' }, ['g']),
      // near legs: hind standing, fore raised
      { c: 'fur', s: [ell(35, 28, 4.5, 5), line(3, [35, 31], [34, 40])] },
      { c: 'hoof', s: rect(32.5, 39.5, 3.2, 2.5, 1) },
      { c: 'fur', s: curve(3, [23, 29], [19, 32], [20, 36]) },
      { c: 'hoof', s: rect(18.6, 35.5, 3, 2.3, 1) },
      // neck + head, chin up
      { c: 'fur', s: poly([18, 22], [14.5, 14], [21, 10.5], [26, 24]) },
      { c: 'belly', s: poly([17, 22], [14.5, 15], [18, 16], [21, 24]), mark: true, face: true },
      { c: 'fur', s: [ell(17.5, 11, 5, 4.2), ell(11.5, 10.5, 3.8, 2.5, -25)] },
      { c: 'belly', s: ell(10, 11, 2.2, 1.5, -25), mark: true, face: true },
      { c: 'fur', s: poly([12, 13], [14, 13], [12.5, 16.5]), line: false },
      { c: 'fur', s: ell(22.5, 9.5, 2.6, 1.4, 25) },
      pixels([16, 8], EYE, ['kk', 'wk'], { face: true }),
      pixels([8, 9], { n: '#3a2018' }, ['n']),
    ],
  },

  // -------------------------------------------------------------------------
  // #006 Brandhorn – basalt-armored ibex, about to charge
  // -------------------------------------------------------------------------
  brandhorn: {
    pal: { basalt: '#6a5a50', rock: '#3a3030', lava: '#f06020', glow: '#ffd060', fur: '#c89060', hoof: '#2e2626' },
    parts: [
      // far legs
      { c: 'fur', s: rect(37, 33, 5, 11, 2), dim: true },
      { c: 'fur', s: rect(14, 34, 5, 10, 2), dim: true },
      { c: 'hoof', s: [rect(36.5, 42, 6, 3, 1), rect(13.5, 42, 6, 3, 1)], dim: true },
      { c: 'fur', s: ell(45, 23, 2.5, 2, -30) },
      // body: basalt plates with glowing lava cracks between them
      { c: 'fur', s: ell(30, 28, 15, 11) },
      { c: 'lava', s: ell(30.5, 26, 14, 9), mark: true, flat: true },
      { c: 'basalt', s: poly([16, 23], [22, 16.5], [29.5, 18], [28, 28.5], [18, 29.5]), line: false },
      { c: 'basalt', s: poly([31, 18.5], [38, 16.5], [43.5, 21], [42, 27.5], [30, 28.5]), line: false },
      { c: 'basalt', s: poly([20, 31], [29, 30.2], [36, 30], [41.5, 29.5], [39, 35], [23, 35.5]), line: false },
      { c: 'glow', s: [line(0.8, [29.5, 21], [29, 27]), line(0.8, [24, 30], [34, 29.5])], mark: true, flat: true, detail: true },
      // near legs
      { c: 'fur', s: [ell(38, 32, 5, 6), rect(34, 33, 6, 11, 2)] },
      { c: 'hoof', s: rect(33.5, 42, 7, 3.5, 1) },
      { c: 'fur', s: rect(18.5, 33, 6, 11, 2) },
      { c: 'hoof', s: rect(18, 42, 7, 3.5, 1) },
      // enormous ridged horns
      { c: 'rock', s: curve([6, 3, 2], [13, 22], [6, 16], [3, 9], [5, 3]), dim: true },
      { c: 'rock', s: curve([7, 3.5, 2], [19, 20], [25, 11], [34, 5], [44, 3], [46, 8]) },
      { c: 'lava', s: [line(1, [8, 15], [3, 14]), line(1, [6, 9], [2, 8]), line(1, [25, 12], [22, 9]), line(1, [31, 7], [29, 4]), line(1, [38, 5], [37, 2])], mark: true, flat: true },
      // head lowered, fire beard
      { c: 'lava', s: poly([9.5, 34], [16, 34], [15, 39], [14, 44], [12, 40], [10, 43], [8.5, 38]), flat: true, outline: false },
      { c: 'glow', s: poly([11, 34], [15, 34], [13.5, 39], [12, 37]), flat: true, outline: false },
      { c: 'fur', s: [ell(14.5, 26, 6, 6), ell(12, 32, 4, 4)] },
      { c: 'rock', s: ell(10.5, 34.5, 2.2, 1.6), mark: true },
      pixels([10, 24], { k: 'glow', d: '#3a1810' }, ['dd.', 'dkk'], { face: true }),
      pixels([15, 24], { k: 'glow', d: '#3a1810' }, ['.dd', 'kkd'], { face: true }),
    ],
  },

  // -------------------------------------------------------------------------
  // #007 Biberli – beaver kit, tail up, twig in mouth
  // -------------------------------------------------------------------------
  biberli: {
    pal: { fur: '#9a6a40', belly: '#d8b890', teeth: '#f08830', tail: '#4a6a8a', drop: '#58a8e8', twig: '#7a5a30', leaf: '#68c048' },
    parts: [
      // paddle tail raised high, crosshatched
      { c: 'tail', s: ell(38, 23, 4.8, 8.5, 25) },
      { c: 'tail', s: [line(0.8, [33, 19], [42, 28]), line(0.8, [35, 16], [43, 23]), line(0.8, [34, 28], [41, 16]), line(0.8, [36, 30], [43, 19])], mark: true, dim: true, detail: true },
      { c: 'fur', s: ell(35, 43.5, 3, 2), dim: true },
      { c: 'fur', s: ell(15, 43.5, 3, 2), dim: true },
      { c: 'fur', s: ell(27, 35.5, 12, 8.5) },
      { c: 'belly', s: ell(23, 41, 9, 3), mark: true, face: true },
      { c: 'fur', s: ell(31, 43.5, 3.5, 2) },
      { c: 'fur', s: ell(20, 43.5, 3.5, 2) },
      // head with a water-droplet tuft
      { c: 'fur', s: circ(22, 25.5, 2.2) },
      { c: 'drop', s: [circ(16, 22.5, 2.6), curve([3, 1], [16, 21], [16.5, 18], [19, 16.5])] },
      pixels([15, 21.5], { w: '#e8f8ff' }, ['w', 'w']),
      { c: 'fur', s: [ell(16, 31, 8, 7), ell(10, 34, 4.5, 3.5)] },
      { c: 'belly', s: ell(9.5, 35, 4, 2.6), mark: true, face: true },
      // twig held in the teeth
      { c: 'twig', s: line(1.6, [2, 39], [17, 38.5]), face: true },
      { c: 'leaf', s: ell(2.5, 36.5, 2.5, 1.5, -40), face: true },
      pixels([7, 36], { t: 'teeth', d: '#a85a20' }, ['tt', 'td'], { face: true }),
      pixels([5, 31.5], { n: '#3a2418' }, ['nn', 'n.'], { face: true }),
      pixels([10, 28], EYE, EYE_FAR, { face: true }),
      pixels([15, 28], EYE, EYE_NEAR, { face: true }),
    ],
  },

  // -------------------------------------------------------------------------
  // #008 Bachbiber – upright beaver with a log on its shoulder
  // -------------------------------------------------------------------------
  bachbiber: {
    pal: { fur: '#7a5030', belly: '#c8a070', wave: '#3890e0', teeth: '#f08830', tail: '#405870', log: '#9a6838', cut: '#d8b070' },
    parts: [
      // long paddle tail propped on the ground
      { c: 'tail', s: ell(37, 41, 9.5, 3.8, -18) },
      { c: 'tail', s: [line(0.8, [31, 41], [37, 37]), line(0.8, [34, 44], [42, 38]), line(0.8, [31, 39], [44, 42])], mark: true, dim: true, detail: true },
      { c: 'fur', s: ell(22, 18, 2.5, 6), dim: true },
      { c: 'fur', s: ell(24, 31, 9.5, 12.5) },
      { c: 'belly', s: ell(20, 33, 5.5, 9), mark: true, face: true },
      // wet fur: wave stripes on the flank
      { c: 'wave', s: [curve(1.3, [25, 26], [27, 25], [29, 26], [31, 25], [33, 26]), curve(1.3, [26, 31], [28, 30], [30, 31], [32, 30], [34, 31]), curve(1.3, [25, 36], [27, 35], [29, 36], [31, 35], [33, 36])], mark: true },
      { c: 'fur', s: ell(19, 44.5, 4.5, 1.8) },
      { c: 'fur', s: ell(29, 44.5, 4.5, 1.8) },
      // log over the shoulder
      { c: 'log', s: line(5.5, [14, 20], [45, 9]) },
      { c: 'log', s: [line(0.7, [20, 17], [42, 9.5])], mark: true, dim: true, detail: true },
      { c: 'cut', s: ell(45, 9, 2, 2.9, -20) },
      pixels([44.5, 8.5], { r: '#9a6838' }, ['r']),
      // head
      { c: 'fur', s: circ(26, 9, 2.2) },
      { c: 'fur', s: [ell(21, 14, 7.5, 6.5), ell(15, 17, 4.5, 3.5)] },
      { c: 'belly', s: ell(14.5, 18, 3.5, 2.5), mark: true, face: true },
      pixels([10, 15], { n: '#2e1c10' }, ['nn', 'n.'], { face: true }),
      pixels([13, 20], { t: 'teeth', d: '#a85a20' }, ['tt', 'td'], { face: true }),
      pixels([16, 11], EYE, ['kk', 'wk', 'kk'], { face: true }),
      { c: 'fur', s: curve(3.5, [28, 22], [31, 18], [29, 14.5]) },
    ],
  },

  // -------------------------------------------------------------------------
  // #009 Dammbaron – master dam-builder beaver with a steel tail
  // -------------------------------------------------------------------------
  dammbaron: {
    pal: {
      fur: '#5a3a28', steel: '#8898a8', teeth: '#d06a20', water: '#2860a0', belly: '#e0d0b0', log: '#9a6838', cut: '#d8b070',
      foam: '#c8e0f8',
    },
    parts: [
      // steel tail slammed down on the water behind
      { c: 'water', s: [ell(40, 43.5, 7.5, 2.5), poly([33, 42], [31, 35], [36, 40]), poly([46, 41], [48, 34], [43, 39])], flat: true },
      { c: 'foam', s: [circ(31, 33.5, 1.2), circ(47.5, 32.5, 1.2), circ(39, 33, 1)], flat: true },
      { c: 'steel', s: ell(40, 39, 7.5, 3.6, -10) },
      pixels([35, 38], { r: '#e0e8f0' }, ['r..r..r..r']),
      // body standing on the dam
      { c: 'fur', s: ell(32, 15, 2.5, 6), dim: true },
      { c: 'fur', s: ell(25, 26, 13, 13.5) },
      { c: 'belly', s: ell(21, 28, 7.5, 10), mark: true, face: true },
      pixels([34, 20], { r: '#c0c8d0', l: 'cut' }, ['l..', '.l.', '...', '..r'], { detail: true }),
      { c: 'fur', s: [ell(18, 39.5, 5, 2.2), ell(30, 39.5, 5, 2.2)] },
      { c: 'log', s: [rect(1, 40.5, 34, 5.5, 2.7), rect(29, 42.5, 10, 4, 2)] },
      { c: 'cut', s: ell(3, 43.2, 1.8, 2.5) },
      { c: 'log', s: line(0.7, [8, 42], [30, 42]), mark: true, dim: true, detail: true },
      // head with a curled moustache
      { c: 'fur', s: circ(27, 5, 2.6) },
      { c: 'fur', s: [ell(20, 10.5, 9, 7.5), ell(12, 14, 6, 4.5)] },
      { c: 'belly', s: ell(11.5, 15.5, 5, 3.4), mark: true, face: true },
      pixels([6, 11], { n: '#201008', w: '#6a5048' }, ['wn', 'nn']),
      pixels([9, 18.5], { t: 'teeth', d: '#802808', g: '#ffb060' }, ['gtt', 'tdt', 'tdt']),
      { c: 'belly', s: [curve(1.4, [9, 15.5], [5, 15.5], [2.5, 13], [3, 11]), curve(1.4, [14, 16.5], [18, 17], [20, 14.5])], face: true },
      pixels([15, 7.5], EYE, ['kk', 'wk'], { face: true }),
      { c: 'fur', s: line(1.5, [13, 6.5], [18, 5.8]), face: true, detail: true },
      // log under the near arm, iron-plated forearm
      { c: 'log', s: line(5.5, [3, 26], [30, 30]) },
      { c: 'cut', s: ell(3, 26, 1.8, 2.6, 8) },
      { c: 'fur', s: curve([6.5, 5.5], [31, 18], [33, 24], [30, 28]) },
      { c: 'steel', s: [rect(24.5, 25, 9, 7, 2.5)] },
      pixels([26, 26.5], { r: '#e0e8f0' }, ['r..r..r']),
      { c: 'steel', s: rect(4, 24, 5, 6, 2), dim: true, face: true },
    ],
  },

  // -------------------------------------------------------------------------
  // #010 Zwitschli – fluffy chough chick, begging
  // -------------------------------------------------------------------------
  zwitschli: {
    pal: { down: ['#6a7090', '#383848', '#262634', '#14141e'], beak: '#f0c830', legs: '#e04838', mouth: '#d84860' },
    parts: [
      { c: 'down', s: ell(15, 31, 5.5, 3, -35), dim: true },
      { c: 'legs', s: [line(1.4, [22, 41], [21, 44.5]), line(1.4, [28, 41], [29, 44.5])] },
      { c: 'legs', s: [line(1.2, [18.5, 45], [23, 45]), line(1.2, [27, 45], [31.5, 45])] },
      // messy head tuft
      { c: 'down', s: [curve([2.4, 1], [24, 28], [22, 24], [19, 23]), curve([2.4, 1], [25, 27], [26, 22.5], [24.5, 20]), curve([2.4, 1], [26, 28], [29, 24], [32, 24])] },
      { c: 'down', s: circ(25, 34, 8.5) },
      { c: 'down', s: ell(35, 33, 5.5, 3, 30) },
      // open beak, begging
      { c: 'mouth', s: poly([19, 33], [11, 35], [19, 37.5]), flat: true, face: true },
      { c: 'beak', s: poly([20, 31], [10, 33.5], [12, 35], [20, 34.5]) },
      { c: 'beak', s: poly([20, 36], [13, 37], [20, 39]), face: true },
      pixels([19, 27], RING_EYE, ['.rr.', 'rkkr', 'rwkr', 'rkkr', '.rr.'], { face: true }),
    ],
  },

  // -------------------------------------------------------------------------
  // #011 Dohlerich – glossy chough, gliding with fingered wings
  // -------------------------------------------------------------------------
  dohlerich: {
    pal: { black: ['#4a5a8a', '#2a2a3a', '#1c1c28', '#0e0e16'], beak: '#f0c830', legs: '#e04838', cloud: '#e8f0f8' },
    parts: [
      // far wing (behind the head)
      {
        c: 'black',
        s: poly([21, 21], [8, 15], [3, 15], [5, 17], [1, 18], [5, 20], [2, 22], [7, 23], [5, 25], [18, 29]),
        dim: true,
      },
      { c: 'black', s: poly([20, 33], [27, 33], [30, 42], [24, 40], [18, 42]) },
      { c: 'legs', s: [ell(21, 36, 1.6, 1.2), ell(26, 36, 1.6, 1.2)] },
      { c: 'black', s: ell(24, 27, 7.5, 8.5) },
      // cloud swirl on the chest
      { c: 'cloud', s: [circ(21.5, 29.5, 1.8), circ(24.5, 28.5, 2.2), circ(27, 30, 1.6), rect(20, 30, 8.5, 2, 1)], mark: true, face: true },
      pixels([23.5, 28.5], { s: '#a8b8d0' }, ['ss', '.s']),
      // near wing, spread flat
      {
        c: 'black',
        s: poly([27, 22], [37, 15], [44, 12], [47, 14], [43, 16], [47, 18], [42, 20], [46, 23], [40, 23], [42, 27], [32, 29]),
      },
      { c: 'black', s: [line(0.8, [30, 23], [42, 14.5]), line(0.8, [31, 26], [43, 19])], mark: true, dim: true, detail: true },
      { c: 'black', s: circ(21, 17, 5.5) },
      { c: 'beak', s: curve([3, 0.8], [17, 18.5], [11, 20], [6, 24]) },
      pixels([17.5, 14], RING_EYE, ['.r.', 'rkr', 'rwr', '.r.'], { face: true }),
    ],
  },

  // -------------------------------------------------------------------------
  // #012 Sturmdohle – storm bird, wings raised, screeching
  // -------------------------------------------------------------------------
  sturmdohle: {
    pal: { black: ['#404058', '#202030', '#161622', '#0a0a12'], grey: '#607090', beak: '#f0c830', legs: '#e04838', wind: '#c8e0f0', mouth: '#c03850' },
    parts: [
      // raised far wing
      { c: 'grey', s: poly([20, 22], [12, 12], [3, 4], [8, 4], [6, 0.5], [12, 3], [12, 0], [17, 4], [18, 1], [22, 9], [24, 18]), dim: true },
      // long red legs + talons
      { c: 'legs', s: [line(2, [22, 34], [20, 44]), line(2, [29, 34], [31, 44])] },
      { c: 'legs', s: [line(1.4, [16.5, 45], [22, 45]), line(1.4, [29, 45], [35, 45])] },
      { c: 'black', s: poly([22, 33], [31, 33], [38, 41], [27, 39]) },
      { c: 'black', s: ell(25, 27, 8, 9) },
      // towering thundercloud crest, swept back
      { c: 'grey', s: [circ(24, 11, 3.2), circ(28, 8.5, 3.6), circ(32.5, 7, 3.4), circ(33, 11.5, 3), circ(29, 13, 3)] },
      { c: 'wind', s: [circ(27, 7, 1.4), circ(31.5, 5.5, 1.2)], mark: true, flat: true, detail: true },
      // raised near wing, white streaks trailing off the feather tips
      { c: 'grey', s: poly([27, 22], [33, 12], [39, 2], [42, 5], [43, 0.5], [45, 5], [47, 3], [46, 9], [47.5, 10], [42, 17], [33, 27]) },
      { c: 'wind', s: [line(1, [35, 12], [41, 4]), line(1, [37, 16], [44, 8])], mark: true, flat: true },
      { c: 'wind', s: [curve(1, [44, 18], [46, 23], [44, 27]), curve(1, [6, 7], [3, 11], [4, 15])], flat: true, outline: false, detail: true },
      { c: 'black', s: circ(20, 17, 5.5) },
      // open beak, screeching
      { c: 'mouth', s: poly([16, 18], [7, 19], [16, 22]), flat: true, face: true },
      { c: 'beak', s: poly([17, 15.5], [5, 17], [7, 18.5], [17, 18.5]) },
      { c: 'beak', s: poly([16, 20.5], [9, 21.5], [16, 23.5]), face: true },
      pixels([17.5, 13], { k: '#101018', r: '#e04838', w: '#ffffff' }, ['.r.', 'rkr', 'rwr', '.r.'], { face: true }),
    ],
  },

  // -------------------------------------------------------------------------
  // #013 Munggli – pear-shaped marmot pup, whistling on a stone
  // -------------------------------------------------------------------------
  munggli: {
    pal: { tan: '#b08858', belly: '#e8d0a8', dark: '#6a4a30', teeth: '#f8f0e0', nose: '#3a2a20', stone: '#9a9488' },
    parts: [
      { c: 'stone', s: ell(24, 43.5, 11, 3.5) },
      { c: 'dark', s: ell(33.5, 39, 2.5, 3.5, 25) },
      { c: 'tan', s: circ(18.5, 18.5, 2.2) },
      { c: 'tan', s: circ(28.5, 18.5, 2.2), dim: true },
      { c: 'tan', s: [ell(24, 34, 8.5, 8.5), ell(23, 24, 6.5, 6.5)] },
      { c: 'dark', s: ell(31, 26, 4, 12), mark: true },
      { c: 'belly', s: ell(21.5, 36, 5, 6), mark: true, face: true },
      { c: 'belly', s: ell(21, 27, 3.5, 2.5), mark: true, face: true },
      { c: 'tan', s: [ell(19, 43, 3.2, 1.6), ell(28, 43, 3.2, 1.6)] },
      { c: 'tan', s: [ell(20, 31.5, 2.4, 2), ell(25, 31.5, 2.4, 2)], face: true },
      pixels([18, 21], EYE, ['k', 'k'], { face: true }),
      pixels([23, 21], EYE, ['kk', 'wk'], { face: true }),
      pixels([19, 24], { n: 'nose' }, ['nn'], { face: true }),
      pixels([19.5, 26], { t: 'teeth', o: '#5a2a20' }, ['tt', 'oo', 'oo'], { face: true }),
    ],
  },

  // -------------------------------------------------------------------------
  // #014 Pfiffmungg – big sentinel marmot, whistling with a cupped paw
  // -------------------------------------------------------------------------
  pfiffmungg: {
    pal: { brown: '#8a6a40', belly: '#d8b888', hood: '#4a3420', teeth: '#f8f0e0', ear: '#d08870', nose: '#2a1a10' },
    parts: [
      { c: 'hood', s: [ell(37, 35, 4, 7, 35), poly([34, 30], [42, 28], [40, 33])] },
      { c: 'brown', s: ell(31, 26, 3, 7), dim: true },
      // shaggy body
      { c: 'brown', s: [ell(25, 31, 10, 12.5), poly([15, 27], [12, 31], [15.5, 33], [13, 37], [16, 38])] },
      { c: 'belly', s: ell(21, 33, 5.5, 9), mark: true, face: true },
      { c: 'brown', s: ell(30, 38, 6, 6.5) },
      { c: 'brown', s: [ell(23, 45, 4.5, 1.8), ell(33, 45, 4.5, 1.8)] },
      // head with dark hood and bushy cheeks
      { c: 'hood', s: circ(17.5, 6.5, 2.5) },
      { c: 'hood', s: circ(27.5, 6.5, 2.5) },
      { c: 'ear', s: [circ(17.5, 6.8, 1.2), circ(27.5, 6.8, 1.2)], mark: true, face: true },
      { c: 'brown', s: [ell(22, 13, 7.5, 6.5), poly([15, 14], [11, 17], [16, 19]), poly([29, 14], [33, 17], [28, 19])] },
      { c: 'hood', s: [ell(23, 7, 9, 5), ell(30, 14, 3, 7)], mark: true },
      { c: 'belly', s: ell(19, 16.5, 3.5, 2.5), mark: true, face: true },
      pixels([16, 10], EYE, ['k', 'k'], { face: true }),
      pixels([21, 10], EYE, ['kk', 'wk'], { face: true }),
      pixels([16, 14], { n: 'nose' }, ['nn'], { face: true }),
      pixels([16.5, 16], { t: 'teeth' }, ['tt', 'tt'], { face: true }),
      // paw cupped at the mouth
      { c: 'brown', s: [curve(4, [27, 23], [20, 22], [15, 19.5]), circ(14, 18.5, 2.5)], face: true },
    ],
  },

  // -------------------------------------------------------------------------
  // #015 Chäferli – leaf-shell beetle walking
  // -------------------------------------------------------------------------
  chaeferli: {
    pal: { leaf: '#68c048', vein: '#3e7a30', violet: '#a050b0', under: '#f0e8a0', legs: '#2a3a20' },
    parts: [
      { c: 'legs', s: [line(1.2, [20, 40], [18, 44]), line(1.2, [26, 40], [26, 44.5]), line(1.2, [32, 40], [34, 44])], dim: true },
      { c: 'under', s: ell(25, 40, 10, 3.5) },
      // leaf shell with a pointed tip
      { c: 'leaf', s: [ell(26, 35, 11, 7), poly([34, 30], [42, 31], [36, 39])] },
      { c: 'vein', s: [curve(1, [16, 36], [26, 32], [40, 31.5]), line(0.8, [22, 34], [24, 39]), line(0.8, [28, 32.5], [31, 39]), line(0.8, [24, 33.5], [21, 29]), line(0.8, [31, 32], [29, 28])], mark: true, detail: true },
      { c: 'legs', s: [line(1.3, [19, 41], [16, 45]), line(1.3, [25, 42], [24, 45.5]), line(1.3, [31, 42], [32, 45.5])] },
      // face peeking out from under the leaf edge
      { c: 'violet', s: [circ(11, 31, 1.3), circ(18, 30.5, 1.3)], flat: true },
      { c: 'legs', s: [line(0.9, [13, 37], [11, 32]), line(0.9, [16, 37], [18, 32])], outline: false },
      { c: 'under', s: ell(15, 39.5, 4.5, 3.5) },
      pixels([12, 38], EYE, ['k.k', 'k.k'], { face: true }),
    ],
  },
};
