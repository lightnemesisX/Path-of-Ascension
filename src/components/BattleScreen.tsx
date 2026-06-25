import React, { useState, useMemo } from 'react';
import { GameState, BattleState } from '../game/types';
import { REALMS, REALM_COLORS, SECTS } from '../game/constants';
import {
  generateEnemy, createBattleState, attemptRetreat, attemptBattleRetreat,
  playerAttack, playerUseTechnique, playerUseWeapon, playerUseItem,
  enemyTurn, advanceTurn,
} from '../game/combat';
import { sfxClick, sfxHit, sfxVictory, sfxDeath, sfxFail, sfxItemReceived, sfxPop, sfxFlee, ensureAudio } from '../game/audio';

interface Props {
  state: GameState;
  onBattleEnd: (result: 'victory' | 'defeat' | 'stalemate' | 'fled', bs: BattleState) => void;
  onTame: (bs: BattleState) => void;
  forceEnemy?: ReturnType<typeof generateEnemy>;
}

const KIND_LABELS: Record<string, { label: string; color: string }> = {
  bandit: { label: 'Bandit', color: '#aa6644' },
  assassin: { label: 'Assassin', color: '#8844aa' },
  rogue_cultivator: { label: 'Rogue Cultivator', color: '#4466aa' },
  beast: { label: 'Spirit Beast', color: '#44aa66' },
  boss: { label: '💀 BOSS', color: '#e63946' },
};

export const BattleScreen: React.FC<Props> = ({ state, onBattleEnd, onTame, forceEnemy }) => {
  const enemy = useMemo(() => forceEnemy || generateEnemy(state.realmIdx, state.stage), []);
  const [bs, setBs] = useState<BattleState>(() => createBattleState(state, enemy));
  const [showItemPanel, setShowItemPanel] = useState(false);

  // Derived values
  const weaponItem = state.inventory.find(i => i.id === state.equippedWeapon);
  const armorItem = state.inventory.find(i => i.id === state.equippedArmor);
  const weaponBonus = weaponItem?.statBonus?.strength || 0;
  const armorDef = armorItem?.statBonus?.strength || 0;
  const technique = state.techniques[0] || null;
  const sectTech = SECTS[state.sectId]?.uniqueTechnique;
  const activeTechnique = technique || sectTech || null;
  const usableItems = state.inventory.filter(i => i.type === 'pill');
  const kindInfo = KIND_LABELS[bs.enemy.kind] || { label: 'Enemy', color: '#888' };
  const eRealmColor = REALM_COLORS[REALMS[bs.enemy.realmIdx]] || '#888';
  const hpPct = bs.playerMaxHp > 0 ? (bs.playerHp / bs.playerMaxHp) * 100 : 0;
  const eHpPct = bs.enemy.maxHp > 0 ? (bs.enemy.hp / bs.enemy.maxHp) * 100 : 0;
  const qiPct = bs.playerMaxQi > 0 ? (bs.playerQi / bs.playerMaxQi) * 100 : 0;
  const visibleLog = bs.log.slice(-5);

  // Helper to run player action then enemy turn then check round
  const doPlayerAction = (actionFn: (b: BattleState) => BattleState) => {
    ensureAudio();
    sfxHit(); // Player attacks
    let next = actionFn(bs);
    if (next.phase === 'victory' || next.phase === 'tame_prompt') {
      sfxVictory();
      setBs(next);
      return;
    }
    if (next.phase === 'defeat') {
      sfxDeath();
      setBs(next);
      return;
    }
    if (next.phase !== 'encounter' && next.phase !== 'player_turn') {
      setBs(next);
      return;
    }
    // Enemy turn
    next = { ...next, phase: 'enemy_turn' };
    next = enemyTurn(next, armorDef, state.tamedBeast);
    if (next.phase === 'defeat') {
      sfxDeath();
      setBs(next);
      return;
    }
    // Advance turn
    next = advanceTurn(next);
    if (next.phase === 'stalemate') {
      sfxFail();
      setBs(next);
      return;
    }
    next = { ...next, phase: 'player_turn' };
    sfxHit(); // Enemy hit sound
    setBs(next);
  };

  // ─── ENCOUNTER SCREEN ──────────────────────────────────────────
  if (bs.phase === 'encounter') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-md p-4">
        <div className="w-full max-w-md bg-abyss border border-mist/30 rounded-2xl p-6 shadow-2xl animate-float-up">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">{bs.enemy.icon}</div>
            <span className="font-ui text-xs px-2 py-0.5 rounded" style={{ background: `${kindInfo.color}22`, color: kindInfo.color }}>
              {kindInfo.label}
            </span>
            <h2 className="font-display text-2xl text-pearl mt-2">{bs.enemy.name}</h2>
            <p className="font-ui text-xs mt-1" style={{ color: eRealmColor }}>
              {REALMS[bs.enemy.realmIdx]} — {bs.enemy.stage}
            </p>
            <p className="font-body text-sm text-silver/70 mt-3 italic">{bs.enemy.description}</p>
          </div>

          <div className="bg-shadow/30 rounded-lg p-3 mb-5 text-center">
            <div className="grid grid-cols-3 gap-2 font-ui text-xs">
              <div><span className="text-silver/50">HP</span><br/><span className="text-pearl">{bs.enemy.maxHp}</span></div>
              <div><span className="text-silver/50">ATK</span><br/><span className="text-crimson">{bs.enemy.attack}</span></div>
              <div><span className="text-silver/50">DEF</span><br/><span className="text-qi-blue">{bs.enemy.defense}</span></div>
            </div>
            {bs.enemy.kind === 'boss' && <p className="text-crimson text-[10px] mt-2 font-ui">⚠ Bosses attack TWICE per turn</p>}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { sfxClick(); setBs({ ...bs, phase: 'player_turn', log: [{ text: `── Round 1 ──`, actor: 'system' }, { text: `You engage ${bs.enemy.name}!`, actor: 'system' }] }); }}
              className="flex-1 py-3 bg-crimson/20 border border-crimson/40 rounded-xl text-crimson font-display hover:bg-crimson/30 transition-all active:scale-95"
            >
              ⚔️ Engage
            </button>
            <button
              onClick={() => {
                sfxFlee(); // Whoosh sound on retreat
                const result = attemptRetreat(bs, state.stats.luck + state.realmIdx * 3);
                if (result.phase === 'fled') sfxItemReceived();
                else if (result.phase === 'defeat') sfxDeath();
                else sfxFail();
                setBs(result);
              }}
              className="flex-1 py-3 bg-shadow/40 border border-mist/20 rounded-xl text-silver font-display hover:bg-shadow/60 transition-all active:scale-95"
            >
              🏃 Retreat
            </button>
          </div>
          <p className="text-center font-ui text-[10px] text-silver/30 mt-2">Retreat: ~{Math.min(90, Math.max(10, 40 + (state.stats.luck + state.realmIdx * 3 - bs.enemy.speed) * 2))}% success</p>
        </div>
      </div>
    );
  }

  // ─── OUTCOME SCREENS ───────────────────────────────────────────
  if (bs.phase === 'victory' || bs.phase === 'defeat' || bs.phase === 'stalemate' || bs.phase === 'fled' || bs.phase === 'tame_prompt') {
    const isVictory = bs.phase === 'victory' || bs.phase === 'tame_prompt';
    const isDefeat = bs.phase === 'defeat';
    const isStalemate = bs.phase === 'stalemate';
    const isFled = bs.phase === 'fled';
    const isTamePrompt = bs.phase === 'tame_prompt';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-md p-4">
        <div className="w-full max-w-md bg-abyss border border-mist/30 rounded-2xl p-6 shadow-2xl animate-float-up max-h-[85vh] overflow-y-auto">
          <div className="text-center mb-4">
            <div className="text-5xl mb-2">{isVictory ? '🏆' : isDefeat ? '💀' : isFled ? '🏃' : '⚖️'}</div>
            <h2 className={`font-display text-2xl ${isVictory ? 'text-jade' : isDefeat ? 'text-crimson' : 'text-gold'}`}>
              {isVictory ? 'Victory!' : isDefeat ? 'Defeated!' : isFled ? 'Escaped!' : 'Stalemate!'}
            </h2>
            <p className="text-pearl/60 font-ui text-xs mt-1">vs {bs.enemy.name} ({REALMS[bs.enemy.realmIdx]} — {bs.enemy.stage})</p>
          </div>

          {/* Battle Log */}
          <div className="bg-shadow/30 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
            {bs.log.slice(-6).map((l, i) => (
              <p key={i} className={`font-ui text-xs ${l.actor === 'player' ? 'text-jade/80' : l.actor === 'enemy' ? 'text-crimson/80' : 'text-silver/50'}`}>
                {l.text}
              </p>
            ))}
          </div>

          {/* Rewards (victory) */}
          {isVictory && (
            <div className="bg-jade/10 border border-jade/20 rounded-lg p-3 mb-4">
              <h4 className="font-ui text-xs text-jade mb-2">Rewards:</h4>
              <div className="font-ui text-xs text-pearl space-y-0.5">
                {bs.statRewards.qi && <p>+{bs.statRewards.qi} Qi</p>}
                {bs.statRewards.strength && <p>+{bs.statRewards.strength} Strength</p>}
                {bs.statRewards.reputation && <p>+{bs.statRewards.reputation} Reputation</p>}
                <p>+{bs.spReward} System Points</p>
                {bs.lootGained.length > 0 && <p>Loot: {bs.lootGained.join(', ')}</p>}
              </div>
            </div>
          )}

          {/* Losses (defeat) */}
          {isDefeat && (
            <div className="bg-crimson/10 border border-crimson/20 rounded-lg p-3 mb-4">
              <h4 className="font-ui text-xs text-crimson mb-1">Consequences:</h4>
              <p className="font-ui text-xs text-pearl">HP reduced to critical · Lost a random item · -3 Reputation</p>
            </div>
          )}

          {/* Tame option */}
          {isTamePrompt && (
            <div className="bg-jade/10 border border-jade/30 rounded-lg p-3 mb-4">
              <h4 className="font-display text-sm text-jade mb-2">🐾 Taming Opportunity!</h4>
              <p className="font-ui text-xs text-pearl/80 mb-2">The weakened {bs.enemy.name} could be tamed as a companion.</p>
              {state.tamedBeast && <p className="font-ui text-[10px] text-gold mb-2">⚠ Current companion ({state.tamedBeast.name}) will be released.</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => onTame(bs)}
                  className="flex-1 py-2 bg-jade/20 border border-jade/40 rounded-lg text-jade font-ui text-sm hover:bg-jade/30 transition-all"
                >
                  🐾 Attempt Tame
                </button>
                <button
                  onClick={() => setBs({ ...bs, phase: 'victory' })}
                  className="flex-1 py-2 bg-shadow/40 border border-mist/20 rounded-lg text-silver font-ui text-sm hover:bg-shadow/60 transition-all"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {!isTamePrompt && (
            <button
              onClick={() => onBattleEnd(bs.phase as 'victory' | 'defeat' | 'stalemate' | 'fled', bs)}
              className="w-full py-3 bg-shadow/40 border border-mist/20 rounded-xl text-pearl font-display hover:bg-shadow/60 transition-all"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── BATTLE SCREEN (player_turn / enemy_turn) ──────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/95 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-abyss border border-mist/30 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-shadow/50 px-4 py-2 flex justify-between items-center border-b border-mist/10">
          <span className="font-display text-sm text-pearl">⚔️ Combat</span>
          <span className="font-ui text-xs text-silver/50">Round {bs.turn}/{bs.maxTurns}</span>
        </div>

        {/* Combatants */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Player */}
            <div className="bg-shadow/30 rounded-xl p-3 border border-jade/10">
              <div className="font-display text-sm text-jade mb-2">{state.playerName}</div>
              <div className="font-ui text-[10px] text-silver/50 mb-2">{REALMS[state.realmIdx]} — {state.stage}</div>
              {/* HP Bar */}
              <div className="mb-1.5">
                <div className="flex justify-between text-[10px] font-ui"><span className="text-silver/60">HP</span><span className="text-pearl">{bs.playerHp}/{bs.playerMaxHp}</span></div>
                <div className="h-2 bg-shadow rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-300" style={{ width: `${hpPct}%`, background: hpPct > 50 ? '#2dd4a0' : hpPct > 25 ? '#f0c040' : '#e63946' }} /></div>
              </div>
              {/* Qi Bar */}
              <div>
                <div className="flex justify-between text-[10px] font-ui"><span className="text-silver/60">Qi</span><span className="text-pearl">{bs.playerQi}/{bs.playerMaxQi}</span></div>
                <div className="h-2 bg-shadow rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-300" style={{ width: `${qiPct}%`, background: '#4488ff' }} /></div>
              </div>
              {state.tamedBeast && <div className="font-ui text-[10px] text-jade/60 mt-1">{state.tamedBeast.icon} {state.tamedBeast.name} ({state.tamedBeast.buffLabel})</div>}
              {bs.playerStunned && <div className="font-ui text-[10px] text-gold mt-1">⚡ STUNNED</div>}
              {bs.poisonDamage > 0 && <div className="font-ui text-[10px] text-purple mt-1">☠ Poisoned ({bs.poisonDamage}/turn)</div>}
            </div>

            {/* Enemy */}
            <div className="bg-shadow/30 rounded-xl p-3 border border-crimson/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{bs.enemy.icon}</span>
                <div>
                  <div className="font-display text-sm text-crimson">{bs.enemy.name}</div>
                  <div className="font-ui text-[10px]" style={{ color: eRealmColor }}>{REALMS[bs.enemy.realmIdx]} — {bs.enemy.stage}</div>
                </div>
              </div>
              {/* HP Bar */}
              <div>
                <div className="flex justify-between text-[10px] font-ui"><span className="text-silver/60">HP</span><span className="text-pearl">{bs.enemy.hp}/{bs.enemy.maxHp}</span></div>
                <div className="h-2 bg-shadow rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-300" style={{ width: `${eHpPct}%`, background: '#e63946' }} /></div>
              </div>
              <div className="font-ui text-[10px] text-silver/40 mt-1">Special: {bs.enemy.specialAbility}</div>
              {bs.enemyStunned && <div className="font-ui text-[10px] text-gold mt-1">⚡ STUNNED</div>}
            </div>
          </div>

          {/* Combat Log */}
          <div className="bg-shadow/20 rounded-lg p-2 mb-4 h-24 overflow-y-auto">
            {visibleLog.map((l, i) => (
              <p key={i} className={`font-ui text-[11px] leading-relaxed ${l.actor === 'player' ? 'text-jade/80' : l.actor === 'enemy' ? 'text-crimson/80' : 'text-silver/50 italic'}`}>
                {l.text}
              </p>
            ))}
            {visibleLog.length === 0 && <p className="font-ui text-xs text-silver/30 italic text-center py-3">Battle begins...</p>}
          </div>

          {/* Player Actions */}
          {showItemPanel ? (
            <div className="space-y-1.5">
              <h4 className="font-ui text-xs text-silver/60">Use an item:</h4>
              <div className="max-h-28 overflow-y-auto space-y-1">
                {usableItems.length === 0 && <p className="font-ui text-xs text-silver/40 italic">No usable items.</p>}
                {usableItems.map(item => (
                  <button key={item.id} onClick={() => {
                    const hpR = item.name.toLowerCase().includes('heal') ? rand(20, 50) : (item.statBonus?.qi ? 0 : 0);
                    const qiR = item.statBonus?.qi || 0;
                    const hpRestore = hpR || (item.name.toLowerCase().includes('heal') ? 30 : 0);
                    sfxPop(); // Pill consumed sound
                    doPlayerAction(b => playerUseItem(b, item.name, hpRestore, qiR));
                    setShowItemPanel(false);
                  }} className="w-full text-left p-2 bg-shadow/30 rounded border border-mist/10 hover:bg-shadow/50 transition-all">
                    <span className="font-ui text-xs text-pearl">{item.name}</span>
                    <span className="font-ui text-[10px] text-silver/40 ml-2">{item.quality}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowItemPanel(false)} className="font-ui text-xs text-silver/50 hover:text-pearl">Cancel</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => doPlayerAction(b => playerAttack(b, state.stats.strength, state.tamedBeast))}
                className="p-2.5 bg-crimson/10 border border-crimson/20 rounded-lg hover:bg-crimson/20 transition-all text-left active:scale-95">
                <span className="text-sm">⚔️</span><span className="font-display text-xs text-crimson ml-1.5">Attack</span>
                <p className="font-ui text-[9px] text-silver/40 mt-0.5">STR-based strike</p>
              </button>

              <button onClick={() => {
                if (!activeTechnique) return;
                doPlayerAction(b => playerUseTechnique(b, state.stats.strength, state.stats.qi, activeTechnique, state.tamedBeast));
              }} disabled={!activeTechnique}
                className="p-2.5 bg-qi-blue/10 border border-qi-blue/20 rounded-lg hover:bg-qi-blue/20 transition-all text-left disabled:opacity-30 disabled:cursor-not-allowed active:scale-95">
                <span className="text-sm">🌀</span><span className="font-display text-xs text-qi-blue ml-1.5">Technique</span>
                <p className="font-ui text-[9px] text-silver/40 mt-0.5">{activeTechnique ? `${activeTechnique} (Qi cost)` : 'None learned'}</p>
              </button>

              <button onClick={() => {
                if (!weaponItem) return;
                doPlayerAction(b => playerUseWeapon(b, state.stats.strength, weaponBonus, weaponItem.name, state.tamedBeast));
              }} disabled={!weaponItem}
                className="p-2.5 bg-gold/10 border border-gold/20 rounded-lg hover:bg-gold/20 transition-all text-left disabled:opacity-30 disabled:cursor-not-allowed active:scale-95">
                <span className="text-sm">🗡️</span><span className="font-display text-xs text-gold ml-1.5">Weapon</span>
                <p className="font-ui text-[9px] text-silver/40 mt-0.5">{weaponItem?.name || 'None equipped'}</p>
              </button>

              <button onClick={() => setShowItemPanel(true)}
                className="p-2.5 bg-jade/10 border border-jade/20 rounded-lg hover:bg-jade/20 transition-all text-left active:scale-95">
                <span className="text-sm">💊</span><span className="font-display text-xs text-jade ml-1.5">Use Item</span>
                <p className="font-ui text-[9px] text-silver/40 mt-0.5">{usableItems.length} available</p>
              </button>

              <button onClick={() => {
                sfxFlee(); // Whoosh sound on retreat attempt
                const result = attemptBattleRetreat(bs, state.stats.luck + state.realmIdx * 3);
                setBs(result);
              }} className="col-span-2 p-2 bg-shadow/30 border border-mist/15 rounded-lg hover:bg-shadow/50 transition-all text-center active:scale-95">
                <span className="text-sm">🏃</span><span className="font-display text-xs text-silver ml-1.5">Retreat (50% chance)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function rand(a: number, b: number) { return Math.floor(Math.random() * (b - a + 1)) + a; }
