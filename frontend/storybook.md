# DeepCAD Storybook 组件文档系统

这是DeepCAD深基坑CAE分析平台的组件文档系统，基于Storybook构建，提供了完整的组件展示、交互测试和开发指南。

## 🚀 快速开始

### 安装依赖

```bash
# 使用npm
npm install

# 使用pnpm (推荐)
pnpm install
```

### 启动Storybook开发服务器

```bash
# 启动Storybook (端口6006)
npm run storybook

# 或使用pnpm
pnpm storybook
```

启动后访问 http://localhost:6006 查看组件文档。

### 构建静态文档

```bash
# 构建静态Storybook文档
npm run build-storybook

# 构建完成后可在storybook-static目录找到静态文件
```

## 📚 组件分类

### 🎨 UI基础组件 (UI)

#### Glass Components
现代毛玻璃效果的基础UI组件库，包含：
- `GlassCard` - 毛玻璃卡片组件
- `GlassButton` - 毛玻璃按钮组件
- `GlassInput` - 毛玻璃输入框组件
- `GlassSelect` - 毛玻璃选择器组件

**特性：**
- 现代毛玻璃视觉效果
- 多种变体和尺寸
- 完整的无障碍支持
- TypeScript类型安全

### 📝 表单控件 (Forms)

#### Form Controls
基于react-hook-form和zod的完整表单解决方案：
- `FormInput` - 文本输入控件
- `FormSelect` - 下拉选择控件
- `FormTextarea` - 多行文本控件
- `FormCheckbox` - 复选框控件
- `FormSlider` - 滑块控件
- `FormNumberInput` - 数字输入控件
- `FormSwitchGroup` - 开关组控件
- `FormSection` - 表单分组
- `FormFieldSet` - 字段集合
- `Form` - 表单容器

**特性：**
- 基于zod的类型安全验证
- 与react-hook-form深度集成
- 统一的设计系统
- 实时验证和错误提示

### 📁 导入工具 (Import)

#### DXF Quick Import
DXF文件快速导入组件：
- 支持拖拽和点击上传
- 自动文件分析和验证
- 智能的默认处理选项
- 详细的统计信息展示
- 错误处理和用户友好提示

**特性：**
- 快速导入CAD文件
- 几何建模工作流程集成
- 文件格式转换
- 数据预处理

### 🎮 3D可视化 (3D)

#### CAE 3D Viewport
专业级3D CAE分析可视化组件：
- 高性能3D渲染引擎
- 专业CAE分析工具
- 多种数据可视化模式
- 直观的交互控制

**特性：**
- 网格模型显示
- 材料属性可视化
- 分析结果渲染
- 多视角切换
- 测量工具
- 截面分析

## 📖 使用指南

### 查看组件文档

1. 启动Storybook服务器
2. 在左侧导航栏选择组件分类
3. 点击具体组件查看文档和示例
4. 使用Controls面板调整组件属性
5. 查看Docs页面了解详细使用方法

### 交互式测试

- **Controls面板**: 实时调整组件属性
- **Actions面板**: 查看组件事件触发
- **Viewport工具**: 测试响应式布局
- **Background工具**: 切换背景颜色
- **Measure工具**: 测量组件尺寸

### 代码示例

每个Story都包含完整的代码示例，可以直接复制使用：

```tsx
import { GlassCard, GlassButton } from '@/components/ui/GlassComponents';

function MyComponent() {
  return (
    <GlassCard variant="elevated" size="md">
      <h2>CAE分析结果</h2>
      <p>这是一个毛玻璃效果的卡片组件。</p>
      <GlassButton variant="primary">
        开始分析
      </GlassButton>
    </GlassCard>
  );
}
```

## 🔧 开发指南

### 创建新的Story

1. 在组件同级目录创建 `*.stories.tsx` 文件
2. 按照以下模板编写Story：

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import YourComponent from './YourComponent';

const meta: Meta<typeof YourComponent> = {
  title: 'Category/Component Name',
  component: YourComponent,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '组件描述',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    // 属性控制配置
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // 默认属性
  },
};
```

### Story命名规范

- 使用PascalCase命名Story
- 第一个Story命名为`Default`
- 其他Story使用描述性名称如`WithIcon`、`ErrorState`等

### 文档编写

- 为组件和Story提供清晰的描述
- 包含使用场景和最佳实践
- 添加交互测试用例
- 提供完整的代码示例

## 🎨 设计系统

Storybook集成了完整的DeepCAD设计系统：

### 颜色系统
- 主色调：蓝色系 (#3b82f6, #6366f1)
- 状态色：成功绿色、警告橙色、错误红色
- 中性色：灰色系，支持暗色模式
- 毛玻璃效果色：半透明叠加

### 字体系统
- 主字体：Inter
- 等宽字体：Fira Code
- 中文字体：PingFang SC

### 间距系统
- 基于8px网格系统
- 从4px到64px的标准间距

### 组件规范
- 一致的视觉样式
- 统一的交互行为
- 完整的无障碍支持

## 🧪 测试功能

### 交互测试

使用`@storybook/test`编写交互测试：

```tsx
import { within, userEvent, expect } from '@storybook/test';

export const InteractiveTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    const button = canvas.getByRole('button');
    await userEvent.click(button);
    await expect(button).toHaveTextContent('Clicked');
  },
};
```

### 视觉回归测试

配置视觉测试工具检测UI变化：

```bash
# 运行测试
npm run storybook:test
```

## 📱 响应式测试

使用Viewport插件测试不同设备尺寸：

- **Mobile**: 375px × 667px
- **Tablet**: 768px × 1024px  
- **Desktop**: 1024px × 768px
- **Wide**: 1440px × 900px

## 🚀 部署

### 构建静态文档

```bash
npm run build-storybook
```

### 部署到静态托管

构建完成后，`storybook-static`目录包含所有静态文件，可以部署到：

- GitHub Pages
- Netlify
- Vercel
- 任何静态托管服务

### CI/CD集成

在持续集成中自动构建和部署Storybook：

```yaml
# .github/workflows/storybook.yml
name: Build and Deploy Storybook
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Build Storybook
        run: npm run build-storybook
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./storybook-static
```

## 🛠️ 故障排除

### 常见问题

**Q: Storybook启动失败**
A: 检查Node.js版本是否≥18，删除node_modules重新安装依赖

**Q: 组件样式丢失**
A: 确保在`.storybook/preview.ts`中导入了CSS文件

**Q: TypeScript错误**
A: 检查组件类型定义，确保Stories类型正确

**Q: 构建失败**
A: 检查所有依赖是否正确安装，运行`npm run type-check`检查类型错误

### 性能优化

- 使用懒加载减少初始加载时间
- 优化Story数量，避免过多复杂示例
- 使用合适的文档分组

## 📞 支持

如有问题或建议，请联系：

- 📧 Email: dev@deepcad.com
- 🐛 Issues: [GitHub Issues](https://github.com/deepcad/deepcad/issues)
- 📖 文档: [在线文档](https://storybook.deepcad.com)

---

感谢使用DeepCAD Storybook组件文档系统！