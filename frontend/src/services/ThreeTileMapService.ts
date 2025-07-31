/**
 * three-tile地图服务
 * 基于three-tile的轻量级3D瓦片地图渲染
 * 与3d-tiles-renderer和OpenMeteo完美集成
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// 正确的 three-tile 导入方式
import { TileMap, TileSource } from 'three-tile';
import { testThreeTile } from '../test-three-tile';

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
  private mapControls: OrbitControls; // OrbitControls from three.js
  private config: TileMapConfig;
  private isInitialized: boolean = false;

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // 默认配置 - 严格限制性能
    this.config = {
      center: [39.9042, 116.4074], // 北京坐标
      zoom: 10,
      minZoom: 8, // 提高最小缩放级别，大幅减少瓦片数量
      maxZoom: 15, // 降低最大缩放级别，避免过度加载
      tileSize: 256,
      providers: {
        street: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' // 只使用OSM，移除其他来源
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

      console.log('🗺️ 开始创建three-tile地图...');
      
      // 首先运行基础测试
      console.log('🧪 运行three-tile基础测试...');
      const testResult = testThreeTile();
      console.log('📋 测试结果:', testResult);

      // 创建OpenStreetMap数据源 - 使用正确的构造方式
      const osmSource = new TileSource({
        dataType: 'image',
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', // 标准 OSM URL 格式
        attribution: '© OpenStreetMap contributors',
        minLevel: this.config.minZoom,
        maxLevel: this.config.maxZoom,
        projectionID: '3857', // Web Mercator投影
        opacity: 1.0,
        transparent: false
      });

      console.log('📍 OSM数据源已创建:', osmSource);

      // 创建瓦片地图 - 使用正确的静态方法和参数结构
      this.tileMap = TileMap.create({
        imgSource: osmSource, // 影像数据源
        minLevel: this.config.minZoom, // 最小缩放级别
        maxLevel: this.config.maxZoom, // 最大缩放级别
        backgroundColor: 0x4169E1, // 背景色
        bounds: [110, 30, 130, 50], // 中国东部区域 [西, 南, 东, 北]
        debug: 1 // 调试模式
      });
      
      console.log('🗺️ TileMap已创建:', this.tileMap);

      // 将地图添加到场景 - 在设置其他属性之前
      this.scene.add(this.tileMap);
      
      // 确保地图在原点并可见
      this.tileMap.position.set(0, 0, 0);
      this.tileMap.scale.set(1, 1, 1);
      this.tileMap.visible = true;
      
      // 保持默认配置让地图正常工作
      this.tileMap.autoUpdate = true; // 启用自动更新
      this.tileMap.LODThreshold = 1.0; // 使用默认LOD阈值
      
      // 修复相机设置 - 使用适合地图瓦片的缩放比例
      if (this.camera instanceof THREE.PerspectiveCamera) {
        // three-tile的地图瓦片通常在较小的坐标范围内，所以调整相机位置
        this.camera.position.set(0, 100, 100); // 降低高度，更接近地图
        this.camera.near = 0.1;
        this.camera.far = 2000;
        this.camera.updateProjectionMatrix();
        this.camera.lookAt(0, 0, 0);
        console.log('📹 相机设置为地图视角:', this.camera.position);
      }

      // 创建地图控制器（仅在没有现有控制器时创建）
      if (!this.mapControls) {
        this.mapControls = new OrbitControls(this.camera as THREE.PerspectiveCamera, this.renderer.domElement);
        this.mapControls.enableDamping = true;
        this.mapControls.dampingFactor = 0.05;
        // 调整控制器限制，适合查看地图瓦片
        this.mapControls.minDistance = 1;
        this.mapControls.maxDistance = 500;
        this.mapControls.maxPolarAngle = Math.PI / 2;
      }

      // 添加环境光照（检查是否已存在）
      const existingLights = this.scene.children.filter(child => child.type.includes('Light'));
      if (existingLights.length === 0) {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(10, 10, 5);
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);
        console.log('💡 已添加地图照明');
      }
      console.log('📹 相机设置完成:', this.camera.position);
      
      // 添加地图状态诊断
      this.diagnoseTileMapState();
      
      // 设置地图初始中心点和缩放
      await this.setMapInitialView();
      
      console.log('✅ ThreeTileMapService初始化完成');
      
      
      // 调试信息
      console.log('🗺️ TileMap对象:', this.tileMap);
      console.log('📦 TileMap位置:', this.tileMap.position);
      console.log('📏 TileMap缩放:', this.tileMap.scale);
      console.log('🔢 TileMap子对象数量:', this.tileMap.children?.length || 0);
      console.log('🎯 场景对象数量:', this.scene.children.length);
      console.log('📍 地图中心:', this.config.center);
      console.log('🔍 缩放级别:', this.config.zoom);
      console.log('🎨 TileMap可见性:', this.tileMap.visible);
      console.log('🔍 TileMap边界框:', this.tileMap.boundingBox);
      
      // 强制设置地图可见和材质属性
      this.tileMap.visible = true;
      
      // 遍历子对象检查材质
      this.tileMap.traverse((child: any) => {
        if (child.isMesh) {
          console.log('🧱 发现网格对象:', child);
          if (child.material) {
            console.log('🎨 网格材质:', child.material);
            // 确保材质可见
            child.material.visible = true;
            child.material.transparent = false;
            child.material.side = THREE.DoubleSide;
            if (child.material.opacity !== undefined) {
              child.material.opacity = 1.0;
            }
            child.material.needsUpdate = true;
          }
        }
      });
      
      // 保持自动更新启用
      this.tileMap.autoUpdate = true;
      
      // 强制触发地图更新并详细检查
      setTimeout(() => {
        if (this.tileMap && this.camera) {
          this.camera.updateMatrixWorld();
          this.tileMap.update(this.camera);
          
          console.log('🔄 地图更新检查:');
          console.log('- 瓦片数量:', this.tileMap.children?.length || 0);
          console.log('- 地图位置:', this.tileMap.position);
          console.log('- 地图可见性:', this.tileMap.visible);
          console.log('- 地图bounds:', this.tileMap.bounds);
          console.log('- 地图minLevel:', this.tileMap.minLevel);
          console.log('- 地图maxLevel:', this.tileMap.maxLevel);
          console.log('- 场景中总对象数:', this.scene.children.length);
          
          // 遍历检查瓦片对象
          let tileCount = 0;
          this.tileMap.traverse((child) => {
            if (child.type === 'Mesh') {
              tileCount++;
              console.log(`🧩 瓦片${tileCount}:`, {
                type: child.type,
                visible: child.visible,
                position: child.position,
                material: child.material?.type || 'no material'
              });
            }
          });
          
          console.log(`✅ 找到 ${tileCount} 个瓦片对象`);
        }
      }, 2000); // 增加延迟确保瓦片加载

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
    if (!this.isInitialized || !this.tileMap || !this.mapControls) {
      // 减少无用的警告输出
      return;
    }

    try {
      // 更新地图控制器
      this.mapControls.update();
      
      // 正常更新地图
      this.camera.updateMatrixWorld();
      this.tileMap.update(this.camera);
      
      // 每200帧输出一次调试信息（减少日志频率）
      if (Math.random() < 0.005) {
        console.log('🔄 地图更新中 - 瓦片数量:', this.tileMap.children?.length || 0);
        console.log('📹 当前相机位置:', this.camera.position);
        
        // 检查是否有新的子网格对象
        let meshCount = 0;
        let visibleMeshCount = 0;
        this.tileMap.traverse((child: any) => {
          if (child.isMesh) {
            meshCount++;
            if (child.visible) visibleMeshCount++;
          }
        });
        console.log(`🧱 网格对象: ${meshCount} 总数, ${visibleMeshCount} 可见`);
      }
    } catch (error) {
      console.warn('❌ 地图更新错误:', error);
    }
  }

  /**
   * 设置地图初始视图
   */
  private async setMapInitialView(): Promise<void> {
    if (!this.tileMap) return;
    
    try {
      // 设置地图到北京中心
      const [lat, lng] = this.config.center;
      console.log(`🎯 设置地图初始视图: ${lat}, ${lng}, zoom: ${this.config.zoom}`);
      
      // 等待地图完全初始化
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 设置地图级别
      this.tileMap.minLevel = this.config.minZoom;
      this.tileMap.maxLevel = this.config.maxZoom;
      
      // 设置LOD阈值以优化性能
      this.tileMap.LODThreshold = 1.0; // 默认值，可调整
      
      // 设置地图中心（通过地理坐标转换）
      const centerGeo = new THREE.Vector3(lng, lat, 0);
      const centerWorld = this.tileMap.geo2world(centerGeo);
      
      // 调整相机位置到地图中心上方
      this.camera.position.set(centerWorld.x, 1000, centerWorld.z + 500);
      this.camera.lookAt(centerWorld.x, 0, centerWorld.z);
      
      // 强制触发地图更新
      if (typeof this.tileMap.update === 'function') {
        this.tileMap.update(this.camera);
      }
      
      console.log('✅ 地图初始视图设置完成 - 中心世界坐标:', centerWorld);
    } catch (error) {
      console.error('❌ 设置地图初始视图失败:', error);
      // 备用方案：使用默认位置
      this.camera.position.set(0, 1000, 500);
      this.camera.lookAt(0, 0, 0);
    }
  }

  /**
   * 设置地图中心点（通过移动相机到指定地理位置）
   */
  setCenter(lat: number, lng: number): void {
    if (!this.isInitialized || !this.tileMap) return;

    try {
      // 简化的相机定位方式，避免复杂的坐标转换
      // 使用相对于地图中心的偏移量来设置相机位置
      const centerOffset = {
        x: (lng - 116.4074) * 100, // 相对于北京的偏移
        z: (lat - 39.9042) * 100
      };
      
      // 保持相机在合适的高度，移动到新的中心位置上方
      const currentHeight = this.camera.position.y;
      this.camera.position.set(centerOffset.x, Math.max(currentHeight, 300), centerOffset.z);
      this.camera.lookAt(centerOffset.x, 0, centerOffset.z);
      this.camera.updateProjectionMatrix();
      
      // 更新地图控制器的目标
      if (this.mapControls) {
        this.mapControls.target.set(centerOffset.x, 0, centerOffset.z);
        this.mapControls.update();
      }
      
      // 强制更新地图
      this.tileMap.update(this.camera);
      
      console.log(`🗺️ 地图中心设置为: ${lat}, ${lng}`);
    } catch (error) {
      console.error('设置地图中心失败:', error);
    }
  }

  /**
   * 设置缩放级别（通过调整相机高度）
   */
  setZoom(zoom: number): void {
    if (!this.isInitialized || !this.tileMap) return;

    try {
      const clampedZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, zoom));
      
      // 根据缩放级别计算相机高度 - 修复高度计算
      const height = Math.max(500, 20000 / Math.pow(2, clampedZoom - 8));
      const currentPos = this.camera.position.clone();
      this.camera.position.setY(height);
      
      console.log(`🔍 地图缩放设置为: ${clampedZoom}, 相机高度: ${height}`);
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

      // 创建新的数据源
      const newSource = new TileSource({
        dataType: 'image',
        url: layerUrl,
        attribution: '© Map contributors',
        minLevel: this.config.minZoom,
        maxLevel: this.config.maxZoom,
        projectionID: '3857',
        opacity: 1.0,
        transparent: false
      });
      
      // 更新地图数据源
      this.tileMap.imgSource = newSource;
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
      const bounds = this.tileMap.bounds;
      return {
        north: bounds[3], // maxLat
        south: bounds[1], // minLat
        east: bounds[2],  // maxLng
        west: bounds[0]   // minLng
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
      const geoPos = new THREE.Vector3(lng, lat, 0);
      const worldPos = this.tileMap.geo2world(geoPos);
      return worldPos;
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
      const geoPos = this.tileMap.world2geo(position);
      return [geoPos.y, geoPos.x]; // lat, lng
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
   * 诊断地图状态
   */
  private diagnoseTileMapState(): void {
    if (!this.tileMap) {
      console.warn('⚠️ tileMap对象为空');
      return;
    }
    
    console.log('🔍 诊断three-tile地图状态:');
    console.log('  - 位置:', this.tileMap.position);
    console.log('  - 缩放:', this.tileMap.scale);
    console.log('  - 可见性:', this.tileMap.visible);
    console.log('  - 子对象数量:', this.tileMap.children.length);
    console.log('  - 自动更新:', this.tileMap.autoUpdate);
    console.log('  - LOD阈值:', this.tileMap.LODThreshold);
    
    // 检查材质问题
    this.tileMap.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material;
        if (material) {
          console.log('  - 网格材质:', {
            transparent: material.transparent,
            opacity: material.opacity,
            visible: material.visible,
            side: material.side
          });
        }
      }
    });
  }

  /**
   * 销毁地图服务
   */
  dispose(): void {
    try {
      if (this.tileMap) {
        // 停止自动更新
        this.tileMap.autoUpdate = false;
        
        // 从场景中移除
        this.scene.remove(this.tileMap);
        
        // 调用three-tile的销毁方法
        if (typeof this.tileMap.dispose === 'function') {
          this.tileMap.dispose();
        }
        
        this.tileMap = null;
      }
      
      if (this.mapControls) {
        this.mapControls.dispose();
        this.mapControls = null;
      }

      this.isInitialized = false;
      console.log('🗑️ three-tile地图服务已销毁');
    } catch (error) {
      console.error('销毁地图服务失败:', error);
    }
  }
}

export default ThreeTileMapService;