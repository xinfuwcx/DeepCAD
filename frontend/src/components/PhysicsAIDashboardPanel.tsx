/**
 * 物理AI大屏面板 - 3号计算专家
 * 基于0号架构师大屏升级方案的专业级物理AI可视化面板
 * 集成PINN、DeepONet、GNN、TERRA四大AI算法的大屏展示
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { dashboardTokens, dashboardAnimations } from './ui/DashboardComponents';

// 物理AI模块接口 (从PhysicsAIModuleInterface.ts继承)
interface PhysicsAIResults {
  pinn?: {
    predictions: {
      displacement: Float32Array;
      stress: Float32Array;
      safetyFactor: Float32Array;
    };
    performance: {
      accuracy: number;
      physicsViolation: number;
      computationTime: number;
    };
  };
  deeponet?: {
    generalization: {
      trainAccuracy: number;
      testAccuracy: number;
      extrapolationError: number;
    };
  };
  gnn?: {
    globalPredictions: {
      overallStability: number;
      failureMode: string;
      safetyMargin: number;
    };
  };
  terra?: {
    performanceImprovement: {
      accuracyGain: number;
      speedupRatio: number;
      stabilityIndex: number;
    };
  };
}

interface DesignVariables {
  wallThickness: number;        // 地连墙厚度 (cm)
  embedmentDepth: number;       // 入土深度 (m)
  strutSpacing: number;         // 支撑间距 (m)
  strutStiffness: number;       // 支撑刚度 (kN/m)
  excavationDepth: number;      // 开挖深度 (m)
  soilCohesion: number;         // 土体粘聚力 (kPa)
  frictionAngle: number;        // 内摩擦角 (度)
}

interface PhysicsAIDashboardPanelProps {
  results?: PhysicsAIResults;
  designVariables?: DesignVariables;
  onVariableChange?: (variable: keyof DesignVariables, value: number) => void;
  onOptimizationStart?: () => void;
  isOptimizing?: boolean;
  optimizationProgress?: number;
  enableRealtimeUpdate?: boolean;
}

const PhysicsAIDashboardPanel: React.FC<PhysicsAIDashboardPanelProps> = ({
  results,
  designVariables,
  onVariableChange,
  onOptimizationStart,
  isOptimizing = false,
  optimizationProgress = 0,
  enableRealtimeUpdate = true
}) => {
  const [activeAlgorithm, setActiveAlgorithm] = useState<'pinn' | 'deeponet' | 'gnn' | 'terra'>('pinn');
  const [isExpanded, setIsExpanded] = useState(true);
  const [realtimeData, setRealtimeData] = useState<PhysicsAIResults | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout>();

  // 实时数据更新
  useEffect(() => {
    if (enableRealtimeUpdate && !isOptimizing) {
      updateIntervalRef.current = setInterval(() => {
        // 模拟实时AI计算更新
        setRealtimeData({
          pinn: {
            predictions: {
              displacement: new Float32Array(100).fill(0).map(() => Math.random() * 0.1),
              stress: new Float32Array(100).fill(0).map(() => Math.random() * 1000),
              safetyFactor: new Float32Array(100).fill(0).map(() => 1.5 + Math.random() * 0.5)
            },
            performance: {
              accuracy: 0.92 + Math.random() * 0.06,
              physicsViolation: Math.random() * 0.1,
              computationTime: 80 + Math.random() * 40
            }
          },
          gnn: {
            globalPredictions: {
              overallStability: 0.8 + Math.random() * 0.15,
              failureMode: ['sliding', 'overturning', 'bearing'][Math.floor(Math.random() * 3)],
              safetyMargin: 1.3 + Math.random() * 0.4
            }
          }
        });
      }, 5000);
    } else {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [enableRealtimeUpdate, isOptimizing]);

  const currentResults = realtimeData || results;

  // 获取算法状态颜色
  const getAlgorithmStatus = (algorithm: string) => {
    switch (algorithm) {
      case 'pinn':
        return currentResults?.pinn?.performance.accuracy ? 
          (currentResults.pinn.performance.accuracy > 0.9 ? 'success' : 'warning') : 'inactive';
      case 'gnn':
        return currentResults?.gnn?.globalPredictions.overallStability ?
          (currentResults.gnn.globalPredictions.overallStability > 0.85 ? 'success' : 'warning') : 'inactive';
      default:
        return 'inactive';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return dashboardTokens.colors.accent.success;
      case 'warning': return dashboardTokens.colors.accent.warning;
      case 'error': return dashboardTokens.colors.accent.error;
      default: return dashboardTokens.colors.text.muted;
    }
  };

  return (
    <div className="physics-ai-dashboard-panel" style={{
      position: 'fixed',
      left: 0,
      top: '80px',
      width: isExpanded ? '420px' : '60px',
      height: 'calc(100vh - 160px)',
      background: `linear-gradient(135deg, ${dashboardTokens.colors.bg.card}, ${dashboardTokens.colors.bg.glass})`,
      backdropFilter: 'blur(20px)',
      border: `1px solid ${dashboardTokens.colors.border.primary}`,
      borderRadius: '0 16px 16px 0',
      boxShadow: dashboardTokens.shadows.glass,
      transition: 'width 0.4s ease',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      {/* 展开/折叠按钮 */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          position: 'absolute',
          right: '16px',
          top: '16px',
          width: '32px',
          height: '32px',
          background: dashboardTokens.colors.accent.primary,
          border: 'none',
          borderRadius: '6px',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          zIndex: 10
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isExpanded ? '◀' : '▶'}
      </motion.button>

      {/* 侧边栏图标 (折叠状态) */}
      {!isExpanded && (
        <motion.div
          {...dashboardAnimations.fadeIn}
          style={{
            padding: '20px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            marginTop: '60px'
          }}
        >
          {['pinn', 'deeponet', 'gnn', 'terra'].map((algo) => (
            <motion.div
              key={algo}
              onClick={() => setActiveAlgorithm(algo as any)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: activeAlgorithm === algo ? dashboardTokens.colors.accent.primary : 'transparent',
                border: `1px solid ${getStatusColor(getAlgorithmStatus(algo))}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              whileHover={{ scale: 1.1 }}
            >
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: getStatusColor(getAlgorithmStatus(algo))
              }} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* 主面板内容 (展开状态) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            {...dashboardAnimations.slideInLeft}
            style={{
              padding: '20px',
              height: '100%',
              overflowY: 'auto'
            }}
          >
            {/* 标题区域 */}
            <div style={{ marginBottom: '24px', marginTop: '20px' }}>
              <h2 style={{
                fontSize: dashboardTokens.fonts.sizes.large,
                fontWeight: dashboardTokens.fonts.weights.bold,
                color: dashboardTokens.colors.text.primary,
                margin: '0 0 8px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🧠 物理AI智能优化
              </h2>
              <div style={{
                fontSize: dashboardTokens.fonts.sizes.small,
                color: dashboardTokens.colors.text.secondary
              }}>
                深基坑工程AI智能设计与优化系统
              </div>
            </div>

            {/* 算法状态指示器 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '24px'
            }}>
              {[
                { key: 'pinn', name: 'PINN', desc: '物理约束神经网络' },
                { key: 'deeponet', name: 'DeepONet', desc: '深度算子网络' },
                { key: 'gnn', name: 'GNN', desc: '图神经网络' },
                { key: 'terra', name: 'TERRA', desc: '参数优化算法' }
              ].map((algo) => (
                <motion.div
                  key={algo.key}
                  onClick={() => setActiveAlgorithm(algo.key as any)}
                  style={{
                    padding: '12px',
                    background: activeAlgorithm === algo.key ? 
                      `linear-gradient(135deg, ${dashboardTokens.colors.accent.primary}20, ${dashboardTokens.colors.accent.primary}10)` :
                      dashboardTokens.colors.bg.secondary,
                    border: `1px solid ${activeAlgorithm === algo.key ? dashboardTokens.colors.accent.primary : dashboardTokens.colors.border.secondary}`,
                    borderRadius: dashboardTokens.borderRadius.md,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px'
                  }}>
                    <span style={{
                      fontSize: dashboardTokens.fonts.sizes.small,
                      fontWeight: dashboardTokens.fonts.weights.semibold,
                      color: dashboardTokens.colors.text.primary
                    }}>
                      {algo.name}
                    </span>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: getStatusColor(getAlgorithmStatus(algo.key))
                    }} />
                  </div>
                  <div style={{
                    fontSize: dashboardTokens.fonts.sizes.tiny,
                    color: dashboardTokens.colors.text.muted
                  }}>
                    {algo.desc}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* 当前算法详细信息 */}
            <motion.div
              key={activeAlgorithm}
              {...dashboardAnimations.fadeIn}
              style={{
                background: dashboardTokens.colors.bg.secondary,
                borderRadius: dashboardTokens.borderRadius.lg,
                padding: '20px',
                marginBottom: '24px',
                border: `1px solid ${dashboardTokens.colors.border.secondary}`
              }}
            >
              <h3 style={{
                fontSize: dashboardTokens.fonts.sizes.medium,
                fontWeight: dashboardTokens.fonts.weights.semibold,
                color: dashboardTokens.colors.text.primary,
                marginBottom: '16px'
              }}>
                {activeAlgorithm.toUpperCase()} 算法状态
              </h3>

              {/* PINN算法详情 */}
              {activeAlgorithm === 'pinn' && currentResults?.pinn && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ color: dashboardTokens.colors.text.secondary, fontSize: dashboardTokens.fonts.sizes.tiny }}>
                        预测精度
                      </div>
                      <div style={{
                        fontSize: dashboardTokens.fonts.sizes.large,
                        fontWeight: dashboardTokens.fonts.weights.bold,
                        color: dashboardTokens.colors.accent.success
                      }}>
                        {(currentResults.pinn.performance.accuracy * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ color: dashboardTokens.colors.text.secondary, fontSize: dashboardTokens.fonts.sizes.tiny }}>
                        物理一致性
                      </div>
                      <div style={{
                        fontSize: dashboardTokens.fonts.sizes.large,
                        fontWeight: dashboardTokens.fonts.weights.bold,
                        color: currentResults.pinn.performance.physicsViolation < 0.1 ? 
                          dashboardTokens.colors.accent.success : dashboardTokens.colors.accent.warning
                      }}>
                        {((1 - currentResults.pinn.performance.physicsViolation) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    background: dashboardTokens.colors.bg.card,
                    borderRadius: dashboardTokens.borderRadius.sm,
                    padding: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ color: dashboardTokens.colors.text.secondary, fontSize: dashboardTokens.fonts.sizes.tiny, marginBottom: '8px' }}>
                      计算进度
                    </div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: dashboardTokens.colors.bg.primary,
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <motion.div
                        style={{
                          height: '100%',
                          background: `linear-gradient(90deg, ${dashboardTokens.colors.accent.primary}, ${dashboardTokens.colors.accent.secondary})`,
                          borderRadius: '3px'
                        }}
                        animate={{ width: `${Math.min(100, currentResults.pinn.performance.accuracy * 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* GNN算法详情 */}
              {activeAlgorithm === 'gnn' && currentResults?.gnn && (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ color: dashboardTokens.colors.text.secondary, fontSize: dashboardTokens.fonts.sizes.tiny }}>
                      整体稳定性评分
                    </div>
                    <div style={{
                      fontSize: dashboardTokens.fonts.sizes.hero,
                      fontWeight: dashboardTokens.fonts.weights.bold,
                      color: currentResults.gnn.globalPredictions.overallStability > 0.85 ? 
                        dashboardTokens.colors.accent.success : dashboardTokens.colors.accent.warning
                    }}>
                      {(currentResults.gnn.globalPredictions.overallStability * 100).toFixed(0)}
                    </div>
                  </div>

                  <div style={{
                    background: dashboardTokens.colors.bg.card,
                    borderRadius: dashboardTokens.borderRadius.sm,
                    padding: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ color: dashboardTokens.colors.text.secondary, fontSize: dashboardTokens.fonts.sizes.tiny }}>
                      预测破坏模式
                    </div>
                    <div style={{
                      fontSize: dashboardTokens.fonts.sizes.medium,
                      fontWeight: dashboardTokens.fonts.weights.semibold,
                      color: dashboardTokens.colors.text.primary,
                      marginTop: '4px'
                    }}>
                      {currentResults.gnn.globalPredictions.failureMode === 'sliding' ? '滑移破坏' :
                       currentResults.gnn.globalPredictions.failureMode === 'overturning' ? '倾覆破坏' : '承载力破坏'}
                    </div>
                  </div>

                  <div style={{
                    background: dashboardTokens.colors.bg.card,
                    borderRadius: dashboardTokens.borderRadius.sm,
                    padding: '12px'
                  }}>
                    <div style={{ color: dashboardTokens.colors.text.secondary, fontSize: dashboardTokens.fonts.sizes.tiny }}>
                      安全裕度
                    </div>
                    <div style={{
                      fontSize: dashboardTokens.fonts.sizes.large,
                      fontWeight: dashboardTokens.fonts.weights.bold,
                      color: dashboardTokens.colors.accent.primary,
                      marginTop: '4px'
                    }}>
                      {currentResults.gnn.globalPredictions.safetyMargin.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* 设计变量控制区域 */}
            <div style={{
              background: dashboardTokens.colors.bg.secondary,
              borderRadius: dashboardTokens.borderRadius.lg,
              padding: '20px',
              marginBottom: '24px',
              border: `1px solid ${dashboardTokens.colors.border.secondary}`
            }}>
              <h3 style={{
                fontSize: dashboardTokens.fonts.sizes.medium,
                fontWeight: dashboardTokens.fonts.weights.semibold,
                color: dashboardTokens.colors.text.primary,
                marginBottom: '16px'
              }}>
                🎛️ 设计变量调整
              </h3>

              {designVariables && Object.entries(designVariables).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '16px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      color: dashboardTokens.colors.text.secondary,
                      fontSize: dashboardTokens.fonts.sizes.small
                    }}>
                      {key === 'wallThickness' ? '地连墙厚度 (cm)' :
                       key === 'embedmentDepth' ? '入土深度 (m)' :
                       key === 'strutSpacing' ? '支撑间距 (m)' :
                       key === 'strutStiffness' ? '支撑刚度 (kN/m)' :
                       key === 'excavationDepth' ? '开挖深度 (m)' :
                       key === 'soilCohesion' ? '土体粘聚力 (kPa)' :
                       '内摩擦角 (度)'}
                    </span>
                    <span style={{
                      color: dashboardTokens.colors.text.primary,
                      fontSize: dashboardTokens.fonts.sizes.small,
                      fontWeight: dashboardTokens.fonts.weights.semibold
                    }}>
                      {value.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={key === 'wallThickness' ? 60 : key === 'embedmentDepth' ? 8 : key === 'strutSpacing' ? 3 : 
                         key === 'strutStiffness' ? 10000 : key === 'excavationDepth' ? 5 : 
                         key === 'soilCohesion' ? 10 : 20}
                    max={key === 'wallThickness' ? 120 : key === 'embedmentDepth' ? 25 : key === 'strutSpacing' ? 8 : 
                         key === 'strutStiffness' ? 100000 : key === 'excavationDepth' ? 20 : 
                         key === 'soilCohesion' ? 50 : 35}
                    step={key === 'wallThickness' ? 5 : key === 'embedmentDepth' ? 0.5 : key === 'strutSpacing' ? 0.5 : 
                          key === 'strutStiffness' ? 5000 : key === 'excavationDepth' ? 0.5 : 
                          key === 'soilCohesion' ? 1 : 0.5}
                    value={value}
                    onChange={(e) => onVariableChange?.(key as keyof DesignVariables, parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      height: '6px',
                      background: dashboardTokens.colors.bg.primary,
                      borderRadius: '3px',
                      outline: 'none',
                      appearance: 'none',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* 优化控制区域 */}
            <div style={{
              background: dashboardTokens.colors.bg.secondary,
              borderRadius: dashboardTokens.borderRadius.lg,
              padding: '20px',
              border: `1px solid ${dashboardTokens.colors.border.secondary}`
            }}>
              <h3 style={{
                fontSize: dashboardTokens.fonts.sizes.medium,
                fontWeight: dashboardTokens.fonts.weights.semibold,
                color: dashboardTokens.colors.text.primary,
                marginBottom: '16px'
              }}>
                ⚡ AI智能优化
              </h3>

              {/* 优化进度 */}
              {isOptimizing && (
                <motion.div
                  {...dashboardAnimations.fadeIn}
                  style={{
                    marginBottom: '16px',
                    background: dashboardTokens.colors.bg.card,
                    borderRadius: dashboardTokens.borderRadius.sm,
                    padding: '12px'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <span style={{ color: dashboardTokens.colors.text.secondary, fontSize: dashboardTokens.fonts.sizes.tiny }}>
                      优化进度
                    </span>
                    <span style={{ color: dashboardTokens.colors.text.primary, fontSize: dashboardTokens.fonts.sizes.small }}>
                      {optimizationProgress.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: dashboardTokens.colors.bg.primary,
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <motion.div
                      style={{
                        height: '100%',
                        background: `linear-gradient(90deg, ${dashboardTokens.colors.accent.primary}, ${dashboardTokens.colors.accent.secondary})`,
                        borderRadius: '4px'
                      }}
                      animate={{ width: `${optimizationProgress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              )}

              {/* 优化按钮 */}
              <motion.button
                onClick={onOptimizationStart}
                disabled={isOptimizing}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: isOptimizing ? 
                    dashboardTokens.colors.text.muted : 
                    `linear-gradient(135deg, ${dashboardTokens.colors.accent.primary}, ${dashboardTokens.colors.accent.secondary})`,
                  border: 'none',
                  borderRadius: dashboardTokens.borderRadius.md,
                  color: 'white',
                  fontSize: dashboardTokens.fonts.sizes.medium,
                  fontWeight: dashboardTokens.fonts.weights.semibold,
                  cursor: isOptimizing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease'
                }}
                whileHover={!isOptimizing ? { scale: 1.02 } : {}}
                whileTap={!isOptimizing ? { scale: 0.98 } : {}}
              >
                {isOptimizing ? '🔄 AI优化进行中...' : '🚀 启动AI智能优化'}
              </motion.button>

              {/* 优化目标显示 */}
              <div style={{
                marginTop: '12px',
                fontSize: dashboardTokens.fonts.sizes.tiny,
                color: dashboardTokens.colors.text.muted,
                textAlign: 'center'
              }}>
                目标: 安全系数最大化 | 成本最小化 | 施工便利性
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PhysicsAIDashboardPanel;