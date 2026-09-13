import * as THREE from 'three';

export interface ProceduralMannequin {
  root: THREE.Group;
  parts: {
    head: THREE.Group;
    torso: THREE.Group;
    pelvis: THREE.Group;
    leftShoulder: THREE.Group;
    leftUpperArm: THREE.Group;
    leftForearm: THREE.Group;
    leftHand: THREE.Group;
    rightShoulder: THREE.Group;
    rightUpperArm: THREE.Group;
    rightForearm: THREE.Group;
    rightHand: THREE.Group;
    leftThigh: THREE.Group;
    leftCalf: THREE.Group;
    leftFoot: THREE.Group;
    rightThigh: THREE.Group;
    rightCalf: THREE.Group;
    rightFoot: THREE.Group;
  };
  materials: {
    skin: THREE.MeshStandardMaterial;
    accent: THREE.MeshStandardMaterial;
    dark: THREE.MeshStandardMaterial;
    glow: THREE.MeshStandardMaterial;
  };
  update: (delta: number, time: number, animName: 'idle' | 'walk' | 'punch' | 'cast', isEnemy?: boolean) => void;
}

export function createProceduralMannequin(unitColor: string, isEnemy: boolean = false, hasOrb: boolean = false): ProceduralMannequin {
  const root = new THREE.Group();

  const primaryColor = new THREE.Color(isEnemy ? '#f43f5e' : unitColor);
  const darkColor = new THREE.Color(isEnemy ? '#4c0519' : '#0f172a');
  const accentColor = new THREE.Color(isEnemy ? '#fda4af' : '#fde047');

  const skinMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    roughness: 0.35,
    metalness: 0.15,
    emissive: hasOrb ? new THREE.Color('#9333ea') : primaryColor.clone().multiplyScalar(0.25),
    emissiveIntensity: hasOrb ? 0.45 : 0.4,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.3,
    metalness: 0.2,
    emissive: hasOrb ? new THREE.Color('#c084fc') : accentColor.clone().multiplyScalar(0.3),
    emissiveIntensity: hasOrb ? 0.5 : 0.3,
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: darkColor,
    roughness: 0.6,
    metalness: 0.1,
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: hasOrb ? new THREE.Color('#c084fc') : primaryColor.clone().offsetHSL(0, 0.1, 0.2),
    roughness: 0.2,
    metalness: 0.3,
    emissive: hasOrb ? new THREE.Color('#a855f7') : primaryColor,
    emissiveIntensity: hasOrb ? 0.7 : 0.6,
  });

  // Pelvis / Core Center - Elevated so feet rest cleanly at y=0 on the arena floor
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.78, 0);
  root.add(pelvis);

  const pelvisMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.15, 0.14, 12),
    darkMat
  );
  pelvis.add(pelvisMesh);

  // Torso / Chest
  const torso = new THREE.Group();
  torso.position.set(0, 0.12, 0);
  pelvis.add(torso);

  const chestMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.17, 0.28, 12),
    skinMat
  );
  chestMesh.position.set(0, 0.14, 0);
  torso.add(chestMesh);

  // Tactical Chest Armor / Vest plate
  const armorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.22, 0.22),
    darkMat
  );
  armorMesh.position.set(0, 0.16, 0.03);
  torso.add(armorMesh);

  // Head & Neck
  const head = new THREE.Group();
  head.position.set(0, 0.34, 0);
  torso.add(head);

  const neckMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.09, 0.08, 10),
    skinMat
  );
  neckMesh.position.set(0, -0.01, 0);
  head.add(neckMesh);

  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 16),
    skinMat
  );
  headMesh.position.set(0, 0.13, 0);
  headMesh.scale.set(1, 1.15, 1.05);
  head.add(headMesh);

  // Stylized Head Silhouette / Visor / Bandana
  const visorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.07, 0.14),
    accentMat
  );
  visorMesh.position.set(0, 0.13, 0.1);
  head.add(visorMesh);

  // ---------------- LEFT ARM ----------------
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(0.25, 0.24, 0);
  torso.add(leftShoulder);

  const leftShoulderPad = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 12),
    darkMat
  );
  leftShoulder.add(leftShoulderPad);

  const leftUpperArm = new THREE.Group();
  leftUpperArm.position.set(0.06, -0.06, 0);
  leftShoulder.add(leftUpperArm);

  const leftUpperArmMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.055, 0.22, 10),
    skinMat
  );
  leftUpperArmMesh.position.set(0, -0.11, 0);
  leftUpperArm.add(leftUpperArmMesh);

  const leftForearm = new THREE.Group();
  leftForearm.position.set(0, -0.22, 0);
  leftUpperArm.add(leftForearm);

  const leftForearmMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.05, 0.22, 10),
    skinMat
  );
  leftForearmMesh.position.set(0, -0.11, 0);
  leftForearm.add(leftForearmMesh);

  const leftHand = new THREE.Group();
  leftHand.position.set(0, -0.22, 0);
  leftForearm.add(leftHand);

  const leftFistMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.08),
    glowMat
  );
  leftHand.add(leftFistMesh);

  // ---------------- RIGHT ARM ----------------
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(-0.25, 0.24, 0);
  torso.add(rightShoulder);

  const rightShoulderPad = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 12),
    darkMat
  );
  rightShoulder.add(rightShoulderPad);

  const rightUpperArm = new THREE.Group();
  rightUpperArm.position.set(-0.06, -0.06, 0);
  rightShoulder.add(rightUpperArm);

  const rightUpperArmMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.055, 0.22, 10),
    skinMat
  );
  rightUpperArmMesh.position.set(0, -0.11, 0);
  rightUpperArm.add(rightUpperArmMesh);

  const rightForearm = new THREE.Group();
  rightForearm.position.set(0, -0.22, 0);
  rightUpperArm.add(rightForearm);

  const rightForearmMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.05, 0.22, 10),
    skinMat
  );
  rightForearmMesh.position.set(0, -0.11, 0);
  rightForearm.add(rightForearmMesh);

  const rightHand = new THREE.Group();
  rightHand.position.set(0, -0.22, 0);
  rightForearm.add(rightHand);

  const rightFistMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.08),
    glowMat
  );
  rightHand.add(rightFistMesh);

  // ---------------- LEFT LEG ----------------
  const leftThigh = new THREE.Group();
  leftThigh.position.set(0.12, -0.06, 0);
  pelvis.add(leftThigh);

  const leftThighMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.07, 0.32, 12),
    skinMat
  );
  leftThighMesh.position.set(0, -0.16, 0);
  leftThigh.add(leftThighMesh);

  const leftCalf = new THREE.Group();
  leftCalf.position.set(0, -0.32, 0);
  leftThigh.add(leftCalf);

  const leftCalfMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.065, 0.32, 12),
    darkMat
  );
  leftCalfMesh.position.set(0, -0.16, 0);
  leftCalf.add(leftCalfMesh);

  const leftFoot = new THREE.Group();
  leftFoot.position.set(0, -0.32, 0);
  leftCalf.add(leftFoot);

  const leftFootMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.08, 0.18),
    darkMat
  );
  leftFootMesh.position.set(0, -0.04, 0.04);
  leftFoot.add(leftFootMesh);

  // ---------------- RIGHT LEG ----------------
  const rightThigh = new THREE.Group();
  rightThigh.position.set(-0.12, -0.06, 0);
  pelvis.add(rightThigh);

  const rightThighMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.07, 0.32, 12),
    skinMat
  );
  rightThighMesh.position.set(0, -0.16, 0);
  rightThigh.add(rightThighMesh);

  const rightCalf = new THREE.Group();
  rightCalf.position.set(0, -0.32, 0);
  rightThigh.add(rightCalf);

  const rightCalfMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.065, 0.32, 12),
    darkMat
  );
  rightCalfMesh.position.set(0, -0.16, 0);
  rightCalf.add(rightCalfMesh);

  const rightFoot = new THREE.Group();
  rightFoot.position.set(0, -0.32, 0);
  rightCalf.add(rightFoot);

  const rightFootMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.08, 0.18),
    darkMat
  );
  rightFootMesh.position.set(0, -0.04, 0.04);
  rightFoot.add(rightFootMesh);

  // Enable Shadows
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Animation Update Function (Dynamic Procedural Humanoid Rig)
  const update = (_delta: number, time: number, animName: 'idle' | 'walk' | 'punch' | 'cast', _isEnemy?: boolean) => {
    if (animName === 'punch') {
      // Powerful punch attack animation
      const punchCycle = (time * 7.5) % Math.PI;
      const punchExtend = Math.sin(punchCycle);

      // Right arm thrusts forward with fist
      rightUpperArm.rotation.x = -Math.PI * 0.45 - punchExtend * 0.9;
      rightUpperArm.rotation.y = 0.2;
      rightUpperArm.rotation.z = -0.3;
      rightForearm.rotation.x = -0.2 - punchExtend * 0.5;

      // Left arm guards face
      leftUpperArm.rotation.x = -Math.PI * 0.35;
      leftUpperArm.rotation.y = -0.4;
      leftUpperArm.rotation.z = 0.5;
      leftForearm.rotation.x = -1.1;

      torso.rotation.y = -punchExtend * 0.35;
      pelvis.position.y = 0.72 + Math.sin(time * 15) * 0.03;
      head.rotation.y = punchExtend * 0.15;

      // Stance legs
      leftThigh.rotation.x = -0.3;
      rightThigh.rotation.x = 0.4;
      leftCalf.rotation.x = 0.4;
      rightCalf.rotation.x = 0.2;
    } else if (animName === 'walk') {
      // Dynamic Tactical Walk Cycle
      const walkSpeed = 9.0;
      const legAngle = Math.sin(time * walkSpeed) * 0.65;
      const armAngle = Math.sin(time * walkSpeed) * 0.55;

      // Legs swing in opposite phases
      leftThigh.rotation.x = legAngle;
      rightThigh.rotation.x = -legAngle;
      leftCalf.rotation.x = legAngle > 0 ? legAngle * 0.8 : 0.1;
      rightCalf.rotation.x = -legAngle > 0 ? -legAngle * 0.8 : 0.1;

      // Arms swing rhythmically in counter-phase
      leftUpperArm.rotation.x = -armAngle - 0.2;
      leftUpperArm.rotation.z = 0.25;
      leftForearm.rotation.x = -0.4;

      rightUpperArm.rotation.x = armAngle - 0.2;
      rightUpperArm.rotation.z = -0.25;
      rightForearm.rotation.x = -0.4;

      // Torso bob & slight tilt
      pelvis.position.y = 0.72 + Math.abs(Math.sin(time * walkSpeed)) * 0.04;
      torso.rotation.y = Math.sin(time * walkSpeed) * 0.12;
      head.rotation.x = 0.05;
      head.rotation.y = -Math.sin(time * walkSpeed) * 0.08;
    } else if (animName === 'cast') {
      // Power surge casting animation
      const castFloat = Math.sin(time * 6.0) * 0.06;
      pelvis.position.y = 0.76 + castFloat;

      leftUpperArm.rotation.x = -Math.PI * 0.75;
      leftUpperArm.rotation.z = 0.6;
      leftForearm.rotation.x = -0.5;

      rightUpperArm.rotation.x = -Math.PI * 0.75;
      rightUpperArm.rotation.z = -0.6;
      rightForearm.rotation.x = -0.5;

      torso.rotation.x = -0.15;
      head.rotation.x = -0.25;
    } else {
      // Idle Combat Ready Stance (Fists up, breathing bob)
      const breath = Math.sin(time * 3.2);
      pelvis.position.y = 0.72 + breath * 0.015;
      torso.rotation.x = 0.05 + breath * 0.02;

      // Guarded combat arms stance (fists in front of chest)
      leftUpperArm.rotation.x = -0.65 + breath * 0.04;
      leftUpperArm.rotation.y = -0.3;
      leftUpperArm.rotation.z = 0.35;
      leftForearm.rotation.x = -1.1 + breath * 0.05;

      rightUpperArm.rotation.x = -0.75 + breath * 0.04;
      rightUpperArm.rotation.y = 0.3;
      rightUpperArm.rotation.z = -0.35;
      rightForearm.rotation.x = -1.2 + breath * 0.05;

      // Relaxed ready legs
      leftThigh.rotation.x = -0.15;
      leftThigh.rotation.z = 0.08;
      leftCalf.rotation.x = 0.2;

      rightThigh.rotation.x = 0.15;
      rightThigh.rotation.z = -0.08;
      rightCalf.rotation.x = 0.15;

      head.rotation.x = -0.03 + breath * 0.02;
      head.rotation.y = 0;
    }
  };

  return {
    root,
    parts: {
      head,
      torso,
      pelvis,
      leftShoulder,
      leftUpperArm,
      leftForearm,
      leftHand,
      rightShoulder,
      rightUpperArm,
      rightForearm,
      rightHand,
      leftThigh,
      leftCalf,
      leftFoot,
      rightThigh,
      rightCalf,
      rightFoot,
    },
    materials: {
      skin: skinMat,
      accent: accentMat,
      dark: darkMat,
      glow: glowMat,
    },
    update,
  };
}
