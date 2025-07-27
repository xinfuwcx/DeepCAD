/**
 * 2号几何专家 - 性能监控面板
 * 监控React组件性能、内存使用、渲染帧率等关键指标
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Row, Col, Statistic, Progress, Typography, Space, Switch, Alert } from 'antd';
import { 
  DashboardOutlined, 
  ThunderboltOutlined,
  MemoryStick,
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  componentCount: number;
  renderTime: number;
  updateCount: number;
  errorCount: number;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = false,
  onMetricsUpdate
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    componentCount: 0,
    renderTime: 0,
    updateCount: 0,
    errorCount: 0
  });

  const [isMonitoring, setIsMonitoring] = useState(enabled);
  const [performanceAlerts, setPerformanceAlerts] = useState<string[]>([]);
  
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const componentCountRef = useRef(0);
  const renderTimeRef = useRef(0);
  const animationFrameId = useRef<number>();

  // 获取内存信息
  const getMemoryInfo = useCallback((): MemoryInfo | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }
    return null;
  }, []);

  // 计算FPS
  const calculateFPS = useCallback(() => {
    const now = performance.now();
    frameCount.current++;
    
    if (now - lastTime.current >= 1000) {
      const fps = Math.round((frameCount.current * 1000) / (now - lastTime.current));
      frameCount.current = 0;
      lastTime.current = now;
      return fps;
    }
    return null;
  }, []);

  // 性能检查和警报
  const checkPerformanceAlerts = useCallback((currentMetrics: PerformanceMetrics) => {
    const alerts: string[] = [];
    
    if (currentMetrics.fps < 30) {
      alerts.push('FPS过低，可能影响用户体验');
    }
    
    if (currentMetrics.memoryUsage > 80) {
      alerts.push('内存使用率过高，建议清理缓存');
    }
    
    if (currentMetrics.renderTime > 16) {
      alerts.push('渲染时间过长，可能造成卡顿');
    }
    
    if (currentMetrics.componentCount > 500) {
      alerts.push('组件数量过多，建议使用虚拟化');
    }
    
    setPerformanceAlerts(alerts);
  }, []);

  // 监控循环
  const monitoringLoop = useCallback(() => {
    if (!isMonitoring) return;

    const fps = calculateFPS();
    const memoryInfo = getMemoryInfo();
    
    if (fps !== null) {
      const newMetrics: PerformanceMetrics = {
        fps,
        memoryUsage: memoryInfo ? 
          Math.round((memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100) : 0,
        componentCount: componentCountRef.current,
        renderTime: renderTimeRef.current,
        updateCount: metrics.updateCount + 1,
        errorCount: metrics.errorCount
      };

      setMetrics(newMetrics);
      checkPerformanceAlerts(newMetrics);
      onMetricsUpdate?.(newMetrics);
    }

    animationFrameId.current = requestAnimationFrame(monitoringLoop);
  }, [isMonitoring, calculateFPS, getMemoryInfo, checkPerformanceAlerts, metrics.updateCount, metrics.errorCount, onMetricsUpdate]);

  // 启动/停止监控
  useEffect(() => {
    if (isMonitoring) {
      animationFrameId.current = requestAnimationFrame(monitoringLoop);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isMonitoring, monitoringLoop]);

  // React DevTools Profiler 集成
  const onRenderCallback = useCallback((
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    renderTimeRef.current = actualDuration;
    componentCountRef.current = document.querySelectorAll('[data-reactroot] *').length;
  }, []);

  // 性能等级评估
  const getPerformanceGrade = (metrics: PerformanceMetrics): { grade: string; color: string } => {
    const score = (
      (metrics.fps >= 60 ? 25 : metrics.fps >= 30 ? 15 : 5) +
      (metrics.memoryUsage <= 50 ? 25 : metrics.memoryUsage <= 80 ? 15 : 5) +
      (metrics.renderTime <= 8 ? 25 : metrics.renderTime <= 16 ? 15 : 5) +
      (metrics.componentCount <= 200 ? 25 : metrics.componentCount <= 500 ? 15 : 5)
    );

    if (score >= 80) return { grade: '优秀', color: '#52c41a' };
    if (score >= 60) return { grade: '良好', color: '#1890ff' };
    if (score >= 40) return { grade: '一般', color: '#faad14' };
    return { grade: '需优化', color: '#ff4d4f' };
  };

  const performanceGrade = getPerformanceGrade(metrics);

  return (
    <Card
      title={
        <Space>
          <DashboardOutlined style={{ color: '#1890ff' }} />
          <span>性能监控面板</span>
          <Switch 
            size="small"
            checked={isMonitoring}
            onChange={setIsMonitoring}
            checkedChildren="开启"
            unCheckedChildren="关闭"
          />
        </Space>
      }
      style={{
        background: 'var(--component-bg)',
        border: '1px solid var(--border-color)'
      }}
      size="small"
    >
      {/* 性能警报 */}
      {performanceAlerts.length > 0 && (
        <Alert
          message="性能警告"
          description={
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {performanceAlerts.map((alert, index) => (
                <li key={index}>{alert}</li>
              ))}
            </ul>
          }
          type="warning"
          icon={<WarningOutlined />}
          style={{ marginBottom: '16px' }}
          showIcon
        />
      )}

      {/* 总体性能评级 */}
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={24}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="性能评级"
              value={performanceGrade.grade}
              valueStyle={{ color: performanceGrade.color, fontSize: '24px' }}
              prefix={
                performanceGrade.grade === '优秀' ? 
                <CheckCircleOutlined /> : 
                <WarningOutlined />
              }
            />
          </Card>
        </Col>
      </Row>

      {/* 详细指标 */}
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card size="small">
            <Statistic
              title="帧率 (FPS)"
              value={metrics.fps}
              suffix="fps"
              valueStyle={{ 
                color: metrics.fps >= 60 ? '#52c41a' : metrics.fps >= 30 ? '#faad14' : '#ff4d4f' 
              }}
              prefix={<ThunderboltOutlined />}
            />
            <Progress 
              percent={Math.min(100, (metrics.fps / 60) * 100)} 
              size="small" 
              showInfo={false}
              strokeColor={metrics.fps >= 60 ? '#52c41a' : metrics.fps >= 30 ? '#faad14' : '#ff4d4f'}
            />
          </Card>
        </Col>

        <Col span={12}>
          <Card size="small">
            <Statistic
              title="内存使用"
              value={metrics.memoryUsage}
              suffix="%"
              valueStyle={{ 
                color: metrics.memoryUsage <= 50 ? '#52c41a' : metrics.memoryUsage <= 80 ? '#faad14' : '#ff4d4f' 
              }}
              prefix={<MemoryStick />}
            />
            <Progress 
              percent={metrics.memoryUsage} 
              size="small" 
              showInfo={false}
              strokeColor={metrics.memoryUsage <= 50 ? '#52c41a' : metrics.memoryUsage <= 80 ? '#faad14' : '#ff4d4f'}
            />
          </Card>
        </Col>

        <Col span={12}>
          <Card size="small">
            <Statistic
              title="渲染时间"
              value={metrics.renderTime.toFixed(2)}
              suffix="ms"
              valueStyle={{ 
                color: metrics.renderTime <= 8 ? '#52c41a' : metrics.renderTime <= 16 ? '#faad14' : '#ff4d4f' 
              }}
              prefix={<ClockCircleOutlined />}
            />
            <Progress 
              percent={Math.min(100, (metrics.renderTime / 16) * 100)} 
              size="small" 
              showInfo={false}
              strokeColor={metrics.renderTime <= 8 ? '#52c41a' : metrics.renderTime <= 16 ? '#faad14' : '#ff4d4f'}
            />
          </Card>
        </Col>

        <Col span={12}>
          <Card size="small">
            <Statistic
              title="组件数量"
              value={metrics.componentCount}
              valueStyle={{ 
                color: metrics.componentCount <= 200 ? '#52c41a' : metrics.componentCount <= 500 ? '#faad14' : '#ff4d4f' 
              }}
              prefix={<AppstoreOutlined />}
            />
            <Progress 
              percent={Math.min(100, (metrics.componentCount / 1000) * 100)} 
              size="small" 
              showInfo={false}
              strokeColor={metrics.componentCount <= 200 ? '#52c41a' : metrics.componentCount <= 500 ? '#faad14' : '#ff4d4f'}
            />
          </Card>
        </Col>
      </Row>

      {/* 详细信息 */}
      <Row style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Text style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            更新次数: {metrics.updateCount} | 错误次数: {metrics.errorCount} | 
            {isMonitoring ? ' 🟢 监控中' : ' 🔴 已停止'}
          </Text>
        </Col>
      </Row>
    </Card>
  );
};

export default PerformanceMonitor;