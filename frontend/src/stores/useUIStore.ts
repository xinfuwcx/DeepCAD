import { createWithEqualityFn } from 'zustand/traditional';
import { v4 as uuidv4 } from 'uuid';
import { useSceneStore } from './useSceneStore';
import { notification } from 'antd';
import { shallow } from 'zustand/shallow';

export type Theme = 'light' | 'dark';

// This is a generic progress update, typically from a task queue
interface TaskProgress {
  status: 'idle' | 'starting' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  url?: string; // May be used for final result URL in simple cases
}

// This represents the structure of ALL messages coming through the websocket
interface WebSocketMessage {
  type: 'task_progress' | 'mesh_generated' | 'computation_completed' | 'task_error';
  payload: any;
}

interface UIState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  clientId: string;
  websocket: WebSocket | null;
  taskProgress: TaskProgress;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  resetTaskProgress: () => void;
}

const initialTaskProgress: TaskProgress = {
  status: 'idle',
  progress: 0,
  message: '',
};

// 从本地存储中获取主题偏好，如果没有则默认为深色主题
const getInitialTheme = (): Theme => {
  const savedTheme = localStorage.getItem('theme') as Theme;
  return savedTheme || 'dark';
};

export const useUIStore = createWithEqualityFn<UIState>((set, get) => ({
  theme: getInitialTheme(),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  setTheme: (theme: Theme) => set({ theme }),
  clientId: uuidv4(),
  websocket: null,
  taskProgress: initialTaskProgress,

  connectWebSocket: () => {
    const { clientId, websocket } = get();
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected.');
      return;
    }

    const ws = new WebSocket(`ws://localhost:8000/ws/${clientId}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      set({ websocket: ws });
    };

    ws.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('WebSocket message received:', message);

      // 使用函数调用而不是直接获取状态
      const sceneStore = useSceneStore.getState();

      switch (message.type) {
        case 'task_progress':
          set({ taskProgress: message.payload as TaskProgress });
          break;

        case 'mesh_generated':
          sceneStore.updateLayer('mesh', { url: message.payload.url, isLoading: false, error: null });
          notification.success({
            message: 'Meshing Complete',
            description: 'The mesh has been successfully generated.',
          });
          // Also update the task progress to completed
          set({ taskProgress: { status: 'completed', progress: 100, message: 'Mesh generated.' }});
          break;

        case 'computation_completed':
          sceneStore.updateLayer('result', { url: message.payload.result_url, isLoading: false, error: null });
          sceneStore.updateLayer('constraints', { url: message.payload.constraints_url, isVisible: true });
          sceneStore.updateLayer('loads', { url: message.payload.loads_url, isVisible: true });
          notification.success({
            message: 'Computation Complete',
            description: 'Analysis finished. Results are now available.',
          });
          set({ taskProgress: { status: 'completed', progress: 100, message: 'Computation finished.' }});
          break;

        case 'task_error':
          const { task_name, error } = message.payload;
          // Update task progress bar to show the error
          set({ taskProgress: { status: 'error', progress: 0, message: `Error in ${task_name}: ${error}` } });
          
          // Update the specific layer in the scene store to reflect the error
          if (task_name === 'generate_mesh') {
             sceneStore.updateLayer('mesh', { isLoading: false, error: error });
          } else if (task_name === 'run_computation') {
            sceneStore.updateLayer('result', { isLoading: false, error: error });
          }
          notification.error({
              message: `Task Failed: ${task_name}`,
              description: error,
          });
          break;

        default:
          console.warn('Received unknown WebSocket message type:', message.type);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      set({ websocket: null });
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      set({ 
        taskProgress: { 
          status: 'error', 
          progress: 0, 
          message: 'WebSocket connection failed.' 
        },
        websocket: null 
      });
    };
  },

  disconnectWebSocket: () => {
    const { websocket } = get();
    if (websocket) {
      websocket.close();
    }
  },

  resetTaskProgress: () => {
    set({ taskProgress: initialTaskProgress });
  }

}), shallow); 