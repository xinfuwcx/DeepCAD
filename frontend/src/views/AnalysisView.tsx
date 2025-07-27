import React, { useState } from 'react';
import { Layout, Card, Typography, Button, Space, Row, Col, Progress } from 'antd';
import { BarChartOutlined, ThunderboltOutlined, SettingOutlined } from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;

const AnalysisView: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);

  return (
    <Content style={{ padding: '24px', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Title level={2} style={{ color: '#00d9ff', marginBottom: '24px' }}>
          <BarChartOutlined style={{ marginRight: '8px' }} />
          计算分析
        </Title>

        <Row gutter={[24, 24]}>
          <Col span={8}>
            <Card
              title="结构分析"
              extra={<ThunderboltOutlined />}
              style={{ height: '300px' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>配置结构分析参数</Text>
                <Button type="primary" style={{ width: '100%' }}>
                  开始结构分析
                </Button>
              </Space>
            </Card>
          </Col>

          <Col span={8}>
            <Card
              title="流体分析"
              extra={<SettingOutlined />}
              style={{ height: '300px' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>配置流体分析参数</Text>
                <Button type="primary" style={{ width: '100%' }}>
                  开始流体分析
                </Button>
              </Space>
            </Card>
          </Col>

          <Col span={8}>
            <Card
              title="多物理场耦合"
              extra={<BarChartOutlined />}
              style={{ height: '300px' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>配置耦合分析参数</Text>
                <Button type="primary" style={{ width: '100%' }}>
                  开始耦合分析
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>

        {isRunning && (
          <Card style={{ marginTop: '24px' }}>
            <Text strong>分析进行中...</Text>
            <Progress percent={30} status="active" />
          </Card>
        )}
      </div>
    </Content>
  );
};

export default AnalysisView;