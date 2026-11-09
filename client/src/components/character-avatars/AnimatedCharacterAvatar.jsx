import React from 'react';
import './characterAnimations.css';
import { OdiAvatar } from './OdiAvatar';
import { PutinAvatar } from './PutinAvatar';
import { TrampuAvatar } from './TrampuAvatar';
import { IronManAvatar } from './IronManAvatar';
import { useSoundSettings } from '../../context/SoundSettingsContext';

const SIZE_MAP = {
  xs: { container: 'w-8 h-8', svg: 28 },
  sm: { container: 'w-11 h-11', svg: 38 },
  md: { container: 'w-14 h-14', svg: 48 },
  lg: { container: 'w-18 h-18 sm:w-20 sm:h-20', svg: 64 },
  xl: { container: 'w-24 h-24 sm:w-28 sm:h-28', svg: 96 },
  '2xl': { container: 'w-32 h-32 sm:w-36 sm:h-36', svg: 120 },
};

const CHARACTER_THEMES = {
  odi: {
    bgGradient: 'from-amber-950 via-slate-900 to-orange-950',
    borderColor: 'border-orange-500/60',
    ringColor: 'ring-orange-400',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    accent: '#f97316',
    name: 'ODI',
  },
  putin: {
    bgGradient: 'from-slate-950 via-slate-900 to-sky-950',
    borderColor: 'border-sky-500/60',
    ringColor: 'ring-sky-400',
    glowColor: 'rgba(2, 132, 199, 0.4)',
    accent: '#0284c7',
    name: 'Put-in',
  },
  trampu: {
    bgGradient: 'from-slate-950 via-slate-900 to-yellow-950',
    borderColor: 'border-yellow-500/60',
    ringColor: 'ring-yellow-400',
    glowColor: 'rgba(234, 179, 8, 0.4)',
    accent: '#eab308',
    name: 'Trampu',
  },
  ironman: {
    bgGradient: 'from-rose-950 via-slate-900 to-amber-950',
    borderColor: 'border-rose-500/60',
    ringColor: 'ring-rose-400',
    glowColor: 'rgba(220, 38, 38, 0.4)',
    accent: '#dc2626',
    name: 'Iron Man',
  },
};

/**
 * High-Quality 3D Animated Character Avatar
 *
 * Props:
 * - characterId: 'odi' | 'putin' | 'trampu' | 'ironman'
 * - state: 'idle' | 'thinking' | 'speaking' | 'celebrating' | 'disappointed'
 * - size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 * - isHuman: boolean
 * - isBot: boolean
 * - showGlow: boolean
 * - className: string
 * - badge: React.ReactNode (e.g. Dealer Puck, Trump Maker)
 */
export const AnimatedCharacterAvatar = ({
  characterId = 'odi',
  state = 'idle',
  size = 'md',
  isHuman = false,
  isBot = false,
  showGlow = true,
  className = '',
  badge = null,
}) => {
  const { reducedMotion } = useSoundSettings() || {};
  const charKey = (characterId || 'odi').toLowerCase().replace(/[^a-z]/g, '');

  // Normalize character key
  let resolvedKey = 'odi';
  if (charKey.includes('putin') || charKey.includes('pi')) resolvedKey = 'putin';
  else if (charKey.includes('tramp') || charKey.includes('tr')) resolvedKey = 'trampu';
  else if (charKey.includes('iron') || charKey.includes('im')) resolvedKey = 'ironman';
  else if (charKey.includes('odi') || charKey.includes('od')) resolvedKey = 'odi';

  const theme = CHARACTER_THEMES[resolvedKey] || CHARACTER_THEMES.odi;
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;

  const isThinking = state === 'thinking';
  const isSpeaking = state === 'speaking';
  const isCelebrating = state === 'celebrating';
  const isDisappointed = state === 'disappointed';

  const renderSvgAvatar = (svgSize) => {
    switch (resolvedKey) {
      case 'putin':
        return <PutinAvatar state={state} size={svgSize} />;
      case 'trampu':
        return <TrampuAvatar state={state} size={svgSize} />;
      case 'ironman':
        return <IronManAvatar state={state} size={svgSize} />;
      case 'odi':
      default:
        return <OdiAvatar state={state} size={svgSize} />;
    }
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${
        reducedMotion ? 'reduced-motion' : ''
      } ${className}`}
    >
      {/* Outer Glow Halo for active states */}
      {showGlow && (
        <div
          className={`absolute inset-0 rounded-2xl pointer-events-none transition-all duration-300 ${
            isCelebrating
              ? 'ring-4 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.8)] scale-110'
              : isSpeaking
              ? 'ring-4 ring-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.85)] scale-105'
              : isThinking
              ? 'ring-4 ring-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.7)] animate-pulse'
              : ''
          }`}
        />
      )}

      {/* Main Avatar Circular Frame */}
      <div
        className={`relative ${sizeConfig.container} rounded-2xl bg-gradient-to-b ${theme.bgGradient} border-2 ${
          isSpeaking
            ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]'
            : isThinking
            ? 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.6)]'
            : isCelebrating
            ? 'border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.7)]'
            : isDisappointed
            ? 'border-slate-700 opacity-80'
            : theme.borderColor
        } flex items-center justify-center overflow-hidden shadow-xl transition-all duration-300`}
        style={{
          boxShadow: showGlow && !isDisappointed ? `0 6px 18px ${theme.glowColor}` : undefined,
        }}
      >
        {/* Subtle radial inner highlight */}
        <div className="absolute inset-0 bg-radial from-white/10 via-transparent to-black/40 pointer-events-none" />

        {/* Character SVG Bust */}
        <div className="relative z-10 flex items-center justify-center transform translate-y-1">
          {renderSvgAvatar(sizeConfig.svg)}
        </div>

        {/* Speaking Voice Wave Pulse Overlay */}
        {isSpeaking && (
          <div className="absolute inset-0 rounded-2xl border-2 border-emerald-400/80 animate-ping pointer-events-none" />
        )}
      </div>

      {/* Optional Top / Corner Badge (e.g. Dealer puck, Trump Maker, etc.) */}
      {badge && <div className="absolute -top-1.5 -left-1.5 z-30">{badge}</div>}

      {/* State Indicator Badges (Thinking / Speaking / Celebrating / Disappointed) */}
      {isThinking && (
        <div
          title="Thinking..."
          className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-slate-950 border border-amber-400 flex items-center justify-center text-[10px] text-amber-300 shadow-md z-30 animate-pulse"
        >
          💭
        </div>
      )}

      {isSpeaking && (
        <div
          title="Speaking live..."
          className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-950 border border-emerald-400 flex items-center justify-center text-[10px] text-emerald-300 shadow-md z-30 animate-bounce"
        >
          🎙️
        </div>
      )}

      {isCelebrating && (
        <div
          title="Round/Trick Winner!"
          className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-950 border border-amber-400 flex items-center justify-center text-[10px] text-amber-300 shadow-md z-30"
        >
          👑
        </div>
      )}

      {isDisappointed && (
        <div
          title="Lost trick / missed bid"
          className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400 shadow-md z-30"
        >
          💧
        </div>
      )}
    </div>
  );
};

