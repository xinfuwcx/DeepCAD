/**
 * DeepCAD CAE参数配置面板故事
 * 1号架构师 - 专业CAE参数输入界面演示
 */

import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { CAEParameterPanel, CAEParameters } from './CAEParameterPanel';
import { designTokens } from '../../design/tokens';

// ==================== Meta配置 ====================

const meta: Meta<typeof CAEParameterPanel> = {
  title: 'CAE Interface/Parameter Panel',
  component: CAEParameterPanel,
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
        component: `
# CAE参数配置面板

专业的深基坑CAE分析参数配置界面，集成了完整的参数输入、验证和管理功能。

## 特性
- 🏗️ 专业CAE参数分类管理
- 📝 实时参数验证和错误提示
- 🎯 直观的导航和分段式输入
- 📊 参数预览和统计功能
- 💾 参数导入导出支持
- ⚡ 高级参数配置选项

## 参数分类
1. **几何参数** - 基坑尺寸、围护结构设计
2. **网格参数** - 有限元网格控制
3. **材料参数** - 土壤和结构材料特性
4. **计算参数** - 求解器设置和分析类型
5. **边界条件** - 载荷和约束条件

## 界面布局
- 左侧：导航面板和快捷功能
- 右侧：参数配置表单
- 底部：分析启动和错误统计

## 技术实现
- React + TypeScript + Framer Motion
- 实时参数验证和错误处理
- 模态框参数预览
- 响应式设计适配
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof CAEParameterPanel>;

// ==================== 基础演示故事 ====================

export const DefaultPanel: Story = {
  args: {
    onParametersChange: (params: CAEParameters) => {
      console.log('参数更新:', params);
    },
    onAnalysisStart: (params: CAEParameters) => {
      console.log('开始分析:', params);
      alert('分析任务已提交！');
    }
  }
};

// ==================== 交互演示故事 ====================

export const InteractiveDemo: Story = {
  render: () => {
    const [analysisHistory, setAnalysisHistory] = useState<CAEParameters[]>([]);
    const [currentParams, setCurrentParams] = useState<CAEParameters | null>(null);

    const handleParametersChange = (params: CAEParameters) => {
      setCurrentParams(params);
      console.log('参数实时更新:', params);
    };

    const handleAnalysisStart = (params: CAEParameters) => {
      setAnalysisHistory(prev => [...prev, params]);
      alert(`分析任务 #${analysisHistory.length + 1} 已提交！`);
      console.log('分析历史记录:', [...analysisHistory, params]);
    };

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: designTokens.colors.background.primary
      }}>
        {/* 状态栏 */}
        <div style={{
          padding: designTokens.spacing[4],
          background: designTokens.colors.background.secondary,
          borderBottom: `1px solid ${designTokens.colors.neutral[800]}`
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            <div>
              <h1 style={{
                color: designTokens.colors.neutral[100],
                fontSize: designTokens.typography.fontSize['2xl'],
                fontWeight: designTokens.typography.fontWeight.bold,
                margin: 0,
                marginBottom: designTokens.spacing[1]
              }}>
                DeepCAD 深基坑分析系统
              </h1>
              <p style={{
                color: designTokens.colors.neutral[400],
                fontSize: designTokens.typography.fontSize.sm,
                margin: 0
              }}>
                专业CAE参数配置界面演示
              </p>
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: designTokens.spacing[6]
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  color: designTokens.colors.primary[400],
                  fontSize: designTokens.typography.fontSize.lg,
                  fontWeight: designTokens.typography.fontWeight.bold,
                  fontFamily: designTokens.typography.fontFamily.mono.join(', ')
                }}>
                  {analysisHistory.length}
                </div>
                <div style={{
                  color: designTokens.colors.neutral[400],
                  fontSize: designTokens.typography.fontSize.xs
                }}>
                  分析任务
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  color: designTokens.colors.secondary[400],
                  fontSize: designTokens.typography.fontSize.lg,
                  fontWeight: designTokens.typography.fontWeight.bold,
                  fontFamily: designTokens.typography.fontFamily.mono.join(', ')
                }}>
                  {currentParams ? Object.keys(currentParams).length : 0}
                </div>
                <div style={{
                  color: designTokens.colors.neutral[400],
                  fontSize: designTokens.typography.fontSize.xs
                }}>
                  参数组
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 主界面 */}
        <CAEParameterPanel
          onParametersChange={handleParametersChange}
          onAnalysisStart={handleAnalysisStart}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '完整的交互演示，包含参数更新监听和分析任务提交'
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
      background: designTokens.colors.background.primary
    }}>
      <CAEParameterPanel
        onParametersChange={(params) => console.log('移动端参数更新:', params)}
        onAnalysisStart={(params) => {
          console.log('移动端分析启动:', params);
          alert('移动端分析任务已提交！');
        }}
      />
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: 'tablet'
    },
    docs: {
      description: {
        story: '平板和移动设备的适配演示'
      }
    }
  }
};

// ==================== 参数验证演示故事 ====================

export const ValidationDemo: Story = {
  render: () => {
    const [validationResults, setValidationResults] = useState<string[]>([]);

    const handleParametersChange = (params: CAEParameters) => {
      // 模拟参数验证
      const results: string[] = [];
      
      if (params.geometry.excavationDepth > 30) {
        results.push('⚠️ 开挖深度超过30m，建议增加支撑层数');
      }
      
      if (params.mesh.globalSize > params.geometry.excavationDepth / 5) {
        results.push('⚠️ 网格尺寸相对开挖深度过大，可能影响精度');
      }
      
      if (params.material.frictionAngle < 20) {
        results.push('⚠️ 内摩擦角较小，需要特别关注稳定性');
      }
      
      setValidationResults(results);
    };

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: designTokens.spacing[4],
        minHeight: '100vh',
        background: designTokens.colors.background.primary
      }}>
        <CAEParameterPanel
          onParametersChange={handleParametersChange}
          onAnalysisStart={(params) => {
            console.log('验证演示分析启动:', params);
            alert('参数验证通过，分析任务已提交！');
          }}
        />
        
        {/* 验证结果面板 */}
        <div style={{
          padding: designTokens.spacing[4],
          background: designTokens.colors.background.secondary,
          borderLeft: `1px solid ${designTokens.colors.neutral[800]}`
        }}>
          <h3 style={{
            color: designTokens.colors.neutral[100],
            fontSize: designTokens.typography.fontSize.lg,
            fontWeight: designTokens.typography.fontWeight.semibold,
            marginBottom: designTokens.spacing[4]
          }}>
            实时验证结果
          </h3>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: designTokens.spacing[3]
          }}>
            {validationResults.length === 0 ? (
              <div style={{
                padding: designTokens.spacing[4],
                background: designTokens.colors.semantic.success + '20',
                border: `1px solid ${designTokens.colors.semantic.success}40`,
                borderRadius: designTokens.borderRadius.md,
                color: designTokens.colors.semantic.success,
                fontSize: designTokens.typography.fontSize.sm,
                textAlign: 'center'
              }}>
                ✅ 所有参数验证通过
              </div>
            ) : (
              validationResults.map((result, index) => (
                <div
                  key={index}
                  style={{
                    padding: designTokens.spacing[3],
                    background: designTokens.colors.semantic.warning + '20',
                    border: `1px solid ${designTokens.colors.semantic.warning}40`,
                    borderRadius: designTokens.borderRadius.md,
                    color: designTokens.colors.semantic.warning,
                    fontSize: designTokens.typography.fontSize.sm
                  }}
                >
                  {result}
                </div>
              ))
            )}
          </div>
          
          <div style={{
            marginTop: designTokens.spacing[6],
            padding: designTokens.spacing[4],
            background: designTokens.colors.background.glass,
            borderRadius: designTokens.borderRadius.md,
            border: `1px solid ${designTokens.colors.neutral[700]}`
          }}>
            <h4 style={{
              color: designTokens.colors.neutral[200],
              fontSize: designTokens.typography.fontSize.base,
              fontWeight: designTokens.typography.fontWeight.medium,
              marginBottom: designTokens.spacing[2]
            }}>
              验证规则
            </h4>
            <ul style={{
              color: designTokens.colors.neutral[400],
              fontSize: designTokens.typography.fontSize.xs,
              lineHeight: designTokens.typography.lineHeight.relaxed,
              margin: 0,
              paddingLeft: designTokens.spacing[4]
            }}>
              <li>开挖深度 ≤ 30m</li>
              <li>网格尺寸 ≤ 深度/5</li>
              <li>内摩擦角 ≥ 20°</li>
              <li>泊松比 0~0.5</li>
              <li>渗透系数 &gt; 0</li>
            </ul>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: '参数验证功能演示，包含实时验证和规则提示'
      }
    }
  }
};

// ==================== 专家模式故事 ====================

export const ExpertMode: Story = {
  render: () => (
    <div style={{
      background: designTokens.colors.background.primary,
      minHeight: '100vh'
    }}>
      {/* 专家模式标题栏 */}
      <div style={{
        padding: designTokens.spacing[4],
        background: `linear-gradient(135deg, ${designTokens.colors.primary[600]}, ${designTokens.colors.accent[600]})`,
        color: designTokens.colors.neutral[100],
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: designTokens.typography.fontSize['3xl'],
          fontWeight: designTokens.typography.fontWeight.bold,
          margin: 0,
          marginBottom: designTokens.spacing[2]
        }}>
          🎓 CAE专家模式
        </h1>
        <p style={{
          fontSize: designTokens.typography.fontSize.base,
          opacity: 0.9,
          margin: 0
        }}>
          高级用户专用的完整参数配置界面
        </p>
      </div>

      <CAEParameterPanel
        onParametersChange={(params) => {
          console.log('专家模式参数更新:', params);
          // 可以添加更复杂的参数处理逻辑
        }}
        onAnalysisStart={(params) => {
          console.log('专家模式分析启动:', params);
          // 模拟提交到高性能计算集群
          alert('任务已提交到HPC集群，预计30分钟完成分析');
        }}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '专家模式界面，为高级用户提供完整的参数控制'
      }
    }
  }
};

// ==================== 性能测试故事 ====================

export const PerformanceTest: Story = {
  render: () => {
    const [updateCount, setUpdateCount] = useState(0);
    const [renderTime, setRenderTime] = useState(0);

    const handleParametersChange = (params: CAEParameters) => {
      const startTime = performance.now();
      
      // 模拟参数处理
      setTimeout(() => {
        const endTime = performance.now();
        setRenderTime(endTime - startTime);
        setUpdateCount(prev => prev + 1);
      }, 0);
      
      console.log('性能测试参数更新:', params);
    };

    return (
      <div style={{
        background: designTokens.colors.background.primary,
        minHeight: '100vh'
      }}>
        {/* 性能监控面板 */}
        <div style={{
          position: 'fixed',
          top: designTokens.spacing[4],
          right: designTokens.spacing[4],
          zIndex: 1000,
          padding: designTokens.spacing[4],
          background: designTokens.colors.background.glass,
          backdropFilter: 'blur(12px)',
          borderRadius: designTokens.borderRadius.lg,
          border: `1px solid ${designTokens.colors.neutral[700]}`,
          minWidth: '200px'
        }}>
          <h3 style={{
            color: designTokens.colors.neutral[100],
            fontSize: designTokens.typography.fontSize.base,
            fontWeight: designTokens.typography.fontWeight.semibold,
            marginBottom: designTokens.spacing[3]
          }}>
            性能监控
          </h3>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: designTokens.spacing[2],
            fontSize: designTokens.typography.fontSize.sm
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: designTokens.colors.neutral[400] }}>更新次数:</span>
              <span style={{ 
                color: designTokens.colors.primary[400],
                fontFamily: designTokens.typography.fontFamily.mono.join(', ')
              }}>
                {updateCount}
              </span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: designTokens.colors.neutral[400] }}>响应时间:</span>
              <span style={{ 
                color: designTokens.colors.secondary[400],
                fontFamily: designTokens.typography.fontFamily.mono.join(', ')
              }}>
                {renderTime.toFixed(2)}ms
              </span>
            </div>
          </div>
        </div>

        <CAEParameterPanel
          onParametersChange={handleParametersChange}
          onAnalysisStart={(params) => {
            console.log('性能测试分析启动:', params);
            alert('性能测试完成！');
          }}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: '性能测试模式，监控组件的更新频率和响应时间'
      }
    }
  }
};