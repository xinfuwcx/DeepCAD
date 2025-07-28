/**
 * DeepCAD 智能深基坑分析设计系统
 * 1号架构师 - 震撼视觉效果的专业级应用
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { Logo } from '../brand/Logo';
import { FunctionalIcons } from '../icons/FunctionalIconsQuickFix';
import { EngineeringIcons } from '../icons/EngineeringIcons';
import { StatusIcons } from '../icons/StatusIcons';
import { EarthRenderer } from '../visualization/EarthRenderer';
import { EpicFlightDemo } from '../visualization/EpicFlightDemo';
import { EnhancedEpicFlightDemo } from '../visualization/EnhancedEpicFlightDemo';
// 已删除的过期EpicControlCenter组件，统一使用ControlCenter v3.0震撼3D地球系统
// 所有EpicControlCenter相关组件已合并到ControlCenter.tsx
import { RealMapEpicCenter } from '../visualization/RealMapEpicCenter';
import { SelfContainedEpicCenter } from '../visualization/SelfContainedEpicCenter';
import { ParticleTest } from '../visualization/ParticleTest';

// 1号专家 - 新的Epic控制中心系统 
import { ControlCenter as NewEpicControlCenter } from '../control/ControlCenter';
import { GeoThreeMapController, ProjectMarkerData } from '../../services/GeoThreeMapController';
import { designTokens } from '../../design/tokens';

// 1号的专业UI组件库集成
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import CAEParameterPanel from '../ui/CAEParameterPanel';
import GlassmorphismCard from '../ui/GlassmorphismCard';
import ParticleBackground from '../ui/ParticleBackground';

// 3号的核心计算系统集成
import ComputationControlPanel from '../ComputationControlPanel';
import { DeepCADSystemIntegration } from '../../integration/DeepCADSystemIntegration';

// 3号的GPU可视化系统
import { StressCloudGPURenderer } from '../../services/stressCloudGPURenderer';
import { DeformationAnimationSystem } from '../../services/deformationAnimationSystem';
import { FlowFieldVisualizationGPU } from '../../services/flowFieldVisualizationGPU';

// 1号的高级可视化组件
import { PyVistaViewer } from '../visualization/PyVistaViewer';
import { PostProcessingPanel } from '../visualization/PostProcessingPanel';
import VisualizationControlPanel from '../visualization/VisualizationControlPanel';
import RealtimeCloudRenderer from '../visualization/RealtimeCloudRenderer';
import DynamicContourGenerator from '../visualization/DynamicContourGenerator';
import AnimationPlayer from '../visualization/AnimationPlayer';
import ColorMapLegend from '../visualization/ColorMapLegend';
import DataStreamViz from '../ui/DataStreamViz';

// 新增智能系统组件
import KnowledgeBasePanel from '../KnowledgeBasePanel';
import OptimizationPanel from '../OptimizationPanel';
import ProjectAnalysisPanel from './ProjectAnalysisPanel';
import RealtimeMonitoringPanel from './RealtimeMonitoringPanel';
import AdvancedDataVisualization from './AdvancedDataVisualization';
import PileModelingIntegrationPanel from './PileModelingIntegrationPanel';
import DiaphragmWallOffsetPanel from './DiaphragmWallOffsetPanel';
import PhysicsAIEmbeddedPanel from '../PhysicsAIEmbeddedPanel_SIMPLIFIED';

// 1号专家 - 悬浮AI助手
import { FloatingAIAssistant } from '../floating/FloatingAIAssistant';

// 性能监控和日志系统
import PerformanceMonitorPanel from './PerformanceMonitorPanel';
import { logger } from '../../utils/advancedLogger';
import { webgpuMemoryOptimizer } from '../../utils/webgpuMemoryOptimizer';

// ==================== 主应用界面 ====================

export const DeepCADAdvancedApp: React.FC = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<string>('launch');
  const [isLoading, setIsLoading] = useState(true);
  const [showEpicDemo, setShowEpicDemo] = useState(false);
  const [showParticleTest, setShowParticleTest] = useState(false);
  const [showMapboxDebug, setShowMapboxDebug] = useState(false);
  const [showNewEpicControlCenter, setShowNewEpicControlCenter] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [flightTarget, setFlightTarget] = useState<string | null>(null);
  
  // 3号系统集成状态
  const [systemIntegration, setSystemIntegration] = useState<DeepCADSystemIntegration | null>(null);
  const [computationActive, setComputationActive] = useState(false);
  const [gpuVisualizationActive, setGpuVisualizationActive] = useState(false);
  
  // 初始化系统日志
  useEffect(() => {
    logger.info('DeepCAD Advanced App initialized', { 
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent 
    });
    
    // 记录用户行为
    const handleUserAction = (action: string) => {
      logger.userAction(action, 'DeepCADAdvancedApp');
    };
    
    // 性能监控
    const startTime = performance.now();
    const initComplete = () => {
      const loadTime = performance.now() - startTime;
      logger.performance('App Initialization', loadTime);
    };
    
    setTimeout(initComplete, 100);
    
    return () => {
      logger.info('DeepCAD Advanced App unmounting');
    };
  }, []);

  // Modal状态管理
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAnalysisWizard, setShowAnalysisWizard] = useState(false);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [showOptimization, setShowOptimization] = useState(false);
  const [showProjectAnalysis, setShowProjectAnalysis] = useState(false);
  const [showRealtimeMonitoring, setShowRealtimeMonitoring] = useState(false);
  const [showDataVisualization, setShowDataVisualization] = useState(false);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const [showPileModeling, setShowPileModeling] = useState(false);
  const [showPhysicsAIPanel, setShowPhysicsAIPanel] = useState(false);

  // 数据流可视化状态
  const [dataFlowNodes] = useState([
    {
      id: 'geometry-input',
      name: '几何建模',
      type: 'geometry' as const,
      status: 'completed' as const,
      position: { x: 100, y: 100 },
      data: { size: 25.6, count: 1200, quality: 0.95, timestamp: Date.now() }
    },
    {
      id: 'mesh-generation',
      name: '网格生成',
      type: 'mesh' as const,
      status: 'processing' as const,
      position: { x: 300, y: 100 },
      data: { size: 128.4, count: 45000, quality: 0.88, timestamp: Date.now() }
    },
    {
      id: 'computation-engine',
      name: 'GPU计算',
      type: 'computation' as const,
      status: 'active' as const,
      position: { x: 500, y: 100 },
      data: { size: 512.8, count: 180000, quality: 0.92, timestamp: Date.now() }
    },
    {
      id: 'results-output',
      name: '结果输出',
      type: 'results' as const,
      status: 'active' as const,
      position: { x: 700, y: 100 },
      data: { size: 89.2, count: 12000, quality: 0.97, timestamp: Date.now() }
    }
  ]);

  const [dataFlowConnections] = useState([
    {
      id: 'geo-to-mesh',
      source: 'geometry-input',
      target: 'mesh-generation',
      flowRate: 45.2,
      latency: 120,
      status: 'flowing' as const,
      dataType: 'geometry' as const
    },
    {
      id: 'mesh-to-compute',
      source: 'mesh-generation',
      target: 'computation-engine',
      flowRate: 78.6,
      latency: 85,
      status: 'flowing' as const,
      dataType: 'mesh' as const
    },
    {
      id: 'compute-to-results',
      source: 'computation-engine',
      target: 'results-output',
      flowRate: 156.8,
      latency: 45,
      status: 'flowing' as const,
      dataType: 'results' as const
    }
  ]);

  // 启动序列和系统初始化
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    
    // 初始化3号的系统集成
    const initSystemIntegration = async () => {
      try {
        console.log('🚀 初始化3号核心系统集成...');
        
        // 创建临时THREE.js场景用于系统集成
        const tempScene = new THREE.Scene();
        
        // 创建默认配置
        const defaultConfig = {
          computation: {
            maxConcurrentTasks: 2,
            memoryLimit: 4096,
            timeoutDuration: 300000,
            enableResultCaching: false,
            enableProgressTracking: false
          },
          gpu: {
            enableWebGPU: false,
            fallbackToWebGL: true,
            maxBufferSize: 256,
            enableGPUProfiling: false
          },
          visualization: {
            renderQuality: 'medium' as const,
            enableRealTimeUpdate: false,
            maxFrameRate: 60,
            adaptiveQuality: false
          },
          analysis: {
            enableAutoPostprocessing: false,
            defaultAnalysisTasks: ['stress', 'displacement'],
            safetyStandards: {
              maxStressRatio: 0.8,
              maxDisplacementRatio: 0.5,
              minSafetyFactor: 2.0
            }
          },
          integration: {
            enableHotReload: false,
            enableDebugMode: false,
            logLevel: 'warn' as const,
            enablePerformanceMonitoring: true
          }
        };
        
        const integration = new DeepCADSystemIntegration(tempScene, defaultConfig);
        const success = await integration.initialize();
        
        if (success) {
          setSystemIntegration(integration);
          console.log('✅ 3号系统集成完成！');
        } else {
          console.warn('⚠️ 3号系统集成部分功能可能不可用');
          // 仍然设置集成对象，但功能可能有限
          setSystemIntegration(integration);
        }
      } catch (error) {
        console.error('❌ 系统集成初始化失败:', error?.message || error);
        logger.error('System integration initialization failed', error);
        // 继续运行，但无集成功能
      }
    };
    
    initSystemIntegration();
    
    return () => clearTimeout(timer);
  }, []);

  // 🚀 核心模块选择处理 - 5大震撼功能（带飞行效果）
  const handleCoreModuleSelect = useCallback((moduleId: string) => {
    console.log(`🚀 EPIC FLIGHT START: ${moduleId}`);
    alert(`点击了模块: ${moduleId}`); // 临时调试
    logger.userAction(`launch_core_module_${moduleId}`, 'DeepCADAdvancedApp');
    
    // 🚁 启动飞行效果
    setIsFlying(true);
    setFlightTarget(moduleId);
    
    // 2秒后执行原有导航逻辑
    setTimeout(() => {
      setIsFlying(false);
      setFlightTarget(null);
      executeModuleNavigation(moduleId);
    }, 2000);
  }, []);

  // 获取模块名称
  const getModuleName = useCallback((moduleId: string | null) => {
    const moduleNames: Record<string, string> = {
      'ai-knowledge': '🧠 智能知识图谱',
      'smart-optimization': '⚡ 智能优化',
      'parametric-modeling': '📐 参数化建模',
      'multiphysics-coupling': '🌊 多物理场耦合',
      'physics-ai': '🤖 物理AI助手'
    };
    return moduleNames[moduleId || ''] || '未知模块';
  }, []);

  // 执行模块导航的实际逻辑
  const executeModuleNavigation = useCallback((moduleId: string) => {
    switch (moduleId) {
      case 'control-center':
        // 🎛️ 1号专家 - Epic控制中心与地理信息系统
        setShowNewEpicControlCenter(true);
        logger.info('Control Center launched', { 
          expert: '1号专家',
          features: ['geo-three地图系统', 'Open-Meteo气象', '项目管理', 'AI助手集成'],
          systems: ['GIS可视化', '嵌入式AI助手', '悬浮DeepCAD AI助手'],
          impact: '统一项目管理与地理可视化'
        });
        break;
        
      case 'ai-knowledge':
        // 📚 专业知识图谱 - 工程计算知识库与标准规范数据库
        navigate('/workspace/materials');
        logger.info('Professional Knowledge Graph launched', { 
          features: ['工程标准', 'CAE规范库', '计算案例库', '技术文档'],
          impact: '规范化工程设计流程'
        });
        break;
        
      case 'smart-optimization':
        // ⚡ 智能优化 - AI驱动多目标优化
        navigate('/workspace/analysis');
        logger.info('Smart Optimization launched', { 
          algorithms: ['遗传算法', '粒子群优化', '多目标优化'],
          impact: '50%设计时间节省'
        });
        break;
        
      case 'parametric-modeling':
        // 📐 参数化建模 - 2号几何专家界面
        setCurrentView('geometry-expert');
        logger.info('Geometry Expert launched', { 
          expert: '2号几何专家',
          features: ['RBF几何重建', '质量监控', '协作面板', '材料库管理'],
          impact: '80%建模效率提升'
        });
        break;
        
      case 'multiphysics-coupling':
        // 🌊 多物理场耦合 - 流固热力协同
        navigate('/workspace/analysis');
        logger.info('Multiphysics Coupling launched', { 
          physics: ['流固耦合', '热力分析', '渗流计算'],
          impact: '真实物理仿真'
        });
        break;
        
      case 'physics-ai':
        // 🤖 物理AI - 嵌入式智能面板 (3号专家重新设计)
        setShowPhysicsAIPanel(true);
        logger.info('Physics AI Embedded Panel launched', { 
          expert: '3号计算专家',
          capabilities: ['设计变量管理', '智能优化', '参数预测', '实时建议'],
          features: ['左侧嵌入式面板', '3D视口不遮挡', '实时参数调整'],
          accuracy: '>95%工程预测精度'
        });
        break;
        
      case 'computation-control':
        // 🏗️ 3号专家 - 深基坑计算控制中心
        setCurrentView('computation-control');
        logger.info('Deep Excavation Computation Control launched', { 
          expert: '3号计算专家',
          capabilities: ['土结耦合分析', '施工阶段分析', '安全评估', 'GPU可视化'],
          systems: ['Kratos求解器', 'WebGPU渲染', 'PyVista集成'],
          performance: '工程级专业计算'
        });
        break;
        
      case 'mesh-analysis':
        // 🔍 3号专家 - 智能网格质量分析
        setCurrentView('mesh-analysis');
        logger.info('Mesh Quality Analysis launched', { 
          expert: '3号计算专家',
          features: ['网格质量检查', '单元形状分析', '收敛性评估'],
          algorithms: ['Jacobian检查', '倾斜度分析', '长宽比检测']
        });
        break;
        
      case 'ai-assistant':
        // 🧠 3号专家 - 计算AI助理系统
        setCurrentView('ai-assistant');
        logger.info('Computation AI Assistant launched', { 
          expert: '3号计算专家',
          ai_models: ['PINN物理神经网络', 'DeepONet算子学习', 'GNN图神经网络'],
          capabilities: ['智能预测', '参数优化', '异常诊断'],
          accuracy: '>95%工程预测精度'
        });
        break;
        
      default:
        console.warn(`⚠️ 未知核心模块: ${moduleId}`);
        setCurrentView(moduleId);
    }
  }, [navigate]);

  // 🚀 五大核心 - 灵动参差布局
  const coreModules = [
    {
      id: 'ai-knowledge',
      name: '专业知识图谱',
      icon: FunctionalIcons.MaterialLibrary,
      color: designTokens.colors.accent.quantum,
      description: '工程计算知识库与标准规范数据库',
      size: 'large', // 大卡片 - 主打功能
      span: 'col-span-2 row-span-1'
    },
    {
      id: 'smart-optimization',
      name: '智能优化',
      icon: FunctionalIcons.GPUComputing,
      color: designTokens.colors.accent.glow,
      description: 'AI驱动的多目标优化算法引擎',
      size: 'medium',
      span: 'col-span-1 row-span-2' // 竖长卡片
    },
    {
      id: 'parametric-modeling',
      name: '参数化建模',
      icon: FunctionalIcons.GeologyModeling,
      color: designTokens.colors.primary.deep,
      description: '约束驱动的智能参数化几何建模',
      size: 'medium',
      span: 'col-span-1 row-span-1'
    },
    {
      id: 'multiphysics-coupling',
      name: '多物理场耦合',
      icon: FunctionalIcons.StructuralAnalysis,
      color: designTokens.colors.semantic.success,
      description: '流固热力多场协同耦合仿真',
      size: 'medium',
      span: 'col-span-1 row-span-1'
    },
    {
      id: 'physics-ai',
      name: '物理AI',
      icon: FunctionalIcons.Visualization3D,
      color: designTokens.colors.accent.ai,
      description: '深度学习的智能预测与风险评估',
      size: 'large',
      span: 'col-span-2 row-span-1' // 横长卡片
    },
    {
      id: 'computation-control',
      name: '深基坑计算控制',
      icon: FunctionalIcons.GPUComputing,
      color: designTokens.colors.accent.computation,
      description: '3号专家 - 土结耦合·施工阶段·安全评估·GPU可视化',
      size: 'large',
      span: 'col-span-2 row-span-1' // 横长卡片 - 主打计算功能
    },
    {
      id: 'mesh-analysis',
      name: '网格质量分析',
      icon: FunctionalIcons.StructuralAnalysis,
      color: designTokens.colors.primary.main,
      description: '3号专家 - 智能网格检查与优化分析',
      size: 'medium',
      span: 'col-span-1 row-span-1'
    },
    {
      id: 'ai-assistant',
      name: '计算AI助理',
      icon: FunctionalIcons.MaterialLibrary,
      color: designTokens.colors.accent.ai,
      description: '3号专家 - PINN物理神经网络与DeepONet预测',
      size: 'medium',
      span: 'col-span-1 row-span-1'
    }
  ];

  if (isLoading) {
    return <LaunchScreen onComplete={() => setIsLoading(false)} />;
  }

  // 调试模式 - 使用现有组件
  if (showMapboxDebug) {
    return (
      <ParticleTest />
    );
  }

  if (showEpicDemo) {
    return (
      <NewEpicControlCenter 
        width={window.innerWidth}
        height={window.innerHeight}
        onExit={() => setShowEpicDemo(false)}
      />
    );
  }

  // 新的Epic控制中心 - 1号专家核心系统
  if (showNewEpicControlCenter) {
    return (
      <NewEpicControlCenter
        width={window.innerWidth}
        height={window.innerHeight}
        onExit={() => setShowNewEpicControlCenter(false)}
        onSwitchToControlCenter={() => {
          setShowNewEpicControlCenter(false);
          setCurrentView('epic-control-center');
        }}
        onProjectSelect={(projectId) => {
          console.log(`🎯 主应用接收到项目选择: ${projectId}`);
          // 这里可以处理项目选择后的逻辑
        }}
      />
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: `linear-gradient(135deg, ${designTokens.colors.dark.deepSpace} 0%, ${designTokens.colors.dark.quantum} 100%)`,
      color: designTokens.colors.light.primary,
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* 1号的粒子背景系统 */}
      <ParticleBackground
        particleCount={50}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          opacity: 0.6
        }}
      />
      {/* 顶部导航栏 */}
      <motion.header
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '80px',
          background: `linear-gradient(90deg, ${designTokens.colors.dark.surface}99 0%, ${designTokens.colors.dark.card}99 100%)`,
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${designTokens.colors.accent.glow}40`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 40px',
          zIndex: 1000,
          boxShadow: `0 8px 32px ${designTokens.colors.dark.deepSpace}80`
        }}
      >
        {/* Logo */}
        <Logo 
          size={32} 
          variant="full" 
          animated={true} 
          glowing={true}
          interactive={true}
        />

        {/* 中央标题 */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            style={{
              fontSize: '28px',
              fontWeight: 600,
              background: `linear-gradient(45deg, ${designTokens.colors.accent.quantum}, ${designTokens.colors.accent.glow})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
              textShadow: `0 0 20px ${designTokens.colors.accent.glow}40`
            }}
          >
            智能深基坑分析设计系统
          </motion.h1>
        </div>

        {/* 右侧控制 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button
            variant="outline"
            size="sm"
            glow={true}
            caeType="geometry"
            onClick={() => setShowAnalysisWizard(true)}
          >
            🧙‍♂️ 向导
          </Button>

          <Button
            variant="outline"
            size="sm"
            glow={true}
            caeType="geometry"
            onClick={() => setShowSettingsModal(true)}
          >
            ⚙️ 设置
          </Button>

          <Button
            variant="outline"
            size="sm"
            glow={true}
            caeType="results"
            onClick={() => setShowExportModal(true)}
          >
            📊 导出
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            glow={true}
            quantum={true}
            caeType="results"
            onClick={() => setCurrentView('launch')}
            style={{
              marginLeft: '8px'
            }}
          >
            🏠 主界面
          </Button>
        </div>
      </motion.header>

      {/* 主内容区域 */}
      <main style={{
        paddingTop: '80px',
        height: '100vh',
        position: 'relative'
      }}>
        {/* 1号专家 - Epic控制中心作为默认界面 */}
        {currentView === 'epic-control-center' && (
          <div style={{ position: 'absolute', inset: '0', top: '-80px' }}>
            <NewEpicControlCenter
              width={window.innerWidth}
              height={window.innerHeight}
              onExit={() => setCurrentView('launch')}
              onSwitchToControlCenter={() => {
                // 从epic-control-center切换到监控界面，这里不需要处理因为已经在监控界面了
                console.log('已经在控制中心监控界面中');
              }}
              onProjectSelect={(projectId) => {
                console.log(`🎯 主应用接收到项目选择: ${projectId}`);
                // 这里可以处理项目选择后的逻辑，比如切换到特定的分析模块
              }}
            />
          </div>
        )}

        {currentView === 'launch' && (
          <CoreModuleDashboard 
            coreModules={coreModules}
            onModuleSelect={handleCoreModuleSelect}
            systemIntegration={systemIntegration}
          />
        )}

        {/* 2号几何专家界面 */}
        {currentView === 'geometry-expert' && systemIntegration && (
          <GeometryExpertView 
            systemIntegration={systemIntegration}
            onBack={() => setCurrentView('launch')}
          />
        )}

        {currentView === 'earth' && (
          <EarthRenderer
            width={window.innerWidth}
            height={window.innerHeight - 80}
            showProjects={true}
            enableInteraction={true}
          />
        )}

        {/* 3号计算专家的专业计算系统界面 */}
        {currentView === 'analysis' && systemIntegration && (
          <ComputationExpertView 
            systemIntegration={systemIntegration}
            onBack={() => setCurrentView('launch')}
          />
        )}

        {/* 3号计算专家的GPU可视化系统界面 */}
        {currentView === 'visualization' && systemIntegration && (
          <ComputationExpertView 
            systemIntegration={systemIntegration}
            onBack={() => setCurrentView('launch')}
          />
        )}

        {/* 支护设计专业界面 */}
        {currentView === 'support' && systemIntegration && (
          <SupportDesignView
            systemIntegration={systemIntegration}
            onBack={() => setCurrentView('launch')}
          />
        )}

        {/* 多物理场耦合系统界面 */}
        {currentView === 'multiphysics' && (
          <MultiphysicsView
            systemIntegration={systemIntegration}
            onBack={() => setCurrentView('launch')}
          />
        )}

        {/* 物理AI系统界面 */}
        {currentView === 'physics-ai' && (
          <PhysicsAIView
            systemIntegration={systemIntegration}
            onBack={() => setCurrentView('launch')}
          />
        )}

        {/* 3号计算专家 - 网格质量分析界面 */}
        {currentView === 'mesh-analysis' && systemIntegration && (
          <ComputationExpertView 
            systemIntegration={systemIntegration}
            onBack={() => setCurrentView('launch')}
          />
        )}

        {/* 旧的网格分析界面（备用） */}
        {currentView === 'mesh-analysis-old' && systemIntegration && (
          <div style={{
            position: 'fixed',
            top: 80,
            left: 0,
            right: 0,
            bottom: 0,
            background: designTokens.colors.dark.background,
            zIndex: 1000,
            padding: '40px'
          }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: `linear-gradient(135deg, ${designTokens.colors.dark.surface}40, ${designTokens.colors.dark.card}40)`,
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                border: `1px solid ${designTokens.colors.primary.main}40`,
                padding: '40px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '30px'
              }}>
                <div>
                  <h1 style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    background: `linear-gradient(45deg, ${designTokens.colors.primary.main}, ${designTokens.colors.accent.computation})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    margin: 0
                  }}>
                    🔍 智能网格质量分析
                  </h1>
                  <p style={{
                    color: designTokens.colors.light.secondary,
                    margin: '8px 0 0 0',
                    fontSize: '16px'
                  }}>
                    3号计算专家 - 网格几何检查与收敛性分析
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="md"
                  caeType="computation"
                  onClick={() => setCurrentView('launch')}
                >
                  ← 返回主界面
                </Button>
              </div>
              
              <div style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '30px'
              }}>
                <GlassmorphismCard
                  title="网格质量统计"
                  description="单元质量分布与统计分析"
                  variant="mesh"
                >
                  <div style={{ padding: '20px' }}>
                    <p style={{ color: designTokens.colors.light.primary }}>
                      📊 网格质量评估功能已集成，实时分析网格几何特征
                    </p>
                  </div>
                </GlassmorphismCard>
                
                <GlassmorphismCard
                  title="收敛性分析"
                  description="基于网格的数值收敛特性"
                  variant="analysis"
                >
                  <div style={{ padding: '20px' }}>
                    <p style={{ color: designTokens.colors.light.primary }}>
                      🎯 收敛性分析工具已准备，验证计算精度
                    </p>
                  </div>
                </GlassmorphismCard>
              </div>
            </motion.div>
          </div>
        )}

        {/* 3号计算专家 - 计算AI助理界面 */}
        {currentView === 'ai-assistant' && systemIntegration && (
          <ComputationExpertView 
            systemIntegration={systemIntegration}
            onBack={() => setCurrentView('launch')}
          />
        )}

        {/* 旧的AI助理界面（备用） */}
        {currentView === 'ai-assistant-old' && systemIntegration && (
          <div style={{
            position: 'fixed',
            top: 80,
            left: 0,
            right: 0,
            bottom: 0,
            background: designTokens.colors.dark.background,
            zIndex: 1000,
            padding: '40px'
          }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: `linear-gradient(135deg, ${designTokens.colors.dark.surface}40, ${designTokens.colors.dark.card}40)`,
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                border: `1px solid ${designTokens.colors.accent.ai}40`,
                padding: '40px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '30px'
              }}>
                <div>
                  <h1 style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    background: `linear-gradient(45deg, ${designTokens.colors.accent.ai}, ${designTokens.colors.accent.quantum})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    margin: 0
                  }}>
                    🧠 计算AI助理系统
                  </h1>
                  <p style={{
                    color: designTokens.colors.light.secondary,
                    margin: '8px 0 0 0',
                    fontSize: '16px'
                  }}>
                    3号计算专家 - PINN物理神经网络与DeepONet预测
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="md"
                  caeType="ai"
                  onClick={() => setCurrentView('launch')}
                >
                  ← 返回主界面
                </Button>
              </div>
              
              <div style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '20px'
              }}>
                <GlassmorphismCard
                  title="PINN物理神经网络"
                  description="物理信息约束的神经网络预测"
                  variant="ai"
                >
                  <div style={{ padding: '20px' }}>
                    <p style={{ color: designTokens.colors.light.primary }}>
                      🌟 PINN系统已就绪，支持PDE约束的智能预测
                    </p>
                  </div>
                </GlassmorphismCard>
                
                <GlassmorphismCard
                  title="DeepONet算子学习"
                  description="深度算子网络函数空间映射"
                  variant="computation"
                >
                  <div style={{ padding: '20px' }}>
                    <p style={{ color: designTokens.colors.light.primary }}>
                      ⚡ DeepONet引擎集成完成，函数到函数映射
                    </p>
                  </div>
                </GlassmorphismCard>
                
                <GlassmorphismCard
                  title="GNN图神经网络"
                  description="结构化数据的图网络分析"
                  variant="results"
                >
                  <div style={{ padding: '20px' }}>
                    <p style={{ color: designTokens.colors.light.primary }}>
                      🔗 GNN系统运行中，处理几何拓扑关系
                    </p>
                  </div>
                </GlassmorphismCard>
              </div>
            </motion.div>
          </div>
        )}
      </main>

      {/* 智能系统面板 */}
      <KnowledgeBasePanel 
        isVisible={showKnowledgeBase}
        onClose={() => setShowKnowledgeBase(false)}
      />
      
      <OptimizationPanel
        isVisible={showOptimization}
        onClose={() => setShowOptimization(false)}
      />
      
      <ProjectAnalysisPanel
        isVisible={showProjectAnalysis}
        onClose={() => setShowProjectAnalysis(false)}
      />
      
      <RealtimeMonitoringPanel
        isVisible={showRealtimeMonitoring}
        onClose={() => setShowRealtimeMonitoring(false)}
      />
      
      <AdvancedDataVisualization
        isVisible={showDataVisualization}
        onClose={() => setShowDataVisualization(false)}
      />
      
      <PerformanceMonitorPanel
        isVisible={showPerformanceMonitor}
        onClose={() => setShowPerformanceMonitor(false)}
      />
      
      <PileModelingIntegrationPanel
        isVisible={showPileModeling}
        onClose={() => setShowPileModeling(false)}
        onPileConfigured={(pileData) => {
          logger.info('Pile configuration completed', pileData);
          // 可以在这里将数据传递给3号计算系统
        }}
      />
      
      <DiaphragmWallOffsetPanel
        isVisible={currentView === 'diaphragm-offset'}
        selectedGeometry={null} // 这里可以传入选中的几何体
        onOffsetProcessed={(result) => {
          console.log('🔧 偏移处理完成:', result);
          logger.info('DiaphragmWall offset processed', { 
            processingTime: result.processingTime,
            qualityScore: result.qualityMetrics.averageElementQuality 
          });
        }}
        onDataTransferToKratos={(dataPackage) => {
          console.log('📤 数据传递给Kratos:', dataPackage);
          logger.info('Data transferred to Kratos', { 
            packageId: dataPackage.packageId,
            nodeCount: dataPackage.nodes.length
          });
        }}
      />

      {/* 3号专家 - 物理AI嵌入式面板 (重新设计) */}
      <PhysicsAIEmbeddedPanel
        isVisible={showPhysicsAIPanel}
        onClose={() => setShowPhysicsAIPanel(false)}
        onVariableChange={(variableId, newValue) => {
          logger.info('Physics AI variable changed', { variableId, newValue });
          // 这里可以通知3D视口更新
        }}
        onOptimizationStart={() => {
          logger.info('Physics AI optimization started');
          // 启动优化算法
        }}
        on3DViewportUpdate={(data) => {
          logger.info('3D viewport update requested', data);
          // 更新3D视口显示
        }}
      />

      {/* 🚁 飞行效果覆盖层 */}
      {isFlying && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(0,0,50,0.9), rgba(0,20,80,0.9))',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          {/* 3D飞行动画 */}
          <div style={{
            width: '200px',
            height: '200px',
            border: '3px solid #00ffff',
            borderRadius: '50%',
            position: 'relative',
            animation: 'epicFlight 2s linear infinite',
            marginBottom: '30px'
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '60px',
              animation: 'flyRotate 1s linear infinite'
            }}>
              ✈️
            </div>
          </div>

          {/* 飞行信息 */}
          <div style={{
            color: '#00ffff',
            fontSize: '24px',
            fontWeight: 'bold',
            textAlign: 'center',
            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
          }}>
            🚁 Epic模式启动中...
          </div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '16px',
            marginTop: '10px',
            textAlign: 'center'
          }}>
            正在飞往 {getModuleName(flightTarget)} 模块
          </div>

          {/* 进度条 */}
          <div style={{
            width: '300px',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '2px',
            marginTop: '20px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, #00ffff, #0080ff)',
              animation: 'flightProgress 2s linear',
              transform: 'translateX(-100%)'
            }} />
          </div>
        </div>
      )}

      {/* 粒子系统测试 */}
      {showParticleTest && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
          <ParticleTest />
          <button
            onClick={() => setShowParticleTest(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: '#ff4444',
              color: 'white',
              border: 'none',
              padding: '10px',
              borderRadius: '5px',
              cursor: 'pointer',
              zIndex: 10000
            }}
          >
            关闭测试
          </button>
        </div>
      )}

      {/* 3号计算专家的核心控制面板 - 主界面集成 */}
      {currentView === 'computation-control' && systemIntegration && (
        <ComputationExpertView 
          systemIntegration={systemIntegration}
          onBack={() => setCurrentView('launch')}
        />
      )}

      {/* 旧的计算控制面板（备用） */}
      {currentView === 'computation-control-old' && systemIntegration && (
        <div style={{
          position: 'fixed',
          top: 80,
          left: 0,
          right: 0,
          bottom: 0,
          background: designTokens.colors.dark.background,
          zIndex: 1000
        }}>
          <ComputationControlPanel 
            scene={systemIntegration.scene}
            onStatusChange={(status) => {
              logger.info('Computation status changed', { status });
              // 更新系统状态
            }}
            onResultsUpdate={(results) => {
              logger.info('Computation results updated', results);
              // 处理计算结果
            }}
            onError={(error) => {
              logger.error('Computation error', { error });
              // 错误处理
            }}
          />
          <Button
            variant="outline"
            size="md"
            caeType="computation"
            onClick={() => setCurrentView('launch')}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              zIndex: 1001
            }}
          >
            ← 返回主界面
          </Button>
        </div>
      )}

      {/* Modal系统集成 */}
      {/* 设置Modal */}
      <Modal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        variant="premium"
        size={32}
        caeType="settings"
        title="系统设置"
        description="DeepCAD平台全局配置"
        glowing={true}
        animated={true}
        blur={true}
      >
        <div style={{ padding: '20px' }}>
          <h3 style={{ color: designTokens.colors.accent.quantum, marginBottom: '20px' }}>
            🔧 渲染设置
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ color: designTokens.colors.light.secondary, marginBottom: '8px', display: 'block' }}>
                渲染质量
              </label>
              <Input
                variant="filled"
                size="md"
                caeType="computation"
                placeholder="高质量"
                glow={true}
                quantum={true}
              />
            </div>
            <div>
              <label style={{ color: designTokens.colors.light.secondary, marginBottom: '8px', display: 'block' }}>
                并行线程数
              </label>
              <Input
                variant="filled"
                size="md"
                type="number"
                caeType="computation"
                value={8}
                min={1}
                max={32}
                glow={true}
                quantum={true}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 导出Modal */}
      <Modal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        variant="glass"
        size="md"
        caeType="export"
        title="结果导出"
        description="导出计算结果和可视化"
        glowing={true}
        animated={true}
      >
        <div style={{ padding: '20px' }}>
          <h3 style={{ color: designTokens.colors.accent.glow, marginBottom: '20px' }}>
            📊 导出选项
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ color: designTokens.colors.light.secondary, marginBottom: '8px', display: 'block' }}>
                文件名
              </label>
              <Input
                variant="outline"
                size="md"
                caeType="results"
                placeholder="deepcad_analysis_results"
                glow={true}
                fluid={true}
              />
            </div>
            <div>
              <label style={{ color: designTokens.colors.light.secondary, marginBottom: '8px', display: 'block' }}>
                导出格式
              </label>
              <Input
                variant="outline"
                size="md"
                caeType="results"
                placeholder="选择格式: PDF, Excel, VTK"
                glow={true}
                fluid={true}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 分析向导Modal */}
      <Modal
        open={showAnalysisWizard}
        onClose={() => setShowAnalysisWizard(false)}
        variant="fullscreen"
        caeType="wizard"
        title="分析向导"
        description="快速设置深基坑分析"
        glowing={true}
        animated={true}
        blur={true}
      >
        <div style={{ padding: '40px', height: '100%' }}>
          <h2 style={{ 
            color: designTokens.colors.accent.visualization, 
            marginBottom: '30px',
            fontSize: '28px',
            textAlign: 'center'
          }}>
            🧙‍♂️ DeepCAD 深基坑分析向导
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr', 
            gap: '30px',
            height: 'calc(100% - 100px)'
          }}>
            <GlassmorphismCard variant="pro" style={{ padding: '20px' }}>
              <h3>项目信息</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                <Input
                  variant="filled"
                  placeholder="项目名称"
                  caeType="geometry"
                  glow={true}
                  fluid={true}
                />
                <Input
                  variant="filled"
                  placeholder="工程师姓名"
                  caeType="geometry"
                  glow={true}
                  fluid={true}
                />
                <Input
                  variant="filled"
                  placeholder="分析标准"
                  caeType="geometry"
                  glow={true}
                  fluid={true}
                />
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard variant="pro" style={{ padding: '20px' }}>
              <h3>几何参数</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                <Input
                  variant="filled"
                  type="number"
                  placeholder="开挖深度 (m)"
                  caeType="geometry"
                  unit="m"
                  glow={true}
                  fluid={true}
                />
                <Input
                  variant="filled"
                  type="number"
                  placeholder="开挖宽度 (m)"
                  caeType="geometry"
                  unit="m"
                  glow={true}
                  fluid={true}
                />
                <Input
                  variant="filled"
                  type="number"
                  placeholder="围护深度 (m)"
                  caeType="geometry"
                  unit="m"
                  glow={true}
                  fluid={true}
                />
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard variant="pro" style={{ padding: '20px' }}>
              <h3>材料参数</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                <Input
                  variant="filled"
                  type="number"
                  placeholder="土体弹模 (MPa)"
                  caeType="material"
                  unit="MPa"
                  glow={true}
                  fluid={true}
                />
                <Input
                  variant="filled"
                  type="number"
                  placeholder="泊松比"
                  caeType="material"
                  step={0.01}
                  glow={true}
                  fluid={true}
                />
                <Input
                  variant="filled"
                  type="number"
                  placeholder="粘聚力 (kPa)"
                  caeType="material"
                  unit="kPa"
                  glow={true}
                  fluid={true}
                />
              </div>
            </GlassmorphismCard>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ==================== 启动屏幕 ====================

const LaunchScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      style={{
        width: '100vw',
        height: '100vh',
        background: `radial-gradient(circle at center, ${designTokens.colors.dark.quantum} 0%, ${designTokens.colors.dark.deepSpace} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: designTokens.colors.light.primary
      }}
    >
      {/* 启动Logo */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      >
        <Logo
          size="2xl"
          variant="full"
          animated={true}
          glowing={true}
          onAnimationComplete={onComplete}
        />
      </motion.div>

      {/* 加载文字 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1 }}
        style={{
          marginTop: '40px',
          textAlign: 'center'
        }}
      >
        <h2 style={{
          fontSize: '32px',
          fontWeight: 300,
          margin: '0 0 16px 0',
          background: `linear-gradient(45deg, ${designTokens.colors.accent.quantum}, ${designTokens.colors.accent.glow})`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          DeepCAD
        </h2>
        <p style={{
          fontSize: '18px',
          opacity: 0.8,
          margin: 0
        }}>
          正在启动智能深基坑分析设计系统...
        </p>
      </motion.div>

      {/* 加载动画 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 2 }}
        style={{
          marginTop: '60px',
          display: 'flex',
          gap: '8px'
        }}
      >
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.3
            }}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: designTokens.colors.accent.glow
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
};

// ==================== 主仪表板 ====================

// ==================== 专业计算视图 ====================

const ProfessionalComputationView: React.FC<{
  systemIntegration: DeepCADSystemIntegration;
  onBack: () => void;
}> = ({ systemIntegration, onBack }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapControllerRef = useRef<GeoThreeMapController | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectMarkerData | null>(null);
  const [computationResults, setComputationResults] = useState<any>(null);

  // 初始化geo-three地图系统
  useEffect(() => {
    const initMap = async () => {
      if (mapContainerRef.current) {
        const controller = new GeoThreeMapController(mapContainerRef.current);
        mapControllerRef.current = controller;

        await controller.loadVisibleTiles();
        
        // 添加计算项目标记
        const computationProjects = [
          {
            id: 'computation-1',
            name: '上海中心深基坑计算',
            location: { lat: 31.2304, lng: 121.4737 },
            depth: 70,
            status: 'active' as const,
            progress: 85
          },
          {
            id: 'computation-2', 
            name: '北京大兴机场计算',
            location: { lat: 39.5098, lng: 116.4105 },
            depth: 45,
            status: 'completed' as const,
            progress: 100
          }
        ];

        computationProjects.forEach(project => {
          controller.addProjectMarker(project);
        });

        controller.setProjectClickHandler((projectId) => {
          const project = computationProjects.find(p => p.id === projectId);
          if (project) {
            setSelectedProject(project);
            // 模拟加载计算结果
            setComputationResults({
              stressMax: 25.6,
              displacementMax: 12.3,
              safetyFactor: 2.1,
              meshQuality: 0.92
            });
          }
        });
      }
    };

    initMap();

    return () => {
      mapControllerRef.current?.dispose();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.6 }}
      style={{
        height: '100%',
        background: `linear-gradient(135deg, ${designTokens.colors.dark.deepSpace} 0%, ${designTokens.colors.dark.quantum} 100%)`,
        padding: '40px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 返回按钮 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 100
      }}>
        <Button
          variant="outline"
          size="sm"
          glow={true}
          caeType="computation"
          onClick={onBack}
        >
          ← 返回主界面
        </Button>
      </div>

      {/* 专业计算控制面板 - 3号的核心系统 */}
      <div style={{ flex: 1, marginTop: '60px' }}>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '30px',
            background: `linear-gradient(45deg, ${designTokens.colors.accent.quantum}, ${designTokens.colors.accent.glow})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center'
          }}
        >
          🚀 深基坑GPU计算系统 + GIS可视化
        </motion.h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr 350px', gap: '20px', height: 'calc(100% - 100px)' }}>
          {/* 左侧：1号的CAE参数面板 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <CAEParameterPanel
              title="深基坑计算参数"
              categories={[
                {
                  name: '几何参数',
                  parameters: [
                    { name: '开挖深度', value: 15.0, unit: 'm', min: 5, max: 50 },
                    { name: '开挖宽度', value: 30.0, unit: 'm', min: 10, max: 100 },
                    { name: '围护深度', value: 20.0, unit: 'm', min: 10, max: 60 }
                  ]
                },
                {
                  name: '材料参数',
                  parameters: [
                    { name: '土体弹模', value: 25.0, unit: 'MPa', min: 5, max: 100 },
                    { name: '泊松比', value: 0.3, unit: '', min: 0.1, max: 0.5 },
                    { name: '粘聚力', value: 20.0, unit: 'kPa', min: 0, max: 100 }
                  ]
                },
                {
                  name: '计算参数',
                  parameters: [
                    { name: '网格密度', value: 1.5, unit: 'm', min: 0.5, max: 5.0 },
                    { name: '迭代次数', value: 100, unit: '', min: 50, max: 500 },
                    { name: '收敛精度', value: 1e-6, unit: '', min: 1e-8, max: 1e-4 }
                  ]
                }
              ]}
              onParameterChange={(category, param, value) => {
                console.log(`参数变更: ${category} - ${param} = ${value}`);
              }}
              onPresetLoad={(presetName) => {
                console.log(`加载预设: ${presetName}`);
              }}
            />

            {/* 动画播放器 */}
            <GlassmorphismCard 
              variant="pro" 
              glowColor={designTokens.colors.accent.visualization}
              style={{ padding: '12px' }}
            >
              <AnimationPlayer
                onPlay={() => console.log('🎬 开始播放动画')}
                onPause={() => console.log('⏸️ 暂停动画')}
                onStop={() => console.log('⏹️ 停止动画')}
                onSeek={(time) => console.log(`⏩ 跳转到: ${time}s`)}
              />
            </GlassmorphismCard>
          </div>

          {/* 中央：3号的计算控制面板 + 数据流可视化 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 数据流监控 */}
            <GlassmorphismCard 
              variant="ultra" 
              glowColor={designTokens.colors.accent.quantum}
              style={{ padding: '16px' }}
            >
              <DataStreamViz
                nodes={dataFlowNodes}
                connections={dataFlowConnections}
                showMetrics={true}
                width={600}
                height={250}
                enhancedEffects={true}
                soundEnabled={true}
                particleBackground={true}
                onNodeClick={(node) => console.log('🎯 节点点击:', node)}
                onConnectionClick={(connection) => console.log('🔗 连接点击:', connection)}
              />
            </GlassmorphismCard>

            {/* GIS地图集成 - geo-three系统 */}
            <GlassmorphismCard 
              variant="ultra" 
              glowColor={designTokens.colors.accent.glow}
              style={{ height: '300px', padding: '8px' }}
            >
              <div 
                ref={mapContainerRef}
                style={{ 
                  width: '100%', 
                  height: '100%',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
                className="geo-three-container"
              />
              {selectedProject && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(0,0,0,0.8)',
                  padding: '12px',
                  borderRadius: '8px',
                  color: designTokens.colors.light.primary,
                  fontSize: '12px'
                }}>
                  <h4>{selectedProject.name}</h4>
                  <p>深度: {selectedProject.depth}m</p>
                  <p>状态: {selectedProject.status}</p>
                  {computationResults && (
                    <>
                      <p>最大应力: {computationResults.stressMax} MPa</p>
                      <p>最大位移: {computationResults.displacementMax} mm</p>
                      <p>安全系数: {computationResults.safetyFactor}</p>
                    </>
                  )}
                </div>
              )}
            </GlassmorphismCard>

            {/* 计算控制面板 */}
            <div style={{ flex: 1 }}>
              <ComputationControlPanel
                systemIntegration={systemIntegration}
                onComputationStart={() => console.log('🚀 开始计算...')}
                onComputationComplete={(results) => console.log('✅ 计算完成:', results)}
              />
            </div>
          </div>

          {/* 右侧：高级可视化控制面板 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 可视化控制面板 */}
            <GlassmorphismCard 
              variant="pro" 
              glowColor={designTokens.colors.accent.quantum}
              style={{ flex: 1 }}
            >
              <VisualizationControlPanel />
            </GlassmorphismCard>

            {/* 颜色映射图例 */}
            <GlassmorphismCard 
              variant="pro" 
              glowColor={designTokens.colors.accent.glow}
              style={{ padding: '12px' }}
            >
              <ColorMapLegend
                colorMap="viridis"
                minValue={0}
                maxValue={100}
                unit="MPa"
                title="应力分布"
              />
            </GlassmorphismCard>

            {/* 后处理面板 */}
            <GlassmorphismCard 
              variant="pro" 
              glowColor={designTokens.colors.accent.visualization}
              style={{ padding: '8px' }}
            >
              <PostProcessingPanel
                sessionId="computation-session"
                onFieldChange={(field) => console.log('🎨 字段变更:', field)}
                onDeformationChange={(show, scale) => console.log('📐 变形变更:', show, scale)}
              />
            </GlassmorphismCard>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ==================== GPU可视化视图 ====================

const GPUVisualizationView: React.FC<{
  systemIntegration: DeepCADSystemIntegration;
  onBack: () => void;
}> = ({ systemIntegration, onBack }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapControllerRef = useRef<GeoThreeMapController | null>(null);
  const [selectedVisualizationProject, setSelectedVisualizationProject] = useState<ProjectMarkerData | null>(null);
  const [visualizationData, setVisualizationData] = useState<any>(null);

  // 初始化geo-three地图系统
  useEffect(() => {
    const initVisualizationMap = async () => {
      if (mapContainerRef.current) {
        const controller = new GeoThreeMapController(mapContainerRef.current);
        mapControllerRef.current = controller;

        await controller.loadVisibleTiles();
        
        // 添加可视化项目标记
        const visualizationProjects = [
          {
            id: 'viz-1',
            name: '深圳前海金融区可视化',
            location: { lat: 22.5431, lng: 113.9339 },
            depth: 35,
            status: 'active' as const,
            progress: 75
          },
          {
            id: 'viz-2', 
            name: '广州珠江新城可视化',
            location: { lat: 23.1291, lng: 113.3240 },
            depth: 55,
            status: 'completed' as const,
            progress: 100
          }
        ];

        visualizationProjects.forEach(project => {
          controller.addProjectMarker(project);
        });

        controller.setProjectClickHandler((projectId) => {
          const project = visualizationProjects.find(p => p.id === projectId);
          if (project) {
            setSelectedVisualizationProject(project);
            // 模拟加载可视化数据
            setVisualizationData({
              renderingMode: 'WebGPU',
              frameRate: 60,
              polyCount: 1250000,
              textureMemory: 512,
              gpuUtilization: 85
            });
          }
        });
      }
    };

    initVisualizationMap();

    return () => {
      mapControllerRef.current?.dispose();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.6 }}
      style={{
        height: '100%',
        background: `linear-gradient(135deg, ${designTokens.colors.dark.deepSpace} 0%, ${designTokens.colors.dark.quantum} 100%)`,
        padding: '40px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 返回按钮 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 100
      }}>
        <Button
          variant="secondary"
          size="sm"
          glow={true}
          caeType="results"
          onClick={onBack}
        >
          ← 返回主界面
        </Button>
      </div>

      <div style={{ flex: 1, marginTop: '60px' }}>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '30px',
            background: `linear-gradient(45deg, ${designTokens.colors.accent.visualization}, ${designTokens.colors.accent.glow})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center'
          }}
        >
          🎨 WebGPU可视化系统 + GIS地图集成
        </motion.h1>
        
        {/* 主要可视化区域 - PyVista集成 + GIS地图 */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* PyVista 3D 可视化器 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassmorphismCard
              variant="ultra"
              glowColor={designTokens.colors.accent.visualization}
              interactive={false}
              style={{
                height: '400px',
                padding: '12px'
              }}
            >
              <PyVistaViewer
                className="w-full h-full"
                showControls={true}
                onSessionChange={(session) => {
                  console.log('🎨 PyVista会话变化:', session);
                }}
              />
            </GlassmorphismCard>
          </motion.div>

          {/* 实时云图渲染器 */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassmorphismCard
              variant="ultra"
              glowColor={designTokens.colors.accent.quantum}
              interactive={false}
              style={{
                height: '400px',
                padding: '12px'
              }}
            >
              <RealtimeCloudRenderer
                onDataUpdate={(data) => console.log('📊 实时数据更新:', data)}
                onRenderComplete={() => console.log('✅ 云图渲染完成')}
              />
            </GlassmorphismCard>
          </motion.div>

          {/* GIS地图集成 - geo-three系统 */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassmorphismCard
              variant="ultra"
              glowColor={designTokens.colors.accent.glow}
              interactive={false}
              style={{
                height: '400px',
                padding: '8px',
                position: 'relative'
              }}
            >
              <div 
                ref={mapContainerRef}
                style={{ 
                  width: '100%', 
                  height: '100%',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
                className="geo-three-container"
              />
              {selectedVisualizationProject && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(0,0,0,0.8)',
                  padding: '8px',
                  borderRadius: '6px',
                  color: designTokens.colors.light.primary,
                  fontSize: '11px'
                }}>
                  <h5>{selectedVisualizationProject.name}</h5>
                  <p>深度: {selectedVisualizationProject.depth}m</p>
                  {visualizationData && (
                    <>
                      <p>渲染: {visualizationData.renderingMode}</p>
                      <p>帧率: {visualizationData.frameRate} FPS</p>
                      <p>GPU: {visualizationData.gpuUtilization}%</p>
                    </>
                  )}
                </div>
              )}
            </GlassmorphismCard>
          </motion.div>
        </div>

        {/* 动态等值线生成器和数据流监控 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassmorphismCard
              variant="ultra"
              glowColor={designTokens.colors.accent.glow}
              interactive={false}
              style={{
                height: '200px',
                padding: '12px'
              }}
            >
              <DynamicContourGenerator
                onContourGenerated={(contours) => console.log('📈 等值线生成:', contours)}
                onParameterChange={(params) => console.log('⚙️ 参数变化:', params)}
              />
            </GlassmorphismCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassmorphismCard
              variant="ultra"
              glowColor={designTokens.colors.accent.visualization}
              interactive={false}
              style={{
                height: '200px',
                padding: '8px'
              }}
            >
              <DataStreamViz
                nodes={dataFlowNodes.map(node => ({
                  ...node,
                  position: { x: node.position.x * 0.6, y: node.position.y * 0.8 }
                }))}
                connections={dataFlowConnections}
                showMetrics={false}
                width={450}
                height={180}
                enhancedEffects={true}
                soundEnabled={false}
                particleBackground={false}
                onNodeClick={(node) => console.log('🎯 GPU数据流节点:', node)}
                onConnectionClick={(connection) => console.log('🔗 GPU数据流连接:', connection)}
              />
            </GlassmorphismCard>
          </motion.div>
        </div>

        {/* GPU渲染控制面板 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '20px',
          height: 'calc(100% - 500px)'
        }}>
          {/* 应力云图GPU渲染器 */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassmorphismCard
              variant="ultra"
              glowColor={designTokens.colors.accent.visualization}
              interactive={true}
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                cursor: 'pointer'
              }}
              onClick={() => {
                console.log('🚀 启动应力云图GPU渲染');
                // 集成应力云图GPU渲染器 - 在可视化模块中实现
                message.info('应力云图GPU渲染功能 - 高性能计算模块开发中');
              }}
            >
              <h3 style={{ color: designTokens.colors.accent.visualization, marginBottom: '15px', fontSize: '18px' }}>
                应力云图GPU渲染
              </h3>
              <div style={{ fontSize: '36px', marginBottom: '15px' }}>⚡</div>
              <p style={{ color: designTokens.colors.light.secondary, fontSize: '14px' }}>
                GPU加速应力场实时渲染
                <br />5-10x性能提升
              </p>
            </GlassmorphismCard>
          </motion.div>

          {/* 变形动画系统 */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassmorphismCard
              variant="ultra"
              glowColor={designTokens.colors.accent.glow}
              interactive={true}
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                cursor: 'pointer'
              }}
              onClick={() => {
                console.log('🎬 启动变形动画系统');
                // 集成变形动画系统 - 在动画可视化模块中实现
                message.info('变形动画系统 - 实时变形展示功能开发中');
              }}
            >
              <h3 style={{ color: designTokens.colors.accent.glow, marginBottom: '15px', fontSize: '18px' }}>
                变形动画系统
              </h3>
              <div style={{ fontSize: '36px', marginBottom: '15px' }}>🎬</div>
              <p style={{ color: designTokens.colors.light.secondary, fontSize: '14px' }}>
                基坑变形过程
                <br />实时动画展示
              </p>
            </GlassmorphismCard>
          </motion.div>

          {/* 流场可视化 */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <GlassmorphismCard
              variant="ultra"
              glowColor={designTokens.colors.accent.quantum}
              interactive={true}
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                cursor: 'pointer'
              }}
              onClick={() => {
                console.log('🌊 启动流场可视化GPU');
                // 集成流场可视化GPU - 在流体可视化模块中实现
                message.info('流场可视化GPU - 地下水流场渲染功能开发中');
              }}
            >
              <h3 style={{ color: designTokens.colors.accent.quantum, marginBottom: '15px', fontSize: '18px' }}>
                流场可视化GPU
              </h3>
              <div style={{ fontSize: '36px', marginBottom: '15px' }}>🌊</div>
              <p style={{ color: designTokens.colors.light.secondary, fontSize: '14px' }}>
                地下水流场
                <br />GPU实时计算渲染
              </p>
            </GlassmorphismCard>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// ==================== 支护设计视图 ====================

const SupportDesignView: React.FC<{
  systemIntegration: DeepCADSystemIntegration;
  onBack: () => void;
}> = ({ systemIntegration, onBack }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -100 }}
      transition={{ duration: 0.6 }}
      style={{
        height: '100%',
        background: `linear-gradient(135deg, ${designTokens.colors.dark.deepSpace} 0%, ${designTokens.colors.dark.quantum} 100%)`,
        padding: '40px'
      }}
    >
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 100
      }}>
        <Button
          variant="success"
          size="sm"
          glow={true}
          caeType="geometry"
          onClick={onBack}
        >
          ← 返回主界面
        </Button>
      </div>

      <div style={{ marginTop: '60px' }}>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '30px',
            background: `linear-gradient(45deg, ${designTokens.colors.semantic.success}, ${designTokens.colors.accent.glow})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center'
          }}
        >
          🏗️ 智能支护结构设计系统
        </motion.h1>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100% - 150px)'
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              background: `linear-gradient(135deg, ${designTokens.colors.dark.card}90 0%, ${designTokens.colors.dark.surface}90 100%)`,
              borderRadius: '20px',
              padding: '60px',
              border: `1px solid ${designTokens.colors.semantic.success}40`,
              textAlign: 'center',
              backdropFilter: 'blur(20px)'
            }}
          >
            <div style={{ fontSize: '80px', marginBottom: '30px' }}>🚧</div>
            <h2 style={{ 
              color: designTokens.colors.semantic.success, 
              marginBottom: '20px',
              fontSize: '24px'
            }}>
              支护设计系统集成中
            </h2>
            <p style={{ 
              color: designTokens.colors.light.secondary, 
              fontSize: '16px',
              lineHeight: 1.6,
              maxWidth: '400px'
            }}>
              3号的安全评估系统 + 施工阶段分析系统
              <br />正在与支护设计界面集成
              <br />即将提供完整的智能支护设计体验
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// ==================== 多物理场耦合视图 ====================

const MultiphysicsView: React.FC<{
  systemIntegration?: DeepCADSystemIntegration | null;
  onBack: () => void;
}> = ({ systemIntegration, onBack }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6 }}
      style={{
        height: '100%',
        background: `linear-gradient(135deg, ${designTokens.colors.dark.deepSpace} 0%, #0a4d3a 50%, ${designTokens.colors.dark.quantum} 100%)`,
        padding: '40px'
      }}
    >
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 100
      }}>
        <Button
          variant="success"
          size="sm"
          glow={true}
          caeType="computation"
          onClick={onBack}
        >
          ← 返回核心模块
        </Button>
      </div>

      <div style={{ marginTop: '60px' }}>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: '36px',
            fontWeight: 700,
            marginBottom: '30px',
            background: `linear-gradient(45deg, #10b981, #059669, #047857)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center'
          }}
        >
          🌊 多物理场耦合仿真系统
        </motion.h1>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px',
          height: 'calc(100% - 150px)'
        }}>
          {/* 流固耦合 */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              background: `linear-gradient(135deg, #10b98150 0%, #047857500%)`,
              borderRadius: '20px',
              padding: '40px',
              border: `2px solid #10b981`,
              backdropFilter: 'blur(20px)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>💧</div>
            <h2 style={{ color: '#10b981', marginBottom: '20px', fontSize: '24px' }}>
              流固耦合分析
            </h2>
            <p style={{ color: designTokens.colors.light.secondary, fontSize: '16px', lineHeight: 1.6 }}>
              地下水渗流与土体变形耦合
              <br />考虑孔隙水压力作用
              <br />动态边界条件处理
              <br />非线性材料本构
            </p>
          </motion.div>

          {/* 热力耦合 */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              background: `linear-gradient(135deg, #f59e0b50 0%, #d9770050 0%)`,
              borderRadius: '20px',
              padding: '40px',
              border: `2px solid #f59e0b`,
              backdropFilter: 'blur(20px)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>🔥</div>
            <h2 style={{ color: '#f59e0b', marginBottom: '20px', fontSize: '24px' }}>
              热力耦合分析
            </h2>
            <p style={{ color: designTokens.colors.light.secondary, fontSize: '16px', lineHeight: 1.6 }}>
              温度场与应力场耦合
              <br />热膨胀变形分析
              <br />季节性温度影响
              <br />混凝土水化热
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// ==================== 物理AI视图 ====================

const PhysicsAIView: React.FC<{
  systemIntegration?: DeepCADSystemIntegration | null;
  onBack: () => void;
}> = ({ systemIntegration, onBack }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6 }}
      style={{
        height: '100%',
        background: `linear-gradient(135deg, ${designTokens.colors.dark.deepSpace} 0%, ${designTokens.colors.dark.quantum} 100%)`,
        padding: '40px'
      }}
    >
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 100
      }}>
        <Button
          variant="primary"
          size="sm"
          glow={true}
          caeType="material"
          onClick={onBack}
        >
          ← 返回主界面
        </Button>
      </div>

      <div style={{ marginTop: '60px' }}>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '30px',
            background: `linear-gradient(45deg, ${designTokens.colors.accent.ai}, ${designTokens.colors.accent.glow})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center'
          }}
        >
          🤖 物理AI智能预测系统
        </motion.h1>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100% - 150px)'
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              background: `linear-gradient(135deg, ${designTokens.colors.dark.card}90 0%, ${designTokens.colors.dark.surface}90 100%)`,
              borderRadius: '20px',
              padding: '60px',
              border: `1px solid ${designTokens.colors.accent.ai}40`,
              textAlign: 'center',
              backdropFilter: 'blur(20px)'
            }}
          >
            <div style={{ fontSize: '80px', marginBottom: '30px' }}>🧠</div>
            <h2 style={{ 
              color: designTokens.colors.accent.ai, 
              marginBottom: '20px',
              fontSize: '24px'
            }}>
              AI预测系统开发中
            </h2>
            <p style={{ 
              color: designTokens.colors.light.secondary, 
              fontSize: '16px',
              lineHeight: 1.6,
              maxWidth: '400px'
            }}>
              基于深度学习的基坑变形预测
              <br />智能风险评估和优化建议
              <br />即将集成完整的AI分析能力
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// ==================== 🚀 核心模块震撼仪表板 ====================

const CoreModuleDashboard: React.FC<{
  coreModules: any[];
  onModuleSelect: (moduleId: string) => void;
  systemIntegration?: DeepCADSystemIntegration | null;
}> = ({ coreModules, onModuleSelect, systemIntegration }) => {
  const navigate = useNavigate(); // 在这个组件中也需要定义navigate
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      style={{
        padding: '60px',
        height: 'calc(100vh - 80px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: `url("data:image/svg+xml,${encodeURIComponent(`
          <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="${designTokens.colors.accent.glow}20" stroke-width="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        `)}") repeat`
      }}
    >
      {/* 欢迎文字 */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        style={{
          textAlign: 'center',
          marginBottom: '80px'
        }}
      >
        <h2 style={{
          fontSize: '48px',
          fontWeight: 700,
          margin: '0 0 24px 0',
          background: `linear-gradient(45deg, ${designTokens.colors.light.primary}, ${designTokens.colors.accent.quantum})`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: `0 0 40px ${designTokens.colors.accent.glow}60`
        }}>
          核心模块
        </h2>
        <p style={{
          fontSize: '20px',
          opacity: 0.8,
          maxWidth: '600px',
          lineHeight: 1.6,
          margin: '0 auto 20px auto'
        }}>
          智能深基坑分析设计系统
          <br />
          基于WebGPU + Three.js • 5-10x GPU加速 • 专业CAE计算
        </p>
        
      </motion.div>

      {/* 🎨 灵动参差模块网格 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(3, minmax(180px, auto))',
          gap: '24px',
          maxWidth: '1100px',
          width: '100%',
          minHeight: '600px'
        }}
      >
        {/* AI仿真知识库 - 横跨两列的大卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 60, rotateX: 10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          style={{ 
            gridColumn: 'span 2',
            gridRow: 'span 1'
          }}
        >
          <CoreModuleCard
            coreModule={coreModules[0]}
            index={0}
            onClick={() => onModuleSelect(coreModules[0].id)}
          />
        </motion.div>

        {/* 智能优化 - 竖长卡片 */}
        <motion.div
          initial={{ opacity: 0, x: 60, rotateY: -10 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ 
            gridColumn: 'span 1',
            gridRow: 'span 2'
          }}
        >
          <CoreModuleCard
            coreModule={coreModules[1]}
            index={1}
            onClick={() => onModuleSelect(coreModules[1].id)}
          />
        </motion.div>

        {/* 参数化建模 - 标准卡片 */}
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{ 
            gridColumn: 'span 1',
            gridRow: 'span 1'
          }}
        >
          <CoreModuleCard
            coreModule={coreModules[2]}
            index={2}
            onClick={() => onModuleSelect(coreModules[2].id)}
          />
        </motion.div>

        {/* 多物理场耦合 - 标准卡片 */}
        <motion.div
          initial={{ opacity: 0, x: -40, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{ 
            gridColumn: 'span 1',
            gridRow: 'span 1'
          }}
        >
          <CoreModuleCard
            coreModule={coreModules[3]}
            index={3}
            onClick={() => onModuleSelect(coreModules[3].id)}
          />
        </motion.div>

        {/* 物理AI - 横跨两列的大卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 80, rotateX: -10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          style={{ 
            gridColumn: 'span 2',
            gridRow: 'span 1'
          }}
        >
          <CoreModuleCard
            coreModule={coreModules[4]}
            index={4}
            onClick={() => onModuleSelect(coreModules[4].id)}
          />
        </motion.div>
      </motion.div>

      {/* 底部系统入口 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1 }}
        style={{
          marginTop: '80px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Button
          variant="primary"
          size={32}
          glow={true}
          quantum={true}
          caeType="results"
          onClick={() => navigate('/workspace/dashboard')}
        >
          🚀 进入主界面
        </Button>
      </motion.div>
    </motion.div>
  );
};

// ==================== 核心模块卡片 ====================

const CoreModuleCard: React.FC<{
  coreModule: any;
  index: number;
  onClick: () => void;
}> = ({ coreModule, index, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // 根据尺寸调整样式
  const isLarge = coreModule.size === 'large';
  const iconSize = isLarge ? 56 : 42;
  const titleSize = isLarge ? '32px' : '24px';
  const descSize = isLarge ? '16px' : '14px';

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        y: 80,
        rotateX: -12,
        scale: 0.85
      }}
      animate={{ 
        opacity: 1, 
        y: 0,
        rotateX: 0,
        scale: 1
      }}
      transition={{ 
        duration: 0.8, 
        delay: index * 0.12,
        ease: [0.23, 1, 0.32, 1]
      }}
      whileHover={{ 
        scale: 1.08, 
        y: -25,
        rotateY: 6,
        rotateX: 4,
        transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] }
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{ 
        height: '100%',
        perspective: '1200px',
        transformStyle: 'preserve-3d'
      }}
    >
      {/* Dream Box风格卡片容器 */}
      <div
        onClick={() => {
          console.log('🎯 CoreModuleCard clicked!');
          onClick();
        }}
        style={{
          position: 'relative',
          height: '100%',
          minHeight: isLarge ? '220px' : '200px',
          background: `linear-gradient(135deg, 
            ${coreModule.color}06 0%, 
            ${coreModule.color}12 25%, 
            rgba(0, 0, 0, 0.25) 65%, 
            rgba(0, 0, 0, 0.85) 100%
          )`,
          border: `2.5px solid ${coreModule.color}35`,
          borderRadius: '20px',
          overflow: 'hidden',
          backdropFilter: 'blur(25px)',
          boxShadow: `
            0 15px 50px ${coreModule.color}18,
            0 0 120px ${coreModule.color}12,
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            inset 0 -1px 0 rgba(0, 0, 0, 0.2)
          `,
          transformStyle: 'preserve-3d',
          cursor: 'pointer'
        }}
      >
        {/* 动态背景网格 - DREAM BOX风格 */}
        <motion.div
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            backgroundPosition: { duration: 30, ease: 'linear', repeat: Infinity },
            opacity: { duration: 5, ease: 'easeInOut', repeat: Infinity }
          }}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(${coreModule.color}30 1.5px, transparent 1.5px),
              linear-gradient(90deg, ${coreModule.color}30 1.5px, transparent 1.5px),
              linear-gradient(45deg, ${coreModule.color}15 1px, transparent 1px),
              linear-gradient(-45deg, ${coreModule.color}15 1px, transparent 1px)
            `,
            backgroundSize: '28px 28px, 28px 28px, 14px 14px, 14px 14px',
            opacity: 0.4
          }}
        />
        
        {/* 多重光效层 */}
        <motion.div
          animate={{
            opacity: [0.15, 0.8, 0.15],
            scale: [0.9, 1.3, 0.9],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.8
          }}
          style={{
            position: 'absolute',
            top: '-70%',
            left: '-70%',
            right: '-70%',
            bottom: '-70%',
            background: `conic-gradient(from 0deg, ${coreModule.color}25, transparent 30%, ${coreModule.color}35, transparent 60%, ${coreModule.color}20, transparent)`,
            pointerEvents: 'none'
          }}
        />

        {/* 状态指示器 */}
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            boxShadow: [
              `0 0 15px ${coreModule.color}60`,
              `0 0 35px ${coreModule.color}80`,
              `0 0 15px ${coreModule.color}60`
            ]
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: coreModule.color,
            border: '2px solid rgba(255, 255, 255, 0.4)',
            zIndex: 10
          }}
        />
        
        {/* 内容区域 */}
        <div style={{ 
          position: 'relative',
          height: '100%',
          padding: isLarge ? '32px' : '28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isLarge ? 'center' : 'flex-start',
          alignItems: isLarge ? 'center' : 'flex-start',
          zIndex: 5,
          textAlign: isLarge ? 'center' : 'left'
        }}>
          {/* 图标区域 */}
          <motion.div
            animate={{
              scale: isHovered ? 1.15 : 1,
              rotate: isHovered ? 8 : 0,
              y: isHovered ? -3 : 0
            }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            style={{
              marginBottom: isLarge ? '24px' : '20px',
              filter: `drop-shadow(0 0 20px ${coreModule.color}50)`
            }}
          >
            <coreModule.icon 
              size={iconSize} 
              color={isHovered ? coreModule.color : '#ffffff'}
              animated={isHovered}
            />
          </motion.div>

          {/* 标题 */}
          <motion.h3 
            animate={{
              scale: isHovered ? 1.05 : 1,
              color: isHovered ? coreModule.color : '#ffffff',
              textShadow: isHovered ? 
                `0 0 25px ${coreModule.color}80, 0 2px 6px rgba(0,0,0,0.4)` : 
                '0 2px 4px rgba(0,0,0,0.5), 0 0 8px rgba(255,255,255,0.1)'
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              fontSize: titleSize,
              fontWeight: isLarge ? 700 : 600,
              margin: `0 0 ${isLarge ? '16px' : '12px'} 0`,
              color: '#ffffff',
              lineHeight: 1.2,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              letterSpacing: '0.5px',
              textRendering: 'optimizeLegibility',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale'
            }}
          >
            {coreModule.name}
          </motion.h3>
          
          {/* 描述文字 */}
          <motion.p 
            animate={{
              opacity: isHovered ? 1 : 0.9
            }}
            style={{
              fontSize: descSize,
              color: 'rgba(255, 255, 255, 0.9)',
              margin: 0,
              lineHeight: isLarge ? 1.6 : 1.5,
              maxWidth: isLarge ? '85%' : '100%',
              textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 0 4px rgba(255,255,255,0.1)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: '400',
              letterSpacing: '0.2px',
              textRendering: 'optimizeLegibility',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale'
            }}
          >
            {coreModule.description}
          </motion.p>

          {/* 装饰性底部光效 */}
          <motion.div
            animate={{
              scaleX: isHovered ? 1 : 0.8,
              opacity: isHovered ? 0.8 : 0.4
            }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              height: '4px',
              background: `linear-gradient(90deg, transparent, ${coreModule.color}80, transparent)`,
              borderRadius: '2px'
            }}
          />
        </div>
        
        {/* 底部反射效果 */}
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          height: '50%',
          background: `linear-gradient(to top, ${coreModule.color}04, transparent)`,
          borderRadius: '0 0 20px 20px',
          pointerEvents: 'none'
        }} />
      </div>

      {/* 1号专家 - 右下角悬浮🧠AI助手 */}
      <FloatingAIAssistant position={{ bottom: 30, right: 30 }} />
    </motion.div>
  );
};

// ==================== 3号计算专家视图 ====================

const ComputationExpertView: React.FC<{
  systemIntegration: DeepCADSystemIntegration;
  onBack: () => void;
}> = ({ systemIntegration, onBack }) => {
  const [activePanel, setActivePanel] = useState<'analysis' | 'mesh' | 'visualization' | 'collaboration'>('analysis');
  const [computationProgress, setComputationProgress] = useState(0);
  const [meshQuality, setMeshQuality] = useState(0.92);
  const [isComputing, setIsComputing] = useState(false);
  const [convergenceStatus, setConvergenceStatus] = useState<'converged' | 'computing' | 'failed'>('converged');

  // 模拟计算进度
  useEffect(() => {
    if (isComputing) {
      const interval = setInterval(() => {
        setComputationProgress(prev => {
          if (prev >= 100) {
            setIsComputing(false);
            setConvergenceStatus('converged');
            return 100;
          }
          return prev + 2;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isComputing]);

  const startComputation = () => {
    setIsComputing(true);
    setComputationProgress(0);
    setConvergenceStatus('computing');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.6 }}
      style={{
        height: '100%',
        background: `linear-gradient(135deg, ${designTokens.colors.dark.deepSpace} 0%, ${designTokens.colors.dark.quantum} 100%)`,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 返回按钮 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 100
      }}>
        <Button
          variant="outline"
          size="sm"
          glow={true}
          caeType="computation"
          onClick={onBack}
        >
          ← 返回主界面
        </Button>
      </div>

      {/* 标题 */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '20px',
          marginTop: '50px',
          background: `linear-gradient(45deg, ${designTokens.colors.accent.computation}, ${designTokens.colors.accent.glow})`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center'
        }}
      >
        🧮 3号计算专家 - 深基坑计算分析系统
      </motion.h1>

      {/* 面板切换标签 */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '20px',
        gap: '12px'
      }}>
        {[
          { id: 'analysis', name: '⚡ 计算分析', desc: '深基坑计算分析' },
          { id: 'mesh', name: '🔧 网格质量', desc: '网格质量分析' },
          { id: 'visualization', name: '📊 可视化', desc: 'GPU加速可视化' },
          { id: 'collaboration', name: '🤝 专家协作', desc: '与2号专家协作' }
        ].map((panel) => (
          <Button
            key={panel.id}
            variant={activePanel === panel.id ? "primary" : "outline"}
            size="sm"
            glow={activePanel === panel.id}
            caeType="computation"
            onClick={() => setActivePanel(panel.id as any)}
            title={panel.desc}
          >
            {panel.name}
          </Button>
        ))}
      </div>

      {/* 主要内容区域 */}
      <div style={{ 
        flex: 1, 
        display: 'grid', 
        gridTemplateColumns: '300px 1fr 350px', 
        gap: '20px',
        minHeight: 0
      }}>
        {/* 左侧控制面板 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 荷载配置面板 */}
          <GlassmorphismCard 
            variant="pro" 
            glowColor={designTokens.colors.accent.computation}
            style={{ padding: '12px', flex: 1 }}
          >
            <h3 style={{ color: designTokens.colors.light.primary, marginBottom: '12px', fontSize: '14px' }}>
              ⚡ 荷载配置
            </h3>
            <div style={{ fontSize: '12px', color: designTokens.colors.light.secondary }}>
              <div style={{ marginBottom: '8px' }}>
                <span>地面荷载: </span>
                <input type="number" defaultValue={20} style={{ 
                  width: '60px', 
                  background: 'rgba(0,0,0,0.3)', 
                  border: '1px solid rgba(99,102,241,0.3)',
                  color: designTokens.colors.light.primary,
                  padding: '2px 4px',
                  borderRadius: '3px'
                }} />
                <span> kPa</span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span>施工荷载: </span>
                <input type="number" defaultValue={15} style={{ 
                  width: '60px', 
                  background: 'rgba(0,0,0,0.3)', 
                  border: '1px solid rgba(99,102,241,0.3)',
                  color: designTokens.colors.light.primary,
                  padding: '2px 4px',
                  borderRadius: '3px'
                }} />
                <span> kPa</span>
              </div>
              <div>
                <span>开挖深度: </span>
                <input type="number" defaultValue={12} style={{ 
                  width: '60px', 
                  background: 'rgba(0,0,0,0.3)', 
                  border: '1px solid rgba(99,102,241,0.3)',
                  color: designTokens.colors.light.primary,
                  padding: '2px 4px',
                  borderRadius: '3px'
                }} />
                <span> m</span>
              </div>
            </div>
          </GlassmorphismCard>

          {/* 求解器配置 */}
          <GlassmorphismCard 
            variant="pro" 
            glowColor={designTokens.colors.accent.quantum}
            style={{ padding: '12px', flex: 1 }}
          >
            <h3 style={{ color: designTokens.colors.light.primary, marginBottom: '12px', fontSize: '14px' }}>
              🔧 求解器配置
            </h3>
            <div style={{ fontSize: '12px', color: designTokens.colors.light.secondary }}>
              <div style={{ marginBottom: '8px' }}>
                <span>求解器类型: </span>
                <select style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  border: '1px solid rgba(99,102,241,0.3)',
                  color: designTokens.colors.light.primary,
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  <option value="kratos">Kratos求解器</option>
                  <option value="ansys">ANSYS求解器</option>
                  <option value="abaqus">Abaqus求解器</option>
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <Button
                  variant={isComputing ? "outline" : "primary"}
                  size="sm"
                  caeType="computation"
                  onClick={startComputation}
                  disabled={isComputing}
                  style={{ width: '100%' }}
                >
                  {isComputing ? '🔄 计算中...' : '🚀 开始计算'}
                </Button>
              </div>
              <div>
                <span>计算进度: {computationProgress}%</span>
                <div style={{
                  width: '100%',
                  height: '4px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '2px',
                  marginTop: '4px'
                }}>
                  <div style={{
                    width: `${computationProgress}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${designTokens.colors.accent.computation}, ${designTokens.colors.accent.glow})`,
                    borderRadius: '2px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            </div>
          </GlassmorphismCard>
        </div>

        {/* 中央可视化区域 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 计算结果3D可视化 */}
          <GlassmorphismCard 
            variant="ultra" 
            glowColor={designTokens.colors.accent.visualization}
            style={{ height: '400px', padding: '8px', position: 'relative' }}
          >
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(20,0,40,0.8), rgba(40,20,80,0.6))',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: designTokens.colors.light.primary,
              fontSize: '16px'
            }}>
              🧮 深基坑应力位移云图
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                fontSize: '12px',
                background: 'rgba(0,0,0,0.6)',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                {isComputing ? '计算中...' : 'GPU渲染就绪'}
              </div>
            </div>
          </GlassmorphismCard>

          {/* 实时监控面板 */}
          <GlassmorphismCard 
            variant="pro" 
            glowColor={designTokens.colors.accent.glow}
            style={{ flex: 1, padding: '12px' }}
          >
            <h3 style={{ color: designTokens.colors.light.primary, marginBottom: '12px', fontSize: '14px' }}>
              📊 实时计算监控
            </h3>
            <div style={{ fontSize: '12px', color: designTokens.colors.light.secondary }}>
              <div>CPU使用率: <span style={{ color: designTokens.colors.accent.computation }}>85%</span></div>
              <div>GPU使用率: <span style={{ color: designTokens.colors.accent.glow }}>92%</span></div>
              <div>内存使用: <span style={{ color: designTokens.colors.semantic.success }}>12.5GB / 32GB</span></div>
              <div>收敛状态: <span style={{ 
                color: convergenceStatus === 'converged' ? designTokens.colors.semantic.success : 
                      convergenceStatus === 'computing' ? designTokens.colors.accent.computation :
                      designTokens.colors.semantic.error 
              }}>
                {convergenceStatus === 'converged' ? '✅ 已收敛' : 
                 convergenceStatus === 'computing' ? '🔄 计算中' : '❌ 计算失败'}
              </span></div>
            </div>
          </GlassmorphismCard>
        </div>

        {/* 右侧分析面板 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 网格质量分析 */}
          <GlassmorphismCard 
            variant="pro" 
            glowColor={designTokens.colors.semantic.success}
            style={{ padding: '12px', flex: 1 }}
          >
            <h3 style={{ color: designTokens.colors.light.primary, marginBottom: '12px', fontSize: '14px' }}>
              🔧 网格质量分析
            </h3>
            <div style={{ fontSize: '12px', color: designTokens.colors.light.secondary }}>
              <div>网格质量评分: <span style={{ color: designTokens.colors.semantic.success, fontWeight: 'bold' }}>{(meshQuality * 100).toFixed(1)}%</span></div>
              <div>单元数量: <span style={{ color: designTokens.colors.accent.glow }}>156,342个</span></div>
              <div>节点数量: <span style={{ color: designTokens.colors.accent.glow }}>89,657个</span></div>
              <div>最小角度: <span style={{ color: designTokens.colors.semantic.warning }}>28.5°</span></div>
              <div>最大倾斜: <span style={{ color: designTokens.colors.semantic.success }}>0.15</span></div>
            </div>
          </GlassmorphismCard>

          {/* 专家协作中心 */}
          <GlassmorphismCard 
            variant="pro" 
            glowColor={designTokens.colors.primary.main}
            style={{ padding: '12px', flex: 1 }}
          >
            <h3 style={{ color: designTokens.colors.light.primary, marginBottom: '12px', fontSize: '14px' }}>
              🤝 专家协作中心
            </h3>
            <div style={{ fontSize: '12px', color: designTokens.colors.light.secondary }}>
              <div>与2号专家连接: <span style={{ color: designTokens.colors.semantic.success }}>✅ 已连接</span></div>
              <div>几何反馈: <span style={{ color: designTokens.colors.accent.glow }}>质量良好</span></div>
              <div>网格建议: <span style={{ color: designTokens.colors.semantic.warning }}>边界区域细化</span></div>
              <div>协作状态: <span style={{ color: designTokens.colors.semantic.success }}>实时同步中</span></div>
            </div>
          </GlassmorphismCard>

          {/* 结果分析 */}
          <GlassmorphismCard 
            variant="pro" 
            glowColor={designTokens.colors.accent.visualization}
            style={{ padding: '12px', flex: 1 }}
          >
            <h3 style={{ color: designTokens.colors.light.primary, marginBottom: '12px', fontSize: '14px' }}>
              📈 结果分析
            </h3>
            <div style={{ fontSize: '11px', color: designTokens.colors.light.secondary }}>
              <div>最大位移: <span style={{ color: designTokens.colors.semantic.warning }}>15.2mm</span></div>
              <div>最大应力: <span style={{ color: designTokens.colors.semantic.error }}>285kPa</span></div>
              <div>安全系数: <span style={{ color: designTokens.colors.semantic.success }}>2.1</span></div>
              <div>变形模式: <span style={{ color: designTokens.colors.accent.glow }}>整体稳定</span></div>
            </div>
          </GlassmorphismCard>
        </div>
      </div>

      {/* 悬浮式DeepCAD AI助手 */}
      <FloatingAIAssistant position={{ bottom: 30, right: 30 }} />
    </motion.div>
  );
};

// ==================== 2号几何专家视图 ====================

const GeometryExpertView: React.FC<{
  systemIntegration: DeepCADSystemIntegration;
  onBack: () => void;
}> = ({ systemIntegration, onBack }) => {
  const [activePanel, setActivePanel] = useState<'rbf' | 'quality' | 'collaboration' | 'materials'>('rbf');
  const [rbfProgress, setRbfProgress] = useState(0);
  const [geometryQuality, setGeometryQuality] = useState(0.85);
  const [collaborationStatus, setCollaborationStatus] = useState<'connected' | 'disconnected'>('connected');

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.6 }}
      style={{
        height: '100%',
        background: `linear-gradient(135deg, ${designTokens.colors.dark.deepSpace} 0%, ${designTokens.colors.dark.quantum} 100%)`,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 返回按钮 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 100
      }}>
        <Button
          variant="outline"
          size="sm"
          glow={true}
          caeType="geometry"
          onClick={onBack}
        >
          ← 返回主界面
        </Button>
      </div>

      {/* 标题 */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '20px',
          marginTop: '50px',
          background: `linear-gradient(45deg, ${designTokens.colors.primary.deep}, ${designTokens.colors.accent.glow})`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center'
        }}
      >
        📐 2号几何专家 - RBF几何重建系统
      </motion.h1>

      {/* 面板切换标签 */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '20px',
        gap: '12px'
      }}>
        {[
          { id: 'rbf', name: '🔧 RBF重建', desc: 'RBF几何重建控制' },
          { id: 'quality', name: '📊 质量监控', desc: '几何质量实时监控' },
          { id: 'collaboration', name: '🤝 协作面板', desc: '与3号专家协作' },
          { id: 'materials', name: '🎨 材料库', desc: '材料库管理' }
        ].map((panel) => (
          <Button
            key={panel.id}
            variant={activePanel === panel.id ? "primary" : "outline"}
            size="sm"
            glow={activePanel === panel.id}
            caeType="geometry"
            onClick={() => setActivePanel(panel.id as any)}
            title={panel.desc}
          >
            {panel.name}
          </Button>
        ))}
      </div>

      {/* 主要内容区域 */}
      <div style={{ 
        flex: 1, 
        display: 'grid', 
        gridTemplateColumns: '1fr 2fr 1fr', 
        gap: '20px',
        minHeight: 0
      }}>
        {/* 左侧面板 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* RBF参数控制 */}
          <GlassmorphismCard 
            variant="pro" 
            glowColor={designTokens.colors.primary.deep}
            style={{ padding: '12px', flex: 1 }}
          >
            <h3 style={{ color: designTokens.colors.light.primary, marginBottom: '12px', fontSize: '14px' }}>
              🔧 RBF参数控制
            </h3>
            <div style={{ fontSize: '12px', color: designTokens.colors.light.secondary }}>
              <div style={{ marginBottom: '8px' }}>
                <span>核函数类型: </span>
                <select style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  border: '1px solid rgba(99,102,241,0.3)',
                  color: designTokens.colors.light.primary,
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  <option value="gaussian">高斯函数</option>
                  <option value="multiquadric">多二次函数</option>
                  <option value="thin-plate">薄板样条</option>
                </select>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span>平滑因子: </span>
                <input type="range" min="0" max="1" step="0.01" defaultValue="0.5" 
                  style={{ width: '100%', accentColor: designTokens.colors.primary.deep }} />
              </div>
              <div>
                <span>重建进度: {rbfProgress}%</span>
                <div style={{
                  width: '100%',
                  height: '4px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '2px',
                  marginTop: '4px'
                }}>
                  <div style={{
                    width: `${rbfProgress}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${designTokens.colors.primary.deep}, ${designTokens.colors.accent.glow})`,
                    borderRadius: '2px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            </div>
          </GlassmorphismCard>

          {/* 质量评估 */}
          <GlassmorphismCard 
            variant="pro" 
            glowColor={designTokens.colors.semantic.success}
            style={{ padding: '12px', flex: 1 }}
          >
            <h3 style={{ color: designTokens.colors.light.primary, marginBottom: '12px', fontSize: '14px' }}>
              📊 质量评估
            </h3>
            <div style={{ fontSize: '12px', color: designTokens.colors.light.secondary }}>
              <div>几何质量评分: <span style={{ color: designTokens.colors.semantic.success, fontWeight: 'bold' }}>{(geometryQuality * 100).toFixed(1)}%</span></div>
              <div>缺陷检测: <span style={{ color: designTokens.colors.semantic.warning }}>3个异常点</span></div>
              <div>自动修复: <span style={{ color: designTokens.colors.accent.glow }}>进行中...</span></div>
            </div>
          </GlassmorphismCard>
        </div>

        {/* 中央3D预览区域 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <GlassmorphismCard 
            variant="ultra" 
            glowColor={designTokens.colors.accent.visualization}
            style={{ height: '400px', padding: '8px', position: 'relative' }}
          >
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(0,20,40,0.8), rgba(0,40,80,0.6))',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: designTokens.colors.light.primary,
              fontSize: '16px'
            }}>
              🌍 RBF几何重建3D预览
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                fontSize: '12px',
                background: 'rgba(0,0,0,0.6)',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                实时渲染中...
              </div>
            </div>
          </GlassmorphismCard>

          {/* 协作状态区域 */}
          <GlassmorphismCard 
            variant="pro" 
            glowColor={designTokens.colors.accent.quantum}
            style={{ flex: 1, padding: '12px' }}
          >
            <h3 style={{ color: designTokens.colors.light.primary, marginBottom: '12px', fontSize: '14px' }}>
              🤝 与3号专家协作状态
            </h3>
            <div style={{ fontSize: '12px', color: designTokens.colors.light.secondary }}>
              <div>连接状态: <span style={{ 
                color: collaborationStatus === 'connected' ? designTokens.colors.semantic.success : designTokens.colors.semantic.error 
              }}>
                {collaborationStatus === 'connected' ? '✅ 已连接' : '❌ 断开连接'}
              </span></div>
              <div>活跃工作流: 网格质量优化</div>
              <div>最新反馈: 网格质量良好，建议细化边界区域</div>
            </div>
          </GlassmorphismCard>
        </div>

        {/* 右侧面板 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 材料库管理 */}
          <GlassmorphismCard 
            variant="pro" 
            glowColor={designTokens.colors.accent.glow}
            style={{ padding: '12px', flex: 1 }}
          >
            <h3 style={{ color: designTokens.colors.light.primary, marginBottom: '12px', fontSize: '14px' }}>
              🎨 材料库管理
            </h3>
            <div style={{ fontSize: '12px', color: designTokens.colors.light.secondary }}>
              <div>已加载材料: 土层、岩石、混凝土</div>
              <div>当前选择: 粉质粘土</div>
              <div>材料属性: E=25MPa, ν=0.3</div>
            </div>
          </GlassmorphismCard>

          {/* 历史记录 */}
          <GlassmorphismCard 
            variant="pro" 
            glowColor={designTokens.colors.primary.main}
            style={{ padding: '12px', flex: 1 }}
          >
            <h3 style={{ color: designTokens.colors.light.primary, marginBottom: '12px', fontSize: '14px' }}>
              📝 操作历史
            </h3>
            <div style={{ fontSize: '11px', color: designTokens.colors.light.secondary }}>
              <div>14:30 - RBF重建完成</div>
              <div>14:25 - 导入钻孔数据</div>
              <div>14:20 - 启动几何重建</div>
            </div>
          </GlassmorphismCard>
        </div>
      </div>

      {/* 悬浮式DeepCAD AI助手 */}
      <FloatingAIAssistant position={{ bottom: 30, right: 30 }} />
    </motion.div>
  );
};

export default DeepCADAdvancedApp;

// 添加飞行动画CSS
const flightAnimationCSS = `
<style>
@keyframes epicFlight {
  0% { 
    transform: rotate(0deg) scale(1);
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
  }
  50% { 
    transform: rotate(180deg) scale(1.1);
    box-shadow: 0 0 40px rgba(0, 255, 255, 0.6);
  }
  100% { 
    transform: rotate(360deg) scale(1);
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
  }
}

@keyframes flyRotate {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes flightProgress {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(0%); }
}
</style>
`;

// 将CSS注入到document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = flightAnimationCSS.replace('<style>', '').replace('</style>', '');
  document.head.appendChild(styleElement);
}