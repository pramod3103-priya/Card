import React from 'react';
import { useSocket } from '../context/SocketContext';
import { Copy, Link2, LogOut, Bot, Users, ArrowLeft } from 'lucide-react';
import { VoiceChatControls } from './VoiceChatControls';

export const Header = ({
  gameMode = 'online',
  onSwitchToOffline,
  onSwitchToOnline,
  isInOfflineMatch = false,
  onExitOfflineMatch,
  offlineTarget = 31,
}) => {
  const { connected, roomCode, leaveRoom, copyRoomCode, copyInviteLink } = useSocket();

  const isOffline = gameMode === 'offline_select' || isInOfflineMatch;

  return (
    <header className="w-full backdrop-blur-xl border-b border-slate-800 bg-slate-950/95 sticky top-0 z-40 px-4 py-3 shadow-2xl transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Mode Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-serif font-black text-xl border transition-all bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 text-amber-400 border-amber-500/50 shadow-[0_4px_15px_rgba(245,158,11,0.25)]">
            ♚
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-500 font-serif">
                PRO CARD
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-widest uppercase border bg-amber-400/15 border-amber-400/40 text-amber-300">
                {isOffline ? 'OFFLINE ARENA' : 'MULTIPLAYER'}
              </span>
            </div>
            <p className="text-[10px] font-mono tracking-widest hidden sm:block uppercase text-slate-400">
              {isOffline
                ? '♚ 4 Characters • Offline Arena'
                : '♠ ♥ ♦ ♣ 4-Player Card Room'}
            </p>
          </div>
        </div>

        {/* Right Action & Status Area */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* OFFLINE MATCH CONTROLS */}
          {isInOfflineMatch ? (
            <div className="flex items-center gap-2">
              <div className="hidden xs:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Target: {offlineTarget}</span>
              </div>
              <button
                onClick={onExitOfflineMatch}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 hover:bg-rose-900/80 transition-all text-xs font-bold shadow-sm active:scale-95 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit Match</span>
              </button>
            </div>
          ) : gameMode === 'offline_select' ? (
            /* CHARACTER SELECTION SCREEN: Option to return to Online Multiplayer */
            <button
              onClick={onSwitchToOnline}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300 hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Online 4-Player</span>
            </button>
          ) : (
            /* ONLINE MULTIPLAYER CONTROLS */
            <>
              {/* Quick Jump to Offline vs Bots when not inside a room */}
              {!roomCode && (
                <button
                  onClick={onSwitchToOffline}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-amber-300 hover:border-amber-400/50 transition-all shadow-sm cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Offline vs Bots</span>
                  <span className="sm:hidden">Bots</span>
                </button>
              )}

              {/* Connection Status Pill */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium border ${
                  connected
                    ? 'bg-slate-900 border-slate-700 text-slate-300'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-300 animate-pulse'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    connected
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                      : 'bg-rose-400'
                  }`}
                />
                <span className="hidden xs:inline">
                  {connected ? 'Server Connected' : 'Connecting...'}
                </span>
              </div>

              {/* In-Room Voice Chat Controls (Online Multiplayer Rooms Only) */}
              {roomCode && !isOffline && (
                <VoiceChatControls compact={false} />
              )}

              {/* In-Room Controls: Room Code, Invite Link, Leave */}
              {roomCode && (
                <>
                  <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-0.5 shadow-inner">
                    <button
                      onClick={copyRoomCode}
                      title="Copy 6-digit Room Code"
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold text-amber-300 hover:bg-slate-800 transition-colors"
                    >
                      <span>#{roomCode}</span>
                      <Copy className="w-3.5 h-3.5 text-amber-400/80" />
                    </button>
                    <div className="w-[1px] h-4 bg-slate-700 my-auto" />
                    <button
                      onClick={copyInviteLink}
                      title="Copy Shareable Invite Link"
                      className="p-1.5 rounded-lg text-slate-300 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={leaveRoom}
                    title="Leave Room"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 hover:bg-rose-900/60 hover:border-rose-600/60 transition-all text-xs font-bold shadow-sm active:scale-95 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Leave</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};
