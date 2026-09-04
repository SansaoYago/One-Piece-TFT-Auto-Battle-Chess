import { StarLevel, UnitInstance } from '../types/game';
import { CHAMPION_DATABASE } from '../data/units';
import { createUnitInstance } from '../utils/gameUtils';

export interface BotOpponent {
  id: string;
  name: string;
  avatarUrl: string;
  theme: string;
  units: string[];
}

export const BOT_OPPONENTS: BotOpponent[] = [
  {
    id: 'bot-1',
    name: 'Buggy o Palhaço',
    avatarUrl: '🤡',
    theme: 'Piratas de Buggy',
    units: ['buggy', 'alvida', 'cabaji', 'mohnji'],
  },
  {
    id: 'bot-2',
    name: 'Capitão Kuro',
    avatarUrl: '👓',
    theme: 'Gato Preto',
    units: ['kuro', 'jango', 'sham', 'buchi'],
  },
  {
    id: 'bot-3',
    name: 'Don Krieg',
    avatarUrl: '🛡️',
    theme: 'Armada Pirata',
    units: ['krieg', 'gin', 'pearl', 'sanji'],
  },
  {
    id: 'bot-4',
    name: 'Arlong',
    avatarUrl: '🦈',
    theme: 'Homens-Peixe',
    units: ['arlong', 'hatchan', 'kuroobi', 'chew'],
  },
  {
    id: 'bot-5',
    name: 'Smoker & Tashigi',
    avatarUrl: '💨',
    theme: 'Marinha G-5',
    units: ['smoker', 'tashigi', 'coby', 'helmeppo'],
  },
  {
    id: 'bot-6',
    name: 'Sir Crocodile',
    avatarUrl: '🐊',
    theme: 'Baroque Works',
    units: ['crocodile', 'mr1', 'mr2', 'mr3', 'robin'],
  },
  {
    id: 'bot-7',
    name: 'Rob Lucci',
    avatarUrl: '🐆',
    theme: 'CP9 Governo',
    units: ['lucci', 'kaku', 'jabra', 'blueno', 'kalifa'],
  },
];

// Helper to check if current round is a PvE Boss / Special PvE round
export function isPvEBossRound(totalRound: number): boolean {
  return totalRound === 1 || totalRound % 6 === 0;
}

// Helper to generate enemy units according to current stage, roundInStage & totalRound
export function generateEnemyBoardUnits(stage: number, roundInStage: number, totalRound: number = 1): UnitInstance[] {
  // Round 1: PvE Initial 2 basic recruits
  if (totalRound === 1) {
    return [
      createUnitInstance('marine_recruit_1', 1, 5, 2, null, true),
      createUnitInstance('marine_recruit_2', 1, 6, 4, null, true),
    ];
  }

  // Boss PvE Rounds: 6, 12, 18, 24, 30...
  if (totalRound % 6 === 0) {
    const bossLevel = Math.floor(totalRound / 6);
    if (bossLevel === 1) {
      // Round 6: Mini-Boss Smoker 2★ + Recrutas
      return [
        createUnitInstance('smoker', 2, 5, 2, null, true),
        createUnitInstance('marine_recruit_1', 1, 6, 1, null, true),
        createUnitInstance('marine_recruit_2', 1, 6, 4, null, true),
      ];
    } else if (bossLevel === 2) {
      // Round 12: Boss Crocodile 2★ + Baroque Works
      return [
        createUnitInstance('crocodile', 2, 5, 2, null, true),
        createUnitInstance('buggy', 2, 6, 1, null, true),
        createUnitInstance('tashigi', 2, 6, 4, null, true),
        createUnitInstance('marine_recruit_1', 2, 7, 2, null, true),
      ];
    } else if (bossLevel === 3) {
      // Round 18: Boss Rob Lucci / Zoro 3★
      return [
        createUnitInstance('zoro', 3, 5, 2, null, true),
        createUnitInstance('sanji', 2, 6, 1, null, true),
        createUnitInstance('chopper', 2, 6, 4, null, true),
        createUnitInstance('smoker', 2, 7, 3, null, true),
      ];
    } else {
      // Round 24+: Boss Shanks / Mihawk
      return [
        createUnitInstance('shanks', 2, 5, 2, null, true),
        createUnitInstance('mihawk', 2, 6, 3, null, true),
        createUnitInstance('crocodile', 2, 6, 1, null, true),
        createUnitInstance('zoro', 2, 7, 4, null, true),
      ];
    }
  }

  // Regular PvP Rounds
  const botIdx = (stage * 3 + roundInStage + totalRound) % BOT_OPPONENTS.length;
  const unitCount = Math.min(6, Math.max(2, Math.min(stage + 1, Math.floor(totalRound / 3) + 1)));
  const pool = Object.keys(CHAMPION_DATABASE).filter((k) => !CHAMPION_DATABASE[k].isEnemy);

  const enemyUnits: UnitInstance[] = [];
  const startCols = [5, 6, 4, 7];
  const startRows = [1, 2, 3, 4, 0, 5];

  for (let i = 0; i < unitCount; i++) {
    const champKey = pool[(botIdx * 3 + i * 2) % pool.length] || 'luffy';
    const col = startCols[i % startCols.length];
    const row = startRows[i % startRows.length];
    const stars: StarLevel = totalRound >= 12 && i === 0 ? 2 : totalRound >= 7 && i < 2 ? 2 : 1;

    const unit = createUnitInstance(champKey, stars, col, row, null, true);
    enemyUnits.push(unit);
  }

  return enemyUnits;
}
