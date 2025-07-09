/**
 * 渲染质量管理器
 * 统一管理Three.js渲染质量、抗抖动和性能优化
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import * as THREE from 'three';
import { globalMaterialOptimizer } from './materialOptimizer';
import { globalPerformanceMonitor } from './performanceMonitor';

export interface QualitySettings {
  // 渲染质量等级
  qualityLevel: 'low' | 'medium' | 'high' | 'ultra';
  
  // 抗锯齿设置
  antialiasing: {
    enabled: boolean;
    type: 'msaa' | 'fxaa' | 'smaa' | 'taa';
    samples: number;
  };
  
  // 阴影设置
  shadows: {
    enabled: boolean;
    type: THREE.ShadowMapType;
    resolution: number;
    cascade: boolean;
  };
  
  // 后处理效果
  postProcessing: {
    bloom: boolean;
    ssao: boolean;
    ssr: boolean;
    motionBlur: boolean;
  };
  
  // 性能优化
  performance: {
    pixelRatio: number;
    targetFPS: number;
    enableLOD: boolean;
    enableFrustumCulling: boolean;
    enableOcclusion: boolean;
    maxDrawCalls: number;
  };
  
  // 抗抖动设置
  stabilization: {
    enabled: boolean;
    strength: number;
    smoothingFactor: number;
    adaptiveQuality: boolean;
  };
}

export class RenderQualityManager {
  private currentSettings: QualitySettings;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;
  
  // 性能监控
  private performanceHistory: number[] = [];
  private frameTimeHistory: number[] = [];
  private lastQualityAdjustment = 0;
  
  // 预设配置
  private static readonly QUALITY_PRESETS: Record<string, QualitySettings> = {
    low: {
      qualityLevel: 'low',
      antialiasing: {
        enabled: false,
        type: 'fxaa',
        samples: 1
      },
      shadows: {
        enabled: false,
        type: THREE.BasicShadowMap,
        resolution: 512,
        cascade: false
      },
      postProcessing: {
        bloom: false,
        ssao: false,
        ssr: false,
        motionBlur: false
      },
      performance: {
        pixelRatio: 1,
        targetFPS: 30,
        enableLOD: true,
        enableFrustumCulling: true,
        enableOcclusion: false,
        maxDrawCalls: 500
      },
      stabilization: {
        enabled: true,
        strength: 0.9,
        smoothingFactor: 0.2,
        adaptiveQuality: true
      }
    },
    
    medium: {
      qualityLevel: 'medium',
      antialiasing: {
        enabled: true,
        type: 'fxaa',
        samples: 2
      },
      shadows: {
        enabled: true,
        type: THREE.PCFShadowMap,
        resolution: 1024,
        cascade: false
      },
      postProcessing: {
        bloom: false,
        ssao: false,
        ssr: false,
        motionBlur: false
      },
      performance: {
        pixelRatio: Math.min(window.devicePixelRatio, 1.5),
        targetFPS: 45,
        enableLOD: true,
        enableFrustumCulling: true,
        enableOcclusion: false,
        maxDrawCalls: 750
      },
      stabilization: {
        enabled: true,
        strength: 0.8,
        smoothingFactor: 0.15,
        adaptiveQuality: true
      }
    },
    
    high: {
      qualityLevel: 'high',
      antialiasing: {
        enabled: true,
        type: 'msaa',
        samples: 4
      },
      shadows: {
        enabled: true,
        type: THREE.PCFSoftShadowMap,
        resolution: 2048,
        cascade: false
      },
      postProcessing: {
        bloom: false,
        ssao: true,
        ssr: false,
        motionBlur: false
      },
      performance: {
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        targetFPS: 60,
        enableLOD: false,
        enableFrustumCulling: true,
        enableOcclusion: true,
        maxDrawCalls: 1000
      },
      stabilization: {
        enabled: true,
        strength: 0.7,
        smoothingFactor: 0.1,
        adaptiveQuality: true
      }
    },
    
    ultra: {
      qualityLevel: 'ultra',
      antialiasing: {
        enabled: true,
        type: 'taa',
        samples: 8
      },
      shadows: {
        enabled: true,
        type: THREE.PCFSoftShadowMap,
        resolution: 4096,
        cascade: true
      },
      postProcessing: {
        bloom: true,
        ssao: true,
        ssr: true,
        motionBlur: true
      },
      performance: {
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        targetFPS: 60,
        enableLOD: false,
        enableFrustumCulling: true,
        enableOcclusion: true,
        maxDrawCalls: 2000
      },
      stabilization: {
        enabled: true,
        strength: 0.6,
        smoothingFactor: 0.08,
        adaptiveQuality: true
      }
    }
  };
  
  constructor(initialQuality: keyof typeof RenderQualityManager.QUALITY_PRESETS = 'high') {
    this.currentSettings = { ...RenderQualityManager.QUALITY_PRESETS[initialQuality] };
    console.log(`🎨 渲染质量管理器初始化: ${initialQuality} 质量`);
  }
  
  /**
   * 设置渲染器
   */
  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    this.applyRendererSettings();
  }
  
  /**
   * 设置场景
   */
  setScene(scene: THREE.Scene): void {
    this.scene = scene;
    this.applySceneSettings();
  }
  
  /**
   * 设置相机
   */
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
    this.applyCameraSettings();
  }
  
  /**
   * 应用渲染器设置
   */
  private applyRendererSettings(): void {
    if (!this.renderer) return;
    
    const settings = this.currentSettings;
    
    // 设置像素比
    this.renderer.setPixelRatio(settings.performance.pixelRatio);
    
    // 设置抗锯齿
    if (settings.antialiasing.enabled) {
      // 注意：WebGL渲染器的抗锯齿需要在创建时设置
      console.log(`🔧 抗锯齿设置: ${settings.antialiasing.type}, 采样数: ${settings.antialiasing.samples}`);
    }
    
    // 设置阴影
    this.renderer.shadowMap.enabled = settings.shadows.enabled;
    if (settings.shadows.enabled) {
      this.renderer.shadowMap.type = settings.shadows.type;
      this.renderer.shadowMap.autoUpdate = false; // 手动控制更新
    }
    
    // 设置色调映射
    this.renderer.toneMapping = settings.qualityLevel === 'ultra' ? 
      THREE.ACESFilmicToneMapping : THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // 设置输出颜色空间
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    console.log(`🖥️ 渲染器设置已应用: 质量=${settings.qualityLevel}`);
  }
  
  /**
   * 应用场景设置
   */
  private applySceneSettings(): void {
    if (!this.scene) return;
    
    const settings = this.currentSettings;
    
    // 优化材质
    globalMaterialOptimizer.optimizeSceneMaterials(this.scene, settings.qualityLevel);
    
    // 设置雾效（低质量时禁用）
    if (settings.qualityLevel === 'low') {
      this.scene.fog = null;
    }
    
    console.log(`🌟 场景设置已应用: 质量=${settings.qualityLevel}`);
  }
  
  /**
   * 应用相机设置
   */
  private applyCameraSettings(): void {
    if (!this.camera) return;
    
    // 这里可以根据质量设置调整相机参数
    console.log(`📷 相机设置已应用`);
  }
  
  /**
   * 切换质量预设
   */
  setQualityPreset(preset: keyof typeof RenderQualityManager.QUALITY_PRESETS): void {
    this.currentSettings = { ...RenderQualityManager.QUALITY_PRESETS[preset] };
    this.applyAllSettings();
    console.log(`🎯 质量预设已切换: ${preset}`);
  }
  
  /**
   * 应用所有设置
   */
  private applyAllSettings(): void {
    this.applyRendererSettings();
    this.applySceneSettings();
    this.applyCameraSettings();
  }
  
  /**
   * 自适应质量调整
   */
  adaptiveQualityAdjustment(): void {
    if (!this.currentSettings.stabilization.adaptiveQuality) return;
    
    const now = performance.now();
    if (now - this.lastQualityAdjustment < 2000) return; // 2秒内不重复调整
    
    const stats = globalPerformanceMonitor.getMetrics();
    const currentFPS = stats.fps;
    const targetFPS = this.currentSettings.performance.targetFPS;
    
    // 记录性能历史
    this.performanceHistory.push(currentFPS);
    this.frameTimeHistory.push(stats.frameTime);
    
    // 保持最近60帧的记录
    if (this.performanceHistory.length > 60) {
      this.performanceHistory.shift();
      this.frameTimeHistory.shift();
    }
    
    // 计算平均性能
    const avgFPS = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;
    
    // 性能调整逻辑
    if (avgFPS < targetFPS * 0.8) {
      this.downgradeQuality();
    } else if (avgFPS > targetFPS * 1.2) {
      this.upgradeQuality();
    }
    
    this.lastQualityAdjustment = now;
  }
  
  /**
   * 降低质量
   */
  private downgradeQuality(): void {
    const currentLevel = this.currentSettings.qualityLevel;
    
    switch (currentLevel) {
      case 'ultra':
        this.setQualityPreset('high');
        break;
      case 'high':
        this.setQualityPreset('medium');
        break;
      case 'medium':
        this.setQualityPreset('low');
        break;
      case 'low':
        // 已经是最低质量，进一步优化
        this.applyEmergencyOptimizations();
        break;
    }
    
    console.log(`⬇️ 质量已降低: ${currentLevel} -> ${this.currentSettings.qualityLevel}`);
  }
  
  /**
   * 提高质量
   */
  private upgradeQuality(): void {
    const currentLevel = this.currentSettings.qualityLevel;
    
    switch (currentLevel) {
      case 'low':
        this.setQualityPreset('medium');
        break;
      case 'medium':
        this.setQualityPreset('high');
        break;
      case 'high':
        this.setQualityPreset('ultra');
        break;
      case 'ultra':
        // 已经是最高质量
        break;
    }
    
    console.log(`⬆️ 质量已提高: ${currentLevel} -> ${this.currentSettings.qualityLevel}`);
  }
  
  /**
   * 应用紧急优化
   */
  private applyEmergencyOptimizations(): void {
    if (!this.renderer || !this.scene) return;
    
    // 进一步降低像素比
    this.renderer.setPixelRatio(0.5);
    
    // 禁用所有高级特性
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.NoToneMapping;
    
    // 简化所有材质
    globalMaterialOptimizer.optimizeSceneMaterials(this.scene, 'low');
    
    console.log('🚨 紧急优化已应用');
  }
  
  /**
   * 手动设置抗抖动强度
   */
  setStabilizationStrength(strength: number): void {
    this.currentSettings.stabilization.strength = Math.max(0, Math.min(1, strength));
    console.log(`🔧 抗抖动强度设置: ${this.currentSettings.stabilization.strength}`);
  }
  
  /**
   * 手动设置平滑因子
   */
  setSmoothingFactor(factor: number): void {
    this.currentSettings.stabilization.smoothingFactor = Math.max(0.01, Math.min(1, factor));
    console.log(`🔧 平滑因子设置: ${this.currentSettings.stabilization.smoothingFactor}`);
  }
  
  /**
   * 获取当前设置
   */
  getCurrentSettings(): QualitySettings {
    return { ...this.currentSettings };
  }
  
  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    currentFPS: number;
    avgFPS: number;
    targetFPS: number;
    qualityLevel: string;
    stabilizationEnabled: boolean;
  } {
    const avgFPS = this.performanceHistory.length > 0 ? 
      this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length : 0;
    
    return {
      currentFPS: globalPerformanceMonitor.getMetrics().fps,
      avgFPS,
      targetFPS: this.currentSettings.performance.targetFPS,
      qualityLevel: this.currentSettings.qualityLevel,
      stabilizationEnabled: this.currentSettings.stabilization.enabled
    };
  }
  
  /**
   * 重置性能历史
   */
  resetPerformanceHistory(): void {
    this.performanceHistory = [];
    this.frameTimeHistory = [];
    console.log('🔄 性能历史已重置');
  }
  
  /**
   * 获取推荐质量设置
   */
  getRecommendedQuality(): keyof typeof RenderQualityManager.QUALITY_PRESETS {
    // 基于设备性能推荐质量等级
    const devicePixelRatio = window.devicePixelRatio;
    const userAgent = navigator.userAgent;
    
    // 检测设备类型
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isLowEndDevice = devicePixelRatio < 2;
    
    if (isMobile || isLowEndDevice) {
      return 'low';
    } else if (devicePixelRatio >= 2) {
      return 'high';
    } else {
      return 'medium';
    }
  }
  
  /**
   * 应用推荐设置
   */
  applyRecommendedSettings(): void {
    const recommended = this.getRecommendedQuality();
    this.setQualityPreset(recommended);
    console.log(`🎯 已应用推荐质量设置: ${recommended}`);
  }
}

// 全局渲染质量管理器实例
export const globalRenderQualityManager = new RenderQualityManager();

// 自动应用推荐设置
globalRenderQualityManager.applyRecommendedSettings(); 