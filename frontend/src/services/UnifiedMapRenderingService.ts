/**
 * 统一地图渲染服务
 * 整合 three-tile + 3d-tiles-renderer + OpenMeteo
 * 提供完整的3D地图解决方案
 */

import * as THREE from 'three';
import { TilesRenderer } from '3d-tiles-renderer';
import { ThreeTileMapService, TileMapConfig } from './ThreeTileMapService';
import { openMeteoService, WeatherData } from './OpenMeteoService';
import { WeatherEffectsRenderer } from './WeatherEffectsRenderer';
import { CloudRenderingSystem } from './CloudRenderingSystem';

export interface UnifiedMapConfig {
  // three-tile配置
  tileMap: Partial<TileMapConfig>;
  
  // 3d-tiles配置
  tilesUrl?: string;
  enableTilesRenderer: boolean;
  
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
  private threeTileService: ThreeTileMapService;
  private tilesRenderer: TilesRenderer | null = null;
  private weatherEffects: WeatherEffectsRenderer | null = null;
  private cloudSystem: CloudRenderingSystem | null = null;
  
  // 配置和状态
  private config: UnifiedMapConfig;
  private isInitialized: boolean = false;
  private weatherUpdateTimer: NodeJS.Timeout | null = null;
  private currentWeatherData: WeatherData | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // 初始化three-tile服务
    this.threeTileService = new ThreeTileMapService(scene, camera, renderer);
    
    // 默认配置
    this.config = {
      tileMap: {
        center: [39.9042, 116.4074], // 北京
        zoom: 12,
        minZoom: 3,
        maxZoom: 18
      },
      enableTilesRenderer: true,
      tilesUrl: '/api/tiles/tileset.json', // 本地3D瓦片服务
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

      // 1. 初始化three-tile地图底图
      const tileMapSuccess = await this.threeTileService.initialize(this.config.tileMap);
      if (!tileMapSuccess) {
        console.error('❌ three-tile地图初始化失败');
        return false;
      }

      // 2. 初始化3D瓦片渲染器（如果启用且有URL）
      if (this.config.enableTilesRenderer && this.config.tilesUrl) {
        await this.initialize3DTiles();
      }

      // 3. 初始化天气系统（如果启用）
      if (this.config.enableWeather) {
        await this.initializeWeatherSystems();
      }

      // 4. 设置更新循环
      this.setupUpdateLoop();

      this.isInitialized = true;
      console.log('✅ 统一地图渲染服务初始化完成');
      return true;

    } catch (error) {
      console.error('❌ 统一地图渲染服务初始化失败:', error);
      return false;
    }
  }

  /**
   * 初始化3D瓦片渲染器
   */
  private async initialize3DTiles(): Promise<void> {
    try {
      if (!this.config.tilesUrl) return;

      // 检查本地瓦片服务是否可用
      try {
        const response = await fetch(this.config.tilesUrl);
        if (!response.ok) {
          console.warn('本地3D瓦片服务不可用，使用备用方案');
          this.createFallbackTerrain();
          return;
        }
      } catch (fetchError) {
        console.warn('无法连接到本地3D瓦片服务，使用备用方案');
        this.createFallbackTerrain();
        return;
      }

      this.tilesRenderer = new TilesRenderer(this.config.tilesUrl);
      
      // 配置瓦片渲染器
      this.tilesRenderer.setCamera(this.camera);
      this.tilesRenderer.setResolutionFromRenderer(this.camera, this.renderer);
      
      if (this.config.enableLOD) {
        this.tilesRenderer.lruCache.minSize = 900;
        this.tilesRenderer.lruCache.maxSize = 1300;
        this.tilesRenderer.errorTarget = 6;
      }

      // 添加到场景
      this.scene.add(this.tilesRenderer.group);
      
      console.log('✅ 3D瓦片渲染器初始化完成');
    } catch (error) {
      console.error('❌ 3D瓦片渲染器初始化失败:', error);
      this.createFallbackTerrain();
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
   * 初始化天气系统
   */
  private async initializeWeatherSystems(): Promise<void> {
    try {
      // 创建天气效果渲染器
      this.weatherEffects = new WeatherEffectsRenderer(this.scene);
      
      // 创建云渲染系统
      const boundingBox = new THREE.Box3(
        new THREE.Vector3(-1000, -100, -1000),
        new THREE.Vector3(1000, 100, 1000)
      );
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
      const center = this.config.tileMap.center || [39.9042, 116.4074];
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
  update(deltaTime: number): void {
    if (!this.isInitialized) return;

    try {
      // 1. 更新three-tile地图
      this.threeTileService.update();

      // 2. 更新3D瓦片渲染器
      if (this.tilesRenderer) {
        this.tilesRenderer.update();
      }

      // 3. 更新天气效果
      if (this.weatherEffects) {
        this.weatherEffects.update(deltaTime);
      }

      // 4. 更新云系统
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
    this.threeTileService.setCenter(lat, lng);
    this.config.tileMap.center = [lat, lng];
    
    // 更新该位置的天气数据
    if (this.config.enableWeather) {
      this.updateWeatherData();
    }
  }

  /**
   * 设置缩放级别
   */
  setMapZoom(zoom: number): void {
    this.threeTileService.setZoom(zoom);
    this.config.tileMap.zoom = zoom;
  }

  /**
   * 切换地图图层
   */
  switchMapLayer(layerType: 'satellite' | 'terrain' | 'street'): void {
    this.threeTileService.switchLayer(layerType);
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
   * 设置3D瓦片URL
   */
  set3DTilesUrl(url: string): void {
    this.config.tilesUrl = url;
    
    if (this.isInitialized && this.config.enableTilesRenderer) {
      // 重新初始化3D瓦片
      if (this.tilesRenderer) {
        this.scene.remove(this.tilesRenderer.group);
        this.tilesRenderer = null;
      }
      this.initialize3DTiles();
    }
  }

  /**
   * 获取当前天气数据
   */
  getCurrentWeather(): WeatherData | null {
    return this.currentWeatherData;
  }

  /**
   * 获取three-tile服务
   */
  getThreeTileService(): ThreeTileMapService {
    return this.threeTileService;
  }

  /**
   * 获取3D瓦片渲染器
   */
  get3DTilesRenderer(): TilesRenderer | null {
    return this.tilesRenderer;
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

      // 销毁3D瓦片渲染器
      if (this.tilesRenderer) {
        this.scene.remove(this.tilesRenderer.group);
        this.tilesRenderer = null;
      }

      // 销毁three-tile服务
      this.threeTileService.dispose();

      this.isInitialized = false;
      console.log('🗑️ 统一地图渲染服务已销毁');
    } catch (error) {
      console.error('销毁服务失败:', error);
    }
  }
}

export default UnifiedMapRenderingService;