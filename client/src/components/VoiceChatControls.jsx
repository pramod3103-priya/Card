import React, { useState } from 'react';
import { useVoiceChat } from '../context/VoiceChatContext';
import { useSocket } from '../context/SocketContext';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  AlertCircle,
  X,
  Users,
  Sparkles,
} from 'lucide-react';

export const VoiceChatControls = ({ compact = false }) => {
  const {
    isMicOn,
    isMuted,
    isSpeaking,
    audioLevel,
    permissionError,
    clearPermissionError,
    toggleMic,
    toggleMute,
    enableMic,
    disableMic,
    activePeersCount,
  } = useVoiceChat();

  const { roomCode } = useSocket();
  const [showHelpModal, setShowHelpModal] = useState(false);

  // If not in a multiplayer room, don't show controls
  if (!roomCode) return null;

  return (
    <>
      {/* Voice Controls Bar */}
      <div
        className={`flex items-center gap-2 transition-all ${
          compact
            ? 'p-1'
            : 'bg-slate-950/90 border border-slate-800/80 rounded-2xl p-1.5 sm:p-2 backdrop-blur-xl shadow-2xl'
        }`}
      >
        {/* Voice Room Status & Peer Indicator */}
        <div
          title={`Live Voice: ${activePeersCount} player${activePeersCount === 1 ? '' : 's'} connected`}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono font-medium text-slate-300"
        >
          <Radio
            className={`w-3.5 h-3.5 ${
              isMicOn && !isMuted
                ? 'text-emerald-400 animate-pulse'
                : 'text-slate-500'
            }`}
          />
          <span className="text-slate-400">Voice:</span>
          <span className={activePeersCount > 0 ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
            {activePeersCount} peer{activePeersCount === 1 ? '' : 's'}
          </span>
        </div>

        {/* Dynamic Speaking / Mic Status Indicator Waveform */}
        {isMicOn && !isMuted && (
          <div
            title={isSpeaking ? 'Speaking live' : 'Microphone active'}
            className="flex items-center gap-0.5 px-2 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono"
          >
            <div className="flex items-end gap-0.5 h-3.5 w-5">
              <span
                className={`w-1 rounded-full bg-emerald-400 transition-all duration-75 ${
                  isSpeaking ? 'h-3 animate-pulse' : 'h-1.5'
                }`}
              />
              <span
                className={`w-1 rounded-full bg-emerald-400 transition-all duration-75 ${
                  isSpeaking ? 'h-3.5 animate-pulse' : 'h-1'
                }`}
              />
              <span
                className={`w-1 rounded-full bg-emerald-400 transition-all duration-75 ${
                  isSpeaking ? 'h-2 animate-pulse' : 'h-1.5'
                }`}
              />
            </div>
            <span className="text-[10px] font-bold hidden sm:inline ml-1">
              {isSpeaking ? 'LIVE' : 'MIC ON'}
            </span>
          </div>
        )}

        {/* Primary Toggle: Mic ON / OFF & Mute Controls */}
        {!isMicOn ? (
          /* Mic is OFF (Default State) */
          <button
            onClick={enableMic}
            title="Enable Microphone (WebRTC Live Voice Chat)"
            className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition-all text-xs font-bold shadow-md active:scale-95 cursor-pointer group"
          >
            <div className="relative">
              <Mic className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-slate-500" />
            </div>
            <span className="font-mono">Mic ON</span>
          </button>
        ) : (
          /* Mic is Active: Quick Mute Toggle + Power OFF Button */
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl p-0.5 shadow-inner">
            {/* Mute / Unmute Button */}
            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                isMuted
                  ? 'bg-rose-950/80 border border-rose-800/80 text-rose-300 hover:bg-rose-900/80'
                  : 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/80 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
              }`}
            >
              {isMuted ? (
                <>
                  <MicOff className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-mono">Unmute</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span className="font-mono">Mute</span>
                </>
              )}
            </button>

            {/* Turn Mic Completely Off */}
            <button
              onClick={disableMic}
              title="Turn Microphone Completely OFF"
              className="p-1 sm:px-2 py-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors text-xs font-mono cursor-pointer"
            >
              <VolumeX className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Permission Denied or Missing Microphone Modal */}
      {permissionError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-950 border border-rose-900/80 rounded-3xl p-6 max-w-md w-full shadow-[0_15px_50px_rgba(225,29,72,0.25)] relative text-slate-200">
            {/* Close X */}
            <button
              onClick={clearPermissionError}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Microphone Access Error</h3>
                <p className="text-xs text-rose-400/90 font-mono">WebRTC Voice Chat</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 font-mono">
              {permissionError}
            </p>

            <div className="text-[11px] text-slate-400 space-y-1.5 mb-5 font-sans">
              <p className="font-bold text-slate-300">How to fix:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Click the lock or site settings icon in your browser URL bar.</li>
                <li>Set "Microphone" to <strong>Allow</strong>.</li>
                <li>Ensure your microphone or headset is connected and not muted by OS.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={clearPermissionError}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  clearPermissionError();
                  enableMic();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

