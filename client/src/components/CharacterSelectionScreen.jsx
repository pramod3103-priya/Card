import React, { useState } from 'react';
import { PLAYABLE_CHARACTERS, assignOfflineSeats } from '../data/characters';
import { enterGameFullscreen } from '../utils/gameDisplay';
import { AnimatedCharacterAvatar } from './character-avatars';
import { Bot, User, Check, Play, ArrowLeft, Sparkles, Target, Shield, Zap } from 'lucide-react';

export const CharacterSelectionScreen = ({ onStartOfflineMatch, onBackToMultiplayer }) => {
  const [selectedCharId, setSelectedCharId] = useState('odi');
  const [gameTarget, setGameTarget] = useState(31);

  const { humanCharacter, botOpponents } = assignOfflineSeats(selectedCharId);

  const handleStart = () => {
    enterGameFullscreen();
    onStartOfflineMatch({
      chosenCharacterId: selectedCharId,
      gameTarget,
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full select-none animate-fade-in">
      {/* Top Banner / Mode Switcher */}
      <div className="w-full flex items-center justify-between gap-3 mb-6 bg-slate-950/80 backdrop-blur-xl border border-slate-800 rounded-2xl px-4 py-2.5 shadow-xl">
        <button
          onClick={onBackToMultiplayer}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Online Multiplayer</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          <span className="text-amber-300 font-bold uppercase tracking-wider">PRO CARD Offline Mode</span>
        </div>
      </div>

      {/* Main Selection Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold uppercase tracking-widest mb-2 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Character Selection</span>
          <Sparkles className="w-3.5 h-3.5" />
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-serif tracking-tight text-white drop-shadow">
          CHOOSE YOUR CHARACTER
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1.5 max-w-xl mx-auto">
          Select <strong className="text-amber-300 font-bold">ONLY ONE</strong> character. The remaining three will automatically become your AI-controlled opponents.
        </p>
      </div>

      {/* 4 Playable Character Cards Grid */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {PLAYABLE_CHARACTERS.map((char) => {
          const isSelected = char.id === selectedCharId;

          return (
            <div
              key={char.id}
              onClick={() => setSelectedCharId(char.id)}
              className={`group relative flex flex-col justify-between p-5 sm:p-6 rounded-3xl border-2 transition-all duration-300 backdrop-blur-xl shadow-2xl cursor-pointer transform hover:-translate-y-1.5 ${
                isSelected
                  ? 'bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-900/95 border-amber-400 shadow-[0_15px_35px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/80 scale-[1.02]'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 shadow-black/80'
              }`}
            >
              {/* Selection Checkmark Badge */}
              {isSelected ? (
                <div className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center shadow-lg border-2 border-slate-950">
                  <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                </div>
              ) : (
                <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-600 uppercase font-bold group-hover:text-slate-400 transition-colors">
                  Click to Pick
                </div>
              )}

              <div>
                {/* Character Avatar Container */}
                <div className="flex items-center gap-3.5 mb-4">
                  <AnimatedCharacterAvatar
                    characterId={char.id}
                    state={isSelected ? 'celebrating' : 'idle'}
                    size="lg"
                    showGlow={isSelected}
                  />

                  <div className="min-w-0">
                    <h3 className="text-xl sm:text-2xl font-black font-serif text-white tracking-wide truncate flex items-center gap-1.5">
                      <span>{char.name}</span>
                      <span className="text-sm drop-shadow">{char.flagEmoji}</span>
                    </h3>
                    <span className="text-[10px] font-mono text-amber-400 font-bold block uppercase tracking-wider">
                      {char.tagline}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 block">
                      {char.inspiration}
                    </span>
                  </div>
                </div>

                {/* Character Bio */}
                <p className="text-xs text-slate-300 leading-relaxed mb-4 min-h-[50px]">
                  {char.bio}
                </p>

                {/* Signature Quote */}
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] italic text-amber-200/90 font-serif mb-4">
                  "{char.quips.intro}"
                </div>
              </div>

              {/* Bottom Card Attributes */}
              <div>
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">Style:</span>
                  <span className="text-slate-200 font-bold">{char.styleLabel}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">Favorite Trump:</span>
                  <span className="text-amber-400 font-bold">{char.favoriteTrump}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Roster Auto-Assignment Preview Card */}
      <div className="w-full max-w-4xl bg-slate-950/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Summary of Roles */}
          <div className="flex-1 w-full">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Table Roster (Auto-Assigned Opponents)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
              {/* Human Player */}
              <div className="p-3 rounded-2xl bg-gradient-to-b from-amber-500/20 to-amber-600/10 border border-amber-400/60 flex items-center gap-2.5 shadow-inner">
                <AnimatedCharacterAvatar
                  characterId={humanCharacter.id}
                  size="sm"
                  isHuman={true}
                  state="celebrating"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black uppercase text-amber-300 px-1.5 py-0.2 rounded bg-amber-400/30 mb-0.5 inline-block">
                    YOU (South)
                  </span>
                  <span className="font-bold text-white text-xs truncate block">
                    {humanCharacter.name}
                  </span>
                  <span className="text-[9px] text-amber-400/80 font-mono block">Human Player</span>
                </div>
              </div>

              {/* 3 Auto-Assigned Bots */}
              {botOpponents.map((bot, idx) => {
                const positions = ['West', 'North', 'East'];
                return (
                  <div
                    key={bot.id}
                    className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-2.5"
                  >
                    <AnimatedCharacterAvatar
                      characterId={bot.id}
                      size="sm"
                      isBot={true}
                      state="idle"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-mono font-bold uppercase text-slate-400 px-1.5 py-0.2 rounded bg-slate-800 mb-0.5 inline-flex items-center gap-1">
                        <Bot className="w-2.5 h-2.5 text-sky-400" />
                        <span>BOT ({positions[idx]})</span>
                      </span>
                      <span className="font-bold text-slate-200 text-xs truncate block">
                        {bot.name}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono block">AI Opponent</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Game Target Selector */}
          <div className="flex flex-col items-center md:items-end w-full md:w-auto shrink-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-800 md:pl-6">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>Target Score</span>
            </span>

            <div className="flex items-center gap-2">
              {[31, 41, 51].map((tgt) => (
                <button
                  key={tgt}
                  type="button"
                  onClick={() => setGameTarget(tgt)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all border cursor-pointer ${
                    gameTarget === tgt
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {tgt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        className="w-full max-w-md flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-serif font-black text-base sm:text-lg tracking-wider uppercase transition-all shadow-[0_10px_35px_rgba(245,158,11,0.4)] active:scale-95 cursor-pointer"
      >
        <Play className="w-5 h-5 fill-slate-950" />
        <span>START PRO CARD MATCH</span>
      </button>
    </div>
  );
};

