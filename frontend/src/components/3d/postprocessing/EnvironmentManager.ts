import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

export interface EnvironmentSettings {
  enabled: boolean;
  type: 'hdri' | 'procedural' | 'gradient';
  intensity: number;
  rotation: number;
  background: {
    enabled: boolean;
    blur: number;
    opacity: number;
  };
  lighting: {
    enabled: boolean;
    intensity: number;
    castShadows: boolean;
  };
}

export interface ProceduralSkySettings {
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  elevation: number;
  azimuth: number;
  exposure: number;
}

export interface HDRIEnvironment {
  name: string;
  url: string;
  intensity: number;
  rotation: number;
  resolution: number;
  format: 'hdr' | 'exr';
}

/**
 * 环境管理器
 * 管理HDR环境贴图、程序化天空、环境光照等
 */
export class EnvironmentManager {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private pmremGenerator: THREE.PMREMGenerator;
  
  // 环境相关
  private currentEnvironment?: THREE.Texture;
  private backgroundTexture?: THREE.Texture;
  
  // 加载器
  private rgbeLoader: RGBELoader;
  private exrLoader: EXRLoader;
  
  // 程序化天空
  private skyShader?: THREE.ShaderMaterial;
  private skyGeometry?: THREE.SphereGeometry;
  private skyMesh?: THREE.Mesh;
  
  // 设置
  private settings: EnvironmentSettings;
  
  // 预设环境
  public static readonly PRESET_ENVIRONMENTS: HDRIEnvironment[] = [
    {
      name: '工作室',
      url: '/assets/hdri/studio.hdr',
      intensity: 1.0,
      rotation: 0,
      resolution: 1024,
      format: 'hdr'
    },
    {
      name: '室外白天',
      url: '/assets/hdri/outdoor_day.hdr',
      intensity: 1.2,
      rotation: 0,
      resolution: 2048,
      format: 'hdr'
    },
    {
      name: '室外夜晚',
      url: '/assets/hdri/outdoor_night.hdr',
      intensity: 0.8,
      rotation: 0,
      resolution: 1024,
      format: 'hdr'
    },
    {
      name: '仓库',
      url: '/assets/hdri/warehouse.hdr',
      intensity: 1.5,
      rotation: 90,
      resolution: 1024,
      format: 'hdr'
    }
  ];

  constructor(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    options: {
      settings?: Partial<EnvironmentSettings>;
    } = {}
  ) {
    this.scene = scene;
  this.renderer = renderer;
  this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();

    // 初始化加载器
    this.rgbeLoader = new RGBELoader();
    this.exrLoader = new EXRLoader();

    // 默认设置
    this.settings = {
      // 默认禁用环境与背景，遵循“去天空/去skybox”的全局策略；需要时显式开启
      enabled: false,
      type: 'hdri',
      intensity: 1.0,
      rotation: 0,
      background: {
        enabled: false,
        blur: 0.1,
        opacity: 1.0
      },
      lighting: {
        enabled: false,
        intensity: 1.0,
        castShadows: true
      },
      ...options.settings
    };

    console.log('🌍 环境管理器初始化完成');
  }

  /**
   * 加载HDRI环境
   */
  public async loadHDRIEnvironment(url: string, format: 'hdr' | 'exr' = 'hdr'): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const loader = format === 'hdr' ? this.rgbeLoader : this.exrLoader;
      
      loader.load(
        url,
        (texture) => {
          // 生成环境贴图
          const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
          texture.dispose();
          
          this.currentEnvironment = envMap;
          this.applyEnvironment();
          
          console.log(`✅ HDRI环境已加载: ${url}`);
          resolve(envMap);
        },
        (progress) => {
          console.log(`🔄 HDRI加载进度: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
        },
        (error) => {
          console.error('❌ HDRI加载失败:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * 创建程序化天空
   */
  public createProceduralSky(skySettings: Partial<ProceduralSkySettings> = {}): void {
    const settings: ProceduralSkySettings = {
      turbidity: 10,
      rayleigh: 3,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.7,
      elevation: 2,
      azimuth: 180,
      exposure: 0.5,
      ...skySettings
    };

    // 创建天空着色器
    const skyShader = {
      uniforms: {
        turbidity: { value: settings.turbidity },
        rayleigh: { value: settings.rayleigh },
        mieCoefficient: { value: settings.mieCoefficient },
        mieDirectionalG: { value: settings.mieDirectionalG },
        sunPosition: { value: new THREE.Vector3() },
        up: { value: new THREE.Vector3(0, 1, 0) }
      },
      vertexShader: `
        uniform vec3 sunPosition;
        uniform float rayleigh;
        uniform float turbidity;
        uniform float mieCoefficient;
        uniform vec3 up;

        varying vec3 vWorldPosition;
        varying vec3 vSunDirection;
        varying float vSunfade;
        varying vec3 vBetaR;
        varying vec3 vBetaM;
        varying float vSunE;

        const vec3 lambda = vec3(680E-9, 550E-9, 450E-9);
        const vec3 totalRayleigh = vec3(5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5);
        const float v = 4.0;
        const vec3 K = vec3(0.686, 0.678, 0.666);
        const vec3 MieConst = vec3(1.8395, 2.7408, 4.0785);

        const float cutoffAngle = 1.6110731556870734;
        const float steepness = 1.5;
        const float EE = 1000.0;

        float sunIntensity(float zenithAngleCos) {
          zenithAngleCos = clamp(zenithAngleCos, -1.0, 1.0);
          return EE * max(0.0, 1.0 - pow(1.0 - zenithAngleCos, steepness));
        }

        vec3 totalMie(float T) {
          float c = (0.2 * T) * 10E-18;
          return 0.434 * c * MieConst;
        }

        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

          vSunDirection = normalize(sunPosition);

          vSunE = sunIntensity(dot(vSunDirection, up));

          vSunfade = 1.0 - clamp(1.0 - exp((sunPosition.y / 450000.0)), 0.0, 1.0);

          float rayleighCoefficient = rayleigh - (1.0 * (1.0 - vSunfade));

          vBetaR = totalRayleigh * rayleighCoefficient;

          vBetaM = totalMie(turbidity) * mieCoefficient;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPosition;
        varying vec3 vSunDirection;
        varying float vSunfade;
        varying vec3 vBetaR;
        varying vec3 vBetaM;
        varying float vSunE;

        uniform float mieDirectionalG;
        uniform vec3 up;

        const vec3 cameraPos = vec3(0.0, 0.0, 0.0);

        const float pi = 3.141592653589793;

        float rayleighPhase(float cosTheta) {
          return (3.0 / (16.0 * pi)) * (1.0 + pow(cosTheta, 2.0));
        }

        float hgPhase(float cosTheta, float g) {
          float g2 = pow(g, 2.0);
          float inverse = 1.0 / pow(1.0 - 2.0 * g * cosTheta + g2, 1.5);
          return (1.0 / (4.0 * pi)) * ((1.0 - g2) * inverse);
        }

        void main() {
          vec3 direction = normalize(vWorldPosition - cameraPos);

          float zenithAngle = acos(max(0.0, dot(up, direction)));
          float inverse = 1.0 / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));
          float sR = rayleigh / inverse;
          float sM = mieCoefficient / inverse;

          vec3 Fex = exp(-(vBetaR * sR + vBetaM * sM));

          float cosTheta = dot(direction, vSunDirection);

          float rPhase = rayleighPhase(cosTheta * 0.5 + 0.5);
          vec3 betaRTheta = vBetaR * rPhase;

          float mPhase = hgPhase(cosTheta, mieDirectionalG);
          vec3 betaMTheta = vBetaM * mPhase;

          vec3 Lin = pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * (1.0 - Fex), vec3(1.5));
          Lin *= mix(vec3(1.0), pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * Fex, vec3(1.0 / 2.0)), clamp(pow(1.0 - dot(up, vSunDirection), 5.0), 0.0, 1.0));

          vec3 direction2 = normalize(direction - vSunDirection);
          float theta2 = dot(direction, up) / length(direction);
          float phi2 = atan(direction2.x, direction2.z);
          vec2 uv2 = vec2(phi2, theta2) * vec2(0.5, 1.0) + vec2(0.5, 0.0);

          vec3 L0 = vec3(0.1) * Fex;

          const float sunAngularDiameterCos = 0.999956994; // ~0.53 degrees
          float sundisk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta);
          L0 += (vSunE * 19000.0 * Fex) * sundisk;

          vec3 color = (Lin + L0) * 0.04 + vec3(0.0, 0.0003, 0.00075);

          color = pow(color, vec3(1.0 / (1.2 + (1.2 * vSunfade))));

          gl_FragColor = vec4(color, 1.0);
        }
      `
    };

    // 计算太阳位置
    const phi = THREE.MathUtils.degToRad(90 - settings.elevation);
    const theta = THREE.MathUtils.degToRad(settings.azimuth);
    const sunPosition = new THREE.Vector3();
    sunPosition.setFromSphericalCoords(1, phi, theta);

    // 创建天空材质和几何体
    this.skyShader = new THREE.ShaderMaterial({
      uniforms: skyShader.uniforms,
      vertexShader: skyShader.vertexShader,
      fragmentShader: skyShader.fragmentShader,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.skyShader.uniforms.sunPosition.value.copy(sunPosition);

    this.skyGeometry = new THREE.SphereGeometry(450000, 32, 15);
    this.skyMesh = new THREE.Mesh(this.skyGeometry, this.skyShader);

    // 添加到场景
    this.scene.add(this.skyMesh);

    // 生成环境贴图
    this.generateSkyEnvironmentMap();

    console.log('✅ 程序化天空已创建');
  }

  /**
   * 生成天空环境贴图
   */
  private generateSkyEnvironmentMap(): void {
    if (!this.skyMesh) return;

    // 临时渲染场景
    const tempScene = new THREE.Scene();
    tempScene.add(this.skyMesh.clone());

  // Render to envMap using PMREM without creating a dedicated camera reference
  const envMap = this.pmremGenerator.fromScene(tempScene).texture;

    this.currentEnvironment = envMap;
    this.applyEnvironment();
  }

  /**
   * 创建渐变背景
   */
  public createGradientBackground(
    topColor: THREE.Color = new THREE.Color(0x87CEEB),
    bottomColor: THREE.Color = new THREE.Color(0xFFFFFF)
  ): void {
    const gradientShader = {
      uniforms: {
        topColor: { value: topColor },
        bottomColor: { value: bottomColor },
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;

        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `
    };

    const skyGeometry = new THREE.SphereGeometry(450000, 32, 15);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: gradientShader.uniforms,
      vertexShader: gradientShader.vertexShader,
      fragmentShader: gradientShader.fragmentShader,
      side: THREE.BackSide,
      depthWrite: false
    });

    if (this.skyMesh) {
      this.scene.remove(this.skyMesh);
    }

    this.skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(this.skyMesh);

    console.log('✅ 渐变背景已创建');
  }

  /**
   * 应用环境设置
   */
  private applyEnvironment(): void {
    if (!this.currentEnvironment) return;

    // 设置环境强度（保存到用户数据）
    this.currentEnvironment.userData.intensity = this.settings.intensity;

    // 应用环境光照
    if (this.settings.lighting.enabled) {
      this.scene.environment = this.currentEnvironment;
    } else {
      this.scene.environment = null;
    }

    // 设置背景
    if (this.settings.background.enabled) {
      if (this.settings.background.blur > 0) {
        // 创建模糊背景
        const blurredBackground = this.createBlurredBackground(this.currentEnvironment);
        this.scene.background = blurredBackground;
      } else {
        this.scene.background = this.currentEnvironment;
      }
    } else {
      this.scene.background = null;
    }
  }

  /**
   * 创建模糊背景
   */
  private createBlurredBackground(envMap: THREE.Texture): THREE.Texture {
    // 简单的背景模糊实现
    // 实际应用中可能需要更复杂的模糊算法
  // Note: Simplified; real blur would render to target with shader pass
    return envMap; // 简化实现
  }

  /**
   * 设置环境强度
   */
  public setIntensity(intensity: number): void {
    this.settings.intensity = intensity;
    if (this.currentEnvironment) {
      this.currentEnvironment.userData.intensity = intensity;
    }
  }

  /**
   * 设置环境旋转
   */
  public setRotation(rotation: number): void {
    this.settings.rotation = rotation;
    if (this.currentEnvironment) {
      // 应用旋转变换
      const matrix4 = new THREE.Matrix4();
      matrix4.makeRotationY(THREE.MathUtils.degToRad(rotation));
      const matrix3 = new THREE.Matrix3();
      matrix3.setFromMatrix4(matrix4);
      this.currentEnvironment.matrix = matrix3;
    }
  }

  /**
   * 更新设置
   */
  public updateSettings(settings: Partial<EnvironmentSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.applyEnvironment();
  }

  /**
   * 获取设置
   */
  public getSettings(): EnvironmentSettings {
    return { ...this.settings };
  }

  /**
   * 获取当前环境
   */
  public getCurrentEnvironment(): THREE.Texture | undefined {
    return this.currentEnvironment;
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    // 清理PMREM生成器
    this.pmremGenerator.dispose();

    // 清理环境贴图
    if (this.currentEnvironment) {
      this.currentEnvironment.dispose();
    }

    // 清理天空
    if (this.skyMesh) {
      this.scene.remove(this.skyMesh);
      this.skyGeometry?.dispose();
      this.skyShader?.dispose();
    }

    // 清理背景
    if (this.backgroundTexture) {
      this.backgroundTexture.dispose();
    }

    console.log('🧹 环境管理器已清理');
  }
}