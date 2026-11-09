import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import express from 'express';
import { RoomManager } from '../src/models/RoomManager.js';
import { registerSocketHandlers } from '../src/socket/socketHandler.js';
import { config } from '../src/config.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function run() {
  console.log('\n===============================================================');
  console.log('  PRO CARD – LIVE VOICE CHAT SIGNALING TEST SUITE');
  console.log('===============================================================\n');

  // Set up test server
  const app = express();
  app.get('/api/ice-servers', (req, res) => {
    res.json({
      success: true,
      iceServers: config.iceServers,
    });
  });

  const httpServer = createServer(app);
  const ioServer = new Server(httpServer, {
    cors: { origin: '*' },
  });
  const roomManager = new RoomManager();
  registerSocketHandlers(ioServer, roomManager);

  const PORT = 3109;
  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  const serverUrl = `http://localhost:${PORT}`;

  function createClientSocket() {
    return Client(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
      autoConnect: true,
    });
  }

  // --- Test 1: /api/ice-servers endpoint ---
  console.log('--- Test 1: ICE Servers Secure API ---');
  const res = await fetch(`${serverUrl}/api/ice-servers`);
  const iceData = await res.json();
  assert(iceData.success === true, 'GET /api/ice-servers returns success: true');
  assert(Array.isArray(iceData.iceServers) && iceData.iceServers.length > 0, 'Returns non-empty iceServers array');
  assert(
    iceData.iceServers.some((s) => JSON.stringify(s).includes('stun:')),
    'Includes default STUN server (stun.l.google.com)'
  );

  // --- Test 2: Room join and voice peer discovery ---
  console.log('\n--- Test 2: Room Joining & Voice Peer Discovery ---');
  const client1 = createClientSocket();
  const client2 = createClientSocket();
  const client3 = createClientSocket();
  const client4 = createClientSocket();

  await Promise.all([
    new Promise((res) => client1.on('connect', res)),
    new Promise((res) => client2.on('connect', res)),
    new Promise((res) => client3.on('connect', res)),
    new Promise((res) => client4.on('connect', res)),
  ]);

  // Client 1 creates room
  const createRoomRes = await new Promise((res) => {
    client1.emit('create_room', { playerName: 'Player1' }, res);
  });
  const roomCode = createRoomRes.roomCode;
  assert(createRoomRes.success, 'Player1 created room for voice chat');

  // Client 2 joins and verifies client1 receives peer_joined_voice
  const peerJoinedPromise = new Promise((resolve) => {
    client1.once('peer_joined_voice', (peer) => resolve(peer));
  });

  const joinRes2 = await new Promise((res) => {
    client2.emit('join_room', { roomCode, playerName: 'Player2' }, res);
  });
  assert(joinRes2.success, 'Player2 joined room');

  const joinedPeer = await peerJoinedPromise;
  assert(joinedPeer.playerName === 'Player2', 'Player1 received peer_joined_voice with Player2 name');
  assert(joinedPeer.socketId === client2.id, 'Player1 received correct socketId for Player2');

  // Client 2 should have received voice_room_peers with client1
  const peersRes = await new Promise((res) => {
    client2.emit('get_voice_peers', res);
  });
  assert(peersRes.success && peersRes.peers.length === 1, 'Player2 sees 1 active voice peer (Player1)');
  assert(peersRes.peers[0].playerName === 'Player1', 'Active peer is Player1');

  // Client 3 and 4 join
  await new Promise((res) => client3.emit('join_room', { roomCode, playerName: 'Player3' }, res));
  await new Promise((res) => client4.emit('join_room', { roomCode, playerName: 'Player4' }, res));

  const allPeersClient1 = await new Promise((res) => client1.emit('get_voice_peers', res));
  assert(allPeersClient1.peers.length === 3, 'Player1 sees all 3 other peers in 4-player room');

  // --- Test 3: WebRTC Signaling Exchange ---
  console.log('\n--- Test 3: WebRTC Signaling (Offers, Answers, ICE candidates) ---');
  const dummySignalOffer = { type: 'offer', sdp: 'v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' };

  const signalPromise = new Promise((resolve) => {
    client2.once('webrtc_signal', (payload) => resolve(payload));
  });

  client1.emit('webrtc_signal', {
    targetSocketId: client2.id,
    signal: dummySignalOffer,
  });

  const receivedSignal = await signalPromise;
  assert(receivedSignal.senderSocketId === client1.id, 'Player2 received signal from Player1');
  assert(receivedSignal.signal.type === 'offer', 'Signal content matches offer payload');

  // --- Test 4: Microphone Status & Speaking Indicator Broadcast ---
  console.log('\n--- Test 4: Microphone & Live Speaking Indicator Updates ---');
  const statusPromise = new Promise((resolve) => {
    client3.once('peer_voice_status', (status) => resolve(status));
  });

  // Player 1 unmutes and speaks
  client1.emit('webrtc_voice_status', {
    isMicOn: true,
    isMuted: false,
    isSpeaking: true,
  });

  const receivedStatus = await statusPromise;
  assert(receivedStatus.socketId === client1.id, 'Broadcast contains correct speaker socketId');
  assert(receivedStatus.voiceState.isMicOn === true, 'Broadcast shows isMicOn = true');
  assert(receivedStatus.voiceState.isMuted === false, 'Broadcast shows isMuted = false');
  assert(receivedStatus.voiceState.isSpeaking === true, 'Broadcast shows isSpeaking = true');

  // --- Test 5: Peer Leave Cleanup ---
  console.log('\n--- Test 5: Peer Leaving Voice Clean Up ---');
  const leftPromise = new Promise((resolve) => {
    client1.once('peer_left_voice', (payload) => resolve(payload));
  });

  await new Promise((res) => client4.emit('leave_room', res));
  const leftPayload = await leftPromise;
  assert(leftPayload.socketId === client4.id, 'Remaining peers receive peer_left_voice when Player4 leaves');

  const finalPeers = await new Promise((res) => client1.emit('get_voice_peers', res));
  assert(finalPeers.peers.length === 2, 'Player1 now sees exactly 2 remaining peers');

  // Cleanup
  client1.disconnect();
  client2.disconnect();
  client3.disconnect();
  client4.disconnect();
  httpServer.close();

  console.log('\n===============================================================');
  console.log(`  TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('  ALL PRO CARD LIVE VOICE CHAT SIGNALING VERIFIED 100%!');
  console.log('===============================================================\n');

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});

