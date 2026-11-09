import assert from 'assert';
import { GameState } from '../src/engine/GameState.js';
import { PLAYABLE_CHARACTERS } from '../../client/src/data/characters.js';
import { decideBotFlexibleIncrease, evaluateHand } from '../../client/src/bot/BotAI.js';

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

async function runFlexibleBidIncreaseTests() {
  console.log('\n===============================================================');
  console.log('  PRO CARD – FLEXIBLE BID INCREASE RULE TEST SUITE');
  console.log('===============================================================\n');

  try {
    // -------------------------------------------------------------------------
    // Unit 1: State Initialization & Triggering "All 4 Players Bid 10"
    // -------------------------------------------------------------------------
    console.log('--- Unit 1: Triggering "All 4 Players Bid 10" ---');
    const gs = new GameState('FLEX01', 31);
    gs.setDealer(0); // Dealer is Seat 0, order is [1, 2, 3, 0]
    gs.startNewGame();
    gs.setStage('final_bidding');

    // Trigger rule
    const state = gs.triggerAllPlayersBid10();
    assert.strictEqual(gs.bidding.flexibleIncreasePhase, true, 'Flexible increase phase must be active');
    assert.deepStrictEqual(gs.bidding.playerBids, [10, 10, 10, 10], 'All 4 players initial bids must be 10');
    assert.strictEqual(gs.bidding.flexibleTurnSeatIndex, 1, 'Turn begins with first bidder in order (Seat 1)');
    assert.strictEqual(gs.bidding.flexibleIncreasesCount, 0, 'Initially 0 increases');
    pass('Trigger "All 4 Players Bid 10" initializes playerBids to [10, 10, 10, 10] and starts clockwise at Seat 1');

    // -------------------------------------------------------------------------
    // Unit 2: Independent Bids & Non-+1 Increases (e.g. 10 -> 13)
    // -------------------------------------------------------------------------
    console.log('\n--- Unit 2: Independent Bids & Flexible Jump (10 -> 13) ---');
    // Rule: Out-of-turn rejection
    assert.throws(() => gs.flexibleIncreaseBid(2, 13), /Not your turn/);
    pass('Out-of-turn flexible bid rejected');

    // Rule: Value must be > 10
    assert.throws(() => gs.flexibleIncreaseBid(1, 10), /greater than 10/);
    assert.throws(() => gs.flexibleIncreaseBid(1, 9), /greater than 10/);
    pass('Increase amount <= 10 rejected strictly');

    // Seat 1 increases from 10 to 13 (a jump of +3, NOT restricted to +1)
    gs.flexibleIncreaseBid(1, 13);
    assert.strictEqual(gs.bidding.playerBids[1], 13, 'Seat 1 bid updated to 13');
    // Rule 5: If one player increases from 10 to 13, the other three players bids must remain at 10!
    assert.strictEqual(gs.bidding.playerBids[0], 10, 'Seat 0 bid remains 10');
    assert.strictEqual(gs.bidding.playerBids[2], 10, 'Seat 2 bid remains 10');
    assert.strictEqual(gs.bidding.playerBids[3], 10, 'Seat 3 bid remains 10');
    assert.deepStrictEqual(gs.bidding.playerBids, [10, 13, 10, 10], 'Only Seat 1 updated; other 3 remain at 10');
    pass('Seat 1 increases 10 -> 13 (+3 jump): other 3 players bids remain strictly at 10');

    // -------------------------------------------------------------------------
    // Unit 3: Other players NOT required to match or exceed the increased bid
    // -------------------------------------------------------------------------
    console.log('\n--- Unit 3: No Requirement to Match or Exceed Previous Increase ---');
    // Next turn is Seat 2
    assert.strictEqual(gs.bidding.flexibleTurnSeatIndex, 2);

    // Rule 6: Seat 2 can increase to 11 (which is LESS than Seat 1's 13)
    // There is NO requirement to match or beat 13!
    gs.flexibleIncreaseBid(2, 11); // 10 -> 11 (+1)
    assert.strictEqual(gs.bidding.playerBids[2], 11, 'Seat 2 bid is 11');
    assert.strictEqual(gs.bidding.playerBids[1], 13, 'Seat 1 bid is still 13');
    assert.strictEqual(gs.bidding.playerBids[0], 10, 'Seat 0 bid is still 10');
    assert.strictEqual(gs.bidding.playerBids[3], 10, 'Seat 3 bid is still 10');
    pass('Seat 2 increases to 11: NOT forced to match or exceed Seat 1s 13');

    // -------------------------------------------------------------------------
    // Unit 4: Independent PASS & Big Jump (e.g. 10 -> 15)
    // -------------------------------------------------------------------------
    console.log('\n--- Unit 4: PASS Option & Large Jump to 15 ---');
    // Next turn is Seat 3
    assert.strictEqual(gs.bidding.flexibleTurnSeatIndex, 3);

    // Seat 3 chooses PASS (bid remains 10)
    gs.flexiblePass(3);
    assert.strictEqual(gs.bidding.playerBids[3], 10, 'Seat 3 bid remains 10 on PASS');
    pass('Seat 3 chooses PASS: bid independently remains at 10');

    // Next turn is Seat 0 (Dealer)
    assert.strictEqual(gs.bidding.flexibleTurnSeatIndex, 0);

    // Seat 0 chooses to jump 10 -> 15 (+5 jump)
    gs.flexibleIncreaseBid(0, 15);
    assert.strictEqual(gs.bidding.playerBids[0], 15, 'Seat 0 bid is 15');
    assert.deepStrictEqual(gs.bidding.playerBids, [15, 13, 11, 10], 'Final independent bids: [15, 13, 11, 10]');
    pass('Seat 0 increases 10 -> 15: all 4 independent bids verified: [15, 13, 11, 10]');

    // -------------------------------------------------------------------------
    // Unit 5: Rule 8: If at least one player increases, continue the game
    // -------------------------------------------------------------------------
    console.log('\n--- Unit 5: At Least One Increase -> Game Continues ---');
    assert.strictEqual(gs.bidding.flexibleIncreasePhase, false, 'Flexible phase concluded');
    assert.strictEqual(gs.bidding.auctionComplete, true, 'Auction completed');
    assert.strictEqual(gs.bidding.winningBid, 15, 'Winning bid is highest independent bid (15)');
    assert.strictEqual(gs.bidding.winningBidderSeatIndex, 0, 'Seat 0 won the auction with 15');
    assert.strictEqual(gs.bidding.awaitingTrumpSelection, true, 'Awaiting Trump selection by Seat 0');

    // Winning bidder (Seat 0) chooses Trump
    gs.chooseTrump(0, 'Diamonds');
    assert.strictEqual(gs.trumpSuit, 'Diamonds', 'Trump set to Diamonds');
    assert.strictEqual(gs.stage, 'ready_to_play', 'Stage advanced to ready_to_play');
    pass('Game continues: highest independent bidder (Seat 0 with 15) selects Trump and game moves to ready_to_play');

    // -------------------------------------------------------------------------
    // Unit 6: Rule 9: If all 4 players PASS, end bidding according to existing rules
    // -------------------------------------------------------------------------
    console.log('\n--- Unit 6: All 4 Players PASS -> End Bidding per Existing Rules ---');
    const gsAllPass = new GameState('FLEX02', 41);
    gsAllPass.setDealer(0);
    gsAllPass.startNewGame();
    gsAllPass.triggerAllPlayersBid10();

    // All 4 players in clockwise order choose PASS:
    // Seat 1 passes
    gsAllPass.flexiblePass(1);
    // Seat 2 passes
    gsAllPass.flexiblePass(2);
    // Seat 3 passes
    gsAllPass.flexiblePass(3);
    // Seat 0 (Dealer) passes
    gsAllPass.flexiblePass(0);

    assert.strictEqual(gsAllPass.bidding.flexibleIncreasesCount, 0, '0 players increased their bid');
    assert.deepStrictEqual(gsAllPass.bidding.playerBids, [10, 10, 10, 10], 'All bids remain at 10');
    assert.strictEqual(gsAllPass.bidding.auctionComplete, true, 'Auction is complete');
    assert.strictEqual(gsAllPass.bidding.awaitingTrumpSelection, false, 'No trump selection required');
    // Existing game rule: If everyone passes, Spades automatically becomes default trump suit!
    assert.strictEqual(gsAllPass.trumpSuit, 'Spades', 'Spades is default trump when all pass');
    assert.strictEqual(gsAllPass.trumpSelectedBy, 'default_all_passed');
    assert.strictEqual(gsAllPass.stage, 'ready_to_play');
    pass('All 4 players PASS: auction concludes with Spades (♠) as default trump and moves to ready_to_play');

    // -------------------------------------------------------------------------
    // Unit 7: AI Bot Decision Engine for Flexible Increase Phase
    // -------------------------------------------------------------------------
    console.log('\n--- Unit 7: AI Bot Decision Engine for Flexible Increases ---');
    const trampu = PLAYABLE_CHARACTERS.find((c) => c.id === 'trampu');
    const putin = PLAYABLE_CHARACTERS.find((c) => c.id === 'putin');
    const ironman = PLAYABLE_CHARACTERS.find((c) => c.id === 'ironman');
    const odi = PLAYABLE_CHARACTERS.find((c) => c.id === 'odi');

    // Trampu hand
    const strongHand = [
      { suit: 'Spades', rank: 'A' },
      { suit: 'Spades', rank: 'K' },
      { suit: 'Spades', rank: 'Q' },
      { suit: 'Hearts', rank: 'A' },
      { suit: 'Hearts', rank: 'K' },
      { suit: 'Diamonds', rank: 'A' },
      { suit: 'Clubs', rank: 'A' },
      { suit: 'Spades', rank: '10' },
      { suit: 'Spades', rank: '9' },
      { suit: 'Hearts', rank: 'J' },
      { suit: 'Hearts', rank: '10' },
      { suit: 'Diamonds', rank: 'K' },
      { suit: 'Clubs', rank: 'K' },
    ];

    const trampuDecision = decideBotFlexibleIncrease(trampu, strongHand, 10);
    assert.strictEqual(trampuDecision.action, 'increase', 'Trampu increases with strong hand');
    assert.ok(trampuDecision.amount >= 13, 'Trampu increases boldly by non-+1 jump (>= 13)');
    assert.ok(trampuDecision.quip.includes('10'), 'Quip mentions baseline bid 10');
    pass('Trampu AI makes bold non-+1 jump (10 -> 13 or 10 -> 15) with in-character dealmaker dialogue');

    const putinDecision = decideBotFlexibleIncrease(putin, strongHand, 10);
    assert.strictEqual(putinDecision.action, 'increase');
    assert.ok(putinDecision.amount > 10, 'Put-in increases above 10');
    pass('Put-in AI tactically escalates bid with cold tactician quote');

    // Weak Hand for ODI
    const weakHand = [
      { suit: 'Hearts', rank: '2' },
      { suit: 'Hearts', rank: '3' },
      { suit: 'Diamonds', rank: '2' },
      { suit: 'Diamonds', rank: '3' },
      { suit: 'Clubs', rank: '2' },
      { suit: 'Clubs', rank: '3' },
      { suit: 'Spades', rank: '2' },
      { suit: 'Spades', rank: '3' },
      { suit: 'Hearts', rank: '4' },
      { suit: 'Diamonds', rank: '4' },
      { suit: 'Clubs', rank: '4' },
      { suit: 'Spades', rank: '4' },
      { suit: 'Hearts', rank: '5' },
    ];
    const odiWeak = decideBotFlexibleIncrease(odi, weakHand, 10);
    assert.strictEqual(odiWeak.action, 'pass', 'ODI patiently passes with weak hand');
    assert.strictEqual(odiWeak.amount, 10, 'Bid remains 10');
    assert.ok(odiWeak.quip.toLowerCase().includes('pass') || odiWeak.quip.toLowerCase().includes('patience'));
    pass('ODI AI patiently chooses PASS on weak hand, holding bid independently at 10');

    console.log('\n===============================================================');
    console.log(`  TEST RESULTS: ${passedCount} passed, ${failedCount} failed`);
    console.log('  ALL PRO CARD FLEXIBLE BID INCREASE RULES VERIFIED 100%!');
    console.log('===============================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    fail('Unexpected exception during flexible bid increase tests', err);
    process.exit(1);
  }
}

runFlexibleBidIncreaseTests();

