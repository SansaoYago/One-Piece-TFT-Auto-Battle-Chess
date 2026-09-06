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
  { url: './models/SkinTashigi.glb', label: 'Skin Tashigi (SkinTashigi.glb)' },
  { url: './models/SkinChopper.glb', label: 'Skin Chopper (SkinChopper.glb)' },
  { url: './models/SkinChopperMonster.glb', label: 'Skin Monster Chopper (SkinChopperMonster.glb)' },
  { url: './models/ChopperMonsterActive.glb', label: 'Invocação Chopper Monster (ChopperMonsterActive.glb)' },
  { url: './models/SkinCrocodile.glb', label: 'Skin Crocodile (SkinCrocodile.glb)' },
  { url: './models/CrocodileATK.glb', label: 'Ataque Crocodile (CrocodileATK.glb)' },
  { url: './models/SkinBuggy.glb', label: 'Skin Buggy (SkinBuggy.glb)' },
  { url: './models/SkinSanji.glb', label: 'Skin Sanji (SkinSanji.glb)' },
  { url: './models/SanjiKick1.glb', label: 'Chute Sanji 1 (SanjiKick1.glb)' },
  { url: './models/SanjiKick2.glb', label: 'Chute Sanji 2 (SanjiKick2.glb)' },
  { url: './models/SkinMihawk.glb', label: 'Skin Mihawk (SkinMihawk.glb)' },
  { url: './models/SkinSmoker.glb', label: 'Skin Smoker (SkinSmoker.glb)' },
  { url: './models/SkinShanks.glb', label: 'Skin Shanks (SkinShanks.glb)' },
  { url: './models/SkinBoaHancock.glb', label: 'Skin Boa Hancock (SkinBoaHancock.glb)' },
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
          delete loadingPromises[url];
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
        delete loadingPromises[url];
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
    // and for Hips, lock horizontal root displacement (X and Z) to the base pose to enforce in-place
    // combat animation (avoiding models sliding 3 steps forward into canvas bounds/containers),
    // while faithfully preserving vertical Y dynamics (jumps, squats, stomps, stance elevation).
    if (propName === '.position') {
      const isHips = matchedName.toLowerCase().includes('hips');
      if (!isHips) {
        continue;
      }

      const cloned = track.clone() as THREE.VectorKeyframeTrack;
      cloned.name = matchedName + propName;
      const values = cloned.values;
      if (values && values.length >= 3) {
        const baseRootX = values[0];
        const baseRootZ = values[2];
        const numKeys = cloned.times.length;
        for (let i = 0; i < numKeys; i++) {
          values[i * 3 + 0] = baseRootX;
          // values[i * 3 + 1] (Y: vertical elevation, jump, stomp) is 100% preserved
          values[i * 3 + 2] = baseRootZ;
        }
      }
      newTracks.push(cloned);
      continue;
    }
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
    kick1?: THREE.AnimationClip;
    kick2?: THREE.AnimationClip;
    kick3?: THREE.AnimationClip;
    invoke?: THREE.AnimationClip;
  };
}

/**
 * Helper to test and load candidate URLs
 */
async function tryLoadCandidateModel(urls: string[]): Promise<{ data: CachedModelData; url: string } | null> {
  for (const url of urls) {
    try {
      const data = await loadModelCached(url);
      if (data && data.object) {
        return { data, url };
      }
    } catch {
      // Continue trying next candidate
    }
  }
  return null;
}

/**
 * Helper to optionally load animation clips from GLB models
 */
async function tryLoadAnimationClip(urls: string[], clipName?: string): Promise<THREE.AnimationClip | null> {
  for (const url of urls) {
    try {
      const data = await loadModelCached(url);
      if (data?.animations?.[0]) {
        const clip = data.animations[0].clone();
        if (clipName) clip.name = clipName;
        return clip;
      }
    } catch {
      // Continue trying next candidate
    }
  }
  return null;
}

/**
 * Loads custom champion 3D mesh skin and dedicated animations if available.
 */
export async function loadChampionSkinModel(
  unitId: string,
  isMonsterTransformed: boolean = false
): Promise<ChampionSkinResult | null> {
  const normId = (unitId || '').toLowerCase();

  // 1. Zoro Dedicated Rig & Custom Animations (SkinZoro, IdleZoro, ZoroWalk, Slash1)
  if (normId === 'zoro') {
    const candidateUrls = ['./models/SkinZoro.glb', '/models/SkinZoro.glb'];
    const res = await tryLoadCandidateModel(candidateUrls);
    if (res) {
      const [walkClip, slashClip] = await Promise.all([
        tryLoadAnimationClip(['./models/ZoroWalk.glb', '/models/ZoroWalk.glb'], 'walk'),
        tryLoadAnimationClip(['./models/Slash1.glb', '/models/Slash1.glb'], 'slash1'),
      ]);
      return {
        ...res.data,
        url: res.url,
        isDedicatedSkin: true,
        customAnimations: {
          walk: walkClip || undefined,
          attack: slashClip || undefined,
          slash1: slashClip || undefined,
        },
      };
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
    const res = await tryLoadCandidateModel(candidateUrls);
    if (res) {
      return { ...res.data, url: res.url, isDedicatedSkin: true };
    }
    return null;
  }

  // 3. Nami Dedicated Rig (SkinNami, WalkFem, strictly no attack animation)
  if (normId === 'nami') {
    const candidateUrls = [
      './models/SkinNami.glb',
      '/models/SkinNami.glb',
      './models/IdleNami.glb',
      '/models/IdleNami.glb',
    ];
    const res = await tryLoadCandidateModel(candidateUrls);
    if (res) {
      const walkClip = await tryLoadAnimationClip(['./models/WalkFem.glb', '/models/WalkFem.glb'], 'walk');
      const idleClip = res.data.animations?.[0] || null;
      if (idleClip) idleClip.name = 'idle';

      return {
        ...res.data,
        url: res.url,
        isDedicatedSkin: true,
        customAnimations: {
          idle: idleClip || undefined,
          walk: walkClip || undefined,
          attack: undefined,
        },
      };
    }
    return null;
  }

  // 4. Usopp Dedicated Rig (SkinUsopp, UsoppAtk)
  if (normId === 'usopp') {
    const candidateUrls = ['./models/SkinUsopp.glb', '/models/SkinUsopp.glb'];
    const res = await tryLoadCandidateModel(candidateUrls);
    if (res) {
      const attackClip = await tryLoadAnimationClip(['./models/UsoppAtk.glb', '/models/UsoppAtk.glb'], 'attack');
      return {
        ...res.data,
        url: res.url,
        isDedicatedSkin: true,
        customAnimations: {
          attack: attackClip || undefined,
        },
      };
    }
    return null;
  }

  // 5. Chopper (SkinChopper, or SkinChopperMonster during 3-sec Rumble Ball awakening + ChopperMonsterActive invocation)
  if (normId === 'chopper' || normId === 'chopper_monster') {
    const wantsMonster = isMonsterTransformed || normId === 'chopper_monster';
    const candidateUrls = wantsMonster
      ? [
          './models/SkinChopperMonster.glb',
          '/models/SkinChopperMonster.glb',
          './models/Skinchoppermonster.glb',
          '/models/Skinchoppermonster.glb',
          './models/Skin_ChopperMonster.glb',
          './models/SkinChopper.glb',
          '/models/SkinChopper.glb',
        ]
      : [
          './models/SkinChopper.glb',
          '/models/SkinChopper.glb',
          './models/Skinchopper.glb',
          '/models/Skinchopper.glb',
          './models/skinChopper.glb',
          '/models/skinChopper.glb',
          './models/Skin_Chopper.glb',
          './models/Skin_Chopper.glb',
          './models/chopper.glb',
          '/models/chopper.glb',
          './models/Chopper.glb',
          '/models/Chopper.glb',
        ];

    const res = await tryLoadCandidateModel(candidateUrls);
    const invokeClip = await tryLoadAnimationClip(
      [
        './models/ChopperMonsterActive.glb',
        '/models/ChopperMonsterActive.glb',
        './models/Choppermonsteractive.glb',
        '/models/Choppermonsteractive.glb',
      ],
      'invoke'
    );

    if (res) {
      return {
        ...res.data,
        url: res.url,
        isDedicatedSkin: true,
        customAnimations: {
          invoke: invokeClip || undefined,
        },
      };
    }
    return null;
  }

  // 6. Crocodile (SkinCrocodile + CrocodileATK basic attack animation)
  if (normId === 'crocodile') {
    const candidateUrls = [
      './models/SkinCrocodile.glb',
      '/models/SkinCrocodile.glb',
      './models/Skincrocodile.glb',
      '/models/Skincrocodile.glb',
      './models/skinCrocodile.glb',
      '/models/skinCrocodile.glb',
      './models/Skin_Crocodile.glb',
      '/models/Skin_Crocodile.glb',
      './models/crocodile.glb',
      '/models/crocodile.glb',
      './models/Crocodile.glb',
      '/models/Crocodile.glb',
    ];
    const res = await tryLoadCandidateModel(candidateUrls);
    const attackClip = await tryLoadAnimationClip(
      [
        './models/CrocodileATK.glb',
        '/models/CrocodileATK.glb',
        './models/CrocodileAtk.glb',
        '/models/CrocodileAtk.glb',
        './models/crocodileatk.glb',
        '/models/crocodileatk.glb',
      ],
      'attack'
    );

    if (res) {
      return {
        ...res.data,
        url: res.url,
        isDedicatedSkin: true,
        customAnimations: {
          attack: attackClip || undefined,
        },
      };
    }
    return null;
  }

  // 7. Sanji (SkinSanji + SanjiKick1, SanjiKick2, Kick1: STRICTLY kicks, never punches)
  if (normId === 'sanji') {
    const candidateUrls = [
      './models/SkinSanji.glb',
      '/models/SkinSanji.glb',
      './models/Skinsanji.glb',
      '/models/Skinsanji.glb',
      './models/skinSanji.glb',
      '/models/skinSanji.glb',
      './models/Skin_Sanji.glb',
      '/models/Skin_Sanji.glb',
      './models/sanji.glb',
      '/models/sanji.glb',
      './models/Sanji.glb',
      '/models/Sanji.glb',
    ];
    const res = await tryLoadCandidateModel(candidateUrls);
    const [kick1Clip, kick2Clip, kick3Clip] = await Promise.all([
      tryLoadAnimationClip(['./models/Kick1.glb', '/models/Kick1.glb'], 'kick1'),
      tryLoadAnimationClip(
        [
          './models/SanjiKick1.glb',
          '/models/SanjiKick1.glb',
          './models/Sanjikick1.glb',
          '/models/Sanjikick1.glb',
        ],
        'kick2'
      ),
      tryLoadAnimationClip(
        [
          './models/SanjiKick2.glb',
          '/models/SanjiKick2.glb',
          './models/Sanjikick2.glb',
          '/models/Sanjikick2.glb',
        ],
        'kick3'
      ),
    ]);

    if (res) {
      return {
        ...res.data,
        url: res.url,
        isDedicatedSkin: true,
        customAnimations: {
          kick1: kick1Clip || undefined,
          kick2: kick2Clip || undefined,
          kick3: kick3Clip || undefined,
          attack: kick2Clip || kick1Clip || undefined,
        },
      };
    }
    return null;
  }

  // 8. Buggy (SkinBuggy)
  if (normId === 'buggy') {
    const candidateUrls = [
      './models/SkinBuggy.glb',
      '/models/SkinBuggy.glb',
      './models/Skinbuggy.glb',
      '/models/Skinbuggy.glb',
      './models/skinBuggy.glb',
      '/models/skinBuggy.glb',
      './models/Skin_Buggy.glb',
      '/models/Skin_Buggy.glb',
      './models/buggy.glb',
      '/models/buggy.glb',
      './models/Buggy.glb',
      '/models/Buggy.glb',
    ];
    const res = await tryLoadCandidateModel(candidateUrls);
    if (res) {
      return { ...res.data, url: res.url, isDedicatedSkin: true };
    }
    return null;
  }

  // 9. Mihawk (SkinMihawk + Slash1)
  if (normId === 'mihawk') {
    const candidateUrls = [
      './models/SkinMihawk.glb',
      '/models/SkinMihawk.glb',
      './models/Skinmihawk.glb',
      '/models/Skinmihawk.glb',
      './models/skinMihawk.glb',
      '/models/skinMihawk.glb',
      './models/Skin_Mihawk.glb',
      '/models/Skin_Mihawk.glb',
      './models/mihawk.glb',
      '/models/mihawk.glb',
      './models/Mihawk.glb',
      '/models/Mihawk.glb',
    ];
    const res = await tryLoadCandidateModel(candidateUrls);
    const slashClip = await tryLoadAnimationClip(['./models/Slash1.glb', '/models/Slash1.glb'], 'slash1');
    if (res) {
      return {
        ...res.data,
        url: res.url,
        isDedicatedSkin: true,
        customAnimations: {
          slash1: slashClip || undefined,
          attack: slashClip || undefined,
        },
      };
    }
    return null;
  }

  // 10. Shanks (SkinShanks + Slash1)
  if (normId === 'shanks') {
    const candidateUrls = [
      './models/SkinShanks.glb',
      '/models/SkinShanks.glb',
      './models/Skinshanks.glb',
      '/models/Skinshanks.glb',
      './models/skinShanks.glb',
      '/models/skinShanks.glb',
      './models/Skin_Shanks.glb',
      '/models/Skin_Shanks.glb',
      './models/shanks.glb',
      '/models/shanks.glb',
      './models/Shanks.glb',
      '/models/Shanks.glb',
    ];
    const res = await tryLoadCandidateModel(candidateUrls);
    const slashClip = await tryLoadAnimationClip(['./models/Slash1.glb', '/models/Slash1.glb'], 'slash1');
    if (res) {
      return {
        ...res.data,
        url: res.url,
        isDedicatedSkin: true,
        customAnimations: {
          slash1: slashClip || undefined,
          attack: slashClip || undefined,
        },
      };
    }
    return null;
  }

  // 11. Smoker (SkinSmoker / SkinSmoke)
  if (normId === 'smoker' || normId === 'smoke') {
    const candidateUrls = [
      './models/SkinSmoker.glb',
      '/models/SkinSmoker.glb',
      './models/Skinsmoker.glb',
      '/models/Skinsmoker.glb',
      './models/skinSmoker.glb',
      '/models/skinSmoker.glb',
      './models/SkinSmoke.glb',
      '/models/SkinSmoke.glb',
      './models/Skinsmoke.glb',
      '/models/Skinsmoke.glb',
      './models/Skin_Smoker.glb',
      '/models/Skin_Smoker.glb',
      './models/smoker.glb',
      '/models/smoker.glb',
      './models/Smoker.glb',
      '/models/Smoker.glb',
      './models/smoke.glb',
      '/models/smoke.glb',
    ];
    const res = await tryLoadCandidateModel(candidateUrls);
    if (res) {
      return { ...res.data, url: res.url, isDedicatedSkin: true };
    }
    return null;
  }

  // 12. Tashigi (SkinTashigi + Slash1)
  if (normId === 'tashigi') {
    const candidateUrls = [
      './models/SkinTashigi.glb',
      '/models/SkinTashigi.glb',
      './models/Skintashigi.glb',
      '/models/Skintashigi.glb',
      './models/skinTashigi.glb',
      '/models/skinTashigi.glb',
      './models/tashigi.glb',
      '/models/tashigi.glb',
      './models/Tashigi.glb',
      '/models/Tashigi.glb',
    ];
    const res = await tryLoadCandidateModel(candidateUrls);
    const slashClip = await tryLoadAnimationClip(['./models/Slash1.glb', '/models/Slash1.glb'], 'slash1');
    if (res) {
      return {
        ...res.data,
        url: res.url,
        isDedicatedSkin: true,
        customAnimations: {
          slash1: slashClip || undefined,
          attack: slashClip || undefined,
        },
      };
    }
    return null;
  }

  // 13. Marine Simple Recruit / Soldier (SkinMarine)
  if (normId.startsWith('marine')) {
    const candidateUrls = [
      './models/SkinMarine.glb',
      '/models/SkinMarine.glb',
      './models/Skinmarine.glb',
      '/models/Skinmarine.glb',
      './models/skinMarine.glb',
      '/models/skinMarine.glb',
      './models/SkinMarines.glb',
      '/models/SkinMarines.glb',
      './models/SkinMarineRecruit.glb',
      '/models/SkinMarineRecruit.glb',
      './models/Skin_Marine.glb',
      '/models/Skin_Marine.glb',
      './models/marine.glb',
      '/models/marine.glb',
      './models/Marine.glb',
      '/models/Marine.glb',
    ];
    const res = await tryLoadCandidateModel(candidateUrls);
    if (res) {
      return { ...res.data, url: res.url, isDedicatedSkin: true };
    }
    return null;
  }

  // 14. Boa Hancock (SkinBoaHancock)
  if (normId.includes('boa') || normId.includes('hancock')) {
    const candidateUrls = [
      './models/SkinBoaHancock.glb',
      '/models/SkinBoaHancock.glb',
      './models/Skinboahancock.glb',
      '/models/Skinboahancock.glb',
      './models/skinBoaHancock.glb',
      '/models/skinBoaHancock.glb',
      './models/SkinBoa.glb',
      '/models/SkinBoa.glb',
      './models/SkinHancock.glb',
      '/models/SkinHancock.glb',
      './models/Skin_BoaHancock.glb',
      '/models/Skin_BoaHancock.glb',
      './models/boahancock.glb',
      '/models/boahancock.glb',
      './models/boa.glb',
      '/models/boa.glb',
    ];
    const res = await tryLoadCandidateModel(candidateUrls);
    if (res) {
      return { ...res.data, url: res.url, isDedicatedSkin: true };
    }
    return null;
  }

  return null;
}

export async function loadChampionAttackAnimation(unitId: string): Promise<THREE.AnimationClip | null> {
  const normId = (unitId || '').toLowerCase();
  if (normId === 'zoro' || normId === 'mihawk' || normId === 'shanks' || normId === 'tashigi') {
    return tryLoadAnimationClip(['./models/Slash1.glb', '/models/Slash1.glb'], 'slash1');
  }
  if (normId === 'crocodile') {
    return tryLoadAnimationClip(['./models/CrocodileATK.glb', '/models/CrocodileATK.glb'], 'attack');
  }
  if (normId === 'sanji') {
    return (
      (await tryLoadAnimationClip(['./models/SanjiKick1.glb', '/models/SanjiKick1.glb'], 'kick2')) ||
      (await tryLoadAnimationClip(['./models/Kick1.glb', '/models/Kick1.glb'], 'kick1'))
    );
  }
  if (normId === 'chopper') {
    return tryLoadAnimationClip(
      ['./models/ChopperMonsterActive.glb', '/models/ChopperMonsterActive.glb'],
      'invoke'
    );
  }
  if (normId === 'nami') {
    // Nami strictly has no attack animation as requested
    return null;
  }
  if (normId === 'usopp') {
    return tryLoadAnimationClip(['./models/UsoppAtk.glb', '/models/UsoppAtk.glb'], 'attack');
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
      kick2Data,
      kick3Data,
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
      loadModelCached('./models/SanjiKick1.glb')
        .catch(() => loadModelCached('/models/SanjiKick1.glb'))
        .catch(() => null),
      loadModelCached('./models/SanjiKick2.glb')
        .catch(() => loadModelCached('/models/SanjiKick2.glb'))
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
    let kick2Clip = kick2Data?.animations?.[0] || kick1Clip;
    let kick3Clip = kick3Data?.animations?.[0] || kick1Clip;
    let turnLeftClip = turnLeftData?.animations?.[0];
    let turnRightClip = turnRightData?.animations?.[0];

    if (defaultIdleClip) defaultIdleClip.name = 'idle';
    if (walkClip) walkClip.name = 'walk';
    if (punch1Clip) punch1Clip.name = 'punch1';
    if (punch2Clip) punch2Clip.name = 'punch2';
    if (punch3Clip) punch3Clip.name = 'punch3';
    if (kick1Clip) kick1Clip.name = 'kick1';
    if (kick2Clip) kick2Clip.name = 'kick2';
    if (kick3Clip) kick3Clip.name = 'kick3';
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
        kick2: kick2Clip,
        kick3: kick3Clip,
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

