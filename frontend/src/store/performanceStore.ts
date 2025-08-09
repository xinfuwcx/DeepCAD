// Global performance store (lightweight reactive pattern)
// Exposes subscribe/get/update for 3D engine perf metrics

export interface PerfMetrics {
  fps: number;
  frameTime: number; // ms
  triangles: number;
  drawCalls: number;
  geometries?: number;
  textures?: number;
  gpuMemoryMB?: number; // optional estimated GPU memory (heuristic)
  timestamp: number;
}

type PerfListener = (m: PerfMetrics) => void;

class PerformanceStore {
  private current: PerfMetrics = { fps:0, frameTime:0, triangles:0, drawCalls:0, timestamp: Date.now() };
  private listeners = new Set<PerfListener>();

  get(){ return this.current; }
  subscribe(fn: PerfListener){ this.listeners.add(fn); return ()=> this.listeners.delete(fn); }
  update(partial: Partial<PerfMetrics>){
    this.current = { ...this.current, ...partial, timestamp: Date.now() };
    this.listeners.forEach(l=>{ try { l(this.current); } catch {} });
  }
}

export const performanceStore = new PerformanceStore();
