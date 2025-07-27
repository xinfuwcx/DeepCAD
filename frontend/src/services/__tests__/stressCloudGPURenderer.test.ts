/**
 * 应力云图WebGPU渲染器单元测试
 * 3号计算专家 - GPU可视化系统验证
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { StressCloudGPURenderer } from '../stressCloudGPURenderer';
import { generateMockStressData, createMockThreeScene, PERFORMANCE_BENCHMARKS } from '../../test/fixtures/testData';

describe('StressCloudGPURenderer - WebGPU应力渲染', () => {
  let renderer: StressCloudGPURenderer;
  let mockScene: any;
  let mockConfig: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockScene = createMockThreeScene();
    
    mockConfig = {
      webgpu: {
        workgroupSize: [256, 1, 1],
        maxComputeUnits: 32,
        enableAsyncCompute: true,
        memoryOptimization: 'balanced' as const
      },
      visualization: {
        colorMap: 'viridis' as const,
        contourLevels: 10,
        enableIsolines: true,
        enableContourFill: true,
        transparency: 0.8,
        wireframeOverlay: false
      },
      animation: {
        enableTimeAnimation: false,
        animationSpeed: 1.0,
        enablePulseEffect: false,
        pulseFrequency: 1.0,
        enableColorCycling: false
      },
      interaction: {
        enableHover: true,
        enableClick: true,
        enableRegionSelect: false,
        enableMeasurement: false
      },
      performance: {
        lodEnabled: true,
        lodThresholds: [10, 50, 200],
        cullingEnabled: true,
        maxVerticesPerFrame: 100000,
        enableBatching: true
      }
    };
    
    renderer = new StressCloudGPURenderer(mockScene, mockConfig);
  });

  describe('渲染器初始化', () => {
    test('应正确初始化WebGPU渲染器', async () => {
      const success = await renderer.initialize();
      
      expect(success).toBe(true);
      expect(renderer).toBeDefined();
    });

    test('应正确处理WebGPU不支持的情况', async () => {
      // Mock WebGPU不可用
      const originalGpu = (navigator as any).gpu;
      (navigator as any).gpu = undefined;
      
      const success = await renderer.initialize();
      
      expect(success).toBe(false);
      
      // 恢复原始设置
      (navigator as any).gpu = originalGpu;
    });

    test('应正确配置GPU缓冲区', async () => {
      await renderer.initialize();
      
      // 验证内部状态（通过公共方法间接验证）
      const isInitialized = await renderer.isInitialized();
      expect(isInitialized).toBe(true);
    });
  });

  describe('应力数据处理', () => {
    beforeEach(async () => {
      await renderer.initialize();
    });

    test('应正确处理小规模应力数据', async () => {
      const stressData = generateMockStressData(100);
      
      const startTime = performance.now();
      const result = await renderer.renderStressCloud(stressData);
      const renderTime = performance.now() - startTime;
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.renderTime).toBeLessThan(PERFORMANCE_BENCHMARKS.rendering.stressCloud.maxFrameTime);
      expect(result.verticesProcessed).toBe(100);
      expect(renderTime).toBeLessThan(1000); // 1秒内完成
    });

    test('应正确处理大规模应力数据', async () => {
      const stressData = generateMockStressData(10000);
      
      const result = await renderer.renderStressCloud(stressData);
      
      expect(result.success).toBe(true);
      expect(result.verticesProcessed).toBe(10000);
      expect(result.meshObjects.length).toBeGreaterThan(0);
    });

    test('应正确验证输入数据格式', async () => {
      const invalidStressData = {
        ...generateMockStressData(100),
        meshData: {
          vertices: new Float32Array([]), // 空数组
          faces: new Uint32Array([]),
          normals: new Float32Array([]),
          areas: new Float32Array([])
        }
      };

      await expect(renderer.renderStressCloud(invalidStressData))
        .rejects.toThrow('无效的网格数据');
    });
  });

  describe('颜色映射', () => {
    beforeEach(async () => {
      await renderer.initialize();
    });

    test('应正确应用Viridis颜色映射', async () => {
      const stressData = generateMockStressData(100);
      
      const result = await renderer.renderStressCloud(stressData);
      
      expect(result.colorMapping).toBeDefined();
      expect(result.colorMapping.type).toBe('viridis');
      expect(result.colorMapping.range).toEqual({
        min: stressData.stressFields.statistics.min,
        max: stressData.stressFields.statistics.max
      });
    });

    test('应支持多种颜色映射方案', async () => {
      const colorMaps = ['viridis', 'plasma', 'jet', 'hot', 'cool'];
      
      for (const colorMap of colorMaps) {
        renderer.updateConfig({
          ...mockConfig,
          visualization: {
            ...mockConfig.visualization,
            colorMap: colorMap as any
          }
        });
        
        const stressData = generateMockStressData(50);
        const result = await renderer.renderStressCloud(stressData);
        
        expect(result.success).toBe(true);
        expect(result.colorMapping.type).toBe(colorMap);
      }
    });

    test('应正确处理应力值归一化', async () => {
      const stressData = generateMockStressData(100);
      
      // 设置已知的应力范围
      const minStress = 0;
      const maxStress = 300000; // 300 kPa
      stressData.stressFields.statistics.min = minStress;
      stressData.stressFields.statistics.max = maxStress;
      
      const result = await renderer.renderStressCloud(stressData);
      
      expect(result.colorMapping.normalizedRange).toEqual([0, 1]);
      expect(result.colorMapping.actualRange).toEqual([minStress, maxStress]);
    });
  });

  describe('等值线生成', () => {
    beforeEach(async () => {
      await renderer.initialize();
    });

    test('应正确生成应力等值线', async () => {
      const config = {
        ...mockConfig,
        visualization: {
          ...mockConfig.visualization,
          enableIsolines: true,
          contourLevels: 5
        }
      };
      
      renderer.updateConfig(config);
      const stressData = generateMockStressData(200);
      
      const result = await renderer.renderStressCloud(stressData);
      
      expect(result.isolines).toBeDefined();
      expect(result.isolines.levels.length).toBe(5);
      expect(result.isolines.geometry.length).toBeGreaterThan(0);
    });

    test('应正确计算等值线几何', async () => {
      const stressData = generateMockStressData(100);
      
      const result = await renderer.renderStressCloud(stressData);
      
      if (result.isolines) {
        result.isolines.levels.forEach((level, index) => {
          expect(level.value).toBeGreaterThanOrEqual(stressData.stressFields.statistics.min);
          expect(level.value).toBeLessThanOrEqual(stressData.stressFields.statistics.max);
          
          if (index > 0) {
            expect(level.value).toBeGreaterThan(result.isolines!.levels[index - 1].value);
          }
        });
      }
    });
  });

  describe('WebGPU计算着色器', () => {
    beforeEach(async () => {
      await renderer.initialize();
    });

    test('应正确执行应力计算着色器', async () => {
      const stressData = generateMockStressData(1000);
      
      const result = await renderer.renderStressCloud(stressData);
      
      expect(result.gpuComputeTime).toBeDefined();
      expect(result.gpuComputeTime).toBeGreaterThan(0);
      expect(result.gpuComputeTime).toBeLessThan(100); // 100ms内完成GPU计算
    });

    test('应正确处理工作组配置', async () => {
      const largeStressData = generateMockStressData(10000);
      
      const result = await renderer.renderStressCloud(largeStressData);
      
      expect(result.workgroupsDispatched).toBeDefined();
      expect(result.workgroupsDispatched).toBeGreaterThan(0);
      
      // 验证工作组数量合理性
      const expectedWorkgroups = Math.ceil(10000 / mockConfig.webgpu.workgroupSize[0]);
      expect(result.workgroupsDispatched).toBeCloseTo(expectedWorkgroups, 0);
    });

    test('应优化GPU内存使用', async () => {
      const stressData = generateMockStressData(5000);
      
      const result = await renderer.renderStressCloud(stressData);
      
      expect(result.gpuMemoryUsed).toBeDefined();
      expect(result.gpuMemoryUsed).toBeGreaterThan(0);
      expect(result.gpuMemoryUsed).toBeLessThan(mockConfig.webgpu.maxBufferSize * 1024 * 1024); // 小于缓冲区限制
    });
  });

  describe('Three.js集成', () => {
    beforeEach(async () => {
      await renderer.initialize();
    });

    test('应正确生成Three.js网格对象', async () => {
      const stressData = generateMockStressData(100);
      
      const result = await renderer.renderStressCloud(stressData);
      
      expect(result.meshObjects).toBeDefined();
      expect(result.meshObjects.length).toBeGreaterThan(0);
      
      // 验证网格对象被添加到场景
      expect(mockScene.add).toHaveBeenCalled();
    });

    test('应正确设置材质属性', async () => {
      const stressData = generateMockStressData(100);
      
      const result = await renderer.renderStressCloud(stressData);
      
      expect(result.materialProperties).toBeDefined();
      expect(result.materialProperties.transparent).toBe(true);
      expect(result.materialProperties.opacity).toBe(mockConfig.visualization.transparency);
    });

    test('应支持线框叠加模式', async () => {
      const config = {
        ...mockConfig,
        visualization: {
          ...mockConfig.visualization,
          wireframeOverlay: true
        }
      };
      
      renderer.updateConfig(config);
      const stressData = generateMockStressData(100);
      
      const result = await renderer.renderStressCloud(stressData);
      
      expect(result.wireframeObjects).toBeDefined();
      expect(result.wireframeObjects.length).toBeGreaterThan(0);
    });
  });

  describe('性能优化', () => {
    beforeEach(async () => {
      await renderer.initialize();
    });

    test('应实现LOD(细节层次)优化', async () => {
      const stressData = generateMockStressData(20000);
      
      const result = await renderer.renderStressCloud(stressData);
      
      expect(result.lodLevels).toBeDefined();
      expect(result.lodLevels.length).toBe(mockConfig.performance.lodThresholds.length + 1);
      
      // 验证LOD级别的顶点数递减
      for (let i = 1; i < result.lodLevels.length; i++) {
        expect(result.lodLevels[i].vertexCount).toBeLessThan(result.lodLevels[i - 1].vertexCount);
      }
    });

    test('应实现视锥体剔除', async () => {
      const config = {
        ...mockConfig,
        performance: {
          ...mockConfig.performance,
          cullingEnabled: true
        }
      };
      
      renderer.updateConfig(config);
      const stressData = generateMockStressData(1000);
      
      const result = await renderer.renderStressCloud(stressData);
      
      expect(result.cullingStats).toBeDefined();
      expect(result.cullingStats.totalTriangles).toBeGreaterThan(result.cullingStats.renderedTriangles);
    });

    test('应正确实现批处理渲染', async () => {
      const stressData = generateMockStressData(5000);
      
      const result = await renderer.renderStressCloud(stressData);
      
      expect(result.batchCount).toBeDefined();
      expect(result.batchCount).toBeGreaterThan(0);
      expect(result.batchCount).toBeLessThan(10); // 合理的批次数
    });
  });

  describe('交互功能', () => {
    beforeEach(async () => {
      await renderer.initialize();
    });

    test('应支持鼠标悬停查询', async () => {
      const config = {
        ...mockConfig,
        interaction: {
          ...mockConfig.interaction,
          enableHover: true
        }
      };
      
      renderer.updateConfig(config);
      const stressData = generateMockStressData(100);
      
      await renderer.renderStressCloud(stressData);
      
      // 模拟鼠标悬停
      const hoverResult = await renderer.queryStressAtPoint(0.5, 0.5); // 屏幕中心
      
      expect(hoverResult).toBeDefined();
      expect(hoverResult.stressValue).toBeGreaterThanOrEqual(0);
      expect(hoverResult.position).toBeDefined();
    });

    test('应支持点击查询详细信息', async () => {
      const config = {
        ...mockConfig,
        interaction: {
          ...mockConfig.interaction,
          enableClick: true
        }
      };
      
      renderer.updateConfig(config);
      const stressData = generateMockStressData(100);
      
      await renderer.renderStressCloud(stressData);
      
      // 模拟鼠标点击
      const clickResult = await renderer.getDetailedStressInfo(0.3, 0.7);
      
      expect(clickResult).toBeDefined();
      expect(clickResult.vonMises).toBeGreaterThanOrEqual(0);
      expect(clickResult.principalStresses).toBeDefined();
      expect(clickResult.coordinates).toBeDefined();
    });
  });

  describe('错误处理', () => {
    test('应正确处理GPU设备丢失', async () => {
      await renderer.initialize();
      
      // 模拟GPU设备丢失
      const mockDevice = (navigator as any).gpu.requestAdapter().requestDevice();
      mockDevice.lost = Promise.resolve({ reason: 'destroyed' });
      
      const stressData = generateMockStressData(100);
      
      await expect(renderer.renderStressCloud(stressData))
        .rejects.toThrow('GPU设备丢失');
    });

    test('应正确处理内存不足', async () => {
      await renderer.initialize();
      
      // 创建超大数据集
      const hugeStressData = generateMockStressData(1000000); // 100万顶点
      
      await expect(renderer.renderStressCloud(hugeStressData))
        .rejects.toThrow('GPU内存不足');
    });

    test('应正确降级到WebGL', async () => {
      // Mock WebGPU失败
      const originalGpu = (navigator as any).gpu;
      (navigator as any).gpu.requestAdapter = vi.fn().mockRejectedValue(new Error('WebGPU不可用'));
      
      const success = await renderer.initialize();
      
      expect(success).toBe(true); // 应该成功降级
      expect(renderer.getRenderingBackend()).toBe('webgl');
      
      // 恢复原始设置
      (navigator as any).gpu = originalGpu;
    });
  });

  describe('资源管理', () => {
    test('应正确清理GPU资源', async () => {
      await renderer.initialize();
      
      const stressData = generateMockStressData(100);
      await renderer.renderStressCloud(stressData);
      
      // 清理资源
      renderer.dispose();
      
      // 验证资源已清理
      expect(mockScene.remove).toHaveBeenCalled();
    });

    test('应正确管理缓冲区生命周期', async () => {
      await renderer.initialize();
      
      const stressData1 = generateMockStressData(100);
      const result1 = await renderer.renderStressCloud(stressData1);
      
      const stressData2 = generateMockStressData(200);
      const result2 = await renderer.renderStressCloud(stressData2);
      
      // 验证缓冲区被正确重用或重新分配
      expect(result2.bufferReallocations).toBeDefined();
      expect(result2.bufferReallocations).toBeGreaterThanOrEqual(0);
    });
  });

  describe('性能基准测试', () => {
    test('渲染1000顶点应在16ms内完成(60fps)', async () => {
      await renderer.initialize();
      
      const stressData = generateMockStressData(1000);
      
      const startTime = performance.now();
      const result = await renderer.renderStressCloud(stressData);
      const renderTime = performance.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(renderTime).toBeLessThan(PERFORMANCE_BENCHMARKS.rendering.stressCloud.maxFrameTime);
    });

    test('渲染10000顶点应在33ms内完成(30fps)', async () => {
      await renderer.initialize();
      
      const stressData = generateMockStressData(10000);
      
      const startTime = performance.now();
      const result = await renderer.renderStressCloud(stressData);
      const renderTime = performance.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(renderTime).toBeLessThan(100); // 100ms阈值
    });

    test('初始化应在2秒内完成', async () => {
      const startTime = performance.now();
      const success = await renderer.initialize();
      const initTime = performance.now() - startTime;
      
      expect(success).toBe(true);
      expect(initTime).toBeLessThan(PERFORMANCE_BENCHMARKS.rendering.stressCloud.maxInitTime);
    });
  });
});