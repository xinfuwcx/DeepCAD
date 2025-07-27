/**
 * 内存监控组件
 * DeepCAD Deep Excavation CAE Platform - Memory Monitor Component
 * 
 * 作者：2号几何专家
 * 功能：实时内存监控、资源统计、性能警告、清理控制
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Progress, Button, Statistic, Alert, Tooltip, Space, Switch, Divider } from 'antd';
import { 
  MemoryStick, 
  Trash2, 
  Activity, 
  AlertTriangle, 
  RefreshCw,
  TrendingUp,
  Database,
  Image,
  Box,
  Layers
} from 'lucide-react';
import { SceneMemoryManager, type MemoryStats } from '../../core/memory/SceneMemoryManager';

interface MemoryMonitorProps {
  memoryManager: SceneMemoryManager;
  updateInterval?: number; // 更新间隔(ms)
  showDetails?: boolean;
  className?: string;
}

// 内存历史记录点
interface MemoryHistoryPoint {
  timestamp: number;
  totalMemory: number;
  textureMemory: number;
  geometryMemory: number;
}

// 格式化字节数为可读字符串
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// 格式化数字为千分位格式
const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

export const MemoryMonitor: React.FC<MemoryMonitorProps> = ({
  memoryManager,
  updateInterval = 1000,
  showDetails = true,
  className
}) => {
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [isAutoCleanupEnabled, setIsAutoCleanupEnabled] = useState(true);
  const [memoryHistory, setMemoryHistory] = useState<MemoryHistoryPoint[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout>();

  // 更新内存统计
  const updateMemoryStats = useCallback(() => {
    if (!memoryManager) return;
    
    const stats = memoryManager.getMemoryStats();
    setMemoryStats(stats);
    
    // 更新历史记录
    const historyPoint: MemoryHistoryPoint = {
      timestamp: Date.now(),
      totalMemory: stats.total.estimated,
      textureMemory: stats.textures.totalSize,
      geometryMemory: stats.geometries.memoryUsage
    };
    
    setMemoryHistory(prev => {
      const newHistory = [...prev, historyPoint];
      // 保持最近100个数据点
      return newHistory.slice(-100);
    });
  }, [memoryManager]);

  // 手动清理内存
  const handleManualCleanup = useCallback(async () => {
    if (!memoryManager) return;
    
    try {
      const cleanedCount = memoryManager.cleanupUnusedResources();
      console.log(`🧹 手动清理完成，清理了 ${cleanedCount} 个资源`);
      updateMemoryStats();
    } catch (error) {
      console.error('手动清理失败:', error);
    }
  }, [memoryManager, updateMemoryStats]);

  // 切换自动清理
  const handleAutoCleanupToggle = useCallback((enabled: boolean) => {
    setIsAutoCleanupEnabled(enabled);
    // 这里可以调用memoryManager的相关方法来启用/禁用自动清理
    console.log(`自动清理已${enabled ? '启用' : '禁用'}`);
  }, []);

  // 开始/停止监控
  const toggleMonitoring = useCallback(() => {
    setIsMonitoring(prev => !prev);
  }, []);

  // 设置定时更新
  useEffect(() => {
    if (isMonitoring && memoryManager) {
      intervalRef.current = setInterval(updateMemoryStats, updateInterval);
      updateMemoryStats(); // 立即更新一次
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isMonitoring, memoryManager, updateInterval, updateMemoryStats]);

  // 计算内存使用率
  const getMemoryUsagePercentage = (current: number, max: number = 1024 * 1024 * 1024): number => {
    return Math.min((current / max) * 100, 100);
  };

  // 获取内存状态颜色
  const getMemoryStatusColor = (percentage: number): string => {
    if (percentage < 50) return '#52c41a'; // 绿色
    if (percentage < 80) return '#faad14'; // 黄色
    return '#ff4d4f'; // 红色
  };

  // 渲染内存进度条
  const renderMemoryProgress = (
    label: string,
    current: number,
    total?: number,
    color?: string
  ) => {
    const percentage = total ? (current / total) * 100 : 0;
    const progressColor = color || getMemoryStatusColor(percentage);
    
    return (
      <div className="memory-progress-item" style={{ marginBottom: '12px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '4px',
          fontSize: '12px',
          color: '#666'
        }}>
          <span>{label}</span>
          <span>{formatBytes(current)}</span>
        </div>
        <Progress
          percent={Math.min(percentage, 100)}
          strokeColor={progressColor}
          showInfo={false}
          size="small"
        />
      </div>
    );
  };

  if (!memoryStats) {
    return (
      <Card className={className} title="内存监控" loading>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          正在加载内存统计...
        </div>
      </Card>
    );
  }

  const totalMemoryMB = memoryStats.total.estimated / (1024 * 1024);
  const memoryUsagePercentage = getMemoryUsagePercentage(memoryStats.total.estimated);

  return (
    <div className={`memory-monitor ${className || ''}`}>
      {/* 主内存状态卡片 */}
      <Card
        title={
          <Space>
            <MemoryStick size={20} />
            <span>内存监控</span>
            <Switch
              size="small"
              checked={isMonitoring}
              onChange={toggleMonitoring}
              checkedChildren="监控中"
              unCheckedChildren="已暂停"
            />
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="手动清理">
              <Button 
                type="text" 
                icon={<Trash2 size={16} />}
                onClick={handleManualCleanup}
                size="small"
              />
            </Tooltip>
            <Tooltip title="刷新数据">
              <Button 
                type="text" 
                icon={<RefreshCw size={16} />}
                onClick={updateMemoryStats}
                size="small"
              />
            </Tooltip>
          </Space>
        }
        size="small"
      >
        {/* 警告信息 */}
        {memoryStats.total.warnings.length > 0 && (
          <Alert
            message="内存警告"
            description={
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {memoryStats.total.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            }
            type="warning"
            icon={<AlertTriangle size={16} />}
            showIcon
            closable
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* 总内存使用情况 */}
        <div style={{ marginBottom: '20px' }}>
          <Statistic
            title="总内存使用量"
            value={totalMemoryMB}
            precision={1}
            suffix="MB"
            prefix={<Database size={16} />}
            valueStyle={{ 
              color: getMemoryStatusColor(memoryUsagePercentage),
              fontSize: '24px'
            }}
          />
          <Progress
            percent={memoryUsagePercentage}
            strokeColor={getMemoryStatusColor(memoryUsagePercentage)}
            style={{ marginTop: '8px' }}
          />
        </div>

        {showDetails && (
          <>
            <Divider style={{ margin: '16px 0' }} />

            {/* 详细内存统计 */}
            <div className="memory-details">
              <h4 style={{ 
                fontSize: '14px', 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Activity size={16} />
                资源详情
              </h4>

              {/* 纹理内存 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <Space>
                    <Image size={14} />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>纹理</span>
                  </Space>
                  <Tooltip title={`${memoryStats.textures.count} 个纹理，${memoryStats.textures.unusedCount} 个未使用`}>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {formatBytes(memoryStats.textures.totalSize)}
                    </span>
                  </Tooltip>
                </div>
                <Progress
                  percent={(memoryStats.textures.totalSize / memoryStats.total.estimated) * 100}
                  strokeColor="#1890ff"
                  showInfo={false}
                  size="small"
                />
              </div>

              {/* 几何体内存 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <Space>
                    <Box size={14} />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>几何体</span>
                  </Space>
                  <Tooltip title={`${formatNumber(memoryStats.geometries.totalVertices)} 顶点，${formatNumber(memoryStats.geometries.totalFaces)} 面`}>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {formatBytes(memoryStats.geometries.memoryUsage)}
                    </span>
                  </Tooltip>
                </div>
                <Progress
                  percent={(memoryStats.geometries.memoryUsage / memoryStats.total.estimated) * 100}
                  strokeColor="#52c41a"
                  showInfo={false}
                  size="small"
                />
              </div>

              {/* 渲染目标内存 */}
              {memoryStats.renderTargets.count > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <Space>
                      <Layers size={14} />
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>渲染目标</span>
                    </Space>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {formatBytes(memoryStats.renderTargets.memoryUsage)}
                    </span>
                  </div>
                  <Progress
                    percent={(memoryStats.renderTargets.memoryUsage / memoryStats.total.estimated) * 100}
                    strokeColor="#722ed1"
                    showInfo={false}
                    size="small"
                  />
                </div>
              )}

              {/* 统计数据 */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '12px',
                marginTop: '16px'
              }}>
                <Statistic
                  title="纹理数量"
                  value={memoryStats.textures.count}
                  valueStyle={{ fontSize: '16px' }}
                />
                <Statistic
                  title="几何体数量"
                  value={memoryStats.geometries.count}
                  valueStyle={{ fontSize: '16px' }}
                />
                <Statistic
                  title="材质数量"
                  value={memoryStats.materials.count}
                  valueStyle={{ fontSize: '16px' }}
                />
                <Statistic
                  title="未使用纹理"
                  value={memoryStats.textures.unusedCount}
                  valueStyle={{ 
                    fontSize: '16px',
                    color: memoryStats.textures.unusedCount > 0 ? '#faad14' : '#52c41a'
                  }}
                />
              </div>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {/* 控制选项 */}
            <div className="memory-controls">
              <h4 style={{ 
                fontSize: '14px', 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <TrendingUp size={16} />
                内存管理
              </h4>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px' }}>自动清理</span>
                <Switch
                  size="small"
                  checked={isAutoCleanupEnabled}
                  onChange={handleAutoCleanupToggle}
                />
              </div>

              <Button
                type="primary"
                icon={<Trash2 size={16} />}
                onClick={handleManualCleanup}
                block
                style={{ marginTop: '12px' }}
                size="small"
              >
                立即清理内存
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* 内存历史趋势图（简化版） */}
      {showDetails && memoryHistory.length > 1 && (
        <Card 
          title="内存使用趋势" 
          size="small" 
          style={{ marginTop: '16px' }}
        >
          <div style={{ height: '60px', position: 'relative' }}>
            <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
              {/* 简单的折线图 */}
              {memoryHistory.map((point, index) => {
                if (index === 0) return null;
                
                const prevPoint = memoryHistory[index - 1];
                const x1 = ((index - 1) / (memoryHistory.length - 1)) * 100;
                const x2 = (index / (memoryHistory.length - 1)) * 100;
                
                const maxMemory = Math.max(...memoryHistory.map(p => p.totalMemory));
                const y1 = 100 - ((prevPoint.totalMemory / maxMemory) * 80);
                const y2 = 100 - ((point.totalMemory / maxMemory) * 80);
                
                return (
                  <line
                    key={index}
                    x1={`${x1}%`}
                    y1={`${y1}%`}
                    x2={`${x2}%`}
                    y2={`${y2}%`}
                    stroke={getMemoryStatusColor((point.totalMemory / (1024 * 1024 * 1024)) * 100)}
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          </div>
        </Card>
      )}
    </div>
  );
};