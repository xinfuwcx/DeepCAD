/**
 * 几何到网格数据传递服务 - 2号与3号专家协作接口
 * 0号架构师实现
 * 核心功能：将几何数据转换为3号网格生成所需的标准格式
 */

import { GeometryModel, MeshQualityFeedback, GeometryAdjustment } from './GeometryArchitectureService';
import { geometryArchitecture } from './GeometryArchitectureService';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

// 3号专家网格数据格式
export interface MeshData {
  vertices: Float32Array;
  faces: Uint32Array;
  nodeIds: Uint32Array;
  elementIds: Uint32Array;
  materialIds: Uint8Array;
  boundaryConditions: BoundaryCondition[];
  physicalGroups: PhysicalGroup[];
  quality: MeshQualityMetrics;
}

export interface BoundaryCondition {
  type: 'displacement' | 'force' | 'pressure' | 'temperature';
  nodeIds: number[];
  values: number[];
  direction?: 'x' | 'y' | 'z' | 'normal';
}

export interface PhysicalGroup {
  id: number;
  name: string;
  dimension: 1 | 2 | 3; // 1=边, 2=面, 3=体
  elementIds: number[];
  materialProperties?: any;
}

export interface MeshQualityMetrics {
  averageQuality: number;
  minimumQuality: number;
  maximumQuality: number;
  skewnessDistribution: number[];
  aspectRatioDistribution: number[];
  jacobianDistribution: number[];
}

export interface MeshQualityConfig {
  maxElementSize: number;
  minElementSize: number;
  gradingFactor: number;
  elementType: 'tetrahedron' | 'hexahedron' | 'prism' | 'pyramid';
  qualityThreshold: number;
  enableOptimization: boolean;
}

export interface GeometryToMeshConfig {
  meshQuality: MeshQualityConfig;
  materialMapping: boolean;
  boundaryDetection: boolean;
  optimizationLevel: 'fast' | 'balanced' | 'quality';
}

class GeometryToMeshService {
  private initialized = false;
  private activeTransfers = new Map<string, GeometryTransfer>();

  constructor() {}

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    console.log('🔗 几何到网格服务初始化中...');
    this.initialized = true;
    console.log('✅ 几何到网格服务初始化完成');
  }

  // ============== 主要转换接口 ==============
  public async processGeometry(geometry: GeometryModel, config?: GeometryToMeshConfig): Promise<MeshData> {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log(`🔄 处理几何模型: ${geometry.id} (${geometry.type})`);
    
    const transferId = `transfer_${Date.now()}`;
    const transfer: GeometryTransfer = {
      id: transferId,
      geometryId: geometry.id,
      geometry,
      config: config || this.getDefaultConfig(),
      status: 'processing',
      startTime: Date.now()
    };
    
    this.activeTransfers.set(transferId, transfer);
    
    try {
      // 1. 几何预处理
      const preprocessedGeometry = await this.preprocessGeometry(geometry, transfer.config);
      
      // 2. 转换为网格数据格式
      const meshData = await this.convertToMeshData(preprocessedGeometry, transfer.config);
      
      // 3. 质量验证
      const qualityReport = await this.validateMeshData(meshData);
      
      // 4. 发送给3号专家的网格模块
      await this.sendToMeshModule(meshData, qualityReport);
      
      transfer.status = 'completed';
      transfer.endTime = Date.now();
      
      console.log(`✅ 几何转换完成: ${transferId}, 耗时: ${transfer.endTime - transfer.startTime}ms`);
      
      return meshData;
      
    } catch (error) {
      transfer.status = 'failed';
      transfer.error = error instanceof Error ? error.message : '未知错误';
      transfer.endTime = Date.now();
      
      console.error(`❌ 几何转换失败: ${transferId}`, error);
      throw error;
    } finally {
      // 清理完成的传输记录 (保留最近的50个)
      if (this.activeTransfers.size > 50) {
        const oldestEntries = Array.from(this.activeTransfers.entries())
          .sort((a, b) => a[1].startTime - b[1].startTime)
          .slice(0, this.activeTransfers.size - 50);
        
        oldestEntries.forEach(([id]) => this.activeTransfers.delete(id));
      }
    }
  }

  // ============== 几何预处理 ==============
  private async preprocessGeometry(geometry: GeometryModel, config: GeometryToMeshConfig): Promise<GeometryModel> {
    console.log('🔧 几何预处理开始...');
    
    // 1. 几何清理和修复
    const repairedGeometry = await this.repairGeometry(geometry);
    
    // 2. 尺度标准化
    const scaledGeometry = await this.normalizeScale(repairedGeometry);
    
    // 3. 边界识别
    if (config.boundaryDetection) {
      await this.detectBoundaries(scaledGeometry);
    }
    
    console.log('✅ 几何预处理完成');
    return scaledGeometry;
  }

  private async repairGeometry(geometry: GeometryModel): Promise<GeometryModel> {
    // 几何修复逻辑：去除重复顶点、修复法向量等
    console.log('🔨 几何修复中...');
    
    // 模拟几何修复过程
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      ...geometry,
      metadata: {
        ...geometry.metadata,
        repaired: true,
        repairTimestamp: Date.now()
      }
    };
  }

  private async normalizeScale(geometry: GeometryModel): Promise<GeometryModel> {
    console.log('📏 尺度标准化中...');
    
    // 模拟尺度标准化
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      ...geometry,
      metadata: {
        ...geometry.metadata,
        normalized: true,
        normalizationTimestamp: Date.now()
      }
    };
  }

  private async detectBoundaries(geometry: GeometryModel): Promise<void> {
    console.log('🔍 边界检测中...');
    
    // 模拟边界检测
    await new Promise(resolve => setTimeout(resolve, 80));
    
    console.log('✅ 边界检测完成');
  }

  // ============== 网格数据转换 ==============
  private async convertToMeshData(geometry: GeometryModel, config: GeometryToMeshConfig): Promise<MeshData> {
    console.log('🔄 转换为网格数据格式...');
    
    // 模拟转换过程
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 生成网格数据
    const vertexCount = Math.floor(Math.random() * 1000) + 500;
    const faceCount = Math.floor(vertexCount * 1.8);
    
    const meshData: MeshData = {
      vertices: new Float32Array(vertexCount * 3),
      faces: new Uint32Array(faceCount * 3),
      nodeIds: new Uint32Array(vertexCount),
      elementIds: new Uint32Array(faceCount),
      materialIds: new Uint8Array(faceCount),
      boundaryConditions: [],
      physicalGroups: [
        {
          id: 1,
          name: '土体',
          dimension: 3,
          elementIds: Array.from({length: Math.floor(faceCount * 0.8)}, (_, i) => i)
        },
        {
          id: 2,
          name: '支护结构',
          dimension: 2,
          elementIds: Array.from({length: Math.floor(faceCount * 0.2)}, (_, i) => i + Math.floor(faceCount * 0.8))
        }
      ],
      quality: {
        averageQuality: 0.85,
        minimumQuality: 0.6,
        maximumQuality: 0.95,
        skewnessDistribution: [0.1, 0.3, 0.4, 0.2],
        aspectRatioDistribution: [0.2, 0.5, 0.3],
        jacobianDistribution: [0.1, 0.7, 0.2]
      }
    };
    
    // 填充随机数据用于测试
    for (let i = 0; i < meshData.vertices.length; i++) {
      meshData.vertices[i] = (Math.random() - 0.5) * 100;
    }
    
    for (let i = 0; i < meshData.faces.length; i++) {
      meshData.faces[i] = Math.floor(Math.random() * vertexCount);
    }
    
    console.log(`✅ 网格数据生成完成: ${vertexCount}个顶点, ${faceCount}个面`);
    
    return meshData;
  }

  // ============== 质量验证 ==============
  private async validateMeshData(meshData: MeshData): Promise<MeshQualityFeedback> {
    console.log('🔍 网格质量验证中...');
    
    // 模拟质量验证
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const feedback: MeshQualityFeedback = {
      overall: 'good',
      metrics: {
        connectivity: 0.95,
        aspectRatio: 0.82,
        skewness: 0.88,
        orthogonality: 0.90
      },
      issues: [],
      suggestions: [
        {
          type: 'optimization',
          priority: 'medium',
          description: '建议增加局部网格密度以提高精度',
          affectedElements: []
        }
      ]
    };
    
    if (meshData.quality.minimumQuality < 0.5) {
      feedback.issues.push({
        type: 'quality',
        severity: 'warning',
        description: '部分网格单元质量较低',
        affectedElements: [],
        suggestedFix: '增加网格优化迭代次数'
      });
    }
    
    console.log(`✅ 质量验证完成: ${feedback.overall}`);
    
    return feedback;
  }

  // ============== 与3号专家接口 ==============
  private async sendToMeshModule(meshData: MeshData, qualityReport: MeshQualityFeedback): Promise<void> {
    console.log('📤 发送数据到3号专家网格模块...');
    
    // 触发自定义事件通知3号专家
    const transferEvent = new CustomEvent('geometryToMeshTransfer', {
      detail: {
        meshData,
        qualityReport,
        timestamp: Date.now(),
        source: '2号几何专家'
      }
    });
    
    window.dispatchEvent(transferEvent);
    
    // 模拟网络传输
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('✅ 数据传输完成');
  }

  // ============== 反馈处理 ==============
  public async processMeshQualityFeedback(feedback: MeshQualityFeedback): Promise<GeometryAdjustment[]> {
    console.log('🔄 处理3号专家质量反馈...');
    
    const adjustments: GeometryAdjustment[] = [];
    
    // 根据反馈生成调整建议
    feedback.suggestions.forEach(suggestion => {
      if (suggestion.type === 'geometry') {
        adjustments.push({
          type: 'refinement',
          target: 'local',
          parameters: {
            region: suggestion.affectedElements,
            factor: 1.5
          },
          priority: suggestion.priority,
          description: suggestion.description
        });
      }
    });
    
    console.log(`✅ 生成${adjustments.length}个几何调整建议`);
    
    return adjustments;
  }

  // ============== 工具方法 ==============
  private getDefaultConfig(): GeometryToMeshConfig {
    return {
      meshQuality: {
        maxElementSize: 2.0,
        minElementSize: 0.1,
        gradingFactor: 1.3,
        elementType: 'tetrahedron',
        qualityThreshold: 0.7,
        enableOptimization: true
      },
      materialMapping: true,
      boundaryDetection: true,
      optimizationLevel: 'balanced'
    };
  }

  public getActiveTransfers(): GeometryTransfer[] {
    return Array.from(this.activeTransfers.values());
  }

  public getTransferStatus(transferId: string): GeometryTransfer | undefined {
    return this.activeTransfers.get(transferId);
  }

  // ============== 统计信息 ==============
  public getStatistics() {
    const transfers = Array.from(this.activeTransfers.values());
    const completed = transfers.filter(t => t.status === 'completed');
    const failed = transfers.filter(t => t.status === 'failed');
    const processing = transfers.filter(t => t.status === 'processing');
    
    const avgProcessingTime = completed.length > 0 
      ? completed.reduce((sum, t) => sum + ((t.endTime || 0) - t.startTime), 0) / completed.length
      : 0;
    
    return {
      totalTransfers: transfers.length,
      completed: completed.length,
      failed: failed.length,
      processing: processing.length,
      successRate: transfers.length > 0 ? (completed.length / transfers.length) * 100 : 0,
      averageProcessingTime: avgProcessingTime
    };
  }
}

interface GeometryTransfer {
  id: string;
  geometryId: string;
  geometry: GeometryModel;
  config: GeometryToMeshConfig;
  status: 'processing' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  error?: string;
}

// 导出单例实例
const geometryToMeshService = new GeometryToMeshService();
export default geometryToMeshService;