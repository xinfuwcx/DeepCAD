import React from 'react';
import { Typography, Form, Input, Button, notification } from 'antd';
import { useForm, Controller } from 'react-hook-form';

const { Title } = Typography;

interface SettingsFormData {
  authorName: string;
}

const SettingsView: React.FC = () => {
  const { control, handleSubmit, formState: { errors } } = useForm<SettingsFormData>({
    defaultValues: {
      authorName: 'Default User',
    }
  });

  const onSubmit = (data: SettingsFormData) => {
    console.log(data);
    notification.success({
      message: 'Settings Saved',
      description: `Author name set to ${data.authorName}.`,
    });
  };

  return (
    <div>
      <Title level={2} style={{ color: 'white', marginBottom: '24px' }}>Application Settings</Title>
      
      <Form onFinish={handleSubmit(onSubmit)} layout="vertical">
        <Form.Item
          label={<span style={{ color: 'white' }}>Default Author Name</span>}
          validateStatus={errors.authorName ? 'error' : ''}
          help={errors.authorName?.message}
        >
          <Controller
            name="authorName"
            control={control}
            rules={{ required: 'Author name is required.' }}
            render={({ field }) => <Input {...field} style={{ maxWidth: '300px' }} />}
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit">
            Save Settings
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default SettingsView; 