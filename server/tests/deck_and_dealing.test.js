import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import { createDeck, shuffleDeck, dealHands, sortHand, SUITS, RANKS } from '../src/engine/Deck.js';
import { GameState } from '../src/engine/GameState.js';
import { RoomManager } from '../src/models/RoomManager.js';
import { registerSocketHandlers } from '../src/socket/socketHandler.js';

const TEST_PORT = 3102;
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

async function runDeckAndDealingTests() {
  console.log('\n===============================================================');
  console.log('  MINUS CARD ENGINE & AUTHORITATIVE DEALING TEST SUITE');
  console.log('===============================================================\n');

  // -----------------------------------------------------------------
  // 1. Standard 52-Card Deck Creation Unit Tests
  // -----------------------------------------------------------------
  console.log('--- Unit 1: 52-Card Deck Specification ---');
  const deck = createDeck();
  assert(deck.length === 52, 'Deck contains exactly 52 cards');

  // Verify all 4 suits exist
  const foundSuits = new Set(deck.map((c) => c.suit));
  assert(foundSuits.size === 4, 'Deck has exactly 4 suits');
  assert(SUITS.every((s) => foundSuits.has(s)), 'Suits are Hearts, Diamonds, Clubs, Spades');

  // Verify each suit has all 13 ranks
  for (const suit of SUITS) {
    const suitCards = deck.filter((c) => c.suit === suit);
    assert(suitCards.length === 13, `Suit ${suit} contains exactly 13 cards`);
    const suitRanks = new Set(suitCards.map((c) => c.rank));
    assert(RANKS.every((r) => suitRanks.has(r)), `Suit ${suit} contains all ranks 2..A`);
  }

  // Verify card IDs are unique
  const cardIds = new Set(deck.map((c) => c.id));
  assert(cardIds.size === 52, 'All 52 card IDs are unique (e.g. S-A, H-K, D-10, C-2)');

  // -----------------------------------------------------------------
  // 2. Fisher-Yates Shuffle Unit Tests
  // -----------------------------------------------------------------
  console.log('\n--- Unit 2: Cryptographic Shuffle Algorithm ---');
  const shuffled = shuffleDeck(deck);
  assert(shuffled.length === 52, 'Shuffled deck maintains 52 cards');
  assert(new Set(shuffled.map((c) => c.id)).size === 52, 'No cards lost or duplicated during shuffle');

  // Ensure permutation difference
  const isDifferentOrder = shuffled.some((c, idx) => c.id !== deck[idx].id);
  assert(isDifferentOrder, 'Shuffled deck produces randomized card order');

  // -----------------------------------------------------------------
  // 3. 4-Player Dealing Unit Tests
  // -----------------------------------------------------------------
  console.log('\n--- Unit 3: 4-Player Hand Dealing (13 Cards Each) ---');
  const hands = dealHands(shuffled);
  assert(hands.length === 4, 'Exactly 4 hands are dealt');
  for (let i = 0; i < 4; i++) {
    assert(hands[i].length === 13, `Seat ${i} received exactly 13 cards`);
  }

  // Ensure zero overlap between hands
  const allDealtCards = new Set();
  for (let i = 0; i < 4; i++) {
    for (const card of hands[i]) {
      assert(!allDealtCards.has(card.id), `Card ${card.id} is uniquely dealt to only one hand`);
      allDealtCards.add(card.id);
    }
  }
  assert(allDealtCards.size === 52, 'All 52 cards cleanly distributed across the 4 players');

  // -----------------------------------------------------------------
  // 4. Server authoritative Socket.IO Hand Privacy Integration Test
  // -----------------------------------------------------------------
  console.log('\n--- Unit 4: Socket.IO Authoritative Dealing & Privacy Verification ---');

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

    // Room setup
    const createRes = await emitPromise(p1, 'create_room', { playerName: 'Host Alice' });
    const roomCode = createRes.roomCode;
    const p2Join = await emitPromise(p2, 'join_room', { roomCode, playerName: 'Bob' });
    const p3Join = await emitPromise(p3, 'join_room', { roomCode, playerName: 'Charlie' });
    const p4Join = await emitPromise(p4, 'join_room', { roomCode, playerName: 'Diana' });

    // Ready up
    await emitPromise(p1, 'toggle_ready');
    await emitPromise(p2, 'toggle_ready');
    await emitPromise(p3, 'toggle_ready');
    await emitPromise(p4, 'toggle_ready');

    // Start preview
    await emitPromise(p1, 'start_game_preview');

    // Register private hand listeners
    let p1PrivateHand = null;
    let p2PrivateHand = null;
    let p3PrivateHand = null;
    let p4PrivateHand = null;

    p1.on('player_hand', (data) => (p1PrivateHand = data.hand));
    p2.on('player_hand', (data) => (p2PrivateHand = data.hand));
    p3.on('player_hand', (data) => (p3PrivateHand = data.hand));
    p4.on('player_hand', (data) => (p4PrivateHand = data.hand));

    // Register public state listener on p2 to verify NO card faces are leaked
    let p2ReceivedPublicState = null;
    p2.on('room_state_updated', (state) => (p2ReceivedPublicState = state));

    // Non-host attempts to deal -> Blocked
    const p2DealAttempt = await emitPromise(p2, 'deal_cards');
    assert(p2DealAttempt.success === false, 'Non-host Bob blocked from dealing cards');

    // Host deals cards (Stage 2: 5 cards each)
    const p1DealRes = await emitPromise(p1, 'deal_cards');
    assert(p1DealRes.success === true, 'Host Alice successfully dealt cards');

    // Wait for hands to arrive
    await new Promise((r) => setTimeout(r, 200));

    assert(Array.isArray(p1PrivateHand) && p1PrivateHand.length === 5, 'Host Alice received private hand of 5 cards (Stage 2)');
    assert(Array.isArray(p2PrivateHand) && p2PrivateHand.length === 5, 'Bob received private hand of 5 cards (Stage 2)');

    // Now advance to final deal (Stage 6: 13 cards each)
    await emitPromise(p1, 'set_stage', { targetStage: 'final_deal' });
    await new Promise((r) => setTimeout(r, 200));

    assert(Array.isArray(p1PrivateHand) && p1PrivateHand.length === 13, 'Host Alice received full private hand of 13 cards (Stage 6)');
    assert(Array.isArray(p2PrivateHand) && p2PrivateHand.length === 13, 'Bob received full private hand of 13 cards (Stage 6)');
    assert(Array.isArray(p3PrivateHand) && p3PrivateHand.length === 13, 'Charlie received private hand of 13 cards');
    assert(Array.isArray(p4PrivateHand) && p4PrivateHand.length === 13, 'Diana received private hand of 13 cards');

    // PRIVACY VERIFICATION: Alice and Bob have completely different cards
    const p1CardIds = new Set(p1PrivateHand.map((c) => c.id));
    const p2CardIds = new Set(p2PrivateHand.map((c) => c.id));
    const overlap = [...p1CardIds].filter((id) => p2CardIds.has(id));
    assert(overlap.length === 0, 'Alice and Bob have strictly distinct hands (0 overlap)');

    // PUBLIC STATE LEAKAGE CHECK
    assert(p2ReceivedPublicState !== null, 'Public room state received by Bob');
    assert(p2ReceivedPublicState.gameState.isDealt === true, 'Public state indicates isDealt = true');
    assert(
      JSON.stringify(p2ReceivedPublicState.gameState.handCounts) === '[13,13,13,13]',
      'Public state only displays hand counts [13,13,13,13]'
    );
    assert(
      p2ReceivedPublicState.gameState.privateHands === undefined,
      'SECURITY: Public state does NOT leak privateHands property'
    );

    // -----------------------------------------------------------------
    // 5. Reconnection Hand Recovery Test
    // -----------------------------------------------------------------
    console.log('\n--- Unit 5: Reconnection Restores Private Hand ---');
    const bobToken = p2Join.reconnectToken;
    p2.disconnect();

    const p2Reconnect = createClient();
    await waitForConnect(p2Reconnect);

    let bobReconnectedHand = null;
    p2Reconnect.on('player_hand', (data) => (bobReconnectedHand = data.hand));

    const reconRes = await emitPromise(p2Reconnect, 'reconnect_player', {
      roomCode,
      reconnectToken: bobToken,
    });
    assert(reconRes.success === true, 'Bob reconnected successfully');

    await new Promise((r) => setTimeout(r, 200));
    assert(Array.isArray(bobReconnectedHand) && bobReconnectedHand.length === 13, 'Bob recovered his exact 13 cards on reconnect');
    assert(
      bobReconnectedHand.every((c) => p2CardIds.has(c.id)),
      'Reconnected hand cards match pre-disconnect hand identically'
    );

    p1.disconnect();
    p2Reconnect.disconnect();
    p3.disconnect();
    p4.disconnect();

    console.log('\n===============================================================');
    console.log(`  TEST RESULTS: ${passedCount} passed, ${failedCount} failed`);
    console.log('  ALL DECK AND DEALING SPECIFICATIONS VERIFIED 100%!');
    console.log('===============================================================\n');
  } finally {
    testServer.close();
  }
}

runDeckAndDealingTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });

