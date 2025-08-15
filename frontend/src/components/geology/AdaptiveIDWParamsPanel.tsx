import React from 'react';
import { Card, Form, InputNumber, Row, Col, Switch, Select } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

// no text
const { Option } = Select;

export interface AdaptiveIDWParams {
  power: number;             // 幂指数
  maxNeighbors: number;      // 最大邻居数
  minNeighbors: number;      // 最小邻居数
  searchRadius: number;      // 搜索半径
  adaptive: boolean;         // 是否自适应幂次
  powerMin?: number;         // 自适应最小幂次
  powerMax?: number;         // 自适应最大幂次
  weighting?: 'distance'|'angle'|'hybrid';
}

interface Props {
  value: AdaptiveIDWParams;
  onChange: (v: AdaptiveIDWParams) => void;
  disabled?: boolean;
}

const AdaptiveIDWParamsPanel: React.FC<Props> = ({ value, onChange, disabled }) => {
  const set = (k: keyof AdaptiveIDWParams, v: any) => onChange({ ...value, [k]: v });
  return (
    <Card size="small" title={<span><SettingOutlined /> 自适应IDW参数</span>} bodyStyle={{ padding: 12 }}>
      <Form layout="vertical" size="small">
        <Row gutter={12}>
          <Col xs={12} md={4}>
            <Form.Item label={<span>幂指数p</span>}>
              <InputNumber min={0.1} max={8} step={0.1} value={value.power} onChange={v=>set('power', v||value.power)} disabled={disabled || value.adaptive} style={{ width:'100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label={<span>最小邻居</span>}>
              <InputNumber min={1} max={100} step={1} value={value.minNeighbors} onChange={v=>set('minNeighbors', v||value.minNeighbors)} disabled={disabled} style={{ width:'100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label={<span>最大邻居</span>}>
              <InputNumber min={1} max={200} step={1} value={value.maxNeighbors} onChange={v=>set('maxNeighbors', v||value.maxNeighbors)} disabled={disabled} style={{ width:'100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label={<span>搜索半径(m)</span>}>
              <InputNumber min={1} max={10000} step={1} value={value.searchRadius} onChange={v=>set('searchRadius', v||value.searchRadius)} disabled={disabled} style={{ width:'100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label={<span>加权策略</span>}>
              <Select value={value.weighting||'distance'} onChange={v=>set('weighting', v)} disabled={disabled}>
                <Option value="distance">按距离</Option>
                <Option value="angle">按角度</Option>
                <Option value="hybrid">混合</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col xs={12} md={4}>
            <Form.Item label={<span>自适应幂次</span>}>
              <Switch checked={value.adaptive} onChange={v=>set('adaptive', v)} disabled={disabled} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label={<span>p最小</span>}>
              <InputNumber min={0.1} max={value.powerMax||8} step={0.1} value={value.powerMin||1} onChange={v=>set('powerMin', v||1)} disabled={disabled || !value.adaptive} style={{ width:'100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label={<span>p最大</span>}>
              <InputNumber min={value.powerMin||0.1} max={8} step={0.1} value={value.powerMax||4} onChange={v=>set('powerMax', v||4)} disabled={disabled || !value.adaptive} style={{ width:'100%' }} />
            </Form.Item>
          </Col>
        </Row>
  {/* 提示性文字已移除 */}
      </Form>
    </Card>
  );
};

export default AdaptiveIDWParamsPanel;
