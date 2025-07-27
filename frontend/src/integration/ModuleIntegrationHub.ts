/**
 * DeepCAD 模块集成中心
 * 1号架构师 - 为2号几何专家和3号计算专家提供标准化接入接口
 */

// ==================== 模块状态定义 ====================

export type ModuleStatus = 'idle' | 'ready' | 'loading' | 'computing' | 'error' | 'completed';

export interface ModuleState {
  status: ModuleStatus;
  progress: number;
  lastUpdate: number;
  message?: string;
  error?: string;
}

export interface SystemState {
  geometry: ModuleState;
  geology: ModuleState;
  meshing: ModuleState;
  analysis: ModuleState;
  results: ModuleState;
  kratos: ModuleState;
}

// ==================== 数据传输接口 ====================

export interface GeometryData {
  id: string;
  name: string;
  type: 'excavation' | 'support' | 'geology';
  geometry: any; // Three.js geometry
  properties: Record<string, any>;
  timestamp: number;
}

export interface MeshData {
  id: string;
  geometryId: string;
  elements: any[];
  nodes: any[];
  quality: {
    minAngle: number;
    maxAngle: number;
    aspectRatio: number;
  };
  timestamp: number;
}

export interface AnalysisData {
  id: string;
  meshId: string;
  type: 'static' | 'dynamic' | 'nonlinear';
  parameters: Record<string, any>;
  results?: any[];
  timestamp: number;
}

// ==================== 模块集成中心 ====================

class ModuleIntegrationHub {
  private moduleStates: SystemState;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.moduleStates = {
      geometry: { status: 'idle', progress: 0, lastUpdate: Date.now() },
      geology: { status: 'idle', progress: 0, lastUpdate: Date.now() },
      meshing: { status: 'idle', progress: 0, lastUpdate: Date.now() },
      analysis: { status: 'idle', progress: 0, lastUpdate: Date.now() },
      results: { status: 'idle', progress: 0, lastUpdate: Date.now() },
      kratos: { status: 'idle', progress: 0, lastUpdate: Date.now() }
    };
  }

  // ==================== 2号几何专家接口 ====================

  /**
   * 几何建模模块注册
   */
  registerGeometryModule(callbacks: {
    onGeometryCreated?: (data: GeometryData) => void;
    onGeometryUpdated?: (data: GeometryData) => void;
    onGeometryDeleted?: (id: string) => void;
  }) {
    this.addEventListener('geometry:created', callbacks.onGeometryCreated);
    this.addEventListener('geometry:updated', callbacks.onGeometryUpdated);
    this.addEventListener('geometry:deleted', callbacks.onGeometryDeleted);
  }

  /**
   * 地质建模模块注册
   */
  registerGeologyModule(callbacks: {
    onGeologyModeled?: (data: GeometryData) => void;
    onBoreholeProcessed?: (data: any) => void;
    onStratumGenerated?: (data: any) => void;
  }) {
    this.addEventListener('geology:modeled', callbacks.onGeologyModeled);
    this.addEventListener('geology:borehole', callbacks.onBoreholeProcessed);
    this.addEventListener('geology:stratum', callbacks.onStratumGenerated);
  }

  /**
   * 网格生成模块注册
   */
  registerMeshingModule(callbacks: {
    onMeshGenerated?: (data: MeshData) => void;
    onMeshQualityChecked?: (data: any) => void;
    onPhysicalGroupAssigned?: (data: any) => void;
  }) {
    this.addEventListener('mesh:generated', callbacks.onMeshGenerated);
    this.addEventListener('mesh:quality', callbacks.onMeshQualityChecked);
    this.addEventListener('mesh:physicalGroup', callbacks.onPhysicalGroupAssigned);
  }

  // ==================== 3号计算专家接口 ====================

  /**
   * 仿真分析模块注册
   */
  registerAnalysisModule(callbacks: {
    onAnalysisStarted?: (data: AnalysisData) => void;
    onAnalysisProgress?: (progress: number) => void;
    onAnalysisCompleted?: (data: AnalysisData) => void;
    onAnalysisError?: (error: string) => void;
  }) {
    this.addEventListener('analysis:started', callbacks.onAnalysisStarted);
    this.addEventListener('analysis:progress', callbacks.onAnalysisProgress);
    this.addEventListener('analysis:completed', callbacks.onAnalysisCompleted);
    this.addEventListener('analysis:error', callbacks.onAnalysisError);
  }

  /**
   * Kratos求解器集成
   */
  registerKratosModule(callbacks: {
    onKratosReady?: () => void;
    onKratosComputing?: (progress: number) => void;
    onKratosResults?: (results: any) => void;
    onKratosError?: (error: string) => void;
  }) {
    this.addEventListener('kratos:ready', callbacks.onKratosReady);
    this.addEventListener('kratos:computing', callbacks.onKratosComputing);
    this.addEventListener('kratos:results', callbacks.onKratosResults);
    this.addEventListener('kratos:error', callbacks.onKratosError);
  }

  /**
   * 结果处理模块注册
   */
  registerResultsModule(callbacks: {
    onResultsProcessed?: (data: any) => void;
    onVisualizationReady?: (data: any) => void;
    onPostProcessingCompleted?: (data: any) => void;
  }) {
    this.addEventListener('results:processed', callbacks.onResultsProcessed);
    this.addEventListener('results:visualization', callbacks.onVisualizationReady);
    this.addEventListener('results:postProcessing', callbacks.onPostProcessingCompleted);
  }

  // ==================== 状态管理接口 ====================

  /**
   * 更新模块状态
   */
  updateModuleState(module: keyof SystemState, state: Partial<ModuleState>) {
    this.moduleStates[module] = {
      ...this.moduleStates[module],
      ...state,
      lastUpdate: Date.now()
    };

    this.emit('state:updated', { module, state: this.moduleStates[module] });
  }

  /**
   * 获取模块状态
   */
  getModuleState(module: keyof SystemState): ModuleState {
    return this.moduleStates[module];
  }

  /**
   * 获取所有模块状态
   */
  getAllModuleStates(): SystemState {
    return { ...this.moduleStates };
  }

  // ==================== 工作流编排接口 ====================

  /**
   * 启动完整分析工作流
   */
  async startAnalysisWorkflow(config: {
    geometryId: string;
    analysisType: 'static' | 'dynamic' | 'nonlinear';
    parameters: Record<string, any>;
  }) {
    try {
      // 1. 检查几何状态
      this.updateModuleState('geometry', { status: 'loading', progress: 0 });
      
      // 2. 生成网格
      this.updateModuleState('meshing', { status: 'computing', progress: 0 });
      
      // 3. 启动分析
      this.updateModuleState('analysis', { status: 'computing', progress: 0 });
      
      // 4. 处理结果
      this.updateModuleState('results', { status: 'loading', progress: 0 });

      this.emit('workflow:started', config);
    } catch (error) {
      this.emit('workflow:error', error);
    }
  }

  /**
   * 数据管道 - 几何 -> 网格 -> 分析
   */
  createDataPipeline() {
    // 几何更新触发网格重新生成
    this.addEventListener('geometry:updated', (data: GeometryData) => {
      this.emit('mesh:regenerate', data);
    });

    // 网格生成完成触发分析准备
    this.addEventListener('mesh:generated', (data: MeshData) => {
      this.emit('analysis:ready', data);
    });

    // 分析完成触发结果处理
    this.addEventListener('analysis:completed', (data: AnalysisData) => {
      this.emit('results:process', data);
    });
  }

  // ==================== 事件系统 ====================

  addEventListener(event: string, callback?: Function) {
    if (!callback) return;
    
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  // 添加on方法作为addEventListener的别名，保持API一致性
  on(event: string, callback?: Function) {
    this.addEventListener(event, callback);
  }

  removeEventListener(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // 添加off方法作为removeEventListener的别名，保持API一致性
  off(event: string, callback: Function) {
    this.removeEventListener(event, callback);
  }

  emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // ==================== 调试和监控接口 ====================

  /**
   * 获取模块健康状态
   */
  getSystemHealth() {
    const states = this.getAllModuleStates();
    const total = Object.keys(states).length;
    const ready = Object.values(states).filter(s => s.status === 'ready').length;
    const errors = Object.values(states).filter(s => s.status === 'error').length;

    return {
      overall: errors > 0 ? 'error' : ready === total ? 'healthy' : 'partial',
      ready: ready,
      total: total,
      errors: errors,
      details: states
    };
  }

  /**
   * 重置所有模块状态
   */
  resetAllModules() {
    Object.keys(this.moduleStates).forEach(module => {
      this.updateModuleState(module as keyof SystemState, {
        status: 'idle',
        progress: 0,
        message: undefined,
        error: undefined
      });
    });
  }

  /**
   * 导出系统状态快照
   */
  exportSystemSnapshot() {
    return {
      timestamp: Date.now(),
      states: this.getAllModuleStates(),
      health: this.getSystemHealth(),
      version: '1.0.0'
    };
  }
}

// ==================== 单例模式导出 ====================

export const moduleHub = new ModuleIntegrationHub();

// 初始化数据管道
moduleHub.createDataPipeline();

export default ModuleIntegrationHub;