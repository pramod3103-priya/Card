import React from 'react';
import { Target, Trophy, Sparkles, Award, History, TrendingUp, ChevronRight } from 'lucide-react';

export const Scoreboard = ({ roomState, onOpenScoreboard }) => {
  if (!roomState) return null;

  const gameState = roomState.gameState || {};
  const bidding = gameState.bidding || {};
  const gameTarget = roomState.gameTarget || gameState.gameTarget || 31;
  const trumpSuit = gameState.trumpSuit;
  const trumpSelectedBy = gameState.trumpSelectedBy;
  const scores = gameState.scores || [0, 0, 0, 0];
  const tricksWon = gameState.tricksWon || [0, 0, 0, 0];
  const roundHistory = gameState.roundHistory || [];
  const currentRound = gameState.currentRoundNumber || 1;

  // Find leading player
  const maxScore = Math.max(...scores);
  const leaderIndex = scores.indexOf(maxScore);
  const leaderSeat = roomState.seats?.[leaderIndex];
  const leaderName = leaderSeat?.playerName || `Player ${leaderIndex + 1}`;

  // Suit styling helper
  const getSuitDetails = (suit) => {
    switch (suit) {
      case 'Hearts':
        return { symbol: '♥', color: 'text-rose-500', name: 'Hearts (Red)' };
      case 'Diamonds':
        return { symbol: '♦', color: 'text-rose-500', name: 'Diamonds (Red)' };
      case 'Clubs':
        return { symbol: '♣', color: 'text-slate-200', name: 'Clubs (Black)' };
      case 'Spades':
        return { symbol: '♠', color: 'text-amber-400', name: 'Spades (Black)' };
      default:
        return { symbol: '?', color: 'text-slate-400', name: 'Not Selected' };
    }
  };

  const suitDetails = getSuitDetails(trumpSuit);

  return (
    <div className="w-full max-w-5xl bg-slate-950/85 backdrop-blur-xl border border-slate-800 rounded-2xl p-2.5 sm:p-3.5 my-2 shadow-2xl relative z-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3">
        {/* Left: Game Target & Status */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          {/* Game Target Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border border-amber-500/40 shadow-sm">
            <Target className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-left font-mono">
              <span className="text-[10px] text-amber-400/80 uppercase tracking-widest block font-bold leading-none">
                Target
              </span>
              <span className="text-xs sm:text-sm font-black text-amber-300 leading-tight">
                {gameTarget} Pts
              </span>
            </div>
          </div>

          {/* Pradhan / Trump Suit Display */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 shadow-inner">
            <span className={`text-xl font-serif font-black ${suitDetails.color} leading-none drop-shadow`}>
              {suitDetails.symbol}
            </span>
            <div className="text-left font-mono">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold leading-none">
                Pradhan
              </span>
              <span className="text-xs font-bold text-slate-100 leading-tight">
                {trumpSuit ? (
                  <span>
                    {suitDetails.name}{' '}
                    {trumpSelectedBy === 'default_all_passed' && (
                      <span className="text-[10px] text-amber-400 font-normal">(Default)</span>
                    )}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Pending Auction</span>
                )}
              </span>
            </div>
          </div>

          {/* Winning Bid Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 shadow-inner">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-left font-mono">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold leading-none">
                Contract Bid
              </span>
              <span className="text-xs font-bold text-slate-200 leading-tight">
                {bidding.winningBid ? (
                  <span>
                    <strong className="text-amber-300">{bidding.winningBid} tricks</strong> by{' '}
                    {roomState.seats[bidding.winningBidderSeatIndex]?.playerName || 'Winner'}
                  </span>
                ) : bidding.highestBid ? (
                  <span>
                    <strong className="text-amber-400">{bidding.highestBid}</strong> ({roomState.seats[bidding.highestBidderSeatIndex]?.playerName})
                  </span>
                ) : (
                  <span className="text-slate-400">None</span>
                )}
              </span>
            </div>
          </div>

          {/* Leaderboard Fast Summary */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400">
              Leader:{' '}
              <strong className="text-slate-200">{leaderName}</strong> (
              <span className="text-amber-400 font-bold">{maxScore} pts</span>)
            </span>
          </div>
        </div>

        {/* Right: Scoreboard Button */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={onOpenScoreboard}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-500/50 hover:border-amber-400 text-amber-300 text-xs font-bold font-mono transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Scoreboard & History</span>
            {roundHistory.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                R{currentRound}
              </span>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-amber-400/80" />
          </button>
        </div>
      </div>
    </div>
  );
};
