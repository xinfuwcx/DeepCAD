/**
 * 土体计算域表单组件
 * 配置土体本构模型和材料参数
 */

import React, { useEffect, useState } from 'react';
import { Form, Card, Row, Col, Divider, Space, Alert, Collapse, Typography } from 'antd';
import { useSceneStore } from '../../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import { 
  AnimatedInput,
  AnimatedNumberInput, 
  AnimatedSelect, 
  AnimatedButton, 
  FormItemWithTooltip 
} from './FormControls';
import ConstitutiveModelSelector, { ConstitutiveModel } from './ConstitutiveModelSelector';
import { SaveOutlined, ToolOutlined, ExperimentOutlined, SettingOutlined } from '@ant-design/icons';

const { Panel } = Collapse;
const { Text } = Typography;

interface SoilDomainProps {
  component: any;
}

// 土体类型枚举
enum SoilType {
  CLAY = 'clay',
  SAND = 'sand',
  SILT = 'silt',
  ROCK = 'rock',
  MIXED = 'mixed'
}

// 土体分层配置
interface SoilLayer {
  id: string;
  name: string;
  depth_from: number;
  depth_to: number;
  soil_type: SoilType;
  constitutive_model: {
    model: ConstitutiveModel;
    parameters: Record<string, number>;
  };
  physical_properties: {
    unit_weight: number;
    water_content: number;
    void_ratio: number;
    saturation: number;
  };
  enabled: boolean;
}

const SoilDomainForm: React.FC<SoilDomainProps> = ({ component }) => {
  const [form] = Form.useForm();
  const [soilLayers, setSoilLayers] = useState<SoilLayer[]>(
    component.soil_layers || [
      {
        id: '1',
        name: '表层土',
        depth_from: 0,
        depth_to: 5,
        soil_type: SoilType.CLAY,
        constitutive_model: {
          model: ConstitutiveModel.MOHR_COULOMB,
          parameters: {
            young_modulus: 50,
            poisson_ratio: 0.35,
            cohesion: 20,
            friction_angle: 25,
            dilatancy_angle: 8
          }
        },
        physical_properties: {
          unit_weight: 18.5,
          water_content: 25,
          void_ratio: 0.8,
          saturation: 85
        },
        enabled: true
      }
    ]
  );
  const [globalModel, setGlobalModel] = useState<{
    model: ConstitutiveModel;
    parameters: Record<string, number>;
  }>(
    component.global_constitutive_model || {
      model: ConstitutiveModel.MOHR_COULOMB,
      parameters: {
        young_modulus: 50,
        poisson_ratio: 0.35,
        cohesion: 20,
        friction_angle: 25,
        dilatancy_angle: 8
      }
    }
  );
  const [useLayeredModel, setUseLayeredModel] = useState(component.use_layered_model || false);

  const { scene, updateComponent } = useSceneStore(
    useShallow(state => ({
      scene: state.scene,
      updateComponent: state.updateComponent,
    }))
  );

  useEffect(() => {
    form.setFieldsValue({
      domain_name: component.domain_name || '土体计算域',
      use_layered_model: component.use_layered_model || false,
      water_table_depth: component.water_table_depth || 2.0,
      boundary_conditions: component.boundary_conditions || 'fixed_bottom',
    });

    if (component.soil_layers) {
      setSoilLayers(component.soil_layers);
    }
    if (component.global_constitutive_model) {
      setGlobalModel(component.global_constitutive_model);
    }
    setUseLayeredModel(component.use_layered_model || false);
  }, [component, form]);

  const handleSave = () => {
    const values = form.getFieldsValue();
    updateComponent(component.id, {
      ...component,
      ...values,
      soil_layers: soilLayers,
      global_constitutive_model: globalModel,
      use_layered_model: useLayeredModel,
    });
  };

  const addSoilLayer = () => {
    const lastLayer = soilLayers[soilLayers.length - 1];
    const newLayer: SoilLayer = {
      id: String(Date.now()),
      name: `土层 ${soilLayers.length + 1}`,
      depth_from: lastLayer ? lastLayer.depth_to : 0,
      depth_to: (lastLayer ? lastLayer.depth_to : 0) + 5,
      soil_type: SoilType.CLAY,
      constitutive_model: {
        model: ConstitutiveModel.MOHR_COULOMB,
        parameters: {
          young_modulus: 50,
          poisson_ratio: 0.35,
          cohesion: 20,
          friction_angle: 25,
          dilatancy_angle: 8
        }
      },
      physical_properties: {
        unit_weight: 18.5,
        water_content: 25,
        void_ratio: 0.8,
        saturation: 85
      },
      enabled: true
    };
    setSoilLayers([...soilLayers, newLayer]);
  };

  const updateSoilLayer = (id: string, updates: Partial<SoilLayer>) => {
    setSoilLayers(soilLayers.map(layer => 
      layer.id === id ? { ...layer, ...updates } : layer
    ));
  };

  const removeSoilLayer = (id: string) => {
    setSoilLayers(soilLayers.filter(layer => layer.id !== id));
  };

  const getSoilTypeOptions = () => [
    { value: SoilType.CLAY, label: '粘土' },
    { value: SoilType.SAND, label: '砂土' },
    { value: SoilType.SILT, label: '粉土' },
    { value: SoilType.ROCK, label: '岩石' },
    { value: SoilType.MIXED, label: '混合土' }
  ];

  const getBoundaryConditionOptions = () => [
    { value: 'fixed_bottom', label: '底部固定' },
    { value: 'fixed_sides', label: '侧面固定' },
    { value: 'elastic_bottom', label: '底部弹性支撑' },
    { value: 'absorbing_boundary', label: '吸收边界' }
  ];

  return (
    <Form
      form={form}
      layout="vertical"
      className="settings-form"
      initialValues={{
        domain_name: component.domain_name || '土体计算域',
        use_layered_model: component.use_layered_model || false,
        water_table_depth: component.water_table_depth || 2.0,
        boundary_conditions: component.boundary_conditions || 'fixed_bottom',
      }}
    >
      {/* 基本配置 */}
      <div className="form-group">
        <div className="form-group-title">
          <ToolOutlined /> 计算域基本信息
        </div>
        
        <div className="form-row">
          <div className="form-col form-col-6">
            <FormItemWithTooltip 
              label="计算域名称" 
              name="domain_name"
              tooltip="土体计算域的名称标识"
            >
              <AnimatedNumberInput placeholder="输入计算域名称" />
            </FormItemWithTooltip>
          </div>
          
          <div className="form-col form-col-6">
            <FormItemWithTooltip 
              label="地下水位深度" 
              name="water_table_depth"
              tooltip="地下水位距离地表的深度"
            >
              <AnimatedNumberInput 
                min={0} 
                step={0.5} 
                precision={2}
                unit="m" 
              />
            </FormItemWithTooltip>
          </div>
        </div>

        <FormItemWithTooltip 
          label="边界条件类型" 
          name="boundary_conditions"
          tooltip="选择计算域的边界约束条件"
        >
          <AnimatedSelect
            options={getBoundaryConditionOptions()}
            placeholder="选择边界条件"
          />
        </FormItemWithTooltip>
      </div>

      <Divider />

      {/* 本构模型配置 */}
      <div className="form-group">
        <div className="form-group-title">
          <ExperimentOutlined /> 本构模型配置
        </div>

        <Alert
          message="模型选择说明"
          description="可以选择统一本构模型应用于整个土体域，或者按土层分别配置不同的本构模型"
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        <FormItemWithTooltip
          label="分层建模"
          name="use_layered_model"
          tooltip="启用分层建模可以为不同深度的土层设置不同的本构模型"
        >
          <AnimatedSelect
            value={useLayeredModel ? 'layered' : 'uniform'}
            onChange={(value) => {
              const isLayered = value === 'layered';
              setUseLayeredModel(isLayered);
              form.setFieldValue('use_layered_model', isLayered);
            }}
            options={[
              { value: 'uniform', label: '统一模型 - 整个土体使用相同本构模型' },
              { value: 'layered', label: '分层模型 - 不同土层使用不同本构模型' }
            ]}
          />
        </FormItemWithTooltip>

        {!useLayeredModel ? (
          // 统一本构模型
          <Card title="统一本构模型" size="small">
            <ConstitutiveModelSelector
              value={globalModel}
              onChange={setGlobalModel}
              form={form}
            />
          </Card>
        ) : (
          // 分层本构模型
          <Card title="分层本构模型" size="small">
            <Collapse accordion>
              {soilLayers.map((layer, index) => (
                <Panel 
                  header={
                    <Space>
                      <span>{layer.name}</span>
                      <Text type="secondary">
                        {layer.depth_from.toFixed(1)}m - {layer.depth_to.toFixed(1)}m
                      </Text>
                      <Text type="secondary">
                        ({layer.soil_type === SoilType.CLAY ? '粘土' : 
                          layer.soil_type === SoilType.SAND ? '砂土' : 
                          layer.soil_type === SoilType.SILT ? '粉土' : 
                          layer.soil_type === SoilType.ROCK ? '岩石' : '混合土'})
                      </Text>
                    </Space>
                  } 
                  key={layer.id}
                >
                  {/* 土层基本信息 */}
                  <Row gutter={16} style={{ marginBottom: '16px' }}>
                    <Col span={8}>
                      <FormItemWithTooltip
                        label="土层名称"
                        tooltip="土层的名称标识"
                      >
                        <AnimatedInput
                          value={layer.name}
                          onChange={(value) => updateSoilLayer(layer.id, { name: value })}
                          placeholder="土层名称"
                        />
                      </FormItemWithTooltip>
                    </Col>
                    <Col span={8}>
                      <FormItemWithTooltip
                        label="起始深度"
                        tooltip="土层的起始深度"
                      >
                        <AnimatedNumberInput
                          value={layer.depth_from}
                          onChange={(value) => updateSoilLayer(layer.id, { depth_from: value || 0 })}
                          min={0}
                          step={0.5}
                          unit="m"
                        />
                      </FormItemWithTooltip>
                    </Col>
                    <Col span={8}>
                      <FormItemWithTooltip
                        label="结束深度"
                        tooltip="土层的结束深度"
                      >
                        <AnimatedNumberInput
                          value={layer.depth_to}
                          onChange={(value) => updateSoilLayer(layer.id, { depth_to: value || 0 })}
                          min={layer.depth_from}
                          step={0.5}
                          unit="m"
                        />
                      </FormItemWithTooltip>
                    </Col>
                  </Row>

                  <Row gutter={16} style={{ marginBottom: '16px' }}>
                    <Col span={12}>
                      <FormItemWithTooltip
                        label="土体类型"
                        tooltip="选择土体的类型分类"
                      >
                        <AnimatedSelect
                          value={layer.soil_type}
                          onChange={(value) => updateSoilLayer(layer.id, { soil_type: value as SoilType })}
                          options={getSoilTypeOptions()}
                        />
                      </FormItemWithTooltip>
                    </Col>
                    <Col span={12}>
                      <FormItemWithTooltip
                        label="重度"
                        tooltip="土体的天然重度"
                      >
                        <AnimatedNumberInput
                          value={layer.physical_properties.unit_weight}
                          onChange={(value) => updateSoilLayer(layer.id, {
                            physical_properties: {
                              ...layer.physical_properties,
                              unit_weight: value || 18.5
                            }
                          })}
                          min={10}
                          max={30}
                          step={0.1}
                          unit="kN/m³"
                        />
                      </FormItemWithTooltip>
                    </Col>
                  </Row>

                  {/* 本构模型 */}
                  <Divider />
                  <ConstitutiveModelSelector
                    value={layer.constitutive_model}
                    onChange={(value) => updateSoilLayer(layer.id, { constitutive_model: value })}
                  />

                  {/* 删除按钮 */}
                  {soilLayers.length > 1 && (
                    <div style={{ textAlign: 'right', marginTop: '16px' }}>
                      <AnimatedButton 
                        onClick={() => removeSoilLayer(layer.id)}
                        type="text"
                        style={{ color: '#ff4d4f' }}
                      >
                        删除此土层
                      </AnimatedButton>
                    </div>
                  )}
                </Panel>
              ))}
            </Collapse>

            <div style={{ marginTop: '16px' }}>
              <AnimatedButton 
                type="dashed" 
                onClick={addSoilLayer}
                style={{ width: '100%' }}
              >
                添加土层
              </AnimatedButton>
            </div>
          </Card>
        )}
      </div>

      <div className="form-actions">
        <AnimatedButton 
          type="primary" 
          onClick={handleSave}
          icon={<SaveOutlined />}
          className="hover-scale"
        >
          保存配置
        </AnimatedButton>
      </div>
    </Form>
  );
};

export default SoilDomainForm;