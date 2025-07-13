import React, { useState } from 'react';
import { Typography, Form, Input, Button, notification, Switch, Row, Col, Space, Divider, Card, Select, InputNumber, Tabs } from 'antd';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useUIStore } from '../stores/useUIStore';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  MinusCircleOutlined, 
  PlusOutlined, 
  UserOutlined, 
  SettingOutlined, 
  GlobalOutlined, 
  BulbOutlined,
  SaveOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  BarsOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { useShallow } from 'zustand/react/shallow';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const settingsSchema = z.object({
  authorName: z.string().min(1, { message: '作者名称不能为空' }),
  pointsOfInterest: z.array(z.object({
    name: z.string().min(1, '兴趣点名称不能为空'),
  })).optional(),
  defaultUnits: z.string().optional(),
  gridSize: z.number().min(0.1).optional(),
  autoSave: z.boolean().optional(),
  language: z.string().optional(),
  notifications: z.boolean().optional(),
  performance: z.enum(['low', 'medium', 'high']).optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  
  const { control, handleSubmit, formState: { errors } } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      authorName: '默认用户',
      pointsOfInterest: [{ name: '中心点' }, { name: '支撑点A' }],
      defaultUnits: 'metric',
      gridSize: 1.0,
      autoSave: true,
      language: 'zh_CN',
      notifications: true,
      performance: 'medium',
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "pointsOfInterest",
  });

  const { theme, toggleTheme } = useUIStore(
    useShallow(state => ({
      theme: state.theme,
      toggleTheme: state.toggleTheme
    }))
  );

  const onSubmit = (data: SettingsFormData) => {
    console.log(data);
    notification.success({
      message: '设置已保存',
      description: `作者名称已设置为 ${data.authorName}`,
    });
  };

  return (
    <div className="settings-view fade-in">
      <div className="settings-header">
        <Title level={2} className="text-primary m-0">系统设置</Title>
        <Button 
          type="primary" 
          icon={<SaveOutlined />} 
          onClick={handleSubmit(onSubmit)}
        >
          保存设置
        </Button>
      </div>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        type="card"
        className="scale-in"
      >
        <TabPane 
          tab={<span><SettingOutlined /> 常规设置</span>} 
          key="general"
        >
          <Card className="settings-card">
            <Form layout="vertical" className="settings-form">
              <div className="settings-group">
                <div className="settings-group-title">
                  <UserOutlined /> 用户信息
                </div>
                
                <Form.Item
                  label="默认作者名称"
                  validateStatus={errors.authorName ? 'error' : ''}
                  help={errors.authorName?.message}
                >
                  <Controller
                    name="authorName"
                    control={control}
                    render={({ field }) => <Input {...field} className="max-w-xs" />}
                  />
                </Form.Item>
                
                <div className="settings-item">
                  <div>
                    <div className="settings-item-label">界面语言</div>
                    <div className="settings-item-description">设置应用界面的显示语言</div>
                  </div>
                  <div className="settings-item-control">
                    <Controller
                      name="language"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} className="w-48">
                          <Option value="zh_CN">简体中文</Option>
                          <Option value="en_US">English</Option>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                
                <div className="settings-item">
                  <div>
                    <div className="settings-item-label">主题设置</div>
                    <div className="settings-item-description">切换深色/浅色主题</div>
                  </div>
                  <div className="settings-item-control">
                    <Switch
                      checkedChildren="深色"
                      unCheckedChildren="浅色"
                      checked={theme === 'dark'}
                      onChange={toggleTheme}
                    />
                  </div>
                </div>
                
                <div className="settings-item">
                  <div>
                    <div className="settings-item-label">通知提醒</div>
                    <div className="settings-item-description">启用系统通知提醒</div>
                  </div>
                  <div className="settings-item-control">
                    <Controller
                      name="notifications"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Switch checked={value} onChange={onChange} />
                      )}
                    />
                  </div>
                </div>
              </div>
              
              <div className="settings-group">
                <div className="settings-group-title">
                  <GlobalOutlined /> 单位与网格
                </div>
                
                <div className="settings-item">
                  <div>
                    <div className="settings-item-label">默认单位制</div>
                    <div className="settings-item-description">设置默认使用的单位制</div>
                  </div>
                  <div className="settings-item-control">
                    <Controller
                      name="defaultUnits"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} className="w-48">
                          <Option value="metric">公制 (米, 千克)</Option>
                          <Option value="imperial">英制 (英尺, 磅)</Option>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                
                <div className="settings-item">
                  <div>
                    <div className="settings-item-label">网格大小</div>
                    <div className="settings-item-description">设置默认网格大小</div>
                  </div>
                  <div className="settings-item-control">
                    <Controller
                      name="gridSize"
                      control={control}
                      render={({ field }) => (
                        <InputNumber {...field} min={0.1} max={10} step={0.1} className="w-48" />
                      )}
                    />
                  </div>
                </div>
              </div>
              
              <div className="settings-group">
                <div className="settings-group-title">
                  <ToolOutlined /> 性能设置
                </div>
                
                <div className="settings-item">
                  <div>
                    <div className="settings-item-label">渲染质量</div>
                    <div className="settings-item-description">设置3D渲染质量</div>
                  </div>
                  <div className="settings-item-control">
                    <Controller
                      name="performance"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} className="w-48">
                          <Option value="low">低 (更快)</Option>
                          <Option value="medium">中等</Option>
                          <Option value="high">高 (更精细)</Option>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                
                <div className="settings-item">
                  <div>
                    <div className="settings-item-label">自动保存</div>
                    <div className="settings-item-description">启用自动保存功能</div>
                  </div>
                  <div className="settings-item-control">
                    <Controller
                      name="autoSave"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Switch checked={value} onChange={onChange} />
                      )}
                    />
                  </div>
                </div>
              </div>
            </Form>
          </Card>
        </TabPane>
        
        <TabPane 
          tab={<span><EnvironmentOutlined /> 兴趣点</span>} 
          key="poi"
        >
          <Card className="settings-card">
            <div className="settings-group">
              <div className="settings-group-title">
                <EnvironmentOutlined /> 兴趣点管理
              </div>
              
              <Form layout="vertical" className="settings-form">
                {fields.map((item, index) => (
                  <Form.Item
                    label={index === 0 ? "位置名称" : ""}
                    required={false}
                    key={item.id}
                  >
                    <Space className="transition-all hover-lift">
                      <Controller
                        render={({ field }) => <Input {...field} placeholder="兴趣点名称" className="w-60" />}
                        name={`pointsOfInterest.${index}.name`}
                        control={control}
                      />
                      <Button 
                        type="text" 
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(index)}
                        className="dynamic-delete-button"
                      />
                    </Space>
                     {errors.pointsOfInterest?.[index]?.name &&
                      <p className="text-red-500">{errors.pointsOfInterest?.[index]?.name?.message}</p>
                    }
                  </Form.Item>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => append({ name: '' })}
                    className="w-72"
                    icon={<PlusOutlined />}
                    className="transition-all hover-scale"
                  >
                    添加兴趣点
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </Card>
        </TabPane>
        
        <TabPane 
          tab={<span><EyeOutlined /> 视图设置</span>} 
          key="view"
        >
          <Card className="settings-card">
            <div className="settings-group">
              <div className="settings-group-title">
                <EyeOutlined /> 视图默认设置
              </div>
              
              <div className="settings-item">
                <div>
                  <div className="settings-item-label">显示网格线</div>
                  <div className="settings-item-description">在3D视图中显示网格线</div>
                </div>
                <div className="settings-item-control">
                  <Switch defaultChecked />
                </div>
              </div>
              
              <div className="settings-item">
                <div>
                  <div className="settings-item-label">显示坐标轴</div>
                  <div className="settings-item-description">在3D视图中显示坐标轴</div>
                </div>
                <div className="settings-item-control">
                  <Switch defaultChecked />
                </div>
              </div>
              
              <div className="settings-item">
                <div>
                  <div className="settings-item-label">默认背景颜色</div>
                  <div className="settings-item-description">设置3D视图的默认背景颜色</div>
                </div>
                <div className="settings-item-control">
                  <Select defaultValue="dark" className="w-48">
                    <Option value="dark">深色</Option>
                    <Option value="light">浅色</Option>
                    <Option value="gradient">渐变</Option>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default SettingsView; 