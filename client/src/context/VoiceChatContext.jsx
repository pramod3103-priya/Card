import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from './SocketContext';

const VoiceChatContext = createContext(null);

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const VoiceChatProvider = ({ children }) => {
  const { socket, roomCode, roomState, player } = useSocket();

  // Voice state for local user
  const [isMicOn, setIsMicOn] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100 for visual meter
  const [permissionError, setPermissionError] = useState(null);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [iceServers, setIceServers] = useState(DEFAULT_ICE_SERVERS);

  // Map of peerSocketId -> { socketId, playerId, playerName, seatIndex, isMicOn, isMuted, isSpeaking }
  const [voicePeers, setVoicePeers] = useState({});

  // Refs for WebRTC resources
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map()); // peerSocketId -> RTCPeerConnection
  const remoteAudioElementsRef = useRef(new Map()); // peerSocketId -> HTMLAudioElement
  const pendingCandidatesRef = useRef(new Map()); // peerSocketId -> RTCIceCandidateInit[]
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const speechIntervalRef = useRef(null);
  const isMicOnRef = useRef(false);
  const isMutedRef = useRef(true);
  const isSpeakingRef = useRef(false);

  // Sync ref values
  isMicOnRef.current = isMicOn;
  isMutedRef.current = isMuted;

  // 1. Fetch ICE servers from backend on mount
  useEffect(() => {
    let isMounted = true;
    const fetchIceServers = async () => {
      try {
        const hostname = window.location.hostname || 'localhost';
        const serverUrl = import.meta.env.VITE_SERVER_URL || `http://${hostname}:3001`;
        const res = await fetch(`${serverUrl}/api/ice-servers`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.iceServers) && data.iceServers.length > 0 && isMounted) {
            setIceServers(data.iceServers);
          }
        }
      } catch (err) {
        console.warn('Using default public STUN servers (backend ice-servers unavailable):', err);
      }
    };
    fetchIceServers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Clean up single peer connection and audio element
  const cleanupPeer = useCallback((peerSocketId) => {
    // Close RTCPeerConnection
    const pc = peerConnectionsRef.current.get(peerSocketId);
    if (pc) {
      try {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onnegotiationneeded = null;
        pc.onconnectionstatechange = null;
        pc.close();
      } catch (e) {
        // ignore
      }
      peerConnectionsRef.current.delete(peerSocketId);
    }

    // Stop and remove audio element
    const audioEl = remoteAudioElementsRef.current.get(peerSocketId);
    if (audioEl) {
      try {
        audioEl.pause();
        audioEl.srcObject = null;
        audioEl.remove();
      } catch (e) {
        // ignore
      }
      remoteAudioElementsRef.current.delete(peerSocketId);
    }

    pendingCandidatesRef.current.delete(peerSocketId);

    setVoicePeers((prev) => {
      const next = { ...prev };
      delete next[peerSocketId];
      return next;
    });
  }, []);

  // Stop local microphone media stream and audio analysis
  const stopLocalStream = useCallback(() => {
    if (speechIntervalRef.current) {
      clearInterval(speechIntervalRef.current);
      speechIntervalRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // ignore
      }
      audioContextRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {
          // ignore
        }
      });
      localStreamRef.current = null;
    }

    setIsMicOn(false);
    setIsMuted(true);
    setIsSpeaking(false);
    setAudioLevel(0);
    isSpeakingRef.current = false;

    // Remove tracks from all active peer connections
    peerConnectionsRef.current.forEach((pc) => {
      try {
        const senders = pc.getSenders();
        senders.forEach((sender) => {
          if (sender.track) {
            pc.removeTrack(sender);
          }
        });
      } catch (e) {
        // ignore
      }
    });

    if (socket && socket.connected) {
      socket.emit('webrtc_voice_status', {
        isMicOn: false,
        isMuted: true,
        isSpeaking: false,
      });
    }
  }, [socket]);

  // Teardown all voice resources
  const teardownAllVoice = useCallback(() => {
    stopLocalStream();
    peerConnectionsRef.current.forEach((_, peerSocketId) => {
      cleanupPeer(peerSocketId);
    });
    peerConnectionsRef.current.clear();
    remoteAudioElementsRef.current.clear();
    pendingCandidatesRef.current.clear();
    setVoicePeers({});
    setPermissionError(null);
  }, [cleanupPeer, stopLocalStream]);

  // Setup local audio analyser for real-time voice activity detection
  const setupAudioAnalyser = useCallback((stream) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let silenceFrames = 0;

      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
      }

      speechIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || isMutedRef.current || !isMicOnRef.current) {
          if (isSpeakingRef.current) {
            isSpeakingRef.current = false;
            setIsSpeaking(false);
            setAudioLevel(0);
            if (socket && socket.connected) {
              socket.emit('webrtc_voice_status', {
                isMicOn: isMicOnRef.current,
                isMuted: true,
                isSpeaking: false,
              });
            }
          }
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);

        const speakingThreshold = 14; // RMS amplitude threshold for speech
        if (avg > speakingThreshold) {
          silenceFrames = 0;
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            setIsSpeaking(true);
            if (socket && socket.connected) {
              socket.emit('webrtc_voice_status', {
                isMicOn: true,
                isMuted: false,
                isSpeaking: true,
              });
            }
          }
        } else {
          silenceFrames++;
          // Hysteresis of ~3 frames (~300ms) to prevent flicker between syllables
          if (silenceFrames > 3 && isSpeakingRef.current) {
            isSpeakingRef.current = false;
            setIsSpeaking(false);
            if (socket && socket.connected) {
              socket.emit('webrtc_voice_status', {
                isMicOn: true,
                isMuted: false,
                isSpeaking: false,
              });
            }
          }
        }
      }, 100);
    } catch (err) {
      console.warn('Web Audio API analyser not available:', err);
    }
  }, [socket]);

  // Create or get RTCPeerConnection for a peer
  const getOrCreatePeerConnection = useCallback((peerSocketId) => {
    let pc = peerConnectionsRef.current.get(peerSocketId);
    if (pc) return pc;

    pc = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 2,
    });
    peerConnectionsRef.current.set(peerSocketId, pc);
    if (!pendingCandidatesRef.current.has(peerSocketId)) {
      pendingCandidatesRef.current.set(peerSocketId, []);
    }

    // Attach local stream tracks if mic is currently on
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle remote track arrival
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (!remoteStream) return;

      let audioEl = remoteAudioElementsRef.current.get(peerSocketId);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        audioEl.style.display = 'none';
        document.body.appendChild(audioEl);
        remoteAudioElementsRef.current.set(peerSocketId, audioEl);
      }
      audioEl.srcObject = remoteStream;
      audioEl.play().catch((err) => {
        console.warn('Audio play error (waiting for user gesture):', err);
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket && socket.connected) {
        socket.emit('webrtc_signal', {
          targetSocketId: peerSocketId,
          signal: {
            type: 'candidate',
            candidate: event.candidate,
          },
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanupPeer(peerSocketId);
      }
    };

    // Determine deterministic initiator to prevent offer collision:
    // Peer with lexicographically higher socket.id initiates the offer
    const isInitiator = socket?.id && peerSocketId && socket.id > peerSocketId;

    pc.onnegotiationneeded = async () => {
      if (!isInitiator) return;
      try {
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);
        if (socket && socket.connected) {
          socket.emit('webrtc_signal', {
            targetSocketId: peerSocketId,
            signal: pc.localDescription,
          });
        }
      } catch (err) {
        console.error('Error during WebRTC offer negotiation:', err);
      }
    };

    return pc;
  }, [cleanupPeer, iceServers, socket]);

  // Initiate connection to a peer
  const connectToPeer = useCallback(async (peer) => {
    if (!peer || !peer.socketId || peer.socketId === socket?.id) return;
    const pc = getOrCreatePeerConnection(peer.socketId);

    // Save peer info into state
    setVoicePeers((prev) => ({
      ...prev,
      [peer.socketId]: {
        socketId: peer.socketId,
        playerId: peer.playerId,
        playerName: peer.playerName || 'Player',
        seatIndex: peer.seatIndex,
        isMicOn: peer.voiceState?.isMicOn || false,
        isMuted: peer.voiceState?.isMuted ?? true,
        isSpeaking: peer.voiceState?.isSpeaking || false,
      },
    }));

    // If initiator and state is stable, trigger offer
    const isInitiator = socket?.id && peer.socketId && socket.id > peer.socketId;
    if (isInitiator && pc.signalingState === 'stable') {
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_signal', {
          targetSocketId: peer.socketId,
          signal: pc.localDescription,
        });
      } catch (err) {
        console.error('Error creating offer for peer:', err);
      }
    }
  }, [getOrCreatePeerConnection, socket]);

  // Turn Mic ON (or request permission)
  const enableMic = useCallback(async () => {
    setPermissionError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support microphone audio access.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = stream;
      setHasMicPermission(true);
      setIsMicOn(true);
      setIsMuted(false);
      isMutedRef.current = false;

      // Add audio track to all existing peer connections
      const audioTrack = stream.getAudioTracks()[0];
      peerConnectionsRef.current.forEach((pc) => {
        try {
          const senders = pc.getSenders();
          const audioSender = senders.find((s) => s.track && s.track.kind === 'audio');
          if (audioSender) {
            audioSender.replaceTrack(audioTrack);
          } else {
            pc.addTrack(audioTrack, stream);
          }
        } catch (e) {
          console.warn('Error adding track to peer:', e);
        }
      });

      // Setup audio analyzer
      setupAudioAnalyser(stream);

      // Notify room
      if (socket && socket.connected) {
        socket.emit('webrtc_voice_status', {
          isMicOn: true,
          isMuted: false,
          isSpeaking: false,
        });
      }
    } catch (err) {
      console.error('Microphone access failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError(
          'Microphone permission was denied. Please allow microphone access in your browser site permissions and try again.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError(
          'No microphone device found. Please plug in a microphone, headset, or enable your built-in mic.'
        );
      } else {
        setPermissionError(`Microphone error: ${err.message || 'Unable to access audio device.'}`);
      }
      setIsMicOn(false);
      setIsMuted(true);
    }
  }, [setupAudioAnalyser, socket]);

  // Turn Mic completely OFF
  const disableMic = useCallback(() => {
    stopLocalStream();
  }, [stopLocalStream]);

  // Toggle Mute / Unmute while keeping microphone active
  const toggleMute = useCallback(() => {
    if (!isMicOn || !localStreamRef.current) {
      // If mic is off, clicking toggle turns it on
      enableMic();
      return;
    }

    const nextMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    setIsMuted(nextMuted);
    isMutedRef.current = nextMuted;

    if (nextMuted) {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setAudioLevel(0);
    }

    if (socket && socket.connected) {
      socket.emit('webrtc_voice_status', {
        isMicOn: true,
        isMuted: nextMuted,
        isSpeaking: false,
      });
    }
  }, [enableMic, isMicOn, isMuted, socket]);

  // Toggle Mic ON / OFF
  const toggleMic = useCallback(() => {
    if (isMicOn) {
      disableMic();
    } else {
      enableMic();
    }
  }, [disableMic, enableMic, isMicOn]);

  // Socket event listeners for WebRTC signaling and voice peer presence
  useEffect(() => {
    if (!socket || !roomCode) {
      teardownAllVoice();
      return;
    }

    // 1. Peer joined voice room
    const handlePeerJoined = (peer) => {
      if (peer && peer.socketId && peer.socketId !== socket.id) {
        connectToPeer(peer);
      }
    };

    // 2. Initial voice room peers on join
    const handleVoicePeers = ({ peers = [] }) => {
      peers.forEach((peer) => {
        if (peer.socketId !== socket.id) {
          connectToPeer(peer);
        }
      });
    };

    // 3. WebRTC signaling (offers, answers, ICE candidates)
    const handleSignal = async ({ senderSocketId, signal }) => {
      if (!senderSocketId || !signal) return;
      const pc = getOrCreatePeerConnection(senderSocketId);

      try {
        if (signal.type === 'offer') {
          // If collision occurs (glare), only accept if remote offer takes precedence
          if (pc.signalingState !== 'stable') {
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' }).catch(() => {}),
              pc.setRemoteDescription(new RTCSessionDescription(signal)),
            ]);
          } else {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
          }

          // Flush queued candidates
          const candidates = pendingCandidatesRef.current.get(senderSocketId) || [];
          for (const cand of candidates) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          pendingCandidatesRef.current.set(senderSocketId, []);

          // Create and send answer
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc_signal', {
            targetSocketId: senderSocketId,
            signal: pc.localDescription,
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));

          // Flush queued candidates
          const candidates = pendingCandidatesRef.current.get(senderSocketId) || [];
          for (const cand of candidates) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          pendingCandidatesRef.current.set(senderSocketId, []);
        } else if (signal.type === 'candidate' && signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
          } else {
            const queue = pendingCandidatesRef.current.get(senderSocketId) || [];
            queue.push(signal.candidate);
            pendingCandidatesRef.current.set(senderSocketId, queue);
          }
        }
      } catch (err) {
        console.error('Error handling WebRTC signal:', err);
      }
    };

    // 4. Remote peer voice status (mic, mute, speaking)
    const handlePeerVoiceStatus = ({ socketId: peerSocketId, playerId, seatIndex, voiceState }) => {
      setVoicePeers((prev) => {
        const existing = prev[peerSocketId] || {};
        return {
          ...prev,
          [peerSocketId]: {
            ...existing,
            socketId: peerSocketId,
            playerId,
            seatIndex,
            isMicOn: voiceState?.isMicOn || false,
            isMuted: voiceState?.isMuted ?? true,
            isSpeaking: voiceState?.isSpeaking || false,
          },
        };
      });
    };

    // 5. Peer left voice room
    const handlePeerLeft = ({ socketId: leftSocketId }) => {
      cleanupPeer(leftSocketId);
    };

    socket.on('peer_joined_voice', handlePeerJoined);
    socket.on('voice_room_peers', handleVoicePeers);
    socket.on('webrtc_signal', handleSignal);
    socket.on('peer_voice_status', handlePeerVoiceStatus);
    socket.on('peer_left_voice', handlePeerLeft);

    // Initial peer query if already joined
    socket.emit('get_voice_peers', (res) => {
      if (res && res.success && Array.isArray(res.peers)) {
        res.peers.forEach((peer) => {
          if (peer.socketId !== socket.id) {
            connectToPeer(peer);
          }
        });
      }
    });

    return () => {
      socket.off('peer_joined_voice', handlePeerJoined);
      socket.off('voice_room_peers', handleVoicePeers);
      socket.off('webrtc_signal', handleSignal);
      socket.off('peer_voice_status', handlePeerVoiceStatus);
      socket.off('peer_left_voice', handlePeerLeft);
    };
  }, [cleanupPeer, connectToPeer, getOrCreatePeerConnection, roomCode, socket, teardownAllVoice]);

  // Teardown when roomCode vanishes or unmount
  useEffect(() => {
    if (!roomCode) {
      teardownAllVoice();
    }
    return () => {
      teardownAllVoice();
    };
  }, [roomCode, teardownAllVoice]);

  // Helper to determine if a specific seat is speaking or muted
  const getSeatVoiceState = useCallback(
    (seat) => {
      if (!seat || seat.isEmpty) {
        return { isMicOn: false, isMuted: true, isSpeaking: false };
      }

      // If local player
      if (seat.playerId === player?.playerId) {
        return {
          isMicOn,
          isMuted,
          isSpeaking,
        };
      }

      // Check voicePeers by socketId or playerId
      const peer =
        (seat.socketId && voicePeers[seat.socketId]) ||
        Object.values(voicePeers).find((p) => p.playerId === seat.playerId);

      if (peer) {
        return {
          isMicOn: peer.isMicOn,
          isMuted: peer.isMuted,
          isSpeaking: peer.isSpeaking,
        };
      }

      // Fallback to seat.voiceState from room state
      return seat.voiceState || { isMicOn: false, isMuted: true, isSpeaking: false };
    },
    [isMicOn, isMuted, isSpeaking, player?.playerId, voicePeers]
  );

  const value = {
    isMicOn,
    isMuted,
    isSpeaking,
    audioLevel,
    permissionError,
    hasMicPermission,
    voicePeers,
    toggleMic,
    toggleMute,
    enableMic,
    disableMic,
    clearPermissionError: () => setPermissionError(null),
    getSeatVoiceState,
    activePeersCount: Object.keys(voicePeers).length,
  };

  return <VoiceChatContext.Provider value={value}>{children}</VoiceChatContext.Provider>;
};

export const useVoiceChat = () => {
  const context = useContext(VoiceChatContext);
  if (!context) {
    throw new Error('useVoiceChat must be used within a VoiceChatProvider');
  }
  return context;
};

