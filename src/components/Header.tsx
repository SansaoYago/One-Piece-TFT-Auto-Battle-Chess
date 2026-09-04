import React from 'react';
import { GamePhase } from '../types/game';
import { Shield, Swords, RefreshCw, Play, Pause, AlertTriangle, Eye, FlaskConical, RotateCcw, Trash2, Zap } from 'lucide-react';

interface HeaderProps {
  phase: GamePhase;
  isCombatStarting?: boolean;
  combatWarmupCount?: number;
  countdown: number;
  totalTime: number; // in seconds
  roundNumber: number;
  isPaused: boolean;
  isViewingOpponentArena?: boolean;
  opponentName?: string;
  isTestMode?: boolean;
  onTogglePause: () => void;
  onResetTimer: () => void;
  onTogglePhase: () => void;
  onToggleTestMode: () => void;
  onClearBoard?: () => void;
  onQuickDuel?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  phase,
  isCombatStarting = false,
  combatWarmupCount = 3,
  countdown,
  totalTime,
  roundNumber,
  isPaused,
  isViewingOpponentArena = false,
  opponentName = 'Oponente',
  isTestMode = false,
  onTogglePause,
  onResetTimer,
  onTogglePhase,
  onToggleTestMode,
  onClearBoard,
  onQuickDuel,
}) => {
  const isOvertime = countdown <= 15 && phase === 'COMBAT';
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="relative z-30 w-full bg-slate-950/95 border-b border-amber-900/40 backdrop-blur-md px-4 py-2 text-slate-100 select-none shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left Side */}
        <div className="flex items-center gap-3">
          {!isTestMode ? (
            /* Game Mode: Clock & Battle Number Only (1, 2, 3...) */
            <div className="flex items-center gap-2.5 bg-slate-900/90 border border-amber-500/30 rounded-xl px-3 py-1.5 shadow-inner">
              <span className="text-xs font-mono text-amber-400 font-semibold tracking-wider">
                {formatTime(totalTime)}
              </span>
              <div className="w-px h-4 bg-slate-700" />
              <span className="text-xs font-black text-amber-300 uppercase tracking-wide">
                Batalha {roundNumber}
              </span>
            </div>
          ) : (
            /* Test Mode Badge & Return Button */
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/50 rounded-xl px-3 py-1.5 shadow-inner text-emerald-300 font-black text-xs">
                <FlaskConical className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Modo de Testes</span>
              </div>
              <button
                onClick={onToggleTestMode}
                title="Voltar para o jogo e reiniciar"
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all bg-slate-900 hover:bg-slate-800 border-rose-500/50 text-rose-300 hover:text-rose-200 cursor-pointer shadow-md hover:scale-105"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Voltar ao Jogo (Reiniciar)</span>
              </button>
            </div>
          )}
        </div>

        {/* Center: Test Mode Centralized Switch OR Game Mode Timer */}
        <div className="flex flex-col items-center">
          {isTestMode ? (
            /* Test Mode Centralized Prep <-> Combat Switch */
            <div className="flex items-center gap-3">
              <button
                onClick={onTogglePhase}
                className={`flex items-center gap-2.5 px-5 py-2 rounded-2xl font-black text-sm transition-all duration-200 shadow-xl cursor-pointer hover:scale-105 border ${
                  phase === 'PREPARATION'
                    ? 'bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 bg-pos-0 hover:bg-pos-100 text-white border-amber-400 shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                }`}
              >
                {phase === 'PREPARATION' ? (
                  <>
                    <Swords className="w-4 h-4 text-amber-200 animate-bounce" />
                    <span>INICIAR MODO COMBATE</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 text-blue-200" />
                    <span>VOLTAR AO MODO PRÉ-BATALHA</span>
                  </>
                )}
              </button>
              <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300">
                {phase === 'PREPARATION' ? '🛡️ Pré-Batalha' : '⚔️ Combate'}
              </span>
            </div>
          ) : (
            /* Normal Game Mode: Phase Badge & Countdown */
            <>
              <div className="flex items-center gap-2 mb-0.5">
                {phase === 'PREPARATION' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40 animate-pulse">
                    <Shield className="w-3.5 h-3.5" />
                    FASE DE PREPARAÇÃO
                  </span>
                ) : isCombatStarting ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/30 text-amber-300 border border-amber-500 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                    <Swords className="w-3.5 h-3.5 animate-spin" />
                    {combatWarmupCount > 0 ? `PREPARAR PARA BATALHA (${combatWarmupCount}s)` : '🔥 LUTEM!'}
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border transition-all ${
                    isOvertime
                      ? 'bg-rose-500/30 text-rose-300 border-rose-500 animate-bounce'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  }`}>
                    <Swords className="w-3.5 h-3.5" />
                    {isOvertime ? '⚡ OVERTIME (FRENESI 2X)' : 'FASE DE BATALHA'}
                  </span>
                )}
              </div>

              {/* Timer Display */}
              <div className="flex items-center gap-2">
                <div
                  className={`relative px-4 py-0.5 rounded-lg border flex items-center justify-center font-mono font-black text-lg tracking-wider transition-all duration-300 ${
                    isOvertime
                      ? 'bg-rose-950/80 border-rose-500 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse'
                      : countdown <= 15
                      ? 'bg-amber-950/70 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'bg-slate-900/90 border-slate-700 text-amber-400'
                  }`}
                >
                  {isOvertime && (
                    <AlertTriangle className="w-4 h-4 mr-1.5 text-rose-400 animate-spin" />
                  )}
                  <span>{countdown.toString().padStart(2, '0')}s</span>
                </div>

                {/* Timer Pause/Play */}
                <button
                  onClick={onTogglePause}
                  title={isPaused ? 'Continuar Cronômetro' : 'Pausar Cronômetro'}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={onResetTimer}
                  title="Resetar para 30s"
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Side: Mode Toggle Button or Opponent View */}
        <div className="flex items-center gap-2.5">
          {isViewingOpponentArena ? (
            <div className="flex items-center gap-2 bg-slate-900/95 border border-cyan-500/50 rounded-xl px-3.5 py-1.5 shadow-lg backdrop-blur-md">
              <Eye className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                Espionando: {opponentName}
              </span>
            </div>
          ) : !isTestMode ? (
            /* Game Mode: Button to Switch to Test Mode */
            <button
              onClick={onToggleTestMode}
              title="Entrar no modo de testes de animações e personagens"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-amber-500/60 bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-900/50 text-amber-300 hover:text-amber-200 hover:border-amber-400 shadow-md hover:scale-105 transition-all cursor-pointer text-xs font-bold"
            >
              <FlaskConical className="w-4 h-4 text-amber-400" />
              <span>Modo de Testes</span>
            </button>
          ) : (
            /* Test Mode Quick Actions */
            <div className="flex items-center gap-2">
              {onQuickDuel && (
                <button
                  onClick={onQuickDuel}
                  title="Carregar duelo rápido de 3 contra 3 para testar"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/50 bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold cursor-pointer transition-all hover:scale-105"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Duelo Rápido</span>
                </button>
              )}
              {onClearBoard && (
                <button
                  onClick={onClearBoard}
                  title="Limpar todos os personagens da arena"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-rose-300 text-xs font-bold cursor-pointer transition-all hover:scale-105"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Campo</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

