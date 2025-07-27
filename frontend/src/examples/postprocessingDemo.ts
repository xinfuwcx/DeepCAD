/**
 * 高级后处理系统使用示例
 * 3号计算专家 - 展示完整的可视化workflow
 */

import { 
  createAdvancedPostprocessor, 
  createIntegratedMultiphysicsSystem,
  type VisualizationData,
  type ContourOptions,
  type VectorOptions,
  type StreamlineOptions
} from '../services';

export class PostprocessingDemoManager {
  private postprocessor: any;
  private multiphysicsSystem: any;
  private canvas: HTMLCanvasElement | null = null;

  constructor() {
    // 初始化后处理系统
    this.postprocessor = createAdvancedPostprocessor({
      fieldVisualization: {
        enableContours: true,
        contourLevels: 15,
        enableVectors: true,
        vectorScale: 1.5,
        enableStreamlines: true,
        streamlineDensity: 0.2
      },
      meshVisualization: {
        showMeshLines: true,
        showNodeNumbers: false,
        showElementNumbers: false,
        meshOpacity: 0.7,
        highlightBoundaries: true
      },
      animation: {
        enableTimeAnimation: true,
        frameRate: 30,
        animationSpeed: 1.0,
        loopAnimation: true
      },
      export: {
        imageFormat: 'png',
        videoFormat: 'mp4',
        resolution: 'high',
        includeColorbar: true
      }
    });

    // 初始化集成多物理场系统
    this.multiphysicsSystem = createIntegratedMultiphysicsSystem({
      integration: {
        adaptationInterval: 3,
        qualityThreshold: 0.5,
        errorThreshold: 1e-3,
        maxAdaptationCycles: 3,
        convergenceTolerance: 1e-6
      }
    });
  }

  /**
   * 初始化可视化canvas
   */
  async initializeCanvas(canvasElement: HTMLCanvasElement): Promise<void> {
    this.canvas = canvasElement;
    await this.postprocessor.initializeVisualization(canvasElement);
    console.log('🎨 后处理可视化环境已初始化');
  }

  /**
   * 执行完整的多物理场求解和可视化workflow
   */
  async runCompleteWorkflow(
    initialMesh: any,
    boundaryConditions: any,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<void> {

    console.log('🚀 开始完整的后处理workflow...');

    try {
      // 1. 执行集成多物理场求解
      if (onProgress) onProgress('多物理场求解', 0);
      
      const solutionHistory = await this.multiphysicsSystem.solveIntegratedProblem(
        initialMesh,
        boundaryConditions,
        (progress, solution) => {
          if (onProgress) onProgress('多物理场求解', progress);
          console.log(`求解进度: ${progress.toFixed(1)}%, 时间: ${solution.currentTime.toFixed(2)}s`);
        }
      );

      // 2. 提取最终解用于可视化
      const finalSolution = solutionHistory[solutionHistory.length - 1];
      
      // 3. 构建可视化数据
      if (onProgress) onProgress('准备可视化数据', 80);
      const vizData = this.buildVisualizationData(initialMesh, finalSolution);
      
      // 4. 加载数据到后处理系统
      this.postprocessor.loadVisualizationData(vizData);
      
      // 5. 创建等值线图 - 显示压力分布
      if (onProgress) onProgress('生成压力等值线', 85);
      await this.postprocessor.createContours({
        fieldName: 'pressure',
        levels: 'auto',
        colorMap: 'viridis',
        opacity: 0.8,
        smoothing: true
      } as ContourOptions);

      // 6. 创建矢量场 - 显示渗流速度
      if (onProgress) onProgress('生成速度矢量图', 90);
      await this.postprocessor.createVectorField({
        fieldName: 'seepage_velocity',
        scale: 2.0,
        color: 'magnitude',
        arrowSize: 0.5,
        density: 0.3
      } as VectorOptions);

      // 7. 创建流线 - 显示流动路径
      if (onProgress) onProgress('生成流线图', 95);
      const seedPoints = this.generateSeedPoints(initialMesh);
      await this.postprocessor.createStreamlines({
        fieldName: 'seepage_velocity',
        seedPoints: seedPoints,
        stepSize: 0.1,
        maxSteps: 100,
        colorBy: 'velocity'
      } as StreamlineOptions);

      // 8. 启动渲染循环
      this.postprocessor.startRenderLoop();
      
      if (onProgress) onProgress('可视化完成', 100);
      console.log('🎉 完整workflow执行成功！');

      // 9. 生成报告
      this.generateWorkflowReport(solutionHistory, finalSolution);

    } catch (error) {
      console.error('❌ Workflow执行失败:', error);
      throw error;
    }
  }

  /**
   * 构建可视化数据结构
   */
  private buildVisualizationData(mesh: any, solution: any): VisualizationData {
    // 计算边界框
    const vertices = mesh.vertices || new Float32Array();
    const boundingBox = this.calculateBoundingBox(vertices);

    // 构建标量场数据
    const scalarFields = new Map();
    
    // 压力场
    if (solution.physicsData.pressure) {
      scalarFields.set('pressure', {
        name: '孔隙压力',
        data: solution.physicsData.pressure,
        range: this.calculateRange(solution.physicsData.pressure),
        units: 'Pa',
        description: '土体中的孔隙水压力分布'
      });
    }

    // 应力场（取von Mises应力）
    if (solution.physicsData.stress) {
      const vonMisesStress = this.calculateVonMisesStress(solution.physicsData.stress);
      scalarFields.set('stress', {
        name: 'von Mises应力',
        data: vonMisesStress,
        range: this.calculateRange(vonMisesStress),
        units: 'Pa',
        description: '土体中的等效应力分布'
      });
    }

    // 构建矢量场数据
    const vectorFields = new Map();
    
    // 渗流速度场
    if (solution.physicsData.seepageVelocity) {
      const magnitude = this.calculateVectorMagnitude(solution.physicsData.seepageVelocity);
      vectorFields.set('seepage_velocity', {
        name: '渗流速度',
        data: solution.physicsData.seepageVelocity,
        magnitude: magnitude,
        range: this.calculateRange(magnitude),
        units: 'm/s',
        description: '土体中的渗流速度矢量场'
      });
    }

    // 位移场
    if (solution.physicsData.displacement) {
      const magnitude = this.calculateVectorMagnitude(solution.physicsData.displacement);
      vectorFields.set('displacement', {
        name: '位移',
        data: solution.physicsData.displacement,
        magnitude: magnitude,
        range: this.calculateRange(magnitude),
        units: 'm',
        description: '土体的位移矢量场'
      });
    }

    return {
      geometry: {
        vertices: vertices,
        faces: mesh.faces || new Uint32Array(),
        normals: mesh.normals || new Float32Array(),
        boundingBox: boundingBox
      },
      scalarFields: scalarFields,
      vectorFields: vectorFields,
      timeSteps: [solution.currentTime],
      currentTimeStep: 0
    };
  }

  /**
   * 生成种子点用于流线可视化
   */
  private generateSeedPoints(mesh: any): number[][] {
    const seedPoints: number[][] = [];
    const vertices = mesh.vertices;
    
    if (!vertices || vertices.length === 0) return seedPoints;

    // 在边界附近生成种子点
    const numPoints = 20;
    const step = Math.floor(vertices.length / (numPoints * 3));
    
    for (let i = 0; i < vertices.length; i += step * 3) {
      if (i + 2 < vertices.length) {
        seedPoints.push([
          vertices[i],
          vertices[i + 1],
          vertices[i + 2]
        ]);
      }
    }

    return seedPoints;
  }

  /**
   * 计算边界框
   */
  private calculateBoundingBox(vertices: Float32Array): { min: [number, number, number], max: [number, number, number] } {
    if (vertices.length === 0) {
      return { min: [0, 0, 0], max: [1, 1, 1] };
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < vertices.length; i += 3) {
      minX = Math.min(minX, vertices[i]);
      maxX = Math.max(maxX, vertices[i]);
      minY = Math.min(minY, vertices[i + 1]);
      maxY = Math.max(maxY, vertices[i + 1]);
      minZ = Math.min(minZ, vertices[i + 2]);
      maxZ = Math.max(maxZ, vertices[i + 2]);
    }

    return {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ]
    };
  }

  /**
   * 计算数据范围
   */
  private calculateRange(data: Float32Array): [number, number] {
    if (data.length === 0) return [0, 1];
    
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < data.length; i++) {
      min = Math.min(min, data[i]);
      max = Math.max(max, data[i]);
    }
    return [min, max];
  }

  /**
   * 计算von Mises应力
   */
  private calculateVonMisesStress(stressData: Float32Array): Float32Array {
    const numNodes = stressData.length / 6;
    const vonMises = new Float32Array(numNodes);
    
    for (let i = 0; i < numNodes; i++) {
      const base = i * 6;
      const sx = stressData[base];
      const sy = stressData[base + 1];
      const sz = stressData[base + 2];
      const txy = stressData[base + 3];
      const txz = stressData[base + 4];
      const tyz = stressData[base + 5];
      
      // von Mises应力公式
      vonMises[i] = Math.sqrt(
        0.5 * ((sx - sy) ** 2 + (sy - sz) ** 2 + (sz - sx) ** 2) +
        3 * (txy ** 2 + txz ** 2 + tyz ** 2)
      );
    }
    
    return vonMises;
  }

  /**
   * 计算矢量量值
   */
  private calculateVectorMagnitude(vectorData: Float32Array): Float32Array {
    const numNodes = vectorData.length / 3;
    const magnitude = new Float32Array(numNodes);
    
    for (let i = 0; i < numNodes; i++) {
      const base = i * 3;
      const vx = vectorData[base];
      const vy = vectorData[base + 1];
      const vz = vectorData[base + 2];
      magnitude[i] = Math.sqrt(vx * vx + vy * vy + vz * vz);
    }
    
    return magnitude;
  }

  /**
   * 生成workflow报告
   */
  private generateWorkflowReport(solutionHistory: any[], finalSolution: any): void {
    console.log('\n=== 后处理Workflow执行报告 ===');
    console.log(`📊 求解统计:`);
    console.log(`   总时间步数: ${solutionHistory.length}`);
    console.log(`   最终时间: ${finalSolution.currentTime.toFixed(2)}s`);
    console.log(`   网格规模: ${finalSolution.meshData.nodes}节点, ${finalSolution.meshData.elements}单元`);
    console.log(`   网格质量: ${finalSolution.meshData.quality.toFixed(3)}`);
    console.log(`   收敛状态: ${finalSolution.convergenceInfo.isConverged ? '✅收敛' : '❌未收敛'}`);
    
    console.log(`\n🎨 可视化内容:`);
    console.log(`   ✅ 压力等值线图`);
    console.log(`   ✅ 渗流速度矢量图`);
    console.log(`   ✅ 流线可视化`);
    console.log(`   ✅ 自适应网格显示`);
    
    console.log(`\n📈 系统性能:`);
    console.log(`   网格自适应次数: ${finalSolution.meshData.adaptationCount}`);
    console.log(`   求解迭代次数: ${finalSolution.convergenceInfo.iterations}`);
    console.log(`   最终残差: ${finalSolution.convergenceInfo.residual.toExponential(3)}`);
  }

  /**
   * 导出可视化结果
   */
  async exportResults(filename: string = 'deepcad_results'): Promise<void> {
    if (!this.postprocessor) {
      throw new Error('后处理系统未初始化');
    }

    console.log('📸 导出可视化结果...');
    this.postprocessor.exportImage(filename);
    console.log(`✅ 结果已导出: ${filename}.png`);
  }

  /**
   * 获取系统状态
   */
  getSystemStatus(): { 
    isInitialized: boolean;
    canvasReady: boolean;
    systemInfo: string;
  } {
    return {
      isInitialized: !!this.postprocessor && !!this.multiphysicsSystem,
      canvasReady: !!this.canvas,
      systemInfo: '3号计算专家高级后处理系统 v1.0 - 支持多物理场耦合+自适应网格+实时可视化'
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.postprocessor) {
      this.postprocessor.dispose();
    }
    if (this.multiphysicsSystem) {
      this.multiphysicsSystem.stopSolver();
    }
    console.log('🧹 后处理系统已清理');
  }
}

// 导出便捷函数
export function createPostprocessingDemo(): PostprocessingDemoManager {
  return new PostprocessingDemoManager();
}

// 使用示例
export const DEMO_USAGE_EXAMPLE = `
// 使用示例:
const demo = createPostprocessingDemo();

// 1. 初始化
await demo.initializeCanvas(canvasElement);

// 2. 执行完整workflow
await demo.runCompleteWorkflow(
  meshData, 
  boundaryConditions,
  (stage, progress) => console.log(\`\${stage}: \${progress}%\`)
);

// 3. 导出结果
await demo.exportResults('my_analysis_results');

// 4. 清理
demo.dispose();
`;