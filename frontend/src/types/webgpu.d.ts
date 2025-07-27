/**
 * WebGPU类型声明补充
 * 3号计算专家 - 为GPU可视化系统提供类型支持
 */

/// <reference types="@webgpu/types" />

declare global {
  interface Navigator {
    gpu?: GPU;
  }
  
  interface Window {
    WebGPU?: boolean;
  }
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