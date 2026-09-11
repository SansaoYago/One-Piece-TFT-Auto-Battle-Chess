import React from 'react';
import { GameDifficulty, DIFFICULTY_CONFIGS } from '../types/game';
import { Shield, Lock, RotateCcw, Check, Sparkles, AlertCircle, Trophy, Flame } from 'lucide-react';

interface DifficultyModalProps {
  isOpen: boolean;
  currentDifficulty: GameDifficulty;
  isLocked: boolean;
  onSelectDifficulty: (difficulty: GameDifficulty) => void;
  onClose: () => void;
  onRestartGame: () => void;
}

export const DifficultyModal: React.FC<DifficultyModalProps> = ({
  isOpen,
  currentDifficulty,
  isLocked,
  onSelectDifficulty,
  onClose,
  onRestartGame,
}) => {
  if (!isOpen) return null;

  const currentConfig = DIFFICULTY_CONFIGS[currentDifficulty];

  return (
    <div
      id="difficulty-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="difficulty-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-3xl bg-slate-900/95 border-2 border-amber-500/40 p-6 sm:p-8 shadow-2xl text-slate-100 flex flex-col gap-6 ring-1 ring-white/10 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-amber-300 tracking-wide flex items-center gap-2">
                Nível de Dificuldade
                {isLocked && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-950 border border-rose-500/50 text-rose-300 font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Bloqueado nesta Partida
                  </span>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Escolha o ritmo de economia e a letalidade dos piratas e marinheiros adversários.
              </p>
            </div>
          </div>
          <button
            id="difficulty-modal-close-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg font-mono p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Locked Notice Banner */}
        {isLocked && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-start gap-3 shadow-inner">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-rose-300">
                A dificuldade atual está travada em {currentConfig.name.toUpperCase()}!
              </p>
              <p className="text-slate-300 mt-1 leading-relaxed text-xs">
                Para manter a integridade dos seus resultados e conquistas (evitando vencer batalhas no Fácil e trocar no final), a dificuldade só pode ser alterada ao iniciar uma nova partida.
              </p>
            </div>
          </div>
        )}

        {/* Difficulty Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {(['easy', 'medium', 'hard'] as GameDifficulty[]).map((diffKey) => {
            const config = DIFFICULTY_CONFIGS[diffKey];
            const isSelected = currentDifficulty === diffKey;

            return (
              <div
                key={diffKey}
                id={`difficulty-option-${diffKey}`}
                onClick={() => {
                  if (!isLocked) {
                    onSelectDifficulty(diffKey);
                  }
                }}
                className={`relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 select-none ${
                  isSelected
                    ? `${config.bgColor} ${config.borderColor} shadow-lg ring-2 ring-amber-400/40 scale-[1.02]`
                    : isLocked
                    ? 'bg-slate-950/40 border-slate-800 opacity-60 cursor-not-allowed'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/90 cursor-pointer hover:scale-[1.01]'
                }`}
              >
                {/* Active check pill */}
                {isSelected && (
                  <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ativo
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-base font-black ${config.color} tracking-wide`}>
                      {config.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-700/80 text-slate-300 font-bold">
                      {config.badge}
                    </span>
                  </div>

                  <p className="text-[11px] font-semibold text-slate-300 mb-3">
                    {config.tag}
                  </p>

                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                    {config.description}
                  </p>
                </div>

                {/* Stat Breakdown */}
                <div className="space-y-1.5 pt-3 border-t border-slate-800/80 text-[11px]">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Ouro Base:</span>
                    <span className="font-bold text-amber-400 font-mono">+{config.baseIncome}฿</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Bônus Vitória:</span>
                    <span className="font-bold text-emerald-400 font-mono">+{config.winBonus}฿</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Vida Inimiga:</span>
                    <span className={`font-bold font-mono ${config.enemyHpMultiplier > 1 ? 'text-rose-400' : config.enemyHpMultiplier < 1 ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {Math.round(config.enemyHpMultiplier * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Dano Inimigo:</span>
                    <span className={`font-bold font-mono ${config.enemyAdMultiplier > 1 ? 'text-rose-400' : config.enemyAdMultiplier < 1 ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {Math.round(config.enemyAdMultiplier * 100)}%
                    </span>
                  </div>
                </div>

                {/* Action button inside card if not locked */}
                {!isLocked && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDifficulty(diffKey);
                    }}
                    className={`mt-4 w-full py-1.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {isSelected ? 'Selecionado' : 'Escolher'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
          {isLocked ? (
            <>
              <button
                id="difficulty-restart-game-btn"
                onClick={() => {
                  onRestartGame();
                  onClose();
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer hover:scale-105"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reiniciar Partida com Nova Dificuldade</span>
              </button>
              <button
                id="difficulty-continue-btn"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
              >
                Continuar Partida Atual
              </button>
            </>
          ) : (
            <>
              <span className="text-xs text-slate-400">
                Dificuldade selecionada: <strong className="text-amber-300">{currentConfig.name}</strong> ({currentConfig.summary})
              </span>
              <button
                id="difficulty-confirm-btn"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer hover:scale-105"
              >
                Confirmar e Jogar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
