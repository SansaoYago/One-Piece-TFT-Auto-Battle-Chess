import { ActiveSynergy, DamageType, UnitInstance } from '../types/game';
import { AttackEffect, CombatTickResult, CombatUnitState, FloatingText, TheftEvent } from '../types/combat';
import { CHAMPION_DATABASE } from '../data/units';
import { ITEM_DATABASE } from '../data/items';

export interface ComboStrikeConfig {
  id: 'punch1' | 'punch2' | 'punch3' | 'punch4' | 'kick1' | 'kick2' | 'kick3';
  name: string;
  type: 'PUNCH' | 'KICK';
  basePoints: number;
  icon: string;
}

// Exact point balance specified by the user:
// Punch 1: 12 pts, Punch 2: 18 pts, Punch 3: 20 pts, Punch 4: 12 pts
// Kicks: 16 to 29 pts (Kick 1: 18 pts, Kick 2: 24 pts, Kick 3: 28 pts)
export const COMBO_STRIKES: Record<string, ComboStrikeConfig> = {
  punch1: { id: 'punch1', name: 'Soco 1 (Jab)', type: 'PUNCH', basePoints: 12, icon: '👊' },
  punch2: { id: 'punch2', name: 'Soco 2 (Direto)', type: 'PUNCH', basePoints: 18, icon: '🥊' },
  punch3: { id: 'punch3', name: 'Soco 3 (Cruzado)', type: 'PUNCH', basePoints: 20, icon: '💥' },
  punch4: { id: 'punch4', name: 'Soco 4 (Gancho)', type: 'PUNCH', basePoints: 12, icon: '⚡' },
  kick1: { id: 'kick1', name: 'Chute 1 (Giratório)', type: 'KICK', basePoints: 18, icon: '🦶' },
  kick2: { id: 'kick2', name: 'Chute 2 (Voador)', type: 'KICK', basePoints: 24, icon: '🌪️' },
  kick3: { id: 'kick3', name: 'Chute 3 (Impacto Final)', type: 'KICK', basePoints: 28, icon: '🔥' },
};

export function initializeCombatUnits(boardUnits: UnitInstance[]): CombatUnitState[] {
  // Only include units actually on the board (gridX >= 0, gridY >= 0)
  const activeUnits = boardUnits.filter((u) => u.gridX >= 0 && u.gridY >= 0);

  return activeUnits.map((unit) => ({
    ...unit,
    currentPosX: unit.gridX,
    currentPosY: unit.gridY,
    targetInstanceId: null,
    attackCooldown: Math.random() * 0.35 + 0.1, // Slight stagger on start
    moveCooldown: 0,
    isCasting: false,
    castProgress: 0,
    isStunned: false,
    stunDuration: 0,
    isKnockedBack: false,
    lastHitTimestamp: 0,
    comboStep: 0, // Always starts at 0 (1st punch)
    currentAnimation: 'idle',
    attackAnimTimer: 0,
    lastAttackTimestamp: 0,
    lastStrikeName: '',
    lastStrikePoints: 0,
    isDefeated: false,
    deathTimestamp: undefined,
  }));
}

export function simulateCombatTick(
  units: CombatUnitState[],
  activeSynergies: ActiveSynergy[],
  isOvertime: boolean,
  deltaSeconds: number,
  theftTracker?: { player: boolean; enemy: boolean },
  playerGold: number = 10,
  enemyGold: number = 10
): CombatTickResult {
  const newFloatingTexts: FloatingText[] = [];
  const newAttackEffects: AttackEffect[] = [];
  const newTheftEvents: TheftEvent[] = [];
  const now = Date.now();

  const speedMultiplier = isOvertime ? 2.0 : 1.0;

  // 1. Separate living combatants (exclude dead or defeated)
  const livingUnits = units.filter((u) => u.hp > 0 && !u.isDefeated);
  const playerLiving = livingUnits.filter((u) => !u.isEnemy);
  const enemyLiving = livingUnits.filter((u) => u.isEnemy);

  // Check end condition
  if (playerLiving.length === 0 || enemyLiving.length === 0) {
    const winner =
      playerLiving.length > 0
        ? 'PLAYER'
        : enemyLiving.length > 0
        ? 'ENEMY'
        : 'DRAW';

    // Immediately reset only SURVIVING combatants to idle preBattle stance and purge defeated units
    const endedUnits: CombatUnitState[] = units
      .filter((u) => u.hp > 0 && !u.isDefeated)
      .map((u) => ({
        ...u,
        currentAnimation: 'idle' as const,
        isAttacking: false,
        isCasting: false,
        moveCooldown: 0,
        targetInstanceId: null,
      }));

    return {
      units: endedUnits,
      floatingTexts: [],
      attackEffects: [],
      theftEvents: [],
      isCombatEnded: true,
      winner,
      playerCasualties: units.filter((u) => !u.isEnemy && (u.hp <= 0 || u.isDefeated)).length,
      enemyCasualties: units.filter((u) => u.isEnemy && (u.hp <= 0 || u.isDefeated)).length,
    };
  }

  // Synergy bonus helpers
  const brigaoTier = activeSynergies.find((s) => s.trait.id === 'brigao')?.activeTierIndex ?? -1;
  const lifestealPercent = brigaoTier >= 1 ? 0.5 : brigaoTier >= 0 ? 0.25 : 0;

  const espadachimTier = activeSynergies.find((s) => s.trait.id === 'espadachim')?.activeTierIndex ?? -1;
  const doubleAttackChance = espadachimTier >= 1 ? 0.5 : espadachimTier >= 0 ? 0.25 : 0;

  // Process each living unit
  for (const unit of livingUnits) {
    if (unit.hp <= 0) continue;

    // Handle stun duration
    if (unit.isStunned) {
      unit.stunDuration -= deltaSeconds;
      if (unit.stunDuration <= 0) {
        unit.isStunned = false;
        unit.stunDuration = 0;
      }
      continue;
    }

    // Handle active skill casting duration
    if (unit.isCasting) {
      unit.castProgress += deltaSeconds * 2.5 * speedMultiplier;
      if (unit.castProgress >= 1) {
        // Skill cast completes
        unit.isCasting = false;
        unit.castProgress = 0;
      }
      continue;
    }

    // Handle attack animation timer
    if (unit.attackAnimTimer > 0) {
      unit.attackAnimTimer -= deltaSeconds * speedMultiplier;
      if (unit.attackAnimTimer <= 0) {
        unit.currentAnimation = 'idle';
      }
    }

    // Cooldown reductions
    unit.attackCooldown = Math.max(0, unit.attackCooldown - deltaSeconds * speedMultiplier);
    unit.moveCooldown = Math.max(0, unit.moveCooldown - deltaSeconds * speedMultiplier);

    // 2. Find Target (closest living opponent)
    const opponents = unit.isEnemy ? playerLiving : enemyLiving;
    const validOpponents = opponents.filter((op) => op.hp > 0 && !op.isDefeated);

    let target = validOpponents.find((op) => op.instanceId === unit.targetInstanceId);

    if (!target) {
      // Pick closest living opponent by Euclidean distance
      let minDistance = Infinity;
      for (const op of validOpponents) {
        const dist = Math.hypot(op.currentPosX - unit.currentPosX, op.currentPosY - unit.currentPosY);
        if (dist < minDistance) {
          minDistance = dist;
          target = op;
        }
      }
      unit.targetInstanceId = target ? target.instanceId : null;
    }

    if (!target) {
      unit.currentAnimation = 'idle';
      unit.targetInstanceId = null;
      continue;
    }

    const distanceToTarget = Math.hypot(
      target.currentPosX - unit.currentPosX,
      target.currentPosY - unit.currentPosY
    );

    // 3. Attack Range Check: unit.range (1 is melee ~1.55 tiles, ranged is 2..4 tiles)
    const effectiveRange = unit.range === 1 ? 1.55 : unit.range + 0.35;

    if (distanceToTarget <= effectiveRange) {
      // In range: Check if ready to cast skill or normal attack from any angle (front, shoulders, flanks, back)
      if (unit.mana >= unit.maxMana) {
        // --- TRIGGER SPECIAL / ACTIVE SKILL CAST ---
        executeSkillCast(unit, target, livingUnits, newFloatingTexts, newAttackEffects, now);
      } else if (unit.attackCooldown <= 0) {
        // --- EXECUTE BASIC ATTACK ---
        executeBasicAttack(
          unit,
          target,
          livingUnits,
          newFloatingTexts,
          newAttackEffects,
          newTheftEvents,
          theftTracker,
          playerGold,
          enemyGold,
          lifestealPercent,
          doubleAttackChance,
          now
        );
        unit.attackCooldown = (1 / Math.max(0.2, unit.attackSpeed)) * (1 / speedMultiplier);
      } else if (unit.attackAnimTimer <= 0) {
        unit.currentAnimation = 'idle';
      }
    } else {
      // Out of range: Move towards target using multi-angle flanking pathfinding
      unit.currentAnimation = 'walk';
      if (unit.moveCooldown <= 0) {
        const dx = target.currentPosX - unit.currentPosX;
        const dy = target.currentPosY - unit.currentPosY;
        const baseAngle = Math.atan2(dy, dx);

        // Sub-tile step size
        const stepSize = Math.min(0.38 * speedMultiplier, Math.max(0.12, distanceToTarget - (unit.range === 1 ? 1.05 : unit.range)));

        // Multi-angle candidate offsets for surrounding and obstacle avoidance:
        // Direct -> slight flanking (shoulders) -> wide flank (sides) -> deep wrap (back)
        const angleOffsets = [
          0,
          Math.PI / 4,     // +45 deg
          -Math.PI / 4,    // -45 deg
          Math.PI / 2.5,   // +72 deg
          -Math.PI / 2.5,  // -72 deg
          Math.PI / 1.8,   // +100 deg
          -Math.PI / 1.8,  // -100 deg
          Math.PI / 1.4,   // +128 deg
          -Math.PI / 1.4,  // -128 deg
        ];

        let bestMove: { x: number; y: number } | null = null;
        let bestScore = Infinity;

        for (const offset of angleOffsets) {
          const testAngle = baseAngle + offset;
          const candX = Math.max(0, Math.min(7, unit.currentPosX + Math.cos(testAngle) * stepSize));
          const candY = Math.max(0, Math.min(5, unit.currentPosY + Math.sin(testAngle) * stepSize));

          // Check if candidate position collides with any other living unit (defeated units do NOT block)
          const collides = livingUnits.some(
            (other) =>
              other.instanceId !== unit.instanceId &&
              other.hp > 0 &&
              !other.isDefeated &&
              Math.hypot(other.currentPosX - candX, other.currentPosY - candY) < 0.44
          );

          if (!collides) {
            // Distance from candidate step to target
            const candDistToTarget = Math.hypot(target.currentPosX - candX, target.currentPosY - candY);
            // Prefer moves that get closer to target, with a small penalty for sharp detours
            const score = candDistToTarget + Math.abs(offset) * 0.28;

            if (score < bestScore) {
              bestScore = score;
              bestMove = { x: candX, y: candY };
              // If direct path is completely clear, use it immediately
              if (offset === 0 && candDistToTarget < distanceToTarget) {
                break;
              }
            }
          }
        }

        if (bestMove) {
          unit.currentPosX = bestMove.x;
          unit.currentPosY = bestMove.y;
          unit.gridX = Math.round(bestMove.x);
          unit.gridY = Math.round(bestMove.y);
          unit.moveCooldown = 0.20 / speedMultiplier;
        } else {
          // If completely boxed in on current target, immediately retarget to another living enemy
          const altOpponents = validOpponents
            .filter((op) => op.instanceId !== target.instanceId)
            .sort((a, b) => {
              const dA = Math.hypot(a.currentPosX - unit.currentPosX, a.currentPosY - unit.currentPosY);
              const dB = Math.hypot(b.currentPosX - unit.currentPosX, b.currentPosY - unit.currentPosY);
              return dA - dB;
            });

          if (altOpponents.length > 0) {
            unit.targetInstanceId = altOpponents[0].instanceId;
            unit.moveCooldown = 0.08 / speedMultiplier;
          } else {
            // No other enemy: if within 1.85 tiles of current target, allow melee reach attack over shoulder
            if (unit.range === 1 && distanceToTarget <= 1.85) {
              if (unit.attackCooldown <= 0) {
                executeBasicAttack(
                  unit,
                  target,
                  livingUnits,
                  newFloatingTexts,
                  newAttackEffects,
                  newTheftEvents,
                  theftTracker,
                  playerGold,
                  enemyGold,
                  lifestealPercent,
                  doubleAttackChance,
                  now
                );
                unit.attackCooldown = (1 / Math.max(0.2, unit.attackSpeed)) * (1 / speedMultiplier);
              }
            }
            unit.moveCooldown = 0.25 / speedMultiplier;
          }
        }
      }
    }
  }

  // Filter out units that finished their 300ms defeat fade-out window so dead units cleanly disappear
  const survivingUnits = units
    .filter((u) => {
      if (u.hp <= 0 || u.isDefeated) {
        if (!u.deathTimestamp) return false;
        return now - u.deathTimestamp < 300;
      }
      return true;
    })
    .map((u) => ({ ...u }));

  return {
    units: survivingUnits,
    floatingTexts: newFloatingTexts,
    attackEffects: newAttackEffects,
    theftEvents: newTheftEvents,
    isCombatEnded: false,
    winner: null,
    playerCasualties: units.filter((u) => !u.isEnemy && (u.hp <= 0 || u.isDefeated)).length,
    enemyCasualties: units.filter((u) => u.isEnemy && (u.hp <= 0 || u.isDefeated)).length,
  };
}

// Helper function to process Thief synergy theft on basic attacks
function checkAndApplyTheft(
  attacker: CombatUnitState,
  target: CombatUnitState,
  allLivingUnits: CombatUnitState[],
  theftTracker: { player: boolean; enemy: boolean } | undefined,
  theftEvents: TheftEvent[],
  floatingTexts: FloatingText[],
  playerGold: number,
  enemyGold: number,
  now: number
) {
  if (!theftTracker) return;

  const isPlayerTeam = !attacker.isEnemy;
  const teamKey = isPlayerTeam ? 'player' : 'enemy';

  // Strict rule: Only 1 theft per team per battle round
  if (theftTracker[teamKey]) return;

  // Check if attacker has Thief trait
  const isThief =
    attacker.traits.includes('ladrao') ||
    attacker.unitId === 'nami' ||
    attacker.unitId === 'buggy' ||
    attacker.items.includes('chip_ladrao');

  if (!isThief) return;

  // Calculate team's thief tier
  const myTeamUnits = allLivingUnits.filter((u) => u.isEnemy === attacker.isEnemy);
  const uniqueThiefChamps = new Set<string>();
  let bonusTraits = 0;
  for (const u of myTeamUnits) {
    if (u.traits.includes('ladrao') || u.unitId === 'nami' || u.unitId === 'buggy') {
      uniqueThiefChamps.add(u.unitId);
    }
    for (const itm of u.items) {
      if (itm === 'chip_ladrao') bonusTraits++;
    }
  }
  const thiefCount = uniqueThiefChamps.size + bonusTraits;
  const thiefTier = thiefCount >= 4 ? 2 : thiefCount >= 2 ? 1 : 0;

  if (thiefTier === 0) return;

  const opponents = allLivingUnits.filter((u) => u.isEnemy !== attacker.isEnemy && u.hp > 0);
  if (opponents.length === 0) return;

  if (thiefTier === 2) {
    // 4 Thieves active: 15% chance to steal an equipped item OR 60% chance to steal 50% gold
    const itemTheftRoll = Math.random();
    const opponentsWithItems = opponents.filter((op) => op.items && op.items.length > 0);

    if (itemTheftRoll < 0.15 && opponentsWithItems.length > 0) {
      // Pick random opponent with items
      const victimUnit = opponentsWithItems[Math.floor(Math.random() * opponentsWithItems.length)];
      const randomItemIdx = Math.floor(Math.random() * victimUnit.items.length);
      const stolenItemId = victimUnit.items[randomItemIdx];

      // Remove item immediately from victim
      victimUnit.items.splice(randomItemIdx, 1);
      theftTracker[teamKey] = true;

      const itemInfo = ITEM_DATABASE[stolenItemId];
      const itemName = itemInfo?.name || 'Item de Combate';
      const itemIcon = itemInfo?.icon || '🗡️';

      theftEvents.push({
        id: `theft_${attacker.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
        thiefUnitId: attacker.unitId,
        thiefName: attacker.name,
        thiefAvatarUrl: attacker.avatarUrl,
        thiefColor: attacker.color,
        victimName: victimUnit.name,
        isPlayerThief: isPlayerTeam,
        type: 'ITEM',
        stolenItemId,
        stolenItemName: itemName,
        stolenItemIcon: itemIcon,
        timestamp: now,
      });

      floatingTexts.push({
        id: `theft_txt_${victimUnit.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
        x: victimUnit.currentPosX,
        y: victimUnit.currentPosY - 0.4,
        value: `🏴‍☠️ ITEM SAQUEADO! [${itemIcon}]`,
        type: 'CRIT',
        color: '#EAB308',
        timestamp: now,
      });
      return;
    }

    // 60% chance to steal 50% gold
    const goldTheftRoll = Math.random();
    if (goldTheftRoll < 0.60) {
      const victimGoldPool = isPlayerTeam ? enemyGold : playerGold;
      const stolenGold = Math.max(2, Math.round(victimGoldPool * 0.50));
      theftTracker[teamKey] = true;

      theftEvents.push({
        id: `theft_${attacker.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
        thiefUnitId: attacker.unitId,
        thiefName: attacker.name,
        thiefAvatarUrl: attacker.avatarUrl,
        thiefColor: attacker.color,
        victimName: target.name,
        isPlayerThief: isPlayerTeam,
        type: 'GOLD',
        goldAmount: stolenGold,
        timestamp: now,
      });

      floatingTexts.push({
        id: `theft_txt_${target.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
        x: target.currentPosX,
        y: target.currentPosY - 0.4,
        value: `💰 +${stolenGold}฿ SAQUEADOS!`,
        type: 'CRIT',
        color: '#EAB308',
        timestamp: now,
      });
      return;
    }
  } else if (thiefTier === 1) {
    // 2 Thieves active: 35% chance per attack to steal 30% gold (strictly once per battle)
    const goldTheftRoll = Math.random();
    if (goldTheftRoll < 0.35) {
      const victimGoldPool = isPlayerTeam ? enemyGold : playerGold;
      const stolenGold = Math.max(1, Math.round(victimGoldPool * 0.30));
      theftTracker[teamKey] = true;

      theftEvents.push({
        id: `theft_${attacker.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
        thiefUnitId: attacker.unitId,
        thiefName: attacker.name,
        thiefAvatarUrl: attacker.avatarUrl,
        thiefColor: attacker.color,
        victimName: target.name,
        isPlayerThief: isPlayerTeam,
        type: 'GOLD',
        goldAmount: stolenGold,
        timestamp: now,
      });

      floatingTexts.push({
        id: `theft_txt_${target.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
        x: target.currentPosX,
        y: target.currentPosY - 0.4,
        value: `💰 +${stolenGold}฿ SAQUEADOS!`,
        type: 'CRIT',
        color: '#EAB308',
        timestamp: now,
      });
      return;
    }
  }
}

// --- BASIC ATTACK & COMBO EXECUTION ---
function executeBasicAttack(
  attacker: CombatUnitState,
  target: CombatUnitState,
  allLivingUnits: CombatUnitState[],
  floatingTexts: FloatingText[],
  attackEffects: AttackEffect[],
  theftEvents: TheftEvent[],
  theftTracker: { player: boolean; enemy: boolean } | undefined,
  playerGold: number,
  enemyGold: number,
  lifestealPercent: number,
  doubleAttackChance: number,
  now: number
) {
  const baseData = CHAMPION_DATABASE[attacker.unitId];
  const isMelee = attacker.range === 1;

  // Combo Selection: Always 2 Punches followed by 1 Kick Finisher
  const punchChoices: Array<'punch1' | 'punch2' | 'punch3' | 'punch4'> = ['punch1', 'punch2', 'punch3', 'punch4'];
  const kickChoices: Array<'kick1' | 'kick2' | 'kick3'> = ['kick1', 'kick2', 'kick3'];

  let strikeKey: 'punch1' | 'punch2' | 'punch3' | 'punch4' | 'kick1' | 'kick2' | 'kick3';
  let isComboFinisher = false;

  if (attacker.comboStep === 0) {
    // 1st Strike: Punch (12, 18, 20, or 12 pts)
    strikeKey = punchChoices[Math.floor(Math.random() * punchChoices.length)];
    attacker.comboStep = 1;
  } else if (attacker.comboStep === 1) {
    // 2nd Strike: Punch (pick varied punch)
    const filtered = punchChoices.filter((p) => p !== attacker.currentAnimation);
    const pool = filtered.length > 0 ? filtered : punchChoices;
    strikeKey = pool[Math.floor(Math.random() * pool.length)];
    attacker.comboStep = 2;
  } else {
    // 3rd Strike: KICK FINISHER! (18, 24, or 28 pts — 16..29 range)
    strikeKey = kickChoices[Math.floor(Math.random() * kickChoices.length)];
    attacker.comboStep = 0; // Reset combo cycle
    isComboFinisher = true;
  }

  const strikeConfig = COMBO_STRIKES[strikeKey];
  attacker.currentAnimation = strikeKey;
  attacker.attackAnimTimer = 0.52; // Active animation duration window
  attacker.lastAttackTimestamp = now;
  attacker.lastStrikeName = attacker.unitId === 'zoro'
    ? attacker.stars === 3
      ? 'Santoryu: Onigiri (Slash 1)'
      : attacker.stars === 2
      ? 'Nitoryu: Nigiri (Slash 1)'
      : 'Ittoryu: Iai Shishi Sonson (Slash 1)'
    : strikeConfig.name;
  attacker.lastStrikePoints = strikeConfig.basePoints;

  // Calculate Base Damage from Strike Points & Champion Stats
  const starMultiplier = attacker.stars === 3 ? 1.7 : attacker.stars === 2 ? 1.3 : 1.0;
  const isCrit = Math.random() < (isComboFinisher ? 0.35 : 0.20);
  const critMultiplier = isCrit ? 1.5 : 1.0;
  // Scaled damage formula with balanced strike points
  const adScaling = attacker.ad / 36;
  const rawDamage = Math.max(
    strikeConfig.basePoints,
    Math.round(strikeConfig.basePoints * adScaling * starMultiplier * critMultiplier)
  );

  // Defense Mitigation: Armor reduces physical, MR reduces magical
  let finalDamage = rawDamage;
  if (attacker.attackType === 'PHYSICAL') {
    const armorReduction = 100 / (100 + Math.max(0, target.armor));
    finalDamage = Math.max(12, Math.round(rawDamage * armorReduction));
  } else if (attacker.attackType === 'MAGICAL') {
    const mrReduction = 100 / (100 + Math.max(0, target.mr));
    finalDamage = Math.max(12, Math.round(rawDamage * mrReduction));
  }

  // Apply Damage to Shield first, then HP
  applyDamageToTarget(attacker, target, finalDamage, attacker.attackType, isCrit, floatingTexts);

  // Show Combo Floating Text
  if (isComboFinisher) {
    floatingTexts.push({
      id: `combo_finisher_${attacker.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
      x: target.currentPosX,
      y: target.currentPosY - 0.2,
      value: `🔥 ${strikeConfig.name} [${strikeConfig.basePoints}pts]`,
      type: 'CRIT',
      color: '#F59E0B',
      timestamp: now,
    });
  }

  // Life Steal (Brigão Trait)
  if (!attacker.isEnemy && lifestealPercent > 0 && attacker.attackType === 'PHYSICAL') {
    const healAmount = Math.round(finalDamage * lifestealPercent);
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
    attacker.totalHealing += healAmount;
    floatingTexts.push({
      id: `heal_${attacker.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
      x: attacker.currentPosX,
      y: attacker.currentPosY,
      value: `+${healAmount}`,
      type: 'HEAL',
      color: '#10B981',
      timestamp: now,
    });
  }

  // Mana Generation: Attacker gains +10 mana, Target gains +5 mana
  attacker.mana = Math.min(attacker.maxMana, attacker.mana + 10);
  target.mana = Math.min(target.maxMana, target.mana + 5);

  // Visual Attack Effect
  attackEffects.push({
    id: `atk_${attacker.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
    fromX: attacker.currentPosX,
    fromY: attacker.currentPosY,
    toX: target.currentPosX,
    toY: target.currentPosY,
    type: isComboFinisher ? 'MELEE_SLASH' : isMelee ? 'PUNCH_EXTEND' : 'PROJECTILE',
    color: isComboFinisher ? '#F59E0B' : (attacker.accentColor || (attacker.isEnemy ? '#F43F5E' : '#38BDF8')),
    icon: strikeConfig.icon || baseData?.avatarUrl || '⚔️',
    timestamp: now,
    durationMs: isComboFinisher ? 340 : 250,
  });

  // Process Thief Trait / Synergy Theft Check
  checkAndApplyTheft(
    attacker,
    target,
    allLivingUnits,
    theftTracker,
    theftEvents,
    floatingTexts,
    playerGold,
    enemyGold,
    now
  );

  // Double Attack Synergy (Espadachim)
  if (!attacker.isEnemy && Math.random() < doubleAttackChance) {
    setTimeout(() => {
      if (attacker.hp > 0 && target.hp > 0) {
        applyDamageToTarget(attacker, target, Math.round(finalDamage * 0.7), attacker.attackType, false, floatingTexts);
        attacker.mana = Math.min(attacker.maxMana, attacker.mana + 10);
        floatingTexts.push({
          id: `combo_${attacker.instanceId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          x: target.currentPosX,
          y: target.currentPosY,
          value: '⚔️ GOLPE DUPLO!',
          type: 'CRIT',
          color: '#FBBF24',
          timestamp: Date.now(),
        });
      }
    }, 150);
  }
}

// --- ACTIVE / SPECIAL SKILL EXECUTION ---
function executeSkillCast(
  caster: CombatUnitState,
  primaryTarget: CombatUnitState,
  allLiving: CombatUnitState[],
  floatingTexts: FloatingText[],
  attackEffects: AttackEffect[],
  now: number
) {
  const baseData = CHAMPION_DATABASE[caster.unitId];
  caster.mana = 0; // Reset mana on cast
  caster.isCasting = true;
  caster.castProgress = 0;

  // Determine which skill is active
  let skillToCast =
    caster.hasSpecialItem && baseData?.skillSpecial
      ? baseData.skillSpecial
      : caster.activeSkill === 'SKILL_A'
      ? baseData?.skillA
      : baseData?.skillB;

  if (!skillToCast && baseData) {
    skillToCast = baseData.skillA;
  }

  const skillName = skillToCast?.name || 'Habilidade Ativa';
  caster.castingSkillName = skillName;

  // Spawn Skill Declaration Floating Banner
  floatingTexts.push({
    id: `skill_name_${caster.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
    x: caster.currentPosX,
    y: caster.currentPosY - 0.5,
    value: `⚡ ${skillName}!`,
    type: 'SKILL',
    color: '#F59E0B',
    timestamp: now,
  });

  // Unique Skill Logic for Key Champions
  if (caster.unitId === 'luffy') {
    if (caster.hasSpecialItem) {
      // Gear Second Jet Bazooka: True Haki Damage + Dash
      const skillDamage = Math.round(350 * (caster.stars === 1 ? 1 : caster.stars === 2 ? 1.8 : 3.2));
      applyDamageToTarget(caster, primaryTarget, skillDamage, 'TRUE_HAKI', true, floatingTexts);

      attackEffects.push({
        id: `luffy_gear2_${caster.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
        fromX: caster.currentPosX,
        fromY: caster.currentPosY,
        toX: primaryTarget.currentPosX,
        toY: primaryTarget.currentPosY,
        type: 'SKILL_IMPACT',
        color: '#DC2626',
        skillName: 'Gear Second: Jet Bazooka',
        timestamp: now,
        durationMs: 600,
      });
    } else if (caster.activeSkill === 'SKILL_A') {
      // Gomu Gomu no Pistol (Soco Frontal Elástico)
      const baseDmg = 220 * (caster.stars === 1 ? 1 : caster.stars === 2 ? 1.5 : 2.5);
      const skillDamage = Math.round(baseDmg + caster.ad * 0.8);
      applyDamageToTarget(caster, primaryTarget, skillDamage, 'PHYSICAL', true, floatingTexts);

      attackEffects.push({
        id: `luffy_pistol_${caster.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
        fromX: caster.currentPosX,
        fromY: caster.currentPosY,
        toX: primaryTarget.currentPosX,
        toY: primaryTarget.currentPosY,
        type: 'PUNCH_EXTEND',
        color: '#EF4444',
        skillName: 'Gomu Gomu no Pistol',
        timestamp: now,
        durationMs: 500,
      });
    } else {
      // Gomu Gomu no Bazooka (Golpe com Knockback 1 casa)
      const skillDamage = Math.round(180 * (caster.stars === 1 ? 1 : 1.5));
      applyDamageToTarget(caster, primaryTarget, skillDamage, 'PHYSICAL', true, floatingTexts);

      // Knockback target 1 tile away
      const dx = primaryTarget.currentPosX - caster.currentPosX;
      const dy = primaryTarget.currentPosY - caster.currentPosY;
      primaryTarget.currentPosX = Math.max(0, Math.min(7, primaryTarget.currentPosX + (dx >= 0 ? 0.9 : -0.9)));
      primaryTarget.currentPosY = Math.max(0, Math.min(5, primaryTarget.currentPosY + (dy >= 0 ? 0.9 : -0.9)));
      primaryTarget.gridX = Math.round(primaryTarget.currentPosX);
      primaryTarget.gridY = Math.round(primaryTarget.currentPosY);
      primaryTarget.isStunned = true;
      primaryTarget.stunDuration = 1.0;

      attackEffects.push({
        id: `luffy_bazooka_${caster.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
        fromX: caster.currentPosX,
        fromY: caster.currentPosY,
        toX: primaryTarget.currentPosX,
        toY: primaryTarget.currentPosY,
        type: 'SKILL_IMPACT',
        color: '#F97316',
        skillName: 'Gomu Gomu no Bazooka',
        timestamp: now,
        durationMs: 500,
      });
    }
  } else if (caster.unitId === 'nami') {
    // Thunder / Cyclone Tempo
    const skillDamage = Math.round(240 * (caster.stars === 1 ? 1 : 1.7) + caster.ap * 1.2);
    applyDamageToTarget(caster, primaryTarget, skillDamage, 'MAGICAL', true, floatingTexts);

    attackEffects.push({
      id: `nami_thunder_${caster.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
      fromX: caster.currentPosX,
      fromY: caster.currentPosY,
      toX: primaryTarget.currentPosX,
      toY: primaryTarget.currentPosY,
      type: 'LIGHTNING',
      color: '#38BDF8',
      skillName: 'Thunder Tempo',
      timestamp: now,
      durationMs: 500,
    });
  } else if (caster.unitId.startsWith('marine_recruit')) {
    // Marine Recruit Mosquete / Cutelo
    const skillDamage = Math.round(140 + caster.ad * 0.5);
    applyDamageToTarget(caster, primaryTarget, skillDamage, 'PHYSICAL', false, floatingTexts);

    attackEffects.push({
      id: `marine_skill_${caster.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
      fromX: caster.currentPosX,
      fromY: caster.currentPosY,
      toX: primaryTarget.currentPosX,
      toY: primaryTarget.currentPosY,
      type: 'PROJECTILE',
      color: '#F43F5E',
      timestamp: now,
      durationMs: 350,
    });
  } else {
    // Generic champion skill
    const skillDamage = Math.round(caster.ad * 1.6 + caster.ap * 1.2);
    applyDamageToTarget(caster, primaryTarget, skillDamage, caster.attackType, true, floatingTexts);

    attackEffects.push({
      id: `generic_skill_${caster.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
      fromX: caster.currentPosX,
      fromY: caster.currentPosY,
      toX: primaryTarget.currentPosX,
      toY: primaryTarget.currentPosY,
      type: 'SKILL_IMPACT',
      color: caster.color || '#F59E0B',
      skillName,
      timestamp: now,
      durationMs: 500,
    });
  }
}

// --- APPLY DAMAGE & UPDATE STATS HELPER ---
function applyDamageToTarget(
  attacker: CombatUnitState,
  target: CombatUnitState,
  amount: number,
  damageType: DamageType,
  isCrit: boolean,
  floatingTexts: FloatingText[]
) {
  let remainingDamage = amount;

  // Damage to Shield first
  if (target.shield > 0) {
    const shieldDmg = Math.min(target.shield, remainingDamage);
    target.shield -= shieldDmg;
    remainingDamage -= shieldDmg;
    target.totalDamageBlocked += shieldDmg;
  }

  // Remaining damage directly to HP
  target.hp = Math.max(0, target.hp - remainingDamage);

  // Check for defeat/knockout
  if (target.hp <= 0 && !target.isDefeated) {
    target.isDefeated = true;
    target.deathTimestamp = Date.now();
    target.currentAnimation = 'death';
    target.targetInstanceId = null;
    target.isCasting = false;
    target.isStunned = false;

    floatingTexts.push({
      id: `ko_${target.instanceId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      x: target.currentPosX,
      y: target.currentPosY - 0.35,
      value: '💀 DERROTADO!',
      type: 'CRIT',
      color: '#EF4444',
      timestamp: Date.now(),
    });
  }

  // Update attacker DPS meters
  if (damageType === 'PHYSICAL') {
    attacker.totalPhysicalDamage += amount;
  } else if (damageType === 'MAGICAL') {
    attacker.totalMagicalDamage += amount;
  } else {
    attacker.totalTrueDamage += amount;
  }

  // Floating text color
  const color =
    damageType === 'TRUE_HAKI'
      ? '#FBBF24' // Gold
      : damageType === 'MAGICAL'
      ? '#A855F7' // Purple
      : isCrit
      ? '#EF4444' // Red Crit
      : '#FB923C'; // Orange

  floatingTexts.push({
    id: `dmg_${Date.now()}_${Math.random()}`,
    x: target.currentPosX,
    y: target.currentPosY,
    value: isCrit ? `💥 ${amount}` : amount,
    type: damageType,
    isCrit,
    color,
    timestamp: Date.now(),
  });
}
