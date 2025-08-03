import { deltabotApp } from './src/deltacalc.js';
import { PRESET_CONFIGS, PRESET_CONFIGURATIONS, PARAMETER_LIMITS } from './src/constants.js';
import type { PresetConfig } from './src/types.js';
import type { ParameterConfig } from './src/types.js';

// Parameter control configuration using constants
const parameters: ParameterConfig[] = [
  { property: 'bot_radius', sliderId: 'bot-radius-slider', inputId: 'bot-radius-input', ...PARAMETER_LIMITS.bot_radius, updateMethod: 'setBotRadius' },
  { property: 'bot_height', sliderId: 'bot-height-slider', inputId: 'bot-height-input', ...PARAMETER_LIMITS.bot_height, updateMethod: 'setBotHeight' },
  { property: 'rod_spacing', sliderId: 'rod-spacing-slider', inputId: 'rod-spacing-input', ...PARAMETER_LIMITS.rod_spacing, updateMethod: 'setArmSpacing' },
  { property: 'rod_radius', sliderId: 'rod-radius-slider', inputId: 'rod-radius-input', ...PARAMETER_LIMITS.rod_radius },
  { property: 'carriage_inset', sliderId: 'carriage-inset-slider', inputId: 'carriage-inset-input', ...PARAMETER_LIMITS.carriage_inset },
  { property: 'carriage_height', sliderId: 'carriage-height-slider', inputId: 'carriage-height-input', ...PARAMETER_LIMITS.carriage_height },
  { property: 'carriage_offset', sliderId: 'carriage-offset-slider', inputId: 'carriage-offset-input', ...PARAMETER_LIMITS.carriage_offset, updateMethod: 'setCarriageOffset' },
  { property: 'arm_radius', sliderId: 'arm-radius-slider', inputId: 'arm-radius-input', ...PARAMETER_LIMITS.arm_radius },
  { property: 'effector_radius', sliderId: 'effector-radius-slider', inputId: 'effector-radius-input', ...PARAMETER_LIMITS.effector_radius },
  { property: 'eff_spacing', sliderId: 'eff-spacing-slider', inputId: 'eff-spacing-input', ...PARAMETER_LIMITS.eff_spacing },
  { property: 'diagonal_rod_length', sliderId: 'diagonal-rod-slider', inputId: 'diagonal-rod-input', ...PARAMETER_LIMITS.diagonal_rod_length },
  { property: 'tower_offset', sliderId: 'tower-offset-slider', inputId: 'tower-offset-input', ...PARAMETER_LIMITS.tower_offset }
];

// Preset configurations using constants
const presets = PRESET_CONFIGS;

function setupParameterControls(): void {
  parameters.forEach(param => {
    const slider = document.getElementById(param.sliderId) as HTMLInputElement;
    const input = document.getElementById(param.inputId) as HTMLInputElement;

    if (!slider || !input) return;

    // Set initial values
    const currentValue = deltabotApp[param.property] as number;
    slider.value = currentValue.toString();
    input.value = currentValue.toString();

    // Update function
    const updateValue = (value: number) => {
      const clampedValue = Math.max(param.min, Math.min(param.max, value));
      slider.value = clampedValue.toString();
      input.value = clampedValue.toString();

      if (param.updateMethod && typeof deltabotApp[param.updateMethod] === 'function') {
        (deltabotApp[param.updateMethod] as (value: number) => void)(clampedValue);
      } else {
        (deltabotApp[param.property] as number) = clampedValue;
        deltabotApp.rebuildScene();
      }
    };

    // Slider event
    slider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      updateValue(value);
    });

    // Input event with validation
    input.addEventListener('change', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      if (!Number.isNaN(value)) {
        updateValue(value);
      } else {
        // Reset to current value if invalid
        input.value = (deltabotApp[param.property] as number).toString();
      }
    });

    // Allow real-time typing in input
    input.addEventListener('blur', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      if (!Number.isNaN(value)) {
        updateValue(value);
      }
    });
  });

  // Setup effector type selector
  const effectorSelect = document.getElementById('effector-type') as HTMLSelectElement;
  if (effectorSelect) {
    effectorSelect.addEventListener('change', (e) => {
      const type = (e.target as HTMLSelectElement).value;
      deltabotApp.current_effector_type = type;
      if (type !== 'custom') {
        deltabotApp.applyEffectorConfig(type);
        // Update the UI controls to reflect the new values
        updateParameterInputs();
      }
    });
  }

  // Setup build plate constraint controls
  const constraintRadios = document.querySelectorAll('input[name="bp-constraint"]');
  constraintRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const value = (e.target as HTMLInputElement).value;
      deltabotApp.setConstraintType(value);
    });
  });

  // Setup physical bed controls
  const showPhysicalBedCheckbox = document.getElementById('show-physical-bed') as HTMLInputElement;
  if (showPhysicalBedCheckbox) {
    showPhysicalBedCheckbox.addEventListener('change', (e) => {
      deltabotApp.show_physical_bed = (e.target as HTMLInputElement).checked;
      deltabotApp.initBuildPlate();
    });
  }

  const physicalBedSlider = document.getElementById('physical-bed-radius-slider') as HTMLInputElement;
  const physicalBedInput = document.getElementById('physical-bed-radius-input') as HTMLInputElement;
  if (physicalBedSlider && physicalBedInput) {
    const updatePhysicalBed = (value: number) => {
      const clampedValue = Math.max(50, Math.min(200, value));
      physicalBedSlider.value = clampedValue.toString();
      physicalBedInput.value = clampedValue.toString();
      deltabotApp.physical_bed_radius = clampedValue;
      deltabotApp.calculateBuildVolume();
      deltabotApp.initBuildPlate();
    };

    physicalBedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      updatePhysicalBed(value);
    });

    physicalBedInput.addEventListener('change', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      if (!Number.isNaN(value)) {
        updatePhysicalBed(value);
      } else {
        physicalBedInput.value = deltabotApp.physical_bed_radius.toString();
      }
    });
  }
}

// Function to update UI inputs from current app values
function updateParameterInputs(): void {
  parameters.forEach(param => {
    const slider = document.getElementById(param.sliderId) as HTMLInputElement;
    const input = document.getElementById(param.inputId) as HTMLInputElement;

    if (slider && input) {
      const currentValue = deltabotApp[param.property] as number;
      slider.value = currentValue.toString();
      input.value = currentValue.toString();
    }
  });
}

function setupPresetButtons(): void {
  const presetContainer = document.querySelector('.preset-buttons');
  if (!presetContainer) return;

  // Clear existing buttons
  presetContainer.innerHTML = '';

  // Create buttons dynamically from preset configurations
  Object.entries(PRESET_CONFIGURATIONS).forEach(([key, config]) => {
    const button = document.createElement('button');
    button.className = 'btn preset-btn';
    button.setAttribute('data-preset', key);
    button.textContent = config.name;
    if (config.description) {
      button.title = config.description;
    }

    button.addEventListener('click', (e) => {
      const presetName = (e.target as HTMLElement).getAttribute('data-preset');
      if (presetName && presetName in presets) {
        loadPreset(presets[presetName as keyof typeof presets]);
      }
    });

    presetContainer.appendChild(button);
  });
}

function loadPreset(preset: PresetConfig): void {
  // Update deltabotApp properties
  Object.keys(preset).forEach(key => {
    if (key in deltabotApp) {
      (deltabotApp as unknown as Record<string, unknown>)[key] = preset[key as keyof PresetConfig];
    }
  });

  // Update UI controls
  parameters.forEach(param => {
    if (preset[param.property as keyof PresetConfig] !== undefined) {
      const slider = document.getElementById(param.sliderId) as HTMLInputElement;
      const input = document.getElementById(param.inputId) as HTMLInputElement;
      if (slider && input) {
        slider.value = preset[param.property as keyof PresetConfig].toString();
        input.value = preset[param.property as keyof PresetConfig].toString();
      }
    }
  });

  // Rebuild the scene
  deltabotApp.rebuildScene();
}

function setupActionButtons(): void {
  // Home button
  const homeButton = document.getElementById('home-effector');
  if (homeButton) {
    homeButton.addEventListener('click', () => {
      deltabotApp.homeEffector();
    });
  }

  // Randomize button
  const randomizeButton = document.getElementById('randomize');
  if (randomizeButton) {
    randomizeButton.addEventListener('click', () => {
      // Generate random values within reasonable ranges
      const randomPreset: PresetConfig = {
        bot_radius: Math.floor(Math.random() * 300 + 100),
        bot_height: Math.floor(Math.random() * 400 + 300),
        rod_spacing: Math.floor(Math.random() * 40 + 20),
        rod_radius: Math.floor(Math.random() * 6 + 3),
        carriage_inset: Math.floor(Math.random() * 30 + 15),
        carriage_height: Math.floor(Math.random() * 30 + 20),
        carriage_offset: Math.floor(Math.random() * 10),
        arm_length: Math.floor(Math.random() * 50 + 80),
        arm_radius: Math.floor(Math.random() * 4 + 2),
        effector_radius: Math.floor(Math.random() * 40 + 25),
        eff_spacing: Math.floor(Math.random() * 30 + 20),
        diagonal_rod_length: Math.floor(Math.random() * 150 + 200),
        tower_offset: Math.floor(Math.random() * 30 + 15)
      };
      loadPreset(randomPreset);
    });
  }

  // Reset view button
  const resetViewButton = document.getElementById('reset-view');
  if (resetViewButton) {
    resetViewButton.addEventListener('click', () => {
      deltabotApp.reorientCamera();
    });
  }
}

// Setup build plate constraint controls
function setupBuildPlateConstraints(): void {
  // Constraint type controls
  const constraintRadios = document.querySelectorAll('input[name="bp-constraint"]') as NodeListOf<HTMLInputElement>;
  constraintRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        // Update constraint type in deltabotApp
        deltabotApp.setConstraintType(target.value);
        deltabotApp.rebuildScene();
      }
    });
  });
}

// Initialize the deltabotApp when the DOM is ready
document.addEventListener('DOMContentLoaded', (): void => {
  deltabotApp.init();

  // Setup all the new controls
  setupParameterControls();
  setupPresetButtons();
  setupActionButtons();
  setupBuildPlateConstraints();

  // Load default preset
  loadPreset(presets['kossel-standard']);
});
