/**
 * 2号-3号集成测试组件 - 几何建模与网格质量分析完整对接
 * 数据流：2号几何数据 → RBF插值 → 3号Fragment可视化 → 质量反馈循环
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Download, Upload, Settings } from 'lucide-react';

// 导入2号的核心服务
import { getAllStandardTestCases, StandardTestCase } from '../../services/geometryTestCases';
import { rbfInterpolate, Point3D, RBFConfig } from '../../algorithms/rbfInterpolation';
import GeometryQualityPanel from '../geometry/GeometryQualityPanel';
import { startGeometryOptimization } from '../../services/geometryOptimization';

// 3号的网格数据接口（基于他的MeshQualityAnalysis要求）
interface MeshData {
  vertices: Float32Array;
  indices: Uint32Array;
  normals?: Float32Array;
  quality: Float32Array;
  metadata: {
    elementCount: number;
    vertexCount: number;
    meshSize: number;
    qualityStats: {
      min: number;
      max: number;
      mean: number;
      std: number;
    };
  };
}

// 质量反馈接口
interface QualityFeedback {
  timestamp: string;
  meshSize: number;
  elementCount: number;
  qualityScore: number;
  criticalRegions: {
    corners: { count: number; quality: number; issues: string[] };
    supportContacts: { count: number; sharpAngles: number; recommendations: string[] };
    materialBoundaries: { count: number; continuity: boolean; warnings: string[] };
  };
  performance: {
    responseTime: number;
    memoryUsage: number;
    complexity: 'low' | 'medium' | 'high';
  };
  optimization: {
    suggestions: string[];
    priority: 'low' | 'medium' | 'high';
    estimatedImprovement: number;
  };
}

const GeometryMeshIntegration: React.FC = () => {
  // 测试用例和状态管理
  const [testCases] = useState<StandardTestCase[]>(getAllStandardTestCases());
  const [selectedTestCase, setSelectedTestCase] = useState<StandardTestCase>(testCases[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'geometry' | 'rbf' | 'mesh' | 'feedback'>('geometry');
  
  // 数据状态
  const [geometryData, setGeometryData] = useState<any>(null);
  const [meshData, setMeshData] = useState<MeshData | null>(null);
  const [qualityFeedback, setQualityFeedback] = useState<QualityFeedback | null>(null);
  
  // RBF配置
  const [rbfConfig, setRbfConfig] = useState<Partial<RBFConfig>>({
    kernel: 'multiquadric',
    shape: 1.0,
    smooth: 0.0,
    meshCompatibility: {
      targetMeshSize: 1.75,
      qualityThreshold: 0.65,
      maxElements: 2000000
    },
    optimization: {
      adaptiveRefinement: true,
      cornerPreservation: true,
      smoothnessControl: 0.1
    }
  });

  // 质量面板控制
  const [showQualityPanel, setShowQualityPanel] = useState(true);
  const [autoOptimization, setAutoOptimization] = useState(false);

  // WebSocket连接引用
  const wsRef = useRef<WebSocket | null>(null);

  // 建立与3号的实时质量反馈连接
  useEffect(() => {
    console.log('🔗 建立与3号的实时质量反馈连接...');
    
    const ws = new WebSocket('ws://localhost:8080/quality-feedback');
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('✅ 2号-3号实时连接建立成功');
    };

    ws.onmessage = (event) => {
      try {
        const feedback: QualityFeedback = JSON.parse(event.data);
        setQualityFeedback(feedback);
        
        console.log('📊 收到3号质量反馈:', {
          质量评分: feedback.qualityScore.toFixed(3),
          响应时间: feedback.performance.responseTime + 'ms',
          优化建议: feedback.optimization.suggestions.length
        });

        // 自动优化响应
        if (autoOptimization && feedback.optimization.priority === 'high') {
          handleAutoOptimization(feedback);
        }
        
      } catch (error) {
        console.error('❌ 3号质量反馈解析失败:', error);
      }
    };

    ws.onclose = () => {
      console.log('⚠️ 与3号质量反馈连接断开');
    };

    return () => {
      ws.close();
    };
  }, [autoOptimization]);

  /**
   * 完整测试流程：2号数据 → RBF插值 → 3号网格分析
   */
  const runCompleteTest = useCallback(async () => {
    setIsProcessing(true);
    setCurrentStep('geometry');

    try {
      console.log('🚀 开始2号-3号完整集成测试:', selectedTestCase.name);

      // Step 1: 2号几何数据准备
      setCurrentStep('geometry');
      const geometryPoints = selectedTestCase.geometry.vertices.map(([x, y, z]) => ({ x, y, z }));
      const geometryValues = geometryPoints.map((_, i) => Math.sin(i * 0.1)); // 模拟地质数据
      setGeometryData({ points: geometryPoints, values: geometryValues });

      // Step 2: RBF插值生成高质量几何
      setCurrentStep('rbf');
      console.log('🧮 执行RBF插值 - 增强multiquadric核函数');
      
      const queryPoints: Point3D[] = generateQueryGrid(
        selectedTestCase.geometry.vertices,
        rbfConfig.meshCompatibility?.targetMeshSize || 1.75
      );

      const rbfResult = await rbfInterpolate(
        geometryPoints,
        geometryValues,
        queryPoints,
        rbfConfig
      );

      console.log('✅ RBF插值完成:', {
        插值点数: rbfResult.values.length,
        质量评分: rbfResult.qualityMetrics.qualityScore.toFixed(3),
        网格就绪: rbfResult.qualityMetrics.meshReadiness,
        预期单元: rbfResult.qualityMetrics.estimatedElements
      });

      // Step 3: 转换为3号的MeshData格式
      setCurrentStep('mesh');
      const convertedMeshData = convertToMeshData(queryPoints, rbfResult);
      setMeshData(convertedMeshData);

      console.log('📊 转换为3号网格格式:', {
        顶点数: convertedMeshData.metadata.vertexCount,
        单元数: convertedMeshData.metadata.elementCount,
        网格尺寸: convertedMeshData.metadata.meshSize,
        平均质量: convertedMeshData.metadata.qualityStats.mean.toFixed(3)
      });

      // Step 4: 发送数据给3号进行Fragment可视化
      setCurrentStep('feedback');
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'mesh_data',
          data: {
            vertices: Array.from(convertedMeshData.vertices),
            indices: Array.from(convertedMeshData.indices),
            quality: Array.from(convertedMeshData.quality),
            metadata: convertedMeshData.metadata,
            testCase: selectedTestCase.name,
            rbfConfig: rbfConfig
          }
        }));
        console.log('📤 已发送网格数据给3号Fragment可视化');
      }

    } catch (error) {
      console.error('❌ 集成测试失败:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedTestCase, rbfConfig]);

  /**
   * 生成查询网格点
   */
  const generateQueryGrid = (vertices: number[][], meshSize: number): Point3D[] => {
    // 计算边界框
    const minX = Math.min(...vertices.map(v => v[0]));
    const maxX = Math.max(...vertices.map(v => v[0]));
    const minY = Math.min(...vertices.map(v => v[1]));
    const maxY = Math.max(...vertices.map(v => v[1]));
    const minZ = Math.min(...vertices.map(v => v[2]));
    const maxZ = Math.max(...vertices.map(v => v[2]));

    const points: Point3D[] = [];
    
    // 基于3号建议的网格尺寸生成查询点
    for (let x = minX; x <= maxX; x += meshSize) {
      for (let y = minY; y <= maxY; y += meshSize) {
        for (let z = minZ; z <= maxZ; z += meshSize) {
          points.push({ x, y, z });
        }
      }
    }

    console.log('📐 生成查询网格:', {
      网格尺寸: meshSize,
      查询点数: points.length,
      边界范围: {
        x: [minX, maxX],
        y: [minY, maxY], 
        z: [minZ, maxZ]
      }
    });

    return points;
  };

  /**
   * 转换为3号的MeshData格式
   */
  const convertToMeshData = (queryPoints: Point3D[], rbfResult: any): MeshData => {
    const vertexCount = queryPoints.length;
    const vertices = new Float32Array(vertexCount * 3);
    const quality = new Float32Array(rbfResult.values);

    // 填充顶点数据
    for (let i = 0; i < queryPoints.length; i++) {
      vertices[i * 3] = queryPoints[i].x;
      vertices[i * 3 + 1] = queryPoints[i].y;
      vertices[i * 3 + 2] = queryPoints[i].z;
    }

    // 生成简化的索引数据（3号会进一步处理）
    const indices = new Uint32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      indices[i] = i;
    }

    // 计算质量统计
    const qualityArray = Array.from(quality);
    const mean = qualityArray.reduce((sum, val) => sum + val, 0) / qualityArray.length;
    const qualityStats = {
      min: Math.min(...qualityArray),
      max: Math.max(...qualityArray),
      mean: mean,
      std: Math.sqrt(qualityArray.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / qualityArray.length)
    };

    return {
      vertices,
      indices,
      quality,
      metadata: {
        elementCount: rbfResult.qualityMetrics.estimatedElements,
        vertexCount,
        meshSize: rbfResult.qualityMetrics.expectedMeshSize,
        qualityStats
      }
    };
  };

  /**
   * 自动优化响应
   */
  const handleAutoOptimization = useCallback(async (feedback: QualityFeedback) => {
    console.log('🔄 触发自动优化响应 - 3号建议:', feedback.optimization.suggestions);
    
    try {
      if (geometryData) {
        const optimizationResult = await startGeometryOptimization(
          geometryData,
          feedback.qualityScore + 0.1 // 目标提升10%
        );
        
        console.log('✅ 自动优化完成:', {
          原始质量: optimizationResult.originalQuality.toFixed(3),
          优化质量: optimizationResult.optimizedQuality.toFixed(3),
          改进程度: ((optimizationResult.optimizedQuality - optimizationResult.originalQuality) * 100).toFixed(1) + '%'
        });

        // 重新运行测试
        runCompleteTest();
      }
    } catch (error) {
      console.error('❌ 自动优化失败:', error);
    }
  }, [geometryData, runCompleteTest]);

  /**
   * 质量优化处理
   */
  const handleOptimizationApply = useCallback((suggestions: string[]) => {
    console.log('🔧 应用3号优化建议:', suggestions);
    
    // 根据建议调整RBF配置
    const newConfig = { ...rbfConfig };
    
    suggestions.forEach(suggestion => {
      if (suggestion.includes('网格尺寸')) {
        if (suggestion.includes('增大')) {
          newConfig.meshCompatibility!.targetMeshSize = Math.min(2.0, (newConfig.meshCompatibility!.targetMeshSize || 1.75) + 0.1);
        } else if (suggestion.includes('减小')) {
          newConfig.meshCompatibility!.targetMeshSize = Math.max(1.5, (newConfig.meshCompatibility!.targetMeshSize || 1.75) - 0.1);
        }
      }
      
      if (suggestion.includes('平滑')) {
        newConfig.optimization!.smoothnessControl = Math.min(0.5, (newConfig.optimization!.smoothnessControl || 0.1) + 0.05);
      }
    });

    setRbfConfig(newConfig);
    console.log('⚙️ RBF配置已更新，重新运行测试...');
    
    // 延迟重新运行，让用户看到配置变化
    setTimeout(() => {
      runCompleteTest();
    }, 1000);
  }, [rbfConfig, runCompleteTest]);

  return (
    <div className="w-full h-screen bg-gray-900 text-white overflow-hidden">
      {/* 头部控制栏 */}
      <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-cyan-400">2号-3号集成测试</h1>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${wsRef.current?.readyState === WebSocket.OPEN ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm text-gray-300">
              {wsRef.current?.readyState === WebSocket.OPEN ? '3号连接正常' : '3号连接断开'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* 测试用例选择 */}
          <select
            value={selectedTestCase.id}
            onChange={(e) => setSelectedTestCase(testCases.find(tc => tc.id === e.target.value)!)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
            disabled={isProcessing}
          >
            {testCases.map(testCase => (
              <option key={testCase.id} value={testCase.id}>
                {testCase.name}
              </option>
            ))}
          </select>

          {/* 控制按钮 */}
          <button
            onClick={runCompleteTest}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 rounded transition-colors"
          >
            {isProcessing ? (
              <>
                <Pause className="w-4 h-4" />
                <span>测试中...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>运行测试</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowQualityPanel(!showQualityPanel)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* 左侧：测试状态和参数 */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
          {/* 当前步骤 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">测试进度</h3>
            <div className="space-y-2">
              {[
                { key: 'geometry', label: '几何数据准备', icon: '📐' },
                { key: 'rbf', label: 'RBF插值计算', icon: '🧮' },
                { key: 'mesh', label: '网格数据转换', icon: '📊' },
                { key: 'feedback', label: '质量反馈循环', icon: '🔄' }
              ].map(step => (
                <div
                  key={step.key}
                  className={`flex items-center space-x-3 p-2 rounded ${
                    currentStep === step.key ? 'bg-cyan-600/20 border border-cyan-500/30' :
                    'bg-gray-700/50'
                  }`}
                >
                  <span className="text-lg">{step.icon}</span>
                  <span className={`text-sm ${currentStep === step.key ? 'text-cyan-400' : 'text-gray-300'}`}>
                    {step.label}
                  </span>
                  {currentStep === step.key && isProcessing && (
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse ml-auto" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 当前测试用例信息 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">测试用例</h3>
            <div className="bg-gray-700/50 rounded p-3 space-y-2">
              <div className="text-sm">
                <span className="text-gray-400">名称：</span>
                <span className="text-white">{selectedTestCase.name}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">类型：</span>
                <span className="text-cyan-400">{selectedTestCase.category}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">预期质量：</span>
                <span className="text-green-400">{selectedTestCase.validation.expectedQuality}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">预期单元：</span>
                <span className="text-yellow-400">{(selectedTestCase.validation.expectedElements / 1000000).toFixed(1)}M</span>
              </div>
            </div>
          </div>

          {/* RBF配置 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">RBF配置</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">核函数</label>
                <select
                  value={rbfConfig.kernel}
                  onChange={(e) => setRbfConfig({...rbfConfig, kernel: e.target.value as any})}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                >
                  <option value="multiquadric">Multiquadric (增强)</option>
                  <option value="thin_plate_spline">Thin Plate Spline (增强)</option>
                  <option value="gaussian">Gaussian</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">目标网格尺寸 (m)</label>
                <input
                  type="range"
                  min="1.5"
                  max="2.0"
                  step="0.1"
                  value={rbfConfig.meshCompatibility?.targetMeshSize || 1.75}
                  onChange={(e) => setRbfConfig({
                    ...rbfConfig,
                    meshCompatibility: {
                      ...rbfConfig.meshCompatibility!,
                      targetMeshSize: parseFloat(e.target.value)
                    }
                  })}
                  className="w-full"
                />
                <span className="text-xs text-cyan-400">
                  {rbfConfig.meshCompatibility?.targetMeshSize || 1.75}m
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoOptim"
                  checked={autoOptimization}
                  onChange={(e) => setAutoOptimization(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="autoOptim" className="text-sm text-gray-300">
                  自动优化响应
                </label>
              </div>
            </div>
          </div>

          {/* 数据统计 */}
          {meshData && (
            <div>
              <h3 className="text-lg font-semibold mb-3">网格统计</h3>
              <div className="bg-gray-700/50 rounded p-3 space-y-2">
                <div className="text-sm">
                  <span className="text-gray-400">顶点数：</span>
                  <span className="text-white">{meshData.metadata.vertexCount.toLocaleString()}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-400">单元数：</span>
                  <span className="text-cyan-400">{meshData.metadata.elementCount.toLocaleString()}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-400">平均质量：</span>
                  <span className="text-green-400">{meshData.metadata.qualityStats.mean.toFixed(3)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-400">质量范围：</span>
                  <span className="text-yellow-400">
                    {meshData.metadata.qualityStats.min.toFixed(2)} - {meshData.metadata.qualityStats.max.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：3号的Fragment可视化区域 */}
        <div className="flex-1 relative">
          {/* 这里会集成3号的MeshQualityAnalysis组件 */}
          <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
            {meshData ? (
              <div className="text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h2 className="text-2xl font-bold text-cyan-400 mb-2">
                  3号Fragment可视化就绪
                </h2>
                <p className="text-gray-300 mb-4">
                  网格数据已准备：{meshData.metadata.elementCount.toLocaleString()} 单元
                </p>
                <div className="bg-gray-800/50 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-gray-400 mb-2">
                    集成你的MeshQualityAnalysis组件到这里：
                  </p>
                  <code className="text-xs text-green-400 bg-gray-900 px-2 py-1 rounded">
                    &lt;MeshQualityAnalysis meshData={`{meshData}`} /&gt;
                  </code>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-6xl mb-4">⏱️</div>
                <h2 className="text-2xl font-bold text-gray-400 mb-2">
                  等待测试数据
                </h2>
                <p className="text-gray-500">
                  点击"运行测试"开始2号-3号集成测试
                </p>
              </div>
            )}
          </div>

          {/* 浮动的质量反馈面板 */}
          {showQualityPanel && (
            <GeometryQualityPanel
              isVisible={showQualityPanel}
              onOptimizationApply={handleOptimizationApply}
              onGeometryAdjust={() => {}}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GeometryMeshIntegration;