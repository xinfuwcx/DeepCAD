import React, { useState } from 'react';
import { Space, Row, Col, Typography, Collapse, Switch, Select, Alert, Card } from 'antd';
import { SafetyOutlined, CheckCircleOutlined, BuildOutlined, BranchesOutlined, AimOutlined, TableOutlined } from '@ant-design/icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SupportParamsSchema, type SupportParams } from '../../schemas';
import { GlassCard, GlassButton } from '../ui/GlassComponents';
import { FormInputNumber, FormSelect, FormGroup } from '../forms';

const { Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

interface SupportModuleProps {
  params: SupportParams;
  onParamsChange: (category: string, key: string, value: any) => void;
  onGenerate: (validatedData: SupportParams) => void;
  status: 'wait' | 'process' | 'finish' | 'error';
  disabled: boolean;
}

const SupportModule: React.FC<SupportModuleProps> = ({ 
  params, 
  onParamsChange, 
  onGenerate, 
  status,
  disabled 
}) => {
  const [activePanel, setActivePanel] = useState<string | string[]>(['diaphragm']);

  // React Hook Form with Zod validation
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue
  } = useForm<SupportParams>({
    resolver: zodResolver(SupportParamsSchema),
    defaultValues: params,
    mode: 'onChange'
  });

  // Watch form values to sync with parent component
  const watchedValues = watch();
  React.useEffect(() => {
    Object.entries(watchedValues).forEach(([category, categoryValues]) => {
      if (typeof categoryValues === 'object' && categoryValues !== null) {
        Object.entries(categoryValues).forEach(([key, value]) => {
          if (value !== undefined && value !== params[category as keyof SupportParams][key as keyof any]) {
            onParamsChange(category, key, value);
          }
        });
      }
    });
  }, [watchedValues, onParamsChange, params]);

  // Form submission handler
  const onSubmit = (data: SupportParams) => {
    onGenerate(data);
  };

  // Validation helper
  const getFieldError = (category: keyof SupportParams, fieldName: string) => {
    return errors[category]?.[fieldName as keyof any]?.message;
  };

  const calculateSupportStats = () => {
    const enabledComponents = Object.values(params).filter(p => p.enabled).length;
    let totalLength = 0;
    let materialTypes = new Set();

    if (params.diaphragmWall.enabled) {
      totalLength += 500; // 假设周长500m
      materialTypes.add('混凝土');
    }
    if (params.pilePile.enabled) {
      totalLength += params.pilePile.length * 50; // 假设50根桩
      materialTypes.add('混凝土');
    }
    if (params.anchor.enabled) {
      totalLength += params.anchor.length * 20; // 假设20根锚杆
      materialTypes.add('钢材');
    }
    if (params.steelSupport.enabled) {
      totalLength += 200 * params.steelSupport.layers; // 每层200m
      materialTypes.add('钢材');
    }

    return {
      components: enabledComponents,
      totalLength: (totalLength / 1000).toFixed(1), // 转换为km
      materials: materialTypes.size
    };
  };

  const stats = calculateSupportStats();

  return (
    <div className="p-4">
      <Space direction="vertical" className="w-full" size="middle">
          {/* 标题区域 */}
          <div className="text-center">
            <SafetyOutlined className="text-xl text-warning mr-2" />
            <Text strong className="text-lg">支护结构设计</Text>
          </div>

        {/* 前置条件检查 */}
        {disabled && (
          <Alert
            message="请先完成基坑开挖"
            description="支护结构设计需要基于已生成的开挖体进行"
            type="warning"
            showIcon
          />
        )}

        {/* 支护统计概览 */}
        <GlassCard variant="subtle" className="p-4">
          <Row gutter={16}>
            <Col span={8}>
              <div className="text-center">
                <div className="text-lg font-bold text-warning">
                  {stats.components}
                </div>
                <div className="text-xs text-secondary">支护类型</div>
              </div>
            </Col>
            <Col span={8}>
              <div className="text-center">
                <div className="text-lg font-bold text-success">
                  {stats.totalLength} km
                </div>
                <div className="text-xs text-secondary">总长度</div>
              </div>
            </Col>
            <Col span={8}>
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {stats.materials}
                </div>
                <div className="text-xs text-secondary">材料类型</div>
              </div>
            </Col>
          </Row>
        </GlassCard>

        {/* 支护结构配置 */}
        <Collapse 
          ghost 
          activeKey={activePanel} 
          onChange={setActivePanel}
        >
          {/* 地连墙 */}
          <Panel 
            header={
              <div className="flex justify-between items-center">
                <span>
                  <BuildOutlined className="mr-2 text-primary" />
                  地下连续墙
                </span>
                <Controller
                  name="diaphragmWall.enabled"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      {...field}
                      size="small"
                      checked={field.value}
                      disabled={disabled}
                      onClick={(checked, e) => e.stopPropagation()}
                    />
                  )}
                />
              </div>
            } 
            key="diaphragm"
          >
            {params.diaphragmWall.enabled && (
              <FormGroup title="地连墙参数">
                <Row gutter={16}>
                  <Col span={12}>
                    <FormInputNumber<SupportParams>
                      name="diaphragmWall.thickness"
                      control={control}
                      label="墙体厚度"
                      unit="m"
                      min={0.6}
                      max={2.0}
                      step={0.1}
                      placeholder="1.2"
                      disabled={disabled}
                      required
                    />
                  </Col>
                  <Col span={12}>
                    <FormInputNumber<SupportParams>
                      name="diaphragmWall.depth"
                      control={control}
                      label="入土深度"
                      unit="m"
                      min={5}
                      max={80}
                      step={0.1}
                      placeholder="25"
                      disabled={disabled}
                      required
                    />
                  </Col>
                </Row>
                <div className="space-y-2">
                  <Text className="text-sm font-medium">混凝土等级</Text>
                  <Select
                    className="w-full"
                    defaultValue="C30"
                    disabled={disabled}
                  >
                    <Option value="C25">C25</Option>
                    <Option value="C30">C30</Option>
                    <Option value="C35">C35</Option>
                    <Option value="C40">C40</Option>
                  </Select>
                </div>
              </FormGroup>
            )}
          </Panel>
          
          {/* 排桩结构 */}
          <Panel 
            header={
              <div className="flex justify-between items-center">
                <span>
                  <BranchesOutlined className="mr-2 text-success" />
                  排桩结构
                </span>
                <Controller
                  name="pilePile.enabled"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      {...field}
                      size="small"
                      checked={field.value}
                      disabled={disabled}
                      onClick={(checked, e) => e.stopPropagation()}
                    />
                  )}
                />
              </div>
            } 
            key="pile"
          >
            {params.pilePile.enabled && (
              <FormGroup title="排桩参数">
                <Row gutter={16}>
                  <Col span={12}>
                    <FormInputNumber<SupportParams>
                      name="pilePile.diameter"
                      control={control}
                      label="桩径"
                      unit="m"
                      min={0.5}
                      max={3.0}
                      step={0.1}
                      disabled={disabled}
                    />
                  </Col>
                  <Col span={12}>
                    <FormInputNumber<SupportParams>
                      name="pilePile.spacing"
                      control={control}
                      label="桩距"
                      unit="m"
                      min={0.8}
                      max={5.0}
                      step={0.1}
                      disabled={disabled}
                    />
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <FormInputNumber<SupportParams>
                      name="pilePile.length"
                      control={control}
                      label="桩长"
                      unit="m"
                      min={10}
                      max={40}
                      disabled={disabled}
                    />
                  </Col>
                  <Col span={12}>
                    <FormInputNumber<SupportParams>
                      name="pilePile.embedDepth"
                      control={control}
                      label="嵌固深度"
                      unit="m"
                      min={2}
                      max={15}
                      disabled={disabled}
                    />
                  </Col>
                </Row>
                <div className="space-y-2">
                  <Text className="text-sm font-medium">排桩类型</Text>
                  <Select
                    className="w-full"
                    defaultValue="drill_pile"
                    disabled={disabled}
                  >
                    <Option value="drill_pile">钻孔灌注桩</Option>
                    <Option value="precast_pile">预制桩</Option>
                    <Option value="steel_pipe">钢管桩</Option>
                    <Option value="mixing_pile">搅拌桩</Option>
                  </Select>
                </div>
              </FormGroup>
            )}
          </Panel>
          
          {/* 锚杆系统 */}
          <Panel 
            header={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  <AimOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
                  锚杆系统
                </span>
                <Switch
                  size="small"
                  checked={params.anchor.enabled}
                  onChange={(checked) => onParamsChange('anchor', 'enabled', checked)}
                  disabled={disabled}
                  onClick={(checked, e) => e.stopPropagation()}
                />
              </div>
            } 
            key="anchor"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {params.anchor.enabled && (
                <>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text>锚杆长度 (m)</Text>
                      <InputNumber
                        style={{ width: '100%', marginTop: '4px' }}
                        min={5}
                        max={30}
                        value={params.anchor.length}
                        onChange={(value) => onParamsChange('anchor', 'length', value)}
                        disabled={disabled}
                      />
                    </Col>
                    <Col span={12}>
                      <Text>倾斜角度 (°)</Text>
                      <InputNumber
                        style={{ width: '100%', marginTop: '4px' }}
                        min={0}
                        max={45}
                        value={params.anchor.angle}
                        onChange={(value) => onParamsChange('anchor', 'angle', value)}
                        disabled={disabled}
                      />
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text>水平间距 (m)</Text>
                      <InputNumber
                        style={{ width: '100%', marginTop: '4px' }}
                        min={1}
                        max={10}
                        step={0.5}
                        value={params.anchor.hSpacing}
                        onChange={(value) => onParamsChange('anchor', 'hSpacing', value)}
                        disabled={disabled}
                      />
                    </Col>
                    <Col span={12}>
                      <Text>竖向间距 (m)</Text>
                      <InputNumber
                        style={{ width: '100%', marginTop: '4px' }}
                        min={1}
                        max={10}
                        step={0.5}
                        value={params.anchor.vSpacing}
                        onChange={(value) => onParamsChange('anchor', 'vSpacing', value)}
                        disabled={disabled}
                      />
                    </Col>
                  </Row>
                  <div>
                    <Text>锚杆类型</Text>
                    <Select
                      style={{ width: '100%', marginTop: '4px' }}
                      defaultValue="prestressed"
                      disabled={disabled}
                    >
                      <Option value="prestressed">预应力锚杆</Option>
                      <Option value="passive">被动式锚杆</Option>
                      <Option value="grouted">注浆锚杆</Option>
                      <Option value="expandable">可扩张锚杆</Option>
                    </Select>
                  </div>
                </>
              )}
            </Space>
          </Panel>
          
          {/* 钢支撑 */}
          <Panel 
            header={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  <TableOutlined style={{ marginRight: '8px', color: '#fa541c' }} />
                  钢支撑系统
                </span>
                <Switch
                  size="small"
                  checked={params.steelSupport.enabled}
                  onChange={(checked) => onParamsChange('steelSupport', 'enabled', checked)}
                  disabled={disabled}
                  onClick={(checked, e) => e.stopPropagation()}
                />
              </div>
            } 
            key="steel"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {params.steelSupport.enabled && (
                <>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text>支撑层数</Text>
                      <InputNumber
                        style={{ width: '100%', marginTop: '4px' }}
                        min={1}
                        max={6}
                        value={params.steelSupport.layers}
                        onChange={(value) => onParamsChange('steelSupport', 'layers', value)}
                        disabled={disabled}
                      />
                    </Col>
                    <Col span={12}>
                      <Text>层间距 (m)</Text>
                      <InputNumber
                        style={{ width: '100%', marginTop: '4px' }}
                        min={2}
                        max={8}
                        step={0.5}
                        value={params.steelSupport.spacing}
                        onChange={(value) => onParamsChange('steelSupport', 'spacing', value)}
                        disabled={disabled}
                      />
                    </Col>
                  </Row>
                  <div>
                    <Text>截面规格</Text>
                    <Select
                      style={{ width: '100%', marginTop: '4px' }}
                      value={params.steelSupport.sectionType}
                      onChange={(value) => onParamsChange('steelSupport', 'sectionType', value)}
                      disabled={disabled}
                    >
                      <Option value="H600x200">H600×200</Option>
                      <Option value="H700x300">H700×300</Option>
                      <Option value="H800x300">H800×300</Option>
                      <Option value="H900x300">H900×300</Option>
                      <Option value="BOX400x400">BOX400×400</Option>
                      <Option value="BOX500x500">BOX500×500</Option>
                    </Select>
                  </div>
                  <div>
                    <Text>预压力 (kN)</Text>
                    <InputNumber
                      style={{ width: '100%', marginTop: '4px' }}
                      min={100}
                      max={2000}
                      step={50}
                      value={params.steelSupport.preload}
                      onChange={(value) => onParamsChange('steelSupport', 'preload', value)}
                      disabled={disabled}
                    />
                  </div>
                </>
              )}
            </Space>
          </Panel>
        </Collapse>
        
        <Divider />
        
        {/* 支护设计验证 */}
        {Object.values(params).some(p => p.enabled) && (
          <div>
            <Text strong>设计验证</Text>
            <div style={{ 
              marginTop: '8px', 
              padding: '12px', 
              background: 'var(--bg-secondary)', 
              borderRadius: '6px' 
            }}>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px' }}>结构冗余度</span>
                  <span style={{ fontSize: '12px', color: '#52c41a' }}>良好</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px' }}>施工可行性</span>
                  <span style={{ fontSize: '12px', color: '#1890ff' }}>可行</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px' }}>成本估算</span>
                  <span style={{ fontSize: '12px', color: '#fa8c16' }}>中等</span>
                </div>
              </Space>
            </div>
          </div>
        )}
        
        {/* 生成按钮 */}
        <GlassButton
          variant="primary"
          size="lg"
          className="w-full"
          loading={status === 'process'}
          disabled={status === 'finish' || disabled || !Object.values(params).some(p => p.enabled) || !isValid}
          htmlType="submit"
          icon={status === 'finish' ? <CheckCircleOutlined /> : <SafetyOutlined />}
        >
          {status === 'finish' ? '支护结构已生成' : 
           status === 'process' ? '正在生成支护结构...' : '生成支护结构'}
        </GlassButton>

        {/* 状态提示 */}
        {status === 'finish' && (
          <Alert
            message="支护结构设计完成"
            description="已成功生成支护结构几何，几何建模流程已全部完成，可进行网格划分"
            type="success"
            showIcon
          />
        )}
        
        {status === 'error' && (
          <Alert
            message="支护结构生成失败"
            description="请检查支护参数设置或启用至少一种支护类型后重试"
            type="error"
            showIcon
          />
        )}
        {/* 生成按钮 */}
        <GlassButton
          variant="primary"
          size="lg"
          className="w-full"
          loading={status === 'process'}
          disabled={status === 'finish' || disabled || !Object.values(params).some(p => p.enabled) || !isValid}
          onClick={handleSubmit(onSubmit)}
          icon={status === 'finish' ? <CheckCircleOutlined /> : <SafetyOutlined />}
        >
          {status === 'finish' ? '支护结构已生成' : 
           status === 'process' ? '正在生成支护结构...' : '生成支护结构'}
        </GlassButton>

        {/* 状态提示 */}
        {status === 'finish' && (
          <Alert
            message="支护结构设计完成"
            description="已成功生成支护结构几何，几何建模流程已全部完成，可进行网格划分"
            type="success"
            showIcon
          />
        )}
        
        {status === 'error' && (
          <Alert
            message="支护结构生成失败"
            description="请检查支护参数设置或启用至少一种支护类型后重试"
            type="error"
            showIcon
          />
        )}
        </Space>
    </div>
  );
};

export default SupportModule;