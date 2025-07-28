/**
 * 测试框架类型定义
 * 0号架构师 - 统一测试环境类型
 */

import type * as TestingLibrary from '@testing-library/react';

declare global {
  // 扩展全局类型以支持测试库
  interface Window {
    requestIdleCallback?: (callback: () => void) => void;
    cancelIdleCallback?: (id: number) => void;
  }

  // Mock函数类型
  interface MockFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T>;
    mockImplementation(fn: T): MockFunction<T>;
    mockReturnValue(value: ReturnType<T>): MockFunction<T>;
    mockResolvedValue(value: Awaited<ReturnType<T>>): MockFunction<T>;
    mockRejectedValue(error: any): MockFunction<T>;
    mockClear(): void;
    mockReset(): void;
    mockRestore(): void;
    calls: Parameters<T>[];
  }

  // WebSocket Mock类型扩展
  interface MockWebSocketConstructor {
    new (url: string): MockWebSocket;
    CONNECTING: 0;
    OPEN: 1;
    CLOSING: 2;
    CLOSED: 3;
    instances?: MockWebSocket[];
  }

  interface MockWebSocket extends Partial<WebSocket> {
    simulateMessage(data: any): void;
    simulateError(): void;
  }
}

// 测试工具类型
export interface TestRenderOptions {
  wrapper?: React.ComponentType<any>;
  queries?: typeof TestingLibrary.queries;
}

export interface MockStore<T = any> {
  getState(): T;
  setState(state: Partial<T>): void;
  subscribe(listener: () => void): () => void;
}

// 测试数据类型
export interface TestSceneData {
  id: string;
  name: string;
  components: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  materials: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  meshing: {
    global_size: number;
  };
  created_at: string;
  updated_at: string;
}

export interface TestTaskProgress {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  progress: number;
}

export interface TestSystemStatus {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

// 性能测试基准
export interface PerformanceBenchmark {
  maxTime: number;
  maxMemory: number;
  targetFPS: number;
}

// WebGPU测试Mock类型
export interface MockGPUDevice {
  createBuffer(descriptor: GPUBufferDescriptor): MockGPUBuffer;
  createComputePipeline(descriptor: GPUComputePipelineDescriptor): MockGPUComputePipeline;
  createCommandEncoder(): MockGPUCommandEncoder;
  queue: MockGPUQueue;
}

export interface MockGPUBuffer {
  size: number;
  usage: GPUBufferUsageFlags;
  destroy(): void;
  mapAsync(mode: GPUMapModeFlags): Promise<void>;
  getMappedRange(): ArrayBuffer;
  unmap(): void;
}

export interface MockGPUComputePipeline {
  getBindGroupLayout(index: number): MockGPUBindGroupLayout;
}

export interface MockGPUBindGroupLayout {
  // Mock implementation
}

export interface MockGPUCommandEncoder {
  beginComputePass(): MockGPUComputePassEncoder;
  finish(): MockGPUCommandBuffer;
}

export interface MockGPUComputePassEncoder {
  setPipeline(pipeline: MockGPUComputePipeline): void;
  setBindGroup(index: number, bindGroup: any): void;
  dispatchWorkgroups(x: number, y?: number, z?: number): void;
  end(): void;
}

export interface MockGPUCommandBuffer {
  // Mock implementation
}

export interface MockGPUQueue {
  submit(commandBuffers: MockGPUCommandBuffer[]): void;
  writeBuffer(buffer: MockGPUBuffer, bufferOffset: number, data: ArrayBuffer): void;
}

export {};