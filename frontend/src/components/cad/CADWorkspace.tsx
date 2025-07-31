/**
 * DeepCAD完整CAD系统工作空间
 * 2号几何专家 - 企业级CAD建模环境
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout, Tabs, Button, Tooltip, Divider, Space } from 'antd';
import {
  AppstoreOutlined,
  LineChartOutlined,
  BorderOutlined,
  GatewayOutlined,
  ToolOutlined,
  BarsOutlined,
  SettingOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  EyeOutlined,
  BgColorsOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import * as THREE from 'three';
import { designTokens } from '../../design/tokens';
import { logger } from '../../utils/advancedLogger';

const { Sider, Content } = Layout;
const { TabPane } = Tabs;

// ==================== 接口定义 ====================

interface CADEntity {
  id: string;
  type: 'point' | 'line' | 'arc' | 'circle' | 'spline' | 'surface' | 'solid';
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  properties: Record<string, any>;
  constraints: CADConstraint[];
  parentId?: string;
  children: string[];
}

interface CADConstraint {
  id: string;
  type: 'distance' | 'angle' | 'parallel' | 'perpendicular' | 'tangent' | 'coincident';
  entities: string[];
  value?: number;
  satisfied: boolean;
}

interface CADLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
  entities: string[];
}

interface CADProject {
  id: string;
  name: string;
  description: string;
  entities: Map<string, CADEntity>;
  layers: CADLayer[];
  activeLayer: string;
  units: 'mm' | 'cm' | 'm' | 'in' | 'ft';
  precision: number;
}

// ==================== 建模工具定义 ====================

interface ModelingTool {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: 'sketch' | 'feature' | 'modify' | 'measure' | 'analysis';
  description: string;
  shortcut?: string;
  active: boolean;
}

const MODELING_TOOLS: ModelingTool[] = [
  // 草图工具
  { id: 'point', name: '点', icon: '📍', category: 'sketch', description: '创建参考点', shortcut: 'P', active: false },
  { id: 'line', name: '直线', icon: '📏', category: 'sketch', description: '绘制直线段', shortcut: 'L', active: false },
  { id: 'arc', name: '圆弧', icon: '🌙', category: 'sketch', description: '绘制圆弧', shortcut: 'A', active: false },
  { id: 'circle', name: '圆', icon: '⭕', category: 'sketch', description: '绘制圆形', shortcut: 'C', active: false },
  { id: 'rectangle', name: '矩形', icon: '⬛', category: 'sketch', description: '绘制矩形', shortcut: 'R', active: false },
  { id: 'polygon', name: '多边形', icon: '🔷', category: 'sketch', description: '绘制多边形', shortcut: 'G', active: false },
  
  // 特征工具
  { id: 'extrude', name: '拉伸', icon: '⬆️', category: 'feature', description: '拉伸成实体', shortcut: 'E', active: false },
  { id: 'revolve', name: '旋转', icon: '🌀', category: 'feature', description: '旋转成实体', shortcut: 'V', active: false },
  { id: 'sweep', name: '扫描', icon: '🧹', category: 'feature', description: '沿路径扫描', shortcut: 'W', active: false },
  { id: 'loft', name: '放样', icon: '🎗️', category: 'feature', description: '多截面放样', shortcut: 'O', active: false },
  
  // 修改工具
  { id: 'fillet', name: '倒圆角', icon: '🔄', category: 'modify', description: '边缘倒圆角', shortcut: 'F', active: false },
  { id: 'chamfer', name: '倒角', icon: '✂️', category: 'modify', description: '边缘倒角', shortcut: 'H', active: false },
  { id: 'shell', name: '抽壳', icon: '🥚', category: 'modify', description: '实体抽壳', shortcut: 'S', active: false },
  { id: 'mirror', name: '镜像', icon: '🪞', category: 'modify', description: '对称镜像', shortcut: 'M', active: false },
  
  // 测量工具
  { id: 'distance', name: '距离', icon: '📐', category: 'measure', description: '测量距离', shortcut: 'D', active: false },
  { id: 'angle', name: '角度', icon: '📊', category: 'measure', description: '测量角度', shortcut: 'N', active: false },
  { id: 'area', name: '面积', icon: '📋', category: 'measure', description: '计算面积', shortcut: 'T', active: false },
  
  // 分析工具
  { id: 'section', name: '剖面', icon: '🔪', category: 'analysis', description: '创建剖面', shortcut: 'X', active: false },
  { id: 'mass', name: '质量属性', icon: '⚖️', category: 'analysis', description: '计算质量属性', shortcut: 'I', active: false }
];

// ==================== 主组件 ====================

const CADWorkspace: React.FC = () => {
  // 状态管理
  const [currentTool, setCurrentTool] = useState<string>('select');
  const [project, setProject] = useState<CADProject | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('tools');
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [coordinateSystem, setCoordinateSystem] = useState<'world' | 'local'>('world');
  
  // 3D场景引用
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  // 初始化3D场景
  useEffect(() => {
    if (!canvasRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(designTokens.colors.dark.deepSpace);
    
    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      75,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      10000
    );
    camera.position.set(50, 50, 50);
    camera.lookAt(0, 0, 0);
    
    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // 添加照明
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // 添加网格
    if (isGridVisible) {
      const gridHelper = new THREE.GridHelper(1000, 100, 0x00d9ff, 0x404040);
      gridHelper.name = 'grid';
      scene.add(gridHelper);
      
      const axesHelper = new THREE.AxesHelper(100);
      axesHelper.name = 'axes';
      scene.add(axesHelper);
    }
    
    // 保存引用
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    
    // 渲染循环
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();
    
    logger.info('CAD工作空间3D场景初始化完成');
    
    return () => {
      renderer.dispose();
    };
  }, [isGridVisible]);
  
  // 工具选择处理
  const handleToolSelect = useCallback((toolId: string) => {
    setCurrentTool(toolId);
    logger.info('切换建模工具', { toolId });
  }, []);
  
  // 渲染工具栏
  const renderToolbar = () => (
    <div style={{
      padding: '16px',
      borderBottom: `1px solid ${designTokens.colors.accent.glow}30`,
      background: 'rgba(0, 217, 255, 0.05)'
    }}>
      <Space wrap>
        {/* 文件操作 */}
        <Space.Compact>
          <Tooltip title="新建项目">
            <Button icon={<AppstoreOutlined />} type="text" />
          </Tooltip>
          <Tooltip title="打开项目">
            <Button icon={<FolderOpenOutlined />} type="text" />
          </Tooltip>
          <Tooltip title="保存项目">
            <Button icon={<SaveOutlined />} type="text" />
          </Tooltip>
        </Space.Compact>
        
        <Divider type="vertical" />
        
        {/* 编辑操作 */}
        <Space.Compact>
          <Tooltip title="撤销 (Ctrl+Z)">
            <Button icon={<UndoOutlined />} type="text" />
          </Tooltip>
          <Tooltip title="重做 (Ctrl+Y)">
            <Button icon={<RedoOutlined />} type="text" />
          </Tooltip>
        </Space.Compact>
        
        <Divider type="vertical" />
        
        {/* 视图操作 */}
        <Space.Compact>
          <Tooltip title="放大">
            <Button icon={<ZoomInOutlined />} type="text" />
          </Tooltip>
          <Tooltip title="缩小">
            <Button icon={<ZoomOutOutlined />} type="text" />
          </Tooltip>
          <Tooltip title="适合窗口">
            <Button icon={<EyeOutlined />} type="text" />
          </Tooltip>
          <Tooltip title="显示/隐藏网格">
            <Button 
              icon={<BgColorsOutlined />} 
              type={isGridVisible ? 'primary' : 'text'}
              onClick={() => setIsGridVisible(!isGridVisible)}
            />
          </Tooltip>
        </Space.Compact>
        
        <Divider type="vertical" />
        
        {/* 坐标系 */}
        <Space.Compact>
          <Button 
            type={coordinateSystem === 'world' ? 'primary' : 'text'}
            onClick={() => setCoordinateSystem('world')}
            size="small"
          >
            世界坐标
          </Button>
          <Button 
            type={coordinateSystem === 'local' ? 'primary' : 'text'}
            onClick={() => setCoordinateSystem('local')}
            size="small"
          >
            局部坐标
          </Button>
        </Space.Compact>
      </Space>
    </div>
  );
  
  // 渲染工具面板
  const renderToolsPanel = () => {
    const toolCategories = [
      { key: 'sketch', name: '草图工具', icon: '✏️' },
      { key: 'feature', name: '特征工具', icon: '🏗️' },
      { key: 'modify', name: '修改工具', icon: '🔧' },
      { key: 'measure', name: '测量工具', icon: '📏' },
      { key: 'analysis', name: '分析工具', icon: '🔬' }
    ];
    
    return (
      <div style={{ padding: '16px' }}>
        {toolCategories.map(category => {
          const categoryTools = MODELING_TOOLS.filter(tool => tool.category === category.key);
          
          return (
            <motion.div
              key={category.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: '24px' }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '12px',
                color: designTokens.colors.light.primary,
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                <span style={{ marginRight: '8px' }}>{category.icon}</span>
                {category.name}
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                gap: '8px'
              }}>
                {categoryTools.map(tool => (
                  <motion.div
                    key={tool.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Tooltip title={`${tool.description} ${tool.shortcut ? `(${tool.shortcut})` : ''}`}>
                      <Button
                        style={{
                          width: '100%',
                          height: '60px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: currentTool === tool.id 
                            ? `linear-gradient(135deg, ${designTokens.colors.accent.glow}30, ${designTokens.colors.accent.glow}20)`
                            : 'rgba(255, 255, 255, 0.05)',
                          border: currentTool === tool.id 
                            ? `1px solid ${designTokens.colors.accent.glow}`
                            : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px'
                        }}
                        onClick={() => handleToolSelect(tool.id)}
                      >
                        <div style={{ fontSize: '18px', marginBottom: '4px' }}>
                          {tool.icon}
                        </div>
                        <div style={{ 
                          fontSize: '10px', 
                          color: currentTool === tool.id ? '#ffffff' : '#ffffff80',
                          textAlign: 'center',
                          lineHeight: '1.2'
                        }}>
                          {tool.name}
                        </div>
                      </Button>
                    </Tooltip>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };
  
  // 渲染属性面板
  const renderPropertiesPanel = () => (
    <div style={{ padding: '16px' }}>
      <div style={{
        color: designTokens.colors.light.primary,
        fontSize: '14px',
        fontWeight: 'bold',
        marginBottom: '16px'
      }}>
        🎛️ 对象属性
      </div>
      
      <div style={{
        background: 'rgba(0, 217, 255, 0.1)',
        border: '1px solid rgba(0, 217, 255, 0.3)',
        borderRadius: '8px',
        padding: '16px',
        color: '#ffffff80',
        textAlign: 'center'
      }}>
        选择对象以查看属性
      </div>
    </div>
  );
  
  // 渲染图层面板
  const renderLayersPanel = () => (
    <div style={{ padding: '16px' }}>
      <div style={{
        color: designTokens.colors.light.primary,
        fontSize: '14px',
        fontWeight: 'bold',
        marginBottom: '16px'
      }}>
        📚 图层管理
      </div>
      
      <div style={{
        background: 'rgba(0, 217, 255, 0.1)',
        border: '1px solid rgba(0, 217, 255, 0.3)',
        borderRadius: '8px',
        padding: '16px',
        color: '#ffffff80',
        textAlign: 'center'
      }}>
        暂无图层
      </div>
    </div>
  );

  return (
    <Layout style={{ height: '100vh', background: designTokens.colors.dark.deepSpace }}>
      {/* 左侧工具面板 */}
      <Sider
        width={280}
        collapsible
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        theme="dark"
        style={{
          background: 'rgba(0, 0, 0, 0.8)',
          borderRight: `1px solid ${designTokens.colors.accent.glow}30`,
          backdropFilter: 'blur(20px)'
        }}
      >
        <motion.div
          initial={{ x: -280 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.5 }}
          style={{ height: '100%', overflow: 'hidden' }}
        >
          {!sidebarCollapsed && (
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              type="card"
              size="small"
              style={{ height: '100%' }}
              tabBarStyle={{
                margin: 0,
                background: 'rgba(0, 217, 255, 0.05)',
                borderBottom: `1px solid ${designTokens.colors.accent.glow}30`
              }}
            >
              <TabPane tab="🔧 工具" key="tools">
                {renderToolsPanel()}
              </TabPane>
              <TabPane tab="🎛️ 属性" key="properties">
                {renderPropertiesPanel()}
              </TabPane>
              <TabPane tab="📚 图层" key="layers">
                {renderLayersPanel()}
              </TabPane>
            </Tabs>
          )}
        </motion.div>
      </Sider>
      
      {/* 主工作区域 */}
      <Layout>
        {/* 顶部工具栏 */}
        {renderToolbar()}
        
        {/* 3D建模画布 */}
        <Content style={{ position: 'relative', overflow: 'hidden' }}>
          <motion.canvas
            ref={canvasRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              cursor: currentTool === 'select' ? 'default' : 'crosshair'
            }}
          />
          
          {/* 状态栏 */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              right: '16px',
              height: '40px',
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              border: `1px solid ${designTokens.colors.accent.glow}30`,
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#ffffff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '12px' }}>
                🎯 当前工具: {MODELING_TOOLS.find(t => t.id === currentTool)?.name || '选择'}
              </span>
              <span style={{ fontSize: '12px' }}>
                📐 坐标系: {coordinateSystem === 'world' ? '世界' : '局部'}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '12px' }}>
                🎮 鼠标: 左键选择 | 中键平移 | 右键旋转
              </span>
              <span style={{ fontSize: '12px' }}>
                ⚡ CAD引擎: Gmsh OCC + Three.js
              </span>
            </div>
          </motion.div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default CADWorkspace;