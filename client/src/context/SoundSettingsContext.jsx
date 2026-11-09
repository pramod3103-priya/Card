import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { audioEngine } from '../utils/audioEngine';

const SoundSettingsContext = createContext(null);

const STORAGE_KEY = 'procard_game_settings';

const DEFAULT_SETTINGS = {
  masterVolume: 0.75,
  sfxEnabled: false,    // Muted by default per requirements
  bgmEnabled: false,    // Muted by default per requirements
  isMuted: true,        // Muted by default per requirements
  cardAnimation: true,
  reducedMotion: false,
};

function loadStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      masterVolume: typeof parsed.masterVolume === 'number' ? parsed.masterVolume : DEFAULT_SETTINGS.masterVolume,
      sfxEnabled: typeof parsed.sfxEnabled === 'boolean' ? parsed.sfxEnabled : DEFAULT_SETTINGS.sfxEnabled,
      bgmEnabled: typeof parsed.bgmEnabled === 'boolean' ? parsed.bgmEnabled : DEFAULT_SETTINGS.bgmEnabled,
      isMuted: typeof parsed.isMuted === 'boolean' ? parsed.isMuted : DEFAULT_SETTINGS.isMuted,
      cardAnimation: typeof parsed.cardAnimation === 'boolean' ? parsed.cardAnimation : DEFAULT_SETTINGS.cardAnimation,
      reducedMotion: typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
    };
  } catch (err) {
    return DEFAULT_SETTINGS;
  }
}

export const SoundSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(loadStoredSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync with AudioEngine on mount and changes
  useEffect(() => {
    audioEngine.setMasterVolume(settings.masterVolume);
    audioEngine.setMuted(settings.isMuted);
    audioEngine.setSfxEnabled(settings.sfxEnabled);
    audioEngine.setBgmEnabled(settings.bgmEnabled);
  }, [settings.masterVolume, settings.isMuted, settings.sfxEnabled, settings.bgmEnabled]);

  // Persist to localStorage
  const saveSettings = useCallback((newSettings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (err) {
      console.warn('Failed to save settings to localStorage:', err);
    }
  }, []);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  }, [saveSettings]);

  const toggleMute = useCallback(() => {
    setSettings((prev) => {
      const newMuted = !prev.isMuted;
      // If unmuting for the first time and sfx were off, enable sfx so user hears sound!
      const newSfx = newMuted ? prev.sfxEnabled : true;
      const next = { ...prev, isMuted: newMuted, sfxEnabled: newSfx };
      saveSettings(next);
      return next;
    });
  }, [saveSettings]);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, [saveSettings]);

  // Play Sound Handlers with safety checks
  const playDeal = useCallback(() => {
    if (!settings.isMuted && settings.sfxEnabled) {
      audioEngine.playCardDealSound();
    }
  }, [settings.isMuted, settings.sfxEnabled]);

  const playCardPlay = useCallback(() => {
    if (!settings.isMuted && settings.sfxEnabled) {
      audioEngine.playCardPlaySound();
    }
  }, [settings.isMuted, settings.sfxEnabled]);

  const playBid = useCallback(() => {
    if (!settings.isMuted && settings.sfxEnabled) {
      audioEngine.playBidAnnouncementSound();
    }
  }, [settings.isMuted, settings.sfxEnabled]);

  const playTrump = useCallback(() => {
    if (!settings.isMuted && settings.sfxEnabled) {
      audioEngine.playTrumpSelectionSound();
    }
  }, [settings.isMuted, settings.sfxEnabled]);

  const playTrickWin = useCallback(() => {
    if (!settings.isMuted && settings.sfxEnabled) {
      audioEngine.playTrickWinnerSound();
    }
  }, [settings.isMuted, settings.sfxEnabled]);

  const playVictory = useCallback(() => {
    if (!settings.isMuted && settings.sfxEnabled) {
      audioEngine.playMatchVictorySound();
    }
  }, [settings.isMuted, settings.sfxEnabled]);

  const playDefeat = useCallback(() => {
    if (!settings.isMuted && settings.sfxEnabled) {
      audioEngine.playMatchDefeatSound();
    }
  }, [settings.isMuted, settings.sfxEnabled]);

  const playNotification = useCallback((isJoin = true) => {
    if (!settings.isMuted && settings.sfxEnabled) {
      audioEngine.playNotificationSound(isJoin);
    }
  }, [settings.isMuted, settings.sfxEnabled]);

  const playTestTone = useCallback((volume) => {
    audioEngine.playTestBeep(volume ?? settings.masterVolume);
  }, [settings.masterVolume]);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  const value = {
    settings,
    updateSetting,
    toggleMute,
    resetToDefaults,
    playDeal,
    playCardPlay,
    playBid,
    playTrump,
    playTrickWin,
    playVictory,
    playDefeat,
    playNotification,
    playTestTone,
    isSettingsOpen,
    openSettings,
    closeSettings,
  };

  return (
    <SoundSettingsContext.Provider value={value}>
      {children}
    </SoundSettingsContext.Provider>
  );
};

export const useSoundSettings = () => {
  const context = useContext(SoundSettingsContext);
  if (!context) {
    throw new Error('useSoundSettings must be used within a SoundSettingsProvider');
  }
  return context;
};

