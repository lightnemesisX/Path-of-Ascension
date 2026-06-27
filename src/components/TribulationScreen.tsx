import React, { useState, useEffect, useRef } from 'react';
import { GameState, TribulationState, TribulationAction } from '../game/types';
import { REALMS, REALM_COLORS } from '../game/constants';
import {
  createTribulationState, resolveTribulationAction,
  advanceToNextWave, usePillBetweenWaves, getCinematicText,
} from '../game/tribulation';
import { sfxHit, sfxBreakthrough, sfxDeath, sfxClick, sfxTribulation, sfxPop, ensureAudio } from '../game/audio';

interface Props {
  state: GameState;
  targetRealmIdx: number;
  targetStage: string;
  onSuccess: (ts: TribulationState) => void;
  onFailure: (ts: TribulationState) => void;
}

export const TribulationScreen: React.FC<Props> = ({ state, targetRealmIdx, targetStage, onSuccess, onFailure }) => {
  const [ts, setTs] = useState<TribulationState>(() => createTribulationState(state, targetRealmIdx, targetStage));
  const thunderFired = useRef(false);

  // Fire thunder sound ONCE after mount — useEffect runs after render,
  // so the AudioContext has been resumed by the user gesture that opened this screen
  useEffect(() => {
    if (thunderFired.current) return;
    thunderFired.current = true;
    const thunder = new Audio('https://path-of-ascension.vercel.app/sounds/lightning.mp3');
    thunder.volume = 0.7;
    thunder.play();
    ensureAudio();
    console.log('THUNDER TRIGGERED');
    sfxTribulation();
  }, []);

  const realmColor = REALM_COLORS[REALMS[targetRealmIdx]] || '#9966ff';
  const realmName = REALMS[targetRealmIdx];
  const hpPct = ts.playerMaxHp > 0 ? (ts.playerHp / ts.playerMaxHp) * 100 : 0;
  const qiPct = ts.playerMaxQi > 0 ? (ts.playerQi / ts.playerMaxQi) * 100 : 0;
  const visibleLog = ts.log.slice(-4);

  const healingPills = state.inventory.filter(i => i.name.toLowerCase().includes('healing'));
  const [pillUsed, setPillUsed] = useState(false);

  const handleAction = (action: TribulationAction) => {
    ensureAudio();
    sfxHit();
    const next = resolveTribulationAction(ts, action);
    if (next.phase === 'failure') sfxDeath();
    setTs(next);
    setPillUsed(false);
  };

  const handleNextWave = () => {
    sfxClick();
    const next = advanceToNextWave(ts);
    if (next.phase === 'success') sfxBreakthrough();
    setTs(next);
    setPillUsed(false);
  };

  const handleUsePill = () => {
    sfxPop(); // Pill consumed sound
    const next = usePillBetweenWaves(ts, 50);
    setTs(next);
    setPillUsed(true);
  };

  // ─── WARNING PHASE ──────────────────────────────────────────────
  if (ts.phase === 'warning') {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-void/95 backdrop-blur-md p-4">
        <div className="w-full max-w-lg bg-abyss border border-purple/30 rounded-2xl p-6 shadow-2xl animate-float-up">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4 animate-pulse">🌩️</div>
            <h1 className="font-display text-3xl text-purple font-bold mb-2">Heavenly Tribulation</h1>
            <p className="font-body text-lg text-pearl/80 italic mb-4">The heavens stir... a tribulation approaches.</p>
            <div className="bg-purple/10 border border-purple/20 rounded-xl p-4 mb-4 text-left">
              <p className="font-body text-sm text-pearl/70 leading-relaxed">
                To advance to <span className="font-display font-bold" style={{ color: realmColor }}>{realmName} — {targetStage}</span>, you must survive the Heavenly Tribulation — {ts.totalWaves} waves of divine lightning that test your worthiness.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-3 font-ui text-xs">
                <div className="text-silver/50">Waves: <span className="text-pearl">{ts.totalWaves}</span></div>
                <div className="text-silver/50">Difficulty: <span className={`${targetRealmIdx >= 9 ? 'text-crimson' : targetRealmIdx >= 7 ? 'text-gold' : 'text-jade'}`}>{targetRealmIdx >= 9 ? 'Legendary' : targetRealmIdx >= 7 ? 'Brutal' : targetRealmIdx >= 5 ? 'Hard' : 'Manageable'}</span></div>
                {ts.hasHeavenBead && <div className="text-jade col-span-2">✓ Heaven Defying Bead: -50% damage</div>}
                {ts.wisdomBonus > 0 && <div className="text-purple col-span-2">✓ Wisdom bonus: +{ts.wisdomBonus}% deflect chance</div>}
              </div>
            </div>
          </div>
          <button
            onClick={() => { sfxClick(); setTs({ ...ts, phase: 'wave', currentWave: 0 }); }}
            className="w-full py-4 bg-purple/20 border border-purple/40 rounded-xl text-purple font-display text-lg hover:bg-purple/30 hover:shadow-[0_0_30px_rgba(153,102,255,0.2)] transition-all active:scale-95"
          >
            ⚡ Face the Tribulation
          </button>
        </div>
      </div>
    );
  }

  // ─── SUCCESS PHASE ──────────────────────────────────────────────
  if (ts.phase === 'success') {
    const cinematic = getCinematicText(targetRealmIdx);
    const statEntries = Object.entries(ts.statBonuses).filter(([, v]) => v && v > 0);

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-void/95 backdrop-blur-md p-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gold/10 blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple/10 blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
        <div className="relative z-10 w-full max-w-lg bg-abyss/95 border border-gold/30 rounded-2xl p-6 shadow-2xl animate-float-up max-h-[85vh] overflow-y-auto">
          <div className="text-center mb-5">
            <div className="text-6xl mb-3">✨</div>
            <h1 className="font-display text-3xl shimmer-text font-bold mb-1">Tribulation Overcome!</h1>
            <p className="font-display text-lg" style={{ color: realmColor }}>{realmName} — {targetStage}</p>
          </div>

          <div className="bg-shadow/30 border border-gold/15 rounded-xl p-4 mb-5">
            <p className="font-body text-base text-pearl/85 leading-relaxed italic">{cinematic}</p>
          </div>

          {statEntries.length > 0 && (
            <div className="bg-jade/10 border border-jade/20 rounded-lg p-3 mb-4">
              <h4 className="font-ui text-xs text-jade mb-2">Tribulation Bonuses:</h4>
              <div className="flex flex-wrap gap-2">
                {statEntries.map(([k, v]) => (
                  <span key={k} className="font-ui text-xs px-2 py-0.5 rounded bg-jade/15 text-jade">+{v} {k.charAt(0).toUpperCase() + k.slice(1)}</span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-shadow/30 rounded-lg p-3 mb-5 max-h-28 overflow-y-auto">
            {ts.log.map((l, i) => (
              <p key={i} className={`font-ui text-[11px] leading-relaxed ${l.startsWith('💀') ? 'text-crimson' : l.startsWith('💊') ? 'text-jade' : l.startsWith('INCREDIBLE') ? 'text-gold' : 'text-silver/60'}`}>{l}</p>
            ))}
          </div>

          <button
            onClick={() => onSuccess(ts)}
            className="w-full py-3 bg-gold/20 border border-gold/40 rounded-xl text-gold font-display text-lg hover:bg-gold/30 transition-all active:scale-95"
          >
            Ascend ✨
          </button>
        </div>
      </div>
    );
  }

  // ─── FAILURE PHASE ──────────────────────────────────────────────
  if (ts.phase === 'failure') {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-void/95 backdrop-blur-md p-4">
        <div className="w-full max-w-lg bg-abyss border border-crimson/30 rounded-2xl p-6 shadow-2xl animate-float-up">
          <div className="text-center mb-5">
            <div className="text-6xl mb-3">💀</div>
            <h1 className="font-display text-3xl text-crimson font-bold mb-2">Tribulation Failed</h1>
            <p className="font-body text-lg text-silver italic">The heavens have judged you unworthy...</p>
          </div>

          <div className="bg-shadow/30 rounded-lg p-3 mb-5 max-h-40 overflow-y-auto">
            {ts.log.map((l, i) => (
              <p key={i} className={`font-ui text-[11px] leading-relaxed ${l.startsWith('💀') ? 'text-crimson font-semibold' : l.startsWith('💊') ? 'text-jade' : 'text-silver/60'}`}>{l}</p>
            ))}
          </div>

          <div className="bg-crimson/10 border border-crimson/20 rounded-lg p-3 mb-5">
            <p className="font-ui text-xs text-crimson">Wave reached: {ts.currentWave + 1}/{ts.totalWaves}</p>
            <p className="font-ui text-xs text-silver/50 mt-1">The tribulation's wrath was too much. Your body could not endure.</p>
          </div>

          <button
            onClick={() => onFailure(ts)}
            className="w-full py-3 bg-crimson/20 border border-crimson/40 rounded-xl text-crimson font-display hover:bg-crimson/30 transition-all active:scale-95"
          >
            Accept Fate...
          </button>
        </div>
      </div>
    );
  }

  // ─── BETWEEN WAVES PHASE ────────────────────────────────────────
  if (ts.phase === 'between_waves') {
    const wavesRemaining = ts.totalWaves - ts.currentWave - 1;

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-void/95 backdrop-blur-md p-4">
        <div className="w-full max-w-lg bg-abyss border border-purple/25 rounded-2xl p-6 shadow-2xl animate-float-up">
          <div className="text-center mb-4">
            <h2 className="font-display text-xl text-pearl">Wave {ts.currentWave + 1} Survived!</h2>
            <p className="font-ui text-xs text-silver/50 mt-1">{wavesRemaining} wave{wavesRemaining !== 1 ? 's' : ''} remaining</p>
          </div>

          {/* Status bars */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <div className="flex justify-between text-[10px] font-ui"><span className="text-silver/60">HP</span><span className="text-pearl">{ts.playerHp}/{ts.playerMaxHp}</span></div>
              <div className="h-2 bg-shadow rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${hpPct}%`, background: hpPct > 50 ? '#2dd4a0' : hpPct > 25 ? '#f0c040' : '#e63946' }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-ui"><span className="text-silver/60">Qi</span><span className="text-pearl">{ts.playerQi}/{ts.playerMaxQi}</span></div>
              <div className="h-2 bg-shadow rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${qiPct}%`, background: '#4488ff' }} /></div>
            </div>
          </div>

          {/* Log */}
          <div className="bg-shadow/20 rounded-lg p-2 mb-4 max-h-24 overflow-y-auto">
            {visibleLog.map((l, i) => (
              <p key={i} className={`font-ui text-[11px] leading-relaxed ${l.startsWith('💊') ? 'text-jade' : l.startsWith('INCREDIBLE') ? 'text-gold' : l.includes('HP') ? 'text-crimson/70' : 'text-silver/50'}`}>{l}</p>
            ))}
          </div>

          {/* Healing pill option */}
          {healingPills.length > 0 && !pillUsed && (
            <button
              onClick={handleUsePill}
              className="w-full py-2 mb-3 bg-jade/10 border border-jade/25 rounded-lg text-jade font-ui text-sm hover:bg-jade/20 transition-all"
            >
              💊 Use Healing Pill (+50 HP) — {healingPills.length} available
            </button>
          )}
          {pillUsed && <p className="text-jade/60 text-center font-ui text-xs mb-3">Healing pill used this round.</p>}

          <button
            onClick={handleNextWave}
            className="w-full py-3 bg-purple/20 border border-purple/40 rounded-xl text-purple font-display hover:bg-purple/30 transition-all active:scale-95"
          >
            ⚡ Face Wave {ts.currentWave + 2}
          </button>
        </div>
      </div>
    );
  }

  // ─── WAVE PHASE — ACTIVE TRIBULATION ────────────────────────────
  const wave = ts.waves[ts.currentWave];
  const waveProgress = ((ts.currentWave) / ts.totalWaves) * 100;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-void/95 backdrop-blur-md p-4 overflow-hidden">
      {/* Lightning background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-1 h-full bg-purple/20 animate-pulse" style={{ animationDuration: '0.3s' }} />
        <div className="absolute top-0 right-1/3 w-1 h-full bg-purple/15 animate-pulse" style={{ animationDuration: '0.5s', animationDelay: '0.1s' }} />
        <div className="absolute top-1/3 left-0 w-full h-1 bg-purple/10 animate-pulse" style={{ animationDuration: '0.4s', animationDelay: '0.2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-lg bg-abyss/95 border border-purple/30 rounded-2xl p-6 shadow-2xl animate-float-up">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl">🌩️</span>
            <h2 className="font-display text-2xl text-purple">Wave {wave.number} of {ts.totalWaves}</h2>
          </div>
          {/* Wave progress */}
          <div className="h-1.5 bg-shadow rounded-full overflow-hidden mb-3">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${waveProgress}%`, background: 'linear-gradient(90deg, #9966ff, #ff6688)' }} />
          </div>
          <p className="font-ui text-[10px] text-silver/40">Advancing to <span style={{ color: realmColor }}>{realmName}</span></p>
        </div>

        {/* Wave description */}
        <div className="bg-purple/10 border border-purple/20 rounded-xl p-4 mb-4">
          <p className="font-body text-sm text-pearl/80 leading-relaxed italic">{wave.description}</p>
          <div className="mt-2 font-ui text-xs text-crimson/70">
            Base damage: {wave.baseDamage}{ts.hasHeavenBead ? ` → ${Math.floor(wave.baseDamage * 0.5)} (Heaven Bead)` : ''}
            {ts.resistanceBuilt > 0 ? ` → ~${Math.max(1, Math.floor((ts.hasHeavenBead ? wave.baseDamage * 0.5 : wave.baseDamage) - ts.resistanceBuilt * 3))} (resistance)` : ''}
          </div>
        </div>

        {/* Player status */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <div className="flex justify-between text-[10px] font-ui"><span className="text-silver/60">❤️ HP</span><span className="text-pearl">{ts.playerHp}/{ts.playerMaxHp}</span></div>
            <div className="h-2.5 bg-shadow rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${hpPct}%`, background: hpPct > 50 ? '#2dd4a0' : hpPct > 25 ? '#f0c040' : '#e63946' }} /></div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-ui"><span className="text-silver/60">✨ Qi</span><span className="text-pearl">{ts.playerQi}/{ts.playerMaxQi}</span></div>
            <div className="h-2.5 bg-shadow rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${qiPct}%`, background: '#4488ff' }} /></div>
          </div>
        </div>

        {ts.resistanceBuilt > 0 && (
          <div className="text-center mb-3 font-ui text-[10px] text-purple/60">
            🛡️ Resistance built: {ts.resistanceBuilt} (reduces damage by {ts.resistanceBuilt * 3})
          </div>
        )}

        {/* Action choices */}
        <div className="space-y-2">
          <button onClick={() => handleAction('endure')}
            className="w-full p-3 bg-shadow/40 border border-mist/20 rounded-xl hover:bg-shadow/60 hover:border-pearl/20 transition-all text-left active:scale-[0.98]">
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">🛡️</span>
              <div>
                <span className="font-display text-sm text-pearl">Endure</span>
                <p className="font-ui text-[10px] text-silver/50 mt-0.5">Take full damage but build lightning resistance for future waves. Safer long-term strategy.</p>
              </div>
            </div>
          </button>

          <button onClick={() => handleAction('deflect')}
            className="w-full p-3 bg-qi-blue/5 border border-qi-blue/15 rounded-xl hover:bg-qi-blue/10 hover:border-qi-blue/30 transition-all text-left active:scale-[0.98]">
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">🌀</span>
              <div>
                <span className="font-display text-sm text-qi-blue">Deflect with Qi</span>
                <p className="font-ui text-[10px] text-silver/50 mt-0.5">Costs ~{30 + targetRealmIdx * 10} Qi. {60 + ts.wisdomBonus}% chance to reduce damage to 25%. Failure: 60% damage.</p>
              </div>
            </div>
          </button>

          <button onClick={() => handleAction('absorb')}
            className="w-full p-3 bg-gold/5 border border-gold/15 rounded-xl hover:bg-gold/10 hover:border-gold/30 transition-all text-left active:scale-[0.98]">
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">⚡</span>
              <div>
                <span className="font-display text-sm text-gold">Absorb Lightning</span>
                <p className="font-ui text-[10px] text-silver/50 mt-0.5">~{25 + Math.floor(ts.wisdomBonus * 0.5) + ts.resistanceBuilt}% success. Success: +massive stats, minimal damage. Failure: 150% damage!</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
