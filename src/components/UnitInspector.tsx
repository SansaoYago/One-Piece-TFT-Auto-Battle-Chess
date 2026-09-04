import React from 'react';
import { UnitInstance, UnitBaseData, GamePhase } from '../types/game';
import { CHAMPION_DATABASE } from '../data/units';
import { SYNERGY_DATABASE } from '../data/synergies';
import { ITEM_DATABASE } from '../data/items';
import { calculateUnitSellValue } from '../utils/gameUtils';
import { ChampionVisual } from './ChampionVisual';
import {
  X,
  Star,
  Shield,
  Zap,
  Swords,
  Heart,
  Sparkles,
  CheckCircle2,
  Circle,
  Package,
  Trash2,
  Info,
  Lock,
  Unlock,
  AlertCircle,
} from 'lucide-react';

interface UnitInspectorProps {
  unit: UnitInstance;
  gamePhase?: GamePhase;
  changedSkillUnitIdThisRound?: string | null;
  isViewingOpponentArena?: boolean;
  onClose: () => void;
  onSelectSkill: (unit: UnitInstance, skill: 'SKILL_A' | 'SKILL_B') => void;
  onUnequipItem?: (itemId: string, unit: UnitInstance, slotIndex: number) => void;
  onSellUnit?: (unit: UnitInstance) => void;
}

export const UnitInspector: React.FC<UnitInspectorProps> = ({
  unit,
  gamePhase = 'PREPARATION',
  changedSkillUnitIdThisRound = null,
  isViewingOpponentArena = false,
  onClose,
  onSelectSkill,
  onUnequipItem,
  onSellUnit,
}) => {
  const baseData: UnitBaseData = CHAMPION_DATABASE[unit.unitId] || CHAMPION_DATABASE.luffy;
  const isPrepPhase = gamePhase === 'PREPARATION' && !isViewingOpponentArena;
  const sellValue = calculateUnitSellValue(unit);

  // Skill switching restrictions (1 change per round during preparation, 1* units have Skill B locked)
  const isEligibleForSkillB = unit.stars >= 2;
  const hasSwitchedAnyUnitThisRound =
    changedSkillUnitIdThisRound !== null && changedSkillUnitIdThisRound !== undefined;
  const hasSwitchedThisSpecificUnit = changedSkillUnitIdThisRound === unit.instanceId;

  // Find equipped items segregated into Battle (2 slots) and Special (1 slot)
  const battleItems = unit.items.filter((id) => !ITEM_DATABASE[id]?.isSpecialActivation);
  const specialItem = unit.items.find((id) => ITEM_DATABASE[id]?.isSpecialActivation);

  const handleSkillClick = (targetSkill: 'SKILL_A' | 'SKILL_B') => {
    if (!isPrepPhase) {
      alert('A troca de habilidades só é permitida durante a Fase de Preparação!');
      return;
    }

    if (targetSkill === 'SKILL_B' && !isEligibleForSkillB) {
      alert(
        `A Habilidade Secundária (${baseData.skillB.name}) está bloqueada! Ela requer que o campeão esteja em 2★ ou 3★.`
      );
      return;
    }

    if (unit.activeSkill === targetSkill) {
      return; // Already active
    }

    if (hasSwitchedAnyUnitThisRound) {
      if (hasSwitchedThisSpecificUnit) {
        alert(
          'Você já alterou a habilidade deste campeão nesta rodada! (Limite de 1 alteração por turno atingido).'
        );
      } else {
        alert(
          'Você já utilizou sua troca de habilidade desta rodada em outro campeão! (Limite de 1 campeão por turno).'
        );
      }
      return;
    }

    onSelectSkill(unit, targetSkill);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-5 shadow-2xl ring-1 ring-amber-400/20 max-h-[90vh] overflow-y-auto">
        
        {/* Top Header Actions */}
        <div className="absolute top-3.5 right-3.5 flex items-center gap-2">
          {/* Sell Unit Button if in Preparation Phase */}
          {isPrepPhase && onSellUnit && !unit.isEnemy && (
            <button
              onClick={() => onSellUnit(unit)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/90 hover:bg-rose-800 text-rose-300 hover:text-white border border-rose-600 transition-all shadow-md text-xs font-bold cursor-pointer hover:scale-105"
              title="Vender este campeão"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Vender por</span>
              <span className="font-mono font-black text-amber-300">+{sellValue}฿</span>
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Header: Avatar, Name, Title, Stars */}
        <div className="flex items-center gap-4 pb-4 border-b border-slate-800">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl border-2 overflow-hidden p-1"
            style={{ borderColor: unit.color, backgroundColor: `${unit.color}20` }}
          >
            <ChampionVisual
              unitId={unit.unitId}
              avatarFallback={unit.avatarUrl}
              visualAssets={unit.visualAssets || baseData.visualAssets}
              mode="portrait"
              alt={unit.name}
              className="w-full h-full"
              imageClassName="drop-shadow-md"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-100">{unit.name}</h3>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: unit.stars }).map((_, idx) => (
                  <Star key={idx} className="w-4 h-4 text-amber-400 fill-amber-400 drop-shadow" />
                ))}
              </div>
            </div>
            <p className="text-xs text-amber-400/90 font-medium">{unit.title}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {unit.traits.map((t) => (
                <span
                  key={t}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 capitalize flex items-center gap-1"
                >
                  {SYNERGY_DATABASE[t]?.icon} {SYNERGY_DATABASE[t]?.name || t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 my-4">
          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Heart className="w-3 h-3 text-rose-400" /> HP
            </span>
            <span className="text-xs font-bold text-slate-200 font-mono">
              {unit.hp}/{unit.maxHp}
            </span>
          </div>

          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Swords className="w-3 h-3 text-amber-400" /> Dano (AD)
            </span>
            <span className="text-xs font-bold text-amber-300 font-mono">{unit.ad}</span>
          </div>

          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3 text-blue-400" /> Armadura / MR
            </span>
            <span className="text-xs font-bold text-blue-300 font-mono">
              {unit.armor} / {unit.mr}
            </span>
          </div>

          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" /> Alcance
            </span>
            <span className="text-xs font-bold text-cyan-300 font-mono">
              {unit.range} {unit.range === 1 ? '(Melee)' : '(Ranged)'}
            </span>
          </div>
        </div>

        {/* Equipped Items (2 Battle Items + 1 Special Item) */}
        <div className="mb-4 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
              <Package className="w-4 h-4 text-amber-400" />
              Slots de Itens (2 Batalha + 1 Especial)
            </span>
            {isPrepPhase && (
              <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                Fase de Preparação: Remoção Permitida
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Slot 1: Batalha 1 */}
            {(() => {
              const itemId = battleItems[0];
              const item = itemId ? ITEM_DATABASE[itemId] : null;

              return (
                <div
                  className={`p-2.5 rounded-xl border flex flex-col justify-between relative transition-all min-h-[92px] ${
                    item
                      ? 'bg-amber-950/40 border-amber-500/80 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-slate-900/60 border-slate-800/80 border-dashed items-center justify-center text-center'
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[8px] font-black uppercase text-amber-400/90 font-mono">
                      Batalha #1
                    </span>
                    {item && isPrepPhase && onUnequipItem && (
                      <button
                        onClick={() => onUnequipItem(itemId, unit, 0)}
                        className="p-1 rounded bg-rose-950/90 hover:bg-rose-900 text-rose-400 hover:text-rose-200 border border-rose-800 shadow transition-colors cursor-pointer"
                        title="Desequipar item e devolver ao baú"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {item ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl drop-shadow">{item.icon}</span>
                      <div className="min-w-0">
                        <span className="text-[11px] font-black text-slate-100 block truncate">
                          {item.name}
                        </span>
                        <span className="text-[8px] text-slate-400 line-clamp-1">
                          {item.description}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-1">
                      <span className="text-[10px] text-slate-500 font-bold block">Vazio</span>
                      <span className="text-[8px] text-slate-600">Item de Batalha</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Slot 2: Batalha 2 */}
            {(() => {
              const itemId = battleItems[1];
              const item = itemId ? ITEM_DATABASE[itemId] : null;

              return (
                <div
                  className={`p-2.5 rounded-xl border flex flex-col justify-between relative transition-all min-h-[92px] ${
                    item
                      ? 'bg-amber-950/40 border-amber-500/80 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-slate-900/60 border-slate-800/80 border-dashed items-center justify-center text-center'
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[8px] font-black uppercase text-amber-400/90 font-mono">
                      Batalha #2
                    </span>
                    {item && isPrepPhase && onUnequipItem && (
                      <button
                        onClick={() => onUnequipItem(itemId, unit, 1)}
                        className="p-1 rounded bg-rose-950/90 hover:bg-rose-900 text-rose-400 hover:text-rose-200 border border-rose-800 shadow transition-colors cursor-pointer"
                        title="Desequipar item e devolver ao baú"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {item ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl drop-shadow">{item.icon}</span>
                      <div className="min-w-0">
                        <span className="text-[11px] font-black text-slate-100 block truncate">
                          {item.name}
                        </span>
                        <span className="text-[8px] text-slate-400 line-clamp-1">
                          {item.description}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-1">
                      <span className="text-[10px] text-slate-500 font-bold block">Vazio</span>
                      <span className="text-[8px] text-slate-600">Item de Batalha</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Slot 3: Slot Especial Exclusivo (Orbe do Despertar) */}
            {(() => {
              const itemId = specialItem;
              const item = itemId ? ITEM_DATABASE[itemId] : null;
              const isEligibleForSpecial = unit.stars >= 2;

              return (
                <div
                  className={`p-2.5 rounded-xl border flex flex-col justify-between relative transition-all min-h-[92px] ${
                    item
                      ? 'bg-gradient-to-b from-rose-950/60 to-purple-950/60 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] ring-1 ring-rose-400/40'
                      : !isEligibleForSpecial
                      ? 'bg-slate-950/60 border-slate-800/80 border-dashed items-center justify-center text-center opacity-75'
                      : 'bg-slate-900/60 border-rose-900/50 border-dashed items-center justify-center text-center'
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[8px] font-black uppercase text-rose-300 font-mono flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-rose-400" /> Especial
                    </span>
                    {item && isPrepPhase && onUnequipItem && (
                      <button
                        onClick={() => onUnequipItem(itemId, unit, 2)}
                        className="p-1 rounded bg-rose-950/90 hover:bg-rose-900 text-rose-400 hover:text-rose-200 border border-rose-800 shadow transition-colors cursor-pointer"
                        title="Desequipar item especial e devolver ao baú"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {item ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl drop-shadow animate-pulse">{item.icon}</span>
                      <div className="min-w-0">
                        <span className="text-[11px] font-black text-rose-200 block truncate">
                          {item.name}
                        </span>
                        <span className="text-[8px] text-rose-300/80 line-clamp-1">
                          Skill C Ativada!
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-1">
                      <span className="text-[10px] text-rose-400/70 font-bold block">
                        {!isEligibleForSpecial ? 'Bloqueado (1★)' : 'Vazio'}
                      </span>
                      <span className="text-[8px] text-slate-500">
                        {!isEligibleForSpecial ? 'Requer 2★ ou 3★' : 'Orbe do Despertar'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="flex items-center gap-1 text-slate-300">
              <Info className="w-3 h-3 text-amber-400" />
              Arraste do baú ou clique no item para equipar.
            </span>
            <span className="font-mono text-amber-400 font-bold">
              {battleItems.length}/2 Batalha • {specialItem ? '1/1' : '0/1'} Especial
            </span>
          </div>
        </div>

        {/* Skill Selection Section (PRD Section 4.4 + Turn Limit Rules) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wide">
              Habilidade Ativa de Combate (Selecione 1)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">100 Mana / Cast</span>
          </div>

          {/* Turn Limit & Phase Status Banner */}
          <div className="px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between text-[11px]">
            {!isPrepPhase ? (
              <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Fase de Combate: Troca de habilidades desativada.
              </span>
            ) : !isEligibleForSkillB ? (
              <span className="text-amber-400/90 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Unidades 1★ utilizam a Habilidade Primária (Evolua para 2★ para liberar a 2ª habilidade).
              </span>
            ) : hasSwitchedThisSpecificUnit ? (
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Habilidade deste campeão alterada nesta rodada (Fixada até a próxima rodada).
              </span>
            ) : hasSwitchedAnyUnitThisRound ? (
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> Limite de 1 troca por rodada já utilizado em outro campeão.
              </span>
            ) : (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Unlock className="w-3.5 h-3.5 text-emerald-400" /> 1 Troca Disponível: Você pode alternar a habilidade deste campeão 1 vez nesta rodada.
              </span>
            )}
          </div>

          {/* Skill A (Habilidade Primária - 1★) */}
          {(() => {
            const isSelected = unit.activeSkill === 'SKILL_A';
            const canSelect = isPrepPhase && (!hasSwitchedAnyUnitThisRound || isSelected);

            return (
              <div
                onClick={() => handleSkillClick('SKILL_A')}
                className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-400 ring-1 ring-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : canSelect
                    ? 'bg-slate-950/40 border-slate-800 hover:border-amber-500/60 hover:bg-slate-900/60 cursor-pointer'
                    : 'bg-slate-950/30 border-slate-850 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-600" />
                    )}
                    <span className="text-xs font-bold text-slate-100">
                      {baseData.skillA.name} (Habilidade Primária - 1★)
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                    {baseData.skillA.damageType}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 pl-6 leading-relaxed">
                  {baseData.skillA.description}
                </p>
              </div>
            );
          })()}

          {/* Skill B (Habilidade Secundária - 2★/3★) */}
          {(() => {
            const isSelected = unit.activeSkill === 'SKILL_B';
            const canSelect =
              isPrepPhase && isEligibleForSkillB && (!hasSwitchedAnyUnitThisRound || isSelected);

            return (
              <div
                onClick={() => handleSkillClick('SKILL_B')}
                className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-400 ring-1 ring-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : !isEligibleForSkillB
                    ? 'bg-slate-950/20 border-slate-850 opacity-60 cursor-not-allowed'
                    : canSelect
                    ? 'bg-slate-950/40 border-slate-800 hover:border-amber-500/60 hover:bg-slate-900/60 cursor-pointer'
                    : 'bg-slate-950/30 border-slate-850 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {!isEligibleForSkillB ? (
                      <Lock className="w-4 h-4 text-slate-500" />
                    ) : isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-600" />
                    )}
                    <span
                      className={`text-xs font-bold ${
                        !isEligibleForSkillB ? 'text-slate-400' : 'text-slate-100'
                      }`}
                    >
                      {baseData.skillB.name} (Habilidade Secundária - 2★/3★)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isEligibleForSkillB ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-amber-400/80 border border-slate-700 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Bloqueado (Requer 2★ ou 3★)
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-blue-300">
                        {baseData.skillB.damageType}
                      </span>
                    )}
                  </div>
                </div>
                <p
                  className={`text-[11px] pl-6 leading-relaxed ${
                    !isEligibleForSkillB ? 'text-slate-500' : 'text-slate-300'
                  }`}
                >
                  {baseData.skillB.description}
                </p>
              </div>
            );
          })()}

          {/* Skill C: Ultimate Special Attack (requires Orbe do Despertar) */}
          <div className="p-3 rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-950/30 to-purple-950/20 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-rose-300">
                  {baseData.skillSpecial.name} (Ataque Especial)
                </span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                {unit.hasSpecialItem ? 'DESPERTADO' : 'BLOQUEADO'}
              </span>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed">
              {baseData.skillSpecial.description}
            </p>
            <p className="text-[9px] text-rose-400/90 mt-1 italic">
              *Requer 2★ ou 3★ e o item "Orbe do Despertar" equipado no Slot Especial.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

