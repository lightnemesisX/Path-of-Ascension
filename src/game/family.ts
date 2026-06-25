import { GameState, FamilyPartner, FamilyChild, NPC, ChildStage, NpcPersonality } from './types';
import { STAGES, generateNPC } from './constants';

const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const CHILD_NAMES_M = ['Tianyu', 'Haoran', 'Junwei', 'Ziming', 'Bowen', 'Yichen', 'Ruifeng', 'Haoyang'];
const CHILD_NAMES_F = ['Xinyi', 'Yuqing', 'Zixuan', 'Meilin', 'Ruoxi', 'Yuxin', 'Wanqing', 'Lingyue'];

// ─── COURTING ─────────────────────────────────────────────────────

export function canCourtNpc(state: GameState, npc: NPC): boolean {
  if (state.partner) return false; // Already has partner
  if (npc.relationship < 60) return false;
  if (!npc.alive) return false;
  if (npc.role === 'lover') return false; // Already partner (shouldn't happen)
  // Gender compatibility - anyone can court anyone
  return true;
}

export function getCourtSuccessChance(state: GameState, npc: NPC): number {
  const charm = state.stats.charm;
  let base: number;
  if (charm >= 60) base = 80;
  else if (charm >= 30) base = 50;
  else base = 20;

  // Arrogant NPCs require Charm 80+
  if (npc.personality === 'arrogant') {
    if (charm < 80) return Math.min(base, 10); // Almost impossible
    base = 70;
  }

  // Friendly/loyal NPCs are easier
  if (npc.personality === 'friendly' || npc.personality === 'loyal') base = Math.min(95, base + 15);

  // Relationship bonus
  base += Math.floor((npc.relationship - 60) * 0.5);

  return Math.min(95, Math.max(5, base));
}

export function attemptCourting(state: GameState, npc: NPC): { success: boolean; narrative: string; newState: GameState } {
  const chance = getCourtSuccessChance(state, npc);
  const roll = Math.random() * 100;
  const success = roll < chance;

  if (success) {
    const partner: FamilyPartner = {
      npcId: npc.id,
      name: npc.name,
      gender: npc.gender,
      personality: npc.personality,
      realmIdx: npc.realmIdx,
      stage: npc.stage,
      yearMarried: state.year,
      alive: true,
    };

    const updatedNpc = { ...npc, role: 'lover' as const, relationship: Math.min(100, npc.relationship + 20) };
    const narrative = npc.personality === 'cold'
      ? `${npc.name} stares at you for a long, silent moment. Then, almost imperceptibly, the corners of their mouth lift. "...I suppose I don't entirely despise your company, ${state.playerName}." For them, this is a passionate declaration of love.`
      : npc.personality === 'arrogant'
      ? `${npc.name} laughs — genuinely, warmly. "You dare confess to ME? Bold. Foolish." They pause. "...I accept. Someone of my caliber deserves a partner with such audacity, ${state.playerName}."`
      : npc.personality === 'mysterious'
      ? `${npc.name}'s eyes shimmer with an ancient knowing. "The stars foretold this moment, ${state.playerName}. Our fates were intertwined long before we met." They take your hand, and the world feels complete.`
      : `${npc.name}'s eyes widen, then soften. A blush colors their cheeks. "${state.playerName}... I've been waiting for you to say that." They take your hand, and for a moment, the entire cultivation world falls away.`;

    return {
      success: true,
      narrative,
      newState: {
        ...state,
        partner,
        npcs: state.npcs.map(n => n.id === npc.id ? updatedNpc : n),
        log: [...state.log, { year: state.year, age: state.age, text: `💕 ${npc.name} has become your cultivation partner!`, type: 'event' as const }],
      },
    };
  } else {
    const updatedNpc = { ...npc, relationship: Math.max(-100, npc.relationship - 15), memory: { ...npc.memory, lastInteraction: 'rejected_courting' } };
    const narrative = npc.personality === 'arrogant'
      ? `${npc.name} stares down at you with undisguised contempt. "You think yourself worthy of standing beside ME, ${state.playerName}? How laughable." The rejection stings like a physical blow.`
      : npc.personality === 'cold'
      ? `${npc.name} turns away without a word. The silence says everything. You've crossed a line, and the distance between you has never felt wider.`
      : `${npc.name} looks away, unable to meet your eyes. "I... ${state.playerName}, I care about you, but not in that way. I'm sorry." The awkwardness hangs in the air like a fog.`;

    return {
      success: false,
      narrative,
      newState: {
        ...state,
        npcs: state.npcs.map(n => n.id === npc.id ? updatedNpc : n),
        log: [...state.log, { year: state.year, age: state.age, text: `💔 ${npc.name} rejected your feelings. (-15 relationship)`, type: 'event' as const }],
      },
    };
  }
}

// ─── YEARLY FAMILY UPDATES ────────────────────────────────────────

export function processFamily(state: GameState): GameState {
  let s = { ...state };

  // Grief debuff tick
  if (s.griefYearsLeft > 0) {
    s = { ...s, griefYearsLeft: s.griefYearsLeft - 1 };
    if (s.griefYearsLeft === 0) {
      s.log = [...s.log, { year: s.year, age: s.age, text: `The grief fades. You feel whole again.`, type: 'system' as const }];
    }
  }

  // Partner buffs
  if (s.partner && s.partner.alive) {
    // Emotional support: +5 HP regen
    s = { ...s, hp: Math.min(s.maxHp, s.hp + 5) };
    // Shared cultivation: +3 Qi
    s = { ...s, stats: { ...s.stats, qi: s.stats.qi + 3 } };

    // Partner realm growth (slow)
    const p = s.partner;
    if (p && Math.random() < 0.15) {
      const si = STAGES.indexOf(p.stage);
      if (si < 2) {
        s = { ...s, partner: { ...p, stage: STAGES[si + 1] } };
      } else if (p.realmIdx < 10) {
        s = { ...s, partner: { ...p, realmIdx: p.realmIdx + 1, stage: 'Early' } };
      }
    }

    // Random item gift from partner (10% per year)
    if (p && Math.random() < 0.10) {
      const gifts = ['Healing Pill', 'Spirit Herb', 'Qi Pill', 'Lucky Charm'];
      const gift = pick(gifts);
      s.log = [...s.log, { year: s.year, age: s.age, text: `💝 ${p.name} gifted you a ${gift}.`, type: 'event' as const }];
      s = { ...s, herbs: s.herbs + (gift === 'Spirit Herb' ? 2 : 0), stats: { ...s.stats, qi: s.stats.qi + (gift === 'Qi Pill' ? 5 : 0) }, hp: Math.min(s.maxHp, s.hp + (gift === 'Healing Pill' ? 15 : 0)) };
    }

    // Child chance (after 3+ years with partner)
    if (p) {
      const yearsToget = s.year - p.yearMarried;
      if (yearsToget >= 3 && s.children.filter(c => c.alive).length < 4 && Math.random() < 0.12) {
        s = birthChild(s);
      }
    }
  }

  // Age up children
  s = { ...s, children: s.children.map(c => {
    if (!c.alive) return c;
    const newAge = c.age + 1;
    let newStage: ChildStage = c.childStage;
    if (newAge >= 18) newStage = 'adult';
    else if (newAge >= 13) newStage = 'teen';
    else if (newAge >= 6) newStage = 'child';

    // Teen+ cultivation growth
    let newRealmIdx = c.realmIdx;
    let newRealmStage = c.stage;
    if (newAge >= 13 && Math.random() < 0.2) {
      const si = STAGES.indexOf(c.stage);
      if (si < 2) newRealmStage = STAGES[si + 1];
      else if (newRealmIdx < 6) { newRealmIdx++; newRealmStage = 'Early'; }
    }

    return { ...c, age: newAge, childStage: newStage, realmIdx: newRealmIdx, stage: newRealmStage };
  })};

  // Convert adult children to NPCs (once)
  for (const child of s.children) {
    if (child.childStage === 'adult' && !child.becameNpc && child.alive) {
      const npc = generateNPC(child.realmIdx);
      npc.name = child.name;
      npc.gender = child.gender;
      npc.personality = child.personality;
      npc.realmIdx = child.realmIdx;
      npc.stage = child.stage;
      npc.relationship = 60; // They're your child
      npc.role = 'ally';
      npc.bio = `Your ${child.gender === 'female' ? 'daughter' : 'son'}, now a cultivator in their own right.`;
      s = { ...s, npcs: [...s.npcs, npc], children: s.children.map(c => c.id === child.id ? { ...c, becameNpc: true } : c) };
      s.log = [...s.log, { year: s.year, age: s.age, text: `🎓 ${child.name} has grown up and entered the cultivation world!`, type: 'event' as const }];
    }
  }

  // Past life children recognition
  if (s.reincarnationCount > 0 && s.pastLifeChildren.length > 0 && s.stats.wisdom >= 80 && Math.random() < 0.05) {
    const pastChildName = pick(s.pastLifeChildren);
    const existingNpc = s.npcs.find(n => n.name === pastChildName);
    if (!existingNpc) {
      const npc = generateNPC(s.realmIdx);
      npc.name = pastChildName;
      npc.relationship = 50;
      npc.role = 'ally';
      npc.bio = `A cultivator who resembles someone from your past life...`;
      s = { ...s, npcs: [...s.npcs, npc] };
      s.log = [...s.log, { year: s.year, age: s.age, text: `👁️ You encounter ${pastChildName}... memories from a past life surge through you. They sense it too.`, type: 'event' as const }];
      s = { ...s, pastLifeChildren: s.pastLifeChildren.filter(n => n !== pastChildName) };
    }
  }

  return s;
}

function birthChild(state: GameState): GameState {
  if (!state.partner) return state;
  const isFemale = Math.random() > 0.5;
  const names = isFemale ? CHILD_NAMES_F : CHILD_NAMES_M;
  const usedNames = state.children.map(c => c.name);
  const available = names.filter(n => !usedNames.includes(n));
  const name = available.length > 0 ? pick(available) : `${pick(names)} ${rand(1, 99)}`;

  const personalities: NpcPersonality[] = ['friendly', 'cold', 'arrogant', 'mysterious', 'loyal', 'deceitful'];

  const child: FamilyChild = {
    id: `child_${Date.now()}_${rand(100, 999)}`,
    name,
    gender: isFemale ? 'female' : 'male',
    birthYear: state.year,
    age: 0,
    childStage: 'infant',
    personality: pick(personalities),
    realmIdx: 0,
    stage: 'Early',
    inheritedStrength: Math.floor((state.stats.strength + (state.partner.realmIdx * 5)) * 0.3),
    inheritedQi: Math.floor((state.stats.qi + (state.partner.realmIdx * 10)) * 0.2),
    alive: true,
    becameNpc: false,
  };

  return {
    ...state,
    children: [...state.children, child],
    log: [...state.log, { year: state.year, age: state.age, text: `🎒 A ${isFemale ? 'daughter' : 'son'} is born! Welcome ${name} to the world!`, type: 'event' as const }],
  };
}

// ─── PARTNER DEATH ────────────────────────────────────────────────

export function killPartner(state: GameState, cause: string): GameState {
  if (!state.partner || !state.partner.alive) return state;
  const name = state.partner.name;
  return {
    ...state,
    partner: { ...state.partner, alive: false, causeOfDeath: cause },
    griefYearsLeft: 3,
    stats: {
      ...state.stats,
      strength: Math.max(0, state.stats.strength - 10),
      qi: Math.max(0, state.stats.qi - 10),
      intelligence: Math.max(0, state.stats.intelligence - 10),
      luck: Math.max(0, state.stats.luck - 10),
      charm: Math.max(0, state.stats.charm - 10),
      reputation: state.stats.reputation,
      wisdom: state.stats.wisdom,
      smithing: state.stats.smithing,
      alchemy: state.stats.alchemy,
    },
    log: [...state.log, { year: state.year, age: state.age, text: `💔 ${name} has perished (${cause}). Grief overwhelms you. (-10 to most stats for 3 years)`, type: 'death' as const }],
  };
}

// ─── CHILD KIDNAP / DEATH ─────────────────────────────────────────

export function kidnappedChild(state: GameState): GameState {
  const aliveChildren = state.children.filter(c => c.alive && c.childStage !== 'adult');
  if (aliveChildren.length === 0) return state;
  const victim = pick(aliveChildren);
  return {
    ...state,
    children: state.children.map(c => c.id === victim.id ? { ...c, alive: false, causeOfDeath: 'Kidnapped during sect raid' } : c),
    log: [...state.log, { year: state.year, age: state.age, text: `😱 ${victim.name} was kidnapped during a sect raid!`, type: 'event' as const }],
  };
}
