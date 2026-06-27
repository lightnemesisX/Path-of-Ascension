export type Background = 'orphan' | 'merchant' | 'noble' | 'doctor';
export type Gender = 'male' | 'female' | 'other';
export type SectId = 'azure_sky' | 'iron_blood' | 'jade_lotus' | 'shadow_veil' | 'crimson_flame' | 'wandering_blade' | 'rogue';
export type Stage = 'Early' | 'Mid' | 'Late';
export type RealmName = 'Mortal' | 'Qi Condensation' | 'Foundation Building' | 'Core Formation' | 'Nascent Soul' | 'Soul Transformation' | 'Void Refinement' | 'Body Integration' | 'Mahayana' | 'Tribulation Transcendence' | 'True Immortal' | '???';
export type ItemType = 'weapon' | 'armor' | 'pill' | 'material' | 'technique' | 'misc';
export type ItemQuality = 'Common' | 'Uncommon' | 'Rare' | 'Legendary' | 'Divine';
export type NpcRole = 'ally' | 'rival' | 'master' | 'disciple' | 'lover' | 'none';
export type NpcPersonality = 'friendly' | 'cold' | 'arrogant' | 'mysterious' | 'loyal' | 'deceitful';
export type NpcType = 'sect_elder' | 'senior_disciple' | 'disciple' | 'wanderer' | 'bandit' | 'merchant' | 'hermit';
export type LogType = 'action' | 'event' | 'realm' | 'death' | 'victory' | 'system' | 'tutorial' | 'combat' | 'craft' | 'system_msg';
export type MissionType = 'train' | 'socialize' | 'explore' | 'fight' | 'craft' | 'study' | 'meditate' | 'rest';

export interface Stats {
  qi: number;
  strength: number;
  intelligence: number;
  luck: number;
  reputation: number;
  wisdom: number;
  charm: number;
  smithing: number;
  alchemy: number;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  quality: ItemQuality;
  description: string;
  statBonus?: Partial<Stats>;
  effect?: string;
  quantity?: number;
}

export interface NpcMemory {
  hasFought: boolean;
  fightResult?: 'won' | 'lost';
  giftsReceived: string[];
  timesInsulted: number;
  timesHelped: number;
  lastInteraction?: string;
}

export interface NPC {
  id: string;
  name: string;
  gender: Gender;
  personality: NpcPersonality;
  npcType: NpcType;
  realmIdx: number;
  stage: Stage;
  relationship: number; // -100 to 100
  role: NpcRole;
  loyalty: number; // 0-100
  teachings: string[];
  hasBetrayed: boolean;
  alive: boolean;
  bio: string;
  memory: NpcMemory;
  loot: string[]; // Items they drop when killed
  hostile: boolean; // If true, reduced moral penalty for killing
}

export type MissionDifficulty = 'easy' | 'medium' | 'hard';

export interface Mission {
  id: string;
  description: string;
  target: number;
  progress: number;
  reward: number; // system points
  type: MissionType;
  difficulty: MissionDifficulty;
  deadlineYear: number; // year when mission expires
  completed: boolean;
  claimed: boolean;
  expired: boolean;
}

export interface LogEntry {
  year: number;
  age: number;
  text: string;
  type: LogType;
}

export interface GameState {
  phase: 'menu' | 'creation' | 'tutorial' | 'playing' | 'gameover' | 'victory' | 'reincarnate';
  // Character
  playerName: string;
  gender: Gender;
  background: Background;
  sectId: SectId;
  // Stats
  stats: Stats;
  year: number;
  age: number;
  realmIdx: number;
  stage: Stage;
  alignment: number;
  actionsThisYear: number;
  log: LogEntry[];
  alive: boolean;
  maxHp: number;
  hp: number;
  // Progress
  artifacts: string[];
  rivals: string[];
  techniques: string[];
  activeTechnique: string | null; // name of currently equipped technique
  // System
  systemPoints: number;
  missions: Mission[];
  systemMessages: string[];
  totalMilestones: number;
  // Social
  npcs: NPC[];
  // Inventory
  inventory: Item[];
  equippedWeapon: string | null;
  equippedArmor: string | null;
  // Crafting
  herbs: number;
  ores: number;
  // Reincarnation
  reincarnationCount: number;
  pastLifeEchoes: number;
  keptTechniques: string[];
  keptWisdom: number;
  tribulationsSurvived: number;
  // Flags
  pendingEvent: string | null;
  tutorialCompleted: boolean;
  // Settings
  showAnimations: boolean;
  maxLogSize: number;
  // Combat
  tamedBeast: TamedBeast | null;
  // Family
  partner: FamilyPartner | null;
  children: FamilyChild[];
  griefYearsLeft: number;
  pastLifeChildren: string[];
  // Lifespan
  maxLifespan: number;
  lifespanBonus: number; // Extra years from pills, events, partner
  // Sect Raid
  lastRaidYear: number;
  captured: CapturedState | null;
  sectDestroyed: boolean;
  sectFounder: boolean;
  huntedBySect: string | null;
  huntedYearsLeft: number;
  rescueMissionActive: boolean;
}

// ─── SECT RAID SYSTEM ─────────────────────────────────────────────
export type RaidPhase = 'announcement' | 'choice' | 'battle_result' | 'surrender_assess' | 'captured' | 'escape_attempt' | 'aftermath';

export interface RaidState {
  phase: RaidPhase;
  raiderName: string;
  raiderTier: number;
  raiderStrength: number;
  playerSectStrength: number;
  log: string[];
  familyCaptured: boolean;
  outcome?: 'defend_win' | 'defend_lose' | 'fled' | 'surrendered' | 'captured' | 'joined_raider' | 'servant';
}

export interface CapturedState {
  bySect: string;
  yearsRemaining: number;
  yearsCaptured: number;
}

// ─── FAMILY SYSTEM ────────────────────────────────────────────────
export type ChildStage = 'infant' | 'child' | 'teen' | 'adult';

export interface FamilyPartner {
  npcId: string;
  name: string;
  gender: Gender;
  personality: NpcPersonality;
  realmIdx: number;
  stage: Stage;
  yearMarried: number;
  alive: boolean;
  causeOfDeath?: string;
}

export interface FamilyChild {
  id: string;
  name: string;
  gender: Gender;
  birthYear: number;
  age: number;
  childStage: ChildStage;
  personality: NpcPersonality;
  realmIdx: number;
  stage: Stage;
  inheritedStrength: number;
  inheritedQi: number;
  alive: boolean;
  causeOfDeath?: string;
  becameNpc: boolean; // true once converted to world NPC at age 18
}

// ─── COMBAT SYSTEM TYPES ──────────────────────────────────────────
export type EnemyKind = 'bandit' | 'assassin' | 'rogue_cultivator' | 'beast' | 'boss';

export interface CombatEnemy {
  id: string;
  name: string;
  kind: EnemyKind;
  icon: string;
  description: string;
  realmIdx: number;
  stage: Stage;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  isBeast: boolean;
  loot: string[];
  specialAbility: string;
  npcId?: string; // if this enemy corresponds to an NPC
}

export interface BattleLogEntry {
  text: string;
  actor: 'player' | 'enemy' | 'system';
}

export type BattlePhase = 'encounter' | 'player_turn' | 'enemy_turn' | 'victory' | 'defeat' | 'stalemate' | 'tame_prompt' | 'fled';

export interface BattleState {
  phase: BattlePhase;
  enemy: CombatEnemy;
  playerHp: number;
  playerMaxHp: number;
  playerQi: number;
  playerMaxQi: number;
  turn: number; // current round (1-3)
  maxTurns: number;
  log: BattleLogEntry[];
  lootGained: string[];
  statRewards: Partial<Stats>;
  spReward: number;
  playerStunned: boolean;
  enemyStunned: boolean;
  poisonDamage: number; // per-turn poison on player
}

export type BeastBuff = 'luck_ambush' | 'damage_reduce' | 'paralyze' | 'poison_attack' | 'retreat_boost' | 'qi_boost' | 'random_buff';

export interface TamedBeast {
  name: string;
  icon: string;
  beastType: string; // Spirit Fox, Stone Tortoise, etc.
  buffType: BeastBuff;
  buffLabel: string;
  attackBonus: number;
  defenseBonus: number;
}

// ─── TRIBULATION SYSTEM ───────────────────────────────────────────
export type TribulationAction = 'endure' | 'deflect' | 'absorb';

export interface TribulationWave {
  number: number;
  baseDamage: number;
  description: string;
}

export type TribulationPhase = 'warning' | 'wave' | 'between_waves' | 'success' | 'failure';

export interface TribulationState {
  phase: TribulationPhase;
  targetRealmIdx: number;
  targetStage: string;
  currentWave: number;
  totalWaves: number;
  waves: TribulationWave[];
  playerHp: number;
  playerMaxHp: number;
  playerQi: number;
  playerMaxQi: number;
  resistanceBuilt: number;
  log: string[];
  statBonuses: Partial<Record<string, number>>;
  hasHeavenBead: boolean;
  wisdomBonus: number;
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  choices: EventChoice[];
}

export interface EventChoice {
  text: string;
  outcome: () => EventOutcome;
}

export interface EventOutcome {
  text: string;
  statChanges: Partial<Stats>;
  alignmentChange: number;
  hpChange: number;
  special?: string;
}

export interface BeastDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  baseHealth: number;
  baseAttack: number;
  baseDefense: number;
  behavior: 'fast' | 'tank' | 'aggressive' | 'poison' | 'flying' | 'boss' | 'corrupted' | 'normal';
  specialAbility: string;
  drops: string[];
  minRealm: number;
}
