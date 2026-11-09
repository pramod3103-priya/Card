import { GameState } from '../engine/GameState.js';

export const SEAT_NAMES = ['South', 'West', 'North', 'East'];
export const DEFAULT_CHARACTERS = ['odi', 'putin', 'trampu', 'ironman'];
export const SEAT_COLORS = [
  '#f59e0b', // Amber / Gold (Seat 0 - South)
  '#3b82f6', // Sapphire Blue (Seat 1 - West)
  '#10b981', // Emerald Green (Seat 2 - North)
  '#ec4899', // Ruby Pink / Magenta (Seat 3 - East)
];

export class Room {
  /**
   * @param {string} roomCode
   * @param {string} hostPlayerId
   * @param {string} hostName
   * @param {string} hostSocketId
   * @param {string} hostReconnectToken
   * @param {number} gameTarget 31 | 41 | 51
   */
  constructor(roomCode, hostPlayerId, hostName, hostSocketId, hostReconnectToken, gameTarget = 31) {
    this.roomCode = roomCode;
    this.hostPlayerId = hostPlayerId;
    this.status = 'lobby'; // 'lobby' | 'table_preview'
    this.createdAt = Date.now();
    this.lastActivityAt = Date.now();
    this.gameTarget = [31, 41, 51].includes(Number(gameTarget)) ? Number(gameTarget) : 31;

    // 4 seats strictly
    this.seats = [null, null, null, null];

    // Authoritative game engine state
    this.gameState = new GameState(roomCode, this.gameTarget);

    // Assign host to seat 0
    this.seats[0] = {
      seatIndex: 0,
      seatName: SEAT_NAMES[0],
      playerId: hostPlayerId,
      socketId: hostSocketId,
      playerName: hostName,
      characterId: DEFAULT_CHARACTERS[0],
      avatarColor: SEAT_COLORS[0],
      isReady: false,
      isConnected: true,
      disconnectedAt: null,
      reconnectToken: hostReconnectToken,
      voiceState: {
        isMicOn: false,
        isMuted: true,
        isSpeaking: false,
      },
    };
  }

  touch() {
    this.lastActivityAt = Date.now();
  }

  /**
   * Assigns next available seat to a joining player.
   * @returns {{ seat: object, error: string|null }}
   */
  addPlayer(playerId, playerName, socketId, reconnectToken) {
    this.touch();

    // Find next empty seat
    const emptyIndex = this.seats.findIndex((seat) => seat === null);
    if (emptyIndex === -1) {
      return { seat: null, error: 'Room is full (maximum 4 players).' };
    }

    const newSeat = {
      seatIndex: emptyIndex,
      seatName: SEAT_NAMES[emptyIndex],
      playerId,
      socketId,
      playerName,
      characterId: DEFAULT_CHARACTERS[emptyIndex] || 'odi',
      avatarColor: SEAT_COLORS[emptyIndex],
      isReady: false,
      isConnected: true,
      disconnectedAt: null,
      reconnectToken,
      voiceState: {
        isMicOn: false,
        isMuted: true,
        isSpeaking: false,
      },
    };

    this.seats[emptyIndex] = newSeat;
    return { seat: newSeat, error: null };
  }

  getSeatByPlayerId(playerId) {
    return this.seats.find((s) => s && s.playerId === playerId) || null;
  }

  getSeatBySocketId(socketId) {
    return this.seats.find((s) => s && s.socketId === socketId) || null;
  }

  getSeatByReconnectToken(token) {
    if (!token) return null;
    return this.seats.find((s) => s && s.reconnectToken === token) || null;
  }

  getPlayerHand(playerId) {
    const seat = this.getSeatByPlayerId(playerId);
    if (!seat) return [];
    return this.gameState.getPlayerHand(seat.seatIndex);
  }

  getPlayerCount() {
    return this.seats.filter((s) => s !== null).length;
  }

  getConnectedPlayerCount() {
    return this.seats.filter((s) => s !== null && s.isConnected).length;
  }

  isFull() {
    return this.getPlayerCount() === 4;
  }

  isAllReady() {
    if (!this.isFull()) return false;
    return this.seats.every((s) => s !== null && s.isConnected && s.isReady);
  }

  canStartPreview() {
    return this.isFull() && this.isAllReady();
  }

  toggleReady(playerId) {
    this.touch();
    const seat = this.getSeatByPlayerId(playerId);
    if (!seat) return { success: false, error: 'Player not found in room.' };

    seat.isReady = !seat.isReady;
    return { success: true, isReady: seat.isReady, playerName: seat.playerName };
  }

  /**
   * Sets a player's selected animated character.
   */
  selectCharacter(socketOrPlayerId, characterId) {
    this.touch();
    const seat = this.getSeatBySocketId(socketOrPlayerId) || this.getSeatByPlayerId(socketOrPlayerId);
    if (!seat) {
      return { success: false, error: 'Player seat not found in room.' };
    }
    const validCharacters = ['odi', 'putin', 'trampu', 'ironman'];
    if (!validCharacters.includes(characterId)) {
      return { success: false, error: 'Invalid character choice.' };
    }
    seat.characterId = characterId;
    return {
      success: true,
      seat,
      roomState: this.getPublicState(),
    };
  }

  startPreview(requesterPlayerId) {
    this.touch();
    if (requesterPlayerId !== this.hostPlayerId) {
      return { success: false, error: 'Only the host can start the table preview.' };
    }
    if (!this.canStartPreview()) {
      return { success: false, error: 'All 4 players must be connected and ready to start.' };
    }
    this.status = 'table_preview';
    return { success: true };
  }

  /**
   * Starts game and deals Stage 2 (First deal: 5 cards per player).
   */
  dealCards(requesterPlayerId) {
    this.touch();
    if (requesterPlayerId !== this.hostPlayerId) {
      return { success: false, error: 'Only the host can deal cards.' };
    }
    if (this.status !== 'table_preview') {
      return { success: false, error: 'Table must be active to deal cards.' };
    }
    if (!this.isFull()) {
      return { success: false, error: 'All 4 seats must be occupied to deal cards.' };
    }
    if (this.getConnectedPlayerCount() !== 4) {
      return { success: false, error: 'All 4 players must be connected to deal cards.' };
    }
    if (this.gameState.stage !== 'waiting_for_players') {
      return { success: false, error: 'Cards have already been dealt for this game.' };
    }

    const { hands, publicState } = this.gameState.startNewGame();
    return {
      success: true,
      hands,
      publicGameState: publicState,
    };
  }

  /**
   * Advances to the next stage among the 8 visual game stages.
   */
  advanceStage(requesterPlayerId) {
    this.touch();
    if (requesterPlayerId !== this.hostPlayerId) {
      return { success: false, error: 'Only the host can advance game stages.' };
    }
    if (this.status !== 'table_preview') {
      return { success: false, error: 'Table must be active.' };
    }

    const { hands, publicState } = this.gameState.advanceStage();
    return {
      success: true,
      hands,
      publicGameState: publicState,
    };
  }

  /**
   * Directly sets one of the 8 game stages.
   */
  setStage(requesterPlayerId, targetStage) {
    this.touch();
    if (requesterPlayerId !== this.hostPlayerId) {
      return { success: false, error: 'Only the host can set game stage.' };
    }

    const { hands, publicState } = this.gameState.setStage(targetStage);
    return {
      success: true,
      hands,
      publicGameState: publicState,
    };
  }

  returnToLobby(requesterPlayerId) {
    this.touch();
    if (requesterPlayerId !== this.hostPlayerId) {
      return { success: false, error: 'Only the host can return the table to the lobby.' };
    }
    this.status = 'lobby';
    this.gameState.reset();
    return { success: true };
  }

  /**
   * Sets dealer seat position (Host only).
   */
  setDealer(requesterPlayerId, seatIndex) {
    this.touch();
    if (requesterPlayerId !== this.hostPlayerId) {
      return { success: false, error: 'Only the host can configure the dealer seat.' };
    }
    const idx = Number(seatIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) {
      return { success: false, error: 'Invalid seat index. Must be 0, 1, 2, or 3.' };
    }

    this.gameState.setDealer(idx);
    return {
      success: true,
      dealerSeatIndex: this.gameState.dealerSeatIndex,
      biddingOrder: this.gameState.getBiddingOrder(),
      roomState: this.getPublicState(),
    };
  }

  /**
   * Rotates dealer clockwise (Host only).
   */
  rotateDealer(requesterPlayerId) {
    this.touch();
    if (requesterPlayerId !== this.hostPlayerId) {
      return { success: false, error: 'Only the host can rotate the dealer seat.' };
    }

    const newDealer = this.gameState.rotateDealer();
    return {
      success: true,
      dealerSeatIndex: newDealer,
      biddingOrder: this.gameState.getBiddingOrder(),
      roomState: this.getPublicState(),
    };
  }

  /**
   * Configures starting bidder seat index (Host only).
   */
  setFirstBidder(requesterPlayerId, seatIndex, keepDealerLast = false) {
    this.touch();
    if (requesterPlayerId !== this.hostPlayerId) {
      return { success: false, error: 'Only the host can configure the starting bidder.' };
    }
    const idx = Number(seatIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) {
      return { success: false, error: 'Invalid first bidder index. Must be 0, 1, 2, or 3.' };
    }

    this.gameState.setFirstBidder(idx, keepDealerLast);
    return {
      success: true,
      firstBidderSeatIndex: this.gameState.firstBidderSeatIndex,
      dealerSeatIndex: this.gameState.dealerSeatIndex,
      biddingOrder: this.gameState.getBiddingOrder(),
      roomState: this.getPublicState(),
    };
  }

  /**
   * Places a bid for the active player.
   */
  placeBid(playerId, amount) {
    this.touch();
    const seat = this.getSeatByPlayerId(playerId);
    if (!seat) {
      return { success: false, error: 'Player is not seated in this room.' };
    }

    try {
      const result = this.gameState.placeBid(seat.seatIndex, amount);
      return {
        success: true,
        player: seat,
        amount,
        bidding: result,
        roomState: this.getPublicState(),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Passes the bidding turn for the active player.
   */
  passBid(playerId, { timedOut = false } = {}) {
    this.touch();
    const seat = this.getSeatByPlayerId(playerId);
    if (!seat) {
      return { success: false, error: 'Player is not seated in this room.' };
    }

    try {
      const result = this.gameState.passBid(seat.seatIndex, { allowExpired: timedOut });
      return {
        success: true,
        player: seat,
        bidding: result,
        roomState: this.getPublicState(),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Chooses the Pradhan / Trump Suit (Winning bidder only).
   */
  chooseTrump(playerId, suit) {
    this.touch();
    const seat = this.getSeatByPlayerId(playerId);
    if (!seat) {
      return { success: false, error: 'Player is not seated in this room.' };
    }

    try {
      const result = this.gameState.chooseTrump(seat.seatIndex, suit);
      return {
        success: true,
        player: seat,
        trumpSuit: result.trumpSuit,
        pradhanSuit: result.pradhanSuit,
        pradhanLabel: result.pradhanLabel,
        pradhanSymbol: result.pradhanSymbol,
        roomState: this.getPublicState(),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Alias conforming to PRADHAN Trump Suit Selection specification.
   */
  selectPradhan(playerId, suit) {
    return this.chooseTrump(playerId, suit);
  }

  /**
   * Triggers the PRO CARD flexible bid increase phase (all 4 players bid 10).
   */
  triggerAllPlayersBid10(requesterPlayerId) {
    this.touch();
    if (requesterPlayerId !== this.hostPlayerId) {
      return { success: false, error: 'Only the host can trigger the flexible bid increase rule.' };
    }
    const publicState = this.gameState.triggerAllPlayersBid10();
    return {
      success: true,
      roomState: this.getPublicState(),
    };
  }

  /**
   * Performs an independent flexible bid increase for a player.
   */
  flexibleIncreaseBid(playerId, amount) {
    this.touch();
    const seat = this.getSeatByPlayerId(playerId);
    if (!seat) {
      return { success: false, error: 'Player is not seated in this room.' };
    }
    try {
      this.gameState.flexibleIncreaseBid(seat.seatIndex, amount);
      return {
        success: true,
        player: seat,
        amount,
        roomState: this.getPublicState(),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Passes the flexible bid increase turn for a player (keeping bid at 10).
   */
  flexiblePass(playerId, { timedOut = false } = {}) {
    this.touch();
    const seat = this.getSeatByPlayerId(playerId);
    if (!seat) {
      return { success: false, error: 'Player is not seated in this room.' };
    }
    try {
      this.gameState.flexiblePass(seat.seatIndex, { allowExpired: timedOut });
      return {
        success: true,
        player: seat,
        roomState: this.getPublicState(),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Triggers the PRO CARD flexible bid increase phase (all 4 players bid 10).
   */
  triggerAllPlayersBid10(requesterPlayerId) {
    this.touch();
    if (requesterPlayerId !== this.hostPlayerId) {
      return { success: false, error: 'Only the host can trigger the flexible bid increase rule.' };
    }
    const publicState = this.gameState.triggerAllPlayersBid10();
    return {
      success: true,
      roomState: this.getPublicState(),
    };
  }

  /**
   * Performs an independent flexible bid increase for a player.
   */
  flexibleIncreaseBid(playerId, amount) {
    this.touch();
    const seat = this.getSeatByPlayerId(playerId);
    if (!seat) {
      return { success: false, error: 'Player is not seated in this room.' };
    }
    try {
      this.gameState.flexibleIncreaseBid(seat.seatIndex, amount);
      return {
        success: true,
        player: seat,
        amount,
        roomState: this.getPublicState(),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Configures bidding rules (Host only).
   */
  setBiddingConfig(requesterPlayerId, customConfig) {
    this.touch();
    if (requesterPlayerId !== this.hostPlayerId) {
      return { success: false, error: 'Only the host can configure bidding parameters.' };
    }
    this.gameState.setBiddingConfig(customConfig);
    return {
      success: true,
      biddingConfig: this.gameState.biddingConfig,
      roomState: this.getPublicState(),
    };
  }

  /**
   * Plays a card from a player's hand into the active trick.
   */
  playCard(socketOrPlayerId, card) {
    this.touch();
    const seat =
      this.getSeatBySocketId(socketOrPlayerId) || this.getSeatByPlayerId(socketOrPlayerId);
    if (!seat) {
      return { success: false, error: 'Player is not seated in this room.' };
    }
    try {
      const result = this.gameState.playCard(seat.seatIndex, card);
      return {
        success: true,
        player: seat,
        playedCard: result.playedCard,
        trickCompleted: result.trickCompleted,
        completedTrickData: result.completedTrickData,
        roundCompleted: result.roundCompleted,
        completedRoundData: result.completedRoundData,
        matchOver: result.matchOver,
        matchWinnerSeatIndex: result.matchWinnerSeatIndex,
        newHand: this.gameState.getPlayerHand(seat.seatIndex),
        roomState: this.getPublicState(),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Resets match for "Play Again" (Host only).
   */
  resetMatch(socketOrPlayerId) {
    this.touch();
    const seat =
      this.getSeatBySocketId(socketOrPlayerId) || this.getSeatByPlayerId(socketOrPlayerId);
    if (!seat || seat.playerId !== this.hostPlayerId) {
      return { success: false, error: 'Only the room host can reset the match.' };
    }
    this.gameState.resetMatch();
    return {
      success: true,
      roomState: this.getPublicState(),
    };
  }

  /**
   * Advances to next round (Host only).
   */
  advanceRound(socketOrPlayerId) {
    this.touch();
    const seat =
      this.getSeatBySocketId(socketOrPlayerId) || this.getSeatByPlayerId(socketOrPlayerId);
    if (!seat || seat.playerId !== this.hostPlayerId) {
      return { success: false, error: 'Only the room host can start the next round.' };
    }
    const result = this.gameState.advanceToNextRound();
    if (result && result.error) {
      return { success: false, error: result.error };
    }
    return {
      success: true,
      roomState: this.getPublicState(),
    };
  }

  /**
   * Clears the current trick cards.
   */
  clearTrick(socketOrPlayerId) {
    this.touch();
    this.gameState.clearTrick();
    return {
      success: true,
      roomState: this.getPublicState(),
    };
  }

  handleSocketDisconnect(socketId) {
    this.touch();
    const seat = this.getSeatBySocketId(socketId);
    if (!seat) return null;

    seat.isConnected = false;
    seat.disconnectedAt = Date.now();
    seat.voiceState = {
      isMicOn: false,
      isMuted: true,
      isSpeaking: false,
    };
    return seat;
  }

  handleReconnect(reconnectToken, newSocketId) {
    this.touch();
    const seat = this.getSeatByReconnectToken(reconnectToken);
    if (!seat) return null;

    seat.socketId = newSocketId;
    seat.isConnected = true;
    seat.disconnectedAt = null;
    seat.voiceState = {
      isMicOn: false,
      isMuted: true,
      isSpeaking: false,
    };
    return seat;
  }

  removePlayer(playerId) {
    this.touch();
    const seatIndex = this.seats.findIndex((s) => s && s.playerId === playerId);
    if (seatIndex === -1) return null;

    const removedPlayer = this.seats[seatIndex];
    this.seats[seatIndex] = null;

    this.gameState.reset();
    if (this.status === 'table_preview') {
      this.status = 'lobby';
    }

    if (this.hostPlayerId === playerId) {
      const nextSeat =
        this.seats.find((s) => s !== null && s.isConnected) ||
        this.seats.find((s) => s !== null);
      if (nextSeat) {
        this.hostPlayerId = nextSeat.playerId;
      } else {
        this.hostPlayerId = null;
      }
    }

    return removedPlayer;
  }

  isAbandoned(gracePeriodMs) {
    const activeSeats = this.seats.filter((s) => s !== null);
    if (activeSeats.length === 0) return true;

    const now = Date.now();
    const allTimedOut = activeSeats.every(
      (s) => !s.isConnected && now - (s.disconnectedAt || s.createdAt) > gracePeriodMs
    );
    return allTimedOut;
  }

  /**
   * Retrieves active voice peers in this room, optionally excluding a specific socket.
   */
  getActiveVoicePeers(excludeSocketId = null) {
    return this.seats
      .filter((s) => s && s.isConnected && s.socketId && s.socketId !== excludeSocketId)
      .map((s) => ({
        socketId: s.socketId,
        playerId: s.playerId,
        seatIndex: s.seatIndex,
        playerName: s.playerName,
        voiceState: s.voiceState || { isMicOn: false, isMuted: true, isSpeaking: false },
      }));
  }

  /**
   * Updates a player's microphone / speaking voice status.
   */
  updateVoiceStatus(socketId, voiceStatus = {}) {
    this.touch();
    const seat = this.getSeatBySocketId(socketId);
    if (!seat) return null;
    seat.voiceState = {
      isMicOn: typeof voiceStatus.isMicOn === 'boolean' ? voiceStatus.isMicOn : (seat.voiceState?.isMicOn || false),
      isMuted: typeof voiceStatus.isMuted === 'boolean' ? voiceStatus.isMuted : (seat.voiceState?.isMuted ?? true),
      isSpeaking: typeof voiceStatus.isSpeaking === 'boolean' ? voiceStatus.isSpeaking : false,
    };
    return {
      seatIndex: seat.seatIndex,
      playerId: seat.playerId,
      socketId: seat.socketId,
      voiceState: seat.voiceState,
    };
  }

  getPublicState() {
    return {
      roomCode: this.roomCode,
      status: this.status,
      hostPlayerId: this.hostPlayerId,
      playerCount: this.getPlayerCount(),
      connectedCount: this.getConnectedPlayerCount(),
      maxPlayers: 4,
      isAllReady: this.isAllReady(),
      canStart: this.canStartPreview(),
      gameTarget: this.gameTarget,
      gameState: this.gameState.getPublicState(),
      seats: this.seats.map((seat, index) => {
        if (!seat) {
          return {
            seatIndex: index,
            seatName: SEAT_NAMES[index],
            isEmpty: true,
          };
        }
        return {
          seatIndex: index,
          seatName: seat.seatName,
          playerId: seat.playerId,
          socketId: seat.socketId,
          playerName: seat.playerName,
          characterId: seat.characterId || DEFAULT_CHARACTERS[index] || 'odi',
          avatarColor: seat.avatarColor,
          isHost: seat.playerId === this.hostPlayerId,
          isReady: seat.isReady,
          isConnected: seat.isConnected,
          disconnectedAt: seat.disconnectedAt,
          voiceState: seat.voiceState || { isMicOn: false, isMuted: true, isSpeaking: false },
          isEmpty: false,
        };
      }),
      createdAt: this.createdAt,
    };
  }
}
