import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './src/config.js';
import { RoomManager } from './src/models/RoomManager.js';
import { registerSocketHandlers } from './src/socket/socketHandler.js';

const app = express();
const server = http.createServer(app);

// Enable CORS for express endpoints
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      // or from localhost/local IP dev addresses
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());

// Initialize RoomManager
const roomManager = new RoomManager(config.reconnectGracePeriodMs);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Register socket events
registerSocketHandlers(io, roomManager);

// Expire seats after the reconnect grace period and notify remaining players.
const roomCleanupTimer = setInterval(() => {
  for (const update of roomManager.cleanupAbandonedRooms()) {
    if (update.roomDeleted) continue;

    io.to(update.roomCode).emit('room_state_updated', update.roomState);
    io.to(update.roomCode).emit('player_notification', {
      type: 'warning',
      message: `${update.expiredPlayerNames.join(', ') || 'A player'}'s reconnect window expired.`,
      timestamp: Date.now(),
    });
  }
}, config.roomCleanupIntervalMs);
roomCleanupTimer.unref?.();

// HTTP Health Check & Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    game: 'PRO CARD',
    uptime: process.uptime(),
    activeRooms: roomManager.rooms.size,
    timestamp: new Date().toISOString(),
  });
});

// Secure ICE Servers Configuration Endpoint (STUN / TURN)
app.get('/api/ice-servers', (req, res) => {
  res.json({
    success: true,
    iceServers: config.iceServers,
  });
});

// Start Server
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`♠ ♥ ♦ ♣  PRO CARD Multiplayer Server`);
  console.log(`Running authoritative server on port: ${PORT}`);
  console.log(`Health endpoint: http://localhost:${PORT}/api/health`);
  console.log(`Socket.IO endpoint ready`);
  console.log(`===============================================`);
});

// Export server and roomManager for testing
export { app, server, io, roomManager };
