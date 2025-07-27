/**
 * DeepCAD 品牌指南故事展示
 * 1号架构师 - 完整的品牌视觉标准化系统演示
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { brandGuide } from './brandGuide';
import { designTokens } from './tokens';

// ==================== 色彩展示组件 ====================

const ColorPalette: React.FC<{
  title: string;
  colors: Record<string, any>;
  showVariations?: boolean;
}> = ({ title, colors, showVariations = false }) => (
  <div style={{
    marginBottom: designTokens.spacing[8]
  }}>
    <h3 style={{
      color: designTokens.colors.neutral[100],
      fontSize: designTokens.typography.fontSize.xl,
      fontWeight: designTokens.typography.fontWeight.semibold,
      marginBottom: designTokens.spacing[4]
    }}>
      {title}
    </h3>
    
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: designTokens.spacing[4]
    }}>
      {Object.entries(colors).map(([name, colorData]: [string, any]) => (
        <div
          key={name}
          style={{
            background: designTokens.colors.background.glass,
            borderRadius: designTokens.borderRadius.lg,
            padding: designTokens.spacing[4],
            border: `1px solid ${designTokens.colors.neutral[800]}`
          }}
        >
          {/* 主色彩块 */}
          <div style={{
            width: '100%',
            height: '80px',
            backgroundColor: colorData.hex || colorData,
            borderRadius: designTokens.borderRadius.md,
            marginBottom: designTokens.spacing[3],
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{
              color: 'white',
              fontSize: designTokens.typography.fontSize.sm,
              fontWeight: designTokens.typography.fontWeight.medium,
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}>
              {colorData.name || name}
            </span>
          </div>
          
          {/* 色彩信息 */}
          <div style={{
            marginBottom: designTokens.spacing[3]
          }}>
            <h4 style={{
              color: designTokens.colors.neutral[200],
              fontSize: designTokens.typography.fontSize.base,
              fontWeight: designTokens.typography.fontWeight.medium,
              marginBottom: designTokens.spacing[2]
            }}>
              {colorData.name || name}
            </h4>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: designTokens.spacing[1]
            }}>
              <code style={{
                color: designTokens.colors.neutral[400],
                fontSize: designTokens.typography.fontSize.xs,
                fontFamily: designTokens.typography.fontFamily.mono.join(', ')
              }}>
                HEX: {colorData.hex || colorData}
              </code>
              {colorData.rgb && (
                <code style={{
                  color: designTokens.colors.neutral[400],
                  fontSize: designTokens.typography.fontSize.xs,
                  fontFamily: designTokens.typography.fontFamily.mono.join(', ')
                }}>
                  RGB: {colorData.rgb}
                </code>
              )}
              {colorData.hsl && (
                <code style={{
                  color: designTokens.colors.neutral[400],
                  fontSize: designTokens.typography.fontSize.xs,
                  fontFamily: designTokens.typography.fontFamily.mono.join(', ')
                }}>
                  HSL: {colorData.hsl}
                </code>
              )}
            </div>
          </div>
          
          {/* 使用场景 */}
          {colorData.usage && (
            <div style={{
              marginBottom: designTokens.spacing[3]
            }}>
              <p style={{
                color: designTokens.colors.neutral[300],
                fontSize: designTokens.typography.fontSize.sm,
                marginBottom: designTokens.spacing[2]
              }}>
                使用场景：
              </p>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: designTokens.spacing[1]
              }}>
                {colorData.usage.map((use: string, i: number) => (
                  <span
                    key={i}
                    style={{
                      background: designTokens.colors.background.tertiary,
                      color: designTokens.colors.neutral[300],
                      fontSize: designTokens.typography.fontSize.xs,
                      padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
                      borderRadius: designTokens.borderRadius.sm,
                      border: `1px solid ${designTokens.colors.neutral[700]}`
                    }}
                  >
                    {use}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* 色彩变化 */}
          {showVariations && colorData.variations && (
            <div>
              <p style={{
                color: designTokens.colors.neutral[300],
                fontSize: designTokens.typography.fontSize.sm,
                marginBottom: designTokens.spacing[2]
              }}>
                色彩变化：
              </p>
              <div style={{
                display: 'flex',
                gap: designTokens.spacing[1]
              }}>
                {Object.entries(colorData.variations).map(([variant, color]: [string, any]) => (
                  <div
                    key={variant}
                    style={{
                      flex: 1,
                      height: '24px',
                      backgroundColor: color,
                      borderRadius: designTokens.borderRadius.sm,
                      position: 'relative'
                    }}
                    title={`${variant}: ${color}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

// ==================== 字体展示组件 ====================

const TypographyShowcase: React.FC = () => (
  <div style={{
    marginBottom: designTokens.spacing[8]
  }}>
    <h3 style={{
      color: designTokens.colors.neutral[100],
      fontSize: designTokens.typography.fontSize.xl,
      fontWeight: designTokens.typography.fontWeight.semibold,
      marginBottom: designTokens.spacing[6]
    }}>
      字体系统
    </h3>
    
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: designTokens.spacing[6]
    }}>
      {Object.entries(brandGuide.typography).map(([name, fontData]: [string, any]) => (
        <div
          key={name}
          style={{
            background: designTokens.colors.background.glass,
            borderRadius: designTokens.borderRadius.lg,
            padding: designTokens.spacing[6],
            border: `1px solid ${designTokens.colors.neutral[800]}`
          }}
        >
          <h4 style={{
            color: designTokens.colors.primary[400],
            fontSize: designTokens.typography.fontSize.lg,
            fontWeight: designTokens.typography.fontWeight.semibold,
            marginBottom: designTokens.spacing[4],
            fontFamily: fontData.name
          }}>
            {fontData.name}
          </h4>
          
          <div style={{
            marginBottom: designTokens.spacing[4]
          }}>
            <p style={{
              color: designTokens.colors.neutral[300],
              fontSize: designTokens.typography.fontSize.sm,
              marginBottom: designTokens.spacing[2]
            }}>
              特征：{fontData.characteristics}
            </p>
            <p style={{
              color: designTokens.colors.neutral[400],
              fontSize: designTokens.typography.fontSize.sm,
              marginBottom: designTokens.spacing[2]
            }}>
              用途：{fontData.usage.join('、')}
            </p>
          </div>
          
          {/* 字体预览 */}
          <div style={{
            background: designTokens.colors.background.tertiary,
            borderRadius: designTokens.borderRadius.md,
            padding: designTokens.spacing[4],
            marginBottom: designTokens.spacing[4]
          }}>
            <div style={{
              fontFamily: `${fontData.name}, ${fontData.fallback.join(', ')}`,
              fontSize: '24px',
              color: designTokens.colors.neutral[100],
              marginBottom: designTokens.spacing[2]
            }}>
              DeepCAD 深基坑CAE平台
            </div>
            <div style={{
              fontFamily: `${fontData.name}, ${fontData.fallback.join(', ')}`,
              fontSize: '16px',
              color: designTokens.colors.neutral[300]
            }}>
              The quick brown fox jumps over the lazy dog
            </div>
            {name === 'monospace' && (
              <div style={{
                fontFamily: `${fontData.name}, ${fontData.fallback.join(', ')}`,
                fontSize: '14px',
                color: designTokens.colors.secondary[400],
                marginTop: designTokens.spacing[2]
              }}>
                {`const config = { version: 1.0, enabled: true };`}
              </div>
            )}
          </div>
          
          <div>
            <p style={{
              color: designTokens.colors.neutral[400],
              fontSize: designTokens.typography.fontSize.xs,
              marginBottom: designTokens.spacing[1]
            }}>
              可用字重：{fontData.weights.join(', ')}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ==================== 视觉层次展示 ====================

const VisualHierarchy: React.FC = () => (
  <div style={{
    marginBottom: designTokens.spacing[8]
  }}>
    <h3 style={{
      color: designTokens.colors.neutral[100],
      fontSize: designTokens.typography.fontSize.xl,
      fontWeight: designTokens.typography.fontWeight.semibold,
      marginBottom: designTokens.spacing[6]
    }}>
      视觉层次系统
    </h3>
    
    <div style={{
      background: designTokens.colors.background.glass,
      borderRadius: designTokens.borderRadius.lg,
      padding: designTokens.spacing[8],
      border: `1px solid ${designTokens.colors.neutral[800]}`
    }}>
      {/* 标题层次 */}
      <div style={{ marginBottom: designTokens.spacing[8] }}>
        <h4 style={{
          color: designTokens.colors.primary[400],
          fontSize: designTokens.typography.fontSize.lg,
          fontWeight: designTokens.typography.fontWeight.semibold,
          marginBottom: designTokens.spacing[4]
        }}>
          标题层次
        </h4>
        
        {Object.entries(brandGuide.hierarchy.headings).map(([level, style]: [string, any]) => (
          <div key={level} style={{ marginBottom: designTokens.spacing[4] }}>
            <div style={{
              fontSize: style.size,
              fontWeight: style.weight,
              lineHeight: style.lineHeight,
              color: style.color,
              marginBottom: designTokens.spacing[1]
            }}>
              {level.toUpperCase()}: 这是一个{style.usage}示例
            </div>
            <div style={{
              fontSize: designTokens.typography.fontSize.xs,
              color: designTokens.colors.neutral[500],
              fontFamily: designTokens.typography.fontFamily.mono.join(', ')
            }}>
              Size: {style.size} • Weight: {style.weight} • Usage: {style.usage}
            </div>
          </div>
        ))}
      </div>
      
      {/* 正文层次 */}
      <div>
        <h4 style={{
          color: designTokens.colors.primary[400],
          fontSize: designTokens.typography.fontSize.lg,
          fontWeight: designTokens.typography.fontWeight.semibold,
          marginBottom: designTokens.spacing[4]
        }}>
          正文层次
        </h4>
        
        {Object.entries(brandGuide.hierarchy.body).map(([size, style]: [string, any]) => (
          <div key={size} style={{ marginBottom: designTokens.spacing[4] }}>
            <div style={{
              fontSize: style.size,
              fontWeight: style.weight,
              lineHeight: style.lineHeight,
              color: style.color,
              marginBottom: designTokens.spacing[1]
            }}>
              {size}: 这是一个{style.usage}的示例文本，展示了在实际应用中的视觉效果和可读性。
            </div>
            <div style={{
              fontSize: designTokens.typography.fontSize.xs,
              color: designTokens.colors.neutral[500],
              fontFamily: designTokens.typography.fontFamily.mono.join(', ')
            }}>
              Size: {style.size} • Weight: {style.weight} • Usage: {style.usage}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ==================== 组件规范展示 ====================

const ComponentSpecs: React.FC = () => (
  <div style={{
    marginBottom: designTokens.spacing[8]
  }}>
    <h3 style={{
      color: designTokens.colors.neutral[100],
      fontSize: designTokens.typography.fontSize.xl,
      fontWeight: designTokens.typography.fontWeight.semibold,
      marginBottom: designTokens.spacing[6]
    }}>
      组件设计规范
    </h3>
    
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: designTokens.spacing[6]
    }}>
      {/* 按钮规范 */}
      <div style={{
        background: designTokens.colors.background.glass,
        borderRadius: designTokens.borderRadius.lg,
        padding: designTokens.spacing[6],
        border: `1px solid ${designTokens.colors.neutral[800]}`
      }}>
        <h4 style={{
          color: designTokens.colors.primary[400],
          fontSize: designTokens.typography.fontSize.lg,
          fontWeight: designTokens.typography.fontWeight.semibold,
          marginBottom: designTokens.spacing[4]
        }}>
          按钮规范
        </h4>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: designTokens.spacing[4]
        }}>
          {/* 主要按钮 */}
          <div>
            <p style={{
              color: designTokens.colors.neutral[300],
              fontSize: designTokens.typography.fontSize.sm,
              marginBottom: designTokens.spacing[2]
            }}>
              主要按钮 (Primary)
            </p>
            <button style={{
              ...brandGuide.components.buttons.primary,
              border: 'none',
              cursor: 'pointer'
            }}>
              开始计算
            </button>
          </div>
          
          {/* 次要按钮 */}
          <div>
            <p style={{
              color: designTokens.colors.neutral[300],
              fontSize: designTokens.typography.fontSize.sm,
              marginBottom: designTokens.spacing[2]
            }}>
              次要按钮 (Secondary)
            </p>
            <button style={{
              ...brandGuide.components.buttons.secondary,
              cursor: 'pointer'
            }}>
              取消操作
            </button>
          </div>
        </div>
      </div>
      
      {/* 卡片规范 */}
      <div style={{
        background: designTokens.colors.background.glass,
        borderRadius: designTokens.borderRadius.lg,
        padding: designTokens.spacing[6],
        border: `1px solid ${designTokens.colors.neutral[800]}`
      }}>
        <h4 style={{
          color: designTokens.colors.primary[400],
          fontSize: designTokens.typography.fontSize.lg,
          fontWeight: designTokens.typography.fontWeight.semibold,
          marginBottom: designTokens.spacing[4]
        }}>
          卡片规范
        </h4>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: designTokens.spacing[4]
        }}>
          {/* 默认卡片 */}
          <div>
            <p style={{
              color: designTokens.colors.neutral[300],
              fontSize: designTokens.typography.fontSize.sm,
              marginBottom: designTokens.spacing[2]
            }}>
              默认卡片
            </p>
            <div style={{
              ...brandGuide.components.cards.default,
              padding: designTokens.spacing[4]
            }}>
              <h5 style={{
                color: designTokens.colors.neutral[200],
                fontSize: designTokens.typography.fontSize.base,
                fontWeight: designTokens.typography.fontWeight.medium,
                marginBottom: designTokens.spacing[2]
              }}>
                项目信息
              </h5>
              <p style={{
                color: designTokens.colors.neutral[400],
                fontSize: designTokens.typography.fontSize.sm,
                margin: 0
              }}>
                深基坑工程CAE分析项目
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* 输入框规范 */}
      <div style={{
        background: designTokens.colors.background.glass,
        borderRadius: designTokens.borderRadius.lg,
        padding: designTokens.spacing[6],
        border: `1px solid ${designTokens.colors.neutral[800]}`
      }}>
        <h4 style={{
          color: designTokens.colors.primary[400],
          fontSize: designTokens.typography.fontSize.lg,
          fontWeight: designTokens.typography.fontWeight.semibold,
          marginBottom: designTokens.spacing[4]
        }}>
          输入框规范
        </h4>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: designTokens.spacing[4]
        }}>
          <div>
            <label style={{
              color: designTokens.colors.neutral[300],
              fontSize: designTokens.typography.fontSize.sm,
              display: 'block',
              marginBottom: designTokens.spacing[2]
            }}>
              项目名称
            </label>
            <input
              type="text"
              placeholder="请输入项目名称"
              style={brandGuide.components.inputs.default}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ==================== 品牌应用指南 ====================

const BrandApplications: React.FC = () => (
  <div style={{
    marginBottom: designTokens.spacing[8]
  }}>
    <h3 style={{
      color: designTokens.colors.neutral[100],
      fontSize: designTokens.typography.fontSize.xl,
      fontWeight: designTokens.typography.fontWeight.semibold,
      marginBottom: designTokens.spacing[6]
    }}>
      品牌应用指南
    </h3>
    
    <div style={{
      background: designTokens.colors.background.glass,
      borderRadius: designTokens.borderRadius.lg,
      padding: designTokens.spacing[8],
      border: `1px solid ${designTokens.colors.neutral[800]}`
    }}>
      {/* Logo使用规范 */}
      <div style={{ marginBottom: designTokens.spacing[8] }}>
        <h4 style={{
          color: designTokens.colors.primary[400],
          fontSize: designTokens.typography.fontSize.lg,
          fontWeight: designTokens.typography.fontWeight.semibold,
          marginBottom: designTokens.spacing[4]
        }}>
          Logo使用规范
        </h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: designTokens.spacing[4]
        }}>
          {brandGuide.applications.logo.donts.map((dont, i) => (
            <div
              key={i}
              style={{
                background: designTokens.colors.background.tertiary,
                borderRadius: designTokens.borderRadius.md,
                padding: designTokens.spacing[4],
                border: `1px solid ${designTokens.colors.semantic.error}40`
              }}
            >
              <div style={{
                color: designTokens.colors.semantic.error,
                fontSize: designTokens.typography.fontSize.xs,
                fontWeight: designTokens.typography.fontWeight.medium,
                marginBottom: designTokens.spacing[2]
              }}>
                ❌ 禁止
              </div>
              <p style={{
                color: designTokens.colors.neutral[400],
                fontSize: designTokens.typography.fontSize.sm,
                margin: 0
              }}>
                {dont}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* 可访问性标准 */}
      <div>
        <h4 style={{
          color: designTokens.colors.primary[400],
          fontSize: designTokens.typography.fontSize.lg,
          fontWeight: designTokens.typography.fontWeight.semibold,
          marginBottom: designTokens.spacing[4]
        }}>
          可访问性标准
        </h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: designTokens.spacing[4]
        }}>
          <div style={{
            background: designTokens.colors.background.tertiary,
            borderRadius: designTokens.borderRadius.md,
            padding: designTokens.spacing[4]
          }}>
            <h5 style={{
              color: designTokens.colors.secondary[400],
              fontSize: designTokens.typography.fontSize.base,
              fontWeight: designTokens.typography.fontWeight.medium,
              marginBottom: designTokens.spacing[2]
            }}>
              颜色对比度
            </h5>
            <div style={{
              fontSize: designTokens.typography.fontSize.sm,
              color: designTokens.colors.neutral[300]
            }}>
              <p>AA级：正文 4.5:1，大文字 3.0:1</p>
              <p>AAA级：正文 7.0:1，大文字 4.5:1</p>
            </div>
          </div>
          
          <div style={{
            background: designTokens.colors.background.tertiary,
            borderRadius: designTokens.borderRadius.md,
            padding: designTokens.spacing[4]
          }}>
            <h5 style={{
              color: designTokens.colors.secondary[400],
              fontSize: designTokens.typography.fontSize.base,
              fontWeight: designTokens.typography.fontWeight.medium,
              marginBottom: designTokens.spacing[2]
            }}>
              触摸目标
            </h5>
            <div style={{
              fontSize: designTokens.typography.fontSize.sm,
              color: designTokens.colors.neutral[300]
            }}>
              <p>最小尺寸：44px × 44px</p>
              <p>推荐尺寸：48px × 48px</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ==================== Meta配置 ====================

const meta: Meta = {
  title: 'Design System/Brand Guide',
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: designTokens.colors.background.primary }
      ]
    },
    docs: {
      description: {
        component: 'DeepCAD 品牌设计指南 - 完整的视觉标准化系统'
      }
    }
  }
};

export default meta;
type Story = StoryObj;

// ==================== 故事定义 ====================

export const CompleteBrandGuide: Story = {
  render: () => (
    <div style={{
      padding: designTokens.spacing[8],
      background: designTokens.colors.background.primary,
      minHeight: '100vh'
    }}>
      {/* 品牌指南标题 */}
      <div style={{
        textAlign: 'center',
        marginBottom: designTokens.spacing[12]
      }}>
        <h1 style={{
          color: designTokens.colors.neutral[100],
          fontSize: designTokens.typography.fontSize['5xl'],
          fontWeight: designTokens.typography.fontWeight.bold,
          marginBottom: designTokens.spacing[4],
          background: `linear-gradient(135deg, ${designTokens.colors.primary[400]}, ${designTokens.colors.accent[400]})`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          DeepCAD 品牌设计指南
        </h1>
        <p style={{
          color: designTokens.colors.neutral[400],
          fontSize: designTokens.typography.fontSize.xl,
          maxWidth: '800px',
          margin: '0 auto',
          lineHeight: designTokens.typography.lineHeight.relaxed
        }}>
          世界级深基坑CAE平台的完整品牌视觉标准化系统，确保在所有触点上保持一致的专业形象和用户体验
        </p>
      </div>

      {/* 品牌核心理念 */}
      <div style={{
        background: designTokens.colors.background.glass,
        borderRadius: designTokens.borderRadius.xl,
        padding: designTokens.spacing[8],
        marginBottom: designTokens.spacing[8],
        border: `1px solid ${designTokens.colors.neutral[800]}`,
        backdropFilter: 'blur(12px)'
      }}>
        <h2 style={{
          color: designTokens.colors.neutral[100],
          fontSize: designTokens.typography.fontSize['3xl'],
          fontWeight: designTokens.typography.fontWeight.bold,
          marginBottom: designTokens.spacing[6],
          textAlign: 'center'
        }}>
          品牌核心理念
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: designTokens.spacing[6]
        }}>
          <div style={{
            background: designTokens.colors.background.tertiary,
            borderRadius: designTokens.borderRadius.lg,
            padding: designTokens.spacing[6],
            textAlign: 'center'
          }}>
            <h3 style={{
              color: designTokens.colors.primary[400],
              fontSize: designTokens.typography.fontSize.xl,
              fontWeight: designTokens.typography.fontWeight.semibold,
              marginBottom: designTokens.spacing[3]
            }}>
              使命 Mission
            </h3>
            <p style={{
              color: designTokens.colors.neutral[300],
              fontSize: designTokens.typography.fontSize.base,
              lineHeight: designTokens.typography.lineHeight.relaxed
            }}>
              {brandGuide.core.mission.zh}
            </p>
          </div>
          
          <div style={{
            background: designTokens.colors.background.tertiary,
            borderRadius: designTokens.borderRadius.lg,
            padding: designTokens.spacing[6],
            textAlign: 'center'
          }}>
            <h3 style={{
              color: designTokens.colors.accent[400],
              fontSize: designTokens.typography.fontSize.xl,
              fontWeight: designTokens.typography.fontWeight.semibold,
              marginBottom: designTokens.spacing[3]
            }}>
              愿景 Vision
            </h3>
            <p style={{
              color: designTokens.colors.neutral[300],
              fontSize: designTokens.typography.fontSize.base,
              lineHeight: designTokens.typography.lineHeight.relaxed
            }}>
              {brandGuide.core.vision.zh}
            </p>
          </div>
        </div>
        
        <div style={{
          marginTop: designTokens.spacing[6]
        }}>
          <h3 style={{
            color: designTokens.colors.secondary[400],
            fontSize: designTokens.typography.fontSize.xl,
            fontWeight: designTokens.typography.fontWeight.semibold,
            marginBottom: designTokens.spacing[4],
            textAlign: 'center'
          }}>
            核心价值 Core Values
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: designTokens.spacing[4]
          }}>
            {brandGuide.core.values.map((value) => (
              <div
                key={value.key}
                style={{
                  background: designTokens.colors.background.surface,
                  borderRadius: designTokens.borderRadius.md,
                  padding: designTokens.spacing[4],
                  textAlign: 'center'
                }}
              >
                <h4 style={{
                  color: designTokens.colors.neutral[200],
                  fontSize: designTokens.typography.fontSize.lg,
                  fontWeight: designTokens.typography.fontWeight.medium,
                  marginBottom: designTokens.spacing[2]
                }}>
                  {value.zh}
                </h4>
                <p style={{
                  color: designTokens.colors.neutral[400],
                  fontSize: designTokens.typography.fontSize.sm,
                  margin: 0
                }}>
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 色彩系统 */}
      <ColorPalette 
        title="主品牌色彩"
        colors={{
          primary: brandGuide.colors.primary,
          secondary: brandGuide.colors.secondary,
          accent: brandGuide.colors.accent
        }}
        showVariations={true}
      />

      <ColorPalette 
        title="语义色彩系统"
        colors={brandGuide.colors.semantic}
      />

      {/* 字体系统 */}
      <TypographyShowcase />

      {/* 视觉层次 */}
      <VisualHierarchy />

      {/* 组件规范 */}
      <ComponentSpecs />

      {/* 品牌应用 */}
      <BrandApplications />
    </div>
  )
};

export const ColorSystem: Story = {
  render: () => (
    <div style={{
      padding: designTokens.spacing[6],
      background: designTokens.colors.background.primary,
      minHeight: '100vh'
    }}>
      <ColorPalette 
        title="主品牌色彩"
        colors={{
          primary: brandGuide.colors.primary,
          secondary: brandGuide.colors.secondary,
          accent: brandGuide.colors.accent
        }}
        showVariations={true}
      />
      <ColorPalette 
        title="语义色彩"
        colors={brandGuide.colors.semantic}
      />
    </div>
  )
};

export const TypographySystem: Story = {
  render: () => (
    <div style={{
      padding: designTokens.spacing[6],
      background: designTokens.colors.background.primary,
      minHeight: '100vh'
    }}>
      <TypographyShowcase />
      <VisualHierarchy />
    </div>
  )
};

export const ComponentGuidelines: Story = {
  render: () => (
    <div style={{
      padding: designTokens.spacing[6],
      background: designTokens.colors.background.primary,
      minHeight: '100vh'
    }}>
      <ComponentSpecs />
    </div>
  )
};