/**
 * 数据管道管理器 - 增强版
 * 0号架构师 - 基于正确的支护结构系统架构
 * 管理1号、2号、3号专家之间的数据流，桩基作为支护结构的组成部分
 */

import { EventEmitter } from 'events';

// 数据流连接定义
export interface DataFlowConnection {
  id: string;
  name: string;
  source: { expertId: 1 | 2 | 3; moduleId: string; outputType: string };
  target: { expertId: 1 | 2 | 3; moduleId: string; inputType: string };
  
  // 流量统计
  throughput: number; // 数据包/秒
  latency: number; // 毫秒
  errorRate: number; // 0-1
  totalTransferred: number; // 总传输量
  
  // 状态信息
  status: 'active' | 'idle' | 'error' | 'throttled';
  lastTransfer: Date;
  
  // 数据处理配置
  transformation: DataTransformation;
  validation: DataValidation;
  
  // 可视化配置
  visualization: {
    color: string;
    thickness: number;
    animation: 'pulse' | 'flow' | 'particles';
    priority: 'high' | 'medium' | 'low';
  };
}

// 数据转换配置
interface DataTransformation {
  enabled: boolean;
  transformers: Array<{
    id: string;
    name: string;
    processor: (data: any) => Promise<any>;
    errorHandler: (error: Error, data: any) => any;
  }>;
}

// 数据验证配置
interface DataValidation {
  enabled: boolean;
  validators: Array<{
    id: string;
    name: string;
    validator: (data: any) => Promise<boolean>;
    errorMessage: string;
  }>;
}

// 支护结构数据流 (桩基作为支护结构的一部分)
interface SupportStructureDataFlow {
  geologyToSupport: {
    geologicalModel: any;
    soilParameters: any;
    groundwaterLevel: number;
  };
  
  supportSystemConfiguration: {
    diaphragmWalls: any[];
    pileSupports: Array<{
      type: 'BORED_CAST_IN_PLACE' | 'HAND_DUG' | 'PRECAST_DRIVEN' | 'SWM_METHOD' | 'CFG_PILE' | 'HIGH_PRESSURE_JET';
      strategy: 'BEAM_ELEMENT' | 'SHELL_ELEMENT';
      configuration: any;
    }>;
    anchorSystems: any[];
    steelSupports: any[];
  };
  
  supportToComputation: {
    geometryModel: any;
    materialProperties: any;
    boundaryConditions: any;
    loadConditions: any;
  };
}

// 数据管道性能指标
interface PipelinePerformance {
  overall: {
    healthScore: number; // 0-1
    activeConnections: number;
    totalThroughput: number;
    averageLatency: number;
    errorRate: number;
  };
  
  expertPerformance: {
    expert1: ExpertPipelineMetrics;
    expert2: ExpertPipelineMetrics;
    expert3: ExpertPipelineMetrics;
  };
  
  bottlenecks: Array<{
    connectionId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    suggestedAction: string;
  }>;
}

interface ExpertPipelineMetrics {
  inputThroughput: number;
  outputThroughput: number;
  processingLatency: number;
  queueLength: number;
  errorCount: number;
  memoryUsage: number;
}

class DataPipelineManager extends EventEmitter {
  private connections = new Map<string, DataFlowConnection>();
  private performanceHistory: PipelinePerformance[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    super();
    this.initializeStandardConnections();
    this.startPerformanceMonitoring();
  }

  // 初始化标准数据连接 - 基于正确的支护结构架构
  private initializeStandardConnections(): void {
    // 1号→2号: Epic项目上下文传递
    this.addConnection({
      id: 'epic-to-geology',
      name: 'Epic控制→地质建模',
      source: { expertId: 1, moduleId: 'epic_control', outputType: 'project_context' },
      target: { expertId: 2, moduleId: 'geology_modeling', inputType: 'project_location' },
      throughput: 0,
      latency: 0,
      errorRate: 0,
      totalTransferred: 0,
      status: 'idle',
      lastTransfer: new Date(),
      transformation: this.createProjectContextTransformation(),
      validation: this.createProjectContextValidation(),
      visualization: {
        color: '#00d9ff',
        thickness: 3,
        animation: 'flow',
        priority: 'high'
      }
    });

    // 2号内部: 地质模型→支护结构系统
    this.addConnection({
      id: 'geology-to-support',
      name: '地质建模→支护结构系统',
      source: { expertId: 2, moduleId: 'geology_modeling', outputType: 'geological_model' },
      target: { expertId: 2, moduleId: 'support_structures', inputType: 'geological_context' },
      throughput: 0,
      latency: 0,
      errorRate: 0,
      totalTransferred: 0,
      status: 'idle',
      lastTransfer: new Date(),
      transformation: this.createGeologyToSupportTransformation(),
      validation: this.createGeologyToSupportValidation(),
      visualization: {
        color: '#52c41a',
        thickness: 4,
        animation: 'pulse',
        priority: 'high'
      }
    });

    // 2号内部: 支护结构系统→桩基建模 (桩基作为支护结构的一部分)
    this.addConnection({
      id: 'support-to-pile',
      name: '支护结构→桩基建模',
      source: { expertId: 2, moduleId: 'support_structures', outputType: 'support_requirements' },
      target: { expertId: 2, moduleId: 'pile_modeling', inputType: 'pile_requirements' },
      throughput: 0,
      latency: 0,
      errorRate: 0,
      totalTransferred: 0,
      status: 'idle',
      lastTransfer: new Date(),
      transformation: this.createSupportToPileTransformation(),
      validation: this.createSupportToPileValidation(),
      visualization: {
        color: '#1890ff',
        thickness: 2,
        animation: 'particles',
        priority: 'medium'
      }
    });

    // 2号→3号: 支护几何→计算网格
    this.addConnection({
      id: 'support-to-computation',
      name: '支护结构→计算分析',
      source: { expertId: 2, moduleId: 'support_structures', outputType: 'geometry_model' },
      target: { expertId: 3, moduleId: 'computation_control', inputType: 'mesh_geometry' },
      throughput: 0,
      latency: 0,
      errorRate: 0,
      totalTransferred: 0,
      status: 'idle',
      lastTransfer: new Date(),
      transformation: this.createSupportToComputationTransformation(),
      validation: this.createSupportToComputationValidation(),
      visualization: {
        color: '#f5222d',
        thickness: 4,
        animation: 'flow',
        priority: 'high'
      }
    });

    // 3号→1号: 计算结果→Epic可视化
    this.addConnection({
      id: 'computation-to-epic',
      name: '计算结果→Epic可视化',
      source: { expertId: 3, moduleId: 'computation_control', outputType: 'analysis_results' },
      target: { expertId: 1, moduleId: 'epic_visualization', inputType: 'visualization_data' },
      throughput: 0,
      latency: 0,
      errorRate: 0,
      totalTransferred: 0,
      status: 'idle',
      lastTransfer: new Date(),
      transformation: this.createComputationToEpicTransformation(),
      validation: this.createComputationToEpicValidation(),
      visualization: {
        color: '#722ed1',
        thickness: 3,
        animation: 'pulse',
        priority: 'high'
      }
    });

    // 3号→2号: 质量反馈→几何优化
    this.addConnection({
      id: 'computation-feedback',
      name: '计算反馈→几何优化',
      source: { expertId: 3, moduleId: 'mesh_analysis', outputType: 'quality_feedback' },
      target: { expertId: 2, moduleId: 'geometry_optimization', inputType: 'optimization_suggestions' },
      throughput: 0,
      latency: 0,
      errorRate: 0,
      totalTransferred: 0,
      status: 'idle',
      lastTransfer: new Date(),
      transformation: this.createFeedbackTransformation(),
      validation: this.createFeedbackValidation(),
      visualization: {
        color: '#fa8c16',
        thickness: 2,
        animation: 'particles',
        priority: 'medium'
      }
    });
  }

  // 添加数据连接
  public addConnection(connection: DataFlowConnection): void {
    this.connections.set(connection.id, connection);
    this.emit('connection:added', connection);
  }

  // 传输数据
  public async transferData(connectionId: string, data: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const startTime = Date.now();
    
    try {
      // 数据验证
      if (connection.validation.enabled) {
        await this.validateData(connection, data);
      }

      // 数据转换
      let transformedData = data;
      if (connection.transformation.enabled) {
        transformedData = await this.transformData(connection, data);
      }

      // 更新连接统计
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      this.updateConnectionStats(connection, latency, true);
      
      // 发送数据
      this.emit('data:transfer', {
        connectionId,
        sourceExpert: connection.source.expertId,
        targetExpert: connection.target.expertId,
        data: transformedData,
        metadata: {
          timestamp: new Date(),
          latency,
          size: JSON.stringify(transformedData).length
        }
      });

      connection.status = 'active';
      connection.lastTransfer = new Date();

    } catch (error) {
      this.updateConnectionStats(connection, Date.now() - startTime, false);
      connection.status = 'error';
      
      this.emit('data:error', {
        connectionId,
        error: error.message,
        data
      });
      
      throw error;
    }
  }

  // 数据验证
  private async validateData(connection: DataFlowConnection, data: any): Promise<void> {
    for (const validator of connection.validation.validators) {
      const isValid = await validator.validator(data);
      if (!isValid) {
        throw new Error(`Validation failed: ${validator.errorMessage}`);
      }
    }
  }

  // 数据转换
  private async transformData(connection: DataFlowConnection, data: any): Promise<any> {
    let result = data;
    
    for (const transformer of connection.transformation.transformers) {
      try {
        result = await transformer.processor(result);
      } catch (error) {
        result = transformer.errorHandler(error, result);
      }
    }
    
    return result;
  }

  // 更新连接统计
  private updateConnectionStats(connection: DataFlowConnection, latency: number, success: boolean): void {
    connection.latency = (connection.latency * 0.8) + (latency * 0.2); // 平滑平均
    connection.totalTransferred += 1;
    
    if (success) {
      connection.throughput += 1;
      connection.errorRate = connection.errorRate * 0.95; // 衰减错误率
    } else {
      connection.errorRate = Math.min(1, connection.errorRate + 0.1);
    }
  }

  // 开始性能监控
  private startPerformanceMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      const performance = this.calculatePerformanceMetrics();
      this.performanceHistory.push(performance);
      
      // 保留最近100个性能记录
      if (this.performanceHistory.length > 100) {
        this.performanceHistory.shift();
      }
      
      this.emit('performance:update', performance);
      
      // 检测瓶颈
      this.detectBottlenecks(performance);
      
    }, 5000); // 每5秒监控一次
  }

  // 计算性能指标
  private calculatePerformanceMetrics(): PipelinePerformance {
    const connections = Array.from(this.connections.values());
    
    const totalThroughput = connections.reduce((sum, conn) => sum + conn.throughput, 0);
    const averageLatency = connections.reduce((sum, conn) => sum + conn.latency, 0) / connections.length;
    const totalErrors = connections.reduce((sum, conn) => sum + conn.errorRate, 0);
    const errorRate = totalErrors / connections.length;
    
    const activeConnections = connections.filter(conn => conn.status === 'active').length;
    const healthScore = Math.max(0, 1 - errorRate - (averageLatency / 10000));

    return {
      overall: {
        healthScore,
        activeConnections,
        totalThroughput,
        averageLatency,
        errorRate
      },
      expertPerformance: {
        expert1: this.calculateExpertMetrics(1),
        expert2: this.calculateExpertMetrics(2),
        expert3: this.calculateExpertMetrics(3)
      },
      bottlenecks: []
    };
  }

  // 计算专家性能指标
  private calculateExpertMetrics(expertId: 1 | 2 | 3): ExpertPipelineMetrics {
    const inputConnections = Array.from(this.connections.values())
      .filter(conn => conn.target.expertId === expertId);
    const outputConnections = Array.from(this.connections.values())
      .filter(conn => conn.source.expertId === expertId);

    return {
      inputThroughput: inputConnections.reduce((sum, conn) => sum + conn.throughput, 0),
      outputThroughput: outputConnections.reduce((sum, conn) => sum + conn.throughput, 0),
      processingLatency: inputConnections.reduce((sum, conn) => sum + conn.latency, 0) / Math.max(1, inputConnections.length),
      queueLength: 0, // 需要实际实现
      errorCount: inputConnections.reduce((sum, conn) => sum + conn.errorRate, 0),
      memoryUsage: 0 // 需要实际实现
    };
  }

  // 检测瓶颈
  private detectBottlenecks(performance: PipelinePerformance): void {
    const bottlenecks = [];
    
    // 检测高延迟连接
    this.connections.forEach((connection, id) => {
      if (connection.latency > 2000) { // 超过2秒
        bottlenecks.push({
          connectionId: id,
          severity: 'high' as const,
          description: `高延迟连接: ${connection.latency.toFixed(0)}ms`,
          suggestedAction: '检查数据处理逻辑或网络状况'
        });
      }
      
      if (connection.errorRate > 0.1) { // 错误率超过10%
        bottlenecks.push({
          connectionId: id,
          severity: 'critical' as const,
          description: `高错误率: ${(connection.errorRate * 100).toFixed(1)}%`,
          suggestedAction: '检查数据格式和验证逻辑'
        });
      }
    });

    if (bottlenecks.length > 0) {
      this.emit('bottleneck:detected', bottlenecks);
    }
  }

  // ================== 数据转换创建器 ==================

  private createProjectContextTransformation(): DataTransformation {
    return {
      enabled: true,
      transformers: [{
        id: 'epic-to-geology-transform',
        name: 'Epic项目上下文转换',
        processor: async (data: any) => ({
          projectLocation: data.location,
          coordinates: data.coordinates,
          weatherContext: data.weather,
          siteConditions: data.site
        }),
        errorHandler: (error, data) => ({ error: error.message, originalData: data })
      }]
    };
  }

  private createGeologyToSupportTransformation(): DataTransformation {
    return {
      enabled: true,
      transformers: [{
        id: 'geology-to-support-transform',
        name: '地质模型到支护结构转换',
        processor: async (data: any) => ({
          soilLayers: data.layers,
          soilProperties: data.properties,
          groundwaterLevel: data.waterLevel,
          geotechnicalParameters: data.parameters
        }),
        errorHandler: (error, data) => ({ error: error.message, fallbackData: {} })
      }]
    };
  }

  private createSupportToPileTransformation(): DataTransformation {
    return {
      enabled: true,
      transformers: [{
        id: 'support-to-pile-transform',
        name: '支护结构到桩基建模转换',
        processor: async (data: any) => ({
          pileRequirements: {
            loadCapacity: data.requiredCapacity,
            soilConditions: data.soilContext,
            spatialConstraints: data.constraints,
            recommendedTypes: this.recommendPileTypes(data)
          }
        }),
        errorHandler: (error, data) => ({ error: error.message, defaultRequirements: {} })
      }]
    };
  }

  private createSupportToComputationTransformation(): DataTransformation {
    return {
      enabled: true,
      transformers: [{
        id: 'support-to-computation-transform',
        name: '支护几何到计算网格转换',
        processor: async (data: any) => ({
          meshGeometry: data.geometry,
          materialProperties: data.materials,
          boundaryConditions: data.boundaries,
          loadConditions: data.loads
        }),
        errorHandler: (error, data) => ({ error: error.message, simplifiedGeometry: {} })
      }]
    };
  }

  private createComputationToEpicTransformation(): DataTransformation {
    return {
      enabled: true,
      transformers: [{
        id: 'computation-to-epic-transform',
        name: '计算结果到Epic可视化转换',
        processor: async (data: any) => ({
          visualizationData: {
            stressContours: data.stress,
            deformationAnimations: data.deformation,
            safetyFactors: data.safety,
            criticalAreas: data.critical
          }
        }),
        errorHandler: (error, data) => ({ error: error.message, basicVisualization: {} })
      }]
    };
  }

  private createFeedbackTransformation(): DataTransformation {
    return {
      enabled: true,
      transformers: [{
        id: 'feedback-transform',
        name: '计算反馈转换',
        processor: async (data: any) => ({
          optimizationSuggestions: {
            geometryAdjustments: data.geometry_feedback,
            meshRefinements: data.mesh_feedback,
            qualityImprovements: data.quality_feedback
          }
        }),
        errorHandler: (error, data) => ({ error: error.message, noOptimization: true })
      }]
    };
  }

  // ================== 数据验证创建器 ==================

  private createProjectContextValidation(): DataValidation {
    return {
      enabled: true,
      validators: [{
        id: 'project-location-validator',
        name: '项目位置验证',
        validator: async (data: any) => {
          return data.coordinates && 
                 typeof data.coordinates.lat === 'number' && 
                 typeof data.coordinates.lng === 'number';
        },
        errorMessage: '项目坐标不完整或格式不正确'
      }]
    };
  }

  private createGeologyToSupportValidation(): DataValidation {
    return {
      enabled: true,
      validators: [{
        id: 'geology-model-validator',
        name: '地质模型验证',
        validator: async (data: any) => {
          return data.layers && Array.isArray(data.layers) && data.layers.length > 0;
        },
        errorMessage: '地质模型缺少必要的土层信息'
      }]
    };
  }

  private createSupportToPileValidation(): DataValidation {
    return {
      enabled: true,
      validators: [{
        id: 'support-requirements-validator',
        name: '支护需求验证',
        validator: async (data: any) => {
          return data.requiredCapacity && data.requiredCapacity > 0;
        },
        errorMessage: '支护结构承载需求不明确'
      }]
    };
  }

  private createSupportToComputationValidation(): DataValidation {
    return {
      enabled: true,
      validators: [{
        id: 'geometry-model-validator',
        name: '几何模型验证',
        validator: async (data: any) => {
          return data.geometry && data.geometry.vertices && data.geometry.faces;
        },
        errorMessage: '几何模型缺少必要的网格信息'
      }]
    };
  }

  private createComputationToEpicValidation(): DataValidation {
    return {
      enabled: true,
      validators: [{
        id: 'analysis-results-validator',
        name: '分析结果验证',
        validator: async (data: any) => {
          return data.stress && data.deformation;
        },
        errorMessage: '计算结果缺少应力或变形数据'
      }]
    };
  }

  private createFeedbackValidation(): DataValidation {
    return {
      enabled: true,
      validators: [{
        id: 'feedback-validator',
        name: '反馈数据验证',
        validator: async (data: any) => {
          return data.quality_feedback || data.mesh_feedback || data.geometry_feedback;
        },
        errorMessage: '反馈数据为空'
      }]
    };
  }

  // 推荐桩基类型 (基于支护结构需求)
  private recommendPileTypes(supportData: any): Array<{type: string, strategy: string, reason: string}> {
    const recommendations = [];
    
    if (supportData.soilType === 'soft_clay') {
      recommendations.push({
        type: 'SWM_METHOD',
        strategy: 'SHELL_ELEMENT',
        reason: '软土地基适合挤密型桩基'
      });
    }
    
    if (supportData.loadLevel === 'high') {
      recommendations.push({
        type: 'BORED_CAST_IN_PLACE',
        strategy: 'BEAM_ELEMENT',
        reason: '高荷载需求适合钻孔灌注桩'
      });
    }
    
    return recommendations;
  }

  // 获取所有连接
  public getConnections(): Map<string, DataFlowConnection> {
    return this.connections;
  }

  // 获取性能历史
  public getPerformanceHistory(): PipelinePerformance[] {
    return this.performanceHistory;
  }

  // 清理资源
  public dispose(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.connections.clear();
    this.performanceHistory = [];
    this.removeAllListeners();
  }
}

export default new DataPipelineManager();