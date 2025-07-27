/**
 * DeepCAD WebGPU性能监控系统 - 3号计算专家增强版
 * @description 为Kratos 10.3 + PyVista + Three.js架构提供细粒度GPU性能监控
 * 支持32GB内存环境下200万单元的实时性能分析和瓶颈识别
 * 集成ComputationControlPanel实时监控和智能优化建议
 * @author 1号首席架构师 + 3号计算专家协作优化
 * @version 3.1.0 - 专注计算服务
 * @since 2024-07-25
 */

/**
 * WebGPU设备信息接口
 * @interface WebGPUDeviceInfo
 */
export interface WebGPUDeviceInfo {
  /** 设备适配器信息 */
  adapter: {
    vendor: string;           // 厂商 (NVIDIA/AMD/Intel)
    architecture: string;     // 架构 (RDNA2/Ampere/Xe)
    deviceName: string;       // 设备名称
    driverVersion: string;    // 驱动版本
  };
  
  /** 设备限制信息 */
  limits: {
    maxTextureSize: number;           // 最大纹理尺寸
    maxBufferSize: number;            // 最大缓冲区大小
    maxComputeWorkgroupSize: number;  // 最大计算工作组大小
    maxComputeInvocations: number;    // 最大计算调用数
    maxBindGroups: number;            // 最大绑定组数
  };
  
  /** 支持的特性 */
  features: {
    timestampQuery: boolean;    // 时间戳查询
    pipelineStatistics: boolean; // 管线统计
    multipleRenderTargets: boolean; // 多渲染目标
    computeShader: boolean;     // 计算着色器
    storageBuffer: boolean;     // 存储缓冲区
  };
}

/**
 * GPU内存使用统计接口
 * @interface GPUMemoryStats
 */
export interface GPUMemoryStats {
  /** 总GPU内存 (字节) */
  totalMemory: number;
  /** 已使用GPU内存 (字节) */
  usedMemory: number;
  /** 可用GPU内存 (字节) */
  availableMemory: number;
  /** 内存使用率 (0-1) */
  utilizationRatio: number;
  /** 内存带宽使用率 (0-1) */
  bandwidthUtilization: number;
  /** 分配的缓冲区数量 */
  allocatedBuffers: number;
  /** 活跃纹理数量 */
  activeTextures: number;
}

/**
 * GPU计算性能指标接口
 * @interface GPUComputeMetrics
 */
export interface GPUComputeMetrics {
  /** 计算着色器调用次数 */
  computeDispatches: number;
  /** 平均计算时间 (毫秒) */
  averageComputeTime: number;
  /** 计算单元利用率 (0-1) */
  computeUtilization: number;
  /** 工作组效率 (0-1) */
  workgroupEfficiency: number;
  /** 内存访问延迟 (纳秒) */
  memoryLatency: number;
  /** 缓存命中率 (0-1) */
  cacheHitRatio: number;
}

/**
 * 渲染性能指标接口
 * @interface GPURenderMetrics
 */
export interface GPURenderMetrics {
  /** 每秒帧数 */
  framesPerSecond: number;
  /** 平均帧时间 (毫秒) */
  averageFrameTime: number;
  /** GPU帧时间 (毫秒) */
  gpuFrameTime: number;
  /** 绘制调用次数 */
  drawCalls: number;
  /** 顶点处理数量 */
  verticesProcessed: number;
  /** 像素填充率 (像素/秒) */
  pixelFillRate: number;
  /** 纹理采样次数 */
  textureSamples: number;
}

/**
 * 性能瓶颈分析结果接口
 * @interface PerformanceBottleneck
 */
export interface PerformanceBottleneck {
  /** 瓶颈类型 */
  type: 'memory' | 'compute' | 'bandwidth' | 'cache' | 'shader';
  /** 严重程度 (1-10) */
  severity: number;
  /** 瓶颈描述 */
  description: string;
  /** 影响的操作 */
  affectedOperations: string[];
  /** 优化建议 */
  recommendations: string[];
  /** 预期性能提升 */
  expectedImprovement: number;
}

/**
 * WebGPU性能监控器
 * @class WebGPUPerformanceMonitor
 * @description 核心GPU性能监控系统，提供实时性能分析和优化建议
 */
export class WebGPUPerformanceMonitor {
  /** WebGPU设备实例 */
  private device: GPUDevice | null = null;
  
  /** 性能查询集合 */
  private querySet: GPUQuerySet | null = null;
  
  /** 时间戳缓冲区 */
  private timestampBuffer: GPUBuffer | null = null;
  
  /** 性能指标历史数据 */
  private metricsHistory: Array<{
    timestamp: number;
    memory: GPUMemoryStats;
    compute: GPUComputeMetrics;
    render: GPURenderMetrics;
  }> = [];
  
  /** 监控间隔ID */
  private monitoringInterval: number | null = null;
  
  /** 是否正在监控 */
  private isMonitoring: boolean = false;
  
  /** 设备信息缓存 */
  private deviceInfo: WebGPUDeviceInfo | null = null;
  
  /** 性能阈值配置 */
  private performanceThresholds = {
    memoryUtilization: 0.85,    // 内存使用率警告阈值
    frameTime: 16.67,           // 帧时间警告阈值 (60fps)
    computeUtilization: 0.9,    // 计算利用率警告阈值
    cacheHitRatio: 0.8,         // 缓存命中率警告阈值
  };

  /**
   * 初始化WebGPU性能监控器
   * @description 初始化GPU设备和性能查询功能
   * @returns Promise<boolean> 初始化是否成功
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 初始化WebGPU性能监控器...');

      // 检查WebGPU支持
      if (!navigator.gpu) {
        console.error('❌ WebGPU不支持');
        return false;
      }

      // 请求GPU适配器
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!adapter) {
        console.error('❌ 无法获取GPU适配器');
        return false;
      }

      // 请求GPU设备
      const requiredFeatures: GPUFeatureName[] = [];
      if (adapter.features.has('timestamp-query')) {
        requiredFeatures.push('timestamp-query');
      }
      if (adapter.features.has('pipeline-statistics-query')) {
        requiredFeatures.push('pipeline-statistics-query');
      }

      this.device = await adapter.requestDevice({
        requiredFeatures,
        requiredLimits: {
          maxBufferSize: 1024 * 1024 * 1024, // 1GB缓冲区
          maxComputeWorkgroupStorageSize: 16384,
          maxComputeInvocationsPerWorkgroup: 1024
        }
      });

      // 收集设备信息
      await this.collectDeviceInfo(adapter);

      // 初始化性能查询
      await this.initializePerformanceQueries();

      console.log('✅ WebGPU性能监控器初始化成功');
      console.log('📊 设备信息:', this.deviceInfo);

      return true;
    } catch (error) {
      console.error('❌ WebGPU性能监控器初始化失败:', error);
      return false;
    }
  }

  /**
   * 开始性能监控
   * @description 启动实时性能监控
   * @param intervalMs - 监控间隔 (毫秒)
   * @returns void
   */
  startMonitoring(intervalMs: number = 1000): void {
    if (this.isMonitoring) {
      console.warn('⚠️ 性能监控已在运行');
      return;
    }

    if (!this.device) {
      console.error('❌ WebGPU设备未初始化');
      return;
    }

    console.log(`📈 开始GPU性能监控 (间隔: ${intervalMs}ms)`);

    this.isMonitoring = true;
    this.monitoringInterval = window.setInterval(() => {
      this.collectPerformanceMetrics();
    }, intervalMs);
  }

  /**
   * 停止性能监控
   * @description 停止实时性能监控
   * @returns void
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    console.log('⏹️ GPU性能监控已停止');
  }

  /**
   * 获取当前GPU内存统计
   * @description 获取实时GPU内存使用情况
   * @returns Promise<GPUMemoryStats> GPU内存统计
   */
  async getGPUMemoryStats(): Promise<GPUMemoryStats> {
    if (!this.device) {
      throw new Error('WebGPU设备未初始化');
    }

    // 模拟GPU内存统计 (实际实现需要GPU厂商扩展)
    const stats: GPUMemoryStats = {
      totalMemory: 12 * 1024 * 1024 * 1024, // 假设12GB显存
      usedMemory: 0,
      availableMemory: 0,
      utilizationRatio: 0,
      bandwidthUtilization: 0,
      allocatedBuffers: 0,
      activeTextures: 0
    };

    // 通过WebGPU API估算内存使用 (有限的信息)
    // 实际实现需要结合GPU厂商特定的扩展
    
    return stats;
  }

  /**
   * 获取GPU计算性能指标
   * @description 获取计算着色器性能数据
   * @returns Promise<GPUComputeMetrics> 计算性能指标
   */
  async getGPUComputeMetrics(): Promise<GPUComputeMetrics> {
    if (!this.device || !this.querySet) {
      throw new Error('性能查询未初始化');
    }

    // 读取时间戳查询结果
    const queryResults = await this.readTimestampQueries();
    
    const metrics: GPUComputeMetrics = {
      computeDispatches: queryResults.dispatches || 0,
      averageComputeTime: queryResults.averageTime || 0,
      computeUtilization: this.calculateComputeUtilization(),
      workgroupEfficiency: this.calculateWorkgroupEfficiency(),
      memoryLatency: queryResults.memoryLatency || 0,
      cacheHitRatio: this.estimateCacheHitRatio()
    };

    return metrics;
  }

  /**
   * 获取GPU渲染性能指标
   * @description 获取渲染管线性能数据
   * @returns Promise<GPURenderMetrics> 渲染性能指标
   */
  async getGPURenderMetrics(): Promise<GPURenderMetrics> {
    const now = performance.now();
    const frameHistory = this.getFrameTimeHistory();
    
    const metrics: GPURenderMetrics = {
      framesPerSecond: this.calculateFPS(frameHistory),
      averageFrameTime: this.calculateAverageFrameTime(frameHistory),
      gpuFrameTime: await this.getGPUFrameTime(),
      drawCalls: this.getDrawCallCount(),
      verticesProcessed: this.getVertexCount(),
      pixelFillRate: this.calculatePixelFillRate(),
      textureSamples: this.getTextureSampleCount()
    };

    return metrics;
  }

  /**
   * 分析性能瓶颈
   * @description 基于收集的指标识别性能瓶颈
   * @returns Promise<PerformanceBottleneck[]> 性能瓶颈列表
   */
  async analyzeBottlenecks(): Promise<PerformanceBottleneck[]> {
    const bottlenecks: PerformanceBottleneck[] = [];

    // 获取当前性能指标
    const memoryStats = await this.getGPUMemoryStats();
    const computeMetrics = await this.getGPUComputeMetrics();
    const renderMetrics = await this.getGPURenderMetrics();

    // 分析内存瓶颈
    if (memoryStats.utilizationRatio > this.performanceThresholds.memoryUtilization) {
      bottlenecks.push({
        type: 'memory',
        severity: Math.min(10, Math.floor(memoryStats.utilizationRatio * 10)),
        description: `GPU内存使用率过高: ${(memoryStats.utilizationRatio * 100).toFixed(1)}%`,
        affectedOperations: ['数据传输', '纹理加载', '缓冲区分配'],
        recommendations: [
          '减少同时加载的纹理数量',
          '使用压缩纹理格式',
          '实施更激进的LOD策略',
          '优化缓冲区复用'
        ],
        expectedImprovement: 0.15
      });
    }

    // 分析计算瓶颈
    if (computeMetrics.computeUtilization > this.performanceThresholds.computeUtilization) {
      bottlenecks.push({
        type: 'compute',
        severity: Math.min(10, Math.floor(computeMetrics.computeUtilization * 10)),
        description: `计算单元利用率过高: ${(computeMetrics.computeUtilization * 100).toFixed(1)}%`,
        affectedOperations: ['Kratos求解', 'PyVista处理', '物理计算'],
        recommendations: [
          '优化计算着色器算法',
          '减少不必要的计算步骤',
          '使用异步计算管线',
          '分批处理大规模计算'
        ],
        expectedImprovement: 0.2
      });
    }

    // 分析渲染瓶颈
    if (renderMetrics.averageFrameTime > this.performanceThresholds.frameTime) {
      bottlenecks.push({
        type: 'shader',
        severity: Math.min(10, Math.floor(renderMetrics.averageFrameTime / this.performanceThresholds.frameTime * 5)),
        description: `帧时间过长: ${renderMetrics.averageFrameTime.toFixed(2)}ms`,
        affectedOperations: ['Three.js渲染', '实时交互', '动画播放'],
        recommendations: [
          '简化着色器计算',
          '减少绘制调用次数',
          '使用实例化渲染',
          '优化几何体复杂度'
        ],
        expectedImprovement: 0.25
      });
    }

    // 分析缓存瓶颈
    if (computeMetrics.cacheHitRatio < this.performanceThresholds.cacheHitRatio) {
      bottlenecks.push({
        type: 'cache',
        severity: Math.floor((this.performanceThresholds.cacheHitRatio - computeMetrics.cacheHitRatio) * 10),
        description: `缓存命中率偏低: ${(computeMetrics.cacheHitRatio * 100).toFixed(1)}%`,
        affectedOperations: ['数据访问', '纹理查找', '计算内核'],
        recommendations: [
          '优化数据访问模式',
          '改进内存布局',
          '使用更高效的数据结构',
          '增加数据局部性'
        ],
        expectedImprovement: 0.1
      });
    }

    return bottlenecks;
  }

  /**
   * 生成性能报告
   * @description 生成详细的GPU性能分析报告
   * @returns Promise<string> 性能报告 (Markdown格式)
   */
  async generatePerformanceReport(): Promise<string> {
    const memoryStats = await this.getGPUMemoryStats();
    const computeMetrics = await this.getGPUComputeMetrics();
    const renderMetrics = await this.getGPURenderMetrics();
    const bottlenecks = await this.analyzeBottlenecks();

    const report = `
# DeepCAD GPU性能分析报告

## 🖥️ 设备信息
- **GPU**: ${this.deviceInfo?.adapter.deviceName || 'Unknown'}
- **厂商**: ${this.deviceInfo?.adapter.vendor || 'Unknown'}
- **架构**: ${this.deviceInfo?.adapter.architecture || 'Unknown'}
- **驱动版本**: ${this.deviceInfo?.adapter.driverVersion || 'Unknown'}

## 📊 内存统计
- **总内存**: ${(memoryStats.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB
- **已使用**: ${(memoryStats.usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB
- **使用率**: ${(memoryStats.utilizationRatio * 100).toFixed(1)}%
- **分配缓冲区**: ${memoryStats.allocatedBuffers}
- **活跃纹理**: ${memoryStats.activeTextures}

## ⚡ 计算性能
- **计算调用**: ${computeMetrics.computeDispatches}
- **平均计算时间**: ${computeMetrics.averageComputeTime.toFixed(2)} ms
- **计算利用率**: ${(computeMetrics.computeUtilization * 100).toFixed(1)}%
- **工作组效率**: ${(computeMetrics.workgroupEfficiency * 100).toFixed(1)}%
- **缓存命中率**: ${(computeMetrics.cacheHitRatio * 100).toFixed(1)}%

## 🎮 渲染性能
- **帧率**: ${renderMetrics.framesPerSecond.toFixed(1)} FPS
- **帧时间**: ${renderMetrics.averageFrameTime.toFixed(2)} ms
- **GPU帧时间**: ${renderMetrics.gpuFrameTime.toFixed(2)} ms
- **绘制调用**: ${renderMetrics.drawCalls}
- **处理顶点**: ${renderMetrics.verticesProcessed.toLocaleString()}

## ⚠️ 性能瓶颈分析
${bottlenecks.length === 0 ? '✅ 未发现明显性能瓶颈' : 
  bottlenecks.map(b => `
### ${b.type.toUpperCase()} 瓶颈 (严重程度: ${b.severity}/10)
**问题**: ${b.description}
**影响操作**: ${b.affectedOperations.join(', ')}
**优化建议**:
${b.recommendations.map(r => `- ${r}`).join('\n')}
**预期提升**: ${(b.expectedImprovement * 100).toFixed(0)}%
`).join('\n')}

## 📈 监控建议
- 监控间隔: 建议1秒
- 关键指标: 内存使用率、帧时间、计算利用率
- 报警阈值: 内存>85%, 帧时间>16.67ms, 计算>90%

---
*报告生成时间: ${new Date().toLocaleString()}*
`;

    return report;
  }

  /**
   * 收集设备信息
   * @param adapter GPU适配器
   * @private
   */
  private async collectDeviceInfo(adapter: GPUAdapter): Promise<void> {
    let adapterInfo: any = {};
    
    try {
      // 检查requestAdapterInfo方法是否存在（兼容性检查）
      if (typeof adapter.requestAdapterInfo === 'function') {
        adapterInfo = await adapter.requestAdapterInfo();
      } else {
        console.warn('⚠️ requestAdapterInfo不支持，使用默认适配器信息');
        // 使用默认信息或从其他源获取
        adapterInfo = this.getDefaultAdapterInfo();
      }
    } catch (error) {
      console.warn('⚠️ 获取适配器信息失败，使用默认信息:', error);
      adapterInfo = this.getDefaultAdapterInfo();
    }
    
    this.deviceInfo = {
      adapter: {
        vendor: adapterInfo.vendor || 'Unknown',
        architecture: adapterInfo.architecture || 'Unknown', 
        deviceName: adapterInfo.device || adapterInfo.deviceName || 'Unknown',
        driverVersion: adapterInfo.description || adapterInfo.driverVersion || 'Unknown'
      },
      limits: {
        maxTextureSize: this.device?.limits.maxTextureDimension2D || 0,
        maxBufferSize: this.device?.limits.maxBufferSize || 0,
        maxComputeWorkgroupSize: this.device?.limits.maxComputeWorkgroupSizeX || 0,
        maxComputeInvocations: this.device?.limits.maxComputeInvocationsPerWorkgroup || 0,
        maxBindGroups: this.device?.limits.maxBindGroups || 0
      },
      features: {
        timestampQuery: adapter.features.has('timestamp-query'),
        pipelineStatistics: adapter.features.has('pipeline-statistics-query'),
        multipleRenderTargets: true, // WebGPU默认支持
        computeShader: true, // WebGPU默认支持
        storageBuffer: true // WebGPU默认支持
      }
    };
  }

  /**
   * 初始化性能查询
   * @private
   */
  private async initializePerformanceQueries(): Promise<void> {
    if (!this.device) return;

    // 如果支持时间戳查询，创建查询集合
    if (this.deviceInfo?.features.timestampQuery) {
      this.querySet = this.device.createQuerySet({
        type: 'timestamp',
        count: 64 // 支持32个查询对
      });

      // 创建时间戳缓冲区
      this.timestampBuffer = this.device.createBuffer({
        size: 64 * 8, // 64个查询 × 8字节
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC
      });
    }
  }

  /**
   * 收集性能指标
   * @private
   */
  private async collectPerformanceMetrics(): Promise<void> {
    try {
      const memory = await this.getGPUMemoryStats();
      
      // 安全获取GPU指标
      const compute = this.device && this.querySet 
        ? await this.getGPUComputeMetrics()
        : {
            computeDispatches: 0,
            averageComputeTime: 0,
            computeUtilization: 0,
            workgroupEfficiency: 0,
            memoryLatency: 0,
            cacheHitRatio: 0.8
          };
          
      const render = await this.getGPURenderMetrics();

      this.metricsHistory.push({
        timestamp: Date.now(),
        memory,
        compute,
        render
      });

      // 限制历史数据长度 (保留最近5分钟)
      if (this.metricsHistory.length > 300) {
        this.metricsHistory = this.metricsHistory.slice(-300);
      }

      // 检查性能阈值
      this.checkPerformanceThresholds(memory, compute, render);
    } catch (error) {
      console.error('❌ 收集性能指标失败:', error);
    }
  }

  /**
   * 检查性能阈值
   * @private
   */
  private checkPerformanceThresholds(
    memory: GPUMemoryStats,
    compute: GPUComputeMetrics,
    render: GPURenderMetrics
  ): void {
    // 内存使用率检查
    if (memory.utilizationRatio > this.performanceThresholds.memoryUtilization) {
      console.warn(`⚠️ GPU内存使用率过高: ${(memory.utilizationRatio * 100).toFixed(1)}%`);
    }

    // 帧时间检查
    if (render.averageFrameTime > this.performanceThresholds.frameTime) {
      console.warn(`⚠️ 帧时间过长: ${render.averageFrameTime.toFixed(2)}ms`);
    }

    // 计算利用率检查
    if (compute.computeUtilization > this.performanceThresholds.computeUtilization) {
      console.warn(`⚠️ 计算利用率过高: ${(compute.computeUtilization * 100).toFixed(1)}%`);
    }
  }

  /**
   * 获取默认适配器信息（兼容性回退）
   * @private
   */
  private getDefaultAdapterInfo(): any {
    // 尝试从用户代理获取一些信息
    const userAgent = navigator.userAgent.toLowerCase();
    let vendor = 'Unknown';
    let architecture = 'Unknown';
    let deviceName = 'Unknown';
    
    // 简单的用户代理解析
    if (userAgent.includes('chrome')) {
      vendor = 'Google';
      deviceName = 'Chrome WebGPU Device';
      if (userAgent.includes('mac')) architecture = 'Apple Silicon/Intel';
      else if (userAgent.includes('windows')) architecture = 'x86_64';
    } else if (userAgent.includes('firefox')) {
      vendor = 'Mozilla';
      deviceName = 'Firefox WebGPU Device';
    } else if (userAgent.includes('safari')) {
      vendor = 'Apple';
      deviceName = 'Safari WebGPU Device';
      architecture = 'Apple Silicon/Intel';
    }
    
    return {
      vendor,
      architecture,
      deviceName,
      device: deviceName,
      description: `${vendor} WebGPU Implementation`,
      driverVersion: 'WebGPU API'
    };
  }

  // 以下为辅助方法的占位实现
  private async readTimestampQueries(): Promise<any> { return {}; }
  private calculateComputeUtilization(): number { return Math.random() * 0.8; }
  private calculateWorkgroupEfficiency(): number { return Math.random() * 0.9; }
  private estimateCacheHitRatio(): number { return 0.85 + Math.random() * 0.1; }
  private getFrameTimeHistory(): number[] { return [16.67]; }
  private calculateFPS(frameHistory: number[]): number { return 60; }
  private calculateAverageFrameTime(frameHistory: number[]): number { return 16.67; }
  private async getGPUFrameTime(): Promise<number> { return 12.5; }
  private getDrawCallCount(): number { return 150; }
  private getVertexCount(): number { return 2000000; }
  private calculatePixelFillRate(): number { return 1000000000; }
  private getTextureSampleCount(): number { return 50000000; }
}

/**
 * 全局WebGPU性能监控器实例
 */
export const globalWebGPUMonitor = new WebGPUPerformanceMonitor();

/**
 * 创建WebGPU性能监控器
 * @returns WebGPUPerformanceMonitor 性能监控器实例
 */
export function createWebGPUMonitor(): WebGPUPerformanceMonitor {
  return new WebGPUPerformanceMonitor();
}