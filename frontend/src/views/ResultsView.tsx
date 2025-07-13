import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Card, List, Tag, Button, Space, Tooltip, Divider, Breadcrumb, Spin, Statistic, Tabs, Progress, Alert, Badge } from 'antd';
import { FileTextOutlined, BarChartOutlined, ClockCircleOutlined, UserOutlined, HomeOutlined, UpOutlined as ArrowUpOutlined, DownOutlined as ArrowDownOutlined, DashboardOutlined, ExperimentOutlined, ThunderboltOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import PostProcessingControls from '../components/PostProcessingControls';
import Viewport3D from '../components/Viewport3D';
import { useResultsStore, ResultData } from '../stores/useResultsStore';
import { useShallow } from 'zustand/react/shallow';

// Enhanced ResultsViewer component
const ResultsViewer: React.FC<{ result?: ResultData | null }> = ({ result }) => {
  const [activeTab, setActiveTab] = useState('visualization');
  const { 
    contour, 
    deformation, 
    updateContourSettings, 
    updateDeformationSettings 
  } = useResultsStore(
    useShallow(state => ({
      contour: state.contour,
      deformation: state.deformation,
      updateContourSettings: state.updateContourSettings,
      updateDeformationSettings: state.updateDeformationSettings
    }))
  );

  return (
    <Row gutter={16}>
      <Col span={16}>
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: 'white' }}>Kratos结果可视化</Text>
              <Space>
                <Button size="small" icon={<EyeOutlined />}>视图设置</Button>
                <Button size="small" icon={<DownloadOutlined />}>导出</Button>
              </Space>
            </div>
          }
          className="result-card"
          style={{ height: 'calc(100vh - 300px)' }}
        >
          <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" size="small">
            <TabPane tab={<Space><DashboardOutlined />三维视图</Space>} key="visualization">
              <div style={{ height: '500px', position: 'relative' }}>
                {result ? (
                  <>
                    <Viewport3D />
                    <div style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: 'rgba(0,0,0,0.7)',
                      padding: '8px 12px',
                      borderRadius: 4,
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}>
                      <Text style={{ color: 'white', fontSize: 12 }}>
                        当前显示: {contour.variable} | 放大: {deformation.scale}x
                      </Text>
                    </div>
                  </>
                ) : (
                  <div style={{
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: 'var(--dark-bg-tertiary)',
                    borderRadius: '4px'
                  }}>
                    <Text style={{ color: 'var(--dark-text-secondary)' }}>请选择一个结果进行查看</Text>
                  </div>
                )}
              </div>
            </TabPane>
            
            <TabPane tab={<Space><BarChartOutlined />数据分析</Space>} key="analysis">
              {/* This part can be populated with real data later */}
            </TabPane>
            
            <TabPane tab={<Space><ExperimentOutlined />对比分析</Space>} key="comparison">
              <div style={{ padding: 16, textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
                <Text>对比分析功能开发中...</Text>
              </div>
            </TabPane>
          </Tabs>
        </Card>
      </Col>
      
      <Col span={8}>
        <PostProcessingControls />
      </Col>
    </Row>
  );
};

const { Title, Text } = Typography;

const ResultsView: React.FC = () => {
  const { resultId } = useParams<{ resultId?: string }>();
  const { 
    loading, 
    error, 
    currentResult, 
    fetchResult 
  } = useResultsStore(
    useShallow(state => ({
      loading: state.loading,
      error: state.error,
      currentResult: state.currentResult,
      fetchResult: state.fetchResult
    }))
  );

  useEffect(() => {
    if (resultId) {
      fetchResult(resultId);
    }
  }, [resultId, fetchResult]);

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'completed':
        return <Tag color="success">Completed</Tag>;
      case 'failed':
        return <Tag color="error">Failed</Tag>;
      case 'processing':
        return <Tag color="processing">Processing</Tag>;
      default:
        return <Tag>Unknown</Tag>;
    }
  };

  if (loading) {
    return (
      <div className="results-loading" style={{ textAlign: 'center', marginTop: '50px' }}>
        <Spin size="large" />
        <Title level={4} style={{ color: 'white', marginTop: 20 }}>正在加载结果...</Title>
      </div>
    );
  }

  if (error) {
    return <Alert message="加载结果失败" description={error} type="error" showIcon />;
  }
  
  if (!currentResult) {
    return (
      <div className="results-view">
        <Title level={2} style={{ color: 'white' }}>未找到结果</Title>
        <Text style={{ color: 'white' }}>请从结果列表中选择一个结果进行查看。</Text>
        <div style={{ marginTop: '24px' }}>
          <Button type="primary">
            <Link to="/results-list">返回列表</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="results-view">
      <Breadcrumb className="results-breadcrumb">
        <Breadcrumb.Item>
          <Link to="/"><HomeOutlined /> 首页</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/results-list">结果列表</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{currentResult.name}</Breadcrumb.Item>
      </Breadcrumb>
      
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card className="result-card">
            <Row align="middle" justify="space-between">
              <Col>
                <Title level={2} style={{ margin: 0, color: 'white' }}>{currentResult.name}</Title>
                <Space style={{ marginTop: '8px' }}>
                  {getStatusTag(currentResult.status)}
                  <Text style={{ color: 'white' }}><ClockCircleOutlined /> {new Date(currentResult.date).toLocaleString()}</Text>
                  <Text style={{ color: 'white' }}><UserOutlined /> {currentResult.author}</Text>
                  <Text style={{ color: 'white' }}><FileTextOutlined /> {currentResult.type}</Text>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button icon={<BarChartOutlined />}>比较</Button>
                  <Button type="primary">导出报告</Button>
                </Space>
              </Col>
            </Row>
            <Divider style={{ borderColor: '#424242' }} />
            <Text style={{ color: 'white', display: 'block', marginBottom: '16px' }}>
              {currentResult.description}
            </Text>
          </Card>
        </Col>

        <Col span={24}>
          <ResultsViewer result={currentResult} />
        </Col>
      </Row>
    </div>
  );
};

export default ResultsView; 