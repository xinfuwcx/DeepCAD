/**
 * @file RealTimeComputingStatus.tsx
 * @description 实时计算进度可视化组件 - 三工作流状态监控
 * @author GitHub Copilot - 实时监控系统设计师
 * @inspiration 《钢铁侠》FRIDAY界面 + 苹果活动监控 + NASA任务控制中心
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  useTheme,
  alpha,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Memory,
  Psychology,
  Engineering,
  Speed,
  Timeline,
  TrendingUp,
  CheckCircle,
  Error,
  Warning,
  Pause,
  PlayArrow,
  Stop,
  Refresh,
  Visibility,
  Settings,
  CloudUpload,
  Storage,
  Computer,
  DeviceHub,
  Analytics,
  Functions,
} from '@mui/icons-material';
import { defaultTokens } from '../../styles/tokens/defaultTokens';

// 🔧 工作流状态接口
interface WorkflowStatus {
  id: 'workflow1' | 'workflow2' | 'workflow3';
  name: string;
  description: string;
  progress: number;        // 0-100
  status: 'idle' | 'running' | 'completed' | 'error' | 'paused';
  currentTask: string;
  estimatedTime: number;   // 剩余时间(秒)
  throughput: number;      // 处理速度
  resources: {
    cpu: number;           // CPU使用率 0-100
    memory: number;        // 内存使用率 0-100
    gpu?: number;          // GPU使用率 0-100 (可选)
  };
  metrics: {
    tasksCompleted: number;
    tasksTotal: number;
    errorCount: number;
    averageTime: number;   // 平均任务时间
  };
  dependencies: string[]; // 依赖的其他工作流
  priority: 'low' | 'normal' | 'high' | 'critical';
}

interface ComputingNode {
  id: string;
  name: string;
  type: 'cpu' | 'gpu' | 'ai' | 'storage';
  status: 'active' | 'idle' | 'error' | 'maintenance';
  load: number;           // 负载 0-100
  temperature?: number;   // 温度(可选)
  power?: number;         // 功耗(可选)
}

interface RealTimeComputingStatusProps {
  workflows?: WorkflowStatus[];
  computingNodes?: ComputingNode[];
  onWorkflowAction?: (workflowId: string, action: 'pause' | 'resume' | 'stop' | 'restart') => void;
  onNodeAction?: (nodeId: string, action: 'inspect' | 'restart' | 'configure') => void;
  showDetailedMetrics?: boolean;
  refreshInterval?: number; // 刷新间隔(毫秒)
  compact?: boolean;
}

// 🎨 状态颜色映射
const getStatusColor = (status: WorkflowStatus['status']): string => {
  switch (status) {
    case 'running': return defaultTokens.colors.neon.blue;
    case 'completed': return defaultTokens.colors.neon.green;
    case 'error': return defaultTokens.colors.neon.pink;
    case 'paused': return defaultTokens.colors.neon.orange;
    case 'idle': return defaultTokens.colors.glass.border;
    default: return defaultTokens.colors.glass.border;
  }
};

const getPriorityColor = (priority: WorkflowStatus['priority']): string => {
  switch (priority) {
    case 'critical': return defaultTokens.colors.neon.pink;
    case 'high': return defaultTokens.colors.neon.orange;
    case 'normal': return defaultTokens.colors.neon.blue;
    case 'low': return defaultTokens.colors.glass.border;
    default: return defaultTokens.colors.glass.border;
  }
};

// 🔄 模拟数据生成器
const generateMockWorkflows = (): WorkflowStatus[] => [
  {
    id: 'workflow1',
    name: '物理AI系统',
    description: 'PINN神经网络训练与参数反演',
    progress: 45,
    status: 'running',
    currentTask: '复杂边界条件处理',
    estimatedTime: 1800, // 30分钟
    throughput: 12.5,
    resources: { cpu: 68, memory: 45, gpu: 85 },
    metrics: {
      tasksCompleted: 127,
      tasksTotal: 280,
      errorCount: 3,
      averageTime: 45.2,
    },
    dependencies: [],
    priority: 'high',
  },
  {
    id: 'workflow2',
    name: '核心CAE引擎',
    description: 'FEM分析与渗流耦合计算',
    progress: 85,
    status: 'running',
    currentTask: '渗流-结构耦合迭代收敛',
    estimatedTime: 480, // 8分钟
    throughput: 8.3,
    resources: { cpu: 92, memory: 78, gpu: 45 },
    metrics: {
      tasksCompleted: 340,
      tasksTotal: 400,
      errorCount: 1,
      averageTime: 32.8,
    },
    dependencies: [],
    priority: 'critical',
  },
  {
    id: 'workflow3',
    name: '前端可视化',
    description: '实时渲染与用户交互处理',
    progress: 100,
    status: 'completed',
    currentTask: '等待新数据',
    estimatedTime: 0,
    throughput: 60.0,
    resources: { cpu: 25, memory: 35, gpu: 60 },
    metrics: {
      tasksCompleted: 1500,
      tasksTotal: 1500,
      errorCount: 0,
      averageTime: 16.7,
    },
    dependencies: ['workflow1', 'workflow2'],
    priority: 'normal',
  },
];

const generateMockNodes = (): ComputingNode[] => [
  { id: 'cpu1', name: 'CPU集群1', type: 'cpu', status: 'active', load: 75 },
  { id: 'gpu1', name: 'GPU加速器', type: 'gpu', status: 'active', load: 88, temperature: 72 },
  { id: 'ai1', name: 'AI处理单元', type: 'ai', status: 'active', load: 92, power: 350 },
  { id: 'storage1', name: '存储集群', type: 'storage', status: 'idle', load: 12 },
];

// 🎪 工作流卡片组件
const WorkflowCard: React.FC<{
  workflow: WorkflowStatus;
  onAction: (action: string) => void;
  compact: boolean;
}> = ({ workflow, onAction, compact }) => {
  const statusColor = getStatusColor(workflow.status);
  const priorityColor = getPriorityColor(workflow.priority);
  
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
    return `${Math.round(seconds / 3600)}小时`;
  };
  
  return (
    <Card
      sx={{
        background: `linear-gradient(135deg, 
          ${alpha(statusColor, 0.1)} 0%, 
          ${alpha(statusColor, 0.05)} 100%)`,
        border: `1px solid ${alpha(statusColor, 0.3)}`,
        borderRadius: defaultTokens.borderRadius.large,
        backdropFilter: 'blur(20px)',
        transition: defaultTokens.transitions.preset.cardHover,
        
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 25px ${alpha(statusColor, 0.2)}`,
          borderColor: statusColor,
        },
      }}
    >
      <CardContent sx={{ p: compact ? 2 : 3 }}>
        {/* 标题行 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: statusColor,
                animation: workflow.status === 'running' ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                  '100%': { opacity: 1 },
                },
              }}
            />
            <Typography variant={compact ? 'subtitle2' : 'h6'} sx={{ fontWeight: 600, color: '#F8FAFC' }}>
              {workflow.name}
            </Typography>
            <Chip
              label={workflow.priority}
              size="small"
              sx={{
                background: alpha(priorityColor, 0.2),
                color: priorityColor,
                border: `1px solid ${alpha(priorityColor, 0.3)}`,
                fontSize: '0.7rem',
              }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {workflow.status === 'running' && (
              <IconButton
                size="small"
                onClick={() => onAction('pause')}
                sx={{ color: statusColor }}
              >
                <Pause fontSize="small" />
              </IconButton>
            )}
            {workflow.status === 'paused' && (
              <IconButton
                size="small"
                onClick={() => onAction('resume')}
                sx={{ color: statusColor }}
              >
                <PlayArrow fontSize="small" />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={() => onAction('settings')}
              sx={{ color: alpha('#F8FAFC', 0.7) }}
            >
              <Settings fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        {/* 进度条 */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ color: alpha('#F8FAFC', 0.8) }}>
              {workflow.currentTask}
            </Typography>
            <Typography variant="body2" sx={{ color: statusColor, fontWeight: 600 }}>
              {workflow.progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={workflow.progress}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: alpha(statusColor, 0.2),
              '& .MuiLinearProgress-bar': {
                background: `linear-gradient(90deg, ${statusColor} 0%, ${alpha(statusColor, 0.7)} 100%)`,
                borderRadius: 3,
              },
            }}
          />
        </Box>
        
        {/* 详细指标 */}
        {!compact && (
          <Box>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: alpha('#F8FAFC', 0.6) }}>
                  剩余时间
                </Typography>
                <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 500 }}>
                  {formatTime(workflow.estimatedTime)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: alpha('#F8FAFC', 0.6) }}>
                  处理速度
                </Typography>
                <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 500 }}>
                  {workflow.throughput.toFixed(1)}/s
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: alpha('#F8FAFC', 0.6) }}>
                  错误计数
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: workflow.metrics.errorCount > 0 ? defaultTokens.colors.neon.pink : defaultTokens.colors.neon.green,
                    fontWeight: 500 
                  }}
                >
                  {workflow.metrics.errorCount}
                </Typography>
              </Box>
            </Stack>
            
            {/* 资源使用率 */}
            <Box>
              <Typography variant="caption" sx={{ color: alpha('#F8FAFC', 0.6), mb: 1, display: 'block' }}>
                资源使用率
              </Typography>
              <Stack direction="row" spacing={1}>
                <Tooltip title={`CPU: ${workflow.resources.cpu}%`}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Computer sx={{ fontSize: 14, color: defaultTokens.colors.neon.blue }} />
                    <LinearProgress
                      variant="determinate"
                      value={workflow.resources.cpu}
                      sx={{
                        width: 30,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: alpha(defaultTokens.colors.neon.blue, 0.2),
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: defaultTokens.colors.neon.blue,
                        },
                      }}
                    />
                  </Box>
                </Tooltip>
                
                <Tooltip title={`内存: ${workflow.resources.memory}%`}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Memory sx={{ fontSize: 14, color: defaultTokens.colors.neon.green }} />
                    <LinearProgress
                      variant="determinate"
                      value={workflow.resources.memory}
                      sx={{
                        width: 30,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: alpha(defaultTokens.colors.neon.green, 0.2),
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: defaultTokens.colors.neon.green,
                        },
                      }}
                    />
                  </Box>
                </Tooltip>
                
                {workflow.resources.gpu && (
                  <Tooltip title={`GPU: ${workflow.resources.gpu}%`}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Functions sx={{ fontSize: 14, color: defaultTokens.colors.neon.orange }} />
                      <LinearProgress
                        variant="determinate"
                        value={workflow.resources.gpu}
                        sx={{
                          width: 30,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: alpha(defaultTokens.colors.neon.orange, 0.2),
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: defaultTokens.colors.neon.orange,
                          },
                        }}
                      />
                    </Box>
                  </Tooltip>
                )}
              </Stack>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// 🎪 主组件
const RealTimeComputingStatus: React.FC<RealTimeComputingStatusProps> = ({
  workflows = generateMockWorkflows(),
  computingNodes = generateMockNodes(),
  onWorkflowAction = () => {},
  onNodeAction = () => {},
  showDetailedMetrics = true,
  refreshInterval = 5000,
  compact = false,
}) => {
  const [realTimeWorkflows, setRealTimeWorkflows] = useState<WorkflowStatus[]>(workflows);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  
  // 模拟实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeWorkflows(prev => prev.map(workflow => {
        if (workflow.status === 'running' && workflow.progress < 100) {
          return {
            ...workflow,
            progress: Math.min(100, workflow.progress + Math.random() * 3),
            estimatedTime: Math.max(0, workflow.estimatedTime - refreshInterval / 1000),
            resources: {
              ...workflow.resources,
              cpu: Math.max(0, Math.min(100, workflow.resources.cpu + (Math.random() - 0.5) * 10)),
              memory: Math.max(0, Math.min(100, workflow.resources.memory + (Math.random() - 0.5) * 5)),
              gpu: workflow.resources.gpu ? Math.max(0, Math.min(100, workflow.resources.gpu + (Math.random() - 0.5) * 15)) : undefined,
            },
          };
        }
        return workflow;
      }));
      setLastUpdateTime(Date.now());
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);
  
  // 计算总体状态
  const overallStatus = useMemo(() => {
    const running = realTimeWorkflows.filter(w => w.status === 'running').length;
    const completed = realTimeWorkflows.filter(w => w.status === 'completed').length;
    const errors = realTimeWorkflows.filter(w => w.status === 'error').length;
    const totalProgress = realTimeWorkflows.reduce((sum, w) => sum + w.progress, 0) / realTimeWorkflows.length;
    
    return { running, completed, errors, totalProgress };
  }, [realTimeWorkflows]);
  
  const handleWorkflowAction = (workflowId: string, action: string) => {
    onWorkflowAction(workflowId, action as any);
    console.log(`Workflow ${workflowId} action: ${action}`);
  };
  
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        background: `linear-gradient(135deg, 
          ${defaultTokens.colors.glass.surface} 0%, 
          ${defaultTokens.colors.glass.card} 100%)`,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${defaultTokens.colors.glass.border}`,
        borderRadius: defaultTokens.borderRadius.xl,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 标题栏 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DeviceHub sx={{ color: defaultTokens.colors.neon.blue, fontSize: 24 }} />
          <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
            实时计算状态监控
          </Typography>
          <CircularProgress
            size={16}
            sx={{ color: defaultTokens.colors.neon.blue }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" sx={{ color: alpha('#F8FAFC', 0.7) }}>
            更新时间: {new Date(lastUpdateTime).toLocaleTimeString()}
          </Typography>
          <Chip
            label={`总进度: ${overallStatus.totalProgress.toFixed(0)}%`}
            size="small"
            sx={{
              background: alpha(defaultTokens.colors.quantum.primary, 0.2),
              color: '#F8FAFC',
              border: `1px solid ${alpha(defaultTokens.colors.quantum.primary, 0.3)}`,
            }}
          />
        </Box>
      </Box>
      
      {/* 总体状态概览 */}
      {showDetailedMetrics && (
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PlayArrow sx={{ color: defaultTokens.colors.neon.blue, fontSize: 18 }} />
              <Typography variant="body2" sx={{ color: '#F8FAFC' }}>
                运行中: {overallStatus.running}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle sx={{ color: defaultTokens.colors.neon.green, fontSize: 18 }} />
              <Typography variant="body2" sx={{ color: '#F8FAFC' }}>
                已完成: {overallStatus.completed}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Error sx={{ color: defaultTokens.colors.neon.pink, fontSize: 18 }} />
              <Typography variant="body2" sx={{ color: '#F8FAFC' }}>
                错误: {overallStatus.errors}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}
      
      {/* 工作流状态卡片 */}
      <Stack spacing={2}>
        {realTimeWorkflows.map((workflow) => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
            onAction={(action) => handleWorkflowAction(workflow.id, action)}
            compact={compact}
          />
        ))}
      </Stack>
      
      {/* 背景装饰 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 120,
          height: 120,
          background: `radial-gradient(circle, 
            ${alpha(defaultTokens.colors.neon.blue, 0.1)} 0%, 
            transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
    </Paper>
  );
};

export default RealTimeComputingStatus;
export type { WorkflowStatus, ComputingNode, RealTimeComputingStatusProps };
