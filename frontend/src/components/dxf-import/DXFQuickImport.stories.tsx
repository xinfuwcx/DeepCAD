import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { within, userEvent, expect } from '@storybook/test';
import DXFQuickImport from './DXFQuickImport';

const meta: Meta<typeof DXFQuickImport> = {
  title: 'Import/DXF Quick Import',
  component: DXFQuickImport,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
DXF快速导入组件提供了简化的DXF文件导入流程。用户可以通过拖拽或点击选择的方式
上传DXF文件，组件会自动处理文件分析和转换，并显示导入结果。

### 核心特性
- 📁 支持拖拽和点击上传
- 🔍 自动文件分析和验证
- ⚙️ 智能的默认处理选项
- 📊 详细的统计信息展示
- 🚨 错误处理和用户友好的提示
- 📱 响应式设计

### 使用场景
- 快速导入CAD文件
- 几何建模工作流程
- 文件格式转换
- 数据预处理
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onImportComplete: {
      action: 'import-completed',
      description: '导入完成时的回调函数',
    },
    className: {
      control: 'text',
      description: '自定义CSS类名',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 默认状态
export const Default: Story = {
  args: {
    onImportComplete: action('import-completed'),
    className: '',
  },
  parameters: {
    docs: {
      description: {
        story: '默认的DXF快速导入组件，显示文件上传区域。',
      },
    },
  },
};

// 自定义样式
export const CustomStyling: Story = {
  args: {
    onImportComplete: action('import-completed'),
    className: 'border-2 border-dashed border-blue-300 bg-blue-50',
  },
  parameters: {
    docs: {
      description: {
        story: '使用自定义样式的DXF导入组件。',
      },
    },
  },
};

// 集成到更大布局中
export const InLayout: Story = {
  render: (args) => (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">几何建模工作区</h1>
        <p className="text-gray-600">
          导入DXF文件开始您的几何建模工作
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">文件导入</h2>
          <DXFQuickImport {...args} />
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">最近的文件</h2>
          <div className="space-y-3">
            {[
              { name: 'building_plan.dxf', date: '2024-01-15', status: '已完成' },
              { name: 'foundation.dxf', date: '2024-01-14', status: '处理中' },
              { name: 'elevation.dxf', date: '2024-01-13', status: '已完成' },
            ].map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-gray-500">{file.date}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  file.status === '已完成' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {file.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ),
  args: {
    onImportComplete: action('import-completed'),
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: '展示了DXF导入组件在完整工作区布局中的应用。',
      },
    },
  },
};

// 模拟导入成功状态
export const ImportSuccess: Story = {
  render: (args) => {
    // 这里我们模拟一个已完成导入的状态
    const mockResult = {
      analysis: {
        statistics: {
          total_entities: 142,
          layers_count: 8,
        },
        validation_issues: [
          { severity: 'warning', message: '发现2个零长度线' },
          { severity: 'info', message: '文件格式: AutoCAD R2018' },
        ],
      },
      processing: {
        success: true,
        processed_entities: 140,
        skipped_entities: 2,
        repaired_entities: 3,
        processing_time: 1.234,
        output_files: ['processed_building.dxf', 'converted_mesh.msh'],
      },
      success: true,
    };

    return (
      <div className="w-96">
        <DXFQuickImport 
          {...args}
          onImportComplete={() => action('import-completed')(mockResult)}
        />
        
        {/* 模拟显示结果 */}
        <div className="mt-6 bg-white rounded-lg border p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-green-700">DXF导入成功</p>
              <p className="text-sm text-gray-500">building_plan.dxf</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center bg-blue-50 rounded-lg p-3">
              <p className="text-lg font-bold text-blue-600">142</p>
              <p className="text-sm text-gray-600">实体数</p>
            </div>
            <div className="text-center bg-green-50 rounded-lg p-3">
              <p className="text-lg font-bold text-green-600">8</p>
              <p className="text-sm text-gray-600">图层数</p>
            </div>
            <div className="text-center bg-yellow-50 rounded-lg p-3">
              <p className="text-lg font-bold text-yellow-600">1</p>
              <p className="text-sm text-gray-600">警告</p>
            </div>
            <div className="text-center bg-red-50 rounded-lg p-3">
              <p className="text-lg font-bold text-red-600">0</p>
              <p className="text-sm text-gray-600">错误</p>
            </div>
          </div>
          
          <div className="flex justify-between">
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              导入新文件
            </button>
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                生成网格
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                查看详情
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
  args: {
    onImportComplete: action('import-completed'),
  },
  parameters: {
    docs: {
      description: {
        story: '模拟成功导入DXF文件后的界面状态。',
      },
    },
  },
};

// 模拟错误状态
export const ImportError: Story = {
  render: (args) => {
    return (
      <div className="w-96">
        {/* 模拟错误状态的DXF导入组件 */}
        <div className="bg-white rounded-lg border p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">DXF文件导入</h3>
            <p className="text-sm text-gray-600">快速导入DXF文件并转换为几何模型</p>
          </div>

          <div className="border-2 border-dashed border-red-300 bg-red-50 rounded-lg p-6 text-center">
            <svg className="mx-auto h-8 w-8 mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            
            <p className="text-red-600 font-medium mb-2">导入失败</p>
            <p className="text-sm text-red-500 mb-3">不支持的文件格式或文件已损坏</p>
            <button
              onClick={action('retry-clicked')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              重新选择
            </button>
          </div>
        </div>
        
        <DXFQuickImport {...args} className="mt-4" />
      </div>
    );
  },
  args: {
    onImportComplete: action('import-completed'),
  },
  parameters: {
    docs: {
      description: {
        story: '展示DXF文件导入失败时的错误状态和用户界面。',
      },
    },
  },
};

// 交互测试
export const InteractiveDemo: Story = {
  render: (args) => (
    <div className="w-96">
      <DXFQuickImport 
        {...args}
        data-testid="dxf-import-component"
      />
    </div>
  ),
  args: {
    onImportComplete: action('import-completed'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // 查找上传区域
    const uploadArea = canvas.getByText(/拖拽DXF文件到此处/);
    await expect(uploadArea).toBeInTheDocument();
    
    // 查找文件选择按钮
    const selectButton = canvas.getByText('选择文件');
    await expect(selectButton).toBeInTheDocument();
    
    // 模拟点击选择文件按钮
    await userEvent.click(selectButton);
  },
  parameters: {
    docs: {
      description: {
        story: '包含自动化交互测试的DXF导入组件演示。',
      },
    },
  },
};

// 响应式布局测试
export const ResponsiveLayout: Story = {
  render: (args) => (
    <div className="space-y-6">
      {/* 移动端布局 */}
      <div className="sm:hidden">
        <h3 className="text-lg font-semibold mb-4">移动端布局</h3>
        <div className="w-full max-w-sm">
          <DXFQuickImport {...args} />
        </div>
      </div>
      
      {/* 平板布局 */}
      <div className="hidden sm:block md:hidden">
        <h3 className="text-lg font-semibold mb-4">平板布局</h3>
        <div className="w-full max-w-md">
          <DXFQuickImport {...args} />
        </div>
      </div>
      
      {/* 桌面布局 */}
      <div className="hidden md:block">
        <h3 className="text-lg font-semibold mb-4">桌面布局</h3>
        <div className="w-full max-w-lg">
          <DXFQuickImport {...args} />
        </div>
      </div>
    </div>
  ),
  args: {
    onImportComplete: action('import-completed'),
  },
  parameters: {
    viewport: {
      defaultViewport: 'responsive',
    },
    docs: {
      description: {
        story: '展示DXF导入组件在不同设备尺寸下的响应式布局。',
      },
    },
  },
};