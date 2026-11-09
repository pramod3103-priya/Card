import { Room } from './Room.js';
import { generateRoomCode, generateToken, sanitizePlayerName, isValidRoomCode } from '../utils/roomCode.js';

export class RoomManager {
  /**
   * @param {number} gracePeriodMs
   */
  constructor(gracePeriodMs = 60000) {
    this.rooms = new Map(); // roomCode -> Room
    this.socketToPlayer = new Map(); // socketId -> { roomCode, playerId }
    this.reconnectTokens = new Map(); // reconnectToken -> { roomCode, playerId, playerName }
    this.gracePeriodMs = gracePeriodMs;
  }

  /**
   * Creates a new room with host.
   */
  createRoom(hostRawName, socketId, gameTarget = 31) {
    const hostName = sanitizePlayerName(hostRawName);
    let roomCode = generateRoomCode();
    // Ensure uniqueness
    let attempts = 0;
    while (this.rooms.has(roomCode) && attempts < 10) {
      roomCode = generateRoomCode();
      attempts++;
    }

    const hostPlayerId = generateToken();
    const reconnectToken = generateToken();

    const room = new Room(roomCode, hostPlayerId, hostName, socketId, reconnectToken, gameTarget);
    this.rooms.set(roomCode, room);

    this.socketToPlayer.set(socketId, { roomCode, playerId: hostPlayerId });
    this.reconnectTokens.set(reconnectToken, { roomCode, playerId: hostPlayerId, playerName: hostName });

    return {
      success: true,
      roomCode,
      player: {
        playerId: hostPlayerId,
        playerName: hostName,
        isHost: true,
        seatIndex: 0,
      },
      reconnectToken,
      roomState: room.getPublicState(),
    };
  }

  /**
   * Joins an existing room.
   */
  joinRoom(rawRoomCode, rawName, socketId) {
    if (!rawRoomCode || typeof rawRoomCode !== 'string') {
      return { success: false, error: 'Room code is required.' };
    }

    const roomCode = rawRoomCode.trim().toUpperCase();
    if (!isValidRoomCode(roomCode)) {
      return { success: false, error: 'Invalid room code format. Must be 6 letters or numbers.' };
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: `Room ${roomCode} does not exist.` };
    }

    if (room.isFull()) {
      return { success: false, error: `Room ${roomCode} is full (4/4 players).` };
    }

    const playerName = sanitizePlayerName(rawName);
    const playerId = generateToken();
    const reconnectToken = generateToken();

    const { seat, error } = room.addPlayer(playerId, playerName, socketId, reconnectToken);
    if (error) {
      return { success: false, error };
    }

    this.socketToPlayer.set(socketId, { roomCode, playerId });
    this.reconnectTokens.set(reconnectToken, { roomCode, playerId, playerName });

    return {
      success: true,
      roomCode,
      player: {
        playerId,
        playerName,
        isHost: false,
        seatIndex: seat.seatIndex,
      },
      reconnectToken,
      roomState: room.getPublicState(),
    };
  }

  /**
   * Reconnects a player using their reconnectToken.
   */
  reconnectPlayer(roomCodeRaw, reconnectToken, newSocketId) {
    if (!reconnectToken || !roomCodeRaw) {
      return { success: false, error: 'Missing reconnection credentials.' };
    }

    const roomCode = roomCodeRaw.trim().toUpperCase();
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room no longer exists.' };
    }

    const existingSeat = room.getSeatByReconnectToken(reconnectToken);
    if (!existingSeat) {
      return { success: false, error: 'Invalid or expired reconnect session.' };
    }

    if (
      existingSeat.disconnectedAt !== null &&
      Date.now() - existingSeat.disconnectedAt > this.gracePeriodMs
    ) {
      const expiredSeat = room.removePlayer(existingSeat.playerId);
      this.reconnectTokens.delete(reconnectToken);
      if (room.getPlayerCount() === 0) {
        this.rooms.delete(roomCode);
      }
      return {
        success: false,
        error: 'Reconnect window expired. Join the room again as a new player.',
        expiredPlayerName: expiredSeat?.playerName,
        expiredRoomState: room.getPlayerCount() > 0 ? room.getPublicState() : null,
      };
    }

    const previousSocketId = existingSeat.socketId;
    if (previousSocketId && previousSocketId !== newSocketId) {
      this.socketToPlayer.delete(previousSocketId);
    }

    const seat = room.handleReconnect(reconnectToken, newSocketId);
    if (!seat) {
      return { success: false, error: 'Invalid or expired reconnect session.' };
    }

    // Update socket mapping
    this.socketToPlayer.set(newSocketId, { roomCode, playerId: seat.playerId });

    return {
      success: true,
      roomCode,
      player: {
        playerId: seat.playerId,
        playerName: seat.playerName,
        isHost: seat.playerId === room.hostPlayerId,
        seatIndex: seat.seatIndex,
      },
      reconnectToken,
      roomState: room.getPublicState(),
      hand: room.getPlayerHand(seat.playerId),
      previousSocketId: previousSocketId === newSocketId ? null : previousSocketId,
    };
  }

  /**
   * Toggles ready state for a player.
   */
  toggleReady(socketId) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.toggleReady(playerInfo.playerId);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: room.getPublicState(),
      playerName: result.playerName,
      isReady: result.isReady,
    };
  }

  /**
   * Sets player's selected animated character.
   */
  selectCharacter(socketId, characterId) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.selectCharacter(playerInfo.playerId, characterId);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: room.getPublicState(),
      seat: result.seat,
      characterId,
    };
  }

  /**
   * Starts table preview (host only).
   */
  startPreview(socketId) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.startPreview(playerInfo.playerId);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: room.getPublicState(),
    };
  }

  /**
   * Deals cards authoritatively (host only).
   */
  dealCards(socketId) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.dealCards(playerInfo.playerId);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: room.getPublicState(),
      hands: result.hands,
      seats: room.seats,
    };
  }

  /**
   * Advances game stage (host only).
   */
  advanceStage(socketId) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.advanceStage(playerInfo.playerId);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: room.getPublicState(),
      hands: result.hands,
      seats: room.seats,
    };
  }

  /**
   * Directly sets game stage (host only).
   */
  setStage(socketId, targetStage) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.setStage(playerInfo.playerId, targetStage);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: room.getPublicState(),
      hands: result.hands,
      seats: room.seats,
    };
  }

  /**
   * Returns from table preview to lobby (host only).
   */
  returnToLobby(socketId) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.returnToLobby(playerInfo.playerId);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: room.getPublicState(),
    };
  }

  /**
   * Sets dealer seat position (Host only).
   */
  setDealer(socketId, seatIndex) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.setDealer(playerInfo.playerId, seatIndex);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: room.getPublicState(),
      dealerSeatIndex: result.dealerSeatIndex,
      biddingOrder: result.biddingOrder,
    };
  }

  /**
   * Rotates dealer clockwise (Host only).
   */
  rotateDealer(socketId) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.rotateDealer(playerInfo.playerId);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: room.getPublicState(),
      dealerSeatIndex: result.dealerSeatIndex,
      biddingOrder: result.biddingOrder,
    };
  }

  /**
   * Sets starting bidder seat (Host only).
   */
  setFirstBidder(socketId, seatIndex, keepDealerLast = false) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.setFirstBidder(playerInfo.playerId, seatIndex, keepDealerLast);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: room.getPublicState(),
      firstBidderSeatIndex: result.firstBidderSeatIndex,
      dealerSeatIndex: result.dealerSeatIndex,
      biddingOrder: result.biddingOrder,
    };
  }

  /**
   * Places a bid for the active player.
   */
  placeBid(socketId, amount) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.placeBid(playerInfo.playerId, amount);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: result.roomState,
      player: result.player,
      amount: result.amount,
      bidding: result.bidding,
    };
  }

  /**
   * Passes for the active player.
   */
  passBid(socketId) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.passBid(playerInfo.playerId);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: result.roomState,
      player: result.player,
      bidding: result.bidding,
    };
  }

  /**
   * Chooses trump suit (Winning bidder only).
   */
  chooseTrump(socketId, suit) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.chooseTrump(playerInfo.playerId, suit);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: result.roomState,
      player: result.player,
      trumpSuit: result.trumpSuit,
    };
  }

  /**
   * Triggers the special PRO CARD rule: when all 4 players have bid 10.
   */
  triggerAllPlayersBid10(socketId) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.triggerAllPlayersBid10(playerInfo.playerId);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: result.roomState,
    };
  }

  /**
   * Flexible increase of player's individual bid.
   */
  flexibleIncreaseBid(socketId, amount) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.flexibleIncreaseBid(playerInfo.playerId, amount);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: result.roomState,
      player: result.player,
      amount: result.amount,
    };
  }

  /**
   * Flexible pass (keeps bid at 10).
   */
  flexiblePass(socketId) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.flexiblePass(playerInfo.playerId);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: result.roomState,
      player: result.player,
    };
  }

  /**
   * Configures bidding rules (Host only).
   */
  setBiddingConfig(socketId, customConfig) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.setBiddingConfig(playerInfo.playerId, customConfig);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: result.roomState,
      biddingConfig: result.biddingConfig,
    };
  }

  /**
   * Player voluntarily leaves the room.
   */
  leaveRoom(socketId) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return null;

    const { roomCode, playerId } = playerInfo;
    const room = this.rooms.get(roomCode);
    this.socketToPlayer.delete(socketId);

    if (!room) return null;

    const removedSeat = room.removePlayer(playerId);

    // Clean up reconnect token
    if (removedSeat && removedSeat.reconnectToken) {
      this.reconnectTokens.delete(removedSeat.reconnectToken);
    }

    // If room is empty, delete it
    if (room.getPlayerCount() === 0) {
      this.rooms.delete(roomCode);
      return { roomCode, roomDeleted: true, leftPlayerName: removedSeat?.playerName };
    }

    return {
      roomCode,
      roomDeleted: false,
      roomState: room.getPublicState(),
      leftPlayerName: removedSeat?.playerName,
      newHostPlayerId: room.hostPlayerId,
    };
  }

  /**
   * Socket disconnects unexpectedly.
   */
  handleDisconnect(socketId) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return null;

    const { roomCode, playerId } = playerInfo;
    const room = this.rooms.get(roomCode);
    this.socketToPlayer.delete(socketId);

    if (!room) return null;

    const seat = room.handleSocketDisconnect(socketId);
    return {
      roomCode,
      playerId,
      playerName: seat ? seat.playerName : 'Player',
      roomState: room.getPublicState(),
    };
  }

  /**
   * Periodic cleanup of dead or abandoned rooms.
   */
  cleanupAbandonedRooms() {
    const updates = [];
    const now = Date.now();

    for (const [code, room] of this.rooms.entries()) {
      const expiredPlayers = [];
      for (const seat of [...room.seats]) {
        if (
          seat &&
          !seat.isConnected &&
          seat.disconnectedAt !== null &&
          now - seat.disconnectedAt > this.gracePeriodMs
        ) {
          const removedSeat = room.removePlayer(seat.playerId);
          if (removedSeat) {
            expiredPlayers.push(removedSeat);
            this.reconnectTokens.delete(removedSeat.reconnectToken);
            if (removedSeat.socketId) this.socketToPlayer.delete(removedSeat.socketId);
          }
        }
      }

      if (expiredPlayers.length > 0) {
        const roomDeleted = room.getPlayerCount() === 0;
        if (roomDeleted) {
          this.rooms.delete(code);
        }
        updates.push({
          roomCode: code,
          roomDeleted,
          expiredPlayerNames: expiredPlayers.map((seat) => seat.playerName),
          roomState: roomDeleted ? null : room.getPublicState(),
        });
        continue;
      }

      if (room.isAbandoned(this.gracePeriodMs)) {
        // Clean up tokens
        for (const seat of room.seats) {
          if (seat && seat.reconnectToken) {
            this.reconnectTokens.delete(seat.reconnectToken);
          }
        }
        this.rooms.delete(code);
        updates.push({ roomCode: code, roomDeleted: true, expiredPlayerNames: [], roomState: null });
      }
    }

    return updates;
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode?.toUpperCase()) || null;
  }

  getRoomBySocket(socketId) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return null;
    return this.rooms.get(playerInfo.roomCode) || null;
  }

  getRoomBySocketId(socketId) {
    return this.getRoomBySocket(socketId);
  }

  /**
   * Plays a card into the active trick.
   */
  playCard(socketId, card) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const result = room.playCard(playerInfo.playerId, card);
    if (!result.success) return result;

    return {
      success: true,
      roomCode: playerInfo.roomCode,
      roomState: result.roomState,
      player: result.player,
      playedCard: result.playedCard,
      trickCompleted: result.trickCompleted,
      completedTrickData: result.completedTrickData,
      newHand: result.newHand,
    };
  }

  /**
   * Clears the current trick.
   */
  clearTrick(socketId) {
    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) return { success: false, error: 'Player session not found.' };

    const room = this.rooms.get(playerInfo.roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    return room.clearTrick(playerInfo.playerId);
  }

  updateVoiceStatus(socketId, voiceStatus) {
    const room = this.getRoomBySocket(socketId);
    if (!room) return null;
    const result = room.updateVoiceStatus(socketId, voiceStatus);
    if (!result) return null;
    return {
      roomCode: room.roomCode,
      ...result,
    };
  }
}
