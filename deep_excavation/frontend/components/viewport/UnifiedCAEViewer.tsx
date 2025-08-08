/**
 * 统一CAE可视化组件
 * 整合: Three.js渲染 + PyVista数据 + 工作台切换 + 实时交互
 * 基于Fusion360云协作思想的现代化界面
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { GUI } from 'lil-gui';
import { 
  Card, 
  Tabs, 
  Button, 
  Slider, 
  Select, 
  Switch, 
  Space, 
  Typography,
  Progress,
  Tooltip,
  Divider
} from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  ReloadOutlined,
  SettingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  FullscreenOutlined
} from '@ant-design/icons';
import { useStore, GeologicalLayer } from '../../core/store'; // 导入 store 和 GeologicalLayer 类型

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// 工作台类型定义
enum WorkbenchType {
  PARAMETRIC_MODELING = 'parametric_modeling',
  GEOLOGICAL_MODELING = 'geological_modeling', 
  MESH_GENERATION = 'mesh_generation',
  ANALYSIS_SETUP = 'analysis_setup',
  POST_PROCESSING = 'post_processing'
}

// 可视化数据接口
interface VisualizationData {
  vertices: number[];
  faces: number[];
  scalars: number[];
  field_name: string;
  range: [number, number];
}

interface CAEResult {
  status: string;
  parametric_model?: any;
  geological_model?: any;
  mesh_model?: any;
  analysis_result?: any;
  visualization_data?: Record<string, VisualizationData>;
}

interface UnifiedCAEViewerProps {
  width?: number;
  height?: number;
  onWorkbenchChange?: (workbench: WorkbenchType) => void;
  onAnalysisStart?: (parameters: any) => Promise<CAEResult>;
}

const UnifiedCAEViewer: React.FC<UnifiedCAEViewerProps> = ({
  width = 800,
  height = 600,
  onWorkbenchChange,
  onAnalysisStart
}) => {
  // Three.js核心引用
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<OrbitControls>();
  const guiRef = useRef<GUI>();
  const geologicalGroupRef = useRef<THREE.Group>(new THREE.Group()); // 创建一个Group来管理地质模型

  // 状态管理
  const [currentWorkbench, setCurrentWorkbench] = useState<WorkbenchType>(
    WorkbenchType.PARAMETRIC_MODELING
  );
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [visualizationData, setVisualizationData] = useState<Record<string, VisualizationData>>({});
  const [activeField, setActiveField] = useState<string>('PRESSURE');
  const [colorMapRange, setColorMapRange] = useState<[number, number]>([0, 1]);
  const [showWireframe, setShowWireframe] = useState(false);
  const [meshOpacity, setMeshOpacity] = useState(0.8);

  // 可视化对象管理
  const [meshObjects, setMeshObjects] = useState<Map<string, THREE.Mesh>>(new Map());
  const [currentColorMap, setCurrentColorMap] = useState<THREE.DataTexture>();

  // 从Zustand Store获取状态和actions
  const geologicalModel = useStore(state => state.geologicalModel);
  
  // 初始化Three.js场景
  useEffect(() => {
    if (!mountRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // 将地质模型的分组添加到场景中
    scene.add(geologicalGroupRef.current);

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    );
    camera.position.set(50, 50, 50);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 添加到DOM
    mountRef.current.appendChild(renderer.domElement);

    // 创建控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // 添加光照
    setupLighting(scene);

    // 创建GUI控制面板
    setupGUI();

    // 渲染循环
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 清理函数
    return () => {
      // 安全卸载 renderer.domElement（仅当确为其父节点时）
      try {
        const mountNode = mountRef.current;
        const dom = renderer?.domElement;
        if (mountNode && dom && dom.parentNode === mountNode) {
          mountNode.removeChild(dom);
        }
        renderer?.dispose?.();
      } catch (e) {
        // 忽略卸载期间的偶发性错误，避免 NotFoundError 影响卸载流程
        console.warn('[UnifiedCAEViewer] cleanup warning:', e);
      }
      
      if (guiRef.current) {
        guiRef.current.destroy();
      }
    };
  }, [width, height]);

  // --- 监听地质模型数据的变化并更新场景 ---
  useEffect(() => {
      const group = geologicalGroupRef.current;
      if (!group) return;

      // 1. 清空旧的地质模型
      while (group.children.length > 0) {
          group.remove(group.children[0]);
      }
      
      if (!geologicalModel) {
          console.log("No geological model to display.");
          return;
      }

      console.log("Updating scene with new geological model:", geologicalModel);

      // 2. 遍历新的模型数据并创建网格
      geologicalModel.forEach(layer => {
          try {
              const geometry = new THREE.BufferGeometry();

              // 设置顶点和法线
              geometry.setAttribute('position', new THREE.Float32BufferAttribute(layer.geometry.vertices, 3));
              geometry.setAttribute('normal', new THREE.Float32BufferAttribute(layer.geometry.normals, 3));

              // 设置面索引
              geometry.setIndex(layer.geometry.faces);
              
              geometry.computeBoundingSphere();

              const material = new THREE.MeshStandardMaterial({
                  color: new THREE.Color(layer.color),
                  transparent: layer.opacity < 1.0,
                  opacity: layer.opacity,
                  side: THREE.DoubleSide, // 确保两面都可见
                  wireframe: showWireframe,
                  metalness: 0.2,
                  roughness: 0.8,
              });
              
              const mesh = new THREE.Mesh(geometry, material);
              mesh.name = layer.name;
              
              // 将网格添加到专门的分组中
              group.add(mesh);

          } catch (e) {
              console.error(`Error creating mesh for layer ${layer.name}:`, e);
          }
      });
      
  }, [geologicalModel, showWireframe]); // 当模型数据或线框模式变化时触发

  // 设置场景光照
  const setupLighting = (scene: THREE.Scene) => {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    // 方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // 点光源
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-50, 50, 50);
    scene.add(pointLight);
  };

  // 设置GUI控制面板
  const setupGUI = () => {
    const gui = new GUI({ container: mountRef.current! });
    guiRef.current = gui;

    // 可视化控制
    const visualFolder = gui.addFolder('可视化控制');
    
    const controls = {
      field: activeField,
      opacity: meshOpacity,
      wireframe: showWireframe,
      colorMapMin: colorMapRange[0],
      colorMapMax: colorMapRange[1]
    };

    visualFolder.add(controls, 'field', Object.keys(visualizationData)).onChange((value: string) => {
      setActiveField(value);
      updateVisualization(value);
    });

    visualFolder.add(controls, 'opacity', 0, 1, 0.1).onChange((value: number) => {
      setMeshOpacity(value);
      updateMeshOpacity(value);
    });

    visualFolder.add(controls, 'wireframe').onChange((value: boolean) => {
      setShowWireframe(value);
      // This will be handled by the useEffect that re-renders the model
    });

    visualFolder.add(controls, 'colorMapMin').onChange((value: number) => {
      setColorMapRange([value, colorMapRange[1]]);
      updateColorMap();
    });

    visualFolder.add(controls, 'colorMapMax').onChange((value: number) => {
      setColorMapRange([colorMapRange[0], value]);
      updateColorMap();
    });

    visualFolder.open();
  };

  const updateMeshOpacity = (opacity: number) => {
    geologicalGroupRef.current.children.forEach(child => {
      const mesh = child as THREE.Mesh;
      if (mesh.material && 'opacity' in mesh.material) {
        (mesh.material as THREE.Material & { opacity: number }).opacity = opacity;
        (mesh.material as THREE.Material).transparent = opacity < 1.0;
        mesh.material.needsUpdate = true;
      }
    });
  };

  // The main useEffect for geologicalModel now handles wireframe changes,
  // so a separate updateWireframeMode function is no longer needed.

  // 创建颜色映射纹理
  const createColorMapTexture = useCallback((field: string): THREE.DataTexture => {
    const data = visualizationData[field];
    if (!data) return new THREE.DataTexture(new Uint8Array([255, 0, 0, 255]), 1, 1);

    const width = 256;
    const height = 1;
    const size = width * height;
    const dataArray = new Uint8Array(4 * size);

    // 创建彩虹色彩映射
    for (let i = 0; i < size; i++) {
      const t = i / (size - 1);
      const hue = (1 - t) * 240; // 从蓝色到红色
      const color = new THREE.Color().setHSL(hue / 360, 1, 0.5);
      
      const stride = i * 4;
      dataArray[stride] = Math.floor(color.r * 255);
      dataArray[stride + 1] = Math.floor(color.g * 255);
      dataArray[stride + 2] = Math.floor(color.b * 255);
      dataArray[stride + 3] = 255;
    }

    const texture = new THREE.DataTexture(dataArray, width, height);
    texture.needsUpdate = true;
    return texture;
  }, [visualizationData]);

  // 从PyVista数据创建Three.js网格
  const createMeshFromVisualizationData = useCallback((field: string): THREE.Mesh | null => {
    const data = visualizationData[field];
    if (!data || !data.vertices || !data.faces) return null;

    // 创建几何体
    const geometry = new THREE.BufferGeometry();
    
    // 设置顶点
    const vertices = new Float32Array(data.vertices);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    // 设置面片索引
    const indices = new Uint32Array(data.faces);
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    // 设置标量数据作为颜色属性
    if (data.scalars && data.scalars.length > 0) {
      const scalars = new Float32Array(data.scalars);
      geometry.setAttribute('scalar', new THREE.BufferAttribute(scalars, 1));
    }

    // 计算法向量
    geometry.computeVertexNormals();

    // 创建材质
    const material = new THREE.ShaderMaterial({
      uniforms: {
        colorMap: { value: createColorMapTexture(field) },
        scalarMin: { value: data.range[0] },
        scalarMax: { value: data.range[1] },
        opacity: { value: meshOpacity }
      },
      vertexShader: `
        attribute float scalar;
        varying float vScalar;
        varying vec3 vNormal;
        
        void main() {
          vScalar = scalar;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D colorMap;
        uniform float scalarMin;
        uniform float scalarMax;
        uniform float opacity;
        
        varying float vScalar;
        varying vec3 vNormal;
        
        void main() {
          float normalizedScalar = (vScalar - scalarMin) / (scalarMax - scalarMin);
          normalizedScalar = clamp(normalizedScalar, 0.0, 1.0);
          
          vec3 color = texture2D(colorMap, vec2(normalizedScalar, 0.5)).rgb;
          
          // 简单光照
          vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
          float lightIntensity = max(dot(vNormal, lightDirection), 0.3);
          
          gl_FragColor = vec4(color * lightIntensity, opacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    // 创建网格
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }, [visualizationData, meshOpacity, createColorMapTexture]);

  // 更新可视化
  const updateVisualization = useCallback((field: string) => {
    if (!sceneRef.current) return;

    // 清除现有网格
    meshObjects.forEach((mesh) => {
      sceneRef.current!.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    meshObjects.clear();

    // 创建新网格
    const mesh = createMeshFromVisualizationData(field);
    if (mesh) {
      sceneRef.current.add(mesh);
      setMeshObjects(new Map([[field, mesh]]));
      
      // 更新颜色映射范围
      const data = visualizationData[field];
      if (data) {
        setColorMapRange(data.range);
      }
    }
  }, [visualizationData, meshObjects, createMeshFromVisualizationData]);

  // 更新颜色映射
  const updateColorMap = useCallback(() => {
    meshObjects.forEach((mesh, field) => {
      if (mesh.material instanceof THREE.ShaderMaterial) {
        mesh.material.uniforms.scalarMin.value = colorMapRange[0];
        mesh.material.uniforms.scalarMax.value = colorMapRange[1];
        mesh.material.uniforms.colorMap.value = createColorMapTexture(field);
      }
    });
  }, [meshObjects, colorMapRange, createColorMapTexture]);

  // 工作台切换处理
  const handleWorkbenchChange = (workbench: WorkbenchType) => {
    setCurrentWorkbench(workbench);
    onWorkbenchChange?.(workbench);
  };

  // 开始分析
  const handleStartAnalysis = async () => {
    if (!onAnalysisStart) return;

    setIsAnalysisRunning(true);
    setAnalysisProgress(0);

    try {
      // 模拟分析进度
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 1000);

      // 示例参数
      const parameters = {
        project_name: 'WebCAE_Analysis',
        excavation: { depth: 15, width: 20, length: 30 },
        analysis: { type: 'seepage' },
        mesh_settings: { global_mesh_size: 5.0 }
      };

      const result = await onAnalysisStart(parameters);
      
      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (result.status === 'success' && result.visualization_data) {
        setVisualizationData(result.visualization_data);
        
        // 自动显示第一个可用字段
        const firstField = Object.keys(result.visualization_data)[0];
        if (firstField) {
          setActiveField(firstField);
          setTimeout(() => updateVisualization(firstField), 100);
        }
      }
    } catch (error) {
      console.error('分析失败:', error);
    } finally {
      setIsAnalysisRunning(false);
    }
  };

  // 重置视图
  const resetView = useCallback(() => {
    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(50, 50, 50);
      controlsRef.current.reset();
    }
  }, []);

  // 工作台配置
  const workbenchConfig = {
    [WorkbenchType.PARAMETRIC_MODELING]: {
      title: '参数化建模',
      icon: '🏗️',
      description: '参数驱动的智能建模'
    },
    [WorkbenchType.GEOLOGICAL_MODELING]: {
      title: '地质建模', 
      icon: '🌍',
      description: 'GemPy地质建模引擎'
    },
    [WorkbenchType.MESH_GENERATION]: {
      title: '网格生成',
      icon: '🕸️', 
      description: 'Gmsh OCC高质量网格'
    },
    [WorkbenchType.ANALYSIS_SETUP]: {
      title: '分析设置',
      icon: '⚡',
      description: 'Kratos多物理场求解'
    },
    [WorkbenchType.POST_PROCESSING]: {
      title: '后处理',
      icon: '📊',
      description: 'PyVista可视化分析'
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 工作台选择器 */}
      <Card size="small" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tabs 
            activeKey={currentWorkbench} 
            onChange={(key: string) => handleWorkbenchChange(key as WorkbenchType)}
            size="small"
          >
            {Object.entries(workbenchConfig).map(([key, config]) => (
              <TabPane 
                tab={
                  <Tooltip title={config.description}>
                    <span>{config.icon} {config.title}</span>
                  </Tooltip>
                } 
                key={key} 
              />
            ))}
          </Tabs>
          
          <Space>
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />}
              loading={isAnalysisRunning}
              onClick={handleStartAnalysis}
            >
              {isAnalysisRunning ? '分析中...' : '开始分析'}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={resetView}>
              重置视图
            </Button>
            <Button icon={<FullscreenOutlined />}>
              全屏
            </Button>
          </Space>
        </div>
        
        {isAnalysisRunning && (
          <Progress 
            percent={analysisProgress} 
            size="small" 
            style={{ marginTop: 8 }}
          />
        )}
      </Card>

      {/* 主要内容区域 */}
      <div style={{ display: 'flex', flex: 1, gap: 8 }}>
        {/* 3D视图 */}
        <Card 
          title="CAE可视化视图" 
          style={{ flex: 1 }}
          bodyStyle={{ padding: 0, height: height - 120 }}
        >
          <div 
            ref={mountRef} 
            style={{ width: '100%', height: '100%', position: 'relative' }}
          />
        </Card>

        {/* 控制面板 */}
        <Card 
          title="可视化控制" 
          style={{ width: 300 }}
          bodyStyle={{ padding: 16 }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>显示字段</Text>
              <Select 
                value={activeField}
                onChange={setActiveField}
                style={{ width: '100%', marginTop: 4 }}
              >
                {Object.keys(visualizationData).map(field => (
                  <Option key={field} value={field}>{field}</Option>
                ))}
              </Select>
            </div>

            <Divider />

            <div>
              <Text strong>透明度</Text>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={meshOpacity}
                onChange={setMeshOpacity}
                style={{ marginTop: 4 }}
              />
            </div>

            <div>
              <Text strong>线框模式</Text>
              <Switch 
                checked={showWireframe}
                onChange={setShowWireframe}
                style={{ marginLeft: 8 }}
              />
            </div>

            <Divider />

            <div>
              <Text strong>颜色映射范围</Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">最小值</Text>
                <Slider
                  min={colorMapRange[0] - Math.abs(colorMapRange[0])}
                  max={colorMapRange[1]}
                  step={0.01}
                  value={colorMapRange[0]}
                  onChange={(value: number) => setColorMapRange([value, colorMapRange[1]])}
                />
              </div>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">最大值</Text>
                <Slider
                  min={colorMapRange[0]}
                  max={colorMapRange[1] + Math.abs(colorMapRange[1])}
                  step={0.01}
                  value={colorMapRange[1]}
                  onChange={(value: number) => setColorMapRange([colorMapRange[0], value])}
                />
              </div>
            </div>

            <Divider />

            <div>
              <Title level={5}>分析信息</Title>
              {Object.keys(visualizationData).length > 0 ? (
                <div>
                  <Text type="secondary">可用字段: {Object.keys(visualizationData).length}</Text><br/>
                  <Text type="secondary">当前字段: {activeField}</Text>
                </div>
              ) : (
                <Text type="secondary">暂无可视化数据</Text>
              )}
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default UnifiedCAEViewer; 