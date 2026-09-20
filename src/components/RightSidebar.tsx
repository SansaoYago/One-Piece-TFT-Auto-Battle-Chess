import React, { useState } from 'react';
import { ActiveSynergy, ItemData, UnitInstance } from '../types/game';
import { SYNERGY_DATABASE } from '../data/synergies';
import { ITEM_DATABASE } from '../data/items';
import { ChampionVisual } from './ChampionVisual';
import {
  Sparkles,
  Package,
  Activity,
  Shield,
  Heart,
  Zap,
  ArrowLeft,
  CheckCircle2,
  Lock,
  X,
} from 'lucide-react';

interface RightSidebarProps {
  activeSynergies: ActiveSynergy[];
  boardUnits: UnitInstance[];
  benchUnits: (UnitInstance | null)[];
  playerItems: string[];
  selectedUnit: UnitInstance | null;
  onEquipItemToUnit: (itemId: string, unit: UnitInstance) => void;
  onItemClick?: (item: ItemData) => void;
  onDragStartItem?: (e: React.DragEvent, itemId: string) => void;
  selectedSynergyId?: string | null;
  onSelectSynergyId?: (id: string | null) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  activeSynergies,
  boardUnits,
  benchUnits,
  playerItems,
  selectedUnit,
  onEquipItemToUnit,
  onItemClick,
  onDragStartItem,
  selectedSynergyId,
  onSelectSynergyId,
}) => {
  // On mobile / screens below tablet (< 1024px), keep closed by default (null)
  const [activeTab, setActiveTab] = useState<'SYNERGIES' | 'ITEMS' | 'DPS' | null>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024 ? 'SYNERGIES' : null;
    }
    return null;
  });
  const [internalSelectedSynergyId, setInternalSelectedSynergyId] = useState<string | null>(null);
  const activeSynergyId = selectedSynergyId !== undefined ? selectedSynergyId : internalSelectedSynergyId;
  const setSynergyId = (id: string | null) => {
    if (onSelectSynergyId) onSelectSynergyId(id);
    else setInternalSelectedSynergyId(id);
  };
  const [inspectedItem, setInspectedItem] = useState<ItemData | null>(null);

  // Auto-clear inspectedItem if it is no longer in the player's chest
  React.useEffect(() => {
    if (inspectedItem && !playerItems.includes(inspectedItem.id)) {
      setInspectedItem(null);
    }
  }, [playerItems, inspectedItem]);

  // Friendly units on the board for DPS and synergy checks
  const playerBoardUnits = boardUnits.filter((u) => !u.isEnemy && u.gridX >= 0 && u.gridY >= 0);

  // Calculate highest damage for DPS bar scaling
  const maxDamage = Math.max(
    1,
    ...playerBoardUnits.map(
      (u) => u.totalPhysicalDamage + u.totalMagicalDamage + u.totalTrueDamage
    )
  );

  // Synergies present on the board (count > 0), sorted with active tiers first, then by count
  const boardSynergiesList = React.useMemo(() => {
    const activeMap = new Map<string, ActiveSynergy>(
      activeSynergies.map((s) => [s.trait.id, s])
    );
    const list = Object.values(SYNERGY_DATABASE)
      .map((trait) => {
        const activeData = activeMap.get(trait.id);
        return {
          trait,
          count: activeData ? activeData.count : 0,
          activeTierIndex: activeData ? activeData.activeTierIndex : -1,
          units: activeData ? activeData.units : [],
        };
      })
      // Filter: Only show synergies present on the current board (count > 0)
      .filter((s) => s.count > 0);

    // Sort: Active synergies first (by tier achieved, then count), then inactive
    return list.sort((a, b) => {
      if (a.activeTierIndex >= 0 && b.activeTierIndex < 0) return -1;
      if (b.activeTierIndex >= 0 && a.activeTierIndex < 0) return 1;
      return b.count - a.count;
    });
  }, [activeSynergies]);

  // Selected synergy details for in-container modal view
  const selectedSynergyData = activeSynergyId
    ? boardSynergiesList.find((s) => s.trait.id === activeSynergyId) ||
      (SYNERGY_DATABASE[activeSynergyId]
        ? {
            trait: SYNERGY_DATABASE[activeSynergyId],
            count: 0,
            activeTierIndex: -1,
            units: [],
          }
        : null)
    : null;

  return (
    <div className="flex items-start gap-2 select-none h-full relative">
      
      {/* 1. Main Floating Content Area (Transparent container, floating elements) */}
      <div className="flex-1 flex flex-col items-end overflow-y-auto max-h-full pr-1 space-y-2">
        
        {/* === TAB 1: SINERGIAS (Inspired by Pokemon Auto Chess Layout) === */}
        {activeTab === 'SYNERGIES' && (
          <div className="flex flex-col items-end gap-2 w-full max-w-[260px] animate-in fade-in slide-in-from-right-3 duration-200">
            {/* Header with Close button for mobile / tablet */}
            <div className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl bg-slate-950/85 border border-slate-800/80 backdrop-blur-md shadow-lg">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Sinergias Ativas
              </span>
              <button
                onClick={() => setActiveTab(null)}
                className="p-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
                title="Fechar painel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {boardSynergiesList.length === 0 ? (
              <div className="text-right p-3 rounded-2xl bg-slate-950/70 backdrop-blur-md border border-slate-800/60 text-slate-400 max-w-[220px]">
                <p className="text-[11px] font-bold text-slate-300">Sem Sinergias</p>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">
                  Posicione unidades no tabuleiro para ativar sinergias.
                </p>
              </div>
            ) : (
              boardSynergiesList.map((syn) => {
                const isActive = syn.activeTierIndex >= 0;
                const totalTiers = syn.trait.tiers.length;

                return (
                  <div
                    key={syn.trait.id}
                    data-modal-toggle="true"
                    onClick={() => setSynergyId(syn.trait.id)}
                    className={`group flex items-center justify-end gap-2.5 px-3 py-1.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-slate-950/70 hover:bg-slate-900/90 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/30'
                        : 'bg-slate-950/45 hover:bg-slate-900/70 border border-slate-800/50'
                    } backdrop-blur-md`}
                    title={`Clique para ver detalhes de ${syn.trait.name}`}
                  >
                      {/* Left block (Text + Count + Milestone Pips): Aligned to the left of the Icon */}
                      <div className="flex flex-col items-end justify-center min-w-[80px]">
                        {/* Name of the Synergy + Numerical Count */}
                        <div className="flex items-center gap-1.5 justify-end">
                          <span
                            className={`text-xs font-black tracking-wide leading-tight ${
                              isActive ? 'text-slate-100' : 'text-slate-300'
                            }`}
                          >
                            {syn.trait.name}
                          </span>
                          <span
                            className={`text-[10px] font-black font-mono px-1.5 py-0.2 rounded-md ${
                              isActive
                                ? 'bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                                : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                            }`}
                          >
                            {syn.count}
                          </span>
                        </div>

                        {/* Milestone Badges with Numbers (e.g. [2] [4] [6]) */}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          {syn.trait.tiers.map((tier, idx) => {
                            const isFilled = syn.count >= tier.count;

                            return (
                              <div
                                key={idx}
                                className={`px-1.5 py-0.2 rounded-[4px] text-[8px] font-mono font-bold transition-all duration-300 flex items-center justify-center min-w-[16px] ${
                                  isFilled
                                    ? 'bg-amber-400 text-slate-950 font-black shadow-[0_0_8px_rgba(251,191,36,0.8)] scale-105 ring-1 ring-amber-300'
                                    : 'bg-slate-850 text-slate-400 border border-slate-700/70'
                                }`}
                                title={`Marco: ${tier.count} unidades`}
                              >
                                {tier.count}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    {/* Right block: Synergy Square Icon with same height/size */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm border flex-shrink-0 transition-all duration-200 ${
                        isActive
                          ? 'border-amber-400/80 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                          : 'border-slate-700/60 bg-slate-900/80'
                      }`}
                      style={{
                        backgroundColor: isActive ? `${syn.trait.color}35` : 'rgba(15, 23, 42, 0.7)',
                        borderColor: isActive ? syn.trait.color : 'rgba(51, 65, 85, 0.6)',
                      }}
                    >
                      <span className="drop-shadow">{syn.trait.icon}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* === TAB 2: BAÚ DE ITENS (Transparent Minimalist 3-Per-Row Grid) === */}
        {activeTab === 'ITEMS' && (
          <div className="space-y-2 w-64 animate-in fade-in slide-in-from-right-3 duration-200">
            {/* Header with Close Button */}
            <div className="p-2.5 rounded-2xl bg-slate-950/85 border border-slate-800/80 backdrop-blur-md shadow-lg flex items-center justify-between">
              <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-400" />
                Baú de Itens
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-500/30">
                  {playerItems.length} Itens
                </span>
                <button
                  onClick={() => setActiveTab(null)}
                  className="p-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
                  title="Fechar painel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Grid Container: Exactly 3 items per line, transparent background */}
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/60 backdrop-blur-md">
              {playerItems.length === 0 ? (
                <div className="text-center py-6 px-2 text-slate-400 text-xs">
                  <Package className="w-6 h-6 mx-auto mb-1.5 opacity-30 text-amber-400" />
                  <p className="text-[11px] font-bold text-slate-300">Baú Vazio</p>
                  <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">
                    Conquiste itens nos rounds 3, 6, 9, 12, 15, 18, 21 e 24!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  {playerItems.map((itemId, idx) => {
                    const item = ITEM_DATABASE[itemId];
                    if (!item) return null;
                    const isInspected = inspectedItem?.id === item.id;

                    return (
                      <div
                        key={`${itemId}-${idx}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', `item:${itemId}`);
                          e.dataTransfer.effectAllowed = 'copyMove';
                          onDragStartItem?.(e, itemId);
                        }}
                        onClick={() => {
                          setInspectedItem(item);
                          onItemClick?.(item);
                        }}
                        className={`group relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
                          isInspected
                            ? 'bg-amber-950/60 border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105 ring-1 ring-amber-400'
                            : 'bg-slate-900/60 hover:bg-slate-850/80 border border-slate-700/60 hover:border-amber-400/60 hover:shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                        }`}
                        title={`${item.name} - Clique para ver detalhes`}
                      >
                        {/* Item Icon */}
                        <span className="text-2xl drop-shadow select-none group-hover:scale-110 transition-transform">
                          {item.icon}
                        </span>

                        {/* Special Glow or trait pip */}
                        {item.isSpecialActivation && (
                          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]" />
                        )}
                        {item.grantTrait && (
                          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Click-to-Inspect Floating Popover for Selected Item */}
            {inspectedItem && (
              <div className="p-3 rounded-2xl bg-slate-950/85 border border-amber-500/50 backdrop-blur-lg shadow-2xl space-y-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl flex-shrink-0">{inspectedItem.icon}</span>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-100 truncate block">
                        {inspectedItem.name}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold ${
                          inspectedItem.isSpecialActivation
                            ? 'text-purple-400'
                            : inspectedItem.grantTrait
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {inspectedItem.isSpecialActivation
                          ? 'Item Especial (Skill C)'
                          : inspectedItem.grantTrait
                          ? '+1 Ponto de Sinergia'
                          : 'Item de Batalha'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setInspectedItem(null)}
                    className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[10px] text-slate-300 leading-relaxed">
                  {inspectedItem.description}
                </p>

                {/* Quick Champion Selector to equip item */}
                {(() => {
                  const isSpecialItem = !!inspectedItem.isSpecialActivation;
                  const checkUnitEligibility = (u: UnitInstance) => {
                    const currentSpecial = u.hasSpecialItem || u.items.some((id) => ITEM_DATABASE[id]?.isSpecialActivation);
                    const currentBattles = u.items.filter((id) => !ITEM_DATABASE[id]?.isSpecialActivation);

                    if (isSpecialItem) {
                      if (u.stars < 2) return { eligible: false, reason: 'Requer 2★ ou 3★' };
                      if (currentSpecial) return { eligible: false, reason: 'Já possui Item Especial' };
                      return { eligible: true };
                    } else {
                      if (currentBattles.length >= 2) return { eligible: false, reason: 'Máximo 2 itens' };
                      return { eligible: true };
                    }
                  };

                  const allUnits = [...playerBoardUnits, ...benchUnits.filter((u): u is UnitInstance => u !== null)];
                  const selectedEligible = selectedUnit ? checkUnitEligibility(selectedUnit) : null;

                  return (
                    <div className="space-y-2 pt-1">
                      {selectedUnit && (
                        <div>
                          {selectedEligible?.eligible ? (
                            <button
                              onClick={() => {
                                onEquipItemToUnit(inspectedItem.id, selectedUnit);
                                setInspectedItem(null);
                              }}
                              className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <Zap className="w-3.5 h-3.5" /> Equipar em {selectedUnit.name.split(' ')[0]} ({selectedUnit.stars}★)
                            </button>
                          ) : (
                            <div className="w-full py-1.5 px-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 text-[10px] text-center font-medium">
                              {selectedUnit.name.split(' ')[0]} ({selectedUnit.stars}★): {selectedEligible?.reason}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block text-center">
                          {selectedUnit ? 'Ou escolha outro campeão:' : 'Equipar em um Campeão:'}
                        </span>
                        {allUnits.length === 0 ? (
                          <p className="text-[9px] text-slate-500 italic text-center">
                            Nenhum campeão disponível no tabuleiro ou banco.
                          </p>
                        ) : (
                          <div className="grid grid-cols-4 gap-1.5 max-h-24 overflow-y-auto pr-1">
                            {allUnits.map((u) => {
                              const { eligible, reason } = checkUnitEligibility(u);
                              return (
                                <button
                                  key={u.instanceId}
                                  disabled={!eligible}
                                  onClick={() => {
                                    if (!eligible) return;
                                    onEquipItemToUnit(inspectedItem.id, u);
                                    setInspectedItem(null);
                                  }}
                                  className={`p-1 rounded-xl border flex flex-col items-center gap-0.5 text-center transition-all ${
                                    eligible
                                      ? 'bg-slate-900/90 hover:bg-amber-950/70 border-slate-700 hover:border-amber-400 cursor-pointer active:scale-95'
                                      : 'bg-slate-950/50 border-slate-800/60 opacity-35 cursor-not-allowed'
                                  }`}
                                  title={eligible ? `Equipar em ${u.name} (${u.stars}★)` : `${u.name}: ${reason}`}
                                >
                                  <ChampionVisual
                                    unitId={u.unitId}
                                    avatarFallback={u.avatarUrl || '🏴‍☠️'}
                                    visualAssets={u.visualAssets}
                                    mode="portrait"
                                    alt={u.name}
                                    className="w-6 h-6 rounded-lg text-xs"
                                  />
                                  <span className="text-[8px] font-bold text-slate-300 truncate w-full">
                                    {u.name.split(' ')[0]}
                                  </span>
                                  <span className="text-[7px] text-amber-400/80 font-mono">
                                    {u.stars}★
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* === TAB 3: DPS EM TEMPO REAL (Floating Glass Cards) === */}
        {activeTab === 'DPS' && (
          <div className="space-y-2 w-64 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="p-2.5 rounded-xl bg-slate-950/85 border border-slate-800/80 backdrop-blur-md shadow-xl flex items-center justify-between text-[9px] text-slate-400">
              <span className="font-bold text-slate-200 flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-400" />
                Dano em Combate
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 font-mono text-[8px]">
                  <span className="text-amber-400">Físico</span>
                  <span className="text-cyan-400">Mágico</span>
                  <span className="text-rose-300">Haki</span>
                </div>
                <button
                  onClick={() => setActiveTab(null)}
                  className="p-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
                  title="Fechar painel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {playerBoardUnits.length === 0 ? (
              <div className="text-center py-8 px-3 rounded-xl bg-slate-950/70 backdrop-blur-md border border-slate-800/60 text-slate-400 text-xs">
                <Activity className="w-6 h-6 mx-auto mb-1.5 opacity-30 text-amber-400" />
                Nenhum combate registrado.
              </div>
            ) : (
              playerBoardUnits.map((unit) => {
                const totalDmg =
                  unit.totalPhysicalDamage + unit.totalMagicalDamage + unit.totalTrueDamage;
                const physWidth = (unit.totalPhysicalDamage / maxDamage) * 100;
                const magWidth = (unit.totalMagicalDamage / maxDamage) * 100;
                const trueWidth = (unit.totalTrueDamage / maxDamage) * 100;

                return (
                  <div
                    key={unit.instanceId}
                    className="bg-slate-950/85 backdrop-blur-md rounded-xl p-2 border border-slate-800 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <ChampionVisual
                          unitId={unit.unitId}
                          avatarFallback={unit.avatarUrl}
                          visualAssets={unit.visualAssets}
                          mode="portrait"
                          alt={unit.name}
                          className="w-4 h-4"
                        />
                        <span className="font-bold text-slate-200 truncate">{unit.name}</span>
                        <span className="text-[9px] text-amber-400 font-mono">{unit.stars}★</span>
                      </div>
                      <span className="font-mono font-black text-amber-300 text-[10px]">
                        {totalDmg}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${physWidth}%` }}
                      />
                      <div
                        className="h-full bg-cyan-400"
                        style={{ width: `${magWidth}%` }}
                      />
                      <div
                        className="h-full bg-rose-400"
                        style={{ width: `${trueWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* 2. Vertical Icon-Only Mode Tabs Menu (Attached to the Far Right) */}
      <div
        data-modal-toggle="true"
        className="flex flex-col gap-1.5 p-1 bg-slate-950/60 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-xl"
      >
        {/* Synergies Tab Button */}
        <button
          onClick={() => {
            setActiveTab((prev) => (prev === 'SYNERGIES' ? null : 'SYNERGIES'));
            setSynergyId(null);
          }}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
            activeTab === 'SYNERGIES'
              ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105'
              : 'bg-slate-900/70 text-slate-400 hover:text-slate-100 hover:bg-slate-800'
          }`}
          title="Sinergias Ativas"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Item Bag Tab Button */}
        <button
          onClick={() => {
            setActiveTab((prev) => (prev === 'ITEMS' ? null : 'ITEMS'));
            setSynergyId(null);
          }}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer relative ${
            activeTab === 'ITEMS'
              ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105'
              : 'bg-slate-900/70 text-slate-400 hover:text-slate-100 hover:bg-slate-800'
          }`}
          title="Baú de Itens"
        >
          <Package className="w-4 h-4" />
          {playerItems.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-slate-950 font-mono font-black text-[9px] rounded-full flex items-center justify-center shadow">
              {playerItems.length}
            </span>
          )}
        </button>

        {/* DPS Meter Tab Button */}
        <button
          onClick={() => {
            setActiveTab((prev) => (prev === 'DPS' ? null : 'DPS'));
            setSynergyId(null);
          }}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
            activeTab === 'DPS'
              ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105'
              : 'bg-slate-900/70 text-slate-400 hover:text-slate-100 hover:bg-slate-800'
          }`}
          title="DPS em Tempo Real"
        >
          <Activity className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Detailed Synergy Modal / Popover (Shows when user clicks a synergy row) */}
      {selectedSynergyData && (
        <div
          onClick={() => setSynergyId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none"
        >
          <div
            data-modal-container="true"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-4 shadow-2xl space-y-3"
          >
            
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg border"
                  style={{
                    backgroundColor: `${selectedSynergyData.trait.color}30`,
                    borderColor: selectedSynergyData.trait.color,
                  }}
                >
                  {selectedSynergyData.trait.icon}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-100">
                    {selectedSynergyData.trait.name}
                  </h4>
                  <span className="text-[10px] font-mono text-amber-400">
                    {selectedSynergyData.count} unidades ativas
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSynergyId(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedSynergyData.trait.description}
            </p>

            {/* Champions and Chips in board with this Trait */}
            {(() => {
              const traitId = selectedSynergyData.trait.id;
              const matchingChampions = playerBoardUnits.filter((u) => u.traits.includes(traitId as any));
              const matchingChips = playerBoardUnits.flatMap((u) =>
                u.items
                  .filter((itId) => ITEM_DATABASE[itId]?.grantTrait === traitId)
                  .map((itId) => ({ item: ITEM_DATABASE[itId], equippedOn: u.name }))
              );

              return (
                <div className="space-y-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Contribuição em Campo
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-400">
                      Total: {selectedSynergyData.count} Pontos
                    </span>
                  </div>

                  {matchingChampions.length === 0 && matchingChips.length === 0 ? (
                    <span className="text-[10px] text-slate-500 italic block">
                      Nenhum campeão ou chip desta classe em campo.
                    </span>
                  ) : (
                    <div className="space-y-1.5">
                      {matchingChampions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {matchingChampions.map((u) => (
                            <div
                              key={u.instanceId}
                              className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900 border border-amber-500/40 text-[10px] font-bold text-slate-200"
                            >
                              <ChampionVisual
                                unitId={u.unitId}
                                avatarFallback={u.avatarUrl}
                                visualAssets={u.visualAssets}
                                mode="portrait"
                                alt={u.name}
                                className="w-3.5 h-3.5"
                              />
                              <span>{u.name}</span>
                              <span className="text-amber-400 font-mono">{u.stars}★</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {matchingChips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/80">
                          {matchingChips.map((chip, cIdx) => (
                            <div
                              key={cIdx}
                              className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-950/40 border border-amber-500/50 text-[10px] font-bold text-amber-300"
                            >
                              <span>{chip.item.icon}</span>
                              <span>{chip.item.name}</span>
                              <span className="text-slate-400 text-[9px]">({chip.equippedOn})</span>
                              <span className="text-emerald-400 font-mono text-[9px]">+1</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Tier Milestones with Numbers and Full Effect Details */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Marcos de Ativação
              </span>
              {selectedSynergyData.trait.tiers.length === 0 ? (
                <div className="p-3 rounded-xl border border-sky-800/60 bg-sky-950/30 text-sky-200 text-xs">
                  <div className="font-bold text-sky-400 mb-1 flex items-center gap-1.5">
                    <span>🧭</span> Efeito em Desenvolvimento
                  </div>
                  <div className="text-[11px] text-slate-300">
                    O efeito desta classe será introduzido na próxima atualização.
                  </div>
                </div>
              ) : (
                selectedSynergyData.trait.tiers.map((tier, idx) => {
                  const isReached = selectedSynergyData.count >= tier.count;

                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-xl border transition-all ${
                        isReached
                          ? 'bg-amber-950/40 border-amber-400/70 text-amber-200'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-black font-mono flex items-center gap-1.5">
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold ${
                              isReached
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {tier.count}
                          </span>
                          Tier {idx + 1} ({tier.count} Unidades)
                        </span>
                        {isReached ? (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Ativo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[9px] font-mono text-slate-600">
                            <Lock className="w-2.5 h-2.5" /> Bloqueado
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] leading-snug">{tier.description}</p>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
