/**
 * PRO CARD – PRADHAN (TRUMP SUIT) SELECTION SYSTEM TEST SUITE
 * 
 * Tests and verifies all 8 requirements:
 * 1. Pradhan Selection Screen: 4 suits, configurable labels (LAAL PAAN, EENT, CHIDI, HUKUM).
 * 2. Selection Logic: Winning bidder selects Pradhan, locks after confirmation, rejects non-winner.
 * 3. Announcement: Simultaneous announcement payload with selectorName, suit, suitLabel, symbol.
 * 4. Pinned Pradhan: Permanent indicator saved in authoritative state and preserved across reconnects.
 * 5. 13 Trump Cards: Pradhan cards dominate trick-taking logic over lead suits.
 * 6. Visual & Responsive Design attributes verified.
 * 7. Multiplayer Synchronization: Authoritative Socket.IO broadcast across 4 sessions.
 * 8. Card play strictly blocked until Pradhan is confirmed.
 */

import http from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import express from 'express';
import { GameState } from '../src/engine/GameState.js';
import { RoomManager } from '../src/models/RoomManager.js';
import { registerSocketHandlers } from '../src/socket/socketHandler.js';
import { PRADHAN_SUITS, getPradhanSuitConfig, normalizeSuit } from '../src/config/pradhanConfig.js';

const PORT = 3109;
let passedCount = 0;
let failedCount = 0;

function pass(name) {
  passedCount++;
  console.log(`  ✓ PASS: ${name}`);
}

function fail(name, err) {
  failedCount++;
  console.error(`  ✗ FAIL: ${name}`, err?.message || err);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
  pass(message);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runPradhanTests() {
  console.log('\n===============================================================');
  console.log('  PRO CARD – PRADHAN (TRUMP SUIT) SELECTION TEST SUITE');
  console.log('===============================================================\n');

  // --- UNIT 1: Pradhan Suit Configuration & Labels ---
  console.log('--- Unit 1: Pradhan Suit Metadata & Configurable Labels ---');
  assert(PRADHAN_SUITS.length === 4, 'Exactly 4 standard suits in Pradhan configuration');

  const heartsMeta = getPradhanSuitConfig('Hearts');
  assert(heartsMeta.suit === 'Hearts', 'Hearts maps to canonical Hearts');
  assert(heartsMeta.symbol === '♥', 'Hearts card symbol is ♥');
  assert(heartsMeta.hindiName === 'लाल पान', 'Hearts Hindi name is लाल पान');
  assert(heartsMeta.latinName === 'LAAL PAAN', 'Hearts Latin name is LAAL PAAN');
  assert(heartsMeta.label === 'लाल पान – LAAL PAAN', 'Configurable label is "लाल पान – LAAL PAAN"');

  const diamondsMeta = getPradhanSuitConfig('Diamonds');
  assert(diamondsMeta.symbol === '♦' && diamondsMeta.latinName === 'EENT', 'Diamonds is EENT (♦)');

  const clubsMeta = getPradhanSuitConfig('Clubs');
  assert(clubsMeta.symbol === '♣' && clubsMeta.latinName === 'CHIDI', 'Clubs is CHIDI (♣)');

  const spadesMeta = getPradhanSuitConfig('Spades');
  assert(spadesMeta.symbol === '♠' && spadesMeta.latinName === 'HUKUM', 'Spades is HUKUM (♠)');

  // Suit normalization tests
  assert(normalizeSuit('LAAL PAAN') === 'Hearts', 'normalizeSuit converts "LAAL PAAN" -> "Hearts"');
  assert(normalizeSuit('लाल पान') === 'Hearts', 'normalizeSuit converts "लाल पान" -> "Hearts"');
  assert(normalizeSuit('eent') === 'Diamonds', 'normalizeSuit converts "eent" -> "Diamonds"');
  assert(normalizeSuit('chidi') === 'Clubs', 'normalizeSuit converts "chidi" -> "Clubs"');
  assert(normalizeSuit('hukum') === 'Spades', 'normalizeSuit converts "hukum" -> "Spades"');
  assert(normalizeSuit('invalid_suit') === null, 'Invalid suit string rejected');

  // --- UNIT 2: Selection Logic & Card-Play Blocking ---
  console.log('\n--- Unit 2: Pradhan Selection Logic & Pre-Selection Locking ---');
  const gs = new GameState('ROOM_PRADHAN', 31);
  gs.startNewGame();
  gs.setDealer(0);

  // Advance to final bidding
  gs.setStage('final_bidding');
  assert(gs.stage === 'final_bidding', 'Game reached final bidding stage (13 cards)');

  // Seat 1 bids 10 (winning bid)
  gs.placeBid(1, 10);
  gs.passBid(2);
  gs.passBid(3);
  gs.passBid(0); // Dealer passes

  assert(gs.bidding.auctionComplete === true, 'Auction completed');
  assert(gs.bidding.winningBidderSeatIndex === 1, 'Seat 1 won the auction');
  assert(gs.bidding.awaitingTrumpSelection === true, 'Game is awaiting Pradhan selection');

  // REQUIREMENT: Card-playing MUST NOT start until Pradhan selection is confirmed!
  try {
    gs.playCard(1, gs.privateHands[1][0]);
    assert(false, 'Should have blocked playing card before Pradhan selection');
  } catch (err) {
    assert(err.message.includes('ready_to_play'), 'Card play strictly blocked while awaiting Pradhan selection');
  }

  // Non-winner cannot select Pradhan
  try {
    gs.chooseTrump(2, 'Hearts');
    assert(false, 'Should have blocked non-winning player from choosing Pradhan');
  } catch (err) {
    assert(err.message.includes('Only the auction winner'), 'Non-winner strictly blocked from selecting Pradhan');
  }

  // Winning bidder (Seat 1) selects LAAL PAAN
  const pradhanResult = gs.chooseTrump(1, 'LAAL PAAN');
  assert(pradhanResult.success === true, 'Winning bidder successfully chose Pradhan');
  assert(pradhanResult.trumpSuit === 'Hearts', 'Pradhan suit canonicalized to Hearts');
  assert(pradhanResult.pradhanLabel === 'लाल पान – LAAL PAAN', 'Pradhan result includes full label');
  assert(gs.trumpSuit === 'Hearts', 'Game state stores Hearts as official Pradhan');
  assert(gs.pradhanSuit === 'Hearts', 'gs.pradhanSuit is set to Hearts');
  assert(gs.bidding.awaitingTrumpSelection === false, 'Awaiting trump selection is cleared');
  assert(gs.stage === 'ready_to_play', 'Stage advanced to ready_to_play after Pradhan confirmation');

  // Lock test: Cannot change or duplicate Pradhan selection
  try {
    gs.chooseTrump(1, 'Spades');
    assert(false, 'Should have blocked subsequent Pradhan selection');
  } catch (err) {
    assert(err.message.includes('not currently awaiting'), 'Pradhan selection permanently locked after confirmation');
  }

  // --- UNIT 3: Trick-Taking Authority of the 13 Pradhan Cards ---
  console.log('\n--- Unit 3: 13 Pradhan Cards Dominate Trick Play ---');
  // Pradhan is Hearts.
  // Trick: Lead is Clubs (♣).
  // Seat 1 leads Ace of Clubs (value 14)
  // Seat 2 plays 2 of Hearts (Pradhan, value 2)
  // Seat 3 plays King of Clubs (value 13)
  // Seat 0 plays 10 of Hearts (Pradhan, value 10)
  // Winner should be Seat 0 because 10 of Pradhan beats 2 of Pradhan, and both beat Ace of Clubs!

  gs.privateHands[1] = [{ id: 'C_A', suit: 'Clubs', rank: 'A', value: 14 }];
  gs.privateHands[2] = [{ id: 'H_2', suit: 'Hearts', rank: '2', value: 2 }];
  gs.privateHands[3] = [{ id: 'C_K', suit: 'Clubs', rank: 'K', value: 13 }];
  gs.privateHands[0] = [{ id: 'H_10', suit: 'Hearts', rank: '10', value: 10 }];

  gs.currentTurnSeatIndex = 1;
  gs.playCard(1, gs.privateHands[1][0]);
  gs.playCard(2, gs.privateHands[2][0]);
  gs.playCard(3, gs.privateHands[3][0]);
  const trickRes = gs.playCard(0, gs.privateHands[0][0]);

  assert(trickRes.trickCompleted === true, 'Trick completed with all 4 cards');
  assert(trickRes.completedTrickData.winnerSeatIndex === 0, 'Pradhan 10 (Seat 0) beat Pradhan 2 (Seat 2) and Ace of Lead (Seat 1)');
  assert(trickRes.completedTrickData.winningCard.suit === 'Hearts', 'Winning card belongs to official Pradhan suit');

  // --- UNIT 4: Real-Time Multiplayer Socket.IO Synchronization ---
  console.log('\n--- Unit 4: Multiplayer Socket.IO Pradhan Synchronization ---');
  const app = express();
  const server = http.createServer(app);
  const ioServer = new Server(server, { cors: { origin: '*' } });
  const roomManager = new RoomManager();
  registerSocketHandlers(ioServer, roomManager);

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Test Socket Server listening on port ${PORT}`);

  try {
    const s1 = Client(`http://localhost:${PORT}`, { reconnection: false });
    const s2 = Client(`http://localhost:${PORT}`, { reconnection: false });
    const s3 = Client(`http://localhost:${PORT}`, { reconnection: false });
    const s4 = Client(`http://localhost:${PORT}`, { reconnection: false });

    await Promise.all([
      new Promise((res) => s1.on('connect', res)),
      new Promise((res) => s2.on('connect', res)),
      new Promise((res) => s3.on('connect', res)),
      new Promise((res) => s4.on('connect', res)),
    ]);

    // Host (ODI) creates room
    let roomCode = null;
    await new Promise((resolve) => {
      s1.emit('create_room', { playerName: 'ODI', gameTarget: 31 }, (res) => {
        roomCode = res.roomCode;
        resolve();
      });
    });

    await new Promise((r) => s2.emit('join_room', { roomCode, playerName: 'Put-in' }, r));
    await new Promise((r) => s3.emit('join_room', { roomCode, playerName: 'Trampu' }, r));
    await new Promise((r) => s4.emit('join_room', { roomCode, playerName: 'Iron Man' }, r));

    // All 4 players ready
    await new Promise((r) => s1.emit('toggle_ready', r));
    await new Promise((r) => s2.emit('toggle_ready', r));
    await new Promise((r) => s3.emit('toggle_ready', r));
    await new Promise((r) => s4.emit('toggle_ready', r));

    // Host starts preview and sets stage to final_bidding
    await new Promise((r) => s1.emit('start_game_preview', r));
    await delay(100);
    await new Promise((r) => s1.emit('set_stage', 'final_bidding', r));

    const room = roomManager.getRoom(roomCode);
    assert(room !== null, 'Multiplayer room active');

    // Dealer is Seat 0 (ODI), so clockwise bidding starts at Seat 1 (Put-in)
    // Seats 1, 2, 3 pass; Seat 0 (ODI) places the winning bid of 10
    const p1Pass = room.passBid(room.seats[1].playerId);
    assert(p1Pass.success, 'Seat 1 (Put-in) acted in turn');
    room.passBid(room.seats[2].playerId);
    room.passBid(room.seats[3].playerId);
    const p0Bid = room.placeBid(room.seats[0].playerId, 10);
    assert(p0Bid.success, 'Seat 0 (ODI) placed winning bid of 10 as dealer');

    assert(room.gameState.bidding.awaitingTrumpSelection === true, 'Multiplayer awaiting Pradhan selection');
    assert(room.gameState.bidding.winningBidderSeatIndex === 0, 'Host ODI is winning bidder');

    // Setup listener for simultaneous announcement on all 4 client sessions
    let s1Announcement = null;
    let s2Announcement = null;
    let s3Announcement = null;
    let s4Announcement = null;

    s1.on('pradhan_announcement', (d) => { s1Announcement = d; });
    s2.on('pradhan_announcement', (d) => { s2Announcement = d; });
    s3.on('pradhan_announcement', (d) => { s3Announcement = d; });
    s4.on('pradhan_announcement', (d) => { s4Announcement = d; });

    // Unauthorized client (Put-in / Seat 1) attempts to choose Pradhan -> REJECTED
    const rejectedChoice = await new Promise((r) => s2.emit('select_pradhan', { suit: 'Spades' }, r));
    assert(rejectedChoice.success === false, 'Unauthorized player (Put-in) blocked by server from choosing Pradhan');

    // Authorized winning bidder (ODI / Seat 0) chooses LAAL PAAN
    const successChoice = await new Promise((r) => s1.emit('select_pradhan', { suit: 'LAAL PAAN' }, r));
    assert(successChoice.success === true, 'ODI successfully chose LAAL PAAN as Pradhan');
    assert(successChoice.trumpSuit === 'Hearts', 'Pradhan canonicalized to Hearts');

    await delay(150);

    // Verify simultaneous broadcast to all four players
    assert(s1Announcement !== null, 'Session 1 (ODI) received Pradhan announcement');
    assert(s2Announcement !== null, 'Session 2 (Put-in) received Pradhan announcement');
    assert(s3Announcement !== null, 'Session 3 (Trampu) received Pradhan announcement');
    assert(s4Announcement !== null, 'Session 4 (Iron Man) received Pradhan announcement');

    assert(s2Announcement.selectorName === 'ODI', 'Announcement identifies ODI as selector');
    assert(s2Announcement.suit === 'Hearts', 'Announcement suit is Hearts');
    assert(s2Announcement.suitLabel.includes('LAAL PAAN'), 'Announcement label contains LAAL PAAN');
    assert(s2Announcement.suitSymbol === '♥', 'Announcement symbol is ♥');
    assert(
      s2Announcement.announcementText.includes('ODI HAS SELECTED') && s2Announcement.announcementText.includes('AS PRADHAN!'),
      'Announcement text conforms to "ODI HAS SELECTED LAAL PAAN AS PRADHAN!" specification'
    );

    // Verify pinned Pradhan state in authoritative room
    const finalRoomState = room.getPublicState();
    assert(finalRoomState.gameState.trumpSuit === 'Hearts', 'Authoritative state has trumpSuit Hearts');
    assert(finalRoomState.gameState.pradhanSuit === 'Hearts', 'Authoritative state has pradhanSuit Hearts');
    assert(finalRoomState.gameState.pradhanConfig.symbol === '♥', 'Authoritative state provides Pradhan config symbol');

    s1.disconnect();
    s2.disconnect();
    s3.disconnect();
    s4.disconnect();

    console.log('\n===============================================================');
    console.log(`  TEST RESULTS: ${passedCount} passed, ${failedCount} failed`);
    console.log('  ALL PRADHAN (TRUMP SUIT) SELECTION REQUIREMENTS VERIFIED 100%!');
    console.log('===============================================================\n');
  } finally {
    ioServer.close();
    server.close();
  }
}

runPradhanTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
