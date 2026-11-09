import type { ItemDef } from '../core/types';

/** Shop and pickup items. Healing and cures work in the field and in battle. */
export const ITEMS: ItemDef[] = [
  // --- healing -------------------------------------------------------------------------------
  { id: 'potion', name: 'Kräutertee', pocket: 'items', price: 300, usable: 'both', use: { kind: 'heal', hp: 20 },
    desc: 'Ein warmer Tee aus Alpenkräutern. Heilt 20 LP.' },
  { id: 'super_potion', name: 'Arnikabalsam', pocket: 'items', price: 700, usable: 'both', use: { kind: 'heal', hp: 60 },
    desc: 'Ein kühlender Balsam aus Arnika. Heilt 60 LP.' },
  { id: 'hyper_potion', name: 'Enziantonikum', pocket: 'items', price: 1200, usable: 'both',
    use: { kind: 'heal', hp: 150 }, desc: 'Ein kräftiges Tonikum aus Enzianwurzel. Heilt 150 LP.' },
  { id: 'full_potion', name: 'Gletscherquell', pocket: 'items', price: 2500, usable: 'both',
    use: { kind: 'heal', hp: 'full' }, desc: 'Reines Wasser aus dem Gletscher. Heilt alle LP.' },
  { id: 'restore', name: 'Alpsegen', pocket: 'items', price: 3000, usable: 'both', use: { kind: 'restore' },
    desc: 'Der Segen der Alp. Heilt alle LP und jeden Zustand.' },
  { id: 'revive', name: 'Lebensfunke', pocket: 'items', price: 1500, usable: 'both', use: { kind: 'revive', fraction: 0.5 },
    desc: 'Weckt einen besiegten Wildling mit halben LP wieder auf.' },

  // --- cures ---------------------------------------------------------------------------------
  { id: 'antidote', name: 'Entgifter', pocket: 'items', price: 100, usable: 'both', use: { kind: 'cure', status: 'poison' },
    desc: 'Ein bitterer Kräutersud. Heilt eine Vergiftung.' },
  { id: 'burn_salve', name: 'Brandsalbe', pocket: 'items', price: 250, usable: 'both', use: { kind: 'cure', status: 'burn' },
    desc: 'Eine kühlende Salbe. Heilt einen Brand.' },
  { id: 'wake_herb', name: 'Weckkraut', pocket: 'items', price: 250, usable: 'both', use: { kind: 'cure', status: 'sleep' },
    desc: 'Ein scharf duftendes Kraut. Weckt einen Wildling auf.' },
  { id: 'para_cure', name: 'Lähmlöser', pocket: 'items', price: 200, usable: 'both',
    use: { kind: 'cure', status: 'paralysis' }, desc: 'Ein wärmendes Öl. Löst eine Paralyse.' },
  { id: 'cure_all', name: 'Allheilkraut', pocket: 'items', price: 600, usable: 'both', use: { kind: 'cure', status: 'all' },
    desc: 'Ein seltenes Bergkraut. Heilt jeden Zustand.' },

  // --- EN --------------------------------------------------------------------------------------
  { id: 'ether', name: 'Kraftbrühe', pocket: 'items', price: 1200, usable: 'both', use: { kind: 'pp', amount: 10 },
    desc: 'Eine stärkende Brühe. Füllt 10 EN jeder Attacke auf.' },
  { id: 'ether_full', name: 'Kraftsuppe', pocket: 'items', price: 2500, usable: 'both', use: { kind: 'pp', amount: 'full' },
    desc: 'Eine deftige Bergsuppe. Füllt alle EN jeder Attacke auf.' },

  // --- crystals --------------------------------------------------------------------------------
  { id: 'crystal', name: 'Fangkristall', pocket: 'crystals', price: 200, usable: 'battle', use: { kind: 'crystal', rate: 1 },
    desc: 'Ein Kristall, der wilde Wildlinge einfängt.' },
  { id: 'crystal_great', name: 'Glanzkristall', pocket: 'crystals', price: 600, usable: 'battle',
    use: { kind: 'crystal', rate: 1.5 }, desc: 'Ein klarer Kristall. Fängt besser als ein Fangkristall.' },
  { id: 'crystal_ultra', name: 'Gipfelkristall', pocket: 'crystals', price: 1200, usable: 'battle',
    use: { kind: 'crystal', rate: 2 }, desc: 'Ein Kristall vom Gipfel. Fängt sehr zuverlässig.' },
  { id: 'crystal_master', name: 'Urkristall', pocket: 'crystals', price: 0, usable: 'battle',
    use: { kind: 'crystal', rate: 255 }, desc: 'Ein uralter Kristall. Fängt jeden Wildling sicher.' },

  // --- field -----------------------------------------------------------------------------------
  { id: 'repel', name: 'Arvenduft', pocket: 'items', price: 350, usable: 'field', use: { kind: 'repel', steps: 100 },
    desc: 'Duft der Arve. Hält 100 Schritte lang schwache Wildlinge fern.' },
  { id: 'repel_max', name: 'Arvenessenz', pocket: 'items', price: 700, usable: 'field', use: { kind: 'repel', steps: 250 },
    desc: 'Starke Arvenessenz. Hält 250 Schritte lang schwache Wildlinge fern.' },
  { id: 'candy', name: 'Honigwabe', pocket: 'items', price: 0, usable: 'field', use: { kind: 'candy' },
    desc: 'Eine Wabe voller Alpenhonig. Erhöht das Level um 1.' },
];
