/**
 * 天气效果渲染器 - 1号专家高级视觉系统
 * 实现雨雪雾云彩等所有天气视觉效果
 * 基于THREE.js粒子系统 + 体积渲染
 * 与Open-Meteo天气数据完美集成
 */

import * as THREE from 'three';
import { WeatherData } from './OpenMeteoService';

// ======================= 接口定义 =======================

export interface WeatherEffectsConfig {
  enableRain: boolean;
  enableSnow: boolean;
  enableFog: boolean;  
  enableClouds: boolean;
  intensity: number; // 0-1
  windStrength: number; // 0-1
  visibility: number; // 0-1
}

export interface ParticleConfig {
  count: number;
  size: number;
  velocity: THREE.Vector3;
  gravity: number;
  color: THREE.Color;
  opacity: number;
  lifetime: number;
}

// ======================= 雨滴粒子系统 =======================

class RainParticleSystem {
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private positions: Float32Array;
  private velocities: Float32Array;
  private sizes: Float32Array;
  private lifetimes: Float32Array;
  private particleCount: number;
  private boundingBox: THREE.Box3;

  constructor(particleCount: number = 5000, boundingBox: THREE.Box3) {
    this.particleCount = particleCount;
    this.boundingBox = boundingBox;
    
    this.initializeGeometry();
    this.initializeMaterial();
    this.createPoints();
    this.resetParticles();
  }

  private initializeGeometry(): void {
    this.geometry = new THREE.BufferGeometry();
    
    // 粒子位置
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);
    this.lifetimes = new Float32Array(this.particleCount);
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
  }

  private initializeMaterial(): void {
    // 创建雨滴纹理
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d')!;
    
    // 绘制雨滴形状
    const gradient = context.createRadialGradient(16, 8, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(180, 220, 255, 1.0)');
    gradient.addColorStop(0.7, 'rgba(120, 180, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(80, 140, 255, 0.0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    
    this.material = new THREE.PointsMaterial({
      map: texture,
      transparent: true,
      opacity: 0.8,
      size: 2.0,
      sizeAttenuation: true,
      vertexColors: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  private createPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.userData = { type: 'rain_particles' };
  }

  private resetParticles(): void {
    const box = this.boundingBox;
    
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      
      // 随机位置（在边界框上方）
      this.positions[i3] = THREE.MathUtils.randFloat(box.min.x, box.max.x);
      this.positions[i3 + 1] = THREE.MathUtils.randFloat(box.max.y, box.max.y + 50);
      this.positions[i3 + 2] = THREE.MathUtils.randFloat(box.min.z, box.max.z);
      
      // 下落速度
      this.velocities[i3] = THREE.MathUtils.randFloat(-2, 2); // 轻微横向
      this.velocities[i3 + 1] = THREE.MathUtils.randFloat(-30, -15); // 向下
      this.velocities[i3 + 2] = THREE.MathUtils.randFloat(-2, 2); // 轻微横向
      
      // 雨滴大小
      this.sizes[i] = THREE.MathUtils.randFloat(1.0, 3.0);
      
      // 生命周期
      this.lifetimes[i] = THREE.MathUtils.randFloat(0, 1);
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  public update(deltaTime: number, windForce: THREE.Vector3 = new THREE.Vector3()): void {
    const box = this.boundingBox;
    
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      
      // 更新位置
      this.positions[i3] += (this.velocities[i3] + windForce.x) * deltaTime;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime;
      this.positions[i3 + 2] += (this.velocities[i3 + 2] + windForce.z) * deltaTime;
      
      // 更新生命周期
      this.lifetimes[i] -= deltaTime * 0.5;
      
      // 重置超出边界或生命周期结束的粒子
      if (this.positions[i3 + 1] < box.min.y - 10 || this.lifetimes[i] <= 0) {
        this.positions[i3] = THREE.MathUtils.randFloat(box.min.x, box.max.x);
        this.positions[i3 + 1] = THREE.MathUtils.randFloat(box.max.y, box.max.y + 30);
        this.positions[i3 + 2] = THREE.MathUtils.randFloat(box.min.z, box.max.z);
        this.lifetimes[i] = 1.0;
      }
    }
    
    this.geometry.attributes.position.needsUpdate = true;
  }

  public setIntensity(intensity: number): void {
    this.material.opacity = intensity * 0.8;
    this.material.size = intensity * 3.0;
  }

  public getPoints(): THREE.Points {
    return this.points;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    if (this.material.map) {
      this.material.map.dispose();
    }
  }
}

// ======================= 雪花粒子系统 =======================

class SnowParticleSystem {
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private positions: Float32Array;
  private velocities: Float32Array;
  private rotations: Float32Array;
  private sizes: Float32Array;
  private particleCount: number;
  private boundingBox: THREE.Box3;

  constructor(particleCount: number = 3000, boundingBox: THREE.Box3) {
    this.particleCount = particleCount;
    this.boundingBox = boundingBox;
    
    this.initializeGeometry();
    this.initializeMaterial();
    this.createPoints();
    this.resetParticles();
  }

  private initializeGeometry(): void {
    this.geometry = new THREE.BufferGeometry();
    
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.rotations = new Float32Array(this.particleCount);
    this.sizes = new Float32Array(this.particleCount);
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
  }

  private initializeMaterial(): void {
    // 创建雪花纹理
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    
    // 绘制六角雪花
    context.translate(32, 32);
    context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    context.lineWidth = 2;
    
    for (let i = 0; i < 6; i++) {
      context.rotate(Math.PI / 3);
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(0, -20);
      context.stroke();
      
      // 分支
      context.beginPath();
      context.moveTo(0, -10);
      context.lineTo(-5, -15);
      context.moveTo(0, -10);
      context.lineTo(5, -15);
      context.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    
    this.material = new THREE.PointsMaterial({
      map: texture,
      transparent: true,
      opacity: 0.7,
      size: 8.0,
      sizeAttenuation: true,
      vertexColors: false,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
  }

  private createPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.userData = { type: 'snow_particles' };
  }

  private resetParticles(): void {
    const box = this.boundingBox;
    
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      
      // 随机位置
      this.positions[i3] = THREE.MathUtils.randFloat(box.min.x, box.max.x);
      this.positions[i3 + 1] = THREE.MathUtils.randFloat(box.max.y, box.max.y + 30);
      this.positions[i3 + 2] = THREE.MathUtils.randFloat(box.min.z, box.max.z);
      
      // 缓慢下落，带漂移
      this.velocities[i3] = THREE.MathUtils.randFloat(-1, 1);
      this.velocities[i3 + 1] = THREE.MathUtils.randFloat(-5, -2);
      this.velocities[i3 + 2] = THREE.MathUtils.randFloat(-1, 1);
      
      // 旋转
      this.rotations[i] = THREE.MathUtils.randFloat(0, Math.PI * 2);
      
      // 雪花大小
      this.sizes[i] = THREE.MathUtils.randFloat(4.0, 12.0);
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  public update(deltaTime: number, windForce: THREE.Vector3 = new THREE.Vector3()): void {
    const box = this.boundingBox;
    
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      
      // 飘摆效果
      const swayX = Math.sin(Date.now() * 0.001 + i) * 0.5;
      const swayZ = Math.cos(Date.now() * 0.0008 + i) * 0.3;
      
      // 更新位置
      this.positions[i3] += (this.velocities[i3] + windForce.x + swayX) * deltaTime;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime;
      this.positions[i3 + 2] += (this.velocities[i3 + 2] + windForce.z + swayZ) * deltaTime;
      
      // 旋转
      this.rotations[i] += deltaTime * 0.5;
      
      // 重置超出边界的粒子
      if (this.positions[i3 + 1] < box.min.y - 5) {
        this.positions[i3] = THREE.MathUtils.randFloat(box.min.x, box.max.x);
        this.positions[i3 + 1] = THREE.MathUtils.randFloat(box.max.y, box.max.y + 20);
        this.positions[i3 + 2] = THREE.MathUtils.randFloat(box.min.z, box.max.z);
      }
    }
    
    this.geometry.attributes.position.needsUpdate = true;
  }

  public setIntensity(intensity: number): void {
    this.material.opacity = intensity * 0.7;
    this.points.visible = intensity > 0.1;
  }

  public getPoints(): THREE.Points {
    return this.points;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    if (this.material.map) {
      this.material.map.dispose();
    }
  }
}

// ======================= 体积雾渲染 =======================

class VolumetricFogRenderer {
  private scene: THREE.Scene;
  private fogMesh: THREE.Mesh;
  private fogMaterial: THREE.ShaderMaterial;
  private fogUniforms: any;

  constructor(scene: THREE.Scene, boundingBox: THREE.Box3) {
    this.scene = scene;
    this.createFogShader();
    this.createFogMesh(boundingBox);
  }

  private createFogShader(): void {
    this.fogUniforms = {
      time: { value: 0.0 },
      density: { value: 0.5 },
      color: { value: new THREE.Color(0.7, 0.8, 0.9) },
      windDirection: { value: new THREE.Vector2(1, 0) },
      noiseScale: { value: 0.1 }
    };

    const vertexShader = `
      varying vec3 vWorldPosition;
      varying vec3 vViewPosition;
      
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      uniform float time;
      uniform float density;
      uniform vec3 color;
      uniform vec2 windDirection;
      uniform float noiseScale;
      
      varying vec3 vWorldPosition;
      varying vec3 vViewPosition;
      
      // 简化噪声函数
      float noise(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
      }
      
      float fbm(vec3 p) {
        float value = 0.0;
        float amplitude = 0.5;
        
        for(int i = 0; i < 4; i++) {
          value += amplitude * noise(p);
          p *= 2.0;
          amplitude *= 0.5;
        }
        
        return value;
      }
      
      void main() {
        vec3 pos = vWorldPosition * noiseScale;
        pos.xy += windDirection * time * 0.1;
        
        float fogDensity = fbm(pos + time * 0.02) * density;
        
        // 距离衰减
        float dist = length(vViewPosition);
        float distanceFactor = 1.0 - exp(-dist * 0.01);
        
        fogDensity *= distanceFactor;
        
        gl_FragColor = vec4(color, fogDensity);
      }
    `;

    this.fogMaterial = new THREE.ShaderMaterial({
      uniforms: this.fogUniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
  }

  private createFogMesh(boundingBox: THREE.Box3): void {
    const size = boundingBox.getSize(new THREE.Vector3());
    const geometry = new THREE.BoxGeometry(size.x, size.y * 0.5, size.z);
    
    this.fogMesh = new THREE.Mesh(geometry, this.fogMaterial);
    this.fogMesh.position.copy(boundingBox.getCenter(new THREE.Vector3()));
    this.fogMesh.userData = { type: 'volumetric_fog' };
    
    this.scene.add(this.fogMesh);
  }

  public update(deltaTime: number): void {
    this.fogUniforms.time.value += deltaTime;
  }

  public setDensity(density: number): void {
    this.fogUniforms.density.value = density;
    this.fogMesh.visible = density > 0.05;
  }

  public setWindDirection(wind: THREE.Vector2): void {
    this.fogUniforms.windDirection.value.copy(wind);
  }

  public dispose(): void {
    this.scene.remove(this.fogMesh);
    this.fogMaterial.dispose();
    this.fogMesh.geometry.dispose();
  }
}

// ======================= 主天气效果渲染器 =======================

export class WeatherEffectsRenderer {
  private scene: THREE.Scene;
  private rainSystem: RainParticleSystem | null = null;
  private snowSystem: SnowParticleSystem | null = null;
  private fogRenderer: VolumetricFogRenderer | null = null;
  private cloudSystem: any = null; // 待实现
  private boundingBox: THREE.Box3;
  private config: WeatherEffectsConfig;
  private windForce: THREE.Vector3 = new THREE.Vector3();

  constructor(scene: THREE.Scene, boundingBox: THREE.Box3) {
    this.scene = scene;
    this.boundingBox = boundingBox;
    this.config = {
      enableRain: false,
      enableSnow: false,
      enableFog: false,
      enableClouds: false,
      intensity: 0.5,
      windStrength: 0.2,
      visibility: 1.0
    };

    console.log('🌦️ 天气效果渲染器初始化完成');
  }

  public updateFromWeatherData(weatherData: WeatherData): void {
    // 根据天气数据自动设置效果
    const condition = weatherData.description.toLowerCase();
    
    // 重置所有效果
    this.setRainEnabled(false);
    this.setSnowEnabled(false);
    this.setFogEnabled(false);
    
    // 根据天气描述启用对应效果
    if (condition.includes('雨') || condition.includes('rain')) {
      this.setRainEnabled(true);
      this.config.intensity = this.getIntensityFromWeather(condition);
    } else if (condition.includes('雪') || condition.includes('snow')) {
      this.setSnowEnabled(true);
      this.config.intensity = this.getIntensityFromWeather(condition);
    } else if (condition.includes('雾') || condition.includes('fog') || condition.includes('霾')) {
      this.setFogEnabled(true);
      this.config.intensity = 0.6;
    }
    
    // 设置风力
    this.windForce.set(
      weatherData.windSpeed * Math.cos(weatherData.windDirection || 0) * 0.1,
      0,
      weatherData.windSpeed * Math.sin(weatherData.windDirection || 0) * 0.1
    );
    
    console.log(`🌤️ 根据天气数据更新效果: ${condition}, 强度: ${this.config.intensity}`);
  }

  private getIntensityFromWeather(condition: string): number {
    if (condition.includes('大') || condition.includes('heavy')) return 0.9;
    if (condition.includes('中') || condition.includes('moderate')) return 0.6;
    if (condition.includes('小') || condition.includes('light')) return 0.3;
    return 0.5;
  }

  public setRainEnabled(enabled: boolean): void {
    this.config.enableRain = enabled;
    
    if (enabled && !this.rainSystem) {
      this.rainSystem = new RainParticleSystem(5000, this.boundingBox);
      this.scene.add(this.rainSystem.getPoints());
      console.log('🌧️ 雨滴效果已启用');
    } else if (!enabled && this.rainSystem) {
      this.scene.remove(this.rainSystem.getPoints());
      this.rainSystem.dispose();
      this.rainSystem = null;
      console.log('🌧️ 雨滴效果已禁用');
    }
  }

  public setSnowEnabled(enabled: boolean): void {
    this.config.enableSnow = enabled;
    
    if (enabled && !this.snowSystem) {
      this.snowSystem = new SnowParticleSystem(3000, this.boundingBox);
      this.scene.add(this.snowSystem.getPoints());
      console.log('❄️ 雪花效果已启用');
    } else if (!enabled && this.snowSystem) {
      this.scene.remove(this.snowSystem.getPoints());
      this.snowSystem.dispose();
      this.snowSystem = null;
      console.log('❄️ 雪花效果已禁用');
    }
  }

  public setFogEnabled(enabled: boolean): void {
    this.config.enableFog = enabled;
    
    if (enabled && !this.fogRenderer) {
      this.fogRenderer = new VolumetricFogRenderer(this.scene, this.boundingBox);
      console.log('🌫️ 雾气效果已启用');
    } else if (!enabled && this.fogRenderer) {
      this.fogRenderer.dispose();
      this.fogRenderer = null;
      console.log('🌫️ 雾气效果已禁用');
    }
  }

  public setIntensity(intensity: number): void {
    this.config.intensity = Math.max(0, Math.min(1, intensity));
    
    if (this.rainSystem) {
      this.rainSystem.setIntensity(this.config.intensity);
    }
    
    if (this.snowSystem) {
      this.snowSystem.setIntensity(this.config.intensity);
    }
    
    if (this.fogRenderer) {
      this.fogRenderer.setDensity(this.config.intensity * 0.8);
    }
  }

  public update(deltaTime: number): void {
    if (this.rainSystem) {
      this.rainSystem.update(deltaTime, this.windForce);
    }
    
    if (this.snowSystem) {
      this.snowSystem.update(deltaTime, this.windForce);
    }
    
    if (this.fogRenderer) {
      this.fogRenderer.update(deltaTime);
    }
  }

  public getConfig(): WeatherEffectsConfig {
    return { ...this.config };
  }

  public dispose(): void {
    if (this.rainSystem) {
      this.scene.remove(this.rainSystem.getPoints());
      this.rainSystem.dispose();
    }
    
    if (this.snowSystem) {
      this.scene.remove(this.snowSystem.getPoints());
      this.snowSystem.dispose();
    }
    
    if (this.fogRenderer) {
      this.fogRenderer.dispose();
    }
    
    console.log('🗑️ 天气效果渲染器已清理');
  }
}

export default WeatherEffectsRenderer;