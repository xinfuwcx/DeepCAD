import React from 'react';
import { Typography, Form, Input, Button, notification } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { useDomainStore } from '../stores/useDomainStore';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const { Title } = Typography;

// 1. Define the Zod schema
const meshingSchema = z.object({
  meshSize: z.number({ invalid_type_error: 'Mesh size is required.' })
             .min(0.01, { message: 'Mesh size must be greater than 0.' }),
});

// 2. Infer the TypeScript type from the schema
type MeshingFormData = z.infer<typeof meshingSchema>;

const MeshingView: React.FC = () => {
  const { control, handleSubmit, formState: { errors } } = useForm<MeshingFormData>({
    // 3. Use the zodResolver
    resolver: zodResolver(meshingSchema),
    defaultValues: {
      meshSize: 0.5,
    }
  });

  const { addTask, updateTask } = useDomainStore();

  const onSubmit = (data: MeshingFormData) => {
    notification.success({
      message: 'Meshing Task Started',
      description: `Global mesh size set to ${data.meshSize}.`,
    });

    const taskId = uuidv4();
    addTask({
      id: taskId,
      name: `Mesh with size ${data.meshSize}`,
      status: 'running',
      progress: 0,
    });

    // Simulate task progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress < 100) {
        updateTask(taskId, { progress: Math.round(progress) });
      } else {
        clearInterval(interval);
        const finalStatus = Math.random() > 0.3 ? 'completed' : 'failed';
        updateTask(taskId, { progress: 100, status: finalStatus });
      }
    }, 800);
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
            // 4. Remove inline rules
            render={({ field }) => (
              <Input 
                {...field}
                type="number" 
                step="0.01" 
                style={{ maxWidth: '200px' }}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  field.onChange(isNaN(value) ? undefined : value);
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