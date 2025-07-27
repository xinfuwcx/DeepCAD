import React, { useEffect, useState } from 'react';
import { Form, InputNumber, Select, Button, Card, Row, Col, Tabs, Space, Typography, Alert, Divider } from 'antd';
import { DiaphragmWall } from '../../stores/components';
import { Material } from '../../stores/models';
import { useSceneStore } from '../../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import { MeshGenerationRequest } from '../../services/meshingService';
import { 
  SaveOutlined, 
  ToolOutlined, 
  // BorderVerticalOutlined, // 移除不存在的图标
  ColumnWidthOutlined, // 替换为ColumnWidthOutlined
  ProfileOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { 
  AnimatedButton, 
  FormItemWithTooltip 
} from './FormControls';
import AdvancedViewport from '../viewport/AdvancedViewport'; // 引入新的视口组件

const { Option } = Select;
const { TabPane } = Tabs;
const { Text } = Typography;

interface DiaphragmWallFormProps {
  component: DiaphragmWall;
  systemConfig?: {
    systemType: 'pile_anchor' | 'diaphragm_anchor';
    diaphragmWall?: {
      isConnected: boolean;
    };
  };
}

const DiaphragmWallForm: React.FC<DiaphragmWallFormProps> = ({ component, systemConfig }) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('wall');
  const wallConfig = Form.useWatch([], form);

  const { scene, updateComponent } = useSceneStore(
    useShallow(state => ({
      scene: state.scene,
      updateComponent: state.updateComponent,
    }))
  );
  
  const materials = scene?.materials || [];

  const initialValues = {
    thickness: component.thickness || 0.8,
    depth: component.depth || 20.0,
    material_id: component.material_id || null,
    construction_method: component.construction_method || 'slurry_wall',
    panel_length: component.panel_length || 6.0,
    joint_type: component.joint_type || 'interlocking'
  };

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [component, form]);

  // Fragment网格生成API调用
  const callFragmentMeshAPI = async (request: MeshGenerationRequest) => {
    const response = await fetch('/api/meshing/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  };

  const handleSave = async () => {
    const values = form.getFieldsValue();
    
    // 更新组件配置
    updateComponent(component.id, {
      ...component,
      ...values,
    });

    // 如果启用了Fragment配置，生成地连墙的Fragment
    if (systemConfig?.fragmentConfig?.enable_fragment) {
      try {
        // 生成地连墙的Fragment配置
        const wallFragment = {
          id: `diaphragm_wall_${component.id}`,
          name: '地下连续墙',
          fragment_type: 'structure' as const,
          geometry: {
            type: 'auto_wall_layout' as const,
            geometry: {
              excavation_boundary: systemConfig.fragmentConfig.excavation_geometry?.boundary_points || [],
              wall_thickness: values.thickness,
              wall_depth: values.depth,
              panel_length: values.panel_length,
              joint_type: values.joint_type,
              construction_method: values.construction_method,
              is_continuous: true // 地连墙为连续结构
            }
          },
          mesh_properties: {
            element_size: 0.2,
            element_type: 'tetrahedral',
            mesh_density: 'very_fine' // 地连墙需要精细网格
          },
          enabled: true,
          priority: 2
        };

        const meshRequest: MeshGenerationRequest = {
          boundingBoxMin: [-25, -25, -Math.abs(values.depth || 20) - 5],
          boundingBoxMax: [25, 25, 5],
          meshSize: 0.5,
          clientId: `diaphragm_wall_${component.id}`,
          enable_fragment: true,
          domain_fragments: [
            // 基坑开挖Fragment
            ...(systemConfig.fragmentConfig.domain_fragments || []),
            // 地连墙Fragment
            wallFragment
          ],
          global_mesh_settings: {
            element_type: 'tetrahedral',
            default_element_size: 0.5,
            mesh_quality: 'high',
            mesh_smoothing: true
          }
        };

        console.log('发送地连墙Fragment网格生成请求:', meshRequest);
        
        // 生成网格
        const meshResult = await callFragmentMeshAPI(meshRequest);
        console.log('地连墙Fragment网格生成成功:', meshResult);
        
      } catch (error) {
        console.error('地连墙Fragment网格生成失败:', error);
      }
    }
  };

  const getConstructionMethodOptions = () => [
    { value: 'slurry_wall', label: '泥浆护壁地连墙' },
    { value: 'grab_wall', label: '抓斗成槽地连墙' },
    { value: 'milling_wall', label: '铣削成槽地连墙' },
    { value: 'smw', label: 'SMW工法桩' }
  ];

  const getJointTypeOptions = () => [
    { value: 'interlocking', label: '咬合接头' },
    { value: 'welded', label: '焊接接头' },
    { value: 'rubber_seal', label: '橡胶止水接头' },
    { value: 'concrete_seal', label: '混凝土止水接头' }
  ];

  // 渲染地连墙截面图
  const renderWallSection = () => (
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
        <line x1="20" y1="80" x2="300" y2="80" stroke="#8B4513" strokeWidth="2" />
        <text x="25" y="75" fontSize="12" fill="#666">地面 (0.0m)</text>
        
        {/* 地连墙主体 */}
        <rect 
          x={160 - (wallConfig?.thickness * 25)} 
          y={80} 
          width={wallConfig?.thickness * 50} 
          height={wallConfig?.depth * 8} 
          fill="#D3D3D3" 
          stroke="#696969" 
          strokeWidth="2"
        />
        
        {/* 分幅接头 */}
        {[1, 2, 3].map(i => {
          const y = 80 + (i * wallConfig?.panel_length * 8);
          if (y < 80 + wallConfig?.depth * 8) {
            return (
              <g key={i}>
                <line 
                  x1={160 - (wallConfig?.thickness * 25)} 
                  y1={y} 
                  x2={160 + (wallConfig?.thickness * 25)} 
                  y2={y} 
                  stroke="#FF6B6B" 
                  strokeWidth="1" 
                  strokeDasharray="3,3"
                />
                <text x={170 + (wallConfig?.thickness * 25)} y={y + 4} fontSize="8" fill="#FF6B6B">
                  第{i}幅
                </text>
              </g>
            );
          }
          return null;
        })}
        
        {/* 标注 */}
        <g stroke="#333" strokeWidth="1" fill="#333">
          {/* 厚度标注 */}
          <line 
            x1={160 - (wallConfig?.thickness * 25)} 
            y1={60} 
            x2={160 + (wallConfig?.thickness * 25)} 
            y2={60} 
            markerEnd="url(#arrowhead)" 
            markerStart="url(#arrowhead)"
          />
          <text x="160" y="55" fontSize="10" textAnchor="middle">{wallConfig?.thickness}m</text>
          
          {/* 深度标注 */}
          <line 
            x1={140 - (wallConfig?.thickness * 25)} 
            y1={80} 
            x2={140 - (wallConfig?.thickness * 25)} 
            y2={80 + wallConfig?.depth * 8} 
            markerEnd="url(#arrowhead)" 
            markerStart="url(#arrowhead)"
          />
          <text 
            x={135 - (wallConfig?.thickness * 25)} 
            y={80 + (wallConfig?.depth * 4)} 
            fontSize="10" 
            textAnchor="middle"
            transform={`rotate(-90, ${135 - (wallConfig?.thickness * 25)}, ${80 + (wallConfig?.depth * 4)})`}
          >
            {wallConfig?.depth}m
          </text>
        </g>
        
        {/* 工法说明 */}
        <text x="200" y="120" fontSize="11" fill="#333">
          {getConstructionMethodOptions().find(opt => opt.value === wallConfig?.construction_method)?.label}
        </text>
        <text x="200" y="135" fontSize="10" fill="#666">
          分幅长度: {wallConfig?.panel_length}m
        </text>
        <text x="200" y="150" fontSize="10" fill="#666">
          接头类型: {getJointTypeOptions().find(opt => opt.value === wallConfig?.joint_type)?.label}
        </text>
        
        {/* 箭头标记 */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" 
            refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
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
      initialValues={initialValues}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* 地连墙配置 */}
        <TabPane 
          tab={<Space><ColumnWidthOutlined />地连墙配置</Space>} 
          key="wall"
        >
          {/* 支护体系说明 */}
          <Alert
            message="地连墙-锚杆支护体系"
            description="地连墙为连续结构，具有良好的整体性，锚杆可直接连接墙体传递荷载，无需设置腰梁"
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: '16px' }}
          />

          <Card title="地连墙参数" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <FormItemWithTooltip
                  name="thickness"
                  label="墙体厚度"
                  tooltip="地连墙的厚度，一般为0.6-1.2m"
                >
                  <InputNumber
                    min={0.3}
                    max={2.0}
                    step={0.1}
                    addonAfter="m"
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
              <Col span={12}>
                <FormItemWithTooltip
                  name="depth"
                  label="入土深度"
                  tooltip="地连墙的入土深度"
                >
                  <InputNumber
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
                  name="construction_method"
                  label="施工工法"
                  tooltip="地连墙的施工方法"
                >
                  <Select
                    options={getConstructionMethodOptions()}
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
              <Col span={12}>
                <FormItemWithTooltip
                  name="panel_length"
                  label="分幅长度"
                  tooltip="每个施工分幅的长度"
                >
                  <InputNumber
                    min={3.0}
                    max={12.0}
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
                  name="joint_type"
                  label="接头类型"
                  tooltip="分幅间的连接方式"
                >
                  <Select
                    options={getJointTypeOptions()}
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
              <Col span={12}>
                <FormItemWithTooltip
                  name="material_id"
                  label="材料"
                  tooltip="地连墙的混凝土材料"
                >
                  <Select
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
              </Col>
            </Row>
          </Card>

          {wallConfig && <Alert
            message="地连墙信息"
            description={
              <Space direction="vertical" size={4}>
                <div>墙体尺寸: <strong>{wallConfig.thickness}×{wallConfig.depth} m</strong></div>
                <div>分幅数量: <strong>{Math.ceil(wallConfig.depth / wallConfig.panel_length)}</strong> 幅</div>
                <div>长厚比: <strong>{(wallConfig.depth / wallConfig.thickness).toFixed(1)}</strong></div>
              </Space>
            }
            type="info"
            style={{ marginTop: '16px' }}
          />}
        </TabPane>

        {/* 截面图 */}
        <TabPane 
          tab={<Space><ProfileOutlined />截面图</Space>} 
          key="section"
        >
          <Card title="地连墙截面图" size="small">
            {wallConfig && renderWallSection()}
          </Card>
        </TabPane>

        {/* 新增：高级渲染测试 */}
        <TabPane 
          tab={<Space><ToolOutlined />高级渲染测试</Space>} 
          key="advanced-render"
        >
          <Card title="高级渲染视口" size="small">
            <AdvancedViewport />
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
          保存地连墙配置
        </AnimatedButton>
      </div>
    </Form>
  );
};

export default DiaphragmWallForm; 