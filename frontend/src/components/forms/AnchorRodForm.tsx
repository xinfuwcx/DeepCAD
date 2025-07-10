import React, { useEffect } from 'react';
import { Form } from 'antd';
import { useSceneStore } from '../../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import { 
  AnimatedNumberInput, 
  AnimatedSelect, 
  AnimatedButton, 
  FormItemWithTooltip 
} from './FormControls';
import { SaveOutlined, ToolOutlined } from '@ant-design/icons';

interface AnchorRodProps {
  component: any;
}

const AnchorRodForm: React.FC<AnchorRodProps> = ({ component }) => {
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
      free_length: component.free_length,
      bonded_length: component.bonded_length,
      diameter: component.diameter,
      angle: component.angle,
      material_id: component.material_id,
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
      initialValues={{
        free_length: component.free_length,
        bonded_length: component.bonded_length,
        diameter: component.diameter,
        angle: component.angle,
        material_id: component.material_id,
      }}
    >
      <div className="form-group">
        <div className="form-group-title">
          <ToolOutlined /> 锚杆参数
        </div>
        
        <div className="form-row">
          <div className="form-col form-col-6">
            <FormItemWithTooltip 
              label="自由段长度" 
              name="free_length"
              tooltip="锚杆的自由段长度，单位为米"
            >
              <AnimatedNumberInput 
                min={0} 
                step={0.5} 
                precision={2}
                unit="m" 
              />
            </FormItemWithTooltip>
          </div>
          
          <div className="form-col form-col-6">
            <FormItemWithTooltip 
              label="锚固段长度" 
              name="bonded_length"
              tooltip="锚杆的锚固段长度，单位为米"
            >
              <AnimatedNumberInput 
                min={0} 
                step={0.5} 
                precision={2}
                unit="m" 
              />
            </FormItemWithTooltip>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-col form-col-6">
            <FormItemWithTooltip 
              label="直径" 
              name="diameter"
              tooltip="锚杆的直径，单位为毫米"
            >
              <AnimatedNumberInput 
                min={0} 
                step={10} 
                precision={0}
                unit="mm" 
              />
            </FormItemWithTooltip>
          </div>
          
          <div className="form-col form-col-6">
            <FormItemWithTooltip 
              label="倾角" 
              name="angle"
              tooltip="锚杆与水平面的夹角，单位为度"
            >
              <AnimatedNumberInput 
                min={0} 
                max={90} 
                step={1}
                precision={0}
                unit="°" 
              />
            </FormItemWithTooltip>
          </div>
        </div>
        
        <FormItemWithTooltip 
          label="材料" 
          name="material_id"
          tooltip="选择锚杆的材料类型"
        >
          <AnimatedSelect
            options={materials.map((material: any) => ({
              value: material.id,
              label: material.name
            }))}
            placeholder="选择材料"
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

export default AnchorRodForm; 