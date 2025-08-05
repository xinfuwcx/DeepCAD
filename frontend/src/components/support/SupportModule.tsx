import React, { useState } from 'react';
import { Space, Row, Col, Typography, Collapse, Switch, Select, Alert, Card, InputNumber, Divider, Tabs } from 'antd';
import { SafetyOutlined, CheckCircleOutlined, BuildOutlined, NodeExpandOutlined, AimOutlined, TableOutlined } from '@ant-design/icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SupportParamsSchema, type SupportParams } from '../../schemas';
import { GlassCard, GlassButton } from '../ui/GlassComponents';
import { FormInputNumber, FormSelect, FormGroup } from '../forms';

const { Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;
const { TabPane } = Tabs;

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
      <Tabs defaultActiveKey="wall_anchor" type="card">
                <TabPane 
          tab={<span><SafetyOutlined /> 墙锚体系</span>} 
          key="wall_anchor"
        >
          <div style={{ padding: '16px' }}>
            {/* 地连墙参数 - 计算域样式 */}
            <div style={{ 
              background: 'rgba(0, 90, 140, 0.2)', 
              border: '1px solid rgba(0, 162, 255, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '12px',
                color: '#00a2ff',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                <SafetyOutlined style={{ marginRight: '6px' }} />
                地连墙参数设置
              </div>
              
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <div>
                    <Text style={{ color: '#ffffff', fontSize: '12px' }}>材料</Text>
                    <InputNumber
                      style={{ 
                        width: '100%', 
                        marginTop: '4px',
                        backgroundColor: 'rgba(0, 40, 80, 0.8)',
                        border: '1px solid rgba(0, 162, 255, 0.3)',
                        borderRadius: '4px'
                      }}
                      placeholder="C30"
                      disabled={disabled}
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text style={{ color: '#ffffff', fontSize: '12px' }}>厚度 (mm)</Text>
                    <InputNumber
                      style={{ 
                        width: '100%', 
                        marginTop: '4px',
                        backgroundColor: 'rgba(0, 40, 80, 0.8)',
                        border: '1px solid rgba(0, 162, 255, 0.3)',
                        borderRadius: '4px'
                      }}
                      defaultValue={1200}
                      disabled={disabled}
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text style={{ color: '#ffffff', fontSize: '12px' }}>深度 (m)</Text>
                    <InputNumber
                      style={{ 
                        width: '100%', 
                        marginTop: '4px',
                        backgroundColor: 'rgba(0, 40, 80, 0.8)',
                        border: '1px solid rgba(0, 162, 255, 0.3)',
                        borderRadius: '4px'
                      }}
                      defaultValue={25}
                      disabled={disabled}
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text style={{ color: '#ffffff', fontSize: '12px' }}>网格密度</Text>
                    <InputNumber
                      style={{ 
                        width: '100%', 
                        marginTop: '4px',
                        backgroundColor: 'rgba(0, 40, 80, 0.8)',
                        border: '1px solid rgba(0, 162, 255, 0.3)',
                        borderRadius: '4px'
                      }}
                      placeholder="中等"
                      disabled={disabled}
                    />
                  </div>
                </Col>
              </Row>
            </div>

            {/* 锚杆参数 - 计算域样式 */}
            <div style={{ 
              background: 'rgba(0, 90, 140, 0.2)', 
              border: '1px solid rgba(0, 162, 255, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '12px',
                color: '#00a2ff',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                <AimOutlined style={{ marginRight: '6px' }} />
                锚杆参数设置
              </div>
              
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <div>
                    <Text style={{ color: '#ffffff', fontSize: '12px' }}>锚杆长度 (m)</Text>
                    <InputNumber
                      style={{ 
                        width: '100%', 
                        marginTop: '4px',
                        backgroundColor: 'rgba(0, 40, 80, 0.8)',
                        border: '1px solid rgba(0, 162, 255, 0.3)',
                        borderRadius: '4px'
                      }}
                      defaultValue={15}
                      disabled={disabled}
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text style={{ color: '#ffffff', fontSize: '12px' }}>倾斜角度 (°)</Text>
                    <InputNumber
                      style={{ 
                        width: '100%', 
                        marginTop: '4px',
                        backgroundColor: 'rgba(0, 40, 80, 0.8)',
                        border: '1px solid rgba(0, 162, 255, 0.3)',
                        borderRadius: '4px'
                      }}
                      defaultValue={20}
                      disabled={disabled}
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text style={{ color: '#ffffff', fontSize: '12px' }}>水平间距 (m)</Text>
                    <InputNumber
                      style={{ 
                        width: '100%', 
                        marginTop: '4px',
                        backgroundColor: 'rgba(0, 40, 80, 0.8)',
                        border: '1px solid rgba(0, 162, 255, 0.3)',
                        borderRadius: '4px'
                      }}
                      defaultValue={3.0}
                      disabled={disabled}
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text style={{ color: '#ffffff', fontSize: '12px' }}>竖向间距 (m)</Text>
                    <InputNumber
                      style={{ 
                        width: '100%', 
                        marginTop: '4px',
                        backgroundColor: 'rgba(0, 40, 80, 0.8)',
                        border: '1px solid rgba(0, 162, 255, 0.3)',
                        borderRadius: '4px'
                      }}
                      defaultValue={4.0}
                      disabled={disabled}
                    />
                  </div>
                </Col>
              </Row>
            </div>

            <Divider />


          </div>
        </TabPane>

        <TabPane 
          tab={<span><NodeExpandOutlined /> 桩锚体系</span>} 
          key="pile_anchor"
        >
          <div style={{ padding: '16px' }}>
            {/* 桩参数配置 */}
            <Collapse defaultActiveKey={['1']}>
              <Panel header="桩参数" key="1">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <div>
                        <Text>桩类型</Text>
                        <Select
                          style={{ width: '100%', marginTop: '4px' }}
                          defaultValue="drill_pile"
                          disabled={disabled}
                        >
                          <Option value="drill_pile">钻孔灌注桩</Option>
                          <Option value="precast_pile">预制桩</Option>
                          <Option value="steel_pipe">钢管桩</Option>
                          <Option value="mixing_pile">搅拌桩</Option>
                          <Option value="cast_in_place">现浇桩</Option>
                        </Select>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div>
                        <Text>桩径 (mm)</Text>
                        <InputNumber
                          style={{ width: '100%', marginTop: '4px' }}
                          min={400}
                          max={2000}
                          defaultValue={800}
                          step={50}
                          disabled={disabled}
                        />
                      </div>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <div>
                        <Text>桩长 (m)</Text>
                        <InputNumber
                          style={{ width: '100%', marginTop: '4px' }}
                          min={10}
                          max={50}
                          defaultValue={25}
                          step={1}
                          disabled={disabled}
                        />
                      </div>
                    </Col>
                    <Col span={12}>
                      <div>
                        <Text>桩距 (m)</Text>
                        <InputNumber
                          style={{ width: '100%', marginTop: '4px' }}
                          min={1.0}
                          max={5.0}
                          defaultValue={2.5}
                          step={0.1}
                          disabled={disabled}
                        />
                      </div>
                    </Col>
                  </Row>
                </Space>
              </Panel>

              <Panel header="锚索参数" key="2">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <div>
                        <Text>锚索长度 (m)</Text>
                        <InputNumber
                          style={{ width: '100%', marginTop: '4px' }}
                          min={10}
                          max={40}
                          defaultValue={20}
                          step={1}
                          disabled={disabled}
                        />
                      </div>
                    </Col>
                    <Col span={12}>
                      <div>
                        <Text>倾斜角度 (°)</Text>
                        <InputNumber
                          style={{ width: '100%', marginTop: '4px' }}
                          min={10}
                          max={45}
                          defaultValue={25}
                          step={1}
                          disabled={disabled}
                        />
                      </div>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <div>
                        <Text>预应力 (kN)</Text>
                        <InputNumber
                          style={{ width: '100%', marginTop: '4px' }}
                          min={100}
                          max={1000}
                          defaultValue={300}
                          step={50}
                          disabled={disabled}
                        />
                      </div>
                    </Col>
                    <Col span={12}>
                      <div>
                        <Text>锚索间距 (m)</Text>
                        <InputNumber
                          style={{ width: '100%', marginTop: '4px' }}
                          min={1.5}
                          max={6.0}
                          defaultValue={3.0}
                          step={0.5}
                          disabled={disabled}
                        />
                      </div>
                    </Col>
                  </Row>
                </Space>
              </Panel>

              <Panel header="冠梁参数" key="3">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <div>
                        <Text>冠梁宽度 (mm)</Text>
                        <InputNumber
                          style={{ width: '100%', marginTop: '4px' }}
                          min={800}
                          max={1500}
                          defaultValue={1000}
                          step={50}
                          disabled={disabled}
                        />
                      </div>
                    </Col>
                    <Col span={12}>
                      <div>
                        <Text>冠梁高度 (mm)</Text>
                        <InputNumber
                          style={{ width: '100%', marginTop: '4px' }}
                          min={600}
                          max={1200}
                          defaultValue={800}
                          step={50}
                          disabled={disabled}
                        />
                      </div>
                    </Col>
                  </Row>
                  <div>
                    <Text>混凝土等级</Text>
                    <Select
                      style={{ width: '100%', marginTop: '4px' }}
                      defaultValue="C30"
                      disabled={disabled}
                    >
                      <Option value="C25">C25</Option>
                      <Option value="C30">C30</Option>
                      <Option value="C35">C35</Option>
                      <Option value="C40">C40</Option>
                    </Select>
                  </div>
                </Space>
              </Panel>
            </Collapse>

            <Divider />

            <Alert
              message="设计建议"
              description="桩锚体系适用于软土地区深基坑工程，桩体提供主要支撑，锚索提供水平约束。建议桩径不小于800mm，锚索预应力应根据土压力计算确定。"
              type="info"
              showIcon
            />
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default SupportModule;