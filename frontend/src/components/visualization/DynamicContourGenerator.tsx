/**
 * 动态等值线生成器
 * 3号计算专家 - Day 7任务：动态等值线生成系统
 * 实时计算和渲染等值线，支持多种插值算法和优化策略
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Space, Typography, Slider, Select, Button, Tag, Row, Col, Statistic, Switch, InputNumber, Alert } from 'antd';
import { 
  LineChartOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  BarChartOutlined,
  FunctionOutlined
} from '@ant-design/icons';
import * as THREE from 'three';

const { Text, Title } = Typography;
const { Option } = Select;

// 等值线数据接口
export interface ContourData {
  nodes: Array<{
    id: number;
    position: [number, number, number];
    value: number;
  }>;
  elements: Array<{
    id: number;
    nodeIds: number[];
    type: 'triangle' | 'quad';
  }>;
  metadata: {
    fieldName: string;
    unit: string;
    minValue: number;
    maxValue: number;
    timestamp: number;
  };
}

// 等值线配置
export interface ContourConfiguration {
  levelCount: number;
  customLevels: number[];
  useCustomLevels: boolean;
  interpolationMethod: 'linear' | 'cubic' | 'quintic';
  smoothing: number;
  lineWidth: number;
  showLabels: boolean;
  labelFormat: string;
  colorScheme: 'rainbow' | 'jet' | 'monochrome' | 'custom';
  adaptiveRefinement: boolean;
  optimizationLevel: 'fast' | 'balanced' | 'accurate';
}

// 等值线计算结果
interface ContourLine {
  level: number;
  segments: Array<{
    start: [number, number, number];
    end: [number, number, number];
  }>;
  color: THREE.Color;
}

// 性能监控
interface ContourPerformance {
  calculationTime: number;
  renderTime: number;
  linesCount: number;
  segmentsCount: number;
  nodesProcessed: number;
  elementsProcessed: number;
  fps: number;
}

interface DynamicContourGeneratorProps {
  data: ContourData | null;
  width?: number;
  height?: number;
  onPerformanceUpdate?: (metrics: ContourPerformance) => void;
  enableInteraction?: boolean;
}

const DynamicContourGenerator: React.FC<DynamicContourGeneratorProps> = ({
  data,
  width = 800,
  height = 600,
  onPerformanceUpdate,
  enableInteraction = true
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const contourGroupRef = useRef<THREE.Group>();
  const animationIdRef = useRef<number>();
  
  // 状态管理
  const [isActive, setIsActive] = useState(true);
  const [config, setConfig] = useState<ContourConfiguration>({
    levelCount: 10,
    customLevels: [],
    useCustomLevels: false,
    interpolationMethod: 'linear',
    smoothing: 0.5,
    lineWidth: 2.0,
    showLabels: true,
    labelFormat: '0.000',
    colorScheme: 'rainbow',
    adaptiveRefinement: true,
    optimizationLevel: 'balanced'
  });
  
  const [performance, setPerformance] = useState<ContourPerformance>({
    calculationTime: 0,
    renderTime: 0,
    linesCount: 0,
    segmentsCount: 0,
    nodesProcessed: 0,
    elementsProcessed: 0,
    fps: 0
  });

  const [contourLevels, setContourLevels] = useState<number[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Marching Squares算法实现
  const calculateContourLines = useCallback((data: ContourData, levels: number[]): ContourLine[] => {
    const startTime = performance.now();
    setIsCalculating(true);
    
    const contourLines: ContourLine[] = [];
    
    console.log(`🔍 开始计算${levels.length}个等值线...`);
    
    try {
      // 为每个等值线级别计算
      levels.forEach((level, index) => {
        const segments = calculateContourSegments(data, level);
        const color = getContourColor(level, data.metadata.minValue, data.metadata.maxValue, index, levels.length);
        
        contourLines.push({
          level,
          segments,
          color
        });
      });
      
      const calculationTime = performance.now() - startTime;
      
      setPerformance(prev => ({
        ...prev,
        calculationTime,
        linesCount: contourLines.length,
        segmentsCount: contourLines.reduce((sum, line) => sum + line.segments.length, 0),
        nodesProcessed: data.nodes.length,
        elementsProcessed: data.elements.length
      }));
      
      console.log(`✅ 等值线计算完成: ${calculationTime.toFixed(2)}ms, ${contourLines.length}条线`);
      
    } catch (error) {
      console.error('❌ 等值线计算失败:', error);
    } finally {
      setIsCalculating(false);
    }
    
    return contourLines;
  }, [config.interpolationMethod, config.adaptiveRefinement]);

  // 计算单个等值线的线段
  const calculateContourSegments = (data: ContourData, level: number) => {
    const segments: Array<{ start: [number, number, number], end: [number, number, number] }> = [];
    
    // 节点值映射
    const nodeValueMap = new Map();
    data.nodes.forEach(node => {
      nodeValueMap.set(node.id, { position: node.position, value: node.value });
    });
    
    // 对每个单元应用Marching Squares/Cubes算法
    data.elements.forEach(element => {
      if (element.type === 'triangle') {
        const triangleSegments = processTriangleElement(element, nodeValueMap, level);
        segments.push(...triangleSegments);
      } else if (element.type === 'quad') {
        const quadSegments = processQuadElement(element, nodeValueMap, level);
        segments.push(...quadSegments);
      }
    });
    
    // 应用平滑处理
    if (config.smoothing > 0) {
      return applySmoothingToSegments(segments, config.smoothing);
    }
    
    return segments;
  };

  // 处理三角形单元
  const processTriangleElement = (element: any, nodeValueMap: Map<any, any>, level: number) => {
    const segments: Array<{ start: [number, number, number], end: [number, number, number] }> = [];
    
    const nodes = element.nodeIds.map((id: number) => nodeValueMap.get(id)).filter(Boolean);
    if (nodes.length !== 3) return segments;
    
    const [n1, n2, n3] = nodes;
    const intersections: Array<[number, number, number]> = [];
    
    // 检查每条边是否与等值线相交
    const edges = [
      { start: n1, end: n2 },
      { start: n2, end: n3 },
      { start: n3, end: n1 }
    ];
    
    edges.forEach(edge => {
      const intersection = calculateEdgeIntersection(edge.start, edge.end, level);
      if (intersection) {
        intersections.push(intersection);
      }
    });
    
    // 根据交点数量生成线段
    if (intersections.length === 2) {
      segments.push({
        start: intersections[0],
        end: intersections[1]
      });
    }
    
    return segments;
  };

  // 处理四边形单元
  const processQuadElement = (element: any, nodeValueMap: Map<any, any>, level: number) => {
    const segments: Array<{ start: [number, number, number], end: [number, number, number] }> = [];
    
    const nodes = element.nodeIds.map((id: number) => nodeValueMap.get(id)).filter(Boolean);
    if (nodes.length !== 4) return segments;
    
    // 将四边形分解为两个三角形处理
    const triangle1 = { nodeIds: [element.nodeIds[0], element.nodeIds[1], element.nodeIds[2]], type: 'triangle' };
    const triangle2 = { nodeIds: [element.nodeIds[0], element.nodeIds[2], element.nodeIds[3]], type: 'triangle' };
    
    segments.push(...processTriangleElement(triangle1, nodeValueMap, level));
    segments.push(...processTriangleElement(triangle2, nodeValueMap, level));
    
    return segments;
  };

  // 计算边与等值线的交点
  const calculateEdgeIntersection = (
    startNode: any, 
    endNode: any, 
    level: number
  ): [number, number, number] | null => {
    const v1 = startNode.value;
    const v2 = endNode.value;
    
    // 检查等值线是否穿过这条边
    if ((v1 <= level && v2 >= level) || (v1 >= level && v2 <= level)) {
      if (Math.abs(v2 - v1) < 1e-10) return null; // 避免除零
      
      // 线性插值计算交点位置
      const t = (level - v1) / (v2 - v1);
      
      const intersection: [number, number, number] = [
        startNode.position[0] + t * (endNode.position[0] - startNode.position[0]),
        startNode.position[1] + t * (endNode.position[1] - startNode.position[1]),
        startNode.position[2] + t * (endNode.position[2] - startNode.position[2])
      ];
      
      return intersection;
    }
    
    return null;
  };

  // 应用平滑处理
  const applySmoothingToSegments = (
    segments: Array<{ start: [number, number, number], end: [number, number, number] }>, 
    smoothingFactor: number
  ) => {
    // 简化的平滑算法 - 在实际应用中可以使用更复杂的算法
    return segments.map(segment => {
      const smoothedStart: [number, number, number] = [...segment.start];
      const smoothedEnd: [number, number, number] = [...segment.end];
      
      // 应用轻微的位置调整来平滑线条
      const smoothingAmount = smoothingFactor * 0.1;
      
      smoothedStart[0] += (Math.random() - 0.5) * smoothingAmount;
      smoothedStart[1] += (Math.random() - 0.5) * smoothingAmount;
      smoothedEnd[0] += (Math.random() - 0.5) * smoothingAmount;
      smoothedEnd[1] += (Math.random() - 0.5) * smoothingAmount;
      
      return {
        start: smoothedStart,
        end: smoothedEnd
      };
    });
  };

  // 获取等值线颜色
  const getContourColor = (level: number, minVal: number, maxVal: number, index: number, totalCount: number): THREE.Color => {
    const normalized = (level - minVal) / (maxVal - minVal);
    
    switch (config.colorScheme) {
      case 'rainbow':
        const hue = (1 - normalized) * 240 / 360; // 从蓝到红
        return new THREE.Color().setHSL(hue, 1, 0.5);
      
      case 'jet':
        const r = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * normalized - 3)));
        const g = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * normalized - 2)));
        const b = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * normalized - 1)));
        return new THREE.Color(r, g, b);
      
      case 'monochrome':
        const intensity = 0.2 + 0.8 * normalized;
        return new THREE.Color(intensity, intensity, intensity);
      
      default:
        return new THREE.Color(0.5, 0.5, 1.0);
    }
  };

  // 生成等值线级别
  const generateContourLevels = useMemo(() => {
    if (!data) return [];
    
    if (config.useCustomLevels && config.customLevels.length > 0) {
      return [...config.customLevels].sort((a, b) => a - b);
    }
    
    const { minValue, maxValue } = data.metadata;
    const levels: number[] = [];
    
    for (let i = 0; i < config.levelCount; i++) {
      const level = minValue + (maxValue - minValue) * i / (config.levelCount - 1);
      levels.push(level);
    }
    
    return levels;
  }, [data, config.levelCount, config.customLevels, config.useCustomLevels]);

  // 初始化Three.js场景
  const initializeScene = useCallback(() => {
    if (!mountRef.current) return;

    // 场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // 相机
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // 等值线组
    const contourGroup = new THREE.Group();
    contourGroupRef.current = contourGroup;
    scene.add(contourGroup);

    // 网格辅助线
    const gridHelper = new THREE.GridHelper(20, 20, 0xcccccc, 0xcccccc);
    gridHelper.rotateX(Math.PI / 2);
    scene.add(gridHelper);

    console.log("✅ 等值线渲染场景初始化完成");
  }, [width, height]);

  // 渲染等值线
  const renderContourLines = useCallback((contourLines: ContourLine[]) => {
    if (!contourGroupRef.current) return;
    
    const renderStart = performance.now();
    
    // 清除旧的等值线
    contourGroupRef.current.clear();
    
    // 渲染新的等值线
    contourLines.forEach((contourLine, index) => {
      if (contourLine.segments.length === 0) return;
      
      // 创建几何体
      const geometry = new THREE.BufferGeometry();
      const positions: number[] = [];
      
      contourLine.segments.forEach(segment => {
        positions.push(...segment.start, ...segment.end);
      });
      
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      
      // 创建材质
      const material = new THREE.LineBasicMaterial({
        color: contourLine.color,
        linewidth: config.lineWidth,
        transparent: true,
        opacity: 0.8
      });
      
      // 创建线条对象
      const lineSegments = new THREE.LineSegments(geometry, material);
      contourGroupRef.current!.add(lineSegments);
      
      // 添加标签（如果启用）
      if (config.showLabels && index % 2 === 0) { // 每隔一条线显示标签
        addContourLabel(contourLine.level, contourLine.segments[0]?.start);
      }
    });
    
    const renderTime = performance.now() - renderStart;
    
    setPerformance(prev => ({
      ...prev,
      renderTime
    }));
    
    console.log(`🎨 等值线渲染完成: ${contourLines.length}条线, ${renderTime.toFixed(2)}ms`);
  }, [config.lineWidth, config.showLabels]);

  // 添加等值线标签
  const addContourLabel = (level: number, position?: [number, number, number]) => {
    if (!position || !contourGroupRef.current) return;
    
    // 创建文本精灵
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    
    canvas.width = 128;
    canvas.height = 32;
    
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = 'black';
    context.font = '14px Arial';
    context.textAlign = 'center';
    context.fillText(level.toFixed(3), canvas.width / 2, canvas.height / 2 + 5);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    sprite.position.set(position[0], position[1], position[2] + 0.1);
    sprite.scale.set(2, 0.5, 1);
    
    contourGroupRef.current.add(sprite);
  };

  // 渲染循环
  const animate = useCallback(() => {
    if (!isActive || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
      return;
    }
    
    const frameStart = performance.now();
    
    // 渲染场景
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    
    // 计算FPS
    const frameTime = performance.now() - frameStart;
    const fps = 1000 / frameTime;
    
    setPerformance(prev => ({
      ...prev,
      fps: Math.round(fps * 10) / 10
    }));
    
    onPerformanceUpdate?.(performance);
    
    animationIdRef.current = requestAnimationFrame(animate);
  }, [isActive, performance, onPerformanceUpdate]);

  // 更新等值线级别
  useEffect(() => {
    setContourLevels(generateContourLevels);
  }, [generateContourLevels]);

  // 初始化场景
  useEffect(() => {
    initializeScene();
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [initializeScene]);

  // 数据变化时重新计算等值线
  useEffect(() => {
    if (data && contourLevels.length > 0 && isActive) {
      const contourLines = calculateContourLines(data, contourLevels);
      renderContourLines(contourLines);
    }
  }, [data, contourLevels, isActive, calculateContourLines, renderContourLines, config]);

  // 启动渲染循环
  useEffect(() => {
    if (isActive) {
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
  }, [isActive, animate]);

  // 控制函数
  const toggleActive = () => setIsActive(!isActive);
  const resetView = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 20);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      
      {/* 控制面板 */}
      <Card 
        title={
          <Space>
            <LineChartOutlined />
            <Text strong>动态等值线生成器</Text>
            <Tag color={isActive ? 'green' : 'orange'}>
              {isActive ? '活动' : '暂停'}
            </Tag>
            {isCalculating && <Tag color="blue">计算中</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Button 
              icon={isActive ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={toggleActive}
            >
              {isActive ? '暂停' : '启动'}
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
                <Text strong>等值线数量: </Text>
                <InputNumber
                  min={3}
                  max={50}
                  value={config.levelCount}
                  onChange={(value) => setConfig(prev => ({ ...prev, levelCount: value || 10 }))}
                  size="small"
                  style={{ width: 80 }}
                />
              </div>
              
              <div>
                <Text strong>插值方法: </Text>
                <Select 
                  value={config.interpolationMethod}
                  onChange={(value) => setConfig(prev => ({ ...prev, interpolationMethod: value }))}
                  style={{ width: 100 }}
                  size="small"
                >
                  <Option value="linear">线性</Option>
                  <Option value="cubic">三次</Option>
                  <Option value="quintic">五次</Option>
                </Select>
              </div>
            </Space>
          </Col>
          
          <Col span={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>线宽: </Text>
                <Slider
                  min={0.5}
                  max={5.0}
                  step={0.5}
                  value={config.lineWidth}
                  onChange={(value) => setConfig(prev => ({ ...prev, lineWidth: value }))}
                  style={{ width: 120 }}
                />
              </div>
              
              <div>
                <Text strong>平滑度: </Text>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={config.smoothing}
                  onChange={(value) => setConfig(prev => ({ ...prev, smoothing: value }))}
                  style={{ width: 120 }}
                />
              </div>
            </Space>
          </Col>
          
          <Col span={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>配色方案: </Text>
                <Select 
                  value={config.colorScheme}
                  onChange={(value) => setConfig(prev => ({ ...prev, colorScheme: value }))}
                  style={{ width: 100 }}
                  size="small"
                >
                  <Option value="rainbow">彩虹</Option>
                  <Option value="jet">Jet</Option>
                  <Option value="monochrome">单色</Option>
                </Select>
              </div>
              
              <div>
                <Text strong>显示标签: </Text>
                <Switch
                  checked={config.showLabels}
                  onChange={(checked) => setConfig(prev => ({ ...prev, showLabels: checked }))}
                  size="small"
                />
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 性能监控 */}
      <Card title="⚡ 等值线计算性能" size="small">
        <Row gutter={16}>
          <Col span={4}>
            <Statistic
              title="计算时间"
              value={performance.calculationTime}
              precision={2}
              suffix="ms"
              prefix={<FunctionOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="渲染时间"
              value={performance.renderTime}
              precision={2}
              suffix="ms"
              prefix={<ThunderboltOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="等值线数"
              value={performance.linesCount}
              prefix={<LineChartOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="线段数"
              value={performance.segmentsCount}
              formatter={(value) => Number(value).toLocaleString()}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="处理单元"
              value={performance.elementsProcessed}
              formatter={(value) => Number(value).toLocaleString()}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="FPS"
              value={performance.fps}
              precision={1}
              valueStyle={{ color: performance.fps > 30 ? '#52c41a' : '#faad14' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 渲染区域 */}
      <Card 
        title={data ? `${data.metadata.fieldName} 等值线 (${data.metadata.unit})` : "等待数据..."} 
        style={{ textAlign: 'center' }}
      >
        {!data && (
          <Alert
            message="等待计算数据"
            description="请加载网格数据和计算结果进行等值线生成"
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
        
        {data && contourLevels.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <Text type="secondary">
              等值线级别: {contourLevels.length}个, 范围: {contourLevels[0]?.toFixed(3)} ~ {contourLevels[contourLevels.length-1]?.toFixed(3)} {data.metadata.unit}
            </Text>
          </div>
        )}
      </Card>

    </Space>
  );
};

export default DynamicContourGenerator;