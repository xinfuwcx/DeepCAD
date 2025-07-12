import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Card, List, Tag, Button, Space, Tooltip, Divider, Breadcrumb, Spin, Statistic, Tabs, Progress, Alert, Badge } from 'antd';
import { FileTextOutlined, BarChartOutlined, ClockCircleOutlined, UserOutlined, HomeOutlined, ArrowUpOutlined, ArrowDownOutlined, DashboardOutlined, ExperimentOutlined, ThunderboltOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import PostProcessingControls from '../components/PostProcessingControls';
import Viewport3D from '../components/Viewport3D';

// 增强的 ResultsViewer 组件
const ResultsViewer: React.FC<{ resultId?: string; result?: ResultData }> = ({ resultId, result }) => {
  const [activeTab, setActiveTab] = useState('visualization');
  const [visualization, setVisualization] = useState({
    resultType: 'displacement',
    deformationScale: 1.0,
    showMesh: true,
    showUndeformed: false,
    colorScheme: 'rainbow',
    showColorbar: true
  });

  const handleVisualizationChange = (config: any) => {
    setVisualization(prev => ({ ...prev, ...config }));
  };

  const renderPhaseResults = () => {
    if (!result?.phases) return null;
    
    return (
      <Card title="各阶段分析结果" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          {result.analysisSequence?.map((phase, index) => {
            const phaseData = result.phases![phase as keyof typeof result.phases];
            const phaseNames = {
              geostatic: 'A0 地应力平衡',
              construction: 'A1 分步施工',
              seepage: 'A2 稳态渗流'
            };
            
            return (
              <Col span={8} key={phase}>
                <Card size="small" className="phase-result-card">
                  <Badge 
                    status={phaseData?.completed ? 'success' : 'error'} 
                    text={
                      <Text style={{ color: 'white', fontWeight: 'bold' }}>
                        {phaseNames[phase as keyof typeof phaseNames]}
                      </Text>
                    } 
                  />
                  {phaseData && (
                    <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.8)' }}>
                      {phase === 'seepage' ? (
                        <>
                          <div>水压力: {phaseData.pressure?.toFixed(1)} kPa</div>
                          <div>流量: {phaseData.flow?.toFixed(3)} m³/s</div>
                        </>
                      ) : (
                        <>
                          <div>位移: {phaseData.displacement?.toFixed(1)} mm</div>
                          <div>应力: {phaseData.stress?.toFixed(1)} kPa</div>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>
    );
  };

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
                {resultId ? (
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
                        当前显示: {visualization.resultType} | 放大: {visualization.deformationScale}x
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
              <div style={{ padding: 16 }}>
                {renderPhaseResults()}
                
                {result?.metrics && (
                  <Card title="计算统计" size="small">
                    <Row gutter={16}>
                      <Col span={6}>
                        <Statistic 
                          title="节点数" 
                          value={result.metrics.totalNodes} 
                          valueStyle={{ color: '#1890ff' }}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic 
                          title="单元数" 
                          value={result.metrics.totalElements} 
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic 
                          title="计算时间" 
                          value={result.metrics.computationTime} 
                          suffix="分钟"
                          precision={1}
                          valueStyle={{ color: '#faad14' }}
                        />
                      </Col>
                      <Col span={6}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 'bold', color: result.metrics.convergence ? '#52c41a' : '#ff4d4f' }}>
                            {result.metrics.convergence ? '✓' : '✗'}
                          </div>
                          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>收敛状态</div>
                        </div>
                      </Col>
                    </Row>
                  </Card>
                )}
              </div>
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
        <PostProcessingControls 
          resultData={result}
          onVisualizationChange={handleVisualizationChange}
          onSettingChange={(setting, value) => {
            setVisualization(prev => ({ ...prev, [setting]: value }));
          }}
        />
      </Col>
    </Row>
  );
};

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface ResultData {
  id: string;
  name: string;
  date: string;
  author: string;
  status: 'completed' | 'failed' | 'processing';
  type: string;
  description: string;
  analysisSequence?: string[];
  phases?: {
    geostatic?: { completed: boolean; displacement: number; stress: number };
    construction?: { completed: boolean; displacement: number; stress: number };
    seepage?: { completed: boolean; pressure: number; flow: number };
  };
  metrics?: {
    totalNodes: number;
    totalElements: number;
    computationTime: number;
    convergence: boolean;
  };
}

const ResultsView: React.FC = () => {
  const { resultId } = useParams<{ resultId?: string }>();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ResultData | null>(null);
  const [relatedResults, setRelatedResults] = useState<ResultData[]>([]);

  useEffect(() => {
    // Simulate loading data
    setLoading(true);
    
    // Mock data - in a real app, this would be an API call
    setTimeout(() => {
      if (resultId) {
        setResult({
          id: resultId,
          name: `Kratos 三步走分析结果 ${resultId}`,
          date: new Date().toLocaleString(),
          author: 'Kratos Solver',
          status: 'completed',
          type: '地质力学序列分析',
          description: '该分析使用Kratos Multiphysics求解器按照v0.8规范执行，包含地应力平衡(A0)、分步施工(A1)和稳态渗流(A2)三个阶段...',
          analysisSequence: ['geostatic', 'construction', 'seepage'],
          phases: {
            geostatic: { completed: true, displacement: 12.5, stress: 180.3 },
            construction: { completed: true, displacement: 45.8, stress: 245.7 },
            seepage: { completed: true, pressure: 25.4, flow: 0.15 }
          },
          metrics: {
            totalNodes: 23456,
            totalElements: 45123,
            computationTime: 3.2,
            convergence: true
          }
        });
        
        setRelatedResults([
          {
            id: '1001',
            name: 'Previous Analysis',
            date: new Date(Date.now() - 86400000).toLocaleString(),
            author: 'System User',
            status: 'completed',
            type: 'Structural Analysis',
            description: 'Previous version of the analysis'
          },
          {
            id: '1002',
            name: 'Alternative Parameters',
            date: new Date(Date.now() - 172800000).toLocaleString(),
            author: 'System User',
            status: 'completed',
            type: 'Structural Analysis',
            description: 'Analysis with alternative parameters'
          }
        ]);
        
        setLoading(false);
      }
    }, 1000);
  }, [resultId]);

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
      <div className="results-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="results-view">
        <Title level={2} style={{ color: 'white' }}>Result Not Found</Title>
        <Text style={{ color: 'white' }}>The requested result could not be found.</Text>
        <div style={{ marginTop: '24px' }}>
          <Button type="primary">
            <Link to="/results">Back to Results</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="results-view">
      <Breadcrumb className="results-breadcrumb">
        <Breadcrumb.Item>
          <Link to="/"><HomeOutlined /> Home</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/results">Results</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{result.name}</Breadcrumb.Item>
      </Breadcrumb>
      
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card className="result-card">
            <Row align="middle" justify="space-between">
              <Col>
                <Title level={2} style={{ margin: 0, color: 'white' }}>{result.name}</Title>
                <Space style={{ marginTop: '8px' }}>
                  {getStatusTag(result.status)}
                  <Text style={{ color: 'white' }}><ClockCircleOutlined /> {result.date}</Text>
                  <Text style={{ color: 'white' }}><UserOutlined /> {result.author}</Text>
                  <Text style={{ color: 'white' }}><FileTextOutlined /> {result.type}</Text>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button icon={<BarChartOutlined />}>Compare</Button>
                  <Button type="primary">Export Report</Button>
                </Space>
              </Col>
            </Row>
            <Divider style={{ borderColor: '#424242' }} />
            <Text style={{ color: 'white', display: 'block', marginBottom: '16px' }}>
              {result.description}
            </Text>
          </Card>
        </Col>

        <Col span={24}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <div className="metric-card">
                <Text className="metric-label">最大位移</Text>
                <div className="metric-value">32.5 mm</div>
                <Text style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <ArrowUpOutlined style={{ color: '#ff4d4f' }} /> 15% 较上次分析
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="metric-card">
                <Text className="metric-label">最大应力</Text>
                <div className="metric-value">245.8 MPa</div>
                <Text style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <ArrowDownOutlined style={{ color: '#52c41a' }} /> 8% 较上次分析
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="metric-card">
                <Text className="metric-label">安全系数</Text>
                <div className="metric-value">1.85</div>
                <Text style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <ArrowUpOutlined style={{ color: '#52c41a' }} /> 5% 较上次分析
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="metric-card">
                <Text className="metric-label">计算时间</Text>
                <div className="metric-value">3.2 min</div>
                <Text style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <ArrowDownOutlined style={{ color: '#52c41a' }} /> 12% 较上次分析
                </Text>
              </div>
            </Col>
          </Row>
        </Col>

        <Col span={24}>
          <ResultsViewer resultId={resultId} result={result} />
        </Col>

        <Col span={24}>
          <Card 
            title={<Title level={4} style={{ margin: 0, color: 'white' }}>Related Results</Title>}
            className="result-card"
          >
            <List
              className="results-list"
              dataSource={relatedResults}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Tooltip title="View Result">
                      <Button type="link" style={{ color: '#1890ff' }}>
                        <Link to={`/results/${item.id}`}>View</Link>
                      </Button>
                    </Tooltip>,
                    <Tooltip title="Compare with Current">
                      <Button type="link" style={{ color: '#1890ff' }}>Compare</Button>
                    </Tooltip>
                  ]}
                >
                  <List.Item.Meta
                    title={<Text style={{ color: 'white' }}>{item.name}</Text>}
                    description={
                      <Space>
                        {getStatusTag(item.status)}
                        <Text style={{ color: '#aaa' }}>{item.date}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ResultsView; 