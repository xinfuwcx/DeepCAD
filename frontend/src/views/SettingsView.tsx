import React, { useState } from 'react';
import { Layout, Card, Typography, Form, Switch, Select, InputNumber, Button, Space, Row, Col, Divider, message } from 'antd';
import { 
  SettingOutlined, 
  SaveOutlined, 
  ReloadOutlined,
  BulbOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  SafetyOutlined,
  CalculatorOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const SettingsView: React.FC = () => {
  const [form] = Form.useForm();
  const [settings, setSettings] = useState({
    theme: 'dark',
    language: 'zh-CN',
    autoSave: true,
    renderQuality: 'high',
    maxThreads: 4,
    cachSize: 1024,
    showGrid: true,
    showAxisHelper: true,
    enableHotkeys: true,
    // 深基坑CAE专业设置
    geologySolver: 'kratos',
    meshQuality: 'high',
    analysisType: 'coupled',
    safetyFactors: {
      bearing: 2.0,
      sliding: 1.5,
      overturning: 2.0
    },
    materialDatabase: 'chinese_standard',
    designCode: 'JGJ120-2012'
  });

  const handleSave = () => {
    form.validateFields().then(values => {
      setSettings(values);
      message.success('设置已保存');
    });
  };

  const handleReset = () => {
    const defaultSettings = {
      theme: 'dark',
      language: 'zh-CN',
      autoSave: true,
      renderQuality: 'high',
      maxThreads: 4,
      cachSize: 1024,
      showGrid: true,
      showAxisHelper: true,
      enableHotkeys: true,
      // 深基坑CAE专业设置
      geologySolver: 'kratos',
      meshQuality: 'high',
      analysisType: 'coupled',
      safetyFactors: {
        bearing: 2.0,
        sliding: 1.5,
        overturning: 2.0
      },
      materialDatabase: 'chinese_standard',
      designCode: 'JGJ120-2012'
    };
    setSettings(defaultSettings);
    form.setFieldsValue(defaultSettings);
    message.info('设置已重置为默认值');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Title level={2} style={{ color: '#00d9ff', marginBottom: '24px' }}>
            <SettingOutlined style={{ marginRight: '8px' }} />
            系统设置
          </Title>

          <Form
            form={form}
            layout="vertical"
            initialValues={settings}
            onValuesChange={(changedValues, allValues) => setSettings(allValues)}
          >
            <Row gutter={[24, 24]}>
              {/* 界面设置 */}
              <Col span={12}>
                <Card 
                  title={
                    <span>
                      <BulbOutlined style={{ marginRight: '8px', color: '#00d9ff' }} />
                      界面设置
                    </span>
                  }
                  style={{ height: '400px' }}
                >
                  <Form.Item label="主题" name="theme">
                    <Select>
                      <Option value="dark">深色主题</Option>
                      <Option value="light">浅色主题</Option>
                      <Option value="auto">跟随系统</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="语言" name="language">
                    <Select>
                      <Option value="zh-CN">中文简体</Option>
                      <Option value="zh-TW">中文繁体</Option>
                      <Option value="en-US">English</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="显示网格" name="showGrid" valuePropName="checked">
                    <Switch />
                  </Form.Item>

                  <Form.Item label="显示坐标轴" name="showAxisHelper" valuePropName="checked">
                    <Switch />
                  </Form.Item>

                  <Form.Item label="启用快捷键" name="enableHotkeys" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Card>
              </Col>

              {/* 性能设置 */}
              <Col span={12}>
                <Card 
                  title={
                    <span>
                      <ThunderboltOutlined style={{ marginRight: '8px', color: '#00d9ff' }} />
                      性能设置
                    </span>
                  }
                  style={{ height: '400px' }}
                >
                  <Form.Item label="渲染质量" name="renderQuality">
                    <Select>
                      <Option value="low">低质量</Option>
                      <Option value="medium">中等质量</Option>
                      <Option value="high">高质量</Option>
                      <Option value="ultra">超高质量</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="最大线程数" name="maxThreads">
                    <InputNumber
                      min={1}
                      max={16}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  <Form.Item label="缓存大小 (MB)" name="cachSize">
                    <InputNumber
                      min={256}
                      max={8192}
                      step={256}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  <Form.Item label="自动保存" name="autoSave" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Card>
              </Col>

              {/* 网络设置 */}
              <Col span={12}>
                <Card 
                  title={
                    <span>
                      <GlobalOutlined style={{ marginRight: '8px', color: '#00d9ff' }} />
                      网络设置
                    </span>
                  }
                  style={{ height: '300px' }}
                >
                  <Form.Item label="API服务器">
                    <Select defaultValue="localhost">
                      <Option value="localhost">本地服务器 (localhost:8080)</Option>
                      <Option value="remote">远程服务器</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="请求超时 (秒)">
                    <InputNumber
                      min={5}
                      max={120}
                      defaultValue={30}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  <Form.Item label="启用代理" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Card>
              </Col>

              {/* CAE专业设置 */}
              <Col span={12}>
                <Card 
                  title={
                    <span>
                      <ExperimentOutlined style={{ marginRight: '8px', color: '#00d9ff' }} />
                      CAE专业设置
                    </span>
                  }
                  style={{ height: '400px' }}
                >
                  <Form.Item label="地质求解器" name="geologySolver">
                    <Select>
                      <Option value="kratos">Kratos多物理场</Option>
                      <Option value="plaxis">Plaxis岩土</Option>
                      <Option value="abaqus">Abaqus通用</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="网格质量" name="meshQuality">
                    <Select>
                      <Option value="coarse">粗网格</Option>
                      <Option value="medium">中等网格</Option>
                      <Option value="fine">细网格</Option>
                      <Option value="ultra">超细网格</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="分析类型" name="analysisType">
                    <Select>
                      <Option value="static">静力分析</Option>
                      <Option value="dynamic">动力分析</Option>
                      <Option value="coupled">流固耦合</Option>
                      <Option value="thermal">热力耦合</Option>
                    </Select>
                  </Form.Item>
                </Card>
              </Col>

              {/* 工程规范设置 */}
              <Col span={12}>
                <Card 
                  title={
                    <span>
                      <SafetyOutlined style={{ marginRight: '8px', color: '#00d9ff' }} />
                      工程规范设置
                    </span>
                  }
                  style={{ height: '400px' }}
                >
                  <Form.Item label="设计规范" name="designCode">
                    <Select>
                      <Option value="JGJ120-2012">建筑基坑支护技术规程</Option>
                      <Option value="GB50007-2011">建筑地基基础设计规范</Option>
                      <Option value="JTS165-2013">海港工程地基规范</Option>
                      <Option value="DG/TJ08-61-2018">上海地基基础规范</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="材料数据库" name="materialDatabase">
                    <Select>
                      <Option value="chinese_standard">中国标准材料库</Option>
                      <Option value="international">国际通用材料库</Option>
                      <Option value="custom">自定义材料库</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="承载力安全系数">
                    <InputNumber
                      min={1.2}
                      max={3.0}
                      step={0.1}
                      defaultValue={2.0}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  <Form.Item label="抗滑移安全系数">
                    <InputNumber
                      min={1.2}
                      max={2.5}
                      step={0.1}
                      defaultValue={1.5}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Card>
              </Col>

              {/* 高级设置 */}
              <Col span={12}>
                <Card 
                  title={
                    <span>
                      <SettingOutlined style={{ marginRight: '8px', color: '#00d9ff' }} />
                      高级设置
                    </span>
                  }
                  style={{ height: '300px' }}
                >
                  <Form.Item label="调试模式" valuePropName="checked">
                    <Switch />
                  </Form.Item>

                  <Form.Item label="实验性功能" valuePropName="checked">
                    <Switch />
                  </Form.Item>

                  <Form.Item label="错误报告" valuePropName="checked" initialValue={true}>
                    <Switch />
                  </Form.Item>

                  <Divider />
                  
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    DeepCAD v1.0.0 - 专业深基坑CAE平台
                  </Text>
                </Card>
              </Col>

              {/* 计算设置 */}
              <Col span={12}>
                <Card 
                  title={
                    <span>
                      <CalculatorOutlined style={{ marginRight: '8px', color: '#00d9ff' }} />
                      计算设置
                    </span>
                  }
                  style={{ height: '300px' }}
                >
                  <Form.Item label="GPU加速" valuePropName="checked">
                    <Switch />
                  </Form.Item>

                  <Form.Item label="并行计算" valuePropName="checked" initialValue={true}>
                    <Switch />
                  </Form.Item>

                  <Form.Item label="内存限制 (GB)">
                    <InputNumber
                      min={4}
                      max={64}
                      defaultValue={16}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  <Form.Item label="收敛精度">
                    <Select defaultValue="1e-6">
                      <Option value="1e-4">1×10⁻⁴ (粗糙)</Option>
                      <Option value="1e-5">1×10⁻⁵ (标准)</Option>
                      <Option value="1e-6">1×10⁻⁶ (精细)</Option>
                      <Option value="1e-7">1×10⁻⁷ (超精细)</Option>
                    </Select>
                  </Form.Item>
                </Card>
              </Col>
            </Row>

            {/* 操作按钮 */}
            <Row style={{ marginTop: '24px' }}>
              <Col span={24}>
                <Card>
                  <Space style={{ width: '100%', justifyContent: 'center' }}>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSave}
                      size="large"
                    >
                      保存设置
                    </Button>
                    
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleReset}
                      size="large"
                    >
                      恢复默认
                    </Button>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Form>
        </div>
      </Content>
    </Layout>
  );
};

export default SettingsView;