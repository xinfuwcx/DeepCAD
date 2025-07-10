import React, { useState } from 'react';
import { Typography, Form, Input, Button, notification, Card, Row, Col, Progress, Tabs, Space, Select, Slider, Divider, Empty, Spin } from 'antd';
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
  SaveOutlined
} from '@ant-design/icons';
import Viewport3D from '../components/Viewport3D';
import { useShallow } from 'zustand/react/shallow';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// 1. Define the Zod schema
const meshingSchema = z.object({
  meshSize: z.number({ invalid_type_error: 'Mesh size is required.' })
             .min(0.01, { message: 'Mesh size must be greater than 0.' }),
  algorithm: z.string().optional(),
  minQuality: z.number().optional(),
  optimizationLevel: z.number().optional(),
});

// 2. Infer the TypeScript type from the schema
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
    avgQuality: 0
  });

  const { control, handleSubmit, formState: { errors } } = useForm<MeshingFormData>({
    // 3. Use the zodResolver
    resolver: zodResolver(meshingSchema),
    defaultValues: {
      meshSize: 0.5,
      algorithm: 'delaunay',
      minQuality: 0.3,
      optimizationLevel: 2,
    }
  });

  const { addTask, updateTask } = useDomainStore();
  const { scene } = useSceneStore(
    useShallow(state => ({
      scene: state.scene
    }))
  );

  const hasGeometry = scene?.components && scene.components.length > 0;

  const onSubmit = (data: MeshingFormData) => {
    if (!hasGeometry) {
      notification.warning({
        message: 'No Geometry Found',
        description: 'Please create geometry before generating mesh.',
      });
      return;
    }

    notification.success({
      message: 'Meshing Task Started',
      description: `Global mesh size set to ${data.meshSize}.`,
    });

    setIsMeshing(true);
    setMeshProgress(0);
    setHasMesh(false);

    const taskId = uuidv4();
    addTask({
      id: taskId,
      name: `Mesh with size ${data.meshSize}`,
      status: 'running',
      progress: 0,
    });

    // Simulate task progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress < 100) {
        const roundedProgress = Math.round(progress);
        setMeshProgress(roundedProgress);
        updateTask(taskId, { progress: roundedProgress });
      } else {
        clearInterval(interval);
        const finalStatus = Math.random() > 0.3 ? 'completed' : 'failed';
        updateTask(taskId, { progress: 100, status: finalStatus });
        setIsMeshing(false);
        
        if (finalStatus === 'completed') {
          setHasMesh(true);
          // Generate random mesh statistics
          setMeshStats({
            nodes: Math.round(Math.random() * 10000 + 5000),
            elements: Math.round(Math.random() * 20000 + 10000),
            minQuality: parseFloat((Math.random() * 0.3 + 0.1).toFixed(2)),
            maxQuality: parseFloat((Math.random() * 0.3 + 0.7).toFixed(2)),
            avgQuality: parseFloat((Math.random() * 0.3 + 0.4).toFixed(2))
          });
        }
      }
    }, 800);
  };

  const renderQualityBar = (value: number, label: string) => {
    let colorClass = 'poor';
    if (value >= 0.7) colorClass = 'good';
    else if (value >= 0.4) colorClass = 'warning';

    return (
      <div className="quality-indicator">
        <Text style={{ color: 'white', width: '100px' }}>{label}</Text>
        <div className="quality-bar">
          <div 
            className={`quality-bar-inner ${colorClass}`} 
            style={{ width: `${value * 100}%` }}
          />
        </div>
        <Text style={{ color: 'white', width: '50px' }}>{value.toFixed(2)}</Text>
      </div>
    );
  };

  return (
    <div className="meshing-view fade-in">
      <div className="meshing-header">
        <Title level={2} style={{ color: 'white', margin: 0 }}>网格生成</Title>
        <Space>
          {hasMesh && <Button type="primary" icon={<SaveOutlined />}>保存网格</Button>}
        </Space>
      </div>
      
      <Row gutter={[16, 16]}>
        <Col span={24} lg={8}>
          <Card className="meshing-card scale-in">
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              type="card"
            >
              <TabPane 
                tab={<span><SettingOutlined /> 网格设置</span>} 
                key="settings"
              >
                <Form onFinish={handleSubmit(onSubmit)} layout="vertical" className="meshing-form">
                  <Form.Item
                    label={<span style={{ color: 'white' }}>全局网格尺寸</span>}
                    validateStatus={errors.meshSize ? 'error' : ''}
                    help={errors.meshSize?.message}
                  >
                    <Controller
                      name="meshSize"
                      control={control}
                      render={({ field }) => (
                        <Input 
                          {...field}
                          type="number" 
                          step="0.01" 
                          style={{ maxWidth: '200px' }}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? undefined : value);
                          }}
                        />
                      )}
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span style={{ color: 'white' }}>网格算法</span>}
                  >
                    <Controller
                      name="algorithm"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} style={{ width: '200px' }}>
                          <Option value="delaunay">Delaunay</Option>
                          <Option value="frontal">Frontal</Option>
                          <Option value="mmg">MMG</Option>
                          <Option value="netgen">Netgen</Option>
                        </Select>
                      )}
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span style={{ color: 'white' }}>最小质量阈值</span>}
                  >
                    <Controller
                      name="minQuality"
                      control={control}
                      render={({ field }) => (
                        <Slider
                          {...field}
                          min={0}
                          max={1}
                          step={0.01}
                          style={{ width: '200px' }}
                        />
                      )}
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span style={{ color: 'white' }}>优化级别</span>}
                  >
                    <Controller
                      name="optimizationLevel"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} style={{ width: '200px' }}>
                          <Option value={0}>无优化</Option>
                          <Option value={1}>低级优化</Option>
                          <Option value={2}>中级优化</Option>
                          <Option value={3}>高级优化</Option>
                        </Select>
                      )}
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={isMeshing}
                      disabled={isMeshing || !hasGeometry}
                    >
                      {isMeshing ? '生成中...' : '生成网格'}
                    </Button>
                  </Form.Item>
                </Form>
              </TabPane>
              <TabPane 
                tab={<span><BarChartOutlined /> 网格质量</span>} 
                key="quality"
                disabled={!hasMesh}
              >
                {hasMesh ? (
                  <div>
                    <div className="quality-card">
                      <Text strong style={{ color: 'white', display: 'block', marginBottom: '12px' }}>
                        网格质量指标
                      </Text>
                      {renderQualityBar(meshStats.minQuality, '最小质量')}
                      {renderQualityBar(meshStats.maxQuality, '最大质量')}
                      {renderQualityBar(meshStats.avgQuality, '平均质量')}
                    </div>
                    
                    <Text strong style={{ color: 'white', display: 'block', marginBottom: '12px' }}>
                      网格统计信息
                    </Text>
                    <div className="mesh-stats">
                      <div className="stat-item">
                        <div className="stat-value">{meshStats.nodes.toLocaleString()}</div>
                        <div className="stat-label">节点数</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">{meshStats.elements.toLocaleString()}</div>
                        <div className="stat-label">单元数</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">{(meshStats.elements / meshStats.nodes).toFixed(2)}</div>
                        <div className="stat-label">单元/节点比</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">
                          {meshStats.avgQuality >= 0.7 ? '良好' : meshStats.avgQuality >= 0.4 ? '一般' : '较差'}
                        </div>
                        <div className="stat-label">整体质量</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="meshing-empty">
                    <Empty description="请先生成网格" />
                  </div>
                )}
              </TabPane>
            </Tabs>
          </Card>
          
          {isMeshing && (
            <Card className="meshing-card scale-in">
              <Text strong style={{ color: 'white', display: 'block', marginBottom: '12px' }}>
                网格生成进度
              </Text>
              <Progress 
                percent={meshProgress} 
                status="active" 
                className="animated-progress"
              />
              <Text style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginTop: '8px' }}>
                {meshProgress < 30 ? '正在准备几何模型...' : 
                 meshProgress < 60 ? '正在生成表面网格...' : 
                 meshProgress < 90 ? '正在生成体网格...' : 
                 '正在优化网格质量...'}
              </Text>
            </Card>
          )}
        </Col>
        
        <Col span={24} lg={16}>
          <div className="meshing-viewport">
            {!hasGeometry ? (
              <div className="meshing-empty">
                <Empty 
                  description={
                    <span style={{ color: 'white' }}>
                      请先在几何建模页面创建模型
                    </span>
                  } 
                />
                <Button 
                  type="primary" 
                  style={{ marginTop: '16px' }}
                  onClick={() => window.location.href = '/geometry'}
                >
                  前往几何建模
                </Button>
              </div>
            ) : isMeshing ? (
              <div className="meshing-loading">
                <Spin size="large" tip="正在生成网格..." />
              </div>
            ) : (
              <Viewport3D />
            )}
            
            {hasMesh && !isMeshing && (
              <div className="meshing-controls">
                <Space>
                  <Button icon={<ReloadOutlined />} onClick={() => setActiveTab('settings')}>
                    重新生成
                  </Button>
                  <Button type="primary" onClick={() => window.location.href = '/analysis'}>
                    前往分析
                  </Button>
                </Space>
              </div>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default MeshingView; 