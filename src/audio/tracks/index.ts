/** Registry of all music tracks and jingles. One file per id; every file has `export default track`. */
import type { JingleId, MusicId } from '../../core/types';
import type { TrackDef } from '../mml';
import mTitle from './music-title';
import mIntro from './music-intro';
import mHome from './music-home';
import mTown from './music-town';
import mCity from './music-city';
import mRoute from './music-route';
import mRouteMountain from './music-route_mountain';
import mForest from './music-forest';
import mCave from './music-cave';
import mLab from './music-lab';
import mCenter from './music-center';
import mHall from './music-hall';
import mVillain from './music-villain';
import mRival from './music-rival';
import mBattleWild from './music-battle_wild';
import mBattleTrainer from './music-battle_trainer';
import mBattleLeader from './music-battle_leader';
import mBattleRival from './music-battle_rival';
import mBattleBoss from './music-battle_boss';
import mBattleLegend from './music-battle_legend';
import mVictoryWild from './music-victory_wild';
import mVictoryTrainer from './music-victory_trainer';
import mVictoryLeader from './music-victory_leader';
import mSummit from './music-summit';
import mCredits from './music-credits';
import mEvolution from './music-evolution';
import jHeal from './jingle-heal';
import jLevelUp from './jingle-level_up';
import jCaught from './jingle-caught';
import jBadge from './jingle-badge';
import jItem from './jingle-item';
import jEvolved from './jingle-evolved';
import jFanfare from './jingle-fanfare';

export const MUSIC: Record<MusicId, TrackDef> = {
  title: mTitle,
  intro: mIntro,
  home: mHome,
  town: mTown,
  city: mCity,
  route: mRoute,
  route_mountain: mRouteMountain,
  forest: mForest,
  cave: mCave,
  lab: mLab,
  center: mCenter,
  hall: mHall,
  villain: mVillain,
  rival: mRival,
  battle_wild: mBattleWild,
  battle_trainer: mBattleTrainer,
  battle_leader: mBattleLeader,
  battle_rival: mBattleRival,
  battle_boss: mBattleBoss,
  battle_legend: mBattleLegend,
  victory_wild: mVictoryWild,
  victory_trainer: mVictoryTrainer,
  victory_leader: mVictoryLeader,
  summit: mSummit,
  credits: mCredits,
  evolution: mEvolution,
};

export const JINGLES: Record<JingleId, TrackDef> = {
  heal: jHeal,
  level_up: jLevelUp,
  caught: jCaught,
  badge: jBadge,
  item: jItem,
  evolved: jEvolved,
  fanfare: jFanfare,
};
