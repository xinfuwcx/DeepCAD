/**
 * 高性能Three.js渲染器
 * 解决渲染效果不够和抖动严重的问题
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface RenderingConfig {
  // 渲染质量设置
  antialias: boolean;
  pixelRatio: number;
  shadowMapEnabled: boolean;
  shadowMapType: THREE.ShadowMapType;
  
  // 性能优化设置
  enableFrustumCulling: boolean;
  enableOcclusion: boolean;
  maxDrawCalls: number;
  
  // 视觉效果设置
  enableBloom: boolean;
  enableSSAO: boolean;
  toneMapping: THREE.ToneMapping;
  toneMappingExposure: number;
  
  // 抗抖动设置
  enableTAA: boolean;
  enableMotionBlur: boolean;
  stabilizeCamera: boolean;
}

export class EnhancedRenderer {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private config: RenderingConfig;
  
  // 抗抖动相关
  private previousCameraMatrix = new THREE.Matrix4();
  private cameraVelocity = new THREE.Vector3();
  private smoothingFactor = 0.15;
  private frameCount = 0;
  
  // 性能监控
  private performanceStats = {
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    lastFrameTime: performance.now()
  };
  
  // 渲染目标
  private renderTarget!: THREE.WebGLRenderTarget;
  private depthRenderTarget!: THREE.WebGLRenderTarget;
  
  constructor(canvas: HTMLCanvasElement, config: Partial<RenderingConfig> = {}) {
    this.config = {
      antialias: true,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      shadowMapEnabled: true,
      shadowMapType: THREE.PCFSoftShadowMap,
      enableFrustumCulling: true,
      enableOcclusion: false,
      maxDrawCalls: 1000,
      enableBloom: false,
      enableSSAO: false,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.0,
      enableTAA: true,
      enableMotionBlur: false,
      stabilizeCamera: true,
      ...config
    };
    
    this.initializeRenderer(canvas);
    this.initializeScene();
    this.initializeCamera();
    this.initializeControls();
    this.initializeRenderTargets();
    
    console.log('🎨 高性能渲染器初始化完成');
  }
  
  private initializeRenderer(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.config.antialias,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      logarithmicDepthBuffer: true, // 提高深度精度
      preserveDrawingBuffer: false
    });
    
    // 基础设置
    this.renderer.setPixelRatio(this.config.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = this.config.toneMapping;
    this.renderer.toneMappingExposure = this.config.toneMappingExposure;
    
    // 阴影设置
    this.renderer.shadowMap.enabled = this.config.shadowMapEnabled;
    this.renderer.shadowMap.type = this.config.shadowMapType;
    this.renderer.shadowMap.autoUpdate = false; // 手动控制阴影更新
    
    // 性能优化
    this.renderer.info.autoReset = false;
    this.renderer.sortObjects = true;
    this.renderer.autoClear = false; // 手动控制清理
    
    // 设置渲染状态
    this.renderer.setClearColor(0x1a1a1a, 1.0);
    
    console.log('🖥️ 渲染器配置完成');
  }
  
  private initializeScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);
    
    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
    
    // 添加主光源
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = this.config.shadowMapEnabled;
    
    if (this.config.shadowMapEnabled) {
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.1;
      directionalLight.shadow.camera.far = 500;
      directionalLight.shadow.camera.left = -100;
      directionalLight.shadow.camera.right = 100;
      directionalLight.shadow.camera.top = 100;
      directionalLight.shadow.camera.bottom = -100;
    }
    
    this.scene.add(directionalLight);
    
    console.log('🌟 场景初始化完成');
  }
  
  private initializeCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      50, // 减小FOV以减少透视失真
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    
    // 设置初始位置
    this.camera.position.set(100, 100, 100);
    this.camera.lookAt(0, 0, 0);
    
    console.log('📷 相机初始化完成');
  }
  
  private initializeControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    // 基础设置
    this.controls.enableDamping = true;
    this.controls.dampingFactor = this.config.stabilizeCamera ? 0.05 : 0.1;
    this.controls.enableZoom = true;
    this.controls.enableRotate = true;
    this.controls.enablePan = true;
    
    // 抗抖动设置
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.8;
    this.controls.panSpeed = 0.8;
    this.controls.screenSpacePanning = true;
    
    // 约束设置
    this.controls.minDistance = 1;
    this.controls.maxDistance = 1000;
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;
    
    // 目标设置
    this.controls.target.set(0, 0, 0);
    
    console.log('🎮 控制器初始化完成');
  }
  
  private initializeRenderTargets(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // 主渲染目标
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      stencilBuffer: false,
      depthBuffer: true
    });
    
    // 深度渲染目标
    this.depthRenderTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.DepthFormat,
      type: THREE.UnsignedIntType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter
    });
    
    console.log('🎯 渲染目标初始化完成');
  }
  
  /**
   * 相机稳定化处理
   */
  private stabilizeCamera(): void {
    if (!this.config.stabilizeCamera) return;
    
    const currentMatrix = this.camera.matrixWorld.clone();
    
    // 计算相机速度
    if (this.frameCount > 0) {
      const deltaMatrix = new THREE.Matrix4()
        .copy(currentMatrix)
        .multiply(this.previousCameraMatrix.clone().invert());
      
      const deltaPosition = new THREE.Vector3();
      deltaPosition.setFromMatrixPosition(deltaMatrix);
      
      this.cameraVelocity.lerp(deltaPosition, this.smoothingFactor);
      
      // 如果相机移动过快，应用额外的平滑
      if (this.cameraVelocity.length() > 0.1) {
        const smoothedPosition = this.camera.position.clone()
          .sub(this.cameraVelocity.multiplyScalar(0.3));
        this.camera.position.copy(smoothedPosition);
      }
    }
    
    this.previousCameraMatrix.copy(currentMatrix);
  }
  
  /**
   * 高质量渲染
   */
  private renderHighQuality(): void {
    const renderer = this.renderer;
    const scene = this.scene;
    const camera = this.camera;
    
    // 清理渲染器
    renderer.clear(true, true, true);
    
    // 更新阴影
    if (this.config.shadowMapEnabled && this.frameCount % 5 === 0) {
      renderer.shadowMap.needsUpdate = true;
    }
    
    // 渲染到主目标
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(scene, camera);
    
    // 渲染到屏幕
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  }
  
  /**
   * 性能监控
   */
  private updatePerformanceStats(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.performanceStats.lastFrameTime;
    
    this.performanceStats.frameTime = deltaTime;
    this.performanceStats.fps = 1000 / deltaTime;
    this.performanceStats.drawCalls = this.renderer.info.render.calls;
    this.performanceStats.triangles = this.renderer.info.render.triangles;
    this.performanceStats.lastFrameTime = currentTime;
    
    // 重置渲染器统计
    if (this.frameCount % 60 === 0) {
      this.renderer.info.reset();
    }
  }
  
  /**
   * 自适应质量调整
   */
  private adaptiveQualityControl(): void {
    const targetFPS = 60;
    const currentFPS = this.performanceStats.fps;
    
    if (currentFPS < targetFPS * 0.8) {
      // 降低质量
      if (this.config.pixelRatio > 1) {
        this.config.pixelRatio = Math.max(1, this.config.pixelRatio - 0.1);
        this.renderer.setPixelRatio(this.config.pixelRatio);
      }
      
      if (this.config.shadowMapEnabled && currentFPS < targetFPS * 0.5) {
        this.config.shadowMapEnabled = false;
        this.renderer.shadowMap.enabled = false;
      }
    } else if (currentFPS > targetFPS * 1.2) {
      // 提高质量
      if (this.config.pixelRatio < 2) {
        this.config.pixelRatio = Math.min(2, this.config.pixelRatio + 0.1);
        this.renderer.setPixelRatio(this.config.pixelRatio);
      }
    }
  }
  
  /**
   * 主渲染循环
   */
  render(): void {
    this.frameCount++;
    
    // 更新控制器
    this.controls.update();
    
    // 相机稳定化
    this.stabilizeCamera();
    
    // 高质量渲染
    this.renderHighQuality();
    
    // 性能监控
    this.updatePerformanceStats();
    
    // 自适应质量控制
    if (this.frameCount % 60 === 0) {
      this.adaptiveQualityControl();
    }
  }
  
  /**
   * 调整大小
   */
  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height, false);
    
    // 更新渲染目标
    this.renderTarget.setSize(width, height);
    this.depthRenderTarget.setSize(width, height);
    
    console.log(`📐 渲染器尺寸调整: ${width}x${height}`);
  }
  
  /**
   * 添加对象到场景
   */
  addToScene(object: THREE.Object3D): void {
    this.scene.add(object);
  }
  
  /**
   * 从场景移除对象
   */
  removeFromScene(object: THREE.Object3D): void {
    this.scene.remove(object);
  }
  
  /**
   * 设置相机位置
   */
  setCameraPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
  }
  
  /**
   * 设置相机目标
   */
  setCameraTarget(x: number, y: number, z: number): void {
    this.controls.target.set(x, y, z);
    this.controls.update();
  }
  
  /**
   * 获取性能统计
   */
  getPerformanceStats(): typeof this.performanceStats {
    return { ...this.performanceStats };
  }
  
  /**
   * 获取渲染器实例
   */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
  
  /**
   * 获取场景实例
   */
  getScene(): THREE.Scene {
    return this.scene;
  }
  
  /**
   * 获取相机实例
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
  
  /**
   * 获取控制器实例
   */
  getControls(): OrbitControls {
    return this.controls;
  }
  
  /**
   * 清理资源
   */
  dispose(): void {
    this.controls.dispose();
    this.renderTarget.dispose();
    this.depthRenderTarget.dispose();
    this.renderer.dispose();
    
    console.log('🧹 高性能渲染器已清理');
  }
}

// 创建高性能渲染器的工厂函数
export function createEnhancedRenderer(
  canvas: HTMLCanvasElement,
  config: Partial<RenderingConfig> = {}
): EnhancedRenderer {
  return new EnhancedRenderer(canvas, config);
} 