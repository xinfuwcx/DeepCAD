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
  
  const { scene, loadScene } = useSceneStore(
    useShallow(state => ({
      scene: state.scene,
      loadScene: state.loadScene,
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
        case 'excavation':
          Object.assign(componentData, {
            depth: values.depth,
            // Assuming profile_points will be set later via interactive drawing
            profile_points: [], 
          });
          break;
        case 'tunnel':
          Object.assign(componentData, {
            // Assuming path and profile will be set later
            path: [], 
            profile: { type: 'circular', radius: values.radius }
          });
          break;
      }
      
      // Send to backend API
      await axios.post('http://localhost:8080/api/components', componentData);
      
      notification.success({
        message: '组件创建成功',
        description: `${values.name} 已成功创建。`,
      });
      
      // Reset form and refresh scene data
      form.resetFields();
      // Could call loadScene with a scene ID if needed
      // loadScene(sceneId);
      
    } catch (error: any) {
      notification.error({
        message: '组件创建失败',
        description: error.response?.data?.detail || '发生了意外错误。',
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
            <Form.Item name="thickness" label="厚度 (m)" rules={[{ required: true }]}>
              <Input type="number" min={0} step={0.1} />
            </Form.Item>
            <Form.Item name="depth" label="深度 (m)" rules={[{ required: true }]}>
              <Input type="number" min={0} step={0.5} />
            </Form.Item>
          </>
        );
      case 'anchor_rod':
        return (
          <>
            <Form.Item name="free_length" label="自由段长度 (m)" rules={[{ required: true }]}>
              <Input type="number" min={0} step={0.5} />
            </Form.Item>
            <Form.Item name="bonded_length" label="锚固段长度 (m)" rules={[{ required: true }]}>
              <Input type="number" min={0} step={0.5} />
            </Form.Item>
            <Form.Item name="diameter" label="直径 (mm)" rules={[{ required: true }]}>
              <Input type="number" min={0} step={10} />
            </Form.Item>
            <Form.Item name="angle" label="角度 (°)" rules={[{ required: true }]}>
              <Input type="number" min={0} max={90} step={1} />
            </Form.Item>
          </>
        );
      case 'pile_arrangement':
        return (
          <>
            <Form.Item name="pile_diameter" label="桩径 (m)" rules={[{ required: true }]}>
              <Input type="number" min={0} step={0.1} />
            </Form.Item>
            <Form.Item name="pile_spacing" label="桩间距 (m)" rules={[{ required: true }]}>
              <Input type="number" min={0} step={0.1} />
            </Form.Item>
            <Form.Item name="pile_depth" label="桩深 (m)" rules={[{ required: true }]}>
              <Input type="number" min={0} step={0.5} />
            </Form.Item>
          </>
        );
      case 'excavation':
        return (
          <Form.Item name="depth" label="开挖深度 (m)" rules={[{ required: true }]}>
            <Input type="number" min={0} step={1} />
          </Form.Item>
        );
      case 'tunnel':
        return (
          <Form.Item name="radius" label="隧道半径 (m)" rules={[{ required: true }]}>
            <Input type="number" min={0} step={0.5} />
          </Form.Item>
        );
      default:
        return null;
    }
  };

  return (
    <Card 
      title="创建新组件" 
      style={{ background: '#2c2c2c', borderColor: '#424242' }}
      headStyle={{ color: 'white' }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ type: 'diaphragm_wall' }}
      >
        <Form.Item name="name" label="组件名称" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        
        <Form.Item name="type" label="组件类型" rules={[{ required: true }]}>
          <Select onChange={handleTypeChange}>
            <Option value="diaphragm_wall">地连墙</Option>
            <Option value="anchor_rod">锚杆</Option>
            <Option value="pile_arrangement">排桩</Option>
            <Option value="excavation">开挖体</Option>
            <Option value="tunnel">隧道</Option>
          </Select>
        </Form.Item>
        
        <Form.Item name="material_id" label="材料">
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
            创建组件
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ComponentCreationForm; 