/**
 * 3号计算专家 - 主界面集成接口
 * 为0号架构师提供标准化的接入接口
 * 包含所有计算服务组件的导出和配置
 */

import React from 'react';
import * as THREE from 'three';

// 主要组件导出
export { default as ComputationControlPanel } from './ComputationControlPanel';
export { default as PhysicsAIEmbeddedPanel } from './PhysicsAIEmbeddedPanel_SIMPLIFIED';

// 类型定义导出
export type { 
  ComputationStatus,
  ComputationTask 
} from './ComputationControlPanel';

// 服务导出
export { default as meshQualityService } from '../services/meshQualityService';
export { default as geometryToMeshService } from '../services/geometryToMeshService';
export { geometryArchitecture } from '../services/GeometryArchitectureService';

// ======================== 0号架构师集成接口 ========================

/**
 * 3号专家计算模块配置接口
 */
export interface ComputationModuleConfig {
  // 基础配置
  moduleId: string;
  moduleName: string;
  version: string;
  
  // Three.js场景配置
  scene?: THREE.Scene;
  
  // 性能配置
  performance: {
    enableGPUMonitoring: boolean;
    enableQualityFeedback: boolean;
    maxComputeUnits: number;
    memoryLimit: number; // MB
  };
  
  // 2号专家协作配置
  geometryCollaboration: {
    enableAutoGeometryImport: boolean;
    enableQualityFeedback: boolean;
    meshQualityThreshold: number; // 0-1
  };
  
  // UI配置
  ui: {
    theme: 'dark' | 'light';
    enableAdvancedControls: boolean;
    showPerformanceMetrics: boolean;
    showQualityAnalysis: boolean;
  };
}

/**
 * 计算模块状态接口
 */
export interface ComputationModuleState {
  isInitialized: boolean;
  isComputing: boolean;
  currentTask: string | null;
  progress: number;
  error: string | null;
  
  // 性能状态
  performance: {
    gpuUsage: number;
    memoryUsage: number;
    fps: number;
  };
  
  // 质量状态
  quality: {
    meshQualityScore: number;
    criticalIssues: number;
    lastOptimization: Date | null;
  };
}

/**
 * 主要集成接口类
 */
export class ComputationModuleIntegration {
  private config: ComputationModuleConfig;
  private state: ComputationModuleState;
  private callbacks: Map<string, Function> = new Map();

  constructor(config: ComputationModuleConfig) {
    this.config = config;
    this.state = {
      isInitialized: false,
      isComputing: false,
      currentTask: null,
      progress: 0,
      error: null,
      performance: { gpuUsage: 0, memoryUsage: 0, fps: 0 },
      quality: { meshQualityScore: 0, criticalIssues: 0, lastOptimization: null }
    };
  }

  /**
   * 初始化计算模块
   */
  async initialize(): Promise<void> {
    try {
      console.log(`🔧 初始化3号计算专家模块: ${this.config.moduleName}`);
      
      // 初始化服务
      await this.initializeServices();
      
      // 设置性能监控
      if (this.config.performance.enableGPUMonitoring) {
        await this.setupPerformanceMonitoring();
      }
      
      // 设置几何协作
      if (this.config.geometryCollaboration.enableAutoGeometryImport) {
        await this.setupGeometryCollaboration();
      }
      
      this.state.isInitialized = true;
      this.notifyStateChange('initialized');
      
      console.log(`✅ 3号计算专家模块初始化完成`);
    } catch (error) {
      this.state.error = `初始化失败: ${error}`;
      console.error('❌ 计算模块初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取React组件配置
   */
  getReactComponents(): {
    ComputationControlPanel: React.ComponentType<any>;
    PhysicsAIPanel: React.ComponentType<any>;
    props: Record<string, any>;
  } {
    return {
      ComputationControlPanel: require('./ComputationControlPanel').default,
      PhysicsAIPanel: require('./PhysicsAIEmbeddedPanel_SIMPLIFIED').default,
      props: {
        scene: this.config.scene,
        onStatusChange: (status: ComputationStatus) => this.handleStatusChange(status),
        onResultsUpdate: (results: any) => this.handleResultsUpdate(results),
        onError: (error: string) => this.handleError(error),
        
        // 性能监控配置
        enablePerformanceMonitoring: this.config.performance.enableGPUMonitoring,
        
        // 质量分析配置
        enableQualityAnalysis: this.config.ui.showQualityAnalysis,
        qualityThreshold: this.config.geometryCollaboration.meshQualityThreshold,
        
        // UI配置
        theme: this.config.ui.theme,
        showAdvancedControls: this.config.ui.enableAdvancedControls
      }
    };
  }

  /**
   * 启动计算任务
   */
  async startComputation(taskType: ComputationTask, parameters?: any): Promise<void> {
    if (!this.state.isInitialized) {
      throw new Error('计算模块未初始化');
    }

    try {
      this.state.isComputing = true;
      this.state.currentTask = taskType;
      this.state.progress = 0;
      this.state.error = null;
      
      this.notifyStateChange('computation_started', { taskType, parameters });
      
      // 这里会调用实际的计算逻辑
      console.log(`🚀 启动计算任务: ${taskType}`);
      
    } catch (error) {
      this.state.error = `计算失败: ${error}`;
      this.state.isComputing = false;
      throw error;
    }
  }

  /**
   * 注册状态变化回调
   */
  onStateChange(event: string, callback: Function): void {
    this.callbacks.set(event, callback);
  }

  /**
   * 获取当前状态
   */
  getState(): ComputationModuleState {
    return { ...this.state };
  }

  /**
   * 获取配置信息
   */
  getConfig(): ComputationModuleConfig {
    return { ...this.config };
  }

  // ======================== 私有方法 ========================

  private async initializeServices(): Promise<void> {
    // 初始化计算服务
    await import('../services/deepExcavationSolver');
    await import('../services/stressCloudGPURenderer');
    await import('../services/meshQualityService');
  }

  private async setupPerformanceMonitoring(): Promise<void> {
    const { WebGPUPerformanceMonitor } = await import('../services/webgpuPerformanceMonitor');
    // 设置性能监控逻辑
  }

  private async setupGeometryCollaboration(): Promise<void> {
    // 设置与2号专家的协作
    const { geometryArchitecture } = await import('../services/GeometryArchitectureService');
    // 配置几何数据自动导入
  }

  private handleStatusChange(status: ComputationStatus): void {
    this.notifyStateChange('status_changed', status);
  }

  private handleResultsUpdate(results: any): void {
    this.notifyStateChange('results_updated', results);
  }

  private handleError(error: string): void {
    this.state.error = error;
    this.notifyStateChange('error', error);
  }

  private notifyStateChange(event: string, data?: any): void {
    const callback = this.callbacks.get(event);
    if (callback) {
      callback(data);
    }
  }
}

// ======================== 便捷函数导出 ========================

/**
 * 创建计算模块实例
 */
export function createComputationModule(config: Partial<ComputationModuleConfig>): ComputationModuleIntegration {
  const defaultConfig: ComputationModuleConfig = {
    moduleId: 'computation-expert-3',
    moduleName: '3号计算专家模块',
    version: '1.0.0',
    
    performance: {
      enableGPUMonitoring: true,
      enableQualityFeedback: true,
      maxComputeUnits: 64,
      memoryLimit: 4096
    },
    
    geometryCollaboration: {
      enableAutoGeometryImport: true,
      enableQualityFeedback: true,
      meshQualityThreshold: 0.7
    },
    
    ui: {
      theme: 'dark',
      enableAdvancedControls: true,
      showPerformanceMetrics: true,
      showQualityAnalysis: true
    }
  };

  const mergedConfig = { ...defaultConfig, ...config };
  return new ComputationModuleIntegration(mergedConfig);
}

/**
 * 获取所有可用的计算任务类型
 */
export function getAvailableComputationTasks(): ComputationTask[] {
  return [
    'soil_structure_coupling',
    'construction_stage_analysis',
    'safety_assessment',
    'stress_visualization',
    'deformation_animation',
    'flow_field_visualization',
    'comprehensive_analysis'
  ];
}

/**
 * 验证计算模块配置
 */
export function validateComputationConfig(config: ComputationModuleConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.moduleId) errors.push('moduleId是必需的');
  if (!config.moduleName) errors.push('moduleName是必需的');
  if (config.performance.memoryLimit < 1024) errors.push('内存限制不能小于1GB');
  if (config.geometryCollaboration.meshQualityThreshold < 0 || 
      config.geometryCollaboration.meshQualityThreshold > 1) {
    errors.push('网格质量阈值必须在0-1之间');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ======================== 默认导出 ========================

export default {
  ComputationModuleIntegration,
  createComputationModule,
  getAvailableComputationTasks,
  validateComputationConfig
};