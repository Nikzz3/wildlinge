import type { TrainerDef } from '../core/types';

/** Trainers used only by development maps (src/world/dev.ts). */
export const DEV_TRAINERS: TrainerDef[] = [
  {
    id: 'dev_hiker',
    className: 'Wanderer',
    name: 'Ruedi',
    sprite: 'hiker',
    party: [
      { species: 'munggli', level: 4 },
      { species: 'zwitschli', level: 5 },
    ],
    reward: 200,
    intro: 'Halt! Wer hier vorbei will, muss erst gegen mich kämpfen!',
    defeat: 'Uff! Du bist ja richtig stark!',
    after: 'Im hohen Gras findest du viele wilde Wildlinge.',
    ai: 'basic',
  },
  {
    id: 'dev_kid',
    className: 'Knirps',
    name: 'Timo',
    sprite: 'kid',
    party: [{ species: 'chaeferli', level: 5 }],
    reward: 100,
    intro: 'Ich hab dich gesehen! Jetzt wird gekämpft!',
    defeat: 'Och nö, verloren!',
    after: 'Nächstes Mal gewinne ich bestimmt!',
    ai: 'basic',
  },
  {
    id: 'dev_ranger',
    className: 'Rangerin',
    name: 'Seraina',
    sprite: 'ranger',
    party: [{ species: 'zwitschli', level: 5 }],
    reward: 150,
    intro: 'Von hier oben sehe ich alles! Los, kämpf mit mir!',
    defeat: 'Du bist schneller, als du aussiehst!',
    after: 'Über die Kante springen geht nur nach unten.',
    ai: 'basic',
  },
];
