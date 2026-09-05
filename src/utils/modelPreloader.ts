import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export interface CachedModelData {
  object: THREE.Group;
  animations: THREE.AnimationClip[];
}

export interface ChampionRigData {
  baseModel: THREE.Group;
  animations: {
    idle?: THREE.AnimationClip;
    femaleIdle?: THREE.AnimationClip;
    maleIdle?: THREE.AnimationClip;
    walk?: THREE.AnimationClip;
    punch?: THREE.AnimationClip;
    punch1?: THREE.AnimationClip;
    punch2?: THREE.AnimationClip;
    punch3?: THREE.AnimationClip;
    punch4?: THREE.AnimationClip;
    kick?: THREE.AnimationClip;
    kick1?: THREE.AnimationClip;
    kick2?: THREE.AnimationClip;
    kick3?: THREE.AnimationClip;
    turnLeft?: THREE.AnimationClip;
    turnRight?: THREE.AnimationClip;
    death?: THREE.AnimationClip;
  };
}

export function isFemaleChampion(unitId: string): boolean {
  const normalized = (unitId || '').toLowerCase();
  return [
    'nami',
    'tashigi',
    'boa_hancock',
    'boa',
    'hancock',
    'robin',
    'alvida',
    'perona',
    'vivi',
    'yamato',
    'reiju',
    'koala',
    'carrot',
    'pudding',
    'shiratoshi',
    'jewelry_bonney',
    'bonney',
    'big_mom',
    'kalifa',
  ].includes(normalized);
}

export const modelCache: {
  [key: string]: CachedModelData;
} = {};

const loadingPromises: { [key: string]: Promise<CachedModelData> } = {};

export const REQUIRED_3D_ASSETS = [
  { url: './models/SkinLuffy_a.glb', label: 'Skin Luffy A (SkinLuffy_a.glb)' },
  { url: './models/SkinLuffy_b.glb', label: 'Skin Luffy B (SkinLuffy_b.glb)' },
  { url: './models/SkinZoro.glb', label: 'Skin Zoro (SkinZoro.glb)' },
  { url: './models/IdleZoro.glb', label: 'Postura Zoro (IdleZoro.glb)' },
  { url: './models/ZoroWalk.glb', label: 'Caminhada Zoro (ZoroWalk.glb)' },
  { url: './models/Slash1.glb', label: 'Ataque Espada 1 (Slash1.glb)' },
  { url: './models/SkinNami.glb', label: 'Skin Nami (SkinNami.glb)' },
  { url: './models/WalkFem.glb', label: 'Caminhada Nami (WalkFem.glb)' },
  { url: './models/SkinUsopp.glb', label: 'Skin Usopp (SkinUsopp.glb)' },
  { url: './models/UsoppAtk.glb', label: 'Ataque Usopp (UsoppAtk.glb)' },
  { url: './models/Idle.glb', label: 'Postura Base (Idle.glb)' },
  { url: './models/Walk.glb', label: 'Caminhada (Walk.glb)' },
  { url: './models/Punch1.glb', label: 'Soco 1 (Punch1.glb)' },
  { url: './models/Punch2.glb', label: 'Soco 2 (Punch2.glb)' },
  { url: './models/Punch3.glb', label: 'Soco 3 (Punch3.glb)' },
  { url: './models/Kick1.glb', label: 'Chute 1 (Kick1.glb)' },
  { url: './models/TurnLeftt.glb', label: 'Giro Esquerda (TurnLeftt.glb)' },
  { url: './models/TurnRight.glb', label: 'Giro Direita (TurnRight.glb)' },
];

export const loadModelCached = (
  url: string,
  onProgress?: (loadedBytes: number, totalBytes: number) => void
): Promise<CachedModelData> => {
  if (modelCache[url]) {
    return Promise.resolve(modelCache[url]);
  }
  if (loadingPromises[url]) {
    return loadingPromises[url];
  }

  const isGlb = url.toLowerCase().endsWith('.glb') || url.toLowerCase().endsWith('.gltf');

  if (isGlb) {
    const gltfLoader = new GLTFLoader();
    loadingPromises[url] = new Promise((resolve, reject) => {
      gltfLoader.load(
        url,
        (gltf) => {
          const group = (gltf.scene || gltf.scenes[0]) as THREE.Group;
          
          // Filter out any unwanted auxiliary mesh (like spheres, debug shapes, or unskinned markers)
          group.traverse((child) => {
            const nameLower = (child.name || '').toLowerCase();
            if (
              nameLower.includes('esfera') ||
              nameLower.includes('sphere') ||
              nameLower.includes('gltf_not_exported') ||
              nameLower.includes('cube') ||
              nameLower.includes('camera') ||
              nameLower.includes('light') ||
              nameLower.includes('24_-') ||
              nameLower.includes('25_-') ||
              nameLower.includes('_sad') ||
              nameLower.includes('teethbroken') ||
              nameLower.includes('hawk_rifle')
            ) {
              if (child.parent && !(child as THREE.SkinnedMesh).isSkinnedMesh && !(child as THREE.Bone).isBone) {
                child.visible = false;
              }
            }
          });

          modelCache[url] = {
            object: group,
            animations: gltf.animations || [],
          };
          resolve(modelCache[url]);
        },
        (xhr) => {
          if (onProgress && xhr.total) {
            onProgress(xhr.loaded, xhr.total);
          }
        },
        (err) => {
          console.warn(`[Preload] Error loading GLB from ${url}:`, err);
          reject(err);
        }
      );
    });
    return loadingPromises[url];
  }

  // Fallback for FBX
  const loader = new FBXLoader();
  loadingPromises[url] = new Promise((resolve, reject) => {
    loader.load(
      url,
      (fbx) => {
        // Apply textures if Nami FBX is loaded
        if (url.toLowerCase().includes('nami')) {
          const texLoader = new THREE.TextureLoader();
          const diffuseMap = texLoader.load('./models/nami_diffuse.png');
          diffuseMap.flipY = false;
          diffuseMap.colorSpace = THREE.SRGBColorSpace;
          const normalMap = texLoader.load('./models/nami_normal.png');
          normalMap.flipY = false;
          fbx.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              if (mesh.material) {
                const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
                if (mat) {
                  (mat as any).map = diffuseMap;
                  (mat as any).normalMap = normalMap;
                  mat.needsUpdate = true;
                }
              }
            }
          });
        }

        modelCache[url] = {
          object: fbx,
          animations: fbx.animations || [],
        };
        resolve(modelCache[url]);
      },
      (xhr) => {
        if (onProgress && xhr.total) {
          onProgress(xhr.loaded, xhr.total);
        }
      },
      (err) => {
        console.warn(`[Preload] Error loading FBX from ${url}:`, err);
        reject(err);
      }
    );
  });

  return loadingPromises[url];
};

// Backwards compatibility alias
export const loadFBXCached = loadModelCached;

/**
 * Retargets animation clip tracks to match the actual bone names in targetModel.
 * Ensures clips from FBX (mixamorigHips) match GLB rigs (mixamorig:Hips) or vice-versa.
 */
export function retargetClipToModel(
  clip: THREE.AnimationClip | undefined,
  targetModel: THREE.Object3D,
  unitId?: string
): THREE.AnimationClip | undefined {
  if (!clip) return undefined;

  const modelBoneMap = new Map<string, THREE.Bone>();
  const modelBoneNames = new Set<string>();
  targetModel.traverse((child) => {
    if (child.name) {
      modelBoneNames.add(child.name);
      if ((child as THREE.Bone).isBone) {
        modelBoneMap.set(child.name, child as THREE.Bone);
      }
    }
  });

  const newTracks: THREE.KeyframeTrack[] = [];

  for (const track of clip.tracks) {
    const dotIndex = track.name.lastIndexOf('.');
    if (dotIndex === -1) {
      newTracks.push(track.clone());
      continue;
    }

    let nodeName = track.name.substring(0, dotIndex);
    const propName = track.name.substring(dotIndex);

    // Remove prefixes like "Armature|" or "Armature/" or "mixamo.com/"
    nodeName = nodeName.replace(/^Armature[|/:]+/, '').replace(/^mixamo\.com[|/:]+/, '');

    let matchedName: string | null = null;
    if (modelBoneNames.has(nodeName)) {
      matchedName = nodeName;
    } else if (nodeName.startsWith('mixamorig:')) {
      const withoutColon = 'mixamorig' + nodeName.slice(10);
      if (modelBoneNames.has(withoutColon)) matchedName = withoutColon;
    } else if (nodeName.startsWith('mixamorig')) {
      const withColon = 'mixamorig:' + nodeName.slice(9);
      if (modelBoneNames.has(withColon)) matchedName = withColon;
    }

    // Case-insensitive fallback
    if (!matchedName) {
      const cleanNode = nodeName.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const boneName of modelBoneNames) {
        const cleanBone = boneName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanNode === cleanBone || cleanBone.endsWith(cleanNode) || cleanNode.endsWith(cleanBone)) {
          matchedName = boneName;
          break;
        }
      }
    }

    if (!matchedName) {
      continue;
    }

    // Discard all .scale tracks to ensure unified 1:1:1 transform scale and avoid bone scaling deforming mesh vertices
    if (propName === '.scale') {
      continue;
    }

    // Discard .scale tracks to keep clean 1:1:1 proportions
    if (propName === '.scale') {
      continue;
    }

    // Discard position tracks for non-Hips bones to avoid mesh stretching,
    // but preserve Hips position so root elevation and stance height are faithfully maintained.
    if (propName === '.position') {
      const isHips = matchedName.toLowerCase().includes('hips');
      if (!isHips) {
        continue;
      }
    }

    const cloned = track.clone();
    cloned.name = matchedName + propName;

    // Keep natural rotation
    newTracks.push(cloned);
  }

  return new THREE.AnimationClip(clip.name, clip.duration, newTracks);
}

export interface ChampionSkinResult extends CachedModelData {
  url: string;
  isDedicatedSkin: boolean;
  customAnimations?: {
    idle?: THREE.AnimationClip;
    walk?: THREE.AnimationClip;
    attack?: THREE.AnimationClip;
    slash1?: THREE.AnimationClip;
  };
}

/**
 * Loads custom champion 3D mesh skin and dedicated animations if available.
 */
export async function loadChampionSkinModel(unitId: string): Promise<ChampionSkinResult | null> {
  const normId = (unitId || '').toLowerCase();

  // 1. Zoro Dedicated Rig & Custom Animations (SkinZoro, IdleZoro, ZoroWalk, Slash1)
  if (normId === 'zoro') {
    const candidateUrls = [
      './models/SkinZoro.glb',
      '/models/SkinZoro.glb',
    ];

    for (const url of candidateUrls) {
      try {
        const [zoroSkin, walkZoro, slash1Zoro] = await Promise.all([
          loadModelCached(url),
          loadModelCached('./models/ZoroWalk.glb')
            .catch(() => loadModelCached('/models/ZoroWalk.glb'))
            .catch(() => null),
          loadModelCached('./models/Slash1.glb')
            .catch(() => loadModelCached('/models/Slash1.glb'))
            .catch(() => null),
        ]);

        if (zoroSkin && zoroSkin.object) {
          const walkClip = walkZoro?.animations?.[0];
          const slashClip = slash1Zoro?.animations?.[0];
          if (walkClip) walkClip.name = 'walk';
          if (slashClip) slashClip.name = 'slash1';

          return {
            ...zoroSkin,
            url,
            isDedicatedSkin: true,
            customAnimations: {
              walk: walkClip,
              attack: slashClip,
              slash1: slashClip,
            },
          };
        }
      } catch {
        // continue trying candidate URLs
      }
    }
    return null;
  }

  // 2. Luffy Dedicated Rig
  if (normId === 'luffy') {
    const candidateUrls = [
      './models/SkinLuffy_b.glb',
      '/models/SkinLuffy_b.glb',
      './models/SkinLuffy_a.glb',
      '/models/SkinLuffy_a.glb',
    ];

    for (const url of candidateUrls) {
      try {
        const res = await loadModelCached(url);
        if (res && res.object) {
          return { ...res, url, isDedicatedSkin: true };
        }
      } catch {
        // continue trying candidate URLs
      }
    }
    return null;
  }

  // 3. Nami Dedicated Rig (SkinNami, WalkFem, NamiAtk)
  if (normId === 'nami') {
    const candidateUrls = [
      './models/SkinNami.glb',
      '/models/SkinNami.glb',
      './models/IdleNami.glb',
      '/models/IdleNami.glb',
      './models/Nami.glb',
      '/models/Nami.glb',
    ];

    for (const url of candidateUrls) {
      try {
        const [namiSkin, walkFem] = await Promise.all([
          loadModelCached(url),
          loadModelCached('./models/WalkFem.glb')
            .catch(() => loadModelCached('/models/WalkFem.glb'))
            .catch(() => null),
        ]);

        if (namiSkin && namiSkin.object) {
          // If IdleNami has animations, use the first clip; otherwise null (static posed rest)
          const idleClip = namiSkin.animations && namiSkin.animations.length > 0
            ? namiSkin.animations[0]
            : null;
          const walkClip = walkFem?.animations?.[0] || null;

          if (idleClip) idleClip.name = 'idle';
          if (walkClip) walkClip.name = 'walk';

          return {
            ...namiSkin,
            url,
            isDedicatedSkin: true,
            customAnimations: {
              idle: idleClip || undefined,
              walk: walkClip || undefined,
              attack: undefined,
            },
          };
        }
      } catch {
        // continue trying candidate URLs
      }
    }
    return null;
  }

  // 4. Usopp Dedicated Rig (SkinUsopp, UsoppAtk)
  if (normId === 'usopp') {
    const candidateUrls = [
      './models/SkinUsopp.glb',
      '/models/SkinUsopp.glb',
    ];

    for (const url of candidateUrls) {
      try {
        const [usoppSkin, usoppAtk] = await Promise.all([
          loadModelCached(url),
          loadModelCached('./models/UsoppAtk.glb')
            .catch(() => loadModelCached('/models/UsoppAtk.glb'))
            .catch(() => null),
        ]);

        if (usoppSkin && usoppSkin.object) {
          const attackClip = usoppAtk?.animations?.[0] || null;
          if (attackClip) attackClip.name = 'attack';

          return {
            ...usoppSkin,
            url,
            isDedicatedSkin: true,
            customAnimations: {
              attack: attackClip || undefined,
            },
          };
        }
      } catch {
        // continue trying candidate URLs
      }
    }
    return null;
  }

  return null;
}

export async function loadChampionAttackAnimation(unitId: string): Promise<THREE.AnimationClip | null> {
  const normId = (unitId || '').toLowerCase();
  if (normId === 'zoro') {
    try {
      const res = await loadModelCached('./models/Slash1.glb')
        .catch(() => loadModelCached('/models/Slash1.glb'));
      return res?.animations?.[0] || null;
    } catch {
      return null;
    }
  }
  if (normId === 'nami') {
    return null;
  }
  if (normId === 'usopp') {
    try {
      const res = await loadModelCached('./models/UsoppAtk.glb')
        .catch(() => loadModelCached('/models/UsoppAtk.glb'));
      return res?.animations?.[0] || null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Loads and combines the modular GLB animations (Idle, Walk, Punch1, Punch2, Punch3, Kick1, TurnLeftt, TurnRight)
 * into a single unified ChampionRigData structure based on SkinLuffy_a.glb.
 */
let championRigPromise: Promise<ChampionRigData> | null = null;

export async function loadChampionModularRig(): Promise<ChampionRigData> {
  if (championRigPromise) {
    return championRigPromise;
  }

  championRigPromise = (async () => {
    // 1. Try loading SkinLuffy_b GLB first as base model
    const baseModel = await loadModelCached('./models/SkinLuffy_b.glb')
      .catch(() => loadModelCached('/models/SkinLuffy_b.glb'))
      .catch(() => loadModelCached('./models/SkinLuffy_a.glb'))
      .catch(() => loadModelCached('/models/SkinLuffy_a.glb'))
      .catch(() => null);

    // 2. Load animations in parallel
    const [
      idleData,
      walkData,
      punch1Data,
      punch2Data,
      punch3Data,
      kick1Data,
      turnLeftData,
      turnRightData,
    ] = await Promise.all([
      loadModelCached('./models/Idle.glb')
        .catch(() => loadModelCached('/models/Idle.glb'))
        .catch(() => null),
      loadModelCached('./models/Walk.glb')
        .catch(() => loadModelCached('/models/Walk.glb'))
        .catch(() => null),
      loadModelCached('./models/Punch1.glb')
        .catch(() => loadModelCached('/models/Punch1.glb'))
        .catch(() => null),
      loadModelCached('./models/Punch2.glb')
        .catch(() => loadModelCached('/models/Punch2.glb'))
        .catch(() => null),
      loadModelCached('./models/Punch3.glb')
        .catch(() => loadModelCached('/models/Punch3.glb'))
        .catch(() => null),
      loadModelCached('./models/Kick1.glb')
        .catch(() => loadModelCached('/models/Kick1.glb'))
        .catch(() => null),
      loadModelCached('./models/TurnLeftt.glb')
        .catch(() => loadModelCached('/models/TurnLeftt.glb'))
        .catch(() => loadModelCached('./models/TurnLeft.glb'))
        .catch(() => null),
      loadModelCached('./models/TurnRight.glb')
        .catch(() => loadModelCached('/models/TurnRight.glb'))
        .catch(() => null),
    ]);

    const chosenBase = baseModel?.object;

    if (!chosenBase) {
      throw new Error('Base model (SkinLuffy_a.glb) not found');
    }

    let defaultIdleClip = idleData?.animations?.[0];
    let walkClip = walkData?.animations?.[0];
    let punch1Clip = punch1Data?.animations?.[0];
    let punch2Clip = punch2Data?.animations?.[0];
    let punch3Clip = punch3Data?.animations?.[0];
    let kick1Clip = kick1Data?.animations?.[0];
    let turnLeftClip = turnLeftData?.animations?.[0];
    let turnRightClip = turnRightData?.animations?.[0];

    if (defaultIdleClip) defaultIdleClip.name = 'idle';
    if (walkClip) walkClip.name = 'walk';
    if (punch1Clip) punch1Clip.name = 'punch1';
    if (punch2Clip) punch2Clip.name = 'punch2';
    if (punch3Clip) punch3Clip.name = 'punch3';
    if (kick1Clip) kick1Clip.name = 'kick1';
    if (turnLeftClip) turnLeftClip.name = 'turnLeft';
    if (turnRightClip) turnRightClip.name = 'turnRight';

    return {
      baseModel: chosenBase,
      animations: {
        idle: defaultIdleClip,
        maleIdle: defaultIdleClip,
        femaleIdle: defaultIdleClip,
        walk: walkClip,
        punch: punch1Clip,
        punch1: punch1Clip,
        punch2: punch2Clip,
        punch3: punch3Clip,
        punch4: punch3Clip,
        kick: kick1Clip,
        kick1: kick1Clip,
        kick2: kick1Clip,
        kick3: kick1Clip,
        turnLeft: turnLeftClip,
        turnRight: turnRightClip,
        death: undefined,
      },
    };
  })();

  return championRigPromise;
}

export async function preloadAllGameAssets(
  onProgress: (percent: number, assetLabel: string) => void
): Promise<void> {
  const totalAssets = REQUIRED_3D_ASSETS.length;
  const assetProgressMap: Record<string, number> = {};

  REQUIRED_3D_ASSETS.forEach((a) => {
    assetProgressMap[a.url] = modelCache[a.url] ? 1 : 0;
  });

  const updateGlobalProgress = (currentLabel: string) => {
    const sum = Object.values(assetProgressMap).reduce((a, b) => a + b, 0);
    const overallPercent = Math.min(100, Math.round((sum / totalAssets) * 100));
    onProgress(overallPercent, currentLabel);
  };

  onProgress(0, 'Iniciando Pipeline de Ativos 3D...');

  const promises = REQUIRED_3D_ASSETS.map(async (asset) => {
    if (modelCache[asset.url]) {
      assetProgressMap[asset.url] = 1;
      updateGlobalProgress(asset.label);
      return modelCache[asset.url];
    }

    try {
      const data = await loadModelCached(asset.url, (loaded, total) => {
        if (total > 0) {
          assetProgressMap[asset.url] = loaded / total;
          updateGlobalProgress(asset.label);
        }
      });
      assetProgressMap[asset.url] = 1;
      updateGlobalProgress(asset.label);
      return data;
    } catch (e) {
      console.warn(`Failed to preload asset ${asset.url}, proceeding anyway:`, e);
      assetProgressMap[asset.url] = 1;
      updateGlobalProgress(asset.label);
      return null;
    }
  });

  await Promise.all(promises);
  // Also initialize modular rig in cache
  await loadChampionModularRig().catch(() => null);
  onProgress(100, 'Todos os Modelos GLB e Animações Carregados!');
}

/**
 * Pre-warms assets specifically needed for the combatants of an upcoming round:
 * - Pre-loads/decodes champion 2D textures/portraits in background to avoid GPU decode hitches
 * - Ensures 3D animations are fully ready in memory
 */
export async function warmupRoundCombatAssets(unitIds: string[]): Promise<void> {
  const uniqueUnitIds = Array.from(new Set(unitIds.filter(Boolean)));

  // 1. Ensure 3D GLB files are cached
  const modelPromises = REQUIRED_3D_ASSETS.map((asset) =>
    loadModelCached(asset.url).catch(() => null)
  );

  // 2. Pre-decode images into browser GPU memory
  const imagePromises = uniqueUnitIds.flatMap((unitId) => {
    const candidatePaths = [
      `./champions/portraits/${unitId}.png`,
      `./champions/sprites/${unitId}.png`,
      `/champions/portraits/${unitId}.png`,
    ];

    if (unitId === 'smoker') {
      candidatePaths.push('./champions/portraits/smoke.png');
    }
    if (unitId === 'crocodile') {
      candidatePaths.push('./champions/portraits/crocodilepng.png');
    }

    return candidatePaths.map((src) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.src = src;
        if ('decode' in img && typeof img.decode === 'function') {
          img.decode().then(() => resolve()).catch(() => resolve());
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }
      });
    });
  });

  await Promise.all([...modelPromises, ...imagePromises]);
}

