/**
 * 现代化3D视口后处理效果系统
 * 提升画面质量和视觉体验
 */
import * as THREE from 'three';

export class PostProcessingEffects {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private composer?: any; // 避免引入完整的后处理库
  
  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }

  /**
   * 初始化后处理效果
   */
  init() {
    // 启用基本的渲染优化
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // 色彩空间和色调映射
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    // 抗锯齿
    this.renderer.antialias = true;
    
    // 物理正确的光照
    this.renderer.useLegacyLights = false;
    
    console.log('PostProcessingEffects: 基础后处理效果已启用');
  }

  /**
   * 添加环境反射
   */
  addEnvironmentReflection() {
    // 创建环境贴图
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    
    // 创建简单的天空盒
    const skyColor = new THREE.Color(0x87ceeb);
    const groundColor = new THREE.Color(0x2d3748);
    
    const hemisphere = new THREE.HemisphereLight(skyColor, groundColor, 0.6);
    this.scene.add(hemisphere);
    
    // 设置环境贴图
    this.scene.environment = pmremGenerator.fromScene(this.createSkybox()).texture;
    
    pmremGenerator.dispose();
  }

  /**
   * 创建简单的天空盒
   */
  private createSkybox(): THREE.Scene {
    const skyboxScene = new THREE.Scene();
    
    const geometry = new THREE.SphereGeometry(100, 32, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077be) },
        bottomColor: { value: new THREE.Color(0x89b2d1) },
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
      `,
      side: THREE.BackSide
    });
    
    const skybox = new THREE.Mesh(geometry, material);
    skyboxScene.add(skybox);
    
    return skyboxScene;
  }

  /**
   * 添加辉光效果
   */
  addGlowEffect(objects: THREE.Object3D[]) {
    objects.forEach(obj => {
      if (obj instanceof THREE.Mesh) {
        // 为发光对象添加边缘光效果
        const material = obj.material as THREE.Material;
        if ('emissive' in material) {
          (material as any).emissive.setHex(0x004466);
          (material as any).emissiveIntensity = 0.2;
        }
      }
    });
  }

  /**
   * 更新动画效果
   */
  update(deltaTime: number) {
    const time = performance.now() * 0.001;
    
    // 更新光照动画
    const lights = this.scene.children.filter(child => child.type === 'PointLight');
    lights.forEach((light, index) => {
      if ('intensity' in light) {
        const baseIntensity = 0.8;
        const variation = Math.sin(time * 2 + index) * 0.1;
        (light as any).intensity = baseIntensity + variation;
      }
    });
    
    // 更新材质动画
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const material = object.material;
        if (material instanceof THREE.MeshPhysicalMaterial) {
          if (material.name === 'animated') {
            material.transmission = 0.9 + Math.sin(time) * 0.05;
            material.ior = 1.5 + Math.sin(time * 0.5) * 0.1;
          }
        }
      }
    });
  }

  /**
   * 清理资源
   */
  dispose() {
    // 清理后处理相关资源
    if (this.composer) {
      this.composer.dispose();
    }
    console.log('PostProcessingEffects: 资源已清理');
  }
}
