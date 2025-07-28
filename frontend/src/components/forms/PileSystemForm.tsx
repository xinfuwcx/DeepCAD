/**
 * 排桩系统表单组件
 * 支持排桩+冠梁的完整配置
 */

import React, { useState, useEffect } from 'react';
import {
  Form, Card, Row, Col, Divider, Space, InputNumber, Switch, Alert, 
  Select, Tabs, Typography, Tooltip, Button
} from 'antd';
import {
  SaveOutlined, ToolOutlined, AppstoreAddOutlined, 
  ColumnHeightOutlined, BorderBottomOutlined, ProfileOutlined
} from '@ant-design/icons';
import { useSceneStore } from '../../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import { MeshGenerationRequest } from '../../services/meshingService';
import { 
  AnimatedNumberInput, 
  AnimatedSelect, 
  AnimatedButton, 
  FormItemWithTooltip 
} from './FormControls';

const { TabPane } = Tabs;
const { Text } = Typography;

interface PileSystemProps {
  component: any;
  systemConfig?: {
    systemType: 'pile_anchor' | 'diaphragm_anchor';
    pileSystem?: {
      calculationMode: 'beam_calculation' | 'equivalent_shell';
      needsCrownBeam: boolean;
    };
  };
  onCalculationModeChange?: (mode: 'beam_calculation' | 'equivalent_shell') => void;
}

// 冠梁配置接口
interface CrownBeam {
  enabled: boolean;
  width: number;
  height: number;
  top_elevation: number;
  concrete_grade: string;
  reinforcement: {
    main_bars: number;
    stirrups: string;
    spacing: number;
  };
}

// 排桩配置接口
interface PileConfiguration {
  pile_diameter: number;
  pile_spacing: number;
  pile_top_elevation: number;
  pile_bottom_elevation: number;
  pile_type: 'bored' | 'driven' | 'cast_in_place';
  concrete_grade: string;
  reinforcement_ratio: number;
  calculation_mode: 'beam_calculation' | 'equivalent_shell'; // 新增：计算模式
}

const PileSystemForm: React.FC<PileSystemProps> = ({ 
  component, 
  systemConfig, 
  onCalculationModeChange 
}) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('pile');
  
  const [pileConfig, setPileConfig] = useState<PileConfiguration>({
    pile_diameter: component.pile_diameter || 0.8,
    pile_spacing: component.pile_spacing || 1.5,
    pile_top_elevation: component.pile_top_elevation || 0.0,
    pile_bottom_elevation: component.pile_bottom_elevation || -15.0,
    pile_type: component.pile_type || 'bored',
    concrete_grade: component.concrete_grade || 'C30',
    reinforcement_ratio: component.reinforcement_ratio || 0.8,
    calculation_mode: component.calculation_mode || 'beam_calculation' // 默认梁计算模式
  });

  const [crownBeam, setCrownBeam] = useState<CrownBeam>({
    enabled: component.crown_beam?.enabled || true,
    width: component.crown_beam?.width || 1.0,
    height: component.crown_beam?.height || 0.8,
    top_elevation: component.crown_beam?.top_elevation || 0.5,
    concrete_grade: component.crown_beam?.concrete_grade || 'C35',
    reinforcement: {
      main_bars: component.crown_beam?.reinforcement?.main_bars || 8,
      stirrups: component.crown_beam?.reinforcement?.stirrups || 'A10@150',
      spacing: component.crown_beam?.reinforcement?.spacing || 150
    }
  });

  const { scene, updateComponent } = useSceneStore(
    useShallow(state => ({
      scene: state.scene,
      updateComponent: state.updateComponent,
    }))
  );

  // Fragment网格生成API调用
  const callFragmentMeshAPI = async (request: MeshGenerationRequest) => {
    const response = await fetch('/api/meshing/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  };

  const validateFragmentAPI = async (request: MeshGenerationRequest) => {
    const response = await fetch('/api/meshing/validate-fragments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  };

  useEffect(() => {
    form.setFieldsValue({
      ...pileConfig,
      crown_beam: crownBeam
    });
  }, [pileConfig, crownBeam, form]);

  const handleSave = async () => {
    const values = form.getFieldsValue();
    
    // 更新组件配置
    updateComponent(component.id, {
      ...component,
      ...pileConfig,
      crown_beam: crownBeam,
      system_type: 'pile_with_crown_beam'
    });

    // 如果启用了Fragment配置，调用网格生成API
    if (systemConfig?.fragmentConfig?.enable_fragment) {
      try {
        // 生成排桩的Fragment配置
        const pileFragments = [{
          id: `pile_system_${component.id}`,
          name: '排桩支护结构',
          fragment_type: 'structure' as const,
          geometry: {
            type: 'auto_pile_layout' as const,
            geometry: {
              excavation_boundary: systemConfig.fragmentConfig.excavation_geometry?.boundary_points || [],
              pile_diameter: pileConfig.pile_diameter,
              pile_spacing: pileConfig.pile_spacing,
              pile_top_elevation: pileConfig.pile_top_elevation,
              pile_bottom_elevation: pileConfig.pile_bottom_elevation,
              calculation_mode: pileConfig.calculation_mode,
              crown_beam_enabled: crownBeam.enabled
            }
          },
          mesh_properties: {
            element_size: 0.5,
            element_type: 'tetrahedral',
            mesh_density: 'fine'
          },
          enabled: true,
          priority: 2
        }];

        const meshRequest: MeshGenerationRequest = {
          boundingBoxMin: [-25, -25, Math.min(pileConfig.pile_bottom_elevation - 5, -20)],
          boundingBoxMax: [25, 25, Math.max(pileConfig.pile_top_elevation + 5, 5)],
          meshSize: 1.0,
          clientId: `pile_system_${component.id}`,
          enable_fragment: true,
          domain_fragments: [
            // 基坑开挖Fragment
            ...(systemConfig.fragmentConfig.domain_fragments || []),
            // 排桩Fragment
            ...pileFragments
          ],
          global_mesh_settings: {
            element_type: 'tetrahedral',
            default_element_size: 1.0,
            mesh_quality: 'medium',
            mesh_smoothing: true
          }
        };

        console.log('发送Fragment网格生成请求:', meshRequest);
        
        // 验证Fragment配置
        const validation = await validateFragmentAPI(meshRequest);
        if (!validation.is_valid) {
          console.warn('Fragment配置验证失败:', validation.errors);
          // TODO: 显示用户友好的错误信息
        } else {
          // 生成网格
          const meshResult = await callFragmentMeshAPI(meshRequest);
          console.log('Fragment网格生成成功:', meshResult);
          // TODO: 更新UI显示生成结果
        }
      } catch (error) {
        console.error('Fragment网格生成失败:', error);
        // TODO: 显示错误信息给用户
      }
    }
  };

  // 计算桩长
  const calculatePileLength = () => {
    return pileConfig.pile_top_elevation - pileConfig.pile_bottom_elevation;
  };

  // 计算桩间净距
  const calculateClearSpacing = () => {
    return pileConfig.pile_spacing - pileConfig.pile_diameter;
  };

  const getPileTypeOptions = () => [
    { value: 'bored', label: '钻孔灌注桩' },
    { value: 'driven', label: '预制打入桩' },
    { value: 'cast_in_place', label: '现浇桩' }
  ];

  const getConcreteGradeOptions = () => [
    { value: 'C25', label: 'C25' },
    { value: 'C30', label: 'C30' },
    { value: 'C35', label: 'C35' },
    { value: 'C40', label: 'C40' },
    { value: 'C45', label: 'C45' }
  ];

  // 新增：获取计算模式选项
  const getCalculationModeOptions = () => [
    { value: 'beam_calculation', label: '按梁计算（考虑冠梁影响）' },
    { value: 'equivalent_shell', label: '等效壳元计算（不考虑冠梁）' }
  ];

  // 新增：根据体系配置判断是否需要冠梁
  const shouldShowCrownBeam = () => {
    return systemConfig?.pileSystem?.needsCrownBeam ?? (pileConfig.calculation_mode === 'beam_calculation');
  };

  // 处理计算模式变化
  const handleCalculationModeChange = (mode: 'beam_calculation' | 'equivalent_shell') => {
    setPileConfig(prev => ({ ...prev, calculation_mode: mode }));
    onCalculationModeChange?.(mode);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      className="settings-form"
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* 排桩配置 */}
        <TabPane 
          tab={<Space><ColumnHeightOutlined />排桩配置</Space>} 
          key="pile"
        >
          <Card title="桩基参数" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <FormItemWithTooltip
                  label="桩径"
                  tooltip="排桩的直径"
                >
                  <InputNumber
                    value={pileConfig.pile_diameter}
                    onChange={(value) => setPileConfig({...pileConfig, pile_diameter: value || 0.8})}
                    min={0.3}
                    max={3.0}
                    step={0.1}
                    addonAfter="m"
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
              <Col span={12}>
                <FormItemWithTooltip
                  label="桩间距"
                  tooltip="桩心到桩心的距离"
                >
                  <InputNumber
                    value={pileConfig.pile_spacing}
                    onChange={(value) => setPileConfig({...pileConfig, pile_spacing: value || 1.5})}
                    min={pileConfig.pile_diameter + 0.2}
                    max={5.0}
                    step={0.1}
                    addonAfter="m"
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginTop: '16px' }}>
              <Col span={12}>
                <FormItemWithTooltip
                  label="桩顶标高"
                  tooltip="桩顶的绝对标高"
                >
                  <InputNumber
                    value={pileConfig.pile_top_elevation}
                    onChange={(value) => setPileConfig({...pileConfig, pile_top_elevation: value || 0})}
                    min={-50}
                    max={50}
                    step={0.1}
                    addonAfter="m"
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
              <Col span={12}>
                <FormItemWithTooltip
                  label="桩底标高"
                  tooltip="桩底的绝对标高"
                >
                  <InputNumber
                    value={pileConfig.pile_bottom_elevation}
                    onChange={(value) => setPileConfig({...pileConfig, pile_bottom_elevation: value || -15})}
                    min={-100}
                    max={pileConfig.pile_top_elevation - 1}
                    step={0.1}
                    addonAfter="m"
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginTop: '16px' }}>
              <Col span={12}>
                <FormItemWithTooltip
                  label="桩型"
                  tooltip="桩的施工工艺类型"
                >
                  <Select
                    value={pileConfig.pile_type}
                    onChange={(value) => setPileConfig({...pileConfig, pile_type: value})}
                    options={getPileTypeOptions()}
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
              <Col span={12}>
                <FormItemWithTooltip
                  label="混凝土强度"
                  tooltip="桩身混凝土强度等级"
                >
                  <Select
                    value={pileConfig.concrete_grade}
                    onChange={(value) => setPileConfig({...pileConfig, concrete_grade: value})}
                    options={getConcreteGradeOptions()}
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
            </Row>

            {/* 新增：计算模式选择 */}
            <Row gutter={16} style={{ marginTop: '16px' }}>
              <Col span={24}>
                <FormItemWithTooltip
                  label="计算模式"
                  tooltip="选择排桩的计算方式，影响是否需要考虑冠梁"
                >
                  <Select
                    value={pileConfig.calculation_mode}
                    onChange={handleCalculationModeChange}
                    options={getCalculationModeOptions()}
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </Col>
            </Row>

            <FormItemWithTooltip
              label="配筋率"
              tooltip="桩身钢筋配筋率"
              style={{ marginTop: '16px' }}
            >
              <InputNumber
                value={pileConfig.reinforcement_ratio}
                onChange={(value) => setPileConfig({...pileConfig, reinforcement_ratio: value || 0.8})}
                min={0.5}
                max={3.0}
                step={0.1}
                addonAfter="%"
                style={{ width: '100%' }}
              />
            </FormItemWithTooltip>
          </Card>

          <Alert
            message="桩基统计与配置信息"
            description={
              <Space direction="vertical" size={4}>
                <div>桩型: <strong>{getPileTypeOptions().find(opt => opt.value === pileConfig.pile_type)?.label}</strong></div>
                <div>计算模式: <strong>{getCalculationModeOptions().find(opt => opt.value === pileConfig.calculation_mode)?.label}</strong></div>
                <div>桩长: <strong>{calculatePileLength().toFixed(2)} m</strong></div>
                <div>桩间净距: <strong>{calculateClearSpacing().toFixed(2)} m</strong></div>
                <div>长径比: <strong>{(calculatePileLength() / pileConfig.pile_diameter).toFixed(1)}</strong></div>
                <div style={{ color: pileConfig.calculation_mode === 'beam_calculation' ? '#52c41a' : '#1890ff' }}>
                  冠梁需求: <strong>{pileConfig.calculation_mode === 'beam_calculation' ? '需要冠梁' : '不需要冠梁'}</strong>
                </div>
              </Space>
            }
            type="info"
            style={{ marginTop: '16px' }}
          />
        </TabPane>

        {/* 冠梁配置 - 根据计算模式显示 */}
        {shouldShowCrownBeam() && (
          <TabPane 
            tab={<Space><BorderBottomOutlined />冠梁配置</Space>} 
            key="crown"
          >
          <Card title="冠梁参数" size="small">
            <FormItemWithTooltip
              label="启用冠梁"
              tooltip="是否设置冠梁连接排桩"
            >
              <Switch
                checked={crownBeam.enabled}
                onChange={(checked) => setCrownBeam({...crownBeam, enabled: checked})}
                checkedChildren="启用"
                unCheckedChildren="禁用"
              />
            </FormItemWithTooltip>

            {crownBeam.enabled && (
              <>
                <Divider />
                <Row gutter={16}>
                  <Col span={8}>
                    <FormItemWithTooltip
                      label="冠梁宽度"
                      tooltip="冠梁的横截面宽度"
                    >
                      <InputNumber
                        value={crownBeam.width}
                        onChange={(value) => setCrownBeam({...crownBeam, width: value || 1.0})}
                        min={0.3}
                        max={3.0}
                        step={0.1}
                        addonAfter="m"
                        style={{ width: '100%' }}
                      />
                    </FormItemWithTooltip>
                  </Col>
                  <Col span={8}>
                    <FormItemWithTooltip
                      label="冠梁高度"
                      tooltip="冠梁的横截面高度"
                    >
                      <InputNumber
                        value={crownBeam.height}
                        onChange={(value) => setCrownBeam({...crownBeam, height: value || 0.8})}
                        min={0.3}
                        max={2.0}
                        step={0.1}
                        addonAfter="m"
                        style={{ width: '100%' }}
                      />
                    </FormItemWithTooltip>
                  </Col>
                  <Col span={8}>
                    <FormItemWithTooltip
                      label="顶面标高"
                      tooltip="冠梁顶面的绝对标高"
                    >
                      <InputNumber
                        value={crownBeam.top_elevation}
                        onChange={(value) => setCrownBeam({...crownBeam, top_elevation: value || 0.5})}
                        min={pileConfig.pile_top_elevation}
                        max={50}
                        step={0.1}
                        addonAfter="m"
                        style={{ width: '100%' }}
                      />
                    </FormItemWithTooltip>
                  </Col>
                </Row>

                <Row gutter={16} style={{ marginTop: '16px' }}>
                  <Col span={12}>
                    <FormItemWithTooltip
                      label="混凝土强度"
                      tooltip="冠梁混凝土强度等级"
                    >
                      <Select
                        value={crownBeam.concrete_grade}
                        onChange={(value) => setCrownBeam({...crownBeam, concrete_grade: value})}
                        options={getConcreteGradeOptions()}
                        style={{ width: '100%' }}
                      />
                    </FormItemWithTooltip>
                  </Col>
                  <Col span={12}>
                    <FormItemWithTooltip
                      label="主筋数量"
                      tooltip="冠梁主筋的根数"
                    >
                      <InputNumber
                        value={crownBeam.reinforcement.main_bars}
                        onChange={(value) => setCrownBeam({
                          ...crownBeam, 
                          reinforcement: { ...crownBeam.reinforcement, main_bars: value || 8 }
                        })}
                        min={4}
                        max={20}
                        step={2}
                        addonAfter="根"
                        style={{ width: '100%' }}
                      />
                    </FormItemWithTooltip>
                  </Col>
                </Row>

                <Row gutter={16} style={{ marginTop: '16px' }}>
                  <Col span={12}>
                    <FormItemWithTooltip
                      label="箍筋规格"
                      tooltip="箍筋的规格和间距"
                    >
                      <Select
                        value={crownBeam.reinforcement.stirrups}
                        onChange={(value) => setCrownBeam({
                          ...crownBeam,
                          reinforcement: { ...crownBeam.reinforcement, stirrups: value }
                        })}
                        style={{ width: '100%' }}
                      >
                        <Select.Option value="A8@100">A8@100</Select.Option>
                        <Select.Option value="A8@150">A8@150</Select.Option>
                        <Select.Option value="A10@100">A10@100</Select.Option>
                        <Select.Option value="A10@150">A10@150</Select.Option>
                        <Select.Option value="A12@150">A12@150</Select.Option>
                        <Select.Option value="A12@200">A12@200</Select.Option>
                      </Select>
                    </FormItemWithTooltip>
                  </Col>
                  <Col span={12}>
                    <FormItemWithTooltip
                      label="箍筋间距"
                      tooltip="箍筋的中心间距"
                    >
                      <InputNumber
                        value={crownBeam.reinforcement.spacing}
                        onChange={(value) => setCrownBeam({
                          ...crownBeam,
                          reinforcement: { ...crownBeam.reinforcement, spacing: value || 150 }
                        })}
                        min={100}
                        max={300}
                        step={50}
                        addonAfter="mm"
                        style={{ width: '100%' }}
                      />
                    </FormItemWithTooltip>
                  </Col>
                </Row>
              </>
            )}
          </Card>

          {crownBeam.enabled && (
            <Alert
              message="冠梁信息"
              description={
                <Space direction="vertical" size={4}>
                  <div>截面尺寸: <strong>{crownBeam.width}×{crownBeam.height} m</strong></div>
                  <div>截面面积: <strong>{(crownBeam.width * crownBeam.height).toFixed(3)} m²</strong></div>
                  <div>配筋情况: <strong>{crownBeam.reinforcement.main_bars}根主筋 + {crownBeam.reinforcement.stirrups}</strong></div>
                </Space>
              }
              type="info"
              style={{ marginTop: '16px' }}
            />
          )}
        </TabPane>
        )}

        {/* 截面图 */}
        <TabPane 
          tab={<Space><ProfileOutlined />截面图</Space>} 
          key="section"
        >
          <Card title="排桩+冠梁截面图" size="small">
            <div style={{ 
              width: '100%', 
              height: '400px', 
              border: '1px solid #d9d9d9', 
              borderRadius: '6px',
              background: '#fafafa',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <svg width="380" height="380" viewBox="0 0 380 380">
                {/* 地面线 */}
                <line x1="20" y1="100" x2="360" y2="100" stroke="#8B4513" strokeWidth="2" />
                <text x="25" y="95" fontSize="12" fill="#666">地面 (0.0m)</text>
                
                {/* 冠梁 */}
                {crownBeam.enabled && (
                  <g>
                    <rect 
                      x={190 - (crownBeam.width * 50)} 
                      y={100 - (crownBeam.top_elevation - (crownBeam.top_elevation - crownBeam.height)) * 20} 
                      width={crownBeam.width * 100} 
                      height={crownBeam.height * 20} 
                      fill="#C0C0C0" 
                      stroke="#808080" 
                      strokeWidth="1"
                    />
                    <text x="200" y="85" fontSize="10" fill="#333" textAnchor="middle">
                      冠梁 {crownBeam.width}×{crownBeam.height}m
                    </text>
                  </g>
                )}
                
                {/* 排桩 */}
                {[0, 1, 2].map(i => {
                  const x = 120 + i * (pileConfig.pile_spacing * 40);
                  const pileRadius = pileConfig.pile_diameter * 20;
                  const pileTop = 100 - (pileConfig.pile_top_elevation * 20);
                  const pileLength = calculatePileLength() * 2;
                  
                  return (
                    <g key={i}>
                      <rect 
                        x={x - pileRadius} 
                        y={pileTop} 
                        width={pileRadius * 2} 
                        height={pileLength} 
                        fill="#D3D3D3" 
                        stroke="#696969" 
                        strokeWidth="1"
                      />
                      {i === 1 && (
                        <text x={x} y={pileTop + pileLength + 15} fontSize="10" fill="#333" textAnchor="middle">
                          Φ{pileConfig.pile_diameter}m
                        </text>
                      )}
                    </g>
                  );
                })}
                
                {/* 尺寸标注 */}
                <g stroke="#FF6B6B" strokeWidth="1" fill="#FF6B6B">
                  <line x1="120" y1="350" x2="200" y2="350" markerEnd="url(#arrowhead)" />
                  <line x1="200" y1="350" x2="120" y2="350" markerEnd="url(#arrowhead)" />
                  <text x="160" y="345" fontSize="10" textAnchor="middle">{pileConfig.pile_spacing}m</text>
                </g>
                
                {/* 箭头标记 */}
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                    refX="0" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#FF6B6B" />
                  </marker>
                </defs>
              </svg>
            </div>
          </Card>
        </TabPane>
      </Tabs>

      <div className="form-actions" style={{ marginTop: '24px', textAlign: 'center' }}>
        <AnimatedButton 
          type="primary" 
          onClick={handleSave}
          icon={<SaveOutlined />}
          className="hover-scale"
        >
          保存排桩系统配置
        </AnimatedButton>
      </div>
    </Form>
  );
};

export default PileSystemForm;