import { GameState, Mission, Item, MissionDifficulty } from './types';
import { ALL_ITEMS, MAX_ACTIVE_MISSIONS } from './constants';

export const SYSTEM_MESSAGES: string[] = [
  "Host, your path to immortality has only just begun.",
  "The heavens are watching. Cultivate in secret.",
  "I detect a powerful aura nearby. Proceed with caution.",
  "Your cultivation is progressing... but not fast enough.",
  "A hidden opportunity awaits those who seek it.",
  "Remember: every action has consequences in the Dao.",
  "You are being tested. Show your resolve.",
  "Your past echoes into this life. Use it wisely.",
];

export const SYSTEM_GREETING = "Welcome, Host. I am the Cultivation System. I shall guide you on the path to immortality. Complete missions to earn System Points — my Shop has wonders beyond mortal comprehension.";

// Mission templates with difficulty
const MISSION_TEMPLATES: { type: Mission['type']; desc: string; count: number; difficulty: MissionDifficulty }[] = [
  // Easy missions (2 year deadline)
  { type: 'train', desc: 'Train your body', count: 2, difficulty: 'easy' },
  { type: 'meditate', desc: 'Meditate to gather Qi', count: 2, difficulty: 'easy' },
  { type: 'rest', desc: 'Rest and recover', count: 2, difficulty: 'easy' },
  { type: 'study', desc: 'Study ancient texts', count: 2, difficulty: 'easy' },
  // Medium missions (4 year deadline)
  { type: 'explore', desc: 'Explore the wilderness', count: 4, difficulty: 'medium' },
  { type: 'socialize', desc: 'Build connections with others', count: 3, difficulty: 'medium' },
  { type: 'fight', desc: 'Seek out and win battles', count: 3, difficulty: 'medium' },
  { type: 'train', desc: 'Train your body extensively', count: 5, difficulty: 'medium' },
  { type: 'meditate', desc: 'Achieve deep meditation', count: 5, difficulty: 'medium' },
  // Hard missions (8 year deadline)
  { type: 'fight', desc: 'Become a battle-hardened warrior', count: 8, difficulty: 'hard' },
  { type: 'craft', desc: 'Master the art of crafting', count: 6, difficulty: 'hard' },
  { type: 'explore', desc: 'Uncover hidden secrets of the world', count: 10, difficulty: 'hard' },
  { type: 'socialize', desc: 'Build a vast network of connections', count: 8, difficulty: 'hard' },
];

const DIFFICULTY_DEADLINE: Record<MissionDifficulty, number> = {
  easy: 2,
  medium: 4,
  hard: 8,
};

const DIFFICULTY_REWARD: Record<MissionDifficulty, number> = {
  easy: 8,
  medium: 20,
  hard: 50,
};

// Generate new missions to add to the queue
export function generateNewMissions(year: number, existingCount: number): Mission[] {
  const missions: Mission[] = [];
  // Generate 1-3 new missions based on year
  const toGenerate = Math.min(3, Math.max(1, Math.floor(year / 2) % 3 + 1));
  const shuffled = [...MISSION_TEMPLATES].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < toGenerate; i++) {
    const template = shuffled[i % shuffled.length];
    const deadline = year + DIFFICULTY_DEADLINE[template.difficulty];
    missions.push({
      id: `mission_${year}_${existingCount + i}_${Math.random().toString(36).slice(2, 6)}`,
      description: template.desc,
      target: template.count,
      progress: 0,
      reward: DIFFICULTY_REWARD[template.difficulty] + Math.floor(year * 0.5),
      type: template.type,
      difficulty: template.difficulty,
      deadlineYear: deadline,
      completed: false,
      claimed: false,
      expired: false,
    });
  }
  return missions;
}

// Get active missions (not completed, not expired, not claimed) - max 4
export function getActiveMissions(missions: Mission[]): Mission[] {
  return missions
    .filter(m => !m.completed && !m.expired && !m.claimed)
    .slice(0, MAX_ACTIVE_MISSIONS);
}

// Get queued missions (waiting for slot)
export function getQueuedMissions(missions: Mission[]): Mission[] {
  const active = missions.filter(m => !m.completed && !m.expired && !m.claimed);
  return active.slice(MAX_ACTIVE_MISSIONS);
}

// Get completed but unclaimed missions
export function getCompletedMissions(missions: Mission[]): Mission[] {
  return missions.filter(m => m.completed && !m.claimed);
}

// Check for expired missions and apply penalties
export function processExpiredMissions(state: GameState): GameState {
  const currentYear = state.year;
  let penalty = 0;
  const expiredMessages: string[] = [];
  
  const updatedMissions = state.missions.map(m => {
    if (!m.completed && !m.expired && !m.claimed && m.deadlineYear < currentYear) {
      penalty += 5;
      expiredMessages.push(m.description);
      return { ...m, expired: true };
    }
    return m;
  });
  
  if (penalty > 0) {
    const newLog = [...state.log, {
      year: currentYear,
      age: state.age,
      text: `⚠️ System: ${expiredMessages.length} mission(s) expired! -${penalty} System Points.`,
      type: 'system_msg' as const,
    }];
    return {
      ...state,
      missions: updatedMissions,
      systemPoints: Math.max(0, state.systemPoints - penalty),
      log: newLog,
    };
  }
  
  return { ...state, missions: updatedMissions };
}

// Add new missions if there's room in the queue
export function addYearlyMissions(state: GameState): GameState {
  // Clean up old claimed/expired missions
  const cleanedMissions = state.missions.filter(m => !m.claimed && !m.expired);
  
  // Generate new missions
  const newMissions = generateNewMissions(state.year, cleanedMissions.length);
  
  return {
    ...state,
    missions: [...cleanedMissions, ...newMissions],
  };
}

export function updateMissionProgress(state: GameState, actionType: string): GameState {
  // Only update active missions (first 4 non-completed, non-expired)
  const activeMissionIds = getActiveMissions(state.missions).map(m => m.id);
  
  const newMissions = state.missions.map(m => {
    if (m.completed || m.claimed || m.expired) return m;
    if (!activeMissionIds.includes(m.id)) return m; // Not active, skip
    
    // Match action type to mission type
    const matches = m.type === actionType || 
      (actionType === 'scheme' && m.type === 'explore') ||
      ((actionType === 'alchemy' || actionType === 'smithing') && m.type === 'craft');
    
    if (matches) {
      const newProgress = m.progress + 1;
      const completed = newProgress >= m.target;
      return { ...m, progress: newProgress, completed };
    }
    return m;
  });
  
  return { ...state, missions: newMissions };
}

export function claimMission(state: GameState, missionId: string): GameState {
  const mission = state.missions.find(m => m.id === missionId);
  if (!mission || !mission.completed || mission.claimed) return state;
  
  const newMissions = state.missions.map(m =>
    m.id === missionId ? { ...m, claimed: true } : m
  );
  
  return {
    ...state,
    missions: newMissions,
    systemPoints: state.systemPoints + mission.reward,
    log: [...state.log, {
      year: state.year, age: state.age,
      text: `📦 System: Mission complete! +${mission.reward} System Points.`,
      type: 'system_msg' as const,
    }],
  };
}

export type ShopCategory = 'weapons' | 'armor' | 'artifacts' | 'pills' | 'techniques' | 'materials' | 'special';

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  item: string | null; // null = special effect
  qty: number;
  category: ShopCategory;
  quality: string;
  description: string;
  reqStrength?: number;
}

export const SYSTEM_SHOP: ShopItem[] = [
  // ── WEAPONS ──────────────────────────────────────────────────────
  { id: 'shop_iron_sword', name: 'Iron Sword', cost: 8, item: 'iron_sword', qty: 1, category: 'weapons', quality: 'Common', description: 'A basic iron blade. +3 STR.' },
  { id: 'shop_spirit_sword', name: 'Spirit Sword', cost: 35, item: 'spirit_sword', qty: 1, category: 'weapons', quality: 'Uncommon', description: 'Channels Qi into each strike. +8 STR, +5 Qi.' },
  { id: 'shop_shadow_dagger', name: 'Shadow Dagger', cost: 40, item: 'shadow_dagger', qty: 1, category: 'weapons', quality: 'Uncommon', description: 'High crit chance, low base damage. +5 STR, +8 Luck.' },
  { id: 'shop_jade_blade', name: 'Jade Blade', cost: 80, item: 'jade_blade', qty: 1, category: 'weapons', quality: 'Rare', description: 'Green light trails each swing. +15 STR, +10 Qi.' },
  { id: 'shop_thunder_spear', name: 'Thunder Spear', cost: 120, item: 'thunder_spear', qty: 1, category: 'weapons', quality: 'Rare', description: 'Chance to paralyze per turn. +18 STR, +8 Qi. Req: 50 STR.', reqStrength: 50 },
  { id: 'shop_soul_blade', name: 'Soul Reaver Blade', cost: 250, item: 'soul_blade', qty: 1, category: 'weapons', quality: 'Legendary', description: 'Drains enemy Qi on hit. +30 STR, +20 Qi. Req: 80 STR.', reqStrength: 80 },
  { id: 'shop_dragon_greatsword', name: 'Dragon Bone Greatsword', cost: 500, item: 'dragon_bone_greatsword', qty: 1, category: 'weapons', quality: 'Divine', description: 'Massive damage. +65 STR, +30 Qi. Req: 150 STR.', reqStrength: 150 },

  // ── ARMOR ────────────────────────────────────────────────────────
  { id: 'shop_silk_armor', name: 'Silk Armor', cost: 20, item: 'silk_armor', qty: 1, category: 'armor', quality: 'Uncommon', description: 'Reinforced silk. +5 DEF.' },
  { id: 'shop_moonsilk', name: 'Moonsilk Robe', cost: 65, item: 'moonsilk_robe', qty: 1, category: 'armor', quality: 'Rare', description: 'Light as air, tough as steel. +10 DEF, +5 Qi, +5 Luck.' },
  { id: 'shop_iron_bracelet', name: 'Iron Will Bracelet', cost: 90, item: 'iron_will_bracelet', qty: 1, category: 'armor', quality: 'Rare', description: 'Reduces damage taken by 15%. +12 DEF, +5 Wisdom.' },
  { id: 'shop_shadow_cloak', name: 'Shadow Cloak', cost: 200, item: 'shadow_cloak', qty: 1, category: 'armor', quality: 'Legendary', description: '20% dodge chance. +15 DEF, +10 Luck, +8 Qi.' },
  { id: 'shop_dragon_armor', name: 'Dragon Scale Armor', cost: 300, item: 'dragon_scale_armor', qty: 1, category: 'armor', quality: 'Legendary', description: 'Near-impenetrable. +25 DEF, +10 Qi.' },

  // ── ARTIFACTS ────────────────────────────────────────────────────
  { id: 'shop_jade_pendant', name: 'Jade Pendant', cost: 30, item: 'jade_pendant', qty: 1, category: 'artifacts', quality: 'Uncommon', description: 'Passive +10 HP regen per year.' },
  { id: 'shop_spirit_ring', name: 'Spirit Ring', cost: 75, item: 'spirit_ring', qty: 1, category: 'artifacts', quality: 'Rare', description: 'Holds 1 extra technique slot. +5 Qi, +5 INT.' },
  { id: 'shop_luck_talisman', name: 'Luck Talisman', cost: 80, item: 'luck_talisman', qty: 1, category: 'artifacts', quality: 'Rare', description: 'Permanently +20 Luck on purchase.' },
  { id: 'shop_heaven_bead', name: 'Heaven Defying Bead', cost: 350, item: 'heaven_defying_bead', qty: 1, category: 'artifacts', quality: 'Legendary', description: 'Reduces tribulation failure by 50%. +15 Wisdom, +10 Qi.' },

  // ── PILLS ────────────────────────────────────────────────────────
  { id: 'shop_qi_pill', name: 'Qi Replenishing Pill ×3', cost: 10, item: 'qi_pill', qty: 3, category: 'pills', quality: 'Common', description: 'Restores 30 Qi in battle. Bulk pack of 3.' },
  { id: 'shop_healing_pill', name: 'Healing Pill ×3', cost: 12, item: 'healing_pill', qty: 3, category: 'pills', quality: 'Common', description: 'Restores 50 HP. Bulk pack of 3.' },
  { id: 'shop_wisdom_pill', name: 'Wisdom Pill', cost: 30, item: 'wisdom_pill', qty: 1, category: 'pills', quality: 'Uncommon', description: 'Permanently +5 Wisdom.' },
  { id: 'shop_breakthrough', name: 'Breakthrough Pill', cost: 60, item: 'breakthrough_pill', qty: 1, category: 'pills', quality: 'Rare', description: '+20% success on next breakthrough.' },
  { id: 'shop_poison_pill', name: 'Poison Pill', cost: 40, item: 'poison_pill', qty: 1, category: 'pills', quality: 'Rare', description: 'Poisons enemy for 8 dmg/turn for 3 turns.' },
  { id: 'shop_lifespan_pill', name: 'Lifespan Pill', cost: 150, item: 'lifespan_pill', qty: 1, category: 'pills', quality: 'Legendary', description: 'Extends lifespan by 10 years.' },
  { id: 'shop_heaven_pill', name: 'Heaven Grade Pill', cost: 600, item: 'immortal_pill', qty: 1, category: 'pills', quality: 'Divine', description: 'Instant stage advancement. +200 Qi, +20 Wisdom.' },

  // ── TECHNIQUES / SCROLLS ─────────────────────────────────────────
  { id: 'shop_body_tempering', name: 'Body Tempering Manual', cost: 45, item: 'body_tempering_manual', qty: 1, category: 'techniques', quality: 'Uncommon', description: 'Permanently +15 Strength.' },
  { id: 'shop_wind_steps', name: 'Wind Steps Scroll', cost: 55, item: 'wind_steps_scroll', qty: 1, category: 'techniques', quality: 'Rare', description: 'Retreat success → 80% in battle.' },
  { id: 'shop_taming_scroll', name: 'Beast Taming Scroll', cost: 40, item: 'beast_taming_scroll', qty: 1, category: 'techniques', quality: 'Rare', description: 'Allows taming weakened beasts.' },
  { id: 'shop_formation_mastery', name: 'Formation Mastery Scroll', cost: 70, item: 'formation_mastery_scroll', qty: 1, category: 'techniques', quality: 'Rare', description: 'Unlocks advanced formation crafting.' },
  { id: 'shop_void_strike', name: 'Void Strike Technique', cost: 200, item: 'void_strike_technique', qty: 1, category: 'techniques', quality: 'Legendary', description: 'Attack ignores enemy defense. Costs immense Qi.' },

  // ── MATERIALS ────────────────────────────────────────────────────
  { id: 'shop_spirit_ore', name: 'Spirit Ore ×5', cost: 15, item: 'spirit_ore', qty: 5, category: 'materials', quality: 'Common', description: 'Basic smithing ore. Pack of 5.' },
  { id: 'shop_spirit_herb', name: 'Spirit Herb ×5', cost: 12, item: 'spirit_herb', qty: 5, category: 'materials', quality: 'Common', description: 'Basic alchemy herb. Pack of 5.' },
  { id: 'shop_thunder_core', name: 'Thunder Core', cost: 50, item: 'thunder_core', qty: 1, category: 'materials', quality: 'Rare', description: 'Crystallized lightning essence. Forge thunder weapons.' },
  { id: 'shop_jade_essence', name: 'Jade Essence', cost: 55, item: 'jade_essence', qty: 1, category: 'materials', quality: 'Rare', description: 'Liquified spiritual jade. High-grade crafting ingredient.' },
  { id: 'shop_dragon_scale', name: 'Dragon Scale Fragment', cost: 180, item: 'dragon_scale_fragment', qty: 1, category: 'materials', quality: 'Legendary', description: 'Fragment of a true dragon scale. Legendary-tier crafting.' },
  { id: 'shop_phoenix_feather', name: 'Phoenix Feather', cost: 200, item: 'phoenix_feather', qty: 1, category: 'materials', quality: 'Legendary', description: 'Shed by a true Phoenix. Divine-tier crafting component.' },
  { id: 'shop_divine_metal', name: 'Divine Metal', cost: 400, item: 'divine_metal', qty: 1, category: 'materials', quality: 'Divine', description: 'Forged in celestial furnaces. The rarest material.' },

  // ── SPECIAL ──────────────────────────────────────────────────────
  { id: 'shop_stat_boost', name: 'Universal Stat Boost', cost: 100, item: null, qty: 1, category: 'special', quality: 'Rare', description: 'Instantly +10 to ALL stats.' },
];

export function purchaseFromShop(state: GameState, shopId: string): GameState {
  const shopItem = SYSTEM_SHOP.find(s => s.id === shopId);
  if (!shopItem || state.systemPoints < shopItem.cost) return state;

  // Check strength requirement
  if (shopItem.reqStrength && state.stats.strength < shopItem.reqStrength) return state;

  const newPoints = state.systemPoints - shopItem.cost;
  let s = { ...state, systemPoints: newPoints };

  if (shopItem.item === null) {
    // Universal stat boost
    const st = s.stats;
    s = {
      ...s,
      stats: { ...st, qi: st.qi + 10, strength: st.strength + 10, intelligence: st.intelligence + 10, luck: st.luck + 10, reputation: st.reputation + 10, wisdom: st.wisdom + 10, charm: st.charm + 10, smithing: st.smithing + 10, alchemy: st.alchemy + 10 },
      log: [...s.log, { year: s.year, age: s.age, text: `🛒 System: All stats +10!`, type: 'system_msg' as const }],
    };
  } else {
    const template = ALL_ITEMS.find(i => i.id === shopItem.item);
    if (!template) return state;

    // Materials that add to herbs/ores
    if (template.type === 'material') {
      if (shopItem.item === 'spirit_herb') {
        s = { ...s, herbs: s.herbs + shopItem.qty, log: [...s.log, { year: s.year, age: s.age, text: `🛒 System: +${shopItem.qty} Spirit Herbs!`, type: 'system_msg' as const }] };
      } else if (shopItem.item === 'spirit_ore') {
        s = { ...s, ores: s.ores + shopItem.qty, log: [...s.log, { year: s.year, age: s.age, text: `🛒 System: +${shopItem.qty} Spirit Ore!`, type: 'system_msg' as const }] };
      } else {
        // Other materials go to inventory
        const newItem: Item = { id: `${template.id}_${Date.now()}`, name: template.name, type: template.type as Item['type'], quality: template.quality as Item['quality'], description: template.description, statBonus: template.statBonus, quantity: shopItem.qty };
        s = { ...s, inventory: [...s.inventory, newItem], log: [...s.log, { year: s.year, age: s.age, text: `🛒 System: Purchased ${newItem.name}!`, type: 'system_msg' as const }] };
      }
      return s;
    }

    // Techniques — add to techniques list instead of inventory
    if (template.type === 'technique') {
      const techName = template.name;
      if (!s.techniques.includes(techName)) {
        s = { ...s, techniques: [...s.techniques, techName] };
        if (!s.activeTechnique) s = { ...s, activeTechnique: techName };
      }
      // If it has permanent stat bonuses, apply them
      if (template.statBonus) {
        const st = { ...s.stats };
        for (const [k, v] of Object.entries(template.statBonus)) { if (v) st[k as keyof typeof st] += v; }
        s = { ...s, stats: st };
      }
      s = { ...s, log: [...s.log, { year: s.year, age: s.age, text: `🛒 System: Learned ${techName}!`, type: 'system_msg' as const }] };
      return s;
    }

    // Pills with permanent effects — apply immediately and don't add to inventory
    const effect = (template as any).effect;
    if (effect === 'permanent_stat' && template.statBonus) {
      const st = { ...s.stats };
      for (const [k, v] of Object.entries(template.statBonus)) { if (v) st[k as keyof typeof st] += v; }
      s = { ...s, stats: st, log: [...s.log, { year: s.year, age: s.age, text: `🛒 System: ${template.name} consumed! Stats increased permanently!`, type: 'system_msg' as const }] };
      return s;
    }
    if (effect === 'permanent_luck' && template.statBonus) {
      const st = { ...s.stats };
      for (const [k, v] of Object.entries(template.statBonus)) { if (v) st[k as keyof typeof st] += v; }
      s = { ...s, stats: st, log: [...s.log, { year: s.year, age: s.age, text: `🛒 System: ${template.name} equipped! Luck +20!`, type: 'system_msg' as const }] };
      return s;
    }
    if (effect === 'lifespan_10') {
      s = { ...s, log: [...s.log, { year: s.year, age: s.age, text: `🛒 System: ${template.name} consumed! Lifespan extended by 10 years!`, type: 'system_msg' as const }] };
      // We store this as a maxHp bonus as a proxy for lifespan extension
      s.maxHp += 15;
      s.hp += 15;
      return s;
    }

    // Default — add item to inventory
    const newItem: Item = { id: `${template.id}_${Date.now()}`, name: template.name, type: template.type as Item['type'], quality: template.quality as Item['quality'], description: template.description, statBonus: template.statBonus, quantity: shopItem.qty };
    s = { ...s, inventory: [...s.inventory, newItem], log: [...s.log, { year: s.year, age: s.age, text: `🛒 System: Purchased ${newItem.name}${shopItem.qty > 1 ? ` ×${shopItem.qty}` : ''}!`, type: 'system_msg' as const }] };
  }
  return s;
}

export function getRandomSystemMessage(): string {
  return SYSTEM_MESSAGES[Math.floor(Math.random() * SYSTEM_MESSAGES.length)];
}
