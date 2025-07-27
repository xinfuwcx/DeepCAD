/**
 * 物理AI嵌入式面板 - 简化版 (避免编译错误)
 * 3号计算专家 - 左侧可折叠智能面板设计
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { designTokens } from '../design/tokens';

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
  const [isExpanded, setIsExpanded] = useState(true);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // 设计变量数据
  const [variables] = useState([
    { id: 'wall_thickness', name: '地连墙厚度', value: 0.8, min: 0.6, max: 1.2, unit: 'm' },
    { id: 'embedment_depth', name: '入土深度', value: 18.0, min: 15.0, max: 25.0, unit: 'm' },
    { id: 'support_spacing', name: '支撑间距', value: 6.0, min: 4.0, max: 8.0, unit: 'm' },
    { id: 'safety_factor', name: '安全系数', value: 1.25, min: 1.1, max: 1.5, unit: '' }
  ]);

  const handleVariableChange = useCallback((variableId: string, newValue: number) => {
    onVariableChange?.(variableId, newValue);
    on3DViewportUpdate?.({ type: 'variable_change', variableId, newValue });
  }, [onVariableChange, on3DViewportUpdate]);

  const startOptimization = useCallback(() => {
    if (isOptimizing) return;
    
    setIsOptimizing(true);
    setOptimizationProgress(0);
    onOptimizationStart?.();
    
    // 模拟优化进度
    const interval = setInterval(() => {
      setOptimizationProgress(prev => {
        const newProgress = Math.min(prev + Math.random() * 15, 100);
        if (newProgress >= 100) {
          clearInterval(interval);
          setIsOptimizing(false);
        }
        return newProgress;
      });
    }, 300);
  }, [isOptimizing, onOptimizationStart]);

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
            top: 80,
            bottom: 0,
            width: isExpanded ? '400px' : '60px',
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
              
              {isExpanded && (
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
                    color: designTokens.colors.light.secondary || '#9ca3af',
                    opacity: 0.8
                  }}>
                    智能优化 & 参数预测
                  </p>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '6px',
                  cursor: 'pointer',
                  color: designTokens.colors.light.secondary || '#9ca3af',
                  fontSize: '14px'
                }}
              >
                {isExpanded ? '◀' : '▶'}
              </button>
              
              {isExpanded && (
                <button
                  onClick={onClose}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer',
                    color: designTokens.colors.light.secondary || '#9ca3af',
                    fontSize: '14px'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 面板内容 */}
          {isExpanded && (
            <div style={{
              flex: 1,
              padding: '20px',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              
              {/* 设计变量管理 */}
              <div style={{
                padding: '16px',
                background: `${designTokens.colors.dark.card}40`,
                borderRadius: '12px',
                border: `1px solid ${designTokens.colors.accent.ai}20`
              }}>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: designTokens.colors.accent.ai
                }}>
                  设计变量
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {variables.map(variable => (
                    <div key={variable.id} style={{
                      padding: '12px',
                      background: `${designTokens.colors.dark.surface}60`,
                      borderRadius: '8px',
                      border: `1px solid ${designTokens.colors.accent.ai}15`
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
                          color: designTokens.colors.light.primary || '#ffffff'
                        }}>
                          {variable.name}
                        </span>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: designTokens.colors.accent.ai
                        }}>
                          {variable.value.toFixed(1)}{variable.unit}
                        </span>
                      </div>
                      
                      <input
                        type="range"
                        min={variable.min}
                        max={variable.max}
                        step={0.1}
                        value={variable.value}
                        onChange={(e) => handleVariableChange(variable.id, parseFloat(e.target.value))}
                        style={{
                          width: '100%',
                          accentColor: designTokens.colors.accent.ai
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 优化控制 */}
              <div style={{
                padding: '16px',
                background: `${designTokens.colors.dark.card}40`,
                borderRadius: '12px',
                border: `1px solid ${designTokens.colors.accent.computation}20`
              }}>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: designTokens.colors.accent.computation
                }}>
                  智能优化
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontSize: '14px',
                      color: designTokens.colors.light.secondary || '#9ca3af'
                    }}>
                      目标函数值
                    </span>
                    <span style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: designTokens.colors.accent.computation
                    }}>
                      0.825
                    </span>
                  </div>
                  
                  <button
                    onClick={startOptimization}
                    disabled={isOptimizing}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: isOptimizing ? 
                        `${designTokens.colors.accent.ai}60` :
                        `linear-gradient(45deg, ${designTokens.colors.accent.ai}, ${designTokens.colors.accent.quantum})`,
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: isOptimizing ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {isOptimizing ? 
                      `🔄 优化中... ${optimizationProgress.toFixed(0)}%` : 
                      '🚀 启动智能优化'
                    }
                  </button>
                  
                  {isOptimizing && (
                    <div style={{
                      width: '100%',
                      height: '4px',
                      background: `${designTokens.colors.dark.card}80`,
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${optimizationProgress}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${designTokens.colors.accent.ai}, ${designTokens.colors.accent.quantum})`,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  )}
                </div>
              </div>

              {/* AI建议 */}
              {optimizationProgress >= 100 && (
                <div style={{
                  padding: '16px',
                  background: `${designTokens.colors.dark.card}40`,
                  borderRadius: '12px',
                  border: `1px solid ${designTokens.colors.semantic.success}20`
                }}>
                  <h4 style={{
                    margin: '0 0 12px 0',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: designTokens.colors.semantic.success
                  }}>
                    AI优化建议
                  </h4>
                  
                  <div style={{
                    fontSize: '13px',
                    lineHeight: 1.5,
                    color: designTokens.colors.light.primary || '#ffffff'
                  }}>
                    <div style={{ marginBottom: '8px' }}>💡 建议增加地连墙厚度至0.9m</div>
                    <div style={{ marginBottom: '8px' }}>💡 优化支撑预应力至800kN</div>
                    <div>💡 考虑增加中间支撑层</div>
                  </div>
                </div>
              )}

              {/* 快捷操作 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px'
              }}>
                <button
                  onClick={() => console.log('重置参数')}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: `1px solid ${designTokens.colors.accent.computation}40`,
                    borderRadius: '6px',
                    color: designTokens.colors.accent.computation,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  🔄 重置
                </button>
                <button
                  onClick={() => console.log('保存配置')}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: `1px solid ${designTokens.colors.semantic.success}40`,
                    borderRadius: '6px',
                    color: designTokens.colors.semantic.success,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  💾 保存
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PhysicsAIEmbeddedPanel;