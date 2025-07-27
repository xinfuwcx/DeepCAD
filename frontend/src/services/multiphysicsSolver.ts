/**
 * 多物理场耦合求解器 - 专注渗流-应力耦合分析
 * 3号计算专家第4周核心任务
 */

export interface SeepageStressCouplingParams {
  // 流体参数 - 全面的流体力学参数
  fluid: {
    // 基本物性参数
    density: number; // kg/m³ 流体密度
    viscosity: number; // Pa·s 动力粘度
    kinematicViscosity: number; // m²/s 运动粘度
    compressibility: number; // 1/Pa 压缩系数
    bulkModulus: number; // Pa 流体体积模量
    
    // 流动特性参数
    velocityProfile: 'laminar' | 'turbulent' | 'transitional';
    turbulenceModel: 'k_epsilon' | 'k_omega' | 'reynolds_stress' | 'none';
    reynoldsNumber: number; // 雷诺数
    
    // 边界层参数
    boundaryLayerThickness: number; // m
    wallShearStress: number; // Pa
    
    // 传质参数
    diffusionCoefficient: number; // m²/s
    schmidtNumber: number; // 施密特数
    
    // 表面张力和毛细效应
    surfaceTension: number; // N/m
    contactAngle: number; // radians
    capillaryPressure: number; // Pa
  };
  
  // 固体参数 - 全面的固体力学参数
  solid: {
    // 弹性参数
    youngModulus: number; // Pa 弹性模量
    poissonRatio: number; // 0-0.5 泊松比
    shearModulus: number; // Pa 剪切模量
    bulkModulus: number; // Pa 体积模量
    
    // 密度和重力
    density: number; // kg/m³ 固体密度
    specificWeight: number; // N/m³ 重度
    
    // 强度参数
    cohesion: number; // Pa 粘聚力
    frictionAngle: number; // radians 内摩擦角
    dilatancyAngle: number; // radians 剪胀角
    tensileStrength: number; // Pa 抗拉强度
    compressiveStrength: number; // Pa 抗压强度
    
    // 本构模型参数
    constitutiveModel: 'elastic' | 'mohr_coulomb' | 'drucker_prager' | 'cam_clay' | 'hardening_soil';
    plasticityParameters: {
      hardeningModulus: number; // Pa
      softeningModulus: number; // Pa
      criticalStateParameter: number;
      overConsolidationRatio: number;
    };
    
    // 蠕变和粘弹性参数
    creepParameters: {
      enabled: boolean;
      primaryCreepRate: number; // 1/s
      secondaryCreepRate: number; // 1/s
      creepExponent: number;
      relaxationTime: number; // s
    };
    
    // 损伤和疲劳参数
    damageParameters: {
      enabled: boolean;
      damageThreshold: number;
      damageEvolutionRate: number;
      maxDamage: number; // 0-1
    };
  };
  
  // 多孔介质参数 - 流固交界面参数
  porousMedia: {
    porosity: number; // 0-1 孔隙率
    permeabilityTensorXX: number; // m² 渗透率张量分量
    permeabilityTensorYY: number;
    permeabilityTensorZZ: number;
    permeabilityTensorXY: number;
    permeabilityTensorXZ: number;
    permeabilityTensorYZ: number;
    
    // Kozeny-Carman模型参数
    kozenyConstant: number;
    specificSurface: number; // m⁻¹
    tortuosity: number; // 迂曲度
    
    // 毛细压力曲线参数
    capillaryPressureCurve: {
      model: 'van_genuchten' | 'brooks_corey' | 'fredlund_xing';
      parameters: {
        alpha: number; // kPa⁻¹
        n: number;
        m: number;
        residualSaturation: number;
        saturatedSaturation: number;
      };
    };
    
    // 相对渗透率参数
    relativePermeability: {
      model: 'van_genuchten' | 'corey' | 'power_law';
      parameters: {
        lambda: number; // 孔径分布指数
        residualWaterContent: number;
        residualAirContent: number;
      };
    };
  };
  
  // 耦合参数 - 增强的流固耦合参数
  coupling: {
    // Biot理论参数
    biotCoefficient: number; // Biot系数 0-1
    biotModulus: number; // Pa Biot模量
    skempton_B: number; // Skempton's B参数
    
    // 有效应力定律
    effectiveStressLaw: 'terzaghi' | 'biot' | 'modified_biot';
    
    // 耦合类型和强度
    couplingType: 'one_way' | 'two_way' | 'full' | 'weak' | 'strong';
    couplingStrength: number; // 0-1 耦合强度系数
    
    // 收敛控制
    convergenceTolerance: number;
    maxIterations: number;
    relaxationFactor: number; // 松弛因子
    
    // 稳定化参数
    stabilization: {
      enabled: boolean;
      supgParameter: number; // SUPG稳定化参数
      pspgParameter: number; // PSPG稳定化参数
      lsicParameter: number; // LSIC稳定化参数
    };
    
    // 时间积分参数
    timeIntegration: {
      fluidScheme: 'backward_euler' | 'crank_nicolson' | 'bdf2';
      solidScheme: 'newmark' | 'hilber_hughes_taylor' | 'generalized_alpha';
      coupling_scheme: 'monolithic' | 'partitioned_strong' | 'partitioned_weak';
    };
  };
}

export interface CouplingState {
  iteration: number;
  convergenceHistory: number[];
  pressureField: Float32Array;
  displacementField: Float32Array;
  effectiveStress: Float32Array;
  seepageVelocity: Float32Array;
  isConverged: boolean;
  residualNorm: number;
}

export interface MultiphysicsSolverConfig {
  timeSteppingScheme: 'implicit' | 'explicit' | 'adaptive';
  initialTimeStep: number; // seconds
  minTimeStep: number;
  maxTimeStep: number;
  totalTime: number;
  adaptiveCriteria: {
    errorTolerance: number;
    maxTimestepGrowth: number;
    timestepShrinkFactor: number;
  };
}

export class MultiphysicsSolver {
  private params: SeepageStressCouplingParams;
  private config: MultiphysicsSolverConfig;
  private state: CouplingState;
  private isRunning: boolean = false;

  constructor(
    params: SeepageStressCouplingParams,
    config: MultiphysicsSolverConfig
  ) {
    this.params = params;
    this.config = config;
    this.initializeState();
  }

  private initializeState(): void {
    this.state = {
      iteration: 0,
      convergenceHistory: [],
      pressureField: new Float32Array(),
      displacementField: new Float32Array(),
      effectiveStress: new Float32Array(),
      seepageVelocity: new Float32Array(),
      isConverged: false,
      residualNorm: Infinity
    };
  }

  /**
   * 渗流-应力耦合求解主循环
   */
  async solveCoupledProblem(
    geometry: any,
    boundaryConditions: any,
    onProgress?: (progress: number, state: CouplingState) => void
  ): Promise<CouplingState> {
    
    this.isRunning = true;
    console.log('🔄 开始渗流-应力耦合分析...');
    
    try {
      let currentTime = 0;
      let timeStep = this.config.initialTimeStep;
      
      while (currentTime < this.config.totalTime && this.isRunning) {
        
        // 时间步长自适应调整
        timeStep = this.adaptTimeStep(timeStep);
        
        // 执行耦合迭代
        const iterationResult = await this.performCouplingIteration(
          geometry, 
          boundaryConditions,
          timeStep
        );
        
        if (iterationResult.converged) {
          currentTime += timeStep;
          this.updateState(iterationResult);
          
          // 报告进度
          const progress = (currentTime / this.config.totalTime) * 100;
          if (onProgress) {
            onProgress(progress, this.state);
          }
          
          console.log(`✅ 时间步 ${currentTime.toFixed(3)}s 收敛，残差: ${iterationResult.residual.toExponential(3)}`);
          
        } else {
          // 收敛失败，减小时间步长重试
          timeStep *= this.config.adaptiveCriteria.timestepShrinkFactor;
          
          if (timeStep < this.config.minTimeStep) {
            throw new Error('时间步长过小，求解失败');
          }
          
          console.warn(`⚠️ 收敛失败，减小时间步长至 ${timeStep.toExponential(3)}s`);
        }
      }
      
      console.log('🎉 渗流-应力耦合分析完成！');
      return this.state;
      
    } catch (error) {
      console.error('❌ 耦合求解失败:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 单次耦合迭代求解
   */
  private async performCouplingIteration(
    geometry: any,
    boundaryConditions: any,
    timeStep: number
  ): Promise<{ converged: boolean; residual: number; data: any }> {
    
    let iteration = 0;
    let residual = Infinity;
    
    // 保存上一时间步的解
    const previousSolution = this.cloneCurrentSolution();
    
    while (iteration < this.params.coupling.maxIterations) {
      
      // 1. 求解渗流问题（固定应力场）
      const seepageSolution = await this.solveSeepageProblem(
        geometry,
        boundaryConditions,
        this.state.effectiveStress,
        timeStep
      );
      
      // 2. 求解应力问题（使用新的孔隙压力）
      const stressSolution = await this.solveStressProblem(
        geometry,
        boundaryConditions,
        seepageSolution.pressure,
        timeStep
      );
      
      // 3. 计算耦合残差
      residual = this.calculateCouplingResidual(
        seepageSolution,
        stressSolution,
        previousSolution
      );
      
      // 4. 更新解场
      this.updateSolutionFields(seepageSolution, stressSolution);
      
      // 5. 检查收敛性
      if (residual < this.params.coupling.convergenceTolerance) {
        return {
          converged: true,
          residual,
          data: {
            pressure: seepageSolution.pressure,
            displacement: stressSolution.displacement,
            stress: stressSolution.stress,
            seepageVelocity: seepageSolution.velocity
          }
        };
      }
      
      iteration++;
      
      // 输出迭代信息
      if (iteration % 5 === 0) {
        console.log(`  第${iteration}次耦合迭代，残差: ${residual.toExponential(3)}`);
      }
    }
    
    // 达到最大迭代次数未收敛
    return {
      converged: false,
      residual,
      data: null
    };
  }

  /**
   * 求解渗流问题
   */
  private async solveSeepageProblem(
    geometry: any,
    boundaryConditions: any,
    effectiveStress: Float32Array,
    timeStep: number
  ): Promise<{ pressure: Float32Array; velocity: Float32Array }> {
    
    console.log('💧 求解渗流问题...');
    
    // 构建渗流方程：∇·(k∇p) + ∇·(k∇z) = Ss∂p/∂t + Q
    // 其中 k 是渗透系数张量，p 是压力，z 是高程，Ss 是储水系数
    
    // 模拟渗流求解过程
    const numNodes = geometry.vertices.length / 3;
    const pressure = new Float32Array(numNodes);
    const velocity = new Float32Array(numNodes * 3);
    
    // 这里应该调用 Terra 仿真的渗流求解器
    // 暂时用简化计算模拟
    for (let i = 0; i < numNodes; i++) {
      // 简化的压力计算（基于深度和边界条件）
      const depth = geometry.vertices[i * 3 + 2]; // z坐标
      const hydrostaticPressure = this.params.seepage.fluidDensity * 9.81 * Math.abs(depth);
      
      // 考虑有效应力的影响
      const stressInfluence = effectiveStress[i] || 0;
      pressure[i] = hydrostaticPressure * (1 + stressInfluence * 0.001);
      
      // 计算渗流速度（达西定律）
      velocity[i * 3] = -this.params.seepage.permeabilityX * (pressure[i] / this.params.seepage.fluidViscosity);
      velocity[i * 3 + 1] = -this.params.seepage.permeabilityY * (pressure[i] / this.params.seepage.fluidViscosity);
      velocity[i * 3 + 2] = -this.params.seepage.permeabilityZ * (pressure[i] / this.params.seepage.fluidViscosity);
    }
    
    return { pressure, velocity };
  }

  /**
   * 求解应力问题
   */
  private async solveStressProblem(
    geometry: any,
    boundaryConditions: any,
    porePressure: Float32Array,
    timeStep: number
  ): Promise<{ displacement: Float32Array; stress: Float32Array }> {
    
    console.log('🔧 求解应力问题...');
    
    // 构建有效应力的弹塑性方程
    // σ'ij = σij - α*p*δij (Biot有效应力定律)
    
    const numNodes = geometry.vertices.length / 3;
    const displacement = new Float32Array(numNodes * 3);
    const stress = new Float32Array(numNodes * 6); // 6个应力分量
    
    // 这里应该调用 Terra 仿真的结构求解器
    // 暂时用简化计算模拟
    for (let i = 0; i < numNodes; i++) {
      // 简化的位移计算
      const effectivePressure = porePressure[i] * this.params.coupling.biotCoefficient;
      const strainFactor = effectivePressure / this.params.stress.youngModulus;
      
      displacement[i * 3] = strainFactor * 0.001; // x方向位移
      displacement[i * 3 + 1] = strainFactor * 0.001; // y方向位移  
      displacement[i * 3 + 2] = strainFactor * 0.002; // z方向位移（沉降）
      
      // 计算有效应力
      const totalStress = this.params.stress.density * 9.81 * Math.abs(geometry.vertices[i * 3 + 2]);
      stress[i * 6] = totalStress - effectivePressure; // σ'xx
      stress[i * 6 + 1] = totalStress - effectivePressure; // σ'yy
      stress[i * 6 + 2] = totalStress - effectivePressure; // σ'zz
      stress[i * 6 + 3] = 0; // τxy
      stress[i * 6 + 4] = 0; // τxz
      stress[i * 6 + 5] = 0; // τyz
    }
    
    return { displacement, stress };
  }

  /**
   * 计算耦合残差
   */
  private calculateCouplingResidual(
    seepageSolution: any,
    stressSolution: any,
    previousSolution: any
  ): number {
    
    // 计算压力和位移的变化量
    let pressureResidual = 0;
    let displacementResidual = 0;
    
    for (let i = 0; i < seepageSolution.pressure.length; i++) {
      const dp = seepageSolution.pressure[i] - (previousSolution.pressure[i] || 0);
      pressureResidual += dp * dp;
      
      const du = stressSolution.displacement[i * 3] - (previousSolution.displacement[i * 3] || 0);
      const dv = stressSolution.displacement[i * 3 + 1] - (previousSolution.displacement[i * 3 + 1] || 0);
      const dw = stressSolution.displacement[i * 3 + 2] - (previousSolution.displacement[i * 3 + 2] || 0);
      displacementResidual += du * du + dv * dv + dw * dw;
    }
    
    // 归一化残差
    const totalResidual = Math.sqrt(pressureResidual + displacementResidual);
    return totalResidual / seepageSolution.pressure.length;
  }

  /**
   * 时间步长自适应控制
   */
  private adaptTimeStep(currentTimeStep: number): number {
    
    // 基于收敛性调整时间步长
    if (this.state.convergenceHistory.length > 0) {
      const lastResidual = this.state.convergenceHistory[this.state.convergenceHistory.length - 1];
      
      if (lastResidual < this.config.adaptiveCriteria.errorTolerance * 0.1) {
        // 收敛很好，可以增大时间步长
        const newTimeStep = currentTimeStep * this.config.adaptiveCriteria.maxTimestepGrowth;
        return Math.min(newTimeStep, this.config.maxTimeStep);
      } else if (lastResidual > this.config.adaptiveCriteria.errorTolerance) {
        // 收敛较差，减小时间步长
        return Math.max(
          currentTimeStep * this.config.adaptiveCriteria.timestepShrinkFactor,
          this.config.minTimeStep
        );
      }
    }
    
    return currentTimeStep;
  }

  private cloneCurrentSolution(): any {
    return {
      pressure: new Float32Array(this.state.pressureField),
      displacement: new Float32Array(this.state.displacementField),
      stress: new Float32Array(this.state.effectiveStress)
    };
  }

  private updateSolutionFields(seepageSolution: any, stressSolution: any): void {
    this.state.pressureField = seepageSolution.pressure;
    this.state.displacementField = stressSolution.displacement;
    this.state.effectiveStress = stressSolution.stress;
    this.state.seepageVelocity = seepageSolution.velocity;
  }

  private updateState(result: any): void {
    this.state.iteration++;
    this.state.convergenceHistory.push(result.residual);
    this.state.residualNorm = result.residual;
    this.state.isConverged = result.converged;
  }

  /**
   * 停止求解
   */
  public stopSolver(): void {
    this.isRunning = false;
    console.log('🛑 多物理场求解器已停止');
  }

  /**
   * 获取当前状态
   */
  public getState(): CouplingState {
    return { ...this.state };
  }
}

// 导出便捷函数
export function createSeepageStressSolver(
  params: SeepageStressCouplingParams,
  config?: Partial<MultiphysicsSolverConfig>
): MultiphysicsSolver {
  
  const defaultConfig: MultiphysicsSolverConfig = {
    timeSteppingScheme: 'adaptive',
    initialTimeStep: 3600, // 1小时
    minTimeStep: 60, // 1分钟
    maxTimeStep: 86400, // 24小时
    totalTime: 86400 * 30, // 30天
    adaptiveCriteria: {
      errorTolerance: 1e-6,
      maxTimestepGrowth: 1.2,
      timestepShrinkFactor: 0.5
    }
  };
  
  return new MultiphysicsSolver(params, { ...defaultConfig, ...config });
}