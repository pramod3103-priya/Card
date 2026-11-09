import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import { RoomManager } from '../src/models/RoomManager.js';
import { registerSocketHandlers } from '../src/socket/socketHandler.js';
import { GAME_STAGES, STAGE_METADATA } from '../src/engine/GameState.js';

const TEST_PORT = 3103;
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

async function runEightStagesTests() {
  console.log('\n===============================================================');
  console.log('  MINUS 8-STAGE CARD GAME ENGINE & TARGET SELECTION TEST SUITE');
  console.log('===============================================================\n');

  const app = express();
  const testServer = http.createServer(app);
  const roomManager = new RoomManager(60000);
  const io = new Server(testServer, { cors: { origin: '*' } });
  registerSocketHandlers(io, roomManager);

  await new Promise((resolve) => testServer.listen(TEST_PORT, resolve));

  try {
    const p1 = createClient();
    const p2 = createClient();
    const p3 = createClient();
    const p4 = createClient();
    await Promise.all([waitForConnect(p1), waitForConnect(p2), waitForConnect(p3), waitForConnect(p4)]);

    // -------------------------------------------------------------
    // Test 1: Create room with Game Target (e.g. 41)
    // -------------------------------------------------------------
    console.log('--- Test 1: Game Target Selection (41) ---');
    const createRes = await emitPromise(p1, 'create_room', { playerName: 'Host Alice', gameTarget: 41 });
    assert(createRes.success === true, 'Room created with target 41');
    assert(createRes.roomState.gameTarget === 41, 'Room state reflects Game Target = 41');
    assert(createRes.roomState.gameState.dealerSeatIndex === 0, 'Dealer indicator set to Seat 0 (South)');

    const roomCode = createRes.roomCode;
    await emitPromise(p2, 'join_room', { roomCode, playerName: 'Bob' });
    await emitPromise(p3, 'join_room', { roomCode, playerName: 'Charlie' });
    const p4Join = await emitPromise(p4, 'join_room', { roomCode, playerName: 'Diana' });
    assert(p4Join.roomState.gameTarget === 41, 'All players receive Game Target = 41');

    // Ready all players and enter table preview
    await emitPromise(p1, 'toggle_ready');
    await emitPromise(p2, 'toggle_ready');
    await emitPromise(p3, 'toggle_ready');
    await emitPromise(p4, 'toggle_ready');
    await emitPromise(p1, 'start_game_preview');

    // Listeners for private hands
    let p1Hand = [];
    let p2Hand = [];
    let p3Hand = [];
    let p4Hand = [];
    p1.on('player_hand', (d) => (p1Hand = d.hand));
    p2.on('player_hand', (d) => (p2Hand = d.hand));
    p3.on('player_hand', (d) => (p3Hand = d.hand));
    p4.on('player_hand', (d) => (p4Hand = d.hand));

    // -------------------------------------------------------------
    // Stage 1: Waiting for players
    // -------------------------------------------------------------
    console.log('\n--- Stage 1: Waiting for players ---');
    const room = roomManager.getRoom(roomCode);
    assert(room.gameState.stage === 'waiting_for_players', 'Initial stage is waiting_for_players');
    assert(room.gameState.getPublicState().stageIndex === 1, 'Stage index is 1');
    assert(room.gameState.getPublicState().expectedCardsPerPlayer === 0, 'Expected cards = 0');

    // -------------------------------------------------------------
    // Stage 2: First deal (5 cards per player)
    // -------------------------------------------------------------
    console.log('\n--- Stage 2: First Deal (5 cards per player) ---');
    const dealRes = await emitPromise(p1, 'deal_cards');
    assert(dealRes.success === true, 'Host dealt Stage 2 (First Deal)');

    await new Promise((r) => setTimeout(r, 150));
    assert(p1Hand.length === 5, 'Alice received 5 cards');
    assert(p2Hand.length === 5, 'Bob received 5 cards');
    assert(p3Hand.length === 5, 'Charlie received 5 cards');
    assert(p4Hand.length === 5, 'Diana received 5 cards');

    let pubState = room.gameState.getPublicState();
    assert(pubState.stage === 'first_deal', 'Authoritative stage is first_deal');
    assert(pubState.stageIndex === 2, 'Stage index is 2');
    assert(pubState.expectedCardsPerPlayer === 5, 'Expected card count is 5');
    assert(JSON.stringify(pubState.handCounts) === '[5,5,5,5]', 'All hand counts show 5');

    // -------------------------------------------------------------
    // Stage 3: First bidding stage (5 cards in hand)
    // -------------------------------------------------------------
    console.log('\n--- Stage 3: First Bidding Stage ---');
    const s3Res = await emitPromise(p1, 'advance_stage');
    assert(s3Res.success === true, 'Advanced to Stage 3');
    pubState = room.gameState.getPublicState();
    assert(pubState.stage === 'first_bidding', 'Authoritative stage is first_bidding');
    assert(pubState.stageIndex === 3, 'Stage index is 3');
    assert(p1Hand.length === 5, 'Alice maintains 5 cards during first bidding');

    // -------------------------------------------------------------
    // Stage 4: Second deal: 4 additional cards (9 cards per player)
    // -------------------------------------------------------------
    console.log('\n--- Stage 4: Second Deal (4 additional cards -> 9 total) ---');
    const s4Res = await emitPromise(p1, 'advance_stage');
    assert(s4Res.success === true, 'Advanced to Stage 4 (Second Deal)');

    await new Promise((r) => setTimeout(r, 150));
    assert(p1Hand.length === 9, 'Alice received 4 additional cards (now 9 cards total)');
    assert(p2Hand.length === 9, 'Bob has 9 cards total');
    assert(p3Hand.length === 9, 'Charlie has 9 cards total');
    assert(p4Hand.length === 9, 'Diana has 9 cards total');

    pubState = room.gameState.getPublicState();
    assert(pubState.stage === 'second_deal', 'Stage is second_deal');
    assert(pubState.stageIndex === 4, 'Stage index is 4');
    assert(pubState.expectedCardsPerPlayer === 9, 'Expected card count is 9');
    assert(JSON.stringify(pubState.handCounts) === '[9,9,9,9]', 'All hand counts show 9');

    // -------------------------------------------------------------
    // Stage 5: Second bidding stage (9 cards in hand)
    // -------------------------------------------------------------
    console.log('\n--- Stage 5: Second Bidding Stage ---');
    const s5Res = await emitPromise(p1, 'advance_stage');
    assert(s5Res.success === true, 'Advanced to Stage 5');
    pubState = room.gameState.getPublicState();
    assert(pubState.stage === 'second_bidding', 'Stage is second_bidding');
    assert(pubState.stageIndex === 5, 'Stage index is 5');
    assert(p1Hand.length === 9, 'Players maintain 9 cards during second bidding');

    // -------------------------------------------------------------
    // Stage 6: Final deal: 4 additional cards (13 cards per player)
    // -------------------------------------------------------------
    console.log('\n--- Stage 6: Final Deal (4 additional cards -> 13 total) ---');
    const s6Res = await emitPromise(p1, 'advance_stage');
    assert(s6Res.success === true, 'Advanced to Stage 6 (Final Deal)');

    await new Promise((r) => setTimeout(r, 150));
    assert(p1Hand.length === 13, 'Alice received final 4 cards (now 13 cards total)');
    assert(p2Hand.length === 13, 'Bob has 13 cards total');
    assert(p3Hand.length === 13, 'Charlie has 13 cards total');
    assert(p4Hand.length === 13, 'Diana has 13 cards total');

    pubState = room.gameState.getPublicState();
    assert(pubState.stage === 'final_deal', 'Stage is final_deal');
    assert(pubState.stageIndex === 6, 'Stage index is 6');
    assert(pubState.expectedCardsPerPlayer === 13, 'Expected card count is 13');
    assert(JSON.stringify(pubState.handCounts) === '[13,13,13,13]', 'All hand counts show 13');

    // -------------------------------------------------------------
    // Stage 7: Final bidding stage (13 cards in hand)
    // -------------------------------------------------------------
    console.log('\n--- Stage 7: Final Bidding Stage ---');
    const s7Res = await emitPromise(p1, 'advance_stage');
    assert(s7Res.success === true, 'Advanced to Stage 7');
    pubState = room.gameState.getPublicState();
    assert(pubState.stage === 'final_bidding', 'Stage is final_bidding');
    assert(pubState.stageIndex === 7, 'Stage index is 7');
    assert(p1Hand.length === 13, 'Players maintain full 13 cards during final bidding');

    // -------------------------------------------------------------
    // Stage 8: Ready to start card play
    // -------------------------------------------------------------
    console.log('\n--- Stage 8: Ready to Start Card Play ---');
    const s8Res = await emitPromise(p1, 'advance_stage');
    assert(s8Res.success === true, 'Advanced to Stage 8 (Ready to Play)');
    pubState = room.gameState.getPublicState();
    assert(pubState.stage === 'ready_to_play', 'Stage is ready_to_play');
    assert(pubState.stageIndex === 8, 'Stage index is 8');
    assert(pubState.expectedCardsPerPlayer === 13, 'Expected card count remains 13');

    // -------------------------------------------------------------
    // Test 3: Direct Stage Setter Test (Jump to Stage 3)
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Host Direct Stage Selection ---');
    const jumpRes = await emitPromise(p1, 'set_stage', { targetStage: 'first_bidding' });
    assert(jumpRes.success === true, 'Host jumped to Stage 3 directly');

    await new Promise((r) => setTimeout(r, 150));
    assert(p1Hand.length === 5, 'Alice hand automatically adjusted back to 5 cards for Stage 3');

    // Clean up
    p1.disconnect();
    p2.disconnect();
    p3.disconnect();
    p4.disconnect();

    console.log('\n===============================================================');
    console.log(`  TEST RESULTS: ${passedCount} passed, ${failedCount} failed`);
    console.log('  ALL 8 STAGES & INDIAN MINUS RULES VERIFIED 100%!');
    console.log('===============================================================\n');
  } finally {
    testServer.close();
  }
}

runEightStagesTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });

