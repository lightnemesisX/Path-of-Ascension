import { GameState, Background, Gender, SectId, LogEntry, Item } from './types';
import {
  BACKGROUNDS, ACTIONS_PER_YEAR, STARTING_AGE, REALMS, STAGES,
  REALM_QI_THRESHOLDS, MAX_AGE_BASE, AGE_BONUS_PER_REALM, SAVE_KEY,
  generateNPC, ALL_ITEMS, BREAKTHROUGH_BASE_CHANCE, REALM_LIFESPAN,
} from './constants';
import { generateNewMissions, SYSTEM_GREETING, getRandomSystemMessage, updateMissionProgress, processExpiredMissions, addYearlyMissions } from './system';
import { processFamily } from './family';
import { processCaptivity, processHunted, shouldTriggerRaid } from './raid';
import { processAging, checkOldAgeDeath } from './lifespan';

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

function mkItem(id: string, qty: number): Item {
  const t = ALL_ITEMS.find(i => i.id === id)!;
  return { id: `${id}_${Date.now()}`, name: t.name, type: t.type as Item['type'], quality: t.quality as Item['quality'], description: t.description, statBonus: t.statBonus as Partial<Record<string, number>>, quantity: qty };
}

function log(state: GameState, text: string, type: LogEntry['type']): GameState {
  return { ...state, log: [...state.log, { year: state.year, age: state.age, text, type }].slice(-state.maxLogSize) };
}

function apply(state: GameState, sc: Partial<Record<string, number>>, hp: number, al: number): GameState {
  const s = { ...state.stats };
  for (const [k, v] of Object.entries(sc)) { if (v !== undefined && v !== null) s[k as keyof typeof s] = Math.max(0, (s[k as keyof typeof s] || 0) + v); }
  return { ...state, stats: s, hp: Math.max(0, Math.min(state.maxHp, state.hp + hp)), alignment: Math.max(-100, Math.min(100, state.alignment + al)) };
}

export function createNewGame(name: string, gender: Gender, background: Background, sectId: SectId): GameState {
  const bg = BACKGROUNDS[background];
  return {
    phase: 'tutorial', playerName: name, gender, background, sectId,
    stats: { qi: bg.qi, strength: bg.str, intelligence: bg.int, luck: bg.luck, reputation: bg.rep, wisdom: bg.wis, charm: bg.chr, smithing: bg.smith, alchemy: bg.alch },
    year: 1, age: STARTING_AGE, realmIdx: 0, stage: 'Early', alignment: 0, actionsThisYear: 0, // starts at 0, counts up to ACTIONS_PER_YEAR = 5 (do not change)
    log: [{ year: 1, age: STARTING_AGE, text: `${name} begins their cultivation journey.`, type: 'system' }],
    alive: true, maxHp: bg.hp, hp: bg.hp,
    artifacts: [], rivals: [],
    techniques: sectId === 'rogue' ? [] : ['Formation Basics'],
    systemPoints: 5, missions: generateNewMissions(1, 0), systemMessages: [SYSTEM_GREETING], totalMilestones: 0,
    npcs: [],
    inventory: [mkItem('iron_sword', 1), mkItem('cloth_robe', 1), { id: 'spirit_herb', name: 'Spirit Herb', type: 'material' as Item['type'], quality: 'Common' as Item['quality'], description: 'A basic spiritual herb.', quantity: 5 }],
    equippedWeapon: 'iron_sword', equippedArmor: 'cloth_robe',
    herbs: 5, ores: 2,
    reincarnationCount: 0, pastLifeEchoes: 0, keptTechniques: [], keptWisdom: 0, tribulationsSurvived: 0,
    pendingEvent: null, tutorialCompleted: false, showAnimations: true, maxLogSize: 50,
    tamedBeast: null,
    partner: null, children: [], griefYearsLeft: 0, pastLifeChildren: [],
    lastRaidYear: 0, captured: null, sectDestroyed: false, sectFounder: false,
    huntedBySect: null, huntedYearsLeft: 0, rescueMissionActive: false,
    maxLifespan: REALM_LIFESPAN[0], lifespanBonus: 0,
  };
}

export function performAction(state: GameState, actionId: string): GameState {
  if (!state.alive || state.phase !== 'playing') return state;
  let s = applyAction(state, actionId);
  s = { ...s, actionsThisYear: s.actionsThisYear + 1 }; // ACTIONS_PER_YEAR = 5 (do not change)
  s = updateMissionProgress(s, actionId);
  if (actionId === 'explore' && Math.random() < 0.3 + s.stats.luck * 0.02)
    s = { ...s, herbs: s.herbs + rand(1, 3), ores: s.ores + rand(0, 2) };
  s = checkRealm(s);
  if (!s.alive) return s;
  if (!s.pendingEvent && Math.random() > 0.55) s = randomEvent(s);
  if (!s.pendingEvent && s.actionsThisYear >= ACTIONS_PER_YEAR) s = advanceYear(s); // ACTIONS_PER_YEAR = 5 (do not change)
  return s;
}

/**
 * Use 1 action from outside the normal performAction flow (battle, explore event, etc).
 * Increments actionsThisYear and triggers advanceYear if all 5 actions are used.
 * This is the ONLY function that should be used in App.tsx handlers to consume an action.
 */
export function consumeAction(state: GameState, missionType?: string): GameState {
  let s = { ...state, actionsThisYear: state.actionsThisYear + 1 }; // ACTIONS_PER_YEAR = 5 (do not change)
  if (missionType) s = updateMissionProgress(s, missionType);
  if (s.actionsThisYear >= ACTIONS_PER_YEAR) s = advanceYear(s); // ACTIONS_PER_YEAR = 5 (do not change)
  return s;
}

function applyAction(st: GameState, act: string): GameState {
  const { stats, realmIdx, sectId } = st;
  const eb = 1 + realmIdx * 0.15 + st.pastLifeEchoes * 0.1;
  const r = (a: number, b: number) => Math.max(0, Math.floor((Math.random() * (b - a + 1) + a) * eb));
  const sb = (act2: string) => { if (sectId === 'azure_sky' && act2 === 'meditate') return r(3, 8); if (sectId === 'iron_blood' && act2 === 'train') return r(3, 8); if (sectId === 'jade_lotus' && act2 === 'alchemy') return r(3, 6); if (sectId === 'shadow_veil' && (act2 === 'scheme' || act2 === 'explore')) return r(2, 5); if (sectId === 'crimson_flame' && act2 === 'fight') return r(3, 8); if (sectId === 'wandering_blade' && act2 === 'socialize') return r(2, 5); if (sectId === 'rogue' && act2 === 'explore') return r(3, 10); return 0; };
  const p = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  let text = '', sc: Partial<Record<string, number>> = {}, hp = 0, al = 0;
  switch (act) {
    case 'train': text = p(['You push your body to its limits with grueling exercises.', 'Under a waterfall, you train until muscles scream.', 'You carry boulders up the mountain until collapse.']); sc = { strength: r(4, 10) + sb('train'), qi: r(1, 4) }; hp = -r(2, 8); break;
    case 'meditate': text = p(['You draw ambient Qi into your dantian.', 'In deep meditation, you sense the flow of the universe.', 'Spiritual energy floods your meridians.']); sc = { qi: r(6, 14) + sb('meditate'), intelligence: r(1, 4) }; hp = r(2, 8); break;
    case 'study': text = p(['You pour over ancient cultivation texts.', 'A dusty scroll reveals formation secrets.', 'Ancient sages illuminate your path.']); sc = { intelligence: r(5, 12), qi: r(2, 6) }; hp = 0; al = 2; break;
    case 'explore': text = p(['You discover a hidden cave!', 'A forgotten garden of spirit herbs.', 'The wilderness tests your resolve.']); sc = { luck: r(2, 6), qi: r(5, 12), strength: r(1, 3) }; hp = -r(2, 8); break;
    case 'fight': text = stats.strength + stats.qi * 0.3 > r(10, 40) ? p(['You defeat a bandit leader!', 'A beast falls before your technique!', 'You win a martial tournament!']) : 'Your opponent proves too strong. You retreat.'; sc = text.includes('retreat') ? { strength: r(2, 5) } : { strength: r(4, 10), qi: r(3, 8), reputation: r(2, 6) }; hp = text.includes('retreat') ? -r(15, 35) : -r(8, 20); break;
    case 'scheme': text = p(['You spread rumors about a rival.', 'Through blackmail, you gain resources.', 'You manipulate factions into conflict.']); sc = { intelligence: r(3, 7), qi: r(3, 8), luck: r(1, 4) }; hp = 0; al = -r(5, 15); break;
    case 'socialize': text = p(['You attend a cultivation conference.', 'Sharing tea opens new opportunities.', 'You help a village, earning gratitude.']); sc = { reputation: r(5, 12), charm: r(1, 4), luck: r(1, 4) }; hp = 0; al = r(3, 8); break;
    case 'alchemy':
      if (st.herbs >= 3) { text = 'You craft alchemical pills using gathered herbs.'; sc = { alchemy: r(3, 8) + sb('alchemy'), qi: r(2, 6), intelligence: r(1, 3) }; st = { ...st, herbs: st.herbs - 3 }; } else text = 'Not enough herbs for alchemy.'; break;
    case 'smithing':
      if (st.ores >= 2) { text = 'You forge spirit metal into weapons.'; sc = { smithing: r(3, 8), strength: r(2, 5), intelligence: r(1, 3) }; st = { ...st, ores: st.ores - 2 }; } else text = 'Not enough ore for smithing.'; break;
    case 'rest': text = p(['You rest in a peaceful grove.', 'A warm inn restores your vitality.']); sc = { qi: r(1, 4) }; hp = r(15, 35); break;
    default: text = 'You contemplate the Dao.'; sc = { qi: 1 }; break;
  }
  return log(apply(st, sc, hp, al), text, 'action');
}

// Get the next breakthrough target
export function getNextBreakthroughInfo(state: GameState): { targetQi: number; nextRealm: string; nextStage: string } | null {
  if (state.realmIdx >= REALMS.length - 1) return null;
  
  const si = STAGES.indexOf(state.stage);
  let nextRealmIdx = state.realmIdx;
  let nextStage = state.stage;
  
  // Mortal has no stages, goes directly to Qi Condensation Early
  if (state.realmIdx === 0) {
    nextRealmIdx = 1;
    nextStage = 'Early';
  } else if (si < 2) {
    nextStage = STAGES[si + 1];
  } else {
    nextRealmIdx = state.realmIdx + 1;
    nextStage = 'Early';
  }
  
  const targetQi = REALM_QI_THRESHOLDS[nextRealmIdx]?.[nextStage];
  if (!targetQi) return null;
  
  return {
    targetQi,
    nextRealm: REALMS[nextRealmIdx],
    nextStage,
  };
}

// Check if player can attempt a breakthrough
export function canAttemptBreakthrough(state: GameState): boolean {
  const info = getNextBreakthroughInfo(state);
  if (!info) return false;
  return state.stats.qi >= info.targetQi;
}

// Calculate breakthrough success chance
export function getBreakthroughChance(state: GameState): number {
  const baseChance = BREAKTHROUGH_BASE_CHANCE[state.realmIdx] || 50;
  
  // Bonuses
  let bonus = 0;
  bonus += state.stats.wisdom * 0.3; // Wisdom helps
  bonus += state.stats.intelligence * 0.1; // Intelligence helps a bit
  
  // Check for breakthrough pill
  const hasBreakthroughPill = state.inventory.some(i => i.name.includes('Breakthrough Pill'));
  if (hasBreakthroughPill) bonus += 20;
  
  // Check for relevant techniques
  if (state.techniques.length > 0) bonus += state.techniques.length * 2;
  
  return Math.min(95, Math.max(10, baseChance + bonus));
}

// Attempt a breakthrough
export function attemptBreakthrough(state: GameState): GameState {
  if (!canAttemptBreakthrough(state)) return state;
  
  const info = getNextBreakthroughInfo(state);
  if (!info) return state;
  
  const successChance = getBreakthroughChance(state);
  const roll = Math.random() * 100;
  
  // Consume breakthrough pill if available
  let s = { ...state };
  const pillIndex = s.inventory.findIndex(i => i.name.includes('Breakthrough Pill'));
  if (pillIndex >= 0) {
    s.inventory = s.inventory.filter((_, i) => i !== pillIndex);
    s = log(s, `💊 Breakthrough Pill consumed for increased success chance!`, 'event');
  }
  
  if (roll < successChance) {
    // SUCCESS!
    const si = STAGES.indexOf(state.stage);
    let newRealmIdx = state.realmIdx;
    let newStage = state.stage;
    
    if (state.realmIdx === 0) {
      newRealmIdx = 1;
      newStage = 'Early';
    } else if (si < 2) {
      newStage = STAGES[si + 1];
    } else {
      newRealmIdx = state.realmIdx + 1;
      newStage = 'Early';
    }
    
    const hpBoost = 15 + newRealmIdx * 10;
    const spGain = 10 + newRealmIdx * 5;
    
    s = {
      ...s,
      realmIdx: newRealmIdx,
      stage: newStage,
      maxHp: s.maxHp + hpBoost,
      hp: Math.min(s.maxHp + hpBoost, s.hp + hpBoost),
      totalMilestones: s.totalMilestones + 1,
      systemPoints: s.systemPoints + spGain,
    };
    
    s = log(s, `✨✨✨ BREAKTHROUGH SUCCESS! ✨✨✨`, 'realm');
    s = log(s, `⚡ Advanced to ${REALMS[newRealmIdx]} — ${newStage}!`, 'realm');
    s = log(s, `+${hpBoost} Max HP! +${spGain} System Points!`, 'realm');
    s = log(s, `System: "Congratulations, Host. Your cultivation has deepened."`, 'system_msg');
    
    // Trigger tribulation for Nascent Soul and above
    if (newRealmIdx >= 4) {
      s = tribulation(s);
    }
    
    // Check for victory
    if (REALMS[newRealmIdx] === 'True Immortal' && newStage === 'Late') {
      s = { ...s, phase: 'victory' };
      s = log(s, `🌟 TRUE IMMORTALITY ACHIEVED! 🌟`, 'victory');
      clearSave();
    }
    
    return s;
  } else {
    // FAILURE - lose 20% of excess Qi
    const excessQi = s.stats.qi - info.targetQi;
    const qiLoss = Math.floor(excessQi * 0.2);
    const dmg = Math.floor(rand(10, 25) * (1 + state.realmIdx * 0.3));
    
    s = {
      ...s,
      stats: { ...s.stats, qi: s.stats.qi - qiLoss },
      hp: Math.max(1, s.hp - dmg),
    };
    
    s = log(s, `❌ BREAKTHROUGH FAILED!`, 'event');
    s = log(s, `Cultivation backlash: -${qiLoss} Qi, -${dmg} HP.`, 'event');
    s = log(s, `System: "Do not despair, Host. Gather more strength and try again."`, 'system_msg');
    
    if (s.hp <= 0) {
      return { 
        ...s, 
        alive: false, 
        phase: 'reincarnate', 
        log: [...s.log, { year: s.year, age: s.age, text: `💀 The backlash proves fatal...`, type: 'death' }] 
      };
    }
    
    return s;
  }
}

// Legacy checkRealm - now just checks if breakthrough is available, actual breakthrough is manual
function checkRealm(state: GameState): GameState {
  // Auto-breakthrough only for Mortal -> Qi Condensation (first breakthrough)
  if (state.realmIdx === 0 && state.stats.qi >= 50) {
    return attemptBreakthrough(state);
  }
  return state;
}

function tribulation(state: GameState): GameState {
  const tp = 50 + state.realmIdx * 40;
  const def = state.stats.wisdom * 2 + state.stats.qi * 0.5 + state.realmIdx * 20;
  const survived = def + (Math.random() < 0.3 + state.stats.luck * 0.015 ? 30 : 0) > tp;
  if (survived) return log({ ...state, tribulationsSurvived: state.tribulationsSurvived + 1, hp: Math.max(1, state.hp - 15) }, `⚡ Heavenly Tribulation survived!`, 'event');
  const dmg = rand(30, 80);
  const ns = log({ ...state, hp: state.hp - dmg }, `⚡ Tribulation! -${dmg} HP.`, 'event');
  return ns.hp <= 0 ? { ...ns, alive: false, phase: 'reincarnate', log: [...ns.log, { year: ns.year, age: ns.age, text: `💀 The tribulation claims your life.`, type: 'death' }] } : ns;
}

function advanceYear(state: GameState): GameState {
  const na = state.age + 1;
  const ny = state.year + 1;
  const ma = MAX_AGE_BASE + (AGE_BONUS_PER_REALM[state.realmIdx] || 0);
  let s: GameState = { ...state, age: na, year: ny, actionsThisYear: 0 }; // reset to 0 at year start, counts up to ACTIONS_PER_YEAR = 5 (do not change)
  
  // Year-end summary
  const completedMissions = state.missions.filter(m => m.completed && !m.claimed).length;
  const healAmount = Math.floor(s.maxHp * 0.15);
  
  // Process expired missions (apply penalties)
  s = processExpiredMissions(s);
  
  // Add new yearly missions
  s = addYearlyMissions(s);
  
  // Process family (partner buffs, children aging, births, past-life recognition)
  s = processFamily(s);
  
  // Process captivity
  s = processCaptivity(s);
  
  // Process hunted status
  s = processHunted(s);
  
  // Log year summary
  s = log(s, `━━━ Year ${state.year} Summary ━━━`, 'system');
  s = log(s, `Qi: ${state.stats.qi} | Strength: ${state.stats.strength} | Missions completed: ${completedMissions}`, 'system');
  s = log(s, `━━━━━━━━━━━━━━━━━━━━━`, 'system');
  
  // System message for new year
  s = log(s, getRandomSystemMessage(), 'system_msg');
  s = log(s, `— Year ${ny} begins. Age: ${na}/${ma}. Restored ${healAmount} HP. —`, 'system');
  
  // Heal
  s.hp = Math.min(s.maxHp, s.hp + healAmount);
  
  // Random events
  if (state.rivals.length > 0 && Math.random() < 0.1 * state.rivals.length) { 
    const d = rand(10, 25) * state.rivals.length; 
    s = log({ ...s, hp: Math.max(1, s.hp - d) }, `⚔️ Rivals ambush! -${d} HP!`, 'event'); 
  }
  if (state.sectId !== 'rogue' && Math.random() < 0.05) {
    s = log(s, `🏯 WAR: ${pick(['Azure Sky', 'Iron Blood', 'Crimson Flame'])} raids your sect!`, 'event');
  }
  if (Math.random() > 0.5) { 
    const npc = generateNPC(state.realmIdx); 
    s.npcs = [...s.npcs, npc]; 
  }
  
  // Process aging effects (stat decay, lifespan updates)
  s = processAging(s);
  
  // Auto-save at year end
  saveGame(s);
  
  // Check for death by old age (uses new lifespan system)
  s = checkOldAgeDeath(s);
  if (!s.alive) {
    clearSave();
  }
  
  return s;
}

function randomEvent(state: GameState): GameState {
  if (Math.random() < 0.3) return log(state, `🐾 ${pick(['A spirit beast blocks your path!', 'A massive creature descends!', 'A wounded beast turns hostile!'])}`, 'combat');
  if (state.npcs.length > 0 && Math.random() < 0.25) {
    const npc = pick(state.npcs.filter(n => n.alive));
    if (npc) { const rx: Record<string, string> = { friendly: `Ally ${npc.name} greets you warmly.`, cold: `${npc.name} gives a cold nod.`, arrogant: `"Still so weak?" ${npc.name} scoffs.`, mysterious: `${npc.name}: "The stars align."`, loyal: `${npc.name}: "For you, always."`, deceitful: `${npc.name} flatters you suspiciously.` }; return log(state, `👤 ${rx[npc.personality]}`, 'event'); }
  }
  if (Math.random() < 0.2) { const g = rand(10, 30) + state.realmIdx * 5; return log(apply(state, { qi: g }, 0, 0), `✨ Spirit stones! +${g} Qi.`, 'event'); }
  if (Math.random() < 0.15) return { ...log(state, `🌿 Found herbs! +${rand(2, 5)}.`, 'event'), herbs: state.herbs + rand(2, 5) };
  if (Math.random() < 0.1) return { ...log(state, `⛏️ Found ore! +${rand(1, 3)}.`, 'event'), ores: state.ores + rand(1, 3) };
  return state;
}

export function reincarnate(state: GameState): GameState {
  const kw = Math.floor(state.stats.wisdom * 0.3);
  const eb = Math.min(5, state.pastLifeEchoes + 1);
  const bg = BACKGROUNDS[state.background];
  return {
    ...state, phase: 'tutorial', realmIdx: 0, stage: 'Early', year: 1, age: STARTING_AGE,
    stats: { qi: bg.qi, strength: bg.str, intelligence: bg.int, luck: bg.luck, reputation: bg.rep, wisdom: kw + bg.wis, charm: bg.chr, smithing: bg.smith, alchemy: bg.alch },
    maxHp: bg.hp, hp: bg.hp, alive: true, actionsThisYear: 0, artifacts: [], npcs: [], rivals: [], // actionsThisYear starts at 0, counts up to ACTIONS_PER_YEAR = 5 (do not change)
    inventory: [mkItem('iron_sword', 1), mkItem('cloth_robe', 1), { id: 'spirit_herb', name: 'Spirit Herb', type: 'material' as Item['type'], quality: 'Common' as Item['quality'], description: 'A basic spiritual herb.', quantity: 5 }],
    equippedWeapon: 'iron_sword', equippedArmor: 'cloth_robe', herbs: 5, ores: 2,
    techniques: state.techniques.slice(0, 5), keptTechniques: state.techniques.slice(0, 5),
    reincarnationCount: state.reincarnationCount + 1, pastLifeEchoes: eb, keptWisdom: kw,
    systemPoints: 10 + eb * 5, missions: generateNewMissions(1, 0),
    systemMessages: [`Past life echo: ${eb}x bonus. Your soul remembers...`],
    totalMilestones: 0, log: [{ year: 1, age: STARTING_AGE, text: `${state.playerName} reincarnates! Past life echo: +${eb * 10}% gains.`, type: 'system' }],
    tutorialCompleted: false, pendingEvent: null, tamedBeast: null,
    partner: null, children: [], griefYearsLeft: 0,
    pastLifeChildren: [...state.pastLifeChildren, ...state.children.filter(c => c.alive).map(c => c.name)],
    lastRaidYear: 0, captured: null, sectDestroyed: false, sectFounder: false,
    huntedBySect: null, huntedYearsLeft: 0, rescueMissionActive: false,
    maxLifespan: REALM_LIFESPAN[0], lifespanBonus: 0,
  };
}

export function saveGame(s: GameState) { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...s, pendingEvent: null })); } catch {} }
export function loadGame(): GameState | null { try { const d = localStorage.getItem(SAVE_KEY); if (!d) return null; const s = JSON.parse(d); return s.playerName && s.stats ? s as GameState : null; } catch { return null; } }
export function hasSave(): boolean { try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; } }
export function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch {} }

export function getAlignmentLabel(a: number) { if (a >= 60) return 'Saint'; if (a >= 30) return 'Righteous'; if (a >= 10) return 'Virtuous'; if (a > -10) return 'Neutral'; if (a > -30) return 'Cunning'; if (a > -60) return 'Villainous'; return 'Demonic'; }
export function getAlignmentColor(a: number) { if (a >= 30) return '#4488ff'; if (a >= 10) return '#66aacc'; if (a > -10) return '#aaa'; if (a > -30) return '#cc8844'; return '#e63946'; }
export function getMaxAge(ri: number) { return MAX_AGE_BASE + (AGE_BONUS_PER_REALM[ri] || 0); }
export function getQiProgress(s: GameState) { const t = REALM_QI_THRESHOLDS[s.realmIdx]?.[s.stage] ?? 0; return t === 0 ? 100 : Math.min(100, (s.stats.qi / t) * 100); }
