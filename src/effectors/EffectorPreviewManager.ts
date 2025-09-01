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
import type { EffectorConfigExtended, EffectorType } from '../types.js';
import { EFFECTOR_CONFIGURATIONS } from '../constants.js';

/**
 * Manages effector preview system with visual previews for each configuration
 */
export class EffectorPreviewManager {
  private previewContainer: HTMLElement | null = null;
  private currentPreview: string | null = null;

  constructor() {
    this.initializePreviewContainer();
  }

  /**
   * Initialize the preview container
   */
  private initializePreviewContainer(): void {
    // Create preview container if it doesn't exist
    this.previewContainer = document.getElementById('effector-preview');
    if (!this.previewContainer) {
      this.createPreviewContainer();
    }
  }

  /**
   * Create the preview container in the effector section
   */
  private createPreviewContainer(): void {
    const effectorSection = document.getElementById('effector-config-section');
    if (!effectorSection) return;

    const previewDiv = document.createElement('div');
    previewDiv.id = 'effector-preview';
    previewDiv.className = 'effector-preview-container';
    previewDiv.innerHTML = `
      <div class="preview-header">
        <h4>Effector Preview</h4>
      </div>
      <div class="preview-content">
        <div class="preview-image">
          <img id="effector-preview-image" src="" alt="Effector Preview" style="display: none;">
        </div>
        <div class="preview-info">
          <div class="spec-item">
            <span class="spec-label">Type:</span>
            <span class="spec-value" id="preview-type">--</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Radius:</span>
            <span class="spec-value" id="preview-radius">--mm</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Spacing:</span>
            <span class="spec-value" id="preview-spacing">--mm</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Description:</span>
            <span class="spec-value" id="preview-description">--</span>
          </div>
        </div>
      </div>
    `;

    // Insert after the effector type selector
    const effectorTypeContainer = effectorSection.querySelector('.control-group');
    if (effectorTypeContainer) {
      effectorTypeContainer.insertAdjacentElement('afterend', previewDiv);
    }

    this.previewContainer = previewDiv;
    this.addPreviewStyles();
  }

  /**
   * Add CSS styles for the preview system
   */
  private addPreviewStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .effector-preview-container {
        margin: 15px 0;
        padding: 15px;
        border: 1px solid #ddd;
        border-radius: 8px;
        background: #f9f9f9;
      }

      .preview-header h4 {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 14px;
        font-weight: 600;
      }

      .preview-content {
        display: flex;
        gap: 15px;
        align-items: flex-start;
      }

      .preview-image {
        flex-shrink: 0;
        width: 80px;
        height: 80px;
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .preview-image img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      .preview-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .spec-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 3px 0;
        border-bottom: 1px solid #eee;
      }

      .spec-item:last-child {
        border-bottom: none;
      }

      .spec-label {
        font-weight: 500;
        color: #666;
        font-size: 12px;
      }

      .spec-value {
        font-weight: 600;
        color: #333;
        font-size: 12px;
      }

      .preview-placeholder {
        color: #999;
        font-style: italic;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        font-size: 11px;
        text-align: center;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Update preview based on effector type
   */
  public updatePreview(effectorType: EffectorType): void {
    if (!this.previewContainer) return;

    const config = EFFECTOR_CONFIGURATIONS[effectorType];
    if (!config) return;

    this.currentPreview = effectorType;
    this.updatePreviewInfo(effectorType, config);
    this.updatePreviewImage(effectorType, config);
  }

  /**
   * Update preview information display
   */
  private updatePreviewInfo(type: EffectorType, config: EffectorConfigExtended): void {
    const typeElement = document.getElementById('preview-type');
    const radiusElement = document.getElementById('preview-radius');
    const spacingElement = document.getElementById('preview-spacing');
    const descriptionElement = document.getElementById('preview-description');

    if (typeElement) {
      typeElement.textContent = config.name || 'Unknown';
    }

    if (radiusElement) {
      radiusElement.textContent = `${config.radius}mm`;
    }

    if (spacingElement) {
      spacingElement.textContent = `${config.spacing}mm`;
    }

    if (descriptionElement) {
      descriptionElement.textContent = config.description || 'No description available';
    }
  }

  /**
   * Update preview image
   */
  private updatePreviewImage(effectorType: EffectorType, config: EffectorConfigExtended): void {
    const imageElement = document.getElementById('effector-preview-image') as HTMLImageElement;
    const imageContainer = this.previewContainer?.querySelector('.preview-image');

    if (!imageElement || !imageContainer) return;

    // Clear existing content
    imageContainer.innerHTML = '';

    // Try to load effector-specific image
    const imagePath = config.previewImage ? `/images/${config.previewImage}` : null;

    if (imagePath) {
      const img = document.createElement('img');
      img.src = imagePath;
      img.alt = `${effectorType} Effector`;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.objectFit = 'contain';

      // Handle image load/error
      img.onload = () => {
        imageContainer.appendChild(img);
      };

      img.onerror = () => {
        this.showImagePlaceholder(imageContainer, effectorType);
      };
    } else {
      this.showImagePlaceholder(imageContainer, effectorType);
    }
  }

  /**
   * Show placeholder when image is not available
   */
  private showImagePlaceholder(container: Element, effectorType: EffectorType): void {
    const placeholder = document.createElement('div');
    placeholder.className = 'preview-placeholder';
    placeholder.textContent = `${effectorType.charAt(0).toUpperCase() + effectorType.slice(1)}\nEffector`;
    container.appendChild(placeholder);
  }

  /**
   * Update preview with custom configuration
   */
  public updatePreviewWithConfig(config: EffectorConfigExtended): void {
    if (!this.previewContainer) return;

    // Update the info without changing the type
    const radiusElement = document.getElementById('preview-radius');
    const spacingElement = document.getElementById('preview-spacing');

    if (radiusElement) {
      radiusElement.textContent = `${config.radius}mm`;
    }

    if (spacingElement) {
      spacingElement.textContent = `${config.spacing}mm`;
    }
  }

  /**
   * Hide the preview
   */
  public hidePreview(): void {
    if (this.previewContainer) {
      this.previewContainer.style.display = 'none';
    }
  }

  /**
   * Show the preview
   */
  public showPreview(): void {
    if (this.previewContainer) {
      this.previewContainer.style.display = 'block';
    }
  }

  /**
   * Get the current preview type
   */
  public getCurrentPreview(): string | null {
    return this.currentPreview;
  }

  /**
   * Create comparison view between effector types
   */
  public showComparison(types: EffectorType[]): void {
    if (types.length < 2) return;

    // This could be extended to show side-by-side comparison
    // For now, just cycle through the types
    let currentIndex = 0;
    const interval = setInterval(() => {
      this.updatePreview(types[currentIndex]);
      currentIndex = (currentIndex + 1) % types.length;

      if (currentIndex === 0) {
        clearInterval(interval);
      }
    }, 2000);
  }
}
