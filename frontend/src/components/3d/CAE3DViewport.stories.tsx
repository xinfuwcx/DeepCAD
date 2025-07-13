import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import CAE3DViewport from './CAE3DViewport';

const meta: Meta<typeof CAE3DViewport> = {
  title: '3D/CAE 3D Viewport',
  component: CAE3DViewport,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
CAE 3D视口组件是DeepCAD平台的核心3D可视化组件。它基于Three.js构建，
提供了专业级的CAE分析结果可视化功能。

### 核心特性
- 🎯 高性能3D渲染引擎
- 🔧 专业CAE分析工具
- 📊 多种数据可视化模式
- 🎮 直观的交互控制
- 📱 响应式设计
- 🎨 可自定义的材质系统

### 支持的功能
- 网格模型显示
- 材料属性可视化
- 分析结果渲染
- 多视角切换
- 测量工具
- 截面分析
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    width: {
      control: { type: 'number', min: 300, max: 1920, step: 50 },
      description: '视口宽度',
    },
    height: {
      control: { type: 'number', min: 200, max: 1080, step: 50 },
      description: '视口高度',
    },
    showControls: {
      control: 'boolean',
      description: '显示控制面板',
    },
    showGrid: {
      control: 'boolean',
      description: '显示网格',
    },
    backgroundColor: {
      control: 'color',
      description: '背景颜色',
    },
    onModelLoad: {
      action: 'model-loaded',
      description: '模型加载完成回调',
    },
    onError: {
      action: 'viewport-error',
      description: '错误处理回调',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 默认视口
export const Default: Story = {
  args: {
    width: 800,
    height: 600,
    showControls: true,
    showGrid: true,
    backgroundColor: '#f0f4f8',
    onModelLoad: action('model-loaded'),
    onError: action('viewport-error'),
  },
  parameters: {
    docs: {
      description: {
        story: '默认配置的3D视口，包含基本的控制和网格显示。',
      },
    },
  },
};

// 紧凑视口
export const Compact: Story = {
  args: {
    width: 400,
    height: 300,
    showControls: false,
    showGrid: false,
    backgroundColor: '#ffffff',
    onModelLoad: action('model-loaded'),
    onError: action('viewport-error'),
  },
  parameters: {
    docs: {
      description: {
        story: '紧凑型3D视口，适用于预览或嵌入式场景。',
      },
    },
  },
};

// 全屏视口
export const Fullscreen: Story = {
  render: (args) => (
    <div className="w-screen h-screen bg-gray-900">
      <CAE3DViewport 
        {...args}
        width={window.innerWidth}
        height={window.innerHeight}
      />
    </div>
  ),
  args: {
    showControls: true,
    showGrid: true,
    backgroundColor: '#1a1a1a',
    onModelLoad: action('model-loaded'),
    onError: action('viewport-error'),
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: '全屏3D视口，适用于专业CAE分析工作。',
      },
    },
  },
};

// 模拟网格数据
export const WithMeshData: Story = {
  render: (args) => {
    // 模拟网格数据
    const mockMeshData = {
      vertices: new Float32Array([
        // 立方体顶点数据
        -1, -1, -1,  1, -1, -1,  1,  1, -1, -1,  1, -1, // 底面
        -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,  1, // 顶面
      ]),
      faces: new Uint16Array([
        0, 1, 2,  0, 2, 3,    // 底面
        4, 7, 6,  4, 6, 5,    // 顶面
        0, 4, 5,  0, 5, 1,    // 前面
        2, 6, 7,  2, 7, 3,    // 后面
        0, 3, 7,  0, 7, 4,    // 左面
        1, 5, 6,  1, 6, 2,    // 右面
      ]),
      materials: [
        {
          id: 'concrete',
          name: '混凝土',
          color: '#8e9aaf',
          opacity: 0.8,
        },
        {
          id: 'steel',
          name: '钢材',
          color: '#495057',
          opacity: 1.0,
        },
      ],
    };

    return (
      <div className="relative">
        <CAE3DViewport {...args} />
        
        {/* 模拟数据面板 */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 w-64">
          <h3 className="font-semibold mb-2">模型信息</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>顶点数:</span>
              <span className="font-mono">{mockMeshData.vertices.length / 3}</span>
            </div>
            <div className="flex justify-between">
              <span>面数:</span>
              <span className="font-mono">{mockMeshData.faces.length / 3}</span>
            </div>
            <div className="flex justify-between">
              <span>材料数:</span>
              <span className="font-mono">{mockMeshData.materials.length}</span>
            </div>
          </div>
          
          <div className="mt-4">
            <h4 className="font-medium mb-2">材料列表</h4>
            <div className="space-y-1">
              {mockMeshData.materials.map((material) => (
                <div key={material.id} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-sm border"
                    style={{ backgroundColor: material.color }}
                  />
                  <span className="text-xs">{material.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  },
  args: {
    width: 800,
    height: 600,
    showControls: true,
    showGrid: true,
    backgroundColor: '#f8fafc',
    onModelLoad: action('model-loaded'),
    onError: action('viewport-error'),
  },
  parameters: {
    docs: {
      description: {
        story: '带有模拟网格数据和材料信息的3D视口。',
      },
    },
  },
};

// 分析结果可视化
export const AnalysisResults: Story = {
  render: (args) => {
    const mockAnalysisData = {
      stressDistribution: {
        min: 0.0,
        max: 150.5,
        unit: 'MPa',
        colorMap: 'viridis',
      },
      displacement: {
        max: 2.3,
        unit: 'mm',
        vectorScale: 10.0,
      },
    };

    return (
      <div className="relative">
        <CAE3DViewport {...args} />
        
        {/* 分析控制面板 */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 w-72">
          <h3 className="font-semibold mb-3">分析结果</h3>
          
          <div className="space-y-4">
            {/* 应力分布 */}
            <div>
              <h4 className="font-medium text-sm mb-2">应力分布</h4>
              <div className="flex items-center justify-between text-xs">
                <span>0.0 {mockAnalysisData.stressDistribution.unit}</span>
                <div className="flex-1 h-4 mx-2 bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 to-red-500 rounded"></div>
                <span>{mockAnalysisData.stressDistribution.max} {mockAnalysisData.stressDistribution.unit}</span>
              </div>
            </div>
            
            {/* 位移 */}
            <div>
              <h4 className="font-medium text-sm mb-2">位移</h4>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>最大位移:</span>
                  <span className="font-mono">{mockAnalysisData.displacement.max} {mockAnalysisData.displacement.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span>矢量缩放:</span>
                  <span className="font-mono">{mockAnalysisData.displacement.vectorScale}x</span>
                </div>
              </div>
            </div>
            
            {/* 控制按钮 */}
            <div className="flex space-x-2">
              <button 
                onClick={action('toggle-stress')}
                className="flex-1 px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
              >
                应力云图
              </button>
              <button 
                onClick={action('toggle-displacement')}
                className="flex-1 px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
              >
                位移矢量
              </button>
            </div>
          </div>
        </div>
        
        {/* 图例 */}
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3">
          <div className="text-xs space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>低应力区域</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>中等应力区域</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>高应力区域</span>
            </div>
          </div>
        </div>
      </div>
    );
  },
  args: {
    width: 900,
    height: 700,
    showControls: true,
    showGrid: false,
    backgroundColor: '#f1f5f9',
    onModelLoad: action('model-loaded'),
    onError: action('viewport-error'),
  },
  parameters: {
    docs: {
      description: {
        story: '展示CAE分析结果的3D可视化，包括应力分布和位移矢量。',
      },
    },
  },
};

// 多视角预设
export const ViewPresets: Story = {
  render: (args) => {
    const viewPresets = [
      { name: '等轴视图', icon: '📐' },
      { name: '前视图', icon: '⬅️' },
      { name: '侧视图', icon: '↕️' },
      { name: '俯视图', icon: '⬇️' },
      { name: '底视图', icon: '⬆️' },
    ];

    return (
      <div className="relative">
        <CAE3DViewport {...args} />
        
        {/* 视角控制 */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2">
          <div className="grid grid-cols-1 gap-1">
            {viewPresets.map((preset, index) => (
              <button
                key={index}
                onClick={() => action('view-preset-selected')(preset.name)}
                className="flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors"
                title={preset.name}
              >
                <span>{preset.icon}</span>
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* 工具栏 */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2">
          <div className="flex space-x-2">
            <button 
              onClick={action('zoom-fit')}
              className="p-2 hover:bg-gray-100 rounded"
              title="适应视图"
            >
              🔍
            </button>
            <button 
              onClick={action('measure-tool')}
              className="p-2 hover:bg-gray-100 rounded"
              title="测量工具"
            >
              📏
            </button>
            <button 
              onClick={action('section-tool')}
              className="p-2 hover:bg-gray-100 rounded"
              title="截面工具"
            >
              ✂️
            </button>
            <button 
              onClick={action('snapshot')}
              className="p-2 hover:bg-gray-100 rounded"
              title="截图"
            >
              📷
            </button>
          </div>
        </div>
      </div>
    );
  },
  args: {
    width: 800,
    height: 600,
    showControls: false,
    showGrid: true,
    backgroundColor: '#ffffff',
    onModelLoad: action('model-loaded'),
    onError: action('viewport-error'),
  },
  parameters: {
    docs: {
      description: {
        story: '带有多种视角预设和专业CAE工具的3D视口。',
      },
    },
  },
};

// 响应式布局
export const ResponsiveViewport: Story = {
  render: (args) => (
    <div className="space-y-6">
      {/* 移动端 */}
      <div className="sm:hidden">
        <h3 className="text-lg font-semibold mb-2">移动端视口</h3>
        <CAE3DViewport 
          {...args}
          width={350}
          height={250}
          showControls={false}
        />
      </div>
      
      {/* 平板端 */}
      <div className="hidden sm:block lg:hidden">
        <h3 className="text-lg font-semibold mb-2">平板端视口</h3>
        <CAE3DViewport 
          {...args}
          width={600}
          height={400}
          showControls={true}
        />
      </div>
      
      {/* 桌面端 */}
      <div className="hidden lg:block">
        <h3 className="text-lg font-semibold mb-2">桌面端视口</h3>
        <CAE3DViewport 
          {...args}
          width={900}
          height={600}
          showControls={true}
        />
      </div>
    </div>
  ),
  args: {
    showGrid: true,
    backgroundColor: '#f8fafc',
    onModelLoad: action('model-loaded'),
    onError: action('viewport-error'),
  },
  parameters: {
    viewport: {
      defaultViewport: 'responsive',
    },
    docs: {
      description: {
        story: '展示3D视口在不同设备尺寸下的响应式适配。',
      },
    },
  },
};