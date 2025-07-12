import React, { useEffect } from 'react';
import { Form, InputNumber, Select, Button } from 'antd';
import { Tunnel } from '../../stores/components';
import { useSceneStore } from '../../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import { FormItemWithTooltip, AnimatedButton } from './FormControls';
import { SaveOutlined, ToolOutlined } from '@ant-design/icons';

const { Option } = Select;

interface TunnelFormProps {
  component: Tunnel;
}

const TunnelForm: React.FC<TunnelFormProps> = ({ component }) => {
  const [form] = Form.useForm();
  const { updateComponent } = useSceneStore(
    useShallow(state => ({
      updateComponent: state.updateComponent,
    }))
  );

  useEffect(() => {
    form.setFieldsValue({
      profile_type: component.profile.type,
      radius: component.profile.radius,
    });
  }, [component, form]);

  const handleSave = () => {
    const values = form.getFieldsValue();
    updateComponent(component.id, {
      ...component,
      profile: {
        type: values.profile_type,
        radius: values.radius,
      }
    });
  };

  return (
    <Form
      form={form}
      layout="vertical"
      className="settings-form"
      initialValues={{ 
        profile_type: component.profile.type,
        radius: component.profile.radius,
      }}
    >
      <div className="form-group">
        <div className="form-group-title">
          <ToolOutlined /> 隧道参数
        </div>
        <FormItemWithTooltip
          label="隧道剖面类型"
          name="profile_type"
          tooltip="选择隧道的剖面形状"
        >
          <Select>
            <Option value="circular">圆形</Option>
            {/* 未来可支持更多类型 */}
          </Select>
        </FormItemWithTooltip>

        <FormItemWithTooltip
          label="半径"
          name="radius"
          tooltip="隧道的半径，单位为米"
          rules={[{ required: true, message: '请输入隧道半径' }]}
        >
          <InputNumber 
            min={0} 
            step={0.5} 
            precision={2}
            style={{ width: '100%'}}
            addonAfter="m"
          />
        </FormItemWithTooltip>
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

export default TunnelForm; 