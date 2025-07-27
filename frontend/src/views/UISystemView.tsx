import React, { useState } from 'react';
import { Layout, Card, Typography, Tabs, Row, Col, Space, Button, Switch, Select, Slider, ColorPicker, Divider } from 'antd';
import { 
  BgColorsOutlined,
  SettingOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  SkinOutlined,
  BorderOutlined,
  LayoutOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import ThemeToggle from '../components/ThemeToggle';
import UIModeSwitcher from '../components/UIModeSwitcher';
import UISettingsPanel from '../components/UISettingsPanel';
import Glass from '../components/ui/GlassComponents';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const UISystemView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('theme');
  const [uiConfig, setUIConfig] = useState({
    theme: 'dark',
    accentColor: '#00d9ff',
    glassEffect: true,
    animations: true,
    borderRadius: 8,
    spacing: 16,
    fontSize: 14,
    layout: 'futuristic'
  });

  const handleConfigChange = (key: string, value: any) => {
    setUIConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px' }}>
        <div style={{ maxWidth: 1600, margin: '0 auto' }}>
          <Title level={2} style={{ color: '#00d9ff', marginBottom: '24px' }}>
            <BgColorsOutlined style={{ marginRight: '8px' }} />
            UI设计系统
          </Title>

          <Row gutter={[24, 24]}>
            {/* 左侧控制面板 */}
            <Col span={8}>
              <Card 
                title="UI配置控制台"
                style={{ height: '800px' }}
              >
                <Tabs 
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  type="card"
                  size="small"
                  tabPosition="top"
                >
                  {/* 主题系统 */}
                  <TabPane 
                    tab={
                      <span>
                        <SkinOutlined />
                        主题系统
                      </span>
                    } 
                    key="theme"
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text strong>主题切换</Text>
                        <div style={{ marginTop: '8px' }}>
                          <ThemeToggle />
                        </div>
                      </div>

                      <Divider />

                      <div>
                        <Text strong>主色调</Text>
                        <div style={{ marginTop: '8px' }}>
                          <ColorPicker
                            value={uiConfig.accentColor}
                            onChange={(color) => handleConfigChange('accentColor', color.toHexString())}
                            showText
                          />
                        </div>
                      </div>

                      <div>
                        <Text strong>玻璃效果</Text>
                        <div style={{ marginTop: '8px' }}>
                          <Switch
                            checked={uiConfig.glassEffect}
                            onChange={(checked) => handleConfigChange('glassEffect', checked)}
                          />
                        </div>
                      </div>

                      <div>
                        <Text strong>动画效果</Text>
                        <div style={{ marginTop: '8px' }}>
                          <Switch
                            checked={uiConfig.animations}
                            onChange={(checked) => handleConfigChange('animations', checked)}
                          />
                        </div>
                      </div>

                      <div>
                        <Text strong>圆角大小</Text>
                        <div style={{ marginTop: '8px' }}>
                          <Slider
                            min={0}
                            max={20}
                            value={uiConfig.borderRadius}
                            onChange={(value) => handleConfigChange('borderRadius', value)}
                            marks={{ 0: '0', 8: '8px', 20: '20px' }}
                          />
                        </div>
                      </div>
                    </Space>
                  </TabPane>

                  {/* 布局系统 */}
                  <TabPane 
                    tab={
                      <span>
                        <LayoutOutlined />
                        布局系统
                      </span>
                    } 
                    key="layout"
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text strong>布局模式</Text>
                        <div style={{ marginTop: '8px' }}>
                          <Select
                            value={uiConfig.layout}
                            onChange={(value) => handleConfigChange('layout', value)}
                            style={{ width: '100%' }}
                          >
                            <Option value="futuristic">未来科技风</Option>
                            <Option value="professional">专业工程风</Option>
                            <Option value="minimal">极简风格</Option>
                            <Option value="classic">经典风格</Option>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Text strong>间距系统</Text>
                        <div style={{ marginTop: '8px' }}>
                          <Slider
                            min={8}
                            max={32}
                            value={uiConfig.spacing}
                            onChange={(value) => handleConfigChange('spacing', value)}
                            marks={{ 8: '紧凑', 16: '标准', 24: '宽松', 32: '超宽' }}
                          />
                        </div>
                      </div>

                      <div>
                        <Text strong>字体大小</Text>
                        <div style={{ marginTop: '8px' }}>
                          <Slider
                            min={12}
                            max={18}
                            value={uiConfig.fontSize}
                            onChange={(value) => handleConfigChange('fontSize', value)}
                            marks={{ 12: '小', 14: '标准', 16: '大', 18: '超大' }}
                          />
                        </div>
                      </div>

                      <div>
                        <Text strong>UI模式切换</Text>
                        <div style={{ marginTop: '8px' }}>
                          <UIModeSwitcher />
                        </div>
                      </div>
                    </Space>
                  </TabPane>

                  {/* 组件库 */}
                  <TabPane 
                    tab={
                      <span>
                        <AppstoreOutlined />
                        组件库
                      </span>
                    } 
                    key="components"
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text strong>玻璃态组件</Text>
                        <div style={{ marginTop: '8px' }}>
                          <Button
                            type="primary"
                            style={{
                              background: 'rgba(0, 217, 255, 0.2)',
                              backdropFilter: 'blur(20px)',
                              border: '1px solid rgba(0, 217, 255, 0.3)',
                              width: '100%'
                            }}
                          >
                            玻璃按钮示例
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Text strong>发光效果</Text>
                        <div style={{ marginTop: '8px' }}>
                          <Button
                            type="primary"
                            style={{
                              background: '#00d9ff',
                              boxShadow: '0 0 20px rgba(0, 217, 255, 0.5)',
                              border: 'none',
                              width: '100%'
                            }}
                          >
                            发光按钮示例
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Text strong>渐变效果</Text>
                        <div style={{ marginTop: '8px' }}>
                          <Button
                            type="primary"
                            style={{
                              background: 'linear-gradient(135deg, #00d9ff 0%, #0099cc 100%)',
                              border: 'none',
                              width: '100%'
                            }}
                          >
                            渐变按钮示例
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Text strong>边框效果</Text>
                        <div style={{ marginTop: '8px', padding: '12px', border: '2px solid #00d9ff', borderRadius: '8px', textAlign: 'center' }}>
                          边框卡片示例
                        </div>
                      </div>
                    </Space>
                  </TabPane>

                  {/* 高级设置 */}
                  <TabPane 
                    tab={
                      <span>
                        <ExperimentOutlined />
                        高级设置
                      </span>
                    } 
                    key="advanced"
                  >
                    <div style={{ height: '600px', overflowY: 'auto' }}>
                      <UISettingsPanel />
                    </div>
                  </TabPane>
                </Tabs>
              </Card>
            </Col>

            {/* 右侧预览区域 */}
            <Col span={16}>
              <Card 
                title={
                  <span>
                    <EyeOutlined style={{ marginRight: '8px' }} />
                    UI组件预览
                  </span>
                }
                extra={
                  <Space>
                    <Text style={{ fontSize: '12px', color: '#00d9ff' }}>
                      当前主题: {uiConfig.theme}
                    </Text>
                    <Button icon={<ThunderboltOutlined />} size="small">
                      应用设置
                    </Button>
                  </Space>
                }
                style={{ height: '800px' }}
                styles={{ body: { padding: '24px', height: 'calc(100% - 57px)', overflowY: 'auto' } }}
              >
                {/* 玻璃组件展示 */}
                <Glass>
                  <div>Glass components demo</div>
                </Glass>

                <Divider style={{ margin: '24px 0' }} />

                {/* 各种UI组件预览 */}
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Card 
                      title="卡片组件"
                      size="small"
                      style={{ 
                        background: uiConfig.glassEffect 
                          ? 'rgba(255, 255, 255, 0.05)' 
                          : 'rgba(26, 26, 46, 0.95)',
                        backdropFilter: uiConfig.glassEffect ? 'blur(20px)' : 'none',
                        border: `1px solid ${uiConfig.accentColor}30`,
                        borderRadius: uiConfig.borderRadius
                      }}
                    >
                      <Text>这是一个示例卡片</Text>
                    </Card>
                  </Col>

                  <Col span={8}>
                    <Button 
                      type="primary"
                      size="large"
                      style={{
                        background: uiConfig.accentColor,
                        borderColor: uiConfig.accentColor,
                        borderRadius: uiConfig.borderRadius,
                        width: '100%',
                        height: '80px'
                      }}
                    >
                      主要按钮
                    </Button>
                  </Col>

                  <Col span={8}>
                    <div style={{
                      padding: uiConfig.spacing,
                      background: `${uiConfig.accentColor}10`,
                      border: `1px solid ${uiConfig.accentColor}30`,
                      borderRadius: uiConfig.borderRadius,
                      textAlign: 'center',
                      fontSize: uiConfig.fontSize
                    }}>
                      自定义容器
                    </div>
                  </Col>
                </Row>

                <Divider style={{ margin: '24px 0' }} />

                {/* 配置信息显示 */}
                <Card title="当前配置" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>主色调: <span style={{ color: uiConfig.accentColor }}>{uiConfig.accentColor}</span></Text>
                    <Text>玻璃效果: {uiConfig.glassEffect ? '启用' : '禁用'}</Text>
                    <Text>动画效果: {uiConfig.animations ? '启用' : '禁用'}</Text>
                    <Text>圆角大小: {uiConfig.borderRadius}px</Text>
                    <Text>间距: {uiConfig.spacing}px</Text>
                    <Text>字体大小: {uiConfig.fontSize}px</Text>
                    <Text>布局模式: {uiConfig.layout}</Text>
                  </Space>
                </Card>
              </Card>
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );
};

export default UISystemView;