import React from 'react';
import { Typography, Form, Input, Button, notification, Switch, Row, Col, Space, Divider } from 'antd';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useUIStore } from '../stores/useUIStore';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const settingsSchema = z.object({
  authorName: z.string().min(1, { message: 'Author name is required.' }),
  pointsOfInterest: z.array(z.object({
    name: z.string().min(1, 'Point of interest name cannot be empty.'),
  })).optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const SettingsView: React.FC = () => {
  const { control, handleSubmit, formState: { errors } } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      authorName: 'Default User',
      pointsOfInterest: [{ name: 'Center' }, { name: 'Support A' }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "pointsOfInterest",
  });

  const { theme, toggleTheme } = useUIStore();

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
            render={({ field }) => <Input {...field} style={{ maxWidth: '300px' }} />}
          />
        </Form.Item>
        
        <Divider style={{ borderColor: '#424242' }}><Text style={{color: 'white'}}>Points of Interest</Text></Divider>

        {fields.map((item, index) => (
          <Form.Item
            label={index === 0 ? <span style={{ color: 'white' }}>Locations</span> : ''}
            required={false}
            key={item.id}
          >
            <Space>
              <Controller
                render={({ field }) => <Input {...field} placeholder="Point Name" style={{width: '240px'}} />}
                name={`pointsOfInterest.${index}.name`}
                control={control}
              />
              <MinusCircleOutlined
                className="dynamic-delete-button"
                onClick={() => remove(index)}
              />
            </Space>
             {errors.pointsOfInterest?.[index]?.name &&
              <p style={{color: 'red'}}>{errors.pointsOfInterest?.[index]?.name?.message}</p>
            }
          </Form.Item>
        ))}
        <Form.Item>
          <Button
            type="dashed"
            onClick={() => append({ name: '' })}
            style={{ width: '300px' }}
            icon={<PlusOutlined />}
          >
            Add Point of Interest
          </Button>
        </Form.Item>

        <Form.Item style={{marginTop: '32px'}}>
          <Button type="primary" htmlType="submit">
            Save Settings
          </Button>
        </Form.Item>
      </Form>

      <Row align="middle" style={{ marginTop: '32px' }}>
        <Col>
          <Text style={{ color: 'white', marginRight: '16px' }}>Theme</Text>
        </Col>
        <Col>
          <Switch
            checkedChildren="Dark"
            unCheckedChildren="Light"
            checked={theme === 'dark'}
            onChange={toggleTheme}
          />
        </Col>
      </Row>

    </div>
  );
};

export default SettingsView; 