import React, { useState } from 'react';
import { UnitInstance } from '../types/game';
import { AttackEffect, CombatUnitState, FloatingText } from '../types/combat';
import { Swords, User, Anchor, Crown, Flame, Zap, Coins, Eye } from 'lucide-react';
import { SYNERGY_DATABASE } from '../data/synergies';
import { CHAMPION_DATABASE } from '../data/units';
import { ITEM_DATABASE } from '../data/items';
import { ChampionVisual } from './ChampionVisual';
import { Champion3DModel, ChampionHitTester } from './Champion3DModel';
import { Commander } from '../types/game';
import { getChampionTokenDimensions, isUnitEquippedWithOrb } from '../utils/gameUtils';

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
  pointerHoverTile?: { x: number; y: number } | null;
  pointerDragUnit?: UnitInstance | null;
  onStartPointerDrag?: (unit: UnitInstance, clientX: number, clientY: number) => void;
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
  pointerHoverTile = null,
  pointerDragUnit = null,
  onStartPointerDrag,
}) => {
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const hoveredTileRef = React.useRef<{ x: number; y: number } | null>(null);
  const showUnitHud = true;
  const [isHoldingUnit, setIsHoldingUnit] = useState(false);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [isHoveringChampionBody, setIsHoveringChampionBody] = useState(false);
  const hitTestersRef = React.useRef<Map<string, ChampionHitTester>>(new Map());

  const registerHitTester = (instanceId: string, tester: ChampionHitTester | null) => {
    if (tester) {
      hitTestersRef.current.set(instanceId, tester);
    } else {
      hitTestersRef.current.delete(instanceId);
    }
  };

  const findChampionAtPoint = (clientX: number, clientY: number): UnitInstance | null => {
    const activeUnits = (isCombatPhase ? combatUnits : boardUnits) as UnitInstance[];
    let bestUnit: UnitInstance | null = null;
    let minDistance = Infinity;

    // Prioritize units closer to the camera (higher Y coordinates)
    const sorted = [...activeUnits].sort((a, b) => {
      const posYa = (a as any).currentPosY ?? a.gridY ?? 0;
      const posYb = (b as any).currentPosY ?? b.gridY ?? 0;
      return posYb - posYa;
    });

    for (const unit of sorted) {
      const tester = hitTestersRef.current.get(unit.instanceId);
      if (!tester) continue;
      const res = tester(clientX, clientY);
      if (res.hit && res.distance < minDistance) {
        minDistance = res.distance;
        bestUnit = unit;
      }
    }

    return bestUnit;
  };

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
    isDraggingAllowed: boolean,
    onRegisterHitTester?: (tester: ChampionHitTester | null) => void
  ) => {
    const isSelected = unit.instanceId === selectedUnitId;
    const hasOrb = isUnitEquippedWithOrb(unit);
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
      ? 104
      : tokenDims.meters > 2.2
      ? 106
      : Math.round(28.5 + 61.5 * tokenDims.ratio);

    return (
      <div
        key={unit.instanceId}
        className={`relative flex flex-col items-center justify-end transition-all duration-300 select-none pointer-events-none ${
          isSelected && !isDead && !isCombatPhase
            ? 'scale-110 filter drop-shadow-[0_0_16px_rgba(245,158,11,0.95)]'
            : ''
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
              {hasOrb && (
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
            isSelected
              ? 'scale-105 drop-shadow-[0_0_16px_rgba(245,158,11,1)]'
              : ''
          } ${
            hasOrb && !isDead
              ? 'drop-shadow-[0_0_8px_rgba(168,85,247,0.75)]'
              : ''
          }`}
        >
          {/* 3D Model Instance with dynamic directional targeting, combo strikes and GLB animations */}
          <Champion3DModel
            unitId={unit.unitId}
            unitColor={unit.color || baseData?.color || '#F59E0B'}
            isEnemy={unit.isEnemy}
            hasOrb={hasOrb}
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
            onRegisterHitTester={onRegisterHitTester}
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

  const isDraggingActive = Boolean(draggedUnit || isHoldingUnit || isGlobalDragging || pointerDragUnit);

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
          data-arena-stadium="true"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onMouseLeave={() => {
            setHoveredTile(null);
            hoveredTileRef.current = null;
            setIsHoveringChampionBody(false);
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
          onPointerDown={(e) => {
            if (isCombatPhase || isViewingOpponentArena) return;
            if (e.button !== 0 && e.pointerType !== 'touch') return;
            const hitUnit = findChampionAtPoint(e.clientX, e.clientY);
            if (hitUnit && !hitUnit.isEnemy) {
              onStartPointerDrag?.(hitUnit, e.clientX, e.clientY);
            }
          }}
          onClick={(e) => {
            const hitUnit = findChampionAtPoint(e.clientX, e.clientY);
            if (hitUnit) {
              if (isCombatPhase || isViewingOpponentArena) {
                onUnitSelect(hitUnit);
                return;
              }
              if (selectedUnitId && selectedUnitId !== hitUnit.instanceId) {
                onTileClick(hitUnit.gridX, hitUnit.gridY);
              } else {
                onUnitSelect(hitUnit);
              }
            }
          }}
          onPointerMove={(e) => {
            if (isCombatPhase || isViewingOpponentArena || isDraggingActive) {
              if (isHoveringChampionBody) setIsHoveringChampionBody(false);
              return;
            }
            const hitUnit = findChampionAtPoint(e.clientX, e.clientY);
            const isPlayable = Boolean(hitUnit && !hitUnit.isEnemy);
            if (isPlayable !== isHoveringChampionBody) {
              setIsHoveringChampionBody(isPlayable);
            }
          }}
          className={`relative grid grid-cols-8 gap-2 sm:gap-2.5 p-6 sm:p-7 rounded-[2.5rem] bg-gradient-to-b from-slate-950/95 via-slate-900/90 to-slate-950/95 border-[3px] border-amber-500/30 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_60px_rgba(245,158,11,0.12)] backdrop-blur-2xl ring-1 ring-white/5 select-none ${
            isHoveringChampionBody && !isCombatPhase && !isViewingOpponentArena ? 'cursor-grab' : ''
          }`}
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
              const isHovered =
                (hoveredTile?.x === col && hoveredTile?.y === row) ||
                (pointerHoverTile?.x === col && pointerHoverTile?.y === row);
              const prepUnit = !isCombatPhase ? getPrepUnitAt(col, row) : null;
              const prepUnitIsSelected = prepUnit ? prepUnit.instanceId === selectedUnitId : false;
              // Highlight when dragging over tile
              const isHighlightActive = isHovered && isDraggingActive && !isCombatPhase && !isViewingOpponentArena;
              // Placement target indicator when a unit is selected for click-to-place
              const isPlacementTarget = Boolean(selectedUnitId && !isCombatPhase && !isViewingOpponentArena && isPlayerHalf && !isDraggingActive);

              return (
                <div
                  key={`${col}-${row}`}
                  data-arena-tile="true"
                  data-tile-x={col}
                  data-tile-y={row}
                  data-unit-tile={prepUnit ? 'true' : undefined}
                  draggable={false}
                  onDragStart={(e) => {
                    e.preventDefault();
                  }}
                  onPointerDown={(e) => {
                    if (isCombatPhase || isViewingOpponentArena) return;
                    if (e.button !== 0 && e.pointerType !== 'touch') return;

                    // 1. First priority: Check if pointer is on any champion's 3D body mesh!
                    const hitUnit = findChampionAtPoint(e.clientX, e.clientY);
                    if (hitUnit) {
                      if (!hitUnit.isEnemy) {
                        e.stopPropagation();
                        onStartPointerDrag?.(hitUnit, e.clientX, e.clientY);
                      }
                      return;
                    }

                    // 2. Second priority: If clicking the floor tile under a player unit
                    if (prepUnit && isPlayerHalf) {
                      onStartPointerDrag?.(prepUnit, e.clientX, e.clientY);
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
                  onClick={(e) => {
                    // 1. First priority: Check if pointer hit a champion's 3D body mesh!
                    const hitUnit = findChampionAtPoint(e.clientX, e.clientY);
                    if (hitUnit) {
                      e.stopPropagation();
                      if (isCombatPhase || isViewingOpponentArena) {
                        onUnitSelect(hitUnit);
                        return;
                      }
                      if (selectedUnitId && selectedUnitId !== hitUnit.instanceId) {
                        onTileClick(hitUnit.gridX, hitUnit.gridY);
                      } else {
                        onUnitSelect(hitUnit);
                      }
                      return;
                    }

                    // 2. Combat phase tile interaction: select nearest combat unit if any
                    if (isCombatPhase) {
                      const livingCombatUnits = combatUnits.filter((u) => !u.isDefeated && u.hp > 0);
                      const nearest = livingCombatUnits
                        .map((u) => ({ unit: u, dist: Math.hypot(u.currentPosX - col, u.currentPosY - row) }))
                        .filter((item) => item.dist <= 1.25)
                        .sort((a, b) => a.dist - b.dist)[0]?.unit;
                      if (nearest) {
                        onUnitSelect(nearest);
                      }
                      return;
                    }

                    if (isViewingOpponentArena) {
                      if (prepUnit) onUnitSelect(prepUnit);
                      return;
                    }

                    // Se clicou no mesmo personagem já selecionado, mantém selecionado e abre o inspector
                    if (prepUnit && selectedUnitId === prepUnit.instanceId) {
                      onUnitSelect(prepUnit);
                      return;
                    }

                    // Se há outro personagem selecionado e clicou em outro tile (vazio ou outra unidade para swap)
                    if (selectedUnitId && (!prepUnit || selectedUnitId !== prepUnit.instanceId)) {
                      onTileClick(col, row);
                      return;
                    }

                    // Se clicou numa unidade sem ter outra selecionada: seleciona a unidade!
                    if (prepUnit) {
                      onUnitSelect(prepUnit);
                      return;
                    }

                    // Clicou em tile vazio
                    onTileClick(col, row);
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
                  className={`w-[66px] h-[66px] sm:w-[78px] sm:h-[78px] lg:w-[88px] lg:h-[88px] rounded-2xl relative flex items-center justify-center transition-all duration-150 touch-none ${
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
                        ? prepUnitIsSelected
                          ? 'bg-amber-950/80 border-amber-400 shadow-inner ring-1 ring-amber-400/50'
                          : 'bg-slate-900/95 border-amber-500/40 shadow-inner'
                        : isPlacementTarget
                        ? 'bg-amber-950/40 border-amber-400/80 shadow-[0_0_16px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/50 hover:bg-amber-500/25 hover:scale-105 animate-pulse'
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
                          ? prepUnitIsSelected
                            ? 'border-amber-400 bg-amber-500/25 shadow-[0_0_16px_rgba(245,158,11,0.7)] ring-1 ring-amber-400/40'
                            : 'border-amber-400/60 bg-amber-500/15 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
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
                          ? prepUnit
                            ? prepUnitIsSelected
                              ? 'bg-amber-400/80 shadow-[0_0_6px_rgba(245,158,11,0.9)]'
                              : 'bg-amber-400/50'
                            : isHighlightActive
                            ? 'bg-amber-400/60'
                            : 'bg-amber-500/20'
                          : prepUnit
                          ? 'bg-rose-400/50'
                          : 'bg-rose-500/20'
                      }`}
                    />
                  </div>

                  {/* Placement Indicator for Click-to-Place */}
                  {isPlacementTarget && !prepUnit && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <span className="text-amber-300/90 font-black text-base drop-shadow-[0_0_10px_rgba(245,158,11,0.9)] animate-pulse">
                        +
                      </span>
                    </div>
                  )}

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
                const isSelected = pUnit.instanceId === selectedUnitId;
                const hasOrb = isUnitEquippedWithOrb(pUnit);
                // Precise tile center percentage taking responsive tile dimensions and gaps into account
                const { leftPercent, topPercent } = getTileCenterPercent(pUnit.gridX, pUnit.gridY);

                return (
                  <div
                    key={pUnit.instanceId}
                    data-champion-token="true"
                    data-unit-slot="true"
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

                    {/* Destaque de Seleção Dourado no Chão */}
                    {isSelected && (
                      <div
                        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 sm:w-16 sm:h-16 lg:w-[70px] lg:h-[70px] rounded-full border-2 border-amber-400/90 bg-amber-500/15 shadow-[0_0_18px_rgba(245,158,11,0.85)] pointer-events-none animate-pulse"
                        style={{ top: `${FEET_ANCHOR_Y_PERCENT}%`, transform: 'translate(-50%, -50%) translateZ(3px)' }}
                      />
                    )}

                    {/* Upright 3D Tactical Billboarding Unit Token */}
                    {renderUnitToken(pUnit, false, !isViewingOpponentArena && !pUnit.isEnemy, (tester) => registerHitTester(pUnit.instanceId, tester))}
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
                const isSelected = cUnit.instanceId === selectedUnitId;
                const hasOrb = isUnitEquippedWithOrb(cUnit);
                const isAlive = !cUnit.isDefeated && cUnit.hp > 0;
                // Continuous exact percentage position inside the 8x5 grid
                const { leftPercent, topPercent } = getContinuousTileCenterPercent(cUnit.currentPosX, cUnit.currentPosY);

                return (
                  <div
                    key={cUnit.instanceId}
                    data-champion-token="true"
                    data-unit-slot="true"
                    className="absolute pointer-events-none transition-[left,top] duration-150 ease-linear"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      transform: `translate(-50%, -${FEET_ANCHOR_Y_PERCENT}%)`,
                      transformStyle: 'preserve-3d',
                      zIndex: (Math.round(cUnit.currentPosY) * 10 + Math.round(cUnit.currentPosX) + 10) + (isMonster2x2 ? 15 : 0),
                    }}
                  >
                    {/* Floor Shadow Disc underneath the combatant feet (2x2 expanded for Monster Chopper) */}
                    {isAlive && (
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 ${
                          isMonster2x2 ? 'w-28 h-28 bg-black/85 blur-[6px]' : 'w-12 h-12 bg-black/70 blur-[4px]'
                        } rounded-full pointer-events-none transition-all duration-300`}
                        style={{ top: `${FEET_ANCHOR_Y_PERCENT}%`, transform: 'translate(-50%, -50%) translateZ(1px)' }}
                      />
                    )}

                    {/* Ground base highlight intentionally omitted in combat per user request ("não precisa ascender a base dele, isso só na batalha") */}

                    {/* Upright 3D Tactical Billboarding Unit Token */}
                    {renderUnitToken(cUnit, true, false, (tester) => registerHitTester(cUnit.instanceId, tester))}

                    {/* Interactive hit target during combat to inspect unit stats, items & skill */}
                    {isAlive && (
                      <button
                        type="button"
                        id={`combat-unit-inspect-${cUnit.instanceId}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnitSelect(cUnit);
                        }}
                        className="absolute left-1/2 -translate-x-1/2 w-20 h-28 pointer-events-auto cursor-pointer z-50 bg-transparent border-0 outline-none"
                        style={{ bottom: `${100 - FEET_ANCHOR_Y_PERCENT}%` }}
                        title={`Clique para ver informações de ${cUnit.name}`}
                        aria-label={`Inspecionar ${cUnit.name}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* COMBAT PHASE: ATTACK EFFECTS & RANGED PROJECTILES LAYER */}
          {isCombatPhase && attackEffects.length > 0 && (
            <div
              className="absolute inset-6 sm:inset-7 pointer-events-none z-45 overflow-visible"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {attackEffects.map((fx) => {
                const from = getContinuousTileCenterPercent(fx.fromX, fx.fromY);
                const to = getContinuousTileCenterPercent(fx.toX, fx.toY);
                const isEmeraldSlash = fx.color === '#10B981' || fx.icon === '🗡️';

                // Trafalgar Law's Iconic ROOM Sphere Dome
                if (fx.type === 'ROOM_SPHERE') {
                  const r = fx.radius || 1.15;
                  // Radius in tiles strictly mapped: 1 tile = 25% diameter, 2 tiles = 50%, 3 tiles = 75%, 8 tiles = 180%
                  const diameterPercent = Math.min(190, Math.max(26, (r * 2) * 12.5));

                  return (
                    <div
                      key={fx.id}
                      className="absolute pointer-events-none z-30 flex items-center justify-center transition-all duration-300"
                      style={{
                        left: `${from.leftPercent}%`,
                        top: `${from.topPercent}%`,
                        width: `${diameterPercent}%`,
                        aspectRatio: '1 / 1',
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {/* 3D Transparent Blue ROOM Bubble */}
                      <div
                        className="w-full h-full rounded-full relative flex items-center justify-center animate-in zoom-in-50 duration-300 pointer-events-none select-none overflow-visible"
                        style={{
                          background: 'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.08) 0%, rgba(56, 189, 248, 0.18) 55%, rgba(14, 165, 233, 0.35) 85%, rgba(56, 189, 248, 0.75) 100%)',
                          border: '2.5px solid rgba(186, 230, 253, 0.85)',
                          boxShadow: '0 0 35px rgba(56, 189, 248, 0.75), inset 0 0 35px rgba(56, 189, 248, 0.45)',
                        }}
                      >
                        {/* Ground projection ring inside the isometric dome */}
                        <div className="absolute bottom-1 w-[92%] h-[45%] rounded-full border border-sky-300/70 shadow-[0_0_16px_rgba(56,189,248,0.7)]" />
                        
                        {/* Electric surgical boundary scanline */}
                        <div className="absolute inset-2 rounded-full border border-dashed border-sky-200/40 opacity-70 animate-pulse" />

                        {/* ROOM Glowing Tactical Tag */}
                        <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-slate-950/85 border border-sky-400/90 shadow-[0_0_12px_rgba(56,189,248,0.9)] backdrop-blur-sm flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                          <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-sky-200 uppercase">ROOM</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Counter Shock Electric Discharge
                if (fx.type === 'COUNTER_SHOCK') {
                  return (
                    <div
                      key={fx.id}
                      className="absolute pointer-events-none z-40"
                      style={{
                        left: `${from.leftPercent}%`,
                        top: `${from.topPercent}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div
                        className="animate-projectile-fly flex items-center justify-center pointer-events-none"
                        style={{
                          ['--target-dx' as any]: `${(to.leftPercent - from.leftPercent) * 7.5}px`,
                          ['--target-dy' as any]: `${(to.topPercent - from.topPercent) * 4.5}px`,
                          ['--fly-duration' as any]: `${fx.durationMs || 500}ms`,
                        }}
                      >
                        <div className="relative flex items-center justify-center">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-sky-400/30 blur-[4px] animate-ping" />
                          <div className="w-8 h-4 bg-gradient-to-r from-sky-300 via-cyan-100 to-sky-400 rounded-full shadow-[0_0_20px_#38bdf8] border border-cyan-200 animate-pulse" />
                          <div className="absolute text-sm sm:text-base font-black drop-shadow-[0_0_8px_#38bdf8]">⚡</div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={fx.id}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${from.leftPercent}%`,
                      top: `${from.topPercent}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div
                      className="animate-projectile-fly flex items-center justify-center pointer-events-none"
                      style={{
                        ['--target-dx' as any]: `${(to.leftPercent - from.leftPercent) * 7.5}px`,
                        ['--target-dy' as any]: `${(to.topPercent - from.topPercent) * 4.5}px`,
                        ['--fly-duration' as any]: `${fx.durationMs || 280}ms`,
                      }}
                    >
                      {isEmeraldSlash ? (
                        /* Mihawk's Signature Emerald Flying Blade Slash (Kokuto Yoru Sen) */
                        <div className="relative flex items-center justify-center">
                          <div className="w-10 h-3 sm:w-14 sm:h-4 bg-gradient-to-r from-emerald-400 via-teal-200 to-emerald-500 rounded-full blur-[1px] shadow-[0_0_18px_#10b981] -rotate-12 border border-emerald-200" />
                          <div className="absolute w-8 h-1.5 bg-white rounded-full shadow-[0_0_8px_#fff]" />
                        </div>
                      ) : fx.type === 'PROJECTILE' ? (
                        /* Generic ranged energy blast or slingshot bullet */
                        <div
                          className="w-4 h-4 rounded-full shadow-md flex items-center justify-center border text-[10px]"
                          style={{
                            backgroundColor: fx.color || '#F59E0B',
                            borderColor: '#ffffff',
                            boxShadow: `0 0 10px ${fx.color || '#F59E0B'}`,
                          }}
                        >
                          {fx.icon || '⚡'}
                        </div>
                      ) : (
                        /* Melee impact spark / slash flare */
                        <div
                          className="w-8 h-8 rounded-full animate-ping opacity-75"
                          style={{
                            backgroundColor: fx.color || '#F59E0B',
                            boxShadow: `0 0 15px ${fx.color || '#F59E0B'}`,
                          }}
                        />
                      )}
                    </div>
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
              {floatingTexts.map((ft) => {
                const strVal = String(ft.value).trim();
                const isKO = strVal.toUpperCase().includes('DERROTADO');
                // Remove defeated text completely for an ultra-clean visual
                if (isKO) return null;

                // Allow numbers as well as special tactical skill callouts (SHAMBLES, TACT, PURIFICADO, SULONG)
                const isSpecialCallout = strVal.includes('SHAMBLES') || strVal.includes('TACT') || strVal.includes('PURIFICADO') || strVal.includes('SULONG');
                const hasDigits = /\d/.test(strVal);
                if (!hasDigits && !isSpecialCallout) return null;

                const { leftPercent, topPercent } = getContinuousTileCenterPercent(ft.x, ft.y);
                const isHeal = ft.type === 'HEAL' || strVal.startsWith('+');

                // Color rules per user instruction:
                // - Especial do Orbe (ou Crítico): Vermelho
                // - Habilidades (Skill 1 ou 2): Azul
                // - Ataque Básico: Amarelo
                const isOrbSpecial = ft.sourceType === 'ORB_SPECIAL' || ft.color === '#EF4444' || ft.color === '#DC2626' || Boolean(ft.isCrit);
                const isSkill = !isOrbSpecial && (ft.sourceType === 'SKILL' || ft.color === '#38BDF8' || ft.color === '#60A5FA' || ft.type === 'SKILL');

                // Pure numeric/value string with any 'CRIT' or symbols stripped away
                const cleanValue = strVal.replace(/💥|crit!?/gi, '').trim();
                if (!cleanValue) return null;

                // Elevated above the character's head in isometric billboard projection
                const yOffsetPx = isOrbSpecial ? -150 : -130;

                return (
                  <div
                    key={ft.id}
                    className="absolute select-none pointer-events-none"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      transform: `translate(-50%, -50%) rotateZ(30deg) rotateX(-55deg) translateY(${yOffsetPx}px)`,
                    }}
                  >
                    <div className={isOrbSpecial ? 'animate-crit-float' : 'animate-damage-float'}>
                      {isHeal ? (
                        /* Cura: Verde */
                        <div className="font-mono font-black text-xs sm:text-sm text-emerald-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                          {cleanValue}
                        </div>
                      ) : isOrbSpecial ? (
                        /* Especial ativado com Orb: Vermelho */
                        <div className="font-mono font-black text-2xl sm:text-4xl text-red-500 drop-shadow-[0_0_16px_rgba(239,68,68,0.95)] drop-shadow-[0_3px_6px_rgba(0,0,0,1)] tracking-tight">
                          {cleanValue}
                        </div>
                      ) : isSkill ? (
                        /* Habilidades (Skill 1 ou 2): Azul */
                        <div className="font-mono font-black text-base sm:text-2xl text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.9)] drop-shadow-[0_3px_6px_rgba(0,0,0,1)] tracking-tight">
                          {cleanValue}
                        </div>
                      ) : (
                        /* Ataque Básico: Amarelo */
                        <div className="font-mono font-black text-sm sm:text-lg text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.85)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
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

      {/* SCOUTING ARENA FLOATING HUD INDICATOR (FLAT 2D UPRIGHT HUD) */}
      {isViewingOpponentArena && viewingCommander && !isCombatPhase && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-950/95 border border-cyan-500/60 shadow-[0_0_25px_rgba(6,182,212,0.35)] backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <Eye className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
          <span className="text-xs text-slate-200">
            Espionando: <strong className="text-cyan-300 font-black">{viewingCommander.name}</strong> • Posicionamento espelhado no lado inimigo (Direita)
          </span>
        </div>
      )}

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


