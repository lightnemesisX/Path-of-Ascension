// ═══════════════════════════════════════════════════════════════════
//  AUDIO ENGINE — Web Audio API synthesized sounds + YouTube music
// ═══════════════════════════════════════════════════════════════════

const AUDIO_SETTINGS_KEY = 'cultivation-rpg-audio';

export interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number; // 0-100
}

const DEFAULT_SETTINGS: AudioSettings = {
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 40,
};

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      musicEnabled: parsed.musicEnabled ?? true,
      sfxEnabled: parsed.sfxEnabled ?? true,
      musicVolume: parsed.musicVolume ?? 40,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveAudioSettings(settings: AudioSettings) {
  try {
    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

// ─── WEB AUDIO CONTEXT (lazy singleton) ───────────────────────────

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx) {
    _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (_ctx.state === 'suspended') {
    _ctx.resume();
  }
  return _ctx;
}

// Ensure context is resumed on first user interaction
export function ensureAudioContext() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
}

// ─── SOUND EFFECT GENERATORS ──────────────────────────────────────

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3,
  fadeOut: boolean = true,
) {
  const settings = loadAudioSettings();
  if (!settings.sfxEnabled) return;

  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);

    if (fadeOut) {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio context not available
  }
}

function playSequence(
  notes: { freq: number; dur: number; delay: number; type?: OscillatorType; vol?: number }[]
) {
  const settings = loadAudioSettings();
  if (!settings.sfxEnabled) return;

  try {
    const ctx = getCtx();
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.type || 'sine';
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.delay);
      gain.gain.setValueAtTime(note.vol ?? 0.25, ctx.currentTime + note.delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.delay + note.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + note.delay);
      osc.stop(ctx.currentTime + note.delay + note.dur);
    }
  } catch {
    // ignore
  }
}

// ─── PUBLIC SOUND EFFECTS ─────────────────────────────────────────

/** Soft click for UI buttons */
export function sfxClick() {
  playTone(800, 0.05, 'sine', 0.15);
}

/** Combat hit — short low thud */
export function sfxHit() {
  playTone(150, 0.1, 'square', 0.25);
}

/** Realm breakthrough — ascending chime */
export function sfxBreakthrough() {
  playSequence([
    { freq: 523, dur: 0.25, delay: 0, type: 'sine', vol: 0.3 },    // C5
    { freq: 659, dur: 0.25, delay: 0.2, type: 'sine', vol: 0.3 },  // E5
    { freq: 784, dur: 0.35, delay: 0.4, type: 'sine', vol: 0.35 }, // G5
    { freq: 1047, dur: 0.5, delay: 0.65, type: 'sine', vol: 0.3 }, // C6
  ]);
}

/** Death / game over — deep descending tone */
export function sfxDeath() {
  playSequence([
    { freq: 300, dur: 0.3, delay: 0, type: 'sawtooth', vol: 0.2 },
    { freq: 200, dur: 0.3, delay: 0.2, type: 'sawtooth', vol: 0.18 },
    { freq: 120, dur: 0.5, delay: 0.4, type: 'sawtooth', vol: 0.15 },
    { freq: 80, dur: 0.7, delay: 0.6, type: 'sawtooth', vol: 0.1 },
  ]);
}

/** Item received — bright short ping */
export function sfxItemReceived() {
  playTone(1200, 0.08, 'sine', 0.25);
}

/** Failed action — buzzer tone */
export function sfxFail() {
  playSequence([
    { freq: 200, dur: 0.12, delay: 0, type: 'square', vol: 0.15 },
    { freq: 180, dur: 0.12, delay: 0.1, type: 'square', vol: 0.12 },
  ]);
}

/** Win/achievement — short triumphant 4-note fanfare */
export function sfxVictory() {
  playSequence([
    { freq: 523, dur: 0.15, delay: 0, type: 'sine', vol: 0.25 },     // C5
    { freq: 659, dur: 0.15, delay: 0.12, type: 'sine', vol: 0.25 },  // E5
    { freq: 784, dur: 0.15, delay: 0.24, type: 'sine', vol: 0.28 },  // G5
    { freq: 1047, dur: 0.4, delay: 0.36, type: 'sine', vol: 0.3 },   // C6 (hold)
  ]);
}

/** Year advance chime */
export function sfxYearAdvance() {
  playSequence([
    { freq: 440, dur: 0.15, delay: 0, type: 'sine', vol: 0.15 },
    { freq: 550, dur: 0.2, delay: 0.12, type: 'sine', vol: 0.15 },
  ]);
}

// ─── MUSIC CONTROLLER ─────────────────────────────────────────────

let _musicIframe: HTMLIFrameElement | null = null;
let _musicStarted = false;
let _musicMuted = false;

export function isMusicPlaying(): boolean {
  return _musicStarted && !_musicMuted;
}

export function createMusicIframe(): HTMLIFrameElement {
  if (_musicIframe) return _musicIframe;

  const iframe = document.createElement('iframe');
  iframe.id = 'yt-music-iframe';
  iframe.width = '1';
  iframe.height = '1';
  iframe.allow = 'autoplay';
  iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';

  const settings = loadAudioSettings();
  const mute = settings.musicEnabled ? 0 : 1;
  const vol = settings.musicVolume;
  iframe.src = `https://www.youtube.com/embed/Pt-lVD3itVM?autoplay=1&loop=1&playlist=Pt-lVD3itVM&controls=0&showinfo=0&rel=0&mute=${mute}&start=0`;

  document.body.appendChild(iframe);
  _musicIframe = iframe;
  _musicStarted = true;
  _musicMuted = !settings.musicEnabled;

  return iframe;
}

export function startMusic() {
  if (_musicStarted && _musicIframe) {
    // Reload iframe to restart
    const settings = loadAudioSettings();
    _musicIframe.src = `https://www.youtube.com/embed/Pt-lVD3itVM?autoplay=1&loop=1&playlist=Pt-lVD3itVM&controls=0&showinfo=0&rel=0&mute=0&start=0`;
    _musicMuted = false;
    settings.musicEnabled = true;
    saveAudioSettings(settings);
    return;
  }
  createMusicIframe();
}

export function toggleMusic(): boolean {
  const settings = loadAudioSettings();
  settings.musicEnabled = !settings.musicEnabled;
  saveAudioSettings(settings);

  if (!_musicIframe) {
    if (settings.musicEnabled) {
      createMusicIframe();
    }
    return settings.musicEnabled;
  }

  // Reload iframe with new mute state
  const mute = settings.musicEnabled ? 0 : 1;
  _musicIframe.src = `https://www.youtube.com/embed/Pt-lVD3itVM?autoplay=1&loop=1&playlist=Pt-lVD3itVM&controls=0&showinfo=0&rel=0&mute=${mute}&start=0`;
  _musicMuted = !settings.musicEnabled;
  _musicStarted = true;

  return settings.musicEnabled;
}

export function setMusicVolume(vol: number) {
  const settings = loadAudioSettings();
  settings.musicVolume = vol;
  saveAudioSettings(settings);
  // Note: YouTube iframe API doesn't support volume via URL params alone.
  // Volume is best-effort via the initial embed. For precise control we'd need
  // the YT IFrame API, but the simple iframe approach is more reliable for autoplay.
}
