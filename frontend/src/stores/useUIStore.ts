import { create } from 'zustand';
import axios from 'axios';

export type TaskStatus = 'idle' | 'starting' | 'processing' | 'completed' | 'error';

export interface TaskProgress {
  taskId?: string;
  status: TaskStatus;
  progress: number; // 0-100
  message: string;
  results?: Record<string, any>; // Add this property
}

interface UIState {
  // 任务进度
  taskProgress: TaskProgress | null;
  setTaskProgress: (progress: TaskProgress) => void;
  resetTaskProgress: () => void;
  startComputation: (analysisType: string) => Promise<void>;
  
  // 主题和UI模式
  theme: 'light' | 'dark';
  uiMode: 'minimal' | 'fusion';
  particleEffectsEnabled: boolean;
  setTheme: (theme: 'light' | 'dark') => void;
  setUiMode: (mode: 'minimal' | 'fusion') => void;
  toggleParticleEffects: () => void;
  
  // WebSocket相关
  websocket: WebSocket | null;
  clientId: string | null;
  connectWebSocket: (url: string) => void;
  disconnectWebSocket: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // 任务进度
  taskProgress: null,
  setTaskProgress: (progress) => 
    set({ taskProgress: progress }),
  resetTaskProgress: () => 
    set({ taskProgress: null }),
    
  // 主题和UI模式
  theme: 'dark',
  uiMode: 'fusion',
  particleEffectsEnabled: true,
  setTheme: (theme) => set({ theme }),
  setUiMode: (uiMode) => set({ uiMode }),
  toggleParticleEffects: () => set(state => ({ 
    particleEffectsEnabled: !state.particleEffectsEnabled 
  })),
  
  // WebSocket相关
  websocket: null,
  clientId: null,
  
  connectWebSocket: (url: string) => {
    // 如果已经有连接，先断开
    const currentWs = get().websocket;
    if (currentWs && currentWs.readyState === WebSocket.OPEN) {
      currentWs.close();
    }
    
    // 创建新连接
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // 处理不同类型的消息
        if (data.type === 'client_id') {
          set({ clientId: data.client_id });
        } 
        else if (data.type === 'task_progress') {
          set({ 
            taskProgress: {
              taskId: data.task_id,
              status: data.status,
              progress: data.progress,
              message: data.message
            }
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    set({ websocket: ws });
  },
  
  disconnectWebSocket: () => {
    const { websocket } = get();
    if (websocket) {
      websocket.close();
      set({ websocket: null });
    }
  },

  startComputation: async (analysisType: string) => {
    const { clientId } = get();
    if (!clientId) {
      console.error("Cannot start computation without a client ID.");
      set({ 
        taskProgress: { 
          status: 'error', 
          progress: 0, 
          message: '连接错误：无法获取客户端ID。' 
        } 
      });
      return;
    }

    set({ 
      taskProgress: { 
        status: 'starting', 
        progress: 0, 
        message: '正在启动计算任务...' 
      } 
    });

    try {
      const response = await axios.post('/api/computation/start', {
        client_id: clientId,
        analysis_type: analysisType,
      });
      
      if (response.status === 202) {
        set({ 
          taskProgress: {
            taskId: response.data.id,
            status: 'processing',
            progress: 0,
            message: '任务已成功提交，等待求解器响应...'
          }
        });
      }
    } catch (error) {
      console.error("Failed to start computation job:", error);
      set({
        taskProgress: {
          status: 'error',
          progress: 0,
          message: '提交计算任务失败。'
        }
      });
    }
  },
})); 