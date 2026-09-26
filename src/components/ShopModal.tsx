import React, { useState } from 'react';
import { UnitBaseData, UnitInstance } from '../types/game';
import {
  ShoppingBag,
  RefreshCw,
  ArrowUpCircle,
  Lock,
  Unlock,
  Sparkles,
  Star,
  ChevronUp,
  ChevronDown,
  Trash2,
  ArrowLeftCircle,
  X,
} from 'lucide-react';
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
  ownedUnits?: UnitInstance[];
  isPointerDragOverSell?: boolean;
}

const TIER_COLORS: Record<
  number,
  { border: string; bg: string; text: string; badge: string; glow: string; name: string }
> = {
  1: {
    border: 'border-slate-500/80',
    bg: 'from-slate-900 via-slate-950 to-slate-950',
    text: 'text-slate-100',
    badge: 'bg-slate-700 text-slate-100 border-slate-600',
    glow: 'shadow-[0_0_15px_rgba(148,163,184,0.25)]',
    name: 'Comum',
  },
  2: {
    border: 'border-emerald-500',
    bg: 'from-emerald-950/60 via-slate-950 to-slate-950',
    text: 'text-emerald-300',
    badge: 'bg-emerald-700 text-emerald-100 border-emerald-500',
    glow: 'shadow-[0_0_18px_rgba(16,185,129,0.35)]',
    name: 'Incomum',
  },
  3: {
    border: 'border-blue-500',
    bg: 'from-blue-950/60 via-slate-950 to-slate-950',
    text: 'text-blue-300',
    badge: 'bg-blue-700 text-blue-100 border-blue-500',
    glow: 'shadow-[0_0_18px_rgba(59,130,246,0.35)]',
    name: 'Raro',
  },
  4: {
    border: 'border-purple-500',
    bg: 'from-purple-950/60 via-slate-950 to-slate-950',
    text: 'text-purple-300',
    badge: 'bg-purple-700 text-purple-100 border-purple-500',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.35)]',
    name: 'Épico',
  },
  5: {
    border: 'border-amber-400',
    bg: 'from-amber-950/70 via-slate-950 to-slate-950',
    text: 'text-amber-300',
    badge: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black border-amber-300',
    glow: 'shadow-[0_0_25px_rgba(245,158,11,0.55)]',
    name: 'Lendário',
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
  ownedUnits = [],
  isPointerDragOverSell = false,
}) => {
  const [isDragOverSell, setIsDragOverSell] = useState(false);
  const currentOdds = SHOP_ODDS_BY_LEVEL[level] || [100, 0, 0, 0, 0];
  const sellValue = draggedUnit ? calculateUnitSellValue(draggedUnit) : 0;
  const isSellActive = isDragOverSell || isPointerDragOverSell;

  // Helper to count how many copies of a champion ID the player owns
  const getOwnedCopiesCount = (unitId: string): number => {
    return ownedUnits.filter((u) => u.unitId === unitId).length;
  };

  return (
    <div className="relative z-30 select-none w-[220px] h-[48px] shrink-0">
      {/* Dynamic Minimal Toggle Button OR Sell Area OR Return Button */}
      {isViewingOpponentArena ? (
        <button
          onClick={onReturnToPlayerArena}
          className="flex items-center justify-center gap-1.5 w-full h-full px-3 rounded-2xl font-black text-xs tracking-wider uppercase transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.5)] border-2 border-amber-400 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 cursor-pointer animate-bounce whitespace-nowrap"
        >
          <ArrowLeftCircle className="w-4 h-4 text-slate-950 shrink-0" />
          <span>Voltar</span>
        </button>
      ) : draggedUnit ? (
        <div
          data-sell-zone="true"
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
          className={`flex items-center justify-center gap-2 w-full h-full px-3 rounded-2xl font-black text-xs tracking-wide uppercase transition-all duration-200 shadow-2xl border cursor-pointer select-none ${
            isSellActive
              ? 'bg-rose-600/95 text-white border-rose-300 ring-4 ring-rose-400/50 shadow-[0_0_25px_rgba(244,63,94,0.8)]'
              : 'bg-rose-950/70 text-rose-300 border-rose-500/70 backdrop-blur-md'
          }`}
          title="Solte aqui para vender"
        >
          <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-[11px] font-bold">Vender</span>
          <span className="font-mono font-black text-amber-300 text-sm ml-0.5 shrink-0">+{sellValue}฿</span>
        </div>
      ) : (
        /* Floating Retractable Golden Shop Toggle Button with Saldo */
        <button
          data-modal-toggle="true"
          onClick={onToggleOpen}
          className={`flex items-center justify-between w-full h-full px-3 rounded-2xl font-bold text-xs tracking-wide transition-all duration-300 shadow-xl border backdrop-blur-md cursor-pointer select-none whitespace-nowrap relative ${
            isOpen
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
              : 'bg-slate-900/85 text-amber-300 border-amber-500/60 hover:border-amber-400 shadow-lg'
          }`}
          title={`Loja - Saldo Atual: ${gold}฿ (Atalho: D)`}
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="font-black uppercase tracking-wider">Loja [D]</span>
          </div>

          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border font-mono font-black text-xs shrink-0 ${
              isOpen
                ? 'bg-slate-950/20 text-slate-950 border-slate-950/30'
                : 'bg-amber-950/80 text-amber-300 border-amber-500/40 shadow-inner'
            }`}
          >
            <span className="text-[10px] font-medium opacity-75">Saldo:</span>
            <span>{gold}฿</span>
          </div>

          {isLocked && (
            <div
              className="flex items-center justify-center w-4 h-4 rounded-md bg-amber-500 text-slate-950 border border-amber-300 shadow shrink-0"
              title="Loja Travada"
            >
              <Lock className="w-2.5 h-2.5" />
            </div>
          )}

          <div className="flex items-center shrink-0 opacity-80">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </div>
        </button>
      )}

      {/* Expanded Shop Panel Drawer positioned on the right side above the bench with padding */}
      {isOpen && !isViewingOpponentArena && (
        <div
          data-modal-container="true"
          className="fixed bottom-20 sm:bottom-22 right-4 sm:right-6 w-[840px] max-w-[calc(100vw-32px)] bg-slate-950/95 border-2 border-amber-500/80 rounded-2xl p-3 sm:p-4 shadow-[0_0_40px_rgba(0,0,0,0.85)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200 ring-2 ring-amber-400/20 z-50"
        >
          {/* Shop Header Controls */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800 flex-wrap gap-2">
            {/* Left: Level & Odds */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs shadow-md">
                <span>Nível {level}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700" title="Tier 1 (1฿)">
                  T1: {currentOdds[0]}%
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-700" title="Tier 2 (2฿)">
                  T2: {currentOdds[1]}%
                </span>
                <span className="px-1.5 py-0.5 rounded bg-blue-950/90 text-blue-300 border border-blue-700" title="Tier 3 (3฿)">
                  T3: {currentOdds[2]}%
                </span>
                <span className="px-1.5 py-0.5 rounded bg-purple-950/90 text-purple-300 border border-purple-700" title="Tier 4 (4฿)">
                  T4: {currentOdds[3]}%
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-600 font-bold" title="Tier 5 (5฿)">
                  T5: {currentOdds[4]}%
                </span>
              </div>
            </div>

            {/* Right: Saldo, Lock Shop & Close Button */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/50 text-amber-300 font-mono font-black text-xs shadow-inner">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400/80">Saldo:</span>
                <span className="text-amber-300 text-sm">{gold}฿</span>
              </div>

              <button
                onClick={onToggleLock}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  isLocked
                    ? 'bg-amber-500/25 text-amber-300 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600'
                }`}
                title={isLocked ? 'Loja Travada: não atualizará automaticamente' : 'Travar loja para a próxima rodada'}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{isLocked ? 'Travada' : 'Travar'}</span>
              </button>

              <button
                onClick={onToggleOpen}
                className="p-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors border border-slate-800 ml-1"
                title="Fechar Loja"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* If unit is being dragged with shop open, show minimal sell target */}
          {draggedUnit && (
            <div
              data-sell-zone="true"
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
                  ? 'bg-rose-600/90 border-rose-300 text-white ring-4 ring-rose-400/50'
                  : 'bg-rose-950/40 border-rose-500/60 text-amber-300'
              }`}
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span className="text-sm font-black tracking-wider text-slate-200">
                Solte para vender {draggedUnit.name}:
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black font-mono shadow-md text-sm">
                +{sellValue}฿
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
                    className="h-40 rounded-xl border border-dashed border-slate-800/80 bg-slate-950/40 flex flex-col items-center justify-center text-slate-600 text-xs font-mono"
                  >
                    <span className="text-slate-600 font-bold">Comprado</span>
                  </div>
                );
              }

              const colors = TIER_COLORS[card.tier] || TIER_COLORS[1];
              const canAfford = gold >= card.cost;
              const ownedCopies = getOwnedCopiesCount(card.id);

              return (
                <div
                  key={idx}
                  onClick={() => canAfford && onBuyCard(idx)}
                  className={`h-40 rounded-xl border-2 ${colors.border} bg-gradient-to-b ${colors.bg} relative overflow-hidden cursor-pointer group transition-all duration-200 shadow-lg ${
                    canAfford
                      ? `hover:scale-[1.03] hover:shadow-2xl hover:ring-2 hover:ring-amber-400/50 ${colors.glow}`
                      : 'opacity-40 grayscale cursor-not-allowed'
                  }`}
                  title={`${card.name} (${card.cost}฿) - Clique para comprar`}
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
                      imageClassName="object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)] group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>

                  {/* Gradient overlays to guarantee maximum readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/75 pointer-events-none" />

                  {/* TOP ROW: Space-Between (Estrela/Tier na esquerda, Custo Beli na direita) */}
                  <div className="absolute top-2 left-0 right-0 mx-2.5 flex items-center justify-between z-10 pointer-events-none">
                    {/* Estrela / Tier */}
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-950/85 border border-amber-500/40 shadow backdrop-blur-xs">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] font-black text-amber-300 font-mono">1★</span>
                    </div>

                    {/* Custo Beli */}
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-md ${colors.badge} shadow-md backdrop-blur-xs border border-white/10 font-mono`}
                    >
                      {card.cost}฿
                    </span>
                  </div>

                  {/* LATERAL (LEFT): Sinergias em coluna vertical somente com os ícones */}
                  <div className="absolute top-9 left-2 flex flex-col gap-1 z-10 pointer-events-none">
                    {card.traits.map((trait) => {
                      const synDef = SYNERGY_DATABASE[trait];
                      return (
                        <div
                          key={trait}
                          title={synDef?.name || trait}
                          className="w-5 h-5 rounded-md bg-slate-950/90 border border-slate-700/80 shadow flex items-center justify-center backdrop-blur-xs"
                          style={{
                            borderColor: synDef?.color ? `${synDef.color}90` : undefined,
                            backgroundColor: synDef?.color ? `${synDef.color}25` : undefined,
                          }}
                        >
                          <span className="text-xs leading-none select-none">{synDef?.icon || '⚔️'}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Owned Count Badge (if player already owns 1+ copies) */}
                  {ownedCopies > 0 && (
                    <div
                      className={`absolute bottom-10 inset-x-2 py-0.5 rounded-md text-[8.5px] font-black text-center z-10 pointer-events-none border backdrop-blur-xs flex items-center justify-center gap-1 shadow ${
                        ownedCopies >= 2
                          ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse'
                          : 'bg-slate-900/90 text-amber-300 border-amber-500/50'
                      }`}
                    >
                      <Sparkles className="w-2.5 h-2.5 shrink-0" />
                      <span>{ownedCopies >= 2 ? `Possui ${ownedCopies}x • UP 2★!` : `Possui ${ownedCopies}x`}</span>
                    </div>
                  )}

                  {/* BOTTOM: Nome colado no rodapé com fundo escurecido */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent px-2 py-1.5 z-10 border-t border-slate-800/60 pointer-events-none">
                    <h4 className={`text-xs font-black truncate text-center drop-shadow-md ${colors.text}`}>
                      {card.name}
                    </h4>
                    <p className="text-[8.5px] text-slate-400 truncate text-center leading-tight">
                      {card.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Action Buttons: Buy XP & Reroll */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 flex-wrap gap-2">
            {/* Buy XP Button with Progress */}
            <div className="flex items-center gap-3">
              <button
                onClick={onBuyXp}
                disabled={gold < 4 || level >= 8}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  gold >= 4 && level < 8
                    ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-lg hover:scale-102 active:scale-98'
                    : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                }`}
                title="Comprar XP para subir de nível (Atalho: F)"
              >
                <ArrowUpCircle className="w-4 h-4 text-blue-200" />
                <span>Comprar XP (+4 XP)</span>
                <span className="font-mono bg-blue-950/90 px-1.5 py-0.5 rounded text-blue-200 text-[11px] font-black">
                  4฿ [F]
                </span>
              </button>

              {/* Compact XP bar */}
              <div className="hidden sm:flex flex-col gap-0.5 text-[10px] font-mono text-slate-400">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-amber-300">Nv.{level}</span>
                  <span>({xp}/{xpNeeded} XP)</span>
                </div>
                <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (xp / (xpNeeded || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Current Gold in Shop */}
            <div className="text-center font-mono text-xs text-amber-300 flex items-center gap-1">
              <span>Saldo:</span>
              <span className="font-black text-amber-400 text-sm">{gold}฿</span>
            </div>

            {/* Reroll Button */}
            <button
              onClick={onReroll}
              disabled={gold < 2}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                gold >= 2
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black border-amber-300 shadow-lg hover:scale-102 active:scale-98'
                  : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
              }`}
              title="Atualizar cartas da loja (Atalho: D)"
            >
              <RefreshCw className="w-4 h-4 text-slate-950" />
              <span>Atualizar Loja (Reroll)</span>
              <span className="font-mono bg-amber-950/80 px-1.5 py-0.5 rounded text-amber-200 text-[11px] font-black">
                2฿ [D]
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

