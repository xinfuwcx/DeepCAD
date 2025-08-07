/**
 * 统一地图渲染服务
 * 整合 three-tile + 3d-tiles-renderer + OpenMeteo
 * 提供完整的3D地图解决方案
 */

import * as THREE from 'three';
import { SimpleTileRenderer } from './SimpleTileRenderer';
import { openMeteoService, WeatherData } from './OpenMeteoService';
import { WeatherEffectsRenderer } from './WeatherEffectsRenderer';
import { CloudRenderingSystem } from './CloudRenderingSystem';

export interface UnifiedMapConfig {
  // 地图配置
  center: [number, number]; // [lat, lng]
  zoom: number;
  minZoom: number;
  maxZoom: number;
  
  // 天气配置
  enableWeather: boolean;
  weatherUpdateInterval: number; // 秒
  
  // 渲染配置
  enableLOD: boolean;
  maxConcurrentTileLoads: number;
}

export class UnifiedMapRenderingService {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  
  // 服务组件
  private simpleTileRenderer: SimpleTileRenderer | null = null;
  private weatherEffects: WeatherEffectsRenderer | null = null;
  private cloudSystem: CloudRenderingSystem | null = null;
  
  // 配置和状态
  private config: UnifiedMapConfig;
  private isInitialized: boolean = false;
  private weatherUpdateTimer: NodeJS.Timeout | null = null;
  private currentWeatherData: WeatherData | null = null;
  private currentProject: any = null;
  private mapContainer: THREE.Group = new THREE.Group();

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // 添加地图容器到场景
    this.scene.add(this.mapContainer);
    
    // 默认配置
    this.config = {
      center: [39.9042, 116.4074], // 北京
      zoom: 12,
      minZoom: 3,
      maxZoom: 18,
      enableWeather: true,
      weatherUpdateInterval: 300, // 5分钟
      enableLOD: true,
      maxConcurrentTileLoads: 16
    };
  }

  /**
   * 初始化统一渲染服务
   */
  async initialize(config?: Partial<UnifiedMapConfig>): Promise<boolean> {
    try {
      if (config) {
        this.config = { ...this.config, ...config };
      }

      console.log('🚀 开始初始化统一地图渲染服务...');

      // 1. 初始化真实地图系统 - 使用three-tile加载真实地图瓦片
      console.log('🗺️ 初始化真实地图瓦片系统...');
      await this.initializeRealMapSystem();

      // 2. 初始化天气系统（如果启用）
      if (this.config.enableWeather) {
        await this.initializeWeatherSystems();
      }

      // 3. 设置更新循环 - 由iTowns管理
      // this.setupUpdateLoop(); // 禁用以避免与iTowns冲突

      this.isInitialized = true;
      console.log('✅ 统一地图渲染服务初始化完成');
      return true;

    } catch (error) {
      console.error('❌ 统一地图渲染服务初始化失败:', error);
      return false;
    }
  }

  /**
   * 初始化简单地图系统
   */
  private async initializeSimpleMapSystem(): Promise<void> {
    try {
      console.log('🗺️ 初始化简单地图系统...');
      
      // 初始化简单瓦片渲染器
      this.simpleTileRenderer = new SimpleTileRenderer(this.scene, this.camera, this.renderer);
      
      // 设置为默认中心
      const [lat, lng] = this.config.center;
      this.simpleTileRenderer.setCenter(lat, lng);
      this.simpleTileRenderer.setZoom(this.config.zoom);
      
      // 加载可见瓦片
      await this.simpleTileRenderer.loadVisibleTiles();
      
      // 加载默认项目
      await this.loadDefaultProject();
      
      console.log('✅ 简单地图系统初始化完成');
      
    } catch (error) {
      console.error('❌ 地图系统初始化失败:', error);
      // 创建备用地形
      this.createFallbackTerrain();
    }
  }


  /**
   * 加载默认项目
   */
  private async loadDefaultProject(): Promise<void> {
    const defaultProject = {
      id: 'beijing-default',
      name: '北京项目',
      location: { lat: 39.9042, lng: 116.4074 }
    };
    
    await this.switchToProject(defaultProject);
  }

  /**
   * 创建简单的基础地形
   */
  private createSimpleBaseTerrain(): void {
    console.log('🏔️ 创建简单基础地形...');
    
    // 清理现有地形
    this.mapContainer.clear();
    
    // 创建简单地形平面
    const terrainGeometry = new THREE.PlaneGeometry(1000, 1000, 50, 50);
    const terrainMaterial = new THREE.MeshLambertMaterial({
      color: 0x567d46,
      wireframe: false
    });
    
    const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrainMesh.rotation.x = -Math.PI / 2;
    terrainMesh.position.y = -1;
    terrainMesh.name = 'simple-terrain';
    
    this.mapContainer.add(terrainMesh);
    
    // 添加基础照明
    this.setupBasicLighting();
    
    console.log('✅ 简单基础地形创建完成');
  }

  /**
   * 设置基础照明
   */
  private setupBasicLighting(): void {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    // 方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 25);
    this.scene.add(directionalLight);
  }

  /**
   * 核心功能：切换到指定项目
   */
  public async switchToProject(project: { id: string; name: string; location: { lat: number; lng: number } }): Promise<void> {
    console.log(`🎯 切换到项目: ${project.name} (${project.location.lat}, ${project.location.lng})`);
    
    try {
      // 1. 更新当前项目
      this.currentProject = project;
      
      // 2. 设置地图中心到项目坐标
      if (this.simpleTileRenderer) {
        this.simpleTileRenderer.setCenter(project.location.lat, project.location.lng);
        this.simpleTileRenderer.setZoom(15);
        await this.simpleTileRenderer.loadVisibleTiles();
      }
      
      // 3. 执行相机飞行
      const targetPosition = new THREE.Vector3(0, 0, 0);
      this.createCinematicFlight(targetPosition);
      
      console.log(`✅ 成功切换到项目: ${project.name}`);
      
    } catch (error) {
      console.error(`❌ 切换项目失败 ${project.name}:`, error);
    }
  }


  /**
   * 创建备用地形（当3D瓦片不可用时）
   */
  private createFallbackTerrain(): void {
    console.log('🏔️ 创建备用地形...');
    
    // 创建一个简单的地形平面
    const terrainGeometry = new THREE.PlaneGeometry(1000, 1000, 100, 100);
    
    // 添加一些高度变化
    const vertices = terrainGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i + 2] = Math.sin(vertices[i] * 0.01) * Math.cos(vertices[i + 1] * 0.01) * 10;
    }
    terrainGeometry.attributes.position.needsUpdate = true;
    terrainGeometry.computeVertexNormals();
    
    const terrainMaterial = new THREE.MeshLambertMaterial({
      color: 0x567d46,
      wireframe: false
    });
    
    const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrainMesh.rotation.x = -Math.PI / 2;
    terrainMesh.position.y = -5;
    
    this.scene.add(terrainMesh);
    
    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 25);
    this.scene.add(directionalLight);
    
    console.log('✅ 备用地形创建完成');
  }

  /**
   * 创建程序化3D地形
   */
  private createProcedural3DTerrain(): void {
    console.log('🌍 创建程序化3D地形和城市场景...');
    
    // 创建大地形底板
    const terrainGeometry = new THREE.PlaneGeometry(2000, 2000, 200, 200);
    
    // 生成地形高度
    const vertices = terrainGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      
      // 多层噪声生成真实地形
      let height = 0;
      height += Math.sin(x * 0.005) * Math.cos(y * 0.005) * 25;
      height += Math.sin(x * 0.02) * Math.cos(y * 0.015) * 12;
      height += Math.sin(x * 0.08) * Math.cos(y * 0.06) * 4;
      height += (Math.random() - 0.5) * 3;
      
      vertices[i + 2] = height;
    }
    
    terrainGeometry.attributes.position.needsUpdate = true;
    terrainGeometry.computeVertexNormals();
    
    // 地形材质
    const terrainMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
      wireframe: false
    });
    
    // 根据高度着色
    const colors = new Float32Array(vertices.length);
    for (let i = 0; i < vertices.length; i += 3) {
      const height = vertices[i + 2];
      
      if (height < -5) {
        // 深水 - 深蓝
        colors[i] = 0.1; colors[i + 1] = 0.2; colors[i + 2] = 0.6;
      } else if (height < 0) {
        // 浅水 - 蓝色
        colors[i] = 0.2; colors[i + 1] = 0.4; colors[i + 2] = 0.8;
      } else if (height < 8) {
        // 平原 - 绿色
        colors[i] = 0.2; colors[i + 1] = 0.7; colors[i + 2] = 0.3;
      } else if (height < 20) {
        // 丘陵 - 黄绿
        colors[i] = 0.6; colors[i + 1] = 0.7; colors[i + 2] = 0.2;
      } else {
        // 山峰 - 灰褐
        colors[i] = 0.7; colors[i + 1] = 0.6; colors[i + 2] = 0.5;
      }
    }
    
    terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrainMesh.rotation.x = -Math.PI / 2;
    terrainMesh.name = 'procedural-terrain';
    
    this.scene.add(terrainMesh);
    
    // 添加一些3D建筑物
    this.addProceduralBuildings();
    
    // 设置专业照明
    this.setupProfessionalLighting();
    
    // 调整相机位置
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.position.set(100, 80, 150);
      this.camera.lookAt(0, 0, 0);
    }
    
    console.log('✅ 程序化3D地形创建完成');
  }
  
  private addProceduralBuildings(): void {
    const buildingCount = 50;
    
    for (let i = 0; i < buildingCount; i++) {
      const x = (Math.random() - 0.5) * 1000;
      const z = (Math.random() - 0.5) * 1000;
      const height = 10 + Math.random() * 50;
      
      const geometry = new THREE.BoxGeometry(
        5 + Math.random() * 15,  // width
        height,                   // height
        5 + Math.random() * 15   // depth
      );
      
      const material = new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.3, 0.6)
      });
      
      const building = new THREE.Mesh(geometry, material);
      building.position.set(x, height / 2, z);
      building.name = 'procedural-building';
      
      this.scene.add(building);
    }
  }
  
  private setupProfessionalLighting(): void {
    // 清除旧光源
    const lights = this.scene.children.filter(child => child.type.includes('Light'));
    lights.forEach(light => this.scene.remove(light));
    
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
    
    // 主光源 - 太阳
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(200, 150, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -500;
    sunLight.shadow.camera.right = 500;
    sunLight.shadow.camera.top = 500;
    sunLight.shadow.camera.bottom = -500;
    this.scene.add(sunLight);
    
    // 填充光
    const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3);
    fillLight.position.set(-100, 50, -100);
    this.scene.add(fillLight);
    
    // 启用阴影
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  /**
   * 创建本地3D瓦片系统
   */
  private createLocal3DTileSystem(): void {
    console.log('🌍 创建本地3D瓦片系统...');
    
    // 基于真实项目坐标创建3D地形瓦片
    const projects = [
      { name: '上海中心', lat: 31.2304, lng: 121.4737, depth: 70 },
      { name: '北京机场', lat: 39.5098, lng: 116.4105, depth: 45 },
      { name: '深圳前海', lat: 22.5431, lng: 113.9339, depth: 35 }
    ];
    
    // 为每个项目创建3D瓦片区域
    projects.forEach((project, index) => {
      this.createProjectTile(project, index);
    });
    
    // 创建连接各项目的基础地形
    this.createBaseTerrain();
    
    // 设置适合3D瓦片的照明
    this.setup3DTileLighting();
    
    // 设置相机到合适位置观察所有项目
    this.setupCameraForProjects(projects);
    
    console.log('✅ 本地3D瓦片系统创建完成');
  }

  /**
   * 初始化备用瓦片渲染器
   */
  private async initializeFallbackRenderer(): Promise<void> {
    try {
      console.log('🔄 初始化SimpleTileRenderer备用方案...');
      
      this.simpleTileRenderer = new SimpleTileRenderer(this.scene, this.camera, this.renderer);
      
      // 设置为北京中心
      this.simpleTileRenderer.setCenter(39.9042, 116.4074);
      this.simpleTileRenderer.setZoom(12);
      
      // 加载可见瓦片
      await this.simpleTileRenderer.loadVisibleTiles();
      
      console.log('✅ SimpleTileRenderer备用方案初始化成功');
      
    } catch (error) {
      console.error('❌ 备用渲染器初始化失败:', error);
    }
  }
  
  private createProjectTile(project: { name: string; lat: number; lng: number; depth: number }, index: number): void {
    // 将经纬度转换为场景坐标
    const position = this.latLngToScenePosition(project.lat, project.lng);
    
    // 只创建简单的项目标记轮廓
    const markerGeometry = new THREE.ConeGeometry(12, 30, 8);
    const markerMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xff4444,
      emissive: 0x442222
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(position.x, 15, position.z);
    marker.name = `marker-${project.name}`;
    marker.userData = { 
      projectData: project,
      isProjectMarker: true 
    };
    
    this.scene.add(marker);
    
    // 添加项目名称标签平面
    const labelGeometry = new THREE.PlaneGeometry(40, 8);
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 40;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, 200, 40);
    context.fillStyle = 'white';
    context.font = '16px Arial';
    context.textAlign = 'center';
    context.fillText(project.name, 100, 25);
    
    const labelTexture = new THREE.CanvasTexture(canvas);
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: labelTexture,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
    labelMesh.position.set(position.x, 35, position.z);
    this.scene.add(labelMesh);
  }
  
  private latLngToScenePosition(lat: number, lng: number): THREE.Vector3 {
    // 简化的坐标转换，适合深基坑项目显示
    const scale = 10; // 调整缩放比例
    const x = (lng - 116.4074) * scale * 111; // 以北京为中心
    const z = (lat - 39.9042) * scale * 111;
    return new THREE.Vector3(x, 0, z);
  }
  
  private setup3DTileLighting(): void {
    // 清除旧光源
    const lights = this.scene.children.filter(child => child.type.includes('Light'));
    lights.forEach(light => this.scene.remove(light));
    
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
    
    // 主光源
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(200, 200, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -1000;
    sunLight.shadow.camera.right = 1000;
    sunLight.shadow.camera.top = 1000;
    sunLight.shadow.camera.bottom = -1000;
    this.scene.add(sunLight);
    
    // 启用阴影
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  
  private setupCameraForProjects(projects: any[]): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      // 设置相机俯视所有项目
      this.camera.position.set(0, 300, 400);
      this.camera.lookAt(0, 0, 0);
    }
  }

  /**
   * 初始化真实地图瓦片服务
   */
  private initializeRealMapTiles(): void {
    console.log('🌍 加载真实地图瓦片...');

    // 创建地图平面用于显示真实瓦片
    const mapGeometry = new THREE.PlaneGeometry(1000, 1000);
    const mapMaterial = new THREE.MeshBasicMaterial({
      color: 0x4a90e2,
      transparent: true,
      opacity: 0.8
    });

    const mapPlane = new THREE.Mesh(mapGeometry, mapMaterial);
    mapPlane.rotation.x = -Math.PI / 2;
    mapPlane.name = 'real-map-base';
    this.scene.add(mapPlane);

    // 加载真实地图瓦片纹理
    this.loadMapTexture('https://tile.openstreetmap.org/8/211/107.png')
      .then(texture => {
        mapMaterial.map = texture;
        mapMaterial.needsUpdate = true;
        console.log('✅ 地图瓦片加载成功');
      })
      .catch(error => {
        console.warn('⚠️ 地图瓦片加载失败，使用默认样式');
      });

    // 设置基本照明
    this.setupBasicLighting();

    // 设置相机位置
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.position.set(0, 200, 300);
      this.camera.lookAt(0, 0, 0);
    }

    console.log('✅ 真实地图瓦片系统初始化完成');
  }

  private async loadMapTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.crossOrigin = 'anonymous';
      
      loader.load(
        url,
        (texture) => {
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          resolve(texture);
        },
        undefined,
        (error) => reject(error)
      );
    });
  }


  
  private createCinematicFlight(targetPosition: THREE.Vector3): void {
    if (!(this.camera instanceof THREE.PerspectiveCamera)) return;
    
    const startPosition = this.camera.position.clone();
    const startLookAt = new THREE.Vector3(0, 0, 0);
    
    // 计算飞行路径
    const flightHeight = 200;
    const flightDistance = 150;
    
    const endPosition = new THREE.Vector3(
      targetPosition.x,
      flightHeight,
      targetPosition.z + flightDistance
    );
    
    const endLookAt = targetPosition.clone();
    
    // 创建平滑的飞行动画
    const duration = 2000; // 2秒飞行时间
    const startTime = Date.now();
    
    const animateFlight = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用缓动函数创建平滑效果
      const easeProgress = this.easeInOutCubic(progress);
      
      // 插值计算当前位置
      const currentPosition = startPosition.clone().lerp(endPosition, easeProgress);
      const currentLookAt = startLookAt.clone().lerp(endLookAt, easeProgress);
      
      this.camera.position.copy(currentPosition);
      this.camera.lookAt(currentLookAt);
      
      if (progress < 1) {
        requestAnimationFrame(animateFlight);
      } else {
        console.log('🎬 电影级飞行完成！');
      }
    };
    
    animateFlight();
  }
  
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  /**
   * 经纬度转世界坐标 - geo-three使用简单坐标系统
   */
  private latLngToWorldPosition(lat: number, lng: number): THREE.Vector3 {
    // geo-three使用标准化的坐标系统，直接返回基于原点的位置
    // 在geo-three中，地图以原点为中心
    return new THREE.Vector3(0, 0, 0);
  }

  /**
   * 初始化天气系统
   */
  private async initializeWeatherSystems(): Promise<void> {
    try {
      // 创建云渲染系统边界框
      const boundingBox = new THREE.Box3(
        new THREE.Vector3(-1000, -100, -1000),
        new THREE.Vector3(1000, 100, 1000)
      );
      
      // 创建天气效果渲染器
      this.weatherEffects = new WeatherEffectsRenderer(this.scene, boundingBox);
      this.cloudSystem = new CloudRenderingSystem(this.scene, boundingBox);
      
      // 开始天气数据更新循环
      this.startWeatherUpdates();
      
      console.log('✅ 天气系统初始化完成');
    } catch (error) {
      console.error('❌ 天气系统初始化失败:', error);
    }
  }

  /**
   * 设置更新循环
   */
  private setupUpdateLoop(): void {
    // 这里可以添加定期更新逻辑
    console.log('🔄 更新循环已设置');
  }

  /**
   * 开始天气数据更新
   */
  private startWeatherUpdates(): void {
    if (this.weatherUpdateTimer) {
      clearInterval(this.weatherUpdateTimer);
    }

    // 立即更新一次
    this.updateWeatherData();

    // 设置定期更新
    this.weatherUpdateTimer = setInterval(() => {
      this.updateWeatherData();
    }, this.config.weatherUpdateInterval * 1000);
  }

  /**
   * 更新天气数据
   */
  private async updateWeatherData(): Promise<void> {
    try {
      const center = this.config.center || [39.9042, 116.4074];
      const [lat, lng] = center;
      
      const weatherData = await openMeteoService.getWeatherData(lat, lng);
      this.currentWeatherData = weatherData;
      
      // 更新天气效果
      if (this.weatherEffects) {
        this.weatherEffects.updateFromWeatherData(weatherData);
      }
      
      // 更新云系统
      if (this.cloudSystem) {
        this.cloudSystem.updateFromWeatherData(weatherData);
      }
      
      console.log(`🌤️ 天气数据已更新: ${weatherData.current.description}`);
    } catch (error) {
      console.error('天气数据更新失败:', error);
    }
  }

  /**
   * 主要更新方法 - 在渲染循环中调用
   */
  update(deltaTime?: number): void {
    if (!this.isInitialized) return;

    try {
      // 1. 更新简单瓦片渲染器
      if (this.simpleTileRenderer) {
        // SimpleTileRenderer有自己的更新机制
      }

      // 2. 更新天气效果
      if (this.weatherEffects && deltaTime) {
        this.weatherEffects.update(deltaTime);
      }

      // 3. 更新云系统
      if (this.cloudSystem) {
        this.cloudSystem.update(deltaTime);
      }

    } catch (error) {
      console.warn('渲染更新警告:', error);
    }
  }

  /**
   * 设置地图中心
   */
  setMapCenter(lat: number, lng: number): void {
    // 使用简单瓦片渲染器设置地图中心
    if (this.simpleTileRenderer) {
      this.simpleTileRenderer.setCenter(lat, lng);
    }
    this.config.center = [lat, lng];
    
    // 更新该位置的天气数据
    if (this.config.enableWeather) {
      this.updateWeatherData();
    }
  }

  /**
   * 设置缩放级别
   */
  setMapZoom(zoom: number): void {
    // 使用简单瓦片渲染器设置缩放级别
    if (this.simpleTileRenderer) {
      this.simpleTileRenderer.setZoom(zoom);
    }
    this.config.zoom = zoom;
  }

  /**
   * 切换地图图层
   */
  switchMapLayer(layerType: 'satellite' | 'terrain' | 'street'): void {
    // 切换地图样式
    console.log(`🎨 切换地图样式: ${layerType}`);
    // SimpleTileRenderer 使用 OpenStreetMap
  }

  /**
   * 启用/禁用天气效果
   */
  setWeatherEnabled(enabled: boolean): void {
    this.config.enableWeather = enabled;
    
    if (enabled && !this.weatherEffects) {
      this.initializeWeatherSystems();
    } else if (!enabled && this.weatherEffects) {
      this.weatherEffects.dispose();
      this.weatherEffects = null;
      
      if (this.cloudSystem) {
        this.cloudSystem.dispose();
        this.cloudSystem = null;
      }
      
      if (this.weatherUpdateTimer) {
        clearInterval(this.weatherUpdateTimer);
        this.weatherUpdateTimer = null;
      }
    }
  }


  /**
   * 获取当前天气数据
   */
  getCurrentWeather(): WeatherData | null {
    return this.currentWeatherData;
  }


  /**
   * 获取简单瓦片渲染器
   */
  getSimpleTileRenderer(): SimpleTileRenderer | null {
    return this.simpleTileRenderer;
  }

  /**
   * 获取天气效果渲染器
   */
  getWeatherEffects(): WeatherEffectsRenderer | null {
    return this.weatherEffects;
  }

  /**
   * 获取云渲染系统
   */
  getCloudSystem(): CloudRenderingSystem | null {
    return this.cloudSystem;
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 设置项目点击处理器
   */
  public setProjectClickHandler(handler: (projectId: string) => void): void {
    console.log('🎯 设置项目点击处理器');
    // 这里可以添加鼠标点击检测逻辑
    // 目前先保留接口，供后续扩展使用
  }

  /**
   * 测试瓦片刷新
   */
  public async testTileRefresh(): Promise<void> {
    console.log('🧪 测试瓦片刷新...');
    const currentProject = this.currentProject;
    if (currentProject && this.simpleTileRenderer) {
      this.simpleTileRenderer.setCenter(currentProject.location.lat, currentProject.location.lng);
      await this.simpleTileRenderer.loadVisibleTiles();
    }
    console.log('✅ 瓦片刷新完成');
  }

  /**
   * 诊断场景中的对象
   */
  private diagnoseSceneObjects(): void {
    console.log('🔍 诊断场景中的对象:');
    console.log(`  - 场景子对象总数: ${this.scene.children.length}`);
    
    this.scene.children.forEach((child, index) => {
      console.log(`  - [${index}] ${child.type} (${child.name || 'unnamed'}):`, {
        position: child.position,
        visible: child.visible,
        children: child.children.length
      });
      
      if (child instanceof THREE.Mesh) {
        console.log(`    + 网格信息:`, {
          geometry: child.geometry.constructor.name,
          material: child.material.constructor.name,
          triangles: child.geometry.attributes.position?.count / 3 || 0
        });
      }
    });
    
    // 检查简单瓦片渲染器的状态
    console.log('📊 简单瓦片渲染器状态:', this.simpleTileRenderer ? '已初始化' : '未初始化');
  }

  /**
   * 添加地图可见性辅助工具
   */
  private addMapVisibilityHelper(): void {
    console.log('🔧 添加地图可见性辅助工具...');
    
    // 添加坐标轴辅助线
    const axesHelper = new THREE.AxesHelper(100);
    axesHelper.name = 'map-axes-helper';
    this.scene.add(axesHelper);
    
    // 添加网格辅助线
    const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x444444);
    gridHelper.name = 'map-grid-helper';
    gridHelper.position.y = -1; // 稍微下沉，不遮挡地图
    this.scene.add(gridHelper);
    
    // 添加一个明显的测试立方体在原点
    const testGeometry = new THREE.BoxGeometry(10, 10, 10);
    const testMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      wireframe: true 
    });
    const testCube = new THREE.Mesh(testGeometry, testMaterial);
    testCube.name = 'test-cube-origin';
    testCube.position.set(0, 5, 0);
    this.scene.add(testCube);
    
    console.log('✅ 地图可见性辅助工具已添加');
  }

  /**
   * 销毁服务
   */
  dispose(): void {
    try {
      // 停止天气更新
      if (this.weatherUpdateTimer) {
        clearInterval(this.weatherUpdateTimer);
        this.weatherUpdateTimer = null;
      }

      // 销毁天气系统
      if (this.weatherEffects) {
        this.weatherEffects.dispose();
        this.weatherEffects = null;
      }

      if (this.cloudSystem) {
        this.cloudSystem.dispose();
        this.cloudSystem = null;
      }

      // 销毁简单瓦片渲染器
      if (this.simpleTileRenderer) {
        this.simpleTileRenderer = null;
      }

      this.isInitialized = false;
      console.log('🗑️ 统一地图渲染服务已销毁');
    } catch (error) {
      console.error('销毁服务失败:', error);
    }
  }
}

export default UnifiedMapRenderingService;