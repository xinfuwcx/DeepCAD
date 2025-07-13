import React, { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Card,
  Row,
  Col,
  Button,
  Space,
  Slider,
  Select,
  Switch,
  Divider,
  Typography,
  List,
  Progress,
  Tag,
  Alert,
  Tooltip
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  CameraOutlined,
  RotateLeftOutlined,
  ZoomInOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { AnimationManager, Animation } from './AnimationManager';
import { TransitionManager } from './TransitionManager';

const { TabPane } = Tabs;
const { Text, Title } = Typography;
const { Option } = Select;

interface AnimationPanelProps {
  animationManager: AnimationManager;
  transitionManager: TransitionManager;
  visible?: boolean;
  onClose?: () => void;
}

export const AnimationPanel: React.FC<AnimationPanelProps> = ({
  animationManager,
  transitionManager,
  visible = false,
  onClose
}) => {
  const [activeAnimations, setActiveAnimations] = useState<any[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('smooth');
  const [orbitSettings, setOrbitSettings] = useState({
    radius: 10,
    duration: 5000,
    axis: 'y' as 'x' | 'y' | 'z'
  });

  // 更新活跃动画列表
  useEffect(() => {
    const interval = setInterval(() => {
      const animations = animationManager.getAnimationInfo();
      setActiveAnimations(animations);
    }, 100);

    return () => clearInterval(interval);
  }, [animationManager]);

  // 视角预设
  const viewPresets = [
    { key: 'front', label: '前视图', icon: <CameraOutlined /> },
    { key: 'back', label: '后视图', icon: <CameraOutlined /> },
    { key: 'left', label: '左视图', icon: <CameraOutlined /> },
    { key: 'right', label: '右视图', icon: <CameraOutlined /> },
    { key: 'top', label: '顶视图', icon: <CameraOutlined /> },
    { key: 'bottom', label: '底视图', icon: <CameraOutlined /> },
    { key: 'isometric', label: '等轴视图', icon: <CameraOutlined /> }
  ];

  // 动画预设
  const animationPresets = [
    { key: 'quick', label: '快速 (300ms)', duration: 300 },
    { key: 'smooth', label: '平滑 (800ms)', duration: 800 },
    { key: 'cinematic', label: '电影 (1500ms)', duration: 1500 },
    { key: 'bounce', label: '弹跳效果', duration: 1000 }
  ];

  // 切换视角
  const handleViewChange = async (viewKey: string) => {
    try {
      await transitionManager.transitionToView(viewKey);
    } catch (error) {
      console.error('视角切换失败:', error);
    }
  };

  // 适配视口
  const handleFitToScreen = async () => {
    try {
      await transitionManager.fitToScreen();
    } catch (error) {
      console.error('适配视口失败:', error);
    }
  };

  // 环绕动画
  const handleOrbitAnimation = async () => {
    try {
      await transitionManager.orbitAroundTarget(
        undefined,
        orbitSettings.radius,
        orbitSettings.duration,
        orbitSettings.axis
      );
    } catch (error) {
      console.error('环绕动画失败:', error);
    }
  };

  // 停止动画
  const handleStopAnimation = (animationId: string) => {
    animationManager.stopAnimation(animationId);
  };

  // 停止所有动画
  const handleStopAllAnimations = () => {
    animationManager.stopAllAnimations();
  };

  // 暂停/恢复所有动画
  const handleToggleAllAnimations = () => {
    const hasActive = activeAnimations.some(anim => anim.isPlaying);
    if (hasActive) {
      animationManager.pauseAllAnimations();
    } else {
      animationManager.resumeAllAnimations();
    }
  };

  // 渲染视角控制
  const renderViewControls = () => (
    <Card title="视角控制" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong>预设视角:</Text>
          <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
            {viewPresets.map(preset => (
              <Col span={8} key={preset.key}>
                <Button
                  size="small"
                  icon={preset.icon}
                  onClick={() => handleViewChange(preset.key)}
                  block
                >
                  {preset.label}
                </Button>
              </Col>
            ))}
          </Row>
        </div>

        <Divider />

        <div>
          <Text strong>快捷操作:</Text>
          <Space style={{ marginTop: 8 }}>
            <Button
              size="small"
              icon={<ZoomInOutlined />}
              onClick={handleFitToScreen}
            >
              适配视口
            </Button>
            <Button
              size="small"
              icon={<RotateLeftOutlined />}
              onClick={() => handleViewChange('isometric')}
            >
              重置视角
            </Button>
          </Space>
        </div>

        <Divider />

        <div>
          <Text strong>动画预设:</Text>
          <Select
            value={selectedPreset}
            onChange={setSelectedPreset}
            style={{ width: '100%', marginTop: 8 }}
          >
            {animationPresets.map(preset => (
              <Option key={preset.key} value={preset.key}>
                {preset.label}
              </Option>
            ))}
          </Select>
        </div>
      </Space>
    </Card>
  );

  // 渲染相机动画控制
  const renderCameraAnimations = () => (
    <Card title="相机动画" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong>环绕动画:</Text>
          
          <div style={{ marginTop: 8 }}>
            <Text>半径: {orbitSettings.radius}</Text>
            <Slider
              min={5}
              max={50}
              value={orbitSettings.radius}
              onChange={(radius) => setOrbitSettings(prev => ({ ...prev, radius }))}
            />
          </div>

          <div>
            <Text>持续时间: {orbitSettings.duration}ms</Text>
            <Slider
              min={1000}
              max={10000}
              step={500}
              value={orbitSettings.duration}
              onChange={(duration) => setOrbitSettings(prev => ({ ...prev, duration }))}
            />
          </div>

          <div>
            <Text>旋转轴: </Text>
            <Select
              value={orbitSettings.axis}
              onChange={(axis) => setOrbitSettings(prev => ({ ...prev, axis }))}
              style={{ width: 80, marginLeft: 8 }}
            >
              <Option value="x">X轴</Option>
              <Option value="y">Y轴</Option>
              <Option value="z">Z轴</Option>
            </Select>
          </div>

          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleOrbitAnimation}
            style={{ marginTop: 8 }}
            block
          >
            开始环绕
          </Button>
        </div>
      </Space>
    </Card>
  );

  // 渲染活跃动画列表
  const renderActiveAnimations = () => (
    <Card 
      title={
        <Space>
          <span>活跃动画</span>
          <Tag color={activeAnimations.length > 0 ? 'green' : 'default'}>
            {activeAnimations.length} 个
          </Tag>
        </Space>
      }
      size="small"
      extra={
        <Space>
          <Tooltip title="暂停/恢复所有">
            <Button
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={handleToggleAllAnimations}
              disabled={activeAnimations.length === 0}
            />
          </Tooltip>
          <Tooltip title="停止所有">
            <Button
              size="small"
              icon={<StopOutlined />}
              onClick={handleStopAllAnimations}
              disabled={activeAnimations.length === 0}
              danger
            />
          </Tooltip>
        </Space>
      }
    >
      {activeAnimations.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
          <Text type="secondary">当前没有活跃的动画</Text>
        </div>
      ) : (
        <List
          size="small"
          dataSource={activeAnimations}
          renderItem={(animation) => (
            <List.Item
              actions={[
                <Button
                  size="small"
                  icon={<StopOutlined />}
                  onClick={() => handleStopAnimation(animation.id)}
                  danger
                >
                  停止
                </Button>
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{animation.name}</Text>
                    <Tag color={animation.isPlaying ? 'green' : 'orange'}>
                      {animation.isPlaying ? '播放中' : '暂停'}
                    </Tag>
                  </Space>
                }
                description={
                  <div>
                    <Progress 
                      percent={animation.progress * 100} 
                      size="small" 
                      status={animation.isPlaying ? 'active' : 'normal'}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      ID: {animation.id}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );

  // 渲染性能信息
  const renderPerformanceInfo = () => {
    const activeCount = transitionManager.getActiveTransitionCount();
    
    return (
      <Card title="性能信息" size="small">
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Title level={4}>{activeCount}</Title>
              <Text type="secondary">活跃过渡</Text>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Title level={4}>{activeAnimations.length}</Title>
              <Text type="secondary">总动画数</Text>
            </div>
          </Col>
        </Row>

        {activeCount > 5 && (
          <Alert
            message="性能警告"
            description="同时运行的动画过多，可能影响性能"
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <ThunderboltOutlined />
          <span>动画控制面板</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Tabs defaultActiveKey="view">
        {/* 视角控制 */}
        <TabPane tab={<span><CameraOutlined />视角控制</span>} key="view">
          <Row gutter={16}>
            <Col span={24}>
              {renderViewControls()}
            </Col>
          </Row>
        </TabPane>

        {/* 相机动画 */}
        <TabPane tab={<span><RotateLeftOutlined />相机动画</span>} key="camera">
          <Row gutter={16}>
            <Col span={24}>
              {renderCameraAnimations()}
            </Col>
          </Row>
        </TabPane>

        {/* 活跃动画 */}
        <TabPane tab={<span><EyeOutlined />活跃动画</span>} key="active">
          <Row gutter={16}>
            <Col span={24}>
              {renderActiveAnimations()}
            </Col>
          </Row>
        </TabPane>

        {/* 性能监控 */}
        <TabPane tab={<span><SettingOutlined />性能监控</span>} key="performance">
          <Row gutter={16}>
            <Col span={24}>
              {renderPerformanceInfo()}
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </Modal>
  );
};