import { GameState, RaidState, CapturedState } from './types';
import { SECTS } from './constants';
import { killPartner, kidnappedChild } from './family';

const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ─── RAID TRIGGER CHECK ───────────────────────────────────────────

export function shouldTriggerRaid(state: GameState): boolean {
  if (state.captured) return false;
  if (state.sectDestroyed && state.sectId === 'rogue') return false;
  const yearsSince = state.year - state.lastRaidYear;
  if (yearsSince < 8) return false;
  // Base 5% chance, scaling with time and reputation
  let chance = 0.05 + (yearsSince - 8) * 0.02 + state.stats.reputation * 0.001;
  if (state.sectId === 'rogue') chance *= 0.5; // Rogues less likely
  if (state.huntedBySect) chance += 0.1; // Hunted = more likely
  return Math.random() < chance;
}

// ─── CREATE RAID ──────────────────────────────────────────────────

const RAIDER_SECTS = [
  { name: 'Azure Sky Sect', tier: 1 },
  { name: 'Crimson Flame Hall', tier: 1 },
  { name: 'Jade Lotus Pavilion', tier: 1 },
  { name: 'Iron Blood Sect', tier: 2 },
  { name: 'Shadow Veil Order', tier: 2 },
  { name: 'Demonic Path Alliance', tier: 1 },
  { name: 'Heavenly Sword Sect', tier: 1 },
  { name: 'Blood Moon Cult', tier: 2 },
];

export function createRaidState(state: GameState): RaidState {
  const playerSect = SECTS[state.sectId];
  const playerTier = playerSect?.tier || 0;

  // Pick a raider that's same or higher tier
  const eligible = RAIDER_SECTS.filter(r => r.tier <= playerTier + 1 && r.name !== playerSect?.name);
  const raider = eligible.length > 0 ? pick(eligible) : RAIDER_SECTS[0];

  const raiderStrength = 50 + raider.tier * 30 + rand(20, 60);
  const playerSectStrength = 30 + playerTier * 25 + state.realmIdx * 10 + rand(10, 30);

  return {
    phase: 'announcement',
    raiderName: raider.name,
    raiderTier: raider.tier,
    raiderStrength,
    playerSectStrength,
    log: [],
    familyCaptured: false,
  };
}

// ─── DEFEND ───────────────────────────────────────────────────────

export function resolveDefend(state: GameState, raid: RaidState): { raid: RaidState; state: GameState } {
  const playerPower = state.stats.strength + state.stats.qi * 0.5 + state.realmIdx * 20;
  const totalDefense = raid.playerSectStrength + playerPower;
  const won = totalDefense > raid.raiderStrength * 1.1;

  if (won) {
    const repGain = rand(15, 30);
    const spGain = rand(10, 25);
    const qiGain = rand(10, 25);
    const hpLoss = rand(10, 30);
    const log = [
      `The battle rages across the sect grounds!`,
      `Your cultivation proves decisive — the enemy forces break and retreat!`,
      `"${state.playerName} held the line!" — your name echoes across the battlefield.`,
    ];
    return {
      raid: { ...raid, phase: 'aftermath', outcome: 'defend_win', log },
      state: {
        ...state,
        hp: Math.max(1, state.hp - hpLoss),
        stats: { ...state.stats, reputation: state.stats.reputation + repGain, qi: state.stats.qi + qiGain, strength: state.stats.strength + rand(3, 8) },
        systemPoints: state.systemPoints + spGain,
        lastRaidYear: state.year,
        log: [...state.log, { year: state.year, age: state.age, text: `🏯 Raid REPELLED! +${repGain} rep, +${spGain} SP. The ${raid.raiderName} retreats!`, type: 'event' as const }],
      },
    };
  }

  // Defeat
  const hpLoss = rand(30, 60);
  const captured = Math.random() < 0.4;
  const log = [
    `The ${raid.raiderName} overwhelms your defenses!`,
    `Sect members fall around you. The formation crumbles.`,
    captured ? `You are struck from behind and dragged away in chains.` : `You barely escape through the back mountain path, wounded and defeated.`,
  ];

  // Family casualties during failed defense
  let newState = { ...state, hp: Math.max(1, state.hp - hpLoss), lastRaidYear: state.year };
  if (state.partner?.alive && Math.random() < 0.3) {
    newState = killPartner(newState, `Killed during ${raid.raiderName} raid`);
  }
  if (state.children.some(c => c.alive && c.childStage !== 'adult') && Math.random() < 0.25) {
    newState = kidnappedChild(newState);
    newState = { ...newState, rescueMissionActive: true };
  }

  if (captured) {
    newState = {
      ...newState,
      captured: { bySect: raid.raiderName, yearsRemaining: rand(1, 3), yearsCaptured: 0 },
      log: [...newState.log, { year: state.year, age: state.age, text: `⛓️ CAPTURED by ${raid.raiderName}!`, type: 'event' as const }],
    };
    return { raid: { ...raid, phase: 'aftermath', outcome: 'captured', log }, state: newState };
  }

  // Sect may be destroyed
  const sectDest = Math.random() < 0.5;
  if (sectDest) {
    newState = {
      ...newState,
      sectDestroyed: true,
      sectId: 'rogue',
      log: [...newState.log, { year: state.year, age: state.age, text: `💥 Your sect has been DESTROYED! You are now a Rogue Cultivator.`, type: 'event' as const }],
    };
  }

  newState.log = [...newState.log, { year: state.year, age: state.age, text: `🏯 Raid defense FAILED. -${hpLoss} HP.`, type: 'event' as const }];
  return { raid: { ...raid, phase: 'aftermath', outcome: 'defend_lose', log, familyCaptured: newState.rescueMissionActive }, state: newState };
}

// ─── FLEE ─────────────────────────────────────────────────────────

export function resolveFlee(state: GameState, raid: RaidState): { raid: RaidState; state: GameState } {
  const log = [
    `You abandon the sect under cover of chaos.`,
    `Others fight and fall while you slip through the back gate.`,
    `You survive — but at what cost to your honor?`,
  ];

  let newState = {
    ...state,
    stats: { ...state.stats, reputation: Math.max(0, state.stats.reputation - 20) },
    alignment: Math.max(-100, state.alignment - 8),
    lastRaidYear: state.year,
    log: [...state.log, { year: state.year, age: state.age, text: `🏃 Fled during raid. -20 reputation. Cowardice stings.`, type: 'event' as const }],
  };

  // Sect may be destroyed while player fled
  if (Math.random() < 0.6) {
    newState = {
      ...newState,
      sectDestroyed: true,
      sectId: 'rogue',
      log: [...newState.log, { year: state.year, age: state.age, text: `💥 While you fled, the sect was DESTROYED.`, type: 'event' as const }],
    };
  }

  // Family may be captured
  if (state.partner?.alive && Math.random() < 0.4) {
    newState = killPartner(newState, `Lost during ${raid.raiderName} raid`);
  }
  if (state.children.some(c => c.alive && c.childStage !== 'adult') && Math.random() < 0.35) {
    newState = kidnappedChild(newState);
    newState = { ...newState, rescueMissionActive: true };
  }

  return { raid: { ...raid, phase: 'aftermath', outcome: 'fled', log, familyCaptured: newState.rescueMissionActive }, state: newState };
}

// ─── SURRENDER ────────────────────────────────────────────────────

export function resolveSurrender(state: GameState, raid: RaidState): { raid: RaidState; state: GameState } {
  // Assess player
  const impressive = state.realmIdx >= 3; // Core Formation+
  const log: string[] = [];

  if (impressive) {
    log.push(
      `You drop your weapon and kneel.`,
      `The ${raid.raiderName} commander inspects you, then grins.`,
      `"Core Formation at your age? Impressive. We could use talent like you."`,
      `They offer you a place in their ranks — not as a prisoner, but as a member.`,
    );
    return {
      raid: { ...raid, phase: 'surrender_assess', outcome: 'joined_raider', log },
      state,
    };
  }

  // Weak player — forced servitude or luck escape
  const escaped = state.stats.luck > rand(30, 80);
  if (escaped) {
    log.push(
      `You surrender, but as the guards are distracted, you see your chance.`,
      `A flash of movement — you break free and vanish into the smoke!`,
    );
    return {
      raid: { ...raid, phase: 'aftermath', outcome: 'fled', log },
      state: {
        ...state,
        hp: Math.max(1, state.hp - rand(10, 20)),
        lastRaidYear: state.year,
        log: [...state.log, { year: state.year, age: state.age, text: `🏃 Surrendered but escaped through luck!`, type: 'event' as const }],
      },
    };
  }

  log.push(
    `You surrender. The raiders look at you with contempt.`,
    `"Weak. You'll serve us until we decide otherwise."`,
    `Chains close around your wrists.`,
  );
  const newState = {
    ...state,
    captured: { bySect: raid.raiderName, yearsRemaining: 3, yearsCaptured: 0 } as CapturedState,
    lastRaidYear: state.year,
    log: [...state.log, { year: state.year, age: state.age, text: `⛓️ Surrendered and enslaved by ${raid.raiderName} for 3 years.`, type: 'event' as const }],
  };
  return { raid: { ...raid, phase: 'aftermath', outcome: 'servant', log }, state: newState };
}

// ─── JOIN RAIDER SECT ─────────────────────────────────────────────

export function joinRaiderSect(state: GameState, raiderName: string): GameState {
  // Find matching sect ID
  const sMap: Record<string, string> = {
    'Azure Sky Sect': 'azure_sky', 'Crimson Flame Hall': 'crimson_flame', 'Jade Lotus Pavilion': 'jade_lotus',
    'Iron Blood Sect': 'iron_blood', 'Shadow Veil Order': 'shadow_veil',
  };
  const newSectId = (sMap[raiderName] || 'iron_blood') as GameState['sectId'];
  return {
    ...state,
    sectId: newSectId,
    sectDestroyed: false,
    lastRaidYear: state.year,
    alignment: Math.max(-100, state.alignment - 15),
    log: [...state.log, { year: state.year, age: state.age, text: `🏯 Joined ${raiderName}. Your old sect considers you a traitor.`, type: 'event' as const }],
  };
}

// ─── CAPTIVITY ────────────────────────────────────────────────────

export function processCaptivity(state: GameState): GameState {
  if (!state.captured) return state;
  const c = state.captured;
  const newYears = c.yearsRemaining - 1;
  if (newYears <= 0) {
    // Released
    return {
      ...state,
      captured: null,
      log: [...state.log, { year: state.year, age: state.age, text: `🔓 After ${c.yearsCaptured + 1} years, you are finally released.`, type: 'event' as const }],
    };
  }
  return {
    ...state,
    captured: { ...c, yearsRemaining: newYears, yearsCaptured: c.yearsCaptured + 1 },
    log: [...state.log, { year: state.year, age: state.age, text: `⛓️ Year ${c.yearsCaptured + 1} in captivity. ${newYears} year(s) remain.`, type: 'system' as const }],
  };
}

export function attemptEscape(state: GameState): { success: boolean; state: GameState } {
  if (!state.captured) return { success: false, state };
  const chance = 30 + state.stats.luck * 0.5 + state.realmIdx * 5;
  const success = Math.random() * 100 < chance;

  if (success) {
    return {
      success: true,
      state: {
        ...state,
        captured: null,
        huntedBySect: state.captured.bySect,
        huntedYearsLeft: 5,
        log: [...state.log, { year: state.year, age: state.age, text: `🏃 ESCAPED captivity! ${state.captured.bySect} sends hunters after you.`, type: 'event' as const }],
      },
    };
  }

  const dmg = rand(15, 35);
  return {
    success: false,
    state: {
      ...state,
      hp: Math.max(1, state.hp - dmg),
      log: [...state.log, { year: state.year, age: state.age, text: `❌ Escape attempt failed! Guards beat you. -${dmg} HP.`, type: 'event' as const }],
    },
  };
}

// ─── HUNTED TICK ──────────────────────────────────────────────────

export function processHunted(state: GameState): GameState {
  if (!state.huntedBySect || state.huntedYearsLeft <= 0) {
    return { ...state, huntedBySect: null, huntedYearsLeft: 0 };
  }
  const newYears = state.huntedYearsLeft - 1;
  let s = { ...state, huntedYearsLeft: newYears };
  // Assassin attack chance
  if (Math.random() < 0.3) {
    const dmg = rand(15, 40);
    s = { ...s, hp: Math.max(1, s.hp - dmg) };
    s.log = [...s.log, { year: s.year, age: s.age, text: `🥷 ${state.huntedBySect} assassins attack! -${dmg} HP. (${newYears} years of hunting remain)`, type: 'event' as const }];
  }
  if (newYears <= 0) {
    s = { ...s, huntedBySect: null };
    s.log = [...s.log, { year: s.year, age: s.age, text: `The ${state.huntedBySect} has given up hunting you.`, type: 'system' as const }];
  }
  return s;
}

// ─── RESCUE MISSION ───────────────────────────────────────────────

export function resolveRescueMission(state: GameState): { success: boolean; state: GameState } {
  const chance = 30 + state.stats.strength * 0.3 + state.stats.luck * 0.3 + state.realmIdx * 8;
  const success = Math.random() * 100 < chance;

  if (success) {
    // Rescue the kidnapped child
    const kidnapped = state.children.find(c => !c.alive && c.causeOfDeath?.includes('Kidnapped'));
    let s = { ...state, rescueMissionActive: false };
    if (kidnapped) {
      s = { ...s, children: s.children.map(c => c.id === kidnapped.id ? { ...c, alive: true, causeOfDeath: undefined } : c) };
      s.log = [...s.log, { year: s.year, age: s.age, text: `🦸 RESCUE SUCCESS! ${kidnapped.name} is safe!`, type: 'event' as const }];
    }
    s = { ...s, stats: { ...s.stats, reputation: s.stats.reputation + 15 }, hp: Math.max(1, s.hp - rand(15, 30)) };
    return { success: true, state: s };
  }

  return {
    success: false,
    state: {
      ...state,
      hp: Math.max(1, state.hp - rand(20, 45)),
      log: [...state.log, { year: state.year, age: state.age, text: `❌ Rescue mission failed. You retreat, wounded. (-HP)`, type: 'event' as const }],
    },
  };
}
