/**
 * DeepCAD 史诗级飞行演示故事
 * 1号架构师 - 震撼的大屏演示效果
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { EpicFlightDemo } from './EpicFlightDemo';
import { designTokens } from '../../design/tokens';

// ==================== Meta配置 ====================

const meta: Meta<typeof EpicFlightDemo> = {
  title: 'Visualization/Epic Flight Demo',
  component: EpicFlightDemo,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'space',
      values: [
        { 
          name: 'space', 
          value: 'radial-gradient(circle at center, #001122 0%, #000000 100%)' 
        }
      ]
    },
    docs: {
      description: {
        component: `
# 史诗级飞行演示

震撼的从太空到基坑的电影级视觉体验，展示DeepCAD平台的世界级视觉效果。

## 特性
- 🌍 高质量3D地球渲染
- 🚀 电影级相机飞行动画
- ⚡ WebGPU加速渲染
- 🎬 多种演示序列
- 📱 实时飞行控制
- 🎯 专业CAE项目展示

## 演示序列
1. **史诗开场** - 从太空深处到基坑现场的25秒震撼之旅
2. **全球巡览** - 环球飞行展示各大基坑工程项目
3. **施工演示** - 展示基坑施工全过程的分步演示

## 技术实现
- Three.js + WebGL渲染
- GSAP动画时间轴
- 实时着色器效果
- 动态相机控制
- 粒子系统特效
        `
      }
    }
  },
  argTypes: {
    width: {
      control: { type: 'number', min: 800, max: 3840, step: 100 },
      description: '演示画面宽度'
    },
    height: {
      control: { type: 'number', min: 600, max: 2160, step: 100 },
      description: '演示画面高度'
    },
    autoStart: {
      control: { type: 'boolean' },
      description: '自动开始演示'
    },
    showControls: {
      control: { type: 'boolean' },
      description: '显示控制面板'
    }
  }
};

export default meta;
type Story = StoryObj<typeof EpicFlightDemo>;

// ==================== 基础演示故事 ====================

export const DefaultDemo: Story = {
  args: {
    width: 1280,
    height: 720,
    autoStart: false,
    showControls: true
  }
};

// ==================== 大屏演示故事 ====================

export const BigScreenDemo: Story = {
  args: {
    width: 1920,
    height: 1080,
    autoStart: true,
    showControls: true
  },
  parameters: {
    docs: {
      description: {
        story: '大屏演示模式 - 1080p全高清，自动开始史诗开场演示'
      }
    }
  }
};

// ==================== 4K超高清演示故事 ====================

export const UltraHDDemo: Story = {
  args: {
    width: 2560,
    height: 1440,
    autoStart: false,
    showControls: true
  },
  parameters: {
    docs: {
      description: {
        story: '4K超高清演示 - 2K分辨率，展示最高品质视觉效果'
      }
    }
  }
};

// ==================== 移动端适配演示 ====================

export const MobileDemo: Story = {
  args: {
    width: 375,
    height: 667,
    autoStart: false,
    showControls: false
  },
  parameters: {
    docs: {
      description: {
        story: '移动端适配演示 - iPhone尺寸，简化控制界面'
      }
    }
  }
};

// ==================== 平板演示故事 ====================

export const TabletDemo: Story = {
  args: {
    width: 1024,
    height: 768,
    autoStart: false,
    showControls: true
  },
  parameters: {
    docs: {
      description: {
        story: '平板演示模式 - iPad尺寸，平衡性能和视觉效果'
      }
    }
  }
};

// ==================== 沉浸式全屏演示 ====================

export const ImmersiveFullscreen: Story = {
  render: () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999,
      background: '#000000'
    }}>
      <EpicFlightDemo
        width={window.innerWidth}
        height={window.innerHeight}
        autoStart={false}
        showControls={true}
        onFlightComplete={() => {
          console.log('史诗级飞行演示完成！');
        }}
      />
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: '沉浸式全屏演示 - 覆盖整个浏览器窗口，提供最震撼的视觉体验'
      }
    }
  }
};

// ==================== 演示对比故事 ====================

export const ComparisonDemo: Story = {
  render: () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: designTokens.spacing[4],
      padding: designTokens.spacing[4],
      background: designTokens.colors.background.primary,
      minHeight: '100vh'
    }}>
      {/* 标准分辨率 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: designTokens.spacing[4]
      }}>
        <h3 style={{
          color: designTokens.colors.neutral[100],
          fontSize: designTokens.typography.fontSize.lg,
          fontWeight: designTokens.typography.fontWeight.semibold,
          margin: 0
        }}>
          标准演示 (720p)
        </h3>
        <EpicFlightDemo
          width={640}
          height={360}
          autoStart={false}
          showControls={true}
        />
      </div>

      {/* 高清分辨率 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: designTokens.spacing[4]
      }}>
        <h3 style={{
          color: designTokens.colors.neutral[100],
          fontSize: designTokens.typography.fontSize.lg,
          fontWeight: designTokens.typography.fontWeight.semibold,
          margin: 0
        }}>
          高清演示 (1080p)
        </h3>
        <EpicFlightDemo
          width={640}
          height={360}
          autoStart={false}
          showControls={true}
        />
      </div>

      {/* 说明文字 */}
      <div style={{
        gridColumn: '1 / -1',
        textAlign: 'center',
        marginTop: designTokens.spacing[6]
      }}>
        <p style={{
          color: designTokens.colors.neutral[400],
          fontSize: designTokens.typography.fontSize.base,
          maxWidth: '800px',
          margin: '0 auto',
          lineHeight: designTokens.typography.lineHeight.relaxed
        }}>
          对比展示不同分辨率下的视觉效果差异。左侧为标准720p分辨率，右侧为高清1080p分辨率。
          两个演示都支持完整的飞行控制和交互功能。
        </p>
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: '演示对比 - 并排展示不同分辨率的视觉效果差异'
      }
    }
  }
};

// ==================== 功能展示故事 ====================

export const FeatureShowcase: Story = {
  render: () => (
    <div style={{
      padding: designTokens.spacing[8],
      background: designTokens.colors.background.primary,
      minHeight: '100vh'
    }}>
      {/* 标题区域 */}
      <div style={{
        textAlign: 'center',
        marginBottom: designTokens.spacing[8]
      }}>
        <h1 style={{
          color: designTokens.colors.neutral[100],
          fontSize: designTokens.typography.fontSize['4xl'],
          fontWeight: designTokens.typography.fontWeight.bold,
          marginBottom: designTokens.spacing[4],
          background: `linear-gradient(135deg, ${designTokens.colors.primary[400]}, ${designTokens.colors.accent[400]})`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          DeepCAD 史诗级飞行演示
        </h1>
        
        <p style={{
          color: designTokens.colors.neutral[400],
          fontSize: designTokens.typography.fontSize.xl,
          maxWidth: '800px',
          margin: '0 auto',
          lineHeight: designTokens.typography.lineHeight.relaxed
        }}>
          从太空深处到基坑现场的震撼视觉飞行体验，展示世界级深基坑CAE平台的技术实力
        </p>
      </div>

      {/* 主演示区域 */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: designTokens.spacing[8]
      }}>
        <EpicFlightDemo
          width={1280}
          height={720}
          autoStart={false}
          showControls={true}
        />
      </div>

      {/* 功能特点网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: designTokens.spacing[6],
        marginTop: designTokens.spacing[8]
      }}>
        {[
          {
            icon: '🌍',
            title: '高质量地球渲染',
            description: '真实的昼夜循环、大气效果、云层动画和星空背景'
          },
          {
            icon: '🚀',
            title: '电影级飞行动画',
            description: '使用GSAP时间轴的流畅相机运动和专业缓动函数'
          },
          {
            icon: '⚡',
            title: 'WebGPU加速渲染',
            description: '利用最新WebGPU技术实现5-10x GPU计算加速'
          },
          {
            icon: '🎬',
            title: '多种演示序列',
            description: '史诗开场、全球巡览、施工演示等多种预设飞行路径'
          },
          {
            icon: '📱',
            title: '实时飞行控制',
            description: '支持暂停、继续、停止等实时控制和进度监控'
          },
          {
            icon: '🎯',
            title: '项目标记系统',
            description: '全球深基坑项目的可视化标记和详细信息展示'
          }
        ].map((feature, index) => (
          <motion.div
            key={index}
            style={{
              background: designTokens.colors.background.glass,
              borderRadius: designTokens.borderRadius.lg,
              padding: designTokens.spacing[6],
              border: `1px solid ${designTokens.colors.neutral[800]}`,
              backdropFilter: 'blur(12px)',
              textAlign: 'center'
            }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <div style={{
              fontSize: '48px',
              marginBottom: designTokens.spacing[3]
            }}>
              {feature.icon}
            </div>
            
            <h3 style={{
              color: designTokens.colors.neutral[100],
              fontSize: designTokens.typography.fontSize.lg,
              fontWeight: designTokens.typography.fontWeight.semibold,
              marginBottom: designTokens.spacing[3]
            }}>
              {feature.title}
            </h3>
            
            <p style={{
              color: designTokens.colors.neutral[400],
              fontSize: designTokens.typography.fontSize.base,
              lineHeight: designTokens.typography.lineHeight.relaxed,
              margin: 0
            }}>
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>

      {/* 技术规格 */}
      <div style={{
        marginTop: designTokens.spacing[12],
        padding: designTokens.spacing[8],
        background: designTokens.colors.background.glass,
        borderRadius: designTokens.borderRadius.xl,
        border: `1px solid ${designTokens.colors.neutral[800]}`,
        backdropFilter: 'blur(12px)'
      }}>
        <h2 style={{
          color: designTokens.colors.primary[400],
          fontSize: designTokens.typography.fontSize['2xl'],
          fontWeight: designTokens.typography.fontWeight.bold,
          textAlign: 'center',
          marginBottom: designTokens.spacing[6]
        }}>
          技术规格
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: designTokens.spacing[6]
        }}>
          {[
            { label: '渲染引擎', value: 'Three.js + WebGL/WebGPU' },
            { label: '动画系统', value: 'GSAP Timeline + Framer Motion' },
            { label: '支持分辨率', value: '720p - 4K (可扩展至8K)' },
            { label: '帧率目标', value: '60 FPS (1080p) / 30 FPS (4K)' },
            { label: '浏览器支持', value: 'Chrome 90+, Firefox 88+, Safari 14+' },
            { label: '移动设备', value: 'iOS 14+, Android 10+' }
          ].map((spec, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: designTokens.spacing[4],
                background: designTokens.colors.background.tertiary,
                borderRadius: designTokens.borderRadius.md,
                border: `1px solid ${designTokens.colors.neutral[700]}`
              }}
            >
              <span style={{
                color: designTokens.colors.neutral[300],
                fontSize: designTokens.typography.fontSize.sm,
                fontWeight: designTokens.typography.fontWeight.medium
              }}>
                {spec.label}
              </span>
              <span style={{
                color: designTokens.colors.neutral[100],
                fontSize: designTokens.typography.fontSize.sm,
                fontFamily: designTokens.typography.fontFamily.mono.join(', ')
              }}>
                {spec.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: '完整功能展示 - 包含演示界面、功能特点介绍和技术规格说明'
      }
    }
  }
};