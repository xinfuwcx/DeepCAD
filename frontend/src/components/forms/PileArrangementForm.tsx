import React, { useEffect } from 'react';
import { Form, InputNumber, Select, Button } from 'antd';
import { PileArrangement } from '../../stores/components';
import { Material } from '../../stores/models';
import { useSceneStore } from '../../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';

const { Option } = Select;

interface PileArrangementFormProps {
  component: PileArrangement;
}

const PileArrangementForm: React.FC<PileArrangementFormProps> = ({ component }) => {
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
      pile_diameter: component.pile_diameter,
      pile_depth: component.pile_depth,
      pile_spacing: component.pile_spacing,
      material_id: component.material_id,
    });
  }, [component, form]);

  const onFinish = (values: { pile_diameter: number; pile_depth: number; pile_spacing: number; material_id: string | null; }) => {
    updateComponent(component.id, {
        ...component,
        ...values,
    });
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{ ...component }}
    >
      <Form.Item name="pile_diameter" label="Pile Diameter (m)" rules={[{ required: true }]}>
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="pile_depth" label="Pile Depth (m)" rules={[{ required: true }]}>
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="pile_spacing" label="Pile Spacing (m)" rules={[{ required: true }]}>
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

export default PileArrangementForm; 