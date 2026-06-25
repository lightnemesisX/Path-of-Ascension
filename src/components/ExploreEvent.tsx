import React, { useState } from 'react';
import { GameState } from '../game/types';
import { ExploreEvent as ExploreEventType, ExploreOutcome, ExploreChoice } from '../game/explore';
import { generateNPC } from '../game/constants';

interface Props {
  state: GameState;
  event: ExploreEventType;
  onResolve: (outcome: ExploreOutcome, state: GameState) => void;
  onTriggerBattle: (enemyKind: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  combat: { bg: 'bg-crimson/10', border: 'border-crimson/30', text: 'text-crimson', label: 'Combat Encounter' },
  fortunate: { bg: 'bg-jade/10', border: 'border-jade/30', text: 'text-jade', label: 'Fortunate Encounter' },
  neutral: { bg: 'bg-qi-blue/10', border: 'border-qi-blue/30', text: 'text-qi-blue', label: 'Neutral Encounter' },
  dangerous: { bg: 'bg-gold/10', border: 'border-gold/30', text: 'text-gold', label: 'Dangerous Encounter' },
};

const KARMA_COLORS: Record<string, string> = {
  righteous: 'text-qi-blue/60',
  villainous: 'text-crimson/60',
  neutral: 'text-silver/40',
};

export const ExploreEventComponent: React.FC<Props> = ({ state, event, onResolve, onTriggerBattle }) => {
  const [outcome, setOutcome] = useState<ExploreOutcome | null>(null);
  const [chosenLabel, setChosenLabel] = useState('');

  const catStyle = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.neutral;

  const handleChoice = (choice: ExploreChoice) => {
    const result = event.resolve(choice.id, state);

    // If it triggers a battle, delegate to parent
    if (result.triggerBattle && result.battleEnemyKind) {
      onTriggerBattle(result.battleEnemyKind);
      return;
    }

    setOutcome(result);
    setChosenLabel(choice.label);
  };

  const handleContinue = () => {
    if (!outcome) return;

    // Generate NPC if outcome says so
    let finalState = state;
    if (outcome.npcGenerated) {
      const npc = generateNPC(state.realmIdx);
      if (outcome.npcRole === 'ally') {
        npc.relationship = 30;
        npc.role = 'ally';
      }
      finalState = { ...finalState, npcs: [...finalState.npcs, npc] };
    }

    onResolve(outcome, finalState);
  };

  // ─── OUTCOME SCREEN ──────────────────────────────────────────
  if (outcome) {
    const hasStatChanges = Object.values(outcome.statChanges).some(v => v && v !== 0);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-md p-4">
        <div className="w-full max-w-lg bg-abyss border border-mist/30 rounded-2xl p-6 shadow-2xl animate-float-up max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="text-center mb-4">
            <span className="text-4xl">{event.icon}</span>
            <h2 className="font-display text-xl text-pearl mt-2">{event.title}</h2>
            <p className="font-ui text-xs text-silver/40 mt-1">You chose: {chosenLabel}</p>
          </div>

          {/* Outcome narrative */}
          <div className="bg-shadow/30 border border-mist/15 rounded-xl p-4 mb-4">
            <p className="font-body text-base text-pearl/85 leading-relaxed">{outcome.text}</p>
          </div>

          {/* Rewards / Penalties */}
          <div className="space-y-2 mb-5">
            {hasStatChanges && (
              <div className="bg-jade/5 border border-jade/15 rounded-lg p-3">
                <h4 className="font-ui text-xs text-jade/70 mb-1.5">Stat Changes</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(outcome.statChanges).filter(([, v]) => v && v !== 0).map(([k, v]) => (
                    <span key={k} className={`font-ui text-xs px-2 py-0.5 rounded ${(v ?? 0) > 0 ? 'bg-jade/10 text-jade' : 'bg-crimson/10 text-crimson'}`}>
                      {(v ?? 0) > 0 ? '+' : ''}{v} {k.charAt(0).toUpperCase() + k.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(outcome.hpChange !== 0 || outcome.herbsChange !== 0 || outcome.oresChange !== 0 || outcome.spChange !== 0) && (
              <div className="bg-shadow/30 border border-mist/10 rounded-lg p-3">
                <div className="flex flex-wrap gap-2 font-ui text-xs">
                  {outcome.hpChange !== 0 && (
                    <span className={`px-2 py-0.5 rounded ${outcome.hpChange > 0 ? 'bg-jade/10 text-jade' : 'bg-crimson/10 text-crimson'}`}>
                      {outcome.hpChange > 0 ? '+' : ''}{outcome.hpChange} HP
                    </span>
                  )}
                  {outcome.herbsChange !== 0 && (
                    <span className={`px-2 py-0.5 rounded ${outcome.herbsChange > 0 ? 'bg-jade/10 text-jade' : 'bg-crimson/10 text-crimson'}`}>
                      {outcome.herbsChange > 0 ? '+' : ''}{outcome.herbsChange} 🌿 Herbs
                    </span>
                  )}
                  {outcome.oresChange !== 0 && (
                    <span className={`px-2 py-0.5 rounded ${outcome.oresChange > 0 ? 'bg-jade/10 text-jade' : 'bg-crimson/10 text-crimson'}`}>
                      {outcome.oresChange > 0 ? '+' : ''}{outcome.oresChange} ⛏️ Ore
                    </span>
                  )}
                  {outcome.spChange !== 0 && (
                    <span className={`px-2 py-0.5 rounded ${outcome.spChange > 0 ? 'bg-jade/10 text-jade' : 'bg-crimson/10 text-crimson'}`}>
                      {outcome.spChange > 0 ? '+' : ''}{outcome.spChange} 🤖 SP
                    </span>
                  )}
                  {outcome.alignmentChange !== 0 && (
                    <span className={`px-2 py-0.5 rounded ${outcome.alignmentChange > 0 ? 'bg-qi-blue/10 text-qi-blue' : 'bg-crimson/10 text-crimson'}`}>
                      {outcome.alignmentChange > 0 ? '☯ Righteous' : '☯ Villainous'} ({outcome.alignmentChange > 0 ? '+' : ''}{outcome.alignmentChange})
                    </span>
                  )}
                </div>
              </div>
            )}

            {outcome.techniqueLearned && (
              <div className="bg-purple/10 border border-purple/25 rounded-lg p-3 text-center">
                <span className="font-display text-sm text-purple">📜 New Technique: {outcome.techniqueLearned}</span>
              </div>
            )}

            {outcome.npcGenerated && (
              <div className="bg-qi-blue/10 border border-qi-blue/20 rounded-lg p-3 text-center">
                <span className="font-ui text-xs text-qi-blue">🤝 New connection added!</span>
              </div>
            )}
          </div>

          <button
            onClick={handleContinue}
            className="w-full py-3 bg-shadow/40 border border-mist/20 rounded-xl text-pearl font-display hover:bg-shadow/60 transition-all active:scale-95"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ─── CHOICE SCREEN ───────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-abyss border border-mist/30 rounded-2xl p-6 shadow-2xl animate-float-up max-h-[85vh] overflow-y-auto">
        {/* Category badge */}
        <div className="text-center mb-2">
          <span className={`font-ui text-[10px] px-3 py-1 rounded-full ${catStyle.bg} ${catStyle.border} border ${catStyle.text} uppercase tracking-wider`}>
            {catStyle.label}
          </span>
        </div>

        {/* Title and icon */}
        <div className="text-center mb-4">
          <span className="text-5xl block mb-3">{event.icon}</span>
          <h2 className="font-display text-2xl text-pearl">{event.title}</h2>
        </div>

        {/* Narrative description */}
        <div className="bg-shadow/30 border border-mist/15 rounded-xl p-4 mb-5">
          <p className="font-body text-base text-pearl/85 leading-relaxed">{event.description}</p>
        </div>

        {/* Choices */}
        <div className="space-y-2.5">
          {event.choices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => handleChoice(choice)}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-200 active:scale-[0.98]
                ${choice.karmaHint === 'righteous' ? 'bg-qi-blue/5 border-qi-blue/20 hover:bg-qi-blue/10 hover:border-qi-blue/40' :
                  choice.karmaHint === 'villainous' ? 'bg-crimson/5 border-crimson/20 hover:bg-crimson/10 hover:border-crimson/40' :
                  'bg-shadow/40 border-mist/15 hover:bg-shadow/60 hover:border-mist/30'}
              `}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{choice.icon}</span>
                <div className="flex-1">
                  <span className="font-display text-sm text-pearl">{choice.label}</span>
                  <p className="font-ui text-[11px] text-silver/50 mt-0.5">{choice.description}</p>
                  {choice.karmaHint && choice.karmaHint !== 'neutral' && (
                    <span className={`font-ui text-[9px] mt-1 inline-block ${KARMA_COLORS[choice.karmaHint]}`}>
                      {choice.karmaHint === 'righteous' ? '☯ Righteous path' : '☯ Villainous path'}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
