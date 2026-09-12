import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Commander,
  GamePhase,
  ItemData,
  UnitBaseData,
  UnitInstance,
  GameDifficulty,
  DIFFICULTY_CONFIGS,
} from './types/game';
import { AttackEffect, CombatUnitState, FloatingText, TheftEvent } from './types/combat';
import { CHAMPION_DATABASE } from './data/units';
import { INITIAL_COMMANDERS, ITEM_DATABASE } from './data/items';
import {
  createUnitInstance,
  calculateActiveSynergies,
  calculateUnitSellValue,
  performStarUpgrades,
  LEVEL_XP_REQUIREMENTS,
  LEVEL_MAX_SLOTS,
  SHOP_ODDS_BY_LEVEL,
} from './utils/gameUtils';
import { initializeCombatUnits, simulateCombatTick } from './engine/combatEngine';
import { generateEnemyBoardUnits, BOT_OPPONENTS, isPvEBossRound } from './engine/botAI';
import { generateIndividualBotState, BotPlayerData } from './engine/botStateManager';
import { Header } from './components/Header';
import { PlayerList } from './components/PlayerList';
import { RightSidebar } from './components/RightSidebar';
import { ArenaBoard } from './components/ArenaBoard';
import { Bench } from './components/Bench';
import { ShopModal } from './components/ShopModal';
import { UnitInspector } from './components/UnitInspector';
import { AnimationTestBar } from './components/AnimationTestBar';
import { ItemDraftModal } from './components/ItemDraftModal';
import { GameOverModal } from './components/GameOverModal';
import { DifficultyModal } from './components/DifficultyModal';
import { LoadingScreen } from './components/LoadingScreen';
import { OrientationGuard } from './components/OrientationGuard';
import { TheftBannerNotification } from './components/TheftBannerNotification';
import { preloadAllGameAssets, warmupRoundCombatAssets, loadChampionModularRig } from './utils/modelPreloader';
import { Sparkles, Trophy, Skull, Coins, Zap } from 'lucide-react';
import { RoundOutcomeBanner } from './components/RoundOutcomeBanner';

interface ScheduledBotMatch {
  botAId: string;
  botBId?: string;
  finishCountdown: number;
  winnerId: string;
  damageA: number;
  damageB: number;
  isResolved: boolean;
}

export default function App() {
  // === Global Preloading Pipeline State ===
  const [isAssetsLoading, setIsAssetsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingAssetLabel, setLoadingAssetLabel] = useState<string>('Iniciando Pipeline de Ativos 3D...');

  // === Game Lifecycle State ===
  const [phase, setPhase] = useState<GamePhase>('PREPARATION');
  const [countdown, setCountdown] = useState<number>(30); // 30s Preparation timer as standard
  const [totalGameTime, setTotalGameTime] = useState<number>(0);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [totalRound, setTotalRound] = useState<number>(1);
  const [stage, setStage] = useState<number>(1);
  const [roundInStage, setRoundInStage] = useState<number>(1);
  const [roundStage, setRoundStage] = useState<string>('1-1');
  const [roundTitle, setRoundTitle] = useState<string>('PvE: 2 Recrutas da Marinha');
  const [winStreak, setWinStreak] = useState<number>(0);
  const [lossStreak, setLossStreak] = useState<number>(0);
  const [lastRoundIncome, setLastRoundIncome] = useState<{ base: number; interest: number; streak: number; win: number; total: number }>({
    base: 5,
    interest: 0,
    streak: 0,
    win: 0,
    total: 5,
  });

  // === Player Economy & Progress State ===
  // === Game Difficulty State ===
  const [difficulty, setDifficulty] = useState<GameDifficulty>('medium');
  const difficultyRef = useRef<GameDifficulty>('medium');
  const [isDifficultyLocked, setIsDifficultyLocked] = useState<boolean>(false);
  const [isDifficultyModalOpen, setIsDifficultyModalOpen] = useState<boolean>(false);

  const handleSelectDifficulty = (newDiff: GameDifficulty) => {
    if (isDifficultyLocked) return;
    setDifficulty(newDiff);
    difficultyRef.current = newDiff;
    // In initial preparation round 1-1, adjust starting gold to match difficulty config
    if (stageRef.current === 1 && roundInStageRef.current === 1 && phaseRef.current === 'PREPARATION') {
      const startGold = DIFFICULTY_CONFIGS[newDiff].initialGold;
      setGold(startGold);
      goldRef.current = startGold;
    }
  };

  const [gold, setGold] = useState<number>(4); // Initial starting budget
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(0);
  const [lastRoundXp, setLastRoundXp] = useState<number>(2);
  const [commanders, setCommanders] = useState<Commander[]>(INITIAL_COMMANDERS);
  const [playerItems, setPlayerItems] = useState<string[]>([]); // Starts with 0 items

  // === Item Draft & Rewards State ===
  const [isItemDraftOpen, setIsItemDraftOpen] = useState<boolean>(false);
  const [isBossDraft, setIsBossDraft] = useState<boolean>(false);
  const [draftRoundNumber, setDraftRoundNumber] = useState<number>(3);
  const [draftedRounds, setDraftedRounds] = useState<number[]>([]);

  // === Game Over / Spectator State ===
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState<boolean>(false);
  const [isSpectating, setIsSpectating] = useState<boolean>(false);
  const [userPlacementRank, setUserPlacementRank] = useState<number>(8);
  const [viewingCommanderId, setViewingCommanderId] = useState<string>('p1_human');
  const [botPlayerStates, setBotPlayerStates] = useState<Record<string, BotPlayerData>>({});

  // === Units and Board State ===
  const [boardUnits, setBoardUnits] = useState<UnitInstance[]>(() => {
    // Arena do jogador inicia totalmente vazia.
    // Lado inimigo na 1ª rodada inicia apenas com os 2 marinheiros iniciais
    const pveEnemies = generateEnemyBoardUnits(1, 1, 1, 'medium');
    return [...pveEnemies];
  });

  // Bench slots (8 slots)
  const [benchSlots, setBenchSlots] = useState<(UnitInstance | null)[]>(() => {
    const slots: (UnitInstance | null)[] = Array(8).fill(null);
    // Inicia com apenas 1 personagem aleatório de Tier 1 no banco
    const tier1Champions = ['luffy', 'nami', 'usopp', 'buggy', 'tashigi'];
    const randomChamp = tier1Champions[Math.floor(Math.random() * tier1Champions.length)];
    slots[0] = createUnitInstance(randomChamp, 1, -1, -1, 0, false);
    return slots;
  });

  // === Real-Time Combat Simulation State ===
  const [isCombatStarting, setIsCombatStarting] = useState<boolean>(false);
  const [combatWarmupCountdown, setCombatWarmupCountdown] = useState<number>(3);
  const warmupTimersRef = useRef<NodeJS.Timeout[]>([]);
  const [combatUnits, setCombatUnits] = useState<CombatUnitState[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [attackEffects, setAttackEffects] = useState<AttackEffect[]>([]);
  const [battleOutcome, setBattleOutcome] = useState<'VICTORY' | 'DEFEAT' | 'DRAW' | null>(null);
  const [roundDamageTaken, setRoundDamageTaken] = useState<number>(0);
  const scheduledBotMatchesRef = useRef<ScheduledBotMatch[]>([]);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const combatLoopRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(Date.now());
  const [activeTheftEvent, setActiveTheftEvent] = useState<TheftEvent | null>(null);
  const theftTrackerRef = useRef<{ player: boolean; enemy: boolean }>({ player: false, enemy: false });

  // Selection & Inspector Modal
  const [selectedUnit, setSelectedUnit] = useState<UnitInstance | null>(null);
  const [selectedSynergyId, setSelectedSynergyId] = useState<string | null>(null);
  const [changedSkillUnitIdThisRound, setChangedSkillUnitIdThisRound] = useState<string | null>(null);

  // === Character Animation Test Mode State ===
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const [testAnimationOverride, setTestAnimationOverride] = useState<string | null>(null);
  const isTestModeRef = useRef<boolean>(false);
  isTestModeRef.current = isTestMode;

  // Complete roster of champions for test mode bench
  const allTestChampions = useMemo(() => {
    const championKeys = Object.keys(CHAMPION_DATABASE);
    return championKeys.map((unitId, index) =>
      createUnitInstance(unitId, 1, -1, -1, index, false)
    );
  }, []);

  // Shop State
  const [isShopOpen, setIsShopOpen] = useState<boolean>(true);
  const [isShopLocked, setIsShopLocked] = useState<boolean>(false);
  const [shopCards, setShopCards] = useState<(UnitBaseData | null)[]>([]);

  // Drag-and-Drop Active Transfer State
  const [draggedUnit, setDraggedUnit] = useState<UnitInstance | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const draggedUnitRef = useRef<UnitInstance | null>(null);
  const draggedItemIdRef = useRef<string | null>(null);

  // Keep live references to state to prevent stale closures during timer and animation callbacks
  const boardUnitsRef = useRef(boardUnits);
  boardUnitsRef.current = boardUnits;
  const testEditModeBoardRef = useRef<UnitInstance[]>([]);
  const benchSlotsRef = useRef(benchSlots);
  benchSlotsRef.current = benchSlots;
  const levelRef = useRef(level);
  levelRef.current = level;
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const roundInStageRef = useRef(roundInStage);
  roundInStageRef.current = roundInStage;
  const totalRoundRef = useRef(totalRound);
  totalRoundRef.current = totalRound;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const goldRef = useRef(gold);
  goldRef.current = gold;
  const winStreakRef = useRef(winStreak);
  winStreakRef.current = winStreak;
  const lossStreakRef = useRef(lossStreak);
  lossStreakRef.current = lossStreak;
  const isShopLockedRef = useRef(isShopLocked);
  isShopLockedRef.current = isShopLocked;

  // Track active viewing commander and whether player is currently scouting an opponent
  const isViewingOpponentArena = viewingCommanderId !== 'p1_human';
  const viewingCommander = useMemo(() => {
    return commanders.find((c) => c.id === viewingCommanderId) || commanders[0];
  }, [commanders, viewingCommanderId]);

  // Keep bot states updated for each round
  useEffect(() => {
    const states: Record<string, BotPlayerData> = {};
    commanders.forEach((cmd) => {
      if (!cmd.isHuman) {
        states[cmd.id] = generateIndividualBotState(cmd.id, totalRound, difficultyRef.current || 'medium');
      }
    });
    setBotPlayerStates(states);
  }, [totalRound, commanders]);

  // Global drag cleanup listener to prevent drag state getting stuck if mouse is released anywhere
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setDraggedUnit(null);
      setDraggedItemId(null);
    };

    window.addEventListener('dragend', handleGlobalDragEnd);
    window.addEventListener('drop', handleGlobalDragEnd);
    window.addEventListener('pointerup', handleGlobalDragEnd);
    window.addEventListener('mouseup', handleGlobalDragEnd);

    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd);
      window.removeEventListener('drop', handleGlobalDragEnd);
      window.removeEventListener('pointerup', handleGlobalDragEnd);
      window.removeEventListener('mouseup', handleGlobalDragEnd);
    };
  }, []);

  // Global 3D Model and Animation Preloading Pipeline (Blocks UI until 100% loaded)
  useEffect(() => {
    let isCancelled = false;
    preloadAllGameAssets((percent, label) => {
      if (!isCancelled) {
        setLoadingProgress(percent);
        setLoadingAssetLabel(label);
      }
    }).then(() => {
      if (!isCancelled) {
        setLoadingProgress(100);
        setLoadingAssetLabel('Arena Pronta para Combate!');
        setTimeout(() => {
          if (!isCancelled) {
            setIsAssetsLoading(false);
          }
        }, 400);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Determine what board and bench units are currently shown on the screen
  const displayedBoardUnits = useMemo(() => {
    if (isViewingOpponentArena) {
      const botData = botPlayerStates[viewingCommanderId];
      if (botData) {
        return botData.boardUnits;
      }
      return [];
    }
    return boardUnits;
  }, [isViewingOpponentArena, viewingCommanderId, botPlayerStates, boardUnits]);

  const displayedBenchSlots = useMemo(() => {
    if (isViewingOpponentArena) {
      const botData = botPlayerStates[viewingCommanderId];
      if (botData) {
        return botData.benchUnits;
      }
      return Array(8).fill(null);
    }
    return benchSlots;
  }, [isViewingOpponentArena, viewingCommanderId, botPlayerStates, benchSlots]);

  // XP & Slot Cap progression (PRD 3.4 rule: 1, 2, 3, 3, 4, 5, 6, 6)
  const xpNeeded = LEVEL_XP_REQUIREMENTS[level] || 999;
  const maxBoardUnits = LEVEL_MAX_SLOTS[level] || 1;
  const playerUnitsOnBoard = displayedBoardUnits.filter((u) => !u.isEnemy && u.gridX >= 0 && u.gridY >= 0);

  // Calculate active synergies dynamically
  const activeSynergies = useMemo(() => {
    return calculateActiveSynergies(displayedBoardUnits);
  }, [displayedBoardUnits]);

  // Is Overtime active (at 15s remaining or less during combat)
  const isOvertime = phase === 'COMBAT' && countdown <= 15;

  // === Reroll / Generate Shop Cards Based on Level Odds ===
  const generateShopCards = useCallback(
    (currentLevel: number): (UnitBaseData | null)[] => {
      const allPool = Object.values(CHAMPION_DATABASE).filter((u) => !u.isEnemy);
      const odds = SHOP_ODDS_BY_LEVEL[currentLevel] || [100, 0, 0, 0, 0];
      const cards: UnitBaseData[] = [];

      for (let i = 0; i < 5; i++) {
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

        const tierPool = allPool.filter((u) => u.tier === selectedTier);
        const picked =
          tierPool.length > 0
            ? tierPool[Math.floor(Math.random() * tierPool.length)]
            : allPool[Math.floor(Math.random() * allPool.length)];

        cards.push(picked);
      }

      return cards;
    },
    []
  );

  // Initialize shop once on initial game mount only
  useEffect(() => {
    setShopCards(generateShopCards(1));
  }, [generateShopCards]);

  // Automatic Star Upgrades check (e.g. merging existing 3x 2★ into 3★)
  useEffect(() => {
    if (phase === 'PREPARATION') {
      const upgradeRes = performStarUpgrades(benchSlotsRef.current, boardUnitsRef.current);
      if (upgradeRes.upgradedUnit) {
        setBenchSlots(upgradeRes.nextBench);
        benchSlotsRef.current = upgradeRes.nextBench;
        setBoardUnits(upgradeRes.nextBoard);
        boardUnitsRef.current = upgradeRes.nextBoard;
        if (upgradeRes.refundedItems.length > 0) {
          setPlayerItems((prev) => [...prev, ...upgradeRes.refundedItems]);
        }
      }
    }
  }, [phase]);

  // === Phase Transition Helper ===
  const startCombatPhase = () => {
    // Clear any previous warmup or auto-advance timers
    warmupTimersRef.current.forEach(clearTimeout);
    warmupTimersRef.current = [];
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    // Retract shop drawer when combat commences so the battlefield is clear and unhindered
    setIsShopOpen(false);

    setPhase('COMBAT');
    setCountdown(35); // 35s combat timer
    setBattleOutcome(null);
    setRoundDamageTaken(0);
    setFloatingTexts([]);
    setAttackEffects([]);
    setActiveTheftEvent(null);
    theftTrackerRef.current = { player: false, enemy: false };

    // Auto-fill player board with bench units if player has empty slots (using latest ref values)
    let updatedBoard = [...boardUnitsRef.current];
    let updatedBench = [...benchSlotsRef.current];

    const currentLevel = levelRef.current;
    const currentMaxSlots = LEVEL_MAX_SLOTS[currentLevel] || 1;
    const playerBoardUnits = updatedBoard.filter((u) => !u.isEnemy && u.gridX >= 0 && u.gridY >= 0);
    const missingSlots = currentMaxSlots - playerBoardUnits.length;

    if (missingSlots > 0) {
      const occupiedCoords = new Set(
        updatedBoard.filter((u) => u.gridX >= 0 && u.gridY >= 0).map((u) => `${u.gridX},${u.gridY}`)
      );

      // Player territory coordinates ordered from front line to back line
      const candidateTiles: { x: number; y: number }[] = [];
      for (const col of [2, 1, 0, 3]) {
        for (const row of [2, 3, 1, 4, 0, 5]) {
          if (!occupiedCoords.has(`${col},${row}`)) {
            candidateTiles.push({ x: col, y: row });
          }
        }
      }

      let filledCount = 0;
      let tileIdx = 0;

      for (let bIdx = 0; bIdx < updatedBench.length; bIdx++) {
        if (filledCount >= missingSlots) break;
        const bUnit = updatedBench[bIdx];
        if (bUnit && tileIdx < candidateTiles.length) {
          const targetTile = candidateTiles[tileIdx++];
          const movedUnit: UnitInstance = {
            ...bUnit,
            gridX: targetTile.x,
            gridY: targetTile.y,
            benchIndex: null,
          };
          updatedBoard.push(movedUnit);
          updatedBench[bIdx] = null;
          occupiedCoords.add(`${targetTile.x},${targetTile.y}`);
          filledCount++;
        }
      }

      setBenchSlots(updatedBench);
      benchSlotsRef.current = updatedBench;
      setBoardUnits(updatedBoard);
      boardUnitsRef.current = updatedBoard;
    }

    // Ensure enemies are loaded for combat (if this round was PvP and didn't pre-place them during prep)
    let combatBoardUnits = [...updatedBoard];
    const existingEnemies = combatBoardUnits.filter((u) => u.isEnemy && u.gridX >= 0 && u.gridY >= 0);

    if (existingEnemies.length === 0) {
      const generatedEnemies = generateEnemyBoardUnits(
        stageRef.current,
        roundInStageRef.current,
        totalRoundRef.current,
        difficultyRef.current || 'medium'
      );
      combatBoardUnits = [...combatBoardUnits, ...generatedEnemies];
    }

    // Lock difficulty once combat begins
    setIsDifficultyLocked(true);

    // Initialize units for battle (captures all active combatants with difficulty scaling)
    const activeBoardUnits = combatBoardUnits.filter((u) => u.gridX >= 0 && u.gridY >= 0);
    const diffConfig = DIFFICULTY_CONFIGS[difficultyRef.current || 'medium'];
    const initialCombat = initializeCombatUnits(activeBoardUnits, {
      hp: diffConfig.enemyHpMultiplier,
      ad: diffConfig.enemyAdMultiplier,
    });
    setCombatUnits(initialCombat);

    // Mark all living commanders as 'FIGHTING'
    setCommanders((prevCmds) =>
      prevCmds.map((c) => ({
        ...c,
        roundCombatStatus: c.hp > 0 ? ('FIGHTING' as const) : undefined,
        damageTakenThisRound: 0,
      }))
    );

    // Setup bot matchups schedule for other arenas
    const isPvERound = stageRef.current === 1 || isPvEBossRound(totalRoundRef.current);
    const aliveBots = commanders.filter((c) => !c.isHuman && c.hp > 0);
    const scheduled: ScheduledBotMatch[] = [];

    if (isPvERound) {
      aliveBots.forEach((bot) => {
        const finishCd = Math.floor(Math.random() * 12) + 12; // finish between 12s and 24s
        scheduled.push({
          botAId: bot.id,
          finishCountdown: finishCd,
          winnerId: bot.id,
          damageA: 0,
          damageB: 0,
          isResolved: false,
        });
      });
    } else {
      const opponentCmdId = BOT_OPPONENTS[(totalRoundRef.current - 1) % BOT_OPPONENTS.length] || aliveBots[0]?.id;
      const otherBots = aliveBots.filter((b) => b.id !== opponentCmdId);

      for (let i = 0; i < otherBots.length; i += 2) {
        const b1 = otherBots[i];
        const b2 = otherBots[i + 1];
        if (b1 && b2) {
          const finishCd = Math.floor(Math.random() * 15) + 10;
          const b1Wins = Math.random() >= 0.5;
          const dmg = stageRef.current * 2 + Math.floor(Math.random() * 4) + 2;
          scheduled.push({
            botAId: b1.id,
            botBId: b2.id,
            finishCountdown: finishCd,
            winnerId: b1Wins ? b1.id : b2.id,
            damageA: b1Wins ? 0 : dmg,
            damageB: b1Wins ? dmg : 0,
            isResolved: false,
          });
        } else if (b1) {
          const finishCd = Math.floor(Math.random() * 12) + 12;
          const wins = Math.random() >= 0.4;
          const dmg = stageRef.current * 2 + Math.floor(Math.random() * 4) + 2;
          scheduled.push({
            botAId: b1.id,
            finishCountdown: finishCd,
            winnerId: wins ? b1.id : 'ENEMY',
            damageA: wins ? 0 : dmg,
            damageB: 0,
            isResolved: false,
          });
        }
      }
    }
    scheduledBotMatchesRef.current = scheduled;

    // Start Round Warmup & Countdown
    setIsCombatStarting(true);
    setCombatWarmupCountdown(3);

    // Warm up and pre-decode all assets for this specific round in background
    warmupRoundCombatAssets(activeBoardUnits.map((u) => u.unitId));

    // Dynamic 3... 2... 1... LUTEM! countdown
    const t1 = setTimeout(() => {
      setCombatWarmupCountdown(2);
    }, 1000);

    const t2 = setTimeout(() => {
      setCombatWarmupCountdown(1);
    }, 2000);

    const t3 = setTimeout(() => {
      setCombatWarmupCountdown(0); // "LUTEM!"
    }, 3000);

    const t4 = setTimeout(() => {
      setIsCombatStarting(false);
      lastTickTimeRef.current = Date.now();
    }, 3700);

    warmupTimersRef.current = [t1, t2, t3, t4];
  };

  const endCombatAndAdvanceRound = (winner: 'PLAYER' | 'ENEMY' | 'DRAW') => {
    if (combatLoopRef.current) {
      cancelAnimationFrame(combatLoopRef.current);
      combatLoopRef.current = null;
    }

    const isWin = winner === 'PLAYER';
    const isDraw = winner === 'DRAW';
    setBattleOutcome(isWin ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT');

    // Force all SURVIVING combat units on board to immediately enter idle preBattle stance (purge defeated units)
    setCombatUnits((prevUnits) =>
      prevUnits
        .filter((u) => u.hp > 0 && !u.isDefeated)
        .map((u) => ({
          ...u,
          currentAnimation: 'idle',
          isAttacking: false,
          isCasting: false,
          moveCooldown: 0,
          targetInstanceId: null,
        }))
    );

    // Update Streaks
    let currentWinStreak = winStreakRef.current;
    let currentLossStreak = lossStreakRef.current;
    if (isWin) {
      currentWinStreak += 1;
      currentLossStreak = 0;
      setWinStreak(currentWinStreak);
      setLossStreak(0);
    } else if (!isDraw) {
      currentLossStreak += 1;
      currentWinStreak = 0;
      setLossStreak(currentLossStreak);
      setWinStreak(0);
    }

    // Calculate Economy (Pokemon Auto Chess & TFT Competitive Balance):
    const currentDiffConfig = DIFFICULTY_CONFIGS[difficultyRef.current || 'medium'];
    // 1. Base income: scaled by difficulty
    const baseIncome = currentDiffConfig.baseIncome;
    // 2. Interest: +1 per 10 gold stored (max +3 at 30 gold)
    const interestIncome = Math.min(3, Math.floor(goldRef.current / 10));
    // 3. Streak bonus: 2 streak = +1, 3-4 streak = +2, 5+ streak = +3
    const activeStreakCount = isWin ? currentWinStreak : currentLossStreak;
    const streakBonus = activeStreakCount >= 5 ? 3 : activeStreakCount >= 3 ? 2 : activeStreakCount >= 2 ? 1 : 0;
    // 4. Win round bonus: scaled by difficulty
    const winBonus = isWin ? currentDiffConfig.winBonus : 0;

    const totalIncome = baseIncome + interestIncome + streakBonus + winBonus;
    setLastRoundIncome({
      base: baseIncome,
      interest: interestIncome,
      streak: streakBonus,
      win: winBonus,
      total: totalIncome,
    });

    setGold((prev) => prev + totalIncome);

    // Auto-gain XP per round based on difficulty (standard: +2 XP)
    const xpReward = currentDiffConfig.xpPerRound || 2;
    setLastRoundXp(xpReward);
    setXp((prevXp) => {
      const curLvl = levelRef.current;
      const nextXp = prevXp + xpReward;
      const req = LEVEL_XP_REQUIREMENTS[curLvl] || 999;
      if (nextXp >= req && curLvl < 8) {
        const nextLvl = curLvl + 1;
        setLevel(nextLvl);
        levelRef.current = nextLvl;
        if (nextLvl === 4 || nextLvl === 8) {
          setPlayerItems((items) => [...items, 'orbe_despertar']);
        }
        return nextXp - req;
      }
      return nextXp;
    });

    // Boss PvE Victory Item Draft Trigger (Rounds 6, 12, 18, 24)
    const currentRoundNum = totalRoundRef.current;
    if (isWin && [6, 12, 18, 24].includes(currentRoundNum) && !draftedRounds.includes(currentRoundNum)) {
      setIsBossDraft(true);
      setDraftRoundNumber(currentRoundNum);
      setIsItemDraftOpen(true);
    }

    // Damage Calculation to Commander:
    let humanDiedThisRound = false;
    const isPvERound = stageRef.current === 1 || isPvEBossRound(totalRoundRef.current);
    const opponentCmdId = BOT_OPPONENTS[(totalRoundRef.current - 1) % BOT_OPPONENTS.length];

    let dmgTaken = 0;
    if (isDraw) {
      // Tie at timeout: both players lose half of full round damage
      const fullDamage = stageRef.current * 2 + 4;
      dmgTaken = Math.max(1, Math.round((fullDamage / 2) * currentDiffConfig.playerLossDamageMultiplier));
      setRoundDamageTaken(dmgTaken);
    } else if (!isWin) {
      const survivingEnemies = combatUnits.filter((u) => u.isEnemy && u.hp > 0).length;
      const baseDmg = stageRef.current * 2 + Math.max(1, survivingEnemies * 2);
      dmgTaken = Math.max(1, Math.round(baseDmg * currentDiffConfig.playerLossDamageMultiplier));
      setRoundDamageTaken(dmgTaken);
    }

    setCommanders((prevCmds) => {
      const updated = prevCmds.map((c) => {
        if (c.isHuman) {
          if (isWin) {
            return {
              ...c,
              winStreak: c.winStreak + 1,
              lossStreak: 0,
              roundCombatStatus: 'WON' as const,
              damageTakenThisRound: 0,
            };
          } else if (isDraw) {
            const nextHp = Math.max(0, c.hp - dmgTaken);
            if (nextHp <= 0 && c.hp > 0) humanDiedThisRound = true;
            return {
              ...c,
              hp: nextHp,
              isEliminated: nextHp <= 0,
              roundCombatStatus: 'DRAW' as const,
              damageTakenThisRound: dmgTaken,
            };
          } else {
            const nextHp = Math.max(0, c.hp - dmgTaken);
            if (nextHp <= 0 && c.hp > 0) humanDiedThisRound = true;
            return {
              ...c,
              hp: nextHp,
              isEliminated: nextHp <= 0,
              winStreak: 0,
              lossStreak: c.lossStreak + 1,
              roundCombatStatus: 'LOST' as const,
              damageTakenThisRound: dmgTaken,
            };
          }
        }

        // If this bot is the opponent the player fought in PvP:
        if (!isPvERound && c.id === opponentCmdId) {
          if (isWin) {
            const survivingPlayerUnits = combatUnits.filter((u) => !u.isEnemy && u.hp > 0).length;
            const enemyDmg = stageRef.current * 2 + Math.max(1, survivingPlayerUnits * 2);
            const nextHp = Math.max(0, c.hp - enemyDmg);
            return {
              ...c,
              hp: nextHp,
              isEliminated: nextHp <= 0,
              winStreak: 0,
              lossStreak: c.lossStreak + 1,
              roundCombatStatus: 'LOST' as const,
              damageTakenThisRound: enemyDmg,
            };
          } else if (isDraw) {
            const enemyDmg = Math.max(1, Math.round((stageRef.current * 2 + 4) / 2));
            const nextHp = Math.max(0, c.hp - enemyDmg);
            return {
              ...c,
              hp: nextHp,
              isEliminated: nextHp <= 0,
              roundCombatStatus: 'DRAW' as const,
              damageTakenThisRound: enemyDmg,
            };
          } else {
            return {
              ...c,
              winStreak: c.winStreak + 1,
              lossStreak: 0,
              roundCombatStatus: 'WON' as const,
              damageTakenThisRound: 0,
            };
          }
        }
        return c;
      });

      const aliveCount = updated.filter((c) => c.hp > 0).length;
      if (humanDiedThisRound && !isSpectating) {
        setUserPlacementRank(aliveCount + 1);
        setIsGameOverModalOpen(true);
      }

      // Check if all alive commanders have finished
      const allDone = updated
        .filter((c) => !c.isEliminated)
        .every((c) => c.roundCombatStatus && c.roundCombatStatus !== 'FIGHTING');

      if (allDone && !autoAdvanceTimerRef.current) {
        autoAdvanceTimerRef.current = setTimeout(() => {
          handleProceedToNextRound();
        }, 1800);
      }

      return updated;
    });
  };

  // Select item from Item Draft Modal
  const handleSelectDraftItem = (item: ItemData) => {
    setPlayerItems((prev) => [...prev, item.id]);
    setDraftedRounds((prev) => [...prev, draftRoundNumber]);
    setIsItemDraftOpen(false);
  };

  // Full Game Restart Function
  const handleRestartGame = () => {
    warmupTimersRef.current.forEach(clearTimeout);
    warmupTimersRef.current = [];
    setIsCombatStarting(false);
    setCombatWarmupCountdown(3);

    setPhase('PREPARATION');
    setCountdown(30);
    setTotalGameTime(0);
    setIsTimerPaused(false);
    setTotalRound(1);
    totalRoundRef.current = 1;
    setStage(1);
    stageRef.current = 1;
    setRoundInStage(1);
    roundInStageRef.current = 1;
    setRoundStage('1-1');
    setRoundTitle('PvE: 2 Recrutas da Marinha');
    setWinStreak(0);
    setLossStreak(0);
    setIsDifficultyLocked(false);
    const startGold = DIFFICULTY_CONFIGS[difficultyRef.current || 'medium'].initialGold;
    setGold(startGold);
    goldRef.current = startGold;
    setLevel(1);
    levelRef.current = 1;
    setXp(0);
    setCommanders(
      INITIAL_COMMANDERS.map((c) => ({
        ...c,
        hp: 100,
        isEliminated: false,
        winStreak: 0,
        lossStreak: 0,
      }))
    );
    setPlayerItems([]);
    setIsItemDraftOpen(false);
    setIsBossDraft(false);
    setDraftedRounds([]);
    setIsGameOverModalOpen(false);
    setIsSpectating(false);
    setUserPlacementRank(8);
    setViewingCommanderId('p1_human');
    setSelectedUnit(null);
    setChangedSkillUnitIdThisRound(null);

    const pveEnemies = generateEnemyBoardUnits(1, 1, 1, difficultyRef.current || 'medium');
    setBoardUnits([...pveEnemies]);
    boardUnitsRef.current = [...pveEnemies];

    const slots: (UnitInstance | null)[] = Array(8).fill(null);
    const tier1Champions = ['luffy', 'nami', 'usopp', 'buggy', 'tashigi'];
    const randomChamp = tier1Champions[Math.floor(Math.random() * tier1Champions.length)];
    slots[0] = createUnitInstance(randomChamp, 1, -1, -1, 0, false);
    setBenchSlots(slots);
    benchSlotsRef.current = slots;

    setCombatUnits([]);
    setFloatingTexts([]);
    setAttackEffects([]);
    setBattleOutcome(null);
    setShopCards(generateShopCards(1));
  };

  // Move to next stage and reset board units to preparation
  const handleProceedToNextRound = () => {
    warmupTimersRef.current.forEach(clearTimeout);
    warmupTimersRef.current = [];
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setIsCombatStarting(false);
    setCombatWarmupCountdown(3);

    setPhase('PREPARATION');
    setCountdown(30); // 30s preparation
    setBattleOutcome(null);
    setRoundDamageTaken(0);
    setActiveTheftEvent(null);
    setChangedSkillUnitIdThisRound(null); // Reset 1-skill-change-per-turn limit for new round

    // Reset combat status indicators on all commanders for the new preparation phase
    setCommanders((prevCmds) =>
      prevCmds.map((c) => ({
        ...c,
        roundCombatStatus: undefined,
        damageTakenThisRound: 0,
      }))
    );

    const nextTotalRound = totalRoundRef.current + 1;
    setTotalRound(nextTotalRound);
    totalRoundRef.current = nextTotalRound;

    // Check Item Draft for standard rounds (3, 9, 15, 21)
    if ([3, 9, 15, 21].includes(nextTotalRound) && !draftedRounds.includes(nextTotalRound)) {
      setIsBossDraft(false);
      setDraftRoundNumber(nextTotalRound);
      setIsItemDraftOpen(true);
    }

    // Advance Stage & Round progression
    let nextStage = stageRef.current;
    let nextRoundInStage = roundInStageRef.current + 1;

    const maxRoundsInStage = 4;
    if (nextRoundInStage > maxRoundsInStage) {
      nextStage += 1;
      nextRoundInStage = 1;
    }

    setStage(nextStage);
    stageRef.current = nextStage;
    setRoundInStage(nextRoundInStage);
    roundInStageRef.current = nextRoundInStage;
    const stageCode = `${nextStage}-${nextRoundInStage}`;
    setRoundStage(stageCode);

    // Determine Title dynamically using Bot AI & Boss progression
    let title = '';
    if (nextTotalRound === 1) {
      title = 'PvE: 2 Recrutas da Marinha';
    } else if (isPvEBossRound(nextTotalRound)) {
      const bossNum = Math.floor(nextTotalRound / 6);
      if (bossNum === 1) title = 'PvE Boss: Smoker & Guarda Costeira 💨';
      else if (bossNum === 2) title = 'PvE Boss: Sir Crocodile & Baroque Works 🐊';
      else if (bossNum === 3) title = 'PvE Boss: Rob Lucci & CP9 Governo 🐆';
      else title = 'PvE Boss Lendário: Shanks o Ruivo ⚔️';
    } else {
      const bot = BOT_OPPONENTS[(nextStage * 3 + nextRoundInStage + nextTotalRound) % BOT_OPPONENTS.length];
      title = `Batalha PvP: ${bot.name} (${bot.theme})`;
    }
    setRoundTitle(title);

    // Restore player units to starting HP/Mana using live ref
    const restoredPlayerUnits = boardUnitsRef.current
      .filter((u) => !u.isEnemy && u.gridX >= 0 && u.gridY >= 0)
      .map((u) => ({
        ...u,
        hp: u.maxHp,
        mana: CHAMPION_DATABASE[u.unitId]?.startMana || 0,
        shield: 0,
      }));

    // Pre-position enemies on board ONLY if it is a PvE Boss round or Round 1 (Rule: Point 1)
    if (isPvEBossRound(nextTotalRound)) {
      const newEnemies = generateEnemyBoardUnits(
        nextStage,
        nextRoundInStage,
        nextTotalRound,
        difficultyRef.current || 'medium'
      );
      const nextBoard = [...restoredPlayerUnits, ...newEnemies];
      setBoardUnits(nextBoard);
      boardUnitsRef.current = nextBoard;
    } else {
      // Enemy arena stays empty during preparation in normal PvP rounds
      setBoardUnits(restoredPlayerUnits);
      boardUnitsRef.current = restoredPlayerUnits;
    }

    setCombatUnits([]);
    setFloatingTexts([]);
    setAttackEffects([]);

    // Always refresh shop for the new round unless locked
    if (!isShopLockedRef.current) {
      setShopCards(generateShopCards(levelRef.current));
    } else {
      // Retained locked shop for this round; auto-unlock for future rounds
      setIsShopLocked(false);
      isShopLockedRef.current = false;
    }
  };

  // === Combat Animation & Simulation Tick Loop (60 FPS) ===
  useEffect(() => {
    // In test mode, allow combat loop simulation to run even though normal round timer is paused
    const isPausedEffective = isTestMode ? false : isTimerPaused;
    if (phase !== 'COMBAT' || isPausedEffective || isCombatStarting) {
      if (combatLoopRef.current) {
        cancelAnimationFrame(combatLoopRef.current);
        combatLoopRef.current = null;
      }
      return;
    }

    let isRunning = true;

    const combatLoop = () => {
      if (!isRunning) return;

      const now = Date.now();
      // Smoothed combat pace: scaled delta by 0.72 (~350ms slower feel per second) for clear readability
      const rawDelta = Math.min(0.1, (now - lastTickTimeRef.current) / 1000);
      const deltaSeconds = rawDelta * 0.72;
      lastTickTimeRef.current = now;

      setCombatUnits((currentUnits) => {
        if (currentUnits.length === 0) return currentUnits;

        const enemyCommander = commanders.find((c) => c.id !== 'p1_human' && !c.isEliminated);
        const currentEnemyGold = enemyCommander ? enemyCommander.gold : 12;
        const enemySynergies = calculateActiveSynergies(currentUnits, true);

        const tickResult = simulateCombatTick(
          currentUnits,
          activeSynergies,
          isOvertime,
          deltaSeconds,
          theftTrackerRef.current,
          gold,
          currentEnemyGold,
          enemySynergies
        );

        // Process theft events if triggered
        if (tickResult.theftEvents && tickResult.theftEvents.length > 0) {
          for (const ev of tickResult.theftEvents) {
            setActiveTheftEvent(ev);
            if (ev.isPlayerThief) {
              if (ev.type === 'GOLD' && ev.goldAmount) {
                setGold((g) => g + ev.goldAmount!);
              } else if (ev.type === 'ITEM' && ev.stolenItemId) {
                setPlayerItems((prev) => [...prev, ev.stolenItemId!]);
              }
            } else {
              if (ev.type === 'GOLD' && ev.goldAmount) {
                setGold((g) => Math.max(0, g - ev.goldAmount!));
              }
            }
          }
        }

        // Add newly spawned floating texts
        if (tickResult.floatingTexts.length > 0) {
          setFloatingTexts((prev) => [...prev, ...tickResult.floatingTexts]);
        }

        // Add newly spawned attack effects
        if (tickResult.attackEffects.length > 0) {
          setAttackEffects((prev) => [...prev, ...tickResult.attackEffects]);
        }

        // Check if battle finished
        if (tickResult.isCombatEnded && tickResult.winner) {
          isRunning = false;
          if (isTestModeRef.current) {
            setBattleOutcome(tickResult.winner);
          } else {
            setTimeout(() => {
              endCombatAndAdvanceRound(tickResult.winner!);
            }, 800);
          }
        }

        return tickResult.units;
      });

      // Clear expired floating texts (> 1100ms for readable damage numbers)
      setFloatingTexts((prev) => prev.filter((ft) => now - ft.timestamp < 1100));

      // Clear expired attack effects
      setAttackEffects((prev) => prev.filter((eff) => now - eff.timestamp < eff.durationMs));

      if (isRunning) {
        combatLoopRef.current = requestAnimationFrame(combatLoop);
      }
    };

    combatLoopRef.current = requestAnimationFrame(combatLoop);

    return () => {
      isRunning = false;
      if (combatLoopRef.current) {
        cancelAnimationFrame(combatLoopRef.current);
        combatLoopRef.current = null;
      }
    };
  }, [phase, isTimerPaused, isCombatStarting, isTestMode, activeSynergies, isOvertime]);

  // === Game Clock & Dynamic Countdown Timer ===
  useEffect(() => {
    if (isTimerPaused || isCombatStarting || isTestMode) return;

    const timerInterval = setInterval(() => {
      setTotalGameTime((prev) => prev + 1);

      setCountdown((prevCountdown) => {
        const nextCd = prevCountdown - 1;

        if (phaseRef.current === 'COMBAT') {
          // Progress scheduled bot matches in other arenas
          if (scheduledBotMatchesRef.current.length > 0) {
            let matchesUpdated = false;
            scheduledBotMatchesRef.current.forEach((m) => {
              if (!m.isResolved && nextCd <= m.finishCountdown) {
                m.isResolved = true;
                matchesUpdated = true;
              }
            });

            if (matchesUpdated) {
              setCommanders((prevCmds) => {
                const updated = prevCmds.map((c) => {
                  const match = scheduledBotMatchesRef.current.find(
                    (m) =>
                      (m.botAId === c.id || m.botBId === c.id) &&
                      m.isResolved &&
                      c.roundCombatStatus === 'FIGHTING'
                  );
                  if (!match) return c;

                  const isWinner = match.winnerId === c.id;
                  const dmg = match.botAId === c.id ? match.damageA : match.damageB;

                  if (isWinner || match.winnerId === 'PVE_WIN') {
                    return {
                      ...c,
                      winStreak: c.winStreak + 1,
                      lossStreak: 0,
                      roundCombatStatus: 'WON' as const,
                      damageTakenThisRound: 0,
                    };
                  } else {
                    const nextHp = Math.max(0, c.hp - dmg);
                    return {
                      ...c,
                      hp: nextHp,
                      isEliminated: nextHp <= 0,
                      winStreak: 0,
                      lossStreak: c.lossStreak + 1,
                      roundCombatStatus: 'LOST' as const,
                      damageTakenThisRound: dmg,
                    };
                  }
                });

                // Check if all alive commanders have finished
                const allDone = updated
                  .filter((c) => !c.isEliminated)
                  .every((c) => c.roundCombatStatus && c.roundCombatStatus !== 'FIGHTING');

                if (allDone && !autoAdvanceTimerRef.current) {
                  autoAdvanceTimerRef.current = setTimeout(() => {
                    handleProceedToNextRound();
                  }, 1800);
                }

                return updated;
              });
            }
          }
        }

        if (nextCd <= 0) {
          // Timer reached 0s -> Switch phase or resolve draws
          if (phaseRef.current === 'PREPARATION') {
            startCombatPhase();
            return 35;
          } else {
            // Combat reached 0s: Force draw resolution for any remaining battles
            if (battleOutcome === null) {
              endCombatAndAdvanceRound('DRAW');
            } else {
              handleProceedToNextRound();
            }
            return 30;
          }
        }

        return nextCd;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [isTimerPaused, isCombatStarting, phase, battleOutcome]);

  // === Keyboard Shortcuts (D for Shop/Reroll, F for XP, Space for Pause) ===
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'd' || e.key === 'D') {
        if (isShopOpen) {
          handleRerollShop();
        } else {
          setIsShopOpen(true);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        handleBuyXp();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsTimerPaused((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShopOpen, gold, level, xp]);

  // === Mechanic: Global Click-Outside Closes All Active Modals (Unit Inspector, Shop, Synergies, Difficulty) ===
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      // If no modal, drawer, or inspector is active, nothing to close
      if (!selectedUnit && !isShopOpen && !selectedSynergyId && !isDifficultyModalOpen) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (!target) return;

      // 1. If clicked inside any modal container, do not close
      if (target.closest('[data-modal-container="true"]')) {
        return;
      }

      // 2. If clicked on a designated modal toggle button (e.g. Shop toggle button, Synergy tab), do not close
      if (target.closest('[data-modal-toggle="true"]')) {
        return;
      }

      // 3. If clicked on a unit slot (bench or board unit), unit selection handles it
      if (target.closest('[data-unit-slot="true"]') || target.closest('[data-unit-tile="true"]')) {
        return;
      }

      // 4. Otherwise, user clicked outside any active modal (on the arena, canvas, background, etc.) -> close all modals!
      setSelectedUnit(null);
      setIsShopOpen(false);
      setSelectedSynergyId(null);
      setIsDifficultyModalOpen(false);
    };

    // Use capture phase to ensure clicks across the 3D canvas and document are caught
    window.addEventListener('click', handleGlobalClick, true);
    return () => {
      window.removeEventListener('click', handleGlobalClick, true);
    };
  }, [selectedUnit, isShopOpen, selectedSynergyId, isDifficultyModalOpen]);

  // === Shop Actions ===
  const handleRerollShop = () => {
    if (gold < 2) return;
    setGold((prev) => prev - 2);
    setShopCards(generateShopCards(level));
  };

  const handleBuyXp = () => {
    if (gold < 4 || level >= 8) return;
    setGold((prev) => prev - 4);
    const newXp = xp + 4;
    const req = LEVEL_XP_REQUIREMENTS[level] || 999;

    if (newXp >= req && level < 8) {
      setLevel((prevLvl) => {
        const nextLvl = prevLvl + 1;
        // Grant Awakening Orb at Lv.4 and Lv.8 (PRD 3.4)
        if (nextLvl === 4 || nextLvl === 8) {
          setPlayerItems((items) => [...items, 'orbe_despertar']);
        }
        return nextLvl;
      });
      setXp(newXp - req);
    } else {
      setXp(newXp);
    }
  };

  const applyStarUpgrades = (
    bench: (UnitInstance | null)[],
    board: UnitInstance[]
  ) => {
    const upgradeRes = performStarUpgrades(bench, board);
    setBenchSlots(upgradeRes.nextBench);
    benchSlotsRef.current = upgradeRes.nextBench;
    setBoardUnits(upgradeRes.nextBoard);
    boardUnitsRef.current = upgradeRes.nextBoard;

    if (upgradeRes.refundedItems.length > 0) {
      setPlayerItems((prev) => [...prev, ...upgradeRes.refundedItems]);
    }
  };

  const handleBuyCard = (cardIndex: number) => {
    const card = shopCards[cardIndex];
    if (!card || gold < card.cost) return;

    // Find first empty bench slot
    const emptySlotIdx = benchSlotsRef.current.findIndex((slot) => slot === null);
    if (emptySlotIdx === -1) {
      alert('Seu Banco de Reservas está cheio (8/8)!');
      return;
    }

    setGold((prev) => prev - card.cost);
    goldRef.current = goldRef.current - card.cost;

    // Create unit on bench
    const newUnit = createUnitInstance(card.id, 1, -1, -1, emptySlotIdx, false);
    const nextBench = [...benchSlotsRef.current];
    nextBench[emptySlotIdx] = newUnit;
    setBenchSlots(nextBench);
    benchSlotsRef.current = nextBench;

    // Mark card as bought
    const nextShop = [...shopCards];
    nextShop[cardIndex] = null;
    setShopCards(nextShop);

    // Check for automatic star synthesis upgrades (1★ -> 2★, 2★ -> 3★ and cascading)
    applyStarUpgrades(nextBench, boardUnitsRef.current);
  };

  // === Drag and Drop Handlers ===
  const handleDragStartUnit = (e: React.DragEvent, unit: UnitInstance) => {
    if (!isTestMode && unit.isEnemy) return;
    if (phase === 'COMBAT') return;
    setSelectedUnit(null);
    setDraggedUnit(unit);
    draggedUnitRef.current = unit;
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', unit.instanceId);
    } catch (_) {}
  };

  const handleDragEnd = () => {
    // Delay clearing refs so any onDrop handler can read them safely
    setTimeout(() => {
      setDraggedUnit(null);
      draggedUnitRef.current = null;
      setDraggedItemId(null);
      draggedItemIdRef.current = null;
    }, 60);
  };

  const handleDragOverTile = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnTile = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();

    const transferData = e.dataTransfer.getData('text/plain');
    const targetUnit = boardUnitsRef.current.find((u) => u.gridX === x && u.gridY === y && !u.isEnemy);

    if (draggedItemIdRef.current || draggedItemId || transferData.startsWith('item:')) {
      const itId = draggedItemIdRef.current || draggedItemId || transferData.replace('item:', '');
      if (targetUnit) {
        handleEquipItemToUnit(itId, targetUnit);
      }
      setDraggedItemId(null);
      draggedItemIdRef.current = null;
      return;
    }

    // Resolve active unit by ref, state, or instanceId transfer
    let activeUnit = draggedUnitRef.current || draggedUnit;
    if (!activeUnit && transferData) {
      activeUnit =
        (isTestMode ? allTestChampions.find((b) => b.instanceId === transferData) : null) ||
        benchSlotsRef.current.find((b) => b?.instanceId === transferData) ||
        boardUnitsRef.current.find((u) => u.instanceId === transferData) ||
        null;
    }

    if (!activeUnit || phaseRef.current === 'COMBAT') return;

    const targetX = Math.round(Number(x));
    const targetY = Math.round(Number(y));

    // Test Mode: Allow placing units anywhere on the 8x5 board (cols 0-3 ally, cols 4-7 enemy)
    if (isTestMode) {
      const isEnemySide = targetX > 3;
      const newPlacedUnit: UnitInstance = {
        ...createUnitInstance(activeUnit.unitId, activeUnit.stars || 1, targetX, targetY, -1, isEnemySide),
        items: activeUnit.items ? [...activeUnit.items] : [],
        hasSpecialItem: activeUnit.hasSpecialItem || false,
      };

      const currentBoard = boardUnitsRef.current;
      const nextBoard = currentBoard.filter(
        (u) =>
          !(u.gridX === targetX && u.gridY === targetY) &&
          (activeUnit.gridX < 0 || u.instanceId !== activeUnit.instanceId)
      );
      nextBoard.push(newPlacedUnit);
      setBoardUnits(nextBoard);
      boardUnitsRef.current = nextBoard;
      setSelectedUnit(null);
      draggedUnitRef.current = null;
      setDraggedUnit(null);
      return;
    }

    executePlaceOrMoveUnit(activeUnit, targetX, targetY);
    draggedUnitRef.current = null;
    setDraggedUnit(null);
  };

  const executePlaceOrMoveUnit = (unitToPlace: UnitInstance, x: number, y: number) => {
    const targetX = Math.round(Number(x));
    const targetY = Math.round(Number(y));

    // Rule: Players can only position units on their transverse half (columns 0..3, rows 0..4)
    if (targetX < 0 || targetX > 3 || targetY < 0 || targetY >= 5) {
      if (!isTestMode) {
        alert('Você só pode posicionar unidades no seu campo (metade esquerda, colunas 0 a 3, linhas 0 a 4)!');
      }
      return;
    }

    const currentBoard = [...boardUnitsRef.current];
    const currentBench = [...benchSlotsRef.current];

    // Find any existing ally unit at target tile (excluding the unit being placed)
    const anyTargetUnit = currentBoard.find(
      (u) =>
        !u.isEnemy &&
        Math.round(u.gridX) === targetX &&
        Math.round(u.gridY) === targetY &&
        u.instanceId !== unitToPlace.instanceId
    );

    // Identify if unit actually came from bench vs already being on the board
    const existingBoardUnit = currentBoard.find((u) => u.instanceId === unitToPlace.instanceId);
    const isAlreadyOnBoard = Boolean(
      existingBoardUnit ||
      (typeof unitToPlace.gridX === 'number' && unitToPlace.gridX >= 0 && typeof unitToPlace.gridY === 'number' && unitToPlace.gridY >= 0)
    );

    const isFromBench = !isAlreadyOnBoard;

    // Case 1: Unit came from bench
    if (isFromBench) {
      let benchIdx = currentBench.findIndex(
        (b) => b !== null && b.instanceId === unitToPlace.instanceId
      );
      if (
        benchIdx === -1 &&
        typeof unitToPlace.benchIndex === 'number' &&
        unitToPlace.benchIndex >= 0 &&
        unitToPlace.benchIndex < currentBench.length
      ) {
        benchIdx = unitToPlace.benchIndex;
      }
      if (benchIdx === -1) {
        const emptyIdx = currentBench.findIndex((b) => b === null);
        benchIdx = emptyIdx !== -1 ? emptyIdx : 0;
      }

      const playerUnitsNow = currentBoard.filter((u) => !u.isEnemy && u.gridX >= 0 && u.gridY >= 0);
      const maxSlots = LEVEL_MAX_SLOTS[levelRef.current] || 1;

      if (!anyTargetUnit && playerUnitsNow.length >= maxSlots) {
        alert(
          `Limite de unidades atingido (${playerUnitsNow.length}/${maxSlots})! Aumente o nível para colocar mais campeões.`
        );
        return;
      }

      // Place onto board
      const updatedUnit: UnitInstance = {
        ...unitToPlace,
        gridX: targetX,
        gridY: targetY,
        benchIndex: null,
      };

      const nextBench = [...currentBench];

      if (anyTargetUnit) {
        // Swap target unit from board to bench slot
        const swappedUnit: UnitInstance = {
          ...anyTargetUnit,
          gridX: -1,
          gridY: -1,
          benchIndex: benchIdx,
        };
        nextBench[benchIdx] = swappedUnit;

        // Replace anyTargetUnit on the board with updatedUnit
        const filteredBoard = currentBoard.filter(
          (u) => u.instanceId !== anyTargetUnit.instanceId && u.instanceId !== unitToPlace.instanceId
        );
        const nextBoard = [...filteredBoard, updatedUnit];

        setBenchSlots(nextBench);
        benchSlotsRef.current = nextBench;
        setBoardUnits(nextBoard);
        boardUnitsRef.current = nextBoard;
      } else {
        // Vacate bench slot and add unit to board
        nextBench[benchIdx] = null;

        const filteredBoard = currentBoard.filter((u) => u.instanceId !== unitToPlace.instanceId);
        const nextBoard = [...filteredBoard, updatedUnit];

        setBenchSlots(nextBench);
        benchSlotsRef.current = nextBench;
        setBoardUnits(nextBoard);
        boardUnitsRef.current = nextBoard;
      }

      // Do not open unit info modal upon placing/adding to field
      setSelectedUnit(null);
    } else {
      // Case 2: Unit moved from one board tile to another
      const prevX = existingBoardUnit ? Math.round(existingBoardUnit.gridX) : Math.round(unitToPlace.gridX);
      const prevY = existingBoardUnit ? Math.round(existingBoardUnit.gridY) : Math.round(unitToPlace.gridY);

      // Dropped on its own tile: keep unit
      if (prevX === targetX && prevY === targetY) {
        setSelectedUnit(null);
        return;
      }

      if (anyTargetUnit) {
        // Swap positions reliably between two board units
        const nextBoard = currentBoard.map((u) => {
          if (u.instanceId === unitToPlace.instanceId) {
            return { ...u, gridX: targetX, gridY: targetY, benchIndex: null };
          }
          if (u.instanceId === anyTargetUnit.instanceId) {
            return { ...u, gridX: prevX, gridY: prevY, benchIndex: null };
          }
          return u;
        });
        setBoardUnits(nextBoard);
        boardUnitsRef.current = nextBoard;
      } else {
        const nextBoard = currentBoard.map((u) =>
          u.instanceId === unitToPlace.instanceId ? { ...u, gridX: targetX, gridY: targetY, benchIndex: null } : u
        );
        setBoardUnits(nextBoard);
        boardUnitsRef.current = nextBoard;
      }

      // Do not open unit info modal upon moving on field
      setSelectedUnit(null);
    }
  };

  const handleDropOnBench = (e: React.DragEvent, slotIdx: number) => {
    e.preventDefault();

    const transferData = e.dataTransfer.getData('text/plain');
    const currentBench = [...benchSlotsRef.current];
    const currentBoard = [...boardUnitsRef.current];
    const existingBenchUnit = currentBench[slotIdx];

    if (draggedItemIdRef.current || draggedItemId || transferData.startsWith('item:')) {
      const itId = draggedItemIdRef.current || draggedItemId || transferData.replace('item:', '');
      if (existingBenchUnit) {
        handleEquipItemToUnit(itId, existingBenchUnit);
      }
      setDraggedItemId(null);
      draggedItemIdRef.current = null;
      return;
    }

    let activeUnit = draggedUnitRef.current || draggedUnit;
    if (!activeUnit && transferData) {
      activeUnit =
        currentBench.find((b) => b?.instanceId === transferData) ||
        currentBoard.find((u) => u.instanceId === transferData) ||
        null;
    }

    if (!activeUnit || phaseRef.current === 'COMBAT') return;

    // Check if activeUnit is on the board
    const boardMatch = currentBoard.find((u) => u.instanceId === activeUnit!.instanceId);
    const isFromBoard = Boolean(boardMatch || (activeUnit.gridX >= 0 && activeUnit.gridY >= 0));

    if (isFromBoard) {
      const unitBoardX = boardMatch ? boardMatch.gridX : activeUnit.gridX;
      const unitBoardY = boardMatch ? boardMatch.gridY : activeUnit.gridY;

      const movedUnit: UnitInstance = {
        ...(boardMatch || activeUnit),
        gridX: -1,
        gridY: -1,
        benchIndex: slotIdx,
      };

      const nextBench = [...currentBench];
      nextBench[slotIdx] = movedUnit;
      setBenchSlots(nextBench);
      benchSlotsRef.current = nextBench;

      if (existingBenchUnit) {
        // SWAP: Existing bench unit moves to the board at the unit's previous coordinate
        const swappedUnit: UnitInstance = {
          ...existingBenchUnit,
          gridX: unitBoardX >= 0 ? unitBoardX : 0,
          gridY: unitBoardY >= 0 ? unitBoardY : 0,
          benchIndex: null,
        };
        const nextBoard = currentBoard.map((u) =>
          u.instanceId === activeUnit!.instanceId ? swappedUnit : u
        );
        if (!nextBoard.some((u) => u.instanceId === swappedUnit.instanceId)) {
          nextBoard.push(swappedUnit);
        }
        setBoardUnits(nextBoard);
        boardUnitsRef.current = nextBoard;
      } else {
        // Remove unit from board
        const nextBoard = currentBoard.filter((u) => u.instanceId !== activeUnit!.instanceId);
        setBoardUnits(nextBoard);
        boardUnitsRef.current = nextBoard;
      }
    } else {
      // Reordering bench slots
      const prevBenchIdx = currentBench.findIndex(
        (b) => b !== null && b.instanceId === activeUnit!.instanceId
      );

      const nextBench = [...currentBench];
      if (prevBenchIdx >= 0 && prevBenchIdx < nextBench.length) {
        nextBench[prevBenchIdx] = existingBenchUnit
          ? { ...existingBenchUnit, benchIndex: prevBenchIdx }
          : null;
      }
      nextBench[slotIdx] = { ...activeUnit, benchIndex: slotIdx };
      setBenchSlots(nextBench);
      benchSlotsRef.current = nextBench;
    }

    setSelectedUnit(null);
    draggedUnitRef.current = null;
    setDraggedUnit(null);
  };

  // === Sell Unit Logic (PRD: Sell for Cost * Stars) ===
  const handleSellUnit = (targetUnit: UnitInstance) => {
    if (phaseRef.current !== 'PREPARATION') {
      alert('Você só pode vender unidades durante a Fase de Preparação!');
      return;
    }

    if (targetUnit.isEnemy) return;

    const sellPrice = calculateUnitSellValue(targetUnit);

    // 1. Remove unit from board or bench
    if (targetUnit.benchIndex !== null && targetUnit.benchIndex !== undefined && targetUnit.benchIndex >= 0) {
      const nextBench = [...benchSlotsRef.current];
      nextBench[targetUnit.benchIndex] = null;
      setBenchSlots(nextBench);
      benchSlotsRef.current = nextBench;
    } else {
      const nextBoard = boardUnitsRef.current.filter((u) => u.instanceId !== targetUnit.instanceId);
      setBoardUnits(nextBoard);
      boardUnitsRef.current = nextBoard;
    }

    // 2. Return equipped items back to player bag
    if (targetUnit.items && targetUnit.items.length > 0) {
      setPlayerItems((prev) => [...prev, ...targetUnit.items]);
    }

    // 3. Add gold
    setGold((prev) => prev + sellPrice);
    goldRef.current = goldRef.current + sellPrice;

    // 4. Clear selection if selected
    if (selectedUnit && selectedUnit.instanceId === targetUnit.instanceId) {
      setSelectedUnit(null);
    }
  };

  // === Active Skill Toggle Handler (PRD Section 4.3 + Turn Limit Validation) ===
  const handleSelectSkill = (targetUnit: UnitInstance, skill: 'SKILL_A' | 'SKILL_B') => {
    if (phase !== 'PREPARATION') {
      alert('A troca de habilidades só é permitida durante a Fase de Preparação!');
      return;
    }

    if (skill === 'SKILL_B' && targetUnit.stars < 2) {
      alert('A Habilidade Secundária só pode ser selecionada em unidades de 2★ ou 3★!');
      return;
    }

    if (targetUnit.activeSkill === skill) {
      return; // Already selected
    }

    if (changedSkillUnitIdThisRound !== null) {
      if (changedSkillUnitIdThisRound === targetUnit.instanceId) {
        alert(
          'Você já alterou a habilidade deste campeão nesta rodada! (Limite de 1 alteração por turno atingido).'
        );
      } else {
        alert(
          'Você já utilizou sua alteração de habilidade desta rodada em outro campeão! (Limite de 1 campeão por rodada).'
        );
      }
      return;
    }

    const unitId = targetUnit.instanceId;

    setBoardUnits((prev) =>
      prev.map((u) => (u.instanceId === unitId ? { ...u, activeSkill: skill } : u))
    );
    boardUnitsRef.current = boardUnitsRef.current.map((u) =>
      u.instanceId === unitId ? { ...u, activeSkill: skill } : u
    );

    setBenchSlots((prev) =>
      prev.map((u) => (u && u.instanceId === unitId ? { ...u, activeSkill: skill } : u))
    );
    benchSlotsRef.current = benchSlotsRef.current.map((u) =>
      u && u.instanceId === unitId ? { ...u, activeSkill: skill } : u
    );

    if (selectedUnit && selectedUnit.instanceId === unitId) {
      setSelectedUnit({ ...selectedUnit, activeSkill: skill });
    }

    setChangedSkillUnitIdThisRound(unitId);
  };

  // === Item Equipping Logic (2 Battle Items + 1 Special Item) ===
  const handleEquipItemToUnit = (itemId: string, targetUnit: UnitInstance) => {
    const itemData = ITEM_DATABASE[itemId];
    if (!itemData) return;

    const currentBattleItems = targetUnit.items.filter(
      (id) => !ITEM_DATABASE[id]?.isSpecialActivation
    );
    const currentSpecialItem = targetUnit.items.find(
      (id) => ITEM_DATABASE[id]?.isSpecialActivation
    );

    const safeNotify = (msg: string) => {
      try {
        if (typeof window !== 'undefined' && window.alert) {
          window.alert(msg);
        } else {
          console.warn(msg);
        }
      } catch {
        console.warn(msg);
      }
    };

    // If it's a Special Item (e.g. Orbe do Despertar)
    if (itemData.isSpecialActivation) {
      if (currentSpecialItem) {
        safeNotify(
          `A unidade ${targetUnit.name} já possui 1 Item Especial equipado no Slot Especial!`
        );
        return;
      }
      if (targetUnit.stars < 2) {
        safeNotify(
          `O item "${itemData.name}" só pode ser equipado em campeões de 2★ ou 3★! Unidades de 1★ não possuem maturidade para despertar o Ataque Especial.`
        );
        return;
      }
    } else {
      // It's a Battle Item (max 2)
      if (currentBattleItems.length >= 2) {
        safeNotify(
          `A unidade ${targetUnit.name} já atingiu o limite de 2 Itens de Batalha equipados!`
        );
        return;
      }
    }

    if (itemData.applicableTraits && itemData.applicableTraits.length > 0) {
      const hasEligibleTrait = targetUnit.traits.some((t) =>
        itemData.applicableTraits?.includes(t)
      );
      if (!hasEligibleTrait) {
        safeNotify(
          `O item ${itemData.name} só pode ser equipado em unidades com os traços: ${itemData.applicableTraits.join(', ')}!`
        );
        return;
      }
    }

    const updatedTraits = [...targetUnit.traits];
    if (itemData.grantTrait && !updatedTraits.includes(itemData.grantTrait)) {
      updatedTraits.push(itemData.grantTrait);
    }

    // Apply stat bonuses if battle item
    let bonusHp = 0;
    let bonusAd = 0;
    let bonusAp = 0;
    let bonusArmor = 0;
    let bonusMr = 0;
    let bonusAs = 0;

    if (itemId === 'espada_pirata') {
      bonusAd = 25;
      bonusAs = 0.15;
    } else if (itemId === 'armadura_haki') {
      bonusArmor = 30;
      bonusMr = 30;
      bonusHp = 200;
    } else if (itemId === 'lente_clarividencia') {
      bonusAp = 35;
    } else if (itemId === 'garrafa_sake') {
      const isDrunkard = targetUnit.unitId === 'zoro' || targetUnit.unitId === 'shanks';
      bonusAd = isDrunkard ? 40 : 20;
      bonusHp = isDrunkard ? 300 : 150;
      bonusAs = isDrunkard ? 0.30 : 0.15;
    } else if (itemId === 'frasco_rum') {
      bonusAs = 0.20;
    } else if (itemId === 'capa_almirante') {
      bonusHp = 400;
    } else if (itemId === 'canhao_flutuante') {
      bonusAd = 35;
      bonusAp = 20;
    }

    const updatedUnit: UnitInstance = {
      ...targetUnit,
      items: [...targetUnit.items, itemId],
      hasSpecialItem: targetUnit.hasSpecialItem || !!itemData.isSpecialActivation,
      traits: updatedTraits,
      ad: targetUnit.ad + bonusAd,
      ap: targetUnit.ap + bonusAp,
      hp: targetUnit.hp + bonusHp,
      maxHp: targetUnit.maxHp + bonusHp,
      armor: targetUnit.armor + bonusArmor,
      mr: targetUnit.mr + bonusMr,
      attackSpeed: targetUnit.attackSpeed + bonusAs,
    };

    setPlayerItems((prev) => {
      const idx = prev.indexOf(itemId);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });

    setBoardUnits((prev) =>
      prev.map((u) => (u.instanceId === updatedUnit.instanceId ? updatedUnit : u))
    );
    setBenchSlots((prev) =>
      prev.map((u) => (u && u.instanceId === updatedUnit.instanceId ? updatedUnit : u))
    );
    setSelectedUnit(updatedUnit);
  };

  // === Unequip Item Logic (Allowed in Preparation Phase) ===
  const handleUnequipItem = (itemId: string, targetUnit: UnitInstance) => {
    if (phase !== 'PREPARATION') {
      alert('Você só pode desequipar itens durante a Fase de Preparação!');
      return;
    }

    const itemData = ITEM_DATABASE[itemId];
    if (!itemData) return;

    // Remove 1 copy of item from target unit
    const itemIndex = targetUnit.items.indexOf(itemId);
    if (itemIndex === -1) return;

    const newItems = [...targetUnit.items];
    newItems.splice(itemIndex, 1);

    // Recalculate traits and stats
    const baseChampion = CHAMPION_DATABASE[targetUnit.unitId] || CHAMPION_DATABASE.luffy;
    const starMultiplier = targetUnit.stars === 1 ? 1 : targetUnit.stars === 2 ? 1.8 : 3.2;

    let baseHp = Math.round(baseChampion.baseHp * starMultiplier);
    let baseAd = Math.round(baseChampion.baseAd * starMultiplier);
    let baseAp = Math.round(baseChampion.baseAp * starMultiplier);
    let baseArmor = baseChampion.baseArmor;
    let baseMr = baseChampion.baseMr;
    let baseAs = baseChampion.attackSpeed;
    const baseTraits = [...baseChampion.traits];

    newItems.forEach((itId) => {
      const it = ITEM_DATABASE[itId];
      if (!it) return;
      if (it.grantTrait && !baseTraits.includes(it.grantTrait)) {
        baseTraits.push(it.grantTrait);
      }
      if (itId === 'espada_pirata') {
        baseAd += 25;
        baseAs += 0.15;
      } else if (itId === 'armadura_haki') {
        baseArmor += 30;
        baseMr += 30;
        baseHp += 200;
      } else if (itId === 'lente_clarividencia') {
        baseAp += 35;
      } else if (itId === 'garrafa_sake') {
        const isDrunkard = targetUnit.unitId === 'zoro' || targetUnit.unitId === 'shanks';
        baseAd += isDrunkard ? 40 : 20;
        baseHp += isDrunkard ? 300 : 150;
        baseAs += isDrunkard ? 0.30 : 0.15;
      } else if (itId === 'frasco_rum') {
        baseAs += 0.20;
      } else if (itId === 'capa_almirante') {
        baseHp += 400;
      } else if (itId === 'canhao_flutuante') {
        baseAd += 35;
        baseAp += 20;
      }
    });

    const hasSpecial = newItems.some((itId) => ITEM_DATABASE[itId]?.isSpecialActivation);

    const updatedUnit: UnitInstance = {
      ...targetUnit,
      items: newItems,
      hasSpecialItem: hasSpecial,
      traits: baseTraits,
      ad: baseAd,
      ap: baseAp,
      hp: Math.min(targetUnit.hp, baseHp),
      maxHp: baseHp,
      armor: baseArmor,
      mr: baseMr,
      attackSpeed: baseAs,
    };

    // Return item to player's item bag
    setPlayerItems((prev) => [...prev, itemId]);

    setBoardUnits((prev) =>
      prev.map((u) => (u.instanceId === updatedUnit.instanceId ? updatedUnit : u))
    );
    setBenchSlots((prev) =>
      prev.map((u) => (u && u.instanceId === updatedUnit.instanceId ? updatedUnit : u))
    );
    setSelectedUnit(updatedUnit);
  };

  // === Test Mode Actions & Handlers ===
  const handleToggleTestMode = useCallback(() => {
    if (!isTestMode) {
      // Enter test mode
      setIsTestMode(true);
      setIsTimerPaused(true);
      setPhase('PREPARATION');
      setCombatUnits([]);
      setBattleOutcome(null);
      setViewingCommanderId('p1_human');
      setSelectedUnit(null);
      setTestAnimationOverride(null);
    } else {
      // Exit test mode and restart the game cleanly
      setIsTestMode(false);
      setTestAnimationOverride(null);
      handleRestartGame();
    }
  }, [isTestMode]);

  const handleToggleCombatPhase = useCallback(async () => {
    if (phase === 'PREPARATION') {
      const currentBoard = boardUnitsRef.current;
      if (currentBoard.length === 0) return;

      // 1. Salvar as posições originais de edição para que ao clicar em "Voltar ao Modo Edição", cada personagem volte para o seu lugar
      testEditModeBoardRef.current = currentBoard.map((u) => ({ ...u }));

      const playerUnits = currentBoard.filter((u) => !u.isEnemy);
      const enemyUnits = currentBoard.filter((u) => u.isEnemy);

      let testBoard = [...currentBoard];
      // If user placed units on only one side, automatically spawn opponent copies
      if (enemyUnits.length === 0 && playerUnits.length > 0) {
        playerUnits.forEach((pu, idx) => {
          const mirror: UnitInstance = {
            ...createUnitInstance(pu.unitId, pu.stars || 1, Math.min(7, Math.max(4, 7 - pu.gridX)), pu.gridY, -1, true),
            instanceId: `${pu.unitId}_mirror_${idx}_${Date.now()}`,
            items: pu.items ? [...pu.items] : [],
            hasSpecialItem: pu.hasSpecialItem || false,
          };
          testBoard.push(mirror);
        });
        setBoardUnits(testBoard);
        boardUnitsRef.current = testBoard;
      }

      // 2. Garantir que todas as animações e rig estão devidamente carregados antes do combate iniciar
      setIsCombatStarting(true);
      setCombatWarmupCountdown(1);
      try {
        await loadChampionModularRig();
      } catch (err) {
        console.warn('Pré-carregamento de animações pronto:', err);
      }

      const initialCombat = initializeCombatUnits(testBoard);
      setCombatUnits(initialCombat);
      lastTickTimeRef.current = Date.now();
      setIsCombatStarting(false);
      setPhase('COMBAT');
      setCountdown(45);
      setBattleOutcome(null);
      setTestAnimationOverride(null);
    } else {
      // Return to PREPARATION (Modo Edição)
      // "ao clicar modo edition, cada personagem volta para seu lugar"
      if (combatLoopRef.current) {
        cancelAnimationFrame(combatLoopRef.current);
        combatLoopRef.current = null;
      }
      setIsCombatStarting(false);
      setPhase('PREPARATION');
      setCombatUnits([]);
      setBattleOutcome(null);
      setTestAnimationOverride(null);

      // Restaura cada personagem para a sua posição exata salva no modo edição
      const savedOriginals = testEditModeBoardRef.current;
      if (savedOriginals && savedOriginals.length > 0) {
        const restored = savedOriginals.map((u) => ({
          ...u,
          hp: u.maxHp,
          mana: CHAMPION_DATABASE[u.unitId]?.startMana || 0,
          shield: 0,
        }));
        setBoardUnits(restored);
        boardUnitsRef.current = restored;
      } else {
        // Revive all board units to full health
        setBoardUnits((prev) =>
          prev.map((u) => ({
            ...u,
            hp: u.maxHp,
            mana: CHAMPION_DATABASE[u.unitId]?.startMana || 0,
            shield: 0,
          }))
        );
      }
    }
  }, [phase]);

  const handleClearTestBoard = useCallback(() => {
    testEditModeBoardRef.current = [];
    setBoardUnits([]);
    boardUnitsRef.current = [];
    setCombatUnits([]);
    setSelectedUnit(null);
    setBattleOutcome(null);
    setTestAnimationOverride(null);
    setPhase('PREPARATION');
  }, []);

  const handleQuickDuelTest = useCallback(() => {
    // Zoro with Sakê vs Mihawk
    const zoro = createUnitInstance('zoro', 2, 2, 2, -1, false);
    zoro.items = ['garrafa_sake'];
    zoro.hasSpecialItem = true;
    const mihawk = createUnitInstance('mihawk', 2, 5, 2, -1, true);

    const duelUnits = [zoro, mihawk];
    setBoardUnits(duelUnits);
    boardUnitsRef.current = duelUnits;
    setSelectedUnit(zoro);
    const initialCombat = initializeCombatUnits(duelUnits);
    setCombatUnits(initialCombat);
    setPhase('COMBAT');
    setCountdown(45);
    setBattleOutcome(null);
    setTestAnimationOverride(null);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      
      {/* 1. Header (Clock, Round, Phase, 60s Timer with 15s Overtime alert, Audio controller) */}
      <Header
        phase={phase}
        isCombatStarting={isCombatStarting}
        combatWarmupCount={combatWarmupCountdown}
        countdown={countdown}
        totalTime={totalGameTime}
        roundNumber={(stage - 1) * 4 + roundInStage}
        isPaused={isTimerPaused}
        isViewingOpponentArena={isViewingOpponentArena}
        opponentName={viewingCommander.name}
        isTestMode={isTestMode}
        difficulty={difficulty}
        isDifficultyLocked={isDifficultyLocked}
        onOpenDifficultyModal={() => setIsDifficultyModalOpen(true)}
        onTogglePause={() => setIsTimerPaused((prev) => !prev)}
        onResetTimer={() => setCountdown(30)}
        onTogglePhase={
          isTestMode
            ? handleToggleCombatPhase
            : () => {
                if (phase === 'PREPARATION') {
                  startCombatPhase();
                } else {
                  handleProceedToNextRound();
                }
              }
        }
        onToggleTestMode={handleToggleTestMode}
        onClearBoard={handleClearTestBoard}
        onQuickDuel={handleQuickDuelTest}
      />

      {/* Main Tactical Split Layout with Arena Expanding to Full Screen */}
      <div className="flex-1 relative overflow-hidden flex">
        
        {/* 2. Left Lateral: Floating 8 Commanders Lobby List - Hidden in Test Mode */}
        {!isTestMode && (
          <div className="absolute left-3 top-3 bottom-24 z-20 pointer-events-none flex flex-col">
            <div className="pointer-events-auto h-full flex flex-col">
              <PlayerList
                commanders={commanders}
                viewingCommanderId={viewingCommanderId}
                onSelectCommander={(cmdId) => setViewingCommanderId(cmdId)}
              />
            </div>
          </div>
        )}

        {/* 3. Center: 3D Isometric Arena Board (Takes Full Viewport) */}
        <div className="absolute inset-0 flex flex-col">
          <ArenaBoard
            boardUnits={displayedBoardUnits}
            combatUnits={combatUnits}
            floatingTexts={floatingTexts}
            attackEffects={attackEffects}
            isCombatPhase={phase === 'COMBAT'}
            isCombatStarting={isCombatStarting}
            combatWarmupCount={combatWarmupCountdown}
            isOvertime={isOvertime}
            roundStage={roundStage}
            roundTitle={roundTitle}
            battleOutcome={battleOutcome}
            maxUnits={maxBoardUnits}
            playerUnitsCount={playerUnitsOnBoard.length}
            selectedUnitId={selectedUnit?.instanceId || null}
            draggedUnit={draggedUnit}
            isViewingOpponentArena={isViewingOpponentArena}
            viewingCommander={viewingCommander}
            isTestMode={isTestMode}
            testAnimationOverride={testAnimationOverride}
            gold={gold}
            level={level}
            xp={xp}
            xpNeeded={xpNeeded}
            onUnitSelect={(u) => {
              setSelectedUnit(u);
              setTestAnimationOverride(null);
            }}
            onTileClick={(x, y) => {
              if (phase === 'COMBAT') {
                const u = combatUnits.find(
                  (unit) =>
                    Math.round(unit.currentPosX) === x &&
                    Math.round(unit.currentPosY) === y &&
                    unit.hp > 0
                );
                if (u) {
                  setSelectedUnit(u);
                  setTestAnimationOverride(null);
                }
              } else {
                const u = displayedBoardUnits.find((unit) => unit.gridX === x && unit.gridY === y);
                if (
                  selectedUnit &&
                  !selectedUnit.isEnemy &&
                  !isViewingOpponentArena &&
                  x <= 3 &&
                  y >= 0 &&
                  y < 5
                ) {
                  if (u && u.instanceId === selectedUnit.instanceId) {
                    setSelectedUnit(null);
                  } else {
                    executePlaceOrMoveUnit(selectedUnit, x, y);
                  }
                } else if (u) {
                  setSelectedUnit(u);
                  setTestAnimationOverride(null);
                }
              }
            }}
            onDragStartUnit={handleDragStartUnit}
            onDragEnd={handleDragEnd}
            onDragOverTile={handleDragOverTile}
            onDropOnTile={handleDropOnTile}
          />
        </div>

        {/* 4. Bottom Floating Bar: Bench & Retractable Shop Drawer */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 pointer-events-auto">
          {/* Bench Slots */}
          <Bench
            benchSlots={isTestMode ? allTestChampions : displayedBenchSlots}
            selectedUnitId={selectedUnit?.instanceId || null}
            onSlotClick={(idx) => {}}
            onUnitSelect={(u) => {
              setSelectedUnit(u);
              setTestAnimationOverride(null);
            }}
            onDragStart={handleDragStartUnit}
            onDragEnd={handleDragEnd}
            onDragOver={(e, idx) => e.preventDefault()}
            onDrop={handleDropOnBench}
            isViewingOpponentArena={isViewingOpponentArena}
            opponentName={viewingCommander.name}
            isTestMode={isTestMode}
            playerUnitsCount={playerUnitsOnBoard.length}
            maxUnits={maxBoardUnits}
            level={level}
            xp={xp}
            xpNeeded={xpNeeded}
          />

          {/* Retractable Golden Shop Modal - Hidden in Test Mode */}
          {!isTestMode && (
            <ShopModal
              isOpen={isShopOpen}
              onToggleOpen={() => setIsShopOpen(!isShopOpen)}
              shopCards={shopCards}
              gold={gold}
              level={level}
              xp={xp}
              xpNeeded={xpNeeded}
              isLocked={isShopLocked}
              onToggleLock={() => setIsShopLocked(!isShopLocked)}
              onReroll={handleRerollShop}
              onBuyXp={handleBuyXp}
              onBuyCard={handleBuyCard}
              draggedUnit={draggedUnit}
              onSellUnit={handleSellUnit}
              isViewingOpponentArena={isViewingOpponentArena}
              opponentName={viewingCommander.name}
              onReturnToPlayerArena={() => setViewingCommanderId('p1_human')}
            />
          )}
        </div>

        {/* 5. Right Lateral: Floating Multifunctional Sidebar (Sinergias, Baú de Itens, DPS) - Hidden in Test Mode */}
        {!isTestMode && (
          <div className="absolute right-3 top-3 bottom-24 z-20 pointer-events-none flex flex-col">
            <div className="pointer-events-auto h-full flex flex-col">
              <RightSidebar
                activeSynergies={activeSynergies}
                boardUnits={phase === 'COMBAT' && combatUnits.length > 0 && !isViewingOpponentArena ? combatUnits : displayedBoardUnits}
                benchUnits={displayedBenchSlots}
                playerItems={playerItems}
                selectedUnit={selectedUnit}
                selectedSynergyId={selectedSynergyId}
                onSelectSynergyId={setSelectedSynergyId}
                onEquipItemToUnit={handleEquipItemToUnit}
                onDragStartItem={(e, itemId) => {
                  setDraggedItemId(itemId);
                }}
                onItemClick={(item) => {
                  if (selectedUnit && !isViewingOpponentArena) {
                    handleEquipItemToUnit(item.id, selectedUnit);
                  }
                }}
              />
            </div>
          </div>
        )}

      </div>

      {/* Unit Inspector Modal (for Skill A / Skill B switching, 2 Battle + 1 Special Slots & Removal) - Hidden in Test Mode */}
      {!isTestMode && selectedUnit && (
        <UnitInspector
          unit={selectedUnit}
          gamePhase={phase}
          changedSkillUnitIdThisRound={changedSkillUnitIdThisRound}
          isViewingOpponentArena={isViewingOpponentArena}
          onClose={() => setSelectedUnit(null)}
          onSelectSkill={handleSelectSkill}
          onUnequipItem={handleUnequipItem}
          onSellUnit={handleSellUnit}
        />
      )}

      {/* 6. Character Animation Testing Panel (in Test Mode when unit is selected) */}
      {isTestMode && selectedUnit && (
        <AnimationTestBar
          selectedUnit={selectedUnit}
          currentAnimation={testAnimationOverride}
          onTriggerAnimation={(anim) => setTestAnimationOverride(anim)}
          onSetStars={(stars) => {
            const updated = { ...selectedUnit, stars };
            setBoardUnits((prev) =>
              prev.map((u) => (u.instanceId === selectedUnit.instanceId ? updated : u))
            );
            setSelectedUnit(updated);
          }}
          onToggleTeam={() => {
            const isEnemyNow = !selectedUnit.isEnemy;
            const updated: UnitInstance = {
              ...selectedUnit,
              isEnemy: isEnemyNow,
              gridX: isEnemyNow
                ? Math.min(7, Math.max(4, selectedUnit.gridX < 4 ? selectedUnit.gridX + 4 : selectedUnit.gridX))
                : Math.max(0, Math.min(3, selectedUnit.gridX >= 4 ? selectedUnit.gridX - 4 : selectedUnit.gridX)),
            };
            setBoardUnits((prev) =>
              prev.map((u) => (u.instanceId === selectedUnit.instanceId ? updated : u))
            );
            setSelectedUnit(updated);
          }}
          onRemoveUnit={() => {
            setBoardUnits((prev) => prev.filter((u) => u.instanceId !== selectedUnit.instanceId));
            setSelectedUnit(null);
            setTestAnimationOverride(null);
          }}
          onEquipSake={() => {
            const hasSake = selectedUnit.items?.includes('garrafa_sake');
            let nextItems = selectedUnit.items ? [...selectedUnit.items] : [];
            if (hasSake) {
              nextItems = nextItems.filter((it) => it !== 'garrafa_sake');
            } else {
              if (nextItems.length >= 3) nextItems.pop();
              nextItems.push('garrafa_sake');
            }
            const isSpecial = nextItems.some((it) => ITEM_DATABASE[it]?.isSpecialActivation);
            const updated: UnitInstance = {
              ...selectedUnit,
              items: nextItems,
              hasSpecialItem: isSpecial,
            };
            setBoardUnits((prev) =>
              prev.map((u) => (u.instanceId === selectedUnit.instanceId ? updated : u))
            );
            setSelectedUnit(updated);
          }}
          onClose={() => {
            setSelectedUnit(null);
            setTestAnimationOverride(null);
          }}
        />
      )}

      {/* Round Resolution Banner (Victory / Defeat / Draw with TFT Economy & Automatic Waiting Status) */}
      <RoundOutcomeBanner
        outcome={battleOutcome}
        roundStage={roundStage}
        roundTitle={roundTitle}
        income={lastRoundIncome}
        damageTaken={roundDamageTaken}
        xpGained={lastRoundXp}
        commanders={commanders}
        isAllBattlesFinished={commanders
          .filter((c) => !c.isEliminated)
          .every((c) => c.roundCombatStatus && c.roundCombatStatus !== 'FIGHTING')}
      />

      {/* Item Draft Selection Modal (Rounds 3, 6, 9, 12, 15, 18, 21, 24) */}
      <ItemDraftModal
        isOpen={isItemDraftOpen}
        roundNumber={draftRoundNumber}
        isBossReward={isBossDraft}
        onSelectItem={handleSelectDraftItem}
      />

      {/* Game Difficulty Selection Modal */}
      <DifficultyModal
        isOpen={isDifficultyModalOpen}
        currentDifficulty={difficulty}
        isLocked={isDifficultyLocked}
        onSelectDifficulty={handleSelectDifficulty}
        onClose={() => setIsDifficultyModalOpen(false)}
        onRestartGame={handleRestartGame}
      />

      {/* Game Over Modal with Blur Arena & Spectate / Return options */}
      <GameOverModal
        isOpen={isGameOverModalOpen}
        playerRank={userPlacementRank}
        onRestart={handleRestartGame}
        onSpectate={() => {
          setIsSpectating(true);
          setIsGameOverModalOpen(false);
        }}
      />

      {/* Global Blocking 3D Model Loading Screen */}
      <LoadingScreen
        isLoading={isAssetsLoading}
        progress={loadingProgress}
        currentAsset={loadingAssetLabel}
      />

      {/* Force Landscape Orientation Guard for Mobile */}
      <OrientationGuard />

      {/* Thief Synergy Theft Floating Alert Notification */}
      <TheftBannerNotification
        theft={activeTheftEvent}
        onClose={() => setActiveTheftEvent(null)}
      />

    </div>
  );
}
