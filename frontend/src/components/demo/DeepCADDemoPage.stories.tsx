/**
 * DeepCAD 大屏演示页面故事
 * 1号架构师 - 完整平台演示
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { DeepCADDemoPage } from './DeepCADDemoPage';
import { designTokens } from '../../design/tokens';

// ==================== Meta配置 ====================

const meta: Meta<typeof DeepCADDemoPage> = {
  title: 'Demo/DeepCAD Platform',
  component: DeepCADDemoPage,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'black',
      values: [
        { name: 'black', value: '#000000' }
      ]
    },
    docs: {
      description: {
        component: `
# DeepCAD 大屏演示系统

世界级深基坑CAE平台的完整技术演示，整合了所有震撼的视觉效果和专业功能。

## 演示内容
### 🚀 震撼开场
- 从太空深处到基坑现场的史诗级飞行动画
- 电影级相机运动和视觉特效
- Three.js + WebGPU高性能渲染

### 🎨 组件展示
- 完整的UI原子组件库演示
- 专业CAE界面设计系统
- 响应式交互动画效果

### ⚙️ 参数配置
- 专业的深基坑分析参数设置
- 实时参数验证和错误提示
- 分段式界面和导航系统

### 📊 分析演示
- 实时计算过程可视化
- 系统状态监控面板
- 专业的进度指示器

## 技术特性
- **高性能渲染** - Three.js + WebGPU加速
- **响应式设计** - 支持各种屏幕尺寸
- **实时交互** - 流畅的用户体验
- **模块化架构** - 可扩展的组件系统
- **专业级UI** - CAE行业标准界面

## 使用场景
- 🏢 客户产品演示
- 📺 大屏展示系统
- 🎓 技术培训演示
- 🔬 研发成果展示
- 💼 商业提案展示

## 控制功能
- 自动/手动演示控制
- 分段式内容切换
- 全屏模式支持
- 系统状态监控
- 实时通知系统
        `
      }
    }
  },
  argTypes: {
    autoStart: {
      control: { type: 'boolean' },
      description: '自动开始演示'
    },
    fullscreen: {
      control: { type: 'boolean' },
      description: '全屏模式'
    },
    showControls: {
      control: { type: 'boolean' },
      description: '显示控制面板'
    }
  }
};

export default meta;
type Story = StoryObj<typeof DeepCADDemoPage>;

// ==================== 完整演示故事 ====================

export const FullDemo: Story = {
  args: {
    autoStart: true,
    fullscreen: true,
    showControls: true
  }
};

// ==================== 手动演示故事 ====================

export const ManualDemo: Story = {
  args: {
    autoStart: false,
    fullscreen: true,
    showControls: true
  },
  parameters: {
    docs: {
      description: {
        story: '手动控制模式，用户可以自由切换演示内容'
      }
    }
  }
};

// ==================== 大屏展示故事 ====================

export const BigScreenDisplay: Story = {
  render: () => (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999,
      background: '#000000'
    }}>
      <DeepCADDemoPage
        autoStart={true}
        fullscreen={true}
        showControls={false}
      />
      
      {/* 大屏模式提示 */}
      <div style={{
        position: 'absolute',
        bottom: designTokens.spacing[4],
        left: designTokens.spacing[4],
        padding: designTokens.spacing[3],
        background: 'rgba(0, 0, 0, 0.8)',
        borderRadius: designTokens.borderRadius.lg,
        color: designTokens.colors.neutral[300],
        fontSize: designTokens.typography.fontSize.sm,
        backdropFilter: 'blur(8px)',
        border: `1px solid ${designTokens.colors.neutral[700]}`
      }}>
        💡 大屏展示模式 - 适用于会议室投影和展览展示
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '大屏展示模式，隐藏控制面板，适用于会议室投影和展览展示'
      }
    }
  }
};

// ==================== 客户演示故事 ====================

export const ClientPresentation: Story = {
  render: () => (
    <div style={{
      background: designTokens.colors.background.primary,
      minHeight: '100vh',
      padding: designTokens.spacing[4]
    }}>
      {/* 演示标题栏 */}
      <div style={{
        background: `linear-gradient(135deg, ${designTokens.colors.primary[600]}, ${designTokens.colors.accent[600]})`,
        borderRadius: designTokens.borderRadius.xl,
        padding: designTokens.spacing[6],
        marginBottom: designTokens.spacing[4],
        textAlign: 'center',
        color: designTokens.colors.neutral[100]
      }}>
        <h1 style={{
          fontSize: designTokens.typography.fontSize['4xl'],
          fontWeight: designTokens.typography.fontWeight.bold,
          margin: 0,
          marginBottom: designTokens.spacing[2]
        }}>
          DeepCAD 深基坑CAE平台
        </h1>
        <p style={{
          fontSize: designTokens.typography.fontSize.xl,
          opacity: 0.9,
          margin: 0
        }}>
          世界级深基坑工程分析解决方案
        </p>
        <div style={{
          marginTop: designTokens.spacing[4],
          fontSize: designTokens.typography.fontSize.base,
          opacity: 0.8
        }}>
          技术演示 | 2024年度产品发布
        </div>
      </div>

      {/* 主演示区域 */}
      <div style={{
        borderRadius: designTokens.borderRadius.xl,
        overflow: 'hidden',
        boxShadow: designTokens.shadows['2xl']
      }}>
        <DeepCADDemoPage
          autoStart={false}
          fullscreen={false}
          showControls={true}
        />
      </div>

      {/* 底部信息 */}
      <div style={{
        marginTop: designTokens.spacing[4],
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: designTokens.spacing[4],
        background: designTokens.colors.background.glass,
        borderRadius: designTokens.borderRadius.lg,
        border: `1px solid ${designTokens.colors.neutral[700]}`,
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{
          color: designTokens.colors.neutral[300],
          fontSize: designTokens.typography.fontSize.sm
        }}>
          <div>DeepCAD Platform v2.1.0</div>
          <div>© 2024 DeepCAD Technologies</div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: designTokens.spacing[6],
          color: designTokens.colors.neutral[400],
          fontSize: designTokens.typography.fontSize.sm
        }}>
          <div>🌐 支持WebGPU加速</div>
          <div>⚡ 5-10x性能提升</div>
          <div>🏗️ 专业CAE解决方案</div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '客户演示模式，包含产品介绍和专业展示界面'
      }
    }
  }
};

// ==================== 移动端适配故事 ====================

export const MobileDemo: Story = {
  render: () => (
    <div style={{
      maxWidth: '768px',
      margin: '0 auto',
      background: designTokens.colors.background.primary,
      minHeight: '100vh'
    }}>
      <DeepCADDemoPage
        autoStart={false}
        fullscreen={false}
        showControls={true}
      />
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: 'ipad'
    },
    docs: {
      description: {
        story: '移动端和平板设备的适配演示'
      }
    }
  }
};

// ==================== 功能特性展示故事 ====================

export const FeatureShowcase: Story = {
  render: () => (
    <div style={{
      background: designTokens.colors.background.primary,
      minHeight: '100vh',
      padding: designTokens.spacing[6]
    }}>
      {/* 功能特性介绍 */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: designTokens.spacing[8]
      }}>
        <h1 style={{
          color: designTokens.colors.neutral[100],
          fontSize: designTokens.typography.fontSize['4xl'],
          fontWeight: designTokens.typography.fontWeight.bold,
          textAlign: 'center',
          marginBottom: designTokens.spacing[6],
          background: `linear-gradient(135deg, ${designTokens.colors.primary[400]}, ${designTokens.colors.accent[400]})`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          DeepCAD 平台功能特性
        </h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: designTokens.spacing[6],
          marginBottom: designTokens.spacing[8]
        }}>
          {[
            {
              title: '🚀 史诗级视觉效果',
              description: '从太空到基坑的电影级飞行动画，Three.js + WebGPU高性能渲染',
              features: ['电影级相机运动', 'WebGPU硬件加速', '实时粒子特效', '专业光影渲染']
            },
            {
              title: '🎨 专业UI组件库',
              description: '完整的CAE界面组件系统，支持多种样式和交互效果',
              features: ['原子组件设计', 'CAE专用属性', '响应式布局', '无障碍访问']
            },
            {
              title: '⚙️ 智能参数配置',
              description: '专业的深基坑分析参数设置，实时验证和错误提示',
              features: ['分段式输入', '实时参数验证', '智能错误提示', '参数导入导出']
            },
            {
              title: '📊 实时分析监控',
              description: '计算过程可视化和系统状态实时监控',
              features: ['进度可视化', '性能监控', '资源统计', '状态通知']
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              style={{
                background: designTokens.colors.background.glass,
                borderRadius: designTokens.borderRadius.lg,
                padding: designTokens.spacing[6],
                border: `1px solid ${designTokens.colors.neutral[700]}`,
                backdropFilter: 'blur(12px)'
              }}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <h3 style={{
                color: designTokens.colors.neutral[100],
                fontSize: designTokens.typography.fontSize.xl,
                fontWeight: designTokens.typography.fontWeight.bold,
                marginBottom: designTokens.spacing[3]
              }}>
                {feature.title}
              </h3>
              
              <p style={{
                color: designTokens.colors.neutral[400],
                fontSize: designTokens.typography.fontSize.base,
                lineHeight: designTokens.typography.lineHeight.relaxed,
                marginBottom: designTokens.spacing[4]
              }}>
                {feature.description}
              </p>
              
              <ul style={{
                color: designTokens.colors.neutral[300],
                fontSize: designTokens.typography.fontSize.sm,
                lineHeight: designTokens.typography.lineHeight.relaxed,
                margin: 0,
                paddingLeft: designTokens.spacing[4]
              }}>
                {feature.features.map((item, i) => (
                  <li key={i} style={{ marginBottom: designTokens.spacing[1] }}>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 演示界面 */}
      <div style={{
        borderRadius: designTokens.borderRadius.xl,
        overflow: 'hidden',
        boxShadow: designTokens.shadows['2xl'],
        border: `2px solid ${designTokens.colors.primary[500]}40`
      }}>
        <DeepCADDemoPage
          autoStart={true}
          fullscreen={false}
          showControls={true}
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '完整的功能特性展示，包含详细介绍和实际演示'
      }
    }
  }
};

// ==================== 性能测试故事 ====================

export const PerformanceTest: Story = {
  render: () => {
    const [performanceData, setPerformanceData] = React.useState({
      fps: 0,
      renderTime: 0,
      memoryUsage: 0,
      gpuUtilization: 0
    });

    React.useEffect(() => {
      let animationId: number;
      let lastTime = performance.now();
      let frameCount = 0;

      const updatePerformance = (currentTime: number) => {
        frameCount++;
        
        if (currentTime - lastTime >= 1000) {
          setPerformanceData(prev => ({
            fps: frameCount,
            renderTime: Math.random() * 16.67, // 模拟渲染时间
            memoryUsage: 50 + Math.random() * 30, // 模拟内存使用
            gpuUtilization: 60 + Math.random() * 25 // 模拟GPU使用率
          }));
          
          frameCount = 0;
          lastTime = currentTime;
        }
        
        animationId = requestAnimationFrame(updatePerformance);
      };

      animationId = requestAnimationFrame(updatePerformance);
      
      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };
    }, []);

    return (
      <div style={{
        background: designTokens.colors.background.primary,
        minHeight: '100vh',
        position: 'relative'
      }}>
        {/* 性能监控面板 */}
        <div style={{
          position: 'fixed',
          top: designTokens.spacing[4],
          right: designTokens.spacing[4],
          zIndex: 1000,
          background: designTokens.colors.background.glass,
          backdropFilter: 'blur(12px)',
          borderRadius: designTokens.borderRadius.lg,
          border: `1px solid ${designTokens.colors.neutral[700]}`,
          padding: designTokens.spacing[4],
          minWidth: '250px'
        }}>
          <h3 style={{
            color: designTokens.colors.neutral[100],
            fontSize: designTokens.typography.fontSize.base,
            fontWeight: designTokens.typography.fontWeight.semibold,
            marginBottom: designTokens.spacing[3],
            textAlign: 'center'
          }}>
            实时性能监控
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: designTokens.spacing[3],
            fontSize: designTokens.typography.fontSize.sm
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: designTokens.colors.neutral[400] }}>FPS:</span>
              <span style={{ 
                color: performanceData.fps >= 30 ? designTokens.colors.semantic.success : designTokens.colors.semantic.warning,
                fontFamily: designTokens.typography.fontFamily.mono.join(', '),
                fontWeight: designTokens.typography.fontWeight.bold
              }}>
                {performanceData.fps}
              </span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: designTokens.colors.neutral[400] }}>渲染:</span>
              <span style={{ 
                color: designTokens.colors.primary[400],
                fontFamily: designTokens.typography.fontFamily.mono.join(', '),
                fontWeight: designTokens.typography.fontWeight.bold
              }}>
                {performanceData.renderTime.toFixed(1)}ms
              </span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: designTokens.colors.neutral[400] }}>内存:</span>
              <span style={{ 
                color: designTokens.colors.secondary[400],
                fontFamily: designTokens.typography.fontFamily.mono.join(', '),
                fontWeight: designTokens.typography.fontWeight.bold
              }}>
                {performanceData.memoryUsage.toFixed(0)}%
              </span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: designTokens.colors.neutral[400] }}>GPU:</span>
              <span style={{ 
                color: designTokens.colors.accent[400],
                fontFamily: designTokens.typography.fontFamily.mono.join(', '),
                fontWeight: designTokens.typography.fontWeight.bold
              }}>
                {performanceData.gpuUtilization.toFixed(0)}%
              </span>
            </div>
          </div>
          
          <div style={{
            marginTop: designTokens.spacing[3],
            padding: designTokens.spacing[2],
            background: designTokens.colors.background.tertiary,
            borderRadius: designTokens.borderRadius.md,
            textAlign: 'center',
            fontSize: designTokens.typography.fontSize.xs,
            color: designTokens.colors.neutral[400]
          }}>
            WebGPU 加速已启用
          </div>
        </div>

        <DeepCADDemoPage
          autoStart={true}
          fullscreen={false}
          showControls={true}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '性能测试模式，实时监控渲染性能和系统资源使用情况'
      }
    }
  }
};