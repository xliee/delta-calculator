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
import type { EffectorType, EffectorConfigExtended, PresetConfigExtended } from './types.js';

// Mathematical constants
export const PI2 = Math.PI * 2;
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

// Delta robot default values
export const DEFAULT_DELTA_CONFIG = {
  // Mechanical parameters
  ROD_RADIUS: 4,
  BOT_RADIUS: 240,
  BOT_HEIGHT: 700,
  ROD_SPACING: 46,
  EFF_SPACING: 46,
  ARM_LENGTH: 240,
  ARM_RADIUS: 2.5,
  EFFECTOR_RADIUS: 40,
  CARRIAGE_INSET: 25,
  CARRIAGE_HEIGHT: 30,
  CARRIAGE_OFFSET: 0, // Ball joint offset from carriage plane (mm)
  TOWER_OFFSET: 25,
  DIAGONAL_ROD_LENGTH: 240,

  // Build volume parameters
  PHYSICAL_BED_RADIUS: 120, // Anycubic Kossel Linear Plus
  EFFECTOR_HEIGHT: 10,
  PLATFORM_HEIGHT: 10,

  // Safety margins
  SAFETY_MARGIN: 5, // mm clearance
  FRAME_CLEARANCE: 15, // mm clearance from frame extrusions
  MIN_BUILD_RADIUS: 10, // Minimum printable radius
} as const;

// UI constants
export const UI_CONFIG = {
  CONTROLS_PANEL_WIDTH: 350,
  STATS_UPDATE_INTERVAL: 100, // ms
  ANIMATION_FRAME_RATE: 60, // fps
  CAMERA_MIN_DISTANCE: 400,
  CAMERA_MAX_DISTANCE: 2000,
  CAMERA_MIN_POLAR_ANGLE: Math.PI * 0.1,
  CAMERA_MAX_POLAR_ANGLE: Math.PI * 0.9,
  DAMPING_FACTOR: 0.05,
} as const;

// 3D rendering constants
export const RENDERER_CONFIG = {
  ALPHA: true,
  ANTIALIAS: true,
  SHADOW_MAP_SIZE: 2048,
  LIGHT_INTENSITY: {
    AMBIENT: 0.4,
    DIRECTIONAL: 0.8,
    HEMISPHERE: 0.3,
    POINT: 0.5,
    SPOTLIGHT: 0.6,
  },
} as const;

// Colors (hex values)
export const COLORS = {
  // Robot components
  FRAME: 0xffffff,
  CARRIAGES: 0x66ff66,
  ARMS: 0x111111,
  EFFECTOR: 0xff4488,
  PLATFORMS: 0xff8844,

  // Build areas
  BUILD_PLATE: 0x888888, // Gray for calculated printable area
  PHYSICAL_BED: 0x44cc44, // Green for physical bed

  // Lighting
  AMBIENT_LIGHT: 0x404040,
  DIRECTIONAL_LIGHT: 0xffffff,
  HEMISPHERE_SKY: 0x87ceeb,
  HEMISPHERE_GROUND: 0x8b4513,
  POINT_LIGHT: 0xffffff,
  SPOTLIGHT: 0xffffff,
  BULB_EMISSIVE: 0xffffbb,

  // UI theme
  PRIMARY: 0x3498db,
  SECONDARY: 0x2c3e50,
  ACCENT: 0x52c4ff,
  TEXT: 0xecf0f1,
  BORDER: 0x34495e,
} as const;

// Animation and movement constants
export const MOVEMENT = {
  EFFECTOR_SPEED: 0.2,
  DAMPING: 0.1,
  HOMING_SPEED: 0.5,
  BOUNCE_AMPLITUDE: 2,
  TURN_THRESHOLD: 15,
  WAIT_FRAMES: 60,
} as const;

// Geometric calculations
export const GEOMETRY = {
  TOWER_COUNT: 3,
  ARMS_PER_TOWER: 2,
  TOTAL_ARMS: 6,
  TOWER_ANGLE_OFFSET: Math.PI / 6, // 30 degrees
  TOWER_ANGLE_SPACING: (2 * Math.PI) / 3, // 120 degrees
  PERPENDICULAR_OFFSET: PI2 / 4, // 90 degrees
} as const;

// Parameter limits for validation
export const PARAMETER_LIMITS = {
  bot_radius: { min: 50, max: 500, step: 5, default: 240 },
  bot_height: { min: 200, max: 1000, step: 10, default: 700 },
  rod_spacing: { min: 20, max: 100, step: 2, default: 46 },
  rod_radius: { min: 2, max: 10, step: 0.5, default: 4 },
  carriage_inset: { min: 10, max: 50, step: 1, default: 25 },
  carriage_height: { min: 15, max: 60, step: 1, default: 30 },
  carriage_offset: { min: 0, max: 20, step: 0.5, default: 0 },
  arm_radius: { min: 1, max: 10, step: 0.1, default: 2.5 },
  effector_radius: { min: 20, max: 80, step: 2, default: 40 },
  eff_spacing: { min: 20, max: 60, step: 2, default: 46 },
  diagonal_rod_length: { min: 150, max: 400, step: 5, default: 240 },
  tower_offset: { min: 0, max: 50, step: 1, default: 25 },
  physical_bed_radius: { min: 50, max: 200, step: 5, default: 120 },
} as const;

// Preset configurations
export const PRESET_CONFIGS = {
  'kossel-mini': {
    bot_radius: 120,
    bot_height: 400,
    rod_spacing: 25,
    rod_radius: 4,
    carriage_inset: 20,
    carriage_height: 25,
    carriage_offset: 0,
    arm_length: 100,
    arm_radius: 2.5,
    effector_radius: 30,
    eff_spacing: 25,
    diagonal_rod_length: 180,
    tower_offset: 20,
  },
  'kossel-standard': {
    bot_radius: 195,
    bot_height: 520,
    rod_spacing: 30,
    rod_radius: 4,
    carriage_inset: 25,
    carriage_height: 30,
    carriage_offset: 0,
    arm_length: 100,
    arm_radius: 2.5,
    effector_radius: 40,
    eff_spacing: 30,
    diagonal_rod_length: 240,
    tower_offset: 25,
  },
  'kossel-xl': {
    bot_radius: 260,
    bot_height: 700,
    rod_spacing: 35,
    rod_radius: 5,
    carriage_inset: 30,
    carriage_height: 35,
    carriage_offset: 0,
    arm_length: 100,
    arm_radius: 3,
    effector_radius: 50,
    eff_spacing: 35,
    diagonal_rod_length: 320,
    tower_offset: 30,
  },
  'anycubic-linear-plus': {
    bot_radius: 190,
    bot_height: 500,
    rod_spacing: 46,
    rod_radius: 4,
    carriage_inset: 25,
    carriage_height: 30,
    carriage_offset: 0,
    arm_length: 100,
    arm_radius: 2.5,
    effector_radius: 40,
    eff_spacing: 46,
    diagonal_rod_length: 240,
    tower_offset: 25,
  },
} as const;

// Preset display information
export const PRESET_METADATA = {
  'kossel-mini': {
    name: 'Kossel Mini',
    description: 'Compact delta printer with 120mm build radius'
  },
  'kossel-standard': {
    name: 'Kossel',
    description: 'Standard Kossel configuration with 195mm build radius'
  },
  'kossel-xl': {
    name: 'Kossel XL',
    description: 'Large format Kossel with 260mm build radius'
  },
  'anycubic-linear-plus': {
    name: 'Anycubic Linear+',
    description: 'Anycubic Kossel Linear Plus commercial printer'
  },
} as const;

// Combined preset configurations with metadata
export const PRESET_CONFIGURATIONS = Object.fromEntries(
  Object.entries(PRESET_CONFIGS).map(([key, config]) => [
    key,
    { ...config, ...PRESET_METADATA[key as keyof typeof PRESET_METADATA] }
  ])
) as Record<keyof typeof PRESET_CONFIGS, PresetConfigExtended>;

// Effector configurations with metadata
export const EFFECTOR_CONFIGURATIONS: Record<EffectorType, EffectorConfigExtended> = {
  'standard': {
    radius: 40,
    spacing: 46,
    stl: 'effector.stl',
    name: 'Standard Effector',
    description: 'Basic delta effector with standard ball joint spacing',
    ballJointSpacing: 23,
    nozzleOffset: 0,
    previewImage: 'effector-standard.png',
    features: ['Basic hotend mount', 'Standard spacing', 'Lightweight design']
  },
  // 'e3d-v6': {
  //   radius: 35,
  //   spacing: 28,
  //   stl: 'effector.stl',
  //   name: 'E3D V6 Effector',
  //   description: 'Optimized for E3D V6 hotend with compact design',
  //   ballJointSpacing: 20,
  //   nozzleOffset: 2,
  //   previewImage: 'effector-e3d-v6.png',
  //   features: ['E3D V6 optimized', 'Compact design', 'Improved cooling']
  // },
  // 'smart-effector': {
  //   radius: 60,
  //   spacing: 45,
  //   stl: 'effector.stl',
  //   name: 'Duet Smart Effector',
  //   description: 'Duet3D Smart Effector with integrated strain gauge and accelerometer',
  //   ballJointSpacing: 50,
  //   nozzleOffset: 0,
  //   previewImage: 'effector-smart.png',
  //   features: ['Integrated strain gauge', 'Auto bed leveling', 'Accelerometer', 'LED indicators']
  // },
  'custom': {
    radius: 40,
    spacing: 30,
    stl: 'effector.stl',
    name: 'Custom Effector',
    description: 'User-defined configuration',
    ballJointSpacing: 23,
    nozzleOffset: 0,
    previewImage: 'effector-custom.png',
    features: ['Configurable parameters', 'Flexible design', 'User customizable']
  }
};

// Effector tooltips interface and values
export interface EffectorTooltips {
  radius: string;
  spacing: string;
  ballJointSpacing: string;
  nozzleOffset: string;
}

export const EFFECTOR_TOOLTIPS: EffectorTooltips = {
  radius: 'Distance from effector center to ball joint attachment points. Affects printable area and kinematics.',
  spacing: 'Spacing between ball joint pairs on each arm. Affects effector stability and precision.',
  ballJointSpacing: 'Distance between the two ball joints on each delta arm. Affects joint stress distribution.',
  nozzleOffset: 'Vertical offset of the nozzle tip from the effector center. Affects Z-axis calculations.'
};

// Validation messages
export const VALIDATION_MESSAGES = {
  INVALID_RANGE: 'Value must be between {min} and {max}',
  INVALID_TYPE: 'Value must be a number',
  KINEMATIC_WARNING: 'Configuration may result in poor kinematics',
  REACH_WARNING: 'Effector may not reach full build volume',
  COLLISION_WARNING: 'Potential collision detected with current settings',
} as const;
