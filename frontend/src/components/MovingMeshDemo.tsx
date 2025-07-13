/**
 * Moving-Mesh Demo Component
 * 动网格技术演示组件，展示实时网格更新效果
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Progress, Alert, Space, Tag, Typography, Row, Col, Switch, Select } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  StopOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  SettingOutlined
} from '@ant-design/icons';
import * as THREE from 'three';
import useMovingMesh from '../hooks/useMovingMesh';

const { Title, Text } = Typography;
const { Option } = Select;

interface MovingMeshDemoProps {
  meshId?: string;
  geometry?: THREE.BufferGeometry;
  visible?: boolean;
}

const MovingMeshDemo: React.FC<MovingMeshDemoProps> = ({
  meshId = 'demo_mesh_001',
  geometry,
  visible = true
}) => {
  const [clientId] = useState(() => `client_${Date.now()}`);
  const [config, setConfig] = useState({
    strategy: 'laplacian' as const,
    driving_source: 'excavation' as const,
    quality_threshold: 0.3,
    real_time_rendering: true,
    update_frequency: 'every_step' as const
  });

  const {
    isConnected,
    status,
    progress,
    currentStage,
    lastUpdate,
    nodesUpdated,
    error,
    startMovingMesh,
    pauseAnalysis,
    resumeAnalysis,
    stopAnalysis,
    isActive,
    isPaused,
    isCompleted,
    hasError
  } = useMovingMesh(meshId, geometry);

  // 状态颜色映射
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'green';
      case 'running': case 'active': return 'blue';
      case 'paused': return 'orange';
      case 'completed': return 'purple';
      case 'error': return 'red';
      default: return 'default';
    }
  };

  // 启动分析
  const handleStart = async () => {
    try {
      await startMovingMesh(config, clientId);
    } catch (error) {
      console.error('Failed to start analysis:', error);
    }
  };

  // 配置更新处理
  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (!visible) {
    return null;
  }

  return (
    <Card
      title={
        <Space>
          <ThunderboltOutlined />
          <span>Moving-Mesh 动网格技术</span>
          <Tag color={getStatusColor(status)}>{status}</Tag>
        </Space>
      }
      extra={
        <Space>
          <Tag color={isConnected ? 'green' : 'red'}>
            {isConnected ? '🔗 已连接' : '❌ 未连接'}
          </Tag>
        </Space>
      }
      className="my-4"
    >
      {/* 错误提示 */}
      {hasError && (
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
      )}

      {/* 配置面板 */}
      <Card type="inner" title="配置参数" size="small" className="mb-4">
        <Row gutter={16}>
          <Col span={12}>
            <Text>网格移动策略：</Text>
            <Select
              value={config.strategy}
              onChange={(value) => handleConfigChange('strategy', value)}
              className="w-full mt-1"
              disabled={isActive}
            >
              <Option value="laplacian">拉普拉斯平滑</Option>
              <Option value="ale_formulation">ALE公式</Option>
              <Option value="remesh_adaptive">自适应重网格</Option>
            </Select>
          </Col>
          <Col span={12}>
            <Text>变形驱动源：</Text>
            <Select
              value={config.driving_source}
              onChange={(value) => handleConfigChange('driving_source', value)}
              className="w-full mt-1"
              disabled={isActive}
            >
              <Option value="excavation">开挖边界</Option>
              <Option value="support_displacement">支护位移</Option>
              <Option value="soil_settlement">土体沉降</Option>
              <Option value="combined">组合驱动</Option>
            </Select>
          </Col>
        </Row>
        <Row gutter={16} className="mt-3">
          <Col span={12}>
            <Text>实时渲染：</Text>
            <Switch
              checked={config.real_time_rendering}
              onChange={(checked) => handleConfigChange('real_time_rendering', checked)}
              style={{ marginLeft: 8 }}
              disabled={isActive}
            />
          </Col>
          <Col span={12}>
            <Text>更新频率：</Text>
            <Select
              value={config.update_frequency}
              onChange={(value) => handleConfigChange('update_frequency', value)}
              className="w-full mt-1"
              disabled={isActive}
            >
              <Option value="every_step">每时间步</Option>
              <Option value="every_5_steps">每5步</Option>
              <Option value="every_10_steps">每10步</Option>
              <Option value="on_demand">按需更新</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 控制按钮 */}
      <Space className="mb-4">
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleStart}
          disabled={isActive || !isConnected}
          loading={status === 'starting'}
        >
          启动分析
        </Button>
        
        <Button
          icon={<PauseCircleOutlined />}
          onClick={isPaused ? resumeAnalysis : pauseAnalysis}
          disabled={!isActive}
        >
          {isPaused ? '恢复' : '暂停'}
        </Button>
        
        <Button
          danger
          icon={<StopOutlined />}
          onClick={stopAnalysis}
          disabled={!isActive && !isPaused}
        >
          停止
        </Button>
      </Space>

      {/* 进度显示 */}
      {(isActive || isPaused || isCompleted) && (
        <div className="mb-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text>分析进度</Text>
            <Text>{Math.round(progress)}%</Text>
          </div>
          <Progress
            percent={Math.round(progress)}
            status={hasError ? 'exception' : isPaused ? 'normal' : 'active'}
            strokeColor={{
              '0%': '#1890ff',
              '50%': '#52c41a',
              '100%': '#722ed1',
            }}
          />
          {currentStage && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              当前阶段: {currentStage}
            </Text>
          )}
        </div>
      )}

      {/* 统计信息 */}
      <Row gutter={16}>
        <Col span={8}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <Title level={4} style={{ margin: 0 }}>{nodesUpdated}</Title>
              <Text type="secondary">节点更新数</Text>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <Title level={4} style={{ margin: 0 }}>
                {meshId.split('_').pop()}
              </Title>
              <Text type="secondary">网格ID</Text>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <Title level={4} style={{ margin: 0 }}>
                {lastUpdate > 0 ? new Date(lastUpdate).toLocaleTimeString() : '--'}
              </Title>
              <Text type="secondary">最后更新</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 技术说明 */}
      <Alert
        message="Moving-Mesh 技术特点"
        description={
          <div style={{ fontSize: 12 }}>
            • <strong>动态适应</strong>: 网格随变形实时更新，保持计算精度<br/>
            • <strong>WebSocket流式传输</strong>: 实时推送网格节点位置更新<br/>
            • <strong>Three.js BufferGeometry</strong>: 高效的GPU加速几何更新<br/>
            • <strong>ALE公式</strong>: 适用于大变形分析，避免网格扭曲
          </div>
        }
        type="info"
        showIcon
        style={{ marginTop: 16 }}
      />
    </Card>
  );
};

export default MovingMeshDemo;