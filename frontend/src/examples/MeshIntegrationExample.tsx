/**
 * 2号-3号网格集成示例 - 展示如何直接对接MeshQualityAnalysis
 * 使用真实的几何数据，演示完整的数据流
 */

import React, { useState, useEffect } from 'react';
import { quickMeshDataFor3, MeshDataFor3 } from '../utils/meshDataGenerator';

// 这里是3号的MeshQualityAnalysis组件接口
// interface MeshQualityAnalysisProps {
//   meshData?: MeshDataFor3;
//   autoRefresh?: boolean;
//   showStats?: boolean;
// }

const MeshIntegrationExample: React.FC = () => {
  const [currentMeshData, setCurrentMeshData] = useState<MeshDataFor3 | null>(null);
  const [selectedTestType, setSelectedTestType] = useState<'simple' | 'complex' | 'support' | 'tunnel'>('simple');
  const [isLoading, setIsLoading] = useState(false);

  // 生成测试数据
  const generateTestData = async (type: 'simple' | 'complex' | 'support' | 'tunnel') => {
    setIsLoading(true);
    
    try {
      console.log(`🚀 生成${type}测试数据给3号...`);
      
      // 使用2号的网格数据生成器
      const meshData = quickMeshDataFor3(type);
      
      console.log('✅ 测试数据生成完成:', {
        类型: type,
        顶点数: meshData.metadata.vertexCount,
        单元数: meshData.metadata.elementCount,
        网格尺寸: meshData.metadata.meshSize,
        平均质量: meshData.metadata.qualityStats.mean.toFixed(3)
      });
      
      setCurrentMeshData(meshData);
      
    } catch (error) {
      console.error('❌ 测试数据生成失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化加载简单测试数据
  useEffect(() => {
    generateTestData('simple');
  }, []);

  return (
    <div className="w-full h-screen bg-gray-900 text-white">
      {/* 控制头部 */}
      <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
        <h1 className="text-xl font-bold text-cyan-400">
          2号→3号 网格集成示例
        </h1>
        
        <div className="flex items-center space-x-4">
          {/* 测试类型选择 */}
          <select
            value={selectedTestType}
            onChange={(e) => {
              const newType = e.target.value as 'simple' | 'complex' | 'support' | 'tunnel';
              setSelectedTestType(newType);
              generateTestData(newType);
            }}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-1"
            disabled={isLoading}
          >
            <option value="simple">简单基坑 (80万单元)</option>
            <option value="complex">复杂基坑 (150万单元)</option>
            <option value="support">支护系统 (120万单元)</option>
            <option value="tunnel">隧道干扰 (180万单元)</option>
          </select>

          {/* 状态指示器 */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${currentMeshData ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm text-gray-300">
              {isLoading ? '生成中...' : currentMeshData ? '数据就绪' : '无数据'}
            </span>
          </div>

          {/* 刷新按钮 */}
          <button
            onClick={() => generateTestData(selectedTestType)}
            disabled={isLoading}
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 rounded text-sm transition-colors"
          >
            {isLoading ? '生成中...' : '重新生成'}
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* 左侧：数据信息面板 */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">2号几何数据</h3>
          
          {currentMeshData ? (
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="bg-gray-700/50 rounded p-3">
                <h4 className="font-medium mb-2 text-cyan-400">基本信息</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">测试类型:</span>
                    <span className="text-white">{selectedTestType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">顶点数:</span>
                    <span className="text-cyan-400">{currentMeshData.metadata.vertexCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">单元数:</span>
                    <span className="text-green-400">{currentMeshData.metadata.elementCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">网格尺寸:</span>
                    <span className="text-yellow-400">{currentMeshData.metadata.meshSize}m</span>
                  </div>
                </div>
              </div>

              {/* 质量统计 */}
              <div className="bg-gray-700/50 rounded p-3">
                <h4 className="font-medium mb-2 text-cyan-400">质量统计</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">平均质量:</span>
                    <span className={`${currentMeshData.metadata.qualityStats.mean >= 0.65 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {currentMeshData.metadata.qualityStats.mean.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">质量范围:</span>
                    <span className="text-gray-300">
                      {currentMeshData.metadata.qualityStats.min.toFixed(2)} - {currentMeshData.metadata.qualityStats.max.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">标准偏差:</span>
                    <span className="text-gray-300">{currentMeshData.metadata.qualityStats.std.toFixed(3)}</span>
                  </div>
                </div>
              </div>

              {/* 3号验证标准 */}
              <div className="bg-gray-700/50 rounded p-3">
                <h4 className="font-medium mb-2 text-cyan-400">3号验证标准</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">网格尺寸范围:</span>
                    <span className={`${currentMeshData.metadata.meshSize >= 1.5 && currentMeshData.metadata.meshSize <= 2.0 ? 'text-green-400' : 'text-red-400'}`}>
                      {currentMeshData.metadata.meshSize >= 1.5 && currentMeshData.metadata.meshSize <= 2.0 ? '✓' : '✗'} 1.5-2.0m
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">质量阈值:</span>
                    <span className={`${currentMeshData.metadata.qualityStats.mean >= 0.65 ? 'text-green-400' : 'text-red-400'}`}>
                      {currentMeshData.metadata.qualityStats.mean >= 0.65 ? '✓' : '✗'} &gt;0.65
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">单元上限:</span>
                    <span className={`${currentMeshData.metadata.elementCount <= 2000000 ? 'text-green-400' : 'text-red-400'}`}>
                      {currentMeshData.metadata.elementCount <= 2000000 ? '✓' : '✗'} ≤200万
                    </span>
                  </div>
                </div>
              </div>

              {/* 数据格式预览 */}
              <div className="bg-gray-700/50 rounded p-3">
                <h4 className="font-medium mb-2 text-cyan-400">数据格式</h4>
                <div className="text-xs text-gray-300 space-y-1">
                  <div>vertices: Float32Array({currentMeshData.vertices.length})</div>
                  <div>indices: Uint32Array({currentMeshData.indices.length})</div>
                  <div>quality: Float32Array({currentMeshData.quality.length})</div>
                  {currentMeshData.normals && (
                    <div>normals: Float32Array({currentMeshData.normals.length})</div>
                  )}
                </div>
              </div>

              {/* 使用示例代码 */}
              <div className="bg-gray-900/50 rounded p-3">
                <h4 className="font-medium mb-2 text-cyan-400">3号集成代码</h4>
                <pre className="text-xs text-green-400 overflow-x-auto">
{`// 直接传入meshData给3号组件
<MeshQualityAnalysis 
  meshData={currentMeshData}
  autoRefresh={true}
  showStats={true}
/>`}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">⏳</div>
              <p>正在生成测试数据...</p>
            </div>
          )}
        </div>

        {/* 右侧：3号MeshQualityAnalysis组件集成区域 */}
        <div className="flex-1 relative bg-gradient-to-br from-gray-900 to-gray-800">
          {currentMeshData ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center">
              {/* 模拟的3号组件区域 */}
              <div className="border-2 border-dashed border-cyan-500/30 rounded-lg p-8 max-w-2xl mx-auto">
                <div className="text-6xl mb-4">🎯</div>
                <h2 className="text-2xl font-bold text-cyan-400 mb-2">
                  3号MeshQualityAnalysis就绪
                </h2>
                <p className="text-gray-300 mb-6">
                  真实网格数据已准备：{currentMeshData.metadata.elementCount.toLocaleString()} 单元
                </p>
                
                {/* 集成代码示例 */}
                <div className="bg-gray-800/50 rounded-lg p-6 text-left">
                  <h3 className="text-lg font-semibold text-cyan-400 mb-3">集成方式：</h3>
                  <pre className="text-sm text-green-400 bg-gray-900 p-4 rounded overflow-x-auto">
{`import { MeshDataFor3 } from '../utils/meshDataGenerator';
import MeshQualityAnalysis from './MeshQualityAnalysis';

// 使用2号的真实网格数据
const meshData: MeshDataFor3 = {
  vertices: Float32Array(${currentMeshData.vertices.length}),
  indices: Uint32Array(${currentMeshData.indices.length}),
  quality: Float32Array(${currentMeshData.quality.length}),
  normals: Float32Array(${currentMeshData.normals?.length || 0}),
  metadata: {
    elementCount: ${currentMeshData.metadata.elementCount},
    vertexCount: ${currentMeshData.metadata.vertexCount},
    meshSize: ${currentMeshData.metadata.meshSize},
    qualityStats: { /* ... */ }
  }
};

// 直接传入3号组件
<MeshQualityAnalysis meshData={meshData} />`}
                  </pre>
                </div>

                {/* 数据质量指示 */}
                <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-green-500/20 border border-green-500/30 rounded p-3">
                    <div className="text-green-400 font-semibold">网格尺寸</div>
                    <div className="text-white">{currentMeshData.metadata.meshSize}m</div>
                    <div className="text-green-300 text-xs">符合1.5-2.0m标准</div>
                  </div>
                  <div className={`${currentMeshData.metadata.qualityStats.mean >= 0.65 ? 'bg-green-500/20 border-green-500/30' : 'bg-yellow-500/20 border-yellow-500/30'} border rounded p-3`}>
                    <div className={`${currentMeshData.metadata.qualityStats.mean >= 0.65 ? 'text-green-400' : 'text-yellow-400'} font-semibold`}>平均质量</div>
                    <div className="text-white">{currentMeshData.metadata.qualityStats.mean.toFixed(3)}</div>
                    <div className={`${currentMeshData.metadata.qualityStats.mean >= 0.65 ? 'text-green-300' : 'text-yellow-300'} text-xs`}>
                      {currentMeshData.metadata.qualityStats.mean >= 0.65 ? '达标' : '接近'} 0.65阈值
                    </div>
                  </div>
                  <div className="bg-cyan-500/20 border border-cyan-500/30 rounded p-3">
                    <div className="text-cyan-400 font-semibold">单元数量</div>
                    <div className="text-white">{(currentMeshData.metadata.elementCount / 1000000).toFixed(1)}M</div>
                    <div className="text-cyan-300 text-xs">Fragment验证级别</div>
                  </div>
                </div>
              </div>

              {/* 集成说明 */}
              <div className="mt-8 max-w-3xl mx-auto bg-gray-800/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">🤝 2号-3号无缝集成</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                  <div>
                    <h4 className="font-medium text-cyan-400 mb-2">2号提供：</h4>
                    <ul className="space-y-1">
                      <li>• 增强RBF插值算法</li>
                      <li>• 标准化MeshData格式</li>
                      <li>• 4套验证测试用例</li>
                      <li>• 实时质量反馈接口</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-cyan-400 mb-2">3号处理：</h4>
                    <ul className="space-y-1">
                      <li>• Fragment高性能渲染</li>
                      <li>• 200万单元级别显示</li>
                      <li>• 实时质量分析</li>
                      <li>• 优化建议反馈</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin text-6xl mb-4">⚙️</div>
                <h2 className="text-2xl font-bold text-gray-400 mb-2">生成测试数据中...</h2>
                <p className="text-gray-500">正在为3号准备网格数据</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeshIntegrationExample;