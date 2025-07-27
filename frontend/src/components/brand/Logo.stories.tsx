/**
 * DeepCAD Logo组件故事
 * 1号架构师 - Logo使用场景展示
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Logo, LoadingLogo } from './Logo';

const meta: Meta<typeof Logo> = {
  title: 'Brand/Logo',
  component: Logo,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0a0a0a' },
        { name: 'light', value: '#ffffff' }
      ]
    }
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl']
    },
    variant: {
      control: { type: 'select' },
      options: ['full', 'icon', 'text']
    },
    animated: {
      control: { type: 'boolean' }
    },
    glowing: {
      control: { type: 'boolean' }
    },
    interactive: {
      control: { type: 'boolean' }
    }
  }
};

export default meta;
type Story = StoryObj<typeof Logo>;

// 基础Logo展示
export const Default: Story = {
  args: {
    size: 'md',
    variant: 'full'
  }
};

// 所有尺寸展示
export const AllSizes: Story = {
  render: () => (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '20px',
      alignItems: 'center',
      padding: '20px'
    }}>
      <Logo size="xs" variant="full" />
      <Logo size="sm" variant="full" />
      <Logo size="md" variant="full" />
      <Logo size="lg" variant="full" />
      <Logo size="xl" variant="full" />
      <Logo size="2xl" variant="full" />
    </div>
  )
};

// 所有变体展示
export const AllVariants: Story = {
  render: () => (
    <div style={{ 
      display: 'flex', 
      gap: '40px',
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <Logo size="lg" variant="full" />
        <p style={{ color: '#666', marginTop: '10px', fontSize: '12px' }}>Full</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <Logo size="lg" variant="icon" />
        <p style={{ color: '#666', marginTop: '10px', fontSize: '12px' }}>Icon Only</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <Logo size="lg" variant="text" />
        <p style={{ color: '#666', marginTop: '10px', fontSize: '12px' }}>Text Only</p>
      </div>
    </div>
  )
};

// 动画Logo
export const Animated: Story = {
  args: {
    size: 'xl',
    variant: 'full',
    animated: true,
    glowing: true
  }
};

// 交互式Logo
export const Interactive: Story = {
  args: {
    size: 'lg',
    variant: 'full',
    interactive: true,
    glowing: false
  }
};

// 发光效果Logo
export const Glowing: Story = {
  args: {
    size: 'lg',
    variant: 'full',
    glowing: true
  }
};

// 导航栏用Logo
export const NavigationBar: Story = {
  render: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px 24px',
      background: 'rgba(26, 26, 26, 0.9)',
      backdropFilter: 'blur(12px)',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <Logo size="sm" variant="full" interactive />
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '20px' }}>
        <span style={{ color: '#999', fontSize: '14px' }}>项目</span>
        <span style={{ color: '#999', fontSize: '14px' }}>分析</span>
        <span style={{ color: '#999', fontSize: '14px' }}>设置</span>
      </div>
    </div>
  )
};

// 史诗级加载页面Logo
export const LoadingPage: Story = {
  render: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '600px',
      background: `
        radial-gradient(circle at center, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
        linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(26, 26, 26, 0.95) 100%)
      `,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 背景星空效果 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 30%),
          radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 30%),
          radial-gradient(circle at 60% 40%, rgba(6, 182, 212, 0.05) 0%, transparent 25%)
        `
      }} />
      <LoadingLogo />
    </div>
  )
};

// 登录页面Logo
export const LoginPage: Story = {
  render: () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '32px',
      padding: '60px',
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
      borderRadius: '16px'
    }}>
      <Logo size="2xl" variant="full" animated glowing />
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ 
          color: '#fff', 
          fontSize: '32px', 
          margin: '0 0 8px 0',
          fontWeight: 'bold'
        }}>
          欢迎来到 DeepCAD
        </h1>
        <p style={{ 
          color: '#999', 
          fontSize: '16px', 
          margin: 0
        }}>
          世界级深基坑工程分析平台
        </p>
      </div>
    </div>
  )
};

// 卡片中的Logo
export const InCard: Story = {
  render: () => (
    <div style={{
      padding: '24px',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(12px)',
      maxWidth: '300px'
    }}>
      <div style={{ marginBottom: '16px' }}>
        <Logo size="md" variant="full" interactive />
      </div>
      <h3 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '18px' }}>
        项目概览
      </h3>
      <p style={{ color: '#999', margin: 0, fontSize: '14px' }}>
        深基坑工程CAE分析项目管理系统
      </p>
    </div>
  )
};

// 侧边栏Logo
export const Sidebar: Story = {
  render: () => (
    <div style={{
      width: '280px',
      height: '400px',
      background: 'rgba(26, 26, 26, 0.9)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '20px'
    }}>
      <div style={{ marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Logo size="sm" variant="full" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ padding: '8px 12px', color: '#999', fontSize: '14px' }}>
          🏗️ 几何建模
        </div>
        <div style={{ padding: '8px 12px', color: '#999', fontSize: '14px' }}>
          🔗 网格生成
        </div>
        <div style={{ padding: '8px 12px', color: '#999', fontSize: '14px' }}>
          ⚡ 计算分析
        </div>
        <div style={{ padding: '8px 12px', color: '#999', fontSize: '14px' }}>
          📊 结果查看
        </div>
      </div>
    </div>
  )
};

// 大屏演示Logo
export const BigScreenDemo: Story = {
  render: () => (
    <div style={{
      width: '100%',
      minHeight: '500px',
      background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.2) 0%, rgba(0, 0, 0, 0.9) 70%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 背景粒子效果 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.05) 0%, transparent 50%)
        `
      }} />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Logo size="2xl" variant="full" animated glowing />
      </div>
    </div>
  )
};

// 史诗级开场动画演示
export const EpicOpeningSequence: Story = {
  render: () => (
    <div style={{
      width: '100%',
      minHeight: '800px',
      background: `
        radial-gradient(ellipse at center, rgba(99, 102, 241, 0.2) 0%, rgba(0, 0, 0, 0.95) 70%),
        linear-gradient(135deg, rgba(0, 0, 0, 1) 0%, rgba(15, 15, 23, 1) 100%)
      `,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 动态背景网格 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        opacity: 0.3,
        transform: 'perspective(1000px) rotateX(60deg) scale(2)',
        transformOrigin: 'center bottom'
      }} />
      
      {/* 多层背景光晕 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.15) 0%, transparent 40%),
          radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.15) 0%, transparent 40%),
          radial-gradient(circle at 50% 30%, rgba(6, 182, 212, 0.1) 0%, transparent 35%),
          radial-gradient(circle at 30% 70%, rgba(16, 185, 129, 0.08) 0%, transparent 30%)
        `
      }} />
      
      <div style={{ 
        position: 'relative', 
        zIndex: 1,
        textAlign: 'center'
      }}>
        <LoadingLogo />
        
        {/* 标语文字 */}
        <div style={{
          marginTop: '40px',
          fontSize: '18px',
          color: 'rgba(255, 255, 255, 0.7)',
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.1em'
        }}>
          <div style={{ marginBottom: '8px' }}>
            🌍 从地球到基坑的震撼之旅
          </div>
          <div style={{ marginBottom: '8px' }}>
            ⚡ WebGPU 5-10x GPU加速计算
          </div>
          <div>
            🏗️ 世界级深基坑CAE平台
          </div>
        </div>
      </div>
    </div>
  )
};