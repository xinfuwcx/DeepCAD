/**
 * 岩土工程材料库管理组件
 * 专业的岩土工程有限元材料库管理界面
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, InputNumber, Space, Typography,
  Card, Row, Col, Popconfirm, message, Tabs, Alert, Tag, Descriptions,
  Divider, Tooltip, Badge, Progress, Statistic, TreeSelect, Collapse,
  Switch, Rate, Timeline, Upload
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined,
  ExperimentOutlined, SaveOutlined, ReloadOutlined, InfoCircleOutlined,
  SearchOutlined, FilterOutlined, ExportOutlined, ImportOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined,
  BookOutlined, SettingOutlined, BarChartOutlined
} from '@ant-design/icons';
import { useForm, Controller } from 'react-hook-form';
import {
  GeotechnicalMaterial,
  GeotechnicalMaterialType,
  ConstitutiveModel,
  MaterialSearchCriteria,
  SoilMaterialProperties,
  RockMaterialProperties,
  ArtificialMaterialProperties
} from '../../types/GeotechnicalMaterials';
import { geotechnicalMaterialService } from '../../services/GeotechnicalMaterialService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Search } = Input;

interface Props {
  onMaterialSelect?: (material: GeotechnicalMaterial) => void;
  selectedMaterialIds?: string[];
  mode?: 'view' | 'select' | 'manage';
}

const GeotechnicalMaterialLibrary: React.FC<Props> = ({
  onMaterialSelect,
  selectedMaterialIds = [],
  mode = 'manage'
}) => {
  // 状态管理
  const [materials, setMaterials] = useState<GeotechnicalMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<GeotechnicalMaterial | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<GeotechnicalMaterial | null>(null);
  const [searchCriteria, setSearchCriteria] = useState<MaterialSearchCriteria>({
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [activeTab, setActiveTab] = useState('materials');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // 表单管理
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();

  // 材料类型选项
  const materialTypeOptions = [
    { value: GeotechnicalMaterialType.CLAY, label: '粘性土', color: '#8B4513' },
    { value: GeotechnicalMaterialType.SILT, label: '粉土', color: '#DDD' },
    { value: GeotechnicalMaterialType.SAND, label: '砂土', color: '#F4A460' },
    { value: GeotechnicalMaterialType.GRAVEL, label: '砾石土', color: '#696969' },
    { value: GeotechnicalMaterialType.ROCK_HARD, label: '硬质岩', color: '#2F4F4F' },
    { value: GeotechnicalMaterialType.ROCK_SOFT, label: '软质岩', color: '#708090' },
    { value: GeotechnicalMaterialType.CONCRETE, label: '混凝土', color: '#A9A9A9' },
    { value: GeotechnicalMaterialType.STEEL, label: '钢材', color: '#4682B4' },
    { value: GeotechnicalMaterialType.FILL, label: '填土', color: '#D2B48C' }
  ];

  // 本构模型选项
  const constitutiveModelOptions = [
    { value: ConstitutiveModel.LINEAR_ELASTIC, label: '线弹性', description: '适用于小变形弹性分析' },
    { value: ConstitutiveModel.MOHR_COULOMB, label: '摩尔-库伦', description: '经典塑性模型，适用于大多数土体' },
    { value: ConstitutiveModel.DRUCKER_PRAGER, label: '德鲁克-普拉格', description: '考虑中间主应力的塑性模型' },
    { value: ConstitutiveModel.CAM_CLAY, label: '剑桥模型', description: '适用于正常固结粘土' },
    { value: ConstitutiveModel.HARDENING_SOIL, label: '硬化土模型', description: '考虑应力相关刚度的高级模型' },
    { value: ConstitutiveModel.HOEK_BROWN, label: '霍克-布朗', description: '岩石材料的经典模型' }
  ];

  // 初始化数据
  useEffect(() => {
    loadMaterials();
  }, [searchCriteria]);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const results = geotechnicalMaterialService.searchMaterials(searchCriteria);
      setMaterials(results);
    } catch (error) {
      message.error('加载材料数据失败');
      console.error('Load materials error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 统计信息
  const statistics = useMemo(() => {
    return geotechnicalMaterialService.getStatistics();
  }, [materials]);

  // 处理搜索
  const handleSearch = (values: any) => {
    const newCriteria: MaterialSearchCriteria = {
      ...searchCriteria,
      ...values,
      keyword: values.keyword || undefined,
      type: values.type && values.type.length > 0 ? values.type : undefined,
      constitutiveModel: values.constitutiveModel && values.constitutiveModel.length > 0 ? values.constitutiveModel : undefined
    };
    setSearchCriteria(newCriteria);
  };

  // 重置搜索
  const handleResetSearch = () => {
    searchForm.resetFields();
    setSearchCriteria({
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };

  // 添加材料
  const handleAddMaterial = () => {
    setEditingMaterial(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 编辑材料
  const handleEditMaterial = (material: GeotechnicalMaterial) => {
    setEditingMaterial(material);
    form.setFieldsValue({
      ...material,
      properties: material.properties
    });
    setModalVisible(true);
  };

  // 复制材料
  const handleCopyMaterial = (material: GeotechnicalMaterial) => {
    const newMaterial = {
      ...material,
      id: `${material.id}_copy_${Date.now()}`,
      name: `${material.name} (副本)`,
      status: 'draft' as const,
      created: new Date(),
      modified: new Date(),
      validated: false
    };
    setEditingMaterial(null);
    form.setFieldsValue({
      ...newMaterial,
      properties: newMaterial.properties
    });
    setModalVisible(true);
  };

  // 删除材料
  const handleDeleteMaterial = async (materialId: string) => {
    try {
      const success = await geotechnicalMaterialService.deleteMaterial(materialId);
      if (success) {
        message.success('材料删除成功');
        loadMaterials();
      } else {
        message.error('材料删除失败');
      }
    } catch (error) {
      message.error('材料删除失败');
      console.error('Delete material error:', error);
    }
  };

  // 保存材料
  const handleSaveMaterial = async (values: any) => {
    try {
      const materialData: GeotechnicalMaterial = {
        ...values,
        id: editingMaterial?.id || `material_${Date.now()}`,
        version: editingMaterial?.version || '1.0.0',
        created: editingMaterial?.created || new Date(),
        modified: new Date(),
        status: editingMaterial?.status || 'draft',
        validated: false
      };

      let success = false;
      if (editingMaterial) {
        success = await geotechnicalMaterialService.updateMaterial(editingMaterial.id, materialData);
        message.success('材料更新成功');
      } else {
        success = await geotechnicalMaterialService.addMaterial(materialData);
        message.success('材料添加成功');
      }

      if (success) {
        setModalVisible(false);
        loadMaterials();
      }
    } catch (error) {
      message.error('保存材料失败');
      console.error('Save material error:', error);
    }
  };

  // 查看材料详情
  const handleViewMaterial = (material: GeotechnicalMaterial) => {
    setSelectedMaterial(material);
    setDetailModalVisible(true);
  };

  // 验证材料
  const handleValidateMaterial = async (materialId: string) => {
    const material = geotechnicalMaterialService.getMaterial(materialId);
    if (!material) return;

    try {
      const validation = await geotechnicalMaterialService.validateMaterial(material);
      
      if (validation.isValid) {
        message.success('材料验证通过');
        await geotechnicalMaterialService.updateMaterial(materialId, { validated: true });
        loadMaterials();
      } else {
        Modal.warning({
          title: '材料验证失败',
          width: 600,
          content: (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Text strong>总体评分: </Text>
                <Progress percent={validation.overallScore} size="small" />
              </div>
              {validation.errors.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <Text type="danger" strong>错误:</Text>
                  <ul>
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validation.warnings.length > 0 && (
                <div>
                  <Text type="warning" strong>警告:</Text>
                  <ul>
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        });
      }
    } catch (error) {
      message.error('验证失败');
      console.error('Validation error:', error);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '材料名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: GeotechnicalMaterial) => (
        <Space direction="vertical" size={0}>
          <Button
            type="link"
            style={{ padding: 0, fontSize: '14px', fontWeight: 500 }}
            onClick={() => handleViewMaterial(record)}
          >
            {text}
          </Button>
          <Space size={4}>
            <Tag color={getStatusColor(record.status)} size="small">
              {getStatusText(record.status)}
            </Tag>
            {record.validated && (
              <Tag color="green" size="small">
                <CheckCircleOutlined /> 已验证
              </Tag>
            )}
          </Space>
        </Space>
      )
    },
    {
      title: '材料类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: GeotechnicalMaterialType) => {
        const typeInfo = materialTypeOptions.find(t => t.value === type);
        return (
          <Tag color={typeInfo?.color} style={{ color: '#000' }}>
            {typeInfo?.label}
          </Tag>
        );
      }
    },
    {
      title: '本构模型',
      dataIndex: 'constitutiveModel',
      key: 'constitutiveModel',
      width: 140,
      render: (model: ConstitutiveModel) => {
        const modelInfo = constitutiveModelOptions.find(m => m.value === model);
        return (
          <Tooltip title={modelInfo?.description}>
            <Text style={{ fontSize: '12px' }}>{modelInfo?.label}</Text>
          </Tooltip>
        );
      }
    },
    {
      title: '主要参数',
      key: 'parameters',
      width: 280,
      render: (_, record: GeotechnicalMaterial) => {
        const props = record.properties;
        return (
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: '11px' }}>
              密度: {props.density} kg/m³
            </Text>
            <Text style={{ fontSize: '11px' }}>
              弹性模量: {formatNumber(props.elasticModulus)} kPa
            </Text>
            {'cohesion' in props && props.cohesion !== undefined && (
              <Text style={{ fontSize: '11px' }}>
                粘聚力: {props.cohesion} kPa
              </Text>
            )}
            {'frictionAngle' in props && props.frictionAngle !== undefined && (
              <Text style={{ fontSize: '11px' }}>
                内摩擦角: {props.frictionAngle}°
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: '可靠性',
      dataIndex: 'reliability',
      key: 'reliability',
      width: 100,
      render: (reliability: string) => {
        const reliabilityConfig = {
          'code': { color: 'green', text: '规范' },
          'standard': { color: 'blue', text: '标准' },
          'literature': { color: 'orange', text: '文献' },
          'empirical': { color: 'yellow', text: '经验' },
          'experimental': { color: 'red', text: '试验' }
        };
        const config = reliabilityConfig[reliability as keyof typeof reliabilityConfig];
        return <Tag color={config?.color}>{config?.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      fixed: 'right' as const,
      render: (_, record: GeotechnicalMaterial) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              size="small"
              icon={<InfoCircleOutlined />}
              onClick={() => handleViewMaterial(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditMaterial(record)}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyMaterial(record)}
            />
          </Tooltip>
          {!record.validated && (
            <Tooltip title="验证">
              <Button
                size="small"
                icon={<ExperimentOutlined />}
                onClick={() => handleValidateMaterial(record.id)}
              />
            </Tooltip>
          )}
          {record.status !== 'approved' && (
            <Popconfirm
              title="确定删除此材料吗？"
              onConfirm={() => handleDeleteMaterial(record.id)}
              okText="删除"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  // 渲染搜索面板
  const renderSearchPanel = () => (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Form
        form={searchForm}
        layout="inline"
        onFinish={handleSearch}
        style={{ marginBottom: showAdvancedSearch ? 16 : 0 }}
      >
        <Form.Item name="keyword">
          <Search
            placeholder="搜索材料名称、描述或标签"
            style={{ width: 300 }}
            onSearch={() => searchForm.submit()}
          />
        </Form.Item>
        <Form.Item>
          <Button
            type={showAdvancedSearch ? 'primary' : 'default'}
            icon={<FilterOutlined />}
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
          >
            高级搜索
          </Button>
        </Form.Item>
        <Form.Item>
          <Button onClick={handleResetSearch}>
            重置
          </Button>
        </Form.Item>
      </Form>

      {showAdvancedSearch && (
        <Form form={searchForm} layout="vertical" onFinish={handleSearch}>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="材料类型" name="type">
                <Select mode="multiple" placeholder="选择材料类型">
                  {materialTypeOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="本构模型" name="constitutiveModel">
                <Select mode="multiple" placeholder="选择本构模型">
                  {constitutiveModelOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="验证状态" name="validated">
                <Select placeholder="选择验证状态">
                  <Option value={true}>已验证</Option>
                  <Option value={false}>未验证</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item>
                <Space style={{ marginTop: 32 }}>
                  <Button type="primary" htmlType="submit">
                    搜索
                  </Button>
                  <Button onClick={handleResetSearch}>
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      )}
    </Card>
  );

  // 渲染统计信息
  const renderStatistics = () => (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col span={6}>
        <Card size="small">
          <Statistic
            title="材料总数"
            value={statistics.totalMaterials}
            prefix={<BookOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small">
          <Statistic
            title="已验证"
            value={statistics.validatedMaterials}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small">
          <Statistic
            title="使用次数"
            value={statistics.totalUsage}
            prefix={<BarChartOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small">
          <Statistic
            title="材料库数"
            value={statistics.totalLibraries}
            prefix={<ExperimentOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>
          <ExperimentOutlined style={{ marginRight: '8px' }} />
          岩土工程材料库
        </Title>
        <Paragraph style={{ marginTop: '8px', color: 'rgba(0, 0, 0, 0.65)' }}>
          专业的岩土工程有限元材料参数管理系统，支持多种本构模型和材料验证
        </Paragraph>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ background: '#fff' }}>
        <TabPane tab="材料管理" key="materials">
          {renderSearchPanel()}
          {renderStatistics()}
          
          <Card
            title="材料列表"
            extra={
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddMaterial}
                >
                  添加材料
                </Button>
                <Button icon={<ImportOutlined />}>
                  导入
                </Button>
                <Button icon={<ExportOutlined />}>
                  导出
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadMaterials}
                  loading={loading}
                >
                  刷新
                </Button>
              </Space>
            }
          >
            <Table
              columns={columns}
              dataSource={materials}
              rowKey="id"
              loading={loading}
              size="small"
              scroll={{ x: 1200 }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 个材料`
              }}
              rowSelection={mode === 'select' ? {
                selectedRowKeys: selectedMaterialIds,
                onSelect: (record, selected) => {
                  if (selected && onMaterialSelect) {
                    onMaterialSelect(record);
                  }
                }
              } : undefined}
            />
          </Card>
        </TabPane>

        <TabPane tab="统计分析" key="statistics">
          <Card title="材料分布统计">
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="按材料类型分布">
                  {Object.entries(statistics.materialsByType).map(([type, count]) => {
                    const typeInfo = materialTypeOptions.find(t => t.value === type);
                    return (
                      <div key={type} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{typeInfo?.label}: {count}</span>
                          <Progress
                            percent={((count as number) / statistics.totalMaterials) * 100}
                            size="small"
                            style={{ width: 100 }}
                            showInfo={false}
                          />
                        </div>
                      </div>
                    );
                  })}
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="按可靠性分布">
                  {Object.entries(statistics.materialsByReliability).map(([reliability, count]) => (
                    <div key={reliability} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{reliability}: {count}</span>
                        <Progress
                          percent={((count as number) / statistics.totalMaterials) * 100}
                          size="small"
                          style={{ width: 100 }}
                          showInfo={false}
                        />
                      </div>
                    </div>
                  ))}
                </Card>
              </Col>
            </Row>
          </Card>
        </TabPane>
      </Tabs>

      {/* 材料编辑模态框 */}
      <Modal
        title={editingMaterial ? "编辑材料" : "添加材料"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={900}
        destroyOnClose
      >
        <MaterialEditForm
          form={form}
          onFinish={handleSaveMaterial}
          onCancel={() => setModalVisible(false)}
          initialValues={editingMaterial}
          materialTypeOptions={materialTypeOptions}
          constitutiveModelOptions={constitutiveModelOptions}
        />
      </Modal>

      {/* 材料详情模态框 */}
      <Modal
        title="材料详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedMaterial && (
          <MaterialDetailView material={selectedMaterial} />
        )}
      </Modal>
    </div>
  );
};

// 材料编辑表单组件
const MaterialEditForm: React.FC<{
  form: any;
  onFinish: (values: any) => void;
  onCancel: () => void;
  initialValues?: GeotechnicalMaterial | null;
  materialTypeOptions: any[];
  constitutiveModelOptions: any[];
}> = ({ form, onFinish, onCancel, initialValues, materialTypeOptions, constitutiveModelOptions }) => {
  const [selectedType, setSelectedType] = useState<GeotechnicalMaterialType | undefined>(
    initialValues?.type
  );
  const [selectedModel, setSelectedModel] = useState<ConstitutiveModel | undefined>(
    initialValues?.constitutiveModel
  );

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={initialValues || undefined}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="材料名称"
            name="name"
            rules={[{ required: true, message: '请输入材料名称' }]}
          >
            <Input placeholder="请输入材料名称" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="材料类型"
            name="type"
            rules={[{ required: true, message: '请选择材料类型' }]}
          >
            <Select
              placeholder="选择材料类型"
              onChange={setSelectedType}
            >
              {materialTypeOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="本构模型"
            name="constitutiveModel"
            rules={[{ required: true, message: '请选择本构模型' }]}
          >
            <Select
              placeholder="选择本构模型"
              onChange={setSelectedModel}
            >
              {constitutiveModelOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  <div>
                    <div>{option.label}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {option.description}
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="可靠性等级"
            name="reliability"
            rules={[{ required: true, message: '请选择可靠性等级' }]}
          >
            <Select placeholder="选择可靠性等级">
              <Option value="code">规范</Option>
              <Option value="standard">标准</Option>
              <Option value="literature">文献</Option>
              <Option value="empirical">经验</Option>
              <Option value="experimental">试验</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="材料描述" name="description">
        <TextArea
          rows={3}
          placeholder="请输入材料描述、适用条件等信息..."
        />
      </Form.Item>

      {/* 基本属性参数 */}
      <Card title="基本属性" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="密度 (kg/m³)"
              name={['properties', 'density']}
              rules={[{ required: true, message: '请输入密度' }]}
            >
              <InputNumber
                min={1000}
                max={5000}
                style={{ width: '100%' }}
                placeholder="1800"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="重度 (kN/m³)"
              name={['properties', 'unitWeight']}
            >
              <InputNumber
                min={10}
                max={50}
                step={0.1}
                style={{ width: '100%' }}
                placeholder="18.0"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="泊松比"
              name={['properties', 'poissonRatio']}
              rules={[{ required: true, message: '请输入泊松比' }]}
            >
              <InputNumber
                min={0}
                max={0.5}
                step={0.01}
                style={{ width: '100%' }}
                placeholder="0.30"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="弹性模量 (kPa)"
              name={['properties', 'elasticModulus']}
              rules={[{ required: true, message: '请输入弹性模量' }]}
            >
              <InputNumber
                min={100}
                max={100000000}
                style={{ width: '100%' }}
                placeholder="20000"
              />
            </Form.Item>
          </Col>
          {selectedType && [GeotechnicalMaterialType.CLAY, GeotechnicalMaterialType.SAND, GeotechnicalMaterialType.SILT].includes(selectedType) && (
            <>
              <Col span={8}>
                <Form.Item
                  label="粘聚力 (kPa)"
                  name={['properties', 'cohesion']}
                >
                  <InputNumber
                    min={0}
                    max={1000}
                    style={{ width: '100%' }}
                    placeholder="20"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="内摩擦角 (°)"
                  name={['properties', 'frictionAngle']}
                >
                  <InputNumber
                    min={0}
                    max={50}
                    style={{ width: '100%' }}
                    placeholder="25"
                  />
                </Form.Item>
              </Col>
            </>
          )}
        </Row>

        {selectedType && [GeotechnicalMaterialType.CLAY, GeotechnicalMaterialType.SAND, GeotechnicalMaterialType.SILT].includes(selectedType) && (
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="渗透系数 (m/s)"
                name={['properties', 'permeability']}
              >
                <InputNumber
                  min={1e-12}
                  max={1e-2}
                  step={1e-9}
                  style={{ width: '100%' }}
                  placeholder="1e-8"
                  formatter={value => `${value}`.includes('e') ? `${value}` : `${Number(value).toExponential(2)}`}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="剪胀角 (°)"
                name={['properties', 'dilatancyAngle']}
              >
                <InputNumber
                  min={0}
                  max={30}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>
        )}
      </Card>

      <div style={{ textAlign: 'right' }}>
        <Space>
          <Button onClick={onCancel}>
            取消
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
          >
            保存
          </Button>
        </Space>
      </div>
    </Form>
  );
};

// 材料详情查看组件
const MaterialDetailView: React.FC<{
  material: GeotechnicalMaterial;
}> = ({ material }) => {
  const materialTypeInfo = materialTypeOptions.find(t => t.value === material.type);
  const modelInfo = constitutiveModelOptions.find(m => m.value === material.constitutiveModel);

  return (
    <div>
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="材料名称">{material.name}</Descriptions.Item>
        <Descriptions.Item label="材料类型">
          <Tag color={materialTypeInfo?.color}>{materialTypeInfo?.label}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="本构模型">{modelInfo?.label}</Descriptions.Item>
        <Descriptions.Item label="可靠性等级">
          <Tag>{material.reliability}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={getStatusColor(material.status)}>{getStatusText(material.status)}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="验证状态">
          {material.validated ? (
            <Tag color="green"><CheckCircleOutlined /> 已验证</Tag>
          ) : (
            <Tag color="orange"><ExclamationCircleOutlined /> 未验证</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="创建时间" span={2}>
          {material.created.toLocaleString()}
        </Descriptions.Item>
        <Descriptions.Item label="修改时间" span={2}>
          {material.modified.toLocaleString()}
        </Descriptions.Item>
        <Descriptions.Item label="描述" span={2}>
          {material.description || '无'}
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      <Title level={5}>材料参数</Title>
      <Descriptions bordered size="small" column={3}>
        <Descriptions.Item label="密度">{material.properties.density} kg/m³</Descriptions.Item>
        <Descriptions.Item label="重度">{material.properties.unitWeight || '-'} kN/m³</Descriptions.Item>
        <Descriptions.Item label="泊松比">{material.properties.poissonRatio}</Descriptions.Item>
        <Descriptions.Item label="弹性模量">{formatNumber(material.properties.elasticModulus)} kPa</Descriptions.Item>
        
        {'cohesion' in material.properties && material.properties.cohesion !== undefined && (
          <Descriptions.Item label="粘聚力">{material.properties.cohesion} kPa</Descriptions.Item>
        )}
        
        {'frictionAngle' in material.properties && material.properties.frictionAngle !== undefined && (
          <Descriptions.Item label="内摩擦角">{material.properties.frictionAngle}°</Descriptions.Item>
        )}
        
        {'permeability' in material.properties && material.properties.permeability !== undefined && (
          <Descriptions.Item label="渗透系数">{material.properties.permeability} m/s</Descriptions.Item>
        )}
      </Descriptions>

      {material.tags && material.tags.length > 0 && (
        <>
          <Divider />
          <Title level={5}>标签</Title>
          <Space wrap>
            {material.tags.map(tag => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Space>
        </>
      )}
    </div>
  );
};

// 工具函数
const getStatusColor = (status: string): string => {
  const colorMap = {
    'draft': 'orange',
    'review': 'blue',
    'approved': 'green',
    'archived': 'gray'
  };
  return colorMap[status as keyof typeof colorMap] || 'default';
};

const getStatusText = (status: string): string => {
  const textMap = {
    'draft': '草稿',
    'review': '审核中',
    'approved': '已批准',
    'archived': '已归档'
  };
  return textMap[status as keyof typeof textMap] || status;
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

export default GeotechnicalMaterialLibrary;