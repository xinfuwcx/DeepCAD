/**
 * 物理AI嵌入式面板
 * 3号计算专家 - 左侧可折叠智能面板设计
 * 与其他面板保持一致的设计语言
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { designTokens } from '../design/tokens';
import GlassmorphismCard from './ui/GlassmorphismCard';
import Button from './ui/Button';
import { FunctionalIcons } from './icons/FunctionalIconsQuickFix';

// 物理AI状态接口
interface PhysicsAIState {
  isExpanded: boolean;
  currentTask: 'design_variables' | 'optimization' | 'adjoint_solver' | 'management' | null;
  designVariables: DesignVariable[];
  optimizationProgress: number;
  adjointSolverStatus: 'idle' | 'running' | 'converged' | 'failed';
  results: PhysicsAIResults | null;
}

interface DesignVariable {
  id: string;
  name: string;
  currentValue: number;
  minValue: number;
  maxValue: number;
  unit: string;
  impact: 'high' | 'medium' | 'low';
}

interface PhysicsAIResults {
  objectiveValue: number;
  convergenceHistory: number[];
  sensitivities: Array<{ variable: string; sensitivity: number }>;
  recommendations: string[];
}

interface PhysicsAIEmbeddedPanelProps {
  isVisible: boolean;
  onClose: () => void;
  onVariableChange?: (variableId: string, newValue: number) => void;
  onOptimizationStart?: () => void;
  on3DViewportUpdate?: (data: any) => void;
}

export const PhysicsAIEmbeddedPanel: React.FC<PhysicsAIEmbeddedPanelProps> = ({
  isVisible,
  onClose,
  onVariableChange,
  onOptimizationStart,
  on3DViewportUpdate
}) => {
  const [aiState, setAIState] = useState<PhysicsAIState>({
    isExpanded: true,
    currentTask: null,
    designVariables: [
      {
        id: 'wall_thickness',
        name: '地连墙厚度',
        currentValue: 0.8,
        minValue: 0.6,
        maxValue: 1.2,
        unit: 'm',
        impact: 'high'
      },
      {
        id: 'embedment_depth', 
        name: '入土深度',
        currentValue: 18.0,
        minValue: 15.0,
        maxValue: 25.0,
        unit: 'm',
        impact: 'high'
      },
      {
        id: 'support_spacing',
        name: '支撑间距',
        currentValue: 6.0,
        minValue: 4.0,
        maxValue: 8.0,
        unit: 'm',
        impact: 'medium'
      },
      {
        id: 'safety_factor',
        name: '安全系数',
        currentValue: 1.25,
        minValue: 1.1,
        maxValue: 1.5,
        unit: '',
        impact: 'high'
      }
    ],
    optimizationProgress: 0,
    adjointSolverStatus: 'idle',
    results: null
  });

  // 面板展开/折叠控制
  const toggleExpanded = useCallback(() => {
    setAIState(prev => ({ ...prev, isExpanded: !prev.isExpanded }));
  }, []);

  // 设计变量更新
  const handleVariableChange = useCallback((variableId: string, newValue: number) => {
    setAIState(prev => ({
      ...prev,
      designVariables: prev.designVariables.map(v => 
        v.id === variableId ? { ...v, currentValue: newValue } : v
      )
    }));
    
    // 通知3D视口更新
    onVariableChange?.(variableId, newValue);
    on3DViewportUpdate?.({ type: 'variable_change', variableId, newValue });
  }, [onVariableChange, on3DViewportUpdate]);

  // 启动优化
  const startOptimization = useCallback(() => {
    setAIState(prev => ({ ...prev, currentTask: 'optimization', optimizationProgress: 0 }));
    onOptimizationStart?.();
    
    // 模拟优化进度
    const progressInterval = setInterval(() => {
      setAIState(prev => {
        const newProgress = Math.min(prev.optimizationProgress + Math.random() * 10, 100);
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          return {
            ...prev,
            optimizationProgress: 100,
            currentTask: null,
            results: {
              objectiveValue: 0.85,
              convergenceHistory: [1.0, 0.95, 0.88, 0.85],
              sensitivities: [
                { variable: 'wall_thickness', sensitivity: 0.65 },
                { variable: 'embedment_depth', sensitivity: 0.45 },
                { variable: 'support_spacing', sensitivity: 0.25 }
              ],
              recommendations: [
                '建议增加地连墙厚度至0.9m',
                '优化支撑预应力至800kN',
                '考虑增加中间支撑层'
              ]
            }
          };
        }
        return { ...prev, optimizationProgress: newProgress };
      });
    }, 200);
  }, [onOptimizationStart]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            left: 0,
            top: 80, // 避开顶部导航栏
            bottom: 0,
            width: aiState.isExpanded ? '420px' : '60px',
            background: `linear-gradient(135deg, 
              ${designTokens.colors.dark.surface}95, 
              ${designTokens.colors.dark.card}95)`,
            backdropFilter: 'blur(20px)',
            borderRight: `1px solid ${designTokens.colors.accent.ai}40`,
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.3s ease'
          }}
        >
          {/* 面板头部 */}
          <div style={{
            padding: '20px',
            borderBottom: `1px solid ${designTokens.colors.accent.ai}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: `linear-gradient(45deg, ${designTokens.colors.accent.ai}, ${designTokens.colors.accent.quantum})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }}>
                🧠
              </div>
              
              {aiState.isExpanded && (
                <div>
                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 600,
                    color: designTokens.colors.accent.ai
                  }}>
                    物理AI助手
                  </h3>
                  <p style={{
                    margin: '2px 0 0 0',
                    fontSize: '12px',
                    color: designTokens.colors.light.secondary,
                    opacity: 0.8
                  }}>
                    智能优化 & 参数预测
                  </p>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleExpanded}
                style={{
                  padding: '6px',
                  minWidth: 'auto',
                  color: designTokens.colors.light.secondary
                }}
              >
                {aiState.isExpanded ? '◀' : '▶'}
              </Button>
              
              {aiState.isExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  style={{
                    padding: '6px',
                    minWidth: 'auto',
                    color: designTokens.colors.light.secondary
                  }}
                >
                  ✕
                </Button>
              )}
            </div>
          </div>

          {/* 面板内容 */}
          {aiState.isExpanded && (
            <div style={{
              flex: 1,
              padding: '20px',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              
              {/* 设计变量管理 - 紧凑卡片式 */}
              <GlassmorphismCard
                title="设计变量"
                description="参数实时调整"
                variant="ai"
                style={{
                  padding: '16px',
                  minHeight: 'auto'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {aiState.designVariables.map(variable => (
                    <div key={variable.id} style={{
                      padding: '12px',
                      background: `${designTokens.colors.dark.card}40`,
                      borderRadius: '8px',
                      border: `1px solid ${designTokens.colors.accent.ai}20`
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: designTokens.colors.light.primary
                        }}>
                          {variable.name}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: variable.impact === 'high' ? 
                            designTokens.colors.semantic.error + '20' :
                            variable.impact === 'medium' ?
                            designTokens.colors.semantic.warning + '20' :
                            designTokens.colors.semantic.info + '20',
                          color: variable.impact === 'high' ? 
                            designTokens.colors.semantic.error :
                            variable.impact === 'medium' ?
                            designTokens.colors.semantic.warning :
                            designTokens.colors.semantic.info
                        }}>
                          {variable.impact}
                        </span>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <input
                          type="range"
                          min={variable.minValue}
                          max={variable.maxValue}
                          step={0.1}
                          value={variable.currentValue}
                          onChange={(e) => handleVariableChange(variable.id, parseFloat(e.target.value))}
                          style={{
                            flex: 1,
                            accentColor: designTokens.colors.accent.ai
                          }}
                        />
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: designTokens.colors.accent.ai,
                          minWidth: '60px',
                          textAlign: 'right'
                        }}>
                          {variable.currentValue.toFixed(1)}{variable.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassmorphismCard>

              {/* 目标函数优化 - 实时图表显示 */}
              <GlassmorphismCard
                title="优化目标"
                description="安全系数最大化"
                variant="computation"
                style={{
                  padding: '16px',
                  minHeight: 'auto'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontSize: '14px',
                      color: designTokens.colors.light.secondary
                    }}>
                      当前目标值
                    </span>
                    <span style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: designTokens.colors.accent.computation
                    }}>
                      {aiState.results?.objectiveValue.toFixed(3) || '0.825'}
                    </span>
                  </div>
                  
                  <Button
                    variant="primary"
                    size="sm" 
                    caeType="ai"
                    onClick={startOptimization}
                    disabled={aiState.currentTask === 'optimization'}
                    style={{
                      width: '100%',
                      background: `linear-gradient(45deg, ${designTokens.colors.accent.ai}, ${designTokens.colors.accent.quantum})`
                    }}
                  >
                    {aiState.currentTask === 'optimization' ? 
                      `🔄 优化中... ${aiState.optimizationProgress.toFixed(0)}%` : 
                      '🚀 启动智能优化'
                    }
                  </Button>
                  
                  {aiState.currentTask === 'optimization' && (
                    <div style={{
                      width: '100%',
                      height: '4px',
                      background: `${designTokens.colors.dark.card}80`,
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${aiState.optimizationProgress}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${designTokens.colors.accent.ai}, ${designTokens.colors.accent.quantum})`,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  )}
                </div>
              </GlassmorphismCard>

              {/* 优化结果和建议 */}
              {aiState.results && (
                <GlassmorphismCard
                  title="AI建议"
                  description="智能优化建议"
                  variant="results"
                  style={{
                    padding: '16px',
                    minHeight: 'auto'
                  }}
                >
                  <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                    {aiState.results.recommendations.map((rec, index) => (
                      <div key={index} style={{
                        padding: '8px 0',
                        borderBottom: index < aiState.results!.recommendations.length - 1 ? 
                          `1px solid ${designTokens.colors.dark.card}40` : 'none',
                        color: designTokens.colors.light.primary
                      }}>
                        💡 {rec}
                      </div>
                    ))}
                  </div>
                </GlassmorphismCard>
              )}

              {/* 快捷操作按钮 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginTop: '8px'
              }}>
                <Button
                  variant="outline"
                  size="sm"
                  caeType="computation"
                  onClick={() => console.log('重置参数')}
                >
                  🔄 重置
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  caeType="results"
                  onClick={() => console.log('保存配置')}
                >
                  💾 保存
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PhysicsAIEmbeddedPanel;