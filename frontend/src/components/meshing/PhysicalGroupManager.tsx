import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Space, Card, 
  Typography, Divider, Tag, Row, Col, message, Popconfirm,
  InputNumber, Collapse
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, 
  ExperimentOutlined, BgColorsOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { GlassCard, GlassButton } from '../ui/GlassComponents';

const { Title, Text } = Typography;
const { Panel } = Collapse;

// Types matching the backend schemas
interface PhysicalGroupInfo {
  tag: number;
  name: string;
  dimension: number;
  entity_count: number;
  material_type?: string;
  properties: Record<string, any>;
}

interface PhysicalGroupDefinition {
  name: string;
  group_type: 'point' | 'curve' | 'surface' | 'volume';
  material_type: 'soil' | 'concrete' | 'steel' | 'rock' | 'grout' | 'water' | 'excavation';
  description?: string;
  color?: string;
  properties: Record<string, any>;
}

interface EntityInfo {
  tag: number;
  dimension: number;
  bounding_box?: number[];
  parent_entities: number[];
  child_entities: number[];
}

const PhysicalGroupManager: React.FC = () => {
  const [groups, setGroups] = useState<PhysicalGroupInfo[]>([]);
  const [entities, setEntities] = useState<EntityInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PhysicalGroupInfo | null>(null);
  const [form] = Form.useForm();

  // Load physical groups and entities - 使用模拟数据
  const loadData = async () => {
    setLoading(true);
    try {
      // 模拟物理组数据
      const mockGroups: PhysicalGroupInfo[] = [
        {
          tag: 1,
          name: 'Soil_Layer_1',
          dimension: 3,
          entity_count: 45,
          material_type: 'soil',
          properties: {
            density: 1850,
            young_modulus: 25e6,
            poisson_ratio: 0.3,
            cohesion: 15000,
            friction_angle: 25
          }
        },
        {
          tag: 2,
          name: 'Diaphragm_Wall',
          dimension: 2,
          entity_count: 12,
          material_type: 'concrete',
          properties: {
            density: 2500,
            young_modulus: 30e9,
            poisson_ratio: 0.2,
            compressive_strength: 35e6
          }
        },
        {
          tag: 3,
          name: 'Steel_Support',
          dimension: 1,
          entity_count: 8,
          material_type: 'steel',
          properties: {
            density: 7850,
            young_modulus: 200e9,
            poisson_ratio: 0.3,
            yield_strength: 355e6
          }
        },
        {
          tag: 4,
          name: 'Excavation_Zone',
          dimension: 3,
          entity_count: 1,
          material_type: 'excavation',
          properties: {
            excavation_depth: 15,
            excavation_width: 30,
            excavation_length: 50
          }
        }
      ];

      // 模拟几何实体数据
      const mockEntities: EntityInfo[] = [
        { tag: 1, dimension: 3, bounding_box: [0, 0, -30, 60, 40, 0], parent_entities: [], child_entities: [101, 102] },
        { tag: 2, dimension: 2, bounding_box: [0, 0, -25, 60, 0.8, 0], parent_entities: [1], child_entities: [] },
        { tag: 3, dimension: 1, bounding_box: [5, 5, -5, 55, 5, -5], parent_entities: [2], child_entities: [] },
        { tag: 4, dimension: 3, bounding_box: [10, 10, -15, 50, 30, 0], parent_entities: [], child_entities: [] }
      ];
      
      setGroups(mockGroups);
      setEntities(mockEntities);

      console.log('3号计算专家 - 物理组数据加载完成:', { groups: mockGroups.length, entities: mockEntities.length });
    } catch (error) {
      message.error('加载数据失败');
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Create or update physical group - 模拟操作
  const handleSubmit = async (values: any) => {
    try {
      const definition: PhysicalGroupDefinition = {
        name: values.name,
        group_type: values.group_type,
        material_type: values.material_type,
        description: values.description,
        color: values.color,
        properties: values.properties ? JSON.parse(values.properties) : {}
      };

      // 模拟操作延迟
      await new Promise(resolve => setTimeout(resolve, 500));

      if (editingGroup) {
        // 更新现有组
        setGroups(prevGroups => 
          prevGroups.map(group => 
            group.tag === editingGroup.tag 
              ? {
                  ...group,
                  name: values.name,
                  material_type: values.material_type,
                  properties: definition.properties
                }
              : group
          )
        );
        message.success('物理组更新成功');
      } else {
        // 创建新组
        const newGroup: PhysicalGroupInfo = {
          tag: Math.max(...groups.map(g => g.tag), 0) + 1,
          name: values.name,
          dimension: ['point', 'curve', 'surface', 'volume'].indexOf(values.group_type),
          entity_count: values.entity_tags?.length || 0,
          material_type: values.material_type,
          properties: definition.properties
        };
        
        setGroups(prevGroups => [...prevGroups, newGroup]);
        message.success('物理组创建成功');
      }

      setModalVisible(false);
      setEditingGroup(null);
      form.resetFields();
      
      console.log('3号计算专家 - 物理组操作完成:', editingGroup ? '更新' : '创建', values.name);
    } catch (error) {
      message.error('操作失败');
      console.error('Submit error:', error);
    }
  };

  // Delete physical group - 模拟操作
  const handleDelete = async (group: PhysicalGroupInfo) => {
    try {
      // 模拟删除延迟
      await new Promise(resolve => setTimeout(resolve, 300));

      setGroups(prevGroups => prevGroups.filter(g => g.tag !== group.tag));
      message.success('物理组删除成功');
      
      console.log('3号计算专家 - 物理组删除完成:', group.name);
    } catch (error) {
      message.error('删除失败');
      console.error('Delete error:', error);
    }
  };

  // Open modal for creating/editing
  const openModal = (group?: PhysicalGroupInfo) => {
    if (group) {
      setEditingGroup(group);
      form.setFieldsValue({
        name: group.name,
        group_type: ['point', 'curve', 'surface', 'volume'][group.dimension],
        material_type: group.material_type,
        description: '',
        properties: JSON.stringify(group.properties, null, 2)
      });
    } else {
      setEditingGroup(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  const dimensionNames = ['点', '线', '面', '体'];
  const materialTypeNames = {
    soil: '土体',
    concrete: '混凝土',
    steel: '钢材',
    rock: '岩石',
    grout: '浆液',
    water: '水',
    excavation: '开挖体'
  };

  const materialColors = {
    soil: '#8b4513',
    concrete: '#808080',
    steel: '#7d8490',
    rock: '#696969',
    grout: '#dda0dd',
    water: '#1e90ff',
    excavation: '#ff6b6b'
  };

  const columns = [
    {
      title: '标签',
      dataIndex: 'tag',
      key: 'tag',
      width: 80,
      render: (tag: number) => <Tag color="blue">{tag}</Tag>
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: PhysicalGroupInfo) => (
        <Space>
          <Text strong>{name}</Text>
          <Tag color="geekblue">{dimensionNames[record.dimension]}</Tag>
        </Space>
      )
    },
    {
      title: '材料类型',
      dataIndex: 'material_type',
      key: 'material_type',
      render: (type: string) => {
        if (!type) return <Text type="secondary">未指定</Text>;
        return (
          <Tag color={materialColors[type as keyof typeof materialColors]}>
            {materialTypeNames[type as keyof typeof materialTypeNames] || type}
          </Tag>
        );
      }
    },
    {
      title: '实体数量',
      dataIndex: 'entity_count',
      key: 'entity_count',
      width: 100,
      render: (count: number) => <Text>{count}</Text>
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: PhysicalGroupInfo) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => openModal(record)}
            size="small"
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此物理组？"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />}
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="physical-group-manager">
      <GlassCard className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <Title level={4} className="m-0 text-gradient">
              <ExperimentOutlined /> Gmsh 物理组管理
            </Title>
            <Text className="text-secondary">
              管理网格生成的物理组，用于材料分配和边界条件设置
            </Text>
          </div>
          <Space>
            <GlassButton 
              variant="ghost" 
              onClick={loadData}
              loading={loading}
            >
              刷新
            </GlassButton>
            <GlassButton 
              variant="primary" 
              icon={<PlusOutlined />}
              onClick={() => openModal()}
            >
              创建物理组
            </GlassButton>
          </Space>
        </div>

        {/* Statistics */}
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <GlassCard variant="subtle" className="text-center p-4">
              <div className="text-2xl font-bold text-primary mb-1">
                {groups.length}
              </div>
              <div className="text-sm text-secondary">总物理组</div>
            </GlassCard>
          </Col>
          <Col span={6}>
            <GlassCard variant="subtle" className="text-center p-4">
              <div className="text-2xl font-bold text-success mb-1">
                {groups.filter(g => g.dimension === 3).length}
              </div>
              <div className="text-sm text-secondary">体单元组</div>
            </GlassCard>
          </Col>
          <Col span={6}>
            <GlassCard variant="subtle" className="text-center p-4">
              <div className="text-2xl font-bold text-warning mb-1">
                {groups.filter(g => g.dimension === 2).length}
              </div>
              <div className="text-sm text-secondary">面单元组</div>
            </GlassCard>
          </Col>
          <Col span={6}>
            <GlassCard variant="subtle" className="text-center p-4">
              <div className="text-2xl font-bold text-info mb-1">
                {entities.length}
              </div>
              <div className="text-sm text-secondary">几何实体</div>
            </GlassCard>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={groups}
          rowKey="tag"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个物理组`
          }}
          className="glass-table"
        />
      </GlassCard>

      {/* Create/Edit Modal */}
      <Modal
        title={editingGroup ? '编辑物理组' : '创建物理组'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingGroup(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            group_type: 'volume',
            material_type: 'soil'
          }}
        >
          <Form.Item
            name="name"
            label="物理组名称"
            rules={[{ required: true, message: '请输入物理组名称' }]}
          >
            <Input placeholder="例如: Soil_Layer_1" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="group_type"
                label="实体类型"
                rules={[{ required: true, message: '请选择实体类型' }]}
              >
                <Select>
                  <Select.Option value="point">点 (0D)</Select.Option>
                  <Select.Option value="curve">线 (1D)</Select.Option>
                  <Select.Option value="surface">面 (2D)</Select.Option>
                  <Select.Option value="volume">体 (3D)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="material_type"
                label="材料类型"
                rules={[{ required: true, message: '请选择材料类型' }]}
              >
                <Select>
                  <Select.Option value="soil">土体</Select.Option>
                  <Select.Option value="concrete">混凝土</Select.Option>
                  <Select.Option value="steel">钢材</Select.Option>
                  <Select.Option value="rock">岩石</Select.Option>
                  <Select.Option value="grout">浆液</Select.Option>
                  <Select.Option value="water">水</Select.Option>
                  <Select.Option value="excavation">开挖体</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea 
              rows={2}
              placeholder="物理组描述信息"
            />
          </Form.Item>

          <Form.Item
            name="color"
            label="可视化颜色"
          >
            <Input 
              placeholder="#FF6B6B" 
              addonBefore={<BgColorsOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="entity_tags"
            label="实体标签"
            tooltip="要包含在此物理组中的几何实体标签，以逗号分隔"
          >
            <Select
              mode="tags"
              placeholder="输入实体标签，如: 1,2,3"
              tokenSeparators={[',']}
            />
          </Form.Item>

          <Collapse>
            <Panel header="高级属性 (JSON)" key="1">
              <Form.Item
                name="properties"
                tooltip="材料属性和其他参数的JSON格式"
              >
                <Input.TextArea 
                  rows={6}
                  placeholder={`{
  "density": 2000,
  "young_modulus": 30e9,
  "poisson_ratio": 0.3
}`}
                />
              </Form.Item>
            </Panel>
          </Collapse>

          <Divider />

          <div className="flex justify-end gap-3">
            <Button 
              onClick={() => {
                setModalVisible(false);
                setEditingGroup(null);
                form.resetFields();
              }}
            >
              取消
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={loading}
            >
              {editingGroup ? '更新' : '创建'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default PhysicalGroupManager;