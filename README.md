# MINUS – Online Multiplayer Card Game (Phase 1)

A real-time 4-player browser-based card game table foundation built with React, Vite, Node.js, Express, and Socket.IO.

---

## ♠ Project Architecture

```
Card/
├── client/                      # React + Vite Frontend
│   ├── src/
│   │   ├── context/
│   │   │   └── SocketContext.jsx   # Authoritative Socket.IO context & session persistence
│   │   ├── components/
│   │   │   ├── Header.jsx          # MINUS luxury navbar & connection indicators
│   │   │   ├── HomeScreen.jsx      # Create/Join room screen with invite detection
│   │   │   ├── LobbyScreen.jsx     # 4-Seat waiting lobby & Ready/Start controls
│   │   │   ├── PlayerSeat.jsx      # Seat cards with avatars, host crown, connection status
│   │   │   ├── CardTable.jsx       # Dark green felt card table with trick dropzones
│   │   │   ├── TableSeat.jsx       # Dynamic top-down player positions around table
│   │   │   ├── TableScreen.jsx     # Table view wrapper
│   │   │   ├── Phase2Placeholder.jsx # Clear Phase 2 gameplay rules indicator
│   │   │   └── NotificationToast.jsx # Non-intrusive notification toasts
│   │   ├── App.jsx                 # App root & state-based screen router
│   │   ├── index.css               # Modern CSS & luxury fonts
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js          # Configured on port 5173 with proxy
│   └── package.json
├── server/                      # Node.js + Express Backend
│   ├── src/
│   │   ├── config.js               # Port (3001) & timeout configurations
│   │   ├── models/
│   │   │   ├── Room.js             # Authoritative 4-seat room state machine
│   │   │   └── RoomManager.js      # Active rooms, token mapping & cleanup
│   │   ├── socket/
│   │   │   └── socketHandler.js    # Authorized Socket.IO event controllers
│   │   └── utils/
│   │       └── roomCode.js         # Non-ambiguous 6-character room codes & tokens
│   ├── tests/
│   │   └── multiplayer.test.js     # 43 assertions covering all 9 test scenarios
│   ├── server.js                   # Express + Socket.IO server entry point
│   └── package.json
├── .gitignore
├── .env.example
└── README.md
```

---

## 🎮 Features Included in Phase 1

1. **Authoritative Real-Time Architecture**:
   - Zero trust in client state: room membership, seat allocation, and host privileges are strictly validated on the server.
   - Clean 6-character room codes (`generateRoomCode()`), avoiding ambiguous characters (`0`, `O`, `1`, `I`).
   - Strict 4-player room limit: 5th player rejected with an informative error.

2. **Luxury Home Screen (Indian MINUS Theme)**:
   - MINUS gold/emerald casino styling with card suits (♠ ♥ ♦ ♣).
   - Custom player nickname entry with instant random name generator.
   - **Select Game Target**: Host selects Target: **31** (Quick), **41** (Classic), or **51** (Championship).
   - "Create Room" and "Join Room" tabs.
   - Automatic invite link detection: visiting `http://localhost:5173/?room=ABCDEF` auto-fills the room code.

3. **Multiplayer Lobby**:
   - 4-seat visual waiting room (South, West, North, East).
   - Prominently displays the selected Game Target (31, 41, or 51).
   - Player avatars, initials, host crown badge (👑), ready state, and connection indicators.
   - Ready / Not Ready toggle.
   - Host-only "Start Table Preview" button, strictly locked until all 4 players are seated and ready.
   - Live player capacity counter (0/4 to 4/4) with progress meter.

4. **Top-Down Card Table Interface & 8 Visual Stages**:
   - Premium dark green felt table with stitched leather rim, radial vignette, and gold inlays.
   - **8 Distinct Visual Stages**:
     1. `Waiting for players` (0 cards)
     2. `First deal: 5 cards per player`
     3. `First bidding stage` (5 cards in hand)
     4. `Second deal: 4 additional cards` (9 cards in hand)
     5. `Second bidding stage` (9 cards in hand)
     6. `Final deal: 4 additional cards` (13 cards in hand)
     7. `Final bidding stage` (13 cards in hand)
     8. `Ready to start card play` (13 cards in hand)
   - **Progressive Card Distribution**:
     - **Stage 1**: Deals 5 cards to every player privately, then starts the first bidding stage.
     - **Stage 2**: Deals 4 additional cards to every player (9 cards total), then starts the second bidding stage.
     - **Stage 3**: Deals final 4 cards to every player (13 cards total), then starts the final bidding stage.
     - Total: exactly 13 cards per player (52 cards total).
   - **Clockwise Bidding System**:
     - Bidding proceeds clockwise starting from the configured first bidder.
     - **Dealer strictly receives the last opportunity in the bidding cycle**.
     - First bidding stage (5 cards): opening bid $\ge 5$; subsequent bids must be at least $+1$ higher.
     - Second bidding stage (9 cards): bidding can reach 8 or higher.
     - Final bidding stage (13 cards): bidding can reach 10 or higher.
     - Every bid must strictly exceed the previous highest bid.
     - Pass is supported at every turn.
     - Bidding thresholds and pass-handling parameters are fully configurable.
   - **Pradhan / Trump Suit System**:
     - The winning bidder of the auction selects the Trump suit from Hearts, Diamonds, Clubs, or Spades.
     - **Hearts can also be selected as trump**.
     - The selected Trump suit applies equally to all 4 players and is highlighted on the card table and scoreboard.
     - **All-Pass Default**: If all players pass without placing a bid, **Spades (♠) automatically becomes the default Trump suit**.
   - **Scoreboard & Game Target**:
     - Displays selected target score (31, 41, or 51).
     - Live indicator for active Pradhan / Trump Suit and auction winning bid.
     - Placeholders strictly reserved for Phase 2 trick-taking, card ranking, and minus scoring.
   - **Opponent Hands**: Displayed face-down with realistic casino card back fans and live count badges.
   - **Player's Own Hand**: Displayed at the bottom, face-up, sorted by suit and descending rank with smooth hover lift and dealing animations.
   - **Interactive Stage Progress Stepper**: Interactive bar at table top allowing the host to advance sequentially or test any of the 8 stages.
   - **Privacy Enforcement**: Private card faces are unicast exclusively to each player's socket; public broadcasts never expose card faces.
   - **Authoritative multiplayer flow**: Rooms have exactly four seats, dealing is one-time per game, and bids/trump selection are validated against the server's active turn.
   - **Synchronized bidding clock**: Each bidding turn has a server-issued 10-second deadline. Clients render the shared deadline, and the server passes a player whose turn expires.
   - **Reconnect expiry**: A disconnected player's seat is reserved for 60 seconds; expired seats are removed and the room is updated for the remaining players.

5. **Disconnection & Reconnection Token Recovery**:
   - Disconnected players have their seat reserved during a 60-second grace period.
   - `reconnectToken` stored in browser `sessionStorage` allows players to refresh their browser tab or recover from a network drop without losing their seat.
   - **Tab-Isolated Multi-Session Testing**: Using `sessionStorage` allows developers and players to open 4 tabs or windows on `localhost:5173` simultaneously as 4 completely distinct players without session interference.

6. **In-Memory Storage Note**:
   - Active rooms are stored in server-side memory for optimal real-time performance.
   - *Note*: Restarting the backend server will clear active rooms.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or higher recommended, tested on Node v24)
- npm (v9 or higher)

### 1. Start the Backend Server (Port 3001)

```bash
cd server
npm install
npm start
```
The server will run at `http://localhost:3001` (health check at `http://localhost:3001/api/health`).

### 2. Start the Frontend Client (Port 5173)

In a separate terminal:
```bash
cd client
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 👥 Testing with Four Separate Browser Sessions

To test the 4-player multiplayer flow manually on a single machine:

1. **Tab 1 (Host - Alice)**:
   - Go to `http://localhost:5173`
   - Enter name "Alice" (or keep default moniker) and click **Create 4-Player Room**.
   - Note the 6-character room code (e.g. `7K2M9X`) or click **Copy Invite Link**.
2. **Tab 2 (Player 2 - Bob)**:
   - Open a new tab to `http://localhost:5173` (or paste the copied invite link).
   - Enter name "Bob", enter the 6-character room code, and click **Join Room**.
   - Bob is placed into Seat 2 (West). Alice's lobby updates in real time with a join notification.
3. **Tab 3 (Player 3 - Charlie)**:
   - Open a third tab, enter "Charlie", and join using the room code.
   - Charlie is placed into Seat 3 (North).
4. **Tab 4 (Player 4 - Diana)**:
   - Open a fourth tab, enter "Diana", and join using the room code.
   - Diana takes Seat 4 (East). The room capacity counter reaches **4/4 (Full Table)**.
5. **Fifth Player Rejection Check**:
   - Open a 5th tab and attempt to join. The server rejects the join with `"Room is full (4/4 players)"`.
6. **Ready Check**:
   - In each of the 4 tabs, click the **Ready Up** button.
   - All 4 tabs show green glowing READY badges in real time.
   - In Tab 1 (Host), the **Start Table Preview** button unlocks with an amber glow.
7. **Start Table Preview**:
   - Tab 1 clicks **Start Table Preview**.
   - All 4 tabs instantly transition together to the dark green casino felt card table.
   - Each player sees themselves at the bottom position (South / You) with opponents correctly rotated clockwise!
8. **Reconnect Test**:
   - Press **F5 (Refresh)** on Tab 2 (Bob).
   - Bob instantly reconnects into Seat 2 without asking for the code again. Tab 1, 3, and 4 see Bob reconnected!

---

## 🧪 Automated Testing

The project includes 8 comprehensive automated Socket.IO, game engine, and bot AI test suites:
- `server/tests/multiplayer.test.js`: 43 assertions verifying core room lifecycle & permissions
- `server/tests/four_sessions.test.js`: 36 assertions testing 4 distinct client browser sessions
- `server/tests/deck_and_dealing.test.js`: 89 assertions testing 52-card standard deck, phased batches & privacy
- `server/tests/eight_stages_gameplay.test.js`: 52 assertions verifying 8-stage sequence (5 -> 9 -> 13 cards) & target selection
- `server/tests/dealer_bidding_order.test.js`: 24 assertions verifying dealer seat position, clockwise sequence, dealer bidding last, and configurable first bidder
- `server/tests/progressive_bidding_trump.test.js`: 32 assertions verifying progressive distribution, bidding rules & thresholds, trump selection, all-pass default to Spades, and 4-session flow
- `server/tests/offline_character_bots.test.js`: 18 assertions verifying 4 playable characters, single-selection with automatic 3-bot assignment, bot AI hand evaluations, bidding thresholds, and trump selection
- `server/tests/flexible_bid_increase.test.js`: 12 assertions verifying the special "All 4 Players Bid 10" flexible increase rule, independent bids, non-+1 jumps, no forced matching, and ending conditions
- `server/tests/voice_chat_signaling.test.js`: 18 assertions verifying WebRTC STUN/TURN endpoint, 4-peer voice discovery, signaling forwarding, live speaking indicators, and cleanup on disconnect/leave

Run all test suites with:

```bash
cd server
npm test
```

**Result:** `324 passed, 0 failed (100% Passing)`

---

## 🎙️ PRO CARD – Live Voice Chat Feature

Real-time browser-to-browser voice communication for all 4 players in online multiplayer rooms using WebRTC mesh architecture.

### Key Capabilities:
1. **Live 4-Player Voice Communication**:
   - Every player in an online room can speak and hear live audio in real-time.
   - Low-latency Full-Mesh WebRTC audio ($\le 3$ peer connections per client).
2. **Independent Controls & Default Mic State**:
   - **Microphone is OFF by default**; `getUserMedia` is never requested on page load.
   - 🎙️ **Mic ON** / **Mic OFF** button requests mic permission and establishes audio.
   - 🔇 **Mute / Unmute** toggle allows muting audio transmission while keeping the microphone channel ready.
3. **Real-Time Visual Speaking Indicators**:
   - Animated glowing emerald aura (`ring-4 ring-emerald-400 animate-pulse`) illuminates the avatar of whoever is currently speaking.
   - Live **TALKING** pill and dynamic 3-bar audio waveform indicate active voice transmission.
   - Mic status badges (Mic ON, Muted, Mic OFF) displayed next to each player seat in both the Lobby and Table screens.
4. **STUN/TURN Configuration**:
   - Secure server endpoint `GET /api/ice-servers` supplies configured ICE servers.
   - Uses Google public STUN servers by default (`stun:stun.l.google.com:19302`).
   - Production TURN server credentials can be passed via `.env`: `TURN_SERVER_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`.
5. **Robust Audio Lifecycle & Clean Teardown**:
   - Exactly one `<audio>` element per peer connection in a ref map to eliminate echoes or duplicate audio streams.
   - All microphone tracks (`MediaStreamTrack.stop()`) and AudioContext analyzers are immediately halted when leaving a room or toggling mic OFF.
   - Graceful error modals provide clear instructions when microphone permission is denied or no audio input device is detected.
6. **Offline Bots Separation**:
   - Voice chat is strictly active in Online Multiplayer rooms and is automatically hidden in Offline vs Bots mode.

---

## 🤖 Offline vs Bots – Character Selection & PRO CARD Arena

A dedicated single-player offline mode against smart AI bots featuring the gray Chess-inspired theme and PRO CARD branding.

### 4 Playable Characters:
1. **ODI** (inspired by Narendra Modi) – *The Master Strategist*: Disciplined bidding, strategic patience, calculated moves.
2. **Put-in** (inspired by Vladimir Putin) – *The Cold Tactician*: Stoic, tactical realist, strong preference for Spades, ruthless auction pressure.
3. **Trampu** (inspired by Donald Trump) – *The Grand Dealmaker*: High-stakes aggressive bidder, escalating bids, bold trump calls.
4. **Iron Man** (Marvel superhero-inspired character) – *The High-Tech Genius*: J.A.R.V.I.S.-powered probability analytics, witty dialogue, adaptive card play.

### Special Rule: Flexible Bid Increase (When All 4 Players Have Bid 10):
- **Independent Bidding**: Every player's bid is strictly independent. Increasing one player's bid never changes another player's bid.
- **Flexible Jumps**: Players can increase by ANY chosen amount (e.g. $10 \rightarrow 11$, $10 \rightarrow 12$, $10 \rightarrow 13$, $10 \rightarrow 15$). Increases are not restricted to $+1$.
- **No Forced Competition**: If one player increases from $10 \rightarrow 13$, other players remain at 10 and are **NOT** required to match or exceed 13 (e.g. next player can choose 11 or 12).
- **PASS Option**: Each player can independently choose to increase or PASS (holding at 10).
- **Continuation**: If at least one player increases their bid, the highest bidder wins the auction and chooses Trump (Pradhan).
- **All Pass**: If all four players PASS and nobody increases, bidding ends and Spades (♠) automatically becomes default Trump according to existing game rules.

### Important Gameplay Rules:
- **Single Character Selection**: The human player selects **ONLY ONE** character.
- **Automatic Bot Opponents**: The remaining **THREE** characters automatically become AI-controlled BOT opponents.
  - *Example*: Select **ODI** $\rightarrow$ opponents automatically become **Put-in**, **Trampu**, and **Iron Man**.
  - *Example*: Select **Iron Man** $\rightarrow$ opponents automatically become **ODI**, **Put-in**, and **Trampu**.
- **PRO CARD Table Display**: All 4 characters are seated around the charcoal/slate Chess-inspired table:
  - **South (Bottom)**: Assigned to the human player (marked with `YOU`).
  - **West, North, East**: Assigned to the three bot opponents (clearly marked with `[BOT]` badges).
- **Distinct Personalities & Decision Making**:
  - Realistic thinking delays with status alerts (e.g., *"Put-in is calculating bid..."*).
  - Personality-driven dialogue speech bubbles when bidding, passing, or selecting trumps.
  - Strict stage-by-stage bidding thresholds ($5+$, $8+$, $10+$) and outbidding constraints.
- **Zero Impact on Online Multiplayer**: Online multiplayer Socket.IO rooms and lobbies remain 100% independent and unaffected.

---

## 🔜 Phase 2 Readiness

Online multiplayer already supports authoritative four-player rooms, private phased card dealing, synchronized bidding, and Pradhan selection. Phase 2 work still required includes card-play actions, trick legality and resolution, and minus scoring. The server currently does not accept or synchronize card plays.
