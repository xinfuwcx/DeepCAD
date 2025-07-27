/**
 * 自适应网格与多物理场求解器集成模块
 * 3号计算专家第4周高级集成任务
 */

import { AdaptiveMeshAlgorithm, createAdaptiveMeshAlgorithm, AdaptiveMeshConfig } from './adaptiveMeshAlgorithm';
import { MultiphysicsSolver, createSeepageStressSolver, SeepageStressCouplingParams, MultiphysicsSolverConfig } from './multiphysicsSolver';

export interface IntegratedSolverConfig {
  // 网格自适应配置
  meshConfig: AdaptiveMeshConfig;
  
  // 多物理场求解配置
  physicsConfig: SeepageStressCouplingParams;
  solverConfig: MultiphysicsSolverConfig;
  
  // 集成控制参数
  integration: {
    adaptationInterval: number; // 每N个时间步执行一次网格自适应
    qualityThreshold: number; // 触发网格优化的质量阈值
    errorThreshold: number; // 触发网格细化的误差阈值
    maxAdaptationCycles: number; // 单个时间步最大自适应次数
    convergenceTolerance: number; // 耦合收敛容差
  };
}

export interface IntegratedSolution {
  timeStep: number;
  currentTime: number;
  meshData: {
    nodes: number;
    elements: number;
    quality: number;
    adaptationCount: number;
  };
  physicsData: {
    pressure: Float32Array;
    displacement: Float32Array;
    stress: Float32Array;
    seepageVelocity: Float32Array;
  };
  convergenceInfo: {
    isConverged: boolean;
    iterations: number;
    residual: number;
  };
}

export class IntegratedMultiphysicsSystem {
  private meshAlgorithm: AdaptiveMeshAlgorithm;
  private physicsSolver: MultiphysicsSolver;
  private config: IntegratedSolverConfig;
  private currentMesh: any;
  private solutionHistory: IntegratedSolution[] = [];
  private isRunning: boolean = false;

  constructor(config: IntegratedSolverConfig) {
    this.config = config;
    this.meshAlgorithm = createAdaptiveMeshAlgorithm(config.meshConfig);
    this.physicsSolver = createSeepageStressSolver(config.physicsConfig, config.solverConfig);
    this.currentMesh = null;
  }

  /**
   * 主要的集成求解循环
   */
  async solveIntegratedProblem(
    initialMesh: any,
    boundaryConditions: any,
    onProgress?: (progress: number, solution: IntegratedSolution) => void
  ): Promise<IntegratedSolution[]> {
    
    this.isRunning = true;
    console.log('🚀 开始集成多物理场-自适应网格求解...');
    
    try {
      this.currentMesh = initialMesh;
      let currentTime = 0;
      let timeStep = this.config.solverConfig.initialTimeStep;
      let adaptationCounter = 0;
      
      while (currentTime < this.config.solverConfig.totalTime && this.isRunning) {
        
        console.log(`\n⏰ 时间步: ${currentTime.toFixed(2)}s -> ${(currentTime + timeStep).toFixed(2)}s`);
        
        // 1. 执行多物理场求解
        const physicsResult = await this.physicsSolver.solveCoupledProblem(
          this.currentMesh,
          boundaryConditions,
          (progress, state) => {
            console.log(`  🔄 物理场求解进度: ${progress.toFixed(1)}%`);
          }
        );
        
        // 2. 检查是否需要网格自适应
        const needsAdaptation = this.checkAdaptationCriteria(physicsResult, adaptationCounter);
        
        if (needsAdaptation) {
          console.log('🔧 执行网格自适应...');
          
          // 执行网格自适应
          const adaptationResult = await this.meshAlgorithm.performMeshAdaptation(
            this.currentMesh,
            {
              displacement: physicsResult.displacementField,
              stress: physicsResult.effectiveStress,
              pressure: physicsResult.pressureField
            },
            (progress, stage) => {
              console.log(`  📐 网格自适应: ${stage} (${progress.toFixed(1)}%)`);
            }
          );
          
          if (adaptationResult.success) {
            // 更新网格数据
            this.updateMeshFromAdaptation(adaptationResult);
            adaptationCounter++;
            
            console.log(`✅ 网格自适应完成: 质量提升${(adaptationResult.statistics.qualityImprovement * 100).toFixed(1)}%`);
            
            // 重新求解物理场（网格改变后）
            const recomputedResult = await this.physicsSolver.solveCoupledProblem(
              this.currentMesh,
              boundaryConditions
            );
            
            // 更新物理场结果
            Object.assign(physicsResult, recomputedResult);
          }
        }
        
        // 3. 生成集成解
        const integratedSolution: IntegratedSolution = {
          timeStep: Math.floor(currentTime / timeStep),
          currentTime,
          meshData: {
            nodes: this.meshAlgorithm.getMeshStatistics().nodes,
            elements: this.meshAlgorithm.getMeshStatistics().elements,
            quality: this.meshAlgorithm.getMeshStatistics().avgQuality,
            adaptationCount: adaptationCounter
          },
          physicsData: {
            pressure: physicsResult.pressureField,
            displacement: physicsResult.displacementField,
            stress: physicsResult.effectiveStress,
            seepageVelocity: physicsResult.seepageVelocity
          },
          convergenceInfo: {
            isConverged: physicsResult.isConverged,
            iterations: physicsResult.iteration,
            residual: physicsResult.residualNorm
          }
        };
        
        this.solutionHistory.push(integratedSolution);
        
        // 4. 报告进度
        if (onProgress) {
          const overallProgress = (currentTime / this.config.solverConfig.totalTime) * 100;
          onProgress(overallProgress, integratedSolution);
        }
        
        // 5. 时间步长控制
        currentTime += timeStep;
        timeStep = this.adaptTimeStep(timeStep, physicsResult);
        
        // 重置自适应计数器
        if (adaptationCounter >= this.config.integration.maxAdaptationCycles) {
          adaptationCounter = 0;
        }
      }
      
      console.log('🎉 集成多物理场求解完成！');
      console.log(this.generateFinalReport());
      
      return this.solutionHistory;
      
    } catch (error) {
      console.error('❌ 集成求解失败:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 检查网格自适应触发条件
   */
  private checkAdaptationCriteria(physicsResult: any, adaptationCounter: number): boolean {
    // 1. 检查自适应间隔
    if (adaptationCounter < this.config.integration.adaptationInterval) {
      return false;
    }
    
    // 2. 检查网格质量
    const meshStats = this.meshAlgorithm.getMeshStatistics();
    if (meshStats.avgQuality < this.config.integration.qualityThreshold) {
      console.log(`🎯 网格质量触发自适应: ${meshStats.avgQuality.toFixed(3)} < ${this.config.integration.qualityThreshold}`);
      return true;
    }
    
    // 3. 检查求解误差
    if (meshStats.totalError > this.config.integration.errorThreshold) {
      console.log(`🎯 求解误差触发自适应: ${meshStats.totalError.toExponential(3)} > ${this.config.integration.errorThreshold.toExponential(3)}`);
      return true;
    }
    
    // 4. 检查收敛性问题
    if (!physicsResult.isConverged || physicsResult.residualNorm > this.config.integration.convergenceTolerance * 10) {
      console.log('🎯 收敛性问题触发自适应');
      return true;
    }
    
    return false;
  }

  /**
   * 根据网格自适应结果更新当前网格
   */
  private updateMeshFromAdaptation(adaptationResult: any): void {
    // 这里应该根据自适应结果更新网格数据结构
    // 暂时模拟网格更新过程
    
    console.log('🔄 更新网格数据结构...');
    
    // 模拟更新后的网格参数
    if (this.currentMesh.vertices) {
      const scaleFactor = 1 + (adaptationResult.statistics.refinedElements - adaptationResult.statistics.coarsenedElements) * 0.1;
      this.currentMesh.elementCount = Math.floor(this.currentMesh.elementCount * scaleFactor);
    }
    
    console.log(`✅ 网格更新完成: 新单元数=${this.currentMesh.elementCount || 'unknown'}`);
  }

  /**
   * 时间步长自适应控制
   */
  private adaptTimeStep(currentTimeStep: number, physicsResult: any): number {
    // 基于收敛性和网格质量调整时间步长
    const meshQuality = this.meshAlgorithm.getMeshStatistics().avgQuality;
    const convergenceRatio = physicsResult.residualNorm / this.config.integration.convergenceTolerance;
    
    let timeStepFactor = 1.0;
    
    // 根据网格质量调整
    if (meshQuality > 0.8) {
      timeStepFactor *= 1.1; // 高质量网格可以用更大时间步长
    } else if (meshQuality < 0.5) {
      timeStepFactor *= 0.8; // 低质量网格需要小时间步长
    }
    
    // 根据收敛性调整
    if (convergenceRatio < 0.1) {
      timeStepFactor *= 1.2; // 快速收敛
    } else if (convergenceRatio > 1.0) {
      timeStepFactor *= 0.7; // 收敛困难
    }
    
    const newTimeStep = currentTimeStep * timeStepFactor;
    return Math.max(
      this.config.solverConfig.minTimeStep,
      Math.min(newTimeStep, this.config.solverConfig.maxTimeStep)
    );
  }

  /**
   * 生成最终报告
   */
  public generateFinalReport(): string {
    const totalSolutions = this.solutionHistory.length;
    if (totalSolutions === 0) return '无求解历史数据';
    
    const lastSolution = this.solutionHistory[totalSolutions - 1];
    const totalAdaptations = Math.max(...this.solutionHistory.map(s => s.meshData.adaptationCount));
    
    let report = '\n=== 集成多物理场求解报告 ===\n\n';
    
    // 求解统计
    report += `求解统计:\n`;
    report += `  总时间步数: ${totalSolutions}\n`;
    report += `  模拟时间: ${lastSolution.currentTime.toFixed(2)}s\n`;
    report += `  网格自适应次数: ${totalAdaptations}\n`;
    report += `  最终网格规模: ${lastSolution.meshData.nodes}节点, ${lastSolution.meshData.elements}单元\n`;
    report += `  最终网格质量: ${lastSolution.meshData.quality.toFixed(3)}\n\n`;
    
    // 收敛性分析
    const convergedSteps = this.solutionHistory.filter(s => s.convergenceInfo.isConverged).length;
    const convergenceRate = (convergedSteps / totalSolutions) * 100;
    
    report += `收敛性分析:\n`;
    report += `  收敛步数: ${convergedSteps}/${totalSolutions} (${convergenceRate.toFixed(1)}%)\n`;
    report += `  最终残差: ${lastSolution.convergenceInfo.residual.toExponential(3)}\n`;
    report += `  平均迭代次数: ${(this.solutionHistory.reduce((sum, s) => sum + s.convergenceInfo.iterations, 0) / totalSolutions).toFixed(1)}\n\n`;
    
    // 网格自适应效果
    if (totalAdaptations > 0) {
      const initialQuality = this.solutionHistory[0].meshData.quality;
      const finalQuality = lastSolution.meshData.quality;
      const qualityImprovement = ((finalQuality - initialQuality) / initialQuality) * 100;
      
      report += `网格自适应效果:\n`;
      report += `  质量改善: ${qualityImprovement.toFixed(1)}% (${initialQuality.toFixed(3)} → ${finalQuality.toFixed(3)})\n`;
      report += `  自适应频率: 每${Math.floor(totalSolutions / totalAdaptations)}个时间步\n\n`;
    }
    
    // 性能指标
    const avgResidual = this.solutionHistory.reduce((sum, s) => sum + s.convergenceInfo.residual, 0) / totalSolutions;
    
    report += `性能指标:\n`;
    report += `  平均残差: ${avgResidual.toExponential(3)}\n`;
    report += `  求解稳定性: ${convergenceRate > 90 ? '优秀' : convergenceRate > 70 ? '良好' : '需要改进'}\n`;
    
    return report;
  }

  /**
   * 停止求解
   */
  public stopSolver(): void {
    this.isRunning = false;
    this.physicsSolver.stopSolver();
    console.log('🛑 集成求解器已停止');
  }

  /**
   * 获取求解历史
   */
  public getSolutionHistory(): IntegratedSolution[] {
    return [...this.solutionHistory];
  }

  /**
   * 获取当前网格报告
   */
  public getCurrentMeshReport(): string {
    return this.meshAlgorithm.generateAdaptationReport();
  }
}

// 导出便捷函数
export function createIntegratedMultiphysicsSystem(
  config: Partial<IntegratedSolverConfig>
): IntegratedMultiphysicsSystem {
  
  const defaultConfig: IntegratedSolverConfig = {
    meshConfig: {
      errorTolerance: 1e-3,
      refinementThreshold: 2.0,
      coarseningThreshold: 0.1,
      maxRefinementLevel: 5,
      minElementQuality: 0.3,
      maxAspectRatio: 10.0,
      minElementSize: 0.1,
      maxElementSize: 5.0,
      stressGradientThreshold: 1000000,
      gradientZoneExpansion: 1.5,
      maxElements: 2000000,
      maxNodes: 500000,
      adaptationFrequency: 5
    },
    physicsConfig: {
      seepage: {
        permeabilityX: 1e-5,
        permeabilityY: 1e-5,
        permeabilityZ: 1e-6,
        porosity: 0.3,
        fluidDensity: 1000,
        fluidViscosity: 1e-3,
        compressibility: 4.5e-10
      },
      stress: {
        youngModulus: 3e7,
        poissonRatio: 0.3,
        density: 2000,
        cohesion: 50000,
        frictionAngle: Math.PI / 6,
        dilatancyAngle: 0
      },
      coupling: {
        biotCoefficient: 0.7,
        effectiveStressLaw: 'biot',
        couplingType: 'full',
        convergenceTolerance: 1e-6,
        maxIterations: 50
      }
    },
    solverConfig: {
      timeSteppingScheme: 'adaptive',
      initialTimeStep: 3600,
      minTimeStep: 60,
      maxTimeStep: 86400,
      totalTime: 86400 * 30,
      adaptiveCriteria: {
        errorTolerance: 1e-6,
        maxTimestepGrowth: 1.2,
        timestepShrinkFactor: 0.5
      }
    },
    integration: {
      adaptationInterval: 3,
      qualityThreshold: 0.4,
      errorThreshold: 1e-2,
      maxAdaptationCycles: 3,
      convergenceTolerance: 1e-6
    }
  };
  
  return new IntegratedMultiphysicsSystem({
    ...defaultConfig,
    ...config,
    meshConfig: { ...defaultConfig.meshConfig, ...config.meshConfig },
    physicsConfig: { 
      ...defaultConfig.physicsConfig, 
      ...config.physicsConfig,
      seepage: { ...defaultConfig.physicsConfig.seepage, ...config.physicsConfig?.seepage },
      stress: { ...defaultConfig.physicsConfig.stress, ...config.physicsConfig?.stress },
      coupling: { ...defaultConfig.physicsConfig.coupling, ...config.physicsConfig?.coupling }
    },
    solverConfig: { ...defaultConfig.solverConfig, ...config.solverConfig },
    integration: { ...defaultConfig.integration, ...config.integration }
  });
}