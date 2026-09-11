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
  height?: number; // Altura canônica oficial em metros (ex: Chopper: 1.0, Luffy: 1.74, Smoker: 2.09)
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
  height?: number;
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

export type GameDifficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  id: GameDifficulty;
  name: string;
  badge: string;
  tag: string;
  color: string;
  borderColor: string;
  bgColor: string;
  description: string;
  baseIncome: number;
  initialGold: number;
  winBonus: number;
  xpPerRound: number;
  enemyHpMultiplier: number;
  enemyAdMultiplier: number;
  playerLossDamageMultiplier: number;
  summary: string;
}

export const DIFFICULTY_CONFIGS: Record<GameDifficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    name: 'Fácil',
    badge: 'FÁCIL',
    tag: 'Recreativo & Fartura',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/50',
    bgColor: 'bg-emerald-950/60',
    description: 'Mais recursos para montar seu time dos sonhos com calma.',
    baseIncome: 8,
    initialGold: 6,
    winBonus: 2,
    xpPerRound: 2,
    enemyHpMultiplier: 0.85,
    enemyAdMultiplier: 0.80,
    playerLossDamageMultiplier: 0.80,
    summary: 'Renda base: +8฿ | Vitória: +2฿ | Inimigos: 85% Vida / 80% Dano (Bots Casuais)',
  },
  medium: {
    id: 'medium',
    name: 'Médio',
    badge: 'MÉDIO',
    tag: 'Tático Padrão',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/50',
    bgColor: 'bg-amber-950/60',
    description: 'Jornada equilibrada e cadenciada (+2 XP/rodada). Exige gestão de economia e sinergias reais para vencer bots coordenados.',
    baseIncome: 4,
    initialGold: 4,
    winBonus: 1,
    xpPerRound: 2,
    enemyHpMultiplier: 1.0,
    enemyAdMultiplier: 1.0,
    playerLossDamageMultiplier: 1.0,
    summary: 'Renda: +4฿ | XP: +2/rd | Inimigos 100% (Bots com Sinergias e Posicionamento Tático)',
  },
  hard: {
    id: 'hard',
    name: 'Difícil',
    badge: 'DIFÍCIL',
    tag: 'Desafio do Grand Line',
    color: 'text-rose-400',
    borderColor: 'border-rose-500/50',
    bgColor: 'bg-rose-950/60',
    description: 'Bots Mestres com sinergias combinadas, estrelas aceleradas e itens. Derrotas causam alto dano.',
    baseIncome: 5,
    initialGold: 4,
    winBonus: 2,
    xpPerRound: 2,
    enemyHpMultiplier: 1.30,
    enemyAdMultiplier: 1.25,
    playerLossDamageMultiplier: 1.35,
    summary: 'Renda: +5฿ | XP: +2/rd | Inimigos: +30% HP / +25% Dano (Bots Especialistas com Sinergias & Itens)',
  },
};

