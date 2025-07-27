/**
 * 深基坑土-结构耦合分析求解器单元测试
 * 3号计算专家 - 核心算法正确性验证
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { DeepExcavationSolver } from '../deepExcavationSolver';
import { STANDARD_EXCAVATION_CASES, PERFORMANCE_BENCHMARKS } from '../../test/fixtures/testData';

describe('DeepExcavationSolver - 土-结构耦合分析', () => {
  let solver: DeepExcavationSolver;

  beforeEach(() => {
    // 重置所有mock
    vi.clearAllMocks();
  });

  describe('求解器初始化', () => {
    test('应正确初始化小型基坑求解器', () => {
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      solver = new DeepExcavationSolver(testCase.parameters);
      
      expect(solver).toBeDefined();
      expect(solver.getAnalysisParameters).toBeDefined();
      expect(solver.performFullAnalysis).toBeDefined();
    });

    test('应正确初始化大型复杂基坑求解器', () => {
      const testCase = STANDARD_EXCAVATION_CASES.largeScale;
      solver = new DeepExcavationSolver(testCase.parameters);
      
      expect(solver).toBeDefined();
    });

    test('应拒绝无效的输入参数', () => {
      const invalidParameters = {
        ...STANDARD_EXCAVATION_CASES.smallScale.parameters,
        geometry: {
          ...STANDARD_EXCAVATION_CASES.smallScale.parameters.geometry,
          excavationDepth: -5 // 负深度无效
        }
      };

      expect(() => {
        new DeepExcavationSolver(invalidParameters);
      }).toThrow('开挖深度必须为正值');
    });
  });

  describe('土-结构耦合分析', () => {
    test('应正确计算小型基坑的变形分布', async () => {
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      solver = new DeepExcavationSolver(testCase.parameters);
      
      const startTime = performance.now();
      const results = await solver.performFullAnalysis();
      const computationTime = performance.now() - startTime;
      
      // 验证结果结构
      expect(results).toBeDefined();
      expect(results.deformationField).toBeDefined();
      expect(results.stressField).toBeDefined();
      expect(results.seepageField).toBeDefined();
      expect(results.mesh).toBeDefined();
      
      // 验证变形结果
      expect(results.deformationField.maxDisplacement).toBeLessThan(testCase.expectedResults.maxDeformation);
      expect(results.deformationField.magnitude.length).toBeGreaterThan(0);
      
      // 验证应力结果
      expect(results.stressField.vonMisesStress.length).toBeGreaterThan(0);
      expect(Math.max(...results.stressField.vonMisesStress)).toBeLessThan(testCase.expectedResults.maxStress * 1000); // 转换为Pa
      
      // 验证性能
      expect(computationTime).toBeLessThan(PERFORMANCE_BENCHMARKS.computation.smallExcavation.maxTime);
    });

    test('应正确计算大型基坑的复杂应力场', async () => {
      const testCase = STANDARD_EXCAVATION_CASES.largeScale;
      solver = new DeepExcavationSolver(testCase.parameters);
      
      const results = await solver.performFullAnalysis();
      
      // 验证应力分量完整性
      expect(results.stressField.components).toBeDefined();
      expect(results.stressField.components.sigmaX.length).toBeGreaterThan(0);
      expect(results.stressField.components.sigmaY.length).toBeGreaterThan(0);
      expect(results.stressField.components.sigmaZ.length).toBeGreaterThan(0);
      
      // 验证主应力
      expect(results.stressField.principalStresses).toBeDefined();
      expect(results.stressField.principalStresses.sigma1.length).toBeGreaterThan(0);
      
      // 验证应力统计
      const maxStress = Math.max(...results.stressField.vonMisesStress);
      expect(maxStress).toBeLessThan(testCase.expectedResults.maxStress * 1000);
    });

    test('应正确处理多层土体材料', async () => {
      const testCase = STANDARD_EXCAVATION_CASES.largeScale;
      solver = new DeepExcavationSolver(testCase.parameters);
      
      const results = await solver.performFullAnalysis();
      
      // 验证土层数据被正确处理
      expect(results.materialZones).toBeDefined();
      expect(results.materialZones.length).toBe(testCase.parameters.soilProperties.layers.length);
      
      // 验证每层土体的材料属性
      results.materialZones.forEach((zone, index) => {
        const layer = testCase.parameters.soilProperties.layers[index];
        expect(zone.elasticModulus).toBeCloseTo(layer.elasticModulus * 1e6, 1); // 转换为Pa
        expect(zone.poissonRatio).toBeCloseTo(layer.poissonRatio, 3);
      });
    });
  });

  describe('边界条件处理', () => {
    test('应正确应用围护结构边界条件', async () => {
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      solver = new DeepExcavationSolver(testCase.parameters);
      
      const results = await solver.performFullAnalysis();
      
      // 验证围护墙边界条件
      expect(results.boundaryConditions).toBeDefined();
      expect(results.boundaryConditions.retainingWall).toBeDefined();
      expect(results.boundaryConditions.retainingWall.thickness).toBe(testCase.parameters.retainingSystem.wallThickness);
    });

    test('应正确处理支撑系统约束', async () => {
      const testCase = STANDARD_EXCAVATION_CASES.largeScale;
      solver = new DeepExcavationSolver(testCase.parameters);
      
      const results = await solver.performFullAnalysis();
      
      // 验证支撑系统
      expect(results.supportSystem).toBeDefined();
      expect(results.supportSystem.levels.length).toBe(testCase.parameters.retainingSystem.supportLevels.length);
      
      // 验证支撑力
      results.supportSystem.levels.forEach((level, index) => {
        const expectedLevel = testCase.parameters.retainingSystem.supportLevels[index];
        expect(level.elevation).toBeCloseTo(expectedLevel.elevation, 1);
        expect(level.force).toBeLessThan(expectedLevel.prestressForce * 1.5); // 允许50%变化
      });
    });
  });

  describe('渗流-应力耦合', () => {
    test('应正确计算渗流场', async () => {
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      solver = new DeepExcavationSolver(testCase.parameters);
      
      const results = await solver.performFullAnalysis();
      
      // 验证渗流场结果
      expect(results.seepageField).toBeDefined();
      expect(results.seepageField.velocityVectors.length).toBeGreaterThan(0);
      expect(results.seepageField.poreWaterPressure.length).toBeGreaterThan(0);
      
      // 验证渗流速度合理性
      const maxVelocity = Math.max(...results.seepageField.velocityMagnitude);
      expect(maxVelocity).toBeLessThan(1e-3); // 合理的渗流速度范围
      expect(maxVelocity).toBeGreaterThan(0);
    });

    test('应正确计算孔隙水压力分布', async () => {
      const testCase = STANDARD_EXCAVATION_CASES.largeScale;
      solver = new DeepExcavationSolver(testCase.parameters);
      
      const results = await solver.performFullAnalysis();
      
      // 验证孔压分布
      const poreWaterPressure = results.seepageField.poreWaterPressure;
      expect(poreWaterPressure.length).toBeGreaterThan(0);
      
      // 验证孔压范围合理性
      const maxPorePressure = Math.max(...poreWaterPressure);
      const minPorePressure = Math.min(...poreWaterPressure);
      
      expect(maxPorePressure).toBeGreaterThan(0); // 应有正孔压
      expect(minPorePressure).toBeLessThan(maxPorePressure); // 应有压力梯度
    });
  });

  describe('网格质量验证', () => {
    test('应生成高质量计算网格', async () => {
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      solver = new DeepExcavationSolver(testCase.parameters);
      
      const results = await solver.performFullAnalysis();
      
      // 验证网格结构
      expect(results.mesh).toBeDefined();
      expect(results.mesh.vertices.length).toBeGreaterThan(0);
      expect(results.mesh.faces.length).toBeGreaterThan(0);
      expect(results.mesh.vertices.length % 3).toBe(0); // 3D坐标
      expect(results.mesh.faces.length % 3).toBe(0); // 三角形面
      
      // 验证网格质量
      expect(results.meshQuality).toBeDefined();
      expect(results.meshQuality.aspectRatio).toBeLessThan(3.0); // 良好的长宽比
      expect(results.meshQuality.minAngle).toBeGreaterThan(20); // 最小角度 > 20°
      expect(results.meshQuality.maxAngle).toBeLessThan(120); // 最大角度 < 120°
    });
  });

  describe('错误处理', () => {
    test('应正确处理计算收敛失败', async () => {
      // 创建收敛困难的极端参数
      const extremeParameters = {
        ...STANDARD_EXCAVATION_CASES.smallScale.parameters,
        soilProperties: {
          ...STANDARD_EXCAVATION_CASES.smallScale.parameters.soilProperties,
          layers: [
            {
              ...STANDARD_EXCAVATION_CASES.smallScale.parameters.soilProperties.layers[0],
              elasticModulus: 0.1, // 极低弹模
              poissonRatio: 0.49 // 接近不可压缩
            }
          ]
        }
      };

      solver = new DeepExcavationSolver(extremeParameters);
      
      await expect(solver.performFullAnalysis()).rejects.toThrow('计算收敛失败');
    });

    test('应正确处理内存不足情况', async () => {
      // Mock内存限制
      const originalMemory = (performance as any).memory;
      (performance as any).memory = {
        usedJSHeapSize: 7.5 * 1024 * 1024 * 1024, // 7.5GB
        totalJSHeapSize: 8 * 1024 * 1024 * 1024, // 8GB
        jsHeapSizeLimit: 8 * 1024 * 1024 * 1024 // 8GB
      };

      const testCase = STANDARD_EXCAVATION_CASES.largeScale;
      solver = new DeepExcavationSolver(testCase.parameters);
      
      await expect(solver.performFullAnalysis()).rejects.toThrow('内存不足');
      
      // 恢复原始内存设置
      (performance as any).memory = originalMemory;
    });
  });

  describe('性能测试', () => {
    test('小型基坑计算应在5秒内完成', async () => {
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      solver = new DeepExcavationSolver(testCase.parameters);
      
      const startTime = performance.now();
      await solver.performFullAnalysis();
      const computationTime = performance.now() - startTime;
      
      expect(computationTime).toBeLessThan(PERFORMANCE_BENCHMARKS.computation.smallExcavation.maxTime);
    });

    test('大型基坑计算应在15秒内完成', async () => {
      const testCase = STANDARD_EXCAVATION_CASES.largeScale;
      solver = new DeepExcavationSolver(testCase.parameters);
      
      const startTime = performance.now();
      await solver.performFullAnalysis();
      const computationTime = performance.now() - startTime;
      
      expect(computationTime).toBeLessThan(PERFORMANCE_BENCHMARKS.computation.largeExcavation.maxTime);
    });

    test('应有效管理内存使用', async () => {
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      solver = new DeepExcavationSolver(testCase.parameters);
      
      const initialMemory = (performance as any).memory.usedJSHeapSize;
      await solver.performFullAnalysis();
      const finalMemory = (performance as any).memory.usedJSHeapSize;
      
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_BENCHMARKS.computation.smallExcavation.maxMemory);
    });
  });

  describe('结果验证', () => {
    test('计算结果应满足工程安全标准', async () => {
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      solver = new DeepExcavationSolver(testCase.parameters);
      
      const results = await solver.performFullAnalysis();
      
      // 验证安全系数
      expect(results.safetyFactor.overall).toBeGreaterThan(1.2);
      expect(results.safetyFactor.local).toBeGreaterThan(1.1);
      
      // 验证变形控制
      expect(results.deformationField.maxDisplacement).toBeLessThan(30); // mm
      
      // 验证应力控制
      const maxStress = Math.max(...results.stressField.vonMisesStress) / 1000; // 转换为kPa
      expect(maxStress).toBeLessThan(300); // kPa
    });

    test('结果应具有物理合理性', async () => {
      const testCase = STANDARD_EXCAVATION_CASES.smallScale;
      solver = new DeepExcavationSolver(testCase.parameters);
      
      const results = await solver.performFullAnalysis();
      
      // 验证应力正定性
      results.stressField.vonMisesStress.forEach(stress => {
        expect(stress).toBeGreaterThanOrEqual(0);
      });
      
      // 验证变形连续性
      const displacements = results.deformationField.vectors;
      expect(displacements.length % 3).toBe(0); // 3D向量
      
      // 验证守恒定律
      const totalVolume = results.mesh.totalVolume;
      expect(totalVolume).toBeGreaterThan(0);
      expect(totalVolume).toBeLessThan(
        testCase.parameters.geometry.excavationWidth * 
        testCase.parameters.geometry.excavationLength * 
        testCase.parameters.geometry.excavationDepth * 2 // 合理的总体积范围
      );
    });
  });
});