import { adaptToProtocol, BasicPerformanceMetrics } from '../src/utils/performanceMonitor';

describe('adaptToProtocol', () => {
  it('maps basic metrics to protocol shape and generates alerts', () => {
    const basic: BasicPerformanceMetrics = {
      timestamp: 123,
      memory: { used: 900, total: 1200, percentage: 85 },
      fps: 25,
      renderTime: 16,
      apiLatency: {},
      threejsStats: { geometries: 10, textures: 2, programs: 1, calls: 120, triangles: 500000, points: 0 }
    };
    const proto = adaptToProtocol(basic, 'test.mod');
    expect(proto.moduleId).toBe('test.mod');
    expect(proto.metrics.fps).toBe(25);
    expect(proto.metrics.triangleCount).toBe(500000);
    expect(proto.alerts.length).toBeGreaterThanOrEqual(2); // low FPS + high memory + triangles
  });
});
