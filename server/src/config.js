import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  reconnectGracePeriodMs: parseInt(process.env.RECONNECT_GRACE_PERIOD_MS || '60000', 10),
  roomCleanupIntervalMs: parseInt(process.env.ROOM_CLEANUP_INTERVAL_MS || '30000', 10),
  maxRoomInactivityMs: parseInt(process.env.MAX_ROOM_INACTIVITY_MS || '3600000', 10), // 1 hour
  turnServerUrl: process.env.TURN_SERVER_URL || '',
  turnUsername: process.env.TURN_USERNAME || '',
  turnCredential: process.env.TURN_CREDENTIAL || '',
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    ...(process.env.TURN_SERVER_URL
      ? [
          {
            urls: process.env.TURN_SERVER_URL,
            username: process.env.TURN_USERNAME || '',
            credential: process.env.TURN_CREDENTIAL || '',
          },
        ]
      : []),
  ],
};

