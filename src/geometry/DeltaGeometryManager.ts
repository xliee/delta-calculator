/*
 * Copyright (c) 2025 Xliee
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { COLORS, GEOMETRY, DEFAULT_DELTA_CONFIG } from '../constants.ts';
import type { DeltaRobotConfig, SceneObjects } from '../types.ts';

/**
 * Manages the 3D geometry and visual representation of delta robot components
 */
export class DeltaGeometryManager {
  private scene: THREE.Scene;
  private config: DeltaRobotConfig;
  private showBallJoints: boolean = true;
  private effectorLoadedCallback?: () => void;

  // 3D objects storage
  private objects: SceneObjects = {
    arms: [],
    rods: [],
    platforms: [],
    carriages: [],
    effector: null,
    build_plate: undefined, // Managed by deltacalc.ts
    physical_bed: undefined, // Managed by deltacalc.ts
    ball_joints: [], // Add ball joints array
  };

  // Calculated positions
  private towerPositions: THREE.Vector3[] = [];
  private rodPositions: THREE.Vector3[] = [];
  private effectorNubs: THREE.Vector3[] = [];
  private effectorNubCenters: THREE.Vector3[] = [];

  constructor(scene: THREE.Scene, config: DeltaRobotConfig) {
    this.scene = scene;
    this.config = config;
  }

  // Method to sync with deltacalc.ts calculated positions
  public syncWithDeltaCalc(deltacalc: any): void {
    // Copy the calculated positions from deltacalc.ts
    this.towerPositions = deltacalc.towerpos ? [...deltacalc.towerpos] : [];
    this.rodPositions = deltacalc.rodpos ? [...deltacalc.rodpos] : [];
    this.effectorNubs = deltacalc.effector_nub ? [...deltacalc.effector_nub] : [];
    this.effectorNubCenters = deltacalc.effector_nub_ctr ? [...deltacalc.effector_nub_ctr] : [];

    // Update configuration to match deltacalc
    this.config = {
      ...this.config,
      bot_radius: deltacalc.bot_radius,
      bot_height: deltacalc.bot_height,
      rod_radius: deltacalc.rod_radius,
      rod_spacing: deltacalc.rod_spacing,
      arm_length: deltacalc.arm_length,
      arm_radius: deltacalc.arm_radius,
      effector_radius: deltacalc.effector_radius,
      carriage_height: deltacalc.carriage_height,
      carriage_offset: deltacalc.carriage_offset,
      eff_spacing: deltacalc.eff_spacing,
    };
  }

  // Calculate all geometric positions using deltacalc.ts compatible logic
  public calculatePositions(): void {
    this.calculateTowerPositions();
    this.calculateRodPositions();
    this.calculateEffectorNubs();
  }

  // Calculate tower positions (compatible with deltacalc.ts towerPosition method)
  private calculateTowerPositions(): void {
    this.towerPositions = [];
    for (let i = 0; i < GEOMETRY.TOWER_COUNT; i++) {
      // Use deltacalc.ts compatible calculation: center positions only
      const pos = this.towerPosition(i * 2, this.config.bot_radius, true);
      this.towerPositions.push(pos);
    }
  }

  // Calculate rod positions (compatible with deltacalc.ts rodPosition method)
  private calculateRodPositions(): void {
    this.rodPositions = [];
    for (let i = 0; i < GEOMETRY.TOTAL_ARMS; i++) {
      // Use deltacalc.ts compatible calculation
      const pos = this.rodPosition(i, false);
      this.rodPositions.push(pos);
    }
  }

  // Calculate effector nub positions (compatible with deltacalc.ts)
  private calculateEffectorNubs(): void {
    this.effectorNubs = [];
    this.effectorNubCenters = [];

    // Calculate nub positions using deltacalc.ts logic
    for (let n = 0; n < GEOMETRY.TOTAL_ARMS; n++) {
      if (n % 2 === 0) {
        // Calculate center positions for each tower
        const centerPos = this.towerPosition(n, this.config.effector_radius, true);
        this.effectorNubCenters.push(centerPos);
      }
      // Calculate individual nub positions
      const nubPos = this.towerPosition(n, this.config.effector_radius, false, this.config.eff_spacing);
      this.effectorNubs.push(nubPos);
    }
  }

  // deltacalc.ts compatible towerPosition method
  private towerPosition(n: number, r: number, ctr: boolean = false, sp?: number): THREE.Vector3 {
    const pi2 = Math.PI * 2;
    const c = Math.floor(n / 2) * (pi2 / 3) + pi2 / 6; // angle to the tower
    const p = new THREE.Vector3(Math.sin(c) * r, 0, Math.cos(c) * r); // the point on the perimeter

    if (!ctr) {
      if (sp === undefined) sp = this.config.rod_spacing;
      const sign = n % 2 ? -1 : 1;
      const perp = c + pi2 / 4; // the perpendicular direction
      const as = (sign * sp) / 2; // half space between arms
      p.add(new THREE.Vector3(Math.sin(perp) * as, 0, Math.cos(perp) * as));
    }
    return p;
  }

  // deltacalc.ts compatible rodPosition method
  private rodPosition(n: number, ctr: boolean = false): THREE.Vector3 {
    return this.towerPosition(n, this.config.bot_radius, ctr);
  }

  // Initialize all delta robot components
  public initializeRobot(): void {
    this.disposeAll();
    this.calculatePositions();
    this.createVerticalRods();
    this.createPlatforms();
    this.createCarriages();
    this.createArms();
    this.createEffector();
    // Build plate creation handled by deltacalc.ts initBuildPlate() method
  }

  // Create vertical support rods
  private createVerticalRods(): void {
    // Clean up existing rods first
    this.objects.rods.forEach(rod => this.scene.remove(rod));
    this.objects.rods = [];

    const geometry = new THREE.CylinderGeometry(
      this.config.rod_radius,
      this.config.rod_radius,
      this.config.bot_height,
      20,
      20,
      false
    );
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff });

    // Use the exact same logic as original deltacalc.ts
    for (let n = 0; n < 6; n++) {
      const rod = new THREE.Mesh(geometry, material);

      // Use rodPositions from deltacalc.ts sync if available, otherwise calculate
      let p: THREE.Vector3;
      if (this.rodPositions[n]) {
        p = this.rodPositions[n];
      } else {
        p = this.rodPosition(n, false);
      }

      rod.position.set(p.x, p.y, p.z);
      rod.castShadow = true;
      rod.receiveShadow = true;

      this.objects.rods.push(rod);
      this.scene.add(rod);
    }
  }

  // Create top and bottom platforms
  private createPlatforms(): void {
    // Clean up existing platforms first
    this.objects.platforms.forEach(platform => this.scene.remove(platform));
    this.objects.platforms = [];

    const radius = this.config.bot_radius + 10;
    const geometry = new THREE.CylinderGeometry(
      radius,
      radius,
      10, // Use fixed platform height like original
      30,
      30,
      false
    );
    const material = new THREE.MeshLambertMaterial({ color: 0xff8844 });

    // Create exactly 2 platforms like original deltacalc.ts
    for (let n = 0; n < 2; n++) {
      const platform = new THREE.Mesh(geometry, material);
      const platSign = n % 2 ? 1 : -1;
      const bh2 = this.config.bot_height / 2;
      const y = platSign * (bh2 + 10 / 2); // Use fixed platform height

      platform.position.set(0, y, 0);
      platform.castShadow = true;
      platform.receiveShadow = true;

      this.objects.platforms.push(platform);
      this.scene.add(platform);
    }
  }

  // Create carriages that move along the vertical rods (compatible with deltacalc.ts)
  private createCarriages(): void {
    // Clean up existing carriages first
    this.objects.carriages.forEach(carriage => this.scene.remove(carriage));
    this.objects.carriages = [];

    const rodGeometry = new THREE.CylinderGeometry(
      this.config.rod_radius + 2,
      this.config.rod_radius + 2,
      this.config.carriage_height,
      30,
      30,
      false
    );

    const plateGeometry = new THREE.BoxGeometry(
      this.config.rod_spacing,
      this.config.carriage_height - 6,
      this.config.rod_radius
    );

    const material = new THREE.MeshLambertMaterial({ color: 0x66ff66 });

    // Create three carriage assemblies exactly like original deltacalc.ts
    for (let i = 0; i < 3; i++) {
      const carriageGroup = new THREE.Object3D();

      // Add two cylinders per carriage (one for each rod)
      for (let n = 0; n < 2; n++) {
        const rodIndex = i * 2 + n;

        // Use rod positions from deltacalc sync if available, otherwise calculate
        let p: THREE.Vector3;
        if (this.rodPositions[rodIndex]) {
          p = this.rodPositions[rodIndex];
        } else {
          p = this.rodPosition(rodIndex, false);
        }

        const cylinder = new THREE.Mesh(rodGeometry, material);
        cylinder.position.set(p.x, p.y, p.z);
        cylinder.castShadow = true;
        carriageGroup.add(cylinder);
      }

      // Add connecting plate between the cylinders (exact deltacalc.ts logic)
      const plate = new THREE.Mesh(plateGeometry, material);

      // Use center position - exact same calculation as original
      let cp: THREE.Vector3;
      if (this.towerPositions[i]) {
        cp = this.towerPositions[i];
      } else {
        cp = this.rodPosition(i * 2, true);
      }

      plate.position.set(cp.x, cp.y, cp.z);

      // Rotation using exact deltacalc.ts logic
      const pi2 = Math.PI * 2;
      plate.rotation.set(0, i * (pi2 / 3) + pi2 / 6, 0);
      plate.castShadow = true;
      carriageGroup.add(plate);

      this.objects.carriages.push(carriageGroup);
      this.scene.add(carriageGroup);
    }
  }

  // Create delta arms connecting carriages to effector
  private createArms(): void {
    // Clean up existing arms first
    this.objects.arms.forEach(arm => this.scene.remove(arm));
    this.objects.arms = [];
    this.objects.ball_joints.forEach(joint => this.scene.remove(joint));
    this.objects.ball_joints = [];

    const rodGeometry = new THREE.CylinderGeometry(
      this.config.arm_radius,
      this.config.arm_radius,
      this.config.diagonal_rod_length, // Use actual diagonal rod length
      12,
      12,
      false
    );
    const rodMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });

    // Create ball joint geometry (larger radius as requested)
    const ballGeometry = new THREE.SphereGeometry(4, 16, 16); // Increased from 2.5 to 4
    const ballMaterial = new THREE.MeshPhongMaterial({
      color: 0x3498db,
      shininess: 100,
      specular: 0x111111
    });

    // Create 6 delta arms with integrated ball joints
    for (let n = 0; n < 6; n++) {
      // Create arm group to hold rod + ball joints
      const armGroup = new THREE.Group();
      armGroup.matrixAutoUpdate = false;
      armGroup.castShadow = true;

      // Create the rod (will be scaled to actual distance during update)
      const rod = new THREE.Mesh(rodGeometry, rodMaterial);
      rod.castShadow = true;
      armGroup.add(rod);

      // Create ball joint at carriage end (will be positioned during update)
      const carriageBall = new THREE.Mesh(ballGeometry, ballMaterial);
      carriageBall.castShadow = true;
      carriageBall.receiveShadow = true;
      armGroup.add(carriageBall);

      // Create ball joint at effector end (will be positioned during update)
      const effectorBall = new THREE.Mesh(ballGeometry, ballMaterial);
      effectorBall.castShadow = true;
      effectorBall.receiveShadow = true;
      armGroup.add(effectorBall);

      // Store the ball joints for later reference if needed
      this.objects.ball_joints.push(carriageBall, effectorBall);

      this.objects.arms.push(armGroup);
      this.scene.add(armGroup);
    }

    // Note: arm positioning will be handled by updateArmPositions method
  }

  // Create effector (print head)
  private createEffector(): void {
    // Create default effector immediately to ensure it's available synchronously
    this.createDefaultEffector();

    // Then try loading STL to replace it
    const loader = new STLLoader();
    loader.load(
      "./stl/effector.stl",
      (geometry: THREE.BufferGeometry) => {
        this.createEffectorFromGeometry(geometry, true);
        // Notify deltacalc that the effector has been replaced
        if (this.effectorLoadedCallback) {
          this.effectorLoadedCallback();
        }
      },
      undefined,
      (error) => {
        console.warn('Could not load effector STL, keeping default geometry:', error);
      }
    );
  }

  // Set callback for when effector is loaded/replaced
  public setEffectorLoadedCallback(callback: () => void): void {
    this.effectorLoadedCallback = callback;
  }

  private createEffectorFromGeometry(geometry: THREE.BufferGeometry, shouldRotate: boolean = false): void {
    if (this.objects.effector) {
      this.scene.remove(this.objects.effector);
    }

    this.objects.effector = new THREE.Object3D();
    const group = this.objects.effector;

    const material = new THREE.MeshLambertMaterial({ color: COLORS.EFFECTOR });
    const mesh = new THREE.Mesh(geometry, material);

    if (shouldRotate) {
      mesh.rotation.set(Math.PI / 2, 0, 0);
    }
    mesh.castShadow = true;
    group.add(mesh);

    // Add visual marker for center
    const markerGeometry = new THREE.BoxGeometry(10, 10, 10);
    const marker = new THREE.Mesh(markerGeometry, material);
    group.add(marker);

    // Add LED spotlights
    this.addEffectorLights(group);

    // Position effector
    group.position.set(0, -this.config.bot_height / 4, 0);
    this.scene.add(group);

    // Set up animation
    Object.assign(group, { onAnimate: this.createEffectorAnimationFunction() });
  }

  private createDefaultEffector(): void {
    if (this.objects.effector) {
      this.scene.remove(this.objects.effector);
    }

    this.objects.effector = new THREE.Object3D();
    const group = this.objects.effector;

    // Create simple box effector
    const geometry = new THREE.BoxGeometry(
      this.config.effector_radius,
      DEFAULT_DELTA_CONFIG.EFFECTOR_HEIGHT,
      this.config.effector_radius
    );
    const material = new THREE.MeshLambertMaterial({ color: COLORS.EFFECTOR });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    group.add(mesh);

    this.addEffectorLights(group);

    group.position.set(0, -this.config.bot_height / 4, 0);
    this.scene.add(group);

    Object.assign(group, { onAnimate: this.createEffectorAnimationFunction() });
  }

  private addEffectorLights(effectorGroup: THREE.Object3D): void {
    const spotTarget = new THREE.Object3D();
    spotTarget.position.set(0, -100, 0);
    this.scene.add(spotTarget);

    const spotlights: THREE.SpotLight[] = [];

    for (let i = 0; i < GEOMETRY.TOWER_COUNT; i++) {
      const spotlight = new THREE.SpotLight(
        COLORS.SPOTLIGHT,
        0.6,
        300,
        Math.PI / 6,
        0.1,
        1
      );
      spotlight.castShadow = true;
      spotlight.shadow.mapSize.width = 1024;
      spotlight.shadow.mapSize.height = 1024;
      spotlight.target = spotTarget;

      // Position lights around the effector
      const angle = (i + 0.5) * GEOMETRY.TOWER_ANGLE_SPACING + GEOMETRY.TOWER_ANGLE_OFFSET;
      const lightRadius = this.config.effector_radius * 1.2;
      spotlight.position.set(
        Math.sin(angle) * lightRadius,
        -10,
        Math.cos(angle) * lightRadius
      );

      // Add visual bulb
      const bulbGeometry = new THREE.CylinderGeometry(1, 2, 4, 8);
      const bulbMaterial = new THREE.MeshStandardMaterial({
        emissive: COLORS.BULB_EMISSIVE,
        emissiveIntensity: 0.8,
        color: 0x000000,
      });
      const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
      spotlight.add(bulb);

      effectorGroup.add(spotlight);
      spotlights.push(spotlight);
    }

    // Store reference for later use
    Object.assign(effectorGroup, { spotlights });
  }

  private createEffectorAnimationFunction(): () => void {
    return () => {
      // This function will be replaced by deltacalc.ts effectorAnimate method
      // when the effector is retrieved via getEffector()
    };
  }

  // Update arm positions based on effector position
  public updateArmPositions(effectorPosition: THREE.Vector3, carriageYPositions: number[]): void {
    if (!this.objects.effector || !this.objects.arms || this.objects.arms.length !== 6) {
      return;
    }

    const br = this.config.bot_radius;
    const ep = effectorPosition;

    // Position each arm (rod with integrated ball joints)
    for (let n = 0; n < 6; n++) {
      const armGroup = this.objects.arms[n];
      if (!armGroup) continue;

      const carriageIndex = Math.floor(n / 2 + 0.1);
      const cy = carriageYPositions[carriageIndex] || 0;

      // Calculate tower end position
      const end_t = this.towerPosition(n, br, false);

      // Apply carriage offset to get actual ball joint position at carriage
      const carriageOffsetVector = this.calculateCarriageOffsetVector(carriageIndex);
      const carriageBallPos = end_t.clone().add(carriageOffsetVector);
      carriageBallPos.y = cy;

      // Calculate effector ball joint position
      let end_e: THREE.Vector3;
      if (this.effectorNubs[n]) {
        end_e = this.effectorNubs[n];
      } else {
        end_e = this.towerPosition(n, this.config.effector_radius, false, this.config.eff_spacing);
      }
      const effectorBallPos = new THREE.Vector3(
        end_e.x + ep.x,
        ep.y,
        end_e.z + ep.z
      );

      // Calculate the actual distance between ball joints
      const actualDistance = carriageBallPos.distanceTo(effectorBallPos);

      // Get the rod and ball joints from the arm group
      const rod = armGroup.children[0]; // First child is the rod
      const carriageBall = armGroup.children[1]; // Second child is carriage ball
      const effectorBall = armGroup.children[2]; // Third child is effector ball

      // Scale the rod to match the actual distance
      rod.scale.y = actualDistance / this.config.diagonal_rod_length;

      // Position ball joints at the actual endpoints (relative to group center)
      const halfDistance = actualDistance / 2;
      carriageBall.position.set(0, halfDistance, 0);
      effectorBall.position.set(0, -halfDistance, 0);

      // Position the arm group at the midpoint between ball joints
      const midpoint = new THREE.Vector3().addVectors(carriageBallPos, effectorBallPos).multiplyScalar(0.5);
      armGroup.position.copy(midpoint);

      // Orient arm toward carriage position (using original deltacalc logic)
      armGroup.lookAt(new THREE.Vector3(carriageBallPos.x, carriageBallPos.y, carriageBallPos.z));
      armGroup.updateMatrix(); // apply lookAt to the matrix
      armGroup.matrix.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    }
  }

  // Calculate carriage offset vector for ball joint position (matching deltacalc.ts)
  public calculateCarriageOffsetVector(carriageIndex: number): THREE.Vector3 {
    if (this.config.carriage_offset === 0) return new THREE.Vector3(0, 0, 0);

    // Get the tower position for this carriage to understand its orientation
    // Use the same calculation as towerPosition for the center points
    const n = carriageIndex * 2; // Convert carriage index to rod index

    // Get the tower position to verify direction
    const towerPos = this.towerPosition(n, this.config.bot_radius, true);

    // Calculate offset direction toward center (0,0,0)
    const distance = Math.sqrt(towerPos.x * towerPos.x + towerPos.z * towerPos.z);
    const offsetDirection = new THREE.Vector3(
      -towerPos.x / distance, // Normalized direction toward center
      0,
      -towerPos.z / distance
    );

    // Apply the offset magnitude
    return offsetDirection.multiplyScalar(this.config.carriage_offset);
  }

  // Toggle ball joint visibility
  public setShowBallJoints(show: boolean): void {
    this.showBallJoints = show;

    // Show/hide ball joints within each arm group
    this.objects.ball_joints.forEach(joint => {
      joint.visible = show;
    });
  }

  // Update carriage positions
  public updateCarriagePositions(positions: number[]): void {
    positions.forEach((y, index) => {
      if (this.objects.carriages[index]) {
        this.objects.carriages[index].position.y = y;
      }
    });
  }

  // Clean up all objects
  public disposeAll(): void {
    // Remove all objects from scene
    [...this.objects.arms, ...this.objects.rods, ...this.objects.platforms, ...this.objects.carriages, ...this.objects.ball_joints].forEach(obj => {
      this.scene.remove(obj);
    });

    if (this.objects.effector) {
      this.scene.remove(this.objects.effector);
    }
    // build_plate and physical_bed are managed by deltacalc.ts

    // Clear arrays
    this.objects.arms = [];
    this.objects.rods = [];
    this.objects.platforms = [];
    this.objects.carriages = [];
    this.objects.ball_joints = [];
    this.objects.effector = null;
    // build_plate and physical_bed are managed by deltacalc.ts
  }

  // Ball joint control methods
  public setBallJointsVisible(visible: boolean): void {
    this.showBallJoints = visible;
    this.objects.ball_joints.forEach(joint => {
      joint.visible = visible;
    });
  }

  public getBallJointsVisible(): boolean {
    return this.showBallJoints;
  }

  // Getters for external access
  public getTowerPositions(): THREE.Vector3[] { return this.towerPositions; }
  public getRodPositions(): THREE.Vector3[] { return this.rodPositions; }
  public getEffectorNubs(): THREE.Vector3[] { return this.effectorNubs; }
  public getEffectorNubCenters(): THREE.Vector3[] { return this.effectorNubCenters; }
  public getEffector(): THREE.Object3D | null { return this.objects.effector; }
  public getCarriages(): THREE.Object3D[] { return this.objects.carriages; }
  public getArms(): THREE.Object3D[] { return this.objects.arms; }

  // Initialize all geometry components
  public initializeAll(): void {
    // Clean up existing geometry first
    this.disposeAll();

    // Calculate positions if not synced from deltacalc
    if (this.towerPositions.length === 0 || this.rodPositions.length === 0) {
      this.calculatePositions();
    }

    // Create all geometry components using the same logic as deltacalc.ts
    this.createVerticalRods();
    this.createPlatforms();
    this.createCarriages();
    this.createArms();
    this.createEffector();
    // Build plate creation handled by deltacalc.ts initBuildPlate() method
  }
}
