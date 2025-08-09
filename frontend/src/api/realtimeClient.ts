/**
 * DeepCAD 实时通信客户端
 * 1号架构师负责 - 支持计算进度、状态同步、团队协作
 */

import React from 'react';
import { ComponentDevHelper } from '../utils/developmentTools';

// 消息类型定义
export interface RealtimeMessage {
  type: string;
  id: string;
  timestamp: number;
  data: any;
  from?: string;
  to?: string;
}

// 连接状态
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

// 事件监听器类型
export type MessageHandler = (message: RealtimeMessage) => void;
export type StatusHandler = (status: ConnectionStatus) => void;

// WebSocket客户端类
class RealtimeClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  
  // 事件监听器
  private messageHandlers = new Map<string, MessageHandler[]>();
  private statusHandlers: StatusHandler[] = [];
  
  // 消息队列 (离线时缓存)
  private messageQueue: RealtimeMessage[] = [];
  private maxQueueSize = 100;

  constructor() {
    // 根据环境设置WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = import.meta.env?.MODE === 'development' ? '8087' : window.location.port;
    this.url = `${protocol}//${host}:${port}/ws/realtime`;
  }

  // 连接到WebSocket服务器
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.setStatus('connecting');
      ComponentDevHelper.logAPICall?.(this.url, 'WebSocket', '1号架构师');

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = (event) => {
          this.setStatus('connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.processMessageQueue();
          
          ComponentDevHelper.logDevTip('WebSocket连接已建立');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: RealtimeMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            ComponentDevHelper.logError(error as Error, 'WebSocket消息解析', '1号架构师');
          }
        };

        this.ws.onclose = (event) => {
          this.setStatus('disconnected');
          this.stopHeartbeat();
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          } else {
            ComponentDevHelper.logDevTip('WebSocket连接已关闭');
          }
        };

        this.ws.onerror = (event) => {
          this.setStatus('error');
          const error = new Error('WebSocket连接错误');
          ComponentDevHelper.logError(error, 'WebSocket连接', '1号架构师');
          reject(error);
        };

      } catch (error) {
        this.setStatus('error');
        reject(error);
      }
    });
  }

  // 断开连接
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.stopHeartbeat();
    this.setStatus('disconnected');
  }

  // 发送消息
  send(type: string, data: any, to?: string): boolean {
    const message: RealtimeMessage = {
      type,
      id: this.generateMessageId(),
      timestamp: Date.now(),
      data,
      from: 'frontend',
      to
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        ComponentDevHelper.logAPICall?.(`WebSocket/${type}`, 'SEND', '1号架构师');
        return true;
      } catch (error) {
        ComponentDevHelper.logError(error as Error, 'WebSocket发送', '1号架构师');
        return false;
      }
    } else {
      // 连接断开时缓存消息
      if (this.messageQueue.length < this.maxQueueSize) {
        this.messageQueue.push(message);
        ComponentDevHelper.logDevTip(`消息已缓存，等待连接恢复: ${type}`);
      }
      return false;
    }
  }

  // 订阅消息类型
  subscribe(messageType: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    
    this.messageHandlers.get(messageType)!.push(handler);
    
    // 返回取消订阅函数
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  // 订阅连接状态变化
  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.push(handler);
    
    // 立即触发当前状态
    handler(this.connectionStatus);
    
    return () => {
      const index = this.statusHandlers.indexOf(handler);
      if (index > -1) {
        this.statusHandlers.splice(index, 1);
      }
    };
  }

  // 获取连接状态
  getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  // 检查是否已连接
  isConnected(): boolean {
    return this.connectionStatus === 'connected' && 
           this.ws && 
           this.ws.readyState === WebSocket.OPEN;
  }

  // 私有方法 - 处理接收到的消息
  private handleMessage(message: RealtimeMessage): void {
    // 心跳响应
    if (message.type === 'heartbeat_response') {
      return;
    }

    // 分发消息给对应的处理器
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          ComponentDevHelper.logError(error as Error, `消息处理器-${message.type}`, '1号架构师');
        }
      });
    }

    // 记录未处理的消息类型
    if (!handlers || handlers.length === 0) {
      ComponentDevHelper.logDevTip(`收到未处理的消息类型: ${message.type}`);
    }
  }

  // 私有方法 - 设置连接状态
  private setStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.statusHandlers.forEach(handler => {
        try {
          handler(status);
        } catch (error) {
          ComponentDevHelper.logError(error as Error, '状态处理器', '1号架构师');
        }
      });
    }
  }

  // 私有方法 - 安排重连
  private scheduleReconnect(): void {
    this.setStatus('reconnecting');
    this.reconnectAttempts++;
    
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    ComponentDevHelper.logDevTip(`${delay}ms后尝试第${this.reconnectAttempts}次重连`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        ComponentDevHelper.logError(error as Error, 'WebSocket重连', '1号架构师');
      });
    }, delay);
  }

  // 私有方法 - 启动心跳
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send('heartbeat', { timestamp: Date.now() });
      }
    }, 30000); // 30秒心跳
  }

  // 私有方法 - 停止心跳
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 私有方法 - 处理消息队列
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift()!;
      try {
        this.ws!.send(JSON.stringify(message));
        ComponentDevHelper.logDevTip(`缓存消息已发送: ${message.type}`);
      } catch (error) {
        ComponentDevHelper.logError(error as Error, '缓存消息发送', '1号架构师');
        break;
      }
    }
  }

  // 私有方法 - 生成消息ID
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 全局实例
export const realtimeClient = new RealtimeClient();

// React Hook - 使用实时通信
export function useRealtimeConnection() {
  const [status, setStatus] = React.useState<ConnectionStatus>('disconnected');

  React.useEffect(() => {
    const unsubscribe = realtimeClient.onStatusChange(setStatus);
    
    // 自动连接
    if (!realtimeClient.isConnected()) {
      realtimeClient.connect().catch(error => {
        ComponentDevHelper.logError(error as Error, 'useRealtimeConnection', '1号架构师');
      });
    }

    return unsubscribe;
  }, []);

  return {
    status,
    isConnected: realtimeClient.isConnected(),
    send: realtimeClient.send.bind(realtimeClient),
    subscribe: realtimeClient.subscribe.bind(realtimeClient),
    connect: realtimeClient.connect.bind(realtimeClient),
    disconnect: realtimeClient.disconnect.bind(realtimeClient)
  };
}

// 计算进度监控Hook
export function useComputationProgress(jobId?: string) {
  const [progress, setProgress] = React.useState<{
    percentage: number;
    stage: string;
    message: string;
    eta?: number;
  }>({ percentage: 0, stage: 'idle', message: '等待开始' });

  const { subscribe, isConnected } = useRealtimeConnection();

  React.useEffect(() => {
    if (!jobId || !isConnected) return;

    const unsubscribe = subscribe('computation_progress', (message) => {
      if (message.data.jobId === jobId) {
        setProgress({
          percentage: message.data.percentage || 0,
          stage: message.data.stage || 'unknown',
          message: message.data.message || '',
          eta: message.data.eta
        });
      }
    });

    return unsubscribe;
  }, [jobId, isConnected, subscribe]);

  return progress;
}

// 团队协作消息Hook
export function useTeamMessages() {
  const [messages, setMessages] = React.useState<RealtimeMessage[]>([]);
  const { subscribe, send, isConnected } = useRealtimeConnection();

  React.useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe('team_message', (message) => {
      setMessages(prev => [...prev, message].slice(-50)); // 保留最近50条消息
    });

    return unsubscribe;
  }, [isConnected, subscribe]);

  const sendMessage = React.useCallback((content: string, to?: string) => {
    return send('team_message', { content, timestamp: Date.now() }, to);
  }, [send]);

  return { messages, sendMessage, isConnected };
}

export default realtimeClient;