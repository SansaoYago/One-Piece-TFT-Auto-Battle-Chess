import { CHAMPION_DATABASE } from '../data/units';
import { SYNERGY_DATABASE } from '../data/synergies';
import { ITEM_DATABASE } from '../data/items';
import { ActiveSynergy, StarLevel, TraitId, UnitInstance } from '../types/game';

export const LEVEL_XP_REQUIREMENTS: Record<number, number> = {
  1: 2,
  2: 2,
  3: 6,
  4: 10,
  5: 20,
  6: 36,
  7: 56,
  8: 999, // Max level
};

export const LEVEL_MAX_SLOTS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 3, // Mantém 3 slots e concede 1º Orbe do Despertar
  5: 4,
  6: 5,
  7: 6, // Teto máximo de 6 unidades
  8: 6, // Mantém 6 slots e concede 2º Orbe do Despertar
};

export const SHOP_ODDS_BY_LEVEL: Record<number, number[]> = {
  1: [100, 0, 0, 0, 0],
  2: [100, 0, 0, 0, 0],
  3: [75, 25, 0, 0, 0],
  4: [55, 30, 15, 0, 0],
  5: [45, 33, 20, 2, 0],
  6: [30, 40, 25, 5, 0],
  7: [19, 30, 35, 15, 1],
  8: [15, 20, 35, 25, 5],
};

export function createUnitInstance(
  unitId: string,
  stars: StarLevel = 1,
  gridX = -1,
  gridY = -1,
  benchIndex: number | null = null,
  isEnemy = false
): UnitInstance {
  const base = CHAMPION_DATABASE[unitId] || CHAMPION_DATABASE.luffy;
  
  // Multipliers by star level
  const starMultiplier = stars === 1 ? 1 : stars === 2 ? 1.8 : 3.2;
  const hp = Math.round(base.baseHp * starMultiplier);
  const ad = Math.round(base.baseAd * starMultiplier);
  const ap = Math.round(base.baseAp * starMultiplier);

  return {
    instanceId: `${unitId}_${Math.random().toString(36).substr(2, 9)}`,
    unitId: base.id,
    name: base.name,
    title: base.title,
    cost: base.cost,
    tier: base.tier,
    stars,
    traits: [...base.traits],
    range: base.range,
    attackType: base.attackType,
    
    hp,
    maxHp: hp,
    shield: 0,
    mana: base.startMana,
    maxMana: base.baseMana,
    armor: base.baseArmor,
    mr: base.baseMr,
    ad,
    ap,
    attackSpeed: base.attackSpeed,
    
    activeSkill: 'SKILL_A',
    hasSpecialItem: false,
    
    avatarUrl: base.avatarUrl,
    color: base.color,
    accentColor: base.accentColor,
    
    gridX,
    gridY,
    benchIndex,
    
    isEnemy: !!isEnemy || !!base.isEnemy,
    items: [],
    
    totalPhysicalDamage: 0,
    totalMagicalDamage: 0,
    totalTrueDamage: 0,
    totalDamageBlocked: 0,
    totalHealing: 0,
  };
}

export interface UpgradeResult {
  nextBench: (UnitInstance | null)[];
  nextBoard: UnitInstance[];
  refundedItems: string[];
  upgradedUnit: UnitInstance | null;
}

export function performStarUpgrades(
  currentBench: (UnitInstance | null)[],
  currentBoard: UnitInstance[]
): UpgradeResult {
  let bench = [...currentBench];
  let board = [...currentBoard];
  const refundedItems: string[] = [];
  let lastUpgradedUnit: UnitInstance | null = null;
  let hasChanged = true;

  // Loop until no more 3-unit merges are possible (handles 1* -> 2* and cascading 2* -> 3*)
  while (hasChanged) {
    hasChanged = false;

    // Collect all distinct unit IDs present in bench or board
    const allUnitIds = new Set<string>();
    bench.forEach((u) => {
      if (u) allUnitIds.add(u.unitId);
    });
    board.forEach((u) => {
      if (!u.isEnemy) allUnitIds.add(u.unitId);
    });

    for (const unitId of allUnitIds) {
      // 1. Check for 3 x 1★ -> 2★
      const board1 = board.filter((u) => !u.isEnemy && u.unitId === unitId && u.stars === 1);
      const bench1 = bench.filter((u): u is UnitInstance => u !== null && u.unitId === unitId && u.stars === 1);
      const total1 = [...board1, ...bench1];

      if (total1.length >= 3) {
        const main = total1[0];
        const toMerge = [total1[1], total1[2]];
        const base = CHAMPION_DATABASE[unitId] || CHAMPION_DATABASE.luffy;

        // Collect items from merged units without losing any
        const mergedItems = [...main.items];
        toMerge.forEach((u) => {
          u.items.forEach((itemId) => {
            const itData = ITEM_DATABASE[itemId];
            const currentBattles = mergedItems.filter((id) => !ITEM_DATABASE[id]?.isSpecialActivation);
            const currentSpecial = mergedItems.find((id) => ITEM_DATABASE[id]?.isSpecialActivation);

            if (itData?.isSpecialActivation) {
              if (!currentSpecial) {
                mergedItems.push(itemId);
              } else {
                refundedItems.push(itemId);
              }
            } else {
              if (currentBattles.length < 2) {
                mergedItems.push(itemId);
              } else {
                refundedItems.push(itemId);
              }
            }
          });
        });

        const upgraded2: UnitInstance = {
          ...main,
          stars: 2,
          hp: Math.round(base.baseHp * 1.8),
          maxHp: Math.round(base.baseHp * 1.8),
          ad: Math.round(base.baseAd * 1.8),
          ap: Math.round(base.baseAp * 1.8),
          items: mergedItems,
        };

        const removeIds = toMerge.map((u) => u.instanceId);

        bench = bench.map((slot) => {
          if (!slot) return null;
          if (slot.instanceId === main.instanceId) return upgraded2;
          if (removeIds.includes(slot.instanceId)) return null;
          return slot;
        });

        board = board
          .map((u) => (u.instanceId === main.instanceId ? upgraded2 : u))
          .filter((u) => !removeIds.includes(u.instanceId));

        lastUpgradedUnit = upgraded2;
        hasChanged = true;
        break; // Re-evaluate from start
      }

      // 2. Check for 3 x 2★ -> 3★
      const board2 = board.filter((u) => !u.isEnemy && u.unitId === unitId && u.stars === 2);
      const bench2 = bench.filter((u): u is UnitInstance => u !== null && u.unitId === unitId && u.stars === 2);
      const total2 = [...board2, ...bench2];

      if (total2.length >= 3) {
        const main = total2[0];
        const toMerge = [total2[1], total2[2]];
        const base = CHAMPION_DATABASE[unitId] || CHAMPION_DATABASE.luffy;

        // Collect items from merged units without losing any
        const mergedItems = [...main.items];
        toMerge.forEach((u) => {
          u.items.forEach((itemId) => {
            const itData = ITEM_DATABASE[itemId];
            const currentBattles = mergedItems.filter((id) => !ITEM_DATABASE[id]?.isSpecialActivation);
            const currentSpecial = mergedItems.find((id) => ITEM_DATABASE[id]?.isSpecialActivation);

            if (itData?.isSpecialActivation) {
              if (!currentSpecial) {
                mergedItems.push(itemId);
              } else {
                refundedItems.push(itemId);
              }
            } else {
              if (currentBattles.length < 2) {
                mergedItems.push(itemId);
              } else {
                refundedItems.push(itemId);
              }
            }
          });
        });

        const upgraded3: UnitInstance = {
          ...main,
          stars: 3,
          hp: Math.round(base.baseHp * 3.2),
          maxHp: Math.round(base.baseHp * 3.2),
          ad: Math.round(base.baseAd * 3.2),
          ap: Math.round(base.baseAp * 3.2),
          items: mergedItems,
        };

        const removeIds = toMerge.map((u) => u.instanceId);

        bench = bench.map((slot) => {
          if (!slot) return null;
          if (slot.instanceId === main.instanceId) return upgraded3;
          if (removeIds.includes(slot.instanceId)) return null;
          return slot;
        });

        board = board
          .map((u) => (u.instanceId === main.instanceId ? upgraded3 : u))
          .filter((u) => !removeIds.includes(u.instanceId));

        lastUpgradedUnit = upgraded3;
        hasChanged = true;
        break; // Re-evaluate from start
      }
    }
  }

  return {
    nextBench: bench,
    nextBoard: board,
    refundedItems,
    upgradedUnit: lastUpgradedUnit,
  };
}

export function calculateActiveSynergies(boardUnits: UnitInstance[]): ActiveSynergy[] {
  // Only count friendly units on board (not enemy, not on bench)
  const playerUnitsOnBoard = boardUnits.filter(u => !u.isEnemy && u.gridX >= 0 && u.gridY >= 0);
  
  // Track unique champion IDs per trait (to avoid duplicates of same champion)
  const traitUnitMap = new Map<TraitId, Set<string>>();
  // Track extra bonus synergy points from equipped synergy chips (e.g. chip_luta, chip_espadachim)
  const traitBonusMap = new Map<TraitId, number>();

  playerUnitsOnBoard.forEach(unit => {
    // 1. Champion native / acquired traits
    unit.traits.forEach(trait => {
      if (!traitUnitMap.has(trait)) {
        traitUnitMap.set(trait, new Set());
      }
      traitUnitMap.get(trait)!.add(unit.unitId);
    });

    // 2. Extra synergy points from equipped synergy items (Chips)
    unit.items.forEach(itemId => {
      const itemData = ITEM_DATABASE[itemId];
      if (itemData?.grantTrait) {
        const t = itemData.grantTrait as TraitId;
        traitBonusMap.set(t, (traitBonusMap.get(t) || 0) + 1);
      }
    });
  });

  const activeSynergies: ActiveSynergy[] = [];

  (Object.keys(SYNERGY_DATABASE) as TraitId[]).forEach(traitId => {
    const synergyDef = SYNERGY_DATABASE[traitId];
    const unitSet = traitUnitMap.get(traitId);
    const unitCount = unitSet ? unitSet.size : 0;
    const bonusFromItems = traitBonusMap.get(traitId) || 0;
    const totalCount = unitCount + bonusFromItems;

    // Find highest tier achieved
    let activeTierIndex = -1;
    synergyDef.tiers.forEach((tier, idx) => {
      if (totalCount >= tier.count) {
        activeTierIndex = idx;
      }
    });

    if (totalCount > 0) {
      activeSynergies.push({
        trait: synergyDef,
        count: totalCount,
        activeTierIndex,
        units: unitSet ? Array.from(unitSet) : [],
      });
    }
  });

  // Sort by active first, then count descending
  return activeSynergies.sort((a, b) => {
    const aActive = a.activeTierIndex >= 0 ? 1 : 0;
    const bActive = b.activeTierIndex >= 0 ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return b.count - a.count;
  });
}

// Calculate the sell value of a unit based on cost and star level
// Rule: 1* = cost, 2* = cost * 2, 3* = cost * 3 (e.g. Luffy cost 1: 1*=1, 2*=2, 3*=3; Zoro cost 2: 1*=2, 2*=4, 3*=6)
export function calculateUnitSellValue(unit: UnitInstance): number {
  return unit.cost * unit.stars;
}

