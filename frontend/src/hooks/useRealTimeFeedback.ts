/**
 * WebSocket实时反馈Hook
 * 提供任务进度、状态更新和IoT数据的实时通信
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { message } from 'antd';

// 反馈消息类型
export enum FeedbackType {
  PROGRESS = 'progress',
  STATUS = 'status',
  WARNING = 'warning',
  ERROR = 'error',
  INFO = 'info',
  RESULT = 'result',
  IOT_DATA = 'iot_data',
  AI_OPTIMIZATION = 'ai_optimization'
}

// 任务状态
export enum TaskStatus {
  PENDING = 'pending',
  STARTING = 'starting',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// 反馈消息接口
export interface FeedbackMessage {
  id: string;
  type: FeedbackType;
  task_id: string;
  task_name: string;
  timestamp: string;
  message: string;
  data?: any;
  progress?: number;
  status?: TaskStatus;
}

// 任务信息接口
export interface TaskInfo {
  id: string;
  name: string;
  type: string;
  status: TaskStatus;
  progress: number;
  start_time: string;
  end_time?: string;
  client_id?: string;
  metadata?: any;
}

// Hook配置
interface UseRealTimeFeedbackOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: FeedbackMessage) => void;
  onTaskUpdate?: (task: TaskInfo) => void;
  onIoTData?: (data: any) => void;
  onAIOptimization?: (result: any) => void;
}

// Hook返回值
interface UseRealTimeFeedbackReturn {
  // 连接状态
  isConnected: boolean;
  isConnecting: boolean;
  
  // 消息和任务
  messages: FeedbackMessage[];
  activeTasks: TaskInfo[];
  
  // 连接控制
  connect: () => void;
  disconnect: () => void;
  
  // 任务管理
  subscribeToTask: (taskId: string) => void;
  unsubscribeFromTask: (taskId: string) => void;
  cancelTask: (taskId: string) => void;
  
  // 数据获取
  getActiveeTasks: () => void;
  getTaskHistory: () => void;
  
  // 清理
  clearMessages: () => void;
}

export function useRealTimeFeedback(
  clientId: string,
  options: UseRealTimeFeedbackOptions = {}
): UseRealTimeFeedbackReturn {
  const {
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onTaskUpdate,
    onIoTData,
    onAIOptimization
  } = options;

  // 状态管理
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [activeTasks, setActiveTasks] = useState<TaskInfo[]>([]);

  // WebSocket引用
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 获取WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/websockets/ws/realtime/${clientId}`;
  }, [clientId]);

  // 发送消息
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // 处理接收到的消息
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const feedbackMessage: FeedbackMessage = JSON.parse(event.data);
      
      // 添加到消息列表
      setMessages(prev => {
        const newMessages = [...prev, feedbackMessage];
        // 保留最近1000条消息
        return newMessages.slice(-1000);
      });

      // 调用回调函数
      if (onMessage) {
        onMessage(feedbackMessage);
      }

      // 处理不同类型的消息
      switch (feedbackMessage.type) {
        case FeedbackType.STATUS:
        case FeedbackType.PROGRESS:
          if (feedbackMessage.data && onTaskUpdate) {
            const taskInfo: TaskInfo = {
              id: feedbackMessage.task_id,
              name: feedbackMessage.task_name,
              type: feedbackMessage.data.task_type || 'unknown',
              status: feedbackMessage.status || TaskStatus.PENDING,
              progress: feedbackMessage.progress || 0,
              start_time: feedbackMessage.data.start_time || feedbackMessage.timestamp,
              end_time: feedbackMessage.data.end_time,
              client_id: feedbackMessage.data.client_id,
              metadata: feedbackMessage.data.metadata
            };
            onTaskUpdate(taskInfo);
          }
          break;

        case FeedbackType.IOT_DATA:
          if (onIoTData && feedbackMessage.data) {
            onIoTData(feedbackMessage.data);
          }
          break;

        case FeedbackType.AI_OPTIMIZATION:
          if (onAIOptimization && feedbackMessage.data) {
            onAIOptimization(feedbackMessage.data);
          }
          break;

        case FeedbackType.ERROR:
          message.error(feedbackMessage.message);
          break;

        case FeedbackType.WARNING:
          message.warning(feedbackMessage.message);
          break;

        case FeedbackType.INFO:
          if (feedbackMessage.message !== 'WebSocket连接已建立') {
            message.info(feedbackMessage.message);
          }
          break;
      }

    } catch (error) {
      console.error('处理WebSocket消息失败:', error);
    }
  }, [onMessage, onTaskUpdate, onIoTData, onAIOptimization]);

  // 处理特殊消息（非FeedbackMessage格式）
  const handleSpecialMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'pong':
        // 心跳响应，不需要特殊处理
        break;

      case 'active_tasks':
        if (data.data) {
          setActiveTasks(data.data);
        }
        break;

      case 'task_history':
        if (data.data) {
          setMessages(data.data);
        }
        break;

      case 'error':
        message.error(data.message);
        break;

      default:
        console.log('未知的特殊消息类型:', data.type);
    }
  }, []);

  // WebSocket连接
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    
    try {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectCountRef.current = 0;
        console.log('WebSocket连接已建立');
        
        // 发送心跳
        sendMessage({ type: 'ping' });
        
        // 获取活跃任务
        sendMessage({ type: 'get_active_tasks' });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // 检查是否是FeedbackMessage格式
          if (data.id && data.type && data.task_id && data.timestamp) {
            handleMessage(event);
          } else {
            handleSpecialMessage(data);
          }
        } catch (error) {
          console.error('解析WebSocket消息失败:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        console.log('WebSocket连接已断开');
        
        // 自动重连
        if (reconnectCountRef.current < maxReconnectAttempts) {
          reconnectCountRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`尝试重连... (${reconnectCountRef.current}/${maxReconnectAttempts})`);
            connect();
          }, reconnectInterval);
        } else {
          message.error('WebSocket连接失败，请刷新页面重试');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        setIsConnecting(false);
      };

    } catch (error) {
      console.error('创建WebSocket连接失败:', error);
      setIsConnecting(false);
    }
  }, [getWebSocketUrl, handleMessage, handleSpecialMessage, maxReconnectAttempts, reconnectInterval, sendMessage]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    reconnectCountRef.current = maxReconnectAttempts; // 阻止自动重连
  }, [maxReconnectAttempts]);

  // 订阅任务
  const subscribeToTask = useCallback((taskId: string) => {
    sendMessage({
      type: 'subscribe',
      task_id: taskId
    });
  }, [sendMessage]);

  // 取消订阅任务
  const unsubscribeFromTask = useCallback((taskId: string) => {
    sendMessage({
      type: 'unsubscribe',
      task_id: taskId
    });
  }, [sendMessage]);

  // 取消任务
  const cancelTask = useCallback((taskId: string) => {
    sendMessage({
      type: 'cancel_task',
      task_id: taskId
    });
  }, [sendMessage]);

  // 获取活跃任务
  const getActiveeTasks = useCallback(() => {
    sendMessage({ type: 'get_active_tasks' });
  }, [sendMessage]);

  // 获取任务历史
  const getTaskHistory = useCallback(() => {
    sendMessage({ type: 'get_task_history' });
  }, [sendMessage]);

  // 清理消息
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // 心跳定时器
  useEffect(() => {
    if (!isConnected) return;

    const heartbeatInterval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000); // 每30秒发送一次心跳

    return () => clearInterval(heartbeatInterval);
  }, [isConnected, sendMessage]);

  // 自动连接
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    messages,
    activeTasks,
    connect,
    disconnect,
    subscribeToTask,
    unsubscribeFromTask,
    cancelTask,
    getActiveeTasks,
    getTaskHistory,
    clearMessages
  };
}

// 任务进度Hook
export function useTaskProgress(taskId: string) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.PENDING);
  const [message, setMessage] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  const handleTaskUpdate = useCallback((task: TaskInfo) => {
    if (task.id === taskId) {
      setProgress(task.progress);
      setStatus(task.status);
      setIsCompleted(
        task.status === TaskStatus.COMPLETED || 
        task.status === TaskStatus.FAILED || 
        task.status === TaskStatus.CANCELLED
      );
    }
  }, [taskId]);

  const handleMessage = useCallback((msg: FeedbackMessage) => {
    if (msg.task_id === taskId) {
      setMessage(msg.message);
      if (msg.progress !== undefined) {
        setProgress(msg.progress);
      }
      if (msg.status !== undefined) {
        setStatus(msg.status);
        setIsCompleted(
          msg.status === TaskStatus.COMPLETED || 
          msg.status === TaskStatus.FAILED || 
          msg.status === TaskStatus.CANCELLED
        );
      }
    }
  }, [taskId]);

  const feedback = useRealTimeFeedback(`task_${taskId}`, {
    onTaskUpdate: handleTaskUpdate,
    onMessage: handleMessage
  });

  useEffect(() => {
    if (feedback.isConnected) {
      feedback.subscribeToTask(taskId);
    }

    return () => {
      if (feedback.isConnected) {
        feedback.unsubscribeFromTask(taskId);
      }
    };
  }, [feedback.isConnected, feedback.subscribeToTask, feedback.unsubscribeFromTask, taskId]);

  return {
    progress,
    status,
    message,
    isCompleted,
    ...feedback
  };
}