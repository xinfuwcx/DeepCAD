/**
 * 实时性能监控面板
 * 1号架构师 - 为CAE系统提供实时性能监控和预警
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Progress, Alert, Button, Statistic, Timeline, Badge, Tooltip } from 'antd';
import { Line } from '@ant-design/plots';
import { 
  ThunderboltOutlined, 
  MemoryOutlined, 
  DatabaseOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { performanceManager } from '../../core/PerformanceManager';
import { advancedMemoryManager } from '../../core/AdvancedMemoryManager';
import { dataFlowManager } from '../../core/DataFlowManager';

// ==================== 类型定义 ====================

interface PerformanceData {
  timestamp: number;
  fps: number;
  memoryUsage: number;
  memoryAllocated: number;
  cpuUsage: number;
  renderTime: number;
  dataFlowNodes: number;
  activeConnections: number;
}

interface AlertData {
  id: string;
  type: 'memory' | 'performance' | 'dataflow' | 'system';
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: number;
  resolved: boolean;
}

// ==================== 组件Props ====================

interface RealTimePerformanceMonitorProps {
  className?: string;
  updateInterval?: number;
  maxDataPoints?: number;
  showAlerts?: boolean;
  autoOptimize?: boolean;
}

// ==================== 主组件 ====================

export const RealTimePerformanceMonitor: React.FC<RealTimePerformanceMonitorProps> = ({
  className = '',
  updateInterval = 1000,
  maxDataPoints = 60,
  showAlerts = true,
  autoOptimize = false
}) => {
  // 状态管理
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceData | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [systemHealth, setSystemHealth] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  
  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const alertIdCounter = useRef(0);

  // 启动监控
  const startMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsMonitoring(true);
    
    intervalRef.current = setInterval(() => {
      collectPerformanceData();
    }, updateInterval);

    // 立即收集一次数据
    collectPerformanceData();
  };

  // 停止监控
  const stopMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsMonitoring(false);
  };

  // 收集性能数据
  const collectPerformanceData = async () => {
    try {
      // 获取各系统的性能指标
      const perfMetrics = performanceManager.getCurrentMetrics();
      const memoryStats = advancedMemoryManager.getStats();
      const dataFlowNodes = dataFlowManager.getAllNodes();
      
      const timestamp = Date.now();
      const newDataPoint: PerformanceData = {
        timestamp,
        fps: perfMetrics.rendering.fps || 60,
        memoryUsage: memoryStats ? memoryStats.totalUsed : 0,
        memoryAllocated: memoryStats ? memoryStats.totalAllocated : 0,
        cpuUsage: perfMetrics.computation.cpuUsage || 0,
        renderTime: perfMetrics.rendering.frameTime || 16.67,
        dataFlowNodes: dataFlowNodes.length,
        activeConnections: dataFlowNodes.filter(n => n.status === 'processing').length
      };

      setCurrentMetrics(newDataPoint);
      
      setPerformanceData(prev => {
        const updated = [...prev, newDataPoint];
        return updated.slice(-maxDataPoints);
      });

      // 检查性能警报
      checkPerformanceAlerts(newDataPoint);
      
      // 更新系统健康状态
      updateSystemHealth(newDataPoint);

      // 自动优化
      if (autoOptimize) {
        performAutoOptimization(newDataPoint);
      }

    } catch (error) {
      console.error('性能数据收集失败:', error);
      addAlert('system', 'error', '性能数据收集失败，请检查系统状态');
    }
  };

  // 检查性能警报
  const checkPerformanceAlerts = (data: PerformanceData) => {
    const memoryUsagePercent = (data.memoryUsage / data.memoryAllocated) * 100;
    
    // 内存使用警报
    if (memoryUsagePercent > 90) {
      addAlert('memory', 'error', `内存使用率过高: ${memoryUsagePercent.toFixed(1)}%`);
    } else if (memoryUsagePercent > 80) {
      addAlert('memory', 'warning', `内存使用率较高: ${memoryUsagePercent.toFixed(1)}%`);
    }

    // FPS警报
    if (data.fps < 30) {
      addAlert('performance', 'error', `帧率过低: ${data.fps.toFixed(1)} FPS`);
    } else if (data.fps < 45) {
      addAlert('performance', 'warning', `帧率较低: ${data.fps.toFixed(1)} FPS`);
    }

    // CPU使用率警报
    if (data.cpuUsage > 90) {
      addAlert('performance', 'error', `CPU使用率过高: ${data.cpuUsage.toFixed(1)}%`);
    } else if (data.cpuUsage > 80) {
      addAlert('performance', 'warning', `CPU使用率较高: ${data.cpuUsage.toFixed(1)}%`);
    }

    // 数据流警报
    if (data.activeConnections > 50) {
      addAlert('dataflow', 'warning', `活跃数据流连接过多: ${data.activeConnections}`);
    }
  };

  // 添加警报
  const addAlert = (type: AlertData['type'], level: AlertData['level'], message: string) => {
    const newAlert: AlertData = {
      id: `alert_${alertIdCounter.current++}`,
      type,
      level,
      message,
      timestamp: Date.now(),
      resolved: false
    };

    setAlerts(prev => {
      // 避免重复警报
      const existingAlert = prev.find(alert => 
        alert.message === message && 
        alert.resolved === false &&
        Date.now() - alert.timestamp < 60000 // 1分钟内的相同警报
      );
      
      if (existingAlert) {
        return prev;
      }

      return [newAlert, ...prev.slice(0, 19)]; // 最多保持20个警报
    });
  };

  // 更新系统健康状态
  const updateSystemHealth = (data: PerformanceData) => {
    const memoryUsagePercent = (data.memoryUsage / data.memoryAllocated) * 100;
    
    let healthScore = 100;
    
    // 减分项
    if (data.fps < 60) healthScore -= (60 - data.fps) * 0.5;
    if (memoryUsagePercent > 70) healthScore -= (memoryUsagePercent - 70) * 0.8;
    if (data.cpuUsage > 70) healthScore -= (data.cpuUsage - 70) * 0.6;
    if (data.renderTime > 20) healthScore -= (data.renderTime - 20) * 0.4;

    if (healthScore >= 90) setSystemHealth('excellent');
    else if (healthScore >= 75) setSystemHealth('good');
    else if (healthScore >= 60) setSystemHealth('fair');
    else setSystemHealth('poor');
  };

  // 自动优化
  const performAutoOptimization = (data: PerformanceData) => {
    const memoryUsagePercent = (data.memoryUsage / data.memoryAllocated) * 100;
    
    // 内存优化
    if (memoryUsagePercent > 85) {
      advancedMemoryManager.garbageCollect(true);
      addAlert('system', 'info', '触发内存垃圾收集优化');
    }

    // 性能优化
    if (data.fps < 40) {
      // 可以触发LOD降级或其他性能优化措施
      addAlert('system', 'info', '触发性能优化措施');
    }
  };

  // 解决警报
  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  };

  // 清除所有警报
  const clearAllAlerts = () => {
    setAlerts([]);
  };

  // 组件挂载时启动监控
  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, [updateInterval]);

  // 准备图表数据
  const chartData = performanceData.map(data => [
    { time: new Date(data.timestamp).toLocaleTimeString(), value: data.fps, category: 'FPS' },
    { time: new Date(data.timestamp).toLocaleTimeString(), value: (data.memoryUsage / data.memoryAllocated) * 100, category: '内存使用率%' },
    { time: new Date(data.timestamp).toLocaleTimeString(), value: data.cpuUsage, category: 'CPU使用率%' }
  ]).flat();

  // 图表配置
  const chartConfig = {
    data: chartData,
    xField: 'time',
    yField: 'value',
    seriesField: 'category',
    smooth: true,
    height: 200,
    legend: { position: 'top' as const },
    color: ['#1890ff', '#52c41a', '#faad14'],
    xAxis: {
      tickCount: 6,
      label: {
        formatter: (text: string) => text.split(':').slice(0, 2).join(':')
      }
    },
    yAxis: {
      max: 100,
      label: {
        formatter: (text: string) => `${text}%`
      }
    }
  };

  // 获取系统健康颜色
  const getHealthColor = (health: typeof systemHealth) => {
    const colors = {
      excellent: '#52c41a',
      good: '#1890ff', 
      fair: '#faad14',
      poor: '#ff4d4f'
    };
    return colors[health];
  };

  // 获取系统健康文本
  const getHealthText = (health: typeof systemHealth) => {
    const texts = {
      excellent: '优秀',
      good: '良好',
      fair: '一般', 
      poor: '较差'
    };
    return texts[health];
  };

  return (
    <div className={`realtime-performance-monitor ${className}`}>
      {/* 控制面板 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Button
              type={isMonitoring ? 'default' : 'primary'}
              icon={isMonitoring ? <SyncOutlined spin /> : <ThunderboltOutlined />}
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
            >
              {isMonitoring ? '停止监控' : '开始监控'}
            </Button>
          </Col>
          <Col>
            <Statistic
              title="系统健康"
              value={getHealthText(systemHealth)}
              valueStyle={{ color: getHealthColor(systemHealth) }}
              prefix={
                systemHealth === 'excellent' ? <CheckCircleOutlined /> :
                systemHealth === 'poor' ? <WarningOutlined /> :
                <ThunderboltOutlined />
              }
            />
          </Col>
        </Row>
      </Card>

      {/* 实时指标卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="帧率"
              value={currentMetrics?.fps || 0}
              precision={1}
              suffix="FPS"
              valueStyle={{ color: (currentMetrics?.fps || 0) >= 50 ? '#52c41a' : '#ff4d4f' }}
              prefix={<ThunderboltOutlined />}
            />
            <Progress 
              percent={Math.min((currentMetrics?.fps || 0) / 60 * 100, 100)}
              size="small"
              strokeColor={(currentMetrics?.fps || 0) >= 50 ? '#52c41a' : '#ff4d4f'}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="内存使用"
              value={currentMetrics ? (currentMetrics.memoryUsage / currentMetrics.memoryAllocated) * 100 : 0}
              precision={1}
              suffix="%"
              valueStyle={{ 
                color: currentMetrics && (currentMetrics.memoryUsage / currentMetrics.memoryAllocated) * 100 < 80 ? '#52c41a' : '#ff4d4f' 
              }}
              prefix={<MemoryOutlined />}
            />
            <Progress 
              percent={currentMetrics ? (currentMetrics.memoryUsage / currentMetrics.memoryAllocated) * 100 : 0}
              size="small"
              strokeColor={currentMetrics && (currentMetrics.memoryUsage / currentMetrics.memoryAllocated) * 100 < 80 ? '#52c41a' : '#ff4d4f'}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="CPU使用率"
              value={currentMetrics?.cpuUsage || 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: (currentMetrics?.cpuUsage || 0) < 80 ? '#52c41a' : '#ff4d4f' }}
              prefix={<DatabaseOutlined />}
            />
            <Progress 
              percent={currentMetrics?.cpuUsage || 0}
              size="small"
              strokeColor={(currentMetrics?.cpuUsage || 0) < 80 ? '#52c41a' : '#ff4d4f'}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="渲染时间"
              value={currentMetrics?.renderTime || 0}
              precision={2}
              suffix="ms"
              valueStyle={{ color: (currentMetrics?.renderTime || 0) < 20 ? '#52c41a' : '#ff4d4f' }}
              prefix={<ClockCircleOutlined />}
            />
            <Progress 
              percent={Math.min((currentMetrics?.renderTime || 0) / 33.33 * 100, 100)}
              size="small"
              strokeColor={(currentMetrics?.renderTime || 0) < 20 ? '#52c41a' : '#ff4d4f'}
            />
          </Card>
        </Col>
      </Row>

      {/* 性能趋势图表 */}
      <Card title="性能趋势" size="small" style={{ marginBottom: '16px' }}>
        {performanceData.length > 0 ? (
          <Line {...chartConfig} />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            暂无数据，请启动监控
          </div>
        )}
      </Card>

      {/* 警报面板 */}
      {showAlerts && (
        <Card 
          title="系统警报" 
          size="small"
          extra={
            alerts.length > 0 && (
              <Button size="small" onClick={clearAllAlerts}>
                清除全部
              </Button>
            )
          }
        >
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              <CheckCircleOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
              <div>系统运行正常，暂无警报</div>
            </div>
          ) : (
            <Timeline>
              {alerts.slice(0, 10).map(alert => (
                <Timeline.Item
                  key={alert.id}
                  dot={
                    <Badge 
                      status={
                        alert.resolved ? 'default' :
                        alert.level === 'error' ? 'error' :
                        alert.level === 'warning' ? 'warning' : 'processing'
                      }
                    />
                  }
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ 
                        color: alert.resolved ? '#999' : 
                               alert.level === 'error' ? '#ff4d4f' :
                               alert.level === 'warning' ? '#faad14' : '#1890ff'
                      }}>
                        {alert.message}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                    
                    {!alert.resolved && (
                      <Button 
                        size="small" 
                        type="link"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        解决
                      </Button>
                    )}
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          )}
        </Card>
      )}
    </div>
  );
};

export default RealTimePerformanceMonitor;