import React from 'react';
import { RotateCcw, Eye, Trophy, Skull, Crown, Sparkles } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  userRank?: number;
  playerRank?: number;
  totalRound?: number;
  onRestart: () => void;
  onSpectate: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  userRank,
  playerRank,
  totalRound = 1,
  onRestart,
  onSpectate,
}) => {
  if (!isOpen) return null;

  const currentRank = userRank ?? playerRank ?? 1;
  const isVictory = currentRank === 1;

  const rankTitles: Record<number, string> = {
    1: '👑 Rei dos Piratas',
    2: 'Vice-Campeão da Grand Line 🥈',
    3: 'Supernova Lendário 🥉',
    4: 'Pirata Notável do Novo Mundo',
    5: 'Capitão Destemido',
    6: 'Aventureiro dos Mares',
    7: 'Recruta Pirata',
    8: 'Naufragado no East Blue',
  };

  const title = rankTitles[currentRank] || (isVictory ? '👑 Rei dos Piratas' : 'Pirata Combatente');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-500 select-none">
      <div
        className={`relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 rounded-3xl p-6 flex flex-col items-center text-center ${
          isVictory
            ? 'border-amber-400 shadow-[0_0_90px_rgba(245,158,11,0.5)]'
            : 'border-rose-500/80 shadow-[0_0_80px_rgba(244,63,94,0.35)]'
        }`}
      >
        {/* Top Graphic: Crown / Trophy for Victory or GameOver image for Defeat */}
        {isVictory ? (
          <div className="relative mb-5 flex flex-col items-center justify-center">
            <div className="absolute inset-0 bg-amber-500/25 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-0.5 shadow-2xl flex items-center justify-center mb-2">
              <div className="w-full h-full rounded-[22px] bg-slate-950 flex items-center justify-center text-5xl">
                👑
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-amber-300 font-mono text-xs uppercase tracking-widest font-black">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>Conquista Suprema</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            </div>
          </div>
        ) : (
          <div className="relative mb-4 flex items-center justify-center">
            <div className="absolute inset-0 bg-rose-500/20 rounded-2xl blur-xl" />
            <img
              src="/gameOver.png"
              alt="Game Over"
              className="relative w-48 h-auto object-contain rounded-xl shadow-2xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] border border-rose-500/40"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Placement Badge */}
        <div
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono font-bold text-xs uppercase tracking-wider mb-2 ${
            isVictory
              ? 'bg-amber-950/90 border border-amber-400/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
          }`}
        >
          {isVictory ? (
            <>
              <Crown className="w-4 h-4 text-amber-400" />
              <span>1º Lugar • O Lendário Campeão</span>
            </>
          ) : (
            <>
              <Skull className="w-4 h-4 text-rose-400" />
              <span>Eliminado em {currentRank}º Lugar</span>
            </>
          )}
        </div>

        {/* Main Title */}
        <h3
          className={`text-2xl sm:text-3xl font-black tracking-wide mb-2 ${
            isVictory ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500' : 'text-slate-100'
          }`}
        >
          {isVictory ? 'Parabéns, você se tornou o Rei dos Piratas!' : title}
        </h3>

        {/* Subtitle / Description */}
        <p className="text-xs text-slate-300 max-w-sm mb-6 leading-relaxed">
          {isVictory
            ? `Você derrotou todos os Supernovas adversários na Batalha ${totalRound} e conquistou o topo dos mares! O One Piece e o mundo agora pertencem a você.`
            : `Sua jornada pelo One Piece terminou na Rodada ${totalRound}. Deseja reiniciar ou continuar assistindo a disputa pelo trono?`}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={onRestart}
            className={`w-full py-3.5 px-6 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
              isVictory
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.6)]'
                : 'sm:flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isVictory ? 'Jogar Novamente' : 'Voltar / Novo Jogo'}</span>
          </button>

          {!isVictory && (
            <button
              onClick={onSpectate}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-500 font-bold text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>Assistir Batalha</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

