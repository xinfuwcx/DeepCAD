/**
 * 3D体积云渲染系统 - 1号专家顶级视觉效果
 * 基于THREE.js实现逼真的3D云彩渲染
 * 支持体积云、分层云、动态光照和实时变形
 * 与天气数据完美集成
 */

import * as THREE from 'three';
import { WeatherData } from './OpenMeteoService';

// ======================= 接口定义 =======================

export interface CloudConfig {
  cloudType: 'cumulus' | 'stratus' | 'cirrus' | 'nimbus';
  coverage: number; // 0-1 云层覆盖度
  density: number; // 0-1 云层密度
  altitude: number; // 云层高度
  thickness: number; // 云层厚度
  windSpeed: number; // 风速
  lightIntensity: number; // 光照强度
  animate: boolean; // 是否启用动画
}

export interface VolumetricCloudUniforms {
  time: { value: number };
  cloudCoverage: { value: number };
  cloudDensity: { value: number };
  cloudScale: { value: number };
  windDirection: { value: THREE.Vector3 };
  sunPosition: { value: THREE.Vector3 };
  lightColor: { value: THREE.Color };
  cloudColor: { value: THREE.Color };
  shadowColor: { value: THREE.Color };
}

// ======================= 噪声生成器 =======================

class CloudNoiseGenerator {
  private noiseTexture: THREE.DataTexture;
  private size: number = 128;
  
  constructor() {
    this.generateNoiseTexture();
  }

  private generateNoiseTexture(): void {
    const size = this.size;
    const data = new Uint8Array(size * size * size * 4);
    
    // 3D Perlin噪声实现
    for (let z = 0; z < size; z++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const index = (z * size * size + y * size + x) * 4;
          
          // 多层噪声
          const noise1 = this.noise3D(x * 0.02, y * 0.02, z * 0.02) * 0.5;
          const noise2 = this.noise3D(x * 0.04, y * 0.04, z * 0.04) * 0.3;
          const noise3 = this.noise3D(x * 0.08, y * 0.08, z * 0.08) * 0.2;
          
          const finalNoise = (noise1 + noise2 + noise3) * 0.5 + 0.5;
          
          data[index] = finalNoise * 255;     // R - 主噪声
          data[index + 1] = noise2 * 255;     // G - 细节噪声
          data[index + 2] = noise3 * 255;     // B - 高频噪声
          data[index + 3] = 255;              // A - 不透明度
        }
      }
    }
    
    this.noiseTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    this.noiseTexture.wrapS = THREE.RepeatWrapping;
    this.noiseTexture.wrapT = THREE.RepeatWrapping;
    this.noiseTexture.minFilter = THREE.LinearFilter;
    this.noiseTexture.magFilter = THREE.LinearFilter;
    this.noiseTexture.needsUpdate = true;
  }

  private noise3D(x: number, y: number, z: number): number {
    // 简化的3D噪声函数
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  }

  public getTexture(): THREE.DataTexture {
    return this.noiseTexture;
  }

  public dispose(): void {
    this.noiseTexture.dispose();
  }
}

// ======================= 体积云渲染器 =======================

class VolumetricCloudRenderer {
  private mesh: THREE.Mesh;
  private geometry: THREE.BoxGeometry;
  private material: THREE.ShaderMaterial;
  private uniforms: VolumetricCloudUniforms;
  private noiseGenerator: CloudNoiseGenerator;

  constructor(position: THREE.Vector3, size: THREE.Vector3) {
    this.noiseGenerator = new CloudNoiseGenerator();
    this.createUniforms();
    this.createShaderMaterial();
    this.createGeometry(size);
    this.createMesh(position);
  }

  private createUniforms(): void {
    this.uniforms = {
      time: { value: 0.0 },
      cloudCoverage: { value: 0.5 },
      cloudDensity: { value: 0.8 },
      cloudScale: { value: 1.0 },
      windDirection: { value: new THREE.Vector3(1, 0, 0) },
      sunPosition: { value: new THREE.Vector3(10, 20, 5) },
      lightColor: { value: new THREE.Color(1.0, 0.9, 0.7) },
      cloudColor: { value: new THREE.Color(0.9, 0.9, 1.0) },
      shadowColor: { value: new THREE.Color(0.6, 0.7, 0.8) }
    };
  }

  private createShaderMaterial(): void {
    const vertexShader = `
      varying vec3 vWorldPosition;
      varying vec3 vLocalPosition;
      varying vec3 vViewDirection;
      
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vLocalPosition = position;
        
        vec3 cameraWorldPosition = (inverse(viewMatrix) * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vViewDirection = normalize(worldPosition.xyz - cameraWorldPosition);
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float time;
      uniform float cloudCoverage;
      uniform float cloudDensity;
      uniform float cloudScale;
      uniform vec3 windDirection;
      uniform vec3 sunPosition;
      uniform vec3 lightColor;
      uniform vec3 cloudColor;
      uniform vec3 shadowColor;
      
      varying vec3 vWorldPosition;
      varying vec3 vLocalPosition;
      varying vec3 vViewDirection;
      
      // 3D噪声函数
      float noise3D(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453123);
      }
      
      float fbm(vec3 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        
        for(int i = 0; i < 6; i++) {
          value += amplitude * noise3D(p * frequency);
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        
        return value;
      }
      
      float cloudDensityFunction(vec3 p) {
        // 基础云层形状
        vec3 pos = p * cloudScale;
        pos += windDirection * time * 0.1;
        
        // 多层噪声
        float baseCloud = fbm(pos * 0.5);
        float detailCloud = fbm(pos * 2.0) * 0.5;
        float erosion = fbm(pos * 4.0) * 0.3;
        
        float cloud = baseCloud + detailCloud - erosion;
        
        // 应用覆盖度
        cloud = smoothstep(1.0 - cloudCoverage, 1.0, cloud);
        
        return cloud * cloudDensity;
      }
      
      vec3 calculateLighting(vec3 position, float density) {
        vec3 lightDir = normalize(sunPosition - position);
        
        // 简单的光照计算
        float lightAmount = max(0.0, dot(lightDir, normalize(position)));
        
        // 阴影计算（简化）
        float shadow = 1.0 - density * 0.8;
        
        return mix(shadowColor, lightColor, lightAmount * shadow);
      }
      
      void main() {
        vec3 rayStart = vLocalPosition;
        vec3 rayDirection = normalize(vViewDirection);
        
        // 射线步进参数
        float stepSize = 0.02;
        int maxSteps = 100;
        
        vec3 currentPos = rayStart;
        float totalDensity = 0.0;
        vec3 totalColor = vec3(0.0);
        
        // 射线步进渲染
        for(int i = 0; i < maxSteps; i++) {
          float density = cloudDensityFunction(currentPos);
          
          if(density > 0.01) {
            vec3 lightColor = calculateLighting(currentPos, density);
            
            float alpha = density * stepSize * 10.0;
            alpha = min(alpha, 1.0);
            
            totalColor += lightColor * alpha * (1.0 - totalDensity);
            totalDensity += alpha;
            
            if(totalDensity > 0.95) break;
          }
          
          currentPos += rayDirection * stepSize;
          
          // 边界检查
          if(abs(currentPos.x) > 0.5 || abs(currentPos.y) > 0.5 || abs(currentPos.z) > 0.5) break;
        }
        
        // 与天空色混合
        vec3 skyColor = mix(vec3(0.4, 0.7, 1.0), vec3(1.0, 0.8, 0.6), 
                           max(0.0, dot(normalize(vViewDirection), normalize(sunPosition))));
        
        vec3 finalColor = mix(skyColor, totalColor, totalDensity);
        
        gl_FragColor = vec4(finalColor, totalDensity);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
  }

  private createGeometry(size: THREE.Vector3): void {
    this.geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  }

  private createMesh(position: THREE.Vector3): void {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(position);
    this.mesh.userData = { type: 'volumetric_cloud' };
  }

  public update(deltaTime: number): void {
    this.uniforms.time.value += deltaTime;
  }

  public setCoverage(coverage: number): void {
    this.uniforms.cloudCoverage.value = coverage;
  }

  public setDensity(density: number): void {
    this.uniforms.cloudDensity.value = density;
  }

  public setWindDirection(direction: THREE.Vector3): void {
    this.uniforms.windDirection.value.copy(direction);
  }

  public setSunPosition(position: THREE.Vector3): void {
    this.uniforms.sunPosition.value.copy(position);
  }

  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.noiseGenerator.dispose();
  }
}

// ======================= 2D分层云系统 =======================

class LayeredCloudSystem {
  private cloudLayers: THREE.Mesh[] = [];
  private scene: THREE.Scene;
  private boundingBox: THREE.Box3;

  constructor(scene: THREE.Scene, boundingBox: THREE.Box3) {
    this.scene = scene;
    this.boundingBox = boundingBox;
    this.createCloudLayers();
  }

  private createCloudLayers(): void {
    const layerCount = 3;
    const center = this.boundingBox.getCenter(new THREE.Vector3());
    const size = this.boundingBox.getSize(new THREE.Vector3());

    for (let i = 0; i < layerCount; i++) {
      const altitude = center.y + size.y * 0.3 + i * 15;
      const layer = this.createCloudLayer(altitude, i);
      this.cloudLayers.push(layer);
      this.scene.add(layer);
    }
  }

  private createCloudLayer(altitude: number, layerIndex: number): THREE.Mesh {
    const size = this.boundingBox.getSize(new THREE.Vector3());
    const geometry = new THREE.PlaneGeometry(size.x * 2, size.z * 2, 32, 32);
    
    // 创建云层纹理
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d')!;
    
    // 绘制云层
    this.drawCloudTexture(context, layerIndex);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.6 - layerIndex * 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = altitude;
    mesh.rotation.x = -Math.PI / 2;
    mesh.userData = { 
      type: 'cloud_layer',
      layerIndex,
      initialY: altitude
    };
    
    return mesh;
  }

  private drawCloudTexture(context: CanvasRenderingContext2D, layerIndex: number): void {
    const width = context.canvas.width;
    const height = context.canvas.height;
    
    // 清空画布
    context.clearRect(0, 0, width, height);
    
    // 创建径向渐变作为云基础
    const cloudCount = 20 + layerIndex * 10;
    
    for (let i = 0; i < cloudCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = 30 + Math.random() * (80 - layerIndex * 20);
      
      const gradient = context.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 - layerIndex * 0.2})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.4 - layerIndex * 0.1})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      context.fillStyle = gradient;
      context.fillRect(x - size, y - size, size * 2, size * 2);
    }
  }

  public update(deltaTime: number, windSpeed: number = 1): void {
    this.cloudLayers.forEach((layer, index) => {
      // 云层漂移
      layer.position.x += windSpeed * deltaTime * (0.5 + index * 0.2);
      layer.position.z += windSpeed * deltaTime * 0.3;
      
      // 重置位置避免漂移过远
      const size = this.boundingBox.getSize(new THREE.Vector3());
      if (layer.position.x > size.x) layer.position.x = -size.x;
      if (layer.position.z > size.z) layer.position.z = -size.z;
    });
  }

  public setCoverage(coverage: number): void {
    this.cloudLayers.forEach((layer, index) => {
      const material = layer.material as THREE.MeshBasicMaterial;
      material.opacity = coverage * (0.6 - index * 0.1);
      layer.visible = coverage > 0.1;
    });
  }

  public dispose(): void {
    this.cloudLayers.forEach(layer => {
      this.scene.remove(layer);
      layer.geometry.dispose();
      if (layer.material instanceof THREE.Material) {
        layer.material.dispose();
        if (layer.material.map) {
          layer.material.map.dispose();
        }
      }
    });
    this.cloudLayers = [];
  }
}

// ======================= 主云渲染系统 =======================

export class CloudRenderingSystem {
  private scene: THREE.Scene;
  private volumetricClouds: VolumetricCloudRenderer[] = [];
  private layeredClouds: LayeredCloudSystem | null = null;
  private boundingBox: THREE.Box3;
  private config: CloudConfig;
  private sunPosition: THREE.Vector3 = new THREE.Vector3(10, 20, 5);

  constructor(scene: THREE.Scene, boundingBox: THREE.Box3) {
    this.scene = scene;
    this.boundingBox = boundingBox;
    this.config = {
      cloudType: 'cumulus',
      coverage: 0.5,
      density: 0.7,
      altitude: 20,
      thickness: 10,
      windSpeed: 1.0,
      lightIntensity: 1.0,
      animate: true
    };

    console.log('☁️ 3D云渲染系统初始化完成');
  }

  public createVolumetricClouds(count: number = 5): void {
    // 清理现有云
    this.clearVolumetricClouds();
    
    const center = this.boundingBox.getCenter(new THREE.Vector3());
    const size = this.boundingBox.getSize(new THREE.Vector3());
    
    for (let i = 0; i < count; i++) {
      const position = new THREE.Vector3(
        center.x + (Math.random() - 0.5) * size.x * 1.5,
        center.y + this.config.altitude + Math.random() * this.config.thickness,
        center.z + (Math.random() - 0.5) * size.z * 1.5
      );
      
      const cloudSize = new THREE.Vector3(
        15 + Math.random() * 10,
        8 + Math.random() * 5,
        15 + Math.random() * 10
      );
      
      const cloud = new VolumetricCloudRenderer(position, cloudSize);
      cloud.setCoverage(this.config.coverage);
      cloud.setDensity(this.config.density);
      cloud.setSunPosition(this.sunPosition);
      
      this.volumetricClouds.push(cloud);
      this.scene.add(cloud.getMesh());
    }
    
    console.log(`☁️ 创建了 ${count} 个体积云`);
  }

  public createLayeredClouds(): void {
    if (this.layeredClouds) {
      this.layeredClouds.dispose();
    }
    
    this.layeredClouds = new LayeredCloudSystem(this.scene, this.boundingBox);
    console.log('☁️ 创建了分层云系统');
  }

  public updateFromWeatherData(weatherData: WeatherData): void {
    // 根据天气数据更新云层
    const condition = weatherData.current?.description?.toLowerCase() || '';
    
    if (condition.includes('晴') || condition.includes('clear')) {
      this.config.coverage = 0.2;
      this.config.cloudType = 'cirrus';
    } else if (condition.includes('多云') || condition.includes('partly')) {
      this.config.coverage = 0.5;
      this.config.cloudType = 'cumulus';
    } else if (condition.includes('阴') || condition.includes('overcast')) {
      this.config.coverage = 0.8;
      this.config.cloudType = 'stratus';
    } else if (condition.includes('雨') || condition.includes('rain')) {
      this.config.coverage = 0.9;
      this.config.cloudType = 'nimbus';
    }
    
    // 更新风速
    this.config.windSpeed = weatherData.windSpeed * 0.1;
    
    // 应用设置
    this.applyCoverage(this.config.coverage);
    
    console.log(`☁️ 根据天气更新云层: ${condition}, 覆盖度: ${this.config.coverage}`);
  }

  public applyCoverage(coverage: number): void {
    this.config.coverage = coverage;
    
    // 更新体积云
    this.volumetricClouds.forEach(cloud => {
      cloud.setCoverage(coverage);
      cloud.getMesh().visible = coverage > 0.1;
    });
    
    // 更新分层云
    if (this.layeredClouds) {
      this.layeredClouds.setCoverage(coverage);
    }
  }

  public setDensity(density: number): void {
    this.config.density = density;
    this.volumetricClouds.forEach(cloud => {
      cloud.setDensity(density);
    });
  }

  public setSunPosition(position: THREE.Vector3): void {
    this.sunPosition.copy(position);
    this.volumetricClouds.forEach(cloud => {
      cloud.setSunPosition(position);
    });
  }

  public update(deltaTime: number): void {
    if (!this.config.animate) return;
    
    // 更新体积云
    this.volumetricClouds.forEach(cloud => {
      cloud.update(deltaTime);
    });
    
    // 更新分层云
    if (this.layeredClouds) {
      this.layeredClouds.update(deltaTime, this.config.windSpeed);
    }
  }

  public setCloudType(type: CloudConfig['cloudType']): void {
    this.config.cloudType = type;
    
    // 根据云类型调整参数
    switch (type) {
      case 'cumulus':
        this.config.density = 0.8;
        this.config.altitude = 15;
        break;
      case 'stratus':
        this.config.density = 0.6;
        this.config.altitude = 10;
        break;
      case 'cirrus':
        this.config.density = 0.3;
        this.config.altitude = 30;
        break;
      case 'nimbus':
        this.config.density = 0.9;
        this.config.altitude = 8;
        break;
    }
    
    this.setDensity(this.config.density);
  }

  private clearVolumetricClouds(): void {
    this.volumetricClouds.forEach(cloud => {
      this.scene.remove(cloud.getMesh());
      cloud.dispose();
    });
    this.volumetricClouds = [];
  }

  public getConfig(): CloudConfig {
    return { ...this.config };
  }

  public dispose(): void {
    this.clearVolumetricClouds();
    
    if (this.layeredClouds) {
      this.layeredClouds.dispose();
    }
    
    console.log('🗑️ 云渲染系统已清理');
  }
}

export default CloudRenderingSystem;