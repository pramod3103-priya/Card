import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, Sparkles, AlertCircle, Info, ShieldCheck } from 'lucide-react';

export const Phase2Placeholder = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="w-full max-w-xl mx-auto my-2 z-20">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all">
        {/* Banner Bar */}
        <div
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-between px-4 py-2.5 bg-slate-900 cursor-pointer border-b border-slate-800 hover:bg-slate-800/80 select-none transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-300 font-serif tracking-wide">
                PRO CARD: ONLINE MULTIPLAYER TABLE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              {collapsed ? 'View Table Info' : 'Hide'}
            </span>
            <button className="text-slate-400 hover:text-white p-1">
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Details */}
        {!collapsed && (
          <div className="p-4 text-xs text-slate-300 space-y-3 bg-slate-950/40">
            <div className="flex items-start gap-2.5 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-slate-300">
                Four-player rooms, private card dealing, bidding, and Pradhan selection are server-authoritative. Trick-taking card plays and scoring are not implemented yet.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <span className="text-amber-400 font-bold">✓ Active</span>
                <span className="text-slate-300">Authoritative 4P Lobby & Table</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <span className="text-amber-400 font-bold">✓ Active</span>
                <span className="text-slate-300">Socket.IO Reconnection Tokens</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <span className="text-amber-400 font-bold">✓ Ready</span>
                <span className="text-slate-300">Private 13-Card Hand Dealing</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <span className="text-amber-400 font-bold">✓ Active</span>
                <span className="text-slate-300">Synchronized Bidding & Pradhan</span>
              </div>
              <div className="flex items-center gap-2 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                <span className="text-amber-400 font-bold">⏳ Phase 2</span>
                <span className="text-amber-200">Card Play, Trick Resolution & Scoring</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
