import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Typography, 
    Button, 
    Select, 
    Slider, 
    Switch, 
    Card,
    Space,
    Form,
    InputNumber,
    Tabs,
    Tooltip,
    Badge,
    Progress,
    Divider,
    message
} from 'antd';
import { 
    PlayCircleOutlined,
    PauseOutlined,
    FullscreenOutlined,
    SettingOutlined,
    CameraOutlined,
    DownloadOutlined,
    EyeOutlined,
    MenuOutlined,
    CloseOutlined,
    ReloadOutlined,
    ZoomInOutlined,
    ZoomOutOutlined,
    RotateLeftOutlined,
    BorderOutlined,
    SplitCellsOutlined,
    ThunderboltOutlined,
    HeatMapOutlined
} from '@ant-design/icons';
import Toolbar, { ToolType } from '../components/geometry/Toolbar';
// PyVista后处理功能已整合到CAE后处理模块中
import ErrorBoundary from '../components/ErrorBoundary';
import * as THREE from 'three';
import StatusBar from '../components/layout/StatusBar';
import { useModernAxis } from '../hooks/useModernAxis';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// 颜色映射组件
const ColorMapLegend: React.FC<{
  variable: string;
  minValue: number;
  maxValue: number;
  colormap: string;
  unit: string;
}> = ({ variable, minValue, maxValue, colormap, unit }) => {
  const generateColorStops = (colormap: string) => {
    const colormaps = {
      rainbow: ['#0000ff', '#00ffff', '#00ff00', '#ffff00', '#ff8000', '#ff0000'],
      hot: ['#000000', '#330000', '#660000', '#990000', '#cc0000', '#ff0000', '#ff3300', '#ff6600', '#ff9900', '#ffcc00', '#ffff00', '#ffffff'],
      cool: ['#00ffff', '#0080ff', '#0000ff'],
      viridis: ['#440154', '#31688e', '#35b779', '#fde725'],
      plasma: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921']
    };
    return colormaps[colormap as keyof typeof colormaps] || colormaps.rainbow;
  };

  const colorStops = generateColorStops(colormap);
  const gradientString = colorStops.join(', ');

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      width: '120px',
      background: 'rgba(26, 26, 46, 0.9)',
      border: '1px solid rgba(0, 217, 255, 0.4)',
      borderRadius: '8px',
      padding: '12px',
      zIndex: 8000,
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 12px rgba(0, 217, 255, 0.2)'
    }}>
      <div style={{ 
        color: '#00d9ff', 
        fontSize: '14px', 
        fontWeight: 'bold', 
        marginBottom: '8px',
        textAlign: 'center'
      }}>
        {variable}
      </div>
      
      {/* 颜色条 */}
      <div style={{
        width: '100%',
        height: '150px',
        background: `linear-gradient(to top, ${gradientString})`,
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '4px',
        marginBottom: '8px',
        position: 'relative'
      }}>
        {/* 刻度标记 */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              right: '-8px',
              bottom: `${ratio * 100}%`,
              width: '6px',
              height: '1px',
              background: '#ffffff',
              transform: 'translateY(50%)'
            }}
          />
        ))}
      </div>
      
      {/* 数值标签 */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        fontSize: '11px', 
        color: '#ffffff',
        fontFamily: 'monospace'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '2px'
        }}>
          <span>最大:</span>
          <span style={{ color: '#00d9ff' }}>{maxValue.toFixed(3)} {unit}</span>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '2px'
        }}>
          <span>最小:</span>
          <span style={{ color: '#00d9ff' }}>{minValue.toFixed(3)} {unit}</span>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between'
        }}>
          <span>级数:</span>
          <span style={{ color: '#00d9ff' }}>20</span>
        </div>
      </div>
    </div>
  );
};

// 专业3D视口组件
const Professional3DViewport: React.FC<{
  contourData: any;
  animationState: any;
  onViewportAction: (action: string) => void;
}> = ({ contourData, animationState, onViewportAction }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<any>();

  useEffect(() => {
    if (!mountRef.current) return;

    // 基础场景设置
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    sceneRef.current = scene;

    // 相机设置
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 5);
    cameraRef.current = camera;

    // 渲染器设置
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // 添加光照
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x00d9ff, 1.0);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // 添加示例云图几何体（模拟CAE结果）
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    
    // 创建具有云图效果的材质
    const material = new THREE.MeshPhongMaterial({
      color: 0x00d9ff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // 添加网格
    const gridHelper = new THREE.GridHelper(10, 10, 0x00d9ff, 0x333366);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // 注意：现代化坐标轴将通过 useModernAxis hook 添加

    // 添加边界框
    const boxHelper = new THREE.BoxHelper(mesh, 0x00d9ff);
    scene.add(boxHelper);

    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (animationState.isPlaying) {
        mesh.rotation.y += 0.01;
        // 模拟云图数据变化
        const time = Date.now() * 0.001;
        material.opacity = 0.6 + 0.2 * Math.sin(time * 2);
      }
      
      renderer.render(scene, camera);
    };

    animate();

    // 窗口大小调整
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [animationState]);

  // 现代化坐标轴集成
  const modernAxis = useModernAxis({
    scene: sceneRef.current!,
    camera: cameraRef.current!,
    renderer: rendererRef.current!,
    enabled: !!sceneRef.current && !!cameraRef.current && !!rendererRef.current,
    size: 5,
    cornerPosition: 'bottom-left',
    enableGlow: true,
    enableAnimation: true,
    enableInteraction: true
  });

  return (
    <div 
      ref={mountRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative'
      }}
    />
  );
};

const ResultsView: React.FC = () => {
  const navigate = useNavigate();
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  const [activeToolbarTool, setActiveToolbarTool] = useState<ToolType | undefined>();

  const handleToolbarToolSelect = (tool: ToolType) => {
    setActiveToolbarTool(tool);
    switch (tool) {
      case 'view_3d':
        message.info('切换到三维透视视图');
        break;
      case 'view_top':
        message.info('切换到俯视图 (XY平面)');
        break;
      case 'view_side':
        message.info('切换到侧视图 (YZ平面)');
        break;
      case 'view_front':
        message.info('切换到正视图 (XZ平面)');
        break;
      case 'select':
        message.info('选择工具已激活');
        break;
      case 'measure':
        message.info('测量工具已激活');
        break;
      case 'hide_show':
        message.info('显示/隐藏工具已激活');
        break;
      case 'settings':
        setRightPanelVisible(!rightPanelVisible);
        break;
      default:
        message.info(`${tool} 工具已激活`);
    }
  };
  const [activeTab, setActiveTab] = useState('contour');
  
  // 云图设置状态
  const [contourSettings, setContourSettings] = useState({
    variable: 'displacement',
    component: 'magnitude',
    colormap: 'rainbow',
    levels: 20,
    range: 'auto',
    transparency: 0.8,
    smoothing: true,
    showEdges: false
  });

  // 动画状态
  const [animationState, setAnimationState] = useState({
    isPlaying: false,
    currentFrame: 0,
    totalFrames: 100,
    speed: 1.0,
    loop: true
  });

  // 切片设置
  const [sliceSettings, setSliceSettings] = useState({
    direction: 'z',
    position: 0,
    visible: true,
    opacity: 0.7
  });

  // 变形设置
  const [deformationSettings, setDeformationSettings] = useState({
    enabled: true,
    scale: 1.0,
    animated: false
  });

  const handlePlayPause = () => {
    setAnimationState(prev => ({
      ...prev,
      isPlaying: !prev.isPlaying
    }));
  };

  const handleFrameChange = (value: number) => {
    setAnimationState(prev => ({
      ...prev,
      currentFrame: value
    }));
  };

  const handleContourChange = (key: string, value: any) => {
    setContourSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getVariableDisplayName = (variable: string) => {
    const names = {
      displacement: '位移',
      stress: '应力', 
      strain: '应变',
      temperature: '温度',
      pressure: '压力'
    };
    return names[variable as keyof typeof names] || variable;
  };

  const getVariableUnit = (variable: string) => {
    const units = {
      displacement: 'mm',
      stress: 'MPa',
      strain: '',
      temperature: '°C',
      pressure: 'Pa'
    };
    return units[variable as keyof typeof units] || '';
  };

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100vh', 
      background: '#0a0a1a',
      overflow: 'hidden'
    }}>
      {/* 主要3D视口区域 */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0 
      }}>
        <Professional3DViewport 
          contourData={contourSettings}
          animationState={animationState}
          onViewportAction={(action) => console.log('3D视口操作:', action)}
        />
      </div>

      {/* 云图标尺 */}
      <ColorMapLegend
        variable={getVariableDisplayName(contourSettings.variable)}
        minValue={0.125}
        maxValue={15.678}
        colormap={contourSettings.colormap}
        unit={getVariableUnit(contourSettings.variable)}
      />

      {/* 顶部工具栏 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '240px',
        height: '50px',
        background: 'rgba(26, 26, 46, 0.9)',
        border: '1px solid rgba(0, 217, 255, 0.4)',
        borderRadius: '8px',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 7000,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button 
            type={leftPanelVisible ? "primary" : "default"}
            icon={<MenuOutlined />}
            onClick={() => setLeftPanelVisible(!leftPanelVisible)}
            size="small"
            style={{ background: leftPanelVisible ? '#00d9ff' : 'transparent' }}
          >
            控制面板
          </Button>
          
          <Divider type="vertical" style={{ borderColor: 'rgba(255,255,255,0.2)' }} />
          
          <Space>
            <Button 
              icon={animationState.isPlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
              onClick={handlePlayPause}
              size="small"
              style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              {animationState.isPlaying ? '暂停' : '播放'}
            </Button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
              <Text style={{ color: '#ffffff', fontSize: '12px' }}>帧:</Text>
              <Slider
                min={0}
                max={animationState.totalFrames - 1}
                value={animationState.currentFrame}
                onChange={handleFrameChange}
                style={{ flex: 1, margin: 0 }}
                tooltip={{ formatter: (value) => `${value}/${animationState.totalFrames - 1}` }}
              />
            </div>
          </Space>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button 
            icon={<CameraOutlined />} 
            size="small"
            style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)' }}
          >
            截图
          </Button>
          <Button 
            icon={<DownloadOutlined />} 
            size="small"
            style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)' }}
          >
            导出
          </Button>
          <Button 
            icon={<FullscreenOutlined />} 
            size="small"
            style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)' }}
          >
            全屏
          </Button>
          <Button 
            icon={<HeatMapOutlined />} 
            size="small"
            onClick={() => navigate('/postprocessing')}
            style={{ 
              color: '#00d9ff', 
              borderColor: 'rgba(0, 217, 255, 0.5)',
              background: 'rgba(0, 217, 255, 0.1)'
            }}
          >
            高级后处理
          </Button>
        </div>
      </div>

      {/* 左侧控制面板 */}
      {leftPanelVisible && (
        <div style={{
          position: 'absolute',
          top: '90px',
          left: '20px',
          bottom: '20px',
          width: '320px',
          background: 'rgba(26, 26, 46, 0.95)',
          border: '1px solid rgba(0, 217, 255, 0.4)',
          borderRadius: '12px',
          zIndex: 8000,
          backdropFilter: 'blur(15px)',
          boxShadow: '0 8px 32px rgba(0, 217, 255, 0.1)',
          overflowY: 'auto'
        }}>
          <div style={{ padding: '20px' }}>
            {/* 面板标题 */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid rgba(0, 217, 255, 0.3)',
              paddingBottom: '12px'
            }}>
              <Title level={4} style={{ color: '#00d9ff', margin: 0 }}>
                后处理控制
              </Title>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => setLeftPanelVisible(false)}
                style={{ color: '#ffffff' }}
              />
            </div>

            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              type="card"
              size="small"
              style={{ color: '#ffffff' }}
            >
              <TabPane tab={<span><HeatMapOutlined />云图</span>} key="contour">
                <div style={{ padding: '12px 0' }}>
                  <Form layout="vertical" size="small">
                    <Form.Item label={<span style={{ color: '#ffffff' }}>显示变量</span>}>
                      <Select 
                        value={contourSettings.variable}
                        onChange={(value) => handleContourChange('variable', value)}
                        style={{ width: '100%' }}
                      >
                        <Option value="displacement">位移 (Displacement)</Option>
                        <Option value="stress">应力 (Stress)</Option>
                        <Option value="strain">应变 (Strain)</Option>
                        <Option value="temperature">温度 (Temperature)</Option>
                        <Option value="pressure">压力 (Pressure)</Option>
                      </Select>
                    </Form.Item>

                    <Form.Item label={<span style={{ color: '#ffffff' }}>分量</span>}>
                      <Select 
                        value={contourSettings.component}
                        onChange={(value) => handleContourChange('component', value)}
                        style={{ width: '100%' }}
                      >
                        <Option value="magnitude">总量 (Magnitude)</Option>
                        <Option value="x">X 分量</Option>
                        <Option value="y">Y 分量</Option>
                        <Option value="z">Z 分量</Option>
                      </Select>
                    </Form.Item>

                    <Form.Item label={<span style={{ color: '#ffffff' }}>颜色映射</span>}>
                      <Select 
                        value={contourSettings.colormap}
                        onChange={(value) => handleContourChange('colormap', value)}
                        style={{ width: '100%' }}
                      >
                        <Option value="rainbow">彩虹 (Rainbow)</Option>
                        <Option value="hot">热图 (Hot)</Option>
                        <Option value="cool">冷图 (Cool)</Option>
                        <Option value="viridis">Viridis</Option>
                        <Option value="plasma">Plasma</Option>
                      </Select>
                    </Form.Item>

                    <Form.Item label={<span style={{ color: '#ffffff' }}>等级数: {contourSettings.levels}</span>}>
                      <Slider
                        min={5}
                        max={50}
                        value={contourSettings.levels}
                        onChange={(value) => handleContourChange('levels', value)}
                      />
                    </Form.Item>

                    <Form.Item label={<span style={{ color: '#ffffff' }}>透明度: {(contourSettings.transparency * 100).toFixed(0)}%</span>}>
                      <Slider
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        value={contourSettings.transparency}
                        onChange={(value) => handleContourChange('transparency', value)}
                      />
                    </Form.Item>

                    <Form.Item>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: '#ffffff' }}>平滑处理</Text>
                          <Switch 
                            checked={contourSettings.smoothing}
                            onChange={(value) => handleContourChange('smoothing', value)}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: '#ffffff' }}>显示边缘</Text>
                          <Switch 
                            checked={contourSettings.showEdges}
                            onChange={(value) => handleContourChange('showEdges', value)}
                          />
                        </div>
                      </div>
                    </Form.Item>
                  </Form>
                </div>
              </TabPane>

              <TabPane tab={<span><SplitCellsOutlined />切片</span>} key="slice">
                <div style={{ padding: '12px 0' }}>
                  <Form layout="vertical" size="small">
                    <Form.Item label={<span style={{ color: '#ffffff' }}>切片方向</span>}>
                      <Select 
                        value={sliceSettings.direction}
                        onChange={(value) => setSliceSettings(prev => ({ ...prev, direction: value }))}
                        style={{ width: '100%' }}
                      >
                        <Option value="x">X 轴切片</Option>
                        <Option value="y">Y 轴切片</Option>
                        <Option value="z">Z 轴切片</Option>
                      </Select>
                    </Form.Item>

                    <Form.Item label={<span style={{ color: '#ffffff' }}>切片位置: {sliceSettings.position.toFixed(2)}</span>}>
                      <Slider
                        min={-5}
                        max={5}
                        step={0.1}
                        value={sliceSettings.position}
                        onChange={(value) => setSliceSettings(prev => ({ ...prev, position: value }))}
                      />
                    </Form.Item>

                    <Form.Item label={<span style={{ color: '#ffffff' }}>透明度: {(sliceSettings.opacity * 100).toFixed(0)}%</span>}>
                      <Slider
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        value={sliceSettings.opacity}
                        onChange={(value) => setSliceSettings(prev => ({ ...prev, opacity: value }))}
                      />
                    </Form.Item>

                    <Form.Item>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#ffffff' }}>显示切片</Text>
                        <Switch 
                          checked={sliceSettings.visible}
                          onChange={(value) => setSliceSettings(prev => ({ ...prev, visible: value }))}
                        />
                      </div>
                    </Form.Item>
                  </Form>
                </div>
              </TabPane>

              <TabPane tab={<span><ThunderboltOutlined />变形</span>} key="deformation">
                <div style={{ padding: '12px 0' }}>
                  <Form layout="vertical" size="small">
                    <Form.Item>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <Text style={{ color: '#ffffff' }}>启用变形显示</Text>
                        <Switch 
                          checked={deformationSettings.enabled}
                          onChange={(value) => setDeformationSettings(prev => ({ ...prev, enabled: value }))}
                        />
                      </div>
                    </Form.Item>

                    <Form.Item label={<span style={{ color: '#ffffff' }}>变形比例: {deformationSettings.scale.toFixed(1)}x</span>}>
                      <Slider
                        min={0.1}
                        max={10.0}
                        step={0.1}
                        value={deformationSettings.scale}
                        onChange={(value) => setDeformationSettings(prev => ({ ...prev, scale: value }))}
                        disabled={!deformationSettings.enabled}
                      />
                    </Form.Item>

                    <Form.Item>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#ffffff' }}>动画变形</Text>
                        <Switch 
                          checked={deformationSettings.animated}
                          onChange={(value) => setDeformationSettings(prev => ({ ...prev, animated: value }))}
                          disabled={!deformationSettings.enabled}
                        />
                      </div>
                    </Form.Item>
                  </Form>
                </div>
              </TabPane>

            </Tabs>

            {/* 状态信息 */}
            <Card 
              size="small" 
              style={{ 
                marginTop: '16px',
                background: 'rgba(0, 217, 255, 0.1)',
                border: '1px solid rgba(0, 217, 255, 0.3)'
              }}
            >
              <div style={{ color: '#ffffff', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>节点数:</span>
                  <span style={{ color: '#00d9ff' }}>12,847</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>单元数:</span>
                  <span style={{ color: '#00d9ff' }}>8,924</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>当前帧:</span>
                  <span style={{ color: '#00d9ff' }}>{animationState.currentFrame + 1}/{animationState.totalFrames}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}


      {/* 底部中央结果工具栏 */}
      <div style={{
        position: 'absolute',
        bottom: '250px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9000,
        background: 'rgba(26, 26, 46, 0.95)',
        border: '2px solid rgba(0, 217, 255, 0.6)',
        borderRadius: '16px',
        padding: '16px 32px',
        backdropFilter: 'blur(15px)',
        boxShadow: '0 0 30px rgba(0, 217, 255, 0.4)',
        minHeight: '60px'
      }}>
        <Toolbar
          onToolSelect={handleToolbarToolSelect}
          activeTool={activeToolbarTool}
          disabled={false}
        />
      </div>

      <StatusBar viewType="results" />
    </div>
  );
};

export default ResultsView;