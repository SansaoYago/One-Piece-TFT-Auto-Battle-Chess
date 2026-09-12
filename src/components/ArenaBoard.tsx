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
import { getChampionTokenDimensions } from '../utils/gameUtils';

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
const BOARD_ROWS = 5; // 0..4 (Reduzido para 5 frentes de batalha mantendo o tamanho da arena)
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

// Canonical vertical anchor percentage for model feet within the 3D canvas viewport
const FEET_ANCHOR_Y_PERCENT = 71.5;

// Precise tile center calculations taking into account responsive tile sizes and gap spacing
const getTileCenterPercent = (col: number, row: number) => {
  const tileSize = 78;
  const gap = 10;
  const totalW = BOARD_COLS * tileSize + (BOARD_COLS - 1) * gap;
  const totalH = BOARD_ROWS * tileSize + (BOARD_ROWS - 1) * gap;
  return {
    leftPercent: ((col * (tileSize + gap) + tileSize / 2) / totalW) * 100,
    topPercent: ((row * (tileSize + gap) + tileSize / 2) / totalH) * 100,
  };
};

const getContinuousTileCenterPercent = (x: number, y: number) => {
  const tileSize = 78;
  const gap = 10;
  const totalW = BOARD_COLS * tileSize + (BOARD_COLS - 1) * gap;
  const totalH = BOARD_ROWS * tileSize + (BOARD_ROWS - 1) * gap;
  return {
    leftPercent: ((x * (tileSize + gap) + tileSize / 2) / totalW) * 100,
    topPercent: ((y * (tileSize + gap) + tileSize / 2) / totalH) * 100,
  };
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
  const hoveredTileRef = React.useRef<{ x: number; y: number } | null>(null);
  const showUnitHud = true;
  const [isHoldingUnit, setIsHoldingUnit] = useState(false);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);

  React.useEffect(() => {
    const handleDragStart = () => setIsGlobalDragging(true);
    const handleDragEnd = () => {
      setIsGlobalDragging(false);
      setIsHoldingUnit(false);
    };
    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('dragend', handleDragEnd);
    return () => {
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

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

    const tokenDims = getChampionTokenDimensions(unit.unitId, combatState?.isTransformed);
    const isMonsterChopper = unit.unitId === 'chopper' && Boolean(combatState?.isTransformed);
    const headBottomPercent = isMonsterChopper
      ? 100
      : Math.min(100, Math.round(28.5 + 61.5 * Math.min(1.2, tokenDims.ratio)));

    return (
      <div
        key={unit.instanceId}
        className={`relative flex flex-col items-center justify-end transition-all duration-300 select-none pointer-events-none ${
          isSelected && !isDead
            ? 'scale-110 filter drop-shadow-[0_0_16px_rgba(245,158,11,0.95)]'
            : isDead ? '' : ''
        }`}
        style={{
          transformOrigin: `50% ${FEET_ANCHOR_Y_PERCENT}%`,
          transform: 'rotateZ(30deg) rotateX(-55deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Top Floating Overlay: Structured Clean HUD (HP, MP, Stars, Items, Name) - Positioned with safe head clearance above 3D model */}
        {showUnitHud && !isDead && (
          <div
            style={{ bottom: `${headBottomPercent}%` }}
            className="absolute mb-2 sm:mb-3 lg:mb-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30 animate-in fade-in duration-200 whitespace-nowrap"
          >
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

        {/* 3D Model Body with Proportional Canonical Scaling & Height-Adjusted HP Bar */}
        <div
          style={{
            ['--token-w-base' as any]: `${tokenDims.widthBase}px`,
            ['--token-h-base' as any]: `${tokenDims.heightBase}px`,
            ['--token-w-sm' as any]: `${tokenDims.widthSm}px`,
            ['--token-h-sm' as any]: `${tokenDims.heightSm}px`,
            ['--token-w-lg' as any]: `${tokenDims.widthLg}px`,
            ['--token-h-lg' as any]: `${tokenDims.heightLg}px`,
          }}
          className={`w-[var(--token-w-base)] h-[var(--token-h-base)] sm:w-[var(--token-w-sm)] sm:h-[var(--token-h-sm)] lg:w-[var(--token-w-lg)] lg:h-[var(--token-h-lg)] flex items-end justify-center relative transition-all duration-300 ${
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
                : combatState?.currentAnimation
                ? combatState.currentAnimation
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

  const isDraggingActive = Boolean(draggedUnit || isHoldingUnit || isGlobalDragging);

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
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onMouseLeave={() => {
            setHoveredTile(null);
            hoveredTileRef.current = null;
          }}
          onDrop={(e) => {
            const target = hoveredTile || hoveredTileRef.current;
            if (!isCombatPhase && !isViewingOpponentArena && target) {
              e.preventDefault();
              onDropOnTile(e, target.x, target.y);
              setHoveredTile(null);
              hoveredTileRef.current = null;
            }
          }}
          className="relative grid grid-cols-8 gap-2 sm:gap-2.5 p-6 sm:p-7 rounded-[2.5rem] bg-gradient-to-b from-slate-950/95 via-slate-900/90 to-slate-950/95 border-[3px] border-amber-500/30 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_60px_rgba(245,158,11,0.12)] backdrop-blur-2xl ring-1 ring-white/5 select-none"
          style={{
            transform: 'rotateX(55deg) rotateZ(-30deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Transverse / Vertical Clash Dividing Line */}
          <div className="absolute top-4 bottom-4 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-rose-500/40 via-amber-400/90 to-blue-500/40 pointer-events-none z-0 shadow-[0_0_15px_rgba(245,158,11,0.7)] rounded-full" />

          {/* Grid Cells (8 Cols x 5 Rows = 40 Tiles - 5 Frentes de batalha) */}
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
                  data-unit-tile={prepUnit ? 'true' : undefined}
                  draggable={Boolean(prepUnit && isPlayerHalf && !isCombatPhase && !isViewingOpponentArena)}
                  onDragStart={(e) => {
                    if (prepUnit && isPlayerHalf && !isCombatPhase && !isViewingOpponentArena) {
                      setIsHoldingUnit(true);
                      e.dataTransfer.effectAllowed = 'move';
                      try {
                        e.dataTransfer.setData('text/plain', prepUnit.instanceId);
                      } catch (_) {}
                      onDragStartUnit(e, prepUnit);
                    }
                  }}
                  onDragEnd={() => {
                    setIsHoldingUnit(false);
                    if (onDragEnd) onDragEnd();
                  }}
                  onMouseEnter={() => {
                    if (isDraggingActive && !isCombatPhase && !isViewingOpponentArena) {
                      setHoveredTile({ x: col, y: row });
                      hoveredTileRef.current = { x: col, y: row };
                    }
                  }}
                  onMouseLeave={() => {
                    // Do not eagerly clear so micro gaps between tiles do not break dragover/drop
                  }}
                  onClick={() => {
                    if (!isCombatPhase && !isViewingOpponentArena && selectedUnitId) {
                      onTileClick(col, row);
                    } else if (prepUnit) {
                      onUnitSelect(prepUnit);
                    } else if (!isViewingOpponentArena) {
                      onTileClick(col, row);
                    }
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (!isCombatPhase && !isViewingOpponentArena) {
                      setHoveredTile({ x: col, y: row });
                      hoveredTileRef.current = { x: col, y: row };
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (!isCombatPhase && !isViewingOpponentArena) {
                      setHoveredTile({ x: col, y: row });
                      hoveredTileRef.current = { x: col, y: row };
                      onDragOverTile(e, col, row);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setHoveredTile(null);
                    hoveredTileRef.current = null;
                    if (!isCombatPhase && !isViewingOpponentArena) {
                      onDropOnTile(e, col, row);
                    }
                  }}
                  className={`w-[66px] h-[66px] sm:w-[78px] sm:h-[78px] lg:w-[88px] lg:h-[88px] rounded-2xl relative flex items-center justify-center transition-all duration-150 ${
                    isCombatPhase || isViewingOpponentArena
                      ? 'cursor-default'
                      : isDraggingActive
                      ? 'cursor-grabbing'
                      : prepUnit
                      ? 'cursor-grab active:cursor-grabbing hover:scale-105'
                      : selectedUnitId
                      ? 'cursor-pointer hover:scale-105'
                      : 'cursor-pointer hover:border-slate-700/60'
                  } border ${
                    isPlayerHalf
                      ? isHighlightActive
                        ? prepUnit
                          ? 'bg-cyan-950/90 border-cyan-400 shadow-[0_0_26px_rgba(34,211,238,0.85)] scale-[1.06] z-20'
                          : 'bg-amber-950/90 border-amber-400 shadow-[0_0_26px_rgba(245,158,11,0.9)] scale-[1.06] z-20'
                        : isDraggingActive
                        ? prepUnit
                          ? 'bg-slate-900/95 border-amber-500/50 shadow-inner ring-1 ring-amber-400/20'
                          : 'bg-slate-900/85 border-amber-500/35 hover:border-amber-400/70 ring-1 ring-amber-400/20'
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
                  {/* Floating Action Badge when hovering while dragging */}
                  {isHighlightActive && isPlayerHalf && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-lg pointer-events-none whitespace-nowrap z-50 flex items-center gap-1 border border-cyan-300 animate-pulse">
                      <span>{prepUnit ? '⇄ Trocar Posição' : '+ Posicionar Aqui'}</span>
                    </div>
                  )}

                  {/* Fractional Arena Grid Pedestal Inset Disc */}
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full border transition-all pointer-events-none flex items-center justify-center ${
                      prepUnit
                        ? isPlayerHalf
                          ? 'border-amber-400/60 bg-amber-500/15 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                          : 'border-rose-400/60 bg-rose-500/15 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                        : isPlayerHalf
                        ? isHighlightActive
                          ? 'border-amber-400 bg-amber-500/30 shadow-[0_0_18px_rgba(245,158,11,0.7)]'
                          : 'border-amber-500/25 bg-slate-950/60'
                        : isHighlightActive
                        ? 'border-rose-400 bg-rose-500/25 shadow-[0_0_16px_rgba(244,63,94,0.6)]'
                        : 'border-rose-500/15 bg-slate-950/60'
                    }`}
                  >
                    {/* Inner core tactile spot */}
                    <div
                      className={`w-4 h-4 sm:w-4.5 sm:h-4.5 lg:w-5 lg:h-5 rounded-full transition-opacity ${
                        isPlayerHalf
                          ? prepUnit ? 'bg-amber-400/50' : isHighlightActive ? 'bg-amber-400/60' : 'bg-amber-500/20'
                          : prepUnit ? 'bg-rose-400/50' : 'bg-rose-500/20'
                      }`}
                    />
                  </div>

                  {/* Subtle Hex / Diamond Tile Accent Border */}
                  <div
                    className={`absolute inset-1 rounded-xl border border-dashed transition-opacity pointer-events-none ${
                      isPlayerHalf ? 'border-amber-500/30' : 'border-rose-500/20'
                    } ${isHighlightActive ? 'opacity-100' : isDraggingActive && isPlayerHalf ? 'opacity-50' : 'opacity-25'}`}
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

          {/* PREPARATION PHASE: DEDICATED CONTINUOUS OVERLAY LAYER */}
          {!isCombatPhase && (
            <div
              className="absolute inset-6 sm:inset-7 pointer-events-none z-30"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {boardUnits.map((pUnit) => {
                if (pUnit.gridX < 0 || pUnit.gridY < 0) return null;
                const isBeingDragged = draggedUnit?.instanceId === pUnit.instanceId;
                // Precise tile center percentage taking responsive tile dimensions and gaps into account
                const { leftPercent, topPercent } = getTileCenterPercent(pUnit.gridX, pUnit.gridY);

                return (
                  <div
                    key={pUnit.instanceId}
                    className={`absolute transition-all duration-200 ease-out pointer-events-none ${
                      isBeingDragged ? 'opacity-30 scale-95 ring-2 ring-amber-400 rounded-2xl' : ''
                    }`}
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      transform: `translate(-50%, -${FEET_ANCHOR_Y_PERCENT}%)`,
                      transformStyle: 'preserve-3d',
                      zIndex: pUnit.gridY * 10 + pUnit.gridX + 10,
                    }}
                  >
                    {/* Floor Shadow Disc centered precisely underneath the champion feet */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/70 blur-[3px] pointer-events-none"
                      style={{ top: `${FEET_ANCHOR_Y_PERCENT}%`, transform: 'translate(-50%, -50%) translateZ(1px)' }}
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
              className="absolute inset-6 sm:inset-7 pointer-events-none z-30"
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
                const isMonster2x2 = cUnit.unitId === 'chopper' && Boolean(cUnit.isTransformed);
                // Continuous exact percentage position inside the 8x5 grid
                const { leftPercent, topPercent } = getContinuousTileCenterPercent(cUnit.currentPosX, cUnit.currentPosY);

                return (
                  <div
                    key={cUnit.instanceId}
                    className="absolute pointer-events-auto transition-[left,top] duration-150 ease-linear"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      transform: `translate(-50%, -${FEET_ANCHOR_Y_PERCENT}%)`,
                      transformStyle: 'preserve-3d',
                      zIndex: (Math.round(cUnit.currentPosY) * 10 + Math.round(cUnit.currentPosX) + 10) + (isMonster2x2 ? 15 : 0),
                    }}
                  >
                    {/* Floor Shadow Disc underneath the combatant feet (2x2 expanded for Monster Chopper) */}
                    {!cUnit.isDefeated && cUnit.hp > 0 && (
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 ${
                          isMonster2x2 ? 'w-28 h-28 bg-black/85 blur-[6px]' : 'w-12 h-12 bg-black/70 blur-[4px]'
                        } rounded-full pointer-events-none transition-all duration-300`}
                        style={{ top: `${FEET_ANCHOR_Y_PERCENT}%`, transform: 'translate(-50%, -50%) translateZ(1px)' }}
                      />
                    )}

                    {/* Upright 3D Tactical Billboarding Unit Token */}
                    {renderUnitToken(cUnit, true, false)}
                  </div>
                );
              })}
            </div>
          )}

          {/* COMBAT PHASE: FLOATING COMBAT TEXTS LAYER (ELEVATED ABOVE CHAMPION HEADS) */}
          {isCombatPhase && floatingTexts.length > 0 && (
            <div
              className="absolute inset-6 sm:inset-7 pointer-events-none z-50 overflow-visible"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {floatingTexts.map((ft, idx) => {
                const isKO = String(ft.value).toUpperCase().includes('DERROTADO');
                // Remove defeated text completely for an ultra-clean visual
                if (isKO) return null;

                const { leftPercent, topPercent } = getContinuousTileCenterPercent(ft.x, ft.y);
                const isCrit = Boolean(ft.isCrit) || String(ft.value).includes('💥') || ft.type === 'CRIT';
                const isHeal = ft.type === 'HEAL' || String(ft.value).startsWith('+');

                // Elevated above the character's head in isometric billboard projection
                const yOffsetPx = isCrit ? -150 : -130;

                // Pure numeric/value string with any 'CRIT' or symbols stripped away
                const cleanValue = String(ft.value).replace(/💥|crit!?/gi, '').trim();

                return (
                  <div
                    key={ft.id ? `${ft.id}_${idx}` : `ft_${idx}`}
                    className="absolute select-none pointer-events-none"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      transform: `translate(-50%, -50%) rotateZ(30deg) rotateX(-55deg) translateY(${yOffsetPx}px)`,
                    }}
                  >
                    <div className={isCrit ? 'animate-crit-float' : 'animate-damage-float'}>
                      {isCrit ? (
                        /* Critical Damage: Increased font size, RED, rising and fading */
                        <div className="font-mono font-black text-2xl sm:text-4xl text-red-500 drop-shadow-[0_0_16px_rgba(239,68,68,0.95)] drop-shadow-[0_3px_6px_rgba(0,0,0,1)] tracking-tight">
                          {cleanValue}
                        </div>
                      ) : isHeal ? (
                        <div className="font-mono font-black text-xs sm:text-sm text-emerald-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                          {cleanValue}
                        </div>
                      ) : (
                        /* Normal Hit: Yellow, clean font with high-contrast shadow */
                        <div className="font-mono font-black text-sm sm:text-lg text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                          {cleanValue}
                        </div>
                      )}
                    </div>
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


