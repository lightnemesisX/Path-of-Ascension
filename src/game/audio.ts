// ═══════════════════════════════════════════════════════════════════
//  AUDIO ENGINE — Rebuilt from scratch
//  Web Audio API synthesized SFX + YouTube iframe background music
//  Initializes ONCE. Survives state changes and auto-saves.
// ═══════════════════════════════════════════════════════════════════

const AUDIO_SETTINGS_KEY = 'cultivation-rpg-audio-v2';

export interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number; // 0-100
}

const DEFAULTS: AudioSettings = { musicEnabled: true, sfxEnabled: true, musicVolume: 40 };

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw);
    return {
      musicEnabled: typeof p.musicEnabled === 'boolean' ? p.musicEnabled : true,
      sfxEnabled: typeof p.sfxEnabled === 'boolean' ? p.sfxEnabled : true,
      musicVolume: typeof p.musicVolume === 'number' ? p.musicVolume : 40,
    };
  } catch { return { ...DEFAULTS }; }
}

export function saveAudioSettings(s: AudioSettings) {
  try { localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

// ─── WEB AUDIO CONTEXT (singleton, created once) ──────────────────

let _ctx: AudioContext | null = null;
let _ctxResumed = false;

function ctx(): AudioContext {
  if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return _ctx;
}

/** Call on any user gesture to unlock the audio context */
export function ensureAudio() {
  const c = ctx();
  if (c.state === 'suspended') {
    c.resume().then(() => { _ctxResumed = true; });
  } else {
    _ctxResumed = true;
  }
}

// ─── PRIMITIVE SOUND BUILDERS ─────────────────────────────────────

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
  if (!loadAudioSettings().sfxEnabled) return;
  try {
    const c = ctx();
    if (c.state === 'suspended') return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime + delay);
    g.gain.setValueAtTime(vol, c.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + delay);
    o.stop(c.currentTime + delay + dur + 0.05);
  } catch {}
}

function noise(dur: number, vol: number, delay = 0) {
  if (!loadAudioSettings().sfxEnabled) return;
  try {
    const c = ctx();
    if (c.state === 'suspended') return;
    const bufSize = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, c.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    src.connect(g); g.connect(c.destination);
    src.start(c.currentTime + delay);
    src.stop(c.currentTime + delay + dur + 0.05);
  } catch {}
}

function sweep(startFreq: number, endFreq: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
  if (!loadAudioSettings().sfxEnabled) return;
  try {
    const c = ctx();
    if (c.state === 'suspended') return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(startFreq, c.currentTime + delay);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), c.currentTime + delay + dur);
    g.gain.setValueAtTime(vol, c.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + delay);
    o.stop(c.currentTime + delay + dur + 0.05);
  } catch {}
}

// ─── PUBLIC SOUND EFFECTS ─────────────────────────────────────────

/** Soft click for every button press */
export function sfxClick() {
  tone(800, 0.05, 'sine', 0.15);
}

/** Combat hit — short low thud */
export function sfxHit() {
  tone(150, 0.1, 'square', 0.2);
}

/** Retreat/flee — whoosh (white noise burst) */
export function sfxFlee() {
  noise(0.15, 0.15);
}

/** Defeated in combat — deep descending tone */
export function sfxDeath() {
  sweep(200, 80, 0.6, 'sawtooth', 0.15);
}

/** Tribulation screen — rumbling thunder + sharp crack */
export function sfxTribulation() {
  tone(60, 0.8, 'sawtooth', 0.12);
  tone(50, 0.6, 'square', 0.08, 0.1);
  noise(0.1, 0.35, 0.7); // crack
}

/** Cultivation breakthrough — ascending 3-note chime */
export function sfxBreakthrough() {
  tone(400, 0.25, 'sine', 0.25, 0);
  tone(600, 0.25, 'sine', 0.25, 0.2);
  tone(900, 0.35, 'sine', 0.28, 0.4);
}

/** Item received / loot — bright ping */
export function sfxItemReceived() {
  tone(1200, 0.08, 'sine', 0.2);
}

/** Socialize — brief ambient murmur */
export function sfxSocialize() {
  tone(350, 0.4, 'sine', 0.04);
  tone(420, 0.35, 'sine', 0.03, 0.05);
  tone(480, 0.3, 'sine', 0.03, 0.1);
  noise(0.4, 0.03, 0);
}

/** Failed action / not enough resources — buzzer */
export function sfxFail() {
  tone(200, 0.15, 'square', 0.12);
  tone(180, 0.12, 'square', 0.08, 0.08);
}

/** Win / achievement — triumphant 4-note fanfare */
export function sfxVictory() {
  tone(523, 0.15, 'sine', 0.22, 0);
  tone(659, 0.15, 'sine', 0.22, 0.12);
  tone(784, 0.15, 'sine', 0.25, 0.24);
  tone(1047, 0.4, 'sine', 0.28, 0.36);
}

/** Pill consumed / item used — soft pop */
export function sfxPop() {
  tone(600, 0.06, 'sine', 0.18);
}

/** Weapon equipped — metallic ring */
export function sfxEquip() {
  tone(1800, 0.1, 'sine', 0.15);
  tone(2400, 0.06, 'sine', 0.08, 0.03);
}

/** Year advance — gentle two-tone chime */
export function sfxYearAdvance() {
  tone(440, 0.15, 'sine', 0.12, 0);
  tone(550, 0.2, 'sine', 0.12, 0.12);
}

// ─── YOUTUBE MUSIC CONTROLLER (singleton) ─────────────────────────
// The iframe is created ONCE and never destroyed.
// It survives React re-renders, state changes, and auto-saves.

let _iframe: HTMLIFrameElement | null = null;
let _iframeReady = false;
let _musicStartedByUser = false;

function getMusicSrc(mute: boolean): string {
  const m = mute ? 1 : 0;
  return `https://www.youtube.com/embed/Pt-lVD3itVM?autoplay=1&loop=1&playlist=Pt-lVD3itVM&controls=0&showinfo=0&rel=0&fs=0&modestbranding=1&mute=${m}&start=0&enablejsapi=0`;
}

/** Create the music iframe. Call once on app mount. */
export function initMusic() {
  if (_iframe) return; // Already initialized — never re-create

  const settings = loadAudioSettings();
  if (!settings.musicEnabled) return; // User has music disabled

  const el = document.createElement('iframe');
  el.id = 'yt-music-iframe';
  el.allow = 'autoplay; encrypted-media';
  el.setAttribute('allowtransparency', 'true');
  el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;border:none;';
  el.src = getMusicSrc(false);

  document.body.appendChild(el);
  _iframe = el;
  _iframeReady = true;
}

/** Start music (called from user gesture if autoplay was blocked) */
export function startMusic() {
  _musicStartedByUser = true;
  const settings = loadAudioSettings();
  settings.musicEnabled = true;
  saveAudioSettings(settings);

  if (_iframe) {
    // Reload the iframe to start
    _iframe.src = getMusicSrc(false);
  } else {
    initMusic();
  }
  _iframeReady = true;
}

/** Toggle music on/off */
export function toggleMusic(): boolean {
  const settings = loadAudioSettings();
  settings.musicEnabled = !settings.musicEnabled;
  saveAudioSettings(settings);

  if (settings.musicEnabled) {
    if (!_iframe) {
      initMusic();
    } else {
      _iframe.src = getMusicSrc(false);
    }
  } else {
    if (_iframe) {
      _iframe.src = 'about:blank'; // Stop the music entirely
    }
  }

  return settings.musicEnabled;
}

export function isMusicPlaying(): boolean {
  return _iframeReady && loadAudioSettings().musicEnabled;
}

export function musicNeedsUserStart(): boolean {
  return loadAudioSettings().musicEnabled && !_musicStartedByUser && !_iframeReady;
}
