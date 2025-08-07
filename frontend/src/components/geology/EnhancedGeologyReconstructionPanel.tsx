/**
 * 增强型地质重建面板
 * 专业的地质建模界面，集成 GemPy 功能
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Card, Row, Col, Button, Space, Typography, Alert, Progress,
  Tabs, Form, Select, InputNumber, Switch, Slider, Upload,
  Table, Tag, Timeline, List, Modal, message, Spin,
  Steps, Collapse, Radio, Checkbox, Tooltip, Input,
  Statistic, Badge, Divider
} from 'antd';
import {
  ThunderboltOutlined, DatabaseOutlined, SettingOutlined,
  PlayCircleOutlined, StopOutlined, EyeOutlined, DownloadOutlined,
  UploadOutlined, ExperimentOutlined, CheckCircleOutlined,
  CloudUploadOutlined, FileSearchOutlined, ReloadOutlined,
  BulbOutlined, DashboardOutlined, LineChartOutlined, BorderOutlined,
  PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined,
  RocketOutlined, MonitorOutlined, SafetyOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

// 导入新的3D视口组件
import GeologyReconstructionViewport3D from './GeologyReconstructionViewport3D';
import './GeologyReconstructionViewport3D.css';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const { Option } = Select;
const { Step } = Steps;
const { Dragger } = Upload;
const { TextArea } = Input;

// ==================== 接口定义 ====================

interface GeologyReconstructionProps {
  onModelGenerated?: (result: GeologyModelResult) => void;
  onStatusChange?: (status: ProcessingStatus) => void;
  onQualityReport?: (report: QualityReport) => void;
}

interface GeologyModelResult {
  modelId: string;
  surfaces: GeologySurface[];
  volumes: GeologyVolume[];
  metadata: ModelMetadata;
  quality: QualityMetrics;
}

interface GeologySurface {
  id: string;
  name: string;
  vertices: Float32Array;
  faces: Uint32Array;
  properties: SurfaceProperties;
}

interface GeologyVolume {
  id: string;
  name: string;
  soilType: string;
  properties: SoilProperties;
  boundingBox: BoundingBox;
}

interface ModelMetadata {
  createdAt: Date;
  processingTime: number;
  dataPoints: number;
  gridResolution: [number, number, number];
  extent: [number, number, number, number, number, number];
}

interface QualityMetrics {
  overallScore: number;
  meshReadiness: boolean;
  dataConsistency: number;
  interpolationAccuracy: number;
  recommendations: string[];
}

interface SurfaceProperties {
  material: string;
  color: string;
  opacity: number;
  roughness: number;
}

interface SoilProperties {
  density: number;
  cohesion: number;
  frictionAngle: number;
  elasticModulus: number;
  poissonRatio: number;
}

interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
}

type ProcessingStatus = 'idle' | 'preparing' | 'processing' | 'completed' | 'error';

interface QualityReport {
  timestamp: Date;
  metrics: QualityMetrics;
  issues: QualityIssue[];
  suggestions: string[];
}

interface QualityIssue {
  type: 'warning' | 'error' | 'info';
  message: string;
  location?: [number, number, number];
  severity: number;
}

// ==================== 主组件 ====================

const EnhancedGeologyReconstructionPanel: React.FC<GeologyReconstructionProps> = ({
  onModelGenerated,
  onStatusChange,
  onQualityReport
}) => {
  // ==================== 状态管理 ====================
  
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('data');
  const [currentStep, setCurrentStep] = useState(0);

  // 数据状态
  const [boreholeData, setBoreholeData] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [modelConfig, setModelConfig] = useState({
    interpolationMethod: 'kriging',
    gridResolution: [50, 50, 50],
    extent: [-1000, 1000, -1000, 1000, -100, 100],
    enableFaults: true,
    qualityThreshold: 0.8
  });

  // 结果状态
  const [modelResult, setModelResult] = useState<GeologyModelResult | null>(null);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [realTimeStats, setRealTimeStats] = useState({
    dataPoints: 0,
    processingTime: 0,
    memoryUsage: 0,
    currentOperation: ''
  });

  // ==================== 事件处理 ====================

  const handleFileUpload = useCallback((file: File) => {
    setSelectedFiles(prev => [...prev, file]);
    
    // 模拟文件解析
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        // 这里可以添加实际的文件解析逻辑
        message.success(`文件 ${file.name} 上传成功`);
      } catch (error) {
        message.error(`文件解析失败: ${error}`);
      }
    };
    reader.readAsText(file);
    
    return false; // 阻止默认上传行为
  }, []);

  const handleStartReconstruction = useCallback(async () => {
    if (selectedFiles.length === 0) {
      message.warning('请先上传钻孔数据文件');
      return;
    }

    setProcessingStatus('preparing');
    setCurrentStep(0);
    onStatusChange?.('preparing');

    try {
      // 模拟地质重建过程
      const steps = [
        '数据预处理',
        '地层识别',
        '插值计算',
        '表面重建',
        '质量评估',
        '模型优化'
      ];

      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i);
        setRealTimeStats(prev => ({
          ...prev,
          currentOperation: steps[i]
        }));
        
        // 模拟处理时间
        await new Promise(resolve => setTimeout(resolve, 1000));
        setProcessingProgress((i + 1) / steps.length * 100);
      }

      // 生成模拟结果
      const result: GeologyModelResult = {
        modelId: `geology_${Date.now()}`,
        surfaces: [],
        volumes: [],
        metadata: {
          createdAt: new Date(),
          processingTime: steps.length,
          dataPoints: boreholeData.length,
          gridResolution: modelConfig.gridResolution as [number, number, number],
          extent: modelConfig.extent as [number, number, number, number, number, number]
        },
        quality: {
          overallScore: 0.85,
          meshReadiness: true,
          dataConsistency: 0.92,
          interpolationAccuracy: 0.78,
          recommendations: [
            '建议在东北角增加钻孔数据点',
            '第3层地质界面插值精度较低，建议检查原始数据'
          ]
        }
      };

      setModelResult(result);
      setProcessingStatus('completed');
      onStatusChange?.('completed');
      onModelGenerated?.(result);

      message.success('地质重建完成！');

    } catch (error) {
      setProcessingStatus('error');
      onStatusChange?.('error');
      message.error(`地质重建失败: ${error}`);
    }
  }, [selectedFiles, boreholeData, modelConfig, onStatusChange, onModelGenerated]);

  // ==================== 渲染组件 ====================

  const renderDataTab = () => (
    <div className="geology-data-tab">
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="钻孔数据上传" size="small">
            <Dragger
              multiple
              accept=".csv,.json,.xlsx"
              beforeUpload={handleFileUpload}
              showUploadList={false}
            >
              <p className="ant-upload-drag-icon">
                <CloudUploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 CSV、JSON、Excel 格式的钻孔数据
              </p>
            </Dragger>
            
            {selectedFiles.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text strong>已上传文件:</Text>
                <List
                  size="small"
                  dataSource={selectedFiles}
                  renderItem={(file) => (
                    <List.Item>
                      <FileSearchOutlined /> {file.name}
                      <Badge count={file.size} showZero={false} />
                    </List.Item>
                  )}
                />
              </div>
            )}
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title="数据统计" size="small">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="钻孔数量"
                  value={boreholeData.length}
                  prefix={<DatabaseOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="数据点"
                  value={realTimeStats.dataPoints}
                  prefix={<BorderOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="文件数"
                  value={selectedFiles.length}
                  prefix={<FileSearchOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {boreholeData.length > 0 && (
        <Card title="钻孔数据预览" style={{ marginTop: 16 }} size="small">
          <Table
            dataSource={boreholeData.slice(0, 10)}
            size="small"
            pagination={false}
            columns={[
              { title: '钻孔ID', dataIndex: 'id', key: 'id' },
              { title: 'X坐标', dataIndex: 'x', key: 'x' },
              { title: 'Y坐标', dataIndex: 'y', key: 'y' },
              { title: '孔口高程', dataIndex: 'elevation', key: 'elevation' },
              { title: '钻孔深度', dataIndex: 'depth', key: 'depth' },
              { title: '地层数', dataIndex: 'layerCount', key: 'layerCount' }
            ]}
          />
        </Card>
      )}
    </div>
  );

  const renderConfigTab = () => (
    <div className="geology-config-tab">
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="插值算法配置" size="small">
            <Form layout="vertical">
              <Form.Item label="插值方法">
                <Select
                  value={modelConfig.interpolationMethod}
                  onChange={(value) => setModelConfig(prev => ({
                    ...prev,
                    interpolationMethod: value
                  }))}
                >
                  <Option value="kriging">普通克里金</Option>
                  <Option value="rbf">径向基函数</Option>
                  <Option value="idw">反距离权重</Option>
                  <Option value="spline">样条插值</Option>
                </Select>
              </Form.Item>
              
              <Form.Item label="网格分辨率">
                <Row gutter={8}>
                  <Col span={8}>
                    <InputNumber
                      placeholder="X"
                      value={modelConfig.gridResolution[0]}
                      onChange={(value) => setModelConfig(prev => ({
                        ...prev,
                        gridResolution: [value || 50, prev.gridResolution[1], prev.gridResolution[2]]
                      }))}
                    />
                  </Col>
                  <Col span={8}>
                    <InputNumber
                      placeholder="Y"
                      value={modelConfig.gridResolution[1]}
                      onChange={(value) => setModelConfig(prev => ({
                        ...prev,
                        gridResolution: [prev.gridResolution[0], value || 50, prev.gridResolution[2]]
                      }))}
                    />
                  </Col>
                  <Col span={8}>
                    <InputNumber
                      placeholder="Z"
                      value={modelConfig.gridResolution[2]}
                      onChange={(value) => setModelConfig(prev => ({
                        ...prev,
                        gridResolution: [prev.gridResolution[0], prev.gridResolution[1], value || 50]
                      }))}
                    />
                  </Col>
                </Row>
              </Form.Item>

              <Form.Item>
                <Space>
                  <Checkbox
                    checked={modelConfig.enableFaults}
                    onChange={(e) => setModelConfig(prev => ({
                      ...prev,
                      enableFaults: e.target.checked
                    }))}
                  >
                    启用断层处理
                  </Checkbox>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title="质量控制" size="small">
            <Form layout="vertical">
              <Form.Item label="质量阈值">
                <Slider
                  min={0.5}
                  max={1.0}
                  step={0.1}
                  value={modelConfig.qualityThreshold}
                  onChange={(value) => setModelConfig(prev => ({
                    ...prev,
                    qualityThreshold: value
                  }))}
                  marks={{
                    0.5: '低',
                    0.7: '中',
                    0.9: '高'
                  }}
                />
              </Form.Item>
              
              <Alert
                type="info"
                message="质量控制建议"
                description="建议质量阈值设置为 0.8 以上，确保模型适合网格生成"
                showIcon
              />
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );

  const renderProcessingTab = () => (
    <div className="geology-processing-tab">
      <Card title="地质重建进度" size="small">
        <Steps
          current={currentStep}
          size="small"
          items={[
            { title: '数据预处理', icon: <DatabaseOutlined /> },
            { title: '地层识别', icon: <ExperimentOutlined /> },
            { title: '插值计算', icon: <ThunderboltOutlined /> },
            { title: '表面重建', icon: <BorderOutlined /> },
            { title: '质量评估', icon: <CheckCircleOutlined /> },
            { title: '模型优化', icon: <RocketOutlined /> }
          ]}
        />
        
        <div style={{ marginTop: 24 }}>
          <Progress
            percent={processingProgress}
            status={processingStatus === 'error' ? 'exception' : 'active'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
          
          <div style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="处理时间"
                  value={realTimeStats.processingTime}
                  suffix="秒"
                  prefix={<MonitorOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="内存使用"
                  value={realTimeStats.memoryUsage}
                  suffix="MB"
                  prefix={<DashboardOutlined />}
                />
              </Col>
              <Col span={12}>
                <div>
                  <Text strong>当前操作: </Text>
                  <Text type="secondary">{realTimeStats.currentOperation}</Text>
                </div>
              </Col>
            </Row>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderResultsTab = () => (
    <div className="geology-results-tab">
      {modelResult ? (
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="模型信息" size="small">
              <div>
                <p><Text strong>模型ID:</Text> {modelResult.modelId}</p>
                <p><Text strong>创建时间:</Text> {modelResult.metadata.createdAt.toLocaleString()}</p>
                <p><Text strong>处理时间:</Text> {modelResult.metadata.processingTime}秒</p>
                <p><Text strong>数据点数:</Text> {modelResult.metadata.dataPoints}</p>
              </div>
            </Card>
          </Col>
          
          <Col span={12}>
            <Card title="质量评估" size="small">
              <div>
                <p>
                  <Text strong>总体评分:</Text> 
                  <Tag color={modelResult.quality.overallScore > 0.8 ? 'green' : 'orange'}>
                    {(modelResult.quality.overallScore * 100).toFixed(1)}%
                  </Tag>
                </p>
                <p>
                  <Text strong>网格就绪:</Text> 
                  <Tag color={modelResult.quality.meshReadiness ? 'green' : 'red'}>
                    {modelResult.quality.meshReadiness ? '是' : '否'}
                  </Tag>
                </p>
                <p><Text strong>数据一致性:</Text> {(modelResult.quality.dataConsistency * 100).toFixed(1)}%</p>
                <p><Text strong>插值精度:</Text> {(modelResult.quality.interpolationAccuracy * 100).toFixed(1)}%</p>
              </div>
            </Card>
          </Col>
          
          <Col span={24}>
            <Card title="优化建议" size="small">
              <List
                size="small"
                dataSource={modelResult.quality.recommendations}
                renderItem={(item) => (
                  <List.Item>
                    <BulbOutlined style={{ color: '#faad14' }} /> {item}
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      ) : (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <ExperimentOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
          <p style={{ marginTop: 16, color: '#999' }}>暂无重建结果</p>
        </div>
      )}
    </div>
  );

  // 渲染3D视口标签页
  const render3DViewportTab = () => (
    <div className="geology-3d-viewport-tab" style={{ height: '600px' }}>
      <GeologyReconstructionViewport3D
        geologicalData={modelResult ? {
          type: 'geological_model',
          version: '1.0',
          timestamp: Date.now(),
          metadata: modelResult.metadata,
          formations: {
            // 转换模型结果为地质数据格式
            'formation_1': {
              type: 'geological_mesh',
              formation: 'Layer 1',
              metadata: {
                vertex_count: 1000,
                face_count: 500,
                has_normals: true,
                has_colors: true,
                has_scalars: false
              },
              geometry: {
                vertices: [],
                normals: [],
                indices: [],
                colors: [],
                scalars: []
              },
              material: {
                color: [0.8, 0.6, 0.4],
                opacity: 0.8,
                transparent: true,
                side: 'DoubleSide'
              }
            }
          },
          statistics: {
            formation_count: 1,
            total_vertices: 1000,
            total_faces: 500,
            conversion_time: 0.5
          }
        } : undefined}
        boreholeData={boreholeData.map(hole => ({
          id: hole.id || `borehole_${Math.random()}`,
          name: hole.name || `钻孔_${hole.id}`,
          x: hole.x || 0,
          y: hole.y || 0,
          z: hole.elevation || 0,
          depth: hole.depth || 10,
          layers: hole.layers?.map(layer => ({
            id: layer.id || `layer_${Math.random()}`,
            name: layer.name || '未命名地层',
            topDepth: layer.topDepth || 0,
            bottomDepth: layer.bottomDepth || 1,
            soilType: layer.soilType || '未知',
            color: layer.color || '#8395a7',
            visible: true,
            opacity: 0.8
          })) || []
        }))}
        onToolSelect={(tool) => {
          console.log('3D工具选择:', tool);
        }}
        onLayerVisibilityChange={(layerId, visible) => {
          console.log('图层可见性变更:', layerId, visible);
        }}
        onRenderModeChange={(mode) => {
          console.log('渲染模式变更:', mode);
        }}
        showToolbar={true}
        showLayerControls={true}
        enableAnimation={true}
      />
    </div>
  );

  // ==================== 主渲染 ====================

  return (
    <div className="enhanced-geology-reconstruction-panel">
      <Card
        title={
          <Space>
            <ExperimentOutlined />
            地质重建
            <Badge
              status={
                processingStatus === 'completed' ? 'success' :
                processingStatus === 'processing' ? 'processing' :
                processingStatus === 'error' ? 'error' : 'default'
              }
              text={
                processingStatus === 'idle' ? '待机' :
                processingStatus === 'preparing' ? '准备中' :
                processingStatus === 'processing' ? '处理中' :
                processingStatus === 'completed' ? '已完成' : '错误'
              }
            />
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={processingStatus === 'processing' || processingStatus === 'preparing'}
              disabled={selectedFiles.length === 0}
              onClick={handleStartReconstruction}
            >
              开始重建
            </Button>
            <Button icon={<ReloadOutlined />}>
              重置
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'data',
              label: (
                <span>
                  <DatabaseOutlined />
                  数据管理
                </span>
              ),
              children: renderDataTab()
            },
            {
              key: 'config',
              label: (
                <span>
                  <SettingOutlined />
                  参数配置
                </span>
              ),
              children: renderConfigTab()
            },
            {
              key: 'processing',
              label: (
                <span>
                  <ThunderboltOutlined />
                  处理进度
                </span>
              ),
              children: renderProcessingTab()
            },
            {
              key: 'results',
              label: (
                <span>
                  <EyeOutlined />
                  结果查看
                </span>
              ),
              children: renderResultsTab()
            },
            {
              key: '3d-viewport',
              label: (
                <span>
                  <EyeOutlined />
                  3D视口
                </span>
              ),
              children: render3DViewportTab()
            }
          ]}
        />
      </Card>
    </div>
  );


};

export default EnhancedGeologyReconstructionPanel;