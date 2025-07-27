import React, { useState } from 'react';
import { Layout, Card, Typography, Form, Switch, Select, InputNumber, Button, Space, Row, Col, Divider, message } from 'antd';
import { 
  SettingOutlined, 
  SaveOutlined, 
  ReloadOutlined,
  BulbOutlined,
  GlobalOutlined,
  ThunderboltOutlined
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
                    DeepCAD v1.0.0 - 专业CAE建模平台
                  </Text>
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