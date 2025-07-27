import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { within, userEvent, expect } from '@storybook/test';
import { GlassCard, GlassButton, GlassInput } from './GlassComponents';

const meta: Meta<typeof GlassCard> = {
  title: 'UI/Glass Components',
  component: GlassCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
Glass组件库提供了具有现代毛玻璃效果的UI组件。这些组件使用先进的CSS backdrop-filter
技术，创造出优雅的半透明效果，适用于现代Web应用的界面设计。

### 核心特性
- 🌟 现代毛玻璃视觉效果
- 🎨 多种变体和尺寸选择  
- ♿ 完整的无障碍支持
- 📱 响应式设计
- 🎯 TypeScript支持
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outline'],
      description: '卡片变体',
    },
    children: {
      control: 'text',
      description: '子组件内容',
    },
    className: {
      control: 'text',
      description: '自定义CSS类名',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 基础Glass卡片故事
export const DefaultCard: Story = {
  args: {
    variant: 'default',
    size: 'md',
    padding: 'md',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">默认Glass卡片</h3>
        <p className="text-gray-600">
          这是一个具有毛玻璃效果的默认卡片组件。它提供了优雅的半透明背景效果。
        </p>
      </div>
    ),
  },
};

export const ElevatedCard: Story = {
  args: {
    variant: 'elevated',
    size: 'md',
    padding: 'md',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">悬浮Glass卡片</h3>
        <p className="text-gray-600">
          悬浮变体具有更强的阴影效果，适用于需要突出显示的内容。
        </p>
      </div>
    ),
  },
};

export const OutlineCard: Story = {
  args: {
    variant: 'outline',
    size: 'md', 
    padding: 'md',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">轮廓Glass卡片</h3>
        <p className="text-gray-600">
          轮廓变体具有明显的边框，适用于需要清晰界限的布局。
        </p>
      </div>
    ),
  },
};

// Glass按钮组件故事
export const ButtonVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-x-2">
        <GlassButton variant="primary" onClick={action('primary-clicked')}>
          主要按钮
        </GlassButton>
        <GlassButton variant="secondary" onClick={action('secondary-clicked')}>
          次要按钮
        </GlassButton>
        <GlassButton variant="ghost" onClick={action('ghost-clicked')}>
          幽灵按钮
        </GlassButton>
        <GlassButton variant="ghost" onClick={action('outline-clicked')}>
          轮廓按钮
        </GlassButton>
      </div>
      <div className="space-x-2">
        <GlassButton  variant="primary">小尺寸</GlassButton>
        <GlassButton  variant="primary">中尺寸</GlassButton>
        <GlassButton  variant="primary">大尺寸</GlassButton>
      </div>
      <div className="space-x-2">
        <GlassButton variant="primary" disabled>
          禁用状态
        </GlassButton>
        <GlassButton variant="primary" loading>
          加载状态
        </GlassButton>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '展示了Glass按钮的各种变体、尺寸和状态。',
      },
    },
  },
};

// Glass输入框组件故事
export const InputVariants: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <GlassInput 
        placeholder="默认输入框"
        onChange={action('input-changed')}
      />
      <GlassInput 
        placeholder="带标签的输入框"
        label="用户名"
        onChange={action('input-changed')}
      />
      <GlassInput 
        placeholder="错误状态"
        label="邮箱地址"
        error="请输入有效的邮箱地址"
        onChange={action('input-changed')}
      />
      <GlassInput 
        placeholder="禁用状态"
        label="禁用字段"
        disabled
        onChange={action('input-changed')}
      />
      <GlassInput 
        type="password"
        placeholder="密码输入"
        label="密码"
        onChange={action('input-changed')}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '展示了Glass输入框的各种状态和类型。',
      },
    },
  },
};

// Glass选择器组件故事 (使用常规输入框演示)
export const SelectVariants: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <GlassInput
        placeholder="请选择一个选项"
        onChange={action('input-changed')}
      />
      <GlassInput
        label="语言设置"
        value="zh"
        onChange={action('input-changed')}
      />
      <GlassInput
        label="禁用状态"
        disabled
        onChange={action('input-changed')}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '展示了Glass选择器的各种配置和状态。',
      },
    },
  },
};

// 复杂布局示例
export const ComplexLayout: Story = {
  render: () => (
    <GlassCard variant="elevated"   className="w-96">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-2">用户配置</h2>
          <p className="text-gray-600 text-sm">
            配置您的用户偏好设置
          </p>
        </div>
        
        <div className="space-y-4">
          <GlassInput
            label="用户名"
            placeholder="请输入用户名"
            onChange={action('username-changed')}
          />
          
          <GlassInput
            label="邮箱"
            type="email"
            placeholder="your@email.com"
            onChange={action('email-changed')}
          />
          
          <GlassInput
            label="主题偏好"
            placeholder="自动切换"
            onChange={action('theme-changed')}
          />
          
          <GlassInput
            label="语言"
            value="中文"
            onChange={action('language-changed')}
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <GlassButton variant="ghost" onClick={action('cancel-clicked')}>
            取消
          </GlassButton>
          <GlassButton variant="primary" onClick={action('save-clicked')}>
            保存设置
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  ),
  parameters: {
    docs: {
      description: {
        story: '展示了Glass组件在复杂表单布局中的应用示例。',
      },
    },
  },
};

// 交互测试
export const InteractiveTest: Story = {
  render: () => (
    <GlassCard variant="default"   className="w-80">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">交互测试</h3>
        <GlassInput
          label="测试输入"
          placeholder="请输入内容"
          data-testid="test-input"
          onChange={action('test-input-changed')}
        />
        <GlassButton 
          variant="primary" 
          data-testid="test-button"
          onClick={action('test-button-clicked')}
        >
          测试按钮
        </GlassButton>
      </div>
    </GlassCard>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // 测试输入框交互
    const input = canvas.getByTestId('test-input');
    await userEvent.type(input, 'Hello Storybook!');
    await expect(input).toHaveValue('Hello Storybook!');
    
    // 测试按钮点击
    const button = canvas.getByTestId('test-button');
    await userEvent.click(button);
  },
  parameters: {
    docs: {
      description: {
        story: '包含自动化交互测试的组件示例。',
      },
    },
  },
};