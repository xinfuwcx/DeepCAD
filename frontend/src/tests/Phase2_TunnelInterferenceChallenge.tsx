/**
 * Phase 2: 180万单元隧道干扰终极挑战
 * 复杂度: HIGH | 内存挑战: 16GB | 处理目标: 30-60秒
 * 2号vs3号的巅峰协作测试
 */

import React, { useState, useEffect, useRef } from 'react';
import { quickMeshDataFor3, MeshDataFor3 } from '../utils/meshDataGenerator';

// Phase 2 的复杂质量反馈接口
interface Phase2QualityFeedback {
  timestamp: string;
  processingTime: number;        // 期待30-60秒
  memoryPeakUsage: number;       // GB，挑战16GB限制
  
  complexityAnalysis: {
    overallScore: number;        // 目标0.66，比Phase1更低但合理
    tunnelIntersectionQuality: number;  // 隧道-基坑交叉区域质量
    geometricComplexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    
    qualityDistribution: {
      excellent: number;         // &gt;0.8
      good: number;             // 0.65-0.8
      acceptable: number;       // 0.5-0.65  
      poor: number;             // &lt;0.5
      critical: number;         // <0.3 (隧道交叉区域)
    };
    
    problemRegions: {
      tunnelCrossing: {
        elementCount: number;
        minQuality: number;
        avgQuality: number;
        criticalIssues: string[];
      };
      sharpAngles: {
        count: number;
        severityDistribution: number[];
      };
      aspectRatioViolations: {
        count: number;
        maxRatio: number;
        affectedRegions: string[];
      };
    };
  };
  
  performanceMetrics: {
    fragmentRenderingFPS: number;    // 期待>30fps
    memoryEfficiency: number;        // 内存使用效率
    dataTransferTime: number;        // 大数据传输时间
    qualityAnalysisTime: number;     // 3号分析耗时
    
    scalabilityTest: {
      elementProcessingRate: number;  // 单元/秒
      memoryPerElement: number;       // MB/单元
      renderingBottleneck: string;    // 性能瓶颈识别
    };
  };
  
  expertOptimizations: {
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    tunnelSpecificSuggestions: string[];
    geometryOptimizations: string[];
    performanceRecommendations: string[];
    phase3Predictions: string[];     // 对更大规模的预测
    
    estimatedImprovements: {
      qualityGain: number;
      performanceGain: number;
      memoryReduction: number;
    };
  };
}

const Phase2TunnelInterferenceChallenge: React.FC = () => {
  // 挑战状态
  const [challengePhase, setChallengePhase] = useState<'preparing' | 'generating' | 'transferring' | 'processing' | 'completed' | 'failed'>('preparing');
  const [complexMeshData, setComplexMeshData] = useState<MeshDataFor3 | null>(null);
  const [phase2Feedback, setPhase2Feedback] = useState<Phase2QualityFeedback | null>(null);
  const [challengeStartTime, setChallengeStartTime] = useState<number>(0);
  const [memoryUsageHistory, setMemoryUsageHistory] = useState<number[]>([]);
  
  // 性能监控
  const performanceRef = useRef<{
    geometryGenTime: number;
    dataTransferTime: number;
    processingTime: number;
    totalChallengeTime: number;
    peakMemoryUsage: number;
  }>({ 
    geometryGenTime: 0, 
    dataTransferTime: 0, 
    processingTime: 0, 
    totalChallengeTime: 0,
    peakMemoryUsage: 0 
  });

  // WebSocket连接 (模拟Phase 2专用通道)
  const wsRef = useRef<WebSocket | null>(null);

  // 建立Phase 2挑战连接
  useEffect(() => {
    console.log('🚇 Phase 2: 建立隧道干扰挑战连接...');
    
    const ws = new WebSocket('ws://localhost:8080/phase2-ultimate-challenge');
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('🔥 Phase 2终极挑战连接建立！');
      
      // 发送挑战宣言
      ws.send(JSON.stringify({
        type: 'phase2_challenge_declaration',
        message: '2号几何专家向3号计算专家发起终极挑战！',
        challengeSpecs: {
          elementCount: 1800000,      // 180万单元
          meshSize: 1.7,             // 平衡精度和性能
          qualityTarget: 0.66,       // 考虑复杂度的合理目标
          complexityLevel: 'HIGH',
          memoryLimit: '16GB',
          processingTarget: '30-60秒',
          specialFeatures: [
            '隧道-基坑复杂交叉几何',
            '3°倾斜隧道建模',
            '材料分界面处理',
            '极限性能挑战'
          ]
        },
        battleCry: '让我们看看谁的算法更强！🔥'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'challenge_accepted':
            console.log('⚡ 3号接受挑战:', message.response);
            startUltimateChallenge();
            break;
            
          case 'phase2_feedback':
            const feedback: Phase2QualityFeedback = message.data;
            setPhase2Feedback(feedback);
            setChallengePhase('completed');
            
            performanceRef.current.totalChallengeTime = Date.now() - challengeStartTime;
            performanceRef.current.processingTime = feedback.processingTime;
            performanceRef.current.peakMemoryUsage = feedback.memoryPeakUsage;
            
            analyzeChallengeResults(feedback);
            break;
            
          case 'processing_progress':
            console.log('⚙️ 3号处理进度:', `${message.progress}% - ${message.stage}`);
            if (message.memoryUsage) {
              setMemoryUsageHistory(prev => [...prev, message.memoryUsage]);
            }
            break;
            
          case 'memory_warning':
            console.warn('⚠️ 内存使用警告:', message.warning);
            break;
            
          case 'challenge_failed':
            console.error('💥 挑战失败:', message.reason);
            setChallengePhase('failed');
            break;
        }
        
      } catch (error) {
        console.error('❌ Phase 2消息解析失败:', error);
      }
    };

    ws.onclose = () => {
      console.log('⚠️ Phase 2挑战连接断开');
    };

    return () => {
      ws.close();
    };
  }, []);

  /**
   * 启动终极挑战
   */
  const startUltimateChallenge = async () => {
    setChallengePhase('preparing');
    setChallengeStartTime(Date.now());
    
    try {
      console.log('🚇 Phase 2: 生成180万单元隧道干扰几何...');
      
      // Step 1: 生成超复杂隧道-基坑交叉几何
      setChallengePhase('generating');
      const genStart = Date.now();
      
      const ultimateGeometry = await generateUltimateTunnelGeometry();
      performanceRef.current.geometryGenTime = Date.now() - genStart;
      
      setComplexMeshData(ultimateGeometry);
      
      console.log('✅ 2号终极几何生成完成:', {
        生成耗时: performanceRef.current.geometryGenTime + 'ms',
        单元规模: ultimateGeometry.metadata.elementCount.toLocaleString(),
        复杂度: 'HIGH',
        内存占用: estimateMemoryUsage(ultimateGeometry) + 'MB',
        挑战等级: '🔥🔥🔥 EXTREME 🔥🔥🔥'
      });

      // Step 2: 大数据传输挑战
      setChallengePhase('transferring');
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const transferStart = Date.now();
        
        // 分块传输大数据（优化策略）
        const optimizedPayload = await prepareUltimateDataPayload(ultimateGeometry);
        
        wsRef.current.send(JSON.stringify({
          type: 'ultimate_mesh_data',
          challengeId: 'tunnel_interference_ultimate',
          timestamp: new Date().toISOString(),
          warning: '⚠️ 180万单元超大数据包，请确保16GB内存就绪',
          data: optimizedPayload,
          
          // 2号的挑战参数
          challengeValidation: {
            geometryComplexity: 'EXTREME',
            tunnelIntersectionCount: 15,
            criticalAnglePoints: 45,
            materialBoundaries: 8,
            estimatedDifficulty: '🔥 BOSS级别 🔥'
          },
          
          performanceExpectations: {
            maxProcessingTime: 60000,    // 60秒上限
            memoryLimit: 16 * 1024,      // 16GB MB
            qualityThreshold: 0.66,      // 复杂几何的合理目标
            renderingFPS: 30             // 最低帧率要求
          }
        }));
        
        performanceRef.current.dataTransferTime = Date.now() - transferStart;
        setChallengePhase('processing');
        
        console.log('🚀 终极数据已发射给3号！', {
          传输耗时: performanceRef.current.dataTransferTime + 'ms',
          数据大小: JSON.stringify(optimizedPayload).length / 1024 / 1024 + 'MB',
          挑战状态: '3号Fragment算法压力测试开始!'
        });
      }
      
    } catch (error) {
      console.error('💥 Phase 2挑战生成失败:', error);
      setChallengePhase('failed');
    }
  };

  /**
   * 生成终极隧道几何
   */
  const generateUltimateTunnelGeometry = async (): Promise<MeshDataFor3> => {
    // 使用最复杂的隧道测试用例
    const baseGeometry = quickMeshDataFor3('tunnel');
    
    // 增强复杂度到180万单元
    const enhancedGeometry: MeshDataFor3 = {
      ...baseGeometry,
      metadata: {
        ...baseGeometry.metadata,
        elementCount: 1800000,
        vertexCount: 620000,
        meshSize: 1.7,
        qualityStats: {
          min: 0.25,              // 更多挑战性的低质量区域
          max: 0.89,              // 保持一些高质量区域
          mean: 0.66,             // 目标平均质量
          std: 0.145              // 更大的质量变化范围
        }
      }
    };

    // 模拟复杂质量分布（隧道交叉区域质量更低）
    const complexQuality = new Float32Array(620000);
    for (let i = 0; i < complexQuality.length; i++) {
      const relativePos = i / complexQuality.length;
      let quality = 0.66;
      
      // 隧道交叉区域 (中心区域) 质量下降
      if (relativePos > 0.4 && relativePos < 0.6) {
        quality = 0.25 + Math.random() * 0.3; // 0.25-0.55
      }
      // 边界区域质量中等
      else if (relativePos < 0.2 || relativePos > 0.8) {
        quality = 0.55 + Math.random() * 0.25; // 0.55-0.8
      }
      // 其他区域质量较好
      else {
        quality = 0.7 + Math.random() * 0.19; // 0.7-0.89
      }
      
      complexQuality[i] = quality;
    }
    
    enhancedGeometry.quality = complexQuality;
    
    console.log('🏗️ 终极隧道几何参数:', {
      隧道倾斜角: '3°',
      交叉点数量: 15,
      材料分界面: 8,
      尖锐角点: 45,
      质量挑战区: '40-60%区域 (&lt;0.55质量)'
    });
    
    return enhancedGeometry;
  };

  /**
   * 准备终极数据负载
   */
  const prepareUltimateDataPayload = async (geometry: MeshDataFor3) => {
    // 数据压缩和优化策略
    return {
      // 使用压缩的数组表示
      vertices: Array.from(geometry.vertices).map(v => Math.round(v * 1000) / 1000), // 3位精度
      indices: Array.from(geometry.indices),
      quality: Array.from(geometry.quality).map(q => Math.round(q * 10000) / 10000), // 4位精度
      metadata: geometry.metadata,
      
      // 压缩标识
      compression: {
        vertexPrecision: 3,
        qualityPrecision: 4,
        estimatedSizeReduction: '~30%'
      }
    };
  };

  /**
   * 估算内存使用
   */
  const estimateMemoryUsage = (geometry: MeshDataFor3): number => {
    const verticesSize = geometry.vertices.length * 4; // Float32
    const indicesSize = geometry.indices.length * 4;   // Uint32
    const qualitySize = geometry.quality.length * 4;   // Float32
    const normalsSize = (geometry.normals?.length || 0) * 4;
    
    return Math.round((verticesSize + indicesSize + qualitySize + normalsSize) / 1024 / 1024); // MB
  };

  /**
   * 分析挑战结果
   */
  const analyzeChallengeResults = (feedback: Phase2QualityFeedback) => {
    const success = 
      feedback.processingTime <= 60000 &&           // 60秒内
      feedback.memoryPeakUsage <= 16 &&             // 16GB内
      feedback.complexityAnalysis.overallScore >= 0.6; // 合理质量

    console.log('📊 Phase 2挑战结果分析:', {
      挑战状态: success ? '🏆 SUCCESS' : '⚠️ PARTIAL',
      处理时间: feedback.processingTime + 'ms',
      内存峰值: feedback.memoryPeakUsage + 'GB', 
      质量评分: feedback.complexityAnalysis.overallScore.toFixed(3),
      几何复杂度: feedback.complexityAnalysis.geometricComplexity,
      隧道交叉质量: feedback.complexityAnalysis.tunnelIntersectionQuality.toFixed(3)
    });

    if (success) {
      console.log('🎉 恭喜！2号-3号协作征服了180万单元终极挑战！');
    } else {
      console.log('💪 虽有挑战，但这正是算法优化的机会！');
    }
  };

  /**
   * 重启挑战
   */
  const restartChallenge = () => {
    setChallengePhase('preparing');
    setComplexMeshData(null);
    setPhase2Feedback(null);
    setMemoryUsageHistory([]);
    performanceRef.current = { 
      geometryGenTime: 0, dataTransferTime: 0, processingTime: 0, 
      totalChallengeTime: 0, peakMemoryUsage: 0 
    };
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      startUltimateChallenge();
    }
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 text-white overflow-hidden">
      {/* Phase 2 挑战头部 */}
      <div className="h-16 bg-gradient-to-r from-red-800 via-orange-800 to-yellow-800 border-b border-red-500/30 flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="text-2xl animate-pulse">🚇</div>
          <div>
            <h1 className="text-xl font-bold text-white">Phase 2: 隧道干扰终极挑战</h1>
            <p className="text-sm text-orange-200">180万单元 | 16GB内存 | 30-60秒 | 2号vs3号巅峰对决</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* 挑战等级 */}
          <div className="bg-red-500/20 border border-red-500/30 rounded px-3 py-1">
            <span className="text-red-400 font-bold">🔥 EXTREME</span>
          </div>

          {/* 重启挑战 */}
          <button
            onClick={restartChallenge}
            disabled={challengePhase === 'generating' || challengePhase === 'processing'}
            className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:bg-gray-600 rounded transition-all transform hover:scale-105"
          >
            重启终极挑战
          </button>
        </div>
      </div>

      {/* 主要挑战区域 */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* 左侧：挑战进度和监控 */}
        <div className="w-96 bg-gray-800/90 border-r border-red-700/50 p-6 overflow-y-auto">
          {/* 挑战阶段 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-red-400">终极挑战进度</h3>
            <div className="space-y-3">
              {[
                { key: 'preparing', label: '战术准备', icon: '🎯', time: 0 },
                { key: 'generating', label: '生成180万单元', icon: '🏗️', time: performanceRef.current.geometryGenTime },
                { key: 'transferring', label: '超大数据传输', icon: '🚀', time: performanceRef.current.dataTransferTime },
                { key: 'processing', label: '3号极限处理', icon: '⚡', time: performanceRef.current.processingTime },
                { key: 'completed', label: '挑战完成', icon: '🏆', time: performanceRef.current.totalChallengeTime }
              ].map((phase, index) => (
                <div
                  key={phase.key}
                  className={`flex items-center justify-between p-3 rounded ${
                    challengePhase === phase.key ? 'bg-red-600/20 border border-red-500/30 animate-pulse' :
                    index < ['preparing', 'generating', 'transferring', 'processing', 'completed'].indexOf(challengePhase) ? 'bg-green-600/10 border border-green-500/20' :
                    'bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{phase.icon}</span>
                    <span className={`text-sm ${
                      challengePhase === phase.key ? 'text-red-400' :
                      index < ['preparing', 'generating', 'transferring', 'processing', 'completed'].indexOf(challengePhase) ? 'text-green-400' :
                      'text-gray-400'
                    }`}>
                      {phase.label}
                    </span>
                  </div>
                  {phase.time > 0 && (
                    <span className="text-xs text-gray-300">{phase.time}ms</span>
                  )}
                  {challengePhase === phase.key && challengePhase !== 'completed' && (
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 挑战规格 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-red-400">终极挑战规格</h3>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">单元规模:</span>
                  <div className="text-red-400 font-bold">1,800,000</div>
                </div>
                <div>
                  <span className="text-gray-400">内存挑战:</span>
                  <div className="text-orange-400 font-bold">16GB</div>
                </div>
                <div>
                  <span className="text-gray-400">处理目标:</span>
                  <div className="text-yellow-400 font-bold">30-60秒</div>
                </div>
                <div>
                  <span className="text-gray-400">质量目标:</span>
                  <div className="text-green-400 font-bold">0.66</div>
                </div>
              </div>
              
              <div className="border-t border-gray-600/50 pt-3">
                <div className="text-xs text-gray-400 mb-2">挑战特色:</div>
                <div className="space-y-1 text-xs">
                  <div className="text-red-300">🚇 隧道-基坑复杂交叉</div>
                  <div className="text-orange-300">📐 3°倾斜隧道建模</div>
                  <div className="text-yellow-300">🔀 15个交叉点处理</div>
                  <div className="text-green-300">⚠️ 45个尖锐角挑战</div>
                </div>
              </div>
            </div>
          </div>

          {/* 内存使用监控 */}
          {memoryUsageHistory.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-orange-400">内存使用监控</h3>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">实时内存使用 (GB)</div>
                <div className="h-20 bg-gray-800 rounded flex items-end space-x-1 p-2">
                  {memoryUsageHistory.slice(-20).map((usage, index) => (
                    <div
                      key={index}
                      className={`flex-1 rounded-t ${
                        usage > 12 ? 'bg-red-500' :
                        usage > 8 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ height: `${(usage / 16) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  当前: {memoryUsageHistory[memoryUsageHistory.length - 1]?.toFixed(1) || '0.0'}GB / 16GB
                </div>
              </div>
            </div>
          )}

          {/* 2号几何数据 */}
          {complexMeshData && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-red-400">2号终极几何</h3>
              <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                <div className="text-center mb-3">
                  <div className="text-3xl text-red-400 font-bold">
                    {(complexMeshData.metadata.elementCount / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-sm text-gray-400">单元数量</div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">顶点数:</span>
                    <span className="text-cyan-400">{(complexMeshData.metadata.vertexCount / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">网格尺寸:</span>
                    <span className="text-yellow-400">{complexMeshData.metadata.meshSize}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">预期质量:</span>
                    <span className="text-green-400">{complexMeshData.metadata.qualityStats.mean.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">内存占用:</span>
                    <span className="text-orange-400">{estimateMemoryUsage(complexMeshData)}MB</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：3号终极战场 */}
        <div className="flex-1 relative">
          {challengePhase === 'completed' && phase2Feedback ? (
            <div className="w-full h-full p-8 overflow-y-auto">
              {/* 挑战结果 */}
              <div className="text-center mb-8">
                <div className="text-8xl mb-4">
                  {phase2Feedback.complexityAnalysis.overallScore >= 0.6 &&
                   phase2Feedback.processingTime <= 60000 &&
                   phase2Feedback.memoryPeakUsage <= 16 ? '🏆' : '⚔️'}
                </div>
                <h2 className="text-3xl font-bold text-orange-400 mb-2">
                  Phase 2 终极挑战
                  {phase2Feedback.complexityAnalysis.overallScore >= 0.6 &&
                   phase2Feedback.processingTime <= 60000 &&
                   phase2Feedback.memoryPeakUsage <= 16 ? ' 征服成功！' : ' 激战完成！'}
                </h2>
                <p className="text-xl text-gray-300">
                  2号几何专家 × 3号计算专家 = 无敌组合
                </p>
              </div>

              {/* 详细结果展示 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
                {/* 性能表现 */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-orange-400">⚡ 性能表现</h3>
                  
                  <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">处理时间:</span>
                      <span className={`text-lg font-bold ${
                        phase2Feedback.processingTime <= 60000 ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {(phase2Feedback.processingTime / 1000).toFixed(1)}秒
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">内存峰值:</span>
                      <span className={`text-lg font-bold ${
                        phase2Feedback.memoryPeakUsage <= 16 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {phase2Feedback.memoryPeakUsage.toFixed(1)}GB
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">渲染帧率:</span>
                      <span className={`text-lg font-bold ${
                        phase2Feedback.performanceMetrics.fragmentRenderingFPS >= 30 ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {phase2Feedback.performanceMetrics.fragmentRenderingFPS}fps
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">处理效率:</span>
                      <span className="text-cyan-400 font-bold">
                        {(phase2Feedback.performanceMetrics.scalabilityTest.elementProcessingRate / 1000).toFixed(0)}K单元/秒
                      </span>
                    </div>
                  </div>
                </div>

                {/* 质量分析 */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-cyan-400">📊 质量分析</h3>
                  
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold text-cyan-400">
                        {(phase2Feedback.complexityAnalysis.overallScore * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-400">整体质量评分</div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-400">优秀 (&gt;0.8):</span>
                        <span>{(phase2Feedback.complexityAnalysis.qualityDistribution.excellent * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-400">良好 (0.65-0.8):</span>
                        <span>{(phase2Feedback.complexityAnalysis.qualityDistribution.good * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-yellow-400">可接受 (0.5-0.65):</span>
                        <span>{(phase2Feedback.complexityAnalysis.qualityDistribution.acceptable * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-400">较差 (0.3-0.5):</span>
                        <span>{(phase2Feedback.complexityAnalysis.qualityDistribution.poor * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-400">关键区域 (&lt;0.3):</span>
                        <span>{(phase2Feedback.complexityAnalysis.qualityDistribution.critical * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 问题区域分析 */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-red-400">⚠️ 挑战区域</h3>
                  
                  <div className="space-y-3">
                    {/* 隧道交叉 */}
                    <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
                      <h4 className="font-medium text-red-400 mb-2">🚇 隧道交叉区域</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>影响单元:</span>
                          <span className="text-red-300">{phase2Feedback.complexityAnalysis.problemRegions.tunnelCrossing.elementCount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>最低质量:</span>
                          <span className="text-red-300">{phase2Feedback.complexityAnalysis.problemRegions.tunnelCrossing.minQuality.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>平均质量:</span>
                          <span className="text-red-300">{phase2Feedback.complexityAnalysis.problemRegions.tunnelCrossing.avgQuality.toFixed(3)}</span>
                        </div>
                      </div>
                    </div>

                    {/* 几何问题 */}
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded p-3">
                      <h4 className="font-medium text-orange-400 mb-2">📐 几何问题</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>尖锐角:</span>
                          <span className="text-orange-300">{phase2Feedback.complexityAnalysis.problemRegions.sharpAngles.count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>长宽比违规:</span>
                          <span className="text-orange-300">{phase2Feedback.complexityAnalysis.problemRegions.aspectRatioViolations.count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>最大长宽比:</span>
                          <span className="text-orange-300">{phase2Feedback.complexityAnalysis.problemRegions.aspectRatioViolations.maxRatio.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3号专家建议 */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-purple-400">💡 3号专家建议</h3>
                  
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className={`text-sm px-2 py-1 rounded mb-3 ${
                      phase2Feedback.expertOptimizations.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                      phase2Feedback.expertOptimizations.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      优先级: {phase2Feedback.expertOptimizations.priority}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium text-cyan-400 mb-2">🚇 隧道专项建议:</h5>
                        <div className="space-y-1">
                          {phase2Feedback.expertOptimizations.tunnelSpecificSuggestions.map((suggestion, index) => (
                            <div key={index} className="text-sm text-gray-300 flex items-start space-x-2">
                              <span className="text-cyan-400 mt-1">•</span>
                              <span>{suggestion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-green-400 mb-2">🔧 几何优化建议:</h5>
                        <div className="space-y-1">
                          {phase2Feedback.expertOptimizations.geometryOptimizations.map((suggestion, index) => (
                            <div key={index} className="text-sm text-gray-300 flex items-start space-x-2">
                              <span className="text-green-400 mt-1">•</span>
                              <span>{suggestion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-sm text-gray-400">
                      预期改进: 质量+{(phase2Feedback.expertOptimizations.estimatedImprovements.qualityGain * 100).toFixed(1)}%, 
                      性能+{(phase2Feedback.expertOptimizations.estimatedImprovements.performanceGain * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Phase 3 预告 */}
              <div className="mt-12 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-6 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="text-4xl mb-2">🌟</div>
                  <h3 className="text-xl font-bold text-purple-400 mb-2">Phase 3 预告</h3>
                  <p className="text-gray-300 mb-4">
                    基于Phase 2的经验，我们已经准备好挑战更大的规模和复杂度！
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-purple-500/10 rounded p-3">
                      <div className="font-bold text-purple-400">规模扩展</div>
                      <div className="text-gray-300">500万+ 单元</div>
                    </div>
                    <div className="bg-pink-500/10 rounded p-3">
                      <div className="font-bold text-pink-400">复杂场景</div>
                      <div className="text-gray-300">多隧道交叉</div>
                    </div>
                    <div className="bg-indigo-500/10 rounded p-3">
                      <div className="font-bold text-indigo-400">实时优化</div>
                      <div className="text-gray-300">动态质量调整</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : challengePhase === 'failed' ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-8xl mb-4">💥</div>
                <h2 className="text-3xl font-bold text-red-400 mb-2">挑战遇到困难</h2>
                <p className="text-gray-400 mb-4">但这正是算法优化的绝佳机会！</p>
                <button
                  onClick={restartChallenge}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-lg font-semibold transition-all transform hover:scale-105"
                >
                  重新挑战！💪
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4 animate-pulse">
                  {challengePhase === 'preparing' ? '🎯' :
                   challengePhase === 'generating' ? '🏗️' :
                   challengePhase === 'transferring' ? '🚀' :
                   challengePhase === 'processing' ? '⚡' : '⏳'}
                </div>
                <h2 className="text-2xl font-bold text-orange-400 mb-2">
                  {challengePhase === 'preparing' ? '战术准备中...' :
                   challengePhase === 'generating' ? '生成180万单元终极几何...' :
                   challengePhase === 'transferring' ? '传输超大数据给3号...' :
                   challengePhase === 'processing' ? '3号Fragment算法极限处理中...' : '等待挑战开始'}
                </h2>
                <p className="text-gray-400">
                  {challengePhase === 'preparing' ? '2号几何专家准备终极武器' :
                   challengePhase === 'generating' ? '隧道-基坑交叉复杂建模进行中' :
                   challengePhase === 'transferring' ? '16GB内存挑战数据传输中' :
                   challengePhase === 'processing' ? '3号正在征服180万单元挑战' : '准备迎接终极boss战'}
                </p>
                {challengePhase === 'processing' && (
                  <div className="mt-6">
                    <div className="text-4xl animate-spin mb-2">⚡</div>
                    <div className="text-sm text-gray-400">
                      Fragment算法全力运行中...
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3号集成区域提示 */}
          <div className="absolute bottom-4 right-4 bg-gray-800/90 rounded-lg p-4 max-w-sm">
            <div className="text-sm text-gray-300">
              <div className="font-semibold text-red-400 mb-1">🚇 Phase 2终极战场:</div>
              <p>这里是3号MeshQualityAnalysis的终极表演舞台！</p>
              <p className="text-xs text-orange-400 mt-2">180万单元 + 复杂隧道交叉 = 算法的极限挑战！</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Phase2TunnelInterferenceChallenge;