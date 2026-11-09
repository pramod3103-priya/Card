import React from 'react';
import { Crown, CheckCircle2, Mic, MicOff, Trophy, Sparkles, Zap, Layers } from 'lucide-react';
import { useVoiceChat } from '../context/VoiceChatContext';
import { AnimatedCharacterAvatar } from './character-avatars';

export const TableSeat = ({
  seat,
  position = 'bottom',
  isCurrentPlayer = false,
  roleLabel,
  cardCount = 0,
  isDealer = false,
  biddingOrderPosition = null, // 1, 2, 3, or 4
  isCurrentTurn = false,
  currentBid = null,
  tricksWon = 0,
  isTrumpMaker = false,
  statusText = null,
  isTrickWinner = false,
  isTrickLoser = false,
}) => {
  const { getSeatVoiceState } = useVoiceChat();

  if (!seat || seat.isEmpty) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-slate-950/80 border-2 border-dashed border-slate-800 text-slate-500 text-xs backdrop-blur-md shadow-lg select-none">
        <span className="w-2 h-2 rounded-full bg-slate-700 animate-pulse" />
        <span className="font-medium tracking-wide">Empty Seat</span>
      </div>
    );
  }

  const { playerName, avatarColor, isHost, isConnected, isReady } = seat;
  const voiceState = getSeatVoiceState(seat);
  const isSpeaking = voiceState?.isSpeaking || false;
  const isMicOn = voiceState?.isMicOn || false;
  const isMuted = voiceState?.isMuted ?? true;

  const initials = playerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Position-specific accents
  const positionTag =
    position === 'bottom'
      ? 'South'
      : position === 'top'
      ? 'North'
      : position === 'left'
      ? 'West'
      : 'East';

  // Resolve dynamic avatar animation state
  let avatarState = 'idle';
  if (isTrickWinner) {
    avatarState = 'celebrating';
  } else if (isTrickLoser) {
    avatarState = 'disappointed';
  } else if (isSpeaking) {
    avatarState = 'speaking';
  } else if (isCurrentTurn) {
    avatarState = 'thinking';
  }

  // Fallback character ID by seat index
  const resolvedCharId =
    seat.characterId || ['odi', 'putin', 'trampu', 'ironman'][seat.seatIndex ?? 0];

  return (
    <div
      className={`relative flex items-center gap-2 sm:gap-3 p-2 sm:px-3.5 sm:py-2.5 rounded-2xl border backdrop-blur-xl transition-all duration-300 shadow-2xl select-none ${
        isTrickWinner
          ? 'ring-4 ring-amber-400 bg-slate-950/95 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.8)]'
          : isSpeaking
          ? 'ring-2 ring-emerald-400 bg-slate-950/95 border-emerald-400/90 shadow-[0_0_25px_rgba(52,211,153,0.5)]'
          : isCurrentTurn
          ? 'ring-4 ring-amber-400 bg-slate-950/95 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.7)] animate-pulse'
          : isCurrentPlayer
          ? 'bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-slate-950/90 border-amber-500/80 shadow-[0_8px_25px_rgba(245,158,11,0.2)]'
          : 'bg-slate-950/85 border-slate-800 shadow-black/60'
      }`}
    >
      {/* Active Turn Radiant Top Bar Indicator */}
      {isCurrentTurn && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg z-30 animate-bounce">
          <Zap className="w-2.5 h-2.5 fill-slate-950" />
          <span>{isCurrentPlayer ? 'YOUR TURN' : 'ACTIVE TURN'}</span>
        </div>
      )}

      {/* 3D Animated Character Avatar Container */}
      <div className="relative shrink-0">
        <AnimatedCharacterAvatar
          characterId={resolvedCharId}
          state={avatarState}
          size="sm"
          isHuman={isCurrentPlayer}
          showGlow={isCurrentTurn || isSpeaking || isTrickWinner}
          badge={
            isDealer ? (
              <div
                title="Dealer (Acts last in clockwise order)"
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-600 border border-white/90 flex items-center justify-center shadow-lg font-serif font-black text-[9px] sm:text-[10px] text-slate-950 animate-bounce"
              >
                D
              </div>
            ) : isTrumpMaker ? (
              <div
                title="Trump Maker (Pradhan Nirdharak)"
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 border border-white/90 flex items-center justify-center shadow-lg text-[9px] sm:text-[10px] text-white"
              >
                ★
              </div>
            ) : null
          }
        />

        {/* Connection status indicator */}
        <div
          title={isConnected ? 'Connected' : 'Disconnected'}
          className={`absolute -bottom-1 -right-1 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-slate-950 shadow-sm z-30 ${
            isConnected ? 'bg-emerald-400' : 'bg-rose-500'
          }`}
        />

        {/* Host Crown icon badge */}
        {isHost && (
          <div
            title="Room Host"
            className="absolute -top-1.5 right-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-amber-400/90 text-slate-950 flex items-center justify-center shadow z-30"
          >
            <Crown className="w-2.5 h-2.5" />
          </div>
        )}
      </div>

      {/* Player info & labels */}
      <div className="flex flex-col min-w-0 pr-1">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-xs sm:text-sm text-slate-100 truncate max-w-[80px] sm:max-w-[120px]">
            {playerName}
          </span>

          {isCurrentPlayer && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/25 border border-amber-400/50 text-[9px] font-black font-mono text-amber-300 tracking-wider">
              YOU
            </span>
          )}

          {isReady && !isCurrentTurn && (
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
          )}

          {/* Voice Chat Status Pill */}
          <div
            title={
              isSpeaking
                ? 'Speaking live now'
                : !isMicOn
                ? 'Microphone OFF'
                : isMuted
                ? 'Muted'
                : 'Microphone ON'
            }
            className={`flex items-center justify-center p-0.5 rounded-full border text-[9px] transition-all ${
              isSpeaking
                ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 ring-2 ring-emerald-400 animate-pulse'
                : isMicOn && !isMuted
                ? 'bg-slate-800 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            {isSpeaking ? (
              <Mic className="w-2.5 h-2.5 text-emerald-300 animate-bounce" />
            ) : isMicOn && !isMuted ? (
              <Mic className="w-2.5 h-2.5 text-emerald-400" />
            ) : (
              <MicOff className="w-2.5 h-2.5 text-slate-500" />
            )}
          </div>
        </div>

        {/* Role & Position metadata */}
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
          <span className="text-amber-400/90 font-medium">{positionTag}</span>
          {roleLabel && (
            <>
              <span className="text-slate-600">•</span>
              <span className="truncate">{roleLabel}</span>
            </>
          )}
          {cardCount > 0 && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-amber-300 font-bold flex items-center gap-0.5">
                <Layers className="w-2.5 h-2.5 text-amber-400 inline" />
                <span>{cardCount}c</span>
              </span>
            </>
          )}
          {tricksWon > 0 && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-amber-300 font-bold flex items-center gap-0.5">
                <Trophy className="w-2.5 h-2.5 text-amber-400 inline" />
                <span>{tricksWon}</span>
              </span>
            </>
          )}
        </div>

        {/* Bottom Status Badge: Bid Info or Order Tag */}
        <div className="mt-1 flex items-center gap-1 flex-wrap">
          {currentBid !== null && currentBid !== undefined && (
            <span className="text-[9px] font-mono font-black px-2 py-0.2 rounded-full bg-slate-900 border border-amber-500/50 text-amber-300 shadow-sm">
              Bid: {currentBid}
            </span>
          )}

          {statusText && (
            <span className="text-[9px] font-mono font-medium px-2 py-0.2 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300">
              {statusText}
            </span>
          )}

          {biddingOrderPosition !== null && currentBid === null && (
            <span
              className={`text-[9px] font-mono font-black px-2 py-0.2 rounded-full border ${
                biddingOrderPosition === 4
                  ? 'bg-amber-500/25 border-amber-400/60 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                  : biddingOrderPosition === 1
                  ? 'bg-slate-800 border-slate-700 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300'
              }`}
            >
              {biddingOrderPosition === 1
                ? 'Bid #1 (First)'
                : biddingOrderPosition === 4
                ? 'Bid #4 (Dealer)'
                : `Bid #${biddingOrderPosition}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
