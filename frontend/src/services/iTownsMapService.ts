/**
 * iTowns地图服务
 * 基于iTowns的专业3D地图渲染
 * 替换geo-three，提供稳定的地图功能
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as itowns from 'itowns';

export interface iTownsMapConfig {
  center: [number, number]; // [lat, lng]
  zoom: number;
  minZoom: number;
  maxZoom: number;
  tilt: number; // 俯仰角
  heading: number; // 方位角
}

export class iTownsMapService {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private view: itowns.GlobeView | null = null;
  private mapControls: OrbitControls | null = null;
  private config: iTownsMapConfig;
  private isInitialized: boolean = false;

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // 默认配置
    this.config = {
      center: [39.9042, 116.4074], // 北京坐标
      zoom: 12,
      minZoom: 2,
      maxZoom: 18,
      tilt: 45, // 45度俯视角
      heading: 0  // 正北方向
    };
  }

  /**
   * 初始化iTowns地图
   */
  async initialize(config?: Partial<iTownsMapConfig>): Promise<boolean> {
    try {
      if (config) {
        this.config = { ...this.config, ...config };
      }

      console.log('🗺️ 开始初始化iTowns地图...');
      
      // 1. 创建iTowns视图
      console.log('🚀 创建iTowns GlobeView...');
      await this.createGlobeView();
      
      // 2. 添加OpenStreetMap图层
      console.log('🚀 添加OpenStreetMap图层...');
      this.addOSMLayer();
      
      // 3. 设置初始位置
      console.log('🚀 设置初始位置...');
      this.setInitialView();
      
      // 4. 设置控制器
      console.log('🚀 设置相机控制器...');
      this.setupControls();
      
      this.isInitialized = true;
      console.log('✅ iTowns地图初始化完成');
      return true;

    } catch (error) {
      console.error('❌ iTowns地图初始化失败:', error);
      return false;
    }
  }

  /**
   * 创建iTowns GlobeView
   */
  private async createGlobeView(): Promise<void> {
    console.log('🗺️ 创建iTowns GlobeView...');
    console.log('渲染器domElement:', this.renderer.domElement);
    console.log('配置中心点:', this.config.center);
    
    // 创建iTowns的GlobeView（根据研究，GlobeView比PlanarView更适合显示瓦片）
    const placement = {
      coord: new itowns.Coordinates('EPSG:4326', this.config.center[1], this.config.center[0]),
      tilt: this.config.tilt,
      heading: this.config.heading,
      range: this.zoomToRange(this.config.zoom)
    };
    
    this.view = new itowns.GlobeView(this.renderer.domElement, placement);

    console.log('iTowns视图对象:', this.view);
    console.log('iTowns场景:', this.view.scene);
    console.log('iTowns相机:', this.view.camera);
    
    // 启动iTowns的渲染循环
    console.log('🔄 启动iTowns渲染循环...');
    this.startRenderLoop();
    
    console.log('✅ GlobeView创建完成');
  }

  /**
   * 添加OpenStreetMap图层
   */
  private addOSMLayer(): void {
    if (!this.view) return;

    try {
      console.log('🗺️ 正在添加OpenStreetMap图层...');
      
      // 使用简单的TMS源而不是WMTS
      const osmSource = new itowns.TMSSource({
        format: 'image/png',
        url: 'https://tile.openstreetmap.org/${z}/${x}/${y}.png',
        crs: 'EPSG:3857',
        attribution: {
          name: 'OpenStreetMap contributors',
          url: 'https://www.openstreetmap.org/copyright'
        }
      });

      // 创建彩色图层
      const osmLayer = new itowns.ColorLayer('OpenStreetMap', {
        source: osmSource,
        transparent: false
      });

      // 添加到视图
      this.view.addLayer(osmLayer).then(() => {
        console.log('✅ OpenStreetMap图层添加成功');
        // 强制更新视图
        this.view!.notifyChange();
      }).catch(error => {
        console.error('❌ OpenStreetMap图层添加失败:', error);
      });
      
    } catch (error) {
      console.error('❌ 添加OpenStreetMap图层时出错:', error);
    }
  }

  /**
   * 设置初始视图
   */
  private setInitialView(): void {
    if (!this.view) return;
    
    const [lat, lng] = this.config.center;
    console.log(`🎯 设置地图中心: ${lat}, ${lng}`);
    
    try {
      // 设置相机位置
      this.view.controls.lookAtCoordinate({
        coord: new itowns.Coordinates('EPSG:4326', lng, lat),
        range: this.zoomToRange(this.config.zoom),
        tilt: this.config.tilt,
        heading: this.config.heading
      });
      
      console.log('✅ 初始视图设置完成');
    } catch (error) {
      console.warn('⚠️ 设置初始视图失败:', error);
    }
  }

  /**
   * 设置控制器
   */
  private setupControls(): void {
    if (!this.view) return;

    // iTowns自带控制器，配置基本参数
    try {
      // 设置缩放参数
      if (this.view.controls.setZoomInFactor) {
        this.view.controls.setZoomInFactor(1.2);
      }
      if (this.view.controls.setZoomOutFactor) {
        this.view.controls.setZoomOutFactor(0.8);
      }
      
      console.log('✅ iTowns控制器设置完成');
    } catch (error) {
      console.warn('⚠️ 部分控制器设置失败，使用默认配置:', error);
    }
  }

  /**
   * 缩放级别转换为距离
   */
  private zoomToRange(zoom: number): number {
    // iTowns使用距离（米），需要从缩放级别转换
    const earthCircumference = 40075016.686; // 地球周长（米）
    const range = earthCircumference / Math.pow(2, zoom + 1);
    return Math.max(1000, range); // 最小距离1000米
  }

  /**
   * 距离转换为缩放级别
   */
  private rangeToZoom(range: number): number {
    const earthCircumference = 40075016.686;
    return Math.log2(earthCircumference / range) - 1;
  }

  /**
   * 启动iTowns渲染循环
   */
  private startRenderLoop(): void {
    if (!this.view) return;
    
    const animate = () => {
      try {
        // iTowns需要主动渲染
        this.view!.render();
      } catch (error) {
        console.warn('iTowns渲染错误:', error);
      }
      requestAnimationFrame(animate);
    };
    
    animate();
    console.log('✅ iTowns渲染循环已启动');
  }

  /**
   * 更新地图渲染
   */
  update(): void {
    if (!this.isInitialized || !this.view) {
      return;
    }

    try {
      // 通知iTowns更新
      this.view.notifyChange();
    } catch (error) {
      console.warn('❌ iTowns地图更新错误:', error);
    }
  }

  /**
   * 设置地图中心
   */
  setCenter(lat: number, lng: number): void {
    if (!this.isInitialized || !this.view) return;

    try {
      this.view.controls.lookAtCoordinate({
        coord: new itowns.Coordinates('EPSG:4326', lng, lat),
        range: this.zoomToRange(this.config.zoom)
      });
      
      this.config.center = [lat, lng];
      console.log(`🗺️ 地图中心设置为: ${lat}, ${lng}`);
    } catch (error) {
      console.error('设置地图中心失败:', error);
    }
  }

  /**
   * 设置缩放级别
   */
  setZoom(zoom: number): void {
    if (!this.isInitialized || !this.view) return;

    try {
      const clampedZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, zoom));
      const range = this.zoomToRange(clampedZoom);
      
      this.view.controls.setRange(range);
      this.config.zoom = clampedZoom;
      
      console.log(`🔍 地图缩放设置为: ${clampedZoom}`);
    } catch (error) {
      console.error('设置地图缩放失败:', error);
    }
  }

  /**
   * 获取iTowns视图对象
   */
  getView(): itowns.GlobeView | null {
    return this.view;
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
      if (this.view) {
        // 清理iTowns视图
        this.view.dispose();
        this.scene.remove(this.view.scene);
        this.view = null;
      }
      
      this.isInitialized = false;
      console.log('🗑️ iTowns地图服务已销毁');
    } catch (error) {
      console.error('销毁iTowns地图服务失败:', error);
    }
  }
}

export default iTownsMapService;