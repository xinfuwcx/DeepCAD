/**
 * DeepCAD 统一地图服务
 * 基于 MapLibre GL JS + Deck.gl 的全局地图管理
 */
/**
 * DeepCAD 统一地图服务 (懒加载版)
 * 将 MapLibre / Deck.gl 模块改为动态 import，减少主包初始体积。
 */

import { eventBus } from '../core/eventBus';
import { getDeckLayers } from '../utils/mapLayersUtil';

// 共享懒加载模块引用（按需填充）
let _maplibre: any; // maplibre 模块
let _MapboxOverlay: any; // deck mapbox overlay 类
let _IconLayer: any; // deck IconLayer
let _HeatmapLayer: any; // deck HeatmapLayer

async function ensureMapAndDeckModules() {
  if (!_maplibre) {
    const maplibreMod = await import('maplibre-gl');
    _maplibre = maplibreMod.default || maplibreMod;
  }
  if (!_MapboxOverlay || !_IconLayer || !_HeatmapLayer) {
    const { MapboxOverlay, IconLayer, HeatmapLayer } = await getDeckLayers();
    _MapboxOverlay = MapboxOverlay;
    _IconLayer = IconLayer;
    _HeatmapLayer = HeatmapLayer;
  }
}
// 地图样式类型
export type MapStyleType = 'dark-tech' | 'satellite' | 'street' | 'terrain';

// 项目数据接口
export interface ProjectMarker {
  id: string;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  status: 'planning' | 'active' | 'completed' | 'paused' | 'risk';
  progress: number;
  depth: number;
  area: number;
  manager: string;
  metadata?: any;
}

// 地图配置接口
export interface MapConfig {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  style: MapStyleType;
}

// 地图事件类型
export interface MapEventData {
  type: 'project-select' | 'project-hover' | 'view-change' | 'layer-toggle';
  data: any;
}

class UnifiedMapService {
  private static instance: UnifiedMapService;
  private map: maplibregl.Map | null = null;
  private deckOverlay: any = null;
  // container 未在后续读取，移除避免 unused 警告
  // private container: HTMLElement | null = null;
  private projects: ProjectMarker[] = [];
  private currentStyle: MapStyleType = 'dark-tech';
  private initialized = false;

  // 单例模式
  static getInstance(): UnifiedMapService {
    if (!UnifiedMapService.instance) {
      UnifiedMapService.instance = new UnifiedMapService();
    }
    return UnifiedMapService.instance;
  }

  /**
   * 初始化地图服务
   */
  async initialize(container: HTMLElement, config?: Partial<MapConfig>): Promise<any> {
    if (this.initialized && this.map) {
      return this.map;
    }

    // 动态加载地图/Deck 模块
  await ensureMapAndDeckModules();
    const defaultConfig: MapConfig = {
      center: [116.4074, 39.9042], // 北京
      zoom: 5,
      pitch: 0,
      bearing: 0,
      style: 'dark-tech',
      ...config
    };

    try {
      console.log('🗺️ 初始化 DeepCAD 统一地图服务...');

      // 创建 MapLibre 实例
  const styleSpec = this.createMapStyle(defaultConfig.style) as any; // StyleSpecification
  this.map = new _maplibre.Map({
        container: container,
        style: styleSpec,
        center: defaultConfig.center,
        zoom: defaultConfig.zoom,
        pitch: defaultConfig.pitch,
        bearing: defaultConfig.bearing,
        maxPitch: 85,
        hash: false,
        attributionControl: false
      });

      // 初始化 Deck.gl 叠加层
      this.setupDeckGL();

      // 设置地图事件监听
      this.setupEventListeners();

      // 设置全局事件监听
      this.setupGlobalEventListeners();

      this.currentStyle = defaultConfig.style;
      this.initialized = true;

      console.log('✅ DeepCAD 统一地图服务初始化完成');
      return this.map;

    } catch (error) {
      console.error('❌ 地图服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 外部懒加载包装：多处并发调用时只触发一次真实 initialize。
   * 使用方式：await initLazyMap(container, config)
   */
  private _pendingInit: Promise<any> | null = null;
  initLazy(container: HTMLElement, config?: Partial<MapConfig>) {
    if (this.initialized && this.map) return Promise.resolve(this.map);
    if (this._pendingInit) return this._pendingInit;
    this._pendingInit = this.initialize(container, config).finally(() => {
      this._pendingInit = null;
    });
    return this._pendingInit;
  }

  /**
   * 创建地图样式
   */
  private createMapStyle(styleType: MapStyleType) {
    const baseStyle = {
      version: 8,
      name: `DeepCAD ${styleType}`,
      sources: {},
      layers: []
    };

    switch (styleType) {
      case 'dark-tech':
        return {
          ...baseStyle,
          sources: {
            'osm': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [{
            id: 'osm-layer',
            type: 'raster',
            source: 'osm',
            paint: {
              'raster-opacity': 0.25,
              'raster-hue-rotate': 220,
              'raster-brightness-max': 0.4,
              'raster-brightness-min': 0.1,
              'raster-contrast': 1.8,
              'raster-saturation': 0.1
            }
          }]
        };

      case 'satellite':
        return {
          ...baseStyle,
          sources: {
            'satellite': {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              attribution: '© Esri'
            }
          },
          layers: [{
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite',
            paint: {
              'raster-opacity': 0.9,
              'raster-brightness-max': 0.8
            }
          }]
        };

      case 'street':
        return {
          ...baseStyle,
          sources: {
            'osm': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [{
            id: 'osm-layer',
            type: 'raster',
            source: 'osm',
            paint: {
              'raster-opacity': 1.0
            }
          }]
        };

      default:
        return baseStyle;
    }
  }

  /**
   * 初始化 Deck.gl 叠加层
   */
  private setupDeckGL() {
    if (!this.map) return;
    const ensure = async () => {
  await ensureMapAndDeckModules();
      this.deckOverlay = new _MapboxOverlay({
      layers: [],
      getTooltip: this.getTooltipContent.bind(this)
    });

      this.map!.addControl(this.deckOverlay as any);
      console.log('✅ Deck.gl 叠加层初始化完成');
    };
    ensure();
  }

  /**
   * 设置地图事件监听
   */
  private setupEventListeners() {
    if (!this.map) return;

    // 地图加载完成
    this.map.on('load', () => {
      console.log('🗺️ 地图加载完成');
      eventBus.emit('map:loaded', { service: this });
    });

    // 视图变化
    this.map.on('moveend', () => {
      const center = this.map!.getCenter();
      const zoom = this.map!.getZoom();
      const pitch = this.map!.getPitch();
      const bearing = this.map!.getBearing();

      eventBus.emit('map:view-changed', {
        center: [center.lng, center.lat],
        zoom,
        pitch,
        bearing
      });
    });
  }

  /**
   * 设置全局事件监听
   */
  private setupGlobalEventListeners() {
    // 监听项目选择事件
    eventBus.on('project:select', (data: { project: ProjectMarker }) => {
      this.flyToProject(data.project);
    });

    // 监听项目数据更新
    eventBus.on('projects:update', (data: { projects: ProjectMarker[] }) => {
      this.updateProjects(data.projects);
    });

    // 监听地图样式切换
    eventBus.on('map:style-change', (data: { style: MapStyleType }) => {
      this.setStyle(data.style);
    });
  }

  /**
   * 飞行到指定项目
   */
  flyToProject(project: ProjectMarker, options?: {
    zoom?: number;
    pitch?: number;
    bearing?: number;
    duration?: number;
  }) {
    if (!this.map) return;

    const flyOptions = {
      center: project.coordinates,
      zoom: options?.zoom || 14,
      pitch: options?.pitch || 45,
      bearing: options?.bearing || 0,
      duration: options?.duration || 2000,
      essential: true
    };

    this.map.flyTo(flyOptions);

    // 高亮选中项目
    this.highlightProject(project);

    console.log(`🎯 飞行到项目: ${project.name}`);
  }

  /**
   * 更新项目数据
   */
  updateProjects(projects: ProjectMarker[]) {
    this.projects = projects;
    this.renderProjectLayers();
  }

  /**
   * 渲染项目可视化层
   */
  private renderProjectLayers() {
  if (!this.deckOverlay || !this.projects.length) return;

  // 色板如需动态映射可迁移到配置模块

    // 项目图标层
  const projectIconLayer = new _IconLayer({
      id: 'project-icons',
      data: this.projects,
      getIcon: (d: ProjectMarker) => ({
        url: this.generateProjectIconURL(d),
        width: 64,
        height: 64,
        anchorY: 64
      }),
      getPosition: (d: ProjectMarker) => d.coordinates,
      getSize: (d: ProjectMarker) => {
        const baseSize = 40;
        const scale = Math.log(d.area / 1000 + 1) * 0.5 + 0.8;
        return baseSize * scale;
      },
      pickable: true,
      onClick: ({ object }: any) => {
        if (object) {
          eventBus.emit('project:selected', { project: object });
        }
      },
      onHover: ({ object }: any) => {
        if (object) {
          eventBus.emit('project:hovered', { project: object });
        }
      }
    });

    // 项目热力图层
  const projectHeatmapLayer = new _HeatmapLayer({
      id: 'project-heatmap',
      data: this.projects,
      getPosition: (d: ProjectMarker) => d.coordinates,
      getWeight: (d: ProjectMarker) => Math.log(d.area / 1000 + 1),
      radiusPixels: 100,
      intensity: 0.3,
      threshold: 0.05,
      colorRange: [
        [0, 0, 0, 0],
        [0, 100, 200, 50],
        [0, 150, 255, 100],
        [0, 200, 255, 150],
        [100, 255, 255, 200],
        [255, 255, 255, 255]
      ]
    });

    // 更新图层
    this.deckOverlay.setProps({
      layers: [projectHeatmapLayer, projectIconLayer]
    });

    console.log(`✅ 已更新 ${this.projects.length} 个项目的可视化层`);
  }

  /**
   * 生成项目图标 SVG URL
   */
  private generateProjectIconURL(project: ProjectMarker): string {
    const color = this.getStatusColor(project.status);
    const progress = Math.round(project.progress);
    
    const svg = `
      <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="28" fill="${color}" opacity="0.8"/>
        <circle cx="32" cy="32" r="18" fill="${color}" opacity="0.6"/>
        <circle cx="32" cy="32" r="8" fill="white" opacity="0.9"/>
        <text x="32" y="42" text-anchor="middle" fill="white" font-size="8" font-family="Arial" font-weight="bold">
          ${progress}%
        </text>
        <text x="32" y="12" text-anchor="middle" fill="white" font-size="6" font-family="Arial" opacity="0.9">
          ${project.name.substring(0, 6)}
        </text>
      </svg>
    `;

    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  /**
   * 获取状态颜色
   */
  private getStatusColor(status: ProjectMarker['status']): string {
    const colors = {
      planning: '#8b5cf6',
      active: '#00d9ff',
      completed: '#00ff88',
      paused: '#6b7280',
      risk: '#ff6b35'
    };
    return colors[status] || colors.active;
  }

  /**
   * 高亮项目
   */
  private highlightProject(project: ProjectMarker) {
    // 可以添加临时高亮图层
    console.log(`🔍 高亮项目: ${project.name}`);
  }

  /**
   * 设置地图样式
   */
  setStyle(styleType: MapStyleType) {
    if (!this.map || this.currentStyle === styleType) return;

    const newStyle = this.createMapStyle(styleType);
    this.map.setStyle(newStyle as any);
    this.currentStyle = styleType;

    console.log(`🎨 地图样式切换为: ${styleType}`);
  }

  /**
   * Deck.gl tooltip 内容
   */
  private getTooltipContent({ object }: any) {
    if (!object) return null;

    const project = object as ProjectMarker;
    return {
      html: `
        <div style="background: rgba(26, 35, 50, 0.95); padding: 12px; border-radius: 8px; border: 1px solid ${this.getStatusColor(project.status)}; font-family: 'JetBrains Mono', monospace;">
          <div style="color: white; font-weight: bold; margin-bottom: 4px;">${project.name}</div>
          <div style="color: #ffffff80; font-size: 12px; margin-bottom: 4px;">负责人: ${project.manager}</div>
          <div style="color: ${this.getStatusColor(project.status)}; font-size: 12px;">
            进度: ${project.progress}% | 深度: ${project.depth}m | 面积: ${project.area}m²
          </div>
        </div>
      `,
      style: {
        backgroundColor: 'transparent',
        fontSize: '12px'
      }
    };
  }

  /**
   * 获取地图实例
   */
  getMap(): maplibregl.Map | null {
    return this.map;
  }

  /**
   * 获取当前项目数据
   */
  getProjects(): ProjectMarker[] {
    return this.projects;
  }

  /**
   * 获取当前地图配置
   */
  getCurrentConfig(): MapConfig | null {
    if (!this.map) return null;

    const center = this.map.getCenter();
    return {
      center: [center.lng, center.lat],
      zoom: this.map.getZoom(),
      pitch: this.map.getPitch(),
      bearing: this.map.getBearing(),
      style: this.currentStyle
    };
  }

  /**
   * 销毁地图服务
   */
  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.deckOverlay = null;
    this.projects = [];
    this.initialized = false;
    console.log('🗺️ DeepCAD 统一地图服务已销毁');
  }
}

// 导出单例实例
export const unifiedMapService = UnifiedMapService.getInstance();

// 提供一个独立函数形式的懒加载初始化，避免直接访问内部实例方法
export function initLazyMap(container: HTMLElement, config?: Partial<MapConfig>) {
  return unifiedMapService.initLazy(container, config);
}

export default unifiedMapService;