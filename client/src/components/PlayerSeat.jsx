import React from 'react';
import { Crown, CheckCircle2, Clock, UserX, Wifi, WifiOff, Plus, Mic, MicOff } from 'lucide-react';
import { useVoiceChat } from '../context/VoiceChatContext';
import { AnimatedCharacterAvatar } from './character-avatars';

export const PlayerSeat = ({ seat, seatIndex, isCurrentPlayer, isDealer = false }) => {
  const { getSeatVoiceState } = useVoiceChat();
  const SEAT_POSITIONS = ['South (Seat 1)', 'West (Seat 2)', 'North (Seat 3)', 'East (Seat 4)'];

  if (!seat || seat.isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed border-slate-800 bg-slate-950/50 backdrop-blur-md text-center transition-all hover:border-slate-700 shadow-lg group">
        <div className="w-16 h-16 rounded-2xl bg-slate-900/80 flex items-center justify-center text-slate-500 mb-3 border border-slate-800 group-hover:scale-105 transition-transform">
          <Plus className="w-7 h-7 text-slate-600 group-hover:text-amber-400 transition-colors" />
        </div>
        <div className="text-[10px] uppercase tracking-widest font-mono font-bold text-amber-400/90 mb-1">
          {SEAT_POSITIONS[seatIndex]}
        </div>
        <h4 className="text-sm font-bold text-slate-300">Open Seat</h4>
        <p className="text-[11px] text-slate-500 mt-1 max-w-[150px]">
          Share room code or invite link to fill seat
        </p>
      </div>
    );
  }

  const { playerName, avatarColor, isHost, isReady, isConnected } = seat;
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

  return (
    <div
      className={`relative flex flex-col p-5 rounded-3xl border backdrop-blur-xl transition-all duration-300 shadow-2xl ${
        isSpeaking
          ? 'ring-2 ring-emerald-400 bg-slate-950/95 border-emerald-400/90 shadow-[0_0_25px_rgba(52,211,153,0.4)]'
          : isCurrentPlayer
          ? 'bg-gradient-to-b from-slate-950/95 via-slate-900/70 to-slate-950/95 border-amber-500/70 shadow-[0_10px_30px_rgba(245,158,11,0.15)]'
          : 'bg-slate-950/80 border-slate-800 shadow-black/70'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
          {SEAT_POSITIONS[seatIndex]}
        </span>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5">
          {isDealer && (
            <span
              title="Dealer (Acts Last in Bidding Order)"
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-bold uppercase tracking-wider shadow-sm"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-300 to-yellow-500 text-slate-950 font-serif font-black text-[9px] flex items-center justify-center">
                D
              </span>
              <span>Dealer</span>
            </span>
          )}

          {isHost && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider shadow-sm">
              <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>Host</span>
            </span>
          )}

          {/* Voice Mic Status Pill */}
          <span
            title={
              !isMicOn
                ? 'Mic OFF'
                : isMuted
                ? 'Microphone Muted'
                : isSpeaking
                ? 'Speaking Live'
                : 'Mic ON'
            }
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
              !isMicOn
                ? 'bg-slate-900/80 border-slate-700 text-slate-500'
                : isMuted
                ? 'bg-rose-950/70 border-rose-700 text-rose-300'
                : isSpeaking
                ? 'bg-emerald-500 border-emerald-200 text-slate-950 font-black animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                : 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
            }`}
          >
            {isMicOn && !isMuted ? (
              <Mic className="w-3 h-3" />
            ) : (
              <MicOff className="w-3 h-3" />
            )}
            <span className="hidden xs:inline">
              {!isMicOn ? 'Off' : isMuted ? 'Muted' : isSpeaking ? 'Live' : 'On'}
            </span>
          </span>

          {/* Connection status */}
          <span
            title={isConnected ? 'Connected' : 'Connection lost (holding seat)'}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
              isConnected
                ? 'bg-slate-900 border-slate-700 text-slate-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300 animate-pulse'
            }`}
          >
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3 text-amber-400" />
                <span className="hidden xs:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-rose-400" />
                <span>Away</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Avatar and Name */}
      <div className="flex items-center gap-3.5 mb-5">
        <AnimatedCharacterAvatar
          characterId={seat.characterId || ['odi', 'putin', 'trampu', 'ironman'][seatIndex ?? 0]}
          state={isSpeaking ? 'speaking' : isReady ? 'celebrating' : 'idle'}
          size="md"
          isHuman={isCurrentPlayer}
          showGlow={isSpeaking || isReady}
          badge={
            isCurrentPlayer ? (
              <div className="px-1.5 py-0.2 rounded-md bg-slate-950 border border-amber-400 text-[9px] font-black text-amber-300 tracking-wider shadow">
                YOU
              </div>
            ) : null
          }
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-bold text-slate-100 truncate tracking-wide">{playerName}</h3>
            {isSpeaking && (
              <span className="text-[8px] font-black px-1.5 py-0.2 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 uppercase tracking-widest animate-pulse flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                TALKING
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {isCurrentPlayer ? 'Local Player' : 'Remote Opponent'}
          </p>
        </div>
      </div>

      {/* Ready Status Banner */}
      <div
        className={`mt-auto flex items-center justify-between px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all shadow-sm ${
          isReady
            ? 'bg-slate-900 border-amber-500/60 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
            : 'bg-slate-900/60 border-slate-800 text-slate-400'
        }`}
      >
        <span className="tracking-widest uppercase text-[10px] font-mono">Status</span>
        <div className="flex items-center gap-1.5">
          {isReady ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 font-black tracking-wider">READY</span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 text-slate-500 animate-spin-slow" />
              <span className="text-slate-400 font-medium">WAITING</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
