/** The four Abzeichen in story order (index 0..3 = badge icon: earth, water, spark, frost). */
export interface BadgeDef {
  /** Stored in SaveData.badges. */
  id: string;
  /** German name, used as ctx.giveBadge(id, name). */
  name: string;
  /** Trainer id of the Hüter/Hüterin. */
  leader: string;
  /** Map id of the town with the Halle. */
  town: string;
}

export const BADGES: BadgeDef[] = [
  { id: 'badge_earth', name: 'Felsabzeichen', leader: 'leader_jost', town: 'kieselstadt' },
  { id: 'badge_water', name: 'Wellenabzeichen', leader: 'leader_undine', town: 'seewil' },
  { id: 'badge_spark', name: 'Funkenabzeichen', leader: 'leader_zita', town: 'funkenstadt' },
  { id: 'badge_frost', name: 'Firnabzeichen', leader: 'leader_firna', town: 'frostalp' },
];
