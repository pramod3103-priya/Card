import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const STORAGE_KEY = 'procard_player_session';

// Tab-isolated storage helpers so 4 tabs on localhost can run as 4 distinct players
const getStoredSession = () => {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY) || sessionStorage.getItem('minus_player_session');
    return data ? JSON.parse(data) : null;
  } catch (err) {
    return null;
  }
};

const saveStoredSession = (data) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Unable to persist session to sessionStorage:', err);
  }
};

const clearStoredSession = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // ignore
  }
};

// Determine backend URL
const getSocketUrl = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:3001`;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [player, setPlayer] = useState(null); // { playerId, playerName, isHost, seatIndex }
  const [playerHand, setPlayerHand] = useState([]); // Private 13-card hand
  const [roomCode, setRoomCode] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [lastTrickResult, setLastTrickResult] = useState(null);
  const [lastRoundData, setLastRoundData] = useState(null);
  const [matchWinnerData, setMatchWinnerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0);
  const [pradhanAnnouncement, setPradhanAnnouncement] = useState(null);

  const socketRef = useRef(null);

  const applyRoomState = useCallback((state) => {
    const serverTime = state?.gameState?.serverTime;
    if (Number.isFinite(serverTime)) {
      setServerTimeOffsetMs(serverTime - Date.now());
    }
    setRoomState(state);
  }, []);

  // Helper to push notifications
  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4500);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Initialize socket connection
  useEffect(() => {
    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to PRO CARD game server:', newSocket.id);
      setConnected(true);
      setError(null);

      // Attempt automatic reconnect if previous session exists in this tab
      const savedSession = getStoredSession();
      if (savedSession && savedSession.roomCode && savedSession.reconnectToken) {
        newSocket.emit(
          'reconnect_player',
          { roomCode: savedSession.roomCode, reconnectToken: savedSession.reconnectToken },
          (response) => {
            if (response && response.success) {
              setRoomCode(response.roomCode);
              setPlayer(response.player);
              applyRoomState(response.roomState);
              addNotification(`Reconnected to Room #${response.roomCode} (Seat ${response.player.seatIndex + 1})`, 'success');
            } else {
              // Stale or expired session
              clearStoredSession();
            }
          }
        );
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from game server:', reason);
      setConnected(false);
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
      setConnected(false);
    });

    // Authoritative room state updates
    newSocket.on('room_state_updated', (updatedState) => {
      applyRoomState(updatedState);
      if (updatedState.status === 'lobby') {
        setPlayerHand([]);
      }
      // Synchronize player isHost and seat state
      setPlayer((prev) => {
        if (!prev) return null;
        const currentSeat = updatedState.seats.find((s) => s && s.playerId === prev.playerId);
        if (currentSeat) {
          return {
            ...prev,
            isHost: currentSeat.isHost,
            seatIndex: currentSeat.seatIndex,
          };
        }
        return prev;
      });
    });

    // Authoritative private player hand (unicast exclusively to this socket)
    newSocket.on('player_hand', (data) => {
      if (data && Array.isArray(data.hand)) {
        setPlayerHand(data.hand);
      }
    });

    // Notifications broadcasted to room
    newSocket.on('player_notification', (data) => {
      if (data && data.message) {
        addNotification(data.message, data.type || 'info');
      }
    });

    // Trick completed celebration & results
    newSocket.on('trick_completed', (data) => {
      setLastTrickResult(data);
      setTimeout(() => {
        setLastTrickResult((current) => (current?.completedAt === data?.completedAt ? null : current));
      }, 4000);
    });

    // Round completed results
    newSocket.on('round_completed', (data) => {
      setLastRoundData(data);
    });

    // Match over / champion celebration
    newSocket.on('match_over', (data) => {
      setMatchWinnerData(data);
    });

    // Pradhan (Trump) selection simultaneous announcement
    newSocket.on('pradhan_announcement', (data) => {
      setPradhanAnnouncement(data);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [addNotification, applyRoomState]);

  // Create Room
  const createRoom = useCallback(
    (playerName, gameTarget = 31) => {
      if (!socketRef.current) return Promise.reject(new Error('Socket not initialized'));

      setLoading(true);
      setError(null);

      return new Promise((resolve, reject) => {
        socketRef.current.emit('create_room', { playerName, gameTarget }, (response) => {
          setLoading(false);
          if (response.success) {
            setRoomCode(response.roomCode);
            setPlayer(response.player);
            applyRoomState(response.roomState);

            // Persist session for this tab
            saveStoredSession({
              roomCode: response.roomCode,
              reconnectToken: response.reconnectToken,
              playerId: response.player.playerId,
              playerName: response.player.playerName,
            });

            addNotification(`Room #${response.roomCode} created! You are the host in Seat 1 (South).`, 'success');
            resolve(response);
          } else {
            setError(response.error);
            addNotification(response.error, 'error');
            reject(new Error(response.error));
          }
        });
      });
    },
    [addNotification, applyRoomState]
  );

  // Join Room
  const joinRoom = useCallback(
    (targetRoomCode, playerName) => {
      if (!socketRef.current) return Promise.reject(new Error('Socket not initialized'));

      setLoading(true);
      setError(null);

      return new Promise((resolve, reject) => {
        socketRef.current.emit('join_room', { roomCode: targetRoomCode, playerName }, (response) => {
          setLoading(false);
          if (response.success) {
            setRoomCode(response.roomCode);
            setPlayer(response.player);
            applyRoomState(response.roomState);

            // Persist session for this tab
            saveStoredSession({
              roomCode: response.roomCode,
              reconnectToken: response.reconnectToken,
              playerId: response.player.playerId,
              playerName: response.player.playerName,
            });

            addNotification(`Joined Room #${response.roomCode}! Assigned to Seat ${response.player.seatIndex + 1}.`, 'success');
            resolve(response);
          } else {
            setError(response.error);
            addNotification(response.error, 'error');
            reject(new Error(response.error));
          }
        });
      });
    },
    [addNotification, applyRoomState]
  );

  // Toggle Ready
  const toggleReady = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('toggle_ready', (response) => {
      if (!response.success && response.error) {
        addNotification(response.error, 'error');
      }
    });
  }, [addNotification]);

  // Select Animated Character Avatar
  const selectCharacter = useCallback((characterId) => {
    if (!socketRef.current) return;
    socketRef.current.emit('select_character', { characterId }, (response) => {
      if (!response.success && response.error) {
        addNotification(response.error, 'error');
      }
    });
  }, [addNotification]);

  // Start Game Preview (Host only)
  const startGamePreview = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('start_game_preview', (response) => {
      if (!response.success && response.error) {
        addNotification(response.error, 'error');
      }
    });
  }, [addNotification]);

  // Deal 13 Cards to each player (Host only)
  const dealCards = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('deal_cards', (response) => {
      if (!response.success && response.error) {
        addNotification(response.error, 'error');
      }
    });
  }, [addNotification]);

  // Advance game stage (Host only)
  const advanceStage = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('advance_stage', (response) => {
      if (!response.success && response.error) {
        addNotification(response.error, 'error');
      }
    });
  }, [addNotification]);

  // Set specific stage (Host only)
  const setStage = useCallback((targetStage) => {
    if (!socketRef.current) return;
    socketRef.current.emit('set_stage', { targetStage }, (response) => {
      if (!response.success && response.error) {
        addNotification(response.error, 'error');
      }
    });
  }, [addNotification]);

  // Return to Lobby (Host only)
  const returnToLobby = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('return_to_lobby', (response) => {
      if (!response.success && response.error) {
        addNotification(response.error, 'error');
      }
    });
  }, [addNotification]);

  // Set Dealer Position (Host only)
  const setDealer = useCallback((seatIndex) => {
    if (!socketRef.current) return;
    socketRef.current.emit('set_dealer', { seatIndex }, (response) => {
      if (!response.success && response.error) {
        addNotification(response.error, 'error');
      }
    });
  }, [addNotification]);

  // Rotate Dealer Clockwise (Host only)
  const rotateDealer = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('rotate_dealer', (response) => {
      if (!response.success && response.error) {
        addNotification(response.error, 'error');
      }
    });
  }, [addNotification]);

  // Set First Bidder (Host only)
  const setFirstBidder = useCallback((seatIndex, keepDealerLast = false) => {
    if (!socketRef.current) return;
    socketRef.current.emit('set_first_bidder', { seatIndex, keepDealerLast }, (response) => {
      if (!response.success && response.error) {
        addNotification(response.error, 'error');
      }
    });
  }, [addNotification]);

  // Place a Bid
  const placeBid = useCallback((amount) => {
    if (!socketRef.current) return Promise.reject(new Error('Socket not initialized'));
    return new Promise((resolve, reject) => {
      socketRef.current.emit('place_bid', { amount }, (response) => {
        if (!response.success) {
          addNotification(response.error || 'Failed to place bid', 'error');
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }, [addNotification]);

  // Pass Bid Turn
  const passBid = useCallback(() => {
    if (!socketRef.current) return Promise.reject(new Error('Socket not initialized'));
    return new Promise((resolve, reject) => {
      socketRef.current.emit('pass_bid', (response) => {
        if (!response.success) {
          addNotification(response.error || 'Failed to pass', 'error');
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }, [addNotification]);

  // Special Rule: All 4 Players Bid 10 - Flexible Increase or Pass
  const triggerAll10 = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('trigger_all_10', (response) => {
      if (!response.success && response.error) {
        addNotification(response.error, 'error');
      }
    });
  }, [addNotification]);

  const flexibleIncreaseBid = useCallback((amount) => {
    if (!socketRef.current) return Promise.reject(new Error('Socket not initialized'));
    return new Promise((resolve, reject) => {
      socketRef.current.emit('flexible_increase_bid', { amount }, (response) => {
        if (!response.success) {
          addNotification(response.error || 'Failed to increase bid', 'error');
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }, [addNotification]);

  const flexiblePass = useCallback(() => {
    if (!socketRef.current) return Promise.reject(new Error('Socket not initialized'));
    return new Promise((resolve, reject) => {
      socketRef.current.emit('flexible_pass', (response) => {
        if (!response.success) {
          addNotification(response.error || 'Failed to pass', 'error');
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }, [addNotification]);

  // Choose Pradhan / Trump Suit (Winning bidder only)
  const chooseTrump = useCallback((suit) => {
    if (!socketRef.current) return Promise.reject(new Error('Socket not initialized'));
    return new Promise((resolve, reject) => {
      socketRef.current.emit('choose_trump', { suit }, (response) => {
        if (!response.success) {
          addNotification(response.error || 'Failed to choose trump', 'error');
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }, [addNotification]);

  // Alias conforming to PRADHAN specification
  const selectPradhan = useCallback((suit) => {
    return chooseTrump(suit);
  }, [chooseTrump]);

  const clearPradhanAnnouncement = useCallback(() => {
    setPradhanAnnouncement(null);
  }, []);

  // Configure Bidding Parameters (Host only)
  const configureBidding = useCallback((config) => {
    if (!socketRef.current) return;
    socketRef.current.emit('configure_bidding', config, (response) => {
      if (!response.success && response.error) {
        addNotification(response.error, 'error');
      }
    });
  }, [addNotification]);

  // Play Card into Active Trick
  const playCard = useCallback((card) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Socket not initialized'));
      socketRef.current.emit('play_card', { card }, (response) => {
        if (!response?.success) {
          addNotification(response?.error || 'Failed to play card', 'error');
          reject(new Error(response?.error));
        } else {
          resolve(response);
        }
      });
    });
  }, [addNotification]);

  // Clear Active Trick
  const clearTrick = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('clear_trick', () => {});
  }, []);

  // Reset Match for "Play Again" (Host only)
  const resetMatch = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Socket not initialized'));
      socketRef.current.emit('reset_match', (response) => {
        if (!response?.success) {
          addNotification(response?.error || 'Failed to reset match', 'error');
          reject(new Error(response?.error));
        } else {
          setMatchWinnerData(null);
          setLastRoundData(null);
          resolve(response);
        }
      });
    });
  }, [addNotification]);

  // Advance to Next Round (Host only)
  const advanceRound = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Socket not initialized'));
      socketRef.current.emit('advance_round', (response) => {
        if (!response?.success) {
          addNotification(response?.error || 'Failed to start next round', 'error');
          reject(new Error(response?.error));
        } else {
          setLastRoundData(null);
          resolve(response);
        }
      });
    });
  }, [addNotification]);

  // Leave Room
  const leaveRoom = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('leave_room', (response) => {
      clearStoredSession();
      setRoomCode('');
      setPlayer(null);
      setPlayerHand([]);
      setRoomState(null);
      setServerTimeOffsetMs(0);
      addNotification('You left the room.', 'info');
    });
  }, [addNotification]);

  // Copy Room Code
  const copyRoomCode = useCallback(() => {
    if (!roomCode) return;
    navigator.clipboard
      .writeText(roomCode)
      .then(() => {
        addNotification(`Room code #${roomCode} copied to clipboard!`, 'success');
      })
      .catch(() => {
        addNotification(`Room code: #${roomCode}`, 'info');
      });
  }, [roomCode, addNotification]);

  // Copy Invite Link
  const copyInviteLink = useCallback(() => {
    if (!roomCode) return;
    const url = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        addNotification('Invite link copied! Send it to 3 friends.', 'success');
      })
      .catch(() => {
        addNotification(`Invite link: ${url}`, 'info');
      });
  }, [roomCode, addNotification]);

  const value = {
    socket,
    connected,
    roomState,
    serverTimeOffsetMs,
    player,
    playerHand,
    roomCode,
    notifications,
    lastTrickResult,
    lastRoundData,
    matchWinnerData,
    setMatchWinnerData,
    loading,
    error,
    createRoom,
    joinRoom,
    toggleReady,
    selectCharacter,
    startGamePreview,
    dealCards,
    advanceStage,
    setStage,
    returnToLobby,
    setDealer,
    rotateDealer,
    setFirstBidder,
    placeBid,
    passBid,
    triggerAll10,
    flexibleIncreaseBid,
    flexiblePass,
    chooseTrump,
    selectPradhan,
    pradhanAnnouncement,
    clearPradhanAnnouncement,
    configureBidding,
    playCard,
    clearTrick,
    resetMatch,
    advanceRound,
    leaveRoom,
    copyRoomCode,
    copyInviteLink,
    removeNotification,
    setError,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
