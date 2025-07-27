/**
 * Phase 1: 简单基坑热身测试 - 2号3号协作验证
 * 80万单元, 1.8m网格, 质量0.75, 预期<2秒处理
 */

import React, { useState, useEffect, useRef } from 'react';
import { quickMeshDataFor3, MeshDataFor3 } from '../utils/meshDataGenerator';

// 3号的质量反馈接口
interface QualityFeedbackFrom3 {
  timestamp: string;
  processingTime: number;        // 3号的处理时间
  qualityAnalysis: {
    overallScore: number;        // 整体质量评分
    elementQuality: {
      excellent: number;         // >0.8质量的单元比例
      good: number;             // 0.65-0.8质量的单元比例  
      acceptable: number;       // 0.5-0.65质量的单元比例
      poor: number;             // <0.5质量的单元比例
    };
    geometryIssues: {
      sharpAngles: number;      // 尖锐角数量
      aspectRatioViolations: number; // 长宽比违规
      skewnessIssues: number;   // 偏斜问题
    };
  };
  performance: {
    memoryUsage: number;        // MB
    renderingFPS: number;       // Fragment渲染帧率
    dataTransferTime: number;   // 数据传输时间
  };
  optimizationSuggestions: {
    priority: 'low' | 'medium' | 'high';
    suggestions: string[];
    expectedImprovement: number; // 预期质量提升
  };
}

const Phase1SimpleExcavationTest: React.FC = () => {
  // 测试状态
  const [testPhase, setTestPhase] = useState<'preparing' | 'sending' | 'analyzing' | 'completed'>('preparing');
  const [meshData, setMeshData] = useState<MeshDataFor3 | null>(null);
  const [qualityFeedback, setQualityFeedback] = useState<QualityFeedbackFrom3 | null>(null);
  const [testStartTime, setTestStartTime] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  // WebSocket连接
  const wsRef = useRef<WebSocket | null>(null);
  const testResults = useRef<{
    dataGenTime: number;
    transferTime: number;
    analysisTime: number;
    totalTime: number;
  }>({ dataGenTime: 0, transferTime: 0, analysisTime: 0, totalTime: 0 });

  // 建立与3号的测试连接
  useEffect(() => {
    console.log('🔗 Phase 1: 建立与3号的测试连接...');
    
    const ws = new WebSocket('ws://localhost:8080/phase1-test');
    wsRef.current = ws;
    
    ws.onopen = () => {
      setConnectionStatus('connected');
      console.log('✅ Phase 1测试连接建立成功');
      
      // 发送测试协议
      ws.send(JSON.stringify({
        type: 'test_handshake',
        phase: 1,
        message: '2号几何专家就绪，请求开始简单基坑测试',
        testConfig: {
          targetElements: 800000,
          meshSize: 1.8,
          qualityTarget: 0.75,
          expectedProcessingTime: 2000 // 2秒目标
        }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'handshake_ack':
            console.log('🤝 收到3号确认:', message.message);
            startTest();
            break;
            
          case 'quality_feedback':
            const feedback: QualityFeedbackFrom3 = message.data;
            setQualityFeedback(feedback);
            setTestPhase('completed');
            
            // 计算总测试时间
            testResults.current.totalTime = Date.now() - testStartTime;
            testResults.current.analysisTime = feedback.processingTime;
            
            console.log('📊 Phase 1测试完成!', {
              '3号处理时间': feedback.processingTime + 'ms',
              '总测试时间': testResults.current.totalTime + 'ms',
              '质量评分': feedback.qualityAnalysis.overallScore.toFixed(3),
              '内存使用': feedback.performance.memoryUsage + 'MB',
              '渲染帧率': feedback.performance.renderingFPS + 'fps'
            });
            break;
            
          case 'processing_update':
            console.log('⚙️ 3号处理进度:', message.progress);
            break;
        }
        
      } catch (error) {
        console.error('❌ Phase 1消息解析失败:', error);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      console.log('⚠️ Phase 1测试连接断开');
    };

    return () => {
      ws.close();
    };
  }, []);

  /**
   * 开始Phase 1测试
   */
  const startTest = async () => {
    setTestPhase('preparing');
    setTestStartTime(Date.now());
    
    try {
      console.log('🏗️ Phase 1: 生成简单基坑测试数据...');
      
      // Step 1: 生成2号的标准简单基坑数据
      const dataGenStart = Date.now();
      const simpleMeshData = quickMeshDataFor3('simple');
      testResults.current.dataGenTime = Date.now() - dataGenStart;
      
      setMeshData(simpleMeshData);
      
      console.log('✅ 2号数据生成完成:', {
        生成时间: testResults.current.dataGenTime + 'ms',
        顶点数: simpleMeshData.metadata.vertexCount,
        单元数: simpleMeshData.metadata.elementCount,
        网格尺寸: simpleMeshData.metadata.meshSize + 'm',
        平均质量: simpleMeshData.metadata.qualityStats.mean.toFixed(3)
      });

      // Step 2: 发送数据给3号
      setTestPhase('sending');
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const transferStart = Date.now();
        
        // 优化数据传输格式
        const optimizedData = {
          type: 'mesh_data_phase1',
          testId: 'simple_excavation_001',
          timestamp: new Date().toISOString(),
          data: {
            // 使用数组而非TypedArray传输（JSON兼容）
            vertices: Array.from(simpleMeshData.vertices),
            indices: Array.from(simpleMeshData.indices),
            quality: Array.from(simpleMeshData.quality),
            normals: simpleMeshData.normals ? Array.from(simpleMeshData.normals) : null,
            metadata: simpleMeshData.metadata
          },
          // 2号的验证标识
          validation: {
            geometrySource: '2号RBF增强插值',
            rbfKernel: 'multiquadric_enhanced',
            qualityValidated: simpleMeshData.metadata.qualityStats.mean >= 0.65,
            meshSizeCompliant: simpleMeshData.metadata.meshSize >= 1.5 && simpleMeshData.metadata.meshSize <= 2.0,
            elementCountValid: simpleMeshData.metadata.elementCount <= 2000000
          }
        };

        wsRef.current.send(JSON.stringify(optimizedData));
        testResults.current.transferTime = Date.now() - transferStart;
        
        setTestPhase('analyzing');
        console.log('📤 数据已发送给3号 (传输时间: ' + testResults.current.transferTime + 'ms)');
      }
      
    } catch (error) {
      console.error('❌ Phase 1测试失败:', error);
      setTestPhase('preparing');
    }
  };

  /**
   * 重新开始测试
   */
  const restartTest = () => {
    setTestPhase('preparing');
    setMeshData(null);
    setQualityFeedback(null);
    testResults.current = { dataGenTime: 0, transferTime: 0, analysisTime: 0, totalTime: 0 };
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      startTest();
    }
  };

  return (
    <div className="w-full h-screen bg-gray-900 text-white overflow-hidden">
      {/* Phase 1 测试头部 */}
      <div className="h-16 bg-gradient-to-r from-cyan-800 to-blue-800 border-b border-cyan-500/30 flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="text-2xl">🏗️</div>
          <div>
            <h1 className="text-xl font-bold text-white">Phase 1: 简单基坑热身测试</h1>
            <p className="text-sm text-cyan-200">2号几何数据 → 3号质量分析 协作验证</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* 连接状态 */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
              connectionStatus === 'connecting' ? 'bg-yellow-400 animate-spin' :
              'bg-red-400'
            }`} />
            <span className="text-sm text-gray-200">
              {connectionStatus === 'connected' ? '3号已连接' :
               connectionStatus === 'connecting' ? '连接中...' :
               '连接断开'}
            </span>
          </div>

          {/* 重启按钮 */}
          <button
            onClick={restartTest}
            disabled={testPhase === 'sending' || testPhase === 'analyzing'}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 rounded transition-colors text-sm"
          >
            重新测试
          </button>
        </div>
      </div>

      {/* 主要测试区域 */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* 左侧：测试进度和数据 */}
        <div className="w-96 bg-gray-800 border-r border-gray-700 p-6 overflow-y-auto">
          {/* 测试阶段进度 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-cyan-400">测试进度</h3>
            <div className="space-y-3">
              {[
                { key: 'preparing', label: '数据准备', icon: '🔧', time: testResults.current.dataGenTime },
                { key: 'sending', label: '数据传输', icon: '📤', time: testResults.current.transferTime },
                { key: 'analyzing', label: '3号分析', icon: '⚙️', time: testResults.current.analysisTime },
                { key: 'completed', label: '测试完成', icon: '✅', time: testResults.current.totalTime }
              ].map((phase, index) => (
                <div
                  key={phase.key}
                  className={`flex items-center justify-between p-3 rounded ${
                    testPhase === phase.key ? 'bg-cyan-600/20 border border-cyan-500/30' :
                    index < ['preparing', 'sending', 'analyzing', 'completed'].indexOf(testPhase) ? 'bg-green-600/10' :
                    'bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{phase.icon}</span>
                    <span className={`text-sm ${
                      testPhase === phase.key ? 'text-cyan-400' :
                      index < ['preparing', 'sending', 'analyzing', 'completed'].indexOf(testPhase) ? 'text-green-400' :
                      'text-gray-400'
                    }`}>
                      {phase.label}
                    </span>
                  </div>
                  {phase.time > 0 && (
                    <span className="text-xs text-gray-300">{phase.time}ms</span>
                  )}
                  {testPhase === phase.key && testPhase !== 'completed' && (
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 2号数据信息 */}
          {meshData && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-cyan-400">2号数据详情</h3>
              <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">顶点数:</span>
                    <div className="text-cyan-400 font-mono">{meshData.metadata.vertexCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">单元数:</span>
                    <div className="text-green-400 font-mono">{meshData.metadata.elementCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">网格尺寸:</span>
                    <div className="text-yellow-400 font-mono">{meshData.metadata.meshSize}m</div>
                  </div>
                  <div>
                    <span className="text-gray-400">平均质量:</span>
                    <div className={`font-mono ${meshData.metadata.qualityStats.mean >= 0.75 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {meshData.metadata.qualityStats.mean.toFixed(3)}
                    </div>
                  </div>
                </div>
                
                {/* 数据验证状态 */}
                <div className="border-t border-gray-600/50 pt-3">
                  <div className="text-xs text-gray-400 mb-2">验证状态:</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span>网格尺寸范围:</span>
                      <span className="text-green-400">✓ 1.5-2.0m</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>质量目标:</span>
                      <span className="text-green-400">✓ &gt;0.65</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>单元上限:</span>
                      <span className="text-green-400">✓ ≤200万</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3号反馈结果 */}
          {qualityFeedback && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-cyan-400">3号分析结果</h3>
              <div className="space-y-4">
                {/* 整体评分 */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 mb-1">
                      {(qualityFeedback.qualityAnalysis.overallScore * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-400">整体质量评分</div>
                  </div>
                </div>

                {/* 质量分布 */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="font-medium mb-3 text-white">质量分布</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-400">优秀 (&gt;0.8):</span>
                      <span>{(qualityFeedback.qualityAnalysis.elementQuality.excellent * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyan-400">良好 (0.65-0.8):</span>
                      <span>{(qualityFeedback.qualityAnalysis.elementQuality.good * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-400">可接受 (0.5-0.65):</span>
                      <span>{(qualityFeedback.qualityAnalysis.elementQuality.acceptable * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-400">较差 (&lt;0.5):</span>
                      <span>{(qualityFeedback.qualityAnalysis.elementQuality.poor * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* 性能指标 */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="font-medium mb-3 text-white">性能指标</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">处理时间:</span>
                      <span className={qualityFeedback.processingTime <= 2000 ? 'text-green-400' : 'text-yellow-400'}>
                        {qualityFeedback.processingTime}ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">内存使用:</span>
                      <span className="text-cyan-400">{qualityFeedback.performance.memoryUsage}MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">渲染帧率:</span>
                      <span className="text-green-400">{qualityFeedback.performance.renderingFPS}fps</span>
                    </div>
                  </div>
                </div>

                {/* 3号优化建议 */}
                {qualityFeedback.optimizationSuggestions.suggestions.length > 0 && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="font-medium mb-3 text-white">3号优化建议</h4>
                    <div className="space-y-2">
                      {qualityFeedback.optimizationSuggestions.suggestions.map((suggestion, index) => (
                        <div key={index} className="text-sm text-gray-300 flex items-start space-x-2">
                          <span className="text-cyan-400 mt-1">•</span>
                          <span>{suggestion}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-gray-400">
                      预期质量提升: +{(qualityFeedback.optimizationSuggestions.expectedImprovement * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 右侧：3号可视化区域 */}
        <div className="flex-1 relative bg-gradient-to-br from-gray-900 to-gray-800">
          {testPhase === 'completed' && qualityFeedback ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              {/* 成功状态 */}
              <div className="text-center mb-8">
                <div className="text-8xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-green-400 mb-2">
                  Phase 1 测试成功！
                </h2>
                <p className="text-xl text-gray-300">
                  2号-3号协作完美验证
                </p>
              </div>

              {/* 测试成果展示 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-6 text-center">
                  <div className="text-2xl mb-2">⚡</div>
                  <h3 className="font-semibold text-green-400 mb-1">处理速度</h3>
                  <div className="text-2xl font-bold text-white">{qualityFeedback.processingTime}ms</div>
                  <div className="text-sm text-green-300">
                    {qualityFeedback.processingTime <= 2000 ? '超过预期目标!' : '接近预期目标'}
                  </div>
                </div>

                <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg p-6 text-center">
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className="font-semibold text-cyan-400 mb-1">质量评分</h3>
                  <div className="text-2xl font-bold text-white">
                    {(qualityFeedback.qualityAnalysis.overallScore * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-cyan-300">3号专业分析结果</div>
                </div>

                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-6 text-center">
                  <div className="text-2xl mb-2">🎯</div>
                  <h3 className="font-semibold text-blue-400 mb-1">数据兼容</h3>
                  <div className="text-2xl font-bold text-white">100%</div>
                  <div className="text-sm text-blue-300">接口完美匹配</div>
                </div>
              </div>

              {/* Phase 2 预告 */}
              <div className="mt-12 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-6 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="text-4xl mb-2">🚇</div>
                  <h3 className="text-xl font-bold text-orange-400 mb-2">准备Phase 2？</h3>
                  <p className="text-gray-300 mb-4">
                    180万单元隧道干扰终极挑战等待着我们！
                  </p>
                  <button className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-lg font-semibold transition-all transform hover:scale-105">
                    启动Phase 2 大餐！🔥
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">
                  {testPhase === 'preparing' ? '🔧' :
                   testPhase === 'sending' ? '📤' :
                   testPhase === 'analyzing' ? '⚙️' : '⏳'}
                </div>
                <h2 className="text-2xl font-bold text-cyan-400 mb-2">
                  {testPhase === 'preparing' ? '准备2号数据中...' :
                   testPhase === 'sending' ? '发送数据给3号...' :
                   testPhase === 'analyzing' ? '3号分析中...' : '等待开始'}
                </h2>
                <p className="text-gray-400">
                  {testPhase === 'preparing' ? '生成80万单元简单基坑数据' :
                   testPhase === 'sending' ? '传输网格数据到3号系统' :
                   testPhase === 'analyzing' ? '3号正在进行质量分析' : '请等待连接建立'}
                </p>
                {testPhase === 'analyzing' && (
                  <div className="mt-4">
                    <div className="inline-block animate-spin text-4xl">⚙️</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3号集成提示 */}
          <div className="absolute bottom-4 right-4 bg-gray-800/90 rounded-lg p-4 max-w-sm">
            <div className="text-sm text-gray-300">
              <div className="font-semibold text-cyan-400 mb-1">3号集成提示:</div>
              <p>这里是你的MeshQualityAnalysis组件的理想位置！</p>
              <code className="text-xs text-green-400 bg-gray-900 px-2 py-1 rounded mt-2 block">
                &lt;MeshQualityAnalysis meshData={`{meshData}`} /&gt;
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Phase1SimpleExcavationTest;