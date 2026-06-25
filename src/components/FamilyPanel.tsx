import React from 'react';
import { GameState } from '../game/types';
import { REALMS, REALM_COLORS } from '../game/constants';

interface Props { state: GameState; onClose: () => void }

const STAGE_ICONS: Record<string, string> = { infant: '👶', child: '🧒', teen: '🧑', adult: '🧑‍🎓' };

export const FamilyPanel: React.FC<Props> = ({ state, onClose }) => {
  const { partner, children, griefYearsLeft, pastLifeChildren, reincarnationCount } = state;
  const aliveChildren = children.filter(c => c.alive);
  const deceasedChildren = children.filter(c => !c.alive);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-abyss border border-mist/30 rounded-2xl p-5 shadow-2xl animate-float-up max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-xl text-pearl">👨‍👩‍👧‍👦 Family</h2>
          <button onClick={onClose} className="text-silver/60 hover:text-pearl font-ui text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Grief indicator */}
          {griefYearsLeft > 0 && (
            <div className="bg-crimson/10 border border-crimson/20 rounded-lg p-3">
              <p className="font-ui text-xs text-crimson">💔 Grief: {griefYearsLeft} year{griefYearsLeft > 1 ? 's' : ''} remaining. -10 to most stats.</p>
            </div>
          )}

          {/* Partner Section */}
          <div>
            <h3 className="font-ui text-xs text-silver/60 uppercase tracking-wider mb-2">Partner</h3>
            {!partner ? (
              <div className="bg-shadow/20 rounded-xl p-4 text-center">
                <p className="text-silver/40 italic font-body text-sm">No partner yet.</p>
                <p className="font-ui text-[10px] text-silver/30 mt-1">Build 60+ relationship with an NPC, then express your feelings.</p>
              </div>
            ) : (
              <div className={`bg-shadow/30 border rounded-xl p-4 ${partner.alive ? 'border-pink-500/20' : 'border-crimson/20 opacity-60'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{partner.alive ? '💕' : '🕯️'}</span>
                      <span className="font-display text-lg text-pearl">{partner.name}</span>
                      {!partner.alive && <span className="text-[9px] font-ui px-1.5 py-0.5 rounded bg-crimson/20 text-crimson">Deceased</span>}
                    </div>
                    <div className="font-ui text-xs text-silver/50 mt-1 capitalize">{partner.personality} · {partner.gender}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-ui text-xs" style={{ color: REALM_COLORS[REALMS[partner.realmIdx]] || '#888' }}>
                      {REALMS[partner.realmIdx]} — {partner.stage}
                    </span>
                    <div className="font-ui text-[10px] text-silver/40 mt-0.5">
                      Together since Year {partner.yearMarried}
                    </div>
                  </div>
                </div>
                {partner.alive && (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-shadow/30 rounded-lg p-1.5">
                      <div className="font-ui text-[9px] text-silver/40">HP Regen</div>
                      <div className="font-ui text-xs text-jade">+5/yr</div>
                    </div>
                    <div className="bg-shadow/30 rounded-lg p-1.5">
                      <div className="font-ui text-[9px] text-silver/40">Qi Bonus</div>
                      <div className="font-ui text-xs text-qi-blue">+3/yr</div>
                    </div>
                    <div className="bg-shadow/30 rounded-lg p-1.5">
                      <div className="font-ui text-[9px] text-silver/40">Gifts</div>
                      <div className="font-ui text-xs text-gold">Random</div>
                    </div>
                  </div>
                )}
                {partner.causeOfDeath && (
                  <p className="font-ui text-[10px] text-crimson/60 mt-2 italic">Cause: {partner.causeOfDeath}</p>
                )}
              </div>
            )}
          </div>

          {/* Children Section */}
          <div>
            <h3 className="font-ui text-xs text-silver/60 uppercase tracking-wider mb-2">
              Children ({aliveChildren.length} alive{deceasedChildren.length > 0 ? `, ${deceasedChildren.length} deceased` : ''})
            </h3>
            {children.length === 0 ? (
              <div className="bg-shadow/20 rounded-xl p-4 text-center">
                <p className="text-silver/40 italic font-body text-sm">No children yet.</p>
                <p className="font-ui text-[10px] text-silver/30 mt-1">Children may arrive after 3+ years with a partner.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {children.map(child => {
                  const stageIcon = STAGE_ICONS[child.childStage] || '👤';
                  const realmColor = REALM_COLORS[REALMS[child.realmIdx]] || '#888';

                  return (
                    <div key={child.id} className={`bg-shadow/30 border rounded-lg p-3 ${child.alive ? 'border-mist/10' : 'border-crimson/15 opacity-50'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{child.alive ? stageIcon : '🕯️'}</span>
                          <div>
                            <span className="font-display text-sm text-pearl">{child.name}</span>
                            <span className="font-ui text-[10px] text-silver/40 ml-2">{child.gender === 'female' ? '♀' : '♂'}</span>
                            {child.becameNpc && child.alive && <span className="text-[9px] font-ui px-1 py-0.5 bg-jade/10 text-jade rounded ml-1">In World</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-ui text-xs text-pearl">Age {child.age}</div>
                          <div className="font-ui text-[10px] capitalize text-silver/40">{child.childStage}</div>
                        </div>
                      </div>
                      {child.childStage !== 'infant' && child.alive && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="font-ui text-[10px]" style={{ color: realmColor }}>{REALMS[child.realmIdx]} — {child.stage}</span>
                          <span className="font-ui text-[10px] text-silver/30 capitalize">{child.personality}</span>
                        </div>
                      )}
                      {!child.alive && child.causeOfDeath && (
                        <p className="font-ui text-[10px] text-crimson/60 mt-1 italic">{child.causeOfDeath}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Life Children */}
          {reincarnationCount > 0 && pastLifeChildren.length > 0 && (
            <div>
              <h3 className="font-ui text-xs text-purple/60 uppercase tracking-wider mb-2">Children from Past Lives</h3>
              <div className="bg-purple/5 border border-purple/15 rounded-lg p-3">
                <div className="flex flex-wrap gap-2">
                  {pastLifeChildren.map((name, i) => (
                    <span key={i} className="font-ui text-xs px-2 py-0.5 bg-purple/10 text-purple/70 rounded">{name}</span>
                  ))}
                </div>
                <p className="font-ui text-[10px] text-silver/30 mt-2">Requires 80+ Wisdom to recognize them in the world.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
