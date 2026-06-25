import { GameState, Stage } from './types';
import { REALMS, STAGES, generateNPC } from './constants';

const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ─── EVENT TYPES ──────────────────────────────────────────────────

export type ExploreCategory = 'combat' | 'fortunate' | 'neutral' | 'dangerous';

export interface ExploreChoice {
  id: string;
  label: string;
  icon: string;
  description: string;
  karmaHint?: 'righteous' | 'villainous' | 'neutral';
}

export interface ExploreOutcome {
  text: string;
  statChanges: Partial<Record<string, number>>;
  hpChange: number;
  alignmentChange: number;
  herbsChange: number;
  oresChange: number;
  spChange: number;
  techniqueLearned?: string;
  npcGenerated?: boolean;
  npcRole?: string;
  triggerBattle?: boolean;
  battleEnemyKind?: string;
}

export interface ExploreEvent {
  id: string;
  category: ExploreCategory;
  title: string;
  icon: string;
  description: string; // vivid narrative text
  choices: ExploreChoice[];
  resolve: (choiceId: string, state: GameState) => ExploreOutcome;
}

// ─── REALM-THEMED AREAS ───────────────────────────────────────────

const AREA_THEMES = [
  { areas: ['Whispering Forest', 'Bamboo Valley', 'Misty Hollow'], beasts: ['Spirit Fox', 'Jade Rabbit', 'Shadow Hawk'] },
  { areas: ['Thunder Peaks', 'Lightning Ridge', 'Storm Plateau'], beasts: ['Thunder Wolf', 'Storm Eagle', 'Lightning Serpent'] },
  { areas: ['Obsidian Caves', 'Crystal Mines', 'Ember Tunnels'], beasts: ['Stone Tortoise', 'Flame Lizard', 'Crystal Spider'] },
  { areas: ['Frozen Wastes', 'Ice Crown Summit', 'Glacier Depths'], beasts: ['Frost Bear', 'Ice Phoenix', 'Snow Wraith'] },
  { areas: ['Void Rift', 'Shattered Realm', 'Astral Planes'], beasts: ['Void Serpent', 'Astral Demon', 'Reality Eater'] },
];

function getAreaTheme(realmIdx: number) {
  return AREA_THEMES[Math.min(realmIdx, AREA_THEMES.length - 1)];
}

// ─── COMBAT ENCOUNTERS (30%) ──────────────────────────────────────

function generateCombatEvents(state: GameState): ExploreEvent[] {
  const theme = getAreaTheme(state.realmIdx);
  const area = pick(theme.areas);
  const beast = pick(theme.beasts);

  return [
    {
      id: 'ambush_bandits',
      category: 'combat',
      title: 'Bandit Ambush!',
      icon: '🗡️',
      description: `The path through ${area} narrows between two cliff faces. Too late, you notice the glint of drawn steel — a band of ${rand(1, 3)} bandits drop from the rocks above, their eyes gleaming with desperate hunger. "Your spirit stones or your life, cultivator!"`,
      choices: [
        { id: 'fight', label: 'Draw your weapon', icon: '⚔️', description: 'Face them head-on.', karmaHint: 'neutral' },
        { id: 'intimidate', label: 'Release your aura', icon: '😤', description: 'Let them feel your cultivation pressure.', karmaHint: 'neutral' },
        { id: 'pay', label: 'Hand over some coins', icon: '💰', description: 'Avoid the fight entirely.', karmaHint: 'neutral' },
      ],
      resolve: (choiceId, gs) => {
        if (choiceId === 'fight') {
          return { text: '', statChanges: {}, hpChange: 0, alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0, triggerBattle: true, battleEnemyKind: 'bandit' };
        }
        if (choiceId === 'intimidate') {
          const success = gs.stats.qi + gs.realmIdx * 20 > rand(30, 80);
          if (success) {
            return { text: `Your spiritual pressure crashes down like a mountain. The bandits stumble, their faces draining of color. "F-forgive us, Senior!" They scatter into the rocks, leaving behind a pouch of spirit stones in their haste.`, statChanges: { reputation: rand(3, 8), qi: rand(2, 6) }, hpChange: 0, alignmentChange: 2, herbsChange: 0, oresChange: 0, spChange: rand(3, 8) };
          }
          return { text: `You release your aura, but the bandit leader only sneers. "Qi Condensation? We've eaten cultivators stronger than you for breakfast." They attack before you can react.`, statChanges: { strength: rand(1, 4) }, hpChange: -rand(15, 30), alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0 };
        }
        return { text: `You toss a pouch of coins. The bandits snatch it greedily and vanish. A cowardly choice, but a living cultivator is better than a dead hero.`, statChanges: { luck: rand(1, 3) }, hpChange: 0, alignmentChange: -3, herbsChange: 0, oresChange: 0, spChange: -5 };
      },
    },
    {
      id: 'assassin_attack',
      category: 'combat',
      title: 'Assassination Attempt!',
      icon: '🥷',
      description: `A killing intent slices through the air like a blade of ice. You barely dodge a shadow-wreathed dagger aimed at your throat. A figure in black lands silently before you, eyes cold as the void. "Nothing personal," they whisper. "Someone paid well for your head."`,
      choices: [
        { id: 'fight', label: 'Fight for your life', icon: '⚔️', description: 'No choice but to battle.', karmaHint: 'neutral' },
        { id: 'negotiate', label: '"I\'ll pay double"', icon: '💬', description: 'Try to buy off the assassin.', karmaHint: 'neutral' },
      ],
      resolve: (choiceId, gs) => {
        if (choiceId === 'fight') {
          return { text: '', statChanges: {}, hpChange: 0, alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0, triggerBattle: true, battleEnemyKind: 'assassin' };
        }
        const success = gs.stats.charm + gs.stats.reputation > rand(20, 60);
        if (success) {
          return { text: `The assassin pauses, calculating. "...Triple. And I tell you who hired me." You hand over the spirit stones. The name they whisper makes your blood run cold — but knowledge is power.`, statChanges: { intelligence: rand(3, 7), charm: rand(1, 3) }, hpChange: 0, alignmentChange: -2, herbsChange: 0, oresChange: 0, spChange: -8 };
        }
        return { text: `"I don't negotiate with targets." The blade flashes again. You barely parry, but the poison on the dagger scratches your arm.`, statChanges: { strength: rand(2, 5) }, hpChange: -rand(20, 40), alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0 };
      },
    },
    {
      id: 'beast_territory',
      category: 'combat',
      title: `${beast} Encounter!`,
      icon: '🐾',
      description: `Deep in ${area}, the undergrowth shudders. A massive ${beast} emerges from the shadows, its spiritual pressure sending shockwaves through the air. Ancient eyes lock onto you — it has claimed this territory, and you are trespassing.`,
      choices: [
        { id: 'fight', label: 'Stand your ground', icon: '⚔️', description: 'Face the beast in combat.', karmaHint: 'neutral' },
        { id: 'observe', label: 'Study its movements', icon: '👁️', description: 'Watch and learn before engaging.', karmaHint: 'neutral' },
        { id: 'retreat', label: 'Back away slowly', icon: '🏃', description: 'This one may be too strong.', karmaHint: 'neutral' },
      ],
      resolve: (choiceId, gs) => {
        if (choiceId === 'fight') {
          return { text: '', statChanges: {}, hpChange: 0, alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0, triggerBattle: true, battleEnemyKind: 'beast' };
        }
        if (choiceId === 'observe') {
          return { text: `You crouch behind a boulder and watch the ${beast} move. Its technique is fascinating — the way Qi flows through its limbs, the precision of its strikes against prey. You memorize the patterns. This knowledge will serve you well.`, statChanges: { intelligence: rand(5, 12), wisdom: rand(2, 6), qi: rand(3, 8) }, hpChange: 0, alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: rand(2, 5) };
        }
        const escaped = Math.random() < 0.7;
        if (escaped) {
          return { text: `You slowly retreat, never breaking eye contact. The ${beast} watches but does not pursue — you've shown the proper respect for its domain.`, statChanges: { luck: rand(2, 5), wisdom: rand(1, 3) }, hpChange: 0, alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0 };
        }
        return { text: `The ${beast} interprets your retreat as weakness and lunges! Its claw catches your shoulder before you escape through the trees.`, statChanges: { luck: rand(1, 3) }, hpChange: -rand(15, 30), alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0 };
      },
    },
    {
      id: 'rogue_cultivator_challenge',
      category: 'combat',
      title: 'Rogue Cultivator!',
      icon: '⚔️',
      description: `At the crossroads of ${area}, a lone figure sits atop a boulder, sword resting across their knees. As you approach, they open one eye. "Another one seeking the path? Show me your resolve, or walk away in shame." Their cultivation pressure radiates outward — this is no ordinary wanderer.`,
      choices: [
        { id: 'fight', label: 'Accept the challenge', icon: '⚔️', description: 'Prove your worth in battle.', karmaHint: 'neutral' },
        { id: 'talk', label: 'Sit and share tea', icon: '🍵', description: 'Perhaps words are mightier.', karmaHint: 'righteous' },
        { id: 'walk', label: 'Walk past silently', icon: '🚶', description: 'You have nothing to prove.', karmaHint: 'neutral' },
      ],
      resolve: (choiceId, gs) => {
        if (choiceId === 'fight') {
          return { text: '', statChanges: {}, hpChange: 0, alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0, triggerBattle: true, battleEnemyKind: 'rogue_cultivator' };
        }
        if (choiceId === 'talk') {
          return { text: `The cultivator raises an eyebrow, then laughs — a genuine, warm sound. "Finally, someone with sense." Over tea, they share insights about the Dao of the Sword that make your meridians hum with understanding.`, statChanges: { qi: rand(8, 18), intelligence: rand(4, 9), charm: rand(2, 5) }, hpChange: 0, alignmentChange: 5, herbsChange: 0, oresChange: 0, spChange: rand(3, 6), npcGenerated: true, npcRole: 'ally' };
        }
        return { text: `You walk past without a word. The cultivator watches you go, then returns to meditation. Some encounters are not meant to be.`, statChanges: { wisdom: rand(1, 4) }, hpChange: 0, alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0 };
      },
    },
  ];
}

// ─── FORTUNATE ENCOUNTERS (25%) ───────────────────────────────────

function generateFortunateEvents(state: GameState): ExploreEvent[] {
  const theme = getAreaTheme(state.realmIdx);
  const area = pick(theme.areas);

  const CAVE_TECHNIQUES = ['Moonlit Blade Art', 'Earthshaker Palm', 'Windwalker Steps', 'Starfall Needle', 'Dragon\'s Breath Technique'];

  return [
    {
      id: 'hidden_cave',
      category: 'fortunate',
      title: 'Hidden Cave Discovery',
      icon: '🕳️',
      description: `Behind a waterfall in ${area}, you notice a shimmer — an illusion formation, ancient but weakening. You dispel it with a pulse of Qi, revealing a narrow cave entrance carved with forgotten runes. The air inside thrums with residual spiritual energy. This was once a cultivator's secret dwelling.`,
      choices: [
        { id: 'search_carefully', label: 'Search methodically', icon: '🔍', description: 'Take your time to find everything safely.', karmaHint: 'neutral' },
        { id: 'rush_in', label: 'Rush to the treasure', icon: '💨', description: 'Grab what you can quickly.', karmaHint: 'neutral' },
        { id: 'study_runes', label: 'Study the rune formations', icon: '📚', description: 'Knowledge may be the true treasure.', karmaHint: 'righteous' },
      ],
      resolve: (choiceId, gs) => {
        if (choiceId === 'search_carefully') {
          const foundTech = Math.random() > 0.6;
          const techName = pick(CAVE_TECHNIQUES);
          return { text: `You methodically explore each chamber. In a jade box behind a false wall, you find ${rand(3, 6)} spirit herbs, ${rand(2, 4)} chunks of rare ore${foundTech ? `, and a weathered scroll containing the ${techName}!` : '.'}`, statChanges: { luck: rand(3, 7), qi: rand(5, 12) }, hpChange: 0, alignmentChange: 0, herbsChange: rand(3, 6), oresChange: rand(2, 4), spChange: rand(5, 10), techniqueLearned: foundTech ? techName : undefined };
        }
        if (choiceId === 'rush_in') {
          if (Math.random() > 0.4) {
            return { text: `In your haste, you trigger a guardian formation! Lightning arcs from the walls, scorching your robes. You manage to grab a handful of herbs before fleeing.`, statChanges: { luck: rand(1, 3) }, hpChange: -rand(15, 30), alignmentChange: 0, herbsChange: rand(1, 3), oresChange: 0, spChange: 0 };
          }
          return { text: `Fortune favors the bold! You snatch an armful of treasures before any formations activate. A pile of spirit ore and a glowing pill sit in the main chamber.`, statChanges: { luck: rand(3, 8), qi: rand(5, 15) }, hpChange: 0, alignmentChange: 0, herbsChange: rand(2, 5), oresChange: rand(3, 6), spChange: rand(5, 12) };
        }
        const techName = pick(CAVE_TECHNIQUES);
        return { text: `The runes tell a story — a Nascent Soul cultivator once sealed their life's work here. You spend hours deciphering their formation theory and absorb the ${techName} into your memory.`, statChanges: { intelligence: rand(8, 16), wisdom: rand(4, 10), qi: rand(5, 10) }, hpChange: 0, alignmentChange: 3, herbsChange: 0, oresChange: 0, spChange: rand(5, 10), techniqueLearned: techName };
      },
    },
    {
      id: 'injured_cultivator',
      category: 'fortunate',
      title: 'Injured Cultivator',
      icon: '🩸',
      description: `The scent of blood reaches you before the sight — a cultivator lies slumped against a tree, their robes torn and stained crimson. A spatial ring glints on their finger, and their storage pouch bulges with supplies. They look up at you with hazy, pleading eyes. "Please... help me..."`,
      choices: [
        { id: 'heal', label: 'Tend their wounds', icon: '💚', description: 'Use your herbs to save them.', karmaHint: 'righteous' },
        { id: 'rob', label: 'Take their belongings', icon: '🖤', description: 'Their misfortune is your gain.', karmaHint: 'villainous' },
        { id: 'cautious', label: 'Help, but stay alert', icon: '👁️', description: 'This could be a trap.', karmaHint: 'neutral' },
      ],
      resolve: (choiceId, gs) => {
        if (choiceId === 'heal') {
          return { text: `You kneel beside them and channel healing Qi into their wounds. Color returns to their cheeks, and tears of gratitude fill their eyes. "I am ${pick(['Chen Wuji', 'Li Mingxia', 'Zhang Haoran', 'Wang Suyin'])} of the ${pick(['Jade Peak', 'Silver Moon', 'Azure Cloud'])} Sect. I will never forget your kindness. Should you ever need aid, seek me out." They press a pouch of rare herbs into your hands before departing.`, statChanges: { reputation: rand(8, 15), charm: rand(2, 5), qi: rand(3, 8) }, hpChange: 0, alignmentChange: 12, herbsChange: rand(3, 7), oresChange: 0, spChange: rand(5, 10), npcGenerated: true, npcRole: 'ally' };
        }
        if (choiceId === 'rob') {
          return { text: `"I'm sorry," you whisper — though you're not sure if you mean it. You take their storage pouch and spatial ring. Inside you find spirit herbs, ore, and a jade slip containing a technique. The cultivator watches with hollow eyes as you walk away. The heavens see all.`, statChanges: { luck: rand(-3, -1) }, hpChange: 0, alignmentChange: -20, herbsChange: rand(5, 10), oresChange: rand(3, 6), spChange: 0 };
        }
        // Cautious — 30% chance it IS a trap
        if (Math.random() < 0.3) {
          return { text: `Your caution saves you! The "injured cultivator" suddenly springs up, blade flashing — a bandit's trap! But you saw it coming. You deflect the strike and send them tumbling with a palm thrust. Their dropped pouch contains a few herbs.`, statChanges: { intelligence: rand(4, 8), strength: rand(2, 5) }, hpChange: -rand(5, 10), alignmentChange: 0, herbsChange: rand(2, 4), oresChange: 0, spChange: rand(3, 6) };
        }
        return { text: `You help them while keeping one hand on your sword. They are genuinely wounded — a beast attack, they explain. Once healed, they offer you a handful of spirit stones and a grateful bow. "Your caution is wise. Stay sharp, friend."`, statChanges: { reputation: rand(5, 10), wisdom: rand(2, 5), qi: rand(3, 6) }, hpChange: 0, alignmentChange: 5, herbsChange: rand(1, 3), oresChange: 0, spChange: rand(3, 6), npcGenerated: true, npcRole: 'ally' };
      },
    },
    {
      id: 'spirit_spring',
      category: 'fortunate',
      title: 'Spirit Spring!',
      icon: '💧',
      description: `Deep within ${area}, you hear the melodic sound of flowing water that seems to sing with Qi. Parting a curtain of luminous vines, you discover a small spring glowing with an ethereal blue light. The water itself is liquid spiritual energy — pure, ancient, and incredibly rare. The air around it makes your dantian resonate.`,
      choices: [
        { id: 'bathe', label: 'Bathe in the spring', icon: '🛁', description: 'Absorb the spiritual water directly.', karmaHint: 'neutral' },
        { id: 'meditate', label: 'Meditate beside it', icon: '🧘', description: 'Let the ambient Qi refine your foundation.', karmaHint: 'righteous' },
        { id: 'drink', label: 'Drink deeply', icon: '🥤', description: 'Consume the essence directly.', karmaHint: 'neutral' },
      ],
      resolve: (choiceId) => {
        if (choiceId === 'bathe') {
          return { text: `The water enfolds you like liquid starlight. Every pore of your body opens, drinking in spiritual energy. Your meridians widen, your dantian expands. When you emerge, your skin glows faintly, and your Qi circulation is permanently enhanced.`, statChanges: { qi: rand(15, 30), strength: rand(3, 7) }, hpChange: rand(20, 40), alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: rand(5, 10) };
        }
        if (choiceId === 'meditate') {
          return { text: `You sit in lotus position beside the spring. The ambient Qi is so dense it's almost visible — threads of blue and gold light weaving through the air. Hours pass like heartbeats. When you open your eyes, your understanding of Qi has deepened fundamentally.`, statChanges: { qi: rand(20, 35), wisdom: rand(5, 12), intelligence: rand(3, 7) }, hpChange: rand(15, 30), alignmentChange: 3, herbsChange: 0, oresChange: 0, spChange: rand(8, 15) };
        }
        return { text: `The water tastes like crystallized moonlight. Raw power surges through your body, almost too much to contain. Your cultivation base swells dramatically — but the intensity leaves you slightly dazed.`, statChanges: { qi: rand(25, 45) }, hpChange: -rand(5, 15), alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: rand(3, 8) };
      },
    },
    {
      id: 'mysterious_elder',
      category: 'fortunate',
      title: 'Mysterious Elder',
      icon: '👴',
      description: `Beneath an ancient tree whose roots seem to grip the very fabric of reality, an old figure sits perfectly still. They wear plain robes, but the spiritual pressure emanating from them makes the air itself tremble. As you approach, they speak without opening their eyes: "You carry the scent of destiny, child. I have waited a long time for someone like you."`,
      choices: [
        { id: 'kneel', label: 'Kneel and ask for guidance', icon: '🧎', description: 'Show respect to a master.', karmaHint: 'righteous' },
        { id: 'question', label: '"Who are you?"', icon: '❓', description: 'Demand answers first.', karmaHint: 'neutral' },
        { id: 'fight_elder', label: 'Test their strength', icon: '⚔️', description: 'Words mean nothing without power.', karmaHint: 'villainous' },
      ],
      resolve: (choiceId, gs) => {
        if (choiceId === 'kneel') {
          const techName = pick(['Celestial Palm Strike', 'Void Breathing Method', 'Heaven-Splitting Sword Intent', 'Primordial Body Forging']);
          return { text: `The elder smiles warmly. "Good. Humility is the foundation of all cultivation." They place a withered finger on your forehead, and a torrent of knowledge floods your mind — the ${techName}! Years of accumulated wisdom, compressed into a single moment. When the elder vanishes, only a lingering fragrance of sandalwood remains.`, statChanges: { qi: rand(15, 25), intelligence: rand(8, 16), wisdom: rand(6, 14) }, hpChange: 0, alignmentChange: 10, herbsChange: 0, oresChange: 0, spChange: rand(10, 20), techniqueLearned: techName };
        }
        if (choiceId === 'question') {
          return { text: `The elder finally opens their eyes — and the weight of a thousand years presses down on you. "I am no one. I am everyone. I am the mountain that watches." Cryptic nonsense... or is it? Their words lodge in your mind like seeds, and understanding blooms slowly.`, statChanges: { wisdom: rand(5, 12), intelligence: rand(3, 8), qi: rand(5, 10) }, hpChange: 0, alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: rand(5, 10) };
        }
        return { text: `You launch a strike at the elder. Their finger flicks — and you're embedded in a tree fifty meters away, every bone vibrating. "Foolish child," they sigh. "But brave. Bravery has value." They leave behind a single pill on the ground.`, statChanges: { strength: rand(3, 8), wisdom: rand(1, 4) }, hpChange: -rand(25, 50), alignmentChange: -8, herbsChange: 0, oresChange: 0, spChange: 0 };
      },
    },
    {
      id: 'wandering_merchant',
      category: 'fortunate',
      title: 'Wandering Merchant',
      icon: '🏪',
      description: `A tinkling of bells announces a peculiar sight — a merchant pulling a cart that seems far too large to fit on this narrow path. The cart is covered in glowing talismans, and the merchant's eyes shine with an unsettling intelligence. "Welcome, welcome! I deal in the extraordinary. Come, see what wonders I carry today."`,
      choices: [
        { id: 'browse', label: 'Browse their wares', icon: '🛒', description: 'Trade some resources for rare goods.', karmaHint: 'neutral' },
        { id: 'chat', label: 'Ask for rumors', icon: '💬', description: 'Information can be more valuable than goods.', karmaHint: 'neutral' },
        { id: 'decline', label: 'Politely decline', icon: '👋', description: 'You prefer to keep moving.', karmaHint: 'neutral' },
      ],
      resolve: (choiceId) => {
        if (choiceId === 'browse') {
          return { text: `You trade some herbs and ore for the merchant's curious goods — a bundle of rare materials and a small jade bottle containing a mysterious elixir. "Drink it when you're ready to break through," the merchant winks before vanishing around a bend.`, statChanges: { qi: rand(10, 20), luck: rand(2, 5) }, hpChange: 0, alignmentChange: 0, herbsChange: -rand(2, 4), oresChange: -rand(1, 2), spChange: rand(3, 8) };
        }
        if (choiceId === 'chat') {
          return { text: `The merchant leans in conspiratorially. "There's a hidden realm entrance three days north. And I hear the Jade Lotus Pavilion is recruiting. Oh — and never trust a cultivator who smiles too widely." Each word feels weighted with truth.`, statChanges: { intelligence: rand(5, 10), wisdom: rand(3, 7), luck: rand(2, 5) }, hpChange: 0, alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: rand(3, 6) };
        }
        return { text: `The merchant nods understandingly. "Not everyone is ready for what I sell. But remember — opportunity knocks only once." You walk on, slightly richer in wisdom if nothing else.`, statChanges: { wisdom: rand(1, 3) }, hpChange: 0, alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0 };
      },
    },
  ];
}

// ─── NEUTRAL ENCOUNTERS (25%) ─────────────────────────────────────

function generateNeutralEvents(state: GameState): ExploreEvent[] {
  const theme = getAreaTheme(state.realmIdx);
  const area = pick(theme.areas);

  return [
    {
      id: 'fellow_traveler',
      category: 'neutral',
      title: 'Fellow Traveler',
      icon: '🚶',
      description: `On the road through ${area}, you encounter another cultivator heading the same direction. They wear the robes of a ${pick(['minor sect', 'wandering cultivator', 'medicine hall'])} and carry a sword that has seen much use. They size you up — not with hostility, but with professional assessment. "The road ahead is dangerous alone," they say carefully. "Perhaps we could walk together?"`,
      choices: [
        { id: 'join', label: 'Walk together', icon: '🤝', description: 'Safety in numbers.', karmaHint: 'righteous' },
        { id: 'challenge', label: 'Spar instead', icon: '⚔️', description: 'Test each other first.', karmaHint: 'neutral' },
        { id: 'alone', label: 'Travel alone', icon: '🚶', description: 'You prefer solitude.', karmaHint: 'neutral' },
      ],
      resolve: (choiceId) => {
        if (choiceId === 'join') {
          return { text: `You travel together for a day, sharing stories and cultivation insights by the campfire. They teach you a breathing technique, and you share your knowledge of herb identification. Before parting, you exchange jade tokens — a sign of mutual respect.`, statChanges: { qi: rand(5, 12), intelligence: rand(3, 7), reputation: rand(3, 8), charm: rand(2, 5) }, hpChange: 0, alignmentChange: 5, herbsChange: rand(1, 3), oresChange: 0, spChange: rand(3, 6), npcGenerated: true, npcRole: 'ally' };
        }
        if (choiceId === 'challenge') {
          const won = Math.random() < 0.5;
          if (won) {
            return { text: `The spar is intense but controlled. After thirty exchanges, your opponent admits defeat gracefully. "You're skilled! Let me know if you ever need a training partner." They leave with a respectful bow.`, statChanges: { strength: rand(4, 10), qi: rand(3, 8), reputation: rand(3, 6) }, hpChange: -rand(5, 15), alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: rand(3, 6), npcGenerated: true, npcRole: 'ally' };
          }
          return { text: `Your opponent is faster than expected! After a fierce exchange, you yield. "Not bad," they grin, "but your footwork needs work." Humbling, but educational.`, statChanges: { strength: rand(3, 7), intelligence: rand(2, 5) }, hpChange: -rand(10, 20), alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0 };
        }
        return { text: `You nod politely and continue alone. The solitary path has its own rewards — you find a quiet spot to meditate and gather herbs along the way.`, statChanges: { qi: rand(3, 8), wisdom: rand(1, 4) }, hpChange: 0, alignmentChange: 0, herbsChange: rand(1, 3), oresChange: 0, spChange: 0 };
      },
    },
    {
      id: 'battlefield_aftermath',
      category: 'neutral',
      title: 'Sect War Aftermath',
      icon: '⚰️',
      description: `The stench hits you first — blood, burnt earth, and the acrid tang of dissipated Qi. You've stumbled upon the aftermath of a sect war. Craters scar the landscape, shattered weapons litter the ground, and the occasional spatial ring glints among the fallen. It's a graveyard of cultivators... and a treasure trove for the bold. But survivors may yet lurk among the rubble.`,
      choices: [
        { id: 'loot', label: 'Search the battlefield', icon: '💎', description: 'Risky but potentially very rewarding.', karmaHint: 'villainous' },
        { id: 'help_wounded', label: 'Search for survivors', icon: '💚', description: 'Someone may still be alive.', karmaHint: 'righteous' },
        { id: 'leave', label: 'Leave this cursed place', icon: '🏃', description: 'The dead should rest in peace.', karmaHint: 'neutral' },
      ],
      resolve: (choiceId) => {
        if (choiceId === 'loot') {
          if (Math.random() < 0.3) {
            return { text: `A "corpse" suddenly grabs your ankle — a surviving cultivator, half-mad with pain and rage! You fight them off, but take wounds in the process. At least you managed to grab some ore and herbs.`, statChanges: { strength: rand(2, 5) }, hpChange: -rand(20, 40), alignmentChange: -8, herbsChange: rand(2, 4), oresChange: rand(2, 5), spChange: rand(3, 6) };
          }
          return { text: `You move carefully among the fallen, collecting spatial rings and scattered materials. The haul is impressive — rare ores, spirit herbs, and a few intact technique scrolls. The heavens may judge you, but your pockets don't care.`, statChanges: { luck: rand(2, 5) }, hpChange: 0, alignmentChange: -12, herbsChange: rand(4, 8), oresChange: rand(3, 7), spChange: rand(5, 12) };
        }
        if (choiceId === 'help_wounded') {
          return { text: `You find three survivors clinging to life and use your herbs to stabilize them. One turns out to be a sect elder's disciple — they swear a life debt to you. Word of your compassion will spread far and wide.`, statChanges: { reputation: rand(10, 20), wisdom: rand(3, 7), charm: rand(2, 5) }, hpChange: 0, alignmentChange: 15, herbsChange: -rand(2, 4), oresChange: 0, spChange: rand(8, 15), npcGenerated: true, npcRole: 'ally' };
        }
        return { text: `You bow once to the fallen and walk away. Some places are best left undisturbed. A strange peace settles over you — wisdom in knowing when not to act.`, statChanges: { wisdom: rand(3, 8), qi: rand(2, 6) }, hpChange: 0, alignmentChange: 3, herbsChange: 0, oresChange: 0, spChange: 0 };
      },
    },
    {
      id: 'wanted_poster',
      category: 'neutral',
      title: 'Wanted Poster',
      icon: '📜',
      description: `Nailed to a tree at the edge of ${area}, a wanted poster flutters in the wind. The face depicted is scarred and vicious — a rogue cultivator who has been terrorizing nearby villages. The bounty is generous: "500 Spirit Stones, Dead or Alive."`,
      choices: [
        { id: 'accept', label: 'Accept the bounty', icon: '✅', description: 'Track down this criminal for justice and profit.', karmaHint: 'righteous' },
        { id: 'ignore', label: 'Not your problem', icon: '🤷', description: 'You have your own path to walk.', karmaHint: 'neutral' },
      ],
      resolve: (choiceId) => {
        if (choiceId === 'accept') {
          return { text: `You memorize the face and begin tracking. After hours of pursuit, you corner the rogue — but they're stronger than the poster suggested. Still, you drive them off and claim a partial bounty from the grateful villagers.`, statChanges: { strength: rand(3, 8), reputation: rand(5, 12), luck: rand(1, 4) }, hpChange: -rand(10, 25), alignmentChange: 8, herbsChange: 0, oresChange: 0, spChange: rand(8, 15) };
        }
        return { text: `You tear off the poster and pocket it — perhaps useful later. For now, your path leads elsewhere. The world's problems are not all yours to solve.`, statChanges: { wisdom: rand(1, 3) }, hpChange: 0, alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0 };
      },
    },
  ];
}

// ─── DANGEROUS ENCOUNTERS (20%) ───────────────────────────────────

function generateDangerousEvents(state: GameState): ExploreEvent[] {
  const theme = getAreaTheme(state.realmIdx);
  const area = pick(theme.areas);
  const beast = pick(theme.beasts);

  return [
    {
      id: 'formation_trap',
      category: 'dangerous',
      title: 'Formation Trap!',
      icon: '⚡',
      description: `The ground beneath your feet suddenly erupts with light — killing formations, hidden beneath layers of leaves and soil! Lines of crimson Qi crisscross the air, forming a cage of lethal energy. Someone planted this specifically to catch unwary cultivators. The formations tighten with each passing second.`,
      choices: [
        { id: 'break', label: 'Shatter the formation', icon: '💥', description: 'Use brute Qi force to escape.', karmaHint: 'neutral' },
        { id: 'decode', label: 'Find the formation core', icon: '🧩', description: 'Intelligence might save you.', karmaHint: 'neutral' },
        { id: 'endure', label: 'Shield and endure', icon: '🛡️', description: 'Wait for it to run out of energy.', karmaHint: 'neutral' },
      ],
      resolve: (choiceId, gs) => {
        if (choiceId === 'break') {
          const success = gs.stats.qi + gs.stats.strength > rand(40, 100);
          if (success) {
            return { text: `You channel every ounce of Qi into your fist and SLAM it into the ground. The formation cracks, then shatters like glass. Among the debris, you find the formation flags — valuable materials!`, statChanges: { strength: rand(4, 10), qi: rand(3, 8) }, hpChange: -rand(10, 20), alignmentChange: 0, herbsChange: 0, oresChange: rand(2, 4), spChange: rand(3, 8) };
          }
          return { text: `You blast the formation with everything you have — but it absorbs your Qi and strikes back! The backlash sends you flying, battered and drained. You crawl free as the formation finally fades.`, statChanges: { strength: rand(2, 5) }, hpChange: -rand(25, 50), alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0 };
        }
        if (choiceId === 'decode') {
          const success = gs.stats.intelligence + gs.stats.wisdom > rand(30, 80);
          if (success) {
            return { text: `Your eyes trace the Qi lines to their source — there! A jade stake buried at the northeast corner. You yank it free and the entire formation collapses. Brilliant! You keep the formation materials for study.`, statChanges: { intelligence: rand(6, 14), wisdom: rand(3, 8) }, hpChange: 0, alignmentChange: 0, herbsChange: 0, oresChange: rand(1, 3), spChange: rand(5, 12) };
          }
          return { text: `You almost have it — but a secondary formation activates as you reach for the core! The trap within the trap catches you, and lightning Qi sears through your body before you can wrench free.`, statChanges: { intelligence: rand(3, 7) }, hpChange: -rand(20, 40), alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0 };
        }
        return { text: `You wrap yourself in protective Qi and grit your teeth as the formation hammers at your defenses. It feels like an eternity, but eventually the formation exhausts its stored energy and fades. You're battered but alive and wiser.`, statChanges: { wisdom: rand(3, 8), qi: rand(2, 6) }, hpChange: -rand(15, 30), alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0 };
      },
    },
    {
      id: 'tribulation_interference',
      category: 'dangerous',
      title: 'Tribulation Lightning!',
      icon: '🌩️',
      description: `The sky tears open above ${area}. Somewhere nearby, a cultivator is undergoing their Heavenly Tribulation — and the overflow of heavenly lightning is arcing wildly across the landscape! Purple-white bolts of tribulation energy crash into the ground around you, each one carrying enough force to annihilate a mountain. The wild Qi is disrupting your own cultivation base.`,
      choices: [
        { id: 'absorb', label: 'Try to absorb the stray lightning', icon: '⚡', description: 'Extremely risky, extremely rewarding.', karmaHint: 'neutral' },
        { id: 'hide', label: 'Find cover and wait', icon: '🏔️', description: 'The safe choice.', karmaHint: 'neutral' },
        { id: 'observe', label: 'Study the tribulation', icon: '👁️', description: 'Rare opportunity to understand the Dao.', karmaHint: 'neutral' },
      ],
      resolve: (choiceId, gs) => {
        if (choiceId === 'absorb') {
          if (gs.stats.qi + gs.stats.wisdom > rand(60, 120)) {
            return { text: `PAIN. Every nerve ignites as heavenly lightning courses through your meridians. But you hold on, forcing the wild energy into your dantian. When the storm passes, your cultivation has been tempered by heaven itself — your Qi is purer, stronger, more refined than ever.`, statChanges: { qi: rand(30, 60), strength: rand(5, 12), wisdom: rand(3, 8) }, hpChange: -rand(20, 40), alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: rand(10, 20) };
          }
          return { text: `The lightning is too much — it rips through your defenses like paper! Your body convulses as heavenly energy scorches your meridians. You survive, barely, but your cultivation base is shaken.`, statChanges: { wisdom: rand(2, 5) }, hpChange: -rand(40, 70), alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0 };
        }
        if (choiceId === 'hide') {
          return { text: `You dive behind a boulder formation and wait out the storm. The ground shakes, the air crackles, and twice you feel lightning strike close enough to singe your eyebrows. When it finally passes, you're shaken but intact.`, statChanges: { luck: rand(2, 5), qi: rand(3, 8) }, hpChange: -rand(5, 12), alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0 };
        }
        return { text: `You watch the tribulation from a safe distance, memorizing the patterns of heavenly lightning. The way it spirals, the rhythm of the strikes, the resonance with the Dao of Destruction — all of it imprints itself on your mind. This knowledge is priceless for when your own tribulation comes.`, statChanges: { wisdom: rand(8, 16), intelligence: rand(5, 10), qi: rand(5, 12) }, hpChange: -rand(5, 10), alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: rand(5, 12) };
      },
    },
    {
      id: 'powerful_beast_territory',
      category: 'dangerous',
      title: `${beast} Territory!`,
      icon: '🐲',
      description: `The trees ahead are scarred with claw marks the size of your arm. The ground is littered with bones — other beasts, cultivators, even the remnants of spirit artifacts. You have wandered into the territory of an apex ${beast}. A rumbling growl echoes from deeper in the forest. It knows you're here.`,
      choices: [
        { id: 'fight', label: 'Face the beast', icon: '⚔️', description: 'Glory or death.', karmaHint: 'neutral' },
        { id: 'flee', label: 'Run immediately', icon: '🏃', description: 'No shame in living.', karmaHint: 'neutral' },
        { id: 'offering', label: 'Leave an offering', icon: '🎁', description: 'Show respect to the alpha.', karmaHint: 'neutral' },
      ],
      resolve: (choiceId) => {
        if (choiceId === 'fight') {
          return { text: '', statChanges: {}, hpChange: 0, alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0, triggerBattle: true, battleEnemyKind: 'beast' };
        }
        if (choiceId === 'flee') {
          if (Math.random() < 0.6) {
            return { text: `You sprint through the underbrush, heart pounding. A massive shape crashes through the trees behind you, but you're faster — barely. You escape the territory with nothing but your life and a newfound appreciation for it.`, statChanges: { luck: rand(2, 5) }, hpChange: -rand(5, 15), alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0 };
          }
          return { text: `You turn to run — and a massive paw slams you into a tree. The ${beast} stands over you, hot breath on your face. Just when you think it's over, it snorts dismissively and stalks away. You're beneath its notice. Humiliating, but you'll live.`, statChanges: { wisdom: rand(2, 5) }, hpChange: -rand(25, 45), alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0 };
        }
        return { text: `You place a healing pill and some herbs on a flat stone and back away slowly. The ${beast} approaches, sniffs the offering, and consumes it. It looks at you with ancient, knowing eyes — and nods. It actually nods. Then it turns and vanishes into the forest.`, statChanges: { wisdom: rand(5, 10), luck: rand(3, 7), charm: rand(1, 4) }, hpChange: 0, alignmentChange: 5, herbsChange: -rand(1, 3), oresChange: 0, spChange: rand(3, 8) };
      },
    },
    {
      id: 'sect_assassination',
      category: 'dangerous',
      title: 'Assassination!',
      icon: '☠️',
      description: `Three figures materialize from the shadows, their killing intent so dense it distorts the air. They wear identical black robes marked with a crimson fang — the symbol of a sect assassination squad. "Our master sends their regards," the leader speaks softly. "You've made powerful enemies, ${pick(['fellow cultivator', 'young one', 'prey'])}."`,
      choices: [
        { id: 'fight', label: 'Fight them all', icon: '⚔️', description: 'Three against one. Bad odds.', karmaHint: 'neutral' },
        { id: 'bluff', label: '"Your master is already dead"', icon: '😏', description: 'A bold bluff might shake them.', karmaHint: 'neutral' },
        { id: 'flee_smoke', label: 'Use a smoke bomb and flee', icon: '💨', description: 'Discretion is the better part of valor.', karmaHint: 'neutral' },
      ],
      resolve: (choiceId, gs) => {
        if (choiceId === 'fight') {
          return { text: '', statChanges: {}, hpChange: 0, alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0, triggerBattle: true, battleEnemyKind: 'assassin' };
        }
        if (choiceId === 'bluff') {
          const success = gs.stats.charm + gs.stats.intelligence > rand(40, 80);
          if (success) {
            return { text: `Your voice drips with cold confidence. The assassins hesitate — doubt flickering across their faces. "Check your communication talisman," you say smoothly. The leader does... and their eyes widen. The talisman is indeed silent. They exchange glances and vanish into the night.`, statChanges: { charm: rand(4, 10), intelligence: rand(3, 7), reputation: rand(3, 8) }, hpChange: 0, alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: rand(5, 10) };
          }
          return { text: `"Nice try," the leader smirks. They attack in unison — you manage to fend them off and escape, but not without wounds. Those aren't amateurs.`, statChanges: { strength: rand(3, 7) }, hpChange: -rand(25, 45), alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0 };
        }
        return { text: `You hurl a formation flag at the ground — it erupts in blinding light and choking smoke. In the confusion, you activate your movement technique and vanish. The assassins curse as they search empty air. You'll deal with their master another day.`, statChanges: { luck: rand(3, 7), intelligence: rand(2, 5) }, hpChange: 0, alignmentChange: 0, herbsChange: 0, oresChange: 0, spChange: 0 };
      },
    },
  ];
}

// ─── MAIN GENERATION FUNCTION ─────────────────────────────────────

export function generateExploreEvent(state: GameState): ExploreEvent {
  const roll = Math.random();
  let pool: ExploreEvent[];

  if (roll < 0.30) {
    pool = generateCombatEvents(state);
  } else if (roll < 0.55) {
    pool = generateFortunateEvents(state);
  } else if (roll < 0.80) {
    pool = generateNeutralEvents(state);
  } else {
    pool = generateDangerousEvents(state);
  }

  return pick(pool);
}
