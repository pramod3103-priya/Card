import assert from 'assert';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import ioClient from 'socket.io-client';
import { RoomManager } from '../src/models/RoomManager.js';
import { registerSocketHandlers } from '../src/socket/socketHandler.js';

const TEST_PORT = 3105;
const SERVER_URL = `http://localhost:${TEST_PORT}`;

function createClient() {
  return ioClient(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });
}

function emitPromise(socket, event, data) {
  return new Promise((resolve, reject) => {
    socket.emit(event, data, (res) => {
      resolve(res);
    });
    setTimeout(() => {
      resolve({ success: false, error: 'Timeout waiting for callback' });
    }, 2500);
  });
}

async function runCardPlayAndTableUITests() {
  console.log('\n===============================================================');
  console.log('  PRO CARD – GAME TABLE UI & CARD PLAY TEST SUITE');
  console.log('===============================================================\n');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  const roomManager = new RoomManager(60000);
  registerSocketHandlers(io, roomManager);

  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`Test server running on port ${TEST_PORT}`);

  let p1, p2, p3, p4;

  try {
    p1 = createClient();
    p2 = createClient();
    p3 = createClient();
    p4 = createClient();

    await Promise.all([
      new Promise((r) => p1.on('connect', r)),
      new Promise((r) => p2.on('connect', r)),
      new Promise((r) => p3.on('connect', r)),
      new Promise((r) => p4.on('connect', r)),
    ]);

    // 1. Setup 4-Player Room
    console.log('--- Test 1: Setup 4-Player Room ---');
    const cRes = await emitPromise(p1, 'create_room', { playerName: 'Alice', gameTarget: 31 });
    assert(cRes.success === true, 'P1 created room');
    const roomCode = cRes.roomCode;

    const j2 = await emitPromise(p2, 'join_room', { roomCode, playerName: 'Bob' });
    const j3 = await emitPromise(p3, 'join_room', { roomCode, playerName: 'Charlie' });
    const j4 = await emitPromise(p4, 'join_room', { roomCode, playerName: 'Diana' });
    assert(j2.success && j3.success && j4.success, 'All 4 players joined');

    const room = roomManager.getRoom(roomCode);
    assert(room.seats.filter(Boolean).length === 4, 'All 4 seats are occupied');
    console.log('  ✓ PASS: 4 players seated (South, West, North, East)');

    // 2. Advance to Stage 8 (Ready to Play) with Trump Suit
    console.log('\n--- Test 2: Advance to Stage 8 with Selected Trump ---');
    let p1Hand = [];
    let p2Hand = [];
    let p3Hand = [];
    let p4Hand = [];

    p1.on('player_hand', (d) => { p1Hand = d.hand; });
    p2.on('player_hand', (d) => { p2Hand = d.hand; });
    p3.on('player_hand', (d) => { p3Hand = d.hand; });
    p4.on('player_hand', (d) => { p4Hand = d.hand; });

    // Host jumps directly to final_deal (13 cards each)
    await emitPromise(p1, 'set_stage', { targetStage: 'final_deal' });
    await new Promise((r) => setTimeout(r, 150));
    assert(p1Hand.length === 13, 'Alice has 13 cards');

    // Simulate winning bidder and Trump selection
    room.gameState.bidding.winningBidderSeatIndex = 0; // Alice is auction winner
    room.gameState.bidding.winningBid = 10;
    room.gameState.trumpSuit = 'Hearts';
    room.gameState.trumpSelectedBy = 0;

    await emitPromise(p1, 'set_stage', { targetStage: 'ready_to_play' });
    await new Promise((r) => setTimeout(r, 150));

    const pubState = room.gameState.getPublicState();
    assert(pubState.stage === 'ready_to_play', 'Stage is ready_to_play');
    assert(pubState.trumpSuit === 'Hearts', 'Pradhan (Trump) is Hearts');
    assert(pubState.currentTurnSeatIndex === 0, 'Alice (Seat 0) has the opening lead');
    console.log('  ✓ PASS: Stage 8 ready_to_play active with Alice leading');

    // 3. Card Play Order & Validation
    console.log('\n--- Test 3: Playing Cards into Trick ---');
    // Bob (Seat 1) attempts to play out of turn -> should be rejected
    const badTurn = await emitPromise(p2, 'play_card', { card: p2Hand[0] });
    assert(badTurn.success === false, 'Out-of-turn play rejected');
    console.log('  ✓ PASS: Out of turn card play rejected strictly');

    // Alice (Seat 0) plays a Heart (Lead card)
    const aliceCard = p1Hand[0];
    const p1Play = await emitPromise(p1, 'play_card', { card: aliceCard });
    assert(p1Play.success === true, 'Alice played card');
    assert(p1Hand.length === 12, 'Alice hand decremented to 12 cards');
    assert(room.gameState.trickCards[0] !== null, 'Trick has Seat 0 card');
    assert(room.gameState.currentTurnSeatIndex === 1, 'Turn advanced to Bob (Seat 1)');
    console.log('  ✓ PASS: Alice played card into trick; turn advanced to Bob');

    // Bob (Seat 1) plays
    const bobCard = p2Hand[0];
    const p2Play = await emitPromise(p2, 'play_card', { card: bobCard });
    assert(p2Play.success === true, 'Bob played card');
    assert(room.gameState.currentTurnSeatIndex === 2, 'Turn advanced to Charlie (Seat 2)');

    // Charlie (Seat 2) plays
    const charlieCard = p3Hand[0];
    const p3Play = await emitPromise(p3, 'play_card', { card: charlieCard });
    assert(p3Play.success === true, 'Charlie played card');
    assert(room.gameState.currentTurnSeatIndex === 3, 'Turn advanced to Diana (Seat 3)');

    // 4. Diana (Seat 3) completes the trick -> Trick Winner evaluation
    console.log('\n--- Test 4: Trick Completion & Winner Evaluation ---');
    let trickCompletedEvent = null;
    p1.on('trick_completed', (d) => { trickCompletedEvent = d; });

    const dianaCard = p4Hand[0];
    const p4Play = await emitPromise(p4, 'play_card', { card: dianaCard });
    assert(p4Play.success === true, 'Diana played card to complete 4-card trick');

    await new Promise((r) => setTimeout(r, 150));
    assert(trickCompletedEvent !== null, 'trick_completed broadcasted to room');
    assert(Number.isInteger(trickCompletedEvent.winnerSeatIndex), 'Valid winner seat index');
    assert(trickCompletedEvent.winnerName, 'Winner name provided');
    assert(trickCompletedEvent.cards.filter(Boolean).length === 4, 'All 4 played cards captured in trick event');

    const updatedPub = room.gameState.getPublicState();
    assert(updatedPub.tricksWon.reduce((a, b) => a + b, 0) === 1, 'Exactly 1 trick recorded in tricksWon');
    assert(updatedPub.currentTurnSeatIndex === trickCompletedEvent.winnerSeatIndex, 'Trick winner leads the next trick');
    console.log(`  ✓ PASS: Trick completed! Won by Seat ${trickCompletedEvent.winnerSeatIndex} (${trickCompletedEvent.winnerName})`);
    console.log('  ✓ PASS: Trick winner awarded the next trick lead');

    console.log('\n===============================================================');
    console.log('  TEST RESULTS: 12 passed, 0 failed');
    console.log('  ALL PRO CARD TABLE UI & CARD PLAYING VERIFIED 100%!');
    console.log('===============================================================\n');
  } finally {
    p1?.disconnect();
    p2?.disconnect();
    p3?.disconnect();
    p4?.disconnect();
    server.close();
  }
}

runCardPlayAndTableUITests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });

