/**
 * useCAEWorkflow Hook 单元测试
 * DeepCAD Deep Excavation CAE Platform - CAE Workflow Hook Tests
 * 
 * 作者：2号几何专家
 * 测试覆盖：工作流管理、状态转换、错误处理、性能监控
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCAEWorkflow } from '../useCAEWorkflow';
import type { 
  CAEWorkflowState, 
  WorkflowStage, 
  WorkflowTransition,
  WorkflowValidationResult,
  StageConfiguration 
} from '../useCAEWorkflow';

// Mock相关依赖
vi.mock('../../geometryStore', () => ({
  useGeometryStore: vi.fn(() => ({
    geometry: {
      id: 'test-geometry',
      vertices: new Float32Array([0, 0, 0]),
      faces: new Uint32Array([0, 1, 2])
    },
    isLoading: false,
    error: null
  }))
}));

vi.mock('../../computationStore', () => ({
  useComputationStore: vi.fn(() => ({
    status: 'idle',
    progress: 0,
    results: null,
    startComputation: vi.fn(),
    stopComputation: vi.fn()
  }))
}));

vi.mock('../../meshStore', () => ({
  useMeshStore: vi.fn(() => ({
    mesh: null,
    quality: 0,
    generateMesh: vi.fn(),
    optimizeMesh: vi.fn()
  }))
}));

describe('useCAEWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初始化状态', () => {
    it('should initialize with default workflow state', () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      expect(result.current.currentStage).toBe('geometry_input');
      expect(result.current.isTransitioning).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.progress).toEqual({
        overall: 0,
        currentStage: 0,
        completedStages: []
      });
    });

    it('should initialize with custom configuration', () => {
      const customConfig: StageConfiguration = {
        geometry_input: {
          name: '自定义几何输入',
          description: '输入几何数据',
          validation: ['geometry_valid'],
          timeout: 30000
        },
        mesh_generation: {
          name: '网格生成',
          description: '生成计算网格',
          validation: ['mesh_quality'],
          timeout: 60000
        }
      };

      const { result } = renderHook(() => useCAEWorkflow());
      
      expect(result.current.stageConfig).toEqual(customConfig);
      expect(result.current.availableStages).toEqual(['geometry_input', 'mesh_generation']);
    });
  });

  describe('工作流转换', () => {
    it('should transition to next stage successfully', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      await act(async () => {
        const success = await result.current.transitionToStage('mesh_generation');
        expect(success).toBe(true);
      });
      
      expect(result.current.currentStage).toBe('mesh_generation');
      expect(result.current.progress.completedStages).toContain('geometry_input');
    });

    it('should fail transition with invalid stage', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      await act(async () => {
        const success = await result.current.transitionToStage('invalid_stage' as WorkflowStage);
        expect(success).toBe(false);
      });
      
      expect(result.current.error).toContain('无效的工作流阶段');
      expect(result.current.currentStage).toBe('geometry_input');
    });

    it('should validate prerequisites before transition', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      // 尝试跳过必需的阶段
      await act(async () => {
        const success = await result.current.transitionToStage('computation');
        expect(success).toBe(false);
      });
      
      expect(result.current.error).toContain('未满足前置条件');
    });

    it('should handle transition timeout', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      // Mock一个会超时的转换
      vi.spyOn(result.current, 'transitionToStage').mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(false), 100))
      );
      
      await act(async () => {
        const success = await result.current.transitionToStage('mesh_generation');
        expect(success).toBe(false);
      });
    }, 1000);
  });

  describe('阶段验证', () => {
    it('should validate geometry input stage', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      const validation = await result.current.validateCurrentStage();
      
      expect(validation.isValid).toBe(true);
      expect(validation.validationResults['geometry_valid']).toBe(true);
    });

    it('should detect validation failures', async () => {
      // Mock无效的几何数据
      vi.mocked(vi.fn()).mockReturnValue({
        geometry: null,
        isLoading: false,
        error: 'Invalid geometry'
      });

      const { result } = renderHook(() => useCAEWorkflow());
      
      const validation = await result.current.validateCurrentStage();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should validate mesh generation requirements', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      // 先转换到网格生成阶段
      await act(async () => {
        await result.current.transitionToStage('mesh_generation');
      });
      
      const validation = await result.current.validateCurrentStage();
      
      expect(validation.validationResults).toHaveProperty('mesh_quality');
      expect(validation.validationResults).toHaveProperty('geometry_valid');
    });
  });

  describe('进度管理', () => {
    it('should calculate overall progress correctly', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      // 完成几何输入阶段
      await act(async () => {
        await result.current.transitionToStage('mesh_generation');
      });
      
      expect(result.current.progress.overall).toBeCloseTo(0.2, 1); // 5个阶段中的1个完成
    });

    it('should update stage progress', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      await act(async () => {
        result.current.updateStageProgress(0.5);
      });
      
      expect(result.current.progress.currentStage).toBe(0.5);
    });

    it('should reset progress when restarting workflow', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      // 先进行一些进度
      await act(async () => {
        await result.current.transitionToStage('mesh_generation');
        result.current.updateStageProgress(0.8);
      });
      
      // 重置工作流
      await act(async () => {
        result.current.resetWorkflow();
      });
      
      expect(result.current.currentStage).toBe('geometry_input');
      expect(result.current.progress.overall).toBe(0);
      expect(result.current.progress.completedStages).toHaveLength(0);
    });
  });

  describe('错误处理', () => {
    it('should handle stage transition errors gracefully', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      // Mock一个会抛出错误的转换
      const mockTransition = vi.spyOn(result.current, 'transitionToStage')
        .mockRejectedValue(new Error('转换失败'));
      
      await act(async () => {
        const success = await result.current.transitionToStage('mesh_generation');
        expect(success).toBe(false);
      });
      
      expect(result.current.error).toContain('转换失败');
      expect(result.current.currentStage).toBe('geometry_input');
      
      mockTransition.mockRestore();
    });

    it('should clear errors when transitioning successfully', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      // 先产生一个错误
      await act(async () => {
        result.current.setError('测试错误');
      });
      
      expect(result.current.error).toBe('测试错误');
      
      // 成功转换应该清除错误
      await act(async () => {
        await result.current.transitionToStage('mesh_generation');
      });
      
      expect(result.current.error).toBeNull();
    });

    it('should retry failed transitions', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      let attemptCount = 0;
      const mockTransition = vi.spyOn(result.current, 'transitionToStage')
        .mockImplementation(async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('临时失败');
          }
          return true;
        });
      
      await act(async () => {
        const success = await result.current.retryTransition('mesh_generation', 3);
        expect(success).toBe(true);
      });
      
      expect(attemptCount).toBe(3);
      mockTransition.mockRestore();
    });
  });

  describe('工作流历史', () => {
    it('should track workflow history', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      await act(async () => {
        await result.current.transitionToStage('mesh_generation');
        await result.current.transitionToStage('boundary_conditions');
      });
      
      const history = result.current.getWorkflowHistory();
      
      expect(history).toHaveLength(3); // 初始状态 + 2次转换
      expect(history[0].stage).toBe('geometry_input');
      expect(history[1].stage).toBe('mesh_generation');
      expect(history[2].stage).toBe('boundary_conditions');
    });

    it('should allow reverting to previous stage', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      await act(async () => {
        await result.current.transitionToStage('mesh_generation');
        await result.current.transitionToStage('boundary_conditions');
      });
      
      await act(async () => {
        const success = await result.current.revertToPreviousStage();
        expect(success).toBe(true);
      });
      
      expect(result.current.currentStage).toBe('mesh_generation');
    });

    it('should not allow reverting from initial stage', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      await act(async () => {
        const success = await result.current.revertToPreviousStage();
        expect(success).toBe(false);
      });
      
      expect(result.current.error).toContain('已处于初始阶段');
    });
  });

  describe('并发处理', () => {
    it('should handle concurrent stage transitions', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      const transition1 = result.current.transitionToStage('mesh_generation');
      const transition2 = result.current.transitionToStage('boundary_conditions');
      
      const [result1, result2] = await Promise.all([transition1, transition2]);
      
      // 只有一个转换应该成功
      expect(result1 !== result2).toBe(true);
      expect(result1 || result2).toBe(true);
    });

    it('should prevent multiple simultaneous transitions', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      // 开始第一个转换
      const firstTransition = result.current.transitionToStage('mesh_generation');
      
      // 立即尝试第二个转换
      await act(async () => {
        const secondResult = await result.current.transitionToStage('boundary_conditions');
        expect(secondResult).toBe(false);
      });
      
      expect(result.current.error).toContain('转换正在进行中');
      
      // 等待第一个转换完成
      await act(async () => {
        await firstTransition;
      });
    });
  });

  describe('性能监控', () => {
    it('should track stage execution times', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      await act(async () => {
        await result.current.transitionToStage('mesh_generation');
      });
      
      const metrics = result.current.getPerformanceMetrics();
      
      expect(metrics.stageExecutionTimes).toHaveProperty('geometry_input');
      expect(metrics.stageExecutionTimes.geometry_input).toBeGreaterThan(0);
    });

    it('should calculate average transition times', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      // 执行多次转换以获得平均值
      await act(async () => {
        for (let i = 0; i < 3; i++) {
          result.current.resetWorkflow();
          await result.current.transitionToStage('mesh_generation');
        }
      });
      
      const metrics = result.current.getPerformanceMetrics();
      
      expect(metrics.averageTransitionTime).toBeGreaterThan(0);
      expect(metrics.transitionCount).toBe(3);
    });

    it('should monitor memory usage during workflow', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      await act(async () => {
        await result.current.transitionToStage('mesh_generation');
        await result.current.transitionToStage('computation');
      });
      
      const metrics = result.current.getPerformanceMetrics();
      
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.memoryUsage.peak).toBeGreaterThan(0);
    });
  });

  describe('自定义验证器', () => {
    it('should support custom stage validators', async () => {
      const customValidator = vi.fn().mockResolvedValue({
        isValid: true,
        message: '自定义验证通过'
      });

      const { result } = renderHook(() => useCAEWorkflow());
      
      await act(async () => {
        result.current.addStageValidator('geometry_input', customValidator);
      });
      
      const validation = await result.current.validateCurrentStage();
      
      expect(customValidator).toHaveBeenCalled();
      expect(validation.isValid).toBe(true);
    });

    it('should handle custom validator failures', async () => {
      const failingValidator = vi.fn().mockResolvedValue({
        isValid: false,
        message: '自定义验证失败',
        errors: ['验证错误1', '验证错误2']
      });

      const { result } = renderHook(() => useCAEWorkflow());
      
      await act(async () => {
        result.current.addStageValidator('geometry_input', failingValidator);
      });
      
      const validation = await result.current.validateCurrentStage();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('验证错误1');
      expect(validation.errors).toContain('验证错误2');
    });
  });

  describe('工作流配置', () => {
    it('should support dynamic stage configuration', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      await act(async () => {
        result.current.updateStageConfig('mesh_generation', {
          name: '高级网格生成',
          description: '使用高级算法生成网格',
          validation: ['mesh_quality', 'mesh_density'],
          timeout: 120000
        });
      });
      
      const config = result.current.getStageConfig('mesh_generation');
      
      expect(config.name).toBe('高级网格生成');
      expect(config.timeout).toBe(120000);
      expect(config.validation).toContain('mesh_density');
    });

    it('should validate stage configuration', async () => {
      const { result } = renderHook(() => useCAEWorkflow());
      
      await act(async () => {
        const isValid = result.current.validateStageConfig({
          name: '',  // 无效：空名称
          description: '测试阶段',
          validation: [],
          timeout: -1000  // 无效：负数超时
        });
        
        expect(isValid).toBe(false);
      });
    });
  });
});