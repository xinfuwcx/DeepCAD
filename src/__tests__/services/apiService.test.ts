import { describe, it, expect, vi } from 'vitest';
import ApiService from '../../services/apiService';

// 模拟fetch
global.fetch = vi.fn();

describe('ApiService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('应该导出ApiService类', () => {
    expect(ApiService).toBeDefined();
  });

  it('应该可以调用simulateApiCall方法', async () => {
    const result = await ApiService.simulateApiCall('test');
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('endpoint', 'test');
  });

  it('应该返回正确的API响应格式', async () => {
    const response = await ApiService.simulateApiCall('format-test', { id: 123 });
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('message');
  });
}); 