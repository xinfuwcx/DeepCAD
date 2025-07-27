/**
 * 实时计算进度监控组件
 * 1号架构师开发 - 为3号计算专家提供的进度显示组件
 */

import React, { useState, useEffect } from 'react';
import { Card, Progress, Typography, Tag, Space, Button, Alert, Descriptions } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  StopOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useComputationProgress, useRealtimeConnection } from '../../api/realtimeClient';
import { ComponentDevHelper } from '../../utils/developmentTools';

const { Text, Title } = Typography;

interface RealtimeProgressMonitorProps {
  jobId?: string;
  onStatusChange?: (status: string, progress: number) => void;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  showControls?: boolean;
  title?: string;
}

// 计算状态映射
const STATUS_CONFIG = {
  idle: { color: '#d9d9d9', text: '空闲', icon: <ClockCircleOutlined /> },
  initializing: { color: '#1890ff', text: '初始化', icon: <PlayCircleOutlined /> },
  mesh_generation: { color: '#faad14', text: '网格生成', icon: <ThunderboltOutlined /> },
  preprocessing: { color: '#722ed1', text: '预处理', icon: <PlayCircleOutlined /> },
  solving: { color: '#52c41a', text: '求解中', icon: <ThunderboltOutlined /> },
  postprocessing: { color: '#13c2c2', text: '后处理', icon: <PlayCircleOutlined /> },
  completed: { color: '#52c41a', text: '完成', icon: <CheckCircleOutlined /> },
  failed: { color: '#ff4d4f', text: '失败', icon: <ExclamationCircleOutlined /> },
  cancelled: { color: '#d9d9d9', text: '已取消', icon: <StopOutlined /> }
};

const RealtimeProgressMonitor: React.FC<RealtimeProgressMonitorProps> = ({
  jobId,
  onStatusChange,
  onComplete,
  onError,
  showControls = true,
  title = '计算进度监控'
}) => {
  const progress = useComputationProgress(jobId);
  const { send, isConnected, status: connectionStatus } = useRealtimeConnection();
  
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [computationStatus, setComputationStatus] = useState<string>('idle');

  // 监听进度变化
  useEffect(() => {
    if (progress.stage !== 'idle' && !startTime) {
      setStartTime(Date.now());
    }

    if (progress.stage === 'completed' || progress.stage === 'failed') {
      if (!endTime) {
        setEndTime(Date.now());
      }
    }

    setComputationStatus(progress.stage);
    onStatusChange?.(progress.stage, progress.percentage);

    // 处理完成和错误状态
    if (progress.stage === 'completed') {
      onComplete?.(progress);
      ComponentDevHelper.logDevTip(`计算任务完成: ${jobId}`);
    } else if (progress.stage === 'failed') {
      onError?.(progress.message);
      ComponentDevHelper.logError(progress.message, 'RealtimeProgressMonitor', '1号架构师');
    }
  }, [progress, startTime, endTime, onStatusChange, onComplete, onError, jobId]);

  // 格式化时间
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    } else if (minutes > 0) {
      return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
    } else {
      return `${seconds}s`;
    }
  };

  // 计算预估剩余时间
  const getEstimatedTimeRemaining = (): string => {
    if (!startTime || progress.percentage <= 0) return '计算中...';
    
    const elapsed = Date.now() - startTime;
    const estimatedTotal = (elapsed / progress.percentage) * 100;
    const remaining = estimatedTotal - elapsed;
    
    if (remaining > 0) {
      return formatDuration(remaining);
    } else {
      return '即将完成';
    }
  };

  // 发送控制命令
  const sendControlCommand = (command: 'pause' | 'resume' | 'cancel') => {
    if (!jobId || !isConnected) return;

    send('computation_control', {
      jobId,
      command,
      timestamp: Date.now()
    });

    ComponentDevHelper.logAPICall(`computation_control/${command}`, 'WebSocket', '1号架构师');
  };

  const statusConfig = STATUS_CONFIG[computationStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.idle;
  const isActive = ['initializing', 'mesh_generation', 'preprocessing', 'solving', 'postprocessing'].includes(computationStatus);
  const isCompleted = computationStatus === 'completed';
  const isFailed = computationStatus === 'failed';

  return (
    <Card
      title={
        <span style={{ color: '#00d9ff' }}>
          <ThunderboltOutlined style={{ marginRight: '8px' }} />
          {title}
        </span>
      }
      style={{
        background: '#16213e',
        border: '1px solid #00d9ff30'
      }}
      extra={
        jobId && (
          <Tag color={statusConfig.color} icon={statusConfig.icon}>
            {statusConfig.text}
          </Tag>
        )
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 连接状态警告 */}
        {!isConnected && (
          <Alert
            message="实时连接断开"
            description="进度更新可能延迟，正在尝试重新连接..."
            type="warning"
            showIcon
          />
        )}

        {/* 任务信息 */}
        {jobId ? (
          <Descriptions size="small" column={1}>
            <Descriptions.Item label="任务ID">
              <Text code style={{ fontSize: '12px' }}>{jobId}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="当前阶段">
              <Tag color={statusConfig.color} icon={statusConfig.icon}>
                {statusConfig.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="进度消息">
              <Text style={{ color: '#ffffff80', fontSize: '12px' }}>
                {progress.message || '等待更新...'}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Alert
            message="等待计算任务"
            description="请启动计算任务以开始监控进度"
            type="info"
            showIcon
          />
        )}

        {/* 进度条 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: '#ffffff80', fontSize: '12px' }}>计算进度</Text>
            <Text style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
              {progress.percentage.toFixed(1)}%
            </Text>
          </div>
          <Progress
            percent={progress.percentage}
            status={isFailed ? 'exception' : isCompleted ? 'success' : isActive ? 'active' : 'normal'}
            strokeColor={{
              '0%': '#00d9ff',
              '100%': '#0066cc'
            }}
            trailColor="rgba(255,255,255,0.1)"
            showInfo={false}
          />
        </div>

        {/* 时间信息 */}
        {(startTime || endTime) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <div>
              <Text style={{ color: '#ffffff80' }}>已耗时: </Text>
              <Text style={{ color: '#fff' }}>
                {startTime ? formatDuration((endTime || Date.now()) - startTime) : '0s'}
              </Text>
            </div>
            {isActive && (
              <div>
                <Text style={{ color: '#ffffff80' }}>预计剩余: </Text>
                <Text style={{ color: '#52c41a' }}>
                  {getEstimatedTimeRemaining()}
                </Text>
              </div>
            )}
          </div>
        )}

        {/* 控制按钮 */}
        {showControls && jobId && isConnected && (
          <Space>
            {isActive && (
              <>
                <Button
                  size="small"
                  icon={<PauseCircleOutlined />}
                  onClick={() => sendControlCommand('pause')}
                >
                  暂停
                </Button>
                <Button
                  size="small"
                  icon={<StopOutlined />}
                  danger
                  onClick={() => sendControlCommand('cancel')}
                >
                  取消
                </Button>
              </>
            )}
            
            {computationStatus === 'paused' && (
              <Button
                size="small"
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => sendControlCommand('resume')}
              >
                继续
              </Button>
            )}
          </Space>
        )}

        {/* 状态提示 */}
        {isCompleted && (
          <Alert
            message="计算完成"
            description={`任务在 ${startTime && endTime ? formatDuration(endTime - startTime) : '未知时间'} 内完成`}
            type="success"
            showIcon
          />
        )}

        {isFailed && (
          <Alert
            message="计算失败"
            description={progress.message || '未知错误'}
            type="error"
            showIcon
          />
        )}
      </Space>
    </Card>
  );
};

export default RealtimeProgressMonitor;