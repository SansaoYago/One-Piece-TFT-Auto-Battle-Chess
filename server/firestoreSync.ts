import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  Firestore,
} from 'firebase/firestore';
import { MultiplayerRoomState } from '../src/types/multiplayer';

const FIREBASE_CONFIG = {
  projectId: 'gen-lang-client-0099332454',
  appId: '1:657727715419:web:b3a1d6bea817917447677e',
  apiKey: 'AIzaSyDLUEU6iLCG41twsgLWBwwdE5UR6Iihs40',
  authDomain: 'gen-lang-client-0099332454.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-onepiecetftautob-5bc4b208-0f43-4b63-8756-0b67fbbff3b0',
  storageBucket: 'gen-lang-client-0099332454.firebasestorage.app',
  messagingSenderId: '657727715419',
};

let db: Firestore | null = null;

function getDb(): Firestore | null {
  if (db) return db;
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
    try {
      db = getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId);
    } catch {
      db = getFirestore(app);
    }
    return db;
  } catch (e) {
    console.warn('[Server Firestore] Failed to initialize Firestore:', e);
    return null;
  }
}

export const CENTRAL_SERVER_PUBLIC_URL =
  process.env.PUBLIC_APP_URL || 'https://ais-dev-4jri3d5iut235w662qvv2e-167791983539.us-east1.run.app';

export async function serverSyncRoomToFirestore(room: MultiplayerRoomState): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    const host = room.players.find((p) => p.isHost) || room.players[0];
    const roomRef = doc(firestore, 'rooms', room.roomId);

    await setDoc(
      roomRef,
      {
        id: room.roomId,
        roomId: room.roomId,
        name: `Sala de ${host?.name || 'Capitão'}`,
        code: room.roomCode,
        roomCode: room.roomCode,
        hostId: room.hostId,
        hostName: host?.name || 'Capitão Pirata',
        hostAvatar: host?.avatar || '⚓',
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers,
        status: room.status,
        stage: room.stage,
        roundInStage: room.roundInStage,
        roundStage: room.roundStage,
        phase: room.phase,
        countdown: room.countdown,
        serverUrl: CENTRAL_SERVER_PUBLIC_URL,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Server Firestore] Failed to sync room doc:', err);
  }
}

export async function serverDeleteRoomFromFirestore(roomId: string): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    const roomRef = doc(firestore, 'rooms', roomId);
    await deleteDoc(roomRef);
  } catch (err) {
    console.warn('[Server Firestore] Failed to delete room doc:', err);
  }
}
