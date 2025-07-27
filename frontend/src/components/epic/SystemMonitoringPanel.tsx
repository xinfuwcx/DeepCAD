/**
 * 系统监控面板组件 - Epic控制中心系统状态监控
 * 基于1号专家技术规范实现
 * 0号架构师 - 完成1号专家开发指令
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ==================== 接口定义 ====================

export enum SystemStatus {
  INITIALIZING = 'initializing',
  READY = 'ready',
  ERROR = 'error',
  LOADING = 'loading',
  CONNECTING = 'connecting',
  CONNECTED = 'connected'
}

export interface SystemMonitorData {
  gisStatus: SystemStatus;
  weatherStatus: SystemStatus;
  architectureStatus: SystemStatus;
  performanceMetrics: {
    loadedTiles: number;
    activeProjects: number;
    memoryUsage: number; // MB
    frameRate: number;   // FPS
    networkLatency: number; // ms
    cacheHitRate: number; // %
  };
  lastUpdateTime: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  alerts: SystemAlert[];
}

export interface SystemAlert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  component: 'gis' | 'weather' | 'architecture' | 'performance';
  acknowledged: boolean;
}

export interface SystemMonitoringPanelProps {
  isVisible?: boolean;
  onToggle?: (visible: boolean) => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  autoRefresh?: boolean;
  refreshInterval?: number; // ms
  onStatusChange?: (status: SystemMonitorData) => void;
}

// ==================== 常量定义 ====================

const STATUS_COLORS = {
  initializing: '#faad14',  // 黄色
  ready: '#52c41a',         // 绿色
  error: '#ff4d4f',         // 红色
  loading: '#1890ff',       // 蓝色
  connecting: '#faad14',    // 黄色
  connected: '#52c41a'      // 绿色
};

const STATUS_LABELS = {
  initializing: '初始化中',
  ready: '就绪',
  error: '错误',
  loading: '加载中',
  connecting: '连接中',
  connected: '已连接'
};

const HEALTH_COLORS = {
  excellent: '#52c41a',  // 绿色
  good: '#73d13d',       // 浅绿色
  warning: '#faad14',    // 黄色
  critical: '#ff4d4f'    // 红色
};

const HEALTH_LABELS = {
  excellent: '优秀',
  good: '良好',
  warning: '警告',
  critical: '严重'
};

// ==================== 主组件 ====================

const SystemMonitoringPanel: React.FC<SystemMonitoringPanelProps> = ({
  isVisible = false,
  onToggle,
  position = 'top-left',
  autoRefresh = true,
  refreshInterval = 2000,
  onStatusChange
}) => {
  // ==================== 状态管理 ====================
  
  const [monitorData, setMonitorData] = useState<SystemMonitorData>({
    gisStatus: SystemStatus.INITIALIZING,
    weatherStatus: SystemStatus.LOADING,
    architectureStatus: SystemStatus.CONNECTING,
    performanceMetrics: {
      loadedTiles: 0,
      activeProjects: 4,
      memoryUsage: 256,
      frameRate: 60,
      networkLatency: 45,
      cacheHitRate: 85
    },
    lastUpdateTime: Date.now(),
    systemHealth: 'good',
    alerts: []
  });

  const [expanded, setExpanded] = useState(false);
  const [realTimeMode, setRealTimeMode] = useState(autoRefresh);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [alertHistory, setAlertHistory] = useState<SystemAlert[]>([]);

  // ==================== 系统监控逻辑 ====================

  const generateMockData = useCallback((): SystemMonitorData => {
    // 模拟真实的系统状态数据
    const now = Date.now();
    const baseData = monitorData;
    
    // 随机状态变化模拟
    const getRandomStatus = (currentStatus: SystemStatus): SystemStatus => {
      const statuses = [SystemStatus.READY, SystemStatus.LOADING, SystemStatus.ERROR];
      const weights = currentStatus === SystemStatus.ERROR ? [0.7, 0.2, 0.1] : [0.8, 0.15, 0.05];
      
      const random = Math.random();
      let cumulative = 0;
      for (let i = 0; i < statuses.length; i++) {
        cumulative += weights[i];
        if (random < cumulative) return statuses[i];
      }
      return SystemStatus.READY;
    };

    // 性能指标随机变化
    const performanceMetrics = {
      loadedTiles: Math.max(0, baseData.performanceMetrics.loadedTiles + Math.floor((Math.random() - 0.5) * 10)),
      activeProjects: Math.max(1, Math.min(10, baseData.performanceMetrics.activeProjects + Math.floor((Math.random() - 0.5) * 2))),
      memoryUsage: Math.max(128, Math.min(512, baseData.performanceMetrics.memoryUsage + Math.floor((Math.random() - 0.5) * 20))),
      frameRate: Math.max(30, Math.min(60, baseData.performanceMetrics.frameRate + Math.floor((Math.random() - 0.5) * 10))),
      networkLatency: Math.max(10, Math.min(200, baseData.performanceMetrics.networkLatency + Math.floor((Math.random() - 0.5) * 30))),
      cacheHitRate: Math.max(60, Math.min(100, baseData.performanceMetrics.cacheHitRate + Math.floor((Math.random() - 0.5) * 10)))
    };

    // 系统健康评估
    const calculateSystemHealth = (): SystemMonitorData['systemHealth'] => {
      const memoryScore = performanceMetrics.memoryUsage < 400 ? 100 : (512 - performanceMetrics.memoryUsage) / 112 * 100;
      const fpsScore = performanceMetrics.frameRate >= 50 ? 100 : performanceMetrics.frameRate / 50 * 100;
      const latencyScore = performanceMetrics.networkLatency < 50 ? 100 : Math.max(0, (200 - performanceMetrics.networkLatency) / 150 * 100);
      
      const overallScore = (memoryScore + fpsScore + latencyScore) / 3;
      
      if (overallScore >= 90) return 'excellent';
      if (overallScore >= 75) return 'good';
      if (overallScore >= 60) return 'warning';
      return 'critical';
    };

    // 生成告警
    const generateAlerts = (): SystemAlert[] => {
      const alerts: SystemAlert[] = [];
      
      if (performanceMetrics.memoryUsage > 450) {
        alerts.push({
          id: `memory-${now}`,
          level: 'warning',
          message: `内存使用率过高: ${performanceMetrics.memoryUsage}MB`,
          timestamp: now,
          component: 'performance',
          acknowledged: false
        });
      }
      
      if (performanceMetrics.frameRate < 40) {
        alerts.push({
          id: `fps-${now}`,
          level: 'error',
          message: `渲染帧率过低: ${performanceMetrics.frameRate}FPS`,
          timestamp: now,
          component: 'performance',
          acknowledged: false
        });
      }
      
      if (performanceMetrics.networkLatency > 150) {
        alerts.push({
          id: `network-${now}`,
          level: 'warning',
          message: `网络延迟过高: ${performanceMetrics.networkLatency}ms`,
          timestamp: now,
          component: 'gis',
          acknowledged: false
        });
      }
      
      return alerts;
    };

    return {
      gisStatus: getRandomStatus(baseData.gisStatus),
      weatherStatus: getRandomStatus(baseData.weatherStatus),
      architectureStatus: getRandomStatus(baseData.architectureStatus),
      performanceMetrics,
      lastUpdateTime: now,
      systemHealth: calculateSystemHealth(),
      alerts: generateAlerts()
    };
  }, [monitorData]);

  const updateSystemData = useCallback(() => {
    const newData = generateMockData();
    setMonitorData(newData);
    
    // 更新告警历史
    if (newData.alerts.length > 0) {
      setAlertHistory(prev => [...prev, ...newData.alerts].slice(-20)); // 保持最近20条
    }
    
    onStatusChange?.(newData);
  }, [generateMockData, onStatusChange]);

  // ==================== 效果管理 ====================

  useEffect(() => {
    if (realTimeMode && isVisible) {
      intervalRef.current = setInterval(updateSystemData, refreshInterval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [realTimeMode, isVisible, refreshInterval, updateSystemData]);

  useEffect(() => {
    // 初始数据加载
    updateSystemData();
  }, []);

  // ==================== 事件处理 ====================

  const handleToggleExpanded = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  const handleToggleRealTime = useCallback(() => {
    setRealTimeMode(!realTimeMode);
  }, [realTimeMode]);

  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    setMonitorData(prev => ({
      ...prev,
      alerts: prev.alerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    }));
  }, []);

  const handleClearAlerts = useCallback(() => {
    setMonitorData(prev => ({
      ...prev,
      alerts: []
    }));
    setAlertHistory([]);
  }, []);

  // ==================== 计算属性 ====================

  const positionStyles = useMemo(() => {
    const styles: React.CSSProperties = {
      position: 'fixed',
      zIndex: 1000,
      backdropFilter: 'blur(10px)',
      backgroundColor: 'rgba(20, 20, 20, 0.95)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    };
    
    switch (position) {
      case 'top-left':
        return { ...styles, top: '20px', left: '20px' };
      case 'top-right':
        return { ...styles, top: '20px', right: '20px' };
      case 'bottom-left':
        return { ...styles, bottom: '20px', left: '20px' };
      case 'bottom-right':
        return { ...styles, bottom: '20px', right: '20px' };
      default:
        return { ...styles, top: '20px', left: '20px' };
    }
  }, [position]);

  const activeAlertsCount = useMemo(() => {
    return monitorData.alerts.filter(alert => !alert.acknowledged).length;
  }, [monitorData.alerts]);

  // ==================== 渲染函数 ====================

  const renderCompactView = () => (
    <motion.div
      className="compact-monitor"
      onClick={handleToggleExpanded}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        padding: '12px 16px',
        cursor: 'pointer',
        minWidth: '200px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: HEALTH_COLORS[monitorData.systemHealth],
              boxShadow: `0 0 8px ${HEALTH_COLORS[monitorData.systemHealth]}`
            }}
          />
          <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>
            系统监控
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {activeAlertsCount > 0 && (
            <div
              style={{
                backgroundColor: '#ff4d4f',
                color: '#fff',
                borderRadius: '10px',
                padding: '2px 6px',
                fontSize: '10px',
                fontWeight: 'bold'
              }}
            >
              {activeAlertsCount}
            </div>
          )}
          <span style={{ color: '#ccc', fontSize: '12px' }}>
            {HEALTH_LABELS[monitorData.systemHealth]}
          </span>
        </div>
      </div>
    </motion.div>
  );

  const renderStatusIndicator = (status: SystemStatus, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
      <div
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: STATUS_COLORS[status],
          boxShadow: `0 0 6px ${STATUS_COLORS[status]}`
        }}
      />
      <span style={{ color: '#ccc', fontSize: '12px', minWidth: '60px' }}>
        {label}:
      </span>
      <span style={{ color: STATUS_COLORS[status], fontSize: '12px' }}>
        {STATUS_LABELS[status]}
      </span>
    </div>
  );

  const renderPerformanceMetric = (label: string, value: number | string, unit: string, color: string = '#fff') => (
    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
      <span style={{ color: '#ccc', fontSize: '11px' }}>{label}:</span>
      <span style={{ color, fontSize: '11px', fontWeight: 'bold' }}>
        {value}{unit}
      </span>
    </div>
  );

  const renderExpandedView = () => (
    <motion.div
      className="expanded-monitor"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{
        padding: '16px',
        minWidth: '320px',
        maxWidth: '400px'
      }}
    >
      {/* 标题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ color: '#fff', margin: 0, fontSize: '16px' }}>系统监控面板</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleToggleRealTime}
            style={{
              background: realTimeMode ? 'rgba(82, 196, 26, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '10px',
              padding: '4px 8px',
              cursor: 'pointer'
            }}
          >
            {realTimeMode ? '实时' : '暂停'}
          </button>
          <button
            onClick={handleToggleExpanded}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ccc',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* 系统健康状态 */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#ccc', fontSize: '12px' }}>系统健康:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: HEALTH_COLORS[monitorData.systemHealth],
                boxShadow: `0 0 10px ${HEALTH_COLORS[monitorData.systemHealth]}`
              }}
            />
            <span style={{ color: HEALTH_COLORS[monitorData.systemHealth], fontSize: '12px', fontWeight: 'bold' }}>
              {HEALTH_LABELS[monitorData.systemHealth]}
            </span>
          </div>
        </div>
      </div>

      {/* 系统状态 */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '12px'
      }}>
        <h4 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '13px' }}>系统状态</h4>
        {renderStatusIndicator(monitorData.gisStatus, 'GIS')}
        {renderStatusIndicator(monitorData.weatherStatus, '天气')}
        {renderStatusIndicator(monitorData.architectureStatus, '架构')}
      </div>

      {/* 性能指标 */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '12px'
      }}>
        <h4 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '13px' }}>性能指标</h4>
        {renderPerformanceMetric('瓦片加载', monitorData.performanceMetrics.loadedTiles, '个')}
        {renderPerformanceMetric('活跃项目', monitorData.performanceMetrics.activeProjects, '个')}
        {renderPerformanceMetric('内存使用', monitorData.performanceMetrics.memoryUsage, 'MB', 
          monitorData.performanceMetrics.memoryUsage > 400 ? '#ff4d4f' : '#fff')}
        {renderPerformanceMetric('渲染帧率', monitorData.performanceMetrics.frameRate, 'FPS',
          monitorData.performanceMetrics.frameRate < 40 ? '#ff4d4f' : '#52c41a')}
        {renderPerformanceMetric('网络延迟', monitorData.performanceMetrics.networkLatency, 'ms',
          monitorData.performanceMetrics.networkLatency > 100 ? '#faad14' : '#fff')}
        {renderPerformanceMetric('缓存命中', monitorData.performanceMetrics.cacheHitRate, '%')}
      </div>

      {/* 告警信息 */}
      {monitorData.alerts.length > 0 && (
        <div style={{
          background: 'rgba(255, 77, 79, 0.1)',
          borderRadius: '8px',
          padding: '12px',
          border: '1px solid rgba(255, 77, 79, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ color: '#ff4d4f', margin: 0, fontSize: '13px' }}>
              系统告警 ({activeAlertsCount})
            </h4>
            <button
              onClick={handleClearAlerts}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 77, 79, 0.5)',
                borderRadius: '4px',
                color: '#ff4d4f',
                fontSize: '10px',
                padding: '2px 6px',
                cursor: 'pointer'
              }}
            >
              清除
            </button>
          </div>
          <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {monitorData.alerts.map(alert => (
              <div key={alert.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                margin: '4px 0',
                padding: '4px 8px',
                background: alert.acknowledged ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 77, 79, 0.1)',
                borderRadius: '4px',
                opacity: alert.acknowledged ? 0.6 : 1
              }}>
                <span style={{ color: '#fff', fontSize: '11px', flex: 1 }}>
                  {alert.message}
                </span>
                {!alert.acknowledged && (
                  <button
                    onClick={() => handleAcknowledgeAlert(alert.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ccc',
                      fontSize: '10px',
                      cursor: 'pointer',
                      padding: '2px 4px'
                    }}
                  >
                    ✓
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最后更新时间 */}
      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <span style={{ color: '#666', fontSize: '10px' }}>
          最后更新: {new Date(monitorData.lastUpdateTime).toLocaleTimeString()}
        </span>
      </div>
    </motion.div>
  );

  // ==================== 主渲染 ====================

  if (!isVisible) return null;

  return (
    <div className="system-monitoring-panel" style={positionStyles}>
      <AnimatePresence mode="wait">
        {expanded ? renderExpandedView() : renderCompactView()}
      </AnimatePresence>
    </div>
  );
};

export default SystemMonitoringPanel;