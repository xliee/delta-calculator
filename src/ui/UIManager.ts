import { EffectorPreviewManager } from '../effectors/EffectorPreviewManager.js';
import { StatsManager } from './StatsManager.js';
import { EFFECTOR_CONFIGURATIONS } from '../constants.js';
import type { DeltaRobotConfig, EffectorConfig, EffectorConfigExtended, EffectorType, BuildVolumeConfig, ConstraintType } from '../types.js';

/**
 * Manages the user interface interactions and updates
 */
export class UIManager {
  private effectorPreviewManager: EffectorPreviewManager;
  private statsManager: StatsManager;
  private onConfigurationChange?: (config: DeltaRobotConfig, buildVolumeConfig: BuildVolumeConfig) => void;

  constructor() {
    this.effectorPreviewManager = new EffectorPreviewManager();
    this.statsManager = new StatsManager();
    this.initializeUI();
  }

  /**
   * Set callback for configuration changes
   */
  public setConfigurationChangeCallback(callback: (config: DeltaRobotConfig, buildVolumeConfig: BuildVolumeConfig) => void): void {
    this.onConfigurationChange = callback;
  }

  /**
   * Initialize UI event handlers and setup
   */
  private initializeUI(): void {
    this.initializeCollapsibleSections();
    this.initializeEffectorControls();
    this.initializeConstraintControls();
    this.initializeFloatingStats();
    this.initializeTooltips();
  }

  /**
   * Initialize collapsible section functionality
   */
  private initializeCollapsibleSections(): void {
    // Set initial states for sections
    const sectionsConfig = {
      'actions-section': false,   // expanded by default
      'frame-geometry-section': true, // collapsed by default
      'rod-config-section': true, // collapsed by default
      'carriage-arms-section': true, // collapsed by default
      'effector-config-section': true, // collapsed by default
      'build-plate-section': true, // collapsed by default
      'presets-section': true     // collapsed by default
    };

    // Apply initial states
    Object.entries(sectionsConfig).forEach(([sectionId, collapsed]) => {
      const section = document.getElementById(sectionId);
      if (section && collapsed) {
        section.classList.add('collapsed');
      }
    });

    // Add click handlers for section headers
    const headers = document.querySelectorAll('.section-header');
    headers.forEach(header => {
      if (!header.hasAttribute('onclick')) {
        header.addEventListener('click', (event) => {
          const section = (event.currentTarget as HTMLElement).closest('.section');
          if (section) {
            section.classList.toggle('collapsed');
          }
        });
      }
    });
  }

  /**
   * Initialize effector control handlers
   */
  private initializeEffectorControls(): void {
    const effectorTypeSelect = document.getElementById('effector-type') as HTMLSelectElement;

    if (effectorTypeSelect) {
      // Populate effector options with descriptions
      effectorTypeSelect.innerHTML = '';
      Object.entries(EFFECTOR_CONFIGURATIONS).forEach(([key, config]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = config.name;
        effectorTypeSelect.appendChild(option);
      });

      // Handle effector type changes
      effectorTypeSelect.addEventListener('change', () => {
        this.handleEffectorTypeChange(effectorTypeSelect.value);
      });

      // Set initial effector configuration
      this.handleEffectorTypeChange(effectorTypeSelect.value);
    }

    // Handle effector parameter changes
    this.initializeEffectorParameterHandlers();
  }

  /**
   * Handle effector type selection changes
   */
  private handleEffectorTypeChange(effectorType: string): void {
    const config = EFFECTOR_CONFIGURATIONS[effectorType as EffectorType];
    if (config) {
      this.updateEffectorControls(config);
      this.effectorPreviewManager.updatePreview(effectorType as EffectorType);
      this.triggerConfigurationUpdate();
    }
  }

  /**
   * Update effector controls based on configuration
   */
  private updateEffectorControls(config: EffectorConfigExtended): void {
    const radiusSlider = document.getElementById('effector-radius-slider') as HTMLInputElement;
    const radiusInput = document.getElementById('effector-radius-input') as HTMLInputElement;
    const spacingSlider = document.getElementById('eff-spacing-slider') as HTMLInputElement;
    const spacingInput = document.getElementById('eff-spacing-input') as HTMLInputElement;

    if (radiusSlider) {
      radiusSlider.value = config.radius.toString();
    }
    if (radiusInput) {
      radiusInput.value = config.radius.toString();
    }

    if (spacingSlider) {
      spacingSlider.value = config.spacing.toString();
    }
    if (spacingInput) {
      spacingInput.value = config.spacing.toString();
    }

    // Update tooltips with configuration-specific information
    this.updateEffectorTooltips(config);
  }

  /**
   * Initialize parameter change handlers for effector controls
   */
  private initializeEffectorParameterHandlers(): void {
    const controls = [
      { slider: 'effector-radius', value: 'effector-radius-value', unit: 'mm' },
      { slider: 'rod-spacing', value: 'rod-spacing-value', unit: 'mm' }
    ];

    controls.forEach(control => {
      const slider = document.getElementById(control.slider) as HTMLInputElement;
      const valueSpan = document.getElementById(control.value) as HTMLSpanElement;

      if (slider && valueSpan) {
        slider.addEventListener('input', () => {
          valueSpan.textContent = `${slider.value} ${control.unit}`;

          // Update preview with current values
          const currentConfig = this.getCurrentEffectorConfig();
          this.effectorPreviewManager.updatePreviewWithConfig(currentConfig);

          this.triggerConfigurationUpdate();
        });
      }
    });
  }

  /**
   * Update tooltips with configuration-specific information
   */
  private updateEffectorTooltips(_config: EffectorConfigExtended): void {
    // Add configuration-specific tooltip information if needed
    // For now, tooltips are static in HTML
  }

  /**
   * Initialize floating stats panel
   */
  private initializeFloatingStats(): void {
    // The StatsManager handles its own initialization
    // Remove old floating stats if they exist
    const oldStats = document.getElementById('floating-stats');
    if (oldStats) {
      oldStats.remove();
    }
  }

  /**
   * Initialize tooltip functionality
   */
  private initializeTooltips(): void {
    // Tooltips are handled by CSS
    // Any dynamic tooltip updates would go here
  }

  /**
   * Trigger configuration update
   */
  private triggerConfigurationUpdate(): void {
    if (this.onConfigurationChange) {
      const config = this.getCurrentConfiguration();
      const buildVolumeConfig = this.getCurrentBuildVolumeConfig();
      this.onConfigurationChange(config, buildVolumeConfig);
    }
  }

  /**
   * Get current configuration from UI controls
   */
  private getCurrentConfiguration(): DeltaRobotConfig {
    // Read actual values from UI controls
    const getValue = (id: string, defaultValue: number): number => {
      const element = document.getElementById(id) as HTMLInputElement;
      return element ? parseFloat(element.value) || defaultValue : defaultValue;
    };

    return {
      rod_radius: getValue('rod-radius-slider', 4),
      bot_radius: getValue('bot-radius-slider', 240),
      bot_height: getValue('bot-height-slider', 700),
      rod_spacing: getValue('rod-spacing-slider', 30),
      arm_length: getValue('diagonal-rod-slider', 240),
      carriage_inset: getValue('carriage-inset-slider', 25),
      carriage_height: getValue('carriage-height-slider', 30),
      carriage_offset: getValue('carriage-offset-slider', 0),
      arm_radius: getValue('arm-radius-slider', 2.5),
      diagonal_rod_length: getValue('diagonal-rod-slider', 240),
      tower_offset: getValue('tower-offset-slider', 25),
      effector_radius: getValue('effector-radius-slider', 40),
      eff_spacing: getValue('eff-spacing-slider', 30)
    };
  }

  /**
   * Get current effector configuration from UI controls
   */
  private getCurrentEffectorConfig(): EffectorConfig {
    const getValue = (id: string, defaultValue: number): number => {
      const element = document.getElementById(id) as HTMLInputElement;
      return element ? parseFloat(element.value) || defaultValue : defaultValue;
    };

    return {
      radius: getValue('effector-radius-slider', 40),
      spacing: getValue('rod-spacing-slider', 30),
      stl: 'default' // This would be determined by the effector type
    };
  }

  /**
   * Get current build volume configuration from UI controls
   */
  public getCurrentBuildVolumeConfig(): BuildVolumeConfig {
    // Get constraint type from radio buttons
    const constraintRadio = document.querySelector('input[name="bp-constraint"]:checked') as HTMLInputElement;
    const constraintType = (constraintRadio?.value as ConstraintType) || 'effector-edge';

    // Get physical bed radius
    const physicalBedSlider = document.getElementById('physical-bed-radius-slider') as HTMLInputElement;
    const physicalBedRadius = physicalBedSlider ? parseFloat(physicalBedSlider.value) || 120 : 120;

    // Get show physical bed checkbox
    const showPhysicalBedCheckbox = document.getElementById('show-physical-bed') as HTMLInputElement;
    const showPhysicalBed = showPhysicalBedCheckbox ? showPhysicalBedCheckbox.checked : true;

    return {
      physical_bed_radius: physicalBedRadius,
      show_physical_bed: showPhysicalBed,
      constraint_type: constraintType,
      max_print_radius: 100, // Will be calculated
      recommended_print_radius: 80, // Will be calculated
      build_volume_height: 250 // Will be calculated
    };
  }

  /**
   * Get the stats manager instance
   */
  public getStatsManager(): StatsManager {
    return this.statsManager;
  }

  /**
   * Reset UI to default state
   */
  public resetToDefaults(): void {
    // Reset all controls to default values
    const effectorTypeSelect = document.getElementById('effector-type') as HTMLSelectElement;
    if (effectorTypeSelect) {
      effectorTypeSelect.value = 'standard';
      this.handleEffectorTypeChange('standard');
    }

    // Reset other controls...
    this.triggerConfigurationUpdate();
  }

  /**
   * Initialize build plate constraint controls
   */
  private initializeConstraintControls(): void {
    // Handle constraint type radio buttons
    const constraintRadios = document.querySelectorAll('input[name="bp-constraint"]') as NodeListOf<HTMLInputElement>;
    constraintRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          this.updateConstraintDisplay();
          this.triggerConfigurationUpdate();
        }
      });
    });

    // Handle physical bed radius changes
    const physicalBedSlider = document.getElementById('physical-bed-radius-slider') as HTMLInputElement;
    const physicalBedInput = document.getElementById('physical-bed-radius-input') as HTMLInputElement;

    if (physicalBedSlider && physicalBedInput) {
      [physicalBedSlider, physicalBedInput].forEach(element => {
        element.addEventListener('input', () => {
          const value = element.value;
          physicalBedSlider.value = value;
          physicalBedInput.value = value;
          const physicalBedDisplay = document.getElementById('physical-bed-radius');
          if (physicalBedDisplay) {
            physicalBedDisplay.textContent = `${value}mm`;
          }
          this.updateConstraintDisplay();
          this.triggerConfigurationUpdate();
        });
      });
    }

    // Handle show physical bed checkbox
    const showPhysicalBedCheckbox = document.getElementById('show-physical-bed') as HTMLInputElement;
    if (showPhysicalBedCheckbox) {
      showPhysicalBedCheckbox.addEventListener('change', () => {
        this.triggerConfigurationUpdate();
      });
    }

    // Initial constraint display update
    this.updateConstraintDisplay();
  }

  /**
   * Update constraint analysis display
   */
  private updateConstraintDisplay(): void {
    // This will be called by external code with actual calculation results
    // For now, just update the physical bed radius display
    const physicalBedSlider = document.getElementById('physical-bed-radius-slider') as HTMLInputElement;
    if (physicalBedSlider) {
      const value = physicalBedSlider.value;
      const physicalBedElement = document.getElementById('physical-bed-radius');
      if (physicalBedElement) {
        physicalBedElement.textContent = `${value}mm`;
      }
    }
  }

  /**
   * Update constraint display with calculation results
   */
  public updateConstraintAnalysis(analysis: {
    realRadius: number;
    clearance: number;
    constraintDescription: string;
  }): void {
    const printableRadiusElement = document.getElementById('calculated-printable-radius');
    const clearanceElement = document.getElementById('constraint-clearance');
    const activeConstraintElement = document.getElementById('active-constraint');

    if (printableRadiusElement) {
      printableRadiusElement.textContent = `${analysis.realRadius.toFixed(1)}mm`;
    }
    if (clearanceElement) {
      clearanceElement.textContent = `${analysis.clearance.toFixed(1)}mm`;
    }
    if (activeConstraintElement) {
      activeConstraintElement.textContent = analysis.constraintDescription;
    }
  }
}

// Global function for section toggling (called from HTML onclick)
declare global {
  interface Window {
    toggleSection: (sectionId: string) => void;
  }
}

window.toggleSection = (sectionId: string): void => {
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.toggle('collapsed');
  }
};
