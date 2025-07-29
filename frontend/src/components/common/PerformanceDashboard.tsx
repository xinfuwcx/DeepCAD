/**
 * 性能监控仪表板组件
 * 实时显示应用性能指标和警告
 * @author Deep Excavation Team - Code Optimization
 * @date 2025-01-29
 * @version 2.0.0
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePerformanceMonitor, useMemoryMonitor, useNetworkPerformance } from '../../hooks/usePerformanceMonitor';
import { PerformanceWarningLevel } from '../../utils/performanceAnalyzer';

/**
 * 性能监控仪表板属性
 */
interface PerformanceDashboardProps {
  /** 是否自动开始监控 */
  autoStart?: boolean;
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 仪表板位置 */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 自定义样式 */
  className?: string;
  /** 自定义内联样式 */
  style?: React.CSSProperties;
}

/**
 * 性能指标卡片组件
 */
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  unit?: string;
  status: 'good' | 'warning' | 'critical';
  subtitle?: string;
}> = ({ title, value, unit, status, subtitle }) => {
  const statusColors = {
    good: '#00ff88',
    warning: '#ffaa00',
    critical: '#ff4444'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="metric-card"
      style={{
        background: 'rgba(0, 0, 0, 0.8)',
        border: `1px solid ${statusColors[status]}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '120px',
        backdropFilter: 'blur(10px)'
      }}
    >
      <div style={{
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: '4px'
      }}>
        {title}
      </div>
      <div style={{
        fontSize: '20px',
        fontWeight: 'bold',
        color: statusColors[status],
        display: 'flex',
        alignItems: 'baseline',
        gap: '4px'
      }}>
        <span>{value}</span>
        {unit && (
          <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
            {unit}
          </span>
        )}
      </div>
      {subtitle && (
        <div style={{
          fontSize: '10px',
          color: 'rgba(255, 255, 255, 0.5)',
          marginTop: '2px'
        }}>
          {subtitle}
        </div>
      )}
    </motion.div>
  );
};

/**
 * 警告列表组件
 */
const WarningList: React.FC<{
  warnings: Array<{
    level: PerformanceWarningLevel;
    message: string;
    timestamp: number;
  }>;
  onClear: () => void;
}> = ({ warnings, onClear }) => {
  const levelColors = {
    [PerformanceWarningLevel.LOW]: '#88ff88',
    [PerformanceWarningLevel.MEDIUM]: '#ffaa00',
    [PerformanceWarningLevel.HIGH]: '#ff8800',
    [PerformanceWarningLevel.CRITICAL]: '#ff4444'
  };

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.9)',
      borderRadius: '8px',
      padding: '12px',
      maxHeight: '200px',
      overflowY: 'auto',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 'bold' }}>
          性能警告 ({warnings.length})
        </span>
        {warnings.length > 0 && (
          <button
            onClick={onClear}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '4px',
              color: '#ffffff',
              padding: '4px 8px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            清除
          </button>
        )}
      </div>

      {warnings.length === 0 ? (
        <div style={{
          color: 'rgba(255, 255, 255, 0.5)',
          textAlign: 'center',
          padding: '16px',
          fontSize: '12px'
        }}>
          暂无警告
        </div>
      ) : (
        <AnimatePresence>
          {warnings.slice(-5).reverse().map((warning, index) => (
            <motion.div
              key={`${warning.timestamp}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '6px',
                marginBottom: '4px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '4px',
                border: `1px solid ${levelColors[warning.level]}30`
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: levelColors[warning.level],
                  marginTop: '4px',
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{
                  color: levelColors[warning.level],
                  fontSize: '11px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}>
                  {warning.level}
                </div>
                <div style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '12px',
                  lineHeight: '1.3'
                }}>
                  {warning.message}
                </div>
                <div style={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '10px',
                  marginTop: '2px'
                }}>
                  {new Date(warning.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
};

/**
 * 性能监控仪表板组件
 */
export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  autoStart = false,
  showDetails = false,
  position = 'top-right',
  draggable = false,
  className,
  style
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const {
    metrics,
    warnings,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearWarnings,
    performanceReport
  } = usePerformanceMonitor({
    autoStart,
    warningLevelFilter: [
      PerformanceWarningLevel.MEDIUM,
      PerformanceWarningLevel.HIGH,
      PerformanceWarningLevel.CRITICAL
    ]
  });

  const { memoryUsage, isHighUsage } = useMemoryMonitor();
  const { networkMetrics, isOnline } = useNetworkPerformance();

  // 计算整体状态
  const getOverallStatus = useCallback(() => {
    const criticalWarnings = warnings.filter(w => w.level === PerformanceWarningLevel.CRITICAL);
    const highWarnings = warnings.filter(w => w.level === PerformanceWarningLevel.HIGH);
    
    if (criticalWarnings.length > 0) return 'critical';
    if (highWarnings.length > 0 || isHighUsage) return 'warning';
    return 'good';
  }, [warnings, isHighUsage]);

  const overallStatus = getOverallStatus();

  // 位置样式
  const positionStyles = {
    'top-left': { top: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'bottom-right': { bottom: '20px', right: '20px' }
  };

  const statusColors = {
    good: '#00ff88',
    warning: '#ffaa00',
    critical: '#ff4444'
  };

  return (
    <motion.div
      drag={draggable}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      className={className}
      style={{
        position: 'fixed',
        zIndex: 10000,
        fontFamily: 'monospace',
        userSelect: 'none',
        cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : 'default',
        ...positionStyles[position],
        ...style
      }}
    >
      {/* 主要状态指示器 */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          background: 'rgba(0, 0, 0, 0.9)',
          border: `2px solid ${statusColors[overallStatus]}`,
          borderRadius: '12px',
          padding: '12px',
          cursor: 'pointer',
          backdropFilter: 'blur(15px)',
          boxShadow: `0 4px 20px ${statusColors[overallStatus]}30`
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* 状态指示灯 */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: statusColors[overallStatus],
              boxShadow: `0 0 10px ${statusColors[overallStatus]}`
            }}
          />

          <div>
            <div style={{
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              性能监控
            </div>
            <div style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '12px'
            }}>
              {isMonitoring ? '运行中' : '已停止'} • {warnings.length} 警告
            </div>
          </div>

          {/* 控制按钮 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                isMonitoring ? stopMonitoring() : startMonitoring();
              }}
              style={{
                background: isMonitoring ? '#ff4444' : '#00ff88',
                border: 'none',
                borderRadius: '4px',
                color: '#000000',
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {isMonitoring ? '停止' : '开始'}
            </button>
            
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              style={{
                color: '#ffffff',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              ▼
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* 详细信息面板 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              marginTop: '12px',
              background: 'rgba(0, 0, 0, 0.95)',
              borderRadius: '12px',
              padding: '16px',
              minWidth: '320px',
              maxWidth: '400px',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            {/* 性能指标网格 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <MetricCard
                title="内存使用"
                value={memoryUsage.used}
                unit="MB"
                status={memoryUsage.percentage > 85 ? 'critical' : memoryUsage.percentage > 70 ? 'warning' : 'good'}
                subtitle={`${memoryUsage.percentage.toFixed(1)}%`}
              />
              
              <MetricCard
                title="FPS"
                value={metrics.fps || 0}
                status={!metrics.fps || metrics.fps < 30 ? 'critical' : metrics.fps < 45 ? 'warning' : 'good'}
              />

              <MetricCard
                title="网络"
                value={isOnline ? 'Online' : 'Offline'}
                status={isOnline ? 'good' : 'critical'}
                subtitle={networkMetrics.effectiveType ? `${networkMetrics.effectiveType.toUpperCase()}` : ''}
              />

              <MetricCard
                title="状态"
                value={performanceReport.summary.overallStatus === 'good' ? '正常' : 
                      performanceReport.summary.overallStatus === 'warning' ? '警告' : '严重'}
                status={performanceReport.summary.overallStatus}
                subtitle={`${performanceReport.summary.warningCount} 个问题`}
              />
            </div>

            {/* 详细指标（可选） */}
            {showDetails && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{ marginBottom: '16px' }}
              >
                <div style={{
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}>
                  详细指标
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontFamily: 'monospace'
                }}>
                  {networkMetrics.downlink && (
                    <div>下载速度: {networkMetrics.downlink} Mbps</div>
                  )}
                  {networkMetrics.rtt && (
                    <div>RTT: {networkMetrics.rtt} ms</div>
                  )}
                  {metrics.paintMetrics?.firstContentfulPaint && (
                    <div>FCP: {Math.round(metrics.paintMetrics.firstContentfulPaint)} ms</div>
                  )}
                  {metrics.customMetrics && Object.keys(metrics.customMetrics).length > 0 && (
                    <div>自定义指标: {Object.keys(metrics.customMetrics).length} 项</div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 警告列表 */}
            <WarningList warnings={warnings} onClear={clearWarnings} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PerformanceDashboard;
