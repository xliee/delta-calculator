import type * as THREE from 'three';

// Core delta robot configuration types
export interface SceneObjects {
  arms: THREE.Object3D[]; // Changed from THREE.Mesh[] to support Groups
  rods: THREE.Mesh[];
  platforms: THREE.Mesh[];
  carriages: THREE.Object3D[];
  effector: THREE.Object3D | null;
  build_plate?: THREE.Mesh;
  physical_bed?: THREE.Mesh;
  ball_joints: THREE.Mesh[]; // Add ball joints array
}

export interface DeltaRobotConfig {
  rod_radius: number;
  bot_radius: number;
  bot_height: number;
  rod_spacing: number;
  eff_spacing: number;
  arm_length: number;
  arm_radius: number;
  effector_radius: number;
  carriage_inset: number;
  carriage_height: number;
  carriage_offset: number; // Ball joint offset from carriage plane (mm)
  tower_offset: number;
  diagonal_rod_length: number;
}

// Build volume and constraint types
export type ConstraintType = 'effector-edge' | 'effector-tip' | 'horizontal-extrusions';

export interface BuildVolumeConfig {
  physical_bed_radius: number;
  show_physical_bed: boolean;
  constraint_type: ConstraintType;
  max_print_radius: number;
  recommended_print_radius: number;
  build_volume_height: number;
}

// Effector configuration types
export interface EffectorConfig {
  radius: number;
  spacing: number;
  stl: string;
}

export interface EffectorConfigExtended extends EffectorConfig {
  name: string;
  description: string;
  previewImage?: string;
  ballJointSpacing: number;
  nozzleOffset: number;
  features: string[];
}

export type EffectorType = string;

export interface EffectorConfigs {
  [key: string]: EffectorConfig;
}

// UI configuration types
export interface ParameterConfig {
  property: string;
  sliderId: string;
  inputId: string;
  min: number;
  max: number;
  step: number;
  updateMethod?: string;
}

export interface PresetConfig extends DeltaRobotConfig {}

export interface PresetConfigExtended extends PresetConfig {
  name: string;
  description?: string;
}

// Calculation result types
export interface BuildVolumeStats {
  tower_radius: number;
  tower_circumference: number;
  total_height: number;
  total_rail_length: number;
  total_arm_length: number;
  printable_radius: number;
  print_bed_radius: number;
  build_volume_height: number;
  build_volume_cubic_mm: number;
  build_volume_liters: number;
}

export interface KinematicResult {
  position: Vector3Like;
  carriage_positions: number[];
  is_reachable: boolean;
  arm_angles: number[];
}

// Utility types
export interface DivSize {
  w: number;
  h: number;
}

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

// Animation and interaction types
export interface AnimationState {
  homeState: number;
  pressed: { [key: string]: boolean };
  statsTimer?: number;
  homeTimer?: number;
}

// Error and validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ParameterLimits {
  min: number;
  max: number;
  step: number;
  default: number;
}
