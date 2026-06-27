import React, { useState } from 'react';
import { GameState, NPC, Item } from '../game/types';
import { REALMS, REALM_COLORS, generateNPC, calculateWinChance, getTotalStage } from '../game/constants';
import { canCourtNpc, getCourtSuccessChance, attemptCourting } from '../game/family';
import { addLootToState } from '../game/engine';

interface Props { state: GameState; onClose: () => void; onAction: (state: GameState) => void }

// ─── MOOD SYSTEM ──────────────────────────────────────────────────
type Mood = 'cheerful' | 'neutral' | 'irritable';
const MOOD_INFO: Record<Mood, { icon: string; label: string; color: string }> = {
  cheerful: { icon: '😊', label: 'Cheerful', color: '#2dd4a0' },
  neutral: { icon: '😐', label: 'Neutral', color: '#888' },
  irritable: { icon: '😠', label: 'Irritable', color: '#e63946' },
};
function rollMood(): Mood {
  const r = Math.random();
  if (r < 0.3) return 'cheerful';
  if (r < 0.7) return 'neutral';
  return 'irritable';
}

// ─── DIALOGUE RESULT ──────────────────────────────────────────────
interface TalkResult { narrative: string; relChange: number; statChanges: Record<string, number>; triggerDuel: boolean }

// ─── DIALOGUE GENERATORS ──────────────────────────────────────────
function resolveGreet(npc: NPC, mood: Mood, playerName: string): TalkResult {
  const p = npc.personality;
  const moodMul = mood === 'cheerful' ? 1.5 : mood === 'irritable' ? 0 : 1;

  if (p === 'friendly' || p === 'loyal') {
    const rel = Math.floor(2 * moodMul);
    const lines = mood === 'cheerful'
      ? `${npc.name}'s face lights up the moment they see you. "${playerName}! What a wonderful surprise! Come, sit with me — I was just brewing spirit tea." Their warmth is genuine, and the simple exchange lifts your spirits.`
      : mood === 'irritable'
      ? `${npc.name} glances up from sharpening their sword. "Oh. ${playerName}." They nod curtly but don't smile. Something is clearly weighing on their mind today, and they aren't in the mood for pleasantries.`
      : `${npc.name} greets you with a warm nod. "Good to see you, ${playerName}. The path treating you well?" A comfortable, easy exchange between acquaintances.`;
    return { narrative: lines, relChange: rel, statChanges: {}, triggerDuel: false };
  }
  if (p === 'cold') {
    const rel = mood === 'cheerful' ? 1 : 0;
    const lines = mood === 'cheerful'
      ? `${npc.name} acknowledges your greeting with the faintest nod — practically a warm embrace by their standards. "...${playerName}." A pause. "You may sit, if you wish." For them, this is practically rolling out the red carpet.`
      : mood === 'irritable'
      ? `${npc.name}'s gaze passes through you like you're made of glass. "I am occupied, ${playerName}." The dismissal is absolute. You might as well have greeted a glacier.`
      : `"${playerName}." ${npc.name} acknowledges you with a single syllable and nothing more. Their eyes remain fixed on the horizon. Conversation is clearly not a priority.`;
    return { narrative: lines, relChange: rel, statChanges: {}, triggerDuel: false };
  }
  if (p === 'arrogant') {
    const rel = 0;
    const lines = mood === 'cheerful'
      ? `${npc.name} is in unusually high spirits. "Ah, ${playerName}. I suppose even common cultivators deserve a moment of my attention today." They wave magnanimously. Still insufferable, but at least they're talking.`
      : mood === 'irritable'
      ? `${npc.name} sneers at your approach. "Do I look like I have time for ants, ${playerName}? Speak quickly or leave." Their spiritual pressure flares briefly — a warning, not an attack. Yet.`
      : `"${playerName}." ${npc.name} looks down their nose at you — impressive given you're the same height. "I acknowledge your existence. Don't let it go to your head."`;
    return { narrative: lines, relChange: rel, statChanges: {}, triggerDuel: false };
  }
  if (p === 'mysterious') {
    const rel = mood === 'cheerful' ? 2 : 1;
    const lines = `${npc.name} turns to face you before you even speak, as if they sensed your approach from a mile away. "The winds carry your name today, ${playerName}. ${mood === 'cheerful' ? 'They speak kindly of you.' : mood === 'irritable' ? 'They carry warnings.' : 'What they mean... remains to be seen.'}"`;
    return { narrative: lines, relChange: rel, statChanges: {}, triggerDuel: false };
  }
  // deceitful
  const rel = mood === 'cheerful' ? 2 : 1;
  const lines = `${npc.name} breaks into a wide smile that doesn't quite reach their eyes. "${playerName}~! My very favorite person! ${mood === 'cheerful' ? 'I was JUST thinking about you!' : 'How delightful to see you.'}" You can't shake the feeling of being studied.`;
  return { narrative: lines, relChange: rel, statChanges: {}, triggerDuel: false };
}

function resolveTrainTogether(npc: NPC, mood: Mood, playerName: string): TalkResult {
  const p = npc.personality;
  const moodMul = mood === 'cheerful' ? 1.5 : mood === 'irritable' ? 0.5 : 1;

  if (p === 'friendly' || p === 'loyal') {
    const rel = Math.floor(5 * moodMul);
    return {
      narrative: `${npc.name}'s eyes light up at your proposal. "Train together? ${playerName}, I was hoping you'd ask!" You spend the next hour exchanging moves and techniques. ${npc.name} is surprisingly skilled — you both push each other to improve. By the end, you're both panting but grinning.`,
      relChange: rel, statChanges: { strength: 2, qi: 1 }, triggerDuel: false,
    };
  }
  if (p === 'cold') {
    if (mood === 'irritable') {
      return { narrative: `${npc.name} stares at you flatly. "I train alone, ${playerName}. Always." They turn their back and resume their kata. The conversation is over before it began.`, relChange: -1, statChanges: {}, triggerDuel: false };
    }
    return { narrative: `${npc.name} considers your request for a long, silent moment. "...Acceptable." The training session is wordless but intense. They correct your stance exactly once, with a single finger. It improves your form dramatically.`, relChange: Math.floor(3 * moodMul), statChanges: { strength: 3 }, triggerDuel: false };
  }
  if (p === 'arrogant') {
    if (mood === 'irritable') {
      return { narrative: `"YOU want to train with ME?" ${npc.name} laughs coldly. "Know your place, ${playerName}. If you want to learn, watch from a distance." The humiliation stings — but they weren't entirely wrong. Their form IS flawless.`, relChange: -2, statChanges: { wisdom: 1 }, triggerDuel: false };
    }
    // Arrogant NPCs see training as a challenge
    return { narrative: `${npc.name}'s eyes narrow. "You dare suggest we are equals, ${playerName}? Very well — prove it!" What started as training becomes a fierce sparring match. ${npc.name}'s pride won't allow anything less than full effort.`, relChange: 0, statChanges: { strength: 2 }, triggerDuel: true };
  }
  if (p === 'mysterious') {
    return { narrative: `${npc.name} tilts their head. "An interesting request, ${playerName}." Instead of physical training, they guide you through a bizarre meditation — sitting in silence while they hum an ancient melody. Strangely, your Qi flows more smoothly afterward.`, relChange: Math.floor(3 * moodMul), statChanges: { qi: 3, wisdom: 1 }, triggerDuel: false };
  }
  // deceitful
  return { narrative: `"Of course, ${playerName}!" ${npc.name} agrees eagerly. During training, you notice they're carefully studying your techniques — memorizing weaknesses rather than helping you improve. Still, the exercise itself is beneficial.`, relChange: Math.floor(2 * moodMul), statChanges: { strength: 1 }, triggerDuel: false };
}

function resolveInsult(npc: NPC, mood: Mood, playerName: string): TalkResult {
  const p = npc.personality;

  if (p === 'arrogant') {
    if (mood === 'irritable') {
      return { narrative: `Your words barely leave your mouth before ${npc.name}'s killing intent crashes down on you like a tidal wave. "You DARE mock me, ${playerName}?!" They draw their weapon. This is no longer a conversation.`, relChange: -15, statChanges: {}, triggerDuel: true };
    }
    // Arrogant NPCs might secretly respect boldness
    return { narrative: `${npc.name} freezes mid-sip of their tea. For a heartbeat, their eyes flash with fury — then, unexpectedly, they bark a laugh. "You've got spine, ${playerName}. Stupid, suicidal spine... but spine nonetheless." They regard you with a fraction more interest than before.`, relChange: 2, statChanges: {}, triggerDuel: false };
  }
  if (p === 'friendly' || p === 'loyal') {
    return { narrative: `${npc.name} recoils as if struck. "${playerName}... why would you say that?" The hurt in their eyes is genuine. They turn away, shoulders tense. "I thought we were... never mind." The guilt is immediate and crushing.`, relChange: -10, statChanges: {}, triggerDuel: false };
  }
  if (p === 'cold') {
    return { narrative: `${npc.name}'s expression doesn't change. Not even a flicker. "${playerName}." They hold your gaze for three full seconds, then simply walk away. Somehow, their complete indifference stings worse than any retaliation would.`, relChange: -5, statChanges: {}, triggerDuel: false };
  }
  if (p === 'mysterious') {
    return { narrative: `${npc.name} smiles — genuinely smiles — at your insult. "Interesting. You lash out because you fear, ${playerName}. What is it you fear?" The question cuts deeper than any blade. You have no answer.`, relChange: -3, statChanges: { wisdom: 1 }, triggerDuel: false };
  }
  // deceitful - remembers insults, hides reaction
  return { narrative: `${npc.name}'s smile doesn't waver for even a second. "Oh ${playerName}, you're SO funny!" But something shifts behind their eyes — something cold and calculating. They're filing this away. Every word.`, relChange: -8, statChanges: {}, triggerDuel: false };
}

function resolveAskPast(npc: NPC, mood: Mood, playerName: string): TalkResult {
  const p = npc.personality;
  const moodMul = mood === 'cheerful' ? 1.5 : mood === 'irritable' ? 0 : 1;

  if (p === 'mysterious') {
    const rel = Math.floor(8 * moodMul);
    return { narrative: `${npc.name}'s eyes unfocus, gazing into memories only they can see. "Once, I stood where heaven meets earth, ${playerName}. I saw the face of the Dao... and it saw me." They share fragments — cryptic, beautiful, haunting. Each word carries the weight of lifetimes. You feel your understanding deepen.`, relChange: rel, statChanges: { wisdom: 3, intelligence: 2 }, triggerDuel: false };
  }
  if (p === 'friendly') {
    const rel = Math.floor(8 * moodMul);
    return { narrative: `${npc.name} settles down with a nostalgic smile. "My past? Well, ${playerName}, it begins in a small village..." What follows is a genuine, heartfelt story — losses, triumphs, and the quiet moments in between. By the end, you feel like you truly know them.`, relChange: rel, statChanges: { charm: 1 }, triggerDuel: false };
  }
  if (p === 'loyal') {
    const rel = Math.floor(6 * moodMul);
    return { narrative: `${npc.name} hesitates, then nods. "If you truly wish to know, ${playerName}..." They speak of a debt — a life saved, a promise made. "That is why I follow without question. Loyalty is the only truth I know." Their sincerity is overwhelming.`, relChange: rel, statChanges: {}, triggerDuel: false };
  }
  if (p === 'cold') {
    if (mood === 'irritable') {
      return { narrative: `${npc.name}'s jaw tightens. "My past is none of your concern, ${playerName}." The temperature in the room seems to drop. You've touched a nerve — a deep one. They leave without another word.`, relChange: -3, statChanges: {}, triggerDuel: false };
    }
    return { narrative: `A long silence stretches between you. Then: "I had a sect once, ${playerName}. I had people." ${npc.name} says nothing more, but the weight of those words says everything. Perhaps in time, they'll share more.`, relChange: Math.floor(2 * moodMul), statChanges: {}, triggerDuel: false };
  }
  if (p === 'arrogant') {
    return { narrative: `${npc.name} scoffs. "My past? It's a chronicle of victories, ${playerName}. Every opponent crushed, every peak conquered." They launch into a self-aggrandizing monologue that's 80% exaggeration and 20% actually impressive feats.`, relChange: -1, statChanges: {}, triggerDuel: false };
  }
  // deceitful
  return { narrative: `${npc.name}'s smile turns soft, vulnerable. "Oh ${playerName}... I've been through so much..." They spin a tragic tale that tugs at your heartstrings. It's beautifully told. Whether any of it is true is another matter entirely.`, relChange: Math.floor(3 * moodMul), statChanges: {}, triggerDuel: false };
}

// ─── CONSTANTS ────────────────────────────────────────────────────
const NPC_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  sect_elder: { label: 'Sect Elder', color: '#ff6644' },
  senior_disciple: { label: 'Senior Disciple', color: '#f0c040' },
  disciple: { label: 'Disciple', color: '#4488ff' },
  wanderer: { label: 'Wanderer', color: '#888888' },
  bandit: { label: 'Bandit', color: '#aa4444' },
  merchant: { label: 'Merchant', color: '#44aa88' },
  hermit: { label: 'Hermit', color: '#9966ff' },
};

const GREETING = {
  friendly: (n: string) => `${n}! It's wonderful to see you!`,
  cold: (n: string) => `What do you want, ${n}?`,
  arrogant: (n: string) => `Hmph. ${n}. Still breathing, I see.`,
  mysterious: (n: string) => `The stars whispered your name, ${n}...`,
  loyal: (n: string) => `${n}! I would follow you anywhere!`,
  deceitful: (n: string) => `${n}~! My dearest companion!`,
};

const DIALOGUE_KILL_BEG = ["Please... have mercy!", "I was wrong to challenge you!", "Spare me! I'll serve you!"];

function getRelationshipLabel(rel: number): { label: string; color: string } {
  if (rel >= 80) return { label: 'Close Friend', color: '#2dd4a0' };
  if (rel >= 60) return { label: 'Ally', color: '#4488ff' };
  if (rel >= 30) return { label: 'Acquaintance', color: '#66aacc' };
  if (rel > -30) return { label: 'Neutral', color: '#888' };
  if (rel > -60) return { label: 'Rival', color: '#f0c040' };
  return { label: 'Enemy', color: '#e63946' };
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

type CombatResult = { won: boolean; hpLost: number; message: string } | null;

// ═══════════════════════════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════════════════════════

export const NPCInteraction: React.FC<Props> = ({ state, onClose, onAction }) => {
  const [selectedNpc, setSelectedNpc] = useState<NPC | null>(null);
  const [dialogue, setDialogue] = useState<string>('');
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [showTalkPanel, setShowTalkPanel] = useState(false);
  const [combatResult, setCombatResult] = useState<CombatResult>(null);
  const [npcMood, setNpcMood] = useState<Mood>('neutral');

  const selectNpc = (npc: NPC) => {
    const mood = rollMood();
    setNpcMood(mood);
    setSelectedNpc(npc);
    setDialogue(GREETING[npc.personality as keyof typeof GREETING](state.playerName));
    setShowTalkPanel(false);
    setShowGiftPanel(false);
    setCombatResult(null);
  };

  const meetNewPerson = () => {
    const newNpc = generateNPC(state.realmIdx);
    const typeInfo = NPC_TYPE_LABELS[newNpc.npcType] || { label: 'Unknown', color: '#888' };
    onAction({ ...state, npcs: [...state.npcs, newNpc], log: [...state.log, { year: state.year, age: state.age, text: `You meet ${newNpc.name}, a ${newNpc.personality} ${typeInfo.label} (${REALMS[newNpc.realmIdx]} — ${newNpc.stage}).`, type: 'event' as const }] });
    selectNpc(newNpc);
  };

  // ─── TALK DIALOGUE CHOICES ────────────────────────────────────
  const handleTalkChoice = (choiceId: string) => {
    if (!selectedNpc) return;
    let result: TalkResult;
    switch (choiceId) {
      case 'greet': result = resolveGreet(selectedNpc, npcMood, state.playerName); break;
      case 'train': result = resolveTrainTogether(selectedNpc, npcMood, state.playerName); break;
      case 'insult': result = resolveInsult(selectedNpc, npcMood, state.playerName); break;
      case 'ask_past': result = resolveAskPast(selectedNpc, npcMood, state.playerName); break;
      default: return;
    }

    const newRel = Math.max(-100, Math.min(100, selectedNpc.relationship + result.relChange));
    const updatedNpc = { ...selectedNpc, relationship: newRel, memory: { ...selectedNpc.memory, lastInteraction: choiceId, timesInsulted: choiceId === 'insult' ? selectedNpc.memory.timesInsulted + 1 : selectedNpc.memory.timesInsulted } };

    const relText = result.relChange > 0 ? `+${result.relChange}` : result.relChange < 0 ? `${result.relChange}` : '0';
    const statParts = Object.entries(result.statChanges).filter(([, v]) => v).map(([k, v]) => `+${v} ${k}`);
    const metaLine = `(${relText} relationship${statParts.length > 0 ? ', ' + statParts.join(', ') : ''})`;

    setSelectedNpc(updatedNpc);
    setDialogue(`${result.narrative}\n\n${metaLine}`);
    setShowTalkPanel(false);

    // Apply stat changes
    const newStats = { ...state.stats };
    for (const [k, v] of Object.entries(result.statChanges)) { if (v) newStats[k as keyof typeof newStats] += v; }

    onAction({ ...state, npcs: state.npcs.map(n => n.id === selectedNpc.id ? updatedNpc : n), stats: newStats, log: [...state.log, { year: state.year, age: state.age, text: `💬 Talked to ${selectedNpc.name}. ${metaLine}`, type: 'event' as const }] });

    if (result.triggerDuel) {
      setTimeout(() => challengeNpc(updatedNpc), 800);
    }
  };

  // ─── GIFT ──────────────────────────────────────────────────────
  const giftItem = (npc: NPC, item: Item) => {
    const qualityBonus: Record<string, number> = { Common: 5, Uncommon: 10, Rare: 15, Legendary: 25, Divine: 40 };
    let relGain = qualityBonus[item.quality] || 10;
    if (npc.personality === 'arrogant') relGain = Math.floor(relGain * 0.6);
    if (npc.personality === 'friendly') relGain = Math.floor(relGain * 1.3);
    if (npcMood === 'cheerful') relGain = Math.floor(relGain * 1.5);
    if (npcMood === 'irritable') relGain = Math.floor(relGain * 0.5);

    const updatedNpc = { ...npc, relationship: Math.min(100, npc.relationship + relGain), memory: { ...npc.memory, giftsReceived: [...npc.memory.giftsReceived, item.name], lastInteraction: 'gift' } };
    setSelectedNpc(updatedNpc);
    setDialogue(`"Thank you for the ${item.name}, ${state.playerName}!" (+${relGain} relationship)`);
    setShowGiftPanel(false);
    onAction({ ...state, npcs: state.npcs.map(n => n.id === npc.id ? updatedNpc : n), inventory: state.inventory.filter(i => i.id !== item.id), log: [...state.log, { year: state.year, age: state.age, text: `Gave ${item.name} to ${npc.name}. (+${relGain} relationship)`, type: 'event' as const }] });
  };

  // ─── CHALLENGE ─────────────────────────────────────────────────
  const challengeNpc = (npc: NPC) => {
    const winChance = calculateWinChance(state.realmIdx, state.stage, npc.realmIdx, npc.stage, state.stats.luck, state.stats.strength, state.stats.qi);
    const won = Math.random() * 100 < winChance;
    const diff = getTotalStage(npc.realmIdx, npc.stage) - getTotalStage(state.realmIdx, state.stage);
    let hpLoss = won ? Math.floor((Math.random() * 15 + 5) * Math.max(1, 1 + diff * 0.2)) : Math.floor((Math.random() * 20 + 15) * Math.max(1, 1 + diff * 0.3));
    const message = won ? `🏆 VICTORY! (${winChance.toFixed(0)}% chance)` : `💔 DEFEAT! (${winChance.toFixed(0)}% chance)`;
    const updatedNpc = { ...npc, memory: { ...npc.memory, hasFought: true, fightResult: won ? 'won' as const : 'lost' as const, lastInteraction: 'challenge' } };
    setSelectedNpc(updatedNpc);
    setCombatResult({ won, hpLost: hpLoss, message });
    setDialogue('');
    setShowTalkPanel(false);
    onAction({ ...state, npcs: state.npcs.map(n => n.id === npc.id ? updatedNpc : n), hp: Math.max(1, state.hp - hpLoss), log: [...state.log, { year: state.year, age: state.age, text: `${won ? 'Defeated' : 'Lost to'} ${npc.name}! (-${hpLoss} HP, ${winChance.toFixed(0)}%)`, type: 'combat' as const }] });
  };

  const spareNpc = (npc: NPC) => {
    const updatedNpc = { ...npc, relationship: Math.min(100, npc.relationship + 15), hostile: false };
    setSelectedNpc(updatedNpc); setCombatResult(null);
    setDialogue(`${npc.name} bows their head. "I won't forget your mercy, ${state.playerName}." (+15 relationship, +5 reputation)`);
    onAction({ ...state, npcs: state.npcs.map(n => n.id === npc.id ? updatedNpc : n), stats: { ...state.stats, reputation: state.stats.reputation + 5 }, alignment: Math.min(100, state.alignment + 5) });
  };

  const killNpc = (npc: NPC) => {
    let alShift = -15, repChange = -10;
    if (npc.hostile || npc.personality === 'deceitful' || npc.npcType === 'bandit') { alShift = -5; repChange = 0; }
    if (npc.relationship >= 30) { alShift = -30; repChange = -25; }
    if (npc.npcType === 'sect_elder') { alShift = -40; repChange = -30; }
    if (npc.relationship <= -30) { repChange = 3; }
    const triggerManhunt = npc.npcType === 'sect_elder';
    setSelectedNpc(null); setCombatResult(null); setDialogue('');
    let s = { ...state, npcs: state.npcs.filter(n => n.id !== npc.id), stats: { ...state.stats, reputation: Math.max(0, state.stats.reputation + repChange) }, alignment: Math.max(-100, state.alignment + alShift), rivals: triggerManhunt ? [...state.rivals, `${npc.name}'s Sect`] : state.rivals };
    // Add NPC loot to inventory
    if (npc.loot && npc.loot.length > 0) {
      s = addLootToState(s, npc.loot);
    }
    s.log = [...s.log, { year: s.year, age: s.age, text: `☠️ Killed ${npc.name}. (${alShift} alignment, ${repChange} rep)`, type: 'combat' as const }];
    if (triggerManhunt) s.log = [...s.log, { year: s.year, age: s.age, text: `⚠️ SECT MANHUNT TRIGGERED!`, type: 'event' as const }];
    onAction(s);
  };

  const aliveNpcs = state.npcs.filter(n => n.alive);
  const giftableItems = state.inventory.filter(i => i.type === 'pill' || i.type === 'material' || i.type === 'misc');
  const moodInfo = MOOD_INFO[npcMood];

  // ─── COMBAT RESULT ──────────────────────────────────────────────
  if (combatResult && selectedNpc) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-md p-4" onClick={onClose}>
        <div className="w-full max-w-md bg-abyss border border-mist/30 rounded-2xl p-6 shadow-2xl animate-float-up" onClick={e => e.stopPropagation()}>
          <div className="text-center mb-5">
            <div className="text-5xl mb-3">{combatResult.won ? '🏆' : '💔'}</div>
            <h2 className={`font-display text-2xl ${combatResult.won ? 'text-jade' : 'text-crimson'}`}>{combatResult.won ? 'Victory!' : 'Defeat!'}</h2>
            <p className="font-body text-pearl/80 mt-2">{combatResult.message}</p>
            <p className="font-ui text-xs text-crimson mt-1">-{combatResult.hpLost} HP</p>
          </div>
          {combatResult.won ? (
            <div className="space-y-2">
              <p className="font-body text-sm text-silver/60 text-center italic mb-3">"{pick(DIALOGUE_KILL_BEG)}"</p>
              <button onClick={() => spareNpc(selectedNpc)} className="w-full py-3 bg-jade/15 border border-jade/30 rounded-xl text-jade font-display hover:bg-jade/25 transition-all">🕊️ Spare · <span className="font-ui text-[10px] text-silver/50">+Relationship, +Rep</span></button>
              <button onClick={() => killNpc(selectedNpc)} className="w-full py-3 bg-crimson/15 border border-crimson/30 rounded-xl text-crimson font-display hover:bg-crimson/25 transition-all">☠️ Kill · <span className="font-ui text-[10px] text-silver/50">Loot, Villainous karma</span></button>
            </div>
          ) : (
            <button onClick={() => { setCombatResult(null); setSelectedNpc(null); }} className="w-full py-3 bg-shadow/40 border border-mist/20 rounded-xl text-silver font-display hover:bg-shadow/60 transition-all">Retreat...</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-abyss border border-mist/30 rounded-2xl p-5 shadow-2xl animate-float-up max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-xl text-pearl">🤝 Social Interaction</h2>
          <button onClick={onClose} className="text-silver/60 hover:text-pearl font-ui text-lg">✕</button>
        </div>

        {!selectedNpc ? (
          // ─── NPC LIST ──────────────────────────────────────────
          <div className="flex-1 overflow-y-auto space-y-3">
            <button onClick={meetNewPerson} className="w-full p-4 bg-jade/10 border border-jade/30 rounded-xl hover:bg-jade/20 transition-all text-left">
              <div className="flex items-center gap-3"><span className="text-2xl">✨</span><div><span className="font-display text-jade">Meet Someone New</span><p className="font-ui text-xs text-silver/50">Encounter a new cultivator</p></div></div>
            </button>
            {aliveNpcs.length === 0 ? <p className="text-silver/40 text-center py-8 italic">No connections yet.</p> : (
              <>
                <h3 className="font-ui text-xs text-silver/50 uppercase tracking-wider mt-4">Known Cultivators ({aliveNpcs.length})</h3>
                {aliveNpcs.map(npc => {
                  const relInfo = getRelationshipLabel(npc.relationship);
                  const realmColor = REALM_COLORS[REALMS[npc.realmIdx]] || '#888';
                  const typeInfo = NPC_TYPE_LABELS[npc.npcType] || { label: 'Unknown', color: '#888' };
                  const dl = getTotalStage(npc.realmIdx, npc.stage) - getTotalStage(state.realmIdx, state.stage);
                  return (
                    <button key={npc.id} onClick={() => selectNpc(npc)} className="w-full p-3 bg-shadow/30 border border-mist/15 rounded-xl hover:bg-shadow/50 hover:border-mist/30 transition-all text-left">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display text-pearl">{npc.name}</span>
                            <span className="text-[9px] font-ui px-1.5 py-0.5 rounded" style={{ background: `${typeInfo.color}22`, color: typeInfo.color }}>{typeInfo.label}</span>
                            {npc.hostile && <span className="text-[9px] font-ui px-1.5 py-0.5 rounded bg-crimson/20 text-crimson">Hostile</span>}
                          </div>
                          <div className="font-ui text-[10px] mt-0.5 flex items-center gap-2">
                            <span style={{ color: realmColor }}>{REALMS[npc.realmIdx]} — {npc.stage}</span>
                            <span className="capitalize text-silver/50">{npc.personality}</span>
                            {dl >= 6 && <span className="text-crimson">⚠️ Deadly</span>}
                            {dl >= 3 && dl < 6 && <span className="text-crimson/70">⚔️ Dangerous</span>}
                          </div>
                        </div>
                        <div className="text-right"><div className="font-ui text-xs" style={{ color: relInfo.color }}>{npc.relationship}</div><div className="font-ui text-[9px]" style={{ color: relInfo.color }}>{relInfo.label}</div></div>
                      </div>
                      <div className="h-1 bg-shadow rounded-full overflow-hidden mt-2"><div className="h-full rounded-full transition-all" style={{ width: `${(npc.relationship + 100) / 2}%`, background: relInfo.color }} /></div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        ) : (
          // ─── NPC DETAIL VIEW ───────────────────────────────────
          <div className="flex-1 overflow-y-auto">
            <button onClick={() => { setSelectedNpc(null); setDialogue(''); setShowGiftPanel(false); setShowTalkPanel(false); }} className="mb-4 text-silver/60 hover:text-pearl font-ui text-xs">← Back to list</button>

            {/* Info Card */}
            <div className="bg-shadow/30 border border-mist/15 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-xl text-pearl">{selectedNpc.name}</h3>
                    {/* Mood badge */}
                    <span className="text-xs font-ui px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: `${moodInfo.color}18`, color: moodInfo.color, border: `1px solid ${moodInfo.color}33` }}>
                      {moodInfo.icon} {moodInfo.label}
                    </span>
                    {selectedNpc.hostile && <span className="text-[9px] font-ui px-1.5 py-0.5 rounded bg-crimson/20 text-crimson">Hostile</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-ui px-1.5 py-0.5 rounded" style={{ background: `${NPC_TYPE_LABELS[selectedNpc.npcType]?.color || '#888'}22`, color: NPC_TYPE_LABELS[selectedNpc.npcType]?.color || '#888' }}>{NPC_TYPE_LABELS[selectedNpc.npcType]?.label || 'Unknown'}</span>
                    <span className="font-ui text-xs" style={{ color: REALM_COLORS[REALMS[selectedNpc.realmIdx]] || '#888' }}>{REALMS[selectedNpc.realmIdx]} — {selectedNpc.stage}</span>
                    <span className="font-ui text-xs text-silver/40 capitalize">{selectedNpc.personality}</span>
                  </div>
                  <p className="font-body text-sm text-silver/70 mt-2 italic">{selectedNpc.bio}</p>
                </div>
                <div className="text-right shrink-0">
                  {(() => { const r = getRelationshipLabel(selectedNpc.relationship); return <><span className="font-display text-lg" style={{ color: r.color }}>{selectedNpc.relationship}</span><p className="font-ui text-[10px]" style={{ color: r.color }}>{r.label}</p></>; })()}
                </div>
              </div>
              {/* Relationship bar */}
              <div className="mt-3"><div className="flex justify-between text-[9px] font-ui text-silver/30 mb-1"><span>Enemy</span><span>Neutral</span><span>Ally</span></div><div className="h-1.5 bg-shadow rounded-full overflow-hidden relative"><div className="absolute left-1/2 top-0 bottom-0 w-px bg-silver/15" /><div className="h-full rounded-full transition-all" style={{ width: `${(selectedNpc.relationship + 100) / 2}%`, background: getRelationshipLabel(selectedNpc.relationship).color }} /></div></div>
              {/* Memory */}
              {(selectedNpc.memory.hasFought || selectedNpc.memory.giftsReceived.length > 0 || selectedNpc.memory.timesInsulted > 0) && (
                <div className="flex gap-2 mt-3 text-[10px] font-ui flex-wrap">
                  {selectedNpc.memory.hasFought && <span className={`px-2 py-0.5 rounded ${selectedNpc.memory.fightResult === 'won' ? 'bg-jade/10 text-jade/70' : 'bg-crimson/10 text-crimson/70'}`}>{selectedNpc.memory.fightResult === 'won' ? '🏆 You won' : '💔 You lost'}</span>}
                  {selectedNpc.memory.giftsReceived.length > 0 && <span className="px-2 py-0.5 bg-gold/10 text-gold/70 rounded">🎁 {selectedNpc.memory.giftsReceived.length} gift(s)</span>}
                  {selectedNpc.memory.timesInsulted > 0 && <span className="px-2 py-0.5 bg-crimson/10 text-crimson/70 rounded">😤 Insulted ×{selectedNpc.memory.timesInsulted}</span>}
                </div>
              )}
            </div>

            {/* Dialogue */}
            {dialogue && (
              <div className="bg-shadow/20 border-l-2 border-jade/40 p-3 mb-4 rounded-r-lg">
                {dialogue.split('\n\n').map((line, i) => (
                  <p key={i} className={`font-body text-sm ${i === 0 ? 'text-pearl/85 leading-relaxed' : 'text-silver/50 text-xs mt-2 font-ui'}`}>{line}</p>
                ))}
              </div>
            )}

            {/* Talk Panel */}
            {showTalkPanel ? (
              <div className="space-y-2 mb-4">
                <h4 className="font-ui text-xs text-silver/60 mb-1">Choose what to say:</h4>
                <button onClick={() => handleTalkChoice('greet')} className="w-full text-left p-3 bg-qi-blue/5 border border-qi-blue/15 rounded-xl hover:bg-qi-blue/10 hover:border-qi-blue/30 transition-all">
                  <div className="flex items-start gap-2"><span>💬</span><div><span className="font-display text-sm text-qi-blue">Greet Politely</span><p className="font-ui text-[10px] text-silver/40 mt-0.5">Safe opener. Friendly NPCs respond well; cold/arrogant may not.</p></div></div>
                </button>
                <button onClick={() => handleTalkChoice('train')} className="w-full text-left p-3 bg-jade/5 border border-jade/15 rounded-xl hover:bg-jade/10 hover:border-jade/30 transition-all">
                  <div className="flex items-start gap-2"><span>⚔️</span><div><span className="font-display text-sm text-jade">Propose Training Together</span><p className="font-ui text-[10px] text-silver/40 mt-0.5">Works best with warriors and friendly types. May trigger a spar with arrogant NPCs.</p></div></div>
                </button>
                <button onClick={() => handleTalkChoice('insult')} className="w-full text-left p-3 bg-crimson/5 border border-crimson/15 rounded-xl hover:bg-crimson/10 hover:border-crimson/30 transition-all">
                  <div className="flex items-start gap-2"><span>😏</span><div><span className="font-display text-sm text-crimson">Insult / Provoke</span><p className="font-ui text-[10px] text-silver/40 mt-0.5">Rude and risky. Irritable arrogant NPCs may attack. Some rivals secretly respect boldness.</p></div></div>
                </button>
                <button onClick={() => handleTalkChoice('ask_past')} className="w-full text-left p-3 bg-purple/5 border border-purple/15 rounded-xl hover:bg-purple/10 hover:border-purple/30 transition-all">
                  <div className="flex items-start gap-2"><span>🤔</span><div><span className="font-display text-sm text-purple">Ask About Their Past</span><p className="font-ui text-[10px] text-silver/40 mt-0.5">Deep conversation. High reward with friendly/mysterious types. Cold/arrogant may refuse.</p></div></div>
                </button>
                <button onClick={() => setShowTalkPanel(false)} className="text-silver/50 hover:text-pearl text-xs font-ui mt-1">Cancel</button>
              </div>
            ) : showGiftPanel ? (
              <div className="bg-shadow/30 border border-mist/15 rounded-xl p-4 mb-4">
                <h4 className="font-ui text-xs text-silver/60 mb-2">Choose a gift:</h4>
                {giftableItems.length === 0 ? <p className="text-silver/40 text-sm italic">No items to gift.</p> : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">{giftableItems.map(item => (
                    <button key={item.id} onClick={() => giftItem(selectedNpc, item)} className="w-full flex justify-between items-center p-2 bg-shadow/40 rounded-lg hover:bg-shadow/60 transition-all text-left"><span className="text-pearl text-sm">{item.name}</span><span className="text-[10px] font-ui text-gold/60">{item.quality}</span></button>
                  ))}</div>
                )}
                <button onClick={() => setShowGiftPanel(false)} className="mt-2 text-silver/50 hover:text-pearl text-xs font-ui">Cancel</button>
              </div>
            ) : (
              // ─── ACTION BUTTONS ────────────────────────────────
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowTalkPanel(true)} className="p-3 bg-qi-blue/10 border border-qi-blue/30 rounded-xl hover:bg-qi-blue/20 transition-all text-left">
                  <span className="text-lg">💬</span><span className="font-display text-sm text-qi-blue ml-2">Talk</span>
                  <p className="font-ui text-[10px] text-silver/40 mt-1">Choose your words carefully</p>
                </button>
                <button onClick={() => setShowGiftPanel(true)} className="p-3 bg-gold/10 border border-gold/30 rounded-xl hover:bg-gold/20 transition-all text-left">
                  <span className="text-lg">🎁</span><span className="font-display text-sm text-gold ml-2">Gift</span>
                  <p className="font-ui text-[10px] text-silver/40 mt-1">Give an item</p>
                </button>
                <button onClick={() => challengeNpc(selectedNpc)} className="p-3 bg-crimson/10 border border-crimson/30 rounded-xl hover:bg-crimson/20 transition-all text-left">
                  <span className="text-lg">⚔️</span><span className="font-display text-sm text-crimson ml-2">Challenge</span>
                  <p className="font-ui text-[10px] text-silver/40 mt-1">{(() => { const wc = calculateWinChance(state.realmIdx, state.stage, selectedNpc.realmIdx, selectedNpc.stage, state.stats.luck, state.stats.strength, state.stats.qi); return `${wc.toFixed(0)}% win chance`; })()}</p>
                </button>
                {/* Courting button - only shows when eligible */}
                {canCourtNpc(state, selectedNpc) && (
                  <button onClick={() => {
                    const result = attemptCourting(state, selectedNpc);
                    setDialogue(result.narrative);
                    onAction(result.newState);
                    if (result.success) {
                      // Re-select the NPC from updated state
                      const updatedNpc = result.newState.npcs.find(n => n.id === selectedNpc.id);
                      if (updatedNpc) setSelectedNpc(updatedNpc);
                    } else {
                      const updatedNpc = result.newState.npcs.find(n => n.id === selectedNpc.id);
                      if (updatedNpc) setSelectedNpc(updatedNpc);
                    }
                  }} className="p-3 bg-pink-500/10 border border-pink-500/30 rounded-xl hover:bg-pink-500/20 transition-all text-left">
                    <span className="text-lg">💕</span><span className="font-display text-sm text-pink-400 ml-2">Express Feelings</span>
                    <p className="font-ui text-[10px] text-silver/40 mt-1">{getCourtSuccessChance(state, selectedNpc)}% chance · Req: 60+ relationship</p>
                  </button>
                )}

                <button onClick={() => { setSelectedNpc(null); setDialogue(''); }} className="p-3 bg-shadow/30 border border-mist/20 rounded-xl hover:bg-shadow/50 transition-all text-left">
                  <span className="text-lg">👋</span><span className="font-display text-sm text-silver ml-2">Leave</span>
                  <p className="font-ui text-[10px] text-silver/40 mt-1">End conversation</p>
                </button>
              </div>
            )}

            {/* Teachings */}
            {selectedNpc.relationship >= 60 && selectedNpc.teachings.length > 0 && (
              <div className="mt-4 p-3 bg-purple/10 border border-purple/30 rounded-xl">
                <h4 className="font-ui text-xs text-purple mb-1">Can Teach:</h4>
                <p className="font-body text-sm text-pearl/80">{selectedNpc.teachings.join(', ')}</p>
                <p className="font-ui text-[10px] text-silver/40 mt-1">Reach 80+ relationship to learn</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
