/**
 * 系统状态指示器组件
 * 1号架构师 - 实时系统状态监控和用户反馈
 */

import React, { useState, useEffect } from 'react';
import { Badge, Tooltip, Dropdown, Space, Progress, Alert } from 'antd';
import { 
  ThunderboltOutlined, 
  CloudOutlined, 
  DatabaseOutlined,
  BugOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { performanceManager } from '../../core/PerformanceManager';
import { memoryManager } from '../../core/MemoryManager';
import { dataFlowManager } from '../../core/DataFlowManager';

// 系统状态类型
export type SystemStatus = 'optimal' | 'good' | 'warning' | 'critical' | 'offline';

// 子系统状态接口
interface SubsystemStatus {
  name: string;
  status: SystemStatus;
  value: number;
  unit: string;
  description: string;
  lastUpdated: number;
}

// 组件Props
interface SystemStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
  autoUpdate?: boolean;
  updateInterval?: number;
}

/**
 * 系统状态指示器主组件
 */
export const SystemStatusIndicator: React.FC<SystemStatusIndicatorProps> = ({
  className = '',
  showDetails = true,
  autoUpdate = true,
  updateInterval = 2000
}) => {
  // 状态管理
  const [overallStatus, setOverallStatus] = useState<SystemStatus>('good');
  const [subsystems, setSubsystems] = useState<SubsystemStatus[]>([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  /**
   * 更新系统状态
   */
  const updateSystemStatus = async () => {
    try {
      // 获取性能指标
      const perfMetrics = performanceManager.getCurrentMetrics();
      const memoryStats = memoryManager.getStats();
      const dataFlowNodes = dataFlowManager.getAllNodes();

      // 构建子系统状态
      const newSubsystems: SubsystemStatus[] = [
        {
          name: '渲染性能',
          status: getPerformanceStatus(perfMetrics.rendering.fps),
          value: Math.round(perfMetrics.rendering.fps),
          unit: 'FPS',
          description: `帧率: ${perfMetrics.rendering.fps.toFixed(1)} FPS`,
          lastUpdated: Date.now()
        },
        {
          name: '内存使用',
          status: getMemoryStatus(memoryStats.global.totalAllocated),
          value: Math.round(memoryStats.global.totalAllocated / (1024 * 1024)),
          unit: 'MB',
          description: `内存: ${(memoryStats.global.totalAllocated / (1024 * 1024)).toFixed(1)} MB`,
          lastUpdated: Date.now()
        },
        {
          name: '数据流',
          status: getDataFlowStatus(dataFlowNodes),
          value: dataFlowNodes.filter(n => n.status === 'completed').length,
          unit: '节点',
          description: `活跃节点: ${dataFlowNodes.length}`,
          lastUpdated: Date.now()
        },
        {
          name: '计算状态',
          status: getComputationStatus(perfMetrics.computation),
          value: Math.round(perfMetrics.computation.convergenceRate * 100),
          unit: '%',
          description: `收敛率: ${(perfMetrics.computation.convergenceRate * 100).toFixed(1)}%`,
          lastUpdated: Date.now()
        }
      ];

      setSubsystems(newSubsystems);
      setOverallStatus(calculateOverallStatus(newSubsystems));
      setLastUpdate(Date.now());

    } catch (error) {
      console.error('系统状态更新失败:', error);
      setOverallStatus('critical');
    }
  };

  // 自动更新
  useEffect(() => {
    updateSystemStatus();

    if (autoUpdate) {
      const interval = setInterval(updateSystemStatus, updateInterval);
      return () => clearInterval(interval);
    }
  }, [autoUpdate, updateInterval]);

  /**
   * 计算总体系统状态
   */
  const calculateOverallStatus = (systems: SubsystemStatus[]): SystemStatus => {
    const criticalCount = systems.filter(s => s.status === 'critical').length;
    const warningCount = systems.filter(s => s.status === 'warning').length;

    if (criticalCount > 0) return 'critical';
    if (warningCount > 1) return 'warning';
    if (warningCount === 1) return 'good';
    return 'optimal';
  };

  /**
   * 获取性能状态
   */
  const getPerformanceStatus = (fps: number): SystemStatus => {
    if (fps >= 55) return 'optimal';
    if (fps >= 40) return 'good';
    if (fps >= 25) return 'warning';
    return 'critical';
  };

  /**
   * 获取内存状态
   */
  const getMemoryStatus = (memoryBytes: number): SystemStatus => {
    const memoryMB = memoryBytes / (1024 * 1024);
    if (memoryMB < 256) return 'optimal';
    if (memoryMB < 512) return 'good';
    if (memoryMB < 1024) return 'warning';
    return 'critical';
  };

  /**
   * 获取数据流状态
   */
  const getDataFlowStatus = (nodes: any[]): SystemStatus => {
    if (nodes.length === 0) return 'good';
    
    const errorNodes = nodes.filter(n => n.status === 'error').length;
    const totalNodes = nodes.length;
    
    if (errorNodes === 0) return 'optimal';
    if (errorNodes / totalNodes < 0.2) return 'good';
    if (errorNodes / totalNodes < 0.5) return 'warning';
    return 'critical';
  };

  /**
   * 获取计算状态
   */
  const getComputationStatus = (computation: any): SystemStatus => {
    const convergenceRate = computation.convergenceRate || 0;
    
    if (convergenceRate > 0.9) return 'optimal';
    if (convergenceRate > 0.7) return 'good';
    if (convergenceRate > 0.5) return 'warning';
    return 'critical';
  };

  /**
   * 获取状态图标
   */
  const getStatusIcon = (status: SystemStatus) => {
    const iconProps = { style: { fontSize: '14px' } };
    
    switch (status) {
      case 'optimal':
        return <CheckCircleOutlined {...iconProps} style={{ ...iconProps.style, color: '#52c41a' }} />;
      case 'good':
        return <ThunderboltOutlined {...iconProps} style={{ ...iconProps.style, color: '#1890ff' }} />;
      case 'warning':
        return <WarningOutlined {...iconProps} style={{ ...iconProps.style, color: '#faad14' }} />;
      case 'critical':
        return <BugOutlined {...iconProps} style={{ ...iconProps.style, color: '#ff4d4f' }} />;
      case 'offline':
        return <LoadingOutlined {...iconProps} style={{ ...iconProps.style, color: '#d9d9d9' }} />;
      default:
        return <CloudOutlined {...iconProps} />;
    }
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = (status: SystemStatus): string => {
    switch (status) {
      case 'optimal': return '#52c41a';
      case 'good': return '#1890ff';
      case 'warning': return '#faad14';
      case 'critical': return '#ff4d4f';
      case 'offline': return '#d9d9d9';
      default: return '#1890ff';
    }
  };

  /**
   * 获取状态文本
   */
  const getStatusText = (status: SystemStatus): string => {
    switch (status) {
      case 'optimal': return '最佳';
      case 'good': return '良好';
      case 'warning': return '警告';
      case 'critical': return '严重';
      case 'offline': return '离线';
      default: return '未知';
    }
  };

  /**
   * 构建详情下拉菜单项
   */
  const menuItems: MenuProps['items'] = [
    {
      key: 'header',
      type: 'group',
      label: (
        <div style={{ padding: '8px 0' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>系统状态详情</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            更新时间: {new Date(lastUpdate).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    { type: 'divider' },
    ...subsystems.map((system, index) => ({
      key: `system-${index}`,
      label: (
        <div style={{ padding: '4px 0', minWidth: '200px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              {getStatusIcon(system.status)}
              <span style={{ fontWeight: '500' }}>{system.name}</span>
            </Space>
            <span style={{ color: getStatusColor(system.status), fontWeight: 'bold' }}>
              {system.value} {system.unit}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
            {system.description}
          </div>
          <Progress
            percent={getProgressPercent(system)}
            size="small"
            strokeColor={getStatusColor(system.status)}
            showInfo={false}
            style={{ marginTop: '4px' }}
          />
        </div>
      ),
    })),
    { type: 'divider' },
    {
      key: 'actions',
      label: (
        <div style={{ padding: '4px 0' }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <button
              onClick={updateSystemStatus}
              style={{
                width: '100%',
                padding: '6px 12px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              🔄 刷新状态
            </button>
            <button
              onClick={() => performanceManager.startMonitoring()}
              style={{
                width: '100%',
                padding: '6px 12px',
                border: '1px solid #1890ff',
                borderRadius: '4px',
                background: '#1890ff',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              📊 启动监控
            </button>
          </Space>
        </div>
      ),
    },
  ];

  /**
   * 获取进度百分比
   */
  const getProgressPercent = (system: SubsystemStatus): number => {
    switch (system.name) {
      case '渲染性能':
        return Math.min((system.value / 60) * 100, 100);
      case '内存使用':
        return Math.min((system.value / 1024) * 100, 100);
      case '数据流':
        return system.value > 0 ? 100 : 0;
      case '计算状态':
        return system.value;
      default:
        return 50;
    }
  };

  /**
   * 获取状态警告
   */
  const getStatusAlert = () => {
    if (overallStatus === 'critical') {
      return (
        <Alert
          message="系统状态严重"
          description="检测到多项性能指标异常，建议立即查看详情并优化系统配置。"
          type="error"
          style={{ marginTop: '8px' }}
          showIcon
        />
      );
    }
    
    if (overallStatus === 'warning') {
      return (
        <Alert
          message="系统状态警告"
          description="部分性能指标需要注意，建议查看详情并考虑优化。"
          type="warning"
          style={{ marginTop: '8px' }}
          showIcon
        />
      );
    }
    
    return null;
  };

  return (
    <div className={`system-status-indicator ${className}`}>
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        open={isDropdownVisible}
        onOpenChange={setIsDropdownVisible}
        placement="bottomRight"
        overlayStyle={{ minWidth: '280px' }}
      >
        <div style={{ cursor: 'pointer' }}>
          <Tooltip 
            title={`系统状态: ${getStatusText(overallStatus)}`}
            placement="bottom"
          >
            <Badge 
              status={overallStatus === 'optimal' ? 'success' : 
                     overallStatus === 'good' ? 'processing' : 
                     overallStatus === 'warning' ? 'warning' : 'error'}
              text={
                <Space size="small">
                  {getStatusIcon(overallStatus)}
                  <span style={{ 
                    color: getStatusColor(overallStatus),
                    fontWeight: '500',
                    fontSize: '12px'
                  }}>
                    {getStatusText(overallStatus)}
                  </span>
                </Space>
              }
            />
          </Tooltip>
        </div>
      </Dropdown>
      
      {showDetails && getStatusAlert()}
    </div>
  );
};

export default SystemStatusIndicator;