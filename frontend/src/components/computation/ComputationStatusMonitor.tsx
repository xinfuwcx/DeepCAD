/**
 * 计算状态监控组件 - 2号几何专家与3号计算专家协调
 * 实时监控3号专家的深基坑计算系统状态
 * 集成WebGPU可视化和PyVista后处理结果
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, Progress, Typography, Row, Col, Tag, Alert, 
  Button, Space, Statistic, Timeline, Modal, Spin,
  Tabs, Table, Descriptions, Badge
} from 'antd';
import { 
  ThunderboltOutlined, PlayCircleOutlined, PauseCircleOutlined,
  StopOutlined, ReloadOutlined, EyeOutlined, DownloadOutlined,
  CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  FireOutlined, DashboardOutlined, BarChartOutlined,
  MonitorOutlined, DesktopOutlined as CpuOutlined, DatabaseOutlined
} from '@ant-design/icons';
import deepCADBackendService, { ComputationResult, ProjectConfiguration } from '../../services/DeepCADBackendService';
import { useDeepCADTheme } from '../ui/DeepCADTheme';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface ComputationStatusMonitorProps {
  projectId: string;
  autoStart?: boolean;
  onComputationComplete?: (result: ComputationResult) => void;
  onVisualizationUpdate?: (visualization: any) => void;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    geometry: boolean;
    computation: boolean;
    visualization: boolean;
    database: boolean;
  };
  performance: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

interface ComputationProgress {
  stage: string;
  progress: number;
  eta: number;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
}

const ComputationStatusMonitor: React.FC<ComputationStatusMonitorProps> = ({
  projectId,
  autoStart = false,
  onComputationComplete,
  onVisualizationUpdate
}) => {
  const { themeConfig } = useDeepCADTheme();
  const [computationStatus, setComputationStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState<ComputationProgress>({
    stage: '准备中',
    progress: 0,
    eta: 0,
    currentStep: '系统初始化',
    totalSteps: 5,
    completedSteps: 0
  });
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'healthy',
    services: { geometry: true, computation: true, visualization: true, database: true },
    performance: { responseTime: 0, memoryUsage: 0, cpuUsage: 0 }
  });
  const [computationResult, setComputationResult] = useState<ComputationResult | null>(null);
  const [computationId, setComputationId] = useState<string>('');
  const [logs, setLogs] = useState<Array<{ time: string; level: 'info' | 'warning' | 'error'; message: string }>>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  
  const healthCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number>(0);

  // 组件初始化
  useEffect(() => {
    initializeMonitoring();
    
    return () => {
      if (healthCheckInterval.current) {
        clearInterval(healthCheckInterval.current);
      }
      deepCADBackendService.off('computationProgress', handleComputationProgress);
      deepCADBackendService.off('computationComplete', handleComputationComplete);
      deepCADBackendService.off('visualizationUpdate', handleVisualizationUpdate);
      deepCADBackendService.off('error', handleError);
    };
  }, [projectId]);

  // 自动启动计算
  useEffect(() => {
    if (autoStart && computationStatus === 'idle') {
      handleStartComputation();
    }
  }, [autoStart]);

  // 初始化监控
  const initializeMonitoring = async () => {
    // 注册事件监听器
    deepCADBackendService.on('computationProgress', handleComputationProgress);
    deepCADBackendService.on('computationComplete', handleComputationComplete);
    deepCADBackendService.on('visualizationUpdate', handleVisualizationUpdate);
    deepCADBackendService.on('error', handleError);

    // 开始健康检查
    startHealthCheck();
    
    addLog('info', '🎯 2号几何专家监控系统已初始化');
    addLog('info', '🤝 已连接3号计算专家深基坑计算系统');
  };

  // 定期健康检查
  const startHealthCheck = () => {
    const checkHealth = async () => {
      try {
        const health = await deepCADBackendService.healthCheck();
        setSystemHealth(health);
        
        if (health.status !== 'healthy') {
          addLog('warning', `⚠️ 系统状态: ${health.status}`);
        }
      } catch (error) {
        setSystemHealth(prev => ({
          ...prev,
          status: 'unhealthy'
        }));
        addLog('error', '🚨 健康检查失败');
      }
    };

    checkHealth();
    healthCheckInterval.current = setInterval(checkHealth, 10000); // 每10秒检查一次
  };

  // 事件处理器
  const handleComputationProgress = (data: any) => {
    if (data.projectId === projectId) {
      setProgress({
        stage: data.stage,
        progress: data.progress,
        eta: data.eta,
        currentStep: data.currentStep || '计算中',
        totalSteps: data.totalSteps || 5,
        completedSteps: data.completedSteps || Math.floor(data.progress / 20)
      });
      
      addLog('info', `⚡ ${data.stage}: ${data.progress}% 完成`);
    }
  };

  const handleComputationComplete = (data: any) => {
    if (data.projectId === projectId) {
      setComputationStatus('completed');
      setComputationResult(data.result);
      setProgress(prev => ({ ...prev, progress: 100, stage: '计算完成' }));
      
      const duration = Date.now() - startTime.current;
      addLog('info', `🎉 计算完成！耗时: ${(duration / 1000).toFixed(2)}秒`);
      
      if (onComputationComplete) {
        onComputationComplete(data.result);
      }
    }
  };

  const handleVisualizationUpdate = (data: any) => {
    if (data.projectId === projectId && onVisualizationUpdate) {
      onVisualizationUpdate(data.visualization);
      addLog('info', '🎨 Three.js可视化数据已更新');
    }
  };

  const handleError = (data: any) => {
    if (data.projectId === projectId) {
      setComputationStatus('error');
      addLog('error', `🚨 计算错误: ${data.error}`);
    }
  };

  // 添加日志
  const addLog = (level: 'info' | 'warning' | 'error', message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-19), { time: timestamp, level, message }]);
  };

  // 启动计算
  const handleStartComputation = async () => {
    try {
      setComputationStatus('running');
      startTime.current = Date.now();
      setProgress({
        stage: '启动计算',
        progress: 0,
        eta: 0,
        currentStep: '准备计算环境',
        totalSteps: 5,
        completedSteps: 0
      });

      addLog('info', '🚀 启动3号专家深基坑计算系统');

      const analysisConfig = {
        analysisType: 'staged_construction' as const,
        timeSteps: 10,
        convergenceTolerance: 1e-6,
        maxIterations: 1000,
        solverType: 'iterative' as const
      };

      const result = await deepCADBackendService.startComputation(projectId, analysisConfig);
      setComputationId(result.computationId);
      
      addLog('info', `✅ 计算任务已提交 - ID: ${result.computationId}`);
    } catch (error) {
      setComputationStatus('error');
      addLog('error', `🚨 计算启动失败: ${error}`);
    }
  };

  // 暂停计算
  const handlePauseComputation = () => {
    addLog('warning', '⏸️ 计算暂停功能开发中');
  };

  // 停止计算
  const handleStopComputation = () => {
    setComputationStatus('idle');
    setProgress({
      stage: '已停止',
      progress: 0,
      eta: 0,
      currentStep: '计算已停止',
      totalSteps: 5,
      completedSteps: 0
    });
    addLog('warning', '⏹️ 计算已停止');
  };

  // 查看结果
  const handleViewResults = () => {
    if (computationResult) {
      setShowResultModal(true);
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return '#666';
      case 'running': return themeConfig.colors.primary;
      case 'completed': return themeConfig.colors.success;
      case 'error': return themeConfig.colors.error;
      default: return '#666';
    }
  };

  // 渲染系统状态卡片
  const renderSystemStatus = () => (
    <Card
      title={
        <Space>
          <MonitorOutlined />
          <span>3号计算专家系统状态</span>
        </Space>
      }
      size="small"
      style={{ marginBottom: '16px' }}
    >
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title="系统状态"
            value={systemHealth.status}
            valueStyle={{ 
              color: systemHealth.status === 'healthy' ? themeConfig.colors.success : 
                     systemHealth.status === 'degraded' ? themeConfig.colors.warning : 
                     themeConfig.colors.error 
            }}
            prefix={
              systemHealth.status === 'healthy' ? <CheckCircleOutlined /> :
              systemHealth.status === 'degraded' ? <ExclamationCircleOutlined /> :
              <FireOutlined />
            }
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="响应时间"
            value={systemHealth.performance.responseTime}
            suffix="ms"
            valueStyle={{ color: themeConfig.colors.info }}
            prefix={<DashboardOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="内存使用"
            value={systemHealth.performance.memoryUsage}
            suffix="MB"
            valueStyle={{ color: themeConfig.colors.warning }}
            prefix={<CpuOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="CPU使用率"
            value={systemHealth.performance.cpuUsage}
            suffix="%"
            valueStyle={{ color: themeConfig.colors.accent }}
            prefix={<BarChartOutlined />}
          />
        </Col>
      </Row>
      
      <div style={{ marginTop: '16px' }}>
        <Space>
          {Object.entries(systemHealth.services).map(([service, status]) => (
            <Tag
              key={service}
              color={status ? 'green' : 'red'}
              icon={status ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
            >
              {service}
            </Tag>
          ))}
        </Space>
      </div>
    </Card>
  );

  // 渲染计算进度
  const renderComputationProgress = () => (
    <Card
      title={
        <Space>
          <ThunderboltOutlined style={{ color: getStatusColor(computationStatus) }} />
          <span>深基坑计算进度</span>
          <Tag color={getStatusColor(computationStatus)}>
            {computationStatus === 'idle' ? '待命' :
             computationStatus === 'running' ? '计算中' :
             computationStatus === 'completed' ? '已完成' : '错误'}
          </Tag>
        </Space>
      }
      size="small"
      style={{ marginBottom: '16px' }}
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleStartComputation}
            disabled={computationStatus === 'running'}
            size="small"
          >
            启动
          </Button>
          <Button
            icon={<PauseCircleOutlined />}
            onClick={handlePauseComputation}
            disabled={computationStatus !== 'running'}
            size="small"
          >
            暂停
          </Button>
          <Button
            icon={<StopOutlined />}
            onClick={handleStopComputation}
            disabled={computationStatus === 'idle'}
            size="small"
          >
            停止
          </Button>
          {computationResult && (
            <Button
              type="primary"
              ghost
              icon={<EyeOutlined />}
              onClick={handleViewResults}
              size="small"
            >
              查看结果
            </Button>
          )}
        </Space>
      }
    >
      <div style={{ marginBottom: '16px' }}>
        <Text strong>{progress.stage}</Text>
        <br />
        <Text style={{ color: themeConfig.colors.text.secondary, fontSize: '12px' }}>
          当前步骤: {progress.currentStep} ({progress.completedSteps}/{progress.totalSteps})
        </Text>
      </div>
      
      <Progress
        percent={progress.progress}
        status={
          computationStatus === 'running' ? 'active' :
          computationStatus === 'error' ? 'exception' :
          computationStatus === 'completed' ? 'success' : 'normal'
        }
        strokeColor={{
          '0%': themeConfig.colors.primary,
          '100%': themeConfig.colors.success
        }}
      />
      
      {progress.eta > 0 && (
        <div style={{ marginTop: '8px', textAlign: 'right' }}>
          <Text style={{ fontSize: '12px', color: themeConfig.colors.text.secondary }}>
            预计剩余时间: {Math.floor(progress.eta / 60)}分{progress.eta % 60}秒
          </Text>
        </div>
      )}
    </Card>
  );

  // 渲染日志
  const renderLogs = () => (
    <Card
      title={
        <Space>
          <DatabaseOutlined />
          <span>实时日志</span>
        </Space>
      }
      size="small"
      bodyStyle={{ padding: '12px' }}
    >
      <div style={{ 
        height: '200px', 
        overflowY: 'auto',
        backgroundColor: '#000000dd',
        padding: '8px',
        borderRadius: '4px',
        fontFamily: 'Monaco, Consolas, monospace',
        fontSize: '12px'
      }}>
        {logs.map((log, index) => (
          <div key={index} style={{ 
            color: log.level === 'error' ? '#ff4d4f' : 
                   log.level === 'warning' ? '#faad14' : '#52c41a',
            marginBottom: '2px'
          }}>
            <span style={{ color: '#666' }}>[{log.time}]</span> {log.message}
          </div>
        ))}
      </div>
    </Card>
  );

  return (
    <div className="computation-status-monitor">
      {renderSystemStatus()}
      {renderComputationProgress()}
      {renderLogs()}

      {/* 计算结果模态框 */}
      <Modal
        title="🎉 深基坑计算结果 - 3号专家系统输出"
        open={showResultModal}
        onCancel={() => setShowResultModal(false)}
        width={800}
        footer={[
          <Button key="download" icon={<DownloadOutlined />}>
            下载报告
          </Button>,
          <Button key="close" type="primary" onClick={() => setShowResultModal(false)}>
            关闭
          </Button>
        ]}
      >
        {computationResult && (
          <Tabs defaultActiveKey="stress">
            <TabPane tab="应力分析" key="stress">
              <Descriptions size="small" bordered>
                <Descriptions.Item label="最大应力" span={2}>
                  {computationResult.results?.stress?.maxValue.toFixed(3)} {computationResult.results?.stress?.units}
                </Descriptions.Item>
                <Descriptions.Item label="最小应力">
                  {computationResult.results?.stress?.minValue.toFixed(3)} {computationResult.results?.stress?.units}
                </Descriptions.Item>
                <Descriptions.Item label="应力分布" span={3}>
                  <Badge status="processing" text="WebGPU应力云图渲染器已就绪" />
                </Descriptions.Item>
              </Descriptions>
            </TabPane>
            
            <TabPane tab="位移分析" key="displacement">
              <Descriptions size="small" bordered>
                <Descriptions.Item label="最大位移" span={2}>
                  {computationResult.results?.displacement?.maxValue.toFixed(3)} {computationResult.results?.displacement?.units}
                </Descriptions.Item>
                <Descriptions.Item label="最大位移位置">
                  [{computationResult.results?.displacement?.maxLocation?.join(', ')}]
                </Descriptions.Item>
                <Descriptions.Item label="变形动画" span={3}>
                  <Badge status="processing" text="GPU变形动画系统已准备" />
                </Descriptions.Item>
              </Descriptions>
            </TabPane>
            
            <TabPane tab="安全性评估" key="safety">
              <Descriptions size="small" bordered>
                <Descriptions.Item label="整体安全系数" span={2}>
                  <Badge 
                    status={computationResult.results?.safety?.overallFactor > 1.5 ? "success" : "warning"}
                    text={computationResult.results?.safety?.overallFactor.toFixed(2)}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="关键点数量">
                  {computationResult.results?.safety?.criticalPoints?.length || 0}
                </Descriptions.Item>
              </Descriptions>
            </TabPane>
            
            <TabPane tab="系统性能" key="performance">
              <Descriptions size="small" bordered>
                <Descriptions.Item label="计算时间">
                  {computationResult.metadata?.computationTime.toFixed(2)}s
                </Descriptions.Item>
                <Descriptions.Item label="内存使用">
                  {computationResult.metadata?.memoryUsage.toFixed(1)}MB
                </Descriptions.Item>
                <Descriptions.Item label="求解器迭代">
                  {computationResult.metadata?.solverIterations}次
                </Descriptions.Item>
                <Descriptions.Item label="收敛状态" span={2}>
                  <Badge 
                    status={computationResult.metadata?.convergence ? "success" : "error"}
                    text={computationResult.metadata?.convergence ? "已收敛" : "未收敛"}
                  />
                </Descriptions.Item>
              </Descriptions>
            </TabPane>
          </Tabs>
        )}
      </Modal>
    </div>
  );
};

export default ComputationStatusMonitor;