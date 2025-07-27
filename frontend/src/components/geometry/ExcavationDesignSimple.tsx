/**
 * 简洁版开挖设计界面
 * 重点：参数输入 → 实时3D预览
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, Form, InputNumber, Select, Slider, Switch, 
  Button, Space, Typography, Row, Col, Divider, Upload
} from 'antd';
import { 
  BuildOutlined, CalculatorOutlined, UploadOutlined, EyeOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

interface ExcavationParams {
  geometry: {
    width: number;
    length: number;
    depth: number;
    slopeAngle: number;
  };
  stages: {
    stageCount: number;
    depthPerStage: number;
  };
  calculation: {
    method: 'simple' | 'triangular' | 'grid';
    precision: number;
  };
  visualization: {
    showContour: boolean;
    showGrid: boolean;
    opacity: number;
  };
}

interface ExcavationDesignSimpleProps {
  onParamsChange?: (params: ExcavationParams) => void;
}

const ExcavationDesignSimple: React.FC<ExcavationDesignSimpleProps> = ({ 
  onParamsChange 
}) => {
  const [params, setParams] = useState<ExcavationParams>({
    geometry: {
      width: 50,
      length: 30,
      depth: 15,
      slopeAngle: 45
    },
    stages: {
      stageCount: 3,
      depthPerStage: 5
    },
    calculation: {
      method: 'triangular',
      precision: 1
    },
    visualization: {
      showContour: true,
      showGrid: false,
      opacity: 0.7
    }
  });

  const [dxfUploaded, setDxfUploaded] = useState(false);

  // 实时传递参数变化并更新主3D视口
  useEffect(() => {
    if (onParamsChange) {
      onParamsChange(params);
    }
    
    // 通知主3D视口更新开挖预览
    window.dispatchEvent(new CustomEvent('update-excavation-preview', { 
      detail: params 
    }));
  }, [params, onParamsChange]);

  const updateParams = (path: string, value: any) => {
    setParams(prev => {
      const newParams = { ...prev };
      const keys = path.split('.');
      let current: any = newParams;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      return newParams;
    });
  };

  // 计算开挖体积
  const calculateVolume = () => {
    const { width, length, depth } = params.geometry;
    return (width * length * depth).toFixed(0);
  };

  const handleDxfUpload = (file: any) => {
    setDxfUploaded(true);
    
    // 通知主3D视口显示DXF轮廓
    window.dispatchEvent(new CustomEvent('dxf-uploaded', { 
      detail: { file, params } 
    }));
    
    return false; // 阻止自动上传
  };

  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      {/* 标题 */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <Title level={4} style={{ color: '#00d9ff', margin: 0 }}>
          <BuildOutlined style={{ marginRight: '8px' }} />
          基坑开挖设计
        </Title>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          调整参数，实时查看开挖效果
        </Text>
      </div>

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* DXF导入 */}
        <Card title="📄 轮廓导入" size="small">
          <Dragger
            accept=".dxf,.dwg"
            beforeUpload={handleDxfUpload}
            showUploadList={false}
            style={{ 
              background: dxfUploaded ? 'rgba(82, 196, 26, 0.1)' : 'rgba(0, 217, 255, 0.05)',
              border: `1px dashed ${dxfUploaded ? '#52c41a' : 'rgba(0, 217, 255, 0.4)'}`
            }}
          >
            <p style={{ margin: 0, fontSize: '18px', color: dxfUploaded ? '#52c41a' : '#00d9ff' }}>
              <UploadOutlined />
            </p>
            <p style={{ color: '#ffffff', fontSize: '12px', margin: '4px 0' }}>
              {dxfUploaded ? '✅ DXF文件已导入' : '点击或拖拽DXF文件'}
            </p>
          </Dragger>
        </Card>

        {/* 开挖几何 */}
        <Card title="📐 开挖几何" size="small">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="宽度(m)">
                <Slider
                  value={params.geometry.width}
                  onChange={(value) => updateParams('geometry.width', value)}
                  min={20}
                  max={100}
                  marks={{ 20: '20', 60: '60', 100: '100' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="长度(m)">
                <Slider
                  value={params.geometry.length}
                  onChange={(value) => updateParams('geometry.length', value)}
                  min={15}
                  max={80}
                  marks={{ 15: '15', 47: '47', 80: '80' }}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="开挖深度(m)">
                <InputNumber
                  value={params.geometry.depth}
                  onChange={(value) => updateParams('geometry.depth', value || 15)}
                  min={5}
                  max={30}
                  step={1}
                  style={{ width: '100%' }}
                  suffix="m"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="边坡角度(°)">
                <InputNumber
                  value={params.geometry.slopeAngle}
                  onChange={(value) => updateParams('geometry.slopeAngle', value || 45)}
                  min={30}
                  max={90}
                  step={5}
                  style={{ width: '100%' }}
                  suffix="°"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 分步开挖 */}
        <Card title="🏗️ 分步开挖" size="small">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="开挖分步数">
                <Select
                  value={params.stages.stageCount}
                  onChange={(value) => updateParams('stages.stageCount', value)}
                  style={{ width: '100%' }}
                >
                  <Option value={1}>一次开挖</Option>
                  <Option value={2}>两步开挖</Option>
                  <Option value={3}>三步开挖</Option>
                  <Option value={4}>四步开挖</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="每步深度(m)">
                <InputNumber
                  value={Math.round(params.geometry.depth / params.stages.stageCount * 10) / 10}
                  disabled
                  style={{ width: '100%' }}
                  suffix="m"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 体积计算 */}
        <Card title="📊 体积计算" size="small">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="计算方法">
                <Select
                  value={params.calculation.method}
                  onChange={(value) => updateParams('calculation.method', value)}
                  style={{ width: '100%' }}
                >
                  <Option value="simple">简单计算</Option>
                  <Option value="triangular">三角剖分</Option>
                  <Option value="grid">网格积分</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="计算精度">
                <Select
                  value={params.calculation.precision}
                  onChange={(value) => updateParams('calculation.precision', value)}
                  style={{ width: '100%' }}
                >
                  <Option value={0.1}>高精度(±0.1%)</Option>
                  <Option value={1}>中精度(±1%)</Option>
                  <Option value={2}>低精度(±2%)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 可视化 */}
        <Card title="👁️ 可视化" size="small">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="透明度">
                <Slider
                  value={params.visualization.opacity}
                  onChange={(value) => updateParams('visualization.opacity', value)}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  marks={{ 0.1: '透明', 0.5: '半透明', 1.0: '不透明' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="显示选项">
                <Space direction="vertical">
                  <div>
                    <Switch
                      checked={params.visualization.showContour}
                      onChange={(checked) => updateParams('visualization.showContour', checked)}
                      size="small"
                    />
                    <Text style={{ marginLeft: '8px', fontSize: '12px' }}>显示轮廓</Text>
                  </div>
                  <div>
                    <Switch
                      checked={params.visualization.showGrid}
                      onChange={(checked) => updateParams('visualization.showGrid', checked)}
                      size="small"
                    />
                    <Text style={{ marginLeft: '8px', fontSize: '12px' }}>显示网格</Text>
                  </div>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 操作按钮 */}
        <Card size="small">
          <Row gutter={8}>
            <Col span={12}>
              <Button
                type="primary"
                icon={<BuildOutlined />}
                style={{ width: '100%', background: '#00d9ff', borderColor: '#00d9ff' }}
                onClick={() => {
                  // 通知主3D视口生成完整开挖几何
                  window.dispatchEvent(new CustomEvent('generate-excavation-geometry', { 
                    detail: params 
                  }));
                }}
              >
                构建3D几何
              </Button>
            </Col>
            <Col span={12}>
              <Button
                icon={<CalculatorOutlined />}
                style={{ width: '100%' }}
                onClick={() => {
                  // 通知主3D视口计算开挖体积
                  window.dispatchEvent(new CustomEvent('calculate-excavation-volume', { 
                    detail: params 
                  }));
                }}
              >
                计算体积
              </Button>
            </Col>
          </Row>
        </Card>
      </Space>

      {/* 参数摘要 */}
      <Divider />
      <div style={{ 
        background: 'rgba(0, 217, 255, 0.05)', 
        padding: '12px', 
        borderRadius: '6px',
        border: '1px solid rgba(0, 217, 255, 0.2)'
      }}>
        <Text style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
          开挖尺寸: {params.geometry.width}×{params.geometry.length}×{params.geometry.depth}m | 
          预估体积: {calculateVolume()}m³ | 
          {params.stages.stageCount}步开挖 | 
          {params.calculation.method}计算(±{params.calculation.precision}%精度)
        </Text>
      </div>
    </div>
  );
};

export default ExcavationDesignSimple;