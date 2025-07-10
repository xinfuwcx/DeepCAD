import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Card, List, Tag, Button, Space, Tooltip, Divider, Breadcrumb, Spin, Statistic } from 'antd';
import { FileTextOutlined, BarChartOutlined, ClockCircleOutlined, UserOutlined, HomeOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import ResultsViewer from '../components/ResultsViewer';

const { Title, Text } = Typography;

interface ResultData {
  id: string;
  name: string;
  date: string;
  author: string;
  status: 'completed' | 'failed' | 'processing';
  type: string;
  description: string;
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
          name: `Analysis Result ${resultId}`,
          date: new Date().toLocaleString(),
          author: 'System User',
          status: 'completed',
          type: 'Structural Analysis',
          description: 'This analysis was performed using Kratos Multiphysics solver with the following parameters...'
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
          <ResultsViewer resultId={resultId} />
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