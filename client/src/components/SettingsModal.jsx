import React from 'react';
import {
  Settings,
  Volume2,
  VolumeX,
  Volume1,
  Music,
  Play,
  RotateCcw,
  X,
  Sliders,
  Sparkles,
  Zap,
  Eye,
  Shield,
  Layers,
} from 'lucide-react';
import { useSoundSettings } from '../context/SoundSettingsContext';

export const SettingsModal = ({ isOpen, onClose }) => {
  const {
    settings,
    updateSetting,
    toggleMute,
    resetToDefaults,
    playTestTone,
  } = useSoundSettings();

  if (!isOpen) return null;

  const volumePercent = Math.round(settings.masterVolume * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 font-sans tracking-wide">
                PRO CARD Settings
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Audio & Game Preferences
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700 transition-colors cursor-pointer"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Section 1: Audio Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Audio & Sound System</span>
              </span>

              {/* Master Mute Status Pill */}
              <button
                onClick={toggleMute}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold border transition-all cursor-pointer ${
                  settings.isMuted
                    ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                }`}
              >
                {settings.isMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Unmuted</span>
                  </>
                )}
              </button>
            </div>

            {/* Master Volume Slider */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <span>Master Volume</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => playTestTone(settings.masterVolume)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] border border-slate-700 font-bold transition-all cursor-pointer"
                    title="Play Test Tone"
                  >
                    Test Tone
                  </button>
                  <span className="text-amber-400 font-bold">{volumePercent}%</span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={volumePercent}
                onChange={(e) => {
                  const val = Number(e.target.value) / 100;
                  updateSetting('masterVolume', val);
                  if (settings.isMuted && val > 0) {
                    updateSetting('isMuted', false);
                  }
                }}
                className="w-full h-2 rounded-lg bg-slate-800 appearance-none cursor-pointer accent-amber-400 focus:outline-none"
              />
            </div>

            {/* Sound Effects (SFX) Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm text-slate-200">
                    Sound Effects (SFX)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Card dealing, play snaps, bid chimes, trump & trick victories
                </p>
              </div>

              <button
                onClick={() => updateSetting('sfxEnabled', !settings.sfxEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  settings.sfxEnabled && !settings.isMuted
                    ? 'bg-amber-500'
                    : 'bg-slate-800 border border-slate-700'
                }`}
                title="Toggle Sound Effects"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow-md transition-transform ${
                    settings.sfxEnabled && !settings.isMuted
                      ? 'translate-x-6 bg-slate-950'
                      : 'translate-x-1 bg-slate-400'
                  }`}
                />
              </button>
            </div>

            {/* Background Music (BGM) Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div>
                <div className="flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold text-xs sm:text-sm text-slate-200">
                    Background Music (BGM)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Subtle ambient chess lounge chords (100% royalty-free)
                </p>
              </div>

              <button
                onClick={() => updateSetting('bgmEnabled', !settings.bgmEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  settings.bgmEnabled && !settings.isMuted
                    ? 'bg-amber-500'
                    : 'bg-slate-800 border border-slate-700'
                }`}
                title="Toggle Background Music"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow-md transition-transform ${
                    settings.bgmEnabled && !settings.isMuted
                      ? 'translate-x-6 bg-slate-950'
                      : 'translate-x-1 bg-slate-400'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 2: Visual & Animation Settings */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>Visual & Motion Settings</span>
            </span>

            {/* Card Animations Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div>
                <span className="font-bold text-xs sm:text-sm text-slate-200">
                  Card Animations
                </span>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Smooth dealing slides, fan lifting, and play transitions
                </p>
              </div>

              <button
                onClick={() => updateSetting('cardAnimation', !settings.cardAnimation)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  settings.cardAnimation
                    ? 'bg-amber-500'
                    : 'bg-slate-800 border border-slate-700'
                }`}
                title="Toggle Card Animations"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow-md transition-transform ${
                    settings.cardAnimation
                      ? 'translate-x-6 bg-slate-950'
                      : 'translate-x-1 bg-slate-400'
                  }`}
                />
              </button>
            </div>

            {/* Reduced Motion Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div>
                <span className="font-bold text-xs sm:text-sm text-slate-200">
                  Reduced Motion
                </span>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Minimizes screen pulsating, bounces, and active turn rings
                </p>
              </div>

              <button
                onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  settings.reducedMotion
                    ? 'bg-amber-500'
                    : 'bg-slate-800 border border-slate-700'
                }`}
                title="Toggle Reduced Motion"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow-md transition-transform ${
                    settings.reducedMotion
                      ? 'translate-x-6 bg-slate-950'
                      : 'translate-x-1 bg-slate-400'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-slate-950/90 border-t border-slate-800">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

