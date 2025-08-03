import { MathUtils, GeometryUtils } from '../utils/index.js';
import { DEFAULT_DELTA_CONFIG } from '../constants.js';
import { BuildPlateConstraintCalculator } from './BuildPlateConstraintCalculator.js';
import type {
  DeltaRobotConfig,
  BuildVolumeConfig,
  BuildVolumeStats,
  KinematicResult,
  Vector3Like,
  ValidationResult,
  ConstraintType
} from '../types.js';

/**
 * Handles all delta robot mathematical calculations and kinematics
 */
export class DeltaCalculations {
  private config: DeltaRobotConfig;
  private buildConfig: BuildVolumeConfig;
  private constraintCalculator: BuildPlateConstraintCalculator;

  constructor(config: DeltaRobotConfig, buildConfig: BuildVolumeConfig) {
    this.config = config;
    this.buildConfig = buildConfig;
    this.constraintCalculator = new BuildPlateConstraintCalculator(config, buildConfig.physical_bed_radius);
  }

  // Update configurations
  public updateConfig(newConfig: Partial<DeltaRobotConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.constraintCalculator.updateConfig(newConfig);
  }

  public updateBuildConfig(newBuildConfig: Partial<BuildVolumeConfig>): void {
    this.buildConfig = { ...this.buildConfig, ...newBuildConfig };
    if (newBuildConfig.physical_bed_radius !== undefined) {
      this.constraintCalculator.setPhysicalBedRadius(newBuildConfig.physical_bed_radius);
    }
    if (newBuildConfig.constraint_type !== undefined) {
      this.constraintCalculator.setConstraintType(newBuildConfig.constraint_type);
    }
  }

  // Get constraint calculator for advanced build plate analysis
  public getConstraintCalculator(): BuildPlateConstraintCalculator {
    return this.constraintCalculator;
  }

  // Calculate real build plate radius based on current constraints
  public calculateRealBuildPlateRadius(): number {
    return this.constraintCalculator.calculateRealBuildPlateRadius();
  }

  // Calculate optimal arm length based on geometry
  public calculateOptimalArmLength(): number {
    const br = this.config.bot_radius;
    const bh = this.config.bot_height;
    const ch = this.config.carriage_height;

    // Base calculation from geometry
    let calculatedArmLength = br * 2 - this.config.effector_radius * 2 - this.config.carriage_inset + ch;

    // Ensure arm length doesn't exceed vertical space
    const maxVerticalLength = bh - ch / 2;
    if (calculatedArmLength > maxVerticalLength) {
      calculatedArmLength = maxVerticalLength;
    }

    // Ensure minimum arm length for stability
    const minArmLength = br * 0.8;
    if (calculatedArmLength < minArmLength) {
      calculatedArmLength = minArmLength;
    }

    return calculatedArmLength;
  }

  // Calculate build volume constraints - enhanced version matching deltacalc logic
  public calculateBuildVolume(): {
    maxPrintRadius: number;
    recommendedPrintRadius: number;
    buildVolumeHeight: number;
    constraintAnalysis: { type: string; value: number; isLimiting: boolean }[];
    towerRadius: number;
    printableRadius: number;
    printBedRadius: number;
  } {
    // Calculate the DELTA_TOWER_RADIUS equivalent
    const towerRadius = this.config.bot_radius;

    // Use the BuildPlateConstraintCalculator for proper constraint handling (like deltacalc)
    this.constraintCalculator.updateConfig(this.config);
    this.constraintCalculator.setConstraintType(this.buildConfig.constraint_type);

    // Get the real build plate radius from constraint calculator (like deltacalc)
    const theoreticalPrintableRadius = this.constraintCalculator.calculateRealBuildPlateRadius();

    // Calculate kinematic limit based on arm geometry (like deltacalc)
    const kinematicRadius = this.calculateKinematicLimit();

    // Create constraint analysis
    const constraints = [
      { type: 'Theoretical', value: theoreticalPrintableRadius, isLimiting: false },
      { type: 'Kinematic', value: kinematicRadius, isLimiting: false },
      { type: 'Physical Bed', value: this.buildConfig.physical_bed_radius, isLimiting: false },
    ];

    // The actual printable radius is limited by:
    // 1. Theoretical constraint radius (collision avoidance) - from constraint calculator
    // 2. Kinematic constraints (arm reach limitations)
    // NOTE: Physical bed radius is NOT used in calculations - it's for visualization only (like deltacalc)

    // Take the most restrictive constraint (excluding physical bed) - like deltacalc
    const maxPrintRadius = Math.min(theoreticalPrintableRadius, kinematicRadius);

    // Mark the limiting constraint(s)
    constraints.forEach(constraint => {
      constraint.isLimiting = MathUtils.isWithinTolerance(constraint.value, maxPrintRadius, 1);
    });

    // Recommended print radius (more conservative for reliability) - like deltacalc
    const recommendedPrintRadius = maxPrintRadius * 0.9;

    // Calculate build volume height - enhanced from deltacalc logic
    const buildVolumeHeight = this.calculateBuildHeight();

    return {
      maxPrintRadius,
      recommendedPrintRadius,
      buildVolumeHeight,
      constraintAnalysis: constraints,
      towerRadius: towerRadius,
      printableRadius: recommendedPrintRadius,
      printBedRadius: maxPrintRadius,
    };
  }

  // Calculate theoretical printable radius based on constraint type
  public calculateTheoreticalRadius(): number {
    let theoreticalRadius: number;

    switch (this.buildConfig.constraint_type) {
      case 'effector-edge':
        // Most conservative - accounts for effector edge collision
        theoreticalRadius = this.config.bot_radius -
          (this.config.effector_radius + this.config.tower_offset + DEFAULT_DELTA_CONFIG.SAFETY_MARGIN);
        break;

      case 'effector-tip':
        // Less conservative - only considers nozzle tip
        theoreticalRadius = this.config.bot_radius -
          (this.config.tower_offset + DEFAULT_DELTA_CONFIG.SAFETY_MARGIN);
        break;

      case 'horizontal-extrusions':
        // Most aggressive - limited by frame extrusions
        theoreticalRadius = this.config.bot_radius + DEFAULT_DELTA_CONFIG.FRAME_CLEARANCE;
        break;

      default:
        // Default to effector-edge for safety
        theoreticalRadius = this.config.bot_radius -
          (this.config.effector_radius + this.config.tower_offset + DEFAULT_DELTA_CONFIG.SAFETY_MARGIN);
    }

    return Math.max(DEFAULT_DELTA_CONFIG.MIN_BUILD_RADIUS, theoreticalRadius);
  }

  // Calculate kinematic constraints based on arm geometry
  public calculateKinematicLimit(): number {
    const towerRadius = this.config.bot_radius;
    const armLength = this.config.arm_length;
    const effectorRadius = this.config.effector_radius;

    // Distance from tower center to carriage attachment point
    const towerToCarriage = towerRadius - this.config.carriage_inset;

    // Maximum reach when arm is horizontal (worst case)
    const maxKinematicRadius = Math.max(0,
      towerToCarriage + armLength - effectorRadius - 10 // 10mm safety margin
    );

    return maxKinematicRadius;
  }

  // Calculate maximum build height - enhanced to match deltacalc logic
  public calculateBuildHeight(): number {
    const halfHeight = this.config.bot_height / 2;
    const effectorHeight = DEFAULT_DELTA_CONFIG.EFFECTOR_HEIGHT;

    // Calculate like deltacalc: effector_endstop_z and effector_zero_z
    const effectorEndstopZ = halfHeight - this.config.arm_length - this.config.carriage_height / 2;
    const effectorZeroZ = -halfHeight + effectorHeight / 2;

    // Build volume height: from bottom platform to maximum Z where effector can reach
    return Math.max(0, effectorEndstopZ - effectorZeroZ);
  }

  // Calculate carriage positions for given effector position
  public calculateCarriagePositions(effectorPosition: Vector3Like): number[] {
    const carriagePositions: number[] = [];
    const armLengthSquared = this.config.arm_length ** 2;

    // Calculate for each tower
    for (let i = 0; i < 3; i++) {
      const towerPos = GeometryUtils.calculateTowerPosition(i, this.config.bot_radius);
      const effectorNubCenter = GeometryUtils.calculateArmPosition(
        i * 2,
        this.config.effector_radius,
        0,
        true
      );

      // Position of effector nub in world space
      const nubWorldPos = {
        x: effectorPosition.x + effectorNubCenter.x,
        y: effectorPosition.y + effectorNubCenter.y,
        z: effectorPosition.z + effectorNubCenter.z,
      };

      // Calculate carriage Y position using inverse kinematics
      const deltaX = towerPos.x - nubWorldPos.x;
      const deltaZ = towerPos.z - nubWorldPos.z;
      const horizontalDistanceSquared = deltaX ** 2 + deltaZ ** 2;

      // Solve for Y using Pythagorean theorem
      const verticalComponent = Math.sqrt(armLengthSquared - horizontalDistanceSquared);
      const carriageY = nubWorldPos.y + verticalComponent;

      carriagePositions.push(carriageY);
    }

    return carriagePositions;
  }

  // Validate if a position is reachable
  public validatePosition(position: Vector3Like): KinematicResult {
    const carriagePositions = this.calculateCarriagePositions(position);

    // Check if all carriage positions are valid
    const halfHeight = this.config.bot_height / 2;
    const maxCarriageY = halfHeight - this.config.carriage_height / 2;
    const minCarriageY = -halfHeight + this.config.carriage_height / 2;

    const isReachable = carriagePositions.every(y =>
      y >= minCarriageY && y <= maxCarriageY && !Number.isNaN(y)
    );

    // Calculate arm angles for analysis
    const armAngles = carriagePositions.map((carriageY, i) => {
      const towerPos = GeometryUtils.calculateTowerPosition(i, this.config.bot_radius);
      const deltaY = carriageY - position.y;
      const horizontalDistance = MathUtils.distance2D(
        towerPos.x, towerPos.z,
        position.x, position.z
      );
      return Math.atan2(deltaY, horizontalDistance);
    });

    return {
      position: { x: position.x, y: position.y, z: position.z },
      carriage_positions: carriagePositions,
      is_reachable: isReachable,
      arm_angles: armAngles,
    };
  }

  // Calculate comprehensive frame statistics
  public calculateFrameStats(): BuildVolumeStats {
    const buildVolume = this.calculateBuildVolume();
    const towerCircumference = 2 * Math.PI * this.config.bot_radius;
    const totalRailLength = this.config.bot_height * 6; // 6 vertical rails
    const totalArmLength = this.config.arm_length * 6; // 6 arms
    const printableRadius = buildVolume.recommendedPrintRadius;
    const buildVolumeHeight = buildVolume.buildVolumeHeight;

    // Calculate volume in cubic millimeters
    const buildVolumeCubicMm = Math.PI * (printableRadius ** 2) * buildVolumeHeight;

    return {
      tower_radius: this.config.bot_radius,
      tower_circumference: towerCircumference,
      total_height: this.config.bot_height,
      total_rail_length: totalRailLength,
      total_arm_length: totalArmLength,
      printable_radius: printableRadius,
      print_bed_radius: buildVolume.maxPrintRadius,
      build_volume_height: buildVolumeHeight,
      build_volume_cubic_mm: buildVolumeCubicMm,
      build_volume_liters: buildVolumeCubicMm / 1000000, // Convert to liters
    };
  }

  // Calculate tower angles in radians
  public calculateTowerAngles(): number[] {
    return [
      Math.PI / 6,                    // Tower A at 30°
      Math.PI / 6 + (2 * Math.PI / 3), // Tower B at 150°
      Math.PI / 6 + (4 * Math.PI / 3)  // Tower C at 270°
    ];
  }

  // Calculate work envelope (theoretical maximum reach)
  public calculateWorkEnvelope(): { radius: number; height: number } {
    const armReach = this.config.arm_length;
    const towerSpacing = this.config.bot_radius;

    // Maximum radius is limited by arm length and tower positions
    const maxRadius = Math.min(
      armReach - this.config.effector_radius,
      towerSpacing - this.config.carriage_inset - this.config.effector_radius
    );

    return {
      radius: Math.max(0, maxRadius),
      height: this.calculateBuildHeight(),
    };
  }

  // Validate entire delta configuration
  public validateConfiguration(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check basic geometry constraints
    if (this.config.arm_length < this.config.bot_radius * 0.5) {
      errors.push('Arm length too short for bot radius');
    }

    if (this.config.effector_radius > this.config.bot_radius * 0.4) {
      warnings.push('Effector radius very large compared to bot radius');
    }

    if (this.config.carriage_inset > this.config.bot_radius * 0.3) {
      warnings.push('Carriage inset may limit build volume significantly');
    }

    // Check kinematic feasibility
    const kinematicLimit = this.calculateKinematicLimit();
    if (kinematicLimit < this.config.bot_radius * 0.3) {
      warnings.push('Limited kinematic reach detected');
    }

    // Check build volume
    const buildVolume = this.calculateBuildVolume();
    if (buildVolume.maxPrintRadius < 30) {
      warnings.push('Very small build area calculated');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Update dependent parameters automatically
  public calculateDependentParameters(): Partial<DeltaRobotConfig> {
    const updates: Partial<DeltaRobotConfig> = {};

    // Calculate optimal diagonal rod length
    const optimalDiagonalRod = this.config.bot_radius * 1.25;
    if (Math.abs(this.config.diagonal_rod_length - optimalDiagonalRod) > 10) {
      updates.diagonal_rod_length = Math.round(optimalDiagonalRod);
    }

    // Ensure tower offset matches carriage inset for clearance
    if (this.config.tower_offset !== this.config.carriage_inset) {
      updates.tower_offset = this.config.carriage_inset;
    }

    // Limit effector radius to reasonable size
    const maxEffectorRadius = this.config.bot_radius / 4;
    if (this.config.effector_radius > maxEffectorRadius) {
      updates.effector_radius = Math.floor(maxEffectorRadius);
    }

    // Update arm length to optimal value
    const optimalArmLength = this.calculateOptimalArmLength();
    if (Math.abs(this.config.arm_length - optimalArmLength) > 5) {
      updates.arm_length = optimalArmLength;
    }

    return updates;
  }

  // Constrain effector position to valid area
  public constrainPosition(position: Vector3Like): Vector3Like {
    const buildVolume = this.calculateBuildVolume();
    const constraintRadius = buildVolume.maxPrintRadius;

    // Apply horizontal constraints
    const horizontalDistance = MathUtils.distance2D(position.x, position.z, 0, 0);
    let constrainedX = position.x;
    let constrainedZ = position.z;

    if (horizontalDistance > constraintRadius) {
      const angle = Math.atan2(position.x, position.z);
      constrainedX = Math.sin(angle) * constraintRadius;
      constrainedZ = Math.cos(angle) * constraintRadius;
    }

    // Apply vertical constraints
    const halfHeight = this.config.bot_height / 2;
    const maxY = halfHeight - this.config.arm_length - this.config.carriage_height / 2;
    const minY = -halfHeight + DEFAULT_DELTA_CONFIG.EFFECTOR_HEIGHT / 2;

    const constrainedY = MathUtils.clamp(position.y, minY, maxY);

    // Apply carriage position constraints
    const constrainedPosition = { x: constrainedX, y: constrainedY, z: constrainedZ };
    const finalConstrainedPosition = this.applyCarriageConstraints(constrainedPosition);

    return finalConstrainedPosition;
  }

  // Apply carriage-specific constraints to prevent carriages from going below build plate or other limits
  private applyCarriageConstraints(position: Vector3Like): Vector3Like {
    // Calculate current carriage positions for this effector position
    const carriageYPositions = this.calculateCarriagePositions(position);
    const halfHeight = this.config.bot_height / 2;

    // Define minimum allowed carriage Y positions (using same coordinate system as effector)
    // Build plate is at: -halfHeight + PLATFORM_HEIGHT
    const buildPlateLevel = -halfHeight + DEFAULT_DELTA_CONFIG.PLATFORM_HEIGHT;
    const carriageMinAboveBuildPlate = buildPlateLevel + 10; // 10mm clearance above build plate
    const frameMinY = -halfHeight + 25; // 25mm from bottom of frame for mechanical clearance

    // The minimum allowed carriage Y position (most restrictive)
    const minAllowedCarriageY = Math.max(carriageMinAboveBuildPlate, frameMinY);

    // Find the most problematic carriage (lowest Y position)
    const lowestCarriageY = Math.min(...carriageYPositions);

    // If the lowest carriage is above the minimum, no constraint needed
    if (lowestCarriageY >= minAllowedCarriageY) {
      return position; // No constraint violation
    }

    // Calculate how much we need to raise the effector to fix the violation
    const requiredCarriageYIncrease = minAllowedCarriageY - lowestCarriageY;

    // For delta kinematics: when effector moves up by ΔY, carriage also moves up by approximately ΔY
    // (this is a simplification but works well for small adjustments)
    const constrainedEffectorY = position.y + requiredCarriageYIncrease;

    // Return the constrained position
    return {
      x: position.x,
      y: constrainedEffectorY,
      z: position.z,
    };
  }
  // Debug method to check carriage constraints (for testing)
  public debugCarriageConstraints(position: Vector3Like): {
    original: Vector3Like;
    constrained: Vector3Like;
    carriageYPositions: number[];
    constrainedCarriageYPositions: number[];
    buildPlateLevel: number;
    minAllowedCarriageY: number;
    constraintApplied: boolean;
    violations: { carriage: number; violation: number }[];
  } {
    const originalPosition = { ...position };
    const carriageYPositions = this.calculateCarriagePositions(position);
    const halfHeight = this.config.bot_height / 2;

    // Use same logic as applyCarriageConstraints
    const buildPlateLevel = -halfHeight + DEFAULT_DELTA_CONFIG.PLATFORM_HEIGHT;
    const carriageMinAboveBuildPlate = buildPlateLevel + 10;
    const frameMinY = -halfHeight + 25;
    const minAllowedCarriageY = Math.max(carriageMinAboveBuildPlate, frameMinY);

    const constrainedPosition = this.constrainPosition(position);
    const constrainedCarriageYPositions = this.calculateCarriagePositions(constrainedPosition);

    const constraintApplied = (
      Math.abs(constrainedPosition.x - originalPosition.x) > 0.001 ||
      Math.abs(constrainedPosition.y - originalPosition.y) > 0.001 ||
      Math.abs(constrainedPosition.z - originalPosition.z) > 0.001
    );

    // Check which carriages were violating constraints
    const violations: { carriage: number; violation: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const violation = minAllowedCarriageY - carriageYPositions[i];
      if (violation > 0) {
        violations.push({ carriage: i, violation });
      }
    }

    return {
      original: originalPosition,
      constrained: constrainedPosition,
      carriageYPositions,
      constrainedCarriageYPositions,
      buildPlateLevel,
      minAllowedCarriageY,
      constraintApplied,
      violations
    };
  }
}
