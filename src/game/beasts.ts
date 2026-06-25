import { GameState, BeastDef } from './types';
import { BEASTS } from './constants';

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function scaleBeast(beast: BeastDef, realmIdx: number) {
  const scale = 1 + realmIdx * 0.4;
  return {
    ...beast,
    baseHealth: Math.floor(beast.baseHealth * scale),
    baseAttack: Math.floor(beast.baseAttack * scale),
    baseDefense: Math.floor(beast.baseDefense * scale),
  };
}

export function generateBeastEncounter(realmIdx: number): BeastDef | null {
  const eligible = BEASTS.filter(b => b.minRealm <= realmIdx + 1);
  if (eligible.length === 0) return null;
  if (Math.random() > 0.35) return null;
  const weights = eligible.map(b => {
    if (b.minRealm > realmIdx) return 0.3;
    if (b.behavior === 'boss') return 0.02;
    if (b.behavior === 'corrupted') return 0.15;
    return 0.55;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < eligible.length; i++) {
    r -= weights[i];
    if (r <= 0) return eligible[i];
  }
  return eligible[0];
}

export function calculateBeastCombat(
  beast: BeastDef,
  state: GameState
): { victory: boolean; text: string; statChanges: Record<string, number>; hpLoss: number; drops: string[] } {
  const scaled = scaleBeast(beast, state.realmIdx);
  const weaponBonus = state.equippedWeapon ? (state.inventory.find(i => i.id === state.equippedWeapon)?.statBonus?.strength || 0) : 0;
  const armorBonus = state.equippedArmor ? (state.inventory.find(i => i.id === state.equippedArmor)?.statBonus?.strength || 0) : 0;
  const techniqueBonus = state.techniques.length * 5;

  const playerPower = (state.stats.strength + weaponBonus) * 1.5 + state.stats.qi * 0.4 + techniqueBonus;
  const playerDefense = state.stats.strength * 0.5 + (armorBonus || 0) + state.realmIdx * 8;
  const beastPower = scaled.baseAttack;
  const beastDefense = scaled.baseDefense;

  let beastHp = scaled.baseHealth;
  let playerHp = state.hp;
  let rounds = 0;
  const messages: string[] = [];

  // Simulate combat
  while (beastHp > 0 && playerHp > 0 && rounds < 10) {
    rounds++;
    const dmgToBeast = Math.max(1, Math.floor(playerPower - beastDefense * 0.5 + rand(-10, 15)));
    const dmgToPlayer = Math.max(1, Math.floor(beastPower - playerDefense * 0.3 + rand(-8, 12)));

    beastHp -= dmgToBeast;
    playerHp -= dmgToPlayer;
    messages.push(`Round ${rounds}: You deal ${dmgToBeast} damage, beast deals ${dmgToPlayer}.`);

    // Special abilities
    if (beast.behavior === 'fast' && Math.random() > 0.7) {
      messages.push(`${beast.name} uses ${beast.specialAbility} — dodges next attack!`);
      rounds++;
    }
    if (beast.behavior === 'poison' && Math.random() > 0.6) {
      const poisonDmg = rand(5, 15);
      playerHp -= poisonDmg;
      messages.push(`${beast.name} poisons you for ${poisonDmg} damage!`);
    }
    if (beast.behavior === 'tank') {
      messages.push(`${beast.name}'s shell absorbs some damage.`);
    }
    if (beast.behavior === 'aggressive' && Math.random() > 0.6) {
      const bonusDmg = rand(10, 25);
      playerHp -= bonusDmg;
      messages.push(`${beast.name} goes berserk! +${bonusDmg} damage!`);
    }
  }

  const victory = playerHp > 0;
  const hpLoss = Math.max(0, state.hp - Math.max(0, playerHp));

  if (victory) {
    const qiGain = rand(10, 30) + state.realmIdx * 8;
    const strGain = rand(3, 10) + state.realmIdx * 3;
    const drops = beast.drops.filter(() => Math.random() > 0.4);
    const text = `After ${rounds} rounds of fierce combat, you slay the ${beast.name}! ${drops.length > 0 ? `Loot: ${drops.join(', ')}.` : ''}`;
    return {
      victory: true,
      text,
      statChanges: { qi: qiGain, strength: strGain },
      hpLoss,
      drops,
    };
  }

  return {
    victory: false,
    text: `The ${beast.name} overwhelms you after ${rounds} rounds. You barely escape with your life!`,
    statChanges: { strength: rand(1, 4), luck: rand(-2, 1) },
    hpLoss: hpLoss,
    drops: [],
  };
}

export function attemptBeastTaming(beast: BeastDef, state: GameState): { success: boolean; text: string } {
  const tameChance = state.stats.luck + state.stats.wisdom * 0.5 + state.realmIdx * 5;
  if (Math.random() * 100 < tameChance) {
    return { success: true, text: `The ${beast.name} submits to your will! It becomes your companion.` };
  }
  return { success: false, text: `The ${beast.name} resists your taming attempt and flees!` };
}
