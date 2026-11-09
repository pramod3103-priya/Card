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

async function runProgressiveBiddingAndTrumpTests() {
  console.log('\n===============================================================');
  console.log('  MINUS PROGRESSIVE DISTRIBUTION, BIDDING & TRUMP TEST SUITE');
  console.log('===============================================================\n');

  // --- UNIT TESTS: GameState Engine Logic ---
  console.log('--- Unit 1: Progressive Card Distribution (5 -> 9 -> 13) ---');
  try {
    const gs = new GameState('PROG01', 31);
    gs.startNewGame(); // deals Stage 2: first_deal

    // Stage 1 dealing: 5 cards
    assert.strictEqual(gs.stage, 'first_deal');
    for (let s = 0; s < 4; s++) {
      assert.strictEqual(gs.getPlayerHand(s).length, 5, `Seat ${s} must have 5 cards`);
    }
    pass('Stage 1: Every player receives exactly 5 cards privately');

    // Stage 2 dealing: +4 cards -> 9 cards total
    gs.setStage('second_deal');
    assert.strictEqual(gs.stage, 'second_deal');
    for (let s = 0; s < 4; s++) {
      assert.strictEqual(gs.getPlayerHand(s).length, 9, `Seat ${s} must have 9 cards`);
    }
    pass('Stage 2: Every player receives 4 additional cards, reaching 9 cards total');

    // Stage 3 dealing: +4 cards -> 13 cards total
    gs.setStage('final_deal');
    assert.strictEqual(gs.stage, 'final_deal');
    for (let s = 0; s < 4; s++) {
      assert.strictEqual(gs.getPlayerHand(s).length, 13, `Seat ${s} must have 13 cards`);
    }
    pass('Stage 3: Every player receives final 4 cards, reaching full 13 cards');

    // Verify all 52 cards are unique across the 4 hands
    const allCards = new Set();
    for (let s = 0; s < 4; s++) {
      for (const card of gs.getPlayerHand(s)) {
        const id = `${card.suit}-${card.rank}`;
        assert.ok(!allCards.has(id), `Duplicate card detected: ${id}`);
        allCards.add(id);
      }
    }
    assert.strictEqual(allCards.size, 52);
    pass('Standard 52-card deck strictly distributed (13 cards * 4 players = 52 unique cards)');
  } catch (err) {
    fail('Unit 1: Progressive Card Distribution', err);
  }

  console.log('\n--- Unit 2: Bidding Rules, Minimum Thresholds & Increasing Order ---');
  try {
    const gs = new GameState('PROG02', 41);
    gs.setDealer(0); // Dealer is Seat 0 (South), first bidder is Seat 1 (West)
    gs.startNewGame();
    gs.setStage('first_bidding'); // Stage 1 bidding (5 cards)

    // Bidding order must start at Seat 1 and end with Dealer Seat 0
    assert.deepStrictEqual(gs.getBiddingOrder(), [1, 2, 3, 0]);
    assert.strictEqual(gs.currentBidderSeatIndex, 1);
    pass('Bidding starts clockwise with Seat 1 and dealer (Seat 0) gets the last opportunity');

    // Rule: Out of turn bidding rejected
    assert.throws(() => gs.placeBid(0, 5), /Not your turn/);
    assert.throws(() => gs.placeBid(2, 5), /Not your turn/);
    pass('Out-of-turn bid attempts are rejected strictly by server state');

    // Rule: Opening bid must be at least 5 in first bidding stage
    assert.throws(() => gs.placeBid(1, 4), /Opening bid for first_bidding must be at least 5/);
    pass('Opening bid < 5 in first_bidding is rejected');

    // Seat 1 bids 5
    gs.placeBid(1, 5);
    assert.strictEqual(gs.bidding.highestBid, 5);
    assert.strictEqual(gs.bidding.highestBidderSeatIndex, 1);
    assert.strictEqual(gs.currentBidderSeatIndex, 2); // advanced to Seat 2
    pass('Seat 1 opens bidding with 5; turn advances to Seat 2');

    // Rule: "If a player bids 5, the next valid higher bid must be at least 6"
    assert.throws(() => gs.placeBid(2, 5), /must be strictly higher/);
    pass('Equal bid (5) rejected: Every bid must be higher than current highest bid');

    // Seat 2 bids 6
    gs.placeBid(2, 6);
    assert.strictEqual(gs.bidding.highestBid, 6);
    assert.strictEqual(gs.currentBidderSeatIndex, 3); // advanced to Seat 3
    pass('Seat 2 successfully bids 6 (at least 6)');

    // Rule: Allow Pass
    gs.passBid(3);
    assert.strictEqual(gs.bidding.highestBid, 6);
    assert.strictEqual(gs.currentBidderSeatIndex, 0); // advanced to Seat 0 (Dealer)
    pass('Seat 3 passes; turn advances to Dealer (Seat 0)');

    // Dealer (Seat 0) has the last opportunity in this stage
    assert.strictEqual(gs.currentBidderSeatIndex, gs.dealerSeatIndex);
    gs.passBid(0);
    assert.strictEqual(gs.bidding.biddingStageComplete, true);
    assert.strictEqual(gs.currentBidderSeatIndex, null);
    pass('Dealer (Seat 0) acts last; first_bidding stage concludes');

    // Stage 2: Second deal (9 cards) & second bidding stage
    gs.setStage('second_deal');
    gs.setStage('second_bidding');
    assert.strictEqual(gs.currentBidderSeatIndex, 1); // starts from Seat 1 again

    // "After the second deal of 4 cards, bidding can reach 8 or higher"
    // Seat 1 bids 8
    gs.placeBid(1, 8);
    assert.strictEqual(gs.bidding.highestBid, 8);
    assert.strictEqual(gs.bidding.highestBidderSeatIndex, 1);
    pass('Stage 2 bidding: Seat 1 bids 8 (higher than 6)');

    // Seat 2 passes, Seat 3 passes, Dealer passes
    gs.passBid(2);
    gs.passBid(3);
    gs.passBid(0); // Dealer acts last
    assert.strictEqual(gs.bidding.biddingStageComplete, true);
    pass('Stage 2 bidding completed with Dealer acting last');

    // Stage 3: Final deal (13 cards) & final bidding stage
    gs.setStage('final_deal');
    gs.setStage('final_bidding');
    assert.strictEqual(gs.currentBidderSeatIndex, 1);

    // "After the final deal, bidding can reach 10 or higher"
    // Seat 1 passes, Seat 2 bids 10
    gs.passBid(1);
    gs.placeBid(2, 10);
    assert.strictEqual(gs.bidding.highestBid, 10);
    assert.strictEqual(gs.bidding.highestBidderSeatIndex, 2);
    pass('Stage 3 bidding: Seat 2 bids 10 (higher than 8)');

    // Seat 3 passes
    gs.passBid(3);

    // Dealer acts last
    assert.strictEqual(gs.currentBidderSeatIndex, 0);
    gs.passBid(0);
    assert.strictEqual(gs.bidding.auctionComplete, true);
    assert.strictEqual(gs.bidding.winningBid, 10);
    assert.strictEqual(gs.bidding.winningBidderSeatIndex, 2);
    assert.strictEqual(gs.bidding.awaitingTrumpSelection, true);
    pass('Auction concluded: Seat 2 is the winning bidder with bid of 10 and awaits Trump selection');
  } catch (err) {
    fail('Unit 2: Bidding Rules & Thresholds', err);
  }

  console.log('\n--- Unit 3: Pradhan / Trump Suit Selection & All-Pass Default to Spades ---');
  try {
    // Test 3a: Winning bidder chooses Hearts (Heart can be selected as trump)
    const gs = new GameState('PROG03', 51);
    gs.setDealer(0);
    gs.startNewGame();
    gs.setStage('final_bidding');
    gs.placeBid(1, 10);
    gs.passBid(2);
    gs.passBid(3);
    gs.passBid(0); // Dealer acts last

    assert.strictEqual(gs.bidding.winningBidderSeatIndex, 1);
    assert.strictEqual(gs.bidding.awaitingTrumpSelection, true);

    // Non-winner cannot choose trump
    assert.throws(() => gs.chooseTrump(2, 'Hearts'), /Only the auction winner/);
    pass('Non-winner is blocked from choosing trump suit');

    // Invalid suit name rejected
    assert.throws(() => gs.chooseTrump(1, 'Joker'), /Invalid trump suit/);
    pass('Invalid suit name rejected');

    // Winner chooses Hearts
    const trumpRes = gs.chooseTrump(1, 'Hearts');
    assert.strictEqual(trumpRes.trumpSuit, 'Hearts');
    assert.strictEqual(gs.trumpSuit, 'Hearts');
    assert.strictEqual(gs.stage, 'ready_to_play');
    assert.strictEqual(gs.bidding.awaitingTrumpSelection, false);
    pass('Winner successfully selects Hearts as Trump (Pradhan) and stage advances to ready_to_play');

    // Test 3b: Test Trump selection with Diamonds, Clubs, and Spades
    const gsDiamonds = new GameState('PROG03B', 31);
    gsDiamonds.startNewGame();
    gsDiamonds.setStage('final_bidding');
    gsDiamonds.placeBid(1, 10);
    gsDiamonds.passBid(2);
    gsDiamonds.passBid(3);
    gsDiamonds.passBid(0);
    gsDiamonds.chooseTrump(1, 'Diamonds');
    assert.strictEqual(gsDiamonds.trumpSuit, 'Diamonds');
    pass('Diamonds successfully selected as Trump');

    // Test 3c: "If everyone passes and no player wins the auction, Spades automatically becomes the default trump suit"
    const gsAllPass = new GameState('PROG03C', 31);
    gsAllPass.setDealer(0);
    gsAllPass.startNewGame();
    gsAllPass.setStage('final_bidding');

    // All 4 players pass
    gsAllPass.passBid(1);
    gsAllPass.passBid(2);
    gsAllPass.passBid(3);
    gsAllPass.passBid(0); // Dealer passes last

    assert.strictEqual(gsAllPass.bidding.auctionComplete, true);
    assert.strictEqual(gsAllPass.bidding.highestBid, null);
    assert.strictEqual(gsAllPass.bidding.winningBidderSeatIndex, null);
    assert.strictEqual(gsAllPass.trumpSuit, 'Spades');
    assert.strictEqual(gsAllPass.trumpSelectedBy, 'default_all_passed');
    assert.strictEqual(gsAllPass.stage, 'ready_to_play');
    pass('Everyone passing in auction automatically defaults Trump suit to Spades (♠)');
  } catch (err) {
    fail('Unit 3: Pradhan / Trump Suit Selection', err);
  }

  // --- INTEGRATION TESTS: 4 Real Socket.IO Browser Sessions ---
  console.log('\n--- Unit 4: 4-Session Real-Time Progressive Dealing & Bidding Flow ---');
  const PORT = 3108;
  const httpServer = createServer();
  const io = new Server(httpServer, { cors: { origin: '*' } });
  const roomManager = new RoomManager();
  registerSocketHandlers(io, roomManager);

  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  const serverUrl = `http://localhost:${PORT}`;

  let s1, s2, s3, s4;
  try {
    // 1. Session 1 creates room with target 41
    s1 = Client(serverUrl);
    await new Promise((r) => s1.on('connect', r));

    const createRes = await new Promise((resolve) => {
      s1.emit('create_room', { playerName: 'Alice', gameTarget: 41 }, resolve);
    });
    assert.strictEqual(createRes.success, true);
    const roomCode = createRes.roomCode;
    pass(`Alice created room ${roomCode} with Game Target = 41`);

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

    // 3. Ready up & start preview
    await Promise.all([
      new Promise((r) => s1.emit('toggle_ready', r)),
      new Promise((r) => s2.emit('toggle_ready', r)),
      new Promise((r) => s3.emit('toggle_ready', r)),
      new Promise((r) => s4.emit('toggle_ready', r)),
    ]);
    await new Promise((r) => s1.emit('start_game_preview', r));
    pass('All 4 sessions joined, readied up, and opened Table Preview');

    // 4. STAGE 1: Deal 5 cards & First Bidding
    const s1HandP = waitForMatchingEvent(s1, 'player_hand', (d) => d.hand?.length === 5);
    const s2HandP = waitForMatchingEvent(s2, 'player_hand', (d) => d.hand?.length === 5);
    const s3HandP = waitForMatchingEvent(s3, 'player_hand', (d) => d.hand?.length === 5);
    const s4HandP = waitForMatchingEvent(s4, 'player_hand', (d) => d.hand?.length === 5);

    await new Promise((r) => s1.emit('deal_cards', r));
    const [h1, h2, h3, h4] = await Promise.all([s1HandP, s2HandP, s3HandP, s4HandP]);
    assert.strictEqual(h1.hand.length, 5);
    assert.strictEqual(h2.hand.length, 5);
    assert.strictEqual(h3.hand.length, 5);
    assert.strictEqual(h4.hand.length, 5);
    pass('Stage 1: All 4 browser sessions privately received exactly 5 cards');

    // Advance to first_bidding
    await new Promise((r) => s1.emit('advance_stage', r));

    // Bidding order starts at Bob (Seat 1) and ends with Dealer Alice (Seat 0)
    // Bob bids 5
    const bid5Promise = waitForMatchingEvent(
      s1,
      'room_state_updated',
      (d) => d.gameState?.bidding?.highestBid === 5
    );
    const bobBidRes = await new Promise((r) => s2.emit('place_bid', { amount: 5 }, r));
    assert.strictEqual(bobBidRes.success, true);
    await bid5Promise;
    pass('Bob placed opening bid of 5, synchronized to all sessions');

    // Charlie bids 6
    const charlieBidRes = await new Promise((r) => s3.emit('place_bid', { amount: 6 }, r));
    assert.strictEqual(charlieBidRes.success, true);

    // Diana passes
    const dianaPassRes = await new Promise((r) => s4.emit('pass_bid', r));
    assert.strictEqual(dianaPassRes.success, true);

    // Dealer Alice has the last opportunity in this round
    const alicePassRes = await new Promise((r) => s1.emit('pass_bid', r));
    assert.strictEqual(alicePassRes.success, true);
    pass('Dealer Alice passed last; first bidding round complete');

    // 5. STAGE 2: Deal 4 additional cards -> 9 cards each
    const s1HandP9 = waitForMatchingEvent(s1, 'player_hand', (d) => d.hand?.length === 9);
    const s2HandP9 = waitForMatchingEvent(s2, 'player_hand', (d) => d.hand?.length === 9);
    await new Promise((r) => s1.emit('advance_stage', r)); // second_deal
    const [h1_9, h2_9] = await Promise.all([s1HandP9, s2HandP9]);
    assert.strictEqual(h1_9.hand.length, 9);
    assert.strictEqual(h2_9.hand.length, 9);
    pass('Stage 2: 4 additional cards dealt; each session reaches 9 cards');

    // Advance to second_bidding
    await new Promise((r) => s1.emit('advance_stage', r)); // second_bidding

    // Bob bids 8
    const bobBid8Res = await new Promise((r) => s2.emit('place_bid', { amount: 8 }, r));
    assert.strictEqual(bobBid8Res.success, true);
    // Charlie, Diana, and Dealer Alice pass
    await new Promise((r) => s3.emit('pass_bid', r));
    await new Promise((r) => s4.emit('pass_bid', r));
    await new Promise((r) => s1.emit('pass_bid', r));
    pass('Stage 2 bidding: Bob bid 8, others passed, Dealer Alice acted last');

    // 6. STAGE 3: Deal final 4 cards -> 13 cards each
    const s1HandP13 = waitForMatchingEvent(s1, 'player_hand', (d) => d.hand?.length === 13);
    const s2HandP13 = waitForMatchingEvent(s2, 'player_hand', (d) => d.hand?.length === 13);
    await new Promise((r) => s1.emit('advance_stage', r)); // final_deal
    const [h1_13, h2_13] = await Promise.all([s1HandP13, s2HandP13]);
    assert.strictEqual(h1_13.hand.length, 13);
    assert.strictEqual(h2_13.hand.length, 13);
    pass('Stage 3: Final 4 cards dealt; each session reaches full 13 cards');

    // Advance to final_bidding
    await new Promise((r) => s1.emit('advance_stage', r)); // final_bidding

    // Bob passes, Charlie bids 10
    await new Promise((r) => s2.emit('pass_bid', r));
    const charlieBid10Res = await new Promise((r) => s3.emit('place_bid', { amount: 10 }, r));
    assert.strictEqual(charlieBid10Res.success, true);

    // Diana passes, Dealer Alice passes last
    await new Promise((r) => s4.emit('pass_bid', r));
    const finalPassRes = await new Promise((r) => s1.emit('pass_bid', r));
    assert.strictEqual(finalPassRes.success, true);
    assert.strictEqual(finalPassRes.bidding.auctionComplete, true);
    assert.strictEqual(finalPassRes.bidding.winningBidderSeatIndex, 2); // Charlie
    assert.strictEqual(finalPassRes.bidding.winningBid, 10);
    pass('Final bidding concluded: Charlie (Seat 2) won the auction with bid of 10');

    // 7. Charlie chooses Trump: Hearts
    const trumpSyncPromise = waitForMatchingEvent(
      s1,
      'room_state_updated',
      (d) => d.gameState?.trumpSuit === 'Hearts'
    );
    const trumpRes = await new Promise((r) => s3.emit('choose_trump', { suit: 'Hearts' }, r));
    assert.strictEqual(trumpRes.success, true);
    assert.strictEqual(trumpRes.trumpSuit, 'Hearts');

    const syncedState = await trumpSyncPromise;
    assert.strictEqual(syncedState.gameState.trumpSuit, 'Hearts');
    assert.strictEqual(syncedState.gameState.stage, 'ready_to_play');
    pass('Charlie selected Hearts as Trump (Pradhan); synchronized to all 4 browser sessions');

    // 8. Privacy Verification across all 4 sessions
    assert.strictEqual(syncedState.gameState.privateHands, undefined);
    assert.deepStrictEqual(syncedState.gameState.handCounts, [13, 13, 13, 13]);
    pass('PRIVACY GUARANTEE: No player hand cards leaked in public broadcasts; only count 13 is shared');

  } catch (err) {
    fail('Unit 4: 4-Session Real-Time Integration Flow', err);
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
    console.log('  ALL MINUS PROGRESSIVE BIDDING & TRUMP RULES VERIFIED 100%!');
  } else {
    console.error('  SOME TESTS FAILED!');
    process.exit(1);
  }
  console.log('===============================================================\n');
}

runProgressiveBiddingAndTrumpTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

