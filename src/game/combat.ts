import { GameState, CombatEnemy, BattleState, BattleLogEntry, Stage, EnemyKind, TamedBeast } from './types';
import { REALMS, STAGES, getTotalStage, calculateWinChance } from './constants';

const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ─── ENEMY GENERATION ──────────────────────────────────────────────

interface EnemyTemplate {
  kind: EnemyKind;
  names: string[];
  icons: string[];
  descs: string[];
  hpMul: number;
  atkMul: number;
  defMul: number;
  spdMul: number;
  specials: string[];
  lootPool: string[];
}

const ENEMY_TEMPLATES: Record<EnemyKind, EnemyTemplate> = {
  bandit: {
    kind: 'bandit', names: ['Mountain Bandit', 'Road Thief', 'Rogue Highwayman', 'Desperate Outlaw'],
    icons: ['🗡️'], descs: ['A desperate criminal who preys on travelers.', 'A ruthless thief with quick hands.'],
    hpMul: 0.8, atkMul: 0.9, defMul: 0.6, spdMul: 1.1,
    specials: ['Steal Attempt'], lootPool: ['Stolen Coins', 'Iron Sword', 'Healing Pill'],
  },
  assassin: {
    kind: 'assassin', names: ['Shadow Assassin', 'Silent Blade', 'Night Stalker', 'Phantom Killer'],
    icons: ['🥷'], descs: ['A deadly killer shrouded in darkness.', 'A professional who strikes from the shadows.'],
    hpMul: 0.7, atkMul: 1.3, defMul: 0.5, spdMul: 1.4,
    specials: ['Critical Strike', 'Poison Blade'], lootPool: ['Shadow Cloak', 'Poison Vial', 'Spirit Stones'],
  },
  rogue_cultivator: {
    kind: 'rogue_cultivator', names: ['Fallen Disciple', 'Rogue Cultivator', 'Exiled Swordsman', 'Demonic Practitioner'],
    icons: ['⚔️'], descs: ['A cultivator who abandoned the righteous path.', 'An exile seeking power at any cost.'],
    hpMul: 1.0, atkMul: 1.0, defMul: 0.8, spdMul: 1.0,
    specials: ['Technique Counter', 'Qi Disruption'], lootPool: ['Spirit Sword', 'Qi Pill', 'Technique Scroll'],
  },
  beast: {
    kind: 'beast', names: ['Spirit Fox', 'Thunder Wolf', 'Stone Tortoise', 'Jade Serpent', 'Roc Bird', 'Demon Bear'],
    icons: ['🦊', '🐺', '🐢', '🐍', '🦅', '🐻'], descs: ['A spirit beast radiating primal energy.', 'An ancient creature protecting its territory.'],
    hpMul: 1.2, atkMul: 1.0, defMul: 0.9, spdMul: 0.9,
    specials: ['Multi-Strike', 'Stun Roar'], lootPool: ['Beast Core', 'Spirit Fang', 'Rare Hide', 'Lightning Core'],
  },
  boss: {
    kind: 'boss', names: ['Demonic Sect Leader', 'Ancient Dragon', 'Void Devourer', 'Heavenly Demon King'],
    icons: ['🐉', '👹', '💀', '😈'], descs: ['An overwhelmingly powerful being of legend.', 'A calamity-level threat that shakes the heavens.'],
    hpMul: 2.0, atkMul: 1.5, defMul: 1.2, spdMul: 1.0,
    specials: ['Double Strike', 'Annihilation Wave'], lootPool: ['Dragon Heart', 'Divine Metal', 'Immortal Pill Fragment', 'Heaven Reaver Shard'],
  },
};

export function generateEnemy(playerRealmIdx: number, playerStage: Stage, forceKind?: EnemyKind): CombatEnemy {
  // Pick enemy kind — weighted, bosses rare
  let kind: EnemyKind;
  if (forceKind) {
    kind = forceKind;
  } else {
    const roll = Math.random();
    if (roll < 0.30) kind = 'bandit';
    else if (roll < 0.50) kind = 'assassin';
    else if (roll < 0.75) kind = 'rogue_cultivator';
    else if (roll < 0.93) kind = 'beast';
    else kind = 'boss';
  }

  const tmpl = ENEMY_TEMPLATES[kind];

  // Determine enemy realm — NOT scaled to player
  let eRealmIdx: number;
  let eStage: Stage;
  if (kind === 'bandit') {
    eRealmIdx = Math.max(0, playerRealmIdx + rand(-2, 0));
  } else if (kind === 'assassin') {
    eRealmIdx = Math.max(0, playerRealmIdx + rand(-1, 1));
  } else if (kind === 'rogue_cultivator') {
    eRealmIdx = Math.max(0, playerRealmIdx + rand(-1, 2));
  } else if (kind === 'beast') {
    eRealmIdx = Math.max(0, playerRealmIdx + rand(-1, 1));
  } else {
    // Boss: always at or above player
    eRealmIdx = Math.min(10, playerRealmIdx + rand(1, 3));
  }
  eRealmIdx = Math.min(eRealmIdx, REALMS.length - 2);
  eStage = STAGES[rand(0, 2)];

  // Base stats scale with total stage value
  const totalStage = getTotalStage(eRealmIdx, eStage);
  const baseHp = 40 + totalStage * 18;
  const baseAtk = 8 + totalStage * 5;
  const baseDef = 4 + totalStage * 3;
  const baseSpd = 5 + totalStage * 2;

  const name = pick(tmpl.names);
  const iconIdx = Math.floor(Math.random() * tmpl.icons.length);

  return {
    id: `enemy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    kind,
    icon: tmpl.icons[iconIdx] || tmpl.icons[0],
    description: pick(tmpl.descs),
    realmIdx: eRealmIdx,
    stage: eStage,
    maxHp: Math.floor(baseHp * tmpl.hpMul),
    hp: Math.floor(baseHp * tmpl.hpMul),
    attack: Math.floor(baseAtk * tmpl.atkMul),
    defense: Math.floor(baseDef * tmpl.defMul),
    speed: Math.floor(baseSpd * tmpl.spdMul),
    isBeast: kind === 'beast',
    loot: tmpl.lootPool.filter(() => Math.random() > 0.5).slice(0, 3),
    specialAbility: pick(tmpl.specials),
  };
}

// ─── BATTLE STATE CREATION ─────────────────────────────────────────

export function createBattleState(state: GameState, enemy: CombatEnemy): BattleState {
  return {
    phase: 'encounter',
    enemy,
    playerHp: state.hp,
    playerMaxHp: state.maxHp,
    playerQi: state.stats.qi,
    playerMaxQi: Math.max(state.stats.qi, 100),
    turn: 1,
    maxTurns: 3,
    log: [],
    lootGained: [],
    statRewards: {},
    spReward: 0,
    playerStunned: false,
    enemyStunned: false,
    poisonDamage: 0,
  };
}

// ─── RETREAT ───────────────────────────────────────────────────────

export function attemptRetreat(bs: BattleState, playerSpeed: number): BattleState {
  const escapeChance = 40 + (playerSpeed - bs.enemy.speed) * 2;
  const roll = Math.random() * 100;
  if (roll < escapeChance) {
    return { ...bs, phase: 'fled', log: [...bs.log, { text: 'You disengage and escape!', actor: 'system' }] };
  }
  // Failed — enemy gets a free hit
  const dmg = Math.max(1, Math.floor(bs.enemy.attack * 0.6));
  const newHp = Math.max(0, bs.playerHp - dmg);
  const logs: BattleLogEntry[] = [
    ...bs.log,
    { text: 'Retreat failed!', actor: 'system' },
    { text: `${bs.enemy.name} strikes as you turn — ${dmg} damage!`, actor: 'enemy' },
  ];
  if (newHp <= 0) {
    return { ...bs, playerHp: 0, phase: 'defeat', log: [...logs, { text: 'You collapse from the blow...', actor: 'system' }] };
  }
  return { ...bs, playerHp: newHp, log: logs };
}

export function attemptBattleRetreat(bs: BattleState, playerSpeed: number): BattleState {
  const escapeChance = 50 + (playerSpeed - bs.enemy.speed);
  if (Math.random() * 100 < escapeChance) {
    return { ...bs, phase: 'fled', log: [...bs.log, { text: 'You break away and flee!', actor: 'system' }] };
  }
  const dmg = Math.max(1, Math.floor(bs.enemy.attack * 0.5));
  const newHp = Math.max(0, bs.playerHp - dmg);
  const logs: BattleLogEntry[] = [...bs.log, { text: `Retreat failed! ${bs.enemy.name} hits you for ${dmg}.`, actor: 'enemy' }];
  if (newHp <= 0) return { ...bs, playerHp: 0, phase: 'defeat', log: [...logs, { text: 'You fall...', actor: 'system' }] };
  return { ...bs, playerHp: newHp, log: logs };
}

// ─── PLAYER ACTIONS ────────────────────────────────────────────────

function calcPlayerDamage(base: number, enemyDef: number): number {
  const variance = 1 + (Math.random() * 0.4 - 0.2); // ±20%
  return Math.max(1, Math.floor((base - enemyDef * 0.3) * variance));
}

export function playerAttack(bs: BattleState, strength: number, tamedBeast: TamedBeast | null): BattleState {
  if (bs.playerStunned) {
    return { ...bs, playerStunned: false, log: [...bs.log, { text: 'You are stunned and cannot act!', actor: 'system' }] };
  }
  let atkPower = strength + (tamedBeast?.attackBonus || 0);
  const dmg = calcPlayerDamage(atkPower, bs.enemy.defense);
  const newEnemyHp = Math.max(0, bs.enemy.hp - dmg);
  const logs: BattleLogEntry[] = [...bs.log, { text: `You strike for ${dmg} damage!`, actor: 'player' }];
  const enemy = { ...bs.enemy, hp: newEnemyHp };
  if (newEnemyHp <= 0) return finishVictory({ ...bs, enemy, log: logs });
  return { ...bs, enemy, log: logs };
}

export function playerUseTechnique(bs: BattleState, strength: number, qi: number, techName: string, tamedBeast: TamedBeast | null): BattleState {
  if (bs.playerStunned) {
    return { ...bs, playerStunned: false, log: [...bs.log, { text: 'You are stunned!', actor: 'system' }] };
  }
  const qiCost = 15 + bs.enemy.realmIdx * 5;
  if (bs.playerQi < qiCost) {
    return { ...bs, log: [...bs.log, { text: `Not enough Qi! (need ${qiCost})`, actor: 'system' }] };
  }
  const atkPower = strength * 1.6 + qi * 0.3 + (tamedBeast?.attackBonus || 0);
  const dmg = calcPlayerDamage(atkPower, bs.enemy.defense * 0.5);
  const newEnemyHp = Math.max(0, bs.enemy.hp - dmg);
  const logs: BattleLogEntry[] = [...bs.log, { text: `${techName}! ${dmg} damage! (-${qiCost} Qi)`, actor: 'player' }];
  const enemy = { ...bs.enemy, hp: newEnemyHp };
  const newQi = bs.playerQi - qiCost;
  if (newEnemyHp <= 0) return finishVictory({ ...bs, enemy, playerQi: newQi, log: logs });
  return { ...bs, enemy, playerQi: newQi, log: logs };
}

export function playerUseWeapon(bs: BattleState, strength: number, weaponBonus: number, weaponName: string, tamedBeast: TamedBeast | null): BattleState {
  if (bs.playerStunned) {
    return { ...bs, playerStunned: false, log: [...bs.log, { text: 'You are stunned!', actor: 'system' }] };
  }
  const atkPower = strength + weaponBonus * 2 + (tamedBeast?.attackBonus || 0);
  const dmg = calcPlayerDamage(atkPower, bs.enemy.defense * 0.6);
  const newEnemyHp = Math.max(0, bs.enemy.hp - dmg);
  const logs: BattleLogEntry[] = [...bs.log, { text: `You slash with ${weaponName} for ${dmg} damage!`, actor: 'player' }];
  const enemy = { ...bs.enemy, hp: newEnemyHp };
  if (newEnemyHp <= 0) return finishVictory({ ...bs, enemy, log: logs });
  return { ...bs, enemy, log: logs };
}

export function playerUseItem(bs: BattleState, itemName: string, hpRestore: number, qiRestore: number): BattleState {
  if (bs.playerStunned) {
    return { ...bs, playerStunned: false, log: [...bs.log, { text: 'You are stunned!', actor: 'system' }] };
  }
  const parts: string[] = [];
  let newHp = bs.playerHp;
  let newQi = bs.playerQi;
  if (hpRestore > 0) { newHp = Math.min(bs.playerMaxHp, newHp + hpRestore); parts.push(`+${hpRestore} HP`); }
  if (qiRestore > 0) { newQi = Math.min(bs.playerMaxQi, newQi + qiRestore); parts.push(`+${qiRestore} Qi`); }
  return { ...bs, playerHp: newHp, playerQi: newQi, log: [...bs.log, { text: `Used ${itemName}! ${parts.join(', ')}`, actor: 'player' }] };
}

// ─── ENEMY TURN ────────────────────────────────────────────────────

export function enemyTurn(bs: BattleState, armorDef: number, tamedBeast: TamedBeast | null): BattleState {
  if (bs.enemyStunned) {
    return { ...bs, enemyStunned: false, log: [...bs.log, { text: `${bs.enemy.name} is stunned!`, actor: 'system' }] };
  }

  let newBs = { ...bs };
  const logs: BattleLogEntry[] = [...bs.log];
  const totalDef = armorDef + (tamedBeast?.defenseBonus || 0);

  // Apply poison damage to player first
  if (bs.poisonDamage > 0) {
    const pDmg = bs.poisonDamage;
    newBs = { ...newBs, playerHp: Math.max(0, newBs.playerHp - pDmg) };
    logs.push({ text: `Poison deals ${pDmg} damage!`, actor: 'enemy' });
    if (newBs.playerHp <= 0) return { ...newBs, phase: 'defeat', log: [...logs, { text: 'The poison finishes you...', actor: 'system' }] };
  }

  const { enemy } = bs;
  const numAttacks = enemy.kind === 'boss' ? 2 : 1;

  for (let i = 0; i < numAttacks; i++) {
    // Check for special abilities
    const useSpecial = Math.random() < 0.35;
    let dmg: number;
    let msg: string;

    if (useSpecial) {
      switch (enemy.specialAbility) {
        case 'Steal Attempt': {
          msg = `${enemy.name} tries to steal from you!`;
          dmg = Math.max(1, Math.floor(enemy.attack * 0.4 - totalDef * 0.2));
          break;
        }
        case 'Critical Strike': {
          dmg = Math.max(1, Math.floor(enemy.attack * 1.8 - totalDef * 0.3));
          msg = `${enemy.name} lands a critical strike! ${dmg} damage!`;
          break;
        }
        case 'Poison Blade': {
          dmg = Math.max(1, Math.floor(enemy.attack * 0.7 - totalDef * 0.3));
          const poisonAmt = rand(3, 8);
          newBs = { ...newBs, poisonDamage: newBs.poisonDamage + poisonAmt };
          msg = `${enemy.name} poisons you! ${dmg} damage + ${poisonAmt}/turn poison!`;
          break;
        }
        case 'Technique Counter': {
          dmg = Math.max(1, Math.floor(enemy.attack * 1.3 - totalDef * 0.2));
          msg = `${enemy.name} counters with a technique! ${dmg} damage!`;
          break;
        }
        case 'Qi Disruption': {
          dmg = Math.max(1, Math.floor(enemy.attack * 0.6 - totalDef * 0.3));
          const qiLoss = rand(10, 25);
          newBs = { ...newBs, playerQi: Math.max(0, newBs.playerQi - qiLoss) };
          msg = `${enemy.name} disrupts your Qi! ${dmg} damage, -${qiLoss} Qi!`;
          break;
        }
        case 'Multi-Strike': {
          const hits = rand(2, 3);
          dmg = 0;
          for (let h = 0; h < hits; h++) dmg += Math.max(1, Math.floor(enemy.attack * 0.5 - totalDef * 0.15));
          msg = `${enemy.name} hits ${hits} times for ${dmg} total damage!`;
          break;
        }
        case 'Stun Roar': {
          dmg = Math.max(1, Math.floor(enemy.attack * 0.7 - totalDef * 0.3));
          newBs = { ...newBs, playerStunned: true };
          msg = `${enemy.name} roars! ${dmg} damage — you are STUNNED!`;
          break;
        }
        case 'Double Strike': {
          dmg = Math.max(1, Math.floor(enemy.attack * 1.4 - totalDef * 0.3));
          msg = `${enemy.name} unleashes a devastating double strike! ${dmg} damage!`;
          break;
        }
        case 'Annihilation Wave': {
          dmg = Math.max(1, Math.floor(enemy.attack * 2.0 - totalDef * 0.2));
          msg = `${enemy.name} fires an Annihilation Wave! ${dmg} damage!`;
          break;
        }
        default: {
          dmg = Math.max(1, Math.floor(enemy.attack - totalDef * 0.3));
          msg = `${enemy.name} attacks for ${dmg} damage.`;
        }
      }
    } else {
      dmg = Math.max(1, Math.floor(enemy.attack * (0.8 + Math.random() * 0.4) - totalDef * 0.3));
      msg = `${enemy.name} attacks for ${dmg} damage.`;
    }

    newBs = { ...newBs, playerHp: Math.max(0, newBs.playerHp - dmg) };
    logs.push({ text: msg, actor: 'enemy' });

    if (newBs.playerHp <= 0) {
      return { ...newBs, phase: 'defeat', log: [...logs, { text: 'You have been defeated...', actor: 'system' }] };
    }
  }

  return { ...newBs, log: logs };
}

// ─── ROUND ADVANCEMENT ─────────────────────────────────────────────

export function advanceTurn(bs: BattleState): BattleState {
  const nextTurn = bs.turn + 1;
  if (nextTurn > bs.maxTurns) {
    // Stalemate
    const staleDmg = rand(5, 15);
    return {
      ...bs,
      turn: nextTurn,
      phase: 'stalemate',
      playerHp: Math.max(1, bs.playerHp - staleDmg),
      enemy: { ...bs.enemy, hp: Math.max(1, bs.enemy.hp - staleDmg) },
      log: [...bs.log, { text: `Neither side can land a finishing blow. Both retreat with minor wounds (-${staleDmg} HP).`, actor: 'system' }],
    };
  }
  return { ...bs, turn: nextTurn, log: [...bs.log, { text: `── Round ${nextTurn} ──`, actor: 'system' }] };
}

// ─── VICTORY ───────────────────────────────────────────────────────

function finishVictory(bs: BattleState): BattleState {
  const eStage = getTotalStage(bs.enemy.realmIdx, bs.enemy.stage);
  const qiGain = rand(5, 15) + eStage * 3;
  const strGain = rand(2, 6) + Math.floor(eStage * 0.5);
  const spGain = rand(3, 8) + eStage * 2;
  const repGain = rand(1, 4) + (bs.enemy.kind === 'boss' ? 10 : 0);

  const isTameEligible = bs.enemy.isBeast && bs.enemy.hp <= 0;

  return {
    ...bs,
    phase: isTameEligible ? 'tame_prompt' : 'victory',
    lootGained: bs.enemy.loot,
    statRewards: { qi: qiGain, strength: strGain, reputation: repGain },
    spReward: spGain,
    log: [...bs.log, { text: `${bs.enemy.name} is defeated!`, actor: 'system' }],
  };
}

// ─── TAMING ────────────────────────────────────────────────────────

export function attemptTame(bs: BattleState, luck: number, hasTamingScroll: boolean): { success: boolean; beast?: TamedBeast } {
  let chance = 20 + luck * 0.5;
  if (hasTamingScroll) chance += 30;
  if (Math.random() * 100 < chance) {
    return {
      success: true,
      beast: {
        name: bs.enemy.name,
        icon: bs.enemy.icon,
        buffLabel: `+${Math.floor(bs.enemy.attack * 0.15)} ATK, +${Math.floor(bs.enemy.defense * 0.15)} DEF`,
        attackBonus: Math.floor(bs.enemy.attack * 0.15),
        defenseBonus: Math.floor(bs.enemy.defense * 0.15),
      },
    };
  }
  return { success: false };
}
