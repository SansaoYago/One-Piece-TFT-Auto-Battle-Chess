import { UnitInstance, StarLevel, GameDifficulty } from '../types/game';
import { CHAMPION_DATABASE } from '../data/units';
import { createUnitInstance } from '../utils/gameUtils';
import { BOT_ARCHETYPES } from './botAI';

export interface BotPlayerData {
  commanderId: string;
  name: string;
  avatar: string;
  theme: string;
  boardUnits: UnitInstance[];
  benchUnits: (UnitInstance | null)[];
}

// Cohesive thematic synergy rosters mapped to valid champions in CHAMPION_DATABASE
const BOT_THEME_ROSTERS: Record<string, { name: string; avatar: string; theme: string; units: string[] }> = {
  p2_law: {
    name: 'Trafalgar Law',
    avatar: '🩺',
    theme: 'Cirurgiões & Lâminas',
    units: ['zoro', 'tashigi', 'mihawk', 'chopper', 'sanji', 'shanks'],
  },
  p3_kid: {
    name: 'Eustass Kid',
    avatar: '🧲',
    theme: 'Força Bruta & Fogo',
    units: ['luffy', 'sanji', 'zoro', 'chopper', 'buggy', 'boa_hancock'],
  },
  p4_teach: {
    name: 'Marshall D. Teach',
    avatar: '🏴‍☠️',
    theme: 'Corsários & Trevas',
    units: ['crocodile', 'smoker', 'mihawk', 'boa_hancock', 'buggy', 'zoro'],
  },
  p5_bonney: {
    name: 'Jewelry Bonney',
    avatar: '🍕',
    theme: 'Gulosos & Brigões',
    units: ['luffy', 'sanji', 'chopper', 'buggy', 'nami', 'usopp'],
  },
  p6_bege: {
    name: 'Capone Bege',
    avatar: '🏰',
    theme: 'Fortaleza da Marinha',
    units: ['smoker', 'tashigi', 'marine_recruit_1', 'mihawk', 'zoro', 'marine_recruit_2'],
  },
  p7_hawkins: {
    name: 'Basil Hawkins',
    avatar: '🃏',
    theme: 'Espadachins do Destino',
    units: ['zoro', 'tashigi', 'mihawk', 'shanks', 'marine_recruit_1', 'smoker'],
  },
  p8_apoo: {
    name: 'Scratchmen Apoo',
    avatar: '🎵',
    theme: 'Trapaceiros & Truques',
    units: ['buggy', 'nami', 'usopp', 'luffy', 'sanji', 'chopper'],
  },
};

const ALL_VALID_CHAMPS = Object.keys(CHAMPION_DATABASE).filter((k) => !CHAMPION_DATABASE[k].isEnemy);

/**
 * Generates an individualized bot setup with both board units (placed on 0..3) and bench units (0..7).
 * When looking at a bot's arena, their units occupy their player territory (columns 0..3).
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

  // Board unit counts match player natural progression:
  // Round 1: 1 unit
  // Round 2: 2 units
  // Round 3: 2 units (or 3 on Hard)
  // Round 4-5: 3 units
  // Round 6-8: 4 units
  // Round 9-11: 5 units
  // Round 12+: 6 units
  let boardCount = 2;
  if (totalRound <= 1) boardCount = 1;
  else if (totalRound === 2) boardCount = 2;
  else if (totalRound === 3) boardCount = difficulty === 'hard' ? 3 : 2;
  else if (totalRound <= 5) boardCount = 3;
  else if (totalRound <= 8) boardCount = 4;
  else if (totalRound <= 11) boardCount = 5;
  else boardCount = 6;

  const benchCount = Math.min(3, Math.max(0, Math.floor(totalRound / 4)));

  const boardUnits: UnitInstance[] = [];
  const benchUnits: (UnitInstance | null)[] = Array(8).fill(null);

  // Position board units on the player side (columns 0..3, rows 0..4)
  // Frontline (cols 2, 3), Backline (cols 0, 1)
  const frontPositions = [
    { x: 3, y: 2 },
    { x: 3, y: 3 },
    { x: 2, y: 1 },
    { x: 2, y: 4 },
  ];
  const backPositions = [
    { x: 1, y: 2 },
    { x: 1, y: 3 },
    { x: 0, y: 1 },
    { x: 0, y: 4 },
  ];

  let frontIdx = 0;
  let backIdx = 0;

  for (let i = 0; i < boardCount; i++) {
    const champKey = rosterPool[i % rosterPool.length] || ALL_VALID_CHAMPS[i % ALL_VALID_CHAMPS.length];
    const base = CHAMPION_DATABASE[champKey];
    const isRanged = base && base.range > 1;

    let pos = isRanged
      ? backPositions[backIdx++ % backPositions.length]
      : frontPositions[frontIdx++ % frontPositions.length];

    let stars: StarLevel = 1;
    if (difficulty === 'hard') {
      if (i === 0 && totalRound >= 3) stars = 2;
      else if (i <= 1 && totalRound >= 6) stars = 2;
      else if (i <= 2 && totalRound >= 10) stars = 2;
      else if (i === 0 && totalRound >= 15) stars = 3;
    } else {
      if (i === 0 && totalRound >= 5) stars = 2;
      else if (i <= 1 && totalRound >= 9) stars = 2;
    }

    const unit = createUnitInstance(champKey, stars, pos.x, pos.y, null, false);
    boardUnits.push(unit);
  }

  // Populate some bench units
  for (let i = 0; i < benchCount; i++) {
    const champKey = rosterPool[(i + 3) % rosterPool.length] || ALL_VALID_CHAMPS[(i + 3) % ALL_VALID_CHAMPS.length];
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
