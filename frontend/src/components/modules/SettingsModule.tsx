import React, { useState } from 'react';
import { Card, Button, Space, Typography, Form, Input, Select, Switch, Slider, Tabs, Table, Tag } from 'antd';
import {
  SettingOutlined,
  UserOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  BugOutlined,
  GlobalOutlined,
  EyeOutlined,
  BellOutlined,
  LockOutlined,
  SaveOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

export const SettingsModule: React.FC = () => {
  const [autoSave, setAutoSave] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('zh-CN');
  const [theme, setTheme] = useState('futuristic');

  const systemInfo = [
    { key: 'version', label: '系统版本', value: 'DeepCAE v3.0.1' },
    { key: 'build', label: '构建版本', value: '2024.01.15.1430' },
    { key: 'platform', label: '运行平台', value: 'Windows 11 x64' },
    { key: 'node', label: 'Node.js版本', value: 'v18.17.0' },
    { key: 'memory', label: '内存使用', value: '2.1GB / 16GB' },
    { key: 'storage', label: '存储空间', value: '156GB / 1TB' }
  ];

  const userPreferences = [
    { category: '界面设置', items: [
      { name: '深色主题', value: darkMode, type: 'switch' },
      { name: '自动保存', value: autoSave, type: 'switch' },
      { name: '语言设置', value: language, type: 'select', options: [
        { value: 'zh-CN', label: '中文简体' },
        { value: 'en-US', label: 'English' },
        { value: 'ja-JP', label: '日本語' }
      ]},
      { name: '主题风格', value: theme, type: 'select', options: [
        { value: 'futuristic', label: '未来科技' },
        { value: 'classic', label: '经典蓝' },
        { value: 'warm', label: '暖色调' }
      ]}
    ]},
    { category: '计算设置', items: [
      { name: '默认求解器', value: 'terra', type: 'select', options: [
        { value: 'terra', label: 'Terra仿真系统' },
        { value: 'opensees', label: 'OpenSees' },
        { value: 'abaqus', label: 'Abaqus' }
      ]},
      { name: '并行线程数', value: 8, type: 'slider', min: 1, max: 16 },
      { name: '内存限制', value: 8, type: 'slider', min: 2, max: 32 },
      { name: '自动优化', value: true, type: 'switch' }
    ]},
    { category: '安全设置', items: [
      { name: '数据加密', value: true, type: 'switch' },
      { name: '自动备份', value: true, type: 'switch' },
      { name: '登录验证', value: false, type: 'switch' },
      { name: '操作日志', value: true, type: 'switch' }
    ]}
  ];

  const performanceSettings = [
    { name: 'GPU加速', description: '启用GPU计算加速', enabled: true },
    { name: '内存优化', description: '智能内存管理', enabled: true },
    { name: '缓存清理', description: '自动清理临时文件', enabled: true },
    { name: '并行计算', description: '多核心并行处理', enabled: true },
    { name: '实时监控', description: '系统性能监控', enabled: false }
  ];

  const backupSettings = [
    { type: '自动备份', interval: '每小时', location: 'D:\\DeepCAE\\Backup', size: '2.5GB' },
    { type: '项目备份', interval: '每天', location: 'D:\\DeepCAE\\Projects', size: '12.8GB' },
    { type: '配置备份', interval: '每周', location: 'D:\\DeepCAE\\Config', size: '156MB' }
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* 全屏3D视口背景 */}
      <div style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(40, 40, 40, 0.95) 100%)',
        zIndex: 1
      }}>
        {/* 设置控制台背景效果 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(0, 217, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(52, 199, 89, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(255, 193, 7, 0.1) 0%, transparent 50%)
          `,
          opacity: 0.6
        }} />

        {/* 电路板网格背景 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(0, 217, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 217, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
          opacity: 0.3
        }} />

        {/* 3D视口中心提示 */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          zIndex: 2,
          userSelect: 'none'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.2 }}>⚙️</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', opacity: 0.6 }}>3D系统控制台</div>
          <div style={{ fontSize: '16px', opacity: 0.4 }}>
            ✅ 系统参数配置
            <br />
            ✅ 性能实时监控
            <br />
            ✅ 安全策略管理
            <br />
            ✅ 数据备份控制
          </div>
        </div>
      </div>

      {/* 悬浮左侧工具面板 */}
      <div style={{ 
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: '380px',
        maxHeight: 'calc(100% - 40px)',
        zIndex: 10
      }}>
        <Card 
          className="glass-card" 
          title={
            <Space>
              <SettingOutlined style={{ color: 'var(--primary-color)' }} />
              <span style={{ color: 'white', fontSize: '14px' }}>系统配置中心</span>
            </Space>
          }
          style={{ 
            background: 'rgba(26, 26, 26, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 217, 255, 0.1)'
          }}
          styles={{ 
            body: { 
              padding: '16px', 
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto',
              background: 'transparent'
            },
            header: {
              background: 'transparent',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '12px 16px'
            }
          }}
        >
          <Tabs defaultActiveKey="1" >
            <TabPane tab="基本设置" key="1">
              <Form layout="vertical" >
                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>系统语言</span>}>
                  <Select value={language} onChange={setLanguage} style={{ width: '100%' }} >
                    <Option value="zh-CN">中文简体</Option>
                    <Option value="en-US">English</Option>
                    <Option value="ja-JP">日本語</Option>
                  </Select>
                </Form.Item>
                
                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>主题风格</span>}>
                  <Select value={theme} onChange={setTheme} style={{ width: '100%' }} >
                    <Option value="futuristic">未来科技</Option>
                    <Option value="classic">经典蓝</Option>
                    <Option value="warm">暖色调</Option>
                  </Select>
                </Form.Item>
                
                <Form.Item>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>深色主题</Text>
                    <Switch checked={darkMode} onChange={setDarkMode}  />
                  </div>
                </Form.Item>
                
                <Form.Item>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>自动保存</Text>
                    <Switch checked={autoSave} onChange={setAutoSave}  />
                  </div>
                </Form.Item>
                
                <Form.Item>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>桌面通知</Text>
                    <Switch checked={notifications} onChange={setNotifications}  />
                  </div>
                </Form.Item>
              </Form>
            </TabPane>
            
            <TabPane tab="性能优化" key="2">
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'bold' }}>
                  性能设置
                </Text>
              </div>
              
              {performanceSettings.map((setting, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                  padding: '8px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div>
                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: '12px' }}>{setting.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                      {setting.description}
                    </div>
                  </div>
                  <Switch checked={setting.enabled}  />
                </div>
              ))}
            </TabPane>

            <TabPane tab="安全设置" key="3">
              <Form layout="vertical" >
                <Form.Item>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>数据加密</Text>
                    <Switch defaultChecked  />
                  </div>
                </Form.Item>
                
                <Form.Item>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>自动备份</Text>
                    <Switch defaultChecked  />
                  </div>
                </Form.Item>
                
                <Form.Item>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>登录验证</Text>
                    <Switch  />
                  </div>
                </Form.Item>
                
                <Form.Item>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>操作日志</Text>
                    <Switch defaultChecked  />
                  </div>
                </Form.Item>
                
                <Form.Item label={<span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>备份间隔</span>}>
                  <Select defaultValue="1h" style={{ width: '100%' }} >
                    <Option value="15m">15分钟</Option>
                    <Option value="30m">30分钟</Option>
                    <Option value="1h">1小时</Option>
                    <Option value="6h">6小时</Option>
                    <Option value="1d">1天</Option>
                  </Select>
                </Form.Item>
              </Form>
            </TabPane>

            <TabPane tab="系统信息" key="4">
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'bold' }}>
                  系统详情
                </Text>
              </div>
              
              {systemInfo.map((info, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  padding: '6px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '4px'
                }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{info.label}</span>
                  <span style={{ color: 'var(--primary-color)', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
                    {info.value}
                  </span>
                </div>
              ))}
            </TabPane>
          </Tabs>

          {/* 保存按钮 */}
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <Button icon={<ReloadOutlined />} style={{ flex: 1 }}>
              重置
            </Button>
            <Button type="primary" icon={<SaveOutlined />} style={{ flex: 1 }}>
              保存
            </Button>
          </div>
        </Card>
      </div>

      {/* 悬浮右侧系统监控指示器 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(26, 26, 26, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 217, 255, 0.2)',
        borderRadius: '16px',
        padding: '16px',
        minWidth: '180px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 217, 255, 0.1)'
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', textAlign: 'center' }}>
          系统监控
        </div>
        
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>CPU使用率</span>
            <span style={{ color: '#00d9ff', fontFamily: 'JetBrains Mono', fontSize: '10px' }}>67%</span>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px' }}>
            <div style={{ width: '67%', height: '100%', background: '#00d9ff', borderRadius: '2px' }} />
          </div>
        </div>
        
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>内存使用</span>
            <span style={{ color: '#10b981', fontFamily: 'JetBrains Mono', fontSize: '10px' }}>4.2GB</span>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px' }}>
            <div style={{ width: '26%', height: '100%', background: '#10b981', borderRadius: '2px' }} />
          </div>
        </div>
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>磁盘使用</span>
            <span style={{ color: '#8b5cf6', fontFamily: 'JetBrains Mono', fontSize: '10px' }}>156GB</span>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px' }}>
            <div style={{ width: '15%', height: '100%', background: '#8b5cf6', borderRadius: '2px' }} />
          </div>
        </div>
      </div>

      {/* 悬浮底部工具栏 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(26, 26, 26, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 217, 255, 0.2)',
        borderRadius: '20px',
        padding: '12px 24px',
        display: 'flex',
        gap: '20px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 217, 255, 0.1)'
      }}>
        <Button  type="text" style={{ color: 'var(--primary-color)', border: 'none' }}>
          ⚙️ 设置
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          📊 监控
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          🔒 安全
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          💾 备份
        </Button>
      </div>
    </div>
  );
};

export default SettingsModule;