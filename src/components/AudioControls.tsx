import React, { useState, useEffect, useRef } from 'react';
import {
  loadAudioSettings, saveAudioSettings, AudioSettings,
  createMusicIframe, toggleMusic, isMusicPlaying,
  ensureAudioContext, sfxClick,
} from '../game/audio';

interface Props {
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

export const AudioControls: React.FC<Props> = () => {
  const [settings, setSettings] = useState<AudioSettings>(loadAudioSettings);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Try to auto-start music on mount
  useEffect(() => {
    if (settings.musicEnabled) {
      // Most browsers block autoplay — we try and detect if it worked
      try {
        createMusicIframe();
        setMusicPlaying(true);
        setNeedsInteraction(false);
      } catch {
        setNeedsInteraction(true);
      }
    }
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    if (showPanel) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPanel]);

  const handleStartMusic = () => {
    ensureAudioContext();
    sfxClick();
    createMusicIframe();
    setMusicPlaying(true);
    setNeedsInteraction(false);
    const s = { ...settings, musicEnabled: true };
    setSettings(s);
    saveAudioSettings(s);
  };

  const handleToggleMusic = () => {
    ensureAudioContext();
    sfxClick();
    const nowPlaying = toggleMusic();
    setMusicPlaying(nowPlaying);
    const s = { ...settings, musicEnabled: nowPlaying };
    setSettings(s);
    saveAudioSettings(s);
  };

  const handleToggleSfx = () => {
    const s = { ...settings, sfxEnabled: !settings.sfxEnabled };
    setSettings(s);
    saveAudioSettings(s);
    if (s.sfxEnabled) {
      // Play a test click
      setTimeout(() => sfxClick(), 50);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseInt(e.target.value);
    const s = { ...settings, musicVolume: vol };
    setSettings(s);
    saveAudioSettings(s);
  };

  return (
    <>
      {/* First-time play button (if autoplay blocked) */}
      {needsInteraction && settings.musicEnabled && (
        <button
          onClick={handleStartMusic}
          className="fixed bottom-16 right-4 z-[61] px-3 py-2 bg-abyss/95 border border-jade/30 rounded-lg text-jade font-ui text-xs hover:bg-jade/10 transition-all animate-pulse shadow-lg"
        >
          ▶ Play Music
        </button>
      )}

      {/* Floating audio button */}
      <div ref={panelRef} className="fixed bottom-4 right-4 z-[60]">
        {/* Settings panel */}
        {showPanel && (
          <div className="absolute bottom-14 right-0 w-64 bg-abyss/95 border border-mist/25 rounded-xl p-4 shadow-2xl shadow-black/50 animate-float-up mb-2 backdrop-blur-md">
            <h3 className="font-display text-sm text-pearl mb-3">🎵 Audio Settings</h3>

            {/* Music toggle */}
            <div className="flex items-center justify-between mb-3">
              <span className="font-ui text-xs text-silver/80">🎵 Background Music</span>
              <button
                onClick={handleToggleMusic}
                className={`w-10 h-5 rounded-full transition-all relative ${musicPlaying ? 'bg-jade/50' : 'bg-shadow'}`}
              >
                <div className={`w-4 h-4 rounded-full absolute top-0.5 transition-all ${musicPlaying ? 'left-5 bg-jade' : 'left-0.5 bg-silver/50'}`} />
              </button>
            </div>

            {/* Volume slider */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="font-ui text-[10px] text-silver/50">Volume</span>
                <span className="font-ui text-[10px] text-silver/50">{settings.musicVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.musicVolume}
                onChange={handleVolumeChange}
                className="w-full h-1 rounded-full cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #2dd4a0 0%, #2dd4a0 ${settings.musicVolume}%, #3a3a5c ${settings.musicVolume}%, #3a3a5c 100%)`,
                }}
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

        {/* Main button */}
        <button
          onClick={() => {
            ensureAudioContext();
            setShowPanel(!showPanel);
          }}
          className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all shadow-lg active:scale-90
            ${musicPlaying
              ? 'bg-abyss/90 border-jade/30 hover:border-jade/50 shadow-jade/10'
              : 'bg-abyss/90 border-mist/25 hover:border-mist/40 shadow-black/30'
            }`}
          title="Audio Settings"
        >
          <span className={`text-base ${musicPlaying ? 'animate-pulse' : ''}`}>
            {musicPlaying ? '🎵' : '🔇'}
          </span>
        </button>
      </div>
    </>
  );
};
