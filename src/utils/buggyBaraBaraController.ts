import * as THREE from 'three';

export interface BuggyBaraBaraController {
  update: (
    delta: number,
    elapsedTime: number,
    animState: 'idle' | 'walk' | 'punch' | 'cast',
    isCasting: boolean,
    animationName?: string
  ) => void;
  dispose: () => void;
}

export function createBuggyBaraBaraController(
  model: THREE.Group,
  isEnemy: boolean = false
): BuggyBaraBaraController | null {
  // Find key meshes and facial variations
  const faces: { normal: THREE.Object3D[]; attack: THREE.Object3D[]; damage: THREE.Object3D[] } = {
    normal: [],
    attack: [],
    damage: [],
  };

  const handMeshes: { leftOpen: THREE.Object3D[]; leftClose: THREE.Object3D[]; rightOpen: THREE.Object3D[]; rightClose: THREE.Object3D[] } = {
    leftOpen: [],
    leftClose: [],
    rightOpen: [],
    rightClose: [],
  };

  // Find bones
  const bones: {
    rightHand?: THREE.Bone;
    rightForeArm?: THREE.Bone;
    leftHand?: THREE.Bone;
    leftForeArm?: THREE.Bone;
    head?: THREE.Bone;
    spine2?: THREE.Bone;
    spine1?: THREE.Bone;
    hips?: THREE.Bone;
  } = {};

  model.traverse((child) => {
    const name = child.name.toLowerCase();

    // Categorize facial expressions
    if (name.includes('face_normal') || name.includes('0001_face') || name.includes('0016_face')) {
      faces.normal.push(child);
    } else if (name.includes('face_attack') || name.includes('0002_face') || name.includes('0017_face')) {
      faces.attack.push(child);
    } else if (name.includes('face_damage') || name.includes('0003_face')) {
      faces.damage.push(child);
    }

    // Categorize hand variations
    if (name.includes('l_hand_open') || name.includes('0010_l_hand')) {
      handMeshes.leftOpen.push(child);
    } else if (name.includes('l_hand_close') || name.includes('0011_l_hand') || name.includes('0018_l_hand')) {
      handMeshes.leftClose.push(child);
    } else if (name.includes('r_hand_open') || name.includes('0012_r_hand')) {
      handMeshes.rightOpen.push(child);
    } else if (name.includes('r_hand_close') || name.includes('0013_r_hand') || name.includes('0019_r_hand')) {
      handMeshes.rightClose.push(child);
    }

    // Identify bones
    if ((child as THREE.Bone).isBone) {
      const bone = child as THREE.Bone;
      if (/righthand|right_hand|hand\.r|hand_r/i.test(name) && !/thumb|index|mid|ring|pinky|finger/i.test(name)) {
        bones.rightHand = bone;
      } else if (/rightforearm|right_forearm|forearm\.r|forearm_r/i.test(name)) {
        bones.rightForeArm = bone;
      } else if (/lefthand|left_hand|hand\.l|hand_l/i.test(name) && !/thumb|index|mid|ring|pinky|finger/i.test(name)) {
        bones.leftHand = bone;
      } else if (/leftforearm|left_forearm|forearm\.l|forearm_l/i.test(name)) {
        bones.leftForeArm = bone;
      } else if (/head/i.test(name) && !/headtop|end|top/i.test(name)) {
        bones.head = bone;
      } else if (/spine2|chest/i.test(name)) {
        bones.spine2 = bone;
      } else if (/spine1/i.test(name) || (/spine/i.test(name) && !bones.spine1 && !/spine2/i.test(name))) {
        bones.spine1 = bone;
      } else if (/hips|pelvis|root/i.test(name)) {
        bones.hips = bone;
      }
    }
  });

  // Setup initial facial expression (show normal face, hide attack/damage duplicates)
  const setExpression = (expr: 'normal' | 'attack' | 'damage') => {
    faces.normal.forEach((f) => (f.visible = expr === 'normal'));
    faces.attack.forEach((f) => (f.visible = expr === 'attack'));
    faces.damage.forEach((f) => (f.visible = expr === 'damage'));
  };

  // Hide untextured / placeholder cover meshes from Blender
  model.traverse((child) => {
    const name = child.name.toLowerCase();
    if (
      name.includes('body_cover') ||
      name.includes('upperbody_cover') ||
      name.includes('l_hand_open') ||
      name.includes('r_hand_open')
    ) {
      child.visible = false;
    }
  });

  // Ensure textured hands are visible
  handMeshes.leftClose.forEach((m) => (m.visible = true));
  handMeshes.rightClose.forEach((m) => (m.visible = true));
  setExpression('normal');

  // Create subtle Bara Bara joint separation energy rings
  const ringGroup = new THREE.Group();
  const ringGeo = new THREE.TorusGeometry(0.12, 0.02, 8, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: isEnemy ? 0xf43f5e : 0x06b6d4,
    transparent: true,
    opacity: 0,
  });

  const rightWristRing = new THREE.Mesh(ringGeo, ringMat);
  const leftWristRing = new THREE.Mesh(ringGeo, ringMat);
  const waistRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 8, 24), ringMat);
  const neckRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 24), ringMat);

  ringGroup.add(rightWristRing, leftWristRing, waistRing, neckRing);
  model.add(ringGroup);

  // Store rest transforms
  const restRightHandPos = bones.rightHand ? bones.rightHand.position.clone() : new THREE.Vector3();
  const restLeftHandPos = bones.leftHand ? bones.leftHand.position.clone() : new THREE.Vector3();
  const restHeadPos = bones.head ? bones.head.position.clone() : new THREE.Vector3();
  const restSpine2Pos = bones.spine2 ? bones.spine2.position.clone() : new THREE.Vector3();

  // Attack animation state
  let attackProgress = 0;
  let isAttacking = false;
  let currentAttackType: 'punch' | 'kick' | 'cast' = 'punch';

  return {
    update: (delta, elapsedTime, animState, isCasting, animationName) => {
      const isStrikeAnim =
        animState === 'punch' ||
        animationName?.includes('punch') ||
        animationName?.includes('attack') ||
        animationName?.includes('kick');

      if (isStrikeAnim && !isAttacking) {
        isAttacking = true;
        attackProgress = 0;
        currentAttackType = animState === 'cast' || isCasting ? 'cast' : 'punch';
      }

      if (isAttacking) {
        attackProgress += delta * 3.8; // ~0.26s strike cycle
        if (attackProgress > 1) {
          attackProgress = 0;
          if (!isStrikeAnim) {
            isAttacking = false;
          }
        }
      }

      // ==========================================
      // 1. CASTING STATE: BARA BARA FESTIVAL (Ultimate)
      // ==========================================
      if (isCasting || animState === 'cast') {
        setExpression('attack');
        ringMat.opacity = THREE.MathUtils.lerp(ringMat.opacity, 0.85, delta * 10);

        const festivalTime = elapsedTime * 6;
        const orbitRadius = 0.45;

        // Torso & Upper body levitation & swirl
        if (bones.spine2) {
          bones.spine2.position.y = restSpine2Pos.y + 0.25 + Math.sin(festivalTime * 1.5) * 0.08;
          bones.spine2.position.x = restSpine2Pos.x + Math.cos(festivalTime) * 0.12;
          bones.spine2.rotation.y += delta * 5;
        }

        // Head floats higher and wobbles comically
        if (bones.head) {
          bones.head.position.y = restHeadPos.y + 0.35 + Math.sin(festivalTime * 2 + 1) * 0.1;
          bones.head.position.z = restHeadPos.z + Math.cos(festivalTime * 1.8) * 0.08;
          bones.head.rotation.z = Math.sin(festivalTime * 3) * 0.2;
        }

        // Right Hand flying orbital knife flurry
        if (bones.rightHand) {
          bones.rightHand.position.x = restRightHandPos.x + Math.cos(festivalTime * 2) * orbitRadius;
          bones.rightHand.position.y = restRightHandPos.y + 0.2 + Math.sin(festivalTime * 2) * 0.2;
          bones.rightHand.position.z = restRightHandPos.z + Math.sin(festivalTime * 2) * orbitRadius * 1.2;
          bones.rightHand.rotation.z += delta * 15;
          bones.rightHand.rotation.y += delta * 12;
        }

        // Left Hand flying counter-orbital knife flurry
        if (bones.leftHand) {
          bones.leftHand.position.x = restLeftHandPos.x - Math.cos(festivalTime * 2 + Math.PI) * orbitRadius;
          bones.leftHand.position.y = restLeftHandPos.y + 0.15 + Math.sin(festivalTime * 2 + Math.PI) * 0.2;
          bones.leftHand.position.z = restLeftHandPos.z + Math.sin(festivalTime * 2 + Math.PI) * orbitRadius * 1.2;
          bones.leftHand.rotation.z -= delta * 15;
          bones.leftHand.rotation.y -= delta * 12;
        }

        // Position joint energy rings
        if (bones.rightForeArm) rightWristRing.position.copy(bones.rightForeArm.position);
        if (bones.leftForeArm) leftWristRing.position.copy(bones.leftForeArm.position);
        if (bones.spine1) waistRing.position.set(0, bones.spine1.position.y + 0.1, 0);
        if (bones.head) neckRing.position.set(0, bones.head.position.y, 0);

        return;
      }

      // ==========================================
      // 2. BASIC ATTACK: BARA BARA FLOATING HANDS (Range 2)
      // Only the hands detach from the wrists, float forward across 2 tiles distance, slash & return!
      // ==========================================
      if (isAttacking && !isCasting) {
        setExpression('attack');
        
        // Wrist separation energy rings glow dynamically
        ringMat.opacity = THREE.MathUtils.lerp(ringMat.opacity, 0.9, delta * 15);
        if (bones.rightForeArm) rightWristRing.position.copy(bones.rightForeArm.position);
        if (bones.leftForeArm) leftWristRing.position.copy(bones.leftForeArm.position);
        waistRing.visible = false;
        neckRing.visible = false;

        // Smooth launch and return curve (0 -> 1 -> 0)
        const throwCurve = Math.sin(attackProgress * Math.PI);
        // Range 2 reach distance: ~2.1 meters forward in combat space
        const flightReach = 2.1 * throwCurve;

        const isDoubleHands = animationName?.includes('kick') || animationName === 'kick3';
        const isLeftHandAttack = animationName === 'punch2' || animationName === 'punch4';

        if (isDoubleHands) {
          // Double Flying Hands Pincer Slash (Combo Finisher)
          if (bones.rightHand) {
            bones.rightHand.position.z = restRightHandPos.z + flightReach * 1.05;
            bones.rightHand.position.x = restRightHandPos.x + Math.sin(throwCurve * Math.PI) * 0.2;
            bones.rightHand.position.y = restRightHandPos.y + Math.sin(attackProgress * Math.PI * 2) * 0.12;
            bones.rightHand.rotation.z += delta * 32 * throwCurve;
            bones.rightHand.rotation.y += delta * 18 * throwCurve;
          }
          if (bones.leftHand) {
            bones.leftHand.position.z = restLeftHandPos.z + flightReach * 1.05;
            bones.leftHand.position.x = restLeftHandPos.x - Math.sin(throwCurve * Math.PI) * 0.2;
            bones.leftHand.position.y = restLeftHandPos.y + Math.sin(attackProgress * Math.PI * 2) * 0.12;
            bones.leftHand.rotation.z -= delta * 32 * throwCurve;
            bones.leftHand.rotation.y -= delta * 18 * throwCurve;
          }
        } else if (isLeftHandAttack) {
          // Left Hand Flying Knife Attack
          if (bones.leftHand) {
            bones.leftHand.position.z = restLeftHandPos.z + flightReach * 1.05;
            bones.leftHand.position.y = restLeftHandPos.y + Math.sin(attackProgress * Math.PI * 2) * 0.15;
            bones.leftHand.rotation.z -= delta * 30 * throwCurve;
            bones.leftHand.rotation.y -= delta * 15 * throwCurve;
          }
          if (bones.rightHand) {
            bones.rightHand.position.lerp(restRightHandPos, delta * 12);
          }
        } else {
          // Right Hand Flying Knife Attack
          if (bones.rightHand) {
            bones.rightHand.position.z = restRightHandPos.z + flightReach * 1.05;
            bones.rightHand.position.y = restRightHandPos.y + Math.sin(attackProgress * Math.PI * 2) * 0.15;
            bones.rightHand.rotation.z += delta * 30 * throwCurve;
            bones.rightHand.rotation.y += delta * 15 * throwCurve;
          }
          if (bones.leftHand) {
            bones.leftHand.position.lerp(restLeftHandPos, delta * 12);
          }
        }

        // Body, head and torso stay rooted firmly in position (no detachment for basic attacks)
        if (bones.head) bones.head.position.lerp(restHeadPos, delta * 12);
        if (bones.spine2) bones.spine2.position.lerp(restSpine2Pos, delta * 12);

        return;
      }

      // ==========================================
      // 3. IDLE / WALK: SMOOTH RE-ATTACHMENT
      // ==========================================
      setExpression('normal');
      ringMat.opacity = THREE.MathUtils.lerp(ringMat.opacity, 0, delta * 8);

      // In regular idle / walking, allow animation mixer to control bones naturally
    },

    dispose: () => {
      ringGeo.dispose();
      ringMat.dispose();
      model.remove(ringGroup);
    },
  };
}
