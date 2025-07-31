import React, { useState, useRef } from 'react';
import { Layout, Card, Typography, Tabs, Row, Col, Space, Button, Badge, Alert } from 'antd';
import { 
  AppstoreOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  SafetyOutlined,
  EyeOutlined,
  SettingOutlined
} from '@ant-design/icons';
import GeometryViewport3D from '../components/geometry/GeometryViewport3D';
import GeologyModelingSimple from '../components/geology/GeologyModelingSimple';
import ExcavationModule from '../components/excavation/ExcavationModule';
import SupportModule from '../components/support/SupportModule';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const GeometryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('geology');
  const [modelingProgress, setModelingProgress] = useState({
    geology: false,
    excavation: false,
    support: false
  });
  const viewportRef = useRef(null);

  const handleModuleComplete = (module: 'geology' | 'excavation' | 'support') => {
    setModelingProgress(prev => ({
      ...prev,
      [module]: true
    }));
  };

  const getTabIcon = (module: string) => {
    const isComplete = modelingProgress[module as keyof typeof modelingProgress];
    return isComplete ? <Badge dot color="green" /> : null;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px' }}>
        <div style={{ maxWidth: 1600, margin: '0 auto' }}>
          <Title level={2} style={{ color: '#00d9ff', marginBottom: '24px' }}>
            <AppstoreOutlined style={{ marginRight: '8px' }} />
            几何建模系统
          </Title>

          <Alert
            message="综合建模工作流"
            description="地质建模 → 基坑设计 → 支护结构，完整的工程建模流程"
            type="info"
            showIcon
            style={{ marginBottom: '24px' }}
          />

          <Row gutter={[24, 24]}>
            {/* 左侧控制面板 */}
            <Col span={8}>
              <Card 
                title="建模控制面板"
                extra={
                  <Space>
                    <Button icon={<SettingOutlined />} size="small">
                      全局设置
                    </Button>
                  </Space>
                }
                style={{ height: '700px' }}
              >
                <Tabs 
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  type="card"
                  size="small"
                  tabPosition="top"
                >
                  <TabPane 
                    tab={
                      <span>
                        <EnvironmentOutlined />
                        地质建模
                        {getTabIcon('geology')}
                      </span>
                    } 
                    key="geology"
                  >
                    <div style={{ height: '600px', overflowY: 'auto' }}>
                      <GeologyModelingSimple 
                        onParamsChange={(params) => {
                          console.log('地质建模参数更新:', params);
                        }}
                      />
                      <div style={{ padding: '16px', textAlign: 'center' }}>
                        <Button 
                          type="primary" 
                          onClick={() => handleModuleComplete('geology')}
                          style={{ width: '100%' }}
                        >
                          完成地质建模
                        </Button>
                      </div>
                    </div>
                  </TabPane>
                  
                  <TabPane 
                    tab={
                      <span>
                        <ExperimentOutlined />
                        基坑设计
                        {getTabIcon('excavation')}
                      </span>
                    } 
                    key="excavation"
                  >
                    <div style={{ height: '600px', overflowY: 'auto' }}>
                      <ExcavationModule 
                        params={{
                          depth: 15,
                          layerHeight: 3,
                          slopeRatio: 1.5,
                          slopeAngle: 90,
                          cornerRadius: 2,
                          constructionMethod: 'open_cut'
                        }}
                        onParamsChange={(key, value) => console.log('Excavation params:', key, value)}
                        onGenerate={(data) => {
                          console.log('Generate excavation:', data);
                          handleModuleComplete('excavation');
                        }}
                        status="wait"
                        disabled={!modelingProgress.geology}
                      />
                    </div>
                  </TabPane>
                  
                  <TabPane 
                    tab={
                      <span>
                        <SafetyOutlined />
                        支护结构
                        {getTabIcon('support')}
                      </span>
                    } 
                    key="support"
                  >
                    <div style={{ height: '600px', overflowY: 'auto' }}>
                      <SupportModule 
                        params={{
                          diaphragmWall: {
                            enabled: true,
                            thickness: 800,
                            depth: 25
                          },
                          anchor: { enabled: false, length: 15, angle: 15, hSpacing: 3, vSpacing: 3 },
                          struts: [],
                          monitoring: {
                            inclinometers: true,
                            pressureCells: true,
                            surveyPoints: true
                          }
                        }}
                        onParamsChange={(category, key, value) => console.log('Support params:', category, key, value)}
                        onGenerate={(data) => {
                          console.log('Generate support:', data);
                          handleModuleComplete('support');
                        }}
                        status="wait"
                        disabled={!modelingProgress.excavation}
                      />
                    </div>
                  </TabPane>
                </Tabs>
              </Card>
            </Col>

            {/* 右侧3D视口 */}
            <Col span={16}>
              <Card 
                title={
                  <span>
                    <EyeOutlined style={{ marginRight: '8px' }} />
                    3D综合建模视口
                  </span>
                }
                extra={
                  <Space>
                    <Text style={{ fontSize: '12px', color: '#00d9ff' }}>
                      当前: {
                        activeTab === 'geology' ? '地质建模' :
                        activeTab === 'excavation' ? '基坑设计' : '支护结构'
                      }
                    </Text>
                    <Button icon={<EyeOutlined />} size="small">
                      重置视角
                    </Button>
                  </Space>
                }
                style={{ height: '700px' }}
                styles={{ body: { padding: 0, height: 'calc(100% - 57px)' } }}
              >
                <GeometryViewport3D 
                  ref={viewportRef}
                  currentStep={
                    activeTab === 'geology' ? 0 :
                    activeTab === 'excavation' ? 1 : 2
                  }
                  onAction={(action) => {
                    console.log('3D视口操作:', action);
                  }}
                />
              </Card>

              {/* 建模进度指示器 */}
              <Card style={{ marginTop: '16px' }}>
                <Title level={5} style={{ color: '#00d9ff', marginBottom: '16px' }}>
                  建模进度
                </Title>
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <div style={{ 
                      textAlign: 'center',
                      padding: '12px',
                      background: modelingProgress.geology ? 'rgba(0, 217, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: modelingProgress.geology ? '1px solid #00d9ff' : '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <EnvironmentOutlined 
                        style={{ 
                          fontSize: '24px', 
                          color: modelingProgress.geology ? '#00d9ff' : 'rgba(255,255,255,0.3)',
                          marginBottom: '8px'
                        }} 
                      />
                      <br />
                      <Text style={{ 
                        color: modelingProgress.geology ? '#00d9ff' : 'rgba(255,255,255,0.5)' 
                      }}>
                        地质建模
                      </Text>
                      {modelingProgress.geology && (
                        <div style={{ color: '#52c41a', marginTop: '4px' }}>✓ 完成</div>
                      )}
                    </div>
                  </Col>
                  
                  <Col span={8}>
                    <div style={{ 
                      textAlign: 'center',
                      padding: '12px',
                      background: modelingProgress.excavation ? 'rgba(0, 217, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: modelingProgress.excavation ? '1px solid #00d9ff' : '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <ExperimentOutlined 
                        style={{ 
                          fontSize: '24px', 
                          color: modelingProgress.excavation ? '#00d9ff' : 'rgba(255,255,255,0.3)',
                          marginBottom: '8px'
                        }} 
                      />
                      <br />
                      <Text style={{ 
                        color: modelingProgress.excavation ? '#00d9ff' : 'rgba(255,255,255,0.5)' 
                      }}>
                        基坑设计
                      </Text>
                      {modelingProgress.excavation && (
                        <div style={{ color: '#52c41a', marginTop: '4px' }}>✓ 完成</div>
                      )}
                    </div>
                  </Col>
                  
                  <Col span={8}>
                    <div style={{ 
                      textAlign: 'center',
                      padding: '12px',
                      background: modelingProgress.support ? 'rgba(0, 217, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: modelingProgress.support ? '1px solid #00d9ff' : '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <SafetyOutlined 
                        style={{ 
                          fontSize: '24px', 
                          color: modelingProgress.support ? '#00d9ff' : 'rgba(255,255,255,0.3)',
                          marginBottom: '8px'
                        }} 
                      />
                      <br />
                      <Text style={{ 
                        color: modelingProgress.support ? '#00d9ff' : 'rgba(255,255,255,0.5)' 
                      }}>
                        支护结构
                      </Text>
                      {modelingProgress.support && (
                        <div style={{ color: '#52c41a', marginTop: '4px' }}>✓ 完成</div>
                      )}
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );
};

export default GeometryView;