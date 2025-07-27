/**
 * Three.js架构服务 - 0号架构师
 * 替代Mapbox的纯Three.js地理可视化解决方案
 * 为1号专家提供专业的3D地理空间数据管理
 */

import * as THREE from 'three';
import { EventEmitter } from 'events';

export interface GeographicalLocation {
  latitude: number;
  longitude: number;
  elevation: number;
  address?: string;
  city?: string;
  country?: string;
}

export interface ProjectSpatialData {
  id: string;
  name: string;
  location: GeographicalLocation;
  boundaries: Array<{ lat: number; lng: number }>;
  excavationDepth: number;
  status: 'planning' | 'active' | 'completed' | 'suspended';
  geometry: THREE.BufferGeometry | null;
  progress: number;
  description: string;
}

export interface ThreeJSVisualizationConfig {
  enableParticles: boolean;
  enableLighting: boolean;
  enableShadows: boolean;
  terrainDetail: 'low' | 'medium' | 'high';
  renderQuality: 'performance' | 'balanced' | 'quality';
  cameraControls: boolean;
}

export interface WeatherIntegration {
  temperature: number;
  humidity: number;
  windSpeed: number;
  description: string;
  visualEffect: 'clear' | 'cloudy' | 'rainy' | 'snowy' | 'foggy';
}

class ThreeJSArchitectureService extends EventEmitter {
  private scene: THREE.Scene | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private projects: Map<string, ProjectSpatialData> = new Map();
  private markers: Map<string, THREE.Object3D> = new Map();
  private terrain: THREE.Mesh | null = null;
  private particleSystem: THREE.Points | null = null;
  private weatherSystem: WeatherIntegration | null = null;
  private config: ThreeJSVisualizationConfig;
  private isInitialized = false;

  constructor() {
    super();
    
    this.config = {
      enableParticles: true,
      enableLighting: true,
      enableShadows: true,
      terrainDetail: 'medium',
      renderQuality: 'balanced',
      cameraControls: true
    };
  }

  // ============== 初始化系统 ==============
  public async initialize(container: HTMLElement, width: number, height: number): Promise<void> {
    if (this.isInitialized) {
      console.warn('ThreeJS架构服务已经初始化');
      return;
    }

    try {
      // 创建场景
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x001122);
      this.scene.fog = new THREE.Fog(0x001122, 2000, 10000);

      // 创建相机
      this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
      this.camera.position.set(0, 1000, 2000);

      // 创建渲染器
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      
      if (this.config.enableShadows) {
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }

      // 添加到容器
      container.appendChild(this.renderer.domElement);

      // 初始化场景元素
      await this.initializeSceneElements();

      // 启动渲染循环
      this.startRenderLoop();

      this.isInitialized = true;
      this.emit('initialized');
      
      console.log('✅ ThreeJS架构服务初始化完成');
      
    } catch (error) {
      console.error('❌ ThreeJS架构服务初始化失败:', error);
      throw error;
    }
  }

  private async initializeSceneElements(): Promise<void> {
    if (!this.scene) throw new Error('场景未初始化');

    // 创建地球地形
    await this.createEarthTerrain();
    
    // 添加光照系统
    this.setupLighting();
    
    // 创建粒子系统
    if (this.config.enableParticles) {
      this.createParticleSystem();
    }

    // 初始化天气系统
    this.initializeWeatherSystem();
  }

  // ============== 地形创建 ==============
  private async createEarthTerrain(): Promise<void> {
    const detail = this.config.terrainDetail === 'high' ? 128 : 
                   this.config.terrainDetail === 'medium' ? 64 : 32;
    
    const geometry = new THREE.SphereGeometry(800, detail, detail);
    
    // 创建地球材质
    const material = new THREE.MeshPhongMaterial({
      color: 0x1a4d73,
      transparent: true,
      opacity: 0.8,
      wireframe: false
    });

    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.name = 'earth-terrain';
    this.terrain.receiveShadow = this.config.enableShadows;
    
    this.scene!.add(this.terrain);

    // 添加地形网格线
    const wireframe = new THREE.WireframeGeometry(geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ffff, 
      opacity: 0.3, 
      transparent: true 
    });
    const wireframeLines = new THREE.LineSegments(wireframe, wireframeMaterial);
    this.terrain.add(wireframeLines);

    // 添加大气层效果
    this.createAtmosphere();
  }

  private createAtmosphere(): void {
    const atmosphereGeometry = new THREE.SphereGeometry(850, 32, 32);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x4da6ff,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    });
    
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphere.name = 'atmosphere';
    this.scene!.add(atmosphere);
  }

  // ============== 光照系统 ==============
  private setupLighting(): void {
    if (!this.config.enableLighting || !this.scene) return;

    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    ambientLight.name = 'ambient-light';
    this.scene.add(ambientLight);

    // 主光源（太阳）
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(1000, 1000, 500);
    sunLight.name = 'sun-light';
    
    if (this.config.enableShadows) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 0.5;
      sunLight.shadow.camera.far = 5000;
    }
    
    this.scene.add(sunLight);

    // 辅助光源（月光效果）
    const moonLight = new THREE.PointLight(0x4da6ff, 0.3, 3000);
    moonLight.position.set(-800, 800, -800);
    moonLight.name = 'moon-light';
    this.scene.add(moonLight);

    // 地球边缘光
    const rimLight = new THREE.DirectionalLight(0x00ffff, 0.5);
    rimLight.position.set(-500, 0, 500);
    rimLight.name = 'rim-light';
    this.scene.add(rimLight);
  }

  // ============== 粒子系统 ==============
  private createParticleSystem(): void {
    const particleCount = 2000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      // 随机分布在球体周围
      const radius = 1500 + Math.random() * 2000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      
      // 随机颜色
      const color = new THREE.Color();
      color.setHSL(Math.random() * 0.3 + 0.5, 0.7, 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 2,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      blending: THREE.AdditiveBlending
    });
    
    this.particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    this.particleSystem.name = 'particle-system';
    this.scene!.add(this.particleSystem);
  }

  // ============== 项目管理 ==============
  public async addProject(projectData: ProjectSpatialData): Promise<void> {
    this.projects.set(projectData.id, projectData);
    
    // 创建项目标记
    const marker = this.createProjectMarker(projectData);
    this.markers.set(projectData.id, marker);
    this.scene!.add(marker);
    
    this.emit('project:added', projectData);
  }

  private createProjectMarker(project: ProjectSpatialData): THREE.Group {
    const group = new THREE.Group();
    group.name = `project-${project.id}`;
    group.userData = project;
    
    // 将经纬度转换为3D坐标
    const position = this.latLngToCartesian(project.location.latitude, project.location.longitude, 820);
    group.position.copy(position);
    
    // 创建标记几何体
    const markerGeometry = new THREE.ConeGeometry(10, 40, 8);
    let color;
    switch (project.status) {
      case 'completed':
        color = 0x22c55e;
        break;
      case 'active':
        color = 0xfbbf24;
        break;
      case 'planning':
        color = 0xef4444;
        break;
      case 'suspended':
        color = 0x6b7280;
        break;
    }
    
    const markerMaterial = new THREE.MeshPhongMaterial({ 
      color,
      emissive: color,
      emissiveIntensity: 0.2
    });
    
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.castShadow = this.config.enableShadows;
    marker.lookAt(0, 0, 0);
    marker.rotateX(Math.PI);
    
    group.add(marker);
    
    // 添加发光效果
    const glowGeometry = new THREE.SphereGeometry(15, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);
    
    // 添加信息标签
    this.createProjectLabel(group, project);
    
    return group;
  }

  private createProjectLabel(parent: THREE.Group, project: ProjectSpatialData): void {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;
    
    context.fillStyle = 'rgba(0, 17, 34, 0.8)';
    context.fillRect(0, 0, 256, 64);
    
    context.strokeStyle = '#00ffff';
    context.strokeRect(0, 0, 256, 64);
    
    context.fillStyle = '#ffffff';
    context.font = '16px Arial';
    context.textAlign = 'center';
    context.fillText(project.name, 128, 25);
    
    context.fillStyle = '#00ffff';
    context.font = '12px Arial';
    context.fillText(`深度: ${project.excavationDepth}m | 进度: ${project.progress}%`, 128, 45);
    
    const texture = new THREE.CanvasTexture(canvas);
    const labelMaterial = new THREE.MeshBasicMaterial({ 
      map: texture, 
      transparent: true,
      alphaTest: 0.1
    });
    
    const labelGeometry = new THREE.PlaneGeometry(64, 16);
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.y = 60;
    label.lookAt(0, 0, 0);
    
    parent.add(label);
  }

  // ============== 坐标转换 ==============
  private latLngToCartesian(lat: number, lng: number, radius: number): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    return new THREE.Vector3(x, y, z);
  }

  // ============== 天气系统 ==============
  private initializeWeatherSystem(): void {
    this.weatherSystem = {
      temperature: 22,
      humidity: 65,
      windSpeed: 12,
      description: '多云',
      visualEffect: 'cloudy'
    };
  }

  public updateWeather(weather: Partial<WeatherIntegration>): void {
    if (!this.weatherSystem) return;
    
    this.weatherSystem = { ...this.weatherSystem, ...weather };
    this.applyWeatherEffects();
    
    this.emit('weather:updated', this.weatherSystem);
  }

  private applyWeatherEffects(): void {
    if (!this.scene || !this.weatherSystem) return;
    
    // 根据天气调整雾效
    switch (this.weatherSystem.visualEffect) {
      case 'clear':
        this.scene.fog = new THREE.Fog(0x001122, 5000, 15000);
        break;
      case 'cloudy':
        this.scene.fog = new THREE.Fog(0x334455, 2000, 10000);
        break;
      case 'rainy':
        this.scene.fog = new THREE.Fog(0x223344, 1000, 5000);
        this.createRainEffect();
        break;
      case 'foggy':
        this.scene.fog = new THREE.Fog(0x556677, 500, 2000);
        break;
    }
  }

  private createRainEffect(): void {
    // 简化的雨效实现
    const rainCount = 1000;
    const positions = new Float32Array(rainCount * 3);
    
    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2000;
      positions[i * 3 + 1] = Math.random() * 1000 + 500;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    }
    
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const rainMaterial = new THREE.PointsMaterial({
      color: 0x4da6ff,
      size: 1,
      transparent: true,
      opacity: 0.6
    });
    
    const rain = new THREE.Points(rainGeometry, rainMaterial);
    rain.name = 'rain-effect';
    this.scene!.add(rain);
  }

  // ============== 渲染循环 ==============
  private startRenderLoop(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      this.updateScene();
      this.render();
    };
    
    animate();
  }

  private updateScene(): void {
    if (!this.scene) return;
    
    // 旋转地球
    if (this.terrain) {
      this.terrain.rotation.y += 0.001;
    }
    
    // 更新粒子系统
    if (this.particleSystem) {
      this.particleSystem.rotation.y += 0.002;
      this.particleSystem.rotation.x += 0.001;
    }
    
    // 更新大气层
    const atmosphere = this.scene.getObjectByName('atmosphere');
    if (atmosphere) {
      atmosphere.rotation.y += 0.0005;
    }
  }

  private render(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    
    this.renderer.render(this.scene, this.camera);
  }

  // ============== 相机控制 ==============
  public flyToProject(projectId: string, duration: number = 2000): Promise<void> {
    return new Promise((resolve) => {
      const project = this.projects.get(projectId);
      if (!project || !this.camera) {
        resolve();
        return;
      }
      
      const targetPosition = this.latLngToCartesian(
        project.location.latitude, 
        project.location.longitude, 
        1200
      );
      
      const startPosition = this.camera.position.clone();
      const startTime = Date.now();
      
      const animateCamera = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // easing
        
        this.camera!.position.lerpVectors(startPosition, targetPosition, easeProgress);
        this.camera!.lookAt(0, 0, 0);
        
        if (progress < 1) {
          requestAnimationFrame(animateCamera);
        } else {
          this.emit('camera:flight_complete', projectId);
          resolve();
        }
      };
      
      animateCamera();
    });
  }

  // ============== 配置管理 ==============
  public updateConfig(newConfig: Partial<ThreeJSVisualizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.applyConfigChanges();
    this.emit('config:updated', this.config);
  }

  private applyConfigChanges(): void {
    if (!this.renderer) return;
    
    // 更新渲染质量
    switch (this.config.renderQuality) {
      case 'performance':
        this.renderer.setPixelRatio(1);
        break;
      case 'balanced':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        break;
      case 'quality':
        this.renderer.setPixelRatio(window.devicePixelRatio);
        break;
    }
    
    // 更新阴影设置
    this.renderer.shadowMap.enabled = this.config.enableShadows;
  }

  // ============== 公共接口 ==============
  public getProjects(): ProjectSpatialData[] {
    return Array.from(this.projects.values());
  }

  public getProject(id: string): ProjectSpatialData | undefined {
    return this.projects.get(id);
  }

  public getWeather(): WeatherIntegration | null {
    return this.weatherSystem;
  }

  public getConfig(): ThreeJSVisualizationConfig {
    return { ...this.config };
  }

  public dispose(): void {
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    this.scene?.clear();
    this.projects.clear();
    this.markers.clear();
    
    this.removeAllListeners();
    this.isInitialized = false;
  }
}

// 导出单例实例
export const threeJSArchitecture = new ThreeJSArchitectureService();
export default threeJSArchitecture;