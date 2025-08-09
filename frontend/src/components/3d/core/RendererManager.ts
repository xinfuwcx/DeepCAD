import * as THREE from 'three';
import * as THREEWebGPU from 'three/webgpu';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { smartRendererManager, getBestRendererConfig } from '../../../utils/rendererCompatibility';
import { webgpuMaterialAdapter } from '../../../utils/webgpuMaterialAdapter';
import { WebGPUComputeShaderOptimizer } from '../../../services/webgpuComputeShaderOptimizer';
import { WebGPUPostProcessManager } from '../../../utils/webgpuPostProcessor';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface RenderSettings {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  antialias: boolean;
  shadows: boolean;
  ssao: boolean;
  bloom: boolean;
  adaptivePixelRatio: boolean;
  maxPixelRatio: number;
  toneMappingExposure: number;
  shadowMapSize: number;
  useWebGPU: boolean;
  fallbackToWebGL: boolean;
}

export interface RenderLayer {
  name: string;
  visible: boolean;
  opacity: number;
  objects: Set<THREE.Object3D>;
  renderOrder: number;
}

/**
 * 高级渲染器管理器
 * 负责WebGPU/WebGL渲染器配置、后期处理、性能监控和质量管理
 */
export class RendererManager {
  private renderer: THREEWebGPU.WebGPURenderer | THREE.WebGLRenderer;
  private composer: EffectComposer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  
  // 渲染器类型
  private rendererType: 'webgpu' | 'webgl' = 'webgl';
  private isWebGPUSupported: boolean = false;
  
  // WebGPU增强功能
  private computeShaderOptimizer?: WebGPUComputeShaderOptimizer;
  private webgpuDevice?: GPUDevice;
  private webgpuPostProcessor?: WebGPUPostProcessManager;
  
  // 后期处理通道
  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass;
  private ssaoPass: SSAOPass;
  private outputPass: OutputPass;
  
  // 性能监控
  private performanceStats: PerformanceMetrics;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private animationId: number = 0;
  
  // 渲染设置
  private settings: RenderSettings;
  private isRendering: boolean = false;
  
  // 事件回调
  private onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
  private onRenderComplete?: (frame: number) => void;
  
  // 自定义渲染循环
  private customRenderLoop?: (deltaTime: number) => void;

  constructor(
    canvas: HTMLCanvasElement,
    scene: THREE.Scene,
    camera: THREE.Camera,
    settings: Partial<RenderSettings> = {}
  ) {
    this.scene = scene;
    this.camera = camera;
    
    this.initializeAsync(canvas, settings);
  }

  /**
   * 异步初始化流程
   */
  private async initializeAsync(canvas: HTMLCanvasElement, settings: Partial<RenderSettings>) {
    try {
      // 获取最佳渲染器配置
      const bestConfig = await getBestRendererConfig();
      
      // 根据智能检测结果调整默认设置
      this.settings = {
        quality: bestConfig.performance?.level || 'high',
        antialias: true,
        shadows: bestConfig.performance?.enableShadows ?? true,
        ssao: false,
        bloom: false,
        adaptivePixelRatio: true,
        maxPixelRatio: 2.0,
        toneMappingExposure: 1.0,
        shadowMapSize: 2048,
        useWebGPU: bestConfig.renderer === 'webgpu',
        fallbackToWebGL: true,
        ...settings
      };

      console.log('🎯 智能渲染器配置:', {
        推荐渲染器: bestConfig.renderer,
        性能级别: bestConfig.performance?.level,
        WebGPU可用: bestConfig.capabilities?.webgpu
      });

      // 初始化渲染器
      await this.initializeRenderer(canvas);
      
      // 初始化后期处理
      this.initializePostProcessing();
      
      // 应用设置
      this.applySettings();
      
      // 初始化性能监控
      this.initializePerformanceMonitoring();
      
    } catch (error) {
      console.error('❌ 渲染器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 检查WebGPU支持
   */
  private async checkWebGPUSupport(): Promise<boolean> {
    if (!navigator.gpu || !this.settings.useWebGPU) {
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      return !!adapter;
    } catch {
      return false;
    }
  }

  /**
   * 初始化WebGPU/WebGL渲染器
   */
  private async initializeRenderer(canvas: HTMLCanvasElement): Promise<void> {
    // 检查WebGPU支持
    this.isWebGPUSupported = await this.checkWebGPUSupport();

    if (this.isWebGPUSupported) {
      try {
        await this.initializeWebGPURenderer(canvas);
        this.rendererType = 'webgpu';
        console.log('✅ WebGPU渲染器初始化成功');
        return;
      } catch (error) {
        console.warn('⚠️ WebGPU渲染器初始化失败，回退到WebGL:', error);
        if (!this.settings.fallbackToWebGL) {
          throw error;
        }
      }
    }

    // 回退到WebGL
    this.initializeWebGLRenderer(canvas);
    this.rendererType = 'webgl';
    console.log('✅ WebGL渲染器初始化成功');
  }

  /**
   * 初始化WebGPU渲染器
   */
  private async initializeWebGPURenderer(canvas: HTMLCanvasElement): Promise<void> {
    this.renderer = new THREEWebGPU.WebGPURenderer({
      canvas,
      antialias: this.settings.antialias,
      alpha: true,
      powerPreference: 'high-performance'
    });

    // 初始化WebGPU上下文
    await this.renderer.init();

    // 获取WebGPU设备
    this.webgpuDevice = (this.renderer as any).device;
    
    // 初始化计算着色器优化器
    if (this.webgpuDevice) {
      this.computeShaderOptimizer = new WebGPUComputeShaderOptimizer(this.webgpuDevice);
      console.log('🚀 WebGPU计算着色器优化器初始化成功');
      
      // 初始化WebGPU后期处理管理器
      this.webgpuPostProcessor = new WebGPUPostProcessManager(
        this.webgpuDevice, 
        this.renderer,
        {
          enableBloom: this.settings.bloom,
          enableSSAO: this.settings.ssao,
          enableToneMapping: true,
          enableFXAA: this.settings.antialias,
          quality: this.settings.quality
        }
      );
      console.log('🎨 WebGPU后期处理管理器初始化成功');
    }

    // 转换场景材质为WebGPU兼容
    if (this.scene) {
      webgpuMaterialAdapter.convertSceneMaterials(this.scene);
    }

    this.configureCommonRendererSettings();
  }

  /**
   * 初始化WebGL渲染器
   */
  private initializeWebGLRenderer(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.settings.antialias,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      logarithmicDepthBuffer: true // 解决Z-fighting
    });

    this.configureCommonRendererSettings();

    // WebGL特有扩展
    if (this.renderer instanceof THREE.WebGLRenderer) {
      const gl = this.renderer.getContext();
      gl.getExtension('OES_texture_float');
      gl.getExtension('OES_texture_float_linear');
      gl.getExtension('WEBGL_depth_texture');
    }
  }

  /**
   * 通用渲染器设置
   */
  private configureCommonRendererSettings(): void {
    // 基础配置
    this.renderer.setPixelRatio(this.getOptimalPixelRatio());
    this.renderer.setSize(this.renderer.domElement.width, this.renderer.domElement.height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // 色调映射
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.settings.toneMappingExposure;
    
    // 阴影配置
    if (this.settings.shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      
      // WebGL特有的autoUpdate属性
      if (this.renderer instanceof THREE.WebGLRenderer) {
        this.renderer.shadowMap.autoUpdate = true;
      }
    }
  }

  /**
   * 初始化后期处理管道
   */
  private initializePostProcessing(): void {
    // WebGPU使用自己的后期处理系统，WebGL使用EffectComposer
    if (this.rendererType === 'webgpu') {
      console.log('✅ WebGPU后期处理系统已在渲染器初始化时配置');
      return;
    }

    this.composer = new EffectComposer(this.renderer as THREE.WebGLRenderer);
    
    // 渲染通道（必须）
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    
    // SSAO通道
    if (this.settings.ssao) {
      this.ssaoPass = new SSAOPass(this.scene, this.camera, 512, 512);
      this.ssaoPass.kernelRadius = 8;
      this.ssaoPass.minDistance = 0.005;
      this.ssaoPass.maxDistance = 0.1;
      this.composer.addPass(this.ssaoPass);
    }
    
    // 辉光通道
    if (this.settings.bloom) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(512, 512),
        1.5,  // strength
        0.4,  // radius
        0.85  // threshold
      );
      this.composer.addPass(this.bloomPass);
    }
    
    // 输出通道（必须在最后）
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  /**
   * 获取最优像素比
   */
  private getOptimalPixelRatio(): number {
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    if (!this.settings.adaptivePixelRatio) {
      return Math.min(devicePixelRatio, this.settings.maxPixelRatio);
    }
    
    // 根据设备性能自适应
    const canvas = this.renderer.domElement;
    const area = canvas.width * canvas.height * devicePixelRatio * devicePixelRatio;
    
    if (area > 2073600) { // > 1440p
      return Math.min(1.5, this.settings.maxPixelRatio);
    } else if (area > 921600) { // > 1080p
      return Math.min(2.0, this.settings.maxPixelRatio);
    } else {
      return Math.min(devicePixelRatio, this.settings.maxPixelRatio);
    }
  }

  /**
   * 应用渲染设置
   */
  private applySettings(): void {
    // 质量设置
    switch (this.settings.quality) {
      case 'low':
        this.renderer.setPixelRatio(1);
        this.settings.shadowMapSize = 512;
        this.settings.ssao = false;
        this.settings.bloom = false;
        break;
      case 'medium':
        this.renderer.setPixelRatio(1.5);
        this.settings.shadowMapSize = 1024;
        break;
      case 'high':
        this.renderer.setPixelRatio(this.getOptimalPixelRatio());
        this.settings.shadowMapSize = 2048;
        break;
      case 'ultra':
        this.renderer.setPixelRatio(this.settings.maxPixelRatio);
        this.settings.shadowMapSize = 4096;
        this.settings.ssao = true;
        this.settings.bloom = true;
        break;
    }

    // 阴影贴图大小
    if (this.settings.shadows) {
      this.scene.traverse((object) => {
        if (object instanceof THREE.DirectionalLight && object.shadow) {
          object.shadow.mapSize.setScalar(this.settings.shadowMapSize);
        }
      });
    }
  }

  /**
   * 初始化性能监控
   */
  private initializePerformanceMonitoring(): void {
    this.performanceStats = {
      fps: 0,
      frameTime: 0,
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      memoryUsage: { used: 0, total: 0, percentage: 0 }
    };
  }

  /**
   * 更新性能统计
   */
  private updatePerformanceStats(): void {
    const currentTime = performance.now();
    this.frameCount++;

    if (currentTime >= this.lastTime + 1000) {
      this.performanceStats.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.performanceStats.frameTime = (currentTime - this.lastTime) / this.frameCount;
      
      const info = this.renderer.info;
      this.performanceStats.drawCalls = info.render.calls;
      this.performanceStats.triangles = info.render.triangles;
      this.performanceStats.geometries = info.memory.geometries;
      this.performanceStats.textures = info.memory.textures;

      // 内存使用（如果支持）
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.performanceStats.memoryUsage = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
        };
      }

      this.frameCount = 0;
      this.lastTime = currentTime;

      // 触发回调
      this.onPerformanceUpdate?.(this.performanceStats);
    }
  }

  /**
   * 开始渲染循环
   */
  public startRenderLoop(): void {
    if (this.isRendering) return;
    
    this.isRendering = true;
    this.lastTime = performance.now();
    
    const animate = () => {
      if (!this.isRendering) return;
      
      this.animationId = requestAnimationFrame(animate);
      
      const currentTime = performance.now();
      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;
      
      // 使用自定义渲染循环或默认渲染
      if (this.customRenderLoop) {
        this.customRenderLoop(deltaTime);
      } else {
        // WebGPU渲染路径
        if (this.rendererType === 'webgpu') {
          this.renderer.render(this.scene, this.camera);
          
          // 应用WebGPU后期处理
          if (this.webgpuPostProcessor && (this.settings.ssao || this.settings.bloom)) {
            // 获取渲染结果纹理
            const renderTarget = (this.renderer as any).getRenderTarget();
            if (renderTarget) {
              this.webgpuPostProcessor.executePostProcessing(renderTarget);
            }
          }
        } else {
          // WebGL渲染路径
          if (this.composer && (this.settings.ssao || this.settings.bloom)) {
            this.composer.render();
          } else {
            this.renderer.render(this.scene, this.camera);
          }
        }
      }
      
      // 更新性能统计
      this.updatePerformanceStats();
      
      // 触发渲染完成回调
      this.onRenderComplete?.(this.frameCount);
    };
    
    animate();
  }

  /**
   * 设置自定义渲染循环
   */
  public setCustomRenderLoop(renderLoop: (deltaTime: number) => void): void {
    this.customRenderLoop = renderLoop;
  }

  /**
   * 清除自定义渲染循环
   */
  public clearCustomRenderLoop(): void {
    this.customRenderLoop = undefined;
  }

  /**
   * 停止渲染循环
   */
  public stopRenderLoop(): void {
    this.isRendering = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  /**
   * 设置质量等级
   */
  public setQualityLevel(level: 'low' | 'medium' | 'high' | 'ultra'): void {
    this.settings.quality = level;
    this.applySettings();
    
    // 重新初始化后期处理（如果需要）
    if ((level === 'ultra' && (!this.settings.ssao || !this.settings.bloom)) ||
        (level !== 'ultra' && (this.settings.ssao || this.settings.bloom))) {
      this.initializePostProcessing();
    }
  }

  /**
   * 启用自适应质量
   */
  public enableAdaptiveQuality(enabled: boolean): void {
    if (!enabled) return;

    // 监控性能并自动调整质量
    this.onPerformanceUpdate = (metrics) => {
      // 使用智能渲染器管理器的动态调整
      const adjustments = smartRendererManager.adjustPerformanceForFramerate(metrics.fps);
      
      if (Object.keys(adjustments).length > 0) {
        console.log('🔧 自动性能调整:', adjustments);
        
        // 应用调整
        if (adjustments.enableShadows !== undefined) {
          this.settings.shadows = adjustments.enableShadows;
        }
        if (adjustments.enablePostProcessing !== undefined) {
          this.settings.ssao = adjustments.enablePostProcessing;
          this.settings.bloom = adjustments.enablePostProcessing;
        }
        
        this.applySettings();
        
        // 如果性能严重不足，尝试渲染器降级
        if (metrics.fps < 20) {
          const fallbackRenderer = smartRendererManager.tryFallback();
          if (fallbackRenderer && fallbackRenderer !== this.rendererType) {
            console.warn('🔻 性能严重不足，尝试渲染器降级');
            // 这里可以触发重新初始化渲染器的逻辑
          }
        }
      }
      
      // 原有的质量级别调整逻辑
      if (metrics.fps < 30 && this.settings.quality !== 'low') {
        const qualityLevels = ['ultra', 'high', 'medium', 'low'];
        const currentIndex = qualityLevels.indexOf(this.settings.quality);
        if (currentIndex < qualityLevels.length - 1) {
          this.setQualityLevel(qualityLevels[currentIndex + 1] as any);
        }
      } else if (metrics.fps > 55 && this.settings.quality !== 'ultra') {
        const qualityLevels = ['low', 'medium', 'high', 'ultra'];
        const currentIndex = qualityLevels.indexOf(this.settings.quality);
        if (currentIndex < qualityLevels.length - 1) {
          this.setQualityLevel(qualityLevels[currentIndex + 1] as any);
        }
      }
    };
  }

  /**
   * 获取性能指标
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceStats };
  }

  /**
   * 设置渲染设置
   */
  public setRenderSettings(settings: Partial<RenderSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.applySettings();
  }

  /**
   * 获取渲染设置
   */
  public getRenderSettings(): RenderSettings {
    return { ...this.settings };
  }

  /**
   * 调整画布大小
   */
  public resize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.composer?.setSize(width, height);
    
    // 更新SSAO分辨率
    if (this.ssaoPass) {
      this.ssaoPass.setSize(width, height);
    }
  }

  /**
   * 截图
   */
  public takeScreenshot(type: string = 'image/png', quality: number = 1.0): string {
    return this.renderer.domElement.toDataURL(type, quality);
  }

  /**
   * 设置性能更新回调
   */
  public setPerformanceUpdateCallback(callback: (metrics: PerformanceMetrics) => void): void {
    this.onPerformanceUpdate = callback;
  }

  /**
   * 设置渲染完成回调
   */
  public setRenderCompleteCallback(callback: (frame: number) => void): void {
    this.onRenderComplete = callback;
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this.stopRenderLoop();
    this.composer?.dispose();
    this.renderer.dispose();
  }

  /**
   * 获取WebGPU计算着色器优化器
   */
  public getComputeShaderOptimizer(): WebGPUComputeShaderOptimizer | undefined {
    return this.computeShaderOptimizer;
  }

  /**
   * 获取WebGPU后期处理管理器
   */
  public getWebGPUPostProcessor(): WebGPUPostProcessManager | undefined {
    return this.webgpuPostProcessor;
  }

  /**
   * 动态切换材质为WebGPU优化版本
   */
  public optimizeSceneMaterials(aggressive: boolean = false): void {
    if (this.rendererType !== 'webgpu') return;

    console.log(`🎨 开始${aggressive ? '激进' : '标准'}材质优化...`);
    
    const startTime = performance.now();
    let optimizedCount = 0;

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        
        materials.forEach((material, index) => {
          // 获取或创建优化材质
          const optimizedMaterial = webgpuMaterialAdapter.convertMaterial(material);
          
          if (aggressive) {
            // 激进优化：减少细节以提升性能
            this.applyAggressiveOptimization(optimizedMaterial);
          }
          
          if (Array.isArray(object.material)) {
            object.material[index] = optimizedMaterial;
          } else {
            object.material = optimizedMaterial;
          }
          
          optimizedCount++;
        });
      }
    });

    const optimizationTime = performance.now() - startTime;
    console.log(`✅ 材质优化完成: ${optimizedCount}个材质, 耗时${optimizationTime.toFixed(2)}ms`);
    
    // 更新材质转换统计
    const stats = webgpuMaterialAdapter.getConversionStats();
    console.log('📊 材质转换统计:', stats);
  }

  /**
   * 应用激进材质优化
   */
  private applyAggressiveOptimization(material: any): void {
    // 降低材质复杂度以提升性能
    if (material.normalScale) {
      material.normalScale.multiplyScalar(0.5);
    }
    if (material.roughness !== undefined) {
      material.roughness = Math.min(material.roughness + 0.1, 1.0);
    }
    if (material.envMapIntensity !== undefined) {
      material.envMapIntensity *= 0.7;
    }
    // 禁用透明度以减少渲染开销
    if (material.opacity > 0.95) {
      material.transparent = false;
      material.opacity = 1.0;
    }
  }

  /**
   * 启用WebGPU特定优化
   */
  public enableWebGPUOptimizations(): void {
    if (this.rendererType !== 'webgpu' || !this.computeShaderOptimizer) return;

    console.log('🚀 启用WebGPU特定优化...');

    // 启用计算着色器加速
    if (this.settings.quality === 'ultra') {
      // 超高质量模式：启用所有计算着色器优化
      this.computeShaderOptimizer.enableComputeAcceleration('matrix', true);
      this.computeShaderOptimizer.enableComputeAcceleration('mesh', true);
      this.computeShaderOptimizer.enableComputeAcceleration('physics', true);
    } else if (this.settings.quality === 'high') {
      // 高质量模式：启用关键计算着色器优化
      this.computeShaderOptimizer.enableComputeAcceleration('matrix', true);
      this.computeShaderOptimizer.enableComputeAcceleration('mesh', false);
    }

    // 更新WebGPU后期处理配置
    if (this.webgpuPostProcessor) {
      this.webgpuPostProcessor.updateConfig({
        quality: this.settings.quality,
        enableBloom: this.settings.bloom,
        enableSSAO: this.settings.ssao,
        enableToneMapping: true,
        enableFXAA: this.settings.antialias
      });
    }

    console.log('✅ WebGPU优化配置完成');
  }

  /**
   * 获取WebGPU性能统计
   */
  public getWebGPUStats() {
    if (this.rendererType !== 'webgpu') {
      return { error: 'WebGPU未启用' };
    }

    const stats = {
      rendererType: this.rendererType,
      deviceSupported: this.isWebGPUSupported,
      materialStats: webgpuMaterialAdapter.getConversionStats(),
      computeShaderOptimizer: this.computeShaderOptimizer ? {
        activeOptimizations: this.computeShaderOptimizer.getActiveOptimizations?.(),
        memoryUsage: this.computeShaderOptimizer.getMemoryUsage?.()
      } : null,
      postProcessing: this.webgpuPostProcessor ? {
        enabledEffects: {
          bloom: this.settings.bloom,
          ssao: this.settings.ssao,
          toneMapping: true,
          fxaa: this.settings.antialias
        }
      } : null
    };

    return stats;
  }
  public getRenderer(): THREEWebGPU.WebGPURenderer | THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * 获取渲染器类型
   */
  public getRendererType(): 'webgpu' | 'webgl' {
    return this.rendererType;
  }

  /**
   * 检查是否支持WebGPU
   */
  public isWebGPUEnabled(): boolean {
    return this.rendererType === 'webgpu';
  }

  /**
   * 获取后期处理组合器
   */
  public getComposer(): EffectComposer {
    return this.composer;
  }
}