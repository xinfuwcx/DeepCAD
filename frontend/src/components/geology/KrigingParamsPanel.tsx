import React from 'react';
import { Card, Form, Select, InputNumber, Row, Col, Switch } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

// no text
const { Option } = Select;

export interface KrigingParams {
  variogramModel: 'gaussian' | 'exponential' | 'spherical';
  range: number;      // 有效范围
  sill: number;       // 基台
  nugget: number;     // 块金值
  searchRadius: number;
  minSamples: number;
  maxSamples: number;
  anisotropy?: boolean;
  anisotropyRatio?: number; // 水平/垂向比
}

interface Props {
  value: KrigingParams;
  onChange: (v: KrigingParams) => void;
  disabled?: boolean;
}

const KrigingParamsPanel: React.FC<Props> = ({ value, onChange, disabled }) => {
  const set = (k: keyof KrigingParams, v: any) => onChange({ ...value, [k]: v });
  return (
    <Card size="small" title={<span><SettingOutlined /> 克里金参数</span>} bodyStyle={{ padding: 12 }}>
      <Form layout="vertical" size="small">
        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Form.Item label="变差函数模型">
              <Select value={value.variogramModel} onChange={v=>set('variogramModel', v)} disabled={disabled}>
                <Option value="gaussian">高斯</Option>
                <Option value="exponential">指数</Option>
                <Option value="spherical">球状</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label={<span>Range</span>}>
              <InputNumber min={1} max={10000} step={1} value={value.range} onChange={v=>set('range', v||value.range)} disabled={disabled} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label={<span>Sill</span>}>
              <InputNumber min={0} max={1e6} step={0.01} value={value.sill} onChange={v=>set('sill', v||value.sill)} disabled={disabled} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label={<span>Nugget</span>}>
              <InputNumber min={0} max={1e6} step={0.01} value={value.nugget} onChange={v=>set('nugget', v||value.nugget)} disabled={disabled} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label={<span>搜索半径(m)</span>}>
              <InputNumber min={1} max={10000} step={1} value={value.searchRadius} onChange={v=>set('searchRadius', v||value.searchRadius)} disabled={disabled} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col xs={12} md={4}>
            <Form.Item label={<span>最小邻居数</span>}>
              <InputNumber min={1} max={100} step={1} value={value.minSamples} onChange={v=>set('minSamples', v||value.minSamples)} disabled={disabled} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label={<span>最大邻居数</span>}>
              <InputNumber min={1} max={200} step={1} value={value.maxSamples} onChange={v=>set('maxSamples', v||value.maxSamples)} disabled={disabled} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label={<span>各向异性</span>}>
              <Switch checked={!!value.anisotropy} onChange={v=>set('anisotropy', v)} disabled={disabled} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item label={<span>各向异性比</span>}>
              <InputNumber min={0.1} max={10} step={0.1} value={value.anisotropyRatio ?? 1} onChange={v=>set('anisotropyRatio', v||1)} disabled={disabled || !value.anisotropy} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
  {/* 提示性文字已移除 */}
      </Form>
    </Card>
  );
};

export default KrigingParamsPanel;
