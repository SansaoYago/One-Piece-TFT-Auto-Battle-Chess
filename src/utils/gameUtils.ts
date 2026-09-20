import { CHAMPION_DATABASE } from '../data/units';
import { SYNERGY_DATABASE } from '../data/synergies';
import { ITEM_DATABASE } from '../data/items';
import { ActiveSynergy, StarLevel, TraitId, UnitInstance } from '../types/game';

export const LEVEL_XP_REQUIREMENTS: Record<number, number> = {
  1: 2,
  2: 4, // 2 rodadas completas de XP passivo (+2 XP/rd) para atingir Nv. 3
  3: 10, // Exige 5 rodadas de XP passivo ou investimento de 4฿ para Nv. 4
  4: 20, // Requer economia refinada para Nv. 5
  5: 36, // Marco de meio de jogo
  6: 54, // Fase avançada
  7: 76, // Reta final
  8: 999, // Max level
};

export const LEVEL_MAX_SLOTS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4, // Concede 1º Orbe do Despertar
  5: 5,
  6: 6, // Teto máximo de 6 unidades no tabuleiro
  7: 6, // Mantém 6 slots e melhora probabilidades de raros
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

/**
 * Retorna o nível de comandante correspondente a uma rodada do jogo,
 * espelhando exatamente a progressão orgânica do jogador humano.
 * - Round 1: Nível 2
 * - Round 2-3: Nível 3 (como o jogador no início)
 * - Round 4-5: Nível 4
 * - Round 6-8: Nível 5
 * - Round 9-11: Nível 6
 * - Round 12-14: Nível 7
 * - Round 15+: Nível 8
 */
export function getEquivalentLevelForRound(totalRound: number): number {
  if (totalRound <= 1) return 2;
  if (totalRound <= 3) return 3;
  if (totalRound <= 5) return 4;
  if (totalRound <= 8) return 5;
  if (totalRound <= 11) return 6;
  if (totalRound <= 14) return 7;
  return 8;
}

/**
 * Retorna os Tiers (custos de 1 a 5) que possuem probabilidade MAIOR QUE ZERO
 * de aparecer na Loja para o nível informado (SHOP_ODDS_BY_LEVEL).
 * Qualquer tier com 0% de probabilidade é estritamente proibido de ser gerado em bots.
 */
export function getAllowedTiersForLevel(level: number): Set<number> {
  const odds = SHOP_ODDS_BY_LEVEL[level] || [100, 0, 0, 0, 0];
  const allowed = new Set<number>();
  odds.forEach((chance, idx) => {
    if (chance > 0) {
      allowed.add(idx + 1);
    }
  });
  return allowed;
}

/**
 * Alturas oficiais de One Piece (em metros).
 * Chopper: 1.00m (Brain Point / rena pequena, proporcional a Luffy 1.74m)
 * Luffy: 1.74m
 * Nami / Tashigi: 1.70m
 * Usopp: 1.76m
 * Sanji / Marines: 1.80m
 * Zoro: 1.81m
 * Boa Hancock: 1.91m
 * Buggy: 1.92m
 * Mihawk: 1.98m
 * Shanks: 1.99m
 * Smoker: 2.09m (>2m, visivelmente mais alto que 1.74m / 1.85m)
 * Crocodile: 2.53m (grande e imponente Shichibukai)
 * Chopper Monster Point: 3.80m (colosso colossal despertado)
 */
export const CHAMPION_CANONICAL_HEIGHTS: Record<string, number> = {
  chopper: 1.00,
  nami: 1.70,
  tashigi: 1.70,
  luffy: 1.74,
  usopp: 1.76,
  sanji: 1.80,
  marine_recruit_1: 1.80,
  marine_recruit_2: 1.80,
  marine: 1.80,
  zoro: 1.81,
  boa_hancock: 1.91,
  buggy: 1.92,
  mihawk: 1.98,
  shanks: 1.99,
  smoker: 2.09,
  smoke: 2.09,
  rob_lucci_cp9: 2.12,
  cp9_agent_kaku: 1.93,
  cp9_agent_blueno: 2.58,
  morgan_axe_hand: 2.85,
  admiral_kizaru: 3.02,
  marine_capanga_1: 1.80,
  marine_capanga_2: 1.80,
  marine_elite_guard_1: 1.85,
  marine_elite_guard_2: 1.85,
  crocodile: 2.53,
  chopper_monster: 3.00, // Monster Chopper é exatamente 3x Tony Tony Chopper (1.00m)
};

export function getChampionLoreHeightMeters(unitId: string, isTransformed?: boolean): number {
  const normId = (unitId || '').toLowerCase();
  if (normId === 'chopper' && isTransformed) {
    return 3.00; // Monster Chopper: 3.00m (proporção métrica canônica de 3x Chopper 1.00m)
  }
  return CHAMPION_CANONICAL_HEIGHTS[normId] ?? (normId.startsWith('marine') ? 1.80 : 1.75);
}

/**
 * Raio físico real do corpo do campeão no grid contínuo da arena tática.
 * Em vez de tratar o personagem como um "bloco quadrado de 1 tile", cada campeão
 * ocupa o espaço de suas dimensões físicas corporais reais, permitindo que os
 * personagens se aproximem até o contato corpo a corpo real e acertem o corpo
 * do adversário de forma física e precisa (socos, chutes e combos conectando diretamente).
 */
export function getChampionPhysicalRadius(unitId: string, isTransformed?: boolean): number {
  const normId = (unitId || '').toLowerCase();
  if (normId === 'chopper' && isTransformed) {
    return 0.72; // Monster Chopper ocupa 2x2 com sua silhueta imponente
  }
  if (normId === 'chopper') {
    return 0.18; // Brain Point: rena pequena e ágil
  }
  if (normId === 'crocodile') {
    return 0.36; // Shichibukai grande e volumoso com casaco de pele
  }
  if (normId === 'smoker' || normId === 'smoke') {
    return 0.32; // Capitão naval forte (>2.00m)
  }
  if (normId === 'mihawk' || normId === 'shanks' || normId === 'boa_hancock' || normId === 'buggy') {
    return 0.28;
  }
  if (normId === 'zoro') {
    return 0.27; // Espadachim musculoso
  }
  if (normId === 'sanji') {
    return 0.26; // Silhueta atlética e ágil
  }
  if (normId === 'luffy' || normId === 'usopp') {
    return 0.25;
  }
  if (normId === 'nami' || normId === 'tashigi') {
    return 0.23;
  }
  return 0.25;
}

/**
 * Calcula dimensões proporcionais para a exibição 3D do personagem e posicionamento
 * dinâmico da barra de HP na arena tática, com ampla margem de viewport para que
 * chutes, giros de artes marciais, golpes aéreos e armas nunca sofram corte em nenhum container.
 */
export function getChampionTokenDimensions(unitId: string, isTransformed?: boolean) {
  const normId = unitId?.toLowerCase() || '';
  const isMonster = normId === 'chopper' && Boolean(isTransformed);
  const meters = getChampionLoreHeightMeters(unitId, isTransformed);
  const ratio = meters / 1.74; // Razão proporcional referente a Luffy (1.74m)

  if (isMonster) {
    // 2x2 Monster Chopper (3.00m = exatamente 3x Chopper 1.00m):
    // Canvas amplo cobrindo o bloco 2x2 sem cortes
    return {
      meters,
      ratio,
      is2x2: true,
      widthBase: 340,
      heightBase: 380,
      widthSm: 390,
      heightSm: 430,
      widthLg: 440,
      heightLg: 480,
      hudBottomBase: 320,
      hudBottomSm: 370,
      hudBottomLg: 420,
    };
  }

  // Crocodile e personagens muito altos (>2.2m)
  const isTall = meters > 2.2;
  return {
    meters,
    ratio,
    is2x2: false,
    widthBase: isTall ? 220 : 200,
    heightBase: isTall ? 320 : 280,
    widthSm: isTall ? 250 : 230,
    heightSm: isTall ? 360 : 320,
    widthLg: isTall ? 280 : 260,
    heightLg: isTall ? 400 : 360,
    hudBottomBase: Math.round(168 * ratio),
    hudBottomSm: Math.round(192 * ratio),
    hudBottomLg: Math.round(216 * ratio),
  };
}

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
    orbMana: 0,
    maxOrbMana: 250,
    armor: base.baseArmor,
    mr: base.baseMr,
    ad,
    ap,
    attackSpeed: base.attackSpeed,
    
    activeSkill: 'SKILL_A',
    hasSpecialItem: false,
    
    avatarUrl: base.avatarUrl,
    height: base.height || getChampionLoreHeightMeters(base.id),
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

export const THREE_STAR_CHANCE_BY_TIER: Record<number, number> = {
  1: 0.75, // Tier 1 (Cost 1): 75% de chance de atingir 3★ na campanha
  2: 0.68, // Tier 2 (Cost 2): 68% de chance
  3: 0.50, // Tier 3 (Cost 3): 50% de chance
  4: 0.40, // Tier 4 (Cost 4): 40% de chance
  5: 0.25, // Tier 5 (Cost 5): 25% de chance
};

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
      // 1. Check for 3 x 1★ -> 2★ (Always 100% guaranteed)
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

      // 2. Check for 3 x 2★ -> 3★ (Always 100% instant merge to immediately free bench space!)
      const board2 = board.filter((u) => !u.isEnemy && u.unitId === unitId && u.stars === 2);
      const bench2 = bench.filter((u): u is UnitInstance => u !== null && u.unitId === unitId && u.stars === 2);
      const total2 = [...board2, ...bench2];

      if (total2.length >= 3) {
        const base = CHAMPION_DATABASE[unitId] || CHAMPION_DATABASE.luffy;
        const main = total2[0];
        const toMerge = [total2[1], total2[2]];

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

/**
 * Conta quantas cópias de um mesmo campeão o jogador possui no tabuleiro e no banco.
 * (1★ = 1 cópia, 2★ = 3 cópias, 3★ = 9 cópias)
 */
export function countChampionOwnedCopies(
  unitId: string,
  units: (UnitInstance | null)[]
): number {
  let count = 0;
  for (const u of units) {
    if (!u || u.unitId !== unitId || u.isEnemy) continue;
    if (u.stars === 1) count += 1;
    else if (u.stars === 2) count += 3;
    else if (u.stars === 3) count += 9;
  }
  return count;
}

/**
 * Geração de cartas da loja baseada no nível do jogador e na probabilidade de Tier.
 * A dificuldade para atingir 3★ (9 cópias) é controlada exclusivamente na loja:
 * - Simula a diluição de um elenco maior (~30 personagens) para que tiers com poucos
 *   campeões (ex: Shanks sendo o único T5, Zoro/Smoker no T2) não apareçam em demasia.
 * - Conforme o jogador acumula cópias em direção a 3★ (6 a 8 cópias), a taxa de reaparição
 *   naquele tier é ponderada pela porcentagem definida para o tier:
 *   (T1: 75%, T2: 68%, T3: 50%, T4: 40%, T5: 25%).
 * - Quando o campeão já alcançou 3★ (9+ cópias), seu peso na loja é reduzido ao mínimo
 *   para não desperdiçar slots com cartas inúteis.
 */
export function generateShopCards(
  currentLevel: number,
  playerUnits: (UnitInstance | null)[] = []
): (import('../types/game').UnitBaseData | null)[] {
  const allPool = Object.values(CHAMPION_DATABASE).filter((u) => !u.isEnemy);
  const odds = SHOP_ODDS_BY_LEVEL[currentLevel] || [100, 0, 0, 0, 0];
  const cards: import('../types/game').UnitBaseData[] = [];

  for (let slot = 0; slot < 5; slot++) {
    // 1. Rola o Tier de acordo com as probabilidades do nível atual
    const rand = Math.random() * 100;
    let cumulative = 0;
    let selectedTier = 1;

    for (let t = 0; t < odds.length; t++) {
      cumulative += odds[t];
      if (rand <= cumulative) {
        selectedTier = t + 1;
        break;
      }
    }

    let tierPool = allPool.filter((u) => u.tier === selectedTier);
    if (tierPool.length === 0) {
      tierPool = allPool;
    }

    // 2. Pondera cada personagem do tier considerando cópias já adquiridas e dificuldade do Tier
    const weights = tierPool.map((champ) => {
      const owned = countChampionOwnedCopies(champ.id, playerUnits);
      const tierChance = THREE_STAR_CHANCE_BY_TIER[champ.tier] ?? 0.50;

      // Se já atingiu 3★ (9+ cópias): peso residual (quase zero) para liberar espaço para outros campeões
      if (owned >= 9) {
        return 0.05;
      }

      // Reta final para 3★ (6 a 8 cópias - já tem dois 2★):
      // A chance de obter as últimas cópias é ponderada pelo índice do Tier
      if (owned >= 6) {
        return tierChance;
      }

      // Meio do caminho (3 a 5 cópias - já tem um 2★):
      if (owned >= 3) {
        return Math.sqrt(tierChance);
      }

      // 0 a 2 cópias (início):
      // Para simular a diluição como se houvesse ~30 campeões (evita monopólio de Shanks/Zoro):
      if (champ.tier === 5) {
        return tierChance; // Shanks sendo único T5 recebe peso proporcional ao tier
      }
      if (champ.tier === 4) {
        return 0.70;
      }
      if (champ.tier === 2) {
        return 0.80;
      }
      return 1.0;
    });

    // Seleção ponderada
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let r = Math.random() * totalWeight;
    let pickedIndex = 0;

    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        pickedIndex = i;
        break;
      }
    }

    cards.push(tierPool[pickedIndex] || tierPool[0]);
  }

  return cards;
}

export function calculateActiveSynergies(boardUnits: UnitInstance[], forEnemy: boolean = false): ActiveSynergy[] {
  // Only count targeted units on board (not on bench)
  const targetUnits = boardUnits.filter(u => (forEnemy ? u.isEnemy : !u.isEnemy) && u.gridX >= 0 && u.gridY >= 0);
  
  // Track unique champion IDs per trait (to avoid duplicates of same champion)
  const traitUnitMap = new Map<TraitId, Set<string>>();
  // Track extra bonus synergy points from equipped synergy chips (e.g. chip_luta, chip_espadachim)
  const traitBonusMap = new Map<TraitId, number>();

  targetUnits.forEach(unit => {
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

/**
 * Verifica se uma unidade está equipada com o Orbe do Despertar (Ultimate Core) ou item especial equivalente.
 */
export function isUnitEquippedWithOrb(unit: { hasSpecialItem?: boolean; items?: string[] } | null | undefined): boolean {
  if (!unit) return false;
  if (unit.hasSpecialItem) return true;
  if (Array.isArray(unit.items)) {
    return unit.items.some(
      (itemId) => itemId === 'orbe_despertar' || itemId.includes('orbe') || Boolean(ITEM_DATABASE[itemId]?.isSpecialActivation)
    );
  }
  return false;
}

