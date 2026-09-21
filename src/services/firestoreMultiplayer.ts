import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { getFirestoreDb } from './firebase';
import {
  MultiplayerRoomState,
  MultiplayerPlayer,
  MultiplayerMatchPairing,
  CombatSubmission,
  CombatResultSubmission,
  EmoteMessage,
  AvailableRoomSummary,
} from '../types/multiplayer';
import { UnitInstance } from '../types/game';

// Persistent Local Player ID (survives app reload & electron restarts)
export function getOrCreateLocalPlayerId(): string {
  if (typeof window === 'undefined') return 'player_ssr';
  const KEY = 'OPT_PERSISTENT_PLAYER_ID';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `pirate_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // Ignore storage errors
    }
  }
  return id;
}

const POOL_SIZES: Record<number, number> = {
  1: 29,
  2: 22,
  3: 18,
  4: 12,
  5: 10,
};

export function createInitialChampionPool(): Record<string, number> {
  return {
    luffy: POOL_SIZES[1],
    nami: POOL_SIZES[1],
    usopp: POOL_SIZES[1],
    buggy: POOL_SIZES[1],
    chopper: POOL_SIZES[1],
    tashigi: POOL_SIZES[1],
    zoro: POOL_SIZES[2],
    sanji: POOL_SIZES[2],
    smoker: POOL_SIZES[2],
    kaku: POOL_SIZES[2],
    robin: POOL_SIZES[3],
    franky: POOL_SIZES[3],
    brook: POOL_SIZES[3],
    croc: POOL_SIZES[3],
    ace: POOL_SIZES[3],
    law: POOL_SIZES[4],
    kid: POOL_SIZES[4],
    jinbe: POOL_SIZES[4],
    doflamingo: POOL_SIZES[4],
    lucci: POOL_SIZES[4],
    enel: POOL_SIZES[4],
    katakuri: POOL_SIZES[4],
    hancock: POOL_SIZES[4],
    whitebeard: POOL_SIZES[5],
    shanks: POOL_SIZES[5],
    kaido: POOL_SIZES[5],
    bigmom: POOL_SIZES[5],
    blackbeard: POOL_SIZES[5],
    aokiji: POOL_SIZES[5],
    kizaru: POOL_SIZES[5],
    akainu: POOL_SIZES[5],
    garp: POOL_SIZES[5],
    sengoku: POOL_SIZES[5],
    mihawk: POOL_SIZES[5],
  };
}

const BOT_TEMPLATES = [
  { name: 'Zoro Caçador', avatar: '⚔️', commanderId: 'zoro' },
  { name: 'Nami Gata Ladra', avatar: '🍊', commanderId: 'nami' },
  { name: 'Sanji Perna Negra', avatar: '🍗', commanderId: 'sanji' },
  { name: 'Chopper Médico', avatar: '🌸', commanderId: 'chopper' },
  { name: 'Robin Arqueóloga', avatar: '📖', commanderId: 'robin' },
  { name: 'Franky Ciborgue', avatar: '🤖', commanderId: 'franky' },
  { name: 'Brook Músico', avatar: '💀', commanderId: 'brook' },
];

export function fillBotsIfNeeded(players: MultiplayerPlayer[]): MultiplayerPlayer[] {
  const result = [...players];
  let botIdx = 0;
  while (result.length < 8 && botIdx < BOT_TEMPLATES.length) {
    const t = BOT_TEMPLATES[botIdx];
    result.push({
      id: `bot_${botIdx + 1}_${t.commanderId}`,
      name: t.name,
      avatar: t.avatar,
      commanderId: t.commanderId,
      isHost: false,
      isBot: true,
      isReady: true,
      hp: 100,
      maxHp: 100,
      gold: 4,
      level: 1,
      streak: 0,
      isEliminated: false,
      placement: result.length + 1,
    });
    botIdx++;
  }
  return result;
}

export class FirestoreMultiplayerEngine {
  private activeUnsubscribe: Unsubscribe | null = null;
  private currentRoomId: string | null = null;
  private localPlayerId: string;
  private clockTimer: any = null;
  private heartbeatTimer: any = null;
  private isHost: boolean = false;

  constructor() {
    this.localPlayerId = getOrCreateLocalPlayerId();
  }

  public getPlayerId(): string {
    return this.localPlayerId;
  }

  public getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }

  public isCurrentHost(): boolean {
    return this.isHost;
  }

  /**
   * Cria uma sala nova diretamente no Firestore
   */
  public async createRoom(
    playerName: string,
    avatar: string,
    commanderId: string
  ): Promise<MultiplayerRoomState> {
    this.cleanup();

    const db = getFirestoreDb();
    const prefixes = ['LUFFY', 'ZORO', 'NAMI', 'SANJI', 'ACE', 'SHANKS', 'WANO', 'MUGIWARA'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(100 + Math.random() * 900);
    const roomCode = `${prefix}-${num}`;
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const hostPlayer: MultiplayerPlayer = {
      id: this.localPlayerId,
      name: playerName || 'Capitão',
      avatar: avatar || '👒',
      commanderId: commanderId || 'luffy',
      isHost: true,
      isBot: false,
      isReady: true,
      hp: 100,
      maxHp: 100,
      gold: 4,
      level: 1,
      streak: 0,
      isEliminated: false,
      placement: 1,
    };

    const roomState: MultiplayerRoomState = {
      roomId,
      roomCode,
      hostId: this.localPlayerId,
      status: 'LOBBY',
      maxPlayers: 8,
      players: [hostPlayer],
      phase: 'PREPARATION',
      countdown: 30,
      stage: 1,
      roundInStage: 1,
      roundStage: '1-1',
      roundTitle: 'Fase de Preparação: Rodada 1-1',
      pairings: [],
      championPool: createInitialChampionPool(),
    };

    const roomRef = doc(db, 'rooms', roomId);
    await setDoc(roomRef, {
      ...roomState,
      name: `Sala de ${hostPlayer.name}`,
      code: roomCode,
      hostName: hostPlayer.name,
      hostAvatar: hostPlayer.avatar,
      playerCount: 1,
      serverUrl: typeof window !== 'undefined' ? window.location.origin : '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    this.currentRoomId = roomId;
    this.isHost = true;
    this.startHeartbeat(roomId);
    return roomState;
  }

  /**
   * Entra em uma sala aberta no Firestore por ID ou Código
   */
  public async joinRoom(
    roomCodeOrId: string,
    playerName: string,
    avatar: string,
    commanderId: string
  ): Promise<MultiplayerRoomState> {
    this.cleanup();

    const db = getFirestoreDb();
    const queryTerm = (roomCodeOrId || '').trim();

    // 1. Tenta buscar por ID direto
    let roomRef = doc(db, 'rooms', queryTerm);
    let snap = await getDoc(roomRef);

    // 2. Se não encontrar, tenta buscar por code / roomCode
    if (!snap.exists()) {
      const q = query(
        collection(db, 'rooms'),
        where('code', '==', queryTerm.toUpperCase())
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        snap = querySnap.docs[0];
        roomRef = doc(db, 'rooms', snap.id);
      } else {
        // Tenta também pelo campo roomCode
        const q2 = query(
          collection(db, 'rooms'),
          where('roomCode', '==', queryTerm.toUpperCase())
        );
        const querySnap2 = await getDocs(q2);
        if (!querySnap2.empty) {
          snap = querySnap2.docs[0];
          roomRef = doc(db, 'rooms', snap.id);
        }
      }
    }

    if (!snap.exists()) {
      throw new Error(`Sala '${queryTerm}' não encontrada no Cloud Firestore.`);
    }

    const data = snap.data() as any;
    if (data.status !== 'LOBBY') {
      throw new Error('Esta partida já está em andamento.');
    }

    const currentPlayers: MultiplayerPlayer[] = Array.isArray(data.players) ? data.players : [];
    if (currentPlayers.length >= (data.maxPlayers || 8)) {
      throw new Error('A sala já atingiu o limite de 8 jogadores.');
    }

    // Verifica se já está na sala
    const existingIdx = currentPlayers.findIndex((p) => p.id === this.localPlayerId);
    let updatedPlayers: MultiplayerPlayer[];

    if (existingIdx >= 0) {
      updatedPlayers = currentPlayers;
      this.isHost = currentPlayers[existingIdx].isHost;
    } else {
      const newPlayer: MultiplayerPlayer = {
        id: this.localPlayerId,
        name: playerName || `Pirata ${currentPlayers.length + 1}`,
        avatar: avatar || '🏴‍☠️',
        commanderId: commanderId || 'zoro',
        isHost: false,
        isBot: false,
        isReady: true,
        hp: 100,
        maxHp: 100,
        gold: 4,
        level: 1,
        streak: 0,
        isEliminated: false,
        placement: currentPlayers.length + 1,
      };
      updatedPlayers = [...currentPlayers, newPlayer];
      this.isHost = false;

      await updateDoc(roomRef, {
        players: updatedPlayers,
        playerCount: updatedPlayers.length,
        updatedAt: Date.now(),
      });
    }

    this.currentRoomId = snap.id;

    const roomState: MultiplayerRoomState = {
      roomId: snap.id,
      roomCode: data.roomCode || data.code || snap.id,
      hostId: data.hostId || (updatedPlayers[0]?.id ?? ''),
      status: data.status || 'LOBBY',
      maxPlayers: data.maxPlayers || 8,
      players: updatedPlayers,
      phase: data.phase || 'PREPARATION',
      countdown: data.countdown ?? 30,
      stage: data.stage || 1,
      roundInStage: data.roundInStage || 1,
      roundStage: data.roundStage || '1-1',
      roundTitle: data.roundTitle || 'Fase de Preparação: Rodada 1-1',
      pairings: data.pairings || [],
      championPool: data.championPool || createInitialChampionPool(),
    };

    return roomState;
  }

  /**
   * Conecta listener em tempo real no documento da sala
   */
  public subscribeToRoom(
    roomId: string,
    callbacks: {
      onRoomStateUpdated: (room: MultiplayerRoomState) => void;
      onGameStarted: (room: MultiplayerRoomState) => void;
      onPhaseTick?: (data: {
        phase: 'PREPARATION' | 'COMBAT' | 'RESOLUTION';
        countdown: number;
        roundStage: string;
        stage: number;
        roundInStage: number;
      }) => void;
      onStartCombat?: (data: { opponent: any; isGhost: boolean; countdown: number }) => void;
      onResolutionPhase?: (data: { players: any[]; countdown: number }) => void;
      onNewRoundStarted?: (data: { room: MultiplayerRoomState }) => void;
      onLeaderboardUpdated?: (data: { players: any[] }) => void;
      onGameFinished?: (data: { winner: any; players: any[] }) => void;
      onEmoteReceived?: (emote: EmoteMessage) => void;
    }
  ): void {
    if (this.activeUnsubscribe) {
      this.activeUnsubscribe();
      this.activeUnsubscribe = null;
    }

    const db = getFirestoreDb();
    const roomRef = doc(db, 'rooms', roomId);
    let previousStatus: string = 'LOBBY';
    let previousPhase: string = 'PREPARATION';
    let previousRoundStage: string = '1-1';

    this.activeUnsubscribe = onSnapshot(
      roomRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data() as any;

        const room: MultiplayerRoomState = {
          roomId: snapshot.id,
          roomCode: data.roomCode || data.code || snapshot.id,
          hostId: data.hostId,
          status: data.status || 'LOBBY',
          maxPlayers: data.maxPlayers || 8,
          players: data.players || [],
          phase: data.phase || 'PREPARATION',
          countdown: data.countdown ?? 30,
          stage: data.stage || 1,
          roundInStage: data.roundInStage || 1,
          roundStage: data.roundStage || '1-1',
          roundTitle: data.roundTitle || 'Fase de Preparação',
          pairings: data.pairings || [],
          championPool: data.championPool || createInitialChampionPool(),
          playerBoards: data.playerBoards || {},
          winner: data.winner,
        };

        // 1. Notifica estado geral da sala (jogadores entrando no lobby, boards atualizados)
        callbacks.onRoomStateUpdated(room);

        // Notifica atualização contínua do placar/classificação e HP
        if (room.players && room.players.length > 0) {
          callbacks.onLeaderboardUpdated?.({ players: room.players });
        }

        // 2. Notifica início de jogo
        if (previousStatus === 'LOBBY' && room.status === 'IN_GAME') {
          callbacks.onGameStarted(room);
          previousStatus = 'IN_GAME';

          // Se for o Host, inicia o relógio central sincronizado do Firestore
          if (room.hostId === this.localPlayerId) {
            this.startHostClock(roomId, room, callbacks);
          }
        }

        // 3. Notifica término de jogo
        if (room.status === 'FINISHED' && previousStatus !== 'FINISHED') {
          previousStatus = 'FINISHED';
          this.stopHeartbeat();
          if (this.clockTimer) {
            clearInterval(this.clockTimer);
            this.clockTimer = null;
          }
          callbacks.onGameFinished?.({
            winner: room.winner || room.players.find((p) => !p.isEliminated) || room.players[0],
            players: room.players,
          });
        }

        // 4. Notifica transições de fase para jogadores não-hosts
        if (room.status === 'IN_GAME' && room.hostId !== this.localPlayerId) {
          callbacks.onPhaseTick?.({
            phase: room.phase,
            countdown: room.countdown,
            roundStage: room.roundStage,
            stage: room.stage,
            roundInStage: room.roundInStage,
          });

          if (previousPhase !== room.phase) {
            if (room.phase === 'COMBAT') {
              const pairing = room.pairings.find((p) => p.homePlayerId === this.localPlayerId);
              const oppId = pairing ? pairing.awayPlayerId : null;
              const oppPlayer = room.players.find((p) => p.id === oppId);
              const oppBoard = (oppId && room.playerBoards?.[oppId]) || oppPlayer?.boardUnits || [];

              callbacks.onStartCombat?.({
                opponent: oppPlayer
                  ? { ...oppPlayer, boardUnits: oppBoard }
                  : room.players.find((p) => p.id !== this.localPlayerId) || {
                      id: 'bot_1',
                      name: 'Zoro Caçador',
                      avatar: '⚔️',
                      boardUnits: [],
                    },
                isGhost: pairing?.isGhost || false,
                countdown: 35,
              });
            } else if (room.phase === 'RESOLUTION') {
              callbacks.onResolutionPhase?.({
                players: room.players,
                countdown: 4,
              });
            } else if (room.phase === 'PREPARATION' && previousRoundStage !== room.roundStage) {
              callbacks.onNewRoundStarted?.({ room });
              previousRoundStage = room.roundStage;
            }
            previousPhase = room.phase;
          }
        }

        // 5. Checa emotes recentes
        if (data.lastEmote && data.lastEmote.senderId !== this.localPlayerId) {
          callbacks.onEmoteReceived?.(data.lastEmote);
        }
      },
      (error) => {
        console.warn('[FirestoreMultiplayerEngine] Erro no listener da sala:', error);
      }
    );
  }

  /**
   * Gera pareamentos justos de 1v1 para multiplayer:
   * - Quando há 2 humanos na sala, eles lutam diretamente entre si em todas as rodadas PvP.
   * - Bots lutam entre si sem repetições.
   * - Os pareamentos ficam disponíveis no início da fase de PREPARATION.
   */
  public generatePairings(
    players: MultiplayerPlayer[],
    stage: number,
    roundInStage: number
  ): MultiplayerMatchPairing[] {
    const activePlayers = players.filter((p) => !p.isEliminated && p.hp > 0);
    if (activePlayers.length <= 1) return [];

    const activeHumans = activePlayers.filter((p) => !p.isBot);
    const activeBots = activePlayers.filter((p) => p.isBot);

    const pairings: MultiplayerMatchPairing[] = [];
    const assigned = new Set<string>();

    // 1. Exatamente 2 humanos vivos: confronto direto garantido!
    if (activeHumans.length === 2) {
      const [h1, h2] = activeHumans;
      pairings.push({ homePlayerId: h1.id, awayPlayerId: h2.id, isGhost: false });
      pairings.push({ homePlayerId: h2.id, awayPlayerId: h1.id, isGhost: false });
      assigned.add(h1.id);
      assigned.add(h2.id);
    } else if (activeHumans.length > 2) {
      // Mais de 2 humanos: rotação round-robin
      const totalRound = (stage - 1) * 4 + roundInStage;
      const offset = totalRound % (activeHumans.length - 1 || 1);
      const shuffledHumans = [...activeHumans];
      const rotated = [...shuffledHumans.slice(offset), ...shuffledHumans.slice(0, offset)];
      for (let i = 0; i < rotated.length - 1; i += 2) {
        const a = rotated[i];
        const b = rotated[i + 1];
        pairings.push({ homePlayerId: a.id, awayPlayerId: b.id, isGhost: false });
        pairings.push({ homePlayerId: b.id, awayPlayerId: a.id, isGhost: false });
        assigned.add(a.id);
        assigned.add(b.id);
      }
    }

    // 2. Humanos restantes sem par lutam contra bots ativos
    const unassignedHumans = activeHumans.filter((h) => !assigned.has(h.id));
    const availableBots = activeBots.filter((b) => !assigned.has(b.id));

    for (const h of unassignedHumans) {
      if (availableBots.length > 0) {
        const bot = availableBots.shift()!;
        pairings.push({ homePlayerId: h.id, awayPlayerId: bot.id, isGhost: false });
        pairings.push({ homePlayerId: bot.id, awayPlayerId: h.id, isGhost: false });
        assigned.add(h.id);
        assigned.add(bot.id);
      } else if (activeBots.length > 0) {
        const ghostBot = activeBots[0];
        pairings.push({ homePlayerId: h.id, awayPlayerId: ghostBot.id, isGhost: true });
        assigned.add(h.id);
      }
    }

    // 3. Bots restantes duelam entre si
    const remainingBots = activeBots.filter((b) => !assigned.has(b.id));
    const shuffledBots = [...remainingBots].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffledBots.length; i += 2) {
      if (i + 1 < shuffledBots.length) {
        const b1 = shuffledBots[i];
        const b2 = shuffledBots[i + 1];
        pairings.push({ homePlayerId: b1.id, awayPlayerId: b2.id, isGhost: false });
        pairings.push({ homePlayerId: b2.id, awayPlayerId: b1.id, isGhost: false });
        assigned.add(b1.id);
        assigned.add(b2.id);
      } else {
        const oddBot = shuffledBots[i];
        const ghostTarget = activePlayers.find((p) => p.id !== oddBot.id) || activePlayers[0];
        pairings.push({ homePlayerId: oddBot.id, awayPlayerId: ghostTarget.id, isGhost: true });
        assigned.add(oddBot.id);
      }
    }

    return pairings;
  }

  /**
   * Inicia o jogo no Firestore (apenas o Host clica)
   */
  public async startGame(roomId: string): Promise<void> {
    const db = getFirestoreDb();
    const roomRef = doc(db, 'rooms', roomId);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;

    const data = snap.data() as any;
    const filledPlayers = fillBotsIfNeeded(data.players || []);
    const initialPairings = this.generatePairings(filledPlayers, 1, 1);

    await updateDoc(roomRef, {
      status: 'IN_GAME',
      players: filledPlayers,
      playerCount: filledPlayers.length,
      phase: 'PREPARATION',
      countdown: 30,
      stage: 1,
      roundInStage: 1,
      roundStage: '1-1',
      roundTitle: 'Fase de Preparação: Rodada 1-1',
      pairings: initialPairings,
      updatedAt: Date.now(),
    });
  }

  /**
   * O Host comanda as fases da partida e sincroniza com o Firestore
   */
  private startHostClock(
    roomId: string,
    initialRoom: MultiplayerRoomState,
    callbacks: any
  ) {
    if (this.clockTimer) clearInterval(this.clockTimer);

    let room = { ...initialRoom };
    const db = getFirestoreDb();
    const roomRef = doc(db, 'rooms', roomId);

    this.clockTimer = setInterval(async () => {
      // Se a partida já acabou, não avança o relógio
      if (room.status === 'FINISHED') {
        if (this.clockTimer) clearInterval(this.clockTimer);
        return;
      }

      room.countdown -= 1;

      // Tick local do host
      callbacks.onPhaseTick?.({
        phase: room.phase,
        countdown: room.countdown,
        roundStage: room.roundStage,
        stage: room.stage,
        roundInStage: room.roundInStage,
      });

      // A cada 5s ou quando o tempo expira, sincroniza countdown no Firestore
      if (room.countdown % 5 === 0 || room.countdown <= 3) {
        updateDoc(roomRef, { countdown: room.countdown }).catch(() => {});
      }

      if (room.countdown <= 0) {
        if (room.phase === 'PREPARATION') {
          // Muda para COMBAT (35s)
          room.phase = 'COMBAT';
          room.countdown = 35;

          // Os pareamentos já foram definidos no início da fase de preparação!
          // Dispara combate pro Host com o adversário correto e tabuleiro carregado
          const hostPairing = room.pairings.find((p) => p.homePlayerId === this.localPlayerId);
          const hostOpp = hostPairing
            ? room.players.find((p) => p.id === hostPairing.awayPlayerId)
            : room.players.find((p) => p.id !== this.localPlayerId);

          const hostOppId = hostOpp?.id;
          const hostOppBoard =
            (hostOppId && room.playerBoards?.[hostOppId]) || hostOpp?.boardUnits || [];

          callbacks.onStartCombat?.({
            opponent: hostOpp
              ? { ...hostOpp, boardUnits: hostOppBoard }
              : { id: 'bot_1', name: 'Zoro Caçador', avatar: '⚔️', boardUnits: [] },
            isGhost: hostPairing?.isGhost || false,
            countdown: 35,
          });

          await updateDoc(roomRef, {
            phase: 'COMBAT',
            countdown: 35,
            updatedAt: Date.now(),
          }).catch(() => {});
        } else if (room.phase === 'COMBAT') {
          // Muda para RESOLUTION (4s)
          room.phase = 'RESOLUTION';
          room.countdown = 4;

          // O Host simula dano de combate bot x bot para manter o placar sincronizado
          const updatedPlayers = [...room.players];
          const processedBotPairs = new Set<string>();

          for (const pairing of room.pairings) {
            const p1 = updatedPlayers.find((p) => p.id === pairing.homePlayerId);
            const p2 = updatedPlayers.find((p) => p.id === pairing.awayPlayerId);

            if (p1 && p2 && p1.isBot && p2.isBot && !p1.isEliminated && !p2.isEliminated) {
              const pairKey = [p1.id, p2.id].sort().join('_vs_');
              if (!processedBotPairs.has(pairKey)) {
                processedBotPairs.add(pairKey);
                // Simula combate de bots: um perde entre 6 e 12 de HP
                const loser = Math.random() < 0.5 ? p1 : p2;
                const botDamage = 6 + Math.floor(Math.random() * 7);
                loser.hp = Math.max(0, loser.hp - botDamage);
                if (loser.hp <= 0) {
                  loser.isEliminated = true;
                  loser.hp = 0;
                }
              }
            }
          }

          // Recalcula classificações (1º a 8º)
          const sorted = [...updatedPlayers].sort((a, b) => {
            if (a.isEliminated !== b.isEliminated) {
              return a.isEliminated ? 1 : -1;
            }
            return b.hp - a.hp;
          });
          sorted.forEach((p, idx) => {
            p.placement = idx + 1;
          });
          room.players = sorted;

          // Verifica se sobrou apenas 1 jogador vivo (Vitória!)
          const remainingAlive = room.players.filter((p) => !p.isEliminated && p.hp > 0);
          if (remainingAlive.length <= 1) {
            const winner = remainingAlive[0] || room.players[0];
            room.status = 'FINISHED';
            room.winner = {
              id: winner.id,
              name: winner.name,
              avatar: winner.avatar,
              commanderId: winner.commanderId,
            };

            if (this.clockTimer) {
              clearInterval(this.clockTimer);
              this.clockTimer = null;
            }

            callbacks.onResolutionPhase?.({
              players: room.players,
              countdown: 4,
            });
            callbacks.onLeaderboardUpdated?.({ players: room.players });
            callbacks.onGameFinished?.({ winner: room.winner, players: room.players });

            await updateDoc(roomRef, {
              status: 'FINISHED',
              phase: 'RESOLUTION',
              countdown: 0,
              players: room.players,
              winner: room.winner,
              updatedAt: Date.now(),
            }).catch(() => {});
            return;
          }

          callbacks.onResolutionPhase?.({
            players: room.players,
            countdown: 4,
          });
          callbacks.onLeaderboardUpdated?.({ players: room.players });

          await updateDoc(roomRef, {
            phase: 'RESOLUTION',
            countdown: 4,
            players: room.players,
            updatedAt: Date.now(),
          }).catch(() => {});
        } else if (room.phase === 'RESOLUTION') {
          // Avança para a próxima rodada
          let nextRound = room.roundInStage + 1;
          let nextStage = room.stage;
          if (nextRound > 4) {
            nextRound = 1;
            nextStage += 1;
          }

          // Gera pareamentos com antecedência para a nova fase de PREPARATION
          const newPairings = this.generatePairings(room.players, nextStage, nextRound);

          room.stage = nextStage;
          room.roundInStage = nextRound;
          room.roundStage = `${nextStage}-${nextRound}`;
          room.roundTitle = `Fase de Preparação: Rodada ${nextStage}-${nextRound}`;
          room.phase = 'PREPARATION';
          room.countdown = 30;
          room.pairings = newPairings;

          callbacks.onNewRoundStarted?.({ room });

          await updateDoc(roomRef, {
            stage: nextStage,
            roundInStage: nextRound,
            roundStage: room.roundStage,
            roundTitle: room.roundTitle,
            phase: 'PREPARATION',
            countdown: 30,
            pairings: newPairings,
            updatedAt: Date.now(),
          }).catch(() => {});
        }
      }
    }, 1000);
  }

  /**
   * Submete o tabuleiro do jogador para a nuvem
   */
  public async submitBoard(
    roomId: string,
    submission: { units: UnitInstance[]; level: number; gold: number }
  ): Promise<void> {
    try {
      const db = getFirestoreDb();
      const sanitizedUnits = (submission.units || []).map((u) => ({
        instanceId: u.instanceId || `u_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        unitId: u.unitId,
        name: u.name || '',
        title: u.title || '',
        cost: u.cost || 1,
        tier: u.tier || 1,
        stars: u.stars || 1,
        traits: Array.isArray(u.traits) ? u.traits : [],
        range: u.range || 1,
        attackType: u.attackType || 'melee',
        hp: u.hp || 100,
        maxHp: u.maxHp || 100,
        mana: u.mana || 0,
        maxMana: u.maxMana || 100,
        armor: u.armor || 20,
        mr: u.mr || 20,
        ad: u.ad || 50,
        ap: u.ap || 0,
        attackSpeed: u.attackSpeed || 0.7,
        avatarUrl: u.avatarUrl || '',
        gridX: typeof u.gridX === 'number' ? u.gridX : 0,
        gridY: typeof u.gridY === 'number' ? u.gridY : 0,
        items: Array.isArray(u.items) ? u.items : [],
      }));

      // 1. Salva na subcoleção submissions
      const subRef = doc(db, 'rooms', roomId, 'submissions', this.localPlayerId);
      await setDoc(subRef, {
        playerId: this.localPlayerId,
        units: sanitizedUnits,
        level: submission.level || 1,
        gold: submission.gold || 0,
        updatedAt: Date.now(),
      });

      // 2. Salva diretamente no mapa playerBoards do documento da sala para acesso síncrono imediato
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        [`playerBoards.${this.localPlayerId}`]: sanitizedUnits,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.warn('[FirestoreMultiplayerEngine] Falha ao enviar tabuleiro:', err);
    }
  }

  /**
   * Lê o tabuleiro de um adversário do Firestore
   */
  public async fetchOpponentBoard(
    roomId: string,
    opponentId: string
  ): Promise<UnitInstance[] | null> {
    try {
      const db = getFirestoreDb();
      // 1. Tenta ler do documento principal da sala primeiro
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const rData = roomSnap.data() as any;
        if (rData.playerBoards && Array.isArray(rData.playerBoards[opponentId]) && rData.playerBoards[opponentId].length > 0) {
          return rData.playerBoards[opponentId] as UnitInstance[];
        }
      }

      // 2. Fallback: subcoleção submissions
      const subRef = doc(db, 'rooms', roomId, 'submissions', opponentId);
      const snap = await getDoc(subRef);
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.units) && data.units.length > 0) {
          return data.units as UnitInstance[];
        }
      }
    } catch (err) {
      console.warn('[FirestoreMultiplayerEngine] Falha ao buscar tabuleiro do oponente:', err);
    }
    return null;
  }

  /**
   * Atualiza resultado de combate (HP, dano) com sincronização confiável
   */
  public async submitCombatResult(
    roomId: string,
    result: Omit<CombatResultSubmission, 'roomId' | 'playerId'>
  ): Promise<void> {
    try {
      const db = getFirestoreDb();
      const roomRef = doc(db, 'rooms', roomId);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return;

      const data = snap.data() as any;
      const players: MultiplayerPlayer[] = data.players || [];
      const idx = players.findIndex((p) => p.id === this.localPlayerId);
      if (idx >= 0) {
        if (!result.won && !result.isDraw) {
          const dmg = typeof result.damageTaken === 'number' && result.damageTaken > 0
            ? result.damageTaken
            : 10;
          players[idx].hp = Math.max(0, players[idx].hp - dmg);
          players[idx].streak = 0;
        } else if (result.won) {
          players[idx].streak = (players[idx].streak || 0) + 1;
        }

        if (players[idx].hp <= 0) {
          players[idx].hp = 0;
          players[idx].isEliminated = true;
        }

        // Se lutou contra um bot e venceu, deduz dano do bot
        if (result.won && result.damageDealtToOpponent > 0) {
          const oppIdx = players.findIndex((p) => p.id === result.opponentId);
          if (oppIdx >= 0 && players[oppIdx].isBot) {
            players[oppIdx].hp = Math.max(0, players[oppIdx].hp - result.damageDealtToOpponent);
            if (players[oppIdx].hp <= 0) {
              players[oppIdx].hp = 0;
              players[oppIdx].isEliminated = true;
            }
          }
        }

        // Recalcula classificações
        const sorted = [...players].sort((a, b) => {
          if (a.isEliminated !== b.isEliminated) return a.isEliminated ? 1 : -1;
          return b.hp - a.hp;
        });
        sorted.forEach((p, rankIdx) => {
          p.placement = rankIdx + 1;
        });

        // Verifica condição de vitória final
        const alivePlayers = sorted.filter((p) => !p.isEliminated && p.hp > 0);
        const isGameNowFinished = alivePlayers.length <= 1;
        const winner = isGameNowFinished ? (alivePlayers[0] || sorted[0]) : undefined;

        await updateDoc(roomRef, {
          players: sorted,
          ...(isGameNowFinished && {
            status: 'FINISHED',
            winner: {
              id: winner!.id,
              name: winner!.name,
              avatar: winner!.avatar,
              commanderId: winner!.commanderId,
            },
          }),
          updatedAt: Date.now(),
        });
      }
    } catch (err) {
      console.warn('[FirestoreMultiplayerEngine] Erro ao submeter resultado de combate:', err);
    }
  }

  /**
   * Envia um Emote/Chat rápido
   */
  public async sendEmote(roomId: string, text: string, icon?: string): Promise<void> {
    try {
      const db = getFirestoreDb();
      const roomRef = doc(db, 'rooms', roomId);
      const lastEmote: EmoteMessage = {
        id: `emote_${Date.now()}`,
        senderId: this.localPlayerId,
        senderName: 'Capitão',
        text,
        icon,
        timestamp: Date.now(),
      };
      await updateDoc(roomRef, { lastEmote });
    } catch (err) {
      console.warn('[FirestoreMultiplayerEngine] Erro ao enviar emote:', err);
    }
  }

  /**
   * Inicia o heartbeat (pulso de presença) da sala a cada 10 segundos
   */
  public startHeartbeat(roomId: string): void {
    this.stopHeartbeat();
    const db = getFirestoreDb();
    this.heartbeatTimer = setInterval(async () => {
      try {
        if (!this.currentRoomId) {
          this.stopHeartbeat();
          return;
        }
        const roomRef = doc(db, 'rooms', roomId);
        await updateDoc(roomRef, {
          updatedAt: Date.now(),
        });
      } catch (err) {
        // Ignora erros transitórios de rede
      }
    }, 10000);
  }

  /**
   * Para o heartbeat
   */
  public stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Sai da sala e atualiza/exclui o documento no Firestore
   * - Se for o Host: exclui a sala no Firestore (ou marca como CLOSED)
   * - Se for Convidado: remove o jogador do array players
   */
  public async leaveRoom(roomId?: string): Promise<void> {
    const targetRoomId = roomId || this.currentRoomId;
    this.stopHeartbeat();

    if (targetRoomId) {
      try {
        const db = getFirestoreDb();
        const roomRef = doc(db, 'rooms', targetRoomId);
        const snap = await getDoc(roomRef);

        if (snap.exists()) {
          const data = snap.data() as any;
          const currentPlayers: MultiplayerPlayer[] = Array.isArray(data.players) ? data.players : [];
          const isCurrentHost = this.isHost || data.hostId === this.localPlayerId;

          // Se for o Host ou se só restava 1 jogador, exclui a sala imediatamente
          if (isCurrentHost || currentPlayers.length <= 1) {
            await deleteDoc(roomRef);
          } else {
            // Se for participante, remove do array de jogadores
            const remainingPlayers = currentPlayers.filter((p) => p.id !== this.localPlayerId);
            if (remainingPlayers.length === 0) {
              await deleteDoc(roomRef);
            } else {
              const newHost = remainingPlayers[0];
              newHost.isHost = true;
              await updateDoc(roomRef, {
                players: remainingPlayers,
                playerCount: remainingPlayers.length,
                hostId: newHost.id,
                hostName: newHost.name,
                hostAvatar: newHost.avatar,
                name: `Sala de ${newHost.name}`,
                updatedAt: Date.now(),
              });
            }
          }
        }
      } catch (err) {
        console.warn('[FirestoreMultiplayerEngine] Falha ao sair da sala no Firestore:', err);
      }
    }

    this.cleanup();
  }

  /**
   * Limpeza de emergência síncrona/fire-and-forget ao fechar a janela/aba
   */
  public quickLeaveOnUnload(): void {
    const targetRoomId = this.currentRoomId;
    if (!targetRoomId) return;
    this.stopHeartbeat();
    try {
      const db = getFirestoreDb();
      const roomRef = doc(db, 'rooms', targetRoomId);
      if (this.isHost) {
        deleteDoc(roomRef).catch(() => {});
      }
    } catch {
      // Ignora erro no fechamento de janela
    }
  }

  /**
   * Limpa timers e listeners da sala atual
   */
  public cleanup(): void {
    this.stopHeartbeat();
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
    if (this.activeUnsubscribe) {
      this.activeUnsubscribe();
      this.activeUnsubscribe = null;
    }
    this.currentRoomId = null;
    this.isHost = false;
  }
}

export const firestoreMultiplayerEngine = new FirestoreMultiplayerEngine();

// Registra ouvintes globais de fechamento de janela/navegador/app
if (typeof window !== 'undefined') {
  const handleAppExit = () => {
    if (firestoreMultiplayerEngine.getCurrentRoomId()) {
      firestoreMultiplayerEngine.quickLeaveOnUnload();
    }
  };
  window.addEventListener('beforeunload', handleAppExit);
  window.addEventListener('pagehide', handleAppExit);
}
