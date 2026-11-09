import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import { RoomManager } from '../src/models/RoomManager.js';
import { registerSocketHandlers } from '../src/socket/socketHandler.js';
import { PLAYABLE_CHARACTERS, assignOfflineSeats } from '../../client/src/data/characters.js';

const PORT = 3107;
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
  console.log('  PRO CARD – ANIMATED CHARACTERS & GAME TABLE TEST SUITE');
  console.log('===============================================================\n');

  // Start temporary test server
  app = express();
  server = http.createServer(app);
  ioServer = new SocketIOServer(server, { cors: { origin: '*' } });
  roomManager = new RoomManager();
  registerSocketHandlers(ioServer, roomManager);

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Test server running on port ${PORT}\n`);

  try {
    // --- Test 1: Offline vs Bots Character Auto-Assignment ---
    console.log('--- Test 1: Offline vs Bots Character Auto-Assignment ---');
    const allCharIds = ['odi', 'putin', 'trampu', 'ironman'];

    for (const chosenId of allCharIds) {
      const roster = assignOfflineSeats(chosenId);
      assert(roster.humanCharacter.id === chosenId, `Selected human character is ${chosenId.toUpperCase()}`);
      assert(roster.botOpponents.length === 3, 'Exactly 3 AI opponents generated');
      assert(!roster.botOpponents.some((b) => b.id === chosenId), 'Human character is not duplicated among bots');

      const allAssignedIds = [roster.humanCharacter.id, ...roster.botOpponents.map((b) => b.id)];
      assert(allAssignedIds.length === 4 && new Set(allAssignedIds).size === 4, 'All 4 distinct characters assigned');

      assert(roster.allSeats[0].position === 'bottom' && roster.allSeats[0].isHuman, 'Seat 0 is South / Human');
      assert(roster.allSeats[1].position === 'left' && !roster.allSeats[1].isHuman, 'Seat 1 is West / Bot');
      assert(roster.allSeats[2].position === 'top' && !roster.allSeats[2].isHuman, 'Seat 2 is North / Bot');
      assert(roster.allSeats[3].position === 'right' && !roster.allSeats[3].isHuman, 'Seat 3 is East / Bot');
    }

    // --- Test 2: Multiplayer Default Characters & Room State ---
    console.log('\n--- Test 2: Multiplayer Default Characters & Room State ---');
    const s1 = createSocketClient();
    const s2 = createSocketClient();
    const s3 = createSocketClient();
    const s4 = createSocketClient();

    let roomCode = null;

    // 1. Host creates room
    await new Promise((resolve) => {
      s1.emit('create_room', { playerName: 'Alice', gameTarget: 31 }, (res) => {
        assert(res.success, 'Host Alice created room');
        roomCode = res.roomCode;
        assert(res.roomState.seats[0].characterId === 'odi', 'Host Seat 0 default avatar is ODI');
        resolve();
      });
    });

    // 2. Bob, Charlie, Diana join room
    await new Promise((resolve) => {
      s2.emit('join_room', { roomCode, playerName: 'Bob' }, (res) => {
        assert(res.success, 'Bob joined room');
        assert(res.roomState.seats[1].characterId === 'putin', 'Seat 1 default avatar is Put-in');
        resolve();
      });
    });

    await new Promise((resolve) => {
      s3.emit('join_room', { roomCode, playerName: 'Charlie' }, (res) => {
        assert(res.success, 'Charlie joined room');
        assert(res.roomState.seats[2].characterId === 'trampu', 'Seat 2 default avatar is Trampu');
        resolve();
      });
    });

    await new Promise((resolve) => {
      s4.emit('join_room', { roomCode, playerName: 'Diana' }, (res) => {
        assert(res.success, 'Diana joined room');
        assert(res.roomState.seats[3].characterId === 'ironman', 'Seat 3 default avatar is Iron Man');
        resolve();
      });
    });

    // --- Test 3: Player Custom Character Selection & Broadcast ---
    console.log('\n--- Test 3: Player Custom Character Selection & Broadcast ---');

    // Bob changes character from 'putin' to 'ironman'
    let bobBroadcastReceived = false;
    let notificationReceived = false;

    s1.on('room_state_updated', (updatedState) => {
      if (updatedState.seats[1]?.characterId === 'ironman') {
        bobBroadcastReceived = true;
      }
    });

    s1.on('player_notification', (notif) => {
      if (notif.message.includes('Bob') && notif.message.includes('IRONMAN')) {
        notificationReceived = true;
      }
    });

    await new Promise((resolve) => {
      s2.emit('select_character', { characterId: 'ironman' }, (res) => {
        assert(res.success, 'Bob successfully selected Iron Man avatar');
        assert(res.characterId === 'ironman', 'Return confirmed character is ironman');
        resolve();
      });
    });

    await delay(200);
    assert(bobBroadcastReceived, 'Host s1 received room_state_updated with Bob = ironman');
    assert(notificationReceived, 'Host s1 received broadcast notification of Bob avatar choice');

    // Alice changes character from 'odi' to 'trampu'
    await new Promise((resolve) => {
      s1.emit('select_character', { characterId: 'trampu' }, (res) => {
        assert(res.success, 'Alice successfully selected Trampu avatar');
        assert(res.characterId === 'trampu', 'Return confirmed character is trampu');
        resolve();
      });
    });

    // Attempt invalid character selection
    await new Promise((resolve) => {
      s3.emit('select_character', { characterId: 'superman' }, (res) => {
        assert(!res.success, 'Superman correctly rejected as invalid character');
        assert(res.error.includes('Invalid'), 'Error message specifies invalid character choice');
        resolve();
      });
    });

    // --- Test 4: Persistence through Table Preview Start ---
    console.log('\n--- Test 4: Persistence through Table Preview Start ---');

    // Mark all 4 ready
    await new Promise((resolve) => s1.emit('toggle_ready', () => resolve()));
    await new Promise((resolve) => s2.emit('toggle_ready', () => resolve()));
    await new Promise((resolve) => s3.emit('toggle_ready', () => resolve()));
    await new Promise((resolve) => s4.emit('toggle_ready', () => resolve()));

    // Host starts preview
    await new Promise((resolve) => {
      s1.emit('start_game_preview', (res) => {
        assert(res.success, 'Host started table preview');
        resolve();
      });
    });

    await delay(200);

    // Verify room public state on table preserves chosen characters
    const activeRoom = roomManager.getRoom(roomCode);
    const pubState = activeRoom.getPublicState();
    assert(pubState.status === 'table_preview', 'Table is active in table_preview');
    assert(pubState.seats[0].characterId === 'trampu', 'Alice retained Trampu character avatar at table');
    assert(pubState.seats[1].characterId === 'ironman', 'Bob retained Iron Man character avatar at table');
    assert(pubState.seats[2].characterId === 'trampu', 'Charlie retained Trampu character avatar at table');
    assert(pubState.seats[3].characterId === 'ironman', 'Diana retained Iron Man character avatar at table');

    // Clean up sockets
    s1.disconnect();
    s2.disconnect();
    s3.disconnect();
    s4.disconnect();

    console.log('\n===============================================================');
    console.log(`  TEST RESULTS: ${passedCount} passed, ${failedCount} failed`);
    console.log('  ALL ANIMATED CHARACTERS & TABLE SEATS VERIFIED 100%!');
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

