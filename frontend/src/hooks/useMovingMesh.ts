/**
 * Moving-Mesh Hook for Real-time Mesh Updates
 * 动网格实时更新Hook，处理WebSocket连接和Three.js网格更新
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import * as THREE from 'three';

interface NodeUpdate {
  id: number;
  x: number;
  y: number;
  z: number;
}

interface MeshUpdateMessage {
  type: 'mesh_update' | 'mesh_full' | 'mesh_status' | 'mesh_progress' | 'mesh_initial';
  mesh_id: string;
  incremental?: boolean;
  nodes?: NodeUpdate[];
  data?: any;
  status?: string;
  message?: string;
  progress?: number;
  stage?: string;
  timestamp: number;
}

interface MovingMeshState {
  isConnected: boolean;
  status: string;
  progress: number;
  currentStage: string;
  lastUpdate: number;
  nodesUpdated: number;
  error: string | null;
}

interface MovingMeshConfig {
  strategy: 'laplacian' | 'ale_formulation' | 'remesh_adaptive';
  driving_source: 'excavation' | 'support_displacement' | 'soil_settlement' | 'combined';
  quality_threshold: number;
  real_time_rendering: boolean;
  update_frequency: 'every_step' | 'every_5_steps' | 'every_10_steps' | 'on_demand';
}

export function useMovingMesh(meshId: string, geometry?: THREE.BufferGeometry) {
  const [state, setState] = useState<MovingMeshState>({
    isConnected: false,
    status: 'disconnected',
    progress: 0,
    currentStage: '',
    lastUpdate: 0,
    nodesUpdated: 0,
    error: null
  });

  const wsRef = useRef<WebSocket | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(geometry || null);
  const nodeMapRef = useRef<Map<number, number>>(new Map()); // node_id -> vertex_index mapping

  // 更新几何引用
  useEffect(() => {
    geometryRef.current = geometry || null;
  }, [geometry]);

  // WebSocket连接管理
  const connect = useCallback(() => {
    if (!meshId || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = `ws://localhost:8081/api/meshing/moving-mesh/ws/${meshId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`🔗 Moving-Mesh WebSocket connected for mesh: ${meshId}`);
        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          status: 'connected',
          error: null 
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: MeshUpdateMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log(`🔌 Moving-Mesh WebSocket disconnected for mesh: ${meshId}`);
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          status: 'disconnected' 
        }));
        
        // 重连逻辑
        setTimeout(() => {
          if (meshId) {
            connect();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('❌ Moving-Mesh WebSocket error:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'WebSocket connection error',
          isConnected: false 
        }));
      };

      wsRef.current = ws;

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to create WebSocket connection' 
      }));
    }
  }, [meshId]);

  // 处理WebSocket消息
  const handleWebSocketMessage = useCallback((message: MeshUpdateMessage) => {
    switch (message.type) {
      case 'mesh_initial':
        handleInitialMeshData(message.data);
        break;
        
      case 'mesh_update':
        if (message.nodes) {
          updateMeshGeometry(message.nodes, message.incremental || false);
        }
        break;
        
      case 'mesh_full':
        handleFullMeshUpdate(message.data);
        break;
        
      case 'mesh_status':
        setState(prev => ({
          ...prev,
          status: message.status || prev.status,
          error: message.status === 'error' ? message.message || null : null
        }));
        break;
        
      case 'mesh_progress':
        setState(prev => ({
          ...prev,
          progress: message.progress || prev.progress,
          currentStage: message.stage || prev.currentStage,
          lastUpdate: message.timestamp
        }));
        break;
        
      default:
        console.log('🔍 Unknown message type:', message.type);
    }
  }, []);

  // 处理初始网格数据
  const handleInitialMeshData = useCallback((data: any) => {
    if (!data?.nodes) return;
    
    console.log(`📦 Received initial mesh data: ${data.nodes.length} nodes`);
    
    // 建立节点ID到顶点索引的映射
    const nodeMap = new Map<number, number>();
    data.nodes.forEach((node: NodeUpdate, index: number) => {
      nodeMap.set(node.id, index);
    });
    nodeMapRef.current = nodeMap;
    
    setState(prev => ({ 
      ...prev, 
      nodesUpdated: data.nodes.length,
      lastUpdate: Date.now()
    }));
  }, []);

  // 更新网格几何
  const updateMeshGeometry = useCallback((nodeUpdates: NodeUpdate[], incremental: boolean) => {
    const geometry = geometryRef.current;
    if (!geometry || !geometry.attributes.position) {
      console.warn('⚠️ No geometry or position attribute available for update');
      return;
    }

    const positions = geometry.attributes.position.array as Float32Array;
    let updateCount = 0;

    nodeUpdates.forEach((nodeUpdate) => {
      const vertexIndex = nodeMapRef.current.get(nodeUpdate.id);
      
      if (vertexIndex !== undefined) {
        const positionIndex = vertexIndex * 3;
        
        // 检查索引是否有效
        if (positionIndex + 2 < positions.length) {
          positions[positionIndex] = nodeUpdate.x;
          positions[positionIndex + 1] = nodeUpdate.y;
          positions[positionIndex + 2] = nodeUpdate.z;
          updateCount++;
        }
      }
    });

    if (updateCount > 0) {
      // 标记需要更新
      geometry.attributes.position.needsUpdate = true;
      
      // 重新计算法向量以获得正确的光照
      geometry.computeVertexNormals();
      
      // 更新边界框
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      
      setState(prev => ({ 
        ...prev, 
        nodesUpdated: prev.nodesUpdated + updateCount,
        lastUpdate: Date.now()
      }));
      
      console.log(`🔄 Updated ${updateCount} vertices in mesh geometry`);
    }
  }, []);

  // 处理完整网格更新
  const handleFullMeshUpdate = useCallback((data: any) => {
    console.log('📦 Received full mesh update');
    
    if (data?.nodes) {
      // 重建节点映射
      const nodeMap = new Map<number, number>();
      data.nodes.forEach((node: NodeUpdate, index: number) => {
        nodeMap.set(node.id, index);
      });
      nodeMapRef.current = nodeMap;
      
      // 更新所有节点
      updateMeshGeometry(data.nodes, false);
    }
  }, [updateMeshGeometry]);

  // 启动动网格分析
  const startMovingMesh = useCallback(async (config: MovingMeshConfig, clientId: string) => {
    try {
      const response = await fetch('/api/meshing/moving-mesh/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mesh_id: meshId,
          config,
          client_id: clientId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Moving-Mesh analysis started:', result);
      
      setState(prev => ({ 
        ...prev, 
        status: 'starting',
        error: null 
      }));
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to start Moving-Mesh analysis:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to start analysis' 
      }));
      throw error;
    }
  }, [meshId]);

  // 暂停分析
  const pauseAnalysis = useCallback(async () => {
    try {
      const response = await fetch(`/api/meshing/moving-mesh/pause/${meshId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        console.log('⏸️ Moving-Mesh analysis paused');
      }
    } catch (error) {
      console.error('❌ Failed to pause analysis:', error);
    }
  }, [meshId]);

  // 恢复分析
  const resumeAnalysis = useCallback(async () => {
    try {
      const response = await fetch(`/api/meshing/moving-mesh/resume/${meshId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        console.log('▶️ Moving-Mesh analysis resumed');
      }
    } catch (error) {
      console.error('❌ Failed to resume analysis:', error);
    }
  }, [meshId]);

  // 停止分析
  const stopAnalysis = useCallback(async () => {
    try {
      const response = await fetch(`/api/meshing/moving-mesh/stop/${meshId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log('⏹️ Moving-Mesh analysis stopped');
      }
    } catch (error) {
      console.error('❌ Failed to stop analysis:', error);
    }
  }, [meshId]);

  // 生命周期管理
  useEffect(() => {
    if (meshId) {
      connect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [meshId, connect]);

  return {
    // 状态
    ...state,
    
    // 控制方法
    startMovingMesh,
    pauseAnalysis,
    resumeAnalysis,
    stopAnalysis,
    
    // WebSocket管理
    connect,
    disconnect: () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    },
    
    // 实用工具
    isActive: state.status === 'active' || state.status === 'running',
    isPaused: state.status === 'paused',
    isCompleted: state.status === 'completed',
    hasError: !!state.error
  };
}

export default useMovingMesh;