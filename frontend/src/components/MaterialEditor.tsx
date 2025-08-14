import React, { useState, useEffect } from 'react';
import {
  Modal, Form, Input, Select, InputNumber, Tabs, Card, Row, Col,
  Button, Space, Upload, message, Collapse, Switch, Slider,
  Tag, Tooltip, Alert, Divider
} from 'antd';
import {
  SaveOutlined, PlusOutlined, DeleteOutlined, UploadOutlined,
  ExperimentOutlined, CalculatorOutlined, SettingOutlined,
  InfoCircleOutlined, BulbOutlined, FileExcelOutlined,
  ImportOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { TextArea } = Input;

interface MaterialProperty {
  name: string;
  value: number;
  unit: string;
  description: string;
  required: boolean;
}

interface MaterialEditorProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (material: any) => void;
  material?: any;
  mode: 'create' | 'edit';
}

// 预定义的材料属性配置
const MATERIAL_PROPERTIES: Record<string, MaterialProperty[]> = {
  concrete: [
    { name: 'elasticModulus', value: 30000, unit: 'MPa', description: '弹性模量', required: true },
    { name: 'poissonRatio', value: 0.2, unit: '', description: '泊松比', required: true },
    { name: 'density', value: 2500, unit: 'kg/m³', description: '密度', required: true },
    { name: 'compressiveStrength', value: 30, unit: 'MPa', description: '抗压强度', required: true },
    { name: 'tensileStrength', value: 2.4, unit: 'MPa', description: '抗拉强度', required: false },
    { name: 'thermalExpansion', value: 1e-5, unit: '1/°C', description: '热膨胀系数', required: false }
  ],
  steel: [
    { name: 'elasticModulus', value: 210000, unit: 'MPa', description: '弹性模量', required: true },
    { name: 'poissonRatio', value: 0.3, unit: '', description: '泊松比', required: true },
    { name: 'density', value: 7850, unit: 'kg/m³', description: '密度', required: true },
    { name: 'yieldStrength', value: 400, unit: 'MPa', description: '屈服强度', required: true },
    { name: 'ultimateStrength', value: 540, unit: 'MPa', description: '极限强度', required: false },
    { name: 'thermalExpansion', value: 1.2e-5, unit: '1/°C', description: '热膨胀系数', required: false }
  ],
  soil: [
    { name: 'elasticModulus', value: 50, unit: 'MPa', description: '弹性模量', required: true },
    { name: 'poissonRatio', value: 0.35, unit: '', description: '泊松比', required: true },
    { name: 'density', value: 1800, unit: 'kg/m³', description: '密度', required: true },
    { name: 'cohesion', value: 20, unit: 'kPa', description: '粘聚力', required: true },
    { name: 'frictionAngle', value: 25, unit: '°', description: '内摩擦角', required: true },
    { name: 'permeability', value: 1e-8, unit: 'm/s', description: '渗透系数', required: false }
  ]
};

const MaterialEditor: React.FC<MaterialEditorProps> = ({
  visible,
  onCancel,
  onSave,
  material,
  mode
}) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('basic');
  // 材料类型已移除，统一使用通用材料属性
  const [properties, setProperties] = useState<Record<string, number>>({});
  const [advancedMode, setAdvancedMode] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (material && mode === 'edit') {
      form.setFieldsValue({
        name: material.name,
        description: material.description,
        ...material.parameters
      });
      // 材料类型已移除
      setProperties(material.parameters || {});
    } else {
      // 重置表单为创建模式
      form.resetFields();
      const defaultProps = MATERIAL_PROPERTIES['soil']; // 统一使用土壤材料属性
      const defaultValues = defaultProps.reduce((acc, prop) => {
        acc[prop.name] = prop.value;
        return acc;
      }, {} as Record<string, number>);
      setProperties(defaultValues);
      form.setFieldsValue(defaultValues);
    }
  }, [material, mode, visible, form]);

  const handleTypeChange = (type: string) => {
    setMaterialType(type);
    const defaultProps = MATERIAL_PROPERTIES[type];
    const defaultValues = defaultProps.reduce((acc, prop) => {
      acc[prop.name] = prop.value;
      return acc;
    }, {} as Record<string, number>);
    
    setProperties(defaultValues);
    form.setFieldsValue(defaultValues);
  };

  const handlePropertyChange = (name: string, value: number) => {
    setProperties(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateMaterial = () => {
    const errors: string[] = [];
    const props = MATERIAL_PROPERTIES['soil']; // 统一使用土壤材料属性
    
    props.forEach(prop => {
      if (prop.required && (!properties[prop.name] || properties[prop.name] <= 0)) {
        errors.push(`${prop.description}必须大于0`);
      }
    });

    // 通用验证规则
    if (properties.poissonRatio >= 0.5) {
      errors.push('泊松比应小于0.5');
    }
    
    if (properties.frictionAngle && properties.frictionAngle > 45) {
      errors.push('内摩擦角通常不超过45°');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (!validateMaterial()) {
        message.error('材料参数验证失败，请检查输入');
        return;
      }

      const materialData = {
        id: material?.id || String(Date.now()),
        name: values.name,
        description: values.description,
        parameters: properties,
        createdAt: material?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      onSave(materialData);
      message.success(`材料${mode === 'create' ? '创建' : '更新'}成功`);
    } catch (error) {
      message.error('请填写必要的材料信息');
    }
  };

  const renderPropertyInputs = () => {
    const props = MATERIAL_PROPERTIES['soil']; // 统一使用土壤材料属性
    
    return props.map(prop => (
      <Col span={12} key={prop.name}>
        <Form.Item
          label={
            <Space>
              {prop.description}
              <Tooltip title={`单位: ${prop.unit || '无量纲'}`}>
                <InfoCircleOutlined style={{ color: '#1890ff' }} />
              </Tooltip>
              {prop.required && <span style={{ color: 'red' }}>*</span>}
            </Space>
          }
          name={prop.name}
          rules={[
            { required: prop.required, message: `请输入${prop.description}` },
            { type: 'number', min: 0, message: `${prop.description}必须大于0` }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            step={prop.name === 'poissonRatio' ? 0.01 : 1}
            placeholder={`${prop.description} (${prop.unit})`}
            onChange={(value) => handlePropertyChange(prop.name, typeof value === 'number' ? value : 0)}
          />
        </Form.Item>
      </Col>
    ));
  };

  const renderAdvancedProperties = () => (
    <Card title="高级属性" size="small" style={{ marginTop: '16px' }}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="温度相关">
            <Switch />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="非线性行为">
            <Switch />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item label="损伤模型">
            <Select placeholder="选择损伤模型">
              <Option value="none">无损伤</Option>
              <Option value="isotropic">各向同性损伤</Option>
              <Option value="anisotropic">各向异性损伤</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  return (
    <Modal
      title={
        <Space>
          <BulbOutlined />
          {mode === 'create' ? '创建材料' : '编辑材料'}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="validate" icon={<ExperimentOutlined />} onClick={validateMaterial}>
          验证
        </Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave}>
          保存
        </Button>
      ]}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="基本信息" key="basic">
          <Form form={form} layout="vertical">
            <Form.Item
              label="材料名称"
              name="name"
              rules={[{ required: true, message: '请输入材料名称' }]}
            >
              <Input placeholder="输入材料名称" />
            </Form.Item>

            {/* 材料类型已隐藏 - 默认为土壤类型 */}
            <Form.Item
              name="type"
              style={{ display: 'none' }}
              initialValue="soil"
            >
              <Input type="hidden" />
            </Form.Item>

            <Form.Item label="描述" name="description">
              <TextArea rows={3} placeholder="描述材料的特点和应用场景" />
            </Form.Item>
          </Form>
        </TabPane>

        <TabPane tab="力学参数" key="mechanical">
          <Form form={form} layout="vertical">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span>基本力学参数</span>
              <Space>
                <span>高级模式</span>
                <Switch checked={advancedMode} onChange={setAdvancedMode} />
              </Space>
            </div>

            <Row gutter={16}>
              {renderPropertyInputs()}
            </Row>

            {advancedMode && renderAdvancedProperties()}

            {validationErrors.length > 0 && (
              <Alert
                message="参数验证错误"
                description={
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                }
                type="error"
                showIcon
                style={{ marginTop: '16px' }}
              />
            )}
          </Form>
        </TabPane>

        <TabPane tab="试验数据" key="experimental">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Upload.Dragger style={{ marginBottom: '16px' }}>
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">上传试验数据文件</p>
              <p className="ant-upload-hint">
                支持Excel、CSV格式的试验数据
              </p>
            </Upload.Dragger>
            
            <Alert
              message="试验数据说明"
              description="上传的试验数据将用于校准和验证材料模型参数，确保仿真结果的准确性。"
              type="info"
              showIcon
            />
          </div>
        </TabPane>

        <TabPane tab="预览" key="preview">
          <Card title="材料参数预览" style={{ marginBottom: '16px' }}>
            <Row gutter={16}>
              <Col span={12}>
                <div className="material-preview-section">
                  <h4>基本信息</h4>
                  <p><strong>名称:</strong> {form.getFieldValue('name') || '未设置'}</p>
                  <p><strong>类型:</strong> 通用材料</p>
                  <p><strong>描述:</strong> {form.getFieldValue('description') || '无'}</p>
                </div>
              </Col>
              <Col span={12}>
                <div className="material-preview-section">
                  <h4>关键参数</h4>
                  {Object.entries(properties).slice(0, 3).map(([key, value]) => {
                    const prop = MATERIAL_PROPERTIES['soil'].find(p => p.name === key); // 统一使用土壤材料属性
                    return (
                      <p key={key}>
                        <strong>{prop?.description}:</strong> {value} {prop?.unit}
                      </p>
                    );
                  })}
                </div>
              </Col>
            </Row>
          </Card>

          <Alert
            message="参数检查"
            description={validationErrors.length === 0 ? '所有参数验证通过' : `发现 ${validationErrors.length} 个问题`}
            type={validationErrors.length === 0 ? 'success' : 'warning'}
            showIcon
          />
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default MaterialEditor;