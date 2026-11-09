/**
 * Every trainer of the story, in route order (see docs/WORLD.md for where they stand).
 * Ids are snake_case; defeated flag is `trainer:<id>` (set by the engine on a win).
 * Rival battles exist once per rival starter: `<battle>_<rivalStarterId>`, picked with rivalTrainerId().
 */
import type { TrainerDef, TrainerMon } from '../core/types';

// ---------------------------------------------------------------------------
// Starter relations
// ---------------------------------------------------------------------------

/** Player starter → the rival's starter (the type that beats the player's: fire > plant, water > fire, plant > water). */
export const RIVAL_STARTER: Readonly<Record<string, string>> = {
  sproessli: 'zuendli',
  zuendli: 'biberli',
  biberli: 'sproessli',
};

/** Player starter → the starter nobody picked (gift from Forscher Matti in Seewil). */
export const LEFTOVER_STARTER: Readonly<Record<string, string>> = {
  sproessli: 'biberli',
  zuendli: 'sproessli',
  biberli: 'zuendli',
};

export type RivalBattle = 'rival1' | 'rival2' | 'rival3' | 'rival4';

/** Trainer id of a rival battle for the player's starter, e.g. rivalTrainerId('rival2', 'sproessli') → 'rival2_zuendli'. */
export function rivalTrainerId(battle: RivalBattle, playerStarter: string): string {
  const rival = RIVAL_STARTER[playerStarter];
  if (!rival) throw new Error(`rivalTrainerId: player has no starter ("${playerStarter}")`);
  return `${battle}_${rival}`;
}

/** Evolution line of each starter: [stage 1, stage 2, stage 3]. */
const STARTER_LINES: Readonly<Record<string, readonly [string, string, string]>> = {
  sproessli: ['sproessli', 'moosdachs', 'dornachs'],
  zuendli: ['zuendli', 'glutbock', 'brandhorn'],
  biberli: ['biberli', 'bachbiber', 'dammbaron'],
};

/** Rival 2's new catch per rival starter (see the rival-2 entry below). */
const RIVAL2_CATCH: Readonly<Record<string, string>> = { zuendli: 'farnli', biberli: 'wuehli', sproessli: 'wuehli' };

const mon = (species: string, level: number, moves?: string[]): TrainerMon =>
  moves ? { species, level, moves } : { species, level };

/**
 * Rival 3 per rival starter. His team grew up with him: Dohlerich (his Zwitschli), his rival-2 catch and a Zuckwiesel.
 * The player (~Lv 32) has not reached the final form yet. Erdwühler would wall the fire player completely (fire and
 * sparks bounce off it), so that rival leaves his catch at home; the water player copes best with this team, so there
 * it is a few levels higher.
 */
const RIVAL3: Readonly<Record<string, TrainerMon[]>> = {
  zuendli: [mon('dohlerich', 23), mon('farnwicht', 23), mon('zuckwiesel', 23), mon('glutbock', 25)],
  biberli: [mon('dohlerich', 23), mon('zuckwiesel', 23), mon('bachbiber', 25)],
  sproessli: [mon('dohlerich', 27), mon('erdwuehler', 27), mon('zuckwiesel', 27), mon('moosdachs', 28)],
};

/** Sturmdohle cuts with the wind (Sichelwind) instead of diving at the player (Steilflug sweeps plant and fire). */
const STURMDOHLE_MOVES = ['kerbschnitt', 'sichelwind', 'federsalve', 'foehnboee'];

/**
 * Rival 4 per rival starter: the same team, grown up (Sturmdohle, his rival-2 catch or Fratzgeist, Voltmarder) and his
 * final starter, which beats the player's. The player (~Lv 38, final form) faces a team a few levels lower but full of
 * answers; against the plant player Voltmarder leads (sparks barely tickle plants) and Sturmdohle comes late, the
 * water player meets no Voltmarder at all (Dammbaron fears sparks four times over).
 */
const RIVAL4: Readonly<Record<string, TrainerMon[]>> = {
  zuendli: [mon('voltmarder', 29), mon('farnwicht', 29), mon('sturmdohle', 30, STURMDOHLE_MOVES), mon('brandhorn', 33)],
  biberli: [mon('sturmdohle', 32, STURMDOHLE_MOVES), mon('fratzgeist', 32), mon('voltmarder', 33), mon('dammbaron', 34)],
  sproessli: [mon('sturmdohle', 31, STURMDOHLE_MOVES), mon('erdwuehler', 31), mon('fratzgeist', 32), mon('dornachs', 33)],
};

/** One TrainerDef per possible rival starter; `party` receives that starter's evolution line. */
function rivalVariants(
  battle: RivalBattle,
  base: Omit<TrainerDef, 'id' | 'party' | 'className' | 'name' | 'sprite' | 'music'>,
  party: (line: readonly [string, string, string]) => TrainerMon[],
): TrainerDef[] {
  return Object.entries(STARTER_LINES).map(([starter, line]) => ({
    id: `${battle}_${starter}`,
    className: 'Rivale',
    name: '{RIVAL}',
    sprite: 'rival',
    music: 'battle_rival',
    party: party(line),
    ...base,
  }));
}

// ---------------------------------------------------------------------------
// Rival battles
// ---------------------------------------------------------------------------

const RIVALS: TrainerDef[] = [
  // 1) Arven's lab in Moosbach, right after choosing the starter (allowLoss).
  ...rivalVariants(
    'rival1',
    {
      reward: 200,
      ai: 'basic',
      intro: 'Moment! Lass uns gleich testen, wer den besseren Wildling hat!',
      defeat: 'Was?! Ich hab doch extra den Stärkeren genommen!',
      after: 'Ich geh schon mal vor nach Kieselstadt. Bis bald, Schnecke!',
    },
    ([s1]) => [mon(s1, 5)],
  ),
  // 2) West entrance of the Flüsterwald (before Seewil). His new catch covers his starter's weakness: Farnli (plant)
  //    against water for Zündli, Wühli (earth) against sparks for Biberli and against fire for Sprössli.
  //    The player's starter has just evolved (~Lv 17). Against the fire player, whose Zuckfunke shocks Biberli, his
  //    water starter already knows Tropfenregen and everyone is a level higher.
  ...rivalVariants(
    'rival2',
    {
      reward: 700,
      ai: 'smart',
      items: ['potion'],
      intro: 'Da bist du ja! Ich hab einen neuen Wildling. Der deckt genau meine Schwäche ab!',
      defeat: 'Was?! Ich war noch gar nicht richtig warm!',
      after: 'Im Wald sind komische Typen in Kutten. Pass bloß auf dich auf!',
    },
    ([s1]) =>
      s1 === 'biberli'
        ? [mon('zwitschli', 12), mon('wuehli', 12), mon(s1, 14, ['stupser', 'brummbass', 'kellenschlag', 'tropfenregen'])]
        : [mon('zwitschli', 11), mon(RIVAL2_CATCH[s1] ?? 'farnli', 11), mon(s1, 13)],
  ),
  // 3) South entrance of Frostalp (before Halle 4), see RIVAL3.
  ...rivalVariants(
    'rival3',
    {
      reward: 1600,
      ai: 'smart',
      items: ['super_potion'],
      intro: 'Drei Abzeichen, genau wie ich! Zeit, zu klären, wer vorne liegt!',
      defeat: 'Schon wieder?! Du wirst echt immer stärker …',
      after: 'Der Frostmantel ist am Gipfelpfad. Hol dir das Abzeichen, dann los!',
    },
    ([s1]) => RIVAL3[s1] ?? [],
  ),
  // 4) Gipfelhorn summit at the Alpenglut, after the boss (the flame healed the team), see RIVAL4.
  ...rivalVariants(
    'rival4',
    {
      reward: 4000,
      ai: 'smart',
      items: ['full_potion', 'hyper_potion'],
      intro: 'Wir wollten immer als Erste hier oben sein. Jetzt sind wir es beide!',
      defeat: 'Du warst schneller oben. Wie immer. Diesmal gönn ich es dir!',
      after: 'Schau, die Alpenglut! Sie brennt wieder richtig hell.',
    },
    ([s1]) => RIVAL4[s1] ?? [],
  ),
];

// ---------------------------------------------------------------------------
// AREA 1: Pfad 1, Halle Kieselstadt (Erde)
// ---------------------------------------------------------------------------

const AREA1: TrainerDef[] = [
  {
    id: 'pfad1_beni', className: 'Knirps', name: 'Beni', sprite: 'kid',
    party: [mon('zwitschli', 3)], reward: 100, ai: 'basic',
    intro: 'He! Mein Zwitschli ist das schnellste im ganzen Tal!',
    defeat: 'Waaas? So schnell ist es dann doch nicht …',
    after: 'Ich trainiere jetzt jeden Tag. Ehrenwort!',
  },
  {
    id: 'pfad1_lea', className: 'Schülerin', name: 'Lea', sprite: 'girl',
    party: [mon('munggli', 3), mon('chaeferli', 4)], reward: 200, ai: 'basic',
    intro: 'Wir haben heute Wildlingkunde! Du bist meine Hausaufgabe!',
    defeat: 'Oh nein, das gibt eine schlechte Note …',
    after: 'Chäferli riechen bitter, wenn sie Angst haben. Steht im Schulbuch!',
  },
  {
    id: 'pfad1_sepp', className: 'Wanderer', name: 'Sepp', sprite: 'hiker',
    party: [mon('zwitschli', 4), mon('munggli', 6)], reward: 280, ai: 'basic',
    intro: 'Hoppla, ein junger Wandersmann! Zeig mal, was du draufhast!',
    defeat: 'Donnerwetter! Du hast Schmalz in den Knochen!',
    after: 'In Kieselstadt wartet Hüter Jost. Der ist hart wie Granit!',
  },
  {
    id: 'hall1_urs', className: 'Steinmetz', name: 'Urs', sprite: 'man',
    party: [mon('wuehli', 8), mon('schneggli', 9)], reward: 300, ai: 'basic',
    intro: 'Ich meißle jeden Herausforderer zurecht. Halt schön still!',
    defeat: 'Da ist mir wohl der Meißel abgerutscht …',
    after: 'Jost sagt: Ein Fels wankt nicht. Aber Wurzeln sprengen ihn!',
  },
  {
    id: 'hall1_vreni', className: 'Wanderin', name: 'Vreni', sprite: 'woman',
    party: [mon('munggli', 9), mon('wuehli', 9)], reward: 400, ai: 'basic',
    intro: 'Bis zum Hüter musst du erst an mir vorbei!',
    defeat: 'Du bist ja zäh wie Leder!',
    after: 'Wasser spült Erde fort. Merk dir das für den Kampf gegen Jost!',
  },
  {
    id: 'leader_jost', className: 'Hüter', name: 'Jost', sprite: 'leader_earth',
    // 'smart' picks the best move, so his ace carries no earth move: against the fire starter Steimandli's best is
    // Kerbschnitt (a stonemason's notch, neutral – Brandmal halves it), while Wühli's venomous bite (real moles have
    // toxic saliva) and Steimandli's nettle collar (Nesselstich) sting the plant starter, which shrugs off earth.
    // Schneggli skips Saftzapfen (unfair on Biberli).
    party: [
      mon('schneggli', 10, ['stupser', 'felsenhaut', 'kieselkick']),
      mon('wuehli', 11, ['kieselkick', 'nesselstich', 'pfotenwirbel', 'brummbass']),
      mon('steimandli', 12, ['kerbschnitt', 'felsenhaut', 'nesselstich']),
    ],
    reward: 1200, ai: 'smart', music: 'battle_leader', items: ['potion'],
    intro: 'Ich bin Jost, Hüter von Kieselstadt. Bist du so standhaft wie Granit?',
    defeat: 'Hut ab! Du hast meinen Fels zum Bröckeln gebracht.',
    after: 'Mit dem Felsabzeichen lässt dich die Wache nach Osten. Auf zum Flüsterwald!',
  },
];

// ---------------------------------------------------------------------------
// AREA 2: Pfad 2, Flüsterwald (first Frostmantel), Halle Seewil (Wasser)
// ---------------------------------------------------------------------------

const AREA2: TrainerDef[] = [
  {
    id: 'pfad2_nico', className: 'Schüler', name: 'Nico', sprite: 'boy',
    party: [mon('zwitschli', 9), mon('munggli', 10)], reward: 400, ai: 'basic',
    intro: 'Heute ist schulfrei. Zeit für einen Kampf!',
    defeat: 'Hätte ich doch lieber Hausaufgaben gemacht …',
    after: 'Im Wald da vorne soll es spuken. Da geh ich nicht rein!',
  },
  {
    id: 'pfad2_rosa', className: 'Gärtnerin', name: 'Rosa', sprite: 'woman',
    party: [mon('chaeferli', 10), mon('schneggli', 11)], reward: 440, ai: 'basic',
    intro: 'Trampel mir nicht durchs Beet! Dafür gibt es einen Kampf!',
    defeat: 'Meine armen Blümchen und meine armen Wildlinge …',
    after: 'Schneggli lieben Regen. Dann gucken sie aus ihren Häuschen.',
  },
  {
    id: 'pfad2_kurt', className: 'Wanderer', name: 'Kurt', sprite: 'hiker',
    party: [mon('wuehli', 11), mon('munggli', 11)], reward: 440, ai: 'basic',
    intro: 'Mein Wühli gräbt sich durch jeden Gegner. Du bist der Nächste!',
    defeat: 'Da hab ich mir wohl selbst ein Loch gegraben.',
    after: 'Wühli findest du am Rand der Felder hier auf Pfad 2.',
  },
  {
    id: 'pfad2_ida', className: 'Knirps', name: 'Ida', sprite: 'kid',
    party: [mon('zwitschli', 11), mon('chaeferli', 12)], reward: 300, ai: 'basic',
    intro: 'Ich bin zwar klein, aber meine Wildlinge sind riesig stark!',
    defeat: 'Okay, okay … sie sind nur ein bisschen stark.',
    after: 'Wenn ich groß bin, werde ich Hüterin! Wart’s nur ab!',
  },
  {
    id: 'wald_ferdi', className: 'Pilzsammler', name: 'Ferdi', sprite: 'oldman',
    party: [mon('tuepfli', 11), mon('farnli', 12)], reward: 480, ai: 'basic',
    intro: 'Psst! Du verscheuchst mir die Pilze! Das gibt Ärger!',
    defeat: 'Na gut, na gut. Die Pilze laufen ja nicht weg.',
    after: 'Tüpfli mögen feuchtes Laub. Ihre Tupfen warnen vor Gift!',
  },
  {
    id: 'wald_jana', className: 'Schülerin', name: 'Jana', sprite: 'girl',
    party: [mon('farnli', 12), mon('laervli', 12)], reward: 480, ai: 'basic',
    intro: 'Hörst du das Flüstern? Ich glaub, das sind meine Wildlinge!',
    defeat: 'Huch! Jetzt flüstern sie nicht mehr, jetzt jammern sie.',
    after: 'Lärvli sind Masken mit Geistern drin. Gruselig, aber süß!',
  },
  {
    id: 'wald_otto', className: 'Forscher', name: 'Otto', sprite: 'scientist',
    party: [mon('farnli', 12), mon('laervli', 13), mon('tuepfli', 12)], reward: 520, ai: 'basic',
    intro: 'Ich erforsche den Wald für Professorin Arven. Du bist ein Datenpunkt!',
    defeat: 'Interessant! Das trage ich als Ausreißer ein.',
    after: 'Leute in eisblauen Kutten haben hier Bäume vereist. Höchst seltsam!',
  },
  {
    id: 'grunt_wald_1', className: 'Frostmantel', name: 'Knut', sprite: 'grunt',
    party: [mon('tuepfli', 12), mon('floeckli', 13)], reward: 520, ai: 'basic',
    intro: 'Hier gibt es nichts zu sehen! Der Frostmantel hat zu tun!',
    defeat: 'Brrr! Der Chef wird mir die Kapuze waschen …',
    after: 'Bald wird es kalt in Alvenland. Sehr kalt. Hehehe …',
  },
  {
    id: 'grunt_wald_2', className: 'Frostmantel', name: 'Grete', sprite: 'grunt',
    party: [mon('laervli', 13), mon('floeckli', 14)], reward: 560, ai: 'basic',
    intro: 'Ein Kind? Hier? Du störst unser Experiment! Verschwinde – oder kämpfe!',
    defeat: 'Unser Frostkern-Test … ruiniert!',
    after: 'Wir sehen uns wieder. Spätestens, wenn die Alpenglut erlischt!',
  },
  {
    id: 'hall2_sina', className: 'Schwimmerin', name: 'Sina', sprite: 'girl',
    party: [mon('tauchli', 14), mon('tauchli', 15)], reward: 600, ai: 'basic',
    intro: 'Ich schwimme jeden Morgen quer über den See. Und du?',
    defeat: 'Blubb … ich bin untergegangen.',
    after: 'Undine sagt: Wasser ist geduldig. Es höhlt jeden Stein.',
  },
  {
    id: 'hall2_ruben', className: 'Seebub', name: 'Ruben', sprite: 'boy',
    party: [mon('tuepfli', 15), mon('tauchli', 15)], reward: 600, ai: 'basic',
    intro: 'Bei uns in Seewil wird nicht geangelt. Hier wird gekämpft!',
    defeat: 'Da bin ich wohl ins kalte Wasser gesprungen …',
    after: 'Pflanzen und Blitze – davor hat sogar Undine Respekt.',
  },
  {
    id: 'hall2_alois', className: 'Fischer', name: 'Alois', sprite: 'fisher',
    party: [mon('schneggli', 15), mon('tauchli', 15)], reward: 640, ai: 'basic',
    intro: 'Meine Angel hab ich längst verschenkt. Meine Wildlinge sind mein Fang!',
    defeat: 'Da ist mir wohl ein großer Fisch entwischt. Nämlich du!',
    after: 'Undines Seefürst tanzt übers Wasser. Lass dich nicht blenden!',
  },
  {
    id: 'leader_undine', className: 'Hüterin', name: 'Undine', sprite: 'leader_water',
    // Undine swims through the ice-cold lake every morning: Reifhauch is her answer to the water starter. No Wildbach –
    // Tropfenregen keeps Seefürst from one-shotting the fire starter, whose Zuckfunke is its way through.
    party: [
      mon('tauchli', 15, ['reifhauch', 'bergbrise', 'kellenschlag', 'tropfenregen']),
      mon('tuepfli', 15),
      mon('seefuerst', 17, ['tropfenregen', 'reifhauch', 'bergbrise', 'alpenrast']),
    ],
    reward: 1800, ai: 'smart', music: 'battle_leader', items: ['super_potion'],
    intro: 'Willkommen in meiner Halle am See. Schwimmst du mit der Strömung?',
    defeat: 'Wie eine Welle, die ans Ufer bricht … Du hast gewonnen.',
    after: 'Mit dem Wellenabzeichen darfst du nach Norden zur Glimmerhöhle.',
  },
];

// ---------------------------------------------------------------------------
// AREA 3: Pfad 3, Glimmerhöhle, Funkenwerk, Halle Funkenstadt (Blitz)
// ---------------------------------------------------------------------------

const AREA3: TrainerDef[] = [
  {
    id: 'pfad3_beat', className: 'Fischer', name: 'Beat', sprite: 'fisher',
    party: [mon('tauchli', 17), mon('tauchli', 18)], reward: 720, ai: 'basic',
    intro: 'Ich schau nur, ob die Tauchli schon tauchen. Kampf gefällig?',
    defeat: 'Jetzt hab ich den Faden verloren …',
    after: 'Tauchli reiten auf dem Rücken ihrer Eltern. Schon gesehen?',
  },
  {
    id: 'pfad3_nora', className: 'Schülerin', name: 'Nora', sprite: 'girl',
    party: [mon('zwitschli', 17), mon('munggli', 18)], reward: 720, ai: 'basic',
    intro: 'Unsere Klasse macht einen Ausflug zur Höhle. Ich bin die Vorhut!',
    defeat: 'Ich warte wohl lieber auf die anderen.',
    after: 'In der Glimmerhöhle glitzern die Wände. Aber es ist stockdunkel!',
  },
  {
    id: 'pfad3_heidi', className: 'Seglerin', name: 'Heidi', sprite: 'woman',
    party: [mon('tauchli', 18), mon('dohlerich', 19)], reward: 800, ai: 'basic',
    intro: 'Der Wind steht gut! Perfekt für einen Kampf!',
    defeat: 'Flaute! Totale Flaute!',
    after: 'Dohleriche segeln wie ich. Nur ohne Boot.',
  },
  {
    id: 'pfad3_toni', className: 'Wanderer', name: 'Toni', sprite: 'hiker',
    party: [mon('wuehli', 19), mon('munggli', 19)], reward: 760, ai: 'basic',
    intro: 'Bergauf, bergab – und dazwischen ein Kampf!',
    defeat: 'Uff, da muss ich erst mal verschnaufen.',
    after: 'Hinter der Höhle liegt Funkenstadt. Dort summt es Tag und Nacht.',
  },
  {
    id: 'pfad3_emil', className: 'Forscher', name: 'Emil', sprite: 'scientist',
    party: [mon('tuepfli', 18), mon('stinkkaefer', 19)], reward: 800, ai: 'basic',
    intro: 'Achtung, mein Stinkkäfer ist geladen! Also … mit Gestank.',
    defeat: 'Puh. Jetzt riecht es hier wirklich streng.',
    after: 'Stinkkäfer sind selten. Ich hab drei Wochen nach ihm gesucht!',
  },
  {
    id: 'hoehle_godi', className: 'Bergmann', name: 'Godi', sprite: 'hiker',
    party: [mon('wuehli', 20), mon('stachli', 20), mon('wuehli', 21)], reward: 840, ai: 'basic',
    intro: 'Glück auf! Hier unten kämpft man im Halbdunkel!',
    defeat: 'Da hab ich wohl auf Granit gebissen.',
    after: 'Fremde in Kutten schleppen Glimmerquarz weg. Der gehört dem Berg!',
  },
  {
    id: 'grunt_hoehle_1', className: 'Frostmantel', name: 'Lars', sprite: 'grunt',
    party: [mon('stachli', 20), mon('floeckli', 21)], reward: 840, ai: 'basic',
    intro: 'Du schon wieder? Der Glimmerquarz gehört jetzt uns!',
    defeat: 'Mist! Dann schlepp ich die Kisten eben allein …',
    after: 'Mit genug Quarz läuft unser Frostkern auf Hochtouren!',
  },
  {
    id: 'hoehle_fredi', className: 'Bergmann', name: 'Fredi', sprite: 'hiker',
    party: [mon('stachli', 21), mon('bergmaennli', 21)], reward: 840, ai: 'basic',
    intro: 'Siehst du das Licht? Das ist mein Bergmännli. Es leuchtet mir heim!',
    defeat: 'Licht aus … ich hab verloren.',
    after: 'Bergmännli flackern, wenn Steinschlag droht. Gut zu wissen, was?',
  },
  {
    id: 'grunt_hoehle_2', className: 'Frostmantel', name: 'Petra', sprite: 'grunt',
    party: [mon('laervli', 21), mon('floeckli', 21), mon('wuehli', 20)], reward: 880, ai: 'basic',
    intro: 'Hier kommst du nicht durch! Der Ausgang ist gesperrt. Befehl von oben!',
    defeat: 'Das melde ich der Kommandantin!',
    after: 'Kommandantin Bise wird dich zu Eis blasen!',
  },
  {
    id: 'grunt_werk_1', className: 'Frostmantel', name: 'Udo', sprite: 'grunt',
    party: [mon('floeckli', 22), mon('stachli', 22)], reward: 880, ai: 'basic',
    intro: 'Das Funkenwerk ist geschlossen! Für immer! Hahaha!',
    defeat: 'Kurzschluss! Bei mir, nicht bei der Maschine …',
    after: 'Die Kommandantin baut hinten den großen Frostkern zusammen.',
  },
  {
    id: 'grunt_werk_2', className: 'Frostmantel', name: 'Rita', sprite: 'grunt',
    party: [mon('laervli', 22), mon('zuckli', 23)], reward: 920, ai: 'basic',
    intro: 'Dieses Zuckli hab ich hier gefunden. Jetzt kämpft es für den Frost!',
    defeat: 'Es hat … gar nicht auf mich gehört.',
    after: 'Ich glaub, Zuckli mag Wärme lieber als Frost.',
  },
  {
    id: 'grunt_werk_3', className: 'Frostmantel', name: 'Egon', sprite: 'grunt',
    party: [mon('floeckli', 23), mon('tuepfli', 23)], reward: 920, ai: 'basic',
    intro: 'Stopp! Weiter hinten nur für Mitglieder mit Kapuze!',
    defeat: 'Meine Kapuze … sie ist verrutscht!',
    after: 'Ewiger Winter! Keine Mücken mehr! Klingt doch super, oder?',
  },
  {
    id: 'admin_bise_1', className: 'Kommandantin', name: 'Bise', sprite: 'grunt',
    party: [mon('dohlerich', 21), mon('floeckli', 24), mon('fratzgeist', 25)],
    reward: 1500, ai: 'smart', music: 'battle_boss', items: ['super_potion'],
    intro: 'Ich bin Bise, der kalte Nordwind des Frostmantels. Dich puste ich weg!',
    defeat: 'Hmpf! Ein laues Lüftchen hätte dich nicht aufgehalten …',
    after: 'Den Urkristall haben wir längst. Der Gipfel gehört bald uns!',
  },
  {
    id: 'hall3_jola', className: 'Mechanikerin', name: 'Jola', sprite: 'girl',
    party: [mon('zuckli', 21), mon('guggerli', 22)], reward: 880, ai: 'basic',
    intro: 'Ich schraube an allem herum. Heute an dir!',
    defeat: 'Da fehlt wohl eine Schraube … bei mir.',
    after: 'Erde leitet Strom in den Boden. Blitze verpuffen einfach!',
  },
  {
    id: 'hall3_max', className: 'Ingenieur', name: 'Max', sprite: 'scientist',
    party: [mon('gondeli', 22), mon('zuckli', 22)], reward: 880, ai: 'basic',
    intro: 'Meine Berechnung sagt: Du verlierst zu 87 Prozent!',
    defeat: 'Rechenfehler! Ich hab das Komma falsch gesetzt!',
    after: 'Gondeli fahren hier die Kinder zur Schule. Ganz pünktlich!',
  },
  {
    id: 'hall3_ben', className: 'Elektriker', name: 'Ben', sprite: 'man',
    party: [mon('zuckli', 22), mon('zuckwiesel', 23)], reward: 920, ai: 'basic',
    intro: 'Hochspannung! Lebensgefahr! Also … für deine Wildlinge.',
    defeat: 'Sicherung raus. Ich hab verloren.',
    after: 'Zita hat das halbe Funkenwerk selbst gebaut. Sie ist genial!',
  },
  {
    id: 'leader_zita', className: 'Hüterin', name: 'Zita', sprite: 'leader_spark',
    party: [
      mon('guggerli', 23), mon('gondeli', 24),
      mon('zuckwiesel', 25, ['blitzkralle', 'kugelblitz', 'kerbschnitt', 'hochspannung']),
    ],
    reward: 2500, ai: 'smart', music: 'battle_leader', items: ['super_potion', 'super_potion'],
    intro: 'Danke nochmal fürs Funkenwerk! Aber jetzt gibt’s Funken. Volle Ladung!',
    defeat: 'Kurzschluss! Was für eine Energie! Du hast gewonnen.',
    after: 'Mit dem Funkenabzeichen darfst du auf Pfad 4, hinauf nach Frostalp.',
  },
];

// ---------------------------------------------------------------------------
// AREA 4: Pfad 4, Halle Frostalp (Frost), Gipfelpfad, Gipfelhorn
// ---------------------------------------------------------------------------

const AREA4: TrainerDef[] = [
  {
    id: 'pfad4_luca', className: 'Knirps', name: 'Luca', sprite: 'kid',
    party: [mon('zuckli', 26), mon('guggerli', 27), mon('stachli', 27)], reward: 780, ai: 'basic',
    intro: 'Ich bin ganz allein hier hochgelaufen! Und jetzt kämpf ich!',
    defeat: 'Und jetzt lauf ich ganz allein wieder runter …',
    after: 'In Frostalp gibt’s heiße Schokolade. Da muss ich hin!',
  },
  {
    id: 'pfad4_rolf', className: 'Mechaniker', name: 'Rolf', sprite: 'man',
    party: [mon('gondeli', 27), mon('zuckwiesel', 27)], reward: 1040, ai: 'basic',
    intro: 'Ich warte die Stromleitungen. Und ich warte auf Gegner!',
    defeat: 'Leitung tot. Ich auch.',
    after: 'Die Gondeli spinnen ihre Seile bis hinauf nach Frostalp.',
  },
  {
    id: 'pfad4_resi', className: 'Wanderin', name: 'Resi', sprite: 'woman',
    party: [mon('dohlerich', 26), mon('steimandli', 27)], reward: 1040, ai: 'basic',
    intro: 'Die Luft wird dünner, aber mein Kampfgeist nicht!',
    defeat: 'Ich glaub, ich brauch eine Rast.',
    after: 'Steimandli zeigen dir den Weg. Wenn sie nicht gerade schlafen.',
  },
  {
    id: 'pfad4_hans', className: 'Bergsteiger', name: 'Hans', sprite: 'hiker',
    party: [mon('dohlerich', 27), mon('steimandli', 28), mon('pfiffmungg', 28)], reward: 1080, ai: 'basic',
    intro: 'Ein Gipfel ohne Kampf ist wie Käse ohne Löcher!',
    defeat: 'Abgerutscht! Ganz schön steil, dein Können!',
    after: 'Pfiffmungg pfeifen, wenn Gefahr droht. Hörst du? Kein Pfiff. Gut so.',
  },
  {
    id: 'hall4_anouk', className: 'Skifahrerin', name: 'Anouk', sprite: 'girl',
    party: [mon('floeckli', 26), mon('floeckli', 27)], reward: 1080, ai: 'basic',
    intro: 'Achtung, Piste! Ich fahr dich einfach um!',
    defeat: 'Sturz im Tiefschnee …',
    after: 'Feuer schmilzt Eis. Das weiß hier jedes Kind.',
  },
  {
    id: 'hall4_walter', className: 'Bergführer', name: 'Walter', sprite: 'hiker',
    party: [mon('bernhardin', 27), mon('steimandli', 27)], reward: 1080, ai: 'basic',
    intro: 'Ich bringe jeden sicher auf den Berg. Aber nicht an mir vorbei!',
    defeat: 'Du findest deinen Weg auch ohne Führer.',
    after: 'Bernhardin tragen warmen Tee am Hals. Praktisch im Schneesturm!',
  },
  {
    id: 'hall4_svea', className: 'Eiskletterin', name: 'Svea', sprite: 'woman',
    party: [mon('floeckli', 27), mon('firngeist', 28)], reward: 1120, ai: 'basic',
    intro: 'Ich klettere an gefrorenen Wasserfällen. Du bist ein Klacks!',
    defeat: 'Der Eispickel ist abgerutscht!',
    after: 'Metall und Feuer – davor zittert sogar das Eis.',
  },
  {
    id: 'leader_firna', className: 'Hüterin', name: 'Firna', sprite: 'leader_frost',
    party: [mon('floeckli', 27), mon('bernhardin', 28), mon('firngeist', 29), mon('firnhase', 31)],
    reward: 3100, ai: 'smart', music: 'battle_leader', items: ['hyper_potion', 'super_potion'],
    intro: 'Ich hüte das Tor zum Gipfel. Nur wer der Kälte trotzt, darf hinauf.',
    defeat: 'Dein Herz brennt heller als jeder Frost. Du hast es verdient.',
    after: 'Der Gipfelpfad steht dir offen. Bring die Alpenglut zum Leuchten!',
  },
  {
    id: 'grunt_gipfel_1', className: 'Frostmantel', name: 'Holger', sprite: 'grunt',
    party: [mon('floeckli', 31), mon('bernhardin', 31)], reward: 1200, ai: 'basic',
    intro: 'Kein Durchgang! Der Gipfel ist Sperrgebiet des Frostmantels!',
    defeat: 'Mir ist so kalt … und so peinlich.',
    after: 'Selbst mir wird der ewige Winter langsam zu frostig …',
  },
  {
    id: 'gipfel_carla', className: 'Alpinistin', name: 'Carla', sprite: 'woman',
    party: [mon('foehngeier', 30), mon('wyssli', 30), mon('steimandli', 31)], reward: 1200, ai: 'basic',
    intro: 'Hier oben zählt jeder Schritt. Und jeder Kampf!',
    defeat: 'Seilschaft gerissen …',
    after: 'Wyssli wachsen nur an den steilsten Felsen. Ein seltener Fund!',
  },
  {
    id: 'grunt_gipfel_2', className: 'Frostmantel', name: 'Wilma', sprite: 'grunt',
    party: [mon('firngeist', 31), mon('fratzgeist', 32)], reward: 1240, ai: 'basic',
    intro: 'Hörst du den Wind heulen? Das sind meine Geister!',
    defeat: 'Der Spuk ist vorbei …',
    after: 'Eisner verspricht Ruhe im ewigen Winter. Ruhe wovor eigentlich?',
  },
  {
    id: 'gipfel_rico', className: 'Bergsteiger', name: 'Rico', sprite: 'hiker',
    party: [mon('dohlerich', 31), mon('firnhase', 32)], reward: 1240, ai: 'basic',
    intro: 'Ich will als Erster auf den Gipfel! Aus dem Weg!',
    defeat: 'Okay, du darfst vor. Aber nur dieses Mal.',
    after: 'Oben brennt die Alpenglut schwächer als sonst. Der Frostmantel?',
  },
  {
    id: 'grunt_gipfel_3', className: 'Frostmantel', name: 'Sven', sprite: 'grunt',
    party: [mon('erzborst', 32), mon('firnhase', 32)], reward: 1240, ai: 'basic',
    intro: 'Du hast uns das Funkenwerk vermasselt. Das zahl ich dir heim!',
    defeat: 'Das war’s. Ich geh nach Hause und heize ein.',
    after: 'Die Kommandantin wartet weiter oben. Viel Glück. Ehrlich.',
  },
  {
    id: 'admin_bise_2', className: 'Kommandantin', name: 'Bise', sprite: 'grunt',
    party: [mon('sturmdohle', 32), mon('firngeist', 33), mon('fratzgeist', 34)],
    reward: 2400, ai: 'smart', music: 'battle_boss', items: ['hyper_potion'],
    intro: 'Diesmal gibt es keinen Rückenwind für dich. Hier oben herrscht die Bise!',
    defeat: 'Unmöglich … Selbst der Nordwind legt sich irgendwann.',
    after: 'Geh nur. Eisner wartet an der Flamme. Er hat den Urkristall.',
  },
  {
    id: 'boss_eisner', className: 'Anführer', name: 'Eisner', sprite: 'boss',
    party: [
      mon('bernhardin', 33), mon('erzborst', 34), mon('firngeist', 34),
      mon('firnhase', 35, ['gletscherwut', 'frostpranke', 'kerbschnitt', 'foehnboee']),
    ],
    reward: 5000, ai: 'smart', music: 'battle_boss', items: ['hyper_potion'],
    intro: 'Wenn die Alpenglut erlischt, schläft Alvenland für immer unter Eis.',
    defeat: 'Mein Winter … geschmolzen von einem Kind?',
    after: 'Die Glut … sie wärmt immer noch. Vielleicht hatte ich unrecht.',
  },
];

export const TRAINERS: TrainerDef[] = [...AREA1, ...AREA2, ...AREA3, ...AREA4, ...RIVALS];
