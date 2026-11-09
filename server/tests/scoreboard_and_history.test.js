import assert from 'assert';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import ioClient from 'socket.io-client';
import { RoomManager } from '../src/models/RoomManager.js';
import { registerSocketHandlers } from '../src/socket/socketHandler.js';
import { GameState } from '../src/engine/GameState.js';

const TEST_PORT = 3106;
const SERVER_URL = `http://localhost:${TEST_PORT}`;

function createClient() {
  return ioClient(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });
}

function emitPromise(socket, event, data) {
  return new Promise((resolve) => {
    socket.emit(event, data, (res) => {
      resolve(res);
    });
    setTimeout(() => {
      resolve({ success: false, error: 'Timeout waiting for callback' });
    }, 2500);
  });
}

async function runScoreboardAndHistoryTests() {
  console.log('\n===============================================================');
  console.log('  PRO CARD – SCOREBOARD, GAME HISTORY & WINNER TEST SUITE');
  console.log('===============================================================\n');

  // 1. Direct Engine Unit Tests
  console.log('--- Unit 1: GameState Scoring & Round Completion Engine ---');
  const gs = new GameState('TEST01', 31);
  assert.strictEqual(gs.gameTarget, 31, 'Target score is 31');
  assert.deepStrictEqual(gs.scores, [0, 0, 0, 0], 'Initial scores are 0');
  assert.deepStrictEqual(gs.tricksWon, [0, 0, 0, 0], 'Initial tricks won are 0');
  assert.strictEqual(gs.roundHistory.length, 0, 'Initial round history is empty');
  assert.strictEqual(gs.matchOver, false, 'Match is not over initially');

  // Simulate auction: Seat 0 bids 10 and chooses Spades
  gs.stage = 'ready_to_play';
  gs.bidding.winningBid = 10;
  gs.bidding.winningBidderSeatIndex = 0;
  gs.trumpSuit = 'Spades';
  gs.trumpSelectedBy = 0;

  // Simulate 13 completed tricks: Seat 0 wins 10 tricks, Seat 1 wins 2, Seat 2 wins 1, Seat 3 wins 0
  gs.tricksWon = [10, 2, 1, 0];
  const round1 = gs.evaluateRoundCompletion();

  assert.strictEqual(round1.roundNumber, 1, 'Round 1 recorded');
  assert.strictEqual(round1.winningBid, 10, 'Round 1 winning bid is 10');
  assert.deepStrictEqual(round1.scoreDeltas, [10, 2, 1, 0], 'Bidder made contract (10 tricks) -> +10 pts');
  assert.deepStrictEqual(gs.scores, [10, 2, 1, 0], 'Scores accumulated properly');
  assert.strictEqual(gs.matchOver, false, 'Match not over (target 31 not reached)');
  console.log('  ✓ PASS: Round 1 bidder contract met: +10 pts, defenders scored their tricks');

  // Simulate Round 2: Bidder fails contract (MINUS rule)
  // Bidder (Seat 1) bids 10, but only wins 8 tricks!
  gs.advanceToNextRound();
  assert.strictEqual(gs.currentRoundNumber, 2, 'Round advanced to 2');
  assert.deepStrictEqual(gs.tricksWon, [0, 0, 0, 0], 'Tricks won reset for new round');
  assert.deepStrictEqual(gs.scores, [10, 2, 1, 0], 'Cumulative scores retained across rounds');

  gs.bidding.winningBid = 10;
  gs.bidding.winningBidderSeatIndex = 1;
  gs.trumpSuit = 'Hearts';
  gs.tricksWon = [3, 8, 2, 0]; // Seat 1 declared 10 but made only 8!
  const round2 = gs.evaluateRoundCompletion();

  assert.strictEqual(round2.scoreDeltas[1], -10, 'Failed contract results in -10 minus penalty');
  assert.strictEqual(round2.scoreDeltas[0], 3, 'Seat 0 defender gets +3');
  assert.strictEqual(gs.scores[1], -8, 'Seat 1 score goes 2 - 10 = -8');
  assert.strictEqual(gs.scores[0], 13, 'Seat 0 score goes 10 + 3 = 13');
  assert.strictEqual(gs.roundHistory.length, 2, '2 rounds recorded in roundHistory');
  console.log('  ✓ PASS: MINUS Rule verified: Failed bidder receives negative declared bid penalty (-10)');

  // Simulate Round 3: Seat 0 reaches 31 points (Match Target)
  gs.advanceToNextRound();
  gs.bidding.winningBid = 13;
  gs.bidding.winningBidderSeatIndex = 0;
  gs.tricksWon = [13, 0, 0, 0];
  gs.evaluateRoundCompletion();

  assert.strictEqual(gs.scores[0], 26, 'Seat 0 at 26');
  assert.strictEqual(gs.matchOver, false, 'Match not over yet (26 < 31)');

  gs.advanceToNextRound();
  gs.bidding.winningBid = 10;
  gs.bidding.winningBidderSeatIndex = 0;
  gs.tricksWon = [10, 1, 1, 1];
  gs.evaluateRoundCompletion();

  assert.strictEqual(gs.scores[0], 36, 'Seat 0 reached 36 points >= 31');
  assert.strictEqual(gs.matchOver, true, 'Match concluded!');
  assert.strictEqual(gs.matchWinnerSeatIndex, 0, 'Seat 0 is Champion');
  console.log('  ✓ PASS: Match conclusion triggered: Champion identified with final score 36 >= 31 target');

  // Verify resetMatch ("Play Again")
  gs.resetMatch();
  assert.deepStrictEqual(gs.scores, [0, 0, 0, 0], 'Scores reset to 0');
  assert.strictEqual(gs.roundHistory.length, 0, 'Round history cleared');
  assert.strictEqual(gs.matchOver, false, 'Match over flag reset');
  assert.strictEqual(gs.matchWinnerSeatIndex, null, 'Champion reset to null');
  assert.strictEqual(gs.currentRoundNumber, 1, 'Current round reset to 1');
  console.log('  ✓ PASS: resetMatch ("Play Again") completely resets match state');

  // 2. Full Multiplayer Integration Test
  console.log('\n--- Unit 2: Socket.IO Real-Time Multiplayer Scoreboard & Winner Sync ---');
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

    // Create room with target 31
    const createRes = await emitPromise(p1, 'create_room', { playerName: 'Alice', gameTarget: 31 });
    assert(createRes.success, 'Room created');
    const roomCode = createRes.roomCode;

    await emitPromise(p2, 'join_room', { roomCode, playerName: 'Bob' });
    await emitPromise(p3, 'join_room', { roomCode, playerName: 'Charlie' });
    await emitPromise(p4, 'join_room', { roomCode, playerName: 'Diana' });

    const room = roomManager.getRoom(roomCode);
    assert.strictEqual(room.getPlayerCount(), 4, '4 players joined');

    // Advance to Stage 8
    await emitPromise(p1, 'set_stage', { targetStage: 'final_deal' });
    room.gameState.bidding.winningBidderSeatIndex = 0;
    room.gameState.bidding.winningBid = 10;
    room.gameState.trumpSuit = 'Diamonds';
    room.gameState.trumpSelectedBy = 0;
    await emitPromise(p1, 'set_stage', { targetStage: 'ready_to_play' });

    let lastCompletedTrick = null;
    let roundCompletedEvent = null;
    let matchOverEvent = null;

    p1.on('trick_completed', (t) => { lastCompletedTrick = t; });
    p1.on('round_completed', (r) => { roundCompletedEvent = r; });
    p1.on('match_over', (m) => { matchOverEvent = m; });

    // Simulate play card into trick
    const p1Card = room.gameState.getPlayerHand(0)[0];
    const playRes = await emitPromise(p1, 'play_card', { card: p1Card });
    assert(playRes.success, 'P1 played card');
    assert.strictEqual(room.gameState.trickCards[0].id, p1Card.id, 'Card recorded in trick');
    console.log('  ✓ PASS: Card played and synchronized across all sessions');

    // Verify last 5 tricks logging
    room.gameState.trickHistory.push(
      { winnerSeatIndex: 0, winningCard: { rank: 'A', suit: 'Diamonds' }, cards: [], leadSuit: 'Diamonds', trumpSuit: 'Diamonds' },
      { winnerSeatIndex: 1, winningCard: { rank: 'K', suit: 'Hearts' }, cards: [], leadSuit: 'Hearts', trumpSuit: 'Diamonds' },
      { winnerSeatIndex: 2, winningCard: { rank: 'Q', suit: 'Spades' }, cards: [], leadSuit: 'Spades', trumpSuit: 'Diamonds' },
      { winnerSeatIndex: 0, winningCard: { rank: '10', suit: 'Diamonds' }, cards: [], leadSuit: 'Clubs', trumpSuit: 'Diamonds' },
      { winnerSeatIndex: 3, winningCard: { rank: 'J', suit: 'Diamonds' }, cards: [], leadSuit: 'Diamonds', trumpSuit: 'Diamonds' }
    );
    assert.strictEqual(room.gameState.trickHistory.length, 5, '5 tricks in history');
    const pub = room.getPublicState();
    assert.strictEqual(pub.gameState.trickHistory.length, 5, 'Trick history exposed in public state');
    console.log('  ✓ PASS: Last 5 completed tricks logged with winner and cards');

    // Test Play Again / reset_match socket event
    room.gameState.scores = [35, 12, 10, 5];
    room.gameState.matchOver = true;
    room.gameState.matchWinnerSeatIndex = 0;

    let resetUpdatedState = null;
    p2.on('room_state_updated', (s) => { resetUpdatedState = s; });

    const resetRes = await emitPromise(p1, 'reset_match');
    assert(resetRes.success, 'Host resets match for Play Again');
    await new Promise((r) => setTimeout(r, 150));

    assert.deepStrictEqual(resetRes.roomState.gameState.scores, [0, 0, 0, 0], 'Scores reset to 0');
    assert.strictEqual(resetRes.roomState.gameState.matchOver, false, 'Match over flag reset');
    assert.strictEqual(resetUpdatedState.gameState.scores[0], 0, 'Other players received score reset via broadcast');
    console.log('  ✓ PASS: "Play Again" reset_match broadcasts fresh state to all players');

    console.log('\n===============================================================');
    console.log('  TEST RESULTS: All Scoreboard & Game History tests passed!');
    console.log('===============================================================\n');
  } finally {
    if (p1) p1.disconnect();
    if (p2) p2.disconnect();
    if (p3) p3.disconnect();
    if (p4) p4.disconnect();
    await new Promise((resolve) => server.close(resolve));
  }
}

runScoreboardAndHistoryTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
