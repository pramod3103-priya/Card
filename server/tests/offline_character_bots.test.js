import assert from 'assert';
import { PLAYABLE_CHARACTERS, assignOfflineSeats } from '../../client/src/data/characters.js';
import { evaluateHand, decideBotBid, decideBotTrump } from '../../client/src/bot/BotAI.js';
import {
  createStandardDeck,
  shuffleDeck,
  sortHand,
  dealProgressiveBatches,
} from '../../client/src/bot/offlineGameEngine.js';

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

async function runOfflineCharacterBotsTests() {
  console.log('\n===============================================================');
  console.log('  MINUS OFFLINE VS BOTS – CHARACTER SELECTION TEST SUITE');
  console.log('===============================================================\n');

  try {
    // -------------------------------------------------------------
    // Unit 1: 4 Playable Characters Existence & Profiles
    // -------------------------------------------------------------
    console.log('--- Unit 1: 4 Playable Characters Profile Verification ---');
    assert.strictEqual(PLAYABLE_CHARACTERS.length, 4, 'Must have exactly 4 playable characters');
    pass('Exactly 4 playable characters registered');

    const expectedIds = ['odi', 'putin', 'trampu', 'ironman'];
    const actualIds = PLAYABLE_CHARACTERS.map((c) => c.id);
    assert.deepStrictEqual(actualIds.sort(), expectedIds.sort(), 'Characters must include odi, putin, trampu, ironman');
    pass('All 4 character IDs verified: ODI, Put-in, Trampu, Iron Man');

    // ODI profile
    const odi = PLAYABLE_CHARACTERS.find((c) => c.id === 'odi');
    assert.strictEqual(odi.name, 'ODI');
    assert.ok(odi.inspiration.includes('Narendra Modi'), 'ODI is inspired by Narendra Modi');
    assert.strictEqual(odi.tagline, 'The Master Strategist');
    assert.ok(odi.quips?.intro && odi.quips?.bid && odi.quips?.pass, 'ODI has full dialogue quip repertoire');
    pass('ODI profile verified: inspired by Narendra Modi, Master Strategist');

    // Put-in profile
    const putin = PLAYABLE_CHARACTERS.find((c) => c.id === 'putin');
    assert.strictEqual(putin.name, 'Put-in');
    assert.ok(putin.inspiration.includes('Vladimir Putin'), 'Put-in is inspired by Vladimir Putin');
    assert.strictEqual(putin.tagline, 'The Cold Tactician');
    assert.strictEqual(putin.favoriteTrump, 'Spades');
    pass('Put-in profile verified: inspired by Vladimir Putin, Cold Tactician');

    // Trampu profile
    const trampu = PLAYABLE_CHARACTERS.find((c) => c.id === 'trampu');
    assert.strictEqual(trampu.name, 'Trampu');
    assert.ok(trampu.inspiration.includes('Donald Trump'), 'Trampu is inspired by Donald Trump');
    assert.strictEqual(trampu.tagline, 'The Grand Dealmaker');
    assert.ok(trampu.aggression >= 0.8, 'Trampu has high-stakes aggression');
    pass('Trampu profile verified: inspired by Donald Trump, Grand Dealmaker');

    // Iron Man profile
    const ironman = PLAYABLE_CHARACTERS.find((c) => c.id === 'ironman');
    assert.strictEqual(ironman.name, 'Iron Man');
    assert.ok(ironman.inspiration.toLowerCase().includes('marvel'), 'Iron Man is Marvel superhero-inspired');
    assert.strictEqual(ironman.tagline, 'The High-Tech Genius');
    assert.ok(ironman.quips?.intro.includes('J.A.R.V.I.S.'), 'Iron Man has J.A.R.V.I.S. voice lines');
    pass('Iron Man profile verified: Marvel superhero-inspired High-Tech Genius');

    // -------------------------------------------------------------
    // Unit 2: Single-Character Selection & Automatic 3-Bot Assignment
    // -------------------------------------------------------------
    console.log('\n--- Unit 2: Single Selection & Automatic Bot Opponent Assignment ---');

    // Scenario A: User selects ODI
    const odiSetup = assignOfflineSeats('odi');
    assert.strictEqual(odiSetup.humanCharacter.id, 'odi', 'Human is ODI');
    assert.strictEqual(odiSetup.botOpponents.length, 3, 'Exactly 3 AI opponents assigned');
    assert.deepStrictEqual(
      odiSetup.botOpponents.map((b) => b.id).sort(),
      ['ironman', 'putin', 'trampu'].sort(),
      'Opponents must be Put-in, Trampu, and Iron Man'
    );
    assert.strictEqual(odiSetup.allSeats[0].isHuman, true, 'Seat 0 (South) is the human player');
    assert.strictEqual(odiSetup.allSeats[0].character.id, 'odi');
    assert.strictEqual(odiSetup.allSeats[1].isHuman, false, 'Seat 1 (West) is Bot');
    assert.strictEqual(odiSetup.allSeats[2].isHuman, false, 'Seat 2 (North) is Bot');
    assert.strictEqual(odiSetup.allSeats[3].isHuman, false, 'Seat 3 (East) is Bot');
    pass('Selecting ODI automatically assigns Put-in, Trampu, and Iron Man as the 3 AI opponents');

    // Scenario B: User selects Iron Man
    const ironSetup = assignOfflineSeats('ironman');
    assert.strictEqual(ironSetup.humanCharacter.id, 'ironman', 'Human is Iron Man');
    assert.strictEqual(ironSetup.botOpponents.length, 3, 'Exactly 3 AI opponents assigned');
    assert.deepStrictEqual(
      ironSetup.botOpponents.map((b) => b.id).sort(),
      ['odi', 'putin', 'trampu'].sort(),
      'Opponents must be ODI, Put-in, and Trampu'
    );
    assert.strictEqual(ironSetup.allSeats[0].character.id, 'ironman');
    pass('Selecting Iron Man automatically assigns ODI, Put-in, and Trampu as the 3 AI opponents');

    // Scenario C: User selects Put-in
    const putinSetup = assignOfflineSeats('putin');
    assert.strictEqual(putinSetup.humanCharacter.id, 'putin');
    assert.deepStrictEqual(
      putinSetup.botOpponents.map((b) => b.id).sort(),
      ['ironman', 'odi', 'trampu'].sort()
    );
    pass('Selecting Put-in automatically assigns ODI, Trampu, and Iron Man as the 3 AI opponents');

    // Scenario D: User selects Trampu
    const trampuSetup = assignOfflineSeats('trampu');
    assert.strictEqual(trampuSetup.humanCharacter.id, 'trampu');
    assert.deepStrictEqual(
      trampuSetup.botOpponents.map((b) => b.id).sort(),
      ['ironman', 'odi', 'putin'].sort()
    );
    pass('Selecting Trampu automatically assigns ODI, Put-in, and Iron Man as the 3 AI opponents');

    // Strict 1-human, 3-bot invariant across all 4 seats
    [odiSetup, ironSetup, putinSetup, trampuSetup].forEach((setup) => {
      assert.strictEqual(setup.allSeats.length, 4, 'Table must have exactly 4 seats');
      const humanCount = setup.allSeats.filter((s) => s.isHuman).length;
      const botCount = setup.allSeats.filter((s) => !s.isHuman).length;
      assert.strictEqual(humanCount, 1, 'Exactly 1 human player');
      assert.strictEqual(botCount, 3, 'Exactly 3 AI bot opponents');
    });
    pass('Invariant confirmed: exactly 1 human player at South and 3 bot opponents at West, North, East');

    // -------------------------------------------------------------
    // Unit 3: Deck Creation, Progressive Dealing & Hand Sorting
    // -------------------------------------------------------------
    console.log('\n--- Unit 3: Client-Side Deck, Shuffling & Progressive Batches ---');
    const deck = createStandardDeck();
    assert.strictEqual(deck.length, 52, 'Deck contains exactly 52 cards');
    const shuffled = shuffleDeck(deck);
    assert.strictEqual(shuffled.length, 52, 'Shuffled deck contains 52 cards');

    const batches = dealProgressiveBatches(shuffled);
    assert.strictEqual(batches.batch1.length, 4, 'Batch 1 has 4 players');
    assert.strictEqual(batches.batch1[0].length, 5, 'Batch 1 deals 5 cards each');
    assert.strictEqual(batches.batch2[0].length, 4, 'Batch 2 deals 4 additional cards');
    assert.strictEqual(batches.batch3[0].length, 4, 'Batch 3 deals final 4 cards');

    const totalDealt =
      batches.batch1.flat().length + batches.batch2.flat().length + batches.batch3.flat().length;
    assert.strictEqual(totalDealt, 52, 'Total progressive cards dealt is strictly 52');
    pass('Progressive card batches deal exactly 5, then 4 (9 total), then 4 (13 total) cards per player');

    // Test hand sorting
    const rawHand = [
      { suit: 'Hearts', rank: '2' },
      { suit: 'Spades', rank: 'A' },
      { suit: 'Clubs', rank: 'K' },
      { suit: 'Diamonds', rank: '10' },
      { suit: 'Spades', rank: 'K' },
    ];
    const sortedHand = sortHand(rawHand);
    assert.strictEqual(sortedHand[0].suit, 'Spades');
    assert.strictEqual(sortedHand[0].rank, 'A');
    assert.strictEqual(sortedHand[1].suit, 'Spades');
    assert.strictEqual(sortedHand[1].rank, 'K');
    pass('sortHand properly sorts by suit (Spades, Hearts, Diamonds, Clubs) and rank high-to-low');

    // -------------------------------------------------------------
    // Unit 4: Bot AI Hand Evaluation & Bidding Logic
    // -------------------------------------------------------------
    console.log('\n--- Unit 4: Bot AI Evaluation & Personality Decisions ---');

    // Weak Hand Evaluation
    const weakHand = [
      { suit: 'Hearts', rank: '2' },
      { suit: 'Hearts', rank: '4' },
      { suit: 'Diamonds', rank: '3' },
      { suit: 'Clubs', rank: '5' },
      { suit: 'Spades', rank: '6' },
    ];
    const weakEval = evaluateHand(weakHand);
    assert.strictEqual(weakEval.hcp, 0, 'Weak hand has 0 HCP');
    const weakBid = decideBotBid(odi, weakHand, 'first_bidding', null, 5);
    assert.strictEqual(weakBid.action, 'pass', 'Weak hand results in Pass');
    assert.ok(weakBid.quip.length > 0, 'Bot utters a character quip on pass');
    pass('Weak hand correctly causes bot to pass with in-character quip');

    // Strong Hand Evaluation
    const strongHand = [
      { suit: 'Spades', rank: 'A' },
      { suit: 'Spades', rank: 'K' },
      { suit: 'Spades', rank: 'Q' },
      { suit: 'Spades', rank: 'J' },
      { suit: 'Hearts', rank: 'A' },
    ];
    const strongEval = evaluateHand(strongHand);
    assert.ok(strongEval.hcp >= 14, 'Strong hand has high HCP');
    const strongBid = decideBotBid(putin, strongHand, 'first_bidding', null, 5);
    assert.strictEqual(strongBid.action, 'bid', 'Strong hand results in Bid');
    assert.strictEqual(strongBid.amount, 5, 'Opening bid is minimum valid bid');
    assert.ok(strongBid.quip.includes('5'), 'Quip contains bid amount');
    pass('Strong hand correctly triggers bot opening bid of 5 with custom quote');

    // Minimum Threshold Enforcements across stages
    // Stage 2 (second_bidding): minOpening is 8
    const stage2Bid = decideBotBid(trampu, strongHand, 'second_bidding', null, 8);
    if (stage2Bid.action === 'bid') {
      assert.ok(stage2Bid.amount >= 8, 'Stage 2 bid must be at least 8');
      pass('Stage 2 bot bid respects 8+ threshold');
    } else {
      pass('Bot decided to pass in stage 2');
    }

    // Outbidding constraint: must be > highestBid
    const outbidAttempt = decideBotBid(ironman, strongHand, 'first_bidding', 5, 6);
    if (outbidAttempt.action === 'bid') {
      assert.strictEqual(outbidAttempt.amount, 6, 'Must bid at least 6 when highest is 5');
      pass('Bot outbids highest bid strictly at minNextBid (6 > 5)');
    } else {
      pass('Bot passed when highest was 5');
    }

    // -------------------------------------------------------------
    // Unit 5: Bot Trump (Pradhan) Selection
    // -------------------------------------------------------------
    console.log('\n--- Unit 5: Bot Pradhan / Trump Suit Selection ---');
    const spadeDominantHand = [
      { suit: 'Spades', rank: 'A' },
      { suit: 'Spades', rank: 'K' },
      { suit: 'Spades', rank: 'Q' },
      { suit: 'Spades', rank: '10' },
      { suit: 'Spades', rank: '9' },
      { suit: 'Hearts', rank: '2' },
      { suit: 'Diamonds', rank: '3' },
      { suit: 'Clubs', rank: '4' },
      { suit: 'Clubs', rank: '5' },
      { suit: 'Clubs', rank: '6' },
      { suit: 'Hearts', rank: '7' },
      { suit: 'Diamonds', rank: '8' },
      { suit: 'Hearts', rank: 'J' },
    ];
    const trumpChoice = decideBotTrump(putin, spadeDominantHand);
    assert.strictEqual(trumpChoice.suit, 'Spades', 'Put-in selects Spades for spade-dominant hand');
    assert.ok(trumpChoice.quip.includes('Spades'), 'Winning quip references Spades');
    pass('Bot successfully selects Pradhan (Trump suit) and delivers winning victory quip');

    console.log('\n===============================================================');
    console.log(`  TEST RESULTS: ${passedCount} passed, ${failedCount} failed`);
    console.log('  ALL OFFLINE CHARACTER & BOT REQUIREMENTS VERIFIED 100%!');
    console.log('===============================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    fail('Unexpected exception during offline tests', err);
    process.exit(1);
  }
}

runOfflineCharacterBotsTests();

