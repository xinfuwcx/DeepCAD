import React, { useState } from 'react';
import { Space, Row, Col, Typography, Collapse, Switch, Select, Alert, Card, InputNumber, Divider, Tabs, Form } from 'antd';
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
            {/* 地连墙参数 */}
            <Card
              title="地连墙参数"
              size="small"
              style={{ marginBottom: '16px', borderRadius: '8px' }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item
                    label="材料"
                  >
                    <Select
                      defaultValue="C30"
                      size="large"
                      style={{ width: '100%' }}
                    >
                      <Option value="C20">C20</Option>
                      <Option value="C25">C25</Option>
                      <Option value="C30">C30</Option>
                      <Option value="C35">C35</Option>
                      <Option value="C40">C40</Option>
                      <Option value="C45">C45</Option>
                      <Option value="C50">C50</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="厚度 (mm)"
                  >
                    <InputNumber
                      defaultValue={1200}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="深度 (m)"
                  >
                    <InputNumber
                      defaultValue={25}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="网格密度"
                  >
                    <Select
                      defaultValue="medium"
                      size="large"
                      style={{ width: '100%' }}
                    >
                      <Option value="coarse">粗糙</Option>
                      <Option value="medium">中等</Option>
                      <Option value="fine">精细</Option>
                      <Option value="very_fine">非常精细</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 锚杆参数 */}
            <Card
              title="锚杆参数"
              size="small"
              style={{ marginBottom: '16px', borderRadius: '8px' }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item
                    label="锚杆长度 (m)"
                  >
                    <InputNumber
                      defaultValue={15}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="倾斜角度 (°)"
                  >
                    <InputNumber
                      defaultValue={20}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="水平间距 (m)"
                  >
                    <InputNumber
                      defaultValue={3.0}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="竖向间距 (m)"
                  >
                    <InputNumber
                      defaultValue={4.0}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Divider />


          </div>
        </TabPane>

        <TabPane 
          tab={<span><NodeExpandOutlined /> 桩锚体系</span>} 
          key="pile_anchor"
        >
          <div style={{ padding: '16px' }}>
            {/* 桩参数配置 */}
            <Card
              title="桩参数"
              size="small"
              style={{ marginBottom: '16px', borderRadius: '8px' }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item
                    label="桩类型"
                  >
                    <Select
                      defaultValue="drill_pile"
                                            size="large"
                      style={{ width: '100%' }}
                    >
                      <Option value="drill_pile">钻孔灌注桩</Option>
                      <Option value="precast_pile">预制桩</Option>
                      <Option value="steel_pipe">钢管桩</Option>
                      <Option value="mixing_pile">搅拌桩</Option>
                      <Option value="cast_in_place">现浇桩</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="桩径 (mm)"
                  >
                    <InputNumber
                      min={400}
                      max={2000}
                      defaultValue={800}
                      step={50}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="桩长 (m)"
                  >
                    <InputNumber
                      min={10}
                      max={50}
                      defaultValue={25}
                      step={1}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="桩距 (m)"
                  >
                    <InputNumber
                      min={1.0}
                      max={5.0}
                      defaultValue={2.5}
                      step={0.1}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card
              title="锚索参数"
              size="small"
              style={{ marginBottom: '16px', borderRadius: '8px' }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item
                    label="锚索长度 (m)"
                  >
                    <InputNumber
                      min={10}
                      max={40}
                      defaultValue={20}
                      step={1}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="倾斜角度 (°)"
                  >
                    <InputNumber
                      min={10}
                      max={45}
                      defaultValue={25}
                      step={1}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="预应力 (kN)"
                  >
                    <InputNumber
                      min={100}
                      max={1000}
                      defaultValue={300}
                      step={50}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="锚索间距 (m)"
                  >
                    <InputNumber
                      min={1.5}
                      max={6.0}
                      defaultValue={3.0}
                      step={0.5}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card
              title="冠梁参数"
              size="small"
              style={{ marginBottom: '16px', borderRadius: '8px' }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item
                    label="冠梁宽度 (mm)"
                  >
                    <InputNumber
                      min={800}
                      max={1500}
                      defaultValue={1000}
                      step={50}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="冠梁高度 (mm)"
                  >
                    <InputNumber
                      min={600}
                      max={1200}
                      defaultValue={800}
                      step={50}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    label="混凝土等级"
                  >
                    <Select
                      defaultValue="C30"
                                            size="large"
                      style={{ width: '100%' }}
                    >
                      <Option value="C25">C25</Option>
                      <Option value="C30">C30</Option>
                      <Option value="C35">C35</Option>
                      <Option value="C40">C40</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Divider />

          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default SupportModule;