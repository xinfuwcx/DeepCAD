/**
 * Kratos有限元分析服务
 * 
 * 负责执行有限元分析和处理结果
 * 接收从Netgen生成的网格，执行分析并返回结果
 */

import axios from 'axios';
import { getApiBaseUrl } from '../../frontend/src/config/config';

// 分析类型
export enum AnalysisType {
  STATIC = 'static',                  // 静力分析
  DYNAMIC = 'dynamic',                // 动力分析
  SEEPAGE = 'seepage',                // 渗流分析
  CONSOLIDATION = 'consolidation',    // 固结分析
  EXCAVATION = 'excavation',          // 基坑开挖分析
  COUPLED = 'coupled'                 // 耦合分析
}

// 分析参数
export interface AnalysisParams {
  analysisType: AnalysisType;         // 分析类型
  timeSteps: number;                  // 时间步数量
  timeStepSize: number;               // 时间步大小
  maxIterations: number;              // 最大迭代次数
  convergenceTolerance: number;       // 收敛容差
  solverType: 'direct' | 'iterative'; // 求解器类型
  outputFrequency: number;            // 输出频率
  gravityEnabled: boolean;            // 是否启用重力
  gravity: [number, number, number];  // 重力向量
}

// 材料参数
export interface MaterialParams {
  name: string;                       // 材料名称
  type: string;                       // 材料类型
  properties: Record<string, any>;    // 材料属性
}

// 边界条件
export interface BoundaryCondition {
  name: string;                       // 边界条件名称
  type: string;                       // 边界条件类型
  boundaryName: string;               // 边界名称
  value: any;                         // 边界条件值
  timeFunction?: string;              // 时间函数
}

// 分析结果类型
export enum ResultType {
  DISPLACEMENT = 'displacement',      // 位移
  STRESS = 'stress',                  // 应力
  STRAIN = 'strain',                  // 应变
  PORE_PRESSURE = 'pore_pressure',    // 孔隙水压力
  REACTION = 'reaction',              // 反力
  INTERNAL_FORCE = 'internal_force'   // 内力
}

// 分析状态
export enum AnalysisStatus {
  PENDING = 'pending',                // 等待中
  RUNNING = 'running',                // 运行中
  COMPLETED = 'completed',            // 已完成
  FAILED = 'failed'                   // 失败
}

// 分析进度
export interface AnalysisProgress {
  status: AnalysisStatus;             // 状态
  progress: number;                   // 进度百分比
  currentStep: number;                // 当前步
  totalSteps: number;                 // 总步数
  currentIteration: number;           // 当前迭代
  residualNorm: number;               // 残差范数
  timeElapsed: number;                // 已用时间(秒)
  timeRemaining: number;              // 剩余时间(秒)
  message: string;                    // 状态消息
}

// 结果数据
export interface ResultData {
  resultType: ResultType;             // 结果类型
  step: number;                       // 时间步
  componentName: string;              // 分量名称
  values: number[];                   // 结果值
  nodeIds?: number[];                 // 节点ID(如适用)
  elementIds?: number[];              // 单元ID(如适用)
  min: number;                        // 最小值
  max: number;                        // 最大值
  average: number;                    // 平均值
}

// Kratos服务接口
export interface IKratosService {
  // 创建分析模型
  createModel(kratosModelId: string, name: string): Promise<string>;
  
  // 设置分析参数
  setAnalysisParams(modelId: string, params: Partial<AnalysisParams>): Promise<void>;
  
  // 设置材料参数
  setMaterial(modelId: string, material: MaterialParams): Promise<void>;
  
  // 添加边界条件
  addBoundaryCondition(modelId: string, bc: BoundaryCondition): Promise<void>;
  
  // 运行分析
  runAnalysis(modelId: string): Promise<string>;
  
  // 获取分析进度
  getAnalysisProgress(analysisId: string): Promise<AnalysisProgress>;
  
  // 获取分析结果
  getResults(analysisId: string, resultType: ResultType, step: number): Promise<ResultData>;
  
  // 导出结果
  exportResults(analysisId: string, format: 'vtk' | 'json' | 'csv'): Promise<Blob>;
  
  // 获取分析步列表
  getTimeSteps(analysisId: string): Promise<number[]>;
  
  // 获取可用结果类型
  getAvailableResultTypes(analysisId: string): Promise<ResultType[]>;
  
  // 获取结果统计信息
  getResultStatistics(analysisId: string, resultType: ResultType): Promise<{
    min: number;
    max: number;
    average: number;
    steps: number[];
  }>;
}

// 默认分析参数
const defaultAnalysisParams: AnalysisParams = {
  analysisType: AnalysisType.STATIC,
  timeSteps: 1,
  timeStepSize: 1.0,
  maxIterations: 10,
  convergenceTolerance: 1e-6,
  solverType: 'direct',
  outputFrequency: 1,
  gravityEnabled: true,
  gravity: [0, -9.81, 0]
};

/**
 * 创建Kratos服务
 */
export const createKratosService = (): IKratosService => {
  // API基础URL
  const apiBaseUrl = getApiBaseUrl();
  const kratosApiUrl = `${apiBaseUrl}/api/kratos`;
  
  // 检查是否使用模拟API
  const useMockApi = process.env.NODE_ENV === 'development' && 
                    (process.env.VITE_USE_MOCK_API === 'true' || true);
  
  // 模型缓存
  const modelCache: Record<string, any> = {};
  
  // 分析缓存
  const analysisCache: Record<string, {
    modelId: string;
    status: AnalysisStatus;
    progress: number;
    startTime: number;
    results: Record<string, Record<number, ResultData>>;
    steps: number[];
  }> = {};
  
  // 创建模拟结果数据
  const createMockResultData = (resultType: ResultType, step: number, componentName: string): ResultData => {
    const nodeCount = 1000;
    const values: number[] = [];
    
    let min = 0;
    let max = 0;
    let sum = 0;
    
    // 根据结果类型生成不同范围的随机值
    switch (resultType) {
      case ResultType.DISPLACEMENT:
        // 位移范围通常较小，单位为m
        for (let i = 0; i < nodeCount; i++) {
          const value = (Math.random() - 0.5) * 0.05 * step; // 随时间增加
          values.push(value);
          min = Math.min(min, value);
          max = Math.max(max, value);
          sum += value;
        }
        break;
        
      case ResultType.STRESS:
        // 应力范围通常较大，单位为kPa
        for (let i = 0; i < nodeCount; i++) {
          const value = Math.random() * 500 * step; // 随时间增加
          values.push(value);
          min = Math.min(min, value);
          max = Math.max(max, value);
          sum += value;
        }
        break;
        
      case ResultType.STRAIN:
        // 应变通常是无量纲的小数
        for (let i = 0; i < nodeCount; i++) {
          const value = Math.random() * 0.01 * step; // 随时间增加
          values.push(value);
          min = Math.min(min, value);
          max = Math.max(max, value);
          sum += value;
        }
        break;
        
      case ResultType.PORE_PRESSURE:
        // 孔隙水压力，单位为kPa
        for (let i = 0; i < nodeCount; i++) {
          const value = Math.random() * 100 * step; // 随时间增加
          values.push(value);
          min = Math.min(min, value);
          max = Math.max(max, value);
          sum += value;
        }
        break;
        
      default:
        // 其他结果类型
        for (let i = 0; i < nodeCount; i++) {
          const value = Math.random() * 10 * step; // 随时间增加
          values.push(value);
          min = Math.min(min, value);
          max = Math.max(max, value);
          sum += value;
        }
    }
    
    return {
      resultType,
      step,
      componentName,
      values,
      min,
      max,
      average: sum / nodeCount
    };
  };
  
  // 更新模拟分析进度
  const updateMockAnalysisProgress = (analysisId: string) => {
    const analysis = analysisCache[analysisId];
    if (!analysis) return;
    
    // 如果分析已完成或失败，不再更新
    if (analysis.status === AnalysisStatus.COMPLETED || analysis.status === AnalysisStatus.FAILED) {
      return;
    }
    
    // 更新进度
    analysis.progress += Math.random() * 5;
    if (analysis.progress >= 100) {
      analysis.progress = 100;
      analysis.status = AnalysisStatus.COMPLETED;
    }
    
    // 模拟生成结果数据
    if (analysis.progress > 50 && !analysis.results[ResultType.DISPLACEMENT]) {
      analysis.results[ResultType.DISPLACEMENT] = {};
      analysis.results[ResultType.STRESS] = {};
      analysis.results[ResultType.STRAIN] = {};
      
      // 为每个时间步生成结果
      analysis.steps.forEach(step => {
        // 位移结果
        ['X', 'Y', 'Z', 'Magnitude'].forEach(component => {
          analysis.results[ResultType.DISPLACEMENT][step] = 
            createMockResultData(ResultType.DISPLACEMENT, step, component);
        });
        
        // 应力结果
        ['XX', 'YY', 'ZZ', 'XY', 'YZ', 'XZ', 'Von Mises'].forEach(component => {
          analysis.results[ResultType.STRESS][step] = 
            createMockResultData(ResultType.STRESS, step, component);
        });
        
        // 应变结果
        ['XX', 'YY', 'ZZ', 'XY', 'YZ', 'XZ', 'Equivalent'].forEach(component => {
          analysis.results[ResultType.STRAIN][step] = 
            createMockResultData(ResultType.STRAIN, step, component);
        });
      });
    }
    
    // 继续更新进度
    if (analysis.status === AnalysisStatus.RUNNING) {
      setTimeout(() => updateMockAnalysisProgress(analysisId), 1000);
    }
  };
  
  // 实际服务实现
  const service: IKratosService = {
    createModel: async (kratosModelId: string, name: string) => {
      console.log(`创建Kratos模型: ${name}, 基于模型ID: ${kratosModelId}`);
      
      if (useMockApi) {
        // 模拟创建模型延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 创建模拟模型
        const modelId = `model_${Date.now()}`;
        modelCache[modelId] = {
          id: modelId,
          name,
          kratosModelId,
          materials: [],
          boundaryConditions: [],
          analysisParams: { ...defaultAnalysisParams }
        };
        
        return modelId;
      } else {
        try {
          // 调用Kratos API创建模型
          const response = await axios.post(`${kratosApiUrl}/create-model`, {
            kratosModelId,
            name
          });
          
          return response.data.modelId;
        } catch (error) {
          console.error('创建Kratos模型失败:', error);
          throw new Error('创建Kratos模型失败');
        }
      }
    },
    
    setAnalysisParams: async (modelId: string, params: Partial<AnalysisParams>) => {
      console.log(`设置模型 ${modelId} 的分析参数:`, params);
      
      if (useMockApi) {
        // 获取缓存的模型
        const model = modelCache[modelId];
        if (!model) {
          throw new Error(`未找到模型 ${modelId}`);
        }
        
        // 更新分析参数
        model.analysisParams = {
          ...model.analysisParams,
          ...params
        };
      } else {
        try {
          // 调用Kratos API设置分析参数
          await axios.post(`${kratosApiUrl}/set-analysis-params/${modelId}`, params);
        } catch (error) {
          console.error('设置分析参数失败:', error);
          throw new Error('设置分析参数失败');
        }
      }
    },
    
    setMaterial: async (modelId: string, material: MaterialParams) => {
      console.log(`为模型 ${modelId} 设置材料:`, material);
      
      if (useMockApi) {
        // 获取缓存的模型
        const model = modelCache[modelId];
        if (!model) {
          throw new Error(`未找到模型 ${modelId}`);
        }
        
        // 添加材料
        model.materials.push(material);
      } else {
        try {
          // 调用Kratos API设置材料
          await axios.post(`${kratosApiUrl}/set-material/${modelId}`, material);
        } catch (error) {
          console.error('设置材料失败:', error);
          throw new Error('设置材料失败');
        }
      }
    },
    
    addBoundaryCondition: async (modelId: string, bc: BoundaryCondition) => {
      console.log(`为模型 ${modelId} 添加边界条件:`, bc);
      
      if (useMockApi) {
        // 获取缓存的模型
        const model = modelCache[modelId];
        if (!model) {
          throw new Error(`未找到模型 ${modelId}`);
        }
        
        // 添加边界条件
        model.boundaryConditions.push(bc);
      } else {
        try {
          // 调用Kratos API添加边界条件
          await axios.post(`${kratosApiUrl}/add-boundary-condition/${modelId}`, bc);
        } catch (error) {
          console.error('添加边界条件失败:', error);
          throw new Error('添加边界条件失败');
        }
      }
    },
    
    runAnalysis: async (modelId: string) => {
      console.log(`运行模型 ${modelId} 的分析`);
      
      if (useMockApi) {
        // 获取缓存的模型
        const model = modelCache[modelId];
        if (!model) {
          throw new Error(`未找到模型 ${modelId}`);
        }
        
        // 创建分析ID
        const analysisId = `analysis_${Date.now()}`;
        
        // 创建时间步列表
        const steps = [];
        for (let i = 0; i <= model.analysisParams.timeSteps; i++) {
          steps.push(i * model.analysisParams.timeStepSize);
        }
        
        // 创建分析记录
        analysisCache[analysisId] = {
          modelId,
          status: AnalysisStatus.RUNNING,
          progress: 0,
          startTime: Date.now(),
          results: {},
          steps
        };
        
        // 开始更新分析进度
        setTimeout(() => updateMockAnalysisProgress(analysisId), 1000);
        
        return analysisId;
      } else {
        try {
          // 调用Kratos API运行分析
          const response = await axios.post(`${kratosApiUrl}/run-analysis/${modelId}`);
          return response.data.analysisId;
        } catch (error) {
          console.error('运行分析失败:', error);
          throw new Error('运行分析失败');
        }
      }
    },
    
    getAnalysisProgress: async (analysisId: string) => {
      console.log(`获取分析 ${analysisId} 的进度`);
      
      if (useMockApi) {
        // 获取缓存的分析
        const analysis = analysisCache[analysisId];
        if (!analysis) {
          throw new Error(`未找到分析 ${analysisId}`);
        }
        
        // 计算已用时间
        const timeElapsed = (Date.now() - analysis.startTime) / 1000;
        
        // 计算剩余时间
        const timeRemaining = analysis.progress < 100 ? 
          (timeElapsed / analysis.progress) * (100 - analysis.progress) : 0;
        
        // 返回进度信息
        return {
          status: analysis.status,
          progress: analysis.progress,
          currentStep: Math.floor((analysis.progress / 100) * analysis.steps.length),
          totalSteps: analysis.steps.length,
          currentIteration: Math.floor(Math.random() * 5) + 1,
          residualNorm: Math.pow(10, -Math.floor(analysis.progress / 10) - 1),
          timeElapsed,
          timeRemaining,
          message: analysis.status === AnalysisStatus.COMPLETED ? 
            '分析已完成' : `分析进行中... ${analysis.progress.toFixed(1)}%`
        };
      } else {
        try {
          // 调用Kratos API获取分析进度
          const response = await axios.get(`${kratosApiUrl}/analysis-progress/${analysisId}`);
          return response.data;
        } catch (error) {
          console.error('获取分析进度失败:', error);
          throw new Error('获取分析进度失败');
        }
      }
    },
    
    getResults: async (analysisId: string, resultType: ResultType, step: number) => {
      console.log(`获取分析 ${analysisId} 的 ${resultType} 结果，步骤: ${step}`);
      
      if (useMockApi) {
        // 获取缓存的分析
        const analysis = analysisCache[analysisId];
        if (!analysis) {
          throw new Error(`未找到分析 ${analysisId}`);
        }
        
        // 检查分析是否完成
        if (analysis.status !== AnalysisStatus.COMPLETED) {
          throw new Error(`分析 ${analysisId} 尚未完成`);
        }
        
        // 获取结果
        const results = analysis.results[resultType]?.[step];
        if (!results) {
          throw new Error(`未找到分析 ${analysisId} 的 ${resultType} 结果，步骤: ${step}`);
        }
        
        return results;
      } else {
        try {
          // 调用Kratos API获取分析结果
          const response = await axios.get(`${kratosApiUrl}/results/${analysisId}`, {
            params: {
              resultType,
              step
            }
          });
          
          return response.data;
        } catch (error) {
          console.error('获取分析结果失败:', error);
          throw new Error('获取分析结果失败');
        }
      }
    },
    
    exportResults: async (analysisId: string, format: 'vtk' | 'json' | 'csv') => {
      console.log(`导出分析 ${analysisId} 的结果为 ${format} 格式`);
      
      if (useMockApi) {
        // 模拟导出延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 返回模拟的Blob数据
        return new Blob(['模拟导出数据'], { type: 'application/octet-stream' });
      } else {
        try {
          // 调用Kratos API导出结果
          const response = await axios.get(`${kratosApiUrl}/export-results/${analysisId}`, {
            params: { format },
            responseType: 'blob'
          });
          
          return response.data;
        } catch (error) {
          console.error('导出结果失败:', error);
          throw new Error('导出结果失败');
        }
      }
    },
    
    getTimeSteps: async (analysisId: string) => {
      console.log(`获取分析 ${analysisId} 的时间步列表`);
      
      if (useMockApi) {
        // 获取缓存的分析
        const analysis = analysisCache[analysisId];
        if (!analysis) {
          throw new Error(`未找到分析 ${analysisId}`);
        }
        
        return analysis.steps;
      } else {
        try {
          // 调用Kratos API获取时间步列表
          const response = await axios.get(`${kratosApiUrl}/time-steps/${analysisId}`);
          return response.data.steps;
        } catch (error) {
          console.error('获取时间步列表失败:', error);
          throw new Error('获取时间步列表失败');
        }
      }
    },
    
    getAvailableResultTypes: async (analysisId: string) => {
      console.log(`获取分析 ${analysisId} 的可用结果类型`);
      
      if (useMockApi) {
        // 返回模拟的结果类型
        return [
          ResultType.DISPLACEMENT,
          ResultType.STRESS,
          ResultType.STRAIN,
          ResultType.PORE_PRESSURE
        ];
      } else {
        try {
          // 调用Kratos API获取可用结果类型
          const response = await axios.get(`${kratosApiUrl}/result-types/${analysisId}`);
          return response.data.resultTypes;
        } catch (error) {
          console.error('获取可用结果类型失败:', error);
          throw new Error('获取可用结果类型失败');
        }
      }
    },
    
    getResultStatistics: async (analysisId: string, resultType: ResultType) => {
      console.log(`获取分析 ${analysisId} 的 ${resultType} 结果统计信息`);
      
      if (useMockApi) {
        // 获取缓存的分析
        const analysis = analysisCache[analysisId];
        if (!analysis) {
          throw new Error(`未找到分析 ${analysisId}`);
        }
        
        // 检查分析是否完成
        if (analysis.status !== AnalysisStatus.COMPLETED) {
          throw new Error(`分析 ${analysisId} 尚未完成`);
        }
        
        // 获取结果
        const results = analysis.results[resultType];
        if (!results) {
          throw new Error(`未找到分析 ${analysisId} 的 ${resultType} 结果`);
        }
        
        // 计算统计信息
        let min = Infinity;
        let max = -Infinity;
        let sum = 0;
        let count = 0;
        
        const steps = Object.keys(results).map(Number);
        
        steps.forEach(step => {
          const result = results[step];
          min = Math.min(min, result.min);
          max = Math.max(max, result.max);
          sum += result.average;
          count++;
        });
        
        return {
          min,
          max,
          average: sum / count,
          steps
        };
      } else {
        try {
          // 调用Kratos API获取结果统计信息
          const response = await axios.get(`${kratosApiUrl}/result-statistics/${analysisId}`, {
            params: { resultType }
          });
          
          return response.data;
        } catch (error) {
          console.error('获取结果统计信息失败:', error);
          throw new Error('获取结果统计信息失败');
        }
      }
    }
  };
  
  return service;
}; 