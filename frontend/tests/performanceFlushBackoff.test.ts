import { vi, describe, it, expect, beforeEach } from 'vitest';
import { performanceMonitor } from '../src/utils/performanceMonitor';

// NOTE: This test piggybacks on the singleton. We stub fetch and push synthetic metrics into queue.

function pushFakeMetrics(n: number) {
  for (let i = 0; i < n; i++) {
    // @ts-ignore access private for test via any cast
    performanceMonitor['protocolQueue'].push({
      timestamp: Date.now(),
      moduleId: 'test',
      metrics: { renderTime: 10, memoryUsage: 100, triangleCount: 0, drawCalls: 0, fps: 60 },
      thresholds: { maxRenderTime: 33.3, maxMemoryUsage: 1024, minFps: 30 },
      alerts: []
    });
  }
}

describe('performanceMonitor flush/backoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // reset internals
    // @ts-ignore
    performanceMonitor['protocolQueue'].length = 0;
    // @ts-ignore
    performanceMonitor['retryBuffer'].length = 0;
    // @ts-ignore
    performanceMonitor['consecutiveFailures'] = 0;
    // @ts-ignore
    performanceMonitor['nextSendEarliest'] = 0;
  });

  it('flushes when batchSize reached (success)', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as any);
    pushFakeMetrics(12); // default batchSize = 10 -> should flush 10
    // trigger immediate flush
    performanceMonitor.flushNow();
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('applies backoff on failure', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockRejectedValue(new Error('net fail'));
    pushFakeMetrics(10);
    performanceMonitor.flushNow();
    await vi.runAllTimersAsync();
    // @ts-ignore
    expect(performanceMonitor['consecutiveFailures']).toBeGreaterThan(0);
    fetchMock.mockRestore();
  });
});
