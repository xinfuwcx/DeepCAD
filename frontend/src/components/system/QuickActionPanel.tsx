/**
 * 快捷操作面板组件
 * 1号架构师 - 提升用户操作效率的快捷面板
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Tooltip, Badge, Progress, Divider, notification } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
  DownloadOutlined,
  SettingOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { useGeometryStore } from '../../stores/geometryStore';
import { useComputationStore } from '../../stores/computationStore';
import { useCAEWorkflow } from '../../stores/hooks/useCAEWorkflow';
import { performanceManager } from '../../core/PerformanceManager';
import { memoryManager } from '../../core/MemoryManager';

interface QuickActionPanelProps {
  className?: string;
  compact?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface QuickAction {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  action: () => Promise<void> | void;
  loading?: boolean;
  disabled?: boolean;
  badge?: number | string;
  category: 'workflow' | 'system' | 'tools' | 'export';
  hotkey?: string;
}

export const QuickActionPanel: React.FC<QuickActionPanelProps> = ({
  className = '',
  compact = false,
  position = 'right'
}) => {
  // Hooks
  const geometryStore = useGeometryStore();
  const computationStore = useComputationStore();
  const workflow = useCAEWorkflow();
  
  // State
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());

  /**
   * 执行动作并处理加载状态
   */
  const executeAction = async (actionId: string, actionFn: () => Promise<void> | void) => {
    setLoadingActions(prev => new Set(prev.add(actionId)));
    
    try {
      await actionFn();
      notification.success({
        message: '操作完成',
        description: actions.find(a => a.id === actionId)?.title,
        duration: 2,
        placement: 'topRight'
      });
    } catch (error) {
      console.error(`操作失败 [${actionId}]:`, error);
      notification.error({
        message: '操作失败',
        description: `${actions.find(a => a.id === actionId)?.title}: ${error}`,
        duration: 4,
        placement: 'topRight'
      });
    } finally {
      setLoadingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionId);
        return newSet;
      });
    }
  };

  /**
   * 初始化快捷操作
   */
  const initializeActions = (): QuickAction[] => {
    return [
      // 工作流操作
      {
        id: 'start-workflow',
        title: '启动工作流',
        icon: <PlayCircleOutlined />,
        description: '开始完整的CAE分析流程',
        action: async () => {
          await workflow.startWorkflow();
        },
        disabled: workflow.currentPhase !== 'geometry',
        category: 'workflow',
        hotkey: 'Ctrl+R'
      },
      {
        id: 'full-analysis',
        title: '一键分析',
        icon: <RocketOutlined />,
        description: '执行从几何到结果的完整自动化分析',
        action: async () => {
          await workflow.runFullAnalysis();
        },
        badge: workflow.overallProgress.percentage > 0 ? `${workflow.overallProgress.percentage}%` : undefined,
        category: 'workflow',
        hotkey: 'F5'
      },
      {
        id: 'reset-workflow',
        title: '重置工作流',
        icon: <ReloadOutlined />,
        description: '清空当前进度，重新开始',
        action: () => {
          workflow.resetWorkflow();
        },
        disabled: workflow.overallProgress.percentage === 0,
        category: 'workflow'
      },

      // 系统优化操作
      {
        id: 'optimize-performance',
        title: '性能优化',
        icon: <ThunderboltOutlined />,
        description: '自动优化系统性能设置',
        action: async () => {
          const suggestions = performanceManager.getOptimizationSuggestions();
          const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');
          
          for (const suggestion of highPrioritySuggestions.slice(0, 3)) {
            await performanceManager.applyOptimization(suggestion.id);
          }
        },
        badge: performanceManager.getOptimizationSuggestions('rendering').length || undefined,
        category: 'system'
      },
      {
        id: 'memory-cleanup',
        title: '内存清理',
        icon: <BulbOutlined />,
        description: '清理系统内存，释放空间',
        action: () => {
          memoryManager.performGC();
          memoryManager.compactMemory();
        },
        category: 'system'
      },
      {
        id: 'start-monitoring',
        title: '启动监控',
        icon: <ExperimentOutlined />,
        description: '开启实时性能监控',
        action: () => {
          performanceManager.startMonitoring();
        },
        disabled: false, // 可以添加监控状态检查
        category: 'system'
      },

      // 工具操作  
      {
        id: 'geometry-quality-check',
        title: '质量检查',
        icon: <SettingOutlined />,
        description: '检查几何模型质量',
        action: async () => {
          if (geometryStore.data) {
            await geometryStore.analyzeQuality();
          }
        },
        disabled: !geometryStore.data,
        badge: geometryStore.quality ? `${Math.round(geometryStore.quality.score * 100)}%` : undefined,
        category: 'tools'
      },
      {
        id: 'auto-fix-issues',
        title: '自动修复',
        icon: <BulbOutlined />,
        description: '自动修复发现的问题',
        action: async () => {
          await workflow.autoFixIssues();
        },
        disabled: workflow.issues.filter(i => i.blocking).length === 0,
        badge: workflow.issues.filter(i => i.blocking).length || undefined,
        category: 'tools'
      },

      // 导出操作
      {
        id: 'save-project',
        title: '保存项目',
        icon: <SaveOutlined />,
        description: '保存当前项目状态',
        action: async () => {
          // 实现项目保存逻辑
          console.log('保存项目状态...');
        },
        category: 'export',
        hotkey: 'Ctrl+S'
      },
      {
        id: 'export-results',
        title: '导出结果',
        icon: <DownloadOutlined />,
        description: '导出计算结果和报告',
        action: async () => {
          // 实现结果导出逻辑
          console.log('导出计算结果...');
        },
        disabled: !computationStore.results,
        category: 'export'
      }
    ];
  };

  // 更新操作列表
  useEffect(() => {
    const newActions = initializeActions().map(action => ({
      ...action,
      loading: loadingActions.has(action.id)
    }));
    setActions(newActions);
  }, [
    geometryStore.data,
    geometryStore.quality,
    computationStore.results,
    workflow.currentPhase,
    workflow.overallProgress,
    workflow.issues,
    loadingActions
  ]);

  /**
   * 按类别分组操作
   */
  const groupedActions = actions.reduce((groups, action) => {
    if (!groups[action.category]) {
      groups[action.category] = [];
    }
    groups[action.category].push(action);
    return groups;
  }, {} as Record<string, QuickAction[]>);

  /**
   * 获取类别标题
   */
  const getCategoryTitle = (category: string): string => {
    switch (category) {
      case 'workflow': return '🔄 工作流';
      case 'system': return '⚙️ 系统';
      case 'tools': return '🔧 工具';
      case 'export': return '📤 导出';
      default: return category;
    }
  };

  /**
   * 渲染操作按钮
   */
  const renderActionButton = (action: QuickAction) => {
    const button = (
      <Button
        key={action.id}
        type={action.category === 'workflow' ? 'primary' : 'default'}
        icon={action.icon}
        loading={action.loading}
        disabled={action.disabled}
        onClick={() => executeAction(action.id, action.action)}
        style={{
          width: compact ? 'auto' : '100%',
          height: compact ? '32px' : '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: compact ? 'center' : 'flex-start'
        }}
      >
        {!compact && (
          <span style={{ marginLeft: '8px' }}>
            {action.title}
          </span>
        )}
      </Button>
    );

    const wrappedButton = action.badge ? (
      <Badge count={action.badge} size="small" offset={[-8, 8]}>
        {button}
      </Badge>
    ) : button;

    return (
      <Tooltip
        key={action.id}
        title={
          <div>
            <div style={{ fontWeight: 'bold' }}>{action.title}</div>
            {action.description && (
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                {action.description}
              </div>
            )}
            {action.hotkey && (
              <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                快捷键: {action.hotkey}
              </div>
            )}
          </div>
        }
        placement={position === 'right' ? 'left' : 'top'}
      >
        {wrappedButton}
      </Tooltip>
    );
  };

  /**
   * 渲染进度指示器
   */
  const renderProgressIndicator = () => {
    if (workflow.overallProgress.percentage === 0) return null;

    return (
      <div style={{ padding: compact ? '8px' : '12px 16px' }}>
        <div style={{ 
          fontSize: '12px', 
          marginBottom: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>总体进度</span>
          <span style={{ fontWeight: 'bold' }}>
            {workflow.overallProgress.percentage}%
          </span>
        </div>
        <Progress
          percent={workflow.overallProgress.percentage}
          size="small"
          strokeColor={{
            '0%': '#1890ff',
            '100%': '#52c41a',
          }}
          showInfo={false}
        />
        {workflow.overallProgress.currentTask && (
          <div style={{ 
            fontSize: '11px', 
            marginTop: '4px', 
            color: '#666',
            textAlign: 'center'
          }}>
            {workflow.overallProgress.currentTask}
          </div>
        )}
      </div>
    );
  };

  const cardStyle: React.CSSProperties = {
    ...(compact && {
      padding: '8px',
      minWidth: 'auto'
    }),
    ...(position === 'right' && {
      position: 'fixed',
      right: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 1000,
      maxWidth: compact ? '60px' : '240px'
    }),
    ...(position === 'bottom' && {
      position: 'fixed',
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      maxWidth: '90vw'
    })
  };

  return (
    <Card
      className={`quick-action-panel ${className}`}
      style={cardStyle}
      bodyStyle={{ 
        padding: compact ? '8px' : '16px',
        ...(position === 'bottom' && { 
          display: 'flex', 
          flexDirection: 'row',
          gap: '8px',
          alignItems: 'center'
        })
      }}
      size={compact ? 'small' : 'default'}
    >
      {/* 进度指示器 */}
      {renderProgressIndicator()}
      
      {/* 操作按钮 */}
      {position === 'bottom' ? (
        // 底部布局：水平排列
        <Space wrap size="small">
          {actions.filter(a => a.category === 'workflow').map(renderActionButton)}
          <Divider type="vertical" style={{ height: '32px' }} />
          {actions.filter(a => a.category !== 'workflow').slice(0, 4).map(renderActionButton)}
        </Space>
      ) : (
        // 右侧布局：垂直分组
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '4px' : '8px' }}>
          {Object.entries(groupedActions).map(([category, categoryActions]) => (
            <div key={category}>
              {!compact && categoryActions.length > 0 && (
                <>
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: 'bold', 
                    marginBottom: '4px',
                    color: '#666'
                  }}>
                    {getCategoryTitle(category)}
                  </div>
                </>
              )}
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {categoryActions.map(renderActionButton)}
              </Space>
              {!compact && Object.keys(groupedActions).indexOf(category) < Object.keys(groupedActions).length - 1 && (
                <Divider style={{ margin: '8px 0' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default QuickActionPanel;