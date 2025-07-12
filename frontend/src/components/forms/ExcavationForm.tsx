import React, { useEffect } from 'react';
import { Form, InputNumber, Button } from 'antd';
import { Excavation } from '../../stores/components';
import { useSceneStore } from '../../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import { FormItemWithTooltip, AnimatedButton } from './FormControls';
import { SaveOutlined, ToolOutlined } from '@ant-design/icons';

interface ExcavationFormProps {
  component: Excavation;
}

const ExcavationForm: React.FC<ExcavationFormProps> = ({ component }) => {
  const [form] = Form.useForm();
  const { updateComponent } = useSceneStore(
    useShallow(state => ({
      updateComponent: state.updateComponent,
    }))
  );

  useEffect(() => {
    form.setFieldsValue({
      depth: component.depth,
    });
  }, [component, form]);

  const handleSave = () => {
    const values = form.getFieldsValue();
    updateComponent(component.id, {
      ...component,
      ...values,
    });
  };

  return (
    <Form
      form={form}
      layout="vertical"
      className="settings-form"
      initialValues={{ depth: component.depth }}
    >
      <div className="form-group">
        <div className="form-group-title">
          <ToolOutlined /> 基坑参数
        </div>
        <FormItemWithTooltip
          label="开挖深度"
          name="depth"
          tooltip="基坑的开挖深度，单位为米"
          rules={[{ required: true, message: '请输入开挖深度' }]}
        >
          <InputNumber 
            min={0} 
            step={1} 
            precision={2}
            style={{ width: '100%'}}
            addonAfter="m"
          />
        </FormItemWithTooltip>
        {/* 未来可以添加更多参数，如坡度、分层开挖等 */}
      </div>

      <div className="form-actions">
        <AnimatedButton 
          type="primary" 
          onClick={handleSave}
          icon={<SaveOutlined />}
          className="hover-scale"
        >
          保存更改
        </AnimatedButton>
      </div>
    </Form>
  );
};

export default ExcavationForm; 