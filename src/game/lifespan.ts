import { GameState } from './types';
import { REALM_LIFESPAN, REALMS } from './constants';

// ─── LIFESPAN CALCULATIONS ────────────────────────────────────────

/** Get the effective max lifespan (realm cap + bonus years) */
export function getEffectiveLifespan(state: GameState): number {
  return state.maxLifespan + state.lifespanBonus;
}

/** Get lifespan percentage used (0-100) */
export function getLifespanPercent(state: GameState): number {
  const max = getEffectiveLifespan(state);
  if (max <= 0) return 100;
  return Math.min(100, (state.age / max) * 100);
}

/** Get years remaining */
export function getYearsRemaining(state: GameState): number {
  return Math.max(0, getEffectiveLifespan(state) - state.age);
}

/** Get aging stage for UI display */
export function getAgingStage(state: GameState): 'young' | 'prime' | 'aging' | 'old' | 'dying' {
  const pct = getLifespanPercent(state);
  if (pct < 40) return 'young';
  if (pct < 60) return 'prime';
  if (pct < 80) return 'aging';
  if (pct < 90) return 'old';
  return 'dying';
}

/** Get aging stage color */
export function getAgingColor(state: GameState): string {
  const stage = getAgingStage(state);
  switch (stage) {
    case 'young': return '#2dd4a0';
    case 'prime': return '#4488ff';
    case 'aging': return '#f0c040';
    case 'old': return '#e67a33';
    case 'dying': return '#e63946';
  }
}

/** Get aging warning message (or null if none) */
export function getAgingWarning(state: GameState): string | null {
  const pct = getLifespanPercent(state);
  const remaining = getYearsRemaining(state);
  if (pct >= 95) return `⚠️ CRITICAL: ${remaining} years left! Breakthrough immediately or perish!`;
  if (pct >= 90) return `⚠️ Your time grows short. Breakthrough or perish. ${remaining} years remain.`;
  if (pct >= 80) return `Your body shows signs of aging. ${remaining} years remain.`;
  return null;
}

// ─── AGING EFFECTS (called each year) ─────────────────────────────

export function processAging(state: GameState): GameState {
  const pct = getLifespanPercent(state);
  let s = { ...state };

  // Update maxLifespan to match current realm (breakthrough extends it)
  const realmCap = REALM_LIFESPAN[s.realmIdx] || 80;
  if (realmCap > s.maxLifespan) {
    s = { ...s, maxLifespan: realmCap };
  }

  // Partner lifespan bonus: +5 years per decade of partnership
  const sp = s.partner;
  if (sp && sp.alive) {
    const partnerYears = s.year - sp.yearMarried;
    if (partnerYears > 0 && partnerYears % 10 === 0) {
      s = { ...s, lifespanBonus: s.lifespanBonus + 5 };
      s.log = [...s.log, { year: s.year, age: s.age, text: `💕 Emotional stability with ${sp.name} extends your lifespan by 5 years.`, type: 'system' as const }];
    }
  }

  // Stat decay after 60% lifespan
  if (pct >= 60 && pct < 80) {
    // Minor decay: -1 strength per decade
    if (s.age % 10 === 0) {
      s = { ...s, stats: { ...s.stats, strength: Math.max(1, s.stats.strength - 1) } };
      s.log = [...s.log, { year: s.year, age: s.age, text: `🕐 The passage of time weakens your body slightly. (-1 Strength)`, type: 'system' as const }];
    }
  } else if (pct >= 80 && pct < 90) {
    // Accelerated decay: -2 strength, -1 qi per decade
    if (s.age % 10 === 0) {
      s = {
        ...s,
        stats: { ...s.stats, strength: Math.max(1, s.stats.strength - 2), qi: Math.max(1, s.stats.qi - 1) },
      };
      s.log = [...s.log, { year: s.year, age: s.age, text: `⏳ Your aging body decays faster. (-2 STR, -1 Qi)`, type: 'system' as const }];
    }
  } else if (pct >= 90) {
    // Severe decay: -3 strength, -2 qi, -1 all per 5 years
    if (s.age % 5 === 0) {
      s = {
        ...s,
        stats: {
          ...s.stats,
          strength: Math.max(1, s.stats.strength - 3),
          qi: Math.max(1, s.stats.qi - 2),
          intelligence: Math.max(1, s.stats.intelligence - 1),
          charm: Math.max(1, s.stats.charm - 1),
        },
      };
      s.log = [...s.log, { year: s.year, age: s.age, text: `💀 Your body withers rapidly. Breakthrough soon or face death! (-3 STR, -2 Qi, -1 INT, -1 Charm)`, type: 'system' as const }];
    }
  }

  return s;
}

// ─── CHECK OLD AGE DEATH ──────────────────────────────────────────

export function checkOldAgeDeath(state: GameState): GameState {
  const max = getEffectiveLifespan(state);
  if (state.age < max) return state;

  // Generate a life summary
  const summary = generateLifeSummary(state);

  return {
    ...state,
    alive: false,
    phase: 'reincarnate',
    log: [...state.log,
      { year: state.year, age: state.age, text: `🕊️ After ${state.age} years of cultivation, your mortal body has reached its limit.`, type: 'death' as const },
      { year: state.year, age: state.age, text: summary, type: 'system' as const },
    ],
  };
}

// ─── LIFE SUMMARY GENERATOR ──────────────────────────────────────

export function generateLifeSummary(state: GameState): string {
  const realmName = REALMS[state.realmIdx] || 'Mortal';
  const parts: string[] = [];

  parts.push(`${state.playerName} lived ${state.age} years, reaching the ${realmName} realm (${state.stage}).`);

  if (state.tribulationsSurvived > 0) {
    parts.push(`Survived ${state.tribulationsSurvived} heavenly tribulation${state.tribulationsSurvived > 1 ? 's' : ''}.`);
  }

  if (state.techniques.length > 0) {
    parts.push(`Mastered ${state.techniques.length} technique${state.techniques.length > 1 ? 's' : ''}.`);
  }

  if (state.partner) {
    if (state.partner.alive) {
      parts.push(`Loved by ${state.partner.name}.`);
    } else {
      parts.push(`Mourned the loss of ${state.partner.name}.`);
    }
  }

  const aliveChildren = state.children.filter(c => c.alive);
  if (aliveChildren.length > 0) {
    parts.push(`Left behind ${aliveChildren.length} child${aliveChildren.length > 1 ? 'ren' : ''}: ${aliveChildren.map(c => c.name).join(', ')}.`);
  }

  if (state.reincarnationCount > 0) {
    parts.push(`This was reincarnation #${state.reincarnationCount + 1}.`);
  }

  const alignment = state.alignment >= 30 ? 'righteous' : state.alignment <= -30 ? 'villainous' : 'balanced';
  parts.push(`Walked a ${alignment} path.`);

  return parts.join(' ');
}

// ─── LIFESPAN EXTENSIONS ──────────────────────────────────────────

export function extendLifespan(state: GameState, years: number, source: string): GameState {
  return {
    ...state,
    lifespanBonus: state.lifespanBonus + years,
    log: [...state.log, { year: state.year, age: state.age, text: `⏳ Lifespan extended by ${years} years! (${source})`, type: 'event' as const }],
  };
}
