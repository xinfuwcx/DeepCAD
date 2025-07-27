/**
 * DeepCAD系统集成核心单元测试
 * 3号计算专家 - 系统集成完整性验证
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { DeepCADSystemIntegration } from '../DeepCADSystemIntegration';
import { 
  generateTestSystemConfig, 
  createMockThreeScene, 
  STANDARD_EXCAVATION_CASES,
  PERFORMANCE_BENCHMARKS 
} from '../../test/fixtures/testData';

describe('DeepCADSystemIntegration - 系统集成核心', () => {
  let integration: DeepCADSystemIntegration;
  let mockScene: any;
  let testConfig: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockScene = createMockThreeScene();
    testConfig = generateTestSystemConfig();
    integration = new DeepCADSystemIntegration(mockScene, testConfig);
  });

  describe('系统初始化', () => {
    test('应成功初始化所有核心系统', async () => {
      const startTime = performance.now();
      const success = await integration.initialize();
      const initTime = performance.now() - startTime;
      
      expect(success).toBe(true);
      expect(initTime).toBeLessThan(PERFORMANCE_BENCHMARKS.integration.systemInitialization.maxTime);
      
      const status = integration.getSystemStatus();
      expect(status.systemHealth).toBe(100);
      expect(status.overallStatus).toBe('ready');
    });

    test('应按正确顺序初始化各个子系统', async () => {
      const initializationOrder: string[] = [];
      
      // Mock各个系统的初始化方法来跟踪顺序
      const originalConsoleLog = console.log;
      console.log = vi.fn((message: string) => {
        if (message.includes('初始化')) {
          initializationOrder.push(message);
        }
        originalConsoleLog(message);
      });
      
      await integration.initialize();
      
      // 验证初始化顺序
      expect(initializationOrder).toContain(expect.stringContaining('核心计算引擎'));
      expect(initializationOrder).toContain(expect.stringContaining('GPU可视化系统'));
      expect(initializationOrder).toContain(expect.stringContaining('专业分析系统'));
      expect(initializationOrder).toContain(expect.stringContaining('用户界面系统'));
      
      // 恢复原始console.log
      console.log = originalConsoleLog;
    });

    test('应正确报告初始化失败', async () => {
      // Mock一个子系统初始化失败
      const mockFailingConfig = {
        ...testConfig,
        gpu: {
          ...testConfig.gpu,
          enableWebGPU: true, // 在测试环境中会失败
          fallbackToWebGL: false // 禁用回退
        }
      };
      
      const failingIntegration = new DeepCADSystemIntegration(mockScene, mockFailingConfig);
      const success = await failingIntegration.initialize();
      
      expect(success).toBe(false);
      
      const status = failingIntegration.getSystemStatus();
      expect(status.overallStatus).toBe('error');
      expect(status.systemHealth).toBeLessThan(100);
    });
  });

  describe('子系统集成验证', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('应正确集成深基坑求解器', async () => {
      const status = integration.getSystemStatus();
      
      expect(status.integrationStatus.coreEnginesReady).toBe(true);
      
      // 验证求解器可访问性
      const solverAvailable = integration.isSolverAvailable('deepExcavationSolver');
      expect(solverAvailable).toBe(true);
    });

    test('应正确集成GPU可视化系统', async () => {
      const status = integration.getSystemStatus();
      
      expect(status.integrationStatus.gpuSystemsReady).toBe(true);
      
      // 验证GPU渲染器可访问性
      const rendererAvailable = integration.isRendererAvailable('stressCloudRenderer');
      expect(rendererAvailable).toBe(true);
    });

    test('应正确集成专业后处理系统', async () => {
      const status = integration.getSystemStatus();
      
      expect(status.integrationStatus.analysisSystemsReady).toBe(true);
      
      // 验证后处理系统可访问性
      const postprocessorAvailable = integration.isPostprocessorAvailable();
      expect(postprocessorAvailable).toBe(true);
    });

    test('应正确集成用户界面系统', async () => {
      const status = integration.getSystemStatus();
      
      expect(status.integrationStatus.uiSystemsReady).toBe(true);
      
      // 验证UI系统交互性
      const uiInteractive = integration.isUIInteractive();
      expect(uiInteractive).toBe(true);
    });
  });

  describe('综合分析工作流', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('应成功执行小型基坑综合分析', async () => {
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      
      const startTime = performance.now();
      const results = await integration.performComprehensiveAnalysis(
        testCase.parameters,
        [], // 空的施工阶段数组
        testConfig.analysis.safetyStandards
      );
      const analysisTime = performance.now() - startTime;
      
      expect(results).toBeDefined();
      expect(results.excavationResults).toBeDefined();
      expect(results.stageResults).toBeDefined();
      expect(results.safetyResults).toBeDefined();
      expect(results.postprocessingResults).toBeDefined();
      
      // 验证分析时间
      expect(analysisTime).toBeLessThan(PERFORMANCE_BENCHMARKS.computation.smallExcavation.maxTime * 2); // 综合分析允许更长时间
    });

    test('应正确协调各子系统间的数据流', async () => {
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      
      // 跟踪数据流
      const dataFlowLog: string[] = [];
      const originalConsoleLog = console.log;
      console.log = vi.fn((message: string) => {
        if (message.includes('数据流') || message.includes('→')) {
          dataFlowLog.push(message);
        }
        originalConsoleLog(message);
      });
      
      await integration.performComprehensiveAnalysis(
        testCase.parameters,
        [],
        testConfig.analysis.safetyStandards
      );
      
      // 验证关键数据流步骤
      expect(dataFlowLog.some(log => log.includes('土-结构耦合分析'))).toBe(true);
      expect(dataFlowLog.some(log => log.includes('安全性评估'))).toBe(true);
      expect(dataFlowLog.some(log => log.includes('GPU可视化'))).toBe(true);
      
      // 恢复原始console.log
      console.log = originalConsoleLog;
    });

    test('应正确处理计算过程中的错误', async () => {
      // 创建会导致计算失败的极端参数
      const extremeParameters = {
        ...STANDARD_EXCAVATION_CASES.smallScale.parameters,
        geometry: {
          ...STANDARD_EXCAVATION_CASES.smallScale.parameters.geometry,
          excavationDepth: -10 // 无效的负深度
        }
      };
      
      await expect(
        integration.performComprehensiveAnalysis(
          extremeParameters,
          [],
          testConfig.analysis.safetyStandards
        )
      ).rejects.toThrow();
      
      // 验证错误状态
      const status = integration.getSystemStatus();
      expect(status.overallStatus).toBe('error');
    });
  });

  describe('现有优化任务集成', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('应正确识别并集成现有优化任务', async () => {
      const optimizationTasks = integration.getIntegratedOptimizations();
      
      expect(optimizationTasks).toBeDefined();
      expect(optimizationTasks.length).toBeGreaterThan(0);
      
      // 验证关键优化任务存在
      const taskNames = optimizationTasks.map(task => task.taskName);
      expect(taskNames).toContain(expect.stringContaining('TypeScript错误修复'));
      expect(taskNames).toContain(expect.stringContaining('GPU加速优化'));
    });

    test('应正确应用GPU优化配置', async () => {
      const gpuOptimizations = integration.getAppliedGPUOptimizations();
      
      expect(gpuOptimizations.webgpuEnabled).toBe(testConfig.gpu.enableWebGPU);
      expect(gpuOptimizations.memoryOptimized).toBe(true);
      expect(gpuOptimizations.performanceGain).toBeGreaterThan(0);
    });

    test('应正确应用计算优化配置', async () => {
      const computationOptimizations = integration.getAppliedComputationOptimizations();
      
      expect(computationOptimizations.cachingEnabled).toBe(testConfig.computation.enableResultCaching);
      expect(computationOptimizations.parallelization).toBe(true);
      expect(computationOptimizations.maxConcurrentTasks).toBeGreaterThan(1);
    });
  });

  describe('性能监控', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('应正确监控系统性能指标', async () => {
      // 等待性能监控启动
      await new Promise(resolve => setTimeout(resolve, 1100)); // 1.1秒
      
      const status = integration.getSystemStatus();
      
      expect(status.performanceMetrics).toBeDefined();
      expect(status.performanceMetrics.memory).toBeGreaterThan(0);
      expect(status.performanceMetrics.cpu).toBeGreaterThan(0);
      expect(status.performanceMetrics.gpu).toBeGreaterThan(0);
    });

    test('应正确跟踪活跃计算任务', async () => {
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      
      // 启动计算（异步）
      const analysisPromise = integration.performComprehensiveAnalysis(
        testCase.parameters,
        [],
        testConfig.analysis.safetyStandards
      );
      
      // 检查活跃任务
      await new Promise(resolve => setTimeout(resolve, 100)); // 等待任务启动
      const status = integration.getSystemStatus();
      
      expect(status.activeComputations.length).toBeGreaterThan(0);
      expect(status.overallStatus).toBe('computing');
      
      // 等待计算完成
      await analysisPromise;
      
      // 验证任务清理
      const finalStatus = integration.getSystemStatus();
      expect(finalStatus.activeComputations.length).toBe(0);
      expect(finalStatus.overallStatus).toBe('ready');
    });

    test('应正确检测内存泄漏', async () => {
      const initialMemory = (performance as any).memory.usedJSHeapSize;
      
      // 执行多次计算
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      
      for (let i = 0; i < 3; i++) {
        await integration.performComprehensiveAnalysis(
          testCase.parameters,
          [],
          testConfig.analysis.safetyStandards
        );
      }
      
      const finalMemory = (performance as any).memory.usedJSHeapSize;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      
      // 验证内存增长在合理范围内
      expect(memoryIncrease).toBeLessThan(100); // 小于100MB增长
    });
  });

  describe('错误恢复机制', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('应正确处理GPU系统失败', async () => {
      // 模拟GPU系统失败
      integration.simulateGPUFailure();
      
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      
      // 应该能够继续计算，只是没有GPU可视化
      const results = await integration.performComprehensiveAnalysis(
        testCase.parameters,
        [],
        testConfig.analysis.safetyStandards
      );
      
      expect(results.excavationResults).toBeDefined();
      expect(results.safetyResults).toBeDefined();
      
      // 验证系统状态反映了部分失败
      const status = integration.getSystemStatus();
      expect(status.systemHealth).toBeLessThan(100);
      expect(status.systemHealth).toBeGreaterThan(50); // 但不是完全失败
    });

    test('应正确处理计算引擎异常', async () => {
      // 模拟计算引擎异常
      integration.simulateComputationFailure();
      
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      
      await expect(
        integration.performComprehensiveAnalysis(
          testCase.parameters,
          [],
          testConfig.analysis.safetyStandards
        )
      ).rejects.toThrow('计算引擎异常');
      
      // 验证错误被正确记录
      const status = integration.getSystemStatus();
      expect(status.overallStatus).toBe('error');
    });

    test('应正确实现优雅降级', async () => {
      // 模拟高级功能不可用
      integration.disableAdvancedFeatures();
      
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      
      // 应该能够执行基础分析
      const results = await integration. performBasicAnalysis(testCase.parameters);
      
      expect(results).toBeDefined();
      expect(results.basicResults).toBeDefined();
      
      // 验证降级状态
      const capabilities = integration.getSystemCapabilities();
      expect(capabilities.advancedVisualization).toBe(false);
      expect(capabilities.basicComputation).toBe(true);
    });
  });

  describe('数据流完整性', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('应验证计算引擎到GPU渲染器的数据流', async () => {
      const dataFlowTest = await integration.testDataFlow('computation', 'gpu');
      
      expect(dataFlowTest.success).toBe(true);
      expect(dataFlowTest.dataIntegrity).toBe(true);
      expect(dataFlowTest.latency).toBeLessThan(100); // 100ms内完成数据传输
    });

    test('应验证GPU渲染器到Three.js场景的数据流', async () => {
      const dataFlowTest = await integration.testDataFlow('gpu', 'threejs');
      
      expect(dataFlowTest.success).toBe(true);
      expect(dataFlowTest.sceneObjectsCreated).toBeGreaterThan(0);
      expect(mockScene.add).toHaveBeenCalled();
    });

    test('应验证后处理系统到UI的数据流', async () => {
      const dataFlowTest = await integration.testDataFlow('postprocessing', 'ui');
      
      expect(dataFlowTest.success).toBe(true);
      expect(dataFlowTest.uiUpdateTriggered).toBe(true);
    });
  });

  describe('并发处理', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('应正确处理并发计算任务', async () => {
      const testCase1 = STANDARD_EXCAVATION_CASES.smallScale;
      const testCase2 = {
        ...STANDARD_EXCAVATION_CASES.smallScale,
        geometry: {
          ...STANDARD_EXCAVATION_CASES.smallScale.parameters.geometry,
          excavationDepth: 12 // 不同深度
        }
      };
      
      // 启动并发计算
      const promise1 = integration.performComprehensiveAnalysis(
        testCase1.parameters,
        [],
        testConfig.analysis.safetyStandards
      );
      
      const promise2 = integration.performComprehensiveAnalysis(
        testCase2,
        [],
        testConfig.analysis.safetyStandards
      );
      
      const [results1, results2] = await Promise.all([promise1, promise2]);
      
      expect(results1).toBeDefined();
      expect(results2).toBeDefined();
      expect(results1.excavationResults).not.toEqual(results2.excavationResults);
    });

    test('应正确限制并发任务数量', async () => {
      const maxConcurrent = testConfig.computation.maxConcurrentTasks;
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      
      // 尝试启动超过限制的任务
      const promises = [];
      for (let i = 0; i < maxConcurrent + 2; i++) {
        promises.push(
          integration.performComprehensiveAnalysis(
            testCase.parameters,
            [],
            testConfig.analysis.safetyStandards
          )
        );
      }
      
      // 检查同时运行的任务数
      await new Promise(resolve => setTimeout(resolve, 100));
      const status = integration.getSystemStatus();
      
      expect(status.activeComputations.length).toBeLessThanOrEqual(maxConcurrent);
      
      // 等待所有任务完成
      await Promise.all(promises);
    });
  });

  describe('资源管理', () => {
    test('应正确清理系统资源', async () => {
      await integration.initialize();
      
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      await integration.performComprehensiveAnalysis(
        testCase.parameters,
        [],
        testConfig.analysis.safetyStandards
      );
      
      // 清理资源
      integration.dispose();
      
      // 验证资源已清理
      expect(mockScene.remove).toHaveBeenCalled();
      
      // 验证系统状态
      const status = integration.getSystemStatus();
      expect(status.overallStatus).toBe('error'); // 系统已销毁
    });

    test('应正确管理内存分配', async () => {
      await integration.initialize();
      
      const initialMemory = (performance as any).memory.usedJSHeapSize;
      
      // 执行大型计算
      const testCase = STANDARD_EXCAVATION_CASES.largeScale;
      await integration.performComprehensiveAnalysis(
        testCase.parameters,
        [],
        testConfig.analysis.safetyStandards
      );
      
      const peakMemory = (performance as any).memory.usedJSHeapSize;
      
      // 触发垃圾回收（模拟）
      integration.triggerGarbageCollection();
      
      const finalMemory = (performance as any).memory.usedJSHeapSize;
      
      // 验证内存使用合理性
      const memoryIncrease = (peakMemory - initialMemory) / 1024 / 1024;
      const memoryRecovered = (peakMemory - finalMemory) / 1024 / 1024;
      
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_BENCHMARKS.computation.largeExcavation.maxMemory);
      expect(memoryRecovered).toBeGreaterThan(0); // 应该有内存回收
    });
  });
});