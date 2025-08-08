/**
 * 实时云图渲染器
 * 3号计算专家 - Day 6-9任务：实时结果可视化系统
 * 支持应力、位移、温度等多种物理量的实时云图渲染
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Space, Typography, Slider, Select, Button, Tag, Row, Col, Statistic, Switch, Alert } from 'antd';
import { 
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import * as THREE from 'three';
import { safeDetachRenderer, deepDispose } from '../../utils/safeThreeDetach';

const { Text, Title } = Typography;
const { Option } = Select;

// 可视化数据接口
export interface VisualizationData {
  nodes: Array<{
    id: number;
    position: [number, number, number];
    value: number;
  }>;
  elements: Array<{
    id: number;
    nodeIds: number[];
    elementValue?: number;
  }>;
  metadata: {
    fieldName: string;
    fieldType: 'stress' | 'displacement' | 'temperature' | 'pressure' | 'strain';
    unit: string;
    timeStep: number;
    minValue: number;
    maxValue: number;
    timestamp: number;
  };
}

// 渲染配置
export interface RenderConfiguration {
  colorScheme: 'jet' | 'rainbow' | 'cool' | 'hot' | 'viridis';
  interpolation: 'linear' | 'cubic' | 'nearest';
  transparency: number;
  wireframe: boolean;
  showMesh: boolean;
  contourLines: number;
  autoScale: boolean;
  clampValues: boolean;
  renderQuality: 'low' | 'medium' | 'high' | 'ultra';
}

// 性能监控
interface RenderPerformance {
  fps: number;
  frameTime: number;
  triangles: number;
  drawCalls: number;
  memoryUsage: number;
  lastUpdateTime: number;
}

interface RealtimeCloudRendererProps {
  data: VisualizationData | null;
  width?: number;
  height?: number;
  onPerformanceUpdate?: (metrics: RenderPerformance) => void;
  autoRotate?: boolean;
  enableControls?: boolean;
}

const RealtimeCloudRenderer: React.FC<RealtimeCloudRendererProps> = ({
  data,
  width = 800,
  height = 600,
  onPerformanceUpdate,
  autoRotate = false,
  enableControls = true
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const meshRef = useRef<THREE.Mesh>();
  const animationIdRef = useRef<number>();
  
  // 状态管理
  const [isPlaying, setIsPlaying] = useState(true);
  const [renderConfig, setRenderConfig] = useState<RenderConfiguration>({
    colorScheme: 'jet',
    interpolation: 'linear',
    transparency: 0.8,
    wireframe: false,
    showMesh: true,
    contourLines: 10,
    autoScale: true,
    clampValues: false,
    renderQuality: 'high'
  });
  
  const [performance, setPerformance] = useState<RenderPerformance>({
    fps: 0,
    frameTime: 0,
    triangles: 0,
    drawCalls: 0,
    memoryUsage: 0,
    lastUpdateTime: 0
  });

  const [colorScale, setColorScale] = useState<{min: number, max: number}>({min: 0, max: 1});

  // 颜色映射函数
  const getColorFromValue = useCallback((value: number, min: number, max: number): THREE.Color => {
    const normalized = (value - min) / (max - min);
    const clamped = Math.max(0, Math.min(1, normalized));
    
    switch (renderConfig.colorScheme) {
      case 'jet':
        return getJetColor(clamped);
      case 'rainbow':
        return getRainbowColor(clamped);
      case 'cool':
        return getCoolColor(clamped);
      case 'hot':
        return getHotColor(clamped);
      case 'viridis':
        return getViridisColor(clamped);
      default:
        return getJetColor(clamped);
    }
  }, [renderConfig.colorScheme]);

  // Jet颜色映射
  const getJetColor = (t: number): THREE.Color => {
    const r = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 3)));
    const g = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 2)));
    const b = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 1)));
    return new THREE.Color(r, g, b);
  };

  // Rainbow颜色映射
  const getRainbowColor = (t: number): THREE.Color => {
    const hue = (1 - t) * 240 / 360; // 从蓝到红
    return new THREE.Color().setHSL(hue, 1, 0.5);
  };

  // Cool颜色映射
  const getCoolColor = (t: number): THREE.Color => {
    return new THREE.Color(t, 1 - t, 1);
  };

  // Hot颜色映射
  const getHotColor = (t: number): THREE.Color => {
    const r = Math.min(1, 3 * t);
    const g = Math.min(1, Math.max(0, 3 * t - 1));
    const b = Math.min(1, Math.max(0, 3 * t - 2));
    return new THREE.Color(r, g, b);
  };

  // Viridis颜色映射
  const getViridisColor = (t: number): THREE.Color => {
    // 简化的Viridis配色方案
    const viridisColors = [
      [0.267, 0.004, 0.329], // 深紫
      [0.127, 0.566, 0.550], // 青绿
      [0.993, 0.906, 0.143]  // 亮黄
    ];
    
    const scaledT = t * (viridisColors.length - 1);
    const index = Math.floor(scaledT);
    const fraction = scaledT - index;
    
    if (index >= viridisColors.length - 1) {
      return new THREE.Color().fromArray(viridisColors[viridisColors.length - 1]);
    }
    
    const color1 = viridisColors[index];
    const color2 = viridisColors[index + 1];
    
    const r = color1[0] + fraction * (color2[0] - color1[0]);
    const g = color1[1] + fraction * (color2[1] - color1[1]);
    const b = color1[2] + fraction * (color2[2] - color1[2]);
    
    return new THREE.Color(r, g, b);
  };

  // 初始化Three.js场景
  const initializeScene = useCallback(() => {
    if (!mountRef.current) return;

    // 场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2c2c2c);
    sceneRef.current = scene;

    // 相机
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ 
      antialias: renderConfig.renderQuality !== 'low',
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = renderConfig.renderQuality === 'ultra';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // 性能优化设置
    if (renderConfig.renderQuality === 'low') {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    } else if (renderConfig.renderQuality === 'medium') {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    } else {
      renderer.setPixelRatio(window.devicePixelRatio);
    }
    
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // 光照
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = renderConfig.renderQuality === 'ultra';
    scene.add(directionalLight);

    // 控制器
    if (enableControls) {
      // 这里可以添加OrbitControls或其他控制器
    }

    console.log("✅ Three.js场景初始化完成");
  }, [width, height, renderConfig.renderQuality, enableControls]);

  // 创建网格几何体
  const createMeshGeometry = useCallback((data: VisualizationData) => {
    const geometry = new THREE.BufferGeometry();
    
    // 顶点位置
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    
    // 节点映射
    const nodeMap = new Map();
    data.nodes.forEach((node, index) => {
      nodeMap.set(node.id, index);
      positions.push(...node.position);
    });
    
    // 计算颜色范围
    const values = data.nodes.map(node => node.value);
    const minVal = renderConfig.autoScale ? Math.min(...values) : colorScale.min;
    const maxVal = renderConfig.autoScale ? Math.max(...values) : colorScale.max;
    
    // 更新颜色范围
    setColorScale({ min: minVal, max: maxVal });
    
    // 为每个节点分配颜色
    data.nodes.forEach(node => {
      const color = getColorFromValue(node.value, minVal, maxVal);
      colors.push(color.r, color.g, color.b);
    });
    
    // 创建三角形索引
    data.elements.forEach(element => {
      if (element.nodeIds.length >= 3) {
        // 处理三角形或四边形单元
        if (element.nodeIds.length === 3) {
          // 三角形
          const [n1, n2, n3] = element.nodeIds.map(id => nodeMap.get(id));
          if (n1 !== undefined && n2 !== undefined && n3 !== undefined) {
            indices.push(n1, n2, n3);
          }
        } else if (element.nodeIds.length === 4) {
          // 四边形分解为两个三角形
          const [n1, n2, n3, n4] = element.nodeIds.map(id => nodeMap.get(id));
          if (n1 !== undefined && n2 !== undefined && n3 !== undefined && n4 !== undefined) {
            indices.push(n1, n2, n3);
            indices.push(n1, n3, n4);
          }
        }
      }
    });
    
    // 设置几何体属性
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  }, [getColorFromValue, renderConfig.autoScale, colorScale]);

  // 更新网格渲染
  const updateMeshRender = useCallback((data: VisualizationData) => {
    if (!sceneRef.current) return;
    
  const startTime = (typeof window !== 'undefined' && window.performance ? window.performance.now() : Date.now());
    
    // 移除旧网格
    if (meshRef.current) {
      sceneRef.current.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      if (Array.isArray(meshRef.current.material)) {
        meshRef.current.material.forEach(material => material.dispose());
      } else {
        meshRef.current.material.dispose();
      }
    }
    
    // 创建新几何体
    const geometry = createMeshGeometry(data);
    
    // 创建材质
    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      transparent: renderConfig.transparency < 1.0,
      opacity: renderConfig.transparency,
      wireframe: renderConfig.wireframe,
      side: THREE.DoubleSide
    });
    
    // 创建网格
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = renderConfig.renderQuality === 'ultra';
    mesh.receiveShadow = renderConfig.renderQuality === 'ultra';
    
    meshRef.current = mesh;
    sceneRef.current.add(mesh);
    
    // 更新性能指标
  const updateTime = (typeof window !== 'undefined' && window.performance ? window.performance.now() : Date.now()) - startTime;
    const triCount = geometry.getIndex() ? geometry.getIndex()!.count / 3 : 0;
    setPerformance(prev => ({
      ...prev,
      triangles: triCount,
      lastUpdateTime: updateTime
    }));
    
    console.log(`🎨 云图更新完成: ${geometry.attributes.position.count}顶点, ${triCount}三角形, ${updateTime.toFixed(2)}ms`);
  }, [createMeshGeometry, renderConfig.transparency, renderConfig.wireframe, renderConfig.renderQuality]);

  // 渲染循环
  const animate = useCallback(() => {
    if (!isPlaying || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
      return;
    }
    
  const frameStart = (typeof window !== 'undefined' && window.performance ? window.performance.now() : Date.now());
    
    // 自动旋转
    if (autoRotate && meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
    
    // 渲染
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    
    // 性能统计
  const frameTime = (typeof window !== 'undefined' && window.performance ? window.performance.now() : Date.now()) - frameStart;
    const fps = 1000 / frameTime;
    
    setPerformance(prev => {
      const newMetrics = {
        ...prev,
        fps: Math.round(fps * 10) / 10,
        frameTime: Math.round(frameTime * 100) / 100,
        drawCalls: rendererRef.current?.info.render.calls || 0,
        memoryUsage: rendererRef.current?.info.memory.geometries || 0
      };
      
      onPerformanceUpdate?.(newMetrics);
      return newMetrics;
    });
    
    animationIdRef.current = requestAnimationFrame(animate);
  }, [isPlaying, autoRotate, onPerformanceUpdate]);

  // 初始化效果
  useEffect(() => {
    initializeScene();
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      deepDispose(sceneRef.current as any);
      if (rendererRef.current) {
        safeDetachRenderer(rendererRef.current as any);
      }
    };
  }, [initializeScene]);

  // 数据更新效果
  useEffect(() => {
    if (data && sceneRef.current) {
      updateMeshRender(data);
    }
  }, [data, updateMeshRender]);

  // 启动渲染循环
  useEffect(() => {
    if (isPlaying) {
      animate();
    } else {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    }
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isPlaying, animate]);

  // 配置更新效果
  useEffect(() => {
    if (data) {
      updateMeshRender(data);
    }
  }, [renderConfig, updateMeshRender]);

  // 控制函数
  const togglePlayPause = () => setIsPlaying(!isPlaying);
  const resetView = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(10, 10, 10);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      
      {/* 控制面板 */}
      <Card 
        title={
          <Space>
            <EyeOutlined />
            <Text strong>实时云图渲染器</Text>
            <Tag color={isPlaying ? 'green' : 'orange'}>
              {isPlaying ? '渲染中' : '已暂停'}
            </Tag>
          </Space>
        }
        extra={
          <Space>
            <Button 
              icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={togglePlayPause}
            >
              {isPlaying ? '暂停' : '播放'}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={resetView}>
              重置视角
            </Button>
          </Space>
        }
        size="small"
      >
        <Row gutter={16}>
          <Col span={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>颜色方案: </Text>
                <Select 
                  value={renderConfig.colorScheme}
                  onChange={(value) => setRenderConfig(prev => ({ ...prev, colorScheme: value }))}
                  style={{ width: 120 }}
                  size="small"
                >
                  <Option value="jet">Jet</Option>
                  <Option value="rainbow">Rainbow</Option>
                  <Option value="cool">Cool</Option>
                  <Option value="hot">Hot</Option>
                  <Option value="viridis">Viridis</Option>
                </Select>
              </div>
              
              <div>
                <Text strong>渲染质量: </Text>
                <Select 
                  value={renderConfig.renderQuality}
                  onChange={(value) => setRenderConfig(prev => ({ ...prev, renderQuality: value }))}
                  style={{ width: 120 }}
                  size="small"
                >
                  <Option value="low">低</Option>
                  <Option value="medium">中</Option>
                  <Option value="high">高</Option>
                  <Option value="ultra">极致</Option>
                </Select>
              </div>
            </Space>
          </Col>
          
          <Col span={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>透明度: </Text>
                <Slider
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  value={renderConfig.transparency}
                  onChange={(value) => setRenderConfig(prev => ({ ...prev, transparency: value }))}
                  style={{ width: 120 }}
                />
              </div>
              
              <div>
                <Text strong>线框模式: </Text>
                <Switch
                  checked={renderConfig.wireframe}
                  onChange={(checked) => setRenderConfig(prev => ({ ...prev, wireframe: checked }))}
                  size="small"
                />
              </div>
            </Space>
          </Col>
          
          <Col span={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>自动缩放: </Text>
                <Switch
                  checked={renderConfig.autoScale}
                  onChange={(checked) => setRenderConfig(prev => ({ ...prev, autoScale: checked }))}
                  size="small"
                />
              </div>
              
              <div>
                <Text strong>显示网格: </Text>
                <Switch
                  checked={renderConfig.showMesh}
                  onChange={(checked) => setRenderConfig(prev => ({ ...prev, showMesh: checked }))}
                  size="small"
                />
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 性能监控 */}
      <Card title="🔥 渲染性能监控" size="small">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="FPS"
              value={performance.fps}
              precision={1}
              valueStyle={{ color: performance.fps > 30 ? '#52c41a' : performance.fps > 15 ? '#faad14' : '#ff4d4f' }}
              prefix={<ThunderboltOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="帧时间"
              value={performance.frameTime}
              precision={2}
              suffix="ms"
              valueStyle={{ color: performance.frameTime < 16 ? '#52c41a' : '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="三角形数"
              value={performance.triangles}
              formatter={(value) => Number(value).toLocaleString()}
              prefix={<BarChartOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="绘制调用"
              value={performance.drawCalls}
            />
          </Col>
        </Row>
      </Card>

      {/* 渲染区域 */}
      <Card 
        title={data ? `${data.metadata.fieldName} (${data.metadata.unit})` : "等待数据..."} 
        style={{ textAlign: 'center' }}
      >
        {!data && (
          <Alert
            message="等待可视化数据"
            description="请加载网格数据和计算结果进行云图渲染"
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
            overflow: 'hidden'
          }} 
        />
        
        {data && (
          <div style={{ marginTop: '8px' }}>
            <Text type="secondary">
              数值范围: {colorScale.min.toFixed(3)} ~ {colorScale.max.toFixed(3)} {data.metadata.unit}
            </Text>
          </div>
        )}
      </Card>

    </Space>
  );
};

export default RealtimeCloudRenderer;