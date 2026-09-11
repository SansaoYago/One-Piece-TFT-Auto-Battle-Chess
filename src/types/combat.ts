import { DamageType, UnitInstance } from './game';

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  value: string | number;
  type: DamageType | 'HEAL' | 'SHIELD' | 'CRIT' | 'SKILL' | 'MISS';
  isCrit?: boolean;
  color?: string;
  timestamp: number;
}

export interface AttackEffect {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  type: 'MELEE_SLASH' | 'PROJECTILE' | 'SKILL_IMPACT' | 'LIGHTNING' | 'FIRE_BLAST' | 'PUNCH_EXTEND';
  color: string;
  icon?: string;
  skillName?: string;
  timestamp: number;
  durationMs: number;
}

export interface CombatUnitState extends UnitInstance {
  // Runtime combat simulation state
  currentPosX: number; // Sub-tile precision x (0..7)
  currentPosY: number; // Sub-tile precision y (0..5)
  targetInstanceId: string | null;
  attackCooldown: number; // seconds remaining
  moveCooldown: number; // seconds remaining
  isCasting: boolean;
  castProgress: number; // 0..1
  castingSkillName?: string;
  castingSkillType?: string;
  isStunned: boolean;
  stunDuration: number;
  isKnockedBack: boolean;
  lastHitTimestamp: number;
  // Dynamic Combo and Animation State
  comboStep: number; // 0: Punch 1/2, 1: Punch 2/2, 2: Kick Finisher
  currentAnimation?: 'idle' | 'walk' | 'punch1' | 'punch2' | 'punch3' | 'punch4' | 'kick1' | 'kick2' | 'kick3' | 'attack' | 'slash1' | 'turnLeft' | 'turnRight' | 'death' | 'monster_invoke';
  attackAnimTimer: number; // Duration of current attack animation in seconds
  lastAttackTimestamp: number;
  lastStrikeName?: string;
  lastStrikePoints?: number;
  isDefeated?: boolean;
  deathTimestamp?: number;
  // Transformation & Specialized States
  isTransformed?: boolean;
  transformationPhase?: 'NONE' | 'INVOKING' | 'TRANSFORMED' | 'UNCONSCIOUS';
  transformationTimer?: number;
  isUnconscious?: boolean;
  // Obstacle avoidance and smooth flanking
  flankBias?: number; // 1 (turn clockwise/down) or -1 (turn counter-clockwise/up)
  stuckTimer?: number; // seconds stuck without progress towards target
}

export interface TheftEvent {
  id: string;
  thiefUnitId: string;
  thiefName: string;
  thiefAvatarUrl?: string;
  thiefColor?: string;
  victimName: string;
  isPlayerThief: boolean;
  type: 'GOLD' | 'ITEM';
  goldAmount?: number;
  stolenItemId?: string;
  stolenItemName?: string;
  stolenItemIcon?: string;
  timestamp: number;
}

export interface CombatTickResult {
  units: CombatUnitState[];
  floatingTexts: FloatingText[];
  attackEffects: AttackEffect[];
  theftEvents?: TheftEvent[];
  isCombatEnded: boolean;
  winner: 'PLAYER' | 'ENEMY' | 'DRAW' | null;
  playerCasualties: number;
  enemyCasualties: number;
}

export interface RoundReward {
  baseGold: number;
  interestGold: number;
  streakGold: number;
  winBonusGold: number;
  totalGold: number;
  xpGained: number;
  itemsDropped: string[];
}
