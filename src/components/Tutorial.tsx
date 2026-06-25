import React, { useState } from 'react';

const TUTORIAL_STEPS = [
  { title: 'Welcome to Path of Ascension', icon: '☯', text: 'You are a cultivator on the path to immortality. Each "year" you get 3 actions to train, explore, fight, and more. Choose wisely — your choices shape your destiny.' },
  { title: 'Your Stats', icon: '📊', text: 'Qi drives cultivation progression. Strength powers combat. Intelligence aids learning. Luck affects events. Reputation influences NPCs. Wisdom (unlocked at Foundation) affects breakthroughs. Charm helps social interactions. Smithing and Alchemy enable crafting.' },
  { title: 'Cultivation Realms', icon: '⚡', text: 'Progress through 12 realms: Mortal → Qi Condensation → Foundation Building → Core Formation → Nascent Soul → Soul Transformation → Void Refinement → Body Integration → Mahayana → Tribulation Transcendence → True Immortal → ??? Each realm has Early, Mid, and Late stages. Breakthroughs can fail!' },
  { title: 'The System', icon: '🤖', text: 'You possess a "System" — a cultivation cheat that gives you daily missions and a shop. Complete missions for System Points, then spend them on rare pills, weapons, and stat boosts. The System speaks to you with cryptic messages.' },
  { title: 'Sects & NPCs', icon: '🏯', text: 'Your chosen sect provides unique bonuses. NPCs appear throughout your journey — they can become allies, rivals, masters, or lovers. Build relationships carefully. Some NPCs teach rare techniques.' },
  { title: 'Death & Reincarnation', icon: '💀', text: 'Death is real — from combat, tribulations, or old age. But you can reincarnate! Keep your techniques and 30% Wisdom. Each reincarnation grants a stacking "Past Life Echo" bonus (+10% stat gains, up to 5x). Your soul remembers...' },
];

export const Tutorial: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const s = TUTORIAL_STEPS[step];

  return (
    <div className="min-h-screen flex items-center justify-center bg-void relative overflow-hidden p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-jade/5 blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-lg animate-fade-in">
        <div className="bg-abyss/95 border border-mist/20 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">{s.icon}</div>
            <h2 className="font-display text-2xl text-gold font-semibold">{s.title}</h2>
          </div>
          <p className="font-body text-lg text-pearl/80 text-center leading-relaxed mb-8">{s.text}</p>
          <div className="flex justify-center gap-1 mb-6">
            {TUTORIAL_STEPS.map((_, i) => <div key={i} className={`w-6 h-1 rounded-full transition-all ${i === step ? 'bg-jade' : i < step ? 'bg-jade/40' : 'bg-mist/20'}`} />)}
          </div>
          <div className="flex gap-3">
            <button onClick={onComplete} className="flex-1 py-3 bg-transparent border border-mist/30 text-silver font-ui text-sm rounded-lg hover:border-pearl/30 hover:text-pearl transition-all">Skip Tutorial</button>
            {step < TUTORIAL_STEPS.length - 1
              ? <button onClick={() => setStep(step + 1)} className="flex-1 py-3 bg-jade/20 border border-jade/40 text-jade font-ui text-sm rounded-lg hover:bg-jade/30 transition-all">Next →</button>
              : <button onClick={onComplete} className="flex-1 py-3 bg-jade/20 border border-jade/40 text-jade font-ui text-sm rounded-lg hover:bg-jade/30 transition-all">Begin Journey ⚡</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
};
