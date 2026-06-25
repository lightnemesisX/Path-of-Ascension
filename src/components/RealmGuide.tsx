import React from 'react';
import { REALMS, REALM_COLORS, REALM_QI_THRESHOLDS, STAGES, AGE_BONUS_PER_REALM } from '../game/constants';
import { GameState } from '../game/types';
// can access hidden realm: True Immortal Late + 500+ Rep + 3 tribulations + 100+ wisdom

interface Props { state: GameState; onClose: () => void }

export const RealmGuide: React.FC<Props> = ({ state, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4" onClick={onClose}>
    <div className="w-full max-w-md bg-abyss border border-mist/30 rounded-2xl p-5 shadow-2xl animate-float-up max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-xl text-pearl">📖 Realm Guide</h2>
        <button onClick={onClose} className="text-silver/60 hover:text-pearl font-ui text-lg">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {REALMS.map((r, i) => {
          const isCurrent = i === state.realmIdx;
          const isUnlocked = i <= state.realmIdx;
          const isHidden = i === REALMS.length - 1;
          const accessible = isHidden && state.realmIdx >= 10 && state.stage === 'Late' && state.stats.reputation >= 500 && state.tribulationsSurvived >= 3 && state.stats.wisdom >= 100;
          const color = REALM_COLORS[r] || '#666';
          const thresh = REALM_QI_THRESHOLDS[i];

          return (
            <div key={r} className={`p-3 rounded-lg border transition-all ${isCurrent ? 'bg-jade/10 border-jade/30' : isUnlocked ? 'bg-shadow/30 border-mist/10' : 'bg-shadow/10 border-mist/5 opacity-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color, boxShadow: isCurrent ? `0 0 8px ${color}88` : 'none' }} />
                  <span className="font-display text-sm" style={{ color }}>{isHidden && !accessible ? '???' : r}</span>
                </div>
                {isCurrent && <span className="text-[9px] font-ui px-1.5 py-0.5 bg-jade/20 text-jade rounded">Current</span>}
              </div>
              {isUnlocked && thresh && (
                <div className="mt-1.5">
                  {STAGES.map(s => (
                    <div key={s} className="flex justify-between text-[10px] font-ui">
                      <span className="text-silver/50">{s}</span>
                      <span className="text-silver/40">{thresh[s]} Qi · Max age: +{AGE_BONUS_PER_REALM[i]}</span>
                    </div>
                  ))}
                </div>
              )}
              {isHidden && accessible && <p className="text-[10px] text-gold/60 mt-1 italic">Requirements met. The final path awaits...</p>}
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
