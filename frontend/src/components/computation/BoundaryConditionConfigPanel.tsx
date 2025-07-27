/**
 * 边界条件配置面板
 * 支持渗流、热传导、流体等多物理场边界条件的创建、编辑和管理
 */

import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Select, InputNumber, Input, Space, Tag, 
  Divider, Row, Col, Switch, Alert, Tooltip, Popconfirm, Tabs, Timeline,
  Typography, ColorPicker, DatePicker, Slider, Collapse, Radio
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, 
  CopyOutlined, SettingOutlined, BorderOutlined,
  ExperimentOutlined, CloudOutlined, FireOutlined,
  ThunderboltOutlined, DropboxOutlined, HeatMapOutlined,
  NodeExpandOutlined, ControlOutlined, RadiusSettingOutlined,
  DownloadOutlined, ApiOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Option } = Select;

// 边界条件类型定义
export enum BoundaryConditionType {
  FLUID_PRESSURE = 'fluid_pressure',
  FLUID_FLOW = 'fluid_flow',
  SEEPAGE_HEAD = 'seepage_head',
  SEEPAGE_FLOW = 'seepage_flow',
  THERMAL_TEMPERATURE = 'thermal_temperature',
  THERMAL_FLUX = 'thermal_flux',
  CONVECTION = 'convection',
  RADIATION = 'radiation',
  MASS_TRANSFER = 'mass_transfer',
  CHEMICAL_CONCENTRATION = 'chemical_concentration'
}

export enum BoundaryApplication {
  SURFACE = 'surface',
  EDGE = 'edge',
  NODE = 'node',
  REGION = 'region',
  VOLUME = 'volume'
}

export enum FlowDirection {
  INFLOW = 'inflow',
  OUTFLOW = 'outflow',
  NORMAL = 'normal',
  TANGENTIAL = 'tangential'
}

// 边界条件定义接口
export interface BoundaryConditionDefinition {
  id: string;
  name: string;
  description?: string;
  bc_type: BoundaryConditionType;
  geometry: {
    application_type: BoundaryApplication;
    target_entities: number[];
    coordinates?: number[][];
    normal_vector?: number[];
    area?: number;
  };
  boundary_value: {
    magnitude: number;
    unit: string;
    direction?: FlowDirection;
    distribution_pattern: string;
    time_variation?: string;
    // 特殊参数
    temperature?: number;
    pressure?: number;
    flow_rate?: number;
    heat_flux?: number;
    convection_coefficient?: number;
    concentration?: number;
  };
  timing: {
    boundary_case: string;
    start_time: number;
    end_time?: number;
    time_function: string;
    cycle_period?: number;
  };
  is_active: boolean;
  color?: string;
  created_at: string;
}

export interface BoundaryCase {
  id: string;
  name: string;
  description?: string;
  boundary_conditions: string[];
  combination_factors: { [key: string]: number };
  analysis_type: string;
  is_default: boolean;
  created_at: string;
}

interface BoundaryConditionConfigPanelProps {
  projectId: string;
  onBoundaryConditionChange?: (boundaryConditions: BoundaryConditionDefinition[]) => void;
}

const BoundaryConditionConfigPanel: React.FC<BoundaryConditionConfigPanelProps> = ({
  projectId,
  onBoundaryConditionChange
}) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('boundary-conditions');
  
  // 状态管理
  const [boundaryConditions, setBoundaryConditions] = useState<BoundaryConditionDefinition[]>([]);
  const [boundaryCases, setBoundaryCases] = useState<BoundaryCase[]>([]);
  const [editingBC, setEditingBC] = useState<BoundaryConditionDefinition | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 边界条件类型配置
  const getBoundaryConditionTypeConfig = () => [
    { 
      value: BoundaryConditionType.FLUID_PRESSURE, 
      label: '流体压力', 
      icon: <ExperimentOutlined />, 
      color: '#1890FF',
      units: ['Pa', 'kPa', 'MPa', 'bar'],
      category: '流体'
    },
    { 
      value: BoundaryConditionType.FLUID_FLOW, 
      label: '流体流量', 
      icon: <DropboxOutlined />, 
      color: '#13C2C2',
      units: ['m³/s', 'L/s', 'm/s'],
      category: '流体'
    },
    { 
      value: BoundaryConditionType.SEEPAGE_HEAD, 
      label: '渗流水头', 
      icon: <CloudOutlined />, 
      color: '#52C41A',
      units: ['m', 'cm', 'ft'],
      category: '渗流'
    },
    { 
      value: BoundaryConditionType.SEEPAGE_FLOW, 
      label: '渗流流量', 
      icon: <NodeExpandOutlined />, 
      color: '#73D13D',
      units: ['m³/s/m²', 'L/s/m²', 'mm/day'],
      category: '渗流'
    },
    { 
      value: BoundaryConditionType.THERMAL_TEMPERATURE, 
      label: '温度边界', 
      icon: <FireOutlined />, 
      color: '#FF4D4F',
      units: ['°C', 'K', '°F'],
      category: '热传导'
    },
    { 
      value: BoundaryConditionType.THERMAL_FLUX, 
      label: '热流密度', 
      icon: <ThunderboltOutlined />, 
      color: '#FF7A45',
      units: ['W/m²', 'kW/m²', 'cal/s/m²'],
      category: '热传导'
    },
    { 
      value: BoundaryConditionType.CONVECTION, 
      label: '对流边界', 
      icon: <HeatMapOutlined />, 
      color: '#FAAD14',
      units: ['W/m²·K', 'W/m²·°C'],
      category: '热传导'
    },
    { 
      value: BoundaryConditionType.RADIATION, 
      label: '辐射边界', 
      icon: <RadiusSettingOutlined />, 
      color: '#FA8C16',
      units: ['W/m²', 'W/m²·K⁴'],
      category: '热传导'
    },
    { 
      value: BoundaryConditionType.MASS_TRANSFER, 
      label: '质量传递', 
      icon: <ControlOutlined />, 
      color: '#722ED1',
      units: ['kg/s/m²', 'g/s/m²'],
      category: '传质'
    },
    { 
      value: BoundaryConditionType.CHEMICAL_CONCENTRATION, 
      label: '化学浓度', 
      icon: <ApiOutlined />, 
      color: '#EB2F96',
      units: ['mol/L', 'mg/L', 'ppm'],
      category: '传质'
    }
  ];

  // 获取边界条件类型信息
  const getBCTypeInfo = (type: BoundaryConditionType) => {
    return getBoundaryConditionTypeConfig().find(config => config.value === type);
  };

  // 添加新边界条件
  const handleAddBoundaryCondition = () => {
    const newBC: BoundaryConditionDefinition = {
      id: `bc_${Date.now()}`,
      name: `边界条件 ${boundaryConditions.length + 1}`,
      description: '',
      bc_type: BoundaryConditionType.SEEPAGE_HEAD,
      geometry: {
        application_type: BoundaryApplication.SURFACE,
        target_entities: [],
        coordinates: []
      },
      boundary_value: {
        magnitude: 10.0,
        unit: 'm',
        distribution_pattern: 'uniform',
        time_variation: 'constant'
      },
      timing: {
        boundary_case: 'default',
        start_time: 0,
        time_function: 'constant'
      },
      is_active: true,
      color: '#52C41A',
      created_at: new Date().toISOString()
    };
    
    setEditingBC(newBC);
    setModalVisible(true);
  };

  // 编辑边界条件
  const handleEditBC = (bc: BoundaryConditionDefinition) => {
    setEditingBC({...bc});
    form.setFieldsValue(bc);
    setModalVisible(true);
  };

  // 保存边界条件
  const handleSaveBC = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingBC) {
        const updatedBC = { ...editingBC, ...values };
        
        const updatedBCs = editingBC.id.startsWith('bc_')
          ? [...boundaryConditions, updatedBC]  // 新边界条件
          : boundaryConditions.map(bc => bc.id === editingBC.id ? updatedBC : bc);  // 更新现有边界条件
        
        setBoundaryConditions(updatedBCs);
        onBoundaryConditionChange?.(updatedBCs);
        
        setModalVisible(false);
        setEditingBC(null);
        form.resetFields();
      }
    } catch (error) {
      console.error('保存边界条件失败:', error);
    }
  };

  // 删除边界条件
  const handleDeleteBC = (bcId: string) => {
    const updatedBCs = boundaryConditions.filter(bc => bc.id !== bcId);
    setBoundaryConditions(updatedBCs);
    onBoundaryConditionChange?.(updatedBCs);
  };

  // 切换边界条件激活状态
  const handleToggleBC = (bcId: string, active: boolean) => {
    const updatedBCs = boundaryConditions.map(bc => 
      bc.id === bcId ? { ...bc, is_active: active } : bc
    );
    setBoundaryConditions(updatedBCs);
    onBoundaryConditionChange?.(updatedBCs);
  };

  // 复制边界条件
  const handleCopyBC = (bc: BoundaryConditionDefinition) => {
    const copiedBC = {
      ...bc,
      id: `bc_${Date.now()}`,
      name: `${bc.name}_副本`,
      created_at: new Date().toISOString()
    };
    
    const updatedBCs = [...boundaryConditions, copiedBC];
    setBoundaryConditions(updatedBCs);
    onBoundaryConditionChange?.(updatedBCs);
  };

  // 渲染边界条件表格
  const renderBCTable = () => {
    const columns = [
      {
        title: '状态',
        dataIndex: 'is_active',
        width: 60,
        render: (active: boolean, record: BoundaryConditionDefinition) => (
          <Switch
            size="small"
            checked={active}
            onChange={(checked) => handleToggleBC(record.id, checked)}
          />
        )
      },
      {
        title: '名称',
        dataIndex: 'name',
        width: 120,
        render: (name: string, record: BoundaryConditionDefinition) => (
          <Space>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                backgroundColor: record.color,
                border: '1px solid rgba(0,0,0,0.1)'
              }}
            />
            <Text strong={record.is_active}>{name}</Text>
          </Space>
        )
      },
      {
        title: '类型',
        dataIndex: 'bc_type',
        width: 100,
        render: (type: BoundaryConditionType) => {
          const typeInfo = getBCTypeInfo(type);
          return (
            <Tag color={typeInfo?.color} icon={typeInfo?.icon}>
              {typeInfo?.label}
            </Tag>
          );
        }
      },
      {
        title: '数值',
        width: 100,
        render: (_, record: BoundaryConditionDefinition) => (
          <Space>
            <Text>{record.boundary_value.magnitude}</Text>
            <Text type="secondary">{record.boundary_value.unit}</Text>
          </Space>
        )
      },
      {
        title: '施加位置',
        dataIndex: ['geometry', 'application_type'],
        width: 80,
        render: (type: BoundaryApplication) => (
          <Tag>{type}</Tag>
        )
      },
      {
        title: '目标实体',
        dataIndex: ['geometry', 'target_entities'],
        width: 80,
        render: (entities: number[]) => (
          <Text>{entities.length} 个</Text>
        )
      },
      {
        title: '操作',
        width: 120,
        render: (_, record: BoundaryConditionDefinition) => (
          <Space size="small">
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditBC(record)}
              />
            </Tooltip>
            <Tooltip title="复制">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopyBC(record)}
              />
            </Tooltip>
            <Popconfirm
              title="确定删除此边界条件？"
              onConfirm={() => handleDeleteBC(record.id)}
            >
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
              />
            </Popconfirm>
          </Space>
        )
      }
    ];

    return (
      <Table
        dataSource={boundaryConditions}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        locale={{ emptyText: '暂无边界条件配置' }}
      />
    );
  };

  // 渲染边界条件模板
  const renderBCTemplates = () => {
    const templates = {
      "渗流分析": [
        { name: "定水头边界", type: BoundaryConditionType.SEEPAGE_HEAD, value: 10.0, unit: "m" },
        { name: "渗流流量边界", type: BoundaryConditionType.SEEPAGE_FLOW, value: 0.001, unit: "m³/s/m²" },
        { name: "不透水边界", type: BoundaryConditionType.SEEPAGE_FLOW, value: 0.0, unit: "m³/s/m²" }
      ],
      "热传导": [
        { name: "定温边界", type: BoundaryConditionType.THERMAL_TEMPERATURE, value: 20.0, unit: "°C" },
        { name: "定热流边界", type: BoundaryConditionType.THERMAL_FLUX, value: 100.0, unit: "W/m²" },
        { name: "对流边界", type: BoundaryConditionType.CONVECTION, value: 25.0, unit: "W/m²·K" }
      ],
      "流体分析": [
        { name: "压力入口", type: BoundaryConditionType.FLUID_PRESSURE, value: 101325.0, unit: "Pa" },
        { name: "流量入口", type: BoundaryConditionType.FLUID_FLOW, value: 0.1, unit: "m³/s" },
        { name: "压力出口", type: BoundaryConditionType.FLUID_PRESSURE, value: 0.0, unit: "Pa" }
      ]
    };

    return (
      <Row gutter={[16, 16]}>
        {Object.entries(templates).map(([category, categoryBCs]) => (
          <Col span={8} key={category}>
            <Card title={category} size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                {categoryBCs.map((template, index) => (
                  <Card
                    key={index}
                    size="small"
                    hoverable
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      // 创建基于模板的边界条件
                      const templateBC: BoundaryConditionDefinition = {
                        id: `bc_${Date.now()}`,
                        name: template.name,
                        description: `基于${category}模板创建`,
                        bc_type: template.type,
                        geometry: {
                          application_type: BoundaryApplication.SURFACE,
                          target_entities: [],
                          coordinates: []
                        },
                        boundary_value: {
                          magnitude: template.value,
                          unit: template.unit,
                          distribution_pattern: 'uniform',
                          time_variation: 'constant'
                        },
                        timing: {
                          boundary_case: 'default',
                          start_time: 0,
                          time_function: 'constant'
                        },
                        is_active: true,
                        color: getBCTypeInfo(template.type)?.color || '#2196F3',
                        created_at: new Date().toISOString()
                      };
                      
                      setEditingBC(templateBC);
                      setModalVisible(true);
                    }}
                  >
                    <Space>
                      {getBCTypeInfo(template.type)?.icon}
                      <div>
                        <Text strong>{template.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {template.value} {template.unit}
                        </Text>
                      </div>
                    </Space>
                  </Card>
                ))}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  // 渲染编辑模态框
  const renderEditModal = () => (
    <Modal
      title={editingBC?.id.startsWith('bc_') ? "添加边界条件" : "编辑边界条件"}
      open={modalVisible}
      onOk={handleSaveBC}
      onCancel={() => {
        setModalVisible(false);
        setEditingBC(null);
        form.resetFields();
      }}
      width={800}
      okText="保存"
      cancelText="取消"
    >
      {editingBC && (
        <Form
          form={form}
          layout="vertical"
          initialValues={editingBC}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="边界条件名称"
                rules={[{ required: true, message: '请输入边界条件名称' }]}
              >
                <Input placeholder="输入边界条件名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bc_type" label="边界条件类型">
                <Select
                  onChange={(value) => {
                    const typeInfo = getBCTypeInfo(value);
                    setEditingBC({
                      ...editingBC,
                      bc_type: value,
                      color: typeInfo?.color || '#2196F3'
                    });
                  }}
                >
                  {getBoundaryConditionTypeConfig().map(config => (
                    <Option key={config.value} value={config.value}>
                      <Space>
                        {config.icon}
                        {config.label}
                        <Tag color="blue">{config.category}</Tag>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name={['boundary_value', 'magnitude']} label="数值">
                <InputNumber
                  min={0}
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="输入数值"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['boundary_value', 'unit']} label="单位">
                <Select>
                  {getBCTypeInfo(editingBC.bc_type)?.units.map(unit => (
                    <Option key={unit} value={unit}>{unit}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['boundary_value', 'distribution_pattern']} label="分布模式">
                <Select>
                  <Option value="uniform">均布</Option>
                  <Option value="linear">线性</Option>
                  <Option value="parabolic">抛物线</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name={['geometry', 'application_type']} label="施加方式">
                <Select>
                  <Option value={BoundaryApplication.SURFACE}>面</Option>
                  <Option value={BoundaryApplication.EDGE}>边</Option>
                  <Option value={BoundaryApplication.NODE}>节点</Option>
                  <Option value={BoundaryApplication.REGION}>区域</Option>
                  <Option value={BoundaryApplication.VOLUME}>体</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['timing', 'boundary_case']} label="边界工况">
                <Input placeholder="边界工况名称" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="输入边界条件描述（可选）" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );

  return (
    <div style={{ fontSize: '12px' }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        tabBarStyle={{ marginBottom: '8px' }}
      >
        <TabPane
          tab={<Space size={4}><BorderOutlined style={{ fontSize: '12px' }} />边界条件</Space>}
          key="boundary-conditions"
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card
              title={
                <Space>
                  <BorderOutlined />
                  边界条件列表
                  <Tag color="blue">{boundaryConditions.filter(bc => bc.is_active).length}/{boundaryConditions.length}</Tag>
                </Space>
              }
              size="small"
              extra={
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleAddBoundaryCondition}
                >
                  添加边界条件
                </Button>
              }
            >
              {renderBCTable()}
            </Card>
          </Space>
        </TabPane>

        <TabPane
          tab={<Space size={4}><SettingOutlined style={{ fontSize: '12px' }} />边界模板</Space>}
          key="templates"
        >
          <Card title="常用边界条件模板" size="small">
            <Alert
              message="快速创建边界条件"
              description="选择模板可以快速创建相应类型的边界条件配置"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            {renderBCTemplates()}
          </Card>
        </TabPane>
      </Tabs>

      {renderEditModal()}
    </div>
  );
};

export default BoundaryConditionConfigPanel;