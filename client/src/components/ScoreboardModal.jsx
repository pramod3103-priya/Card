import React, { useState } from 'react';
import { AnimatedCharacterAvatar } from './character-avatars';
import {
  Trophy,
  Award,
  Crown,
  Target,
  Sparkles,
  RotateCcw,
  X,
  History,
  Layers,
  ChevronRight,
  TrendingUp,
  Flame,
  CheckCircle2,
  XCircle,
  Shield,
  Zap,
} from 'lucide-react';

export const ScoreboardModal = ({
  isOpen,
  onClose,
  gameState = {},
  seats = [],
  gameTarget = 31,
  onPlayAgain,
  isHost = false,
  isOffline = false,
}) => {
  const [activeTab, setActiveTab] = useState('standings'); // 'standings' | 'history' | 'tricks'

  if (!isOpen) return null;

  const scores = gameState.scores || [0, 0, 0, 0];
  const tricksWon = gameState.tricksWon || [0, 0, 0, 0];
  const roundHistory = gameState.roundHistory || [];
  const trickHistory = gameState.trickHistory || [];
  const currentRound = gameState.currentRoundNumber || 1;
  const matchOver = gameState.matchOver || false;
  const matchWinnerSeatIndex = gameState.matchWinnerSeatIndex;
  const trumpSuit = gameState.trumpSuit;
  const bidding = gameState.bidding || {};

  // Build sorted player rankings based on total score descending
  const playerRankings = seats
    .map((seat, index) => {
      const name = seat?.playerName || seat?.character?.name || `Player ${index + 1}`;
      const avatarColor = seat?.avatarColor || '#f59e0b';
      const score = scores[index] || 0;
      const roundTricks = tricksWon[index] || 0;
      const isWinner = matchWinnerSeatIndex === index;
      const isHuman = seat?.isHuman || (isOffline && index === 0);
      const isBot = seat?.isBot || (isOffline && index !== 0);

      // Total lifetime tricks across all recorded rounds
      const lifetimeTricks = roundHistory.reduce((sum, r) => sum + (r.tricksWon?.[index] || 0), 0) + roundTricks;

      return {
        seatIndex: index,
        seatName: seat?.seatName || ['South', 'West', 'North', 'East'][index],
        name,
        avatarColor,
        score,
        roundTricks,
        lifetimeTricks,
        isWinner,
        isHuman,
        isBot,
        character: seat?.character,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Helper for suit icon & styling
  const getSuitBadge = (suit) => {
    switch (suit) {
      case 'Hearts':
        return { symbol: '♥', color: 'text-rose-500', name: 'Hearts' };
      case 'Diamonds':
        return { symbol: '♦', color: 'text-rose-500', name: 'Diamonds' };
      case 'Clubs':
        return { symbol: '♣', color: 'text-slate-300', name: 'Clubs' };
      case 'Spades':
        return { symbol: '♠', color: 'text-amber-400', name: 'Spades' };
      default:
        return { symbol: '?', color: 'text-slate-400', name: suit || 'None' };
    }
  };

  // Last 5 completed tricks
  const last5Tricks = [...trickHistory].slice(-5).reverse();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 font-sans tracking-wide">
                  PRO CARD Scoreboard & History
                </h2>
                {matchOver && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                    Match Concluded
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Round {currentRound} • Target: <span className="text-amber-400 font-bold">{gameTarget} Pts</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700 transition-colors cursor-pointer"
            title="Close Scoreboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/50 px-4 sm:px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('standings')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'standings'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Standings ({playerRankings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Round History ({roundHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tricks')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'tricks'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Last 5 Tricks ({last5Tricks.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: STANDINGS & LIVE TABLE */}
          {activeTab === 'standings' && (
            <div className="space-y-4">
              {/* Leaderboard Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {playerRankings.map((p, rankIdx) => {
                  const targetPercent = Math.min(Math.round((Math.max(0, p.score) / gameTarget) * 100), 100);
                  const isFirst = rankIdx === 0;

                  return (
                    <div
                      key={p.seatIndex}
                      className={`relative p-3.5 rounded-2xl border transition-all ${
                        p.isWinner || (matchOver && isFirst)
                          ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/30'
                          : isFirst
                          ? 'bg-slate-800/80 border-amber-500/30 shadow-md'
                          : 'bg-slate-850/60 border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          {/* Rank badge */}
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                              rankIdx === 0
                                ? 'bg-amber-400 text-slate-950 shadow-sm'
                                : rankIdx === 1
                                ? 'bg-slate-300 text-slate-950'
                                : rankIdx === 2
                                ? 'bg-amber-700 text-amber-100'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {rankIdx === 0 ? '1' : rankIdx + 1}
                          </span>

                          {/* Animated Character Avatar */}
                          <AnimatedCharacterAvatar
                            characterId={p.character?.id || ['odi', 'putin', 'trampu', 'ironman'][p.seatIndex]}
                            size="xs"
                            state={p.isWinner ? 'celebrating' : 'idle'}
                            showGlow={p.isWinner}
                          />

                          {/* Player identity */}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-slate-100">{p.name}</span>
                              {p.isWinner && <Crown className="w-3.5 h-3.5 text-amber-400" />}
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
                              Seat {p.seatIndex + 1} ({p.seatName})
                            </span>
                          </div>
                        </div>

                        {/* Current Score */}
                        <div className="text-right font-mono">
                          <span className="text-lg sm:text-xl font-black text-amber-400">{p.score}</span>
                          <span className="text-[10px] text-slate-400 block font-normal">pts</span>
                        </div>
                      </div>

                      {/* Progress Bar towards Target */}
                      <div className="space-y-1 mt-2">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>Target Progress</span>
                          <span className="font-bold text-amber-300">
                            {p.score} / {gameTarget} pts ({targetPercent}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              targetPercent >= 100
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-300'
                                : 'bg-gradient-to-r from-amber-600 to-amber-400'
                            }`}
                            style={{ width: `${Math.max(4, targetPercent)}%` }}
                          />
                        </div>
                      </div>

                      {/* Round Stats Row */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                        <span className="text-slate-400">
                          Round Tricks: <strong className="text-slate-200">{p.roundTricks} / 13</strong>
                        </span>
                        <span className="text-slate-400">
                          Total Tricks: <strong className="text-amber-300">{p.lifetimeTricks}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Current Match Context Info Card */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Pradhan / Trump:</span>
                  {trumpSuit ? (
                    <span className="flex items-center gap-1 font-bold text-slate-200">
                      <span className={`text-base ${getSuitBadge(trumpSuit).color}`}>
                        {getSuitBadge(trumpSuit).symbol}
                      </span>
                      <span>{trumpSuit}</span>
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">None</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Declared Bid:</span>
                  {bidding.winningBid ? (
                    <span className="font-bold text-amber-300">
                      {bidding.winningBid} Tricks (Seat {bidding.winningBidderSeatIndex + 1})
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">In Progress</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Target to Win:</span>
                  <span className="font-bold text-amber-400">{gameTarget} Points</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROUND HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {roundHistory.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                  <History className="w-10 h-10 text-slate-600 mx-auto mb-2 animate-bounce" />
                  <h3 className="text-sm font-bold text-slate-300">No Completed Rounds Yet</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Play through all 13 tricks in the card-playing phase. Once a round concludes, its full score breakdown
                    and declared bids will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {roundHistory.map((r, rIdx) => {
                    const trumpBadge = getSuitBadge(r.trumpSuit);
                    const winnerSeatName =
                      seats[r.winningBidderSeatIndex]?.playerName ||
                      seats[r.winningBidderSeatIndex]?.character?.name ||
                      `Seat ${r.winningBidderSeatIndex + 1}`;

                    return (
                      <div
                        key={rIdx}
                        className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-md"
                      >
                        {/* Round Header */}
                        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs font-mono">
                              Round {r.roundNumber || rIdx + 1}
                            </span>
                            <span className="text-xs text-slate-300 font-mono">
                              Trump:{' '}
                              <strong className={`font-bold ${trumpBadge.color}`}>
                                {trumpBadge.symbol} {r.trumpSuit || 'Spades'}
                              </strong>
                            </span>
                          </div>

                          <div className="text-xs font-mono text-slate-400">
                            {r.winningBid ? (
                              <span>
                                Contract:{' '}
                                <strong className="text-amber-400">{r.winningBid} tricks</strong> by{' '}
                                <strong className="text-slate-200">{winnerSeatName}</strong>
                              </span>
                            ) : (
                              <span className="italic text-slate-500">All Passed (Default Spades)</span>
                            )}
                          </div>
                        </div>

                        {/* Players Round Breakdown Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs font-mono">
                            <thead>
                              <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-[10px] uppercase">
                                <th className="px-4 py-2">Player</th>
                                <th className="px-3 py-2 text-center">Declared Bid</th>
                                <th className="px-3 py-2 text-center">Tricks Won</th>
                                <th className="px-3 py-2 text-center">Result</th>
                                <th className="px-3 py-2 text-right">Round Score</th>
                                <th className="px-4 py-2 text-right">Running Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {seats.map((seat, sIdx) => {
                                const name =
                                  seat?.playerName || seat?.character?.name || `Player ${sIdx + 1}`;
                                const isBidder = r.winningBidderSeatIndex === sIdx;
                                const tricks = r.tricksWon?.[sIdx] || 0;
                                const delta = r.scoreDeltas?.[sIdx] || 0;
                                const running = r.accumulatedScores?.[sIdx] || 0;

                                let statusLabel = 'Defender';
                                let statusColor = 'text-slate-400';

                                if (isBidder) {
                                  if (tricks >= r.winningBid) {
                                    statusLabel = '✓ Made Bid';
                                    statusColor = 'text-emerald-400';
                                  } else {
                                    statusLabel = '✗ Failed Bid';
                                    statusColor = 'text-rose-400';
                                  }
                                }

                                return (
                                  <tr key={sIdx} className="hover:bg-slate-900/30">
                                    <td className="px-4 py-2.5 font-bold text-slate-200">
                                      <div className="flex items-center gap-1.5">
                                        <span>{name}</span>
                                        {isBidder && (
                                          <span className="px-1 rounded bg-amber-500/20 text-amber-300 text-[9px]">
                                            Bidder
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-center text-slate-300">
                                      {isBidder ? r.winningBid : '-'}
                                    </td>
                                    <td className="px-3 py-2.5 text-center font-bold text-slate-100">
                                      {tricks}
                                    </td>
                                    <td className={`px-3 py-2.5 text-center font-bold ${statusColor}`}>
                                      {statusLabel}
                                    </td>
                                    <td
                                      className={`px-3 py-2.5 text-right font-bold ${
                                        delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-400'
                                      }`}
                                    >
                                      {delta > 0 ? `+${delta}` : delta}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-black text-amber-400">
                                      {running} pts
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LAST 5 COMPLETED TRICKS */}
          {activeTab === 'tricks' && (
            <div className="space-y-4">
              {last5Tricks.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                  <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2 animate-bounce" />
                  <h3 className="text-sm font-bold text-slate-300">No Completed Tricks Yet</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Play cards during Stage 8. The last 5 completed tricks with the played cards and winner will be logged
                    here in real time.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {last5Tricks.map((t, idx) => {
                    const winnerSeat = seats[t.winnerSeatIndex];
                    const winnerName =
                      winnerSeat?.playerName || winnerSeat?.character?.name || `Seat ${t.winnerSeatIndex + 1}`;
                    const leadBadge = getSuitBadge(t.leadSuit);
                    const trumpBadge = getSuitBadge(t.trumpSuit);

                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-800 bg-slate-950/90 p-3.5 space-y-2.5 shadow-md"
                      >
                        {/* Trick Top Line */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2 text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">
                              Trick #{trickHistory.length - idx}
                            </span>
                            <span className="text-slate-400">
                              Lead:{' '}
                              <strong className={leadBadge.color}>
                                {leadBadge.symbol} {t.leadSuit}
                              </strong>
                            </span>
                            {t.trumpSuit && (
                              <span className="text-slate-400">
                                Trump:{' '}
                                <strong className={trumpBadge.color}>
                                  {trumpBadge.symbol} {t.trumpSuit}
                                </strong>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                            <span>Won by {winnerName}</span>
                          </div>
                        </div>

                        {/* Cards played in this trick */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(t.cards || []).map((c, sIdx) => {
                            if (!c) return null;
                            const isWinCard = t.winnerSeatIndex === sIdx;
                            const seatObj = seats[sIdx];
                            const sName =
                              seatObj?.playerName || seatObj?.character?.name || `Seat ${sIdx + 1}`;
                            const isRed = c.suit === 'Hearts' || c.suit === 'Diamonds';
                            const symbol = c.suit === 'Hearts' ? '♥' : c.suit === 'Diamonds' ? '♦' : c.suit === 'Clubs' ? '♣' : '♠';

                            return (
                              <div
                                key={sIdx}
                                className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                                  isWinCard
                                    ? 'bg-amber-950/25 border-amber-500/60 ring-1 ring-amber-400/40 shadow-sm'
                                    : 'bg-slate-900 border-slate-800'
                                }`}
                              >
                                <div>
                                  <span className="text-[10px] text-slate-400 font-mono block leading-none">
                                    {sName}
                                  </span>
                                  {isWinCard && (
                                    <span className="text-[9px] text-amber-400 font-bold block uppercase leading-none mt-1">
                                      ★ Winning Card
                                    </span>
                                  )}
                                </div>

                                <div
                                  className={`w-9 h-11 rounded-lg bg-slate-950 border border-slate-700/80 flex flex-col items-center justify-center font-serif font-black shadow-inner ${
                                    isRed ? 'text-rose-500' : 'text-slate-100'
                                  }`}
                                >
                                  <span className="text-xs leading-none">{c.rank}</span>
                                  <span className="text-sm leading-none">{symbol}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-slate-950/90 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Target className="w-4 h-4 text-amber-400" />
            <span>Target to win match: <strong className="text-amber-300">{gameTarget} Points</strong></span>
          </div>

          <div className="flex items-center gap-2">
            {matchOver && (isHost || isOffline) && onPlayAgain && (
              <button
                onClick={() => {
                  onPlayAgain();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all border border-slate-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

