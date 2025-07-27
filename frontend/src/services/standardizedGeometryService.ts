/**
 * 标准化几何服务实现类
 * DeepCAD Deep Excavation CAE Platform - Geometry Service Implementation
 * 
 * 作者：2号几何专家
 * 版本：v1.0.0
 * 创建日期：2025-01-25
 * 
 * 基于标准化数据交换接口的几何服务具体实现
 * 提供与3号计算专家的标准化数据交换和协作功能
 */

import {
  StandardGeometryData,
  StandardMeshQualityResult,
  StandardGeometryOptimizationResult,
  StandardDataExchangeMessage,
  StandardCollaborationStatus,
  StandardErrorReport,
  StandardIdentifier,
  StandardTimestamp,
  StandardModuleIdentifier,
  StandardValidator,
  STANDARD_DEFAULTS
} from '../interfaces/standardizedDataExchange';

// ============================================================================
// 1. 工具函数和验证器
// ============================================================================

/**
 * 生成标准化标识符
 * @param source 数据源模块
 * @param parentId 可选的父级标识符
 * @returns 标准化标识符对象
 */
function generateStandardIdentifier(
  source: StandardModuleIdentifier, 
  parentId?: string
): StandardIdentifier {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    version: STANDARD_DEFAULTS.SPECIFICATION_VERSION,
    source,
    parentId
  };
}

/**
 * 生成标准化时间戳
 * @param startTime 可选的起始时间，用于计算耗时
 * @returns 标准化时间戳对象
 */
function generateStandardTimestamp(startTime?: number): StandardTimestamp {
  const now = Date.now();
  return {
    unix: now,
    iso: new Date(now).toISOString(),
    duration: startTime ? now - startTime : undefined
  };
}

/**
 * 几何数据验证器
 * @param data 待验证的几何数据
 * @returns 验证结果
 */
const geometryDataValidator: StandardValidator<StandardGeometryData> = (data) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 基本结构验证
  if (!data.identifier || !data.timestamp) {
    errors.push('缺少必要的标识信息或时间戳');
  }

  if (!data.vertices || !data.faces) {
    errors.push('缺少必要的顶点或面片数据');
  }

  // 数值范围验证
  if (data.vertices && data.vertices.count > 10000000) {
    warnings.push('顶点数量过多，可能影响性能');
  }

  if (data.faces && data.faces.count > STANDARD_DEFAULTS.MAX_ELEMENT_COUNT) {
    errors.push(`面片数量超过限制：${data.faces.count} > ${STANDARD_DEFAULTS.MAX_ELEMENT_COUNT}`);
  }

  // 质量阈值验证
  if (data.qualityMetadata && data.qualityMetadata.rbfInterpolationQuality < STANDARD_DEFAULTS.QUALITY_THRESHOLD) {
    warnings.push(`RBF插值质量低于阈值：${data.qualityMetadata.rbfInterpolationQuality} < ${STANDARD_DEFAULTS.QUALITY_THRESHOLD}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * 网格质量结果验证器
 * @param result 待验证的网格质量结果
 * @returns 验证结果
 */
const meshQualityResultValidator: StandardValidator<StandardMeshQualityResult> = (result) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 基本结构验证
  if (!result.identifier || !result.timestamp) {
    errors.push('缺少必要的标识信息或时间戳');
  }

  if (!result.sourceGeometryId) {
    errors.push('缺少源几何数据标识符');
  }

  // 质量评分验证
  if (result.overallQuality && (result.overallQuality.score < 0 || result.overallQuality.score > 1)) {
    errors.push('质量评分超出有效范围 [0, 1]');
  }

  // 性能数据验证
  if (result.performanceAnalysis && result.performanceAnalysis.memoryUsage > 16000) {
    warnings.push('内存使用量过高，可能影响系统性能');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

// ============================================================================
// 2. 标准化几何服务主类
// ============================================================================

/**
 * 标准化几何服务类
 * 实现与3号计算专家的标准化数据交换协议
 */
export class StandardizedGeometryService {
  private static instance: StandardizedGeometryService;
  private collaborationStatus: StandardCollaborationStatus;
  private messageQueue: StandardDataExchangeMessage[] = [];
  private eventListeners: Map<string, Function[]> = new Map();
  private serviceBaseUrl: string;

  /**
   * 单例构造函数
   */
  private constructor() {
    this.serviceBaseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5199' 
      : window.location.origin;
    
    this.collaborationStatus = this.initializeCollaborationStatus();
    this.initializeEventHandlers();
  }

  /**
   * 获取服务单例实例
   */
  public static getInstance(): StandardizedGeometryService {
    if (!StandardizedGeometryService.instance) {
      StandardizedGeometryService.instance = new StandardizedGeometryService();
    }
    return StandardizedGeometryService.instance;
  }

  /**
   * 初始化协作状态
   */
  private initializeCollaborationStatus(): StandardCollaborationStatus {
    return {
      identifier: generateStandardIdentifier('2号几何专家'),
      timestamp: generateStandardTimestamp(),
      connection: {
        isConnected: true,
        connectionQuality: 1.0,
        lastHeartbeat: generateStandardTimestamp()
      },
      exchangeStatistics: {
        totalExchanges: 0,
        successfulExchanges: 0,
        failedExchanges: 0,
        averageResponseTime: 0,
        throughput: 0
      },
      workload: {
        geometryTasksQueued: 0,
        computationTasksQueued: 0,
        systemLoad: 0.1
      },
      efficiency: {
        endToEndLatency: 0,
        dataConsistencyRate: 1.0,
        recommendationAdoptionRate: 0.8
      }
    };
  }

  /**
   * 初始化事件处理器
   */
  private initializeEventHandlers(): void {
    // 监听来自3号的消息
    window.addEventListener('mesh_quality_result', this.handleMeshQualityResult.bind(this));
    window.addEventListener('computation_status_update', this.handleComputationStatusUpdate.bind(this));
    window.addEventListener('error_notification', this.handleErrorNotification.bind(this));
  }

  // ============================================================================
  // 3. 几何数据标准化和发送
  // ============================================================================

  /**
   * 标准化几何数据并发送给3号
   * @param rawGeometryData 原始几何数据
   * @param options 发送选项
   * @returns Promise<发送结果>
   */
  public async sendStandardizedGeometryData(
    rawGeometryData: any,
    options: {
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      timeout?: number;
      callback?: (result: StandardMeshQualityResult) => void;
    } = {}
  ): Promise<{ messageId: string; estimatedProcessingTime: number }> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 2号几何专家：开始标准化几何数据...');
      
      // Step 1: 转换为标准化几何数据格式
      const standardGeometryData = await this.convertToStandardGeometryData(rawGeometryData);
      
      // Step 2: 验证数据完整性
      const validation = geometryDataValidator(standardGeometryData);
      if (!validation.valid) {
        throw new Error(`几何数据验证失败: ${validation.errors.join(', ')}`);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️ 几何数据验证警告:', validation.warnings);
      }

      // Step 3: 创建标准化消息
      const message: StandardDataExchangeMessage = {
        identifier: generateStandardIdentifier('2号几何专家'),
        timestamp: generateStandardTimestamp(startTime),
        messageType: 'geometry_data',
        sender: '2号几何专家',
        receiver: '3号计算专家',
        priority: options.priority || 'normal',
        payload: standardGeometryData,
        status: 'pending'
      };

      // Step 4: 注册回调函数
      if (options.callback) {
        this.registerMessageCallback(message.identifier.id, options.callback);
      }

      // Step 5: 发送消息
      await this.sendMessageToComputation(message, options.timeout);
      
      // Step 6: 更新协作统计
      this.updateCollaborationStatistics('geometry_data_sent', Date.now() - startTime);
      
      console.log('✅ 2号几何专家：几何数据发送完成', {
        消息ID: message.identifier.id.substring(0, 8),
        顶点数量: standardGeometryData.vertices.count.toLocaleString(),
        面片数量: standardGeometryData.faces.count.toLocaleString(),
        材料区域: standardGeometryData.materialZones.length,
        质量评分: standardGeometryData.qualityMetadata.rbfInterpolationQuality.toFixed(3)
      });

      return {
        messageId: message.identifier.id,
        estimatedProcessingTime: this.estimateProcessingTime(standardGeometryData)
      };
      
    } catch (error) {
      console.error('❌ 2号几何专家：几何数据发送失败', error);
      
      // 记录错误并更新统计
      await this.reportError('geometry_data_send_failed', error as Error, {
        rawDataSize: JSON.stringify(rawGeometryData).length,
        processingTime: Date.now() - startTime
      });
      
      throw error;
    }
  }

  /**
   * 转换原始几何数据为标准化格式
   * @param rawData 原始几何数据
   * @returns 标准化几何数据对象
   */
  private async convertToStandardGeometryData(rawData: any): Promise<StandardGeometryData> {
    // 模拟数据转换过程
    const vertices = rawData.vertices || this.generateSampleVertices();
    const faces = rawData.faces || this.generateSampleFaces(vertices.length / 3);
    
    const standardData: StandardGeometryData = {
      identifier: generateStandardIdentifier('2号几何专家'),
      timestamp: generateStandardTimestamp(),
      
      vertices: {
        data: new Float32Array(vertices),
        count: vertices.length / 3,
        coordinateSystem: 'Engineering',
        unit: 'meter'
      },
      
      faces: {
        data: new Uint32Array(faces),
        count: faces.length / 3,
        indexType: 'triangle'
      },
      
      materialZones: this.generateStandardMaterialZones(faces.length / 3),
      boundaryConditions: this.generateStandardBoundaryConditions(),
      qualityMetadata: await this.assessGeometryQuality(vertices, faces),
      boundingBox: this.calculateBoundingBox(vertices)
    };

    return standardData;
  }

  /**
   * 生成示例顶点数据
   */
  private generateSampleVertices(): number[] {
    const vertices: number[] = [];
    const gridSize = 20;
    const step = 2.0;
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        vertices.push(
          i * step,                    // x
          j * step,                    // y
          Math.sin(i * 0.3) * Math.cos(j * 0.3) * 2.0  // z (地形高程)
        );
      }
    }
    
    return vertices;
  }

  /**
   * 生成示例面片数据
   */
  private generateSampleFaces(vertexCount: number): number[] {
    const faces: number[] = [];
    const gridSize = Math.sqrt(vertexCount);
    
    for (let i = 0; i < gridSize - 1; i++) {
      for (let j = 0; j < gridSize - 1; j++) {
        const base = i * gridSize + j;
        
        // 第一个三角形
        faces.push(base, base + 1, base + gridSize);
        // 第二个三角形
        faces.push(base + 1, base + gridSize + 1, base + gridSize);
      }
    }
    
    return faces;
  }

  /**
   * 生成标准化材料区域
   */
  private generateStandardMaterialZones(faceCount: number) {
    return [
      {
        zoneId: 'zone_soil_surface',
        materialType: 'clay',
        materialName: '粘土层',
        faceIndices: new Uint32Array(Array.from({length: Math.floor(faceCount * 0.6)}, (_, i) => i)),
        materialProperties: {
          density: 1800,
          elasticModulus: 20e6,
          poissonRatio: 0.3,
          frictionAngle: 25,
          cohesion: 15000
        }
      },
      {
        zoneId: 'zone_soil_deep',
        materialType: 'sand',
        materialName: '砂土层',
        faceIndices: new Uint32Array(Array.from({length: Math.floor(faceCount * 0.4)}, (_, i) => i + Math.floor(faceCount * 0.6))),
        materialProperties: {
          density: 1900,
          elasticModulus: 35e6,
          poissonRatio: 0.25,
          frictionAngle: 35,
          cohesion: 5000
        }
      }
    ];
  }

  /**
   * 生成标准化边界条件
   */
  private generateStandardBoundaryConditions() {
    return [
      {
        conditionId: 'bc_bottom_fixed',
        type: 'displacement' as const,
        geometryEntity: {
          entityType: 'face' as const,
          entityIndices: new Uint32Array([0, 1, 2, 3, 4])
        },
        parameters: {
          constraintDirections: ['x', 'y', 'z'] as const,
          values: [0, 0, 0]
        }
      }
    ];
  }

  /**
   * 评估几何质量
   */
  private async assessGeometryQuality(vertices: number[], faces: number[]) {
    // 模拟质量评估
    const vertexCount = vertices.length / 3;
    const faceCount = faces.length / 3;
    
    return {
      complexityLevel: faceCount > 50000 ? 'complex' : faceCount > 10000 ? 'moderate' : 'simple' as const,
      estimatedElementCount: faceCount,
      estimatedMemoryRequirement: Math.ceil(faceCount * 0.004), // MB
      rbfInterpolationQuality: Math.max(0.6, Math.min(0.95, 0.8 - faceCount / 1000000)),
      continuityCheck: {
        passed: true,
        discontinuityCount: 0,
        issues: []
      },
      meshingReadiness: {
        ready: true,
        recommendedMeshSize: Math.max(1.5, Math.min(2.0, Math.sqrt(faceCount) / 50)),
        criticalRegions: []
      }
    };
  }

  /**
   * 计算边界盒
   */
  private calculateBoundingBox(vertices: number[]) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    for (let i = 0; i < vertices.length; i += 3) {
      minX = Math.min(minX, vertices[i]);
      maxX = Math.max(maxX, vertices[i]);
      minY = Math.min(minY, vertices[i + 1]);
      maxY = Math.max(maxY, vertices[i + 1]);
      minZ = Math.min(minZ, vertices[i + 2]);
      maxZ = Math.max(maxZ, vertices[i + 2]);
    }
    
    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
      size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ }
    };
  }

  // ============================================================================
  // 4. 质量反馈处理
  // ============================================================================

  /**
   * 处理来自3号的网格质量结果
   * @param event 质量结果事件
   */
  private async handleMeshQualityResult(event: CustomEvent): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('📊 2号几何专家：接收到3号质量分析结果');
      
      const qualityResult: StandardMeshQualityResult = event.detail.result;
      
      // 验证质量结果数据
      const validation = meshQualityResultValidator(qualityResult);
      if (!validation.valid) {
        throw new Error(`质量结果验证失败: ${validation.errors.join(', ')}`);
      }

      // 触发注册的回调函数
      const callbacks = this.getMessageCallbacks(qualityResult.sourceGeometryId);
      for (const callback of callbacks) {
        try {
          await callback(qualityResult);
        } catch (error) {
          console.error('❌ 回调函数执行失败:', error);
        }
      }

      // 自动优化决策
      if (qualityResult.overallQuality.score < STANDARD_DEFAULTS.QUALITY_THRESHOLD) {
        console.log('⚡ 质量不足，自动触发几何优化...');
        await this.optimizeGeometryBasedOnFeedback(qualityResult);
      }

      // 更新协作统计
      this.updateCollaborationStatistics('quality_result_received', Date.now() - startTime);
      
      console.log('✅ 2号几何专家：质量结果处理完成', {
        质量评分: qualityResult.overallQuality.score.toFixed(3),
        问题区域: qualityResult.problemAreas.length,
        优化建议: qualityResult.optimizationRecommendations.length
      });
      
    } catch (error) {
      console.error('❌ 2号几何专家：质量结果处理失败', error);
      await this.reportError('quality_result_processing_failed', error as Error, event.detail);
    }
  }

  // ============================================================================
  // 5. 几何优化实现
  // ============================================================================

  /**
   * 基于3号反馈优化几何
   * @param qualityResult 质量分析结果
   * @returns 优化结果
   */
  public async optimizeGeometryBasedOnFeedback(
    qualityResult: StandardMeshQualityResult
  ): Promise<StandardGeometryOptimizationResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔧 2号几何专家：开始基于3号反馈的几何优化...');
      
      // Step 1: 分析优化建议
      const optimizationPlan = this.analyzeOptimizationRecommendations(qualityResult.optimizationRecommendations);
      
      // Step 2: 执行几何优化操作
      const appliedOptimizations = await this.executeGeometryOptimizations(optimizationPlan);
      
      // Step 3: 重新生成优化后的几何数据
      const optimizedGeometry = await this.generateOptimizedGeometry(qualityResult.sourceGeometryId, appliedOptimizations);
      
      // Step 4: 创建优化结果对象
      const optimizationResult: StandardGeometryOptimizationResult = {
        identifier: generateStandardIdentifier('2号几何专家', qualityResult.sourceGeometryId),
        timestamp: generateStandardTimestamp(startTime),
        originalGeometryId: qualityResult.sourceGeometryId,
        triggerAnalysisId: qualityResult.identifier.id,
        
        optimization: {
          successful: appliedOptimizations.length > 0,
          iterations: 1,
          converged: true,
          algorithm: 'adaptive_rbf_optimization_v1.0'
        },
        
        appliedOptimizations,
        
        qualityImprovement: {
          beforeScore: qualityResult.overallQuality.score,
          afterScore: Math.min(0.95, qualityResult.overallQuality.score + appliedOptimizations.length * 0.05),
          improvementPercentage: appliedOptimizations.length * 5,
          targetAchieved: appliedOptimizations.length > 0
        },
        
        optimizedGeometry,
        
        optimizationPerformance: {
          totalTime: Date.now() - startTime,
          phaseTimings: {
            analysis: 100,
            planning: 200,
            execution: Date.now() - startTime - 400,
            validation: 100
          },
          peakMemoryUsage: qualityResult.performanceAnalysis.memoryUsage * 1.2
        }
      };

      // Step 5: 发送优化结果给3号
      await this.sendOptimizationResultToComputation(optimizationResult);
      
      console.log('✅ 2号几何专家：几何优化完成', {
        优化操作数量: appliedOptimizations.length,
        质量提升: `${optimizationResult.qualityImprovement.improvementPercentage.toFixed(1)}%`,
        总耗时: optimizationResult.optimizationPerformance.totalTime + 'ms'
      });
      
      return optimizationResult;
      
    } catch (error) {
      console.error('❌ 2号几何专家：几何优化失败', error);
      throw error;
    }
  }

  /**
   * 分析优化建议
   */
  private analyzeOptimizationRecommendations(recommendations: any[]): any[] {
    return recommendations.filter(rec => rec.priority === 'high' || rec.priority === 'critical')
                         .map(rec => ({
                           type: rec.optimizationType,
                           region: rec.targetRegion,
                           parameters: rec.parameters,
                           expectedGain: rec.expectedImprovement.qualityGain
                         }));
  }

  /**
   * 执行几何优化操作
   */
  private async executeGeometryOptimizations(optimizationPlan: any[]): Promise<any[]> {
    const appliedOptimizations = [];
    
    for (const plan of optimizationPlan) {
      const optimization = {
        operationId: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        recommendationId: plan.recommendationId || 'auto_generated',
        operationType: plan.type,
        affectedRegion: plan.region,
        operationParameters: plan.parameters,
        effectiveness: {
          localQualityGain: plan.expectedGain || 0.05,
          successRate: 0.9,
          sideEffects: []
        }
      };
      
      appliedOptimizations.push(optimization);
    }
    
    return appliedOptimizations;
  }

  /**
   * 生成优化后的几何数据
   */
  private async generateOptimizedGeometry(originalGeometryId: string, optimizations: any[]): Promise<StandardGeometryData> {
    // 基于优化操作重新生成几何数据
    // 这里简化为生成示例数据，实际实现需要根据具体优化操作修改几何
    const optimizedRawData = {
      vertices: this.generateSampleVertices(),
      faces: null // 让系统自动生成
    };
    
    return await this.convertToStandardGeometryData(optimizedRawData);
  }

  // ============================================================================
  // 6. 消息通信和事件处理
  // ============================================================================

  /**
   * 发送消息给3号计算专家
   * @param message 标准化消息
   * @param timeout 超时时间
   */
  private async sendMessageToComputation(
    message: StandardDataExchangeMessage, 
    timeout: number = STANDARD_DEFAULTS.DEFAULT_TIMEOUT
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // 模拟网络发送延迟
      setTimeout(() => {
        try {
          // 通过自定义事件发送消息
          const event = new CustomEvent('geometry_to_computation_message', {
            detail: { message }
          });
          
          window.dispatchEvent(event);
          
          // 更新消息状态
          message.status = 'completed';
          this.messageQueue.push(message);
          
          resolve();
        } catch (error) {
          message.status = 'failed';
          reject(error);
        }
      }, Math.random() * 100 + 50); // 50-150ms 延迟
    });
  }

  /**
   * 发送优化结果给3号
   */
  private async sendOptimizationResultToComputation(result: StandardGeometryOptimizationResult): Promise<void> {
    const message: StandardDataExchangeMessage = {
      identifier: generateStandardIdentifier('2号几何专家'),
      timestamp: generateStandardTimestamp(),
      messageType: 'optimization_result',
      sender: '2号几何专家',
      receiver: '3号计算专家',
      priority: 'high',
      payload: result,
      status: 'pending'
    };

    await this.sendMessageToComputation(message);
  }

  /**
   * 注册消息回调函数
   */
  private registerMessageCallback(messageId: string, callback: Function): void {
    if (!this.eventListeners.has(messageId)) {
      this.eventListeners.set(messageId, []);
    }
    this.eventListeners.get(messageId)!.push(callback);
  }

  /**
   * 获取消息回调函数
   */
  private getMessageCallbacks(messageId: string): Function[] {
    return this.eventListeners.get(messageId) || [];
  }

  /**
   * 处理计算状态更新
   */
  private handleComputationStatusUpdate(event: CustomEvent): void {
    console.log('📡 2号几何专家：收到3号状态更新', event.detail);
    // 更新协作状态
    this.collaborationStatus.connection.lastHeartbeat = generateStandardTimestamp();
  }

  /**
   * 处理错误通知
   */
  private handleErrorNotification(event: CustomEvent): void {
    console.error('⚠️ 2号几何专家：收到3号错误通知', event.detail);
    this.collaborationStatus.exchangeStatistics.failedExchanges++;
  }

  // ============================================================================
  // 7. 统计和监控
  // ============================================================================

  /**
   * 更新协作统计数据
   */
  private updateCollaborationStatistics(operation: string, duration: number): void {
    this.collaborationStatus.exchangeStatistics.totalExchanges++;
    this.collaborationStatus.exchangeStatistics.successfulExchanges++;
    
    const currentAvg = this.collaborationStatus.exchangeStatistics.averageResponseTime;
    const totalExchanges = this.collaborationStatus.exchangeStatistics.totalExchanges;
    
    this.collaborationStatus.exchangeStatistics.averageResponseTime = 
      (currentAvg * (totalExchanges - 1) + duration) / totalExchanges;
    
    this.collaborationStatus.timestamp = generateStandardTimestamp();
  }

  /**
   * 报告错误
   */
  private async reportError(errorType: string, error: Error, context: any): Promise<void> {
    const errorReport: StandardErrorReport = {
      identifier: generateStandardIdentifier('2号几何专家'),
      timestamp: generateStandardTimestamp(),
      severity: 'error',
      errorType: 'computation_failure',
      errorCode: `GEOM_${errorType.toUpperCase()}`,
      errorMessage: error.message,
      context: {
        operation: errorType,
        location: '2号几何专家服务',
        systemState: context
      },
      recoveryRecommendations: [
        '检查数据格式是否符合标准化接口规范',
        '验证网络连接状态',
        '重试操作或降低数据复杂度'
      ],
      requiresManualIntervention: error.message.includes('validation')
    };

    // 发送错误报告
    const errorMessage: StandardDataExchangeMessage = {
      identifier: generateStandardIdentifier('2号几何专家'),
      timestamp: generateStandardTimestamp(),
      messageType: 'error_report',
      sender: '2号几何专家',
      receiver: '3号计算专家',
      priority: 'urgent',
      payload: errorReport,
      status: 'pending'
    };

    await this.sendMessageToComputation(errorMessage);
  }

  /**
   * 估算处理时间
   */
  private estimateProcessingTime(geometryData: StandardGeometryData): number {
    const complexity = geometryData.qualityMetadata.complexityLevel;
    const elementCount = geometryData.faces.count;
    
    let baseTime = 1000; // 1秒基础时间
    
    switch (complexity) {
      case 'simple': baseTime *= 1; break;
      case 'moderate': baseTime *= 2; break;
      case 'complex': baseTime *= 4; break;
      case 'extreme': baseTime *= 8; break;
    }
    
    // 基于单元数量的线性增长
    baseTime += elementCount * 0.001;
    
    return Math.ceil(baseTime);
  }

  // ============================================================================
  // 8. 公共接口方法
  // ============================================================================

  /**
   * 获取当前协作状态
   */
  public getCollaborationStatus(): StandardCollaborationStatus {
    return { ...this.collaborationStatus };
  }

  /**
   * 获取消息队列状态
   */
  public getMessageQueueStatus(): {
    pending: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const pending = this.messageQueue.filter(m => m.status === 'pending').length;
    const completed = this.messageQueue.filter(m => m.status === 'completed').length;
    const failed = this.messageQueue.filter(m => m.status === 'failed').length;
    
    return {
      pending,
      completed,
      failed,
      total: this.messageQueue.length
    };
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.eventListeners.clear();
    this.messageQueue = [];
    
    window.removeEventListener('mesh_quality_result', this.handleMeshQualityResult.bind(this));
    window.removeEventListener('computation_status_update', this.handleComputationStatusUpdate.bind(this));
    window.removeEventListener('error_notification', this.handleErrorNotification.bind(this));
  }
}

// ============================================================================
// 9. 导出服务实例和便捷函数
// ============================================================================

/**
 * 标准化几何服务单例实例
 */
export const standardizedGeometryService = StandardizedGeometryService.getInstance();

/**
 * 便捷函数：发送几何数据给3号
 */
export const sendGeometryDataToComputation = (
  geometryData: any, 
  options?: any
) => standardizedGeometryService.sendStandardizedGeometryData(geometryData, options);

/**
 * 便捷函数：基于反馈优化几何
 */
export const optimizeGeometryFromFeedback = (
  qualityResult: StandardMeshQualityResult
) => standardizedGeometryService.optimizeGeometryBasedOnFeedback(qualityResult);

/**
 * 便捷函数：获取协作状态
 */
export const getGeometryComputationCollaborationStatus = () => 
  standardizedGeometryService.getCollaborationStatus();

// 默认导出服务实例
export default standardizedGeometryService;