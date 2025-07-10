import React, { useEffect } from 'react';
import { Form, InputNumber, Select, Button, notification } from 'antd';
import { DiaphragmWall } from '../../stores/components';
import { Material } from '../../stores/models';
import { useSceneStore } from '../../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';

const { Option } = Select;

interface DiaphragmWallFormProps {
  component: DiaphragmWall;
}

const DiaphragmWallForm: React.FC<DiaphragmWallFormProps> = ({ component }) => {
  const [form] = Form.useForm();
  const { scene, updateComponent } = useSceneStore(
    useShallow(state => ({
      scene: state.scene,
      updateComponent: state.updateComponent,
    }))
  );
  
  const materials = scene?.materials || [];

  useEffect(() => {
    form.setFieldsValue({
      thickness: component.thickness,
      depth: component.depth,
      material_id: component.material_id,
    });
  }, [component, form]);

  const onFinish = (values: { thickness: number; depth: number; material_id: string | null; }) => {
    updateComponent(component.id, {
        ...component,
        thickness: values.thickness,
        depth: values.depth,
        material_id: values.material_id,
    });
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        thickness: component.thickness,
        depth: component.depth,
        material_id: component.material_id,
      }}
    >
      <Form.Item name="thickness" label="Thickness (m)" rules={[{ required: true }]}>
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="depth" label="Depth (m)" rules={[{ required: true }]}>
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="material_id" label="Material">
        <Select allowClear>
          {materials.map((mat: Material) => (
            <Option key={mat.id} value={mat.id}>
              {mat.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" style={{ width: '100%' }} ghost>
          Update Component
        </Button>
      </Form.Item>
    </Form>
  );
};

export default DiaphragmWallForm; 