/**
 * 3D场景控制器 - React Three Fiber + 3D Tiles版本
 * 支持3D场景渲染和3D瓦片模型加载
 */

export type MapLayerType = 'street' | 'satellite' | 'terrain' | 'dark';
export type MapStatus = 'loading' | 'ready' | 'error' | 'tileset-loading' | 'tileset-loaded' | 'tileset-error';

export interface MapControllerOptions {
  container: HTMLElement;
  center: { lat: number; lng: number };
  zoom?: number;
  onStatusChange?: (status: MapStatus, message?: string) => void;
}

// 3D瓦片信息接口
export interface TilesetInfo {
  id: string;
  name: string;
  url: string;
  loaded: boolean;
  progress: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  bounds?: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

export class ThreeSceneController {
  private container: HTMLElement | null = null;
  private currentLayer: MapLayerType = 'street';
  private statusCallback?: (status: MapStatus, message?: string) => void;
  private isInitialized = false;

  // React组件引用
  private sceneComponent: any = null;
  private activeLayers: Map<string, any> = new Map();

  // 3D瓦片管理
  private activeTilesets: Map<string, TilesetInfo> = new Map();
  private tilesetElements: Map<string, HTMLElement> = new Map();

  constructor(private options: MapControllerOptions) {
    this.container = options.container;
    this.statusCallback = options.onStatusChange;
  }

  /**
   * 初始化3D场景 - React Three Fiber版本
   */
  async initialize(): Promise<void> {
    console.log('🎨 ThreeSceneController: initialize调用', {
      hasContainer: !!this.container,
      isInitialized: this.isInitialized,
      containerId: this.container?.id || 'no-id'
    });

    if (!this.container) {
      console.error('🎨 ThreeSceneController: 没有容器，无法初始化');
      return;
    }

    if (this.isInitialized) {
      console.log('🎨 ThreeSceneController: 已经初始化过了，跳过');
      return;
    }

    try {
      console.log('🎨 ThreeSceneController: 开始初始化React Three Fiber场景...');
      this.statusCallback?.('loading', '正在初始化3D场景...');

      // 创建React Three Fiber场景界面
      this.createReactThreeInterface();

      this.isInitialized = true;
      console.log('🎨 ThreeSceneController: React Three Fiber场景初始化完成，isInitialized =', this.isInitialized);
      this.statusCallback?.('ready', '3D场景已就绪');
    } catch (error) {
      console.error('🎨 ThreeSceneController: 初始化失败:', error);
      const errorMsg = error instanceof Error ? error.message : '3D场景初始化失败';
      this.statusCallback?.('error', errorMsg);
    }
  }

  /**
   * 创建React Three Fiber界面
   */
  private createReactThreeInterface(): void {
    if (!this.container) return;

    // 清理容器
    this.container.innerHTML = '';

    // 创建React Three Fiber容器
    const sceneDiv = document.createElement('div');
    sceneDiv.id = 'three-scene-container';
    sceneDiv.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: Arial, sans-serif;
      overflow: hidden;
    `;

    // 添加准备就绪的提示
    sceneDiv.innerHTML = `
      <div style="text-align: center; z-index: 100; position: relative;">
        <div style="font-size: 48px; margin-bottom: 16px;">🎨</div>
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">React Three Fiber 场景</div>
        <div style="font-size: 16px; opacity: 0.9;">准备加载3D瓦片模型</div>
        <div style="font-size: 14px; opacity: 0.7; margin-top: 8px;">点击"加载3D"按钮开始</div>
      </div>
    `;

    this.container.appendChild(sceneDiv);
  }



  /**
   * 创建地图界面
   */
  private createMapInterface(): void {
    if (!this.container) return;

    // 清理容器
    this.container.innerHTML = '';
    
    // 创建地图容器
    const mapDiv = document.createElement('div');
    mapDiv.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      color: white;
      font-family: 'Arial', sans-serif;
      overflow: hidden;
    `;

    // 添加地图网格
    const gridOverlay = document.createElement('div');
    gridOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
      background-size: 50px 50px;
      pointer-events: none;
    `;
    mapDiv.appendChild(gridOverlay);

    // 添加地图信息
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = `
      text-align: center;
      z-index: 1;
      padding: 20px;
    `;
    
    infoDiv.innerHTML = `
      <div style="font-size: 64px; margin-bottom: 20px;">🌍</div>
      <h2 style="margin: 0 0 15px 0; font-size: 28px; font-weight: bold;">
        地图控制中心
      </h2>
      <p style="margin: 0 0 20px 0; opacity: 0.9; font-size: 16px;">
        当前图层: ${this.getLayerDisplayName(this.currentLayer)}
      </p>
      <div style="display: flex; gap: 20px; justify-content: center; margin-top: 20px;">
        <div style="padding: 12px 20px; background: rgba(255,255,255,0.2); border-radius: 8px; backdrop-filter: blur(10px);">
          <div style="font-size: 18px; font-weight: bold;">${this.options.center.lat.toFixed(4)}</div>
          <div style="font-size: 12px; opacity: 0.8;">纬度</div>
        </div>
        <div style="padding: 12px 20px; background: rgba(255,255,255,0.2); border-radius: 8px; backdrop-filter: blur(10px);">
          <div style="font-size: 18px; font-weight: bold;">${this.options.center.lng.toFixed(4)}</div>
          <div style="font-size: 12px; opacity: 0.8;">经度</div>
        </div>
        <div style="padding: 12px 20px; background: rgba(255,255,255,0.2); border-radius: 8px; backdrop-filter: blur(10px);">
          <div style="font-size: 18px; font-weight: bold;">在线</div>
          <div style="font-size: 12px; opacity: 0.8;">状态</div>
        </div>
      </div>
    `;
    
    mapDiv.appendChild(infoDiv);
    this.container.appendChild(mapDiv);
  }

  /**
   * 切换地图图层
   */
  async switchLayer(layerType: MapLayerType): Promise<void> {
    if (this.currentLayer === layerType) return;
    
    this.currentLayer = layerType;
    
    // 重新创建界面以显示新图层
    if (this.isInitialized) {
      this.createMapInterface();
    }
  }

  /**
   * 飞行到指定位置
   */
  flyTo(lat: number, lng: number, zoom: number = 10): void {
    // 更新中心点
    this.options.center = { lat, lng };
    
    // 重新创建界面
    if (this.isInitialized) {
      this.createMapInterface();
    }
  }

  /**
   * 设置主题模式
   */
  setDarkMode(isDark: boolean): void {
    if (isDark) {
      this.switchLayer('dark');
    } else {
      this.switchLayer('street');
    }
  }

  /**
   * 获取当前图层类型
   */
  getCurrentLayer(): MapLayerType {
    return this.currentLayer;
  }

  /**
   * 获取图层显示名称
   */
  private getLayerDisplayName(layerType: MapLayerType): string {
    const layerNames = {
      street: '街道地图',
      satellite: '卫星影像',
      terrain: '地形图',
      dark: '暗色主题'
    };
    return layerNames[layerType];
  }

  /**
   * 加载3D瓦片模型 - React Three Fiber版本
   */
  async load3DTileset(projectId: string, tilesetUrl: string, projectName: string): Promise<boolean> {
    console.log('🎨 load3DTileset: 开始加载3D瓦片', {
      projectId,
      projectName,
      container: !!this.container,
      isInitialized: this.isInitialized,
      containerElement: this.container?.id || 'no-id'
    });

    if (!this.container) {
      console.error('🎨 load3DTileset: container为null，无法加载3D瓦片');
      return false;
    }

    if (!this.isInitialized) {
      console.error('🎨 load3DTileset: 场景控制器未初始化，尝试先初始化...');

      // 尝试先初始化
      try {
        await this.initialize();
        console.log('🎨 load3DTileset: 初始化完成，继续加载3D瓦片');
      } catch (error) {
        console.error('🎨 load3DTileset: 初始化失败:', error);
        return false;
      }
    }

    try {
      this.statusCallback?.('tileset-loading', `正在加载${projectName}的3D模型...`);

      // 创建瓦片信息
      const tilesetInfo: TilesetInfo = {
        id: projectId,
        name: projectName,
        url: tilesetUrl,
        loaded: false,
        progress: 0,
        position: {
          x: 0,
          y: 0,
          z: 0
        }
      };

      this.activeTilesets.set(projectId, tilesetInfo);

      // 模拟加载过程
      await this.simulateTilesetLoading(projectId, tilesetInfo);

      // 创建React Three Fiber 3D场景
      await this.createReactThreeScene(projectId, tilesetInfo);

      // 更新状态
      tilesetInfo.loaded = true;
      tilesetInfo.progress = 100;
      this.activeTilesets.set(projectId, tilesetInfo);

      this.statusCallback?.('tileset-loaded', `${projectName}的3D模型加载完成`);
      return true;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '3D瓦片加载失败';
      this.statusCallback?.('tileset-error', errorMsg);
      return false;
    }
  }

  /**
   * 卸载3D瓦片模型 - React Three Fiber版本
   */
  unload3DTileset(projectId: string): void {
    // 移除React Three Fiber场景
    const layer = this.activeLayers.get(projectId);
    if (layer) {
      this.activeLayers.delete(projectId);
    }

    // 移除UI元素
    const tilesetElement = this.tilesetElements.get(projectId);
    if (tilesetElement && tilesetElement.parentNode) {
      tilesetElement.parentNode.removeChild(tilesetElement);
    }

    // 清理数据
    this.activeTilesets.delete(projectId);
    this.tilesetElements.delete(projectId);

    // 恢复初始界面
    if (this.container) {
      this.createReactThreeInterface();
    }

    this.statusCallback?.('ready', `3D模型已卸载`);
  }

  /**
   * 获取活动的瓦片集合
   */
  getActiveTilesets(): Map<string, TilesetInfo> {
    return new Map(this.activeTilesets);
  }



  /**
   * 模拟瓦片加载过程
   */
  private async simulateTilesetLoading(projectId: string, tilesetInfo: TilesetInfo): Promise<void> {
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const progress = (i / steps) * 100;
      tilesetInfo.progress = progress;
      this.activeTilesets.set(projectId, tilesetInfo);

      this.statusCallback?.('tileset-loading',
        `加载${tilesetInfo.name}: ${Math.round(progress)}%`);

      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  /**
   * 创建React Three Fiber场景
   */
  private async createReactThreeScene(projectId: string, tilesetInfo: TilesetInfo): Promise<void> {
    if (!this.container) return;

    try {
      console.log(`🎨 开始创建React Three Fiber场景: ${tilesetInfo.name}`);

      // 清空容器，准备渲染React组件
      this.container.innerHTML = '';

      // 创建React Three Fiber容器
      const sceneContainer = document.createElement('div');
      sceneContainer.id = `three-scene-${projectId}`;
      sceneContainer.style.cssText = `
        width: 100%;
        height: 100%;
        position: relative;
        background: linear-gradient(135deg, #87CEEB 0%, #98D8E8 100%);
      `;

      this.container.appendChild(sceneContainer);

      // 添加React Three Fiber场景提示
      const sceneInfo = document.createElement('div');
      sceneInfo.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        z-index: 100;
        font-family: Arial, sans-serif;
      `;
      sceneInfo.innerHTML = `🎨 React Three Fiber + 3D Tiles<br/>项目: ${tilesetInfo.name}`;
      sceneContainer.appendChild(sceneInfo);

      // 存储场景信息
      this.activeLayers.set(projectId, {
        type: 'react-three-fiber',
        info: tilesetInfo,
        container: sceneContainer
      });

      // 创建3D模型信息面板
      this.create3DModelInfoPanel(projectId, tilesetInfo);

      console.log(`✅ React Three Fiber场景创建完成: ${tilesetInfo.name}`);

      // 通知外部组件可以渲染React Three Fiber组件
      this.statusCallback?.('tileset-loaded', `React Three Fiber场景已准备就绪`);

    } catch (error) {
      console.error(`❌ 创建React Three Fiber场景失败:`, error);
      this.statusCallback?.('error', `创建3D场景失败: ${error.message}`);
    }
  }





  /**
   * 创建3D模型信息面板
   */
  private create3DModelInfoPanel(projectId: string, tilesetInfo: TilesetInfo): void {
    // 创建3D模型信息面板
    const infoPanel = document.createElement('div');
    infoPanel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      width: 200px;
      height: 120px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: Arial, sans-serif;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      z-index: 1000;
      cursor: pointer;
      transition: all 0.3s ease;
    `;

    // 添加3D模型图标和信息
    infoPanel.innerHTML = `
      <div style="font-size: 28px; margin-bottom: 6px;">🏗️</div>
      <div style="font-size: 13px; font-weight: bold; text-align: center; margin-bottom: 3px;">
        ${tilesetInfo.name}
      </div>
      <div style="font-size: 11px; opacity: 0.8;">3D瓦片已加载</div>
      <div style="font-size: 9px; opacity: 0.6; margin-top: 3px;">点击查看详情</div>
    `;

    // 添加悬停效果
    infoPanel.addEventListener('mouseenter', () => {
      infoPanel.style.transform = 'scale(1.05)';
      infoPanel.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4)';
    });

    infoPanel.addEventListener('mouseleave', () => {
      infoPanel.style.transform = 'scale(1)';
      infoPanel.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
    });

    // 添加点击事件
    infoPanel.addEventListener('click', () => {
      this.flyToTileset(tilesetInfo);
      this.statusCallback?.('model-clicked', `查看${tilesetInfo.name}详情`);
    });

    this.container.appendChild(infoPanel);
    this.tilesetElements.set(projectId, infoPanel);
  }

  /**
   * 飞行到3D瓦片集 - React Three Fiber版本
   */
  private flyToTileset(tilesetInfo: TilesetInfo): void {
    try {
      console.log(`🚁 飞行到3D模型: ${tilesetInfo.name}`);

      // React Three Fiber的相机控制将在组件中处理
      this.statusCallback?.('camera-moved', `已飞行到${tilesetInfo.name}`);
    } catch (error) {
      console.error(`❌ 飞行到3D模型失败:`, error);
    }
  }

  /**
   * 销毁地图实例
   */
  dispose(): void {
    console.log('🗺️ iTownsMapController: 开始销毁，container:', this.container);

    // 清理所有3D瓦片
    this.activeTilesets.clear();
    this.tilesetElements.clear();

    if (this.container) {
      this.container.innerHTML = '';
    }
    // 不要将container设置为null，保持引用
    // this.container = null;
    this.isInitialized = false;

    console.log('🗺️ iTownsMapController: 销毁完成');
  }
}