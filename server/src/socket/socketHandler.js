export function registerSocketHandlers(io, roomManager) {
  const biddingTimers = new Map();

  const scheduleBiddingTimeout = (roomCode) => {
    const previousTimer = biddingTimers.get(roomCode);
    if (previousTimer) clearTimeout(previousTimer);

    const room = roomManager.getRoom(roomCode);
    const gameState = room?.gameState;
    const deadline = gameState?.biddingTurnDeadlineAt;
    const turnId = gameState?.biddingTurnId;
    const seatIndex = gameState?.currentBidderSeatIndex;

    if (
      !Number.isFinite(deadline) ||
      !Number.isInteger(seatIndex) ||
      !gameState.isBiddingStage()
    ) {
      biddingTimers.delete(roomCode);
      return;
    }

    const timer = setTimeout(() => {
      if (biddingTimers.get(roomCode) !== timer) return;
      biddingTimers.delete(roomCode);

      const activeRoom = roomManager.getRoom(roomCode);
      const activeGameState = activeRoom?.gameState;
      if (
        !activeRoom ||
        activeGameState.biddingTurnDeadlineAt !== deadline ||
        activeGameState.biddingTurnId !== turnId ||
        activeGameState.currentBidderSeatIndex !== seatIndex
      ) {
        return;
      }

      const activeSeat = activeRoom.seats[seatIndex];
      if (!activeSeat) {
        console.error(`Cannot time out bidding turn for missing seat ${seatIndex} in room ${roomCode}.`);
        return;
      }

      let result;
      if (activeGameState.bidding?.flexibleIncreasePhase) {
        result = activeRoom.flexiblePass(activeSeat.playerId, { timedOut: true });
      } else {
        result = activeRoom.passBid(activeSeat.playerId, { timedOut: true });
      }

      if (!result.success) {
        console.error(`Failed to time out bidding turn in room ${roomCode}: ${result.error}`);
        return;
      }

      io.to(roomCode).emit('room_state_updated', result.roomState);
      io.to(roomCode).emit('player_notification', {
        type: 'warning',
        message: 'Time Up – Automatically Passed',
        timestamp: Date.now(),
      });
      scheduleBiddingTimeout(roomCode);
    }, Math.max(0, deadline - Date.now()));

    timer.unref?.();
    biddingTimers.set(roomCode, timer);
  };

  io.on('connection', (socket) => {
    // 1. Create Room
    socket.on('create_room', (data = {}, cb) => {
      const callback = typeof cb === 'function' ? cb : () => {};
      try {
        const playerName = data?.playerName || 'Player';
        const gameTarget = data?.gameTarget || 31;
        const result = roomManager.createRoom(playerName, socket.id, gameTarget);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        socket.join(result.roomCode);

        // Notify client
        callback({
          success: true,
          roomCode: result.roomCode,
          player: result.player,
          reconnectToken: result.reconnectToken,
          roomState: result.roomState,
        });

        // Broadcast to room
        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        io.to(result.roomCode).emit('player_notification', {
          type: 'info',
          message: `${result.player.playerName} created room ${result.roomCode}`,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Error creating room:', err);
        callback({ success: false, error: 'Internal server error creating room.' });
      }
    });

    // 2. Join Room
    socket.on('join_room', (data = {}, cb) => {
      const callback = typeof cb === 'function' ? cb : () => {};
      try {
        const { roomCode, playerName } = data || {};
        const result = roomManager.joinRoom(roomCode, playerName, socket.id);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        socket.join(result.roomCode);

        callback({
          success: true,
          roomCode: result.roomCode,
          player: result.player,
          reconnectToken: result.reconnectToken,
          roomState: result.roomState,
        });

        // If cards were already dealt, privately restore hand to reconnected player
        if (result.hand && result.hand.length > 0) {
          socket.emit('player_hand', { hand: result.hand });
        }

        // Notify other peers in room about new voice peer
        socket.to(result.roomCode).emit('peer_joined_voice', {
          socketId: socket.id,
          playerId: result.player.playerId,
          playerName: result.player.playerName,
          seatIndex: result.player.seatIndex,
        });

        // Provide existing active voice peers to joining socket
        const currentRoom = roomManager.getRoom(result.roomCode);
        if (currentRoom) {
          socket.emit('voice_room_peers', {
            peers: currentRoom.getActiveVoicePeers(socket.id),
          });
        }

        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        io.to(result.roomCode).emit('player_notification', {
          type: 'info',
          message: `${result.player.playerName} joined the room (Seat ${result.player.seatIndex + 1})`,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Error joining room:', err);
        callback({ success: false, error: 'Internal server error joining room.' });
      }
    });

    // 3. Reconnect Player
    socket.on('reconnect_player', (data = {}, cb) => {
      const callback = typeof cb === 'function' ? cb : () => {};
      try {
        const { roomCode, reconnectToken } = data || {};
        const result = roomManager.reconnectPlayer(roomCode, reconnectToken, socket.id);
        if (!result.success) {
          if (result.expiredRoomState) {
            io.to(result.expiredRoomState.roomCode).emit('room_state_updated', result.expiredRoomState);
            io.to(result.expiredRoomState.roomCode).emit('player_notification', {
              type: 'warning',
              message: `${result.expiredPlayerName || 'A player'}'s reconnect window expired.`,
              timestamp: Date.now(),
            });
          }
          return callback({ success: false, error: result.error });
        }

        if (result.previousSocketId) {
          io.sockets.sockets.get(result.previousSocketId)?.disconnect(true);
        }
        socket.join(result.roomCode);

        callback({
          success: true,
          roomCode: result.roomCode,
          player: result.player,
          reconnectToken: result.reconnectToken,
          roomState: result.roomState,
        });

        // If cards were already dealt, privately restore hand to reconnected player
        if (result.hand && result.hand.length > 0) {
          socket.emit('player_hand', { hand: result.hand });
        }

        // Notify other peers in room about new voice peer
        socket.to(result.roomCode).emit('peer_joined_voice', {
          socketId: socket.id,
          playerId: result.player.playerId,
          playerName: result.player.playerName,
          seatIndex: result.player.seatIndex,
        });

        // Provide existing active voice peers to joining socket
        const currentRoom = roomManager.getRoom(result.roomCode);
        if (currentRoom) {
          socket.emit('voice_room_peers', {
            peers: currentRoom.getActiveVoicePeers(socket.id),
          });
        }

        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        io.to(result.roomCode).emit('player_notification', {
          type: 'success',
          message: `${result.player.playerName} reconnected to their seat`,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Error reconnecting:', err);
        callback({ success: false, error: 'Failed to restore connection.' });
      }
    });

    // 4. Toggle Ready
    socket.on('toggle_ready', (arg1, arg2) => {
      const callback = typeof arg1 === 'function' ? arg1 : typeof arg2 === 'function' ? arg2 : () => {};
      try {
        const result = roomManager.toggleReady(socket.id);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        callback({ success: true, isReady: result.isReady });

        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        io.to(result.roomCode).emit('player_notification', {
          type: 'info',
          message: `${result.playerName} is ${result.isReady ? 'READY' : 'NOT READY'}`,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Error toggling ready:', err);
        callback({ success: false, error: 'Failed to update ready state.' });
      }
    });

    // 4b. Select Animated Character
    socket.on('select_character', (payload, cb) => {
      const data = typeof payload === 'object' && payload !== null ? payload : { characterId: payload };
      const callback = typeof cb === 'function' ? cb : typeof payload === 'function' ? payload : () => {};

      try {
        const result = roomManager.selectCharacter(socket.id, data.characterId);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        callback({ success: true, characterId: result.characterId });
        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        io.to(result.roomCode).emit('player_notification', {
          type: 'info',
          message: `${result.seat.playerName} chose ${result.characterId.toUpperCase()} avatar`,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Error selecting character:', err);
        callback({ success: false, error: 'Failed to select character.' });
      }
    });

    // 5. Start Game Preview (Host only)
    socket.on('start_game_preview', (arg1, arg2) => {
      const callback = typeof arg1 === 'function' ? arg1 : typeof arg2 === 'function' ? arg2 : () => {};
      try {
        const result = roomManager.startPreview(socket.id);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        callback({ success: true });

        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        io.to(result.roomCode).emit('player_notification', {
          type: 'success',
          message: 'Table preview opened by host! All 4 players seated.',
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Error starting game preview:', err);
        callback({ success: false, error: 'Failed to start table preview.' });
      }
    });

    // 5b. Deal 13 Cards to each player (Host only)
    socket.on('deal_cards', (arg1, arg2) => {
      const callback = typeof arg1 === 'function' ? arg1 : typeof arg2 === 'function' ? arg2 : () => {};
      try {
        const result = roomManager.dealCards(socket.id);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        // PRIVACY ENFORCEMENT: Unicast private hand strictly to each individual player's socket!
        for (const seat of result.seats) {
          if (seat && seat.socketId) {
            const hand = result.hands[seat.seatIndex] || [];
            io.to(seat.socketId).emit('player_hand', { hand });
          }
        }

        // Broadcast public room state (only handCounts [13,13,13,13] is public; NO card faces!)
        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        io.to(result.roomCode).emit('player_notification', {
          type: 'success',
          message: '52-card deck shuffled! 13 cards dealt to all 4 players.',
          timestamp: Date.now(),
        });

        callback({ success: true });
      } catch (err) {
        console.error('Error dealing cards:', err);
        callback({ success: false, error: 'Failed to deal cards.' });
      }
    });

    // 5c. Advance Game Stage (Host only)
    socket.on('advance_stage', (arg1, arg2) => {
      const callback = typeof arg1 === 'function' ? arg1 : typeof arg2 === 'function' ? arg2 : () => {};
      try {
        const result = roomManager.advanceStage(socket.id);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        // Deliver private hands
        for (const seat of result.seats) {
          if (seat && seat.socketId) {
            const hand = result.hands[seat.seatIndex] || [];
            io.to(seat.socketId).emit('player_hand', { hand });
          }
        }

        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        scheduleBiddingTimeout(result.roomCode);
        io.to(result.roomCode).emit('player_notification', {
          type: 'info',
          message: `Stage: ${result.roomState.gameState.stageLabel}`,
          timestamp: Date.now(),
        });

        callback({ success: true, gameState: result.roomState.gameState });
      } catch (err) {
        console.error('Error advancing stage:', err);
        callback({ success: false, error: 'Failed to advance stage.' });
      }
    });

    // 5d. Set Specific Stage (Host only)
    socket.on('set_stage', (arg1, arg2) => {
      const targetStage = typeof arg1 === 'string' ? arg1 : arg1?.targetStage;
      const callback = typeof arg2 === 'function' ? arg2 : typeof arg1 === 'function' ? arg1 : () => {};
      try {
        const result = roomManager.setStage(socket.id, targetStage);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        for (const seat of result.seats) {
          if (seat && seat.socketId) {
            const hand = result.hands[seat.seatIndex] || [];
            io.to(seat.socketId).emit('player_hand', { hand });
          }
        }

        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        scheduleBiddingTimeout(result.roomCode);
        callback({ success: true, gameState: result.roomState.gameState });
      } catch (err) {
        console.error('Error setting stage:', err);
        callback({ success: false, error: 'Failed to set stage.' });
      }
    });

    // 5e. Set Dealer Seat (Host only)
    socket.on('set_dealer', (arg1, arg2) => {
      const seatIndex = typeof arg1 === 'number' ? arg1 : arg1?.seatIndex;
      const callback = typeof arg2 === 'function' ? arg2 : typeof arg1 === 'function' ? arg1 : () => {};
      try {
        const result = roomManager.setDealer(socket.id, Number(seatIndex));
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        scheduleBiddingTimeout(result.roomCode);
        io.to(result.roomCode).emit('player_notification', {
          type: 'info',
          message: `Dealer set to Seat ${result.dealerSeatIndex + 1}. Bidding order updated.`,
          timestamp: Date.now(),
        });

        callback({
          success: true,
          dealerSeatIndex: result.dealerSeatIndex,
          biddingOrder: result.biddingOrder,
        });
      } catch (err) {
        console.error('Error setting dealer:', err);
        callback({ success: false, error: 'Failed to set dealer.' });
      }
    });

    // 5f. Rotate Dealer Clockwise (Host only)
    socket.on('rotate_dealer', (arg1, arg2) => {
      const callback = typeof arg1 === 'function' ? arg1 : typeof arg2 === 'function' ? arg2 : () => {};
      try {
        const result = roomManager.rotateDealer(socket.id);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        scheduleBiddingTimeout(result.roomCode);
        io.to(result.roomCode).emit('player_notification', {
          type: 'info',
          message: `Dealer rotated to Seat ${result.dealerSeatIndex + 1}.`,
          timestamp: Date.now(),
        });

        callback({
          success: true,
          dealerSeatIndex: result.dealerSeatIndex,
          biddingOrder: result.biddingOrder,
        });
      } catch (err) {
        console.error('Error rotating dealer:', err);
        callback({ success: false, error: 'Failed to rotate dealer.' });
      }
    });

    // 5g. Set First Bidder (Host only - Configurable until starting-seat rule finalized)
    socket.on('set_first_bidder', (arg1, arg2) => {
      const seatIndex = typeof arg1 === 'number' ? arg1 : arg1?.seatIndex;
      const keepDealerLast = typeof arg1 === 'object' ? Boolean(arg1?.keepDealerLast) : false;
      const callback = typeof arg2 === 'function' ? arg2 : typeof arg1 === 'function' ? arg1 : () => {};
      try {
        const result = roomManager.setFirstBidder(socket.id, Number(seatIndex), keepDealerLast);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        scheduleBiddingTimeout(result.roomCode);
        io.to(result.roomCode).emit('player_notification', {
          type: 'info',
          message: `First bidder set to Seat ${result.firstBidderSeatIndex + 1}.`,
          timestamp: Date.now(),
        });

        callback({
          success: true,
          firstBidderSeatIndex: result.firstBidderSeatIndex,
          dealerSeatIndex: result.dealerSeatIndex,
          biddingOrder: result.biddingOrder,
        });
      } catch (err) {
        console.error('Error configuring first bidder:', err);
        callback({ success: false, error: 'Failed to configure first bidder.' });
      }
    });

    // 5h. Place Bid
    socket.on('place_bid', (arg1, arg2) => {
      const amount = typeof arg1 === 'number' ? arg1 : arg1?.amount;
      const callback = typeof arg2 === 'function' ? arg2 : typeof arg1 === 'function' ? arg1 : () => {};
      try {
        const result = roomManager.placeBid(socket.id, Number(amount));
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        scheduleBiddingTimeout(result.roomCode);
        io.to(result.roomCode).emit('player_notification', {
          type: 'info',
          message: `${result.player.playerName} placed bid: ${result.amount}`,
          timestamp: Date.now(),
        });

        // Stage / Auction completion alerts
        if (result.bidding.auctionComplete) {
          if (result.bidding.winningBidderSeatIndex !== null) {
            const winner = result.roomState.seats[result.bidding.winningBidderSeatIndex];
            io.to(result.roomCode).emit('player_notification', {
              type: 'success',
              message: `Auction concluded! ${winner?.playerName || 'Winner'} won with bid ${result.bidding.winningBid}! Selecting Trump (Pradhan)...`,
              timestamp: Date.now(),
            });
          }
        } else if (result.bidding.biddingStageComplete) {
          io.to(result.roomCode).emit('player_notification', {
            type: 'info',
            message: 'Bidding stage completed. Ready for next deal!',
            timestamp: Date.now(),
          });
        }

        callback({ success: true, bidding: result.bidding });
      } catch (err) {
        console.error('Error placing bid:', err);
        callback({ success: false, error: 'Failed to place bid.' });
      }
    });

    // 5i. Pass Bid
    socket.on('pass_bid', (arg1, arg2) => {
      const callback = typeof arg1 === 'function' ? arg1 : typeof arg2 === 'function' ? arg2 : () => {};
      try {
        const result = roomManager.passBid(socket.id);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        scheduleBiddingTimeout(result.roomCode);
        io.to(result.roomCode).emit('player_notification', {
          type: 'info',
          message: `${result.player.playerName} passed.`,
          timestamp: Date.now(),
        });

        // Stage / Auction completion alerts
        if (result.bidding.auctionComplete) {
          if (result.bidding.winningBidderSeatIndex !== null) {
            const winner = result.roomState.seats[result.bidding.winningBidderSeatIndex];
            io.to(result.roomCode).emit('player_notification', {
              type: 'success',
              message: `Auction concluded! ${winner?.playerName || 'Winner'} won with bid ${result.bidding.winningBid}! Selecting Trump (Pradhan)...`,
              timestamp: Date.now(),
            });
          } else {
            // "If everyone passes and no player wins the auction, Spades automatically becomes the default trump suit."
            io.to(result.roomCode).emit('player_notification', {
              type: 'warning',
              message: 'All players passed! Spades (♠) automatically selected as default Trump (Pradhan).',
              timestamp: Date.now(),
            });
          }
        } else if (result.bidding.biddingStageComplete) {
          io.to(result.roomCode).emit('player_notification', {
            type: 'info',
            message: 'Bidding stage completed. Ready for next deal!',
            timestamp: Date.now(),
          });
        }

        callback({ success: true, bidding: result.bidding });
      } catch (err) {
        console.error('Error passing bid:', err);
        callback({ success: false, error: 'Failed to pass.' });
      }
    });

    // 5j. Choose Pradhan / Trump Suit (Winning bidder only)
    const handleTrumpSelection = (arg1, arg2) => {
      const suit = typeof arg1 === 'string' ? arg1 : arg1?.suit;
      const callback = typeof arg2 === 'function' ? arg2 : typeof arg1 === 'function' ? arg1 : () => {};
      try {
        const result = roomManager.chooseTrump(socket.id, suit);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        scheduleBiddingTimeout(result.roomCode);

        // Broadcast simultaneous premium announcement to all four players
        io.to(result.roomCode).emit('pradhan_announcement', {
          selectorName: result.player.playerName,
          selectorSeatIndex: result.player.seatIndex,
          suit: result.trumpSuit,
          suitLabel: result.pradhanLabel || `${result.trumpSuit} – PRADHAN`,
          suitSymbol: result.pradhanSymbol || '♠',
          announcementText: `${result.player.playerName} HAS SELECTED ${result.pradhanLabel || result.trumpSuit} AS PRADHAN!`,
          timestamp: Date.now(),
        });

        io.to(result.roomCode).emit('player_notification', {
          type: 'success',
          message: `${result.player.playerName} selected ${result.pradhanLabel || result.trumpSuit} as PRADHAN!`,
          timestamp: Date.now(),
        });

        callback({
          success: true,
          trumpSuit: result.trumpSuit,
          pradhanSuit: result.pradhanSuit,
          pradhanLabel: result.pradhanLabel,
          pradhanSymbol: result.pradhanSymbol,
        });
      } catch (err) {
        console.error('Error selecting pradhan:', err);
        callback({ success: false, error: 'Failed to select pradhan suit.' });
      }
    };

    socket.on('choose_trump', handleTrumpSelection);
    socket.on('select_pradhan', handleTrumpSelection);

    // 5j-1. Trigger Special PRO CARD All 4 Bid 10 Rule (Host only)
    socket.on('trigger_all_10', (arg1, arg2) => {
      const callback = typeof arg1 === 'function' ? arg1 : typeof arg2 === 'function' ? arg2 : () => {};
      try {
        const result = roomManager.triggerAllPlayersBid10(socket.id);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        scheduleBiddingTimeout(result.roomCode);
        io.to(result.roomCode).emit('player_notification', {
          type: 'warning',
          message: 'All 4 players have bid 10! Flexible Bid Increase Phase Activated.',
          timestamp: Date.now(),
        });

        callback({ success: true, roomState: result.roomState });
      } catch (err) {
        console.error('Error triggering all 10 flexible rule:', err);
        callback({ success: false, error: 'Failed to trigger rule.' });
      }
    });

    // 5j-2. Flexible Increase Bid (Independent)
    socket.on('flexible_increase_bid', (arg1, arg2) => {
      const amount = typeof arg1 === 'number' ? arg1 : arg1?.amount;
      const callback = typeof arg2 === 'function' ? arg2 : typeof arg1 === 'function' ? arg1 : () => {};
      try {
        const result = roomManager.flexibleIncreaseBid(socket.id, Number(amount));
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        scheduleBiddingTimeout(result.roomCode);
        io.to(result.roomCode).emit('player_notification', {
          type: 'info',
          message: `${result.player.playerName} independently increased their bid to ${result.amount}!`,
          timestamp: Date.now(),
        });

        callback({ success: true, roomState: result.roomState });
      } catch (err) {
        console.error('Error in flexible increase bid:', err);
        callback({ success: false, error: 'Failed to increase bid.' });
      }
    });

    // 5j-3. Flexible Pass (Keep bid at 10)
    socket.on('flexible_pass', (arg1, arg2) => {
      const callback = typeof arg1 === 'function' ? arg1 : typeof arg2 === 'function' ? arg2 : () => {};
      try {
        const result = roomManager.flexiblePass(socket.id);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        scheduleBiddingTimeout(result.roomCode);
        io.to(result.roomCode).emit('player_notification', {
          type: 'info',
          message: `${result.player.playerName} chose to pass (keeping bid at 10).`,
          timestamp: Date.now(),
        });

        callback({ success: true, roomState: result.roomState });
      } catch (err) {
        console.error('Error in flexible pass:', err);
        callback({ success: false, error: 'Failed to pass.' });
      }
    });

    // 5k. Configure Bidding (Host only)
    socket.on('configure_bidding', (arg1, arg2) => {
      const config = typeof arg1 === 'object' ? arg1 : {};
      const callback = typeof arg2 === 'function' ? arg2 : typeof arg1 === 'function' ? arg1 : () => {};
      try {
        const result = roomManager.setBiddingConfig(socket.id, config);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        io.to(result.roomCode).emit('player_notification', {
          type: 'info',
          message: 'Bidding rules updated by host.',
          timestamp: Date.now(),
        });

        callback({ success: true, biddingConfig: result.biddingConfig });
      } catch (err) {
        console.error('Error configuring bidding:', err);
        callback({ success: false, error: 'Failed to configure bidding.' });
      }
    });

    // 5l. Play Card into Trick
    socket.on('play_card', (arg1, arg2) => {
      const card = typeof arg1 === 'object' ? (arg1?.card || arg1) : arg1;
      const callback = typeof arg2 === 'function' ? arg2 : typeof arg1 === 'function' ? arg1 : () => {};
      try {
        const result = roomManager.playCard(socket.id, card);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        // Deliver updated private hand to player who played
        socket.emit('player_hand', { hand: result.newHand });

        // Broadcast room state
        io.to(result.roomCode).emit('room_state_updated', result.roomState);

        const cardSymbol =
          result.playedCard.suit === 'Hearts' || result.playedCard.suit === 'HEARTS'
            ? '♥'
            : result.playedCard.suit === 'Diamonds' || result.playedCard.suit === 'DIAMONDS'
            ? '♦'
            : result.playedCard.suit === 'Clubs' || result.playedCard.suit === 'CLUBS'
            ? '♣'
            : '♠';

        io.to(result.roomCode).emit('player_notification', {
          type: 'info',
          message: `${result.player.playerName} played ${result.playedCard.rank}${cardSymbol}`,
          timestamp: Date.now(),
        });

        if (result.trickCompleted && result.completedTrickData) {
          const room = roomManager.getRoom(result.roomCode);
          const winnerSeat = room ? room.seats[result.completedTrickData.winnerSeatIndex] : null;
          const winCard = result.completedTrickData.winningCard;
          const winSymbol =
            winCard.suit === 'Hearts' || winCard.suit === 'HEARTS'
              ? '♥'
              : winCard.suit === 'Diamonds' || winCard.suit === 'DIAMONDS'
              ? '♦'
              : winCard.suit === 'Clubs' || winCard.suit === 'CLUBS'
              ? '♣'
              : '♠';

          io.to(result.roomCode).emit('trick_completed', {
            ...result.completedTrickData,
            winnerName: winnerSeat?.playerName || 'Winner',
          });

          io.to(result.roomCode).emit('player_notification', {
            type: 'success',
            message: `🏆 ${winnerSeat?.playerName || 'Winner'} won the trick with ${winCard.rank}${winSymbol}!`,
            timestamp: Date.now(),
          });
        }

        if (result.roundCompleted && result.completedRoundData) {
          const room = roomManager.getRoom(result.roomCode);
          io.to(result.roomCode).emit('round_completed', result.completedRoundData);
          io.to(result.roomCode).emit('player_notification', {
            type: 'info',
            message: `🎉 Round ${result.completedRoundData.roundNumber} completed! Check the scoreboard for updated standings.`,
            timestamp: Date.now(),
          });

          if (result.matchOver) {
            const winnerSeat = room ? room.seats[result.matchWinnerSeatIndex] : null;
            io.to(result.roomCode).emit('match_over', {
              winnerSeatIndex: result.matchWinnerSeatIndex,
              winnerName: winnerSeat?.playerName || 'Winner',
              finalScores: result.roomState?.gameState?.scores,
            });
            io.to(result.roomCode).emit('player_notification', {
              type: 'success',
              message: `👑 MATCH WON by ${winnerSeat?.playerName || 'Player'}! Final Target Reached!`,
              timestamp: Date.now(),
            });
          }
        }

        callback({ success: true, playedCard: result.playedCard });
      } catch (err) {
        console.error('Error playing card:', err);
        callback({ success: false, error: 'Failed to play card.' });
      }
    });

    // 5m. Reset Match for "Play Again" (Host only)
    socket.on('reset_match', (arg1, arg2) => {
      const callback = typeof arg1 === 'function' ? arg1 : typeof arg2 === 'function' ? arg2 : () => {};
      try {
        const room = roomManager.getRoomBySocketId(socket.id);
        if (!room) {
          return callback({ success: false, error: 'Not in a room.' });
        }
        const result = room.resetMatch(socket.id);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        io.to(room.roomCode).emit('room_state_updated', result.roomState);
        room.seats.forEach((seat) => {
          if (seat && seat.socketId) {
            const hand = room.gameState.getPlayerHand(seat.seatIndex);
            io.to(seat.socketId).emit('player_hand', { hand });
          }
        });
        io.to(room.roomCode).emit('player_notification', {
          type: 'info',
          message: 'A new match has begun! Best of luck to all players.',
          timestamp: Date.now(),
        });
        callback({ success: true, roomState: result.roomState });
      } catch (err) {
        console.error('Error resetting match:', err);
        callback({ success: false, error: 'Failed to reset match.' });
      }
    });

    // 5n. Advance Round (Host only)
    socket.on('advance_round', (arg1, arg2) => {
      const callback = typeof arg1 === 'function' ? arg1 : typeof arg2 === 'function' ? arg2 : () => {};
      try {
        const room = roomManager.getRoomBySocketId(socket.id);
        if (!room) {
          return callback({ success: false, error: 'Not in a room.' });
        }
        const result = room.advanceRound(socket.id);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        io.to(room.roomCode).emit('room_state_updated', result.roomState);
        room.seats.forEach((seat) => {
          if (seat && seat.socketId) {
            const hand = room.gameState.getPlayerHand(seat.seatIndex);
            io.to(seat.socketId).emit('player_hand', { hand });
          }
        });
        io.to(room.roomCode).emit('player_notification', {
          type: 'info',
          message: `Round ${result.roomState?.gameState?.currentRoundNumber || ''} deals started!`,
          timestamp: Date.now(),
        });
        callback({ success: true, roomState: result.roomState });
      } catch (err) {
        console.error('Error advancing round:', err);
        callback({ success: false, error: 'Failed to advance round.' });
      }
    });

    // 5m. Clear Trick (Optional reset)
    socket.on('clear_trick', (arg1, arg2) => {
      const callback = typeof arg1 === 'function' ? arg1 : typeof arg2 === 'function' ? arg1 : () => {};
      try {
        const room = roomManager.getRoomBySocketId(socket.id);
        if (!room) {
          return callback({ success: false, error: 'Not in a room.' });
        }
        const result = room.clearTrick(socket.id);
        io.to(room.roomCode).emit('room_state_updated', result.roomState);
        callback({ success: true });
      } catch (err) {
        console.error('Error clearing trick:', err);
        callback({ success: false, error: 'Failed to clear trick.' });
      }
    });

    // 6. Return to Lobby (Host only)
    socket.on('return_to_lobby', (arg1, arg2) => {
      const callback = typeof arg1 === 'function' ? arg1 : typeof arg2 === 'function' ? arg2 : () => {};
      try {
        const result = roomManager.returnToLobby(socket.id);
        if (!result.success) {
          return callback({ success: false, error: result.error });
        }

        callback({ success: true });

        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        scheduleBiddingTimeout(result.roomCode);
        io.to(result.roomCode).emit('player_notification', {
          type: 'info',
          message: 'Returned to waiting lobby.',
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Error returning to lobby:', err);
        callback({ success: false, error: 'Failed to return to lobby.' });
      }
    });

    // 7. Leave Room
    socket.on('leave_room', (arg1, arg2) => {
      const callback = typeof arg1 === 'function' ? arg1 : typeof arg2 === 'function' ? arg2 : () => {};
      try {
        const result = roomManager.leaveRoom(socket.id);
        if (!result) {
          return callback({ success: false, error: 'Not in a room.' });
        }

        socket.leave(result.roomCode);
        scheduleBiddingTimeout(result.roomCode);
        callback({ success: true });

        if (!result.roomDeleted) {
          io.to(result.roomCode).emit('peer_left_voice', { socketId: socket.id });
          io.to(result.roomCode).emit('room_state_updated', result.roomState);
          io.to(result.roomCode).emit('player_notification', {
            type: 'warning',
            message: `${result.leftPlayerName || 'A player'} left the room.`,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        console.error('Error leaving room:', err);
        callback({ success: false, error: 'Failed to leave room.' });
      }
    });

    // 8. Disconnect (graceful or network drop)
    socket.on('disconnect', () => {
      const result = roomManager.handleDisconnect(socket.id);
      if (result) {
        io.to(result.roomCode).emit('peer_left_voice', {
          socketId: socket.id,
          playerId: result.playerId,
        });
        io.to(result.roomCode).emit('room_state_updated', result.roomState);
        io.to(result.roomCode).emit('player_notification', {
          type: 'warning',
          message: `${result.playerName} connection lost. Holding seat for 60s...`,
          timestamp: Date.now(),
        });
      }
    });

    // 9. WebRTC Voice Chat Signaling
    socket.on('webrtc_signal', (payload = {}) => {
      const { targetSocketId, signal } = payload;
      if (!targetSocketId || !signal) return;
      io.to(targetSocketId).emit('webrtc_signal', {
        senderSocketId: socket.id,
        signal,
      });
    });

    socket.on('webrtc_voice_status', (data = {}) => {
      const result = roomManager.updateVoiceStatus(socket.id, data);
      if (result) {
        io.to(result.roomCode).emit('peer_voice_status', {
          socketId: socket.id,
          playerId: result.playerId,
          seatIndex: result.seatIndex,
          voiceState: result.voiceState,
        });
      }
    });

    socket.on('get_voice_peers', (cb) => {
      const callback = typeof cb === 'function' ? cb : () => {};
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        return callback({ success: false, peers: [] });
      }
      return callback({ success: true, peers: room.getActiveVoicePeers(socket.id) });
    });
  });
}
