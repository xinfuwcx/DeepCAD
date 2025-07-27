import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Space,
  Alert,
  message,
  Divider
} from 'antd';
import {
  ThunderboltOutlined,
  EyeOutlined,
  BarChartOutlined,
  HeatMapOutlined
} from '@ant-design/icons';

import { PyVistaViewer } from '../components/visualization';
import StatusBar from '../components/layout/StatusBar';

const { Title, Text } = Typography;

const PostProcessingView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #0a0a23 0%, #1a1a3a 100%)'
    }}>
      {/* 标题栏 */}
      <div style={{ 
        padding: '16px 24px',
        borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
        background: 'rgba(26, 26, 46, 0.9)'
      }}>
        <Space align="center" size="large">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <HeatMapOutlined style={{ fontSize: '24px', color: '#00d9ff' }} />
            <Title level={3} style={{ margin: 0, color: '#ffffff' }}>
              后处理可视化
            </Title>
          </div>
          
          <Text style={{ color: '#a0a0a0' }}>
            CAE分析结果可视化 - 应力、位移、温度场等
          </Text>
        </Space>
      </div>

      {/* 主内容区 */}
      <div style={{ flex: 1, padding: '16px', overflow: 'hidden' }}>
        {!hasResults ? (
          <Row gutter={16} style={{ height: '100%' }}>
            {/* 欢迎卡片 */}
            <Col span={24}>
              <Card
                style={{ 
                  background: 'rgba(26, 26, 46, 0.9)',
                  border: '1px solid rgba(0, 217, 255, 0.3)',
                  borderRadius: '12px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                bodyStyle={{ 
                  padding: '48px',
                  textAlign: 'center',
                  color: '#ffffff'
                }}
              >
                <div style={{ marginBottom: '32px' }}>
                  <ThunderboltOutlined 
                    style={{ 
                      fontSize: '72px', 
                      color: '#00d9ff',
                      marginBottom: '24px',
                      display: 'block'
                    }} 
                  />
                  <Title level={2} style={{ color: '#ffffff', marginBottom: '16px' }}>
                    欢迎使用后处理可视化系统
                  </Title>
                  <Text style={{ fontSize: '16px', color: '#a0a0a0', lineHeight: '1.6' }}>
                    强大的CAE分析结果可视化平台，支持多种分析类型和专业颜色映射
                  </Text>
                </div>

                <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: '600px' }}>
                  <Alert
                    message="支持的分析类型"
                    description={
                      <div style={{ textAlign: 'left', marginTop: '12px' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <Text strong style={{ color: '#00d9ff' }}>结构分析：</Text>
                          <Text style={{ color: '#ffffff', marginLeft: '8px' }}>
                            Von Mises应力、位移、主应力、应变能
                          </Text>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <Text strong style={{ color: '#00d9ff' }}>传热分析：</Text>
                          <Text style={{ color: '#ffffff', marginLeft: '8px' }}>
                            温度场、热流密度
                          </Text>
                        </div>
                        <div>
                          <Text strong style={{ color: '#00d9ff' }}>岩土分析：</Text>
                          <Text style={{ color: '#ffffff', marginLeft: '8px' }}>
                            沉降、孔隙水压力、安全系数
                          </Text>
                        </div>
                      </div>
                    }
                    type="info"
                    showIcon
                    style={{ 
                      background: 'rgba(0, 217, 255, 0.1)',
                      border: '1px solid rgba(0, 217, 255, 0.3)',
                      color: '#ffffff'
                    }}
                  />

                  <Button
                    type="primary"
                    size="large"
                    icon={<EyeOutlined />}
                    onClick={() => setHasResults(true)}
                    style={{
                      background: 'linear-gradient(135deg, #00d9ff 0%, #0066cc 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      height: '48px',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    开始可视化分析
                  </Button>
                </Space>
              </Card>
            </Col>
          </Row>
        ) : (
          /* PyVista可视化界面 */
          <PyVistaViewer
            showControls={true}
            onSessionChange={(session) => {
              console.log('PyVista session changed:', session);
            }}
          />
        )}
      </div>

      <StatusBar viewType="results" />
    </div>
  );
};

export default PostProcessingView;