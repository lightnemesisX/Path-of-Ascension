import React, { useState, useEffect, useRef } from 'react';
import {
  loadAudioSettings, saveAudioSettings, AudioSettings,
  initMusic, startMusic, toggleMusic, isMusicPlaying,
  ensureAudio, sfxClick,
} from '../game/audio';

export const AudioControls: React.FC = () => {
  const [settings, setSettings] = useState<AudioSettings>(loadAudioSettings);
  const [playing, setPlaying] = useState(false);
  const [needsStart, setNeedsStart] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);

  // Initialize music ONCE on first mount — never again
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const s = loadAudioSettings();
    if (s.musicEnabled) {
      initMusic();
      // Check if autoplay worked after a short delay
      setTimeout(() => {
        setPlaying(isMusicPlaying());
        // If we tried to init but can't tell if it's playing,
        // show the start button as a fallback
        if (s.musicEnabled && !document.getElementById('yt-music-iframe')) {
          setNeedsStart(true);
        }
      }, 1500);
    }
  }, []);

  // Close panel on outside click
  useEffect(() => {
    if (!showPanel) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setShowPanel(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPanel]);

  const handleStartMusic = () => {
    ensureAudio();
    sfxClick();
    startMusic();
    setPlaying(true);
    setNeedsStart(false);
    const s = { ...settings, musicEnabled: true };
    setSettings(s);
    saveAudioSettings(s);
  };

  const handleToggleMusic = () => {
    ensureAudio();
    sfxClick();
    const nowPlaying = toggleMusic();
    setPlaying(nowPlaying);
    setNeedsStart(false);
    const s = { ...settings, musicEnabled: nowPlaying };
    setSettings(s);
    saveAudioSettings(s);
  };

  const handleToggleSfx = () => {
    const s = { ...settings, sfxEnabled: !settings.sfxEnabled };
    setSettings(s);
    saveAudioSettings(s);
    if (s.sfxEnabled) setTimeout(() => sfxClick(), 50);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseInt(e.target.value);
    const s = { ...settings, musicVolume: vol };
    setSettings(s);
    saveAudioSettings(s);
  };

  return (
    <>
      {/* First-time play button if autoplay blocked */}
      {needsStart && settings.musicEnabled && (
        <button
          onClick={handleStartMusic}
          className="fixed bottom-16 right-4 z-[61] px-3 py-2 bg-abyss/95 border border-jade/30 rounded-lg text-jade font-ui text-xs hover:bg-jade/10 transition-all animate-pulse shadow-lg"
        >
          ▶ Play Music
        </button>
      )}

      {/* Floating audio button */}
      <div ref={panelRef} className="fixed bottom-4 right-4 z-[60]">
        {showPanel && (
          <div className="absolute bottom-14 right-0 w-64 bg-abyss/95 border border-mist/25 rounded-xl p-4 shadow-2xl shadow-black/50 animate-float-up mb-2 backdrop-blur-md">
            <h3 className="font-display text-sm text-pearl mb-3">🎵 Audio</h3>

            {/* Music toggle */}
            <div className="flex items-center justify-between mb-3">
              <span className="font-ui text-xs text-silver/80">🎵 Music</span>
              <button
                onClick={handleToggleMusic}
                className={`w-10 h-5 rounded-full transition-all relative ${playing ? 'bg-jade/50' : 'bg-shadow'}`}
              >
                <div className={`w-4 h-4 rounded-full absolute top-0.5 transition-all ${playing ? 'left-5 bg-jade' : 'left-0.5 bg-silver/50'}`} />
              </button>
            </div>

            {/* Volume */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="font-ui text-[10px] text-silver/50">Volume</span>
                <span className="font-ui text-[10px] text-silver/50">{settings.musicVolume}%</span>
              </div>
              <input
                type="range" min="0" max="100" value={settings.musicVolume}
                onChange={handleVolume}
                className="w-full h-1 rounded-full cursor-pointer"
                style={{ background: `linear-gradient(to right, #2dd4a0 0%, #2dd4a0 ${settings.musicVolume}%, #3a3a5c ${settings.musicVolume}%, #3a3a5c 100%)` }}
              />
            </div>

            {/* SFX toggle */}
            <div className="flex items-center justify-between">
              <span className="font-ui text-xs text-silver/80">🔊 Sound Effects</span>
              <button
                onClick={handleToggleSfx}
                className={`w-10 h-5 rounded-full transition-all relative ${settings.sfxEnabled ? 'bg-jade/50' : 'bg-shadow'}`}
              >
                <div className={`w-4 h-4 rounded-full absolute top-0.5 transition-all ${settings.sfxEnabled ? 'left-5 bg-jade' : 'left-0.5 bg-silver/50'}`} />
              </button>
            </div>

            <p className="font-ui text-[9px] text-silver/30 mt-3 text-center">Settings saved automatically</p>
          </div>
        )}

        <button
          onClick={() => { ensureAudio(); setShowPanel(!showPanel); }}
          className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all shadow-lg active:scale-90 ${
            playing ? 'bg-abyss/90 border-jade/30 hover:border-jade/50 shadow-jade/10' : 'bg-abyss/90 border-mist/25 hover:border-mist/40 shadow-black/30'
          }`}
          title="Audio Settings"
        >
          <span className={`text-base ${playing ? 'animate-pulse' : ''}`}>{playing ? '🎵' : '🔇'}</span>
        </button>
      </div>
    </>
  );
};
