import React, { useState } from 'react';
import { Typography, Form, Input, Button, notification, Switch, Row, Col, Space, Divider, Card, Tabs, Upload, Avatar, Select } from 'antd';
import { UserOutlined, UploadOutlined, SaveOutlined, LockOutlined, BellOutlined, GlobalOutlined } from '@ant-design/icons';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const userSettingsSchema = z.object({
  profile: z.object({
    fullName: z.string().min(1, { message: 'Full name is required' }),
    email: z.string().email({ message: 'Invalid email address' }),
    jobTitle: z.string().optional(),
    organization: z.string().optional(),
  }),
  preferences: z.object({
    language: z.string(),
    unitSystem: z.string(),
    autoSaveInterval: z.number().min(1).max(60),
    enableNotifications: z.boolean(),
    darkMode: z.boolean(),
  }),
  security: z.object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, { message: 'Password must be at least 8 characters' }).optional(),
    confirmPassword: z.string().optional(),
  }).refine(data => !data.newPassword || data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),
});

type UserSettingsFormData = z.infer<typeof userSettingsSchema>;

const UserSettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const { control, handleSubmit, formState: { errors } } = useForm<UserSettingsFormData>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      profile: {
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        jobTitle: 'Structural Engineer',
        organization: 'Engineering Firm',
      },
      preferences: {
        language: 'en',
        unitSystem: 'metric',
        autoSaveInterval: 5,
        enableNotifications: true,
        darkMode: true,
      },
      security: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      },
    }
  });

  const onSubmit = (data: UserSettingsFormData) => {
    console.log(data);
    notification.success({
      message: 'Settings Saved',
      description: 'Your user settings have been updated successfully.',
    });
  };

  const handleAvatarChange = (info: any) => {
    if (info.file.status === 'done') {
      // In a real app, this would be the URL returned from the server
      setAvatarUrl(URL.createObjectURL(info.file.originFileObj));
      notification.success({
        message: 'Avatar Updated',
        description: 'Your profile picture has been updated successfully.',
      });
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ color: 'white', marginBottom: '24px' }}>User Settings</Title>
      
      <Card style={{ background: '#2c2c2c', borderColor: '#424242' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane 
            tab={<span><UserOutlined /> Profile</span>} 
            key="profile"
          >
            <Form layout="vertical" onFinish={handleSubmit(data => onSubmit({ ...data, activeTab: 'profile' }))}>
              <Row gutter={24}>
                <Col span={6} style={{ textAlign: 'center' }}>
                  <Avatar 
                    size={120} 
                    icon={<UserOutlined />} 
                    src={avatarUrl}
                    style={{ marginBottom: '16px' }}
                  />
                  <Upload 
                    onChange={handleAvatarChange}
                    showUploadList={false}
                    action="https://www.mocky.io/v2/5cc8019d300000980a055e76" // Replace with your actual upload endpoint
                  >
                    <Button icon={<UploadOutlined />}>Change Avatar</Button>
                  </Upload>
                </Col>
                <Col span={18}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label={<span style={{ color: 'white' }}>Full Name</span>}
                        validateStatus={errors.profile?.fullName ? 'error' : ''}
                        help={errors.profile?.fullName?.message}
                      >
                        <Controller
                          name="profile.fullName"
                          control={control}
                          render={({ field }) => <Input {...field} />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label={<span style={{ color: 'white' }}>Email</span>}
                        validateStatus={errors.profile?.email ? 'error' : ''}
                        help={errors.profile?.email?.message}
                      >
                        <Controller
                          name="profile.email"
                          control={control}
                          render={({ field }) => <Input {...field} />}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label={<span style={{ color: 'white' }}>Job Title</span>}
                      >
                        <Controller
                          name="profile.jobTitle"
                          control={control}
                          render={({ field }) => <Input {...field} />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label={<span style={{ color: 'white' }}>Organization</span>}
                      >
                        <Controller
                          name="profile.organization"
                          control={control}
                          render={({ field }) => <Input {...field} />}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Col>
              </Row>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                  Save Profile
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
          
          <TabPane 
            tab={<span><GlobalOutlined /> Preferences</span>} 
            key="preferences"
          >
            <Form layout="vertical" onFinish={handleSubmit(data => onSubmit({ ...data, activeTab: 'preferences' }))}>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    label={<span style={{ color: 'white' }}>Language</span>}
                  >
                    <Controller
                      name="preferences.language"
                      control={control}
                      render={({ field }) => (
                        <Select {...field}>
                          <Option value="en">English</Option>
                          <Option value="fr">French</Option>
                          <Option value="de">German</Option>
                          <Option value="es">Spanish</Option>
                          <Option value="zh">Chinese</Option>
                        </Select>
                      )}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={<span style={{ color: 'white' }}>Unit System</span>}
                  >
                    <Controller
                      name="preferences.unitSystem"
                      control={control}
                      render={({ field }) => (
                        <Select {...field}>
                          <Option value="metric">Metric (m, kg, N)</Option>
                          <Option value="imperial">Imperial (ft, lb, lbf)</Option>
                        </Select>
                      )}
                    />
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item
                label={<span style={{ color: 'white' }}>Auto-Save Interval (minutes)</span>}
                validateStatus={errors.preferences?.autoSaveInterval ? 'error' : ''}
                help={errors.preferences?.autoSaveInterval?.message}
              >
                <Controller
                  name="preferences.autoSaveInterval"
                  control={control}
                  render={({ field }) => <Input type="number" {...field} min={1} max={60} />}
                />
              </Form.Item>
              
              <Form.Item>
                <Space direction="vertical">
                  <Controller
                    name="preferences.enableNotifications"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <div>
                        <Switch checked={value} onChange={onChange} />
                        <Text style={{ color: 'white', marginLeft: '8px' }}>Enable Notifications</Text>
                      </div>
                    )}
                  />
                  
                  <Controller
                    name="preferences.darkMode"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <div>
                        <Switch checked={value} onChange={onChange} />
                        <Text style={{ color: 'white', marginLeft: '8px' }}>Dark Mode</Text>
                      </div>
                    )}
                  />
                </Space>
              </Form.Item>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                  Save Preferences
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
          
          <TabPane 
            tab={<span><LockOutlined /> Security</span>} 
            key="security"
          >
            <Form layout="vertical" onFinish={handleSubmit(data => onSubmit({ ...data, activeTab: 'security' }))}>
              <Form.Item
                label={<span style={{ color: 'white' }}>Current Password</span>}
              >
                <Controller
                  name="security.currentPassword"
                  control={control}
                  render={({ field }) => <Input.Password {...field} />}
                />
              </Form.Item>
              
              <Form.Item
                label={<span style={{ color: 'white' }}>New Password</span>}
                validateStatus={errors.security?.newPassword ? 'error' : ''}
                help={errors.security?.newPassword?.message}
              >
                <Controller
                  name="security.newPassword"
                  control={control}
                  render={({ field }) => <Input.Password {...field} />}
                />
              </Form.Item>
              
              <Form.Item
                label={<span style={{ color: 'white' }}>Confirm New Password</span>}
                validateStatus={errors.security?.confirmPassword ? 'error' : ''}
                help={errors.security?.confirmPassword?.message}
              >
                <Controller
                  name="security.confirmPassword"
                  control={control}
                  render={({ field }) => <Input.Password {...field} />}
                />
              </Form.Item>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                  Update Password
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
          
          <TabPane 
            tab={<span><BellOutlined /> Notifications</span>} 
            key="notifications"
          >
            <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
              <div style={{ marginBottom: '24px' }}>
                <Title level={4} style={{ color: 'white' }}>Notification Settings</Title>
                <Text style={{ color: 'white' }}>Configure what notifications you want to receive.</Text>
              </div>
              
              <Row gutter={[0, 16]}>
                {['Analysis Complete', 'System Updates', 'Project Changes', 'Comments'].map((item) => (
                  <Col span={24} key={item}>
                    <Card size="small" style={{ background: '#3a3a3a', borderColor: '#424242' }}>
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Text style={{ color: 'white' }}>{item}</Text>
                        </Col>
                        <Col>
                          <Switch defaultChecked />
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                ))}
              </Row>
              
              <Form.Item style={{ marginTop: '24px' }}>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                  Save Notification Settings
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default UserSettingsView; 