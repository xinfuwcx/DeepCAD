/**
 * DeepCAD 计算分析服务
 * @description 深基坑工程计算分析的核心服务模块，负责处理荷载分析、约束设置、边界条件等CAE计算任务
 * 提供与后端计算引擎的API通信接口，支持土-结构耦合分析、施工阶段分析等专业计算功能
 * @author 3号计算专家
 * @version 2.0.0
 * @since 2024-07-25
 */

import { LoadDefinition, LoadCase } from '../components/computation/LoadConfigPanel';

/**
 * 计算分析请求参数接口
 * @interface ComputationRequest
 * @description 定义发送给后端计算引擎的完整分析请求参数
 */
export interface ComputationRequest {
  /** 项目唯一标识符 */
  project_id: string;
  
  /** 分析配置参数 */
  analysis_config: {
    /** 分析类型：静力分析/动力分析/非线性分析等 */
    analysis_type: string;
    /** 求解器类型：直接求解器/迭代求解器等 */
    solver_type: string;
    
    /** 时间设置（动力分析用） */
    time_settings?: {
      /** 分析开始时间 (秒) */
      start_time: number;
      /** 分析结束时间 (秒) */
      end_time: number;
      /** 时间步长 (秒) */
      time_step: number;
    };
    
    /** 收敛判据 */
    convergence_criteria?: {
      /** 最大迭代次数 */
      max_iterations: number;
      /** 整体收敛容差 */
      tolerance: number;
      /** 位移收敛容差 (米) */
      displacement_tolerance: number;
      /** 力收敛容差 (牛顿) */
      force_tolerance: number;
    };
  };
  
  /** 荷载定义数组 */
  loads: LoadDefinition[];
  /** 约束条件数组 */
  constraints: any[];
  /** 边界条件数组 */
  boundary_conditions: any[];
  /** 材料属性映射表 */
  material_properties?: { [key: string]: any };
}

/**
 * 计算分析响应结果接口
 * @interface ComputationResponse
 * @description 后端计算引擎返回的分析任务状态和结果信息
 */
export interface ComputationResponse {
  /** 计算任务唯一标识符 */
  job_id: string;
  /** 任务状态：等待中/运行中/已完成/失败 */
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** 状态消息 */
  message: string;
  /** 计算进度百分比 (0-100) */
  progress?: number;
  /** 结果文件下载链接 */
  results_url?: string;
  /** 错误信息（任务失败时） */
  error_message?: string;
}

/**
 * 荷载模板响应接口
 * @interface LoadTemplatesResponse
 * @description 预定义的荷载模板库，包含常用的工程荷载类型和参数
 */
export interface LoadTemplatesResponse {
  /** 荷载模板分类映射 */
  templates: {
    [category: string]: {
      /** 分类描述 */
      description: string;
      /** 荷载模板数组 */
      loads: Array<{
        /** 荷载名称 */
        name: string;
        /** 荷载类型 */
        type: string;
        /** 荷载描述 */
        description: string;
        /** 典型取值范围 */
        typical_values: string;
        /** 适用场景 */
        application: string;
      }>;
    };
  };
}

/**
 * 荷载配置验证结果接口
 * @interface ValidationResult
 * @description 荷载配置参数验证的详细结果信息
 */
export interface ValidationResult {
  /** 验证是否通过 */
  is_valid: boolean;
  /** 警告信息数组 */
  warnings: string[];
  /** 错误信息数组 */
  errors: string[];
  /** 荷载统计信息 */
  statistics: {
    /** 总荷载数量 */
    total_loads: number;
    /** 激活的荷载数量 */
    active_loads: number;
    /** 按类型分组的荷载数量 */
    load_types: { [key: string]: number };
  };
}

/**
 * 计算分析服务类
 * @class ComputationService
 * @description 提供深基坑工程计算分析的完整API服务，包括荷载管理、分析任务提交、结果获取等功能
 */
class ComputationService {
  /** API服务基础URL */
  private baseUrl: string;

  /**
   * 计算服务构造函数
   * @description 初始化计算服务，设置API基础路径
   */
  constructor() {
    this.baseUrl = '/api/computation';
  }

  /**
   * 创建荷载定义
   * @description 向后端提交新的荷载定义，用于深基坑分析计算
   * @param projectId - 项目唯一标识符
   * @param loadDefinition - 荷载定义参数对象
   * @returns Promise<创建结果> 包含创建状态、消息和荷载ID
   * @throws {Error} 网络请求失败或服务器错误时抛出异常
   * @example
   * ```typescript
   * const result = await computationService.createLoad("proj123", {
   *   name: "土压力荷载",
   *   type: "pressure",
   *   magnitude: 50.0
   * });
   * ```
   */
  async createLoad(projectId: string, loadDefinition: LoadDefinition): Promise<{
    success: boolean;
    message: string;
    load_id?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/loads/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          load_definition: loadDefinition
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating load:', error);
      throw error;
    }
  }

  /**
   * 获取项目荷载列表
   */
  async getLoads(projectId: string): Promise<{
    loads: LoadDefinition[];
    total_count: number;
    active_count: number;
    load_cases: LoadCase[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/loads/list/${projectId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting loads:', error);
      throw error;
    }
  }

  /**
   * 更新荷载
   */
  async updateLoad(loadId: string, loadDefinition: LoadDefinition): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/loads/update/${loadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          load_definition: loadDefinition
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating load:', error);
      throw error;
    }
  }

  /**
   * 删除荷载
   */
  async deleteLoad(loadId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/loads/delete/${loadId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting load:', error);
      throw error;
    }
  }

  /**
   * 获取荷载模板
   */
  async getLoadTemplates(): Promise<LoadTemplatesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/loads/templates`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting load templates:', error);
      throw error;
    }
  }

  /**
   * 验证荷载配置
   */
  async validateLoads(projectId: string): Promise<ValidationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/loads/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error validating loads:', error);
      throw error;
    }
  }

  /**
   * 启动计算任务
   */
  async startComputation(request: ComputationRequest): Promise<ComputationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting computation:', error);
      throw error;
    }
  }

  /**
   * 获取计算状态
   */
  async getComputationStatus(): Promise<{
    module: string;
    status: string;
    timestamp: string;
    job_statistics: {
      active: number;
      completed: number;
      failed: number;
      total: number;
    };
    solvers: {
      terra_available: boolean;
      simulation_available: boolean;
    };
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting computation status:', error);
      throw error;
    }
  }

  /**
   * 获取可用求解器
   */
  async getAvailableSolvers(): Promise<{
    timestamp: string;
    solvers: {
      [key: string]: {
        name: string;
        status: string;
        description: string;
        capabilities: string[];
        supported_materials?: string[];
        version?: string;
      };
    };
    post_processing: {
      [key: string]: {
        name: string;
        status: string;
        description: string;
        capabilities: string[];
      };
    };
    summary: {
      total_solvers: number;
      available_solvers: number;
      post_processing_available: boolean;
    };
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/solvers`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting available solvers:', error);
      throw error;
    }
  }

  /**
   * 导出荷载配置
   */
  async exportLoads(projectId: string, format: string = 'json'): Promise<{
    success: boolean;
    data: any;
    format: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/loads/export/${projectId}?format=${format}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error exporting loads:', error);
      throw error;
    }
  }

  /**
   * 创建荷载工况
   */
  async createLoadCase(projectId: string, loadCase: LoadCase): Promise<{
    success: boolean;
    message: string;
    load_id?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/loads/load-cases/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          load_case: loadCase
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating load case:', error);
      throw error;
    }
  }

  /**
   * WebSocket连接管理
   */
  connectWebSocket(clientId: string, onMessage: (data: any) => void): WebSocket | null {
    try {
      const wsUrl = `ws://localhost:8000/api/computation/ws/${clientId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Computation WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Computation WebSocket disconnected');
      };

      ws.onerror = (error) => {
        console.error('Computation WebSocket error:', error);
      };

      return ws;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      return null;
    }
  }
}

// ============== 计算结果处理类型定义 ==============

/**
 * 计算识别问题接口
 * @interface IdentifiedProblem
 * @description 计算过程中识别出的问题和异常情况
 */
export interface IdentifiedProblem {
  /** 问题ID */
  problemId: string;
  /** 问题类型 */
  type: 'CONVERGENCE_ISSUE' | 'NUMERICAL_INSTABILITY' | 'MESH_QUALITY' | 'BOUNDARY_CONDITION' | 'MATERIAL_PROPERTY';
  /** 严重程度 */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** 问题位置 */
  location: {
    /** 节点ID数组 */
    nodeIds: number[];
    /** 单元ID数组 */
    elementIds: number[];
    /** 几何坐标 */
    coordinates: Array<{
      x: number;
      y: number;
      z: number;
    }>;
    /** 受影响的边界框 */
    boundingBox: {
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    };
  };
  /** 问题指标 */
  metrics: {
    /** 当前值 */
    currentValue: number;
    /** 可接受阈值 */
    acceptableThreshold: number;
    /** 偏差幅度 */
    deviationMagnitude: number;
    /** 相关统计信息 */
    statistics?: {
      mean: number;
      standardDeviation: number;
      min: number;
      max: number;
    };
  };
  /** 问题分析 */
  analysis: {
    /** 根本原因 */
    rootCause: string;
    /** 促成因素 */
    contributingFactors: string[];
    /** 相关问题ID */
    relatedProblems: string[];
    /** 影响分析 */
    impactAnalysis: {
      computationalAccuracy: number;
      convergenceRate: number;
      solutionReliability: number;
    };
  };
  /** 推荐解决方案 */
  recommendedActions: Array<{
    /** 解决方案 */
    action: string;
    /** 优先级 */
    priority: number;
    /** 预估努力程度 */
    estimatedEffort: number;
    /** 成功概率 */
    successProbability: number;
    /** 预期改进程度 */
    expectedImprovement: number;
  }>;
  /** 时间戳 */
  timestamp: number;
  /** 计算步骤 */
  computationStep?: string;
}

/**
 * 调整汇总接口
 * @interface AdjustmentSummary
 * @description 计算参数调整的详细汇总信息
 */
export interface AdjustmentSummary {
  /** 汇总ID */
  summaryId: string;
  /** 调整总数 */
  adjustmentCount: number;
  /** 总处理时间 (毫秒) */
  totalProcessingTime: number;
  /** 修改详情 */
  modifications: Array<{
    /** 修改类型 */
    type: 'PARAMETER_CHANGE' | 'BOUNDARY_ADJUSTMENT' | 'MESH_REFINEMENT' | 'SOLVER_OPTIMIZATION';
    /** 修改数量 */
    count: number;
    /** 平均改进程度 */
    averageImprovement: number;
    /** 成功率 */
    successRate: number;
    /** 影响范围 */
    affectedScope: string;
  }>;
  /** 计算质量变化 */
  qualityChanges: {
    /** 调整前状态 */
    before: {
      convergenceRate: number;
      residualNorm: number;
      solutionAccuracy: number;
      computationTime: number;
    };
    /** 调整后状态 */
    after: {
      convergenceRate: number;
      residualNorm: number;
      solutionAccuracy: number;
      computationTime: number;
    };
    /** 改进程度 */
    improvement: {
      convergenceRateImprovement: number;
      residualReduction: number;
      accuracyGain: number;
      timeEfficiencyGain: number;
    };
  };
  /** 求解器调整 */
  solverAdjustments: {
    /** 迭代参数调整 */
    iterationParameterAdjustments: number;
    /** 预处理器优化 */
    preconditionerOptimizations: number;
    /** 容差调整 */
    toleranceAdjustments: number;
    /** 时间步长调整 */
    timeStepAdjustments: number;
  };
  /** 验证结果 */
  validationResults: {
    /** 验证是否通过 */
    passed: boolean;
    /** 警告信息 */
    warnings: string[];
    /** 错误信息 */
    errors: string[];
    /** 验证评分 */
    validationScore: number;
  };
  /** 性能指标 */
  performanceMetrics: {
    /** 内存使用峰值 (MB) */
    memoryPeakUsage: number;
    /** CPU利用率 */
    cpuUtilization: number;
    /** 网络传输量 (KB) */
    networkTraffic: number;
    /** 磁盘I/O操作数 */
    diskIOOperations: number;
  };
}

/**
 * 质量验证结果接口
 * @interface QualityValidationResult
 * @description 计算结果质量验证的详细结果
 */
export interface QualityValidationResult {
  /** 验证ID */
  validationId: string;
  /** 验证时间戳 */
  timestamp: number;
  /** 总体评分 (0-100) */
  overallScore: number;
  /** 验证是否通过 */
  passed: boolean;
  /** 详细验证结果 */
  detailedResults: {
    /** 收敛性验证 */
    convergence: {
      /** 评分 */
      score: number;
      /** 是否通过 */
      passed: boolean;
      /** 阈值 */
      threshold: number;
      /** 实际值 */
      actualValue: number;
      /** 迭代历史 */
      iterationHistory: Array<{
        iteration: number;
        residual: number;
        error: number;
      }>;
    };
    /** 精度验证 */
    accuracy: {
      /** 评分 */
      score: number;
      /** 是否通过 */
      passed: boolean;
      /** 阈值 */
      threshold: number;
      /** 相对误差 */
      relativeError: number;
      /** 绝对误差 */
      absoluteError: number;
    };
    /** 稳定性验证 */
    stability: {
      /** 评分 */
      score: number;
      /** 是否通过 */
      passed: boolean;
      /** 阈值 */
      threshold: number;
      /** 稳定性指标 */
      stabilityIndex: number;
    };
    /** 物理合理性验证 */
    physicalReasonableness: {
      /** 评分 */
      score: number;
      /** 是否通过 */
      passed: boolean;
      /** 阈值 */
      threshold: number;
      /** 物理约束检查 */
      constraintChecks: Array<{
        constraint: string;
        satisfied: boolean;
        deviation: number;
      }>;
    };
  };
  /** 单元级验证分析 */
  elementAnalysis: {
    /** 总单元数 */
    totalElements: number;
    /** 通过验证的单元数 */
    passedElements: number;
    /** 失败的单元数 */
    failedElements: number;
    /** 问题单元详情 */
    problematicElements: Array<{
      /** 单元ID */
      elementId: number;
      /** 问题列表 */
      issues: string[];
      /** 严重程度 */
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      /** 位置坐标 */
      location: {
        x: number;
        y: number;
        z: number;
      };
    }>;
  };
  /** 改进建议 */
  recommendations: Array<{
    /** 优先级 */
    priority: number;
    /** 建议动作 */
    action: string;
    /** 预期改进程度 */
    expectedImprovement: number;
    /** 实施复杂度 */
    implementationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
    /** 估算时间成本 (小时) */
    estimatedTimeCost: number;
  }>;
  /** 基准对比 */
  benchmarkComparison?: {
    /** 参考解名称 */
    referenceSolution: string;
    /** 相对偏差 */
    relativeDeviation: number;
    /** 对比指标 */
    comparisonMetrics: {
      displacementDeviation: number;
      stressDeviation: number;
      strainDeviation: number;
    };
  };
}

export const computationService = new ComputationService();