import React, { useState, useEffect } from 'react';
import { 
  Card, Form, InputNumber, Select, Slider, Button, 
  Space, Typography, Row, Col, Radio, Switch
} from 'antd';
import { 
  SafetyOutlined, BorderOutlined, ApartmentOutlined, 
  AimOutlined, EyeOutlined, BuildOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface SupportParams {
  structureType: 'diaphragm' | 'pile' | 'anchor';
  diaphragm: {
    thickness: number;
    depth: number;
    length: number;
    concreteGrade: string;
    reinforcement: string;
  };
  pile: {
    diameter: number;
    depth: number;
    spacing: number;
    rows: number;
    pileType: string;
  };
  anchor: {
    length: number;
    diameter: number;
    angle: number;
    spacing: number;
    prestress: number;
  };
  visualization: {
    showReinforcement: boolean;
    showDimensions: boolean;
    opacity: number;
  };
}

interface SupportStructureSimpleProps {
  onParamsChange?: (params: SupportParams) => void;
}

const SupportStructureSimple: React.FC<SupportStructureSimpleProps> = ({ 
  onParamsChange 
}) => {
  const [params, setParams] = useState<SupportParams>({
    structureType: 'diaphragm',
    diaphragm: {
      thickness: 0.8,
      depth: 20,
      length: 50,
      concreteGrade: 'C30',
      reinforcement: 'HRB400'
    },
    pile: {
      diameter: 0.8,
      depth: 18,
      spacing: 2.0,
      rows: 1,
      pileType: 'bored_cast_in_place'
    },
    anchor: {
      length: 15,
      diameter: 0.15,
      angle: 15,
      spacing: 2.5,
      prestress: 300
    },
    visualization: {
      showReinforcement: true,
      showDimensions: false,
      opacity: 0.8
    }
  });

  // 实时传递参数变化并更新主3D视口
  useEffect(() => {
    if (onParamsChange) {
      onParamsChange(params);
    }
    
    // 通知主3D视口更新支护结构预览
    window.dispatchEvent(new CustomEvent('update-support-preview', { 
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

  const renderDiaphragmParams = () => (
    <Card title="🏗️ 地连墙参数" size="small">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="墙体厚度(m)">
            <Slider
              value={params.diaphragm.thickness}
              onChange={(value) => updateParams('diaphragm.thickness', value)}
              min={0.6}
              max={1.5}
              step={0.1}
              marks={{ 0.6: '0.6', 1.0: '1.0', 1.5: '1.5' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="入土深度(m)">
            <InputNumber
              value={params.diaphragm.depth}
              onChange={(value) => updateParams('diaphragm.depth', value || 20)}
              min={10}
              max={40}
              step={1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="混凝土等级">
            <Select
              value={params.diaphragm.concreteGrade}
              onChange={(value) => updateParams('diaphragm.concreteGrade', value)}
              style={{ width: '100%' }}
            >
              <Option value="C25">C25</Option>
              <Option value="C30">C30</Option>
              <Option value="C35">C35</Option>
              <Option value="C40">C40</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="钢筋等级">
            <Select
              value={params.diaphragm.reinforcement}
              onChange={(value) => updateParams('diaphragm.reinforcement', value)}
              style={{ width: '100%' }}
            >
              <Option value="HRB335">HRB335</Option>
              <Option value="HRB400">HRB400</Option>
              <Option value="HRB500">HRB500</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  const renderPileParams = () => (
    <Card title="🔩 桩基参数" size="small">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="桩径(m)">
            <Slider
              value={params.pile.diameter}
              onChange={(value) => updateParams('pile.diameter', value)}
              min={0.6}
              max={1.5}
              step={0.1}
              marks={{ 0.6: '0.6', 1.0: '1.0', 1.5: '1.5' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="桩长(m)">
            <InputNumber
              value={params.pile.depth}
              onChange={(value) => updateParams('pile.depth', value || 18)}
              min={8}
              max={30}
              step={1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="桩间距(m)">
            <Slider
              value={params.pile.spacing}
              onChange={(value) => updateParams('pile.spacing', value)}
              min={1.5}
              max={4.0}
              step={0.1}
              marks={{ 1.5: '1.5', 2.5: '2.5', 4.0: '4.0' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="排数">
            <Radio.Group
              value={params.pile.rows}
              onChange={(e) => updateParams('pile.rows', e.target.value)}
            >
              <Radio value={1}>单排</Radio>
              <Radio value={2}>双排</Radio>
              <Radio value={3}>三排</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  const renderAnchorParams = () => (
    <Card title="⚓ 锚杆参数" size="small">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="锚杆长度(m)">
            <InputNumber
              value={params.anchor.length}
              onChange={(value) => updateParams('anchor.length', value || 15)}
              min={8}
              max={25}
              step={1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="锚杆直径(mm)">
            <Select
              value={params.anchor.diameter}
              onChange={(value) => updateParams('anchor.diameter', value)}
              style={{ width: '100%' }}
            >
              <Option value={0.1}>φ100</Option>
              <Option value={0.15}>φ150</Option>
              <Option value={0.2}>φ200</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={`倾角: ${params.anchor.angle}°`}>
            <Slider
              value={params.anchor.angle}
              onChange={(value) => updateParams('anchor.angle', value)}
              min={10}
              max={30}
              step={5}
              marks={{ 10: '10°', 20: '20°', 30: '30°' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="预应力(kN)">
            <InputNumber
              value={params.anchor.prestress}
              onChange={(value) => updateParams('anchor.prestress', value || 300)}
              min={200}
              max={600}
              step={50}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      {/* 标题 */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <Title level={4} style={{ color: '#fa8c16', margin: 0 }}>
          <SafetyOutlined style={{ marginRight: '8px' }} />
          支护结构设计
        </Title>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          选择支护类型，调整参数查看效果
        </Text>
      </div>

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 支护类型选择 */}
        <Card title="🎯 支护类型" size="small">
          <Radio.Group
            value={params.structureType}
            onChange={(e) => updateParams('structureType', e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value="diaphragm">
                <BorderOutlined style={{ marginRight: '8px' }} />
                地下连续墙
              </Radio>
              <Radio value="pile">
                <ApartmentOutlined style={{ marginRight: '8px' }} />
                排桩支护
              </Radio>
              <Radio value="anchor">
                <AimOutlined style={{ marginRight: '8px' }} />
                锚杆支护
              </Radio>
            </Space>
          </Radio.Group>
        </Card>

        {/* 动态参数面板 */}
        {params.structureType === 'diaphragm' && renderDiaphragmParams()}
        {params.structureType === 'pile' && renderPileParams()}
        {params.structureType === 'anchor' && renderAnchorParams()}

        {/* 可视化设置 */}
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
                      checked={params.visualization.showReinforcement}
                      onChange={(checked) => updateParams('visualization.showReinforcement', checked)}
                      size="small"
                    />
                    <Text style={{ marginLeft: '8px', fontSize: '12px' }}>显示钢筋</Text>
                  </div>
                  <div>
                    <Switch
                      checked={params.visualization.showDimensions}
                      onChange={(checked) => updateParams('visualization.showDimensions', checked)}
                      size="small"
                    />
                    <Text style={{ marginLeft: '8px', fontSize: '12px' }}>显示尺寸</Text>
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
                style={{ width: '100%', background: '#fa8c16', borderColor: '#fa8c16' }}
                onClick={() => {
                  // 通知主3D视口生成完整支护结构
                  window.dispatchEvent(new CustomEvent('generate-support-structure', { 
                    detail: params 
                  }));
                }}
              >
                生成支护结构
              </Button>
            </Col>
            <Col span={12}>
              <Button
                icon={<EyeOutlined />}
                style={{ width: '100%' }}
                onClick={() => {
                  // 通知主3D视口聚焦支护结构视图
                  window.dispatchEvent(new CustomEvent('focus-support-view', { 
                    detail: params 
                  }));
                }}
              >
                聚焦视图
              </Button>
            </Col>
          </Row>
        </Card>
      </Space>

      {/* 参数摘要 */}
      <div style={{ 
        background: 'rgba(250, 140, 22, 0.05)', 
        padding: '12px', 
        borderRadius: '6px',
        border: '1px solid rgba(250, 140, 22, 0.2)',
        marginTop: '16px'
      }}>
        <Text style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
          当前方案: {
            params.structureType === 'diaphragm' ? `地连墙 厚${params.diaphragm.thickness}m 深${params.diaphragm.depth}m` :
            params.structureType === 'pile' ? `${params.pile.rows}排桩 φ${params.pile.diameter*1000}@${params.pile.spacing}m 深${params.pile.depth}m` :
            `锚杆 L=${params.anchor.length}m φ${params.anchor.diameter*1000} 倾角${params.anchor.angle}°`
          }
        </Text>
      </div>
    </div>
  );
};

export default SupportStructureSimple;