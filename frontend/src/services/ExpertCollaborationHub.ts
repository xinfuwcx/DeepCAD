/**
 * 专家协作中心 - 0号架构师设计
 * 实现1号、2号、3号专家之间的无缝数据流和任务协调
 */

import { EventEmitter } from 'events';
import { deepCADArchitecture } from './DeepCADUnifiedArchitecture';
import { geometryArchitecture, GeometryModel } from './GeometryArchitectureService';
import geometryToMeshService, { MeshData } from './geometryToMeshService';

// 协作任务定义
export interface CollaborationTask {
  id: string;
  name: string;
  description: string;
  participants: (1 | 2 | 3)[];
  workflow: WorkflowStep[];
  status: 'pending' | 'active' | 'completed' | 'error';
  startTime?: Date;
  endTime?: Date;
  results?: any;
}

export interface WorkflowStep {
  stepId: string;
  expertId: 1 | 2 | 3;
  action: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  estimated_duration: number; // 分钟
}

// 数据交换格式
export interface ExpertDataPackage {
  id: string;
  sourceExpert: 1 | 2 | 3;
  targetExpert: 1 | 2 | 3;
  dataType: 'geometry' | 'mesh' | 'analysis_results' | 'visualization' | 'feedback';
  payload: any;
  metadata: {
    timestamp: Date;
    version: string;
    checksum: string;
    size: number;
  };
}

class ExpertCollaborationHub extends EventEmitter {
  private activeTasks = new Map<string, CollaborationTask>();
  private dataExchangeQueue: ExpertDataPackage[] = [];
  private expertCapabilities = new Map<number, string[]>();
  private collaborationHistory: CollaborationTask[] = [];

  constructor() {
    super();
    this.initializeExpertCapabilities();
    this.setupDataFlowHandlers();
  }

  private initializeExpertCapabilities(): void {
    // 1号专家能力
    this.expertCapabilities.set(1, [
      'project_location_analysis',
      'gis_visualization', 
      'weather_integration',
      'epic_flight_control',
      'results_visualization',
      'map_overlay_generation'
    ]);

    // 2号专家能力
    this.expertCapabilities.set(2, [
      'geology_modeling',
      'rbf_interpolation',
      'excavation_design',
      'support_structure_design',
      'boolean_operations',
      'cad_processing',
      'geometry_quality_control'
    ]);

    // 3号专家能力  
    this.expertCapabilities.set(3, [
      'mesh_generation',
      'finite_element_analysis',
      'physics_simulation',
      'solver_control',
      'computation_monitoring',
      'gpu_acceleration',
      'result_processing'
    ]);
  }

  private setupDataFlowHandlers(): void {
    // 监听几何建模完成事件
    deepCADArchitecture.on('geometry:model_created', (geometry: GeometryModel) => {
      this.handleGeometryModelCreated(geometry);
    });

    // 监听网格生成完成事件
    deepCADArchitecture.on('computation:mesh_ready', (meshData: MeshData) => {
      this.handleMeshDataReady(meshData);
    });

    // 监听计算结果事件
    deepCADArchitecture.on('computation:results_ready', (results: any) => {
      this.handleComputationResults(results);
    });
  }

  // ============== 预定义协作任务 ==============
  public getStandardWorkflows(): CollaborationTask[] {
    return [
      {
        id: 'full_deepcad_analysis',
        name: '深基坑完整分析流程',
        description: '从项目定位到计算分析到结果可视化的完整工作流',
        participants: [1, 2, 3],
        workflow: [
          {
            stepId: 'project_init',
            expertId: 1,
            action: 'initialize_project_location',
            inputs: ['project_coordinates', 'site_conditions'],
            outputs: ['geo_context', 'weather_data'],
            dependencies: [],
            estimated_duration: 5
          },
          {
            stepId: 'geology_modeling',
            expertId: 2,
            action: 'create_geology_model',
            inputs: ['borehole_data', 'geo_context'],
            outputs: ['geology_geometry'],
            dependencies: ['project_init'],
            estimated_duration: 15
          },
          {
            stepId: 'excavation_design',
            expertId: 2,
            action: 'design_excavation',
            inputs: ['dxf_drawings', 'geology_geometry'],
            outputs: ['excavation_geometry'],
            dependencies: ['geology_modeling'],
            estimated_duration: 20
          },
          {
            stepId: 'support_design',
            expertId: 2,
            action: 'design_support_structure',
            inputs: ['excavation_geometry', 'design_parameters'],
            outputs: ['support_geometry'],
            dependencies: ['excavation_design'],
            estimated_duration: 25
          },
          {
            stepId: 'mesh_generation',
            expertId: 3,
            action: 'generate_fem_mesh',
            inputs: ['combined_geometry'],
            outputs: ['fem_mesh'],
            dependencies: ['support_design'],
            estimated_duration: 10
          },
          {
            stepId: 'fem_analysis',
            expertId: 3,
            action: 'run_fem_analysis',
            inputs: ['fem_mesh', 'boundary_conditions'],
            outputs: ['analysis_results'],
            dependencies: ['mesh_generation'],
            estimated_duration: 30
          },
          {
            stepId: 'results_visualization',
            expertId: 1,
            action: 'visualize_results',
            inputs: ['analysis_results'],
            outputs: ['visualization_data'],
            dependencies: ['fem_analysis'],
            estimated_duration: 10
          }
        ],
        status: 'pending'
      },
      
      {
        id: 'geometry_focus_workflow',
        name: '几何建模专项工作流',
        description: '专注于几何建模和设计优化',
        participants: [2, 3],
        workflow: [
          {
            stepId: 'advanced_geology',
            expertId: 2,
            action: 'advanced_geology_modeling',
            inputs: ['detailed_borehole_data'],
            outputs: ['high_quality_geology'],
            dependencies: [],
            estimated_duration: 30
          },
          {
            stepId: 'geometry_optimization',
            expertId: 2,
            action: 'optimize_geometry_quality',
            inputs: ['high_quality_geology'],
            outputs: ['optimized_geometry'],
            dependencies: ['advanced_geology'],
            estimated_duration: 15
          },
          {
            stepId: 'mesh_quality_check',
            expertId: 3,
            action: 'validate_mesh_readiness',
            inputs: ['optimized_geometry'],
            outputs: ['quality_report'],
            dependencies: ['geometry_optimization'],
            estimated_duration: 5
          }
        ],
        status: 'pending'
      },

      {
        id: 'computation_focus_workflow',
        name: '计算分析专项工作流',
        description: '专注于高性能计算和结果分析',
        participants: [3, 1],
        workflow: [
          {
            stepId: 'advanced_meshing',
            expertId: 3,
            action: 'generate_adaptive_mesh',
            inputs: ['geometry_model'],
            outputs: ['adaptive_mesh'],
            dependencies: [],
            estimated_duration: 20
          },
          {
            stepId: 'multi_physics_analysis',
            expertId: 3,
            action: 'run_coupled_analysis',
            inputs: ['adaptive_mesh'],
            outputs: ['coupled_results'],
            dependencies: ['advanced_meshing'],
            estimated_duration: 60
          },
          {
            stepId: 'advanced_visualization',
            expertId: 1,
            action: 'create_advanced_visualization',
            inputs: ['coupled_results'],
            outputs: ['advanced_viz'],
            dependencies: ['multi_physics_analysis'],
            estimated_duration: 15
          }
        ],
        status: 'pending'
      }
    ];
  }

  // ============== 任务执行管理 ==============
  public async executeCollaborationTask(taskId: string): Promise<void> {
    const workflows = this.getStandardWorkflows();
    const task = workflows.find(w => w.id === taskId);
    
    if (!task) {
      throw new Error(`协作任务未找到: ${taskId}`);
    }

    console.log(`🚀 开始执行协作任务: ${task.name}`);
    
    task.status = 'active';
    task.startTime = new Date();
    this.activeTasks.set(taskId, task);
    
    try {
      await this.executeWorkflowSteps(task);
      
      task.status = 'completed';
      task.endTime = new Date();
      console.log(`✅ 协作任务完成: ${task.name}`);
      
      this.collaborationHistory.push(task);
      this.emit('task:completed', task);
      
    } catch (error) {
      task.status = 'error';
      task.endTime = new Date();
      console.error(`❌ 协作任务失败: ${task.name}`, error);
      
      this.emit('task:error', { task, error });
      throw error;
    } finally {
      this.activeTasks.delete(taskId);
    }
  }

  private async executeWorkflowSteps(task: CollaborationTask): Promise<void> {
    const stepResults = new Map<string, any>();
    
    // 按依赖关系排序执行步骤
    const sortedSteps = this.topologicalSort(task.workflow);
    
    for (const step of sortedSteps) {
      console.log(`🔄 执行步骤: ${step.stepId} (专家${step.expertId})`);
      
      // 收集输入数据
      const inputs = this.collectStepInputs(step, stepResults);
      
      // 执行步骤
      const result = await this.executeWorkflowStep(step, inputs);
      
      // 存储结果
      stepResults.set(step.stepId, result);
      
      // 发送数据给相关专家
      await this.distributeStepResults(step, result);
      
      this.emit('step:completed', { task, step, result });
    }
    
    task.results = Object.fromEntries(stepResults);
  }

  private topologicalSort(steps: WorkflowStep[]): WorkflowStep[] {
    const sorted: WorkflowStep[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (step: WorkflowStep) => {
      if (visiting.has(step.stepId)) {
        throw new Error(`工作流中存在循环依赖: ${step.stepId}`);
      }
      if (visited.has(step.stepId)) {
        return;
      }
      
      visiting.add(step.stepId);
      
      // 访问依赖
      for (const depId of step.dependencies) {
        const depStep = steps.find(s => s.stepId === depId);
        if (depStep) {
          visit(depStep);
        }
      }
      
      visiting.delete(step.stepId);
      visited.add(step.stepId);
      sorted.push(step);
    };
    
    for (const step of steps) {
      visit(step);
    }
    
    return sorted;
  }

  private collectStepInputs(step: WorkflowStep, stepResults: Map<string, any>): any {
    const inputs: any = {};
    
    for (const inputName of step.inputs) {
      // 从之前的步骤结果中查找输入
      for (const [stepId, result] of stepResults.entries()) {
        if (result && result[inputName]) {
          inputs[inputName] = result[inputName];
          break;
        }
      }
    }
    
    return inputs;
  }

  private async executeWorkflowStep(step: WorkflowStep, inputs: any): Promise<any> {
    switch (step.expertId) {
      case 1:
        return await this.executeGISExpertStep(step, inputs);
      case 2:
        return await this.executeGeometryExpertStep(step, inputs);
      case 3:
        return await this.executeComputationExpertStep(step, inputs);
      default:
        throw new Error(`未知专家ID: ${step.expertId}`);
    }
  }

  // ============== 专家步骤执行 ==============
  private async executeGISExpertStep(step: WorkflowStep, inputs: any): Promise<any> {
    const { action } = step;
    
    switch (action) {
      case 'initialize_project_location':
        return {
          geo_context: {
            location: inputs.project_coordinates || { lat: 39.9042, lng: 116.4074 },
            elevation: 50,
            coordinate_system: 'WGS84'
          },
          weather_data: {
            temperature: 20,
            humidity: 60,
            wind_speed: 5
          }
        };
        
      case 'visualize_results':
        return {
          visualization_data: {
            stress_contours: inputs.analysis_results?.stress_field || [],
            deformation_animation: inputs.analysis_results?.displacement_field || [],
            safety_indicators: inputs.analysis_results?.safety_factors || []
          }
        };
        
      default:
        console.warn(`未实现的1号专家动作: ${action}`);
        return {};
    }
  }

  private async executeGeometryExpertStep(step: WorkflowStep, inputs: any): Promise<any> {
    const { action } = step;
    
    switch (action) {
      case 'create_geology_model':
        if (inputs.borehole_data) {
          const geometry = await geometryArchitecture.createGeometryModel(
            'geology',
            inputs.borehole_data,
            { kernelType: 'gaussian', kernelParameter: 1.0 }
          );
          return { geology_geometry: geometry };
        }
        return {};
        
      case 'design_excavation':
        if (inputs.dxf_drawings) {
          const geometry = await geometryArchitecture.createGeometryModel(
            'excavation',
            inputs.dxf_drawings,
            { operation: 'difference' }
          );
          return { excavation_geometry: geometry };
        }
        return {};
        
      case 'design_support_structure':
        const geometry = await geometryArchitecture.createGeometryModel(
          'support',
          'diaphragm_wall',
          { thickness: 0.8, depth: 20, length: 100 }
        );
        return { support_geometry: geometry };
        
      case 'optimize_geometry_quality':
        if (inputs.high_quality_geology) {
          const report = await geometryArchitecture.validateGeometryModel(inputs.high_quality_geology.id);
          return { optimized_geometry: inputs.high_quality_geology, quality_report: report };
        }
        return {};
        
      default:
        console.warn(`未实现的2号专家动作: ${action}`);
        return {};
    }
  }

  private async executeComputationExpertStep(step: WorkflowStep, inputs: any): Promise<any> {
    const { action } = step;
    
    switch (action) {
      case 'generate_fem_mesh':
        if (inputs.combined_geometry) {
          const meshData = await geometryToMeshService.processGeometry(inputs.combined_geometry);
          return { fem_mesh: meshData };
        }
        return {};
        
      case 'run_fem_analysis':
        // 模拟FEM分析结果
        return {
          analysis_results: {
            stress_field: new Float32Array(1000).fill(0).map(() => Math.random() * 100),
            displacement_field: new Float32Array(1000).fill(0).map(() => Math.random() * 0.05),
            safety_factors: {
              overall: 1.8,
              local_min: 1.2,
              critical_zones: []
            }
          }
        };
        
      case 'validate_mesh_readiness':
        return {
          quality_report: {
            ready: true,
            score: 85,
            issues: [],
            recommendations: ['网格质量良好，可以进行计算']
          }
        };
        
      default:
        console.warn(`未实现的3号专家动作: ${action}`);
        return {};
    }
  }

  // ============== 数据分发 ==============
  private async distributeStepResults(step: WorkflowStep, result: any): Promise<void> {
    // 根据输出类型分发给相关专家
    for (const output of step.outputs) {
      const dataPackage: ExpertDataPackage = {
        id: `data_${Date.now()}`,
        sourceExpert: step.expertId,
        targetExpert: this.determineTargetExpert(output),
        dataType: this.determineDataType(output),
        payload: result[output],
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          checksum: this.calculateChecksum(result[output]),
          size: JSON.stringify(result[output]).length
        }
      };
      
      this.dataExchangeQueue.push(dataPackage);
      this.processDataExchange(dataPackage);
    }
  }

  private determineTargetExpert(outputType: string): 1 | 2 | 3 {
    if (outputType.includes('visualization') || outputType.includes('geo')) return 1;
    if (outputType.includes('geometry') || outputType.includes('model')) return 2;
    if (outputType.includes('mesh') || outputType.includes('analysis')) return 3;
    return 1; // 默认
  }

  private determineDataType(outputType: string): ExpertDataPackage['dataType'] {
    if (outputType.includes('geometry')) return 'geometry';
    if (outputType.includes('mesh')) return 'mesh';
    if (outputType.includes('analysis') || outputType.includes('results')) return 'analysis_results';
    if (outputType.includes('visualization')) return 'visualization';
    return 'feedback';
  }

  private calculateChecksum(data: any): string {
    // 简化的校验和计算
    return btoa(JSON.stringify(data)).slice(0, 16);
  }

  private processDataExchange(dataPackage: ExpertDataPackage): void {
    console.log(`📦 数据传输: ${dataPackage.sourceExpert}号→${dataPackage.targetExpert}号 (${dataPackage.dataType})`);
    
    // 触发相应的数据处理事件
    this.emit('data:exchanged', dataPackage);
    
    // 通知目标专家
    deepCADArchitecture.sendToExpert(
      dataPackage.targetExpert,
      `receive_${dataPackage.dataType}`,
      dataPackage.payload
    );
  }

  // ============== 数据流事件处理 ==============
  private async handleGeometryModelCreated(geometry: GeometryModel): Promise<void> {
    console.log(`📐 几何模型创建完成: ${geometry.id}`);
    
    // 自动发送给3号专家进行网格转换
    const dataPackage: ExpertDataPackage = {
      id: `geo_${Date.now()}`,
      sourceExpert: 2,
      targetExpert: 3,
      dataType: 'geometry',
      payload: geometry,
      metadata: {
        timestamp: new Date(),
        version: '1.0.0',
        checksum: this.calculateChecksum(geometry),
        size: geometry.vertices.length + geometry.faces.length
      }
    };
    
    this.processDataExchange(dataPackage);
  }

  private async handleMeshDataReady(meshData: MeshData): Promise<void> {
    console.log(`🕸️ 网格数据准备完成`);
    
    // 发送给1号专家进行可视化准备
    const dataPackage: ExpertDataPackage = {
      id: `mesh_${Date.now()}`,
      sourceExpert: 3,
      targetExpert: 1,
      dataType: 'mesh',
      payload: meshData,
      metadata: {
        timestamp: new Date(),
        version: '1.0.0',
        checksum: this.calculateChecksum(meshData),
        size: meshData.vertices.length + meshData.faces.length
      }
    };
    
    this.processDataExchange(dataPackage);
  }

  private async handleComputationResults(results: any): Promise<void> {
    console.log(`🧮 计算结果准备完成`);
    
    // 发送给1号专家进行结果可视化
    const dataPackage: ExpertDataPackage = {
      id: `results_${Date.now()}`,
      sourceExpert: 3,
      targetExpert: 1,
      dataType: 'analysis_results',
      payload: results,
      metadata: {
        timestamp: new Date(),
        version: '1.0.0',
        checksum: this.calculateChecksum(results),
        size: JSON.stringify(results).length
      }
    };
    
    this.processDataExchange(dataPackage);
  }

  // ============== 公共接口 ==============
  public getActiveCollaborations(): CollaborationTask[] {
    return Array.from(this.activeTasks.values());
  }

  public getCollaborationHistory(): CollaborationTask[] {
    return [...this.collaborationHistory];
  }

  public getExpertCapabilities(expertId: 1 | 2 | 3): string[] {
    return this.expertCapabilities.get(expertId) || [];
  }

  public getDataExchangeQueue(): ExpertDataPackage[] {
    return [...this.dataExchangeQueue];
  }

  public clearDataExchangeQueue(): void {
    this.dataExchangeQueue = [];
  }
}

// 导出单例实例
export const expertCollaborationHub = new ExpertCollaborationHub();
export default expertCollaborationHub;