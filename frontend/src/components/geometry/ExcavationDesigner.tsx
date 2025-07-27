import React, { useState } from 'react';
import { Card, Form, InputNumber, Select, Button, Space, Row, Col, Tabs, message, Upload, Switch, Divider } from 'antd';
import { 
  EnvironmentOutlined,
  FileImageOutlined,
  UploadOutlined,
  CalculatorOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { gmshOccService } from '../../services/gmshOccService';

const { Option } = Select;
const { TabPane } = Tabs;
const { Dragger } = Upload;

interface ExcavationDesignerProps {
  onExcavationCreate?: (excavationData: any) => void;
  geologyData?: any[];
}

const ExcavationDesigner: React.FC<ExcavationDesignerProps> = ({
  onExcavationCreate,
  geologyData = []
}) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('rectangular');
  const [creating, setCreating] = useState(false);
  const [dxfFile, setDxfFile] = useState<File | null>(null);
  const [excavationPreview, setExcavationPreview] = useState<any>(null);

  // 矩形基坑设计
  const createRectangularExcavation = async (values: any) => {
    setCreating(true);
    try {
      const response = await gmshOccService.createExcavationGeometry({
        type: 'rectangular',
        parameters: {
          width: values.width,
          length: values.length,
          depth: values.depth,
          slope_ratio: values.slope_ratio || 0,
          bench_width: values.bench_width || 0,
          stages: values.enable_stages ? [
            { depth: values.depth * 0.3, stage_name: '第一层开挖' },
            { depth: values.depth * 0.6, stage_name: '第二层开挖' },
            { depth: values.depth, stage_name: '第三层开挖' }
          ] : undefined
        },
        position: { x: 0, y: 0, z: 0 },
        name: `矩形基坑_${values.width}x${values.length}x${values.depth}`
      });

      if (response.success) {
        const excavationData = {
          type: 'rectangular',
          tag: response.geometryTag,
          parameters: values,
          volume: response.volume,
          bounds: {
            width: values.width,
            length: values.length,
            depth: values.depth
          }
        };
        
        setExcavationPreview(excavationData);
        onExcavationCreate?.(excavationData);
        message.success(`矩形基坑创建成功！开挖量: ${response.volume?.toFixed(2) || '未知'} m³`);
      } else {
        message.error(response.message || '基坑创建失败');
      }
    } catch (error) {
      console.error('基坑创建失败:', error);
      message.error('基坑创建失败，请检查参数');
    } finally {
      setCreating(false);
    }
  };

  // 圆形基坑设计
  const createCircularExcavation = async (values: any) => {
    setCreating(true);
    try {
      const response = await gmshOccService.createExcavationGeometry({
        type: 'circular',
        parameters: {
          radius: values.radius,
          depth: values.depth,
          slope_ratio: values.slope_ratio || 0
        },
        position: { x: 0, y: 0, z: 0 },
        name: `圆形基坑_R${values.radius}_D${values.depth}`
      });

      if (response.success) {
        const excavationData = {
          type: 'circular',
          tag: response.geometryTag,
          parameters: values,
          volume: response.volume,
          bounds: {
            width: values.radius * 2,
            length: values.radius * 2,
            depth: values.depth
          }
        };
        
        setExcavationPreview(excavationData);
        onExcavationCreate?.(excavationData);
        message.success(`圆形基坑创建成功！开挖量: ${response.volume?.toFixed(2) || '未知'} m³`);
      } else {
        message.error(response.message || '基坑创建失败');
      }
    } catch (error) {
      console.error('基坑创建失败:', error);
      message.error('基坑创建失败，请检查参数');
    } finally {
      setCreating(false);
    }
  };

  // 不规则基坑设计（通过DXF导入）
  const createIrregularExcavation = async (values: any) => {
    if (!dxfFile) {
      message.error('请先上传DXF设计图纸');
      return;
    }

    setCreating(true);
    try {
      // 首先导入DXF文件获取边界点
      const importResponse = await gmshOccService.importGeometry(dxfFile);
      
      if (!importResponse.success) {
        throw new Error('DXF文件导入失败');
      }

      // 模拟从DXF中提取的边界点（实际应该通过后端解析）
      const boundaryPoints = [
        { x: -20, y: -15 },
        { x: 15, y: -18 },
        { x: 22, y: -5 },
        { x: 18, y: 12 },
        { x: 8, y: 16 },
        { x: -12, y: 14 },
        { x: -25, y: 8 },
        { x: -22, y: -8 }
      ];

      const response = await gmshOccService.createExcavationGeometry({
        type: 'irregular',
        parameters: {
          boundary_points: boundaryPoints,
          depth: values.depth,
          slope_ratio: values.slope_ratio || 0
        },
        position: { x: 0, y: 0, z: 0 },
        name: `不规则基坑_${dxfFile.name.split('.')[0]}`
      });

      if (response.success) {
        const excavationData = {
          type: 'irregular',
          tag: response.geometryTag,
          parameters: { ...values, boundary_points: boundaryPoints },
          volume: response.volume,
          dxfFile: dxfFile.name
        };
        
        setExcavationPreview(excavationData);
        onExcavationCreate?.(excavationData);
        message.success(`不规则基坑创建成功！开挖量: ${response.volume?.toFixed(2) || '未知'} m³`);
      } else {
        message.error(response.message || '基坑创建失败');
      }
    } catch (error) {
      console.error('不规则基坑创建失败:', error);
      message.error('不规则基坑创建失败，请检查DXF文件');
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = async (values: any) => {
    switch (activeTab) {
      case 'rectangular':
        await createRectangularExcavation(values);
        break;
      case 'circular':
        await createCircularExcavation(values);
        break;
      case 'irregular':
        await createIrregularExcavation(values);
        break;
      default:
        message.warning('未知的基坑类型');
    }
  };

  // DXF文件上传配置
  const dxfUploadProps = {
    name: 'file',
    multiple: false,
    accept: '.dxf,.dwg',
    beforeUpload: (file: File) => {
      setDxfFile(file);
      message.success(`${file.name} 文件准备完成`);
      return false; // 阻止自动上传
    },
    onRemove: () => {
      setDxfFile(null);
    }
  };

  // 计算估算开挖量
  const calculateVolume = (type: string, params: any) => {
    switch (type) {
      case 'rectangular':
        return params.width * params.length * params.depth;
      case 'circular':
        return Math.PI * params.radius * params.radius * params.depth;
      default:
        return 0;
    }
  };

  return (
    <Card 
      title="智能基坑开挖设计"
      extra={
        <Space>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {excavationPreview && `当前: ${excavationPreview.type} - ${excavationPreview.volume?.toFixed(2)}m³`}
          </span>
        </Space>
      }
      style={{
        background: 'rgba(26, 26, 46, 0.9)',
        border: '1px solid rgba(0, 217, 255, 0.3)',
        borderRadius: '8px'
      }}
      headStyle={{ 
        background: 'rgba(0, 217, 255, 0.1)',
        color: '#00d9ff',
        borderBottom: '1px solid rgba(0, 217, 255, 0.2)'
      }}
      bodyStyle={{ color: '#ffffff' }}
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        type="card"
        style={{ marginBottom: '20px' }}
      >
        <TabPane 
          tab={
            <span>
              <CalculatorOutlined />
              矩形基坑
            </span>
          } 
          key="rectangular"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              width: 40,
              length: 30,
              depth: 15,
              slope_ratio: 0.5,
              bench_width: 2,
              enable_stages: false
            }}
            onValuesChange={(_, allValues) => {
              const volume = calculateVolume('rectangular', allValues);
              // 实时显示估算开挖量
            }}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item 
                  name="width" 
                  label="基坑宽度 (m)"
                  rules={[{ required: true, message: '请输入基坑宽度' }]}
                >
                  <InputNumber min={5} max={100} step={0.5} className="w-full" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item 
                  name="length" 
                  label="基坑长度 (m)"
                  rules={[{ required: true, message: '请输入基坑长度' }]}
                >
                  <InputNumber min={5} max={100} step={0.5} className="w-full" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item 
                  name="depth" 
                  label="开挖深度 (m)"
                  rules={[{ required: true, message: '请输入开挖深度' }]}
                >
                  <InputNumber min={2} max={50} step={0.5} className="w-full" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="slope_ratio" label="边坡坡率 (1:n)">
                  <InputNumber min={0} max={2} step={0.1} className="w-full" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="bench_width" label="马道宽度 (m)">
                  <InputNumber min={0} max={5} step={0.5} className="w-full" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="enable_stages" valuePropName="checked">
              <Switch 
                checkedChildren="分层开挖" 
                unCheckedChildren="一次开挖"
                style={{ background: 'rgba(0, 217, 255, 0.3)' }}
              />
            </Form.Item>

            <div style={{
              background: 'rgba(0, 217, 255, 0.05)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: '6px',
              padding: '12px',
              marginTop: '16px'
            }}>
              <h4 style={{ color: '#00d9ff', margin: '0 0 8px 0' }}>工程量估算</h4>
              <Row gutter={16}>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#666', fontSize: '12px' }}>土方开挖</div>
                    <div style={{ color: '#00d9ff', fontSize: '18px', fontWeight: 'bold' }}>
                      {form.getFieldsValue() ? calculateVolume('rectangular', form.getFieldsValue()).toFixed(0) : '0'} m³
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#666', fontSize: '12px' }}>施工周期</div>
                    <div style={{ color: '#00d9ff', fontSize: '18px', fontWeight: 'bold' }}>
                      {Math.ceil((form.getFieldValue('depth') || 15) / 3)} 周
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#666', fontSize: '12px' }}>风险等级</div>
                    <div style={{ 
                      color: (form.getFieldValue('depth') || 15) > 20 ? '#ff4d4f' : '#52c41a', 
                      fontSize: '18px', 
                      fontWeight: 'bold' 
                    }}>
                      {(form.getFieldValue('depth') || 15) > 20 ? '高' : '中'}
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </Form>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <EnvironmentOutlined />
              圆形基坑
            </span>
          } 
          key="circular"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              radius: 20,
              depth: 12,
              slope_ratio: 0.3
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="radius" 
                  label="基坑半径 (m)"
                  rules={[{ required: true, message: '请输入基坑半径' }]}
                >
                  <InputNumber min={3} max={50} step={0.5} className="w-full" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="depth" 
                  label="开挖深度 (m)"
                  rules={[{ required: true, message: '请输入开挖深度' }]}
                >
                  <InputNumber min={2} max={40} step={0.5} className="w-full" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="slope_ratio" label="边坡坡率 (1:n)">
              <InputNumber min={0} max={2} step={0.1} className="w-full" />
            </Form.Item>

            <div style={{
              background: 'rgba(0, 217, 255, 0.05)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: '6px',
              padding: '12px',
              marginTop: '16px'
            }}>
              <h4 style={{ color: '#00d9ff', margin: '0 0 8px 0' }}>圆形基坑特点</h4>
              <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
                • 周向受力均匀，稳定性好<br/>
                • 适用于井筒、圆形结构施工<br/>
                • 支护结构用量相对较少<br/>
                • 土方开挖量: {form.getFieldsValue() ? calculateVolume('circular', form.getFieldsValue()).toFixed(0) : '0'} m³
              </div>
            </div>
          </Form>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <FileImageOutlined />
              不规则基坑
            </span>
          } 
          key="irregular"
        >
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#00d9ff', marginBottom: '8px' }}>上传设计图纸</h4>
            <Dragger {...dxfUploadProps} style={{ 
              background: 'rgba(0, 217, 255, 0.05)',
              border: '1px dashed rgba(0, 217, 255, 0.4)'
            }}>
              <p style={{ fontSize: '48px', color: '#00d9ff' }}>
                <UploadOutlined />
              </p>
              <p style={{ color: '#ffffff', fontSize: '16px' }}>
                点击或拖拽DXF/DWG文件到此区域
              </p>
              <p style={{ color: '#666', fontSize: '12px' }}>
                支持AutoCAD格式的基坑平面设计图
              </p>
            </Dragger>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              depth: 15,
              slope_ratio: 0.4,
              smooth_corners: true
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="depth" 
                  label="开挖深度 (m)"
                  rules={[{ required: true, message: '请输入开挖深度' }]}
                >
                  <InputNumber min={2} max={50} step={0.5} className="w-full" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="slope_ratio" label="边坡坡率 (1:n)">
                  <InputNumber min={0} max={2} step={0.1} className="w-full" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="smooth_corners" valuePropName="checked">
              <Switch 
                checkedChildren="圆滑转角" 
                unCheckedChildren="直角转角"
                style={{ background: 'rgba(0, 217, 255, 0.3)' }}
              />
            </Form.Item>

            {dxfFile && (
              <div style={{
                background: 'rgba(82, 196, 26, 0.1)',
                border: '1px solid rgba(82, 196, 26, 0.3)',
                borderRadius: '6px',
                padding: '12px',
                marginTop: '16px'
              }}>
                <h4 style={{ color: '#52c41a', margin: '0 0 8px 0' }}>文件已准备</h4>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  文件: {dxfFile.name}<br/>
                  大小: {(dxfFile.size / 1024).toFixed(1)} KB<br/>
                  类型: {dxfFile.type || 'AutoCAD图纸'}
                </div>
              </div>
            )}
          </Form>
        </TabPane>
      </Tabs>

      <Divider style={{ borderColor: 'rgba(0, 217, 255, 0.2)' }} />
      
      <Row justify="space-between" align="middle">
        <Col>
          <Space>
            <span style={{ color: '#666', fontSize: '12px' }}>
              智能CAD建模 | 精确工程量计算
            </span>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button 
              onClick={() => form.resetFields()}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: '#ffffff'
              }}
            >
              重置参数
            </Button>
            <Button 
              type="primary"
              loading={creating}
              onClick={() => form.submit()}
              icon={<ThunderboltOutlined />}
              style={{
                background: 'rgba(0, 217, 255, 0.8)',
                borderColor: 'rgba(0, 217, 255, 0.6)',
                color: '#000000'
              }}
            >
              {creating ? '创建中...' : '开始开挖'}
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

export default ExcavationDesigner;