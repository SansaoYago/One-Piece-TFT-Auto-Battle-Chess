import { Commander, UnitInstance, GameDifficulty } from '../types/game';
import { BotPlayerData, generateIndividualBotState } from './botStateManager';
import { isPvEBossRound } from './botAI';
import { CHAMPION_DATABASE } from '../data/units';

export interface ScheduledBotMatch {
  botAId: string;
  botBId?: string;
  isGhost: boolean;
  finishCountdown: number;
  winnerId: string;
  damageA: number;
  damageB: number;
  isResolved: boolean;
}

export interface RoundMatchmakingResult {
  isPvE: boolean;
  isBoss: boolean;
  bossTitle?: string;
  humanOpponentId: string | null;
  isHumanFightingGhost: boolean;
  humanGhostOriginId?: string;
  opponentName: string;
  opponentAvatar: string;
  opponentTheme?: string;
  botMatches: ScheduledBotMatch[];
}

/**
 * Converts a bot's player-side board units (cols 0..3) to the enemy combat side (cols 4..7)
 */
export function convertBotBoardToEnemyUnits(botUnits: UnitInstance[], isGhost: boolean = false): UnitInstance[] {
  return botUnits
    .filter((u) => u.gridX >= 0 && u.gridY >= 0)
    .map((u) => {
      const base = CHAMPION_DATABASE[u.unitId];
      return {
        ...u,
        instanceId: `enemy_${u.instanceId}_${Math.random().toString(36).substring(2, 7)}`,
        isEnemy: true,
        // Mirror X to opposite board side: 0->7, 1->6, 2->5, 3->4
        gridX: Math.min(7, Math.max(4, 7 - Math.round(u.gridX))),
        gridY: Math.min(4, Math.max(0, Math.round(u.gridY))),
        hp: u.maxHp,
        shield: 0,
        mana: base?.startMana || 0,
        // Optional marker for ghost styling
        isGhostClone: isGhost,
      };
    });
}

/**
 * Rigorous Matchmaking Engine following user rules:
 * 1. Even alive count (8, 6, 4, 2): NEVER has ghosts. 100% direct 1v1 duels!
 *    When 2 players remain (e.g. You vs Eustass Kid), you ALWAYS fight each other directly.
 * 2. Odd alive count (7, 5, 3): Exactly 1 player fights a ghost copy.
 *    The ghost fighter is ALWAYS chosen from the LAST or PENULTIMATE (lowest HP) alive players.
 *    The ghost is an exact clone of a random other alive player.
 * 3. PvE rounds (Round 1, 6, 12, 18, 24...): All players fight PvE monsters/bosses.
 */
export function generateRoundMatchmaking(
  commanders: Commander[],
  stage: number,
  roundInStage: number,
  totalRound: number,
  difficulty: GameDifficulty,
  botPlayerStates: Record<string, BotPlayerData>
): RoundMatchmakingResult {
  const isPvE = totalRound === 1 || isPvEBossRound(totalRound);
  const aliveCommanders = commanders.filter((c) => c.hp > 0 && !c.isEliminated);
  const humanCmd = commanders.find((c) => c.isHuman);

  // If 1 or 0 commanders alive
  if (aliveCommanders.length <= 1) {
    return {
      isPvE: false,
      isBoss: false,
      humanOpponentId: null,
      isHumanFightingGhost: false,
      opponentName: 'Rei dos Piratas',
      opponentAvatar: '👑',
      botMatches: [],
    };
  }

  // === 1. PvE Boss / Minion Round ===
  if (isPvE) {
    const aliveBots = aliveCommanders.filter((c) => !c.isHuman);
    const botMatches: ScheduledBotMatch[] = aliveBots.map((bot) => ({
      botAId: bot.id,
      botBId: 'PVE_ENEMIES',
      isGhost: false,
      finishCountdown:
        totalRound === 1
          ? 35 - (Math.floor(Math.random() * 3) + 3) // In Round 1, minions die in 3-5s (countdown 32..29)
          : Math.floor(Math.random() * 8) + 16,
      winnerId: bot.id,
      damageA: 0,
      damageB: 0,
      isResolved: false,
    }));

    let pveTitle = 'Inimigos PvE';
    let pveAvatar = '⚔️';
    let isBoss = false;
    let bossTitle: string | undefined = undefined;

    if (totalRound === 1) {
      pveTitle = '2 Recrutas da Marinha';
      pveAvatar = '⚓';
      isBoss = false;
    } else {
      isBoss = true;
      const bossNum = Math.floor(totalRound / 6);
      if (bossNum === 1) {
        pveTitle = 'Morgan Mão de Machado & Capangas';
        pveAvatar = '🪓';
        bossTitle = '1º Boss: Shells Town';
      } else if (bossNum === 2) {
        pveTitle = 'Smoker, Tashigi & Recrutas';
        pveAvatar = '💨';
        bossTitle = '2º Boss: Loguetown';
      } else if (bossNum === 3) {
        pveTitle = 'Rob Lucci & Agentes da CP9';
        pveAvatar = '🐆';
        bossTitle = '3º Boss: Enies Lobby';
      } else {
        pveTitle = 'Almirante Kizaru & Elite da Marinha';
        pveAvatar = '✨';
        bossTitle = 'Boss Final: Elite Suprema';
      }
    }

    return {
      isPvE: true,
      isBoss,
      bossTitle,
      humanOpponentId: null,
      isHumanFightingGhost: false,
      opponentName: pveTitle,
      opponentAvatar: pveAvatar,
      opponentTheme: isBoss ? bossTitle : 'Batalha PvE',
      botMatches,
    };
  }

  // === 2. PvP Round Matchmaking ===
  const numAlive = aliveCommanders.length;
  const isOdd = numAlive % 2 !== 0;

  // Sort alive commanders by HP ascending (lowest HP first)
  const sortedByHpAsc = [...aliveCommanders].sort((a, b) => a.hp - b.hp);

  // User Rule: "O jogador fantasma só ocorre para quem sempre estiver em ultimo e penultimo nos turnos que quantidade de jogadores forem impares"
  let ghostFighterId: string | null = null;
  if (isOdd) {
    const last = sortedByHpAsc[0];
    const penultimate = sortedByHpAsc.length > 1 ? sortedByHpAsc[1] : last;
    // Alternate between last and penultimate by round
    ghostFighterId = totalRound % 2 === 0 ? last.id : penultimate.id;
  }

  // Partition commanders:
  // The ghost fighter (if odd) is separated. The other commanders (even count!) are paired 1v1.
  const directCombatants = isOdd && ghostFighterId
    ? aliveCommanders.filter((c) => c.id !== ghostFighterId)
    : [...aliveCommanders];

  const isHumanGhostFighter = isOdd && ghostFighterId === humanCmd?.id;

  let humanOpponentId: string | null = null;
  let isHumanFightingGhost = false;
  let humanGhostOriginId: string | undefined = undefined;

  const pairedBotList: { aId: string; bId: string }[] = [];

  if (isHumanGhostFighter) {
    isHumanFightingGhost = true;
    // Human is last/penultimate and was chosen as ghost fighter:
    // Clone a random other alive player's board
    const potentialOrigins = aliveCommanders.filter((c) => c.id !== humanCmd?.id);
    const origin = potentialOrigins[Math.floor(Math.random() * potentialOrigins.length)] || potentialOrigins[0];
    humanOpponentId = origin.id;
    humanGhostOriginId = origin.id;

    // All direct combatants are bots -> pair them 2 by 2
    const shuffledBots = [...directCombatants].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffledBots.length; i += 2) {
      if (shuffledBots[i] && shuffledBots[i + 1]) {
        pairedBotList.push({ aId: shuffledBots[i].id, bId: shuffledBots[i + 1].id });
      }
    }
  } else {
    // Human is in direct combatants!
    // Human MUST fight a direct real alive bot!
    const availableBots = directCombatants.filter((c) => !c.isHuman);
    const chosenBot = availableBots[Math.floor(Math.random() * availableBots.length)] || availableBots[0];
    humanOpponentId = chosenBot.id;
    isHumanFightingGhost = false;

    // The remaining direct combatants (excluding human and chosenBot) are paired 2 by 2
    const otherBots = directCombatants.filter((c) => c.id !== humanCmd?.id && c.id !== chosenBot.id);
    const shuffledBots = [...otherBots].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffledBots.length; i += 2) {
      if (shuffledBots[i] && shuffledBots[i + 1]) {
        pairedBotList.push({ aId: shuffledBots[i].id, bId: shuffledBots[i + 1].id });
      }
    }
  }

  // Create scheduled matches for bot arenas
  const botMatches: ScheduledBotMatch[] = [];

  // Direct bot vs bot matches
  for (const pair of pairedBotList) {
    const finishCd = Math.floor(Math.random() * 14) + 10;
    const aWins = Math.random() >= 0.5;
    const dmg = stage * 2 + Math.floor(Math.random() * 4) + 2;
    botMatches.push({
      botAId: pair.aId,
      botBId: pair.bId,
      isGhost: false,
      finishCountdown: finishCd,
      winnerId: aWins ? pair.aId : pair.bId,
      damageA: aWins ? 0 : dmg,
      damageB: aWins ? dmg : 0,
      isResolved: false,
    });
  }

  // If a bot is the ghostFighter (not human):
  if (isOdd && ghostFighterId && ghostFighterId !== humanCmd?.id) {
    const finishCd = Math.floor(Math.random() * 12) + 12;
    const botWins = Math.random() >= 0.45;
    const dmg = stage * 2 + Math.floor(Math.random() * 4) + 2;
    botMatches.push({
      botAId: ghostFighterId,
      botBId: 'GHOST_CLONE',
      isGhost: true,
      finishCountdown: finishCd,
      winnerId: botWins ? ghostFighterId : 'GHOST_CLONE',
      damageA: botWins ? 0 : dmg,
      damageB: 0, // Clones never take damage
      isResolved: false,
    });
  }

  const oppCmd = commanders.find((c) => c.id === humanOpponentId);

  return {
    isPvE: false,
    isBoss: false,
    humanOpponentId,
    isHumanFightingGhost,
    humanGhostOriginId,
    opponentName: isHumanFightingGhost
      ? `👻 [FANTASMA] ${oppCmd?.name || 'Inimigo'}`
      : oppCmd?.name || 'Inimigo',
    opponentAvatar: oppCmd?.avatar || '⚔️',
    opponentTheme: isHumanFightingGhost ? 'Cópia Fantasma de Tripulação' : oppCmd?.title,
    botMatches,
  };
}
