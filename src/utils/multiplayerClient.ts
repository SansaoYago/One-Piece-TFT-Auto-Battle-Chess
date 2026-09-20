import { io, Socket } from 'socket.io-client';
import {
  MultiplayerRoomState,
  CombatSubmission,
  CombatResultSubmission,
  EmoteMessage,
} from '../types/multiplayer';

class MultiplayerClientService {
  private socket: Socket | null = null;
  private currentRoom: MultiplayerRoomState | null = null;
  private localPlayerId: string | null = null;

  // Event callbacks
  public onRoomJoined?: (room: MultiplayerRoomState, localPlayerId: string) => void;
  public onRoomStateUpdated?: (room: MultiplayerRoomState) => void;
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

  public connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    // In browser or PWA, window.location.origin connects to same host/port 3000
    // In Electron standalone or mobile wrapper, falls back to origin or localhost
    const serverUrl =
      typeof window !== 'undefined' && window.location && window.location.origin
        ? window.location.origin
        : 'http://localhost:3000';

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
