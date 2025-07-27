/**
 * 高级数据可视化组件
 * 提供专业的CAE数据分析和可视化功能
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FunctionalIcons } from '../icons/FunctionalIconsQuickFix';
import { StatusIcons } from '../icons/StatusIcons';

interface DataVisualizationProps {
  isVisible: boolean;
  onClose: () => void;
}

interface ChartDataPoint {
  x: number;
  y: number;
  z?: number;
  label?: string;
  value: number;
  category?: string;
}

interface VisualizationConfig {
  chartType: 'line' | 'scatter' | 'heatmap' | '3d_surface' | 'contour' | 'histogram';
  colorScheme: 'viridis' | 'plasma' | 'turbo' | 'coolwarm' | 'jet';
  showGrid: boolean;
  showLegend: boolean;
  interactive: boolean;
  animation: boolean;
}

const AdvancedDataVisualization: React.FC<DataVisualizationProps> = ({ isVisible, onClose }) => {
  const [activeTab, setActiveTab] = useState<'charts' | 'analysis' | 'export'>('charts');
  const [config, setConfig] = useState<VisualizationConfig>({
    chartType: 'line',
    colorScheme: 'viridis',
    showGrid: true,
    showLegend: true,
    interactive: true,
    animation: true
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sampleData, setSampleData] = useState<ChartDataPoint[]>([]);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  // 生成示例数据
  useEffect(() => {
    if (isVisible) {
      generateSampleData();
    }
  }, [isVisible, config.chartType]);

  const generateSampleData = () => {
    const data: ChartDataPoint[] = [];
    
    switch (config.chartType) {
      case 'line':
        for (let i = 0; i <= 100; i++) {
          const x = i;
          const y = 50 + 30 * Math.sin(x * 0.1) + 10 * Math.random();
          data.push({ x, y, value: y, label: `Point ${i}` });
        }
        break;
        
      case 'scatter':
        for (let i = 0; i < 200; i++) {
          const x = Math.random() * 100;
          const y = 20 + x * 0.8 + Math.random() * 20;
          data.push({ x, y, value: y, category: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C' });
        }
        break;
        
      case 'heatmap':
        for (let i = 0; i < 20; i++) {
          for (let j = 0; j < 20; j++) {
            const value = Math.sin(i * 0.3) * Math.cos(j * 0.3) * 100 + Math.random() * 20;
            data.push({ x: i, y: j, value, label: `(${i},${j})` });
          }
        }
        break;
        
      case '3d_surface':
        for (let i = 0; i < 15; i++) {
          for (let j = 0; j < 15; j++) {
            const x = i * 2;
            const y = j * 2;
            const z = 10 * Math.sin(x * 0.2) * Math.cos(y * 0.2) + Math.random() * 5;
            data.push({ x, y, z, value: z });
          }
        }
        break;
        
      default:
        // 直方图数据
        const bins = 20;
        for (let i = 0; i < bins; i++) {
          const value = Math.exp(-Math.pow((i - bins/2) / (bins/4), 2)) * 100 + Math.random() * 10;
          data.push({ x: i, y: value, value });
        }
    }
    
    setSampleData(data);
  };

  // 执行数据分析
  const performAnalysis = () => {
    if (sampleData.length === 0) return;
    
    const values = sampleData.map(d => d.value);
    const n = values.length;
    
    // 基础统计
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // 分位数
    const sortedValues = [...values].sort((a, b) => a - b);
    const q25 = sortedValues[Math.floor(n * 0.25)];
    const median = sortedValues[Math.floor(n * 0.5)];
    const q75 = sortedValues[Math.floor(n * 0.75)];
    
    // 偏度和峰度
    const skewness = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0) / n;
    const kurtosis = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 4), 0) / n - 3;
    
    setAnalysisResults({
      basic: { mean, stdDev, min, max, variance },
      quartiles: { q25, median, q75 },
      distribution: { skewness, kurtosis },
      count: n
    });
  };

  // 颜色映射
  const getColorFromValue = (value: number, min: number, max: number): string => {
    const normalized = (value - min) / (max - min);
    
    switch (config.colorScheme) {
      case 'viridis':
        return `hsl(${240 + normalized * 120}, 70%, ${30 + normalized * 40}%)`;
      case 'plasma':
        return `hsl(${280 + normalized * 80}, 80%, ${20 + normalized * 60}%)`;
      case 'turbo':
        return `hsl(${normalized * 240}, 90%, 50%)`;
      case 'coolwarm':
        return `hsl(${240 - normalized * 240}, 70%, 50%)`;
      case 'jet':
        if (normalized < 0.25) return `hsl(240, 100%, ${50 + normalized * 200}%)`;
        if (normalized < 0.75) return `hsl(${240 - (normalized - 0.25) * 480}, 100%, 50%)`;
        return `hsl(${0}, 100%, ${100 - (normalized - 0.75) * 200}%)`;
      default:
        return `hsl(${normalized * 360}, 70%, 50%)`;
    }
  };

  // 渲染图表
  const renderChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || sampleData.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    
    // 设置样式
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    // 绘制网格
    if (config.showGrid) {
      ctx.strokeStyle = '#e9ecef';
      ctx.lineWidth = 1;
      
      for (let i = 0; i <= 10; i++) {
        const x = (width / 10) * i;
        const y = (height / 10) * i;
        
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
    
    const values = sampleData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    // 根据图表类型渲染
    switch (config.chartType) {
      case 'line':
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        sampleData.forEach((point, index) => {
          const x = (point.x / 100) * width;
          const y = height - ((point.value - minValue) / (maxValue - minValue)) * height;
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        break;
        
      case 'scatter':
        sampleData.forEach(point => {
          const x = (point.x / 100) * width;
          const y = height - ((point.value - minValue) / (maxValue - minValue)) * height;
          
          ctx.fillStyle = point.category === 'A' ? '#ff6b6b' : 
                         point.category === 'B' ? '#4ecdc4' : '#45b7d1';
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
        });
        break;
        
      case 'heatmap':
        const cellWidth = width / 20;
        const cellHeight = height / 20;
        
        sampleData.forEach(point => {
          const x = point.x * cellWidth;
          const y = point.y * cellHeight;
          
          ctx.fillStyle = getColorFromValue(point.value, minValue, maxValue);
          ctx.fillRect(x, y, cellWidth, cellHeight);
        });
        break;
        
      case 'histogram':
        const barWidth = width / sampleData.length;
        
        sampleData.forEach((point, index) => {
          const x = index * barWidth;
          const barHeight = ((point.value - minValue) / (maxValue - minValue)) * height;
          const y = height - barHeight;
          
          ctx.fillStyle = getColorFromValue(point.value, minValue, maxValue);
          ctx.fillRect(x, y, barWidth - 1, barHeight);
        });
        break;
    }
  };

  // 重新渲染图表
  useEffect(() => {
    if (isVisible) {
      setTimeout(renderChart, 100);
    }
  }, [sampleData, config, isVisible]);

  // 执行分析
  useEffect(() => {
    if (sampleData.length > 0) {
      performAnalysis();
    }
  }, [sampleData]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">DV</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">高级数据可视化</h2>
                <p className="text-sm text-gray-600">专业CAE数据分析与图表生成</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <span className="text-gray-600">×</span>
            </button>
          </div>

          {/* 标签页 */}
          <div className="flex border-b border-gray-200">
            {[
              { key: 'charts', label: '图表生成', icon: '📊' },
              { key: 'analysis', label: '数据分析', icon: '🔬' },
              { key: 'export', label: '导出设置', icon: '💾' }
            ].map((tab) => (
              <button
                key={tab.key}
                className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab(tab.key as any)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* 左侧控制面板 */}
            <div className="w-80 border-r border-gray-200 p-6 overflow-y-auto">
              {activeTab === 'charts' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">图表类型</label>
                    <select
                      value={config.chartType}
                      onChange={(e) => setConfig(prev => ({ ...prev, chartType: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="line">折线图</option>
                      <option value="scatter">散点图</option>
                      <option value="heatmap">热力图</option>
                      <option value="3d_surface">3D曲面</option>
                      <option value="histogram">直方图</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">颜色方案</label>
                    <select
                      value={config.colorScheme}
                      onChange={(e) => setConfig(prev => ({ ...prev, colorScheme: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="viridis">Viridis</option>
                      <option value="plasma">Plasma</option>
                      <option value="turbo">Turbo</option>
                      <option value="coolwarm">Cool-Warm</option>
                      <option value="jet">Jet</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.showGrid}
                        onChange={(e) => setConfig(prev => ({ ...prev, showGrid: e.target.checked }))}
                        className="rounded mr-2"
                      />
                      <span className="text-sm text-gray-700">显示网格</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.showLegend}
                        onChange={(e) => setConfig(prev => ({ ...prev, showLegend: e.target.checked }))}
                        className="rounded mr-2"
                      />
                      <span className="text-sm text-gray-700">显示图例</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.interactive}
                        onChange={(e) => setConfig(prev => ({ ...prev, interactive: e.target.checked }))}
                        className="rounded mr-2"
                      />
                      <span className="text-sm text-gray-700">交互模式</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.animation}
                        onChange={(e) => setConfig(prev => ({ ...prev, animation: e.target.checked }))}
                        className="rounded mr-2"
                      />
                      <span className="text-sm text-gray-700">动画效果</span>
                    </label>
                  </div>

                  <button
                    onClick={generateSampleData}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    重新生成数据
                  </button>
                </div>
              )}

              {activeTab === 'analysis' && analysisResults && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">基础统计</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>均值:</span>
                        <span className="font-mono">{analysisResults.basic.mean.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>标准差:</span>
                        <span className="font-mono">{analysisResults.basic.stdDev.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>最小值:</span>
                        <span className="font-mono">{analysisResults.basic.min.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>最大值:</span>
                        <span className="font-mono">{analysisResults.basic.max.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">分位数</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Q1 (25%):</span>
                        <span className="font-mono">{analysisResults.quartiles.q25.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>中位数:</span>
                        <span className="font-mono">{analysisResults.quartiles.median.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Q3 (75%):</span>
                        <span className="font-mono">{analysisResults.quartiles.q75.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">分布特征</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>偏度:</span>
                        <span className="font-mono">{analysisResults.distribution.skewness.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>峰度:</span>
                        <span className="font-mono">{analysisResults.distribution.kurtosis.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>样本数:</span>
                        <span className="font-mono">{analysisResults.count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'export' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">导出格式</h3>
                    <div className="space-y-2">
                      {['PNG图像', 'SVG矢量', 'PDF文档', 'CSV数据', 'JSON数据'].map((format) => (
                        <button
                          key={format}
                          className="w-full px-4 py-2 text-left border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          {format}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">图像设置</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">分辨率</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                          <option>1920×1080 (HD)</option>
                          <option>2560×1440 (2K)</option>
                          <option>3840×2160 (4K)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">DPI</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                          <option>72 (屏幕)</option>
                          <option>150 (打印)</option>
                          <option>300 (高质量)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 右侧图表区域 */}
            <div className="flex-1 p-6">
              <div className="h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="w-full h-full max-w-4xl max-h-full">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="w-full h-full object-contain bg-white rounded-lg shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdvancedDataVisualization;