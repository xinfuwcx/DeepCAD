/**
 * three-tile地图服务
 * 基于three-tile的轻量级3D瓦片地图渲染
 * 与3d-tiles-renderer和OpenMeteo完美集成
 */

import * as THREE from 'three';
// @ts-ignore - three-tile可能没有完整的类型定义
import { TileMap, TileLayer, MapControls } from 'three-tile';

export interface TileMapConfig {
  center: [number, number]; // [lat, lng]
  zoom: number;
  minZoom: number;
  maxZoom: number;
  tileSize: number;
  providers: {
    satellite?: string;
    terrain?: string;
    street?: string;
  };
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export class ThreeTileMapService {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private tileMap: any; // TileMap from three-tile
  private mapControls: any; // MapControls from three-tile
  private config: TileMapConfig;
  private isInitialized: boolean = false;

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // 默认配置
    this.config = {
      center: [39.9042, 116.4074], // 北京坐标
      zoom: 10,
      minZoom: 3,
      maxZoom: 18,
      tileSize: 256,
      providers: {
        satellite: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        terrain: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
        street: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
      }
    };
  }

  /**
   * 初始化three-tile地图
   */
  async initialize(config?: Partial<TileMapConfig>): Promise<boolean> {
    try {
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // 创建瓦片地图
      this.tileMap = new TileMap({
        center: this.config.center,
        zoom: this.config.zoom,
        minZoom: this.config.minZoom,
        maxZoom: this.config.maxZoom,
        tileSize: this.config.tileSize
      });

      // 添加瓦片图层 - 默认使用OpenStreetMap
      const streetLayer = new TileLayer({
        source: this.config.providers.street,
        opacity: 1.0
      });
      
      this.tileMap.addLayer(streetLayer);

      // 创建地图控制器
      this.mapControls = new MapControls(this.camera, this.renderer.domElement);
      this.mapControls.enableDamping = true;
      this.mapControls.dampingFactor = 0.05;

      // 将地图添加到场景
      this.scene.add(this.tileMap);

      this.isInitialized = true;
      console.log('✅ three-tile地图初始化完成');
      return true;

    } catch (error) {
      console.error('❌ three-tile地图初始化失败:', error);
      return false;
    }
  }

  /**
   * 更新地图渲染
   */
  update(): void {
    if (!this.isInitialized || !this.tileMap || !this.mapControls) return;

    try {
      // 更新地图控制器
      this.mapControls.update();
      
      // 更新瓦片地图
      this.tileMap.update(this.camera);
    } catch (error) {
      console.warn('地图更新警告:', error);
    }
  }

  /**
   * 设置地图中心点
   */
  setCenter(lat: number, lng: number): void {
    if (!this.isInitialized || !this.tileMap) return;

    try {
      this.tileMap.setCenter([lat, lng]);
      console.log(`🗺️ 地图中心设置为: ${lat}, ${lng}`);
    } catch (error) {
      console.error('设置地图中心失败:', error);
    }
  }

  /**
   * 设置缩放级别
   */
  setZoom(zoom: number): void {
    if (!this.isInitialized || !this.tileMap) return;

    try {
      const clampedZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, zoom));
      this.tileMap.setZoom(clampedZoom);
      console.log(`🔍 地图缩放设置为: ${clampedZoom}`);
    } catch (error) {
      console.error('设置地图缩放失败:', error);
    }
  }

  /**
   * 切换地图图层
   */
  switchLayer(layerType: keyof TileMapConfig['providers']): void {
    if (!this.isInitialized || !this.tileMap) return;

    try {
      const layerUrl = this.config.providers[layerType];
      if (!layerUrl) {
        console.warn(`图层类型 ${layerType} 未配置`);
        return;
      }

      // 清除现有图层
      this.tileMap.clearLayers();

      // 添加新图层
      const newLayer = new TileLayer({
        source: layerUrl,
        opacity: 1.0
      });
      
      this.tileMap.addLayer(newLayer);
      console.log(`🗺️ 切换到${layerType}图层`);
    } catch (error) {
      console.error('切换图层失败:', error);
    }
  }

  /**
   * 获取当前地图边界
   */
  getBounds(): MapBounds | null {
    if (!this.isInitialized || !this.tileMap) return null;

    try {
      const bounds = this.tileMap.getBounds();
      return {
        north: bounds.north,
        south: bounds.south,
        east: bounds.east,
        west: bounds.west
      };
    } catch (error) {
      console.error('获取地图边界失败:', error);
      return null;
    }
  }

  /**
   * 经纬度转世界坐标
   */
  latLngToWorldPosition(lat: number, lng: number): THREE.Vector3 | null {
    if (!this.isInitialized || !this.tileMap) return null;

    try {
      const worldPos = this.tileMap.latLngToWorld(lat, lng);
      return new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
    } catch (error) {
      console.error('坐标转换失败:', error);
      return null;
    }
  }

  /**
   * 世界坐标转经纬度
   */
  worldPositionToLatLng(position: THREE.Vector3): [number, number] | null {
    if (!this.isInitialized || !this.tileMap) return null;

    try {
      const latLng = this.tileMap.worldToLatLng(position.x, position.y, position.z);
      return [latLng.lat, latLng.lng];
    } catch (error) {
      console.error('坐标转换失败:', error);
      return null;
    }
  }

  /**
   * 获取地图对象（用于与3d-tiles-renderer集成）
   */
  getTileMap(): any {
    return this.tileMap;
  }

  /**
   * 获取地图控制器
   */
  getMapControls(): any {
    return this.mapControls;
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 销毁地图服务
   */
  dispose(): void {
    try {
      if (this.tileMap) {
        this.scene.remove(this.tileMap);
        this.tileMap.dispose?.();
      }
      
      if (this.mapControls) {
        this.mapControls.dispose?.();
      }

      this.isInitialized = false;
      console.log('🗑️ three-tile地图服务已销毁');
    } catch (error) {
      console.error('销毁地图服务失败:', error);
    }
  }
}

export default ThreeTileMapService;