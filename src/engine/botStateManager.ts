import { UnitInstance, StarLevel } from '../types/game';
import { CHAMPION_DATABASE } from '../data/units';
import { createUnitInstance } from '../utils/gameUtils';

export interface BotPlayerData {
  commanderId: string;
  name: string;
  avatar: string;
  theme: string;
  boardUnits: UnitInstance[];
  benchUnits: (UnitInstance | null)[];
}

// Predefined thematic champion pools for each bot commander
const BOT_THEME_ROSTERS: Record<string, string[]> = {
  p2_law: ['law', 'chopper', 'bepo', 'robin', 'sanji', 'zoro'],
  p3_kid: ['kid', 'killer', 'heat', 'wire', 'luffy', 'franky'],
  p4_teach: ['blackbeard', 'burgess', 'van_augur', 'doc_q', 'crocodile', 'lucci'],
  p5_bonney: ['bonney', 'luffy', 'sanji', 'nami', 'usopp', 'chopper'],
  p6_bege: ['bege', 'vito', 'gotti', 'mr1', 'crocodile', 'smoker'],
  p7_hawkins: ['hawkins', 'faust', 'zoro', 'tashigi', 'kaku', 'lucci'],
  p8_apoo: ['apoo', 'brook', 'franky', 'usopp', 'buggy', 'nami'],
};

// Fallback pool of player-accessible champions
const ALL_CHAMPS = Object.keys(CHAMPION_DATABASE).filter((k) => !CHAMPION_DATABASE[k].isEnemy);

/**
 * Generates an individualized bot setup with both board units (placed on 0..3) and bench units (0..7).
 * When looking at a bot's arena, their units occupy their player territory (columns 0..3).
 */
export function generateIndividualBotState(commanderId: string, totalRound: number): BotPlayerData {
  const rosterPool = BOT_THEME_ROSTERS[commanderId] || ALL_CHAMPS;
  
  // Units on board scale with totalRound (1 unit at round 1, up to 6 max)
  const boardCount = Math.min(6, Math.max(1, Math.floor((totalRound - 1) / 3) + 1));
  const benchCount = Math.min(4, Math.max(0, Math.floor(totalRound / 4)));

  const boardUnits: UnitInstance[] = [];
  const benchUnits: (UnitInstance | null)[] = Array(8).fill(null);

  // Position board units on the player side (columns 0..3, rows 0..5)
  const startPositions = [
    { x: 1, y: 2 },
    { x: 2, y: 1 },
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 0, y: 2 },
    { x: 0, y: 4 },
  ];

  for (let i = 0; i < boardCount; i++) {
    const champKey = rosterPool[i % rosterPool.length] || ALL_CHAMPS[i % ALL_CHAMPS.length] || 'luffy';
    const pos = startPositions[i % startPositions.length];
    const stars: StarLevel = totalRound >= 14 && i === 0 ? 3 : totalRound >= 6 && i < 2 ? 2 : 1;

    const unit = createUnitInstance(champKey, stars, pos.x, pos.y, null, false);
    boardUnits.push(unit);
  }

  // Populate some bench units
  for (let i = 0; i < benchCount; i++) {
    const champKey = rosterPool[(i + 3) % rosterPool.length] || ALL_CHAMPS[(i + 3) % ALL_CHAMPS.length];
    const unit = createUnitInstance(champKey, 1, -1, -1, i, false);
    benchUnits[i] = unit;
  }

  return {
    commanderId,
    name: commanderId,
    avatar: '🏴‍☠️',
    theme: 'Pirata',
    boardUnits,
    benchUnits,
  };
}
