import React, { useState } from 'react';
import { GameState, Item } from '../game/types';
import { TECHNIQUE_DATA } from '../game/constants';
import { sfxEquip, sfxPop, sfxClick } from '../game/audio';

interface Props { state: GameState; onClose: () => void; onAction: (s: GameState) => void }

type InvTab = 'weapons' | 'armor' | 'techniques' | 'pills' | 'materials' | 'misc';

const TABS: { id: InvTab; label: string; icon: string }[] = [
  { id: 'weapons', label: 'Weapons', icon: '⚔️' },
  { id: 'armor', label: 'Armor', icon: '🛡️' },
  { id: 'techniques', label: 'Techniques', icon: '📜' },
  { id: 'pills', label: 'Pills', icon: '💊' },
  { id: 'materials', label: 'Materials', icon: '⛏️' },
  { id: 'misc', label: 'Misc', icon: '📦' },
];

const QUALITY_COLORS: Record<string, string> = { Common: '#888', Uncommon: '#44aa44', Rare: '#4488ff', Legendary: '#f0c040', Divine: '#ff6688' };

export const InventoryPanel: React.FC<Props> = ({ state, onClose, onAction }) => {
  const [tab, setTab] = useState<InvTab>('weapons');
  const [showTechSelect, setShowTechSelect] = useState(false);

  // Categorize items
  const itemsByTab: Record<InvTab, Item[]> = {
    weapons: state.inventory.filter(i => i.type === 'weapon'),
    armor: state.inventory.filter(i => i.type === 'armor'),
    techniques: state.inventory.filter(i => i.type === 'technique'),
    pills: state.inventory.filter(i => i.type === 'pill'),
    materials: state.inventory.filter(i => i.type === 'material'),
    misc: state.inventory.filter(i => i.type === 'misc'),
  };

  const equipWeapon = (id: string) => {
    sfxEquip();
    onAction({ ...state, equippedWeapon: id });
  };

  const equipArmor = (id: string) => {
    sfxEquip();
    onAction({ ...state, equippedArmor: id });
  };

  const usePill = (item: Item) => {
    sfxPop();
    let s = { ...state, inventory: state.inventory.filter(i => i.id !== item.id) };
    if (item.statBonus) {
      const st = { ...s.stats };
      for (const [k, v] of Object.entries(item.statBonus)) { if (v) st[k as keyof typeof st] += v; }
      s = { ...s, stats: st };
    }
    s = { ...s, hp: Math.min(s.maxHp, s.hp + (item.name.toLowerCase().includes('heal') ? 50 : 0)) };
    s.log = [...s.log, { year: s.year, age: s.age, text: `💊 Used ${item.name}.`, type: 'event' as const }];
    onAction(s);
  };

  const switchTechnique = (name: string) => {
    sfxClick();
    setShowTechSelect(false);
    onAction({ ...state, activeTechnique: name });
  };

  // Get counts for tab badges
  const getCount = (t: InvTab) => {
    if (t === 'techniques') return state.techniques.length;
    return itemsByTab[t].length;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-abyss border border-mist/30 rounded-2xl p-5 shadow-2xl animate-float-up max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-display text-xl text-pearl">🎒 Inventory</h2>
          <button onClick={onClose} className="text-silver/60 hover:text-pearl font-ui text-lg">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1 shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { sfxClick(); setTab(t.id); setShowTechSelect(false); }}
              className={`shrink-0 px-2.5 py-1.5 rounded-lg font-ui text-[10px] transition-all whitespace-nowrap ${
                tab === t.id ? 'bg-jade/20 text-jade border border-jade/30' : 'bg-shadow/30 text-silver/50 border border-transparent hover:border-mist/20'
              }`}>
              {t.icon} {t.label}
              {getCount(t.id) > 0 && <span className="ml-1 px-1 py-0 bg-mist/20 rounded text-[9px]">{getCount(t.id)}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">

          {/* ── WEAPONS TAB ── */}
          {tab === 'weapons' && (
            itemsByTab.weapons.length === 0
              ? <EmptyTab text="No weapons. Find them through exploration, combat, or the System Shop." />
              : itemsByTab.weapons.map(item => {
                  const isEq = state.equippedWeapon === item.id;
                  return (
                    <ItemRow key={item.id} item={item} isEquipped={isEq}
                      action={<button onClick={() => equipWeapon(item.id)} className={`text-[9px] font-ui px-3 py-1 rounded transition-all ${isEq ? 'bg-jade/20 text-jade border border-jade/30' : 'bg-shadow/50 text-silver/60 hover:bg-jade/10 hover:text-jade'}`}>{isEq ? '✓ Equipped' : 'Equip'}</button>}
                    />
                  );
                })
          )}

          {/* ── ARMOR TAB ── */}
          {tab === 'armor' && (
            itemsByTab.armor.length === 0
              ? <EmptyTab text="No armor. Find it through exploration, combat, or the System Shop." />
              : itemsByTab.armor.map(item => {
                  const isEq = state.equippedArmor === item.id;
                  return (
                    <ItemRow key={item.id} item={item} isEquipped={isEq}
                      action={<button onClick={() => equipArmor(item.id)} className={`text-[9px] font-ui px-3 py-1 rounded transition-all ${isEq ? 'bg-jade/20 text-jade border border-jade/30' : 'bg-shadow/50 text-silver/60 hover:bg-jade/10 hover:text-jade'}`}>{isEq ? '✓ Equipped' : 'Equip'}</button>}
                    />
                  );
                })
          )}

          {/* ── TECHNIQUES TAB ── */}
          {tab === 'techniques' && (
            <>
              {/* Active technique display */}
              <div className="bg-shadow/40 border border-qi-blue/20 rounded-xl p-3 mb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-ui text-[10px] text-silver/50 uppercase tracking-wider">Active Technique</div>
                    <div className="font-display text-sm text-qi-blue mt-0.5">{state.activeTechnique || 'None'}</div>
                    {state.activeTechnique && TECHNIQUE_DATA[state.activeTechnique] && (
                      <div className="font-ui text-[10px] text-silver/40 mt-0.5">
                        Qi: {TECHNIQUE_DATA[state.activeTechnique].qiCost} · {TECHNIQUE_DATA[state.activeTechnique].damage}
                      </div>
                    )}
                  </div>
                  <button onClick={() => { sfxClick(); setShowTechSelect(!showTechSelect); }}
                    className="text-[9px] font-ui px-3 py-1.5 bg-qi-blue/15 text-qi-blue rounded hover:bg-qi-blue/25 transition-all">
                    {showTechSelect ? 'Cancel' : 'Switch'}
                  </button>
                </div>
              </div>

              {/* Technique selector */}
              {showTechSelect && state.techniques.length > 0 && (
                <div className="bg-shadow/30 border border-mist/15 rounded-lg p-2 mb-2 space-y-1">
                  <div className="font-ui text-[10px] text-silver/50 mb-1">Choose active technique:</div>
                  {state.techniques.map(tech => {
                    const data = TECHNIQUE_DATA[tech];
                    const isActive = state.activeTechnique === tech;
                    return (
                      <button key={tech} onClick={() => switchTechnique(tech)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${isActive ? 'bg-qi-blue/10 border-qi-blue/30' : 'bg-shadow/20 border-mist/10 hover:border-qi-blue/20 hover:bg-shadow/40'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`font-display text-sm ${isActive ? 'text-qi-blue' : 'text-pearl'}`}>{tech}</span>
                            {isActive && <span className="ml-2 text-[8px] font-ui text-qi-blue">ACTIVE</span>}
                          </div>
                          {data && <span className="font-ui text-[10px] text-silver/40">{data.qiCost} Qi</span>}
                        </div>
                        {data && <p className="font-ui text-[10px] text-silver/40 mt-0.5">{data.damage} — {data.description}</p>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Full technique list */}
              {state.techniques.length === 0
                ? <EmptyTab text="No techniques learned. Join a sect, study scrolls, or find a master." />
                : !showTechSelect && state.techniques.map(tech => {
                    const data = TECHNIQUE_DATA[tech];
                    const isActive = state.activeTechnique === tech;
                    return (
                      <div key={tech} className={`p-3 rounded-lg border transition-all ${isActive ? 'bg-qi-blue/10 border-qi-blue/25' : 'bg-shadow/30 border-mist/10'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`font-display text-sm ${isActive ? 'text-qi-blue' : 'text-pearl'}`}>{tech}</span>
                            {isActive && <span className="ml-2 text-[8px] font-ui px-1.5 py-0.5 bg-qi-blue/20 text-qi-blue rounded">ACTIVE</span>}
                          </div>
                          {data && (
                            <div className="text-right">
                              <span className="font-ui text-[10px] text-qi-blue">{data.qiCost} Qi</span>
                              <div className="font-ui text-[10px] text-silver/40">{data.damage}</div>
                            </div>
                          )}
                        </div>
                        {data && <p className="font-ui text-[10px] text-silver/50 mt-1">{data.description}</p>}
                      </div>
                    );
                  })
              }
            </>
          )}

          {/* ── PILLS TAB ── */}
          {tab === 'pills' && (
            itemsByTab.pills.length === 0
              ? <EmptyTab text="No pills. Craft them via alchemy or buy from the System Shop." />
              : itemsByTab.pills.map(item => (
                  <ItemRow key={item.id} item={item}
                    action={<button onClick={() => usePill(item)} className="text-[9px] font-ui px-3 py-1 bg-jade/15 text-jade rounded hover:bg-jade/25 transition-all">Use</button>}
                  />
                ))
          )}

          {/* ── MATERIALS TAB ── */}
          {tab === 'materials' && (
            <>
              <div className="bg-shadow/30 rounded-lg p-2.5 flex justify-between items-center mb-2">
                <div className="flex gap-4 font-ui text-xs">
                  <span className="text-silver/50">🌿 Herbs: <span className="text-pearl">{state.herbs}</span></span>
                  <span className="text-silver/50">⛏️ Ore: <span className="text-pearl">{state.ores}</span></span>
                </div>
              </div>
              {itemsByTab.materials.length === 0
                ? <EmptyTab text="No rare materials. Explore or buy from the System Shop." />
                : itemsByTab.materials.map(item => <ItemRow key={item.id} item={item} />)
              }
            </>
          )}

          {/* ── MISC TAB ── */}
          {tab === 'misc' && (
            itemsByTab.misc.length === 0
              ? <EmptyTab text="No misc items." />
              : itemsByTab.misc.map(item => <ItemRow key={item.id} item={item} />)
          )}
        </div>
      </div>
    </div>
  );
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────

const EmptyTab: React.FC<{ text: string }> = ({ text }) => (
  <div className="text-center py-8">
    <p className="text-silver/40 italic font-body text-sm">{text}</p>
  </div>
);

const ItemRow: React.FC<{ item: Item; isEquipped?: boolean; action?: React.ReactNode }> = ({ item, isEquipped, action }) => {
  const qColor = QUALITY_COLORS[item.quality] || '#888';
  return (
    <div className={`p-3 rounded-lg border transition-all ${isEquipped ? 'bg-jade/8 border-jade/25 shadow-[0_0_8px_rgba(45,212,160,0.08)]' : 'bg-shadow/30 border-mist/10'}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-sm text-pearl">{item.name}</span>
            <span className="text-[9px] font-ui px-1.5 py-0.5 rounded font-semibold" style={{ background: `${qColor}18`, color: qColor, border: `1px solid ${qColor}33` }}>
              {item.quality}
            </span>
            {item.quantity && item.quantity > 1 && <span className="text-[9px] font-ui text-silver/40">×{item.quantity}</span>}
          </div>
          <p className="font-ui text-[10px] text-silver/50 mt-0.5 leading-snug">{item.description}</p>
          {item.statBonus && Object.entries(item.statBonus).filter(([, v]) => v).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {Object.entries(item.statBonus).filter(([, v]) => v).map(([k, v]) => (
                <span key={k} className="text-[9px] font-ui px-1.5 py-0.5 bg-jade/10 text-jade/80 rounded">+{v} {k}</span>
              ))}
            </div>
          )}
        </div>
        {action && <div className="shrink-0 ml-2">{action}</div>}
      </div>
    </div>
  );
};
