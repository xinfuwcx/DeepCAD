/**
 * 统一天气粒子管理器
 * 0号架构师 - 统一管理1号专家的天气系统和粒子效果
 * 集成OpenMeteo天气数据 + Three.js粒子系统 + Epic可视化效果
 */

import * as THREE from 'three';
import { EventEmitter } from 'events';
import DataPipelineManager from './DataPipelineManager';

export interface WeatherData {
  temperature: number;
  description: string;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  precipitation: number;
  pressure: number;
  visibility: number;
  cloudCover: number;
  uvIndex: number;
  icon: string;
  timestamp: Date;
}

export interface ParticleEffectConfig {
  type: 'rain' | 'snow' | 'wind' | 'cosmic' | 'energy' | 'data_flow';
  enabled: boolean;
  intensity: number; // 0-1
  color: string;
  count: number;
  size: number;
  opacity: number;
  animation: {
    speed: number;
    direction: THREE.Vector3;
    pattern: 'linear' | 'circular' | 'random' | 'spiral';
  };
}

export interface WeatherVisualizationConfig {
  temperature: {
    enabled: boolean;
    colorScale: 'blue_red' | 'cool_warm' | 'thermal';
    range: [number, number];
  };
  precipitation: {
    enabled: boolean;
    type: 'particles' | 'overlay' | 'volumetric';
    intensity: number;
  };
  wind: {
    enabled: boolean;
    showDirection: boolean;
    showSpeed: boolean;
    particleTrails: boolean;
  };
  clouds: {
    enabled: boolean;
    type: '2d' | '3d' | 'volumetric';
    density: number;
    animation: boolean;
  };
}

class UnifiedWeatherParticleManager extends EventEmitter {
  private scene: THREE.Scene;
  private weatherData: WeatherData | null = null;
  private particleEffects: Map<string, THREE.Object3D> = new Map();
  private weatherObjects: Map<string, THREE.Object3D> = new Map();
  private animationFrameId: number | null = null;
  
  // 配置
  private particleConfig: Map<string, ParticleEffectConfig> = new Map();
  private weatherConfig: WeatherVisualizationConfig;
  
  // 性能监控
  private performanceMetrics = {
    particleCount: 0,
    renderTime: 0,
    memoryUsage: 0,
    frameRate: 60
  };

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
    
    // 初始化默认配置
    this.initializeDefaultConfigs();
    
    // 设置数据管道监听
    this.setupDataPipelineListeners();
    
    // 开始动画循环
    this.startAnimationLoop();
  }

  // 初始化默认配置
  private initializeDefaultConfigs(): void {
    // 粒子效果默认配置
    this.particleConfig.set('cosmic', {
      type: 'cosmic',
      enabled: true,
      intensity: 0.6,
      color: '#00d9ff',
      count: 2000,
      size: 1.5,
      opacity: 0.4,
      animation: {
        speed: 0.002,
        direction: new THREE.Vector3(0, 1, 0),
        pattern: 'spiral'
      }
    });

    this.particleConfig.set('energy', {
      type: 'energy',
      enabled: false,
      intensity: 0.8,
      color: '#ff6b35',
      count: 1500,
      size: 2.0,
      opacity: 0.6,
      animation: {
        speed: 0.005,
        direction: new THREE.Vector3(1, 0, 0),
        pattern: 'linear'
      }
    });

    this.particleConfig.set('data_flow', {
      type: 'data_flow',
      enabled: false,
      intensity: 0.7,
      color: '#9d4edd',
      count: 1000,
      size: 1.0,
      opacity: 0.5,
      animation: {
        speed: 0.003,
        direction: new THREE.Vector3(0, 0, 1),
        pattern: 'circular'
      }
    });

    // 天气可视化默认配置
    this.weatherConfig = {
      temperature: {
        enabled: true,
        colorScale: 'cool_warm',
        range: [-20, 40]
      },
      precipitation: {
        enabled: true,
        type: 'particles',
        intensity: 0.5
      },
      wind: {
        enabled: true,
        showDirection: true,
        showSpeed: false,
        particleTrails: true
      },
      clouds: {
        enabled: true,
        type: '3d',
        density: 0.6,
        animation: true
      }
    };
  }

  // 设置数据管道监听器
  private setupDataPipelineListeners(): void {
    // 监听天气数据更新
    DataPipelineManager.on('weather:update', (weatherData: WeatherData) => {
      this.updateWeatherData(weatherData);
    });

    // 监听专家协作状态变化
    DataPipelineManager.on('collaboration:status', (status: any) => {
      this.updateParticleEffectsForCollaboration(status);
    });
  }

  // 更新天气数据
  public updateWeatherData(weatherData: WeatherData): void {
    this.weatherData = weatherData;
    
    // 更新天气可视化
    this.updateWeatherVisualization();
    
    // 更新天气相关粒子效果
    this.updateWeatherParticles();
    
    // 发送天气更新事件
    this.emit('weather:updated', weatherData);
  }

  // 更新天气可视化
  private updateWeatherVisualization(): void {
    if (!this.weatherData) return;

    // 清除现有天气对象
    this.clearWeatherObjects();

    // 根据天气条件创建可视化
    if (this.weatherConfig.precipitation.enabled && this.weatherData.precipitation > 0) {
      this.createPrecipitationEffect();
    }

    if (this.weatherConfig.wind.enabled && this.weatherData.windSpeed > 5) {
      this.createWindVisualization();
    }

    if (this.weatherConfig.clouds.enabled && this.weatherData.cloudCover > 0.3) {
      this.createCloudVisualization();
    }

    // 更新环境光照基于天气
    this.updateLightingForWeather();
  }

  // 创建降水效果
  private createPrecipitationEffect(): void {
    if (!this.weatherData) return;

    const isSnow = this.weatherData.temperature < 2;
    const precipitationType = isSnow ? 'snow' : 'rain';
    const intensity = this.weatherData.precipitation / 10; // 归一化到0-1

    // 创建降水粒子系统
    const precipitationConfig: ParticleEffectConfig = {
      type: precipitationType as any,
      enabled: true,
      intensity,
      color: isSnow ? '#ffffff' : '#87ceeb',
      count: Math.floor(intensity * 5000),
      size: isSnow ? 2.0 : 0.5,
      opacity: 0.7,
      animation: {
        speed: isSnow ? 0.001 : 0.008,
        direction: new THREE.Vector3(
          this.weatherData.windSpeed * Math.cos(this.weatherData.windDirection * Math.PI / 180) * 0.01,
          -1,
          this.weatherData.windSpeed * Math.sin(this.weatherData.windDirection * Math.PI / 180) * 0.01
        ),
        pattern: 'linear'
      }
    };

    this.createParticleEffect('precipitation', precipitationConfig);
  }

  // 创建风的可视化
  private createWindVisualization(): void {
    if (!this.weatherData) return;

    const windSpeed = this.weatherData.windSpeed;
    const windDirection = this.weatherData.windDirection;

    // 创建风向粒子
    const windConfig: ParticleEffectConfig = {
      type: 'wind',
      enabled: true,
      intensity: Math.min(windSpeed / 30, 1), // 归一化风速
      color: '#ffffff',
      count: Math.floor(windSpeed * 20),
      size: 0.3,
      opacity: 0.4,
      animation: {
        speed: windSpeed * 0.002,
        direction: new THREE.Vector3(
          Math.cos(windDirection * Math.PI / 180),
          0,
          Math.sin(windDirection * Math.PI / 180)
        ),
        pattern: 'linear'
      }
    };

    this.createParticleEffect('wind', windConfig);

    // 创建风向指示器
    if (this.weatherConfig.wind.showDirection) {
      this.createWindDirectionIndicator();
    }
  }

  // 创建云层可视化
  private createCloudVisualization(): void {
    if (!this.weatherData) return;

    const cloudCover = this.weatherData.cloudCover;
    const cloudCount = Math.floor(cloudCover * 30);

    // 创建3D云层
    for (let i = 0; i < cloudCount; i++) {
      const cloudGeometry = new THREE.SphereGeometry(
        50 + Math.random() * 100,
        16,
        12
      );
      
      const cloudMaterial = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3 + cloudCover * 0.4
      });

      const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
      
      // 随机定位云层
      cloud.position.set(
        Math.random() * 2000 - 1000,
        300 + Math.random() * 200,
        Math.random() * 2000 - 1000
      );
      
      // 随机变形
      cloud.scale.set(
        Math.random() * 2 + 1,
        Math.random() * 0.5 + 0.5,
        Math.random() * 2 + 1
      );

      cloud.userData = { type: 'weather_cloud', animationSpeed: Math.random() * 0.5 + 0.1 };
      
      this.scene.add(cloud);
      this.weatherObjects.set(`cloud_${i}`, cloud);
    }
  }

  // 创建风向指示器
  private createWindDirectionIndicator(): void {
    if (!this.weatherData) return;

    const windDirection = this.weatherData.windDirection;
    const windSpeed = this.weatherData.windSpeed;

    // 创建箭头几何体
    const arrowGeometry = new THREE.ConeGeometry(10, 30, 8);
    const arrowMaterial = new THREE.MeshLambertMaterial({
      color: 0xff6b35,
      transparent: true,
      opacity: 0.8
    });

    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    
    // 设置箭头位置和旋转
    arrow.position.set(0, 100, 0);
    arrow.rotation.y = windDirection * Math.PI / 180;
    
    // 根据风速调整箭头大小
    const scale = Math.min(windSpeed / 20, 2);
    arrow.scale.set(scale, scale, scale);

    arrow.userData = { type: 'wind_indicator' };
    
    this.scene.add(arrow);
    this.weatherObjects.set('wind_indicator', arrow);
  }

  // 更新光照基于天气
  private updateLightingForWeather(): void {
    if (!this.weatherData) return;

    // 查找现有的方向光
    const directionalLight = this.scene.children.find(
      child => child instanceof THREE.DirectionalLight
    ) as THREE.DirectionalLight;

    if (directionalLight) {
      // 根据云量调整光照强度
      const cloudFactor = 1 - (this.weatherData.cloudCover * 0.6);
      directionalLight.intensity = 0.8 * cloudFactor;

      // 根据降水调整环境光
      const precipitationFactor = 1 - (this.weatherData.precipitation / 10 * 0.3);
      
      const ambientLight = this.scene.children.find(
        child => child instanceof THREE.AmbientLight
      ) as THREE.AmbientLight;

      if (ambientLight) {
        ambientLight.intensity = 0.6 * precipitationFactor;
      }
    }
  }

  // 创建粒子效果
  public createParticleEffect(id: string, config: ParticleEffectConfig): void {
    // 移除现有效果
    this.removeParticleEffect(id);

    // 创建粒子几何体
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(config.count * 3);
    const velocities = new Float32Array(config.count * 3);

    // 初始化粒子位置和速度
    for (let i = 0; i < config.count * 3; i += 3) {
      // 位置
      positions[i] = Math.random() * 2000 - 1000;
      positions[i + 1] = Math.random() * 500;
      positions[i + 2] = Math.random() * 2000 - 1000;

      // 速度
      velocities[i] = config.animation.direction.x * config.animation.speed;
      velocities[i + 1] = config.animation.direction.y * config.animation.speed;
      velocities[i + 2] = config.animation.direction.z * config.animation.speed;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    // 创建粒子材质
    const material = new THREE.PointsMaterial({
      color: new THREE.Color(config.color),
      size: config.size,
      transparent: true,
      opacity: config.opacity,
      blending: THREE.AdditiveBlending
    });

    // 创建粒子系统
    const particles = new THREE.Points(geometry, material);
    particles.userData = { 
      type: 'particle_effect',
      effectId: id,
      config: config,
      startTime: Date.now()
    };

    this.scene.add(particles);
    this.particleEffects.set(id, particles);
    
    // 更新粒子配置
    this.particleConfig.set(id, config);

    // 更新性能指标
    this.performanceMetrics.particleCount += config.count;

    this.emit('particle:created', { id, config });
  }

  // 移除粒子效果
  public removeParticleEffect(id: string): void {
    const effect = this.particleEffects.get(id);
    if (effect) {
      this.scene.remove(effect);
      
      // 清理几何体和材质
      if (effect instanceof THREE.Points) {
        effect.geometry.dispose();
        if (effect.material instanceof THREE.Material) {
          effect.material.dispose();
        }
        
        // 更新性能指标
        const config = this.particleConfig.get(id);
        if (config) {
          this.performanceMetrics.particleCount -= config.count;
        }
      }
      
      this.particleEffects.delete(id);
      this.particleConfig.delete(id);
      
      this.emit('particle:removed', { id });
    }
  }

  // 更新天气相关粒子
  private updateWeatherParticles(): void {
    if (!this.weatherData) return;

    // 移除现有天气粒子
    this.removeParticleEffect('precipitation');
    this.removeParticleEffect('wind');

    // 根据新天气数据创建粒子
    if (this.weatherData.precipitation > 0) {
      // 在createPrecipitationEffect中已处理
    }

    if (this.weatherData.windSpeed > 5) {
      // 在createWindVisualization中已处理
    }
  }

  // 更新协作相关粒子效果
  private updateParticleEffectsForCollaboration(status: any): void {
    // 根据专家协作状态更新粒子效果
    if (status.epic2Geology) {
      this.enableParticleEffect('data_flow');
    } else {
      this.disableParticleEffect('data_flow');
    }

    if (status.computation2Epic) {
      this.enableParticleEffect('energy');
    } else {
      this.disableParticleEffect('energy');
    }
  }

  // 启用粒子效果
  public enableParticleEffect(id: string): void {
    const config = this.particleConfig.get(id);
    if (config) {
      config.enabled = true;
      this.createParticleEffect(id, config);
    }
  }

  // 禁用粒子效果
  public disableParticleEffect(id: string): void {
    const config = this.particleConfig.get(id);
    if (config) {
      config.enabled = false;
      this.removeParticleEffect(id);
    }
  }

  // 清除天气对象
  private clearWeatherObjects(): void {
    this.weatherObjects.forEach((object, id) => {
      this.scene.remove(object);
      
      // 清理几何体和材质
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
    });
    
    this.weatherObjects.clear();
  }

  // 开始动画循环
  private startAnimationLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      
      const startTime = performance.now();
      
      // 更新粒子动画
      this.updateParticleAnimations();
      
      // 更新天气动画
      this.updateWeatherAnimations();
      
      // 计算渲染时间
      this.performanceMetrics.renderTime = performance.now() - startTime;
      
      // 更新帧率统计
      this.updateFrameRate();
    };
    
    animate();
  }

  // 更新粒子动画
  private updateParticleAnimations(): void {
    this.particleEffects.forEach((effect, id) => {
      if (effect instanceof THREE.Points) {
        const config = this.particleConfig.get(id);
        if (!config || !config.enabled) return;

        const positions = effect.geometry.attributes.position.array as Float32Array;
        const velocities = effect.geometry.attributes.velocity?.array as Float32Array;

        if (velocities) {
          // 更新粒子位置
          for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i];
            positions[i + 1] += velocities[i + 1];
            positions[i + 2] += velocities[i + 2];

            // 边界检查和重置
            if (positions[i + 1] < -100) {
              positions[i] = Math.random() * 2000 - 1000;
              positions[i + 1] = 500;
              positions[i + 2] = Math.random() * 2000 - 1000;
            }
          }

          effect.geometry.attributes.position.needsUpdate = true;
        }

        // 特殊动画模式
        if (config.animation.pattern === 'circular') {
          effect.rotation.y += config.animation.speed;
        } else if (config.animation.pattern === 'spiral') {
          effect.rotation.y += config.animation.speed;
          effect.rotation.x += config.animation.speed * 0.5;
        }
      }
    });
  }

  // 更新天气动画
  private updateWeatherAnimations(): void {
    this.weatherObjects.forEach((object, id) => {
      if (object.userData?.type === 'weather_cloud') {
        // 云层漂移动画
        object.position.x += object.userData.animationSpeed;
        
        // 边界检查
        if (object.position.x > 1500) {
          object.position.x = -1500;
        }
        
        // 轻微的垂直波动
        object.position.y += Math.sin(Date.now() * 0.001 + object.position.x * 0.01) * 0.1;
      }
    });
  }

  // 更新帧率统计
  private updateFrameRate(): void {
    // 简化的帧率计算
    this.performanceMetrics.frameRate = Math.round(1000 / this.performanceMetrics.renderTime);
  }

  // 获取性能指标
  public getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  // 获取天气数据
  public getWeatherData(): WeatherData | null {
    return this.weatherData;
  }

  // 获取粒子效果配置
  public getParticleConfig(id: string): ParticleEffectConfig | undefined {
    return this.particleConfig.get(id);
  }

  // 更新粒子效果配置
  public updateParticleConfig(id: string, config: Partial<ParticleEffectConfig>): void {
    const currentConfig = this.particleConfig.get(id);
    if (currentConfig) {
      const newConfig = { ...currentConfig, ...config };
      this.particleConfig.set(id, newConfig);
      
      if (newConfig.enabled) {
        this.createParticleEffect(id, newConfig);
      }
    }
  }

  // 获取天气可视化配置
  public getWeatherConfig(): WeatherVisualizationConfig {
    return { ...this.weatherConfig };
  }

  // 更新天气可视化配置
  public updateWeatherConfig(config: Partial<WeatherVisualizationConfig>): void {
    this.weatherConfig = { ...this.weatherConfig, ...config };
    
    // 重新应用天气可视化
    if (this.weatherData) {
      this.updateWeatherVisualization();
    }
  }

  // 清理资源
  public dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // 清理所有粒子效果
    this.particleEffects.forEach((effect, id) => {
      this.removeParticleEffect(id);
    });

    // 清理所有天气对象
    this.clearWeatherObjects();

    // 移除所有监听器
    this.removeAllListeners();
  }
}

export default UnifiedWeatherParticleManager;