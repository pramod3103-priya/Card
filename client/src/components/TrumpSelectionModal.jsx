import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { PRADHAN_SUITS } from '../config/pradhanConfig';
import { Crown, Sparkles, Trophy, CheckCircle, ShieldCheck } from 'lucide-react';

/**
 * PRO CARD – PRADHAN (TRUMP SUIT) SELECTION SCREEN
 * 
 * Displayed to the winning bidder after auction completes.
 * Heading: "CHOOSE YOUR PRADHAN"
 * Four large selectable suit cards:
 * 1. लाल पान – LAAL PAAN
 * 2. ईंट – EENT
 * 3. चीड़ी – CHIDI
 * 4. हुकुम – HUKUM
 * 
 * - Only the authorized winning bidder can choose.
 * - Selection locks upon confirmation.
 * - Broadcasts simultaneously to all 4 players.
 */
export const TrumpSelectionModal = ({ mySeatIndex }) => {
  const { roomState, chooseTrump, selectPradhan } = useSocket();
  const [selectedSuit, setSelectedSuit] = useState('Hearts'); // Default highlight on LAAL PAAN
  const [submitting, setSubmitting] = useState(false);

  if (!roomState) return null;

  const gameState = roomState.gameState || {};
  const bidding = gameState.bidding || {};

  // Only active when awaiting trump selection
  if (!bidding.awaitingTrumpSelection) return null;

  const winningBidderIndex = bidding.winningBidderSeatIndex;
  const isWinner = winningBidderIndex !== null && winningBidderIndex === mySeatIndex;
  const winningSeat = winningBidderIndex !== null ? roomState.seats[winningBidderIndex] : null;
  const winningBid = bidding.winningBid;

  const handleConfirmPradhan = async (suitToConfirm) => {
    const suitName = suitToConfirm || selectedSuit;
    if (!isWinner || submitting || !suitName) return;
    try {
      setSubmitting(true);
      const action = selectPradhan || chooseTrump;
      await action(suitName);
    } catch (err) {
      console.error('Error selecting Pradhan:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-fade-in">
      <div className="w-full max-w-2xl bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 border-2 border-amber-500/80 rounded-3xl p-5 sm:p-8 shadow-[0_25px_80px_rgba(245,158,11,0.35)] text-center relative overflow-hidden">
        {/* Ornate Gold Background Elements */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center shadow-lg border border-amber-200 mb-2.5">
            <Crown className="w-8 h-8 text-zinc-950 stroke-[2.5]" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-[10px] sm:text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auction Winner: {winningSeat?.playerName || 'Bidder'} (Bid: {winningBid})</span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-serif tracking-wider text-slate-100 mt-2 uppercase">
            CHOOSE YOUR PRADHAN
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1 max-w-md">
            The selected suit will become the official <strong className="text-amber-400">PRADHAN</strong> (Trump). All 13 cards of this suit will dominate trick play!
          </p>
        </div>

        {/* Content depending on whether local player is the auction winner */}
        {isWinner ? (
          <div>
            {/* 4 Large Selectable Suit Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {PRADHAN_SUITS.map((item, index) => {
                const isSelected = selectedSuit === item.suit;
                return (
                  <button
                    key={item.suit}
                    type="button"
                    onClick={() => setSelectedSuit(item.suit)}
                    disabled={submitting}
                    className={`group relative flex flex-col items-center justify-between p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? `${item.selectedBorder} scale-105 shadow-2xl bg-gradient-to-b ${item.bgGradient}`
                        : `border-zinc-800 hover:border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800/80 opacity-80 hover:opacity-100 hover:scale-[1.02]`
                    } active:scale-95 disabled:opacity-50 text-left`}
                    style={isSelected ? { boxShadow: item.glowBoxShadow } : {}}
                  >
                    {/* Index & Active Check Badge */}
                    <div className="w-full flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500">
                        #{index + 1}
                      </span>
                      {isSelected ? (
                        <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <span className="text-[9px] font-mono text-slate-600">13 Cards</span>
                      )}
                    </div>

                    {/* Hindi and Latin Labels */}
                    <div className="my-1 text-center w-full">
                      <div className="text-xs sm:text-sm font-black font-serif text-slate-100">
                        {item.hindiName}
                      </div>
                      <div className="text-[10px] font-mono font-bold tracking-wider text-amber-400 uppercase">
                        {item.latinName}
                      </div>
                    </div>

                    {/* Large Animated Suit Card Symbol */}
                    <div className="my-2 flex items-center justify-center">
                      <span
                        className={`text-5xl sm:text-6xl font-serif font-black ${item.colorClass} group-hover:scale-110 transition-transform`}
                        style={isSelected ? { textShadow: `0 0 15px ${item.glowColor}` } : {}}
                      >
                        {item.symbol}
                      </span>
                    </div>

                    {/* Suit Card Status Tag */}
                    <div
                      className={`w-full text-center py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${
                        isSelected
                          ? 'bg-amber-400 text-zinc-950 font-black'
                          : 'bg-zinc-800/80 text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      {isSelected ? 'SELECTED' : 'SELECT'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Summary and Confirm Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800">
              <div className="flex items-center gap-2.5 text-left">
                <Crown className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs text-slate-400 font-mono">Selected Pradhan:</div>
                  <div className="text-sm font-black font-serif text-amber-400">
                    {PRADHAN_SUITS.find((s) => s.suit === selectedSuit)?.label || selectedSuit}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleConfirmPradhan(selectedSuit)}
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 active:scale-95 text-zinc-950 font-black font-mono uppercase tracking-wider text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    <span>Locking Pradhan...</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    <span>CONFIRM PRADHAN</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full border-3 border-amber-400 border-t-transparent animate-spin mb-4" />
            <h4 className="text-lg font-bold text-slate-100 font-serif">
              Waiting for {winningSeat?.playerName || 'Auction Winner'}...
            </h4>
            <p className="text-xs text-slate-400 font-mono mt-1.5 max-w-sm">
              The winning bidder is selecting the official <strong className="text-amber-400">PRADHAN</strong> suit. The announcement and trump rules will immediately apply to all four players once confirmed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
