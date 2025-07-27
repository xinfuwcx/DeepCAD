import React, { useState } from 'react';
import { Layout, Card, Typography, Button, Space, Row, Col, Slider, Select, Form, InputNumber, Progress, Alert } from 'antd';
import { 
  AppstoreOutlined, 
  ThunderboltOutlined, 
  SettingOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  SaveOutlined
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const MeshingView: React.FC = () => {
  const [meshType, setMeshType] = useState('tetrahedral');
  const [elementSize, setElementSize] = useState(1.0);
  const [meshQuality, setMeshQuality] = useState(0.8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [meshProgress, setMeshProgress] = useState(0);

  const handleGenerateMesh = async () => {
    setIsGenerating(true);
    setMeshProgress(0);
    
    // 模拟网格生成进度
    const interval = setInterval(() => {
      setMeshProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <Title level={2} style={{ color: '#00d9ff', marginBottom: '24px' }}>
            <AppstoreOutlined style={{ marginRight: '8px' }} />
            网格划分
          </Title>

          <Row gutter={[24, 24]}>
            {/* 左侧控制面板 */}
            <Col span={8}>
              <Card title="网格参数设置" style={{ marginBottom: '24px' }}>
                <Form layout="vertical">
                  <Form.Item label="网格类型">
                    <Select 
                      value={meshType} 
                      onChange={setMeshType}
                      style={{ width: '100%' }}
                    >
                      <Option value="tetrahedral">四面体网格</Option>
                      <Option value="hexahedral">六面体网格</Option>
                      <Option value="mixed">混合网格</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="单元尺寸">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Slider
                        min={0.1}
                        max={5.0}
                        step={0.1}
                        value={elementSize}
                        onChange={(value) => setElementSize(value as number)}
                        marks={{
                          0.1: '精细',
                          2.5: '标准',
                          5.0: '粗糙'
                        }}
                      />
                      <InputNumber
                        value={elementSize}
                        onChange={(value) => setElementSize(value as number)}
                        min={0.1}
                        max={5.0}
                        step={0.1}
                        style={{ width: '100%' }}
                        addonAfter="m"
                      />
                    </Space>
                  </Form.Item>

                  <Form.Item label="网格质量">
                    <Slider
                      min={0.1}
                      max={1.0}
                      step={0.1}
                      value={meshQuality}
                      onChange={setMeshQuality}
                      marks={{
                        0.1: '低',
                        0.5: '中',
                        1.0: '高'
                      }}
                    />
                  </Form.Item>
                </Form>
              </Card>

              <Card title="网格操作">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handleGenerateMesh}
                    loading={isGenerating}
                    disabled={isGenerating}
                    style={{ width: '100%', height: '40px' }}
                  >
                    {isGenerating ? '生成中...' : '生成网格'}
                  </Button>
                  
                  <Button
                    icon={<EyeOutlined />}
                    style={{ width: '100%' }}
                  >
                    预览网格
                  </Button>
                  
                  <Button
                    icon={<SaveOutlined />}
                    style={{ width: '100%' }}
                  >
                    导出网格
                  </Button>
                </Space>
              </Card>

              {isGenerating && (
                <Card title="生成进度" style={{ marginTop: '24px' }}>
                  <Progress 
                    percent={meshProgress} 
                    status={meshProgress === 100 ? "success" : "active"}
                    strokeColor="#00d9ff"
                  />
                  <Text type="secondary">
                    正在生成{meshType === 'tetrahedral' ? '四面体' : meshType === 'hexahedral' ? '六面体' : '混合'}网格...
                  </Text>
                </Card>
              )}
            </Col>

            {/* 右侧3D视口 */}
            <Col span={16}>
              <Card 
                title="网格预览"
                extra={
                  <Space>
                    <Button icon={<SettingOutlined />} size="small">
                      视图设置
                    </Button>
                  </Space>
                }
                style={{ height: '600px' }}
                styles={{ 
                  body: {
                    padding: 0, 
                    height: 'calc(100% - 57px)',
                    background: '#0f0f23',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }
                }}
              >
                <div style={{ 
                  color: '#00d9ff', 
                  textAlign: 'center',
                  fontSize: '16px'
                }}>
                  <ThunderboltOutlined style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }} />
                  <Text style={{ color: '#00d9ff' }}>
                    网格预览窗口
                  </Text>
                  <br />
                  <Text style={{ color: 'rgba(255,255,255,0.5)' }}>
                    生成网格后将在此显示
                  </Text>
                </div>
              </Card>

              {meshProgress === 100 && (
                <Alert
                  message="网格生成完成"
                  description={`成功生成${meshType}网格，单元尺寸：${elementSize}m，质量系数：${meshQuality}`}
                  type="success"
                  showIcon
                  style={{ marginTop: '16px' }}
                />
              )}
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );
};

export default MeshingView;