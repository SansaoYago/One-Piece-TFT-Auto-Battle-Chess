import React, { useState } from 'react';
import { UnitInstance } from '../types/game';
import { AttackEffect, CombatUnitState, FloatingText } from '../types/combat';
import { Swords, User, Anchor, Crown, Flame, Zap, Coins } from 'lucide-react';
import { SYNERGY_DATABASE } from '../data/synergies';
import { CHAMPION_DATABASE } from '../data/units';
import { ITEM_DATABASE } from '../data/items';
import { ChampionVisual } from './ChampionVisual';
import { Champion3DModel } from './Champion3DModel';
import { Commander } from '../types/game';

interface ArenaBoardProps {
  boardUnits: UnitInstance[];
  combatUnits?: CombatUnitState[];
  floatingTexts?: FloatingText[];
  attackEffects?: AttackEffect[];
  isCombatPhase?: boolean;
  isCombatStarting?: boolean;
  combatWarmupCount?: number;
  isOvertime?: boolean;
  roundStage?: string;
  roundTitle?: string;
  battleOutcome?: 'VICTORY' | 'DEFEAT' | 'DRAW' | null;
  maxUnits: number;
  playerUnitsCount: number;
  selectedUnitId: string | null;
  draggedUnit?: UnitInstance | null;
  isViewingOpponentArena?: boolean;
  viewingCommander?: Commander | null;
  isTestMode?: boolean;
  testAnimationOverride?: string | null;
  gold?: number;
  level?: number;
  xp?: number;
  xpNeeded?: number;
  onUnitSelect: (unit: UnitInstance) => void;
  onTileClick: (x: number, y: number) => void;
  onDragOverTile: (e: React.DragEvent, x: number, y: number) => void;
  onDropOnTile: (e: React.DragEvent, x: number, y: number) => void;
  onDragStartUnit: (e: React.DragEvent, unit: UnitInstance) => void;
  onDragEnd?: () => void;
}

const BOARD_COLS = 8; // 0..7
const BOARD_ROWS = 6; // 0..5
const PLAYER_MAX_COL = 3; // 0..3 Player Territory (Left), 4..7 Enemy Territory (Right)

// Helper to get clean display name (e.g., "Monkey D. Luffy" -> "Luffy", "Roronoa Zoro" -> "Zoro", "Sir Crocodile" -> "Crocodile")
const getCleanChampionName = (rawName: string): string => {
  const cleanMap: Record<string, string> = {
    'Monkey D. Luffy': 'Luffy',
    'Roronoa Zoro': 'Zoro',
    'Nami': 'Nami',
    'Usopp': 'Usopp',
    'Sanji': 'Sanji',
    'Tony Tony Chopper': 'Chopper',
    'Nico Robin': 'Robin',
    'Franky': 'Franky',
    'Brook': 'Brook',
    'Jinbe': 'Jinbe',
    'Portgas D. Ace': 'Ace',
    'Trafalgar Law': 'Law',
    'Eustass Kid': 'Kid',
    'Sir Crocodile': 'Crocodile',
    'Capitão Smoker': 'Smoker',
    'Smoker': 'Smoker',
    'Buggy o Palhaço': 'Buggy',
    'Buggy': 'Buggy',
    'Tashigi': 'Tashigi',
    'Donquixote Doflamingo': 'Doflamingo',
    'Dracule Mihawk': 'Mihawk',
    'Boa Hancock': 'Hancock',
    'Bartholomew Kuma': 'Kuma',
    'Gekko Moria': 'Moria',
    'Marshall D. Teach': 'Blackbeard',
    'Edward Newgate (Barba Branca)': 'Barba Branca',
    'Shanks': 'Shanks',
    'Kaido': 'Kaido',
    'Big Mom (Charlotte Linlin)': 'Big Mom',
    'Almirante Aokiji': 'Aokiji',
    'Almirante Kizaru': 'Kizaru',
    'Almirante Akainu': 'Akainu',
    'Vice-Almirante Garp': 'Garp',
    'Sengoku o Buda': 'Sengoku',
    'Rob Lucci': 'Lucci',
    'Kaku': 'Kaku',
    'Enel': 'Enel',
    'Katakuri': 'Katakuri',
    'King': 'King',
    'Queen': 'Queen',
    'Marco a Fênix': 'Marco',
    'Yamato': 'Yamato',
    'Sabó': 'Sabo',
  };

  if (cleanMap[rawName]) return cleanMap[rawName];

  // Heuristic cleanup
  const parts = rawName.split(' ');
  if (parts.length === 1) return parts[0];
  if (parts[0].toLowerCase() === 'sir' || parts[0].toLowerCase() === 'capitão' || parts[0].toLowerCase() === 'almirante') {
    return parts.slice(1).join(' ');
  }
  return parts[parts.length - 1];
};

export const ArenaBoard: React.FC<ArenaBoardProps> = ({
  boardUnits,
  combatUnits = [],
  floatingTexts = [],
  attackEffects = [],
  isCombatPhase = false,
  isCombatStarting = false,
  combatWarmupCount = 3,
  isOvertime = false,
  roundStage = '1-1',
  roundTitle = '',
  battleOutcome = null,
  maxUnits,
  playerUnitsCount,
  selectedUnitId,
  draggedUnit = null,
  isViewingOpponentArena = false,
  viewingCommander = null,
  isTestMode = false,
  testAnimationOverride = null,
  gold,
  level = 1,
  xp = 0,
  xpNeeded = 4,
  onUnitSelect,
  onTileClick,
  onDragOverTile,
  onDropOnTile,
  onDragStartUnit,
  onDragEnd,
}) => {
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const showUnitHud = true;
  const [isHoldingUnit, setIsHoldingUnit] = useState(false);

  // Helper to find unit at grid coordinates during preparation phase
  const getPrepUnitAt = (x: number, y: number) => {
    return boardUnits.find((u) => u.gridX === x && u.gridY === y);
  };

  // Render individual 2.5D upright unit token
  const renderUnitToken = (
    unit: UnitInstance | CombatUnitState,
    isCombat: boolean,
    isDraggingAllowed: boolean
  ) => {
    const isSelected = unit.instanceId === selectedUnitId;
    const baseData = CHAMPION_DATABASE[unit.unitId];
    const combatState = isCombat ? (unit as CombatUnitState) : null;
    const isCasting = combatState?.isCasting;
    const isStunned = combatState?.isStunned;
    const cleanName = getCleanChampionName(unit.name);
    const isDead = unit.hp <= 0 || (combatState?.isDefeated ?? false);

    // Calculate current and target positions for 3D directional facing
    let currentPos: { x: number; y: number } | null = null;
    let targetPos: { x: number; y: number } | null = null;

    if (isCombat && combatState) {
      currentPos = { x: combatState.currentPosX, y: combatState.currentPosY };
      if (combatState.targetInstanceId) {
        const targetUnit = combatUnits.find((u) => u.instanceId === combatState.targetInstanceId);
        if (targetUnit) {
          targetPos = { x: targetUnit.currentPosX, y: targetUnit.currentPosY };
        }
      }
    } else {
      // Preparation phase: Player looks towards enemy side (right), Enemy looks towards player (left)
      currentPos = { x: unit.gridX, y: unit.gridY };
      targetPos = unit.isEnemy
        ? { x: unit.gridX - 4, y: unit.gridY + 0.2 }
        : { x: unit.gridX + 4, y: unit.gridY + 0.2 };
    }

    return (
      <div
        key={unit.instanceId}
        draggable={isDraggingAllowed}
        onDragStart={(e) => {
          setIsHoldingUnit(true);
          onDragStartUnit(e, unit);
        }}
        onDragEnd={() => {
          setIsHoldingUnit(false);
          if (onDragEnd) onDragEnd();
        }}
        onDragOver={(e) => {
          if (!isCombat) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onDrop={(e) => {
          if (!isCombat && unit.gridX >= 0 && unit.gridY >= 0) {
            e.preventDefault();
            e.stopPropagation();
            onDropOnTile(e, unit.gridX, unit.gridY);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          onUnitSelect(unit);
        }}
        className={`relative flex flex-col items-center justify-end transition-all duration-300 ${
          isDraggingAllowed ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        } ${
          isDead
            ? 'pointer-events-none scale-0 opacity-0 blur-xs translate-y-3'
            : 'opacity-100 scale-100'
        } ${
          isSelected && !isDead
            ? 'scale-110 filter drop-shadow-[0_0_16px_rgba(245,158,11,0.95)]'
            : isDead ? '' : 'hover:scale-105'
        }`}
        style={{
          transformOrigin: 'bottom center',
          transform: 'rotateZ(30deg) rotateX(-55deg) translateZ(8px)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Top Floating Overlay: Structured Clean HUD (HP, MP, Stars, Items, Name) - Positioned with safe head clearance above 3D model */}
        {showUnitHud && !isDead && (
          <div className="absolute bottom-full mb-2 sm:mb-3 lg:mb-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30 animate-in fade-in duration-200 whitespace-nowrap">
            {/* Casting / Stun Floating Status Pill */}
            {isCasting && combatState?.castingSkillName && (
              <div className={`mb-1 px-2 py-0.5 rounded-full ${
                combatState.castingSkillType === 'ORB_SPECIAL'
                  ? 'bg-purple-600 text-purple-100 border-purple-300 shadow-purple-900/50'
                  : 'bg-amber-400 text-slate-950 border-amber-200 shadow-amber-900/50'
              } text-[9px] font-black uppercase tracking-wider animate-bounce shadow-lg border`}>
                {combatState.castingSkillType === 'ORB_SPECIAL' ? '🔮' : '⚡'} {combatState.castingSkillName}
              </div>
            )}
            {isStunned && (
              <div className="mb-1 px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 text-[9px] font-black uppercase tracking-wider animate-pulse shadow-lg border border-cyan-200">
                💫 Atordoado!
              </div>
            )}

            {/* Quadrinho Base Leve (Column): Estrelas em cima, Itens de segurar embaixo */}
            <div className="flex flex-col items-center justify-center px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700/80 shadow-md backdrop-blur-xs min-w-[28px]">
              {/* Estrela em cima */}
              <div className="flex items-center justify-center gap-0.5 text-[9px] font-black text-amber-400 font-mono leading-none">
                {Array.from({ length: unit.stars }).map((_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>

              {/* Itens de segurar embaixo */}
              {unit.items && unit.items.length > 0 && (
                <div className="flex items-center justify-center gap-0.5 mt-0.5">
                  {unit.items.map((itemId, idx) => {
                    const itm = ITEM_DATABASE[itemId];
                    if (!itm) return null;
                    return (
                      <span key={idx} className="text-[8px] leading-none" title={itm.name}>
                        {itm.icon}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Nome do Campeão Acima da Barra */}
            <div className="my-0.5 text-center px-1 flex flex-col items-center">
              {combatState?.transformationPhase === 'INVOKING' && (
                <span className="mb-0.5 px-1.5 py-0.2 rounded-full bg-purple-700/90 text-[8px] font-black text-purple-200 border border-purple-400 animate-bounce tracking-tight">
                  🔮 INVOCANDO...
                </span>
              )}
              {combatState?.transformationPhase === 'TRANSFORMED' && (
                <span className="mb-0.5 px-1.5 py-0.2 rounded-full bg-rose-700/95 text-[8px] font-black text-amber-200 border border-rose-400 animate-pulse tracking-tight shadow-md">
                  👹 MONSTER CHOPPER (3m)
                </span>
              )}
              {combatState?.isUnconscious && (
                <span className="mb-0.5 px-1.5 py-0.2 rounded-full bg-slate-800 text-[8px] font-black text-yellow-300 border border-slate-600 animate-pulse tracking-tight">
                  💫 DESMAIADO (3s)
                </span>
              )}
              <span className="text-[10px] font-black text-slate-100 uppercase tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                {combatState?.isTransformed ? 'Monster Chopper' : cleanName}
              </span>
            </div>

            {/* Barras de HP, Mana e Barra Especial de Orbe (Roxo 250 pt) */}
            <div className="w-16 sm:w-20 flex flex-col gap-0.5">
              {/* Barra de HP (h-2) */}
              <div className="w-full h-2 bg-slate-950/90 rounded-full overflow-hidden border border-slate-700/80 shadow-inner">
                <div
                  className={`h-full ${
                    unit.isEnemy ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-300'
                  } rounded-full transition-all duration-150 shadow-sm`}
                  style={{
                    width: `${Math.max(0, Math.min(100, (unit.hp / unit.maxHp) * 100))}%`,
                  }}
                />
              </div>

              {/* Barra de Mana / Ataque Especial Normal (h-1 - Exatamente metade da altura de HP) */}
              <div className="w-full h-1 bg-slate-950/90 rounded-full overflow-hidden border border-slate-700/80 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full transition-all duration-150 shadow-sm"
                  style={{
                    width: `${Math.min(100, (unit.mana / unit.maxMana) * 100)}%`,
                  }}
                />
              </div>

              {/* Barra de Especial de Orbe (Roxo, 250 pt) - Apenas para unidades equipadas com o Orbe */}
              {unit.hasSpecialItem && (
                <div className="w-full h-1 bg-slate-950/90 rounded-full overflow-hidden border border-purple-900/80 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-fuchsia-400 rounded-full transition-all duration-150 shadow-sm"
                    style={{
                      width: `${Math.min(100, (((unit.orbMana || combatState?.orbMana || 0) / (unit.maxOrbMana || 250)) * 100))}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3D Global Mannequin Body with Fallback & Clean View */}
        <div
          className={`${
            combatState?.isTransformed
              ? 'w-36 h-48 sm:w-44 sm:h-56 lg:w-52 lg:h-64'
              : 'w-24 h-32 sm:w-30 sm:h-38 lg:w-36 lg:h-44'
          } flex items-end justify-center relative transition-all duration-300 ${
            isSelected ? 'scale-105 drop-shadow-[0_0_16px_rgba(245,158,11,1)]' : ''
          }`}
        >
          {/* 3D Model Instance with dynamic directional targeting, combo strikes and GLB animations */}
          <Champion3DModel
            unitId={unit.unitId}
            unitColor={unit.color || baseData?.color || '#F59E0B'}
            isEnemy={unit.isEnemy}
            isStunned={isStunned}
            isCasting={isCasting}
            isTransformed={combatState?.isTransformed}
            transformationPhase={combatState?.transformationPhase}
            isUnconscious={combatState?.isUnconscious}
            stars={unit.stars || 1}
            currentPos={currentPos}
            targetPos={targetPos}
            lastAttackTimestamp={combatState?.lastAttackTimestamp}
            animationName={
              testAnimationOverride && selectedUnitId === unit.instanceId
                ? (testAnimationOverride as any)
                : unit.hp <= 0 || isDead
                ? 'death'
                : isCombatStarting || battleOutcome !== null
                ? 'idle'
                : combatState?.transformationPhase === 'INVOKING'
                ? 'monster_invoke'
                : combatState?.isUnconscious
                ? 'idle'
                : isCasting
                ? (unit.unitId === 'nami' || unit.unitId === 'usopp' ? 'attack' : 'kick1')
                : combatState?.currentAnimation && combatState.currentAnimation !== 'idle'
                ? combatState.currentAnimation
                : combatState?.moveCooldown && combatState.moveCooldown > 0
                ? 'walk'
                : 'idle'
            }
            className="w-full h-full"
          />

          {/* Avatar Identification Badge (Hidden in clean arena mode, preserved in code) */}
          <div className="hidden absolute top-1 left-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden border-2 border-amber-400/90 bg-slate-950 shadow-lg pointer-events-none items-center justify-center ring-1 ring-black">
            <ChampionVisual
              unitId={unit.unitId}
              avatarFallback={unit.avatarUrl}
              visualAssets={unit.visualAssets || baseData?.visualAssets}
              mode="portrait"
              alt={unit.name}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    );
  };

  const isDraggingActive = Boolean(draggedUnit || isHoldingUnit);

  return (
    <div
      className={`relative flex-1 h-full flex flex-col items-center justify-center overflow-hidden p-2 sm:p-4 select-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black ${
        isOvertime ? 'ring-4 ring-rose-600/40' : ''
      }`}
    >
      {/* Tactical Ambient Grid Lighting & Vignette */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[650px] ${
          isOvertime ? 'bg-rose-600/15' : 'bg-amber-500/5'
        } rounded-full blur-3xl pointer-events-none transition-colors duration-700`}
      />

      {/* Overtime 2X Indicator Badge */}
      {isOvertime && (
        <div className="absolute top-2.5 left-4 z-20 pointer-events-none">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-600/90 text-white font-black text-[11px] shadow-lg animate-pulse border border-rose-400">
            <Flame className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
            <span>OVERTIME 2X</span>
          </div>
        </div>
      )}

      {/* 3D Isometric Tactical Arena Container (Elevated so bench does not cover bottom tiles) */}
      <div className="relative transform-gpu transition-transform duration-500 ease-out [perspective:1400px] flex items-center justify-center -translate-y-8 sm:-translate-y-12 lg:-translate-y-14 mt-4 mb-auto scale-95 lg:scale-100">
        {/* 3D Arena Stadium Floor */}
        <div
          className="relative grid grid-cols-8 gap-2.5 p-7 rounded-[2.5rem] bg-gradient-to-b from-slate-950/95 via-slate-900/90 to-slate-950/95 border-[3px] border-amber-500/30 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_60px_rgba(245,158,11,0.12)] backdrop-blur-2xl ring-1 ring-white/5"
          style={{
            transform: 'rotateX(55deg) rotateZ(-30deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Transverse / Vertical Clash Dividing Line */}
          <div className="absolute top-4 bottom-4 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-rose-500/40 via-amber-400/90 to-blue-500/40 pointer-events-none z-0 shadow-[0_0_15px_rgba(245,158,11,0.7)] rounded-full" />

          {/* Grid Cells (8 Cols x 6 Rows = 48 Tiles) */}
          {Array.from({ length: BOARD_ROWS }).map((_, row) =>
            Array.from({ length: BOARD_COLS }).map((_, col) => {
              const isPlayerHalf = col <= PLAYER_MAX_COL;
              const isHovered = hoveredTile?.x === col && hoveredTile?.y === row;
              const prepUnit = !isCombatPhase ? getPrepUnitAt(col, row) : null;
              // Only light up tiles when user is actively dragging a champion over the arena
              const isHighlightActive = isHovered && isDraggingActive && !isCombatPhase && !isViewingOpponentArena;

              return (
                <div
                  key={`${col}-${row}`}
                  onMouseEnter={() => {
                    if (isDraggingActive && !isCombatPhase && !isViewingOpponentArena) {
                      setHoveredTile({ x: col, y: row });
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredTile(null);
                  }}
                  onClick={() => {
                    if (prepUnit) {
                      onUnitSelect(prepUnit);
                    } else if (!isViewingOpponentArena) {
                      onTileClick(col, row);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isCombatPhase && !isViewingOpponentArena) {
                      setHoveredTile({ x: col, y: row });
                      onDragOverTile(e, col, row);
                    }
                  }}
                  onDrop={(e) => {
                    setHoveredTile(null);
                    if (!isCombatPhase && !isViewingOpponentArena) onDropOnTile(e, col, row);
                  }}
                  className={`w-14 h-14 sm:w-16 sm:h-16 lg:w-[72px] lg:h-[72px] rounded-2xl relative flex items-center justify-center transition-all duration-200 ${
                    isCombatPhase || isViewingOpponentArena
                      ? 'cursor-default'
                      : isDraggingActive
                      ? 'cursor-grabbing'
                      : prepUnit
                      ? 'cursor-grab'
                      : 'cursor-default'
                  } border ${
                    isPlayerHalf
                      ? isHighlightActive
                        ? 'bg-amber-950/90 border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.85)] scale-[1.05]'
                        : prepUnit
                        ? 'bg-slate-900/95 border-amber-500/40 shadow-inner'
                        : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700/60'
                      : isHighlightActive
                      ? 'bg-rose-950/90 border-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.75)]'
                      : prepUnit
                      ? 'bg-slate-950/90 border-rose-500/40 shadow-inner'
                      : 'bg-slate-950/75 border-slate-900/90'
                  }`}
                  style={{
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Fractional Arena Grid Pedestal Inset Disc */}
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 lg:w-13 lg:h-13 rounded-full border transition-all pointer-events-none flex items-center justify-center ${
                      prepUnit
                        ? isPlayerHalf
                          ? 'border-amber-400/60 bg-amber-500/15 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                          : 'border-rose-400/60 bg-rose-500/15 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                        : isPlayerHalf
                        ? isHighlightActive
                          ? 'border-amber-400 bg-amber-500/25 shadow-[0_0_16px_rgba(245,158,11,0.6)]'
                          : 'border-amber-500/20 bg-slate-950/60'
                        : isHighlightActive
                        ? 'border-rose-400 bg-rose-500/25 shadow-[0_0_16px_rgba(244,63,94,0.6)]'
                        : 'border-rose-500/15 bg-slate-950/60'
                    }`}
                  >
                    {/* Inner core tactile spot */}
                    <div
                      className={`w-3.5 h-3.5 rounded-full transition-opacity ${
                        isPlayerHalf
                          ? prepUnit ? 'bg-amber-400/40' : 'bg-amber-500/15'
                          : prepUnit ? 'bg-rose-400/40' : 'bg-rose-500/15'
                      }`}
                    />
                  </div>

                  {/* Subtle Hex / Diamond Tile Accent Border */}
                  <div
                    className={`absolute inset-1 rounded-xl border border-dashed transition-opacity pointer-events-none ${
                      isPlayerHalf ? 'border-amber-500/25' : 'border-rose-500/20'
                    } ${isHighlightActive ? 'opacity-100' : 'opacity-25'}`}
                  />

                  {/* Floor Contact Shadow Disc */}
                  {prepUnit && (
                    <div
                      className="absolute w-12 h-12 rounded-full bg-black/70 blur-[3px] pointer-events-none"
                      style={{ transform: 'translateZ(2px)' }}
                    />
                  )}
                </div>
              );
            })
          )}

          {/* PREPARATION PHASE: DEDICATED CONTINUOUS OVERLAY LAYER (Rendered above ALL 48 floor tiles so tiles never overlap models) */}
          {!isCombatPhase && (
            <div
              className="absolute inset-7 pointer-events-none z-30"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {boardUnits.map((pUnit) => {
                if (pUnit.gridX < 0 || pUnit.gridY < 0) return null;
                // Precise continuous percentage position inside the 8x6 grid
                const leftPercent = ((pUnit.gridX + 0.5) / BOARD_COLS) * 100;
                const topPercent = ((pUnit.gridY + 0.5) / BOARD_ROWS) * 100;

                return (
                  <div
                    key={pUnit.instanceId}
                    className="absolute pointer-events-auto transition-all duration-200 ease-out"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      transform: 'translate(-50%, -82%)',
                      transformStyle: 'preserve-3d',
                      zIndex: pUnit.gridY * 10 + pUnit.gridX + 10,
                    }}
                  >
                    {/* Floor Shadow Disc underneath the champion feet */}
                    <div
                      className="absolute left-1/2 top-[82%] -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/70 blur-[3px] pointer-events-none"
                      style={{ transform: 'translateZ(2px)' }}
                    />

                    {/* Upright 3D Tactical Billboarding Unit Token */}
                    {renderUnitToken(pUnit, false, !isViewingOpponentArena && !pUnit.isEnemy)}
                  </div>
                );
              })}
            </div>
          )}

          {/* COMBAT PHASE: DEDICATED CONTINUOUS OVERLAY LAYER FOR ALL COMBAT UNITS */}
          {isCombatPhase && (
            <div
              className="absolute inset-7 pointer-events-none z-30"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {combatUnits
                .filter((cUnit) => {
                  if (cUnit.hp <= 0 || cUnit.isDefeated) {
                    if (!cUnit.deathTimestamp) return false;
                    return Date.now() - cUnit.deathTimestamp < 300;
                  }
                  return true;
                })
                .map((cUnit) => {
                // Precise continuous percentage position inside the 8x6 grid
                const leftPercent = ((cUnit.currentPosX + 0.5) / BOARD_COLS) * 100;
                const topPercent = ((cUnit.currentPosY + 0.5) / BOARD_ROWS) * 100;

                return (
                  <div
                    key={cUnit.instanceId}
                    className="absolute pointer-events-auto transition-transform duration-100 ease-linear"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      transform: 'translate(-50%, -82%)',
                      transformStyle: 'preserve-3d',
                      zIndex: Math.round(cUnit.currentPosY) * 10 + Math.round(cUnit.currentPosX) + 10,
                    }}
                  >
                    {/* Floor Shadow Disc underneath the combatant feet */}
                    {!cUnit.isDefeated && cUnit.hp > 0 && (
                      <div
                        className="absolute left-1/2 top-[82%] -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/70 blur-[4px] pointer-events-none transition-opacity duration-300"
                        style={{ transform: 'translateZ(2px)' }}
                      />
                    )}

                    {/* Upright 3D Tactical Billboarding Unit Token */}
                    {renderUnitToken(cUnit, true, false)}
                  </div>
                );
              })}
            </div>
          )}

          {/* COMBAT PHASE: FLOATING COMBAT TEXTS LAYER */}
          {isCombatPhase && floatingTexts.length > 0 && (
            <div
              className="absolute inset-7 pointer-events-none z-50 overflow-visible"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {floatingTexts.map((ft, idx) => {
                const leftPercent = ((ft.x + 0.5) / BOARD_COLS) * 100;
                const topPercent = ((ft.y + 0.5) / BOARD_ROWS) * 100;

                return (
                  <div
                    key={ft.id ? `${ft.id}_${idx}` : `ft_${idx}`}
                    className="absolute font-mono font-black text-xs sm:text-sm animate-out fade-out slide-out-to-top-8 duration-700 select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      color: ft.color || '#F59E0B',
                      transform:
                        'translate(-50%, -50%) rotateZ(30deg) rotateX(-55deg) translateZ(65px)',
                    }}
                  >
                    {ft.value}
                  </div>
                );
              })}
            </div>
          )}

          {/* COMBAT PHASE: VISUAL ATTACK EFFECTS LAYER */}
          {isCombatPhase && attackEffects.length > 0 && (
            <div
              className="absolute inset-7 pointer-events-none z-40 overflow-visible"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {attackEffects.map((eff, idx) => {
                const startX = ((eff.fromX + 0.5) / BOARD_COLS) * 100;
                const startY = ((eff.fromY + 0.5) / BOARD_ROWS) * 100;
                const endX = ((eff.toX + 0.5) / BOARD_COLS) * 100;
                const endY = ((eff.toY + 0.5) / BOARD_ROWS) * 100;

                return (
                  <div
                    key={eff.id ? `${eff.id}_${idx}` : `eff_${idx}`}
                    className="absolute inset-0 pointer-events-none overflow-visible"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {eff.type === 'PUNCH_EXTEND' && (
                      <svg className="absolute inset-0 w-full h-full overflow-visible">
                        <line
                          x1={`${startX}%`}
                          y1={`${startY}%`}
                          x2={`${endX}%`}
                          y2={`${endY}%`}
                          stroke={eff.color}
                          strokeWidth="8"
                          strokeLinecap="round"
                          className="animate-pulse"
                          style={{ filter: `drop-shadow(0 0 8px ${eff.color})` }}
                        />
                      </svg>
                    )}
                    {eff.type === 'LIGHTNING' && (
                      <svg className="absolute inset-0 w-full h-full overflow-visible">
                        <line
                          x1={`${startX}%`}
                          y1={`${startY}%`}
                          x2={`${endX}%`}
                          y2={`${endY}%`}
                          stroke="#38BDF8"
                          strokeWidth="6"
                          strokeDasharray="6,4"
                          className="animate-ping"
                          style={{ filter: 'drop-shadow(0 0 12px #38BDF8)' }}
                        />
                      </svg>
                    )}
                    {eff.type === 'MELEE_SLASH' && (
                      <svg className="absolute inset-0 w-full h-full overflow-visible">
                        <line
                          x1={`${startX}%`}
                          y1={`${startY}%`}
                          x2={`${endX}%`}
                          y2={`${endY}%`}
                          stroke={eff.color || '#F59E0B'}
                          strokeWidth="5"
                          strokeLinecap="round"
                          className="animate-ping"
                          style={{ filter: `drop-shadow(0 0 10px ${eff.color || '#F59E0B'})` }}
                        />
                      </svg>
                    )}
                    {eff.type === 'PROJECTILE' && (
                      <svg className="absolute inset-0 w-full h-full overflow-visible">
                        <circle
                          cx={`${endX}%`}
                          cy={`${endY}%`}
                          r="6"
                          fill={eff.color || '#38BDF8'}
                          className="animate-ping"
                          style={{ filter: `drop-shadow(0 0 8px ${eff.color || '#38BDF8'})` }}
                        />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* COMBAT WARMUP & START COUNTDOWN OVERLAY (FLAT 2D, VERTICALLY UPRIGHT & PERFECTLY CENTERED) */}
      {isCombatStarting && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center p-4">
          <div className="flex flex-col items-center animate-in zoom-in-95 duration-300 pointer-events-auto">
            {/* Subtle Glow Aura behind card */}
            <div className="absolute w-96 h-96 rounded-full bg-amber-500/20 blur-3xl pointer-events-none animate-pulse" />

            {/* Main Glass HUD Card (Flat, Upright, Aligned & Centered) */}
            <div className="relative px-8 py-5 rounded-2xl bg-slate-950/95 border-2 border-amber-500/70 shadow-[0_0_60px_rgba(245,158,11,0.5),0_20px_40px_rgba(0,0,0,0.9)] backdrop-blur-xl flex flex-col items-center gap-3 max-w-md text-center">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-400">
                <Swords className="w-4 h-4 text-amber-400 animate-spin" />
                <span>{roundStage ? `Round ${roundStage}` : 'Combate'} • Preparar para Batalha!</span>
              </div>

              {/* Dynamic Countdown Display */}
              <div className="flex items-center justify-center min-h-[60px]">
                {combatWarmupCount > 0 ? (
                  <div className="flex items-center gap-4">
                    <span className="text-5xl sm:text-6xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 animate-pulse drop-shadow-[0_0_25px_rgba(245,158,11,0.9)]">
                      {combatWarmupCount}
                    </span>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-bold text-slate-100">
                        {combatWarmupCount === 3 && '⚡ Pré-carregando modelos do round...'}
                        {combatWarmupCount === 2 && '🛡️ Posicionando guerreiros na arena...'}
                        {combatWarmupCount === 1 && '⚔️ Em guarda! Batalha iminente'}
                      </span>
                      <span className="text-xs text-amber-400/90 font-medium mt-0.5">
                        {combatWarmupCount === 3 && 'Decodificando texturas & animações na GPU'}
                        {combatWarmupCount === 2 && 'Trajetórias e alvos calculados'}
                        {combatWarmupCount === 1 && 'Liberando simulação a 60 FPS'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-4xl sm:text-5xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-amber-300 to-amber-500 animate-bounce drop-shadow-[0_0_30px_rgba(244,63,94,0.95)]">
                    🔥 LUTEM! (FIGHT!)
                  </div>
                )}
              </div>

              {/* Step Progress Indicators */}
              <div className="flex items-center gap-2 mt-1">
                <div className={`h-2 rounded-full transition-all duration-300 ${combatWarmupCount <= 3 ? 'w-10 bg-amber-400 shadow-[0_0_10px_#f59e0b]' : 'w-3 bg-slate-800'}`} />
                <div className={`h-2 rounded-full transition-all duration-300 ${combatWarmupCount <= 2 ? 'w-10 bg-amber-400 shadow-[0_0_10px_#f59e0b]' : 'w-3 bg-slate-800'}`} />
                <div className={`h-2 rounded-full transition-all duration-300 ${combatWarmupCount <= 1 ? 'w-10 bg-amber-400 shadow-[0_0_10px_#f59e0b]' : 'w-3 bg-slate-800'}`} />
                <div className={`h-2 rounded-full transition-all duration-300 ${combatWarmupCount === 0 ? 'w-10 bg-rose-500 shadow-[0_0_10px_#f43f5e]' : 'w-3 bg-slate-800'}`} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tactical Quick Tip at Bottom of Arena */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center pointer-events-none z-20">
        <p className="text-[11px] text-slate-400 font-medium bg-slate-950/90 px-4 py-1 rounded-full border border-slate-800 shadow-md">
          {isCombatPhase ? (
            <span className="text-amber-300 font-bold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-spin" /> Combate em Tempo Real
              ativo! Todas as unidades simuladas em 60 FPS.
            </span>
          ) : (
            <>
              💡 <strong className="text-amber-400">Divisão Transversal:</strong> Posicione seus
              campeões na metade esquerda (colunas 0 a 3), mais próxima do seu Comandante.
            </>
          )}
        </p>
      </div>
    </div>
  );
};


