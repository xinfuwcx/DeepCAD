/**
 * GPU加速演示示例
 * 3号计算专家第4周GPU优化任务演示
 */

import { 
  createGPUEnhancedPostprocessor,
  createIntegratedMultiphysicsSystem,
  type GPUPerformanceMetrics
} from '../services';

export class GPUAccelerationDemoManager {
  private gpuProcessor: any;
  private multiphysicsSystem: any;
  private canvas: HTMLCanvasElement | null = null;
  private performanceHistory: GPUPerformanceMetrics[] = [];

  constructor() {
    console.log('🚀 初始化GPU加速演示管理器...');
  }

  /**
   * 初始化GPU加速演示
   */
  async initializeDemo(canvasElement: HTMLCanvasElement): Promise<void> {
    this.canvas = canvasElement;
    
    console.log('⚡ 初始化GPU加速后处理系统...');
    
    // 创建GPU增强后处理器
    this.gpuProcessor = createGPUEnhancedPostprocessor({
      gpuAcceleration: {
        enabled: true,
        preferredMode: 'auto',
        workgroupSize: 128,
        enableMemoryPool: true,
        fallbackToCPU: true,
        batchSize: 2000,
        enableAsyncCompute: true
      },
      performance: {
        enableCaching: true,
        maxCacheSize: 100,
        enableProfiling: true,
        autoOptimization: true
      }
    });
    
    // 初始化GPU系统
    const gpuInitialized = await this.gpuProcessor.initialize();
    
    if (gpuInitialized) {
      console.log('✅ GPU加速系统初始化成功');
    } else {
      console.warn('⚠️ GPU加速不可用，将使用CPU模式');
    }
    
    // 创建集成多物理场系统
    this.multiphysicsSystem = createIntegratedMultiphysicsSystem({
      integration: {
        adaptationInterval: 2,
        qualityThreshold: 0.6,
        errorThreshold: 1e-3,
        maxAdaptationCycles: 2,
        convergenceTolerance: 1e-6
      }
    });
    
    console.log('🎯 GPU加速演示系统初始化完成');
  }

  /**
   * 执行GPU加速等值线生成演示
   */
  async demonstrateGPUContours(): Promise<void> {
    console.log('\n🎨 ==> GPU加速等值线生成演示 <==');
    
    if (!this.gpuProcessor) {
      throw new Error('GPU处理器未初始化');
    }
    
    try {
      // 生成测试数据 - 模拟大规模标量场
      const dataSize = 50000; // 50K数据点
      const fieldData = this.generateTestScalarField(dataSize);
      console.log(`📊 生成测试标量场: ${dataSize}个点`);
      
      // 定义等值线级别
      const levels = Array.from({length: 20}, (_, i) => i * 0.05);
      console.log(`📈 等值线级别: ${levels.length}个级别`);
      
      // GPU加速等值线生成
      const startTime = performance.now();
      const contourResult = await this.gpuProcessor.generateContoursGPU(
        fieldData,
        levels,
        {
          smoothing: true,
          colorMap: 'viridis',
          opacity: 0.8
        }
      );
      const totalTime = performance.now() - startTime;
      
      // 输出结果
      console.log(`🎉 等值线生成完成:`);
      console.log(`   模式: ${contourResult.mode.toUpperCase()}`);
      console.log(`   执行时间: ${contourResult.executionTime.toFixed(2)}ms`);
      console.log(`   总时间: ${totalTime.toFixed(2)}ms`);
      console.log(`   成功生成: ${contourResult.contours.length}条等值线`);
      
      // 记录性能数据
      this.recordPerformanceMetrics();
      
    } catch (error) {
      console.error('❌ GPU等值线演示失败:', error);
      throw error;
    }
  }

  /**
   * 执行GPU加速流线积分演示
   */
  async demonstrateGPUStreamlines(): Promise<void> {
    console.log('\n🌊 ==> GPU加速流线积分演示 <==');
    
    if (!this.gpuProcessor) {
      throw new Error('GPU处理器未初始化');
    }
    
    try {
      // 生成测试矢量场
      const vectorFieldSize = 30000; // 30K矢量点
      const vectorField = this.generateTestVectorField(vectorFieldSize);
      console.log(`🧭 生成测试矢量场: ${vectorFieldSize}个矢量点`);
      
      // 生成种子点
      const numSeeds = 50;
      const seedPoints = this.generateSeedPoints(numSeeds);
      console.log(`🌱 生成种子点: ${numSeeds}个种子`);
      
      // GPU加速流线积分
      const startTime = performance.now();
      const streamlineResult = await this.gpuProcessor.integrateStreamlinesGPU(
        vectorField,
        seedPoints,
        {
          stepSize: 0.05,
          maxSteps: 200,
          colorBy: 'velocity'
        }
      );
      const totalTime = performance.now() - startTime;
      
      // 输出结果
      console.log(`🎉 流线积分完成:`);
      console.log(`   模式: ${streamlineResult.mode.toUpperCase()}`);
      console.log(`   执行时间: ${streamlineResult.executionTime.toFixed(2)}ms`);
      console.log(`   总时间: ${totalTime.toFixed(2)}ms`);
      console.log(`   成功积分: ${streamlineResult.streamlines.length}条流线`);
      
      // 计算平均流线长度
      const avgLength = streamlineResult.streamlines.reduce((sum, s) => sum + s.length, 0) / streamlineResult.streamlines.length;
      console.log(`   平均流线长度: ${avgLength.toFixed(1)}个点`);
      
      // 记录性能数据
      this.recordPerformanceMetrics();
      
    } catch (error) {
      console.error('❌ GPU流线演示失败:', error);
      throw error;
    }
  }

  /**
   * 执行GPU加速矢量插值演示
   */
  async demonstrateGPUInterpolation(): Promise<void> {
    console.log('\n🔍 ==> GPU加速矢量插值演示 <==');
    
    if (!this.gpuProcessor) {
      throw new Error('GPU处理器未初始化');
    }
    
    try {
      // 生成插值点
      const numPoints = 10000;
      const interpolationPoints = this.generateInterpolationPoints(numPoints);
      console.log(`📍 生成插值点: ${numPoints}个点`);
      
      // 生成基础矢量场
      const vectorFieldSize = 5000;
      const baseVectorField = this.generateTestVectorField(vectorFieldSize);
      console.log(`🧭 基础矢量场: ${vectorFieldSize}个矢量`);
      
      // GPU加速插值
      const startTime = performance.now();
      const interpolationResult = await this.gpuProcessor.interpolateVectorFieldGPU(
        interpolationPoints,
        baseVectorField,
        {
          neighbors: 12,
          smoothRadius: 0.15,
          method: 'idw'
        }
      );
      const totalTime = performance.now() - startTime;
      
      // 输出结果
      console.log(`🎉 矢量插值完成:`);
      console.log(`   模式: ${interpolationResult.mode.toUpperCase()}`);
      console.log(`   执行时间: ${interpolationResult.executionTime.toFixed(2)}ms`);
      console.log(`   总时间: ${totalTime.toFixed(2)}ms`);
      console.log(`   插值数据大小: ${interpolationResult.interpolatedData.length}个值`);
      
      // 记录性能数据
      this.recordPerformanceMetrics();
      
    } catch (error) {
      console.error('❌ GPU插值演示失败:', error);
      throw error;
    }
  }

  /**
   * 执行批量GPU计算演示
   */
  async demonstrateBatchGPUCompute(): Promise<void> {
    console.log('\n⚡ ==> 批量GPU计算演示 <==');
    
    if (!this.gpuProcessor) {
      throw new Error('GPU处理器未初始化');
    }
    
    try {
      // 准备批量计算任务
      const tasks = [
        {
          type: 'field_processing' as const,
          data: this.generateTestScalarField(8000),
          parameters: { scale: 2.0, offset: 0.1 }
        },
        {
          type: 'vector_interpolation' as const,
          data: this.generateInterpolationPoints(5000),
          parameters: { neighbors: 8, smoothRadius: 0.1 }
        },
        {
          type: 'field_processing' as const,
          data: this.generateTestScalarField(12000),
          parameters: { scale: 1.5, offset: -0.2 }
        },
        {
          type: 'vector_interpolation' as const,
          data: this.generateInterpolationPoints(7000),
          parameters: { neighbors: 16, smoothRadius: 0.2 }
        }
      ];
      
      console.log(`📦 准备批量任务: ${tasks.length}个任务`);
      tasks.forEach((task, index) => {
        console.log(`   任务${index + 1}: ${task.type} (${task.data.length}个数据点)`);
      });
      
      // 执行批量计算
      const startTime = performance.now();
      const batchResults = await this.gpuProcessor.batchCompute(tasks);
      const totalTime = performance.now() - startTime;
      
      // 统计结果
      const gpuTasks = batchResults.filter(r => r.mode === 'gpu').length;
      const cpuTasks = batchResults.filter(r => r.mode === 'cpu').length;
      const avgExecutionTime = batchResults.reduce((sum, r) => sum + r.executionTime, 0) / batchResults.length;
      
      console.log(`🎉 批量计算完成:`);
      console.log(`   总时间: ${totalTime.toFixed(2)}ms`);
      console.log(`   GPU任务: ${gpuTasks}个`);
      console.log(`   CPU回退: ${cpuTasks}个`);
      console.log(`   平均执行时间: ${avgExecutionTime.toFixed(2)}ms`);
      console.log(`   并行效率: ${((tasks.length * avgExecutionTime) / totalTime).toFixed(2)}x`);
      
      // 记录性能数据
      this.recordPerformanceMetrics();
      
    } catch (error) {
      console.error('❌ 批量GPU计算演示失败:', error);
      throw error;
    }
  }

  /**
   * 完整的GPU加速工作流演示
   */
  async runCompleteGPUWorkflow(): Promise<void> {
    console.log('\n🚀 ==> 完整GPU加速工作流演示 <==');
    
    const startTime = performance.now();
    
    try {
      // 1. GPU等值线生成
      console.log('\n1️⃣ 执行GPU等值线生成...');
      await this.demonstrateGPUContours();
      
      // 2. GPU流线积分  
      console.log('\n2️⃣ 执行GPU流线积分...');
      await this.demonstrateGPUStreamlines();
      
      // 3. GPU矢量插值
      console.log('\n3️⃣ 执行GPU矢量插值...');
      await this.demonstrateGPUInterpolation();
      
      // 4. 批量GPU计算
      console.log('\n4️⃣ 执行批量GPU计算...');
      await this.demonstrateBatchGPUCompute();
      
      const totalWorkflowTime = performance.now() - startTime;
      
      // 生成完整工作流报告
      this.generateWorkflowReport(totalWorkflowTime);
      
    } catch (error) {
      console.error('❌ 完整GPU工作流失败:', error);
      throw error;
    }
  }

  /**
   * 生成工作流报告
   */
  private generateWorkflowReport(totalTime: number): void {
    console.log('\n📊 ==> GPU加速工作流报告 <==');
    
    const metrics = this.gpuProcessor.getGPUPerformanceMetrics();
    const suggestions = this.gpuProcessor.getOptimizationSuggestions();
    
    console.log(`⏱️ 总执行时间: ${totalTime.toFixed(2)}ms`);
    console.log(`🔥 GPU状态: ${metrics.gpuStatus?.currentMode || 'N/A'}`);
    console.log(`📈 性能统计:`);
    console.log(`   总计算任务: ${metrics.totalComputations}`);
    console.log(`   GPU任务: ${metrics.gpuComputations}`);
    console.log(`   CPU回退: ${metrics.cpuFallbacks}`);
    console.log(`   GPU成功率: ${(metrics.gpuComputations / metrics.totalComputations * 100).toFixed(1)}%`);
    console.log(`   平均GPU时间: ${metrics.averageGPUTime.toFixed(2)}ms`);
    console.log(`   平均CPU时间: ${metrics.averageCPUTime.toFixed(2)}ms`);
    console.log(`   GPU加速比: ${metrics.gpuSpeedup.toFixed(2)}x`);
    
    console.log(`💾 内存使用:`);
    console.log(`   峰值: ${metrics.memoryUsage.peak.toFixed(2)}MB`);
    console.log(`   当前: ${metrics.memoryUsage.current.toFixed(2)}MB`);
    
    console.log(`🗄️ 缓存统计:`);
    console.log(`   缓存条目: ${metrics.cacheStats.size}`);
    console.log(`   命中率: ${(metrics.cacheStats.hitRate * 100).toFixed(1)}%`);
    console.log(`   缓存内存: ${metrics.cacheStats.memoryUsage.toFixed(2)}MB`);
    
    if (suggestions.length > 0) {
      console.log(`💡 优化建议:`);
      suggestions.forEach(suggestion => console.log(`   ${suggestion}`));
    }
    
    // GPU与CPU性能对比总结
    this.generatePerformanceComparison();
  }

  /**
   * 生成性能对比分析
   */
  private generatePerformanceComparison(): void {
    console.log('\n📊 ==> GPU vs CPU 性能对比分析 <==');
    
    const metrics = this.gpuProcessor.getGPUPerformanceMetrics();
    
    if (metrics.gpuComputations > 0 && metrics.cpuFallbacks > 0) {
      const speedupRatio = metrics.gpuSpeedup;
      const efficiency = metrics.gpuComputations / (metrics.gpuComputations + metrics.cpuFallbacks);
      
      console.log(`🏃‍♂️ 性能提升:`);
      console.log(`   GPU相对CPU加速: ${speedupRatio.toFixed(2)}x`);
      console.log(`   GPU使用效率: ${(efficiency * 100).toFixed(1)}%`);
      
      if (speedupRatio > 3.0) {
        console.log(`✨ 优秀! GPU加速效果显著`);
      } else if (speedupRatio > 1.5) {
        console.log(`✅ 良好，GPU加速有效`);
      } else {
        console.log(`⚠️ 一般，考虑优化GPU配置`);
      }
      
      // 计算理论最大性能提升
      const theoreticalMax = this.calculateTheoreticalSpeedup();
      console.log(`🎯 理论最大加速比: ${theoreticalMax.toFixed(2)}x`);
      console.log(`📈 当前实现率: ${(speedupRatio / theoreticalMax * 100).toFixed(1)}%`);
      
    } else {
      console.log(`ℹ️ 性能对比数据不足，建议运行更多测试`);
    }
  }

  /**
   * 计算理论最大加速比
   */
  private calculateTheoreticalSpeedup(): number {
    // 基于Amdahl定律的简化计算
    // 假设90%的计算可以并行化
    const parallelPortion = 0.9;
    const serialPortion = 1 - parallelPortion;
    
    // 假设GPU有64个并行单元
    const parallelUnits = 64;
    
    return 1 / (serialPortion + parallelPortion / parallelUnits);
  }

  /**
   * 记录性能指标
   */
  private recordPerformanceMetrics(): void {
    if (this.gpuProcessor) {
      const metrics = this.gpuProcessor.getGPUPerformanceMetrics();
      this.performanceHistory.push({...metrics});
      
      // 保持最近50次记录
      if (this.performanceHistory.length > 50) {
        this.performanceHistory.shift();
      }
    }
  }

  /**
   * 获取性能历史趋势
   */
  getPerformanceTrend(): {
    gpuSpeedupTrend: number[];
    memoryUsageTrend: number[];
    gpuEfficiencyTrend: number[];
  } {
    return {
      gpuSpeedupTrend: this.performanceHistory.map(m => m.gpuSpeedup),
      memoryUsageTrend: this.performanceHistory.map(m => m.memoryUsage.peak),
      gpuEfficiencyTrend: this.performanceHistory.map(m => 
        m.totalComputations > 0 ? m.gpuComputations / m.totalComputations : 0
      )
    };
  }

  /**
   * 清理演示资源
   */
  dispose(): void {
    console.log('🧹 清理GPU演示资源...');
    
    if (this.gpuProcessor) {
      this.gpuProcessor.dispose();
    }
    
    if (this.multiphysicsSystem) {
      this.multiphysicsSystem.stopSolver();
    }
    
    this.performanceHistory.length = 0;
    console.log('✅ GPU演示资源清理完成');
  }

  // 测试数据生成方法

  private generateTestScalarField(size: number): Float32Array {
    const data = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      const x = (i % 100) / 100;
      const y = Math.floor(i / 100) / 100;
      // 生成复杂的标量场模式
      data[i] = Math.sin(x * Math.PI * 4) * Math.cos(y * Math.PI * 6) + 
                Math.random() * 0.1 + 
                Math.exp(-(x - 0.5) * (x - 0.5) - (y - 0.5) * (y - 0.5));
    }
    return data;
  }

  private generateTestVectorField(size: number): Float32Array {
    const data = new Float32Array(size * 3);
    for (let i = 0; i < size; i++) {
      const x = (i % 100) / 100;
      const y = Math.floor(i / 100) / 100;
      
      // 生成旋涡式矢量场
      const cx = x - 0.5;
      const cy = y - 0.5;
      const r = Math.sqrt(cx * cx + cy * cy);
      
      data[i * 3] = -cy * Math.exp(-r * 2) + Math.random() * 0.05;
      data[i * 3 + 1] = cx * Math.exp(-r * 2) + Math.random() * 0.05;  
      data[i * 3 + 2] = Math.sin(r * Math.PI * 2) * 0.1;
    }
    return data;
  }

  private generateSeedPoints(numSeeds: number): number[][] {
    const points: number[][] = [];
    for (let i = 0; i < numSeeds; i++) {
      points.push([
        Math.random(),
        Math.random(),
        Math.random() * 0.1
      ]);
    }
    return points;
  }

  private generateInterpolationPoints(numPoints: number): Float32Array {
    const points = new Float32Array(numPoints * 3);
    for (let i = 0; i < numPoints; i++) {
      points[i * 3] = Math.random();
      points[i * 3 + 1] = Math.random();
      points[i * 3 + 2] = Math.random() * 0.1;
    }
    return points;
  }
}

// 导出便捷函数
export function createGPUAccelerationDemo(): GPUAccelerationDemoManager {
  return new GPUAccelerationDemoManager();
}

// 使用示例常量
export const GPU_DEMO_USAGE = `
// GPU加速演示使用示例:
const demo = createGPUAccelerationDemo();

// 1. 初始化演示系统
await demo.initializeDemo(canvasElement);

// 2. 运行完整工作流演示
await demo.runCompleteGPUWorkflow();

// 3. 获取性能趋势分析
const trends = demo.getPerformanceTrend();
console.log('GPU性能趋势:', trends);

// 4. 清理资源
demo.dispose();
`;

console.log('🚀 GPU加速演示模块已就绪 - 支持WebGPU/WebGL并行计算');