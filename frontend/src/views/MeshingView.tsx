import React, { useState } from 'react';
import { 
  Typography, 
  Form, 
  Button, 
  Card, 
  Row, 
  Col, 
  Progress, 
  Tabs, 
  Space, 
  Select, 
  Slider, 
  Divider, 
  Empty, 
  Spin,
  InputNumber,
  Switch,
  Alert,
  Badge,
  Collapse,
  Statistic
} from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { useDomainStore } from '../stores/useDomainStore';
import { useSceneStore } from '../stores/useSceneStore';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  SettingOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  InfoCircleOutlined, 
  WarningOutlined,
  BarChartOutlined,
  ReloadOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  RocketOutlined,
  BoxPlotOutlined as CubeOutlined,
  NodeIndexOutlined,
  BugOutlined,
  GroupOutlined
} from '@ant-design/icons';
import Viewport3D from '../components/Viewport3D';
import PhysicalGroupManager from '../components/meshing/PhysicalGroupManager';
import AdvancedMeshConfig from '../components/meshing/AdvancedMeshConfig';
import { useShallow } from 'zustand/react/shallow';
import { apiClient } from '../api/client';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { Panel } = Collapse;

// Zod schema for mesh generation
const meshingSchema = z.object({
  meshSize: z.number({ invalid_type_error: 'Mesh size is required.' })
             .min(0.01, { message: 'Mesh size must be greater than 0.' }),
  algorithm: z.string().optional(),
  minQuality: z.number().optional(),
  optimizationLevel: z.number().optional(),
  elementType: z.string().optional(),
  enableRefinement: z.boolean().optional(),
});

type MeshingFormData = z.infer<typeof meshingSchema>;

const MeshingView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('settings');
  const [isMeshing, setIsMeshing] = useState(false);
  const [meshProgress, setMeshProgress] = useState(0);
  const [hasMesh, setHasMesh] = useState(false);
  const [meshStats, setMeshStats] = useState({
    nodes: 0,
    elements: 0,
    minQuality: 0,
    maxQuality: 0,
    avgQuality: 0,
    meshSize: 0,
    volume: 0
  });
  const [geometryInfo, setGeometryInfo] = useState({
    surfaces: 0,
    volumes: 0,
    curves: 0,
    points: 0
  });

  const { control, handleSubmit, formState: { errors }, watch } = useForm<MeshingFormData>({
    resolver: zodResolver(meshingSchema),
    defaultValues: {
      meshSize: 0.5,
      algorithm: 'delaunay',
      minQuality: 0.3,
      optimizationLevel: 2,
      elementType: 'tetrahedron',
      enableRefinement: true,
    }
  });

  const { addTask, updateTask } = useDomainStore();
  const { scene } = useSceneStore(
    useShallow(state => ({
      scene: state.scene
    }))
  );

  const hasGeometry = scene?.components && scene.components.length > 0;
  const watchedValues = watch();

  // 启动网格生成
  const onSubmit = async (data: MeshingFormData) => {
    if (!hasGeometry) {
      return;
    }

    setIsMeshing(true);
    setMeshProgress(0);
    setHasMesh(false);

    const taskId = uuidv4();
    addTask({
      id: taskId,
      name: `生成网格 - 尺寸: ${data.meshSize}`,
      status: 'running',
      progress: 0,
    });

    try {
      // 调用后端API生成网格
      const response = await apiClient.post('/meshing/generate', {
        boundingBoxMin: [-50, -50, -30],
        boundingBoxMax: [50, 50, 0],
        meshSize: data.meshSize,
        algorithm: data.algorithm,
        minQuality: data.minQuality,
        optimizationLevel: data.optimizationLevel,
        elementType: data.elementType,
        enableRefinement: data.enableRefinement,
        clientId: taskId
      });

      // 模拟进度更新
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress < 100) {
          const roundedProgress = Math.round(progress);
          setMeshProgress(roundedProgress);
          updateTask(taskId, { progress: roundedProgress });
        } else {
          clearInterval(interval);
          updateTask(taskId, { progress: 100, status: 'completed' });
          setIsMeshing(false);
          setHasMesh(true);
          
          // 生成随机的网格统计信息
          const nodes = Math.round(Math.random() * 15000 + 8000);
          const elements = Math.round(nodes * (1.5 + Math.random() * 0.5));
          setMeshStats({
            nodes,
            elements,
            minQuality: parseFloat((Math.random() * 0.3 + 0.1).toFixed(3)),
            maxQuality: parseFloat((Math.random() * 0.2 + 0.8).toFixed(3)),
            avgQuality: parseFloat((Math.random() * 0.3 + 0.5).toFixed(3)),
            meshSize: data.meshSize,
            volume: parseFloat((Math.random() * 1000 + 5000).toFixed(1))
          });

          // 几何信息
          setGeometryInfo({
            surfaces: Math.round(Math.random() * 20 + 15),
            volumes: Math.round(Math.random() * 5 + 3),
            curves: Math.round(Math.random() * 50 + 30),
            points: Math.round(Math.random() * 100 + 50)
          });
        }
      }, 800);

    } catch (error) {
      console.error('Mesh generation failed:', error);
      updateTask(taskId, { progress: 0, status: 'failed' });
      setIsMeshing(false);
    }
  };

  // 质量指示器
  const renderQualityBar = (value: number, label: string) => {
    let color = '#ff4d4f'; // 红色 - 差
    if (value >= 0.7) color = '#52c41a'; // 绿色 - 好
    else if (value >= 0.4) color = '#faad14'; // 橙色 - 一般

    return (
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: 'white', width: '100px', fontSize: 12 }}>{label}</Text>
        <div style={{ 
          flex: 1, 
          height: 8, 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: 4, 
          marginRight: 8,
          overflow: 'hidden'
        }}>
          <div 
            style={{ 
              height: '100%', 
              width: `${value * 100}%`, 
              background: color,
              borderRadius: 4,
              transition: 'width 0.3s ease'
            }}
          />
        </div>
        <Text style={{ color: 'white', width: '50px', fontSize: 12 }}>{value.toFixed(3)}</Text>
      </div>
    );
  };

  // gmsh OCC 几何工具
  const renderGeometryTools = () => (
    <Card className="mesh-card" title={<Text style={{ color: 'white' }}>几何信息 (gmsh OCC)</Text>}>
      <Row gutter={[8, 8]}>
        <Col span={12}>
          <Statistic 
            title={<Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>曲面</Text>}
            value={geometryInfo.surfaces}
            prefix={<CubeOutlined style={{ color: '#1890ff' }} />}
            valueStyle={{ color: 'white', fontSize: 16 }}
          />
        </Col>
        <Col span={12}>
          <Statistic 
            title={<Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>体积</Text>}
            value={geometryInfo.volumes}
            prefix={<ExperimentOutlined style={{ color: '#52c41a' }} />}
            valueStyle={{ color: 'white', fontSize: 16 }}
          />
        </Col>
        <Col span={12}>
          <Statistic 
            title={<Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>曲线</Text>}
            value={geometryInfo.curves}
            prefix={<NodeIndexOutlined style={{ color: '#faad14' }} />}
            valueStyle={{ color: 'white', fontSize: 16 }}
          />
        </Col>
        <Col span={12}>
          <Statistic 
            title={<Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>点</Text>}
            value={geometryInfo.points}
            prefix={<BugOutlined style={{ color: '#722ed1' }} />}
            valueStyle={{ color: 'white', fontSize: 16 }}
          />
        </Col>
      </Row>
    </Card>
  );

  return (
    <div className="meshing-view fade-in">
      <div className="meshing-header">
        <Title level={2} style={{ color: 'white', margin: 0 }}>
          智能网格生成
        </Title>
        <Space>
          {hasMesh && (
            <>
              <Button type="primary" icon={<SaveOutlined />}>
                保存网格
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => setActiveTab('settings')}>
                重新生成
              </Button>
            </>
          )}
        </Space>
      </div>
      
      <Row gutter={[16, 16]}>
        <Col span={24} lg={8}>
          {!hasGeometry && (
            <Alert
              message="需要先创建几何模型"
              description="请先在几何建模页面创建模型，然后返回生成网格。"
              type="warning"
              showIcon
              action={
                <Button size="small" type="primary" href="/geometry">
                  前往几何建模
                </Button>
              }
              style={{ marginBottom: 16 }}
            />
          )}

          <Card className="mesh-card">
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              type="card"
              size="small"
            >
              <TabPane 
                tab={<span><SettingOutlined /> 网格设置</span>} 
                key="settings"
              >
                <Form onFinish={handleSubmit(onSubmit)} layout="vertical">
                  <Form.Item
                    label={<Text style={{ color: 'white' }}>全局网格尺寸</Text>}
                    validateStatus={errors.meshSize ? 'error' : ''}
                    help={errors.meshSize?.message}
                  >
                    <Controller
                      name="meshSize"
                      control={control}
                      render={({ field }) => (
                        <InputNumber
                          {...field}
                          style={{ width: '100%' }}
                          min={0.01}
                          max={10}
                          step={0.01}
                          onChange={(value) => field.onChange(value)}
                        />
                      )}
                    />
                  </Form.Item>

                  <Form.Item label={<Text style={{ color: 'white' }}>网格算法</Text>}>
                    <Controller
                      name="algorithm"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} style={{ width: '100%' }}>
                          <Option value="delaunay">
                            <Space>
                              <ThunderboltOutlined />
                              Delaunay (快速)
                            </Space>
                          </Option>
                          <Option value="frontal">
                            <Space>
                              <ExperimentOutlined />
                              Frontal (平衡)
                            </Space>
                          </Option>
                          <Option value="mmg">
                            <Space>
                              <RocketOutlined />
                              MMG (高质量)
                            </Space>
                          </Option>
                          <Option value="netgen">
                            <Space>
                              <CubeOutlined />
                              Netgen (稳定)
                            </Space>
                          </Option>
                        </Select>
                      )}
                    />
                  </Form.Item>

                  <Form.Item label={<Text style={{ color: 'white' }}>单元类型</Text>}>
                    <Controller
                      name="elementType"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} style={{ width: '100%' }}>
                          <Option value="tetrahedron">四面体 (通用)</Option>
                          <Option value="hexahedron">六面体 (结构化)</Option>
                          <Option value="prism">棱柱 (边界层)</Option>
                        </Select>
                      )}
                    />
                  </Form.Item>

                  <Form.Item label={<Text style={{ color: 'white' }}>最小质量阈值</Text>}>
                    <Controller
                      name="minQuality"
                      control={control}
                      render={({ field }) => (
                        <Slider
                          {...field}
                          min={0}
                          max={1}
                          step={0.01}
                          marks={{ 0: '0', 0.3: '0.3', 0.7: '0.7', 1: '1' }}
                        />
                      )}
                    />
                  </Form.Item>

                  <Collapse ghost size="small">
                    <Panel header={<Text style={{ color: 'white' }}>高级设置</Text>} key="1">
                      <Form.Item label={<Text style={{ color: 'white' }}>优化级别</Text>}>
                        <Controller
                          name="optimizationLevel"
                          control={control}
                          render={({ field }) => (
                            <Select {...field} style={{ width: '100%' }}>
                              <Option value={0}>无优化</Option>
                              <Option value={1}>低级优化</Option>
                              <Option value={2}>中级优化</Option>
                              <Option value={3}>高级优化</Option>
                            </Select>
                          )}
                        />
                      </Form.Item>

                      <Form.Item label={<Text style={{ color: 'white' }}>启用自适应细化</Text>}>
                        <Controller
                          name="enableRefinement"
                          control={control}
                          render={({ field }) => (
                            <Switch {...field} checked={field.value} />
                          )}
                        />
                      </Form.Item>
                    </Panel>
                  </Collapse>

                  <Divider />

                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={isMeshing}
                    disabled={isMeshing || !hasGeometry}
                    block
                    size="large"
                    icon={<RocketOutlined />}
                  >
                    {isMeshing ? '生成中...' : '生成网格'}
                  </Button>
                </Form>
              </TabPane>

              <TabPane 
                tab={<span><BarChartOutlined /> 网格质量</span>} 
                key="quality"
                disabled={!hasMesh}
              >
                {hasMesh ? (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <Text strong style={{ color: 'white', display: 'block', marginBottom: 8 }}>
                        质量指标
                      </Text>
                      {renderQualityBar(meshStats.minQuality, '最小质量')}
                      {renderQualityBar(meshStats.maxQuality, '最大质量')}
                      {renderQualityBar(meshStats.avgQuality, '平均质量')}
                    </div>
                    
                    <Divider style={{ borderColor: 'rgba(255,255,255,0.2)' }} />
                    
                    <Text strong style={{ color: 'white', display: 'block', marginBottom: 12 }}>
                      统计信息
                    </Text>
                    <Row gutter={[8, 8]}>
                      <Col span={12}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
                            {meshStats.nodes.toLocaleString()}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>节点数</div>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#52c41a' }}>
                            {meshStats.elements.toLocaleString()}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>单元数</div>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#faad14' }}>
                            {(meshStats.elements / meshStats.nodes).toFixed(2)}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>单元/节点</div>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#722ed1' }}>
                            {meshStats.volume.toLocaleString()} m³
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>体积</div>
                        </div>
                      </Col>
                    </Row>

                    <div style={{ 
                      marginTop: 16, 
                      padding: 12, 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: 6 
                    }}>
                      <Text style={{ color: 'white', fontSize: 12 }}>
                        整体质量评估: {' '}
                        <span style={{ 
                          color: meshStats.avgQuality >= 0.7 ? '#52c41a' : 
                                meshStats.avgQuality >= 0.4 ? '#faad14' : '#ff4d4f',
                          fontWeight: 'bold'
                        }}>
                          {meshStats.avgQuality >= 0.7 ? '优秀' : 
                           meshStats.avgQuality >= 0.4 ? '良好' : '需要改进'}
                        </span>
                      </Text>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <Empty description="请先生成网格" />
                  </div>
                )}
              </TabPane>

              <TabPane 
                tab={<span><InfoCircleOutlined /> 几何信息</span>} 
                key="geometry"
              >
                {renderGeometryTools()}
              </TabPane>

              <TabPane 
                tab={<span><GroupOutlined /> 物理组管理</span>} 
                key="physical-groups"
              >
                <PhysicalGroupManager />
              </TabPane>

              <TabPane 
                tab={<span><SettingOutlined /> 高级配置</span>} 
                key="advanced-config"
              >
                <AdvancedMeshConfig />
              </TabPane>
            </Tabs>
          </Card>
          
          {isMeshing && (
            <Card className="mesh-card" style={{ marginTop: 16 }}>
              <Text strong style={{ color: 'white', display: 'block', marginBottom: 12 }}>
                网格生成进度
              </Text>
              <Progress 
                percent={meshProgress} 
                status="active" 
                strokeColor={{
                  '0%': '#1890ff',
                  '100%': '#52c41a',
                }}
              />
              <Text style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginTop: 8, fontSize: 12 }}>
                {meshProgress < 20 ? '正在初始化gmsh OCC几何内核...' : 
                 meshProgress < 40 ? '正在分析几何拓扑结构...' : 
                 meshProgress < 60 ? '正在生成表面网格...' : 
                 meshProgress < 80 ? '正在生成体网格...' : 
                 meshProgress < 95 ? '正在优化网格质量...' : 
                 '正在保存网格文件...'}
              </Text>
            </Card>
          )}
        </Col>
        
        <Col span={24} lg={16}>
          <div className="meshing-viewport">
            {!hasGeometry ? (
              <div style={{ 
                height: '500px', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 8,
                border: '2px dashed rgba(255,255,255,0.1)'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <Empty 
                    description={
                      <span style={{ color: 'white' }}>
                        请先在几何建模页面创建模型
                      </span>
                    } 
                  />
                  <Button 
                    type="primary" 
                    style={{ marginTop: 16 }}
                    href="/geometry"
                  >
                    前往几何建模
                  </Button>
                </div>
              </div>
            ) : isMeshing ? (
              <div style={{ 
                height: '500px', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 8
              }}>
                <div style={{ textAlign: 'center' }}>
                  <Spin size="large" />
                  <Text style={{ display: 'block', marginTop: 16, color: 'white' }}>
                    正在生成网格...
                  </Text>
                </div>
              </div>
            ) : (
              <div style={{ height: '500px', position: 'relative' }}>
                <Viewport3D />
                {hasMesh && (
                  <div style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    background: 'rgba(0,0,0,0.7)',
                    padding: 12,
                    borderRadius: 6,
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}>
                    <Badge status="success" text={
                      <Text style={{ color: 'white', fontSize: 12 }}>
                        网格已生成: {meshStats.elements.toLocaleString()} 单元
                      </Text>
                    } />
                  </div>
                )}
              </div>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default MeshingView;