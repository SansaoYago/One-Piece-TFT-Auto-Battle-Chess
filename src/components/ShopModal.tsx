import React, { useState } from 'react';
import { UnitBaseData, UnitInstance } from '../types/game';
import { ShoppingBag, RefreshCw, ArrowUpCircle, Lock, Unlock, Sparkles, Star, ChevronUp, ChevronDown, DollarSign, Trash2, ArrowLeftCircle, Eye } from 'lucide-react';
import { SHOP_ODDS_BY_LEVEL, calculateUnitSellValue } from '../utils/gameUtils';
import { SYNERGY_DATABASE } from '../data/synergies';
import { ChampionVisual } from './ChampionVisual';

interface ShopModalProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  shopCards: (UnitBaseData | null)[];
  gold: number;
  level: number;
  xp: number;
  xpNeeded: number;
  isLocked: boolean;
  onToggleLock: () => void;
  onReroll: () => void;
  onBuyXp: () => void;
  onBuyCard: (cardIndex: number) => void;
  draggedUnit: UnitInstance | null;
  onSellUnit: (unit: UnitInstance) => void;
  isViewingOpponentArena?: boolean;
  opponentName?: string;
  onReturnToPlayerArena?: () => void;
}

const TIER_COLORS: Record<number, { border: string; bg: string; text: string; badge: string }> = {
  1: {
    border: 'border-slate-600',
    bg: 'from-slate-900 to-slate-950',
    text: 'text-slate-200',
    badge: 'bg-slate-700 text-slate-200',
  },
  2: {
    border: 'border-emerald-500/70',
    bg: 'from-emerald-950/40 to-slate-950',
    text: 'text-emerald-300',
    badge: 'bg-emerald-700 text-emerald-100',
  },
  3: {
    border: 'border-blue-500/70',
    bg: 'from-blue-950/40 to-slate-950',
    text: 'text-blue-300',
    badge: 'bg-blue-700 text-blue-100',
  },
  4: {
    border: 'border-purple-500/70',
    bg: 'from-purple-950/40 to-slate-950',
    text: 'text-purple-300',
    badge: 'bg-purple-700 text-purple-100',
  },
  5: {
    border: 'border-amber-400',
    bg: 'from-amber-950/50 to-slate-950',
    text: 'text-amber-300',
    badge: 'bg-amber-500 text-slate-950 font-black',
  },
};

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onToggleOpen,
  shopCards,
  gold,
  level,
  xp,
  xpNeeded,
  isLocked,
  onToggleLock,
  onReroll,
  onBuyXp,
  onBuyCard,
  draggedUnit,
  onSellUnit,
  isViewingOpponentArena = false,
  opponentName = 'Oponente',
  onReturnToPlayerArena,
}) => {
  const [isDragOverSell, setIsDragOverSell] = useState(false);
  const currentOdds = SHOP_ODDS_BY_LEVEL[level] || [100, 0, 0, 0, 0];

  const sellValue = draggedUnit ? calculateUnitSellValue(draggedUnit) : 0;

  return (
    <div className="relative z-30 select-none">
      
      {/* Dynamic Minimal Toggle Button OR Sell Area OR Return Button */}
      {isViewingOpponentArena ? (
        <button
          onClick={onReturnToPlayerArena}
          className="flex items-center justify-center gap-1.5 min-w-[144px] h-[44px] px-3.5 rounded-2xl font-black text-xs tracking-wider uppercase transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.5)] border-2 border-amber-400 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 cursor-pointer animate-bounce whitespace-nowrap"
        >
          <ArrowLeftCircle className="w-4 h-4 text-slate-950 shrink-0" />
          <span>Voltar</span>
        </button>
      ) : draggedUnit ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOverSell(true);
          }}
          onDragLeave={() => setIsDragOverSell(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOverSell(false);
            if (draggedUnit) onSellUnit(draggedUnit);
          }}
          onClick={() => {
            if (draggedUnit) onSellUnit(draggedUnit);
          }}
          className={`flex items-center justify-center gap-1.5 w-[144px] h-[44px] px-3 rounded-2xl font-black text-xs tracking-wide uppercase transition-all duration-200 shadow-2xl border cursor-pointer animate-pulse select-none ${
            isDragOverSell
              ? 'bg-rose-600/95 text-white border-rose-300 scale-105 ring-4 ring-rose-400/50 shadow-[0_0_25px_rgba(244,63,94,0.8)]'
              : 'bg-rose-950/70 text-rose-300 border-rose-500/70 hover:scale-102 backdrop-blur-md'
          }`}
          title="Solte aqui para vender"
        >
          <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-[11px] font-bold">Vender</span>
          <span className="font-mono font-black text-amber-300 text-sm ml-0.5">+{sellValue}฿</span>
        </div>
      ) : (
        /* Floating Retractable Golden Shop Toggle Button */
        <button
          onClick={onToggleOpen}
          className={`flex items-center justify-center gap-1.5 w-[144px] h-[44px] px-3 rounded-2xl font-bold text-xs tracking-wide uppercase transition-all duration-300 shadow-xl border backdrop-blur-md cursor-pointer select-none ${
            isOpen
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
              : 'bg-slate-900/60 text-amber-300 border-amber-500/50 hover:border-amber-400 hover:scale-102'
          }`}
        >
          <ShoppingBag className="w-4 h-4 shrink-0" />
          <span className="font-bold">Loja (฿)</span>
          <span className="text-[10px] opacity-80 font-mono">[D]</span>
          {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronUp className="w-4 h-4 shrink-0" />}
        </button>
      )}

      {/* Expanded Shop Panel Drawer centered on X axis just above the bench */}
      {isOpen && !isViewingOpponentArena && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[760px] max-w-[95vw] bg-slate-950/95 border-2 border-amber-500/70 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200 ring-2 ring-amber-400/20 z-50">
          
          {/* Shop Header Controls */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            {/* Left: Level & Odds */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-amber-400">
                Nível {level} Probabilidades:
              </span>
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  T1: {currentOdds[0]}%
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                  T2: {currentOdds[1]}%
                </span>
                <span className="px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800">
                  T3: {currentOdds[2]}%
                </span>
                <span className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800">
                  T4: {currentOdds[3]}%
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 font-bold">
                  T5: {currentOdds[4]}%
                </span>
              </div>
            </div>

            {/* Right: Lock Shop */}
            <button
              onClick={onToggleLock}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                isLocked
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              {isLocked ? 'Loja Travada' : 'Travar'}
            </button>
          </div>

          {/* If unit is being dragged with shop open, show minimal sell target */}
          {draggedUnit && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOverSell(true);
              }}
              onDragLeave={() => setIsDragOverSell(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOverSell(false);
                if (draggedUnit) onSellUnit(draggedUnit);
              }}
              className={`mb-3 py-2.5 px-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all ${
                isDragOverSell
                  ? 'bg-rose-600/90 border-rose-300 text-white ring-4 ring-rose-400/50 scale-[1.01]'
                  : 'bg-rose-950/40 border-rose-500/60 text-amber-300'
              }`}
            >
              <span className="text-sm font-black tracking-wider text-slate-200">
                Solte para vender:
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black font-mono shadow-md text-sm">
                ฿ +{sellValue}
              </span>
            </div>
          )}

          {/* 5 Champion Cards */}

          <div className="grid grid-cols-5 gap-2.5 mb-3">
            {shopCards.map((card, idx) => {
              if (!card) {
                return (
                  <div
                    key={idx}
                    className="h-36 rounded-xl border border-slate-800/80 bg-slate-900/30 flex items-center justify-center text-slate-700 text-xs font-mono"
                  >
                    Comprado
                  </div>
                );
              }

              const colors = TIER_COLORS[card.tier] || TIER_COLORS[1];
              const canAfford = gold >= card.cost;

              return (
                <div
                  key={idx}
                  onClick={() => canAfford && onBuyCard(idx)}
                  className={`h-36 rounded-xl border-2 ${colors.border} bg-gradient-to-b ${colors.bg} relative overflow-hidden cursor-pointer group transition-all duration-200 shadow-md ${
                    canAfford
                      ? 'hover:scale-[1.03] hover:shadow-xl hover:ring-2 hover:ring-amber-400/40'
                      : 'opacity-50 grayscale cursor-not-allowed'
                  }`}
                >
                  {/* Full-Container Background Art / Character Visual */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <ChampionVisual
                      unitId={card.id}
                      avatarFallback={card.avatarUrl}
                      visualAssets={card.visualAssets}
                      mode="portrait"
                      alt={card.name}
                      className="w-full h-full p-2"
                      imageClassName="object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)] group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>

                  {/* Gradient overlays to guarantee maximum readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/70 pointer-events-none" />

                  {/* TOP ROW: Space-Between with mx-3 (Estrela na esquerda, Beli na direita) */}
                  <div className="absolute top-2 left-0 right-0 mx-3 flex items-center justify-between z-10 pointer-events-none">
                    {/* Estrela / Tier */}
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-950/80 border border-amber-500/30 shadow backdrop-blur-xs">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] font-black text-amber-300 font-mono">1★</span>
                    </div>

                    {/* Custo Beli */}
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-md ${colors.badge} shadow-md backdrop-blur-xs border border-white/10`}
                    >
                      {card.cost}฿
                    </span>
                  </div>

                  {/* LATERAL (LEFT): Sinergias em coluna vertical com ícones */}
                  <div className="absolute top-9 left-2.5 flex flex-col gap-1 z-10 pointer-events-none">
                    {card.traits.map((trait) => {
                      const synDef = SYNERGY_DATABASE[trait];
                      return (
                        <div
                          key={trait}
                          title={synDef?.name || trait}
                          className="w-5 h-5 rounded-md bg-slate-950/90 border border-slate-700/80 shadow flex items-center justify-center text-[10px] backdrop-blur-xs"
                          style={{
                            borderColor: synDef?.color ? `${synDef.color}60` : undefined,
                          }}
                        >
                          <span>{synDef?.icon || '⚔️'}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* BOTTOM: Nome colado no rodapé com fundo escurecido */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent px-2.5 py-1.5 z-10 border-t border-slate-800/60 pointer-events-none">
                    <h4 className={`text-xs font-black truncate text-center drop-shadow-md ${colors.text}`}>
                      {card.name}
                    </h4>
                    <p className="text-[9px] text-slate-400 truncate text-center leading-tight">
                      {card.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Action Buttons: Buy XP & Reroll */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            {/* Buy XP Button */}
            <button
              onClick={onBuyXp}
              disabled={gold < 4 || level >= 8}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                gold >= 4 && level < 8
                  ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-lg hover:scale-105'
                  : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>Comprar XP (+4 XP)</span>
              <span className="font-mono bg-blue-950/80 px-1.5 py-0.5 rounded text-blue-200">
                4฿ [F]
              </span>
            </button>

            {/* Current Gold in Shop */}
            <div className="text-center font-mono text-xs text-amber-300">
              Saldo: <span className="font-black text-amber-400">{gold}฿</span>
            </div>

            {/* Reroll Button */}
            <button
              onClick={onReroll}
              disabled={gold < 2}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                gold >= 2
                  ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-black border-amber-400 shadow-lg hover:scale-105'
                  : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Atualizar Loja (Reroll)</span>
              <span className="font-mono bg-amber-950/80 px-1.5 py-0.5 rounded text-amber-200">
                2฿ [D]
              </span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
