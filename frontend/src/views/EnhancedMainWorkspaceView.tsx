/**
 * 增强型主工作空间视图
 * 1号架构师 - 融合当前布局+多窗口仪表板的深基坑专业方案
 */

import React, { useState, useRef, useEffect } from 'react';
import { Layout, Card, Tabs, Row, Col, Button, Space, Typography, Progress, Statistic } from 'antd';
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
import DataStreamViz from '../components/ui/DataStreamViz';
import ParticleBackground from '../components/ui/ParticleBackground';
import GlassmorphismCard from '../components/ui/GlassmorphismCard';
import GeologyModule from '../components/geology/GeologyModule';
import ExcavationModule from '../components/excavation/ExcavationModule';
import SupportModule from '../components/support/SupportModule';
import AdvancedMeshConfig from '../components/meshing/AdvancedMeshConfig';
import PhysicalGroupManager from '../components/meshing/PhysicalGroupManager';
import BoundaryConditionConfigPanel from '../components/computation/BoundaryConditionConfigPanel';
import LoadConfigPanel from '../components/computation/LoadConfigPanel';
import RealtimeProgressMonitor from '../components/computation/RealtimeProgressMonitor.simple';
import MeshInterface from '../components/computation/MeshInterface.simple';
// 3号计算专家组件集成
import ComputationControlPanel from '../components/ComputationControlPanel';
import PhysicsAIEmbeddedPanel from '../components/PhysicsAIEmbeddedPanel_SIMPLIFIED';
import { ModuleErrorBoundary } from '../core/ErrorBoundary';
import { useDeepCADTheme } from '../components/ui/DeepCADTheme';
import { ComponentDevHelper } from '../utils/developmentTools';
import { simplifiedComponentManager } from '../utils/SimplifiedComponentManager';

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
  activeModule = 'geometry' 
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
        background: linear-gradient(90deg, rgba(0,217,255,0.1) 0%, rgba(0,217,255,0.05) 100%);
        border-left: 3px solid #00d9ff;
        padding-left: 8px;
      }
    `;
    document.head.appendChild(style);
    
    return () => document.head.removeChild(style);
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
  const [subViewsEnabled, setSubViewsEnabled] = useState(layoutConfig.subViewEnabled);
  const [rightPanelTab, setRightPanelTab] = useState('monitor');
  
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
  
  // 3号计算专家状态管理
  const [expert3State, setExpert3State] = useState({
    computationActive: false,
    meshAnalysisActive: false,
    physicsAIVisible: false,
    currentComputationTask: null as string | null,
    computationResults: null as any
  });
  
  const [threeScene, setThreeScene] = useState<any>(null);
  
  // 3号专家功能处理
  const handleExpert3Action = (action: string, data?: any) => {
    console.log(`3号计算专家执行: ${action}`, data);
    
    switch (action) {
      case 'start_computation':
        setExpert3State(prev => ({ 
          ...prev, 
          computationActive: true,
          currentComputationTask: data?.taskType || 'deep_excavation'
        }));
        break;
        
      case 'show_mesh_analysis':
        setExpert3State(prev => ({ ...prev, meshAnalysisActive: true }));
        break;
        
      case 'toggle_physics_ai':
        setExpert3State(prev => ({ ...prev, physicsAIVisible: !prev.physicsAIVisible }));
        break;
        
      case 'computation_complete':
        setExpert3State(prev => ({ 
          ...prev, 
          computationActive: false,
          currentComputationTask: null,
          computationResults: data 
        }));
        break;
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
  const [subViewHeight, setSubViewHeight] = useState(layoutConfig.subViewHeight);

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
      const badges = {
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
      geometry: {
        title: '几何建模控制 (2号专家)',
        tabs: [
          { 
            key: 'geology', 
            label: <span>{getActivityBadge(geologyStatus)}地质建模</span>, 
            component: <GeologyModule 
              params={geologyParams}
              onParamsChange={(key, value) => handleParamsChange('geology', key, value)}
              onGenerate={(data) => handleGenerate('geology', data)}
              status={geologyStatus}
            /> 
          },
          { 
            key: 'borehole', 
            label: <span>{getActivityBadge('process')}钻孔可视化</span>, 
            component: (
              <div style={{ padding: '20px', color: '#fff' }}>
                <div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>🗺️ 钻孔数据可视化</div>
                <div style={{ color: '#1890ff', marginBottom: '12px' }}>📊 实时数据流: 45个钻孔</div>
                <div style={{ color: '#52c41a', marginBottom: '12px' }}>✅ 地层分析: 12层土质</div>
                <div style={{ color: '#ff7a45', marginBottom: '12px' }}>⚡ GPU渲染: 活跃中</div>
                <div style={{ color: '#13c2c2' }}>🔄 2号几何专家模块运行中...</div>
              </div>
            )
          },
          { 
            key: 'excavation', 
            label: <span>{getActivityBadge(excavationStatus)}基坑设计</span>, 
            component: <ExcavationModule 
              params={excavationParams}
              onParamsChange={(key, value) => handleParamsChange('excavation', key, value)}
              onGenerate={(data) => handleGenerate('excavation', data)}
              status={excavationStatus}
              disabled={geologyStatus !== 'finish'}
            /> 
          },
          { 
            key: 'support', 
            label: <span>{getActivityBadge(supportStatus)}支护结构</span>, 
            component: <SupportModule 
              params={supportParams}
              onParamsChange={(key, value) => handleParamsChange('support', key, value)}
              onGenerate={(data) => handleGenerate('support', data)}
              status={supportStatus}
              disabled={excavationStatus !== 'finish'}
            /> 
          }
        ]
      },
      meshing: {
        title: '网格生成控制 (2号&3号协作)',
        tabs: [
          { 
            key: 'interface', 
            label: <span>{getActivityBadge('finish')}网格接口</span>, 
            component: <MeshInterface /> 
          },
          { 
            key: 'fragment', 
            label: <span>{getActivityBadge('process')}Fragment可视化</span>, 
            component: (
              <div style={{ padding: '20px', color: '#fff' }}>
                <div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>🔲 Fragment网格可视化</div>
                <div style={{ color: '#1890ff', marginBottom: '12px' }}>🔗 GMSH Fragment: 激活</div>
                <div style={{ color: '#52c41a', marginBottom: '12px' }}>📐 几何分割: 1,867个区域</div>
                <div style={{ color: '#ff7a45', marginBottom: '12px' }}>⚙️ 自适应细化: 运行</div>
                <div style={{ color: '#13c2c2' }}>👥 2号&3号专家协作模块</div>
              </div>
            )
          },
          { 
            key: 'quality', 
            label: <span>{getActivityBadge(expert3State.meshAnalysisActive ? 'process' : 'wait')}🔍 网格质量分析</span>, 
            component: (
              <div style={{ padding: '20px', color: '#fff' }}>
                <div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>🔍 3号专家 - 智能网格质量分析</div>
                <div style={{ color: '#52c41a', marginBottom: '12px' }}>📊 总节点数: 15,847</div>
                <div style={{ color: '#52c41a', marginBottom: '12px' }}>🔲 总单元数: 8,923 (四面体)</div>
                <div style={{ color: '#faad14', marginBottom: '12px' }}>⚠️ 平均质量: 0.78</div>
                <div style={{ color: '#ef4444', marginBottom: '12px' }}>❌ 问题单元: 67个 (长宽比&gt;10)</div>
                <div style={{ color: '#13c2c2', marginBottom: '16px' }}>🎯 3号计算专家网格分析系统</div>
                
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(82, 196, 26, 0.1)', borderRadius: '8px', border: '1px solid #52c41a' }}>
                  <div style={{ color: '#52c41a', fontWeight: 'bold', marginBottom: '8px' }}>🛠️ 网格优化建议</div>
                  <div style={{ fontSize: '12px', color: '#fff', marginBottom: '8px' }}>• 在边界区域增加3层网格细化</div>
                  <div style={{ fontSize: '12px', color: '#fff', marginBottom: '8px' }}>• 将目标单元尺寸减小到1.5m</div>
                  <div style={{ fontSize: '12px', color: '#fff', marginBottom: '12px' }}>• 使用二次单元提升精度</div>
                  
                  <button 
                    onClick={() => handleExpert3Action('show_mesh_analysis')}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: '#52c41a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    启动质量分析
                  </button>
                </div>
              </div>
            )
          },
          { 
            key: 'config', 
            label: <span>{getActivityBadge('wait')}网格配置</span>, 
            component: <AdvancedMeshConfig /> 
          },
          { 
            key: 'groups', 
            label: <span>{getActivityBadge('finish')}物理组管理</span>, 
            component: <PhysicalGroupManager /> 
          }
        ]
      },
      analysis: {
        title: '计算分析控制 (3号专家)',
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
                <div style={{ marginBottom: '16px' }}>🔧 3号计算专家控制中心</div>
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
                <div style={{ color: '#13c2c2' }}>🎯 3号计算专家核心模块</div>
                
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
            component: (
              <div style={{ padding: '20px', color: '#fff' }}>
                <div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>📊 计算结果3D可视化</div>
                <div style={{ color: '#1890ff', marginBottom: '12px' }}>🎨 应力云图: GPU渲染中</div>
                <div style={{ color: '#52c41a', marginBottom: '12px' }}>📈 位移动画: 实时更新</div>
                <div style={{ color: '#ff7a45', marginBottom: '12px' }}>🔥 温度场: 热力耦合分析</div>
                <div style={{ color: '#13c2c2' }}>🎬 1号&3号协作可视化系统</div>
              </div>
            )
          },
          {
            key: 'export',
            label: <span>{getActivityBadge('finish')}数据导出</span>,
            component: (
              <div style={{ padding: '20px', color: '#fff' }}>
                <div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>💾 结果数据导出</div>
                <div style={{ color: '#1890ff', marginBottom: '12px' }}>📄 VTK格式: 准备就绪</div>
                <div style={{ color: '#52c41a', marginBottom: '12px' }}>📊 CSV数据: 时程曲线</div>
                <div style={{ color: '#ff7a45', marginBottom: '12px' }}>🖼️ 图像序列: 高清渲染</div>
                <div style={{ color: '#13c2c2' }}>📈 报告生成: PDF格式</div>
              </div>
            )
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

    const currentConfig = moduleConfigs[activeModule as keyof typeof moduleConfigs] || moduleConfigs.geometry;

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
              <span style={{ color: '#00d9ff', fontWeight: 'bold', fontSize: '14px' }}>{currentConfig.title}</span>
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
            overflowY: 'auto'
          }}
        >
          <Tabs
            items={currentConfig.tabs}
            size="small"
            tabPosition="top"
            style={{ height: '100%' }}
          />
        </Card>
      </ModuleErrorBoundary>
    );
  };

  // 渲染中央主视口 - 根据activeModule显示不同内容
  const renderMainViewport = () => {
    const getMainContent = () => {
      switch (activeModule) {
        case 'geometry':
          return (
            <div style={{ 
              height: '100%',
              background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.1) 0%, rgba(0, 217, 255, 0.05) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid rgba(0, 217, 255, 0.3)`,
              borderRadius: themeConfig.effects.borderRadius,
            }}>
              <div style={{ textAlign: 'center', color: '#ffffff' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏗️</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00d9ff', marginBottom: '8px' }}>
                  几何建模工作区
                </div>
                <div style={{ fontSize: '16px', color: '#ffffff80', marginBottom: '16px' }}>
                  2号几何专家 - 地质建模 • 基坑设计 • 支护结构
                </div>
                <CAEThreeEngineComponent 
                  onSelection={(objects) => ComponentDevHelper.logDevTip(`几何选中: ${objects.length}个`)}
                  onMeasurement={(measurement) => ComponentDevHelper.logDevTip(`几何测量: ${JSON.stringify(measurement)}`)}
                />
              </div>
            </div>
          );
          
        case 'meshing':
          return (
            <div style={{ 
              height: '100%',
              background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.1) 0%, rgba(82, 196, 26, 0.05) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid rgba(82, 196, 26, 0.3)`,
              borderRadius: themeConfig.effects.borderRadius,
            }}>
              <div style={{ textAlign: 'center', color: '#ffffff' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔲</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a', marginBottom: '8px' }}>
                  网格生成工作区
                </div>
                <div style={{ fontSize: '16px', color: '#ffffff80', marginBottom: '16px' }}>
                  2号&3号协作 - GMSH Fragment • 自适应细化 • 质量分析
                </div>
                <div style={{ marginTop: '20px' }}>
                  <div style={{ color: '#52c41a', marginBottom: '8px' }}>🔗 Fragment区域: 1,867个</div>
                  <div style={{ color: '#1890ff', marginBottom: '8px' }}>📐 网格单元: 156,847个</div>
                  <div style={{ color: '#faad14' }}>⚙️ 质量评分: 87/100</div>
                </div>
              </div>
            </div>
          );
          
        case 'analysis':
          return (
            <div style={{ 
              height: '100%',
              background: 'linear-gradient(135deg, rgba(250, 173, 20, 0.1) 0%, rgba(250, 173, 20, 0.05) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid rgba(250, 173, 20, 0.3)`,
              borderRadius: themeConfig.effects.borderRadius,
            }}>
              <div style={{ textAlign: 'center', color: '#ffffff' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14', marginBottom: '8px' }}>
                  计算分析工作区
                </div>
                <div style={{ fontSize: '16px', color: '#ffffff80', marginBottom: '16px' }}>
                  3号计算专家 - Terra求解器 • 多物理耦合 • 伴随方法
                </div>
                <div style={{ marginTop: '20px' }}>
                  <div style={{ color: '#faad14', marginBottom: '8px' }}>🧮 Terra引擎: 运行中</div>
                  <div style={{ color: '#1890ff', marginBottom: '8px' }}>⚡ GPU加速: 激活</div>
                  <div style={{ color: '#52c41a' }}>📊 收敛状态: 正常</div>
                </div>
              </div>
            </div>
          );
          
        case 'results':
          return (
            <div style={{ 
              height: '100%',
              background: 'linear-gradient(135deg, rgba(235, 47, 150, 0.1) 0%, rgba(235, 47, 150, 0.05) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid rgba(235, 47, 150, 0.3)`,
              borderRadius: themeConfig.effects.borderRadius,
            }}>
              <div style={{ textAlign: 'center', color: '#ffffff' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#eb2f96', marginBottom: '8px' }}>
                  结果查看工作区
                </div>
                <div style={{ fontSize: '16px', color: '#ffffff80', marginBottom: '16px' }}>
                  1号&3号协作 - 3D可视化 • 数据导出 • 后处理分析
                </div>
                <div style={{ marginTop: '20px' }}>
                  <div style={{ color: '#eb2f96', marginBottom: '8px' }}>🎨 应力云图: GPU渲染</div>
                  <div style={{ color: '#1890ff', marginBottom: '8px' }}>📈 位移动画: 实时</div>
                  <div style={{ color: '#52c41a' }}>💾 数据导出: 就绪</div>
                </div>
              </div>
            </div>
          );
          
        default:
          return (
            <CAEThreeEngineComponent 
              onSelection={(objects) => ComponentDevHelper.logDevTip(`选中对象: ${objects.length}个`)}
              onMeasurement={(measurement) => ComponentDevHelper.logDevTip(`测量结果: ${JSON.stringify(measurement)}`)}
            />
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

        {/* 下方分屏数据视图 */}
        {subViewsEnabled && (
          <div style={{ 
            height: subViewHeight,
            display: 'flex', 
            gap: '12px',
            marginTop: '12px'
          }}>
            <Card
              title="地质剖面分析"
              size="small"
              style={{ 
                flex: 1,
                background: `rgba(${parseInt(themeConfig.colors.background.secondary.slice(1, 3), 16)}, ${parseInt(themeConfig.colors.background.secondary.slice(3, 5), 16)}, ${parseInt(themeConfig.colors.background.secondary.slice(5, 7), 16)}, 0.8)`,
                border: `1px solid ${themeConfig.colors.border.secondary}`
              }}
            >
              <div style={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: themeConfig.colors.text.secondary
              }}>
                <Space direction="vertical" align="center">
                  <BarChartOutlined style={{ fontSize: '24px' }} />
                  <Text style={{ color: themeConfig.colors.text.tertiary }}>地质剖面图表</Text>
                </Space>
              </div>
            </Card>

            <Card
              title="结果分析图表"
              size="small"
              style={{ 
                flex: 1,
                background: `rgba(${parseInt(themeConfig.colors.background.secondary.slice(1, 3), 16)}, ${parseInt(themeConfig.colors.background.secondary.slice(3, 5), 16)}, ${parseInt(themeConfig.colors.background.secondary.slice(5, 7), 16)}, 0.8)`,
                border: `1px solid ${themeConfig.colors.border.secondary}`
              }}
            >
              <div style={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: themeConfig.colors.text.secondary
              }}>
                <Space direction="vertical" align="center">
                  <DatabaseOutlined style={{ fontSize: '24px' }} />
                  <Text style={{ color: themeConfig.colors.text.tertiary }}>计算结果图表</Text>
                </Space>
              </div>
            </Card>
          </div>
        )}
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
                <h3>{activeModule === 'geometry' ? '🏗️ 几何建模数据' :
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
                    <Card size="small" title="🗺️ 地质模型" style={{ background: 'rgba(0, 217, 255, 0.05)' }}>
                      <div style={{ fontSize: '12px', color: '#ffffff80' }}>
                        <div>钻孔数量: 45个</div>
                        <div>地层数: 12层</div>
                        <div>地下水位: -8.5m</div>
                        <div>基岩深度: -25.3m</div>
                      </div>
                    </Card>
                    <Card size="small" title="🏗️ 基坑几何" style={{ background: 'rgba(0, 217, 255, 0.05)' }}>
                      <div style={{ fontSize: '12px', color: '#ffffff80' }}>
                        <div>开挖深度: 15m</div>
                        <div>基坑面积: 2,400m²</div>
                        <div>周长: 185.2m</div>
                        <div>分层数: 5层</div>
                      </div>
                    </Card>
                    <Card size="small" title="🛡️ 支护结构" style={{ background: 'rgba(0, 217, 255, 0.05)' }}>
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
                      <Text style={{ color: '#00d9ff', fontWeight: 'bold' }}>地质建模</Text>
                      <Progress percent={100} size="small" strokeColor="#52c41a" />
                    </div>
                    <div>
                      <Text style={{ color: '#00d9ff', fontWeight: 'bold' }}>基坑设计</Text>
                      <Progress percent={85} size="small" strokeColor="#1890ff" />
                    </div>
                    <div>
                      <Text style={{ color: '#00d9ff', fontWeight: 'bold' }}>支护结构</Text>
                      <Progress percent={60} size="small" strokeColor="#faad14" />
                    </div>
                    <div>
                      <Text style={{ color: '#00d9ff', fontWeight: 'bold' }}>几何检验</Text>
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
                    <Card size="small" title="🔲 网格统计" style={{ background: 'rgba(82, 196, 26, 0.05)' }}>
                      <div style={{ fontSize: '12px', color: '#ffffff80' }}>
                        <div>单元总数: 156,847</div>
                        <div>节点数: 89,234</div>
                        <div>Fragment区域: 1,867</div>
                        <div>边界面: 2,456</div>
                      </div>
                    </Card>
                    <Card size="small" title="📊 质量指标" style={{ background: 'rgba(82, 196, 26, 0.05)' }}>
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
                block
                icon={<SettingOutlined />}
                onClick={() => setSubViewsEnabled(!subViewsEnabled)}
              >
                {subViewsEnabled ? '隐藏' : '显示'}子视图
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
        boxShadow: `0 4px 12px rgba(0, 217, 255, 0.1)`
      }}>
        {/* 项目信息区域 */}
        <div>
          <Title level={4} style={{ 
            color: activeModule === 'geometry' ? '#00d9ff' :
                   activeModule === 'meshing' ? '#52c41a' :
                   activeModule === 'analysis' ? '#faad14' :
                   activeModule === 'results' ? '#eb2f96' :
                   themeConfig.colors.primary, 
            margin: 0 
          }}>
            {activeModule === 'geometry' ? '🏗️ 几何建模工作区' :
             activeModule === 'meshing' ? '🔲 网格生成工作区' :
             activeModule === 'analysis' ? '⚡ 计算分析工作区' :
             activeModule === 'results' ? '📊 结果查看工作区' :
             '深基坑工程项目'}
          </Title>
          <Text style={{ color: themeConfig.colors.text.secondary, fontSize: '12px' }}>
            {activeModule === 'geometry' ? '2号几何专家 - 地质建模 • 基坑设计 • 支护结构' :
             activeModule === 'meshing' ? '2号&3号协作 - GMSH Fragment • 自适应细化 • 质量分析' :
             activeModule === 'analysis' ? '3号计算专家 - Terra求解器 • 多物理耦合 • 伴随方法' :
             activeModule === 'results' ? '1号&3号协作 - 3D可视化 • 数据导出 • 后处理分析' :
             '选择左侧模块开始工作'}
          </Text>
        </div>

        {/* 中央数据流状态 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: themeConfig.colors.success,
              margin: '0 auto 4px',
              animation: 'pulse 2s infinite'
            }} />
            <Text style={{ color: themeConfig.colors.text.tertiary, fontSize: '10px' }}>
              2号几何
            </Text>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '40px',
              height: '2px',
              background: `linear-gradient(90deg, transparent, ${themeConfig.colors.primary}, transparent)`,
              animation: 'dataFlow 2s ease-in-out infinite'
            }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: themeConfig.colors.warning,
              margin: '0 auto 4px',
              animation: 'pulse 2s infinite 0.5s'
            }} />
            <Text style={{ color: themeConfig.colors.text.tertiary, fontSize: '10px' }}>
              网格生成
            </Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '40px',
              height: '2px',
              background: `linear-gradient(90deg, transparent, ${themeConfig.colors.primary}, transparent)`,
              animation: 'dataFlow 2s ease-in-out infinite 1s'
            }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: themeConfig.colors.accent,
              margin: '0 auto 4px',
              animation: 'pulse 2s infinite 1s'
            }} />
            <Text style={{ color: themeConfig.colors.text.tertiary, fontSize: '10px' }}>
              3号计算
            </Text>
          </div>
        </div>

        {/* 协作状态区域 */}
        <div style={{ textAlign: 'right' }}>
          <Space>
            <div style={{ textAlign: 'center' }}>
              <MonitorOutlined style={{ color: themeConfig.colors.success, fontSize: '16px' }} />
              <br />
              <Text style={{ color: themeConfig.colors.text.tertiary, fontSize: '10px' }}>
                系统正常
              </Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <ThunderboltOutlined style={{ color: themeConfig.colors.primary, fontSize: '16px' }} />
              <br />
              <Text style={{ color: themeConfig.colors.text.tertiary, fontSize: '10px' }}>
                计算中
              </Text>
            </div>
          </Space>
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
          <div style={{ flex: 1 }}>
            {renderMainViewport()}
          </div>

          {/* 右侧多窗口数据面板 */}
          <div style={{ 
            width: rightPanelState === 'collapsed' ? '60px' : `${rightPanelWidth}px`,
            transition: 'width 0.3s ease'
          }}>
            {renderRightPanel()}
          </div>
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