/**
 * CAE工作流综合Hook
 * 1号架构师 - 几何→网格→计算的完整工作流
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useGeometryStore } from '../geometryStore';
import { useComputationStore } from '../computationStore';
// Performance store not implemented yet
// import { usePerformanceStore } from '../performanceStore';
import { useUIStore } from '../useUIStore';

export interface CAEWorkflowState {
  // 当前阶段
  currentPhase: 'geometry' | 'meshing' | 'computation' | 'results';
  
  // 整体进度
  overallProgress: {
    percentage: number;
    currentTask: string;
    estimatedTimeRemaining?: number;
  };
  
  // 各阶段状态
  phases: {
    geometry: { completed: boolean; quality?: number; duration?: number };
    meshing: { completed: boolean; elementCount?: number; quality?: number };
    computation: { completed: boolean; converged?: boolean; duration?: number };
    results: { completed: boolean; exported?: boolean };
  };
  
  // 数据流状态
  dataFlow: {
    geometryToMesh: boolean;
    meshToComputation: boolean;
    computationToResults: boolean;
  };
  
  // 错误和警告
  issues: Array<{
    phase: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    blocking: boolean;
  }>;
}

export interface CAEWorkflowActions {
  // 工作流控制
  startWorkflow: () => Promise<void>;
  pauseWorkflow: () => void;
  resumeWorkflow: () => void;
  resetWorkflow: () => void;
  
  // 阶段控制
  goToPhase: (phase: CAEWorkflowState['currentPhase']) => void;
  skipPhase: (phase: CAEWorkflowState['currentPhase']) => void;
  
  // 自动化流程
  runFullAnalysis: () => Promise<void>;
  runGeometryToMesh: () => Promise<void>;
  runMeshToComputation: () => Promise<void>;
  
  // 质量检查
  validatePhase: (phase: CAEWorkflowState['currentPhase']) => boolean;
  autoFixIssues: () => Promise<void>;
  
  // 预设工作流
  loadWorkflowPreset: (presetName: string) => void;
  saveWorkflowPreset: (presetName: string) => void;
}

export const useCAEWorkflow = () => {
  // Store状态
  const geometryStore = useGeometryStore();
  const computationStore = useComputationStore();
  const uiStore = useUIStore();
  // 性能监控将在未来版本中集成到各个store中

  // 计算当前阶段
  const currentPhase = useMemo((): CAEWorkflowState['currentPhase'] => {
    if (!geometryStore.data) return 'geometry';
    if (!computationStore.results) return 'computation';
    return 'results';
  }, [geometryStore.data, computationStore.results]);

  // 计算各阶段完成状态
  const phases = useMemo((): CAEWorkflowState['phases'] => ({
    geometry: {
      completed: !!geometryStore.data && geometryStore.status === 'completed',
      quality: geometryStore.quality?.score,
      duration: undefined // 可以从历史记录计算
    },
    meshing: {
      completed: !!geometryStore.data,
      elementCount: geometryStore.data?.elements.length,
      quality: geometryStore.quality?.score
    },
    computation: {
      completed: !!computationStore.results && computationStore.status === 'completed',
      converged: computationStore.results?.globalResults.convergence.converged,
      duration: computationStore.performance.duration
    },
    results: {
      completed: !!computationStore.results,
      exported: false // 需要跟踪导出状态
    }
  }), [geometryStore, computationStore]);

  // 计算整体进度
  const overallProgress = useMemo((): CAEWorkflowState['overallProgress'] => {
    const phaseWeights = { geometry: 30, meshing: 20, computation: 40, results: 10 };
    let totalProgress = 0;
    let currentTask = '';

    if (phases.geometry.completed) {
      totalProgress += phaseWeights.geometry;
    } else if (geometryStore.status === 'running') {
      totalProgress += (geometryStore.progress.percentage / 100) * phaseWeights.geometry;
      currentTask = geometryStore.progress.message || '几何建模中...';
    } else {
      currentTask = '准备几何建模...';
    }

    if (phases.meshing.completed) {
      totalProgress += phaseWeights.meshing;
    } else if (phases.geometry.completed) {
      totalProgress += phaseWeights.meshing; // 网格与几何同步完成
    }

    if (phases.computation.completed) {
      totalProgress += phaseWeights.computation;
    } else if (computationStore.status === 'running') {
      totalProgress += (computationStore.progress.percentage / 100) * phaseWeights.computation;
      currentTask = computationStore.progress.message || '计算分析中...';
    } else if (phases.meshing.completed && !currentTask) {
      currentTask = '准备计算分析...';
    }

    if (phases.results.completed) {
      totalProgress += phaseWeights.results;
    } else if (phases.computation.completed && !currentTask) {
      currentTask = '处理结果...';
    }

    return {
      percentage: Math.round(totalProgress),
      currentTask,
      estimatedTimeRemaining: undefined // 可以基于历史数据计算
    };
  }, [phases, geometryStore, computationStore]);

  // 数据流状态
  const dataFlow = useMemo((): CAEWorkflowState['dataFlow'] => ({
    geometryToMesh: phases.geometry.completed,
    meshToComputation: phases.meshing.completed,
    computationToResults: phases.computation.completed
  }), [phases]);

  // 收集问题和错误
  const issues = useMemo((): CAEWorkflowState['issues'] => {
    const allIssues: CAEWorkflowState['issues'] = [];

    // 几何阶段问题
    geometryStore.errors.forEach(error => {
      allIssues.push({
        phase: 'geometry',
        type: error.level as any,
        message: error.message,
        blocking: error.level === 'error'
      });
    });

    // 计算阶段问题
    computationStore.errors.forEach(error => {
      allIssues.push({
        phase: 'computation',
        type: error.level as any,
        message: error.message,
        blocking: error.level === 'error'
      });
    });

    // 质量检查问题
    if (geometryStore.quality && geometryStore.quality.score < 0.65) {
      allIssues.push({
        phase: 'geometry',
        type: 'warning',
        message: `几何质量较低 (${(geometryStore.quality.score * 100).toFixed(1)}%)`,
        blocking: false
      });
    }

    return allIssues;
  }, [geometryStore.errors, computationStore.errors, geometryStore.quality]);

  // ==================== 工作流控制 ====================

  const startWorkflow = useCallback(async () => {
    try {
      uiStore.setActiveModule('geometry');
      
      if (!phases.geometry.completed) {
        await geometryStore.generateGeometry();
      }
      
      if (phases.geometry.completed && !phases.computation.completed) {
        uiStore.setActiveModule('analysis');
        await computationStore.startComputation();
      }
      
      if (phases.computation.completed) {
        uiStore.setActiveModule('results');
      }
      
    } catch (error) {
      console.error('工作流执行失败:', error);
    }
  }, [phases, geometryStore, computationStore, uiStore]);

  const resetWorkflow = useCallback(() => {
    geometryStore.reset();
    computationStore.reset();
    uiStore.setActiveModule('geometry');
  }, [geometryStore, computationStore, uiStore]);

  const goToPhase = useCallback((phase: CAEWorkflowState['currentPhase']) => {
    const moduleMap = {
      geometry: 'geometry',
      meshing: 'meshing', 
      computation: 'analysis',
      results: 'results'
    } as const;
    
    uiStore.setActiveModule(moduleMap[phase]);
  }, [uiStore]);

  // ==================== 自动化流程 ====================

  const runFullAnalysis = useCallback(async () => {
    try {
      // 1. 几何建模
      if (!phases.geometry.completed) {
        await geometryStore.generateGeometry();
      }
      
      // 2. 质量检查
      if (geometryStore.quality && geometryStore.quality.score < 0.65) {
        await geometryStore.optimizeGeometry();
      }
      
      // 3. 计算分析
      if (phases.geometry.completed) {
        await computationStore.startComputation();
      }
      
      console.log('✅ 完整CAE分析流程执行完成');
      
    } catch (error) {
      console.error('❌ 完整分析流程失败:', error);
    }
  }, [phases, geometryStore, computationStore]);

  const runGeometryToMesh = useCallback(async () => {
    if (!phases.geometry.completed) {
      await geometryStore.generateGeometry();
    }
    
    // 网格生成逻辑（目前与几何生成集成）
    console.log('几何→网格数据传输完成');
  }, [phases, geometryStore]);

  const runMeshToComputation = useCallback(async () => {
    if (phases.meshing.completed && !phases.computation.completed) {
      await computationStore.startComputation();
    }
  }, [phases, computationStore]);

  // ==================== 质量检查 ====================

  const validatePhase = useCallback((phase: CAEWorkflowState['currentPhase']): boolean => {
    switch (phase) {
      case 'geometry':
        return !!(geometryStore.data && geometryStore.quality && geometryStore.quality.score >= 0.65);
      case 'meshing':
        return !!(geometryStore.data && geometryStore.data.elements.length > 0);
      case 'computation':
        return !!(computationStore.results && computationStore.results.globalResults.convergence.converged);
      case 'results':
        return !!computationStore.results;
      default:
        return false;
    }
  }, [geometryStore, computationStore]);

  const autoFixIssues = useCallback(async () => {
    const blockingIssues = issues.filter(issue => issue.blocking);
    
    for (const issue of blockingIssues) {
      if (issue.phase === 'geometry' && issue.message.includes('质量')) {
        await geometryStore.optimizeGeometry();
      }
      // 可以添加更多自动修复逻辑
    }
  }, [issues, geometryStore]);

  // ==================== 预设管理 ====================

  const loadWorkflowPreset = useCallback((presetName: string) => {
    const presets = {
      'simple_excavation': {
        geometryParams: { excavationDepth: 5, meshSize: 1.5 },
        computationParams: { analysisType: 'static' as const }
      },
      'deep_excavation': {
        geometryParams: { excavationDepth: 15, meshSize: 2.5 },
        computationParams: { analysisType: 'nonlinear' as const }
      }
    };
    
    const preset = presets[presetName as keyof typeof presets];
    if (preset) {
      geometryStore.updateParams(preset.geometryParams);
      computationStore.updateParams(preset.computationParams);
    }
  }, [geometryStore, computationStore]);

  // 自动推进工作流
  useEffect(() => {
    // 几何完成后自动开始质量分析
    if (geometryStore.status === 'completed' && geometryStore.data && !geometryStore.quality) {
      geometryStore.analyzeQuality();
    }
  }, [geometryStore.status, geometryStore.data, geometryStore.quality]);

  // 构建状态对象
  const state: CAEWorkflowState = {
    currentPhase,
    overallProgress,
    phases,
    dataFlow,
    issues
  };

  // 构建动作对象
  const actions: CAEWorkflowActions = {
    startWorkflow,
    pauseWorkflow: () => {}, // 待实现
    resumeWorkflow: () => {}, // 待实现
    resetWorkflow,
    goToPhase,
    skipPhase: () => {}, // 待实现
    runFullAnalysis,
    runGeometryToMesh,
    runMeshToComputation,
    validatePhase,
    autoFixIssues,
    loadWorkflowPreset,
    saveWorkflowPreset: () => {} // 待实现
  };

  return {
    ...state,
    ...actions
  };
};

export type CAEWorkflow = ReturnType<typeof useCAEWorkflow>;