import type { LearnsetEntry, SpeciesDef, Stats } from '../core/types';

/** [level, moveId] pairs; written per evolution line and shared by its stages. */
type Learn = readonly (readonly [number, string])[];

/** Merges learnset groups (line + stage extras) into one list sorted by level. */
function learnset(...groups: Learn[]): LearnsetEntry[] {
  return groups
    .flat()
    .map(([level, move]) => ({ level, move }))
    .sort((a, b) => a.level - b.level);
}

const stats = (hp: number, atk: number, def: number, mag: number, res: number, spd: number): Stats => ({
  hp, atk, def, mag, res, spd,
});

// --- evolution line learnsets ------------------------------------------------------------------

const SPROESSLI_LINE: Learn = [
  [1, 'stupser'], [1, 'brummbass'], [7, 'zweigschlag'], [11, 'saftzapfen'], [15, 'mohnduft'], [20, 'distelhieb'],
  [24, 'enzianregen'], [29, 'sonnenbad'], [40, 'waldeszorn'], [47, 'laerchenfall'],
];
/**
 * Hooves strike sparks like flint: Zuckfunke gives the fire line an answer to the water Halle.
 * Brandmal comes early: burning a rock-hard earth creature halves its attack — the fire line's way through Halle 1.
 */
const ZUENDLI_LINE: Learn = [
  [1, 'stupser'], [1, 'frechgrinsen'], [8, 'flaemmchen'], [9, 'brandmal'], [11, 'jodelschall'], [12, 'zuckfunke'], [15, 'gluehstoss'],
  [20, 'fackelzug'], [30, 'kohlenhieb'], [38, 'hoehenfeuer'], [46, 'glutansturm'],
];
const BIBERLI_LINE: Learn = [
  [1, 'stupser'], [1, 'brummbass'], [7, 'spritzer'], [11, 'kellenschlag'], [15, 'tropfenregen'], [20, 'gischthieb'],
  [25, 'alpenrast'], [30, 'wildbach'], [38, 'hochwasser'],
];
/**
 * Bachbiber drums its paws (Pfotenwirbel: something for the plants that shrug off water, e.g. rival 2's Sprössli),
 * digs (earth vs the spark Halle) and gets iron teeth before the frost Halle.
 */
const BACHBIBER_EXTRA: Learn = [[17, 'pfotenwirbel'], [21, 'geroellwalze'], [28, 'stahlschnitt']];
const ZWITSCHLI_LINE: Learn = [
  [1, 'stupser'], [1, 'frechgrinsen'], [5, 'bergbrise'], [9, 'flitzstoss'], [13, 'federhieb'], [18, 'federsalve'],
  [24, 'steilflug'], [28, 'foehnboee'], [35, 'kerbschnitt'], [42, 'foehnsturm'], [50, 'gipfelsturz'],
];
const MUNGGLI_LINE: Learn = [
  [1, 'stupser'], [1, 'brummbass'], [4, 'flitzstoss'], [8, 'pfotenwirbel'], [12, 'frechgrinsen'], [16, 'kieselkick'],
  [20, 'kerbschnitt'], [25, 'kampfjodel'], [30, 'alpenrast'], [36, 'jodelschall'], [44, 'vollkaracho'],
];
const CHAEFERLI_LINE: Learn = [
  [1, 'stupser'], [1, 'brummbass'], [4, 'gifttropfen'], [7, 'zweigschlag'], [11, 'faulhauch'], [16, 'saftzapfen'],
  [21, 'moorgas'], [27, 'aetzschleim'], [33, 'enzianregen'], [40, 'miasma'],
];
const FARNLI_LINE: Learn = [
  [1, 'saftzapfen'], [1, 'frechgrinsen'], [5, 'zweigschlag'], [9, 'mohnduft'], [13, 'schauder'], [18, 'enzianregen'],
  [25, 'sonnenbad'], [31, 'distelhieb'], [38, 'waldeszorn'], [46, 'laerchenfall'],
];
const LAERVLI_LINE: Learn = [
  [1, 'schauder'], [1, 'frechgrinsen'], [6, 'spukgriff'], [10, 'traumbann'], [15, 'seelensog'], [20, 'treichelhall'],
  [26, 'geisterruf'], [32, 'spukkralle'], [39, 'wilde_jagd'], [46, 'albdruck'],
];
const TUEPFLI_LINE: Learn = [
  [1, 'gifttropfen'], [1, 'brummbass'], [5, 'spritzer'], [9, 'nesselstich'], [13, 'faulhauch'], [18, 'kellenschlag'],
  [23, 'moorgas'], [29, 'aetzschleim'], [35, 'wildbach'], [42, 'miasma'],
];
const TAUCHLI_LINE: Learn = [
  [1, 'spritzer'], [1, 'frechgrinsen'], [5, 'bergbrise'], [9, 'kellenschlag'], [13, 'tropfenregen'], [18, 'federhieb'],
  [23, 'wildbach'], [29, 'foehnboee'], [35, 'sichelwind'], [42, 'hochwasser'],
];
const WUEHLI_LINE: Learn = [
  [1, 'kieselkick'], [1, 'brummbass'], [5, 'staubstrudel'], [9, 'pfotenwirbel'], [13, 'kieselstaub'], [18, 'kerbschnitt'],
  [23, 'geroellwalze'], [29, 'felsenhaut'], [35, 'murgang'], [42, 'bergsturz'],
];
const STACHLI_LINE: Learn = [
  [1, 'blechschlag'], [1, 'brummbass'], [5, 'kieselkick'], [9, 'nietensalve'], [13, 'blechpanzer'], [18, 'stahlschnitt'],
  [23, 'quietschen'], [29, 'geroellwalze'], [35, 'erzglanz'], [42, 'ambossfall'],
];
const ZUCKLI_LINE: Learn = [
  [1, 'knistern'], [1, 'frechgrinsen'], [5, 'zuckfunke'], [9, 'summstrom'], [14, 'pfotenwirbel'], [19, 'blitzkralle'],
  [25, 'hochspannung'], [31, 'kugelblitz'], [38, 'bergewitter'], [45, 'starkstrom'],
];
const FLOECKLI_LINE: Learn = [
  [1, 'reifhauch'], [1, 'frechgrinsen'], [5, 'flitzstoss'], [9, 'firnstoss'], [14, 'kaeltestarre'], [19, 'eisnebel'],
  [24, 'frostpranke'], [30, 'kerbschnitt'], [37, 'gletscherwut'], [44, 'eisbruch'],
];
const WYSSLI_LINE: Learn = [
  [1, 'schimmer'], [1, 'blendlicht'], [5, 'saftzapfen'], [10, 'glanzstoss'], [15, 'lichtkur'], [20, 'halokranz'],
  [25, 'regenbogen'], [31, 'lichtklinge'], [38, 'gleisslicht'], [45, 'sonnenhammer'],
];

/**
 * All Wildlinge, in Lexikon order. Base stat totals by stage: first 290–320, middle 400–430,
 * final of a three-stage line 500–535, final of a two-stage line 420–490, single-stage early 280–330 /
 * mid 430–480, legendary 580–600. Two-stage lines evolve while the starters are still in their middle
 * stage, so their finals stay below the starters' finals; wild finals only appear late in the game.
 */
export const SPECIES: SpeciesDef[] = [
  // --- starters ------------------------------------------------------------------------------
  {
    id: 'sproessli', name: 'Sprössli', dexNo: 1, types: ['plant'],
    base: stats(50, 48, 52, 56, 56, 46), baseExp: 64, catchRate: 45, growth: 'medium',
    learnset: learnset(SPROESSLI_LINE), evolves: { to: 'moosdachs', level: 16 },
    dex: { category: 'Spross-Wildling', heightM: 0.4, weightKg: 7.5,
      text: 'Ein Dachsjunges, dem statt Streifen zwei Grashalme über den Kopf wachsen. In der Sonne werden sie länger.' },
  },
  {
    id: 'moosdachs', name: 'Moosdachs', dexNo: 2, types: ['plant'],
    base: stats(66, 64, 70, 76, 74, 64), baseExp: 150, catchRate: 45, growth: 'medium',
    learnset: learnset(SPROESSLI_LINE, [[28, 'geroellwalze']]), evolves: { to: 'dornachs', level: 34 },
    dex: { category: 'Moos-Wildling', heightM: 0.9, weightKg: 24,
      text: 'In seinen Rückenstreifen wächst dichtes Moos. Er gräbt Gänge unter Waldwiesen und lockert so den Boden.' },
  },
  {
    id: 'dornachs', name: 'Dornachs', dexNo: 3, types: ['plant', 'toxic'],
    base: stats(82, 80, 86, 98, 92, 82), baseExp: 250, catchRate: 45, growth: 'medium',
    learnset: learnset(SPROESSLI_LINE, [[28, 'geroellwalze'], [34, 'aetzhieb']]),
    dex: { category: 'Nessel-Wildling', heightM: 1.3, weightKg: 68,
      text: 'Seine Mähne aus Nesseln und Dornen brennt bei Berührung. Er schützt die Wälder vor Eindringlingen.' },
  },
  {
    id: 'zuendli', name: 'Zündli', dexNo: 4, types: ['fire'],
    base: stats(44, 56, 42, 58, 46, 62), baseExp: 64, catchRate: 45, growth: 'medium',
    learnset: learnset(ZUENDLI_LINE), evolves: { to: 'glutbock', level: 16 },
    dex: { category: 'Glutkitz-Wildling', heightM: 0.4, weightKg: 6.2,
      text: 'Ein Steinbockkitz, dessen Hornknospen wie Zündholzköpfe glühen. Stampft es auf, sprühen Funken.' },
  },
  {
    id: 'glutbock', name: 'Glutbock', dexNo: 5, types: ['fire'],
    base: stats(60, 74, 58, 76, 62, 82), baseExp: 150, catchRate: 45, growth: 'medium',
    learnset: learnset(ZUENDLI_LINE, [[22, 'kampfjodel']]), evolves: { to: 'brandhorn', level: 34 },
    dex: { category: 'Kletter-Wildling', heightM: 1.0, weightKg: 38,
      text: 'Seine Hörner glühen wie Kohlen. Er springt über steile Felsen und hinterlässt glimmende Hufspuren.' },
  },
  {
    id: 'brandhorn', name: 'Brandhorn', dexNo: 6, types: ['fire', 'earth'],
    base: stats(80, 102, 80, 92, 72, 96), baseExp: 250, catchRate: 45, growth: 'medium',
    learnset: learnset(ZUENDLI_LINE, [[34, 'geroellwalze']]),
    dex: { category: 'Lavahorn-Wildling', heightM: 1.6, weightKg: 112,
      text: 'Aus den Rissen seiner Felshaut quillt Glut. Ein Stoß seiner Hörner soll ganze Felswände spalten.' },
  },
  {
    id: 'biberli', name: 'Biberli', dexNo: 7, types: ['water'],
    base: stats(52, 52, 56, 48, 52, 46), baseExp: 64, catchRate: 45, growth: 'medium',
    learnset: learnset(BIBERLI_LINE), evolves: { to: 'bachbiber', level: 16 },
    dex: { category: 'Bach-Wildling', heightM: 0.4, weightKg: 8,
      text: 'Es baut kleine Dämme aus Zweigen. Wittert es Gefahr, klatscht sein flacher Schwanz laut aufs Wasser.' },
  },
  {
    id: 'bachbiber', name: 'Bachbiber', dexNo: 8, types: ['water'],
    base: stats(70, 70, 76, 64, 68, 62), baseExp: 150, catchRate: 45, growth: 'medium',
    learnset: learnset(BIBERLI_LINE, BACHBIBER_EXTRA), evolves: { to: 'dammbaron', level: 34 },
    dex: { category: 'Damm-Wildling', heightM: 0.9, weightKg: 29,
      text: 'Mit seinen orangen Nagezähnen fällt es junge Bäume in Minuten. Seine Dämme trotzen jedem Hochwasser.' },
  },
  {
    id: 'dammbaron', name: 'Dammbaron', dexNo: 9, types: ['water', 'metal'],
    base: stats(95, 92, 100, 78, 85, 70), baseExp: 250, catchRate: 45, growth: 'medium',
    learnset: learnset(BIBERLI_LINE, BACHBIBER_EXTRA),
    dex: { category: 'Eisenzahn-Wildling', heightM: 1.5, weightKg: 120,
      text: 'Zähne und Schwanz sind hart wie Stahl. Seine Dämme stauen ganze Seen auf und trotzen jedem Hochwasser.' },
  },

  // --- Pfad 1 / Pfad 2 -----------------------------------------------------------------------
  {
    id: 'zwitschli', name: 'Zwitschli', dexNo: 10, types: ['normal', 'wind'],
    base: stats(45, 52, 42, 42, 42, 72), baseExp: 55, catchRate: 255, growth: 'medium',
    learnset: learnset(ZWITSCHLI_LINE), evolves: { to: 'dohlerich', level: 18 },
    dex: { category: 'Dohlen-Wildling', heightM: 0.3, weightKg: 1.8,
      text: 'Zwitschli folgen Wanderern auf Schritt und Tritt und betteln um Krümel.' },
  },
  {
    id: 'dohlerich', name: 'Dohlerich', dexNo: 11, types: ['normal', 'wind'],
    base: stats(62, 72, 60, 56, 58, 94), baseExp: 145, catchRate: 120, growth: 'medium',
    learnset: learnset(ZWITSCHLI_LINE), evolves: { to: 'sturmdohle', level: 32 },
    dex: { category: 'Bergvogel-Wildling', heightM: 0.7, weightKg: 9.5,
      text: 'Er segelt in Schwärmen um die Gipfel. Mit dem gelben Schnabel knackt er sogar Tannenzapfen.' },
  },
  {
    id: 'sturmdohle', name: 'Sturmdohle', dexNo: 12, types: ['normal', 'wind'],
    base: stats(80, 98, 76, 72, 74, 112), baseExp: 230, catchRate: 45, growth: 'medium',
    learnset: learnset(ZWITSCHLI_LINE, [[32, 'sichelwind']]),
    dex: { category: 'Sturm-Wildling', heightM: 1.4, weightKg: 32,
      text: 'Sie reitet auf Gewitterböen hoch über die Gipfel. Ihr Flügelschwung soll Tannen umknicken.' },
  },
  {
    id: 'munggli', name: 'Munggli', dexNo: 13, types: ['normal'],
    base: stats(52, 54, 46, 34, 42, 66), baseExp: 52, catchRate: 255, growth: 'fast',
    learnset: learnset(MUNGGLI_LINE), evolves: { to: 'pfiffmungg', level: 20 },
    dex: { category: 'Murmel-Wildling', heightM: 0.4, weightKg: 4.5,
      text: 'Munggli sonnen sich auf warmen Steinen. Ertönt ein Pfiff, flitzen alle blitzschnell in den Bau.' },
  },
  {
    id: 'pfiffmungg', name: 'Pfiffmungg', dexNo: 14, types: ['normal'],
    base: stats(74, 80, 62, 44, 60, 100), baseExp: 155, catchRate: 45, growth: 'fast',
    learnset: learnset(MUNGGLI_LINE, [[40, 'alphornruf']]),
    dex: { category: 'Pfeif-Wildling', heightM: 1.0, weightKg: 26,
      text: 'Sein Pfiff ist kilometerweit zu hören. Er wacht über große Kolonien und verteidigt sie mit Wucht.' },
  },
  {
    id: 'chaeferli', name: 'Chäferli', dexNo: 15, types: ['plant', 'toxic'],
    base: stats(46, 44, 56, 50, 54, 40), baseExp: 54, catchRate: 255, growth: 'fast',
    learnset: learnset(CHAEFERLI_LINE), evolves: { to: 'stinkkaefer', level: 16 },
    dex: { category: 'Blattkäfer-Wildling', heightM: 0.2, weightKg: 1.2,
      text: 'Es versteckt sich unter Blättern und frisst sich durch Wiesen. Bei Gefahr riecht es sehr bitter.' },
  },
  {
    id: 'stinkkaefer', name: 'Stinkkäfer', dexNo: 16, types: ['plant', 'toxic'],
    base: stats(66, 58, 84, 78, 80, 54), baseExp: 150, catchRate: 45, growth: 'fast',
    learnset: learnset(CHAEFERLI_LINE, [[18, 'blechpanzer'], [36, 'aetzhieb']]),
    dex: { category: 'Stink-Wildling', heightM: 0.9, weightKg: 22,
      text: 'Sein Panzer glänzt wie ein Blatt im Tau. Wer ihn ärgert, wird von übel riechendem Dunst vertrieben.' },
  },
  {
    id: 'schneggli', name: 'Schneggli', dexNo: 17, types: ['normal'],
    base: stats(60, 40, 78, 42, 66, 20), baseExp: 60, catchRate: 200, growth: 'fast',
    learnset: learnset([
      [1, 'stupser'], [1, 'felsenhaut'], [6, 'kieselkick'], [10, 'saftzapfen'], [15, 'brummbass'], [20, 'jodelschall'],
      [25, 'alpenrast'], [30, 'geroellwalze'], [36, 'bergsturz'], [43, 'vollkaracho'],
    ]),
    dex: { category: 'Hüsli-Wildling', heightM: 0.3, weightKg: 3,
      text: 'Es trägt ein winziges Holzhaus als Schneckenhaus. Bei Regen schaut es neugierig aus dem Fensterchen.' },
  },

  // --- Flüsterwald ---------------------------------------------------------------------------
  {
    id: 'farnli', name: 'Farnli', dexNo: 18, types: ['plant'],
    base: stats(48, 50, 46, 58, 52, 56), baseExp: 58, catchRate: 220, growth: 'medium',
    learnset: learnset(FARNLI_LINE), evolves: { to: 'farnwicht', level: 22 },
    dex: { category: 'Farn-Wildling', heightM: 0.3, weightKg: 2.1,
      text: 'Nachts rollen sich Farnli wie junge Farnwedel zusammen. Im Flüsterwald hört man sie leise rascheln.' },
  },
  {
    id: 'farnwicht', name: 'Farnwicht', dexNo: 19, types: ['plant', 'spirit'],
    base: stats(64, 68, 64, 94, 78, 87), baseExp: 170, catchRate: 45, growth: 'medium',
    learnset: learnset(FARNLI_LINE, [[22, 'geisterruf'], [34, 'traumbann']]),
    dex: { category: 'Waldgeist-Wildling', heightM: 1.2, weightKg: 14,
      text: 'Er huscht lautlos zwischen alten Tannen umher. Verirrte Wanderer führt er manchmal zurück zum Weg.' },
  },
  {
    id: 'laervli', name: 'Lärvli', dexNo: 20, types: ['spirit'],
    base: stats(40, 46, 48, 66, 58, 52), baseExp: 60, catchRate: 190, growth: 'medium',
    learnset: learnset(LAERVLI_LINE), evolves: { to: 'fratzgeist', level: 25 },
    dex: { category: 'Masken-Wildling', heightM: 0.4, weightKg: 1.5,
      text: 'Eine geschnitzte Holzmaske, in der ein Geist wohnt. Nachts schwebt sie klappernd durch den Wald.' },
  },
  {
    id: 'fratzgeist', name: 'Fratzgeist', dexNo: 21, types: ['spirit'],
    base: stats(60, 68, 74, 100, 84, 79), baseExp: 175, catchRate: 45, growth: 'medium',
    learnset: learnset(LAERVLI_LINE, [[35, 'brandmal']]),
    dex: { category: 'Fasnachts-Wildling', heightM: 1.7, weightKg: 40,
      text: 'Behängt mit Fell und Glocken zieht er durch dunkle Täler. Sein Gebimmel soll den Winter vertreiben.' },
  },
  {
    id: 'tuepfli', name: 'Tüpfli', dexNo: 22, types: ['toxic'],
    base: stats(54, 50, 50, 52, 54, 40), baseExp: 56, catchRate: 220, growth: 'medium',
    learnset: learnset(TUEPFLI_LINE), evolves: { to: 'moormolch', level: 24 },
    dex: { category: 'Tupf-Wildling', heightM: 0.2, weightKg: 0.8,
      text: 'Seine gelben Tupfen warnen Fressfeinde. Es lebt unter feuchtem Laub und kommt nur bei Regen hervor.' },
  },
  {
    id: 'moormolch', name: 'Moormolch', dexNo: 23, types: ['toxic', 'water'],
    base: stats(88, 74, 76, 80, 82, 60), baseExp: 170, catchRate: 45, growth: 'medium',
    learnset: learnset(TUEPFLI_LINE, [[24, 'aetzhieb'], [48, 'moderschlag']]),
    dex: { category: 'Moor-Wildling', heightM: 1.1, weightKg: 30,
      text: 'Es lauert in Mooren und Tümpeln. Aus seiner Haut sickert ein Gift, das das Wasser violett färbt.' },
  },

  // --- Seewil / Pfad 3 -----------------------------------------------------------------------
  {
    id: 'tauchli', name: 'Tauchli', dexNo: 24, types: ['water'],
    base: stats(48, 44, 44, 56, 52, 58), baseExp: 56, catchRate: 220, growth: 'medium',
    learnset: learnset(TAUCHLI_LINE), evolves: { to: 'seefuerst', level: 26 },
    dex: { category: 'Taucher-Wildling', heightM: 0.3, weightKg: 1.1,
      text: 'Tauchli reiten auf dem Rücken ihrer Eltern über den See. Schon früh tauchen sie nach Fischchen.' },
  },
  {
    id: 'seefuerst', name: 'Seefürst', dexNo: 25, types: ['water', 'wind'],
    base: stats(70, 62, 64, 96, 82, 91), baseExp: 175, catchRate: 45, growth: 'medium',
    learnset: learnset(TAUCHLI_LINE, [[26, 'alpenrast'], [47, 'foehnsturm']]),
    dex: { category: 'Schopf-Wildling', heightM: 1.2, weightKg: 18,
      text: 'Mit prächtigem Federschopf tanzt er über das Wasser. Seine Balztänze auf dem See sind berühmt.' },
  },

  // --- Glimmerhöhle --------------------------------------------------------------------------
  {
    id: 'wuehli', name: 'Wühli', dexNo: 26, types: ['earth'],
    base: stats(50, 64, 60, 30, 42, 50), baseExp: 58, catchRate: 220, growth: 'medium',
    learnset: learnset(WUEHLI_LINE), evolves: { to: 'erdwuehler', level: 24 },
    dex: { category: 'Maulwurf-Wildling', heightM: 0.3, weightKg: 2.5,
      text: 'Mit seiner rosa Sternnase ertastet Wühli Würmer im Dunkeln. In einer Nacht gräbt es einen ganzen Acker um.' },
  },
  {
    id: 'erdwuehler', name: 'Erdwühler', dexNo: 27, types: ['earth'],
    base: stats(80, 108, 90, 44, 64, 74), baseExp: 170, catchRate: 45, growth: 'medium',
    learnset: learnset(WUEHLI_LINE, [[24, 'stahlschnitt'], [48, 'vollkaracho']]),
    dex: { category: 'Gruben-Wildling', heightM: 1.1, weightKg: 55,
      text: 'Mit riesigen Grabkrallen pflügt er durch Fels wie durch Butter. Er gräbt endlose Gänge.' },
  },
  {
    id: 'stachli', name: 'Stachli', dexNo: 28, types: ['metal'],
    base: stats(46, 52, 70, 40, 56, 36), baseExp: 60, catchRate: 200, growth: 'medium',
    learnset: learnset(STACHLI_LINE), evolves: { to: 'erzborst', level: 27 },
    dex: { category: 'Eisenstachel-Wildling', heightM: 0.3, weightKg: 8,
      text: 'Es leckt Eisen aus Erzadern und härtet so seine Stacheln. Bei Gefahr wird es zur klirrenden Kugel.' },
  },
  {
    id: 'erzborst', name: 'Erzborst', dexNo: 29, types: ['metal', 'earth'],
    base: stats(70, 90, 112, 60, 86, 52), baseExp: 175, catchRate: 45, growth: 'medium',
    learnset: learnset(STACHLI_LINE, [[27, 'murgang'], [47, 'bergsturz']]),
    dex: { category: 'Erz-Wildling', heightM: 0.9, weightKg: 85,
      text: 'Seine Stahlstacheln sind scharf wie Nägel. In alten Stollen sammelt er Erz für neue Stacheln.' },
  },
  {
    id: 'bergmaennli', name: 'Bergmännli', dexNo: 30, types: ['spirit', 'earth'],
    base: stats(66, 78, 82, 80, 78, 56), baseExp: 160, catchRate: 120, growth: 'medium',
    learnset: learnset([
      [1, 'spukgriff'], [1, 'kieselstaub'], [6, 'schauder'], [11, 'kieselkick'], [16, 'traumbann'], [21, 'geroellwalze'],
      [26, 'spukkralle'], [31, 'felsenhaut'], [37, 'albdruck'], [44, 'bergsturz'],
    ]),
    dex: { category: 'Stollen-Wildling', heightM: 0.6, weightKg: 6,
      text: 'Ein Geist, der verirrten Bergleuten heimleuchtet. Sein Kristalllicht flackert, wenn Steinschlag droht.' },
  },

  // --- Funkenstadt / Pfad 4 ------------------------------------------------------------------
  {
    id: 'zuckli', name: 'Zuckli', dexNo: 31, types: ['spark'],
    base: stats(40, 52, 38, 60, 42, 78), baseExp: 62, catchRate: 200, growth: 'medium',
    learnset: learnset(ZUCKLI_LINE), evolves: { to: 'zuckwiesel', level: 18 },
    dex: { category: 'Zuck-Wildling', heightM: 0.3, weightKg: 1.4,
      text: 'Erschrickt Zuckli, sträubt sich sein Fell und knistert. Nachts leuchten seine Funken wie Glühwürmchen.' },
  },
  {
    id: 'zuckwiesel', name: 'Zuckwiesel', dexNo: 32, types: ['spark'],
    base: stats(56, 72, 54, 82, 58, 100), baseExp: 155, catchRate: 120, growth: 'medium',
    learnset: learnset(ZUCKLI_LINE, [[22, 'kerbschnitt']]), evolves: { to: 'voltmarder', level: 32 },
    dex: { category: 'Wiesel-Wildling', heightM: 0.8, weightKg: 9,
      text: 'Es flitzt so schnell durch Wiesen, dass ein Funkenschweif zurückbleibt. Es lädt sich an Leitungen auf.' },
  },
  {
    id: 'voltmarder', name: 'Voltmarder', dexNo: 33, types: ['spark'],
    base: stats(70, 86, 66, 108, 74, 116), baseExp: 250, catchRate: 45, growth: 'medium',
    learnset: learnset(ZUCKLI_LINE, [[22, 'kerbschnitt'], [33, 'foehnboee']]),
    dex: { category: 'Gewitter-Wildling', heightM: 1.3, weightKg: 32,
      text: 'Bei Gewitter jagt er über die Kämme und zieht Blitze an. Sein Fell steht dann unter Hochspannung.' },
  },
  {
    id: 'gondeli', name: 'Gondeli', dexNo: 34, types: ['spark', 'metal'],
    base: stats(64, 60, 92, 96, 80, 58), baseExp: 165, catchRate: 100, growth: 'medium',
    learnset: learnset([
      [1, 'knistern'], [1, 'blechschlag'], [6, 'summstrom'], [11, 'treichelhall'], [16, 'blechpanzer'],
      [21, 'kugelblitz'], [26, 'erzglanz'], [32, 'hochspannung'], [38, 'bergewitter'], [45, 'ambossfall'],
    ]),
    dex: { category: 'Seilbahn-Wildling', heightM: 0.9, weightKg: 60,
      text: 'Es gleitet an selbst gesponnenen Stromseilen über Schluchten. In Funkenstadt fährt es Kinder zur Schule.' },
  },
  {
    id: 'guggerli', name: 'Guggerli', dexNo: 35, types: ['metal', 'wind'],
    base: stats(60, 82, 74, 70, 72, 102), baseExp: 170, catchRate: 100, growth: 'medium',
    learnset: learnset([
      [1, 'blechschlag'], [1, 'frechgrinsen'], [5, 'bergbrise'], [10, 'flitzstoss'], [15, 'jodelschall'],
      [20, 'stahlschnitt'], [25, 'steilflug'], [30, 'quietschen'], [36, 'sichelwind'], [43, 'ambossfall'],
      [50, 'gipfelsturz'],
    ]),
    dex: { category: 'Uhrwerk-Wildling', heightM: 0.5, weightKg: 4,
      text: 'Es ruft zu jeder vollen Stunde. Die Uhrmacher von Funkenstadt stellen ihre Uhren nach seinem Ruf.' },
  },

  // --- Frostalp / Gipfelpfad -----------------------------------------------------------------
  {
    id: 'floeckli', name: 'Flöckli', dexNo: 36, types: ['frost'],
    base: stats(46, 54, 44, 56, 50, 64), baseExp: 62, catchRate: 200, growth: 'medium',
    learnset: learnset(FLOECKLI_LINE), evolves: { to: 'firnhase', level: 30 },
    dex: { category: 'Schneehasen-Wildling', heightM: 0.4, weightKg: 2.8,
      text: 'Im Winter wird sein Fell schneeweiß. Es hüpft so leicht, dass es im Pulverschnee kaum Spuren hinterlässt.' },
  },
  {
    id: 'firnhase', name: 'Firnhase', dexNo: 37, types: ['frost'],
    base: stats(70, 90, 66, 84, 70, 100), baseExp: 180, catchRate: 45, growth: 'medium',
    learnset: learnset(FLOECKLI_LINE, [[32, 'foehnboee'], [48, 'vollkaracho']]),
    dex: { category: 'Firn-Wildling', heightM: 1.1, weightKg: 22,
      text: 'Mit eisigen Läufen rast er über Gletscher. Wo er bremst, wirbeln Wolken aus Eiskristallen auf.' },
  },
  {
    id: 'steimandli', name: 'Steimandli', dexNo: 38, types: ['earth'],
    base: stats(70, 90, 120, 50, 70, 40), baseExp: 165, catchRate: 120, growth: 'medium',
    learnset: learnset([
      [1, 'kieselkick'], [1, 'felsenhaut'], [6, 'stupser'], [11, 'kieselstaub'], [16, 'staubstrudel'],
      [21, 'geroellwalze'], [27, 'murgang'], [33, 'firnstoss'], [39, 'bergsturz'], [46, 'vollkaracho'],
    ]),
    dex: { category: 'Wegweiser-Wildling', heightM: 1.2, weightKg: 140,
      text: 'Es steht reglos an Bergpfaden und weist Wanderern den Weg. Erst wenn es sich bewegt, merkt man, dass es lebt.' },
  },
  {
    id: 'foehngeier', name: 'Föhngeier', dexNo: 39, types: ['wind', 'earth'],
    base: stats(80, 96, 72, 62, 74, 88), baseExp: 175, catchRate: 90, growth: 'medium',
    learnset: learnset([
      [1, 'federhieb'], [1, 'frechgrinsen'], [6, 'kieselkick'], [11, 'bergbrise'], [16, 'foehnboee'],
      [21, 'steilflug'], [27, 'geroellwalze'], [33, 'kerbschnitt'], [39, 'foehnsturm'], [46, 'gipfelsturz'],
    ]),
    dex: { category: 'Bartgeier-Wildling', heightM: 1.6, weightKg: 34,
      text: 'Er reitet auf warmen Föhnwinden. Knochen lässt er aus großer Höhe auf Felsen fallen, um sie zu knacken.' },
  },
  {
    id: 'bernhardin', name: 'Bernhardin', dexNo: 40, types: ['frost', 'normal'],
    base: stats(110, 88, 76, 58, 76, 60), baseExp: 170, catchRate: 90, growth: 'medium',
    learnset: learnset([
      [1, 'stupser'], [1, 'brummbass'], [6, 'reifhauch'], [11, 'firnstoss'], [16, 'jodelschall'],
      [21, 'frostpranke'], [26, 'alpenrast'], [32, 'eisnebel'], [38, 'eisbruch'], [45, 'vollkaracho'],
    ]),
    dex: { category: 'Rettungs-Wildling', heightM: 1.0, weightKg: 78,
      text: 'Er spürt Verschüttete unter meterhohem Schnee auf. Am Hals trägt er ein Fässchen mit warmem Tee.' },
  },

  // --- late rares ----------------------------------------------------------------------------
  {
    id: 'wyssli', name: 'Wyssli', dexNo: 41, types: ['light'],
    base: stats(48, 36, 50, 68, 62, 52), baseExp: 68, catchRate: 190, growth: 'slow',
    learnset: learnset(WYSSLI_LINE), evolves: { to: 'edelwyss', level: 33 },
    dex: { category: 'Edelweiß-Wildling', heightM: 0.2, weightKg: 0.4,
      text: 'Wyssli wachsen an steilen Felsen nahe dem Gipfel. Ihre weißen Blütensterne leuchten in Mondnächten.' },
  },
  {
    id: 'edelwyss', name: 'Edelwyss', dexNo: 42, types: ['light', 'plant'],
    base: stats(72, 54, 78, 108, 100, 78), baseExp: 190, catchRate: 45, growth: 'slow',
    learnset: learnset(WYSSLI_LINE, [[33, 'enzianregen'], [41, 'waldeszorn']]),
    dex: { category: 'Sternblüten-Wildling', heightM: 0.8, weightKg: 6.5,
      text: 'Es gleitet auf warmen Aufwinden über Felswände. Sein sanftes Licht führt Verirrte sicher heim.' },
  },
  {
    id: 'firngeist', name: 'Firngeist', dexNo: 43, types: ['spirit', 'frost'],
    base: stats(66, 64, 70, 106, 84, 90), baseExp: 180, catchRate: 90, growth: 'slow',
    learnset: learnset([
      [1, 'schauder'], [1, 'reifhauch'], [6, 'kaeltestarre'], [11, 'spukgriff'], [16, 'traumbann'],
      [21, 'eisnebel'], [27, 'seelensog'], [33, 'geisterruf'], [40, 'gletscherwut'], [47, 'wilde_jagd'],
    ]),
    dex: { category: 'Nebel-Wildling', heightM: 1.5, weightKg: 0.1,
      text: 'Er erscheint in eisigen Nebelnächten am Gletscher. Wer ihm begegnet, spürt einen kalten Hauch im Nacken.' },
  },

  // --- legendary -----------------------------------------------------------------------------
  {
    id: 'lindglut', name: 'Lindglut', dexNo: 44, types: ['fire', 'light'],
    base: stats(100, 100, 90, 118, 94, 92), baseExp: 300, catchRate: 8, growth: 'slow',
    learnset: learnset([
      [1, 'flaemmchen'], [1, 'schimmer'], [8, 'brandmal'], [15, 'fackelzug'], [22, 'regenbogen'],
      [29, 'halokranz'], [35, 'hoehenfeuer'], [40, 'alpengluehen'], [45, 'lichtkur'], [50, 'gleisslicht'],
      [55, 'glutansturm'],
    ]),
    dex: { category: 'Alpenglut-Wildling', heightM: 4.2, weightKg: 260,
      text: 'Der Wächter der Alpenglut auf dem Gipfelhorn. Sein Atem färbt die Berge bei Sonnenuntergang rotgolden.' },
  },
];
