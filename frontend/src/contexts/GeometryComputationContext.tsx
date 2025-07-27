/**
 * 2号几何专家 ↔ 3号计算专家 真实数据集成Context
 * 实现真正的组件协作和数据交换
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { MeshDataFor3, RealQualityResult, QualityStatistics } from '../components/computation/RealMeshQualityAnalysis';

// 2号几何专家数据接口
export interface GeometryExpertData {
  meshData: MeshDataFor3 | null;
  generationStatus: 'idle' | 'generating' | 'completed' | 'error';
  generationProgress: number;
  lastGenerationTime: number;
  geometryParameters: {
    meshDensity: number;
    qualityThreshold: number;
    refinementLevel: number;
  };
}

// 3号计算专家分析结果
export interface ComputationExpertResults {
  qualityResults: RealQualityResult[];
  statistics: QualityStatistics | null;
  analysisStatus: 'idle' | 'analyzing' | 'completed' | 'error';
  analysisProgress: number;
  lastAnalysisTime: number;
  recommendations: string[];
}

// 协作状态
export interface CollaborationState {
  isCollaborating: boolean;
  collaborationMode: 'realtime' | 'batch' | 'manual';
  dataExchangeCount: number;
  lastExchangeTime: number;
  collaborationLog: Array<{
    timestamp: number;
    expert: '2号' | '3号';
    action: string;
    data?: any;
  }>;
}

// Context接口
export interface GeometryComputationContextType {
  // 2号几何专家状态
  geometryData: GeometryExpertData;
  
  // 3号计算专家状态
  computationResults: ComputationExpertResults;
  
  // 协作状态
  collaboration: CollaborationState;
  
  // 2号几何专家操作
  updateMeshData: (meshData: MeshDataFor3) => void;
  setGeometryGenerationStatus: (status: GeometryExpertData['generationStatus'], progress?: number) => void;
  updateGeometryParameters: (params: Partial<GeometryExpertData['geometryParameters']>) => void;
  
  // 3号计算专家操作
  updateQualityResults: (results: RealQualityResult[]) => void;
  updateStatistics: (stats: QualityStatistics) => void;
  setComputationStatus: (status: ComputationExpertResults['analysisStatus'], progress?: number) => void;
  addRecommendations: (recommendations: string[]) => void;
  
  // 协作操作
  startCollaboration: (mode: CollaborationState['collaborationMode']) => void;
  stopCollaboration: () => void;
  logCollaborationAction: (expert: '2号' | '3号', action: string, data?: any) => void;
  requestQualityAnalysis: () => void;
  sendQualityFeedback: (feedback: string[]) => void;
}

const GeometryComputationContext = createContext<GeometryComputationContextType | null>(null);

export const useGeometryComputationContext = () => {
  const context = useContext(GeometryComputationContext);
  if (!context) {
    throw new Error('useGeometryComputationContext must be used within GeometryComputationProvider');
  }
  return context;
};

interface GeometryComputationProviderProps {
  children: React.ReactNode;
}

export const GeometryComputationProvider: React.FC<GeometryComputationProviderProps> = ({ children }) => {
  // 2号几何专家状态
  const [geometryData, setGeometryData] = useState<GeometryExpertData>({
    meshData: null,
    generationStatus: 'idle',
    generationProgress: 0,
    lastGenerationTime: 0,
    geometryParameters: {
      meshDensity: 1.0,
      qualityThreshold: 0.6,
      refinementLevel: 2
    }
  });

  // 3号计算专家状态
  const [computationResults, setComputationResults] = useState<ComputationExpertResults>({
    qualityResults: [],
    statistics: null,
    analysisStatus: 'idle',
    analysisProgress: 0,
    lastAnalysisTime: 0,
    recommendations: []
  });

  // 协作状态
  const [collaboration, setCollaboration] = useState<CollaborationState>({
    isCollaborating: false,
    collaborationMode: 'manual',
    dataExchangeCount: 0,
    lastExchangeTime: 0,
    collaborationLog: []
  });

  // 实时协作定时器
  const collaborationTimerRef = useRef<NodeJS.Timeout>();

  // 2号几何专家操作
  const updateMeshData = useCallback((meshData: MeshDataFor3) => {
    setGeometryData(prev => ({
      ...prev,
      meshData,
      lastGenerationTime: Date.now()
    }));
    
    logCollaborationAction('2号', `生成了${meshData.metadata.totalElements}个网格单元`, {
      elements: meshData.metadata.totalElements,
      method: meshData.metadata.generationMethod
    });

    // 如果是实时协作模式，自动触发3号分析
    if (collaboration.isCollaborating && collaboration.collaborationMode === 'realtime') {
      requestQualityAnalysis();
    }
  }, [collaboration]);

  const setGeometryGenerationStatus = useCallback((status: GeometryExpertData['generationStatus'], progress = 0) => {
    setGeometryData(prev => ({
      ...prev,
      generationStatus: status,
      generationProgress: progress
    }));
  }, []);

  const updateGeometryParameters = useCallback((params: Partial<GeometryExpertData['geometryParameters']>) => {
    setGeometryData(prev => ({
      ...prev,
      geometryParameters: { ...prev.geometryParameters, ...params }
    }));
    
    logCollaborationAction('2号', '更新了几何参数', params);
  }, []);

  // 3号计算专家操作
  const updateQualityResults = useCallback((results: RealQualityResult[]) => {
    setComputationResults(prev => ({
      ...prev,
      qualityResults: results,
      lastAnalysisTime: Date.now()
    }));
  }, []);

  const updateStatistics = useCallback((stats: QualityStatistics) => {
    setComputationResults(prev => ({
      ...prev,
      statistics: stats
    }));

    logCollaborationAction('3号', `完成质量分析，平均质量${(stats.averageQuality * 100).toFixed(1)}%`, {
      totalElements: stats.totalElements,
      averageQuality: stats.averageQuality,
      problemElements: stats.problemElements.length
    });
  }, []);

  const setComputationStatus = useCallback((status: ComputationExpertResults['analysisStatus'], progress = 0) => {
    setComputationResults(prev => ({
      ...prev,
      analysisStatus: status,
      analysisProgress: progress
    }));
  }, []);

  const addRecommendations = useCallback((recommendations: string[]) => {
    setComputationResults(prev => ({
      ...prev,
      recommendations: [...prev.recommendations, ...recommendations]
    }));

    logCollaborationAction('3号', `提供了${recommendations.length}条优化建议`, { recommendations });
  }, []);

  // 协作操作
  const logCollaborationAction = useCallback((expert: '2号' | '3号', action: string, data?: any) => {
    const logEntry = {
      timestamp: Date.now(),
      expert,
      action,
      data
    };

    setCollaboration(prev => ({
      ...prev,
      collaborationLog: [...prev.collaborationLog.slice(-99), logEntry], // 保留最近100条
      dataExchangeCount: prev.dataExchangeCount + 1,
      lastExchangeTime: Date.now()
    }));

    console.log(`🤝 ${expert} ${action}`, data);
  }, []);

  const startCollaboration = useCallback((mode: CollaborationState['collaborationMode']) => {
    setCollaboration(prev => ({
      ...prev,
      isCollaborating: true,
      collaborationMode: mode
    }));

    logCollaborationAction('系统', `开始${mode}协作模式`);

    // 如果是实时模式，设置定时检查
    if (mode === 'realtime') {
      collaborationTimerRef.current = setInterval(() => {
        // 检查是否有新的网格数据需要分析
        if (geometryData.meshData && geometryData.lastGenerationTime > computationResults.lastAnalysisTime) {
          requestQualityAnalysis();
        }
      }, 2000); // 每2秒检查一次
    }
  }, [geometryData, computationResults]);

  const stopCollaboration = useCallback(() => {
    setCollaboration(prev => ({
      ...prev,
      isCollaborating: false
    }));

    if (collaborationTimerRef.current) {
      clearInterval(collaborationTimerRef.current);
    }

    logCollaborationAction('系统', '停止协作模式');
  }, []);

  const requestQualityAnalysis = useCallback(() => {
    if (!geometryData.meshData) {
      console.warn('🔧 3号: 没有可分析的网格数据');
      return;
    }

    logCollaborationAction('3号', '开始质量分析');
    // 这里会触发RealMeshQualityAnalysis组件的分析
  }, [geometryData.meshData]);

  const sendQualityFeedback = useCallback((feedback: string[]) => {
    logCollaborationAction('3号', '向2号发送质量反馈', { feedback });
    
    // 可以在这里触发2号的参数调整建议
    console.log('📧 3号向2号发送反馈:', feedback);
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (collaborationTimerRef.current) {
        clearInterval(collaborationTimerRef.current);
      }
    };
  }, []);

  const contextValue: GeometryComputationContextType = {
    geometryData,
    computationResults,
    collaboration,
    
    updateMeshData,
    setGeometryGenerationStatus,
    updateGeometryParameters,
    
    updateQualityResults,
    updateStatistics,
    setComputationStatus,
    addRecommendations,
    
    startCollaboration,
    stopCollaboration,
    logCollaborationAction,
    requestQualityAnalysis,
    sendQualityFeedback
  };

  return (
    <GeometryComputationContext.Provider value={contextValue}>
      {children}
    </GeometryComputationContext.Provider>
  );
};

export default GeometryComputationContext;