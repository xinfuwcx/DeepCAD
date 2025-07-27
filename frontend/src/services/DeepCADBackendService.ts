/**
 * DeepCAD后端服务连接 - 2号几何专家与3号计算专家协调接口
 * 集成3号专家的完整计算系统，提供统一的前端API
 * 基于PyVista + Three.js黄金架构
 */

import * as THREE from 'three';

// 3号计算专家定义的几何建模输入接口
interface GeometryModelingInput {
  excavation: { 
    geometry: Float32Array; 
    volume: number; 
    stages: Array<{
      id: string;
      depth: number;
      geometry: Float32Array;
      duration: number;
    }>; 
  };
  retainingStructure: { 
    wallGeometry: Float32Array; 
    supportGeometry: Float32Array;
    material: {
      concrete: { strength: number; elasticity: number; };
      steel: { yield: number; elasticity: number; };
    };
  };
  soilLayers: Array<{ 
    layerGeometry: Float32Array; 
    materialId: string;
    properties: {
      density: number;
      cohesion: number;
      friction: number;
      permeability: number;
    };
  }>;
  mesh: { 
    vertices: Float32Array; 
    elements: Uint32Array; 
    boundaries: Uint32Array;
    quality: number;
  };
}

// 3号计算专家定义的Three.js可视化输出接口
interface ThreeJSVisualizationOutput {
  scene: { 
    mainScene: THREE.Scene; 
    overlayScene: THREE.Scene; 
  };
  rendering: { 
    renderer: THREE.WebGLRenderer; 
    updateCallback: Function;
    performanceStats: {
      fps: number;
      drawCalls: number;
      triangles: number;
    };
  };
  materials: { 
    stressVisualizationMaterial: THREE.ShaderMaterial;
    deformationMaterial: THREE.ShaderMaterial;
    flowFieldMaterial: THREE.ShaderMaterial;
  };
  interaction: { 
    mouseHandler: Function; 
    uiUpdateCallback: Function;
    selectionManager: {
      selectObject: (object: THREE.Object3D) => void;
      getSelectedObjects: () => THREE.Object3D[];
      clearSelection: () => void;
    };
  };
}

// 计算结果接口
interface ComputationResult {
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  results?: {
    stress: {
      values: Float32Array;
      maxValue: number;
      minValue: number;
      units: string;
    };
    displacement: {
      values: Float32Array;
      maxValue: number;
      maxLocation: [number, number, number];
      units: string;
    };
    safety: {
      overallFactor: number;
      criticalPoints: Array<{
        location: [number, number, number];
        factor: number;
        type: 'overturning' | 'sliding' | 'bearing';
      }>;
    };
    flow: {
      velocityField: Float32Array;
      pressureField: Float32Array;
      seepageRate: number;
    };
  };
  visualization: ThreeJSVisualizationOutput;
  metadata: {
    computationTime: number;
    memoryUsage: number;
    solverIterations: number;
    convergence: boolean;
  };
}

// 项目配置接口
interface ProjectConfiguration {
  projectId: string;
  name: string;
  description: string;
  geometry: GeometryModelingInput;
  analysis: {
    analysisType: 'static' | 'dynamic' | 'staged_construction' | 'seepage';
    timeSteps: number;
    convergenceTolerance: number;
    maxIterations: number;
    solverType: 'direct' | 'iterative' | 'multigrid';
  };
  postprocessing: {
    stressVisualization: boolean;
    deformationAnimation: boolean;
    flowFieldVisualization: boolean;
    reportGeneration: boolean;
  };
}

class DeepCADBackendService {
  private baseUrl: string;
  private webSocketUrl: string;
  private wsConnection: WebSocket | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(baseUrl = 'http://localhost:8000', webSocketUrl = 'ws://localhost:8000/ws') {
    this.baseUrl = baseUrl;
    this.webSocketUrl = webSocketUrl;
    this.initializeWebSocket();
  }

  // WebSocket连接初始化
  private initializeWebSocket() {
    try {
      this.wsConnection = new WebSocket(this.webSocketUrl);
      
      this.wsConnection.onopen = () => {
        console.log('🔌 WebSocket连接已建立 - 与3号计算专家系统通信正常');
        this.emit('connection', { status: 'connected' });
      };

      this.wsConnection.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      };

      this.wsConnection.onclose = () => {
        console.log('🔌 WebSocket连接已断开 - 尝试重连...');
        setTimeout(() => this.initializeWebSocket(), 5000);
      };

      this.wsConnection.onerror = (error) => {
        console.error('🔌 WebSocket连接错误:', error);
        this.emit('error', { type: 'websocket', error });
      };
    } catch (error) {
      console.error('🔌 WebSocket初始化失败:', error);
    }
  }

  // 处理WebSocket消息
  private handleWebSocketMessage(data: any) {
    switch (data.type) {
      case 'computation_progress':
        this.emit('computationProgress', {
          projectId: data.projectId,
          progress: data.progress,
          stage: data.stage,
          eta: data.eta
        });
        break;
      
      case 'computation_result':
        this.emit('computationComplete', {
          projectId: data.projectId,
          result: data.result as ComputationResult
        });
        break;
      
      case 'visualization_update':
        this.emit('visualizationUpdate', {
          projectId: data.projectId,
          visualization: data.visualization as ThreeJSVisualizationOutput
        });
        break;
      
      case 'error':
        this.emit('error', {
          projectId: data.projectId,
          error: data.error
        });
        break;
    }
  }

  // 事件监听器管理
  public on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // API方法：创建项目
  public async createProject(config: ProjectConfiguration): Promise<{ projectId: string; status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`🎯 项目创建成功 - ID: ${result.projectId}`);
      return result;
    } catch (error) {
      console.error('🚨 项目创建失败:', error);
      throw error;
    }
  }

  // API方法：提交几何数据给3号计算专家
  public async submitGeometryData(projectId: string, geometryData: GeometryModelingInput): Promise<{ status: string; meshId: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects/${projectId}/geometry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          geometryData,
          timestamp: Date.now(),
          source: '2号几何专家'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`🎯 几何数据提交成功 - 网格ID: ${result.meshId}`);
      return result;
    } catch (error) {
      console.error('🚨 几何数据提交失败:', error);
      throw error;
    }
  }

  // API方法：启动计算分析
  public async startComputation(projectId: string, analysisConfig: ProjectConfiguration['analysis']): Promise<{ computationId: string; status: string }> {
    try {
      // 通知3号计算专家开始计算
      const response = await fetch(`${this.baseUrl}/api/projects/${projectId}/compute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisConfig,
          requestedBy: '2号几何专家',
          timestamp: Date.now()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`🚀 计算任务启动成功 - 计算ID: ${result.computationId}`);
      
      // 通过WebSocket监听计算进度
      if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
        this.wsConnection.send(JSON.stringify({
          type: 'subscribe_computation',
          projectId,
          computationId: result.computationId
        }));
      }

      return result;
    } catch (error) {
      console.error('🚨 计算启动失败:', error);
      throw error;
    }
  }

  // API方法：获取计算结果
  public async getComputationResult(projectId: string, computationId: string): Promise<ComputationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects/${projectId}/results/${computationId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 计算结果获取成功');
      return result as ComputationResult;
    } catch (error) {
      console.error('🚨 计算结果获取失败:', error);
      throw error;
    }
  }

  // API方法：获取Three.js可视化数据
  public async getVisualizationData(projectId: string, visualizationType: 'stress' | 'displacement' | 'flow'): Promise<ThreeJSVisualizationOutput> {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects/${projectId}/visualization/${visualizationType}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`🎨 ${visualizationType}可视化数据获取成功`);
      return result as ThreeJSVisualizationOutput;
    } catch (error) {
      console.error('🚨 可视化数据获取失败:', error);
      throw error;
    }
  }

  // API方法：生成专业报告
  public async generateReport(projectId: string, reportConfig: {
    includeStress: boolean;
    includeDisplacement: boolean;
    includeSafety: boolean;
    includeFlow: boolean;
    format: 'pdf' | 'html' | 'docx';
  }): Promise<{ reportUrl: string; reportId: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects/${projectId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportConfig),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`📄 专业报告生成成功 - 报告ID: ${result.reportId}`);
      return result;
    } catch (error) {
      console.error('🚨 报告生成失败:', error);
      throw error;
    }
  }

  // API方法：系统健康检查
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      geometry: boolean;
      computation: boolean;
      visualization: boolean;
      database: boolean;
    };
    performance: {
      responseTime: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  }> {
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}/api/health`);
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      result.performance.responseTime = responseTime;
      
      console.log('💚 系统健康检查完成');
      return result;
    } catch (error) {
      console.error('🚨 系统健康检查失败:', error);
      return {
        status: 'unhealthy',
        services: {
          geometry: false,
          computation: false,
          visualization: false,
          database: false
        },
        performance: {
          responseTime: -1,
          memoryUsage: -1,
          cpuUsage: -1
        }
      };
    }
  }

  // 断开连接
  public disconnect() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.eventListeners.clear();
    console.log('🔌 后端服务连接已断开');
  }
}

// 单例模式导出
export const deepCADBackendService = new DeepCADBackendService();
export default deepCADBackendService;

// 导出接口类型
export type {
  GeometryModelingInput,
  ThreeJSVisualizationOutput,
  ComputationResult,
  ProjectConfiguration
};