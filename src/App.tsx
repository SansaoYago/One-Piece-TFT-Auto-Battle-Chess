import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Commander,
  GamePhase,
  ItemData,
  UnitBaseData,
  UnitInstance,
  GameDifficulty,
  DIFFICULTY_CONFIGS,
  OpponentDisplayInfo,
} from './types/game';
import { AttackEffect, CombatUnitState, FloatingText, TheftEvent } from './types/combat';
import { CHAMPION_DATABASE } from './data/units';
import { INITIAL_COMMANDERS, ITEM_DATABASE } from './data/items';
import {
  createUnitInstance,
  calculateActiveSynergies,
  calculateUnitSellValue,
  performStarUpgrades,
  generateShopCards as generateShopCardsUtil,
  THREE_STAR_CHANCE_BY_TIER,
  LEVEL_XP_REQUIREMENTS,
  LEVEL_MAX_SLOTS,
  SHOP_ODDS_BY_LEVEL,
} from './utils/gameUtils';
import { initializeCombatUnits, simulateCombatTick } from './engine/combatEngine';
import { generateEnemyBoardUnits, BOT_OPPONENTS, isPvEBossRound } from './engine/botAI';
import { generateIndividualBotState, BotPlayerData } from './engine/botStateManager';
import {
  generateRoundMatchmaking,
  convertBotBoardToEnemyUnits,
  ScheduledBotMatch,
  RoundMatchmakingResult,
} from './engine/matchmaking';
import { Header } from './components/Header';
import { PlayerList } from './components/PlayerList';
import { RightSidebar } from './components/RightSidebar';
import { ArenaBoard } from './components/ArenaBoard';
import { Bench } from './components/Bench';
import { ShopModal } from './components/ShopModal';
import { MiniShopModal } from './components/MiniShopModal';
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
import { ChampionVisual } from './components/ChampionVisual';
import { multiplayerClient } from './utils/multiplayerClient';
import { MultiplayerRoomState, EmoteMessage, AvailableRoomSummary } from './types/multiplayer';
import { MultiplayerLobbyModal } from './components/MultiplayerLobbyModal';
import { subscribeToActiveRoomsFirestore, fetchActiveRoomsFirestore } from './services/firebase';

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
  const commandersRef = useRef<Commander[]>(commanders);
  commandersRef.current = commanders;
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
  const [botPlayerStates, setBotPlayerStates] = useState<Record<string, BotPlayerData>>(() => {
    const states: Record<string, BotPlayerData> = {};
    INITIAL_COMMANDERS.forEach((cmd) => {
      if (!cmd.isHuman) {
        states[cmd.id] = generateIndividualBotState(cmd.id, 1, 'medium');
      }
    });
    return states;
  });
  const botPlayerStatesRef = useRef<Record<string, BotPlayerData>>(botPlayerStates);
  botPlayerStatesRef.current = botPlayerStates;

  // === Multiplayer Online Networking State ===
  const [isMultiplayerModalOpen, setIsMultiplayerModalOpen] = useState<boolean>(false);
  const [isMultiplayerActive, setIsMultiplayerActive] = useState<boolean>(false);
  const isMultiplayerActiveRef = useRef<boolean>(false);
  isMultiplayerActiveRef.current = isMultiplayerActive;
  const [multiplayerRoom, setMultiplayerRoom] = useState<MultiplayerRoomState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const localPlayerIdRef = useRef<string | null>(null);
  localPlayerIdRef.current = localPlayerId;
  const [multiplayerError, setMultiplayerError] = useState<string | null>(null);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoomSummary[]>([]);
  const [serverUrl, setServerUrl] = useState<string>(() => multiplayerClient.getServerUrl());
  const [activeEmotes, setActiveEmotes] = useState<EmoteMessage[]>([]);
  const multiplayerOpponentRef = useRef<{
    id: string;
    name: string;
    avatar: string;
    units: UnitInstance[];
  } | null>(null);

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
    // Inicia com apenas 1 personagem aleatório pirata de Tier 1 no banco
    const tier1Champions = ['luffy', 'nami', 'usopp', 'buggy'];
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
  const combatEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const combatLoopRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(Date.now());
  const [activeTheftEvent, setActiveTheftEvent] = useState<TheftEvent | null>(null);
  const theftTrackerRef = useRef<{ player: boolean; enemy: boolean }>({ player: false, enemy: false });
  const playerItemsRef = useRef<string[]>(playerItems);
  playerItemsRef.current = playerItems;

  // === Dynamic Matchmaking & Opponent Tracking ===
  const currentOpponentCommanderIdRef = useRef<string | null>(null);
  const isHumanFightingGhostRef = useRef<boolean>(false);
  const scheduledMatchmakingRef = useRef<RoundMatchmakingResult>(
    generateRoundMatchmaking(INITIAL_COMMANDERS, 1, 1, 1, 'medium', botPlayerStates)
  );
  const [currentOpponentInfo, setCurrentOpponentInfo] = useState<OpponentDisplayInfo>({
    name: '2 Recrutas da Marinha',
    avatar: '⚓',
    isGhost: false,
    isBoss: false,
    isPvE: true,
  });

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

  // Shop State (Round 1: Shop is hidden/closed; unlocks from Round 2 onwards)
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [isShopLocked, setIsShopLocked] = useState<boolean>(false);
  const [shopCards, setShopCards] = useState<(UnitBaseData | null)[]>([]);
  const [isMiniShopOpen, setIsMiniShopOpen] = useState<boolean>(false);
  const shopCardsRef = useRef<(UnitBaseData | null)[]>([]);
  shopCardsRef.current = shopCards;

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

  // Keep botPlayerStatesRef synchronized with botPlayerStates state
  useEffect(() => {
    botPlayerStatesRef.current = botPlayerStates;
  }, [botPlayerStates]);

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
        // Mirror the scouted opponent's units onto the OPPONENT / ENEMY side (columns 4..7)
        // following competitive auto-battler conventions (TFT/Auto-Chess):
        // Col 0 (back) -> Col 7 (enemy back)
        // Col 1 (mid-back) -> Col 6 (enemy mid-back)
        // Col 2 (mid-front) -> Col 5 (enemy mid-front)
        // Col 3 (front) -> Col 4 (enemy front facing player)
        const mirroredOpponentUnits: UnitInstance[] = botData.boardUnits
          .filter((u) => u.gridX >= 0 && u.gridY >= 0)
          .map((u) => {
            const base = CHAMPION_DATABASE[u.unitId];
            return {
              ...u,
              instanceId: `scout_${u.instanceId}`,
              isEnemy: true,
              gridX: Math.min(7, Math.max(4, 7 - Math.round(u.gridX))),
              gridY: Math.min(4, Math.max(0, Math.round(u.gridY))),
              hp: u.maxHp,
              shield: 0,
              mana: base?.startMana || 0,
            };
          });

        // Keep player's own team visible in their territory (columns 0..3)
        // so the player can directly compare positioning against the opponent's mirrored formation!
        const playerSideUnits = boardUnits.filter((u) => !u.isEnemy && u.gridX >= 0 && u.gridY >= 0);
        return [...playerSideUnits, ...mirroredOpponentUnits];
      }
      return boardUnits;
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

  // Calculate active synergies dynamically (reflecting scouted opponent when spying)
  const activeSynergies = useMemo(() => {
    if (isViewingOpponentArena) {
      const botData = botPlayerStates[viewingCommanderId];
      if (botData) {
        return calculateActiveSynergies(botData.boardUnits);
      }
    }
    return calculateActiveSynergies(boardUnits.filter((u) => !u.isEnemy));
  }, [isViewingOpponentArena, viewingCommanderId, botPlayerStates, boardUnits]);

  // Is Overtime active (at 15s remaining or less during combat)
  const isOvertime = phase === 'COMBAT' && countdown <= 15;

  // === Reroll / Generate Shop Cards Based on Level Odds & Tier 3★ Odds ===
  const generateShopCards = useCallback(
    (currentLevel: number): (UnitBaseData | null)[] => {
      const playerUnits = [...benchSlotsRef.current, ...boardUnitsRef.current];
      return generateShopCardsUtil(currentLevel, playerUnits);
    },
    []
  );

  // Initialize shop once on initial game mount only
  useEffect(() => {
    setShopCards(generateShopCards(1));
  }, [generateShopCards]);

  // Automatic Star Upgrades check (merging 3x 1★ into 2★, and 3x 2★ into 3★ immediately)
  useEffect(() => {
    if (phase === 'PREPARATION') {
      const upgradeRes = performStarUpgrades(
        benchSlotsRef.current,
        boardUnitsRef.current
      );
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
    if (phaseRef.current === 'COMBAT') return;
    phaseRef.current = 'COMBAT';

    // Clear any previous warmup or auto-advance timers
    warmupTimersRef.current.forEach(clearTimeout);
    warmupTimersRef.current = [];
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    // Retract shop drawer when combat commences so the battlefield is clear and unhindered
    setIsShopOpen(false);

    // Return camera/view to player's home arena when combat starts
    setViewingCommanderId('p1_human');

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
        for (const row of [2, 3, 1, 4, 0]) {
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

    // STRICT OPPONENT PERSISTENCE:
    // Consume the pre-calculated matchmaking scheduled at the start of the round.
    // NEVER nullify or re-roll matchmaking here so the opponent displayed in the UI (e.g. Trafalgar Law)
    // is 100% the exact opponent and roster fought in combat!
    let matchmaking = scheduledMatchmakingRef.current;
    if (!matchmaking) {
      matchmaking = generateRoundMatchmaking(
        commandersRef.current,
        stageRef.current,
        roundInStageRef.current,
        totalRoundRef.current,
        difficultyRef.current || 'medium',
        botPlayerStatesRef.current
      );
      scheduledMatchmakingRef.current = matchmaking;
    }

    currentOpponentCommanderIdRef.current = matchmaking.humanOpponentId;
    isHumanFightingGhostRef.current = matchmaking.isHumanFightingGhost;
    setCurrentOpponentInfo({
      name: matchmaking.opponentName,
      avatar: matchmaking.opponentAvatar,
      isGhost: matchmaking.isHumanFightingGhost,
      isBoss: matchmaking.isBoss,
      bossTitle: matchmaking.bossTitle,
      isPvE: matchmaking.isPvE,
    });
    setRoundTitle(
      matchmaking.isPvE
        ? matchmaking.opponentName
        : `Batalha PvP: ${matchmaking.opponentName}`
    );

    // Setup enemies on board: Keep player's own units and load the scheduled match's enemies
    let combatBoardUnits = updatedBoard.filter((u) => !u.isEnemy);

    if (isMultiplayerActiveRef.current) {
      // In multiplayer: guarantee player has at least 1 deployed combatant
      if (combatBoardUnits.length === 0) {
        const bIdx = updatedBench.findIndex((b) => b !== null);
        if (bIdx !== -1) {
          const bUnit = updatedBench[bIdx]!;
          const movedUnit: UnitInstance = {
            ...bUnit,
            gridX: 1,
            gridY: 2,
            benchIndex: null,
          };
          combatBoardUnits.push(movedUnit);
          updatedBoard.push(movedUnit);
          updatedBench[bIdx] = null;
          setBoardUnits(updatedBoard);
          boardUnitsRef.current = updatedBoard;
          setBenchSlots(updatedBench);
          benchSlotsRef.current = updatedBench;
        } else {
          const fallback = createUnitInstance('luffy', 1, 1, 2, null, false);
          combatBoardUnits.push(fallback);
        }
      }

      // Opponent units: retrieve from opponent or fallback to round-balanced AI enemies
      const opp = multiplayerOpponentRef.current;
      let oppUnits = (opp && opp.units && opp.units.length > 0) ? opp.units : [];
      if (oppUnits.length === 0) {
        oppUnits = generateEnemyBoardUnits(
          stageRef.current,
          roundInStageRef.current,
          totalRoundRef.current,
          'medium'
        ).map((e) => ({ ...e, isEnemy: false }));
      }

      const enemyUnits: UnitInstance[] = oppUnits.map((u, idx) => ({
        ...u,
        instanceId: `net_opp_${u.unitId}_${idx}_${Date.now()}`,
        gridX: Math.max(4, Math.min(7, 7 - (u.gridX >= 0 ? u.gridX : 1))),
        gridY: u.gridY >= 0 ? u.gridY : idx % 5,
        isEnemy: true,
      }));
      combatBoardUnits = [...combatBoardUnits, ...enemyUnits];
    } else if (matchmaking.isPvE) {
      const generatedEnemies = generateEnemyBoardUnits(
        stageRef.current,
        roundInStageRef.current,
        totalRoundRef.current,
        difficultyRef.current || 'medium'
      );
      combatBoardUnits = [...combatBoardUnits, ...generatedEnemies];
    } else if (matchmaking.humanOpponentId) {
      const oppState =
        botPlayerStatesRef.current[matchmaking.humanOpponentId] ||
        botPlayerStates[matchmaking.humanOpponentId] ||
        generateIndividualBotState(
          matchmaking.humanOpponentId,
          totalRoundRef.current,
          difficultyRef.current || 'medium'
        );
      const enemyUnits = convertBotBoardToEnemyUnits(
        oppState.boardUnits,
        matchmaking.isHumanFightingGhost
      );
      combatBoardUnits = [...combatBoardUnits, ...enemyUnits];
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
        roundCombatStatus: c.hp > 0 && !c.isEliminated ? ('FIGHTING' as const) : undefined,
        damageTakenThisRound: 0,
      }))
    );

    // Assign scheduled bot matches from matchmaking engine
    scheduledBotMatchesRef.current = matchmaking.botMatches;

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
    // Strictly prevent running if we are no longer in COMBAT phase
    if (phaseRef.current !== 'COMBAT') return;

    if (combatEndTimeoutRef.current) {
      clearTimeout(combatEndTimeoutRef.current);
      combatEndTimeoutRef.current = null;
    }

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
    const isPvERound = totalRoundRef.current === 1 || isPvEBossRound(totalRoundRef.current);
    const activeOpponentId = currentOpponentCommanderIdRef.current;
    const isGhostBattle = isHumanFightingGhostRef.current;

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

    if (isMultiplayerActiveRef.current) {
      const survivingPlayerUnits = combatUnits.filter((u) => !u.isEnemy && u.hp > 0).length;
      multiplayerClient.submitCombatResult({
        opponentId: currentOpponentCommanderIdRef.current || 'opponent',
        won: isWin,
        isDraw: isDraw,
        survivingUnitsCount: survivingPlayerUnits,
        damageDealtToOpponent: isWin ? (stageRef.current * 2 + Math.max(1, survivingPlayerUnits * 2)) : 0,
      });
    }

    setCommanders((prevCmds) => {
      // 1. Force resolve any remaining scheduled bot matches in other arenas immediately
      if (scheduledBotMatchesRef.current.length > 0) {
        scheduledBotMatchesRef.current.forEach((m) => {
          if (!m.isResolved) {
            m.isResolved = true;
          }
        });
      }

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
        // Rule: If it was a ghost clone match, the original bot was fighting another arena and doesn't take damage here.
        // In real 1v1 (!isGhostBattle), the opponent takes real damage!
        if (!isPvERound && activeOpponentId && c.id === activeOpponentId && !isGhostBattle) {
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

        // Other bots fighting in scheduled matches across other arenas:
        const match = scheduledBotMatchesRef.current.find(
          (m) => (m.botAId === c.id || m.botBId === c.id) && m.isResolved
        );
        if (match) {
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
        }

        // Guaranteed resolution fallback: ensure NO bot remains in 'FIGHTING' status once combat concludes
        if (c.roundCombatStatus === 'FIGHTING' || !c.roundCombatStatus) {
          if (isPvERound) {
            return {
              ...c,
              winStreak: c.winStreak + 1,
              lossStreak: 0,
              roundCombatStatus: 'WON' as const,
              damageTakenThisRound: 0,
            };
          } else {
            const botWon = Math.random() >= 0.5;
            const fallbackDmg = stageRef.current * 2 + 2;
            const nextHp = botWon ? c.hp : Math.max(0, c.hp - fallbackDmg);
            return {
              ...c,
              hp: nextHp,
              isEliminated: nextHp <= 0,
              winStreak: botWon ? c.winStreak + 1 : 0,
              lossStreak: botWon ? 0 : c.lossStreak + 1,
              roundCombatStatus: botWon ? ('WON' as const) : ('LOST' as const),
              damageTakenThisRound: botWon ? 0 : fallbackDmg,
            };
          }
        }

        return c;
      });

      const livingCommanders = updated.filter((c) => c.hp > 0 && !c.isEliminated);
      const isHumanAlive = updated.some((c) => c.isHuman && c.hp > 0 && !c.isEliminated);

      if (isHumanAlive && livingCommanders.length === 1) {
        // VICTORY: All other 7 commanders have been eliminated!
        setUserPlacementRank(1);
        setIsGameOverModalOpen(true);
      } else if (humanDiedThisRound && !isSpectating) {
        setUserPlacementRank(livingCommanders.length + 1);
        setIsGameOverModalOpen(true);
      }

      // Check if all alive commanders have finished
      const allDone = updated
        .filter((c) => !c.isEliminated)
        .every((c) => c.roundCombatStatus && c.roundCombatStatus !== 'FIGHTING');

      if (!isMultiplayerActiveRef.current && allDone && !autoAdvanceTimerRef.current) {
        if (totalRoundRef.current === 1 && isWin) {
          // No Round 1: ao derrotar os marinheiros, abre a Mini Loja com 3 personagens Tier 1 e 2!
          // O avanço para a Rodada 2 ocorrerá após o jogador escolher (ou por tempo limite).
          setIsMiniShopOpen(true);
        } else {
          autoAdvanceTimerRef.current = setTimeout(() => {
            handleProceedToNextRound();
          }, 1800);
        }
      }

      return updated;
    });
  };

  // Handler for Round 1 Victory Mini Shop Choice (Manual selection or Auto-Timeout)
  const handleSelectMiniShopChampion = (champ: UnitBaseData) => {
    // 1. Add chosen champion to the first available bench slot
    const currentBench = [...benchSlotsRef.current];
    const emptyBenchIndex = currentBench.findIndex((slot) => slot === null);
    if (emptyBenchIndex !== -1) {
      const newUnit = createUnitInstance(champ.id, 1, -1, -1, emptyBenchIndex, false);
      currentBench[emptyBenchIndex] = newUnit;
      setBenchSlots(currentBench);
      benchSlotsRef.current = currentBench;
    } else {
      const currentBoard = [...boardUnitsRef.current];
      const newUnit = createUnitInstance(champ.id, 1, 1, 2, -1, false);
      currentBoard.push(newUnit);
      setBoardUnits(currentBoard);
      boardUnitsRef.current = currentBoard;
    }

    // 2. Close the Mini Shop
    setIsMiniShopOpen(false);

    // 3. Immediately proceed to Round 2 (Shop becomes visible and opens by default)
    handleProceedToNextRound();
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
    playerItemsRef.current = [];
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
    const tier1Champions = ['luffy', 'nami', 'usopp', 'buggy'];
    const randomChamp = tier1Champions[Math.floor(Math.random() * tier1Champions.length)];
    slots[0] = createUnitInstance(randomChamp, 1, -1, -1, 0, false);
    setBenchSlots(slots);
    benchSlotsRef.current = slots;

    setCombatUnits([]);
    setFloatingTexts([]);
    setAttackEffects([]);
    setBattleOutcome(null);
    setIsShopOpen(false);
    setIsMiniShopOpen(false);
    setIsShopLocked(false);
    isShopLockedRef.current = false;
    setShopCards(generateShopCards(1));

    const initialStates: Record<string, BotPlayerData> = {};
    INITIAL_COMMANDERS.forEach((cmd) => {
      if (!cmd.isHuman) {
        initialStates[cmd.id] = generateIndividualBotState(cmd.id, 1, difficultyRef.current || 'medium');
      }
    });
    botPlayerStatesRef.current = initialStates;
    setBotPlayerStates(initialStates);

    if (combatEndTimeoutRef.current) {
      clearTimeout(combatEndTimeoutRef.current);
      combatEndTimeoutRef.current = null;
    }
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    const initialRound1Match = generateRoundMatchmaking(
      INITIAL_COMMANDERS,
      1,
      1,
      1,
      difficultyRef.current || 'medium',
      initialStates
    );
    scheduledMatchmakingRef.current = initialRound1Match;
    currentOpponentCommanderIdRef.current = null;
    isHumanFightingGhostRef.current = false;
    setCurrentOpponentInfo({
      name: initialRound1Match.opponentName,
      avatar: initialRound1Match.opponentAvatar,
      isGhost: false,
      isBoss: false,
      isPvE: true,
    });
  };

  // Move to next stage and reset board units to preparation
  const handleProceedToNextRound = () => {
    // Stop round advancement if victory or defeat has already ended the match!
    const living = commanders.filter((c) => c.hp > 0 && !c.isEliminated);
    const humanAlive = commanders.some((c) => c.isHuman && c.hp > 0 && !c.isEliminated);
    if ((humanAlive && living.length <= 1) || (!humanAlive && !isSpectating)) {
      return;
    }

    if (combatEndTimeoutRef.current) {
      clearTimeout(combatEndTimeoutRef.current);
      combatEndTimeoutRef.current = null;
    }
    warmupTimersRef.current.forEach(clearTimeout);
    warmupTimersRef.current = [];
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setIsCombatStarting(false);
    setCombatWarmupCountdown(3);

    setPhase('PREPARATION');
    phaseRef.current = 'PREPARATION';
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

    // Generate fresh bot states for the upcoming round immediately so scouting and matchmaking share the identical units
    const nextBotStates: Record<string, BotPlayerData> = {};
    commandersRef.current.forEach((cmd) => {
      if (!cmd.isHuman) {
        nextBotStates[cmd.id] = generateIndividualBotState(
          cmd.id,
          nextTotalRound,
          difficultyRef.current || 'medium'
        );
      }
    });
    setBotPlayerStates(nextBotStates);

    // Pre-calculate matchmaking for the upcoming round so Header accurately displays next opponent & boss status
    const upcomingMatch = generateRoundMatchmaking(
      commandersRef.current,
      nextStage,
      nextRoundInStage,
      nextTotalRound,
      difficultyRef.current || 'medium',
      nextBotStates
    );
    scheduledMatchmakingRef.current = upcomingMatch;
    currentOpponentCommanderIdRef.current = upcomingMatch.humanOpponentId;
    setCurrentOpponentInfo({
      name: upcomingMatch.opponentName,
      avatar: upcomingMatch.opponentAvatar,
      isGhost: upcomingMatch.isHumanFightingGhost,
      isBoss: upcomingMatch.isBoss,
      bossTitle: upcomingMatch.bossTitle,
      isPvE: upcomingMatch.isPvE,
    });

    // Determine Title dynamically using Bot AI & Boss progression
    let title = '';
    if (upcomingMatch.isPvE) {
      title = upcomingMatch.isBoss
        ? `${upcomingMatch.bossTitle || 'PvE Boss'}: ${upcomingMatch.opponentName}`
        : `PvE: ${upcomingMatch.opponentName}`;
    } else {
      title = `Batalha PvP: ${upcomingMatch.opponentName}`;
    }
    setRoundTitle(title);

    // Restore player units to starting HP/Mana using live ref, strictly locking to player side (cols 0..3, rows 0..4)
    const restoredPlayerUnits = boardUnitsRef.current
      .filter((u) => !u.isEnemy && u.gridX >= 0 && u.gridY >= 0)
      .map((u) => ({
        ...u,
        isEnemy: false,
        gridX: Math.min(3, Math.max(0, Math.round(u.gridX))),
        gridY: Math.min(4, Math.max(0, Math.round(u.gridY))),
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
      ).map((e) => ({
        ...e,
        isEnemy: true,
        gridX: Math.min(7, Math.max(4, Math.round(e.gridX))),
        gridY: Math.min(4, Math.max(0, Math.round(e.gridY))),
      }));
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

    // Da 2ª rodada em diante: loja visível e abre por padrão carregando novos personagens aleatórios
    if (nextTotalRound >= 2) {
      setIsShopOpen(true);
      if (!isShopLockedRef.current) {
        let newCards = generateShopCards(levelRef.current, restoredPlayerUnits);
        // Garante que a nova rolagem não seja uma repetição idêntica das cartas anteriores
        const prevCardIds = (shopCardsRef.current || []).map((c) => c?.id).filter(Boolean).join(',');
        let attempts = 0;
        while ((newCards || []).map((c) => c?.id).filter(Boolean).join(',') === prevCardIds && attempts < 4) {
          newCards = generateShopCards(levelRef.current, restoredPlayerUnits);
          attempts++;
        }
        setShopCards(newCards);
        shopCardsRef.current = newCards;
      } else {
        // Manteve a loja travada nesta rodada; destrava automaticamente para rodadas subsequentes
        setIsShopLocked(false);
        isShopLockedRef.current = false;
      }
    } else {
      setIsShopOpen(false);
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
            if (combatEndTimeoutRef.current) {
              clearTimeout(combatEndTimeoutRef.current);
            }
            combatEndTimeoutRef.current = setTimeout(() => {
              endCombatAndAdvanceRound(tickResult.winner!);
            }, 600);
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
      if (combatEndTimeoutRef.current) {
        clearTimeout(combatEndTimeoutRef.current);
        combatEndTimeoutRef.current = null;
      }
    };
  }, [phase, isTimerPaused, isCombatStarting, isTestMode, activeSynergies, isOvertime]);

  // === Game Clock & Dynamic Countdown Timer ===
  useEffect(() => {
    if (isTimerPaused || isCombatStarting || isTestMode || isMultiplayerActive) return;

    const timerInterval = setInterval(() => {
      setTotalGameTime((prev) => prev + 1);
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [isTimerPaused, isCombatStarting, isTestMode, isMultiplayerActive]);

  // === Phase Progression & Scheduled Match Progression on Clock Ticks ===
  useEffect(() => {
    if (isTimerPaused || isCombatStarting || isTestMode || isMultiplayerActive) return;

    if (phase === 'COMBAT') {
      // Progress scheduled bot matches in other arenas
      if (scheduledBotMatchesRef.current.length > 0) {
        let matchesUpdated = false;
        scheduledBotMatchesRef.current.forEach((m) => {
          if (!m.isResolved && countdown <= m.finishCountdown) {
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

            const livingCommanders = updated.filter((c) => c.hp > 0 && !c.isEliminated);
            const isHumanAlive = updated.some((c) => c.isHuman && c.hp > 0 && !c.isEliminated);

            if (isHumanAlive && livingCommanders.length === 1) {
              // Victory triggered by bot elimination!
              setUserPlacementRank(1);
              setIsGameOverModalOpen(true);
            } else {
              // Check if all alive commanders have finished
              const allDone = updated
                .filter((c) => !c.isEliminated)
                .every((c) => c.roundCombatStatus && c.roundCombatStatus !== 'FIGHTING');

              if (!isMultiplayerActiveRef.current && allDone && !autoAdvanceTimerRef.current) {
                autoAdvanceTimerRef.current = setTimeout(() => {
                  handleProceedToNextRound();
                }, 1800);
              }
            }

            return updated;
          });
        }
      }
    }

    if (!isMultiplayerActive && countdown <= 0) {
      if (phase === 'PREPARATION') {
        startCombatPhase();
      } else if (phase === 'COMBAT') {
        if (battleOutcome === null) {
          endCombatAndAdvanceRound('DRAW');
        } else {
          handleProceedToNextRound();
        }
      }
    }
  }, [countdown, phase, isTimerPaused, isCombatStarting, isTestMode, isMultiplayerActive, battleOutcome]);

  // === Multiplayer Socket Event Subscriptions ===
  useEffect(() => {
    multiplayerClient.onRoomJoined = (room, pId) => {
      setMultiplayerRoom(room);
      setLocalPlayerId(pId);
      setIsMultiplayerActive(true);
      isMultiplayerActiveRef.current = true;
    };

    multiplayerClient.onRoomStateUpdated = (room) => {
      setMultiplayerRoom(room);
    };

    multiplayerClient.onGameStarted = (room) => {
      setMultiplayerRoom(room);
      setIsMultiplayerModalOpen(false);
      setIsMultiplayerActive(true);
      isMultiplayerActiveRef.current = true;

      // Update commanders from room's 8 players
      const newCommanders: Commander[] = room.players.map((p, idx) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        title: p.isBot ? 'Bot do Grand Line' : 'Capitão Pirata',
        isHuman: p.id === localPlayerIdRef.current,
        hp: p.hp,
        maxHp: 100,
        gold: p.gold,
        level: p.level,
        xp: 0,
        xpToNextLevel: 4,
        winStreak: p.streak,
        lossStreak: 0,
        rank: p.placement || idx + 1,
        isEliminated: p.isEliminated,
        roundCombatStatus: undefined,
        damageTakenThisRound: 0,
      }));
      setCommanders(newCommanders);
      commandersRef.current = newCommanders;

      setPhase(room.phase);
      setCountdown(room.countdown);
      setStage(room.stage);
      setRoundInStage(room.roundInStage);
      setRoundStage(room.roundStage);
      const computedTotalRound = (room.stage - 1) * 4 + room.roundInStage;
      setTotalRound(computedTotalRound);
      totalRoundRef.current = computedTotalRound;

      // Auto-deploy starting unit from bench to board if arena is currently empty
      const currentBench = [...benchSlotsRef.current];
      const playerBoard = boardUnitsRef.current.filter((u) => !u.isEnemy && u.gridX >= 0);
      if (playerBoard.length === 0) {
        const bIdx = currentBench.findIndex((b) => b !== null);
        if (bIdx !== -1) {
          const placed = { ...currentBench[bIdx]!, gridX: 1, gridY: 2, benchIndex: null };
          currentBench[bIdx] = null;
          setBenchSlots(currentBench);
          benchSlotsRef.current = currentBench;
          const newBoard = [placed];
          setBoardUnits(newBoard);
          boardUnitsRef.current = newBoard;
          multiplayerClient.submitBoard({
            units: newBoard,
            level: 1,
            gold: 4,
          });
        }
      }
    };

    multiplayerClient.onPhaseTick = (data) => {
      if (!isMultiplayerActiveRef.current) return;
      setPhase(data.phase);
      setCountdown(data.countdown);
      setStage(data.stage);
      setRoundInStage(data.roundInStage);
      setRoundStage(data.roundStage);

      // Auto-submit board right before preparation ends (countdown <= 3)
      if (data.phase === 'PREPARATION' && data.countdown <= 3) {
        let myUnits = boardUnitsRef.current.filter((u) => !u.isEnemy && u.gridX >= 0 && u.gridY >= 0);
        if (myUnits.length === 0) {
          const bench = [...benchSlotsRef.current];
          const bIdx = bench.findIndex((b) => b !== null);
          if (bIdx !== -1) {
            const placed = { ...bench[bIdx]!, gridX: 1, gridY: 2, benchIndex: null };
            bench[bIdx] = null;
            setBenchSlots(bench);
            benchSlotsRef.current = bench;
            const nextB = [...boardUnitsRef.current.filter((u) => !u.isEnemy), placed];
            setBoardUnits(nextB);
            boardUnitsRef.current = nextB;
            myUnits = [placed];
          }
        }
        multiplayerClient.submitBoard({
          units: myUnits,
          level: levelRef.current,
          gold: goldRef.current,
        });
      }
    };

    multiplayerClient.onStartCombat = (data) => {
      if (!isMultiplayerActiveRef.current) return;
      if (data.opponent) {
        multiplayerOpponentRef.current = data.opponent;
        setCurrentOpponentInfo({
          name: data.opponent.name,
          avatar: data.opponent.avatar,
          isGhost: data.isGhost,
          isBoss: false,
          bossTitle: '',
          isPvE: false,
        });
        setRoundTitle(`Batalha PvP Online: ${data.opponent.name}`);
        currentOpponentCommanderIdRef.current = data.opponent.id;
      }
      startCombatPhase();
    };

    multiplayerClient.onResolutionPhase = () => {
      if (!isMultiplayerActiveRef.current) return;
      if (phaseRef.current === 'COMBAT' && battleOutcome === null) {
        endCombatAndAdvanceRound('DRAW');
      }
    };

    multiplayerClient.onNewRoundStarted = (data) => {
      if (!isMultiplayerActiveRef.current) return;
      setMultiplayerRoom(data.room);
      handleProceedToNextRound();
    };

    multiplayerClient.onLeaderboardUpdated = (data) => {
      if (!isMultiplayerActiveRef.current) return;
      setCommanders((prev) =>
        prev.map((c) => {
          const matched = data.players.find((p: any) => p.id === c.id);
          if (matched) {
            return {
              ...c,
              hp: matched.hp,
              isEliminated: matched.isEliminated,
              placement: matched.placement,
            };
          }
          return c;
        })
      );
    };

    multiplayerClient.onEmoteReceived = (emote) => {
      setActiveEmotes((prev) => [...prev, emote]);
      setTimeout(() => {
        setActiveEmotes((prev) => prev.filter((e) => e.id !== emote.id));
      }, 4000);
    };

    multiplayerClient.onRoomsListUpdated = (rooms) => {
      setAvailableRooms(rooms);
    };

    multiplayerClient.onError = (msg) => {
      setMultiplayerError(msg);
    };
  }, []);

  // Fetch available rooms whenever the multiplayer modal is opened (both socket and Cloud Firestore)
  useEffect(() => {
    if (isMultiplayerModalOpen) {
      multiplayerClient.fetchRoomsList();
      const unsubscribe = subscribeToActiveRoomsFirestore((firestoreRooms) => {
        if (firestoreRooms && firestoreRooms.length > 0) {
          setAvailableRooms(firestoreRooms);
        }
      });
      return () => {
        unsubscribe();
      };
    }
  }, [isMultiplayerModalOpen]);

  // === Keyboard Shortcuts (D for Shop/Reroll, F for XP, Space for Pause) ===
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'd' || e.key === 'D') {
        if (totalRoundRef.current <= 1) return; // Loja indisponível no Round 1
        if (isShopOpen) {
          handleRerollShop();
        } else {
          setIsShopOpen(true);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (totalRoundRef.current <= 1) return; // Loja indisponível no Round 1
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

      // 3. If clicked on a unit slot (bench or board unit), or arena tile, unit selection/placement handles it
      if (
        target.closest('[data-unit-slot="true"]') ||
        target.closest('[data-unit-tile="true"]') ||
        target.closest('[data-arena-tile="true"]') ||
        target.closest('[data-arena-stadium="true"]') ||
        target.closest('[data-champion-token="true"]')
      ) {
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
    const upgradeRes = performStarUpgrades(
      bench,
      board
    );
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

    if (isMultiplayerActiveRef.current) {
      multiplayerClient.updatePool(card.id, 'BUY');
    }

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
      const emptyImg = new Image();
      emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      e.dataTransfer.setDragImage(emptyImg, 0, 0);
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

      // Se o campo está cheio e o alvo é um tile vazio, recolhe a unidade aliada mais distante para abrir espaço
      let unitToRecall: UnitInstance | null = null;
      if (!anyTargetUnit && playerUnitsNow.length >= maxSlots) {
        let maxDist = -1;
        for (const u of playerUnitsNow) {
          const dist = Math.hypot(u.gridX - targetX, u.gridY - targetY);
          if (dist > maxDist) {
            maxDist = dist;
            unitToRecall = u;
          }
        }
      }

      // Place onto board
      const updatedUnit: UnitInstance = {
        ...unitToPlace,
        gridX: targetX,
        gridY: targetY,
        benchIndex: null,
      };

      const nextBench = [...currentBench];

      if (anyTargetUnit || unitToRecall) {
        const unitToSwap = anyTargetUnit || unitToRecall!;
        // Swap target or recalled unit from board to bench slot
        const swappedUnit: UnitInstance = {
          ...unitToSwap,
          gridX: -1,
          gridY: -1,
          benchIndex: benchIdx,
        };
        nextBench[benchIdx] = swappedUnit;

        // Replace unitToSwap on the board with updatedUnit
        const filteredBoard = currentBoard.filter(
          (u) => u.instanceId !== unitToSwap.instanceId && u.instanceId !== unitToPlace.instanceId
        );
        const nextBoard = [...filteredBoard, updatedUnit];

        setBenchSlots(nextBench);
        benchSlotsRef.current = nextBench;
        setBoardUnits(nextBoard);
        boardUnitsRef.current = nextBoard;

        if (unitToRecall) {
          setFloatingTexts((prev) => [
            ...prev,
            {
              id: `swap-bench-${Date.now()}`,
              x: unitToRecall!.gridX,
              y: unitToRecall!.gridY,
              value: `${unitToRecall!.name} voltou ao banco`,
              type: 'SKILL',
              color: '#f59e0b',
              timestamp: Date.now(),
            },
          ]);
        }
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

  const executeDropOnBench = (activeUnit: UnitInstance, slotIdx: number) => {
    if (phaseRef.current === 'COMBAT') return;

    const currentBench = [...benchSlotsRef.current];
    const currentBoard = [...boardUnitsRef.current];
    const existingBenchUnit = currentBench[slotIdx];

    // Check if activeUnit is on the board
    const boardMatch = currentBoard.find((u) => u.instanceId === activeUnit.instanceId);
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
          u.instanceId === activeUnit.instanceId ? swappedUnit : u
        );
        if (!nextBoard.some((u) => u.instanceId === swappedUnit.instanceId)) {
          nextBoard.push(swappedUnit);
        }
        setBoardUnits(nextBoard);
        boardUnitsRef.current = nextBoard;
      } else {
        // Remove unit from board
        const nextBoard = currentBoard.filter((u) => u.instanceId !== activeUnit.instanceId);
        setBoardUnits(nextBoard);
        boardUnitsRef.current = nextBoard;
      }
    } else {
      // Reordering bench slots
      const prevBenchIdx = currentBench.findIndex(
        (b) => b !== null && b.instanceId === activeUnit.instanceId
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

  const handleDropOnBench = (e: React.DragEvent, slotIdx: number) => {
    e.preventDefault();

    const transferData = e.dataTransfer.getData('text/plain');
    const currentBench = [...benchSlotsRef.current];
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
      const currentBoard = [...boardUnitsRef.current];
      activeUnit =
        currentBench.find((b) => b?.instanceId === transferData) ||
        currentBoard.find((u) => u.instanceId === transferData) ||
        null;
    }

    if (!activeUnit || phaseRef.current === 'COMBAT') return;

    executeDropOnBench(activeUnit, slotIdx);
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

    // 5. Update shared multiplayer pool
    if (isMultiplayerActiveRef.current) {
      multiplayerClient.updatePool(targetUnit.unitId, 'SELL');
    }
  };

  // === Unified Pointer Drag and Drop State (Mouse & Touch for Mobile/Desktop) ===
  const [pointerDragState, setPointerDragState] = useState<{
    unit: UnitInstance;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
    hoverTarget: {
      type: 'tile' | 'bench' | 'sell' | null;
      x?: number;
      y?: number;
      benchIndex?: number;
    };
  } | null>(null);
  const pointerDragRef = useRef(pointerDragState);
  pointerDragRef.current = pointerDragState;

  const handleStartPointerDrag = useCallback(
    (unit: UnitInstance, clientX: number, clientY: number) => {
      if (phaseRef.current === 'COMBAT' || unit.isEnemy || isViewingOpponentArena) return;
      setPointerDragState({
        unit,
        startX: clientX,
        startY: clientY,
        currentX: clientX,
        currentY: clientY,
        isDragging: false,
        hoverTarget: { type: null },
      });
    },
    [isViewingOpponentArena]
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const state = pointerDragRef.current;
      if (!state) return;

      const dist = Math.hypot(e.clientX - state.startX, e.clientY - state.startY);
      const isDragging = state.isDragging || dist > 6;

      let hoverTarget: typeof state.hoverTarget = { type: null };
      if (isDragging) {
        if (!draggedUnitRef.current) {
          setDraggedUnit(state.unit);
          draggedUnitRef.current = state.unit;
        }

        // Use elementsFromPoint to pierce through any overlays, tokens, HUDs, and borders
        const elements = typeof document.elementsFromPoint === 'function'
          ? document.elementsFromPoint(e.clientX, e.clientY)
          : [document.elementFromPoint(e.clientX, e.clientY)].filter(Boolean) as Element[];

        let foundSellEl: Element | null = null;
        let foundTileEl: Element | null = null;
        let foundBenchEl: Element | null = null;

        for (const element of elements) {
          if (!foundSellEl && element.closest('[data-sell-zone="true"]')) {
            foundSellEl = element.closest('[data-sell-zone="true"]');
          }
          if (!foundTileEl && element.closest('[data-arena-tile="true"]')) {
            foundTileEl = element.closest('[data-arena-tile="true"]');
          }
          if (!foundBenchEl && element.closest('[data-bench-index]')) {
            foundBenchEl = element.closest('[data-bench-index]');
          }
        }

        if (foundSellEl) {
          hoverTarget = { type: 'sell' };
        } else if (foundTileEl) {
          const tx = Number(foundTileEl.getAttribute('data-tile-x'));
          const ty = Number(foundTileEl.getAttribute('data-tile-y'));
          if (!isNaN(tx) && !isNaN(ty)) {
            hoverTarget = { type: 'tile', x: tx, y: ty };
          }
        } else if (foundBenchEl) {
          const bIdx = Number(foundBenchEl.getAttribute('data-bench-index'));
          if (!isNaN(bIdx)) {
            hoverTarget = { type: 'bench', benchIndex: bIdx };
          }
        } else {
          // If cursor is moving across tile gaps on the arena stadium floor, preserve previous tile hover
          const isOverArena = elements.some(
            (el) => el.closest?.('[data-arena-stadium="true"]') || el.classList?.contains('grid')
          );
          if (isOverArena && state.hoverTarget?.type === 'tile') {
            hoverTarget = state.hoverTarget;
          }
        }
      }

      setPointerDragState({
        ...state,
        currentX: e.clientX,
        currentY: e.clientY,
        isDragging,
        hoverTarget,
      });
    };

    const handlePointerUp = (_e: PointerEvent) => {
      const state = pointerDragRef.current;
      if (!state) return;

      if (state.isDragging) {
        const target = state.hoverTarget;
        if (target.type === 'tile' && target.x !== undefined && target.y !== undefined) {
          executePlaceOrMoveUnit(state.unit, target.x, target.y);
        } else if (target.type === 'bench' && target.benchIndex !== undefined) {
          executeDropOnBench(state.unit, target.benchIndex);
        } else if (target.type === 'sell') {
          handleSellUnit(state.unit);
        }
      } else {
        // Was a tap/click! Select unit to open inspector
        setSelectedUnit(state.unit);
      }

      setPointerDragState(null);
      pointerDragRef.current = null;
      setDraggedUnit(null);
      draggedUnitRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [selectedUnit]);

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
    // 1. Strict anti-exploit check: item must exist in the player's inventory bag
    const itemIdx = playerItemsRef.current.indexOf(itemId);
    if (itemIdx === -1) {
      console.warn(`Attempted to equip item ${itemId} that is not in inventory.`);
      return;
    }

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

    // 2. Consume item from player bag immediately and synchronously
    const nextPlayerItems = [...playerItemsRef.current];
    nextPlayerItems.splice(itemIdx, 1);
    playerItemsRef.current = nextPlayerItems;
    setPlayerItems(nextPlayerItems);

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
        opponentName={isViewingOpponentArena ? viewingCommander.name : currentOpponentInfo.name}
        opponentInfo={currentOpponentInfo}
        isTestMode={isTestMode}
        difficulty={difficulty}
        isDifficultyLocked={isDifficultyLocked}
        onOpenDifficultyModal={() => setIsDifficultyModalOpen(true)}
        onTogglePause={() => setIsTimerPaused((prev) => !prev)}
        onResetTimer={() => setCountdown(30)}
        onReturnToPlayerArena={() => setViewingCommanderId('p1_human')}
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
        onOpenMultiplayerModal={() => setIsMultiplayerModalOpen(true)}
        isMultiplayerActive={isMultiplayerActive}
        roomCode={multiplayerRoom?.roomCode}
        onSendEmote={(text, icon) => {
          multiplayerClient.sendEmote(text, icon);
        }}
        activeEmotes={activeEmotes}
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
                scheduledOpponentId={scheduledMatchmakingRef.current?.humanOpponentId || currentOpponentCommanderIdRef.current}
                gamePhase={phase}
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
            draggedUnit={draggedUnit || (pointerDragState?.isDragging ? pointerDragState.unit : null)}
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
                    // Clicking the already selected unit keeps it selected and inspector open
                    setSelectedUnit(u);
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
            pointerHoverTile={
              pointerDragState?.hoverTarget.type === 'tile' &&
              pointerDragState.hoverTarget.x !== undefined &&
              pointerDragState.hoverTarget.y !== undefined
                ? { x: pointerDragState.hoverTarget.x, y: pointerDragState.hoverTarget.y }
                : null
            }
            pointerDragUnit={pointerDragState?.isDragging ? pointerDragState.unit : null}
            onStartPointerDrag={handleStartPointerDrag}
          />
        </div>

        {/* 4. Bottom Floating Bar: Bench & Retractable Shop Drawer (Shifted to Right with lateral padding) */}
        <div className="absolute bottom-3 right-4 sm:right-6 z-20 flex items-center gap-2.5 sm:gap-3 pointer-events-auto">
          {/* Bench Slots */}
          <Bench
            benchSlots={isTestMode ? allTestChampions : displayedBenchSlots}
            selectedUnitId={selectedUnit?.instanceId || null}
            onSlotClick={(idx) => {
              if (selectedUnit && !isViewingOpponentArena) {
                executeDropOnBench(selectedUnit, idx);
              }
            }}
            onUnitSelect={(u) => {
              setSelectedUnit(u);
              setTestAnimationOverride(null);
            }}
            onDragStart={handleDragStartUnit}
            onDragEnd={handleDragEnd}
            onDragOver={(e, _idx) => e.preventDefault()}
            onDrop={handleDropOnBench}
            onStartPointerDrag={handleStartPointerDrag}
            pointerHoverBenchIndex={
              pointerDragState?.hoverTarget.type === 'bench' ? pointerDragState.hoverTarget.benchIndex : null
            }
            isViewingOpponentArena={isViewingOpponentArena}
            opponentName={viewingCommander.name}
            isTestMode={isTestMode}
            playerUnitsCount={playerUnitsOnBoard.length}
            maxUnits={maxBoardUnits}
            level={level}
            xp={xp}
            xpNeeded={xpNeeded}
          />

          {/* Retractable Golden Shop Modal - Hidden in Round 1 & Test Mode */}
          {!isTestMode && (
            totalRound <= 1 ? (
              /* No Round 1: Loja indisponível e invisível; mantém exatamente o mesmo espaço reservado para que o baú (Bench) não escorra para as laterais! */
              <div
                className="invisible min-w-[168px] h-[48px] pointer-events-none select-none shrink-0"
                aria-hidden="true"
              />
            ) : (
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
                draggedUnit={draggedUnit || (pointerDragState?.isDragging ? pointerDragState.unit : null)}
                isPointerDragOverSell={pointerDragState?.hoverTarget.type === 'sell'}
                onSellUnit={handleSellUnit}
                isViewingOpponentArena={isViewingOpponentArena}
                opponentName={viewingCommander.name}
                onReturnToPlayerArena={() => setViewingCommanderId('p1_human')}
                ownedUnits={[...playerUnitsOnBoard, ...(displayedBenchSlots.filter(Boolean) as UnitInstance[])]}
              />
            )
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
                onItemClick={(_item) => {
                  // Inspected item details are displayed in the sidebar without forcing immediate equip
                }}
              />
            </div>
          </div>
        )}

      </div>

      {/* Unit Inspector Modal (for Skill A / Skill B switching, 2 Battle + 1 Special Slots & Removal) - Hidden in Test Mode or while Dragging */}
      {!isTestMode && selectedUnit && !pointerDragState?.isDragging && (
        <UnitInspector
          unit={selectedUnit}
          gamePhase={phase}
          totalRound={totalRound}
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
      {phase === 'COMBAT' && (
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
      )}

      {/* Item Draft Selection Modal (Rounds 3, 6, 9, 12, 15, 18, 21, 24) */}
      <ItemDraftModal
        isOpen={isItemDraftOpen}
        roundNumber={draftRoundNumber}
        isBossReward={isBossDraft}
        onSelectItem={handleSelectDraftItem}
      />

      {/* Mini Shop Modal (Round 1 Victory: Recruit 1 of 3 Tier 1-2 Champions with Auto-Timeout) */}
      <MiniShopModal
        isOpen={isMiniShopOpen}
        onSelectChampion={handleSelectMiniShopChampion}
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
        totalRound={totalRound}
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

      {/* Floating Dragged Champion Ghost (Elevated above Pointer / Touch for clear board visibility) */}
      {pointerDragState?.isDragging && (
        <div
          className="fixed pointer-events-none z-[100] select-none"
          style={{
            left: `${pointerDragState.currentX}px`,
            top: `${pointerDragState.currentY}px`,
          }}
        >
          {/* Ground Contact Target Reticle (Directly at cursor location) */}
          <div className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-amber-400 bg-amber-400/30 shadow-[0_0_14px_rgba(245,158,11,1)] animate-ping pointer-events-none" />
          <div className="absolute -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,1)] ring-2 ring-amber-300 pointer-events-none" />

          {/* Elevated Minimalist Champion Token (Suspended comfortably above the pointer so the tile below is 100% visible) */}
          <div className="absolute -translate-x-1/2 -translate-y-[calc(100%+16px)] flex flex-col items-center pointer-events-none">
            <div className="relative w-11 h-11 rounded-full p-0.5 bg-slate-950/85 border border-amber-400/90 shadow-[0_4px_16px_rgba(0,0,0,0.8),0_0_12px_rgba(245,158,11,0.6)] flex items-center justify-center backdrop-blur-sm">
              <ChampionVisual
                unitId={pointerDragState.unit.unitId}
                avatarFallback={pointerDragState.unit.avatarUrl}
                visualAssets={pointerDragState.unit.visualAssets}
                mode="portrait"
                alt={pointerDragState.unit.name}
                className="w-10 h-10 rounded-full"
              />
              {/* Star Badge */}
              <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[8px] leading-tight shadow">
                {pointerDragState.unit.stars}★
              </span>
            </div>

            {/* Subtle downward indicator pointing to ground target */}
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-amber-400/90 mt-0.5 drop-shadow" />
          </div>
        </div>
      )}

      {/* Multiplayer Online Lobby Modal */}
      <MultiplayerLobbyModal
        isOpen={isMultiplayerModalOpen}
        onClose={() => setIsMultiplayerModalOpen(false)}
        roomState={multiplayerRoom}
        localPlayerId={localPlayerId}
        isMultiplayerActive={isMultiplayerActive}
        availableRooms={availableRooms}
        onRefreshRooms={() => {
          multiplayerClient.fetchRoomsList();
          fetchActiveRoomsFirestore().then((rooms) => {
            if (rooms && rooms.length > 0) setAvailableRooms(rooms);
          }).catch(() => {});
        }}
        serverUrl={serverUrl}
        onUpdateServerUrl={(url) => {
          multiplayerClient.setServerUrl(url);
          setServerUrl(multiplayerClient.getServerUrl());
          multiplayerClient.fetchRoomsList();
        }}
        onSelectSoloMode={() => {
          setIsMultiplayerActive(false);
          isMultiplayerActiveRef.current = false;
          multiplayerClient.disconnect();
          setMultiplayerRoom(null);
        }}
        onCreateRoom={(playerName, avatar, commanderId) => {
          setMultiplayerError(null);
          multiplayerClient.createRoom(playerName, avatar, commanderId);
        }}
        onJoinRoom={(roomCodeOrId, playerName, avatar, commanderId) => {
          setMultiplayerError(null);
          const matched = availableRooms.find(
            (r) => r.roomId === roomCodeOrId || r.roomCode === roomCodeOrId || r.id === roomCodeOrId || r.code === roomCodeOrId
          );
          if (matched && matched.serverUrl && matched.serverUrl.startsWith('http')) {
            multiplayerClient.setServerUrl(matched.serverUrl);
            setServerUrl(matched.serverUrl);
          }
          multiplayerClient.joinRoom(roomCodeOrId, playerName, avatar, commanderId);
        }}
        onStartGame={() => {
          multiplayerClient.startGame();
        }}
        onLeaveRoom={() => {
          multiplayerClient.disconnect();
          setMultiplayerRoom(null);
          setIsMultiplayerActive(false);
          isMultiplayerActiveRef.current = false;
          multiplayerClient.fetchRoomsList();
        }}
        errorMessage={multiplayerError}
      />

    </div>
  );
}
