import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import { RoomManager } from '../src/models/RoomManager.js';
import { registerSocketHandlers } from '../src/socket/socketHandler.js';

const TEST_PORT = 3101;
const SERVER_URL = `http://localhost:${TEST_PORT}`;

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedCount++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

function createSessionClient() {
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

function waitForMatchingEvent(socket, event, predicate, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout waiting for event "${event}"`));
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

async function runFourSessionsTest() {
  console.log('\n===============================================================');
  console.log('  MINUS 4 SEPARATE SESSIONS MULTIPLAYER INTEGRATION TEST');
  console.log('===============================================================\n');

  // Start test server
  const app = express();
  const testServer = http.createServer(app);
  const roomManager = new RoomManager(60000);
  const io = new Server(testServer, { cors: { origin: '*' } });
  registerSocketHandlers(io, roomManager);

  await new Promise((resolve) => testServer.listen(TEST_PORT, resolve));
  console.log(`Test server running on port ${TEST_PORT}\n`);

  try {
    // -----------------------------------------------------------------
    // Step 1: Session 1 creates Room
    // -----------------------------------------------------------------
    console.log('--- Step 1: Session 1 (Alice) creates a 4-player room ---');
    const session1 = createSessionClient();
    await waitForConnect(session1);

    const s1Notifications = [];
    session1.on('player_notification', (n) => s1Notifications.push(n));

    const s1Res = await emitPromise(session1, 'create_room', { playerName: 'Alice (Host)' });
    assert(s1Res.success === true, 'Session 1 creates room successfully');
    assert(s1Res.roomCode && s1Res.roomCode.length === 6, 'Session 1 assigned unique 6-character room code');
    assert(s1Res.player.isHost === true, 'Session 1 is room host');
    assert(s1Res.player.seatIndex === 0, 'Session 1 assigned to Seat 0 (South)');
    assert(s1Res.roomState.playerCount === 1, 'Room has 1 player seated');

    const roomCode = s1Res.roomCode;
    const s1Token = s1Res.reconnectToken;

    // -----------------------------------------------------------------
    // Step 2: Session 2 joins room using room code
    // -----------------------------------------------------------------
    console.log('\n--- Step 2: Session 2 (Bob) joins using room code ---');
    const session2 = createSessionClient();
    await waitForConnect(session2);

    const s2Notifications = [];
    session2.on('player_notification', (n) => s2Notifications.push(n));

    const s1JoinNoticePromise = waitForMatchingEvent(
      session1,
      'player_notification',
      (n) => n.message && n.message.includes('Bob')
    );

    const s2Res = await emitPromise(session2, 'join_room', { roomCode, playerName: 'Bob' });
    assert(s2Res.success === true, 'Session 2 joins successfully');
    assert(s2Res.player.seatIndex === 1, 'Session 2 assigned to Seat 1 (West)');
    assert(s2Res.player.isHost === false, 'Session 2 is not host');

    const s1GotJoin = await s1JoinNoticePromise;
    assert(s1GotJoin.message.includes('Bob joined'), 'Session 1 received real-time join notification for Bob');

    // -----------------------------------------------------------------
    // Step 3: Session 3 joins room using room code
    // -----------------------------------------------------------------
    console.log('\n--- Step 3: Session 3 (Charlie) joins using room code ---');
    const session3 = createSessionClient();
    await waitForConnect(session3);

    const s3Notifications = [];
    session3.on('player_notification', (n) => s3Notifications.push(n));

    const s3Res = await emitPromise(session3, 'join_room', { roomCode, playerName: 'Charlie' });
    assert(s3Res.success === true, 'Session 3 joins successfully');
    assert(s3Res.player.seatIndex === 2, 'Session 3 assigned to Seat 2 (North)');

    // -----------------------------------------------------------------
    // Step 4: Session 4 joins room using room code (Room becomes 4/4 Full)
    // -----------------------------------------------------------------
    console.log('\n--- Step 4: Session 4 (Diana) joins room (Table Full 4/4) ---');
    const session4 = createSessionClient();
    await waitForConnect(session4);

    const s4Notifications = [];
    session4.on('player_notification', (n) => s4Notifications.push(n));

    const s4Res = await emitPromise(session4, 'join_room', { roomCode, playerName: 'Diana' });
    assert(s4Res.success === true, 'Session 4 joins successfully');
    assert(s4Res.player.seatIndex === 3, 'Session 4 assigned to Seat 3 (East)');
    assert(s4Res.roomState.playerCount === 4, 'Authoritative count shows 4/4 players');

    // -----------------------------------------------------------------
    // Step 5: Session 5 attempts to join -> Rejected
    // -----------------------------------------------------------------
    console.log('\n--- Step 5: Session 5 (Eve) attempts to join -> Rejected ---');
    const session5 = createSessionClient();
    await waitForConnect(session5);

    const s5Res = await emitPromise(session5, 'join_room', { roomCode, playerName: 'Eve (Extra)' });
    assert(s5Res.success === false, 'Session 5 is rejected');
    assert(s5Res.error.includes('full'), 'Session 5 received room full rejection error');
    session5.disconnect();

    // -----------------------------------------------------------------
    // Step 6: Synchronize Ready Status across all 4 sessions
    // -----------------------------------------------------------------
    console.log('\n--- Step 6: All 4 sessions toggle Ready ---');
    // Session 2 readies
    const s1WaitS2Ready = waitForMatchingEvent(session1, 'room_state_updated', (s) => s.seats[1]?.isReady === true);
    const r2 = await emitPromise(session2, 'toggle_ready');
    assert(r2.success === true && r2.isReady === true, 'Session 2 (Bob) toggled Ready');
    await s1WaitS2Ready;

    // Session 3 readies
    await emitPromise(session3, 'toggle_ready');
    // Session 4 readies
    await emitPromise(session4, 'toggle_ready');

    // Session 1 (Host) readies
    const allReadyPromiseS4 = waitForMatchingEvent(session4, 'room_state_updated', (s) => s.canStart === true);
    const r1 = await emitPromise(session1, 'toggle_ready');
    assert(r1.success === true && r1.isReady === true, 'Session 1 (Host) toggled Ready');

    const s4FinalReadyState = await allReadyPromiseS4;
    assert(s4FinalReadyState.canStart === true, 'All 4 sessions see canStart = true');
    assert(s4FinalReadyState.isAllReady === true, 'All 4 seats are verified Ready');

    // -----------------------------------------------------------------
    // Step 7: Security check - Session 2 cannot start preview
    // -----------------------------------------------------------------
    console.log('\n--- Step 7: Non-host Session 2 attempts to start preview ---');
    const unauthPreview = await emitPromise(session2, 'start_game_preview');
    assert(unauthPreview.success === false, 'Session 2 blocked from starting preview');
    assert(unauthPreview.error.includes('host'), 'Error states host privileges required');

    // -----------------------------------------------------------------
    // Step 8: Host Session 1 starts Table Preview for all 4 sessions
    // -----------------------------------------------------------------
    console.log('\n--- Step 8: Host Session 1 starts Table Preview ---');
    const s2PreviewPromise = waitForMatchingEvent(session2, 'room_state_updated', (s) => s.status === 'table_preview');
    const s3PreviewPromise = waitForMatchingEvent(session3, 'room_state_updated', (s) => s.status === 'table_preview');
    const s4PreviewPromise = waitForMatchingEvent(session4, 'room_state_updated', (s) => s.status === 'table_preview');

    const startPreviewRes = await emitPromise(session1, 'start_game_preview');
    assert(startPreviewRes.success === true, 'Host successfully started table preview');

    const [s2PreviewState, s3PreviewState, s4PreviewState] = await Promise.all([
      s2PreviewPromise,
      s3PreviewPromise,
      s4PreviewPromise,
    ]);

    assert(s2PreviewState.status === 'table_preview', 'Session 2 transitioned to table_preview');
    assert(s3PreviewState.status === 'table_preview', 'Session 3 transitioned to table_preview');
    assert(s4PreviewState.status === 'table_preview', 'Session 4 transitioned to table_preview');

    console.log('\n--- Step 8b: Verify private dealing and authoritative bidding ---');
    const sessions = [session1, session2, session3, session4];
    const privateHands = [null, null, null, null];
    sessions.forEach((client, seatIndex) => {
      client.on('player_hand', ({ hand }) => {
        privateHands[seatIndex] = hand;
      });
    });
    const privateHandPromises = sessions.map((client) =>
      waitForMatchingEvent(client, 'player_hand', ({ hand }) => Array.isArray(hand) && hand.length === 5)
    );

    const firstDealStatePromise = waitForMatchingEvent(
      session1,
      'room_state_updated',
      (state) => state.gameState.stage === 'first_deal'
    );
    const dealRes = await emitPromise(session1, 'deal_cards');
    const firstDealState = await firstDealStatePromise;
    await Promise.all(privateHandPromises);
    assert(dealRes.success === true, 'Host deals cards once');
    privateHands.forEach((hand, seatIndex) => {
      assert(Array.isArray(hand) && hand.length === 5, `Seat ${seatIndex} receives its private 5-card hand`);
    });
    const publicDealState = JSON.stringify(firstDealState);
    assert(
      privateHands.every((hand) => hand.every((card) => !publicDealState.includes(card.id))),
      'Public room state does not expose any dealt card IDs'
    );

    const repeatedDealRes = await emitPromise(session1, 'deal_cards');
    assert(repeatedDealRes.success === false, 'Repeated deal request cannot reshuffle an active game');

    const turnUpdates = [
      waitForMatchingEvent(session1, 'room_state_updated', (state) => state.gameState.currentBidderSeatIndex === 2),
      waitForMatchingEvent(session2, 'room_state_updated', (state) => state.gameState.currentBidderSeatIndex === 2),
      waitForMatchingEvent(session3, 'room_state_updated', (state) => state.gameState.currentBidderSeatIndex === 2),
      waitForMatchingEvent(session4, 'room_state_updated', (state) => state.gameState.currentBidderSeatIndex === 2),
    ];
    const biddingStart = await emitPromise(session1, 'advance_stage');
    assert(biddingStart.success === true, 'Host advances to first bidding stage');
    assert(biddingStart.gameState.currentBidderSeatIndex === 1, 'All clients share the server-selected first bidder');
    assert(
      biddingStart.gameState.biddingTurnDeadlineAt - biddingStart.gameState.serverTime <= 10000 &&
        biddingStart.gameState.biddingTurnDeadlineAt - biddingStart.gameState.serverTime >= 9500,
      'Bidding deadline is a server-authoritative 10-second timestamp'
    );

    const bidAttempts = await Promise.all([
      emitPromise(session2, 'place_bid', { amount: 5 }),
      emitPromise(session2, 'place_bid', { amount: 5 }),
    ]);
    assert(
      bidAttempts.filter((response) => response.success).length === 1,
      'Simultaneous duplicate bids accept exactly one action'
    );
    assert(
      bidAttempts.filter((response) => !response.success).length === 1,
      'Duplicate bid is rejected after the active turn advances'
    );
    const [state1, state2, state3, state4] = await Promise.all(turnUpdates);
    assert(
      [state1, state2, state3, state4].every((state) => state.gameState.currentBidderSeatIndex === 2),
      'All four sessions converge on the same active bidding turn'
    );

    const fifthSession = createSessionClient();
    await waitForConnect(fifthSession);
    const overCapacityRes = await emitPromise(fifthSession, 'join_room', {
      roomCode,
      playerName: 'Fifth Player',
    });
    assert(overCapacityRes.success === false, 'Room rejects a fifth player');
    fifthSession.disconnect();

    // -----------------------------------------------------------------
    // Step 9: Session 3 (Charlie) Disconnects and Reconnects to Seat 2
    // -----------------------------------------------------------------
    console.log('\n--- Step 9: Session 3 disconnects and reconnects to Seat 2 ---');
    const s3Token = s3Res.reconnectToken;
    const s1DisconnectNotice = waitForMatchingEvent(
      session1,
      'room_state_updated',
      (s) => s.seats[2] && s.seats[2].isConnected === false
    );

    session3.disconnect();
    const stateDuringDrop = await s1DisconnectNotice;
    assert(stateDuringDrop.seats[2].isConnected === false, 'Session 1 sees Seat 2 (Charlie) marked as disconnected (holding seat)');

    // Session 3 reconnects with a fresh socket connection using s3Token
    const session3Reconnected = createSessionClient();
    await waitForConnect(session3Reconnected);

    const s1ReconnectNotice = waitForMatchingEvent(
      session1,
      'room_state_updated',
      (s) => s.seats[2] && s.seats[2].isConnected === true
    );

    const reconRes = await emitPromise(session3Reconnected, 'reconnect_player', {
      roomCode,
      reconnectToken: s3Token,
    });
    assert(reconRes.success === true, 'Session 3 successfully reconnected');
    assert(reconRes.player.seatIndex === 2, 'Session 3 reclaimed original Seat 2 (North)');

    const stateAfterRecon = await s1ReconnectNotice;
    assert(stateAfterRecon.seats[2].isConnected === true, 'Seat 2 is restored to Connected across room');

    // -----------------------------------------------------------------
    // Step 10: Multiple independent rooms simultaneously
    // -----------------------------------------------------------------
    console.log('\n--- Step 10: Simultaneous second room (Room B) ---');
    const sessionB1 = createSessionClient();
    const sessionB2 = createSessionClient();
    await Promise.all([waitForConnect(sessionB1), waitForConnect(sessionB2)]);

    const roomBRes = await emitPromise(sessionB1, 'create_room', { playerName: 'Host B' });
    assert(roomBRes.success === true, 'Room B created');
    assert(roomBRes.roomCode !== roomCode, 'Room B has distinct unique room code');

    const joinBRes = await emitPromise(sessionB2, 'join_room', {
      roomCode: roomBRes.roomCode,
      playerName: 'Player B2',
    });
    assert(joinBRes.success === true, 'Player B2 joined Room B');
    assert(joinBRes.player.seatIndex === 1, 'Player B2 assigned to Seat 1 in Room B');

    // Verify Room A is completely untouched
    const roomA = roomManager.getRoom(roomCode);
    assert(roomA.getPlayerCount() === 4, 'Room A still has 4 seated players');
    assert(roomManager.rooms.size === 2, 'RoomManager maintains 2 active independent rooms');

    // Clean up
    session1.disconnect();
    session2.disconnect();
    session3Reconnected.disconnect();
    session4.disconnect();
    sessionB1.disconnect();
    sessionB2.disconnect();

    console.log('\n===============================================================');
    console.log(`  INTEGRATION RESULTS: ${passedCount} passed, ${failedCount} failed`);
    console.log('  FOUR SEPARATE SESSIONS MULTIPLAYER VERIFIED SUCCESSFULLY!');
    console.log('===============================================================\n');
  } finally {
    testServer.close();
  }
}

runFourSessionsTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Integration test failed with error:', err);
    process.exit(1);
  });
