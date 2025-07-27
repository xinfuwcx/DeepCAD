import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Alert,
  Progress,
  Descriptions,
  Tag,
  Typography,
  Timeline,
  Statistic,
  Row,
  Col,
  Divider,
  Badge,
  Tooltip,
  Modal,
  Table,
  notification
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  EyeOutlined,
  DownloadOutlined,
  BarChartOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

// Terra分析状态
enum TerraStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

// 分析阶段信息
interface AnalysisStage {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  messages: string[];
}

// Terra求解器状态
interface TerraSolverState {
  status: TerraStatus;
  projectName: string;
  analysisType: string;
  currentStage: string;
  overallProgress: number;
  stageProgress: number;
  stages: AnalysisStage[];
  statistics: {
    totalNodes: number;
    totalElements: number;
    maxDisplacement: number;
    maxStress: number;
    iterations: number;
    computeTime: number;
  };
  outputFiles: string[];
  errors: string[];
  warnings: string[];
}

interface TerraSolverControlPanelProps {
  solverState?: TerraSolverState;
  onStart?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  onViewResults?: (file: string) => void;
  onDownloadResults?: (file: string) => void;
}

const TerraSolverControlPanel: React.FC<TerraSolverControlPanelProps> = ({
  solverState,
  onStart,
  onPause,
  onStop,
  onReset,
  onViewResults,
  onDownloadResults
}) => {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedStage, setSelectedStage] = useState<AnalysisStage | null>(null);

  // 默认状态
  const defaultState: TerraSolverState = {
    status: TerraStatus.IDLE,
    projectName: '未命名项目',
    analysisType: '基坑开挖分析',
    currentStage: '就绪',
    overallProgress: 0,
    stageProgress: 0,
    stages: [],
    statistics: {
      totalNodes: 0,
      totalElements: 0,
      maxDisplacement: 0,
      maxStress: 0,
      iterations: 0,
      computeTime: 0
    },
    outputFiles: [],
    errors: [],
    warnings: []
  };

  const state = solverState || defaultState;

  // 状态配置
  const statusConfig = {
    [TerraStatus.IDLE]: {
      color: 'default',
      text: '就绪',
      icon: <ClockCircleOutlined />,
      description: '等待开始分析'
    },
    [TerraStatus.INITIALIZING]: {
      color: 'processing',
      text: '初始化',
      icon: <ReloadOutlined spin />,
      description: '正在初始化分析参数'
    },
    [TerraStatus.RUNNING]: {
      color: 'processing',
      text: '运行中',
      icon: <ThunderboltOutlined />,
      description: '分析计算进行中'
    },
    [TerraStatus.PAUSED]: {
      color: 'warning',
      text: '已暂停',
      icon: <PauseCircleOutlined />,
      description: '分析已暂停，可以恢复'
    },
    [TerraStatus.COMPLETED]: {
      color: 'success',
      text: '已完成',
      icon: <CheckCircleOutlined />,
      description: '分析成功完成'
    },
    [TerraStatus.ERROR]: {
      color: 'error',
      text: '错误',
      icon: <ExclamationCircleOutlined />,
      description: '分析过程中发生错误'
    },
    [TerraStatus.CANCELLED]: {
      color: 'default',
      text: '已取消',
      icon: <StopOutlined />,
      description: '分析被用户取消'
    }
  };

  const currentStatusConfig = statusConfig[state.status];

  // 控制按钮状态
  const getControlButtons = () => {
    const buttons = [];

    switch (state.status) {
      case TerraStatus.IDLE:
      case TerraStatus.CANCELLED:
      case TerraStatus.ERROR:
        buttons.push(
          <Button
            key="start"
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={onStart}
            size="large"
          >
            开始分析
          </Button>
        );
        break;

      case TerraStatus.RUNNING:
        buttons.push(
          <Button
            key="pause"
            icon={<PauseCircleOutlined />}
            onClick={onPause}
            size="large"
          >
            暂停
          </Button>,
          <Button
            key="stop"
            danger
            icon={<StopOutlined />}
            onClick={onStop}
            size="large"
          >
            停止
          </Button>
        );
        break;

      case TerraStatus.PAUSED:
        buttons.push(
          <Button
            key="resume"
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={onStart}
            size="large"
          >
            恢复
          </Button>,
          <Button
            key="stop"
            danger
            icon={<StopOutlined />}
            onClick={onStop}
            size="large"
          >
            停止
          </Button>
        );
        break;

      case TerraStatus.COMPLETED:
        buttons.push(
          <Button
            key="reset"
            icon={<ReloadOutlined />}
            onClick={onReset}
            size="large"
          >
            重新分析
          </Button>
        );
        break;
    }

    return buttons;
  };

  // 阶段时间线
  const renderStageTimeline = () => {
    if (state.stages.length === 0) return null;

    return (
      <Timeline mode="left">
        {state.stages.map((stage, index) => {
          let color = 'gray';
          let icon = <ClockCircleOutlined />;

          switch (stage.status) {
            case 'running':
              color = 'blue';
              icon = <ThunderboltOutlined />;
              break;
            case 'completed':
              color = 'green';
              icon = <CheckCircleOutlined />;
              break;
            case 'error':
              color = 'red';
              icon = <ExclamationCircleOutlined />;
              break;
          }

          return (
            <Timeline.Item
              key={stage.id}
              color={color}
              dot={icon}
            >
              <div>
                <div style={{ fontWeight: 'bold' }}>{stage.name}</div>
                <div style={{ color: '#666', fontSize: '12px' }}>{stage.description}</div>
                {stage.status === 'running' && (
                  <Progress
                    percent={stage.progress}
                    size="small"
                    style={{ marginTop: 4, width: 200 }}
                  />
                )}
                {stage.duration && (
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    耗时: {(stage.duration / 1000).toFixed(1)}s
                  </Text>
                )}
              </div>
            </Timeline.Item>
          );
        })}
      </Timeline>
    );
  };

  // 结果文件表格
  const resultColumns = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeConfig = {
          vtk: { color: 'blue', text: 'VTK网格' },
          json: { color: 'green', text: 'JSON数据' },
          txt: { color: 'orange', text: '文本报告' }
        };
        const config = typeConfig[type as keyof typeof typeConfig] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => `${(size / 1024 / 1024).toFixed(2)} MB`
    },
    {
      title: '操作',
      key: 'action',
      render: (record: any) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onViewResults?.(record.path)}
          >
            查看
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => onDownloadResults?.(record.path)}
          >
            下载
          </Button>
        </Space>
      )
    }
  ];

  // 模拟结果文件数据
  const resultFiles = state.outputFiles.map((file, index) => ({
    key: index,
    name: file.split('/').pop(),
    type: file.split('.').pop(),
    size: Math.random() * 10 * 1024 * 1024, // 模拟文件大小
    path: file
  }));

  return (
    <Card
      title={
        <Space>
          <ThunderboltOutlined style={{ color: '#00d9ff' }} />
          <span>Terra求解器控制</span>
          <Tag color="#00d9ff">3号模块</Tag>
        </Space>
      }
      extra={
        <Space>
          <Badge
            status={currentStatusConfig.color as any}
            text={currentStatusConfig.text}
          />
          <Tooltip title="查看详细信息">
            <Button
              icon={<BarChartOutlined />}
              onClick={() => setDetailsVisible(true)}
            >
              详情
            </Button>
          </Tooltip>
        </Space>
      }
      style={{ height: '100%' }}
    >
      {/* 状态概览 */}
      <Alert
        message={
          <Space>
            {currentStatusConfig.icon}
            <Text strong>{state.projectName}</Text>
            <Text type="secondary">- {state.analysisType}</Text>
          </Space>
        }
        description={currentStatusConfig.description}
        type={currentStatusConfig.color === 'error' ? 'error' : 
              currentStatusConfig.color === 'warning' ? 'warning' : 'info'}
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* 进度显示 */}
      {(state.status === TerraStatus.RUNNING || state.status === TerraStatus.INITIALIZING) && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <div>
              <Text strong>总体进度</Text>
              <Progress percent={state.overallProgress} status="active" />
            </div>
            <div>
              <Text strong>当前阶段: {state.currentStage}</Text>
              <Progress
                percent={state.stageProgress}
                size="small"
                showInfo={false}
              />
            </div>
          </Space>
        </Card>
      )}

      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Statistic
            title="节点数"
            value={state.statistics.totalNodes}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="单元数"
            value={state.statistics.totalElements}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="最大位移"
            value={state.statistics.maxDisplacement}
            precision={4}
            suffix="m"
            valueStyle={{ color: '#722ed1' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="计算时间"
            value={state.statistics.computeTime}
            precision={1}
            suffix="s"
            valueStyle={{ color: '#fa541c' }}
          />
        </Col>
      </Row>

      {/* 控制按钮 */}
      <Space style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}>
        {getControlButtons()}
      </Space>

      {/* 错误和警告 */}
      {state.errors.length > 0 && (
        <Alert
          message="错误信息"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {state.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          }
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {state.warnings.length > 0 && (
        <Alert
          message="警告信息"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {state.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 结果文件 */}
      {state.status === TerraStatus.COMPLETED && resultFiles.length > 0 && (
        <Card size="small" title="分析结果" style={{ marginBottom: 16 }}>
          <Table
            dataSource={resultFiles}
            columns={resultColumns}
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {/* 阶段时间线 */}
      {state.stages.length > 0 && (
        <Card size="small" title="分析阶段" style={{ marginBottom: 16 }}>
          {renderStageTimeline()}
        </Card>
      )}

      {/* 详细信息模态框 */}
      <Modal
        title="Terra求解器详细信息"
        visible={detailsVisible}
        onCancel={() => setDetailsVisible(false)}
        footer={null}
        width={800}
      >
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="项目名称">{state.projectName}</Descriptions.Item>
          <Descriptions.Item label="分析类型">{state.analysisType}</Descriptions.Item>
          <Descriptions.Item label="当前状态">
            <Badge status={currentStatusConfig.color as any} text={currentStatusConfig.text} />
          </Descriptions.Item>
          <Descriptions.Item label="当前阶段">{state.currentStage}</Descriptions.Item>
          <Descriptions.Item label="总体进度">{state.overallProgress}%</Descriptions.Item>
          <Descriptions.Item label="阶段进度">{state.stageProgress}%</Descriptions.Item>
          <Descriptions.Item label="迭代次数">{state.statistics.iterations}</Descriptions.Item>
          <Descriptions.Item label="最大应力">{state.statistics.maxStress} kPa</Descriptions.Item>
        </Descriptions>

        <Divider>阶段详情</Divider>
        {renderStageTimeline()}
      </Modal>
    </Card>
  );
};

export default TerraSolverControlPanel;