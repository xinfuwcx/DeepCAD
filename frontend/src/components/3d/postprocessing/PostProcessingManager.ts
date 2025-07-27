import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SAOPass } from 'three/addons/postprocessing/SAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export interface PostProcessingSettings {
  enabled: boolean;
  ssao: {
    enabled: boolean;
    intensity: number;
    radius: number;
    bias: number;
    kernelSize: number;
    minDistance: number;
    maxDistance: number;
  };
  bloom: {
    enabled: boolean;
    strength: number;
    radius: number;
    threshold: number;
  };
  antialiasing: {
    enabled: boolean;
    type: 'FXAA' | 'SMAA' | 'MSAA';
    samples: number;
  };
  tonemap: {
    enabled: boolean;
    exposure: number;
    whitepoint: number;
  };
  colorCorrection: {
    enabled: boolean;
    contrast: number;
    brightness: number;
    saturation: number;
  };
  vignette: {
    enabled: boolean;
    intensity: number;
    smoothness: number;
  };
  chromaticAberration: {
    enabled: boolean;
    intensity: number;
  };
  filmGrain: {
    enabled: boolean;
    intensity: number;
    size: number;
  };
}

export interface PerformanceProfile {
  name: string;
  settings: Partial<PostProcessingSettings>;
}

/**
 * 后期处理管理器
 * 管理各种后期处理效果，包括SSAO、Bloom、抗锯齿等
 */
export class PostProcessingManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private composer: EffectComposer;
  
  // 渲染通道
  private renderPass: RenderPass;
  private ssaoPass?: SAOPass;
  private bloomPass?: UnrealBloomPass;
  private fxaaPass?: ShaderPass;
  private smaaPass?: SMAAPass;
  private outputPass: OutputPass;
  
  // 自定义通道
  private tonemapPass?: ShaderPass;
  private colorCorrectionPass?: ShaderPass;
  private vignettePass?: ShaderPass;
  private chromaticAberrationPass?: ShaderPass;
  private filmGrainPass?: ShaderPass;
  
  // 设置和状态
  private settings: PostProcessingSettings;
  private enabled: boolean = true;
  private needsUpdate: boolean = true;
  
  // 性能监控
  private renderTime: number = 0;
  private lastFrameTime: number = 0;
  
  // 预设配置
  public static readonly PROFILES: Record<string, PerformanceProfile> = {
    low: {
      name: '低端设备',
      settings: {
        enabled: true,
        ssao: { enabled: false, intensity: 0.5, radius: 0.1, bias: 0.025, kernelSize: 32, minDistance: 0.001, maxDistance: 0.1 },
        bloom: { enabled: false, strength: 1.0, radius: 0.8, threshold: 0.85 },
        antialiasing: { enabled: true, type: 'FXAA', samples: 4 },
        tonemap: { enabled: true, exposure: 1.0, whitepoint: 1.0 },
        colorCorrection: { enabled: false, contrast: 1.0, brightness: 0.0, saturation: 1.0 },
        vignette: { enabled: false, intensity: 0.5, smoothness: 0.5 },
        chromaticAberration: { enabled: false, intensity: 0.01 },
        filmGrain: { enabled: false, intensity: 0.5, size: 1.0 }
      }
    },
    medium: {
      name: '中端设备',
      settings: {
        enabled: true,
        ssao: { enabled: true, intensity: 0.5, radius: 0.1, bias: 0.025, kernelSize: 16, minDistance: 0.001, maxDistance: 0.1 },
        bloom: { enabled: true, strength: 1.0, radius: 0.4, threshold: 0.8 },
        antialiasing: { enabled: true, type: 'FXAA', samples: 4 },
        tonemap: { enabled: true, exposure: 1.0, whitepoint: 1.0 },
        colorCorrection: { enabled: true, contrast: 1.1, brightness: 0.0, saturation: 1.1 },
        vignette: { enabled: true, intensity: 0.3, smoothness: 0.5 },
        chromaticAberration: { enabled: false, intensity: 0.01 },
        filmGrain: { enabled: false, intensity: 0.5, size: 1.0 }
      }
    },
    high: {
      name: '高端设备',
      settings: {
        enabled: true,
        ssao: { enabled: true, intensity: 0.8, radius: 0.15, bias: 0.025, kernelSize: 32, minDistance: 0.001, maxDistance: 0.1 },
        bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.7 },
        antialiasing: { enabled: true, type: 'SMAA', samples: 8 },
        tonemap: { enabled: true, exposure: 1.2, whitepoint: 1.0 },
        colorCorrection: { enabled: true, contrast: 1.2, brightness: 0.05, saturation: 1.2 },
        vignette: { enabled: true, intensity: 0.4, smoothness: 0.5 },
        chromaticAberration: { enabled: true, intensity: 0.02 },
        filmGrain: { enabled: true, intensity: 0.1, size: 1.0 }
      }
    }
  };

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: {
      profile?: string;
      settings?: Partial<PostProcessingSettings>;
    } = {}
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // 默认设置
    this.settings = {
      enabled: true,
      ssao: {
        enabled: true,
        intensity: 0.6,
        radius: 0.12,
        bias: 0.5,
        kernelSize: 16,
        minDistance: 0.001,
        maxDistance: 0.1
      },
      bloom: {
        enabled: true,
        strength: 1.2,
        radius: 0.5,
        threshold: 0.8
      },
      antialiasing: {
        enabled: true,
        type: 'FXAA',
        samples: 4
      },
      tonemap: {
        enabled: true,
        exposure: 1.0,
        whitepoint: 1.0
      },
      colorCorrection: {
        enabled: true,
        contrast: 1.1,
        brightness: 0.0,
        saturation: 1.1
      },
      vignette: {
        enabled: true,
        intensity: 0.3,
        smoothness: 0.5
      },
      chromaticAberration: {
        enabled: false,
        intensity: 0.01
      },
      filmGrain: {
        enabled: false,
        intensity: 0.05,
        size: 1.0
      },
      ...options.settings
    };

    // 应用预设
    if (options.profile && PostProcessingManager.PROFILES[options.profile]) {
      this.applyProfile(options.profile);
    }

    this.initializeComposer();
    this.setupPasses();

    console.log('✨ 后期处理管理器初始化完成');
  }

  /**
   * 初始化合成器
   */
  private initializeComposer(): void {
    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(
      this.renderer.domElement.width,
      this.renderer.domElement.height
    );
  }

  /**
   * 设置渲染通道
   */
  private setupPasses(): void {
    // 基础渲染通道
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // SSAO通道
    if (this.settings.ssao.enabled) {
      this.setupSSAOPass();
    }

    // Bloom通道
    if (this.settings.bloom.enabled) {
      this.setupBloomPass();
    }

    // 色调映射
    if (this.settings.tonemap.enabled) {
      this.setupTonemapPass();
    }

    // 颜色校正
    if (this.settings.colorCorrection.enabled) {
      this.setupColorCorrectionPass();
    }

    // 晕影效果
    if (this.settings.vignette.enabled) {
      this.setupVignettePass();
    }

    // 色差
    if (this.settings.chromaticAberration.enabled) {
      this.setupChromaticAberrationPass();
    }

    // 胶片颗粒
    if (this.settings.filmGrain.enabled) {
      this.setupFilmGrainPass();
    }

    // 抗锯齿
    if (this.settings.antialiasing.enabled) {
      this.setupAntialiasingPass();
    }

    // 输出通道
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  /**
   * 设置SSAO通道
   */
  private setupSSAOPass(): void {
    this.ssaoPass = new SAOPass(
      this.scene,
      this.camera,
      new THREE.Vector2(512, 512)
    );
    
    this.ssaoPass.params.output = SAOPass.OUTPUT.SAO;
    this.ssaoPass.params.saoBias = this.settings.ssao.bias;
    this.ssaoPass.params.saoIntensity = this.settings.ssao.intensity;
    this.ssaoPass.params.saoScale = this.settings.ssao.radius;
    this.ssaoPass.params.saoKernelRadius = this.settings.ssao.kernelSize;
    this.ssaoPass.params.saoMinResolution = 0;
    this.ssaoPass.params.saoBlur = true;
    this.ssaoPass.params.saoBlurRadius = 8;
    this.ssaoPass.params.saoBlurStdDev = 4;
    this.ssaoPass.params.saoBlurDepthCutoff = 0.01;

    this.composer.addPass(this.ssaoPass);
  }

  /**
   * 设置Bloom通道
   */
  private setupBloomPass(): void {
    const bloomResolution = new THREE.Vector2(
      this.renderer.domElement.width,
      this.renderer.domElement.height
    );

    this.bloomPass = new UnrealBloomPass(
      bloomResolution,
      this.settings.bloom.strength,
      this.settings.bloom.radius,
      this.settings.bloom.threshold
    );

    this.composer.addPass(this.bloomPass);
  }

  /**
   * 设置色调映射通道
   */
  private setupTonemapPass(): void {
    const tonemapShader = {
      uniforms: {
        tDiffuse: { value: null },
        exposure: { value: this.settings.tonemap.exposure },
        whitepoint: { value: this.settings.tonemap.whitepoint }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float exposure;
        uniform float whitepoint;
        varying vec2 vUv;

        vec3 ACESFilm(vec3 x) {
          float a = 2.51;
          float b = 0.03;
          float c = 2.43;
          float d = 0.59;
          float e = 0.14;
          return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
        }

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          
          // 曝光调整
          color.rgb *= exposure;
          
          // ACES色调映射
          color.rgb = ACESFilm(color.rgb);
          
          gl_FragColor = color;
        }
      `
    };

    this.tonemapPass = new ShaderPass(tonemapShader);
    this.composer.addPass(this.tonemapPass);
  }

  /**
   * 设置颜色校正通道
   */
  private setupColorCorrectionPass(): void {
    const colorCorrectionShader = {
      uniforms: {
        tDiffuse: { value: null },
        contrast: { value: this.settings.colorCorrection.contrast },
        brightness: { value: this.settings.colorCorrection.brightness },
        saturation: { value: this.settings.colorCorrection.saturation }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float contrast;
        uniform float brightness;
        uniform float saturation;
        varying vec2 vUv;

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          
          // 亮度调整
          color.rgb += brightness;
          
          // 对比度调整
          color.rgb = (color.rgb - 0.5) * contrast + 0.5;
          
          // 饱和度调整
          float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          color.rgb = mix(vec3(gray), color.rgb, saturation);
          
          gl_FragColor = color;
        }
      `
    };

    this.colorCorrectionPass = new ShaderPass(colorCorrectionShader);
    this.composer.addPass(this.colorCorrectionPass);
  }

  /**
   * 设置晕影通道
   */
  private setupVignettePass(): void {
    const vignetteShader = {
      uniforms: {
        tDiffuse: { value: null },
        intensity: { value: this.settings.vignette.intensity },
        smoothness: { value: this.settings.vignette.smoothness }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float intensity;
        uniform float smoothness;
        varying vec2 vUv;

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          float vignette = smoothstep(0.8, 0.8 - smoothness, dist * intensity);
          
          color.rgb *= vignette;
          
          gl_FragColor = color;
        }
      `
    };

    this.vignettePass = new ShaderPass(vignetteShader);
    this.composer.addPass(this.vignettePass);
  }

  /**
   * 设置色差通道
   */
  private setupChromaticAberrationPass(): void {
    const chromaticAberrationShader = {
      uniforms: {
        tDiffuse: { value: null },
        intensity: { value: this.settings.chromaticAberration.intensity }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float intensity;
        varying vec2 vUv;

        void main() {
          vec2 center = vec2(0.5, 0.5);
          vec2 offset = (vUv - center) * intensity;
          
          float r = texture2D(tDiffuse, vUv + offset).r;
          float g = texture2D(tDiffuse, vUv).g;
          float b = texture2D(tDiffuse, vUv - offset).b;
          
          gl_FragColor = vec4(r, g, b, 1.0);
        }
      `
    };

    this.chromaticAberrationPass = new ShaderPass(chromaticAberrationShader);
    this.composer.addPass(this.chromaticAberrationPass);
  }

  /**
   * 设置胶片颗粒通道
   */
  private setupFilmGrainPass(): void {
    const filmGrainShader = {
      uniforms: {
        tDiffuse: { value: null },
        intensity: { value: this.settings.filmGrain.intensity },
        size: { value: this.settings.filmGrain.size },
        time: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float intensity;
        uniform float size;
        uniform float time;
        varying vec2 vUv;

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          
          vec2 noiseUv = vUv * size + time;
          float noise = random(noiseUv) * 2.0 - 1.0;
          
          color.rgb += noise * intensity;
          
          gl_FragColor = color;
        }
      `
    };

    this.filmGrainPass = new ShaderPass(filmGrainShader);
    this.composer.addPass(this.filmGrainPass);
  }

  /**
   * 设置抗锯齿通道
   */
  private setupAntialiasingPass(): void {
    if (this.settings.antialiasing.type === 'FXAA') {
      this.fxaaPass = new ShaderPass(FXAAShader);
      this.fxaaPass.material.uniforms['resolution'].value.x = 1 / this.renderer.domElement.width;
      this.fxaaPass.material.uniforms['resolution'].value.y = 1 / this.renderer.domElement.height;
      this.composer.addPass(this.fxaaPass);
    } else if (this.settings.antialiasing.type === 'SMAA') {
      this.smaaPass = new SMAAPass(
        this.renderer.domElement.width,
        this.renderer.domElement.height
      );
      this.composer.addPass(this.smaaPass);
    }
  }

  /**
   * 渲染
   */
  public render(): void {
    if (!this.enabled || !this.settings.enabled) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const startTime = performance.now();
    
    // 更新动态uniform
    this.updateDynamicUniforms();
    
    this.composer.render();
    
    this.renderTime = performance.now() - startTime;
  }

  /**
   * 更新动态uniform
   */
  private updateDynamicUniforms(): void {
    // 更新胶片颗粒时间
    if (this.filmGrainPass) {
      this.filmGrainPass.material.uniforms.time.value = performance.now() * 0.001;
    }
  }

  /**
   * 调整大小
   */
  public setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
    
    // 更新FXAA分辨率
    if (this.fxaaPass) {
      this.fxaaPass.material.uniforms['resolution'].value.x = 1 / width;
      this.fxaaPass.material.uniforms['resolution'].value.y = 1 / height;
    }

    // 更新SMAA
    if (this.smaaPass) {
      this.smaaPass.setSize(width, height);
    }

    // 更新SSAO
    if (this.ssaoPass) {
      this.ssaoPass.setSize(width, height);
    }
  }

  /**
   * 应用预设配置
   */
  public applyProfile(profileName: string): void {
    const profile = PostProcessingManager.PROFILES[profileName];
    if (!profile) {
      console.warn(`未知的后期处理配置: ${profileName}`);
      return;
    }

    this.settings = { ...this.settings, ...profile.settings };
    this.rebuildPasses();
    
    console.log(`✅ 后期处理配置已应用: ${profile.name}`);
  }

  /**
   * 更新设置
   */
  public updateSettings(settings: Partial<PostProcessingSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.updatePassSettings();
  }

  /**
   * 更新通道设置
   */
  private updatePassSettings(): void {
    // 更新SSAO
    if (this.ssaoPass && this.settings.ssao.enabled) {
      this.ssaoPass.params.saoBias = this.settings.ssao.bias;
      this.ssaoPass.params.saoIntensity = this.settings.ssao.intensity;
      this.ssaoPass.params.saoScale = this.settings.ssao.radius;
      this.ssaoPass.params.saoKernelRadius = this.settings.ssao.kernelSize;
    }

    // 更新Bloom
    if (this.bloomPass && this.settings.bloom.enabled) {
      this.bloomPass.strength = this.settings.bloom.strength;
      this.bloomPass.radius = this.settings.bloom.radius;
      this.bloomPass.threshold = this.settings.bloom.threshold;
    }

    // 更新色调映射
    if (this.tonemapPass && this.settings.tonemap.enabled) {
      this.tonemapPass.material.uniforms.exposure.value = this.settings.tonemap.exposure;
      this.tonemapPass.material.uniforms.whitepoint.value = this.settings.tonemap.whitepoint;
    }

    // 更新颜色校正
    if (this.colorCorrectionPass && this.settings.colorCorrection.enabled) {
      this.colorCorrectionPass.material.uniforms.contrast.value = this.settings.colorCorrection.contrast;
      this.colorCorrectionPass.material.uniforms.brightness.value = this.settings.colorCorrection.brightness;
      this.colorCorrectionPass.material.uniforms.saturation.value = this.settings.colorCorrection.saturation;
    }

    // 更新晕影
    if (this.vignettePass && this.settings.vignette.enabled) {
      this.vignettePass.material.uniforms.intensity.value = this.settings.vignette.intensity;
      this.vignettePass.material.uniforms.smoothness.value = this.settings.vignette.smoothness;
    }

    // 更新色差
    if (this.chromaticAberrationPass && this.settings.chromaticAberration.enabled) {
      this.chromaticAberrationPass.material.uniforms.intensity.value = this.settings.chromaticAberration.intensity;
    }

    // 更新胶片颗粒
    if (this.filmGrainPass && this.settings.filmGrain.enabled) {
      this.filmGrainPass.material.uniforms.intensity.value = this.settings.filmGrain.intensity;
      this.filmGrainPass.material.uniforms.size.value = this.settings.filmGrain.size;
    }
  }

  /**
   * 重建渲染通道
   */
  private rebuildPasses(): void {
    // 清除现有通道
    this.composer.passes = [];
    
    // 重新设置通道
    this.setupPasses();
  }

  /**
   * 启用/禁用后期处理
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 获取设置
   */
  public getSettings(): PostProcessingSettings {
    return { ...this.settings };
  }

  /**
   * 获取渲染时间
   */
  public getRenderTime(): number {
    return this.renderTime;
  }

  /**
   * 获取性能统计
   */
  public getPerformanceStats(): {
    renderTime: number;
    passCount: number;
    enabled: boolean;
  } {
    return {
      renderTime: this.renderTime,
      passCount: this.composer.passes.length,
      enabled: this.enabled && this.settings.enabled
    };
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this.composer.dispose();
    
    // 清理自定义着色器
    if (this.tonemapPass) this.tonemapPass.dispose();
    if (this.colorCorrectionPass) this.colorCorrectionPass.dispose();
    if (this.vignettePass) this.vignettePass.dispose();
    if (this.chromaticAberrationPass) this.chromaticAberrationPass.dispose();
    if (this.filmGrainPass) this.filmGrainPass.dispose();
    
    console.log('🧹 后期处理管理器已清理');
  }
}