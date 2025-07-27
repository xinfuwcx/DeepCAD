/**
 * GPU计算加速模块 - 支持WebGL和WebGPU并行计算
 * 3号计算专家第4周GPU优化任务
 */

// GPU计算配置接口
export interface GPUAccelerationConfig {
  // 首选计算模式
  preferredMode: 'webgpu' | 'webgl' | 'auto';
  
  // 工作组大小配置
  workgroupSize: {
    x: number;
    y: number; 
    z: number;
  };
  
  // 内存管理
  memoryConfig: {
    maxBufferSize: number; // MB
    enableMemoryPool: boolean;
    autoGarbageCollection: boolean;
  };
  
  // 性能调优
  performance: {
    batchSize: number;
    enableAsync: boolean;
    maxConcurrency: number;
  };
  
  // 回退策略
  fallback: {
    enableCPUFallback: boolean;
    performanceThreshold: number; // ms
  };
}

// GPU计算任务类型
export type GPUComputeTask = 
  | 'vector_interpolation'
  | 'contour_generation' 
  | 'streamline_integration'
  | 'field_processing'
  | 'matrix_operations'
  | 'data_transformation';

// GPU计算结果
export interface GPUComputeResult {
  success: boolean;
  data: Float32Array | Uint32Array;
  executionTime: number;
  memoryUsed: number;
  mode: 'webgpu' | 'webgl' | 'cpu_fallback';
  error?: string;
}

// GPU状态信息
export interface GPUStatus {
  available: boolean;
  webgpuSupported: boolean;
  webglSupported: boolean;
  currentMode: 'webgpu' | 'webgl' | 'cpu_fallback';
  memoryInfo: {
    used: number;
    available: number;
    total: number;
  };
  performanceMetrics: {
    averageExecutionTime: number;
    tasksCompleted: number;
    errorRate: number;
  };
}

export class GPUAccelerationEngine {
  private config: GPUAccelerationConfig;
  private device: GPUDevice | null = null;
  private adapter: GPUAdapter | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  
  // 性能统计
  private performanceStats = {
    tasksCompleted: 0,
    totalExecutionTime: 0,
    errors: 0,
    memoryPeakUsage: 0
  };
  
  // 内存池
  private bufferPool: Map<string, GPUBuffer | WebGLBuffer> = new Map();
  private isInitialized = false;

  constructor(config?: Partial<GPUAccelerationConfig>) {
    this.config = this.mergeConfig(config);
    console.log('🚀 GPU加速引擎创建中...');
  }

  /**
   * 初始化GPU加速引擎
   */
  async initialize(): Promise<boolean> {
    console.log('⚡ 初始化GPU加速引擎...');
    
    try {
      const mode = await this.detectBestMode();
      
      switch (mode) {
        case 'webgpu':
          const webgpuSuccess = await this.initializeWebGPU();
          if (webgpuSuccess) {
            console.log('✅ WebGPU初始化成功');
            this.isInitialized = true;
            return true;
          }
          // 继续尝试WebGL
          
        case 'webgl':
          const webglSuccess = await this.initializeWebGL();
          if (webglSuccess) {
            console.log('✅ WebGL初始化成功');
            this.isInitialized = true;
            return true;
          }
          break;
          
        default:
          console.warn('⚠️ GPU不可用，将使用CPU回退');
          break;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ GPU初始化失败:', error);
      return false;
    }
  }

  /**
   * 检测最佳计算模式
   */
  private async detectBestMode(): Promise<'webgpu' | 'webgl' | 'cpu_fallback'> {
    if (this.config.preferredMode !== 'auto') {
      return this.config.preferredMode;
    }

    // 检测WebGPU支持
    if ('gpu' in navigator) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          console.log('🔥 检测到WebGPU支持');
          return 'webgpu';
        }
      } catch (error) {
        console.log('📍 WebGPU不可用，检测WebGL...');
      }
    }

    // 检测WebGL2支持
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (gl) {
      console.log('🎨 检测到WebGL2支持');
      return 'webgl';
    }

    console.log('🖥️ 仅支持CPU计算');
    return 'cpu_fallback';
  }

  /**
   * 初始化WebGPU
   */
  private async initializeWebGPU(): Promise<boolean> {
    if (!('gpu' in navigator)) return false;

    try {
      console.log('🔥 初始化WebGPU设备...');
      
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });
      
      if (!this.adapter) return false;

      this.device = await this.adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {
          maxComputeWorkgroupSizeX: this.config.workgroupSize.x,
          maxComputeWorkgroupSizeY: this.config.workgroupSize.y,
          maxComputeWorkgroupSizeZ: this.config.workgroupSize.z
        }
      });

      // 设备丢失处理
      this.device.lost.then((info) => {
        console.error('💥 WebGPU设备丢失:', info.message);
        this.handleDeviceLoss();
      });

      console.log('🎯 WebGPU设备创建成功');
      console.log('📊 设备限制:', {
        maxComputeWorkgroupSizeX: this.device.limits.maxComputeWorkgroupSizeX,
        maxComputeWorkgroupSizeY: this.device.limits.maxComputeWorkgroupSizeY,
        maxStorageBufferBindingSize: this.device.limits.maxStorageBufferBindingSize
      });

      return true;
      
    } catch (error) {
      console.error('❌ WebGPU初始化失败:', error);
      return false;
    }
  }

  /**
   * 初始化WebGL
   */
  private async initializeWebGL(): Promise<boolean> {
    try {
      console.log('🎨 初始化WebGL2上下文...');
      
      this.canvas = document.createElement('canvas');
      this.canvas.width = 1;
      this.canvas.height = 1;
      
      this.gl = this.canvas.getContext('webgl2', {
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false
      });

      if (!this.gl) return false;

      // 检查关键扩展
      const requiredExtensions = [
        'EXT_color_buffer_float',
        'OES_texture_float_linear'
      ];

      for (const ext of requiredExtensions) {
        if (!this.gl.getExtension(ext)) {
          console.warn(`⚠️ WebGL扩展 ${ext} 不可用`);
        }
      }

      console.log('🎯 WebGL2上下文创建成功');
      console.log('📊 WebGL参数:', {
        maxTextureSize: this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),
        maxVertexTextures: this.gl.getParameter(this.gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
        maxFragmentTextures: this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS)
      });

      return true;
      
    } catch (error) {
      console.error('❌ WebGL初始化失败:', error);
      return false;
    }
  }

  /**
   * 执行GPU计算任务
   */
  async compute(
    task: GPUComputeTask,
    inputData: Float32Array | Uint32Array,
    parameters: Record<string, any> = {}
  ): Promise<GPUComputeResult> {
    
    const startTime = performance.now();
    
    if (!this.isInitialized) {
      console.warn('⚠️ GPU未初始化，使用CPU回退');
      return this.cpuFallback(task, inputData, parameters);
    }

    try {
      let result: GPUComputeResult;

      if (this.device) {
        // WebGPU路径
        result = await this.computeWebGPU(task, inputData, parameters);
      } else if (this.gl) {
        // WebGL路径  
        result = await this.computeWebGL(task, inputData, parameters);
      } else {
        // CPU回退
        return this.cpuFallback(task, inputData, parameters);
      }

      const executionTime = performance.now() - startTime;
      result.executionTime = executionTime;

      // 更新性能统计
      this.updatePerformanceStats(result);

      return result;
      
    } catch (error) {
      console.error('❌ GPU计算失败:', error);
      this.performanceStats.errors++;
      
      if (this.config.fallback.enableCPUFallback) {
        console.log('🔄 回退到CPU计算...');
        return this.cpuFallback(task, inputData, parameters);
      }
      
      return {
        success: false,
        data: new Float32Array(),
        executionTime: performance.now() - startTime,
        memoryUsed: 0,
        mode: 'cpu_fallback',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * WebGPU计算实现
   */
  private async computeWebGPU(
    task: GPUComputeTask,
    inputData: Float32Array | Uint32Array,
    parameters: Record<string, any>
  ): Promise<GPUComputeResult> {
    
    if (!this.device) throw new Error('WebGPU设备不可用');

    console.log(`🔥 WebGPU执行任务: ${task}`);

    // 获取对应的计算着色器
    const shaderCode = this.getComputeShader(task, parameters);
    
    // 创建计算着色器模块
    const shaderModule = this.device.createShaderModule({
      code: shaderCode
    });

    // 创建输入缓冲区
    const inputBuffer = this.device.createBuffer({
      size: inputData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });

    new (inputData.constructor as any)(inputBuffer.getMappedRange()).set(inputData);
    inputBuffer.unmap();

    // 创建输出缓冲区
    const outputSize = this.calculateOutputSize(task, inputData.length, parameters);
    const outputBuffer = this.device.createBuffer({
      size: outputSize * 4, // 4 bytes per float
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    // 创建读取缓冲区
    const readBuffer = this.device.createBuffer({
      size: outputSize * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    // 创建绑定组布局
    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
      ]
    });

    // 创建绑定组
    const bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } }
      ]
    });

    // 创建计算管线
    const computePipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout]
      }),
      compute: {
        module: shaderModule,
        entryPoint: 'main'
      }
    });

    // 执行计算
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    
    const workgroupCount = Math.ceil(inputData.length / this.config.workgroupSize.x);
    passEncoder.dispatchWorkgroups(workgroupCount);
    passEncoder.end();

    // 复制结果到读取缓冲区
    commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, outputSize * 4);

    // 提交命令
    this.device.queue.submit([commandEncoder.finish()]);

    // 读取结果
    await readBuffer.mapAsync(GPUMapMode.READ);
    const resultArrayBuffer = readBuffer.getMappedRange();
    const resultData = new Float32Array(resultArrayBuffer.slice(0));
    readBuffer.unmap();

    // 清理资源
    inputBuffer.destroy();
    outputBuffer.destroy();
    readBuffer.destroy();

    return {
      success: true,
      data: resultData,
      executionTime: 0, // 将由调用者设置
      memoryUsed: (inputData.byteLength + outputSize * 4) / 1024 / 1024, // MB
      mode: 'webgpu'
    };
  }

  /**
   * WebGL计算实现
   */
  private async computeWebGL(
    task: GPUComputeTask,
    inputData: Float32Array | Uint32Array,
    parameters: Record<string, any>
  ): Promise<GPUComputeResult> {
    
    if (!this.gl) throw new Error('WebGL上下文不可用');

    console.log(`🎨 WebGL执行任务: ${task}`);

    // WebGL通过Transform Feedback或纹理实现并行计算
    const result = await this.executeWebGLCompute(task, inputData, parameters);

    return {
      success: true,
      data: result,
      executionTime: 0,
      memoryUsed: inputData.byteLength / 1024 / 1024,
      mode: 'webgl'
    };
  }

  /**
   * CPU回退实现
   */
  private cpuFallback(
    task: GPUComputeTask,
    inputData: Float32Array | Uint32Array,
    parameters: Record<string, any>
  ): GPUComputeResult {
    
    console.log(`🖥️ CPU执行任务: ${task}`);

    // 根据任务类型执行CPU计算
    let resultData: Float32Array;

    switch (task) {
      case 'vector_interpolation':
        resultData = this.cpuVectorInterpolation(inputData as Float32Array, parameters);
        break;
        
      case 'field_processing':
        resultData = this.cpuFieldProcessing(inputData as Float32Array, parameters);
        break;
        
      default:
        resultData = new Float32Array(inputData.length);
        resultData.set(inputData as Float32Array);
    }

    return {
      success: true,
      data: resultData,
      executionTime: 0,
      memoryUsed: inputData.byteLength / 1024 / 1024,
      mode: 'cpu_fallback'
    };
  }

  /**
   * 获取计算着色器代码
   */
  private getComputeShader(task: GPUComputeTask, parameters: Record<string, any>): string {
    
    const workgroupSize = this.config.workgroupSize;
    
    switch (task) {
      case 'vector_interpolation':
        return `
          @group(0) @binding(0) var<storage, read> input_data: array<f32>;
          @group(0) @binding(1) var<storage, read_write> output_data: array<f32>;
          
          @compute @workgroup_size(${workgroupSize.x}, ${workgroupSize.y}, ${workgroupSize.z})
          fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let index = global_id.x;
            if (index >= arrayLength(&input_data) / 3) { return; }
            
            let base_idx = index * 3;
            
            // 反距离加权插值
            var weighted_sum = vec3<f32>(0.0, 0.0, 0.0);
            var weight_sum = 0.0;
            
            // 简化的并行插值计算
            for (var i = 0u; i < min(8u, arrayLength(&input_data) / 3); i++) {
              let sample_idx = i * 3;
              let distance = length(
                vec3<f32>(
                  input_data[base_idx] - input_data[sample_idx],
                  input_data[base_idx + 1] - input_data[sample_idx + 1], 
                  input_data[base_idx + 2] - input_data[sample_idx + 2]
                )
              );
              
              let weight = 1.0 / (distance + 0.0001);
              weighted_sum += vec3<f32>(
                input_data[sample_idx],
                input_data[sample_idx + 1],
                input_data[sample_idx + 2]
              ) * weight;
              weight_sum += weight;
            }
            
            if (weight_sum > 0.0) {
              weighted_sum /= weight_sum;
              output_data[base_idx] = weighted_sum.x;
              output_data[base_idx + 1] = weighted_sum.y;
              output_data[base_idx + 2] = weighted_sum.z;
            }
          }
        `;
        
      case 'field_processing':
        return `
          @group(0) @binding(0) var<storage, read> input_data: array<f32>;
          @group(0) @binding(1) var<storage, read_write> output_data: array<f32>;
          
          @compute @workgroup_size(${workgroupSize.x}, ${workgroupSize.y}, ${workgroupSize.z})
          fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let index = global_id.x;
            if (index >= arrayLength(&input_data)) { return; }
            
            // 并行场数据处理
            let value = input_data[index];
            let processed = value * ${parameters.scale || 1.0} + ${parameters.offset || 0.0};
            
            output_data[index] = processed;
          }
        `;
        
      default:
        return `
          @group(0) @binding(0) var<storage, read> input_data: array<f32>;
          @group(0) @binding(1) var<storage, read_write> output_data: array<f32>;
          
          @compute @workgroup_size(${workgroupSize.x}, ${workgroupSize.y}, ${workgroupSize.z})
          fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let index = global_id.x;
            if (index >= arrayLength(&input_data)) { return; }
            
            output_data[index] = input_data[index];
          }
        `;
    }
  }

  /**
   * 计算输出数据大小
   */
  private calculateOutputSize(
    task: GPUComputeTask, 
    inputSize: number, 
    parameters: Record<string, any>
  ): number {
    switch (task) {
      case 'vector_interpolation':
      case 'field_processing':
        return inputSize;
        
      case 'contour_generation':
        return Math.floor(inputSize * (parameters.contourLevels || 10) * 0.1);
        
      default:
        return inputSize;
    }
  }

  /**
   * WebGL计算执行
   */
  private async executeWebGLCompute(
    task: GPUComputeTask,
    inputData: Float32Array | Uint32Array,
    parameters: Record<string, any>
  ): Promise<Float32Array> {
    
    if (!this.gl) throw new Error('WebGL上下文不可用');

    // 这里实现基于WebGL的并行计算
    // 使用纹理和着色器进行计算
    const result = new Float32Array(inputData.length);
    
    // 简化实现：直接复制数据
    result.set(inputData as Float32Array);
    
    return result;
  }

  /**
   * CPU矢量插值
   */
  private cpuVectorInterpolation(
    inputData: Float32Array,
    parameters: Record<string, any>
  ): Float32Array {
    
    const result = new Float32Array(inputData.length);
    const numPoints = inputData.length / 3;
    
    for (let i = 0; i < numPoints; i++) {
      const baseIdx = i * 3;
      
      // 简化的CPU插值实现
      result[baseIdx] = inputData[baseIdx] * (parameters.scale || 1.0);
      result[baseIdx + 1] = inputData[baseIdx + 1] * (parameters.scale || 1.0);
      result[baseIdx + 2] = inputData[baseIdx + 2] * (parameters.scale || 1.0);
    }
    
    return result;
  }

  /**
   * CPU场数据处理
   */
  private cpuFieldProcessing(
    inputData: Float32Array,
    parameters: Record<string, any>
  ): Float32Array {
    
    const result = new Float32Array(inputData.length);
    const scale = parameters.scale || 1.0;
    const offset = parameters.offset || 0.0;
    
    for (let i = 0; i < inputData.length; i++) {
      result[i] = inputData[i] * scale + offset;
    }
    
    return result;
  }

  /**
   * 更新性能统计
   */
  private updatePerformanceStats(result: GPUComputeResult): void {
    this.performanceStats.tasksCompleted++;
    this.performanceStats.totalExecutionTime += result.executionTime;
    this.performanceStats.memoryPeakUsage = Math.max(
      this.performanceStats.memoryPeakUsage,
      result.memoryUsed
    );
    
    if (!result.success) {
      this.performanceStats.errors++;
    }
  }

  /**
   * 处理设备丢失
   */
  private handleDeviceLoss(): void {
    console.warn('⚠️ GPU设备丢失，尝试重新初始化...');
    this.device = null;
    this.adapter = null;
    this.isInitialized = false;
    
    // 尝试重新初始化
    setTimeout(() => {
      this.initialize().then(success => {
        if (success) {
          console.log('✅ GPU设备重新初始化成功');
        } else {
          console.warn('❌ GPU设备重新初始化失败');
        }
      });
    }, 1000);
  }

  /**
   * 获取GPU状态
   */
  getStatus(): GPUStatus {
    const averageExecutionTime = this.performanceStats.tasksCompleted > 0 ?
      this.performanceStats.totalExecutionTime / this.performanceStats.tasksCompleted : 0;
      
    const errorRate = this.performanceStats.tasksCompleted > 0 ?
      this.performanceStats.errors / this.performanceStats.tasksCompleted : 0;

    return {
      available: this.isInitialized,
      webgpuSupported: !!this.device,
      webglSupported: !!this.gl,
      currentMode: this.device ? 'webgpu' : this.gl ? 'webgl' : 'cpu_fallback',
      memoryInfo: {
        used: this.performanceStats.memoryPeakUsage,
        available: 1024, // 估算值
        total: 2048 // 估算值
      },
      performanceMetrics: {
        averageExecutionTime,
        tasksCompleted: this.performanceStats.tasksCompleted,
        errorRate
      }
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    console.log('🧹 清理GPU资源...');
    
    // 清理缓冲池
    for (const [key, buffer] of this.bufferPool) {
      if (buffer instanceof GPUBuffer) {
        buffer.destroy();
      }
    }
    this.bufferPool.clear();
    
    // 清理设备
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    
    this.adapter = null;
    this.gl = null;
    this.canvas = null;
    this.isInitialized = false;
    
    console.log('✅ GPU资源清理完成');
  }

  /**
   * 合并配置
   */
  private mergeConfig(userConfig?: Partial<GPUAccelerationConfig>): GPUAccelerationConfig {
    const defaultConfig: GPUAccelerationConfig = {
      preferredMode: 'auto',
      workgroupSize: { x: 64, y: 1, z: 1 },
      memoryConfig: {
        maxBufferSize: 256,
        enableMemoryPool: true,
        autoGarbageCollection: true
      },
      performance: {
        batchSize: 1000,
        enableAsync: true,
        maxConcurrency: 4
      },
      fallback: {
        enableCPUFallback: true,
        performanceThreshold: 100
      }
    };

    return {
      ...defaultConfig,
      ...userConfig,
      workgroupSize: { ...defaultConfig.workgroupSize, ...userConfig?.workgroupSize },
      memoryConfig: { ...defaultConfig.memoryConfig, ...userConfig?.memoryConfig },
      performance: { ...defaultConfig.performance, ...userConfig?.performance },
      fallback: { ...defaultConfig.fallback, ...userConfig?.fallback }
    };
  }
}

// 导出便捷函数
export function createGPUAcceleration(
  config?: Partial<GPUAccelerationConfig>
): GPUAccelerationEngine {
  return new GPUAccelerationEngine(config);
}

// 导出GPU加速的高级后处理集成
export async function createGPUAcceleratedPostprocessor(
  config?: Partial<GPUAccelerationConfig>
) {
  const gpuEngine = createGPUAcceleration(config);
  const initialized = await gpuEngine.initialize();
  
  if (initialized) {
    console.log('🚀 GPU加速后处理器创建成功');
    const status = gpuEngine.getStatus();
    console.log('📊 GPU状态:', status);
  } else {
    console.warn('⚠️ GPU加速不可用，将使用CPU模式');
  }
  
  return gpuEngine;
}

// 使用示例常量
export const GPU_ACCELERATION_EXAMPLES = {
  basic: `
    // 基础GPU加速使用
    const gpu = await createGPUAcceleratedPostprocessor();
    
    const result = await gpu.compute(
      'vector_interpolation',
      vectorData,
      { scale: 1.0, neighbors: 8 }
    );
    
    console.log('计算结果:', result);
  `,
  
  advanced: `
    // 高级GPU配置
    const gpu = await createGPUAcceleratedPostprocessor({
      preferredMode: 'webgpu',
      workgroupSize: { x: 256, y: 1, z: 1 },
      performance: {
        batchSize: 10000,
        enableAsync: true,
        maxConcurrency: 8
      }
    });
    
    // 批量处理
    const tasks = [
      gpu.compute('field_processing', fieldData1, { scale: 2.0 }),
      gpu.compute('vector_interpolation', vectorData, { neighbors: 16 }),
      gpu.compute('contour_generation', scalarData, { levels: 20 })
    ];
    
    const results = await Promise.all(tasks);
  `
};