/**
 * 统一的真实级渲染引擎服务
 * 为整个DeepCAD项目提供统一的高质量Three.js渲染
 */
import * as THREE from 'three';
// WebGPU 渲染器暂时禁用（路径/版本兼容 & 可选特性尚未稳定）。
// 如需启用，请改为动态导入：
//   const { WebGPURenderer } = await import('three/examples/jsm/renderers/webgpu/WebGPURenderer.js');
// 并在 initializeRenderer 中添加异步检测与 fallback。
// 这里先强制使用 WebGL 以保证前端可顺利启动。
import { safeDetachRenderer, deepDispose } from '../utils/safeThreeDetach';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
// import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { TAARenderPass } from 'three/examples/jsm/postprocessing/TAARenderPass.js';

export interface RenderingQuality {
  level: 'low' | 'medium' | 'high' | 'ultra';
  enableSSAO: boolean;
  enableBloom: boolean;
  enableAntiAliasing: boolean;
  enableTAA: boolean;
  shadowMapSize: number;
  toneMappingExposure: number;
}

export interface PostProcessingSettings {
  ssao: {
    radius: number;
    intensity: number;
    bias: number;
    kernelRadius: number;
  };
  bloom: {
    strength: number;
    radius: number;
    threshold: number;
  };
  antiAliasing: {
    type: 'FXAA' | 'SMAA' | 'TAA';
  };
}

export const QUALITY_PRESETS: Record<string, RenderingQuality> = {
  low: {
    level: 'low',
    enableSSAO: false,
    enableBloom: false,
    enableAntiAliasing: true,
    enableTAA: false,
    shadowMapSize: 1024,
    toneMappingExposure: 1.0
  },
  medium: {
    level: 'medium',
    enableSSAO: true,
    enableBloom: false,
    enableAntiAliasing: true,
    enableTAA: false,
    shadowMapSize: 2048,
    toneMappingExposure: 1.2
  },
  high: {
    level: 'high',
    enableSSAO: true,
    enableBloom: true,
    enableAntiAliasing: true,
    enableTAA: false,
    shadowMapSize: 4096,
    toneMappingExposure: 1.2
  },
  ultra: {
    level: 'ultra',
    enableSSAO: true,
    enableBloom: true,
    enableAntiAliasing: true,
    enableTAA: true,
    shadowMapSize: 8192,
    toneMappingExposure: 1.4
  }
};

export class RealisticRenderingEngine {
  private renderer: THREE.WebGLRenderer | any; // WebGLRenderer 或 WebGPURenderer
  private composer!: EffectComposer; // initialized in setupPostProcessing
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  
  // 后处理passes
  private renderPass!: RenderPass; // initialized in setupPostProcessing
  private ssaoPass?: SSAOPass;
  private bloomPass?: UnrealBloomPass;
  // private fxaaPass?: FXAAPass; // 暂时移除FXAA支持
  private smaaPass?: SMAAPass;
  private taaPass?: TAARenderPass;
  private outputPass: any; // Optional OutputPass (newer three only)
  
  private quality: RenderingQuality;
  private postProcessingSettings: PostProcessingSettings;
  private isInitialized = false;
  private usingWebGPU = false;

  constructor(
    container: HTMLElement,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
  qualityLevel: keyof typeof QUALITY_PRESETS = 'high'
  ) {
    this.container = container;
    this.scene = scene;
    this.camera = camera;
    this.quality = { ...QUALITY_PRESETS[qualityLevel] };
    
    // 默认后处理设置
    this.postProcessingSettings = {
      ssao: {
        radius: 0.1,
        intensity: 0.5,
        bias: 0.025,
        kernelRadius: 8
      },
      bloom: {
        strength: 0.3,
        radius: 0.8,
        threshold: 0.85
      },
      antiAliasing: {
        type: 'FXAA'
      }
    };

    this.initializeRenderer();
    // WebGPU 目前暂不接入后处理管线（three 官方后处理在 WebGPU 上仍在演进）
    if (!this.usingWebGPU) {
      this.setupPostProcessing();
    }
    this.isInitialized = true;
  }

  private initializeRenderer(): void {
    // 暂时禁用 WebGPU: 强制 WebGL，避免缺少 examples 路径或浏览器不支持导致启动失败
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.quality.level === 'low', // 低质量使用硬件抗锯齿
      alpha: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
      preserveDrawingBuffer: false
    });

    // 基础设置
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // 色彩空间和色调映射 (WebGPU 渲染器暂不一定支持所有属性，做存在性判断)
    if (this.renderer.outputColorSpace !== undefined) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    if (this.renderer.toneMapping !== undefined) {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = this.quality.toneMappingExposure;
    }
    
    // 阴影设置 (WebGPU 后端 shadow 机制不同，暂时仅在 WebGL 下配置)
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = this.quality.level === 'ultra' ? 
      THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    
    // 物理光照 (在新版本Three.js中已默认启用)
    
    this.container.appendChild(this.renderer.domElement);
  }

  private setupPostProcessing(): void {
    // 创建后处理composer
    this.composer = new EffectComposer(this.renderer);
    
    // 基础渲染pass
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // SSAO - 环境光遮蔽
    if (this.quality.enableSSAO) {
      this.ssaoPass = new SSAOPass(
        this.scene, 
        this.camera, 
        this.container.clientWidth, 
        this.container.clientHeight
      );
      this.updateSSAOSettings();
      this.composer.addPass(this.ssaoPass);
    }

    // TAA - 时间抗锯齿 (最高质量)
    if (this.quality.enableTAA) {
      this.taaPass = new TAARenderPass(this.scene, this.camera);
      this.taaPass.sampleLevel = 4;
      this.composer.addPass(this.taaPass);
    }

    // Bloom - 辉光效果
    if (this.quality.enableBloom) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
        this.postProcessingSettings.bloom.strength,
        this.postProcessingSettings.bloom.radius,
        this.postProcessingSettings.bloom.threshold
      );
      this.composer.addPass(this.bloomPass);
    }

    // 抗锯齿 (如果没有TAA)
    if (this.quality.enableAntiAliasing && !this.quality.enableTAA) {
      this.setupAntiAliasing();
    }

    // 输出pass (仅在当前three版本存在时动态加载)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const maybeOutput = (require as any)('three/examples/jsm/postprocessing/OutputPass.js');
      if (maybeOutput?.OutputPass) {
        this.outputPass = new maybeOutput.OutputPass();
        this.composer.addPass(this.outputPass);
      }
    } catch (_) {
      // 忽略：旧版本three未提供 OutputPass
    }
  }

  private setupAntiAliasing(): void {
    switch (this.postProcessingSettings.antiAliasing.type) {
      case 'SMAA':
        // @ts-ignore constructor signature variance across versions
        this.smaaPass = new (SMAAPass as any)(
          this.container.clientWidth * window.devicePixelRatio,
          this.container.clientHeight * window.devicePixelRatio
        );
  if (this.smaaPass) this.composer.addPass(this.smaaPass as any);
        break;
      
      case 'FXAA':
      default:
        // FXAA暂时禁用，使用硬件抗锯齿
        console.warn('FXAA暂时不可用，使用硬件抗锯齿');
        break;
    }
  }

  private updateSSAOSettings(): void {
    if (!this.ssaoPass) return;
    
    const settings = this.postProcessingSettings.ssao;
    // SSAO参数设置 (适配新版本Three.js)
    this.ssaoPass.kernelRadius = settings.kernelRadius;
    this.ssaoPass.minDistance = 0.005;
    this.ssaoPass.maxDistance = 0.1;
    // 混合模式以获得更自然的效果
    this.ssaoPass.output = SSAOPass.OUTPUT.Default;
  }

  // FXAA 设置函数暂时移除

  // 公共方法

  public render(): void {
    if (!this.isInitialized) return;
    
  if (!this.usingWebGPU && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public resize(width: number, height: number): void {
    // 更新渲染器尺寸
    this.renderer.setSize(width, height);
    
    // 更新后处理尺寸
  if (!this.usingWebGPU && this.composer) {
      this.composer.setSize(width, height);
    }
    
    // 更新相机比例
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
    
    // 更新SSAO分辨率
    if (this.ssaoPass) {
      this.ssaoPass.setSize(width, height);
    }
    
    // 更新FXAA分辨率 (暂时禁用)
    // this.updateFXAASettings();
  }

  public setQuality(qualityLevel: keyof typeof QUALITY_PRESETS): void {
    this.quality = { ...QUALITY_PRESETS[qualityLevel] };
    
    // 重新构建后处理管线
    if (!this.usingWebGPU && this.composer) {
      this.composer.passes = [];
      this.setupPostProcessing();
    }
    
    // 更新渲染器设置
    if (this.renderer.toneMappingExposure !== undefined) {
      this.renderer.toneMappingExposure = this.quality.toneMappingExposure;
    }
    if (!this.usingWebGPU) {
      this.renderer.shadowMap.type = this.quality.level === 'ultra' ? 
        THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    }
  }

  public updatePostProcessingSettings(settings: Partial<PostProcessingSettings>): void {
    // 深度合并设置
    if (settings.ssao) {
      Object.assign(this.postProcessingSettings.ssao, settings.ssao);
      this.updateSSAOSettings();
    }
    
    if (settings.bloom && this.bloomPass) {
      Object.assign(this.postProcessingSettings.bloom, settings.bloom);
      const bloom = this.postProcessingSettings.bloom;
      this.bloomPass.strength = bloom.strength;
      this.bloomPass.radius = bloom.radius;
      this.bloomPass.threshold = bloom.threshold;
    }
    
    if (settings.antiAliasing) {
      this.postProcessingSettings.antiAliasing = settings.antiAliasing;
    }
  }

  public getRenderer(): THREE.WebGLRenderer | any { return this.renderer; }

  public isWebGPU(): boolean { return this.usingWebGPU; }
  public getBackend(): 'webgl' | 'webgpu' { return this.usingWebGPU ? 'webgpu' : 'webgl'; }

  public getComposer(): EffectComposer {
    return this.composer;
  }

  public getQuality(): RenderingQuality {
    return { ...this.quality };
  }

  public getPostProcessingSettings(): PostProcessingSettings {
    return JSON.parse(JSON.stringify(this.postProcessingSettings));
  }

  public dispose(): void {
    if (this.composer) {
      try { this.composer.dispose(); } catch (_) {}
    }
    // 深度释放场景资源
    deepDispose(this.scene);
    // 安全移除 renderer
    safeDetachRenderer(this.renderer as any);
    this.isInitialized = false;
  }

  // 便捷方法：创建PBR材质
  public static createPBRMaterial(options: {
    color?: number | string;
    metalness?: number;
    roughness?: number;
    envMapIntensity?: number;
    clearcoat?: number;
    clearcoatRoughness?: number;
  } = {}): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color: options.color || 0xffffff,
      metalness: options.metalness || 0.1,
      roughness: options.roughness || 0.4,
      envMapIntensity: options.envMapIntensity || 1.0
    });

    // 高级PBR属性 (clearcoat在新版本中需要特殊处理)
    if (options.clearcoat !== undefined) {
      (material as any).clearcoat = options.clearcoat;
      (material as any).clearcoatRoughness = options.clearcoatRoughness || 0.1;
    }

    return material;
  }

  // 便捷方法：设置场景环境
  public static setupEnvironment(scene: THREE.Scene, options: {
    skybox?: THREE.Texture;
    envMap?: THREE.Texture;
    fogColor?: number;
    fogNear?: number;
    fogFar?: number;
  } = {}): void {
    // 设置天空盒
    if (options.skybox) {
      scene.background = options.skybox;
    }
    
    // 设置环境贴图
    if (options.envMap) {
      scene.environment = options.envMap;
    }
    
    // 设置雾效
    if (options.fogColor !== undefined) {
      scene.fog = new THREE.Fog(
        options.fogColor,
        options.fogNear || 200,
        options.fogFar || 1000
      );
    }
  }
}

export default RealisticRenderingEngine;