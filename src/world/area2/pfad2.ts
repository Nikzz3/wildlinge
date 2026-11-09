/** Pfad 2: Kieselstadt → Flüsterwald, a route through fields and over a stream. See docs/WORLD.md "AREA 2". */
import type { MapDef } from '../../core/contracts';
import { ENCOUNTERS } from '../../data/encounters';

export const PFAD_2: MapDef = {
  id: 'pfad_2',
  name: 'Pfad 2',
  kind: 'route',
  music: 'route',
  battleBg: 'grass',
  border: 'tree',
  tiles: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTT~~TTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTT.~~.TTTTTTTTTT',
    'TTTT...TTT.fffffff.........~~..TTTT.TTTT',
    'TTT.....T..f,,,,,f.ffffff..~~...TT,,,.TT',
    'TT..o......f,,,,,f.f****f..~~...,,,,,,.T',
    'TT*........,,,,,,f.f****f..~~..,,,,,,,.T',
    'TT.........f,,,,,f.ffffff.~~...,,,,*...T',
    'TTS....*...fffffff........~~..vvvvvvv..T',
    '::::......................~~.......:::::',
    ':::::::::::.........::::::==::::::::::::',
    '::::::::::::::....::::::::==::::::::::::',
    'TT.......::::::::::::::...~~.........S.T',
    'TTvvvvvv...:::::::::......~~...TT...,,.T',
    'T.,,,,,,,..TT...o...,,,...~~..TTT..,,,,T',
    'T.,,,,,,,,.TTT.....,,,,,,~~..TTTT.,,,,,T',
    'TT,,,,,,...T..*....,,,,..~~..TTTT..,,,.T',
    'TT.,,,,..TT....,,,...,,..~~..TTTTT....TT',
    'TTT.....TTTT.,,,,*.......~~.TTTTTTT.TTTT',
    'TTTTTTTTTTTTTT...TTTTTTTT~~TTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTT~~TTTTTTTTTTTTT',
  ],
  connections: {
    left: { map: 'kieselstadt', offset: 2 },
    right: { map: 'fluesterwald', offset: 12 },
  },
  npcs: [
    {
      id: 'farmer', x: 10, y: 4, facing: 'right', sprite: 'man',
      text: 'Die Wühli graben mir den ganzen Acker um.\fAber dafür ist die Erde schön locker!',
    },
    { id: 'pfad2_nico', x: 6, y: 7, facing: 'down', sprite: 'boy', trainer: { id: 'pfad2_nico', sight: 4 } },
    { id: 'pfad2_kurt', x: 15, y: 8, facing: 'down', sprite: 'hiker', trainer: { id: 'pfad2_kurt', sight: 4 } },
    { id: 'pfad2_rosa', x: 21, y: 7, facing: 'down', sprite: 'woman', trainer: { id: 'pfad2_rosa', sight: 3 } },
    { id: 'pfad2_ida', x: 33, y: 11, facing: 'up', sprite: 'kid', trainer: { id: 'pfad2_ida', sight: 3 } },
  ],
  signs: [
    { x: 2, y: 7, text: 'PFAD 2\nWesten: Kieselstadt / Osten: Flüsterwald' },
    { x: 37, y: 11, text: 'FLÜSTERWALD\nBitte leise sein – der Wald hört zu.' },
  ],
  items: [
    { x: 37, y: 4, item: 'potion', flag: 'item:pfad_2:potion' },
    { x: 35, y: 17, item: 'para_cure', flag: 'item:pfad_2:para_cure' },
  ],
  hiddenItems: [
    { x: 4, y: 4, item: 'repel', flag: 'hidden:pfad_2:repel' },
    { x: 15, y: 18, item: 'crystal', flag: 'hidden:pfad_2:crystal' },
  ],
  encounters: ENCOUNTERS['pfad_2'],
};
