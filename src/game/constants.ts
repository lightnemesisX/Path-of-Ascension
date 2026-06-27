import { Background, SectId, Stage, BeastDef, Gender, NpcPersonality } from './types';

// ─── REALMS ────────────────────────────────────────────────────────
export const REALMS = [
  'Mortal', 'Qi Condensation', 'Foundation Building', 'Core Formation',
  'Nascent Soul', 'Soul Transformation', 'Void Refinement', 'Body Integration',
  'Mahayana', 'Tribulation Transcendence', 'True Immortal', '???',
] as const;

export const STAGES: Stage[] = ['Early', 'Mid', 'Late'];

// Qi thresholds to REACH each stage (not the range, but the minimum to attempt breakthrough)
export const REALM_QI_THRESHOLDS: Record<number, Record<Stage, number>> = {
  0: { Early: 0, Mid: 0, Late: 0 },           // Mortal (no stages)
  1: { Early: 50, Mid: 120, Late: 200 },      // Qi Condensation
  2: { Early: 300, Mid: 450, Late: 600 },     // Foundation Building
  3: { Early: 800, Mid: 1000, Late: 1300 },   // Core Formation
  4: { Early: 1600, Mid: 2000, Late: 2500 },  // Nascent Soul
  5: { Early: 3000, Mid: 3800, Late: 4800 },  // Soul Transformation
  6: { Early: 6000, Mid: 7500, Late: 9500 },  // Void Refinement
  7: { Early: 12000, Mid: 15000, Late: 19000 }, // Body Integration
  8: { Early: 24000, Mid: 30000, Late: 38000 }, // Mahayana
  9: { Early: 48000, Mid: 60000, Late: 75000 }, // Tribulation Transcendence
  10: { Early: 95000, Mid: 120000, Late: 150000 }, // True Immortal
  11: { Early: 200000, Mid: 250000, Late: 300000 }, // ???
};

// Base success chance for breakthrough (decreases with higher realms)
export const BREAKTHROUGH_BASE_CHANCE: Record<number, number> = {
  0: 100, // Mortal to Qi Condensation always succeeds
  1: 90,  // Qi Condensation
  2: 80,  // Foundation Building
  3: 70,  // Core Formation
  4: 60,  // Nascent Soul
  5: 50,  // Soul Transformation
  6: 45,  // Void Refinement
  7: 40,  // Body Integration
  8: 35,  // Mahayana
  9: 30,  // Tribulation Transcendence
  10: 25, // True Immortal
  11: 20, // ???
};

export const REALM_COLORS: Record<string, string> = {
  Mortal: '#666', 'Qi Condensation': '#4488ff', 'Foundation Building': '#2dd4a0',
  'Core Formation': '#f0c040', 'Nascent Soul': '#9966ff', 'Soul Transformation': '#ff88cc',
  'Void Refinement': '#44ccff', 'Body Integration': '#ffaa44', Mahayana: '#ff6644',
  'Tribulation Transcendence': '#ff4444', 'True Immortal': '#ffdd44', '???': '#222',
};

export const MAX_AGE_BASE = 80; // kept for legacy compatibility

// Proper lifespan caps per realm index
export const REALM_LIFESPAN: Record<number, number> = {
  0: 80,       // Mortal
  1: 150,      // Qi Condensation
  2: 300,      // Foundation Building
  3: 500,      // Core Formation
  4: 1000,     // Nascent Soul
  5: 2000,     // Soul Transformation
  6: 5000,     // Void Refinement
  7: 10000,    // Body Integration
  8: 50000,    // Mahayana
  9: 100000,   // Tribulation Transcendence
  10: 999999,  // True Immortal
  11: 999999,  // ???
};

// Legacy array kept so engine.ts AGE_BONUS_PER_REALM references don't break
export const AGE_BONUS_PER_REALM = [0, 70, 220, 420, 920, 1920, 4920, 9920, 49920, 99920, 999919, 999919];

export const STARTING_AGE = 16;
export const ACTIONS_PER_YEAR = 5; // ACTIONS_PER_YEAR = 5 (do not change)
export const MAX_ACTIVE_MISSIONS = 4;
export const SAVE_KEY = 'cultivation-rpg-v2';

// ─── BACKGROUNDS ───────────────────────────────────────────────────
export const BACKGROUNDS: Record<Background, {
  title: string; desc: string; lore: string;
  qi: number; str: number; int: number; luck: number; rep: number; wis: number; chr: number; smith: number; alch: number; hp: number;
}> = {
  orphan: {
    title: 'Orphan of the Streets',
    desc: 'High Strength, balanced Luck. Low reputation but strong survival instincts.',
    lore: 'Abandoned at the gates of a nameless village, you learned to survive by wit and fist.',
    qi: 5, str: 10, int: 4, luck: 7, rep: 1, wis: 2, chr: 3, smith: 4, alch: 2, hp: 130,
  },
  merchant: {
    title: "Merchant's Child",
    desc: 'High Intelligence and Charm. Good at social interactions.',
    lore: 'Born to the silk trade, you grew up counting coins and reading people.',
    qi: 3, str: 3, int: 10, luck: 5, rep: 6, wis: 3, chr: 9, smith: 2, alch: 4, hp: 95,
  },
  noble: {
    title: 'Fallen Noble',
    desc: 'High Qi and Reputation. A privileged start, but fate is cruel.',
    lore: 'Your clan was destroyed in a single night. Their cultivation resources remain in your veins.',
    qi: 10, str: 5, int: 7, luck: 3, rep: 9, wis: 4, chr: 6, smith: 3, alch: 5, hp: 105,
  },
  doctor: {
    title: "Village Doctor's Apprentice",
    desc: 'High Alchemy and Wisdom. Excellent crafter.',
    lore: 'Trained under a village healer, you learned the secrets of herbs and pills before ever touching a sword.',
    qi: 4, str: 4, int: 8, luck: 5, rep: 5, wis: 7, chr: 5, smith: 2, alch: 10, hp: 100,
  },
};

// ─── SECTS ─────────────────────────────────────────────────────────
export const SECTS: Record<SectId, {
  name: string; tier: number; description: string; uniqueTechnique: string;
  bonus: string; color: string;
}> = {
  azure_sky: {
    name: 'Azure Sky Sect', tier: 1,
    description: 'Balanced sect teaching the art of the sword. Respected across the realm.',
    uniqueTechnique: 'Heavenly Sword Flash',
    bonus: '+15% Qi gain from meditation', color: '#4488ff',
  },
  iron_blood: {
    name: 'Iron Blood Sect', tier: 2,
    description: 'Aggressive, war-focused sect. Might makes right.',
    uniqueTechnique: 'Blood Rupture Palm',
    bonus: '+20% Strength gain from training', color: '#e63946',
  },
  jade_lotus: {
    name: 'Jade Lotus Pavilion', tier: 1,
    description: 'Alchemy-focused pavilion, renowned for pill mastery.',
    uniqueTechnique: 'Lotus Poison Mist',
    bonus: '+20% Alchemy success rate', color: '#2dd4a0',
  },
  shadow_veil: {
    name: 'Shadow Veil Order', tier: 2,
    description: 'Assassins and stealth masters. Operating in darkness.',
    uniqueTechnique: 'Ghost Step',
    bonus: '+15% Luck, +10% scheme success', color: '#8866bb',
  },
  crimson_flame: {
    name: 'Crimson Flame Hall', tier: 1,
    description: 'Fire-based cultivation. Destructive and passionate.',
    uniqueTechnique: 'Crimson Sun Explosion',
    bonus: '+20% combat damage', color: '#ff6644',
  },
  wandering_blade: {
    name: 'Wandering Blade Sect', tier: 3,
    description: 'Low-tier but fiercely loyal. Members look after each other.',
    uniqueTechnique: 'Thousand Cut Barrage',
    bonus: '+20% reputation gain, loyal allies', color: '#aa9944',
  },
  rogue: {
    name: 'Rogue Cultivator', tier: 0,
    description: 'No sect. Complete freedom, but no safety net.',
    uniqueTechnique: 'None',
    bonus: '+30% exploration rewards, can steal techniques', color: '#888',
  },
};

// ─── ACTIONS ───────────────────────────────────────────────────────
export const ACTIONS = [
  { id: 'train', name: 'Train Body', icon: '⚔️', desc: 'Physical conditioning' },
  { id: 'meditate', name: 'Meditate', icon: '🧘', desc: 'Gather and refine Qi' },
  { id: 'study', name: 'Study', icon: '📜', desc: 'Read ancient texts' },
  { id: 'explore', name: 'Explore', icon: '🗺️', desc: 'Venture into the unknown' },
  { id: 'fight', name: 'Seek Battle', icon: '🐉', desc: 'Challenge opponents' },
  { id: 'scheme', name: 'Scheme', icon: '🕸️', desc: 'Plot from shadows' },
  { id: 'socialize', name: 'Socialize', icon: '🤝', desc: 'Build connections' },
  { id: 'alchemy', name: 'Alchemy', icon: '⚗️', desc: 'Craft pills and elixirs' },
  { id: 'smithing', name: 'Smithing', icon: '🔨', desc: 'Forge weapons' },
  { id: 'rest', name: 'Rest & Heal', icon: '💤', desc: 'Recover HP' },
] as const;

// ─── BEASTS ────────────────────────────────────────────────────────
export const BEASTS: BeastDef[] = [
  { id: 'spirit_fox', name: 'Spirit Fox', description: 'A swift fox wreathed in spiritual illusions.', icon: '🦊', baseHealth: 60, baseAttack: 30, baseDefense: 15, behavior: 'fast', specialAbility: 'Illusion Dodge', drops: ['Fox Core', 'Illusion Fur'], minRealm: 0 },
  { id: 'stone_tortoise', name: 'Stone Tortoise', description: 'An ancient tortoise with an impenetrable shell.', icon: '🐢', baseHealth: 150, baseAttack: 20, baseDefense: 60, behavior: 'tank', specialAbility: 'Shell Defense', drops: ['Tortoise Shell', 'Rare Ore'], minRealm: 1 },
  { id: 'thunder_wolf', name: 'Thunder Wolf', description: 'A wolf crackling with lightning energy.', icon: '🐺', baseHealth: 90, baseAttack: 45, baseDefense: 25, behavior: 'aggressive', specialAbility: 'Paralyze Bite', drops: ['Lightning Core', 'Thunder Fang'], minRealm: 2 },
  { id: 'jade_serpent', name: 'Jade Serpent', description: 'A massive serpent dripping with poison.', icon: '🐍', baseHealth: 100, baseAttack: 35, baseDefense: 30, behavior: 'poison', specialAbility: 'Venom Strike', drops: ['Venom Gland', 'Serpent Scale'], minRealm: 2 },
  { id: 'roc_bird', name: 'Roc Bird', description: 'A colossal bird soaring above the clouds.', icon: '🦅', baseHealth: 80, baseAttack: 40, baseDefense: 20, behavior: 'flying', specialAbility: 'Aerial Assault', drops: ['Roc Feather', 'Sky Crystal'], minRealm: 3 },
  { id: 'ancient_dragon', name: 'Ancient Dragon', description: 'A legendary dragon of unfathomable power.', icon: '🐉', baseHealth: 500, baseAttack: 120, baseDefense: 100, behavior: 'boss', specialAbility: 'Dragon Breath', drops: ['Dragon Heart', 'Divine Scale', 'Dragon Core'], minRealm: 7 },
  { id: 'possessed_beast', name: 'Possessed Beast', description: 'A creature corrupted by dark energy.', icon: '👹', baseHealth: 110, baseAttack: 50, baseDefense: 30, behavior: 'corrupted', specialAbility: 'Dark Aura', drops: ['Dark Crystal', 'Corrupted Core'], minRealm: 4 },
];

// ─── NPC TEMPLATES ─────────────────────────────────────────────────
const NPC_FIRST_MALE = ['Wei', 'Liu', 'Zhao', 'Chen', 'Xu', 'Song', 'Huang', 'Qin', 'Feng', 'Guo', 'Lin', 'Ye'];
const NPC_FIRST_FEMALE = ['Mei', 'Ling', 'Yue', 'Xia', 'Hua', 'Qing', 'Ru', 'Yan', 'Xue', 'Fang', 'Lan', 'Ying'];
const NPC_LAST = ['Changming', 'Fenghua', 'Yuntian', 'Baiyu', 'Lingfei', 'Ruoxi', 'Zhenlong', 'Meihua', 'Jianqiu', 'Wuying', 'Tianxing', 'Mingyue'];
const NPC_PERSONALITIES: NpcPersonality[] = ['friendly', 'cold', 'arrogant', 'mysterious', 'loyal', 'deceitful'];
const NPC_BIOS = [
  'A wandering cultivator seeking enlightenment.',
  'A sect elder with decades of experience.',
  'A young prodigy with terrifying potential.',
  'A retired warrior who has seen too many battles.',
  'A mysterious figure with hidden motives.',
  'A cheerful merchant who trades in rare goods.',
  'A bitter rival seeking to surpass you.',
  'A gentle healer who despises violence.',
];
const NPC_TEACHINGS = ['Heavenly Sword Flash', 'Blood Rupture Palm', 'Lotus Poison Mist', 'Ghost Step', 'Crimson Sun Explosion', 'Thousand Cut Barrage', 'Void Step Technique', 'Iron Body Art', 'Spirit Sense Method', 'Formation Basics'];

// ─── TECHNIQUE DATA ───────────────────────────────────────────────
export const TECHNIQUE_DATA: Record<string, { qiCost: number; damage: string; description: string }> = {
  'Formation Basics': { qiCost: 10, damage: '1.2× ATK', description: 'A basic formation strike. Low cost, low reward.' },
  'Heavenly Sword Flash': { qiCost: 20, damage: '1.8× ATK', description: 'A blinding sword strike infused with heavenly Qi.' },
  'Blood Rupture Palm': { qiCost: 25, damage: '2.0× ATK', description: 'A devastating palm strike that ruptures internal Qi.' },
  'Lotus Poison Mist': { qiCost: 18, damage: '1.5× ATK + poison', description: 'A toxic mist that poisons the enemy over time.' },
  'Ghost Step': { qiCost: 15, damage: '1.6× ATK', description: 'Vanish and reappear behind the enemy for a surprise strike.' },
  'Crimson Sun Explosion': { qiCost: 30, damage: '2.2× ATK', description: 'A massive fire-element explosion centered on the target.' },
  'Thousand Cut Barrage': { qiCost: 22, damage: '1.7× ATK (multi-hit)', description: 'A flurry of rapid strikes that overwhelms defenses.' },
  'Void Step Technique': { qiCost: 20, damage: '1.8× ATK', description: 'Tear through space to strike from an impossible angle.' },
  'Iron Body Art': { qiCost: 12, damage: '1.3× ATK + DEF boost', description: 'Hardens the body, dealing damage while boosting defense.' },
  'Spirit Sense Method': { qiCost: 15, damage: '1.5× ATK (true strike)', description: 'Sense enemy weaknesses for a guaranteed hit.' },
  'Void Strike Technique': { qiCost: 35, damage: '2.5× ATK (ignores DEF)', description: 'A forbidden strike through the void that ignores all defense.' },
  'Moonlit Blade Art': { qiCost: 18, damage: '1.6× ATK', description: 'A graceful blade art that shines like moonlight.' },
  'Earthshaker Palm': { qiCost: 22, damage: '1.9× ATK', description: 'A palm strike that shakes the very earth beneath your feet.' },
  'Windwalker Steps': { qiCost: 14, damage: '1.4× ATK + speed', description: 'Movement technique that allows rapid successive strikes.' },
  'Starfall Needle': { qiCost: 20, damage: '1.7× ATK (piercing)', description: 'Needles of compressed Qi that pierce through armor.' },
  "Dragon's Breath Technique": { qiCost: 28, damage: '2.1× ATK (fire)', description: 'Breathe devastating dragon fire upon your enemy.' },
  'Celestial Palm Strike': { qiCost: 30, damage: '2.3× ATK', description: 'A palm strike imbued with celestial energy.' },
  'Void Breathing Method': { qiCost: 16, damage: '1.5× ATK + Qi regen', description: 'A breathing technique that restores Qi while attacking.' },
  'Heaven-Splitting Sword Intent': { qiCost: 35, damage: '2.5× ATK', description: 'The ultimate sword intent that splits heaven and earth.' },
  'Primordial Body Forging': { qiCost: 20, damage: '1.8× ATK + STR boost', description: 'Ancient body forging that strengthens while striking.' },
};

// ─── ITEMS ─────────────────────────────────────────────────────────
export const ALL_ITEMS = [
  // ── WEAPONS ──────────────────────────────────────────────────────
  { id: 'iron_sword', name: 'Iron Sword', type: 'weapon', quality: 'Common', description: 'A simple iron blade. Reliable but unremarkable.', statBonus: { strength: 3 }, effect: 'basic_strike' },
  { id: 'spirit_sword', name: 'Spirit Sword', type: 'weapon', quality: 'Uncommon', description: 'A blade that hums with spiritual energy, channeling Qi into each strike.', statBonus: { strength: 8, qi: 5 }, effect: 'qi_strike' },
  { id: 'shadow_dagger', name: 'Shadow Dagger', type: 'weapon', quality: 'Uncommon', description: 'A short blade forged from shadow steel. Weak base damage but strikes vital points with lethal precision.', statBonus: { strength: 5, luck: 8 }, effect: 'high_crit' },
  { id: 'jade_blade', name: 'Jade Blade', type: 'weapon', quality: 'Rare', description: 'Carved from a single piece of spirit jade. Each swing leaves trails of green light.', statBonus: { strength: 15, qi: 10 }, effect: 'qi_strike' },
  { id: 'thunder_spear', name: 'Thunder Spear', type: 'weapon', quality: 'Rare', description: 'A spear crackling with captured lightning. Each thrust has a chance to paralyze the target.', statBonus: { strength: 18, qi: 8 }, effect: 'paralyze_chance', reqStrength: 50 },
  { id: 'soul_blade', name: 'Soul Reaver Blade', type: 'weapon', quality: 'Legendary', description: 'This cursed sword drinks the spiritual energy of those it cuts, draining enemy Qi with each hit.', statBonus: { strength: 30, qi: 20, intelligence: 5 }, effect: 'qi_drain', reqStrength: 80 },
  { id: 'dragon_bone_greatsword', name: 'Dragon Bone Greatsword', type: 'weapon', quality: 'Divine', description: 'Forged from the spine of an Ancient Dragon. Its weight alone shatters mountains. Requires immense Strength to wield.', statBonus: { strength: 65, qi: 30, intelligence: 10 }, effect: 'massive_strike', reqStrength: 150 },
  { id: 'heaven_reaver', name: 'Heaven Reaver', type: 'weapon', quality: 'Divine', description: 'The legendary sword that shattered the heavens. Said to cut through the Dao itself.', statBonus: { strength: 60, qi: 40, intelligence: 15 }, effect: 'dao_cut', reqStrength: 120 },

  // ── ARMOR ────────────────────────────────────────────────────────
  { id: 'cloth_robe', name: 'Cloth Robe', type: 'armor', quality: 'Common', description: 'Simple cloth armor. Better than nothing.', statBonus: { strength: 1 } },
  { id: 'silk_armor', name: 'Silk Armor', type: 'armor', quality: 'Uncommon', description: 'Reinforced silk woven with basic protective formations.', statBonus: { strength: 5 } },
  { id: 'moonsilk_robe', name: 'Moonsilk Robe', type: 'armor', quality: 'Rare', description: 'Woven from threads that only appear under a full moon. Light as air, tough as steel.', statBonus: { strength: 10, qi: 5, luck: 5 } },
  { id: 'iron_will_bracelet', name: 'Iron Will Bracelet', type: 'armor', quality: 'Rare', description: 'A bracelet forged by a legendary body cultivator. Hardens the wearer\'s body against all attacks. Reduces damage taken by 15%.', statBonus: { strength: 12, wisdom: 5 }, effect: 'damage_reduce_15' },
  { id: 'shadow_cloak', name: 'Shadow Cloak', type: 'armor', quality: 'Legendary', description: 'Woven from solidified shadows. The wearer flickers between existence and void, granting a 20% chance to dodge any attack.', statBonus: { strength: 15, luck: 10, qi: 8 }, effect: 'dodge_20' },
  { id: 'dragon_scale_armor', name: 'Dragon Scale Armor', type: 'armor', quality: 'Legendary', description: 'Forged from the scales of an elder dragon. Nearly impenetrable.', statBonus: { strength: 25, qi: 10 } },

  // ── ARTIFACTS ────────────────────────────────────────────────────
  { id: 'jade_pendant', name: 'Jade Pendant', type: 'misc', quality: 'Uncommon', description: 'A pendant carved from spiritual jade that pulses with gentle warmth. Passively restores 10 HP each year.', statBonus: {}, effect: 'hp_regen_10' },
  { id: 'spirit_ring', name: 'Spirit Ring', type: 'misc', quality: 'Rare', description: 'A ring containing a pocket dimension. Holds 1 extra technique slot, expanding the wearer\'s capacity for martial arts.', statBonus: { qi: 5, intelligence: 5 }, effect: 'extra_technique_slot' },
  { id: 'luck_talisman', name: 'Luck Talisman', type: 'misc', quality: 'Rare', description: 'A golden talisman blessed by a fortune deity. Permanently increases the wearer\'s Luck by 20 upon acquisition.', statBonus: { luck: 20 }, effect: 'permanent_luck' },
  { id: 'heaven_defying_bead', name: 'Heaven Defying Bead', type: 'misc', quality: 'Legendary', description: 'A bead that contains a fragment of heavenly will. Reduces tribulation failure chance by 50%. The heavens themselves tremble at its presence.', statBonus: { wisdom: 15, qi: 10 }, effect: 'tribulation_shield' },

  // ── PILLS ────────────────────────────────────────────────────────
  { id: 'qi_pill', name: 'Qi Replenishing Pill', type: 'pill', quality: 'Common', description: 'A standard pill that restores 30 Qi when consumed. Essential for any cultivator in battle.', statBonus: { qi: 30 }, effect: 'battle_qi_30' },
  { id: 'healing_pill', name: 'Healing Pill', type: 'pill', quality: 'Common', description: 'A medicinal pill that mends wounds and restores 50 HP. The staple of every cultivator\'s pouch.', statBonus: {}, effect: 'battle_hp_50' },
  { id: 'wisdom_pill', name: 'Wisdom Pill', type: 'pill', quality: 'Uncommon', description: 'Refined from thousand-year herbs. Grants a flash of enlightenment, permanently increasing Wisdom.', statBonus: { wisdom: 5 }, effect: 'permanent_stat' },
  { id: 'breakthrough_pill', name: 'Breakthrough Pill', type: 'pill', quality: 'Rare', description: 'A pill that stabilizes Qi flow during breakthroughs. Increases success chance by 20% on the next realm advancement attempt.', statBonus: {}, effect: 'breakthrough_boost_20' },
  { id: 'poison_pill', name: 'Poison Pill', type: 'pill', quality: 'Rare', description: 'Coat your weapon with this vile substance. Poisons the enemy for 8 damage per turn for 3 turns during battle.', statBonus: {}, effect: 'battle_poison_3' },
  { id: 'lifespan_pill', name: 'Lifespan Pill', type: 'pill', quality: 'Legendary', description: 'An incredibly rare pill that extends the consumer\'s natural lifespan by 10 years. Defies the natural order.', statBonus: {}, effect: 'lifespan_10' },
  { id: 'immortal_pill', name: 'Heaven Grade Pill', type: 'pill', quality: 'Divine', description: 'A pill forged from the essence of heaven and earth. Consuming it instantly advances the cultivator by one full stage. Extraordinarily expensive.', statBonus: { qi: 200, wisdom: 20 }, effect: 'instant_stage_advance' },

  // ── TECHNIQUES / SCROLLS ─────────────────────────────────────────
  { id: 'tech_formation', name: 'Formation Basics', type: 'technique', quality: 'Common', description: 'A foundational text on formation arrays. Learn to create basic protective and trapping formations.' },
  { id: 'body_tempering_manual', name: 'Body Tempering Manual', type: 'technique', quality: 'Uncommon', description: 'A brutal training manual passed down from ancient body cultivators. Permanently increases Strength by 15 upon study.', statBonus: { strength: 15 }, effect: 'permanent_stat' },
  { id: 'tech_iron_body', name: 'Iron Body Art', type: 'technique', quality: 'Uncommon', description: 'A defensive technique that hardens the body like iron. Reduces physical damage taken.' },
  { id: 'wind_steps_scroll', name: 'Wind Steps Scroll', type: 'technique', quality: 'Rare', description: 'A movement technique that turns the user into the wind itself. Increases retreat success chance in combat to 80%.', effect: 'retreat_boost' },
  { id: 'tech_void_step', name: 'Void Step Technique', type: 'technique', quality: 'Rare', description: 'Tear through the fabric of space to reappear behind your enemy. A supreme movement technique.' },
  { id: 'tech_spirit_sense', name: 'Spirit Sense Method', type: 'technique', quality: 'Rare', description: 'Extend your spiritual perception far beyond mortal limits. Detect hidden enemies and treasures.' },
  { id: 'formation_mastery_scroll', name: 'Formation Mastery Scroll', type: 'technique', quality: 'Rare', description: 'Advanced formation theory that unlocks complex killing and defensive arrays. Requires Formation Basics as prerequisite.', effect: 'advanced_formations' },
  { id: 'void_strike_technique', name: 'Void Strike Technique', type: 'technique', quality: 'Legendary', description: 'A forbidden technique that strikes through the void, completely ignoring the target\'s physical defense. Costs immense Qi.', effect: 'ignore_defense' },

  // ── MISC / SCROLLS ───────────────────────────────────────────────
  { id: 'beast_taming_scroll', name: 'Beast Taming Scroll', type: 'misc', quality: 'Rare', description: 'An ancient scroll containing beast-binding formations. Allows one attempt to tame a weakened spirit beast in combat.' },
  { id: 'formation_flag', name: 'Formation Flag', type: 'misc', quality: 'Uncommon', description: 'A flag inscribed with formation runes. Plant it to create a defensive barrier or trap.' },
  { id: 'spirit_lamp', name: 'Spirit Lamp', type: 'misc', quality: 'Uncommon', description: 'A lamp that burns with spiritual fire. Concentrates ambient Qi, boosting cultivation speed.' },
  { id: 'inscription_seal', name: 'Inscription Seal', type: 'misc', quality: 'Rare', description: 'A jade seal containing compressed power. Crush it for a temporary boost to all stats.' },

  // ── MATERIALS ────────────────────────────────────────────────────
  { id: 'spirit_herb', name: 'Spirit Herb', type: 'material', quality: 'Common', description: 'A basic herb infused with spiritual energy. Used in alchemy.' },
  { id: 'spirit_ore', name: 'Spirit Ore', type: 'material', quality: 'Common', description: 'Ore veined with spiritual energy. The foundation of all spirit weapon forging.' },
  { id: 'rare_ore', name: 'Rare Ore', type: 'material', quality: 'Uncommon', description: 'A dense chunk of spirit-infused ore. Higher purity than common ore.' },
  { id: 'thunder_core', name: 'Thunder Core', type: 'material', quality: 'Rare', description: 'The crystallized heart of a lightning-element beast. Crackles with residual electricity. Used to forge thunder-attribute weapons.' },
  { id: 'jade_essence', name: 'Jade Essence', type: 'material', quality: 'Rare', description: 'Liquified spiritual jade, refined over millennia. A key ingredient in high-grade pills and formations.' },
  { id: 'dragon_scale_fragment', name: 'Dragon Scale Fragment', type: 'material', quality: 'Legendary', description: 'A fragment of an actual dragon scale. Radiates ancient power. Used to forge Legendary-tier armor and weapons.' },
  { id: 'phoenix_feather', name: 'Phoenix Feather', type: 'material', quality: 'Legendary', description: 'A feather shed by a true Phoenix. Burns with undying flame. Component for Divine-tier crafting and rebirth pills.' },
  { id: 'divine_metal', name: 'Divine Metal', type: 'material', quality: 'Divine', description: 'Metal forged by heavenly fire in the celestial furnaces. The rarest crafting material in existence.' },
];

// NPC type determines their realm range
const NPC_TYPE_REALM_RANGES: Record<string, { minRealm: number; maxRealm: number; minStage: number }> = {
  sect_elder: { minRealm: 3, maxRealm: 8, minStage: 1 },      // Core Formation to Body Integration
  senior_disciple: { minRealm: 2, maxRealm: 4, minStage: 0 }, // Foundation to Nascent Soul
  disciple: { minRealm: 1, maxRealm: 2, minStage: 0 },        // Qi Condensation to Foundation
  wanderer: { minRealm: 0, maxRealm: 10, minStage: 0 },       // Can be anything
  bandit: { minRealm: 0, maxRealm: 3, minStage: 0 },          // Usually weaker
  merchant: { minRealm: 1, maxRealm: 4, minStage: 0 },        // Moderate cultivation
  hermit: { minRealm: 4, maxRealm: 10, minStage: 1 },         // Old and powerful
};

const NPC_TYPE_BIOS: Record<string, string[]> = {
  sect_elder: ['A venerable elder with centuries of cultivation experience.', 'A strict but fair sect elder who tests all disciples.', 'An ancient cultivator whose gaze pierces through all deception.'],
  senior_disciple: ['A talented senior disciple with a promising future.', 'A hardworking cultivator who earned their position through effort.', 'A proud senior who looks down on weaker cultivators.'],
  disciple: ['A young cultivator just beginning their path.', 'An eager disciple with stars in their eyes.', 'A nervous newcomer to the cultivation world.'],
  wanderer: ['A mysterious wanderer with no sect allegiance.', 'A lone cultivator walking their own path.', 'A traveler seeking ancient secrets.'],
  bandit: ['A ruthless bandit who preys on weak cultivators.', 'A fallen cultivator who turned to crime.', 'A desperate soul who does what they must to survive.'],
  merchant: ['A shrewd trader dealing in cultivation resources.', 'A traveling merchant with connections everywhere.', 'A wealthy dealer of rare artifacts.'],
  hermit: ['A reclusive master who abandoned the world long ago.', 'An ancient being who has seen empires rise and fall.', 'A sage seeking enlightenment in solitude.'],
};

const NPC_TYPE_LOOT: Record<string, string[]> = {
  sect_elder: ['Spirit Sword', 'Breakthrough Pill', 'Rare Technique Scroll', 'Elder\'s Storage Ring'],
  senior_disciple: ['Spirit Sword', 'Qi Pill', 'Technique Manual'],
  disciple: ['Iron Sword', 'Healing Pill', 'Spirit Stones'],
  wanderer: ['Spirit Stones', 'Rare Herb', 'Mysterious Map'],
  bandit: ['Stolen Coins', 'Iron Sword', 'Healing Pill'],
  merchant: ['Spirit Stones', 'Rare Materials', 'Trade Goods'],
  hermit: ['Ancient Scroll', 'Divine Artifact', 'Enlightenment Pill'],
};

export function generateNPC(playerRealmIdx: number, forceType?: string): any {
  const isFemale = Math.random() > 0.5;
  const first = isFemale ? NPC_FIRST_FEMALE[Math.floor(Math.random() * NPC_FIRST_FEMALE.length)] : NPC_FIRST_MALE[Math.floor(Math.random() * NPC_FIRST_MALE.length)];
  const last = NPC_LAST[Math.floor(Math.random() * NPC_LAST.length)];
  
  // Determine NPC type - weighted random if not forced
  const types = ['sect_elder', 'senior_disciple', 'disciple', 'wanderer', 'bandit', 'merchant', 'hermit'];
  const weights = [0.08, 0.15, 0.25, 0.25, 0.12, 0.10, 0.05]; // Weighted probabilities
  
  let npcType = forceType;
  if (!npcType) {
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (r < cumulative) {
        npcType = types[i];
        break;
      }
    }
    if (!npcType) npcType = 'wanderer';
  }
  
  // Get realm range for this type
  const range = NPC_TYPE_REALM_RANGES[npcType] || { minRealm: 0, maxRealm: 5, minStage: 0 };
  
  // Calculate NPC realm - they don't scale to player, world is fixed
  let npcRealm = Math.floor(Math.random() * (range.maxRealm - range.minRealm + 1)) + range.minRealm;
  npcRealm = Math.min(npcRealm, REALMS.length - 2); // Cap at True Immortal
  
  // Stage calculation
  const stageOptions = ['Early', 'Mid', 'Late'].slice(range.minStage);
  const npcStage = stageOptions[Math.floor(Math.random() * stageOptions.length)] as Stage;
  
  // Personality - some types lean certain ways
  let personality = NPC_PERSONALITIES[Math.floor(Math.random() * NPC_PERSONALITIES.length)];
  if (npcType === 'bandit' && Math.random() > 0.5) personality = 'deceitful';
  if (npcType === 'sect_elder' && Math.random() > 0.6) personality = 'cold';
  if (npcType === 'hermit' && Math.random() > 0.5) personality = 'mysterious';
  
  // Bio based on type
  const bios = NPC_TYPE_BIOS[npcType] || NPC_BIOS;
  const bio = bios[Math.floor(Math.random() * bios.length)];
  
  // Loot based on type
  const possibleLoot = NPC_TYPE_LOOT[npcType] || ['Spirit Stones'];
  const loot = possibleLoot.filter(() => Math.random() > 0.5).slice(0, 3);
  
  // Hostile based on type
  const hostile = npcType === 'bandit' || (personality === 'deceitful' && Math.random() > 0.5);
  
  return {
    id: `npc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: `${first} ${last}`,
    gender: isFemale ? 'female' as Gender : 'male' as Gender,
    personality,
    npcType,
    realmIdx: npcRealm,
    stage: npcStage,
    relationship: hostile ? -20 : 0,
    role: 'none' as const,
    loyalty: 50,
    teachings: [NPC_TEACHINGS[Math.floor(Math.random() * NPC_TEACHINGS.length)]],
    hasBetrayed: false,
    alive: true,
    bio,
    memory: {
      hasFought: false,
      giftsReceived: [],
      timesInsulted: 0,
      timesHelped: 0,
    },
    loot,
    hostile,
  };
}

// Calculate total stage value for combat comparison
export function getTotalStage(realmIdx: number, stage: Stage): number {
  const stageIdx = STAGES.indexOf(stage);
  return realmIdx * 3 + stageIdx;
}

// Calculate win chance based on realm difference
export function calculateWinChance(playerRealmIdx: number, playerStage: Stage, npcRealmIdx: number, npcStage: Stage, playerLuck: number, playerStrength: number, playerQi: number): number {
  const playerTotal = getTotalStage(playerRealmIdx, playerStage);
  const npcTotal = getTotalStage(npcRealmIdx, npcStage);
  const stageDiff = playerTotal - npcTotal;
  
  let baseChance: number;
  
  if (stageDiff <= -6) {
    // 2+ realms below - nearly impossible
    baseChance = 5;
  } else if (stageDiff <= -3) {
    // 1 realm below
    baseChance = 15;
  } else if (stageDiff <= -1) {
    // 1-2 stages below
    baseChance = 35;
  } else if (stageDiff === 0) {
    // Same stage - base 50%, modified by stats
    baseChance = 50;
    // Stats matter more at same level
    const statBonus = (playerStrength * 0.1 + playerQi * 0.05);
    baseChance = Math.min(65, baseChance + statBonus);
  } else if (stageDiff <= 2) {
    // 1-2 stages above
    baseChance = 75;
  } else if (stageDiff <= 5) {
    // 1 realm above
    baseChance = 85;
  } else {
    // 2+ realms above
    baseChance = 95;
  }
  
  // Luck modifier (max ±10%)
  const luckMod = Math.max(-10, Math.min(10, (playerLuck - 50) * 0.2));
  
  return Math.max(5, Math.min(95, baseChance + luckMod));
}
