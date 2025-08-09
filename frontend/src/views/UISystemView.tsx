/**
 * UISystemView.tsx - 用户界面系统管理
 * 
 * 功能描述:
 * - 系统UI组件和主题的统一管理界面
 * - 提供界面定制、主题切换和样式配置功能
 * - 支持响应式设计和多设备适配设置
 * - 集成Glass UI、主题切换和界面模式管理
 * 
 * UI管理功能:
 * 1. 主题管理 - 深色/浅色主题切换和自定义主题
 * 2. 界面模式 - 不同工作模式的界面布局切换
 * 3. 组件配置 - UI组件的样式和行为参数设置
 * 4. 颜色系统 - 品牌色、功能色的统一管理
 * 5. 布局控制 - 网格系统、间距、字体大小设置
 * 6. 动效配置 - 动画效果、过渡时间的调节
 * 
 * 核心组件:
 * - ThemeToggle: 主题切换组件
 * - UIModeSwitcher: 界面模式切换器
 * - UISettingsPanel: UI设置面板
 * - Glass: Glass UI毛玻璃效果组件
 * 
 * 设计系统:
 * - 统一的设计语言
 * - 组件库标准化
 * - 可访问性支持
 * - 多语言界面适配
 * 
 * 技术特色: 主题系统、组件化设计、响应式布局、用户个性化
 */
import React, { useState, useMemo } from 'react';
import { Typography, Tabs, Space, Button, Switch, Select, Slider, ColorPicker, Divider } from 'antd';
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
import UnifiedModuleLayout from '../components/ui/layout/UnifiedModuleLayout';
import Panel from '../components/ui/layout/Panel';
import MetricCard from '../components/ui/layout/MetricCard';

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
    setUIConfig(prev => ({ ...prev, [key]: value }));
  };

  const metrics = useMemo(() => ([
    { label: '主色', value: uiConfig.accentColor.replace('#',''), accent: 'blue' as const },
    { label: '玻璃', value: uiConfig.glassEffect ? 'ON' : 'OFF', accent: uiConfig.glassEffect ? 'purple' as const : 'orange' as const },
    { label: '动画', value: uiConfig.animations ? 'ON' : 'OFF', accent: uiConfig.animations ? 'green' as const : 'red' as const },
    { label: '圆角', value: uiConfig.borderRadius + 'px', accent: 'orange' as const },
    { label: '间距', value: uiConfig.spacing + 'px', accent: 'blue' as const },
    { label: '字体', value: uiConfig.fontSize + 'px', accent: 'green' as const },
  ]), [uiConfig]);

  return (
    <UnifiedModuleLayout
        left={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Panel title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BgColorsOutlined /> UI配置</span>} dense>
              <Tabs activeKey={activeTab} onChange={setActiveTab} size="small" items={[
                { key: 'theme', label: '主题', children: (
                  <Space direction="vertical" style={{ width: '100%' }} size={16}>
                    <div>
                      <Text strong>主题切换</Text>
                      <div style={{ marginTop: 6 }}><ThemeToggle /></div>
                    </div>
                    <div>
                      <Text strong>主色调</Text>
                      <div style={{ marginTop: 6 }}>
                        <ColorPicker
                          value={uiConfig.accentColor}
                          onChange={(c)=>handleConfigChange('accentColor', c.toHexString())}
                          showText
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <Space direction="vertical" style={{ flex:1 }} size={6}>
                        <Text strong>玻璃效果</Text>
                        <Switch size="small" checked={uiConfig.glassEffect} onChange={(v)=>handleConfigChange('glassEffect', v)} />
                      </Space>
                      <Space direction="vertical" style={{ flex:1 }} size={6}>
                        <Text strong>动画效果</Text>
                        <Switch size="small" checked={uiConfig.animations} onChange={(v)=>handleConfigChange('animations', v)} />
                      </Space>
                    </div>
                    <div>
                      <Text strong>圆角</Text>
                      <Slider min={0} max={20} value={uiConfig.borderRadius} onChange={(v)=>handleConfigChange('borderRadius', v)} marks={{0:'0',8:'8',20:'20'}} />
                    </div>
                  </Space>
                )},
                { key: 'layout', label: '布局', children: (
                  <Space direction="vertical" style={{ width: '100%' }} size={16}>
                    <div>
                      <Text strong>布局模式</Text>
                      <Select size="small" value={uiConfig.layout} onChange={(v)=>handleConfigChange('layout', v)} style={{ width: '100%', marginTop: 6 }}>
                        <Option value="futuristic">未来科技风</Option>
                        <Option value="professional">专业工程风</Option>
                        <Option value="minimal">极简风格</Option>
                        <Option value="classic">经典风格</Option>
                      </Select>
                    </div>
                    <div>
                      <Text strong>间距系统</Text>
                      <Slider min={8} max={32} value={uiConfig.spacing} onChange={(v)=>handleConfigChange('spacing', v)} marks={{8:'紧',16:'标',24:'宽',32:'超'}} />
                    </div>
                    <div>
                      <Text strong>字体大小</Text>
                      <Slider min={12} max={18} value={uiConfig.fontSize} onChange={(v)=>handleConfigChange('fontSize', v)} marks={{12:'12',14:'14',16:'16',18:'18'}} />
                    </div>
                    <div>
                      <Text strong>UI模式</Text>
                      <div style={{ marginTop: 6 }}><UIModeSwitcher /></div>
                    </div>
                  </Space>
                )},
                { key: 'components', label: '组件', children: (
                  <Space direction="vertical" size={16} style={{ width:'100%' }}>
                    <div>
                      <Text strong>Glass 示例</Text>
                      <div style={{ marginTop: 8 }}><Glass><div style={{ padding: 12 }}>Glass components demo</div></Glass></div>
                    </div>
                    <div>
                      <Text strong>发光按钮</Text>
                      <Button type="primary" style={{ background: uiConfig.accentColor, boxShadow: `0 0 14px ${uiConfig.accentColor}66`, border: 'none', width:'100%' }}>发光按钮示例</Button>
                    </div>
                    <div>
                      <Text strong>渐变按钮</Text>
                      <Button type="primary" style={{ background: `linear-gradient(135deg, ${uiConfig.accentColor} 0%, #0099cc 100%)`, border:'none', width:'100%' }}>渐变按钮示例</Button>
                    </div>
                  </Space>
                )},
                { key: 'advanced', label: '高级', children: (
                  <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                    <UISettingsPanel />
                  </div>
                )}
              ]} />
            </Panel>
          </div>
        }
        right={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Panel title="系统指标" dense>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(95px,1fr))', gap: 8 }}>
                {metrics.map(m => <MetricCard key={m.label} label={m.label} value={m.value} accent={m.accent} />)}
              </div>
            </Panel>
            <Panel title="当前配置" dense>
              <Space direction="vertical" size={6} style={{ fontSize: 12 }}>
                <Text>主色: <span style={{ color: uiConfig.accentColor }}>{uiConfig.accentColor}</span></Text>
                <Text>玻璃: {uiConfig.glassEffect ? '启用' : '禁用'}</Text>
                <Text>动画: {uiConfig.animations ? '启用' : '禁用'}</Text>
                <Text>圆角: {uiConfig.borderRadius}px</Text>
                <Text>间距: {uiConfig.spacing}px</Text>
                <Text>字体: {uiConfig.fontSize}px</Text>
                <Text>布局: {uiConfig.layout}</Text>
              </Space>
              <div style={{ marginTop: 12 }}>
                <Button size="small" type="primary" icon={<ThunderboltOutlined />}>应用设置</Button>
              </div>
            </Panel>
          </div>
        }
        overlay={null}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#101820,#1b2730)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 25% 30%, rgba(0,217,255,0.15), transparent 60%), radial-gradient(circle at 75% 70%, rgba(0,153,204,0.18), transparent 65%)' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: 60, opacity: .25, marginBottom: 20 }}>⚙️</div>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: 1, marginBottom: 12 }}>系统 UI 预览视口</div>
            <div style={{ fontSize: 14, opacity: .55, lineHeight: 1.5 }}>后续可嵌入实时主题切换动画 / 性能监测图层 / 可访问性对比预览</div>
          </div>
        </div>
      </UnifiedModuleLayout>
  );
};

export default UISystemView;