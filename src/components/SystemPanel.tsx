import React, { useState } from 'react';
import { GameState, Mission } from '../game/types';
import { SYSTEM_SHOP, ShopCategory, ShopItem, getActiveMissions, getQueuedMissions, getCompletedMissions, claimMission, purchaseFromShop } from '../game/system';

interface SystemPanelProps {
  state: GameState;
  onClose: () => void;
  onAction: (result: GameState) => void;
}

const DIFFICULTY_COLORS: Record<string, string> = { easy: '#2dd4a0', medium: '#f0c040', hard: '#e63946' };
const QUALITY_COLORS: Record<string, string> = { Common: '#888888', Uncommon: '#44aa44', Rare: '#4488ff', Legendary: '#f0c040', Divine: '#ff6688' };

const SHOP_CATEGORIES: { id: ShopCategory; label: string; icon: string }[] = [
  { id: 'weapons', label: 'Weapons', icon: '⚔️' },
  { id: 'armor', label: 'Armor', icon: '🛡️' },
  { id: 'artifacts', label: 'Artifacts', icon: '💎' },
  { id: 'pills', label: 'Pills', icon: '💊' },
  { id: 'techniques', label: 'Techniques', icon: '📜' },
  { id: 'materials', label: 'Materials', icon: '⛏️' },
  { id: 'special', label: 'Special', icon: '✨' },
];

export const SystemPanel: React.FC<SystemPanelProps> = ({ state, onClose, onAction }) => {
  const [mainTab, setMainTab] = useState<'missions' | 'shop' | 'messages'>('missions');
  const [shopCategory, setShopCategory] = useState<ShopCategory>('pills');

  const activeMissions = getActiveMissions(state.missions);
  const queuedMissions = getQueuedMissions(state.missions);
  const completedMissions = getCompletedMissions(state.missions);
  const shopItems = SYSTEM_SHOP.filter(i => i.category === shopCategory);

  const renderMission = (m: Mission, isQueued = false) => {
    const yearsLeft = m.deadlineYear - state.year;
    const isExpiring = yearsLeft <= 1 && !m.completed;
    const diffColor = DIFFICULTY_COLORS[m.difficulty] || '#888';
    return (
      <div key={m.id} className={`p-3 rounded-lg border transition-all ${m.completed && !m.claimed ? 'bg-jade/10 border-jade/30' : isQueued ? 'bg-shadow/10 border-mist/5 opacity-60' : isExpiring ? 'bg-crimson/5 border-crimson/20' : 'bg-shadow/30 border-mist/10'}`}>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-pearl text-sm">{m.description}</span>
              <span className="text-[9px] font-ui px-1.5 py-0.5 rounded capitalize" style={{ background: `${diffColor}22`, color: diffColor }}>{m.difficulty}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-ui text-xs text-silver/50">{m.progress}/{m.target}</span>
              {!m.completed && !isQueued && <span className={`font-ui text-xs ${isExpiring ? 'text-crimson' : 'text-silver/40'}`}>⏳ {yearsLeft}yr left</span>}
              {isQueued && <span className="font-ui text-xs text-silver/30 italic">Queued</span>}
            </div>
          </div>
          <span className="font-ui text-xs text-jade/70">+{m.reward} SP</span>
        </div>
        <div className="h-1 bg-shadow rounded-full overflow-hidden mt-2"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%`, backgroundColor: m.completed ? '#2dd4a0' : diffColor }} /></div>
        {m.completed && !m.claimed && <button onClick={() => onAction(claimMission(state, m.id))} className="mt-2 px-3 py-1 bg-jade/20 border border-jade/40 text-jade font-ui text-xs rounded hover:bg-jade/30 transition-all">Claim +{m.reward} SP</button>}
      </div>
    );
  };

  const renderShopItem = (item: ShopItem) => {
    const qColor = QUALITY_COLORS[item.quality] || '#888';
    const canAfford = state.systemPoints >= item.cost;
    const meetsReq = !item.reqStrength || state.stats.strength >= item.reqStrength;
    const canBuy = canAfford && meetsReq;

    return (
      <div key={item.id} className={`p-3 rounded-lg border transition-all ${canBuy ? 'bg-shadow/30 border-mist/10' : 'bg-shadow/10 border-mist/5 opacity-50'}`}>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-sm text-pearl">{item.name}</span>
              <span className="text-[9px] font-ui px-1.5 py-0.5 rounded font-semibold" style={{ background: `${qColor}18`, color: qColor, border: `1px solid ${qColor}33` }}>
                {item.quality}
              </span>
            </div>
            <p className="font-ui text-[11px] text-silver/50 mt-1 leading-snug">{item.description}</p>
            {item.reqStrength && (
              <p className={`font-ui text-[10px] mt-1 ${meetsReq ? 'text-jade/60' : 'text-crimson/80'}`}>
                {meetsReq ? '✓' : '✗'} Requires {item.reqStrength} Strength {!meetsReq ? `(you have ${state.stats.strength})` : ''}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="font-ui text-xs font-semibold text-jade">{item.cost} SP</div>
            <button
              onClick={() => { const ns = purchaseFromShop(state, item.id); if (ns !== state) onAction(ns); }}
              disabled={!canBuy}
              className="mt-1 px-3 py-1 bg-jade/15 border border-jade/30 text-jade font-ui text-xs rounded hover:bg-jade/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Buy
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-abyss border border-mist/30 rounded-2xl p-5 shadow-2xl animate-float-up max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-display text-xl text-jade">🤖 System Panel</h2>
          <button onClick={onClose} className="text-silver/60 hover:text-pearl font-ui text-lg">✕</button>
        </div>

        {/* Main tabs */}
        <div className="flex gap-2 mb-3">
          {(['missions', 'shop', 'messages'] as const).map(t => (
            <button key={t} onClick={() => setMainTab(t)} className={`flex-1 py-2 text-center rounded-lg font-ui text-xs capitalize transition-all ${mainTab === t ? 'bg-jade/20 text-jade border border-jade/30' : 'bg-shadow/30 text-silver/60 border border-transparent hover:border-mist/20'}`}>
              {t}
              {t === 'missions' && completedMissions.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-jade/30 text-jade text-[10px] rounded-full">{completedMissions.length}</span>}
            </button>
          ))}
        </div>

        <div className="font-ui text-xs text-silver/50 mb-3">System Points: <span className="text-jade font-semibold text-sm">{state.systemPoints}</span></div>

        {/* ── MISSIONS TAB ── */}
        {mainTab === 'missions' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {activeMissions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2"><h3 className="font-ui text-xs text-silver/60 uppercase tracking-wider">Active Missions</h3><span className="font-ui text-[10px] text-silver/40">{activeMissions.length}/4 slots</span></div>
                <div className="space-y-2">{activeMissions.map(m => renderMission(m))}</div>
              </div>
            )}
            {completedMissions.length > 0 && (
              <div>
                <h3 className="font-ui text-xs text-jade/70 uppercase tracking-wider mb-2">Ready to Claim!</h3>
                <div className="space-y-2">{completedMissions.map(m => renderMission(m))}</div>
              </div>
            )}
            {queuedMissions.length > 0 && (
              <div>
                <h3 className="font-ui text-xs text-silver/40 uppercase tracking-wider mb-2">Queued ({queuedMissions.length})</h3>
                <div className="space-y-2">{queuedMissions.slice(0, 3).map(m => renderMission(m, true))}</div>
              </div>
            )}
            {activeMissions.length === 0 && completedMissions.length === 0 && queuedMissions.length === 0 && (
              <p className="text-silver/40 text-center py-6 italic">No missions. New missions appear each year.</p>
            )}
            <div className="pt-2 border-t border-mist/10"><p className="font-ui text-[10px] text-silver/30 text-center">Deadlines: <span style={{ color: DIFFICULTY_COLORS.easy }}>Easy 2yr</span> · <span style={{ color: DIFFICULTY_COLORS.medium }}>Medium 4yr</span> · <span style={{ color: DIFFICULTY_COLORS.hard }}>Hard 8yr</span> · Expired: -5 SP</p></div>
          </div>
        )}

        {/* ── SHOP TAB ── */}
        {mainTab === 'shop' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Category pills */}
            <div className="flex gap-1 mb-3 overflow-x-auto pb-1 shrink-0">
              {SHOP_CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setShopCategory(cat.id)} className={`shrink-0 px-2.5 py-1.5 rounded-lg font-ui text-[10px] transition-all whitespace-nowrap ${shopCategory === cat.id ? 'bg-jade/20 text-jade border border-jade/30' : 'bg-shadow/30 text-silver/50 border border-transparent hover:border-mist/20'}`}>
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {shopItems.length === 0 && <p className="text-silver/40 text-center py-6 italic">No items in this category.</p>}
              {shopItems.map(item => renderShopItem(item))}
            </div>
          </div>
        )}

        {/* ── MESSAGES TAB ── */}
        {mainTab === 'messages' && (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {state.systemMessages.map((msg, i) => (
              <div key={i} className="p-3 bg-shadow/30 rounded-lg border border-gold/10">
                <p className="font-body text-sm text-pearl/80 italic">"{msg}"</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
