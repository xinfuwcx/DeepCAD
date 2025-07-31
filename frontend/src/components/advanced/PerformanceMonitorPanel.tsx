/**
 * 性能监控面板组件
 * 实时系统性能监控与优化建议
 */

import React from 'react';
import { useEnhancedPerformanceMetrics } from '../../utils/performanceMonitor';

interface PerformanceMonitorPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export const PerformanceMonitorPanel: React.FC<PerformanceMonitorPanelProps> = ({ isVisible, onClose }) => {
  const { metrics, networkMetrics, interactionMetrics, suggestions, generateReport } = useEnhancedPerformanceMetrics();
  const [showFullReport, setShowFullReport] = React.useState(false);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl w-[90vw] h-[80vh] flex flex-col max-w-4xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">PM</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">性能监控面板</h2>
              <p className="text-sm text-gray-600">实时系统性能监控与优化建议</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFullReport(!showFullReport)}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              {showFullReport ? '简化视图' : '详细报告'}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            >
              <span className="text-gray-600">×</span>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {showFullReport ? (
            <pre className="text-xs font-mono whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
              {generateReport()}
            </pre>
          ) : (
            <div className="space-y-6">
              {/* 核心指标 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-blue-700">FPS</p>
                    <p className="text-2xl font-bold text-blue-900">{metrics?.fps || 0}</p>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700">内存使用</p>
                    <p className="text-2xl font-bold text-green-900">{metrics?.memory?.percentage?.toFixed(0) || 0}%</p>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-purple-700">渲染调用</p>
                    <p className="text-2xl font-bold text-purple-900">{metrics?.threejsStats?.calls || 0}</p>
                  </div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-orange-700">交互响应</p>
                    <p className="text-2xl font-bold text-orange-900">{interactionMetrics.avgResponseTime.toFixed(0)}ms</p>
                  </div>
                </div>
              </div>
              
              {/* 网络性能 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">网络性能</h3>
                <div className="space-y-2">
                  {Object.entries(networkMetrics).slice(0, 5).map(([api, metrics]: [string, any]) => (
                    <div key={api} className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-700">{api}</span>
                      <span className="text-sm text-gray-600">
                        {metrics.avg.toFixed(0)}ms (avg) • {metrics.count} requests
                      </span>
                    </div>
                  ))}
                  {Object.keys(networkMetrics).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">暂无网络请求数据</p>
                  )}
                </div>
              </div>
              
              {/* 优化建议 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">优化建议</h3>
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-1">💡</span>
                      <span className="text-sm text-gray-700">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitorPanel;