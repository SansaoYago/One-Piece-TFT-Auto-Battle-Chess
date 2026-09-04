import React, { useState } from 'react';
import { Commander } from '../types/game';
import { Crown, Flame, Heart, Skull, ChevronLeft, ChevronRight, Check, X, Swords, Scale } from 'lucide-react';

interface PlayerListProps {
  commanders: Commander[];
  viewingCommanderId: string;
  onSelectCommander: (commanderId: string) => void;
  isInitiallyCollapsed?: boolean;
  gamePhase?: 'PREPARATION' | 'COMBAT';
}

export const PlayerList: React.FC<PlayerListProps> = ({
  commanders,
  viewingCommanderId,
  onSelectCommander,
  isInitiallyCollapsed = true,
  gamePhase = 'PREPARATION',
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(isInitiallyCollapsed);

  const aliveCount = commanders.filter((c) => c.hp > 0).length;
  const humanCmd = commanders.find((c) => c.isHuman);

  return (
    <div className="relative h-full flex items-start select-none">
      {/* 1. Trigger / Restore Button (Shown when collapsed) */}
      {isCollapsed ? (
        <button
          onClick={() => setIsCollapsed(false)}
          className="group flex flex-col items-center gap-1.5 p-2 bg-slate-950/85 hover:bg-slate-900 border border-amber-500/40 hover:border-amber-400 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-200 cursor-pointer hover:scale-105"
          title="Abrir Lista de Comandantes"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:text-amber-300 group-hover:bg-amber-500/25 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[9px] font-black text-amber-300 font-mono">
              {aliveCount}/{commanders.length}
            </span>
          </div>
          {humanCmd && (
            <div className="mt-1 w-full flex flex-col items-center pt-1 border-t border-slate-800">
              <span className="text-[8px] font-mono text-slate-400">HP</span>
              <span className={`text-[10px] font-black font-mono ${humanCmd.hp > 50 ? 'text-emerald-400' : humanCmd.hp > 20 ? 'text-amber-400' : 'text-rose-400'}`}>
                {humanCmd.hp}
              </span>
            </div>
          )}
        </button>
      ) : (
        /* 2. Full Expanded Sidepanel */
        <aside className="w-60 bg-slate-950/85 border border-slate-700/60 backdrop-blur-md rounded-2xl flex flex-col p-2.5 select-none z-20 shadow-2xl overflow-y-auto h-full animate-in fade-in slide-in-from-left-4 duration-200">
          {/* Section Header with Collapse Button */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
            <span className="text-xs font-black tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              Comandantes
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-mono font-bold">
                {aliveCount}/{commanders.length}
              </span>
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                title="Recolher para a esquerda"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 8 Commander Cards List */}
          <div className="space-y-2 flex-1">
            {commanders.map((cmd) => {
              const hpPercent = Math.max(0, (cmd.hp / cmd.maxHp) * 100);
              const isAlive = cmd.hp > 0;
              const isViewing = cmd.id === viewingCommanderId;
              const hpColorClass =
                hpPercent > 50
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : hpPercent > 20
                  ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                  : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';

              const status = cmd.roundCombatStatus;

              return (
                <div
                  key={cmd.id}
                  onClick={() => onSelectCommander(cmd.id)}
                  className={`relative rounded-xl p-2.5 border transition-all duration-200 cursor-pointer ${
                    isViewing
                      ? 'bg-gradient-to-r from-amber-950/70 via-slate-900/90 to-slate-900/90 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] ring-2 ring-amber-400 scale-[1.02]'
                      : cmd.isHuman
                      ? 'bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-slate-900/90 border-amber-500/40 hover:border-amber-400 hover:scale-[1.01]'
                      : isAlive
                      ? 'bg-slate-900/70 border-slate-800/90 hover:border-amber-500/50 hover:bg-slate-850 hover:scale-[1.01]'
                      : 'bg-slate-950/50 border-slate-900 opacity-40 grayscale cursor-not-allowed'
                  }`}
                  title={
                    cmd.isHuman
                      ? 'Sua arena (Clique para retornar)'
                      : `Espionar a arena de ${cmd.name}`
                  }
                >
                  {/* Top Row: Rank, Avatar, Name & Level */}
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg flex-shrink-0 drop-shadow">
                        {cmd.avatar}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          {cmd.isHuman && (
                            <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                          )}
                          <span
                            className={`text-xs font-bold truncate block ${
                              cmd.isHuman ? 'text-amber-200' : 'text-slate-100'
                            }`}
                          >
                            {cmd.name}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 block truncate">
                          {cmd.title}
                        </span>
                      </div>
                    </div>

                    {/* Level & Win/Loss Streak */}
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                        Lv.{cmd.level}
                      </span>
                      {cmd.winStreak > 1 && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-400 mt-0.5">
                          <Flame className="w-2.5 h-2.5 fill-amber-400" />
                          {cmd.winStreak}W
                        </span>
                      )}
                      {!isAlive && (
                        <span className="flex items-center gap-0.5 text-[8px] font-bold text-rose-400 mt-0.5">
                          <Skull className="w-2.5 h-2.5 text-rose-400" /> Eliminado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Combat Round Status Indicator (Positivo para quem ganhou, X para quem perdeu) */}
                  {gamePhase === 'COMBAT' && isAlive && status && (
                    <div className="mb-1.5">
                      {status === 'WON' ? (
                        <div className="flex items-center justify-between bg-emerald-950/80 border border-emerald-500/60 px-2 py-0.5 rounded-lg text-emerald-300 font-bold text-[10px] shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-in fade-in">
                          <span className="flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                            <span>Vitória</span>
                          </span>
                          <span className="text-[9px] text-emerald-400/90 font-mono font-black">+1฿</span>
                        </div>
                      ) : status === 'LOST' ? (
                        <div className="flex items-center justify-between bg-rose-950/80 border border-rose-500/60 px-2 py-0.5 rounded-lg text-rose-300 font-bold text-[10px] shadow-[0_0_8px_rgba(244,63,94,0.3)] animate-in fade-in">
                          <span className="flex items-center gap-1">
                            <X className="w-3.5 h-3.5 text-rose-400 stroke-[3]" />
                            <span>Derrota</span>
                          </span>
                          {cmd.damageTakenThisRound ? (
                            <span className="text-[9px] text-rose-400 font-mono font-black">
                              -{cmd.damageTakenThisRound} HP
                            </span>
                          ) : null}
                        </div>
                      ) : status === 'DRAW' ? (
                        <div className="flex items-center justify-between bg-amber-950/80 border border-amber-500/60 px-2 py-0.5 rounded-lg text-amber-300 font-bold text-[10px] animate-in fade-in">
                          <span className="flex items-center gap-1">
                            <Scale className="w-3.5 h-3.5 text-amber-400" />
                            <span>Empate</span>
                          </span>
                          {cmd.damageTakenThisRound ? (
                            <span className="text-[9px] text-amber-400 font-mono font-black">
                              -{cmd.damageTakenThisRound} HP
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 px-2 py-0.5 rounded-lg text-slate-300 font-medium text-[9px]">
                          <Swords className="w-3 h-3 text-amber-400 animate-pulse" />
                          <span className="truncate">Lutando...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dynamic Health Bar */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="flex items-center gap-1 text-slate-400 text-[9px]">
                        <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />
                        Vida
                      </span>
                      <span
                        className={`font-bold text-[10px] ${
                          isAlive ? 'text-slate-200' : 'text-slate-500'
                        }`}
                      >
                        {cmd.hp}/{cmd.maxHp}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                      <div
                        className={`h-full ${hpColorClass} transition-all duration-300 rounded-full`}
                        style={{ width: `${hpPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      )}
    </div>
  );
};
