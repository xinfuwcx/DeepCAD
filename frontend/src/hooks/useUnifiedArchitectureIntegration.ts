#!/usr/bin/env typescript
/**
 * DeepCAD四大技术架构统一集成Hook
 * 3号计算专家 - Week4界面集成
 * 
 * React Hook用于管理四大技术架构的集成状态：
 * - 工作流状态管理
 * - 系统性能监控
 * - 实时数据流更新
 * - 错误处理和恢复
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  UnifiedArchitectureIntegrationService,
  defaultIntegrationConfig,
  WorkflowState,
  SystemPerformanceMetrics,
  IoTSensorData,
  PDEOptimizationResult,
  ROMProcessingResult,
  AIPredictionResult,
  IntegrationConfig
} from '../services/unifiedArchitectureIntegrationService';

export interface UseUnifiedArchitectureIntegrationReturn {
  // 工作流状态
  workflowState: WorkflowState;
  isProcessing: boolean;
  
  // 系统性能
  systemMetrics: SystemPerformanceMetrics[];
  
  // 处理结果
  iotData: IoTSensorData[];
  pdeResults: PDEOptimizationResult[];
  romResults: ROMProcessingResult[];
  aiResults: AIPredictionResult[];
  
  // 控制方法
  startWorkflow: () => Promise<void>;
  stopWorkflow: () => void;
  resetWorkflow: () => void;
  
  // 配置管理
  updateConfig: (newConfig: Partial<IntegrationConfig>) => void;
  
  // 状态查询
  getSystemStatus: (systemId: string) => SystemPerformanceMetrics | undefined;
  getLatestResults: () => {
    latestIoT: IoTSensorData | undefined;
    latestPDE: PDEOptimizationResult | undefined;
    latestROM: ROMProcessingResult | undefined;
    latestAI: AIPredictionResult | undefined;
  };
}

export const useUnifiedArchitectureIntegration = (
  initialConfig: Partial<IntegrationConfig> = {}
): UseUnifiedArchitectureIntegrationReturn => {
  
  // 合并配置
  const config = { ...defaultIntegrationConfig, ...initialConfig };
  
  // 服务实例引用
  const serviceRef = useRef<UnifiedArchitectureIntegrationService | null>(null);
  
  // 状态管理
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    currentStage: 'iot',
    progress: 0,
    startTime: new Date(),
    estimatedCompletion: new Date(),
    errors: [],
    warnings: []
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<SystemPerformanceMetrics[]>([]);
  
  // 处理结果状态
  const [iotData, setIoTData] = useState<IoTSensorData[]>([]);
  const [pdeResults, setPDEResults] = useState<PDEOptimizationResult[]>([]);
  const [romResults, setROMResults] = useState<ROMProcessingResult[]>([]);
  const [aiResults, setAIResults] = useState<AIPredictionResult[]>([]);

  // 初始化服务
  useEffect(() => {
    console.log('🔧 初始化统一架构集成服务');
    
    // 创建服务实例
    serviceRef.current = new UnifiedArchitectureIntegrationService(config);
    const service = serviceRef.current;

    // 订阅工作流事件
    service.on('workflow:started', (state: WorkflowState) => {
      console.log('🚀 工作流已启动');
      setWorkflowState(state);
      setIsProcessing(true);
    });

    service.on('workflow:completed', (state: WorkflowState) => {
      console.log('✅ 工作流已完成');
      setWorkflowState(state);
      setIsProcessing(false);
      
      // 获取最终结果
      const results = service.getProcessingResults();
      setIoTData(results.iotData);
      setPDEResults(results.pdeResults);
      setROMResults(results.romResults);
      setAIResults(results.aiResults);
    });

    service.on('workflow:error', ({ error, stage }) => {
      console.error('❌ 工作流错误:', error, '阶段:', stage);
      setIsProcessing(false);
      
      // 更新工作流状态
      setWorkflowState(prev => ({
        ...prev,
        errors: [...prev.errors, error]
      }));
    });

    service.on('workflow:stopped', () => {
      console.log('🛑 工作流已停止');
      setIsProcessing(false);
    });

    service.on('workflow:reset', () => {
      console.log('🔄 工作流已重置');
      setWorkflowState({
        currentStage: 'iot',
        progress: 0,
        startTime: new Date(),
        estimatedCompletion: new Date(),
        errors: [],
        warnings: []
      });
      setIsProcessing(false);
      
      // 清空结果
      setIoTData([]);
      setPDEResults([]);
      setROMResults([]);
      setAIResults([]);
    });

    // 订阅阶段进度事件
    service.on('stage:progress', ({ stage, progress, ...details }) => {
      setWorkflowState(prev => ({
        ...prev,
        currentStage: stage,
        progress: prev.progress // 由服务内部更新
      }));
    });

    service.on('stage:completed', ({ stage, result, dataCount }) => {
      console.log(`✅ ${stage} 阶段完成`, result ? '结果:' : '', result || `数据量: ${dataCount}`);
      
      // 根据阶段更新对应结果
      const results = service.getProcessingResults();
      setIoTData([...results.iotData]);
      setPDEResults([...results.pdeResults]);
      setROMResults([...results.romResults]);
      setAIResults([...results.aiResults]);
    });

    // 订阅性能指标更新
    service.on('metrics:updated', ({ systemId, metrics }) => {
      setSystemMetrics(prev => {
        const updated = [...prev];
        const index = updated.findIndex(m => m.systemId === systemId);
        
        if (index >= 0) {
          updated[index] = metrics;
        } else {
          updated.push(metrics);
        }
        
        return updated;
      });
    });

    // 定期更新系统指标
    const metricsInterval = setInterval(() => {
      const currentMetrics = service.getSystemMetrics();
      setSystemMetrics(currentMetrics);
    }, 1000);

    // 定期更新工作流状态
    const stateInterval = setInterval(() => {
      if (isProcessing) {
        const currentState = service.getWorkflowState();
        setWorkflowState(currentState);
      }
    }, 500);

    // 清理函数
    return () => {
      console.log('🧹 清理统一架构集成服务');
      
      clearInterval(metricsInterval);
      clearInterval(stateInterval);
      
      service.removeAllListeners();
      serviceRef.current = null;
    };
  }, []); // 只在组件挂载时初始化

  // 启动工作流
  const startWorkflow = useCallback(async () => {
    if (!serviceRef.current || isProcessing) {
      console.warn('⚠️ 服务未初始化或正在处理中');
      return;
    }

    try {
      console.log('🎯 启动统一架构工作流');
      await serviceRef.current.startUnifiedWorkflow();
    } catch (error) {
      console.error('❌ 启动工作流失败:', error);
    }
  }, [isProcessing]);

  // 停止工作流
  const stopWorkflow = useCallback(() => {
    if (!serviceRef.current) {
      console.warn('⚠️ 服务未初始化');
      return;
    }

    console.log('🛑 停止统一架构工作流');
    serviceRef.current.stopAllProcessing();
  }, []);

  // 重置工作流
  const resetWorkflow = useCallback(() => {
    if (!serviceRef.current) {
      console.warn('⚠️ 服务未初始化');
      return;
    }

    console.log('🔄 重置统一架构工作流');
    serviceRef.current.resetWorkflow();
  }, []);

  // 更新配置
  const updateConfig = useCallback((newConfig: Partial<IntegrationConfig>) => {
    console.log('⚙️ 更新集成配置:', newConfig);
    
    // 重新创建服务实例（简化实现）
    if (serviceRef.current && !isProcessing) {
      serviceRef.current.removeAllListeners();
      
      const updatedConfig = { ...config, ...newConfig };
      serviceRef.current = new UnifiedArchitectureIntegrationService(updatedConfig);
      
      console.log('✅ 配置更新完成');
    } else {
      console.warn('⚠️ 无法在处理过程中更新配置');
    }
  }, [config, isProcessing]);

  // 获取系统状态
  const getSystemStatus = useCallback((systemId: string): SystemPerformanceMetrics | undefined => {
    return systemMetrics.find(m => m.systemId === systemId);
  }, [systemMetrics]);

  // 获取最新结果
  const getLatestResults = useCallback(() => {
    return {
      latestIoT: iotData[iotData.length - 1],
      latestPDE: pdeResults[pdeResults.length - 1],
      latestROM: romResults[romResults.length - 1],
      latestAI: aiResults[aiResults.length - 1]
    };
  }, [iotData, pdeResults, romResults, aiResults]);

  return {
    // 工作流状态
    workflowState,
    isProcessing,
    
    // 系统性能
    systemMetrics,
    
    // 处理结果
    iotData,
    pdeResults,
    romResults,
    aiResults,
    
    // 控制方法
    startWorkflow,
    stopWorkflow,
    resetWorkflow,
    
    // 配置管理
    updateConfig,
    
    // 状态查询
    getSystemStatus,
    getLatestResults
  };
};

// 导出相关类型
export type {
  WorkflowState,
  SystemPerformanceMetrics,
  IoTSensorData,
  PDEOptimizationResult,
  ROMProcessingResult,
  AIPredictionResult,
  IntegrationConfig
} from '../services/unifiedArchitectureIntegrationService';