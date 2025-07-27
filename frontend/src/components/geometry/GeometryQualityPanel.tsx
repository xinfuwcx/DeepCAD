/**
 * 几何质量实时反馈面板 - 基于3号计算专家的质量指标
 * 响应时间<100ms，支持200万单元级别监控
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Info, Zap, Target, Activity } from 'lucide-react';

// 3号提供的质量反馈接口
export interface MeshQualityFeedback {
  timestamp: string;
  meshSize: number; // 1.5-2.0m range
  elementCount: number; // max 2M elements
  qualityScore: number; // target >0.65
  criticalRegions: {
    corners: {
      count: number;
      quality: number;
      issues: string[];
    };
    supportContacts: {
      count: number;
      sharpAngles: number;
      recommendations: string[];
    };
    materialBoundaries: {
      count: number;
      continuity: boolean;
      warnings: string[];
    };
  };
  performance: {
    responseTime: number; // <100ms target
    memoryUsage: number;
    complexity: 'low' | 'medium' | 'high';
  };
  optimization: {
    suggestions: string[];
    priority: 'low' | 'medium' | 'high';
    estimatedImprovement: number;
  };
}

export interface GeometryQualityPanelProps {
  isVisible: boolean;
  onOptimizationApply: (suggestions: string[]) => void;
  onGeometryAdjust: (adjustments: any) => void;
}

const GeometryQualityPanel: React.FC<GeometryQualityPanelProps> = ({
  isVisible,
  onOptimizationApply,
  onGeometryAdjust
}) => {
  const [qualityData, setQualityData] = useState<MeshQualityFeedback | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoOptimize, setAutoOptimize] = useState(false);

  // 与3号的实时质量反馈连接
  useEffect(() => {
    if (!isVisible) return;

    console.log('🔗 连接3号质量反馈系统...');
    
    const ws = new WebSocket('ws://localhost:8080/quality-feedback');
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('✅ 与3号质量反馈系统连接成功');
    };

    ws.onmessage = (event) => {
      try {
        const feedback: MeshQualityFeedback = JSON.parse(event.data);
        setQualityData(feedback);
        setLastUpdate(new Date());
        
        // 3号建议的自动优化机制
        if (autoOptimize && feedback.optimization.priority === 'high') {
          handleOptimizationApply(feedback.optimization.suggestions);
        }
        
      } catch (error) {
        console.error('❌ 质量反馈数据解析失败:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('⚠️ 与3号质量反馈系统连接断开');
    };

    return () => {
      ws.close();
    };
  }, [isVisible, autoOptimize]);

  const handleOptimizationApply = useCallback((suggestions: string[]) => {
    console.log('🔧 应用3号的优化建议:', suggestions);
    onOptimizationApply(suggestions);
  }, [onOptimizationApply]);

  const getQualityColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.65) return 'text-yellow-400'; // 3号的质量目标
    return 'text-red-400';
  };

  const getComplexityColor = (complexity: string): string => {
    switch (complexity) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed right-4 top-20 w-96 bg-gray-900/95 backdrop-blur-sm border border-cyan-500/30 rounded-lg shadow-xl z-50">
      {/* 头部 - 连接状态 */}
      <div className="flex items-center justify-between p-4 border-b border-cyan-500/20">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <span className="text-white font-medium">3号质量反馈</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? '已连接' : '断开'}
          </span>
        </div>
      </div>

      {/* 主要指标 */}
      {qualityData && (
        <div className="p-4 space-y-4">
          {/* 核心质量指标 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Target className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-gray-300">质量评分</span>
              </div>
              <div className={`text-lg font-bold ${getQualityColor(qualityData.qualityScore)}`}>
                {(qualityData.qualityScore * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-400">目标: &gt;65%</div>
            </div>

            <div className="bg-gray-800/50 rounded p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-gray-300">响应时间</span>
              </div>
              <div className={`text-lg font-bold ${qualityData.performance.responseTime < 100 ? 'text-green-400' : 'text-red-400'}`}>
                {qualityData.performance.responseTime}ms
              </div>
              <div className="text-xs text-gray-400">目标: &lt;100ms</div>
            </div>
          </div>

          {/* 网格参数 */}
          <div className="bg-gray-800/30 rounded p-3">
            <h4 className="text-sm font-medium text-white mb-2">3号验证参数</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-gray-400">网格尺寸</span>
                <div className={`font-bold ${qualityData.meshSize >= 1.5 && qualityData.meshSize <= 2.0 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {qualityData.meshSize.toFixed(1)}m
                </div>
              </div>
              <div>
                <span className="text-gray-400">单元数量</span>
                <div className={`font-bold ${qualityData.elementCount <= 2000000 ? 'text-green-400' : 'text-red-400'}`}>
                  {(qualityData.elementCount / 1000000).toFixed(1)}M
                </div>
              </div>
              <div>
                <span className="text-gray-400">复杂度</span>
                <div className={`font-bold ${getComplexityColor(qualityData.performance.complexity)}`}>
                  {qualityData.performance.complexity}
                </div>
              </div>
            </div>
          </div>

          {/* 关键区域分析 */}
          <div className="bg-gray-800/30 rounded p-3">
            <h4 className="text-sm font-medium text-white mb-2">关键区域状态</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-300">基坑角点</span>
                <span className={qualityData.criticalRegions.corners.quality > 0.65 ? 'text-green-400' : 'text-yellow-400'}>
                  {qualityData.criticalRegions.corners.count}个 ({(qualityData.criticalRegions.corners.quality * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">支护接触面</span>
                <span className={qualityData.criticalRegions.supportContacts.sharpAngles === 0 ? 'text-green-400' : 'text-red-400'}>
                  {qualityData.criticalRegions.supportContacts.count}个 
                  {qualityData.criticalRegions.supportContacts.sharpAngles > 0 && ` (${qualityData.criticalRegions.supportContacts.sharpAngles}尖角)`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">材料分界</span>
                <span className={qualityData.criticalRegions.materialBoundaries.continuity ? 'text-green-400' : 'text-red-400'}>
                  {qualityData.criticalRegions.materialBoundaries.count}个 
                  {qualityData.criticalRegions.materialBoundaries.continuity ? '连续' : '不连续'}
                </span>
              </div>
            </div>
          </div>

          {/* 3号的优化建议 */}
          {qualityData.optimization.suggestions.length > 0 && (
            <div className="bg-gray-800/30 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-white">3号优化建议</h4>
                <span className={`text-xs px-2 py-1 rounded ${
                  qualityData.optimization.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                  qualityData.optimization.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {qualityData.optimization.priority}
                </span>
              </div>
              
              <div className="space-y-1 mb-3">
                {qualityData.optimization.suggestions.map((suggestion, index) => (
                  <div key={index} className="text-xs text-gray-300 flex items-start space-x-2">
                    <Info className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  预期提升: +{(qualityData.optimization.estimatedImprovement * 100).toFixed(1)}%
                </span>
                <button
                  onClick={() => handleOptimizationApply(qualityData.optimization.suggestions)}
                  className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs rounded border border-cyan-500/30 transition-colors"
                >
                  应用建议
                </button>
              </div>
            </div>
          )}

          {/* 控制选项 */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoOptimize}
                onChange={(e) => setAutoOptimize(e.target.checked)}
                className="w-4 h-4 text-cyan-400 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500"
              />
              <span className="text-xs text-gray-300">自动优化</span>
            </label>
            
            {lastUpdate && (
              <span className="text-xs text-gray-400">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 无数据状态 */}
      {!qualityData && isConnected && (
        <div className="p-8 text-center">
          <Activity className="w-8 h-8 text-cyan-400 mx-auto mb-2 animate-pulse" />
          <p className="text-gray-300 text-sm">等待3号质量反馈数据...</p>
        </div>
      )}

      {/* 连接失败状态 */}
      {!isConnected && (
        <div className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 text-sm">无法连接3号质量反馈系统</p>
          <p className="text-gray-400 text-xs mt-1">请检查WebSocket连接</p>
        </div>
      )}
    </div>
  );
};

export default GeometryQualityPanel;