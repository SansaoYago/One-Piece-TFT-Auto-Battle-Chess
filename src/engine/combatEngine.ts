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
    orbMana: unit.hasSpecialItem ? (unit.orbMana || 0) : 0,
    maxOrbMana: 250,
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

    // Handle Chopper transformation phases and timers
    if (unit.transformationTimer && unit.transformationTimer > 0) {
      unit.transformationTimer -= deltaSeconds * speedMultiplier;

      if (unit.transformationPhase === 'INVOKING') {
        unit.isCasting = true;
        unit.currentAnimation = 'monster_invoke';
        if (unit.transformationTimer <= 0) {
          // Invocation animation finished! Attacks only start now!
          unit.transformationPhase = 'TRANSFORMED';
          unit.transformationTimer = 3.0; // 3 seconds in Monster Chopper form
          unit.isCasting = false;
          unit.attackCooldown = 0.05;
          unit.currentAnimation = 'idle';
          unit.isTransformed = true;

          newFloatingTexts.push({
            id: `chopper_monster_active_${unit.instanceId}_${now}`,
            x: unit.currentPosX,
            y: unit.currentPosY - 0.7,
            value: '🔥 MONSTER CHOPPER ATIVO (3m)!',
            type: 'CRIT',
            color: '#EF4444',
            timestamp: now,
          });

          newAttackEffects.push({
            id: `chopper_roar_${unit.instanceId}_${now}`,
            fromX: unit.currentPosX,
            fromY: unit.currentPosY,
            toX: unit.currentPosX,
            toY: unit.currentPosY,
            type: 'SKILL_IMPACT',
            color: '#DC2626',
            skillName: 'Monster Roar Shockwave',
            timestamp: now,
            durationMs: 700,
          });
        }
        continue; // Cannot attack or move while invoking
      } else if (unit.transformationPhase === 'TRANSFORMED') {
        if (unit.transformationTimer <= 0) {
          // 3 seconds finished! Revert to normal Chopper and become unconscious for 3 seconds!
          unit.isTransformed = false;
          unit.transformationPhase = 'UNCONSCIOUS';
          unit.transformationTimer = 3.0; // 3 seconds unconscious
          unit.isStunned = true;
          unit.stunDuration = 3.0;
          unit.isUnconscious = true;
          unit.currentAnimation = 'idle';

          newFloatingTexts.push({
            id: `chopper_unconscious_${unit.instanceId}_${now}`,
            x: unit.currentPosX,
            y: unit.currentPosY - 0.5,
            value: '💫 INCONSCIENTE POR 3s!',
            type: 'MISS',
            color: '#94A3B8',
            timestamp: now,
          });
        }
      } else if (unit.transformationPhase === 'UNCONSCIOUS') {
        unit.isStunned = true;
        unit.isUnconscious = true;
        if (unit.transformationTimer <= 0) {
          // 3 seconds of unconsciousness finished! Chopper regains consciousness!
          unit.transformationPhase = 'NONE';
          unit.isStunned = false;
          unit.isUnconscious = false;
          unit.stunDuration = 0;

          newFloatingTexts.push({
            id: `chopper_wakeup_${unit.instanceId}_${now}`,
            x: unit.currentPosX,
            y: unit.currentPosY - 0.4,
            value: '✨ Chopper Acordou!',
            type: 'HEAL',
            color: '#38BDF8',
            timestamp: now,
          });
        }
      }
    }

    // Handle stun duration (including unconsciousness)
    if (unit.isStunned) {
      unit.stunDuration -= deltaSeconds;
      if (unit.stunDuration <= 0) {
        if (!unit.isUnconscious) {
          unit.isStunned = false;
          unit.stunDuration = 0;
        }
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
      // In range: Check if ready to cast Orb Special (250 pts), or regular active skill (100 mana), or basic attack
      const hasOrb = unit.hasSpecialItem;
      const canCastOrbSpecial = hasOrb && (unit.orbMana || 0) >= (unit.maxOrbMana || 250);
      const canCastNormalSkill = unit.mana >= unit.maxMana;

      if (canCastOrbSpecial) {
        // --- TRIGGER ORB SPECIAL SKILL CAST (Requires 250 pt) ---
        executeSkillCast(unit, target, livingUnits, newFloatingTexts, newAttackEffects, now, true);
      } else if (canCastNormalSkill) {
        // --- TRIGGER NORMAL ACTIVE SKILL CAST ---
        executeSkillCast(unit, target, livingUnits, newFloatingTexts, newAttackEffects, now, false);
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

  // Special Champion Attack & Combo Handling
  const isNami = attacker.unitId === 'nami';
  const isUsopp = attacker.unitId === 'usopp';
  const isSanji = attacker.unitId === 'sanji';
  const isCrocodile = attacker.unitId === 'crocodile';
  const isChopperMonster = attacker.unitId === 'chopper' && attacker.isTransformed;

  // Combo Selection
  const punchChoices: Array<'punch1' | 'punch2' | 'punch3' | 'punch4'> = ['punch1', 'punch2', 'punch3', 'punch4'];
  const kickChoices: Array<'kick1' | 'kick2' | 'kick3'> = ['kick1', 'kick2', 'kick3'];
  const sanjiKickChoices: Array<'kick1' | 'kick2' | 'kick3'> = ['kick1', 'kick2', 'kick3'];

  let strikeKey: 'punch1' | 'punch2' | 'punch3' | 'punch4' | 'kick1' | 'kick2' | 'kick3';
  let isComboFinisher = false;

  if (isNami) {
    // User requested: "Deixe somente a nami sem ataque, vou tirar o gld do local, e substituir por um esqueleto animado, mas pode tirar dela a animação de ataque"
    strikeKey = 'punch1';
    attacker.comboStep = 0;
  } else if (isUsopp) {
    strikeKey = 'punch1';
    attacker.comboStep = 0;
  } else if (isCrocodile) {
    // Crocodile uses CrocodileATK
    strikeKey = 'punch1';
    attacker.comboStep = (attacker.comboStep + 1) % 3;
    isComboFinisher = attacker.comboStep === 0;
  } else if (isSanji) {
    // Sanji: "não vai bater com as mão, e sim todos os kicks, sendo Kick1, SanjiKick1, 2"
    strikeKey = sanjiKickChoices[attacker.comboStep % 3];
    attacker.comboStep = (attacker.comboStep + 1) % 3;
    isComboFinisher = strikeKey === 'kick3';
  } else if (isChopperMonster) {
    strikeKey = attacker.comboStep % 2 === 0 ? 'punch3' : 'kick1';
    attacker.comboStep = (attacker.comboStep + 1) % 2;
    isComboFinisher = true;
  } else if (attacker.comboStep === 0) {
    strikeKey = punchChoices[Math.floor(Math.random() * punchChoices.length)];
    attacker.comboStep = 1;
  } else if (attacker.comboStep === 1) {
    const filtered = punchChoices.filter((p) => p !== attacker.currentAnimation);
    const pool = filtered.length > 0 ? filtered : punchChoices;
    strikeKey = pool[Math.floor(Math.random() * pool.length)];
    attacker.comboStep = 2;
  } else {
    strikeKey = kickChoices[Math.floor(Math.random() * kickChoices.length)];
    attacker.comboStep = 0;
    isComboFinisher = true;
  }

  const strikeConfig = COMBO_STRIKES[strikeKey];
  attacker.currentAnimation = isNami
    ? 'idle' // Nami strictly has NO attack animation
    : isUsopp || isCrocodile
    ? 'attack'
    : isSanji
    ? strikeKey
    : strikeKey;

  attacker.attackAnimTimer = 0.52;
  attacker.lastAttackTimestamp = now;

  // Strike names
  attacker.lastStrikeName = isNami
    ? 'Clima-Tact (Suporte)'
    : isUsopp
    ? 'Kayaku Boshi (UsoppAtk)'
    : isCrocodile
    ? 'Desert Spada (CrocodileATK)'
    : isSanji
    ? (strikeKey === 'kick1'
      ? 'Mouton Shot (Kick1)'
      : strikeKey === 'kick2'
      ? 'Diable Jambe: Premier Haché (SanjiKick1)'
      : 'Diable Jambe: Flambage Shot (SanjiKick2)')
    : isChopperMonster
    ? 'Monster Point: Heavy Stomp (Dano Terrível)'
    : attacker.unitId === 'zoro'
    ? (attacker.stars === 3
      ? 'Santoryu: Onigiri (Slash 1)'
      : attacker.stars === 2
      ? 'Nitoryu: Nigiri (Slash 1)'
      : 'Ittoryu: Iai Shishi Sonson (Slash 1)')
    : strikeConfig.name;

  attacker.lastStrikePoints = isChopperMonster ? 65 : strikeConfig.basePoints;

  // Calculate Base Damage from Strike Points & Champion Stats
  const starMultiplier = attacker.stars === 3 ? 1.7 : attacker.stars === 2 ? 1.3 : 1.0;
  const isCrit = Math.random() < (isComboFinisher ? 0.35 : 0.20);
  const critMultiplier = isCrit ? 1.5 : 1.0;
  const adScaling = attacker.ad / 36;

  let rawDamage: number;
  if (isChopperMonster) {
    // Monster Chopper: "com dano terrivel"
    rawDamage = Math.round((520 + attacker.ad * 2.5) * starMultiplier * critMultiplier);
  } else {
    rawDamage = Math.max(
      strikeConfig.basePoints,
      Math.round(strikeConfig.basePoints * adScaling * starMultiplier * critMultiplier)
    );
  }

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

  // Orb Special Generation (250 pts required): Only for units equipped with orb
  if (attacker.hasSpecialItem) {
    attacker.orbMana = Math.min(attacker.maxOrbMana || 250, (attacker.orbMana || 0) + 20);
  }
  if (target.hasSpecialItem) {
    target.orbMana = Math.min(target.maxOrbMana || 250, (target.orbMana || 0) + 10);
  }

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
        if (attacker.hasSpecialItem) {
          attacker.orbMana = Math.min(attacker.maxOrbMana || 250, (attacker.orbMana || 0) + 15);
        }
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
  now: number,
  isOrbSpecial: boolean = false
) {
  const baseData = CHAMPION_DATABASE[caster.unitId];

  if (isOrbSpecial) {
    caster.orbMana = 0;
    caster.castingSkillType = 'ORB_SPECIAL';
  } else {
    caster.mana = 0;
    caster.castingSkillType = 'NORMAL';
    if (caster.hasSpecialItem) {
      caster.orbMana = Math.min(caster.maxOrbMana || 250, (caster.orbMana || 0) + 25);
    }
  }

  caster.isCasting = true;
  caster.castProgress = 0;

  // Determine which skill is active: Orb Special vs normal skill A/B
  let skillToCast =
    isOrbSpecial && baseData?.skillSpecial
      ? baseData.skillSpecial
      : caster.activeSkill === 'SKILL_A'
      ? baseData?.skillA
      : baseData?.skillB;

  if (!skillToCast && baseData) {
    skillToCast = isOrbSpecial ? baseData.skillSpecial || baseData.skillA : baseData.skillA;
  }

  const skillName = skillToCast?.name || (isOrbSpecial ? 'Especial do Orbe' : 'Habilidade Ativa');
  caster.castingSkillName = skillName;

  // Spawn Skill Declaration Floating Banner (Only skills and orb special appear on screen)
  floatingTexts.push({
    id: `skill_name_${caster.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
    x: caster.currentPosX,
    y: caster.currentPosY - 0.5,
    value: isOrbSpecial ? `🔮 ${skillName}!` : `⚡ ${skillName}!`,
    type: 'SKILL',
    color: isOrbSpecial ? '#C084FC' : '#F59E0B',
    timestamp: now,
  });

  // Unique Skill Logic for Key Champions
  if (caster.unitId === 'luffy') {
    if (isOrbSpecial) {
      // Gear Second Jet Bazooka: True Haki Damage + Dash
      const skillDamage = Math.round(380 * (caster.stars === 1 ? 1 : caster.stars === 2 ? 1.8 : 3.2));
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
  } else if (caster.unitId === 'zoro') {
    if (isOrbSpecial) {
      // San-Zen Seikai (Três Mil Mundos): True Haki damage ignoring defenses
      const skillDamage = Math.round(520 * (caster.stars === 1 ? 1 : caster.stars === 2 ? 1.8 : 3.2));
      applyDamageToTarget(caster, primaryTarget, skillDamage, 'TRUE_HAKI', true, floatingTexts);

      attackEffects.push({
        id: `zoro_special_${caster.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
        fromX: caster.currentPosX,
        fromY: caster.currentPosY,
        toX: primaryTarget.currentPosX,
        toY: primaryTarget.currentPosY,
        type: 'SKILL_IMPACT',
        color: '#A855F7',
        skillName: 'San-Zen Seikai',
        timestamp: now,
        durationMs: 700,
      });
    } else if (caster.activeSkill === 'SKILL_A') {
      const skillDamage = Math.round(260 * (caster.stars === 1 ? 1 : 1.6) + caster.ad * 1.2);
      applyDamageToTarget(caster, primaryTarget, skillDamage, 'PHYSICAL', true, floatingTexts);

      attackEffects.push({
        id: `zoro_onigiri_${caster.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
        fromX: caster.currentPosX,
        fromY: caster.currentPosY,
        toX: primaryTarget.currentPosX,
        toY: primaryTarget.currentPosY,
        type: 'MELEE_SLASH',
        color: '#10B981',
        skillName: 'Onigiri',
        timestamp: now,
        durationMs: 400,
      });
    } else {
      const skillDamage = Math.round(220 * (caster.stars === 1 ? 1 : 1.5) + caster.ad * 0.9);
      applyDamageToTarget(caster, primaryTarget, skillDamage, 'PHYSICAL', true, floatingTexts);

      attackEffects.push({
        id: `zoro_tatsumaki_${caster.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
        fromX: caster.currentPosX,
        fromY: caster.currentPosY,
        toX: primaryTarget.currentPosX,
        toY: primaryTarget.currentPosY,
        type: 'SKILL_IMPACT',
        color: '#34D399',
        skillName: 'Tatsu Maki',
        timestamp: now,
        durationMs: 450,
      });
    }
  } else if (caster.unitId === 'nami') {
    if (isOrbSpecial) {
      const skillDamage = Math.round(580 * (caster.stars === 1 ? 1 : 1.7) + caster.ap * 1.8);
      applyDamageToTarget(caster, primaryTarget, skillDamage, 'MAGICAL', true, floatingTexts);

      attackEffects.push({
        id: `nami_tornado_${caster.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
        fromX: caster.currentPosX,
        fromY: caster.currentPosY,
        toX: primaryTarget.currentPosX,
        toY: primaryTarget.currentPosY,
        type: 'LIGHTNING',
        color: '#C084FC',
        skillName: 'Tornado Tempo Climatáctico',
        timestamp: now,
        durationMs: 700,
      });
    } else {
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
    }
  } else if (caster.unitId === 'chopper') {
    if (isOrbSpecial) {
      // Chopper equipped with Orb fills special bar -> Invocação de Monster Point!
      caster.isTransformed = true;
      caster.transformationPhase = 'INVOKING';
      caster.transformationTimer = 1.4; // ChopperMonsterActive invocation animation duration
      caster.currentAnimation = 'monster_invoke';
      caster.isCasting = true;
      caster.castProgress = 0;
      caster.castingSkillName = 'Monster Point (Invocação)';

      floatingTexts.push({
        id: `chopper_invoke_${caster.instanceId}_${now}`,
        x: caster.currentPosX,
        y: caster.currentPosY - 0.6,
        value: '🔮 RUMBLE BALL: MONSTER POINT!',
        type: 'SKILL',
        color: '#A855F7',
        timestamp: now,
      });

      attackEffects.push({
        id: `chopper_invoke_fx_${caster.instanceId}_${now}`,
        fromX: caster.currentPosX,
        fromY: caster.currentPosY,
        toX: caster.currentPosX,
        toY: caster.currentPosY,
        type: 'SKILL_IMPACT',
        color: '#9333EA',
        skillName: 'Monster Point: ChopperMonsterActive',
        timestamp: now,
        durationMs: 1400,
      });
      return;
    } else if (caster.activeSkill === 'SKILL_A') {
      // Brain Point: Scope
      const heal = Math.round(caster.maxHp * 0.25);
      caster.hp = Math.min(caster.maxHp, caster.hp + heal);
      floatingTexts.push({
        id: `chopper_heal_${caster.instanceId}_${now}`,
        x: caster.currentPosX,
        y: caster.currentPosY,
        value: `+${heal}`,
        type: 'HEAL',
        color: '#10B981',
        timestamp: now,
      });
      attackEffects.push({
        id: `chopper_scope_${caster.instanceId}_${now}`,
        fromX: caster.currentPosX,
        fromY: caster.currentPosY,
        toX: primaryTarget.currentPosX,
        toY: primaryTarget.currentPosY,
        type: 'SKILL_IMPACT',
        color: '#F472B6',
        skillName: 'Brain Point: Scope',
        timestamp: now,
        durationMs: 500,
      });
      return;
    } else {
      // Heavy Point: Arm Smash
      const baseDmg = 280 * (caster.stars === 1 ? 1 : 1.6);
      const skillDamage = Math.round(baseDmg + caster.ad * 1.3);
      applyDamageToTarget(caster, primaryTarget, skillDamage, 'PHYSICAL', true, floatingTexts);
      primaryTarget.isStunned = true;
      primaryTarget.stunDuration = 1.0;
      attackEffects.push({
        id: `chopper_heavy_${caster.instanceId}_${now}`,
        fromX: caster.currentPosX,
        fromY: caster.currentPosY,
        toX: primaryTarget.currentPosX,
        toY: primaryTarget.currentPosY,
        type: 'SKILL_IMPACT',
        color: '#EA580C',
        skillName: 'Heavy Point: Arm Smash',
        timestamp: now,
        durationMs: 500,
      });
      return;
    }
  } else if (caster.unitId === 'sanji') {
    if (isOrbSpecial) {
      // Diable Jambe: Flambage Shot (Ultimate Kick - True Haki Damage)
      const skillDamage = Math.round(620 * (caster.stars === 1 ? 1 : 1.8) + caster.ad * 2.0);
      applyDamageToTarget(caster, primaryTarget, skillDamage, 'TRUE_HAKI', true, floatingTexts);
      attackEffects.push({
        id: `sanji_flambage_${caster.instanceId}_${now}`,
        fromX: caster.currentPosX,
        fromY: caster.currentPosY,
        toX: primaryTarget.currentPosX,
        toY: primaryTarget.currentPosY,
        type: 'SKILL_IMPACT',
        color: '#F97316',
        skillName: 'Diable Jambe: Flambage Shot',
        timestamp: now,
        durationMs: 700,
      });
    } else {
      // Concassé / Mouton Shot
      const skillDamage = Math.round(280 * (caster.stars === 1 ? 1 : 1.5) + caster.ad * 1.2);
      applyDamageToTarget(caster, primaryTarget, skillDamage, 'PHYSICAL', true, floatingTexts);
      attackEffects.push({
        id: `sanji_concasser_${caster.instanceId}_${now}`,
        fromX: caster.currentPosX,
        fromY: caster.currentPosY,
        toX: primaryTarget.currentPosX,
        toY: primaryTarget.currentPosY,
        type: 'SKILL_IMPACT',
        color: '#F59E0B',
        skillName: 'Diable Jambe: Concassé',
        timestamp: now,
        durationMs: 500,
      });
    }
    return;
  } else if (caster.unitId === 'crocodile') {
    if (isOrbSpecial) {
      // Ground Secco: Drena HP de todos os inimigos e atordoa
      const skillDamage = Math.round(480 * (caster.stars === 1 ? 1 : 1.8) + caster.ap * 1.5);
      for (const enemy of allLiving) {
        if (enemy.isEnemy !== caster.isEnemy && enemy.hp > 0 && !enemy.isDefeated) {
          applyDamageToTarget(caster, enemy, skillDamage, 'MAGICAL', true, floatingTexts);
          enemy.isStunned = true;
          enemy.stunDuration = 1.2;
        }
      }
      attackEffects.push({
        id: `croc_ground_secco_${caster.instanceId}_${now}`,
        fromX: caster.currentPosX,
        fromY: caster.currentPosY,
        toX: primaryTarget.currentPosX,
        toY: primaryTarget.currentPosY,
        type: 'SKILL_IMPACT',
        color: '#D97706',
        skillName: 'Ground Secco (Tempestade de Areia)',
        timestamp: now,
        durationMs: 800,
      });
    } else {
      // Desert Spada (CrocodileATK)
      const skillDamage = Math.round(260 * (caster.stars === 1 ? 1 : 1.6) + caster.ad * 1.2);
      applyDamageToTarget(caster, primaryTarget, skillDamage, 'PHYSICAL', true, floatingTexts);
      attackEffects.push({
        id: `croc_spada_${caster.instanceId}_${now}`,
        fromX: caster.currentPosX,
        fromY: caster.currentPosY,
        toX: primaryTarget.currentPosX,
        toY: primaryTarget.currentPosY,
        type: 'MELEE_SLASH',
        color: '#B45309',
        skillName: 'Desert Spada (CrocodileATK)',
        timestamp: now,
        durationMs: 500,
      });
    }
    return;
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
    // Generic champion skill (or orb special)
    const mult = isOrbSpecial ? 2.8 : 1.6;
    const skillDamage = Math.round(caster.ad * mult + caster.ap * mult);
    applyDamageToTarget(caster, primaryTarget, skillDamage, isOrbSpecial ? 'TRUE_HAKI' : caster.attackType, true, floatingTexts);

    attackEffects.push({
      id: `generic_skill_${caster.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
      fromX: caster.currentPosX,
      fromY: caster.currentPosY,
      toX: primaryTarget.currentPosX,
      toY: primaryTarget.currentPosY,
      type: 'SKILL_IMPACT',
      color: isOrbSpecial ? '#C084FC' : (caster.color || '#F59E0B'),
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
