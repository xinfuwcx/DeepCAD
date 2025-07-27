/**
 * 统一数据流管理系统
 * 1号架构师 - 几何→网格→计算→结果的无缝数据传递
 */

import { EventEmitter } from 'events';
import type { GeometryData, ComputationParams, ComputationResults } from '../stores/types';

// 数据流节点类型
export type DataFlowNodeType = 'geometry' | 'mesh' | 'computation' | 'results' | 'visualization';

// 数据流状态
export type DataFlowStatus = 'idle' | 'processing' | 'completed' | 'error' | 'cancelled';

// 数据版本信息
export interface DataVersion {
  id: string;
  timestamp: number;
  checksum: string;
  description: string;
  author: string;
  size: number;
}

// 数据流节点
export interface DataFlowNode {
  id: string;
  type: DataFlowNodeType;
  name: string;
  status: DataFlowStatus;
  
  // 数据版本
  currentVersion: DataVersion | null;
  versions: DataVersion[];
  
  // 数据内容
  data: any;
  metadata: {
    createdAt: number;
    updatedAt: number;
    dependencies: string[];
    outputTargets: string[];
    processingTime?: number;
    memoryUsage?: number;
  };
  
  // 数据变换配置
  transformConfig?: {
    enabled: boolean;
    rules: Array<{
      condition: string;
      action: string;
      parameters: Record<string, any>;
    }>;
  };
}

// 数据流连接
export interface DataFlowConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  
  // 连接状态
  status: 'active' | 'inactive' | 'error';
  lastTransferTime?: number;
  transferCount: number;
  
  // 数据传输配置
  transferConfig: {
    autoTransfer: boolean;
    batchSize?: number;
    compression: boolean;
    validation: boolean;
    retryAttempts: number;
  };
  
  // 数据映射规则
  mappingRules: Array<{
    sourceField: string;
    targetField: string;
    transform?: string;
    validation?: string;
  }>;
}

// 数据流事件
export interface DataFlowEvent {
  type: 'node_updated' | 'transfer_started' | 'transfer_completed' | 'error' | 'version_created';
  nodeId?: string;
  connectionId?: string;
  timestamp: number;
  data?: any;
  error?: Error;
}

/**
 * 数据流管理器核心类
 */
export class DataFlowManager extends EventEmitter {
  private nodes: Map<string, DataFlowNode> = new Map();
  private connections: Map<string, DataFlowConnection> = new Map();
  private eventHistory: DataFlowEvent[] = [];
  
  // 性能监控
  private performanceMetrics = {
    totalTransfers: 0,
    successfulTransfers: 0,
    averageTransferTime: 0,
    totalDataTransferred: 0,
    memoryUsage: 0
  };
  
  // 配置选项
  private config = {
    maxVersionsPerNode: 10,
    maxEventHistory: 1000,
    autoCleanupInterval: 300000, // 5分钟
    compressionThreshold: 1024 * 1024, // 1MB
    validationEnabled: true,
    debugMode: false
  };

  constructor(options: Partial<typeof DataFlowManager.prototype.config> = {}) {
    super();
    this.config = { ...this.config, ...options };
    
    // 启动定期清理
    this.startAutoCleanup();
    
    console.log('🌊 DataFlowManager初始化完成');
  }

  // ==================== 节点管理 ====================

  /**
   * 创建数据流节点
   */
  public createNode(config: {
    id: string;
    type: DataFlowNodeType;
    name: string;
    data?: any;
    dependencies?: string[];
  }): DataFlowNode {
    if (this.nodes.has(config.id)) {
      throw new Error(`数据流节点 ${config.id} 已存在`);
    }

    const now = Date.now();
    const node: DataFlowNode = {
      id: config.id,
      type: config.type,
      name: config.name,
      status: 'idle',
      currentVersion: null,
      versions: [],
      data: config.data || null,
      metadata: {
        createdAt: now,
        updatedAt: now,
        dependencies: config.dependencies || [],
        outputTargets: []
      }
    };

    this.nodes.set(config.id, node);
    
    if (config.data) {
      this.createNodeVersion(config.id, 'Initial data', 'system');
    }

    this.emitEvent({
      type: 'node_updated',
      nodeId: config.id,
      timestamp: now
    });

    return node;
  }

  /**
   * 更新节点数据
   */
  public updateNodeData(nodeId: string, data: any, description = 'Data update'): void {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`数据流节点 ${nodeId} 不存在`);
    }

    const oldData = node.data;
    node.data = data;
    node.status = 'completed';
    node.metadata.updatedAt = Date.now();

    // 创建新版本
    this.createNodeVersion(nodeId, description, 'user');

    // 检查是否需要自动传输到下游节点
    this.checkAutoTransfers(nodeId);

    this.emitEvent({
      type: 'node_updated',
      nodeId,
      timestamp: Date.now(),
      data: { oldData, newData: data }
    });
  }

  /**
   * 创建节点版本
   */
  private createNodeVersion(nodeId: string, description: string, author: string): DataVersion {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`数据流节点 ${nodeId} 不存在`);
    }

    const version: DataVersion = {
      id: `${nodeId}_v${Date.now()}`,
      timestamp: Date.now(),
      checksum: this.calculateChecksum(node.data),
      description,
      author,
      size: this.calculateDataSize(node.data)
    };

    node.versions.push(version);
    node.currentVersion = version;

    // 限制版本历史长度
    if (node.versions.length > this.config.maxVersionsPerNode) {
      node.versions = node.versions.slice(-this.config.maxVersionsPerNode);
    }

    this.emitEvent({
      type: 'version_created',
      nodeId,
      timestamp: Date.now(),
      data: version
    });

    return version;
  }

  // ==================== 连接管理 ====================

  /**
   * 创建节点连接
   */
  public createConnection(config: {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    autoTransfer?: boolean;
    mappingRules?: DataFlowConnection['mappingRules'];
  }): DataFlowConnection {
    if (this.connections.has(config.id)) {
      throw new Error(`数据流连接 ${config.id} 已存在`);
    }

    const sourceNode = this.nodes.get(config.sourceNodeId);
    const targetNode = this.nodes.get(config.targetNodeId);
    
    if (!sourceNode || !targetNode) {
      throw new Error('源节点或目标节点不存在');
    }

    const connection: DataFlowConnection = {
      id: config.id,
      sourceNodeId: config.sourceNodeId,
      targetNodeId: config.targetNodeId,
      status: 'active',
      transferCount: 0,
      transferConfig: {
        autoTransfer: config.autoTransfer ?? true,
        compression: true,
        validation: this.config.validationEnabled,
        retryAttempts: 3
      },
      mappingRules: config.mappingRules || []
    };

    this.connections.set(config.id, connection);
    
    // 更新节点的输出目标
    sourceNode.metadata.outputTargets.push(config.targetNodeId);

    return connection;
  }

  /**
   * 执行数据传输
   */
  public async transferData(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`数据流连接 ${connectionId} 不存在`);
    }

    const sourceNode = this.nodes.get(connection.sourceNodeId);
    const targetNode = this.nodes.get(connection.targetNodeId);
    
    if (!sourceNode || !targetNode) {
      throw new Error('源节点或目标节点不存在');
    }

    const startTime = Date.now();
    
    try {
      this.emitEvent({
        type: 'transfer_started',
        connectionId,
        timestamp: startTime
      });

      // 1. 数据验证
      if (connection.transferConfig.validation) {
        this.validateData(sourceNode.data, sourceNode.type);
      }

      // 2. 数据映射和转换
      const mappedData = this.applyMappingRules(
        sourceNode.data, 
        connection.mappingRules,
        sourceNode.type,
        targetNode.type
      );

      // 3. 数据压缩（如果需要）
      const finalData = connection.transferConfig.compression 
        ? this.compressData(mappedData)
        : mappedData;

      // 4. 更新目标节点
      targetNode.data = finalData;
      targetNode.status = 'completed';
      targetNode.metadata.updatedAt = Date.now();

      // 5. 创建目标节点版本
      this.createNodeVersion(
        targetNode.id, 
        `从 ${sourceNode.name} 传输`, 
        'system'
      );

      // 6. 更新连接统计
      connection.transferCount++;
      connection.lastTransferTime = Date.now();
      connection.status = 'active';

      // 7. 更新性能指标
      const transferTime = Date.now() - startTime;
      this.updatePerformanceMetrics(transferTime, this.calculateDataSize(finalData));

      this.emitEvent({
        type: 'transfer_completed',
        connectionId,
        timestamp: Date.now(),
        data: { transferTime, dataSize: this.calculateDataSize(finalData) }
      });

      // 8. 检查是否需要继续传输到下游
      this.checkAutoTransfers(targetNode.id);

    } catch (error) {
      connection.status = 'error';
      targetNode.status = 'error';

      this.emitEvent({
        type: 'error',
        connectionId,
        timestamp: Date.now(),
        error: error as Error
      });

      throw error;
    }
  }

  // ==================== 数据处理工具 ====================

  /**
   * 应用数据映射规则
   */
  private applyMappingRules(
    sourceData: any,
    mappingRules: DataFlowConnection['mappingRules'],
    sourceType: DataFlowNodeType,
    targetType: DataFlowNodeType
  ): any {
    if (!mappingRules.length) {
      // 使用默认映射规则
      return this.getDefaultMapping(sourceData, sourceType, targetType);
    }

    const mappedData: any = {};

    for (const rule of mappingRules) {
      try {
        let value = this.getNestedValue(sourceData, rule.sourceField);
        
        // 应用变换
        if (rule.transform) {
          value = this.applyTransform(value, rule.transform);
        }
        
        // 应用验证
        if (rule.validation) {
          this.validateValue(value, rule.validation);
        }
        
        this.setNestedValue(mappedData, rule.targetField, value);
      } catch (error) {
        console.warn(`映射规则应用失败: ${rule.sourceField} -> ${rule.targetField}`, error);
      }
    }

    return mappedData;
  }

  /**
   * 获取默认数据映射
   */
  private getDefaultMapping(sourceData: any, sourceType: DataFlowNodeType, targetType: DataFlowNodeType): any {
    // 几何 -> 网格
    if (sourceType === 'geometry' && targetType === 'mesh') {
      return {
        nodes: sourceData.nodes || [],
        elements: sourceData.elements || [],
        materials: sourceData.materials || [],
        boundaryConditions: sourceData.boundaryConditions || []
      };
    }

    // 网格 -> 计算
    if (sourceType === 'mesh' && targetType === 'computation') {
      return {
        meshData: sourceData,
        analysisType: 'static',
        solverSettings: {
          maxIterations: 1000,
          tolerance: 1e-6
        }
      };
    }

    // 计算 -> 结果
    if (sourceType === 'computation' && targetType === 'results') {
      return {
        results: sourceData,
        timestamp: Date.now(),
        analysisComplete: true
      };
    }

    // 默认直接复制
    return JSON.parse(JSON.stringify(sourceData));
  }

  /**
   * 数据验证
   */
  private validateData(data: any, nodeType: DataFlowNodeType): void {
    if (!data) {
      throw new Error('数据不能为空');
    }

    switch (nodeType) {
      case 'geometry':
        this.validateGeometryData(data);
        break;
      case 'computation':
        this.validateComputationData(data);
        break;
      // 可以添加更多验证规则
    }
  }

  private validateGeometryData(data: any): void {
    if (!data.nodes || !Array.isArray(data.nodes)) {
      throw new Error('几何数据必须包含节点数组');
    }
    if (!data.elements || !Array.isArray(data.elements)) {
      throw new Error('几何数据必须包含单元数组');
    }
  }

  private validateComputationData(data: any): void {
    if (!data.params) {
      throw new Error('计算数据必须包含参数');
    }
  }

  // ==================== 工具方法 ====================

  private checkAutoTransfers(nodeId: string): void {
    const connections = Array.from(this.connections.values())
      .filter(conn => conn.sourceNodeId === nodeId && conn.transferConfig.autoTransfer);

    for (const connection of connections) {
      setTimeout(() => {
        this.transferData(connection.id).catch(error => {
          console.error(`自动传输失败: ${connection.id}`, error);
        });
      }, 100); // 短暂延迟避免阻塞
    }
  }

  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32位整数
    }
    return hash.toString(36);
  }

  private calculateDataSize(data: any): number {
    return JSON.stringify(data).length;
  }

  private compressData(data: any): any {
    // 简单压缩：移除空值和undefined
    return JSON.parse(JSON.stringify(data, (key, value) => {
      return value === null || value === undefined ? undefined : value;
    }));
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private applyTransform(value: any, transform: string): any {
    // 简单的变换实现
    switch (transform) {
      case 'toString': return String(value);
      case 'toNumber': return Number(value);
      case 'toArray': return Array.isArray(value) ? value : [value];
      default: return value;
    }
  }

  private validateValue(value: any, validation: string): void {
    // 简单的验证实现
    switch (validation) {
      case 'required':
        if (value === null || value === undefined) {
          throw new Error('值不能为空');
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          throw new Error('值必须是数字');
        }
        break;
    }
  }

  private updatePerformanceMetrics(transferTime: number, dataSize: number): void {
    this.performanceMetrics.totalTransfers++;
    this.performanceMetrics.successfulTransfers++;
    this.performanceMetrics.totalDataTransferred += dataSize;
    
    // 计算平均传输时间
    const totalTime = this.performanceMetrics.averageTransferTime * (this.performanceMetrics.totalTransfers - 1) + transferTime;
    this.performanceMetrics.averageTransferTime = totalTime / this.performanceMetrics.totalTransfers;
  }

  private emitEvent(event: DataFlowEvent): void {
    this.eventHistory.push(event);
    
    // 限制事件历史长度
    if (this.eventHistory.length > this.config.maxEventHistory) {
      this.eventHistory = this.eventHistory.slice(-this.config.maxEventHistory);
    }

    this.emit(event.type, event);
    
    if (this.config.debugMode) {
      console.log('🌊 DataFlow Event:', event);
    }
  }

  private startAutoCleanup(): void {
    setInterval(() => {
      this.performCleanup();
    }, this.config.autoCleanupInterval);
  }

  private performCleanup(): void {
    // 清理过期版本、事件历史等
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时

    for (const node of this.nodes.values()) {
      node.versions = node.versions.filter(version => 
        now - version.timestamp < maxAge
      );
    }

    console.log('🧹 DataFlow自动清理完成');
  }

  // ==================== 公共API ====================

  public getNode(nodeId: string): DataFlowNode | undefined {
    return this.nodes.get(nodeId);
  }

  public getAllNodes(): DataFlowNode[] {
    return Array.from(this.nodes.values());
  }

  public getConnection(connectionId: string): DataFlowConnection | undefined {
    return this.connections.get(connectionId);
  }

  public getAllConnections(): DataFlowConnection[] {
    return Array.from(this.connections.values());
  }

  public getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  public getEventHistory(limit?: number): DataFlowEvent[] {
    return limit ? this.eventHistory.slice(-limit) : [...this.eventHistory];
  }

  public dispose(): void {
    this.removeAllListeners();
    this.nodes.clear();
    this.connections.clear();
    this.eventHistory = [];
    console.log('🌊 DataFlowManager已清理');
  }
}

// 导出单例实例
export const dataFlowManager = new DataFlowManager();