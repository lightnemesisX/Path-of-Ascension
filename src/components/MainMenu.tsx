import React from 'react';

export const MainMenu: React.FC<{ hasSave: boolean; onNew: () => void; onContinue: () => void }> = ({ hasSave, onNew, onContinue }) => (
  <div className="min-h-screen flex items-center justify-center bg-void relative overflow-hidden">
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-qi-blue/5 blur-3xl" />
    </div>
    <div className="relative z-10 text-center animate-fade-in">
      <span className="text-silver font-ui text-sm tracking-[0.3em] uppercase">A Cultivation RPG</span>
      <h1 className="font-display text-6xl md:text-7xl font-bold mt-2 text-pearl">Path of</h1>
      <h1 className="font-display text-6xl md:text-7xl font-black mb-4 shimmer-text">Ascension</h1>
      <p className="font-body text-xl text-silver max-w-md mx-auto mb-8 italic">"From mortal dust to heavenly throne — the path begins with a single breath of Qi."</p>
      <div className="text-5xl mb-8 opacity-60">☯</div>
      <div className="space-y-3 flex flex-col items-center">
        {hasSave && <button onClick={onContinue} className="w-72 py-4 px-8 bg-jade/20 border border-jade/50 text-jade font-display text-lg rounded-lg hover:bg-jade/30 hover:shadow-[0_0_30px_rgba(45,212,160,0.2)] transition-all active:scale-95">⚡ Continue Journey</button>}
        <button onClick={onNew} className="w-72 py-4 px-8 bg-dusk border border-mist/50 text-pearl font-display text-lg rounded-lg hover:bg-mist/30 transition-all active:scale-95">🌑 New Game</button>
      </div>
      <div className="mt-12 text-silver/40 font-ui text-xs">All progress saved in your browser</div>
    </div>
  </div>
);
