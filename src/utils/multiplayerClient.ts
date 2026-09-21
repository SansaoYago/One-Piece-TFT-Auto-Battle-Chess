import { io, Socket } from 'socket.io-client';
import {
  MultiplayerRoomState,
  CombatSubmission,
  CombatResultSubmission,
  EmoteMessage,
  AvailableRoomSummary,
} from '../types/multiplayer';
import {
  firestoreMultiplayerEngine,
} from '../services/firestoreMultiplayer';
import { fetchActiveRoomsFirestore } from '../services/firebase';

export const CENTRAL_SERVER_URL = 'https://ais-dev-4jri3d5iut235w662qvv2e-167791983539.us-east1.run.app';

class MultiplayerClientService {
  private socket: Socket | null = null;
  private currentRoom: MultiplayerRoomState | null = null;
  private localPlayerId: string | null = null;
  private currentServerUrl: string = CENTRAL_SERVER_URL;
  private usingFirestoreSync: boolean = true;

  // Event callbacks
  public onRoomJoined?: (room: MultiplayerRoomState, localPlayerId: string) => void;
  public onRoomStateUpdated?: (room: MultiplayerRoomState) => void;
  public onRoomsListUpdated?: (rooms: AvailableRoomSummary[]) => void;
  public onGameStarted?: (room: MultiplayerRoomState) => void;
  public onPhaseTick?: (data: {
    phase: 'PREPARATION' | 'COMBAT' | 'RESOLUTION';
    countdown: number;
    roundStage: string;
    stage: number;
    roundInStage: number;
  }) => void;
  public onStartCombat?: (data: {
    opponent: any;
    isGhost: boolean;
    countdown: number;
  }) => void;
  public onResolutionPhase?: (data: { players: any[]; countdown: number }) => void;
  public onNewRoundStarted?: (data: { room: MultiplayerRoomState }) => void;
  public onLeaderboardUpdated?: (data: { players: any[] }) => void;
  public onGameFinished?: (data: { winner: any; players: any[] }) => void;
  public onEmoteReceived?: (emote: EmoteMessage) => void;
  public onError?: (message: string) => void;
  public onPoolUpdated?: (data: { unitId: string; remaining: number }) => void;

  private async emitStartCombat(data: { opponent: any; isGhost: boolean; countdown: number }) {
    if (
      data.opponent &&
      data.opponent.id &&
      !data.opponent.isBot &&
      this.currentRoom?.roomId &&
      (!Array.isArray(data.opponent.boardUnits) || data.opponent.boardUnits.length === 0)
    ) {
      const opponentUnits = await firestoreMultiplayerEngine.fetchOpponentBoard(
        this.currentRoom.roomId,
        data.opponent.id
      );
      if (opponentUnits && opponentUnits.length > 0) {
        data.opponent.boardUnits = opponentUnits;
      }
    }

    this.onStartCombat?.(data);
  }

  constructor() {
    this.currentServerUrl = this.resolveServerUrl();
    this.localPlayerId = firestoreMultiplayerEngine.getPlayerId();
  }

  public resolveServerUrl(): string {
    if (typeof window === 'undefined') return CENTRAL_SERVER_URL;

    // Check localStorage first
    const saved = localStorage.getItem('OPT_MULTIPLAYER_SERVER_URL');
    if (saved && saved.trim().startsWith('http')) {
      return saved.trim().replace(/\/+$/, '');
    }

    // Check if running from file:// (Electron package) or null origin
    const isFileProtocol = window.location.protocol === 'file:' || !window.location.origin || window.location.origin === 'null';
    if (isFileProtocol) {
      return CENTRAL_SERVER_URL;
    }

    // In web browser / PWA: default to current host
    return window.location.origin;
  }

  public getServerUrl(): string {
    return this.currentServerUrl;
  }

  public setServerUrl(url: string) {
    const cleanUrl = (url || '').trim().replace(/\/+$/, '');
    if (!cleanUrl) return;
    this.currentServerUrl = cleanUrl;
    try {
      localStorage.setItem('OPT_MULTIPLAYER_SERVER_URL', cleanUrl);
    } catch {
      // Ignore localStorage errors
    }
    if (this.socket) {
      this.disconnect();
      this.connect();
    }
  }

  public connect(): Socket | null {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const serverUrl = this.getServerUrl();
    // Do not attempt socket connection if we are running in file:// without an accessible remote server
    try {
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 5000,
      });
      this.setupListeners();
      return this.socket;
    } catch {
      return null;
    }
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[MultiplayerClient] Connected to socket server, id:', this.socket?.id);
      this.fetchRoomsList();
    });

    this.socket.on('s2c_rooms_list', (data: { rooms: AvailableRoomSummary[] }) => {
      this.onRoomsListUpdated?.(data.rooms || []);
    });

    this.socket.on('s2c_room_joined', (data: { room: MultiplayerRoomState; localPlayerId: string }) => {
      this.currentRoom = data.room;
      this.localPlayerId = data.localPlayerId;
      this.onRoomJoined?.(data.room, data.localPlayerId);
    });

    this.socket.on('s2c_room_state_updated', (data: { room: MultiplayerRoomState }) => {
      this.currentRoom = data.room;
      this.onRoomStateUpdated?.(data.room);
    });

    this.socket.on('s2c_game_started', (data: { room: MultiplayerRoomState }) => {
      this.currentRoom = data.room;
      this.onGameStarted?.(data.room);
    });

    this.socket.on('s2c_phase_tick', (data) => {
      this.onPhaseTick?.(data);
    });

    this.socket.on('s2c_start_combat', (data) => {
      this.emitStartCombat(data);
    });

    this.socket.on('s2c_resolution_phase', (data) => {
      this.onResolutionPhase?.(data);
    });

    this.socket.on('s2c_new_round_started', (data: { room: MultiplayerRoomState }) => {
      this.currentRoom = data.room;
      this.onNewRoundStarted?.(data);
    });

    this.socket.on('s2c_leaderboard_updated', (data) => {
      this.onLeaderboardUpdated?.(data);
    });

    this.socket.on('s2c_game_finished', (data) => {
      this.onGameFinished?.(data);
    });

    this.socket.on('s2c_emote_received', (emote: EmoteMessage) => {
      this.onEmoteReceived?.(emote);
    });

    this.socket.on('s2c_pool_updated', (data) => {
      this.onPoolUpdated?.(data);
    });

    this.socket.on('s2c_error', (data: { message: string }) => {
      this.onError?.(data.message);
    });
  }

  public fetchRoomsList() {
    // 1. Fetch from Firestore (universal across .exe, PWA and Web)
    fetchActiveRoomsFirestore()
      .then((rooms) => {
        if (Array.isArray(rooms)) {
          this.onRoomsListUpdated?.(rooms);
        }
      })
      .catch(() => {});

    // 2. Fetch via Socket if available
    if (this.socket && this.socket.connected) {
      this.socket.emit('c2s_get_rooms');
    }

    // 3. Quick REST fetch
    const url = `${this.getServerUrl()}/api/multiplayer/rooms`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.rooms)) {
          this.onRoomsListUpdated?.(data.rooms);
        }
      })
      .catch(() => {});
  }

  public async createRoom(playerName: string, avatar: string, commanderId: string) {
    // Try via socket if connected
    if (this.socket && this.socket.connected) {
      this.socket.emit('c2s_create_room', { playerName, avatar, commanderId });
    }

    // Always create in Cloud Firestore (ensures .exe cross-play works immediately)
    try {
      const room = await firestoreMultiplayerEngine.createRoom(playerName, avatar, commanderId);
      this.currentRoom = room;
      this.localPlayerId = firestoreMultiplayerEngine.getPlayerId();
      this.subscribeFirestoreRoom(room.roomId);
      this.onRoomJoined?.(room, this.localPlayerId);
    } catch (err: any) {
      console.warn('[MultiplayerClient] Fallback ao criar sala no Firestore:', err);
      this.onError?.(err?.message || 'Falha ao criar sala no Cloud Firestore.');
    }
  }

  public async joinRoom(roomCode: string, playerName: string, avatar: string, commanderId: string) {
    // Try via socket if connected
    if (this.socket && this.socket.connected) {
      this.socket.emit('c2s_join_room', { roomCode, playerName, avatar, commanderId });
    }

    // Join via Cloud Firestore
    try {
      const room = await firestoreMultiplayerEngine.joinRoom(roomCode, playerName, avatar, commanderId);
      this.currentRoom = room;
      this.localPlayerId = firestoreMultiplayerEngine.getPlayerId();
      this.subscribeFirestoreRoom(room.roomId);
      this.onRoomJoined?.(room, this.localPlayerId);
    } catch (err: any) {
      console.warn('[MultiplayerClient] Erro ao entrar na sala pelo Firestore:', err);
      this.onError?.(err?.message || 'Não foi possível entrar na sala selecionada.');
    }
  }

  private subscribeFirestoreRoom(roomId: string) {
    firestoreMultiplayerEngine.subscribeToRoom(roomId, {
      onRoomStateUpdated: (room) => {
        this.currentRoom = room;
        this.onRoomStateUpdated?.(room);
      },
      onGameStarted: (room) => {
        this.currentRoom = room;
        this.onGameStarted?.(room);
      },
      onPhaseTick: (data) => {
        this.onPhaseTick?.(data);
      },
      onStartCombat: async (data) => {
        await this.emitStartCombat(data);
      },
      onResolutionPhase: (data) => {
        this.onResolutionPhase?.(data);
      },
      onNewRoundStarted: (data) => {
        this.currentRoom = data.room;
        this.onNewRoundStarted?.(data);
      },
      onEmoteReceived: (emote) => {
        this.onEmoteReceived?.(emote);
      },
    });
  }

  public startGame() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('c2s_start_game');
    }
    if (this.currentRoom) {
      firestoreMultiplayerEngine.startGame(this.currentRoom.roomId).catch((err) => {
        console.warn('[MultiplayerClient] Erro ao iniciar jogo no Firestore:', err);
      });
    }
  }

  public submitBoard(submission: Omit<CombatSubmission, 'roomId' | 'playerId'>) {
    if (!this.currentRoom || !this.localPlayerId) return;

    // Send to Firestore
    firestoreMultiplayerEngine.submitBoard(this.currentRoom.roomId, submission).catch(() => {});

    // Send to Socket if connected
    if (this.socket && this.socket.connected) {
      this.socket.emit('c2s_submit_board', {
        roomId: this.currentRoom.roomId,
        playerId: this.localPlayerId,
        ...submission,
      });
    }
  }

  public submitCombatResult(result: Omit<CombatResultSubmission, 'roomId' | 'playerId'>) {
    if (!this.currentRoom || !this.localPlayerId) return;

    // Send to Firestore
    firestoreMultiplayerEngine.submitCombatResult(this.currentRoom.roomId, result).catch(() => {});

    // Send to Socket if connected
    if (this.socket && this.socket.connected) {
      this.socket.emit('c2s_submit_combat_result', {
        roomId: this.currentRoom.roomId,
        playerId: this.localPlayerId,
        ...result,
      });
    }
  }

  public updatePool(unitId: string, action: 'BUY' | 'SELL') {
    if (this.socket && this.socket.connected) {
      this.socket.emit('c2s_update_pool', { unitId, action });
    }
  }

  public sendEmote(text: string, icon?: string) {
    if (this.currentRoom) {
      firestoreMultiplayerEngine.sendEmote(this.currentRoom.roomId, text, icon).catch(() => {});
    }
    if (this.socket && this.socket.connected) {
      this.socket.emit('c2s_send_emote', { text, icon });
    }
  }

  public async leaveRoom(): Promise<void> {
    const roomId = this.currentRoom?.roomId || firestoreMultiplayerEngine.getCurrentRoomId();
    if (this.socket && this.socket.connected) {
      try {
        this.socket.emit('c2s_leave_room');
      } catch {}
    }
    if (roomId) {
      await firestoreMultiplayerEngine.leaveRoom(roomId);
    } else {
      firestoreMultiplayerEngine.cleanup();
    }
    this.disconnect();
  }

  public disconnect() {
    firestoreMultiplayerEngine.cleanup();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentRoom = null;
    this.localPlayerId = null;
  }

  public getRoomState(): MultiplayerRoomState | null {
    return this.currentRoom;
  }

  public getLocalPlayerId(): string | null {
    return this.localPlayerId || firestoreMultiplayerEngine.getPlayerId();
  }
}

export const multiplayerClient = new MultiplayerClientService();

