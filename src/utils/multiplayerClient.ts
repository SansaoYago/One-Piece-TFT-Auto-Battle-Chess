import { io, Socket } from 'socket.io-client';
import {
  MultiplayerRoomState,
  CombatSubmission,
  CombatResultSubmission,
  EmoteMessage,
  AvailableRoomSummary,
} from '../types/multiplayer';

export const CENTRAL_SERVER_URL = 'https://ais-dev-4jri3d5iut235w662qvv2e-167791983539.us-east1.run.app';

class MultiplayerClientService {
  private socket: Socket | null = null;
  private currentRoom: MultiplayerRoomState | null = null;
  private localPlayerId: string | null = null;
  private currentServerUrl: string = CENTRAL_SERVER_URL;

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

  constructor() {
    this.currentServerUrl = this.resolveServerUrl();
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

  public connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const serverUrl = this.getServerUrl();
    console.log('[MultiplayerClient] Connecting to socket server:', serverUrl);

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.setupListeners();
    return this.socket;
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
      this.onStartCombat?.(data);
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
    const s = this.connect();
    s.emit('c2s_get_rooms');

    // Also attempt quick REST fetch in parallel
    const url = `${this.getServerUrl()}/api/multiplayer/rooms`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.rooms)) {
          this.onRoomsListUpdated?.(data.rooms);
        }
      })
      .catch(() => {
        // Fallback to socket event
      });
  }

  public createRoom(playerName: string, avatar: string, commanderId: string) {
    const s = this.connect();
    s.emit('c2s_create_room', { playerName, avatar, commanderId });
  }

  public joinRoom(roomCode: string, playerName: string, avatar: string, commanderId: string) {
    const s = this.connect();
    s.emit('c2s_join_room', { roomCode, playerName, avatar, commanderId });
  }

  public startGame() {
    this.socket?.emit('c2s_start_game');
  }

  public submitBoard(submission: Omit<CombatSubmission, 'roomId' | 'playerId'>) {
    if (!this.currentRoom || !this.localPlayerId) return;
    this.socket?.emit('c2s_submit_board', {
      roomId: this.currentRoom.roomId,
      playerId: this.localPlayerId,
      ...submission,
    });
  }

  public submitCombatResult(result: Omit<CombatResultSubmission, 'roomId' | 'playerId'>) {
    if (!this.currentRoom || !this.localPlayerId) return;
    this.socket?.emit('c2s_submit_combat_result', {
      roomId: this.currentRoom.roomId,
      playerId: this.localPlayerId,
      ...result,
    });
  }

  public updatePool(unitId: string, action: 'BUY' | 'SELL') {
    this.socket?.emit('c2s_update_pool', { unitId, action });
  }

  public sendEmote(text: string, icon?: string) {
    this.socket?.emit('c2s_send_emote', { text, icon });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentRoom = null;
      this.localPlayerId = null;
    }
  }

  public getRoomState(): MultiplayerRoomState | null {
    return this.currentRoom;
  }

  public getLocalPlayerId(): string | null {
    return this.localPlayerId;
  }
}

export const multiplayerClient = new MultiplayerClientService();
