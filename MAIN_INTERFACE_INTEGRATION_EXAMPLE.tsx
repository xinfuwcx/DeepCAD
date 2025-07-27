/**
 * 主界面集成示例 - 0号架构师参考
 * 演示如何集成2号几何专家的所有增强组件
 */

import React, { useState, useRef, useEffect } from 'react';
import { Layout, Menu, Button, Card, Row, Col, Space, Typography, message, Tabs } from 'antd';
import { 
  EnvironmentOutlined, 
  ToolOutlined, 
  EyeOutlined,
  SettingOutlined,
  RocketOutlined,
  ExperimentOutlined
} from '@ant-design/icons';

// 导入2号专家的增强组件
import EnhancedGeologyModule, { triggerGeologyModelGeneration } from './components/EnhancedGeologyModule';
import EnhancedSupportModule from './components/EnhancedSupportModule';
import GeometryViewport3D, { GeometryViewportRef } from './components/geometry/GeometryViewport3D';
import ExcavationDesign from './components/geometry/ExcavationDesign';

// 导入2号专家的核心服务
import { geometryAlgorithmIntegration } from './services/GeometryAlgorithmIntegration';
import { advancedSupportAlgorithms } from './services/AdvancedSupportStructureAlgorithms';
import { supportAlgorithmOptimizer } from './services/SupportAlgorithmOptimizer';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface MainInterfaceState {
  currentProject: string;
  activeModule: string;
  geometry: {
    currentModel: any;
    supportStructures: any[];
    qualityMetrics: any;
    isProcessing: boolean;
  };
  expertSystem: {
    isConnected: boolean;
    algorithmVersion: string;
    performanceMode: 'speed' | 'balanced' | 'accuracy' | 'quality';
  };
}

const MainInterfaceExample: React.FC = () => {
  const [state, setState] = useState<MainInterfaceState>({
    currentProject: 'DeepCAD基坑工程',
    activeModule: 'geology',
    geometry: {
      currentModel: null,
      supportStructures: [],
      qualityMetrics: null,
      isProcessing: false
    },
    expertSystem: {
      isConnected: true,
      algorithmVersion: 'v2.0.0',
      performanceMode: 'balanced'
    }
  });

  const viewportRef = useRef<GeometryViewportRef>(null);

  // 监听2号专家的各种事件
  useEffect(() => {
    const handleGeologyModelGenerated = (event: CustomEvent) => {
      const { modelId, geometry, quality, performance } = event.detail;
      console.log('主界面收到地质模型:', event.detail);
      
      setState(prev => ({
        ...prev,
        geometry: {
          ...prev.geometry,
          currentModel: { modelId, geometry },
          qualityMetrics: quality,
          isProcessing: false
        }
      }));

      message.success({
        content: (
          <div>
            <div>🎯 2号专家地质建模完成</div>
            <div style={{ fontSize: '11px', marginTop: '2px' }}>
              模型ID: {modelId} | 处理时间: {performance?.processingTime}ms
            </div>
          </div>
        ),
        duration: 6
      });
    };

    const handleAdvancedExcavationGenerated = (event: CustomEvent) => {
      const { geometryId, qualityMetrics, algorithmInfo } = event.detail;
      console.log('主界面收到开挖模型:', event.detail);
      
      setState(prev => ({
        ...prev,
        geometry: {
          ...prev.geometry,
          qualityMetrics,
          isProcessing: false
        }
      }));

      message.success(`开挖模型生成完成 - ${algorithmInfo.expertId}`);
    };

    const handleSupportStructureGenerated = (event: CustomEvent) => {
      const { structureData, analysisResult } = event.detail;
      console.log('主界面收到支护结构:', event.detail);
      
      setState(prev => ({
        ...prev,
        geometry: {
          ...prev.geometry,
          supportStructures: [...prev.geometry.supportStructures, structureData],
          isProcessing: false
        }
      }));

      message.success('支护结构生成完成');
    };

    // 注册事件监听
    window.addEventListener('geologyModelGenerated', handleGeologyModelGenerated as EventListener);
    window.addEventListener('advancedExcavationModelGenerated', handleAdvancedExcavationGenerated as EventListener);
    window.addEventListener('supportStructureGenerated', handleSupportStructureGenerated as EventListener);

    return () => {
      window.removeEventListener('geologyModelGenerated', handleGeologyModelGenerated as EventListener);
      window.removeEventListener('advancedExcavationModelGenerated', handleAdvancedExcavationGenerated as EventListener);
      window.removeEventListener('supportStructureGenerated', handleSupportStructureGenerated as EventListener);
    };
  }, []);

  // 快速操作函数
  const handleQuickGeologyGeneration = async () => {
    setState(prev => ({ ...prev, geometry: { ...prev.geometry, isProcessing: true } }));
    message.info('正在调用2号专家地质建模算法...');
    
    // 使用2号专家的便捷接口
    triggerGeologyModelGeneration({
      kernelType: 'gaussian',
      meshCompatibility: {
        targetMeshSize: 1.8,
        qualityThreshold: 0.7,
        maxElements: 1500000
      },
      optimization: {
        adaptiveRefinement: true,
        cornerPreservation: true,
        useParallelProcessing: true
      }
    });
  };

  const handleOptimizePerformance = async () => {
    try {
      message.info('正在使用2号专家算法优化器...');
      
      const optimization = await supportAlgorithmOptimizer.generateOptimalConfiguration({
        geometryComplexity: 'high',
        performanceTarget: state.expertSystem.performanceMode,
        resourceConstraints: {
          maxMemoryMB: 4096,
          maxProcessingTimeMs: 30000,
          cpuCores: 8
        }
      });

      message.success({
        content: (
          <div>
            <div>⚡ 性能优化完成</div>
            <div style={{ fontSize: '11px', marginTop: '2px' }}>
              预计提升: {optimization.performanceImprovement}% | 
              推荐配置: {optimization.recommendedConfig.mode}
            </div>
          </div>
        ),
        duration: 6
      });
    } catch (error) {
      message.error('性能优化失败');
    }
  };

  const menuItems = [
    {
      key: 'geology',
      icon: <EnvironmentOutlined />,
      label: '地质建模',
      children: [
        { key: 'enhanced-geology', label: '增强RBF插值' },
        { key: 'geology-quality', label: '质量评估' }
      ]
    },
    {
      key: 'excavation',
      icon: <ToolOutlined />,
      label: '开挖设计',
      children: [
        { key: 'excavation-design', label: '开挖方案' },
        { key: 'excavation-analysis', label: '开挖分析' }
      ]
    },
    {
      key: 'support',
      icon: <ExperimentOutlined />,
      label: '支护结构',
      children: [
        { key: 'enhanced-support', label: '智能支护' },
        { key: 'support-optimization', label: '结构优化' }
      ]
    },
    {
      key: 'viewport',
      icon: <EyeOutlined />,
      label: '3D视图'
    }
  ];

  const renderModuleContent = () => {
    switch (state.activeModule) {
      case 'enhanced-geology':
        return (
          <EnhancedGeologyModule
            onModelGenerated={(result) => {
              console.log('地质模型生成结果:', result);
            }}
            onConfigurationChange={(config) => {
              console.log('RBF配置变更:', config);
            }}
            initialConfig={{
              kernelType: 'gaussian',
              meshCompatibility: {
                targetMeshSize: 1.8,
                qualityThreshold: 0.7,
                maxElements: 1500000
              }
            }}
          />
        );
      
      case 'excavation-design':
        return <ExcavationDesign />;
      
      case 'enhanced-support':
        return (
          <EnhancedSupportModule
            onSupportGenerated={(result) => {
              console.log('支护结构生成结果:', result);
            }}
            onOptimizationComplete={(optimization) => {
              console.log('优化完成:', optimization);
            }}
            supportTypes={['diaphragmWall', 'pileSystem', 'anchorSystem']}
          />
        );
      
      case 'viewport':
        return (
          <GeometryViewport3D
            ref={viewportRef}
            boreholes={[]}
            excavations={[]}
            supports={{}}
            onModelLoad={(model) => {
              console.log('3D模型加载:', model);
            }}
            onQualityCheck={(quality) => {
              console.log('质量检查:', quality);
            }}
          />
        );
      
      default:
        return (
          <Card title="欢迎使用DeepCAD深基坑CAE平台">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Title level={3}>🎯 2号几何专家系统已就绪</Title>
              <Text type="secondary">
                版本: {state.expertSystem.algorithmVersion} | 
                性能模式: {state.expertSystem.performanceMode} | 
                连接状态: {state.expertSystem.isConnected ? '已连接' : '断开'}
              </Text>
              <div style={{ marginTop: '24px' }}>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<RocketOutlined />}
                    onClick={handleQuickGeologyGeneration}
                    loading={state.geometry.isProcessing}
                  >
                    快速地质建模
                  </Button>
                  <Button 
                    icon={<SettingOutlined />}
                    onClick={handleOptimizePerformance}
                  >
                    性能优化
                  </Button>
                </Space>
              </div>
            </div>
          </Card>
        );
    }
  };

  return (
    <Layout style={{ height: '100vh' }}>
      {/* 顶部标题栏 */}
      <Header style={{ background: '#001529', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Title level={4} style={{ color: 'white', margin: 0 }}>
              {state.currentProject}
            </Title>
            <Text style={{ color: '#00d9ff', marginLeft: '16px', fontSize: '12px' }}>
              集成2号几何专家系统 {state.expertSystem.algorithmVersion}
            </Text>
          </div>
          
          {/* 状态指示器 */}
          <Space>
            <div style={{ 
              padding: '4px 12px', 
              background: state.geometry.isProcessing ? '#1890ff' : '#52c41a',
              borderRadius: '4px'
            }}>
              <Text style={{ color: 'white', fontSize: '12px' }}>
                {state.geometry.isProcessing ? '处理中...' : '就绪'}
              </Text>
            </div>
            <div style={{ 
              padding: '4px 12px', 
              background: state.expertSystem.isConnected ? '#52c41a' : '#ff4d4f',
              borderRadius: '4px'
            }}>
              <Text style={{ color: 'white', fontSize: '12px' }}>
                专家系统: {state.expertSystem.isConnected ? '在线' : '离线'}
              </Text>
            </div>
          </Space>
        </div>
      </Header>

      <Layout>
        {/* 左侧导航菜单 */}
        <Sider width={250} style={{ background: '#001529' }}>
          <Menu
            mode="inline"
            theme="dark"
            selectedKeys={[state.activeModule]}
            onSelect={({ key }) => setState(prev => ({ ...prev, activeModule: key }))}
            items={menuItems}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>

        {/* 主内容区域 */}
        <Layout style={{ padding: '0' }}>
          <Content style={{ padding: '24px', minHeight: 280, background: '#f0f2f5' }}>
            {/* 质量指标面板 */}
            {state.geometry.qualityMetrics && (
              <Card 
                size="small" 
                style={{ marginBottom: '16px' }}
                title="2号专家质量评估"
              >
                <Row gutter={16}>
                  <Col span={6}>
                    <Text type="secondary">网格质量:</Text>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                      {state.geometry.qualityMetrics.averageElementQuality?.toFixed(3) || 'N/A'}
                    </div>
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">精度等级:</Text>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                      {state.geometry.qualityMetrics.accuracyLevel || 'High'}
                    </div>
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">处理时间:</Text>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#722ed1' }}>
                      {state.geometry.qualityMetrics.processingTime || 0}ms
                    </div>
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">内存使用:</Text>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fa8c16' }}>
                      {state.geometry.qualityMetrics.memoryUsage?.toFixed(1) || 0}MB
                    </div>
                  </Col>
                </Row>
              </Card>
            )}

            {/* 主模块内容 */}
            {renderModuleContent()}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default MainInterfaceExample;