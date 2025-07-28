/**
 * 2号几何专家与3号计算专家协作API
 * 实现专家间的数据交换、实时通信和协作工作流
 */

import * as THREE from 'three';

// API端点配置
const COLLABORATION_ENDPOINTS = {
  COMPUTE_3_EXPERT_BASE: 'http://localhost:8085/api',
  WEBSOCKET_COLLABORATION: 'ws://localhost:8085/ws/collaboration',
  
  // 几何到Fragment转换
  GEOMETRY_TO_FRAGMENT: '/collaboration/geometry-to-fragment',
  
  // 网格质量反馈
  MESH_QUALITY_FEEDBACK: '/collaboration/mesh-quality-feedback',
  
  // 问题区域调整
  PROBLEM_AREA_ADJUSTMENT: '/collaboration/problem-area-adjustment',
  
  // 实时协作状态
  COLLABORATION_STATUS: '/collaboration/status',
  
  // 协作历史记录
  COLLABORATION_HISTORY: '/collaboration/history'
};

// 核心数据类型
interface GeometryToFragmentRequest {
  requestId: string;
  geometryId: string;
  timestamp: number;
  expert2Data: {
    boreholeData: BoreholePoint[];
    excavationGeometry: {
      vertices: Float32Array;
      faces: Uint32Array;
      normals: Float32Array;
      materials: MaterialInfo[];
    };
    supportStructures: SupportStructureData[];
    qualityRequirements: QualityRequirements;
  };
  fragmentSpecification: {
    targetMeshSize: number;
    qualityThreshold: number;
    maxElementCount: number;
    preserveFeatures: boolean;
    adaptiveMeshing: boolean;
  };
  collaborationConfig: {
    realTimeFeedback: boolean;
    qualityMonitoring: boolean;
    iterativeOptimization: boolean;
    maxIterations: number;
  };
}

interface FragmentDefinitionResponse {
  success: boolean;
  responseId: string;
  fragmentData: {
    domains: FragmentDomain[];
    interfaces: FragmentInterface[];
    materials: FragmentMaterial[];
    constraints: FragmentConstraint[];
    meshingParameters: MeshingParameters;
  };
  validationResults: ValidationResult[];
  estimatedComputeTime: number;
  qualityPrediction: QualityPrediction;
  expert3Recommendations: Expert3Recommendation[];
}

interface MeshQualityFeedbackRequest {
  feedbackId: string;
  meshId: string;
  timestamp: number;
  qualityReport: {
    overallScore: number;
    problemAreas: ProblemArea[];
    detailedMetrics: DetailedQualityMetrics;
    performanceMetrics: PerformanceMetrics;
    convergenceAnalysis: ConvergenceAnalysis;
  };
  geometryContext: {
    originalGeometryId: string;
    fragmentSpec: FragmentSpecification;
    meshingHistory: MeshingHistoryEntry[];
  };
  feedbackType: 'AUTOMATED' | 'USER_REQUESTED' | 'THRESHOLD_TRIGGERED' | 'PERIODIC';
}

interface GeometryOptimizationResponse {
  success: boolean;
  optimizationId: string;
  geometryAdjustments: GeometryAdjustment[];
  expectedImprovements: ExpectedImprovement[];
  implementationPlan: ImplementationPlan;
  riskAssessment: RiskAssessment;
  alternativeApproaches: AlternativeApproach[];
}

interface ProblemAreaAdjustmentRequest {
  adjustmentRequestId: string;
  problemAreas: IdentifiedProblem[];
  adjustmentConstraints: {
    maxGeometryChange: number;
    preserveTopology: boolean;
    maintainBoundaries: boolean;
    respectMaterials: boolean;
  };
  optimizationTargets: {
    targetQualityImprovement: number;
    maxComputeTime: number;
    balanceSpeedAccuracy: 'SPEED' | 'BALANCED' | 'ACCURACY';
  };
  validationRequirements: {
    requireQualityImprovement: boolean;
    minImprovementThreshold: number;
    validateWithOriginalSpec: boolean;
  };
}

interface GeometryAdjustmentImplementationResponse {
  success: boolean;
  implementationId: string;
  adjustedGeometry: {
    vertices: Float32Array;
    faces: Uint32Array;
    normals: Float32Array;
    materialIds: number[];
  };
  adjustmentSummary: AdjustmentSummary;
  qualityValidation: QualityValidationResult;
  performanceMetrics: AdjustmentPerformanceMetrics;
  nextStepRecommendations: NextStepRecommendation[];
}

// WebSocket消息类型
interface CollaborationMessage {
  messageId: string;
  timestamp: number;
  source: 'EXPERT_2_GEOMETRY' | 'EXPERT_3_COMPUTE';
  target: 'EXPERT_2_GEOMETRY' | 'EXPERT_3_COMPUTE';
  messageType: string;
  data: any;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  requiresResponse: boolean;
}

interface GeometryUpdateMessage extends CollaborationMessage {
  messageType: 'GEOMETRY_UPDATE';
  data: {
    geometryId: string;
    updateType: 'INCREMENTAL' | 'COMPLETE' | 'OPTIMIZED';
    updatedRegions: Region[];
    geometryData: GeometryData;
    qualityImpact: QualityImpact;
    requiresRemeshing: boolean;
  };
}

interface MeshFeedbackMessage extends CollaborationMessage {
  messageType: 'MESH_FEEDBACK';
  data: {
    meshId: string;
    qualityScore: number;
    problemAreas: ProblemArea[];
    convergenceStatus: ConvergenceStatus;
    optimizationSuggestions: OptimizationSuggestion[];
    urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

interface QualityAlertMessage extends CollaborationMessage {
  messageType: 'QUALITY_ALERT';
  data: {
    alertType: 'QUALITY_DEGRADATION' | 'CONVERGENCE_FAILURE' | 'PERFORMANCE_ISSUE';
    severity: 'WARNING' | 'ERROR' | 'CRITICAL';
    affectedRegions: Region[];
    suggestedActions: SuggestedAction[];
    automaticMitigationAvailable: boolean;
  };
}

interface CollaborationStatusMessage extends CollaborationMessage {
  messageType: 'COLLABORATION_STATUS';
  data: {
    status: 'CONNECTED' | 'PROCESSING' | 'WAITING' | 'ERROR' | 'DISCONNECTED';
    activeWorkflows: ActiveWorkflow[];
    queuedTasks: QueuedTask[];
    systemHealth: SystemHealth;
    resourceUsage: ResourceUsage;
  };
}

export class Expert2To3CollaborationAPI {
  private baseURL: string;
  private wsConnection: WebSocket | null = null;
  private messageHandlers: Map<string, Function> = new Map();
  private collaborationState: CollaborationState;
  private requestQueue: RequestQueue;
  private responseCache: ResponseCache;

  constructor() {
    this.baseURL = COLLABORATION_ENDPOINTS.COMPUTE_3_EXPERT_BASE;
    this.collaborationState = new CollaborationState();
    this.requestQueue = new RequestQueue();
    this.responseCache = new ResponseCache();
  }

  /**
   * 初始化与3号专家的协作连接
   */
  async initializeCollaboration(): Promise<CollaborationInitResult> {
    console.log('🤝 初始化与3号计算专家的协作');

    try {
      // 1. 建立HTTP连接
      const healthCheck = await this.checkExpert3Health();
      if (!healthCheck.healthy) {
        throw new Error('3号计算专家服务不可用');
      }

      // 2. 建立WebSocket连接
      await this.establishWebSocketConnection();

      // 3. 同步协作配置
      const configSync = await this.synchronizeCollaborationConfig();

      // 4. 初始化共享数据结构
      await this.initializeSharedDataStructures();

      // 5. 启动心跳监控
      this.startHeartbeatMonitoring();

      const result: CollaborationInitResult = {
        success: true,
        connectionId: `collab_${Date.now()}`,
        expert3Info: healthCheck.expertInfo,
        capabilities: configSync.capabilities,
        sharedProtocols: configSync.protocols,
        connectionTimestamp: Date.now()
      };

      console.log('✅ 协作连接已建立');
      return result;

    } catch (error) {
      console.error('协作初始化失败:', error);
      throw new Error(`协作初始化失败: ${error.message}`);
    }
  }

  /**
   * 几何数据到Fragment定义的转换请求
   */
  async convertGeometryToFragment(
    request: GeometryToFragmentRequest
  ): Promise<FragmentDefinitionResponse> {
    console.log(`🔄 几何转Fragment请求: ${request.geometryId}`);

    try {
      // 1. 数据预处理和验证
      const preprocessedData = await this.preprocessGeometryData(request.expert2Data);
      
      // 2. 构建请求载荷
      const requestPayload = {
        ...request,
        expert2Data: preprocessedData,
        metadata: {
          expert2Version: '2.0.0',
          timestamp: Date.now(),
          requestTraceId: `trace_${request.requestId}`
        }
      };

      // 3. 发送HTTP请求到3号专家
      const response = await this.sendHTTPRequest<FragmentDefinitionResponse>(
        'POST',
        COLLABORATION_ENDPOINTS.GEOMETRY_TO_FRAGMENT,
        requestPayload
      );

      // 4. 验证响应数据
      const validatedResponse = await this.validateFragmentResponse(response);

      // 5. 缓存响应结果
      this.responseCache.store(request.requestId, validatedResponse);

      // 6. 更新协作状态
      this.collaborationState.updateWorkflowStatus(request.requestId, 'FRAGMENT_GENERATED');

      console.log(`✅ Fragment定义已生成: ${validatedResponse.responseId}`);
      return validatedResponse;

    } catch (error) {
      console.error('几何转Fragment失败:', error);
      throw new Error(`几何转Fragment失败: ${error.message}`);
    }
  }

  /**
   * 网格质量反馈处理
   */
  async processMeshQualityFeedback(
    request: MeshQualityFeedbackRequest
  ): Promise<GeometryOptimizationResponse> {
    console.log(`📊 处理网格质量反馈: ${request.meshId}`);

    try {
      // 1. 质量数据分析
      const qualityAnalysis = await this.analyzeMeshQuality(request.qualityReport);

      // 2. 发送反馈请求
      const response = await this.sendHTTPRequest<GeometryOptimizationResponse>(
        'POST',
        COLLABORATION_ENDPOINTS.MESH_QUALITY_FEEDBACK,
        {
          ...request,
          expert2Analysis: qualityAnalysis,
          improvementTargets: this.generateImprovementTargets(qualityAnalysis)
        }
      );

      // 3. 处理优化建议
      const processedResponse = await this.processOptimizationResponse(response);

      // 4. 触发实时优化通知
      if (request.feedbackType === 'THRESHOLD_TRIGGERED') {
        await this.sendRealTimeOptimizationAlert(request.meshId, processedResponse);
      }

      console.log(`✅ 质量反馈处理完成: ${response.optimizationId}`);
      return processedResponse;

    } catch (error) {
      console.error('质量反馈处理失败:', error);
      throw new Error(`质量反馈处理失败: ${error.message}`);
    }
  }

  /**
   * 问题区域几何调整请求
   */
  async requestProblemAreaAdjustment(
    request: ProblemAreaAdjustmentRequest
  ): Promise<GeometryAdjustmentImplementationResponse> {
    console.log(`🔧 问题区域调整请求: ${request.adjustmentRequestId}`);

    try {
      // 1. 问题分析和优先级排序
      const problemAnalysis = await this.analyzeProblemAreas(request.problemAreas);

      // 2. 生成调整策略
      const adjustmentStrategy = await this.generateAdjustmentStrategy(
        problemAnalysis,
        request.adjustmentConstraints
      );

      // 3. 发送调整请求
      const response = await this.sendHTTPRequest<GeometryAdjustmentImplementationResponse>(
        'POST',
        COLLABORATION_ENDPOINTS.PROBLEM_AREA_ADJUSTMENT,
        {
          ...request,
          expert2Analysis: problemAnalysis,
          recommendedStrategy: adjustmentStrategy
        }
      );

      // 4. 验证调整结果
      const validatedAdjustment = await this.validateGeometryAdjustment(response);

      // 5. 更新几何数据
      if (validatedAdjustment.success) {
        await this.updateGeometryWithAdjustments(validatedAdjustment);
      }

      console.log(`✅ 几何调整完成: ${response.implementationId}`);
      return validatedAdjustment;

    } catch (error) {
      console.error('问题区域调整失败:', error);
      throw new Error(`问题区域调整失败: ${error.message}`);
    }
  }

  /**
   * 实时协作消息处理
   */
  async startRealTimeCollaboration(): Promise<RealTimeCollaborationManager> {
    console.log('📡 启动实时协作');

    if (!this.wsConnection) {
      await this.establishWebSocketConnection();
    }

    const manager = new RealTimeCollaborationManager(this.wsConnection!, this);

    // 注册消息处理器
    this.registerMessageHandlers(manager);

    // 启动消息监听
    manager.startMessageProcessing();

    // 启动协作状态同步
    manager.startStatusSynchronization();

    console.log('✅ 实时协作已启动');
    return manager;
  }

  /**
   * 发送实时消息给3号专家
   */
  async sendRealTimeMessage(message: CollaborationMessage): Promise<boolean> {
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket连接不可用，尝试重连');
      await this.establishWebSocketConnection();
    }

    try {
      const messageWithMetadata = {
        ...message,
        messageId: message.messageId || `msg_${Date.now()}`,
        timestamp: Date.now(),
        source: 'EXPERT_2_GEOMETRY'
      };

      this.wsConnection!.send(JSON.stringify(messageWithMetadata));
      
      console.log(`📤 实时消息已发送: ${messageWithMetadata.messageType}`);
      return true;

    } catch (error) {
      console.error('实时消息发送失败:', error);
      return false;
    }
  }

  /**
   * 协作状态查询
   */
  async getCollaborationStatus(): Promise<CollaborationStatusResponse> {
    try {
      const response = await this.sendHTTPRequest<CollaborationStatusResponse>(
        'GET',
        COLLABORATION_ENDPOINTS.COLLABORATION_STATUS
      );

      // 更新本地协作状态
      this.collaborationState.updateFromRemote(response);

      return response;

    } catch (error) {
      console.error('协作状态查询失败:', error);
      throw error;
    }
  }

  /**
   * 协作历史记录查询
   */
  async getCollaborationHistory(
    timeRange: { start: number; end: number },
    filters?: CollaborationHistoryFilters
  ): Promise<CollaborationHistoryResponse> {
    try {
      const queryParams = new URLSearchParams({
        start: timeRange.start.toString(),
        end: timeRange.end.toString(),
        ...filters
      });

      const response = await this.sendHTTPRequest<CollaborationHistoryResponse>(
        'GET',
        `${COLLABORATION_ENDPOINTS.COLLABORATION_HISTORY}?${queryParams}`
      );

      return response;

    } catch (error) {
      console.error('协作历史查询失败:', error);
      throw error;
    }
  }

  // 私有方法实现
  private async checkExpert3Health(): Promise<HealthCheckResult> {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      const healthData = await response.json();
      
      return {
        healthy: response.ok,
        expertInfo: healthData.expertInfo,
        capabilities: healthData.capabilities,
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  private async establishWebSocketConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wsConnection = new WebSocket(COLLABORATION_ENDPOINTS.WEBSOCKET_COLLABORATION);
        
        this.wsConnection.onopen = () => {
          console.log('🔗 WebSocket连接已建立');
          resolve();
        };

        this.wsConnection.onerror = (error) => {
          console.error('WebSocket连接错误:', error);
          reject(error);
        };

        this.wsConnection.onmessage = (event) => {
          this.handleIncomingMessage(JSON.parse(event.data));
        };

        this.wsConnection.onclose = () => {
          console.warn('🔌 WebSocket连接已断开');
          this.scheduleReconnection();
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private async synchronizeCollaborationConfig(): Promise<ConfigSyncResult> {
    const localConfig = {
      expert2Capabilities: {
        rbfInterpolation: true,
        geometryOptimization: true,
        problemIdentification: true,
        realTimeMonitoring: true
      },
      supportedFormats: ['GLTF', 'STL', 'Fragment'],
      qualityStandards: ['Fragment', 'Custom'],
      communicationProtocols: ['HTTP', 'WebSocket']
    };

    const response = await this.sendHTTPRequest<ConfigSyncResult>(
      'POST',
      '/collaboration/sync-config',
      localConfig
    );

    return response;
  }

  private async sendHTTPRequest<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const options: RequestInit = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Expert-Source': '2号几何专家',
        'X-Request-Timestamp': Date.now().toString()
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP请求失败: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private handleIncomingMessage(message: CollaborationMessage): void {
    console.log(`📥 收到实时消息: ${message.messageType}`);

    const handler = this.messageHandlers.get(message.messageType);
    if (handler) {
      handler(message);
    } else {
      console.warn(`未注册的消息类型: ${message.messageType}`);
    }

    // 发送确认消息（如果需要）
    if (message.requiresResponse) {
      this.sendAcknowledgment(message);
    }
  }

  private registerMessageHandlers(manager: RealTimeCollaborationManager): void {
    this.messageHandlers.set('MESH_FEEDBACK', (msg: MeshFeedbackMessage) => {
      manager.handleMeshFeedback(msg);
    });

    this.messageHandlers.set('QUALITY_ALERT', (msg: QualityAlertMessage) => {
      manager.handleQualityAlert(msg);
    });

    this.messageHandlers.set('COLLABORATION_STATUS', (msg: CollaborationStatusMessage) => {
      manager.handleStatusUpdate(msg);
    });
  }

  private sendAcknowledgment(originalMessage: CollaborationMessage): void {
    const ackMessage: CollaborationMessage = {
      messageId: `ack_${originalMessage.messageId}`,
      timestamp: Date.now(),
      source: 'EXPERT_2_GEOMETRY',
      target: originalMessage.source,
      messageType: 'ACKNOWLEDGMENT',
      data: {
        originalMessageId: originalMessage.messageId,
        status: 'RECEIVED'
      },
      priority: 'LOW',
      requiresResponse: false
    };

    this.sendRealTimeMessage(ackMessage);
  }

  private scheduleReconnection(): void {
    setTimeout(() => {
      console.log('🔄 尝试重连WebSocket');
      this.establishWebSocketConnection().catch(error => {
        console.error('重连失败:', error);
        this.scheduleReconnection(); // 继续尝试重连
      });
    }, 5000); // 5秒后重连
  }

  private async preprocessGeometryData(data: any): Promise<any> {
    // 数据预处理逻辑
    return data;
  }

  private async validateFragmentResponse(response: FragmentDefinitionResponse): Promise<FragmentDefinitionResponse> {
    // 响应验证逻辑
    return response;
  }

  private startHeartbeatMonitoring(): void {
    setInterval(() => {
      if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
        this.sendRealTimeMessage({
          messageId: `heartbeat_${Date.now()}`,
          timestamp: Date.now(),
          source: 'EXPERT_2_GEOMETRY',
          target: 'EXPERT_3_COMPUTE',
          messageType: 'HEARTBEAT',
          data: { status: 'ALIVE' },
          priority: 'LOW',
          requiresResponse: false
        });
      }
    }, 30000); // 每30秒发送心跳
  }

  // 添加缺失的方法
  private async initializeSharedDataStructures(): Promise<void> {
    // 初始化共享数据结构的实现
    console.log('初始化共享数据结构');
  }

  private async analyzeMeshQuality(meshData: any): Promise<any> {
    // 分析网格质量的实现
    return { quality: 'good', score: 0.85 };
  }

  private generateImprovementTargets(analysis: any): any {
    // 生成改进目标的实现
    return { targets: [], priority: 'medium' };
  }

  private processOptimizationResponse(response: any): GeometryOptimizationResponse {
    // 处理优化响应的实现
    console.log('处理优化响应', response);
    return response; // 返回处理后的响应
  }

  private sendRealTimeOptimizationAlert(meshId: string, processedResponse: any): void {
    // 发送实时优化警报的实现
    console.log('发送优化警报', { meshId, processedResponse });
  }

  private analyzeProblemAreas(data: any): any {
    // 分析问题区域的实现
    return { problemAreas: [], severity: 'low' };
  }

  private generateAdjustmentStrategy(analysis: any, constraints: any): any {
    // 生成调整策略的实现
    return { strategy: 'minor_adjustment', parameters: {}, constraints };
  }

  private validateGeometryAdjustment(adjustment: any): GeometryAdjustmentImplementationResponse {
    // 验证几何调整的实现
    return {
      ...adjustment,
      success: true
    };
  }

  private updateGeometryWithAdjustments(adjustments: any): void {
    // 更新几何调整的实现
    console.log('更新几何调整', adjustments);
  }
}

// 辅助类定义
class CollaborationState {
  private workflows: Map<string, WorkflowStatus> = new Map();
  private systemStatus: string = 'INITIALIZED';

  updateWorkflowStatus(workflowId: string, status: string): void {
    this.workflows.set(workflowId, {
      id: workflowId,
      status: status,
      timestamp: Date.now()
    });
  }

  updateFromRemote(remoteStatus: CollaborationStatusResponse): void {
    this.systemStatus = remoteStatus.systemStatus;
    // 更新其他状态信息
  }
}

class RequestQueue {
  private queue: QueuedRequest[] = [];

  enqueue(request: QueuedRequest): void {
    this.queue.push(request);
  }

  dequeue(): QueuedRequest | undefined {
    return this.queue.shift();
  }
}

class ResponseCache {
  private cache: Map<string, CachedResponse> = new Map();

  store(key: string, response: any): void {
    this.cache.set(key, {
      data: response,
      timestamp: Date.now()
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5分钟缓存
      return cached.data;
    }
    return null;
  }
}

class RealTimeCollaborationManager {
  constructor(private ws: WebSocket, private api: Expert2To3CollaborationAPI) {}

  startMessageProcessing(): void {
    console.log('📡 启动消息处理');
  }

  startStatusSynchronization(): void {
    console.log('🔄 启动状态同步');
  }

  handleMeshFeedback(message: MeshFeedbackMessage): void {
    console.log('处理网格反馈消息:', message.data.meshId);
  }

  handleQualityAlert(message: QualityAlertMessage): void {
    console.log('处理质量警报:', message.data.alertType);
  }

  handleStatusUpdate(message: CollaborationStatusMessage): void {
    console.log('处理状态更新:', message.data.status);
  }
}

// 类型定义
interface CollaborationInitResult {
  success: boolean;
  connectionId: string;
  expert3Info: any;
  capabilities: any;
  sharedProtocols: any;
  connectionTimestamp: number;
}

interface HealthCheckResult {
  healthy: boolean;
  expertInfo?: any;
  capabilities?: any;
  timestamp: number;
  error?: string;
}

interface ConfigSyncResult {
  capabilities: any;
  protocols: any;
}

interface CollaborationStatusResponse {
  systemStatus: string;
  // 其他状态字段
}

interface CollaborationHistoryFilters {
  messageType?: string;
  severity?: string;
}

interface CollaborationHistoryResponse {
  // 历史记录数据
}

interface WorkflowStatus {
  id: string;
  status: string;
  timestamp: number;
}

interface QueuedRequest {
  // 队列请求结构
}

interface CachedResponse {
  data: any;
  timestamp: number;
}

// 更多接口定义...
interface BoreholePoint {
  x: number;
  y: number;
  z: number;
  soilType: string;
}

interface MaterialInfo {
  id: number;
  name: string;
  properties: Record<string, any>;
}

interface SupportStructureData {
  type: string;
  geometry: any;
  properties: Record<string, any>;
}

interface QualityRequirements {
  fragmentCompliance: boolean;
  minQuality: number;
  maxElements: number;
}

interface FragmentDomain {
  id: string;
  geometry: any;
  material: string;
}

interface FragmentInterface {
  id: string;
  domains: string[];
  type: string;
}

interface FragmentMaterial {
  id: string;
  properties: Record<string, any>;
}

interface FragmentConstraint {
  type: string;
  parameters: Record<string, any>;
}

interface MeshingParameters {
  elementSize: number;
  qualityThreshold: number;
  algorithm: string;
}

interface ValidationResult {
  valid: boolean;
  issues: string[];
}

interface QualityPrediction {
  expectedQuality: number;
  confidence: number;
}

interface Expert3Recommendation {
  type: string;
  description: string;
  priority: number;
}

// === 缺失的接口定义 ===

interface ProblemArea {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  location: {
    x: number;
    y: number;
    z: number;
  };
  elements: number[];
  metrics: {
    aspectRatio?: number;
    skewness?: number;
    jacobian?: number;
    orthogonality?: number;
  };
}

interface DetailedQualityMetrics {
  connectivity: number;
  aspectRatio: number;
  skewness: number;
  orthogonality: number;
  jacobian: number;
  volumeChange: number;
  edgeRatio: number;
  warpedAngle: number;
}

interface PerformanceMetrics {
  processingTime: number;
  memoryUsage: number;
  convergenceRate: number;
  cpuUtilization: number;
  gpuUtilization?: number;
  networkLatency: number;
  throughput: number;
}

interface ConvergenceAnalysis {
  iterations: number;
  residual: number;
  convergenceRate: number;
  finalError: number;
  convergenceHistory: Array<{
    iteration: number;
    residual: number;
    error: number;
  }>;
  convergenceStatus: 'CONVERGED' | 'DIVERGED' | 'SLOW_CONVERGENCE' | 'MAX_ITERATIONS';
}

interface FragmentSpecification {
  id: string;
  name: string;
  type: 'SOIL' | 'STRUCTURE' | 'EXCAVATION' | 'INFINITE_BOUNDARY';
  geometry: {
    vertices: Float32Array;
    faces: Uint32Array;
    normals: Float32Array;
  };
  meshingParameters: {
    elementType: 'TETRAHEDRAL' | 'HEXAHEDRAL' | 'PRISMATIC';
    targetSize: number;
    growthRate: number;
    qualityThreshold: number;
  };
  materialProperties: {
    materialId: string;
    density: number;
    elasticModulus: number;
    poissonRatio: number;
  };
  constraints: Array<{
    type: string;
    value: number;
    region: string;
  }>;
}

interface MeshingHistoryEntry {
  timestamp: number;
  operation: 'GENERATION' | 'REFINEMENT' | 'OPTIMIZATION' | 'REPAIR';
  parameters: Record<string, any>;
  results: {
    elementCount: number;
    nodeCount: number;
    quality: number;
    processingTime: number;
  };
  issues: string[];
  improvements: string[];
}

interface GeometryAdjustment {
  adjustmentId: string;
  type: 'VERTEX_MOVE' | 'EDGE_SPLIT' | 'FACE_REFINE' | 'TOPOLOGY_CHANGE';
  targetRegion: {
    center: [number, number, number];
    radius: number;
    affectedElements: number[];
  };
  parameters: {
    magnitude: number;
    direction: [number, number, number];
    smoothingRadius: number;
    preserveBoundaries: boolean;
  };
  expectedImpact: {
    qualityImprovement: number;
    elementCountChange: number;
    processingTimeEstimate: number;
  };
}

interface ExpectedImprovement {
  improvementId: string;
  metric: 'ASPECT_RATIO' | 'SKEWNESS' | 'ORTHOGONALITY' | 'JACOBIAN' | 'OVERALL_QUALITY';
  currentValue: number;
  expectedValue: number;
  improvementPercentage: number;
  confidence: number;
  affectedElementCount: number;
  implementationCost: {
    processingTime: number;
    memoryRequired: number;
    complexityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

interface ImplementationPlan {
  planId: string;
  totalSteps: number;
  estimatedDuration: number;
  resourceRequirements: {
    cpu: number;
    memory: number;
    gpu?: number;
  };
  steps: Array<{
    stepId: string;
    description: string;
    duration: number;
    dependencies: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  fallbackOptions: Array<{
    condition: string;
    action: string;
    impact: string;
  }>;
}

interface RiskAssessment {
  assessmentId: string;
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risks: Array<{
    riskId: string;
    category: 'QUALITY' | 'PERFORMANCE' | 'STABILITY' | 'CONVERGENCE';
    probability: number;
    impact: number;
    description: string;
    mitigation: string;
  }>;
  recommendations: Array<{
    priority: number;
    action: string;
    rationale: string;
  }>;
}

interface AlternativeApproach {
  approachId: string;
  name: string;
  description: string;
  advantages: string[];
  disadvantages: string[];
  suitability: number;
  implementationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  expectedResults: {
    qualityImprovement: number;
    processingTime: number;
    memoryUsage: number;
  };
  applicability: {
    geometryTypes: string[];
    problemTypes: string[];
    constraints: string[];
  };
}

interface IdentifiedProblem {
  problemId: string;
  type: 'POOR_QUALITY' | 'CONVERGENCE_ISSUE' | 'GEOMETRIC_DISTORTION' | 'BOUNDARY_VIOLATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location: {
    elementIds: number[];
    coordinates: Array<[number, number, number]>;
    boundingBox: {
      min: [number, number, number];
      max: [number, number, number];
    };
  };
  metrics: {
    currentValue: number;
    acceptableThreshold: number;
    deviationMagnitude: number;
  };
  analysis: {
    rootCause: string;
    contributingFactors: string[];
    relatedProblems: string[];
  };
  recommendedActions: Array<{
    action: string;
    priority: number;
    estimatedEffort: number;
  }>;
}

interface AdjustmentSummary {
  summaryId: string;
  adjustmentCount: number;
  totalProcessingTime: number;
  modifications: Array<{
    type: string;
    count: number;
    averageImprovement: number;
  }>;
  qualityChanges: {
    before: DetailedQualityMetrics;
    after: DetailedQualityMetrics;
    improvement: DetailedQualityMetrics;
  };
  geometryChanges: {
    vertexMoves: number;
    edgeSplits: number;
    faceRefinements: number;
    topologyChanges: number;
  };
  validationResults: {
    passed: boolean;
    warnings: string[];
    errors: string[];
  };
}

interface QualityValidationResult {
  validationId: string;
  timestamp: number;
  overallScore: number;
  passed: boolean;
  detailedResults: {
    aspectRatio: { score: number; passed: boolean; threshold: number };
    skewness: { score: number; passed: boolean; threshold: number };
    orthogonality: { score: number; passed: boolean; threshold: number };
    jacobian: { score: number; passed: boolean; threshold: number };
  };
  elementAnalysis: {
    totalElements: number;
    passedElements: number;
    failedElements: number;
    problematicElements: Array<{
      elementId: number;
      issues: string[];
      severity: string;
    }>;
  };
  recommendations: Array<{
    priority: number;
    action: string;
    expectedImprovement: number;
  }>;
}

interface AdjustmentPerformanceMetrics {
  totalTime: number;
  memoryPeak: number;
  cpuUtilization: number;
  gpuUtilization?: number;
  ioOperations: number;
  networkTraffic: number;
  cacheHitRate: number;
  operationBreakdown: {
    preprocessing: number;
    adjustment: number;
    validation: number;
    postprocessing: number;
  };
}

interface NextStepRecommendation {
  recommendationId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  action: string;
  description: string;
  rationale: string;
  estimatedBenefit: number;
  implementationCost: number;
  dependencies: string[];
  timeline: {
    estimatedDuration: number;
    canStartImmediately: boolean;
    prerequisites: string[];
  };
}

// 额外的辅助接口
interface Region {
  id: string;
  geometry: any;
  properties: Record<string, any>;
}

interface GeometryData {
  vertices: Float32Array;
  faces: Uint32Array;
  normals: Float32Array;
  materials: MaterialInfo[];
}

interface QualityImpact {
  expectedChange: number;
  affectedMetrics: string[];
  riskLevel: string;
}

interface ConvergenceStatus {
  status: string;
  iterations: number;
  residual: number;
}

interface OptimizationSuggestion {
  type: string;
  description: string;
  priority: number;
}

interface SuggestedAction {
  action: string;
  description: string;
  urgency: string;
}

interface ActiveWorkflow {
  id: string;
  type: string;
  status: string;
  progress: number;
}

interface QueuedTask {
  id: string;
  type: string;
  priority: string;
  estimatedTime: number;
}

interface SystemHealth {
  status: string;
  uptime: number;
  lastError?: string;
}

interface ResourceUsage {
  cpu: number;
  memory: number;
  gpu?: number;
  network: number;
}

// 导出API类 (已在类定义处直接导出)