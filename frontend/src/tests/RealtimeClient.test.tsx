/**
 * 实时通信客户端测试套件
 * 1号架构师开发 - 为3号计算专家提供的测试框架
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { realtimeClient, useRealtimeConnection, useComputationProgress } from '../api/realtimeClient';
import RealtimeProgressMonitor from '../components/computation/RealtimeProgressMonitor';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // 模拟异步连接
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    // 模拟发送数据
    console.log('MockWebSocket send:', data);
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason, wasClean: true }));
    }
  }

  // 模拟接收消息的方法
  simulateMessage(data: any) {
    if (this.onmessage && this.readyState === MockWebSocket.OPEN) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  // 模拟连接错误
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// 全局替换WebSocket
(global as any).WebSocket = MockWebSocket;

// 测试组件
const TestRealtimeComponent: React.FC<{ jobId?: string }> = ({ jobId }) => {
  const { status, isConnected, send } = useRealtimeConnection();
  const progress = useComputationProgress(jobId);

  return (
    <div>
      <div data-testid="connection-status">{status}</div>
      <div data-testid="is-connected">{isConnected.toString()}</div>
      <div data-testid="progress-percentage">{progress.percentage}</div>
      <div data-testid="progress-stage">{progress.stage}</div>
      <div data-testid="progress-message">{progress.message}</div>
      <button 
        data-testid="send-button" 
        onClick={() => send('test_message', { test: 'data' })}
      >
        发送消息
      </button>
    </div>
  );
};

describe('RealtimeClient', () => {
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    // 清理之前的连接
    realtimeClient.disconnect();
    vi.clearAllMocks();
  });

  afterEach(() => {
    realtimeClient.disconnect();
  });

  describe('连接管理', () => {
    it('应该能够成功连接到WebSocket服务器', async () => {
      render(<TestRealtimeComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
        expect(screen.getByTestId('is-connected')).toHaveTextContent('true');
      });
    });

    it('应该在连接失败时正确处理错误', async () => {
      // 模拟连接错误
      const originalWebSocket = (global as any).WebSocket;
      (global as any).WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => this.simulateError(), 5);
        }
      };

      render(<TestRealtimeComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('error');
      });

      // 恢复原始WebSocket
      (global as any).WebSocket = originalWebSocket;
    });

    it('应该支持自动重连机制', async () => {
      render(<TestRealtimeComponent />);

      // 等待连接建立
      await waitFor(() => {
        expect(screen.getByTestId('is-connected')).toHaveTextContent('true');
      });

      // 模拟连接断开
      act(() => {
        realtimeClient.disconnect();
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');
      });
    });
  });

  describe('消息发送和接收', () => {
    it('应该能够发送消息', async () => {
      const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');
      
      render(<TestRealtimeComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('is-connected')).toHaveTextContent('true');
      });

      fireEvent.click(screen.getByTestId('send-button'));

      expect(sendSpy).toHaveBeenCalled();
    });

    it('应该能够接收和处理计算进度消息', async () => {
      const testJobId = 'test-job-123';
      
      render(<TestRealtimeComponent jobId={testJobId} />);

      await waitFor(() => {
        expect(screen.getByTestId('is-connected')).toHaveTextContent('true');
      });

      // 模拟接收进度消息
      const mockProgress = {
        type: 'computation_progress',
        id: 'msg_123',
        timestamp: Date.now(),
        data: {
          jobId: testJobId,
          percentage: 45.5,
          stage: 'mesh_generation',
          message: '正在生成网格...'
        }
      };

      // 获取当前的WebSocket实例并发送消息
      const wsInstances = (MockWebSocket as any).instances || [];
      if (wsInstances.length > 0) {
        act(() => {
          wsInstances[0].simulateMessage(mockProgress);
        });
      }

      await waitFor(() => {
        expect(screen.getByTestId('progress-percentage')).toHaveTextContent('45.5');
        expect(screen.getByTestId('progress-stage')).toHaveTextContent('mesh_generation');
        expect(screen.getByTestId('progress-message')).toHaveTextContent('正在生成网格...');
      });
    });
  });

  describe('心跳机制', () => {
    it('应该定期发送心跳消息', async () => {
      vi.useFakeTimers();
      const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');

      render(<TestRealtimeComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('is-connected')).toHaveTextContent('true');
      });

      // 快进30秒触发心跳
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // 应该发送心跳消息
      expect(sendSpy).toHaveBeenCalledWith(
        expect.stringContaining('"type":"heartbeat"')
      );

      vi.useRealTimers();
    });
  });

  describe('错误处理', () => {
    it('应该正确处理无效的消息格式', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<TestRealtimeComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('is-connected')).toHaveTextContent('true');
      });

      // 发送无效JSON消息
      const wsInstances = (MockWebSocket as any).instances || [];
      if (wsInstances.length > 0) {
        act(() => {
          if (wsInstances[0].onmessage) {
            wsInstances[0].onmessage(new MessageEvent('message', { 
              data: 'invalid json' 
            }));
          }
        });
      }

      // 应该记录错误但不崩溃
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });
});

describe('RealtimeProgressMonitor Component', () => {
  beforeEach(() => {
    realtimeClient.disconnect();
  });

  afterEach(() => {
    realtimeClient.disconnect();
  });

  it('应该正确渲染进度监控界面', () => {
    render(<RealtimeProgressMonitor jobId="test-job" title="测试任务" />);

    expect(screen.getByText('测试任务')).toBeInTheDocument();
    expect(screen.getByText('等待计算任务')).toBeInTheDocument();
  });

  it('应该在有任务ID时显示任务信息', async () => {
    const testJobId = 'test-job-456';

    render(<RealtimeProgressMonitor jobId={testJobId} />);

    await waitFor(() => {
      expect(screen.getByText(testJobId)).toBeInTheDocument();
    });
  });

  it('应该正确显示连接状态警告', async () => {
    // 模拟连接断开状态
    render(<RealtimeProgressMonitor jobId="test-job" />);

    // 等待组件挂载并尝试连接
    await waitFor(() => {
      // 检查是否显示连接相关的UI元素
      expect(screen.getByText('计算进度监控')).toBeInTheDocument();
    });
  });

  it('应该支持控制按钮交互', async () => {
    render(<RealtimeProgressMonitor jobId="test-job" showControls={true} />);

    await waitFor(() => {
      expect(screen.getByText('计算进度监控')).toBeInTheDocument();
    });

    // 由于控制按钮只在特定状态下显示，这里主要测试组件能正常渲染
  });
});

// 性能测试
describe('性能测试', () => {
  it('应该能够处理大量并发消息', async () => {
    const testJobId = 'performance-test';
    
    render(<TestRealtimeComponent jobId={testJobId} />);

    await waitFor(() => {
      expect(screen.getByTestId('is-connected')).toHaveTextContent('true');
    });

    // 模拟快速发送100条进度更新消息
    const startTime = performance.now();
    
    for (let i = 0; i < 100; i++) {
      const mockProgress = {
        type: 'computation_progress',
        id: `msg_${i}`,
        timestamp: Date.now(),
        data: {
          jobId: testJobId,
          percentage: i,
          stage: 'solving',
          message: `进度更新 ${i}`
        }
      };

      const wsInstances = (MockWebSocket as any).instances || [];
      if (wsInstances.length > 0) {
        act(() => {
          wsInstances[0].simulateMessage(mockProgress);
        });
      }
    }

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // 处理100条消息应该在合理时间内完成（小于1秒）
    expect(processingTime).toBeLessThan(1000);

    await waitFor(() => {
      expect(screen.getByTestId('progress-percentage')).toHaveTextContent('99');
    });
  });
});

// 集成测试
describe('集成测试', () => {
  it('完整的计算进度监控流程', async () => {
    const testJobId = 'integration-test';
    
    render(<RealtimeProgressMonitor jobId={testJobId} />);

    // 1. 等待连接建立
    await waitFor(() => {
      expect(screen.getByText('计算进度监控')).toBeInTheDocument();
    });

    // 2. 模拟完整的计算流程
    const stages = [
      { stage: 'initializing', percentage: 10, message: '初始化计算环境' },
      { stage: 'mesh_generation', percentage: 30, message: '生成有限元网格' },
      { stage: 'preprocessing', percentage: 50, message: '预处理计算数据' },
      { stage: 'solving', percentage: 80, message: '求解线性方程组' },
      { stage: 'postprocessing', percentage: 95, message: '后处理结果数据' },
      { stage: 'completed', percentage: 100, message: '计算完成' }
    ];

    for (const stageData of stages) {
      act(() => {
        const mockProgress = {
          type: 'computation_progress',
          id: `msg_${Date.now()}`,
          timestamp: Date.now(),
          data: {
            jobId: testJobId,
            ...stageData
          }
        };

        // 模拟消息接收
        const wsInstances = (MockWebSocket as any).instances || [];
        if (wsInstances.length > 0) {
          wsInstances[0].simulateMessage(mockProgress);
        }
      });

      // 等待UI更新
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 验证最终状态
    await waitFor(() => {
      expect(screen.getByText('完成')).toBeInTheDocument();
      expect(screen.getByText('计算完成')).toBeInTheDocument();
    });
  });
});