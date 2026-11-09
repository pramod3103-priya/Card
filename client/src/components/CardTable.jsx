import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useSoundSettings } from '../context/SoundSettingsContext';
import { TableSeat } from './TableSeat';
import { Phase2Placeholder } from './Phase2Placeholder';
import { PlayingCard } from './PlayingCard';
import { BiddingPanel } from './BiddingPanel';
import { TrumpSelectionModal } from './TrumpSelectionModal';
import { PradhanAnnouncementOverlay } from './PradhanAnnouncementOverlay';
import { PradhanPinnedIndicator } from './PradhanPinnedIndicator';
import { getPradhanSuitConfig } from '../config/pradhanConfig';
import { Scoreboard } from './Scoreboard';
import { ScoreboardModal } from './ScoreboardModal';
import { MatchWinnerModal } from './MatchWinnerModal';
import { SettingsModal } from './SettingsModal';
import {
  ArrowLeft,
  Copy,
  Link2,
  LogOut,
  Sparkles,
  Layers,
  Crown,
  Play,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  Target,
  Trophy,
  Zap,
  Info,
  Volume2,
  VolumeX,
  Settings,
} from 'lucide-react';

const STAGE_STEPS = [
  { id: 'waiting_for_players', step: 1, label: 'Waiting', cards: 0 },
  { id: 'first_deal', step: 2, label: 'Deal 5', cards: 5 },
  { id: 'first_bidding', step: 3, label: 'Bid 1', cards: 5 },
  { id: 'second_deal', step: 4, label: 'Deal 9', cards: 9 },
  { id: 'second_bidding', step: 5, label: 'Bid 2', cards: 9 },
  { id: 'final_deal', step: 6, label: 'Deal 13', cards: 13 },
  { id: 'final_bidding', step: 7, label: 'Bid 3', cards: 13 },
  { id: 'ready_to_play', step: 8, label: 'Play', cards: 13 },
];

export const CardTable = () => {
  const {
    roomState,
    player,
    playerHand,
    roomCode,
    dealCards,
    advanceStage,
    setStage,
    returnToLobby,
    leaveRoom,
    copyRoomCode,
    copyInviteLink,
    setDealer,
    rotateDealer,
    setFirstBidder,
    playCard,
    clearTrick,
    resetMatch,
    advanceRound,
    lastTrickResult,
    matchWinnerData,
    notifications,
    pradhanAnnouncement,
    clearPradhanAnnouncement,
  } = useSocket();

  const [selectedCardIdx, setSelectedCardIdx] = useState(null);
  const [playingCardAnim, setPlayingCardAnim] = useState(null);
  const [showScoreboardModal, setShowScoreboardModal] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  // PRO CARD Sound & Game Settings System
  const {
    settings,
    toggleMute,
    playDeal,
    playCardPlay,
    playBid,
    playTrump,
    playTrickWin,
    playVictory,
    playDefeat,
    playNotification,
    isSettingsOpen,
    openSettings,
    closeSettings,
  } = useSoundSettings();


  // Request landscape while the game table is open (supported on Android fullscreen/PWA browsers).
  useEffect(() => {
    const orientation = window.screen?.orientation;
    if (orientation?.lock) {
      orientation.lock('landscape').catch(() => {});
    }
    return () => {
      try { orientation?.unlock?.(); } catch {}
    };
  }, []);

  if (!roomState) return null;

  // Local player's seat index (default 0)
  const mySeatIndex = roomState.seats.findIndex((s) => s && s.playerId === player?.playerId);
  const localSeat = mySeatIndex !== -1 ? mySeatIndex : 0;

  // Rotate seats clockwise so local player is always bottom (South)
  const bottomSeat = roomState.seats[localSeat];
  const leftSeat = roomState.seats[(localSeat + 1) % 4];
  const topSeat = roomState.seats[(localSeat + 2) % 4];
  const rightSeat = roomState.seats[(localSeat + 3) % 4];

  const isHost = player?.isHost || bottomSeat?.isHost;

  // Authoritative server game state
  const gameState = roomState.gameState || {};
  const currentStage = gameState.stage || 'waiting_for_players';
  const stageIndex = gameState.stageIndex || 1;
  const stageLabel = gameState.stageLabel || 'Waiting for Players';
  const expectedCards = gameState.expectedCardsPerPlayer || 0;
  const dealerSeatIndex = gameState.dealerSeatIndex ?? 0;
  const firstBidderSeatIndex = gameState.firstBidderSeatIndex ?? (dealerSeatIndex + 1) % 4;
  const biddingOrder = gameState.biddingOrder || [
    (dealerSeatIndex + 1) % 4,
    (dealerSeatIndex + 2) % 4,
    (dealerSeatIndex + 3) % 4,
    dealerSeatIndex,
  ];
  const currentBidderSeatIndex = gameState.currentBidderSeatIndex;
  const isBiddingStage =
    currentStage === 'first_bidding' ||
    currentStage === 'second_bidding' ||
    currentStage === 'final_bidding';

  const bidding = gameState.bidding || {};
  const trumpSuit = gameState.trumpSuit;
  const trickCards = gameState.trickCards || [null, null, null, null];
  const tricksWon = gameState.tricksWon || [0, 0, 0, 0];
  const leadSuit = gameState.leadSuit;

  // Active turn calculation
  const activeTurnSeatIndex =
    isBiddingStage
      ? currentBidderSeatIndex
      : bidding.flexibleIncreasePhase
      ? bidding.flexibleTurnSeatIndex
      : bidding.awaitingTrumpSelection
      ? bidding.winningBidderSeatIndex
      : currentStage === 'ready_to_play'
      ? (gameState.currentTurnSeatIndex ?? (bidding.winningBidderSeatIndex ?? 0))
      : null;

  const isMyTurnToPlay = currentStage === 'ready_to_play' && activeTurnSeatIndex === localSeat;

  const getBiddingPosition = (seatIdx) => {
    if (!isBiddingStage || seatIdx === undefined || seatIdx === null) return null;
    const pos = biddingOrder.indexOf(seatIdx);
    return pos !== -1 ? pos + 1 : null;
  };

  const gameTarget = roomState.gameTarget || gameState.gameTarget || 31;
  const handCounts = gameState.handCounts || [0, 0, 0, 0];

  useEffect(() => {
    if (gameState?.matchOver) {
      setShowWinnerModal(true);
    }
  }, [gameState?.matchOver]);

  // 1. Card Dealing Sound
  const prevHandLength = useRef(0);
  useEffect(() => {
    if (playerHand && playerHand.length > prevHandLength.current) {
      playDeal();
    }
    prevHandLength.current = playerHand?.length || 0;
  }, [playerHand?.length, playDeal]);

  // 2. Card Playing Sound
  const prevTrickCount = useRef(0);
  useEffect(() => {
    const count = trickCards.filter(Boolean).length;
    if (count > prevTrickCount.current && count > 0) {
      playCardPlay();
    }
    prevTrickCount.current = count;
  }, [trickCards, playCardPlay]);

  // 3. Bid Announcement Sound
  const prevBidsCount = useRef(0);
  useEffect(() => {
    const count = bidding?.bidsHistory?.length || 0;
    if (count > prevBidsCount.current) {
      playBid();
    }
    prevBidsCount.current = count;
  }, [bidding?.bidsHistory?.length, playBid]);

  // 4. Trump Selection Sound
  const prevTrump = useRef(null);
  useEffect(() => {
    if (trumpSuit && trumpSuit !== prevTrump.current) {
      playTrump();
    }
    prevTrump.current = trumpSuit;
  }, [trumpSuit, playTrump]);

  // 5. Trick Winner Sound
  useEffect(() => {
    if (lastTrickResult) {
      playTrickWin();
    }
  }, [lastTrickResult, playTrickWin]);

  // 6 & 7. Match Victory / Defeat Sound
  const prevMatchOver = useRef(false);
  useEffect(() => {
    if (gameState?.matchOver && !prevMatchOver.current) {
      if (gameState.matchWinnerSeatIndex === localSeat) {
        playVictory();
      } else {
        playDefeat();
      }
    }
    prevMatchOver.current = Boolean(gameState?.matchOver);
  }, [gameState?.matchOver, gameState?.matchWinnerSeatIndex, localSeat, playVictory, playDefeat]);

  // 8. Player Join/Leave Notifications Sound
  const prevNotifCount = useRef(0);
  useEffect(() => {
    if (notifications.length > prevNotifCount.current) {
      const latest = notifications[notifications.length - 1];
      if (
        latest &&
        (latest.message?.includes('joined') ||
          latest.message?.includes('left') ||
          latest.message?.includes('Reconnected'))
      ) {
        const isJoin = !latest.message?.includes('left');
        playNotification(isJoin);
      }
    }
    prevNotifCount.current = notifications.length;
  }, [notifications.length, playNotification]);

  // Active cards in player hand
  const hasDealtHand = playerHand && playerHand.length > 0;
  const displayCount = expectedCards > 0 ? expectedCards : 0;
  const displayHand = hasDealtHand ? playerHand : Array(displayCount).fill(null);

  // Play Card handler
  const handlePlayCard = async (card, idx) => {
    if (!card || !isMyTurnToPlay) return;
    try {
      setPlayingCardAnim(card.id || idx);
      await playCard(card);
      setSelectedCardIdx(null);
    } catch (err) {
      // Notification toast displays error
    } finally {
      setTimeout(() => setPlayingCardAnim(null), 500);
    }
  };

  // Helper to render opponent face-down card stack
  const renderOpponentMiniFan = (count) => {
    if (count <= 0) return null;
    const cardsToShow = Math.min(count, 7);
    return (
      <div className="flex items-center -space-x-4 sm:-space-x-5 py-1 pointer-events-none select-none">
        {Array.from({ length: cardsToShow }).map((_, i) => (
          <div
            key={i}
            className="w-6 h-9 sm:w-8 sm:h-11 rounded-md card-back-ornate border border-amber-400/50 shadow-md animate-deal-card"
            style={{
              transform: `rotate(${(i - Math.floor(cardsToShow / 2)) * 3}deg)`,
              animationDelay: `${i * 120}ms`,
            }}
          />
        ))}
      </div>
    );
  };

  // Helper for suit symbol and color
  const getSuitSymbol = (suit) => {
    const s = String(suit || '').toUpperCase();
    if (s === 'HEARTS' || s === 'H') return '♥';
    if (s === 'DIAMONDS' || s === 'D') return '♦';
    if (s === 'CLUBS' || s === 'C') return '♣';
    return '♠';
  };

  const getSuitColor = (suit) => {
    const s = String(suit || '').toUpperCase();
    return s === 'HEARTS' || s === 'DIAMONDS' || s === 'H' || s === 'D'
      ? 'text-rose-500'
      : 'text-slate-900';
  };

  // Render a trick card in the center arena
  const renderTrickCardSlot = (seatObj, posLabel) => {
    if (!seatObj) return null;
    const played = trickCards[seatObj.seatIndex];
    const isWinner =
      lastTrickResult && lastTrickResult.winnerSeatIndex === seatObj.seatIndex;

    return (
      <div className="flex flex-col items-center justify-center relative">
        {played ? (
          <div
            className={`flex flex-col items-center animate-card-played ${
              isWinner ? 'animate-winner-pulse z-30' : 'z-20'
            }`}
          >
            <div
              className={`w-11 h-16 sm:w-15 sm:h-21 md:w-16 md:h-22 rounded-xl card-face bg-gradient-to-br from-white via-slate-50 to-amber-50/20 border p-1 sm:p-1.5 flex flex-col justify-between shadow-2xl transition-all duration-300 ${
                isWinner
                  ? 'border-amber-400 ring-4 ring-amber-400/90 shadow-[0_0_35px_rgba(245,158,11,0.9)] scale-105'
                  : 'border-slate-300/90'
              }`}
            >
              <div className="flex items-center justify-between leading-none text-left">
                <span className={`text-xs sm:text-sm font-black font-mono ${getSuitColor(played.suit)}`}>
                  {played.rank}
                </span>
                <span className={`text-[10px] sm:text-xs ${getSuitColor(played.suit)}`}>
                  {getSuitSymbol(played.suit)}
                </span>
              </div>
              <div className="flex items-center justify-center my-0.5">
                <span className={`text-2xl sm:text-3xl font-black ${getSuitColor(played.suit)} drop-shadow-sm`}>
                  {getSuitSymbol(played.suit)}
                </span>
              </div>
              <div className="flex items-center justify-end leading-none text-right">
                <span className={`text-[10px] sm:text-xs rotate-180 ${getSuitColor(played.suit)}`}>
                  {getSuitSymbol(played.suit)}
                </span>
              </div>
            </div>

            {/* Player Name Pill */}
            <div className="mt-1 px-2 py-0.5 rounded-full bg-slate-950/95 border border-slate-700 text-[8px] sm:text-[9px] font-mono text-slate-200 max-w-[80px] sm:max-w-[100px] truncate shadow-md text-center">
              {seatObj.playerName}
            </div>
          </div>
        ) : (
          <div className="w-11 h-16 sm:w-15 sm:h-21 md:w-16 md:h-22 rounded-xl border-2 border-dashed border-slate-700/60 bg-slate-900/50 flex flex-col items-center justify-center text-slate-500 shadow-inner">
            <span className="font-mono font-bold text-xs sm:text-sm text-slate-400">{posLabel}</span>
            <span className="text-[8px] font-mono text-slate-600 mt-0.5">Wait</span>
          </div>
        )}
      </div>
    );
  };

  const hasTrickCards = trickCards.some(Boolean);
  const showTrickArena = currentStage === 'ready_to_play' || hasTrickCards;

  // Recent activity ticker
  const recentNotifications = notifications.slice(-2);

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-2 sm:p-4 lg:p-6 w-full max-w-7xl mx-auto relative select-none">
      {/* Trump Selection Modal */}
      <TrumpSelectionModal mySeatIndex={localSeat} />

      {/* Simultaneous Pradhan Announcement Overlay */}
      <PradhanAnnouncementOverlay
        announcement={pradhanAnnouncement}
        onDismiss={clearPradhanAnnouncement}
      />

      {/* Top Table Control Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 backdrop-blur-xl border border-slate-800 rounded-2xl px-4 py-2.5 shadow-2xl mb-2 z-30">
        <div className="flex items-center gap-3">
          {isHost ? (
            <button
              onClick={returnToLobby}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 hover:border-amber-500/40 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Lobby</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              <span className="text-amber-300 font-semibold">Table Active</span>
            </div>
          )}

          {/* Game Target & Room Code Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>Target {gameTarget}</span>
            </div>

            {/* Dealer Indicator & Rotate Control */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-amber-500/40 text-xs font-mono text-amber-300 shadow-inner">
              <span className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 text-slate-950 font-serif font-black text-[10px] flex items-center justify-center shadow-sm">
                D
              </span>
              <span className="font-bold">
                Dealer: {roomState.seats[dealerSeatIndex]?.playerName || `Seat ${dealerSeatIndex + 1}`}
              </span>
              {isHost && (
                <button
                  onClick={rotateDealer}
                  title="Rotate Dealer Clockwise (Dealer bids last)"
                  className="ml-1 p-1 hover:bg-amber-500/20 text-amber-400 rounded-md transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center bg-slate-900/90 border border-slate-700 rounded-xl p-0.5 shadow-inner">
              <button
                onClick={copyRoomCode}
                title="Copy Room Code"
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold text-amber-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <span>Room #{roomCode}</span>
                <Copy className="w-3.5 h-3.5 text-amber-400/80" />
              </button>
              <div className="w-[1px] h-4 bg-slate-700 my-auto" />
              <button
                onClick={copyInviteLink}
                title="Copy Shareable Invite Link"
                className="p-1.5 text-slate-300 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Permanent Pinned PRADHAN Indicator */}
        {trumpSuit && (
          <PradhanPinnedIndicator
            trumpSuit={trumpSuit}
            trumpSelectedBy={gameState.trumpSelectedBy}
            selectorName={roomState?.seats?.[gameState.trumpSelectedBy]?.playerName}
            className="my-1 sm:my-0"
          />
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Direct Quick Mute/Unmute Button */}
          <button
            onClick={toggleMute}
            title={settings.isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold font-mono transition-all shadow-sm active:scale-95 cursor-pointer ${
              settings.isMuted
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/60'
                : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60'
            }`}
          >
            {settings.isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sound</span>
              </>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={openSettings}
            title="Open Sound & Game Settings"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* Scoreboard Button */}
          <button
            onClick={() => setShowScoreboardModal(true)}
            title="View Scoreboard & Match History"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 hover:border-amber-400 text-xs font-bold font-mono transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Scoreboard</span>
          </button>

          {/* Host Stage Advance Action */}
          {isHost && (
            <button
              onClick={advanceStage}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-[0_4px_15px_rgba(245,158,11,0.3)] active:scale-95 cursor-pointer"
            >
              <span>Advance Stage</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          )}

          {/* Leave Table Button */}
          <button
            onClick={leaveRoom}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 hover:bg-rose-900/60 hover:border-rose-600/60 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* In-Table Real-Time Activity Ticker */}
      {recentNotifications.length > 0 && (
        <div className="w-full max-w-5xl bg-slate-950/75 border border-slate-800 rounded-xl px-3.5 py-1 mb-1 flex items-center justify-between text-[11px] font-mono text-slate-300 backdrop-blur-md shadow-md animate-fade-in">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-amber-400 font-bold uppercase text-[9px] tracking-wider shrink-0">Live:</span>
            <span className="truncate text-slate-200">
              {recentNotifications[recentNotifications.length - 1]?.message}
            </span>
          </div>
          <span className="text-[9px] text-slate-500 shrink-0 hidden sm:inline">PRO CARD Network</span>
        </div>
      )}

      {/* PRO CARD Scoreboard & Target Status */}
      <Scoreboard roomState={roomState} onOpenScoreboard={() => setShowScoreboardModal(true)} />

      {/* 8-Stage Visual Progress Bar */}
      <div className="w-full max-w-5xl bg-slate-950/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-2.5 mb-2 shadow-xl overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-between min-w-[620px] gap-1 text-[11px] font-mono">
          {STAGE_STEPS.map((step) => {
            const isActive = step.id === currentStage;
            const isCompleted = step.step < stageIndex;

            return (
              <button
                key={step.id}
                disabled={!isHost}
                onClick={() => isHost && setStage(step.id)}
                title={isHost ? `Jump to Stage ${step.step}: ${step.label}` : step.label}
                className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl transition-all border ${
                  isActive
                    ? 'bg-gradient-to-b from-amber-500/25 to-amber-600/10 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)] font-bold'
                    : isCompleted
                    ? 'bg-slate-800 border-slate-700 text-amber-300 font-bold'
                    : 'bg-slate-900/40 border-slate-800 text-slate-500'
                } ${isHost ? 'cursor-pointer hover:border-amber-400/60' : 'cursor-default'}`}
              >
                <div className="flex items-center gap-1">
                  <span
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : isCompleted
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {step.step}
                  </span>
                  <span className="truncate">{step.label}</span>
                </div>
                <span className="text-[9px] opacity-75 mt-0.5">
                  {step.cards > 0 ? `${step.cards} Cards` : '0 Cards'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Casino Card Table */}
      <div className="relative w-full max-w-5xl flex-1 flex flex-col items-center justify-center min-h-[460px] sm:min-h-[520px] lg:min-h-[580px] my-2">
        {/* Padded Leather Rail (Armrest) */}
        <div className="w-full h-full absolute inset-0 rounded-[45px] sm:rounded-[70px] casino-rail p-3.5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.95)]">
          {/* Brass Trim Accent */}
          <div className="w-full h-full rounded-[35px] sm:rounded-[55px] casino-trim p-1">
            {/* Charcoal / Slate Card Table Surface */}
            <div className="w-full h-full rounded-[30px] sm:rounded-[50px] casino-felt relative overflow-hidden shadow-[inset_0_0_80px_rgba(0,0,0,0.9)] flex items-center justify-center border border-slate-800">
              {/* Outer Golden Oval Felt Ring */}
              <div className="absolute inset-5 sm:inset-10 rounded-[25px] sm:rounded-[42px] border border-slate-700/40 pointer-events-none" />

              {/* Central Felt Watermark & Stage Presentation Hub */}
              <div className="relative z-10 flex flex-col items-center justify-center px-2">
                {/* PRO CARD Chess Emblem Watermark */}
                <div className="opacity-15 flex flex-col items-center pointer-events-none select-none mb-1">
                  <div className="flex items-center gap-2 text-2xl sm:text-4xl font-serif text-slate-300">
                    <span>♚</span>
                    <span className="font-sans font-black tracking-widest text-slate-200">PRO CARD</span>
                    <span>♛</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-base text-slate-400 tracking-[0.4em] font-mono">
                    <span>♠</span>
                    <span>♥</span>
                    <span>♦</span>
                    <span>♣</span>
                  </div>
                </div>

                {/* Central Arena: Dynamically represents the 8 Stages or Live Trick Cards */}
                <div className="relative w-64 h-64 sm:w-76 sm:h-76 md:w-80 md:h-80 rounded-full border border-slate-700/50 bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center shadow-[inset_0_0_40px_rgba(0,0,0,0.85)] p-3 sm:p-4 text-center">
                  {/* Current Stage Indicator Banner */}
                  <div className="px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/50 text-[10px] font-mono text-amber-300 font-extrabold uppercase tracking-widest shadow-md mb-1.5">
                    Stage {stageIndex}: {stageLabel}
                  </div>

                  {/* Stage 1: Waiting for Players */}
                  {currentStage === 'waiting_for_players' && (
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-20 rounded-xl card-back-ornate shadow-2xl flex items-center justify-center border-2 border-amber-400/80 mb-2 transform -rotate-3 hover:rotate-0 transition-transform">
                        <span className="text-amber-300 font-serif font-black text-sm">52</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">52-Card Deck Ready</p>
                      {isHost && (
                        <button
                          onClick={dealCards}
                          className="mt-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
                        >
                          Start First Deal (5 Cards)
                        </button>
                      )}
                    </div>
                  )}

                  {/* Stage 2: First Deal */}
                  {currentStage === 'first_deal' && (
                    <div className="flex flex-col items-center animate-fade-in">
                      <div className="text-2xl font-black font-mono text-amber-300 drop-shadow">
                        5 Cards Dealt
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">
                        First round of dealing completed.
                      </p>
                      <div className="mt-2 px-2.5 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 text-[10px] text-amber-400 font-mono">
                        Hand Size: 5 Cards
                      </div>
                    </div>
                  )}

                  {/* Stage 4: Second Deal */}
                  {currentStage === 'second_deal' && (
                    <div className="flex flex-col items-center animate-fade-in">
                      <div className="text-2xl font-black font-mono text-amber-300 drop-shadow">
                        9 Cards Dealt
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">
                        +4 additional cards dealt per player.
                      </p>
                      <div className="mt-2 px-2.5 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 text-[10px] text-amber-400 font-mono">
                        Hand Size: 9 Cards
                      </div>
                    </div>
                  )}

                  {/* Stage 6: Final Deal */}
                  {currentStage === 'final_deal' && (
                    <div className="flex flex-col items-center animate-fade-in">
                      <div className="text-2xl font-black font-mono text-amber-300 drop-shadow">
                        13 Cards Dealt
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">
                        Full 52-card distribution complete.
                      </p>
                      <div className="mt-2 px-2.5 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 text-[10px] text-amber-400 font-mono">
                        Hand Size: 13 Cards (Full Hand)
                      </div>
                    </div>
                  )}

                  {/* Bidding Stages: Stages 3, 5, 7 */}
                  {isBiddingStage && !showTrickArena && (
                    <div className="flex flex-col items-center w-full max-w-[230px] sm:max-w-[260px] animate-fade-in">
                      <div className="text-xs font-black font-mono text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{stageLabel}</span>
                      </div>
                      <div className="w-full bg-slate-950/90 border border-amber-500/30 rounded-xl p-2 my-1 shadow-inner text-left">
                        <div className="text-[9px] uppercase tracking-wider text-amber-400 font-bold mb-1.5 flex items-center justify-between border-b border-slate-800 pb-1">
                          <span>Clockwise Order</span>
                          <span className="text-amber-300 font-mono text-[8px] bg-slate-900 px-1.5 py-0.2 rounded border border-slate-700">
                            Dealer Last
                          </span>
                        </div>
                        <div className="space-y-1 font-mono text-[10px]">
                          {biddingOrder.map((seatIdx, idx) => {
                            const s = roomState.seats[seatIdx];
                            const isDealer = seatIdx === dealerSeatIndex;
                            const isTurn = currentBidderSeatIndex === seatIdx;
                            return (
                              <div
                                key={seatIdx}
                                className={`flex items-center justify-between px-2 py-0.5 rounded transition-all ${
                                  isTurn
                                    ? 'bg-amber-400/20 text-amber-300 font-bold border border-amber-400/50 shadow-sm'
                                    : 'text-slate-300'
                                }`}
                              >
                                <span className="truncate max-w-[110px]">
                                  #{idx + 1} {s?.playerName || `Seat ${seatIdx + 1}`}
                                </span>
                                <span className="text-[9px] font-bold text-right shrink-0">
                                  {isDealer ? (
                                    <span className="text-amber-300 font-black">Dealer (Last)</span>
                                  ) : idx === 0 ? (
                                    <span className="text-amber-400">First</span>
                                  ) : (
                                    <span className="text-slate-500">#{idx + 1}</span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5 text-center">
                        Dealer acts last in the bidding cycle
                      </p>
                    </div>
                  )}

                  {/* Stage 8 & Live Trick Arena */}
                  {showTrickArena && (
                    <div className="flex flex-col items-center w-full animate-fade-in relative z-20">
                      {/* Trick Winner Banner (Celebration effect) */}
                      {lastTrickResult && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.8)] z-40 animate-bounce whitespace-nowrap">
                          <Trophy className="w-3 h-3 fill-slate-950" />
                          <span>Trick Won by {lastTrickResult.winnerName}!</span>
                        </div>
                      )}

                      {/* Turn Spotlight Message */}
                      <div className="text-[11px] font-mono font-bold mb-1 text-center">
                        {isMyTurnToPlay ? (
                          <span className="text-amber-300 flex items-center justify-center gap-1 animate-pulse">
                            <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>Your turn! Select a card from your hand to play</span>
                          </span>
                        ) : activeTurnSeatIndex !== null && roomState.seats[activeTurnSeatIndex] ? (
                          <span className="text-slate-400 flex items-center justify-center gap-1">
                            <span>Waiting for</span>
                            <strong className="text-slate-200">
                              {roomState.seats[activeTurnSeatIndex]?.playerName}
                            </strong>
                            <span>to play...</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Ready to play trick</span>
                        )}
                      </div>

                      {/* 4 Center Trick Card Dropzones: Top (North), Left (West), Right (East), Bottom (South) */}
                      <div className="grid grid-cols-3 gap-1 sm:gap-2 items-center justify-center my-1 w-full max-w-[210px] sm:max-w-[240px]">
                        {/* Row 1: Top (North) */}
                        <div className="col-span-3 flex justify-center">
                          {renderTrickCardSlot(topSeat, 'North')}
                        </div>

                        {/* Row 2: Left (West) - Center - Right (East) */}
                        <div className="flex justify-center">
                          {renderTrickCardSlot(leftSeat, 'West')}
                        </div>

                        {/* Center Trump / Status Emblem */}
                        <div className="flex flex-col items-center justify-center p-1 rounded-xl bg-slate-950/80 border border-slate-800">
                          {trumpSuit ? (
                            <div className="flex flex-col items-center">
                              <span className={`text-xl sm:text-2xl font-serif font-black ${trumpSuit === 'Hearts' || trumpSuit === 'Diamonds' ? 'text-rose-500' : 'text-amber-400'}`}>
                                {getSuitSymbol(trumpSuit)}
                              </span>
                              <span className="text-[8px] font-mono text-amber-300 uppercase tracking-tighter">
                                Trump
                              </span>
                            </div>
                          ) : (
                            <span className="text-[9px] font-mono text-slate-500">PRO CARD</span>
                          )}
                        </div>

                        <div className="flex justify-center">
                          {renderTrickCardSlot(rightSeat, 'East')}
                        </div>

                        {/* Row 3: Bottom (South) */}
                        <div className="col-span-3 flex justify-center">
                          {renderTrickCardSlot(bottomSeat, 'You')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Prominent Pradhan / Trump Suit Display on Table */}
                  {trumpSuit && !showTrickArena && (
                    <div className="mt-2 flex flex-col items-center animate-fade-in z-20">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/90 border border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                        <span className={`text-xl font-serif font-black ${trumpSuit === 'Hearts' || trumpSuit === 'Diamonds' ? 'text-rose-500' : 'text-amber-400'}`}>
                          {getSuitSymbol(trumpSuit)}
                        </span>
                        <span className="text-xs font-mono font-black text-amber-300 uppercase tracking-widest">
                          Trump: {trumpSuit}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono text-slate-400 mt-0.5">
                        Pradhan active for all players
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Four Player Positions Around Table: Top, Left, Right, Bottom --- */}

        {/* 1. TOP (North / Partner) */}
        <div className="absolute top-2 sm:top-5 z-20 flex flex-col items-center gap-1 max-w-[280px]">
          <TableSeat
            seat={topSeat}
            position="top"
            isCurrentPlayer={topSeat?.playerId === player?.playerId}
            roleLabel={topSeat?.playerId === player?.playerId ? 'You' : 'North (Partner)'}
            cardCount={topSeat ? handCounts[topSeat.seatIndex] : 0}
            isDealer={topSeat?.seatIndex === dealerSeatIndex}
            biddingOrderPosition={topSeat ? getBiddingPosition(topSeat.seatIndex) : null}
            isCurrentTurn={topSeat && activeTurnSeatIndex === topSeat.seatIndex}
            currentBid={bidding.playerBids ? bidding.playerBids[topSeat?.seatIndex] : null}
            tricksWon={topSeat ? tricksWon[topSeat.seatIndex] : 0}
            isTrumpMaker={gameState.trumpSelectedBy === topSeat?.seatIndex}
            statusText={activeTurnSeatIndex === topSeat?.seatIndex ? 'Active' : null}
            isTrickWinner={topSeat && lastTrickResult?.winnerSeatIndex === topSeat.seatIndex}
            isTrickLoser={topSeat && lastTrickResult && lastTrickResult.winnerSeatIndex !== topSeat.seatIndex}
          />
          {topSeat && renderOpponentMiniFan(handCounts[topSeat.seatIndex] || expectedCards)}
        </div>

        {/* 2. LEFT (West / Opponent) */}
        <div className="absolute left-1.5 sm:left-4 lg:left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 max-w-[140px] sm:max-w-[200px]">
          <TableSeat
            seat={leftSeat}
            position="left"
            isCurrentPlayer={leftSeat?.playerId === player?.playerId}
            roleLabel={leftSeat?.playerId === player?.playerId ? 'You' : 'West (Left)'}
            cardCount={leftSeat ? handCounts[leftSeat.seatIndex] : 0}
            isDealer={leftSeat?.seatIndex === dealerSeatIndex}
            biddingOrderPosition={leftSeat ? getBiddingPosition(leftSeat.seatIndex) : null}
            isCurrentTurn={leftSeat && activeTurnSeatIndex === leftSeat.seatIndex}
            currentBid={bidding.playerBids ? bidding.playerBids[leftSeat?.seatIndex] : null}
            tricksWon={leftSeat ? tricksWon[leftSeat.seatIndex] : 0}
            isTrumpMaker={gameState.trumpSelectedBy === leftSeat?.seatIndex}
            statusText={activeTurnSeatIndex === leftSeat?.seatIndex ? 'Active' : null}
            isTrickWinner={leftSeat && lastTrickResult?.winnerSeatIndex === leftSeat.seatIndex}
            isTrickLoser={leftSeat && lastTrickResult && lastTrickResult.winnerSeatIndex !== leftSeat.seatIndex}
          />
          {leftSeat && renderOpponentMiniFan(handCounts[leftSeat.seatIndex] || expectedCards)}
        </div>

        {/* 3. RIGHT (East / Opponent) */}
        <div className="absolute right-1.5 sm:right-4 lg:right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 max-w-[140px] sm:max-w-[200px]">
          <TableSeat
            seat={rightSeat}
            position="right"
            isCurrentPlayer={rightSeat?.playerId === player?.playerId}
            roleLabel={rightSeat?.playerId === player?.playerId ? 'You' : 'East (Right)'}
            cardCount={rightSeat ? handCounts[rightSeat.seatIndex] : 0}
            isDealer={rightSeat?.seatIndex === dealerSeatIndex}
            biddingOrderPosition={rightSeat ? getBiddingPosition(rightSeat.seatIndex) : null}
            isCurrentTurn={rightSeat && activeTurnSeatIndex === rightSeat.seatIndex}
            currentBid={bidding.playerBids ? bidding.playerBids[rightSeat?.seatIndex] : null}
            tricksWon={rightSeat ? tricksWon[rightSeat.seatIndex] : 0}
            isTrumpMaker={gameState.trumpSelectedBy === rightSeat?.seatIndex}
            statusText={activeTurnSeatIndex === rightSeat?.seatIndex ? 'Active' : null}
            isTrickWinner={rightSeat && lastTrickResult?.winnerSeatIndex === rightSeat.seatIndex}
            isTrickLoser={rightSeat && lastTrickResult && lastTrickResult.winnerSeatIndex !== rightSeat.seatIndex}
          />
          {rightSeat && renderOpponentMiniFan(handCounts[rightSeat.seatIndex] || expectedCards)}
        </div>

        {/* 4. BOTTOM (South / You) */}
        <div className="absolute bottom-2 sm:bottom-4 z-20 flex items-center gap-2">
          <TableSeat
            seat={bottomSeat}
            position="bottom"
            isCurrentPlayer={true}
            roleLabel="South (You)"
            cardCount={playerHand.length}
            isDealer={bottomSeat?.seatIndex === dealerSeatIndex}
            biddingOrderPosition={bottomSeat ? getBiddingPosition(bottomSeat.seatIndex) : null}
            isCurrentTurn={bottomSeat && activeTurnSeatIndex === bottomSeat.seatIndex}
            currentBid={bidding.playerBids ? bidding.playerBids[bottomSeat?.seatIndex] : null}
            tricksWon={bottomSeat ? tricksWon[bottomSeat.seatIndex] : 0}
            isTrumpMaker={gameState.trumpSelectedBy === bottomSeat?.seatIndex}
            statusText={activeTurnSeatIndex === bottomSeat?.seatIndex ? 'Active' : null}
            isTrickWinner={bottomSeat && lastTrickResult?.winnerSeatIndex === bottomSeat.seatIndex}
            isTrickLoser={bottomSeat && lastTrickResult && lastTrickResult.winnerSeatIndex !== bottomSeat.seatIndex}
          />
        </div>
      </div>

      {/* Interactive Bidding Panel during Bidding Stages */}
      <BiddingPanel mySeatIndex={localSeat} />

      {/* "My Hand" Fanned Playing Cards Area at the Bottom */}
      <div className="w-full max-w-4xl bg-slate-950/85 backdrop-blur-xl border border-slate-800 rounded-2xl p-3 sm:p-4 mt-2 shadow-2xl relative z-20">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              My Hand:
            </span>
            <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300">
              {playerHand.length > 0 ? `${playerHand.length} Cards` : `${expectedCards} Cards`}
            </span>
          </div>

          {/* Selected Card Action Pill / Play Card Button */}
          {selectedCardIdx !== null && playerHand[selectedCardIdx] && (
            <div className="flex items-center gap-2 bg-slate-900 border border-amber-400/60 rounded-xl px-3 py-1 shadow-lg animate-fade-in">
              <span className="text-xs font-mono text-slate-300">
                Selected:{' '}
                <strong className={`font-black ${getSuitColor(playerHand[selectedCardIdx].suit)}`}>
                  {playerHand[selectedCardIdx].rank} {getSuitSymbol(playerHand[selectedCardIdx].suit)}
                </strong>
              </span>

              {isMyTurnToPlay && (
                <button
                  onClick={() => handlePlayCard(playerHand[selectedCardIdx], selectedCardIdx)}
                  className="px-3.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-slate-950" />
                  <span>Play Card</span>
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] text-slate-300 font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              <span>Cards Private to You</span>
            </span>
          </div>
        </div>

        {/* Smooth Fanned Card Deck Displaying 5, 9, or 13 Cards */}
        <div className="flex items-end justify-center -space-x-4 sm:-space-x-6 md:-space-x-7 lg:-space-x-8 overflow-x-auto pt-6 pb-2 px-3 no-scrollbar min-h-[135px] sm:min-h-[160px]">
          {displayHand.length === 0 ? (
            <div className="text-xs font-mono text-slate-500 py-6">
              Waiting for deal to begin...
            </div>
          ) : (
            displayHand.map((card, idx) => {
              const totalCards = displayHand.length;
              const mid = (totalCards - 1) / 2;
              const rotation = (idx - mid) * (totalCards > 9 ? 2.0 : 2.8);
              const translateY = Math.abs(idx - mid) * (totalCards > 9 ? 1.4 : 2.0);
              const isSelected = selectedCardIdx === idx;

              if (!card) {
                // Pre-deal placeholder card back
                return (
                  <div
                    key={idx}
                    className="animate-deal-card shrink-0"
                    style={{ animationDelay: `${idx * 120}ms` }}
                  >
                    <PlayingCard
                      isFaceUp={false}
                      isInteractive={false}
                      rotation={rotation}
                      translateY={translateY}
                      size="md"
                    />
                  </div>
                );
              }

              // Realistic playing card face
              return (
                <div
                  key={card.id || `${card.suit}-${card.rank}-${idx}`}
                  className="animate-deal-card shrink-0 transition-transform duration-200"
                  style={{ animationDelay: `${idx * 35}ms` }}
                >
                  <PlayingCard
                    rank={card.rank}
                    suit={card.suit}
                    isFaceUp={true}
                    isInteractive={true}
                    isSelected={isSelected}
                    isPradhan={Boolean(trumpSuit && String(card.suit || '').toUpperCase() === String(trumpSuit || '').toUpperCase())}
                    rotation={isSelected ? 0 : rotation}
                    translateY={translateY}
                    onClick={() => {
                      if (isSelected && isMyTurnToPlay) {
                        handlePlayCard(card, idx);
                      } else {
                        setSelectedCardIdx(isSelected ? null : idx);
                      }
                    }}
                    size="md"
                  />
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono pt-2 border-t border-slate-800/80">
          <span>
            {hasDealtHand
              ? isMyTurnToPlay
                ? '⚡ Your Turn: Tap a card to select and play it into the trick'
                : `Stage: ${stageLabel} • ${playerHand.length} cards in hand`
              : 'Click "Start First Deal" above to deal 5 cards'}
          </span>
          <span className="text-amber-400/90 font-medium hidden sm:inline">
            PRO CARD • 4-Player Strategic Card Table
          </span>
        </div>
      </div>

      {/* Interactive Scoreboard & Match History Modal */}
      <ScoreboardModal
        isOpen={showScoreboardModal}
        onClose={() => setShowScoreboardModal(false)}
        gameState={gameState}
        seats={roomState.seats}
        gameTarget={gameTarget}
        onPlayAgain={resetMatch}
        isHost={isHost}
        isOffline={false}
      />

      {/* Match Champion & Rankings Winner Modal */}
      <MatchWinnerModal
        isOpen={showWinnerModal}
        onClose={() => setShowWinnerModal(false)}
        gameState={gameState}
        seats={roomState.seats}
        gameTarget={gameTarget}
        onPlayAgain={resetMatch}
        onOpenScoreboard={() => setShowScoreboardModal(true)}
        isHost={isHost}
        isOffline={false}
      />

      {/* Complete Audio & Game Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={closeSettings}
      />
    </div>
  );
};
