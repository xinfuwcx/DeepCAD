/**
 * 性能监控面板组件
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import React, { useState, useEffect } from 'react';
import { 
  globalPerformanceMonitor, 
  PerformanceMetrics, 
  UserInteractionMetrics 
} from '../../core/performanceMonitor';
import { globalResourceManager } from '../../core/resourceManager';

interface PerformanceData {
  metrics: PerformanceMetrics;
  interactions: UserInteractionMetrics;
  resourceStats: any;
  report: any;
  bottleneck: any;
}

export const PerformancePanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const updatePerformanceData = () => {
      const metrics = globalPerformanceMonitor.getMetrics();
      const interactions = globalPerformanceMonitor.getInteractionMetrics();
      const resourceStats = globalResourceManager.getMemoryStats();
      const report = globalPerformanceMonitor.getPerformanceReport();
      const bottleneck = globalPerformanceMonitor.detectBottlenecks();

      setPerformanceData({
        metrics,
        interactions,
        resourceStats,
        report,
        bottleneck
      });
    };

    // 立即更新一次
    updatePerformanceData();

    // 每2秒更新一次
    const interval = setInterval(updatePerformanceData, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getFpsColor = (fps: number): string => {
    if (fps >= 55) return 'text-green-500';
    if (fps >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMemoryColor = (percentage: number): string => {
    if (percentage < 60) return 'text-green-500';
    if (percentage < 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-lg transition-colors"
        title="显示性能监控"
      >
        📊 性能
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white rounded-lg shadow-2xl w-96 max-h-96 overflow-y-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold flex items-center">
          📊 性能监控
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2 py-1 rounded text-xs ${
              autoRefresh 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-gray-600 hover:bg-gray-700'
            } transition-colors`}
          >
            {autoRefresh ? '⏸️ 暂停' : '▶️ 开始'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {performanceData && (
        <div className="p-4 space-y-4">
          {/* 核心指标 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-sm text-gray-400">FPS</div>
              <div className={`text-2xl font-bold ${getFpsColor(performanceData.metrics.fps)}`}>
                {performanceData.metrics.fps}
              </div>
              <div className="text-xs text-gray-500">
                {performanceData.metrics.frameTime.toFixed(1)}ms/帧
              </div>
            </div>

            <div className="bg-gray-800 p-3 rounded">
              <div className="text-sm text-gray-400">内存</div>
              <div className={`text-xl font-bold ${getMemoryColor(performanceData.metrics.memoryUsage.percentage)}`}>
                {performanceData.metrics.memoryUsage.percentage}%
              </div>
              <div className="text-xs text-gray-500">
                {performanceData.metrics.memoryUsage.used}MB / {performanceData.metrics.memoryUsage.total}MB
              </div>
            </div>
          </div>

          {/* 渲染统计 */}
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-400 mb-2">渲染统计</div>
            <div className="text-xs space-y-1">
              <div>绘制调用: {performanceData.metrics.drawCalls}</div>
              <div>三角形: {performanceData.metrics.triangles.toLocaleString()}</div>
              <div>几何体: {performanceData.metrics.geometries}</div>
              <div>纹理: {performanceData.metrics.textures}</div>
            </div>
          </div>

          {/* 资源管理统计 */}
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-400 mb-2">资源管理</div>
            <div className="text-xs space-y-1">
              <div>几何体池: {performanceData.resourceStats.geometries}</div>
              <div>材质池: {performanceData.resourceStats.materials}</div>
              <div>纹理池: {performanceData.resourceStats.textures}</div>
              <div>事件监听器: {performanceData.resourceStats.eventListeners}</div>
            </div>
          </div>

          {/* 交互响应 */}
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-400 mb-2">交互响应</div>
            <div className="text-xs space-y-1">
              <div>平均响应: {performanceData.interactions.averageResponseTime.toFixed(1)}ms</div>
              <div>点击响应: {performanceData.interactions.clickResponseTime.toFixed(1)}ms</div>
              <div>滚动响应: {performanceData.interactions.scrollResponseTime.toFixed(1)}ms</div>
            </div>
          </div>

          {/* 性能评分 */}
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-400 mb-2">性能评分</div>
            <div className="text-sm font-semibold">{performanceData.report.overall}</div>
            {performanceData.report.recommendations.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-400">建议:</div>
                <ul className="text-xs text-yellow-400 mt-1 space-y-1">
                  {performanceData.report.recommendations.slice(0, 2).map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 瓶颈检测 */}
          {performanceData.bottleneck.type !== 'none' && (
            <div className="bg-red-900/30 border border-red-500 p-3 rounded">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-red-400">⚠️</span>
                <div className="text-sm font-semibold text-red-400">性能瓶颈</div>
                <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(performanceData.bottleneck.severity)}`}>
                  {performanceData.bottleneck.severity}
                </span>
              </div>
              <div className="text-xs text-gray-300 mb-2">
                {performanceData.bottleneck.description}
              </div>
              {performanceData.bottleneck.suggestions.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400">解决方案:</div>
                  <ul className="text-xs text-blue-400 mt-1 space-y-1">
                    {performanceData.bottleneck.suggestions.slice(0, 2).map((suggestion, index) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 