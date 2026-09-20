import React, { useState } from 'react';
import { UnitInstance, UnitBaseData, GamePhase } from '../types/game';
import { CHAMPION_DATABASE } from '../data/units';
import { SYNERGY_DATABASE } from '../data/synergies';
import { ITEM_DATABASE } from '../data/items';
import { calculateUnitSellValue, isUnitEquippedWithOrb } from '../utils/gameUtils';
import { ChampionVisual } from './ChampionVisual';
import {
  X,
  Star,
  Shield,
  Zap,
  Swords,
  Heart,
  Package,
  Trash2,
  Lock,
  Menu,
  Sparkles,
  ChevronRight,
  Flame,
} from 'lucide-react';

interface UnitInspectorProps {
  unit: UnitInstance;
  gamePhase?: GamePhase;
  totalRound?: number;
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
  totalRound,
  changedSkillUnitIdThisRound = null,
  isViewingOpponentArena = false,
  onClose,
  onSelectSkill,
  onUnequipItem,
  onSellUnit,
}) => {
  const [showStatsFlyout, setShowStatsFlyout] = useState<boolean>(false);

  const baseData: UnitBaseData = CHAMPION_DATABASE[unit.unitId] || CHAMPION_DATABASE.luffy;
  const isPrepPhase = gamePhase === 'PREPARATION' && !isViewingOpponentArena;
  const sellValue = calculateUnitSellValue(unit);

  // Skill switching restrictions (1 change per round during preparation, 1* units have Skill B locked)
  const isEligibleForSkillB = unit.stars >= 2;
  const hasSwitchedAnyUnitThisRound =
    changedSkillUnitIdThisRound !== null && changedSkillUnitIdThisRound !== undefined;
  const hasSwitchedThisSpecificUnit = changedSkillUnitIdThisRound === unit.instanceId;

  // Base attributes calculated by Star Level (LVL)
  const starMultiplier = unit.stars === 3 ? 3.24 : unit.stars === 2 ? 1.8 : 1.0;
  const baseAd = Math.round((baseData.baseAd || 50) * starMultiplier);
  const baseArmor = baseData.baseArmor || 20;
  const baseAp = baseData.baseAp || 100;
  const baseMr = baseData.baseMr || 20;
  const baseAs = (baseData.attackSpeed || 0.65).toFixed(2);
  const baseCritChance = 25;
  const baseCritDamage = 140;

  // Equipped items
  const battleItems = unit.items.filter((id) => !ITEM_DATABASE[id]?.isSpecialActivation);
  const specialItem = unit.items.find((id) => ITEM_DATABASE[id]?.isSpecialActivation);
  const hasOrbEquipped = isUnitEquippedWithOrb(unit);

  const handleSkillClick = (targetSkill: 'SKILL_A' | 'SKILL_B') => {
    if (!isPrepPhase) return;

    if (targetSkill === 'SKILL_B' && !isEligibleForSkillB) {
      return;
    }

    if (unit.activeSkill === targetSkill) {
      return;
    }

    if (hasSwitchedAnyUnitThisRound && !hasSwitchedThisSpecificUnit) {
      return;
    }

    onSelectSkill(unit, targetSkill);
  };

  return (
    <div
      data-modal-container="true"
      className="fixed top-14 sm:top-16 left-3 sm:left-4 z-40 w-[340px] sm:w-[370px] max-h-[calc(100vh-5rem)] bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl p-3.5 text-slate-100 flex flex-col gap-3 select-none animate-in fade-in slide-in-from-left-4 duration-200 overflow-y-auto"
    >
      {/* Top Header: Name, Stars, Tier Cost & Close */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-black text-white tracking-wide truncate">
              {unit.name}
            </h3>
            {/* Star Rating */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: unit.stars }).map((_, idx) => (
                <Star key={idx} className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow" />
              ))}
            </div>
            {/* Cost Badge */}
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-600/70 text-[10px] font-black">
              💰 {baseData.cost || 1}฿
            </span>
          </div>

          {/* Traits / Synergies & Role */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {unit.traits.map((t) => {
              const syn = SYNERGY_DATABASE[t];
              return (
                <span
                  key={t}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-200 border border-slate-700 flex items-center gap-1 shadow-sm"
                >
                  <span>{syn?.icon || '⚔️'}</span>
                  <span>{syn?.name || t}</span>
                </span>
              );
            })}
            <span className="text-[10px] text-slate-400 ml-1">
              Alcance: <strong className="text-slate-200">{baseData.range}</strong>
            </span>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Character Portrait + Vitality Bars (HP & Mana) + Hamburger Stats Menu */}
      <div className="relative flex items-center gap-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 shadow-inner">
        {/* Visual Portrait */}
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg border overflow-hidden p-0.5 shrink-0 bg-slate-950"
          style={{ borderColor: unit.color || '#F59E0B' }}
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

        {/* Vitality Bars */}
        <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
          {/* HP Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <Heart className="w-3 h-3 text-emerald-400" /> Vida
              </span>
              <span className="font-mono font-bold text-emerald-200">
                {unit.hp} / {unit.maxHp}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, (unit.hp / unit.maxHp) * 100))}%` }}
              />
            </div>
          </div>

          {/* Mana Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="font-bold text-cyan-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-400" /> Mana
              </span>
              <span className="font-mono font-bold text-cyan-200">
                {unit.mana} / {unit.maxMana}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, (unit.mana / unit.maxMana) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Hamburger Button (≡) for Base Attributes Flyout */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowStatsFlyout((prev) => !prev)}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-md ${
              showStatsFlyout
                ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/40 scale-105'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700 hover:border-amber-400/60'
            }`}
            title="Ver Atributos Base do Nível (LVL)"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* FLYOUT POPOVER: Base Attributes of Current Star Level (LVL) - Image 3 */}
      {showStatsFlyout && (
        <div className="bg-slate-900/95 border-2 border-amber-500/70 rounded-xl p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Atributos Base (Nível {unit.stars}★)
            </span>
            <button
              onClick={() => setShowStatsFlyout(false)}
              className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700"
            >
              Fechar ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1">
                <Swords className="w-3.5 h-3.5 text-amber-400" /> Ataque (AD):
              </span>
              <span className="font-mono font-black text-amber-300">{baseAd}</span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-blue-400" /> Defesa (Armadura):
              </span>
              <span className="font-mono font-black text-blue-300">{baseArmor}</span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-purple-400" /> Poder Mágico (AP):
              </span>
              <span className="font-mono font-black text-purple-300">{baseAp}</span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-indigo-400" /> Defesa Mágica (MR):
              </span>
              <span className="font-mono font-black text-indigo-300">{baseMr}</span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-cyan-400" /> Vel. Ataque (AS):
              </span>
              <span className="font-mono font-black text-cyan-300">{baseAs}</span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-red-400" /> Taxa Crítica:
              </span>
              <span className="font-mono font-black text-red-300">{baseCritChance}%</span>
            </div>

            <div className="col-span-2 flex items-center justify-between p-1.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> Dano Crítico:
              </span>
              <span className="font-mono font-black text-amber-400">{baseCritDamage}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Equipped Items (持有所) */}
      <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-black text-amber-400 uppercase tracking-wide flex items-center gap-1">
            <Package className="w-3.5 h-3.5" />
            Itens Equipados ({unit.items.length}/3)
          </span>
          <span className="text-[9px] text-slate-400">
            Recomendado: <span className="text-amber-300 font-bold">Dano / Haki</span>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Slot 1: Batalha 1 */}
          {(() => {
            const itemId = battleItems[0];
            const item = itemId ? ITEM_DATABASE[itemId] : null;
            return (
              <div
                className={`p-1.5 rounded-xl border flex flex-col items-center justify-center min-h-[58px] text-center relative ${
                  item
                    ? 'bg-amber-950/30 border-amber-500/70'
                    : 'bg-slate-950/50 border-slate-800 border-dashed'
                }`}
              >
                {item ? (
                  <>
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-[9px] font-bold text-slate-200 truncate max-w-full">
                      {item.name}
                    </span>
                    {isPrepPhase && onUnequipItem && (
                      <button
                        onClick={() => onUnequipItem(itemId, unit, 0)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold hover:bg-rose-500 cursor-pointer shadow"
                        title="Remover Item"
                      >
                        ✕
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-[9px] text-slate-500 font-medium">Batalha 1</span>
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
                className={`p-1.5 rounded-xl border flex flex-col items-center justify-center min-h-[58px] text-center relative ${
                  item
                    ? 'bg-amber-950/30 border-amber-500/70'
                    : 'bg-slate-950/50 border-slate-800 border-dashed'
                }`}
              >
                {item ? (
                  <>
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-[9px] font-bold text-slate-200 truncate max-w-full">
                      {item.name}
                    </span>
                    {isPrepPhase && onUnequipItem && (
                      <button
                        onClick={() => onUnequipItem(itemId, unit, 1)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold hover:bg-rose-500 cursor-pointer shadow"
                        title="Remover Item"
                      >
                        ✕
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-[9px] text-slate-500 font-medium">Batalha 2</span>
                )}
              </div>
            );
          })()}

          {/* Slot 3: Especial */}
          {(() => {
            const item = specialItem ? ITEM_DATABASE[specialItem] : null;
            return (
              <div
                className={`p-1.5 rounded-xl border flex flex-col items-center justify-center min-h-[58px] text-center relative ${
                  item
                    ? 'bg-purple-950/30 border-purple-500/70'
                    : 'bg-slate-950/50 border-slate-800 border-dashed'
                }`}
              >
                {item ? (
                  <>
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-[9px] font-bold text-purple-200 truncate max-w-full">
                      {item.name}
                    </span>
                    {isPrepPhase && onUnequipItem && (
                      <button
                        onClick={() => onUnequipItem(specialItem!, unit, 2)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold hover:bg-rose-500 cursor-pointer shadow"
                        title="Remover Item Especial"
                      >
                        ✕
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-[9px] text-slate-500 font-medium">Especial</span>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Golpes / Habilidades Section (招式 / 特别招式) - Image 2 & 3 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[11px] font-black text-amber-400 uppercase tracking-wide">
            Golpes & Habilidades
          </span>
          {isPrepPhase && (
            <span className="text-[9px] text-slate-400">
              Clique no golpe para alternar ativo
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Golpe Principal (Skill A) */}
          <div
            onClick={() => handleSkillClick('SKILL_A')}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col items-center text-center relative ${
              unit.activeSkill === 'SKILL_A'
                ? 'bg-amber-950/40 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Circular Artwork Frame (Prepped for future custom skill images) */}
            <div className="w-11 h-11 rounded-full border-2 border-amber-400/80 bg-slate-950 flex items-center justify-center shadow-md relative overflow-hidden mb-1">
              <span className="text-xl drop-shadow">⚔️</span>
              {unit.activeSkill === 'SKILL_A' && (
                <div className="absolute inset-0 bg-amber-400/10 ring-2 ring-amber-400 rounded-full" />
              )}
            </div>

            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 mb-0.5">
              {baseData.skillA.type === 'SPECIAL' ? 'Especial' : baseData.skillA.type === 'PASSIVE' ? 'Passiva' : 'Golpe Principal'}
            </span>
            <span className="text-xs font-black text-slate-100 truncate max-w-full">
              {baseData.skillA.name}
            </span>
            <span className="text-[9px] text-cyan-400 font-bold mt-0.5">
              {baseData.skillA.manaCost} Mana
            </span>

            {unit.activeSkill === 'SKILL_A' ? (
              <span className="mt-1 text-[8px] font-black text-amber-300 tracking-wider uppercase bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40">
                ▲ ATIVO
              </span>
            ) : (
              <span className="mt-1 text-[8px] font-semibold text-slate-400">
                Disponível
              </span>
            )}

            {/* Descrição da Skill A */}
            <p className="mt-1.5 text-[9px] text-slate-400 line-clamp-2 text-left leading-tight px-0.5">
              {baseData.skillA.description}
            </p>
          </div>

          {/* Golpe Especial (Skill B) */}
          <div
            onClick={() => handleSkillClick('SKILL_B')}
            className={`p-2 rounded-xl border transition-all flex flex-col items-center text-center relative ${
              !isEligibleForSkillB
                ? 'opacity-75 cursor-not-allowed bg-slate-950/60 border-slate-800'
                : unit.activeSkill === 'SKILL_B'
                ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg cursor-pointer'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 cursor-pointer'
            }`}
          >
            {/* Circular Artwork Frame (Prepped for future custom skill images) */}
            <div className="w-11 h-11 rounded-full border-2 border-cyan-400/80 bg-slate-950 flex items-center justify-center shadow-md relative overflow-hidden mb-1">
              {!isEligibleForSkillB ? (
                <Lock className="w-5 h-5 text-slate-500" />
              ) : (
                <span className="text-xl drop-shadow">🌪️</span>
              )}
              {unit.activeSkill === 'SKILL_B' && (
                <div className="absolute inset-0 bg-cyan-400/10 ring-2 ring-cyan-400 rounded-full" />
              )}
            </div>

            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 mb-0.5">
              {!isEligibleForSkillB ? '2★ Requerido' : 'Golpe Especial'}
            </span>
            <span className="text-xs font-black text-slate-100 truncate max-w-full">
              {baseData.skillB.name}
            </span>
            <span className="text-[9px] text-cyan-400 font-bold mt-0.5">
              {baseData.skillB.manaCost} Mana
            </span>

            {unit.activeSkill === 'SKILL_B' ? (
              <span className="mt-1 text-[8px] font-black text-cyan-300 tracking-wider uppercase bg-cyan-500/20 px-1.5 py-0.5 rounded border border-cyan-500/40">
                ▲ ATIVO
              </span>
            ) : !isEligibleForSkillB ? (
              <span className="mt-1 text-[8px] font-bold text-slate-500 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Bloqueado em 1★
              </span>
            ) : (
              <span className="mt-1 text-[8px] font-semibold text-slate-400">
                Disponível
              </span>
            )}

            {/* Descrição da Skill B */}
            <p className="mt-1.5 text-[9px] text-slate-400 line-clamp-2 text-left leading-tight px-0.5">
              {baseData.skillB.description}
            </p>
          </div>
        </div>

        {/* HABILIDADE DE DESPERTAR (ORBE DO DESPERTAR) COM CADEADO CONDICIONAL */}
        {baseData.skillSpecial && (
          <div
            className={`p-2.5 rounded-xl border transition-all relative overflow-hidden flex flex-col gap-1.5 ${
              hasOrbEquipped
                ? 'bg-gradient-to-r from-purple-950/70 via-purple-900/40 to-slate-900/90 border-purple-500 ring-1 ring-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                : 'bg-slate-950/80 border-purple-950/70 border-dashed'
            }`}
          >
            {/* Cabeçalho da Habilidade de Orbe */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 shadow-sm ${
                    hasOrbEquipped
                      ? 'bg-purple-900/90 border-purple-400 text-purple-200 ring-2 ring-purple-400/40 shadow-[0_0_10px_rgba(168,85,247,0.6)]'
                      : 'bg-slate-900 border-purple-900/60 text-purple-400/70'
                  }`}
                >
                  {hasOrbEquipped ? (
                    <span className="text-base animate-pulse">🔮</span>
                  ) : (
                    <Lock className="w-4 h-4 text-purple-400" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-purple-200 truncate">
                      {baseData.skillSpecial.name}
                    </span>
                    <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-700/60 uppercase">
                      Despertar
                    </span>
                  </div>
                  <span className="text-[9px] text-purple-400 font-semibold block">
                    Ativação Suprema de Orbe • {baseData.skillSpecial.manaCost || 100} Mana
                  </span>
                </div>
              </div>

              {/* Status Badge: Cadeado para Bloqueado, ou Desbloqueado com Orbe */}
              {hasOrbEquipped ? (
                <span className="flex items-center gap-1 text-[9px] font-black text-fuchsia-300 bg-purple-900/90 border border-purple-400/80 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(192,132,252,0.6)] uppercase tracking-wider shrink-0 animate-pulse">
                  <Sparkles className="w-2.5 h-2.5 text-fuchsia-300" />
                  Desbloqueado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[9px] font-black text-purple-300 bg-purple-950/90 border border-purple-800/80 px-2 py-0.5 rounded-full shadow-inner uppercase tracking-wide shrink-0">
                  <Lock className="w-2.5 h-2.5 text-purple-400" />
                  Bloqueado
                </span>
              )}
            </div>

            {/* Informações detalhadas da Habilidade (mantidas visíveis para o jogador conhecer o golpe) */}
            <div className="bg-slate-950/70 rounded-lg p-2 border border-purple-950/60 text-[10px] text-slate-200 leading-relaxed">
              <p>{baseData.skillSpecial.description}</p>
            </div>

            {/* Mensagem Explicativa do Cadeado */}
            {!hasOrbEquipped && (
              <div className="flex items-center gap-1.5 text-[9px] text-purple-300/90 bg-purple-950/40 px-2 py-1 rounded border border-purple-900/40">
                <Lock className="w-3 h-3 text-purple-400 shrink-0" />
                <span>
                  Equipe o <strong className="text-purple-200 font-bold">Orbe do Despertar</strong> para liberar este golpe supremo!
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action: Sell Unit during preparation phase */}
      {isPrepPhase && onSellUnit && !unit.isEnemy && (
        <button
          onClick={() => onSellUnit(unit)}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-950/80 hover:bg-rose-900/90 text-rose-300 hover:text-white border border-rose-600/70 transition-all font-bold text-xs shadow-md cursor-pointer mt-0.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Vender Campeão</span>
          <span className="font-mono font-black text-amber-300 ml-1">+{sellValue}฿</span>
        </button>
      )}
    </div>
  );
};
