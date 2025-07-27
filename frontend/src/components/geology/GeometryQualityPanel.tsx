/**
 * 几何质量反馈面板 - 2号几何专家开发 
 * P1优先级任务 - 接收3号计算专家反馈并实时优化几何质量
 * 基于1号架构师规划，实现高性能几何质量监控和自动优化系统
 * 支持200万单元级别网格，响应时间目标<2分钟，集成智能几何修复算法
 * 技术特点：实时质量反馈、自动几何优化、性能监控、3号专家集成
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap, 
  Settings, 
  TrendingUp,
  Eye,
  Wrench,
  Activity,
  Target
} from 'lucide-react';
import { 
  geometryOptimizationService, 
  MeshQualityFeedback,
  GeometryAdjustment, 
  OptimizationResult 
} from '../../services/geometryOptimization';
import { 
  geometryValidator, 
  ValidationResult, 
  GeometryHealthReport 
} from '../../utils/geometryValidation';

/**
 * 几何质量面板组件属性接口
 * 定义与3号计算专家的数据交互接口和几何优化控制参数
 */
interface GeometryQualityPanelProps {
  geometry: {                                              // 输入几何数据
    vertices: Float32Array;                                // 顶点坐标数组
    faces: Uint32Array;                                    // 面片索引数组  
    materialZones: any[];                                  // 材料区域定义
  };
  geometryId: string;                                      // 几何体唯一标识符
  onGeometryOptimized?: (optimizedGeometry: any) => void;  // 几何优化完成回调
  onQualityImproved?: (improvementData: any) => void;      // 质量改进反馈回调
  realTimeMode?: boolean;                                  // 是否启用实时模式
  show3FeedbackDetails?: boolean;                          // 是否显示3号专家详细反馈
}

/**
 * 质量反馈状态管理接口
 * 跟踪几何质量分析和优化过程的完整状态信息
 */
interface QualityFeedbackState {
  latestFeedback: MeshQualityFeedback | null;    // 3号专家最新质量反馈
  isProcessingFeedback: boolean;                 // 反馈处理中标志
  optimizationInProgress: boolean;               // 几何优化进行中标志
  lastOptimizationResult: OptimizationResult | null; // 上次优化结果
  responseTimeTarget: number;                    // 响应时间目标：120秒(2分钟)
  actualResponseTime: number;                    // 实际响应时间统计
}

/**
 * 几何质量面板主组件
 * 实现与3号计算专家的双向通信，提供几何质量监控、反馈处理、自动优化功能
 * 集成高性能几何处理算法和智能优化策略
 */
export const GeometryQualityPanel: React.FC<GeometryQualityPanelProps> = ({
  geometry,
  geometryId,
  onGeometryOptimized,
  onQualityImproved,
  realTimeMode = true,      // 默认启用实时模式以获得最佳用户体验
  show3FeedbackDetails = true  // 默认显示3号专家详细反馈信息
}) => {
  const [feedbackState, setFeedbackState] = useState<QualityFeedbackState>({
    latestFeedback: null,
    isProcessingFeedback: false,
    optimizationInProgress: false,
    lastOptimizationResult: null,
    responseTimeTarget: 120, // 2分钟目标
    actualResponseTime: 0
  });

  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [healthReport, setHealthReport] = useState<GeometryHealthReport | null>(null);
  const [selectedProblemArea, setSelectedProblemArea] = useState<number | null>(null);
  const [autoOptimizationEnabled, setAutoOptimizationEnabled] = useState(true);
  
  const feedbackProcessingRef = useRef<NodeJS.Timeout>();
  const qualityMonitoringRef = useRef<NodeJS.Timeout>();

  /**
   * 模拟接收3号的质量反馈
   */
  const simulateReceive3Feedback = useCallback((): MeshQualityFeedback => {
    const elementCount = Math.floor(geometry.faces.length / 3);
    const baseQuality = Math.max(0.45, Math.min(0.85, 0.7 - (elementCount / 2000000) * 0.2));
    
    const problemAreas: Array<{
      location: [number, number, number];
      issue: "尖锐角" | "细长三角形" | "网格密度不当";
      severity: 'low' | 'medium' | 'high';
      elementIds: number[];
      recommendedAction: string;
    }> = [
      {
        location: [15.2, 28.5, -8.3] as [number, number, number],
        issue: '尖锐角' as const,
        severity: 'high' as const,
        elementIds: [1234, 1235, 1236],
        recommendedAction: '建议使用2m圆角过渡，减少应力集中'
      },
      {
        location: [-5.8, 12.1, -15.7] as [number, number, number],
        issue: '细长三角形' as const,
        severity: 'medium' as const,
        elementIds: [5678, 5679],
        recommendedAction: '增加网格密度或调整边界形状'
      }
    ];

    if (elementCount > 1500000) {
      problemAreas.push({
        location: [22.1, -8.9, -12.4] as [number, number, number],
        issue: '网格密度不当' as const,
        severity: 'high' as const,
        elementIds: [9876, 9877, 9878, 9879],
        recommendedAction: '在非关键区域适当放大网格尺寸'
      });
    }

    return {
      problemAreas,
      suggestions: [
        '建议在基坑角点区域使用R=2m的圆角过渡',
        '支护结构厚度建议保持>0.5m以确保网格质量',
        '材料分界面建议使用平滑插值避免突变'
      ],
      qualityScore: baseQuality,
      overallAssessment: {
        meshReadiness: baseQuality >= 0.65,
        estimatedProcessingTime: Math.floor(elementCount / 8000), // 基于3号的验证数据
        memoryRequirement: Math.floor(elementCount * 0.004), // MB
        recommendedOptimizations: problemAreas.map(pa => pa.recommendedAction)
      },
      detailedMetrics: {
        aspectRatio: { min: 0.15, max: 8.2, average: 1.8 },
        skewness: { min: 0.02, max: 0.85, average: 0.32 },
        jacobian: { min: 0.08, max: 0.98, average: 0.71 },
        orthogonality: { min: 0.45, max: 0.99, average: 0.82 }
      }
    };
  }, [geometry]);

  /**
   * 处理3号反馈并自动优化
   */
  const processFeedbackFrom3 = useCallback(async (feedback: MeshQualityFeedback) => {
    const startTime = performance.now();
    
    setFeedbackState(prev => ({
      ...prev,
      latestFeedback: feedback,
      isProcessingFeedback: true,
      actualResponseTime: 0
    }));

    try {
      console.log('🔧 处理来自3号的质量反馈:', {
        问题区域: feedback.problemAreas.length,
        质量评分: feedback.qualityScore,
        网格就绪: feedback.overallAssessment.meshReadiness
      });

      // 生成优化建议
      const adjustments = await geometryOptimizationService.processMeshQualityFeedback(
        feedback, 
        geometry
      );

      // 如果启用自动优化且有高优先级问题
      if (autoOptimizationEnabled && 
          feedback.problemAreas.some(pa => pa.severity === 'high')) {
        
        setFeedbackState(prev => ({ ...prev, optimizationInProgress: true }));
        
        const optimizationResult = await geometryOptimizationService.applyGeometryAdjustments(
          adjustments,
          geometry,
          geometryId
        );

        const responseTime = (performance.now() - startTime) / 1000;
        
        setFeedbackState(prev => ({
          ...prev,
          isProcessingFeedback: false,
          optimizationInProgress: false,
          lastOptimizationResult: optimizationResult,
          actualResponseTime: responseTime
        }));

        // 通知父组件几何已优化
        if (optimizationResult.success && onGeometryOptimized) {
          onGeometryOptimized(optimizationResult.updatedGeometry);
        }

        // 通知质量改进数据
        if (onQualityImproved) {
          onQualityImproved({
            beforeScore: feedback.qualityScore,
            afterScore: optimizationResult.qualityImprovement.afterScore,
            improvementPercentage: optimizationResult.qualityImprovement.improvementPercentage,
            responseTime,
            appliedAdjustments: optimizationResult.appliedAdjustments.length
          });
        }

        console.log(`✅ 几何优化完成 (${responseTime.toFixed(1)}s):`, {
          响应时间: responseTime < 120 ? '✅ 达标' : '⚠️ 超时',
          质量提升: `${optimizationResult.qualityImprovement.improvementPercentage.toFixed(1)}%`,
          应用调整: optimizationResult.appliedAdjustments.length
        });

      } else {
        // 仅处理反馈，不自动优化
        const responseTime = (performance.now() - startTime) / 1000;
        
        setFeedbackState(prev => ({
          ...prev,
          isProcessingFeedback: false,
          actualResponseTime: responseTime
        }));
      }

    } catch (error) {
      console.error('❌ 处理3号反馈失败:', error);
      
      setFeedbackState(prev => ({
        ...prev,
        isProcessingFeedback: false,
        optimizationInProgress: false,
        actualResponseTime: (performance.now() - startTime) / 1000
      }));
    }
  }, [geometry, geometryId, autoOptimizationEnabled, onGeometryOptimized, onQualityImproved]);

  /**
   * 手动触发几何验证
   */
  const triggerGeometryValidation = useCallback(async () => {
    try {
      console.log('🔍 开始几何验证...');
      
      const [validation, health] = await Promise.all([
        geometryValidator.validateGeometry(geometry, geometryId),
        geometryValidator.generateHealthReport(geometry, geometryId)
      ]);
      
      setValidationResult(validation);
      setHealthReport(health);
      
      console.log('✅ 几何验证完成:', {
        有效性: validation.isValid ? '✅' : '❌',
        健康评分: `${health.healthScore}/100 (${health.healthGrade}级)`,
        推荐网格化: validation.meshingRecommendations.readyForMeshing ? '✅' : '❌'
      });
      
    } catch (error) {
      console.error('❌ 几何验证失败:', error);
    }
  }, [geometry, geometryId]);

  /**
   * 手动应用优化建议
   */
  const applyOptimizationManual = useCallback(async () => {
    if (!feedbackState.latestFeedback) return;
    
    setFeedbackState(prev => ({ ...prev, optimizationInProgress: true }));
    
    try {
      const adjustments = await geometryOptimizationService.processMeshQualityFeedback(
        feedbackState.latestFeedback,
        geometry
      );
      
      const result = await geometryOptimizationService.applyGeometryAdjustments(
        adjustments,
        geometry,
        geometryId
      );
      
      setFeedbackState(prev => ({
        ...prev,
        optimizationInProgress: false,
        lastOptimizationResult: result
      }));
      
      if (result.success && onGeometryOptimized) {
        onGeometryOptimized(result.updatedGeometry);
      }
      
    } catch (error) {
      console.error('❌ 手动优化失败:', error);
      setFeedbackState(prev => ({ ...prev, optimizationInProgress: false }));
    }
  }, [feedbackState.latestFeedback, geometry, geometryId, onGeometryOptimized]);

  // 实时监控模式
  useEffect(() => {
    if (realTimeMode) {
      // 模拟每30秒接收一次3号的反馈
      feedbackProcessingRef.current = setInterval(() => {
        const feedback = simulateReceive3Feedback();
        processFeedbackFrom3(feedback);
      }, 30000);

      // 每2分钟进行一次质量验证
      qualityMonitoringRef.current = setInterval(() => {
        triggerGeometryValidation();
      }, 120000);

      // 初始验证
      triggerGeometryValidation();
    }

    return () => {
      if (feedbackProcessingRef.current) {
        clearInterval(feedbackProcessingRef.current);
      }
      if (qualityMonitoringRef.current) {
        clearInterval(qualityMonitoringRef.current);
      }
    };
  }, [realTimeMode, processFeedbackFrom3, triggerGeometryValidation]);

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.65) return 'text-yellow-400'; // 3号的质量阈值
    return 'text-red-400';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-900/20';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20';
      case 'low': return 'text-blue-400 bg-blue-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
      {/* 头部信息 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-green-400" />
          <h3 className="text-xl font-semibold text-white">几何质量反馈系统</h3>
          <div className="text-sm text-gray-400">
            与3号实时协作 | 响应目标&lt;2分钟
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={autoOptimizationEnabled}
              onChange={(e) => setAutoOptimizationEnabled(e.target.checked)}
              className="rounded"
            />
            自动优化
          </label>
          
          <button
            onClick={() => {
              const feedback = simulateReceive3Feedback();
              processFeedbackFrom3(feedback);
            }}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            模拟3号反馈
          </button>
        </div>
      </div>

      {/* 质量概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-400">当前质量</span>
          </div>
          <div className={`text-2xl font-bold ${getQualityColor(feedbackState.latestFeedback?.qualityScore || 0.6)}`}>
            {((feedbackState.latestFeedback?.qualityScore || 0.6) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-gray-400">响应时间</span>
          </div>
          <div className={`text-2xl font-bold ${
            feedbackState.actualResponseTime < 120 ? 'text-green-400' : 'text-red-400'
          }`}>
            {feedbackState.actualResponseTime.toFixed(1)}s
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-gray-400">问题区域</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {feedbackState.latestFeedback?.problemAreas.length || 0}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-400">网格就绪</span>
          </div>
          <div className={`text-lg font-bold ${
            feedbackState.latestFeedback?.overallAssessment.meshReadiness ? 'text-green-400' : 'text-red-400'
          }`}>
            {feedbackState.latestFeedback?.overallAssessment.meshReadiness ? '✅ 就绪' : '❌ 需优化'}
          </div>
        </div>
      </div>

      {/* 处理状态 */}
      {(feedbackState.isProcessingFeedback || feedbackState.optimizationInProgress) && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
            <div className="text-blue-300">
              {feedbackState.isProcessingFeedback && '正在处理3号质量反馈...'}
              {feedbackState.optimizationInProgress && '正在应用几何优化...'}
            </div>
          </div>
        </div>
      )}

      {/* 3号反馈详情 */}
      {show3FeedbackDetails && feedbackState.latestFeedback && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            3号质量反馈详情
          </h4>

          {/* 问题区域列表 */}
          <div className="space-y-3 mb-4">
            {feedbackState.latestFeedback.problemAreas.map((problem, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedProblemArea === index 
                    ? 'border-yellow-400 bg-yellow-900/20' 
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                onClick={() => setSelectedProblemArea(selectedProblemArea === index ? null : index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(problem.severity)}`}>
                      {problem.severity.toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{problem.issue}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    ({problem.location[0].toFixed(1)}, {problem.location[1].toFixed(1)}, {problem.location[2].toFixed(1)})
                  </div>
                </div>
                
                {selectedProblemArea === index && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <p className="text-sm text-gray-300 mb-2">
                      <strong>建议措施:</strong> {problem.recommendedAction}
                    </p>
                    {problem.elementIds && (
                      <p className="text-xs text-gray-400">
                        影响单元: {problem.elementIds.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 优化建议 */}
          <div className="bg-gray-900 rounded-lg p-3">
            <h5 className="text-sm font-semibold text-white mb-2">3号优化建议:</h5>
            <ul className="text-sm text-gray-300 space-y-1">
              {feedbackState.latestFeedback.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 优化结果 */}
      {feedbackState.lastOptimizationResult && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            最近优化结果
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded-lg p-3">
              <div className="text-sm text-gray-400">优化状态</div>
              <div className={`font-medium ${
                feedbackState.lastOptimizationResult.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {feedbackState.lastOptimizationResult.success ? '✅ 成功' : '❌ 失败'}
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-3">
              <div className="text-sm text-gray-400">质量提升</div>
              <div className="font-medium text-green-400">
                +{feedbackState.lastOptimizationResult.qualityImprovement.improvementPercentage.toFixed(1)}%
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-3">
              <div className="text-sm text-gray-400">应用调整</div>
              <div className="font-medium text-white">
                {feedbackState.lastOptimizationResult.appliedAdjustments.length} 项
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 健康度报告 */}
      {healthReport && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-400" />
            几何健康度报告
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">
                {healthReport.healthScore}
              </div>
              <div className={`text-lg font-medium mb-2 ${
                healthReport.healthGrade === 'A' ? 'text-green-400' :
                healthReport.healthGrade === 'B' ? 'text-blue-400' :
                healthReport.healthGrade === 'C' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {healthReport.healthGrade} 级
              </div>
              <div className="text-xs text-gray-400">综合健康度</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {healthReport.topologyHealth.score}
              </div>
              <div className="text-sm text-gray-300 mb-2">拓扑健康</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {healthReport.geometryHealth.score}
              </div>
              <div className="text-sm text-gray-300 mb-2">几何健康</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">
                {healthReport.materialHealth.score}
              </div>
              <div className="text-sm text-gray-300 mb-2">材料健康</div>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={triggerGeometryValidation}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          验证几何质量
        </button>

        {feedbackState.latestFeedback && !autoOptimizationEnabled && (
          <button
            onClick={applyOptimizationManual}
            disabled={feedbackState.optimizationInProgress}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Wrench className="w-4 h-4" />
            应用优化
          </button>
        )}
      </div>
    </div>
  );
};

export default GeometryQualityPanel;