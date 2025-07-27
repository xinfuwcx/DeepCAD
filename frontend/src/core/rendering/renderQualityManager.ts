import * as THREE from 'three';
import { EnhancedRenderer } from './enhancedRenderer';

export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra';

export interface QualitySettings {
  pixelRatioLevel: 'low' | 'medium' | 'high';
  shadows: {
    enabled: boolean;
    type: THREE.ShadowMapType;
    mapSize: number; // e.g., 512, 1024, 2048, 4096
  };
  antialiasing: 'none' | 'fxaa' | 'smaa'; // Placeholder for post-processing AA
  postProcessing: {
    enabled: boolean;
    bloom: boolean;
    ssao: boolean;
  };
}

const qualityPresets: Record<QualityPreset, QualitySettings> = {
  low: {
    pixelRatioLevel: 'low',
    shadows: {
      enabled: true,
      type: THREE.BasicShadowMap,
      mapSize: 512,
    },
    antialiasing: 'none',
    postProcessing: {
      enabled: false,
      bloom: false,
      ssao: false,
    },
  },
  medium: {
    pixelRatioLevel: 'medium',
    shadows: {
      enabled: true,
      type: THREE.PCFShadowMap,
      mapSize: 1024,
    },
    antialiasing: 'fxaa', // placeholder
    postProcessing: {
      enabled: true,
      bloom: false,
      ssao: false,
    },
  },
  high: {
    pixelRatioLevel: 'high',
    shadows: {
      enabled: true,
      type: THREE.PCFSoftShadowMap,
      mapSize: 2048,
    },
    antialiasing: 'fxaa', // placeholder
    postProcessing: {
      enabled: true,
      bloom: true,
      ssao: false,
    },
  },
  ultra: {
    pixelRatioLevel: 'high',
    shadows: {
      enabled: true,
      type: THREE.PCFSoftShadowMap,
      mapSize: 4096,
    },
    antialiasing: 'smaa', // placeholder
    postProcessing: {
      enabled: true,
      bloom: true,
      ssao: true,
    },
  },
};

/**
 * Manages the rendering quality of the scene by adjusting various parameters
 * of the renderer, lights, and post-processing effects based on quality presets.
 */
export class RenderQualityManager {
  private renderer: EnhancedRenderer;
  private scene: THREE.Scene;
  private currentPreset: QualityPreset = 'high';
  public currentSettings: QualitySettings = qualityPresets.high;

  constructor(renderer: EnhancedRenderer, scene: THREE.Scene) {
    this.renderer = renderer;
    this.scene = scene;
  }

  /**
   * Applies a quality preset to the renderer and scene.
   * @param preset The quality preset to apply.
   */
  public setQualityPreset(preset: QualityPreset): void {
    if (this.currentPreset === preset) {
      return;
    }

    const settings = qualityPresets[preset];
    if (!settings) {
      console.warn(`RenderQualityManager: Preset "${preset}" not found.`);
      return;
    }

    this.currentPreset = preset;
    this.currentSettings = settings;

    console.log(`Applying quality preset: ${preset}`);

    // Apply renderer settings
    this.renderer.setAdaptivePixelRatio(settings.pixelRatioLevel);
    this.renderer.shadowMap.enabled = settings.shadows.enabled;
    this.renderer.shadowMap.type = settings.shadows.type;
    
    // Apply shadow map size to all lights in the scene
    this.scene.traverse((object) => {
      if (object instanceof THREE.Light && object.castShadow) {
        object.shadow.mapSize.set(settings.shadows.mapSize, settings.shadows.mapSize);
        // This is a heavy operation. For a real implementation, we might need
        // to dispose and recreate shadow maps, but for now this is sufficient.
        if (object.shadow.map) {
            object.shadow.map.dispose();
            object.shadow.map = null;
        }
      }
    });

    // 后处理和抗锯齿设置将通过EffectComposer实现
    // 当前版本使用渲染器的内置抗锯齿功能
    if (settings.antialiasing?.enabled) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
    console.log('✅ 渲染质量设置已应用');
  }

  public getCurrentPreset(): QualityPreset {
    return this.currentPreset;
  }
} 