import { Server, Socket } from 'socket.io';
import {
  MultiplayerRoomState,
  MultiplayerPlayer,
  MultiplayerMatchPairing,
  CombatSubmission,
  CombatResultSubmission,
  EmoteMessage,
  AvailableRoomSummary,
} from '../src/types/multiplayer';
import { UnitInstance } from '../src/types/game';

// Standard auto-battler pool copies by tier
const POOL_SIZE_BY_TIER: Record<number, number> = {
  1: 29,
  2: 22,
  3: 18,
  4: 12,
  5: 10,
};

// Available bot commanders to fill unfilled room slots
const BOT_COMMANDERS = [
  { id: 'bot_zoro', name: 'Roronoa Zoro (Bot)', avatar: '⚔️' },
  { id: 'bot_nami', name: 'Nami (Bot)', avatar: '🍊' },
  { id: 'bot_usopp', name: 'God Usopp (Bot)', avatar: '🎯' },
  { id: 'bot_sanji', name: 'Sanji Vinsmoke (Bot)', avatar: '🦵' },
  { id: 'bot_chopper', name: 'Tony Tony Chopper (Bot)', avatar: '🌸' },
  { id: 'bot_robin', name: 'Nico Robin (Bot)', avatar: '📖' },
  { id: 'bot_franky', name: 'Cyborg Franky (Bot)', avatar: '🤖' },
  { id: 'bot_brook', name: 'Soul King Brook (Bot)', avatar: '🎻' },
];

export class RoomManager {
  private io: Server;
  private rooms: Map<string, MultiplayerRoomState> = new Map();
  private socketToRoom: Map<string, string> = new Map(); // socketId -> roomId
  private roomTimers: Map<string, NodeJS.Timeout> = new Map();
  private combatSubmissions: Map<string, Map<string, CombatSubmission>> = new Map(); // roomId -> (playerId -> sub)
  private combatResults: Map<string, Map<string, CombatResultSubmission>> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  // Generate readable room codes
  private generateRoomCode(): string {
    const prefixes = ['LUFFY', 'ZORO', 'NAMI', 'SANJI', 'ACE', 'SHANKS', 'WANO', 'MUGIWARA'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${num}`;
  }

  // Initialize pool of champions
  private createChampionPool(): Record<string, number> {
    const pool: Record<string, number> = {
      luffy: POOL_SIZE_BY_TIER[1],
      nami: POOL_SIZE_BY_TIER[1],
      usopp: POOL_SIZE_BY_TIER[1],
      buggy: POOL_SIZE_BY_TIER[1],
      chopper: POOL_SIZE_BY_TIER[1],
      tashigi: POOL_SIZE_BY_TIER[1],
      zoro: POOL_SIZE_BY_TIER[2],
      sanji: POOL_SIZE_BY_TIER[2],
      smoker: POOL_SIZE_BY_TIER[2],
      kaku: POOL_SIZE_BY_TIER[2],
      robin: POOL_SIZE_BY_TIER[3],
      franky: POOL_SIZE_BY_TIER[3],
      brook: POOL_SIZE_BY_TIER[3],
      croc: POOL_SIZE_BY_TIER[3],
      ace: POOL_SIZE_BY_TIER[3],
      law: POOL_SIZE_BY_TIER[4],
      kid: POOL_SIZE_BY_TIER[4],
      jinbe: POOL_SIZE_BY_TIER[4],
      doflamingo: POOL_SIZE_BY_TIER[4],
      lucci: POOL_SIZE_BY_TIER[4],
      enel: POOL_SIZE_BY_TIER[4],
      katakuri: POOL_SIZE_BY_TIER[4],
      hancock: POOL_SIZE_BY_TIER[4],
      whitebeard: POOL_SIZE_BY_TIER[5],
      shanks: POOL_SIZE_BY_TIER[5],
      kaido: POOL_SIZE_BY_TIER[5],
      bigmom: POOL_SIZE_BY_TIER[5],
      blackbeard: POOL_SIZE_BY_TIER[5],
      aokiji: POOL_SIZE_BY_TIER[5],
      kizaru: POOL_SIZE_BY_TIER[5],
      akainu: POOL_SIZE_BY_TIER[5],
      garp: POOL_SIZE_BY_TIER[5],
      sengoku: POOL_SIZE_BY_TIER[5],
      mihawk: POOL_SIZE_BY_TIER[5],
    };
    return pool;
  }

  public getRoom(roomId: string): MultiplayerRoomState | undefined {
    return this.rooms.get(roomId);
  }

  public getRoomByCode(code: string): MultiplayerRoomState | undefined {
    const upper = code.trim().toUpperCase();
    for (const room of this.rooms.values()) {
      if (room.roomCode === upper) return room;
    }
    return undefined;
  }

  // List all rooms waiting in LOBBY
  public getAvailableRooms(): AvailableRoomSummary[] {
    const list: AvailableRoomSummary[] = [];
    for (const room of this.rooms.values()) {
      if (room.status === 'LOBBY') {
        const host = room.players.find((p) => p.isHost) || room.players[0];
        list.push({
          roomId: room.roomId,
          roomCode: room.roomCode,
          hostId: room.hostId,
          hostName: host?.name || 'Capitão',
          hostAvatar: host?.avatar || '👒',
          playerCount: room.players.length,
          maxPlayers: room.maxPlayers,
          status: room.status,
        });
      }
    }
    return list;
  }

  // Broadcast available rooms list to all connected clients
  public broadcastRoomsList() {
    this.io.emit('s2c_rooms_list', { rooms: this.getAvailableRooms() });
  }

  // Create a new room
  public createRoom(
    socket: Socket,
    playerName: string,
    avatar: string,
    commanderId: string
  ): MultiplayerRoomState {
    // If the player is already in a room, remove them first
    const existingRoomId = this.socketToRoom.get(socket.id);
    if (existingRoomId) {
      this.handleDisconnect(socket);
    }

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const roomCode = this.generateRoomCode();

    const hostPlayer: MultiplayerPlayer = {
      id: socket.id,
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

    const room: MultiplayerRoomState = {
      roomId,
      roomCode,
      hostId: socket.id,
      status: 'LOBBY',
      maxPlayers: 8,
      players: [hostPlayer],
      phase: 'PREPARATION',
      countdown: 30,
      stage: 1,
      roundInStage: 1,
      roundStage: '1-1',
      roundTitle: 'Rodada de Abertura',
      pairings: [],
      championPool: this.createChampionPool(),
    };

    this.rooms.set(roomId, room);
    this.socketToRoom.set(socket.id, roomId);
    this.combatSubmissions.set(roomId, new Map());
    this.combatResults.set(roomId, new Map());

    socket.join(roomId);
    socket.emit('s2c_room_joined', { room, localPlayerId: socket.id });
    this.broadcastRoomsList();
    return room;
  }

  // Join an existing room (by code, roomId, or automatically the first available room)
  public joinRoom(
    socket: Socket,
    roomCodeOrId: string,
    playerName: string,
    avatar: string,
    commanderId: string
  ): boolean {
    let room: MultiplayerRoomState | undefined;

    const query = (roomCodeOrId || '').trim();
    if (!query || query === 'auto' || query === '') {
      // Find the first available room in LOBBY
      for (const r of this.rooms.values()) {
        if (r.status === 'LOBBY' && r.players.length < r.maxPlayers) {
          room = r;
          break;
        }
      }
    } else {
      room = this.getRoomByCode(query) || this.getRoom(query);
      // If not matched by exact code/id, check if any open room is waiting
      if (!room) {
        for (const r of this.rooms.values()) {
          if (r.status === 'LOBBY' && r.players.length < r.maxPlayers) {
            room = r;
            break;
          }
        }
      }
    }

    if (!room) {
      socket.emit('s2c_error', { message: 'Nenhuma sala disponível encontrada no momento. Crie uma nova sala!' });
      return false;
    }

    if (room.status !== 'LOBBY') {
      socket.emit('s2c_error', { message: 'Esta partida já foi iniciada.' });
      return false;
    }

    if (room.players.length >= room.maxPlayers) {
      socket.emit('s2c_error', { message: 'A sala já atingiu o limite de 8 jogadores.' });
      return false;
    }

    // Check if player already in this room
    const existingIndex = room.players.findIndex((p) => p.id === socket.id);
    if (existingIndex >= 0) {
      socket.emit('s2c_room_joined', { room, localPlayerId: socket.id });
      return true;
    }

    const newPlayer: MultiplayerPlayer = {
      id: socket.id,
      name: playerName || `Pirata ${room.players.length + 1}`,
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
      placement: room.players.length + 1,
    };

    room.players.push(newPlayer);
    this.socketToRoom.set(socket.id, room.roomId);
    socket.join(room.roomId);

    socket.emit('s2c_room_joined', { room, localPlayerId: socket.id });
    this.io.to(room.roomId).emit('s2c_room_state_updated', { room });
    this.broadcastRoomsList();
    return true;
  }

  // Start the game (Fills empty slots with bots to always have 8 players!)
  public startGame(socket: Socket): boolean {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return false;
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Only host can start
    if (room.hostId !== socket.id) {
      socket.emit('s2c_error', { message: 'Apenas o capitão da sala pode iniciar o jogo.' });
      return false;
    }

    if (room.status !== 'LOBBY') return false;

    // Fill remaining slots up to 8 with AI bots
    let botIdx = 0;
    while (room.players.length < 8) {
      const botTemplate = BOT_COMMANDERS[botIdx % BOT_COMMANDERS.length];
      const botPlayer: MultiplayerPlayer = {
        id: `bot_${Date.now()}_${botIdx}`,
        name: botTemplate.name,
        avatar: botTemplate.avatar,
        commanderId: botTemplate.id,
        isHost: false,
        isBot: true,
        isReady: true,
        hp: 100,
        maxHp: 100,
        gold: 4,
        level: 1,
        streak: 0,
        isEliminated: false,
        placement: room.players.length + 1,
      };
      room.players.push(botPlayer);
      botIdx++;
    }

    room.status = 'IN_GAME';
    room.phase = 'PREPARATION';
    room.countdown = 30;
    room.stage = 1;
    room.roundInStage = 1;
    room.roundStage = '1-1';
    room.roundTitle = 'Fase de Preparação: Rodada 1-1';

    this.io.to(roomId).emit('s2c_game_started', { room });
    this.broadcastRoomsList();
    this.startRoomClock(room);
    return true;
  }

  // Central Clock Loop
  private startRoomClock(room: MultiplayerRoomState) {
    if (this.roomTimers.has(room.roomId)) {
      clearInterval(this.roomTimers.get(room.roomId)!);
    }

    const timer = setInterval(() => {
      if (room.status !== 'IN_GAME') {
        clearInterval(timer);
        return;
      }

      room.countdown -= 1;

      // Broadcast tick every second
      this.io.to(room.roomId).emit('s2c_phase_tick', {
        phase: room.phase,
        countdown: room.countdown,
        roundStage: room.roundStage,
        stage: room.stage,
        roundInStage: room.roundInStage,
      });

      // Phase transitions
      if (room.countdown <= 0) {
        if (room.phase === 'PREPARATION') {
          // Transition to COMBAT (35s)
          this.beginCombatPhase(room);
        } else if (room.phase === 'COMBAT') {
          // Transition to RESOLUTION (4s)
          this.beginResolutionPhase(room);
        } else if (room.phase === 'RESOLUTION') {
          // Transition to next PREPARATION round
          this.advanceToNextRound(room);
        }
      }
    }, 1000);

    this.roomTimers.set(room.roomId, timer);
  }

  // Transition to Combat Phase
  private beginCombatPhase(room: MultiplayerRoomState) {
    room.phase = 'COMBAT';
    room.countdown = 35; // 35 seconds of real-time combat simulation

    // Sorteio de Matchmaking 1v1 entre os sobreviventes
    const activePlayers = room.players.filter((p) => !p.isEliminated);
    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
    const pairings: MultiplayerMatchPairing[] = [];

    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        pairings.push({
          homePlayerId: shuffled[i].id,
          awayPlayerId: shuffled[i + 1].id,
          isGhost: false,
        });
        pairings.push({
          homePlayerId: shuffled[i + 1].id,
          awayPlayerId: shuffled[i].id,
          isGhost: false,
        });
      } else {
        // Número ímpar: jogador enfrenta um fantasma do jogador 0
        const ghostTarget = shuffled[0];
        pairings.push({
          homePlayerId: shuffled[i].id,
          awayPlayerId: ghostTarget.id,
          isGhost: true,
        });
      }
    }

    room.pairings = pairings;

    // Despacha o início do combate com os oponentes emparelhados
    const submissions = this.combatSubmissions.get(room.roomId) || new Map();

    for (const player of room.players) {
      if (player.isBot) continue;

      const pairing = pairings.find((p) => p.homePlayerId === player.id);
      const opponentId = pairing ? pairing.awayPlayerId : null;
      const opponent = room.players.find((p) => p.id === opponentId);
      const oppSubmission = opponentId ? submissions.get(opponentId) : null;

      // Send to this player their opponent's info and board units
      this.io.to(player.id).emit('s2c_start_combat', {
        opponent: opponent
          ? {
              id: opponent.id,
              name: opponent.name,
              avatar: opponent.avatar,
              hp: opponent.hp,
              level: opponent.level,
              isBot: opponent.isBot,
              units: oppSubmission ? oppSubmission.units : opponent.boardUnits || [],
            }
          : null,
        isGhost: pairing?.isGhost || false,
        countdown: room.countdown,
      });
    }

    // Clear submissions for next round
    submissions.clear();
  }

  // Transition to Resolution
  private beginResolutionPhase(room: MultiplayerRoomState) {
    room.phase = 'RESOLUTION';
    room.countdown = 4; // 4s result review

    // Check eliminations & update placements
    const activeRemaining = room.players.filter((p) => !p.isEliminated);
    activeRemaining.sort((a, b) => b.hp - a.hp);

    // If only 1 player remains, finish game!
    if (activeRemaining.length <= 1) {
      room.status = 'FINISHED';
      if (activeRemaining[0]) activeRemaining[0].placement = 1;
      this.io.to(room.roomId).emit('s2c_game_finished', {
        winner: activeRemaining[0] || null,
        players: room.players,
      });
      return;
    }

    this.io.to(room.roomId).emit('s2c_resolution_phase', {
      players: room.players,
      countdown: room.countdown,
    });
  }

  // Advance to next round
  private advanceToNextRound(room: MultiplayerRoomState) {
    room.roundInStage += 1;
    if (room.roundInStage > 6) {
      room.stage += 1;
      room.roundInStage = 1;
    }
    room.roundStage = `${room.stage}-${room.roundInStage}`;
    room.roundTitle = `Fase de Preparação: Rodada ${room.roundStage}`;
    room.phase = 'PREPARATION';
    room.countdown = 30;

    // Grant base round income & interest to players
    for (const player of room.players) {
      if (!player.isEliminated) {
        const interest = Math.min(5, Math.floor(player.gold / 10));
        player.gold += 5 + interest;
      }
    }

    this.io.to(room.roomId).emit('s2c_new_round_started', {
      room,
    });
  }

  // Submit board layout during preparation
  public submitBoard(socket: Socket, sub: CombatSubmission) {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;

    const submissions = this.combatSubmissions.get(roomId);
    if (submissions) {
      submissions.set(socket.id, sub);
    }

    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      player.boardUnits = sub.units;
      player.level = sub.level;
      player.gold = sub.gold;
    }
  }

  // Report combat result
  public submitCombatResult(socket: Socket, res: CombatResultSubmission) {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    if (!res.won && !res.isDraw) {
      // Player lost battle, reduce HP
      const damage = Math.max(2, Math.min(25, res.damageDealtToOpponent || 6));
      player.hp = Math.max(0, player.hp - damage);
      if (player.hp <= 0 && !player.isEliminated) {
        player.isEliminated = true;
        const remainingCount = room.players.filter((p) => !p.isEliminated).length;
        player.placement = remainingCount + 1;
      }
    }

    this.io.to(roomId).emit('s2c_leaderboard_updated', {
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        hp: p.hp,
        level: p.level,
        isEliminated: p.isEliminated,
        placement: p.placement,
      })),
    });
  }

  // Buy or sell unit from pool
  public updateChampionPool(socket: Socket, unitId: string, action: 'BUY' | 'SELL') {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (action === 'BUY') {
      if (room.championPool[unitId] !== undefined) {
        room.championPool[unitId] = Math.max(0, room.championPool[unitId] - 1);
      }
    } else if (action === 'SELL') {
      if (room.championPool[unitId] !== undefined) {
        room.championPool[unitId] += 1;
      }
    }

    // Broadcast pool delta
    this.io.to(roomId).emit('s2c_pool_updated', {
      unitId,
      remaining: room.championPool[unitId] || 0,
    });
  }

  // Handle Emotes / Quick Chat
  public sendEmote(socket: Socket, text: string, icon?: string) {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    const emote: EmoteMessage = {
      id: `emote_${Date.now()}_${Math.random()}`,
      senderId: socket.id,
      senderName: player?.name || 'Pirata',
      text,
      icon,
      timestamp: Date.now(),
    };

    this.io.to(roomId).emit('s2c_emote_received', emote);
  }

  // Handle Player Disconnect / Leave
  public handleDisconnect(socket: Socket) {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    this.socketToRoom.delete(socket.id);

    if (!room) return;

    if (room.status === 'LOBBY') {
      room.players = room.players.filter((p) => p.id !== socket.id);
      if (room.players.length === 0) {
        // Room empty, clean up
        this.rooms.delete(roomId);
        if (this.roomTimers.has(roomId)) {
          clearInterval(this.roomTimers.get(roomId)!);
          this.roomTimers.delete(roomId);
        }
      } else {
        // Reassign host if host left
        if (room.hostId === socket.id) {
          room.hostId = room.players[0].id;
          room.players[0].isHost = true;
        }
        this.io.to(roomId).emit('s2c_room_state_updated', { room });
      }
      this.broadcastRoomsList();
    } else {
      // In game: mark player disconnected or convert to bot
      const player = room.players.find((p) => p.id === socket.id);
      if (player) {
        player.isBot = true;
        player.name = `${player.name} (Desconectado)`;
        this.io.to(roomId).emit('s2c_room_state_updated', { room });
      }
    }
  }
}
