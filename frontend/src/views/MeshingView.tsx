import React from 'react';
import { Typography, Form, Input, Button, notification } from 'antd';
import { useForm, Controller } from 'react-hook-form';

const { Title } = Typography;

interface MeshingFormData {
  meshSize: number;
}

const MeshingView: React.FC = () => {
  const { control, handleSubmit, formState: { errors } } = useForm<MeshingFormData>({
    defaultValues: {
      meshSize: 0.5,
    }
  });

  const onSubmit = (data: MeshingFormData) => {
    console.log(data);
    notification.success({
      message: 'Meshing Parameters Submitted',
      description: `Global mesh size set to ${data.meshSize}.`,
    });
  };

  return (
    <div>
      <Title level={2} style={{ color: 'white', marginBottom: '24px' }}>Meshing Controls</Title>
      
      <Form onFinish={handleSubmit(onSubmit)} layout="vertical">
        <Form.Item
          label={<span style={{ color: 'white' }}>Global Mesh Size</span>}
          validateStatus={errors.meshSize ? 'error' : ''}
          help={errors.meshSize?.message}
        >
          <Controller
            name="meshSize"
            control={control}
            rules={{ 
              required: 'Mesh size is required.',
              min: { value: 0.01, message: 'Mesh size must be greater than 0.' } 
            }}
            render={({ field }) => (
              <Input 
                {...field}
                type="number" 
                step="0.01" 
                style={{ maxWidth: '200px' }}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  field.onChange(isNaN(value) ? '' : value);
                }}
              />
            )}
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit">
            Generate Mesh
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default MeshingView; 