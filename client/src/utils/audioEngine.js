/**
 * PRO CARD – Web Audio API Synthesis Audio Engine
 * 100% Original, royalty-free, copyright-safe procedural sound effects & ambient music.
 * Zero external asset dependencies. Zero network delay.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.bgmInterval = null;
    this.isBgmPlaying = false;

    this.masterVolume = 0.75;
    this.isMuted = true; // Muted by default per requirements
    this.sfxEnabled = false; // Muted by default per requirements
    this.bgmEnabled = false; // Muted by default per requirements

    // Throttle timestamps to prevent harsh overlap
    this.lastPlayedAt = {};
    this.THROTTLE_MS = 60;
  }

  /**
   * Initializes or resumes the AudioContext on user interaction
   */
  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 1 : 0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // BGM Gain (kept soft and atmospheric)
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.bgmEnabled ? 0.25 : 0, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, Number(val) || 0));
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.03);
    }
  }

  setMuted(muted) {
    this.isMuted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.03);
    }
    if (this.isMuted) {
      this.stopBGM();
    } else if (this.bgmEnabled) {
      this.startBGM();
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = Boolean(enabled);
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxEnabled ? 1 : 0, this.ctx.currentTime, 0.03);
    }
  }

  setBgmEnabled(enabled) {
    this.bgmEnabled = Boolean(enabled);
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(this.bgmEnabled ? 0.25 : 0, this.ctx.currentTime, 0.03);
    }
    if (this.bgmEnabled && !this.isMuted) {
      this.startBGM();
    } else {
      this.stopBGM();
    }
  }

  canPlay(key) {
    if (this.isMuted || !this.sfxEnabled) return false;
    const now = Date.now();
    if (this.lastPlayedAt[key] && now - this.lastPlayedAt[key] < this.THROTTLE_MS) {
      return false; // Prevent harsh overlapping
    }
    this.lastPlayedAt[key] = now;
    return true;
  }

  // 1. Card Dealing Sound: Soft card slide & felt flick (flutter)
  playCardDealSound() {
    if (!this.canPlay('deal')) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // Card friction swoosh (filtered noise burst)
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(450, t + 0.08);
    filter.Q.value = 2.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);

    // Subtle felt contact tap
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.05);

    oscGain.gain.setValueAtTime(0.35, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  // 2. Card Playing Sound: Firm card flick onto table felt (crisp snap & thud)
  playCardPlaySound() {
    if (!this.canPlay('play')) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // Fast snap transient
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(620, t);
    snapOsc.frequency.exponentialRampToValueAtTime(140, t + 0.06);

    snapGain.gain.setValueAtTime(0.8, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    snapOsc.connect(snapGain);
    snapGain.connect(this.sfxGain);
    snapOsc.start(t);
    snapOsc.stop(t + 0.06);

    // Deep felt impact thud
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(180, t);
    thudOsc.frequency.exponentialRampToValueAtTime(45, t + 0.1);

    thudGain.gain.setValueAtTime(0.65, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    thudOsc.connect(thudGain);
    thudGain.connect(this.sfxGain);
    thudOsc.start(t);
    thudOsc.stop(t + 0.1);
  }

  // 3. Bid Announcement Sound: Double-tone mallet alert chime
  playBidAnnouncementSound() {
    if (!this.canPlay('bid')) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const notes = [523.25, 659.25]; // C5 -> E5

    notes.forEach((freq, idx) => {
      const startTime = t + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  }

  // 4. Trump Selection Sound: Regal royal fanfare chord arpeggio
  playTrumpSelectionSound() {
    if (!this.canPlay('trump')) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    // C Major royal arpeggio: C4, E4, G4, C5
    const notes = [261.63, 329.63, 392.0, 523.25];

    notes.forEach((freq, idx) => {
      const startTime = t + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx === 3 ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      // Lowpass filter for smooth royal brass tone
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, startTime);
      filter.frequency.exponentialRampToValueAtTime(700, startTime + 0.45);

      gain.gain.setValueAtTime(idx === 3 ? 0.5 : 0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + (idx === 3 ? 0.6 : 0.35));

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + (idx === 3 ? 0.6 : 0.35));
    });
  }

  // 5. Trick Winner Sound: Ascending sparkle / crystal chime celebration
  playTrickWinnerSound() {
    if (!this.canPlay('trickWin')) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const notes = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6 sparkle

    notes.forEach((freq, idx) => {
      const startTime = t + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.35, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }

  // 6. Match Victory Sound: Grand triumph victory fanfare
  playMatchVictorySound() {
    if (this.isMuted || !this.sfxEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // Victory chord progression: C -> F -> G -> High C Major
    const chords = [
      { delay: 0.0, notes: [261.63, 329.63, 392.0], dur: 0.25 }, // C
      { delay: 0.28, notes: [349.23, 440.0, 523.25], dur: 0.25 }, // F
      { delay: 0.56, notes: [392.0, 493.88, 587.33], dur: 0.3 }, // G
      { delay: 0.9, notes: [523.25, 659.25, 783.99, 1046.5], dur: 1.4 }, // Grand C
    ];

    chords.forEach(({ delay, notes, dur }) => {
      notes.forEach((freq) => {
        const startTime = t + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.28, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(startTime);
        osc.stop(startTime + dur);
      });
    });
  }

  // 7. Match Defeat Sound: Mellow, respectful minor cadence
  playMatchDefeatSound() {
    if (this.isMuted || !this.sfxEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    // D minor descending cadence
    const notes = [
      { freq: 293.66, delay: 0.0, dur: 0.35 }, // D4
      { freq: 261.63, delay: 0.3, dur: 0.35 }, // C4
      { freq: 220.0, delay: 0.6, dur: 0.4 }, // A3
      { freq: 146.83, delay: 0.95, dur: 0.8 }, // D3
    ];

    notes.forEach(({ freq, delay, dur }) => {
      const startTime = t + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + dur);
    });
  }

  // 8. Player Joining or Leaving Notification Sound
  playNotificationSound(isJoin = true) {
    if (!this.canPlay('notif')) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const notes = isJoin ? [440.0, 880.0] : [660.0, 330.0];

    notes.forEach((freq, idx) => {
      const startTime = t + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.28, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.18);
    });
  }

  // Background Music: Original gentle ambient chess lounge chords
  startBGM() {
    if (this.isBgmPlaying || this.isMuted || !this.bgmEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    this.isBgmPlaying = true;

    // Ambient 4-chord progression: Am7 -> Fmaj7 -> Cmaj7 -> G6
    const chords = [
      [220.0, 261.63, 329.63, 392.0], // Am7
      [174.61, 261.63, 329.63, 440.0], // Fmaj7
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [196.0, 246.94, 293.66, 392.0], // G6
    ];

    let chordIdx = 0;

    const playChordStep = () => {
      if (!this.isBgmPlaying || this.isMuted || !this.bgmEnabled) return;

      const t = ctx.currentTime;
      const currentChord = chords[chordIdx % chords.length];
      chordIdx++;

      currentChord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);

        // Soft, gentle swell & decay
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.035, t + 1.2);
        gain.gain.linearRampToValueAtTime(0.015, t + 3.0);
        gain.gain.linearRampToValueAtTime(0.0001, t + 4.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(t);
        osc.stop(t + 4.3);
      });
    };

    playChordStep();
    this.bgmInterval = setInterval(playChordStep, 4500);
  }

  stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  // Quick Test Tone for Settings Slider
  playTestBeep(volume = this.masterVolume) {
    const ctx = this.initContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, t); // D5

    gain.gain.setValueAtTime(Math.min(0.4, (Number(volume) || 0.5) * 0.5), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }
}

export const audioEngine = new AudioEngine();

