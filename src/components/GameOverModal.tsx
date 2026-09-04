import React from 'react';
import { RotateCcw, Eye, Trophy, Skull } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  userRank: number;
  totalRound: number;
  onRestart: () => void;
  onSpectate: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  userRank,
  totalRound,
  onRestart,
  onSpectate,
}) => {
  if (!isOpen) return null;

  const rankTitles: Record<number, string> = {
    1: 'Rei dos Piratas 👑',
    2: 'Vice-Campeão da Grand Line 🥈',
    3: 'Supernova Lendário 🥉',
    4: 'Pirata Notável do Novo Mundo',
    5: 'Capitão Destemido',
    6: 'Aventureiro dos Mares',
    7: 'Recruta Pirata',
    8: 'Naufragado no East Blue',
  };

  const title = rankTitles[userRank] || 'Pirata Combatente';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-500 select-none">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-rose-500/80 rounded-3xl p-6 shadow-[0_0_80px_rgba(244,63,94,0.35)] flex flex-col items-center text-center">
        
        {/* Top Glow & Game Over Image */}
        <div className="relative mb-4 flex items-center justify-center">
          <div className="absolute inset-0 bg-rose-500/20 rounded-2xl blur-xl" />
          <img
            src="/gameOver.png"
            alt="Game Over"
            className="relative w-48 h-auto object-contain rounded-xl shadow-2xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] border border-rose-500/40"
            onError={(e) => {
              // Fallback if image fails to render
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {/* Rank Placement Badge */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-300 font-mono font-bold text-xs uppercase tracking-wider mb-2">
          <Skull className="w-4 h-4 text-rose-400" />
          <span>Eliminado em {userRank}º Lugar</span>
        </div>

        <h3 className="text-2xl font-black text-slate-100 tracking-wide mb-1">
          {title}
        </h3>
        <p className="text-xs text-slate-400 max-w-xs mb-6">
          Sua jornada pelo One Piece terminou na Rodada {totalRound}. Deseja reiniciar ou continuar assistindo a disputa pelo trono?
        </p>

        {/* 2 Primary Action Buttons: Voltar / Novo Jogo & Assistir */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={onRestart}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Voltar / Novo Jogo</span>
          </button>

          <button
            onClick={onSpectate}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-500 font-bold text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>Assistir Batalha</span>
          </button>
        </div>

      </div>
    </div>
  );
};
