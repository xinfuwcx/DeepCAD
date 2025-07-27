/**
 * 土体本构模型选择器组件
 * 提供多种土体本构模型选择和参数配置
 */

import React, { useState, useEffect } from 'react';
import {
  Card, Select, Form, InputNumber, Row, Col, Divider, 
  Alert, Collapse, Tooltip, Space, Tag, Typography
} from 'antd';
import {
  ExperimentOutlined, CalculatorOutlined, InfoCircleOutlined,
  BookOutlined, SettingOutlined
} from '@ant-design/icons';
import { FormItemWithTooltip } from './FormControls';

const { Option } = Select;
const { Panel } = Collapse;
const { Text } = Typography;

// 本构模型枚举
export enum ConstitutiveModel {
  LINEAR_ELASTIC = 'linear_elastic',
  MOHR_COULOMB = 'mohr_coulomb', 
  DRUCKER_PRAGER = 'drucker_prager',
  CAM_CLAY = 'cam_clay',
  HARDENING_SOIL = 'hardening_soil',
  HYPOPLASTIC = 'hypoplastic'
}

// 本构模型参数定义
interface ModelParameter {
  name: string;
  label: string;
  unit: string;
  description: string;
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
  required: boolean;
}

// 本构模型配置
const CONSTITUTIVE_MODELS: Record<ConstitutiveModel, {
  name: string;
  description: string;
  category: string;
  complexity: 'basic' | 'intermediate' | 'advanced';
  parameters: ModelParameter[];
}> = {
  [ConstitutiveModel.LINEAR_ELASTIC]: {
    name: '线弹性模型',
    description: '最简单的土体模型，适用于小变形分析',
    category: '弹性模型',
    complexity: 'basic',
    parameters: [
      {
        name: 'young_modulus',
        label: '弹性模量',
        unit: 'MPa',
        description: '土体的弹性模量，反映土体的刚度',
        defaultValue: 50,
        min: 1,
        max: 1000,
        step: 1,
        required: true
      },
      {
        name: 'poisson_ratio',
        label: '泊松比',
        unit: '',
        description: '泊松比，通常在0.2-0.4之间',
        defaultValue: 0.35,
        min: 0.1,
        max: 0.49,
        step: 0.01,
        required: true
      }
    ]
  },
  [ConstitutiveModel.MOHR_COULOMB]: {
    name: 'Mohr-Coulomb模型',
    description: '经典的土体弹塑性模型，广泛应用于岩土工程',
    category: '弹塑性模型',
    complexity: 'intermediate',
    parameters: [
      {
        name: 'young_modulus',
        label: '弹性模量',
        unit: 'MPa',
        description: '土体的弹性模量',
        defaultValue: 50,
        min: 1,
        max: 1000,
        step: 1,
        required: true
      },
      {
        name: 'poisson_ratio',
        label: '泊松比',
        unit: '',
        description: '泊松比',
        defaultValue: 0.35,
        min: 0.1,
        max: 0.49,
        step: 0.01,
        required: true
      },
      {
        name: 'cohesion',
        label: '粘聚力',
        unit: 'kPa',
        description: '土体的粘聚力',
        defaultValue: 20,
        min: 0,
        max: 200,
        step: 1,
        required: true
      },
      {
        name: 'friction_angle',
        label: '内摩擦角',
        unit: '°',
        description: '土体的内摩擦角',
        defaultValue: 25,
        min: 0,
        max: 50,
        step: 1,
        required: true
      },
      {
        name: 'dilatancy_angle',
        label: '剪胀角',
        unit: '°',
        description: '土体的剪胀角，通常取内摩擦角的1/3',
        defaultValue: 8,
        min: 0,
        max: 30,
        step: 1,
        required: false
      }
    ]
  },
  [ConstitutiveModel.DRUCKER_PRAGER]: {
    name: 'Drucker-Prager模型',
    description: '圆锥形屈服面的弹塑性模型，数值稳定性好',
    category: '弹塑性模型',
    complexity: 'intermediate',
    parameters: [
      {
        name: 'young_modulus',
        label: '弹性模量',
        unit: 'MPa',
        description: '土体的弹性模量',
        defaultValue: 50,
        min: 1,
        max: 1000,
        step: 1,
        required: true
      },
      {
        name: 'poisson_ratio',
        label: '泊松比',
        unit: '',
        description: '泊松比',
        defaultValue: 0.35,
        min: 0.1,
        max: 0.49,
        step: 0.01,
        required: true
      },
      {
        name: 'cohesion',
        label: '粘聚力',
        unit: 'kPa',
        description: '土体的粘聚力',
        defaultValue: 20,
        min: 0,
        max: 200,
        step: 1,
        required: true
      },
      {
        name: 'alpha',
        label: '摩擦参数α',
        unit: '',
        description: 'Drucker-Prager摩擦参数',
        defaultValue: 0.5,
        min: 0,
        max: 2,
        step: 0.01,
        required: true
      }
    ]
  },
  [ConstitutiveModel.CAM_CLAY]: {
    name: 'Cam-Clay模型',
    description: '适用于正常固结粘土的临界状态模型',
    category: '临界状态模型',
    complexity: 'advanced',
    parameters: [
      {
        name: 'lambda',
        label: '压缩指数λ',
        unit: '',
        description: '正常压缩线斜率',
        defaultValue: 0.15,
        min: 0.01,
        max: 1,
        step: 0.01,
        required: true
      },
      {
        name: 'kappa',
        label: '回弹指数κ',
        unit: '',
        description: '卸载-再加载线斜率',
        defaultValue: 0.03,
        min: 0.001,
        max: 0.2,
        step: 0.001,
        required: true
      },
      {
        name: 'M',
        label: '临界状态参数M',
        unit: '',
        description: '临界状态线斜率',
        defaultValue: 1.2,
        min: 0.5,
        max: 2.5,
        step: 0.01,
        required: true
      },
      {
        name: 'nu',
        label: '泊松比',
        unit: '',
        description: '弹性泊松比',
        defaultValue: 0.35,
        min: 0.1,
        max: 0.49,
        step: 0.01,
        required: true
      },
      {
        name: 'pc0',
        label: '初始屈服应力',
        unit: 'kPa',
        description: '初始屈服应力',
        defaultValue: 100,
        min: 10,
        max: 1000,
        step: 10,
        required: true
      }
    ]
  },
  [ConstitutiveModel.HARDENING_SOIL]: {
    name: 'Hardening Soil模型',
    description: '考虑应变硬化的高级土体模型，适用于多种土体类型',
    category: '硬化模型',
    complexity: 'advanced',
    parameters: [
      {
        name: 'E50_ref',
        label: '参考割线模量',
        unit: 'MPa',
        description: '参考围压下的割线模量',
        defaultValue: 30,
        min: 1,
        max: 500,
        step: 1,
        required: true
      },
      {
        name: 'Eoed_ref',
        label: '参考切线模量',
        unit: 'MPa',
        description: '参考围压下的切线模量',
        defaultValue: 30,
        min: 1,
        max: 500,
        step: 1,
        required: true
      },
      {
        name: 'Eur_ref',
        label: '参考卸载模量',
        unit: 'MPa',
        description: '参考围压下的卸载-再加载模量',
        defaultValue: 90,
        min: 10,
        max: 1500,
        step: 10,
        required: true
      },
      {
        name: 'cohesion',
        label: '粘聚力',
        unit: 'kPa',
        description: '土体的粘聚力',
        defaultValue: 20,
        min: 0,
        max: 200,
        step: 1,
        required: true
      },
      {
        name: 'friction_angle',
        label: '内摩擦角',
        unit: '°',
        description: '土体的内摩擦角',
        defaultValue: 25,
        min: 0,
        max: 50,
        step: 1,
        required: true
      },
      {
        name: 'pref',
        label: '参考应力',
        unit: 'kPa',
        description: '参考围压',
        defaultValue: 100,
        min: 10,
        max: 1000,
        step: 10,
        required: true
      },
      {
        name: 'm',
        label: '应力水平指数',
        unit: '',
        description: '应力水平相关指数',
        defaultValue: 0.5,
        min: 0.1,
        max: 1.5,
        step: 0.1,
        required: false
      }
    ]
  },
  [ConstitutiveModel.HYPOPLASTIC]: {
    name: '亚塑性模型',
    description: '基于亚塑性理论的高级土体模型，适用于砂土',
    category: '亚塑性模型',
    complexity: 'advanced',
    parameters: [
      {
        name: 'phi_c',
        label: '临界摩擦角',
        unit: '°',
        description: '临界状态摩擦角',
        defaultValue: 30,
        min: 20,
        max: 45,
        step: 1,
        required: true
      },
      {
        name: 'hs',
        label: '硬化参数',
        unit: '',
        description: '硬化参数',
        defaultValue: 5800,
        min: 1000,
        max: 20000,
        step: 100,
        required: true
      },
      {
        name: 'n',
        label: '压缩指数',
        unit: '',
        description: '压缩指数',
        defaultValue: 0.27,
        min: 0.1,
        max: 1.0,
        step: 0.01,
        required: true
      },
      {
        name: 'ed0',
        label: '最小孔隙比',
        unit: '',
        description: '最小孔隙比',
        defaultValue: 0.53,
        min: 0.3,
        max: 1.5,
        step: 0.01,
        required: true
      },
      {
        name: 'ec0',
        label: '临界孔隙比',
        unit: '',
        description: '临界孔隙比',
        defaultValue: 0.82,
        min: 0.5,
        max: 2.0,
        step: 0.01,
        required: true
      },
      {
        name: 'ei0',
        label: '最大孔隙比',
        unit: '',
        description: '最大孔隙比',
        defaultValue: 1.05,
        min: 0.8,
        max: 3.0,
        step: 0.01,
        required: true
      }
    ]
  }
};

interface ConstitutiveModelSelectorProps {
  value?: {
    model: ConstitutiveModel;
    parameters: Record<string, number>;
  };
  onChange?: (value: {
    model: ConstitutiveModel;
    parameters: Record<string, number>;
  }) => void;
  form?: any;
}

const ConstitutiveModelSelector: React.FC<ConstitutiveModelSelectorProps> = ({
  value,
  onChange,
  form
}) => {
  const [selectedModel, setSelectedModel] = useState<ConstitutiveModel>(
    value?.model || ConstitutiveModel.MOHR_COULOMB
  );
  const [parameters, setParameters] = useState<Record<string, number>>(
    value?.parameters || {}
  );

  // 初始化默认参数
  useEffect(() => {
    const modelConfig = CONSTITUTIVE_MODELS[selectedModel];
    if (modelConfig && Object.keys(parameters).length === 0) {
      const defaultParams = modelConfig.parameters.reduce((acc, param) => {
        acc[param.name] = param.defaultValue;
        return acc;
      }, {} as Record<string, number>);
      setParameters(defaultParams);
    }
  }, [selectedModel, parameters]);

  // 通知父组件值变化
  useEffect(() => {
    if (onChange) {
      onChange({
        model: selectedModel,
        parameters
      });
    }
  }, [selectedModel, parameters, onChange]);

  const handleModelChange = (model: ConstitutiveModel) => {
    setSelectedModel(model);
    
    // 重置参数为新模型的默认值
    const modelConfig = CONSTITUTIVE_MODELS[model];
    const defaultParams = modelConfig.parameters.reduce((acc, param) => {
      acc[param.name] = param.defaultValue;
      return acc;
    }, {} as Record<string, number>);
    
    setParameters(defaultParams);
    
    // 更新表单字段
    if (form) {
      form.setFieldsValue(defaultParams);
    }
  };

  const handleParameterChange = (paramName: string, paramValue: number) => {
    const newParameters = {
      ...parameters,
      [paramName]: paramValue
    };
    setParameters(newParameters);
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'basic': return 'green';
      case 'intermediate': return 'orange';
      case 'advanced': return 'red';
      default: return 'blue';
    }
  };

  const renderModelSelector = () => (
    <Card 
      title={
        <Space>
          <ExperimentOutlined />
          本构模型选择
        </Space>
      }
      size="small"
      style={{ marginBottom: '16px' }}
    >
      <FormItemWithTooltip
        label="本构模型类型"
        tooltip="选择适合土体类型和分析精度要求的本构模型"
      >
        <Select 
          value={selectedModel}
          onChange={handleModelChange}
          style={{ width: '100%' }}
        >
          {Object.entries(CONSTITUTIVE_MODELS).map(([key, config]) => (
            <Option key={key} value={key}>
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <Space>
                  <span>{config.name}</span>
                  <Tag color={getComplexityColor(config.complexity)}>
                    {config.complexity === 'basic' ? '基础' : 
                     config.complexity === 'intermediate' ? '中级' : '高级'}
                  </Tag>
                </Space>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {config.description}
                </Text>
              </Space>
            </Option>
          ))}
        </Select>
      </FormItemWithTooltip>

      {/* 模型信息 */}
      <Alert
        message={CONSTITUTIVE_MODELS[selectedModel].name}
        description={
          <Space direction="vertical" size={4}>
            <Text>{CONSTITUTIVE_MODELS[selectedModel].description}</Text>
            <Space>
              <Text strong>分类:</Text>
              <Tag>{CONSTITUTIVE_MODELS[selectedModel].category}</Tag>
              <Text strong>复杂度:</Text>
              <Tag color={getComplexityColor(CONSTITUTIVE_MODELS[selectedModel].complexity)}>
                {CONSTITUTIVE_MODELS[selectedModel].complexity === 'basic' ? '基础' : 
                 CONSTITUTIVE_MODELS[selectedModel].complexity === 'intermediate' ? '中级' : '高级'}
              </Tag>
            </Space>
          </Space>
        }
        type="info"
        showIcon
        style={{ marginTop: '12px' }}
      />
    </Card>
  );

  const renderParameters = () => {
    const modelConfig = CONSTITUTIVE_MODELS[selectedModel];
    
    return (
      <Card 
        title={
          <Space>
            <CalculatorOutlined />
            模型参数
          </Space>
        }
        size="small"
      >
        <Row gutter={16}>
          {modelConfig.parameters.map((param) => (
            <Col span={12} key={param.name}>
              <FormItemWithTooltip
                label={param.required ? `${param.label} *` : param.label}
                name={param.name}
                tooltip={param.description}
                rules={[
                  { 
                    required: param.required, 
                    message: `请输入${param.label}` 
                  },
                  { 
                    type: 'number', 
                    min: param.min, 
                    max: param.max, 
                    message: `${param.label}应在${param.min}-${param.max}之间` 
                  }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  precision={param.step && param.step < 1 ? 3 : 1}
                  addonAfter={param.unit || undefined}
                  value={parameters[param.name]}
                  onChange={(value) => handleParameterChange(param.name, value || param.defaultValue)}
                />
              </FormItemWithTooltip>
            </Col>
          ))}
        </Row>

        {/* 参数说明 */}
        <Collapse ghost style={{ marginTop: '16px' }}>
          <Panel 
            header={
              <Space>
                <BookOutlined />
                参数说明
              </Space>
            } 
            key="help"
          >
            <div style={{ background: '#fafafa', padding: '12px', borderRadius: '6px' }}>
              {modelConfig.parameters.map((param) => (
                <div key={param.name} style={{ marginBottom: '8px' }}>
                  <Text strong>{param.label} ({param.unit || '无量纲'}):</Text>
                  <br />
                  <Text type="secondary">{param.description}</Text>
                </div>
              ))}
            </div>
          </Panel>
        </Collapse>
      </Card>
    );
  };

  return (
    <div>
      {renderModelSelector()}
      <Divider />
      {renderParameters()}
    </div>
  );
};

export default ConstitutiveModelSelector;
export { ConstitutiveModel as ConstitutiveModelEnum, CONSTITUTIVE_MODELS };