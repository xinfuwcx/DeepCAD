import { describe, it, expect } from 'vitest';
import { performanceMonitor } from '../src/utils/performanceMonitor';

describe('performanceMonitor.getInternalState', () => {
  it('returns expected structure', () => {
    const state = performanceMonitor.getInternalState();
    expect(state).toHaveProperty('queueSize');
    expect(state).toHaveProperty('retryBufferSize');
    expect(state).toHaveProperty('consecutiveFailures');
    expect(state).toHaveProperty('nextSendInMs');
    expect(state).toHaveProperty('lastFlushTime');
    expect(state.flushConfig).toHaveProperty('batchSize');
    expect(typeof state.queueSize).toBe('number');
    expect(typeof state.flushConfig.batchSize).toBe('number');
  });
});
