import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  Button,
  Select,
  Slider,
  Switch,
  Space,
  Alert,
  Progress,
  message,
  Tabs,
  Row,
  Col,
  InputNumber,
  Tooltip,
  Typography,
  Upload,
  List,
  Tag
} from 'antd';
import {
  PlayCircleOutlined,
  PauseOutlined,
  ReloadOutlined,
  SettingOutlined,
  EyeOutlined,
  CameraOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  DownloadOutlined,
  BugOutlined
} from '@ant-design/icons';
import * as THREE from 'three';

import CAE3DViewport from '../3d/CAE3DViewport';
import { useWebSocket } from '../../api/websocket';
import { apiClient } from '../../api/client';
import { PostProcessingPanel } from './PostProcessingPanel';

const { TabPane } = Tabs;
const { Text, Title } = Typography;
const { Option } = Select;

export interface PyVistaSession {
  session_id: string;
  mesh_id?: string;
  mesh_url?: string;
  scalar_fields?: string[];
  active_scalar?: string;
  bounds?: number[];
  mesh_info?: any;
}

interface PyVistaViewerProps {
  className?: string;
  showControls?: boolean;
  onSessionChange?: (session: PyVistaSession | null) => void;
}

export const PyVistaViewer: React.FC<PyVistaViewerProps> = ({
  className,
  showControls = true,
  onSessionChange
}) => {
  const [session, setSession] = useState<PyVistaSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [meshFiles, setMeshFiles] = useState<string[]>([]);
  const [timeSeriesFiles, setTimeSeriesFiles] = useState<string[]>([]);
  const [animationPlaying, setAnimationPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [renderSettings, setRenderSettings] = useState({
    render_mode: 'solid',
    show_edges: false,
    opacity: 1.0,
    color_map: 'viridis'
  });
  
  const { connect, disconnect, isConnected, clientId } = useWebSocket();
  const viewportRef = useRef<any>(null);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket连接管理
  useEffect(() => {
    if (!isConnected && clientId) {
      connect('ws://localhost:8000/ws');
    }
    
    return () => {
      if (session) {
        cleanupSession();
      }
      disconnect();
    };
  }, [clientId]);

  // WebSocket消息处理
  useEffect(() => {
    if (!isConnected) return;

    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'session_created':
            setSession(prev => prev ? { ...prev, session_id: data.session_id } : null);
            break;
            
          case 'loading_started':
            setLoading(true);
            setLoadingProgress(0);
            setLoadingMessage(data.message || 'Loading...');
            break;
            
          case 'loading_progress':
            setLoadingProgress((data.step / data.total) * 100);
            setLoadingMessage(data.message || 'Loading...');
            break;
            
          case 'mesh_loaded':
            handleMeshLoaded(data);
            break;
            
          case 'scalar_updated':
            handleScalarUpdated(data);
            break;
            
          case 'animation_ready':
            handleAnimationReady(data);
            break;
            
          case 'error':
            message.error(data.message);
            setLoading(false);
            break;
            
          case 'conversion_complete':
            message.success('网格转换完成');
            break;
            
          case 'conversion_error':
            message.error(`转换失败: ${data.message}`);
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    // 添加WebSocket消息监听器
    if (window.WebSocket && isConnected) {
      // 这里需要根据实际的WebSocket实现来监听消息
      // 暂时使用模拟的方式
    }

    return () => {
      // 清理监听器
    };
  }, [isConnected]);

  // 创建PyVista会话
  const createSession = useCallback(async () => {
    if (!clientId) {
      message.error('WebSocket未连接');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post('/visualization/session/create', {
        client_id: clientId
      });

      if (response.data.success) {
        const newSession: PyVistaSession = {
          session_id: response.data.session_id
        };
        setSession(newSession);
        onSessionChange?.(newSession);
        message.success('PyVista会话已创建');
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '创建会话失败');
    } finally {
      setLoading(false);
    }
  }, [clientId, onSessionChange]);

  // 加载网格文件
  const loadMeshFile = useCallback(async (meshPath: string) => {
    if (!session || !clientId) return;

    try {
      setLoading(true);
      const response = await apiClient.post('/visualization/mesh/load', {
        session_id: session.session_id,
        mesh_source: meshPath,
        render_type: renderSettings.render_mode,
        enable_compression: true
      }, {
        params: { client_id: clientId }
      });

      if (response.data.success) {
        message.success('网格加载已开始');
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '网格加载失败');
      setLoading(false);
    }
  }, [session, clientId, renderSettings.render_mode]);

  // 处理网格加载完成
  const handleMeshLoaded = useCallback((data: any) => {
    setSession(prev => prev ? {
      ...prev,
      mesh_id: data.mesh_id,
      mesh_url: data.mesh_url,
      scalar_fields: data.scalar_fields,
      bounds: data.bounds,
      mesh_info: data.mesh_info
    } : null);
    
    setLoading(false);
    setLoadingProgress(100);
    setLoadingMessage('网格加载成功');
    
    // 在3D视口中加载模型
    if (viewportRef.current && data.mesh_url) {
      viewportRef.current.loadModel(data.mesh_url);
    }
    
    message.success('网格加载成功');
  }, []);

  // 更新标量字段
  const updateScalarField = useCallback(async (scalarName: string) => {
    if (!session || !clientId) return;

    try {
      const response = await apiClient.post('/visualization/scalar/update', {
        session_id: session.session_id,
        scalar_name: scalarName
      }, {
        params: { client_id: clientId }
      });

      if (response.data.success) {
        message.success(`标量字段已更新: ${scalarName}`);
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '标量字段更新失败');
    }
  }, [session, clientId]);

  // 处理标量更新完成
  const handleScalarUpdated = useCallback((data: any) => {
    setSession(prev => prev ? {
      ...prev,
      active_scalar: data.active_scalar,
      mesh_url: data.mesh_url
    } : null);
    
    // 在3D视口中更新模型
    if (viewportRef.current && data.mesh_url) {
      viewportRef.current.loadModel(data.mesh_url);
    }
  }, []);

  // 更新渲染设置
  const updateRenderSettings = useCallback(async (newSettings: any) => {
    if (!session || !clientId) return;

    try {
      const response = await apiClient.post('/visualization/render/settings', {
        session_id: session.session_id,
        ...newSettings
      }, {
        params: { client_id: clientId }
      });

      if (response.data.success) {
        setRenderSettings(prev => ({ ...prev, ...newSettings }));
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '渲染设置更新失败');
    }
  }, [session, clientId]);

  // 创建时间序列动画
  const createTimeSeriesAnimation = useCallback(async (files: string[]) => {
    if (!session || !clientId) return;

    try {
      setLoading(true);
      const response = await apiClient.post('/visualization/animation/timeseries', {
        session_id: session.session_id,
        time_series_files: files,
        frame_rate: 30
      }, {
        params: { client_id: clientId }
      });

      if (response.data.success) {
        setTimeSeriesFiles(files);
        message.success('时间序列动画创建已开始');
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '动画创建失败');
      setLoading(false);
    }
  }, [session, clientId]);

  // 处理动画准备完成
  const handleAnimationReady = useCallback((data: any) => {
    setTotalFrames(data.total_steps);
    setCurrentFrame(0);
    setLoading(false);
    message.success(`动画已准备完成，共${data.total_steps}帧`);
  }, []);

  // 播放/暂停动画
  const toggleAnimation = useCallback(() => {
    if (animationPlaying) {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      setAnimationPlaying(false);
    } else {
      animationIntervalRef.current = setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % totalFrames);
      }, 1000 / 30); // 30 FPS
      setAnimationPlaying(true);
    }
  }, [animationPlaying, totalFrames]);

  // 清理会话
  const cleanupSession = useCallback(async () => {
    if (!session || !clientId) return;

    try {
      await apiClient.delete(`/visualization/session/${session.session_id}`, {
        params: { client_id: clientId }
      });
    } catch (error) {
      console.error('Failed to cleanup session:', error);
    }
  }, [session, clientId]);

  // 渲染控制面板
  const renderControlPanel = () => (
    <Card title="PyVista控制" size="small">
      <Tabs size="small">
        {/* 会话管理 */}
        <TabPane tab={<span><SettingOutlined />会话</span>} key="session">
          <Space direction="vertical" style={{ width: '100%' }}>
            {!session ? (
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />}
                onClick={createSession}
                loading={loading}
                block
              >
                创建PyVista会话
              </Button>
            ) : (
              <Alert
                message="会话活跃"
                description={`会话ID: ${session.session_id}`}
                type="success"
                showIcon
              />
            )}
            
            {loading && (
              <div>
                <Progress percent={loadingProgress} size="small" />
                <Text type="secondary">{loadingMessage}</Text>
              </div>
            )}
          </Space>
        </TabPane>

        {/* 网格管理 */}
        <TabPane tab={<span><EyeOutlined />网格</span>} key="mesh">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Upload
              beforeUpload={() => false}
              onChange={(info) => {
                if (info.file) {
                  loadMeshFile(info.file.name);
                }
              }}
            >
              <Button icon={<UploadOutlined />} disabled={!session}>
                加载网格文件
              </Button>
            </Upload>

            {session?.scalar_fields && session.scalar_fields.length > 0 && (
              <div>
                <Text strong>标量字段:</Text>
                <Select
                  value={session.active_scalar}
                  onChange={updateScalarField}
                  style={{ width: '100%', marginTop: 4 }}
                  size="small"
                >
                  {session.scalar_fields.map(field => (
                    <Option key={field} value={field}>
                      {field}
                    </Option>
                  ))}
                </Select>
              </div>
            )}

            {session?.mesh_info && (
              <div>
                <Text strong>网格信息:</Text>
                <List size="small">
                  <List.Item>
                    <Text>点数: {session.mesh_info.points}</Text>
                  </List.Item>
                  <List.Item>
                    <Text>单元数: {session.mesh_info.cells}</Text>
                  </List.Item>
                  {session.mesh_info.volume && (
                    <List.Item>
                      <Text>体积: {session.mesh_info.volume.toFixed(2)}</Text>
                    </List.Item>
                  )}
                </List>
              </div>
            )}
          </Space>
        </TabPane>

        {/* 渲染设置 */}
        <TabPane tab={<span><ThunderboltOutlined />渲染</span>} key="render">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>渲染模式:</Text>
              <Select
                value={renderSettings.render_mode}
                onChange={(value) => updateRenderSettings({ render_mode: value })}
                style={{ width: '100%', marginTop: 4 }}
                size="small"
              >
                <Option value="solid">实体</Option>
                <Option value="wireframe">线框</Option>
                <Option value="points">点云</Option>
                <Option value="transparent">透明</Option>
                <Option value="x-ray">X射线</Option>
              </Select>
            </div>

            <div>
              <Text strong>透明度: {renderSettings.opacity}</Text>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={renderSettings.opacity}
                onChange={(value) => updateRenderSettings({ opacity: value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>显示边线:</Text>
              <Switch
                checked={renderSettings.show_edges}
                onChange={(checked) => updateRenderSettings({ show_edges: checked })}
              />
            </div>

            <div>
              <Text strong>颜色映射:</Text>
              <Select
                value={renderSettings.color_map}
                onChange={(value) => updateRenderSettings({ color_map: value })}
                style={{ width: '100%', marginTop: 4 }}
                size="small"
              >
                <Option value="viridis">Viridis</Option>
                <Option value="plasma">Plasma</Option>
                <Option value="jet">Jet</Option>
                <Option value="rainbow">Rainbow</Option>
                <Option value="coolwarm">冷暖色</Option>
              </Select>
            </div>
          </Space>
        </TabPane>

        {/* 动画控制 */}
        <TabPane tab={<span><PlayCircleOutlined />动画</span>} key="animation">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Upload
              multiple
              beforeUpload={() => false}
              onChange={(info) => {
                const files = info.fileList.map(file => file.name);
                createTimeSeriesAnimation(files);
              }}
            >
              <Button icon={<UploadOutlined />} disabled={!session}>
                加载时间序列
              </Button>
            </Upload>

            {totalFrames > 0 && (
              <div>
                <Row gutter={8}>
                  <Col span={12}>
                    <Button
                      icon={animationPlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
                      onClick={toggleAnimation}
                      block
                      size="small"
                    >
                      {animationPlaying ? '暂停' : '播放'}
                    </Button>
                  </Col>
                  <Col span={12}>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => setCurrentFrame(0)}
                      block
                      size="small"
                    >
                      重置
                    </Button>
                  </Col>
                </Row>

                <div style={{ marginTop: 8 }}>
                  <Text>帧: {currentFrame + 1} / {totalFrames}</Text>
                  <Slider
                    min={0}
                    max={totalFrames - 1}
                    value={currentFrame}
                    onChange={setCurrentFrame}
                  />
                </div>
              </div>
            )}
          </Space>
        </TabPane>
      </Tabs>
    </Card>
  );

  return (
    <div className={className}>
      <Row gutter={16}>
        {/* 3D视口 */}
        <Col span={showControls ? 18 : 24}>
          <CAE3DViewport
            showToolbar={true}
            onModelLoad={(model) => {
              console.log('Model loaded in viewport:', model);
            }}
            initialModels={session?.mesh_url ? [session.mesh_url] : []}
          />
        </Col>

        {/* 控制面板 */}
        {showControls && (
          <Col span={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {renderControlPanel()}
              
              {/* 后处理面板 */}
              <PostProcessingPanel
                sessionId={session?.session_id}
                onFieldChange={(field) => {
                  console.log('Field changed to:', field);
                }}
                onDeformationChange={(show, scale) => {
                  console.log('Deformation changed:', show, scale);
                }}
              />
            </Space>
          </Col>
        )}
      </Row>
    </div>
  );
};