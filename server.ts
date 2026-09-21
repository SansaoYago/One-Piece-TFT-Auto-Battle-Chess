import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { RoomManager } from './server/roomManager';

async function startServer() {
  const app = express();
  // In development: Bind strictly to port 3000 to match AI Studio's nginx dev proxy.
  // In production (Cloud Run): Bind to process.env.PORT (typically 8080) provided by Cloud Run.
  const PORT = process.env.NODE_ENV === 'production' && process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : 3000;
  const httpServer = http.createServer(app);

  // Setup Socket.IO Server on the same HTTP server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  const roomManager = new RoomManager(io);

  // Socket.IO event router
  io.on('connection', (socket) => {
    // Room creation
    socket.on('c2s_create_room', (data) => {
      roomManager.createRoom(
        socket,
        data?.playerName || 'Capitão',
        data?.avatar || '👒',
        data?.commanderId || 'luffy'
      );
    });

    // Room joining
    socket.on('c2s_join_room', (data) => {
      roomManager.joinRoom(
        socket,
        data?.roomCode || '',
        data?.playerName || 'Pirata',
        data?.avatar || '🏴‍☠️',
        data?.commanderId || 'zoro'
      );
    });

    // Start game
    socket.on('c2s_start_game', () => {
      roomManager.startGame(socket);
    });

    // Submit board
    socket.on('c2s_submit_board', (data) => {
      roomManager.submitBoard(socket, data);
    });

    // Combat result
    socket.on('c2s_submit_combat_result', (data) => {
      roomManager.submitCombatResult(socket, data);
    });

    // Champion Pool Buy / Sell
    socket.on('c2s_update_pool', (data) => {
      roomManager.updateChampionPool(socket, data?.unitId, data?.action);
    });

    // Quick chat & emotes
    socket.on('c2s_send_emote', (data) => {
      roomManager.sendEmote(socket, data?.text, data?.icon);
    });

    // List available rooms
    socket.on('c2s_get_rooms', () => {
      socket.emit('s2c_rooms_list', { rooms: roomManager.getAvailableRooms() });
    });

    // Disconnect
    socket.on('disconnect', () => {
      roomManager.handleDisconnect(socket);
    });
  });

  // REST API Routes
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      game: 'One Piece Tactics',
      multiplayer: 'enabled',
      timestamp: Date.now(),
    });
  });

  app.get('/api/multiplayer/rooms', (_req, res) => {
    res.json({
      rooms: roomManager.getAvailableRooms(),
    });
  });

  // Vite middleware for development vs Static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Robust static files path resolution for Cloud Run container
    const fs = await import('fs');
    const cwdDist = path.join(process.cwd(), 'dist');
    const dirDist = path.join(__dirname, 'dist');
    const distPath = fs.existsSync(path.join(cwdDist, 'index.html'))
      ? cwdDist
      : fs.existsSync(path.join(dirDist, 'index.html'))
        ? dirDist
        : __dirname;

    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[One Piece Tactics] Server running on http://0.0.0.0:${PORT}`);
  });

  // If deployed in production and PORT is not 3000, also bind an auxiliary listener on 3000
  if (process.env.NODE_ENV === 'production' && PORT !== 3000) {
    try {
      const fallbackServer = http.createServer(app);
      fallbackServer.listen(3000, '0.0.0.0', () => {
        console.log(`[One Piece Tactics] Auxiliary server running on http://0.0.0.0:3000`);
      });
      fallbackServer.on('error', (err: any) => {
        console.log(`[One Piece Tactics] Port 3000 auxiliary listener notice: ${err?.message || err}`);
      });
    } catch {
      // Ignored
    }
  }
}

startServer().catch((err) => {
  console.error('Failed to start One Piece Tactics Server:', err);
});
