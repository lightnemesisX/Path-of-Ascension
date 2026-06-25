import React, { useState } from 'react';
import { Background, Gender, SectId } from '../game/types';
import { BACKGROUNDS, SECTS } from '../game/constants';

export const CharacterCreation: React.FC<{ onCreate: (name: string, gender: Gender, bg: Background, sect: SectId) => void; onBack: () => void }> = ({ onCreate, onBack }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [bg, setBg] = useState<Background | null>(null);
  const [sect, setSect] = useState<SectId | null>(null);
  const [step, setStep] = useState(0);

  const steps = [
    // Step 0: Name
    <div key="name" className="text-center">
      <h2 className="font-display text-3xl text-pearl mb-2">What is your name?</h2>
      <p className="text-silver mb-8 font-body text-lg italic">Choose wisely — your name carries your destiny.</p>
      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name..." maxLength={24} autoFocus className="w-80 px-6 py-4 bg-abyss border border-mist/40 rounded-lg text-pearl text-center font-display text-xl focus:outline-none focus:border-jade/60 placeholder:text-silver/30 transition-all" />
      <div className="mt-6">
        <p className="text-silver/60 text-sm mb-3">Choose your gender:</p>
        <div className="flex gap-3 justify-center">
          {(['male', 'female', 'other'] as Gender[]).map(g => (
            <button key={g} onClick={() => setGender(g)} className={`px-6 py-2 rounded-lg border transition-all capitalize font-ui text-sm ${gender === g ? 'bg-jade/20 border-jade/50 text-jade' : 'bg-abyss border-mist/30 text-silver hover:border-mist/50'}`}>{g}</button>
          ))}
        </div>
      </div>
      <button onClick={() => setStep(1)} disabled={!name.trim()} className="mt-6 px-10 py-3 bg-jade/20 border border-jade/40 text-jade font-display rounded-lg hover:bg-jade/30 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all">Continue →</button>
    </div>,
    // Step 1: Background
    <div key="bg">
      <h2 className="font-display text-3xl text-pearl mb-2 text-center">Choose your origin</h2>
      <p className="text-silver mb-6 font-body text-lg italic text-center">Your past shapes your future.</p>
      <div className="grid gap-3">
        {(Object.entries(BACKGROUNDS) as [Background, typeof BACKGROUNDS[Background]][]).map(([k, v]) => (
          <button key={k} onClick={() => setBg(k)} className={`w-full text-left p-4 rounded-xl border transition-all ${bg === k ? 'bg-jade/10 border-jade/50' : 'bg-abyss/80 border-mist/20 hover:border-mist/40'}`}>
            <h3 className={`font-display text-lg ${bg === k ? 'text-jade' : 'text-pearl'}`}>{v.title}</h3>
            <p className="text-silver/60 text-sm italic mb-2">{v.lore}</p>
            <div className="flex flex-wrap gap-2 text-xs font-ui">
              <span className="px-2 py-0.5 rounded bg-qi-blue/15 text-qi-blue">Qi {v.qi}</span>
              <span className="px-2 py-0.5 rounded bg-crimson/15 text-crimson">STR {v.str}</span>
              <span className="px-2 py-0.5 rounded bg-purple/15 text-purple">INT {v.int}</span>
              <span className="px-2 py-0.5 rounded bg-gold/15 text-gold">LCK {v.luck}</span>
              <span className="px-2 py-0.5 rounded bg-jade/15 text-jade">REP {v.rep}</span>
              <span className="px-2 py-0.5 rounded bg-pearl/10 text-pearl/70">ALCH {v.alch}</span>
              <span className="px-2 py-0.5 rounded bg-pearl/10 text-pearl/70">HP {v.hp}</span>
            </div>
          </button>
        ))}
      </div>
      <button onClick={() => setStep(2)} disabled={!bg} className="mt-6 w-full px-10 py-3 bg-jade/20 border border-jade/40 text-jade font-display rounded-lg hover:bg-jade/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all">Continue →</button>
    </div>,
    // Step 2: Sect
    <div key="sect">
      <h2 className="font-display text-3xl text-pearl mb-2 text-center">Choose your sect</h2>
      <p className="text-silver mb-6 font-body text-lg italic text-center">Your sect shapes your cultivation path.</p>
      <div className="grid gap-3">
        {(Object.entries(SECTS) as [SectId, typeof SECTS[SectId]][]).map(([k, v]) => (
          <button key={k} onClick={() => setSect(k)} className={`w-full text-left p-4 rounded-xl border transition-all ${sect === k ? 'bg-jade/10 border-jade/50' : 'bg-abyss/80 border-mist/20 hover:border-mist/40'}`}>
            <div className="flex justify-between items-start">
              <h3 className={`font-display text-lg ${sect === k ? 'text-jade' : 'text-pearl'}`}>{v.name}</h3>
              <span className="text-xs font-ui px-2 py-0.5 rounded" style={{ background: `${v.color}22`, color: v.color }}>Tier {v.tier || '—'}</span>
            </div>
            <p className="text-silver/60 text-sm">{v.description}</p>
            <p className="text-xs font-ui mt-1" style={{ color: v.color }}>Unique: {v.uniqueTechnique} · {v.bonus}</p>
          </button>
        ))}
      </div>
      <button onClick={() => { if (bg && sect) onCreate(name.trim(), gender, bg, sect); }} disabled={!sect} className="mt-6 w-full px-12 py-4 bg-jade/20 border border-jade/40 text-jade font-display text-lg rounded-lg hover:bg-jade/30 hover:shadow-[0_0_30px_rgba(45,212,160,0.15)] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95">Begin Cultivation ⚡</button>
    </div>,
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-void relative overflow-hidden p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 rounded-full bg-purple/5 blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 rounded-full bg-jade/5 blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-2xl animate-fade-in">
        <button onClick={onBack} className="mb-6 text-silver/60 hover:text-pearl font-ui text-sm transition-colors">← Back</button>
        <div className="flex justify-center gap-2 mb-6">
          {[0, 1, 2].map(i => <div key={i} className={`w-8 h-1 rounded-full transition-all ${i === step ? 'bg-jade' : i < step ? 'bg-jade/50' : 'bg-mist/30'}`} />)}
        </div>
        {steps[step]}
      </div>
    </div>
  );
};
