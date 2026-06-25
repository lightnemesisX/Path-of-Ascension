import React from 'react';
import { GameState } from '../game/types';
import { REALMS, REALM_COLORS, SECTS, ACTIONS, ACTIONS_PER_YEAR } from '../game/constants';
import { getAlignmentLabel, getAlignmentColor, getNextBreakthroughInfo, canAttemptBreakthrough, getBreakthroughChance } from '../game/engine';
import { getEffectiveLifespan, getLifespanPercent, getYearsRemaining, getAgingColor, getAgingWarning } from '../game/lifespan';

interface GameScreenProps {
  state: GameState;
  onAction: (id: string) => void;
  onEventChoice?: (i: number) => void;
  onOpenSystem: () => void;
  onOpenInventory: () => void;
  onOpenMenu: () => void;
  onOpenRealmGuide: () => void;
  onOpenCrafting: () => void;
  onOpenSocial: () => void;
  onOpenFamily: () => void;
  onAttemptBreakthrough: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ state, onAction, onOpenSystem, onOpenInventory, onOpenMenu, onOpenRealmGuide, onOpenCrafting, onOpenSocial, onOpenFamily, onAttemptBreakthrough }) => {
  const actionsLeft = ACTIONS_PER_YEAR - state.actionsThisYear; // ACTIONS_PER_YEAR = 5 (do not change)
  const realmColor = REALM_COLORS[REALMS[state.realmIdx] || 'Mortal'] || '#888';
  const alignLabel = getAlignmentLabel(state.alignment);
  const alignColor = getAlignmentColor(state.alignment);
  const hpPct = state.maxHp > 0 ? (state.hp / state.maxHp) * 100 : 0;
  const sect = SECTS[state.sectId];
  
  // Lifespan info
  const maxLife = getEffectiveLifespan(state);
  const lifePct = getLifespanPercent(state);
  const yearsLeft = getYearsRemaining(state);
  const agingColor = getAgingColor(state);
  const agingWarning = getAgingWarning(state);
  
  // Breakthrough info
  const breakthroughInfo = getNextBreakthroughInfo(state);
  const canBreakthrough = canAttemptBreakthrough(state);
  const breakthroughChance = getBreakthroughChance(state);

  const StatBar: React.FC<{ label: string; val: number; icon: string; color: string }> = ({ label, val, icon, color }) => (
    <div className="mb-1.5">
      <div className="flex justify-between items-center">
        <span className="font-ui text-[10px] text-silver/70">{icon} {label}</span>
        <span className="font-ui text-[10px] font-semibold" style={{ color }}>{val}</span>
      </div>
      <div className="h-1 bg-shadow rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, val)}%`, background: color }} /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-void">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-void/95 backdrop-blur-md border-b border-mist/10">
        <div className="max-w-7xl mx-auto px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-display text-sm text-pearl">{state.playerName}</span>
            <span className="font-display text-xs font-bold realm-badge" style={{ color: realmColor }}>{REALMS[state.realmIdx] || 'Mortal'} — {state.stage}</span>
            {sect?.tier > 0 && <span className="text-[10px] font-ui px-2 py-0.5 rounded" style={{ background: `${sect.color}22`, color: sect.color }}>{sect.name}</span>}
            <span className="text-mist/30">|</span>
            <span className="font-ui text-[10px]" style={{ color: agingColor }}>Age {state.age} · {yearsLeft} yrs left</span>
            <span className="text-mist/30">|</span>
            <span className="font-ui text-[10px]" style={{ color: alignColor }}>{alignLabel}</span>
            {state.pastLifeEchoes > 0 && <span className="text-[10px] font-ui px-1.5 py-0.5 bg-purple/15 text-purple/80 rounded">Echo x{state.pastLifeEchoes}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onOpenRealmGuide} className="px-2 py-1 bg-shadow/40 border border-mist/15 rounded text-[10px] font-ui text-silver/60 hover:text-pearl transition-all">📖</button>
            <button onClick={onOpenSystem} className="px-2 py-1 bg-shadow/40 border border-mist/15 rounded text-[10px] font-ui text-silver/60 hover:text-pearl transition-all">🤖</button>
            <button onClick={onOpenInventory} className="px-2 py-1 bg-shadow/40 border border-mist/15 rounded text-[10px] font-ui text-silver/60 hover:text-pearl transition-all">🎒</button>
            <button onClick={onOpenCrafting} className="px-2 py-1 bg-shadow/40 border border-mist/15 rounded text-[10px] font-ui text-silver/60 hover:text-pearl transition-all">⚗️</button>
            <button onClick={onOpenFamily} className="px-2 py-1 bg-shadow/40 border border-mist/15 rounded text-[10px] font-ui text-silver/60 hover:text-pearl transition-all">{state.partner ? '💕' : '👨‍👩‍👧'}</button>
            <button onClick={onOpenMenu} className="px-2 py-1 bg-shadow/40 border border-mist/15 rounded text-[10px] font-ui text-silver/60 hover:text-pearl transition-all">⚙️</button>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="max-w-7xl mx-auto p-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Left: Stats */}
          <div className="lg:col-span-3">
            <div className="bg-abyss/90 border border-mist/15 rounded-xl p-3 space-y-3">
              {/* Current Realm Display */}
              <div className="text-center border-b border-mist/10 pb-3">
                <div className="font-display text-lg font-bold realm-badge" style={{ color: realmColor }}>
                  {REALMS[state.realmIdx]}
                </div>
                <div className="font-ui text-xs text-silver/60">{state.stage} Stage</div>
                
                {/* Realm dots */}
                <div className="flex justify-center gap-1 mt-2">
                  {REALMS.slice(0, 11).map((r, i) => <div key={r} title={r} className={`w-2 h-2 rounded-full transition-all ${i <= state.realmIdx ? '' : 'opacity-20'}`} style={{ backgroundColor: i <= state.realmIdx ? REALM_COLORS[r] || '#666' : '#333', boxShadow: i === state.realmIdx ? `0 0 6px ${REALM_COLORS[r] || '#666'}88` : 'none' }} />)}
                </div>

                {/* Next Breakthrough Info */}
                {breakthroughInfo && (
                  <div className="mt-3 p-2 bg-shadow/40 rounded-lg">
                    <div className="font-ui text-[10px] text-silver/50">Next: {breakthroughInfo.nextRealm} — {breakthroughInfo.nextStage}</div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="font-ui text-[10px] text-qi-blue">{state.stats.qi} / {breakthroughInfo.targetQi} Qi</span>
                      <span className="font-ui text-[10px] text-silver/40">{Math.floor((state.stats.qi / breakthroughInfo.targetQi) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-shadow rounded-full overflow-hidden mt-1">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (state.stats.qi / breakthroughInfo.targetQi) * 100)}%`, background: `linear-gradient(90deg, ${realmColor}66, ${realmColor})` }} />
                    </div>
                    
                    {/* Breakthrough Button */}
                    {canBreakthrough && (
                      <button
                        onClick={onAttemptBreakthrough}
                        className="mt-2 w-full py-2 bg-jade/20 border border-jade/40 rounded-lg text-jade font-display text-sm hover:bg-jade/30 hover:shadow-[0_0_15px_rgba(45,212,160,0.2)] transition-all animate-pulse-glow"
                      >
                        ⚡ Attempt Breakthrough ({breakthroughChance}% chance)
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* HP */}
              <div>
                <div className="flex justify-between items-center"><span className="font-ui text-[10px] text-silver/70">❤️ HP</span><span className="font-ui text-[10px] font-semibold text-crimson">{state.hp}/{state.maxHp}</span></div>
                <div className="h-2 bg-shadow rounded-full overflow-hidden mt-0.5">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${hpPct}%`, background: hpPct > 50 ? 'linear-gradient(90deg,#2dd4a0,#4488ff)' : hpPct > 25 ? 'linear-gradient(90deg,#f0c040,#e67a33)' : '#e63946' }} />
                </div>
              </div>

              {/* Lifespan Bar */}
              <div>
                <div className="flex justify-between items-center">
                  <span className="font-ui text-[10px] text-silver/70">⏳ Lifespan</span>
                  <span className="font-ui text-[10px] font-semibold" style={{ color: agingColor }}>{state.age} / {maxLife} ({Math.floor(lifePct)}%)</span>
                </div>
                <div className="h-2 bg-shadow rounded-full overflow-hidden mt-0.5">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${lifePct}%`, background: agingColor }} />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="font-ui text-[9px]" style={{ color: agingColor }}>{yearsLeft} years remaining</span>
                  {state.lifespanBonus > 0 && <span className="font-ui text-[9px] text-jade/60">+{state.lifespanBonus} bonus</span>}
                </div>
                {agingWarning && (
                  <div className="mt-1 p-1.5 rounded bg-crimson/10 border border-crimson/20">
                    <p className="font-ui text-[9px] text-crimson leading-tight">{agingWarning}</p>
                  </div>
                )}
              </div>

              {/* Stats */}
              <StatBar label="Qi" val={state.stats.qi} icon="✨" color="#4488ff" />
              <StatBar label="Strength" val={state.stats.strength} icon="⚔️" color="#e63946" />
              <StatBar label="Intelligence" val={state.stats.intelligence} icon="📚" color="#9966ff" />
              <StatBar label="Luck" val={state.stats.luck} icon="🍀" color="#f0c040" />
              <StatBar label="Reputation" val={state.stats.reputation} icon="👑" color="#2dd4a0" />
              {state.realmIdx >= 2 && <StatBar label="Wisdom" val={state.stats.wisdom} icon="🔮" color="#ff88cc" />}
              <StatBar label="Charm" val={state.stats.charm} icon="💎" color="#88ccff" />
              <StatBar label="Smithing" val={state.stats.smithing} icon="🔨" color="#cc9966" />
              <StatBar label="Alchemy" val={state.stats.alchemy} icon="⚗️" color="#66cc88" />

              {/* Resources */}
              <div className="border-t border-mist/10 pt-2 space-y-1">
                <div className="flex justify-between font-ui text-[10px]"><span className="text-silver/50">🌿 Herbs</span><span className="text-pearl">{state.herbs}</span></div>
                <div className="flex justify-between font-ui text-[10px]"><span className="text-silver/50">⛏️ Ore</span><span className="text-pearl">{state.ores}</span></div>
                <div className="flex justify-between font-ui text-[10px]"><span className="text-silver/50">🤖 SP</span><span className="text-jade">{state.systemPoints}</span></div>
              </div>

              {/* Techniques */}
              {state.techniques.length > 0 && (
                <div className="border-t border-mist/10 pt-2">
                  <div className="font-ui text-[10px] text-silver/50 mb-1">Techniques</div>
                  <div className="flex flex-wrap gap-1">
                    {state.techniques.map(t => <span key={t} className="text-[9px] font-ui px-1.5 py-0.5 bg-qi-blue/10 text-qi-blue/80 rounded">{t}</span>)}
                  </div>
                </div>
              )}

              {/* NPCs */}
              {state.npcs.length > 0 && (
                <div className="border-t border-mist/10 pt-2">
                  <div className="font-ui text-[10px] text-silver/50 mb-1">NPCs ({state.npcs.length})</div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {state.npcs.slice(-5).map(npc => (
                      <div key={npc.id} className="flex items-center justify-between text-[10px]">
                        <span className="text-pearl/70">{npc.name}</span>
                        <span className="text-silver/40">{npc.relationship > 0 ? '🤝' : npc.relationship < 0 ? '⚔️' : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Actions + Chronicle */}
          <div className="lg:col-span-5 space-y-3">
            {/* Action panel */}
            <div className="bg-abyss/90 border border-mist/15 rounded-xl p-3">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-display text-base text-pearl">Actions</h3>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: ACTIONS_PER_YEAR }).map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < actionsLeft ? 'bg-jade shadow-[0_0_4px_rgba(45,212,160,0.4)]' : 'bg-transparent border border-mist/30'}`} />)}
                  <span className="font-ui text-[10px] text-silver/50 ml-1">{actionsLeft} left</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {ACTIONS.map(a => (
                  <button 
                    key={a.id} 
                    onClick={() => a.id === 'socialize' ? onOpenSocial() : onAction(a.id)} 
                    disabled={actionsLeft <= 0 || !state.alive}
                    className={`text-left p-2.5 bg-shadow/30 border border-mist/10 rounded-lg hover:bg-shadow hover:border-jade/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97] ${a.id === 'socialize' ? 'border-purple/20' : ''}`}
                  >
                    <div className="flex items-center gap-1.5"><span className="text-sm">{a.icon}</span><span className="font-display text-xs text-pearl">{a.name}</span></div>
                    <p className="font-ui text-[9px] text-silver/40 mt-0.5">{a.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Latest event */}
            {state.log.length > 0 && (
              <div className="bg-abyss/90 border border-mist/15 rounded-xl p-3">
                <h3 className="font-display text-sm text-silver/50 mb-1">Latest</h3>
                <p className="font-body text-sm text-pearl/80">{state.log[state.log.length - 1].text}</p>
              </div>
            )}

            {/* Chronicle (Event Log) */}
            <div className="bg-abyss/90 border border-mist/15 rounded-xl p-3" style={{ maxHeight: '300px' }}>
              <h3 className="font-display text-sm text-pearl mb-2">Chronicle</h3>
              <div className="overflow-y-auto space-y-1 pr-1" style={{ maxHeight: '250px' }}>
                {[...state.log].reverse().map((e, i) => (
                  <div key={i} className={`text-sm ${e.type === 'realm' ? 'text-jade text-center py-1 font-semibold' : e.type === 'death' ? 'text-crimson text-center py-1' : e.type === 'system' ? 'text-silver/40 text-center text-xs italic' : e.type === 'system_msg' ? 'text-gold/80 text-xs' : e.type === 'combat' ? 'text-crimson/80' : 'text-pearl/70'}`}>
                    {e.type !== 'system' && e.type !== 'realm' && e.type !== 'death' && <span className="font-ui text-[9px] text-silver/30 mr-1">Y{e.year}</span>}
                    {e.text}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: NPC & Social */}
          <div className="lg:col-span-4">
            <div className="bg-abyss/90 border border-mist/15 rounded-xl p-3 space-y-3">
              <h3 className="font-display text-base text-pearl">Social</h3>
              {state.npcs.length === 0 ? (
                <p className="text-silver/40 font-body text-sm italic text-center py-4">Socialize to meet new people. NPCs appear each year.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {state.npcs.filter(n => n.alive).slice(-8).reverse().map(npc => (
                    <div key={npc.id} className="bg-shadow/30 border border-mist/10 rounded-lg p-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-display text-sm text-pearl">{npc.name}</span>
                          <span className="font-ui text-[9px] text-silver/40 ml-1">{npc.gender === 'female' ? '♀' : '♂'}</span>
                        </div>
                        <span className={`text-[9px] font-ui px-1.5 py-0.5 rounded ${npc.personality === 'friendly' || npc.personality === 'loyal' ? 'bg-jade/10 text-jade' : npc.personality === 'arrogant' || npc.personality === 'deceitful' ? 'bg-crimson/10 text-crimson' : 'bg-mist/10 text-silver/60'}`}>{npc.personality}</span>
                      </div>
                      <p className="font-ui text-[10px] text-silver/50 mt-0.5">{npc.bio}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-ui text-[9px] text-silver/40">Rel:</span>
                        <div className="flex-1 h-1 bg-shadow rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(npc.relationship + 100) / 2}%`, background: npc.relationship > 0 ? '#2dd4a0' : '#e63946' }} />
                        </div>
                        <span className="font-ui text-[9px] text-pearl/60">{npc.relationship}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
