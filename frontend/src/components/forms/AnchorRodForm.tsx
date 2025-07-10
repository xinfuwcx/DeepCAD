import React, { useEffect } from 'react';
import { Form, InputNumber, Select, Button } from 'antd';
import { AnchorRod } from '../../stores/components';
import { Material } from '../../stores/models';
import { useSceneStore } from '../../stores/useSceneStore';

const { Option } = Select;

interface AnchorRodFormProps {
  component: AnchorRod;
}

const AnchorRodForm: React.FC<AnchorRodFormProps> = ({ component }) => {
  const [form] = Form.useForm();
  const { scene, updateComponent } = useSceneStore(state => ({
    scene: state.scene,
    updateComponent: state.updateComponent,
  }));
  
  const materials = scene?.materials || [];

  useEffect(() => {
    form.setFieldsValue({
      free_length: component.free_length,
      bonded_length: component.bonded_length,
      pre_stress: component.pre_stress,
      material_id: component.material_id,
    });
  }, [component, form]);

  const onFinish = (values: { free_length: number; bonded_length: number; pre_stress: number; material_id: string | null; }) => {
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
      <Form.Item name="free_length" label="Free Length (m)" rules={[{ required: true }]}>
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="bonded_length" label="Bonded Length (m)" rules={[{ required: true }]}>
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="pre_stress" label="Pre-stress (kN)" rules={[{ required: true }]}>
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

export default AnchorRodForm; 