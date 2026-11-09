import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import { RoomManager } from '../src/models/RoomManager.js';
import { registerSocketHandlers } from '../src/socket/socketHandler.js';

const TEST_PORT = 3099;
const SERVER_URL = `http://localhost:${TEST_PORT}`;

// Test runner counters
let passedCount = 0;
let failedCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failedCount++;
    throw new Error(`Assertion failed: ${testName}`);
  }
}

// Socket client helper
function createClient() {
  return ClientIO(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });
}

function waitForConnect(socket) {
  return new Promise((resolve) => {
    if (socket.connected) return resolve();
    socket.once('connect', resolve);
  });
}

function emitPromise(socket, event, data) {
  return new Promise((resolve) => {
    socket.emit(event, data, (response) => {
      resolve(response);
    });
  });
}

function waitForMatchingEvent(socket, event, predicate, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeoutMs);

    function handler(data) {
      if (!predicate || predicate(data)) {
        clearTimeout(timer);
        socket.off(event, handler);
        resolve(data);
      }
    }

    socket.on(event, handler);
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('  MINUS Multiplayer Real-Time Test Suite (Phase 1)');
  console.log('======================================================\n');

  // Setup standalone test server
  const app = express();
  const testHttpServer = http.createServer(app);
  const roomManager = new RoomManager(5000); // 5 sec grace period for tests
  const testIO = new Server(testHttpServer, {
    cors: { origin: '*' },
  });
  registerSocketHandlers(testIO, roomManager);

  await new Promise((resolve) => testHttpServer.listen(TEST_PORT, resolve));
  console.log(`Test server running on port ${TEST_PORT}\n`);

  try {
    // ----------------------------------------------------
    // Scenario 1: One player creates a room
    // ----------------------------------------------------
    console.log('--- Scenario 1: One player creates a room ---');
    const p1 = createClient();
    await waitForConnect(p1);

    const createRes = await emitPromise(p1, 'create_room', { playerName: 'Alice (Host)' });
    assert(createRes.success === true, 'Host successfully creates room');
    assert(typeof createRes.roomCode === 'string' && createRes.roomCode.length === 6, 'Valid 6-char room code generated');
    assert(createRes.player.isHost === true, 'Player 1 is designated as Room Host');
    assert(createRes.player.seatIndex === 0, 'Host is assigned to Seat 0 (South)');
    assert(createRes.roomState.playerCount === 1, 'Room state shows exactly 1 player');
    assert(createRes.roomState.status === 'lobby', 'Initial room status is "lobby"');

    const roomCode = createRes.roomCode;
    const p1Token = createRes.reconnectToken;

    // ----------------------------------------------------
    // Scenario 2: Three other players join using room code
    // ----------------------------------------------------
    console.log('\n--- Scenario 2: Three other players join using room code ---');
    const p2 = createClient();
    const p3 = createClient();
    const p4 = createClient();
    await Promise.all([waitForConnect(p2), waitForConnect(p3), waitForConnect(p4)]);

    const joinRes2 = await emitPromise(p2, 'join_room', { roomCode, playerName: 'Bob' });
    assert(joinRes2.success === true, 'Player 2 joins successfully');
    assert(joinRes2.player.seatIndex === 1, 'Player 2 assigned to Seat 1 (West)');
    assert(joinRes2.player.isHost === false, 'Player 2 is not host');

    const joinRes3 = await emitPromise(p3, 'join_room', { roomCode, playerName: 'Charlie' });
    assert(joinRes3.success === true, 'Player 3 joins successfully');
    assert(joinRes3.player.seatIndex === 2, 'Player 3 assigned to Seat 2 (North)');

    const joinRes4 = await emitPromise(p4, 'join_room', { roomCode, playerName: 'Diana' });
    assert(joinRes4.success === true, 'Player 4 joins successfully');
    assert(joinRes4.player.seatIndex === 3, 'Player 4 assigned to Seat 3 (East)');
    assert(joinRes4.roomState.playerCount === 4, 'Room now has 4 players (full room)');

    // ----------------------------------------------------
    // Scenario 3: A fifth player is rejected
    // ----------------------------------------------------
    console.log('\n--- Scenario 3: A fifth player is rejected ---');
    const p5 = createClient();
    await waitForConnect(p5);

    const joinRes5 = await emitPromise(p5, 'join_room', { roomCode, playerName: 'Eve (Extra)' });
    assert(joinRes5.success === false, 'Player 5 is rejected');
    assert(joinRes5.error.includes('full'), 'Error message clearly indicates room is full');
    p5.disconnect();

    // ----------------------------------------------------
    // Scenario 4: All four players see the same lobby state
    // ----------------------------------------------------
    console.log('\n--- Scenario 4: All 4 players see the same lobby state ---');
    const serverRoom = roomManager.getRoom(roomCode);
    const authoritativeState = serverRoom.getPublicState();
    assert(authoritativeState.playerCount === 4, 'Authoritative player count is 4');
    assert(authoritativeState.seats.every((s) => !s.isEmpty), 'All 4 seats are occupied');
    assert(authoritativeState.seats[0].playerName === 'Alice (Host)', 'Seat 0 is Alice');
    assert(authoritativeState.seats[1].playerName === 'Bob', 'Seat 1 is Bob');
    assert(authoritativeState.seats[2].playerName === 'Charlie', 'Seat 2 is Charlie');
    assert(authoritativeState.seats[3].playerName === 'Diana', 'Seat 3 is Diana');

    // ----------------------------------------------------
    // Scenario 5: Ready status updates for everyone
    // ----------------------------------------------------
    console.log('\n--- Scenario 5: Ready status updates for everyone ---');
    const p1WaitBobReady = waitForMatchingEvent(
      p1,
      'room_state_updated',
      (s) => s.seats[1] && s.seats[1].isReady === true
    );
    const readyRes2 = await emitPromise(p2, 'toggle_ready');
    assert(readyRes2.success === true && readyRes2.isReady === true, 'Bob toggled Ready');

    const updatedStateForP1 = await p1WaitBobReady;
    assert(updatedStateForP1.seats[1].isReady === true, 'Host received Bob ready status via broadcast');
    assert(updatedStateForP1.canStart === false, 'Cannot start yet (only Bob is ready)');

    // Toggle remaining players ready
    const allReadyPromise = waitForMatchingEvent(p2, 'room_state_updated', (s) => s.canStart === true);
    await emitPromise(p1, 'toggle_ready');
    await emitPromise(p3, 'toggle_ready');
    const finalReadyRes = await emitPromise(p4, 'toggle_ready');
    assert(finalReadyRes.success === true, 'Diana toggled Ready');

    const fullReadyState = await allReadyPromise;
    assert(fullReadyState.isAllReady === true, 'All 4 players are now Ready');
    assert(fullReadyState.canStart === true, 'canStart is now true across clients');

    // ----------------------------------------------------
    // Scenario 6: Host can open the table preview
    // ----------------------------------------------------
    console.log('\n--- Scenario 6: Host can open table preview ---');
    const tablePreviewPromise = waitForMatchingEvent(
      p2,
      'room_state_updated',
      (s) => s.status === 'table_preview'
    );
    const startRes = await emitPromise(p1, 'start_game_preview');
    assert(startRes.success === true, 'Host successfully started table preview');

    const previewState = await tablePreviewPromise;
    assert(previewState.status === 'table_preview', 'Table status changed to "table_preview" for all players');

    // ----------------------------------------------------
    // Scenario 7: A player disconnects and reconnects
    // ----------------------------------------------------
    console.log('\n--- Scenario 7: Player disconnects and reconnects ---');
    const bobToken = joinRes2.reconnectToken;
    const p1DisconnectNotice = waitForMatchingEvent(
      p1,
      'room_state_updated',
      (s) => s.seats[1] && s.seats[1].isConnected === false
    );

    // Bob disconnects
    p2.disconnect();
    const stateAfterDrop = await p1DisconnectNotice;
    assert(stateAfterDrop.seats[1].isConnected === false, 'Seat 1 marked as disconnected (holding seat in grace period)');

    // Bob reconnects with new socket using his reconnectToken
    const p2Reconnected = createClient();
    await waitForConnect(p2Reconnected);

    const p1ReconnectNotice = waitForMatchingEvent(
      p1,
      'room_state_updated',
      (s) => s.seats[1] && s.seats[1].isConnected === true
    );
    const reconRes = await emitPromise(p2Reconnected, 'reconnect_player', {
      roomCode,
      reconnectToken: bobToken,
    });
    assert(reconRes.success === true, 'Bob successfully reconnected with token');
    assert(reconRes.player.seatIndex === 1, 'Bob resumed Seat 1 (West)');

    const stateAfterReconnect = await p1ReconnectNotice;
    assert(stateAfterReconnect.seats[1].isConnected === true, 'Seat 1 is marked connected again');

    // ----------------------------------------------------
    // Scenario 8: Two different rooms work independently
    // ----------------------------------------------------
    console.log('\n--- Scenario 8: Two different rooms work independently ---');
    const pRoom2Host = createClient();
    await waitForConnect(pRoom2Host);

    const room2Res = await emitPromise(pRoom2Host, 'create_room', { playerName: 'Room2 Host' });
    assert(room2Res.success === true, 'Room 2 created successfully');
    assert(room2Res.roomCode !== roomCode, 'Room 2 has distinct room code');
    assert(room2Res.roomState.playerCount === 1, 'Room 2 has 1 player');

    // Verify Room 1 state was untouched
    const room1Current = roomManager.getRoom(roomCode);
    assert(room1Current.getPlayerCount() === 4, 'Room 1 still has 4 players');
    assert(roomManager.rooms.size === 2, 'RoomManager has exactly 2 independent active rooms');

    pRoom2Host.disconnect();

    // ----------------------------------------------------
    // Scenario 9: Non-host cannot perform host-only actions
    // ----------------------------------------------------
    console.log('\n--- Scenario 9: Non-host cannot perform host-only actions ---');
    // Charlie (p3) attempts to return room to lobby or start preview
    const unauthorizedReturn = await emitPromise(p3, 'return_to_lobby');
    assert(unauthorizedReturn.success === false, 'Charlie (non-host) blocked from returning table to lobby');
    assert(unauthorizedReturn.error.includes('host'), 'Error states only host can perform action');

    // Host Alice returns to lobby
    const hostReturnRes = await emitPromise(p1, 'return_to_lobby');
    assert(hostReturnRes.success === true, 'Host Alice successfully returned room to lobby');
    assert(roomManager.getRoom(roomCode).status === 'lobby', 'Room status returned to "lobby"');

    // Clean up
    p1.disconnect();
    p2Reconnected.disconnect();
    p3.disconnect();
    p4.disconnect();

    console.log('\n======================================================');
    console.log(`  TEST RESULTS: ${passedCount} passed, ${failedCount} failed`);
    console.log('  ALL 9 MULTIPLAYER SCENARIOS VERIFIED SUCCESSFULLY!');
    console.log('======================================================\n');
  } finally {
    testHttpServer.close();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });
