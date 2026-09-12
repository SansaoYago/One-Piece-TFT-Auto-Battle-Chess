import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { loadChampionModularRig, loadChampionSkinModel, loadChampionAttackAnimation, retargetClipToModel, sanitizeAnimationClip, ChampionRigData, isFemaleChampion } from '../utils/modelPreloader';
import { createProceduralMannequin, ProceduralMannequin } from '../utils/proceduralMannequin';
import { enrichMixamoModelIfNeeded } from '../utils/mixamoBodyEnricher';
import { createBuggyBaraBaraController, BuggyBaraBaraController } from '../utils/buggyBaraBaraController';
import { attachChampionWeapons } from '../utils/championWeapons';
import { getChampionLoreHeightMeters } from '../utils/gameUtils';

interface Champion3DModelProps {
  unitId: string;
  unitColor?: string;
  isEnemy?: boolean;
  isStunned?: boolean;
  isCasting?: boolean;
  isTransformed?: boolean;
  transformationPhase?: 'NONE' | 'INVOKING' | 'TRANSFORMED' | 'UNCONSCIOUS';
  isUnconscious?: boolean;
  stars?: number;
  animationName?: 'idle' | 'walk' | 'punch' | 'punch1' | 'punch2' | 'punch3' | 'punch4' | 'kick' | 'kick1' | 'kick2' | 'kick3' | 'attack' | 'turnLeft' | 'turnRight' | 'death' | 'monster_invoke';
  lastAttackTimestamp?: number;
  currentPos?: { x: number; y: number } | null;
  targetPos?: { x: number; y: number } | null;
  facingAngle?: number;
  className?: string;
}

// Shortest angle difference to avoid spinning 360 degrees
function lerpAngle(current: number, target: number, speed: number) {
  let diff = (target - current) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return current + diff * speed;
}

// Configuração de calibração de ângulo de Pré-Batalha / Idle (em radianos).
// Permite ajustar a inclinação de qualquer personagem durante a fase de preparação / pré-batalha
// sem afetar a mira precisa durante os ataques de combate.
export const CHAMPION_IDLE_ANGLE_OFFSETS: Record<string, number> = {
  // Exemplo: 'zoro': 0, // Pode ser ajustado facilmente se no futuro usar uma animação pré-battle inclinada
};

// Helper to compute target rotation Y based on positions and team
function computeTargetRotationY(
  isEnemy: boolean,
  currentPos?: { x: number; y: number } | null,
  targetPos?: { x: number; y: number } | null,
  facingAngle?: number,
  unitId?: string
): number {
  if (typeof facingAngle === 'number') {
    return facingAngle;
  }

  if (targetPos && currentPos) {
    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    if (Math.hypot(dx, dy) > 0.05) {
      // Map (dx, dy) in 8x6 grid coordinates through isometric rotation (rotateX 55deg, rotateZ -30deg)
      const cosA = 0.866025;   // cos(-30deg)
      const sinA = -0.5;        // sin(-30deg)
      const cosTilt = 0.573576; // cos(55deg)

      const sx = dx * cosA - dy * sinA;
      const sy = (dx * sinA + dy * cosA) * cosTilt;

      return Math.atan2(sx, sy);
    }
  }

  // Natural isometric idle stance aligned precisely with arena grid lines:
  // Player (cols 0-3): facing enemy side along grid line (dx = +1, dy = 0) => atan2(0.866, -0.287) ~ 1.89 rad (108deg)
  // Enemy (cols 4-7): facing player side along grid line (dx = -1, dy = 0) => atan2(-0.866, 0.287) ~ -1.25 rad (-72deg)
  const baseAngle = isEnemy ? -1.25 : 1.89;
  const idleOffset = unitId ? (CHAMPION_IDLE_ANGLE_OFFSETS[unitId.toLowerCase()] || 0) : 0;
  return baseAngle + idleOffset;
}

export const Champion3DModel: React.FC<Champion3DModelProps> = ({
  unitId,
  unitColor = '#F59E0B',
  isEnemy = false,
  isStunned = false,
  isCasting = false,
  isTransformed = false,
  transformationPhase = 'NONE',
  isUnconscious = false,
  stars = 1,
  animationName = 'idle',
  lastAttackTimestamp,
  currentPos,
  targetPos,
  facingAngle,
  className = 'w-full h-full',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<{ [key: string]: THREE.AnimationAction }>({});
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const mannequinRef = useRef<ProceduralMannequin | null>(null);
  const buggyControllerRef = useRef<BuggyBaraBaraController | null>(null);
  const animStateRef = useRef<'idle' | 'walk' | 'punch' | 'cast'>('idle');

  const targetRotationYRef = useRef<number>(
    computeTargetRotationY(isEnemy, currentPos, targetPos, facingAngle, unitId)
  );
  const [isReady, setIsReady] = useState(false);

  // Update target rotation ref whenever positions or target change
  useEffect(() => {
    targetRotationYRef.current = computeTargetRotationY(
      isEnemy,
      currentPos,
      targetPos,
      facingAngle,
      unitId
    );
  }, [isEnemy, currentPos?.x, currentPos?.y, targetPos?.x, targetPos?.y, facingAngle, unitId]);

  const isNami = unitId?.toLowerCase().includes('nami');
  const isUsopp = unitId?.toLowerCase().includes('usopp');

  // Determine active action key
  const getActionKey = (): string => {
    if (animationName === 'monster_invoke' || transformationPhase === 'INVOKING') {
      return 'monster_invoke';
    }
    if (isNami) {
      // Nami currently has no attack animation: stays in idle/rest pose during attacks
      if (animationName === 'walk') return 'walk';
      if (animationName === 'turnLeft') return 'turnLeft';
      if (animationName === 'turnRight') return 'turnRight';
      if (animationName === 'death') return 'death';
      return 'idle';
    }
    if (isUsopp) {
      if (isCasting || animationName?.includes('punch') || animationName?.includes('kick') || animationName === 'attack' || animationName === 'slash1') {
        return 'attack';
      }
    }
    if (isCasting) return 'kick1';
    if (animationName === 'punch' || animationName === 'punch1' || animationName === 'attack' || animationName === 'slash1') return 'punch1';
    if (animationName === 'punch2') return 'punch2';
    if (animationName === 'punch3') return 'punch3';
    if (animationName === 'punch4') return 'punch4';
    if (animationName === 'kick' || animationName === 'kick1') return 'kick1';
    if (animationName === 'kick2') return 'kick2';
    if (animationName === 'kick3') return 'kick3';
    if (animationName === 'turnLeft') return 'turnLeft';
    if (animationName === 'turnRight') return 'turnRight';
    if (animationName === 'walk') return 'walk';
    if (animationName === 'death') return 'death';
    return 'idle';
  };

  // Crossfade and trigger animation clips
  useEffect(() => {
    const targetKey = getActionKey();

    // Procedural fallback state
    if (isCasting) {
      animStateRef.current = isUsopp ? 'punch' : isNami ? 'idle' : 'cast';
    } else if (animationName?.includes('punch') || animationName === 'attack' || animationName === 'slash1' || animationName?.includes('kick')) {
      animStateRef.current = isNami ? 'idle' : 'punch';
    } else if (animationName === 'walk' || animationName === 'turnLeft' || animationName === 'turnRight') {
      animStateRef.current = 'walk';
    } else {
      animStateRef.current = 'idle';
    }

    if (!mixerRef.current || !actionsRef.current) return;

    let targetAction = actionsRef.current[targetKey];
    if (isNami) {
      targetAction = targetKey === 'walk'
        ? (actionsRef.current['walk'] || actionsRef.current['idle'])
        : actionsRef.current['idle'];
    } else if (isUsopp && (targetKey.startsWith('punch') || targetKey.startsWith('kick') || targetKey === 'attack')) {
      targetAction = actionsRef.current['attack'] || actionsRef.current['punch1'] || actionsRef.current['idle'];
    }
    if (!targetAction && targetKey.startsWith('punch')) {
      targetAction = actionsRef.current['punch1'] || actionsRef.current['punch'] || actionsRef.current['idle'];
    }
    if (!targetAction && targetKey.startsWith('kick')) {
      targetAction = isUsopp
        ? (actionsRef.current['attack'] || actionsRef.current['punch1'] || actionsRef.current['idle'])
        : (actionsRef.current['kick1'] || actionsRef.current['kick'] || actionsRef.current['punch1'] || actionsRef.current['idle']);
    }
    if (!targetAction && (targetKey === 'turnLeft' || targetKey === 'turnRight')) {
      targetAction = actionsRef.current['walk'] || actionsRef.current['idle'];
    }
    if (!targetAction) {
      targetAction = actionsRef.current['idle'];
    }

    if (targetAction) {
      const isAttackStrike = targetKey.startsWith('punch') || targetKey.startsWith('kick');

      if (isAttackStrike) {
        // Strike execution: immediately replay with high impact
        targetAction.reset();
        targetAction.setEffectiveTimeScale(1.15);
        targetAction.setEffectiveWeight(1);
        targetAction.fadeIn(0.08);
        targetAction.play();

        if (activeActionRef.current && activeActionRef.current !== targetAction) {
          activeActionRef.current.fadeOut(0.08);
        }
        activeActionRef.current = targetAction;
      } else if (targetAction !== activeActionRef.current) {
        // Non-attack transitions (walk, idle, turns)
        const prevAction = activeActionRef.current;
        
        targetAction.enabled = true;
        targetAction.paused = false;
        targetAction.setLoop(THREE.LoopRepeat, Infinity);
        targetAction.clampWhenFinished = false;
        targetAction.setEffectiveTimeScale(animationName === 'walk' ? 1.10 : 1.0);
        targetAction.setEffectiveWeight(1);

        // Only reset if it is not currently running or has finished, to avoid micro-freezes/stutters
        if (!targetAction.isRunning() && targetAction.time === 0) {
          targetAction.reset();
        }

        targetAction.fadeIn(0.10);
        targetAction.play();

        if (prevAction && prevAction !== targetAction) {
          prevAction.fadeOut(0.10);
        }
        activeActionRef.current = targetAction;
      }
    } else {
      // Skinned character in idle: fade out active animation so model returns cleanly to its own SkinPersonagem rest pose
      if (activeActionRef.current) {
        activeActionRef.current.fadeOut(0.12);
        activeActionRef.current = null;
      }
    }
  }, [animationName, isCasting, lastAttackTimestamp]);

  // Main Three.js Scene Setup
  useEffect(() => {
    let isMounted = true;
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 100;
    const height = container.clientHeight || 120;

    const scene = new THREE.Scene();
    // 50° FOV provides real 3D depth, perspective foreshortening and character volume
    const fov = 50;
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 100);

    // Dynamic isometric camera framing
    const baselineHeight = 1.45; // Luffy 1.74m canonical baseline
    const normId = unitId?.toLowerCase() || '';
    const isMonster = normId === 'chopper' && Boolean(isTransformed);
    const loreHeight = getChampionLoreHeightMeters(unitId, isTransformed);
    const targetHeight = (loreHeight / 1.74) * 1.45;

    // Tactical top-down isometric angle (~48°)
    // For standard 1x1 champions, the camera distance is anchored to the common 1.74m baseline.
    // This ensures a 1.0m character like Chopper visually appears at his true 1.0m canonical size (57% of Luffy),
    // rather than having the camera zoom in and artificially magnifying him to adult size.
    // Monster Chopper (2x2 giant) expands camera distance to accommodate his colossal 3.8m form.
    const refHeight = isMonster ? targetHeight : baselineHeight;
    const yCenter = isMonster ? targetHeight * 0.54 : baselineHeight * 0.52;
    const camDist = (isMonster ? 1.40 : 1.35) * refHeight;
    const camY = yCenter + camDist * 0.7431; // sin(48°)
    const camZ = camDist * 0.6691;          // cos(48°)
    camera.position.set(0, camY, camZ);
    camera.lookAt(0, yCenter, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
      precision: 'mediump',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;

    container.innerHTML = '';
    renderer.domElement.style.pointerEvents = 'none';
    renderer.domElement.style.userSelect = 'none';
    container.appendChild(renderer.domElement);

    // Responsive dynamic resize observer to maintain aspect ratio during transformations and screen changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // Soft subtle grounding shadow disc under feet scaled to champion size
    const shadowRadius = Math.max(0.65, Math.min(2.0, 0.85 * (targetHeight / 1.45)));
    const shadowGeo = new THREE.PlaneGeometry(shadowRadius, shadowRadius);
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const groundShadow = new THREE.Mesh(shadowGeo, shadowMat);
    groundShadow.rotation.x = -Math.PI / 2;
    groundShadow.position.y = 0.005;
    scene.add(groundShadow);

    // Dynamic Crisp Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 3.4);
    dirLight.position.set(2.5, 6, 4.5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 2.2);
    rimLight.position.set(isEnemy ? 2 : -2, 4, -3);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(isEnemy ? 0xf43f5e : 0x38bdf8, 1.8);
    fillLight.position.set(isEnemy ? 2.5 : -2.5, 1.5, 2.5);
    scene.add(fillLight);

    // Three.js Render Loop & Timing
    let animFrameId: number;
    let lastTime = performance.now();

    // Load Modular Rig, Champion Skin (e.g. SkinChopperMonster.glb) and Custom Attack in parallel
    Promise.all([
      loadChampionModularRig(),
      loadChampionSkinModel(unitId, isTransformed).catch(() => null),
      loadChampionAttackAnimation(unitId).catch(() => null),
    ])
      .then(([rigData, customSkin, customAttackClip]) => {
        if (!isMounted) return;

        try {
          // Dedicated 3D models available for Luffy, Zoro, Nami, Usopp, or any champion with customSkin
          const normId = unitId.toLowerCase();
          const isLuffy = normId === 'luffy';
          const isZoro = normId === 'zoro';
          const isNami = normId === 'nami';
          const isUsopp = normId === 'usopp';
          const isMarine = normId.startsWith('marine_recruit');
          const isChopper = normId === 'chopper' || normId === 'chopper_monster';

          if (!isLuffy && !isZoro && !isNami && !isUsopp && !customSkin) {
            fallbackToProcedural();
            return;
          }

          let customSkinHasMesh = false;
          customSkin?.object.traverse((child) => {
            if ((child as THREE.Mesh).isMesh || (child as THREE.SkinnedMesh).isSkinnedMesh) {
              customSkinHasMesh = true;
            }
          });
          const useBaseModelForMarine = isMarine && !customSkinHasMesh;
          const isDedicatedCustomSkin = !useBaseModelForMarine;
          const sourceModel = useBaseModelForMarine ? rigData.baseModel : customSkin?.object || rigData.baseModel;

          if (!sourceModel) {
            fallbackToProcedural();
            return;
          }

          // Check if the model has bone structures or skinned mesh for skeletal animation
          let hasBonesOrSkin = false;
          sourceModel.traverse((child) => {
            if ((child as THREE.SkinnedMesh).isSkinnedMesh || (child as THREE.Bone).isBone) {
              hasBonesOrSkin = true;
            }
          });

          // Clone either via SkeletonUtils (for bones) or standard deep clone
          const clonedRig = (hasBonesOrSkin
            ? SkeletonUtils.clone(sourceModel)
            : sourceModel.clone(true)) as THREE.Group;

          // 1. Reset root rotation - models are upright Y-up and face forward
          clonedRig.rotation.set(0, 0, 0);

          // 2. Configure SkinnedMesh and bones if rigged
          if (hasBonesOrSkin) {
            clonedRig.traverse((child) => {
              if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
                const skinnedMesh = child as THREE.SkinnedMesh;
                skinnedMesh.frustumCulled = false;
                skinnedMesh.matrixAutoUpdate = true;

                if (skinnedMesh.geometry) {
                  skinnedMesh.geometry.computeBoundingBox();
                  skinnedMesh.geometry.computeBoundingSphere();
                }
              }

              if ((child as THREE.Bone).isBone) {
                const bone = child as THREE.Bone;
                bone.matrixAutoUpdate = true;
              }
            });
          }

          // 3. Filter alternate/duplicate face parts on Luffy's Wano model
          if (normId === 'luffy') {
            clonedRig.traverse((child) => {
              const name = child.name || '';
              if (
                name.includes('24_-') ||
                name.includes('25_-') ||
                name.includes('Sad') ||
                name.includes('Hawk Rifle') ||
                name.includes('TeethBroken') ||
                name.includes('Eyes Mad')
              ) {
                child.visible = false;
              }
            });
          }

          // 4. Enrich model with One Piece signature uniforms, hats, collars & gear for Base Rig champions
          if (!isDedicatedCustomSkin && hasBonesOrSkin) {
            enrichMixamoModelIfNeeded(clonedRig, unitId, unitColor, isEnemy);
          }

          // 5. Setup AnimationMixer if rigged BEFORE computing scale and position
          let mixer: THREE.AnimationMixer | null = null;
          if (hasBonesOrSkin) {
            mixer = new THREE.AnimationMixer(clonedRig);
            mixerRef.current = mixer;

            // Retarget all animations to the active model
            const getRetargetedAction = (clip: THREE.AnimationClip | undefined) => {
              if (!clip) return undefined;
              // Clean clip: ensure no non-Hips bone has position/translation tracks that stretch limbs
              const cleanClip = sanitizeAnimationClip(clip);
              // Always retarget clip tracks so all bones match the target skeleton precisely
              const retargeted = retargetClipToModel(cleanClip, clonedRig, unitId);
              const usableClip = retargeted && retargeted.tracks.length > 0
                ? sanitizeAnimationClip(retargeted)
                : cleanClip;
              return mixer!.clipAction(usableClip);
            };

            const actions: { [key: string]: THREE.AnimationAction } = {};
            const isFemale = isFemaleChampion(unitId);

            // Idle stays on the skin's own bind/rest pose (POSE T). Zoro strictly has NO idle animation assigned,
            // sitting in clean POSE T as his base pre-battle and default pose.
            const idleClipToUse = isZoro ? undefined : (customSkin?.customAnimations?.idle || customSkin?.animations?.[0]);

            // Walk.glb is the standard male walk animation (26 frames)
            const defaultMaleWalk = rigData.animations.walk;
            let walkClipToUse = isFemale
              ? (rigData.animations.femaleWalk || defaultMaleWalk)
              : (defaultMaleWalk || customSkin?.customAnimations?.walk);

            // Dedicated walk clips take priority when a female character has one
            if (isFemale && customSkin?.customAnimations?.walk) {
              walkClipToUse = customSkin.customAnimations.walk;
            }

            const idleAction = getRetargetedAction(idleClipToUse);
            const walkAction = getRetargetedAction(walkClipToUse);

            // Dedicated attack clips for Zoro & Marines (Slash1), Nami (NamiAtk), or Usopp (UsoppAtk)
            const isMarine = normId.startsWith('marine') || normId.includes('marine');
            const championAttackClip = (isZoro || isMarine)
              ? (customSkin?.customAnimations?.slash1 || customSkin?.customAnimations?.attack || customAttackClip)
              : isNami
              ? (customSkin?.customAnimations?.attack || customAttackClip)
              : isUsopp
              ? (customSkin?.customAnimations?.attack || customAttackClip)
              : customAttackClip;
            const customAttackAction = getRetargetedAction(championAttackClip || undefined);

            const punchAction = customAttackAction || getRetargetedAction(rigData.animations.punch || rigData.animations.punch1);
            const punch2Action = customAttackAction || getRetargetedAction(rigData.animations.punch2);
            const punch3Action = customAttackAction || getRetargetedAction(rigData.animations.punch3);
            const punch4Action = customAttackAction || getRetargetedAction(rigData.animations.punch4);

            // Dedicated Sanji kicks or modular rig kicks
            const sanjiKick1Action = getRetargetedAction(customSkin?.customAnimations?.kick1);
            const sanjiKick2Action = getRetargetedAction(customSkin?.customAnimations?.kick2);
            const sanjiKick3Action = getRetargetedAction(customSkin?.customAnimations?.kick3);

            // Nami, Usopp and Chopper have no standard human high kicks: map to their unique attack/punch
            const isNoKickChampion = isNami || isUsopp || isChopper;
            const kickAction = isNoKickChampion
              ? (customAttackAction || punchAction)
              : (sanjiKick1Action || getRetargetedAction(rigData.animations.kick1 || rigData.animations.kick) || customAttackAction);
            const kick2Action = isNoKickChampion
              ? (customAttackAction || punchAction)
              : (sanjiKick2Action || getRetargetedAction(rigData.animations.kick2) || kickAction);
            const kick3Action = isNoKickChampion
              ? (customAttackAction || punchAction)
              : (sanjiKick3Action || getRetargetedAction(rigData.animations.kick3) || kickAction);
            const turnLeftAction = getRetargetedAction(rigData.animations.turnLeft) || walkAction;
            const turnRightAction = getRetargetedAction(rigData.animations.turnRight) || walkAction;
            const deathAction = getRetargetedAction(rigData.animations.death);

            if (idleAction) actions['idle'] = idleAction;
            if (walkAction) actions['walk'] = walkAction;

            if (isNami || isUsopp) {
              // Nami & Usopp: Map every attack and combat action directly to their unique attack clip
              const uniqueCharAttack = customAttackAction || punchAction;
              if (uniqueCharAttack) {
                actions['attack'] = uniqueCharAttack;
                actions['punch'] = uniqueCharAttack;
                actions['punch1'] = uniqueCharAttack;
                actions['punch2'] = uniqueCharAttack;
                actions['punch3'] = uniqueCharAttack;
                actions['punch4'] = uniqueCharAttack;
                actions['kick'] = uniqueCharAttack;
                actions['kick1'] = uniqueCharAttack;
                actions['kick2'] = uniqueCharAttack;
                actions['kick3'] = uniqueCharAttack;
              }
            } else if (normId === 'sanji') {
              // Sanji: 100% kick combat style with all 3 distinct kicks (Kick1, SanjiKick1, SanjiKick2)
              if (kickAction) {
                actions['kick'] = kickAction;
                actions['kick1'] = kickAction;
                actions['punch'] = kickAction;
                actions['punch1'] = kickAction;
                actions['attack'] = kickAction;
              }
              if (kick2Action) {
                actions['kick2'] = kick2Action;
                actions['punch2'] = kick2Action;
              }
              if (kick3Action) {
                actions['kick3'] = kick3Action;
                actions['punch3'] = kick3Action;
                actions['punch4'] = kick3Action;
              }
            } else {
              if (punchAction) {
                actions['punch'] = punchAction;
                actions['punch1'] = punchAction;
              }
              if (punch2Action) actions['punch2'] = punch2Action;
              if (punch3Action) actions['punch3'] = punch3Action;
              if (punch4Action) actions['punch4'] = punch4Action;
              if (kickAction) {
                actions['kick'] = kickAction;
                actions['kick1'] = kickAction;
              }
              if (kick2Action) actions['kick2'] = kick2Action;
              if (kick3Action) actions['kick3'] = kick3Action;
              if (customAttackAction) {
                actions['attack'] = customAttackAction;
                actions['slash1'] = customAttackAction;
                if (isMarine) {
                  // Standard attack for all common marines is strictly Slash1
                  actions['punch'] = customAttackAction;
                  actions['punch1'] = customAttackAction;
                  actions['punch2'] = customAttackAction;
                  actions['punch3'] = customAttackAction;
                  actions['punch4'] = customAttackAction;
                  actions['kick'] = customAttackAction;
                  actions['kick1'] = customAttackAction;
                  actions['kick2'] = customAttackAction;
                  actions['kick3'] = customAttackAction;
                }
              }
            }
            if (turnLeftAction) actions['turnLeft'] = turnLeftAction;
            if (turnRightAction) actions['turnRight'] = turnRightAction;
            if (deathAction) actions['death'] = deathAction;

            const invokeAction = getRetargetedAction(customSkin?.customAnimations?.invoke);
            if (invokeAction) {
              actions['monster_invoke'] = invokeAction;
              actions['invoke'] = invokeAction;
            }

            actionsRef.current = actions;

            // Start default idle animation if action exists
            const initialKey = getActionKey();
            const initialAction = actions[initialKey] || actions['idle'];
            if (initialAction) {
              initialAction.play();
              activeActionRef.current = initialAction;
            }

            // Advance mixer a tiny step to settle skeleton into the upright battle idle pose
            mixer.update(0.01);
          }

          // 6. Compute exact model height strictly from the static rest pose of the SKIN.
          // This guarantees the character's height is determined 100% by the SKIN geometry,
          // completely independent of and never distorted by movement or animations.
          const skinBox = new THREE.Box3().setFromObject(sourceModel);
          const skinSize = new THREE.Vector3();
          skinBox.getSize(skinSize);
          const skinHeight = skinSize.y > 0.0001 ? skinSize.y : Math.max(skinSize.x, skinSize.z);

          const loreHeight = getChampionLoreHeightMeters(unitId, isTransformed);
          // Baseline Luffy (1.74m) is rendered at targetHeight = 1.45:
          // Chopper (1.0m canonical skin) -> 0.8333
          // Luffy (1.74m) -> 1.450
          // Zoro (1.81m) -> 1.508
          // Smoker (2.09m) -> 1.741 (>2m, taller than 1.60m/1.85m)
          // Crocodile (2.53m) -> 2.108
          // Monster Chopper (3.80m) -> 3.165
          const targetHeight = (loreHeight / 1.74) * 1.45;

          const scaleFactor = skinHeight > 0.0001 ? targetHeight / skinHeight : 1.0;
          clonedRig.scale.setScalar(scaleFactor);
          clonedRig.updateMatrixWorld(true);

          // 7. Center horizontally and place soles of feet cleanly at y = 0
          // Measured from the static skin geometry scaled by scaleFactor
          const skinCenter = new THREE.Vector3();
          skinBox.getCenter(skinCenter);
          clonedRig.position.x = -skinCenter.x * scaleFactor;
          clonedRig.position.z = -skinCenter.z * scaleFactor;
          clonedRig.position.y = -skinBox.min.y * scaleFactor;
          clonedRig.updateMatrixWorld(true);

          // Save baseline transforms for procedural combat dynamics
          clonedRig.userData.basePosition = clonedRig.position.clone();
          clonedRig.userData.baseRotation = clonedRig.rotation.clone();

          // 8. Apply high quality materials, textures and team accents
          clonedRig.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              child.frustumCulled = false;
              const mesh = child as THREE.Mesh;

              if (!isDedicatedCustomSkin) {
                // All units on base mannequin (Zoro, Smoker, Chopper, Luffy, Usopp, Sanji, Crocodile, Marines) receive their character's custom body texture!
                mesh.material = new THREE.MeshStandardMaterial({
                  color: isEnemy ? 0xffdddd : 0xffffff,
                  map: createChampionBodyTexture(unitId, isEnemy),
                  roughness: 0.45,
                  metalness: 0.1,
                  side: THREE.DoubleSide,
                });
                return;
              }

              if (mesh.material) {
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                mats.forEach((mat) => {
                  mat.side = THREE.DoubleSide;
                  mat.depthWrite = true;
                  if (mat instanceof THREE.MeshStandardMaterial) {
                    mat.emissive = isEnemy ? new THREE.Color('#f43f5e').multiplyScalar(0.08) : new THREE.Color(0x000000);
                    mat.roughness = Math.min(mat.roughness ?? 0.5, 0.65);
                    mat.metalness = Math.min(mat.metalness ?? 0.1, 0.2);
                    if (mat.map) {
                      mat.map.colorSpace = THREE.SRGBColorSpace;
                      if (mat.map.image) {
                        mat.map.needsUpdate = true;
                      }
                    }
                  } else if (mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshBasicMaterial) {
                    if (mat instanceof THREE.MeshPhongMaterial) {
                      mat.emissive = isEnemy ? new THREE.Color('#f43f5e').multiplyScalar(0.08) : new THREE.Color(0x000000);
                    }
                    if (mat.map) {
                      mat.map.colorSpace = THREE.SRGBColorSpace;
                      if (mat.map.image) {
                        mat.map.needsUpdate = true;
                      }
                    }
                  }
                });
              }
            }
          });

          // 9. Attach specialized accessories and weapons
          if (unitId === 'buggy') {
            buggyControllerRef.current = createBuggyBaraBaraController(clonedRig, isEnemy);
          }
          attachChampionWeapons(clonedRig, unitId, isEnemy, stars);

          // 10. Wrap and add to scene ONLY once fully configured
          const rootWrapper = new THREE.Group();
          rootWrapper.rotation.y = targetRotationYRef.current;
          rootWrapper.add(clonedRig);
          scene.add(rootWrapper);
          modelGroupRef.current = rootWrapper;

          setIsReady(true);
        } catch (err) {
          console.warn('[Champion3DModel] Failed configuring 3D model, falling back to procedural:', err);
          fallbackToProcedural();
        }
      })
      .catch((err) => {
        console.warn('[Champion3DModel] Failed loading 3D assets, falling back to procedural:', err);
        fallbackToProcedural();
      });

    // Fallback procedural mannequin
    const fallbackToProcedural = () => {
      if (!isMounted) return;
      // Remove any broken partial models from scene except initial lights/shadow
      while (scene.children.length > 4) {
        scene.remove(scene.children[scene.children.length - 1]);
      }
      const mannequin = createProceduralMannequin(unitColor, isEnemy);
      mannequin.root.rotation.y = targetRotationYRef.current;
      mannequin.root.position.y = 0.08;
      scene.add(mannequin.root);
      modelGroupRef.current = mannequin.root;
      mannequinRef.current = mannequin;
      setIsReady(true);
    };

    // 60 FPS Render & Animation Physics Loop
    const startTime = performance.now();
    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const elapsedTime = (now - startTime) / 1000;

      // Update Mixamo AnimationMixer
      if (mixerRef.current && !isStunned) {
        mixerRef.current.update(delta);
      }

      // Update specialized Buggy Bara Bara detachment dynamics
      if (buggyControllerRef.current && !isStunned) {
        buggyControllerRef.current.update(delta, elapsedTime, animStateRef.current, isCasting, animationName);
      }

      // Update Fallback Procedural Humanoid Rig Animation
      if (mannequinRef.current && !isStunned) {
        mannequinRef.current.update(delta, elapsedTime, animStateRef.current, isEnemy);
      }

      // Procedural combat physics for static 3D models (models without Mixamo bone rigs)
      if (!mixerRef.current && !mannequinRef.current && modelGroupRef.current && !isStunned) {
        const state = animStateRef.current;
        const child = modelGroupRef.current.children[0];
        if (child) {
          const basePos = child.userData.basePosition as THREE.Vector3 || new THREE.Vector3(0, 0, 0);
          const baseRot = child.userData.baseRotation as THREE.Euler || new THREE.Euler(0, 0, 0);

          if (state === 'walk') {
            child.position.y = basePos.y + Math.abs(Math.sin(elapsedTime * 9)) * 0.05;
            child.position.x = basePos.x;
            child.position.z = basePos.z;
            child.rotation.z = baseRot.z + Math.sin(elapsedTime * 9) * 0.04;
            child.rotation.x = baseRot.x + 0.04;
          } else if (state === 'punch' || state === 'kick' || state === 'punch1' || state === 'punch2' || isCasting) {
            const strikePhase = Math.sin(elapsedTime * 15);
            child.position.z = basePos.z + strikePhase * 0.14;
            child.position.y = basePos.y + Math.abs(strikePhase) * 0.05;
            child.position.x = basePos.x;
            child.rotation.x = baseRot.x + strikePhase * 0.10;
            child.rotation.z = baseRot.z;
          } else {
            // Idle breathing and slight natural sway
            child.position.y = basePos.y + Math.sin(elapsedTime * 2.5) * 0.02;
            child.position.x = basePos.x;
            child.position.z = basePos.z;
            child.rotation.z = baseRot.z;
            child.rotation.x = baseRot.x;
          }
        }
      }

      // Unconscious state after Monster Point: Chopper faints / tilts down
      if (modelGroupRef.current) {
        if (isUnconscious || transformationPhase === 'UNCONSCIOUS') {
          modelGroupRef.current.rotation.z = lerpAngle(modelGroupRef.current.rotation.z, 0.45, Math.min(delta * 6, 1.0));
        } else {
          modelGroupRef.current.rotation.z = lerpAngle(modelGroupRef.current.rotation.z, 0, Math.min(delta * 6, 1.0));
        }
      }

      // Smooth directional rotation
      if (modelGroupRef.current) {
        const curY = modelGroupRef.current.rotation.y;
        const targetY = targetRotationYRef.current;
        modelGroupRef.current.rotation.y = lerpAngle(curY, targetY, Math.min(delta * 10, 1.0));
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      if (buggyControllerRef.current) {
        buggyControllerRef.current.dispose();
        buggyControllerRef.current = null;
      }
      modelGroupRef.current = null;
      mannequinRef.current = null;
      renderer.dispose();
      scene.clear();
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [unitId, unitColor, isEnemy, stars, isTransformed]);

  return (
    <div
      ref={mountRef}
      className={`relative ${className} ${isReady ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 pointer-events-none`}
    />
  );
};

/**
 * Creates high quality procedural anime body canvas texture for base skinned meshes
 * (Zoro, Smoker, Chopper, Luffy, Usopp, Sanji, Crocodile, Marines, etc.)
 */
function createChampionBodyTexture(unitId: string, isEnemy: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const normId = unitId.toLowerCase();

  // Background / base anime skin tone
  const skinTone = isEnemy ? '#fda4af' : '#fed7aa';
  ctx.fillStyle = skinTone;
  ctx.fillRect(0, 0, 256, 512);

  if (normId === 'luffy') {
    // 1. Head: Black spiky hair + face + scar under eye
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 256, 60);
    ctx.fillStyle = skinTone;
    ctx.fillRect(0, 60, 256, 45);
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 3;
    ctx.strokeRect(60, 80, 20, 2);

    // 2. Torso: Pirate Captain Red Vest with bare chest & X-scar
    ctx.fillStyle = isEnemy ? '#991b1b' : '#dc2626';
    ctx.fillRect(0, 105, 256, 130);
    // V-shaped bare chest opening
    ctx.fillStyle = skinTone;
    ctx.beginPath();
    ctx.moveTo(80, 105);
    ctx.lineTo(128, 215);
    ctx.lineTo(176, 105);
    ctx.closePath();
    ctx.fill();
    // X-scar on chest
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(110, 135); ctx.lineTo(146, 175);
    ctx.moveTo(146, 135); ctx.lineTo(110, 175);
    ctx.stroke();

    // 3. Yellow Waist Sash
    ctx.fillStyle = isEnemy ? '#d97706' : '#eab308';
    ctx.fillRect(0, 235, 256, 25);

    // 4. Blue Denim Shorts with white fur cuff
    ctx.fillStyle = isEnemy ? '#4c0519' : '#1d4ed8';
    ctx.fillRect(0, 260, 256, 110);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 360, 256, 15);

    // 5. Bare leg skin & Sandals
    ctx.fillStyle = skinTone;
    ctx.fillRect(0, 375, 256, 90);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 465, 256, 47);
  } else if (normId === 'usopp') {
    // 1. Head: Curly hair + brown bandana + skin
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 256, 50);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 50, 256, 25);
    ctx.fillStyle = skinTone;
    ctx.fillRect(0, 75, 256, 35);

    // 2. Torso: Yellow Overalls bib & Brown leather satchel strap
    ctx.fillStyle = skinTone;
    ctx.fillRect(0, 110, 256, 120);
    ctx.fillStyle = isEnemy ? '#854d0e' : '#eab308';
    ctx.fillRect(60, 130, 136, 100);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(40, 110);
    ctx.lineTo(216, 230);
    ctx.stroke();

    // 3. Yellow Pants
    ctx.fillStyle = isEnemy ? '#854d0e' : '#ca8a04';
    ctx.fillRect(0, 230, 256, 220);

    // 4. Brown Boots
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 450, 256, 62);
  } else if (normId === 'zoro') {
    // 1. Head: Moss Green Spiky Hair
    ctx.fillStyle = isEnemy ? '#14532d' : '#16a34a';
    ctx.fillRect(0, 0, 256, 65);
    ctx.fillStyle = skinTone;
    ctx.fillRect(0, 65, 256, 45);

    // 2. Torso: Open Dark Green Samurai Robe with bare muscular chest
    ctx.fillStyle = isEnemy ? '#064e3b' : '#047857';
    ctx.fillRect(0, 110, 256, 130);
    ctx.fillStyle = skinTone;
    ctx.beginPath();
    ctx.moveTo(90, 110);
    ctx.lineTo(128, 215);
    ctx.lineTo(166, 110);
    ctx.closePath();
    ctx.fill();

    // 3. Green Haramaki Belly Sash
    ctx.fillStyle = isEnemy ? '#166534' : '#22c55e';
    ctx.fillRect(0, 220, 256, 40);

    // 4. Dark Samurai Trousers
    ctx.fillStyle = isEnemy ? '#0f172a' : '#064e3b';
    ctx.fillRect(0, 260, 256, 180);

    // 5. Black Boots
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 440, 256, 72);
  } else if (normId.includes('smoke')) {
    // 1. Head: Silver / White Spiky Hair
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, 256, 60);
    ctx.fillStyle = skinTone;
    ctx.fillRect(0, 60, 256, 50);

    // 2. Torso: Open White Marine Coat with Green Fur Trim
    ctx.fillStyle = isEnemy ? '#4c0519' : '#f8fafc';
    ctx.fillRect(0, 110, 256, 130);
    ctx.fillStyle = '#15803d'; // Green Fur
    ctx.fillRect(0, 110, 256, 20);
    ctx.fillStyle = skinTone;
    ctx.beginPath();
    ctx.moveTo(85, 130);
    ctx.lineTo(128, 225);
    ctx.lineTo(171, 130);
    ctx.closePath();
    ctx.fill();

    // 3. Brown Leather Belt & Pouches
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 230, 256, 25);

    // 4. Navy Blue Marine Officer Trousers
    ctx.fillStyle = isEnemy ? '#4c0519' : '#1e3a8a';
    ctx.fillRect(0, 255, 256, 185);

    // 5. Heavy Combat Boots
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 440, 256, 72);
  } else if (normId === 'chopper') {
    // Reindeer Tan Fur Body
    const furColor = isEnemy ? '#7f1d1d' : '#b45309';
    ctx.fillStyle = furColor;
    ctx.fillRect(0, 0, 256, 512);

    // Pink Hat crown area & Blue Nose
    ctx.fillStyle = isEnemy ? '#9f1239' : '#f43f5e';
    ctx.fillRect(0, 0, 256, 50);
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(80, 50, 96, 40);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(115, 65, 26, 15);

    // Maroon Shorts
    ctx.fillStyle = isEnemy ? '#881337' : '#991b1b';
    ctx.fillRect(0, 250, 256, 110);

    // Black Hooves
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 450, 256, 62);
  } else if (normId.includes('crocodile')) {
    // 1. Head: Black slicked hair + face stitch scar
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 256, 55);
    ctx.fillStyle = skinTone;
    ctx.fillRect(0, 55, 256, 50);
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 80, 196, 2);

    // 2. Torso: Green Shirt with Gold/Black Striped Waistcoat
    ctx.fillStyle = isEnemy ? '#3b0764' : '#14532d';
    ctx.fillRect(0, 105, 256, 135);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(60, 120, 136, 120);

    // 3. Dark Dress Trousers & Shoes
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 240, 256, 200);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 440, 256, 72);
  } else if (normId === 'sanji') {
    // 1. Head: Blonde hair covering eye
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 256, 65);
    ctx.fillStyle = skinTone;
    ctx.fillRect(0, 65, 256, 45);

    // 2. Torso: Black suit with blue dress shirt and black tie
    ctx.fillStyle = isEnemy ? '#881337' : '#18181b';
    ctx.fillRect(0, 110, 256, 135);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(90, 110);
    ctx.lineTo(128, 180);
    ctx.lineTo(166, 110);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#09090b';
    ctx.fillRect(122, 115, 12, 70);

    // 3. Black Dress Trousers & Leather Shoes
    ctx.fillStyle = isEnemy ? '#881337' : '#18181b';
    ctx.fillRect(0, 245, 256, 195);
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 440, 256, 72);
  } else if (normId.includes('marine')) {
    // Marine Soldier Uniform
    ctx.fillStyle = isEnemy ? '#881337' : '#f8fafc';
    ctx.fillRect(0, 0, 256, 512);
    ctx.fillStyle = skinTone;
    ctx.fillRect(0, 0, 256, 95);
    ctx.fillStyle = isEnemy ? '#4c0519' : '#1e3a8a';
    ctx.fillRect(0, 95, 256, 35);
    ctx.fillStyle = isEnemy ? '#4c0519' : '#172554';
    ctx.fillRect(0, 240, 256, 190);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 430, 256, 82);
  } else {
    // Fallback custom theme
    ctx.fillStyle = isEnemy ? '#881337' : '#1e293b';
    ctx.fillRect(0, 105, 256, 140);
    ctx.fillStyle = isEnemy ? '#4c0519' : '#0f172a';
    ctx.fillRect(0, 245, 256, 195);
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 440, 256, 72);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
