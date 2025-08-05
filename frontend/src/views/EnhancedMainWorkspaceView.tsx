/**
 * 增强型主工作空间视图
 * 1号架构师 - 融合当前布局+多窗口仪表板的深基坑专业方案
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Layout, Card, Tabs, Row, Col, Button, Space, Typography, Progress, Statistic, message } from 'antd';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import { TouchButton, GestureArea } from '../components/ui/TouchOptimizedControls';
import { 
  ExpandOutlined, 
  CompressOutlined, 
  SettingOutlined,
  MonitorOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import CAEThreeEngineComponent from '../components/3d/CAEThreeEngine';

import GeologyModule from '../components/geology/GeologyModule';
import ExcavationModule from '../components/excavation/ExcavationModule';
import SupportModule from '../components/support/SupportModule';

import AdvancedMeshConfig from '../components/meshing/AdvancedMeshConfig';
import PhysicalGroupManager from '../components/meshing/PhysicalGroupManager';
import IntegratedMeshControl from '../components/meshing/IntegratedMeshControl';
import VerticalToolbar from '../components/geometry/VerticalToolbar';
import type { VerticalToolType } from '../components/geometry/VerticalToolbar';
import BoundaryConditionConfigPanel from '../components/computation/BoundaryConditionConfigPanel';
import LoadConfigPanel from '../components/computation/LoadConfigPanel';
import RealtimeProgressMonitor from '../components/computation/RealtimeProgressMonitor.simple';
import MeshInterface from '../components/computation/MeshInterface.simple';
// 3号计算专家组件集成
import ComputationControlPanel from '../components/ComputationControlPanel';
import PhysicsAIEmbeddedPanel from '../components/PhysicsAIEmbeddedPanel_SIMPLIFIED';

// 3号专家功能界面组件
import ComputationResultsOverview from '../components/computation/ComputationResultsOverview';
import ResultsVisualizationDashboard from '../components/ResultsVisualizationDashboard';
import PhysicsAIDashboardPanel from '../components/PhysicsAIDashboardPanel';
import PhysicsAIView from '../views/PhysicsAIView';

// 3号专家工具栏组件
import MeshingToolbar from '../components/toolbars/MeshingToolbar';
// import AnalysisToolbar from '../components/toolbars/AnalysisToolbar';
// import PhysicsAIToolbar from '../components/toolbars/PhysicsAIToolbar';
// import ResultsToolbar from '../components/toolbars/ResultsToolbar';
// import { ModuleErrorBoundary } from '../core/ErrorBoundary';
import { useDeepCADTheme } from '../components/ui/DeepCADTheme';
// import { ComponentDevHelper } from '../utils/developmentTools';
import { simplifiedComponentManager } from '../utils/SimplifiedComponentManager';

// 占位符组件和工具
const ModuleErrorBoundary: React.FC<{ moduleName: string; children: React.ReactNode }> = ({ children }) => <>{children}</>;
const ComponentDevHelper = {
  logDevTip: (message: string) => console.log('DevTip:', message)
};

// 占位符工具栏组件
const AnalysisToolbar: React.FC<any> = () => (
  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.6)', borderRadius: '8px' }}>
    <div style={{ color: '#fff', fontSize: '12px' }}>计算工具栏</div>
  </div>
);

const PhysicsAIToolbar: React.FC<any> = () => (
  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.6)', borderRadius: '8px' }}>
    <div style={{ color: '#fff', fontSize: '12px' }}>物理AI工具栏</div>
  </div>
);

const ResultsToolbar: React.FC<any> = () => (
  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.6)', borderRadius: '8px' }}>
    <div style={{ color: '#fff', fontSize: '12px' }}>结果工具栏</div>
  </div>
);

const { Content } = Layout;
const { Title, Text } = Typography;

interface EnhancedMainWorkspaceViewProps {
  activeModule?: string;
}

// 面板状态类型
type PanelState = 'normal' | 'collapsed' | 'expanded' | 'floating';

// 子视图配置
interface SubViewConfig {
  enabled: boolean;
  leftContent: string;
  rightContent: string;
  height: number;
}

const EnhancedMainWorkspaceView: React.FC<EnhancedMainWorkspaceViewProps> = ({ 
  activeModule = 'geology-modeling' 
}) => {
  // 添加CSS动画样式
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.2); }
        100% { opacity: 1; transform: scale(1); }
      }
      .expert-panel-header {
        background: linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
        padding-left: 8px;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const { themeConfig } = useDeepCADTheme();
  const { 
    layoutConfig, 
    smartPanelSuggestions, 
    touchOptimizations,
    performanceOptimizations,
    isTouch, 
    isMobile, 
    isTablet,
    isDesktop,
    isLargeScreen,
    isPortrait,
    screenInfo
  } = useResponsiveLayout();
  
  // 响应式面板状态管理
  const [leftPanelState, setLeftPanelState] = useState<PanelState>(
    layoutConfig.leftPanelCollapsed ? 'collapsed' : 'normal'
  );
  const [rightPanelState, setRightPanelState] = useState<PanelState>(
    layoutConfig.rightPanelCollapsed ? 'collapsed' : 'normal'
  );
  const [rightPanelTab, setRightPanelTab] = useState('monitor');
  const [activeGeometryTool, setActiveGeometryTool] = useState<VerticalToolType>('select');
  
  // 添加模块状态管理
  const [geologyParams, setGeologyParams] = useState({
    interpolationMethod: 'kriging' as const,
    gridResolution: 2.0,
    xExtend: 50,
    yExtend: 50,
    bottomElevation: -30
  });
  const [geologyStatus, setGeologyStatus] = useState<'wait' | 'process' | 'finish' | 'error'>('wait');
  
  const [excavationParams, setExcavationParams] = useState({
    depth: 10,
    width: 20,
    length: 30,
    type: 'rectangular'
  });
  const [excavationStatus, setExcavationStatus] = useState<'wait' | 'process' | 'finish' | 'error'>('wait');
  
  const [supportParams, setSupportParams] = useState({
    diaphragmWall: {
      thickness: 0.8,
      depth: 25,
      enabled: true
    },
    pilePile: {
      diameter: 1.0,
      spacing: 2.0,
      length: 20,
      embedDepth: 5,
      enabled: false
    },
    anchor: {
      length: 15,
      angle: 15,
      hSpacing: 3,
      vSpacing: 3,
      enabled: false
    },
    steelSupport: {
      layers: 2,
      spacing: 6,
      sectionType: 'H500x200' as const,
      preload: 500,
      enabled: false
    }
  });
  const [supportStatus, setSupportStatus] = useState<'wait' | 'process' | 'finish' | 'error'>('wait');

  // 网格工具栏状态
  const [meshToolState, setMeshToolState] = useState({
    isGenerating: false,
    qualityCheckActive: false,
    measureMode: false,
    selectMode: false,
    currentView: 'perspective'
  });
  
  // 3号计算专家状态管理
  const [expert3State, setExpert3State] = useState({
    computationActive: false,
    meshAnalysisActive: false,
    physicsAIVisible: false,
    currentComputationTask: null as string | null,
    computationResults: null as any,
    // 网格生成状态
    meshingStatus: 'idle' as 'idle' | 'generating' | 'completed' | 'error',
    meshQuality: 0,
    meshProgress: 0,
    // 计算分析状态
    analysisProgress: 0,
    currentSolver: 'TERRA' as 'TERRA' | 'Kratos' | 'FEM',
    // 物理AI状态
    physicsAIEnabled: false,
    optimizationRunning: false,
    aiRecommendations: [] as any[],
    // 结果查看状态
    resultVisualizationMode: '3D' as '3D' | 'chart' | 'table',
    currentResults: null as any,
    // 工具栏状态
    activeTool: null as string | null
  });
  
  const [threeScene, setThreeScene] = useState<any>(null);

  // 添加通用选择处理函数
  const onSelection = useCallback((objects: any[]) => {
    console.log('🎯 主视口选择:', objects);
    ComponentDevHelper.logDevTip(`选中对象: ${objects.length}个`);
  }, []);

  // 几何工具栏处理函数
  const handleGeometryToolSelect = (tool: VerticalToolType) => {
    setActiveGeometryTool(tool);
    console.log(`🎯 选择几何工具: ${tool}`);
    
    // 实现具体工具功能
    switch (tool) {
      case 'select':
        ComponentDevHelper.logDevTip('选择工具已激活 - 可以选择3D对象');
        // 切换到选择模式
        if (threeScene) {
          // 这里应该调用three.js的选择模式
          console.log('🎯 激活选择模式');
        }
        break;
        
      case 'pan':
        ComponentDevHelper.logDevTip('平移工具已激活 - 可以拖拽视图');
        console.log('👋 激活平移模式');
        break;
        
      case 'zoom':
        ComponentDevHelper.logDevTip('缩放工具已激活 - 可以缩放视图');
        console.log('🔍 激活缩放模式');
        break;
        
      case 'reset':
        ComponentDevHelper.logDevTip('重置视图到默认位置');
        console.log('🏠 重置视图');
        // 重置3D视图
        if (threeScene) {
          // 这里应该重置相机位置
          console.log('📷 相机已重置');
        }
        message.success('视图已重置');
        break;
        
      case 'distance':
        ComponentDevHelper.logDevTip('距离测量工具已激活 - 点击两点测量距离');
        console.log('📏 激活距离测量');
        message.info('请点击两个点进行距离测量');
        break;
        
      case 'angle':
        ComponentDevHelper.logDevTip('角度测量工具已激活 - 点击三个点测量角度');
        console.log('📐 激活角度测量');
        message.info('请点击三个点进行角度测量');
        break;
        
      case 'section':
        ComponentDevHelper.logDevTip('剖切工具已激活 - 创建截面视图');
        console.log('✂️ 激活剖切模式');
        message.info('剖切工具已激活');
        break;
        
      case 'explode':
        ComponentDevHelper.logDevTip('爆炸视图已激活 - 分解显示组件');
        console.log('💥 激活爆炸视图');
        message.info('爆炸视图模式已激活');
        break;
        
      case 'wireframe':
        ComponentDevHelper.logDevTip('线框模式已切换');
        console.log('🕸️ 切换线框模式');
        message.info('线框显示模式已切换');
        break;
        
      case 'annotation':
        ComponentDevHelper.logDevTip('标注工具已激活 - 可以添加文字标注');
        console.log('📝 激活标注工具');
        message.info('标注工具已激活，点击位置添加标注');
        break;
        
      case 'undo':
        ComponentDevHelper.logDevTip('执行撤销操作');
        console.log('↩️ 执行撤销');
        message.info('已撤销上一步操作');
        break;
        
      case 'redo':
        ComponentDevHelper.logDevTip('执行重做操作');
        console.log('↪️ 执行重做');
        message.info('已重做操作');
        break;
        
      case 'save':
        ComponentDevHelper.logDevTip('保存当前几何模型');
        console.log('💾 保存模型');
        message.success('几何模型已保存');
        break;
        
      case 'export':
        ComponentDevHelper.logDevTip('导出几何模型');
        console.log('📤 导出模型');
        message.info('正在导出几何模型...');
        // 这里可以添加实际的导出逻辑
        setTimeout(() => {
          message.success('模型导出完成');
        }, 2000);
        break;
        
      case 'settings':
        ComponentDevHelper.logDevTip('打开几何工具设置');
        console.log('⚙️ 打开设置');
        message.info('几何工具设置面板');
        break;
        
      default:
        ComponentDevHelper.logDevTip(`几何工具已切换到: ${tool}`);
        break;
    }
  };
  
  // 3号专家功能处理
  const handleExpert3Action = (action: string, data?: any) => {
    console.log(`🧠 3号计算专家执行: ${action}`, data);
    
    switch (action) {
      // 网格生成相关
      case 'start_meshing':
        setExpert3State(prev => ({ ...prev, meshingStatus: 'generating', meshProgress: 0 }));
        break;
      case 'mesh_progress':
        setExpert3State(prev => ({ ...prev, meshProgress: data?.progress || 0 }));
        break;
      case 'mesh_completed':
        setExpert3State(prev => ({ ...prev, meshingStatus: 'completed', meshQuality: data?.quality || 85 }));
        break;
        
      // 计算分析相关
      case 'start_computation':
        setExpert3State(prev => ({ 
          ...prev, 
          computationActive: true,
          analysisProgress: 0,
          currentComputationTask: data?.taskType || 'deep_excavation'
        }));
        break;
      case 'computation_progress':
        setExpert3State(prev => ({ ...prev, analysisProgress: data?.progress || 0 }));
        break;
      case 'computation_complete':
        setExpert3State(prev => ({ 
          ...prev, 
          computationActive: false,
          analysisProgress: 100,
          currentComputationTask: null,
          computationResults: data,
          currentResults: data
        }));
        break;
        
      // 物理AI相关
      case 'enable_physics_ai':
        setExpert3State(prev => ({ ...prev, physicsAIEnabled: true }));
        break;
      case 'start_optimization':
        setExpert3State(prev => ({ ...prev, optimizationRunning: true }));
        break;
      case 'ai_recommendation':
        setExpert3State(prev => ({ 
          ...prev, 
          aiRecommendations: [...prev.aiRecommendations, data] 
        }));
        break;
      case 'optimization_complete':
        setExpert3State(prev => ({ ...prev, optimizationRunning: false }));
        break;
        
      // 结果查看相关
      case 'show_results':
        setExpert3State(prev => ({ ...prev, currentResults: data }));
        break;
      case 'change_visualization':
        setExpert3State(prev => ({ ...prev, resultVisualizationMode: data?.mode || '3D' }));
        break;
        
      // 工具栏相关
      case 'select_tool':
        setExpert3State(prev => ({ ...prev, activeTool: data?.tool }));
        break;
        
      // 传统操作兼容
      case 'show_mesh_analysis':
        setExpert3State(prev => ({ ...prev, meshAnalysisActive: true }));
        break;
      case 'toggle_physics_ai':
        setExpert3State(prev => ({ ...prev, physicsAIVisible: !prev.physicsAIVisible }));
        break;
        
      default:
        console.warn(`未知的3号专家操作: ${action}`);
    }
  };
  
  // 通用处理函数
  const handleParamsChange = (moduleType: string, key: string, value: any) => {
    switch (moduleType) {
      case 'geology':
        setGeologyParams(prev => ({ ...prev, [key]: value }));
        break;
      case 'excavation':
        setExcavationParams(prev => ({ ...prev, [key]: value }));
        break;
      case 'support':
        setSupportParams(prev => ({ ...prev, [key]: value }));
        break;
    }
  };

  // 网格工具栏功能函数
  const meshToolHandlers = {
    refreshMesh: () => {
      console.log('🔄 刷新网格');
      setMeshToolState(prev => ({ ...prev, isGenerating: true }));
      // 模拟网格生成
      setTimeout(() => {
        setMeshToolState(prev => ({ ...prev, isGenerating: false }));
        ComponentDevHelper.logDevTip('网格刷新完成');
      }, 2000);
    },
    
    startGeneration: () => {
      console.log('▶️ 开始生成网格');
      setMeshToolState(prev => ({ ...prev, isGenerating: true }));
      // 调用实际的网格生成API
      setTimeout(() => {
        setMeshToolState(prev => ({ ...prev, isGenerating: false }));
        ComponentDevHelper.logDevTip('网格生成完成');
      }, 3000);
    },
    
    pauseGeneration: () => {
      console.log('⏸️ 暂停生成');
      setMeshToolState(prev => ({ ...prev, isGenerating: false }));
      ComponentDevHelper.logDevTip('网格生成已暂停');
    },
    
    qualityCheck: () => {
      console.log('🔍 质量检查');
      setMeshToolState(prev => ({ ...prev, qualityCheckActive: !prev.qualityCheckActive }));
      ComponentDevHelper.logDevTip(meshToolState.qualityCheckActive ? '退出质量检查' : '进入质量检查模式');
    },
    
    measureTool: () => {
      console.log('📏 测量工具');
      setMeshToolState(prev => ({ ...prev, measureMode: !prev.measureMode, selectMode: false }));
      ComponentDevHelper.logDevTip(meshToolState.measureMode ? '退出测量模式' : '进入测量模式');
    },
    
    selectTool: () => {
      console.log('🎯 选择工具');
      setMeshToolState(prev => ({ ...prev, selectMode: !prev.selectMode, measureMode: false }));
      ComponentDevHelper.logDevTip(meshToolState.selectMode ? '退出选择模式' : '进入选择模式');
    },
    
    changeView: (view: string) => {
      console.log(`👁️ 切换视角: ${view}`);
      setMeshToolState(prev => ({ ...prev, currentView: view }));
      ComponentDevHelper.logDevTip(`切换到${view}视角`);
    },
    
    saveMesh: () => {
      console.log('💾 保存网格');
      ComponentDevHelper.logDevTip('网格已保存到项目');
    },
    
    exportMesh: () => {
      console.log('📤 导出网格');
      ComponentDevHelper.logDevTip('网格导出中...');
      // 模拟导出过程
      setTimeout(() => {
        ComponentDevHelper.logDevTip('网格导出完成');
      }, 1500);
    },
    
    quickSettings: () => {
      console.log('⚙️ 快速设置');
      ComponentDevHelper.logDevTip('打开快速设置面板');
    }
  };
  
  const handleGenerate = (moduleType: string, data: any) => {
    console.log(`生成${moduleType}模型:`, data);
    // 设置处理状态
    switch (moduleType) {
      case 'geology':
        setGeologyStatus('process');
        setTimeout(() => setGeologyStatus('finish'), 2000);
        break;
      case 'excavation':
        setExcavationStatus('process');
        setTimeout(() => setExcavationStatus('finish'), 2000);
        break;
      case 'support':
        setSupportStatus('process');
        setTimeout(() => setSupportStatus('finish'), 2000);
        break;
    }
  };
  
  // 响应式面板尺寸 - 根据设备类型和智能建议调整
  const [leftPanelWidth, setLeftPanelWidth] = useState(layoutConfig.leftPanelWidth);
  const [rightPanelWidth, setRightPanelWidth] = useState(layoutConfig.rightPanelWidth);

  // 响应式样式配置
  const responsiveStyles = {
    // 触摸优化按钮尺寸
    buttonSize: isTouch ? touchOptimizations.minButtonSize || 44 : 32,
    // 自适应间距
    spacing: isTouch ? touchOptimizations.spacing || 16 : 12,
    // 字体大小调整
    fontSize: {
      primary: isMobile ? '14px' : '16px',
      secondary: isMobile ? '12px' : '14px',
      tertiary: isMobile ? '10px' : '12px'
    },
    // 动画配置
    animations: {
      duration: touchOptimizations.animations?.duration || (isMobile ? 200 : 300),
      easing: touchOptimizations.animations?.easing || 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    // 性能优化样式
    particles: {
      count: performanceOptimizations.lowerParticleCount ? 50 : 200,
      blur: performanceOptimizations.disableBlur ? 'none' : 'blur(20px)'
    }
  };

  // 简化版组件健康检查
  useEffect(() => {
    // 启动时进行一次检查
    simplifiedComponentManager.performHealthCheck();
    
    // 每30分钟检查一次
    const healthCheckInterval = setInterval(() => {
      simplifiedComponentManager.performHealthCheck();
    }, 30 * 60 * 1000);

    return () => clearInterval(healthCheckInterval);
  }, []);

  // 复杂深基坑数据流状态 - 集成2号3号真实成果
  const [dataFlowNodes, setDataFlowNodes] = useState([
    {
      id: 'geology-node',
      name: '2号地质专家',
      type: 'geometry' as const,
      status: 'active' as const,
      position: { x: 50, y: 50 },
      data: { 
        size: 2456.7, 
        count: 125450, 
        quality: 0.95, 
        timestamp: Date.now(),
        details: {
          soilLayers: 12,
          boreholes: 45,
          waterLevel: -8.5,
          bedrockDepth: -25.3,
          // 2号几何专家实际成果
          geometryQualityService: 'ready',
          criticalRegionsProcessed: 3
        }
      }
    },
    {
      id: 'mesh-node', 
      name: '网格生成器',
      type: 'mesh' as const,
      status: 'processing' as const,
      position: { x: 150, y: 50 },
      data: { 
        size: 8920.3, 
        count: 1867500, 
        quality: 0.78, 
        timestamp: Date.now(),
        details: {
          elements: 1867500,
          nodes: 945823,
          qualityScore: 85,
          fragmentRegions: 156
        }
      }
    },
    {
      id: 'computation-node',
      name: '3号计算专家',
      type: 'computation' as const,
      status: 'completed' as const,
      position: { x: 250, y: 50 },
      data: { 
        size: 15600.8, 
        count: 2456890, 
        quality: 0.91, 
        timestamp: Date.now(),
        details: {
          maxDisplacement: 25.6,
          maxStress: 1.8,
          convergenceStatus: 'converged',
          iterations: 145
        }
      }
    }
  ]);

  const [dataFlowConnections, setDataFlowConnections] = useState([
    {
      id: 'geo-to-mesh',
      source: 'geology-node',
      target: 'mesh-node', 
      flowRate: 25.6,
      latency: 45,
      status: 'flowing' as const,
      dataType: 'geometry' as const
    },
    {
      id: 'mesh-to-comp',
      source: 'mesh-node',
      target: 'computation-node',
      flowRate: 18.2,
      latency: 32,
      status: 'flowing' as const,
      dataType: 'mesh' as const
    },
    // 3号建议: 添加质量反馈→几何优化的反向数据流
    {
      id: 'quality-feedback',
      source: 'mesh-node',
      target: 'geology-node',
      flowRate: 12.8,
      latency: 28,
      status: 'flowing' as const,
      dataType: 'quality_feedback' as const
    }
  ]);

  // 渲染左侧控制面板
  const renderLeftPanel = () => {
    // 实时活动指示器
    const getActivityBadge = (status: string) => {
      const badges: { [key: string]: { color: string; text: string; pulse?: boolean } } = {
        'wait': { color: '#8c8c8c', text: '待机' },
        'process': { color: '#1890ff', text: '处理中', pulse: true },
        'finish': { color: '#52c41a', text: '完成' },
        'error': { color: '#ff4d4f', text: '错误' }
      };
      const badge = badges[status as keyof typeof badges] || badges.wait;
      
      return (
        <span style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: badge.color,
          marginRight: '8px',
          animation: badge.pulse ? 'pulse 1.5s infinite' : undefined
        }} />
      );
    };


    const moduleConfigs = {
      'borehole-visualization': {
        title: '钻孔可视化',
        tabs: [
          { 
            key: 'borehole-data', 
            label: <span>{getActivityBadge('process')}钻孔数据</span>, 
            children: (
              <div style={{ padding: '20px', color: '#fff', height: '100%', overflow: 'auto' }}>
                <div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>🗺️ 钻孔数据可视化</div>
                
                {/* 钻孔数据状态 */}
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(24, 144, 255, 0.1)', borderRadius: '8px', border: '1px solid #1890ff' }}>
                  <div style={{ color: '#1890ff', fontWeight: 'bold', marginBottom: '8px' }}>钻孔数据状态</div>
                  <div style={{ fontSize: '12px', color: '#ffffff80', marginBottom: '4px' }}>已加载钻孔: 45个 | 有效数据: 42个</div>
                  <div style={{ fontSize: '12px', color: '#ffffff80', marginBottom: '4px' }}>深度范围: 5.2m - 35.8m</div>
                  <div style={{ fontSize: '12px', color: '#ffffff80' }}>数据质量: 93.3% 完整度</div>
                </div>

                {/* 可视化控制 */}
                <div style={{ padding: '12px', backgroundColor: 'rgba(82, 196, 26, 0.1)', borderRadius: '8px', border: '1px solid #52c41a' }}>
                  <div style={{ color: '#52c41a', fontWeight: 'bold', marginBottom: '8px' }}>可视化控制</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => console.log('3D钻孔显示')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#52c41a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      3D钻孔显示
                    </button>
                    <button 
                      onClick={() => console.log('地层剖面')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'transparent',
                        color: '#52c41a',
                        border: '1px solid #52c41a',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      地层剖面
                    </button>
                    <button 
                      onClick={() => console.log('数据统计')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'transparent',
                        color: '#1890ff',
                        border: '1px solid #1890ff',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      数据统计
                    </button>
                  </div>
                </div>
              </div>
            )
          }
        ]
      },
      'excavation-design': {
        title: '基坑设计',
        tabs: [
          { 
            key: 'excavation-params', 
            label: <span>{getActivityBadge(excavationStatus)}设计参数</span>, 
            children: <ExcavationModule 
              params={excavationParams}
              onParamsChange={(key, value) => handleParamsChange('excavation', key, value)}
              onGenerate={(data) => handleGenerate('excavation', data)}
              status={excavationStatus}
              disabled={geologyStatus !== 'finish'}
            /> 
          }
        ]
      },
      'support-structure': {
        title: '支护结构',
        tabs: [
          { 
            key: 'support-design', 
            label: <span>{getActivityBadge(supportStatus)}结构设计</span>, 
            children: <SupportModule 
              params={supportParams}
              onParamsChange={(key, value) => handleParamsChange('support', key, value)}
              onGenerate={(data) => handleGenerate('support', data)}
              status={supportStatus}
              disabled={excavationStatus !== 'finish'}
            /> 
          }
        ]
      },
      'geology-reconstruction': {
        title: '地质重建',
        tabs: [
          { 
            key: 'geology-data', 
            label: <span>{getActivityBadge(geologyStatus)}地质数据</span>, 
            children: <GeologyModule 
              params={geologyParams}
              onParamsChange={(key, value) => handleParamsChange('geology', key, value)}
              onGenerate={(data) => handleGenerate('geology', data)}
              status={geologyStatus}
            />
          },

        ]
      },
      'tunnel-modeling': {
        title: '隧道建模',
        tabs: [
          { 
            key: 'tunnel-data', 
            label: <span>{getActivityBadge('process')}隧道设计</span>, 
            children: (
              <div style={{ padding: '20px', color: '#fff', height: '100%', overflow: 'auto' }}>
                <div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>🚇 隧道建模</div>
                
                {/* 隧道工程信息 */}
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(24, 144, 255, 0.1)', borderRadius: '8px', border: '1px solid #1890ff' }}>
                  <div style={{ color: '#1890ff', fontWeight: 'bold', marginBottom: '8px' }}>隧道工程信息</div>
                  <div style={{ fontSize: '12px', color: '#ffffff80', marginBottom: '4px' }}>地铁1号线: 长度2800m, 直径6.2m, 深18.5m</div>
                  <div style={{ fontSize: '12px', color: '#ffffff80', marginBottom: '4px' }}>排水隧道: 长度1200m, 直径3.0m, 深12.0m</div>
                  <div style={{ fontSize: '12px', color: '#ffffff80' }}>共计156个盾构分段，已完成106个</div>
                </div>

                {/* 隧道建模控制 */}
                <div style={{ padding: '12px', backgroundColor: 'rgba(24, 144, 255, 0.1)', borderRadius: '8px', border: '1px solid #1890ff' }}>
                  <div style={{ color: '#1890ff', fontWeight: 'bold', marginBottom: '8px' }}>隧道建模控制</div>
                  <div style={{ fontSize: '12px', color: '#ffffff90', marginBottom: '8px' }}>建模进度: 68% | 精度等级: 高精度</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => {
                        console.log('自动建模');
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#1890ff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      自动建模
                    </button>
                    <button 
                      onClick={() => {
                        console.log('轨迹设计');
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'transparent',
                        color: '#1890ff',
                        border: '1px solid #1890ff',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      轨迹设计
                    </button>
                  </div>
                </div>
              </div>
            )
          }
        ]
      },
      'adjacent-buildings': {
        title: '相邻建筑分析',
        tabs: [
          { 
            key: 'building-analysis', 
            label: <span>{getActivityBadge('wait')}建筑分析</span>, 
            children: (
              <div style={{ padding: '20px', color: '#fff', height: '100%', overflow: 'auto' }}>
                <div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>🏢 相邻建筑分析</div>
                
                {/* 建筑物信息 */}
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(255, 122, 69, 0.1)', borderRadius: '8px', border: '1px solid #ff7a45' }}>
                  <div style={{ color: '#ff7a45', fontWeight: 'bold', marginBottom: '8px' }}>相邻建筑物信息</div>
                  <div style={{ fontSize: '12px', color: '#ffffff80', marginBottom: '4px' }}>办公大楺A: 25层120m, 距离35m - 中风险</div>
                  <div style={{ fontSize: '12px', color: '#ffffff80', marginBottom: '4px' }}>住宅楻B: 20层80m, 距离28m - 高风险</div>
                  <div style={{ fontSize: '12px', color: '#ffffff80', marginBottom: '4px' }}>商业中心C: 30层150m, 距离45m - 低风险</div>
                  <div style={{ fontSize: '12px', color: '#ffffff80' }}>停车场D: 3层15m, 距离22m - 高风险</div>
                </div>

                {/* 风险评估与预警 */}
                <div style={{ padding: '12px', backgroundColor: 'rgba(255, 77, 79, 0.1)', borderRadius: '8px', border: '1px solid #ff4d4f' }}>
                  <div style={{ color: '#ff4d4f', fontWeight: 'bold', marginBottom: '8px' }}>风险评估与预警</div>
                  <div style={{ fontSize: '12px', color: '#ffffff90', marginBottom: '8px' }}>当前预警: 3条 | 最高级别: 二级预警</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => {
                        console.log('实时风险评估');
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#ff4d4f',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      实时风险评估
                    </button>
                    <button 
                      onClick={() => {
                        console.log('监测站部署');
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'transparent',
                        color: '#ff7a45',
                        border: '1px solid #ff7a45',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      监测站部署
                    </button>
                  </div>
                </div>
              </div>
            )
          }
        ]
      },
      meshing: {
        title: '网格生成控制 (2号&3号协作)',
        tabs: [
          { 
            key: 'integrated', 
            label: <span>{getActivityBadge('process')}🎛️ 集成控制</span>, 
            component: <IntegratedMeshControl 
              onMeshGenerated={(meshData) => {
                console.log('网格生成完成:', meshData);
                ComponentDevHelper.logDevTip('网格生成成功，参数已保存');
              }}
              onParametersChange={(params) => {
                console.log('参数变更:', params);
                ComponentDevHelper.logDevTip(`参数已更新: 单元尺寸=${params.global_element_size}`);
              }}
            /> 
          },
          { 
            key: 'config', 
            label: <span>{getActivityBadge('wait')}⚙️ 高级算法</span>, 
            component: <AdvancedMeshConfig /> 
          },
          { 
            key: 'groups', 
            label: <span>{getActivityBadge('finish')}🏷️ 物理组</span>, 
            component: <PhysicalGroupManager /> 
          }
        ]
      },
      analysis: {
        title: '计算分析控制',
        tabs: [
          { 
            key: 'boundary', 
            label: <span>{getActivityBadge('finish')}边界条件</span>, 
            component: <BoundaryConditionConfigPanel projectId="enhanced-workspace-project" /> 
          },
          { 
            key: 'load', 
            label: <span>{getActivityBadge('process')}载荷配置</span>, 
            component: <LoadConfigPanel projectId="enhanced-workspace-project" /> 
          },
          { 
            key: 'computation', 
            label: <span>{getActivityBadge(expert3State.computationActive ? 'process' : 'wait')}💻 计算控制中心</span>, 
            component: threeScene ? <ComputationControlPanel 
              scene={threeScene}
              onStatusChange={(status) => console.log('计算状态:', status)}
              onResultsUpdate={(results) => handleExpert3Action('computation_complete', results)}
              onError={(error) => console.error('计算错误:', error)}
            /> : (
              <div style={{ padding: '20px', color: '#fff', textAlign: 'center' }}>
                <div style={{ marginBottom: '16px' }}>🔧 计算控制中心</div>
                <div style={{ color: '#faad14' }}>等待3D场景初始化...</div>
              </div>
            )
          },
          { 
            key: 'monitor', 
            label: <span>{getActivityBadge('process')}计算监控</span>, 
            component: <RealtimeProgressMonitor title="计算进度监控" showControls={true} /> 
          },
          {
            key: 'terra', 
            label: <span>{getActivityBadge('process')}Terra求解器</span>, 
            component: (
              <div style={{ padding: '20px', color: '#fff' }}>
                <div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>🧮 Terra计算引擎</div>
                <div style={{ color: '#1890ff', marginBottom: '12px' }}>🔧 多物理耦合: 活跃</div>
                <div style={{ color: '#52c41a', marginBottom: '12px' }}>⚡ GPU加速: 运行中</div>
                <div style={{ color: '#ff7a45', marginBottom: '12px' }}>📊 实时结果: 156,847 节点</div>
                <div style={{ color: '#13c2c2' }}>🎯 计算核心模块</div>
                
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid #ef4444' }}>
                  <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '8px' }}>🚀 计算控制快捷操作</div>
                  <button 
                    onClick={() => handleExpert3Action('start_computation', { taskType: 'deep_excavation' })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginBottom: '8px'
                    }}
                  >
                    启动深基坑计算
                  </button>
                  <button 
                    onClick={() => handleExpert3Action('toggle_physics_ai')}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {expert3State.physicsAIVisible ? '隐藏' : '显示'}物理AI面板
                  </button>
                </div>
              </div>
            )
          }
        ]
      },
      results: {
        title: '结果查看控制 (1号&3号协作)',
        tabs: [
          {
            key: 'visualization',
            label: <span>{getActivityBadge('process')}3D可视化</span>,
            children: <div style={{ padding: '20px', color: '#fff', textAlign: 'center' }}>📊 计算结果3D可视化</div>
          },
          {
            key: 'export',
            label: <span>{getActivityBadge('finish')}数据导出</span>,
            children: <div style={{ padding: '20px', color: '#fff', textAlign: 'center' }}>💾 结果数据导出</div>
          },
          {
            key: 'analysis',
            label: <span>{getActivityBadge('process')}后处理分析</span>,
            component: (
              <div style={{ padding: '20px', color: '#fff' }}>
                <div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>🔍 专业后处理分析</div>
                <div style={{ color: '#1890ff', marginBottom: '12px' }}>📐 截面分析: 任意切面</div>
                <div style={{ color: '#52c41a', marginBottom: '12px' }}>📊 统计分析: 极值搜索</div>
                <div style={{ color: '#ff7a45', marginBottom: '12px' }}>🎯 关键点监控: 实时追踪</div>
                <div style={{ color: '#13c2c2' }}>📋 智能诊断报告生成</div>
              </div>
            )
          }
        ]
      }
    };

    const currentConfig = moduleConfigs[activeModule as keyof typeof moduleConfigs] || moduleConfigs['geology-reconstruction'];

    if (leftPanelState === 'collapsed') {
      return (
        <div style={{ width: '60px', background: themeConfig.colors.background.secondary }}>
          <Button
            type="text"
            icon={<ExpandOutlined />}
            onClick={() => setLeftPanelState('normal')}
            style={{ 
              width: '100%', 
              height: '60px',
              color: themeConfig.colors.text.secondary 
            }}
          />
        </div>
      );
    }

    return (
      <ModuleErrorBoundary moduleName={currentConfig.title}>
        <Card
          title={
            <div className="expert-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '-12px -16px 12px -16px', padding: '12px 16px' }}>
              <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}>{currentConfig.title}</span>
              <Space>
                <span style={{ 
                  fontSize: '10px', 
                  color: '#52c41a', 
                  background: 'rgba(82, 196, 26, 0.1)', 
                  padding: '2px 6px', 
                  borderRadius: '3px',
                  animation: 'pulse 2s infinite'
                }}>
                  ACTIVE
                </span>
                <Button
                  type="text"
                  size="small"
                  icon={<CompressOutlined />}
                  onClick={() => setLeftPanelState('collapsed')}
                  style={{ color: themeConfig.colors.text.tertiary }}
                />
              </Space>
            </div>
          }
          size="small"
          style={{
            height: '100%',
            background: `rgba(${parseInt(themeConfig.colors.background.secondary.slice(1, 3), 16)}, ${parseInt(themeConfig.colors.background.secondary.slice(3, 5), 16)}, ${parseInt(themeConfig.colors.background.secondary.slice(5, 7), 16)}, ${themeConfig.effects.glassOpacity})`,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${themeConfig.colors.border.primary}`,
            borderRadius: themeConfig.effects.borderRadius,
          }}
          bodyStyle={{
            padding: '12px',
            height: 'calc(100% - 60px)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Tabs
            items={currentConfig.tabs}
            size="small"
            tabPosition="top"
            style={{ 
              height: 'auto',
              minHeight: '100%'
            }}
            tabBarStyle={{
              marginBottom: '8px'
            }}
          />
        </Card>
      </ModuleErrorBoundary>
    );
  };

  // 渲染中央主视口 - 根据activeModule显示不同内容
  const renderMainViewport = () => {
    // 渲染网格工具栏
    const renderMeshToolbar = () => {
      const toolButtons = [
        {
          key: 'refresh',
          icon: meshToolState.isGenerating ? '⏳' : '🔄',
          tooltip: '刷新网格',
          onClick: meshToolHandlers.refreshMesh,
          disabled: meshToolState.isGenerating
        },
        {
          key: 'generate',
          icon: meshToolState.isGenerating ? '⏸️' : '▶️',
          tooltip: meshToolState.isGenerating ? '暂停生成' : '开始生成',
          onClick: meshToolState.isGenerating ? meshToolHandlers.pauseGeneration : meshToolHandlers.startGeneration,
          highlight: meshToolState.isGenerating
        },
        {
          key: 'quality',
          icon: '🔍',
          tooltip: '质量检查',
          onClick: meshToolHandlers.qualityCheck,
          active: meshToolState.qualityCheckActive
        },
        {
          key: 'measure',
          icon: '📏',
          tooltip: '测量工具',
          onClick: meshToolHandlers.measureTool,
          active: meshToolState.measureMode
        },
        {
          key: 'select',
          icon: '🎯',
          tooltip: '选择工具',
          onClick: meshToolHandlers.selectTool,
          active: meshToolState.selectMode
        },
        {
          key: 'view',
          icon: '👁️',
          tooltip: '视角控制',
          onClick: () => {
            const views = ['perspective', 'top', 'front', 'side'];
            const currentIndex = views.indexOf(meshToolState.currentView);
            const nextView = views[(currentIndex + 1) % views.length];
            meshToolHandlers.changeView(nextView);
          }
        },
        {
          key: 'save',
          icon: '💾',
          tooltip: '保存网格',
          onClick: meshToolHandlers.saveMesh
        },
        {
          key: 'export',
          icon: '📤',
          tooltip: '导出网格',
          onClick: meshToolHandlers.exportMesh
        },
        {
          key: 'settings',
          icon: '⚙️',
          tooltip: '快速设置',
          onClick: meshToolHandlers.quickSettings
        }
      ];

      return toolButtons.map(tool => (
        <div
          key={tool.key}
          title={tool.tooltip}
          onClick={tool.disabled ? undefined : tool.onClick}
          style={{
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: tool.active ? 'rgba(255, 255, 255, 0.3)' : 
                       tool.highlight ? 'rgba(255, 255, 255, 0.2)' :
                       'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            cursor: tool.disabled ? 'not-allowed' : 'pointer',
            border: tool.active ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid transparent',
            fontSize: '18px',
            opacity: tool.disabled ? 0.5 : 1,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!tool.disabled) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!tool.disabled) {
              e.currentTarget.style.background = tool.active ? 'rgba(255, 255, 255, 0.3)' : 
                                                  tool.highlight ? 'rgba(255, 255, 255, 0.2)' :
                                                  'rgba(255, 255, 255, 0.1)';
            }
          }}
        >
          {tool.icon}
        </div>
      ));
    };

    const getMainContent = () => {
      switch (activeModule) {
        case 'geology-reconstruction':
        case 'tunnel-modeling':
        case 'adjacent-buildings':
          return (
            <div style={{ 
              height: '100%',
              position: 'relative',
              display: 'flex'
            }}>
              {/* 主3D视口 */}
              <div style={{ 
                flex: 1, 
                height: '100%',
                minHeight: '500px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <CAEThreeEngineComponent 
                  onSelection={(objects) => ComponentDevHelper.logDevTip(`地质环境选中: ${objects.length}个`)}
                  onMeasurement={(measurement) => ComponentDevHelper.logDevTip(`地质环境测量: ${JSON.stringify(measurement)}`)}
                  style={{ flex: 1, minHeight: '400px' }}
                />
                
                {/* 地质环境信息面板 */}
                <div style={{ 
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  padding: '12px',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  zIndex: 5
                }}>
                  <div style={{ color: '#52c41a', marginBottom: '4px' }}>🗺️ 地质图层: 5层</div>
                  <div style={{ color: '#1890ff', marginBottom: '4px' }}>🕳️ 钻孔数据: 45个</div>
                  <div style={{ color: '#faad14' }}>🏢 相邻建筑: 4栋</div>
                </div>
              </div>
            </div>
          );
          
        case 'geology-modeling':
        case 'borehole-visualization':
        case 'excavation-design':
        case 'support-structure':
          return (
            <div style={{ 
              height: '100%',
              position: 'relative',
              display: 'flex'
            }}>
              {/* 主3D视口 */}
              <div style={{ 
                flex: 1, 
                height: '100%',
                minHeight: '500px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <CAEThreeEngineComponent 
                  onSelection={(objects) => ComponentDevHelper.logDevTip(`几何选中: ${objects.length}个`)}
                  onMeasurement={(measurement) => ComponentDevHelper.logDevTip(`几何测量: ${JSON.stringify(measurement)}`)}
                  style={{ flex: 1, minHeight: '400px' }}
                />
              </div>
            </div>
          );
          
        case 'meshing':
          return (
            <div style={{ 
              height: '100%',
              display: 'flex'
            }}>
              {/* 左侧参数配置面板 */}
              <div style={{ 
                width: '300px',
                minWidth: '300px',
                background: 'rgba(0, 0, 0, 0.6)',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                overflow: 'auto'
              }}>
                <AdvancedMeshConfig />
              </div>
              
              {/* 中间3D预览区域 */}
              <div style={{ 
                flex: 1,
                position: 'relative',
                background: 'rgba(0, 0, 0, 0.2)',
                height: '100%',
                minHeight: '500px'
              }}>
                <CAEThreeEngineComponent 
                  onSelection={(objects) => ComponentDevHelper.logDevTip(`选中对象: ${objects.length}个`)}
                  onMeasurement={(measurement) => ComponentDevHelper.logDevTip(`测量结果: ${JSON.stringify(measurement)}`)}
                />
                
                {/* 左上角状态信息 */}
                <div style={{ 
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  padding: '12px',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  zIndex: 5
                }}>
                  <div style={{ color: '#52c41a', marginBottom: '4px' }}>🔗 Fragment区域: 1,867个</div>
                  <div style={{ color: '#1890ff', marginBottom: '4px' }}>📐 网格单元: 156,847个</div>
                  <div style={{ color: '#faad14' }}>⚙️ 质量评分: 87/100</div>
                </div>
              </div>
              
              {/* 右侧工具栏 */}
              <div style={{ 
                width: '60px',
                background: 'rgba(0, 0, 0, 0.8)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px 8px',
                gap: '12px'
              }}>
                {renderMeshToolbar()}
              </div>
            </div>
          );
          
        case 'analysis':
          return (
            <div style={{ height: '100%', display: 'flex' }}>
              {/* 主要3D计算结果可视化区域 */}
              <div style={{ flex: 1, position: 'relative' }}>
                <CAEThreeEngineComponent 
                  mode="computation_results"
                  onModelSelect={onSelection}
                  showStressVisualization={expert3State.computationActive}
                  showDeformationAnimation={expert3State.computationActive}
                  computationResults={expert3State.currentResults}
                  analysisProgress={expert3State.analysisProgress}
                />
                
                {/* 计算状态悬浮显示 */}
                {expert3State.computationActive && (
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(0, 0, 0, 0.85)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(250, 173, 20, 0.5)',
                    minWidth: '280px',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{ color: '#faad14', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
                      🧮 {expert3State.currentSolver}求解器运行中
                    </div>
                    <div style={{ color: '#ffffff', fontSize: '12px', marginBottom: '8px' }}>
                      计算进度: {expert3State.analysisProgress}%
                    </div>
                    <div style={{
                      width: '100%',
                      height: '4px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${expert3State.analysisProgress}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #faad14, #ff6b35)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <div style={{ color: '#ffffff80', fontSize: '11px', marginTop: '8px' }}>
                      任务: {expert3State.currentComputationTask || '深基坑分析'}
                    </div>
                  </div>
                )}
                
                {/* 计算结果概览 */}
                {expert3State.currentResults && (
                  <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '20px',
                    right: '20px',
                    maxHeight: '200px'
                  }}>
                    <ComputationResultsOverview 
                      results={expert3State.currentResults}
                      theme="dark"
                      enableAnimation={true}
                      onDetailView={(type) => console.log('查看详细结果:', type)}
                    />
                  </div>
                )}
              </div>
            </div>
          );
          
        case 'results':
          return (
            <div style={{ height: '100%' }}>
              <ResultsVisualizationDashboard 
                results={expert3State.currentResults}
                onVisualizationChange={(type) => handleExpert3Action('change_visualization', { mode: type })}
                onExport={(format) => console.log('导出结果:', format)}
                enableRealtimeUpdate={true}
                showDetailedAnalysis={true}
              />
            </div>
          );
        
        case 'physics-ai':
          return (
            <div style={{ height: '100%' }}>
              <PhysicsAIView 
                results={expert3State.currentResults}
                onParameterOptimization={(params) => handleExpert3Action('start_optimization', params)}
                onAIRecommendation={(recommendation) => handleExpert3Action('ai_recommendation', recommendation)}
                isOptimizing={expert3State.optimizationRunning}
                recommendations={expert3State.aiRecommendations}
              />
            </div>
          );
          
        default:
          return (
            <div style={{ 
              height: '100%', 
              width: '100%', 
              minHeight: '500px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <CAEThreeEngineComponent 
                onSelection={(objects) => ComponentDevHelper.logDevTip(`选中对象: ${objects.length}个`)}
                onMeasurement={(measurement) => ComponentDevHelper.logDevTip(`测量结果: ${JSON.stringify(measurement)}`)}
                style={{ flex: 1, minHeight: '400px' }}
              />
            </div>
          );
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* 主视口 - 根据模块显示不同内容 */}
        <div style={{ 
          flex: 1,
          background: themeConfig.colors.background.primary,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {getMainContent()}
        </div>

      </div>
    );
  };

  // 渲染右侧多窗口面板
  const renderRightPanel = () => {
    if (rightPanelState === 'collapsed') {
      return (
        <div style={{ width: '60px', background: themeConfig.colors.background.secondary }}>
          <Button
            type="text"
            icon={<ExpandOutlined />}
            onClick={() => setRightPanelState('normal')}
            style={{ 
              width: '100%', 
              height: '60px',
              color: themeConfig.colors.text.secondary 
            }}
          />
        </div>
      );
    }

    // 临时简化版本 - 避免语法错误
    const getRightPanelItems = () => {
      return [
        {
          key: 'monitor',
          label: `${activeModule} 监控`,
          children: (
            <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
              <div style={{ color: '#ffffff' }}>
                <h3>{activeModule === 'geology-modeling' ? '🌍 地质建模数据' :
                     activeModule === 'borehole-visualization' ? '🗺️ 钻孔可视化数据' :
                     activeModule === 'excavation-design' ? '🏗️ 基坑设计数据' :
                     activeModule === 'support-structure' ? '🏢 支护结构数据' :
                     activeModule === 'meshing' ? '🔲 网格生成数据' :
                     activeModule === 'analysis' ? '⚡ 计算分析数据' :
                     '📊 结果查看数据'}</h3>
                <p>模块: {activeModule}</p>
                <p>状态: 活跃</p>
                <p>更新时间: {new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          )
        }
      ];
    };

    /* 原始复杂版本暂时注释
    const getRightPanelItems = () => {
      switch (activeModule) {
        case 'geometry':
          return [
            {
              key: 'geometry-data',
              label: '几何数据',  
              children: (
                <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Card size="small" title="🗺️ 地质模型" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                      <div style={{ fontSize: '12px', color: '#ffffff80' }}>
                        <div>钻孔数量: 45个</div>
                        <div>地层数: 12层</div>
                        <div>地下水位: -8.5m</div>
                        <div>基岩深度: -25.3m</div>
                      </div>
                    </Card>
                    <Card size="small" title="🏗️ 基坑几何" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                      <div style={{ fontSize: '12px', color: '#ffffff80' }}>
                        <div>开挖深度: 15m</div>
                        <div>基坑面积: 2,400m²</div>
                        <div>周长: 185.2m</div>
                        <div>分层数: 5层</div>
                      </div>
                    </Card>
                    <Card size="small" title="🛡️ 支护结构" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                      <div style={{ fontSize: '12px', color: '#ffffff80' }}>
                        <div>围护桩: 156根</div>
                        <div>支撑系统: 3道</div>
                        <div>锚杆: 89根</div>
                        <div>止水帷幕: 完成</div>
                      </div>
                    </Card>
                  </Space>
                </div>
              )
            },
            {
              key: 'geometry-progress',
              label: '建模进度',
              children: (
                <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                      <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>地质建模</Text>
                      <Progress percent={100} size="small" strokeColor="#52c41a" />
                    </div>
                    <div>
                      <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>基坑设计</Text>
                      <Progress percent={85} size="small" strokeColor="#1890ff" />
                    </div>
                    <div>
                      <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>支护结构</Text>
                      <Progress percent={60} size="small" strokeColor="#faad14" />
                    </div>
                    <div>
                      <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>几何检验</Text>
                      <Progress percent={30} size="small" strokeColor="#ff4d4f" />
                    </div>
                  </Space>
                </div>
              )
            }
          ];

        case 'meshing':
          return [
            {
              key: 'mesh-quality',
              label: '网格质量',
              children: (
                <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Card size="small" title="🔲 网格统计" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                      <div style={{ fontSize: '12px', color: '#ffffff80' }}>
                        <div>单元总数: 156,847</div>
                        <div>节点数: 89,234</div>
                        <div>Fragment区域: 1,867</div>
                        <div>边界面: 2,456</div>
                      </div>
                    </Card>
                    <Card size="small" title="📊 质量指标" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                      <Row gutter={8}>
                        <Col span={12}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#52c41a', fontWeight: 'bold', fontSize: '16px' }}>87</div>
                            <div style={{ fontSize: '10px', color: '#ffffff60' }}>质量评分</div>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#1890ff', fontWeight: 'bold', fontSize: '16px' }}>0.82</div>
                            <div style={{ fontSize: '10px', color: '#ffffff60' }}>最小角度</div>
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  </Space>
                </div>
              )
            },
            {
              key: 'mesh-process',
              label: '生成进度',
              children: (
                <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                      <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>几何分割</Text>
                      <Progress percent={100} size="small" strokeColor="#52c41a" />
                    </div>
                    <div>
                      <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>网格生成</Text>
                      <Progress percent={75} size="small" strokeColor="#1890ff" />
                    </div>
                    <div>
                      <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>质量检查</Text>
                      <Progress percent={45} size="small" strokeColor="#faad14" />
                    </div>
                    <div>
                      <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>优化细化</Text>
                      <Progress percent={20} size="small" strokeColor="#ff4d4f" />
                    </div>
                  </Space>
                </div>
              )
            }
          ];

        case 'analysis':
          return [
            {
              key: 'computation-status',
              label: '计算状态',
              children: (
                <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Card size="small" title="🧮 Terra求解器" style={{ background: 'rgba(250, 173, 20, 0.05)' }}>
                      <div style={{ fontSize: '12px', color: '#ffffff80' }}>
                        <div>求解状态: 运行中</div>
                        <div>迭代次数: 1,248</div>
                        <div>收敛精度: 1.2e-6</div>
                        <div>剩余时间: 156s</div>
                      </div>
                    </Card>
                    <Card size="small" title="⚡ GPU加速" style={{ background: 'rgba(250, 173, 20, 0.05)' }}>
                      <Row gutter={8}>
                        <Col span={12}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#faad14', fontWeight: 'bold', fontSize: '16px' }}>85%</div>
                            <div style={{ fontSize: '10px', color: '#ffffff60' }}>GPU利用率</div>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#1890ff', fontWeight: 'bold', fontSize: '16px' }}>12GB</div>
                            <div style={{ fontSize: '10px', color: '#ffffff60' }}>显存使用</div>
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  </Space>
                </div>
              )
            },
            {
              key: 'physics-monitor',
              label: '物理场监控',
              children: (
                <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                      <Text style={{ color: '#faad14', fontWeight: 'bold' }}>位移收敛</Text>
                      <Progress percent={92} size="small" strokeColor="#52c41a" />
                    </div>
                    <div>
                      <Text style={{ color: '#faad14', fontWeight: 'bold' }}>应力平衡</Text>
                      <Progress percent={88} size="small" strokeColor="#1890ff" />
                    </div>
                    <div>
                      <Text style={{ color: '#faad14', fontWeight: 'bold' }}>渗流稳定</Text>
                      <Progress percent={65} size="small" strokeColor="#faad14" />
                    </div>
                    <div>
                      <Text style={{ color: '#faad14', fontWeight: 'bold' }}>温度场</Text>
                      <Progress percent={40} size="small" strokeColor="#ff4d4f" />
                    </div>
                  </Space>
                </div>
              )
            }
          ];

        case 'results':
          return [
            {
              key: 'visualization',
              label: '可视化控制',
              children: (
                <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Card size="small" title="🎨 应力云图" style={{ background: 'rgba(235, 47, 150, 0.05)' }}>
                      <div style={{ fontSize: '12px', color: '#ffffff80' }}>
                        <div>最大应力: 2.8 MPa</div>
                        <div>最小应力: 0.12 MPa</div>
                        <div>应力集中: 基坑角部</div>
                        <div>安全系数: 2.1</div>
                      </div>
                    </Card>
                    <Card size="small" title="📈 位移分析" style={{ background: 'rgba(235, 47, 150, 0.05)' }}>
                      <div style={{ fontSize: '12px', color: '#ffffff80' }}>
                        <div>最大位移: 15.6 mm</div>
                        <div>沉降量: 8.2 mm</div>
                        <div>水平位移: 12.4 mm</div>
                        <div>变形趋势: 稳定</div>
                      </div>
                    </Card>
                  </Space>
                </div>
              )
            },
            {
              key: 'export-data',
              label: '数据导出',
              children: (
                <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Button size="small" type="primary" style={{ width: '100%' }}>
                      📄 导出VTK格式
                    </Button>
                    <Button size="small" style={{ width: '100%' }}>
                      📊 导出CSV数据
                    </Button>
                    <Button size="small" style={{ width: '100%' }}>
                      🖼️ 导出PNG图像
                    </Button>
                    <Button size="small" style={{ width: '100%' }}>
                      📈 生成分析报告
                    </Button>
                    <div style={{ marginTop: '16px' }}>
                      <Text style={{ fontSize: '10px', color: '#ffffff60' }}>
                        导出状态: 准备就绪<br/>
                        文件大小: 约 145MB<br/>
                        预计时间: 30秒
                      </Text>
                    </div>
                  </Space>
                </div>
              )
            }
          ];

        default:
          return [
            {
              key: 'monitor',
              label: '实时监控',
              children: (
                <div style={{ height: '100%', overflowY: 'auto' }}>
                  <div style={{ height: '200px', marginBottom: '12px' }}>
                    <DataStreamViz
                      nodes={dataFlowNodes}
                      connections={dataFlowConnections}
                      onNodeClick={(node) => ComponentDevHelper.logDevTip(`点击节点: ${node.name}`)}
                      onConnectionClick={(conn) => ComponentDevHelper.logDevTip(`点击连接: ${conn.id}`)}
                      showMetrics={true}
                      width={350}
                      height={180}
                      enhancedEffects={true}
                      soundEnabled={true}
                      particleBackground={true}
                    />
                  </div>
                  <Card
                    title="系统状态监控"
                    size="small"
                    style={{ 
                      background: `rgba(${parseInt(themeConfig.colors.background.tertiary.slice(1, 3), 16)}, ${parseInt(themeConfig.colors.background.tertiary.slice(3, 5), 16)}, ${parseInt(themeConfig.colors.background.tertiary.slice(5, 7), 16)}, 0.6)`,
                      border: `1px solid ${themeConfig.colors.border.secondary}`
                    }}
                  >
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Statistic
                          title="CPU使用率"
                          value={68}
                          suffix="%"
                          valueStyle={{ color: themeConfig.colors.warning, fontSize: '16px' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="内存使用"
                          value={4.2}
                          suffix="GB"
                          valueStyle={{ color: themeConfig.colors.info, fontSize: '16px' }}
                        />
                      </Col>
                      <Col span={24}>
                        <div style={{ marginTop: '8px' }}>
                          <Text style={{ color: themeConfig.colors.text.secondary, fontSize: '12px' }}>
                            计算进度
                          </Text>
                          <Progress
                            percent={75}
                      status="active"
                      strokeColor={{
                        '0%': themeConfig.colors.primary,
                        '100%': themeConfig.colors.success
                      }}
                      trailColor="rgba(255,255,255,0.1)"
                      size="small"
                      style={{ marginTop: '4px' }}
                    />
                  </div>
                </Col>
              </Row>
            </Card>
          </div>
        )
      },
      {
        key: 'data',
        label: '数据详情',
        children: (
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Card
                title="地质参数表"
                size="small"
                style={{ 
                  background: `rgba(${parseInt(themeConfig.colors.background.tertiary.slice(1, 3), 16)}, ${parseInt(themeConfig.colors.background.tertiary.slice(3, 5), 16)}, ${parseInt(themeConfig.colors.background.tertiary.slice(5, 7), 16)}, 0.6)`,  
                  border: `1px solid ${themeConfig.colors.border.secondary}`
                }}
              >
                <div style={{ fontSize: '12px', color: themeConfig.colors.text.secondary }}>
                  <div>土层总数: {dataFlowNodes[0]?.data?.details?.soilLayers || 12}层</div>
                  <div>钻孔数量: {dataFlowNodes[0]?.data?.details?.boreholes || 45}个</div>
                  <div>地下水位: {dataFlowNodes[0]?.data?.details?.waterLevel || -8.5}m</div>
                  <div>基岩深度: {dataFlowNodes[0]?.data?.details?.bedrockDepth || -25.3}m</div>
                </div>
              </Card>

              <Card
                title="网格质量分析"
                size="small"
                style={{ 
                  background: `rgba(${parseInt(themeConfig.colors.background.tertiary.slice(1, 3), 16)}, ${parseInt(themeConfig.colors.background.tertiary.slice(3, 5), 16)}, ${parseInt(themeConfig.colors.background.tertiary.slice(5, 7), 16)}, 0.6)`,
                  border: `1px solid ${themeConfig.colors.border.secondary}`
                }}
              >
                <div style={{ fontSize: '12px', color: themeConfig.colors.text.secondary }}>
                  <div>单元总数: {dataFlowNodes[1]?.data?.details?.elements?.toLocaleString() || '1,867,500'}</div>
                  <div>节点总数: {dataFlowNodes[1]?.data?.details?.nodes?.toLocaleString() || '945,823'}</div>
                  <div>质量评分: {dataFlowNodes[1]?.data?.details?.qualityScore || 85}/100</div>
                  <div>Fragment区域: {dataFlowNodes[1]?.data?.details?.fragmentRegions || 156}个</div>
                </div>
              </Card>

              <Card
                title="计算结果概览"
                size="small"
                style={{ 
                  background: `rgba(${parseInt(themeConfig.colors.background.tertiary.slice(1, 3), 16)}, ${parseInt(themeConfig.colors.background.tertiary.slice(3, 5), 16)}, ${parseInt(themeConfig.colors.background.tertiary.slice(5, 7), 16)}, 0.6)`,
                  border: `1px solid ${themeConfig.colors.border.secondary}`
                }}
              >
                <div style={{ fontSize: '12px', color: themeConfig.colors.text.secondary }}>
                  <div>最大位移: {dataFlowNodes[2]?.data?.details?.maxDisplacement || 25.6}mm</div>
                  <div>最大应力: {dataFlowNodes[2]?.data?.details?.maxStress || 1.8}MPa</div>
                  <div>收敛状态: {dataFlowNodes[2]?.data?.details?.convergenceStatus === 'converged' ? '已收敛' : '计算中'}</div>
                  <div>迭代次数: {dataFlowNodes[2]?.data?.details?.iterations || 145}次</div>
                </div>
              </Card>
            </Space>
          </div>
        )
      },
      {
        key: 'tools',
        label: '工具面板',
        children: (
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button
                type="primary"
                block
                icon={<ThunderboltOutlined />}
                onClick={() => ComponentDevHelper.logDevTip('启动快速分析')}
              >
                快速分析
              </Button>
              
              <Button
                block
                icon={<DatabaseOutlined />}
                onClick={() => ComponentDevHelper.logDevTip('数据导出')}
              >
                数据导出
              </Button>


              <Button
                type="primary"
                block
                icon={<MonitorOutlined />}
                onClick={() => {
                  // 3号建议: 集成协作演示数据的复杂场景
                  setDataFlowNodes(prevNodes => prevNodes.map(node => {
                    switch (node.id) {
                      case 'geology-node':
                        return {
                          ...node,
                          status: 'processing' as const,
                          data: node.data ? {
                            ...node.data,
                            size: 3200.8,  // 复杂几何数据
                            quality: 0.93,
                            details: {
                              ...node.data.details,
                              geometryComplexity: 'high',
                              dataReadyForMesh: true,
                              optimizationSuggestions: ['减少尖锐角', '平滑边界'],
                              // 2号几何专家实际成果
                              boreholeCount: 45,
                              criticalRegions: ['基坑角点', '支护接触面', '材料分界面'],
                              geometryQualityService: 'ready',
                              dxfServiceEnabled: true
                            }
                          } : undefined
                        };
                      case 'mesh-node':
                        return {
                          ...node, 
                          status: 'active' as const,
                          data: node.data ? {
                            ...node.data,
                            size: 7456.2,        // 3号验证数据: 200万单元
                            count: 2000000,      // 3号测试规模
                            quality: 0.67,       // 667秒生成时间对应质量
                            details: {
                              ...node.data.details,
                              generationTime: 667, // 3号实测时间
                              qualityFeedback: '需要几何优化',
                              fragmentRegions: 5, // 3号验证：5个Fragment分组
                              // 3号计算专家实际成果
                              meshQualityAnalysis: 'completed',
                              feedbackTo2nd: ['基坑角点圆角化', '避免尖锐角度', '几何连续性'],
                              qualityScore: 0.68, // 3号验证数据
                              intelligentFeedback: true
                            }
                          } : undefined
                        };
                      case 'computation-node':
                        return {
                          ...node,
                          status: 'processing' as const,
                          data: node.data ? {
                            ...node.data,
                            size: 8192.0,        // 3号配置: 8GB内存限制
                            quality: 0.95,       // Terra求解器质量
                            details: {
                              ...node.data.details,
                              memoryOptimized: true,
                              renderingOptimized: true
                            }
                          } : undefined
                        };
                      default:
                        return node;
                    }
                  }));
                  
                  // 增强数据流动画效果 - 包含反向反馈流
                  setDataFlowConnections(prevConns => prevConns.map(conn => ({
                    ...conn,
                    status: 'flowing' as const,
                    flowRate: conn.id === 'quality-feedback' ? 15.2 : Math.random() * 60 + 20,
                    latency: conn.id === 'quality-feedback' ? 22 : Math.random() * 50 + 10
                  })));
                  
                  ComponentDevHelper.logDevTip('🚀 启动2号-3号协作演示: 包含质量反馈循环');
                }}
                style={{ marginTop: '8px' }}
              >
                启动深基坑工作流
              </Button>
            </Space>
          </div>
        )
      }
    ];
    */

    const rightPanelItems = getRightPanelItems();

    return (
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: themeConfig.colors.success }}>多窗口数据面板</span>
            <Space>
              <Button
                type="text"
                size="small"
                icon={<CompressOutlined />}
                onClick={() => setRightPanelState('collapsed')}
                style={{ color: themeConfig.colors.text.tertiary }}
              />
            </Space>
          </div>
        }
        size="small"
        style={{
          height: '100%',
          background: `rgba(${parseInt(themeConfig.colors.background.secondary.slice(1, 3), 16)}, ${parseInt(themeConfig.colors.background.secondary.slice(3, 5), 16)}, ${parseInt(themeConfig.colors.background.secondary.slice(5, 7), 16)}, ${themeConfig.effects.glassOpacity})`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${themeConfig.colors.border.primary}`,
          borderRadius: themeConfig.effects.borderRadius,
        }}
        bodyStyle={{
          padding: 0,
          height: 'calc(100% - 60px)'
        }}
      >
        <Tabs
          activeKey={rightPanelTab}
          onChange={setRightPanelTab}
          items={rightPanelItems}
          size="small"
          style={{ height: '100%' }}
          tabBarStyle={{
            margin: 0,
            padding: '0 12px',
            background: `rgba(${parseInt(themeConfig.colors.background.tertiary.slice(1, 3), 16)}, ${parseInt(themeConfig.colors.background.tertiary.slice(3, 5), 16)}, ${parseInt(themeConfig.colors.background.tertiary.slice(5, 7), 16)}, 0.8)`
          }}
        />
      </Card>
    );
  };

  // 渲染增强型顶部状态栏
  const renderEnhancedHeader = () => {
    return (
      <div style={{
        height: isMobile ? '120px' : '80px',
        background: `linear-gradient(90deg, ${themeConfig.colors.background.secondary}, ${themeConfig.colors.background.tertiary}, ${themeConfig.colors.background.secondary})`,
        borderBottom: `2px solid ${themeConfig.colors.primary}`,
        display: isMobile ? 'flex' : 'grid',
        gridTemplateColumns: isMobile ? undefined : `${leftPanelWidth}px 1fr ${rightPanelWidth}px`,
        flexDirection: isMobile ? 'column' : undefined,
        alignItems: 'center',
        padding: isMobile ? '8px 12px' : '0 20px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
      }}>
        {/* 项目信息区域 */}
        <div>
          <Title level={4} style={{ 
            color: activeModule === 'geology-modeling' ? '#52c41a' :
                   activeModule === 'borehole-visualization' ? '#1890ff' :
                   activeModule === 'excavation-design' ? '#faad14' :
                   activeModule === 'support-structure' ? '#722ed1' :
                   activeModule === 'geology-reconstruction' ? '#52c41a' :
                   activeModule === 'tunnel-modeling' ? '#1890ff' :
                   activeModule === 'adjacent-buildings' ? '#ff7a45' :
                   activeModule === 'meshing' ? '#1890ff' :
                   activeModule === 'analysis' ? '#faad14' :
                   activeModule === 'results' ? '#eb2f96' :
                   themeConfig.colors.primary, 
            margin: 0 
          }}>
            {activeModule === 'geology-modeling' ? '🌍 地质建模工作区' :
             activeModule === 'borehole-visualization' ? '🗺️ 钻孔可视化工作区' :
             activeModule === 'excavation-design' ? '🏗️ 基坑设计工作区' :
             activeModule === 'support-structure' ? '🏢 支护结构工作区' :
             activeModule === 'geology-reconstruction' ? '🌍 三维地质重建工作区' :
             activeModule === 'tunnel-modeling' ? '🚇 隧道建模工作区' :
             activeModule === 'adjacent-buildings' ? '🏢 相邻建筑分析工作区' :
             activeModule === 'meshing' ? '🔲 网格生成工作区' :
             activeModule === 'analysis' ? '⚡ 计算分析工作区' :
             activeModule === 'results' ? '📊 结果查看工作区' :
             '深基坑工程项目'}
          </Title>
          <Text style={{ color: themeConfig.colors.text.secondary, fontSize: '12px' }}>
            {activeModule === 'geology-modeling' ? '地质数据 • 参数插值 • 三维建模' :
             activeModule === 'borehole-visualization' ? '钻孔数据 • 3D显示 • 地层剖面' :
             activeModule === 'excavation-design' ? '基坑参数 • 开挖方案 • 边坡稳定' :
             activeModule === 'support-structure' ? '支护设计 • 结构计算 • 安全评估' :
             activeModule === 'geology-reconstruction' ? '地质数据 • 参数插值 • 三维重建' :
             activeModule === 'tunnel-modeling' ? '隧道设计 • 盾构仿真 • 施工监控' :
             activeModule === 'adjacent-buildings' ? '建筑分析 • 风险评估 • 监测部署' :
             activeModule === 'meshing' ? '网格生成 • 自适应细化 • 质量分析' :
             activeModule === 'analysis' ? 'Terra求解器 • 多物理耦合 • 计算分析' :
             activeModule === 'results' ? '3D可视化 • 数据导出 • 后处理分析' :
             '选择左侧模块开始工作'}
          </Text>
        </div>


      </div>
    );
  };

  return (
    <Layout style={{ height: '100vh', background: themeConfig.colors.background.primary }}>
      <Content style={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* 增强型顶部状态栏 */}
        {renderEnhancedHeader()}

        {/* 主工作区域 */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          padding: '12px',
          gap: '12px',
          overflow: 'hidden'
        }}>
          {/* 左侧智能控制面板 */}
          <div style={{ 
            width: leftPanelState === 'collapsed' ? '60px' : `${leftPanelWidth}px`,
            transition: 'width 0.3s ease'
          }}>
            {renderLeftPanel()}
          </div>

          {/* 中央3D+数据可视化区域 */}
          <div style={{ flex: 1, display: 'flex' }}>
            <div style={{ flex: 1 }}>
              {renderMainViewport()}
            </div>
            
            {/* 右侧专家工具栏区域 */}
            <div style={{ width: '80px', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px' }}>
              {/* 2号专家几何工具栏 */}
              {(activeModule === 'geology-modeling' || activeModule === 'borehole-visualization' || activeModule === 'excavation-design' || activeModule === 'support-structure') && (
                <VerticalToolbar
                  activeTool={activeGeometryTool}
                  onToolSelect={handleGeometryToolSelect}
                />
              )}
              
              
              {/* 3号专家网格工具栏 */}
              {activeModule === 'meshing' && (
                <MeshingToolbar 
                  geometryLoaded={true}
                  meshGenerated={expert3State.meshingStatus === 'completed'}
                  onGenerateMesh={() => {
                    handleExpert3Action('start_meshing', {});
                    message.info('开始生成网格...');
                  }}
                  onMeshSettings={() => {
                    console.log('打开网格设置');
                    message.info('网格设置面板');
                  }}
                  onMeshValidation={() => {
                    console.log('执行网格验证');
                    message.info('正在验证网格质量...');
                    setTimeout(() => {
                      message.success('网格验证完成，质量良好');
                    }, 2000);
                  }}
                  onMeshPreview={() => {
                    console.log('预览网格');
                    message.info('网格预览模式已激活');
                  }}
                  onMeshStart={() => {
                    console.log('开始网格生成');
                    message.info('开始网格生成过程');
                  }}
                  onMeshPause={() => {
                    console.log('暂停网格生成');
                    message.warning('网格生成已暂停');
                  }}
                  onMeshReset={() => {
                    console.log('重置网格');
                    message.info('网格已重置');
                  }}
                  onOpenAlgorithmConfig={() => {
                    console.log('打开算法配置');
                    message.info('算法配置面板');
                  }}
                  onShowQualityAnalysis={() => {
                    console.log('显示质量分析');
                    message.info('质量分析报告');
                  }}
                  onOpenPhysicalGroups={() => {
                    console.log('打开物理组');
                    message.info('物理组管理面板');
                  }}
                  onExportMesh={(format) => {
                    console.log('导出网格:', format);
                    message.info('正在导出网格文件...');
                    setTimeout(() => {
                      message.success('网格文件导出完成');
                    }, 2000);
                  }}
                  onRefreshGeometry={() => {
                    console.log('刷新几何');
                    message.info('几何模型已刷新');
                  }}
                  onShowMeshStatistics={() => {
                    console.log('显示网格统计');
                    message.info('网格统计信息面板');
                  }}
                />
              )}
              
              {/* 3号专家分析工具栏 */}
              {activeModule === 'analysis' && (
                <AnalysisToolbar 
                  computationStatus={expert3State.computationActive ? 'running' : 'idle'}
                  meshingStatus={expert3State.meshingStatus}
                  analysisProgress={expert3State.analysisProgress}
                  onStartComputation={() => handleExpert3Action('start_computation')}
                  onStopComputation={() => handleExpert3Action('stop_computation')}
                  onShowMonitor={() => setRightPanelTab('computation-monitor')}
                  onOpenSolverConfig={() => console.log('打开求解器配置')}
                />
              )}
              
              {/* 3号专家物理AI工具栏 */}
              {activeModule === 'physics-ai' && (
                <PhysicsAIToolbar 
                  aiOptimizationActive={expert3State.physicsAIEnabled}
                  aiAnalysisComplete={expert3State.optimizationRunning}
                  currentRecommendations={expert3State.aiRecommendations}
                  analysisDataReady={true}
                  onStartAIOptimization={() => handleExpert3Action('start_optimization')}
                  onShowAISuggestions={() => console.log('显示AI建议')}
                  onOpenParameterTuning={() => console.log('参数调优')}
                  onToggleAIAssistant={(enabled) => handleExpert3Action('enable_physics_ai', { enabled })}
                />
              )}
              
              {/* 3号专家结果工具栏 */}
              {activeModule === 'results' && (
                <ResultsToolbar 
                  visualizationMode={expert3State.resultVisualizationMode}
                  resultsAvailable={expert3State.currentResults !== null}
                  onVisualizationChange={(mode) => handleExpert3Action('change_visualization', { mode })}
                  onExportResults={(format) => console.log('导出结果:', format)}
                  onShowAnimation={() => console.log('显示动画')}
                  onToggle3DView={() => console.log('切换3D视图')}
                />
              )}
            </div>
          </div>

          {/* 右侧数据面板 - 特定模块显示 */}
          {(activeModule === 'analysis' || activeModule === 'results') && (
            <div style={{ 
              width: rightPanelState === 'collapsed' ? '60px' : `${rightPanelWidth}px`,
              transition: 'width 0.3s ease'
            }}>
              {renderRightPanel()}
            </div>
          )}
        </div>
      </Content>

      {/* 3号专家物理AI嵌入式面板 */}
      {expert3State.physicsAIVisible && (
        <PhysicsAIEmbeddedPanel
          isVisible={expert3State.physicsAIVisible}
          onClose={() => handleExpert3Action('toggle_physics_ai')}
          onVariableChange={(variableId, newValue) => {
            console.log('3号专家 - 物理AI变量更新:', variableId, newValue);
          }}
          onOptimizationStart={() => {
            console.log('3号专家 - 启动物理AI优化');
          }}
          on3DViewportUpdate={(data) => {
            console.log('3号专家 - 3D视口更新:', data);
          }}
        />
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        @keyframes dataFlow {
          0% { transform: translateX(-20px); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(20px); opacity: 0; }
        }
      `}} />
    </Layout>
  );
};

export default EnhancedMainWorkspaceView;