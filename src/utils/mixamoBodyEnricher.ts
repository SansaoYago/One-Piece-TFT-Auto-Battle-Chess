import * as THREE from 'three';

/**
 * Enriches character models (especially base skeletons / SkinBase / Marines)
 * with signature costumes, caps, uniforms, collars, and accessories.
 */
export function enrichMixamoModelIfNeeded(
  rig: THREE.Group,
  unitId: string,
  unitColor: string,
  isEnemy: boolean = false
): void {
  const normId = unitId.toLowerCase();
  const isMarine = normId.includes('marine');

  // Find all Mixamo skeleton bones (supporting both mixamorig:Name and mixamorigName formats)
  const bones: { [name: string]: THREE.Bone } = {};
  rig.traverse((child) => {
    if ((child as THREE.Bone).isBone) {
      const cleanName = child.name.replace(/^mixamorig:?/, '').toLowerCase();
      bones[cleanName] = child as THREE.Bone;
      bones[child.name] = child as THREE.Bone;
    }
  });

  const getBone = (name: string): THREE.Bone | null => {
    const clean = name.replace(/^mixamorig:?/, '').toLowerCase();
    return (
      bones[clean] ||
      bones[name] ||
      bones[`mixamorig:${name}`] ||
      bones[`mixamorig${name}`] ||
      null
    );
  };

  const headBone = getBone('Head') || getBone('Neck');
  const spine2Bone = getBone('Spine2') || getBone('Spine1');
  const spine1Bone = getBone('Spine1') || getBone('Spine');
  const hipsBone = getBone('Hips');
  const rightArmBone = getBone('RightArm');
  const leftArmBone = getBone('LeftArm');
  const rightLegBone = getBone('RightUpLeg') || getBone('RightLeg');
  const leftLegBone = getBone('LeftUpLeg') || getBone('LeftLeg');

  // 1. MARINE SOLDIER ENRICHMENT (Alpha, Bravo, Marine Recruits)
  if (isMarine) {
    enrichMarineUniform(
      {
        head: headBone,
        spine2: spine2Bone,
        spine1: spine1Bone,
        hips: hipsBone,
        rightArm: rightArmBone,
        leftArm: leftArmBone,
      },
      isEnemy
    );
    return;
  }

  // 2. LUFFY ENRICHMENT (Straw Hat, Red Pirate Vest, Yellow Sash)
  if (normId === 'luffy') {
    enrichLuffyCostume(
      { head: headBone, spine2: spine2Bone, spine1: spine1Bone, hips: hipsBone },
      isEnemy
    );
    return;
  }

  // 3. USOPP ENRICHMENT (Sniper Goggles, Brown Satchel Bag, Bandana, Yellow Overalls)
  if (normId === 'usopp') {
    enrichUsoppCostume(
      { head: headBone, spine2: spine2Bone, spine1: spine1Bone },
      isEnemy
    );
    return;
  }

  // 4. SANJI ENRICHMENT (Black Suit, Blonde Hair, Cigarette)
  if (normId === 'sanji') {
    enrichSanjiSuit(
      { head: headBone, spine2: spine2Bone, spine1: spine1Bone },
      isEnemy
    );
    return;
  }

  // 5. SMOKER ENRICHMENT (Marine Coat, Green Fur, Cigars)
  if (normId.includes('smoke')) {
    enrichSmokerCostume(
      { head: headBone, spine2: spine2Bone, spine1: spine1Bone },
      isEnemy
    );
    return;
  }

  // 6. CROCODILE ENRICHMENT (Coat, Fur Collar, Scar, Gold Hook)
  if (normId.includes('crocodile')) {
    enrichCrocodileCostume(
      { head: headBone, spine2: spine2Bone, leftArm: leftArmBone, leftHand: getBone('LeftHand') },
      isEnemy
    );
    return;
  }

  // 7. CHOPPER ENRICHMENT (Pink Hat with X, Blue Nose, Antlers, Backpack)
  if (normId === 'chopper') {
    enrichChopperCostume(
      { head: headBone, spine2: spine2Bone },
      isEnemy
    );
    return;
  }

  // 8. ZORO ENRICHMENT (Green Haramaki Sash, Arm Bandana)
  if (normId === 'zoro') {
    enrichZoroCostume(
      { spine1: spine1Bone, leftArm: leftArmBone },
      isEnemy
    );
    return;
  }

  // Generic procedural enrichment for untextured base mannequins
  enrichGenericMannequin(bones, unitColor, isEnemy);
}

/**
 * Full One Piece Marine Soldier Uniform & Cap
 */
function enrichMarineUniform(
  bones: {
    head: THREE.Bone | null;
    spine2: THREE.Bone | null;
    spine1: THREE.Bone | null;
    hips: THREE.Bone | null;
    rightArm: THREE.Bone | null;
    leftArm: THREE.Bone | null;
  },
  isEnemy: boolean
) {
  const whiteMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x991b1b : 0xf8fafc,
    roughness: 0.4,
  });

  const navyMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x4c0519 : 0x1e3a8a,
    roughness: 0.5,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.85,
    roughness: 0.25,
  });

  const redMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.5,
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.7,
  });

  // A. Marine Sailor Cap on Head
  if (bones.head) {
    const capGroup = new THREE.Group();
    capGroup.name = 'marine_cap';

    // Cap Crown (White top)
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(8.5, 7.8, 5, 18),
      whiteMat
    );
    crown.position.set(0, 8.5, 1.5);
    crown.rotation.x = -0.12;
    capGroup.add(crown);

    // Blue Cap Band
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(7.9, 7.9, 2.0, 18),
      navyMat
    );
    band.position.set(0, 6.8, 1.3);
    band.rotation.x = -0.12;
    capGroup.add(band);

    // Dark Navy Blue Brim / Visor
    const brim = new THREE.Mesh(
      new THREE.BoxGeometry(11.0, 1.0, 6.0),
      navyMat
    );
    brim.position.set(0, 6.5, 6.5);
    brim.rotation.x = 0.22;
    capGroup.add(brim);

    // Golden Marine Anchor Badge on front
    const anchorBadge = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.0, 0.6, 10),
      goldMat
    );
    anchorBadge.position.set(0, 7.8, 7.2);
    anchorBadge.rotation.x = Math.PI / 2;
    capGroup.add(anchorBadge);

    // Navy Blue Silk Ribbons flowing behind the cap
    const ribbonLeft = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 14.0, 0.4),
      navyMat
    );
    ribbonLeft.position.set(-2.5, 0.5, -6.5);
    ribbonLeft.rotation.x = -0.25;
    ribbonLeft.rotation.z = 0.15;
    capGroup.add(ribbonLeft);

    const ribbonRight = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 14.0, 0.4),
      navyMat
    );
    ribbonRight.position.set(2.5, 0.5, -6.5);
    ribbonRight.rotation.x = -0.25;
    ribbonRight.rotation.z = -0.15;
    capGroup.add(ribbonRight);

    bones.head.add(capGroup);
  }

  // B. Marine Sailor Collar (Seifuku) & Tie on Spine2 (Chest)
  if (bones.spine2) {
    const chestGroup = new THREE.Group();
    chestGroup.name = 'marine_chest_uniform';

    // Broad Navy Sailor Collar on upper back & shoulders
    const backCollar = new THREE.Mesh(
      new THREE.BoxGeometry(19.0, 13.0, 2.0),
      navyMat
    );
    backCollar.position.set(0, 7.0, -5.5);
    backCollar.rotation.x = -0.15;
    chestGroup.add(backCollar);

    // White Trim Border on Sailor Collar
    const collarTrim = new THREE.Mesh(
      new THREE.BoxGeometry(18.5, 1.2, 2.4),
      whiteMat
    );
    collarTrim.position.set(0, 1.2, -6.0);
    chestGroup.add(collarTrim);

    // Front V-Collar Lapels
    const leftLapel = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 11.0, 1.5),
      navyMat
    );
    leftLapel.position.set(-4.5, 5.0, 5.0);
    leftLapel.rotation.z = -0.28;
    chestGroup.add(leftLapel);

    const rightLapel = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 11.0, 1.5),
      navyMat
    );
    rightLapel.position.set(4.5, 5.0, 5.0);
    rightLapel.rotation.z = 0.28;
    chestGroup.add(rightLapel);

    // Scarlet Red Sailor Neckerchief / Tie
    const tieKnot = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 8, 8),
      redMat
    );
    tieKnot.position.set(0, 6.2, 5.8);
    chestGroup.add(tieKnot);

    const tieFlap = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 7.5, 4),
      redMat
    );
    tieFlap.position.set(0, 2.2, 5.6);
    tieFlap.rotation.x = 0.1;
    chestGroup.add(tieFlap);

    // Golden Naval Epaulets
    const epauletLeft = new THREE.Mesh(
      new THREE.BoxGeometry(6.5, 2.0, 6.0),
      goldMat
    );
    epauletLeft.position.set(-11.5, 8.5, 0);
    chestGroup.add(epauletLeft);

    const epauletRight = new THREE.Mesh(
      new THREE.BoxGeometry(6.5, 2.0, 6.0),
      goldMat
    );
    epauletRight.position.set(11.5, 8.5, 0);
    chestGroup.add(epauletRight);

    bones.spine2.add(chestGroup);
  }

  // C. Marine Leather Belt with Pouches on Spine1
  if (bones.spine1) {
    const beltGroup = new THREE.Group();
    beltGroup.name = 'marine_belt';

    const belt = new THREE.Mesh(
      new THREE.CylinderGeometry(9.5, 9.2, 3.0, 14),
      leatherMat
    );
    belt.position.set(0, 1.0, 0);
    beltGroup.add(belt);

    // Gold Buckle
    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 3.4, 1.0),
      goldMat
    );
    buckle.position.set(0, 1.0, 9.2);
    beltGroup.add(buckle);

    // Ammo Pouches
    const pouchLeft = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 4.0, 2.5),
      leatherMat
    );
    pouchLeft.position.set(-8.5, 0.5, 3.5);
    beltGroup.add(pouchLeft);

    const pouchRight = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 4.0, 2.5),
      leatherMat
    );
    pouchRight.position.set(8.5, 0.5, 3.5);
    beltGroup.add(pouchRight);

    bones.spine1.add(beltGroup);
  }
}

/**
 * Sanji's Signature Black Suit & Blonde Fringe
 */
function enrichSanjiSuit(
  bones: { head: THREE.Bone | null; spine2: THREE.Bone | null; spine1: THREE.Bone | null },
  isEnemy: boolean
) {
  const suitMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x881337 : 0x09090b,
    roughness: 0.35,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.4,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.9,
    roughness: 0.2,
  });

  if (bones.head) {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(7.5, 12, 12), hairMat);
    hair.position.set(-1.5, 8.5, 1.5);
    hair.scale.set(1.1, 1.1, 1.1);
    bones.head.add(hair);

    // Cigarette
    const cig = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 3.5, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    cig.position.set(1.5, 2.5, 6.5);
    cig.rotation.x = Math.PI / 2;
    cig.rotation.y = 0.3;
    bones.head.add(cig);

    const cigTip = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 6), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
    cigTip.position.set(2.4, 2.5, 8.0);
    bones.head.add(cigTip);
  }

  if (bones.spine2) {
    // Suit Lapels
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 2.5), suitMat);
    lapel.position.set(0, 6, 4.5);
    bones.spine2.add(lapel);

    // Gold Buttons
    [-2, 2].forEach((y) => {
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 8), goldMat);
      btn.position.set(0, y + 4, 6.0);
      btn.rotation.x = Math.PI / 2;
      bones.spine2.add(btn);
    });
  }
}

/**
 * Smoker's Marine Coat with Fur Collar & Jitte
 */
function enrichSmokerCostume(
  bones: { head: THREE.Bone | null; spine2: THREE.Bone | null; spine1: THREE.Bone | null },
  isEnemy: boolean
) {
  const coatMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x4c0519 : 0xf1f5f9,
    roughness: 0.5,
  });
  const furMat = new THREE.MeshStandardMaterial({
    color: 0x15803d, // Dark Green Fur Collar
    roughness: 0.9,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.9,
    roughness: 0.2,
  });

  if (bones.head) {
    // Twin Cigars
    [-1.2, 1.2].forEach((x) => {
      const cigar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 4.5, 6), new THREE.MeshBasicMaterial({ color: 0x78350f }));
      cigar.position.set(x, 2.5, 6.5);
      cigar.rotation.x = Math.PI / 2;
      cigar.rotation.y = x * 0.15;
      bones.head?.add(cigar);
    });
  }

  if (bones.spine2) {
    // Big Green Fur Collar
    const furCollar = new THREE.Mesh(new THREE.TorusGeometry(10.0, 3.5, 8, 16), furMat);
    furCollar.position.set(0, 10.0, 0);
    furCollar.rotation.x = Math.PI / 2;
    bones.spine2.add(furCollar);

    // Marine Coat on Back
    const backCoat = new THREE.Mesh(new THREE.BoxGeometry(20.0, 24.0, 2.5), coatMat);
    backCoat.position.set(0, 0, -6.5);
    bones.spine2.add(backCoat);

    // Nanashaku Jitte strapped across back
    const jitteShaft = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 48.0, 8), steelMat);
    jitteShaft.position.set(0, 5.0, -8.5);
    jitteShaft.rotation.z = 0.65;
    bones.spine2.add(jitteShaft);
  }
}

/**
 * Crocodile's Trenchcoat & Golden Hook
 */
function enrichCrocodileCostume(
  bones: { head: THREE.Bone | null; spine2: THREE.Bone | null; leftArm: THREE.Bone | null; leftHand?: THREE.Bone | null },
  isEnemy: boolean
) {
  const coatMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x701a75 : 0x14532d, // Dark fur coat
    roughness: 0.7,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.95,
    roughness: 0.15,
  });

  if (bones.spine2) {
    const furCoat = new THREE.Mesh(new THREE.BoxGeometry(24.0, 26.0, 4.0), coatMat);
    furCoat.position.set(0, 2.0, -6.0);
    bones.spine2.add(furCoat);
  }

  if (bones.leftHand || bones.leftArm) {
    const target = bones.leftHand || bones.leftArm;
    if (target) {
      // Giant Golden Hook
      const hookBase = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.0, 7.0, 10), goldMat);
      hookBase.position.set(0, 6.0, 0);
      target.add(hookBase);

      const hookCurve = new THREE.Mesh(new THREE.TorusGeometry(5.0, 1.2, 8, 16, Math.PI * 1.3), goldMat);
      hookCurve.position.set(0, 11.0, 2.0);
      hookCurve.rotation.y = Math.PI / 2;
      target.add(hookCurve);
    }
  }
}

/**
 * Chopper's Pink Hat, Blue Nose & Antlers
 */
function enrichChopperCostume(
  bones: { head: THREE.Bone | null; spine2: THREE.Bone | null },
  isEnemy: boolean
) {
  const pinkMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0xbe123c : 0xf43f5e,
    roughness: 0.5,
  });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
  const antlerMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });

  if (bones.head) {
    // Pink Cylinder Top Hat
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 12.0, 16), pinkMat);
    hat.position.set(0, 11.0, 0);
    bones.head.add(hat);

    const brim = new THREE.Mesh(new THREE.CylinderGeometry(12.5, 12.5, 1.5, 16), pinkMat);
    brim.position.set(0, 5.5, 0);
    bones.head.add(brim);

    // White Medical Cross on Hat
    const cross1 = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.8, 0.8), whiteMat);
    cross1.position.set(0, 11.0, 8.6);
    bones.head.add(cross1);

    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 6.0, 0.8), whiteMat);
    cross2.position.set(0, 11.0, 8.6);
    bones.head.add(cross2);

    // Blue Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 8), blueMat);
    nose.position.set(0, 3.5, 6.8);
    bones.head.add(nose);

    // Branched Antlers
    [-1, 1].forEach((dir) => {
      const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 14.0, 6), antlerMat);
      antler.position.set(dir * 8.5, 14.0, -1.0);
      antler.rotation.z = -dir * 0.45;
      antler.rotation.x = -0.2;
      bones.head?.add(antler);
    });
  }

  if (bones.spine2) {
    // Blue Backpack
    const pack = new THREE.Mesh(new THREE.BoxGeometry(14.0, 16.0, 9.0), blueMat);
    pack.position.set(0, 4.0, -8.5);
    bones.spine2.add(pack);
  }
}

/**
 * Zoro's Green Haramaki & Arm Bandana
 */
function enrichZoroCostume(
  bones: { spine1: THREE.Bone | null; leftArm: THREE.Bone | null },
  isEnemy: boolean
) {
  const haramakiMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x854d0e : 0x15803d, // Dark green belly sash
    roughness: 0.6,
  });
  const bandanaMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.5,
  });

  if (bones.spine1) {
    const haramaki = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 9.6, 9.0, 14), haramakiMat);
    haramaki.position.set(0, 3.0, 0);
    bones.spine1.add(haramaki);
  }

  if (bones.leftArm) {
    const bandana = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 3.5, 10), bandanaMat);
    bandana.position.set(0, 7.0, 0);
    bones.leftArm.add(bandana);
  }
}

/**
 * Luffy's Straw Hat, Red Pirate Vest & Yellow Waist Sash
 */
function enrichLuffyCostume(
  bones: {
    head: THREE.Bone | null;
    spine2: THREE.Bone | null;
    spine1: THREE.Bone | null;
    hips: THREE.Bone | null;
  },
  isEnemy: boolean
) {
  const strawMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x9a3412 : 0xf59e0b, // Straw golden yellow
    roughness: 0.8,
  });
  const ribbonMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x881337 : 0xdc2626, // Crimson red ribbon
    roughness: 0.4,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x991b1b : 0xdc2626, // Pirate captain red vest
    roughness: 0.5,
  });
  const sashMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0xb45309 : 0xeab308, // Golden waist sash
    roughness: 0.5,
  });

  // 1. Straw Hat on Head
  if (bones.head) {
    const hatGroup = new THREE.Group();
    // Hat Brim
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(15.0, 15.0, 1.0, 20), strawMat);
    hatGroup.add(brim);
    // Hat Crown
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.5, 7.0, 18), strawMat);
    crown.position.set(0, 3.5, 0);
    hatGroup.add(crown);
    // Red Ribbon Band
    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 9.6, 2.0, 18), ribbonMat);
    ribbon.position.set(0, 1.5, 0);
    hatGroup.add(ribbon);

    hatGroup.position.set(0, 12.0, -1.0);
    hatGroup.rotation.x = -0.15;
    bones.head.add(hatGroup);
  }

  // 2. Open Red Vest on Torso
  if (bones.spine2) {
    const vest = new THREE.Mesh(new THREE.BoxGeometry(15.0, 13.0, 10.0), vestMat);
    vest.position.set(0, 6.0, 0.5);
    bones.spine2.add(vest);
  }

  // 3. Yellow Waist Sash
  if (bones.spine1) {
    const sash = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.5, 6.0, 14), sashMat);
    sash.position.set(0, 2.0, 0);
    bones.spine1.add(sash);
  }
}

/**
 * Usopp's Sniper Goggles, Bandana & Ammo Satchel
 */
function enrichUsoppCostume(
  bones: {
    head: THREE.Bone | null;
    spine2: THREE.Bone | null;
    spine1: THREE.Bone | null;
  },
  isEnemy: boolean
) {
  const goggleMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.8,
    roughness: 0.2,
  });
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: new THREE.Color(0x0284c7),
    emissiveIntensity: 0.4,
    roughness: 0.1,
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x451a03 : 0x78350f, // Brown leather satchel
    roughness: 0.7,
  });
  const overallsMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x854d0e : 0xca8a04, // Yellow overalls
    roughness: 0.6,
  });

  // 1. Sniper Goggles on Forehead
  if (bones.head) {
    const goggleGroup = new THREE.Group();
    // Strap
    const strap = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 2.0, 16), goggleMat);
    strap.position.set(0, 7.5, 0);
    goggleGroup.add(strap);
    // Double Lens
    [-3.2, 3.2].forEach((x) => {
      const lensHolder = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 3.0, 12), goggleMat);
      lensHolder.rotation.x = Math.PI / 2;
      lensHolder.position.set(x, 7.5, 8.0);
      goggleGroup.add(lensHolder);

      const lens = new THREE.Mesh(new THREE.CircleGeometry(2.4, 12), lensMat);
      lens.position.set(x, 7.5, 9.6);
      goggleGroup.add(lens);
    });

    bones.head.add(goggleGroup);
  }

  // 2. Leather Satchel (Cross-Body Bag)
  if (bones.spine2) {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(9.0, 11.0, 6.0), leatherMat);
    bag.position.set(9.0, 0, 4.0);
    bag.rotation.z = -0.25;
    bones.spine2.add(bag);

    // Diagonal Strap
    const strap = new THREE.Mesh(new THREE.BoxGeometry(3.0, 18.0, 11.0), leatherMat);
    strap.position.set(0, 5.0, 0);
    strap.rotation.z = 0.55;
    bones.spine2.add(strap);
  }

  // 3. Yellow Overalls Bib
  if (bones.spine1) {
    const bib = new THREE.Mesh(new THREE.BoxGeometry(11.0, 8.0, 9.0), overallsMat);
    bib.position.set(0, 2.0, 1.0);
    bones.spine1.add(bib);
  }
}

/**
 * Generic Mannequin Enrichment fallback
 */
function enrichGenericMannequin(
  bones: { [name: string]: THREE.Bone },
  unitColor: string,
  isEnemy: boolean
) {
  const primaryColor = new THREE.Color(isEnemy ? '#f43f5e' : unitColor);
  const darkColor = new THREE.Color(isEnemy ? '#4c0519' : '#0f172a');
  const accentColor = new THREE.Color(isEnemy ? '#fda4af' : '#fde047');

  const skinMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    roughness: 0.35,
    metalness: 0.15,
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: darkColor,
    roughness: 0.55,
    metalness: 0.15,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.3,
    metalness: 0.2,
  });

  const headBone = bones['Head'] || bones['head'] || bones['mixamorigHead'];
  if (headBone) {
    const visor = new THREE.Mesh(new THREE.BoxGeometry(11, 3.2, 7), accentMat);
    visor.position.set(0, 8.5, 4.5);
    headBone.add(visor);
  }

  const spine2 = bones['Spine2'] || bones['spine2'] || bones['mixamorigSpine2'];
  if (spine2) {
    const vest = new THREE.Mesh(new THREE.BoxGeometry(15, 11, 12), darkMat);
    vest.position.set(0, 6, 1);
    spine2.add(vest);
  }
}
