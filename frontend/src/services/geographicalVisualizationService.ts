/**
 * 地理可视化服务
 * 2号几何专家 - 基于Three.js的专业地理空间数据管理
 */

import * as THREE from 'three';
import { logger } from '../utils/advancedLogger';
import { moduleHub } from '../integration/ModuleIntegrationHub';

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
  supportStructures: SupportStructureData[];
  geologicalLayers: GeologicalLayerData[];
  status: 'planning' | 'active' | 'completed' | 'suspended';
  geometry: THREE.BufferGeometry | null;
  materials: ProjectMaterial[];
}

export interface SupportStructureData {
  id: string;
  type: 'pile' | 'diaphragm_wall' | 'anchor' | 'strut';
  position: GeographicalLocation;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  materialId: string;
}

export interface GeologicalLayerData {
  id: string;
  name: string;
  topElevation: number;
  bottomElevation: number;
  soilType: string;
  properties: {
    density: number;
    cohesion: number;
    frictionAngle: number;
    elasticModulus: number;
    poissonRatio: number;
  };
  color: string;
}

export interface ProjectMaterial {
  id: string;
  name: string;
  type: 'concrete' | 'steel' | 'soil' | 'rock';
  properties: Record<string, number>;
  color: number;
}

export interface MapboxStyle {
  id: string;
  name: string;
  url: string;
  description: string;
  features: string[];
}

export interface ViewportTransition {
  from: CameraPosition;
  to: CameraPosition;
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface CameraPosition {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  altitude?: number;
}

class GeographicalVisualizationService {
  private projects: Map<string, ProjectSpatialData> = new Map();
  private mapboxStyles: MapboxStyle[] = [];
  private currentMap: mapboxgl.Map | null = null;
  private threeScene: THREE.Scene | null = null;
  private mercatorScale = 1;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeDefaultStyles();
    this.registerModuleHubEvents();
  }

  /**
   * 初始化默认地图样式
   */
  private initializeDefaultStyles(): void {
    this.mapboxStyles = [
      {
        id: 'satellite',
        name: '卫星影像',
        url: 'mapbox://styles/mapbox/satellite-v9',
        description: '高分辨率卫星图像，适合工程现场位置确认',
        features: ['satellite_imagery', 'terrain_elevation']
      },
      {
        id: 'terrain',
        name: '地形图',
        url: 'mapbox://styles/mapbox/outdoors-v12',
        description: '详细地形信息，包含等高线和地貌特征',
        features: ['topographic_lines', 'elevation_shading', 'vegetation']
      },
      {
        id: 'street',
        name: '街道地图',
        url: 'mapbox://styles/mapbox/streets-v12',
        description: '城市街道和基础设施信息',
        features: ['roads', 'buildings', 'labels', 'transit']
      },
      {
        id: 'dark',
        name: '深色主题',
        url: 'mapbox://styles/mapbox/dark-v11',
        description: '深色背景，减少视觉干扰，突出3D模型',
        features: ['dark_background', 'minimal_labels']
      }
    ];

    logger.info('地图样式初始化完成', { 
      styleCount: this.mapboxStyles.length 
    });
  }

  /**
   * 注册模块通信事件
   */
  private registerModuleHubEvents(): void {
    moduleHub.on('geometry:project_updated', (event) => {
      this.handleProjectGeometryUpdate(event);
    });

    moduleHub.on('geology:layer_updated', (event) => {
      this.handleGeologyLayerUpdate(event);
    });

    moduleHub.on('analysis:results_ready', (event) => {
      this.handleAnalysisResultsVisualization(event);
    });
  }

  /**
   * 添加深基坑项目到地理空间
   */
  addProject(projectData: Partial<ProjectSpatialData>): string {
    const projectId = projectData.id || this.generateProjectId();
    
    const project: ProjectSpatialData = {
      id: projectId,
      name: projectData.name || '未命名项目',
      location: projectData.location || this.getDefaultLocation(),
      boundaries: projectData.boundaries || [],
      excavationDepth: projectData.excavationDepth || 10,
      supportStructures: projectData.supportStructures || [],
      geologicalLayers: projectData.geologicalLayers || [],
      status: projectData.status || 'planning',
      geometry: null,
      materials: projectData.materials || []
    };

    this.projects.set(projectId, project);
    
    // 如果地图已初始化，立即添加到场景
    if (this.currentMap && this.threeScene) {
      this.addProjectToScene(project);
    }

    this.emit('project_added', { project });
    logger.info('项目添加到地理空间', { projectId, projectName: project.name });

    return projectId;
  }

  /**
   * 生成项目唯一ID
   */
  private generateProjectId(): string {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取默认位置（北京）
   */
  private getDefaultLocation(): GeographicalLocation {
    return {
      latitude: 39.9093,
      longitude: 116.3974,
      elevation: 50,
      city: '北京',
      country: '中国'
    };
  }

  /**
   * 将项目添加到Three.js场景
   */
  private addProjectToScene(project: ProjectSpatialData): void {
    if (!this.threeScene) return;

    const projectGroup = new THREE.Group();
    projectGroup.name = `project_${project.id}`;

    // 创建基坑主体
    const excavationGeometry = this.createExcavationGeometry(project);
    const excavationMaterial = this.createExcavationMaterial(project);
    const excavationMesh = new THREE.Mesh(excavationGeometry, excavationMaterial);
    
    // 设置基坑位置（地下）
    excavationMesh.position.y = -project.excavationDepth / 2;
    projectGroup.add(excavationMesh);

    // 添加支护结构
    project.supportStructures.forEach(support => {
      const supportMesh = this.createSupportStructureMesh(support);
      projectGroup.add(supportMesh);
    });

    // 添加地质层可视化
    project.geologicalLayers.forEach(layer => {
      const layerMesh = this.createGeologicalLayerMesh(layer, project);
      projectGroup.add(layerMesh);
    });

    // 转换地理坐标到Mapbox世界坐标
    const worldPosition = this.geographicalToWorld(project.location);
    projectGroup.position.copy(worldPosition);

    // 添加项目标签
    const labelSprite = this.createProjectLabel(project);
    labelSprite.position.set(0, 20, 0); // 悬浮在项目上方
    projectGroup.add(labelSprite);

    this.threeScene.add(projectGroup);
    
    logger.info('项目3D模型添加到场景', { 
      projectId: project.id, 
      position: worldPosition 
    });
  }

  /**
   * 创建基坑几何体
   */
  private createExcavationGeometry(project: ProjectSpatialData): THREE.BufferGeometry {
    if (project.boundaries.length > 0) {
      // 基于边界创建自定义几何体
      return this.createCustomExcavationGeometry(project.boundaries, project.excavationDepth);
    } else {
      // 默认矩形基坑
      return new THREE.BoxGeometry(50, project.excavationDepth, 50);
    }
  }

  /**
   * 创建自定义基坑几何体
   */
  private createCustomExcavationGeometry(boundaries: Array<{ lat: number; lng: number }>, depth: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    
    boundaries.forEach((point, index) => {
      const localPos = this.geographicalToLocal(point.lat, point.lng);
      if (index === 0) {
        shape.moveTo(localPos.x, localPos.z);
      } else {
        shape.lineTo(localPos.x, localPos.z);
      }
    });

    const extrudeSettings = {
      depth: depth,
      bevelEnabled: false
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  /**
   * 地理坐标转换为本地坐标
   */
  private geographicalToLocal(lat: number, lng: number): THREE.Vector3 {
    // 简化的坐标转换，实际应用中需要更精确的投影
    const x = (lng - 116.3974) * 111320; // 经度转米
    const z = (lat - 39.9093) * 111320;   // 纬度转米
    return new THREE.Vector3(x, 0, z);
  }

  /**
   * 地理坐标转换为Mapbox世界坐标
   */
  private geographicalToWorld(location: GeographicalLocation): THREE.Vector3 {
    if (!this.currentMap) return new THREE.Vector3(0, 0, 0);

    const mercatorCoord = mapboxgl.MercatorCoordinate.fromLngLat(
      [location.longitude, location.latitude],
      location.elevation
    );

    return new THREE.Vector3(
      mercatorCoord.x * this.mercatorScale,
      mercatorCoord.y * this.mercatorScale,
      mercatorCoord.z * this.mercatorScale
    );
  }

  /**
   * 创建基坑材质
   */
  private createExcavationMaterial(project: ProjectSpatialData): THREE.Material {
    const statusColors = {
      planning: 0x4A90E2,    // 蓝色
      active: 0x7ED321,     // 绿色
      completed: 0x9B9B9B,  // 灰色
      suspended: 0xF5A623   // 橙色
    };

    return new THREE.MeshPhongMaterial({
      color: statusColors[project.status],
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
  }

  /**
   * 创建支护结构网格
   */
  private createSupportStructureMesh(support: SupportStructureData): THREE.Mesh {
    let geometry: THREE.BufferGeometry;
    
    switch (support.type) {
      case 'pile':
        geometry = new THREE.CylinderGeometry(
          support.dimensions.width / 2,
          support.dimensions.width / 2,
          support.dimensions.depth,
          8
        );
        break;
      case 'diaphragm_wall':
        geometry = new THREE.BoxGeometry(
          support.dimensions.width,
          support.dimensions.depth,
          support.dimensions.height
        );
        break;
      case 'anchor':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, support.dimensions.depth, 6);
        break;
      case 'strut':
        geometry = new THREE.BoxGeometry(
          support.dimensions.width,
          support.dimensions.height,
          support.dimensions.depth
        );
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const material = new THREE.MeshPhongMaterial({ 
      color: 0x666666,
      metalness: 0.7,
      roughness: 0.3
    });

    const mesh = new THREE.Mesh(geometry, material);
    
    // 设置支护结构位置
    const localPos = this.geographicalToLocal(
      support.position.latitude, 
      support.position.longitude
    );
    mesh.position.copy(localPos);

    return mesh;
  }

  /**
   * 创建地质层网格
   */
  private createGeologicalLayerMesh(layer: GeologicalLayerData, project: ProjectSpatialData): THREE.Mesh {
    const thickness = layer.topElevation - layer.bottomElevation;
    const geometry = new THREE.BoxGeometry(60, thickness, 60);
    
    const material = new THREE.MeshPhongMaterial({
      color: layer.color,
      transparent: true,
      opacity: 0.3
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = layer.bottomElevation + thickness / 2;
    
    return mesh;
  }

  /**
   * 创建项目标签
   */
  private createProjectLabel(project: ProjectSpatialData): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    canvas.width = 256;
    canvas.height = 64;
    
    // 绘制标签背景
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制文本
    context.fillStyle = '#ffffff';
    context.font = '16px Arial';
    context.textAlign = 'center';
    context.fillText(project.name, canvas.width / 2, 25);
    context.font = '12px Arial';
    context.fillText(`深度: ${project.excavationDepth}m`, canvas.width / 2, 45);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    
    sprite.scale.set(10, 2.5, 1);
    
    return sprite;
  }

  /**
   * 飞行到项目位置
   */
  flyToProject(projectId: string, options: Partial<ViewportTransition> = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const project = this.projects.get(projectId);
      if (!project || !this.currentMap) {
        reject(new Error(`项目 ${projectId} 不存在或地图未初始化`));
        return;
      }

      const transition: ViewportTransition = {
        from: this.getCurrentCameraPosition(),
        to: {
          center: [project.location.longitude, project.location.latitude],
          zoom: options.to?.zoom || 16,
          pitch: options.to?.pitch || 60,
          bearing: options.to?.bearing || 0
        },
        duration: options.duration || 2000,
        easing: options.easing || 'ease-out'
      };

      this.currentMap.flyTo({
        ...transition.to,
        duration: transition.duration
      });

      setTimeout(() => {
        this.emit('flight_completed', { projectId, transition });
        resolve();
      }, transition.duration);

      logger.info('开始飞行到项目', { projectId, transition });
    });
  }

  /**
   * 获取当前相机位置
   */
  private getCurrentCameraPosition(): CameraPosition {
    if (!this.currentMap) {
      return {
        center: [116.3974, 39.9093],
        zoom: 10,
        pitch: 0,
        bearing: 0
      };
    }

    return {
      center: this.currentMap.getCenter().toArray() as [number, number],
      zoom: this.currentMap.getZoom(),
      pitch: this.currentMap.getPitch(),
      bearing: this.currentMap.getBearing()
    };
  }

  /**
   * 设置地图引用
   */
  setMapReference(map: mapboxgl.Map): void {
    this.currentMap = map;
    this.mercatorScale = mapboxgl.transform?.scale || 1;
    
    logger.info('地图引用设置完成');
  }

  /**
   * 设置Three.js场景引用
   */
  setThreeScene(scene: THREE.Scene): void {
    this.threeScene = scene;
    
    // 将已有项目添加到场景
    this.projects.forEach(project => {
      this.addProjectToScene(project);
    });
    
    logger.info('Three.js场景引用设置完成', { 
      projectCount: this.projects.size 
    });
  }

  /**
   * 处理项目几何更新
   */
  private handleProjectGeometryUpdate(event: any): void {
    const { projectId, geometryData } = event;
    const project = this.projects.get(projectId);
    
    if (project && this.threeScene) {
      // 移除旧的几何体
      const oldGroup = this.threeScene.getObjectByName(`project_${projectId}`);
      if (oldGroup) {
        this.threeScene.remove(oldGroup);
      }
      
      // 更新项目数据
      project.geometry = geometryData;
      
      // 重新添加到场景
      this.addProjectToScene(project);
      
      logger.info('项目几何更新完成', { projectId });
    }
  }

  /**
   * 处理地质层更新
   */
  private handleGeologyLayerUpdate(event: any): void {
    const { projectId, layerData } = event;
    const project = this.projects.get(projectId);
    
    if (project) {
      project.geologicalLayers = layerData;
      
      if (this.threeScene) {
        // 重新渲染项目
        const projectGroup = this.threeScene.getObjectByName(`project_${projectId}`);
        if (projectGroup) {
          this.threeScene.remove(projectGroup);
          this.addProjectToScene(project);
        }
      }
      
      logger.info('地质层更新完成', { projectId, layerCount: layerData.length });
    }
  }

  /**
   * 处理分析结果可视化
   */
  private handleAnalysisResultsVisualization(event: any): void {
    const { projectId, results } = event;
    
    // 在地图上显示分析结果（如应力云图、位移等）
    this.visualizeAnalysisResults(projectId, results);
    
    logger.info('分析结果可视化', { projectId, resultsType: results.type });
  }

  /**
   * 可视化分析结果
   */
  private visualizeAnalysisResults(projectId: string, results: any): void {
    // 实现分析结果的3D可视化
    // 例如：应力云图、位移动画、安全系数分布等
    // 这里可以扩展更复杂的可视化逻辑
  }

  /**
   * 获取所有地图样式
   */
  getMapStyles(): MapboxStyle[] {
    return [...this.mapboxStyles];
  }

  /**
   * 获取项目列表
   */
  getProjects(): ProjectSpatialData[] {
    return Array.from(this.projects.values());
  }

  /**
   * 获取指定项目
   */
  getProject(projectId: string): ProjectSpatialData | undefined {
    return this.projects.get(projectId);
  }

  /**
   * 事件发射器方法
   */
  private emit(eventName: string, data: any): void {
    const listeners = this.eventListeners.get(eventName) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        logger.error('事件监听器执行错误', { eventName, error });
      }
    });
  }

  /**
   * 添加事件监听器
   */
  on(eventName: string, listener: Function): void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName)!.push(listener);
  }

  /**
   * 移除事件监听器
   */
  off(eventName: string, listener: Function): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
}

// 创建全局服务实例
export const geographicalVisualizationService = new GeographicalVisualizationService();

export default geographicalVisualizationService;