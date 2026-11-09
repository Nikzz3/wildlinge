/** Laden stock keyed by town map id (see docs/WORLD.md). Each town sells better goods than the last. */
export const SHOPS: Record<string, string[]> = {
  kieselstadt: ['crystal', 'potion', 'antidote', 'para_cure', 'wake_herb', 'repel'],
  seewil: ['crystal', 'crystal_great', 'potion', 'super_potion', 'antidote', 'burn_salve', 'para_cure', 'wake_herb', 'repel'],
  funkenstadt: [
    'crystal', 'crystal_great', 'super_potion', 'hyper_potion', 'revive', 'antidote', 'burn_salve', 'para_cure',
    'wake_herb', 'cure_all', 'repel_max', 'ether',
  ],
  frostalp: [
    'crystal_great', 'crystal_ultra', 'super_potion', 'hyper_potion', 'full_potion', 'restore', 'revive', 'cure_all',
    'burn_salve', 'repel_max', 'ether',
  ],
};
