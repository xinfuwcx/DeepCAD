/**
 * 错误监控仪表板
 * DeepCAD Deep Excavation CAE Platform - Error Monitor Dashboard
 * 
 * 作者：2号几何专家
 * 功能：错误统计、实时监控、错误分析、系统健康状态
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Statistic, 
  Timeline, 
  Alert, 
  Space, 
  Tag, 
  Progress,
  Table,
  Button,
  Tooltip,
  Badge,
  Typography,
  Divider,
  Empty
} from 'antd';
import { 
  AlertTriangle, 
  Activity, 
  TrendingUp, 
  Clock, 
  Shield,
  RefreshCw,
  Download,
  Filter,
  BarChart3,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { errorHandler, ErrorType, ErrorSeverity, type ErrorInfo } from '../../utils/errorHandler';

const { Text, Title } = Typography;

interface ErrorMonitorDashboardProps {
  refreshInterval?: number; // 刷新间隔(ms)
  showDetails?: boolean;
  maxDisplayErrors?: number;
  className?: string;
}

// 系统健康状态
interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  uptime: number;
  lastErrorTime?: number;
  errorRate: number; // 错误率 (errors per minute)
}

// 错误趋势数据
interface ErrorTrend {
  timestamp: number;
  count: number;
  severity: ErrorSeverity;
}

export const ErrorMonitorDashboard: React.FC<ErrorMonitorDashboardProps> = ({
  refreshInterval = 5000,
  showDetails = true,
  maxDisplayErrors = 20,
  className
}) => {
  const [errorStats, setErrorStats] = useState<any>(null);
  const [recentErrors, setRecentErrors] = useState<ErrorInfo[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [errorTrends, setErrorTrends] = useState<ErrorTrend[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startTime] = useState(Date.now());

  // 更新错误统计
  const updateErrorStats = () => {
    const stats = errorHandler.getErrorStatistics();
    const errors = errorHandler.getErrorHistory();
    
    setErrorStats(stats);
    setRecentErrors(errors.slice(-maxDisplayErrors));
    
    // 计算系统健康状态
    const health = calculateSystemHealth(stats, errors);
    setSystemHealth(health);
    
    // 更新错误趋势
    updateErrorTrends(errors);
  };

  // 计算系统健康状态
  const calculateSystemHealth = (stats: any, errors: ErrorInfo[]): SystemHealth => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentErrors = errors.filter(e => e.timestamp > oneHourAgo);
    
    // 计算错误率 (每分钟错误数)
    const errorRate = recentErrors.length / 60;
    
    // 计算健康分数
    let score = 100;
    
    // 根据错误数量扣分
    if (stats.total > 0) {
      score -= Math.min(30, stats.total * 2);
    }
    
    // 根据严重错误扣分
    const criticalErrors = stats.bySeverity[ErrorSeverity.CRITICAL] || 0;
    const highErrors = stats.bySeverity[ErrorSeverity.HIGH] || 0;
    score -= criticalErrors * 15;
    score -= highErrors * 10;
    
    // 根据错误率扣分
    if (errorRate > 0.5) score -= 20;
    else if (errorRate > 0.1) score -= 10;
    
    score = Math.max(0, score);
    
    // 确定状态
    let status: 'healthy' | 'warning' | 'critical';
    if (score >= 80) status = 'healthy';
    else if (score >= 60) status = 'warning';
    else status = 'critical';
    
    return {
      status,
      score,
      uptime: now - startTime,
      lastErrorTime: errors.length > 0 ? errors[errors.length - 1].timestamp : undefined,
      errorRate
    };
  };

  // 更新错误趋势
  const updateErrorTrends = (errors: ErrorInfo[]) => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // 按5分钟间隔分组
    const intervalMs = 5 * 60 * 1000; // 5分钟
    const intervals = Math.floor((now - oneHourAgo) / intervalMs);
    
    const trends: ErrorTrend[] = [];
    
    for (let i = 0; i < intervals; i++) {
      const intervalStart = oneHourAgo + i * intervalMs;
      const intervalEnd = intervalStart + intervalMs;
      
      const intervalErrors = errors.filter(
        e => e.timestamp >= intervalStart && e.timestamp < intervalEnd
      );
      
      if (intervalErrors.length > 0) {
        // 按严重程度分组
        Object.values(ErrorSeverity).forEach(severity => {
          const count = intervalErrors.filter(e => e.severity === severity).length;
          if (count > 0) {
            trends.push({
              timestamp: intervalStart,
              count,
              severity
            });
          }
        });
      }
    }
    
    setErrorTrends(trends.slice(-20)); // 保持最近20个数据点
  };

  // 手动刷新
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      updateErrorStats();
      await new Promise(resolve => setTimeout(resolve, 500)); // 模拟刷新延迟
    } finally {
      setIsRefreshing(false);
    }
  };

  // 导出错误报告
  const handleExportReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      systemHealth,
      errorStats,
      recentErrors: recentErrors.map(error => ({
        ...error,
        timestamp: new Date(error.timestamp).toISOString()
      }))
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 清除所有错误
  const handleClearErrors = () => {
    errorHandler.clearErrorHistory();
    updateErrorStats();
  };

  // 格式化时间
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // 格式化持续时间
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // 获取错误类型颜色
  const getErrorTypeColor = (type: ErrorType): string => {
    const colors: Record<ErrorType, string> = {
      [ErrorType.NETWORK_ERROR]: '#1890ff',
      [ErrorType.VALIDATION_ERROR]: '#faad14',
      [ErrorType.AUTHENTICATION_ERROR]: '#f5222d',
      [ErrorType.AUTHORIZATION_ERROR]: '#fa541c',
      [ErrorType.SERVER_ERROR]: '#ff4d4f',
      [ErrorType.CLIENT_ERROR]: '#ff7a45',
      [ErrorType.UNKNOWN_ERROR]: '#666',
      [ErrorType.TIMEOUT_ERROR]: '#fa8c16',
      [ErrorType.MEMORY_ERROR]: '#722ed1',
      [ErrorType.RENDERING_ERROR]: '#eb2f96',
      [ErrorType.FILE_ERROR]: '#52c41a',
      [ErrorType.CALCULATION_ERROR]: '#13c2c2'
    };
    return colors[type] || '#666';
  };

  // 获取严重程度颜色
  const getSeverityColor = (severity: ErrorSeverity): string => {
    const colors: Record<ErrorSeverity, string> = {
      [ErrorSeverity.LOW]: '#52c41a',
      [ErrorSeverity.MEDIUM]: '#faad14',
      [ErrorSeverity.HIGH]: '#ff4d4f',
      [ErrorSeverity.CRITICAL]: '#a8071a'
    };
    return colors[severity];
  };

  // 获取健康状态颜色和图标
  const getHealthStatusDisplay = (status: string) => {
    switch (status) {
      case 'healthy':
        return { color: '#52c41a', icon: <CheckCircle size={16} />, text: '健康' };
      case 'warning':
        return { color: '#faad14', icon: <AlertTriangle size={16} />, text: '警告' };
      case 'critical':
        return { color: '#ff4d4f', icon: <AlertCircle size={16} />, text: '严重' };
      default:
        return { color: '#666', icon: <Activity size={16} />, text: '未知' };
    }
  };

  // 错误表格列配置
  const errorTableColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 120,
      render: (timestamp: number) => formatTime(timestamp)
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (type: ErrorType) => (
        <Tag color={getErrorTypeColor(type)} style={{ margin: 0 }}>
          {type.replace('_', ' ')}
        </Tag>
      )
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: ErrorSeverity) => (
        <Tag color={getSeverityColor(severity)} style={{ margin: 0 }}>
          {severity}
        </Tag>
      )
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (message: string) => (
        <Tooltip title={message}>
          <Text>{message}</Text>
        </Tooltip>
      )
    },
    {
      title: '错误代码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string) => (
        <Text code style={{ fontSize: '12px' }}>{code}</Text>
      )
    }
  ];

  // 定时更新
  useEffect(() => {
    updateErrorStats();
    
    const interval = setInterval(updateErrorStats, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, maxDisplayErrors]);

  if (!errorStats || !systemHealth) {
    return (
      <Card className={className} loading>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          正在加载错误监控数据...
        </div>
      </Card>
    );
  }

  const healthDisplay = getHealthStatusDisplay(systemHealth.status);

  return (
    <div className={`error-monitor-dashboard ${className || ''}`}>
      {/* 系统健康状态卡片 */}
      <Card
        title={
          <Space>
            <Shield size={20} />
            <span>系统健康状态</span>
            <Badge
              status={systemHealth.status === 'healthy' ? 'success' : 
                     systemHealth.status === 'warning' ? 'warning' : 'error'}
              text={healthDisplay.text}
            />
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="刷新数据">
              <Button
                type="text"
                icon={<RefreshCw size={16} />}
                loading={isRefreshing}
                onClick={handleRefresh}
                size="small"
              />
            </Tooltip>
            <Tooltip title="导出报告">
              <Button
                type="text"
                icon={<Download size={16} />}
                onClick={handleExportReport}
                size="small"
              />
            </Tooltip>
            <Tooltip title="清除错误历史">
              <Button
                type="text"
                icon={<Filter size={16} />}
                onClick={handleClearErrors}
                size="small"
                danger
              />
            </Tooltip>
          </Space>
        }
        size="small"
        style={{ marginBottom: '16px' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
          <Statistic
            title="健康分数"
            value={systemHealth.score}
            suffix="/100"
            valueStyle={{ color: healthDisplay.color }}
            prefix={healthDisplay.icon}
          />
          <Statistic
            title="运行时间"
            value={formatDuration(systemHealth.uptime)}
            prefix={<Clock size={16} />}
          />
          <Statistic
            title="错误率"
            value={systemHealth.errorRate.toFixed(2)}
            suffix="/min"
            valueStyle={{ 
              color: systemHealth.errorRate > 0.5 ? '#ff4d4f' : 
                     systemHealth.errorRate > 0.1 ? '#faad14' : '#52c41a'
            }}
            prefix={<TrendingUp size={16} />}
          />
          <Statistic
            title="总错误数"
            value={errorStats.total}
            valueStyle={{ 
              color: errorStats.total > 10 ? '#ff4d4f' : 
                     errorStats.total > 5 ? '#faad14' : '#52c41a'
            }}
            prefix={<AlertTriangle size={16} />}
          />
        </div>

        {/* 健康状态进度条 */}
        <div style={{ marginTop: '16px' }}>
          <Progress
            percent={systemHealth.score}
            strokeColor={healthDisplay.color}
            format={(percent) => `${percent}%`}
          />
        </div>
      </Card>

      {/* 错误统计卡片 */}
      <Card
        title={
          <Space>
            <BarChart3 size={20} />
            <span>错误统计</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: '16px' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {/* 按类型统计 */}
          <div>
            <Title level={5}>按类型分组</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              {Object.entries(errorStats.byType)
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([type, count]) => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Tag color={getErrorTypeColor(type as ErrorType)} style={{ margin: 0 }}>
                      {(type as string).replace('_', ' ')}
                    </Tag>
                    <Text strong>{count as number}</Text>
                  </div>
                ))}
            </Space>
          </div>

          {/* 按严重程度统计 */}
          <div>
            <Title level={5}>按严重程度分组</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              {Object.entries(errorStats.bySeverity)
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([severity, count]) => (
                  <div key={severity} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Tag color={getSeverityColor(severity as ErrorSeverity)} style={{ margin: 0 }}>
                      {severity}
                    </Tag>
                    <Text strong>{count as number}</Text>
                  </div>
                ))}
            </Space>
          </div>
        </div>
      </Card>

      {/* 最近错误 */}
      {showDetails && (
        <Card
          title={
            <Space>
              <Activity size={20} />
              <span>最近错误</span>
              <Badge count={recentErrors.length} />
            </Space>
          }
          size="small"
        >
          {recentErrors.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无错误记录"
            />
          ) : (
            <Table
              dataSource={recentErrors}
              columns={errorTableColumns}
              rowKey={(record) => `${record.timestamp}-${record.type}`}
              pagination={{
                pageSize: 10,
                size: 'small',
                showSizeChanger: false,
                showQuickJumper: true
              }}
              size="small"
              scroll={{ x: 600 }}
            />
          )}
        </Card>
      )}
    </div>
  );
};