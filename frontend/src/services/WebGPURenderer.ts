/**
 * Three.js WebGPU渲染器集成 - 2号几何专家高性能渲染
 * 为3D几何体提供GPU加速渲染支持
 */

import * as THREE from 'three';

// WebGPU渲染器接口定义
export interface WebGPURendererConfig {
  canvas: HTMLCanvasElement;
  powerPreference: 'low-power' | 'high-performance';
  antialias: boolean;
  alpha: boolean;
  enableShadows: boolean;
  shadowMapSize: number;
  toneMapping: THREE.ToneMapping;
  toneMappingExposure: number;
}

export interface RenderingMetrics {
  fps: number;
  frameTime: number;
  triangles: number;
  drawCalls: number;
  memoryUsage: number;
  gpuUtilization: number;
}

export class WebGPURenderer {
  private static instance: WebGPURenderer;
  private renderer: THREE.WebGPURenderer | null = null;
  private isInitialized = false;
  private renderingMetrics: RenderingMetrics = {
    fps: 0,
    frameTime: 0,
    triangles: 0,
    drawCalls: 0,
    memoryUsage: 0,
    gpuUtilization: 0
  };
  private frameCount = 0;
  private lastTime = 0;
  private metricsCallbacks: Array<(metrics: RenderingMetrics) => void> = [];

  private constructor() {}

  public static getInstance(): WebGPURenderer {
    if (!WebGPURenderer.instance) {
      WebGPURenderer.instance = new WebGPURenderer();
    }
    return WebGPURenderer.instance;
  }

  /**
   * 初始化WebGPU渲染器
   */
  public async initializeWebGPU(config: WebGPURendererConfig): Promise<boolean> {
    try {
      console.log('🚀 2号专家初始化WebGPU渲染器...');

      // 检查WebGPU支持
      if (!navigator.gpu) {
        console.warn('⚠️ WebGPU不受支持，将回退到WebGL');
        return this.fallbackToWebGL(config);
      }

      // 请求GPU适配器
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: config.powerPreference
      });

      if (!adapter) {
        console.warn('⚠️ 无法获取GPU适配器，回退到WebGL');
        return this.fallbackToWebGL(config);
      }

      // 检查WebGPU渲染器可用性
      const WebGPURenderer = (THREE as any).WebGPURenderer;
      if (!WebGPURenderer) {
        console.warn('⚠️ Three.js WebGPU渲染器不可用，回退到WebGL');
        return this.fallbackToWebGL(config);
      }

      // 创建WebGPU渲染器
      this.renderer = new WebGPURenderer({
        canvas: config.canvas,
        antialias: config.antialias,
        alpha: config.alpha,
        powerPreference: config.powerPreference
      });

      // 配置渲染器
      await this.configureRenderer(config);

      this.isInitialized = true;
      console.log('✅ WebGPU渲染器初始化成功');
      
      return true;

    } catch (error) {
      console.error('❌ WebGPU初始化失败:', error);
      return this.fallbackToWebGL(config);
    }
  }

  /**
   * 回退到WebGL渲染器
   */
  private async fallbackToWebGL(config: WebGPURendererConfig): Promise<boolean> {
    try {
      console.log('🔄 回退到WebGL渲染器...');

      this.renderer = new THREE.WebGLRenderer({
        canvas: config.canvas,
        antialias: config.antialias,
        alpha: config.alpha,
        powerPreference: config.powerPreference
      }) as any;

      await this.configureRenderer(config);

      this.isInitialized = true;
      console.log('✅ WebGL渲染器初始化成功');
      
      return true;

    } catch (error) {
      console.error('❌ WebGL渲染器初始化失败:', error);
      return false;
    }
  }

  /**
   * 配置渲染器参数
   */
  private async configureRenderer(config: WebGPURendererConfig): Promise<void> {
    if (!this.renderer) return;

    // 基础配置
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // 色调映射
    this.renderer.toneMapping = config.toneMapping;
    this.renderer.toneMappingExposure = config.toneMappingExposure;

    // 阴影配置
    if (config.enableShadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.shadowMap.autoUpdate = true;
    }

    // WebGPU特定配置
    if (this.renderer instanceof (THREE as any).WebGPURenderer) {
      // 启用高级WebGPU特性
      await this.enableAdvancedWebGPUFeatures();
    }

    console.log('⚙️ 渲染器配置完成');
  }

  /**
   * 启用高级WebGPU特性
   */
  private async enableAdvancedWebGPUFeatures(): Promise<void> {
    try {
      // 这里可以配置WebGPU特有的高级特性
      // 例如：计算着色器支持、高级纹理格式等
      console.log('🔧 启用WebGPU高级特性');
      
      // 示例：启用高级纹理压缩
      // await this.renderer.enableTextureCompression(['bc7', 'astc']);
      
      // 示例：启用GPU计算
      // this.renderer.enableCompute = true;
      
    } catch (error) {
      console.warn('⚠️ 部分WebGPU高级特性启用失败:', error);
    }
  }

  /**
   * 渲染场景 - 2号专家高性能渲染管线
   */
  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (!this.renderer || !this.isInitialized) {
      console.warn('⚠️ 渲染器未初始化');
      return;
    }

    const startTime = performance.now();

    try {
      // 执行渲染
      this.renderer.render(scene, camera);

      // 更新性能指标
      this.updateRenderingMetrics(startTime, scene);

    } catch (error) {
      console.error('❌ 渲染失败:', error);
    }
  }

  /**
   * 更新渲染性能指标
   */
  private updateRenderingMetrics(startTime: number, scene: THREE.Scene): void {
    const endTime = performance.now();
    const frameTime = endTime - startTime;
    
    this.frameCount++;
    
    // 每秒更新一次FPS
    if (endTime - this.lastTime >= 1000) {
      this.renderingMetrics.fps = Math.round((this.frameCount * 1000) / (endTime - this.lastTime));
      this.frameCount = 0;
      this.lastTime = endTime;
    }

    this.renderingMetrics.frameTime = frameTime;
    
    // 计算场景复杂度
    let triangles = 0;
    let drawCalls = 0;
    
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry) {
        const geometry = object.geometry;
        if (geometry.index) {
          triangles += geometry.index.count / 3;
        } else {
          triangles += geometry.attributes.position.count / 3;
        }
        drawCalls++;
      }
    });

    this.renderingMetrics.triangles = triangles;
    this.renderingMetrics.drawCalls = drawCalls;

    // 估算内存使用
    this.renderingMetrics.memoryUsage = this.estimateMemoryUsage();
    
    // 估算GPU利用率（基于帧时间）
    this.renderingMetrics.gpuUtilization = Math.min(100, (frameTime / 16.67) * 100); // 60fps基准

    // 通知监听器
    this.notifyMetricsUpdate();
  }

  /**
   * 估算内存使用量
   */
  private estimateMemoryUsage(): number {
    if (!this.renderer) return 0;
    
    const info = this.renderer.info;
    if (info && info.memory) {
      return info.memory.geometries + info.memory.textures;
    }
    
    // 简单估算
    return this.renderingMetrics.triangles * 0.1; // KB
  }

  /**
   * 设置渲染器尺寸
   */
  public setSize(width: number, height: number): void {
    if (this.renderer) {
      this.renderer.setSize(width, height);
    }
  }

  /**
   * 获取渲染器实例
   */
  public getRenderer(): THREE.WebGPURenderer | THREE.WebGLRenderer | null {
    return this.renderer;
  }

  /**
   * 获取渲染性能指标
   */
  public getRenderingMetrics(): RenderingMetrics {
    return { ...this.renderingMetrics };
  }

  /**
   * 监听性能指标更新
   */
  public onMetricsUpdate(callback: (metrics: RenderingMetrics) => void): void {
    this.metricsCallbacks.push(callback);
  }

  /**
   * 通知性能指标更新
   */
  private notifyMetricsUpdate(): void {
    this.metricsCallbacks.forEach(callback => {
      try {
        callback(this.getRenderingMetrics());
      } catch (error) {
        console.error('❌ 性能指标回调失败:', error);
      }
    });
  }

  /**
   * 检查WebGPU支持状态
   */
  public static async checkWebGPUSupport(): Promise<{
    supported: boolean;
    adapter?: GPUAdapter;
    features: string[];
    limits: Record<string, number>;
  }> {
    try {
      if (!navigator.gpu) {
        return {
          supported: false,
          features: [],
          limits: {}
        };
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return {
          supported: false,
          features: [],
          limits: {}
        };
      }

      return {
        supported: true,
        adapter,
        features: Array.from(adapter.features),
        limits: Object.fromEntries(
          Object.entries(adapter.limits).map(([key, value]) => [key, value as number])
        )
      };

    } catch (error) {
      console.error('WebGPU支持检查失败:', error);
      return {
        supported: false,
        features: [],
        limits: {}
      };
    }
  }

  /**
   * 优化渲染性能 - 2号专家性能调优
   */
  public optimizePerformance(targetFPS: number = 60): void {
    const currentFPS = this.renderingMetrics.fps;
    
    if (currentFPS < targetFPS * 0.8) {
      console.log('🔧 2号专家性能优化: 检测到性能不足，启用优化');
      
      // 降低渲染质量
      if (this.renderer) {
        this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
        
        // 禁用阴影（如果性能严重不足）
        if (currentFPS < targetFPS * 0.5) {
          this.renderer.shadowMap.enabled = false;
          console.log('⚡ 性能优化: 禁用阴影');
        }
      }
    } else if (currentFPS > targetFPS * 1.2) {
      console.log('✨ 2号专家性能优化: 性能充足，提升渲染质量');
      
      // 提升渲染质量
      if (this.renderer) {
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
        this.renderer.shadowMap.enabled = true;
      }
    }
  }

  /**
   * 销毁渲染器
   */
  public dispose(): void {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    
    this.isInitialized = false;
    this.metricsCallbacks = [];
    
    console.log('🗑️ WebGPU渲染器已销毁');
  }
}

// 导出单例实例
export const webGPURenderer = WebGPURenderer.getInstance();
export default webGPURenderer;