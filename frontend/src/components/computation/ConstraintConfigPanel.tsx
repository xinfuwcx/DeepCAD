/**
 * 约束配置面板
 * 支持各种约束类型的创建、编辑和管理
 */

import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Select, InputNumber, Input, Space, Tag, 
  Divider, Row, Col, Switch, Alert, Tooltip, Popconfirm, Tabs, Timeline,
  Typography, ColorPicker, DatePicker, Slider, Collapse, Checkbox
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, 
  CopyOutlined, SettingOutlined, LockOutlined,
  BorderOutlined, ExperimentOutlined, CloseOutlined,
  ExclamationCircleOutlined, PhoneOutlined,
  MenuOutlined, AimOutlined, InteractionOutlined,
  FullscreenOutlined, DownloadOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Option } = Select;

// 约束类型定义
export enum ConstraintType {
  FIXED = 'fixed',
  PINNED = 'pinned',
  ROLLER = 'roller',
  DISPLACEMENT = 'displacement',
  ROTATION = 'rotation',
  ELASTIC_SUPPORT = 'elastic_support',
  SYMMETRY = 'symmetry',
  CONTACT = 'contact',
  INTERFACE = 'interface',
  INFINITE_BOUNDARY = 'infinite_boundary'
}

export enum ConstraintDOF {
  UX = 'ux',
  UY = 'uy',
  UZ = 'uz',
  RX = 'rx',
  RY = 'ry',
  RZ = 'rz',
  ALL = 'all'
}

export enum ConstraintApplication {
  NODE = 'node',
  ELEMENT = 'element',
  SURFACE = 'surface',
  EDGE = 'edge',
  REGION = 'region'
}

// 约束定义接口
export interface ConstraintDefinition {
  id: string;
  name: string;
  description?: string;
  constraint_type: ConstraintType;
  geometry: {
    application_type: ConstraintApplication;
    target_entities: number[];
    coordinates?: number[][];
    normal_vector?: number[];
  };
  constraint_value: {
    constrained_dofs: ConstraintDOF[];
    prescribed_values: { [key: string]: number };
    stiffness_values?: { [key: string]: number };
    damping_values?: { [key: string]: number };
  };
  timing: {
    constraint_case: string;
    start_time: number;
    end_time?: number;
    time_function?: string;
  };
  is_active: boolean;
  color?: string;
  created_at: string;
}

export interface ConstraintCase {
  id: string;
  name: string;
  description?: string;
  constraints: string[];
  combination_factors: { [key: string]: number };
  is_default: boolean;
  created_at: string;
}

interface ConstraintConfigPanelProps {
  projectId: string;
  onConstraintChange?: (constraints: ConstraintDefinition[]) => void;
}

const ConstraintConfigPanel: React.FC<ConstraintConfigPanelProps> = ({
  projectId,
  onConstraintChange
}) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('constraints');
  
  // 状态管理
  const [constraints, setConstraints] = useState<ConstraintDefinition[]>([]);
  const [constraintCases, setConstraintCases] = useState<ConstraintCase[]>([]);
  const [editingConstraint, setEditingConstraint] = useState<ConstraintDefinition | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 约束类型配置
  const getConstraintTypeConfig = () => [
    { 
      value: ConstraintType.FIXED, 
      label: '固定约束', 
      icon: <LockOutlined />, 
      color: '#FF5722',
      description: '完全固定，所有自由度均被约束'
    },
    { 
      value: ConstraintType.PINNED, 
      label: '铰支约束', 
      icon: <BorderOutlined />, 
      color: '#2196F3',
      description: '铰接支撑，约束位移但允许转动'
    },
    { 
      value: ConstraintType.ROLLER, 
      label: '滑动约束', 
      icon: <MenuOutlined />, 
      color: '#4CAF50',
      description: '滑动支撑，允许某个方向的位移'
    },
    { 
      value: ConstraintType.DISPLACEMENT, 
      label: '位移约束', 
      icon: <AimOutlined />, 
      color: '#FF9800',
      description: '指定位移值约束'
    },
    { 
      value: ConstraintType.ROTATION, 
      label: '转角约束', 
      icon: <ExperimentOutlined />, 
      color: '#E91E63',
      description: '指定转角值约束'
    },
    { 
      value: ConstraintType.ELASTIC_SUPPORT, 
      label: '弹性支撑', 
      icon: <PhoneOutlined />, 
      color: '#9C27B0',
      description: '弹性约束，提供弹性支撑'
    },
    { 
      value: ConstraintType.SYMMETRY, 
      label: '对称约束', 
      icon: <InteractionOutlined />, 
      color: '#607D8B',
      description: '对称边界条件'
    },
    { 
      value: ConstraintType.CONTACT, 
      label: '接触约束', 
      icon: <ExclamationCircleOutlined />, 
      color: '#795548',
      description: '接触面约束条件'
    },
    { 
      value: ConstraintType.INTERFACE, 
      label: '界面约束', 
      icon: <CloseOutlined />, 
      color: '#FF6B6B',
      description: '界面连接约束'
    },
    { 
      value: ConstraintType.INFINITE_BOUNDARY, 
      label: '无限边界', 
      icon: <FullscreenOutlined />, 
      color: '#26C6DA',
      description: '无限元边界约束'
    }
  ];

  // 获取约束类型信息
  const getConstraintTypeInfo = (type: ConstraintType) => {
    return getConstraintTypeConfig().find(config => config.value === type);
  };

  // 添加新约束
  const handleAddConstraint = () => {
    const newConstraint: ConstraintDefinition = {
      id: `constraint_${Date.now()}`,
      name: `约束 ${constraints.length + 1}`,
      description: '',
      constraint_type: ConstraintType.FIXED,
      geometry: {
        application_type: ConstraintApplication.NODE,
        target_entities: [],
        coordinates: []
      },
      constraint_value: {
        constrained_dofs: [ConstraintDOF.ALL],
        prescribed_values: {},
        stiffness_values: {},
        damping_values: {}
      },
      timing: {
        constraint_case: 'default',
        start_time: 0,
        time_function: 'constant'
      },
      is_active: true,
      color: '#FF5722',
      created_at: new Date().toISOString()
    };
    
    setEditingConstraint(newConstraint);
    setModalVisible(true);
  };

  // 编辑约束
  const handleEditConstraint = (constraint: ConstraintDefinition) => {
    setEditingConstraint({...constraint});
    form.setFieldsValue(constraint);
    setModalVisible(true);
  };

  // 保存约束
  const handleSaveConstraint = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingConstraint) {
        const updatedConstraint = { ...editingConstraint, ...values };
        
        const updatedConstraints = editingConstraint.id.startsWith('constraint_')
          ? [...constraints, updatedConstraint]  // 新约束
          : constraints.map(constraint => constraint.id === editingConstraint.id ? updatedConstraint : constraint);  // 更新现有约束
        
        setConstraints(updatedConstraints);
        onConstraintChange?.(updatedConstraints);
        
        setModalVisible(false);
        setEditingConstraint(null);
        form.resetFields();
      }
    } catch (error) {
      console.error('保存约束失败:', error);
    }
  };

  // 删除约束
  const handleDeleteConstraint = (constraintId: string) => {
    const updatedConstraints = constraints.filter(constraint => constraint.id !== constraintId);
    setConstraints(updatedConstraints);
    onConstraintChange?.(updatedConstraints);
  };

  // 切换约束激活状态
  const handleToggleConstraint = (constraintId: string, active: boolean) => {
    const updatedConstraints = constraints.map(constraint => 
      constraint.id === constraintId ? { ...constraint, is_active: active } : constraint
    );
    setConstraints(updatedConstraints);
    onConstraintChange?.(updatedConstraints);
  };

  // 复制约束
  const handleCopyConstraint = (constraint: ConstraintDefinition) => {
    const copiedConstraint = {
      ...constraint,
      id: `constraint_${Date.now()}`,
      name: `${constraint.name}_副本`,
      created_at: new Date().toISOString()
    };
    
    const updatedConstraints = [...constraints, copiedConstraint];
    setConstraints(updatedConstraints);
    onConstraintChange?.(updatedConstraints);
  };

  // 渲染约束表格
  const renderConstraintTable = () => {
    const columns = [
      {
        title: '状态',
        dataIndex: 'is_active',
        width: 60,
        render: (active: boolean, record: ConstraintDefinition) => (
          <Switch
            size="small"
            checked={active}
            onChange={(checked) => handleToggleConstraint(record.id, checked)}
          />
        )
      },
      {
        title: '名称',
        dataIndex: 'name',
        width: 120,
        render: (name: string, record: ConstraintDefinition) => (
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
        dataIndex: 'constraint_type',
        width: 100,
        render: (type: ConstraintType) => {
          const typeInfo = getConstraintTypeInfo(type);
          return (
            <Tag color={typeInfo?.color} icon={typeInfo?.icon}>
              {typeInfo?.label}
            </Tag>
          );
        }
      },
      {
        title: '约束自由度',
        width: 120,
        render: (_, record: ConstraintDefinition) => (
          <Space wrap>
            {record.constraint_value.constrained_dofs.map(dof => (
              <Tag key={dof}>{dof.toUpperCase()}</Tag>
            ))}
          </Space>
        )
      },
      {
        title: '施加位置',
        dataIndex: ['geometry', 'application_type'],
        width: 80,
        render: (type: ConstraintApplication) => (
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
        render: (_, record: ConstraintDefinition) => (
          <Space size="small">
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditConstraint(record)}
              />
            </Tooltip>
            <Tooltip title="复制">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopyConstraint(record)}
              />
            </Tooltip>
            <Popconfirm
              title="确定删除此约束？"
              onConfirm={() => handleDeleteConstraint(record.id)}
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
        dataSource={constraints}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        locale={{ emptyText: '暂无约束配置' }}
      />
    );
  };

  // 渲染约束模板
  const renderConstraintTemplates = () => {
    const templates = {
      "深基坑": [
        { name: "底部固定", type: ConstraintType.FIXED, dofs: ["ux", "uy", "uz"] },
        { name: "围护结构底部铰接", type: ConstraintType.PINNED, dofs: ["ux", "uy", "uz"] },
        { name: "对称边界", type: ConstraintType.SYMMETRY, dofs: ["ux"] },
        { name: "弹性支撑", type: ConstraintType.ELASTIC_SUPPORT, dofs: ["ux", "uy"] }
      ],
      "桩基": [
        { name: "桩底固定", type: ConstraintType.FIXED, dofs: ["ux", "uy", "uz", "rx", "ry", "rz"] },
        { name: "土体弹性约束", type: ConstraintType.ELASTIC_SUPPORT, dofs: ["ux", "uy"] },
        { name: "桩顶铰接", type: ConstraintType.PINNED, dofs: ["ux", "uy", "uz"] }
      ],
      "隧道": [
        { name: "隧道底部固定", type: ConstraintType.FIXED, dofs: ["ux", "uy", "uz"] },
        { name: "围岩接触", type: ConstraintType.CONTACT, dofs: ["ux", "uy", "uz"] },
        { name: "对称轴约束", type: ConstraintType.SYMMETRY, dofs: ["ux"] }
      ]
    };

    return (
      <Row gutter={[16, 16]}>
        {Object.entries(templates).map(([category, categoryConstraints]) => (
          <Col span={8} key={category}>
            <Card title={category} size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                {categoryConstraints.map((template, index) => (
                  <Card
                    key={index}
                    size="small"
                    hoverable
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      // 创建基于模板的约束
                      const templateConstraint: ConstraintDefinition = {
                        id: `constraint_${Date.now()}`,
                        name: template.name,
                        description: `基于${category}模板创建`,
                        constraint_type: template.type,
                        geometry: {
                          application_type: ConstraintApplication.SURFACE,
                          target_entities: [],
                          coordinates: []
                        },
                        constraint_value: {
                          constrained_dofs: template.dofs as ConstraintDOF[],
                          prescribed_values: {},
                          stiffness_values: {},
                          damping_values: {}
                        },
                        timing: {
                          constraint_case: 'default',
                          start_time: 0,
                          time_function: 'constant'
                        },
                        is_active: true,
                        color: getConstraintTypeInfo(template.type)?.color || '#FF5722',
                        created_at: new Date().toISOString()
                      };
                      
                      setEditingConstraint(templateConstraint);
                      setModalVisible(true);
                    }}
                  >
                    <Space>
                      {getConstraintTypeInfo(template.type)?.icon}
                      <div>
                        <Text strong>{template.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {template.dofs.map(dof => dof.toUpperCase()).join(', ')}
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
      title={editingConstraint?.id.startsWith('constraint_') ? "添加约束" : "编辑约束"}
      open={modalVisible}
      onOk={handleSaveConstraint}
      onCancel={() => {
        setModalVisible(false);
        setEditingConstraint(null);
        form.resetFields();
      }}
      width={800}
      okText="保存"
      cancelText="取消"
    >
      {editingConstraint && (
        <Form
          form={form}
          layout="vertical"
          initialValues={editingConstraint}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="约束名称"
                rules={[{ required: true, message: '请输入约束名称' }]}
              >
                <Input placeholder="输入约束名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="constraint_type" label="约束类型">
                <Select
                  onChange={(value) => {
                    const typeInfo = getConstraintTypeInfo(value);
                    setEditingConstraint({
                      ...editingConstraint,
                      constraint_type: value,
                      color: typeInfo?.color || '#FF5722'
                    });
                  }}
                >
                  {getConstraintTypeConfig().map(config => (
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
            <Col span={12}>
              <Form.Item name={['geometry', 'application_type']} label="施加方式">
                <Select>
                  <Option value={ConstraintApplication.NODE}>节点</Option>
                  <Option value={ConstraintApplication.ELEMENT}>单元</Option>
                  <Option value={ConstraintApplication.SURFACE}>面</Option>
                  <Option value={ConstraintApplication.EDGE}>边</Option>
                  <Option value={ConstraintApplication.REGION}>区域</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['timing', 'constraint_case']} label="约束工况">
                <Input placeholder="约束工况名称" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="约束自由度">
            <Checkbox.Group
              options={[
                { label: 'UX', value: 'ux' },
                { label: 'UY', value: 'uy' },
                { label: 'UZ', value: 'uz' },
                { label: 'RX', value: 'rx' },
                { label: 'RY', value: 'ry' },
                { label: 'RZ', value: 'rz' },
              ]}
              value={editingConstraint.constraint_value.constrained_dofs}
              onChange={(values) => {
                setEditingConstraint({
                  ...editingConstraint,
                  constraint_value: {
                    ...editingConstraint.constraint_value,
                    constrained_dofs: values as ConstraintDOF[]
                  }
                });
              }}
            />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="输入约束描述（可选）" />
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
          tab={<Space size={4}><LockOutlined style={{ fontSize: '12px' }} />约束配置</Space>}
          key="constraints"
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card
              title={
                <Space>
                  <LockOutlined />
                  约束列表
                  <Tag color="blue">{constraints.filter(c => c.is_active).length}/{constraints.length}</Tag>
                </Space>
              }
              size="small"
              extra={
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleAddConstraint}
                >
                  添加约束
                </Button>
              }
            >
              {renderConstraintTable()}
            </Card>
          </Space>
        </TabPane>

        <TabPane
          tab={<Space size={4}><SettingOutlined style={{ fontSize: '12px' }} />约束模板</Space>}
          key="templates"
        >
          <Card title="常用约束模板" size="small">
            <Alert
              message="快速创建常用约束"
              description="选择模板可以快速创建相应类型的约束配置"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            {renderConstraintTemplates()}
          </Card>
        </TabPane>
      </Tabs>

      {renderEditModal()}
    </div>
  );
};

export default ConstraintConfigPanel;