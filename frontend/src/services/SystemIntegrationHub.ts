/**
 * 系统集成中心 - 8大系统深度集成架构
 * 实现真实的数据流转和系统协作
 * @author 1号专家
 */

import { EventEmitter } from 'events';
import { GeoThreeMapController } from './GeoThreeMapController';
import { openMeteoService, WeatherData } from './OpenMeteoService';
import { expert1Architecture } from './Expert1UnifiedArchitecture';
import { GPUParticleSystem } from './GPUParticleSystem';
import { WeatherEffectsRenderer } from './WeatherEffectsRenderer';
import { CloudRenderingSystem } from './CloudRenderingSystem';
import * as THREE from 'three';

// ======================= 数据流接口定义 =======================

export interface SystemStatus {
  systemId: string;
  status: 'initializing' | 'ready' | 'error' | 'processing';
  performance: {
    cpu: number;
    memory: number;
    fps: number;
  };
  dataFlow: {
    input: number;
    output: number;
    processed: number;
  };
  lastUpdate: number;
}

export interface DataPacket {
  id: string;
  sourceSystem: string;
  targetSystem: string | string[];
  type: 'weather' | 'project' | 'performance' | 'visualization' | 'ai';
  payload: any;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface SystemMetrics {
  totalDataPackets: number;
  processingLatency: number;
  throughput: number;
  errorRate: number;
  systemLoad: Record<string, number>;
}

// ======================= 系统集成中心类 =======================

export class SystemIntegrationHub extends EventEmitter {
  private systems: Map<string, any> = new Map();
  private systemStatuses: Map<string, SystemStatus> = new Map();
  private dataQueue: DataPacket[] = [];
  private processingQueue: DataPacket[] = [];
  
  private metrics: SystemMetrics = {
    totalDataPackets: 0,
    processingLatency: 0,
    throughput: 0,
    errorRate: 0,
    systemLoad: {}
  };
  
  private isRunning: boolean = false;
  private processInterval: number | null = null;
  private metricsInterval: number | null = null;
  
  constructor() {
    super();
    console.log('🔗 系统集成中心初始化');
    this.setupEventHandlers();
  }

  // ======================= 系统注册与管理 =======================

  public registerSystem(
    systemId: string, 
    systemInstance: any, 
    capabilities: string[]
  ): void {
    console.log(`📋 注册系统: ${systemId} - 能力: [${capabilities.join(', ')}]`);
    
    this.systems.set(systemId, systemInstance);
    this.systemStatuses.set(systemId, {
      systemId,
      status: 'initializing',
      performance: { cpu: 0, memory: 0, fps: 60 },
      dataFlow: { input: 0, output: 0, processed: 0 },
      lastUpdate: Date.now()
    });
    
    this.emit('systemRegistered', { systemId, capabilities });
  }

  public async initializeIntegratedSystems(): Promise<void> {
    console.log('🚀 开始深度系统集成初始化...');
    
    try {
      // 1. 地图引擎系统
      await this.initializeMapSystem();
      
      // 2. 天气数据系统
      await this.initializeWeatherSystem();
      
      // 3. 粒子渲染系统
      await this.initializeParticleSystem();
      
      // 4. AI智能系统
      await this.initializeAISystem();
      
      // 5. 性能监控系统
      await this.initializePerformanceSystem();
      
      // 6. 数据可视化系统
      await this.initializeVisualizationSystem();
      
      // 7. 项目管理系统
      await this.initializeProjectSystem();
      
      // 8. 专家协作系统
      await this.initializeExpertSystem();
      
      // 启动数据流处理循环
      this.startIntegrationLoop();
      
      console.log('✅ 8大系统深度集成完成');
      this.emit('systemsIntegrated');
      
    } catch (error) {
      console.error('❌ 系统集成失败:', error);
      this.emit('integrationError', error);
      throw error;
    }
  }

  // ======================= 各系统初始化 =======================

  private async initializeMapSystem(): Promise<void> {
    console.log('🗺️ 初始化地理信息系统...');
    
    const mapSystem = this.systems.get('mapController');
    if (mapSystem) {
      // 建立地图数据流管道
      this.setupDataPipeline('mapController', ['weather', 'project', 'visualization']);
      
      // 监听地图事件
      this.monitorMapEvents(mapSystem);
      
      this.updateSystemStatus('mapController', 'ready');
    }
  }

  private async initializeWeatherSystem(): Promise<void> {
    console.log('🌦️ 初始化天气数据系统...');
    
    // 建立天气数据流
    this.setupWeatherDataFlow();
    
    // 启动实时天气监控
    this.startWeatherMonitoring();
    
    this.updateSystemStatus('weatherSystem', 'ready');
  }

  private async initializeParticleSystem(): Promise<void> {
    console.log('🌟 初始化GPU粒子系统...');
    
    const particleSystem = this.systems.get('particleSystem');
    if (particleSystem) {
      // 连接天气数据到粒子效果
      this.connectWeatherToParticles(particleSystem);
      
      this.updateSystemStatus('particleSystem', 'ready');
    }
  }

  private async initializeAISystem(): Promise<void> {
    console.log('🤖 初始化AI智能系统...');
    
    // 建立AI数据分析管道
    this.setupAIDataPipeline();
    
    this.updateSystemStatus('aiSystem', 'ready');
  }

  private async initializePerformanceSystem(): Promise<void> {
    console.log('⚡ 初始化性能监控系统...');
    
    // 启动性能数据收集
    this.startPerformanceMonitoring();
    
    this.updateSystemStatus('performanceSystem', 'ready');
  }

  private async initializeVisualizationSystem(): Promise<void> {
    console.log('📊 初始化数据可视化系统...');
    
    // 建立可视化数据流
    this.setupVisualizationPipeline();
    
    this.updateSystemStatus('visualizationSystem', 'ready');
  }

  private async initializeProjectSystem(): Promise<void> {
    console.log('📋 初始化项目管理系统...');
    
    // 建立项目数据管道
    this.setupProjectDataFlow();
    
    this.updateSystemStatus('projectSystem', 'ready');
  }

  private async initializeExpertSystem(): Promise<void> {
    console.log('👥 初始化专家协作系统...');
    
    // 连接专家架构
    const expertSystem = this.systems.get('expertArchitecture');
    if (expertSystem) {
      this.setupExpertCollaboration(expertSystem);
    }
    
    this.updateSystemStatus('expertSystem', 'ready');
  }

  // ======================= 数据流建立方法 =======================

  private setupDataPipeline(systemId: string, dataTypes: string[]): void {
    console.log(`🔗 建立数据管道: ${systemId} <- [${dataTypes.join(', ')}]`);
    
    // 为每种数据类型建立处理器
    dataTypes.forEach(dataType => {
      this.on(`data:${dataType}`, (data) => {
        this.routeDataToSystem(systemId, dataType, data);
      });
    });
  }

  private setupWeatherDataFlow(): void {
    // 实时天气数据流
    setInterval(async () => {
      try {
        // 获取当前关注区域的天气数据
        const locations = this.getCurrentFocusLocations();
        
        for (const location of locations) {
          const weather = await openMeteoService.getWeather(location.lat, location.lng);
          
          // 广播天气数据到所有关联系统
          this.broadcastData({
            id: `weather_${Date.now()}`,
            sourceSystem: 'weatherSystem',
            targetSystem: ['mapController', 'particleSystem', 'visualizationSystem'],
            type: 'weather',
            payload: { location, weather },
            timestamp: Date.now(),
            priority: 'medium'
          });
        }
      } catch (error) {
        this.handleSystemError('weatherSystem', error);
      }
    }, 300000); // 每5分钟更新
  }

  private connectWeatherToParticles(particleSystem: GPUParticleSystem): void {
    this.on('data:weather', (data) => {
      const weather = data.payload.weather as WeatherData;
      
      // 根据天气条件调整粒子效果
      if (weather.precipitation > 5) {
        // 雨天效果
        particleSystem.setEmissionRate(2000);
        particleSystem.setGravity(new THREE.Vector3(0, -15, 0));
      } else if (weather.windSpeed > 20) {
        // 大风效果
        particleSystem.setWindForce(new THREE.Vector3(weather.windSpeed * 0.1, 0, 0));
      } else {
        // 正常天气
        particleSystem.setEmissionRate(800);
        particleSystem.setGravity(new THREE.Vector3(0, -9.8, 0));
      }
    });
  }

  private setupAIDataPipeline(): void {
    // AI分析数据流
    this.on('data:project', async (data) => {
      try {
        // 使用专家架构进行智能分析
        const analysis = await expert1Architecture.analyzeProjectData(data.payload);
        
        // 将分析结果分发给相关系统
        this.broadcastData({
          id: `ai_analysis_${Date.now()}`,
          sourceSystem: 'aiSystem',
          targetSystem: ['visualizationSystem', 'projectSystem'],
          type: 'ai',
          payload: analysis,
          timestamp: Date.now(),
          priority: 'high'
        });
      } catch (error) {
        this.handleSystemError('aiSystem', error);
      }
    });
  }

  private setupVisualizationPipeline(): void {
    // 可视化数据聚合器
    const visualizationBuffer: any[] = [];
    
    ['weather', 'project', 'performance', 'ai'].forEach(dataType => {
      this.on(`data:${dataType}`, (data) => {
        visualizationBuffer.push({
          type: dataType,
          data: data.payload,
          timestamp: Date.now()
        });
        
        // 每隔1秒批量处理可视化数据
        if (visualizationBuffer.length >= 10) {
          this.processVisualizationBatch(visualizationBuffer.splice(0, 10));
        }
      });
    });
  }

  private setupProjectDataFlow(): void {
    // 项目数据变更监听
    this.on('projectUpdated', (projectData) => {
      // 通知相关系统项目数据变更
      this.broadcastData({
        id: `project_update_${Date.now()}`,
        sourceSystem: 'projectSystem',
        targetSystem: ['mapController', 'aiSystem', 'visualizationSystem'],
        type: 'project',
        payload: projectData,
        timestamp: Date.now(),
        priority: 'high'
      });
    });
  }

  private setupExpertCollaboration(expertSystem: any): void {
    // 专家间协作数据流
    this.on('expertQuery', async (query) => {
      try {
        const response = await expertSystem.processCollaborativeQuery(query);
        
        this.emit('expertResponse', {
          queryId: query.id,
          response,
          timestamp: Date.now()
        });
      } catch (error) {
        this.handleSystemError('expertSystem', error);
      }
    });
  }

  // ======================= 数据处理核心方法 =======================

  private startIntegrationLoop(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔄 启动系统集成数据流处理循环');
    
    // 主处理循环
    this.processInterval = setInterval(() => {
      this.processDataQueue();
      this.updateMetrics();
    }, 16) as any; // 60fps处理频率
    
    // 指标统计循环
    this.metricsInterval = setInterval(() => {
      this.calculateSystemMetrics();
      this.emit('metricsUpdated', this.metrics);
    }, 1000) as any; // 每秒更新指标
  }

  private processDataQueue(): void {
    if (this.dataQueue.length === 0) return;
    
    // 按优先级排序
    this.dataQueue.sort((a, b) => {
      const priorities = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });
    
    // 处理高优先级数据包
    const batch = this.dataQueue.splice(0, Math.min(10, this.dataQueue.length));
    
    batch.forEach(packet => {
      this.processDataPacket(packet);
    });
  }

  private processDataPacket(packet: DataPacket): void {
    const startTime = Date.now();
    
    try {
      const targets = Array.isArray(packet.targetSystem) ? 
        packet.targetSystem : [packet.targetSystem];
      
      targets.forEach(targetId => {
        const system = this.systems.get(targetId);
        if (system) {
          this.deliverDataToSystem(system, packet);
        }
      });
      
      // 更新处理指标
      const processingTime = Date.now() - startTime;
      this.updateProcessingMetrics(packet, processingTime);
      
      this.metrics.totalDataPackets++;
      
    } catch (error) {
      console.error(`❌ 数据包处理失败: ${packet.id}`, error);
      this.metrics.errorRate += 0.01;
    }
  }

  private deliverDataToSystem(system: any, packet: DataPacket): void {
    // 根据系统类型和数据类型调用相应方法
    const { type, payload } = packet;
    
    if (system.handleIntegrationData) {
      system.handleIntegrationData(type, payload);
    } else {
      // 尝试调用系统的特定处理方法
      const methodName = `handle${type.charAt(0).toUpperCase() + type.slice(1)}Data`;
      if (typeof system[methodName] === 'function') {
        system[methodName](payload);
      }
    }
  }

  // ======================= 公共接口方法 =======================

  public broadcastData(packet: DataPacket): void {
    this.dataQueue.push(packet);
    this.emit(`data:${packet.type}`, packet);
  }

  public querySystem(systemId: string, query: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const system = this.systems.get(systemId);
      if (!system) {
        reject(new Error(`系统不存在: ${systemId}`));
        return;
      }
      
      if (system.query) {
        system.query(query).then(resolve).catch(reject);
      } else {
        reject(new Error(`系统不支持查询: ${systemId}`));
      }
    });
  }

  public getSystemMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  public getSystemStatus(systemId: string): SystemStatus | null {
    return this.systemStatuses.get(systemId) || null;
  }

  public getAllSystemStatuses(): SystemStatus[] {
    return Array.from(this.systemStatuses.values());
  }

  // ======================= 辅助方法 =======================

  private routeDataToSystem(targetSystem: string, dataType: string, data: any): void {
    const packet: DataPacket = {
      id: `route_${Date.now()}_${Math.random()}`,
      sourceSystem: 'hub',
      targetSystem,
      type: dataType as any,
      payload: data,
      timestamp: Date.now(),
      priority: 'medium'
    };
    
    this.dataQueue.push(packet);
  }

  private getCurrentFocusLocations(): Array<{lat: number, lng: number}> {
    // 从地图系统获取当前关注的位置
    const mapSystem = this.systems.get('mapController');
    if (mapSystem && mapSystem.getVisibleProjects) {
      return mapSystem.getVisibleProjects().map((p: any) => p.location);
    }
    
    // 默认位置
    return [
      { lat: 31.2304, lng: 121.4737 }, // 上海
      { lat: 39.9042, lng: 116.4074 }, // 北京
      { lat: 22.3193, lng: 114.1694 }  // 深圳
    ];
  }

  private updateSystemStatus(systemId: string, status: SystemStatus['status']): void {
    const currentStatus = this.systemStatuses.get(systemId);
    if (currentStatus) {
      currentStatus.status = status;
      currentStatus.lastUpdate = Date.now();
      this.emit('systemStatusChanged', { systemId, status });
    }
  }

  private handleSystemError(systemId: string, error: any): void {
    console.error(`❌ 系统错误 [${systemId}]:`, error);
    this.updateSystemStatus(systemId, 'error');
    this.emit('systemError', { systemId, error });
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      // 收集系统性能数据
      const performanceData = {
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        fps: this.calculateFPS(),
        systemLoad: this.calculateSystemLoad()
      };
      
      this.broadcastData({
        id: `perf_${Date.now()}`,
        sourceSystem: 'performanceSystem',
        targetSystem: ['visualizationSystem'],
        type: 'performance',
        payload: performanceData,
        timestamp: Date.now(),
        priority: 'low'
      });
    }, 1000);
  }

  private startWeatherMonitoring(): void {
    // 实时天气变化监控
    let lastWeatherData: Record<string, WeatherData> = {};
    
    setInterval(async () => {
      const locations = this.getCurrentFocusLocations();
      
      for (const location of locations) {
        try {
          const weather = await openMeteoService.getWeather(location.lat, location.lng);
          const locationKey = `${location.lat}_${location.lng}`;
          
          // 检查天气是否有显著变化
          if (this.hasSignificantWeatherChange(lastWeatherData[locationKey], weather)) {
            this.emit('weatherAlert', {
              location,
              oldWeather: lastWeatherData[locationKey],
              newWeather: weather,
              timestamp: Date.now()
            });
          }
          
          lastWeatherData[locationKey] = weather;
        } catch (error) {
          console.warn(`⚠️ 天气监控失败 (${location.lat}, ${location.lng}):`, error);
        }
      }
    }, 60000); // 每分钟检查
  }

  private hasSignificantWeatherChange(oldWeather: WeatherData, newWeather: WeatherData): boolean {
    if (!oldWeather) return false;
    
    return (
      Math.abs(oldWeather.temperature - newWeather.temperature) > 5 ||
      Math.abs(oldWeather.windSpeed - newWeather.windSpeed) > 10 ||
      Math.abs(oldWeather.precipitation - newWeather.precipitation) > 2
    );
  }

  private processVisualizationBatch(batch: any[]): void {
    // 批量处理可视化数据
    const aggregatedData = this.aggregateVisualizationData(batch);
    
    this.emit('visualizationUpdate', {
      data: aggregatedData,
      timestamp: Date.now()
    });
  }

  private aggregateVisualizationData(batch: any[]): any {
    // 数据聚合逻辑
    const result: any = {
      weather: [],
      projects: [],
      performance: [],
      ai: []
    };
    
    batch.forEach(item => {
      if (result[item.type]) {
        result[item.type].push(item.data);
      }
    });
    
    return result;
  }

  private calculateFPS(): number {
    // FPS计算逻辑
    return 60; // 简化实现
  }

  private calculateSystemLoad(): Record<string, number> {
    const load: Record<string, number> = {};
    
    this.systemStatuses.forEach((status, systemId) => {
      load[systemId] = status.performance.cpu + status.performance.memory * 0.01;
    });
    
    return load;
  }

  private updateProcessingMetrics(packet: DataPacket, processingTime: number): void {
    // 更新处理延迟指标
    this.metrics.processingLatency = 
      (this.metrics.processingLatency * 0.9) + (processingTime * 0.1);
  }

  private calculateSystemMetrics(): void {
    // 计算吞吐量
    this.metrics.throughput = this.metrics.totalDataPackets / 
      ((Date.now() - this.startTime) / 1000);
    
    // 计算系统负载
    this.metrics.systemLoad = this.calculateSystemLoad();
  }

  private updateMetrics(): void {
    // 更新各系统性能指标
    this.systemStatuses.forEach((status, systemId) => {
      const system = this.systems.get(systemId);
      if (system && system.getPerformanceMetrics) {
        const metrics = system.getPerformanceMetrics();
        status.performance = metrics;
      }
    });
  }

  private setupEventHandlers(): void {
    this.on('error', (error) => {
      console.error('🔥 系统集成错误:', error);
    });
  }

  public dispose(): void {
    console.log('🗑️ 清理系统集成中心');
    
    this.isRunning = false;
    
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    this.systems.clear();
    this.systemStatuses.clear();
    this.dataQueue = [];
    this.removeAllListeners();
  }

  private startTime: number = Date.now();
}

// 导出单例实例
export const systemIntegrationHub = new SystemIntegrationHub();
export default SystemIntegrationHub;