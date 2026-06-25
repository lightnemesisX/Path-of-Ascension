import React, { useState } from 'react';
import { GameState, RaidState } from '../game/types';
import { createRaidState, resolveDefend, resolveFlee, resolveSurrender, joinRaiderSect } from '../game/raid';
import { sfxClick, sfxHit, sfxDeath, sfxVictory, ensureAudioContext } from '../game/audio';

interface Props {
  state: GameState;
  onRaidEnd: (newState: GameState) => void;
}

export const RaidScreen: React.FC<Props> = ({ state, onRaidEnd }) => {
  const [raid, setRaid] = useState<RaidState>(() => createRaidState(state));
  const [gs, setGs] = useState(state);

  const strengthRatio = raid.playerSectStrength / Math.max(1, raid.raiderStrength);
  const strengthLabel = strengthRatio > 1.2 ? 'Favorable' : strengthRatio > 0.8 ? 'Even' : strengthRatio > 0.5 ? 'Disadvantaged' : 'Overwhelming';
  const strengthColor = strengthRatio > 1.2 ? '#2dd4a0' : strengthRatio > 0.8 ? '#f0c040' : '#e63946';

  // ─── ANNOUNCEMENT ───────────────────────────────────────────────
  if (raid.phase === 'announcement') {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-void/95 backdrop-blur-md p-4">
        <div className="w-full max-w-lg bg-abyss border border-crimson/30 rounded-2xl p-6 shadow-2xl animate-float-up">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4 animate-pulse">🏯</div>
            <h1 className="font-display text-3xl text-crimson font-bold">SECT RAID!</h1>
            <p className="font-body text-lg text-pearl/80 mt-2">{raid.raiderName} forces are attacking!</p>
          </div>

          <div className="bg-shadow/30 rounded-xl p-4 mb-5">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="font-ui text-[10px] text-silver/50 uppercase">Your Sect</div>
                <div className="font-display text-lg text-jade">{raid.playerSectStrength}</div>
                <div className="font-ui text-[10px] text-silver/40">Combined Strength</div>
              </div>
              <div>
                <div className="font-ui text-[10px] text-silver/50 uppercase">Raiders</div>
                <div className="font-display text-lg text-crimson">{raid.raiderStrength}</div>
                <div className="font-ui text-[10px] text-silver/40">{raid.raiderName}</div>
              </div>
            </div>
            <div className="mt-3 text-center">
              <span className="font-ui text-xs" style={{ color: strengthColor }}>Assessment: {strengthLabel}</span>
            </div>
          </div>

          <button onClick={() => { sfxClick(); setRaid({ ...raid, phase: 'choice' }); }} className="w-full py-3 bg-crimson/20 border border-crimson/40 rounded-xl text-crimson font-display hover:bg-crimson/30 transition-all active:scale-95">
            Face the Raid
          </button>
        </div>
      </div>
    );
  }

  // ─── CHOICE ─────────────────────────────────────────────────────
  if (raid.phase === 'choice') {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-void/95 backdrop-blur-md p-4">
        <div className="w-full max-w-lg bg-abyss border border-mist/30 rounded-2xl p-6 shadow-2xl animate-float-up">
          <div className="text-center mb-5">
            <h2 className="font-display text-2xl text-pearl">What do you do?</h2>
            <p className="font-body text-sm text-silver/60 mt-1">The {raid.raiderName} batters at the gates. Time is running out.</p>
          </div>

          <div className="space-y-3">
            <button onClick={() => {
              ensureAudioContext(); sfxHit();
              const result = resolveDefend(gs, raid);
              if (result.raid.outcome === 'defend_win') sfxVictory(); else sfxDeath();
              setRaid(result.raid);
              setGs(result.state);
            }} className="w-full p-4 bg-crimson/10 border border-crimson/25 rounded-xl hover:bg-crimson/20 transition-all text-left active:scale-[0.98]">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚔️</span>
                <div>
                  <span className="font-display text-pearl">Defend the Sect</span>
                  <p className="font-ui text-[10px] text-silver/40 mt-0.5">Join the battle. Outcome based on your realm + sect strength vs raiders.</p>
                  <p className="font-ui text-[10px] mt-1" style={{ color: strengthColor }}>Odds: {strengthLabel}</p>
                </div>
              </div>
            </button>

            <button onClick={() => {
              sfxClick();
              const result = resolveFlee(gs, raid);
              setRaid(result.raid);
              setGs(result.state);
            }} className="w-full p-4 bg-shadow/30 border border-mist/20 rounded-xl hover:bg-shadow/50 transition-all text-left active:scale-[0.98]">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🏃</span>
                <div>
                  <span className="font-display text-pearl">Flee</span>
                  <p className="font-ui text-[10px] text-silver/40 mt-0.5">Escape safely but lose sect standing. -20 reputation. Sect may fall without you.</p>
                </div>
              </div>
            </button>

            <button onClick={() => {
              sfxClick();
              const result = resolveSurrender(gs, raid);
              setRaid(result.raid);
              setGs(result.state);
            }} className="w-full p-4 bg-gold/5 border border-gold/15 rounded-xl hover:bg-gold/10 transition-all text-left active:scale-[0.98]">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🤝</span>
                <div>
                  <span className="font-display text-pearl">Surrender</span>
                  <p className="font-ui text-[10px] text-silver/40 mt-0.5">No combat. Raiders assess your worth — strong cultivators may be recruited. Weak ones... enslaved.</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── SURRENDER ASSESS (join raider offer) ───────────────────────
  if (raid.phase === 'surrender_assess' && raid.outcome === 'joined_raider') {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-void/95 backdrop-blur-md p-4">
        <div className="w-full max-w-lg bg-abyss border border-gold/30 rounded-2xl p-6 shadow-2xl animate-float-up">
          <div className="text-center mb-5">
            <div className="text-5xl mb-3">🤝</div>
            <h2 className="font-display text-2xl text-gold">An Offer</h2>
          </div>
          <div className="bg-shadow/30 rounded-xl p-4 mb-5">
            {raid.log.map((l, i) => <p key={i} className="font-body text-sm text-pearl/80 leading-relaxed mb-1">{l}</p>)}
          </div>
          <div className="space-y-2">
            <button onClick={() => {
              sfxClick();
              const ns = joinRaiderSect(gs, raid.raiderName);
              setGs(ns);
              setRaid({ ...raid, phase: 'aftermath' });
            }} className="w-full py-3 bg-gold/15 border border-gold/30 rounded-xl text-gold font-display hover:bg-gold/25 transition-all">
              Accept — Join {raid.raiderName}
            </button>
            <button onClick={() => {
              sfxClick();
              const ns = { ...gs, captured: { bySect: raid.raiderName, yearsRemaining: 3, yearsCaptured: 0 }, lastRaidYear: gs.year, log: [...gs.log, { year: gs.year, age: gs.age, text: `⛓️ Refused to join. Imprisoned by ${raid.raiderName}.`, type: 'event' as const }] };
              setGs(ns);
              setRaid({ ...raid, phase: 'aftermath', outcome: 'captured' });
            }} className="w-full py-3 bg-crimson/15 border border-crimson/30 rounded-xl text-crimson font-display hover:bg-crimson/25 transition-all">
              Refuse — Face imprisonment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── AFTERMATH ──────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-void/95 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-abyss border border-mist/30 rounded-2xl p-6 shadow-2xl animate-float-up max-h-[85vh] overflow-y-auto">
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">
            {raid.outcome === 'defend_win' ? '🏆' : raid.outcome === 'captured' || raid.outcome === 'servant' ? '⛓️' : raid.outcome === 'fled' ? '🏃' : raid.outcome === 'joined_raider' ? '🏯' : '💀'}
          </div>
          <h2 className={`font-display text-2xl ${raid.outcome === 'defend_win' ? 'text-jade' : raid.outcome === 'joined_raider' ? 'text-gold' : 'text-crimson'}`}>
            {raid.outcome === 'defend_win' ? 'Raid Repelled!' : raid.outcome === 'defend_lose' ? 'Defense Failed' : raid.outcome === 'fled' ? 'Escaped' : raid.outcome === 'captured' || raid.outcome === 'servant' ? 'Captured' : raid.outcome === 'joined_raider' ? `Joined ${raid.raiderName}` : 'Aftermath'}
          </h2>
        </div>

        <div className="bg-shadow/30 rounded-xl p-4 mb-5">
          {raid.log.map((l, i) => <p key={i} className="font-body text-sm text-pearl/80 leading-relaxed mb-1">{l}</p>)}
        </div>

        {/* Family casualties */}
        {raid.familyCaptured && (
          <div className="bg-crimson/10 border border-crimson/20 rounded-lg p-3 mb-4">
            <p className="font-ui text-xs text-crimson">⚠️ Family members were captured! Check the System panel for a rescue mission.</p>
          </div>
        )}

        {gs.sectDestroyed && (
          <div className="bg-crimson/10 border border-crimson/20 rounded-lg p-3 mb-4">
            <p className="font-ui text-xs text-crimson">💥 Your sect has been destroyed. You are now a Rogue Cultivator.</p>
            <p className="font-ui text-[10px] text-silver/40 mt-1">Rebuild requires: 200+ Reputation, 500+ SP, Core Formation realm.</p>
          </div>
        )}

        {gs.captured && (
          <div className="bg-purple/10 border border-purple/20 rounded-lg p-3 mb-4">
            <p className="font-ui text-xs text-purple">⛓️ You are now a prisoner of {gs.captured.bySect}. Each year you may attempt escape.</p>
          </div>
        )}

        <button onClick={() => onRaidEnd(gs)} className="w-full py-3 bg-shadow/40 border border-mist/20 rounded-xl text-pearl font-display hover:bg-shadow/60 transition-all active:scale-95">
          Continue
        </button>
      </div>
    </div>
  );
};
