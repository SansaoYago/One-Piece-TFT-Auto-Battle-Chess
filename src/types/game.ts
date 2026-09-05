export type DamageType = 'PHYSICAL' | 'MAGICAL' | 'TRUE_HAKI';

export type GamePhase = 'PREPARATION' | 'COMBAT' | 'RESOLUTION';

export type ChampionTier = 1 | 2 | 3 | 4 | 5;

export type StarLevel = 1 | 2 | 3;

export type TraitId =
  | 'brigao'
  | 'espadachim'
  | 'paramecia'
  | 'logia'
  | 'zoan'
  | 'marinha'
  | 'shichibukai'
  | 'ladrao'
  | 'medroso'
  | 'crush'
  | 'haki';

export interface SkillInfo {
  id: string;
  name: string;
  type: 'ACTIVE' | 'PASSIVE' | 'SPECIAL';
  damageType: DamageType;
  description: string;
  manaCost: number;
  icon?: string;
}

export interface UnitVisualAssets {
  portrait?: string; // Retrato/busto para loja, banco, inspetor, DPS e sinergias
  battleSprite?: string; // Sprite/corpo inteiro para o tabuleiro de combate
  draggingSprite?: string; // Sprite flutuante para quando estiver segurando/arrastando
}

export interface UnitBaseData {
  id: string;
  name: string;
  title: string;
  cost: number;
  tier: ChampionTier;
  traits: TraitId[];
  range: number; // 1 = melee, 2-4 = ranged
  attackType: DamageType;
  baseHp: number;
  baseMana: number;
  startMana: number;
  baseArmor: number;
  baseMr: number;
  baseAd: number;
  baseAp: number;
  attackSpeed: number; // attacks per second
  avatarUrl: string; // Emoji fallback or direct image
  visualAssets?: UnitVisualAssets;
  color: string;
  accentColor: string;
  skillA: SkillInfo;
  skillB: SkillInfo;
  skillSpecial: SkillInfo; // Skill C (requires Orbe do Despertar)
  isEnemy?: boolean;
}

export interface UnitInstance {
  instanceId: string;
  unitId: string;
  name: string;
  title: string;
  cost: number;
  tier: ChampionTier;
  stars: StarLevel;
  traits: TraitId[];
  range: number;
  attackType: DamageType;
  
  // Current combat stats
  hp: number;
  maxHp: number;
  shield: number;
  mana: number;
  maxMana: number;
  orbMana?: number;
  maxOrbMana?: number;
  armor: number;
  mr: number;
  ad: number;
  ap: number;
  attackSpeed: number;
  
  activeSkill: 'SKILL_A' | 'SKILL_B';
  hasSpecialItem: boolean;
  
  avatarUrl: string;
  visualAssets?: UnitVisualAssets;
  color: string;
  accentColor: string;
  
  // Grid coordinates (0..7, 0..5) or bench index (-1 if on bench)
  gridX: number; // 0..7
  gridY: number; // 0..5 (0..2 enemy, 3..5 player)
  benchIndex: number | null; // 0..7 if on bench
  
  isEnemy: boolean;
  items: string[]; // item IDs
  
  // Damage metrics (for DPS meter)
  totalPhysicalDamage: number;
  totalMagicalDamage: number;
  totalTrueDamage: number;
  totalDamageBlocked: number;
  totalHealing: number;
}

export interface BoardTile {
  x: number; // 0..7
  y: number; // 0..5
  isPlayerTerritory: boolean; // y >= 3
}

export interface ItemData {
  id: string;
  name: string;
  icon: string;
  description: string;
  isSpecialActivation?: boolean;
  grantTrait?: TraitId;
  applicableTraits?: TraitId[];
}

export interface Commander {
  id: string;
  name: string;
  avatar: string;
  title: string;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  gold: number;
  winStreak: number;
  lossStreak: number;
  isHuman: boolean;
  rank: number;
  isEliminated: boolean;
  roundCombatStatus?: 'FIGHTING' | 'WON' | 'LOST' | 'DRAW';
  damageTakenThisRound?: number;
}

export interface SynergyTier {
  count: number;
  description: string;
}

export interface SynergyDef {
  id: TraitId;
  name: string;
  icon: string;
  color: string;
  description: string;
  tiers: SynergyTier[];
}

export interface ActiveSynergy {
  trait: SynergyDef;
  count: number;
  activeTierIndex: number; // -1 if no tier met
  units: string[]; // unit instance IDs
}
