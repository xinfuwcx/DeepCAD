import React from 'react';
import {
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Divider,
  Tooltip,
  Alert,
  Space
} from 'antd';
import { QuestionCircleOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import type { DXFProcessingOptions } from '../../hooks/useDXFImport';

const { Option } = Select;

interface DXFProcessingOptionsFormProps {
  initialOptions: DXFProcessingOptions;
  onSave: (options: DXFProcessingOptions) => void;
  onCancel: () => void;
}

export const DXFProcessingOptionsForm: React.FC<DXFProcessingOptionsFormProps> = ({
  initialOptions,
  onSave,
  onCancel
}) => {
  const [form] = Form.useForm<DXFProcessingOptions>();

  // 预设配置
  const presets = {
    default: {
      mode: 'TOLERANT',
      coordinate_system: 'WCS',
      scale_factor: 1.0,
      unit_conversion: 'METER',
      merge_duplicate_points: true,
      tolerance: 1e-6,
      repair_invalid_geometry: true,
      layer_filter: [],
      entity_filter: [],
      preserve_original_structure: true,
      generate_quality_report: true,
    } as DXFProcessingOptions,
    
    strict: {
      mode: 'STRICT',
      coordinate_system: 'WCS',
      scale_factor: 1.0,
      unit_conversion: 'METER',
      merge_duplicate_points: false,
      tolerance: 1e-9,
      repair_invalid_geometry: false,
      layer_filter: [],
      entity_filter: [],
      preserve_original_structure: true,
      generate_quality_report: true,
    } as DXFProcessingOptions,
    
    repair: {
      mode: 'REPAIR',
      coordinate_system: 'WCS',
      scale_factor: 1.0,
      unit_conversion: 'METER',
      merge_duplicate_points: true,
      tolerance: 1e-3,
      repair_invalid_geometry: true,
      layer_filter: [],
      entity_filter: [],
      preserve_original_structure: false,
      generate_quality_report: true,
    } as DXFProcessingOptions,
  };

  // 应用预设
  const applyPreset = (presetName: keyof typeof presets) => {
    const preset = presets[presetName];
    form.setFieldsValue(preset);
  };

  // 重置为默认值
  const resetToDefault = () => {
    form.setFieldsValue(initialOptions);
  };

  // 提交表单
  const handleSubmit = (values: DXFProcessingOptions) => {
    onSave(values);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialOptions}
      onFinish={handleSubmit}
      className="dxf-processing-options-form"
    >
      {/* 预设选择 */}
      <Card size="small" className="mb-4">
        <Row gutter={16} align="middle">
          <Col span={12}>
            <span className="font-medium">快速预设：</span>
          </Col>
          <Col span={12}>
            <Space>
              <Button size="small" onClick={() => applyPreset('default')}>
                默认
              </Button>
              <Button size="small" onClick={() => applyPreset('strict')}>
                严格
              </Button>
              <Button size="small" onClick={() => applyPreset('repair')}>
                修复
              </Button>
              <Button size="small" icon={<ReloadOutlined />} onClick={resetToDefault}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        {/* 基本设置 */}
        <Col span={12}>
          <Card title="基本设置" size="small">
            <Form.Item
              name="mode"
              label={
                <span>
                  处理模式{' '}
                  <Tooltip title="选择DXF文件的处理模式">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
              rules={[{ required: true, message: '请选择处理模式' }]}
            >
              <Select placeholder="选择处理模式">
                <Option value="STRICT">严格模式 - 严格按标准处理，遇错即停</Option>
                <Option value="TOLERANT">容错模式 - 忽略非关键错误，最大化导入</Option>
                <Option value="REPAIR">修复模式 - 自动修复问题，输出清理后模型</Option>
                <Option value="PREVIEW">预览模式 - 快速分析，不进行实际转换</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="coordinate_system"
              label={
                <span>
                  坐标系统{' '}
                  <Tooltip title="选择坐标系统类型">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
              rules={[{ required: true, message: '请选择坐标系统' }]}
            >
              <Select placeholder="选择坐标系统">
                <Option value="WCS">世界坐标系 (WCS)</Option>
                <Option value="UCS">用户坐标系 (UCS)</Option>
                <Option value="OCS">对象坐标系 (OCS)</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="unit_conversion"
              label={
                <span>
                  单位转换{' '}
                  <Tooltip title="目标单位系统">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
              rules={[{ required: true, message: '请选择目标单位' }]}
            >
              <Select placeholder="选择目标单位">
                <Option value="METER">米 (m)</Option>
                <Option value="MILLIMETER">毫米 (mm)</Option>
                <Option value="INCH">英寸 (in)</Option>
                <Option value="FOOT">英尺 (ft)</Option>
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="scale_factor"
                  label={
                    <span>
                      缩放因子{' '}
                      <Tooltip title="几何图形的缩放倍数">
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </span>
                  }
                  rules={[
                    { required: true, message: '请输入缩放因子' },
                    { type: 'number', min: 0.001, max: 1000, message: '缩放因子必须在0.001-1000之间' }
                  ]}
                >
                  <InputNumber
                    min={0.001}
                    max={1000}
                    step={0.1}
                    precision={3}
                    placeholder="1.0"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="tolerance"
                  label={
                    <span>
                      几何容差{' '}
                      <Tooltip title="几何计算的精度容差">
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </span>
                  }
                  rules={[
                    { required: true, message: '请输入几何容差' },
                    { type: 'number', min: 1e-12, max: 1e-3, message: '容差必须在1e-12到1e-3之间' }
                  ]}
                >
                  <InputNumber
                    min={1e-12}
                    max={1e-3}
                    step={1e-6}
                    precision={12}
                    placeholder="1e-6"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 处理选项 */}
        <Col span={12}>
          <Card title="处理选项" size="small">
            <Form.Item
              name="merge_duplicate_points"
              label="合并重复点"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="repair_invalid_geometry"
              label="自动修复无效几何"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="preserve_original_structure"
              label="保留原始结构"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="generate_quality_report"
              label="生成质量报告"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Divider orientation="left">图层过滤</Divider>

            <Form.Item
              name="layer_filter"
              label={
                <span>
                  指定图层{' '}
                  <Tooltip title="仅处理指定的图层，留空则处理所有图层">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <Select
                mode="tags"
                placeholder="输入图层名称，回车添加"
                style={{ width: '100%' }}
                tokenSeparators={[',']}
              />
            </Form.Item>

            <Form.Item
              name="entity_filter"
              label={
                <span>
                  实体类型过滤{' '}
                  <Tooltip title="仅处理指定类型的实体">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <Select
                mode="multiple"
                placeholder="选择要处理的实体类型"
                style={{ width: '100%' }}
              >
                <Option value="LINE">直线 (LINE)</Option>
                <Option value="POLYLINE">多段线 (POLYLINE)</Option>
                <Option value="LWPOLYLINE">轻量多段线 (LWPOLYLINE)</Option>
                <Option value="ARC">圆弧 (ARC)</Option>
                <Option value="CIRCLE">圆 (CIRCLE)</Option>
                <Option value="ELLIPSE">椭圆 (ELLIPSE)</Option>
                <Option value="SPLINE">样条曲线 (SPLINE)</Option>
                <Option value="TEXT">文本 (TEXT)</Option>
                <Option value="MTEXT">多行文本 (MTEXT)</Option>
                <Option value="POINT">点 (POINT)</Option>
                <Option value="INSERT">块插入 (INSERT)</Option>
                <Option value="HATCH">填充 (HATCH)</Option>
                <Option value="DIMENSION">标注 (DIMENSION)</Option>
              </Select>
            </Form.Item>
          </Card>
        </Col>
      </Row>

      {/* 说明信息 */}
      <Alert
        message="处理选项说明"
        description={
          <div>
            <p><strong>严格模式</strong>：严格按照DXF标准处理，遇到任何错误立即停止，适用于高质量数据。</p>
            <p><strong>容错模式</strong>：忽略非关键错误，尽可能多地导入数据，适用于数据质量一般的情况。</p>
            <p><strong>修复模式</strong>：自动修复发现的问题，输出修复后的模型，适用于有问题的数据。</p>
            <p><strong>预览模式</strong>：快速分析文件结构，不进行实际转换，用于评估处理可行性。</p>
          </div>
        }
        type="info"
        showIcon
        className="mt-4"
      />

      {/* 操作按钮 */}
      <div className="flex justify-end space-x-2 mt-6">
        <Button onClick={onCancel}>
          取消
        </Button>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
          保存配置
        </Button>
      </div>
    </Form>
  );
};

export default DXFProcessingOptionsForm;