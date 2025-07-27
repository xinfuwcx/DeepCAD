import React, { useState, useRef, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Tabs, 
  Select, 
  Button, 
  Row, 
  Col, 
  Space,
  Form,
  Tooltip,
  Switch,
  Divider,
  Spin,
  List,
  Tag,
  Statistic,
  Table,
  Modal
} from 'antd';
import { 
  LineChartOutlined,
  BarChartOutlined,
  ExportOutlined,
  CalculatorOutlined,
  SwapOutlined,
  SaveOutlined,
  DeleteOutlined,
  EyeOutlined,
  SettingOutlined,
  PlusOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useResultsStore } from '../stores/useResultsStore';
import { useShallow } from 'zustand/react/shallow';
import * as echarts from 'echarts';

const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface TimeHistoryAnalyzerProps {
  onDataExported?: (data: any) => void;
}

interface TimeSeriesData {
  id: string;
  name: string;
  variable: string;
  component: string;
  nodeId?: number;
  elementId?: number;
  times: number[];
  values: number[];
  statistics?: {
    min: number;
    max: number;
    mean: number;
    std: number;
    peak: number;
    peakTime: number;
  };
  created: Date;
}

interface ComparisonGroup {
  id: string;
  name: string;
  seriesIds: string[];
  color: string;
}

const TimeHistoryAnalyzer: React.FC<TimeHistoryAnalyzerProps> = ({ onDataExported }) => {
  const {
    currentResult,
    animation
  } = useResultsStore(useShallow(state => ({
    currentResult: state.currentResult,
    animation: state.animation
  })));

  const [activeTab, setActiveTab] = useState('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [comparisonGroups, setComparisonGroups] = useState<ComparisonGroup[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [isStatisticsModalVisible, setIsStatisticsModalVisible] = useState(false);
  
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  // 生成设置
  const [generateSettings, setGenerateSettings] = useState({
    variable: 'displacement',
    component: 'magnitude',
    extractionType: 'node', // 'node', 'element', 'path'
    nodeIds: [] as number[],
    elementIds: [] as number[],
    pathPoints: [] as [number, number, number][],
    timeRange: [0, 1] as [number, number],
    samplingRate: 1
  });

  // 可视化设置
  const [visualSettings, setVisualSettings] = useState({
    showGrid: true,
    showLegend: true,
    lineWidth: 2,
    pointSize: 4,
    smoothCurve: false,
    logScale: false,
    normalizeData: false
  });

  const availableVariables = [
    { label: '位移', value: 'displacement', components: ['X', 'Y', 'Z', '模长'] },
    { label: '速度', value: 'velocity', components: ['X', 'Y', 'Z', '模长'] },
    { label: '加速度', value: 'acceleration', components: ['X', 'Y', 'Z', '模长'] },
    { label: '应力', value: 'stress', components: ['XX', 'YY', 'ZZ', 'XY', 'Von Mises'] },
    { label: '应变', value: 'strain', components: ['XX', 'YY', 'ZZ', 'XY', '体积应变'] },
  ];

  const colors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
  ];

  useEffect(() => {
    if (chartRef.current && !chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, 'dark');
    }
    
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (chartInstanceRef.current && timeSeriesData.length > 0) {
      updateChart();
    }
  }, [timeSeriesData, selectedSeries, visualSettings]);

  const handleGenerateTimeSeries = async () => {
    if (!currentResult) {
      console.warn('No current result available for time history analysis');
      return;
    }

    setIsGenerating(true);
    
    try {
      const requestData = {
        result_id: currentResult.id,
        settings: generateSettings
      };

      const response = await fetch('/api/visualization/time-history/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Failed to generate time series: ${response.statusText}`);
      }

      const result = await response.json();
      
      // 创建新的时程数据
      const newSeries: TimeSeriesData = {
        id: `series_${Date.now()}`,
        name: `${generateSettings.variable}_${generateSettings.component}`,
        variable: generateSettings.variable,
        component: generateSettings.component,
        times: result.times || [],
        values: result.values || [],
        statistics: calculateStatistics(result.values || []),
        created: new Date()
      };

      setTimeSeriesData(prev => [...prev, newSeries]);
      setSelectedSeries(prev => [...prev, newSeries.id]);
      
      console.log('Time series generated successfully:', newSeries);
      
    } catch (error) {
      console.error('Failed to generate time series:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const calculateStatistics = (values: number[]) => {
    if (values.length === 0) return undefined;
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    
    const maxIndex = values.indexOf(max);
    const minIndex = values.indexOf(min);
    const peak = Math.abs(max) > Math.abs(min) ? max : min;
    const peakTime = Math.abs(max) > Math.abs(min) ? maxIndex : minIndex;
    
    return { min, max, mean, std, peak, peakTime };
  };

  const updateChart = () => {
    if (!chartInstanceRef.current) return;
    
    const seriesData = timeSeriesData.filter(series => 
      selectedSeries.includes(series.id)
    );
    
    const option = {
      title: {
        text: '时程曲线分析',
        textStyle: { color: '#fff' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: seriesData.map(s => s.name),
        textStyle: { color: '#fff' },
        show: visualSettings.showLegend
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
        show: visualSettings.showGrid
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        name: '时间 (s)',
        nameTextStyle: { color: '#fff' },
        axisLabel: { color: '#fff' },
        axisLine: { lineStyle: { color: '#fff' } }
      },
      yAxis: {
        type: visualSettings.logScale ? 'log' : 'value',
        name: '数值',
        nameTextStyle: { color: '#fff' },
        axisLabel: { color: '#fff' },
        axisLine: { lineStyle: { color: '#fff' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
      },
      series: seriesData.map((series, index) => {
        let values = series.values;
        if (visualSettings.normalizeData && values.length > 0) {
          const max = Math.max(...values);
          const min = Math.min(...values);
          const range = max - min;
          if (range > 0) {
            values = values.map(v => (v - min) / range);
          }
        }
        
        return {
          name: series.name,
          type: 'line',
          smooth: visualSettings.smoothCurve,
          lineStyle: {
            width: visualSettings.lineWidth,
            color: colors[index % colors.length]
          },
          symbol: 'circle',
          symbolSize: visualSettings.pointSize,
          data: series.times.map((time, i) => [time, values[i]])
        };
      })
    };
    
    chartInstanceRef.current.setOption(option);
  };

  const handleExportData = async (format: 'csv' | 'json' | 'png') => {
    try {
      const exportData = {
        series_ids: selectedSeries,
        format: format
      };

      if (format === 'png' && chartInstanceRef.current) {
        // 导出图表为PNG
        const url = chartInstanceRef.current.getDataURL({
          type: 'png',
          pixelRatio: 2,
          backgroundColor: '#1a1a1a'
        });
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `time_history_${Date.now()}.png`;
        link.click();
        return;
      }

      const response = await fetch('/api/visualization/time-history/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `time_history_${Date.now()}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const handleCreateComparison = () => {
    if (selectedSeries.length < 2) return;
    
    const newGroup: ComparisonGroup = {
      id: `group_${Date.now()}`,
      name: `对比组 ${comparisonGroups.length + 1}`,
      seriesIds: [...selectedSeries],
      color: colors[comparisonGroups.length % colors.length]
    };
    
    setComparisonGroups(prev => [...prev, newGroup]);
  };

  const statisticsColumns = [
    { title: '统计量', dataIndex: 'metric', key: 'metric' },
    { title: '数值', dataIndex: 'value', key: 'value', render: (val: number) => val.toFixed(4) },
  ];

  const getStatisticsData = (series: TimeSeriesData) => {
    if (!series.statistics) return [];
    
    return [
      { metric: '最小值', value: series.statistics.min },
      { metric: '最大值', value: series.statistics.max },
      { metric: '均值', value: series.statistics.mean },
      { metric: '标准差', value: series.statistics.std },
      { metric: '峰值', value: series.statistics.peak },
      { metric: '峰值时间', value: series.statistics.peakTime }
    ];
  };

  const renderGeneratePanel = () => (
    <Form layout="vertical" size="small">
      <Row gutter={[12, 8]}>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'white' }}>变量类型</Text>}>
            <Select
              value={generateSettings.variable}
              onChange={(value) => setGenerateSettings(prev => ({ ...prev, variable: value }))}
              style={{ width: '100%' }}
            >
              {availableVariables.map(v => (
                <Option key={v.value} value={v.value}>{v.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'white' }}>分量</Text>}>
            <Select
              value={generateSettings.component}
              onChange={(value) => setGenerateSettings(prev => ({ ...prev, component: value }))}
              style={{ width: '100%' }}
            >
              {availableVariables
                .find(v => v.value === generateSettings.variable)?.components
                .map(c => (
                  <Option key={c} value={c.toLowerCase().replace(/\s+/g, '_')}>
                    {c}
                  </Option>
                ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label={<Text style={{ color: 'white' }}>提取类型</Text>}>
        <Select
          value={generateSettings.extractionType}
          onChange={(value) => setGenerateSettings(prev => ({ ...prev, extractionType: value }))}
          style={{ width: '100%' }}
        >
          <Option value="node">节点</Option>
          <Option value="element">单元</Option>
          <Option value="path">路径</Option>
        </Select>
      </Form.Item>

      <Row gutter={[8, 8]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Button
            type="primary"
            icon={<LineChartOutlined />}
            onClick={handleGenerateTimeSeries}
            loading={isGenerating}
            disabled={!currentResult}
            style={{ width: '100%' }}
          >
            {isGenerating ? '生成中...' : '生成时程曲线'}
          </Button>
        </Col>
      </Row>
    </Form>
  );

  const renderAnalysisPanel = () => (
    <div>
      {timeSeriesData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
            请先生成时程数据
          </Text>
        </div>
      ) : (
        <>
          <Form.Item label={<Text style={{ color: 'white' }}>选择曲线</Text>}>
            <Select
              mode="multiple"
              value={selectedSeries}
              onChange={setSelectedSeries}
              style={{ width: '100%' }}
              placeholder="选择要显示的曲线"
            >
              {timeSeriesData.map(series => (
                <Option key={series.id} value={series.id}>
                  {series.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <div style={{ height: '300px', marginBottom: '16px' }}>
            <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
          </div>

          <Row gutter={[8, 8]}>
            <Col span={8}>
              <Button
                size="small"
                icon={<CalculatorOutlined />}
                onClick={() => setIsStatisticsModalVisible(true)}
                disabled={selectedSeries.length === 0}
                style={{ width: '100%' }}
              >
                统计
              </Button>
            </Col>
            <Col span={8}>
              <Button
                size="small"
                icon={<SwapOutlined />}
                onClick={handleCreateComparison}
                disabled={selectedSeries.length < 2}
                style={{ width: '100%' }}
              >
                对比
              </Button>
            </Col>
            <Col span={8}>
              <Button
                size="small"
                icon={<ExportOutlined />}
                onClick={() => handleExportData('csv')}
                disabled={selectedSeries.length === 0}
                style={{ width: '100%' }}
              >
                导出
              </Button>
            </Col>
          </Row>
        </>
      )}
    </div>
  );

  const renderVisualizationPanel = () => (
    <Form layout="vertical" size="small">
      <Row gutter={[8, 8]}>
        <Col span={12}>
          <Text style={{ color: 'white', fontSize: '12px' }}>显示网格</Text>
          <Switch
            checked={visualSettings.showGrid}
            onChange={(checked) => setVisualSettings(prev => ({ ...prev, showGrid: checked }))}
            size="small"
          />
        </Col>
        <Col span={12}>
          <Text style={{ color: 'white', fontSize: '12px' }}>显示图例</Text>
          <Switch
            checked={visualSettings.showLegend}
            onChange={(checked) => setVisualSettings(prev => ({ ...prev, showLegend: checked }))}
            size="small"
          />
        </Col>
      </Row>

      <Row gutter={[8, 8]}>
        <Col span={12}>
          <Text style={{ color: 'white', fontSize: '12px' }}>平滑曲线</Text>
          <Switch
            checked={visualSettings.smoothCurve}
            onChange={(checked) => setVisualSettings(prev => ({ ...prev, smoothCurve: checked }))}
            size="small"
          />
        </Col>
        <Col span={12}>
          <Text style={{ color: 'white', fontSize: '12px' }}>对数刻度</Text>
          <Switch
            checked={visualSettings.logScale}
            onChange={(checked) => setVisualSettings(prev => ({ ...prev, logScale: checked }))}
            size="small"
          />
        </Col>
      </Row>

      <Row gutter={[8, 8]}>
        <Col span={12}>
          <Text style={{ color: 'white', fontSize: '12px' }}>归一化</Text>
          <Switch
            checked={visualSettings.normalizeData}
            onChange={(checked) => setVisualSettings(prev => ({ ...prev, normalizeData: checked }))}
            size="small"
          />
        </Col>
      </Row>

      <Divider style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '12px 0' }} />

      <Row gutter={[8, 8]}>
        <Col span={8}>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleExportData('png')}
            style={{ width: '100%' }}
          >
            PNG
          </Button>
        </Col>
        <Col span={8}>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleExportData('csv')}
            style={{ width: '100%' }}
          >
            CSV
          </Button>
        </Col>
        <Col span={8}>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleExportData('json')}
            style={{ width: '100%' }}
          >
            JSON
          </Button>
        </Col>
      </Row>
    </Form>
  );

  return (
    <>
      <Card 
        className="time-history-analyzer theme-card result-card" 
        title={<Text style={{ color: 'white' }}>时程曲线分析</Text>}
        style={{ height: '100%' }}
        extra={
          <Space>
            <Tooltip title="设置">
              <Button 
                size="small"
                icon={<SettingOutlined />} 
              />
            </Tooltip>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" size="small">
          <TabPane tab={<span><PlusOutlined />生成</span>} key="generate">
            {renderGeneratePanel()}
          </TabPane>
          <TabPane tab={<span><LineChartOutlined />分析</span>} key="analysis">
            {renderAnalysisPanel()}
          </TabPane>
          <TabPane tab={<span><EyeOutlined />可视化</span>} key="visualization">
            {renderVisualizationPanel()}
          </TabPane>
        </Tabs>

        {timeSeriesData.length > 0 && (
          <>
            <Divider style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '16px 0 8px 0' }} />
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
              已生成 {timeSeriesData.length} 条时程曲线
            </div>
          </>
        )}
      </Card>

      <Modal
        title="统计分析"
        open={isStatisticsModalVisible}
        onCancel={() => setIsStatisticsModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedSeries.length > 0 && (
          <Tabs type="card" size="small">
            {selectedSeries.map(seriesId => {
              const series = timeSeriesData.find(s => s.id === seriesId);
              if (!series) return null;
              
              return (
                <TabPane tab={series.name} key={seriesId}>
                  <Table
                    dataSource={getStatisticsData(series)}
                    columns={statisticsColumns}
                    pagination={false}
                    size="small"
                  />
                </TabPane>
              );
            })}
          </Tabs>
        )}
      </Modal>
    </>
  );
};

export default TimeHistoryAnalyzer;