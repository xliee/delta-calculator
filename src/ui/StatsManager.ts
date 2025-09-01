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
import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { DeltaRobotConfig } from '../types.ts';

// Extend window interface for global functions
declare global {
  interface Window {
    toggleStatsSection?: (sectionId: string) => void;
  }
}

/**
 * Manages real-time stats display in the floating window
 */
export class StatsManager {
  private container: HTMLElement;
  private isVisible: boolean = true;
  private lastUpdateTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;

  // Stats elements
  private fpsElement: HTMLElement | null = null;
  private frameTimeElement: HTMLElement | null = null;
  private drawCallsElement: HTMLElement | null = null;
  private trianglesElement: HTMLElement | null = null;
  private effectorPosElement: HTMLElement | null = null;
  private cameraPosElement: HTMLElement | null = null;
  private carriagePositionsElement: HTMLElement | null = null;
  private carriageRangeElement: HTMLElement | null = null;
  private carriageConstraintElement: HTMLElement | null = null;
  private marlinConfigElement: HTMLElement | null = null;

  constructor() {
    this.container = this.createStatsContainer();
    document.body.appendChild(this.container);
    this.initializeElements();
    this.initializeCollapsedStates();
    this.startStatsLoop();
  }

  private initializeCollapsedStates(): void {
    // Set some sections collapsed by default
    const collapsedSections = ['camera-section', 'carriages-section'];

    collapsedSections.forEach(sectionId => {
      const content = document.getElementById(sectionId);
      const section = content?.closest('.stats-section');
      if (section) {
        section.classList.add('collapsed');
      }
    });
  }

  private createStatsContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'floating-stats';
    container.id = 'floating-stats-real';
    container.innerHTML = `
      <div class="stats-header">
        <h4>Live Stats</h4>
      </div>

      <div class="stats-section">
        <div class="stats-section-header" onclick="toggleStatsSection('performance-section')">
          <h5>Performance</h5>
          <span class="stats-toggle">▼</span>
        </div>
        <div class="stats-section-content" id="performance-section">
          <div class="stat-item">
            <span class="stat-label">FPS:</span>
            <span class="stat-value" id="stats-fps">--</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Frame Time:</span>
            <span class="stat-value" id="stats-frame-time">--</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Draw Calls:</span>
            <span class="stat-value" id="stats-draw-calls">--</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Triangles:</span>
            <span class="stat-value" id="stats-triangles">--</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <div class="stats-section-header" onclick="toggleStatsSection('effector-section')">
          <h5>Effector Position</h5>
          <span class="stats-toggle">▼</span>
        </div>
        <div class="stats-section-content" id="effector-section">
          <div class="stat-item">
            <span class="stat-label">Position:</span>
            <span class="stat-value" id="stats-effector-pos">--</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <div class="stats-section-header" onclick="toggleStatsSection('camera-section')">
          <h5>Camera</h5>
          <span class="stats-toggle">▼</span>
        </div>
        <div class="stats-section-content" id="camera-section">
          <div class="stat-item">
            <span class="stat-label">Position:</span>
            <span class="stat-value" id="stats-camera-pos">--</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <div class="stats-section-header" onclick="toggleStatsSection('carriages-section')">
          <h5>Carriages</h5>
          <span class="stats-toggle">▼</span>
        </div>
        <div class="stats-section-content" id="carriages-section">
          <div class="stat-item">
            <span class="stat-label">Z Positions:</span>
            <span class="stat-value" id="stats-carriage-pos">--</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Travel Range:</span>
            <span class="stat-value" id="stats-carriage-range">--</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Constraint:</span>
            <span class="stat-value" id="stats-carriage-constraint">--</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <div class="stats-section-header" onclick="toggleStatsSection('marlin-section')">
          <h5>Marlin Config</h5>
          <span class="stats-toggle">▼</span>
        </div>
        <div class="stats-section-content" id="marlin-section">
          <div class="stat-item">
            <span class="stat-label">Values:</span>
            <span class="stat-value" id="stats-marlin-config">--</span>
          </div>
        </div>
      </div>
    `;

    // Add section styling
    const style = document.createElement('style');
    style.textContent = `
      .floating-stats {
        max-height: 80vh;
        overflow-y: auto;
      }

      .floating-stats .stats-header h4 {
        margin: 0 0 10px 0;
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        border-bottom: 2px solid #52c4ff;
        padding-bottom: 5px;
      }

      .floating-stats .stats-section {
        margin: 5px 0;
        border: 1px solid rgba(52, 152, 219, 0.3);
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.1);
      }

      .floating-stats .stats-section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 8px;
        cursor: pointer;
        background: rgba(52, 152, 219, 0.1);
        border-radius: 4px 4px 0 0;
        user-select: none;
      }

      .floating-stats .stats-section-header:hover {
        background: rgba(52, 152, 219, 0.2);
      }

      .floating-stats .stats-section-header h5 {
        margin: 0;
        color: #52c4ff;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
      }

      .floating-stats .stats-toggle {
        color: #52c4ff;
        font-size: 10px;
        transition: transform 0.2s ease;
      }

      .floating-stats .stats-section.collapsed .stats-toggle {
        transform: rotate(-90deg);
      }

      .floating-stats .stats-section-content {
        padding: 6px 8px;
        transition: max-height 0.3s ease, padding 0.3s ease;
        overflow: hidden;
      }

      .floating-stats .stats-section.collapsed .stats-section-content {
        max-height: 0;
        padding: 0 8px;
      }

      .floating-stats .stat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 3px 0;
      }
    `;
    document.head.appendChild(style);

    // Add global toggle function for stats sections
    if (!window.toggleStatsSection) {
      window.toggleStatsSection = (sectionId: string) => {
        const content = document.getElementById(sectionId);
        const section = content?.closest('.stats-section');
        const toggle = section?.querySelector('.stats-toggle');

        if (section && toggle) {
          section.classList.toggle('collapsed');
        }
      };
    }

    return container;
  }

  private initializeElements(): void {
    this.fpsElement = document.getElementById('stats-fps');
    this.frameTimeElement = document.getElementById('stats-frame-time');
    this.drawCallsElement = document.getElementById('stats-draw-calls');
    this.trianglesElement = document.getElementById('stats-triangles');
    this.effectorPosElement = document.getElementById('stats-effector-pos');
    this.cameraPosElement = document.getElementById('stats-camera-pos');
    this.carriagePositionsElement = document.getElementById('stats-carriage-pos');
    this.carriageRangeElement = document.getElementById('stats-carriage-range');
    this.carriageConstraintElement = document.getElementById('stats-carriage-constraint');
    this.marlinConfigElement = document.getElementById('stats-marlin-config');
  }

  private startStatsLoop(): void {
    const updateStats = () => {
      if (this.isVisible) {
        this.updateFPS();
      }
      requestAnimationFrame(updateStats);
    };
    requestAnimationFrame(updateStats);
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();

    if (now >= this.lastUpdateTime + 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastUpdateTime));
      this.frameCount = 0;
      this.lastUpdateTime = now;

      if (this.fpsElement) {
        this.fpsElement.textContent = this.fps.toString();
      }

      if (this.frameTimeElement) {
        const frameTime = this.fps > 0 ? (1000 / this.fps).toFixed(1) : '--';
        this.frameTimeElement.textContent = `${frameTime}ms`;
      }
    }
  }

  public updateRenderStats(renderer: THREE.WebGLRenderer): void {
    if (!this.isVisible) return;

    const info = renderer.info;

    if (this.drawCallsElement) {
      this.drawCallsElement.textContent = info.render.calls.toString();
    }

    if (this.trianglesElement) {
      this.trianglesElement.textContent = info.render.triangles.toLocaleString();
    }
  }

  public updateEffectorPosition(position: THREE.Vector3, bedLevelZ?: number): void {
    if (!this.isVisible || !this.effectorPosElement) return;

    // Convert from Three.js coordinates to delta robot coordinates
    // Three.js: X=left/right, Y=up/down (vertical), Z=forward/back
    // Delta Robot User Display: X=left/right, Y=forward/back, Z=up/down (vertical)
    // Mapping: X=X, Y=Z_threejs, Z=Y_threejs
    const deltaX = position.x;
    const deltaY = position.z; // Three.js Z becomes delta Y
    const deltaZ = bedLevelZ !== undefined ? position.y - bedLevelZ : position.y; // Three.js Y becomes delta Z

    this.effectorPosElement.textContent =
      `X: ${deltaX.toFixed(1)}, Y: ${deltaY.toFixed(1)}, Z: ${deltaZ.toFixed(1)}`;
  }

  public updateCameraPosition(camera: THREE.Camera, controls?: OrbitControls): void {
    if (!this.isVisible || !this.cameraPosElement) return;

    let cameraInfo = `Pos: X:${camera.position.x.toFixed(1)} Y:${camera.position.y.toFixed(1)} Z:${camera.position.z.toFixed(1)}`;

    if (controls) {
      // Add target information
      const target = controls.target;
      cameraInfo += `<br>Target: X:${target.x.toFixed(1)} Y:${target.y.toFixed(1)} Z:${target.z.toFixed(1)}`;

      // Calculate distance from camera to target
      const distance = camera.position.distanceTo(target);
      cameraInfo += `<br>Distance: ${distance.toFixed(1)}mm`;

      // Add zoom level (for perspective camera)
      if (camera.type === 'PerspectiveCamera') {
        const perspectiveCamera = camera as THREE.PerspectiveCamera;
        cameraInfo += `<br>FOV: ${perspectiveCamera.fov.toFixed(1)}°`;
      }
    }

    this.cameraPosElement.innerHTML = cameraInfo;
  }

  public updateCarriagePositions(positions: number[], bedLevelZ?: number): void {
    if (!this.isVisible || !this.carriagePositionsElement) return;

    // Convert carriage Y positions (Three.js) to Z positions (delta robot display)
    // Apply the same coordinate system as effector: Y_threejs - bedLevelZ = Z_delta (build plate at Z=0)
    const convertedPositions = positions.map(pos => {
      return bedLevelZ !== undefined ? pos - bedLevelZ : pos;
    });

    const posStr = convertedPositions.map((pos, i) => `${String.fromCharCode(65 + i)}: ${pos.toFixed(1)}Z`).join(', ');
    this.carriagePositionsElement.textContent = posStr;
  }

  public updateMarlinConfig(config: DeltaRobotConfig): void {
    if (!this.isVisible || !this.marlinConfigElement) return;

    // Calculate Marlin configuration values
    const deltaRadius = config.bot_radius - config.eff_spacing - config.carriage_inset;
    const printableRadius = deltaRadius - 10; // Safety margin

    const marlinValues = {
      'DELTA_PRINTABLE_RADIUS': printableRadius.toFixed(1),
      'DELTA_DIAGONAL_ROD': config.arm_length.toFixed(1),
      'DELTA_SMOOTH_ROD_OFFSET': config.bot_radius.toFixed(1),
      'DELTA_EFFECTOR_OFFSET': config.eff_spacing.toFixed(1),
      'DELTA_CARRIAGE_OFFSET': config.carriage_inset.toFixed(1)
    };

    let configText = '';
    Object.entries(marlinValues).forEach(([key, value]) => {
      configText += `${key}: ${value}<br>`;
    });

    this.marlinConfigElement.innerHTML = configText;
  }

  public updateCarriageConstraints(analysis: {
    travelRange: number;
    limitingFactor: string;
    maxRadius: number;
  }): void {
    if (!this.isVisible) return;

    if (this.carriageRangeElement) {
      this.carriageRangeElement.textContent = `${analysis.travelRange.toFixed(1)}mm`;
    }

    if (this.carriageConstraintElement) {
      const limitText = analysis.limitingFactor === 'carriage_position' ?
        `Limited by carriage travel (${analysis.maxRadius.toFixed(1)}mm)` :
        `Limited by ${analysis.limitingFactor} (${analysis.maxRadius.toFixed(1)}mm)`;
      this.carriageConstraintElement.textContent = limitText;
    }
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.container.style.display = visible ? 'block' : 'none';
  }

  public getVisible(): boolean {
    return this.isVisible;
  }

  public dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
