#!/usr/bin/env typescript
/**
 * DeepCAD工作流监控面板
 * 3号计算专家 - Week4界面集成
 * 
 * 实时工作流监控：
 * - 四大架构处理流程可视化
 * - 实时性能指标展示
 * - 数据流转状态监控
 * - 异常报警和处理
 */

import React, { useState, useEffect } from 'react';
import { Card, Steps, Progress, Row, Col, Statistic, Alert, Button, Space, Typography, Timeline, Tag, Tooltip } from 'antd';
import { 
  PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, 
  ApiOutlined, BarChartOutlined, ThunderboltOutlined, RobotOutlined,
  CheckCircleOutlined, LoadingOutlined, ExclamationCircleOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { Line, Area } from '@ant-design/plots';
import { useUnifiedArchitectureIntegration } from '../../hooks/useUnifiedArchitectureIntegration';

const { Title, Text } = Typography;
const { Step } = Steps;

interface WorkflowStep {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'wait' | 'process' | 'finish' | 'error';
}

export const WorkflowMonitoringPanel: React.FC = () => {
  const {
    workflowState,
    isProcessing,
    systemMetrics,
    iotData,
    pdeResults,
    romResults,
    aiResults,
    startWorkflow,
    stopWorkflow,
    resetWorkflow,
    getSystemStatus,
    getLatestResults
  } = useUnifiedArchitectureIntegration();

  // 工作流步骤定义
  const workflowSteps: WorkflowStep[] = [
    {
      key: 'iot',
      title: 'IoT数据融合',
      description: '1000+传感器实时数据收集与预处理',
      icon: <ApiOutlined />,
      status: getStepStatus('iot')
    },
    {
      key: 'pde',
      title: 'PDE约束优化',
      description: 'Kratos伴随方法梯度计算优化',
      icon: <BarChartOutlined />,
      status: getStepStatus('pde')
    },
    {
      key: 'rom',
      title: 'ROM降阶模型',
      description: 'POD/DMD算法100-1000x加速',
      icon: <ThunderboltOutlined />,
      status: getStepStatus('rom')
    },
    {
      key: 'ai',
      title: 'AI智能预测',
      description: 'PINN+DeepONet+GNN混合预测',
      icon: <RobotOutlined />,
      status: getStepStatus('ai')
    }
  ];

  // 实时性能数据
  const [performanceHistory, setPerformanceHistory] = useState<{
    time: string;
    iot: number;
    pde: number;
    rom: number;
    ai: number;
  }[]>([]);

  // 获取步骤状态
  function getStepStatus(stepKey: string): 'wait' | 'process' | 'finish' | 'error' {
    if (workflowState.errors.length > 0 && workflowState.currentStage === stepKey) {
      return 'error';
    }
    
    if (workflowState.currentStage === stepKey && isProcessing) {
      return 'process';
    }
    
    const stepOrder = ['iot', 'pde', 'rom', 'ai'];
    const currentIndex = stepOrder.indexOf(workflowState.currentStage);
    const stepIndex = stepOrder.indexOf(stepKey);
    
    if (workflowState.currentStage === 'complete' || stepIndex < currentIndex) {
      return 'finish';
    }
    
    return 'wait';
  }

  // 更新性能历史数据
  useEffect(() => {
    if (systemMetrics.length > 0) {
      const now = new Date().toLocaleTimeString();
      const newDataPoint = {
        time: now,
        iot: getSystemStatus('iot-fusion')?.performance || 0,
        pde: getSystemStatus('pde-optimization')?.performance || 0,
        rom: getSystemStatus('rom-processing')?.performance || 0,
        ai: getSystemStatus('ai-prediction')?.performance || 0
      };

      setPerformanceHistory(prev => {
        const updated = [...prev, newDataPoint];
        // 保持最近50个数据点
        return updated.slice(-50);
      });
    }
  }, [systemMetrics, getSystemStatus]);

  // 性能图表配置
  const performanceChartConfig = {
    data: performanceHistory,
    xField: 'time',
    yField: 'value',
    seriesField: 'category',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
    point: {
      size: 3,
      shape: 'circle',
    },
    line: {
      size: 2,
    },
    yAxis: {
      max: 100,
      min: 0,
    },
    legend: {
      position: 'top' as const,
    },
    tooltip: {
      formatter: (datum: any) => {
        return { name: datum.category, value: `${datum.value}%` };
      },
    }
  };

  // 转换数据格式用于图表
  const chartData = performanceHistory.flatMap(point => [
    { time: point.time, value: point.iot, category: 'IoT数据融合' },
    { time: point.time, value: point.pde, category: 'PDE优化' },
    { time: point.time, value: point.rom, category: 'ROM降阶' },
    { time: point.time, value: point.ai, category: 'AI预测' }
  ]);

  // 获取最新结果统计
  const { latestIoT, latestPDE, latestROM, latestAI } = getLatestResults();

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3} style={{ marginBottom: '24px' }}>
        <LoadingOutlined spin={isProcessing} style={{ marginRight: '8px', color: '#1890ff' }} />
        四大技术架构工作流监控
      </Title>

      {/* 控制面板 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="middle">
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />}
                onClick={startWorkflow}
                disabled={isProcessing}
                size="large"
              >
                启动工作流
              </Button>
              <Button 
                icon={<PauseCircleOutlined />}
                onClick={stopWorkflow}
                disabled={!isProcessing}
                size="large"
              >
                停止处理
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={resetWorkflow}
                disabled={isProcessing}
                size="large"
              >
                重置状态
              </Button>
            </Space>
          </Col>
          <Col>
            <Space size="large">
              <div>
                <Text type="secondary">当前阶段:</Text>
                <Tag color="blue" style={{ marginLeft: '8px' }}>
                  {workflowState.currentStage.toUpperCase()}
                </Tag>
              </div>
              <div>
                <Text type="secondary">总体进度:</Text>
                <Text strong style={{ marginLeft: '8px' }}>{workflowState.progress}%</Text>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 错误和警告信息 */}
      {workflowState.errors.length > 0 && (
        <Alert
          message="处理错误"
          description={workflowState.errors.join('; ')}
          type="error"
          closable
          style={{ marginBottom: '16px' }}
        />
      )}

      {workflowState.warnings.length > 0 && (
        <Alert
          message="处理警告"
          description={workflowState.warnings.join('; ')}
          type="warning"
          closable
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 工作流步骤可视化 */}
      <Card title="工作流处理步骤" style={{ marginBottom: '16px' }}>
        <Steps 
          current={['iot', 'pde', 'rom', 'ai'].indexOf(workflowState.currentStage)}
          status={workflowState.errors.length > 0 ? 'error' : 'process'}
        >
          {workflowSteps.map(step => (
            <Step
              key={step.key}
              title={step.title}
              description={step.description}
              icon={step.icon}
              status={step.status}
            />
          ))}
        </Steps>
        
        <div style={{ marginTop: '16px' }}>
          <Progress 
            percent={workflowState.progress} 
            status={isProcessing ? 'active' : 'normal'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
        </div>
      </Card>

      {/* 实时性能监控 */}
      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card title="系统性能实时监控" style={{ height: '400px' }}>
            {chartData.length > 0 ? (
              <Line {...performanceChartConfig} data={chartData} />
            ) : (
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text type="secondary">等待性能数据...</Text>
              </div>
            )}
          </Card>
        </Col>
        
        <Col span={8}>
          <Card title="系统状态概览" style={{ height: '400px' }}>
            <div style={{ height: '350px', overflowY: 'auto' }}>
              {systemMetrics.map(metric => (
                <Card 
                  key={metric.systemId}
                  size="small" 
                  style={{ marginBottom: '8px' }}
                  bodyStyle={{ padding: '12px' }}
                >
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Text strong>{metric.systemId.replace('-', ' ').toUpperCase()}</Text>
                    </Col>
                    <Col>
                      <Tag color={
                        metric.status === 'active' ? 'green' :
                        metric.status === 'error' ? 'red' :
                        metric.status === 'maintenance' ? 'orange' : 'default'
                      }>
                        {metric.status}
                      </Tag>
                    </Col>
                  </Row>
                  
                  <Row gutter={8} style={{ marginTop: '8px' }}>
                    <Col span={12}>
                      <Statistic
                        title="CPU"
                        value={metric.resourceUsage.cpu}
                        precision={0}
                        suffix="%"
                        valueStyle={{ fontSize: '12px' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="GPU"
                        value={metric.resourceUsage.gpu}
                        precision={0}
                        suffix="%"
                        valueStyle={{ fontSize: '12px' }}
                      />
                    </Col>
                  </Row>
                  
                  <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '4px' }}>
                    延迟: {metric.latency.toFixed(0)}ms | 吞吐: {metric.throughput.toFixed(0)}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 处理结果统计 */}
      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="IoT数据点"
              value={iotData.length}
              prefix={<ApiOutlined style={{ color: '#1890ff' }} />}
              suffix="个"
            />
            {latestIoT && (
              <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '4px' }}>
                最新质量: {(latestIoT.quality * 100).toFixed(1)}%
              </div>
            )}
          </Card>
        </Col>
        
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="PDE优化轮次"
              value={pdeResults.length}
              prefix={<BarChartOutlined style={{ color: '#52c41a' }} />}
              suffix="次"
            />
            {latestPDE && (
              <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '4px' }}>
                收敛率: {latestPDE.convergenceStatus === 'converged' ? '已收敛' : '进行中'}
              </div>
            )}
          </Card>
        </Col>
        
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="ROM压缩比"
              value={latestROM?.compressionRatio || 0}
              prefix={<ThunderboltOutlined style={{ color: '#faad14' }} />}
              suffix="x"
            />
            {latestROM && (
              <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '4px' }}>
                精度保持: {(latestROM.accuracyMetrics.energyRetention * 100).toFixed(2)}%
              </div>
            )}
          </Card>
        </Col>
        
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="AI预测精度"
              value={latestAI?.predictionAccuracy || 0}
              precision={1}
              prefix={<RobotOutlined style={{ color: '#f5222d' }} />}
              suffix="%"
            />
            {latestAI && (
              <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '4px' }}>
                物理约束: {(latestAI.physicsConsistency * 100).toFixed(2)}%
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 时间轴日志 */}
      <Card title="处理日志" style={{ marginTop: '16px' }}>
        <Timeline mode="left" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {workflowState.currentStage !== 'iot' && (
            <Timeline.Item 
              color="green" 
              dot={<CheckCircleOutlined />}
            >
              IoT数据融合阶段完成 - 收集 {iotData.length} 个数据点
            </Timeline.Item>
          )}
          {(['pde', 'rom', 'ai', 'complete'].includes(workflowState.currentStage)) && (
            <Timeline.Item 
              color="green" 
              dot={<CheckCircleOutlined />}
            >
              PDE约束优化完成 - {pdeResults.length} 次优化迭代
            </Timeline.Item>
          )}
          {(['rom', 'ai', 'complete'].includes(workflowState.currentStage)) && (
            <Timeline.Item 
              color="green" 
              dot={<CheckCircleOutlined />}
            >
              ROM降阶处理完成 - 压缩比 {latestROM?.compressionRatio || 0}x
            </Timeline.Item>
          )}
          {workflowState.currentStage === 'complete' && (
            <Timeline.Item 
              color="green" 
              dot={<CheckCircleOutlined />}
            >
              AI智能预测完成 - 精度 {latestAI?.predictionAccuracy.toFixed(1) || 0}%
            </Timeline.Item>
          )}
          {isProcessing && (
            <Timeline.Item 
              color="blue" 
              dot={<LoadingOutlined />}
            >
              正在执行 {workflowState.currentStage.toUpperCase()} 阶段... ({workflowState.progress}%)
            </Timeline.Item>
          )}
          {workflowState.errors.map((error, index) => (
            <Timeline.Item 
              key={index}
              color="red" 
              dot={<ExclamationCircleOutlined />}
            >
              错误: {error}
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>
    </div>
  );
};

export default WorkflowMonitoringPanel;