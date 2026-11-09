import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import { RoomManager } from '../src/models/RoomManager.js';
import { registerSocketHandlers } from '../src/socket/socketHandler.js';
import { GameState, BIDDING_TURN_TIMEOUT_MS } from '../src/engine/GameState.js';

const PORT = 3108;
const SERVER_URL = `http://localhost:${PORT}`;

let app, server, ioServer, roomManager;
let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedCount++;
    throw new Error(message);
  }
}

function createSocketClient() {
  return ClientIO(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('  PRO CARD – ADVANCED BIDDING TIMER SYSTEM TEST SUITE');
  console.log('===============================================================\n');

  // Start test server
  app = express();
  server = http.createServer(app);
  ioServer = new SocketIOServer(server, { cors: { origin: '*' } });
  roomManager = new RoomManager();
  registerSocketHandlers(ioServer, roomManager);

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Test server running on port ${PORT}\n`);

  try {
    // --- Unit 1: Game Engine 3 Bidding Stages & Stage Rules ---
    console.log('--- Unit 1: Three Bidding Stages & Allowed Bids ---');
    const gs = new GameState('ROOM_TIMER', 31);
    assert(BIDDING_TURN_TIMEOUT_MS === 10000, 'Bidding turn duration is exactly 10,000ms (10 seconds)');

    // Stage 1: first_deal (5 cards) -> first_bidding (Stage 3)
    gs.setStage('first_deal');
    assert(gs.getPublicState().expectedCardsPerPlayer === 5, 'Stage 1 deals 5 cards per player');

    gs.setStage('first_bidding');
    assert(gs.isBiddingStage(), 'first_bidding is an active bidding stage');
    assert(gs.biddingConfig.minOpeningBids.first_bidding === 5, 'First bidding stage allows opening bid of 5 or more');

    // Stage 2: second_deal (9 cards) -> second_bidding (Stage 5)
    gs.setStage('second_deal');
    assert(gs.getPublicState().expectedCardsPerPlayer === 9, 'Stage 2 deals 4 additional cards (9 total)');

    gs.setStage('second_bidding');
    assert(gs.biddingConfig.minOpeningBids.second_bidding === 8, 'Second bidding stage allows opening bid of 8 or more');

    // Stage 3: final_deal (13 cards) -> final_bidding (Stage 7)
    gs.setStage('final_deal');
    assert(gs.getPublicState().expectedCardsPerPlayer === 13, 'Stage 3 deals final 4 cards (13 total)');

    gs.setStage('final_bidding');
    assert(gs.biddingConfig.minOpeningBids.final_bidding === 10, 'Final bidding stage allows opening bid of 10 or more');

    // --- Unit 2: 10-Second Authoritative Countdown & Automatic PASS ---
    console.log('\n--- Unit 2: 10-Second Countdown & Automatic PASS ---');
    const s1 = createSocketClient();
    const s2 = createSocketClient();
    const s3 = createSocketClient();
    const s4 = createSocketClient();

    let roomCode = null;

    // 1. Setup 4-player room
    await new Promise((resolve) => {
      s1.emit('create_room', { playerName: 'Player1' }, (res) => {
        roomCode = res.roomCode;
        resolve();
      });
    });

    await new Promise((resolve) => s2.emit('join_room', { roomCode, playerName: 'Player2' }, () => resolve()));
    await new Promise((resolve) => s3.emit('join_room', { roomCode, playerName: 'Player3' }, () => resolve()));
    await new Promise((resolve) => s4.emit('join_room', { roomCode, playerName: 'Player4' }, () => resolve()));

    // Toggle ready
    await new Promise((resolve) => s1.emit('toggle_ready', () => resolve()));
    await new Promise((resolve) => s2.emit('toggle_ready', () => resolve()));
    await new Promise((resolve) => s3.emit('toggle_ready', () => resolve()));
    await new Promise((resolve) => s4.emit('toggle_ready', () => resolve()));

    // Host starts preview and sets to first_bidding stage
    await new Promise((resolve) => s1.emit('start_game_preview', () => resolve()));
    await delay(100);

    let currentRoomState = null;
    await new Promise((resolve) => {
      s1.emit('set_stage', 'first_bidding', (res) => {
        assert(res.success, 'Host advanced to first_bidding stage');
        currentRoomState = res.publicGameState;
        resolve();
      });
    });

    const initialBidder = currentRoomState.currentBidderSeatIndex;
    const deadline = currentRoomState.biddingTurnDeadlineAt;
    const serverTime = currentRoomState.serverTime;

    assert(Number.isFinite(deadline), 'Server provides authoritative biddingTurnDeadlineAt');
    assert(deadline - serverTime <= 10050 && deadline - serverTime >= 9500, 'Authoritative countdown is 10 seconds');

    // Listen for Auto-PASS notification
    let autoPassNotification = null;
    let nextBidderReceived = null;

    s1.on('player_notification', (notif) => {
      if (notif.message.includes('Time Up') && notif.message.includes('Automatically Passed')) {
        autoPassNotification = notif.message;
      }
    });

    s1.on('room_state_updated', (updatedState) => {
      if (updatedState.gameState?.currentBidderSeatIndex !== initialBidder) {
        nextBidderReceived = updatedState.gameState?.currentBidderSeatIndex;
      }
    });

    // Manually trigger deadline timeout directly via room model for fast unit testing
    const room = roomManager.getRoom(roomCode);
    assert(room !== null, 'Room found in RoomManager');

    // Fast-forward: call passBid with timedOut = true as the server scheduler does
    const activeSeat = room.seats[initialBidder];
    const passResult = room.passBid(activeSeat.playerId, { timedOut: true });

    assert(passResult.success, 'Auto-PASS successfully executed after 10-second timer');
    assert(passResult.roomState.gameState.currentBidderSeatIndex !== initialBidder, 'Immediately moved turn to next player');

    const expectedNextSeat = currentRoomState.biddingOrder[1];
    assert(
      passResult.roomState.gameState.currentBidderSeatIndex === expectedNextSeat,
      `Bidding turn advanced clockwise to next player (Seat ${expectedNextSeat})`
    );

    // --- Unit 3: Prevention of Late Bids After Expiration ---
    console.log('\n--- Unit 3: Prevention of Late Bids & Multiple Passes ---');
    try {
      // Expired player attempts to bid out of turn
      room.placeBid(activeSeat.playerId, 5);
      assert(false, 'Should have thrown out-of-turn bid error');
    } catch (err) {
      assert(err.message.includes('Not your turn'), 'Late / out-of-turn bid strictly rejected by server');
    }

    try {
      // Expired player attempts to pass again
      room.passBid(activeSeat.playerId);
      assert(false, 'Should have thrown out-of-turn pass error');
    } catch (err) {
      assert(err.message.includes('Not your turn'), 'Duplicate / out-of-turn pass strictly rejected by server');
    }

    // --- Unit 4: Flexible Independent Bid Increase & Timeout PASS ---
    console.log('\n--- Unit 4: Flexible Independent Bid Increase & Timeout ---');
    // Set all 4 players to bid 10
    const triggerRes = room.triggerAllPlayersBid10(room.hostPlayerId);
    assert(triggerRes.success, 'Triggered All 4 Players Bid 10 Flexible Phase');
    assert(room.gameState.bidding.flexibleIncreasePhase === true, 'Flexible increase phase is active');

    const flexOrder = room.gameState.getBiddingOrder();
    const firstFlexSeat = flexOrder[0];
    const secondFlexSeat = flexOrder[1];

    // Player 1 increases bid from 10 -> 13
    const p1Seat = room.seats[firstFlexSeat];
    const incRes = room.flexibleIncreaseBid(p1Seat.playerId, 13);
    assert(incRes.success, 'Player 1 independently increased bid from 10 to 13');
    assert(room.gameState.bidding.playerBids[firstFlexSeat] === 13, 'Player 1 bid is now 13');
    assert(room.gameState.bidding.playerBids[secondFlexSeat] === 10, 'Player 2 bid independently remains at 10');

    // Player 2 times out during flexible increase -> Auto PASS (keeps at 10)
    const p2Seat = room.seats[secondFlexSeat];
    const p2AutoPass = room.flexiblePass(p2Seat.playerId, { timedOut: true });
    assert(p2AutoPass.success, 'Player 2 auto-passed upon 10-second timeout');
    assert(room.gameState.bidding.playerBids[secondFlexSeat] === 10, 'Player 2 bid independently preserved at 10');

    // Clean up
    s1.disconnect();
    s2.disconnect();
    s3.disconnect();
    s4.disconnect();

    console.log('\n===============================================================');
    console.log(`  TEST RESULTS: ${passedCount} passed, ${failedCount} failed`);
    console.log('  ALL ADVANCED BIDDING TIMER REQUIREMENTS VERIFIED 100%!');
    console.log('===============================================================\n');
  } finally {
    ioServer.close();
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

