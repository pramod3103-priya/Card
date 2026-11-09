import React from 'react';
import { AnimatedCharacterAvatar } from './character-avatars';
import { Gavel, ArrowUpRight, X, Sparkles, TrendingUp, ChevronRight, Check, Zap, AlertCircle } from 'lucide-react';

/**
 * PRO CARD 10-Second Bidding Countdown & Control Widget
 *
 * Implements:
 * 1. 10-second countdown (10 -> 9 -> ... -> 0)
 * 2. Large countdown number & circular progress ring + horizontal bar
 * 3. Active player's animated character (ODI, Put-in, Trampu, Iron Man)
 * 4. Clear bidding status & stage info (5, 8, 10 min opening bids)
 * 5. Flexible independent increase controls (10 -> 11, 12, 13, 15, etc.)
 * 6. Responsive for desktop and mobile
 */
export const BiddingCountdownWidget = ({
  secondsRemaining = 10,
  maxSeconds = 10,
  characterId = 'odi',
  characterName = 'Player',
  isMyTurn = false,
  stageLabel = 'Bidding Stage',
  minOpening = 5,
  minNextBid = 5,
  maxBid = 13,
  highestBid = null,
  highestBidderName = null,
  selectedAmount = 5,
  onAmountChange = () => {},
  onConfirmBid = () => {},
  onPass = () => {},
  isFlexibleIncrease = false,
  submitting = false,
  isComplete = false,
  onAdvance = null,
  isHost = false,
  timeUpPassed = false,
}) => {
  const safeSeconds = Math.max(0, Math.min(maxSeconds, Number(secondsRemaining) || 0));
  const isUrgent = safeSeconds <= 3 && safeSeconds > 0;
  const isTimeZero = safeSeconds === 0;

  // Circular progress calculation (r = 28, perimeter = 2 * PI * 28 ~ 175.93)
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = safeSeconds / maxSeconds;
  const strokeDashoffset = circumference * (1 - progressRatio);

  // If stage bidding is complete
  if (isComplete) {
    return (
      <div className="w-full max-w-3xl mx-auto my-2 p-3.5 sm:p-4 rounded-3xl bg-slate-950/95 border-2 border-amber-500/60 backdrop-blur-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300 font-bold shadow-md">
            <Check className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-mono font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>{stageLabel} Complete</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xs text-slate-300 font-mono mt-0.5">
              {highestBid !== null ? (
                <span>
                  Current Leader: <strong className="text-amber-400">{highestBidderName || 'Player'}</strong> with bid of <strong className="text-amber-300">{highestBid}</strong>
                </span>
              ) : (
                <span className="text-slate-400">All 4 players passed this round.</span>
              )}
            </div>
          </div>
        </div>

        {isHost && onAdvance && (
          <button
            onClick={onAdvance}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-[0_4px_18px_rgba(245,158,11,0.4)] active:scale-95 cursor-pointer"
          >
            <span>Proceed to Next Stage</span>
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto my-2 rounded-3xl bg-slate-950/95 border-2 border-amber-500/60 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] relative z-30 select-none overflow-hidden transition-all duration-300">
      {/* Top Countdown Bar Progress */}
      <div className="w-full h-1.5 bg-slate-900 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            isUrgent
              ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
              : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
          }`}
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>

      <div className="p-3.5 sm:p-5 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Left Section: Active Player Avatar + Info */}
        <div className="flex items-center gap-3.5 w-full lg:w-auto">
          {/* Animated Avatar of Active Player */}
          <AnimatedCharacterAvatar
            characterId={characterId}
            state={isUrgent ? 'thinking' : 'thinking'}
            size="md"
            showGlow={isMyTurn}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                {stageLabel}
              </span>

              {isMyTurn ? (
                <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 uppercase tracking-wider shadow-sm animate-bounce">
                  YOUR TURN TO BID
                </span>
              ) : (
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                  {characterName}'s Turn
                </span>
              )}

              {isFlexibleIncrease && (
                <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300">
                  All Bid 10 (Independent)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-300 mt-1 flex-wrap">
              <span>
                Highest:{' '}
                {highestBid !== null ? (
                  <strong className="text-amber-400 font-bold">
                    {highestBid} ({highestBidderName || 'Player'})
                  </strong>
                ) : (
                  <span className="text-slate-500">None (Opens at {minOpening}+)</span>
                )}
              </span>
              <span className="text-slate-600">•</span>
              <span>
                Min Next: <strong className="text-amber-300 font-bold">{minNextBid}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Center Section: Large 10-Second Countdown & Circular Indicator */}
        <div className="flex items-center gap-3 shrink-0 py-1">
          {/* Circular Progress Gauge */}
          <div className="relative w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 64 64">
              {/* Background ring */}
              <circle
                cx="32"
                cy="32"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="4.5"
                fill="none"
              />
              {/* Dynamic countdown ring */}
              <circle
                cx="32"
                cy="32"
                r={radius}
                className={`transition-all duration-1000 ease-linear ${
                  isUrgent ? 'stroke-rose-500' : 'stroke-amber-400'
                }`}
                strokeWidth="4.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                style={{
                  filter: isUrgent
                    ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.8))'
                    : 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))',
                }}
              />
            </svg>

            {/* Large Countdown Digit (10 -> 9 -> ... -> 0) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-2xl sm:text-3xl font-black font-mono leading-none ${
                  isUrgent
                    ? 'text-rose-400 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]'
                    : isTimeZero
                    ? 'text-slate-600'
                    : 'text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                }`}
              >
                {safeSeconds}
              </span>
              <span className="text-[8px] font-mono uppercase tracking-widest text-slate-400">
                SEC
              </span>
            </div>
          </div>

          <div className="text-left hidden sm:block">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              Time Left
            </div>
            <div className="text-xs font-mono font-bold text-slate-200">
              {safeSeconds > 3 ? (
                <span className="text-amber-400">10s Clock</span>
              ) : safeSeconds > 0 ? (
                <span className="text-rose-400 animate-pulse font-black">Hurry Up!</span>
              ) : (
                <span className="text-slate-500 font-black">Time Up!</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Interactive Controls (Active Bidder Only) */}
        {isMyTurn ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto justify-end">
            {isFlexibleIncrease ? (
              /* Flexible Increase Controls (10 -> 11, 12, 13, 15) */
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  {[11, 12, 13, 15].map((val) => (
                    <button
                      key={val}
                      type="button"
                      disabled={submitting || isTimeZero}
                      onClick={() => onAmountChange(val)}
                      className={`px-2.5 py-1.5 rounded-xl font-mono text-xs font-black transition-all border cursor-pointer ${
                        selectedAmount === val
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md ring-1 ring-amber-300'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-400/50'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>

                {/* Confirm Flexible Increase */}
                <button
                  type="button"
                  onClick={onConfirmBid}
                  disabled={submitting || isTimeZero}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 text-xs font-mono font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-40"
                >
                  <TrendingUp className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Increase ({selectedAmount})</span>
                </button>

                {/* Pass (Keep 10) */}
                <button
                  type="button"
                  onClick={onPass}
                  disabled={submitting || isTimeZero}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-rose-500/60 text-slate-300 hover:text-rose-300 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-40"
                >
                  Pass (10)
                </button>
              </div>
            ) : (
              /* Standard Progressive Bidding Controls */
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {/* Amount Selector */}
                <div className="flex items-center bg-slate-900 border border-amber-500/50 rounded-xl p-1 shadow-inner">
                  <span className="text-[10px] font-mono text-slate-400 px-2 uppercase font-bold">
                    Bid:
                  </span>
                  <select
                    value={selectedAmount}
                    onChange={(e) => onAmountChange(Number(e.target.value))}
                    disabled={submitting || isTimeZero}
                    className="bg-slate-950 text-amber-300 font-mono font-black text-sm px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 cursor-pointer disabled:opacity-50"
                  >
                    {Array.from({ length: Math.max(1, maxBid - minNextBid + 1) }, (_, i) => minNextBid + i).map((val) => (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick +1 Button */}
                {minNextBid + 1 <= maxBid && (
                  <button
                    type="button"
                    disabled={submitting || isTimeZero}
                    onClick={() => onAmountChange(Math.min(maxBid, selectedAmount + 1))}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-black text-amber-300 transition-colors disabled:opacity-40 cursor-pointer"
                    title="Add 1 to bid"
                  >
                    +1
                  </button>
                )}

                {/* Submit Bid Button */}
                <button
                  type="button"
                  onClick={onConfirmBid}
                  disabled={submitting || isTimeZero}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 text-xs font-mono font-black uppercase tracking-wider transition-all shadow-[0_4px_18px_rgba(245,158,11,0.4)] active:scale-95 cursor-pointer disabled:opacity-40"
                >
                  <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                  <span>Bid {selectedAmount}</span>
                </button>

                {/* Pass Button */}
                <button
                  type="button"
                  onClick={onPass}
                  disabled={submitting || isTimeZero}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-600/70 text-slate-300 hover:text-rose-300 text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-40"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Pass</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Waiting for other player notice */
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-2xl">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span>Clockwise bidding turn in progress...</span>
          </div>
        )}
      </div>

      {/* Time Up Notification Banner (When 0 reached) */}
      {timeUpPassed && (
        <div className="bg-rose-950/90 border-t border-rose-500/50 px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-mono font-bold text-rose-300 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>Time Up – Automatically Passed</span>
        </div>
      )}
    </div>
  );
};

