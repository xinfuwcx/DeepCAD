/**
 * Phase 1数据可视化 - 为3号计算专家提供直观的测试数据展示
 * 80万单元简单基坑，质量分布，关键区域标识
 */

import React, { useState, useEffect } from 'react';
import phase1Data from './Phase1_DataSample.json';

const Phase1DataVisualization: React.FC = () => {
  const [selectedView, setSelectedView] = useState<'overview' | 'quality' | 'critical' | 'challenges'>('overview');
  const [analysisStarted, setAnalysisStarted] = useState(false);

  // 模拟3号的分析结果（展示期望的反馈格式）
  const mockAnalysisResult = {
    processingTime: 1247, // ms
    qualityAnalysis: {
      overallScore: 0.756,
      elementQuality: {
        excellent: 0.45,     // >0.8
        good: 0.38,         // 0.65-0.8  
        acceptable: 0.15,   // 0.5-0.65
        poor: 0.02         // <0.5
      },
      geometryIssues: {
        sharpAngles: 8,
        aspectRatioViolations: 156,
        skewnessIssues: 23
      }
    },
    performance: {
      memoryUsage: 3247,    // MB
      renderingFPS: 58,
      dataTransferTime: 89
    },
    optimizationSuggestions: {
      priority: 'medium' as const,
      suggestions: [
        "建议在基坑底部角点(z=-15)区域减小网格尺寸到1.2m，提升局部质量",
        "材料分界面(z=-6, z=-12)处可增加RBF平滑参数到0.15，改善连续性",
        "支护接触面建议使用thin_plate_spline核函数，增强角点保持特性"
      ],
      expectedImprovement: 0.08
    }
  };

  const startAnalysis = () => {
    setAnalysisStarted(true);
    console.log('🚀 3号分析开始!', {
      数据规模: '80万单元',
      顶点数: phase1Data.geometryMetadata.vertexCount,
      网格尺寸: phase1Data.geometryMetadata.meshSize + 'm',
      质量目标: phase1Data.testInfo.targetSpecs.qualityTarget
    });
  };

  return (
    <div className="w-full h-screen bg-gray-900 text-white overflow-hidden">
      {/* 头部 */}
      <div className="h-16 bg-gradient-to-r from-blue-800 to-purple-800 border-b border-blue-500/30 flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="text-2xl">🏗️</div>
          <div>
            <h1 className="text-xl font-bold">Phase 1: 简单基坑数据展示</h1>
            <p className="text-sm text-blue-200">2号 → 3号 | 80万单元挑战数据</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-blue-200">
            目标处理时间: &lt;2秒 | 内存: &lt;4GB
          </div>
          <button
            onClick={startAnalysis}
            disabled={analysisStarted}
            className="px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:bg-gray-600 rounded-lg font-semibold transition-all transform hover:scale-105"
          >
            {analysisStarted ? '分析中...' : '🚀 3号开始分析!'}
          </button>
        </div>
      </div>

      {/* 主内容 */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* 左侧菜单 */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
          <h3 className="text-lg font-semibold mb-4 text-cyan-400">数据视图</h3>
          <div className="space-y-2">
            {[
              { key: 'overview', label: '数据概览', icon: '📊' },
              { key: 'quality', label: '质量分布', icon: '🎯' },
              { key: 'critical', label: '关键区域', icon: '⚠️' },
              { key: 'challenges', label: '挑战点', icon: '🔥' }
            ].map(view => (
              <button
                key={view.key}
                onClick={() => setSelectedView(view.key as any)}
                className={`w-full text-left p-3 rounded transition-colors ${
                  selectedView === view.key 
                    ? 'bg-cyan-600/20 border border-cyan-500/30 text-cyan-400' 
                    : 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'
                }`}
              >
                <span className="mr-3">{view.icon}</span>
                {view.label}
              </button>
            ))}
          </div>

          {/* 数据规格卡片 */}
          <div className="mt-6 bg-gray-700/30 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-white">测试规格</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">单元数:</span>
                <span className="text-green-400">{phase1Data.geometryMetadata.elementCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">顶点数:</span>
                <span className="text-cyan-400">{phase1Data.geometryMetadata.vertexCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">网格尺寸:</span>
                <span className="text-yellow-400">{phase1Data.geometryMetadata.meshSize}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">平均质量:</span>
                <span className="text-green-400">{phase1Data.geometryMetadata.qualityStats.mean}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 主显示区域 */}
        <div className="flex-1 p-6 overflow-y-auto">
          {selectedView === 'overview' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-cyan-400">📊 数据概览</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">🎯</div>
                    <div className="text-lg font-bold text-green-400">{phase1Data.geometryMetadata.elementCount.toLocaleString()}</div>
                    <div className="text-sm text-gray-400">单元数量</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">📐</div>
                    <div className="text-lg font-bold text-yellow-400">{phase1Data.geometryMetadata.meshSize}m</div>
                    <div className="text-sm text-gray-400">网格尺寸</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">⭐</div>
                    <div className="text-lg font-bold text-cyan-400">{phase1Data.geometryMetadata.qualityStats.mean}</div>
                    <div className="text-sm text-gray-400">平均质量</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">📏</div>
                    <div className="text-lg font-bold text-purple-400">60×40×15</div>
                    <div className="text-sm text-gray-400">边界框(m)</div>
                  </div>
                </div>
              </div>

              {/* 3号测试数据预览 */}
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">🔬 给3号的测试数据预览</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3 text-cyan-400">顶点样本 (前12个)</h4>
                    <div className="bg-gray-900/50 rounded p-3 overflow-x-auto">
                      <pre className="text-xs text-green-400">
{JSON.stringify(phase1Data.sampleData.vertices.slice(0, 12), null, 2)}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3 text-cyan-400">质量样本 (前12个)</h4>
                    <div className="bg-gray-900/50 rounded p-3">
                      <pre className="text-xs text-yellow-400">
{JSON.stringify(phase1Data.sampleData.quality.slice(0, 12), null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedView === 'quality' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/20 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-cyan-400">🎯 质量分布分析</h2>
                
                {/* 质量统计 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {(phase1Data.geometryMetadata.qualityStats.distribution.excellent_gt_80 * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-green-300">优秀 (&gt;0.8)</div>
                  </div>
                  <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-cyan-400">
                      {(phase1Data.geometryMetadata.qualityStats.distribution.good_65_80 * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-cyan-300">良好 (0.65-0.8)</div>
                  </div>
                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {(phase1Data.geometryMetadata.qualityStats.distribution.acceptable_50_65 * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-yellow-300">可接受 (0.5-0.65)</div>
                  </div>
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {(phase1Data.geometryMetadata.qualityStats.distribution.poor_lt_50 * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-red-300">较差 (&lt;0.5)</div>
                  </div>
                </div>

                {/* 质量范围 */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="font-medium mb-3 text-white">质量范围分析</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-red-400 text-lg font-bold">{phase1Data.geometryMetadata.qualityStats.min}</div>
                      <div className="text-gray-400">最小值</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-400 text-lg font-bold">{phase1Data.geometryMetadata.qualityStats.mean}</div>
                      <div className="text-gray-400">平均值</div>
                    </div>
                    <div className="text-center">
                      <div className="text-cyan-400 text-lg font-bold">{phase1Data.geometryMetadata.qualityStats.max}</div>
                      <div className="text-gray-400">最大值</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedView === 'critical' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-cyan-400">⚠️ 关键区域分析</h2>

                {/* 基坑角点 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-orange-400">基坑角点质量</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {phase1Data.criticalRegions.corners.map((corner, index) => (
                      <div key={index} className={`p-3 rounded border ${
                        corner.quality >= 0.8 ? 'bg-green-500/20 border-green-500/30' :
                        corner.quality >= 0.65 ? 'bg-yellow-500/20 border-yellow-500/30' :
                        'bg-red-500/20 border-red-500/30'
                      }`}>
                        <div className="text-xs text-gray-400">{corner.type}</div>
                        <div className="text-sm font-mono">
                          [{corner.position.join(', ')}]
                        </div>
                        <div className={`text-lg font-bold ${
                          corner.quality >= 0.8 ? 'text-green-400' :
                          corner.quality >= 0.65 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {corner.quality}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 支护接触面 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-cyan-400">支护接触面</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {phase1Data.criticalRegions.supportContacts.map((contact, index) => (
                      <div key={index} className="bg-gray-800/50 rounded p-3">
                        <div className="text-sm text-gray-400">{contact.contactType}</div>
                        <div className="text-sm font-mono text-cyan-300">
                          [{contact.position.join(', ')}]
                        </div>
                        <div className="text-lg font-bold text-cyan-400">
                          质量: {contact.quality}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 材料分界面 */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-purple-400">材料分界面</h3>
                  <div className="space-y-3">
                    {phase1Data.criticalRegions.materialBoundaries.map((boundary, index) => (
                      <div key={index} className="bg-gray-800/50 rounded p-3 flex justify-between items-center">
                        <div>
                          <div className="text-sm text-purple-400">{boundary.boundaryType}</div>
                          <div className="text-lg font-bold">深度: {boundary.depth}m</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400">平均质量</div>
                          <div className="text-lg font-bold text-purple-400">{boundary.avgQuality}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedView === 'challenges' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-cyan-400">🔥 给3号的挑战</h2>

                {/* 挑战消息 */}
                <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-red-400 mb-2">
                    {phase1Data.challenge_to_3.message}
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">处理时间目标:</div>
                      <div className="text-green-400 font-bold">{phase1Data.challenge_to_3.expectations.processingTime}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">内存限制:</div>
                      <div className="text-cyan-400 font-bold">{phase1Data.challenge_to_3.expectations.memoryUsage}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">分析精度:</div>
                      <div className="text-yellow-400 font-bold">{phase1Data.challenge_to_3.expectations.qualityAnalysis}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">优化建议:</div>
                      <div className="text-purple-400 font-bold">{phase1Data.challenge_to_3.expectations.optimizationSuggestions}</div>
                    </div>
                  </div>
                </div>

                {/* 几何问题挑战 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  <div className="bg-red-500/20 border border-red-500/30 rounded p-4 text-center">
                    <div className="text-2xl mb-2">⚠️</div>
                    <div className="text-lg font-bold text-red-400">{phase1Data.expectedChallenges.geometryIssues.sharpAngles}</div>
                    <div className="text-sm text-red-300">尖锐角</div>
                  </div>
                  <div className="bg-orange-500/20 border border-orange-500/30 rounded p-4 text-center">
                    <div className="text-2xl mb-2">📐</div>
                    <div className="text-lg font-bold text-orange-400">{phase1Data.expectedChallenges.geometryIssues.aspectRatioViolations}</div>
                    <div className="text-sm text-orange-300">长宽比违规</div>
                  </div>
                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded p-4 text-center">
                    <div className="text-2xl mb-2">🔀</div>
                    <div className="text-lg font-bold text-yellow-400">{phase1Data.expectedChallenges.geometryIssues.skewnessIssues}</div>
                    <div className="text-sm text-yellow-300">偏斜问题</div>
                  </div>
                </div>

                {/* 质量热点 */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-red-400">质量热点区域</h3>
                  <div className="space-y-3">
                    {phase1Data.expectedChallenges.qualityHotspots.map((hotspot, index) => (
                      <div key={index} className="bg-gray-800/50 rounded p-4 flex justify-between items-center">
                        <div>
                          <div className="text-white font-medium">{hotspot.region}</div>
                          <div className="text-sm text-gray-400">{hotspot.elementCount} 单元</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400">最低质量</div>
                          <div className={`text-lg font-bold ${
                            hotspot.minQuality >= 0.65 ? 'text-green-400' :
                            hotspot.minQuality >= 0.5 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {hotspot.minQuality}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 奖励积分 */}
                <div className="mt-6 bg-gradient-to-r from-gold/10 to-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 text-yellow-400">🏆 奖励积分挑战</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {phase1Data.challenge_to_3.bonus_points.map((point, index) => (
                      <div key={index} className="flex items-center space-x-3 text-sm">
                        <div className="text-yellow-400 text-lg">🎯</div>
                        <span className="text-gray-300">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 模拟3号分析结果 */}
          {analysisStarted && (
            <div className="mt-8 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-green-400">✅ 3号分析结果 (模拟)</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-cyan-400">性能表现</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">处理时间:</span>
                      <span className="text-green-400 font-bold">{mockAnalysisResult.processingTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">内存使用:</span>
                      <span className="text-cyan-400 font-bold">{mockAnalysisResult.performance.memoryUsage}MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">渲染帧率:</span>
                      <span className="text-green-400 font-bold">{mockAnalysisResult.performance.renderingFPS}fps</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">整体质量:</span>
                      <span className="text-green-400 font-bold">{mockAnalysisResult.qualityAnalysis.overallScore}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-cyan-400">3号优化建议</h3>
                  <div className="space-y-2">
                    {mockAnalysisResult.optimizationSuggestions.suggestions.map((suggestion, index) => (
                      <div key={index} className="text-sm text-gray-300 flex items-start space-x-2">
                        <span className="text-cyan-400 mt-1">•</span>
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-gray-400">
                    预期提升: +{(mockAnalysisResult.optimizationSuggestions.expectedImprovement * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Phase1DataVisualization;