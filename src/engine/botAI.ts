import { GameDifficulty, StarLevel, UnitInstance } from '../types/game';
import { CHAMPION_DATABASE } from '../data/units';
import { createUnitInstance } from '../utils/gameUtils';

export interface BotOpponent {
  id: string;
  name: string;
  avatarUrl: string;
  theme: string;
  units: string[];
}

export interface BotSynergyArchetype {
  id: string;
  name: string;
  primarySynergies: string[];
  unitPriority: string[];
  preferredItems?: Record<string, string[]>;
  description: string;
}

export const BOT_ARCHETYPES: BotSynergyArchetype[] = [
  {
    id: 'brawlers_fury',
    name: 'Batalhão dos Punhos (Brigão + Paramecia + Zoan)',
    primarySynergies: ['brigao', 'paramecia', 'zoan'],
    unitPriority: ['luffy', 'sanji', 'zoro', 'chopper', 'buggy', 'boa_hancock'],
    preferredItems: {
      luffy: ['armadura_couro', 'escudo_madeira'],
      sanji: ['espada_ferro', 'orbe_despertar'],
      zoro: ['espada_ferro'],
      chopper: ['armadura_couro'],
    },
    description: 'Linha de frente implacável com roubo de vida sustentado e velocidade de ataque acumulativa.',
  },
  {
    id: 'navy_fleet',
    name: 'Esquadra da Marinha (Marinha + Espadachim + Logia)',
    primarySynergies: ['marinha', 'espadachim', 'logia'],
    unitPriority: ['tashigi', 'smoker', 'marine_recruit_1', 'zoro', 'mihawk', 'marine_recruit_2'],
    preferredItems: {
      smoker: ['armadura_couro', 'escudo_madeira'],
      tashigi: ['espada_ferro'],
      mihawk: ['espada_ferro', 'orbe_despertar'],
    },
    description: 'Bônus massivo de armadura e resistência mágica naval (+30), protegendo retaguarda com fumaça.',
  },
  {
    id: 'warlords_cabal',
    name: 'Aliança dos Corsários (Shichibukai + Logia + Espadachim)',
    primarySynergies: ['shichibukai', 'logia', 'espadachim'],
    unitPriority: ['crocodile', 'mihawk', 'smoker', 'boa_hancock', 'zoro', 'buggy'],
    preferredItems: {
      crocodile: ['orbe_despertar'],
      mihawk: ['espada_ferro', 'orbe_despertar'],
      boa_hancock: ['armadura_couro'],
    },
    description: 'Anulação de curas/escudos com Shichibukai e esquiva de golpes físicos com intangibilidade Logia.',
  },
  {
    id: 'blade_masters',
    name: 'Mestres da Lâmina (Espadachim Puro + Marinha + Haki)',
    primarySynergies: ['espadachim', 'marinha', 'haki'],
    unitPriority: ['zoro', 'tashigi', 'mihawk', 'shanks', 'marine_recruit_1', 'smoker'],
    preferredItems: {
      zoro: ['espada_ferro', 'orbe_despertar'],
      mihawk: ['espada_ferro'],
      shanks: ['orbe_despertar', 'espada_ferro'],
    },
    description: 'Tempestade de ataques duplos constantes que perfuram armaduras e decimam frentes.',
  },
  {
    id: 'trickster_pirates',
    name: 'Piratas Trapaceiros (Ladrão + Medroso + Paramecia)',
    primarySynergies: ['ladrao', 'medroso', 'paramecia'],
    unitPriority: ['buggy', 'nami', 'usopp', 'luffy', 'sanji', 'chopper'],
    preferredItems: {
      nami: ['orbe_despertar'],
      buggy: ['escudo_madeira'],
      usopp: ['espada_ferro'],
    },
    description: 'Esquivas traiçoeiras com Medroso, saques constantes de ouro e artilharia de retaguarda.',
  },
];

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

/**
 * Generates enemy board units matching stage, round, totalRound, and selected difficulty.
 * - On Easy: casual champion selection with basic 1-star units.
 * - On Medium: creates cohesive synergy archetypes (Brawlers, Navy, Blade Masters) with tactical front/backline placement.
 * - On Hard: advanced combined synergies, earlier 2-star/3-star promotions, and equipped synergy items.
 */
export function generateEnemyBoardUnits(
  stage: number,
  roundInStage: number,
  totalRound: number = 1,
  difficulty: GameDifficulty = 'medium'
): UnitInstance[] {
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
        createUnitInstance('tashigi', 2, 2, 4, null, true),
        createUnitInstance('marine_recruit_1', 2, 7, 2, null, true),
      ];
    } else if (bossLevel === 3) {
      // Round 18: Boss Rob Lucci / Zoro 3★
      return [
        createUnitInstance('zoro', 3, 5, 2, null, true),
        createUnitInstance('sanji', 2, 5, 1, null, true),
        createUnitInstance('chopper', 2, 5, 4, null, true),
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

  // Determine enemy board slot capacity (strictly balanced with player progression):
  // Round 2: 2 units (player is Level 2 with 2 slots!)
  // Round 3: 2 units (or 3 on Hard to pressure player economy!)
  // Stage 2 (rounds 4-5): 3 units
  // Stage 3 (rounds 7-9): 4 units
  // Stage 4 (rounds 10-12): 4-5 units
  // Stage 5+ (rounds 13+): 5-6 units
  let unitCount = 2;
  if (totalRound === 2) {
    unitCount = 2;
  } else if (totalRound === 3) {
    unitCount = difficulty === 'hard' ? 3 : 2;
  } else if (totalRound <= 5) {
    unitCount = 3;
  } else if (totalRound <= 8) {
    unitCount = 4;
  } else if (totalRound <= 11) {
    unitCount = difficulty === 'hard' ? 5 : 4;
  } else if (totalRound <= 14) {
    unitCount = 5;
  } else {
    unitCount = 6;
  }
  unitCount = Math.min(6, Math.max(2, unitCount));

  // EASY MODE: Casual, randomized pool with 1-star units
  if (difficulty === 'easy') {
    const pool = Object.keys(CHAMPION_DATABASE).filter((k) => !CHAMPION_DATABASE[k].isEnemy);
    const botIdx = (stage * 3 + roundInStage + totalRound) % BOT_OPPONENTS.length;
    const enemyUnits: UnitInstance[] = [];
    const cols = [5, 6, 4, 7];
    const rows = [1, 2, 3, 0, 4];

    for (let i = 0; i < unitCount; i++) {
      const champKey = pool[(botIdx * 3 + i * 2) % pool.length] || 'luffy';
      const col = cols[i % cols.length];
      const row = rows[i % rows.length];
      const stars: StarLevel = totalRound >= 12 && i === 0 ? 2 : 1;
      const unit = createUnitInstance(champKey, stars, col, row, null, true);
      enemyUnits.push(unit);
    }
    return enemyUnits;
  }

  // MEDIUM & HARD MODES: Intelligent synergy-based team construction
  const archetypeIdx = (stage + roundInStage + totalRound) % BOT_ARCHETYPES.length;
  const archetype = BOT_ARCHETYPES[archetypeIdx];

  // Select top N units from the archetype to guarantee synergy activation
  const selectedChamps: string[] = [];
  for (let i = 0; i < unitCount; i++) {
    const champId = archetype.unitPriority[i] || archetype.unitPriority[i % archetype.unitPriority.length];
    if (champId && CHAMPION_DATABASE[champId]) {
      selectedChamps.push(champId);
    } else {
      selectedChamps.push('luffy');
    }
  }

  // Separate frontline (melee, range 1) and backline (ranged, range >= 2)
  const frontlineChamps: string[] = [];
  const backlineChamps: string[] = [];

  selectedChamps.forEach((id) => {
    const base = CHAMPION_DATABASE[id];
    if (base && base.range > 1) {
      backlineChamps.push(id);
    } else {
      frontlineChamps.push(id);
    }
  });

  // Tactical placement slots on board (Enemy territory is columns 4 to 7, rows 0 to 5)
  // Frontline: cols 4 and 5 (clashing directly with player's side)
  // Backline: cols 6 and 7 (sheltered behind frontline)
  const frontlinePositions = [
    { col: 4, row: 2 },
    { col: 4, row: 3 },
    { col: 5, row: 1 },
    { col: 5, row: 4 },
    { col: 4, row: 1 },
    { col: 4, row: 4 },
  ];

  const backlinePositions = [
    { col: 6, row: 2 },
    { col: 6, row: 3 },
    { col: 7, row: 1 },
    { col: 7, row: 4 },
    { col: 6, row: 0 },
    { col: 7, row: 5 },
  ];

  const enemyUnits: UnitInstance[] = [];
  const occupiedTiles = new Set<string>();

  const getValidTile = (preferredList: { col: number; row: number }[]) => {
    for (const pos of preferredList) {
      const key = `${pos.col},${pos.row}`;
      if (!occupiedTiles.has(key)) {
        occupiedTiles.add(key);
        return pos;
      }
    }
    // Fallback search
    for (let c = 4; c <= 7; c++) {
      for (let r = 0; r < 6; r++) {
        const key = `${c},${r}`;
        if (!occupiedTiles.has(key)) {
          occupiedTiles.add(key);
          return { col: c, row: r };
        }
      }
    }
    return { col: 5, row: 2 };
  };

  // Build Frontline Units
  frontlineChamps.forEach((champId, idx) => {
    const pos = getValidTile(frontlinePositions);
    let stars: StarLevel = 1;

    if (difficulty === 'hard') {
      if (idx === 0 && totalRound >= 3) stars = 2;
      else if (idx <= 1 && totalRound >= 6) stars = 2;
      else if (idx <= 2 && totalRound >= 10) stars = 2;
      else if (idx === 0 && totalRound >= 15) stars = 3;
    } else {
      // Medium
      if (idx === 0 && totalRound >= 5) stars = 2;
      else if (idx <= 1 && totalRound >= 9) stars = 2;
      else if (idx <= 2 && totalRound >= 14) stars = 2;
    }

    const unit = createUnitInstance(champId, stars, pos.col, pos.row, null, true);

    // Apply items if in Hard mode or late Medium
    if (difficulty === 'hard' && archetype.preferredItems?.[champId]) {
      const itemsToGive = archetype.preferredItems[champId];
      if (totalRound >= 3 && itemsToGive[0]) {
        unit.items.push(itemsToGive[0]);
        if (itemsToGive[0] === 'orbe_despertar') {
          unit.hasSpecialItem = true;
          unit.orbMana = 40;
        }
      }
      if (totalRound >= 9 && itemsToGive[1]) {
        unit.items.push(itemsToGive[1]);
        if (itemsToGive[1] === 'orbe_despertar') {
          unit.hasSpecialItem = true;
          unit.orbMana = 40;
        }
      }
    } else if (difficulty === 'medium' && idx === 0 && totalRound >= 7) {
      // Medium bot equips 1 thematic item on their main carry
      const itemKey = champId === 'zoro' ? 'espada_ferro' : champId === 'luffy' ? 'armadura_couro' : 'escudo_madeira';
      unit.items.push(itemKey);
    }

    enemyUnits.push(unit);
  });

  // Build Backline Units
  backlineChamps.forEach((champId, idx) => {
    const pos = getValidTile(backlinePositions);
    let stars: StarLevel = 1;

    if (difficulty === 'hard') {
      if (idx === 0 && totalRound >= 4) stars = 2;
      else if (idx <= 1 && totalRound >= 7) stars = 2;
      else if (idx <= 2 && totalRound >= 11) stars = 2;
      else if (idx === 0 && totalRound >= 16) stars = 3;
    } else {
      // Medium
      if (idx === 0 && totalRound >= 6) stars = 2;
      else if (idx <= 1 && totalRound >= 10) stars = 2;
    }

    const unit = createUnitInstance(champId, stars, pos.col, pos.row, null, true);

    // Apply items if in Hard mode
    if (difficulty === 'hard' && archetype.preferredItems?.[champId]) {
      const itemsToGive = archetype.preferredItems[champId];
      if (totalRound >= 3 && itemsToGive[0]) {
        unit.items.push(itemsToGive[0]);
        if (itemsToGive[0] === 'orbe_despertar') {
          unit.hasSpecialItem = true;
          unit.orbMana = 40;
        }
      }
      if (totalRound >= 9 && itemsToGive[1]) {
        unit.items.push(itemsToGive[1]);
        if (itemsToGive[1] === 'orbe_despertar') {
          unit.hasSpecialItem = true;
          unit.orbMana = 40;
        }
      }
    }

    enemyUnits.push(unit);
  });

  return enemyUnits;
}
