/**
 * DeepCAD 图标系统故事展示
 * 1号架构师 - 完整的图标库演示
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { FunctionalIcons } from './FunctionalIcons';
import { EngineeringIcons } from './EngineeringIcons';
import { StatusIcons } from './StatusIcons';
import { designTokens } from '../../design/tokens';

// ==================== 图标展示组件 ====================

const IconShowcase: React.FC<{
  title: string;
  icons: Record<string, React.ComponentType<any>>;
  categoryColor: string;
}> = ({ title, icons, categoryColor }) => (
  <div style={{
    background: designTokens.colors.background.secondary,
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing[6],
    marginBottom: designTokens.spacing[8]
  }}>
    <h2 style={{
      color: categoryColor,
      fontSize: designTokens.typography.fontSize['2xl'],
      fontWeight: designTokens.typography.fontWeight.bold,
      marginBottom: designTokens.spacing[6],
      textAlign: 'center',
      fontFamily: designTokens.typography.fontFamily.primary.join(', ')
    }}>
      {title}
    </h2>
    
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: designTokens.spacing[4],
      marginBottom: designTokens.spacing[4]
    }}>
      {Object.entries(icons).map(([name, IconComponent]) => (
        <div
          key={name}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: designTokens.spacing[4],
            background: designTokens.colors.background.glass,
            borderRadius: designTokens.borderRadius.md,
            border: `1px solid ${designTokens.colors.neutral[800]}`,
            backdropFilter: 'blur(8px)',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{
            padding: designTokens.spacing[3],
            marginBottom: designTokens.spacing[2]
          }}>
            <IconComponent 
              size={48} 
              color={categoryColor}
              animated={true}
              glowing={false}
            />
          </div>
          <span style={{
            fontSize: designTokens.typography.fontSize.sm,
            color: designTokens.colors.neutral[300],
            textAlign: 'center',
            fontFamily: designTokens.typography.fontFamily.primary.join(', ')
          }}>
            {name.replace(/([A-Z])/g, ' $1').trim()}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// ==================== 交互式图标演示 ====================

const InteractiveIconDemo: React.FC = () => {
  const [selectedSize, setSelectedSize] = React.useState(32);
  const [selectedColor, setSelectedColor] = React.useState(designTokens.colors.primary[500]);
  const [animated, setAnimated] = React.useState(true);
  const [glowing, setGlowing] = React.useState(false);

  return (
    <div style={{
      background: designTokens.colors.background.primary,
      borderRadius: designTokens.borderRadius.xl,
      padding: designTokens.spacing[8],
      border: `1px solid ${designTokens.colors.neutral[800]}`
    }}>
      <h3 style={{
        color: designTokens.colors.neutral[100],
        fontSize: designTokens.typography.fontSize.xl,
        fontWeight: designTokens.typography.fontWeight.semibold,
        marginBottom: designTokens.spacing[6],
        textAlign: 'center'
      }}>
        交互式图标演示
      </h3>

      {/* 控制面板 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: designTokens.spacing[4],
        marginBottom: designTokens.spacing[6],
        padding: designTokens.spacing[4],
        background: designTokens.colors.background.glass,
        borderRadius: designTokens.borderRadius.md,
        border: `1px solid ${designTokens.colors.neutral[700]}`
      }}>
        <div>
          <label style={{ 
            color: designTokens.colors.neutral[300],
            fontSize: designTokens.typography.fontSize.sm,
            display: 'block',
            marginBottom: designTokens.spacing[2]
          }}>
            尺寸: {selectedSize}px
          </label>
          <input
            type="range"
            min="16"
            max="96"
            value={selectedSize}
            onChange={(e) => setSelectedSize(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ 
            color: designTokens.colors.neutral[300],
            fontSize: designTokens.typography.fontSize.sm,
            display: 'block',
            marginBottom: designTokens.spacing[2]
          }}>
            颜色
          </label>
          <select
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            style={{
              width: '100%',
              padding: designTokens.spacing[2],
              background: designTokens.colors.background.tertiary,
              color: designTokens.colors.neutral[200],
              border: `1px solid ${designTokens.colors.neutral[600]}`,
              borderRadius: designTokens.borderRadius.md
            }}
          >
            <option value={designTokens.colors.primary[500]}>主色调</option>
            <option value={designTokens.colors.secondary[500]}>次要色</option>
            <option value={designTokens.colors.accent[500]}>强调色</option>
            <option value={designTokens.colors.semantic.success}>成功</option>
            <option value={designTokens.colors.semantic.warning}>警告</option>
            <option value={designTokens.colors.semantic.error}>错误</option>
          </select>
        </div>

        <div>
          <label style={{ 
            color: designTokens.colors.neutral[300], 
            fontSize: designTokens.typography.fontSize.sm,
            display: 'flex',
            alignItems: 'center',
            gap: designTokens.spacing[2]
          }}>
            <input
              type="checkbox"
              checked={animated}
              onChange={(e) => setAnimated(e.target.checked)}
            />
            动画效果
          </label>
        </div>

        <div>
          <label style={{ 
            color: designTokens.colors.neutral[300], 
            fontSize: designTokens.typography.fontSize.sm,
            display: 'flex',
            alignItems: 'center',
            gap: designTokens.spacing[2]
          }}>
            <input
              type="checkbox"
              checked={glowing}
              onChange={(e) => setGlowing(e.target.checked)}
            />
            发光效果
          </label>
        </div>
      </div>

      {/* 图标演示区域 */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: designTokens.spacing[6],
        justifyContent: 'center',
        padding: designTokens.spacing[6],
        background: designTokens.colors.background.glass,
        borderRadius: designTokens.borderRadius.lg,
        border: `1px solid ${designTokens.colors.neutral[700]}`
      }}>
        <FunctionalIcons.GeologyModeling 
          size={selectedSize} 
          color={selectedColor}
          animated={animated}
          glowing={glowing}
        />
        <FunctionalIcons.ExcavationDesign 
          size={selectedSize} 
          color={selectedColor}
          animated={animated}
          glowing={glowing}
        />
        <FunctionalIcons.GPUComputing 
          size={selectedSize} 
          color={selectedColor}
          animated={animated}
          glowing={glowing}
        />
        <StatusIcons.Computing 
          size={selectedSize} 
          color={selectedColor}
          animated={animated}
          pulsing={animated}
        />
        <StatusIcons.Completed 
          size={selectedSize} 
          color={selectedColor}
          animated={animated}
        />
        <EngineeringIcons.RetainingWall 
          size={selectedSize} 
          color={selectedColor}
          animated={animated}
          glowing={glowing}
        />
      </div>
    </div>
  );
};

// ==================== 应用场景演示 ====================

const ApplicationScenarios: React.FC = () => (
  <div style={{
    background: designTokens.colors.background.secondary,
    borderRadius: designTokens.borderRadius.xl,
    padding: designTokens.spacing[8]
  }}>
    <h3 style={{
      color: designTokens.colors.neutral[100],
      fontSize: designTokens.typography.fontSize.xl,
      fontWeight: designTokens.typography.fontWeight.semibold,
      marginBottom: designTokens.spacing[6],
      textAlign: 'center'
    }}>
      应用场景演示
    </h3>

    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: designTokens.spacing[6]
    }}>
      {/* 导航菜单场景 */}
      <div style={{
        background: designTokens.colors.background.glass,
        borderRadius: designTokens.borderRadius.lg,
        padding: designTokens.spacing[4],
        border: `1px solid ${designTokens.colors.neutral[700]}`
      }}>
        <h4 style={{
          color: designTokens.colors.primary[400],
          fontSize: designTokens.typography.fontSize.lg,
          marginBottom: designTokens.spacing[4]
        }}>
          导航菜单
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing[3] }}>
          {[
            { icon: FunctionalIcons.GeologyModeling, label: '地质建模' },
            { icon: FunctionalIcons.ExcavationDesign, label: '基坑设计' },
            { icon: FunctionalIcons.MeshGeneration, label: '网格生成' },
            { icon: FunctionalIcons.FEAAnalysis, label: '有限元分析' }
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: designTokens.spacing[3],
              padding: designTokens.spacing[3],
              borderRadius: designTokens.borderRadius.md,
              background: designTokens.colors.background.tertiary,
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}>
              <item.icon size={20} color={designTokens.colors.primary[400]} />
              <span style={{
                color: designTokens.colors.neutral[200],
                fontSize: designTokens.typography.fontSize.sm
              }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 状态指示场景 */}
      <div style={{
        background: designTokens.colors.background.glass,
        borderRadius: designTokens.borderRadius.lg,
        padding: designTokens.spacing[4],
        border: `1px solid ${designTokens.colors.neutral[700]}`
      }}>
        <h4 style={{
          color: designTokens.colors.secondary[400],
          fontSize: designTokens.typography.fontSize.lg,
          marginBottom: designTokens.spacing[4]
        }}>
          系统状态
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing[3] }}>
          {[
            { icon: StatusIcons.Computing, label: '正在计算', color: designTokens.colors.semantic.computing },
            { icon: StatusIcons.Completed, label: '计算完成', color: designTokens.colors.semantic.success },
            { icon: StatusIcons.Warning, label: '性能警告', color: designTokens.colors.semantic.warning },
            { icon: StatusIcons.Sync, label: '数据同步', color: designTokens.colors.accent[500] }
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: designTokens.spacing[3],
              padding: designTokens.spacing[3]
            }}>
              <item.icon size={24} color={item.color} animated={true} />
              <span style={{
                color: designTokens.colors.neutral[200],
                fontSize: designTokens.typography.fontSize.sm
              }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 工程模块场景 */}
      <div style={{
        background: designTokens.colors.background.glass,
        borderRadius: designTokens.borderRadius.lg,
        padding: designTokens.spacing[4],
        border: `1px solid ${designTokens.colors.neutral[700]}`
      }}>
        <h4 style={{
          color: designTokens.colors.accent[400],
          fontSize: designTokens.typography.fontSize.lg,
          marginBottom: designTokens.spacing[4]
        }}>
          工程组件
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: designTokens.spacing[3]
        }}>
          {[
            { icon: EngineeringIcons.RetainingWall, label: '围护墙' },
            { icon: EngineeringIcons.StrutSystem, label: '支撑系统' },
            { icon: EngineeringIcons.AnchorSystem, label: '锚杆系统' },
            { icon: EngineeringIcons.MonitoringSystem, label: '监测系统' }
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: designTokens.spacing[2],
              padding: designTokens.spacing[3],
              borderRadius: designTokens.borderRadius.md,
              background: designTokens.colors.background.tertiary
            }}>
              <item.icon size={32} color={designTokens.colors.accent[400]} animated={true} />
              <span style={{
                color: designTokens.colors.neutral[300],
                fontSize: designTokens.typography.fontSize.xs,
                textAlign: 'center'
              }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ==================== Meta配置 ====================

const meta: Meta = {
  title: 'Design System/Icons',
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: designTokens.colors.background.primary }
      ]
    }
  }
};

export default meta;
type Story = StoryObj;

// ==================== 故事定义 ====================

export const AllIcons: Story = {
  render: () => (
    <div style={{
      padding: designTokens.spacing[8],
      background: designTokens.colors.background.primary,
      minHeight: '100vh'
    }}>
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
          DeepCAD 图标系统
        </h1>
        <p style={{
          color: designTokens.colors.neutral[400],
          fontSize: designTokens.typography.fontSize.lg,
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          完整的深基坑CAE平台图标库，包含功能模块、工程专业和状态指示器图标
        </p>
      </div>

      <IconShowcase
        title="🔧 功能模块图标"
        icons={FunctionalIcons}
        categoryColor={designTokens.colors.primary[400]}
      />

      <IconShowcase
        title="🏗️ 工程专业图标" 
        icons={EngineeringIcons}
        categoryColor={designTokens.colors.accent[400]}
      />

      <IconShowcase
        title="📊 状态指示图标"
        icons={StatusIcons}
        categoryColor={designTokens.colors.secondary[400]}
      />
    </div>
  )
};

export const InteractiveDemo: Story = {
  render: () => (
    <div style={{
      padding: designTokens.spacing[6],
      background: designTokens.colors.background.primary,
      minHeight: '100vh'
    }}>
      <InteractiveIconDemo />
    </div>
  )
};

export const ApplicationDemo: Story = {
  render: () => (
    <div style={{
      padding: designTokens.spacing[6],
      background: designTokens.colors.background.primary,
      minHeight: '100vh'
    }}>
      <ApplicationScenarios />
    </div>
  )
};