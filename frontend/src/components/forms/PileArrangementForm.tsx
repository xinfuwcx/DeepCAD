import React, { useEffect, useState } from 'react';
import { Form, InputNumber, Select, Button, Card, Row, Col, Tabs, Space, Typography, Alert, Divider } from 'antd';
import { PileArrangement } from '../../stores/components';
import { Material } from '../../stores/models';
import { useSceneStore } from '../../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import { 
  SaveOutlined, 
  ToolOutlined, 
  ColumnHeightOutlined, 
  ProfileOutlined,
  AppstoreAddOutlined
} from '@ant-design/icons';
import { 
  AnimatedNumberInput, 
  AnimatedSelect, 
  AnimatedButton, 
  FormItemWithTooltip 
} from './FormControls';

const { Option } = Select;
const { TabPane } = Tabs;
const { Text } = Typography;

interface PileArrangementFormProps {
  component: PileArrangement;
}

const PileArrangementForm: React.FC<PileArrangementFormProps> = ({ component }) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('arrangement');
  const [pileConfig, setPileConfig] = useState({
    pile_diameter: component.pile_diameter || 0.8,
    pile_depth: component.pile_depth || 15.0,
    pile_spacing: component.pile_spacing || 2.0,
    material_id: component.material_id || null,
    arrangement_type: component.arrangement_type || 'single_row',
    rows: component.rows || 1,
    row_spacing: component.row_spacing || 2.0
  });
  
  const { scene, updateComponent } = useSceneStore(
    useShallow(state => ({
      scene: state.scene,
      updateComponent: state.updateComponent,
    }))
  );
  
  const materials = scene?.materials || [];

  useEffect(() => {
    form.setFieldsValue(pileConfig);
    setPileConfig({
      pile_diameter: component.pile_diameter || 0.8,
      pile_depth: component.pile_depth || 15.0,
      pile_spacing: component.pile_spacing || 2.0,
      material_id: component.material_id || null,
      arrangement_type: component.arrangement_type || 'single_row',
      rows: component.rows || 1,
      row_spacing: component.row_spacing || 2.0
    });
  }, [component, form]);

  const handleSave = () => {
    const values = form.getFieldsValue();
    updateComponent(component.id, {
      ...component,
      ...pileConfig,
      system_type: 'pile_arrangement'
    });
  };

  const getArrangementTypeOptions = () => [
    { value: 'single_row', label: '单排桩' },
    { value: 'double_row', label: '双排桩' },
    { value: 'triple_row', label: '三排桩' },
    { value: 'grid', label: '格栅式' }
  ];

  const calculateClearSpacing = () => {
    return pileConfig.pile_spacing - pileConfig.pile_diameter;
  };

  const calculateTotalPiles = () => {
    const pilesPerRow = Math.ceil(20 / pileConfig.pile_spacing); // 假设20m长度
    return pilesPerRow * pileConfig.rows;
  };

  // 渲染桩排列示意图
  const renderArrangementDiagram = () => (
    <div style={{ 
      width: '100%', 
      height: '300px', 
      border: '1px solid #d9d9d9', 
      borderRadius: '6px',
      background: '#fafafa',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <svg width="280" height="280" viewBox="0 0 280 280">
        {/* 地面线 */}
        <line x1="20" y1="80" x2="260" y2="80" stroke="#8B4513" strokeWidth="2" />
        <text x="25" y="75" fontSize="12" fill="#666">地面</text>
        
        {/* 桩基 */}
        {Array.from({ length: pileConfig.rows }, (_, rowIndex) => {
          const rowY = 80 + rowIndex * pileConfig.row_spacing * 20;
          return Array.from({ length: 4 }, (_, pileIndex) => {
            const x = 50 + pileIndex * pileConfig.pile_spacing * 30;
            const radius = pileConfig.pile_diameter * 15;
            
            return (
              <g key={`${rowIndex}-${pileIndex}`}>
                <circle 
                  cx={x} 
                  cy={rowY} 
                  r={radius} 
                  fill="#D3D3D3" 
                  stroke="#696969" 
                  strokeWidth="1"
                />
                <line 
                  x1={x} 
                  y1={rowY + radius} 
                  x2={x} 
                  y2={rowY + radius + pileConfig.pile_depth * 5} 
                  stroke="#696969" 
                  strokeWidth="2"
                />
                {rowIndex === 0 && pileIndex === 1 && (
                  <text x={x} y={rowY + radius + pileConfig.pile_depth * 5 + 15} 
                    fontSize="10" fill="#333" textAnchor="middle">
                    Φ{pileConfig.pile_diameter}m
                  </text>
                )}
              </g>
            );
          });
        })}
        
        {/* 间距标注 */}
        {pileConfig.pile_spacing && (
          <g stroke="#FF6B6B" strokeWidth="1" fill="#FF6B6B">
            <line x1="50" y1="250" x2={50 + pileConfig.pile_spacing * 30} y2="250" 
              markerEnd="url(#arrowhead)" markerStart="url(#arrowhead)" />
            <text x={50 + pileConfig.pile_spacing * 15} y="245" fontSize="10" textAnchor="middle">
              {pileConfig.pile_spacing}m
            </text>
          </g>
        )}
        
        {/* 排间距标注 */}
        {pileConfig.rows > 1 && (
          <g stroke="#52c41a" strokeWidth="1" fill="#52c41a">
            <line x1="20" y1="80" x2="20" y2={80 + pileConfig.row_spacing * 20} 
              markerEnd="url(#arrowhead2)" markerStart="url(#arrowhead2)" />
            <text x="15" y={80 + pileConfig.row_spacing * 10} fontSize="10" textAnchor="middle"
              transform={`rotate(-90, 15, ${80 + pileConfig.row_spacing * 10})`}>
              {pileConfig.row_spacing}m
            </text>
          </g>
        )}
        
        {/* 布置类型说明 */}
        <text x="200" y="120" fontSize="12" fill="#333">
          {getArrangementTypeOptions().find(opt => opt.value === pileConfig.arrangement_type)?.label}
        </text>
        <text x="200" y="135" fontSize="10" fill="#666">
          排数: {pileConfig.rows}
        </text>
        
        {/* 箭头标记 */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" 
            refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#FF6B6B" />
          </marker>
          <marker id="arrowhead2" markerWidth="10" markerHeight="7" 
            refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#52c41a" />
          </marker>
        </defs>
      </svg>
    </div>
  );

  return (
    <Form
      form={form}
      layout="vertical"
      className="settings-form"
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* 桩排列配置 */}
        <TabPane 
          tab={<Space><AppstoreAddOutlined />桩排列配置</Space>} 
          key="arrangement"
        >
          <Card title="桩基参数" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <FormItemWithTooltip
                  label="桩径"
                  tooltip="桩的直径"
                >
                  <InputNumber
                    value={pileConfig.pile_diameter}
                    onChange={(value) => setPileConfig({...pileConfig, pile_diameter: value || 0.8})}
                    min={0.3}
                    max={3.0}
                    step={0.1}
                    addonAfter="m"
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
              <Col span={12}>
                <FormItemWithTooltip
                  label="桩长"
                  tooltip="桩的长度"
                >
                  <InputNumber
                    value={pileConfig.pile_depth}
                    onChange={(value) => setPileConfig({...pileConfig, pile_depth: value || 15.0})}
                    min={5.0}
                    max={50.0}
                    step={1.0}
                    addonAfter="m"
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginTop: '16px' }}>
              <Col span={12}>
                <FormItemWithTooltip
                  label="桩间距"
                  tooltip="桩心到桩心的距离"
                >
                  <InputNumber
                    value={pileConfig.pile_spacing}
                    onChange={(value) => setPileConfig({...pileConfig, pile_spacing: value || 2.0})}
                    min={pileConfig.pile_diameter + 0.2}
                    max={10.0}
                    step={0.1}
                    addonAfter="m"
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
              <Col span={12}>
                <FormItemWithTooltip
                  label="布置形式"
                  tooltip="桩的排列方式"
                >
                  <Select
                    value={pileConfig.arrangement_type}
                    onChange={(value) => {
                      setPileConfig({...pileConfig, arrangement_type: value});
                      // 根据布置形式自动设置排数
                      if (value === 'single_row') setPileConfig(prev => ({...prev, rows: 1}));
                      else if (value === 'double_row') setPileConfig(prev => ({...prev, rows: 2}));
                      else if (value === 'triple_row') setPileConfig(prev => ({...prev, rows: 3}));
                    }}
                    options={getArrangementTypeOptions()}
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
            </Row>

            {pileConfig.rows > 1 && (
              <Row gutter={16} style={{ marginTop: '16px' }}>
                <Col span={12}>
                  <FormItemWithTooltip
                    label="排数"
                    tooltip="桩的排数"
                  >
                    <InputNumber
                      value={pileConfig.rows}
                      onChange={(value) => setPileConfig({...pileConfig, rows: value || 1})}
                      min={1}
                      max={5}
                      step={1}
                      addonAfter="排"
                      style={{ width: '100%' }}
                    />
                  </FormItemWithTooltip>
                </Col>
                <Col span={12}>
                  <FormItemWithTooltip
                    label="排间距"
                    tooltip="排与排之间的距离"
                  >
                    <InputNumber
                      value={pileConfig.row_spacing}
                      onChange={(value) => setPileConfig({...pileConfig, row_spacing: value || 2.0})}
                      min={1.0}
                      max={10.0}
                      step={0.5}
                      addonAfter="m"
                      style={{ width: '100%' }}
                    />
                  </FormItemWithTooltip>
                </Col>
              </Row>
            )}

            <FormItemWithTooltip
              label="材料"
              tooltip="桩身材料"
              style={{ marginTop: '16px' }}
            >
              <Select
                value={pileConfig.material_id}
                onChange={(value) => setPileConfig({...pileConfig, material_id: value})}
                allowClear
                style={{ width: '100%' }}
              >
                {materials.map((mat: Material) => (
                  <Option key={mat.id} value={mat.id}>
                    {mat.name}
                  </Option>
                ))}
              </Select>
            </FormItemWithTooltip>
          </Card>

          <Alert
            message="桩基统计"
            description={
              <Space direction="vertical" size={4}>
                <div>桩间净距: <strong>{calculateClearSpacing().toFixed(2)} m</strong></div>
                <div>长径比: <strong>{(pileConfig.pile_depth / pileConfig.pile_diameter).toFixed(1)}</strong></div>
                <div>预计桩数: <strong>{calculateTotalPiles()}</strong> 根</div>
              </Space>
            }
            type="info"
            style={{ marginTop: '16px' }}
          />
        </TabPane>

        {/* 布置图 */}
        <TabPane 
          tab={<Space><ProfileOutlined />布置图</Space>} 
          key="diagram"
        >
          <Card title="桩基布置图" size="small">
            {renderArrangementDiagram()}
          </Card>
        </TabPane>
      </Tabs>
      
      <div className="form-actions" style={{ marginTop: '24px', textAlign: 'center' }}>
        <AnimatedButton 
          type="primary" 
          onClick={handleSave}
          icon={<SaveOutlined />}
          className="hover-scale"
        >
          保存桩基配置
        </AnimatedButton>
      </div>
    </Form>
  );
};

export default PileArrangementForm; 