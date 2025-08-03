import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { KeyboardState } from "./utils/KeyboardState.ts";
import { UIManager } from "./ui/UIManager.ts";
import { DeltaCalculations } from "./calculations/DeltaCalculations.ts";
import { DeltaGeometryManager } from "./geometry/DeltaGeometryManager.ts";
import { RenderingManager } from "./rendering/RenderingManager.ts";
import { GeometryUtils } from "./utils/index.ts";
import { EFFECTOR_CONFIGURATIONS } from "./constants.js";
import type {
  DeltaRobotConfig,
  BuildVolumeConfig,
  ConstraintType,
  BuildVolumeStats,
  EffectorType,
} from "./types.ts";

// Type definitions
interface DivSize {
  w: number;
  h: number;
}

// Extend String
(String.prototype as any).lpad = function (len: number, chr?: string): string {
  if (chr === undefined) chr = "&nbsp;";
  const s = this + "";
  const need = len - s.length;
  if (need > 0) return new Array(need + 1).join(chr) + s;
  return s;
};

(String.prototype as any).zeroPad = function (n: number, len: number): string {
  return (this as any).lpad(len, "0");
};

// Extend Object3D
const p = THREE.Object3D.prototype as any;
p.rx = p.ry = p.rz = 0;
p.vx = p.vy = p.vz = 0;

p.rotate = function (xr: number, yr: number, zr: number): void {
  this.rotation.x += xr;
  this.rotation.y += yr;
  this.rotation.z += zr;
};

p.move = function (xd: number, yd: number, zd: number): void {
  this.position.x += xd;
  this.position.y += yd;
  this.position.z += zd;
};

p.stop = function (): void {
  this.rx = this.ry = this.rz = 0;
  this.vx = this.vy = this.vz = 0;
};

p.onAnimate = function (): void {
  this.rotate(this.rx, this.ry, this.rz);
  this.move(this.vx, this.vy, this.vz);
};

// DeltaBot Calculator Application Class
export class DeltabotApp {
  // Configuration properties
  public rod_radius: number = 4;
  public bot_radius: number = 240;
  public bot_height: number = 700;
  public rod_spacing: number = 30;
  public eff_spacing: number = 30;
  public arm_length: number = 240;
  public arm_radius: number = 5 / 2;
  public effector_radius: number = 40;
  public carriage_inset: number = 25;
  public carriage_height: number = 30;
  public carriage_offset: number = 0; // Ball joint offset from carriage plane (mm)

  // State properties
  public effector_hash: string | number = 0;
  public effector_height: number = 10;
  public effector_endstop_z: number = 0;
  public effector_zero_z: number = 0;
  public effector_nub: THREE.Vector3[] = [];
  public effector_nub_ctr: THREE.Vector3[] = [];
  public platform_height: number = 10;
  public arm_height_at_0_0: number = 0;
  public arm_pos: number[][][] = [
    [
      [0, 0],
      [0, 0],
    ],
    [
      [0, 0],
      [0, 0],
    ],
    [
      [0, 0],
      [0, 0],
    ],
    [
      [0, 0],
      [0, 0],
    ],
    [
      [0, 0],
      [0, 0],
    ],
    [
      [0, 0],
      [0, 0],
    ],
  ];

  // 3D objects
  public arm: THREE.Mesh[] = [];
  public vrod: THREE.Mesh[] = [];
  public towerpos: THREE.Vector3[] = [];
  public rodpos: THREE.Vector3[] = [];
  public platform: THREE.Mesh[] = [];
  public carriage: THREE.Object3D[] = [];
  public carriageY: number[] = [0, 0, 0];
  public effector: THREE.Object3D | null = null;

  // Input state
  public pressed: { [key: string]: boolean } = {
    w: false,
    a: false,
    s: false,
    d: false,
  };
  public homeState: number = 0;

  // Constants
  public DELTA_DIAGONAL_ROD: number = 240; // mm
  public DELTA_SMOOTH_ROD_OFFSET: number = 195; // mm
  public DELTA_EFFECTOR_OFFSET: number = 40; // mm
  public DELTA_CARRIAGE_OFFSET: number = 25; // mm

  // Internal properties
  public arm_length_sq?: number;
  public bh2?: number;
  public DELTA_RADIUS?: number;
  public statsTimer?: number;
  public homeTimer?: number;

  // Advanced calculation properties
  public DELTA_TOWER_RADIUS: number = 0;
  public DELTA_PRINTABLE_RADIUS: number = 0;
  public DELTA_PRINT_BED_RADIUS: number = 0;
  public build_volume_height: number = 0;
  public max_print_radius: number = 0;
  public recommended_print_radius: number = 0;

  // Build plate properties
  public physical_bed_radius: number = 120; // Physical bed radius (120mm for Anycubic Kossel Linear Plus) - user configurable
  public show_physical_bed: boolean = true; // Whether to show the physical bed
  public constraint_type: string = "effector-edge"; // 'effector-edge', 'effector-tip', 'horizontal-extrusions'
  public build_plate?: THREE.Mesh; // Visual representation of calculated printable area (gray)
  public physical_bed?: THREE.Mesh; // Visual representation of physical bed (green) - user configurable

  // Effector configurations - using shared constants
  public effector_configs = EFFECTOR_CONFIGURATIONS;
  public current_effector_type: string = "standard";

  public tower_offset: number = 25; // Tower center offset from calculated position
  public diagonal_rod_length: number = 240; // Diagonal rod length (center to center)

  // Private variables
  private renderer!: THREE.WebGLRenderer;
  private camera!: THREE.PerspectiveCamera;
  private controlsOrbit?: OrbitControls;
  private scene!: THREE.Scene;
  private keyboard!: KeyboardState;
  private cube!: any;
  private divSize: DivSize = { w: 640, h: 480 };
  private divAspect: number = 4 / 3;
  private readonly keyboardOn: boolean = true;
  private readonly pi2: number = Math.PI * 2;

  // New modular managers
  private uiManager!: UIManager;
  private deltaCalculations!: DeltaCalculations;
  private geometryManager!: DeltaGeometryManager;
  private renderingManager!: RenderingManager;

  constructor() {
    // Constructor is empty, initialization happens in init()
  }

  // Method to apply effector configuration
  applyEffectorConfig(type: EffectorType) {
    this.current_effector_type = type;
    const config = EFFECTOR_CONFIGURATIONS[type];
    if (config) {
      this.effector_radius = config.radius;
      this.eff_spacing = config.spacing;
      // TODO: Load different STL if needed
      this.rebuildScene();
    }
  }

  // Method to get current effector configuration
  getCurrentEffectorConfig() {
    return (
      EFFECTOR_CONFIGURATIONS[this.current_effector_type as EffectorType] ||
      EFFECTOR_CONFIGURATIONS["standard"]
    );
  }

  public init(): void {
    this.keyboard = new KeyboardState();

    // Initialize new managers first (without scene-dependent components)
    this.initializeNewManagers();

    // Initialize rendering using RenderingManager
    const renderingComponents = this.renderingManager.init(this.bot_radius, this.bot_height);
    this.renderer = renderingComponents.renderer;
    this.camera = renderingComponents.camera;
    this.scene = renderingComponents.scene;
    this.controlsOrbit = renderingComponents.controls;

    // Now initialize geometry manager with the scene
    const deltaConfig = this.getCurrentDeltaConfig();
    this.geometryManager = new DeltaGeometryManager(this.scene, deltaConfig);

    this.cube = this.addCubeToScene(this.scene);

    this.initBotGeometry();
    this.initDeltabot();
    this.setupKeyboardHandling();
    window.addEventListener("resize", this.handleResize.bind(this), false);

    // Start stats updates after everything is initialized
    this.startStatsUpdates();

    this.renderLoop();
  }

  // Initialize the new modular managers
  private initializeNewManagers(): void {
    // Initialize UIManager
    this.uiManager = new UIManager();
    this.uiManager.setConfigurationChangeCallback(
      (config: DeltaRobotConfig, buildVolumeConfig: BuildVolumeConfig) => {
        this.updateFromConfiguration(config, buildVolumeConfig);
      }
    );

    // Initialize calculations
    const deltaConfig = this.getCurrentDeltaConfig();
    const buildConfig = this.getCurrentBuildConfig();
    this.deltaCalculations = new DeltaCalculations(deltaConfig, buildConfig);

    // Initialize geometry manager (scene will be available after rendering init)
    // Note: scene will be set later, geometry manager will be updated in initDeltabot()

    // Initialize rendering manager
    this.renderingManager = new RenderingManager();

  }

  // Get current delta configuration from old properties
  private getCurrentDeltaConfig(): DeltaRobotConfig {
    return {
      rod_radius: this.rod_radius,
      bot_radius: this.bot_radius,
      bot_height: this.bot_height,
      rod_spacing: this.rod_spacing,
      eff_spacing: this.eff_spacing,
      arm_length: this.arm_length,
      arm_radius: this.arm_radius,
      effector_radius: this.effector_radius,
      carriage_inset: this.carriage_inset,
      carriage_height: this.carriage_height,
      carriage_offset: this.carriage_offset,
      diagonal_rod_length: this.diagonal_rod_length,
      tower_offset: this.tower_offset,
    };
  }

  // Get current build configuration
  private getCurrentBuildConfig(): BuildVolumeConfig {
    return {
      physical_bed_radius: this.physical_bed_radius,
      show_physical_bed: this.show_physical_bed,
      constraint_type: this.constraint_type as ConstraintType,
      max_print_radius: this.max_print_radius,
      recommended_print_radius: this.recommended_print_radius,
      build_volume_height: this.build_volume_height,
    };
  }

  // Update configuration from UI
  private updateFromConfiguration(
    config: DeltaRobotConfig,
    buildVolumeConfig: BuildVolumeConfig
  ): void {
    // Update old properties
    this.rod_radius = config.rod_radius;
    this.bot_radius = config.bot_radius;
    this.bot_height = config.bot_height;
    this.rod_spacing = config.rod_spacing;
    this.eff_spacing = config.eff_spacing;
    this.arm_length = config.arm_length;
    this.arm_radius = config.arm_radius;
    this.effector_radius = config.effector_radius;
    this.carriage_inset = config.carriage_inset;
    this.carriage_height = config.carriage_height;
    this.carriage_offset = config.carriage_offset;
    this.diagonal_rod_length = config.diagonal_rod_length;
    this.tower_offset = config.tower_offset;

    // Update build volume properties
    this.constraint_type = buildVolumeConfig.constraint_type;
    this.physical_bed_radius = buildVolumeConfig.physical_bed_radius;
    this.show_physical_bed = buildVolumeConfig.show_physical_bed;

    // Update calculations
    this.deltaCalculations.updateConfig(config);

    // Recalculate and update geometry
    this.initBotGeometry();
    this.initDeltabot();
  }

  // Start regular stats updates
  private startStatsUpdates(): void {
    const updateStats = () => {
      if (this.uiManager) {
        const statsManager = this.uiManager.getStatsManager();
        const config = this.getCurrentDeltaConfig();
        const buildConfig = this.uiManager.getCurrentBuildVolumeConfig();

        // Update stats with current data
        statsManager.updateEffectorPosition(
          this.effector?.position || new THREE.Vector3(),
          this.effector_zero_z
        );
        statsManager.updateCameraPosition(this.camera, this.controlsOrbit);

        // Calculate carriage positions using DeltaCalculations
        const carriagePositions =
          this.deltaCalculations.calculateCarriagePositions(
            this.effector?.position || new THREE.Vector3()
          );
        statsManager.updateCarriagePositions(
          carriagePositions,
          this.effector_zero_z
        );

        // Update Marlin config
        statsManager.updateMarlinConfig(config);

        // Update render stats
        statsManager.updateRenderStats(this.renderer);

        // Update constraint analysis
        const constraintCalculator =
          this.deltaCalculations.getConstraintCalculator();
        const realRadius = constraintCalculator.calculateRealBuildPlateRadius();
        const clearance = constraintCalculator.getConstraintClearance();
        const constraintDescription =
          constraintCalculator.getActiveConstraintDescription();

        // Update carriage constraint analysis
        const carriageAnalysis =
          constraintCalculator.getCarriageConstraintAnalysis();
        statsManager.updateCarriageConstraints({
          travelRange: carriageAnalysis.carriageLimits.travelRange,
          limitingFactor: carriageAnalysis.limitingFactor,
          maxRadius: carriageAnalysis.maxRadius,
        });

        this.uiManager.updateConstraintAnalysis({
          realRadius,
          clearance,
          constraintDescription,
        });
      }

      requestAnimationFrame(updateStats);
    };

    updateStats();
  }

  public renderLoop(): void {
    // request that this be called again
    requestAnimationFrame(this.renderLoop.bind(this));

    // Call onAnimate for everything in the scene
    this.scene.children.map((o: any) => {
      if (o.onAnimate) o.onAnimate();
    });

    // Each renderer has a browser canvas, so only one renderer per canvas
    this.controlsOrbit!.update();
    this.update();
    this.render();
  }

  // Tell the GL Renderer to show the scene for the given camera
  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public handleResize(): void {
    this.renderingManager.handleResize(this.bot_radius, this.bot_height);
  }

  public reorientCamera(): void {
    this.renderingManager.positionCamera(this.bot_radius, this.bot_height);
    if (this.cube !== undefined && this.cube != null)
      this.cube.position.set(0, -this.bh2! + 60, 0);
  }

  public rebuildScene(): void {
    // Store current effector position to restore after rebuild
    let savedEffectorPosition: THREE.Vector3 | null = null;
    if (this.effector) {
      savedEffectorPosition = this.effector.position.clone();
    }

    // Rebuild geometry and scene
    this.initBotGeometry();
    this.initDeltabot();

    // Restore effector position if it was saved and is within valid bounds
    if (savedEffectorPosition && this.effector) {
      const constrainedPosition = this.deltaCalculations.constrainPosition(
        savedEffectorPosition
      );

      // Only restore position if it wasn't changed by constraints (meaning it was already valid)
      const wasValid =
        Math.abs(constrainedPosition.x - savedEffectorPosition.x) < 0.001 &&
        Math.abs(constrainedPosition.y - savedEffectorPosition.y) < 0.001 &&
        Math.abs(constrainedPosition.z - savedEffectorPosition.z) < 0.001;

      if (wasValid) {
        this.effector.position.copy(savedEffectorPosition);
        this.updateCarriagesFromEffector();
      }
    }
  }

  public towerPosition(
    n: number,
    r: number,
    ctr?: THREE.Vector3,
    sp?: number
  ): THREE.Vector3 {
    // Delegate to GeometryUtils for consistent calculations
    if (ctr === undefined || !ctr) {
      const spacing = sp !== undefined ? sp : this.rod_spacing;
      const armPos = GeometryUtils.calculateArmPosition(n, r, spacing, false);
      return new THREE.Vector3(armPos.x, armPos.y, armPos.z);
    } else {
      const towerPos = GeometryUtils.calculateTowerPosition(Math.floor(n / 2), r);
      return new THREE.Vector3(towerPos.x, towerPos.y, towerPos.z);
    }
  }

  public rodPosition(n: number, ctr?: THREE.Vector3): THREE.Vector3 {
    return this.towerPosition(n, this.bot_radius, ctr);
  }

  public updateCarriagesFromEffector(): void {
    if (!this.effector) return;

    // Use DeltaCalculations for proper inverse kinematics
    const effectorPosition = {
      x: this.effector.position.x,
      y: this.effector.position.y,
      z: this.effector.position.z,
    };

    // Calculate carriage positions using DeltaCalculations
    const carriagePositions = this.deltaCalculations.calculateCarriagePositions(effectorPosition);
    
    // Store carriage Y positions
    this.carriageY = carriagePositions;

    // Update geometry manager with new carriage and arm positions
    if (this.geometryManager) {
      this.geometryManager.updateCarriagePositions(carriagePositions);
      this.geometryManager.updateArmPositions(
        this.effector.position,
        carriagePositions
      );
    }
  }

  // Original geometry methods removed - now handled by DeltaGeometryManager

  public initBotGeometry(): void {
    // Update DeltaCalculations with current configuration
    const config = this.getCurrentDeltaConfig();
    this.deltaCalculations.updateConfig(config);

    // Calculate optimal arm length using DeltaCalculations
    const optimalArmLength = this.deltaCalculations.calculateOptimalArmLength();
    this.arm_length = optimalArmLength;
    this.arm_length_sq = optimalArmLength * optimalArmLength;
    this.bh2 = this.bot_height / 2;

    // Calculate effector positioning using DeltaCalculations logic
    this.effector_endstop_z = this.bh2 - this.arm_length - this.carriage_height / 2;
    this.effector_zero_z = -this.bh2 + this.effector_height / 2;

    // Calculate positions using GeometryUtils for consistency
    var er = this.effector_radius,
      sp = this.eff_spacing;
    for (var n = 0; n < 6; n++) {
      if (n % 2 == 0) {
        // Use GeometryUtils for tower positions
        const towerPos = GeometryUtils.calculateTowerPosition(n / 2, this.bot_radius);
        this.towerpos[n / 2] = new THREE.Vector3(towerPos.x, towerPos.y, towerPos.z);
        
        const effectorNubPos = GeometryUtils.calculateArmPosition(n, er, 0, true);
        this.effector_nub_ctr[n / 2] = new THREE.Vector3(effectorNubPos.x, effectorNubPos.y, effectorNubPos.z);
      }
      
      // Calculate rod positions using GeometryUtils
      const rodPos = GeometryUtils.calculateTowerPosition(Math.floor(n / 2), this.bot_radius);
      this.rodpos[n] = new THREE.Vector3(rodPos.x, rodPos.y, rodPos.z);
      
      const effectorNub = GeometryUtils.calculateArmPosition(n, er, sp, false);
      this.effector_nub[n] = new THREE.Vector3(effectorNub.x, effectorNub.y, effectorNub.z);
    }

    // Recalculate dependent parameters using DeltaCalculations
    this.DELTA_RADIUS =
      this.DELTA_SMOOTH_ROD_OFFSET -
      this.DELTA_EFFECTOR_OFFSET -
      this.DELTA_CARRIAGE_OFFSET;

    // Update configuration values to match current settings
    this.DELTA_EFFECTOR_OFFSET = this.effector_radius;
    this.DELTA_CARRIAGE_OFFSET = this.carriage_inset;
    this.DELTA_DIAGONAL_ROD = this.arm_length;

    // Calculate smooth rod offset based on geometry
    this.DELTA_SMOOTH_ROD_OFFSET =
      this.DELTA_CARRIAGE_OFFSET +
      (this.bot_radius - this.DELTA_CARRIAGE_OFFSET - this.DELTA_EFFECTOR_OFFSET) / 2;

    // Calculate advanced build volume and frame statistics using DeltaCalculations
    this.calculateBuildVolume();
  }

  public initDeltabot(): void {
    let br = this.bot_radius;
    let rr = this.rod_radius;


    // Only keep essential non-visual initialization
    this.initBuildPlate();
    this.reorientCamera();

    // Initialize geometry manager with synced data
    this.geometryManager.syncWithDeltaCalc(this);
    this.geometryManager.initializeAll();

    // Set up callback for when STL effector is loaded
    this.geometryManager.setEffectorLoadedCallback(() => {
      this.effector = this.geometryManager.getEffector();
      this.setupEffectorProperties();
    });

    // Use geometry manager's effector (this will be the default one initially)
    this.effector = this.geometryManager.getEffector();
    this.setupEffectorProperties();
  }

  private setupEffectorProperties(): void {
    if (!this.effector) return;

    // Set initial position
    this.effector.position.set(0, -this.bot_height / 4, 0);

    // Add velocity properties needed for animation
    (this.effector as any).vx = 0;
    (this.effector as any).vy = 0;
    (this.effector as any).vz = 0;

    // Set up animation function to use deltacalc.ts logic
    (this.effector as any).onAnimate = this.effectorAnimate.bind(this);

    // Add stop function
    (this.effector as any).stop = () => {
      (this.effector as any).vx = 0;
      (this.effector as any).vy = 0;
      (this.effector as any).vz = 0;
    };

    // Initial update to position all components correctly
    this.updateCarriagesFromEffector();
  }

  public initBuildPlate(): void {
    // Remove existing build plates
    if (this.build_plate) {
      this.scene.remove(this.build_plate);
    }
    if (this.physical_bed) {
      this.scene.remove(this.physical_bed);
    }

    const baseY = -this.bh2! + this.platform_height + 1;

    // Create calculated printable area (gray) - this is automatically calculated
    // Get the actual constraint radius from DeltaCalculations
    const constraintCalculator =
      this.deltaCalculations.getConstraintCalculator();
    constraintCalculator.updateConfig(this.getCurrentDeltaConfig());
    constraintCalculator.setConstraintType(
      this.constraint_type as ConstraintType
    );
    const printableRadius =
      constraintCalculator.calculateRealBuildPlateRadius();

    const printableGeometry = new THREE.CylinderGeometry(
      printableRadius,
      printableRadius,
      0.5, // thin
      32,
      1,
      false
    );

    const printableMaterial = new THREE.MeshLambertMaterial({
      color: 0x888888, // Gray for calculated printable area
      transparent: true,
      opacity: 0.6,
    });

    this.build_plate = new THREE.Mesh(printableGeometry, printableMaterial);
    this.build_plate.position.set(0, baseY + 1, 0);
    this.scene.add(this.build_plate);

    // Create physical bed (green) - user configurable, can be hidden
    if (this.show_physical_bed) {
      const physicalBedGeometry = new THREE.CylinderGeometry(
        this.physical_bed_radius,
        this.physical_bed_radius,
        1, // slightly thicker than printable area
        32,
        1,
        false
      );

      const physicalBedMaterial = new THREE.MeshLambertMaterial({
        color: 0x44cc44, // Green for physical bed
        transparent: true,
        opacity: 0.7,
      });

      this.physical_bed = new THREE.Mesh(
        physicalBedGeometry,
        physicalBedMaterial
      );
      this.physical_bed.position.set(0, baseY, 0); // Below the calculated area
      this.scene.add(this.physical_bed);
    }

    // Update UI display
    this.updateBedInfo();
  }

  public updateBedInfo(): void {
    const physicalBedEl = document.getElementById("physical-bed-radius");
    const printableRadiusEl = document.getElementById(
      "calculated-printable-radius"
    );
    const clearanceEl = document.getElementById("constraint-clearance");

    if (physicalBedEl) {
      physicalBedEl.textContent = `${this.physical_bed_radius}mm`;
    }

    if (printableRadiusEl) {
      printableRadiusEl.textContent = `${Math.floor(this.max_print_radius)}mm`;
    }

    if (clearanceEl) {
      // Show clearance from the active constraint, not physical bed
      const config = this.getCurrentDeltaConfig();
      const constraintCalculator =
        this.deltaCalculations.getConstraintCalculator();
      constraintCalculator.updateConfig(config);
      constraintCalculator.setConstraintType(
        this.constraint_type as ConstraintType
      );
      const clearance = constraintCalculator.getConstraintClearance();
      clearanceEl.textContent = `${Math.floor(clearance)}mm`;
    }

    // Update debug info to show which constraint is most restrictive
    this.calculateAndUpdateConstraintAnalysis();
  }

  private calculateAndUpdateConstraintAnalysis(): void {
    // Calculate constraint analysis and delegate UI update to UIManager
    const config = this.getCurrentDeltaConfig();
    const constraintCalculator = this.deltaCalculations.getConstraintCalculator();
    constraintCalculator.updateConfig(config);
    constraintCalculator.setConstraintType(this.constraint_type as ConstraintType);

    const realRadius = constraintCalculator.calculateRealBuildPlateRadius();
    const clearance = constraintCalculator.getConstraintClearance();
    const constraintDescription = constraintCalculator.getActiveConstraintDescription();

    this.uiManager.updateConstraintAnalysis({
      realRadius,
      clearance,
      constraintDescription,
    });
  }

  public setConstraintType(type: string): void {
    this.constraint_type = type;
    this.calculateBuildVolume();
    this.updateDependentParameters();
  }

  public updateDependentParameters(): void {
    // Always recalculate build volume first since other parameters depend on it
    this.calculateBuildVolume();

    // Update DeltaCalculations with current configuration
    const config = this.getCurrentDeltaConfig();
    this.deltaCalculations.updateConfig(config);

    // Get dependent parameter updates from DeltaCalculations
    const updates = this.deltaCalculations.calculateDependentParameters();

    // Apply the calculated updates to instance properties
    if (updates.diagonal_rod_length !== undefined) {
      this.diagonal_rod_length = updates.diagonal_rod_length;
    }
    if (updates.tower_offset !== undefined) {
      this.tower_offset = updates.tower_offset;
    }
    if (updates.effector_radius !== undefined) {
      this.effector_radius = updates.effector_radius;
    }
    if (updates.arm_length !== undefined) {
      this.arm_length = updates.arm_length;
      this.arm_length_sq = updates.arm_length * updates.arm_length;
    }

    // After all parameter updates, recalculate build volume again
    // to ensure all constraints are properly applied
    this.calculateBuildVolume();

    // Update build plate visualization
    if (this.build_plate || this.physical_bed) {
      this.initBuildPlate();
    }

  }

  public effectorAnimate(): void {
    if (!this.effector) return;

    // Store original position before velocity application
    const originalY = this.effector.position.y;

    // First apply velocity movement (like the parent onAnimate does)
    if ((this.effector as any).vx !== undefined) {
      this.effector.position.x += (this.effector as any).vx;
      this.effector.position.y += (this.effector as any).vy;
      this.effector.position.z += (this.effector as any).vz;
    }

    // Apply position constraints using DeltaCalculations
    const constrainedPosition = this.deltaCalculations.constrainPosition(
      this.effector.position
    );

    // Check if Y position was constrained (hit vertical limits)
    const hitVerticalLimit =
      Math.abs(constrainedPosition.y - this.effector.position.y) > 0.001;

    // Update effector position with constraints
    this.effector.position.set(
      constrainedPosition.x,
      constrainedPosition.y,
      constrainedPosition.z
    );

    // Stop velocity if we hit vertical limits
    if (hitVerticalLimit) {
      (this.effector as any).vy = 0;
    }

    this.updateCarriagesFromEffector();
  }

  public homeEffector(): void {
    this.homeState = 1;
    if (this.effector) {
      (this.effector as any).stop();
    }
    this.homeTimer = window.setInterval(
      this.updateHoming.bind(this),
      1000 / 60
    );
  }

  public updateHoming(): void {
    if (!this.effector) {
      console.warn("updateHoming called but effector is null, stopping homing");
      if (this.homeTimer) {
        window.clearInterval(this.homeTimer);
        this.homeTimer = undefined;
      }
      this.homeState = 0;
      return;
    }

    var m = 0.5,
      p = this.effector.position,
      hs = this.homeState,
      zeroxy = hs > 1,
      dx = zeroxy ? 0 : p.x,
      dy = zeroxy ? 0 : p.z,
      dz = hs == 3 ? this.effector_zero_z! : this.effector_endstop_z!,
      dest = new THREE.Vector3(dx, dz, dy),
      pc = p
        .clone()
        .sub(dest)
        .multiplyScalar(-1 / 10);
    // console.log(pc.x);

    if (
      (hs == 1 && pc.y > -m && pc.y < m) ||
      (hs == 2 && pc.x > -m && pc.x < m && pc.z > -m && pc.z < m) ||
      (hs == 3 && Math.floor(p.y) == this.effector_zero_z!)
    ) {
      if (++hs > 3) {
        hs = 0;
        window.clearInterval(this.homeTimer!);
      }
      this.homeState = hs;
    }
    p.add(pc);
  }

  // Advanced calculation methods using DeltaCalculations
  public calculateBuildVolume(): void {
    // Update DeltaCalculations with current configuration
    const config = this.getCurrentDeltaConfig();
    const buildConfig = this.getCurrentBuildConfig();
    buildConfig.constraint_type = this.constraint_type as ConstraintType;

    this.deltaCalculations.updateConfig(config);
    this.deltaCalculations.updateBuildConfig(buildConfig);

    // Get calculated build volume from DeltaCalculations
    const buildVolume = this.deltaCalculations.calculateBuildVolume();

    // Update instance properties with calculated values
    this.DELTA_TOWER_RADIUS = buildVolume.towerRadius;
    this.max_print_radius = buildVolume.maxPrintRadius;
    this.recommended_print_radius = buildVolume.recommendedPrintRadius;
    this.build_volume_height = buildVolume.buildVolumeHeight;

    // Set calculated values for display (maintaining compatibility)
    this.DELTA_PRINTABLE_RADIUS = buildVolume.printableRadius;
    this.DELTA_PRINT_BED_RADIUS = buildVolume.printBedRadius;
  }

  public calculateKinematicLimit(): number {
    // Delegate to DeltaCalculations for kinematic calculations
    return this.deltaCalculations.calculateKinematicLimit();
  }

  public addCubeToScene(s: THREE.Scene): THREE.Mesh {
    var g = new THREE.BoxGeometry(50, 100, 50),
      // var g = new THREE.CylinderGeometry(25, 50, 100, 10, 10, false),
      m = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        wireframe: true,
      }),
      c = new THREE.Mesh(g, m);
    (c as any).opacity = 0.5;
    s.add(c);
    return c;
  }

  public singlePress(k: string): boolean {
    if (this.keyboard!.pressed(k)) {
      if (!this.pressed[k]) {
        this.pressed[k] = true;
        return true;
      }
    } else if (this.pressed[k]) {
      this.pressed[k] = false;
    }
    return false;
  }

  public setupKeyboardHandling(): void {
    // Only prevent default if not in an input field
    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.target &&
          ["INPUT", "TEXTAREA", "SELECT"].includes(
            (event.target as Element).tagName
          )
        ) {
          return; // Allow normal behavior in form elements
        }

        const key = event.key;

        // Prevent default for arrow keys to stop page scrolling
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
          event.preventDefault();
        }

        // Prevent default for space to stop page scrolling
        if (key === " ") {
          event.preventDefault();
        }

        // Prevent default for other game control keys
        if (
          [
            "w",
            "a",
            "s",
            "d",
            "i",
            "j",
            "k",
            "l",
            "g",
            "h",
            "q",
            "e",
            "z",
          ].includes(key.toLowerCase())
        ) {
          event.preventDefault();
        }
      },
      { passive: false }
    );
  }

  public update(): void {
    if (!this.keyboardOn || this.homeState) return;

    const keyboard = this.keyboard;
    if (!keyboard) return;

    const t = keyboard.pressed("shift+up");
    const b = keyboard.pressed("shift+down");
    const u = !t && keyboard.pressed("up");
    const d = !b && keyboard.pressed("down");
    const l = keyboard.pressed("left");
    const r = keyboard.pressed("right");

    const e = this.effector;
    const speed = 0.2;
    const damp = 0.1;

    if (e) {
      // Check if effector has velocity properties, if not add them
      if ((e as any).vx === undefined) {
        (e as any).vx = 0;
        (e as any).vy = 0;
        (e as any).vz = 0;
      }

      if (u || d) {
        if (u) (e as any).vz -= speed;
        if (d) (e as any).vz += speed;
      } else (e as any).vz *= damp;

      if (l || r) {
        if (l) (e as any).vx -= speed;
        if (r) (e as any).vx += speed;
      } else (e as any).vx *= damp;

      if (t || b) {
        if (t) (e as any).vy += speed;
        if (b) (e as any).vy -= speed;
      } else (e as any).vy *= damp;

      // Simple one-time log when arrow keys are pressed
      if (
        (u || d || l || r || t || b) &&
        !this.effector?.userData?.loggedMovement
      ) {
        console.log("Arrow keys detected, setting effector velocity:", {
          vx: (e as any).vx,
          vy: (e as any).vy,
          vz: (e as any).vz,
        });
        this.effector!.userData = { loggedMovement: true };
        // Clear the flag after a short delay
        setTimeout(() => {
          if (this.effector) this.effector.userData.loggedMovement = false;
        }, 1000);
      }
    }

    // Remove old keyboard controls for sliders - now handled by UI sliders

    if (this.singlePress(" ")) {
      this.homeEffector();
    }

    if (this.controlsOrbit !== undefined) this.controlsOrbit.update();
  }
}

// Create and export the singleton instance
export const deltabotApp = new DeltabotApp();
