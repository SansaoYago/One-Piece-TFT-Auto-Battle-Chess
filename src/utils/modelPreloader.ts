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
    femaleWalk?: THREE.AnimationClip;
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
  { url: './models/SkinLuffy.glb', label: 'Skin Luffy (SkinLuffy.glb)' },
  { url: './models/SkinZoro.glb', label: 'Skin Zoro (SkinZoro.glb)' },
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
              nameLower.includes('hawk_rifle') ||
              (url.toLowerCase().includes('zoro') && (nameLower.includes('object_8') || nameLower.includes('object_10') || nameLower.includes('weapon_d')))
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

  // Detect if the Hips bone's parent (e.g. Armature) has a non-identity rotation relative to targetModel.
  // Models like SkinUsopp.glb have an Armature node rotated by +90 deg on X (a standard Blender export artifact).
  // Standard animation clips (Walk.glb, UsoppAtk.glb) are authored with parent rotation = Identity.
  // When an animation sets mixamorig:Hips.quaternion without counteracting Armature's +90 deg X rotation,
  // the entire character tilts 90 deg forward and falls flat face-down onto the floor.
  // By pre-multiplying keyframe quaternions with hipsInvParentQuat, the character remains perfectly upright.
  let hipsInvParentQuat: THREE.Quaternion | null = null;
  const hipsBone = Array.from(modelBoneMap.entries()).find(([name]) => name.toLowerCase().includes('hips'))?.[1];
  if (hipsBone && hipsBone.parent) {
    targetModel.updateMatrixWorld(true);
    const parentWorldQ = new THREE.Quaternion();
    hipsBone.parent.getWorldQuaternion(parentWorldQ);
    const rootWorldQ = new THREE.Quaternion();
    targetModel.getWorldQuaternion(rootWorldQ);
    const relParentQ = rootWorldQ.clone().invert().multiply(parentWorldQ);
    const angle = 2 * Math.acos(Math.min(1, Math.max(-1, Math.abs(relParentQ.w))));
    if (angle > 0.01) {
      hipsInvParentQuat = relParentQ.clone().invert();
    }
  }

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

    // Keep the model scale controlled by the canonical height calculation.
    if (propName === '.scale' || propName === '.scaleXYZ') {
      continue;
    }

    // Critical: Only the root/Hips bone should have position/translation keyframes.
    // When translation tracks are applied to child bones (shoulders, arms, forearms, hands, legs),
    // they override the model's natural bone lengths and cause arms/limbs to stretch unnaturally.
    if (propName === '.position' || propName === '.translation') {
      const isHips = matchedName.toLowerCase().includes('hips');
      if (!isHips) {
        // Discard translation for all non-hips bones to preserve natural limb proportions without stretching
        continue;
      }
      const cloned = track.clone() as THREE.VectorKeyframeTrack;
      cloned.name = matchedName + (propName === '.translation' ? '.position' : propName);
      const values = cloned.values;
      if (values && values.length >= 3) {
        const targetBone = modelBoneMap.get(matchedName);
        const targetRestPos = targetBone ? targetBone.position.clone() : new THREE.Vector3(values[0], values[1], values[2]);

        // Find rest hip height in world/rig space
        let worldRestHeight = targetRestPos.y;
        if (targetBone) {
          const boneWorldPos = new THREE.Vector3();
          targetBone.getWorldPosition(boneWorldPos);
          const rootWorldPos = new THREE.Vector3();
          targetModel.getWorldPosition(rootWorldPos);
          worldRestHeight = Math.abs(boneWorldPos.y - rootWorldPos.y);
        }

        const animBaseY = values.length >= 2 ? values[1] : 1.0;
        const heightScale = (animBaseY > 0.001 && worldRestHeight > 0.001) ? (worldRestHeight / animBaseY) : 1.0;

        const numKeys = cloned.times.length;
        for (let i = 0; i < numKeys; i++) {
          const deltaY = (values[i * 3 + 1] - animBaseY) * heightScale;
          if (hipsInvParentQuat) {
            // Apply vertical delta along the true world up direction, converted to local parent space
            const deltaLocal = new THREE.Vector3(0, deltaY, 0).applyQuaternion(hipsInvParentQuat);
            values[i * 3 + 0] = targetRestPos.x + deltaLocal.x;
            values[i * 3 + 1] = targetRestPos.y + deltaLocal.y;
            values[i * 3 + 2] = targetRestPos.z + deltaLocal.z;
          } else {
            values[i * 3 + 0] = targetRestPos.x;
            values[i * 3 + 1] = targetRestPos.y + deltaY;
            values[i * 3 + 2] = targetRestPos.z;
          }
        }
      }
      newTracks.push(cloned);
      continue;
    }

    // Preserve rotations & quaternions retargeted to matched bone
    if (propName === '.quaternion' || propName === '.rotation') {
      const cloned = track.clone() as THREE.QuaternionKeyframeTrack;
      cloned.name = matchedName + (propName === '.rotation' ? '.quaternion' : propName);
      const isHips = matchedName.toLowerCase().includes('hips');
      if (isHips && hipsInvParentQuat) {
        const values = cloned.values;
        const numKeys = cloned.times.length;
        const q = new THREE.Quaternion();
        for (let i = 0; i < numKeys; i++) {
          q.set(values[i * 4 + 0], values[i * 4 + 1], values[i * 4 + 2], values[i * 4 + 3]);
          const corrected = hipsInvParentQuat.clone().multiply(q);
          values[i * 4 + 0] = corrected.x;
          values[i * 4 + 1] = corrected.y;
          values[i * 4 + 2] = corrected.z;
          values[i * 4 + 3] = corrected.w;
        }
      }
      newTracks.push(cloned);
      continue;
    }

    // Preserve any other property tracks
    const cloned = track.clone();
    cloned.name = matchedName + propName;
    newTracks.push(cloned);
  }

  return new THREE.AnimationClip(clip.name, clip.duration, newTracks);
}

/**
 * Strips position/translation tracks from all non-Hips bones to prevent limb stretching.
 */
export function sanitizeAnimationClip(clip: THREE.AnimationClip): THREE.AnimationClip {
  const sanitizedTracks: THREE.KeyframeTrack[] = [];
  for (const track of clip.tracks) {
    const dotIndex = track.name.lastIndexOf('.');
    if (dotIndex === -1) {
      sanitizedTracks.push(track.clone());
      continue;
    }
    const propName = track.name.substring(dotIndex);
    const nodeName = track.name.substring(0, dotIndex).toLowerCase();

    if (propName === '.scale' || propName === '.scaleXYZ') {
      continue;
    }

    if (propName === '.position' || propName === '.translation') {
      const isHips = nodeName.includes('hips') || nodeName.includes('root');
      if (!isHips) {
        // Skip child bone translation to avoid arm stretching
        continue;
      }
    }
    sanitizedTracks.push(track.clone());
  }
  return new THREE.AnimationClip(clip.name, clip.duration, sanitizedTracks);
}

export interface ChampionSkinResult extends CachedModelData {
  url: string;
  isDedicatedSkin: boolean;
  customAnimations?: {
    idle?: THREE.AnimationClip;
    walk?: THREE.AnimationClip;
    attack?: THREE.AnimationClip;
    slash1?: THREE.AnimationClip;
    cast?: THREE.AnimationClip;
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

  // 1. Zoro Dedicated Rig & Custom Animations (SkinZoro base POSE T, ZoroWalk, Slash1)
  if (normId === 'zoro') {
    const candidateUrls = ['./models/SkinZoro.glb', '/models/SkinZoro.glb'];
    const res = await tryLoadCandidateModel(candidateUrls);
    if (res) {
      const [walkClip, slashClip] = await Promise.all([
        tryLoadAnimationClip(['./models/Walk.glb', '/models/Walk.glb', './models/ZoroWalk.glb', '/models/ZoroWalk.glb'], 'walk'),
        tryLoadAnimationClip(['./models/Slash1.glb', '/models/Slash1.glb'], 'slash1'),
      ]);
      return {
        ...res.data,
        animations: [], // Explicitly clear any embedded idle animations so Zoro defaults to POSE T
        url: res.url,
        isDedicatedSkin: true,
        customAnimations: {
          idle: undefined, // Strict POSE T as requested: SkinZoro is base pre-battle and default pose
          walk: walkClip || undefined,
          attack: slashClip || undefined,
          slash1: slashClip || undefined,
        },
      };
    }
    return null;
  }

  // 2. Luffy Dedicated Rig (SkinLuffy base POSE T, Walk, Punch1/Punch2/Punch3)
  if (normId === 'luffy') {
    const candidateUrls = [
      './models/SkinLuffy.glb',
      '/models/SkinLuffy.glb',
    ];
    const res = await tryLoadCandidateModel(candidateUrls);
    if (res) {
      const [walkClip, punchClip] = await Promise.all([
        tryLoadAnimationClip(['./models/Walk.glb', '/models/Walk.glb'], 'walk'),
        tryLoadAnimationClip(['./models/Punch1.glb', '/models/Punch1.glb', './models/Punch2.glb'], 'punch'),
      ]);
      return {
        ...res.data,
        animations: [], // Explicitly clear any embedded idle animations so Luffy defaults to POSE T like Zoro
        url: res.url,
        isDedicatedSkin: true,
        customAnimations: {
          idle: undefined, // Follows Zoro's rule: clean base rest pose (POSE T) as default
          walk: walkClip || undefined,
          attack: punchClip || undefined,
        },
      };
    }
    return null;
  }

  // 3. Nami Dedicated Rig (SkinNami, WalkFem, Idle, Slash1 for Clima-Tact)
  if (normId === 'nami') {
    const candidateUrls = [
      './models/SkinNami.glb',
      '/models/SkinNami.glb',
    ];
    const res = await tryLoadCandidateModel(candidateUrls);
    if (res) {
      const [walkClip, idleClip, attackClip] = await Promise.all([
        tryLoadAnimationClip(['./models/WalkFem.glb', '/models/WalkFem.glb'], 'walk'),
        tryLoadAnimationClip(['./models/Idle.glb', '/models/Idle.glb'], 'idle'),
        tryLoadAnimationClip(['./models/Slash1.glb', '/models/Slash1.glb'], 'attack'),
      ]);

      return {
        ...res.data,
        url: res.url,
        isDedicatedSkin: true,
        customAnimations: {
          idle: idleClip || undefined,
          walk: walkClip || undefined,
          attack: attackClip || undefined,
          cast: attackClip || undefined,
        },
      };
    }
    return null;
  }

  // 4. Usopp Dedicated Rig (SkinUsopp base POSE T, Walk, UsoppAtk)
  if (normId === 'usopp') {
    const candidateUrls = ['./models/SkinUsopp.glb', '/models/SkinUsopp.glb'];
    const res = await tryLoadCandidateModel(candidateUrls);
    if (res) {
      const [walkClip, attackClip] = await Promise.all([
        tryLoadAnimationClip(['./models/Walk.glb', '/models/Walk.glb'], 'walk'),
        tryLoadAnimationClip(['./models/UsoppAtk.glb', '/models/UsoppAtk.glb'], 'attack'),
      ]);
      return {
        ...res.data,
        animations: [], // Explicitly clear any embedded idle animations so Usopp defaults to POSE T like Zoro
        url: res.url,
        isDedicatedSkin: true,
        customAnimations: {
          idle: undefined, // Follows Zoro's rule: clean base rest pose (POSE T) as default
          walk: walkClip || undefined,
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
      const [slashClip, spinClip, idleClip, walkClip] = await Promise.all([
        tryLoadAnimationClip(['./models/Slash1.glb', '/models/Slash1.glb'], 'attack'),
        tryLoadAnimationClip(['./models/SlashSpin.glb', '/models/SlashSpin.glb'], 'cast'),
        tryLoadAnimationClip(['./models/Idle.glb', '/models/Idle.glb'], 'idle'),
        tryLoadAnimationClip(['./models/Walk.glb', '/models/Walk.glb'], 'walk'),
      ]);
      return {
        ...res.data,
        url: res.url,
        isDedicatedSkin: true,
        customAnimations: {
          attack: slashClip || undefined,
          slash1: slashClip || undefined,
          cast: spinClip || undefined,
          idle: idleClip || undefined,
          walk: walkClip || undefined,
        },
      };
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
    const slashClip = await tryLoadAnimationClip(['./models/Slash1.glb', '/models/Slash1.glb'], 'slash1');
    const res = await tryLoadCandidateModel(candidateUrls);
    if (res) {
      return {
        ...res.data,
        url: res.url,
        isDedicatedSkin: true,
        customAnimations: {
          slash1: slashClip || undefined,
        },
      };
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
  if (normId === 'zoro' || normId === 'mihawk' || normId === 'shanks' || normId === 'tashigi' || normId.startsWith('marine') || normId === 'buggy') {
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
    return tryLoadAnimationClip(['./models/Slash1.glb', '/models/Slash1.glb'], 'attack');
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
    // 1. Try loading SkinLuffy GLB as base model
    const baseModel = await loadModelCached('./models/SkinLuffy.glb')
      .catch(() => loadModelCached('/models/SkinLuffy.glb'))
      .catch(() => null);

    // 2. Load animations in parallel
    const [
      walkData,
      femaleWalkData,
      punch1Data,
      punch2Data,
      punch3Data,
      kick1Data,
      turnLeftData,
      turnRightData,
    ] = await Promise.all([
      loadModelCached('./models/Walk.glb')
        .catch(() => loadModelCached('/models/Walk.glb'))
        .catch(() => null),
      loadModelCached('./models/WalkFem.glb')
        .catch(() => loadModelCached('/models/WalkFem.glb'))
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
      throw new Error('Base model (SkinLuffy.glb) not found');
    }

    let walkClip = walkData?.animations?.[0];
    // WalkFem.glb currently contains the female mesh but no animation clip;
    // use the compatible shared walk until a clipped WalkFem asset is supplied.
    let femaleWalkClip = femaleWalkData?.animations?.[0] || walkClip;
    let punch1Clip = punch1Data?.animations?.[0];
    let punch2Clip = punch2Data?.animations?.[0];
    let punch3Clip = punch3Data?.animations?.[0];
    let kick1Clip = kick1Data?.animations?.[0];
    let kick2Clip = kick1Clip;
    let kick3Clip = kick1Clip;
    let turnLeftClip = turnLeftData?.animations?.[0];
    let turnRightClip = turnRightData?.animations?.[0];

    if (walkClip) walkClip.name = 'walk';
    if (femaleWalkClip) femaleWalkClip.name = 'femaleWalk';
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
        walk: walkClip,
        femaleWalk: femaleWalkClip,
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

