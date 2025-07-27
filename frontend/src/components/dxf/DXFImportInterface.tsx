import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  Card,
  Steps,
  Button,
  Select,
  Form,
  Switch,
  InputNumber,
  Progress,
  Alert,
  Space,
  Tag,
  Tooltip,
  Descriptions,
  Modal,
  Table,
  Radio,
  message,
  Spin
} from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  BugOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';

const { Step } = Steps;
const { Option } = Select;
const { Dragger } = Upload;

// DXF处理选项接口
interface DXFProcessingOptions {
  mode: 'strict' | 'tolerant' | 'repair' | 'preview';
  coordinate_system: 'WCS' | 'UCS' | 'OCS';
  scale_factor: number;
  tolerance: number;
  quality_check_enabled: boolean;
  fix_geometry_issues: boolean;
  remove_invalid_entities: boolean;
  layer_filter?: string[];
  output_formats: string[];
  merge_duplicate_vertices: boolean;
  simplify_curves: boolean;
  preserve_layers: boolean;
}

// DXF分析结果接口
interface DXFAnalysisResult {
  file_size: number;
  dxf_version: string;
  entity_count: number;
  layer_count: number;
  block_count: number;
  entity_types: Record<string, number>;
  layer_names: string[];
  coordinate_system: string;
  drawing_bounds: {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
  };
  units: string;
  creation_time?: string;
  modification_time?: string;
}

// 质量报告接口
interface DXFQualityReport {
  overall_quality: 'excellent' | 'good' | 'fair' | 'poor';
  quality_score: number;
  validation_issues: Array<{
    type: string;
    severity: 'error' | 'warning' | 'info';
    description: string;
    count: number;
    affected_entities: string[];
  }>;
  geometry_statistics: {
    total_vertices: number;
    duplicate_vertices: number;
    invalid_geometries: number;
    self_intersections: number;
    tiny_edges: number;
    degenerate_faces: number;
  };
  recommendations: string[];
}

// 处理状态接口
interface ProcessingStatus {
  stage: string;
  progress: number;
  message: string;
  analysis_result?: DXFAnalysisResult;
  quality_report?: DXFQualityReport;
  processing_result?: any;
  error_details?: string;
}

export const DXFImportInterface: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<UploadFile | null>(null);
  const [processingOptions, setProcessingOptions] = useState<DXFProcessingOptions>({
    mode: 'tolerant',
    coordinate_system: 'WCS',
    scale_factor: 1.0,
    tolerance: 1e-6,
    quality_check_enabled: true,
    fix_geometry_issues: true,
    remove_invalid_entities: false,
    output_formats: ['geo'],
    merge_duplicate_vertices: true,
    simplify_curves: false,
    preserve_layers: true
  });
  const [analysisResult, setAnalysisResult] = useState<DXFAnalysisResult | null>(null);
  const [qualityReport, setQualityReport] = useState<DXFQualityReport | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [form] = Form.useForm();
  const wsRef = useRef<WebSocket | null>(null);

  // 处理模式配置
  const processingModes = {
    strict: {
      name: '严格模式',
      description: '严格验证，不允许任何几何错误',
      color: 'red',
      icon: <ExclamationCircleOutlined />
    },
    tolerant: {
      name: '容错模式',
      description: '容忍小的几何误差，自动修复常见问题',
      color: 'blue',
      icon: <CheckCircleOutlined />
    },
    repair: {
      name: '修复模式',
      description: '主动修复几何问题，适合损坏的DXF文件',
      color: 'orange',
      icon: <BugOutlined />
    },
    preview: {
      name: '预览模式',
      description: '快速预览，跳过复杂验证',
      color: 'green',
      icon: <EyeOutlined />
    }
  };

  // 输出格式选项
  const outputFormats = [
    { label: 'Gmsh几何文件 (.geo)', value: 'geo' },
    { label: 'STEP文件 (.step)', value: 'step' },
    { label: 'IGES文件 (.iges)', value: 'iges' },
    { label: 'STL网格 (.stl)', value: 'stl' },
    { label: 'OBJ模型 (.obj)', value: 'obj' },
    { label: 'glTF模型 (.gltf)', value: 'gltf' }
  ];

  // WebSocket连接处理
  const connectWebSocket = useCallback((clientId: string) => {
    const ws = new WebSocket(`ws://localhost:8000/ws/${clientId}`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProcessingStatus(data);
        
        if (data.status === 'completed') {
          setIsProcessing(false);
          setCurrentStep(3);
          message.success('DXF文件处理完成！');
        } else if (data.status === 'error') {
          setIsProcessing(false);
          message.error(`处理失败: ${data.message}`);
        }
        
        // 更新分析结果和质量报告
        if (data.analysis_result) {
          setAnalysisResult(data.analysis_result);
        }
        if (data.quality_report) {
          setQualityReport(data.quality_report);
        }
      } catch (error) {
        console.error('WebSocket消息解析失败:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      message.error('实时连接失败');
    };
    
    wsRef.current = ws;
  }, []);

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.dxf',
    beforeUpload: (file) => {
      const isDXF = file.name.toLowerCase().endsWith('.dxf');
      if (!isDXF) {
        message.error('只能上传DXF文件！');
        return false;
      }
      
      const isLt50M = file.size / 1024 / 1024 < 50;
      if (!isLt50M) {
        message.error('DXF文件大小不能超过50MB！');
        return false;
      }
      
      setUploadedFile(file as UploadFile);
      setCurrentStep(1);
      return false; // 阻止自动上传
    },
    onRemove: () => {
      setUploadedFile(null);
      setCurrentStep(0);
      setAnalysisResult(null);
      setQualityReport(null);
      setProcessingStatus(null);
    }
  };

  // 开始处理
  const startProcessing = async () => {
    if (!uploadedFile || !uploadedFile.originFileObj) {
      message.error('请先上传DXF文件');
      return;
    }

    setIsProcessing(true);
    setCurrentStep(2);
    
    // 生成客户端ID并连接WebSocket
    const clientId = `dxf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    connectWebSocket(clientId);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile.originFileObj);
      formData.append('client_id', clientId);
      formData.append('processing_options', JSON.stringify(processingOptions));
      formData.append('auto_process', 'true');

      const response = await fetch('/api/dxf-import/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`上传失败: ${response.statusText}`);
      }

      const result = await response.json();
      message.success('文件上传成功，开始处理...');
      
    } catch (error) {
      console.error('DXF处理失败:', error);
      message.error(`处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setIsProcessing(false);
    }
  };

  // 质量报告表格列
  const qualityColumns = [
    {
      title: '问题类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="blue">{type}</Tag>
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => {
        const colors = { error: 'red', warning: 'orange', info: 'blue' };
        return <Tag color={colors[severity as keyof typeof colors]}>{severity}</Tag>;
      }
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '数量',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => <Tag>{count}</Tag>
    }
  ];

  // 实体类型统计图表
  const EntityTypeChart: React.FC<{ entityTypes: Record<string, number> }> = ({ entityTypes }) => {
    const total = Object.values(entityTypes).reduce((sum, count) => sum + count, 0);
    
    return (
      <div style={{ marginTop: 16 }}>
        {Object.entries(entityTypes).map(([type, count]) => (
          <div key={type} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>{type}</span>
              <span>{count}</span>
            </div>
            <Progress 
              percent={(count / total) * 100} 
              size="small" 
              showInfo={false}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="DXF文件导入工具" style={{ marginBottom: 24 }}>
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          <Step title="上传文件" icon={<InboxOutlined />} />
          <Step title="配置选项" icon={<SettingOutlined />} />
          <Step title="处理中" icon={<Spin spinning={isProcessing} />} />
          <Step title="完成" icon={<CheckCircleOutlined />} />
        </Steps>

        {/* 步骤1: 文件上传 */}
        {currentStep === 0 && (
          <Card title="选择DXF文件">
            <Dragger {...uploadProps} style={{ marginBottom: 16 }}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽DXF文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持单个DXF文件，文件大小不超过50MB
              </p>
            </Dragger>
          </Card>
        )}

        {/* 步骤2: 配置选项 */}
        {currentStep === 1 && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="文件信息">
              <Descriptions column={2}>
                <Descriptions.Item label="文件名">{uploadedFile?.name}</Descriptions.Item>
                <Descriptions.Item label="文件大小">
                  {uploadedFile && ((uploadedFile.size || 0) / 1024 / 1024).toFixed(2)} MB
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="处理配置">
              <Form
                form={form}
                layout="vertical"
                initialValues={processingOptions}
                onValuesChange={(_, values) => setProcessingOptions({ ...processingOptions, ...values })}
              >
                <Form.Item label="处理模式" name="mode">
                  <Radio.Group>
                    {Object.entries(processingModes).map(([key, config]) => (
                      <Radio.Button key={key} value={key}>
                        <Space>
                          {config.icon}
                          <span>{config.name}</span>
                        </Space>
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </Form.Item>

                <Form.Item>
                  <Alert
                    message={processingModes[processingOptions.mode].description}
                    type="info"
                    showIcon
                  />
                </Form.Item>

                <Form.Item label="坐标系统" name="coordinate_system">
                  <Select>
                    <Option value="WCS">世界坐标系 (WCS)</Option>
                    <Option value="UCS">用户坐标系 (UCS)</Option>
                    <Option value="OCS">对象坐标系 (OCS)</Option>
                  </Select>
                </Form.Item>

                <Form.Item label="缩放因子" name="scale_factor">
                  <InputNumber min={0.001} max={1000} step={0.1} />
                </Form.Item>

                <Form.Item label="几何容差" name="tolerance">
                  <InputNumber min={1e-12} max={1e-3} step={1e-6} formatter={(value) => value?.toString()} />
                </Form.Item>

                <Form.Item label="输出格式" name="output_formats">
                  <Select mode="multiple" placeholder="选择输出格式">
                    {outputFormats.map(format => (
                      <Option key={format.value} value={format.value}>
                        {format.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Space wrap>
                  <Form.Item name="quality_check_enabled" valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Switch checkedChildren="质量检查" unCheckedChildren="跳过检查" />
                  </Form.Item>
                  
                  <Form.Item name="fix_geometry_issues" valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Switch checkedChildren="修复几何" unCheckedChildren="保持原样" />
                  </Form.Item>
                  
                  <Form.Item name="merge_duplicate_vertices" valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Switch checkedChildren="合并重复点" unCheckedChildren="保留重复点" />
                  </Form.Item>
                  
                  <Form.Item name="preserve_layers" valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Switch checkedChildren="保留图层" unCheckedChildren="合并图层" />
                  </Form.Item>
                </Space>
              </Form>
            </Card>

            <Button type="primary" size="large" onClick={startProcessing} block>
              开始处理DXF文件
            </Button>
          </Space>
        )}

        {/* 步骤3: 处理中 */}
        {currentStep === 2 && processingStatus && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="处理进度">
              <Progress 
                percent={processingStatus.progress} 
                status={isProcessing ? "active" : "success"}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              <div style={{ marginTop: 16 }}>
                <Alert
                  message={processingStatus.message}
                  description={`当前阶段: ${processingStatus.stage}`}
                  type="info"
                  showIcon
                />
              </div>
            </Card>

            {processingStatus.analysis_result && (
              <Card 
                title="分析结果" 
                extra={
                  <Button 
                    type="link" 
                    icon={<EyeOutlined />}
                    onClick={() => setShowAnalysisModal(true)}
                  >
                    查看详细
                  </Button>
                }
              >
                <Descriptions column={2}>
                  <Descriptions.Item label="DXF版本">{processingStatus.analysis_result.dxf_version}</Descriptions.Item>
                  <Descriptions.Item label="实体数量">{processingStatus.analysis_result.entity_count}</Descriptions.Item>
                  <Descriptions.Item label="图层数量">{processingStatus.analysis_result.layer_count}</Descriptions.Item>
                  <Descriptions.Item label="块数量">{processingStatus.analysis_result.block_count}</Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {processingStatus.quality_report && (
              <Card 
                title="质量报告" 
                extra={
                  <Button 
                    type="link" 
                    icon={<BugOutlined />}
                    onClick={() => setShowQualityModal(true)}
                  >
                    查看报告
                  </Button>
                }
              >
                <Space>
                  <Tag color={processingStatus.quality_report.overall_quality === 'excellent' ? 'green' : 
                              processingStatus.quality_report.overall_quality === 'good' ? 'blue' :
                              processingStatus.quality_report.overall_quality === 'fair' ? 'orange' : 'red'}>
                    质量等级: {processingStatus.quality_report.overall_quality}
                  </Tag>
                  <Tag>
                    质量得分: {processingStatus.quality_report.quality_score}/100
                  </Tag>
                  <Tag color="orange">
                    问题数量: {processingStatus.quality_report.validation_issues.length}
                  </Tag>
                </Space>
              </Card>
            )}
          </Space>
        )}

        {/* 步骤4: 完成 */}
        {currentStep === 3 && processingStatus?.processing_result && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Alert
              message="DXF文件处理完成"
              description="文件已成功处理并转换为指定格式"
              type="success"
              showIcon
              closable
            />

            <Card title="处理结果">
              <Descriptions column={2}>
                <Descriptions.Item label="处理时间">{processingStatus.processing_result.processing_time}s</Descriptions.Item>
                <Descriptions.Item label="输出文件">{processingStatus.processing_result.output_file_path}</Descriptions.Item>
                <Descriptions.Item label="转换格式">
                  <Space>
                    {Object.keys(processingStatus.processing_result.converted_files || {}).map(format => (
                      <Tag key={format} color="blue">{format.toUpperCase()}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="下载文件">
              <Space wrap>
                <Button type="primary" icon={<DownloadOutlined />}>
                  下载原始DXF文件
                </Button>
                {Object.entries(processingStatus.processing_result.converted_files || {}).map(([format, path]) => (
                  <Button key={format} icon={<DownloadOutlined />}>
                    下载 {format.toUpperCase()} 文件
                  </Button>
                ))}
              </Space>
            </Card>

            <Button type="dashed" block onClick={() => {
              setCurrentStep(0);
              setUploadedFile(null);
              setAnalysisResult(null);
              setQualityReport(null);
              setProcessingStatus(null);
              form.resetFields();
            }}>
              处理新文件
            </Button>
          </Space>
        )}
      </Card>

      {/* 分析结果详细模态框 */}
      <Modal
        title="DXF文件分析详细结果"
        open={showAnalysisModal}
        onCancel={() => setShowAnalysisModal(false)}
        footer={null}
        width={800}
      >
        {analysisResult && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions title="基本信息" column={2} bordered>
              <Descriptions.Item label="文件大小">{(analysisResult.file_size / 1024 / 1024).toFixed(2)} MB</Descriptions.Item>
              <Descriptions.Item label="DXF版本">{analysisResult.dxf_version}</Descriptions.Item>
              <Descriptions.Item label="实体数量">{analysisResult.entity_count}</Descriptions.Item>
              <Descriptions.Item label="图层数量">{analysisResult.layer_count}</Descriptions.Item>
              <Descriptions.Item label="块数量">{analysisResult.block_count}</Descriptions.Item>
              <Descriptions.Item label="单位">{analysisResult.units}</Descriptions.Item>
              <Descriptions.Item label="坐标系统">{analysisResult.coordinate_system}</Descriptions.Item>
            </Descriptions>

            <Card title="图层列表">
              <Space wrap>
                {analysisResult.layer_names.map(layer => (
                  <Tag key={layer} color="blue">{layer}</Tag>
                ))}
              </Space>
            </Card>

            <Card title="实体类型统计">
              <EntityTypeChart entityTypes={analysisResult.entity_types} />
            </Card>

            <Card title="绘图边界">
              <Descriptions column={2}>
                <Descriptions.Item label="最小X">{analysisResult.drawing_bounds.min_x.toFixed(3)}</Descriptions.Item>
                <Descriptions.Item label="最大X">{analysisResult.drawing_bounds.max_x.toFixed(3)}</Descriptions.Item>
                <Descriptions.Item label="最小Y">{analysisResult.drawing_bounds.min_y.toFixed(3)}</Descriptions.Item>
                <Descriptions.Item label="最大Y">{analysisResult.drawing_bounds.max_y.toFixed(3)}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Space>
        )}
      </Modal>

      {/* 质量报告模态框 */}
      <Modal
        title="DXF文件质量报告"
        open={showQualityModal}
        onCancel={() => setShowQualityModal(false)}
        footer={null}
        width={1000}
      >
        {qualityReport && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="质量概览">
              <Space size="large">
                <div>
                  <div>整体质量</div>
                  <Tag color={qualityReport.overall_quality === 'excellent' ? 'green' : 
                              qualityReport.overall_quality === 'good' ? 'blue' :
                              qualityReport.overall_quality === 'fair' ? 'orange' : 'red'} 
                       style={{ fontSize: 16, padding: '4px 12px' }}>
                    {qualityReport.overall_quality}
                  </Tag>
                </div>
                <div>
                  <div>质量得分</div>
                  <Progress 
                    type="circle" 
                    percent={qualityReport.quality_score} 
                    size={80}
                    format={percent => `${percent}/100`}
                  />
                </div>
              </Space>
            </Card>

            <Card title="几何统计">
              <Descriptions column={3} bordered>
                <Descriptions.Item label="总顶点数">{qualityReport.geometry_statistics.total_vertices}</Descriptions.Item>
                <Descriptions.Item label="重复顶点">{qualityReport.geometry_statistics.duplicate_vertices}</Descriptions.Item>
                <Descriptions.Item label="无效几何">{qualityReport.geometry_statistics.invalid_geometries}</Descriptions.Item>
                <Descriptions.Item label="自相交">{qualityReport.geometry_statistics.self_intersections}</Descriptions.Item>
                <Descriptions.Item label="微小边">{qualityReport.geometry_statistics.tiny_edges}</Descriptions.Item>
                <Descriptions.Item label="退化面">{qualityReport.geometry_statistics.degenerate_faces}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="验证问题">
              <Table
                dataSource={qualityReport.validation_issues}
                columns={qualityColumns}
                rowKey="type"
                pagination={false}
                size="small"
              />
            </Card>

            <Card title="建议修复">
              <ul>
                {qualityReport.recommendations.map((recommendation, index) => (
                  <li key={index} style={{ marginBottom: 8 }}>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </Card>
          </Space>
        )}
      </Modal>
    </div>
  );
};