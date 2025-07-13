import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

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
 * 负责WebGL渲染器配置、后期处理、性能监控和质量管理
 */
export class RendererManager {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  
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
    
    // 默认设置
    this.settings = {
      quality: 'high',
      antialias: true,
      shadows: true,
      ssao: false,
      bloom: false,
      adaptivePixelRatio: true,
      maxPixelRatio: 2.0,
      toneMappingExposure: 1.0,
      shadowMapSize: 2048,
      ...settings
    };

    // 初始化渲染器
    this.initializeRenderer(canvas);
    
    // 初始化后期处理
    this.initializePostProcessing();
    
    // 应用设置
    this.applySettings();
    
    // 初始化性能监控
    this.initializePerformanceMonitoring();
  }

  /**
   * 初始化WebGL渲染器
   */
  private initializeRenderer(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.settings.antialias,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      logarithmicDepthBuffer: true // 解决Z-fighting
    });

    // 基础配置
    this.renderer.setPixelRatio(this.getOptimalPixelRatio());
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // 色调映射
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.settings.toneMappingExposure;
    
    // 阴影配置
    if (this.settings.shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.shadowMap.autoUpdate = true;
    }

    // 启用WebGL扩展
    const gl = this.renderer.getContext();
    gl.getExtension('OES_texture_float');
    gl.getExtension('OES_texture_float_linear');
    gl.getExtension('WEBGL_depth_texture');
  }

  /**
   * 初始化后期处理管道
   */
  private initializePostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);
    
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
        // 默认渲染
        if (this.composer && (this.settings.ssao || this.settings.bloom)) {
          this.composer.render();
        } else {
          this.renderer.render(this.scene, this.camera);
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
   * 获取WebGL渲染器实例
   */
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * 获取后期处理组合器
   */
  public getComposer(): EffectComposer {
    return this.composer;
  }
}