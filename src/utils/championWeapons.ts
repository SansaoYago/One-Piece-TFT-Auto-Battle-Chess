import * as THREE from 'three';

function applyCompensationScale(weapon: THREE.Object3D, parent: THREE.Object3D) {
  let parentScaleIsTiny = false;
  let curr: THREE.Object3D | null = parent;
  while (curr) {
    if (curr.scale.x > 0 && curr.scale.x < 0.05) {
      parentScaleIsTiny = true;
      break;
    }
    curr = curr.parent;
  }
  if (parentScaleIsTiny) {
    weapon.scale.setScalar(100);
  } else {
    weapon.scale.setScalar(1);
  }
}

/**
 * Creates and attaches signature 3D weapons/accessories to champion models.
 */
export function attachChampionWeapons(
  model: THREE.Object3D,
  unitId: string,
  isEnemy: boolean,
  stars: number = 1
): THREE.Group | null {
  const normId = unitId.toLowerCase();

  // If Nami already has her Clima-Tact weapon attached, preserve it
  if (normId === 'nami') {
    const existingStaff = model.getObjectByName('weapon_clima_tact');
    if (existingStaff) {
      return existingStaff as THREE.Group;
    }
  }

  // Clean up any previously attached weapons to prevent duplication on star upgrade
  const toRemove: THREE.Object3D[] = [];
  model.traverse((child) => {
    if (child.name && (child.name.startsWith('weapon_') || child.name.includes('katana'))) {
      toRemove.push(child);
    }
  });
  toRemove.forEach((child) => {
    if (child.parent) {
      child.parent.remove(child);
    }
  });

  // Find Right Hand, Left Hand, Head, and Hips bones
  let rightHandBone: THREE.Object3D | null = null;
  let leftHandBone: THREE.Object3D | null = null;
  let headBone: THREE.Object3D | null = null;
  let hipsBone: THREE.Object3D | null = null;

  model.traverse((child) => {
    const name = child.name || '';
    const isFinger = /thumb|index|middle|ring|pinky|finger/i.test(name);
    if (/righthand|right_hand|hand_r|hand\.r/i.test(name) && !isFinger) {
      rightHandBone = child;
    } else if (/lefthand|left_hand|hand_l|hand\.l/i.test(name) && !isFinger) {
      leftHandBone = child;
    } else if (/head/i.test(name) && !/top|end/i.test(name) && !headBone) {
      headBone = child;
    } else if (/hips|pelvis/i.test(name) && !hipsBone) {
      hipsBone = child;
    }
  });

  if (!headBone) {
    model.traverse((child) => {
      const name = child.name || '';
      if (/head/i.test(name) && !headBone) {
        headBone = child;
      }
    });
  }

  if (!hipsBone) {
    model.traverse((child) => {
      const name = child.name || '';
      if (/spine/i.test(name) && !hipsBone) {
        hipsBone = child;
      }
    });
  }

  if (normId.includes('marine')) {
    // All Marine recruits / soldiers carry an officer cutlass sword in their right hand
    return attachMarineCutlass(rightHandBone || model, isEnemy);
  } else if (normId === 'nami') {
    return attachNamiClimaTact(model, rightHandBone || model, isEnemy);
  } else if (normId === 'tashigi') {
    return attachTashigiKatana(rightHandBone || model, isEnemy);
  } else if (normId === 'zoro') {
    // Hide any detached auxiliary sword meshes from SkinZoro.glb
    model.traverse((child) => {
      const n = (child.name || '').toLowerCase();
      if (n.includes('object_8') || n.includes('object_10') || n.includes('weapon_d')) {
        child.visible = false;
      }
    });
    return attachZoroSwordsByTier(rightHandBone || model, leftHandBone || model, headBone || model, hipsBone || model, isEnemy, stars);
  } else if (normId === 'shanks') {
    return attachShanksGryphonSaber(rightHandBone || model, isEnemy);
  } else if (normId === 'usopp') {
    // If model already has built-in slingshot (e.g. SkinUsopp.glb), do not attach duplicate
    let hasBuiltinWeapon = false;
    model.traverse((child) => {
      if (child.name && /usopp.*weapon|weapon.*body/i.test(child.name)) {
        hasBuiltinWeapon = true;
      }
    });
    if (hasBuiltinWeapon) {
      return null;
    }
    return attachUsoppSlingshot(rightHandBone || model, isEnemy);
  } else if (normId === 'mihawk') {
    return attachMihawkKokutoYoru(rightHandBone || model, isEnemy);
  }

  return null;
}

/**
 * Marine Flintlock Musket with Fixed Bayonet
 */
function attachMarineMusket(parent: THREE.Object3D, isEnemy: boolean): THREE.Group {
  const musket = new THREE.Group();
  musket.name = 'weapon_marine_musket';

  const woodMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x451a03 : 0x78350f,
    roughness: 0.7,
  });

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.92,
    roughness: 0.15,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.85,
    roughness: 0.25,
  });

  // 1. Long Wooden Rifle Stock & Body
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.65, 0.06), woodMat);
  stock.position.set(0, 0.18, 0);
  musket.add(stock);

  // 2. Long Polished Gunmetal Barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.85, 12), steelMat);
  barrel.position.set(0, 0.58, 0.02);
  musket.add(barrel);

  // 3. Brass Barrel Bands / Rings
  [0.32, 0.58, 0.82].forEach((posY) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.015, 12), brassMat);
    ring.position.set(0, posY, 0.02);
    musket.add(ring);
  });

  // 4. Flintlock Hammer & Lock Plate
  const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.08, 0.04), brassMat);
  lockPlate.position.set(0.022, 0.24, 0.02);
  musket.add(lockPlate);

  // 5. Fixed Bayonet Blade (pointed forward underneath muzzle)
  const bayonet = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.32, 0.028), steelMat);
  bayonet.position.set(0, 1.05, -0.01);
  musket.add(bayonet);

  // 6. Trigger Guard
  const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.005, 6, 10, Math.PI), brassMat);
  triggerGuard.position.set(0, 0.12, -0.03);
  triggerGuard.rotation.y = Math.PI / 2;
  musket.add(triggerGuard);

  // Align in soldier hand
  musket.position.set(0, 0.06, 0.04);
  musket.rotation.set(Math.PI / 2, 0, 0);

  applyCompensationScale(musket, parent);
  parent.add(musket);
  return musket;
}

/**
 * Marine Naval Officer Cutlass / Saber
 */
function attachMarineCutlass(parent: THREE.Object3D, isEnemy: boolean): THREE.Group {
  const cutlass = new THREE.Group();
  cutlass.name = 'weapon_marine_cutlass';

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.95,
    roughness: 0.12,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.9,
    roughness: 0.2,
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x4c0519 : 0x1e293b,
    roughness: 0.6,
  });

  // 1. Curved Cutlass Steel Blade
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.72, 0.045), bladeMat);
  blade.position.set(0, 0.40, 0);
  cutlass.add(blade);

  // 2. Full Brass D-Guard / Basket protecting hand
  const dGuard = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 8, 16, Math.PI), brassMat);
  dGuard.position.set(0, 0.04, 0.035);
  dGuard.rotation.y = Math.PI / 2;
  cutlass.add(dGuard);

  const guardPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 16), brassMat);
  guardPlate.position.set(0, 0.04, 0);
  cutlass.add(guardPlate);

  // 3. Leather Grip Handle
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 12), leatherMat);
  handle.position.set(0, -0.06, 0);
  cutlass.add(handle);

  // 4. Brass Pommel
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), brassMat);
  pommel.position.set(0, -0.16, 0);
  cutlass.add(pommel);

  cutlass.position.set(0, 0.05, 0.02);
  cutlass.rotation.set(Math.PI / 2, 0, 0);

  applyCompensationScale(cutlass, parent);
  parent.add(cutlass);
  return cutlass;
}

/**
 * Zoro's Legendary Katana Arsenal (The Sword Inventory)
 */
interface KatanaConfig {
  name: string;
  hiltColor: number;
  guardColor: number;
  sheathColor: number;
  bladeLength: number;
  glowColor?: number;
}

const ZORO_SWORD_INVENTORY: KatanaConfig[] = [
  {
    name: 'Wado Ichimonji',
    hiltColor: 0xf8fafc, // Pure White
    guardColor: 0xf59e0b, // Golden Oval Tsuba
    sheathColor: 0xf1f5f9,
    bladeLength: 0.86,
    glowColor: 0x38bdf8,
  },
  {
    name: 'Sandai Kitetsu',
    hiltColor: 0xdc2626, // Crimson Cursed Wrap
    guardColor: 0x92400e, // Bronze Cross
    sheathColor: 0x991b1b,
    bladeLength: 0.85,
    glowColor: 0xef4444,
  },
  {
    name: 'Shusui',
    hiltColor: 0x1e1b4b, // Deep Obsidian/Indigo
    guardColor: 0xd97706, // Flower Gold Tsuba
    sheathColor: 0x0f172a,
    bladeLength: 0.88,
    glowColor: 0xa855f7,
  },
  {
    name: 'Enma',
    hiltColor: 0x581c87, // Royal Purple
    guardColor: 0xeab308, // Gold Trefoil
    sheathColor: 0x3b0764,
    bladeLength: 0.89,
    glowColor: 0xc084fc,
  },
  {
    name: 'Yubashiri',
    hiltColor: 0x18181b, // Jet Black with Gold accents
    guardColor: 0xfacc15, // Cross Golden Guard
    sheathColor: 0x27272a,
    bladeLength: 0.84,
    glowColor: 0x60a5fa,
  },
  {
    name: 'Nidai Kitetsu',
    hiltColor: 0x991b1b, // Deep Maroon
    guardColor: 0x78350f, // Antiqued Bronze
    sheathColor: 0x7f1d1d,
    bladeLength: 0.87,
    glowColor: 0xf87171,
  },
];

/**
 * Creates an authentic Katana Scabbard (Saya) with Kojiri (chape),
 * Koi-guchi (mouth), Kurigata, and optional Tsuka (hilt) when sheathed.
 */
function createKatanaSheathMesh(options: {
  sheathLength: number;
  sheathColor: number;
  guardColor: number;
  hiltColor: number;
  isSheathed: boolean;
}): THREE.Group {
  const sheath = new THREE.Group();

  const sayaMat = new THREE.MeshStandardMaterial({
    color: options.sheathColor,
    roughness: 0.35,
    metalness: 0.2,
  });

  const fittingMat = new THREE.MeshStandardMaterial({
    color: options.guardColor,
    metalness: 0.85,
    roughness: 0.25,
  });

  // 1. Scabbard body (Saya)
  const saya = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, options.sheathLength, 0.042),
    sayaMat
  );
  saya.position.set(0, -options.sheathLength / 2, 0);
  sheath.add(saya);

  // 2. Throat band (Koi-guchi)
  const koiguchi = new THREE.Mesh(
    new THREE.BoxGeometry(0.026, 0.022, 0.046),
    fittingMat
  );
  koiguchi.position.set(0, -0.01, 0);
  sheath.add(koiguchi);

  // 3. Tip chape (Kojiri)
  const kojiri = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.03, 0.045),
    fittingMat
  );
  kojiri.position.set(0, -options.sheathLength, 0);
  sheath.add(kojiri);

  // 4. Middle Sageo / Kurigata knob
  const kurigata = new THREE.Mesh(
    new THREE.BoxGeometry(0.028, 0.04, 0.048),
    fittingMat
  );
  kurigata.position.set(0, -options.sheathLength * 0.25, 0);
  sheath.add(kurigata);

  if (options.isSheathed) {
    // Katana handle & guard still resting in sheath
    const hiltMat = new THREE.MeshStandardMaterial({
      color: options.hiltColor,
      roughness: 0.6,
    });

    const guard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.012, 16),
      fittingMat
    );
    guard.position.set(0, 0.01, 0);
    sheath.add(guard);

    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.20, 12),
      hiltMat
    );
    handle.position.set(0, 0.11, 0);
    sheath.add(handle);

    const pommel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.016, 12),
      fittingMat
    );
    pommel.position.set(0, 0.21, 0);
    sheath.add(pommel);
  } else {
    // Open empty throat slot
    const slotMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.005, 0.032),
      slotMat
    );
    slot.position.set(0, 0.002, 0);
    sheath.add(slot);
  }

  return sheath;
}

/**
 * Creates Zoro's signature 3 Katana Sheaths (Saya) bundled on his waist/hip sash,
 * showing all 3 on the same side in canonical One Piece fashion.
 */
function createZoroSheathsCluster(stars: number = 1): THREE.Group {
  const cluster = new THREE.Group();
  cluster.name = 'weapon_zoro_sheaths_cluster';

  const wadoConfig = ZORO_SWORD_INVENTORY[0];
  const kitetsuConfig = ZORO_SWORD_INVENTORY[1];
  const enmaConfig = ZORO_SWORD_INVENTORY[3] || ZORO_SWORD_INVENTORY[2];

  // 1. Wado Ichimonji (White Saya) - always drawn in Right Hand (1★, 2★, 3★)
  const sheath1 = createKatanaSheathMesh({
    sheathLength: 0.78,
    sheathColor: wadoConfig.sheathColor,
    guardColor: wadoConfig.guardColor,
    hiltColor: wadoConfig.hiltColor,
    isSheathed: false,
  });
  sheath1.position.set(0, 0, 0);
  cluster.add(sheath1);

  // 2. Sandai Kitetsu (Crimson Saya) - sheathed at 1★; drawn in Left Hand at 2★ & 3★
  const sheath2 = createKatanaSheathMesh({
    sheathLength: 0.76,
    sheathColor: kitetsuConfig.sheathColor,
    guardColor: kitetsuConfig.guardColor,
    hiltColor: kitetsuConfig.hiltColor,
    isSheathed: stars < 2,
  });
  sheath2.position.set(0.028, 0.012, -0.026);
  sheath2.rotation.z = -0.05;
  cluster.add(sheath2);

  // 3. Enma / Shusui (Purple / Black Saya) - sheathed at 1★ & 2★; drawn in Mouth at 3★
  const sheath3 = createKatanaSheathMesh({
    sheathLength: 0.79,
    sheathColor: enmaConfig.sheathColor,
    guardColor: enmaConfig.guardColor,
    hiltColor: enmaConfig.hiltColor,
    isSheathed: stars < 3,
  });
  sheath3.position.set(0.056, 0.025, -0.052);
  sheath3.rotation.z = -0.09;
  cluster.add(sheath3);

  // Zoro wears all 3 katanas on his right waist/hip, angled diagonally backwards
  cluster.position.set(-0.16, -0.03, 0.02);
  cluster.rotation.set(-0.50, 0.15, -0.28);

  return cluster;
}

/**
 * Zoro's Dynamic Sword Progression by Star Tier:
 * - 1★ (Ittoryu): 1 Katana (Right Hand) - Wado Ichimonji + 3 Sheaths on waist (2 sheathed, 1 drawn)
 * - 2★ (Nitoryu): 2 Katanas (Right Hand + Left Hand) - Wado + Sandai Kitetsu + 3 Sheaths on waist (1 sheathed, 2 drawn)
 * - 3★ (Santoryu): 3 Katanas (Right Hand + Left Hand + Mouth) - Wado + Kitetsu + Enma + 3 Sheaths on waist (all 3 drawn)
 */
function attachZoroSwordsByTier(
  rightHand: THREE.Object3D,
  leftHand: THREE.Object3D,
  head: THREE.Object3D,
  hips: THREE.Object3D,
  isEnemy: boolean,
  stars: number = 1
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'weapon_zoro_swords';

  const wadoConfig = ZORO_SWORD_INVENTORY[0]; // Wado Ichimonji
  const kitetsuConfig = ZORO_SWORD_INVENTORY[1]; // Sandai Kitetsu
  const enmaConfig = ZORO_SWORD_INVENTORY[3] || ZORO_SWORD_INVENTORY[2]; // Enma

  // 0. Hip Sheaths Cluster (All 3 sheaths bundled on the waist/hip on the same side)
  if (hips) {
    const sheaths = createZoroSheathsCluster(stars);
    const isRootModel = !hips.parent || hips.name.toLowerCase().includes('scene') || hips.name.toLowerCase().includes('group');
    if (isRootModel) {
      sheaths.position.set(-0.16, 0.85, 0.02);
    }
    applyCompensationScale(sheaths, hips);
    hips.add(sheaths);
  }

  // 1. Right Hand Katana (Equipped for all star levels 1★, 2★, 3★)
  const swordRight = createKatanaMesh({
    bladeLength: wadoConfig.bladeLength,
    hiltColor: wadoConfig.hiltColor,
    guardColor: wadoConfig.guardColor,
    sheathColor: wadoConfig.sheathColor,
    auraColor: isEnemy ? 0xf43f5e : (wadoConfig.glowColor || 0x10b981),
  });
  swordRight.name = 'weapon_katana_right';
  swordRight.position.set(0, 0.05, 0.02);
  swordRight.rotation.set(Math.PI / 2, 0, -0.15);
  applyCompensationScale(swordRight, rightHand);
  rightHand.add(swordRight);

  // 2. Left Hand Katana (Equipped for 2★ and 3★)
  if (stars >= 2) {
    const swordLeft = createKatanaMesh({
      bladeLength: kitetsuConfig.bladeLength,
      hiltColor: kitetsuConfig.hiltColor,
      guardColor: kitetsuConfig.guardColor,
      sheathColor: kitetsuConfig.sheathColor,
      auraColor: isEnemy ? 0xf43f5e : (kitetsuConfig.glowColor || 0xef4444),
    });
    swordLeft.name = 'weapon_katana_left';
    swordLeft.position.set(0, 0.05, -0.02);
    swordLeft.rotation.set(Math.PI / 2, 0, 0.15);
    applyCompensationScale(swordLeft, leftHand);
    leftHand.add(swordLeft);
  }

  // 3. Mouth Katana (Equipped exclusively for 3★ Santoryu master)
  if (stars >= 3 && head && head !== rightHand && head !== leftHand) {
    const swordMouth = createKatanaMesh({
      bladeLength: enmaConfig.bladeLength * 0.95,
      hiltColor: enmaConfig.hiltColor,
      guardColor: enmaConfig.guardColor,
      sheathColor: enmaConfig.sheathColor,
      auraColor: isEnemy ? 0xf43f5e : (enmaConfig.glowColor || 0xa855f7),
    });
    swordMouth.name = 'weapon_katana_mouth';
    // Position horizontally across teeth/mouth
    swordMouth.position.set(0, 0.06, 0.12);
    swordMouth.rotation.set(0, 0, Math.PI / 2);
    applyCompensationScale(swordMouth, head);
    head.add(swordMouth);
  }

  return root;
}

/**
 * Shanks' Signature Gryphon Saber (Single Large Western Saber with Golden Guard & Brown Wrap)
 */
function attachShanksGryphonSaber(rightHand: THREE.Object3D, isEnemy: boolean): THREE.Group {
  const saber = new THREE.Group();
  saber.name = 'weapon_gryphon';

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.95,
    roughness: 0.12,
  });

  const hiltMat = new THREE.MeshStandardMaterial({
    color: 0x78350f, // Rich leather brown
    roughness: 0.7,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.95,
    roughness: 0.2,
  });

  const hakiMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0xf43f5e : 0xef4444, // Red Conqueror's Haki
    emissive: new THREE.Color(isEnemy ? 0x991b1b : 0xdc2626),
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });

  // Long Curved Western Saber Blade
  const bladeGeo = new THREE.BoxGeometry(0.018, 0.92, 0.045);
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.position.set(0, 0.50, 0);
  saber.add(blade);

  // Red Conqueror's Haki Core Glow Strip along the blade spine
  const hakiSpine = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.80, 0.015), hakiMat);
  hakiSpine.position.set(0, 0.48, -0.015);
  saber.add(hakiSpine);

  // Big Golden D-Guard (Saber Guard)
  const dGuardGeo = new THREE.TorusGeometry(0.065, 0.01, 8, 16, Math.PI);
  const dGuard = new THREE.Mesh(dGuardGeo, goldMat);
  dGuard.rotation.y = Math.PI / 2;
  dGuard.position.set(0, 0.04, 0.04);
  saber.add(dGuard);

  const mainGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.014, 16), goldMat);
  mainGuard.position.set(0, 0.04, 0);
  saber.add(mainGuard);

  // Long Handle
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 12), hiltMat);
  handle.position.set(0, -0.07, 0);
  saber.add(handle);

  // Golden Pommel Cap
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 12), goldMat);
  pommel.position.set(0, -0.18, 0);
  saber.add(pommel);

  saber.position.set(0, 0.05, 0.02);
  saber.rotation.set(Math.PI / 2, 0, 0);

  applyCompensationScale(saber, rightHand);
  rightHand.add(saber);
  return saber;
}

/**
 * Helper to build custom styled katanas
 */
function createKatanaMesh(options: {
  bladeLength: number;
  hiltColor: number;
  guardColor: number;
  sheathColor: number;
  auraColor: number;
}): THREE.Group {
  const katana = new THREE.Group();

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.95,
    roughness: 0.12,
  });

  const hamonMat = new THREE.MeshStandardMaterial({
    color: options.auraColor,
    emissive: new THREE.Color(options.auraColor),
    emissiveIntensity: 0.5,
    roughness: 0.2,
  });

  const hiltMat = new THREE.MeshStandardMaterial({
    color: options.hiltColor,
    roughness: 0.6,
  });

  const guardMat = new THREE.MeshStandardMaterial({
    color: options.guardColor,
    metalness: 0.9,
    roughness: 0.25,
  });

  // Blade Mesh
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, options.bladeLength, 0.036),
    bladeMat
  );
  blade.position.set(0, options.bladeLength / 2 + 0.04, 0);
  katana.add(blade);

  // Subtle Glowing Hamon Wave Edge
  const hamon = new THREE.Mesh(
    new THREE.BoxGeometry(0.006, options.bladeLength * 0.9, 0.012),
    hamonMat
  );
  hamon.position.set(0, options.bladeLength / 2 + 0.04, 0.014);
  katana.add(hamon);

  // Guard (Tsuba)
  const guard = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.012, 16),
    guardMat
  );
  guard.position.set(0, 0.04, 0);
  katana.add(guard);

  // Handle (Tsuka)
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.20, 12),
    hiltMat
  );
  handle.position.set(0, -0.06, 0);
  katana.add(handle);

  // Pommel (Kashira)
  const pommel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.016, 12),
    guardMat
  );
  pommel.position.set(0, -0.16, 0);
  katana.add(pommel);

  return katana;
}

/**
 * Nami's Sorcery Clima-Tact (Authentic 3D mesh from SkinNami.glb or 4-orb procedural fallback)
 */
function attachNamiClimaTact(model: THREE.Object3D, parent: THREE.Object3D, isEnemy: boolean): THREE.Group {
  // 1. If Nami already has weapon_clima_tact attached, preserve it directly
  const existingWrapper = model.getObjectByName('weapon_clima_tact');
  if (existingWrapper) {
    return existingWrapper as THREE.Group;
  }

  // 2. Check if model already includes the authentic 3D Clima-Tact (e.g. Sketchfab_model from SkinNami.glb)
  let embeddedStaff: THREE.Object3D | null = null;
  model.traverse((child) => {
    if (
      !embeddedStaff &&
      (child.name === 'Sketchfab_model' ||
        child.name.toLowerCase().includes('sketchfab') ||
        /circle\.013|cylinder\.004|clima.*tact/i.test(child.name))
    ) {
      let curr: THREE.Object3D = child;
      while (curr.parent && curr.parent !== model && curr.parent.name !== 'Scene') {
        curr = curr.parent;
      }
      embeddedStaff = curr;
    }
  });

  if (embeddedStaff) {
    // Measure bounding box of the embedded staff in model space before reparenting
    model.updateMatrixWorld(true);
    const staffBox = new THREE.Box3().setFromObject(embeddedStaff);
    const staffCenter = staffBox.getCenter(new THREE.Vector3());

    // Detach from current root parent so it no longer floats disconnected at the side
    if (embeddedStaff.parent) {
      embeddedStaff.parent.remove(embeddedStaff);
    }

    const staffWrapper = new THREE.Group();
    staffWrapper.name = 'weapon_clima_tact';

    // Center staff geometry so its hand grip point (middle of the staff, around Y = 0.85m) is at local origin (0, 0, 0)
    // The authentic staff in SkinNami.glb is oriented vertically along Y (from y = 0 to 1.64m, center at y = 0.82m)
    embeddedStaff.position.set(-staffCenter.x, -0.85, -staffCenter.z);
    staffWrapper.add(embeddedStaff);

    // Apply compensation scale and attach directly to Nami's right hand bone
    applyCompensationScale(staffWrapper, parent);
    parent.add(staffWrapper);
    return staffWrapper;
  }

  // 3. Fallback: Procedural Clima-Tact if model does not contain an embedded staff
  const climaTact = new THREE.Group();
  climaTact.name = 'weapon_clima_tact';

  const staffMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0xd97706 : 0x0284c7, // Turquoise cyan (#0284c7) or fiery amber for enemy
    metalness: 0.80,
    roughness: 0.25,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.9,
    roughness: 0.2,
  });

  const orbMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0xf43f5e : 0x38bdf8,
    emissive: isEnemy ? new THREE.Color(0xf43f5e) : new THREE.Color(0x38bdf8),
    emissiveIntensity: 0.85,
    roughness: 0.12,
  });

  // Main connected staff shaft (length: 1.05m, center at y = 0)
  const staffGeometry = new THREE.CylinderGeometry(0.015, 0.015, 1.05, 16);
  const staffMesh = new THREE.Mesh(staffGeometry, staffMat);
  climaTact.add(staffMesh);

  // 4 Weather Orbs matching Image 3 (Top, Upper-Mid, Lower-Mid, Bottom)
  const orbGeo = new THREE.SphereGeometry(0.036, 16, 16);
  const ringGeo = new THREE.TorusGeometry(0.023, 0.005, 8, 16);

  // 1. Top Weather Orb (+0.48m from center)
  const topOrb = new THREE.Mesh(orbGeo, orbMat);
  topOrb.position.set(0, 0.48, 0);
  climaTact.add(topOrb);
  const topRing = new THREE.Mesh(ringGeo, goldMat);
  topRing.rotation.x = Math.PI / 2;
  topRing.position.set(0, 0.44, 0);
  climaTact.add(topRing);

  // 2. Upper-Mid Weather Orb (+0.16m from center)
  const upperMidOrb = new THREE.Mesh(orbGeo, orbMat);
  upperMidOrb.position.set(0, 0.16, 0);
  climaTact.add(upperMidOrb);
  const upperMidRing = new THREE.Mesh(ringGeo, goldMat);
  upperMidRing.rotation.x = Math.PI / 2;
  upperMidRing.position.set(0, 0.13, 0);
  climaTact.add(upperMidRing);

  // 3. Lower-Mid Weather Orb (-0.16m from center)
  const lowerMidOrb = new THREE.Mesh(orbGeo, orbMat);
  lowerMidOrb.position.set(0, -0.16, 0);
  climaTact.add(lowerMidOrb);
  const lowerMidRing = new THREE.Mesh(ringGeo, goldMat);
  lowerMidRing.rotation.x = Math.PI / 2;
  lowerMidRing.position.set(0, -0.13, 0);
  climaTact.add(lowerMidRing);

  // 4. Bottom Weather Orb (-0.48m from center)
  const bottomOrb = new THREE.Mesh(orbGeo, orbMat);
  bottomOrb.position.set(0, -0.48, 0);
  climaTact.add(bottomOrb);
  const bottomRing = new THREE.Mesh(ringGeo, goldMat);
  bottomRing.rotation.x = Math.PI / 2;
  bottomRing.position.set(0, -0.44, 0);
  climaTact.add(bottomRing);

  // Position and orient weapon relative to right hand:
  climaTact.position.set(0, 0.02, 0);
  climaTact.rotation.set(Math.PI, 0, 0);

  applyCompensationScale(climaTact, parent);
  parent.add(climaTact);
  return climaTact;
}

/**
 * Tashigi's Katana (Shigure)
 */
function attachTashigiKatana(parent: THREE.Object3D, isEnemy: boolean): THREE.Group {
  const katana = new THREE.Group();
  katana.name = 'weapon_shigure';

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.15,
  });

  const hiltMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x991b1b : 0x1e3a8a,
    roughness: 0.6,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.9,
    roughness: 0.3,
  });

  // Blade
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.75, 0.035),
    bladeMat
  );
  blade.position.set(0, 0.42, 0);
  katana.add(blade);

  // Guard (Tsuba)
  const guard = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.012, 16),
    goldMat
  );
  guard.position.set(0, 0.05, 0);
  katana.add(guard);

  // Handle (Tsuka)
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.18, 12),
    hiltMat
  );
  handle.position.set(0, -0.05, 0);
  katana.add(handle);

  katana.position.set(0, 0.04, 0.02);
  katana.rotation.set(Math.PI / 2, 0, 0);

  applyCompensationScale(katana, parent);
  parent.add(katana);
  return katana;
}

/**
 * Usopp's Slingshot (Ginga Pachinko / Kabuto)
 */
function attachUsoppSlingshot(parent: THREE.Object3D, isEnemy: boolean): THREE.Group {
  const slingshot = new THREE.Group();
  slingshot.name = 'weapon_slingshot';

  const woodMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x78350f : 0x92400e,
    roughness: 0.8,
  });

  const bandMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.4,
  });

  // Handle
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.22, 10),
    woodMat
  );
  handle.position.set(0, -0.04, 0);
  slingshot.add(handle);

  // Left Fork
  const leftFork = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.14, 8),
    woodMat
  );
  leftFork.position.set(0.045, 0.08, 0);
  leftFork.rotation.z = -0.35;
  slingshot.add(leftFork);

  // Right Fork
  const rightFork = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.14, 8),
    woodMat
  );
  rightFork.position.set(-0.045, 0.08, 0);
  rightFork.rotation.z = 0.35;
  slingshot.add(rightFork);

  // Rubber Band
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.05, 0.007, 6, 12, Math.PI),
    bandMat
  );
  band.position.set(0, 0.13, 0);
  band.rotation.x = Math.PI / 2;
  slingshot.add(band);

  slingshot.position.set(0, 0.05, 0.02);
  slingshot.rotation.set(Math.PI / 2, 0, 0);

  applyCompensationScale(slingshot, parent);
  parent.add(slingshot);
  return slingshot;
}

/**
 * Mihawk's Kokuto Yoru (The World's Strongest Black Blade - Giant Ornate Cross Blade)
 */
function attachMihawkKokutoYoru(parent: THREE.Object3D, isEnemy: boolean): THREE.Group {
  const yoru = new THREE.Group();
  yoru.name = 'weapon_kokuto_yoru';

  const blackBladeMat = new THREE.MeshStandardMaterial({
    color: 0x09090b, // Obsidian Black Steel
    metalness: 0.95,
    roughness: 0.15,
  });

  const edgeMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0xf43f5e : 0x10b981, // Emerald Green / Crimson Blade Aura
    metalness: 0.8,
    roughness: 0.2,
    emissive: isEnemy ? 0x9f1239 : 0x064e3b,
    emissiveIntensity: 0.6,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Golden Cross Guard
    metalness: 0.9,
    roughness: 0.25,
  });

  const jewelMat = new THREE.MeshStandardMaterial({
    color: 0x059669, // Ornate Green Gems
    metalness: 0.2,
    roughness: 0.1,
    emissive: 0x10b981,
    emissiveIntensity: 0.8,
  });

  // 1. Massive Colossal Black Blade
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 1.45, 0.02),
    blackBladeMat
  );
  blade.position.set(0, 0.72, 0);
  yoru.add(blade);

  // 2. Glowing Sharp Cutting Edge
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 1.43, 0.025),
    edgeMat
  );
  edge.position.set(0.06, 0.72, 0);
  yoru.add(edge);

  // 3. Wide Cross Guard (Mihawk's distinct cross)
  const crossGuard = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.06, 0.06),
    goldMat
  );
  crossGuard.position.set(0, 0.02, 0);
  yoru.add(crossGuard);

  // 4. Jewels on Cross Guard Tips
  [-0.26, 0, 0.26].forEach((posX) => {
    const gem = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      jewelMat
    );
    gem.position.set(posX, 0.02, 0);
    yoru.add(gem);
  });

  // 5. Long Ornate Hilt
  const hilt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.35, 12),
    goldMat
  );
  hilt.position.set(0, -0.18, 0);
  yoru.add(hilt);

  // 6. Cross Pommel
  const pommel = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    jewelMat
  );
  pommel.position.set(0, -0.36, 0);
  yoru.add(pommel);

  // Position on hand
  yoru.position.set(0, 0.05, 0.02);
  yoru.rotation.set(Math.PI / 2, 0, 0);

  applyCompensationScale(yoru, parent);
  parent.add(yoru);
  return yoru;
}
