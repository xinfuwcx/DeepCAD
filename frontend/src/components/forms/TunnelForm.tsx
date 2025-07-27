import React, { useEffect, useState } from 'react';
import { Form, InputNumber, Select, Button, Card, Row, Col, Tabs, Space, Typography, Alert, Divider } from 'antd';
import { Tunnel } from '../../stores/components';
import { useSceneStore } from '../../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import { FormItemWithTooltip, AnimatedButton } from './FormControls';
import { SaveOutlined, ToolOutlined, ProfileOutlined, BorderOutlined } from '@ant-design/icons';

const { Option } = Select;
const { TabPane } = Tabs;
const { Text } = Typography;

interface TunnelFormProps {
  component: Tunnel;
}

const TunnelForm: React.FC<TunnelFormProps> = ({ component }) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('tunnel');
  const [tunnelConfig, setTunnelConfig] = useState({
    profile_type: component.profile?.type || 'circular',
    radius: component.profile?.radius || 5.0,
    length: component.length || 100.0,
    lining_thickness: component.lining_thickness || 0.3,
    support_type: component.support_type || 'shield',
    overburden: component.overburden || 15.0
  });
  
  const { updateComponent } = useSceneStore(
    useShallow(state => ({
      updateComponent: state.updateComponent,
    }))
  );

  useEffect(() => {
    form.setFieldsValue(tunnelConfig);
    setTunnelConfig({
      profile_type: component.profile?.type || 'circular',
      radius: component.profile?.radius || 5.0,
      length: component.length || 100.0,
      lining_thickness: component.lining_thickness || 0.3,
      support_type: component.support_type || 'shield',
      overburden: component.overburden || 15.0
    });
  }, [component, form]);

  const handleSave = () => {
    const values = form.getFieldsValue();
    updateComponent(component.id, {
      ...component,
      ...tunnelConfig,
      profile: {
        type: tunnelConfig.profile_type,
        radius: tunnelConfig.radius,
      }
    });
  };

  const getSupportTypeOptions = () => [
    { value: 'shield', label: '盾构法' },
    { value: 'natm', label: 'NATM新奥法' },
    { value: 'cut_cover', label: '明挖法' },
    { value: 'pipe_jacking', label: '顶管法' }
  ];

  const calculateCrossSection = () => {
    const area = Math.PI * Math.pow(tunnelConfig.radius, 2);
    const perimeter = 2 * Math.PI * tunnelConfig.radius;
    const liningArea = Math.PI * (Math.pow(tunnelConfig.radius, 2) - Math.pow(tunnelConfig.radius - tunnelConfig.lining_thickness, 2));
    return { area, perimeter, liningArea };
  };

  // 渲染隧道截面图
  const renderTunnelSection = () => {
    const { area, perimeter, liningArea } = calculateCrossSection();
    const scale = 40; // 缩放系数
    const centerX = 160;
    const centerY = 160;
    const outerRadius = tunnelConfig.radius * scale;
    const innerRadius = (tunnelConfig.radius - tunnelConfig.lining_thickness) * scale;
    
    return (
      <div style={{ 
        width: '100%', 
        height: '350px', 
        border: '1px solid #d9d9d9', 
        borderRadius: '6px',
        background: '#fafafa',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <svg width="320" height="320" viewBox="0 0 320 320">
          {/* 地面线 */}
          <line x1="20" y1={centerY - tunnelConfig.overburden * 8} x2="300" y2={centerY - tunnelConfig.overburden * 8} 
            stroke="#8B4513" strokeWidth="2" />
          <text x="25" y={centerY - tunnelConfig.overburden * 8 - 5} fontSize="12" fill="#666">
            地面
          </text>
          
          {/* 土体 */}
          <rect x="20" y={centerY - tunnelConfig.overburden * 8} width="280" height={tunnelConfig.overburden * 8 + outerRadius + 20}
            fill="#DEB887" fillOpacity="0.3" />
          
          {/* 衆砂层 */}
          <circle cx={centerX} cy={centerY} r={outerRadius + 5} fill="#F4A460" fillOpacity="0.2" />
          
          {/* 衷砂层 */}
          <circle cx={centerX} cy={centerY} r={outerRadius} fill="#D2B48C" stroke="#B8860B" strokeWidth="1" />
          
          {/* 隧道内空 */}
          <circle cx={centerX} cy={centerY} r={innerRadius} fill="#F0F8FF" stroke="#4682B4" strokeWidth="2" />
          
          {/* 排水管 */}
          <ellipse cx={centerX} cy={centerY + innerRadius - 10} rx="20" ry="5" fill="#696969" />
          
          {/* 尺寸标注 */}
          <g stroke="#FF6B6B" strokeWidth="1" fill="#FF6B6B">
            {/* 半径标注 */}
            <line x1={centerX} y1={centerY} x2={centerX + outerRadius} y2={centerY} 
              markerEnd="url(#arrowhead)" />
            <text x={centerX + outerRadius/2} y={centerY - 5} fontSize="10" textAnchor="middle">
              R={tunnelConfig.radius}m
            </text>
            
            {/* 衵砂厚度 */}
            <line x1={centerX + innerRadius} y1={centerY} x2={centerX + outerRadius} y2={centerY} 
              stroke="#52c41a" strokeWidth="2" />
            <text x={centerX + (innerRadius + outerRadius)/2} y={centerY + 15} fontSize="9" fill="#52c41a" textAnchor="middle">
              t={tunnelConfig.lining_thickness}m
            </text>
          </g>
          
          {/* 覆土深度 */}
          <g stroke="#1890ff" strokeWidth="1" fill="#1890ff">
            <line x1={centerX - outerRadius - 20} y1={centerY - tunnelConfig.overburden * 8} 
              x2={centerX - outerRadius - 20} y2={centerY - outerRadius} 
              markerEnd="url(#arrowhead3)" markerStart="url(#arrowhead3)" />
            <text x={centerX - outerRadius - 25} y={centerY - tunnelConfig.overburden * 4} fontSize="10" 
              textAnchor="middle" transform={`rotate(-90, ${centerX - outerRadius - 25}, ${centerY - tunnelConfig.overburden * 4})`}>
              覆土{tunnelConfig.overburden}m
            </text>
          </g>
          
          {/* 施工方法说明 */}
          <text x="220" y="50" fontSize="12" fill="#333">
            {getSupportTypeOptions().find(opt => opt.value === tunnelConfig.support_type)?.label}
          </text>
          <text x="220" y="65" fontSize="10" fill="#666">
            内径: {(tunnelConfig.radius - tunnelConfig.lining_thickness) * 2}m
          </text>
          <text x="220" y="80" fontSize="10" fill="#666">
            截面积: {area.toFixed(2)} m²
          </text>
          
          {/* 箭头标记 */}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" 
              refX="0" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#FF6B6B" />
            </marker>
            <marker id="arrowhead3" markerWidth="10" markerHeight="7" 
              refX="0" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#1890ff" />
            </marker>
          </defs>
        </svg>
      </div>
    );
  };

  return (
    <Form
      form={form}
      layout="vertical"
      className="settings-form"
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* 隧道配置 */}
        <TabPane 
          tab={<Space><BorderOutlined />隧道配置</Space>} 
          key="tunnel"
        >
          <Card title="隧道参数" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <FormItemWithTooltip
                  label="截面形式"
                  tooltip="隧道的截面形状"
                >
                  <Select
                    value={tunnelConfig.profile_type}
                    onChange={(value) => setTunnelConfig({...tunnelConfig, profile_type: value})}
                    style={{ width: '100%' }}
                  >
                    <Option value="circular">圆形</Option>
                    <Option value="horseshoe">马蹄形</Option>
                    <Option value="rectangular">矩形</Option>
                  </Select>
                </FormItemWithTooltip>
              </Col>
              <Col span={12}>
                <FormItemWithTooltip
                  label="隧道半径"
                  tooltip="隧道的半径，单位为米"
                >
                  <InputNumber
                    value={tunnelConfig.radius}
                    onChange={(value) => setTunnelConfig({...tunnelConfig, radius: value || 5.0})}
                    min={2.0}
                    max={15.0}
                    step={0.5}
                    addonAfter="m"
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginTop: '16px' }}>
              <Col span={12}>
                <FormItemWithTooltip
                  label="衅砰厚度"
                  tooltip="隧道衵砰的厚度"
                >
                  <InputNumber
                    value={tunnelConfig.lining_thickness}
                    onChange={(value) => setTunnelConfig({...tunnelConfig, lining_thickness: value || 0.3})}
                    min={0.2}
                    max={1.0}
                    step={0.05}
                    addonAfter="m"
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
              <Col span={12}>
                <FormItemWithTooltip
                  label="覆土深度"
                  tooltip="隧道顶部覆土厚度"
                >
                  <InputNumber
                    value={tunnelConfig.overburden}
                    onChange={(value) => setTunnelConfig({...tunnelConfig, overburden: value || 15.0})}
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
                  label="施工方法"
                  tooltip="隧道的施工工法"
                >
                  <Select
                    value={tunnelConfig.support_type}
                    onChange={(value) => setTunnelConfig({...tunnelConfig, support_type: value})}
                    options={getSupportTypeOptions()}
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
              <Col span={12}>
                <FormItemWithTooltip
                  label="隧道长度"
                  tooltip="隧道的总长度"
                >
                  <InputNumber
                    value={tunnelConfig.length}
                    onChange={(value) => setTunnelConfig({...tunnelConfig, length: value || 100.0})}
                    min={10.0}
                    max={5000.0}
                    step={10.0}
                    addonAfter="m"
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
            </Row>
          </Card>

          <Alert
            message="隧道信息"
            description={
              <Space direction="vertical" size={4}>
                <div>外径: <strong>{tunnelConfig.radius * 2} m</strong> | 内径: <strong>{(tunnelConfig.radius - tunnelConfig.lining_thickness) * 2} m</strong></div>
                <div>截面积: <strong>{calculateCrossSection().area.toFixed(2)} m²</strong> | 衵砰体积: <strong>{(calculateCrossSection().liningArea * tunnelConfig.length).toFixed(1)} m³</strong></div>
                <div>覆距比: <strong>{(tunnelConfig.overburden / (tunnelConfig.radius * 2)).toFixed(1)}</strong></div>
              </Space>
            }
            type="info"
            style={{ marginTop: '16px' }}
          />
        </TabPane>

        {/* 截面图 */}
        <TabPane 
          tab={<Space><ProfileOutlined />截面图</Space>} 
          key="section"
        >
          <Card title="隧道截面图" size="small">
            {renderTunnelSection()}
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
          保存隧道配置
        </AnimatedButton>
      </div>
    </Form>
  );
};

export default TunnelForm; 