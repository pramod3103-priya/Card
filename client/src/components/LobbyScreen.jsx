import React from 'react';
import { useSocket } from '../context/SocketContext';
import { PlayerSeat } from './PlayerSeat';
import { AnimatedCharacterAvatar } from './character-avatars';
import { PLAYABLE_CHARACTERS } from '../data/characters';
import { Users, Copy, Link2, Play, CheckCircle2, Crown, LogOut, Sparkles } from 'lucide-react';

export const LobbyScreen = () => {
  const {
    roomState,
    player,
    roomCode,
    toggleReady,
    selectCharacter,
    startGamePreview,
    leaveRoom,
    copyRoomCode,
    copyInviteLink,
  } = useSocket();

  if (!roomState) return null;

  const currentSeat = roomState.seats.find((s) => s && s.playerId === player?.playerId);
  const isHost = player?.isHost || currentSeat?.isHost;
  const isReady = currentSeat?.isReady || false;
  const playerCount = roomState.playerCount || 0;
  const canStart = roomState.canStart;
  const myCharacterId = currentSeat?.characterId || 'odi';

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
      {/* Lobby Header Card */}
      <div className="w-full bg-slate-950/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-5 sm:p-7 mb-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
                Multiplayer Waiting Room
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono font-bold">
                {playerCount}/4 Players
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono font-bold">
                Target: {roomState.gameTarget || 31}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-serif tracking-wide text-slate-100 flex items-center gap-3">
              Room #{roomCode}
              <button
                onClick={copyRoomCode}
                title="Copy Room Code"
                className="p-1.5 rounded-xl text-slate-400 hover:text-amber-300 hover:bg-slate-900 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </h2>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={copyInviteLink}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Link2 className="w-4 h-4 text-amber-400" />
              <span>Copy Invite Link</span>
            </button>

            <button
              onClick={leaveRoom}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-950/50 border border-rose-800/50 hover:bg-rose-900/70 text-rose-300 text-xs font-bold tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Leave Room</span>
            </button>
          </div>
        </div>

        {/* Progress Bar towards 4 players */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
            <span>Seat Capacity</span>
            <span className={playerCount === 4 ? 'text-amber-400 font-bold' : 'text-slate-400 font-medium'}>
              {playerCount === 4
                ? 'Full Table (4/4 Players Ready to Play)'
                : `Waiting for ${4 - playerCount} more player${4 - playerCount > 1 ? 's' : ''}...`}
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5 shadow-inner">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                playerCount === 4
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-gradient-to-r from-slate-600 to-slate-400'
              }`}
              style={{ width: `${(playerCount / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Animated Character Avatar Selection Bar for Local Player */}
      <div className="w-full bg-slate-950/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-4 sm:p-5 mb-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
              Select Your 3D Avatar
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">
              Pick your animated character for this match
            </span>
          </div>
          <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-mono">
            Selected: <strong className="text-amber-300 font-bold uppercase">{myCharacterId}</strong>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PLAYABLE_CHARACTERS.map((char) => {
            const isSelected = myCharacterId === char.id;
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => selectCharacter(char.id)}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 text-left cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.3)] ring-2 ring-amber-400/80 scale-[1.02]'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <AnimatedCharacterAvatar
                  characterId={char.id}
                  size="sm"
                  state={isSelected ? 'celebrating' : 'idle'}
                  showGlow={isSelected}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">{char.name}</span>
                    <span className="text-xs shrink-0">{char.flagEmoji}</span>
                  </div>
                  <span className="text-[9px] font-mono text-amber-400 font-bold block truncate">
                    {char.styleLabel}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 block truncate">
                    {char.favoriteTrump}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Player Seats Grid */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {roomState.seats.map((seat, index) => (
          <PlayerSeat
            key={index}
            seat={seat}
            seatIndex={index}
            isCurrentPlayer={seat?.playerId === player?.playerId}
            isDealer={roomState.gameState?.dealerSeatIndex === index}
          />
        ))}
      </div>

      {/* Action Footer Controls */}
      <div className="w-full max-w-2xl bg-slate-950/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Ready Toggle Button */}
        <button
          onClick={toggleReady}
          className={`w-full sm:w-auto flex-1 flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl text-sm font-black tracking-wider uppercase transition-all shadow-xl active:scale-[0.98] cursor-pointer ${
            isReady
              ? 'bg-slate-800 border border-slate-600 text-amber-300 shadow-lg shadow-black/40 hover:bg-slate-700'
              : 'bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-400/50'
          }`}
        >
          {isReady ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-amber-400" />
              <span>Ready (Click to Cancel)</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Ready Up</span>
            </>
          )}
        </button>

        {/* Host Start Table Preview Button */}
        {isHost ? (
          <div className="w-full sm:w-auto flex-1 flex flex-col items-center">
            <button
              onClick={startGamePreview}
              disabled={!canStart}
              className={`w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-black tracking-wider uppercase transition-all shadow-xl active:scale-[0.98] cursor-pointer ${
                canStart
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-[0_8px_30px_rgba(245,158,11,0.35)] hover:brightness-110 animate-pulse'
                  : 'bg-slate-900/80 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
              }`}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Table Preview</span>
            </button>
            {!canStart && (
              <span className="text-[10px] text-amber-400/90 font-mono mt-1.5 text-center">
                Requires 4 players seated & all marked Ready
              </span>
            )}
          </div>
        ) : (
          <div className="w-full sm:w-auto flex-1 px-4 py-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-300">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Host Action Required</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Waiting for host to start table preview
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
