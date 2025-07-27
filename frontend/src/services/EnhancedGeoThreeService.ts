/**
 * 增强型geo-three服务 - 0号架构师设计
 * 为1号专家提供完整的地理可视化解决方案
 * 集成geo-three + 专家协作系统 + 数据流管理
 */

import { EventEmitter } from 'events';
import { GeoThreeMapController, ProjectMarkerData, MapStyle, Coordinates } from './GeoThreeMapController';
import { deepCADArchitecture } from './DeepCADUnifiedArchitecture';
import { expertCollaborationHub } from './ExpertCollaborationHub';

export interface GeoThreeProjectData extends ProjectMarkerData {
  // 扩展项目数据结构
  geologicalContext?: {
    soilType: string;
    waterLevel: number;
    bedrockDepth: number;
  };
  
  constructionData?: {
    startDate: Date;
    estimatedCompletion: Date;
    contractorInfo: string;
  };
  
  computationResults?: {
    maxDeformation: number;
    safetyFactor: number;
    analysisDate: Date;
    resultFileId: string;
  };
}

export interface GeoThreeConfig {
  // 地图配置
  mapStyle: MapStyle;
  initialCenter: Coordinates;
  initialZoom: number;
  
  // 渲染配置
  enableHighQualityRendering: boolean;
  enableProjectAnimations: boolean;
  enableWeatherIntegration: boolean;
  
  // 专家协作配置
  autoSyncWith2号专家: boolean;
  autoSyncWith3号专家: boolean;
  enableRealTimeUpdates: boolean;
}

class EnhancedGeoThreeService extends EventEmitter {
  private mapController: GeoThreeMapController | null = null;
  private container: HTMLElement | null = null;
  private projects: Map<string, GeoThreeProjectData> = new Map();
  private config: GeoThreeConfig;
  private isInitialized = false;
  
  // 专家协作状态
  private expertDataQueue: Array<{ expertId: number; data: any; timestamp: Date }> = [];
  private collaborationEnabled = true;

  constructor() {
    super();
    
    // 默认配置
    this.config = {
      mapStyle: 'satellite',
      initialCenter: { lat: 39.9042, lng: 116.4074 }, // 北京
      initialZoom: 6,
      enableHighQualityRendering: true,
      enableProjectAnimations: true,
      enableWeatherIntegration: true,
      autoSyncWith2号专家: true,
      autoSyncWith3号专家: true,
      enableRealTimeUpdates: true
    };
    
    this.setupExpertCollaboration();
  }

  // ============== 初始化系统 ==============
  public async initialize(container: HTMLElement, config?: Partial<GeoThreeConfig>): Promise<void> {
    if (this.isInitialized) {
      console.warn('增强型geo-three服务已初始化');
      return;
    }

    try {
      // 更新配置
      if (config) {
        this.config = { ...this.config, ...config };
      }
      
      this.container = container;
      
      // 初始化geo-three地图控制器
      this.mapController = new GeoThreeMapController(container);
      
      // 应用初始配置
      await this.applyInitialConfig();
      
      // 设置事件处理器
      this.setupEventHandlers();
      
      // 连接专家协作系统
      await this.connectToExpertSystem();
      
      this.isInitialized = true;
      this.emit('initialized', this.config);
      
      console.log('✅ 增强型geo-three服务初始化完成');
      
    } catch (error) {
      console.error('❌ 增强型geo-three服务初始化失败:', error);
      throw error;
    }
  }

  private async applyInitialConfig(): Promise<void> {
    if (!this.mapController) return;
    
    // 设置地图样式
    await this.mapController.switchMapStyle(this.config.mapStyle);
    
    // 设置中心点和缩放
    this.mapController.setCenter(this.config.initialCenter);
    this.mapController.setZoom(this.config.initialZoom);
    
    // 加载可见瓦片
    await this.mapController.loadVisibleTiles();
  }

  private setupEventHandlers(): void {
    if (!this.mapController) return;
    
    // 设置项目点击处理器
    this.mapController.setProjectClickHandler((projectId: string) => {
      this.handleProjectClick(projectId);
    });
  }

  private async connectToExpertSystem(): Promise<void> {
    if (!this.collaborationEnabled) return;
    
    // 连接到统一架构系统
    deepCADArchitecture.on('gis:receive_message', (payload: any) => {
      this.handleExpertMessage(payload);
    });
    
    // 连接到专家协作中心
    expertCollaborationHub.on('data:exchanged', (dataPackage: any) => {
      if (dataPackage.targetExpert === 1) {
        this.handleExpertDataPackage(dataPackage);
      }
    });
    
    console.log('🔗 已连接到专家协作系统');
  }

  // ============== 专家协作处理 ==============
  private setupExpertCollaboration(): void {
    // 监听2号专家的几何数据
    if (this.config.autoSyncWith2号专家) {
      this.on('expert:2:geometry_created', (geometryData: any) => {
        this.handleGeometryDataFromExpert2(geometryData);
      });
    }
    
    // 监听3号专家的计算结果
    if (this.config.autoSyncWith3号专家) {
      this.on('expert:3:computation_complete', (resultsData: any) => {
        this.handleComputationResultsFromExpert3(resultsData);
      });
    }
  }

  private handleExpertMessage(payload: any): void {
    const { messageType, data } = payload;
    
    switch (messageType) {
      case 'project_context':
        this.updateProjectContext(data);
        break;
      case 'visualization_data':
        this.visualizeComputationResults(data);
        break;
      case 'geometry_data':
        this.handleGeometryUpdate(data);
        break;
    }
  }

  private handleExpertDataPackage(dataPackage: any): void {
    this.expertDataQueue.push({
      expertId: dataPackage.sourceExpert,
      data: dataPackage.payload,
      timestamp: new Date()
    });
    
    // 处理数据队列
    this.processExpertDataQueue();
  }

  private processExpertDataQueue(): void {
    while (this.expertDataQueue.length > 0) {
      const { expertId, data, timestamp } = this.expertDataQueue.shift()!;
      
      switch (expertId) {
        case 2:
          this.integrateGeometryData(data);
          break;
        case 3:
          this.integrateComputationData(data);
          break;
      }
    }
  }

  private handleGeometryDataFromExpert2(geometryData: any): void {
    console.log('📐 收到2号专家几何数据:', geometryData);
    
    // 将几何数据转换为地理标记
    if (geometryData.location && geometryData.projectId) {
      const projectData: GeoThreeProjectData = {
        id: geometryData.projectId,
        name: geometryData.name || '新项目',
        location: geometryData.location,
        depth: geometryData.excavationDepth || 30,
        status: 'planning',
        progress: 0,
        geologicalContext: {
          soilType: geometryData.soilType || 'clay',
          waterLevel: geometryData.waterLevel || 5,
          bedrockDepth: geometryData.bedrockDepth || 50
        }
      };
      
      this.addProject(projectData);
    }
  }

  private handleComputationResultsFromExpert3(resultsData: any): void {
    console.log('🧮 收到3号专家计算结果:', resultsData);
    
    // 更新项目的计算结果
    if (resultsData.projectId) {
      const project = this.projects.get(resultsData.projectId);
      if (project) {
        project.computationResults = {
          maxDeformation: resultsData.maxDeformation || 0,
          safetyFactor: resultsData.safetyFactor || 1.0,
          analysisDate: new Date(),
          resultFileId: resultsData.resultFileId || ''
        };
        
        // 更新项目状态
        project.status = 'active';
        project.progress = 85;
        
        this.updateProject(project);
      }
    }
  }

  // ============== 项目管理 ==============
  public async addProject(projectData: GeoThreeProjectData): Promise<void> {
    if (!this.mapController) {
      throw new Error('地图控制器未初始化');
    }

    // 存储项目数据
    this.projects.set(projectData.id, projectData);
    
    // 添加到地图
    await this.mapController.addProjectMarker(projectData);
    
    // 通知其他专家
    this.notifyExpertsAboutProject(projectData);
    
    this.emit('project:added', projectData);
    console.log(`📌 项目已添加: ${projectData.name}`);
  }

  public async updateProject(projectData: GeoThreeProjectData): Promise<void> {
    if (!this.mapController) return;
    
    // 更新存储的数据
    this.projects.set(projectData.id, projectData);
    
    // 重新添加标记（geo-three控制器会自动移除旧的）
    await this.mapController.addProjectMarker(projectData);
    
    this.emit('project:updated', projectData);
    console.log(`🔄 项目已更新: ${projectData.name}`);
  }

  public removeProject(projectId: string): void {
    if (!this.mapController) return;
    
    this.mapController.removeProjectMarker(projectId);
    this.projects.delete(projectId);
    
    this.emit('project:removed', projectId);
    console.log(`🗑️ 项目已移除: ${projectId}`);
  }

  public async flyToProject(projectId: string): Promise<void> {
    if (!this.mapController) return;
    
    await this.mapController.flyToProject(projectId);
    this.emit('project:focused', projectId);
  }

  private notifyExpertsAboutProject(projectData: GeoThreeProjectData): void {
    // 通知2号专家项目地理上下文
    deepCADArchitecture.sendToExpert(2, 'project_geo_context', {
      projectId: projectData.id,
      location: projectData.location,
      geologicalContext: projectData.geologicalContext
    });
    
    // 通知3号专家项目边界条件
    deepCADArchitecture.sendToExpert(3, 'project_boundary_conditions', {
      projectId: projectData.id,
      depth: projectData.depth,
      location: projectData.location
    });
  }

  // ============== 地图控制 ==============
  public async switchMapStyle(style: MapStyle): Promise<void> {
    if (!this.mapController) return;
    
    this.config.mapStyle = style;
    await this.mapController.switchMapStyle(style);
    
    this.emit('map:style_changed', style);
  }

  public setMapCenter(coordinates: Coordinates): void {
    if (!this.mapController) return;
    
    this.config.initialCenter = coordinates;
    this.mapController.setCenter(coordinates);
    
    this.emit('map:center_changed', coordinates);
  }

  public setMapZoom(zoom: number): void {
    if (!this.mapController) return;
    
    this.config.initialZoom = zoom;
    this.mapController.setZoom(zoom);
    
    this.emit('map:zoom_changed', zoom);
  }

  // ============== 数据可视化 ==============
  private updateProjectContext(data: any): void {
    // 更新项目的地理上下文信息
    const { projectId, location, metadata } = data;
    
    const project = this.projects.get(projectId);
    if (project) {
      project.location = location;
      if (metadata) {
        project.geologicalContext = {
          ...project.geologicalContext,
          ...metadata
        };
      }
      
      this.updateProject(project);
    }
  }

  private visualizeComputationResults(resultsData: any): void {
    // 可视化计算结果
    console.log('📊 可视化计算结果:', resultsData);
    
    // 这里可以添加热力图、等高线等可视化效果
    if (resultsData.stress_field) {
      this.renderStressField(resultsData.stress_field);
    }
    
    if (resultsData.deformation_animation) {
      this.renderDeformationAnimation(resultsData.deformation_animation);
    }
  }

  private renderStressField(stressData: any): void {
    // 渲染应力场
    console.log('🌈 渲染应力场可视化');
    // TODO: 实现应力场渲染
  }

  private renderDeformationAnimation(deformationData: any): void {
    // 渲染变形动画
    console.log('🎬 渲染变形动画');
    // TODO: 实现变形动画
  }

  private handleGeometryUpdate(geometryData: any): void {
    // 处理几何更新
    console.log('📐 处理几何更新:', geometryData);
    
    if (geometryData.projectId) {
      const project = this.projects.get(geometryData.projectId);
      if (project) {
        // 更新项目的几何信息
        project.depth = geometryData.excavationDepth || project.depth;
        this.updateProject(project);
      }
    }
  }

  private integrateGeometryData(data: any): void {
    // 集成几何数据
    console.log('🔗 集成几何数据:', data);
    
    if (data.type === 'geometry_model') {
      this.handleGeometryDataFromExpert2(data);
    }
  }

  private integrateComputationData(data: any): void {
    // 集成计算数据
    console.log('🔗 集成计算数据:', data);
    
    if (data.type === 'analysis_results') {
      this.handleComputationResultsFromExpert3(data);
    }
  }

  // ============== 项目点击处理 ==============
  private handleProjectClick(projectId: string): void {
    const project = this.projects.get(projectId);
    if (!project) return;
    
    console.log(`🎯 项目被点击: ${project.name}`);
    
    // 选择并飞行到项目
    this.flyToProject(projectId);
    
    // 通知其他专家
    deepCADArchitecture.sendToExpert(2, 'project_selected', {
      projectId,
      projectData: project
    });
    
    deepCADArchitecture.sendToExpert(3, 'project_focus', {
      projectId,
      analysisRequired: !project.computationResults
    });
    
    this.emit('project:clicked', project);
  }

  // ============== 配置管理 ==============
  public updateConfig(newConfig: Partial<GeoThreeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config:updated', this.config);
  }

  public getConfig(): GeoThreeConfig {
    return { ...this.config };
  }

  // ============== 公共接口 ==============
  public getProjects(): GeoThreeProjectData[] {
    return Array.from(this.projects.values());
  }

  public getProject(id: string): GeoThreeProjectData | undefined {
    return this.projects.get(id);
  }

  public getMapController(): GeoThreeMapController | null {
    return this.mapController;
  }

  public enableExpertCollaboration(): void {
    this.collaborationEnabled = true;
    console.log('🤝 专家协作已启用');
  }

  public disableExpertCollaboration(): void {
    this.collaborationEnabled = false;
    console.log('🚫 专家协作已禁用');
  }

  // ============== 清理资源 ==============
  public dispose(): void {
    if (this.mapController) {
      this.mapController.dispose();
      this.mapController = null;
    }
    
    this.projects.clear();
    this.expertDataQueue = [];
    this.removeAllListeners();
    
    this.isInitialized = false;
    console.log('✅ 增强型geo-three服务已清理');
  }
}

// 导出单例实例
export const enhancedGeoThreeService = new EnhancedGeoThreeService();
export default enhancedGeoThreeService;