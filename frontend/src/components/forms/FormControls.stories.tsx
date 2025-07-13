import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormCheckbox,
  FormSlider,
  FormNumberInput,
  FormSwitchGroup,
  FormSection,
  FormFieldSet,
  Form
} from './FormControls';

// 定义表单验证模式
const sampleSchema = z.object({
  name: z.string().min(2, '姓名至少需要2个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  age: z.number().min(18, '年龄必须大于18岁').max(100, '年龄不能超过100岁'),
  description: z.string().max(500, '描述不能超过500字符'),
  category: z.string().min(1, '请选择一个分类'),
  notifications: z.boolean(),
  volume: z.number().min(0).max(100),
  features: z.array(z.string()).min(1, '请至少选择一个功能'),
});

type SampleFormData = z.infer<typeof sampleSchema>;

const meta: Meta<typeof FormInput> = {
  title: 'Forms/Form Controls',
  component: FormInput,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
表单控件组件库提供了基于react-hook-form和zod的完整表单解决方案。
这些组件具有统一的设计风格，内置验证功能，并支持TypeScript类型安全。

### 核心特性
- 🔒 基于zod的类型安全验证
- 🎯 与react-hook-form深度集成
- 🎨 统一的设计系统
- ♿ 完整的无障碍支持
- 📝 丰富的表单控件类型
- 🔄 实时验证和错误提示
        `,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// 基础输入控件示例
export const BasicInputs: Story = {
  render: () => {
    const form = useForm<SampleFormData>({
      resolver: zodResolver(sampleSchema),
      defaultValues: {
        name: '',
        email: '',
        age: 25,
        description: '',
        category: '',
        notifications: false,
        volume: 50,
        features: [],
      },
    });

    const onSubmit = (data: SampleFormData) => {
      action('form-submitted')(data);
    };

    return (
      <Form form={form} onSubmit={onSubmit} className="w-96 space-y-6">
        <FormSection title="基本信息" description="请填写您的基本信息">
          <FormInput
            name="name"
            label="姓名"
            placeholder="请输入您的姓名"
            required
          />
          
          <FormInput
            name="email"
            type="email"
            label="邮箱地址"
            placeholder="your@email.com"
            required
          />
          
          <FormNumberInput
            name="age"
            label="年龄"
            placeholder="请输入年龄"
            min={18}
            max={100}
            required
          />
        </FormSection>

        <FormSection title="详细信息" description="请提供更多详细信息">
          <FormSelect
            name="category"
            label="分类"
            placeholder="请选择分类"
            options={[
              { value: 'student', label: '学生' },
              { value: 'teacher', label: '教师' },
              { value: 'engineer', label: '工程师' },
              { value: 'other', label: '其他' },
            ]}
            required
          />
          
          <FormTextarea
            name="description"
            label="个人描述"
            placeholder="请简单介绍一下自己..."
            rows={4}
          />
        </FormSection>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          提交表单
        </button>
      </Form>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '展示了基础表单输入控件的使用，包括文本输入、邮箱输入、数字输入、选择器和文本域。',
      },
    },
  },
};

// 高级控件示例
export const AdvancedControls: Story = {
  render: () => {
    const form = useForm<SampleFormData>({
      resolver: zodResolver(sampleSchema),
      defaultValues: {
        name: '',
        email: '',
        age: 25,
        description: '',
        category: '',
        notifications: true,
        volume: 75,
        features: ['feature1'],
      },
    });

    const onSubmit = (data: SampleFormData) => {
      action('advanced-form-submitted')(data);
    };

    return (
      <Form form={form} onSubmit={onSubmit} className="w-96 space-y-6">
        <FormSection title="偏好设置" description="配置您的个人偏好">
          <FormCheckbox
            name="notifications"
            label="接收通知"
            description="允许我们向您发送重要更新和通知"
          />
          
          <FormSlider
            name="volume"
            label="音量设置"
            min={0}
            max={100}
            step={5}
            marks={{
              0: '静音',
              50: '中等',
              100: '最大',
            }}
          />
          
          <FormSwitchGroup
            name="features"
            label="功能选择"
            description="选择您需要的功能"
            options={[
              { 
                value: 'feature1', 
                label: '自动保存', 
                description: '自动保存您的工作进度' 
              },
              { 
                value: 'feature2', 
                label: '暗色主题', 
                description: '使用暗色界面主题' 
              },
              { 
                value: 'feature3', 
                label: '高级分析', 
                description: '启用高级数据分析功能' 
              },
            ]}
          />
        </FormSection>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          保存设置
        </button>
      </Form>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '展示了高级表单控件，包括复选框、滑块和开关组。',
      },
    },
  },
};

// 字段集示例
export const FieldSetExample: Story = {
  render: () => {
    const form = useForm({
      defaultValues: {
        personalInfo: {
          firstName: '',
          lastName: '',
          phone: '',
        },
        address: {
          street: '',
          city: '',
          zipCode: '',
        },
        preferences: {
          newsletter: false,
          smsNotifications: false,
        },
      },
    });

    const onSubmit = (data: any) => {
      action('fieldset-form-submitted')(data);
    };

    return (
      <Form form={form} onSubmit={onSubmit} className="w-[500px] space-y-6">
        <FormFieldSet
          legend="个人信息"
          description="请填写您的基本个人信息"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              name="personalInfo.firstName"
              label="姓"
              placeholder="请输入姓氏"
            />
            <FormInput
              name="personalInfo.lastName"
              label="名"
              placeholder="请输入名字"
            />
          </div>
          <FormInput
            name="personalInfo.phone"
            type="tel"
            label="电话号码"
            placeholder="请输入电话号码"
          />
        </FormFieldSet>

        <FormFieldSet
          legend="地址信息"
          description="请填写您的居住地址"
        >
          <FormInput
            name="address.street"
            label="街道地址"
            placeholder="请输入街道地址"
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              name="address.city"
              label="城市"
              placeholder="请输入城市"
            />
            <FormInput
              name="address.zipCode"
              label="邮政编码"
              placeholder="请输入邮编"
            />
          </div>
        </FormFieldSet>

        <FormFieldSet
          legend="通知偏好"
          description="选择您希望接收的通知类型"
        >
          <FormCheckbox
            name="preferences.newsletter"
            label="邮件通讯"
            description="接收我们的定期邮件通讯"
          />
          <FormCheckbox
            name="preferences.smsNotifications"
            label="短信通知"
            description="接收重要的短信通知"
          />
        </FormFieldSet>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          提交信息
        </button>
      </Form>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '展示了如何使用FormFieldSet组织相关的表单字段，支持嵌套数据结构。',
      },
    },
  },
};

// 错误状态示例
export const ErrorStates: Story = {
  render: () => {
    const form = useForm<SampleFormData>({
      resolver: zodResolver(sampleSchema),
      mode: 'onChange',
      defaultValues: {
        name: '',
        email: 'invalid-email',
        age: 15, // 低于最小值
        description: '',
        category: '',
        notifications: false,
        volume: 50,
        features: [],
      },
    });

    const onSubmit = (data: SampleFormData) => {
      action('error-form-submitted')(data);
    };

    return (
      <Form form={form} onSubmit={onSubmit} className="w-96 space-y-6">
        <FormSection 
          title="错误状态演示" 
          description="以下字段包含验证错误"
        >
          <FormInput
            name="name"
            label="姓名"
            placeholder="请输入至少2个字符"
            required
          />
          
          <FormInput
            name="email"
            type="email"
            label="邮箱地址"
            placeholder="请输入有效邮箱"
            required
          />
          
          <FormNumberInput
            name="age"
            label="年龄"
            placeholder="必须大于18岁"
            min={18}
            max={100}
            required
          />
          
          <FormSwitchGroup
            name="features"
            label="功能选择"
            description="请至少选择一个功能"
            options={[
              { value: 'feature1', label: '功能 1' },
              { value: 'feature2', label: '功能 2' },
              { value: 'feature3', label: '功能 3' },
            ]}
          />
        </FormSection>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          尝试提交 (会显示错误)
        </button>
      </Form>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '展示了表单验证错误的显示方式和用户体验。',
      },
    },
  },
};

// 只读/禁用状态示例
export const DisabledStates: Story = {
  render: () => {
    const form = useForm({
      defaultValues: {
        readonlyField: '这是只读字段',
        disabledField: '这是禁用字段',
        normalField: '',
        disabledSelect: 'option1',
        disabledCheckbox: true,
        disabledSlider: 25,
      },
    });

    return (
      <Form form={form} onSubmit={() => {}} className="w-96 space-y-6">
        <FormSection 
          title="禁用/只读状态" 
          description="演示不同的字段状态"
        >
          <FormInput
            name="readonlyField"
            label="只读字段"
            readOnly
          />
          
          <FormInput
            name="disabledField"
            label="禁用字段"
            disabled
          />
          
          <FormInput
            name="normalField"
            label="正常字段"
            placeholder="正常输入字段"
          />
          
          <FormSelect
            name="disabledSelect"
            label="禁用选择器"
            disabled
            options={[
              { value: 'option1', label: '选项 1' },
              { value: 'option2', label: '选项 2' },
            ]}
          />
          
          <FormCheckbox
            name="disabledCheckbox"
            label="禁用复选框"
            disabled
          />
          
          <FormSlider
            name="disabledSlider"
            label="禁用滑块"
            disabled
            min={0}
            max={100}
          />
        </FormSection>
      </Form>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '展示了表单控件的只读和禁用状态。',
      },
    },
  },
};