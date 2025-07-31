/**
 * 临时占位符组件 - 解决左侧几何建模面板空白问题
 * 提供简化版本的地质建模、基坑开挖、支护结构组件
 */

import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Form, 
  InputNumber, 
  Select, 
  Switch, 
  Slider, 
  Upload, 
  Alert,
  Row,
  Col,
  Progress,
  message
} from 'antd';
import { 
  EnvironmentOutlined,
  ExperimentOutlined,
  SafetyOutlined,
  UploadOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

// 简化的地质建模组件
export const SimpleGeologyModule: React.FC<{
  onParamsChange?: (params: any) => void;
  onGenerate?: (data: any) => void;
  status?: 'wait' | 'process' | 'finish' | 'error';
}> = ({ onParamsChange, onGenerate, status = 'wait' }) => {
  const [params, setParams] = useState({
    interpolationMethod: 'kriging',
    gridResolution: 2.0,
    xExtend: 50,
    yExtend: 50,
    bottomElevation: -30
  });

  const updateParam = (key: string, value: any) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    onParamsChange?.(newParams);
  };

  const handleGenerate = () => {
    onGenerate?.(params);
  };

  return (
    <div style={{ padding: '16px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div style={{ textAlign: 'center' }}>
          <EnvironmentOutlined style={{ fontSize: '24px', color: '#00d9ff', marginBottom: '8px' }} />
          <Title level={5} style={{ margin: 0, color: '#00d9ff' }}>地质建模</Title>
        </div>

        <Card title="钻孔数据" size="small">
          <Dragger
            accept=".csv,.json,.xlsx"
            beforeUpload={(file) => {
              message.success(`已选择文件: ${file.name}`);
              return false;
            }}
          >
            <p><UploadOutlined style={{ fontSize: '24px', color: '#00d9ff' }} /></p>
            <p>点击或拖拽上传钻孔数据</p>
            <p style={{ fontSize: '12px', color: '#666' }}>支持 CSV、JSON、Excel 格式</p>
          </Dragger>
        </Card>

        <Card title="建模参数" size="small">
          <Form layout="vertical" size="small">
            <Form.Item label="插值方法">
              <Select
                value={params.interpolationMethod}
                onChange={(value) => updateParam('interpolationMethod', value)}
                style={{ width: '100%' }}
              >
                <Option value="kriging">克里金插值</Option>
                <Option value="idw">反距离权重</Option>
                <Option value="spline">样条插值</Option>
              </Select>
            </Form.Item>

            <Form.Item label="网格分辨率 (m)">
              <Slider
                value={params.gridResolution}
                onChange={(value) => updateParam('gridResolution', value)}
                min={0.5}
                max={10}
                step={0.5}
                marks={{ 0.5: '精细', 2.0: '标准', 10: '粗糙' }}
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="X方向延拓 (m)">
                  <InputNumber
                    value={params.xExtend}
                    onChange={(value) => updateParam('xExtend', value || 50)}
                    min={10}
                    max={200}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Y方向延拓 (m)">
                  <InputNumber
                    value={params.yExtend}
                    onChange={(value) => updateParam('yExtend', value || 50)}
                    min={10}
                    max={200}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        <Button
          type="primary"
          size="large"
          icon={status === 'finish' ? <CheckCircleOutlined /> : <PlayCircleOutlined />}
          onClick={handleGenerate}
          loading={status === 'process'}
          style={{ width: '100%' }}
        >
          {status === 'finish' ? '地质建模完成' : 
           status === 'process' ? '建模中...' : '开始地质建模'}
        </Button>

        {status === 'process' && (
          <Progress percent={Math.random() * 100} size="small" />
        )}

        {status === 'finish' && (
          <Alert
            message="地质建模完成"
            description="三维地质模型已生成，可进行基坑开挖设计"
            type="success"
            showIcon
          />
        )}
      </Space>
    </div>
  );
};

// 简化的基坑开挖组件
export const SimpleExcavationModule: React.FC<{
  onParamsChange?: (key: string, value: any) => void;
  onGenerate?: (data: any) => void;
  status?: 'wait' | 'process' | 'finish' | 'error';
  disabled?: boolean;
}> = ({ onParamsChange, onGenerate, status = 'wait', disabled = false }) => {
  const [params, setParams] = useState({
    depth: 15,
    layerHeight: 3,
    slopeRatio: 0.5
  });

  const updateParam = (key: string, value: any) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    onParamsChange?.(key, value);
  };

  const handleGenerate = () => {
    onGenerate?.(params);
  };

  return (
    <div style={{ padding: '16px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div style={{ textAlign: 'center' }}>
          <ExperimentOutlined style={{ fontSize: '24px', color: '#fa8c16', marginBottom: '8px' }} />
          <Title level={5} style={{ margin: 0, color: '#fa8c16' }}>基坑开挖</Title>
        </div>

        {disabled && (
          <Alert
            message="请先完成地质建模"
            description="基坑开挖需要基于地质模型进行"
            type="warning"
            showIcon
          />
        )}

        <Card title="开挖参数" size="small">
          <Form layout="vertical" size="small">
            <Form.Item label="开挖深度 (m)">
              <InputNumber
                value={params.depth}
                onChange={(value) => updateParam('depth', value || 15)}
                min={1}
                max={50}
                style={{ width: '100%' }}
                disabled={disabled}
              />
            </Form.Item>

            <Form.Item label="分层高度 (m)">
              <InputNumber
                value={params.layerHeight}
                onChange={(value) => updateParam('layerHeight', value || 3)}
                min={1}
                max={10}
                step={0.5}
                style={{ width: '100%' }}
                disabled={disabled}
              />
            </Form.Item>

            <Form.Item label="坡率系数">
              <Slider
                value={params.slopeRatio}
                onChange={(value) => updateParam('slopeRatio', value)}
                min={0}
                max={2}
                step={0.1}
                marks={{ 0: '垂直', 1: '45°', 2: '缓坡' }}
                disabled={disabled}
              />
            </Form.Item>
          </Form>
        </Card>

        <Button
          type="primary"
          size="large"
          icon={status === 'finish' ? <CheckCircleOutlined /> : <ExperimentOutlined />}
          onClick={handleGenerate}
          loading={status === 'process'}
          disabled={disabled}
          style={{ width: '100%' }}
        >
          {status === 'finish' ? '开挖设计完成' : 
           status === 'process' ? '设计中...' : '开始开挖设计'}
        </Button>

        {status === 'process' && (
          <Progress percent={Math.random() * 100} size="small" />
        )}

        {status === 'finish' && (
          <Alert
            message="基坑开挖设计完成"
            description="基坑几何已生成，可进行支护结构设计"
            type="success"
            showIcon
          />
        )}
      </Space>
    </div>
  );
};

// 简化的支护结构组件
export const SimpleSupportModule: React.FC<{
  onParamsChange?: (category: string, key: string, value: any) => void;
  onGenerate?: (data: any) => void;
  status?: 'wait' | 'process' | 'finish' | 'error';
  disabled?: boolean;
}> = ({ onParamsChange, onGenerate, status = 'wait', disabled = false }) => {
  const [params, setParams] = useState({
    diaphragmWall: {
      enabled: true,
      thickness: 0.8,
      depth: 25
    },
    anchor: {
      enabled: false,
      length: 15,
      angle: 15
    }
  });

  const updateParam = (category: string, key: string, value: any) => {
    const newParams = {
      ...params,
      [category]: {
        ...params[category as keyof typeof params],
        [key]: value
      }
    };
    setParams(newParams);
    onParamsChange?.(category, key, value);
  };

  const handleGenerate = () => {
    onGenerate?.(params);
  };

  return (
    <div style={{ padding: '16px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div style={{ textAlign: 'center' }}>
          <SafetyOutlined style={{ fontSize: '24px', color: '#52c41a', marginBottom: '8px' }} />
          <Title level={5} style={{ margin: 0, color: '#52c41a' }}>支护结构</Title>
        </div>

        {disabled && (
          <Alert
            message="请先完成基坑开挖"
            description="支护结构需要基于开挖几何进行设计"
            type="warning"
            showIcon
          />
        )}

        <Card title="地下连续墙" size="small">
          <Form layout="vertical" size="small">
            <Form.Item>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>启用地连墙</Text>
                <Switch
                  checked={params.diaphragmWall.enabled}
                  onChange={(checked) => updateParam('diaphragmWall', 'enabled', checked)}
                  disabled={disabled}
                />
              </div>
            </Form.Item>

            {params.diaphragmWall.enabled && (
              <>
                <Form.Item label="墙体厚度 (m)">
                  <InputNumber
                    value={params.diaphragmWall.thickness}
                    onChange={(value) => updateParam('diaphragmWall', 'thickness', value || 0.8)}
                    min={0.6}
                    max={2.0}
                    step={0.1}
                    style={{ width: '100%' }}
                    disabled={disabled}
                  />
                </Form.Item>

                <Form.Item label="入土深度 (m)">
                  <InputNumber
                    value={params.diaphragmWall.depth}
                    onChange={(value) => updateParam('diaphragmWall', 'depth', value || 25)}
                    min={5}
                    max={80}
                    style={{ width: '100%' }}
                    disabled={disabled}
                  />
                </Form.Item>
              </>
            )}
          </Form>
        </Card>

        <Card title="锚杆系统" size="small">
          <Form layout="vertical" size="small">
            <Form.Item>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>启用锚杆</Text>
                <Switch
                  checked={params.anchor.enabled}
                  onChange={(checked) => updateParam('anchor', 'enabled', checked)}
                  disabled={disabled}
                />
              </div>
            </Form.Item>

            {params.anchor.enabled && (
              <>
                <Form.Item label="锚杆长度 (m)">
                  <InputNumber
                    value={params.anchor.length}
                    onChange={(value) => updateParam('anchor', 'length', value || 15)}
                    min={5}
                    max={40}
                    style={{ width: '100%' }}
                    disabled={disabled}
                  />
                </Form.Item>

                <Form.Item label="倾斜角度 (°)">
                  <InputNumber
                    value={params.anchor.angle}
                    onChange={(value) => updateParam('anchor', 'angle', value || 15)}
                    min={0}
                    max={45}
                    style={{ width: '100%' }}
                    disabled={disabled}
                  />
                </Form.Item>
              </>
            )}
          </Form>
        </Card>

        <Button
          type="primary"
          size="large"
          icon={status === 'finish' ? <CheckCircleOutlined /> : <SafetyOutlined />}
          onClick={handleGenerate}
          loading={status === 'process'}
          disabled={disabled || (!params.diaphragmWall.enabled && !params.anchor.enabled)}
          style={{ width: '100%' }}
        >
          {status === 'finish' ? '支护设计完成' : 
           status === 'process' ? '设计中...' : '开始支护设计'}
        </Button>

        {status === 'process' && (
          <Progress percent={Math.random() * 100} size="small" />
        )}

        {status === 'finish' && (
          <Alert
            message="支护结构设计完成"
            description="几何建模流程已全部完成，可进行网格划分"
            type="success"
            showIcon
          />
        )}
      </Space>
    </div>
  );
};

export default {
  SimpleGeologyModule,
  SimpleExcavationModule,
  SimpleSupportModule
};