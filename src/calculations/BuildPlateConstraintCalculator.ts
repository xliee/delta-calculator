import type { DeltaRobotConfig, ConstraintType } from '../types.js';

/**
 * Advanced build plate constraint calculations
 * Implements complex logic for determining real build area independent of physical bed
 */
export class BuildPlateConstraintCalculator {
  private config: DeltaRobotConfig;
  private physicalBedRadius: number;
  private constraintType: ConstraintType;
  private towerCollisionOffset: number;

  constructor(config: DeltaRobotConfig, physicalBedRadius: number = 120) {
    this.config = config;
    this.physicalBedRadius = physicalBedRadius;
    this.constraintType = 'effector-edge';
    this.towerCollisionOffset = 10; // Safety margin to avoid tower collision
  }

  /**
   * Set constraint type for build volume calculation
   */
  public setConstraintType(type: ConstraintType): void {
    this.constraintType = type;
  }

  /**
   * Set tower collision offset
   */
  public setTowerCollisionOffset(offset: number): void {
    this.towerCollisionOffset = offset;
  }

  /**
   * Calculate the real build plate radius based on constraints
   * This is independent of the physical bed - it's the actual printable area
   */
  public calculateRealBuildPlateRadius(): number {
    switch (this.constraintType) {
      case 'effector-edge':
        return this.calculateEffectorEdgeConstraint();
      case 'effector-tip':
        return this.calculateEffectorTipConstraint();
      case 'horizontal-extrusions':
        return this.calculateHorizontalExtrusionConstraint();
      default:
        return this.calculateEffectorEdgeConstraint();
    }
  }

  /**
   * Calculate constraint based on effector edge clearance
   */
  private calculateEffectorEdgeConstraint(): number {
    // Calculate maximum radius where the effector edge doesn't collide with towers
    const towerRadius = this.config.bot_radius;
    const effectorRadius = this.config.effector_radius;

    // Distance from center to tower edge (accounting for tower thickness)
    const towerEdgeRadius = towerRadius - this.config.rod_radius;

    // Maximum radius where effector edge clears towers
    const maxRadius = towerEdgeRadius - effectorRadius - this.towerCollisionOffset;

    // Apply carriage position constraints
    const carriageConstrainedRadius = this.calculateCarriageConstrainedRadius();

    return Math.max(0, Math.min(maxRadius, carriageConstrainedRadius));
  }

  /**
   * Calculate constraint based on effector tip (nozzle) position
   */
  private calculateEffectorTipConstraint(): number {
    // For tip constraint, we only consider the nozzle position, not the effector edge
    const towerRadius = this.config.bot_radius;
    const towerEdgeRadius = towerRadius - this.config.rod_radius;

    // Nozzle can get closer to towers than the effector edge
    const maxRadius = towerEdgeRadius - this.towerCollisionOffset;

    // Apply carriage position constraints
    const carriageConstrainedRadius = this.calculateCarriageConstrainedRadius();

    return Math.max(0, Math.min(maxRadius, carriageConstrainedRadius));
  }

  /**
   * Calculate constraint based on horizontal extrusion clearance
   */
  private calculateHorizontalExtrusionConstraint(): number {
    // Account for horizontal frame extrusions that might limit build area
    const towerRadius = this.config.bot_radius;

    // Assume horizontal extrusions are positioned at tower radius
    // and have some thickness that reduces printable area
    const extrusionThickness = 20; // Typical extrusion size
    const maxRadius = towerRadius - extrusionThickness - this.towerCollisionOffset;

    // Apply carriage position constraints
    const carriageConstrainedRadius = this.calculateCarriageConstrainedRadius();

    return Math.max(0, Math.min(maxRadius, carriageConstrainedRadius));
  }

  /**
   * Get constraint clearance - how much margin is available
   */
  public getConstraintClearance(): number {
    const realRadius = this.calculateRealBuildPlateRadius();
    const towerRadius = this.config.bot_radius;

    return towerRadius - realRadius - this.towerCollisionOffset;
  }

  /**
   * Get active constraint description
   */
  public getActiveConstraintDescription(): string {
    const carriageAnalysis = this.getCarriageConstraintAnalysis();
    const clearance = this.getConstraintClearance();
    const constraintNames = {
      'effector-edge': 'Effector Edge',
      'effector-tip': 'Effector Tip',
      'horizontal-extrusions': 'Frame Extrusions'
    };

    let description = `${constraintNames[this.constraintType]}`;

    // Add limiting factor information
    if (carriageAnalysis.limitingFactor === 'carriage_position') {
      description += ' (Carriage Limit)';
    } else if (carriageAnalysis.limitingFactor === 'arm_reach') {
      description += ' (Arm Reach)';
    }

    description += ` (${clearance.toFixed(1)}mm clearance)`;

    return description;
  }

  /**
   * Calculate build volume height based on arm geometry
   */
  public calculateBuildVolumeHeight(): number {
    const armLength = this.config.arm_length;
    const towerHeight = this.config.bot_height;
    const carriageHeight = this.config.carriage_height;

    // Maximum height when arms are nearly vertical
    const maxHeight = Math.sqrt(armLength * armLength - this.config.effector_radius * this.config.effector_radius);

    // Subtract carriage height and safety margin
    const availableHeight = towerHeight - carriageHeight - 20; // 20mm safety margin

    return Math.min(maxHeight, availableHeight);
  }

  /**
   * Check if a point is within the real build area
   */
  public isPointInBuildArea(x: number, y: number, z: number = 0): boolean {
    const realRadius = this.calculateRealBuildPlateRadius();
    const maxHeight = this.calculateBuildVolumeHeight();

    const distanceFromCenter = Math.sqrt(x * x + y * y);

    return distanceFromCenter <= realRadius && z >= 0 && z <= maxHeight;
  }

  /**
   * Get comparison between real build area and physical bed
   */
  public getBuildAreaComparison(): {
    realRadius: number;
    physicalRadius: number;
    difference: number;
    isRealLarger: boolean;
    isRealSmaller: boolean;
  } {
    const realRadius = this.calculateRealBuildPlateRadius();
    const difference = realRadius - this.physicalBedRadius;

    return {
      realRadius,
      physicalRadius: this.physicalBedRadius,
      difference: Math.abs(difference),
      isRealLarger: difference > 0,
      isRealSmaller: difference < 0
    };
  }

  /**
   * Generate constraint analysis report
   */
  public generateConstraintReport(): {
    constraints: Array<{
      type: ConstraintType;
      radius: number;
      active: boolean;
    }>;
    recommendation: string;
  } {
    const constraints = [
      {
        type: 'effector-edge' as ConstraintType,
        radius: this.calculateEffectorEdgeConstraint(),
        active: this.constraintType === 'effector-edge'
      },
      {
        type: 'effector-tip' as ConstraintType,
        radius: this.calculateEffectorTipConstraint(),
        active: this.constraintType === 'effector-tip'
      },
      {
        type: 'horizontal-extrusions' as ConstraintType,
        radius: this.calculateHorizontalExtrusionConstraint(),
        active: this.constraintType === 'horizontal-extrusions'
      }
    ];

    // Find the most limiting constraint
    const mostLimiting = constraints.reduce((min, constraint) =>
      constraint.radius < min.radius ? constraint : min
    );

    let recommendation = '';
    if (mostLimiting.type !== this.constraintType) {
      recommendation = `Consider switching to "${mostLimiting.type}" constraint for maximum build area (${mostLimiting.radius.toFixed(1)}mm radius)`;
    } else {
      recommendation = `Current constraint "${this.constraintType}" is optimal for this configuration`;
    }

    return { constraints, recommendation };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<DeltaRobotConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Update physical bed radius
   */
  public setPhysicalBedRadius(radius: number): void {
    this.physicalBedRadius = radius;
  }

  /**
   * Calculate maximum radius constrained by carriage position limits
   * This is the critical constraint that's often overlooked
   */
  private calculateCarriageConstrainedRadius(): number {
    const halfHeight = this.config.bot_height / 2;
    const maxCarriageY = halfHeight - this.config.carriage_height / 2;
    const minCarriageY = -halfHeight + this.config.carriage_height / 2;
    const towerRadius = this.config.bot_radius;

    // For simplicity, test at bed level (Y = minCarriageY + effector height)
    // We'll find the maximum radius where carriages stay within limits
    const testY = minCarriageY + 50; // Approximate effector position at bed level

    let maxValidRadius = 0;
    const testStep = 5; // Test in 5mm increments
    const maxTestRadius = towerRadius + 50; // Don't test beyond reasonable limits

    // Test different radii to find the maximum where carriages stay within bounds
    for (let testRadius = 0; testRadius <= maxTestRadius; testRadius += testStep) {
      let allCarriagesValid = true;

      // Test carriage positions for all three towers at this radius
      for (let tower = 0; tower < 3; tower++) {
        const angle = (tower * 120) * Math.PI / 180; // 120° between towers
        const effectorX = testRadius * Math.cos(angle);
        const effectorZ = testRadius * Math.sin(angle);

        // Calculate required carriage position for this effector position
        const carriageY = this.calculateRequiredCarriageY(
          tower,
          { x: effectorX, y: testY, z: effectorZ }
        );

        // Check if carriage position is within physical limits
        if (Number.isNaN(carriageY) || carriageY < minCarriageY || carriageY > maxCarriageY) {
          allCarriagesValid = false;
          break;
        }
      }

      if (allCarriagesValid) {
        maxValidRadius = testRadius;
      } else {
        break; // No point testing larger radii
      }
    }

    return maxValidRadius;
  }

  /**
   * Calculate required carriage Y position for given effector position and tower
   */
  private calculateRequiredCarriageY(
    towerIndex: number,
    effectorPos: { x: number; y: number; z: number }
  ): number {
    const armLength = this.config.arm_length;
    const towerRadius = this.config.bot_radius;
    const carriageInset = this.config.carriage_inset;

    // Tower angle (120° between towers)
    const towerAngle = towerIndex * 120 * Math.PI / 180;

    // Carriage attachment point (inset from tower edge)
    const carriageX = (towerRadius - carriageInset) * Math.cos(towerAngle);
    const carriageZ = (towerRadius - carriageInset) * Math.sin(towerAngle);

    // Effector nub position (simplified - assume at effector center for this calculation)
    const nubX = effectorPos.x;
    const nubZ = effectorPos.z;

    // Calculate required carriage Y using inverse kinematics
    const deltaX = carriageX - nubX;
    const deltaZ = carriageZ - nubZ;
    const horizontalDistanceSquared = deltaX * deltaX + deltaZ * deltaZ;

    // Check if position is reachable
    if (horizontalDistanceSquared > armLength * armLength) {
      return NaN; // Unreachable
    }

    // Solve for Y using Pythagorean theorem
    const verticalComponent = Math.sqrt(armLength * armLength - horizontalDistanceSquared);
    const carriageY = effectorPos.y + verticalComponent;

    return carriageY;
  }

  /**
   * Get detailed carriage constraint analysis
   */
  public getCarriageConstraintAnalysis(): {
    maxRadius: number;
    limitingFactor: 'carriage_position' | 'arm_reach' | 'geometry';
    carriageLimits: {
      minY: number;
      maxY: number;
      travelRange: number;
    };
  } {
    const halfHeight = this.config.bot_height / 2;
    const maxCarriageY = halfHeight - this.config.carriage_height / 2;
    const minCarriageY = -halfHeight + this.config.carriage_height / 2;
    const carriageConstrainedRadius = this.calculateCarriageConstrainedRadius();

    // Determine limiting factor
    const armLength = this.config.arm_length;
    const theoreticalMaxRadius = armLength - this.config.effector_radius;

    let limitingFactor: 'carriage_position' | 'arm_reach' | 'geometry';
    if (carriageConstrainedRadius < theoreticalMaxRadius * 0.9) {
      limitingFactor = 'carriage_position';
    } else if (carriageConstrainedRadius < theoreticalMaxRadius) {
      limitingFactor = 'arm_reach';
    } else {
      limitingFactor = 'geometry';
    }

    return {
      maxRadius: carriageConstrainedRadius,
      limitingFactor,
      carriageLimits: {
        minY: minCarriageY,
        maxY: maxCarriageY,
        travelRange: maxCarriageY - minCarriageY
      }
    };
  }
}
