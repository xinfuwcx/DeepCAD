import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Modal, Form, Input, Select, InputNumber, Space, 
  Typography, Card, Row, Col, Popconfirm, message, Tabs, Alert,
  Tag, Descriptions, Divider
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined,
  ExperimentOutlined, SaveOutlined, ReloadOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  MaterialDefinitionSchema, 
  type MaterialDefinition, 
  type SoilConstitutiveModel,
  type MaterialParameters 
} from '../schemas';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const MaterialLibraryView: React.FC = () => {
  const [materials, setMaterials] = useState<MaterialDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialDefinition | null>(null);
  const [selectedModel, setSelectedModel] = useState<SoilConstitutiveModel>('mohr_coulomb');

  // React Hook Form
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<MaterialDefinition>({
    resolver: zodResolver(MaterialDefinitionSchema),
    defaultValues: {
      id: '',
      name: '',
      description: '',
      soil_type: 'clay',
      constitutive_model: 'mohr_coulomb',
      parameters: {
        density: 1900,
        unit_weight: 19,
        cohesion: 30,
        friction: 15,
        elastic_modulus: 10000,
        poisson_ratio: 0.35
      },
      is_default: false
    }
  });

  const watchedModel = watch('constitutive_model');

  // 土体计算模型说明
  const modelDescriptions = {
    linear_elastic: {
      name: '线弹性模型',
      description: '适用于小变形条件下的弹性分析，参数简单，计算效率高。',
      parameters: ['密度', '弹性模量', '泊松比'],
      application: '初步设计、弹性变形分析'
    },
    mohr_coulomb: {
      name: '莫尔-库伦模型',
      description: '经典塑性模型，广泛应用于土体工程，适用于大多数土体分析。',
      parameters: ['密度', '粘聚力', '内摩擦角', '弹性模量', '泊松比'],
      application: '基坑开挖、边坡稳定、承载力分析'
    },
    drucker_prager: {
      name: '德鲁克-普拉格模型',
      description: '考虑中间主应力影响的塑性模型，适用于三维应力状态分析。',
      parameters: ['密度', '粘聚力', '内摩擦角', '弹性模量', '泊松比', '剪胀角'],
      application: '三维复杂应力状态、隧道开挖'
    },
    cam_clay: {
      name: '剑桥黏土模型',
      description: '考虑土体硬化/软化特性，适用于正常固结和超固结粘土。',
      parameters: ['密度', '临界状态摩擦角', '压缩指数', '回弹指数', '初始孔隙比'],
      application: '软土地基、沉降分析、粘土工程'
    },
    hardening_soil: {
      name: '硬化土模型',
      description: '高级本构模型，考虑土体的应力相关刚度和塑性硬化。',
      parameters: ['密度', '粘聚力', '内摩擦角', '三轴压缩模量', '三轴伸长模量', '侧限压缩模量'],
      application: '复杂土体工程、精确变形分析'
    },
    small_strain: {
      name: '小应变土模型',
      description: '考虑小应变范围内土体刚度的非线性特性，适用于动力分析。',
      parameters: ['密度', '粘聚力', '内摩擦角', '参考剪切模量', '剪切应变参数'],
      application: '动力分析、地震响应、振动敏感结构'
    },
    elastic_perfectly_plastic: {
      name: '理想弹塑性模型',
      description: '简化的弹塑性模型，达到屈服后保持常应力状态。',
      parameters: ['密度', '弹性模量', '泊松比', '屈服强度'],
      application: '简化分析、教学演示'
    },
    nonlinear_elastic: {
      name: '非线性弹性模型',
      description: '考虑弹性模量随应力状态变化的非线性弹性模型。',
      parameters: ['密度', '初始弹性模量', '泊松比', '非线性参数'],
      application: '非线性变形分析、大变形问题'
    }
  };

  // 默认材料库
  const defaultMaterials: MaterialDefinition[] = [
    {
      id: 'clay_soft',
      name: '软粘土',
      description: '典型的软弱粘土，常见于沿海地区',
      soil_type: 'clay',
      constitutive_model: 'mohr_coulomb',
      parameters: {
        density: 1750,
        unit_weight: 17.5,
        cohesion: 15,
        friction: 8,
        elastic_modulus: 5000,
        poisson_ratio: 0.4
      },
      is_default: true
    },
    {
      id: 'clay_hard',
      name: '硬粘土',
      description: '密实的硬质粘土，承载力较高',
      soil_type: 'clay',
      constitutive_model: 'mohr_coulomb',
      parameters: {
        density: 2000,
        unit_weight: 20,
        cohesion: 60,
        friction: 20,
        elastic_modulus: 25000,
        poisson_ratio: 0.35
      },
      is_default: true
    },
    {
      id: 'sand_loose',
      name: '松散砂土',
      description: '密度较低的砂土，内摩擦角中等',
      soil_type: 'sand',
      constitutive_model: 'mohr_coulomb',
      parameters: {
        density: 1800,
        unit_weight: 18,
        cohesion: 0,
        friction: 28,
        elastic_modulus: 15000,
        poisson_ratio: 0.3
      },
      is_default: true
    },
    {
      id: 'sand_dense',
      name: '密实砂土',
      description: '密度较高的砂土，内摩擦角较大',
      soil_type: 'sand',
      constitutive_model: 'mohr_coulomb',
      parameters: {
        density: 2100,
        unit_weight: 21,
        cohesion: 0,
        friction: 38,
        elastic_modulus: 30000,
        poisson_ratio: 0.25
      },
      is_default: true
    },
    {
      id: 'rock_weak',
      name: '软质岩石',
      description: '风化程度较高的软质岩石',
      soil_type: 'rock',
      constitutive_model: 'mohr_coulomb',
      parameters: {
        density: 2200,
        unit_weight: 22,
        cohesion: 200,
        friction: 35,
        elastic_modulus: 2000000,
        poisson_ratio: 0.25
      },
      is_default: true
    }
  ];

  // 初始化材料库
  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = () => {
    setLoading(true);
    // 模拟从本地存储或后端加载材料数据
    setTimeout(() => {
      const savedMaterials = localStorage.getItem('soil_materials');
      if (savedMaterials) {
        setMaterials(JSON.parse(savedMaterials));
      } else {
        setMaterials(defaultMaterials);
      }
      setLoading(false);
    }, 500);
  };

  const saveMaterials = (newMaterials: MaterialDefinition[]) => {
    localStorage.setItem('soil_materials', JSON.stringify(newMaterials));
    setMaterials(newMaterials);
  };

  const handleAddMaterial = () => {
    setEditingMaterial(null);
    reset({
      id: `material_${Date.now()}`,
      name: '',
      description: '',
      soil_type: 'clay',
      constitutive_model: 'mohr_coulomb',
      parameters: {
        density: 1900,
        unit_weight: 19,
        cohesion: 30,
        friction: 15,
        elastic_modulus: 10000,
        poisson_ratio: 0.35
      },
      is_default: false
    });
    setModalVisible(true);
  };

  const handleEditMaterial = (material: MaterialDefinition) => {
    setEditingMaterial(material);
    reset(material);
    setModalVisible(true);
  };

  const handleDeleteMaterial = (id: string) => {
    const newMaterials = materials.filter(m => m.id !== id);
    saveMaterials(newMaterials);
    message.success('材料已删除');
  };

  const handleCopyMaterial = (material: MaterialDefinition) => {
    const newMaterial: MaterialDefinition = {
      ...material,
      id: `material_${Date.now()}`,
      name: `${material.name} (副本)`,
      is_default: false
    };
    setEditingMaterial(null);
    reset(newMaterial);
    setModalVisible(true);
  };

  const handleSaveMaterial = (data: MaterialDefinition) => {
    const newMaterials = [...materials];
    
    if (editingMaterial) {
      const index = newMaterials.findIndex(m => m.id === editingMaterial.id);
      newMaterials[index] = { ...data, modified_date: new Date().toISOString() };
      message.success('材料已更新');
    } else {
      newMaterials.push({ ...data, created_date: new Date().toISOString() });
      message.success('材料已添加');
    }
    
    saveMaterials(newMaterials);
    setModalVisible(false);
  };

  const handleResetToDefaults = () => {
    saveMaterials(defaultMaterials);
    message.success('已重置为默认材料库');
  };

  const columns = [
    {
      title: '材料名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (text: string, record: MaterialDefinition) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#00d9ff' }}>{text}</Text>
          {record.is_default && <Tag color="blue">默认</Tag>}
        </Space>
      )
    },
    {
      title: '土层类型',
      dataIndex: 'soil_type',
      key: 'soil_type',
      width: 80,
      render: (type: string) => {
        const typeMap = {
          clay: { label: '粘土', color: '#8B4513' },
          sand: { label: '砂土', color: '#F4A460' },
          silt: { label: '粉土', color: '#DDD' },
          gravel: { label: '卵石', color: '#696969' },
          rock: { label: '基岩', color: '#2F4F4F' },
          fill: { label: '填土', color: '#D2B48C' }
        };
        const info = typeMap[type as keyof typeof typeMap];
        return (
          <Tag color={info?.color} style={{ color: '#000' }}>
            {info?.label}
          </Tag>
        );
      }
    },
    {
      title: '本构模型',
      dataIndex: 'constitutive_model',
      key: 'constitutive_model',
      width: 120,
      render: (model: SoilConstitutiveModel) => (
        <Text style={{ fontSize: '12px' }}>
          {modelDescriptions[model]?.name}
        </Text>
      )
    },
    {
      title: '主要参数',
      key: 'parameters',
      width: 200,
      render: (_, record: MaterialDefinition) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: '11px' }}>
            密度: {record.parameters.density} kg/m³
          </Text>
          <Text style={{ fontSize: '11px' }}>
            粘聚力: {record.parameters.cohesion} kPa
          </Text>
          <Text style={{ fontSize: '11px' }}>
            摩擦角: {record.parameters.friction}°
          </Text>
          {record.parameters.elastic_modulus && (
            <Text style={{ fontSize: '11px' }}>
              弹性模量: {record.parameters.elastic_modulus} kPa
            </Text>
          )}
        </Space>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 150,
      ellipsis: true
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record: MaterialDefinition) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditMaterial(record)}
          />
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopyMaterial(record)}
          />
          <Popconfirm
            title="确定删除此材料吗？"
            onConfirm={() => handleDeleteMaterial(record.id)}
            okText="删除"
            cancelText="取消"
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={record.is_default}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const renderParameterForm = (model: SoilConstitutiveModel) => {
    const modelInfo = modelDescriptions[model];
    
    return (
      <Card
        title={`${modelInfo.name} - 参数配置`}
        size="small"
        style={{ marginTop: '16px' }}
      >
        <Alert
          message={modelInfo.description}
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="密度 (kg/m³)" required>
              <Controller
                name="parameters.density"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    min={1000}
                    max={3000}
                    style={{ width: '100%' }}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="重度 (kN/m³)">
              <Controller
                name="parameters.unit_weight"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    min={10}
                    max={30}
                    step={0.1}
                    style={{ width: '100%' }}
                  />
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="粘聚力 (kPa)" required>
              <Controller
                name="parameters.cohesion"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    min={0}
                    max={500}
                    style={{ width: '100%' }}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="内摩擦角 (°)" required>
              <Controller
                name="parameters.friction"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    min={0}
                    max={50}
                    style={{ width: '100%' }}
                  />
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        {(model === 'linear_elastic' || model === 'mohr_coulomb' || model === 'drucker_prager') && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="弹性模量 (kPa)">
                <Controller
                  name="parameters.elastic_modulus"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      min={1000}
                      max={10000000}
                      style={{ width: '100%' }}
                    />
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="泊松比">
                <Controller
                  name="parameters.poisson_ratio"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      min={0}
                      max={0.5}
                      step={0.01}
                      style={{ width: '100%' }}
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>
        )}
      </Card>
    );
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: '#1a1a2e', 
      minHeight: '100vh',
      color: '#ffffff'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ color: '#00d9ff', margin: 0 }}>
          <ExperimentOutlined style={{ marginRight: '8px' }} />
          材料库管理
        </Title>
        <Paragraph style={{ color: 'rgba(255, 255, 255, 0.7)', marginTop: '8px' }}>
          管理土体材料参数，为地质建模提供标准化的材料配置
        </Paragraph>
      </div>

      <Card
        style={{ 
          background: 'rgba(0, 217, 255, 0.05)',
          border: '1px solid rgba(0, 217, 255, 0.2)'
        }}
        title="土体材料库"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddMaterial}
              style={{ 
                background: 'rgba(0, 217, 255, 0.8)',
                border: 'none'
              }}
            >
              添加材料
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadMaterials}
              loading={loading}
            >
              刷新
            </Button>
            <Popconfirm
              title="确定重置为默认材料库吗？这将清除所有自定义材料。"
              onConfirm={handleResetToDefaults}
              okText="确定"
              cancelText="取消"
            >
              <Button danger>重置默认</Button>
            </Popconfirm>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={materials}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个材料`
          }}
        />
      </Card>

      {/* 材料编辑模态框 */}
      <Modal
        title={editingMaterial ? "编辑材料" : "添加材料"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
        style={{ top: 50 }}
      >
        <Form layout="vertical" onFinish={handleSubmit(handleSaveMaterial)}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="材料名称" required>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} placeholder="请输入材料名称" />
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="土层类型" required>
                <Controller
                  name="soil_type"
                  control={control}
                  render={({ field }) => (
                    <Select {...field}>
                      <Option value="clay">粘土</Option>
                      <Option value="sand">砂土</Option>
                      <Option value="silt">粉土</Option>
                      <Option value="gravel">卵石</Option>
                      <Option value="rock">基岩</Option>
                      <Option value="fill">填土</Option>
                    </Select>
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="本构模型" required>
                <Controller
                  name="constitutive_model"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} onChange={(value) => {
                      field.onChange(value);
                      setSelectedModel(value);
                    }}>
                      <Option value="linear_elastic">线弹性模型</Option>
                      <Option value="mohr_coulomb">莫尔-库伦模型</Option>
                      <Option value="drucker_prager">德鲁克-普拉格模型</Option>
                      <Option value="cam_clay">剑桥黏土模型</Option>
                      <Option value="hardening_soil">硬化土模型</Option>
                      <Option value="small_strain">小应变土模型</Option>
                      <Option value="elastic_perfectly_plastic">理想弹塑性模型</Option>
                      <Option value="nonlinear_elastic">非线性弹性模型</Option>
                    </Select>
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="材料描述">
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextArea
                  {...field}
                  placeholder="请输入材料描述、适用条件等信息..."
                  rows={3}
                />
              )}
            />
          </Form.Item>

          {renderParameterForm(watchedModel)}

          <div style={{ marginTop: '24px', textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                style={{ 
                  background: 'rgba(0, 217, 255, 0.8)',
                  border: 'none'
                }}
              >
                保存材料
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MaterialLibraryView;