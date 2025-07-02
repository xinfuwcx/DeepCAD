/**
 * 建模-网格-分析流水线服务
 * 
 * 整合chili3d、netgen和kratos服务，提供完整的工作流程
 */

import { IChili3dInstance, createChili3dService } from './chili3dService';
import { INetgenService, createNetgenService, MeshQualityParams } from './netgenService';
import { IKratosService, createKratosService, AnalysisParams, MaterialParams, BoundaryCondition } from './kratosService';

// 流水线状态
export enum PipelineStatus {
  IDLE = 'idle',                 // 空闲
  MODELING = 'modeling',         // 建模中
  MESHING = 'meshing',           // 网格划分中
  ANALYZING = 'analyzing',       // 分析中
  COMPLETED = 'completed',       // 已完成
  ERROR = 'error'                // 错误
}

// 流水线阶段
export enum PipelineStage {
  GEOMETRY = 'geometry',         // 几何建模
  MESH = 'mesh',                 // 网格划分
  ANALYSIS = 'analysis',         // 分析设置
  RESULTS = 'results'            // 结果查看
}

// 流水线进度
export interface PipelineProgress {
  status: PipelineStatus;        // 当前状态
  stage: PipelineStage;          // 当前阶段
  progress: number;              // 进度百分比
  message: string;               // 状态消息
  error?: string;                // 错误信息
}

// 流水线参数
export interface PipelineParams {
  // 几何参数
  geometryParams: {
    modelName: string;           // 模型名称
    excavationDepth: number;     // 开挖深度
    excavationWidth: number;     // 开挖宽度
    excavationLength: number;    // 开挖长度
    soilLayers: {                // 土层
      thickness: number;         // 厚度
      material: string;          // 材料
    }[];
    supportStructures: {         // 支护结构
      type: string;              // 类型
      depth: number;             // 深度
      thickness: number;         // 厚度
      material: string;          // 材料
    }[];
  };
  
  // 网格参数
  meshParams: Partial<MeshQualityParams>;
  
  // 分析参数
  analysisParams: Partial<AnalysisParams>;
  
  // 材料参数
  materials: MaterialParams[];
  
  // 边界条件
  boundaryConditions: BoundaryCondition[];
}

// 流水线结果
export interface PipelineResult {
  geometryId: string;            // 几何ID
  meshId: string;                // 网格ID
  modelId: string;               // 模型ID
  analysisId: string;            // 分析ID
}

// 建模流水线服务接口
export interface IModelingPipelineService {
  // 初始化流水线
  initialize(): Promise<void>;
  
  // 运行完整流水线
  runPipeline(params: PipelineParams): Promise<PipelineResult>;
  
  // 仅运行几何建模阶段
  runGeometryStage(geometryParams: PipelineParams['geometryParams']): Promise<string>;
  
  // 仅运行网格划分阶段
  runMeshStage(geometryId: string, meshParams: Partial<MeshQualityParams>): Promise<string>;
  
  // 仅运行分析阶段
  runAnalysisStage(
    meshId: string, 
    analysisParams: Partial<AnalysisParams>,
    materials: MaterialParams[],
    boundaryConditions: BoundaryCondition[]
  ): Promise<{modelId: string, analysisId: string}>;
  
  // 获取当前流水线进度
  getProgress(): PipelineProgress;
  
  // 取消当前流水线
  cancel(): Promise<void>;
  
  // 获取服务实例
  getServices(): {
    chili3d: IChili3dInstance;
    netgen: INetgenService;
    kratos: IKratosService;
  };
}

/**
 * 创建建模流水线服务
 */
export const createModelingPipelineService = (): IModelingPipelineService => {
  // 创建各个服务
  const chili3d = createChili3dService();
  const netgen = createNetgenService(chili3d);
  const kratos = createKratosService();
  
  // 流水线状态
  let status: PipelineStatus = PipelineStatus.IDLE;
  let stage: PipelineStage = PipelineStage.GEOMETRY;
  let progress = 0;
  let message = '准备就绪';
  let error: string | undefined = undefined;
  
  // 当前流水线结果
  let currentResult: Partial<PipelineResult> = {};
  
  // 取消标志
  let isCancelled = false;
  
  // 更新进度
  const updateProgress = (
    newStatus: PipelineStatus, 
    newStage: PipelineStage, 
    newProgress: number, 
    newMessage: string,
    newError?: string
  ) => {
    status = newStatus;
    stage = newStage;
    progress = newProgress;
    message = newMessage;
    error = newError;
    
    console.log(`流水线进度: ${status} - ${stage} - ${progress}% - ${message}`);
    if (error) {
      console.error(`流水线错误: ${error}`);
    }
  };
  
  // 实际服务实现
  const service: IModelingPipelineService = {
    initialize: async () => {
      // 重置状态
      status = PipelineStatus.IDLE;
      stage = PipelineStage.GEOMETRY;
      progress = 0;
      message = '准备就绪';
      error = undefined;
      currentResult = {};
      isCancelled = false;
      
      // 初始化各服务
      await chili3d.initialize();
      
      updateProgress(PipelineStatus.IDLE, PipelineStage.GEOMETRY, 0, '流水线已初始化');
    },
    
    runPipeline: async (params: PipelineParams) => {
      // 重置状态
      isCancelled = false;
      currentResult = {};
      
      try {
        // 运行几何建模阶段
        updateProgress(PipelineStatus.MODELING, PipelineStage.GEOMETRY, 0, '开始几何建模');
        const geometryId = await service.runGeometryStage(params.geometryParams);
        
        // 检查是否取消
        if (isCancelled) {
          throw new Error('流水线已取消');
        }
        
        // 运行网格划分阶段
        updateProgress(PipelineStatus.MESHING, PipelineStage.MESH, 25, '开始网格划分');
        const meshId = await service.runMeshStage(geometryId, params.meshParams);
        
        // 检查是否取消
        if (isCancelled) {
          throw new Error('流水线已取消');
        }
        
        // 运行分析阶段
        updateProgress(PipelineStatus.ANALYZING, PipelineStage.ANALYSIS, 50, '开始分析设置');
        const { modelId, analysisId } = await service.runAnalysisStage(
          meshId,
          params.analysisParams,
          params.materials,
          params.boundaryConditions
        );
        
        // 检查是否取消
        if (isCancelled) {
          throw new Error('流水线已取消');
        }
        
        // 更新状态为已完成
        updateProgress(PipelineStatus.COMPLETED, PipelineStage.RESULTS, 100, '流水线已完成');
        
        // 返回完整结果
        const result: PipelineResult = {
          geometryId,
          meshId,
          modelId,
          analysisId
        };
        
        currentResult = result;
        return result;
      } catch (err) {
        // 更新错误状态
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        updateProgress(PipelineStatus.ERROR, stage, progress, '流水线失败', errorMessage);
        throw err;
      }
    },
    
    runGeometryStage: async (geometryParams: PipelineParams['geometryParams']) => {
      try {
        updateProgress(PipelineStatus.MODELING, PipelineStage.GEOMETRY, 5, '创建基本几何');
        
        // 创建新模型
        await chili3d.createNewModel(geometryParams.modelName);
        
        // 创建土层
        updateProgress(PipelineStatus.MODELING, PipelineStage.GEOMETRY, 10, '创建土层');
        let currentDepth = 0;
        for (const layer of geometryParams.soilLayers) {
          await chili3d.createSoilLayer({
            name: `土层_${currentDepth}_${layer.material}`,
            top: -currentDepth,
            bottom: -(currentDepth + layer.thickness),
            width: geometryParams.excavationWidth * 3, // 土层宽度大于开挖宽度
            length: geometryParams.excavationLength * 3, // 土层长度大于开挖长度
            material: layer.material
          });
          
          currentDepth += layer.thickness;
        }
        
        // 创建开挖区域
        updateProgress(PipelineStatus.MODELING, PipelineStage.GEOMETRY, 15, '创建开挖区域');
        await chili3d.createExcavation({
          name: '开挖区域',
          depth: geometryParams.excavationDepth,
          width: geometryParams.excavationWidth,
          length: geometryParams.excavationLength
        });
        
        // 创建支护结构
        updateProgress(PipelineStatus.MODELING, PipelineStage.GEOMETRY, 20, '创建支护结构');
        for (const support of geometryParams.supportStructures) {
          switch (support.type) {
            case 'diaphragm_wall':
              await chili3d.createDiaphragmWall({
                name: `地下连续墙_${support.material}`,
                depth: support.depth,
                thickness: support.thickness,
                width: geometryParams.excavationWidth + 2, // 略大于开挖宽度
                material: support.material
              });
              break;
              
            case 'pile_wall':
              await chili3d.createPileWall({
                name: `桩墙_${support.material}`,
                depth: support.depth,
                diameter: support.thickness,
                spacing: support.thickness * 2,
                width: geometryParams.excavationWidth + 2, // 略大于开挖宽度
                material: support.material
              });
              break;
              
            default:
              console.warn(`不支持的支护结构类型: ${support.type}`);
          }
        }
        
        // 保存模型
        updateProgress(PipelineStatus.MODELING, PipelineStage.GEOMETRY, 23, '保存几何模型');
        const geometryId = await chili3d.saveModel();
        
        // 更新结果
        currentResult.geometryId = geometryId;
        
        return geometryId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '几何建模失败';
        updateProgress(PipelineStatus.ERROR, PipelineStage.GEOMETRY, progress, '几何建模失败', errorMessage);
        throw err;
      }
    },
    
    runMeshStage: async (geometryId: string, meshParams: Partial<MeshQualityParams>) => {
      try {
        // 生成网格
        updateProgress(PipelineStatus.MESHING, PipelineStage.MESH, 30, '生成网格');
        const meshResult = await netgen.generateMesh(geometryId, meshParams);
        
        // 检查是否取消
        if (isCancelled) {
          throw new Error('流水线已取消');
        }
        
        // 优化网格
        updateProgress(PipelineStatus.MESHING, PipelineStage.MESH, 40, '优化网格');
        await netgen.optimizeMesh(meshResult.meshId, meshParams.optimizeSteps || 3);
        
        // 导出为Kratos格式
        updateProgress(PipelineStatus.MESHING, PipelineStage.MESH, 45, '导出网格为Kratos格式');
        await netgen.exportToKratos(meshResult.meshId);
        
        // 更新结果
        currentResult.meshId = meshResult.meshId;
        
        return meshResult.meshId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '网格划分失败';
        updateProgress(PipelineStatus.ERROR, PipelineStage.MESH, progress, '网格划分失败', errorMessage);
        throw err;
      }
    },
    
    runAnalysisStage: async (
      meshId: string,
      analysisParams: Partial<AnalysisParams>,
      materials: MaterialParams[],
      boundaryConditions: BoundaryCondition[]
    ) => {
      try {
        // 从网格创建Kratos模型
        updateProgress(PipelineStatus.ANALYZING, PipelineStage.ANALYSIS, 55, '创建分析模型');
        const kratosModelId = await netgen.exportToKratos(meshId);
        const modelId = await kratos.createModel(kratosModelId, `model_${meshId}`);
        
        // 检查是否取消
        if (isCancelled) {
          throw new Error('流水线已取消');
        }
        
        // 设置分析参数
        updateProgress(PipelineStatus.ANALYZING, PipelineStage.ANALYSIS, 60, '设置分析参数');
        await kratos.setAnalysisParams(modelId, analysisParams);
        
        // 设置材料
        updateProgress(PipelineStatus.ANALYZING, PipelineStage.ANALYSIS, 65, '设置材料参数');
        for (const material of materials) {
          await kratos.setMaterial(modelId, material);
        }
        
        // 设置边界条件
        updateProgress(PipelineStatus.ANALYZING, PipelineStage.ANALYSIS, 70, '设置边界条件');
        for (const bc of boundaryConditions) {
          await kratos.addBoundaryCondition(modelId, bc);
        }
        
        // 检查是否取消
        if (isCancelled) {
          throw new Error('流水线已取消');
        }
        
        // 运行分析
        updateProgress(PipelineStatus.ANALYZING, PipelineStage.ANALYSIS, 75, '运行分析');
        const analysisId = await kratos.runAnalysis(modelId);
        
        // 监控分析进度
        let analysisCompleted = false;
        while (!analysisCompleted && !isCancelled) {
          // 获取分析进度
          const analysisProgress = await kratos.getAnalysisProgress(analysisId);
          
          // 更新总进度 (75-95%)
          const totalProgress = 75 + (analysisProgress.progress * 0.2);
          updateProgress(
            PipelineStatus.ANALYZING, 
            PipelineStage.ANALYSIS, 
            totalProgress, 
            `分析进行中: ${analysisProgress.message}`
          );
          
          // 检查是否完成
          if (analysisProgress.status === 'completed') {
            analysisCompleted = true;
          } else {
            // 等待一段时间再检查
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // 检查是否取消
        if (isCancelled) {
          throw new Error('流水线已取消');
        }
        
        // 更新结果
        currentResult.modelId = modelId;
        currentResult.analysisId = analysisId;
        
        return { modelId, analysisId };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '分析失败';
        updateProgress(PipelineStatus.ERROR, PipelineStage.ANALYSIS, progress, '分析失败', errorMessage);
        throw err;
      }
    },
    
    getProgress: () => {
      return {
        status,
        stage,
        progress,
        message,
        error
      };
    },
    
    cancel: async () => {
      isCancelled = true;
      updateProgress(PipelineStatus.IDLE, stage, progress, '流水线已取消');
      return Promise.resolve();
    },
    
    getServices: () => {
      return {
        chili3d,
        netgen,
        kratos
      };
    }
  };
  
  return service;
}; 