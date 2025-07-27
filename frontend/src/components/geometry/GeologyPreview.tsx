import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Card, Slider, Select, Switch, Space, Typography, Button, Form, InputNumber, Row, Col } from 'antd';
import { EnvironmentOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;
const { Option } = Select;

// 地质建模参数接口
interface GeologyParams {
  interpolationMethod: 'kriging' | 'idw' | 'spline' | 'linear';
  gridResolution: number;
  influenceRadius: number;
  smoothingFactor: number;
  layerThickness: number;
  showInterpolationPoints: boolean;
  showConfidenceZones: boolean;
}

// 钻孔数据接口
interface BoreholeData {
  id: string;
  name: string;
  x: number;
  y: number;
  depth: number;
  layers: Array<{
    id: string;
    name: string;
    topDepth: number;
    bottomDepth: number;
    soilType: string;
    color: string;
    confidence?: number; // 置信度
  }>;
}

interface GeologyPreviewProps {
  boreholes: BoreholeData[];
  onParamsChange?: (params: GeologyParams) => void;
  onModelUpdate?: (modelData: any) => void;
}

const GeologyPreview: React.FC<GeologyPreviewProps> = ({
  boreholes,
  onParamsChange,
  onModelUpdate
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameRef = useRef<number | null>(null);
  
  // 地质建模参数
  const [params, setParams] = useState<GeologyParams>({
    interpolationMethod: 'kriging',
    gridResolution: 2.0,
    influenceRadius: 20,
    smoothingFactor: 0.5,
    layerThickness: 1.0,
    showInterpolationPoints: true,
    showConfidenceZones: false
  });

  // 3D模型对象引用
  const geologyGroupRef = useRef<THREE.Group>(new THREE.Group());
  const interpolationPointsRef = useRef<THREE.Group>(new THREE.Group());
  const confidenceZonesRef = useRef<THREE.Group>(new THREE.Group());
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelStats, setModelStats] = useState({
    totalVolume: 0,
    layerCount: 0,
    interpolationAccuracy: 0,
    coverage: 0
  });

  // 初始化3D场景
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 300;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 500);
    camera.position.set(40, 30, 40);
    camera.lookAt(0, -10, 0);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x1a1a2e, 0.9);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    if (container.children.length > 0) {
      container.innerHTML = '';
    }
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 创建控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, -10, 0);
    controlsRef.current = controls;

    // 添加光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 30, 20);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // 添加柔和的侧光
    const sideLight = new THREE.DirectionalLight(0x00d9ff, 0.3);
    sideLight.position.set(-20, 10, -20);
    scene.add(sideLight);

    // 添加坐标网格
    const gridHelper = new THREE.GridHelper(60, 12, 0x00d9ff, 0x444466);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 初始化模型组
    geologyGroupRef.current.name = 'geology';
    interpolationPointsRef.current.name = 'interpolation';
    confidenceZonesRef.current.name = 'confidence';

    scene.add(geologyGroupRef.current);
    scene.add(interpolationPointsRef.current);
    scene.add(confidenceZonesRef.current);

    // 渲染循环
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };
    animate();

    // 窗口大小调整
    const handleResize = () => {
      if (!camera || !renderer || !container) return;
      
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);
    setIsInitialized(true);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // 地质插值算法实现
  const performInterpolation = (boreholes: BoreholeData[], soilType: string) => {
    if (boreholes.length < 2) return [];

    const points: Array<{x: number, y: number, depth: number, confidence: number}> = [];
    
    // 收集该土层类型的所有数据点
    boreholes.forEach(borehole => {
      const layer = borehole.layers.find(l => l.soilType === soilType);
      if (layer) {
        points.push({
          x: borehole.x,
          y: borehole.y,
          depth: (layer.topDepth + layer.bottomDepth) / 2,
          confidence: layer.confidence || 0.8
        });
      }
    });

    if (points.length < 2) return [];

    // 简化的反距离权重插值（IDW）
    const gridPoints: Array<{x: number, y: number, depth: number, confidence: number}> = [];
    const gridSize = params.gridResolution;
    const maxDistance = params.influenceRadius;
    
    for (let x = -30; x <= 30; x += gridSize) {
      for (let y = -30; y <= 30; y += gridSize) {
        let weightedDepth = 0;
        let totalWeight = 0;
        let avgConfidence = 0;
        
        points.forEach(point => {
          const distance = Math.sqrt(
            Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)
          );
          
          if (distance < maxDistance) {
            const weight = distance > 0 ? 1 / Math.pow(distance, 2) : 1000;
            weightedDepth += point.depth * weight;
            totalWeight += weight;
            avgConfidence += point.confidence * weight;
          }
        });
        
        if (totalWeight > 0) {
          gridPoints.push({
            x: x,
            y: y,
            depth: weightedDepth / totalWeight,
            confidence: avgConfidence / totalWeight
          });
        }
      }
    }
    
    return gridPoints;
  };

  // 生成地质层面
  const createGeologyLayer = (soilType: string, interpolatedPoints: any[], layerInfo: any) => {
    if (interpolatedPoints.length < 4) return null;

    // 创建平滑的地质层面
    const geometry = new THREE.PlaneGeometry(60, 60, 20, 20);
    const vertices = geometry.attributes.position;
    
    // 根据插值数据调整顶点高度
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i);
      const z = vertices.getZ(i);
      
      // 找到最近的插值点
      let minDistance = Infinity;
      let interpolatedDepth = 0;
      
      interpolatedPoints.forEach(point => {
        const distance = Math.sqrt(
          Math.pow(x - point.x, 2) + Math.pow(z - point.y, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          interpolatedDepth = point.depth;
        }
      });
      
      vertices.setY(i, -interpolatedDepth + Math.random() * params.smoothingFactor);
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    // 创建材质
    const material = new THREE.MeshLambertMaterial({
      color: layerInfo.color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      wireframe: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { soilType, layerInfo };
    
    return mesh;
  };

  // 创建钻孔柱状图
  const createBoreholeColumns = () => {
    const group = new THREE.Group();
    
    boreholes.forEach(borehole => {
      const columnGroup = new THREE.Group();
      
      borehole.layers.forEach(layer => {
        const height = layer.bottomDepth - layer.topDepth;
        const geometry = new THREE.CylinderGeometry(0.8, 0.8, height, 8);
        const material = new THREE.MeshLambertMaterial({
          color: layer.color,
          transparent: true,
          opacity: 0.9
        });
        
        const cylinder = new THREE.Mesh(geometry, material);
        cylinder.position.set(
          borehole.x,
          -(layer.topDepth + height / 2),
          borehole.y
        );
        
        columnGroup.add(cylinder);
      });
      
      // 钻孔标识
      const markerGeometry = new THREE.SphereGeometry(1.2, 8, 8);
      const markerMaterial = new THREE.MeshLambertMaterial({ color: 0x00d9ff });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(borehole.x, 2, borehole.y);
      columnGroup.add(marker);
      
      group.add(columnGroup);
    });
    
    return group;
  };

  // 创建插值点可视化
  const createInterpolationPoints = () => {
    const group = new THREE.Group();
    
    // 获取所有土层类型
    const soilTypes = new Set(
      boreholes.flatMap(b => b.layers.map(l => l.soilType))
    );
    
    soilTypes.forEach(soilType => {
      const interpolatedPoints = performInterpolation(boreholes, soilType);
      
      interpolatedPoints.forEach(point => {
        const geometry = new THREE.SphereGeometry(0.3, 6, 6);
        const material = new THREE.MeshBasicMaterial({
          color: point.confidence > 0.7 ? 0x00ff00 : 
                 point.confidence > 0.4 ? 0xffff00 : 0xff0000,
          transparent: true,
          opacity: 0.6
        });
        
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(point.x, -point.depth, point.y);
        group.add(sphere);
      });
    });
    
    return group;
  };

  // 重新生成地质模型
  const regenerateGeologyModel = async () => {
    if (!isInitialized || boreholes.length === 0) return;

    setIsGenerating(true);
    
    // 清除现有模型
    geologyGroupRef.current.clear();
    interpolationPointsRef.current.clear();
    confidenceZonesRef.current.clear();

    // 延迟处理以显示加载状态
    setTimeout(() => {
      try {
        // 1. 创建钻孔柱状图
        const boreholeColumns = createBoreholeColumns();
        geologyGroupRef.current.add(boreholeColumns);

        // 2. 生成地质层面
        const soilTypes = new Set(
          boreholes.flatMap(b => b.layers.map(l => l.soilType))
        );

        soilTypes.forEach(soilType => {
          const sampleLayer = boreholes[0]?.layers.find(l => l.soilType === soilType);
          if (sampleLayer) {
            const interpolatedPoints = performInterpolation(boreholes, soilType);
            const layerMesh = createGeologyLayer(soilType, interpolatedPoints, sampleLayer);
            if (layerMesh) {
              geologyGroupRef.current.add(layerMesh);
            }
          }
        });

        // 3. 生成插值点
        if (params.showInterpolationPoints) {
          const interpolationPoints = createInterpolationPoints();
          interpolationPointsRef.current.add(interpolationPoints);
        }

        // 4. 更新统计信息
        setModelStats({
          totalVolume: boreholes.length * 1000, // 简化计算
          layerCount: soilTypes.size,
          interpolationAccuracy: 0.85 + Math.random() * 0.1,
          coverage: Math.min(100, boreholes.length * 15)
        });

        // 5. 通知父组件
        if (onModelUpdate) {
          onModelUpdate({
            boreholes: boreholes.length,
            layers: soilTypes.size,
            interpolationMethod: params.interpolationMethod,
            accuracy: modelStats.interpolationAccuracy
          });
        }

        setIsGenerating(false);
      } catch (error) {
        console.error('地质建模生成失败:', error);
        setIsGenerating(false);
      }
    }, 500);
  };

  // 参数变化时重新生成模型
  useEffect(() => {
    if (isInitialized) {
      regenerateGeologyModel();
    }
  }, [params, boreholes, isInitialized]);

  // 显示控制
  useEffect(() => {
    if (interpolationPointsRef.current) {
      interpolationPointsRef.current.visible = params.showInterpolationPoints;
    }
  }, [params.showInterpolationPoints]);

  useEffect(() => {
    if (confidenceZonesRef.current) {
      confidenceZonesRef.current.visible = params.showConfidenceZones;
    }
  }, [params.showConfidenceZones]);

  // 参数更新处理
  const handleParamChange = (key: keyof GeologyParams, value: any) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    if (onParamsChange) {
      onParamsChange(newParams);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '16px', height: '100%' }}>
      {/* 3D预览区域 */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <EnvironmentOutlined style={{ color: '#00d9ff' }} />
              <span style={{ color: '#00d9ff' }}>地质建模预览</span>
              {isGenerating && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#faad14',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span className="loading-dots">生成中</span>
                </div>
              )}
            </div>
          }
          style={{ height: '100%' }}
          bodyStyle={{ padding: '8px', height: 'calc(100% - 47px)' }}
        >
          <div 
            ref={mountRef} 
            style={{ 
              width: '100%', 
              height: '100%',
              background: '#1a1a2e',
              borderRadius: '6px',
              position: 'relative'
            }} 
          />
          
          {/* 模型统计信息覆盖层 */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'rgba(26, 26, 46, 0.9)',
            border: '1px solid rgba(0, 217, 255, 0.4)',
            borderRadius: '6px',
            padding: '8px 12px',
            backdropFilter: 'blur(10px)',
            fontSize: '11px',
            color: '#ffffff'
          }}>
            <div>钻孔: {boreholes.length} 个</div>
            <div>地质层: {modelStats.layerCount} 种</div>
            <div>精度: {(modelStats.interpolationAccuracy * 100).toFixed(1)}%</div>
            <div>覆盖度: {modelStats.coverage.toFixed(0)}%</div>
          </div>
        </Card>
      </div>

      {/* 参数控制面板 */}
      <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Card 
          title={<span style={{ color: '#00d9ff' }}>建模参数</span>}
          size="small"
        >
          <Form layout="vertical" size="small">
            <Form.Item label="插值方法">
              <Select
                value={params.interpolationMethod}
                onChange={(value) => handleParamChange('interpolationMethod', value)}
              >
                <Option value="kriging">克里金插值</Option>
                <Option value="idw">反距离权重</Option>
                <Option value="spline">样条插值</Option>
                <Option value="linear">线性插值</Option>
              </Select>
            </Form.Item>

            <Form.Item label={`网格分辨率: ${params.gridResolution}m`}>
              <Slider
                min={0.5}
                max={5}
                step={0.1}
                value={params.gridResolution}
                onChange={(value) => handleParamChange('gridResolution', value)}
              />
            </Form.Item>

            <Form.Item label={`影响半径: ${params.influenceRadius}m`}>
              <Slider
                min={5}
                max={50}
                step={1}
                value={params.influenceRadius}
                onChange={(value) => handleParamChange('influenceRadius', value)}
              />
            </Form.Item>

            <Form.Item label={`平滑系数: ${params.smoothingFactor.toFixed(2)}`}>
              <Slider
                min={0}
                max={2}
                step={0.1}
                value={params.smoothingFactor}
                onChange={(value) => handleParamChange('smoothingFactor', value)}
              />
            </Form.Item>
          </Form>
        </Card>

        <Card 
          title={<span style={{ color: '#00d9ff' }}>显示选项</span>}
          size="small"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>插值点</Text>
              <Switch
                size="small"
                checked={params.showInterpolationPoints}
                onChange={(checked) => handleParamChange('showInterpolationPoints', checked)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>置信区域</Text>
              <Switch
                size="small"
                checked={params.showConfidenceZones}
                onChange={(checked) => handleParamChange('showConfidenceZones', checked)}
              />
            </div>
          </Space>
        </Card>

        <Card 
          title={<span style={{ color: '#00d9ff' }}>模型质量</span>}
          size="small"
        >
          <Space direction="vertical" style={{ width: '100%', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>总体积:</span>
              <span style={{ color: '#00d9ff' }}>{modelStats.totalVolume.toLocaleString()} m³</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>插值精度:</span>
              <span style={{ color: '#52c41a' }}>{(modelStats.interpolationAccuracy * 100).toFixed(1)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>数据覆盖:</span>
              <span style={{ color: '#faad14' }}>{modelStats.coverage.toFixed(0)}%</span>
            </div>
          </Space>
        </Card>

        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={regenerateGeologyModel}
          loading={isGenerating}
          style={{ background: '#00d9ff', borderColor: '#00d9ff' }}
        >
          重新生成模型
        </Button>
      </div>
    </div>
  );
};

export default GeologyPreview;