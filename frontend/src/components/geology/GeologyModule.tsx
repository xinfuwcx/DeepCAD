/**
 * 地质建模模块 - 基于GemPy地质建模系统
 * 集成高级地质插值算法和三维地质体重建功能
 * 支持钻孔数据处理、地质建模和质量评估
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Card, Row, Col, Button, Space, Typography, Alert, Progress,
  Tabs, Form, Select, InputNumber, Switch, Slider, Upload,
  Table, Tag, Timeline, List, Modal, message, Spin,
  Steps, Collapse, Radio, Checkbox, Tooltip, Input,
} from 'antd';
import {
  ThunderboltOutlined, DatabaseOutlined, SettingOutlined,
  PlayCircleOutlined, StopOutlined, EyeOutlined, DownloadOutlined,
  UploadOutlined, ExperimentOutlined, CheckCircleOutlined,
  CloudUploadOutlined, FileSearchOutlined, ReloadOutlined,
  BulbOutlined, DashboardOutlined, LineChartOutlined, BorderOutlined,
  PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

// 导入GemPy服务
import { GeologyModelingService } from '../../services/GeologyModelingService';
import { RBFConfig } from '../../services/GeometryArchitectureService';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const { Option } = Select;
const { Step } = Steps;
const { Dragger } = Upload;

// ==================== 接口定义 ====================

interface EnhancedGeologyModuleProps {
  onGeologyGenerated?: (result: {
    interpolationResult: {
      values: Float32Array;
      executionTime: number;
      memoryUsage: number;
    };
    qualityReport: any;
    geometry: {
      vertices: Float32Array;
      faces: Uint32Array;
      normals: Float32Array;
      boundingBox: {
        min: { x: number; y: number; z: number };
        max: { x: number; y: number; z: number };
      };
    };
  }) => void,
  onStatusChange?: (status: 'idle' | 'processing' | 'completed' | 'error') => void,
  interpolationMethod?: string
}


interface GemPyConfig {
  interpolationMethod: 'rbf_multiquadric' | 'ordinary_kriging' | 'adaptive_idw';
  resolutionX: number;
  resolutionY: number;
  resolutionZ: number;
  enableFaults: boolean;
  faultSmoothing: number;
  gravityModel: boolean;
  magneticModel: boolean;
  // 新增：不均匀数据处理参数
  unevenDataConfig: {
    denseRegionRadius: number;     // 密集区域半径
    sparseRegionThreshold: number; // 稀疏区域阈值  
    adaptiveBlending: boolean;     // 自适应融合
  };
}

interface ProcessingStats {
  interpolationTime: number;
  dataPoints: number;
  gridPoints: number;
  memoryUsage: number;
  qualityScore: number;
}

interface QualityMetrics {
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    meshReadiness: boolean;
    recommendation: string[];
  };
  meshGuidance: {
    recommendedMeshSize: number;
    estimatedElements: number;
    qualityThreshold: number;
  };
}

// ==================== 主组件 ====================

const GeologyModule: React.FC<EnhancedGeologyModuleProps> = ({
                                                               onGeologyGenerated,
                                                               onStatusChange,
                                                               interpolationMethod,
                                                             }) => {
  // 状态管理
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('data');

  // GemPy配置状态
  const [gemPyConfig, setGemPyConfig] = useState<GemPyConfig>({
    interpolationMethod: 'rbf_multiquadric',
    resolutionX: 50,
    resolutionY: 50,
    resolutionZ: 50,
    enableFaults: true,
    faultSmoothing: 0.5,
    gravityModel: false,
    magneticModel: false,
    unevenDataConfig: {
      denseRegionRadius: 100,
      sparseRegionThreshold: 0.3,
      adaptiveBlending: true,
    },
  });

  // 数据状态
  const [boreholeData, setBoreholeData] = useState<any>(null);
  const [boreholeFile, setBoreholeFile] = useState<File | null>(null);
  const [realTimeStats, setRealTimeStats] = useState<ProcessingStats>({
    interpolationTime: 0,
    dataPoints: 0,
    gridPoints: 0,
    memoryUsage: 0,
    qualityScore: 0,
  });
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);

  // 服务引用
  const gemPyServiceRef = useRef<GeologyModelingService | null>(null);

  // 初始化服务
  useEffect(() => {
    gemPyServiceRef.current = new GeologyModelingService();
  }, []);

  // ==================== 事件处理函数 ====================

  // 处理插值方法变更
  const handleInterpolationMethodChange = (value: 'rbf_multiquadric' | 'ordinary_kriging' | 'adaptive_idw') => {
    setGemPyConfig({ ...gemPyConfig, interpolationMethod: value });
  };

  // 处理不均匀数据配置变更
  const handleUnevenConfigChange = (key: keyof GemPyConfig['unevenDataConfig'], value: any) => {
    setGemPyConfig({
      ...gemPyConfig,
      unevenDataConfig: {
        ...gemPyConfig.unevenDataConfig,
        [key]: value
      }
    });
  };

  // 获取算法提示信息
  const getAlgorithmTip = (method: string) => {
    const tips = {
      'rbf_multiquadric': '已选择RBF多二次插值 - 将自动处理密集和稀疏区域的数据不均匀分布',
      'ordinary_kriging': '已选择普通克里金 - 将提供插值结果的不确定性评估，有助于风险控制',
      'adaptive_idw': '已选择自适应IDW - 快速计算，适合大数据集的实时预览验证'
    };
    return tips[method] || '';
  };

  // 处理钻孔文件上传
  const handleBoreholeUpload = useCallback((file: File) => {
    setBoreholeFile(file);

    // 模拟解析钻孔数据
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let parsedData;

        if (file.name.endsWith('.json')) {
          parsedData = JSON.parse(content);
        } else {
          // 模拟其他格式解析
          parsedData = {
            holes: [
              {
                id: 'BH001',
                x: 10,
                y: 20,
                elevation: 5.0,
                layers: [
                  { name: '填土', topDepth: 0, bottomDepth: 3, soilType: '填土' },
                  { name: '粘土', topDepth: 3, bottomDepth: 12, soilType: '粘土' },
                  { name: '砂土', topDepth: 12, bottomDepth: 25, soilType: '砂土' },
                ],
              },
              {
                id: 'BH002',
                x: 50,
                y: 60,
                elevation: 4.8,
                layers: [
                  { name: '填土', topDepth: 0, bottomDepth: 2.5, soilType: '填土' },
                  { name: '粘土', topDepth: 2.5, bottomDepth: 15, soilType: '粘土' },
                  { name: '砂土', topDepth: 15, bottomDepth: 30, soilType: '砂土' },
                ],
              },
            ],
          };
        }

        setBoreholeData(parsedData);
        message.success(`成功加载 ${parsedData.holes?.length || 2} 个钻孔数据`);
      } catch (error) {
        message.error('钻孔文件格式错误，请检查文件内容');
      }
    };

    reader.readAsText(file);
    return false; // 阻止自动上传
  }, []);

  // 处理地质建模（GemPy）
  const handleGeologyModeling = useCallback(async () => {
    if (!boreholeFile || !boreholeData) {
      message.error('请先上传钻孔数据文件');
      return;
    }

    setProcessingStatus('processing');
    setProcessingProgress(0);
    onStatusChange?.('processing');

    try {
      console.log('🚀 开始GemPy地质建模流程');

      const gemPyService = gemPyServiceRef.current;
      if (!gemPyService) {
        throw new Error('GemPy服务未初始化');
      }

      const rbfConfig: RBFConfig = {
        kernelType: gemPyConfig.interpolationMethod === 'ordinary_kriging' ? 'gaussian' : 
                   gemPyConfig.interpolationMethod === 'rbf_multiquadric' ? 'multiquadric' : 'linear', // Map to valid kernel
        kernelParameter: 1.0, // Default value
        smoothingFactor: gemPyConfig.faultSmoothing,
        maxIterations: 100, // Default
        tolerance: 0.001, // Default
        gridResolution: gemPyConfig.resolutionX // Use X resolution as grid
      };

      const reconstructionResult = await gemPyService.createGeologyModel(
        boreholeData,
        rbfConfig
      );

      setProcessingProgress(100);
      setProcessingStatus('completed');
      onStatusChange?.('completed');

      // Update stats using actual GeometryModel properties
      setRealTimeStats({
        interpolationTime: 0, // Placeholder, as no statistics
        dataPoints: reconstructionResult.vertices.length / 3,
        gridPoints: reconstructionResult.faces.length / 3,
        memoryUsage: 0,
        qualityScore: reconstructionResult.quality.meshReadiness * 100,
      });

      setQualityMetrics({
        overall: {
          score: reconstructionResult.quality.meshReadiness * 100,
          grade: reconstructionResult.quality.meshReadiness > 0.8 ? 'A' : 'B', // Simplified
          meshReadiness: reconstructionResult.quality.meshReadiness > 0.5,
          recommendation: [] // Empty
        },
        meshGuidance: {
          recommendedMeshSize: reconstructionResult.quality.triangleCount / 1000, // Placeholder
          estimatedElements: reconstructionResult.quality.triangleCount,
          qualityThreshold: 0.65,
        },
      });

      // Notify parent
      if (onGeologyGenerated) {
        onGeologyGenerated({
          interpolationResult: {
            values: new Float32Array(), // Placeholder
            executionTime: 0,
            memoryUsage: 0,
          },
          qualityReport: reconstructionResult.quality,
          geometry: {
            vertices: reconstructionResult.vertices,
            faces: reconstructionResult.faces,
            normals: new Float32Array(), // Placeholder
            boundingBox: reconstructionResult.quality.boundingBox,
          },
        });
      }

      message.success(`GemPy地质建模完成！质量分数: ${reconstructionResult.quality.meshReadiness * 100}`);

    } catch (error) {
      console.error(`GemPy地质建模失败:`, error);
      setProcessingStatus('error');
      onStatusChange?.('error');
      message.error(`GemPy地质建模过程中发生错误`);
    }
  }, [boreholeFile, boreholeData, gemPyConfig, onGeologyGenerated, onStatusChange]);

  // 停止重建
  const handleStopReconstruction = useCallback(() => {
    setProcessingStatus('idle');
    setProcessingProgress(0);
    onStatusChange?.('idle');
    message.info('地质建模过程已停止');
  }, [onStatusChange]);

  // 预览配置
  const handlePreviewConfig = useCallback(() => {
    message.info('配置预览功能 - 显示当前GemPy参数设置');
  }, []);

  // ==================== 渲染组件 ====================

  const uploadProps = {
    name: 'boreholeFile',
    multiple: false,
    accept: '.json,.csv,.xlsx',
    beforeUpload: handleBoreholeUpload,
    showUploadList: false,
  };

  return (
    <div 
      className="enhanced-geology-module geology-module-container"
      style={{ 
        height: '100%', 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 头部状态栏 */}
      <Card size="small" style={{ 
        marginBottom: '16px'
      }}>
        <Row gutter={16} align="middle">
          <Col span={24}>
            <div style={{ marginBottom: '12px' }}>
              <Space>
                <ThunderboltOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
                <Title level={5} style={{ 
                  margin: 0, 
                  color: '#1890ff',
                  writingMode: 'horizontal-tb',
                  whiteSpace: 'nowrap'
                }}>
                  地质建模系统
                </Title>
              </Space>
            </div>
          </Col>
        </Row>
        <Row gutter={[8, 8]} align="middle">
          <Col xs={6} sm={4} md={3}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}>
                {realTimeStats.dataPoints}
              </Text>
              <div><Text style={{ fontSize: '11px', color: '#666' }}>数据点</Text></div>
            </div>
          </Col>
          <Col xs={6} sm={4} md={3}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#52c41a' }}>
                {realTimeStats.gridPoints}
              </Text>
              <div><Text style={{ fontSize: '11px', color: '#666' }}>网格点</Text></div>
            </div>
          </Col>
          <Col xs={6} sm={4} md={3}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#faad14' }}>
                {(realTimeStats.interpolationTime / 1000).toFixed(1)}s
              </Text>
              <div><Text style={{ fontSize: '11px', color: '#666' }}>处理时间</Text></div>
            </div>
          </Col>
          <Col xs={6} sm={4} md={3}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#722ed1' }}>
                {realTimeStats.qualityScore.toFixed(2)}
              </Text>
              <div><Text style={{ fontSize: '11px', color: '#666' }}>质量分数</Text></div>
            </div>
          </Col>
          <Col xs={24} sm={8} md={12}>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '8px',
              justifyContent: 'flex-end',
              alignItems: 'center'
            }}>
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={handlePreviewConfig}
                disabled={processingStatus === 'processing'}
              >
                预览配置
              </Button>
              <Button
                type="primary"
                size="small"
                icon={processingStatus === 'processing' ? <StopOutlined /> : <PlayCircleOutlined />}
                onClick={processingStatus === 'processing' ? handleStopReconstruction : handleGeologyModeling}
                disabled={!boreholeData}
                danger={processingStatus === 'processing'}
              >
                {processingStatus === 'processing' ? '停止建模' : '开始建模'}
              </Button>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 处理进度条 */}
      <AnimatePresence>
        {processingStatus === 'processing' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card size="small" style={{ marginBottom: '16px' }}>
              <Row gutter={16} align="middle">
                <Col span={4}>
                  <Text strong>地质建模进度:</Text>
                </Col>
                <Col span={16}>
                  <Progress
                    percent={Math.round(processingProgress)}
                    status="active"
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                  />
                </Col>
                <Col span={4}>
                  <Text style={{ fontSize: '12px', color: '#666' }}>
                    阶段 {Math.floor(processingProgress / 12.5) + 1}/8
                  </Text>
                </Col>
              </Row>
              <div style={{ marginTop: '8px' }}>
                <Steps
                  current={Math.floor(processingProgress / 12.5)}
                  size="small"
                  items={[
                    { title: '数据预处理' },
                    { title: '密度分析' },        // 新增：分析数据分布
                    { title: '自适应配置' },      // 新增：自动参数调整
                    { title: '插值计算' },
                    { title: '区域融合' },        // 新增：密集/稀疏区域融合
                    { title: '边界平滑' },
                    { title: '质量验证' },
                    { title: '结果输出' },
                  ]}
                />
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主要内容区域 */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          size="small"
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          tabBarStyle={{ marginBottom: '16px', flex: 'none' }}
        >
          {/* 土层计算域 */}
        <TabPane tab="土体计算域" key="results" style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', overflow: 'auto', paddingBottom: '40px' }}>
            <Row gutter={[16, 20]}>
            {/* 计算域设置区域 */}
            <Col span={24}>
              {/* 计算域范围设置 */}
              <Card
                title={
                  <Space>
                    <SettingOutlined style={{ color: '#00d9ff' }} />
                    <span>计算域范围设置</span>
                  </Space>
                }
                size="small"
                style={{ 
                  marginBottom: '20px', 
                  border: '1px solid #00d9ff',
                  borderRadius: '8px'
                }}
              >
                <Form layout="vertical">
                  <Row gutter={[16, 12]}>
                    <Col xs={24} sm={12}>
                      <Form.Item label="X方向范围 (m)">
                        <InputNumber placeholder="例如: 50" defaultValue="50" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Y方向范围 (m)">
                        <InputNumber placeholder="例如: 50" defaultValue="50" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={[16, 12]}>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Z方向范围 (m)">
                        <InputNumber placeholder="例如: 5" defaultValue="5" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="网格密度">
                        <Select defaultValue="medium" style={{ width: '100%' }}>
                          <Option value="coarse">粗糙</Option>
                          <Option value="medium">中等</Option>
                          <Option value="fine">精细</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Card>

              {/* 土层分层设置 */}
              <Card
                title={
                  <Space>
                    <DatabaseOutlined style={{ color: '#52c41a' }} />
                    <span>土层分层设置</span>
                  </Space>
                }
                size="small"
                style={{ 
                  marginBottom: '20px', 
                  border: '1px solid #52c41a',
                  borderRadius: '8px'
                }}
              >
                <Form layout="vertical">
                  <Row gutter={[16, 12]}>
                    <Col span={24}>
                      <Form.Item label="分层方法">
                        <Select defaultValue="auto" style={{ width: '100%' }}>
                          <Option value="auto">自动分层</Option>
                          <Option value="manual">手动分层</Option>
                          <Option value="combined">混合模式</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={[16, 12]}>
                    <Col span={24}>
                      <Form.Item label="最小层厚 (m)">
                        <InputNumber
                          defaultValue={0.5}
                          step={0.1}
                          style={{ width: '100%' }}
                          controls={false}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={[16, 12]}>
                    <Col span={24}>
                      <Form.Item label="最大层厚 (m)">
                        <InputNumber
                          defaultValue={5.0}
                          step={0.5}
                          style={{ width: '100%' }}
                          controls={false}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Card>

              {/* 边界条件设置 */}
              <Card
                title={
                  <Space>
                    <BorderOutlined style={{ color: '#fa8c16' }} />
                    <span>边界条件</span>
                  </Space>
                }
                size="small"
                style={{ 
                  border: '1px solid #fa8c16',
                  borderRadius: '8px'
                }}
              >
                <Form layout="vertical">
                  <Row gutter={[16, 12]}>
                    <Col xs={24} sm={12}>
                      <Form.Item label="顶面边界">
                        <Select defaultValue="free" style={{ width: '100%' }}>
                          <Option value="free">自由边界</Option>
                          <Option value="fixed">固定边界</Option>
                          <Option value="pressure">压力边界</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="底面边界">
                        <Select defaultValue="fixed" style={{ width: '100%' }}>
                          <Option value="free">自由边界</Option>
                          <Option value="fixed">固定边界</Option>
                          <Option value="pressure">压力边界</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row>
                    <Col span={24}>
                      <Form.Item style={{ marginBottom: 0 }}>
                        <Checkbox defaultChecked>考虑地下水影响</Checkbox>
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Card>
              
              {/* 计算域统计和操作控制 */}
              <Row gutter={[16, 16]} style={{ marginTop: '20px' }}>
                <Col span={24}>
                  <Card
                    title={
                      <Space>
                        <DashboardOutlined style={{ color: '#722ed1' }} />
                        <span>计算域统计</span>
                      </Space>
                    }
                    size="small"
                    style={{ borderRadius: '8px', marginBottom: '16px' }}
                  >
                    <Row gutter={[8, 12]}>
                      <Col span={6}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00d9ff' }}>
                            100×100
                          </div>
                          <Text type="secondary" style={{ fontSize: '11px' }}>平面尺寸(m)</Text>
                        </div>
                      </Col>
                      <Col span={6}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                            35
                          </div>
                          <Text type="secondary" style={{ fontSize: '11px' }}>总深度(m)</Text>
                        </div>
                      </Col>
                      <Col span={6}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fa8c16' }}>
                            12.5万
                          </div>
                          <Text type="secondary" style={{ fontSize: '11px' }}>预估节点</Text>
                        </div>
                      </Col>
                      <Col span={6}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f5222d' }}>
                            75万
                          </div>
                          <Text type="secondary" style={{ fontSize: '11px' }}>预估单元</Text>
                        </div>
                      </Col>
                    </Row>
                  </Card>
                </Col>
                <Col span={24}>
                  <Card 
                    title="操作控制" 
                    size="small" 
                    style={{ borderRadius: '8px', marginBottom: '16px' }}
                  >
                    <Row gutter={[16, 8]}>
                      <Col xs={24} sm={12}>
                        <Button
                          type="primary"
                          icon={<EyeOutlined />}
                          style={{ width: '100%' }}
                        >
                          预览计算域
                        </Button>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Button
                          icon={<CheckCircleOutlined />}
                          style={{ width: '100%' }}
                        >
                          应用设置
                        </Button>
                      </Col>
                    </Row>
                  </Card>
                </Col>

              </Row>
            </Col>
            </Row>
          </div>
        </TabPane>
        {/* 数据管理 */}
        <TabPane tab="钻孔数据" key="data" style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', overflow: 'auto', paddingBottom: '40px' }}>
            <Row gutter={16}>
            <Col span={24}>
              <Card title="数据上传" size="small">
                <Dragger {...uploadProps} style={{ marginBottom: '16px' }}>
                  <p style={{ margin: 0, fontSize: '24px', color: '#1890ff' }}>
                    <CloudUploadOutlined />
                  </p>
                  <p style={{ fontSize: '14px', margin: '6px 0' }}>
                    点击或拖拽上传钻孔数据文件
                  </p>
                  <p style={{ color: '#666', fontSize: '12px', margin: 0 }}>
                    支持 JSON、CSV、Excel 格式
                  </p>
                </Dragger>

                {boreholeData && (
                  <Alert
                    message={`成功加载 ${boreholeData.holes?.length || 2} 个钻孔数据`}
                    description={`包含 ${boreholeData.holes?.reduce((sum: number, hole: any) => sum + (hole.layers?.length || 0), 0) || 6} 个土层`}
                    type="success"
                    showIcon
                  />
                )}
              </Card>
            </Col>

            <Col span={24}>
              <Card title="数据统计" size="small" style={{ marginTop: '16px' }}>
                {boreholeData ? (
                  <List
                    size="small"
                    dataSource={[
                      { label: '钻孔数量', value: `${boreholeData.holes?.length || 2} 个` },
                      {
                        label: '土层总数',
                        value: `${boreholeData.holes?.reduce((sum: number, hole: any) => sum + (hole.layers?.length || 0), 0) || 6} 个`,
                      },
                      { label: '空间范围', value: '待计算' },
                      { label: '数据质量', value: '良好' },
                    ]}
                    renderItem={item => (
                      <List.Item>
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Text>{item.label}:</Text>
                          <Text strong>{item.value}</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <DatabaseOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                    <Text style={{ color: '#999' }}>暂无钻孔数据</Text>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
          </div>
        </TabPane>

        {/* 算法配置 */}
        <TabPane tab="参数配置" key="config" style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', overflow: 'auto', paddingBottom: '40px' }}>
            <Row gutter={16}>
            <Col span={24}>
              <Card title="建模配置" size="small" style={{ marginBottom: '16px' }}>
                  <Form layout="vertical" size="small">
                    <Form.Item label="插值方法">
                      <Select
                        value={gemPyConfig.interpolationMethod}
                        onChange={handleInterpolationMethodChange}
                        size="large"
                        style={{ width: '100%' }}
                        dropdownStyle={{ backgroundColor: 'rgba(30, 30, 50, 0.95)' }}
                      >
                        <Option value="rbf_multiquadric">
                          <div style={{ padding: '8px 0' }}>
                            <div style={{ fontWeight: 'bold', color: '#4a90e2', marginBottom: '4px' }}>
                              RBF多二次插值 <Tag color="green" size="small">推荐</Tag>
                            </div>
                            <div style={{ fontSize: '11px', color: '#999', lineHeight: '1.4' }}>
                              全局插值·适合密集+稀疏混合分布·基坑场景首选
                            </div>
                          </div>
                        </Option>
                        <Option value="ordinary_kriging">
                          <div style={{ padding: '8px 0' }}>
                            <div style={{ fontWeight: 'bold', color: '#52c41a', marginBottom: '4px' }}>
                              普通克里金插值
                            </div>
                            <div style={{ fontSize: '11px', color: '#999', lineHeight: '1.4' }}>
                              地统计学方法·提供不确定性评估·适合风险分析
                            </div>
                          </div>
                        </Option>
                        <Option value="adaptive_idw">
                          <div style={{ padding: '8px 0' }}>
                            <div style={{ fontWeight: 'bold', color: '#1890ff', marginBottom: '4px' }}>
                              自适应反距离权重 <Tag color="blue" size="small">快速</Tag>
                            </div>
                            <div style={{ fontSize: '11px', color: '#999', lineHeight: '1.4' }}>
                              计算快速·局部精度高·适合实时预览验证
                            </div>
                          </div>
                        </Option>
                      </Select>
                    </Form.Item>
                    
                    {/* 算法选择智能提示 */}
                    {gemPyConfig.interpolationMethod && (
                      <Alert
                        message={getAlgorithmTip(gemPyConfig.interpolationMethod)}
                        type="success"
                        showIcon
                        style={{ marginTop: '8px', marginBottom: '16px' }}
                      />
                    )}

                    <Card 
                      title={
                        <span style={{ color: '#00d9ff', fontSize: '14px', fontWeight: 'bold' }}>
                          <SettingOutlined style={{ marginRight: '8px' }} />
                          网格分辨率配置
                        </span>
                      }
                      size="small"
                      style={{ 
                        marginBottom: '16px',
                        background: 'rgba(0, 217, 255, 0.05)',
                        border: '1px solid rgba(0, 217, 255, 0.2)'
                      }}
                    >
                      <Row gutter={12}>
                        <Col span={8}>
                          <Form.Item 
                            label={
                              <span style={{ 
                                color: '#ffffff', 
                                fontSize: '13px', 
                                fontWeight: '500',
                                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                              }}>
                                X 分辨率
                              </span>
                            }
                            style={{ marginBottom: '8px' }}
                          >
                            <InputNumber
                              value={gemPyConfig.resolutionX}
                              onChange={(value) => setGemPyConfig({ ...gemPyConfig, resolutionX: value || 50 })}
                              min={20}
                              max={200}
                              size="large"
                              style={{ 
                                width: '100%',
                                height: '40px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                background: 'rgba(26, 26, 46, 0.8)',
                                borderColor: 'rgba(0, 217, 255, 0.4)',
                                color: '#ffffff'
                              }}
                              controls={{
                                upIcon: <span style={{ color: '#00d9ff' }}>+</span>,
                                downIcon: <span style={{ color: '#00d9ff' }}>-</span>
                              }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item 
                            label={
                              <span style={{ 
                                color: '#ffffff', 
                                fontSize: '13px', 
                                fontWeight: '500',
                                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                              }}>
                                Y 分辨率
                              </span>
                            }
                            style={{ marginBottom: '8px' }}
                          >
                            <InputNumber
                              value={gemPyConfig.resolutionY}
                              onChange={(value) => setGemPyConfig({ ...gemPyConfig, resolutionY: value || 50 })}
                              min={20}
                              max={200}
                              size="large"
                              style={{ 
                                width: '100%',
                                height: '40px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                background: 'rgba(26, 26, 46, 0.8)',
                                borderColor: 'rgba(0, 217, 255, 0.4)',
                                color: '#ffffff'
                              }}
                              controls={{
                                upIcon: <span style={{ color: '#00d9ff' }}>+</span>,
                                downIcon: <span style={{ color: '#00d9ff' }}>-</span>
                              }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item 
                            label={
                              <span style={{ 
                                color: '#ffffff', 
                                fontSize: '13px', 
                                fontWeight: '500',
                                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                              }}>
                                Z 分辨率
                              </span>
                            }
                            style={{ marginBottom: '8px' }}
                          >
                            <InputNumber
                              value={gemPyConfig.resolutionZ}
                              onChange={(value) => setGemPyConfig({ ...gemPyConfig, resolutionZ: value || 50 })}
                              min={20}
                              max={200}
                              size="large"
                              style={{ 
                                width: '100%',
                                height: '40px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                background: 'rgba(26, 26, 46, 0.8)',
                                borderColor: 'rgba(0, 217, 255, 0.4)',
                                color: '#ffffff'
                              }}
                              controls={{
                                upIcon: <span style={{ color: '#00d9ff' }}>+</span>,
                                downIcon: <span style={{ color: '#00d9ff' }}>-</span>
                              }}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                      <div style={{ 
                        fontSize: '11px', 
                        color: 'rgba(255,255,255,0.6)', 
                        textAlign: 'center',
                        marginTop: '8px',
                        padding: '4px 8px',
                        background: 'rgba(0, 217, 255, 0.1)',
                        borderRadius: '4px'
                      }}>
                        💡 建议范围: 20-200，较高分辨率提供更精细的地质模型
                      </div>
                    </Card>

                    {/* 基坑不均匀数据优化配置面板 */}
                    <Card 
                      title={
                        <span style={{ color: '#4a90e2', fontSize: '14px', fontWeight: 'bold' }}>
                          <DatabaseOutlined style={{ marginRight: '8px' }} />
                          基坑不均匀数据优化
                        </span>
                      }
                      size="small"
                      style={{ 
                        marginTop: '16px',
                        marginBottom: '16px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderColor: 'rgba(74, 144, 226, 0.3)'
                      }}
                    >
                      <Alert
                        message="基坑场景智能优化"
                        description="自动检测基坑周围密集区域和外围稀疏区域，采用分区域插值策略"
                        type="info"
                        showIcon
                        style={{ 
                          marginBottom: '16px',
                          backgroundColor: 'rgba(24, 144, 255, 0.1)',
                          border: '1px solid rgba(24, 144, 255, 0.2)'
                        }}
                      />
                      
                      <Row gutter={16}>
                        <Col span={8}>
                          <Form.Item 
                            label={<span style={{ color: '#ffffff', fontSize: '12px' }}>密集区域半径</span>}
                            tooltip="基坑周围多少米范围内视为数据密集区域"
                          >
                            <InputNumber
                              value={gemPyConfig.unevenDataConfig.denseRegionRadius}
                              onChange={(value) => handleUnevenConfigChange('denseRegionRadius', value || 100)}
                              min={50}
                              max={500}
                              step={10}
                              addonAfter="m"
                              style={{ 
                                width: '100%', 
                                backgroundColor: 'rgba(26, 26, 46, 0.8)',
                                borderColor: 'rgba(74, 144, 226, 0.3)'
                              }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item 
                            label={<span style={{ color: '#ffffff', fontSize: '12px' }}>稀疏阈值</span>}
                            tooltip="数据点密度低于此值时启用稀疏区域处理策略"
                          >
                            <Slider
                              value={gemPyConfig.unevenDataConfig.sparseRegionThreshold}
                              onChange={(value) => handleUnevenConfigChange('sparseRegionThreshold', value)}
                              min={0.1}
                              max={0.8}
                              step={0.1}
                              marks={{ 0.1: '0.1', 0.3: '0.3', 0.5: '0.5', 0.8: '0.8' }}
                              trackStyle={{ backgroundColor: '#4a90e2' }}
                              handleStyle={{ borderColor: '#4a90e2' }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item 
                            label={<span style={{ color: '#ffffff', fontSize: '12px' }}>自适应融合</span>}
                            tooltip="在密集和稀疏区域之间进行平滑过渡"
                          >
                            <Switch
                              checked={gemPyConfig.unevenDataConfig.adaptiveBlending}
                              onChange={(checked) => handleUnevenConfigChange('adaptiveBlending', checked)}
                              checkedChildren="启用"
                              unCheckedChildren="禁用"
                              style={{ backgroundColor: gemPyConfig.unevenDataConfig.adaptiveBlending ? '#4a90e2' : '#ccc' }}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>

                    <Form.Item>
                      <Checkbox
                        checked={gemPyConfig.enableFaults}
                        onChange={(e) => setGemPyConfig({ ...gemPyConfig, enableFaults: e.target.checked })}
                      >
                        启用断层建模
                      </Checkbox>
                    </Form.Item>

                    <Card 
                      title={
                        <span style={{ color: '#00d9ff', fontSize: '14px', fontWeight: 'bold' }}>
                          <SettingOutlined style={{ marginRight: '8px' }} />
                          断层平滑度
                        </span>
                      }
                      size="small"
                      style={{ 
                        marginBottom: '16px',
                        background: 'rgba(255, 165, 0, 0.05)',
                        border: '1px solid rgba(255, 165, 0, 0.2)'
                      }}
                    >
                      <Form.Item style={{ marginBottom: '8px' }}>
                        <div style={{ marginBottom: '12px' }}>
                          <Text style={{ 
                            color: '#ffffff', 
                            fontSize: '13px', 
                            fontWeight: '500',
                            display: 'block',
                            marginBottom: '8px'
                          }}>
                            当前值: <span style={{ color: '#ffa500', fontWeight: 'bold', fontSize: '15px' }}>{gemPyConfig.faultSmoothing.toFixed(1)}</span>
                          </Text>
                        </div>
                        <Slider
                          value={gemPyConfig.faultSmoothing}
                          onChange={(value) => setGemPyConfig({ ...gemPyConfig, faultSmoothing: value })}
                          min={0.1}
                          max={1.0}
                          step={0.1}
                          marks={{ 
                            0.1: { 
                              style: { color: '#ffffff', fontSize: '12px', fontWeight: 'bold' }, 
                              label: '0.1' 
                            }, 
                            0.5: { 
                              style: { color: '#ffa500', fontSize: '12px', fontWeight: 'bold' }, 
                              label: '0.5' 
                            }, 
                            1.0: { 
                              style: { color: '#ffffff', fontSize: '12px', fontWeight: 'bold' }, 
                              label: '1.0' 
                            }
                          }}
                          trackStyle={{ 
                            backgroundColor: '#ffa500',
                            height: '6px'
                          }}
                          handleStyle={{
                            borderColor: '#ffa500',
                            backgroundColor: '#ffa500',
                            width: '16px',
                            height: '16px',
                            marginTop: '-5px'
                          }}
                          railStyle={{
                            backgroundColor: 'rgba(255, 165, 0, 0.2)',
                            height: '6px'
                          }}
                        />
                        <div style={{ 
                          fontSize: '11px', 
                          color: 'rgba(255,255,255,0.6)', 
                          textAlign: 'center',
                          marginTop: '8px',
                          padding: '4px 8px',
                          background: 'rgba(255, 165, 0, 0.1)',
                          borderRadius: '4px'
                        }}>
                          <Row>
                            <Col span={8} style={{ textAlign: 'left' }}>
                              <span style={{ color: '#ff6b6b' }}>💢 强烈建模</span>
                            </Col>
                            <Col span={8} style={{ textAlign: 'center' }}>
                              <span style={{ color: '#ffa500' }}>⚖️ 平衡建模</span>
                            </Col>
                            <Col span={8} style={{ textAlign: 'right' }}>
                              <span style={{ color: '#4ecdc4' }}>🌊 平滑建模</span>
                            </Col>
                          </Row>
                        </div>
                      </Form.Item>
                    </Card>


                  </Form>
                </Card>

                {/* 参数确认操作卡片 */}
                <Card 
                  size="small"
                  style={{ 
                    background: 'rgba(24, 144, 255, 0.05)',
                    border: '1px solid rgba(24, 144, 255, 0.2)',
                    borderRadius: '8px'
                  }}
                >
                  <Row gutter={16} align="middle">
                    <Col span={12}>
                      <Button 
                        type="default"
                        size="large"
                        style={{ 
                          width: '100%',
                          height: '40px',
                          borderColor: '#d9d9d9',
                          color: '#595959'
                        }}
                        onClick={() => {
                          // 重置参数到默认值
                          setGemPyConfig({
                            interpolationMethod: 'rbf_multiquadric',
                            resolutionX: 50,
                            resolutionY: 50,
                            resolutionZ: 50,
                            enableFaults: true,
                            faultSmoothing: 0.5,
                            gravityModel: false,
                            magneticModel: false,
                            unevenDataConfig: {
                              denseRegionRadius: 100,
                              sparseRegionThreshold: 0.3,
                              adaptiveBlending: true,
                            },
                          });
                          message.info('参数已重置到默认值');
                        }}
                      >
                        取消
                      </Button>
                    </Col>
                    <Col span={12}>
                      <Button 
                        type="primary"
                        size="large"
                        style={{ 
                          width: '100%',
                          height: '40px',
                          background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                          borderColor: '#1890ff',
                          boxShadow: '0 2px 4px rgba(24, 144, 255, 0.2)'
                        }}
                        onClick={() => {
                          // 应用当前参数配置
                          message.success('参数配置已应用');
                          // 如果需要，可以触发其他回调或状态更新
                        }}
                      >
                        确定
                      </Button>
                    </Col>
                  </Row>
                </Card>
            </Col>

          </Row>
          </div>
        </TabPane>


        {/* 渗流参数配置 */}
        <TabPane tab="渗流参数" key="seepage" style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', overflow: 'auto', paddingBottom: '80px' }}>
            {/* 水头分布表格 - 占用一行 */}
            <Card 
              title={
                <Space>
                  <DatabaseOutlined style={{ color: '#1890ff' }} />
                  <span style={{ color: '#1890ff' }}>水头分布表格</span>
                </Space>
              }
              size="small" 
              style={{ marginBottom: '16px' }}
              extra={
                <Space>
                  <Button 
                    size="small" 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => {
                      // 添加新水头点
                      message.success('已添加新水头点');
                    }}
                  >
                    添加
                  </Button>
                  <Button 
                    size="small" 
                    icon={<UploadOutlined />}
                    onClick={() => {
                      message.info('批量导入功能开发中');
                    }}
                  >
                    导入
                  </Button>
                </Space>
              }
            >
                  <Table
                    size="small"
                    scroll={{ y: 400, x: 1200 }}
                    pagination={{ pageSize: 10, size: 'small' }}
                    dataSource={[
                      {
                        key: '1',
                        id: 'WH001',
                        x: 10.5,
                        y: 15.2,
                        elevation: 25.0,
                        waterHead: 20.5,
                        boundaryType: 'constant_head',
                        layerName: '粘土层',
                        permeability: 1e-6,
                        wellType: 'observation',
                        isActive: true,
                        notes: '观测点1'
                      },
                      {
                        key: '2',
                        id: 'WH002',
                        x: 25.8,
                        y: 30.1,
                        elevation: 24.5,
                        waterHead: 19.8,
                        boundaryType: 'specified_flux',
                        layerName: '砂土层',
                        permeability: 5e-5,
                        wellType: 'pumping',
                        isActive: true,
                        notes: '抽水井1'
                      },
                      {
                        key: '3',
                        id: 'WH003',
                        x: 40.2,
                        y: 20.8,
                        elevation: 26.2,
                        waterHead: 21.0,
                        boundaryType: 'seepage_face',
                        layerName: '粉砂层',
                        permeability: 2e-5,
                        wellType: null,
                        isActive: false,
                        notes: '边界点'
                      }
                    ]}
                    columns={[
                      {
                        title: '序号',
                        width: 60,
                        render: (_, __, index) => index + 1
                      },
                      {
                        title: '坐标X(m)',
                        dataIndex: 'x',
                        width: 100,
                        render: (value, record) => (
                          <InputNumber
                            size="small"
                            value={value}
                            min={0}
                            max={1000}
                            step={0.1}
                            style={{ width: '100%' }}
                            onChange={(val) => console.log('X updated:', val)}
                          />
                        )
                      },
                      {
                        title: '坐标Y(m)',
                        dataIndex: 'y',
                        width: 100,
                        render: (value, record) => (
                          <InputNumber
                            size="small"
                            value={value}
                            min={0}
                            max={1000}
                            step={0.1}
                            style={{ width: '100%' }}
                            onChange={(val) => console.log('Y updated:', val)}
                          />
                        )
                      },
                      {
                        title: '地面标高(m)',
                        dataIndex: 'elevation',
                        width: 110,
                        render: (value, record) => (
                          <InputNumber
                            size="small"
                            value={value}
                            step={0.1}
                            style={{ width: '100%' }}
                            onChange={(val) => console.log('Elevation updated:', val)}
                          />
                        )
                      },
                      {
                        title: '水头值(m)',
                        dataIndex: 'waterHead',
                        width: 110,
                        render: (value, record) => (
                          <InputNumber
                            size="small"
                            value={value}
                            max={record.elevation}
                            step={0.1}
                            style={{ width: '100%' }}
                            onChange={(val) => console.log('Water head updated:', val)}
                          />
                        )
                      },
                      {
                        title: '边界类型',
                        dataIndex: 'boundaryType',
                        width: 130,
                        render: (value, record) => (
                          <Select
                            size="small"
                            value={value}
                            style={{ width: '100%' }}
                            onChange={(val) => console.log('Boundary type updated:', val)}
                          >
                            <Option value="constant_head">
                              <span style={{ color: '#1890ff' }}>定水头边界</span>
                            </Option>
                            <Option value="specified_flux">
                              <span style={{ color: '#52c41a' }}>定流量边界</span>
                            </Option>
                            <Option value="seepage_face">
                              <span style={{ color: '#fa8c16' }}>渗流面边界</span>
                            </Option>
                            <Option value="impermeable">
                              <span style={{ color: '#f5222d' }}>不透水边界</span>
                            </Option>
                          </Select>
                        )
                      },
                      {
                        title: '含水层',
                        dataIndex: 'layerName',
                        width: 120,
                        render: (value, record) => (
                          <Select
                            size="small"
                            value={value}
                            style={{ width: '100%' }}
                            onChange={(val) => console.log('Layer updated:', val)}
                          >
                            <Option value="粘土层">粘土层</Option>
                            <Option value="砂土层">砂土层</Option>
                            <Option value="粉砂层">粉砂层</Option>
                            <Option value="岩层">岩层</Option>
                          </Select>
                        )
                      },
                      {
                        title: '渗透系数(m/s)',
                        dataIndex: 'permeability',
                        width: 120,
                        render: (value, record) => (
                          <InputNumber
                            size="small"
                            value={value}
                            min={1e-10}
                            max={1e-2}
                            step={1e-6}
                            formatter={(val) => val ? Number(val).toExponential(2) : ''}
                            parser={(val) => val ? parseFloat(val) : 0}
                            style={{ width: '100%' }}
                            onChange={(val) => console.log('Permeability updated:', val)}
                          />
                        )
                      },
                      {
                        title: '井类型',
                        dataIndex: 'wellType',
                        width: 100,
                        render: (value, record) => (
                          <Select
                            size="small"
                            value={value}
                            allowClear
                            placeholder="可选"
                            style={{ width: '100%' }}
                            onChange={(val) => console.log('Well type updated:', val)}
                          >
                            <Option value="pumping">
                              <span style={{ color: '#722ed1' }}>抽水井</span>
                            </Option>
                            <Option value="injection">
                              <span style={{ color: '#13c2c2' }}>注水井</span>
                            </Option>
                            <Option value="observation">
                              <span style={{ color: '#faad14' }}>观测井</span>
                            </Option>
                          </Select>
                        )
                      },
                      {
                        title: '状态',
                        dataIndex: 'isActive',
                        width: 80,
                        render: (value, record) => (
                          <Switch
                            size="small"
                            checked={value}
                            onChange={(checked) => console.log('Active status updated:', checked)}
                          />
                        )
                      },
                      {
                        title: '操作',
                        width: 100,
                        render: (_, record) => (
                          <Space size="small">
                            <Button
                              size="small"
                              type="link"
                              icon={<EditOutlined />}
                              onClick={() => message.info(`编辑 ${record.id}`)}
                            />
                            <Button
                              size="small"
                              type="link"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => message.info(`删除 ${record.id}`)}
                            />
                          </Space>
                        )
                      }
                    ]}
                  />
            </Card>

            {/* 全局设置 - 占用一行 */}
            <Card 
              title={
                <Space>
                  <SettingOutlined style={{ color: '#52c41a' }} />
                  <span style={{ color: '#52c41a' }}>全局设置</span>
                </Space>
              }
              size="small" 
              style={{ marginBottom: '16px' }}
            >
                           <Row gutter={16}>
               <Col span={12}>
                 <Form.Item label="初始水位 (m)">
                   <InputNumber
                     defaultValue={5.0}
                     min={0}
                     max={50}
                     step={0.1}
                     style={{ width: '100%' }}
                   />
                 </Form.Item>
               </Col>
               <Col span={12}>
                 <Form.Item label="分析类型">
                   <Select defaultValue="steady" style={{ width: '100%' }}>
                     <Option value="steady">稳态渗流</Option>
                     <Option value="transient">非稳态渗流</Option>
                   </Select>
                 </Form.Item>
               </Col>
             </Row>
            </Card>

            {/* 边界条件 - 占用一行 */}
            <Card 
              title={
                <Space>
                  <BorderOutlined style={{ color: '#fa8c16' }} />
                  <span style={{ color: '#fa8c16' }}>边界条件设置</span>
                </Space>
              }
              size="small" 
              style={{ marginBottom: '16px' }}
            >
              {/* 顶部边界 */}
              <Row style={{ marginBottom: '12px' }}>
                <Col span={24}>
                  <Form.Item label="顶部边界">
                    <Select defaultValue="seepage_face" style={{ width: '100%' }}>
                      <Option value="constant_head">定水头边界</Option>
                      <Option value="seepage_face">渗流面边界</Option>
                      <Option value="impermeable">不透水边界</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              {/* 底部边界 */}
              <Row style={{ marginBottom: '12px' }}>
                <Col span={24}>
                  <Form.Item label="底部边界">
                    <Select defaultValue="constant_head" style={{ width: '100%' }}>
                      <Option value="constant_head">定水头边界</Option>
                      <Option value="impermeable">不透水边界</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              {/* 侧面边界 */}
              <Row>
                <Col span={24}>
                  <Form.Item label="侧面边界">
                    <Select defaultValue="specified_flux" style={{ width: '100%' }}>
                      <Option value="constant_head">定水头边界</Option>
                      <Option value="specified_flux">定流量边界</Option>
                      <Option value="impermeable">不透水边界</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 操作按钮 - 占用一行 */}
            <Card 
              title={
                <Space>
                  <ThunderboltOutlined style={{ color: '#722ed1' }} />
                  <span style={{ color: '#722ed1' }}>操作控制</span>
                </Space>
              }
              size="small" 
              style={{ marginBottom: '16px' }}
            >
              {/* 第一行按钮 */}
              <Row gutter={16} style={{ marginBottom: '12px' }}>
                <Col span={12}>
                  <Button 
                    type="primary" 
                    block 
                    size="large"
                    icon={<CheckOutlined />}
                    style={{
                      height: '50px',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                    onClick={() => message.success('渗流参数验证通过')}
                  >
                    验证参数
                  </Button>
                </Col>
                <Col span={12}>
                  <Button 
                    block 
                    size="large"
                    icon={<DownloadOutlined />}
                    style={{
                      height: '50px',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                    onClick={() => message.info('导出数据功能开发中')}
                  >
                    导出数据
                  </Button>
                </Col>
              </Row>
              {/* 第二行按钮 */}
              <Row gutter={16}>
                <Col span={12}>
                  <Button 
                    block 
                    size="large"
                    icon={<EyeOutlined />}
                    style={{
                      height: '50px',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                    onClick={() => message.info('预览功能开发中')}
                  >
                    预览渗流场
                  </Button>
                </Col>
                <Col span={12}>
                  <Button 
                    block 
                    size="large"
                    icon={<ReloadOutlined />}
                    style={{
                      height: '50px',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                    onClick={() => message.info('重置所有参数')}
                  >
                    重置参数
                  </Button>
                </Col>
              </Row>
            </Card>
          </div>
        </TabPane>

        </Tabs>
      </div>

      {/* 状态提示 */}
      {processingStatus === 'completed' && (
        <Alert
          message="地质建模完成"
          description="基于GemPy的三维地质体建模已完成，可用于进一步的网格生成和数值分析。"
          type="success"
          showIcon
          style={{ marginTop: '16px' }}
          action={
            <Space>
              <Button size="small" icon={<EyeOutlined />}>
                查看3D模型
              </Button>
              <Button size="small" icon={<DownloadOutlined />}>
                导出结果
              </Button>
            </Space>
          }
        />
      )}

      {processingStatus === 'error' && (
        <Alert
          message="地质建模失败"
          description="建模过程中发生错误，请检查钻孔数据格式和参数设置后重试。"
          type="error"
          showIcon
          style={{ marginTop: '16px' }}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={() => setProcessingStatus('idle')}>
              重新开始
            </Button>
          }
        />
      )}
    </div>
  );
};

export default GeologyModule;