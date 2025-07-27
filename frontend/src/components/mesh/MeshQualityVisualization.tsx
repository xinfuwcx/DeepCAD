import React, { useState, useRef, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Tabs, Button, Alert, Tooltip, Tag, Space, Spin } from 'antd';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, ScatterChart, Scatter 
} from 'recharts';
import { 
  CheckCircleOutlined, WarningOutlined, CloseCircleOutlined,
  EyeOutlined, DownloadOutlined, ReloadOutlined, InfoCircleOutlined 
} from '@ant-design/icons';

const { TabPane } = Tabs;

interface QualityMetric {
  metric: string;
  min_value: number;
  max_value: number;
  mean_value: number;
  std_value: number;
  poor_elements: number[];
  acceptable_range: [number, number];
  status: 'excellent' | 'good' | 'acceptable' | 'poor' | 'unacceptable';
}

interface MeshQualityReport {
  mesh_file: string;
  timestamp: string;
  total_nodes: number;
  total_elements: number;
  element_types: Record<string, number>;
  quality_metrics: Record<string, QualityMetric>;
  overall_score: number;
  recommendations: string[];
  visualization_data?: Record<string, any>;
}

interface MeshQualityVisualizationProps {
  meshFile?: string;
  qualityReport?: MeshQualityReport;
  onAnalyze?: (meshFile: string) => void;
  onExportReport?: (format: string) => void;
}

const MeshQualityVisualization: React.FC<MeshQualityVisualizationProps> = ({
  meshFile,
  qualityReport,
  onAnalyze,
  onExportReport
}) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMetric, setSelectedMetric] = useState<string>('aspect_ratio');

  // 质量状态颜色映射
  const getStatusColor = (status: string) => {
    const colors = {
      excellent: '#52c41a',
      good: '#1890ff', 
      acceptable: '#faad14',
      poor: '#ff7875',
      unacceptable: '#ff4d4f'
    };
    return colors[status as keyof typeof colors] || '#d9d9d9';
  };

  // 质量状态图标映射
  const getStatusIcon = (status: string) => {
    const icons = {
      excellent: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      good: <CheckCircleOutlined style={{ color: '#1890ff' }} />,
      acceptable: <InfoCircleOutlined style={{ color: '#faad14' }} />,
      poor: <WarningOutlined style={{ color: '#ff7875' }} />,
      unacceptable: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    };
    return icons[status as keyof typeof icons] || <InfoCircleOutlined />;
  };

  // 生成质量分布数据
  const generateQualityDistribution = (metrics: Record<string, QualityMetric>) => {
    const statusCounts = { excellent: 0, good: 0, acceptable: 0, poor: 0, unacceptable: 0 };
    
    Object.values(metrics).forEach(metric => {
      statusCounts[metric.status]++;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      color: getStatusColor(status)
    }));
  };

  // 生成指标对比数据
  const generateMetricsComparison = (metrics: Record<string, QualityMetric>) => {
    return Object.entries(metrics).map(([name, metric]) => ({
      name: name.replace('_', ' ').toUpperCase(),
      mean: Number(metric.mean_value.toFixed(3)),
      min: Number(metric.min_value.toFixed(3)),
      max: Number(metric.max_value.toFixed(3)),
      std: Number(metric.std_value.toFixed(3)),
      poor_count: metric.poor_elements.length,
      status: metric.status
    }));
  };

  // 网格信息概览卡片
  const renderOverviewCard = () => {
    if (!qualityReport) return null;

    const pieData = generateQualityDistribution(qualityReport.quality_metrics);
    
    return (
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card title="网格基本信息" size="small">
            <Statistic title="节点总数" value={qualityReport.total_nodes} />
            <Statistic title="单元总数" value={qualityReport.total_elements} />
            <div style={{ marginTop: 16 }}>
              <h4>单元类型分布:</h4>
              {Object.entries(qualityReport.element_types).map(([type, count]) => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{type}:</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        
        <Col span={8}>
          <Card title="总体质量评分" size="small">
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={qualityReport.overall_score}
                strokeColor={getStatusColor(
                  qualityReport.overall_score >= 80 ? 'excellent' :
                  qualityReport.overall_score >= 60 ? 'good' :
                  qualityReport.overall_score >= 40 ? 'acceptable' :
                  qualityReport.overall_score >= 20 ? 'poor' : 'unacceptable'
                )}
                size={120}
              />
              <div style={{ marginTop: 16 }}>
                <Tag color={getStatusColor(
                  qualityReport.overall_score >= 80 ? 'excellent' :
                  qualityReport.overall_score >= 60 ? 'good' :
                  qualityReport.overall_score >= 40 ? 'acceptable' :
                  qualityReport.overall_score >= 20 ? 'poor' : 'unacceptable'
                )}>
                  {qualityReport.overall_score >= 80 ? '优秀' :
                   qualityReport.overall_score >= 60 ? '良好' :
                   qualityReport.overall_score >= 40 ? '可接受' :
                   qualityReport.overall_score >= 20 ? '较差' : '不可接受'}
                </Tag>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col span={8}>
          <Card title="质量状态分布" size="small">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={({ status, count }) => count > 0 ? `${status}: ${count}` : ''}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    );
  };

  // 详细指标分析
  const renderMetricsAnalysis = () => {
    if (!qualityReport) return null;

    const metricsData = generateMetricsComparison(qualityReport.quality_metrics);
    
    return (
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="质量指标对比" size="small">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metricsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="mean" fill="#1890ff" name="平均值" />
                <Bar dataKey="std" fill="#faad14" name="标准差" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        
        <Col span={24}>
          <Card title="指标详细信息" size="small">
            <Row gutter={[16, 16]}>
              {Object.entries(qualityReport.quality_metrics).map(([name, metric]) => (
                <Col span={8} key={name}>
                  <Card 
                    size="small" 
                    title={
                      <Space>
                        {getStatusIcon(metric.status)}
                        {name.replace('_', ' ').toUpperCase()}
                      </Space>
                    }
                    style={{ borderColor: getStatusColor(metric.status) }}
                  >
                    <div>
                      <div>平均值: {metric.mean_value.toFixed(3)}</div>
                      <div>范围: [{metric.min_value.toFixed(3)}, {metric.max_value.toFixed(3)}]</div>
                      <div>标准差: {metric.std_value.toFixed(3)}</div>
                      <div>问题单元: {metric.poor_elements.length}</div>
                      <div>可接受范围: [{metric.acceptable_range[0]}, {metric.acceptable_range[1]}]</div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    );
  };

  // 修复建议
  const renderRecommendations = () => {
    if (!qualityReport || !qualityReport.recommendations.length) {
      return (
        <Alert
          message="无修复建议"
          description="当前网格质量良好，暂无需要改进的地方。"
          type="success"
          showIcon
        />
      );
    }

    return (
      <Card title="修复建议" size="small">
        {qualityReport.recommendations.map((recommendation, index) => (
          <Alert
            key={index}
            message={`建议 ${index + 1}`}
            description={recommendation}
            type="info"
            showIcon
            style={{ marginBottom: 8 }}
          />
        ))}
      </Card>
    );
  };

  // 3D可视化区域（占位符）
  const render3DVisualization = () => {
    return (
      <Card title="3D质量可视化" size="small">
        <div style={{ 
          height: 400, 
          background: '#f5f5f5', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '1px dashed #d9d9d9'
        }}>
          <Space direction="vertical" align="center">
            <EyeOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <div>3D网格质量可视化</div>
            <div style={{ color: '#999' }}>（需要集成Three.js或PyVista可视化）</div>
          </Space>
        </div>
      </Card>
    );
  };

  const handleAnalyze = async () => {
    if (!meshFile || !onAnalyze) return;
    
    setLoading(true);
    try {
      await onAnalyze(meshFile);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Card 
        title="网格质量分析" 
        extra={
          <Space>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={handleAnalyze}
              disabled={!meshFile}
            >
              分析网格质量
            </Button>
            <Button 
              icon={<DownloadOutlined />}
              onClick={() => onExportReport?.('json')}
              disabled={!qualityReport}
            >
              导出报告
            </Button>
          </Space>
        }
      >
        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>正在分析网格质量...</div>
          </div>
        )}
        
        {!loading && !qualityReport && (
          <Alert
            message="无质量分析数据"
            description="请先选择网格文件并运行质量分析。"
            type="info"
            showIcon
            style={{ margin: '40px 0' }}
          />
        )}
        
        {!loading && qualityReport && (
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="概览" key="overview">
              {renderOverviewCard()}
            </TabPane>
            
            <TabPane tab="详细指标" key="metrics">
              {renderMetricsAnalysis()}
            </TabPane>
            
            <TabPane tab="修复建议" key="recommendations">
              {renderRecommendations()}
            </TabPane>
            
            <TabPane tab="3D可视化" key="visualization">
              {render3DVisualization()}
            </TabPane>
          </Tabs>
        )}
      </Card>
    </div>
  );
};

export default MeshQualityVisualization;