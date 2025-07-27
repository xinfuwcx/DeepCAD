import React, { useState, useRef } from 'react';
import { 
  Card, 
  Button, 
  Select, 
  InputNumber, 
  Slider, 
  Switch, 
  Upload, 
  Space, 
  Divider, 
  Form, 
  Row, 
  Col,
  Progress,
  Typography,
  Alert,
  message
} from 'antd';
import {
  DatabaseOutlined,
  ExperimentOutlined,
  ScissorOutlined,
  UploadOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  EyeOutlined,
  SaveOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

const { Text, Title } = Typography;
const { Option } = Select;

interface RBFInterpolationConfig {
  basis_function: 'multiquadric' | 'thin_plate_spline' | 'gaussian' | 'linear';
  surface_type: 'nurbs' | 'b_spline' | 'bezier';
  smoothing: number;
  epsilon: number;
}

interface ComputationDomainConfig {
  mesh_resolution: number;
  domain_extension: {
    x_extend: number;
    y_extend: number;
    bottom_elevation: number;
  };
  mesh_quality: number;
  enable_adaptive_mesh: boolean;
}

interface GeologyModelingParams {
  data_source: {
    file_path: string;
    format: 'csv' | 'xlsx' | 'json';
    borehole_count: number;
    layer_count: number;
  };
  rbf_config: RBFInterpolationConfig;
  domain_config: ComputationDomainConfig;
  visualization: {
    enable_undulation: boolean;
    color_scheme: 'professional' | 'contrast' | 'geological';
    transparency: number;
    enable_sections: boolean;
  };
}

interface GeologyProfessionalPanelProps {
  onModelGeneration: (params: GeologyModelingParams) => Promise<void>;
  onSectionView: (axis: 'x' | 'y' | 'z', position: number) => void;
  onPreview: (params: GeologyModelingParams) => void;
  isLoading?: boolean;
}

const GeologyProfessionalPanel: React.FC<GeologyProfessionalPanelProps> = ({
  onModelGeneration,
  onSectionView,
  onPreview,
  isLoading = false
}) => {
  const [form] = Form.useForm();
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [sectionAxis, setSectionAxis] = useState<'x' | 'y' | 'z'>('x');
  const [sectionPosition, setSectionPosition] = useState(0);
  const [modelingProgress, setModelingProgress] = useState(0);

  // 默认参数配置
  const defaultParams: GeologyModelingParams = {
    data_source: {
      file_path: 'boreholes_with_undulation.csv',
      format: 'csv',
      borehole_count: 100,
      layer_count: 8
    },
    rbf_config: {
      basis_function: 'multiquadric',
      surface_type: 'nurbs',
      smoothing: 0.1,
      epsilon: 1.0
    },
    domain_config: {
      mesh_resolution: 2.5,
      domain_extension: {
        x_extend: 250,
        y_extend: 250,
        bottom_elevation: -30
      },
      mesh_quality: 0.8,
      enable_adaptive_mesh: true
    },
    visualization: {
      enable_undulation: true,
      color_scheme: 'professional',
      transparency: 0.7,
      enable_sections: true
    }
  };

  const [modelingParams, setModelingParams] = useState<GeologyModelingParams>(defaultParams);

  // 处理文件上传
  const handleFileUpload = (info: any) => {
    const { status, originFileObj } = info.file;
    
    if (status === 'done') {
      setUploadedFiles([info.file]);
      setModelingParams(prev => ({
        ...prev,
        data_source: {
          ...prev.data_source,
          file_path: originFileObj?.name || 'uploaded_file.csv'
        }
      }));
      message.success('钻孔数据上传成功');
    } else if (status === 'error') {
      message.error('文件上传失败');
    }
  };

  // 处理参数变更
  const handleParameterChange = (section: keyof GeologyModelingParams, key: string, value: any) => {
    setModelingParams(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  // 开始地质建模
  const handleStartModeling = async () => {
    try {
      setModelingProgress(10);
      await onModelGeneration(modelingParams);
      setModelingProgress(100);
      message.success('地质建模完成');
    } catch (error) {
      message.error('地质建模失败');
      setModelingProgress(0);
    }
  };

  // 实时预览
  const handleRealTimePreview = () => {
    onPreview(modelingParams);
  };

  return (
    <div style={{ 
      height: '100%', 
      overflowY: 'auto',
      background: 'rgba(26, 26, 46, 0.95)',
      padding: '20px'
    }}>
      <Title level={4} style={{ color: '#00d9ff', marginBottom: '20px', textAlign: 'center' }}>
        专业地质建模系统
      </Title>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 数据导入模块 */}
        <Card 
          title={
            <span style={{ color: '#00d9ff', fontSize: '14px' }}>
              <DatabaseOutlined style={{ marginRight: '8px' }} />
              数据导入
            </span>
          }
          size="small"
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(0, 217, 255, 0.3)'
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Text style={{ color: '#ffffff', fontSize: '12px' }}>钻孔数据文件：</Text>
                <Upload
                  accept=".csv,.xlsx,.json"
                  onChange={handleFileUpload}
                  fileList={uploadedFiles}
                  maxCount={1}
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  <Button 
                    icon={<UploadOutlined />}
                    style={{
                      background: 'rgba(0, 217, 255, 0.1)',
                      borderColor: 'rgba(0, 217, 255, 0.4)',
                      color: '#ffffff',
                      width: '100%'
                    }}
                  >
                    选择文件 (.csv/.xlsx/.json)
                  </Button>
                </Upload>
              </Col>
            </Row>
            
            <Alert
              message={`当前数据: ${modelingParams.data_source.file_path}`}
              description={`${modelingParams.data_source.borehole_count} 个钻孔, ${modelingParams.data_source.layer_count} 层土体`}
              type="info"
              showIcon
              style={{ 
                background: 'rgba(24, 144, 255, 0.1)',
                border: '1px solid rgba(24, 144, 255, 0.3)'
              }}
            />
          </Space>
        </Card>

        {/* RBF插值算法模块 */}
        <Card 
          title={
            <span style={{ color: '#00d9ff', fontSize: '14px' }}>
              <ThunderboltOutlined style={{ marginRight: '8px' }} />
              RBF插值算法
            </span>
          }
          size="small"
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(0, 217, 255, 0.3)'
          }}
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Text style={{ color: '#ffffff', fontSize: '12px' }}>基函数类型：</Text>
              <Select
                value={modelingParams.rbf_config.basis_function}
                onChange={(value) => handleParameterChange('rbf_config', 'basis_function', value)}
                style={{ width: '100%', marginTop: '4px' }}
                size="small"
              >
                <Option value="multiquadric">多二次函数</Option>
                <Option value="thin_plate_spline">薄板样条</Option>
                <Option value="gaussian">高斯函数</Option>
                <Option value="linear">线性函数</Option>
              </Select>
            </Col>
            <Col span={12}>
              <Text style={{ color: '#ffffff', fontSize: '12px' }}>曲面类型：</Text>
              <Select
                value={modelingParams.rbf_config.surface_type}
                onChange={(value) => handleParameterChange('rbf_config', 'surface_type', value)}
                style={{ width: '100%', marginTop: '4px' }}
                size="small"
              >
                <Option value="nurbs">NURBS曲面</Option>
                <Option value="b_spline">B样条曲面</Option>
                <Option value="bezier">贝塞尔曲面</Option>
              </Select>
            </Col>
            <Col span={12}>
              <Text style={{ color: '#ffffff', fontSize: '12px' }}>平滑参数：</Text>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={modelingParams.rbf_config.smoothing}
                onChange={(value) => handleParameterChange('rbf_config', 'smoothing', value)}
                style={{ marginTop: '8px' }}
                trackStyle={{ backgroundColor: '#00d9ff' }}
                handleStyle={{ borderColor: '#00d9ff' }}
              />
            </Col>
            <Col span={12}>
              <Text style={{ color: '#ffffff', fontSize: '12px' }}>形状参数：</Text>
              <InputNumber
                min={0.1}
                max={10}
                step={0.1}
                value={modelingParams.rbf_config.epsilon}
                onChange={(value) => handleParameterChange('rbf_config', 'epsilon', value || 1.0)}
                style={{ width: '100%', marginTop: '8px' }}
                size="small"
              />
            </Col>
          </Row>
        </Card>

        {/* 主体计算域参数模块 */}
        <Card 
          title={
            <span style={{ color: '#00d9ff', fontSize: '14px' }}>
              <SettingOutlined style={{ marginRight: '8px' }} />
              主体计算域参数
            </span>
          }
          size="small"
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(0, 217, 255, 0.3)'
          }}
        >
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Text style={{ color: '#ffffff', fontSize: '12px' }}>网格分辨率 (m)：</Text>
              <Slider
                min={0.5}
                max={5}
                step={0.5}
                value={modelingParams.domain_config.mesh_resolution}
                onChange={(value) => handleParameterChange('domain_config', 'mesh_resolution', value)}
                style={{ marginTop: '8px' }}
                marks={{
                  0.5: '精细',
                  2.5: '标准', 
                  5: '粗糙'
                }}
                trackStyle={{ backgroundColor: '#00d9ff' }}
                handleStyle={{ borderColor: '#00d9ff' }}
              />
            </Col>
            <Col span={8}>
              <Text style={{ color: '#ffffff', fontSize: '12px' }}>X扩展 (m)：</Text>
              <InputNumber
                value={modelingParams.domain_config.domain_extension.x_extend}
                onChange={(value) => {
                  const newExtension = { ...modelingParams.domain_config.domain_extension, x_extend: value || 250 };
                  handleParameterChange('domain_config', 'domain_extension', newExtension);
                }}
                style={{ width: '100%', marginTop: '4px' }}
                size="small"
              />
            </Col>
            <Col span={8}>
              <Text style={{ color: '#ffffff', fontSize: '12px' }}>Y扩展 (m)：</Text>
              <InputNumber
                value={modelingParams.domain_config.domain_extension.y_extend}
                onChange={(value) => {
                  const newExtension = { ...modelingParams.domain_config.domain_extension, y_extend: value || 250 };
                  handleParameterChange('domain_config', 'domain_extension', newExtension);
                }}
                style={{ width: '100%', marginTop: '4px' }}
                size="small"
              />
            </Col>
            <Col span={8}>
              <Text style={{ color: '#ffffff', fontSize: '12px' }}>底部标高 (m)：</Text>
              <InputNumber
                value={modelingParams.domain_config.domain_extension.bottom_elevation}
                onChange={(value) => {
                  const newExtension = { ...modelingParams.domain_config.domain_extension, bottom_elevation: value || -30 };
                  handleParameterChange('domain_config', 'domain_extension', newExtension);
                }}
                style={{ width: '100%', marginTop: '4px' }}
                size="small"
              />
            </Col>
            <Col span={12}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#ffffff', fontSize: '12px' }}>自适应网格：</Text>
                <Switch
                  checked={modelingParams.domain_config.enable_adaptive_mesh}
                  onChange={(checked) => handleParameterChange('domain_config', 'enable_adaptive_mesh', checked)}
                  style={{ backgroundColor: modelingParams.domain_config.enable_adaptive_mesh ? '#00d9ff' : undefined }}
                />
              </div>
            </Col>
            <Col span={12}>
              <Text style={{ color: '#ffffff', fontSize: '12px' }}>网格质量：</Text>
              <Slider
                min={0.1}
                max={1.0}
                step={0.1}
                value={modelingParams.domain_config.mesh_quality}
                onChange={(value) => handleParameterChange('domain_config', 'mesh_quality', value)}
                style={{ marginTop: '8px' }}
                trackStyle={{ backgroundColor: '#00d9ff' }}
                handleStyle={{ borderColor: '#00d9ff' }}
              />
            </Col>
          </Row>
        </Card>

        {/* 模型生成与剖视图模块 */}
        <Card 
          title={
            <span style={{ color: '#00d9ff', fontSize: '14px' }}>
              <ExperimentOutlined style={{ marginRight: '8px' }} />
              模型生成
            </span>
          }
          size="small"
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(0, 217, 255, 0.3)'
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {modelingProgress > 0 && (
              <Progress 
                percent={modelingProgress} 
                status={modelingProgress === 100 ? "success" : "active"}
                strokeColor="#00d9ff"
              />
            )}
            
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Button
                  type="primary"
                  icon={<ExperimentOutlined />}
                  onClick={handleStartModeling}
                  loading={isLoading}
                  style={{
                    background: 'linear-gradient(135deg, #00d9ff 0%, #0099cc 100%)',
                    borderColor: '#00d9ff',
                    width: '100%',
                    height: '36px',
                    fontSize: '12px'
                  }}
                >
                  生成地质模型
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  icon={<EyeOutlined />}
                  onClick={handleRealTimePreview}
                  style={{
                    background: 'rgba(0, 217, 255, 0.1)',
                    borderColor: 'rgba(0, 217, 255, 0.4)',
                    color: '#ffffff',
                    width: '100%',
                    height: '36px',
                    fontSize: '12px'
                  }}
                >
                  实时预览
                </Button>
              </Col>
            </Row>

            <Divider style={{ borderColor: 'rgba(0, 217, 255, 0.3)', margin: '12px 0' }} />

            {/* 剖切视图控制 */}
            <div>
              <Text style={{ color: '#00d9ff', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                创建剖视图
              </Text>
              <Row gutter={[8, 8]} align="middle">
                <Col span={8}>
                  <Text style={{ color: '#ffffff', fontSize: '11px' }}>剖切轴：</Text>
                  <Select
                    value={sectionAxis}
                    onChange={setSectionAxis}
                    style={{ width: '100%', marginTop: '4px' }}
                    size="small"
                  >
                    <Option value="x">X轴</Option>
                    <Option value="y">Y轴</Option>
                    <Option value="z">Z轴</Option>
                  </Select>
                </Col>
                <Col span={10}>
                  <Text style={{ color: '#ffffff', fontSize: '11px' }}>位置：</Text>
                  <Slider
                    min={-250}
                    max={250}
                    value={sectionPosition}
                    onChange={setSectionPosition}
                    style={{ marginTop: '8px' }}
                    trackStyle={{ backgroundColor: '#00d9ff' }}
                    handleStyle={{ borderColor: '#00d9ff' }}
                  />
                </Col>
                <Col span={6}>
                  <Button
                    icon={<ScissorOutlined />}
                    onClick={() => onSectionView(sectionAxis, sectionPosition)}
                    style={{
                      background: 'rgba(0, 217, 255, 0.1)',
                      borderColor: 'rgba(0, 217, 255, 0.4)',
                      color: '#ffffff',
                      width: '100%',
                      fontSize: '11px'
                    }}
                  >
                    剖切
                  </Button>
                </Col>
              </Row>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default GeologyProfessionalPanel;