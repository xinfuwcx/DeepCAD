/**
 * WebGPU类型声明补充
 * 3号计算专家 - 为GPU可视化系统提供类型支持
 * 0号架构师 - 扩展WebGPU完整类型定义
 */

/// <reference types="@webgpu/types" />

declare global {
  interface Navigator {
    gpu?: GPU;
  }
  
  interface Window {
    WebGPU?: boolean;
    requestIdleCallback?: (callback: () => void) => void;
    cancelIdleCallback?: (id: number) => void;
  }

  // WebGPU核心接口扩展
  interface GPU {
    requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
    getPreferredCanvasFormat(): GPUTextureFormat;
  }

  interface GPUAdapter {
    requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
    features: GPUSupportedFeatures;
    limits: GPUSupportedLimits;
    info: GPUAdapterInfo;
  }

  interface GPUDevice extends EventTarget {
    features: GPUSupportedFeatures;
    limits: GPUSupportedLimits;
    queue: GPUQueue;
    
    createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
    createTexture(descriptor: GPUTextureDescriptor): GPUTexture;
    createSampler(descriptor?: GPUSamplerDescriptor): GPUSampler;
    createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout;
    createPipelineLayout(descriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout;
    createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;
    createComputePipeline(descriptor: GPUComputePipelineDescriptor): GPUComputePipeline;
    createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline;
    createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup;
    createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): GPUCommandEncoder;

    pushErrorScope(filter: GPUErrorFilter): void;
    popErrorScope(): Promise<GPUError | null>;
    destroy(): void;
  }

  // 计算管线和编码器
  interface GPUComputePipeline {
    getBindGroupLayout(index: number): GPUBindGroupLayout;
  }

  interface GPUComputePassEncoder {
    setPipeline(pipeline: GPUComputePipeline): void;
    setBindGroup(index: number, bindGroup: GPUBindGroup, dynamicOffsets?: number[]): void;
    dispatchWorkgroups(workgroupCountX: number, workgroupCountY?: number, workgroupCountZ?: number): void;
    end(): void;
    insertDebugMarker(markerLabel: string): void;
  }

  // 缓冲区接口
  interface GPUBuffer {
    size: number;
    usage: GPUBufferUsageFlags;
    mapState: 'unmapped' | 'pending' | 'mapped';
    
    mapAsync(mode: GPUMapModeFlags, offset?: number, size?: number): Promise<void>;
    getMappedRange(offset?: number, size?: number): ArrayBuffer;
    unmap(): void;
    destroy(): void;
  }

  // 着色器模块
  interface GPUShaderModule {
    getCompilationInfo(): Promise<GPUCompilationInfo>;
  }

  interface GPUCompilationInfo {
    messages: GPUCompilationMessage[];
  }

  interface GPUCompilationMessage {
    message: string;
    type: 'error' | 'warning' | 'info';
    lineNum: number;
    linePos: number;
  }

  // 队列接口
  interface GPUQueue {
    submit(commandBuffers: GPUCommandBuffer[]): void;
    writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: ArrayBuffer | ArrayBufferView): void;
    onSubmittedWorkDone(): Promise<void>;
  }

  // 命令编码器
  interface GPUCommandEncoder {
    beginComputePass(descriptor?: GPUComputePassDescriptor): GPUComputePassEncoder;
    copyBufferToBuffer(source: GPUBuffer, sourceOffset: number, destination: GPUBuffer, destinationOffset: number, size: number): void;
    finish(descriptor?: GPUCommandBufferDescriptor): GPUCommandBuffer;
    insertDebugMarker(markerLabel: string): void;
  }

  // 基础类型定义
  type GPUBufferUsageFlags = number;
  type GPUTextureUsageFlags = number;
  type GPUMapModeFlags = number;
  type GPUErrorFilter = 'validation' | 'out-of-memory' | 'internal';
  type GPUTextureFormat = string;

  // 描述符接口
  interface GPURequestAdapterOptions {
    powerPreference?: 'low-power' | 'high-performance';
    forceFallbackAdapter?: boolean;
  }

  interface GPUDeviceDescriptor {
    label?: string;
    requiredFeatures?: string[];
    requiredLimits?: Record<string, number>;
  }

  interface GPUBufferDescriptor {
    label?: string;
    size: number;
    usage: GPUBufferUsageFlags;
    mappedAtCreation?: boolean;
  }

  interface GPUShaderModuleDescriptor {
    label?: string;
    code: string;
  }

  interface GPUComputePipelineDescriptor {
    label?: string;
    layout: GPUPipelineLayout | 'auto';
    compute: GPUProgrammableStage;
  }

  interface GPUProgrammableStage {
    module: GPUShaderModule;
    entryPoint: string;
    constants?: Record<string, number>;
  }

  interface GPUComputePassDescriptor {
    label?: string;
  }

  interface GPUCommandBufferDescriptor {
    label?: string;
  }

  // 占位符接口（需要时可扩展）
  interface GPUTexture {}
  interface GPUSampler {}
  interface GPUBindGroupLayout {}
  interface GPUPipelineLayout {}
  interface GPURenderPipeline {}
  interface GPUBindGroup {}
  interface GPUCommandBuffer {}
  interface GPUError { message: string; }
  interface GPUSupportedFeatures extends Set<string> {}
  interface GPUSupportedLimits {}
  interface GPUAdapterInfo {}
  interface GPUTextureDescriptor {}
  interface GPUSamplerDescriptor {}
  interface GPUBindGroupLayoutDescriptor {}
  interface GPUPipelineLayoutDescriptor {}
  interface GPURenderPipelineDescriptor {}
  interface GPUBindGroupDescriptor {}
  interface GPUCommandEncoderDescriptor {}
}

// 扩展Three.js类型以支持WebGPU
declare module 'three' {
  interface WebGLRenderer {
    xr: any;
  }
  
  interface BufferGeometry {
    computeBoundings(): void;
  }
}

// 扩展性能API
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

export {};