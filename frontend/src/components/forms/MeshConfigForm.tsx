/**
 * 网格配置表单组件
 * 支持fragment和无限元配置
 */

import React, { useState, useEffect } from 'react';
import {
  Form, Card, Row, Col, Divider, Space, InputNumber, Switch, Alert, 
  Table, Button, Popconfirm, Select, Tabs, Collapse, Tag, Typography,
  Tooltip, Slider
} from 'antd';
import {
  SaveOutlined, ToolOutlined, PlusOutlined, DeleteOutlined, 
  ExperimentOutlined, SettingOutlined, AppstoreAddOutlined,
  BorderOutlined, GlobalOutlined, AimOutlined
} from '@ant-design/icons';
import { useSceneStore } from '../../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import { 
  AnimatedNumberInput, 
  AnimatedSelect, 
  AnimatedButton, 
  FormItemWithTooltip 
} from './FormControls';

const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Text } = Typography;

// 枚举定义
enum FragmentType {
  SOIL_DOMAIN = 'soil_domain',
  STRUCTURE = 'structure',
  EXCAVATION = 'excavation',
  INFINITE_BOUNDARY = 'infinite_boundary'
}

enum ElementType {
  TRIANGULAR = 'triangular',
  QUADRILATERAL = 'quadrilateral',
  TETRAHEDRAL = 'tetrahedral',
  HEXAHEDRAL = 'hexahedral',
  INFINITE_TRIANGLE = 'infinite_triangle',
  INFINITE_QUAD = 'infinite_quad'
}

enum MeshQuality {
  COARSE = 'coarse',
  MEDIUM = 'medium',
  FINE = 'fine',
  VERY_FINE = 'very_fine'
}

// 接口定义
interface FragmentGeometry {
  type: string;
  coordinates: number[][];
  holes?: number[][][];
  depth_range?: {
    from: number;
    to: number;
  };
}

interface InfiniteElementConfig {
  enabled: boolean;
  direction: string;
  layers: number;
  distance_factor: number;
  damping_coefficient: number;
}

interface FragmentMeshProperties {
  element_size: number;
  element_type: ElementType;
  mesh_density: MeshQuality;
  structured_mesh: boolean;
  infinite_elements?: InfiniteElementConfig;
}

interface DomainFragment {
  id: string;
  name: string;
  fragment_type: FragmentType;
  geometry: FragmentGeometry;
  mesh_properties: FragmentMeshProperties;
  material_assignment?: string;
  boundary_conditions: string[];
}

interface GlobalMeshSettings {
  element_type: ElementType;
  default_element_size: number;
  mesh_quality: MeshQuality;
  max_element_size: number;
  min_element_size: number;
  mesh_smoothing: boolean;
}

interface RefinementZone {
  id: string;
  name: string;
  zone_type: string;
  geometry: FragmentGeometry;
  refinement_factor: number;
  transition_layers: number;
}

interface InfiniteLayer {
  layer_number: number;
  element_size_factor: number;
  damping_coefficient: number;
}

interface MeshConfigFormProps {
  component?: any;
}

const MeshConfigForm: React.FC<MeshConfigFormProps> = ({ component }) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('global');
  
  // 状态管理
  const [globalSettings, setGlobalSettings] = useState<GlobalMeshSettings>({
    element_type: ElementType.TRIANGULAR,
    default_element_size: 2.0,
    mesh_quality: MeshQuality.MEDIUM,
    max_element_size: 10.0,
    min_element_size: 0.1,
    mesh_smoothing: true
  });
  
  const [domainFragments, setDomainFragments] = useState<DomainFragment[]>([
    {
      id: 'soil_main',
      name: '主土体域',
      fragment_type: FragmentType.SOIL_DOMAIN,
      geometry: {
        type: 'rectangle',
        coordinates: [[0, 0], [100, 0], [100, 50], [0, 50]]
      },
      mesh_properties: {
        element_size: 2.0,
        element_type: ElementType.TRIANGULAR,
        mesh_density: MeshQuality.MEDIUM,
        structured_mesh: false
      },
      boundary_conditions: []
    }
  ]);
  
  const [refinementZones, setRefinementZones] = useState<RefinementZone[]>([]);
  const [infiniteElementsEnabled, setInfiniteElementsEnabled] = useState(false);
  const [infiniteLayers, setInfiniteLayers] = useState<InfiniteLayer[]>([
    { layer_number: 1, element_size_factor: 1.5, damping_coefficient: 0.05 },
    { layer_number: 2, element_size_factor: 2.0, damping_coefficient: 0.10 },
    { layer_number: 3, element_size_factor: 3.0, damping_coefficient: 0.15 }
  ]);

  const { scene, updateComponent } = useSceneStore(
    useShallow(state => ({
      scene: state.scene,
      updateComponent: state.updateComponent,
    }))
  );

  // 获取选项数据
  const getFragmentTypeOptions = () => [
    { value: FragmentType.SOIL_DOMAIN, label: '土体域', icon: <GlobalOutlined /> },
    { value: FragmentType.STRUCTURE, label: '结构体', icon: <BorderOutlined /> },
    { value: FragmentType.EXCAVATION, label: '开挖区', icon: <AimOutlined /> },
    { value: FragmentType.INFINITE_BOUNDARY, label: '无限边界', icon: <AppstoreAddOutlined /> }
  ];

  const getElementTypeOptions = () => [
    { value: ElementType.TRIANGULAR, label: '三角形单元' },
    { value: ElementType.QUADRILATERAL, label: '四边形单元' },
    { value: ElementType.TETRAHEDRAL, label: '四面体单元' },
    { value: ElementType.HEXAHEDRAL, label: '六面体单元' },
    { value: ElementType.INFINITE_TRIANGLE, label: '无限三角形单元' },
    { value: ElementType.INFINITE_QUAD, label: '无限四边形单元' }
  ];

  const getMeshQualityOptions = () => [
    { value: MeshQuality.COARSE, label: '粗糙', color: 'red' },
    { value: MeshQuality.MEDIUM, label: '中等', color: 'orange' },
    { value: MeshQuality.FINE, label: '精细', color: 'green' },
    { value: MeshQuality.VERY_FINE, label: '极精细', color: 'blue' }
  ];

  // Fragment 操作
  const addFragment = () => {
    const newFragment: DomainFragment = {
      id: `fragment_${Date.now()}`,
      name: `片段 ${domainFragments.length + 1}`,
      fragment_type: FragmentType.SOIL_DOMAIN,
      geometry: {
        type: 'rectangle',
        coordinates: [[0, 0], [10, 0], [10, 10], [0, 10]]
      },
      mesh_properties: {
        element_size: globalSettings.default_element_size,
        element_type: globalSettings.element_type,
        mesh_density: globalSettings.mesh_quality,
        structured_mesh: false
      },
      boundary_conditions: []
    };
    setDomainFragments([...domainFragments, newFragment]);
  };

  const updateFragment = (id: string, updates: Partial<DomainFragment>) => {
    setDomainFragments(domainFragments.map(fragment => 
      fragment.id === id ? { ...fragment, ...updates } : fragment
    ));
  };

  const removeFragment = (id: string) => {
    setDomainFragments(domainFragments.filter(fragment => fragment.id !== id));
  };

  // 无限元操作
  const addInfiniteLayer = () => {
    const newLayer: InfiniteLayer = {
      layer_number: infiniteLayers.length + 1,
      element_size_factor: 2.0,
      damping_coefficient: 0.05
    };
    setInfiniteLayers([...infiniteLayers, newLayer]);
  };

  const updateInfiniteLayer = (layerNumber: number, updates: Partial<InfiniteLayer>) => {
    setInfiniteLayers(infiniteLayers.map(layer => 
      layer.layer_number === layerNumber ? { ...layer, ...updates } : layer
    ));
  };

  const removeInfiniteLayer = (layerNumber: number) => {
    setInfiniteLayers(infiniteLayers.filter(layer => layer.layer_number !== layerNumber));
  };

  // 保存配置
  const handleSave = () => {
    const values = form.getFieldsValue();
    const meshConfig = {
      id: component?.id || 'mesh_config',
      global_settings: globalSettings,
      domain_fragments: domainFragments,
      refinement_zones: refinementZones,
      infinite_elements: {
        enabled: infiniteElementsEnabled,
        infinite_layers: infiniteLayers
      }
    };

    if (updateComponent) {
      updateComponent(component?.id || 'mesh_config', {
        ...component,
        mesh_config: meshConfig
      });
    }
  };

  // 渲染全局设置
  const renderGlobalSettings = () => (
    <Card title={<Space><SettingOutlined />全局网格设置</Space>} size="small">
      <Row gutter={16}>
        <Col span={8}>
          <FormItemWithTooltip
            label="默认单元类型"
            tooltip="选择默认的网格单元类型"
          >
            <Select
              value={globalSettings.element_type}
              onChange={(value) => setGlobalSettings({...globalSettings, element_type: value})}
              options={getElementTypeOptions()}
            />
          </FormItemWithTooltip>
        </Col>
        <Col span={8}>
          <FormItemWithTooltip
            label="默认单元尺寸"
            tooltip="默认单元尺寸，单位为米"
          >
            <InputNumber
              value={globalSettings.default_element_size}
              onChange={(value) => setGlobalSettings({...globalSettings, default_element_size: value || 2.0})}
              min={0.1}
              max={50}
              step={0.1}
              addonAfter="m"
              style={{ width: '100%' }}
            />
          </FormItemWithTooltip>
        </Col>
        <Col span={8}>
          <FormItemWithTooltip
            label="网格质量"
            tooltip="整体网格质量等级"
          >
            <Select
              value={globalSettings.mesh_quality}
              onChange={(value) => setGlobalSettings({...globalSettings, mesh_quality: value})}
            >
              {getMeshQualityOptions().map(option => (
                <Select.Option key={option.value} value={option.value}>
                  <Tag color={option.color}>{option.label}</Tag>
                </Select.Option>
              ))}
            </Select>
          </FormItemWithTooltip>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: '16px' }}>
        <Col span={8}>
          <FormItemWithTooltip
            label="最大单元尺寸"
            tooltip="允许的最大单元尺寸"
          >
            <InputNumber
              value={globalSettings.max_element_size}
              onChange={(value) => setGlobalSettings({...globalSettings, max_element_size: value || 10.0})}
              min={globalSettings.default_element_size}
              max={100}
              step={1}
              addonAfter="m"
              style={{ width: '100%' }}
            />
          </FormItemWithTooltip>
        </Col>
        <Col span={8}>
          <FormItemWithTooltip
            label="最小单元尺寸"
            tooltip="允许的最小单元尺寸"
          >
            <InputNumber
              value={globalSettings.min_element_size}
              onChange={(value) => setGlobalSettings({...globalSettings, min_element_size: value || 0.1})}
              min={0.01}
              max={globalSettings.default_element_size}
              step={0.01}
              addonAfter="m"
              style={{ width: '100%' }}
            />
          </FormItemWithTooltip>
        </Col>
        <Col span={8}>
          <FormItemWithTooltip
            label="网格平滑"
            tooltip="启用网格平滑处理"
          >
            <Switch
              checked={globalSettings.mesh_smoothing}
              onChange={(checked) => setGlobalSettings({...globalSettings, mesh_smoothing: checked})}
              checkedChildren="开启"
              unCheckedChildren="关闭"
            />
          </FormItemWithTooltip>
        </Col>
      </Row>
    </Card>
  );

  // 渲染域片段配置
  const renderDomainFragments = () => (
    <Card 
      title={<Space><AppstoreAddOutlined />域片段配置</Space>} 
      size="small"
      extra={
        <Button 
          type="dashed" 
          icon={<PlusOutlined />} 
          onClick={addFragment}
          size="small"
        >
          添加片段
        </Button>
      }
    >
      <Alert
        message="域片段说明"
        description="域片段用于将计算域划分为不同的区域，每个区域可以有独立的网格属性和材料赋值。无限边界片段用于模拟无限远处的土体边界。"
        type="info"
        showIcon
        style={{ marginBottom: '16px' }}
      />

      <Table
        dataSource={domainFragments}
        rowKey="id"
        size="small"
        pagination={false}
        columns={[
          {
            title: '片段名称',
            dataIndex: 'name',
            width: 120,
            render: (value, record) => (
              <InputNumber
                value={value}
                onChange={(val) => updateFragment(record.id, { name: val as string })}
                style={{ width: '100%' }}
                bordered={false}
              />
            )
          },
          {
            title: '片段类型',
            dataIndex: 'fragment_type',
            width: 130,
            render: (value, record) => (
              <Select
                value={value}
                onChange={(val) => updateFragment(record.id, { fragment_type: val })}
                size="small"
                style={{ width: '100%' }}
              >
                {getFragmentTypeOptions().map(option => (
                  <Select.Option key={option.value} value={option.value}>
                    <Space>
                      {option.icon}
                      {option.label}
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            )
          },
          {
            title: '单元尺寸(m)',
            dataIndex: ['mesh_properties', 'element_size'],
            width: 120,
            render: (value, record) => (
              <InputNumber
                value={value}
                onChange={(val) => updateFragment(record.id, {
                  mesh_properties: { ...record.mesh_properties, element_size: val || 1.0 }
                })}
                min={0.1}
                step={0.1}
                size="small"
                style={{ width: '100%' }}
              />
            )
          },
          {
            title: '单元类型',
            dataIndex: ['mesh_properties', 'element_type'],
            width: 140,
            render: (value, record) => (
              <Select
                value={value}
                onChange={(val) => updateFragment(record.id, {
                  mesh_properties: { ...record.mesh_properties, element_type: val }
                })}
                size="small"
                style={{ width: '100%' }}
              >
                {getElementTypeOptions().map(option => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
            )
          },
          {
            title: '网格密度',
            dataIndex: ['mesh_properties', 'mesh_density'],
            width: 100,
            render: (value, record) => (
              <Select
                value={value}
                onChange={(val) => updateFragment(record.id, {
                  mesh_properties: { ...record.mesh_properties, mesh_density: val }
                })}
                size="small"
                style={{ width: '100%' }}
              >
                {getMeshQualityOptions().map(option => (
                  <Select.Option key={option.value} value={option.value}>
                    <Tag color={option.color}>{option.label}</Tag>
                  </Select.Option>
                ))}
              </Select>
            )
          },
          {
            title: '无限元',
            width: 60,
            render: (_, record) => (
              <Switch
                size="small"
                checked={record.fragment_type === FragmentType.INFINITE_BOUNDARY}
                disabled={record.fragment_type !== FragmentType.INFINITE_BOUNDARY}
                checkedChildren="是"
                unCheckedChildren="否"
              />
            )
          },
          {
            title: '操作',
            width: 60,
            render: (_, record) => (
              <Popconfirm
                title="确定删除此片段？"
                onConfirm={() => removeFragment(record.id)}
              >
                <Button 
                  type="text" 
                  size="small" 
                  icon={<DeleteOutlined />} 
                  danger
                />
              </Popconfirm>
            )
          }
        ]}
      />
    </Card>
  );

  // 渲染无限元配置
  const renderInfiniteElements = () => (
    <Card 
      title={<Space><GlobalOutlined />无限元配置</Space>} 
      size="small"
    >
      <FormItemWithTooltip
        label="启用无限元"
        tooltip="启用无限元可以模拟无限远处的土体边界效应"
      >
        <Switch
          checked={infiniteElementsEnabled}
          onChange={setInfiniteElementsEnabled}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      </FormItemWithTooltip>

      {infiniteElementsEnabled && (
        <>
          <Divider />
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <Text strong>无限元层配置</Text>
              <Button 
                type="dashed" 
                icon={<PlusOutlined />} 
                onClick={addInfiniteLayer}
                size="small"
              >
                添加层
              </Button>
            </div>

            <Table
              dataSource={infiniteLayers}
              rowKey="layer_number"
              size="small"
              pagination={false}
              columns={[
                {
                  title: '层号',
                  dataIndex: 'layer_number',
                  width: 60,
                  render: (value) => <Tag color="blue">{value}</Tag>
                },
                {
                  title: '尺寸系数',
                  dataIndex: 'element_size_factor',
                  width: 120,
                  render: (value, record) => (
                    <InputNumber
                      value={value}
                      onChange={(val) => updateInfiniteLayer(record.layer_number, { element_size_factor: val || 1.0 })}
                      min={1.0}
                      max={10.0}
                      step={0.1}
                      size="small"
                      style={{ width: '100%' }}
                    />
                  )
                },
                {
                  title: '阻尼系数',
                  dataIndex: 'damping_coefficient',
                  width: 120,
                  render: (value, record) => (
                    <InputNumber
                      value={value}
                      onChange={(val) => updateInfiniteLayer(record.layer_number, { damping_coefficient: val || 0.05 })}
                      min={0.01}
                      max={1.0}
                      step={0.01}
                      size="small"
                      style={{ width: '100%' }}
                    />
                  )
                },
                {
                  title: '操作',
                  width: 60,
                  render: (_, record) => (
                    <Popconfirm
                      title="确定删除此层？"
                      onConfirm={() => removeInfiniteLayer(record.layer_number)}
                    >
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<DeleteOutlined />} 
                        danger
                      />
                    </Popconfirm>
                  )
                }
              ]}
            />
          </div>

          <Alert
            message="无限元配置说明"
            description={
              <div>
                <p><strong>尺寸系数</strong>: 相对于内层的单元尺寸放大倍数</p>
                <p><strong>阻尼系数</strong>: 用于吸收边界反射的阻尼参数</p>
                <p><strong>推荐配置</strong>: 3-5层，尺寸系数1.5-3.0，阻尼系数0.05-0.15</p>
              </div>
            }
            type="info"
          />
        </>
      )}
    </Card>
  );

  return (
    <Form
      form={form}
      layout="vertical"
      className="settings-form"
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane 
          tab={<Space><SettingOutlined />全局设置</Space>} 
          key="global"
        >
          {renderGlobalSettings()}
        </TabPane>
        
        <TabPane 
          tab={<Space><AppstoreAddOutlined />域片段</Space>} 
          key="fragments"
        >
          {renderDomainFragments()}
        </TabPane>
        
        <TabPane 
          tab={<Space><GlobalOutlined />无限元</Space>} 
          key="infinite"
        >
          {renderInfiniteElements()}
        </TabPane>
      </Tabs>

      <div className="form-actions" style={{ marginTop: '24px', textAlign: 'center' }}>
        <Space>
          <AnimatedButton 
            type="primary" 
            onClick={handleSave}
            icon={<SaveOutlined />}
            className="hover-scale"
          >
            保存网格配置
          </AnimatedButton>
          <AnimatedButton>
            预览网格
          </AnimatedButton>
          <AnimatedButton>
            验证配置
          </AnimatedButton>
        </Space>
      </div>
    </Form>
  );
};

export default MeshConfigForm;