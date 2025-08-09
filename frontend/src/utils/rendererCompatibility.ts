/**
 * 渲染器兼容性检测和智能切换工具
 * 负责WebGPU/WebGL/Canvas2D的自动降级机制
 */

export interface RendererCapabilities {
  webgpu: boolean;
  webgl2: boolean;
  webgl1: boolean;
  canvas2d: boolean;
}

export interface PerformanceLevel {
  level: 'ultra' | 'high' | 'medium' | 'low';
  recommendedRenderer: 'webgpu' | 'webgl2' | 'webgl1' | 'canvas2d';
  maxVertices: number;
  enableShadows: boolean;
  enablePostProcessing: boolean;
}

/**
 * 检测浏览器渲染能力
 */
export async function detectRendererCapabilities(): Promise<RendererCapabilities> {
  const capabilities: RendererCapabilities = {
    webgpu: false,
    webgl2: false,
    webgl1: false,
    canvas2d: true // 总是支持
  };

  // 检测WebGPU支持
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      capabilities.webgpu = !!adapter;
    } catch {
      capabilities.webgpu = false;
    }
  }

  // 检测WebGL支持
  const canvas = document.createElement('canvas');
  
  // WebGL2
  try {
    const gl2 = canvas.getContext('webgl2');
    capabilities.webgl2 = !!gl2;
  } catch {
    capabilities.webgl2 = false;
  }

  // WebGL1
  try {
    const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    capabilities.webgl1 = !!gl1;
  } catch {
    capabilities.webgl1 = false;
  }

  canvas.remove();
  return capabilities;
}

/**
 * 根据设备性能推荐渲染器配置
 */
export function getRecommendedPerformanceLevel(capabilities: RendererCapabilities): PerformanceLevel {
  // 检测设备性能指标
  const deviceMemory = (navigator as any).deviceMemory || 4; // GB
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const connection = (navigator as any).connection;
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  // 性能评分
  let performanceScore = 0;
  
  if (capabilities.webgpu) performanceScore += 40;
  else if (capabilities.webgl2) performanceScore += 25;
  else if (capabilities.webgl1) performanceScore += 15;

  performanceScore += Math.min(deviceMemory * 5, 20);
  performanceScore += Math.min(hardwareConcurrency * 2, 8);
  
  if (isMobile) performanceScore -= 15;
  if (connection?.effectiveType === '4g') performanceScore += 5;
  if (connection?.effectiveType === '3g') performanceScore -= 10;

  // 根据评分推荐配置
  if (performanceScore >= 60 && capabilities.webgpu) {
    return {
      level: 'ultra',
      recommendedRenderer: 'webgpu',
      maxVertices: 2000000,
      enableShadows: true,
      enablePostProcessing: true
    };
  } else if (performanceScore >= 40 && capabilities.webgl2) {
    return {
      level: 'high',
      recommendedRenderer: 'webgl2',
      maxVertices: 1000000,
      enableShadows: true,
      enablePostProcessing: true
    };
  } else if (performanceScore >= 25 && capabilities.webgl1) {
    return {
      level: 'medium',
      recommendedRenderer: 'webgl1',
      maxVertices: 500000,
      enableShadows: false,
      enablePostProcessing: false
    };
  } else {
    return {
      level: 'low',
      recommendedRenderer: 'canvas2d',
      maxVertices: 10000,
      enableShadows: false,
      enablePostProcessing: false
    };
  }
}

/**
 * 智能渲染器切换管理器
 */
export class SmartRendererManager {
  private capabilities: RendererCapabilities | null = null;
  private currentRenderer: 'webgpu' | 'webgl2' | 'webgl1' | 'canvas2d' = 'webgl1';
  private performanceLevel: PerformanceLevel | null = null;
  private fallbackChain: Array<'webgpu' | 'webgl2' | 'webgl1' | 'canvas2d'> = [];

  /**
   * 初始化并检测最佳渲染器
   */
  async initialize(): Promise<void> {
    this.capabilities = await detectRendererCapabilities();
    this.performanceLevel = getRecommendedPerformanceLevel(this.capabilities);
    this.buildFallbackChain();
    
    console.log('🎮 渲染器兼容性检测结果:', this.capabilities);
    console.log('⚡ 推荐性能级别:', this.performanceLevel);
  }

  /**
   * 构建降级链
   */
  private buildFallbackChain(): void {
    this.fallbackChain = [];
    
    if (this.capabilities?.webgpu) this.fallbackChain.push('webgpu');
    if (this.capabilities?.webgl2) this.fallbackChain.push('webgl2');
    if (this.capabilities?.webgl1) this.fallbackChain.push('webgl1');
    this.fallbackChain.push('canvas2d');

    console.log('🔄 渲染器降级链:', this.fallbackChain);
  }

  /**
   * 获取推荐的渲染器类型
   */
  getRecommendedRenderer(): 'webgpu' | 'webgl2' | 'webgl1' | 'canvas2d' {
    return this.performanceLevel?.recommendedRenderer || 'webgl1';
  }

  /**
   * 尝试下一个降级渲染器
   */
  tryFallback(): 'webgpu' | 'webgl2' | 'webgl1' | 'canvas2d' | null {
    const currentIndex = this.fallbackChain.indexOf(this.currentRenderer);
    if (currentIndex < this.fallbackChain.length - 1) {
      this.currentRenderer = this.fallbackChain[currentIndex + 1];
      console.warn(`⚠️ 渲染器降级到: ${this.currentRenderer}`);
      return this.currentRenderer;
    }
    return null;
  }

  /**
   * 获取当前渲染器
   */
  getCurrentRenderer(): 'webgpu' | 'webgl2' | 'webgl1' | 'canvas2d' {
    return this.currentRenderer;
  }

  /**
   * 设置当前渲染器
   */
  setCurrentRenderer(renderer: 'webgpu' | 'webgl2' | 'webgl1' | 'canvas2d'): void {
    if (this.fallbackChain.includes(renderer)) {
      this.currentRenderer = renderer;
    } else {
      console.warn(`⚠️ 渲染器 ${renderer} 不受支持，保持当前设置`);
    }
  }

  /**
   * 获取性能级别配置
   */
  getPerformanceLevel(): PerformanceLevel | null {
    return this.performanceLevel;
  }

  /**
   * 获取渲染器能力
   */
  getCapabilities(): RendererCapabilities | null {
    return this.capabilities;
  }

  /**
   * 动态调整性能设置
   */
  adjustPerformanceForFramerate(fps: number): Partial<PerformanceLevel> {
    if (fps < 30) {
      // 性能不足，降级
      return {
        enableShadows: false,
        enablePostProcessing: false,
        maxVertices: Math.floor((this.performanceLevel?.maxVertices || 100000) * 0.6)
      };
    } else if (fps > 55 && this.currentRenderer !== 'webgpu') {
      // 性能充足，可以提升
      return {
        enableShadows: true,
        enablePostProcessing: this.capabilities?.webgl2 || this.capabilities?.webgpu,
        maxVertices: Math.floor((this.performanceLevel?.maxVertices || 100000) * 1.2)
      };
    }
    
    return {};
  }
}

// 全局实例
export const smartRendererManager = new SmartRendererManager();

/**
 * 简化的API - 获取最佳渲染器配置
 */
export async function getBestRendererConfig() {
  if (!smartRendererManager.getCapabilities()) {
    await smartRendererManager.initialize();
  }
  
  return {
    renderer: smartRendererManager.getRecommendedRenderer(),
    performance: smartRendererManager.getPerformanceLevel(),
    capabilities: smartRendererManager.getCapabilities()
  };
}