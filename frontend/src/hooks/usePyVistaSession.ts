import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import { apiClient } from '../api/client';
import { useWebSocket } from '../api/websocket';

export interface PyVistaSessionState {
  session_id: string;
  mesh_id?: string;
  mesh_url?: string;
  scalar_fields?: string[];
  active_scalar?: string;
  bounds?: number[];
  mesh_info?: any;
  camera_state?: any;
  render_settings?: any;
}

export interface PyVistaSessionOptions {
  autoConnect?: boolean;
  enableCaching?: boolean;
  maxCacheSize?: number;
}

export interface PyVistaSessionActions {
  createSession: () => Promise<boolean>;
  loadMesh: (meshPath: string, options?: any) => Promise<boolean>;
  updateScalar: (scalarName: string) => Promise<boolean>;
  updateRenderSettings: (settings: any) => Promise<boolean>;
  updateCameraState: (cameraState: any) => Promise<boolean>;
  createAnimation: (files: string[]) => Promise<boolean>;
  convertMesh: (sourcePath: string, targetFormat: string) => Promise<boolean>;
  getSessionState: () => Promise<PyVistaSessionState | null>;
  cleanup: () => Promise<boolean>;
}

export interface PyVistaSessionHook {
  session: PyVistaSessionState | null;
  loading: boolean;
  error: string | null;
  progress: number;
  message: string;
  actions: PyVistaSessionActions;
}

export const usePyVistaSession = (options: PyVistaSessionOptions = {}) => {
  const {
    autoConnect = true,
    enableCaching = true,
    maxCacheSize = 100
  } = options;

  const [session, setSession] = useState<PyVistaSessionState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  
  const { connect, disconnect, isConnected, clientId } = useWebSocket();
  const cacheRef = useRef<Map<string, any>>(new Map());
  const listenersRef = useRef<Map<string, (data: any) => void>>(new Map());

  // WebSocket连接管理
  useEffect(() => {
    if (autoConnect && !isConnected && clientId) {
      connect('ws://localhost:8000/ws');
    }
    
    return () => {
      cleanup();
      disconnect();
    };
  }, [autoConnect, isConnected, clientId]);

  // WebSocket消息处理
  useEffect(() => {
    if (!isConnected) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    // 注册消息监听器（根据实际WebSocket实现调整）
    // window.addEventListener('websocket-message', handleMessage);
    
    return () => {
      // window.removeEventListener('websocket-message', handleMessage);
    };
  }, [isConnected]);

  // 处理WebSocket消息
  const handleWebSocketMessage = useCallback((data: any) => {
    const { type } = data;

    switch (type) {
      case 'session_created':
        setSession(prev => prev ? { ...prev, session_id: data.session_id } : null);
        setLoading(false);
        setError(null);
        break;

      case 'loading_started':
        setLoading(true);
        setProgress(0);
        setStatusMessage(data.message || 'Loading...');
        setError(null);
        break;

      case 'loading_progress':
        setProgress((data.step / data.total) * 100);
        setStatusMessage(data.message || 'Loading...');
        break;

      case 'mesh_loaded':
        setSession(prev => prev ? {
          ...prev,
          mesh_id: data.mesh_id,
          mesh_url: data.mesh_url,
          scalar_fields: data.scalar_fields,
          bounds: data.bounds,
          mesh_info: data.mesh_info
        } : null);
        setLoading(false);
        setProgress(100);
        setStatusMessage('Mesh loaded successfully');
        
        // 缓存网格数据
        if (enableCaching && data.mesh_id) {
          cacheRef.current.set(data.mesh_id, {
            mesh_url: data.mesh_url,
            mesh_info: data.mesh_info,
            scalar_fields: data.scalar_fields
          });
          
          // 限制缓存大小
          if (cacheRef.current.size > maxCacheSize) {
            const firstKey = cacheRef.current.keys().next().value;
            cacheRef.current.delete(firstKey);
          }
        }
        break;

      case 'scalar_updated':
        setSession(prev => prev ? {
          ...prev,
          active_scalar: data.active_scalar,
          mesh_url: data.mesh_url
        } : null);
        break;

      case 'render_settings_updated':
        setSession(prev => prev ? {
          ...prev,
          render_settings: data.settings
        } : null);
        break;

      case 'animation_ready':
        setLoading(false);
        setProgress(100);
        setStatusMessage(`Animation ready with ${data.total_steps} frames`);
        break;

      case 'conversion_complete':
        message.success('Mesh conversion completed');
        break;

      case 'conversion_error':
        setError(`Conversion failed: ${data.message}`);
        message.error(data.message);
        break;

      case 'error':
        setError(data.message);
        setLoading(false);
        message.error(data.message);
        break;

      case 'session_cleaned':
        setSession(null);
        setError(null);
        setProgress(0);
        setStatusMessage('');
        break;
    }

    // 触发自定义监听器
    const listener = listenersRef.current.get(type);
    if (listener) {
      listener(data);
    }
  }, [enableCaching, maxCacheSize]);

  // 创建会话
  const createSession = useCallback(async (): Promise<boolean> => {
    if (!clientId) {
      setError('WebSocket not connected');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post('/visualization/session/create', {
        client_id: clientId
      });

      if (response.data.success) {
        const newSession: PyVistaSessionState = {
          session_id: response.data.session_id
        };
        setSession(newSession);
        return true;
      }
      return false;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to create session';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // 加载网格
  const loadMesh = useCallback(async (meshPath: string, options: any = {}): Promise<boolean> => {
    if (!session || !clientId) {
      setError('No active session or WebSocket connection');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post('/visualization/mesh/load', {
        session_id: session.session_id,
        mesh_source: meshPath,
        render_type: options.render_type || 'surface',
        color_by: options.color_by,
        enable_compression: options.enable_compression !== false
      }, {
        params: { client_id: clientId }
      });

      return response.data.success;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to load mesh';
      setError(errorMessage);
      setLoading(false);
      return false;
    }
  }, [session, clientId]);

  // 更新标量字段
  const updateScalar = useCallback(async (scalarName: string): Promise<boolean> => {
    if (!session || !clientId) {
      setError('No active session or WebSocket connection');
      return false;
    }

    try {
      const response = await apiClient.post('/visualization/scalar/update', {
        session_id: session.session_id,
        scalar_name: scalarName
      }, {
        params: { client_id: clientId }
      });

      return response.data.success;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to update scalar field';
      setError(errorMessage);
      return false;
    }
  }, [session, clientId]);

  // 更新渲染设置
  const updateRenderSettings = useCallback(async (settings: any): Promise<boolean> => {
    if (!session || !clientId) {
      setError('No active session or WebSocket connection');
      return false;
    }

    try {
      const response = await apiClient.post('/visualization/render/settings', {
        session_id: session.session_id,
        ...settings
      }, {
        params: { client_id: clientId }
      });

      return response.data.success;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to update render settings';
      setError(errorMessage);
      return false;
    }
  }, [session, clientId]);

  // 更新相机状态
  const updateCameraState = useCallback(async (cameraState: any): Promise<boolean> => {
    if (!session) {
      setError('No active session');
      return false;
    }

    try {
      const response = await apiClient.post('/visualization/camera/update', {
        session_id: session.session_id,
        ...cameraState
      });

      return response.data.success;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to update camera state';
      setError(errorMessage);
      return false;
    }
  }, [session]);

  // 创建动画
  const createAnimation = useCallback(async (files: string[]): Promise<boolean> => {
    if (!session || !clientId) {
      setError('No active session or WebSocket connection');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post('/visualization/animation/timeseries', {
        session_id: session.session_id,
        time_series_files: files,
        frame_rate: 30
      }, {
        params: { client_id: clientId }
      });

      return response.data.success;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to create animation';
      setError(errorMessage);
      setLoading(false);
      return false;
    }
  }, [session, clientId]);

  // 转换网格格式
  const convertMesh = useCallback(async (sourcePath: string, targetFormat: string): Promise<boolean> => {
    if (!clientId) {
      setError('WebSocket not connected');
      return false;
    }

    try {
      const response = await apiClient.post('/visualization/mesh/convert', null, {
        params: {
          source_path: sourcePath,
          target_format: targetFormat,
          client_id: clientId
        }
      });

      return response.data.success;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to convert mesh';
      setError(errorMessage);
      return false;
    }
  }, [clientId]);

  // 获取会话状态
  const getSessionState = useCallback(async (): Promise<PyVistaSessionState | null> => {
    if (!session) return null;

    try {
      const response = await apiClient.get(`/visualization/session/${session.session_id}/state`);
      
      if (response.data.success) {
        return response.data.state;
      }
      return null;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to get session state');
      return null;
    }
  }, [session]);

  // 清理会话
  const cleanup = useCallback(async (): Promise<boolean> => {
    if (!session || !clientId) return true;

    try {
      await apiClient.delete(`/visualization/session/${session.session_id}`, {
        params: { client_id: clientId }
      });
      
      setSession(null);
      setError(null);
      setProgress(0);
      setStatusMessage('');
      cacheRef.current.clear();
      
      return true;
    } catch (error: any) {
      console.error('Failed to cleanup session:', error);
      return false;
    }
  }, [session, clientId]);

  // 添加事件监听器
  const addEventListener = useCallback((eventType: string, listener: (data: any) => void) => {
    listenersRef.current.set(eventType, listener);
    
    return () => {
      listenersRef.current.delete(eventType);
    };
  }, []);

  // 获取缓存统计
  const getCacheStats = useCallback(() => {
    return {
      size: cacheRef.current.size,
      maxSize: maxCacheSize,
      keys: Array.from(cacheRef.current.keys())
    };
  }, [maxCacheSize]);

  return {
    session,
    loading,
    error,
    progress,
    message: statusMessage,
    actions: {
      createSession,
      loadMesh,
      updateScalar,
      updateRenderSettings,
      updateCameraState,
      createAnimation,
      convertMesh,
      getSessionState,
      cleanup
    },
    isConnected,
    clientId
  };
};