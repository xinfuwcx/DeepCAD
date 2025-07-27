import * as THREE from 'three';

/**
 * EnhancedRenderer 扩展了 Three.js 的 WebGLRenderer，
 * 增加了对数深度缓冲、电影级色调映射和自适应像素比等高级功能，
 * 专为高质量的科学可视化而设计。
 */
export class EnhancedRenderer extends THREE.WebGLRenderer {
  /**
   * @param options - WebGLRenderer 的标准选项。
   */
  constructor(options?: THREE.WebGLRendererParameters) {
    super({
      ...options,
      powerPreference: 'high-performance', // 优先使用高性能GPU
      logarithmicDepthBuffer: true, // 解决Z-fighting问题，对大规模场景至关重要
    });

    this.configureRenderer();
  }

  private configureRenderer(): void {
    // 注意：physicallyCorrectLights 在新版Three.js中已被移除，现在默认启用

    // 设置电影级的ACES Filmic色调映射，提供更广的动态范围和更自然的色彩
    this.toneMapping = THREE.ACESFilmicToneMapping;
    this.toneMappingExposure = 1.0;

    // 默认启用阴影
    this.shadowMap.enabled = true;
    this.shadowMap.type = THREE.PCFSoftShadowMap; // 提供柔和的阴影边缘

    // 设置输出编码
    this.outputColorSpace = THREE.SRGBColorSpace;
  }

  /**
   * 根据设备像素比和性能要求动态调整渲染的像素比。
   * @param level - 性能级别 ('high', 'medium', 'low')。
   *                'high' 将使用设备的最大像素比，'medium' 会限制在1.5，'low' 会限制在1。
   */
  public setAdaptivePixelRatio(level: 'high' | 'medium' | 'low' = 'high'): void {
    const maxPixelRatio = window.devicePixelRatio || 1;
    let targetRatio: number;

    switch (level) {
      case 'high':
        targetRatio = maxPixelRatio;
        break;
      case 'medium':
        targetRatio = Math.min(maxPixelRatio, 1.5);
        break;
      case 'low':
        targetRatio = 1;
        break;
      default:
        targetRatio = Math.min(maxPixelRatio, 1.5);
    }
    
    this.setPixelRatio(targetRatio);
    console.log(`Adaptive pixel ratio set to: ${targetRatio}`);
  }

  /**
   * 调整渲染器的大小并更新相机宽高比。
   * @param width - 新的宽度。
   * @param height - 新的高度。
   * @param camera - 需要更新宽高比的相机。
   */
  public resize(width: number, height: number, camera?: THREE.PerspectiveCamera | THREE.OrthographicCamera): void {
    this.setSize(width, height);
    if (camera) {
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = width / height;
      } else if (camera instanceof THREE.OrthographicCamera) {
        // 更新正交相机的视锥
        const aspect = width / height;
        camera.left = -camera.right * aspect;
        camera.right = camera.right;
        camera.top = camera.top;
        camera.bottom = -camera.top;
      }
      camera.updateProjectionMatrix();
    }
  }
} 