import React, { useEffect, useState } from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { getPradhanSuitConfig } from '../config/pradhanConfig';
import { useSoundSettings } from '../context/SoundSettingsContext';

/**
 * PRO CARD – PRADHAN ANNOUNCEMENT OVERLAY
 * 
 * Displays a premium, cinematic announcement across the game table:
 * "{PLAYER_NAME} HAS SELECTED {SUIT_LABEL} AS PRADHAN!"
 * 
 * - Appears for all 4 players simultaneously.
 * - Shows the selected suit's large card symbol.
 * - Features a smooth glowing radial aura and animated sparkles.
 * - Plays trumpet fanfare sound if audio is enabled.
 * - Displays for 3.5 seconds before smoothly fading out.
 */
export const PradhanAnnouncementOverlay = ({
  announcement, // { selectorName, suit, suitLabel, suitSymbol }
  onDismiss,
  durationMs = 3800,
}) => {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const { playTrump, settings } = useSoundSettings();

  useEffect(() => {
    if (!announcement) return;

    setVisible(true);
    setProgress(100);

    // Play announcement sound
    try {
      playTrump?.();
    } catch (e) {
      // Audio autoplay policy catch
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remainingPct);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        setVisible(false);
        setTimeout(() => {
          onDismiss?.();
        }, 300);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [announcement, durationMs, onDismiss, playTrump]);

  if (!announcement || !visible) return null;

  const suitConfig = getPradhanSuitConfig(announcement.suit);
  const playerName = announcement.selectorName || 'Winning Player';
  const suitLabel = announcement.suitLabel || suitConfig.label;
  const suitSymbol = announcement.suitSymbol || suitConfig.symbol;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-fade-in pointer-events-none">
      {/* Central Announcement Card */}
      <div
        className={`relative w-full max-w-lg rounded-3xl bg-gradient-to-b ${suitConfig.bgGradient} border-2 ${suitConfig.borderClass} p-6 sm:p-8 text-center shadow-[0_20px_70px_rgba(0,0,0,0.9)] overflow-hidden transform scale-100 transition-all duration-300`}
        style={{
          boxShadow: `0 0 50px ${suitConfig.glowColor}, 0 25px 60px rgba(0,0,0,0.85)`,
        }}
      >
        {/* Glowing Background Radial Halo */}
        <div
          className="absolute -top-24 -left-24 w-56 h-56 rounded-full blur-3xl opacity-60 pointer-events-none"
          style={{ backgroundColor: suitConfig.accentColor || '#f59e0b' }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-56 h-56 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ backgroundColor: suitConfig.accentColor || '#f59e0b' }}
        />

        {/* Top Decorative Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/90 border border-amber-400/50 text-[11px] font-mono font-bold tracking-widest text-amber-400 uppercase shadow-md mb-4">
          <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>PRADHAN DECLARED</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </div>

        {/* Large Animated Suit Symbol with Pulsing Halo */}
        <div className="relative my-2 sm:my-3 flex items-center justify-center">
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-950/80 border border-slate-700/80 flex items-center justify-center shadow-inner relative"
            style={{
              boxShadow: `0 0 35px ${suitConfig.glowColor}`,
            }}
          >
            <span
              className={`text-6xl sm:text-7xl font-serif font-black select-none ${suitConfig.colorClass} drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]`}
              style={{
                textShadow: `0 0 25px ${suitConfig.glowColor}`,
              }}
            >
              {suitSymbol}
            </span>

            {/* Corner Decorative Dots */}
            <span className="absolute top-1.5 left-2 text-[9px] font-mono text-amber-400/80">👑</span>
            <span className="absolute bottom-1.5 right-2 text-[9px] font-mono text-amber-400/80">👑</span>
          </div>
        </div>

        {/* Main Banner Announcement Text */}
        <div className="space-y-2 mt-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black font-serif tracking-wide text-slate-100 uppercase">
            <span className="text-amber-400 drop-shadow">{playerName}</span> HAS SELECTED
          </h2>
          <div
            className={`text-2xl sm:text-3xl md:text-4xl font-black font-serif tracking-wider ${suitConfig.colorClass}`}
            style={{ textShadow: `0 0 20px ${suitConfig.glowColor}` }}
          >
            {suitLabel}
          </div>
          <h3 className="text-lg sm:text-xl font-bold tracking-widest text-amber-300 font-mono">
            AS PRADHAN!
          </h3>
        </div>

        {/* Subtitle / Rules Reminder */}
        <div className="mt-4 px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] sm:text-xs text-slate-300 font-mono">
          All <strong className="text-amber-400 font-bold">13 cards</strong> of this suit now hold supreme Trump power!
        </div>

        {/* Bottom Horizontal Progress Bar */}
        <div className="mt-5 w-full bg-slate-900/90 rounded-full h-1.5 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 transition-all duration-75 ease-linear rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

