import React, { useState } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import { VoiceChatProvider } from './context/VoiceChatContext';
import { SoundSettingsProvider } from './context/SoundSettingsContext';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { TableScreen } from './components/TableScreen';
import { NotificationToast } from './components/NotificationToast';
import { CharacterSelectionScreen } from './components/CharacterSelectionScreen';
import { ProCardOfflineTable } from './components/ProCardOfflineTable';

const GameRouter = ({ onSelectOffline }) => {
  const { roomState, roomCode } = useSocket();

  if (!roomCode || !roomState) {
    return <HomeScreen onSelectOffline={onSelectOffline} />;
  }

  if (roomState.status === 'table_preview') {
    return <TableScreen />;
  }

  return <LobbyScreen />;
};

function MainContent() {
  const [gameMode, setGameMode] = useState('online'); // 'online' | 'offline_select' | 'offline_table'
  const [offlineConfig, setOfflineConfig] = useState(null); // { chosenCharacterId, gameTarget }
  const { roomState } = useSocket();

  const handleStartOfflineMatch = (config) => {
    setOfflineConfig(config);
    setGameMode('offline_table');
  };

  const handleExitOfflineMatch = () => {
    setOfflineConfig(null);
    setGameMode('offline_select');
  };

  const isOfflineArena = gameMode === 'offline_select' || gameMode === 'offline_table';
  const isGameActive = gameMode === 'offline_table' || roomState?.status === 'table_preview';

  return (
    <div className={`${isGameActive ? "game-fullscreen-root" : "min-h-screen"} text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200 bg-[#09090b] bg-[radial-gradient(ellipse_at_top,#1e293b,#09090b)]`}>
      {!isGameActive && <Header
        gameMode={gameMode}
        onSwitchToOffline={() => {
          setOfflineConfig(null);
          setGameMode('offline_select');
        }}
        onSwitchToOnline={() => {
          setOfflineConfig(null);
          setGameMode('online');
        }}
        isInOfflineMatch={gameMode === 'offline_table' && Boolean(offlineConfig)}
        onExitOfflineMatch={handleExitOfflineMatch}
        offlineTarget={offlineConfig?.gameTarget || 31}
      />}

      <main className={isGameActive ? "game-fullscreen-main" : "flex-1 flex flex-col relative"}>
        {gameMode === 'offline_table' && offlineConfig ? (
          <ProCardOfflineTable
            chosenCharacterId={offlineConfig.chosenCharacterId}
            gameTarget={offlineConfig.gameTarget}
            onExit={handleExitOfflineMatch}
          />
        ) : gameMode === 'offline_select' ? (
          <CharacterSelectionScreen
            onStartOfflineMatch={handleStartOfflineMatch}
            onBackToMultiplayer={() => setGameMode('online')}
          />
        ) : (
          <GameRouter onSelectOffline={() => setGameMode('offline_select')} />
        )}
      </main>

      <NotificationToast />

      {/* Global Subtle Footer */}
      {!isGameActive && <footer className="w-full py-2.5 px-4 text-center text-[11px] font-mono border-t border-slate-800 bg-slate-950/80 text-slate-400 backdrop-blur-sm">
        <span>
          {isOfflineArena
            ? 'PRO CARD Offline Arena • 4 Playable Characters (ODI, Put-in, Trampu, Iron Man) • 3 Auto-Assigned AI Bots'
            : 'PRO CARD • 4-Player Online Multiplayer & AI Arena • Authoritative Game Engine'}
        </span>
      </footer>}
    </div>
  );
}

export function App() {
  return (
    <SocketProvider>
      <VoiceChatProvider>
        <SoundSettingsProvider>
          <MainContent />
        </SoundSettingsProvider>
      </VoiceChatProvider>
    </SocketProvider>
  );
}

export default App;
