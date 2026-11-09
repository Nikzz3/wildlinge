import type { TypeId } from '../core/types';

/**
 * attacker → defender → multiplier (0, 0.5, 2). Missing entries are 1.
 *
 * Every attacker hits 2–3 types hard and is resisted by 2–3; only three immunities exist
 * (earth vs spark, wind vs earth, spirit vs toxic). Each type is weak to 2–3 others.
 * Offense and defense net out to within ±1 per type (immunity counts double).
 */
export const TYPE_CHART: Partial<Record<TypeId, Partial<Record<TypeId, number>>>> = {
  // Blunt, grounded force shatters brittle ice and sees through dazzling glare; bounces off metal, passes through spirits.
  normal: { frost: 2, light: 2, metal: 0.5, spirit: 0.5 },
  // Burns plants, melts ice and metal; doused by water, smothered by earth, fire feeds fire.
  fire: { plant: 2, frost: 2, metal: 2, fire: 0.5, water: 0.5, earth: 0.5 },
  // Douses fire, washes away earth and rusts metal; soaked up by plants, freezes on frost.
  water: { fire: 2, earth: 2, metal: 2, water: 0.5, plant: 0.5, frost: 0.5 },
  // Roots drink water and crack earth, the canopy swallows light; burnt by fire, scattered by wind, wilted by poison.
  plant: { water: 2, earth: 2, light: 2, fire: 0.5, wind: 0.5, toxic: 0.5 },
  // Shocks swimmers, strikes flyers and surges through metal; wood insulates, earth grounds it completely.
  spark: { water: 2, wind: 2, metal: 2, plant: 0.5, spark: 0.5, earth: 0 },
  // Smothers fire, grounds sparks and filters poison; roots hold it, spirits drift through, flyers are out of reach.
  earth: { fire: 2, spark: 2, toxic: 2, plant: 0.5, spirit: 0.5, wind: 0 },
  // Strips leaves and blows out flames; breaks on rock, is swallowed by storms and only chills frost further.
  wind: { plant: 2, fire: 2, earth: 0.5, spark: 0.5, frost: 0.5 },
  // Freezes water, ices wings and cracks rock; melts against fire, thick fur shrugs it off.
  frost: { water: 2, wind: 2, earth: 2, fire: 0.5, frost: 0.5, normal: 0.5 },
  // Withers plants, sickens flesh and smogs out light; earth neutralises it and the bodiless cannot be poisoned.
  toxic: { plant: 2, normal: 2, light: 2, toxic: 0.5, earth: 0.5, spirit: 0 },
  // Haunts ordinary creatures and other spirits; fades in light, is warded off by cold iron.
  spirit: { normal: 2, spirit: 2, light: 0.5, metal: 0.5 },
  // Iron shatters ice, wards off spirits and draws lightning like a rod; softens in fire, rusts in water, clangs off metal.
  metal: { frost: 2, spirit: 2, spark: 2, fire: 0.5, water: 0.5, metal: 0.5 },
  // Banishes spirits and purifies poison; plants drink it up, light passes through light.
  light: { spirit: 2, toxic: 2, plant: 0.5, light: 0.5 },
};
