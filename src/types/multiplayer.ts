import { UnitInstance, Commander } from './game';

export type RoomStatus = 'LOBBY' | 'IN_GAME' | 'FINISHED';

export interface MultiplayerPlayer {
  id: string;
  name: string;
  avatar: string;
  commanderId: string;
  isHost: boolean;
  isBot: boolean;
  isReady: boolean;
  hp: number;
  maxHp: number;
  gold: number;
  level: number;
  streak: number;
  isEliminated: boolean;
  placement: number;
  boardUnits?: UnitInstance[];
  activeSynergies?: { traitId: string; count: number; activeTier: number }[];
}

export interface MultiplayerMatchPairing {
  homePlayerId: string;
  awayPlayerId: string;
  isGhost: boolean; // if true, away board is a clone/ghost without dealing damage to home player if away loses
}

export interface MultiplayerRoomState {
  roomId: string;
  roomCode: string;
  hostId: string;
  status: RoomStatus;
  maxPlayers: number;
  players: MultiplayerPlayer[];
  phase: 'PREPARATION' | 'COMBAT' | 'RESOLUTION';
  countdown: number;
  stage: number;
  roundInStage: number;
  roundStage: string;
  roundTitle: string;
  pairings: MultiplayerMatchPairing[];
  championPool: Record<string, number>;
}

export interface EmoteMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  icon?: string;
  timestamp: number;
}

export interface CombatSubmission {
  roomId: string;
  playerId: string;
  units: UnitInstance[];
  level: number;
  gold: number;
}

export interface CombatResultSubmission {
  roomId: string;
  playerId: string;
  opponentId: string;
  won: boolean;
  isDraw: boolean;
  survivingUnitsCount: number;
  damageDealtToOpponent: number;
}

export interface AvailableRoomSummary {
  roomId: string;
  roomCode: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  playerCount: number;
  maxPlayers: number;
  status: RoomStatus;
}

