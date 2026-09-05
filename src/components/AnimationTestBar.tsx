import React from 'react';
import { UnitInstance } from '../types/game';
import { Sparkles, Star, Swords, Shield, Trash2, ArrowLeftRight } from 'lucide-react';

interface AnimationTestBarProps {
  selectedUnit: UnitInstance | null;
  currentAnimation: string | null;
  onTriggerAnimation: (anim: string) => void;
  onSetStars: (stars: number) => void;
  onToggleTeam?: () => void;
  onRemoveUnit?: () => void;
  onEquipSake?: () => void;
  onClose?: () => void;
}

const ANIMATION_BUTTONS = [
  { id: 'idle', label: '🧍 Idle', desc: 'Postura base' },
  { id: 'walk', label: '🚶 Caminhar', desc: 'Movimento' },
  { id: 'punch1', label: '👊 Soco 1', desc: 'Jab rápido' },
  { id: 'punch2', label: '🥊 Soco 2', desc: 'Direto' },
  { id: 'punch3', label: '💥 Soco 3', desc: 'Cruzado' },
  { id: 'punch4', label: '⚡ Soco 4', desc: 'Gancho' },
  { id: 'kick1', label: '🦶 Chute 1', desc: 'Giratório' },
  { id: 'kick2', label: '🌪️ Chute 2', desc: 'Voador' },
  { id: 'kick3', label: '🔥 Chute 3', desc: 'Impacto final' },
  { id: 'turnLeft', label: '↪️ Girar Esq.', desc: 'Curva esquerda' },
  { id: 'turnRight', label: '↩️ Girar Dir.', desc: 'Curva direita' },
  { id: 'death', label: '💀 Morte', desc: 'Animação de derrota' },
];

export const AnimationTestBar: React.FC<AnimationTestBarProps> = ({
  selectedUnit,
  currentAnimation,
  onTriggerAnimation,
  onSetStars,
  onToggleTeam,
  onRemoveUnit,
  onEquipSake,
  onClose,
}) => {
  if (!selectedUnit) return null;

  const isDrinker = selectedUnit.unitId === 'zoro' || selectedUnit.unitId === 'shanks';
  const isZoro = selectedUnit.unitId === 'zoro';
  const isNami = selectedUnit.unitId === 'nami';
  const isUsopp = selectedUnit.unitId === 'usopp';
  const hasSake = selectedUnit.items?.includes('garrafa_sake');

  const animButtons = isZoro
    ? [
        { id: 'idle', label: '🧍 Idle Zoro', desc: 'IdleZoro.glb' },
        { id: 'walk', label: '🚶 ZoroWalk', desc: 'ZoroWalk.glb' },
        { id: 'slash1', label: '⚔️ Slash 1', desc: 'Slash1.glb (Ataque Padrão)' },
        { id: 'punch1', label: '⚔️ Golpe 1', desc: 'Slash1' },
        { id: 'punch2', label: '⚔️ Golpe 2', desc: 'Slash1' },
        { id: 'kick1', label: '⚔️ Golpe Forte', desc: 'Slash1' },
        { id: 'turnLeft', label: '↪️ Girar Esq.', desc: 'Curva esquerda' },
        { id: 'turnRight', label: '↩️ Girar Dir.', desc: 'Curva direita' },
        { id: 'death', label: '💀 Morte', desc: 'Derrota' },
      ]
    : isNami
    ? [
        { id: 'idle', label: '🧍 Skin Nami', desc: 'SkinNami.glb' },
        { id: 'walk', label: '🚶 Caminhar', desc: 'WalkFem.glb' },
        { id: 'attack', label: '⚡ Nami Atk', desc: 'NamiAtk.glb (Clima-Tact)' },
        { id: 'turnLeft', label: '↪️ Girar Esq.', desc: 'Curva esquerda' },
        { id: 'turnRight', label: '↩️ Girar Dir.', desc: 'Curva direita' },
        { id: 'death', label: '💀 Morte', desc: 'Derrota' },
      ]
    : isUsopp
    ? [
        { id: 'idle', label: '🧍 Skin Usopp', desc: 'SkinUsopp.glb' },
        { id: 'walk', label: '🚶 Caminhar', desc: 'Walk.glb' },
        { id: 'attack', label: '🎯 Usopp Atk', desc: 'UsoppAtk.glb (Disparo Estilingue)' },
        { id: 'turnLeft', label: '↪️ Girar Esq.', desc: 'Curva esquerda' },
        { id: 'turnRight', label: '↩️ Girar Dir.', desc: 'Curva direita' },
        { id: 'death', label: '💀 Morte', desc: 'Derrota' },
      ]
    : ANIMATION_BUTTONS;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-4xl bg-slate-950/95 border-2 border-amber-500/80 rounded-2xl p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200 select-none ring-1 ring-amber-400/30">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
        {/* Left: Unit Identity & Stars */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-amber-300 uppercase tracking-wide">
              {selectedUnit.name}
            </span>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                selectedUnit.isEnemy
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/60'
                  : 'bg-blue-950/90 text-blue-300 border-blue-500/60'
              }`}
            >
              {selectedUnit.isEnemy ? '🔴 Inimigo (Campo de Cima)' : '🔵 Aliado (Campo de Baixo)'}
            </span>
          </div>

          {/* Star Rating Selectors */}
          <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold mr-1">Estrelas:</span>
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => onSetStars(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-black transition-all cursor-pointer ${
                  selectedUnit.stars === s
                    ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-amber-300'
                }`}
              >
                {s}★{isZoro ? ` (${s} ${s === 1 ? 'Espada' : 'Espadas'})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Quick Unit Operations */}
        <div className="flex items-center gap-2">
          {/* Equip / Unequip Sake Bottle */}
          {onEquipSake && (
            <button
              onClick={onEquipSake}
              title={
                isDrinker
                  ? 'Item com Super Efeito no Zoro e Shanks!'
                  : 'Equipar Garrafa de Sakê'
              }
              className={`flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl border transition-all cursor-pointer shadow-md ${
                hasSake
                  ? 'bg-emerald-950 border-emerald-400 text-emerald-300'
                  : isDrinker
                  ? 'bg-amber-950/90 border-amber-400 text-amber-300 animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-amber-300'
              }`}
            >
              <span>🍶</span>
              <span>{hasSake ? 'Sakê Equipado' : isDrinker ? '🍶 Sakê (Beberrão!)' : 'Equipar Sakê'}</span>
            </button>
          )}

          {/* Team Switcher (Player / Enemy) */}
          {onToggleTeam && selectedUnit.gridX >= 0 && (
            <button
              onClick={onToggleTeam}
              title="Trocar equipe do personagem (Aliado <-> Inimigo)"
              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-cyan-300 cursor-pointer transition-all"
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span>Inverter Time</span>
            </button>
          )}

          {/* Remove from Board */}
          {onRemoveUnit && selectedUnit.gridX >= 0 && (
            <button
              onClick={onRemoveUnit}
              title="Remover personagem da arena"
              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl border border-rose-800/80 bg-rose-950/60 hover:bg-rose-900 text-rose-300 cursor-pointer transition-all"
            >
              <Trash2 className="w-3 h-3" />
              <span>Remover</span>
            </button>
          )}

          {/* Close Panel */}
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Animation Buttons Grid */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {animButtons.map((anim) => {
          const isActive = currentAnimation === anim.id;
          return (
            <button
              key={anim.id}
              onClick={() => onTriggerAnimation(anim.id)}
              title={anim.desc}
              className={`flex-shrink-0 flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer duration-150 ${
                isActive
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.8)] scale-105'
                  : 'bg-slate-900/90 border-slate-700/80 text-slate-200 hover:border-amber-400/80 hover:bg-slate-800 hover:text-amber-300'
              }`}
            >
              <span>{anim.label}</span>
              <span
                className={`text-[8px] font-medium tracking-tight ${
                  isActive ? 'text-slate-900 font-bold' : 'text-slate-400'
                }`}
              >
                {anim.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
