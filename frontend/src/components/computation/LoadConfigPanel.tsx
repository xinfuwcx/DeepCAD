/**
 * 荷载配置面板
 * 支持各种荷载类型的创建、编辑和管理
 */

import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Select, InputNumber, Input, Space, Tag, 
  Divider, Row, Col, Switch, Alert, Tooltip, Popconfirm, Tabs, Timeline,
  Typography, ColorPicker, DatePicker, Slider, Collapse
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, 
  CopyOutlined, SettingOutlined, ThunderboltOutlined,
  CompressOutlined, FallOutlined,
  CarOutlined, BuildOutlined, CloudOutlined,
  ExperimentOutlined, ThunderboltOutlined as SeismicOutlined, DownloadOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Option } = Select;

// 荷载类型定义
export enum LoadType {
  FORCE = 'force',
  DISTRIBUTED = 'distributed',
  PRESSURE = 'pressure',
  SELF_WEIGHT = 'self_weight',
  EARTH_PRESSURE = 'earth_pressure',
  WATER_PRESSURE = 'water_pressure',
  THERMAL = 'thermal',
  SEISMIC = 'seismic',
  TRAFFIC = 'traffic',
  CONSTRUCTION = 'construction'
}

export enum LoadDirection {
  X = 'x',
  Y = 'y',
  Z = 'z',
  NORMAL = 'normal',
  TANGENTIAL = 'tangential'
}

export enum LoadApplication {
  NODE = 'node',
  ELEMENT = 'element',
  SURFACE = 'surface',
  VOLUME = 'volume',
  EDGE = 'edge'
}

// 荷载定义接口
export interface LoadDefinition {
  id: string;
  name: string;
  description?: string;
  load_type: LoadType;
  geometry: {
    application_type: LoadApplication;
    target_entities: number[];
    coordinates?: number[][];
  };
  magnitude: {
    value: number;
    unit: string;
    direction: LoadDirection;
    distribution_pattern?: string;
  };
  timing: {
    load_case: string;
    start_time: number;
    end_time?: number;
    time_function?: string;
    amplification_factor: number;
  };
  is_active: boolean;
  color?: string;
  created_at: string;
}

export interface LoadCase {
  id: string;
  name: string;
  description?: string;
  loads: string[];
  combination_factors: { [key: string]: number };
  is_default: boolean;
  created_at: string;
}

interface LoadConfigPanelProps {
  projectId: string;
  onLoadChange?: (loads: LoadDefinition[]) => void;
}

const LoadConfigPanel: React.FC<LoadConfigPanelProps> = ({
  projectId,
  onLoadChange
}) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('loads');
  
  // 状态管理
  const [loads, setLoads] = useState<LoadDefinition[]>([]);
  const [loadCases, setLoadCases] = useState<LoadCase[]>([]);
  const [editingLoad, setEditingLoad] = useState<LoadDefinition | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 荷载类型配置
  const getLoadTypeConfig = () => [
    { 
      value: LoadType.FORCE, 
      label: '集中力', 
      icon: <ThunderboltOutlined />, 
      color: '#FF6B6B',
      units: ['N', 'kN', 'MN']
    },
    { 
      value: LoadType.DISTRIBUTED, 
      label: '分布荷载', 
      icon: <CompressOutlined />, 
      color: '#4ECDC4',
      units: ['N/m', 'kN/m', 'N/m²', 'kN/m²']
    },
    { 
      value: LoadType.PRESSURE, 
      label: '压力', 
      icon: <CompressOutlined />, 
      color: '#45B7D1',
      units: ['Pa', 'kPa', 'MPa']
    },
    { 
      value: LoadType.SELF_WEIGHT, 
      label: '自重', 
      icon: <FallOutlined />, 
      color: '#F7B731',
      units: ['N/m³', 'kN/m³']
    },
    { 
      value: LoadType.EARTH_PRESSURE, 
      label: '土压力', 
      icon: <BuildOutlined />, 
      color: '#A55A42',
      units: ['kN/m²', 'kPa']
    },
    { 
      value: LoadType.WATER_PRESSURE, 
      label: '水压力', 
      icon: <CloudOutlined />, 
      color: '#26C6DA',
      units: ['kN/m²', 'kPa']
    },
    { 
      value: LoadType.THERMAL, 
      label: '温度荷载', 
      icon: <ExperimentOutlined />, 
      color: '#FF5722',
      units: ['°C', 'K']
    },
    { 
      value: LoadType.SEISMIC, 
      label: '地震荷载', 
      icon: <SeismicOutlined />, 
      color: '#E91E63',
      units: ['m/s²', 'g']
    },
    { 
      value: LoadType.TRAFFIC, 
      label: '交通荷载', 
      icon: <CarOutlined />, 
      color: '#9C27B0',
      units: ['kN/m²', 'kPa']
    },
    { 
      value: LoadType.CONSTRUCTION, 
      label: '施工荷载', 
      icon: <BuildOutlined />, 
      color: '#607D8B',
      units: ['kN/m²', 'kPa']
    }
  ];

  // 获取荷载类型信息
  const getLoadTypeInfo = (type: LoadType) => {
    return getLoadTypeConfig().find(config => config.value === type);
  };

  // 添加新荷载
  const handleAddLoad = () => {
    const newLoad: LoadDefinition = {
      id: `load_${Date.now()}`,
      name: `荷载 ${loads.length + 1}`,
      description: '',
      load_type: LoadType.FORCE,
      geometry: {
        application_type: LoadApplication.NODE,
        target_entities: [],
        coordinates: []
      },
      magnitude: {
        value: 100,
        unit: 'kN',
        direction: LoadDirection.Z,
        distribution_pattern: 'uniform'
      },
      timing: {
        load_case: 'default',
        start_time: 0,
        time_function: 'constant',
        amplification_factor: 1.0
      },
      is_active: true,
      color: '#FF6B6B',
      created_at: new Date().toISOString()
    };
    
    setEditingLoad(newLoad);
    setModalVisible(true);
  };

  // 编辑荷载
  const handleEditLoad = (load: LoadDefinition) => {
    setEditingLoad({...load});
    form.setFieldsValue(load);
    setModalVisible(true);
  };

  // 保存荷载
  const handleSaveLoad = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingLoad) {
        const updatedLoad = { ...editingLoad, ...values };
        
        const updatedLoads = editingLoad.id.startsWith('load_')
          ? [...loads, updatedLoad]  // 新荷载
          : loads.map(load => load.id === editingLoad.id ? updatedLoad : load);  // 更新现有荷载
        
        setLoads(updatedLoads);
        onLoadChange?.(updatedLoads);
        
        setModalVisible(false);
        setEditingLoad(null);
        form.resetFields();
      }
    } catch (error) {
      console.error('保存荷载失败:', error);
    }
  };

  // 删除荷载
  const handleDeleteLoad = (loadId: string) => {
    const updatedLoads = loads.filter(load => load.id !== loadId);
    setLoads(updatedLoads);
    onLoadChange?.(updatedLoads);
  };

  // 切换荷载激活状态
  const handleToggleLoad = (loadId: string, active: boolean) => {
    const updatedLoads = loads.map(load => 
      load.id === loadId ? { ...load, is_active: active } : load
    );
    setLoads(updatedLoads);
    onLoadChange?.(updatedLoads);
  };

  // 复制荷载
  const handleCopyLoad = (load: LoadDefinition) => {
    const copiedLoad = {
      ...load,
      id: `load_${Date.now()}`,
      name: `${load.name}_副本`,
      created_at: new Date().toISOString()
    };
    
    const updatedLoads = [...loads, copiedLoad];
    setLoads(updatedLoads);
    onLoadChange?.(updatedLoads);
  };

  // 渲染荷载表格
  const renderLoadTable = () => {
    const columns = [
      {
        title: '状态',
        dataIndex: 'is_active',
        width: 60,
        render: (active: boolean, record: LoadDefinition) => (
          <Switch
            size="small"
            checked={active}
            onChange={(checked) => handleToggleLoad(record.id, checked)}
          />
        )
      },
      {
        title: '名称',
        dataIndex: 'name',
        width: 120,
        render: (name: string, record: LoadDefinition) => (
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
        dataIndex: 'load_type',
        width: 100,
        render: (type: LoadType) => {
          const typeInfo = getLoadTypeInfo(type);
          return (
            <Tag color={typeInfo?.color} icon={typeInfo?.icon}>
              {typeInfo?.label}
            </Tag>
          );
        }
      },
      {
        title: '量值',
        width: 100,
        render: (_, record: LoadDefinition) => (
          <Space>
            <Text>{record.magnitude.value}</Text>
            <Text type="secondary">{record.magnitude.unit}</Text>
          </Space>
        )
      },
      {
        title: '方向',
        dataIndex: ['magnitude', 'direction'],
        width: 60,
        render: (direction: LoadDirection) => (
          <Tag>{direction.toUpperCase()}</Tag>
        )
      },
      {
        title: '施加位置',
        dataIndex: ['geometry', 'application_type'],
        width: 80,
        render: (type: LoadApplication) => (
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
        render: (_, record: LoadDefinition) => (
          <Space size="small">
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditLoad(record)}
              />
            </Tooltip>
            <Tooltip title="复制">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopyLoad(record)}
              />
            </Tooltip>
            <Popconfirm
              title="确定删除此荷载？"
              onConfirm={() => handleDeleteLoad(record.id)}
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
        dataSource={loads}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        locale={{ emptyText: '暂无荷载配置' }}
      />
    );
  };

  // 渲染荷载模板
  const renderLoadTemplates = () => {
    const templates = {
      "深基坑": [
        { name: "土压力", type: LoadType.EARTH_PRESSURE, value: 50, unit: "kN/m²" },
        { name: "水压力", type: LoadType.WATER_PRESSURE, value: 20, unit: "kN/m²" },
        { name: "交通荷载", type: LoadType.TRAFFIC, value: 15, unit: "kN/m²" },
        { name: "施工荷载", type: LoadType.CONSTRUCTION, value: 10, unit: "kN/m²" }
      ],
      "桩基": [
        { name: "轴向压力", type: LoadType.FORCE, value: 2000, unit: "kN" },
        { name: "侧向力", type: LoadType.FORCE, value: 200, unit: "kN" },
        { name: "负摩阻力", type: LoadType.DISTRIBUTED, value: 20, unit: "kN/m" }
      ]
    };

    return (
      <Row gutter={[16, 16]}>
        {Object.entries(templates).map(([category, categoryLoads]) => (
          <Col span={12} key={category}>
            <Card title={category} size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                {categoryLoads.map((template, index) => (
                  <Card
                    key={index}
                    size="small"
                    hoverable
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      // 创建基于模板的荷载
                      const templateLoad: LoadDefinition = {
                        id: `load_${Date.now()}`,
                        name: template.name,
                        description: `基于${category}模板创建`,
                        load_type: template.type,
                        geometry: {
                          application_type: LoadApplication.SURFACE,
                          target_entities: [],
                          coordinates: []
                        },
                        magnitude: {
                          value: template.value,
                          unit: template.unit,
                          direction: LoadDirection.Z,
                          distribution_pattern: 'uniform'
                        },
                        timing: {
                          load_case: 'default',
                          start_time: 0,
                          time_function: 'constant',
                          amplification_factor: 1.0
                        },
                        is_active: true,
                        color: getLoadTypeInfo(template.type)?.color || '#FF6B6B',
                        created_at: new Date().toISOString()
                      };
                      
                      setEditingLoad(templateLoad);
                      setModalVisible(true);
                    }}
                  >
                    <Space>
                      {getLoadTypeInfo(template.type)?.icon}
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
      title={editingLoad?.id.startsWith('load_') ? "添加荷载" : "编辑荷载"}
      open={modalVisible}
      onOk={handleSaveLoad}
      onCancel={() => {
        setModalVisible(false);
        setEditingLoad(null);
        form.resetFields();
      }}
      width={800}
      okText="保存"
      cancelText="取消"
    >
      {editingLoad && (
        <Form
          form={form}
          layout="vertical"
          initialValues={editingLoad}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="荷载名称"
                rules={[{ required: true, message: '请输入荷载名称' }]}
              >
                <Input placeholder="输入荷载名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="load_type" label="荷载类型">
                <Select
                  onChange={(value) => {
                    const typeInfo = getLoadTypeInfo(value);
                    setEditingLoad({
                      ...editingLoad,
                      load_type: value,
                      color: typeInfo?.color || '#FF6B6B'
                    });
                  }}
                >
                  {getLoadTypeConfig().map(config => (
                    <Option key={config.value} value={config.value}>
                      <Space>
                        {config.icon}
                        {config.label}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name={['magnitude', 'value']} label="荷载值">
                <InputNumber
                  min={0}
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="输入荷载值"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['magnitude', 'unit']} label="单位">
                <Select>
                  {getLoadTypeInfo(editingLoad.load_type)?.units.map(unit => (
                    <Option key={unit} value={unit}>{unit}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['magnitude', 'direction']} label="方向">
                <Select>
                  <Option value={LoadDirection.X}>X方向</Option>
                  <Option value={LoadDirection.Y}>Y方向</Option>
                  <Option value={LoadDirection.Z}>Z方向</Option>
                  <Option value={LoadDirection.NORMAL}>法向</Option>
                  <Option value={LoadDirection.TANGENTIAL}>切向</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name={['geometry', 'application_type']} label="施加方式">
                <Select>
                  <Option value={LoadApplication.NODE}>节点</Option>
                  <Option value={LoadApplication.ELEMENT}>单元</Option>
                  <Option value={LoadApplication.SURFACE}>面</Option>
                  <Option value={LoadApplication.VOLUME}>体</Option>
                  <Option value={LoadApplication.EDGE}>边</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['timing', 'load_case']} label="荷载工况">
                <Input placeholder="荷载工况名称" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="输入荷载描述（可选）" />
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
          tab={<Space size={4}><ThunderboltOutlined style={{ fontSize: '12px' }} />荷载配置</Space>}
          key="loads"
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card
              title={
                <Space>
                  <ThunderboltOutlined />
                  荷载列表
                  <Tag color="blue">{loads.filter(l => l.is_active).length}/{loads.length}</Tag>
                </Space>
              }
              size="small"
              extra={
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleAddLoad}
                >
                  添加荷载
                </Button>
              }
            >
              {renderLoadTable()}
            </Card>
          </Space>
        </TabPane>

        <TabPane
          tab={<Space size={4}><SettingOutlined style={{ fontSize: '12px' }} />荷载模板</Space>}
          key="templates"
        >
          <Card title="常用荷载模板" size="small">
            <Alert
              message="快速创建常用荷载"
              description="选择模板可以快速创建相应类型的荷载配置"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            {renderLoadTemplates()}
          </Card>
        </TabPane>
      </Tabs>

      {renderEditModal()}
    </div>
  );
};

export default LoadConfigPanel;