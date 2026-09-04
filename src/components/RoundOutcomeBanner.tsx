import React from 'react';
import { Trophy, Skull, Scale, Sparkles, Loader2, Coins } from 'lucide-react';
import { Commander } from '../types/game';

interface RoundOutcomeBannerProps {
  outcome: 'VICTORY' | 'DEFEAT' | 'DRAW' | null;
  roundStage: string;
  roundTitle: string;
  income: {
    base: number;
    interest: number;
    streak: number;
    win: number;
    total: number;
  };
  damageTaken?: number;
  commanders: Commander[];
  isAllBattlesFinished: boolean;
}

export const RoundOutcomeBanner: React.FC<RoundOutcomeBannerProps> = ({
  outcome,
  roundStage,
  roundTitle,
  income,
  damageTaken = 0,
  commanders,
  isAllBattlesFinished,
}) => {
  if (!outcome) return null;

  const aliveCommanders = commanders.filter((c) => !c.isEliminated);
  const fightingCount = aliveCommanders.filter(
    (c) => !c.roundCombatStatus || c.roundCombatStatus === 'FIGHTING'
  ).length;

  const isWin = outcome === 'VICTORY';
  const isDraw = outcome === 'DRAW';

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none max-w-xl w-[94%] sm:w-auto animate-in fade-in slide-in-from-top-3 duration-300">
      <div
        className={`relative overflow-hidden rounded-2xl border-2 p-3.5 backdrop-blur-md shadow-2xl transition-all duration-300 ${
          isWin
            ? 'bg-gradient-to-r from-slate-950/95 via-amber-950/90 to-slate-950/95 border-amber-400 shadow-amber-500/30'
            : isDraw
            ? 'bg-gradient-to-r from-slate-950/95 via-amber-950/90 to-slate-950/95 border-yellow-500/80 shadow-yellow-500/20'
            : 'bg-gradient-to-r from-slate-950/95 via-rose-950/90 to-slate-950/95 border-rose-500 shadow-rose-500/30'
        }`}
      >
        <div className="flex items-center gap-3.5">
          {/* Icon Badge */}
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
              isWin
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : isDraw
                ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300'
                : 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.5)]'
            }`}
          >
            {isWin ? (
              <Trophy className="w-6 h-6 animate-bounce" />
            ) : isDraw ? (
              <Scale className="w-6 h-6" />
            ) : (
              <Skull className="w-6 h-6 animate-pulse" />
            )}
          </div>

          {/* Text & Economy Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3
                className={`text-sm sm:text-base font-black tracking-wide ${
                  isWin
                    ? 'text-amber-300'
                    : isDraw
                    ? 'text-yellow-300'
                    : 'text-rose-400'
                }`}
              >
                {isWin
                  ? `VITÓRIA NO ROUND ${roundStage}!`
                  : isDraw
                  ? `EMPATE NO ROUND ${roundStage}`
                  : `DERROTA NO ROUND ${roundStage}`}
              </h3>

              {/* Gold & XP Tag */}
              <div className="flex items-center gap-1 bg-black/50 border border-amber-500/40 px-2 py-0.5 rounded-lg text-xs font-mono font-bold text-amber-300">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span>+{income.total}฿</span>
                <span className="text-slate-400 font-normal">|</span>
                <span className="text-blue-300">+4 XP</span>
              </div>
            </div>

            {/* Sub details: Breakdown & Arena Status */}
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-300 gap-2">
              <div className="flex items-center gap-2 truncate">
                <span>Base: +{income.base}฿</span>
                {income.interest > 0 && <span>Juros: +{income.interest}฿</span>}
                {income.streak > 0 && <span>Sequência: +{income.streak}฿</span>}
                {isWin && <span className="text-emerald-400 font-semibold">Vitória: +1฿</span>}
                {!isWin && damageTaken > 0 && (
                  <span className="text-rose-400 font-bold">(-{damageTaken} HP)</span>
                )}
              </div>

              {/* Lobby Waiting Status */}
              <div className="flex items-center gap-1 shrink-0 font-medium">
                {isAllBattlesFinished ? (
                  <span className="text-emerald-300 font-bold flex items-center gap-1 text-[10px]">
                    <Sparkles className="w-3 h-3 text-amber-300 animate-spin" />
                    Iniciando próxima fase...
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                    <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                    {fightingCount > 0 ? `${fightingCount} lutas restantes...` : 'Finalizando...'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
