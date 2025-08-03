import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

export interface STLModelInfo {
  name: string;
  filename: string;
  path: string;
  size?: number;
  loadTime?: number;
  triangles?: number;
}

export interface LoadedModel {
  mesh: THREE.Mesh;
  info: STLModelInfo;
  originalPosition: THREE.Vector3;
  originalScale: THREE.Vector3;
}

/**
 * Unified STL Model Manager that handles both 3D scene management and UI
 */
export class STLModelManager {
  private scene: THREE.Scene;
  private loadedModels: Map<string, LoadedModel> = new Map();
  private loader: STLLoader;
  private buildPlateY: number = 0;

  // UI Elements
  private modelListContainer: HTMLElement | null = null;
  private uploadContainer: HTMLElement | null = null;
  private modelStats: HTMLElement | null = null;

  // Default materials for loaded models
  private defaultMaterial = new THREE.MeshLambertMaterial({
    color: 0x3498db,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });

  private selectedMaterial = new THREE.MeshLambertMaterial({
    color: 0xe74c3c,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });

  private selectedModel: string | null = null;
  private onModelLoadCallback?: (model: LoadedModel) => void;
  private onModelUnloadCallback?: (modelId: string) => void;

  // Preset models
  private presetModels = [
    { name: 'Calibration Cube', filename: 'calibration_cube.stl', path: 'models/' },
    // { name: 'Test Cube', filename: 'calibration_cube.stl', path: 'models/calibration/' }
  ];

  constructor(scene: THREE.Scene, buildPlateY: number = 0) {
    this.scene = scene;
    this.loader = new STLLoader();
    this.buildPlateY = buildPlateY;
    this.initializeUI();
    this.setupCallbacks();
  }

  // ================== UI INITIALIZATION ==================

  /**
   * Initialize UI elements
   */
  private initializeUI(): void {
    this.createModelSection();
    this.setupFileInput();
    this.setupPresetModels();
  }

  /**
   * Setup model manager callbacks
   */
  private setupCallbacks(): void {
    this.setOnModelLoadCallback((model: LoadedModel) => {
      this.updateModelsList();
      this.updateStatistics();
      console.log(`Model loaded: ${model.info.name}`);
    });

    this.setOnModelUnloadCallback((modelId: string) => {
      this.updateModelsList();
      this.updateStatistics();
      console.log(`Model unloaded: ${modelId}`);
    });
  }

  /**
   * Create the models section in the UI
   */
  private createModelSection(): void {
    const controlsPanel = document.querySelector('.controls-panel');
    if (!controlsPanel) return;

    const modelSection = document.createElement('div');
    modelSection.className = 'section';
    modelSection.id = 'stl-models-section';

    modelSection.innerHTML = `
      <div class="section-header" onclick="toggleSection('stl-models-section')">
        <h3 class="section-title">STL Models</h3>
        <span class="section-toggle">▼</span>
      </div>
      <div class="section-content">
        <!-- File Upload -->
        <div class="control-group">
          <label>Load STL Model:</label>
          <div class="upload-container">
            <input type="file" id="stl-file-input" accept=".stl" style="display: none;">
            <button id="stl-upload-btn" class="btn">Choose STL File</button>
            <span id="stl-file-name" class="file-name"></span>
          </div>
        </div>

        <!-- Preset Models -->
        <div class="control-group">
          <label>Preset Models:</label>
          <div id="preset-models" class="preset-container">
            <!-- Preset buttons will be added here -->
          </div>
        </div>

        <!-- Loaded Models List -->
        <div class="control-group">
          <label>Loaded Models:</label>
          <div id="loaded-models-list" class="models-list">
            <div class="no-models">No models loaded</div>
          </div>
        </div>

        <!-- Model Statistics -->
        <div class="control-group">
          <label>Model Statistics:</label>
          <div id="model-statistics" class="model-stats">
            <div class="stat">Models: <span id="models-count">0</span></div>
            <div class="stat">Total Triangles: <span id="total-triangles">0</span></div>
            <div class="stat">Selected: <span id="selected-model">None</span></div>
          </div>
        </div>
      </div>
    `;

    controlsPanel.appendChild(modelSection);

    // Cache UI element references
    this.modelListContainer = document.getElementById('loaded-models-list');
    this.uploadContainer = document.querySelector('.upload-container');
    this.modelStats = document.getElementById('model-statistics');
  }

  /**
   * Setup file input handling
   */
  private setupFileInput(): void {
    const fileInput = document.getElementById('stl-file-input') as HTMLInputElement;
    const uploadBtn = document.getElementById('stl-upload-btn');
    const fileName = document.getElementById('stl-file-name');

    if (uploadBtn && fileInput && fileName) {
      uploadBtn.addEventListener('click', () => {
        fileInput.click();
      });

      fileInput.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
          fileName.textContent = file.name;
          this.loadFromFile(file);
        }
      });
    }
  }

  /**
   * Setup preset model buttons
   */
  private setupPresetModels(): void {
    const presetContainer = document.getElementById('preset-models');
    if (!presetContainer) return;

    this.presetModels.forEach(preset => {
      const button = document.createElement('button');
      button.className = 'btn preset-btn';
      button.textContent = preset.name;
      button.addEventListener('click', () => {
        this.loadPresetModel(preset);
      });
      presetContainer.appendChild(button);
    });
  }

  // ================== CORE MODEL MANAGEMENT ==================

  /**
   * Set callback for when a model is loaded
   */
  public setOnModelLoadCallback(callback: (model: LoadedModel) => void): void {
    this.onModelLoadCallback = callback;
  }

  /**
   * Set callback for when a model is unloaded
   */
  public setOnModelUnloadCallback(callback: (modelId: string) => void): void {
    this.onModelUnloadCallback = callback;
  }

  /**
   * Unload a model from the scene
   */
  public unloadModel(modelId: string): boolean {
    const loadedModel = this.loadedModels.get(modelId);
    if (!loadedModel) {
      return false;
    }

    // Remove from scene
    this.scene.remove(loadedModel.mesh);

    // Dispose geometry and material
    loadedModel.mesh.geometry.dispose();
    if (Array.isArray(loadedModel.mesh.material)) {
      loadedModel.mesh.material.forEach(material => material.dispose());
    } else {
      loadedModel.mesh.material.dispose();
    }

    // Remove from tracking
    this.loadedModels.delete(modelId);

    // Clear selection if this was selected
    if (this.selectedModel === modelId) {
      this.selectedModel = null;
    }

    // Notify callback
    if (this.onModelUnloadCallback) {
      this.onModelUnloadCallback(modelId);
    }

    console.log(`Unloaded STL model: ${loadedModel.info.filename}`);
    return true;
  }

  /**
   * Unload all models
   */
  public unloadAllModels(): void {
    const modelIds = Array.from(this.loadedModels.keys());
    modelIds.forEach(id => this.unloadModel(id));
  }

  /**
   * Get information about all loaded models
   */
  public getLoadedModels(): Map<string, LoadedModel> {
    return new Map(this.loadedModels);
  }

  /**
   * Select a model (changes its appearance)
   */
  public selectModel(modelId: string): boolean {
    // Deselect current model
    if (this.selectedModel) {
      this.deselectModel(this.selectedModel);
    }

    const loadedModel = this.loadedModels.get(modelId);
    if (!loadedModel) {
      return false;
    }

    // Apply selected material
    loadedModel.mesh.material = this.selectedMaterial.clone();
    this.selectedModel = modelId;

    return true;
  }

  /**
   * Deselect a model
   */
  public deselectModel(modelId: string): boolean {
    const loadedModel = this.loadedModels.get(modelId);
    if (!loadedModel) {
      return false;
    }

    // Restore default material
    loadedModel.mesh.material = this.defaultMaterial.clone();

    if (this.selectedModel === modelId) {
      this.selectedModel = null;
    }

    return true;
  }

  /**
   * Move a model to a new position
   */
  public moveModel(modelId: string, position: THREE.Vector3): boolean {
    const loadedModel = this.loadedModels.get(modelId);
    if (!loadedModel) {
      return false;
    }

    loadedModel.mesh.position.copy(position);
    return true;
  }

  /**
   * Scale a model
   */
  public scaleModel(modelId: string, scale: number | THREE.Vector3): boolean {
    const loadedModel = this.loadedModels.get(modelId);
    if (!loadedModel) {
      return false;
    }

    if (typeof scale === 'number') {
      loadedModel.mesh.scale.setScalar(scale);
    } else {
      loadedModel.mesh.scale.copy(scale);
    }

    return true;
  }

  /**
   * Rotate a model
   */
  public rotateModel(modelId: string, rotation: THREE.Euler): boolean {
    const loadedModel = this.loadedModels.get(modelId);
    if (!loadedModel) {
      return false;
    }

    loadedModel.mesh.rotation.copy(rotation);
    return true;
  }

  /**
   * Reset a model to its original transform
   */
  public resetModelTransform(modelId: string): boolean {
    const loadedModel = this.loadedModels.get(modelId);
    if (!loadedModel) {
      return false;
    }

    loadedModel.mesh.position.copy(loadedModel.originalPosition);
    loadedModel.mesh.scale.copy(loadedModel.originalScale);
    loadedModel.mesh.rotation.set(0, 0, 0);

    return true;
  }

  /**
   * Update the build plate Y position (printer's Z=0 level)
   */
  public updateBuildPlateY(buildPlateY: number): void {
    this.buildPlateY = buildPlateY;
    
    // Update existing models to new build plate level
    this.loadedModels.forEach(model => {
      model.mesh.position.y = buildPlateY;
      model.originalPosition.y = buildPlateY;
    });
  }

  // ================== FILE LOADING METHODS ==================

  /**
   * Load STL model from file
   */
  public async loadFromFile(file: File): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const startTime = performance.now();

      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            throw new Error('Failed to read file');
          }

          const geometry = this.loader.parse(arrayBuffer);
          const loadTime = performance.now() - startTime;

          const modelInfo: STLModelInfo = {
            name: file.name.replace('.stl', ''),
            filename: file.name,
            path: 'uploaded/',
            size: file.size,
            loadTime: loadTime,
            triangles: geometry.getAttribute('position').count / 3
          };

          const modelId = await this.addModelToScene(geometry, modelInfo);
          resolve(modelId);
        } catch (error) {
          console.error('Error loading STL file:', error);
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Load a preset model
   */
  public async loadPresetModel(preset: { name: string, filename: string, path: string }): Promise<string | null> {
    try {
      const fullPath = `${preset.path}${preset.filename}`;
      const startTime = performance.now();

      return new Promise((resolve, reject) => {
        this.loader.load(
          fullPath,
          (geometry) => {
            const loadTime = performance.now() - startTime;

            const modelInfo: STLModelInfo = {
              name: preset.name,
              filename: preset.filename,
              path: preset.path,
              loadTime: loadTime,
              triangles: geometry.getAttribute('position').count / 3
            };

            this.addModelToScene(geometry, modelInfo).then(resolve).catch(reject);
          },
          (progress) => {
            console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
          },
          (error) => {
            console.error('Error loading preset model:', error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('Error loading preset model:', error);
      return null;
    }
  }

  /**
   * Add loaded geometry to scene as a model
   */
  private async addModelToScene(geometry: THREE.BufferGeometry, modelInfo: STLModelInfo): Promise<string> {
    // Center the geometry horizontally and place it on the build surface
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    
    // Translate geometry to center it horizontally and place bottom at Z=0 of the geometry
    geometry.translate(-center.x, -bbox.min.y, -center.z);

    // Create mesh
    const mesh = new THREE.Mesh(geometry, this.defaultMaterial.clone());
    
    // Position at printer coordinate origin (0,0,0)
    // X,Z = 0,0 (center of build plate)
    // Y = this.buildPlateY (build surface level)
    mesh.position.set(0, this.buildPlateY, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Generate unique ID
    const modelId = `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    mesh.userData = { modelId, modelInfo };

    // Store model
    const loadedModel: LoadedModel = {
      mesh,
      info: modelInfo,
      originalPosition: mesh.position.clone(),
      originalScale: mesh.scale.clone()
    };

    this.loadedModels.set(modelId, loadedModel);
    this.scene.add(mesh);

    // Trigger callback
    if (this.onModelLoadCallback) {
      this.onModelLoadCallback(loadedModel);
    }

    return modelId;
  }

  // ================== UI UPDATE METHODS ==================

  /**
   * Update the models list in the UI
   */
  private updateModelsList(): void {
    if (!this.modelListContainer) return;

    if (this.loadedModels.size === 0) {
      this.modelListContainer.innerHTML = '<div class="no-models">No models loaded</div>';
      return;
    }

    let html = '';
    this.loadedModels.forEach((model, modelId) => {
      const isSelected = this.selectedModel === modelId;
      html += `
        <div class="model-item ${isSelected ? 'selected' : ''}" data-model-id="${modelId}">
          <div class="model-info">
            <div class="model-name">${model.info.name}</div>
            <div class="model-details">
              ${model.info.triangles ? `${model.info.triangles.toLocaleString()} triangles` : ''}
              ${model.info.size ? ` • ${(model.info.size / 1024).toFixed(1)} KB` : ''}
            </div>
          </div>
          <div class="model-actions">
            <button class="btn-small select-btn" onclick="window.stlModelManager?.selectModel('${modelId}')">
              ${isSelected ? 'Selected' : 'Select'}
            </button>
            <button class="btn-small remove-btn" onclick="window.stlModelManager?.unloadModel('${modelId}')">Remove</button>
          </div>
        </div>
      `;
    });

    this.modelListContainer.innerHTML = html;
  }

  /**
   * Update statistics display
   */
  private updateStatistics(): void {
    const modelsCount = document.getElementById('models-count');
    const totalTriangles = document.getElementById('total-triangles');
    const selectedModelSpan = document.getElementById('selected-model');

    if (modelsCount) {
      modelsCount.textContent = this.loadedModels.size.toString();
    }

    if (totalTriangles) {
      const total = Array.from(this.loadedModels.values())
        .reduce((sum, model) => sum + (model.info.triangles || 0), 0);
      totalTriangles.textContent = total.toLocaleString();
    }

    if (selectedModelSpan) {
      if (this.selectedModel) {
        const model = this.loadedModels.get(this.selectedModel);
        selectedModelSpan.textContent = model ? model.info.name : 'None';
      } else {
        selectedModelSpan.textContent = 'None';
      }
    }
  }

  /**
   * Make this manager globally accessible for UI callbacks
   */
  public makeGloballyAccessible(): void {
    (window as any).stlModelManager = this;
  }
}
