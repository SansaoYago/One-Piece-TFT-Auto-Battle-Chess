import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  Firestore,
  serverTimestamp,
} from 'firebase/firestore';
import { AvailableRoomSummary, MultiplayerRoomState } from '../types/multiplayer';

export const FIREBASE_CONFIG = {
  projectId: 'gen-lang-client-0099332454',
  appId: '1:657727715419:web:b3a1d6bea817917447677e',
  apiKey: 'AIzaSyDLUEU6iLCG41twsgLWBwwdE5UR6Iihs40',
  authDomain: 'gen-lang-client-0099332454.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-onepiecetftautob-5bc4b208-0f43-4b63-8756-0b67fbbff3b0',
  storageBucket: 'gen-lang-client-0099332454.firebasestorage.app',
  messagingSenderId: '657727715419',
};

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    if (getApps().length > 0) {
      firebaseApp = getApp();
    } else {
      firebaseApp = initializeApp(FIREBASE_CONFIG);
    }
  }
  return firebaseApp;
}

export function getFirestoreDb(): Firestore {
  if (!firestoreDb) {
    const app = getFirebaseApp();
    try {
      firestoreDb = getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId);
    } catch {
      firestoreDb = getFirestore(app);
    }
  }
  return firestoreDb;
}

/**
 * Escuta salas ativas no Firestore em tempo real.
 * Independente da plataforma (.exe ou Web), qualquer sala criada é transmitida instantaneamente.
 */
export function subscribeToActiveRoomsFirestore(
  onRoomsChanged: (rooms: AvailableRoomSummary[]) => void
): () => void {
  try {
    const db = getFirestoreDb();
    const roomsCol = collection(db, 'rooms');
    const q = query(roomsCol, where('status', 'in', ['LOBBY', 'IN_GAME']));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rooms: AvailableRoomSummary[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          rooms.push({
            roomId: docSnap.id,
            roomCode: data.code || data.roomCode || docSnap.id,
            id: docSnap.id,
            name: data.name || `Sala ${docSnap.id}`,
            code: data.code || data.roomCode || docSnap.id,
            hostId: data.hostId || '',
            hostName: data.hostName || 'Capitão',
            hostAvatar: data.hostAvatar || '⚓',
            playerCount: data.playerCount || (data.players ? data.players.length : 1),
            maxPlayers: data.maxPlayers || 8,
            status: data.status || 'LOBBY',
            createdAt: data.createdAt || Date.now(),
            serverUrl: data.serverUrl || undefined,
          });
        });
        // Ordena por salas mais recentes
        rooms.sort((a, b) => b.createdAt - a.createdAt);
        onRoomsChanged(rooms);
      },
      (error) => {
        console.warn('[Firestore] Falha ao escutar salas ativas:', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[Firestore] Erro na inicialização do listener de salas:', err);
    return () => {};
  }
}

/**
 * Registra ou atualiza o estado de uma sala no Cloud Firestore.
 */
export async function syncRoomToFirestore(
  roomState: MultiplayerRoomState,
  serverUrl?: string
): Promise<void> {
  try {
    const db = getFirestoreDb();
    const roomRef = doc(db, 'rooms', roomState.roomId);
    const host = roomState.players.find((p) => p.isHost) || roomState.players[0];

    await setDoc(
      roomRef,
      {
        id: roomState.roomId,
        roomId: roomState.roomId,
        name: `Sala de ${host?.name || 'Pirata'}`,
        code: roomState.roomCode,
        roomCode: roomState.roomCode,
        hostId: host?.id || '',
        hostName: host?.name || 'Capitão Pirata',
        hostAvatar: host?.avatar || '⚓',
        status: roomState.status,
        playerCount: roomState.players.length,
        maxPlayers: roomState.maxPlayers || 8,
        players: roomState.players.map((p) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          isHost: p.isHost,
          isBot: p.isBot,
          hp: p.hp,
          level: p.level,
        })),
        stage: roomState.stage,
        roundInStage: roomState.roundInStage,
        roundStage: roomState.roundStage,
        phase: roomState.phase,
        countdown: roomState.countdown,
        serverUrl: serverUrl || (typeof window !== 'undefined' ? window.location.origin : ''),
        updatedAt: Date.now(),
        createdAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firestore] Falha ao sincronizar sala com o Firestore:', err);
  }
}

/**
 * Remove ou marca como finalizada uma sala no Firestore
 */
export async function deleteRoomFromFirestore(roomId: string): Promise<void> {
  try {
    const db = getFirestoreDb();
    const roomRef = doc(db, 'rooms', roomId);
    await deleteDoc(roomRef);
  } catch (err) {
    console.warn('[Firestore] Falha ao deletar sala do Firestore:', err);
  }
}

/**
 * Busca a lista de salas uma única vez (fallback via REST/SDK)
 */
export async function fetchActiveRoomsFirestore(): Promise<AvailableRoomSummary[]> {
  try {
    const db = getFirestoreDb();
    const roomsCol = collection(db, 'rooms');
    const q = query(roomsCol, where('status', 'in', ['LOBBY', 'IN_GAME']));
    const snapshot = await getDocs(q);

    const rooms: AvailableRoomSummary[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      rooms.push({
        roomId: docSnap.id,
        roomCode: data.code || data.roomCode || docSnap.id,
        id: docSnap.id,
        name: data.name || `Sala ${docSnap.id}`,
        code: data.code || data.roomCode || docSnap.id,
        hostId: data.hostId || '',
        hostName: data.hostName || 'Capitão',
        hostAvatar: data.hostAvatar || '⚓',
        playerCount: data.playerCount || (data.players ? data.players.length : 1),
        maxPlayers: data.maxPlayers || 8,
        status: data.status || 'LOBBY',
        createdAt: data.createdAt || Date.now(),
        serverUrl: data.serverUrl || undefined,
      });
    });
    return rooms;
  } catch (err) {
    console.warn('[Firestore] Erro ao buscar salas:', err);
    return [];
  }
}
