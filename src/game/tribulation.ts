import { GameState, TribulationState, TribulationWave, TribulationAction } from './types';
import { REALMS } from './constants';

const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

// Realms that require tribulation (entering Early stage of these)
export const TRIBULATION_REALMS = [4, 5, 6, 7, 8, 9, 10]; // Nascent Soul through True Immortal

export function requiresTribulation(targetRealmIdx: number, targetStage: string): boolean {
  return TRIBULATION_REALMS.includes(targetRealmIdx) && targetStage === 'Early';
}

// ─── WAVE DESCRIPTIONS ────────────────────────────────────────────

const WAVE_DESCS: Record<number, string[]> = {
  1: [
    'Dark clouds gather overhead, swirling into a massive vortex. A single bolt of violet lightning descends — the first test of the heavens.',
    'The sky splits with a deafening crack. A pillar of golden lightning crashes down, scorching the earth around you.',
    'Thunder shakes the mountains as the first tribulation bolt forms — a serpent of pure heavenly energy coiling above your head.',
  ],
  2: [
    'The clouds thicken, turning black as ink. Two bolts strike simultaneously, intertwining into a spiral of devastating energy.',
    'The heavens roar with fury. The second wave is denser, heavier — each bolt carries the weight of a mountain.',
    'Tribulation lightning rains down in sheets. The ground beneath your feet cracks and melts from the residual energy.',
  ],
  3: [
    'The entire sky becomes a sea of lightning. The third and final wave descends — a pillar wide enough to swallow a city, pulsing with the wrath of heaven itself.',
    'Space distorts around you as the final bolt takes form — not lightning, but concentrated heavenly law, seeking to erase your very existence.',
    'The tribulation cloud compresses into a single, impossibly dense sphere of energy. When it descends, reality itself screams.',
  ],
  4: [
    'Just when you thought it was over, the clouds reform. A fourth wave — tribulation within tribulation. The heavens refuse to let you pass easily.',
    'The sky turns blood-red. A bolt of crimson lightning, infused with the Dao of Destruction, descends with apocalyptic force.',
  ],
  5: [
    'The final wave. The tribulation cloud transforms into the shape of a divine eye — the Eye of Heaven, judging your very soul. A beam of pure white light descends.',
    'Heaven and earth converge. The last bolt is not lightning at all — it is the manifestation of the Heavenly Dao itself, testing whether you are worthy of immortality.',
  ],
};

const CINEMATIC_SUCCESS: Record<number, string> = {
  4: 'The storm breaks. Golden light pours through the clouds as the heavens acknowledge your advancement to Nascent Soul. Your soul separates from your body for the first time — a tiny, luminous version of yourself, floating serenely above. You have transcended the limits of ordinary cultivation.',
  5: 'The tribulation clouds disperse in a shower of spiritual rain. Your soul transforms, no longer bound by mortal constraints. The very fabric of your being shifts — you can feel the laws of the universe responding to your will. Soul Transformation is complete.',
  6: 'Reality fractures around you, then reforms. You stand at the boundary between existence and the void, and for the first time, you can see the cracks in the world. Void Refinement grants you dominion over space itself.',
  7: 'Your body, soul, and Qi merge into a single, perfect whole. The distinction between flesh and spirit dissolves — you ARE cultivation incarnate. Body Integration makes you a being beyond mortal comprehension.',
  8: 'The Mahayana realm opens before you like a flower blooming in fast-forward. You can hear the whispers of the Great Dao, feel the pulse of the universe. You are no longer walking the path — you ARE the path.',
  9: 'The heavens have tested you and found you worthy. Tribulation Transcendence — you have overcome the very laws that bind reality. Time, space, and causality bend around you like water around a stone.',
  10: 'The final tribulation shatters. For one eternal moment, you see EVERYTHING — every star, every soul, every thread of fate woven through the cosmos. Then the vision fades, and you stand reborn. You are a True Immortal. The heavens themselves bow.',
};

// ─── CREATE TRIBULATION ───────────────────────────────────────────

export function createTribulationState(state: GameState, targetRealmIdx: number, targetStage: string): TribulationState {
  // Determine number of waves
  let totalWaves = 3;
  if (targetRealmIdx >= 8) totalWaves = 4; // Mahayana+
  if (targetRealmIdx >= 10) totalWaves = 5; // True Immortal

  // Base damage scales with realm
  const baseDmgScale = 20 + (targetRealmIdx - 4) * 15; // 20 for Nascent Soul, 110 for True Immortal

  const waves: TribulationWave[] = [];
  for (let i = 1; i <= totalWaves; i++) {
    const waveMultiplier = 1 + (i - 1) * 0.5; // Each wave 50% stronger
    const descs = WAVE_DESCS[i] || WAVE_DESCS[3];
    waves.push({
      number: i,
      baseDamage: Math.floor(baseDmgScale * waveMultiplier),
      description: descs[Math.floor(Math.random() * descs.length)],
    });
  }

  // Check for Heaven Defying Bead
  const hasHeavenBead = state.inventory.some(i =>
    i.name.toLowerCase().includes('heaven defying') || i.name.toLowerCase().includes('heaven_defying')
  );

  // Wisdom bonus: +10% deflect per 50 wisdom
  const wisdomBonus = Math.floor(state.stats.wisdom / 50) * 10;

  return {
    phase: 'warning',
    targetRealmIdx,
    targetStage,
    currentWave: 0,
    totalWaves,
    waves,
    playerHp: state.hp,
    playerMaxHp: state.maxHp,
    playerQi: state.stats.qi,
    playerMaxQi: Math.max(state.stats.qi, 200),
    resistanceBuilt: 0,
    log: [],
    statBonuses: {},
    hasHeavenBead,
    wisdomBonus,
  };
}

// ─── RESOLVE WAVE ACTION ──────────────────────────────────────────

export function resolveTribulationAction(ts: TribulationState, action: TribulationAction): TribulationState {
  const wave = ts.waves[ts.currentWave];
  if (!wave) return ts;

  let damage = wave.baseDamage;
  let qiCost = 0;
  let logEntry = '';
  let bonuses: Partial<Record<string, number>> = { ...ts.statBonuses };
  let resistance = ts.resistanceBuilt;

  // Heaven Defying Bead: -50% damage
  if (ts.hasHeavenBead) {
    damage = Math.floor(damage * 0.5);
  }

  // Apply built resistance from previous Endure actions
  damage = Math.max(1, damage - resistance * 3);

  switch (action) {
    case 'endure': {
      // Take full damage but build resistance for future waves
      const finalDmg = damage;
      resistance += rand(3, 6);
      logEntry = `You grit your teeth and endure the heavenly lightning. It courses through your body like molten fire — ${finalDmg} damage! But your body adapts, building resistance.`;
      const newHp = Math.max(0, ts.playerHp - finalDmg);
      if (newHp <= 0) {
        return { ...ts, playerHp: 0, phase: 'failure', resistanceBuilt: resistance, log: [...ts.log, logEntry, '💀 The tribulation lightning overwhelms you. Your body cannot withstand the wrath of heaven...'] };
      }
      return {
        ...ts, playerHp: newHp, resistanceBuilt: resistance,
        log: [...ts.log, logEntry, `(Resistance built: ${resistance}. -${finalDmg} HP)`],
        statBonuses: { ...bonuses, strength: (bonuses.strength || 0) + rand(2, 5) },
        phase: 'between_waves',
      };
    }

    case 'deflect': {
      // Costs heavy Qi, reduces damage significantly
      qiCost = Math.floor(30 + ts.targetRealmIdx * 10);
      const deflectChance = 60 + ts.wisdomBonus; // Base 60% + wisdom bonus
      const roll = Math.random() * 100;

      if (ts.playerQi < qiCost) {
        // Not enough Qi — partial deflect, still take heavy damage
        const finalDmg = Math.floor(damage * 0.7);
        logEntry = `You attempt to deflect with Qi, but your reserves are too low! The lightning partially breaks through — ${finalDmg} damage!`;
        const newHp = Math.max(0, ts.playerHp - finalDmg);
        if (newHp <= 0) {
          return { ...ts, playerHp: 0, phase: 'failure', log: [...ts.log, logEntry, '💀 Without sufficient Qi, the tribulation claims you...'] };
        }
        return { ...ts, playerHp: newHp, phase: 'between_waves', log: [...ts.log, logEntry, `(-${finalDmg} HP, not enough Qi to fully deflect)`] };
      }

      if (roll < deflectChance) {
        const finalDmg = Math.floor(damage * 0.25); // Only 25% damage on success
        logEntry = `Your Qi surges outward in a brilliant shield! The tribulation lightning shatters against your barrier — only ${finalDmg} damage bleeds through!`;
        const newHp = Math.max(0, ts.playerHp - finalDmg);
        const newQi = ts.playerQi - qiCost;
        return {
          ...ts, playerHp: newHp, playerQi: newQi, phase: newHp <= 0 ? 'failure' : 'between_waves',
          log: [...ts.log, logEntry, `(-${finalDmg} HP, -${qiCost} Qi)`],
          statBonuses: { ...bonuses, qi: (bonuses.qi || 0) + rand(3, 8) },
        };
      } else {
        const finalDmg = Math.floor(damage * 0.6); // Partial success
        logEntry = `Your Qi shield cracks under the heavenly pressure! Partial deflection — ${finalDmg} damage and heavy Qi drain!`;
        const newHp = Math.max(0, ts.playerHp - finalDmg);
        const newQi = Math.max(0, ts.playerQi - qiCost);
        if (newHp <= 0) {
          return { ...ts, playerHp: 0, playerQi: newQi, phase: 'failure', log: [...ts.log, logEntry, '💀 The partial deflection wasn\'t enough...'] };
        }
        return { ...ts, playerHp: newHp, playerQi: newQi, phase: 'between_waves', log: [...ts.log, logEntry, `(-${finalDmg} HP, -${qiCost} Qi)`] };
      }
    }

    case 'absorb': {
      // High risk, high reward
      const absorbChance = 25 + Math.floor(ts.wisdomBonus * 0.5) + ts.resistanceBuilt; // Hard!
      const roll = Math.random() * 100;

      if (roll < absorbChance) {
        // SUCCESS — take minimal damage, gain huge stats
        const finalDmg = Math.floor(damage * 0.15);
        const qiGain = rand(15, 30) + ts.targetRealmIdx * 5;
        const strGain = rand(5, 12);
        const wisGain = rand(3, 8);
        logEntry = `INCREDIBLE! You open your meridians wide and ABSORB the tribulation lightning! Heavenly energy fuses with your cultivation base, transforming raw destruction into power!`;
        const newHp = Math.max(0, ts.playerHp - finalDmg);
        if (newHp <= 0) {
          return { ...ts, playerHp: 0, phase: 'failure', log: [...ts.log, logEntry, '💀 The absorption overwhelmed your body...'] };
        }
        return {
          ...ts, playerHp: newHp, playerQi: ts.playerQi + qiGain, phase: 'between_waves',
          log: [...ts.log, logEntry, `(-${finalDmg} HP, +${qiGain} Qi, +${strGain} STR, +${wisGain} WIS!)`],
          statBonuses: { ...bonuses, qi: (bonuses.qi || 0) + qiGain, strength: (bonuses.strength || 0) + strGain, wisdom: (bonuses.wisdom || 0) + wisGain },
        };
      } else {
        // FAILURE — massive damage
        const finalDmg = Math.floor(damage * 1.5);
        logEntry = `The tribulation lightning tears through your meridians as you try to absorb it! The raw heavenly energy is too much — it ravages your body from the inside out!`;
        const newHp = Math.max(0, ts.playerHp - finalDmg);
        if (newHp <= 0) {
          return { ...ts, playerHp: 0, phase: 'failure', log: [...ts.log, logEntry, '💀 The absorption attempt proves fatal. The heavens show no mercy to the greedy...'] };
        }
        return {
          ...ts, playerHp: newHp, phase: 'between_waves',
          log: [...ts.log, logEntry, `(-${finalDmg} HP! Absorption failed!)`],
        };
      }
    }
  }
}

// ─── ADVANCE TO NEXT WAVE ─────────────────────────────────────────

export function advanceToNextWave(ts: TribulationState): TribulationState {
  const nextWave = ts.currentWave + 1;
  if (nextWave >= ts.totalWaves) {
    // All waves survived — SUCCESS!
    return { ...ts, phase: 'success', currentWave: nextWave };
  }
  return { ...ts, phase: 'wave', currentWave: nextWave };
}

// ─── USE HEALING PILL BETWEEN WAVES ───────────────────────────────

export function usePillBetweenWaves(ts: TribulationState, hpRestore: number): TribulationState {
  const newHp = Math.min(ts.playerMaxHp, ts.playerHp + hpRestore);
  return {
    ...ts, playerHp: newHp,
    log: [...ts.log, `💊 You quickly consume a healing pill! (+${hpRestore} HP)`],
  };
}

// ─── GET CINEMATIC TEXT ───────────────────────────────────────────

export function getCinematicText(realmIdx: number): string {
  return CINEMATIC_SUCCESS[realmIdx] || `The tribulation clouds part, revealing a sky of purest azure. You have survived the wrath of heaven and emerged stronger. The realm of ${REALMS[realmIdx]} is now yours.`;
}
