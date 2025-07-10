import React, { useState } from 'react';
import { Form, Input, Select, Button, Card, notification } from 'antd';
import { useSceneStore } from '../../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import axios from 'axios';

const { Option } = Select;

const ComponentCreationForm: React.FC = () => {
  const [form] = Form.useForm();
  const [componentType, setComponentType] = useState<string>('diaphragm_wall');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { scene, fetchScene } = useSceneStore(
    useShallow(state => ({
      scene: state.scene,
      fetchScene: state.fetchScene,
    }))
  );
  
  const materials = scene?.materials || [];

  const handleTypeChange = (value: string) => {
    setComponentType(value);
    form.resetFields(['thickness', 'depth', 'free_length', 'bonded_length', 'diameter', 'angle']);
  };

  const onFinish = async (values: any) => {
    setIsSubmitting(true);
    
    try {
      // Extract component properties based on type
      const componentData = {
        name: values.name,
        type: values.type,
        material_id: values.material_id,
      };
      
      // Add type-specific properties
      switch (values.type) {
        case 'diaphragm_wall':
          Object.assign(componentData, {
            thickness: values.thickness,
            depth: values.depth,
          });
          break;
        case 'anchor_rod':
          Object.assign(componentData, {
            free_length: values.free_length,
            bonded_length: values.bonded_length,
            diameter: values.diameter,
            angle: values.angle,
          });
          break;
        case 'pile_arrangement':
          Object.assign(componentData, {
            pile_diameter: values.pile_diameter,
            pile_spacing: values.pile_spacing,
            pile_depth: values.pile_depth,
          });
          break;
      }
      
      // Send to backend API
      await axios.post('http://localhost:8080/api/components', componentData);
      
      notification.success({
        message: 'Component Created',
        description: `${values.name} has been created successfully.`,
      });
      
      // Reset form and refresh scene data
      form.resetFields();
      fetchScene();
      
    } catch (error: any) {
      notification.error({
        message: 'Failed to Create Component',
        description: error.response?.data?.detail || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render different form fields based on component type
  const renderTypeSpecificFields = () => {
    switch (componentType) {
      case 'diaphragm_wall':
        return (
          <>
            <Form.Item name="thickness" label="Thickness (m)" rules={[{ required: true }]}>
              <Input type="number" min={0} step={0.1} />
            </Form.Item>
            <Form.Item name="depth" label="Depth (m)" rules={[{ required: true }]}>
              <Input type="number" min={0} step={0.5} />
            </Form.Item>
          </>
        );
      case 'anchor_rod':
        return (
          <>
            <Form.Item name="free_length" label="Free Length (m)" rules={[{ required: true }]}>
              <Input type="number" min={0} step={0.5} />
            </Form.Item>
            <Form.Item name="bonded_length" label="Bonded Length (m)" rules={[{ required: true }]}>
              <Input type="number" min={0} step={0.5} />
            </Form.Item>
            <Form.Item name="diameter" label="Diameter (mm)" rules={[{ required: true }]}>
              <Input type="number" min={0} step={10} />
            </Form.Item>
            <Form.Item name="angle" label="Angle (degrees)" rules={[{ required: true }]}>
              <Input type="number" min={0} max={90} step={1} />
            </Form.Item>
          </>
        );
      case 'pile_arrangement':
        return (
          <>
            <Form.Item name="pile_diameter" label="Pile Diameter (m)" rules={[{ required: true }]}>
              <Input type="number" min={0} step={0.1} />
            </Form.Item>
            <Form.Item name="pile_spacing" label="Pile Spacing (m)" rules={[{ required: true }]}>
              <Input type="number" min={0} step={0.1} />
            </Form.Item>
            <Form.Item name="pile_depth" label="Pile Depth (m)" rules={[{ required: true }]}>
              <Input type="number" min={0} step={0.5} />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Card 
      title="Create New Component" 
      style={{ background: '#2c2c2c', borderColor: '#424242' }}
      headStyle={{ color: 'white' }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ type: 'diaphragm_wall' }}
      >
        <Form.Item name="name" label="Component Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        
        <Form.Item name="type" label="Component Type" rules={[{ required: true }]}>
          <Select onChange={handleTypeChange}>
            <Option value="diaphragm_wall">Diaphragm Wall</Option>
            <Option value="anchor_rod">Anchor Rod</Option>
            <Option value="pile_arrangement">Pile Arrangement</Option>
          </Select>
        </Form.Item>
        
        <Form.Item name="material_id" label="Material">
          <Select allowClear>
            {materials.map((mat: any) => (
              <Option key={mat.id} value={mat.id}>
                {mat.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        
        {renderTypeSpecificFields()}
        
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            Create Component
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ComponentCreationForm; 