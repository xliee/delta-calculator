import { PI2, DEG_TO_RAD, RAD_TO_DEG } from '../constants.ts';
import type { Vector3Like, ParameterLimits, ValidationResult } from '../types.ts';

// Mathematical utilities
export const MathUtils = {
  // Clamp value between min and max
  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  },

  // Convert degrees to radians
  degToRad(degrees: number): number {
    return degrees * DEG_TO_RAD;
  },

  // Convert radians to degrees
  radToDeg(radians: number): number {
    return radians * RAD_TO_DEG;
  },

  // Round to specified number of decimal places
  round(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  },

  // Check if value is within tolerance of target
  isWithinTolerance(value: number, target: number, tolerance: number): boolean {
    return Math.abs(value - target) <= tolerance;
  },

  // Linear interpolation
  lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  },

  // Calculate distance between two 2D points
  distance2D(x1: number, z1: number, x2: number, z2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
  },

  // Calculate distance between two 3D points
  distance3D(p1: Vector3Like, p2: Vector3Like): number {
    return Math.sqrt(
      (p2.x - p1.x) ** 2 +
      (p2.y - p1.y) ** 2 +
      (p2.z - p1.z) ** 2
    );
  },
};

// Geometry utilities for delta robot calculations
export const GeometryUtils = {
  // Calculate tower position for given tower index and radius
  calculateTowerPosition(towerIndex: number, radius: number): Vector3Like {
    const angle = towerIndex * (PI2 / 3) + (PI2 / 6); // 30° offset
    return {
      x: Math.sin(angle) * radius,
      y: 0,
      z: Math.cos(angle) * radius,
    };
  },

  // Calculate arm position for given arm index and parameters
  calculateArmPosition(
    armIndex: number,
    radius: number,
    spacing: number = 0,
    centerOnly: boolean = false
  ): Vector3Like {
    const towerIndex = Math.floor(armIndex / 2);
    const baseAngle = towerIndex * (PI2 / 3) + (PI2 / 6);

    if (centerOnly || spacing === 0) {
      return {
        x: Math.sin(baseAngle) * radius,
        y: 0,
        z: Math.cos(baseAngle) * radius,
      };
    }

    const sign = (armIndex % 2) ? -1 : 1;
    const perpAngle = baseAngle + (PI2 / 4); // 90° perpendicular
    const offset = (sign * spacing) / 2;

    const basePos = GeometryUtils.calculateTowerPosition(towerIndex, radius);
    return {
      x: basePos.x + Math.sin(perpAngle) * offset,
      y: basePos.y,
      z: basePos.z + Math.cos(perpAngle) * offset,
    };
  },

  // Calculate effector nub positions
  calculateEffectorNubPositions(
    effectorRadius: number,
    spacing: number
  ): Vector3Like[] {
    const positions: Vector3Like[] = [];

    for (let i = 0; i < 6; i++) {
      positions.push(
        GeometryUtils.calculateArmPosition(i, effectorRadius, spacing, false)
      );
    }

    return positions;
  },

  // Calculate if a point is within a circular constraint
  isWithinCircularConstraint(
    x: number,
    z: number,
    centerX: number,
    centerZ: number,
    radius: number
  ): boolean {
    const distance = MathUtils.distance2D(x, z, centerX, centerZ);
    return distance <= radius;
  },
};

// Validation utilities
export const ValidationUtils = {
  // Validate parameter against limits
  validateParameter(
    value: number,
    limits: ParameterLimits,
    paramName: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (Number.isNaN(value)) {
      errors.push(`${paramName}: Value must be a number`);
    } else {
      if (value < limits.min) {
        errors.push(`${paramName}: Value ${value} is below minimum ${limits.min}`);
      }
      if (value > limits.max) {
        errors.push(`${paramName}: Value ${value} is above maximum ${limits.max}`);
      }

      // Check if value is far from default (potential warning)
      const defaultValue = limits.default;
      if (Math.abs(value - defaultValue) > (defaultValue * 0.5)) {
        warnings.push(`${paramName}: Value differs significantly from recommended default`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },

  // Validate delta robot configuration for kinematic feasibility
  validateDeltaConfig(config: {
    bot_radius: number;
    arm_length: number;
    effector_radius: number;
    carriage_inset: number;
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if arm length is sufficient for geometry
    const minArmLength = config.bot_radius - config.carriage_inset - config.effector_radius;
    if (config.arm_length < minArmLength) {
      errors.push('Arm length too short for current geometry');
    }

    // Check if effector radius is reasonable compared to bot radius
    if (config.effector_radius > config.bot_radius * 0.3) {
      warnings.push('Effector radius is large compared to bot radius');
    }

    // Check for potential kinematics issues
    const reachRadius = config.bot_radius - config.carriage_inset + config.arm_length;
    if (reachRadius < config.bot_radius * 0.8) {
      warnings.push('Limited reach detected - consider increasing arm length');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
};

// String utilities for formatting
export const StringUtils = {
  // Pad string to specified length (replacement for String.prototype.lpad)
  padLeft(str: string, length: number, char: string = ' '): string {
    const s = str.toString();
    const need = length - s.length;
    return need > 0 ? char.repeat(need) + s : s;
  },

  // Format number with specified decimal places
  formatNumber(value: number, decimals: number = 1): string {
    return value.toFixed(decimals);
  },

  // Format as millimeters
  formatMM(value: number, decimals: number = 0): string {
    return `${value.toFixed(decimals)}mm`;
  },

  // Format volume in liters
  formatLiters(volumeMM3: number, decimals: number = 2): string {
    const liters = volumeMM3 / 1000000; // Convert mm³ to liters
    return `${liters.toFixed(decimals)}L`;
  },

  // Format as degrees
  formatDegrees(radians: number, decimals: number = 1): string {
    return `${MathUtils.radToDeg(radians).toFixed(decimals)}°`;
  },
};

// DOM utilities for UI management
export const DOMUtils = {
  // Get element by ID with type safety
  getElementById<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
  },

  // Update slider and input values
  updateSliderInput(sliderId: string, inputId: string, value: number): void {
    const slider = DOMUtils.getElementById<HTMLInputElement>(sliderId);
    const input = DOMUtils.getElementById<HTMLInputElement>(inputId);

    if (slider) slider.value = value.toString();
    if (input) input.value = value.toString();
  },

  // Set element text content safely
  setTextContent(elementId: string, content: string): void {
    const element = DOMUtils.getElementById(elementId);
    if (element) {
      element.textContent = content;
    }
  },

  // Set element HTML content safely
  setInnerHTML(elementId: string, html: string): void {
    const element = DOMUtils.getElementById(elementId);
    if (element) {
      element.innerHTML = html;
    }
  },

  // Add event listener with proper cleanup
  addEventListenerWithCleanup<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): () => void {
    element.addEventListener(type, listener, options);
    return () => element.removeEventListener(type, listener, options);
  },
};

// Performance utilities
export const PerformanceUtils = {
  // Debounce function calls
  debounce<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: number;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = window.setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function calls
  throttle<T extends (...args: unknown[]) => void>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  },

  // RAF-based animation loop with cleanup
  createAnimationLoop(callback: (deltaTime: number) => void): () => void {
    let animationId: number;
    let lastTime = 0;
    let isRunning = true;

    const loop = (currentTime: number) => {
      if (!isRunning) return;

      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      callback(deltaTime);
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  },
};
