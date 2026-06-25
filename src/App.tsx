import { useState, useCallback, useEffect } from 'react';
import { GameState, Background, Gender, SectId, BattleState, TribulationState } from './game/types';
import { createNewGame, performAction, loadGame, hasSave, clearSave, reincarnate, saveGame, attemptBreakthrough, getNextBreakthroughInfo, canAttemptBreakthrough, getBreakthroughChance, consumeAction } from './game/engine';
import { REALMS, STAGES } from './game/constants';
import { MainMenu } from './components/MainMenu';
import { CharacterCreation } from './components/CharacterCreation';
import { Tutorial } from './components/Tutorial';
import { GameScreen } from './components/GameScreen';
import { SystemPanel } from './components/SystemPanel';
import { InventoryPanel } from './components/InventoryPanel';
import { RealmGuide } from './components/RealmGuide';
import { NPCInteraction } from './components/NPCInteraction';
import { BattleScreen } from './components/BattleScreen';
import { ExploreEventComponent } from './components/ExploreEvent';
import { AudioControls } from './components/AudioControls';
import { TribulationScreen } from './components/TribulationScreen';
import { FamilyPanel } from './components/FamilyPanel';
import { RaidScreen } from './components/RaidScreen';
import { attemptTame, generateEnemy } from './game/combat';
import { updateMissionProgress } from './game/system';
import { generateExploreEvent, ExploreEvent, ExploreOutcome } from './game/explore';
import { requiresTribulation } from './game/tribulation';
import { shouldTriggerRaid } from './game/raid';
import { sfxClick, sfxBreakthrough, sfxDeath, sfxVictory, sfxItemReceived, sfxYearAdvance, ensureAudioContext } from './game/audio';

type Phase = 'menu' | 'creation' | 'tutorial' | 'playing' | 'gameover' | 'victory' | 'reincarnate';

export default function App() {
  const [gs, setGs] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<Phase>('menu');
  const [has, setHas] = useState(false);
  const [showSystem, setShowSystem] = useState(false);
  const [showInv, setShowInv] = useState(false);
  const [showRealm, setShowRealm] = useState(false);
  const [showCraft, setShowCraft] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showBattle, setShowBattle] = useState(false);
  const [battleForceKind, setBattleForceKind] = useState<string | null>(null);
  const [exploreEvent, setExploreEvent] = useState<ExploreEvent | null>(null);
  const [tribulation, setTribulation] = useState<{ targetRealmIdx: number; targetStage: string } | null>(null);
  const [showFamily, setShowFamily] = useState(false);
  const [showRaid, setShowRaid] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setHas(hasSave()); }, []);

  const act = useCallback((fn: (s: GameState) => GameState) => {
    setGs(prev => {
      if (!prev) return prev;
      const ns = fn(prev);
      // Sound effects for phase transitions
      if (ns.phase === 'reincarnate' && prev.phase !== 'reincarnate') {
        sfxDeath();
        setTimeout(() => setPhase('reincarnate'), 500);
      }
      if (ns.phase === 'victory' && prev.phase !== 'victory') {
        sfxVictory();
        setTimeout(() => setPhase('victory'), 500);
      }
      // Breakthrough sound
      if (ns.realmIdx > prev.realmIdx || (ns.realmIdx === prev.realmIdx && ns.stage !== prev.stage)) {
        sfxBreakthrough();
      }
      // Year advance sound + raid check
      if (ns.year > prev.year) {
        sfxYearAdvance();
        // Check for sect raid on year advance
        if (shouldTriggerRaid(ns)) {
          setTimeout(() => setShowRaid(true), 600);
        }
      }
      return ns;
    });
  }, []);

  const doAction = useCallback((id: string) => {
    ensureAudioContext();
    sfxClick();
    if (id === 'fight') {
      setBattleForceKind(null);
      setShowBattle(true);
      return;
    }
    if (id === 'explore') {
      setGs(prev => {
        if (!prev) return prev;
        const evt = generateExploreEvent(prev);
        setExploreEvent(evt);
        return prev;
      });
      return;
    }
    act(s => performAction(s, id));
  }, [act]);

  const handleBattleEnd = useCallback((result: string, bs: BattleState) => {
    setShowBattle(false);
    if (result === 'victory') sfxVictory();
    else if (result === 'defeat') sfxDeath();
    setGs(prev => {
      if (!prev) return prev;
      let s = { ...prev, hp: Math.max(0, bs.playerHp) };
      // Use consumeAction to increment + trigger year advance if at 5 — ACTIONS_PER_YEAR = 5 (do not change)
      s = consumeAction(s, 'fight');

      if (result === 'victory') {
        sfxItemReceived();
        // Apply stat rewards
        const sr = bs.statRewards;
        const st = { ...s.stats };
        for (const [k, v] of Object.entries(sr)) { if (v) st[k as keyof typeof st] += v; }
        s = { ...s, stats: st, systemPoints: s.systemPoints + bs.spReward };
        s.log = [...s.log, { year: s.year, age: s.age, text: `🏆 Victory vs ${bs.enemy.name}! +${sr.qi || 0} Qi, +${sr.strength || 0} STR, +${bs.spReward} SP.`, type: 'combat' as const }];
      } else if (result === 'defeat') {
        const repLoss = 3;
        s = { ...s, stats: { ...s.stats, reputation: Math.max(0, s.stats.reputation - repLoss) } };
        // Lose a random non-weapon non-armor item
        const loseableItems = s.inventory.filter(i => i.type !== 'weapon' && i.type !== 'armor');
        if (loseableItems.length > 0) {
          const lostItem = loseableItems[Math.floor(Math.random() * loseableItems.length)];
          s = { ...s, inventory: s.inventory.filter(i => i.id !== lostItem.id) };
          s.log = [...s.log, { year: s.year, age: s.age, text: `💀 Defeated by ${bs.enemy.name}! Lost ${lostItem.name}. -${repLoss} reputation.`, type: 'combat' as const }];
        } else {
          s.log = [...s.log, { year: s.year, age: s.age, text: `💀 Defeated by ${bs.enemy.name}! -${repLoss} reputation.`, type: 'combat' as const }];
        }
        if (s.hp <= 0) {
          s = { ...s, alive: false, phase: 'reincarnate' };
          s.log = [...s.log, { year: s.year, age: s.age, text: `💀 You have fallen in combat...`, type: 'death' as const }];
          setTimeout(() => setPhase('reincarnate'), 500);
        }
      } else if (result === 'stalemate') {
        s.log = [...s.log, { year: s.year, age: s.age, text: `⚖️ Stalemate with ${bs.enemy.name}. Both sides retreat.`, type: 'combat' as const }];
      } else {
        s.log = [...s.log, { year: s.year, age: s.age, text: `🏃 Fled from ${bs.enemy.name}.`, type: 'combat' as const }];
      }
      return s;
    });
  }, []);

  const handleTame = useCallback((bs: BattleState) => {
    setGs(prev => {
      if (!prev) return prev;
      const hasTamingScroll = prev.inventory.some(i => i.name.toLowerCase().includes('taming'));
      const result = attemptTame(bs, prev.stats.luck, hasTamingScroll);
      let s = { ...prev, hp: Math.max(1, bs.playerHp) };
      // Use consumeAction to increment + trigger year advance if at 5 — ACTIONS_PER_YEAR = 5 (do not change)
      s = consumeAction(s, 'fight');
      // Apply stat rewards
      const sr = bs.statRewards;
      const st = { ...s.stats };
      for (const [k, v] of Object.entries(sr)) { if (v) st[k as keyof typeof st] += v; }
      s = { ...s, stats: st, systemPoints: s.systemPoints + bs.spReward };

      if (result.success && result.beast) {
        // Consume taming scroll if used
        if (hasTamingScroll) {
          const scrollIdx = s.inventory.findIndex(i => i.name.toLowerCase().includes('taming'));
          if (scrollIdx >= 0) s.inventory = s.inventory.filter((_, idx) => idx !== scrollIdx);
        }
        s = { ...s, tamedBeast: result.beast };
        s.log = [...s.log, { year: s.year, age: s.age, text: `🐾 Tamed ${result.beast.name}! It provides ${result.beast.buffLabel}.`, type: 'event' as const }];
      } else {
        s.log = [...s.log, { year: s.year, age: s.age, text: `🐾 Taming failed! The ${bs.enemy.name} escapes.`, type: 'event' as const }];
      }
      return s;
    });
    setShowBattle(false);
  }, []);

  const handleExploreResolve = useCallback((outcome: ExploreOutcome, finalState: GameState) => {
    setExploreEvent(null);
    setGs(() => {
      let s = { ...finalState };
      // Use consumeAction to increment + trigger year advance if at 5 — ACTIONS_PER_YEAR = 5 (do not change)
      s = consumeAction(s, 'explore');
      // Apply stat changes
      const st = { ...s.stats };
      for (const [k, v] of Object.entries(outcome.statChanges)) { if (v) st[k as keyof typeof st] += v; }
      s = { ...s, stats: st };
      s.hp = Math.max(0, Math.min(s.maxHp, s.hp + outcome.hpChange));
      s.alignment = Math.max(-100, Math.min(100, s.alignment + outcome.alignmentChange));
      s.herbs = Math.max(0, s.herbs + outcome.herbsChange);
      s.ores = Math.max(0, s.ores + outcome.oresChange);
      s.systemPoints = Math.max(0, s.systemPoints + outcome.spChange);
      if (outcome.techniqueLearned && !s.techniques.includes(outcome.techniqueLearned)) {
        s = { ...s, techniques: [...s.techniques, outcome.techniqueLearned] };
      }
      s.log = [...s.log, { year: s.year, age: s.age, text: `🗺️ Exploration: ${outcome.text.slice(0, 80)}...`, type: 'action' as const }];
      if (s.hp <= 0) {
        s = { ...s, alive: false, phase: 'reincarnate' };
        s.log = [...s.log, { year: s.year, age: s.age, text: `💀 You perish during exploration...`, type: 'death' as const }];
        setTimeout(() => setPhase('reincarnate'), 500);
      }
      return s;
    });
  }, []);

  const handleExploreBattle = useCallback((enemyKind: string) => {
    setExploreEvent(null);
    setBattleForceKind(enemyKind);
    setShowBattle(true);
    // DO NOT increment actionsThisYear here — handleBattleEnd already calls consumeAction
    // ACTIONS_PER_YEAR = 5 (do not change)
  }, []);

  // ─── BREAKTHROUGH WITH TRIBULATION CHECK ─────────────────────
  const handleBreakthrough = useCallback(() => {
    if (!gs) return;
    sfxClick();
    ensureAudioContext();
    const info = getNextBreakthroughInfo(gs);
    if (!info || !canAttemptBreakthrough(gs)) return;

    // Determine the target realm/stage after breakthrough
    const si = STAGES.indexOf(gs.stage);
    let nextRealmIdx = gs.realmIdx;
    let nextStage = gs.stage;
    if (gs.realmIdx === 0) { nextRealmIdx = 1; nextStage = 'Early'; }
    else if (si < 2) { nextStage = STAGES[si + 1]; }
    else { nextRealmIdx = gs.realmIdx + 1; nextStage = 'Early'; }

    // Check if tribulation is required
    if (requiresTribulation(nextRealmIdx, nextStage)) {
      // First do the normal breakthrough roll
      const chance = getBreakthroughChance(gs);
      if (Math.random() * 100 >= chance) {
        // Breakthrough itself failed — no tribulation
        act(attemptBreakthrough);
        return;
      }
      // Breakthrough roll succeeded — now face the tribulation
      // Consume pill if present
      setGs(prev => {
        if (!prev) return prev;
        let s = { ...prev };
        const pillIdx = s.inventory.findIndex(i => i.name.includes('Breakthrough Pill'));
        if (pillIdx >= 0) {
          s = { ...s, inventory: s.inventory.filter((_, i) => i !== pillIdx) };
          s.log = [...s.log, { year: s.year, age: s.age, text: `💊 Breakthrough Pill consumed!`, type: 'event' as const }];
        }
        return s;
      });
      setTribulation({ targetRealmIdx: nextRealmIdx, targetStage: nextStage });
    } else {
      // No tribulation needed — normal breakthrough
      act(attemptBreakthrough);
    }
  }, [gs, act]);

  const handleTribulationSuccess = useCallback((ts: TribulationState) => {
    setTribulation(null);
    sfxBreakthrough();
    setGs(prev => {
      if (!prev) return prev;
      const hpBoost = 15 + ts.targetRealmIdx * 10;
      const spGain = 10 + ts.targetRealmIdx * 5;
      let s: GameState = {
        ...prev,
        realmIdx: ts.targetRealmIdx,
        stage: ts.targetStage as GameState['stage'],
        maxHp: prev.maxHp + hpBoost,
        hp: Math.min(ts.playerHp, prev.maxHp + hpBoost),
        stats: { ...prev.stats, qi: ts.playerQi },
        totalMilestones: prev.totalMilestones + 1,
        systemPoints: prev.systemPoints + spGain,
        tribulationsSurvived: prev.tribulationsSurvived + 1,
      };
      // Apply tribulation stat bonuses
      const st = { ...s.stats };
      for (const [k, v] of Object.entries(ts.statBonuses)) { if (v) st[k as keyof typeof st] += v; }
      s = { ...s, stats: st };
      s.log = [
        ...s.log,
        { year: s.year, age: s.age, text: `⚡ TRIBULATION SURVIVED! (${prev.tribulationsSurvived + 1} total)`, type: 'realm' as const },
        { year: s.year, age: s.age, text: `✨ Advanced to ${REALMS[ts.targetRealmIdx]} — ${ts.targetStage}! +${hpBoost} Max HP, +${spGain} SP!`, type: 'realm' as const },
      ];
      // Victory check
      if (REALMS[ts.targetRealmIdx] === 'True Immortal' && ts.targetStage === 'Late') {
        s = { ...s, phase: 'victory' };
        s.log = [...s.log, { year: s.year, age: s.age, text: `🌟 TRUE IMMORTALITY ACHIEVED!`, type: 'victory' as const }];
        clearSave();
        setTimeout(() => setPhase('victory'), 500);
      }
      return s;
    });
  }, []);

  const handleTribulationFailure = useCallback((ts: TribulationState) => {
    setTribulation(null);
    sfxDeath();
    setGs(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        hp: 0,
        alive: false,
        phase: 'reincarnate',
        log: [
          ...prev.log,
          { year: prev.year, age: prev.age, text: `💀 The Heavenly Tribulation was too much. You perish under the wrath of heaven.`, type: 'death' as const },
          { year: prev.year, age: prev.age, text: `Tribulations survived: ${prev.tribulationsSurvived}`, type: 'system' as const },
        ],
      };
    });
    setTimeout(() => setPhase('reincarnate'), 500);
  }, []);

  const handleSave = useCallback(() => {
    if (gs) { saveGame(gs); setSaved(true); setTimeout(() => setSaved(false), 1500); }
  }, [gs]);

  const restart = useCallback(() => { clearSave(); setGs(null); setHas(false); setPhase('menu'); setShowSystem(false); setShowInv(false); setShowRealm(false); setShowCraft(false); setShowMenu(false); setShowBattle(false); setExploreEvent(null); setTribulation(null); }, []);

  // ─── RENDER ────────────────────────────────────────────

  if (phase === 'menu') return <><MainMenu hasSave={has} onNew={() => { sfxClick(); setPhase('creation'); }} onContinue={() => { sfxClick(); const s = loadGame(); if (s) { setGs(s); setPhase(s.phase as Phase || 'playing'); } }} /><AudioControls /></>;

  if (phase === 'creation') return <><CharacterCreation onCreate={(n: string, g: Gender, b: Background, sc: SectId) => { sfxVictory(); setGs(createNewGame(n, g, b, sc)); setPhase('tutorial'); }} onBack={() => { sfxClick(); setPhase('menu'); }} /><AudioControls /></>;

  if (phase === 'tutorial') {
    if (!gs) return null;
    return <>
      <GameScreen state={gs} onAction={doAction} onOpenSystem={() => setShowSystem(true)} onOpenInventory={() => setShowInv(true)} onOpenMenu={() => setShowMenu(true)} onOpenRealmGuide={() => setShowRealm(true)} onOpenCrafting={() => setShowCraft(true)} onOpenSocial={() => setShowSocial(true)} onOpenFamily={() => setShowFamily(true)} onAttemptBreakthrough={handleBreakthrough} />
      <Tutorial onComplete={() => { setGs(prev => prev ? { ...prev, phase: 'playing', tutorialCompleted: true } : prev); setPhase('playing'); }} />
    </>;
  }

  if (gs && (phase === 'playing' || phase === 'gameover' || phase === 'victory' || phase === 'reincarnate')) {
    return (
      <div className="relative">
        <GameScreen state={gs} onAction={doAction} onOpenSystem={() => setShowSystem(true)} onOpenInventory={() => setShowInv(true)} onOpenMenu={() => setShowMenu(true)} onOpenRealmGuide={() => setShowRealm(true)} onOpenCrafting={() => setShowCraft(true)} onOpenSocial={() => setShowSocial(true)} onOpenFamily={() => setShowFamily(true)} onAttemptBreakthrough={handleBreakthrough} />

        {/* Save indicator */}
        <div className="fixed top-14 right-20 z-50">
          {saved && <span className="text-jade font-ui text-xs bg-abyss/90 px-3 py-1.5 rounded-lg border border-jade/30 animate-fade-in">✓ Saved!</span>}
          <button onClick={handleSave} className="text-[10px] font-ui px-3 py-1.5 bg-abyss/90 border border-mist/20 rounded-lg text-silver/60 hover:text-pearl hover:border-mist/40 transition-all">💾 Save</button>
        </div>

        {/* Overlays */}
        {showSystem && <SystemPanel state={gs} onClose={() => setShowSystem(false)} onAction={setGs} />}
        {showInv && <InventoryPanel state={gs} onClose={() => setShowInv(false)} onAction={setGs} />}
        {showRealm && <RealmGuide state={gs} onClose={() => setShowRealm(false)} />}
        {showSocial && <NPCInteraction state={gs} onClose={() => setShowSocial(false)} onAction={setGs} />}
        {showBattle && <BattleScreen state={gs} onBattleEnd={handleBattleEnd} onTame={handleTame} forceEnemy={battleForceKind ? generateEnemy(gs.realmIdx, gs.stage, battleForceKind as any) : undefined} />}
        {exploreEvent && <ExploreEventComponent state={gs} event={exploreEvent} onResolve={handleExploreResolve} onTriggerBattle={handleExploreBattle} />}
        {tribulation && <TribulationScreen state={gs} targetRealmIdx={tribulation.targetRealmIdx} targetStage={tribulation.targetStage} onSuccess={handleTribulationSuccess} onFailure={handleTribulationFailure} />}
        {showFamily && <FamilyPanel state={gs} onClose={() => setShowFamily(false)} />}
        {showRaid && <RaidScreen state={gs} onRaidEnd={(ns) => { setShowRaid(false); setGs(ns); }} />}
        {showCraft && <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4" onClick={() => setShowCraft(false)}><div className="bg-abyss border border-mist/30 rounded-2xl p-6 shadow-2xl animate-float-up max-w-md" onClick={e => e.stopPropagation()}><h2 className="font-display text-xl text-pearl mb-4">⚗️ Crafting</h2><div className="space-y-3 font-ui text-sm"><div className="bg-shadow/30 p-3 rounded-lg"><p className="text-pearl">Alchemy ({gs.stats.alchemy} skill)</p><p className="text-silver/50 text-xs">Herbs: {gs.herbs} · Need 3 per craft</p>{gs.herbs >= 3 ? <button onClick={() => { setGs(prev => prev ? { ...prev, herbs: prev.herbs - 3, stats: { ...prev.stats, alchemy: prev.stats.alchemy + Math.floor(Math.random() * 5) + 3, qi: prev.stats.qi + Math.floor(Math.random() * 6) + 2 } } : prev); }} className="mt-1 px-3 py-1 bg-jade/15 text-jade text-xs rounded border border-jade/30 hover:bg-jade/25">Craft Pill (-3 herbs)</button> : <span className="text-silver/40 text-xs"> Not enough herbs</span>}</div><div className="bg-shadow/30 p-3 rounded-lg"><p className="text-pearl">Smithing ({gs.stats.smithing} skill)</p><p className="text-silver/50 text-xs">Ore: {gs.ores} · Need 2 per craft</p>{gs.ores >= 2 ? <button onClick={() => { setGs(prev => prev ? { ...prev, ores: prev.ores - 2, stats: { ...prev.stats, smithing: prev.stats.smithing + Math.floor(Math.random() * 5) + 3, strength: prev.stats.strength + Math.floor(Math.random() * 3) + 2 } } : prev); }} className="mt-1 px-3 py-1 bg-gold/15 text-gold text-xs rounded border border-gold/30 hover:bg-gold/25">Forge Weapon (-2 ore)</button> : <span className="text-silver/40 text-xs"> Not enough ore</span>}</div></div><button onClick={() => setShowCraft(false)} className="mt-4 w-full py-2 bg-mist/10 border border-mist/20 rounded-lg text-silver/60 hover:text-pearl font-ui text-sm transition-all">Close</button></div></div>}

        {/* In-game menu */}
        {showMenu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4" onClick={() => setShowMenu(false)}>
            <div className="w-full max-w-sm bg-abyss border border-mist/30 rounded-2xl p-6 shadow-2xl animate-float-up" onClick={e => e.stopPropagation()}>
              <h2 className="font-display text-xl text-pearl mb-4 text-center">⚙️ Menu</h2>
              <div className="space-y-2">
                <button onClick={() => { setShowMenu(false); setShowRealm(true); }} className="w-full py-2.5 bg-shadow/40 border border-mist/15 rounded-lg text-left px-4 text-pearl/80 hover:bg-shadow transition-all font-ui text-sm">📖 Realm Guide</button>
                <button onClick={() => { setShowMenu(false); setShowSystem(true); }} className="w-full py-2.5 bg-shadow/40 border border-mist/15 rounded-lg text-left px-4 text-pearl/80 hover:bg-shadow transition-all font-ui text-sm">🤖 System Panel</button>
                <button onClick={() => { setShowMenu(false); setShowInv(true); }} className="w-full py-2.5 bg-shadow/40 border border-mist/15 rounded-lg text-left px-4 text-pearl/80 hover:bg-shadow transition-all font-ui text-sm">🎒 Inventory</button>
                <button onClick={handleSave} className="w-full py-2.5 bg-shadow/40 border border-mist/15 rounded-lg text-left px-4 text-pearl/80 hover:bg-shadow transition-all font-ui text-sm">💾 Save Game</button>
                <button onClick={() => { setShowMenu(false); }} className="w-full py-2.5 bg-shadow/40 border border-mist/15 rounded-lg text-left px-4 text-pearl/80 hover:bg-shadow transition-all font-ui text-sm">📜 Tutorial (replay)</button>
                <div className="border-t border-mist/10 pt-2">
                  <button onClick={restart} className="w-full py-2.5 bg-crimson/10 border border-crimson/20 rounded-lg text-left px-4 text-crimson/80 hover:bg-crimson/20 transition-all font-ui text-sm">🔄 Return to Menu</button>
                </div>
              </div>
              <button onClick={() => setShowMenu(false)} className="mt-4 w-full py-2 bg-mist/10 border border-mist/20 rounded-lg text-silver/60 hover:text-pearl font-ui text-sm transition-all">Close</button>
            </div>
          </div>
        )}

        {/* Game Over overlay */}
        {phase === 'gameover' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-md p-4">
            <div className="text-center animate-float-up max-w-lg">
              <div className="text-6xl mb-4">💀</div>
              <h1 className="font-display text-4xl text-crimson font-bold mb-2">Fallen</h1>
              <p className="font-body text-lg text-silver italic mb-6">"Even the mightiest cultivator began as dust."</p>
              <div className="bg-abyss/80 border border-crimson/20 rounded-xl p-4 mb-6 text-left font-ui text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-silver/60">Name</span><span className="text-pearl">{gs.playerName}</span>
                  <span className="text-silver/60">Realm</span><span className="text-jade">Year {gs.year}</span>
                  <span className="text-silver/60">Age</span><span className="text-pearl">{gs.age}</span>
                  <span className="text-silver/60">Reincarnations</span><span className="text-pearl">{gs.reincarnationCount}</span>
                  <span className="text-silver/60">Techniques</span><span className="text-qi-blue">{gs.techniques.length}</span>
                </div>
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={() => { setGs(prev => prev ? reincarnate(prev) : prev); setPhase('tutorial'); }} className="px-8 py-3 bg-crimson/20 border border-crimson/40 text-crimson font-display rounded-lg hover:bg-crimson/30 transition-all active:scale-95">Reincarnate 🔥</button>
                <button onClick={restart} className="px-8 py-3 bg-shadow border border-mist/30 text-silver font-display rounded-lg hover:bg-mist/20 transition-all active:scale-95">Main Menu</button>
              </div>
            </div>
          </div>
        )}

        {/* Victory overlay */}
        {phase === 'victory' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-md p-4">
            <div className="text-center animate-float-up max-w-lg">
              <div className="text-6xl mb-4">🌟</div>
              <h1 className="font-display text-4xl shimmer-text font-black mb-2">Immortality</h1>
              <p className="font-body text-lg text-pearl/80 italic mb-6">"You have transcended the mortal coil."</p>
              <div className="bg-abyss/80 border border-gold/20 rounded-xl p-4 mb-6 text-left font-ui text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-silver/60">Name</span><span className="text-pearl">{gs.playerName}</span>
                  <span className="text-silver/60">Years</span><span className="text-pearl">{gs.year}</span>
                  <span className="text-silver/60">Age</span><span className="text-pearl">{gs.age}</span>
                  <span className="text-silver/60">Techniques</span><span className="text-qi-blue">{gs.techniques.length}</span>
                  <span className="text-silver/60">Total Qi</span><span className="text-qi-blue">{gs.stats.qi}</span>
                  <span className="text-silver/60">Echoes</span><span className="text-purple">{gs.pastLifeEchoes}</span>
                </div>
              </div>
              <button onClick={restart} className="px-10 py-3 bg-gold/20 border border-gold/40 text-gold font-display text-lg rounded-lg hover:bg-gold/30 transition-all active:scale-95">Begin Anew ✨</button>
            </div>
          </div>
        )}

        {/* Reincarnation overlay */}
        {phase === 'reincarnate' && gs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-md p-4">
            <div className="text-center animate-float-up max-w-lg">
              <div className="text-6xl mb-4">☯</div>
              <h1 className="font-display text-4xl text-purple font-bold mb-2">Reincarnation</h1>
              <p className="font-body text-lg text-silver italic mb-4">Your soul cycles back. What you learned remains.</p>
              <div className="bg-abyss/80 border border-purple/20 rounded-xl p-4 mb-6 text-left font-ui text-sm space-y-1">
                <p className="text-purple/80">Kept: {gs.techniques.length} techniques</p>
                <p className="text-purple/80">Kept: {Math.floor(gs.stats.wisdom * 0.3)} Wisdom ({Math.min(5, gs.pastLifeEchoes + 1)}x echo bonus)</p>
                <p className="text-purple/80">System Points: +{10 + Math.min(5, gs.pastLifeEchoes + 1) * 5}</p>
                <p className="text-silver/40 text-xs mt-2">Lost: All items, physical stats, connections</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={() => { setGs(prev => prev ? reincarnate(prev) : prev); setPhase('tutorial'); }} className="px-8 py-3 bg-purple/20 border border-purple/40 text-purple font-display rounded-lg hover:bg-purple/30 transition-all active:scale-95">Reincarnate ☯</button>
                <button onClick={restart} className="px-8 py-3 bg-shadow border border-mist/30 text-silver font-display rounded-lg hover:bg-mist/20 transition-all active:scale-95">Main Menu</button>
              </div>
            </div>
          </div>
        )}

        {/* Audio controls */}
        <AudioControls />
      </div>
    );
  }

  return null;
}
