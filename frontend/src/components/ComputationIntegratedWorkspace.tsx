/**
 * 3号专家集成工作空间
 * 0号架构师 - 实现计算分析、网格生成和物理AI系统集成
 * 接收2号专家的地质模型和支护结构数据，进行计算分析
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { FunctionalIcons } from './icons/FunctionalIconsQuickFix';
import UnifiedModuleLayout from './ui/layout/UnifiedModuleLayout';
import Panel from './ui/layout/Panel';
import MetricCard from './ui/layout/MetricCard';
import './ui/layout/layout.css';
import DataPipelineManager from '../services/DataPipelineManager';

interface ComputationTask {
  id: string;
  name: string;
  type: 'mesh_generation' | 'structural_analysis' | 'soil_interaction' | 'deformation_analysis' | 'stability_check';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number; // seconds
  actualTime?: number;
}

interface MeshQualityMetrics {
  totalElements: number;
  totalNodes: number;
  minElementSize: number;
  maxElementSize: number;
  aspectRatio: number;
  skewness: number;
  orthogonality: number;
  qualityGrade: 'excellent' | 'good' | 'acceptable' | 'poor';
}

interface AnalysisResults {
  maxDisplacement: number;
  maxStress: number;
  safetyFactor: number;
  criticalZones: Array<{
    location: THREE.Vector3;
    type: 'high_stress' | 'large_deformation' | 'instability';
    severity: 'critical' | 'warning' | 'info';
    value: number;
  }>;
  deformationPattern: THREE.Vector3[];
  stressDistribution: Float32Array;
  timestamp: Date;
}

interface AISystemState {
  terraOptimizationActive: boolean;
  physicsAIEngaged: boolean;
  adaptiveMeshingEnabled: boolean;
  realTimeMonitoring: boolean;
  aiRecommendations: Array<{
    category: 'mesh_optimization' | 'analysis_parameters' | 'support_adjustment';
    suggestion: string;
    confidence: number;
    impact: 'high' | 'medium' | 'low';
  }>;
}

interface ComputationWorkspaceState {
  currentMode: 'mesh_generation' | 'analysis_setup' | 'computation_running' | 'results_review';
  activeTasks: ComputationTask[];
  meshMetrics?: MeshQualityMetrics;
  analysisResults?: AnalysisResults;
  aiSystemState: AISystemState;
  computationProgress: number;
  totalEstimatedTime: number;
  elapsedTime: number;
  expertCollaborationActive: boolean;
}

interface ComputationIntegratedWorkspaceProps {
  geologyData?: any;
  supportStructureData?: any;
  onComputationComplete?: (results: AnalysisResults) => void;
  onMeshGenerated?: (metrics: MeshQualityMetrics) => void;
  onDataTransferToEpic?: (visualizationData: any) => void;
  workspaceWidth?: number;
  workspaceHeight?: number;
}

const ComputationIntegratedWorkspace: React.FC<ComputationIntegratedWorkspaceProps> = ({
  geologyData,
  supportStructureData,
  onComputationComplete,
  onMeshGenerated,
  onDataTransferToEpic,
  workspaceWidth = 1400,
  workspaceHeight = 900
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const frameIdRef = useRef<number>();
  
  const [workspaceState, setWorkspaceState] = useState<ComputationWorkspaceState>({
    currentMode: 'mesh_generation',
    activeTasks: [],
    aiSystemState: {
      terraOptimizationActive: true,
      physicsAIEngaged: true,
      adaptiveMeshingEnabled: true,
      realTimeMonitoring: true,
      aiRecommendations: []
    },
    computationProgress: 0,
    totalEstimatedTime: 0,
    elapsedTime: 0,
    expertCollaborationActive: true
  });

  const [isComputing, setIsComputing] = useState(false);
  const [collaborationData, setCollaborationData] = useState<any>(null);
  const [computationStartTime, setComputationStartTime] = useState<number>(0);

  // 初始化3D计算场景
  const init3DComputationScene = useCallback(() => {
    if (!mountRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(75, workspaceWidth / workspaceHeight, 0.1, 1000);
    camera.position.set(0, 80, 120);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(workspaceWidth, workspaceHeight);
    renderer.setClearColor(0x1a1a1a);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 添加光照
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // 添加辅助网格
    const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x222222);
    scene.add(gridHelper);
    
    // 开始渲染循环
    startRenderLoop();
  }, [workspaceWidth, workspaceHeight]);

  // 开始渲染循环
  const startRenderLoop = () => {
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      if (sceneRef.current && cameraRef.current && rendererRef.current) {
        // 更新相机轨道动画
        updateCameraAnimation();
        
        // 更新计算可视化
        updateComputationVisualization();
        
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();
  };

  // 更新相机动画
  const updateCameraAnimation = () => {
    if (!cameraRef.current || !isComputing) return;
    
    const time = Date.now() * 0.001;
    cameraRef.current.position.x = Math.cos(time * 0.1) * 100;
    cameraRef.current.position.z = Math.sin(time * 0.1) * 100;
    cameraRef.current.lookAt(0, 0, 0);
  };

  // 更新计算可视化
  const updateComputationVisualization = () => {
    if (!sceneRef.current || !isComputing) return;
    
    // 更新网格可视化
    const meshObjects = sceneRef.current.children.filter(child => 
      child.userData?.type === 'computation_mesh'
    );
    
    meshObjects.forEach(mesh => {
      if (mesh instanceof THREE.Mesh && mesh.material instanceof THREE.MeshLambertMaterial) {
        // 根据计算进度更新颜色
        const hue = (workspaceState.computationProgress / 100) * 0.3; // 从红到绿
        mesh.material.color.setHSL(hue, 0.8, 0.5);
      }
    });
  };

  // 生成计算网格
  const generateComputationMesh = async () => {
    if (!sceneRef.current) return;

    setWorkspaceState(prev => ({ ...prev, currentMode: 'mesh_generation' }));
    setIsComputing(true);

    // 清除现有网格
    const existingMesh = sceneRef.current.children.filter(child => 
      child.userData?.type === 'computation_mesh'
    );
    existingMesh.forEach(obj => sceneRef.current!.remove(obj));

    // 模拟网格生成过程
    const meshTasks: ComputationTask[] = [
      {
        id: 'mesh_soil',
        name: '土体网格生成',
        type: 'mesh_generation',
        status: 'processing',
        progress: 0,
        priority: 'high',
        estimatedTime: 15
      },
      {
        id: 'mesh_structures',
        name: '支护结构网格',
        type: 'mesh_generation',
        status: 'pending',
        progress: 0,
        priority: 'high',
        estimatedTime: 10
      },
      {
        id: 'mesh_interfaces',
        name: '接触面网格',
        type: 'mesh_generation',
        status: 'pending',
        progress: 0,
        priority: 'medium',
        estimatedTime: 8
      }
    ];

    setWorkspaceState(prev => ({ 
      ...prev, 
      activeTasks: meshTasks,
      totalEstimatedTime: meshTasks.reduce((sum, task) => sum + task.estimatedTime, 0)
    }));

    // 逐步完成网格任务
    for (let i = 0; i < meshTasks.length; i++) {
      await processMeshTask(meshTasks[i], i);
      
      // 创建网格可视化
      createMeshVisualization(meshTasks[i]);
      
      // 更新任务状态
      setWorkspaceState(prev => ({
        ...prev,
        activeTasks: prev.activeTasks.map(task => 
          task.id === meshTasks[i].id 
            ? { ...task, status: 'completed', progress: 100 }
            : task
        )
      }));
    }

    // 生成网格质量指标
    const meshMetrics: MeshQualityMetrics = {
      totalElements: 45680,
      totalNodes: 52340,
      minElementSize: 0.3,
      maxElementSize: 2.5,
      aspectRatio: 2.8,
      skewness: 0.15,
      orthogonality: 0.92,
      qualityGrade: 'good'
    };

    setWorkspaceState(prev => ({ 
      ...prev, 
      meshMetrics,
      currentMode: 'analysis_setup'
    }));

    onMeshGenerated?.(meshMetrics);
    setIsComputing(false);
  };

  // 处理单个网格任务
  const processMeshTask = async (task: ComputationTask, index: number): Promise<void> => {
    return new Promise(resolve => {
      const duration = task.estimatedTime * 1000;
      const startTime = Date.now();
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * 100, 100);
        
        setWorkspaceState(prev => ({
          ...prev,
          activeTasks: prev.activeTasks.map(t => 
            t.id === task.id ? { ...t, progress } : t
          ),
          computationProgress: (index * 100 + progress) / 3
        }));

        if (progress < 100) {
          setTimeout(updateProgress, 100);
        } else {
          resolve();
        }
      };
      
      updateProgress();
    });
  };

  // 创建网格可视化
  const createMeshVisualization = (task: ComputationTask) => {
    if (!sceneRef.current) return;

    let meshGeometry: THREE.BufferGeometry;
    let position: THREE.Vector3;
    let color: number;

    switch (task.type) {
      case 'mesh_generation':
        if (task.id === 'mesh_soil') {
          meshGeometry = new THREE.BoxGeometry(80, 40, 80);
          position = new THREE.Vector3(0, -20, 0);
          color = 0x8B4513;
        } else if (task.id === 'mesh_structures') {
          meshGeometry = new THREE.CylinderGeometry(0.5, 0.5, 30, 8);
          position = new THREE.Vector3(20, -15, 20);
          color = 0x4169E1;
        } else {
          meshGeometry = new THREE.PlaneGeometry(90, 90);
          position = new THREE.Vector3(0, -40, 0);
          color = 0x666666;
        }
        break;
      default:
        return;
    }

    const wireframeGeometry = new THREE.WireframeGeometry(meshGeometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({ 
      color,
      transparent: true,
      opacity: 0.6
    });
    
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    wireframe.position.copy(position);
    wireframe.userData = { 
      type: 'computation_mesh', 
      taskId: task.id,
      taskType: task.type
    };
    
    sceneRef.current.add(wireframe);

    // 添加实体网格（低透明度）
    const solidMaterial = new THREE.MeshLambertMaterial({ 
      color,
      transparent: true,
      opacity: 0.2
    });
    const solidMesh = new THREE.Mesh(meshGeometry, solidMaterial);
    solidMesh.position.copy(position);
    solidMesh.userData = { 
      type: 'computation_mesh',
      taskId: task.id,
      solid: true
    };
    
    sceneRef.current.add(solidMesh);
  };

  // 运行结构分析
  const runStructuralAnalysis = async () => {
    if (!workspaceState.meshMetrics) return;

    setWorkspaceState(prev => ({ ...prev, currentMode: 'computation_running' }));
    setIsComputing(true);
    setComputationStartTime(Date.now());

    const analysisTasks: ComputationTask[] = [
      {
        id: 'stress_analysis',
        name: '应力分析',
        type: 'structural_analysis',
        status: 'processing',
        progress: 0,
        priority: 'high',
        estimatedTime: 25
      },
      {
        id: 'deformation_analysis',
        name: '变形分析',
        type: 'deformation_analysis',
        status: 'pending',
        progress: 0,
        priority: 'high',
        estimatedTime: 20
      },
      {
        id: 'soil_interaction',
        name: '土结相互作用',
        type: 'soil_interaction',
        status: 'pending',
        progress: 0,
        priority: 'high',
        estimatedTime: 30
      },
      {
        id: 'stability_check',
        name: '稳定性校核',
        type: 'stability_check',
        status: 'pending',
        progress: 0,
        priority: 'medium',
        estimatedTime: 15
      }
    ];

    setWorkspaceState(prev => ({ 
      ...prev, 
      activeTasks: analysisTasks,
      totalEstimatedTime: analysisTasks.reduce((sum, task) => sum + task.estimatedTime, 0)
    }));

    // 逐步完成分析任务
    for (let i = 0; i < analysisTasks.length; i++) {
      await processAnalysisTask(analysisTasks[i], i, analysisTasks.length);
      
      setWorkspaceState(prev => ({
        ...prev,
        activeTasks: prev.activeTasks.map(task => 
          task.id === analysisTasks[i].id 
            ? { ...task, status: 'completed', progress: 100 }
            : task
        )
      }));
    }

    // 生成分析结果
    const analysisResults: AnalysisResults = {
      maxDisplacement: 15.8, // mm
      maxStress: 2.4, // MPa
      safetyFactor: 2.8,
      criticalZones: [
        {
          location: new THREE.Vector3(25, -15, 0),
          type: 'high_stress',
          severity: 'warning',
          value: 2.4
        },
        {
          location: new THREE.Vector3(-20, -25, 15),
          type: 'large_deformation',
          severity: 'info',
          value: 12.3
        }
      ],
      deformationPattern: generateDeformationPattern(),
      stressDistribution: generateStressDistribution(),
      timestamp: new Date()
    };

    // 可视化分析结果
    visualizeAnalysisResults(analysisResults);

    setWorkspaceState(prev => ({ 
      ...prev, 
      analysisResults,
      currentMode: 'results_review',
      computationProgress: 100
    }));

    // 生成AI推荐
    generateAIRecommendations(analysisResults);

    setIsComputing(false);
    onComputationComplete?.(analysisResults);

    // 准备传输给1号专家的可视化数据
    const visualizationData = {
      results: analysisResults,
      meshQuality: workspaceState.meshMetrics,
      visualizationConfig: {
        stressColorMap: 'jet',
        deformationScale: 10,
        showCriticalZones: true,
        animateDeformation: true
      },
      timestamp: new Date()
    };

    onDataTransferToEpic?.(visualizationData);
  };

  // 处理单个分析任务
  const processAnalysisTask = async (task: ComputationTask, index: number, total: number): Promise<void> => {
    return new Promise(resolve => {
      const duration = task.estimatedTime * 1000;
      const startTime = Date.now();
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * 100, 100);
        
        setWorkspaceState(prev => ({
          ...prev,
          activeTasks: prev.activeTasks.map(t => 
            t.id === task.id ? { ...t, progress } : t
          ),
          computationProgress: ((index * 100 + progress) / total),
          elapsedTime: Date.now() - computationStartTime
        }));

        if (progress < 100) {
          setTimeout(updateProgress, 100);
        } else {
          resolve();
        }
      };
      
      updateProgress();
    });
  };

  // 生成变形模式
  const generateDeformationPattern = (): THREE.Vector3[] => {
    const pattern: THREE.Vector3[] = [];
    for (let i = 0; i < 100; i++) {
      pattern.push(new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * -0.5,
        Math.random() * 2 - 1
      ));
    }
    return pattern;
  };

  // 生成应力分布
  const generateStressDistribution = (): Float32Array => {
    const distribution = new Float32Array(1000);
    for (let i = 0; i < distribution.length; i++) {
      distribution[i] = Math.random() * 3; // 0-3 MPa
    }
    return distribution;
  };

  // 可视化分析结果
  const visualizeAnalysisResults = (results: AnalysisResults) => {
    if (!sceneRef.current) return;

    // 清除现有结果可视化
    const existingResults = sceneRef.current.children.filter(child => 
      child.userData?.type === 'analysis_result'
    );
    existingResults.forEach(obj => sceneRef.current!.remove(obj));

    // 可视化临界区域
    results.criticalZones.forEach((zone, index) => {
      const zoneGeometry = new THREE.SphereGeometry(3, 16, 12);
      const zoneColor = zone.severity === 'critical' ? 0xff0000 : 
                       zone.severity === 'warning' ? 0xffaa00 : 0x00ff00;
      
      const zoneMaterial = new THREE.MeshLambertMaterial({
        color: zoneColor,
        transparent: true,
        opacity: 0.7
      });
      
      const zoneMesh = new THREE.Mesh(zoneGeometry, zoneMaterial);
      zoneMesh.position.copy(zone.location);
      zoneMesh.userData = { 
        type: 'analysis_result', 
        subtype: 'critical_zone',
        zoneData: zone
      };
      
      sceneRef.current.add(zoneMesh);
    });

    // 可视化变形向量
    results.deformationPattern.forEach((deformation, index) => {
      if (index % 10 !== 0) return; // 只显示部分向量
      
      const arrowGeometry = new THREE.ConeGeometry(0.5, 3, 8);
      const arrowMaterial = new THREE.MeshLambertMaterial({ color: 0x00ffff });
      const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
      
      const position = new THREE.Vector3(
        (index % 10 - 5) * 8,
        -10,
        (Math.floor(index / 10) - 5) * 8
      );
      
      arrow.position.copy(position);
      arrow.lookAt(position.clone().add(deformation.normalize()));
      arrow.userData = { type: 'analysis_result', subtype: 'deformation_vector' };
      
      sceneRef.current.add(arrow);
    });
  };

  // 生成AI推荐
  const generateAIRecommendations = (results: AnalysisResults) => {
    const recommendations = [];

    if (results.safetyFactor < 2.0) {
      recommendations.push({
        category: 'support_adjustment' as const,
        suggestion: '建议增加锚索预应力或增加钢支撑层数',
        confidence: 0.85,
        impact: 'high' as const
      });
    }

    if (workspaceState.meshMetrics && workspaceState.meshMetrics.aspectRatio > 3.0) {
      recommendations.push({
        category: 'mesh_optimization' as const,
        suggestion: '建议在高应力区域细化网格，改善单元质量',
        confidence: 0.75,
        impact: 'medium' as const
      });
    }

    if (results.maxDisplacement > 20) {
      recommendations.push({
        category: 'analysis_parameters' as const,
        suggestion: '建议检查土体参数，可能需要更详细的地质勘察',
        confidence: 0.65,
        impact: 'medium' as const
      });
    }

    setWorkspaceState(prev => ({
      ...prev,
      aiSystemState: {
        ...prev.aiSystemState,
        aiRecommendations: recommendations
      }
    }));
  };

  // 处理模式切换
  const handleModeSwitch = (mode: ComputationWorkspaceState['currentMode']) => {
    setWorkspaceState(prev => ({ ...prev, currentMode: mode }));
  };

  // 初始化场景
  useEffect(() => {
    init3DComputationScene();
    
    return () => {
      // 停止动画帧
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }

      // 安全卸载 renderer.domElement（仅当确为其父节点时）
      try {
        const mountNode = mountRef.current;
        const renderer = rendererRef.current;
        const dom = renderer?.domElement;
        if (mountNode && dom && dom.parentNode === mountNode) {
          mountNode.removeChild(dom);
        }
        // 释放 WebGL 资源
        renderer?.dispose?.();
      } catch (e) {
        // 忽略卸载期间的偶发性错误，避免 NotFoundError 影响卸载流程
        console.warn('[ComputationIntegratedWorkspace] cleanup warning:', e);
      } finally {
        rendererRef.current = undefined;
        sceneRef.current = undefined;
        cameraRef.current = undefined;
      }
    };
  }, [init3DComputationScene]);

  // 监听来自2号专家的数据
  useEffect(() => {
    const handleGeologyData = (data: any) => {
      setCollaborationData(data);
      if (workspaceState.expertCollaborationActive) {
        // 自动开始网格生成
        setTimeout(() => {
          generateComputationMesh();
        }, 1000);
      }
    };

    DataPipelineManager.on('geology-to-computation', handleGeologyData);
    
    return () => {
      DataPipelineManager.off('geology-to-computation', handleGeologyData);
    };
  }, [workspaceState.expertCollaborationActive]);

  return (
    <UnifiedModuleLayout
      left={<>
        <Panel title={<span style={{display:'flex',alignItems:'center',gap:6}}><FunctionalIcons.ComputationRunning size={16}/> 工作模式</span>} subtitle={<span>Stage: {workspaceState.currentMode}</span>}>
          {[
            { mode: 'mesh_generation', label: '网格生成', icon: FunctionalIcons.MeshGeneration },
            { mode: 'analysis_setup', label: '分析设置', icon: FunctionalIcons.AnalysisSetup },
            { mode: 'computation_running', label: '计算运行', icon: FunctionalIcons.ComputationRunning },
            { mode: 'results_review', label: '结果审查', icon: FunctionalIcons.ResultsAnalysis }
          ].map(({ mode, label, icon: Icon }) => (
            <motion.button key={mode} className="dc-primary" style={{background: workspaceState.currentMode===mode?'linear-gradient(90deg,#7e22ce,#9333ea)':''}} onClick={()=>handleModeSwitch(mode as any)} whileHover={{scale:1.02}} whileTap={{scale:0.97}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:6}}><Icon size={14}/>{label}</span>
            </motion.button>
          ))}
        </Panel>
        <Panel title="AI系统状态" dense>
          <div style={{display:'flex',flexDirection:'column',gap:6,fontSize:12}}>
            {Object.entries({
              'TERRA优化': workspaceState.aiSystemState.terraOptimizationActive,
              '物理AI': workspaceState.aiSystemState.physicsAIEngaged,
              '自适应网格': workspaceState.aiSystemState.adaptiveMeshingEnabled,
              '实时监控': workspaceState.aiSystemState.realTimeMonitoring
            }).map(([k,v])=> (
              <div key={k} style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{opacity:.7}}>{k}</span>
                <div style={{width:10,height:10,borderRadius:6,background:v?'#16a34a':'#475569'}}/>
              </div>
            ))}
          </div>
        </Panel>
        {isComputing && (
          <Panel title="计算进度" dense>
            <div style={{fontSize:12,marginBottom:6}}>进度 {workspaceState.computationProgress.toFixed(1)}%</div>
            <div style={{width:'100%',height:8,background:'rgba(255,255,255,0.1)',borderRadius:4,overflow:'hidden'}}>
              <div style={{width:`${workspaceState.computationProgress}%`,height:'100%',background:'linear-gradient(90deg,#6366f1,#8b5cf6)'}}/>
            </div>
            <div style={{textAlign:'right',fontSize:11,opacity:.6,marginTop:4}}>已用 {Math.floor(workspaceState.elapsedTime/1000)}s</div>
          </Panel>
        )}
        {workspaceState.activeTasks.length>0 && (
          <Panel title="计算任务" dense>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {workspaceState.activeTasks.map(t=> (
                <div key={t.id} style={{background:'rgba(255,255,255,0.05)',padding:6,borderRadius:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                    <span>{t.name}</span>
                    <span style={{opacity:.6}}>{t.progress.toFixed(0)}%</span>
                  </div>
                  <div style={{width:'100%',height:4,background:'rgba(255,255,255,0.1)',borderRadius:2,overflow:'hidden'}}>
                    <div style={{width:`${t.progress}%`,height:'100%',background:'#6366f1'}}/>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </>}
      right={<>
        {workspaceState.meshMetrics && (
          <Panel title="网格质量" subtitle={<span>Grade: {workspaceState.meshMetrics.qualityGrade}</span>}>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <MetricCard accent="blue" label="单元" value={workspaceState.meshMetrics.totalElements.toLocaleString()} />
              <MetricCard accent="purple" label="节点" value={workspaceState.meshMetrics.totalNodes.toLocaleString()} />
              <MetricCard accent="green" label="长宽比" value={workspaceState.meshMetrics.aspectRatio.toFixed(2)} />
              <MetricCard accent="orange" label="偏斜度" value={workspaceState.meshMetrics.skewness.toFixed(3)} />
            </div>
          </Panel>
        )}
        {workspaceState.aiSystemState.aiRecommendations.length>0 && (
          <Panel title="AI推荐" dense>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {workspaceState.aiSystemState.aiRecommendations.map((rec,i)=>(
                <div key={i} style={{background:'rgba(34,197,94,0.12)',padding:'6px 8px',borderRadius:8,border:'1px solid rgba(34,197,94,0.25)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:2,opacity:.8}}>
                    <span>{rec.category}</span>
                    <span>{(rec.confidence*100).toFixed(0)}%</span>
                  </div>
                  <div style={{fontSize:12}}>{rec.suggestion}</div>
                </div>
              ))}
            </div>
          </Panel>
        )}
        {workspaceState.expertCollaborationActive && collaborationData && (
          <Panel title="协作" dense>
            <div style={{fontSize:12,display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:8,height:8,borderRadius:5,background:'#a855f7',animation:'dc-pulse 1.5s infinite'}}/>
              <span>接收2号专家地质/支护数据</span>
            </div>
          </Panel>
        )}
        <Panel title="操作" dense>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {workspaceState.currentMode==='mesh_generation' && !isComputing && (
              <motion.button className="dc-primary" onClick={generateComputationMesh} whileHover={{scale:1.02}} whileTap={{scale:0.97}}>生成计算网格</motion.button>
            )}
            {workspaceState.currentMode==='analysis_setup' && workspaceState.meshMetrics && !isComputing && (
              <motion.button className="dc-primary" style={{background:'linear-gradient(90deg,#7e22ce,#9333ea)'}} onClick={runStructuralAnalysis} whileHover={{scale:1.02}} whileTap={{scale:0.97}}>运行结构分析</motion.button>
            )}
          </div>
        </Panel>
      </>}
    >
      <div ref={mountRef} style={{width:'100%',height:'100%'}} />
    </UnifiedModuleLayout>
  );
};

export default ComputationIntegratedWorkspace;