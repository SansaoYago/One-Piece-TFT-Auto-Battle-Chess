import { UnitInstance, StarLevel, GameDifficulty } from '../types/game';
import { CHAMPION_DATABASE } from '../data/units';
import {
  createUnitInstance,
  THREE_STAR_CHANCE_BY_TIER,
  getEquivalentLevelForRound,
  getAllowedTiersForLevel,
  LEVEL_MAX_SLOTS,
} from '../utils/gameUtils';

export interface BotPlayerData {
  commanderId: string;
  name: string;
  avatar: string;
  theme: string;
  boardUnits: UnitInstance[];
  benchUnits: (UnitInstance | null)[];
}

/**
 * Rosters temáticos de cada Comandante Bot.
 * NOTA CRUCIAL: As unidades estão ordenadas pela curva natural de custo/progressão de jogo:
 * Primeiras posições = Peças de Early Game (Tier 1 & 2).
 * Posições intermediárias = Peças de Mid Game (Tier 3 & 4).
 * Posições finais = Peças de Late Game (Tier 5).
 */
const BOT_THEME_ROSTERS: Record<string, { name: string; avatar: string; theme: string; units: string[] }> = {
  p2_law: {
    name: 'Trafalgar Law',
    avatar: '🩺',
    theme: 'Cirurgiões & Lâminas',
    units: ['zoro', 'luffy', 'buggy', 'chopper', 'sanji', 'mihawk', 'shanks'],
  },
  p3_kid: {
    name: 'Eustass Kid',
    avatar: '🧲',
    theme: 'Força Bruta & Fogo',
    units: ['luffy', 'buggy', 'zoro', 'usopp', 'sanji', 'chopper', 'boa_hancock'],
  },
  p4_teach: {
    name: 'Marshall D. Teach',
    avatar: '🏴‍☠️',
    theme: 'Corsários & Trevas',
    units: ['buggy', 'luffy', 'zoro', 'crocodile', 'boa_hancock', 'mihawk', 'shanks'],
  },
  p5_bonney: {
    name: 'Jewelry Bonney',
    avatar: '🍕',
    theme: 'Gulosos & Brigões',
    units: ['luffy', 'nami', 'buggy', 'zoro', 'usopp', 'sanji', 'chopper'],
  },
  p6_bege: {
    name: 'Capone Bege',
    avatar: '🏰',
    theme: 'Castelo & Máfia Pirata',
    units: ['buggy', 'usopp', 'luffy', 'zoro', 'crocodile', 'sanji', 'mihawk'],
  },
  p7_hawkins: {
    name: 'Basil Hawkins',
    avatar: '🃏',
    theme: 'Espadachins do Destino',
    units: ['zoro', 'buggy', 'usopp', 'chopper', 'sanji', 'mihawk', 'shanks'],
  },
  p8_apoo: {
    name: 'Scratchmen Apoo',
    avatar: '🎵',
    theme: 'Trapaceiros & Truques',
    units: ['buggy', 'nami', 'usopp', 'luffy', 'zoro', 'chopper', 'sanji'],
  },
};

const ALL_VALID_CHAMPS = Object.keys(CHAMPION_DATABASE).filter((k) => !CHAMPION_DATABASE[k].isEnemy);

/**
 * Generates an individualized bot setup with both board units (placed on 0..3) and bench units (0..7).
 * Strictly mirrors player progression and shop odds:
 * - Round 1: Level 2 -> Only Tier 1 units
 * - Round 2-3: Level 3 -> Only Tier 1 & 2 units (NEVER Tier 3 Crocodile/Sanji/Chopper, Tier 4 Mihawk/Boa, or Tier 5 Shanks!)
 * - Round 4-5: Level 4 -> Tier 1, 2 & 3 units (Crocodile unlocks here)
 * - Round 6-11: Level 5-6 -> Tier 1 to 4 units (Mihawk/Boa unlock here; Shanks remains 0%)
 * - Round 12+: Level 7+ -> Tier 5 legendary unlocks (Shanks unlocks here)
 */
export function generateIndividualBotState(
  commanderId: string,
  totalRound: number,
  difficulty: GameDifficulty = 'medium'
): BotPlayerData {
  const botInfo = BOT_THEME_ROSTERS[commanderId] || {
    name: commanderId,
    avatar: '🏴‍☠️',
    theme: 'Pirata',
    units: ALL_VALID_CHAMPS,
  };

  const rosterPool = botInfo.units;

  // 1. Determine bot's equivalent level matching player's XP curve
  const botLevel = getEquivalentLevelForRound(totalRound);

  // 2. Determine allowed tiers according to SHOP_ODDS_BY_LEVEL
  const allowedTiers = getAllowedTiersForLevel(botLevel);

  // 3. Board unit count matches natural board slot progression:
  // Round 1: 1 unit
  // Round 2: 2 units (never exceeds player's 2-3 capacity)
  // Round 3: 2 units (or 3 on Hard)
  // Round 4-5: 3 units
  // Round 6-8: 4 units
  // Round 9-11: 5 units
  // Round 12+: 6 units (board ceiling)
  let boardCount = 2;
  if (totalRound <= 1) boardCount = 1;
  else if (totalRound === 2) boardCount = 2;
  else if (totalRound === 3) boardCount = difficulty === 'hard' ? 3 : 2;
  else if (totalRound <= 5) boardCount = 3;
  else if (totalRound <= 8) boardCount = 4;
  else if (totalRound <= 11) boardCount = 5;
  else boardCount = 6;

  // Guarantee it never exceeds the level's max slots
  const maxSlots = LEVEL_MAX_SLOTS[botLevel] || 3;
  boardCount = Math.min(boardCount, maxSlots);

  const benchCount = Math.min(3, Math.max(0, Math.floor(totalRound / 4)));

  const boardUnits: UnitInstance[] = [];
  const benchUnits: (UnitInstance | null)[] = Array(8).fill(null);

  // 4. Filter theme roster strictly by allowed tiers
  const themeEligible = rosterPool.filter((champKey) => {
    const data = CHAMPION_DATABASE[champKey];
    return data && !data.isEnemy && allowedTiers.has(data.cost);
  });

  // Global fallback pool for any missing slots, also strictly filtered by allowed tiers
  const globalEligible = ALL_VALID_CHAMPS.filter((champKey) => {
    const data = CHAMPION_DATABASE[champKey];
    return data && !data.isEnemy && allowedTiers.has(data.cost);
  });

  // Assemble prioritized candidate pool
  const candidatePool: string[] = [...themeEligible];
  globalEligible.forEach((champKey) => {
    if (!candidatePool.includes(champKey)) {
      candidatePool.push(champKey);
    }
  });

  // Fallback safety if candidate pool is somehow empty
  if (candidatePool.length === 0) {
    candidatePool.push('luffy', 'buggy', 'nami', 'usopp');
  }

  // Position board units on the player side (columns 0..3, rows 0..4)
  // Frontline (cols 2, 3), Backline (cols 0, 1)
  const frontPositions = [
    { x: 3, y: 2 },
    { x: 3, y: 3 },
    { x: 2, y: 1 },
    { x: 2, y: 4 },
    { x: 3, y: 1 },
    { x: 3, y: 4 },
  ];
  const backPositions = [
    { x: 1, y: 2 },
    { x: 1, y: 3 },
    { x: 0, y: 1 },
    { x: 0, y: 4 },
    { x: 1, y: 1 },
    { x: 1, y: 4 },
  ];

  let frontIdx = 0;
  let backIdx = 0;

  for (let i = 0; i < boardCount; i++) {
    const champKey = candidatePool[i % candidatePool.length];
    const base = CHAMPION_DATABASE[champKey];
    const isRanged = base && base.range > 1;

    let pos = isRanged
      ? backPositions[backIdx++ % backPositions.length]
      : frontPositions[frontIdx++ % frontPositions.length];

    // Star level progression strictly aligned with player:
    // Round 1-3: strictly 1★
    // Round 4-6: max one 2★
    // Round 7-11: up to two 2★
    // Round 12+: 2★ common, 3★ rare in hard mode
    let stars: StarLevel = 1;
    if (difficulty === 'hard') {
      if (i === 0 && totalRound >= 4) stars = 2;
      else if (i <= 1 && totalRound >= 7) stars = 2;
      else if (i <= 2 && totalRound >= 11) stars = 2;
      else if (i === 0 && totalRound >= 14) {
        const tier = CHAMPION_DATABASE[champKey]?.cost || 1;
        const chance = THREE_STAR_CHANCE_BY_TIER[tier] ?? 0.50;
        if (Math.random() <= chance) stars = 3;
      }
    } else {
      if (i === 0 && totalRound >= 5) stars = 2;
      else if (i <= 1 && totalRound >= 9) stars = 2;
    }

    const unit = createUnitInstance(champKey, stars, pos.x, pos.y, null, false);
    boardUnits.push(unit);
  }

  // Populate bench units (strictly filtered by allowed tiers)
  for (let i = 0; i < benchCount; i++) {
    const champKey = candidatePool[(i + boardCount) % candidatePool.length];
    const unit = createUnitInstance(champKey, 1, -1, -1, i, false);
    benchUnits[i] = unit;
  }

  return {
    commanderId,
    name: botInfo.name,
    avatar: botInfo.avatar,
    theme: botInfo.theme,
    boardUnits,
    benchUnits,
  };
}
