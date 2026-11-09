import React from 'react';
import { AnimatedCharacterAvatar } from './character-avatars';
import {
  Trophy,
  Crown,
  Award,
  Sparkles,
  RotateCcw,
  History,
  TrendingUp,
  X,
  Target,
  Flame,
} from 'lucide-react';

export const MatchWinnerModal = ({
  isOpen,
  onClose,
  gameState = {},
  seats = [],
  gameTarget = 31,
  onPlayAgain,
  onOpenScoreboard,
  isHost = false,
  isOffline = false,
}) => {
  if (!isOpen) return null;

  const scores = gameState.scores || [0, 0, 0, 0];
  const roundHistory = gameState.roundHistory || [];
  const winnerSeatIndex = gameState.matchWinnerSeatIndex ?? 0;
  const winnerSeat = seats[winnerSeatIndex];
  const winnerName =
    winnerSeat?.playerName || winnerSeat?.character?.name || `Player ${winnerSeatIndex + 1}`;
  const winnerScore = scores[winnerSeatIndex] || 0;

  // Build sorted rankings
  const rankings = seats
    .map((seat, index) => {
      const name = seat?.playerName || seat?.character?.name || `Player ${index + 1}`;
      const avatarColor = seat?.avatarColor || '#f59e0b';
      const score = scores[index] || 0;
      const isWinner = winnerSeatIndex === index;
      const isHuman = seat?.isHuman || (isOffline && index === 0);
      const isBot = seat?.isBot || (isOffline && index !== 0);

      // Lifetime tricks
      const totalTricks = roundHistory.reduce(
        (sum, r) => sum + (r.tricksWon?.[index] || 0),
        0
      ) + (gameState.tricksWon?.[index] || 0);

      return {
        seatIndex: index,
        seatName: seat?.seatName || ['South', 'West', 'North', 'East'][index],
        name,
        avatarColor,
        score,
        totalTricks,
        isWinner,
        isHuman,
        isBot,
        character: seat?.character,
      };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-xl bg-slate-900 border-2 border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden relative">
        {/* Shimmer background banner */}
        <div className="absolute top-0 inset-x-0 h-44 bg-gradient-to-b from-amber-500/20 via-yellow-500/10 to-transparent pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Champion Celebration Header */}
        <div className="relative pt-8 pb-5 px-6 text-center space-y-2">
          {/* Winner Animated Avatar with Crown */}
          <div className="relative inline-block mx-auto mb-2">
            <AnimatedCharacterAvatar
              characterId={winnerSeat?.characterId || winnerSeat?.character?.id || ['odi', 'putin', 'trampu', 'ironman'][winnerSeatIndex]}
              state="celebrating"
              size="xl"
              showGlow={true}
              badge={
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-600 border border-white text-slate-950 flex items-center justify-center shadow-lg animate-bounce">
                  <Crown className="w-5 h-5 text-slate-950 fill-slate-950" />
                </div>
              }
            />
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
              PRO CARD MATCH CHAMPION
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white font-serif tracking-tight drop-shadow">
              {winnerName}
            </h1>
            <p className="text-xs text-amber-300/90 font-mono">
              Achieved <strong className="text-white font-bold">{winnerScore} Points</strong> (Target: {gameTarget} Pts)
            </p>
          </div>
        </div>

        {/* Player Rankings Podium / List */}
        <div className="px-5 sm:px-6 py-3 space-y-2.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold px-1 flex justify-between">
            <span>Player Rankings</span>
            <span>Final Score</span>
          </div>

          <div className="space-y-2">
            {rankings.map((p, idx) => {
              const isFirst = idx === 0;
              const isSecond = idx === 1;
              const isThird = idx === 2;

              return (
                <div
                  key={p.seatIndex}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    isFirst
                      ? 'bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Medal Badge */}
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                        isFirst
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : isSecond
                          ? 'bg-slate-300 text-slate-950'
                          : isThird
                          ? 'bg-amber-700 text-amber-100'
                          : 'bg-slate-850 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : '4'}
                    </div>

                    {/* Animated Avatar */}
                    <AnimatedCharacterAvatar
                      characterId={p.character?.id || ['odi', 'putin', 'trampu', 'ironman'][p.seatIndex]}
                      size="xs"
                      state={isFirst ? 'celebrating' : 'idle'}
                      showGlow={isFirst}
                    />

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-100">{p.name}</span>
                        {isFirst && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                        {p.isHuman && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                            YOU
                          </span>
                        )}
                        {p.isBot && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px] font-bold border border-slate-700">
                            BOT
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {p.seatName} • Total Tricks: {p.totalTricks}
                      </span>
                    </div>
                  </div>

                  {/* Final Points */}
                  <div className="text-right font-mono">
                    <span
                      className={`text-lg font-black ${
                        isFirst ? 'text-amber-400' : 'text-slate-200'
                      }`}
                    >
                      {p.score}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="px-5 sm:px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            onClick={() => {
              if (onOpenScoreboard) onOpenScoreboard();
              onClose();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>Full Scoreboard & History</span>
          </button>

          {(isHost || isOffline) && onPlayAgain ? (
            <button
              onClick={() => {
                onPlayAgain();
                onClose();
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

