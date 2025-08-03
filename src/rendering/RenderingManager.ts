import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RENDERER_CONFIG, UI_CONFIG, COLORS } from '../constants.ts';
import type { DivSize } from '../types.ts';

// Set Z-up coordinate system globally for Three.js
THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

/**
 * Handles Three.js rendering setup and scene management
 */
export class RenderingManager {
  private renderer!: THREE.WebGLRenderer;
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private controlsOrbit?: OrbitControls;
  private divSize: DivSize = { w: 640, h: 480 };
  private divAspect: number = 4 / 3;

  constructor() {}

  // Initialize the complete rendering system
  public init(botRadius: number, botHeight: number): { renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera; scene: THREE.Scene; controls: OrbitControls | undefined } {
    this.renderer = this.initRenderer();
    this.camera = this.initCamera(botRadius, botHeight);
    this.scene = this.initScene();
    this.setupOrbitControls(botRadius, botHeight);

    return {
      renderer: this.renderer,
      camera: this.camera,
      scene: this.scene,
      controls: this.controlsOrbit
    };
  }

  // Create a Three.js WebGL Renderer
  private initRenderer(): THREE.WebGLRenderer {
    const container = document.getElementById("graphics");
    if (!container) throw new Error("Graphics container not found");

    // Remove old renderers, in case of re-init
    while (container.lastChild) {
      container.removeChild(container.lastChild);
    }

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
    });

    // Enable shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    this.updateRendererSize(renderer);
    return renderer;
  }

  private updateRendererSize(renderer: THREE.WebGLRenderer): void {
    const container = document.getElementById("graphics");
    if (!container) return;

    this.divSize = {
      w: container.clientWidth,
      h: window.innerHeight,
    };
    this.divAspect = container.clientWidth / window.innerHeight;
    renderer.setSize(container.clientWidth, window.innerHeight);
  }

  // Create enhanced lighting setup for Z-up coordinate system
  private initScene(): THREE.Scene {
    const scene = new THREE.Scene();

    // Add axes helper to visualize the Z-up coordinate system
    // The X axis is red. The Y axis is green. The Z axis is blue. 
    const axesHelper = new THREE.AxesHelper(25);
    scene.add(axesHelper);

    // Enhanced lighting setup for Z-up coordinate system
    // Ambient lighting for overall illumination
    scene.add(new THREE.AmbientLight(0x404040, 0.4));

    // Main directional light simulating sunlight (adjusted for Z-up)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, -50, 100); // X=right, Y=back, Z=up
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    // Hemisphere light for natural color variation (sky=Z+, ground=Z-)
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x8b4513, 0.3);
    scene.add(hemisphereLight);

    // Point light for additional fill lighting
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 1000);
    pointLight.position.set(-100, -100, 100); // X=left, Y=back, Z=up
    scene.add(pointLight);

    return scene;
  }

  // Create camera with proper positioning for Z-up coordinate system
  private initCamera(botRadius: number, botHeight: number): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      35,
      this.divSize.w / this.divSize.h,
      0.1,
      15000
    );

    // Position camera relative to delta robot geometry
    // In Z-up system: X=right, Y=forward/back, Z=up/down
    const d1 = botRadius * 2 + 200;
    const d2 = botHeight * 2 + 50;
    const distance = Math.max(d1, d2) * 0.8;
    const targetZ = botHeight / 8; // Target should be positive Z (up from base)

    camera.position.set(
      distance * 0.5,  // X offset (right)
      -distance * 0.8, // Y offset (back from target)
      targetZ + distance * 0.6  // Z well above target (looking down)
    );

    // Set camera up vector for Z-up coordinate system
    camera.up.set(0, 0, 1);

    // Make camera look at the target point
    camera.lookAt(0, 0, targetZ);

    return camera;
  }

  // Set up orbit controls for Z-up coordinate system
  private setupOrbitControls(botRadius: number, botHeight: number): void {
    const container = document.getElementById("graphics");
    if (!container) throw new Error("Graphics container not found");

    // Get container child canvas
    if (container.children.length === 0) {
      throw new Error("Graphics container has no child canvas");
    }
    const canvas = container.children[0] as HTMLCanvasElement;

    this.controlsOrbit = new OrbitControls(this.camera, canvas);

    // Prevent problematic camera positions that cause NaN
    this.controlsOrbit.minDistance = 100;
    this.controlsOrbit.maxDistance = 2000;
    this.controlsOrbit.minPolarAngle = Math.PI * 0.1; // Prevent camera from going to poles
    this.controlsOrbit.maxPolarAngle = Math.PI * 0.9;

    // Smoother controls
    this.controlsOrbit.enableDamping = true;
    this.controlsOrbit.dampingFactor = 0.05;
    this.controlsOrbit.screenSpacePanning = false;

    // Set target to center of the delta robot model (Z-up coordinate system)
    const targetZ = botHeight / 8; // Target should be positive Z (up from base)
    this.controlsOrbit.target.set(0, 0, targetZ);
    this.controlsOrbit.update();

    // Add event listener with NaN detection
    this.controlsOrbit.addEventListener('change', () => {
      this.validateCameraPosition(botRadius, botHeight);
    });
  }

  // Position camera relative to delta robot geometry (Z-up coordinate system)
  public positionCamera(botRadius: number, botHeight: number): void {
    const d1 = botRadius * 2 + 200;
    const d2 = botHeight * 2 + 50;
    const distance = Math.max(d1, d2) * 0.8;
    const targetZ = botHeight / 8; // Target should be positive Z (up from base)

    this.camera.position.set(
      distance * 0.5,  // X offset (right)
      -distance * 0.8, // Y offset (back from target)
      targetZ + distance * 0.6  // Z well above target (looking down)
    );

    // Make camera look at the target point
    this.camera.lookAt(0, 0, targetZ);

    if (this.controlsOrbit) {
      this.controlsOrbit.target.set(0, 0, targetZ);
      this.controlsOrbit.update();
    }
  }

  // Validate and fix camera position if NaN detected (Z-up coordinate system)
  private validateCameraPosition(botRadius: number, botHeight: number): void {
    const pos = this.camera.position;
    if (Number.isNaN(pos.x) || Number.isNaN(pos.y) || Number.isNaN(pos.z)) {
      console.warn('NaN detected in camera position, resetting...');
      // Reset to a safe position based on bot dimensions
      const d1 = botRadius * 2 + 200;
      const d2 = botHeight * 2 + 50;
      const distance = Math.max(d1, d2) * 0.8;
      const targetZ = botHeight / 8;
      this.camera.position.set(
        distance * 0.5,
        -distance * 0.8,
        targetZ + distance * 0.6
      );
      this.camera.lookAt(0, 0, targetZ);
      if (this.controlsOrbit) {
        this.controlsOrbit.target.set(0, 0, targetZ);
        this.controlsOrbit.update();
      }
    }
  }

  // Handle window resize matching deltacalc.ts
  public handleResize(botRadius: number, botHeight: number): void {
    this.updateRendererSize(this.renderer);
    this.camera.aspect = this.divAspect;
    this.camera.updateProjectionMatrix();
    this.positionCamera(botRadius, botHeight);
  }

  // Start the render loop matching deltacalc.ts pattern
  public startRenderLoop(updateCallback: () => void, onAnimateCallback: () => void): void {
    const renderLoop = () => {
      requestAnimationFrame(renderLoop);

      // Call animation update
      onAnimateCallback();

      // Update controls
      if (this.controlsOrbit) {
        this.controlsOrbit.update();
      }

      updateCallback();
      this.render();
    };

    renderLoop();
  }

  // Render the scene
  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  // Clean up resources
  public dispose(): void {
    if (this.controlsOrbit) {
      this.controlsOrbit.dispose();
    }

    // Dispose of renderer
    this.renderer.dispose();

    // Clear scene
    this.scene.clear();
  }

  // Getters for external access
  public getRenderer(): THREE.WebGLRenderer { return this.renderer; }
  public getCamera(): THREE.PerspectiveCamera { return this.camera; }
  public getScene(): THREE.Scene { return this.scene; }
  public getControls(): OrbitControls | undefined { return this.controlsOrbit; }
}
