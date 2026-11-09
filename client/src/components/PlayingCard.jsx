import React from 'react';
import { useSoundSettings } from '../context/SoundSettingsContext';

// Suit constants and helper styles
export const SUITS = {
  SPADES: { symbol: '♠', name: 'Spades', color: 'text-slate-900', isRed: false },
  HEARTS: { symbol: '♥', name: 'Hearts', color: 'text-rose-600', isRed: true },
  DIAMONDS: { symbol: '♦', name: 'Diamonds', color: 'text-rose-600', isRed: true },
  CLUBS: { symbol: '♣', name: 'Clubs', color: 'text-slate-900', isRed: false },
};

export const PlayingCard = ({
  rank = 'A',
  suit = 'SPADES',
  isFaceUp = true,
  isInteractive = true,
  isSelected = false,
  isPradhan = false,
  rotation = 0,
  translateY = 0,
  onClick,
  className = '',
  size = 'md', // 'sm' | 'md' | 'lg'
}) => {
  let cardAnimation = true;
  let reducedMotion = false;
  try {
    const soundCtx = useSoundSettings();
    if (soundCtx?.settings) {
      cardAnimation = soundCtx.settings.cardAnimation;
      reducedMotion = soundCtx.settings.reducedMotion;
    }
  } catch (err) {
    // Graceful fallback if rendered outside provider
  }

  // Normalize suit
  let suitData = SUITS.SPADES;
  const upperSuit = String(suit).toUpperCase();
  if (upperSuit.startsWith('H')) suitData = SUITS.HEARTS;
  else if (upperSuit.startsWith('D')) suitData = SUITS.DIAMONDS;
  else if (upperSuit.startsWith('C')) suitData = SUITS.CLUBS;

  // Size dimensions
  const sizeClasses = {
    sm: 'w-10 h-14 sm:w-12 sm:h-17 text-[10px]',
    md: 'w-14 h-20 sm:w-18 sm:h-26 md:w-20 md:h-28 text-xs',
    lg: 'w-20 h-28 sm:w-24 sm:h-34 text-sm',
  }[size] || 'w-16 h-24 text-xs';

  // Animation classes
  const transitionClass = (!cardAnimation || reducedMotion)
    ? 'transition-none'
    : 'transition-all duration-300 ease-out';

  if (!isFaceUp) {
    return (
      <div
        onClick={onClick}
        style={{
          transform: `translateY(${translateY}px) rotate(${rotation}deg)`,
          transformOrigin: 'bottom center',
        }}
        className={`relative ${sizeClasses} rounded-xl card-back-ornate shrink-0 select-none cursor-pointer ${transitionClass} ${
          isInteractive ? 'hover:-translate-y-4 hover:scale-105 hover:shadow-2xl hover:z-30' : ''
        } ${isSelected ? '-translate-y-5 shadow-2xl ring-2 ring-amber-400 z-30' : ''} ${className}`}
      >
        {/* Subtle Card Back Ornaments */}
        <div className="absolute inset-1.5 rounded-lg border border-amber-400/40 flex flex-col items-center justify-between p-1">
          <div className="w-full flex justify-between text-[7px] text-amber-300/70 font-mono">
            <span>♠</span>
            <span>♦</span>
          </div>

          <div className="w-6 h-8 sm:w-8 sm:h-10 rounded-md bg-slate-900 border border-amber-400/60 flex items-center justify-center shadow-inner">
            <span className="font-serif font-black text-amber-300 text-xs sm:text-sm tracking-widest drop-shadow">
              ♚
            </span>
          </div>

          <div className="w-full flex justify-between text-[7px] text-amber-300/70 font-mono">
            <span>♣</span>
            <span>♥</span>
          </div>
        </div>
      </div>
    );
  }

  // Face-Up Realistic Playing Card
  const isRed = suitData.isRed;
  const textColor = isRed ? 'text-red-600' : 'text-slate-900';
  const isCourt = ['K', 'Q', 'J'].includes(rank);
  const isAce = rank === 'A';

  return (
    <div
      onClick={onClick}
      style={{
        transform: `translateY(${translateY}px) rotate(${rotation}deg)`,
        transformOrigin: 'bottom center',
      }}
      className={`relative ${sizeClasses} rounded-xl card-face bg-gradient-to-br from-[#ffffff] via-[#fcfaf5] to-[#f5eedf] shrink-0 select-none cursor-pointer ${transitionClass} border border-slate-300/80 p-1.5 sm:p-2 flex flex-col justify-between ${
        isPradhan ? 'ring-2 ring-amber-400/90 shadow-[0_0_12px_rgba(245,158,11,0.4)]' : ''
      } ${
        isInteractive ? 'hover:-translate-y-5 hover:scale-105 hover:shadow-2xl hover:z-30' : ''
      } ${
        isSelected
          ? '-translate-y-8 sm:-translate-y-10 scale-105 sm:scale-110 shadow-[0_20px_45px_rgba(245,158,11,0.6)] ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 z-40 brightness-105'
          : ''
      } ${className}`}
    >
      {/* Selected Indicator Chip */}
      {isSelected && (
        <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[8px] font-black uppercase tracking-wider shadow-md pointer-events-none ${reducedMotion ? '' : 'animate-bounce'}`}>
          PLAY
        </div>
      )}
      {/* Pradhan Crown Badge */}
      {isPradhan && (
        <div
          className="absolute top-1 right-1 px-1 py-0.5 rounded bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[7px] sm:text-[8px] font-black uppercase tracking-tighter shadow-sm flex items-center gap-0.5 pointer-events-none z-10"
          title="PRADHAN TRUMP CARD"
        >
          <span className="leading-none">👑</span>
          <span className="hidden sm:inline leading-none font-mono">PRADHAN</span>
        </div>
      )}
      {/* Top Left Corner Pip */}
      <div className={`flex flex-col items-center leading-none ${textColor} font-bold font-mono text-left`}>
        <span className="text-xs sm:text-sm font-extrabold tracking-tighter">{rank}</span>
        <span className="text-[10px] sm:text-xs -mt-0.5">{suitData.symbol}</span>
      </div>

      {/* Center Artwork or Pips */}
      <div className="flex-1 flex items-center justify-center my-0.5">
        {isAce ? (
          <div className="flex flex-col items-center">
            <span className={`text-2xl sm:text-3xl md:text-4xl ${textColor} drop-shadow-sm`}>
              {suitData.symbol}
            </span>
          </div>
        ) : isCourt ? (
          <div className="w-full h-full max-h-14 sm:max-h-18 rounded-md bg-amber-500/10 border border-amber-400/30 flex flex-col items-center justify-center p-1">
            <span className={`text-sm sm:text-lg font-serif font-black ${textColor}`}>
              {rank === 'K' ? '♔' : rank === 'Q' ? '♕' : '♘'}
            </span>
            <span className="text-[8px] font-serif font-bold text-amber-800 uppercase tracking-widest mt-0.5">
              {rank === 'K' ? 'KING' : rank === 'Q' ? 'QUEEN' : 'JACK'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1">
            <span className={`text-base sm:text-xl ${textColor}`}>{suitData.symbol}</span>
          </div>
        )}
      </div>

      {/* Bottom Right Corner Pip (Rotated 180 degrees) */}
      <div
        className={`flex flex-col items-center leading-none ${textColor} font-bold font-mono rotate-180 self-end`}
      >
        <span className="text-xs sm:text-sm font-extrabold tracking-tighter">{rank}</span>
        <span className="text-[10px] sm:text-xs -mt-0.5">{suitData.symbol}</span>
      </div>

      {/* Delicate Inner Margin Frame */}
      <div className="absolute inset-1 rounded-lg border border-slate-400/20 pointer-events-none" />
    </div>
  );
};

