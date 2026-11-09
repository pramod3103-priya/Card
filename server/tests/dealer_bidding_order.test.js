import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import assert from 'assert';
import { RoomManager } from '../src/models/RoomManager.js';
import { registerSocketHandlers } from '../src/socket/socketHandler.js';
import { GameState } from '../src/engine/GameState.js';

let passedCount = 0;
let failedCount = 0;

function pass(msg) {
  console.log(`  ✓ PASS: ${msg}`);
  passedCount++;
}

function fail(msg, err) {
  console.error(`  ✗ FAIL: ${msg}`);
  if (err) console.error(err);
  failedCount++;
}

function waitForMatchingEvent(socket, eventName, predicate, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, listener);
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeoutMs);

    function listener(data) {
      try {
        if (!predicate || predicate(data)) {
          clearTimeout(timer);
          socket.off(eventName, listener);
          resolve(data);
        }
      } catch {
        // continue listening until match or timeout
      }
    }

    socket.on(eventName, listener);
  });
}

async function runDealerAndBiddingOrderTests() {
  console.log('\n===============================================================');
  console.log('  MINUS DEALER & CLOCKWISE BIDDING ORDER TEST SUITE');
  console.log('===============================================================\n');

  // --- UNIT TESTS: GameState Engine Logic ---
  console.log('--- Unit 1: Dealer Seat Storage & Clockwise Sequence ---');
  try {
    const gs = new GameState('ROOM01', 41);

    // Initial default: dealer is Seat 0 (South)
    assert.strictEqual(gs.dealerSeatIndex, 0, 'Default dealer should be seat 0');
    assert.strictEqual(gs.firstBidderSeatIndex, 1, 'Default first bidder should be seat 1');
    pass('Initial dealer is Seat 0 and first bidder is Seat 1');

    // Clockwise order test
    assert.strictEqual(gs.getNextClockwiseSeat(0), 1);
    assert.strictEqual(gs.getNextClockwiseSeat(1), 2);
    assert.strictEqual(gs.getNextClockwiseSeat(2), 3);
    assert.strictEqual(gs.getNextClockwiseSeat(3), 0);
    pass('Clockwise player order is strictly Seat 0 -> 1 -> 2 -> 3 -> 0');

    // Verify Dealer is LAST in bidding order for all 4 seat positions
    // Position 0 (Dealer = 0)
    gs.setDealer(0);
    let order = gs.getBiddingOrder();
    assert.deepStrictEqual(order, [1, 2, 3, 0]);
    assert.strictEqual(order[3], 0, 'Dealer 0 must be 4th (last) bidder');
    pass('Dealer 0: Bidding order is [1, 2, 3, 0] with dealer last');

    // Position 1 (Dealer = 1)
    gs.setDealer(1);
    order = gs.getBiddingOrder();
    assert.deepStrictEqual(order, [2, 3, 0, 1]);
    assert.strictEqual(order[3], 1, 'Dealer 1 must be 4th (last) bidder');
    pass('Dealer 1: Bidding order is [2, 3, 0, 1] with dealer last');

    // Position 2 (Dealer = 2)
    gs.setDealer(2);
    order = gs.getBiddingOrder();
    assert.deepStrictEqual(order, [3, 0, 1, 2]);
    assert.strictEqual(order[3], 2, 'Dealer 2 must be 4th (last) bidder');
    pass('Dealer 2: Bidding order is [3, 0, 1, 2] with dealer last');

    // Position 3 (Dealer = 3)
    gs.setDealer(3);
    order = gs.getBiddingOrder();
    assert.deepStrictEqual(order, [0, 1, 2, 3]);
    assert.strictEqual(order[3], 3, 'Dealer 3 must be 4th (last) bidder');
    pass('Dealer 3: Bidding order is [0, 1, 2, 3] with dealer last');

    // Dealer clockwise rotation method
    gs.setDealer(0);
    assert.strictEqual(gs.rotateDealer(), 1);
    assert.strictEqual(gs.rotateDealer(), 2);
    assert.strictEqual(gs.rotateDealer(), 3);
    assert.strictEqual(gs.rotateDealer(), 0);
    pass('rotateDealer() sequentially advances clockwise through all 4 seats');
  } catch (err) {
    fail('Unit 1 Dealer Seat Storage & Clockwise Sequence', err);
  }

  console.log('\n--- Unit 2: Configurable First Bidder ---');
  try {
    const gs = new GameState('ROOM02', 31);
    gs.setDealer(0); // Dealer 0

    // Host configures first bidder explicitly to Seat 2
    gs.setFirstBidder(2, false);
    assert.strictEqual(gs.firstBidderSeatIndex, 2);
    assert.deepStrictEqual(gs.getBiddingOrder(), [2, 3, 0, 1]);
    pass('First bidder successfully configured to Seat 2 with clockwise sequence');

    // Host configures first bidder to Seat 3 and enforces dealer last
    gs.setFirstBidder(3, true);
    assert.strictEqual(gs.firstBidderSeatIndex, 3);
    assert.strictEqual(gs.dealerSeatIndex, 2); // (3 + 3) % 4 = 2
    assert.deepStrictEqual(gs.getBiddingOrder(), [3, 0, 1, 2]);
    assert.strictEqual(gs.getBiddingOrder()[3], gs.dealerSeatIndex);
    pass('Configurable first bidder with keepDealerLast keeps dealer in last position');

    // Invalid first bidder seat rejected
    assert.throws(() => gs.setFirstBidder(4), /Invalid first bidder/);
    assert.throws(() => gs.setFirstBidder(-1), /Invalid first bidder/);
    pass('Invalid seat indices (>3 or <0) correctly rejected with descriptive error');
  } catch (err) {
    fail('Unit 2 Configurable First Bidder', err);
  }

  // --- INTEGRATION TESTS: 4 Browser Sessions with Socket.IO Server ---
  console.log('\n--- Unit 3: 4-Session Real-Time Dealer & Bidding Order Synchronization ---');
  const PORT = 3105;
  const httpServer = createServer();
  const io = new Server(httpServer, { cors: { origin: '*' } });
  const roomManager = new RoomManager();
  registerSocketHandlers(io, roomManager);

  await new Promise((resolve) => httpServer.listen(PORT, resolve));

  const serverUrl = `http://localhost:${PORT}`;
  let s1, s2, s3, s4;

  try {
    // 1. Session 1 (Alice) creates room
    s1 = Client(serverUrl);
    await new Promise((r) => s1.on('connect', r));

    const createRes = await new Promise((resolve) => {
      s1.emit('create_room', { playerName: 'Alice', gameTarget: 51 }, resolve);
    });
    assert.strictEqual(createRes.success, true);
    const roomCode = createRes.roomCode;
    pass(`Alice created room ${roomCode} with Game Target 51`);

    // Initial state: Dealer is Seat 0 (Alice)
    assert.strictEqual(createRes.roomState.gameState.dealerSeatIndex, 0);
    assert.deepStrictEqual(createRes.roomState.gameState.biddingOrder, [1, 2, 3, 0]);
    pass('Public state initially indicates Dealer is Seat 0 and bidding order is [1, 2, 3, 0]');

    // 2. Connect Bob, Charlie, Diana
    s2 = Client(serverUrl);
    s3 = Client(serverUrl);
    s4 = Client(serverUrl);

    await Promise.all([
      new Promise((r) => s2.on('connect', r)),
      new Promise((r) => s3.on('connect', r)),
      new Promise((r) => s4.on('connect', r)),
    ]);

    await new Promise((resolve) => s2.emit('join_room', { roomCode, playerName: 'Bob' }, resolve));
    await new Promise((resolve) => s3.emit('join_room', { roomCode, playerName: 'Charlie' }, resolve));
    await new Promise((resolve) => s4.emit('join_room', { roomCode, playerName: 'Diana' }, resolve));
    pass('All 4 players joined room (Alice, Bob, Charlie, Diana)');

    // 3. Non-host Bob tries to change dealer -> Rejected
    const nonHostRotate = await new Promise((resolve) => {
      s2.emit('rotate_dealer', resolve);
    });
    assert.strictEqual(nonHostRotate.success, false);
    assert.match(nonHostRotate.error, /host/i);
    pass('Non-host Bob blocked from rotating dealer');

    // 4. Non-host Bob tries to set first bidder -> Rejected
    const nonHostFirstBidder = await new Promise((resolve) => {
      s2.emit('set_first_bidder', { seatIndex: 2 }, resolve);
    });
    assert.strictEqual(nonHostFirstBidder.success, false);
    assert.match(nonHostFirstBidder.error, /host/i);
    pass('Non-host Bob blocked from setting first bidder');

    // 5. Host Alice rotates dealer to Seat 1 (Bob)
    const bobStatePromise = waitForMatchingEvent(
      s2,
      'room_state_updated',
      (data) => data.gameState?.dealerSeatIndex === 1
    );

    const rotateRes = await new Promise((resolve) => {
      s1.emit('rotate_dealer', resolve);
    });
    assert.strictEqual(rotateRes.success, true);
    assert.strictEqual(rotateRes.dealerSeatIndex, 1);
    assert.deepStrictEqual(rotateRes.biddingOrder, [2, 3, 0, 1]);
    pass('Host Alice rotated dealer to Seat 1 (Bob)');

    const bobReceivedState = await bobStatePromise;
    assert.strictEqual(bobReceivedState.gameState.dealerSeatIndex, 1);
    assert.deepStrictEqual(bobReceivedState.gameState.biddingOrder, [2, 3, 0, 1]);
    assert.strictEqual(bobReceivedState.gameState.dealerIsLast, true);
    pass('Bob received synchronized dealer = 1 and biddingOrder = [2, 3, 0, 1] with dealer last');

    // 6. Host Alice explicitly sets dealer to Seat 3 (Diana)
    const dianaStatePromise = waitForMatchingEvent(
      s4,
      'room_state_updated',
      (data) => data.gameState?.dealerSeatIndex === 3
    );

    const setDealerRes = await new Promise((resolve) => {
      s1.emit('set_dealer', { seatIndex: 3 }, resolve);
    });
    assert.strictEqual(setDealerRes.success, true);
    assert.strictEqual(setDealerRes.dealerSeatIndex, 3);
    assert.deepStrictEqual(setDealerRes.biddingOrder, [0, 1, 2, 3]);
    pass('Host Alice set dealer to Seat 3 (Diana), yielding order [0, 1, 2, 3]');

    const dianaState = await dianaStatePromise;
    assert.strictEqual(dianaState.gameState.dealerSeatIndex, 3);
    assert.deepStrictEqual(dianaState.gameState.biddingOrder, [0, 1, 2, 3]);
    pass('Diana confirmed dealer = Seat 3 and dealer bids last in [0, 1, 2, 3]');

    // 7. Toggle Ready for all 4 and start table preview
    await Promise.all([
      new Promise((r) => s1.emit('toggle_ready', r)),
      new Promise((r) => s2.emit('toggle_ready', r)),
      new Promise((r) => s3.emit('toggle_ready', r)),
      new Promise((r) => s4.emit('toggle_ready', r)),
    ]);
    await new Promise((r) => s1.emit('start_game_preview', r));
    pass('Table preview opened with all 4 players');

    // 8. Deal cards and advance to Stage 3 (First Bidding Stage)
    await new Promise((r) => s1.emit('deal_cards', r));
    const advanceRes = await new Promise((resolve) => {
      s1.emit('advance_stage', resolve);
    });
    assert.strictEqual(advanceRes.gameState.stage, 'first_bidding');
    assert.strictEqual(advanceRes.gameState.stageIndex, 3);
    assert.strictEqual(advanceRes.gameState.currentBidderSeatIndex, 0); // 1st bidder in [0, 1, 2, 3]
    pass('Stage 3 (First Bidding): currentBidderSeatIndex starts at Seat 0 (First Bidder)');

    // 9. Verify Dealer remains last in all 3 bidding stages
    // Advance to Stage 5 (Second Bidding Stage)
    await new Promise((r) => s1.emit('advance_stage', r)); // to stage 4 (second_deal)
    const stage5Res = await new Promise((r) => s1.emit('advance_stage', r)); // to stage 5 (second_bidding)
    assert.strictEqual(stage5Res.gameState.stage, 'second_bidding');
    assert.strictEqual(stage5Res.gameState.biddingOrder[3], 3); // Dealer Diana is last
    pass('Stage 5 (Second Bidding): Diana (Dealer) is in the 4th (last) bidding position');

    // Advance to Stage 7 (Final Bidding Stage)
    await new Promise((r) => s1.emit('advance_stage', r)); // to stage 6 (final_deal)
    const stage7Res = await new Promise((r) => s1.emit('advance_stage', r)); // to stage 7 (final_bidding)
    assert.strictEqual(stage7Res.gameState.stage, 'final_bidding');
    assert.strictEqual(stage7Res.gameState.biddingOrder[3], 3); // Dealer Diana is last
    pass('Stage 7 (Final Bidding): Diana (Dealer) is strictly last opportunity in bidding order');

    // 10. Privacy check: ensure public state never exposes private cards
    assert.strictEqual(stage7Res.gameState.privateHands, undefined);
    assert.deepStrictEqual(stage7Res.gameState.handCounts, [13, 13, 13, 13]);
    pass('PRIVACY: Public state does not leak private hands; only hand counts [13, 13, 13, 13] are public');

  } catch (err) {
    fail('Unit 3 4-Session Real-Time Dealer & Bidding Order Synchronization', err);
  } finally {
    if (s1) s1.disconnect();
    if (s2) s2.disconnect();
    if (s3) s3.disconnect();
    if (s4) s4.disconnect();
    await new Promise((resolve) => httpServer.close(resolve));
  }

  console.log('\n===============================================================');
  console.log(`  TEST RESULTS: ${passedCount} passed, ${failedCount} failed`);
  if (failedCount === 0) {
    console.log('  ALL DEALER & BIDDING ORDER REQUIREMENTS VERIFIED 100%!');
  } else {
    console.error('  SOME TESTS FAILED!');
    process.exit(1);
  }
  console.log('===============================================================\n');
}

runDealerAndBiddingOrderTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

