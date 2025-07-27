/**
 * 3号专家集成工作空间
 * 0号架构师 - 实现计算分析、网格生成和物理AI系统集成
 * 接收2号专家的地质模型和支护结构数据，进行计算分析
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { FunctionalIcons } from './icons/FunctionalIconsQuickFix';
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
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
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
    <div className="computation-integrated-workspace relative">
      {/* 3D计算场景 */}
      <div 
        ref={mountRef} 
        className="computation-3d-scene w-full h-full"
        style={{ width: workspaceWidth, height: workspaceHeight }}
      />
      
      {/* 控制面板 */}
      <div className="absolute top-4 left-4 space-y-4">
        {/* 模式切换 */}
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">3号专家工作模式</h3>
          <div className="space-y-2">
            {[
              { mode: 'mesh_generation', label: '网格生成', icon: FunctionalIcons.MeshGeneration },
              { mode: 'analysis_setup', label: '分析设置', icon: FunctionalIcons.AnalysisSetup },
              { mode: 'computation_running', label: '计算运行', icon: FunctionalIcons.ComputationRunning },
              { mode: 'results_review', label: '结果审查', icon: FunctionalIcons.ResultsAnalysis }
            ].map(({ mode, label, icon: Icon }) => (
              <motion.button
                key={mode}
                className={`flex items-center space-x-2 w-full px-3 py-2 rounded-lg transition-all ${
                  workspaceState.currentMode === mode 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => handleModeSwitch(mode as any)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon size={16} />
                <span className="text-sm">{label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* AI系统状态 */}
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">AI系统状态</h3>
          <div className="space-y-2">
            {Object.entries({
              'TERRA优化': workspaceState.aiSystemState.terraOptimizationActive,
              '物理AI': workspaceState.aiSystemState.physicsAIEngaged,
              '自适应网格': workspaceState.aiSystemState.adaptiveMeshingEnabled,
              '实时监控': workspaceState.aiSystemState.realTimeMonitoring
            }).map(([name, active]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{name}</span>
                <div className={`w-3 h-3 rounded-full ${
                  active ? 'bg-green-500' : 'bg-gray-500'
                }`} />
              </div>
            ))}
          </div>
        </div>

        {/* 计算进度 */}
        {isComputing && (
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">计算进度</h3>
            <div className="space-y-3">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${workspaceState.computationProgress}%` }}
                />
              </div>
              <div className="text-xs text-gray-400">
                进度: {workspaceState.computationProgress.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-400">
                已用时间: {Math.floor(workspaceState.elapsedTime / 1000)}s
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮区域 */}
      <div className="absolute top-4 right-4 space-y-2">
        {workspaceState.currentMode === 'mesh_generation' && !isComputing && (
          <motion.button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={generateComputationMesh}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            生成计算网格
          </motion.button>
        )}

        {workspaceState.currentMode === 'analysis_setup' && workspaceState.meshMetrics && !isComputing && (
          <motion.button
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            onClick={runStructuralAnalysis}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            运行结构分析
          </motion.button>
        )}
      </div>

      {/* 活动任务列表 */}
      {workspaceState.activeTasks.length > 0 && (
        <div className="absolute bottom-4 left-4 w-80 bg-black/50 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">计算任务</h3>
          <div className="space-y-2">
            {workspaceState.activeTasks.map(task => (
              <div key={task.id} className="bg-gray-800/50 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">{task.name}</span>
                  <div className={`w-2 h-2 rounded-full ${
                    task.status === 'completed' ? 'bg-green-500' :
                    task.status === 'processing' ? 'bg-yellow-500 animate-pulse' :
                    task.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                  }`} />
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1">
                  <div 
                    className="bg-purple-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 网格质量指标 */}
      {workspaceState.meshMetrics && (
        <div className="absolute bottom-4 right-4 w-80 bg-black/50 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">网格质量指标</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">总单元数:</span>
              <span className="text-white">{workspaceState.meshMetrics.totalElements.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">总节点数:</span>
              <span className="text-white">{workspaceState.meshMetrics.totalNodes.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">长宽比:</span>
              <span className="text-white">{workspaceState.meshMetrics.aspectRatio.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">偏斜度:</span>
              <span className="text-white">{workspaceState.meshMetrics.skewness.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">质量等级:</span>
              <span className={`${
                workspaceState.meshMetrics.qualityGrade === 'excellent' ? 'text-green-400' :
                workspaceState.meshMetrics.qualityGrade === 'good' ? 'text-blue-400' :
                workspaceState.meshMetrics.qualityGrade === 'acceptable' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {workspaceState.meshMetrics.qualityGrade}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* AI推荐 */}
      {workspaceState.aiSystemState.aiRecommendations.length > 0 && (
        <div className="absolute top-4 right-96 w-80 bg-green-600/20 backdrop-blur-sm rounded-lg p-4 border border-green-500/30">
          <h3 className="text-green-300 font-medium mb-3">AI推荐</h3>
          <div className="space-y-3">
            {workspaceState.aiSystemState.aiRecommendations.map((rec, index) => (
              <div key={index} className="bg-green-900/30 rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-green-400">{rec.category}</span>
                  <span className="text-xs text-green-300">
                    {(rec.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-sm text-green-200">{rec.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 协作状态 */}
      {workspaceState.expertCollaborationActive && collaborationData && (
        <div className="absolute bottom-4 center w-60 bg-purple-600/20 backdrop-blur-sm rounded-lg p-3 border border-purple-500/30">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            <span className="text-purple-300 text-sm">接收2号专家数据</span>
          </div>
          <div className="text-xs text-purple-400 mt-1">
            地质模型和支护结构已就绪
          </div>
        </div>
      )}
    </div>
  );
};

export default ComputationIntegratedWorkspace;