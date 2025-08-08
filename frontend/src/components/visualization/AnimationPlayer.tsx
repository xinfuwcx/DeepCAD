/**
 * 应力/位移动画播放器
 * 3号计算专家 - Day 8-9任务：应力/位移动画播放系统
 * 支持时间历程动画、变形动画、应力波传播等多种动画模式
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Space, Typography, Slider, Select, Button, Tag, Row, Col, Statistic, Switch, InputNumber, Alert, Timeline } from 'antd';
import { 
  PlayCircleOutlined,
  PauseCircleOutlined,
  StepForwardOutlined,
  StepBackwardOutlined,
  FastForwardOutlined,
  FastBackwardOutlined,
  ReloadOutlined,
  SettingOutlined,
  VideoCameraOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import * as THREE from 'three';

const { Text, Title } = Typography;
const { Option } = Select;

// 动画数据接口
export interface AnimationData {
  timeSteps: Array<{
    time: number;
    nodes: Array<{
      id: number;
      position: [number, number, number];
      displacement: [number, number, number];
      stress: number;
      strain: number;
      velocity?: [number, number, number];
      acceleration?: [number, number, number];
    }>;
    elements: Array<{
      id: number;
      nodeIds: number[];
      stress: number;
      strain: number;
    }>;
    metadata: {
      fieldName: string;
      unit: string;
      maxDisplacement: number;
      maxStress: number;
      description: string;
    };
  }>;
  globalMetadata: {
    totalTime: number;
    timeStepSize: number;
    animationType: 'displacement' | 'stress' | 'strain' | 'velocity' | 'combined';
    simulationName: string;
  };
}

// 动画配置
export interface AnimationConfiguration {
  playbackSpeed: number;
  amplificationFactor: number;
  showOriginalMesh: boolean;
  showDeformedMesh: boolean;
  deformationScale: number;
  colorMapping: 'stress' | 'displacement' | 'strain' | 'velocity';
  interpolation: 'linear' | 'smooth' | 'stepped';
  trailLength: number;
  showTrails: boolean;
  ghostFrames: number;
  autoLoop: boolean;
  syncWithAudio: boolean;
}

// 播放状态
interface PlaybackState {
  isPlaying: boolean;
  currentFrame: number;
  currentTime: number;
  totalFrames: number;
  playbackDirection: 1 | -1;
  frameRate: number;
  bufferedFrames: number;
}

// 性能监控
interface AnimationPerformance {
  renderTime: number;
  frameTime: number;
  memoryUsage: number;
  trianglesRendered: number;
  fps: number;
  droppedFrames: number;
  interpolationTime: number;
}

interface AnimationPlayerProps {
  data: AnimationData | null;
  width?: number;
  height?: number;
  onPlaybackStateChange?: (state: PlaybackState) => void;
  onPerformanceUpdate?: (metrics: AnimationPerformance) => void;
  enableControls?: boolean;
}

const AnimationPlayer: React.FC<AnimationPlayerProps> = ({
  data,
  width = 900,
  height = 700,
  onPlaybackStateChange,
  onPerformanceUpdate,
  enableControls = true
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const originalMeshRef = useRef<THREE.Mesh>();
  const deformedMeshRef = useRef<THREE.Mesh>();
  const trailsGroupRef = useRef<THREE.Group>();
  const animationIdRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);
  
  // 状态管理
  const [config, setConfig] = useState<AnimationConfiguration>({
    playbackSpeed: 1.0,
    amplificationFactor: 1.0,
    showOriginalMesh: true,
    showDeformedMesh: true,
    deformationScale: 10.0,
    colorMapping: 'stress',
    interpolation: 'linear',
    trailLength: 10,
    showTrails: false,
    ghostFrames: 3,
    autoLoop: true,
    syncWithAudio: false
  });
  
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentFrame: 0,
    currentTime: 0,
    totalFrames: 0,
    playbackDirection: 1,
    frameRate: 30,
    bufferedFrames: 0
  });
  
  const [performance, setPerformance] = useState<AnimationPerformance>({
    renderTime: 0,
    frameTime: 0,
    memoryUsage: 0,
    trianglesRendered: 0,
    fps: 0,
    droppedFrames: 0,
    interpolationTime: 0
  });

  const [frameBuffer, setFrameBuffer] = useState<Map<number, any>>(new Map());
  const [interpolatedFrame, setInterpolatedFrame] = useState<any>(null);

  // 初始化播放状态
  useEffect(() => {
    if (data && data.timeSteps.length > 0) {
      setPlaybackState(prev => ({
        ...prev,
        totalFrames: data.timeSteps.length,
        currentFrame: 0,
        currentTime: data.timeSteps[0].time
      }));
    }
  }, [data]);

  // 帧插值函数
  const interpolateFrames = useCallback((frame1: any, frame2: any, t: number) => {
    const interpolationStart = performance.now();
    
    if (!frame1 || !frame2 || t <= 0) return frame1;
    if (t >= 1) return frame2;
    
    const interpolatedNodes = frame1.nodes.map((node1: any, index: number) => {
      const node2 = frame2.nodes[index];
      if (!node2) return node1;
      
      return {
        id: node1.id,
        position: [
          node1.position[0] + t * (node2.position[0] - node1.position[0]),
          node1.position[1] + t * (node2.position[1] - node1.position[1]),
          node1.position[2] + t * (node2.position[2] - node1.position[2])
        ],
        displacement: [
          node1.displacement[0] + t * (node2.displacement[0] - node1.displacement[0]),
          node1.displacement[1] + t * (node2.displacement[1] - node1.displacement[1]),
          node1.displacement[2] + t * (node2.displacement[2] - node1.displacement[2])
        ],
        stress: node1.stress + t * (node2.stress - node1.stress),
        strain: node1.strain + t * (node2.strain - node1.strain),
        velocity: node1.velocity && node2.velocity ? [
          node1.velocity[0] + t * (node2.velocity[0] - node1.velocity[0]),
          node1.velocity[1] + t * (node2.velocity[1] - node1.velocity[1]),
          node1.velocity[2] + t * (node2.velocity[2] - node1.velocity[2])
        ] : node1.velocity
      };
    });
    
    const interpolationTime = performance.now() - interpolationStart;
    
    setPerformance(prev => ({
      ...prev,
      interpolationTime
    }));
    
    return {
      time: frame1.time + t * (frame2.time - frame1.time),
      nodes: interpolatedNodes,
      elements: frame1.elements, // 单元数据通常不需要插值
      metadata: frame1.metadata
    };
  }, [config.interpolation]);

  // 获取当前帧数据
  const getCurrentFrameData = useCallback(() => {
    if (!data || data.timeSteps.length === 0) return null;
    
    const { currentFrame } = playbackState;
    const frameIndex = Math.floor(currentFrame);
    const fraction = currentFrame - frameIndex;
    
    if (config.interpolation === 'stepped' || fraction === 0) {
      return data.timeSteps[Math.min(frameIndex, data.timeSteps.length - 1)];
    }
    
    const frame1 = data.timeSteps[Math.min(frameIndex, data.timeSteps.length - 1)];
    const frame2 = data.timeSteps[Math.min(frameIndex + 1, data.timeSteps.length - 1)];
    
    return interpolateFrames(frame1, frame2, fraction);
  }, [data, playbackState.currentFrame, config.interpolation, interpolateFrames]);

  // 创建网格几何体
  const createMeshGeometry = useCallback((frameData: any, isDeformed: boolean = false) => {
    if (!frameData) return null;
    
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    
    // 节点映射
    const nodeMap = new Map();
    frameData.nodes.forEach((node: any, index: number) => {
      nodeMap.set(node.id, index);
      
      if (isDeformed) {
        // 变形后的位置
        const deformationScale = config.deformationScale * config.amplificationFactor;
        positions.push(
          node.position[0] + node.displacement[0] * deformationScale,
          node.position[1] + node.displacement[1] * deformationScale,
          node.position[2] + node.displacement[2] * deformationScale
        );
      } else {
        // 原始位置
        positions.push(...node.position);
      }
      
      // 根据配置的颜色映射分配颜色
      const color = getNodeColor(node);
      colors.push(color.r, color.g, color.b);
    });
    
    // 创建单元索引
    frameData.elements?.forEach((element: any) => {
      if (element.nodeIds.length >= 3) {
        if (element.nodeIds.length === 3) {
          // 三角形
          const [n1, n2, n3] = element.nodeIds.map((id: number) => nodeMap.get(id));
          if (n1 !== undefined && n2 !== undefined && n3 !== undefined) {
            indices.push(n1, n2, n3);
          }
        } else if (element.nodeIds.length === 4) {
          // 四边形分解为两个三角形
          const [n1, n2, n3, n4] = element.nodeIds.map((id: number) => nodeMap.get(id));
          if (n1 !== undefined && n2 !== undefined && n3 !== undefined && n4 !== undefined) {
            indices.push(n1, n2, n3);
            indices.push(n1, n3, n4);
          }
        }
      }
    });
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  }, [config.deformationScale, config.amplificationFactor, config.colorMapping]);

  // 获取节点颜色
  const getNodeColor = (node: any): THREE.Color => {
    let value = 0;
    let maxValue = 1;
    
    switch (config.colorMapping) {
      case 'stress':
        value = Math.abs(node.stress);
        maxValue = data?.timeSteps.reduce((max, step) => 
          Math.max(max, step.metadata.maxStress), 0) || 1;
        break;
      case 'displacement':
        const displacement = Math.sqrt(
          node.displacement[0] ** 2 + 
          node.displacement[1] ** 2 + 
          node.displacement[2] ** 2
        );
        value = displacement;
        maxValue = data?.timeSteps.reduce((max, step) => 
          Math.max(max, step.metadata.maxDisplacement), 0) || 1;
        break;
      case 'strain':
        value = Math.abs(node.strain);
        maxValue = 0.1; // 典型应变范围
        break;
      case 'velocity':
        if (node.velocity) {
          const velocity = Math.sqrt(
            node.velocity[0] ** 2 + 
            node.velocity[1] ** 2 + 
            node.velocity[2] ** 2
          );
          value = velocity;
          maxValue = 10; // 典型速度范围
        }
        break;
    }
    
    const normalized = Math.min(value / maxValue, 1);
    
    // Jet配色方案
    const r = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * normalized - 3)));
    const g = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * normalized - 2)));
    const b = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * normalized - 1)));
    
    return new THREE.Color(r, g, b);
  };

  // 初始化Three.js场景
  const initializeScene = useCallback(() => {
    if (!mountRef.current) return;

    // 场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // 相机
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // 光照
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // 轨迹组
    const trailsGroup = new THREE.Group();
    trailsGroupRef.current = trailsGroup;
    scene.add(trailsGroup);

    console.log("✅ 动画播放器场景初始化完成");
  }, [width, height]);

  // 更新网格渲染
  const updateMeshRender = useCallback((frameData: any) => {
    if (!sceneRef.current || !frameData) return;
    
    const renderStart = performance.now();
    
    // 更新原始网格
    if (config.showOriginalMesh) {
      if (originalMeshRef.current) {
        sceneRef.current.remove(originalMeshRef.current);
        originalMeshRef.current.geometry.dispose();
        if (Array.isArray(originalMeshRef.current.material)) {
          originalMeshRef.current.material.forEach(material => material.dispose());
        } else {
          originalMeshRef.current.material.dispose();
        }
      }
      
      const originalGeometry = createMeshGeometry(frameData, false);
      if (originalGeometry) {
        const originalMaterial = new THREE.MeshLambertMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.3,
          wireframe: true
        });
        
        originalMeshRef.current = new THREE.Mesh(originalGeometry, originalMaterial);
        sceneRef.current.add(originalMeshRef.current);
      }
    }
    
    // 更新变形网格
    if (config.showDeformedMesh) {
      if (deformedMeshRef.current) {
        sceneRef.current.remove(deformedMeshRef.current);
        deformedMeshRef.current.geometry.dispose();
        if (Array.isArray(deformedMeshRef.current.material)) {
          deformedMeshRef.current.material.forEach(material => material.dispose());
        } else {
          deformedMeshRef.current.material.dispose();
        }
      }
      
      const deformedGeometry = createMeshGeometry(frameData, true);
      if (deformedGeometry) {
        const deformedMaterial = new THREE.MeshLambertMaterial({
          vertexColors: true,
          transparent: false,
          side: THREE.DoubleSide
        });
        
        deformedMeshRef.current = new THREE.Mesh(deformedGeometry, deformedMaterial);
        deformedMeshRef.current.castShadow = true;
        deformedMeshRef.current.receiveShadow = true;
        sceneRef.current.add(deformedMeshRef.current);
      }
    }
    
    // 更新轨迹
    if (config.showTrails && trailsGroupRef.current) {
      updateTrails(frameData);
    }
    
    const renderTime = performance.now() - renderStart;
    
    setPerformance(prev => ({
      ...prev,
      renderTime,
      trianglesRendered: (originalGeometry?.index?.count || 0) + (deformedGeometry?.index?.count || 0)
    }));
  }, [config.showOriginalMesh, config.showDeformedMesh, config.showTrails, createMeshGeometry]);

  // 更新轨迹
  const updateTrails = (frameData: any) => {
    if (!trailsGroupRef.current) return;
    
    // 这里可以实现轨迹更新逻辑
    // 保存节点的历史位置并绘制轨迹线
  };

  // 播放控制
  const play = () => {
    setPlaybackState(prev => ({ ...prev, isPlaying: true }));
  };

  const pause = () => {
    setPlaybackState(prev => ({ ...prev, isPlaying: false }));
  };

  const stop = () => {
    setPlaybackState(prev => ({ 
      ...prev, 
      isPlaying: false, 
      currentFrame: 0,
      currentTime: data?.timeSteps[0]?.time || 0
    }));
  };

  const stepForward = () => {
    setPlaybackState(prev => ({
      ...prev,
      currentFrame: Math.min(prev.currentFrame + 1, prev.totalFrames - 1)
    }));
  };

  const stepBackward = () => {
    setPlaybackState(prev => ({
      ...prev,
      currentFrame: Math.max(prev.currentFrame - 1, 0)
    }));
  };

  const seekToFrame = (frame: number) => {
    setPlaybackState(prev => ({
      ...prev,
      currentFrame: Math.max(0, Math.min(frame, prev.totalFrames - 1))
    }));
  };

  // 动画循环
  const animate = useCallback(() => {
    if (!playbackState.isPlaying || !data) {
      animationIdRef.current = requestAnimationFrame(animate);
      return;
    }
    
    const now = performance.now();
    const deltaTime = now - lastFrameTimeRef.current;
    
    if (deltaTime >= 1000 / playbackState.frameRate) {
      const frameIncrement = config.playbackSpeed * playbackState.playbackDirection;
      
      setPlaybackState(prev => {
        let nextFrame = prev.currentFrame + frameIncrement;
        
        if (config.autoLoop) {
          if (nextFrame >= prev.totalFrames) {
            nextFrame = 0;
          } else if (nextFrame < 0) {
            nextFrame = prev.totalFrames - 1;
          }
        } else {
          nextFrame = Math.max(0, Math.min(nextFrame, prev.totalFrames - 1));
          if (nextFrame === 0 || nextFrame === prev.totalFrames - 1) {
            return { ...prev, isPlaying: false, currentFrame: nextFrame };
          }
        }
        
        const currentTime = data.timeSteps[Math.floor(nextFrame)]?.time || 0;
        
        return {
          ...prev,
          currentFrame: nextFrame,
          currentTime
        };
      });
      
      lastFrameTimeRef.current = now;
      
      // 计算FPS
      const fps = 1000 / deltaTime;
      setPerformance(prev => ({
        ...prev,
        fps: Math.round(fps * 10) / 10,
        frameTime: deltaTime
      }));
    }
    
    // 渲染当前帧
    const currentFrameData = getCurrentFrameData();
    if (currentFrameData && rendererRef.current && sceneRef.current && cameraRef.current) {
      updateMeshRender(currentFrameData);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    animationIdRef.current = requestAnimationFrame(animate);
  }, [playbackState, data, config, getCurrentFrameData, updateMeshRender]);

  // 初始化场景
  useEffect(() => {
    initializeScene();
    lastFrameTimeRef.current = performance.now();
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      
      // 安全卸载 renderer.domElement（仅当确为其父节点时）
      try {
        const mountNode = mountRef.current;
        const renderer = rendererRef.current;
        const dom = renderer?.domElement;
        if (mountNode && dom && dom.parentNode === mountNode) {
          mountNode.removeChild(dom);
        }
        renderer?.dispose?.();
      } catch (e) {
        // 忽略卸载期间的偶发性错误，避免 NotFoundError 影响卸载流程
        console.warn('[AnimationPlayer] cleanup warning:', e);
      } finally {
        rendererRef.current = undefined;
      }
    };
  }, [initializeScene]);

  // 启动动画循环
  useEffect(() => {
    animate();
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [animate]);

  // 播放状态变化回调
  useEffect(() => {
    onPlaybackStateChange?.(playbackState);
  }, [playbackState, onPlaybackStateChange]);

  // 性能监控回调
  useEffect(() => {
    onPerformanceUpdate?.(performance);
  }, [performance, onPerformanceUpdate]);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      
      {/* 控制面板 */}
      <Card 
        title={
          <Space>
            <VideoCameraOutlined />
            <Text strong>应力/位移动画播放器</Text>
            <Tag color={playbackState.isPlaying ? 'green' : 'orange'}>
              {playbackState.isPlaying ? '播放中' : '已暂停'}
            </Tag>
          </Space>
        }
        size="small"
      >
        {/* 播放控制 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Space>
              <Button 
                icon={<FastBackwardOutlined />}
                onClick={() => setPlaybackState(prev => ({ ...prev, playbackDirection: -1 }))}
                disabled={!data}
              />
              <Button 
                icon={<StepBackwardOutlined />}
                onClick={stepBackward}
                disabled={!data}
              />
              <Button 
                type="primary"
                icon={playbackState.isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={playbackState.isPlaying ? pause : play}
                disabled={!data}
              >
                {playbackState.isPlaying ? '暂停' : '播放'}
              </Button>
              <Button 
                icon={<StepForwardOutlined />}
                onClick={stepForward}
                disabled={!data}
              />
              <Button 
                icon={<FastForwardOutlined />}
                onClick={() => setPlaybackState(prev => ({ ...prev, playbackDirection: 1 }))}
                disabled={!data}
              />
              <Button 
                icon={<ReloadOutlined />}
                onClick={stop}
                disabled={!data}
              />
            </Space>
          </Col>
          
          <Col span={12}>
            <Space>
              <Text>帧: {playbackState.currentFrame}/{playbackState.totalFrames}</Text>
              <Text>时间: {playbackState.currentTime.toFixed(3)}s</Text>
              <Text>速度: {config.playbackSpeed}x</Text>
            </Space>
          </Col>
        </Row>
        
        {/* 时间轴 */}
        <Row gutter={16}>
          <Col span={24}>
            <div>
              <Text strong>时间轴: </Text>
              <Slider
                min={0}
                max={playbackState.totalFrames - 1}
                value={playbackState.currentFrame}
                onChange={seekToFrame}
                style={{ width: '100%' }}
                disabled={!data}
                tooltip={{
                  formatter: (value) => `帧 ${value}, 时间 ${data?.timeSteps[value || 0]?.time.toFixed(3)}s`
                }}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* 设置面板 */}
      <Card title="🎛️ 动画设置" size="small">
        <Row gutter={16}>
          <Col span={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>播放速度: </Text>
                <Slider
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  value={config.playbackSpeed}
                  onChange={(value) => setConfig(prev => ({ ...prev, playbackSpeed: value }))}
                  style={{ width: 120 }}
                />
              </div>
              
              <div>
                <Text strong>变形放大: </Text>
                <Slider
                  min={0.1}
                  max={100}
                  step={0.1}
                  value={config.deformationScale}
                  onChange={(value) => setConfig(prev => ({ ...prev, deformationScale: value }))}
                  style={{ width: 120 }}
                />
              </div>
            </Space>
          </Col>
          
          <Col span={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>颜色映射: </Text>
                <Select 
                  value={config.colorMapping}
                  onChange={(value) => setConfig(prev => ({ ...prev, colorMapping: value }))}
                  style={{ width: 120 }}
                  size="small"
                >
                  <Option value="stress">应力</Option>
                  <Option value="displacement">位移</Option>
                  <Option value="strain">应变</Option>
                  <Option value="velocity">速度</Option>
                </Select>
              </div>
              
              <div>
                <Text strong>插值方式: </Text>
                <Select 
                  value={config.interpolation}
                  onChange={(value) => setConfig(prev => ({ ...prev, interpolation: value }))}
                  style={{ width: 120 }}
                  size="small"
                >
                  <Option value="linear">线性</Option>
                  <Option value="smooth">平滑</Option>
                  <Option value="stepped">步进</Option>
                </Select>
              </div>
            </Space>
          </Col>
          
          <Col span={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>显示原始: </Text>
                <Switch
                  checked={config.showOriginalMesh}
                  onChange={(checked) => setConfig(prev => ({ ...prev, showOriginalMesh: checked }))}
                  size="small"
                />
              </div>
              
              <div>
                <Text strong>显示变形: </Text>
                <Switch
                  checked={config.showDeformedMesh}
                  onChange={(checked) => setConfig(prev => ({ ...prev, showDeformedMesh: checked }))}
                  size="small"
                />
              </div>
            </Space>
          </Col>
          
          <Col span={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>显示轨迹: </Text>
                <Switch
                  checked={config.showTrails}
                  onChange={(checked) => setConfig(prev => ({ ...prev, showTrails: checked }))}
                  size="small"
                />
              </div>
              
              <div>
                <Text strong>自动循环: </Text>
                <Switch
                  checked={config.autoLoop}
                  onChange={(checked) => setConfig(prev => ({ ...prev, autoLoop: checked }))}
                  size="small"
                />
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 性能监控 */}
      <Card title="📊 动画性能监控" size="small">
        <Row gutter={16}>
          <Col span={4}>
            <Statistic
              title="FPS"
              value={performance.fps}
              precision={1}
              valueStyle={{ color: performance.fps > 30 ? '#52c41a' : performance.fps > 15 ? '#faad14' : '#ff4d4f' }}
              prefix={<ThunderboltOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="渲染时间"
              value={performance.renderTime}
              precision={2}
              suffix="ms"
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="插值时间"
              value={performance.interpolationTime}
              precision={2}
              suffix="ms"
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="三角形数"
              value={performance.trianglesRendered}
              formatter={(value) => Number(value).toLocaleString()}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="帧时间"
              value={performance.frameTime}
              precision={2}
              suffix="ms"
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="丢帧数"
              value={performance.droppedFrames}
              valueStyle={{ color: performance.droppedFrames > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 渲染区域 */}
      <Card 
        title={data ? `${data.globalMetadata.simulationName} - ${data.globalMetadata.animationType}动画` : "等待动画数据..."} 
        style={{ textAlign: 'center' }}
      >
        {!data && (
          <Alert
            message="等待动画数据"
            description="请加载时间历程计算结果进行动画播放"
            type="info"
            showIcon
          />
        )}
        
        <div 
          ref={mountRef} 
          style={{ 
            width: width, 
            height: height, 
            margin: '0 auto',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            overflow: 'hidden',
            backgroundColor: '#1a1a1a'
          }} 
        />
        
        {data && (
          <div style={{ marginTop: '8px' }}>
            <Text type="secondary">
              总时长: {data.globalMetadata.totalTime.toFixed(3)}s | 
              时间步: {data.globalMetadata.timeStepSize.toFixed(6)}s | 
              总帧数: {data.timeSteps.length}
            </Text>
          </div>
        )}
      </Card>

    </Space>
  );
};

export default AnimationPlayer;