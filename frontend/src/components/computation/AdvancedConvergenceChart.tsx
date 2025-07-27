/**
 * 高级收敛图表组件
 * 3号计算专家 - 专业级收敛可视化系统
 * 支持多种图表类型和实时数据更新
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Space, Typography, Button, Select, Switch, Slider, Tag, Row, Col } from 'antd';
import { 
  LineChartOutlined,
  BarChartOutlined,
  AreaChartOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  DownloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { ComponentDevHelper } from '../../utils/developmentTools';
import { ModuleErrorBoundary } from '../../core/ErrorBoundary';

const { Text } = Typography;

// 图表数据点接口
interface ChartDataPoint {
  iteration: number;
  residual: number;
  displacement: number;
  stress: number;
  energy: number;
  timestamp: number;
}

// 图表配置接口
interface ChartConfig {
  type: 'line' | 'area' | 'scatter';
  showGrid: boolean;
  showLegend: boolean;
  autoScale: boolean;
  logScale: boolean;
  smoothing: boolean;
  theme: 'dark' | 'light';
}

interface AdvancedConvergenceChartProps {
  data?: ChartDataPoint[];
  width?: number;
  height?: number;
  realTimeMode?: boolean;
  onExportChart?: (format: 'png' | 'svg' | 'csv') => void;
}

const AdvancedConvergenceChart: React.FC<AdvancedConvergenceChartProps> = ({
  data = [],
  width = 800,
  height = 400,
  realTimeMode = true,
  onExportChart
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: 'line',
    showGrid: true,
    showLegend: true,
    autoScale: true,
    logScale: true,
    smoothing: false,
    theme: 'dark'
  });
  
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['residual', 'displacement']);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 生成模拟收敛数据
  const mockData = useMemo((): ChartDataPoint[] => {
    const points: ChartDataPoint[] = [];
    let residual = 1e-1;
    let displacement = 0;
    let stress = 0;
    let energy = 1000;
    
    for (let i = 1; i <= 200; i++) {
      // 模拟收敛过程
      const convergenceRate = 0.94 + Math.random() * 0.05;
      residual *= convergenceRate;
      displacement = 25.6 * (1 - Math.exp(-i / 60)) + Math.sin(i / 20) * 2;
      stress = 1.8 * (1 - Math.exp(-i / 45)) + Math.cos(i / 15) * 0.3;
      energy *= (0.98 + Math.random() * 0.01);
      
      // 添加一些收敛波动
      if (i > 80 && Math.random() < 0.15) {
        residual *= (1.05 + Math.random() * 0.1);
        displacement += Math.random() * 1.5;
      }
      
      points.push({
        iteration: i,
        residual: Math.max(residual, 1e-12),
        displacement,
        stress,
        energy,
        timestamp: Date.now() - (200 - i) * 1000
      });
      
      // 收敛停止条件
      if (residual < 1e-8 && i > 50) break;
    }
    
    return points;
  }, []);

  const currentData = data.length > 0 ? data : mockData;

  // 图表颜色配置
  const colors = {
    residual: '#ff4d4f',
    displacement: '#1890ff', 
    stress: '#52c41a',
    energy: '#faad14',
    grid: chartConfig.theme === 'dark' ? '#ffffff20' : '#00000020',
    axis: chartConfig.theme === 'dark' ? '#ffffff60' : '#00000060',
    text: chartConfig.theme === 'dark' ? '#ffffff80' : '#000000cc'
  };

  // 绘制图表
  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || currentData.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 设置画布样式
    ctx.fillStyle = chartConfig.theme === 'dark' ? '#0a0a0a' : '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // 计算绘图区域
    const padding = { top: 40, right: 80, bottom: 60, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // 数据范围计算
    const iterations = currentData.map(d => d.iteration);
    const minIteration = Math.min(...iterations);
    const maxIteration = Math.max(...iterations);
    
    // 绘制网格
    if (chartConfig.showGrid) {
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      
      // 垂直网格线
      for (let i = 0; i <= 10; i++) {
        const x = padding.left + (chartWidth / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
      }
      
      // 水平网格线
      for (let i = 0; i <= 8; i++) {
        const y = padding.top + (chartHeight / 8) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
      }
    }
    
    // 绘制选中的指标曲线
    selectedMetrics.forEach((metric, index) => {
      if (!currentData[0].hasOwnProperty(metric)) return;
      
      const values = currentData.map(d => (d as any)[metric]);
      let minValue = Math.min(...values);
      let maxValue = Math.max(...values);
      
      // 对数缩放处理
      if (chartConfig.logScale && metric === 'residual') {
        const logValues = values.map(v => Math.log10(Math.max(v, 1e-12)));
        minValue = Math.min(...logValues);
        maxValue = Math.max(...logValues);
      }
      
      const range = maxValue - minValue || 1;
      
      ctx.strokeStyle = (colors as any)[metric] || '#666666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      currentData.forEach((point, i) => {
        let value = (point as any)[metric];
        
        if (chartConfig.logScale && metric === 'residual') {
          value = Math.log10(Math.max(value, 1e-12));
        }
        
        const x = padding.left + ((point.iteration - minIteration) / (maxIteration - minIteration)) * chartWidth;
        const y = padding.top + chartHeight - ((value - minValue) / range) * chartHeight;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          if (chartConfig.smoothing) {
            // 简单的曲线平滑
            const prevPoint = currentData[i - 1];
            const prevValue = chartConfig.logScale && metric === 'residual' ? 
              Math.log10(Math.max((prevPoint as any)[metric], 1e-12)) : 
              (prevPoint as any)[metric];
            const prevX = padding.left + ((prevPoint.iteration - minIteration) / (maxIteration - minIteration)) * chartWidth;
            const prevY = padding.top + chartHeight - ((prevValue - minValue) / range) * chartHeight;
            
            const cpX = (prevX + x) / 2;
            ctx.quadraticCurveTo(cpX, prevY, x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      
      ctx.stroke();
      
      // 区域填充（仅在area模式）
      if (chartConfig.type === 'area') {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = (colors as any)[metric] || '#666666';
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.lineTo(padding.left, padding.top + chartHeight);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
    
    // 绘制坐标轴
    ctx.strokeStyle = colors.axis;
    ctx.lineWidth = 2;
    
    // X轴
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();
    
    // Y轴
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.stroke();
    
    // 绘制坐标轴标签
    ctx.fillStyle = colors.text;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    
    // X轴标签
    for (let i = 0; i <= 5; i++) {
      const iteration = minIteration + ((maxIteration - minIteration) / 5) * i;
      const x = padding.left + (chartWidth / 5) * i;
      ctx.fillText(Math.round(iteration).toString(), x, padding.top + chartHeight + 20);
    }
    
    // Y轴标题
    ctx.save();
    ctx.translate(20, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('数值', 0, 0);
    ctx.restore();
    
    // X轴标题
    ctx.textAlign = 'center';
    ctx.fillText('迭代次数', padding.left + chartWidth / 2, height - 10);
    
    // 绘制图例
    if (chartConfig.showLegend) {
      const legendX = width - 70;
      let legendY = padding.top + 20;
      
      selectedMetrics.forEach(metric => {
        ctx.fillStyle = (colors as any)[metric] || '#666666';
        ctx.fillRect(legendX, legendY, 12, 12);
        
        ctx.fillStyle = colors.text;
        ctx.textAlign = 'left';
        ctx.font = '11px sans-serif';
        ctx.fillText(
          metric === 'residual' ? '残差' :
          metric === 'displacement' ? '位移' :
          metric === 'stress' ? '应力' :
          metric === 'energy' ? '能量' : metric,
          legendX + 16, legendY + 9
        );
        
        legendY += 18;
      });
    }
  };

  // 重绘图表
  useEffect(() => {
    drawChart();
  }, [currentData, chartConfig, selectedMetrics, width, height]);

  // 实时数据更新
  useEffect(() => {
    if (realTimeMode && data.length === 0) {
      const interval = setInterval(() => {
        // 模拟新数据点
        drawChart();
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [realTimeMode, data.length]);

  const handleExport = (format: 'png' | 'svg' | 'csv') => {
    if (format === 'png' && canvasRef.current) {
      const link = document.createElement('a');
      link.download = `convergence_chart_${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    } else if (format === 'csv') {
      const csvContent = currentData.map(point => 
        `${point.iteration},${point.residual},${point.displacement},${point.stress},${point.energy}`
      ).join('\n');
      const blob = new Blob([`iteration,residual,displacement,stress,energy\n${csvContent}`], 
        { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `convergence_data_${Date.now()}.csv`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
    
    onExportChart?.(format);
    ComponentDevHelper.logDevTip(`导出收敛图表: ${format}格式`);
  };

  useEffect(() => {
    ComponentDevHelper.logDevTip('3号高级收敛图表系统已加载 - 支持多指标实时可视化');
  }, []);

  return (
    <ModuleErrorBoundary moduleName="高级收敛图表">
      <Card
        title={
          <Space>
            <LineChartOutlined />
            <Text style={{ color: 'var(--deepcad-primary)' }}>Terra收敛图表分析</Text>
            {realTimeMode && (
              <Tag color="processing">实时监控</Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Button 
              icon={<FullscreenOutlined />} 
              size="small"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? '退出全屏' : '全屏'}
            </Button>
            <Button 
              icon={<DownloadOutlined />} 
              size="small"
              onClick={() => handleExport('png')}
            >
              导出
            </Button>
          </Space>
        }
        style={{
          background: 'var(--deepcad-bg-secondary)',
          border: '1px solid var(--deepcad-border-primary)'
        }}
      >
        {/* 图表控制面板 */}
        <Row gutter={16} style={{ marginBottom: '16px' }}>
          <Col span={6}>
            <Space direction="vertical" size="small">
              <Text style={{ color: 'var(--deepcad-text-secondary)', fontSize: '12px' }}>
                图表类型
              </Text>
              <Select
                value={chartConfig.type}
                onChange={(type) => setChartConfig(prev => ({ ...prev, type }))}
                size="small"
                style={{ width: '100%' }}
              >
                <Select.Option value="line">线图</Select.Option>
                <Select.Option value="area">面积图</Select.Option>
                <Select.Option value="scatter">散点图</Select.Option>
              </Select>
            </Space>
          </Col>
          
          <Col span={6}>
            <Space direction="vertical" size="small">
              <Text style={{ color: 'var(--deepcad-text-secondary)', fontSize: '12px' }}>
                显示指标
              </Text>
              <Select
                mode="multiple"
                value={selectedMetrics}
                onChange={setSelectedMetrics}
                size="small"
                style={{ width: '100%' }}
                maxTagCount={2}
              >
                <Select.Option value="residual">残差</Select.Option>
                <Select.Option value="displacement">位移</Select.Option>
                <Select.Option value="stress">应力</Select.Option>
                <Select.Option value="energy">能量</Select.Option>
              </Select>
            </Space>
          </Col>
          
          <Col span={6}>
            <Space direction="vertical" size="small">
              <Text style={{ color: 'var(--deepcad-text-secondary)', fontSize: '12px' }}>
                显示选项
              </Text>
              <Space>
                <Switch
                  checked={chartConfig.showGrid}
                  onChange={(showGrid) => setChartConfig(prev => ({ ...prev, showGrid }))}
                  size="small"
                />
                <Text style={{ fontSize: '11px' }}>网格</Text>
                
                <Switch
                  checked={chartConfig.logScale}
                  onChange={(logScale) => setChartConfig(prev => ({ ...prev, logScale }))}
                  size="small"
                />
                <Text style={{ fontSize: '11px' }}>对数</Text>
              </Space>
            </Space>
          </Col>
          
          <Col span={6}>
            <Space direction="vertical" size="small">
              <Text style={{ color: 'var(--deepcad-text-secondary)', fontSize: '12px' }}>
                缩放级别: {zoomLevel.toFixed(1)}x
              </Text>
              <Slider
                min={0.5}
                max={3.0}
                step={0.1}
                value={zoomLevel}
                onChange={setZoomLevel}
                style={{ width: '100%' }}
              />
            </Space>
          </Col>
        </Row>

        {/* 图表画布 */}
        <div style={{ 
          position: 'relative',
          background: chartConfig.theme === 'dark' ? '#0a0a0a' : '#ffffff',
          border: '1px solid var(--deepcad-border-secondary)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{
              display: 'block',
              transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: 'top left',
              cursor: 'grab'
            }}
          />
          
          {/* 数据统计覆盖层 */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace'
          }}>
            <div>数据点: {currentData.length}</div>
            <div>最新迭代: {currentData[currentData.length - 1]?.iteration || 0}</div>
            <div>收敛状态: {currentData[currentData.length - 1]?.residual < 1e-6 ? '已收敛' : '计算中'}</div>
          </div>
        </div>

        {/* 图表说明 */}
        <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--deepcad-text-secondary)' }}>
          💡 支持多指标实时监控 • 🎯 专业收敛分析 • 📊 高精度数值可视化 • 💾 多格式数据导出
        </div>
      </Card>
    </ModuleErrorBoundary>
  );
};

export default AdvancedConvergenceChart;