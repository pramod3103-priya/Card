import React from 'react';
import { Crown, Sparkles, Shield } from 'lucide-react';
import { getPradhanSuitConfig } from '../config/pradhanConfig';

/**
 * PRO CARD – PINNED PRADHAN INDICATOR
 * 
 * Permanently pinned indicator near the game table.
 * Displays the chosen suit prominently with configurable local labels
 * such as "LAAL PAAN – PRADHAN" or "<PRADHAN: LAAL PAAN>".
 * Visible to all 4 players throughout the match.
 */
export const PradhanPinnedIndicator = ({
  trumpSuit,
  trumpSelectedBy,
  selectorName = null,
  compact = false,
  className = '',
}) => {
  if (!trumpSuit) return null;

  const config = getPradhanSuitConfig(trumpSuit);
  const isDefaultSpades = trumpSelectedBy === 'default_all_passed';
  const displayName = isDefaultSpades
    ? 'Default Protocol'
    : selectorName || (trumpSelectedBy !== null ? `Seat ${trumpSelectedBy + 1}` : 'Bid Winner');

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/90 border ${config.borderClass} shadow-md backdrop-blur-sm select-none animate-fade-in ${className}`}
        style={{ boxShadow: `0 0 12px ${config.glowColor}` }}
        title={`PRADHAN: ${config.label} (Selected by ${displayName})`}
      >
        <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className={`text-base font-serif font-black ${config.colorClass} leading-none`}>
          {config.symbol}
        </span>
        <span className="text-[10px] font-mono font-black text-amber-300 uppercase tracking-wider">
          {config.latinName}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-slate-950/95 via-slate-900/95 to-slate-950/95 border-2 ${config.borderClass} shadow-xl backdrop-blur-md select-none transition-all duration-300 hover:scale-105 animate-fade-in ${className}`}
      style={{
        boxShadow: `0 0 20px ${config.glowColor}, inset 0 0 10px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Crown & Glowing Suit Pip */}
      <div className="flex items-center gap-1 shrink-0">
        <div className="w-7 h-7 rounded-xl bg-slate-950 border border-slate-700/80 flex items-center justify-center shadow-inner">
          <span
            className={`text-xl font-serif font-black ${config.colorClass}`}
            style={{ textShadow: `0 0 10px ${config.glowColor}` }}
          >
            {config.symbol}
          </span>
        </div>
      </div>

      {/* Label and Details */}
      <div className="flex flex-col text-left leading-tight">
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono font-black text-amber-400 uppercase tracking-widest flex items-center gap-0.5">
            <Crown className="w-2.5 h-2.5 text-amber-400" />
            PRADHAN
          </span>
          {isDefaultSpades && (
            <span className="text-[8px] font-mono text-slate-500 uppercase">(Default)</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs sm:text-sm font-black font-serif tracking-wide ${config.colorClass}`}>
            {config.latinName}
          </span>
          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
            ({config.hindiName})
          </span>
        </div>
      </div>

      {/* 13 Cards Tag */}
      <div className="hidden md:flex flex-col items-end border-l border-slate-800 pl-2 text-[9px] font-mono text-slate-400">
        <span className="text-amber-400/90 font-bold">13 Cards</span>
        <span className="text-[8px] text-slate-400 truncate max-w-[110px]" title={displayName}>
          by {displayName}
        </span>
      </div>

      {/* Hover Tooltip */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover:flex flex-col items-center px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl text-[10px] font-mono text-slate-300 pointer-events-none whitespace-nowrap z-50 animate-fade-in">
        <span className="font-bold text-amber-400">Official Trump: {config.label}</span>
        <span className="text-slate-400 text-[9px]">Selected by {displayName} • 13 Trump Cards</span>
      </div>
    </div>
  );
};

