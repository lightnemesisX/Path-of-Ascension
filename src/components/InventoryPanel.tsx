import React from 'react';
import { GameState, Item } from '../game/types';


interface Props { state: GameState; onClose: () => void; onAction: (s: GameState) => void }

export const InventoryPanel: React.FC<Props> = ({ state, onClose, onAction }) => {
  const weapons = state.inventory.filter(i => i.type === 'weapon');
  const armors = state.inventory.filter(i => i.type === 'armor');
  const pills = state.inventory.filter(i => i.type === 'pill');
  const materials = state.inventory.filter(i => i.type === 'material');
  const others = state.inventory.filter(i => i.type === 'technique' || i.type === 'misc');
  const qualityColors: Record<string, string> = { Common: '#888', Uncommon: '#44aa44', Rare: '#4488ff', Legendary: '#f0c040', Divine: '#ff6688' };

  const equipWeapon = (id: string) => onAction({ ...state, equippedWeapon: id });
  const equipArmor = (id: string) => onAction({ ...state, equippedArmor: id });
  const usePill = (item: Item) => {
    const s = { ...state, inventory: state.inventory.filter(i => i.id !== item.id) };
    if (item.statBonus) {
      const st = { ...s.stats };
      for (const [k, v] of Object.entries(item.statBonus)) { if (v) st[k as keyof typeof st] += v; }
      s.stats = st;
    }
    s.log = [...s.log, { year: s.year, age: s.age, text: `Used ${item.name}.`, type: 'event' }];
    return s;
  };

  const ItemCard: React.FC<{ item: Item; onEquip?: () => void; onUse?: () => void; isEquipped?: boolean }> = ({ item, onEquip, onUse, isEquipped }) => (
    <div className={`flex justify-between items-center p-2 rounded border ${isEquipped ? 'bg-jade/10 border-jade/30' : 'bg-shadow/30 border-mist/10'}`}>
      <div>
        <span className="text-sm text-pearl">{item.name}</span>
        <span className="ml-2 text-[9px] font-ui px-1 py-0.5 rounded" style={{ background: `${qualityColors[item.quality] || '#666'}22`, color: qualityColors[item.quality] || '#666' }}>{item.quality}</span>
        {item.statBonus && Object.entries(item.statBonus).filter(([, v]) => v).map(([k, v]) => <span key={k} className="text-[9px] text-silver/50 ml-1">+{v} {k}</span>)}
      </div>
      <div className="flex gap-1">
        {onEquip && <button onClick={onEquip} className="text-[9px] font-ui px-2 py-0.5 bg-jade/15 text-jade rounded hover:bg-jade/25">{isEquipped ? 'Equipped' : 'Equip'}</button>}
        {onUse && <button onClick={onUse} className="text-[9px] font-ui px-2 py-0.5 bg-crimson/15 text-crimson rounded hover:bg-crimson/25">Use</button>}
      </div>
    </div>
  );

  const Section: React.FC<{ title: string; items: Item[] }> = ({ title, items }) => items.length === 0 ? null : (
    <div>
      <h4 className="font-ui text-xs text-silver/50 mb-1">{title} ({items.length})</h4>
      <div className="space-y-1">{items.map(i => <ItemCard key={i.id} item={i} onEquip={i.type === 'weapon' ? () => equipWeapon(i.id) : i.type === 'armor' ? () => equipArmor(i.id) : undefined} onUse={i.type === 'pill' ? () => onAction(usePill(i)) : undefined} isEquipped={state.equippedWeapon === i.id || state.equippedArmor === i.id} />)}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-abyss border border-mist/30 rounded-2xl p-5 shadow-2xl animate-float-up max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-xl text-pearl">🎒 Inventory</h2>
          <button onClick={onClose} className="text-silver/60 hover:text-pearl font-ui text-lg">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4">
          <Section title="Weapons" items={weapons} />
          <Section title="Armor" items={armors} />
          <Section title="Pills" items={pills} />
          <Section title="Materials" items={materials} />
          <Section title="Techniques & Misc" items={others} />
          {state.inventory.length === 0 && <p className="text-silver/40 text-center py-8 italic">Your inventory is empty.</p>}
        </div>
      </div>
    </div>
  );
};
