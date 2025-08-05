/**
 * 地图控制器 - 简化版本
 * 先实现基础功能，后续可扩展到 iTowns
 */

export type MapLayerType = 'street' | 'satellite' | 'terrain' | 'dark';
export type MapStatus = 'loading' | 'ready' | 'error';

export interface MapControllerOptions {
  container: HTMLElement;
  center: { lat: number; lng: number };
  zoom?: number;
  onStatusChange?: (status: MapStatus, message?: string) => void;
}

export class iTownsMapController {
  private container: HTMLElement | null = null;
  private currentLayer: MapLayerType = 'street';
  private statusCallback?: (status: MapStatus, message?: string) => void;
  private isInitialized = false;

  constructor(private options: MapControllerOptions) {
    this.container = options.container;
    this.statusCallback = options.onStatusChange;
  }

  /**
   * 初始化地图 - 简化版本
   */
  async initialize(): Promise<void> {
    if (!this.container || this.isInitialized) {
      return;
    }

    try {
      this.statusCallback?.('loading');
      
      // 模拟初始化延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 创建地图界面
      this.createMapInterface();
      
      this.isInitialized = true;
      this.statusCallback?.('ready');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '地图初始化失败';
      this.statusCallback?.('error', errorMsg);
    }
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
   * 销毁地图实例
   */
  dispose(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
    this.isInitialized = false;
  }
}