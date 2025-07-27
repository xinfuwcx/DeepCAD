export { PerformanceMonitor } from './PerformanceMonitor';
export { PerformancePanel } from './PerformancePanel';

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  drawCalls: number;
  triangles: number;
  frameTime: number;
}

export interface PerformanceConfig {
  targetFPS: number;
  memoryLimit: number;
  autoOptimize: boolean;
  showPanel: boolean;
}

// 简化的性能工具
export const PerformanceUtils = {
  // 获取内存使用情况
  getMemoryUsage: (): number => {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  },

  // 检测设备性能
  detectDeviceCapability: (): 'high' | 'medium' | 'low' => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
    
    if (!gl) return 'low';
    
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    if (maxTextureSize >= 8192) return 'high';
    if (maxTextureSize >= 4096) return 'medium';
    
    return 'low';
  },

  // 节流函数
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }
};