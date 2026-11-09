import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { PlayingCard } from './PlayingCard';
import {
  Users,
  PlusCircle,
  LogIn,
  Sparkles,
  RefreshCw,
  Copy,
  Link2,
  ShieldCheck,
  Crown,
  Play,
  Layers,
  Bot,
  ChevronRight,
} from 'lucide-react';

const RANDOM_NAMES = [
  'Ace Hunter',
  'Diamond Queen',
  'Spade Master',
  'Club King',
  'Heart Victor',
  'Card Shark',
  'Shadow Dealer',
  'Royal Flush',
  'Trumps Elite',
  'Velvet Ace',
];

export const HomeScreen = ({ onSelectOffline }) => {
  const { createRoom, joinRoom, loading, error, setError, connected } = useSocket();

  const [playerName, setPlayerName] = useState(() => {
    return (
      sessionStorage.getItem('procard_player_name') ||
      sessionStorage.getItem('minus_player_name') ||
      RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]
    );
  });
  const [gameTarget, setGameTarget] = useState(31); // 31 | 41 | 51
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'join'
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [localError, setLocalError] = useState('');

  // Auto-detect invite link from URL (?room=ABC123)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInputRoomCode(roomParam.toUpperCase().slice(0, 6));
      setActiveTab('join');
    }
  }, []);

  const handleRandomizeName = () => {
    const random = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    setPlayerName(random);
    sessionStorage.setItem('procard_player_name', random);
  };

  const handleNameChange = (e) => {
    const val = e.target.value.slice(0, 20);
    setPlayerName(val);
    sessionStorage.setItem('procard_player_name', val);
    if (localError) setLocalError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setLocalError('Please enter your player nickname.');
      return;
    }
    setLocalError('');
    try {
      await createRoom(playerName.trim(), gameTarget);
    } catch (err) {
      // handled in socket context
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setLocalError('Please enter your player nickname.');
      return;
    }
    const cleanCode = inputRoomCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length !== 6) {
      setLocalError('Room code must be exactly 6 characters.');
      return;
    }
    setLocalError('');
    try {
      await joinRoom(cleanCode, playerName.trim());
    } catch (err) {
      // handled in socket context
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Decorative Subtle Radial Ambience */}
      <div className="absolute top-1/4 -left-36 w-[500px] h-[500px] bg-slate-700/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-36 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating 3D Showcase Playing Cards (Left & Right) */}
      <div className="hidden lg:block absolute left-12 top-1/3 -rotate-12 transform hover:rotate-0 transition-transform duration-500 pointer-events-none opacity-40 hover:opacity-80">
        <PlayingCard rank="A" suit="SPADES" isFaceUp={true} isInteractive={false} size="lg" />
      </div>
      <div className="hidden lg:block absolute right-12 top-1/3 rotate-12 transform hover:rotate-0 transition-transform duration-500 pointer-events-none opacity-40 hover:opacity-80">
        <PlayingCard rank="K" suit="HEARTS" isFaceUp={true} isInteractive={false} size="lg" />
      </div>

      <div className="max-w-md w-full relative z-10 flex flex-col items-center">
        {/* Emblem & Hero Heading */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 shadow-[0_10px_35px_rgba(245,158,11,0.25)] mb-4 border border-amber-500/40 transform hover:scale-105 transition-transform duration-300">
            <span className="text-4xl font-serif font-black text-amber-400">♚</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black font-serif tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-500 drop-shadow-sm">
            PRO CARD
          </h1>

          <p className="text-slate-400 font-semibold text-xs sm:text-sm tracking-widest mt-1.5 uppercase font-mono">
            4-Player Strategic Card Game
          </p>

          <div className="flex items-center justify-center gap-2.5 text-slate-400 text-xs mt-2.5 font-mono">
            <span className="text-slate-300">♠ Spades</span>
            <span className="text-slate-600">•</span>
            <span className="text-rose-400">♥ Hearts</span>
            <span className="text-slate-600">•</span>
            <span className="text-rose-400">♦ Diamonds</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300">♣ Clubs</span>
          </div>
        </div>

        {/* Game Mode Selector: Online Multiplayer vs Offline vs Bots */}
        <div className="w-full grid grid-cols-2 p-1.5 bg-slate-950/90 border border-slate-800 rounded-2xl mb-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold font-mono transition-all bg-slate-800 border border-slate-700 text-amber-300 shadow-md">
            <Users className="w-4 h-4 text-amber-400" />
            <span>Online 4-Player</span>
          </div>
          <button
            type="button"
            onClick={onSelectOffline}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold font-mono transition-all text-slate-400 hover:text-amber-300 hover:bg-slate-900 cursor-pointer"
          >
            <Bot className="w-4 h-4 text-sky-400" />
            <span>Offline vs Bots</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold uppercase tracking-wider">
              PRO CARD
            </span>
          </button>
        </div>

        {/* Main Card Container */}
        <div className="w-full bg-slate-950/90 backdrop-blur-2xl border border-slate-800 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-6 sm:p-7 transition-all">
          {/* Player Name Input */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Player Nickname
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={playerName}
                onChange={handleNameChange}
                placeholder="Enter your name"
                maxLength={20}
                className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-2xl px-4 py-3.5 text-slate-100 text-sm font-medium tracking-wide placeholder-slate-500 transition-all outline-none shadow-inner"
              />
              <button
                type="button"
                onClick={handleRandomizeName}
                title="Generate random moniker"
                className="absolute right-2.5 p-2 text-slate-400 hover:text-amber-300 transition-colors rounded-xl hover:bg-slate-800"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl mb-6 shadow-inner">
            <button
              onClick={() => {
                setActiveTab('create');
                setLocalError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                activeTab === 'create'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Room</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('join');
                setLocalError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                activeTab === 'join'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Join Room</span>
            </button>
          </div>

          {/* Error Message */}
          {(localError || error) && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-medium flex items-center gap-2.5 animate-shake">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span>{localError || error}</span>
            </div>
          )}

          {/* Form Actions */}
          {activeTab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Select Game Target */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Select Game Target
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[31, 41, 51].map((target) => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => setGameTarget(target)}
                      className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                        gameTarget === target
                          ? 'bg-gradient-to-b from-amber-500/20 to-amber-600/10 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-400'
                          : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-base font-black font-mono">{target}</div>
                      <div className="text-[9px] uppercase tracking-wider font-semibold opacity-80">
                        {target === 31 ? 'Quick' : target === 41 ? 'Classic' : 'Championship'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Private 4-Player Table</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Create an authoritative room, take Seat 1 (South), and invite 3 friends via room code or instant link.
                </p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Capacity: Exactly 4 Players</span>
                  <span>Instant Reconnect</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !connected}
                className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm tracking-wider uppercase text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] transition-all shadow-[0_8px_25px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                ) : (
                  <>
                    <PlusCircle className="w-5 h-5" />
                    <span>Create 4-Player Room</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  6-Character Room Code
                </label>
                <input
                  type="text"
                  value={inputRoomCode}
                  onChange={(e) => {
                    setInputRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                    setLocalError('');
                  }}
                  placeholder="e.g. 7K2M9X"
                  maxLength={6}
                  className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-2xl px-4 py-3.5 text-center text-xl font-mono font-black tracking-[0.3em] text-amber-300 placeholder-slate-600 outline-none uppercase transition-all shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !connected}
                className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm tracking-wider uppercase text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] transition-all shadow-[0_8px_25px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Join Room</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* PRO CARD Offline Arena Feature Banner */}
        <div
          onClick={onSelectOffline}
          className="w-full mt-4 p-4 rounded-3xl bg-slate-950/85 backdrop-blur-2xl border border-slate-800 hover:border-amber-400/60 cursor-pointer transition-all duration-300 group shadow-xl hover:shadow-[0_10px_35px_rgba(245,158,11,0.2)] transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border border-amber-500/40 flex items-center justify-center text-amber-400 font-serif font-black text-xl shadow-lg group-hover:scale-105 transition-transform">
                ♚
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white font-serif">
                    PRO CARD Arena (Offline)
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono font-bold">
                    4 CHARACTERS
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                  Play as <strong className="text-amber-300 font-bold">ODI</strong>, <strong className="text-sky-300 font-bold">Put-in</strong>, <strong className="text-yellow-300 font-bold">Trampu</strong> or <strong className="text-rose-300 font-bold">Iron Man</strong> vs 3 smart bots!
                </p>
              </div>
            </div>
            <div className="flex items-center text-amber-400 font-bold text-xs gap-1 group-hover:translate-x-1 transition-transform shrink-0 pl-2">
              <span className="hidden sm:inline">Select Character</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="mt-6 grid grid-cols-3 gap-3 w-full text-center">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 shadow-lg">
            <span className="block text-xs font-bold text-slate-200">Real-Time</span>
            <span className="text-[10px] text-slate-400 font-mono">Socket.IO</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 shadow-lg">
            <span className="block text-xs font-bold text-slate-200">Reconnect</span>
            <span className="text-[10px] text-slate-400 font-mono">Session Token</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 shadow-lg">
            <span className="block text-xs font-bold text-slate-200">4-Player</span>
            <span className="text-[10px] text-slate-400 font-mono">Authoritative</span>
          </div>
        </div>
      </div>
    </div>
  );
};
