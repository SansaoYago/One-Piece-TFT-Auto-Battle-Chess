import React from 'react';
import { UnitInstance } from '../types/game';
import { Sparkles, Star, ShipWheel } from 'lucide-react';
import { SYNERGY_DATABASE } from '../data/synergies';
import { ITEM_DATABASE } from '../data/items';
import { ChampionVisual } from './ChampionVisual';

interface BenchProps {
  benchSlots: (UnitInstance | null)[];
  selectedUnitId: string | null;
  onSlotClick: (benchIndex: number) => void;
  onUnitSelect: (unit: UnitInstance) => void;
  onDragStart: (e: React.DragEvent, unit: UnitInstance) => void;
  onDragEnd?: () => void;
  onDragOver: (e: React.DragEvent, benchIndex: number) => void;
  onDrop: (e: React.DragEvent, benchIndex: number) => void;
  isViewingOpponentArena?: boolean;
  opponentName?: string;
  isTestMode?: boolean;
  playerUnitsCount?: number;
  maxUnits?: number;
  level?: number;
  xp?: number;
  xpNeeded?: number;
}

export const Bench: React.FC<BenchProps> = ({
  benchSlots,
  selectedUnitId,
  onSlotClick,
  onUnitSelect,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isViewingOpponentArena = false,
  opponentName = 'Oponente',
  isTestMode = false,
  playerUnitsCount = 0,
  maxUnits = 1,
  level = 1,
  xp = 0,
  xpNeeded = 2,
}) => {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 backdrop-blur-md rounded-2xl border shadow-2xl transition-all ${
      isViewingOpponentArena
        ? 'bg-slate-950/60 border-cyan-500/40 ring-1 ring-cyan-500/20'
        : isTestMode
        ? 'bg-slate-950/90 border-amber-500/60 ring-1 ring-amber-500/30'
        : 'bg-slate-950/40 border-slate-700/40'
    }`}>
      {/* Embutido no lugar de BANCO 8 Slots: Ícone de Leme redondo (ShipWheel) + Contagem de Unidades (sem a palavra Unidades) + Barra de XP abaixo */}
      <div className="flex flex-col items-center justify-center px-1.5 py-0.5 mr-1 flex-shrink-0 min-w-[58px]">
        {/* Unidades: Ícone de Leme Redondo (Navio) + Contagem */}
        <div className="flex items-center gap-1.5">
          <ShipWheel className={`w-4 h-4 ${isViewingOpponentArena ? 'text-cyan-400' : 'text-amber-400'}`} />
          <span
            className={`text-[12px] font-mono font-black ${
              !isTestMode && playerUnitsCount > maxUnits
                ? 'text-rose-400 animate-pulse'
                : isViewingOpponentArena
                ? 'text-cyan-300'
                : 'text-amber-300'
            }`}
          >
            {isTestMode ? benchSlots.length : `${playerUnitsCount}/${maxUnits}`}
          </span>
        </div>

        {/* Barra de XP abaixo de unidades */}
        {!isViewingOpponentArena && (
          <div className="w-14 flex flex-col items-center mt-1">
            <div className="w-full flex items-center justify-between text-[7.5px] font-bold text-slate-300 leading-none mb-0.5">
              <span className="text-amber-300 font-mono">Nv.{level}</span>
              <span className="text-[7px] text-slate-400 font-mono">{xp}/{xpNeeded}</span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (xp / (xpNeeded || 1)) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className={`flex items-center gap-1.5 ${isTestMode ? 'overflow-x-auto max-w-[80vw] pb-1 scrollbar-thin' : ''}`}>
        {benchSlots.map((unit, index) => {
          const isSelected = unit && unit.instanceId === selectedUnitId;

          return (
            <div
              key={index}
              onDragEnter={(e) => {
                e.preventDefault();
                if (!isViewingOpponentArena) {
                  setHoveredIndex(index);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (!isViewingOpponentArena) {
                  if (hoveredIndex !== index) setHoveredIndex(index);
                  onDragOver(e, index);
                }
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                if (hoveredIndex === index) {
                  setHoveredIndex(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setHoveredIndex(null);
                if (!isViewingOpponentArena) onDrop(e, index);
              }}
              onClick={() => {
                if (unit) {
                  onUnitSelect(unit);
                } else if (!isViewingOpponentArena) {
                  onSlotClick(index);
                }
              }}
              data-unit-slot="true"
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border relative flex flex-col items-center justify-between p-1 transition-all duration-200 select-none ${
                hoveredIndex === index
                  ? unit
                    ? 'bg-cyan-950/90 border-cyan-400 ring-2 ring-cyan-400/80 scale-105 shadow-[0_0_20px_rgba(34,211,238,0.7)]'
                    : 'bg-amber-950/90 border-amber-400 ring-2 ring-amber-400/80 scale-105 shadow-[0_0_20px_rgba(245,158,11,0.7)]'
                  : unit
                  ? isSelected
                    ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/60 scale-105 shadow-xl cursor-grab active:cursor-grabbing'
                    : 'bg-slate-900/60 border-slate-700/80 hover:border-amber-500/80 hover:scale-105 shadow-md backdrop-blur-sm cursor-grab active:cursor-grabbing'
                  : 'bg-slate-950/30 border-slate-800/50 border-dashed hover:border-slate-700 justify-center cursor-default'
              }`}
              draggable={!isViewingOpponentArena && !!unit}
              onDragStart={(e) => {
                if (!isViewingOpponentArena && unit) {
                  e.dataTransfer.effectAllowed = 'move';
                  onDragStart(e, unit);
                }
              }}
              onDragEnd={() => {
                setHoveredIndex(null);
                if (onDragEnd) onDragEnd();
              }}
            >
              {hoveredIndex === index && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/85 rounded-xl pointer-events-none z-30 animate-pulse">
                  <span className="text-[9px] font-black tracking-wide text-amber-300">
                    {unit ? '⇄ Trocar' : '+ Banco'}
                  </span>
                </div>
              )}
              {unit ? (
                <div className="w-full h-full flex flex-col items-center justify-between pointer-events-none">
                  {/* Top Bar: Gold Star in Top-Left and Cost Badge in Top-Right */}
                  <div className="w-full flex items-center justify-between z-10">
                    {/* Star Badge */}
                    <div className="flex items-center gap-0.5 bg-slate-950/90 px-1 py-0.2 rounded border border-amber-400/60">
                      <Star className="w-2.5 h-2.5 text-amber-300 fill-amber-300" />
                      <span className="text-[8px] font-mono font-black text-amber-300">
                        {unit.stars}★
                      </span>
                    </div>

                    {/* Cost Badge */}
                    <span
                      className="text-[8px] font-black px-1 rounded text-slate-950 shadow"
                      style={{ backgroundColor: unit.color || '#F59E0B' }}
                    >
                      {unit.cost}฿
                    </span>
                  </div>

                  {/* Centered Champion Art / Avatar */}
                  <div className="my-auto flex flex-col items-center">
                    <ChampionVisual
                      unitId={unit.unitId}
                      avatarFallback={unit.avatarUrl}
                      visualAssets={unit.visualAssets}
                      mode="portrait"
                      alt={unit.name}
                      className="w-7 h-7 sm:w-8 sm:h-8"
                      imageClassName="drop-shadow"
                    />
                    <span className="text-[8px] font-bold text-slate-200 truncate max-w-[58px] text-center leading-tight mt-0.5">
                      {unit.name.split(' ')[0]}
                    </span>
                    {/* Items on Bench */}
                    {unit.items && unit.items.length > 0 && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {unit.items.map((itemId, idx) => {
                          const itm = ITEM_DATABASE[itemId];
                          if (!itm) return null;
                          return (
                            <span key={idx} className="text-[8px]" title={itm.name}>
                              {itm.icon}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Base: Synergy Chips / Icons at Bottom */}
                  <div className="flex items-center gap-0.5 w-full justify-center">
                    {unit.traits.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[8px] bg-slate-950/90 px-0.5 rounded border border-slate-800 shadow-xs"
                        title={SYNERGY_DATABASE[t]?.name || t}
                      >
                        {SYNERGY_DATABASE[t]?.icon || '⚡'}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pointer-events-none select-none">
                  <span className="text-xs text-slate-600 font-mono font-bold">
                    {index + 1}
                  </span>
                  <span className="text-[8px] text-slate-700">Vazio</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
