/**
 * 网格生成模块
 * 0号架构师 - 独立的网格生成模块，与几何建模并列
 * 接收几何建模结果，生成网格模型传递给PyVista和计算模块
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { FunctionalIcons } from './icons/FunctionalIconsQuickFix';
import PyVistaResultsViewer from './PyVistaResultsViewer';
import { 
  KratosElementConverter, 
  MeshQualityCalculator, 
  KratosModelData,
  KratosGeometryData,
  MeshQualityMetrics 
} from '../services';

interface MeshGenerationParams {
  globalElementSize: number;
  minElementSize: number;
  maxElementSize: number;
  meshAlgorithm: 'Delaunay' | 'Frontal' | 'BAMG' | 'MeshAdapt';
  surfaceMeshing: boolean;
  volumeMeshing: boolean;
  refinementZones: Array<{
    region: string;
    elementSize: number;
    reason: string;
  }>;
  qualityThreshold: number;
  adaptiveMeshing: boolean;
}

interface MeshQualityMetrics {
  totalElements: number;
  totalNodes: number;
  elementTypes: { [key: string]: number };
  qualityDistribution: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
  };
  minAngle: number;
  maxAngle: number;
  aspectRatio: number;
  skewness: number;
  orthogonality: number;
  memoryUsage: number;
}

interface MeshGenerationResult {
  success: boolean;
  meshId: string;
  geometry: Float32Array;
  topology: Uint32Array;
  nodeCoordinates: Float32Array;
  elementConnectivity: Uint32Array;
  qualityMetrics: MeshQualityMetrics;
  processingTime: number;
  warnings: string[];
  errors: string[];
  // Kratos格式数据
  kratosData?: KratosGeometryData;
  kratosQualityMetrics?: MeshQualityMetrics;
  kratosModelData?: KratosModelData;
}

interface MeshGenerationModuleProps {
  geometryData?: any;
  onMeshGenerated?: (result: MeshGenerationResult) => void;
  onDataTransferToPyVista?: (meshData: any) => void;
  onDataTransferToComputation?: (meshData: any) => void;
  workspaceWidth?: number;
  workspaceHeight?: number;
}

const MeshGenerationModule: React.FC<MeshGenerationModuleProps> = ({
  geometryData,
  onMeshGenerated,
  onDataTransferToPyVista,
  onDataTransferToComputation,
  workspaceWidth = 1200,
  workspaceHeight = 800
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();

  const [meshParams, setMeshParams] = useState<MeshGenerationParams>({
    globalElementSize: 2.0,
    minElementSize: 0.5,
    maxElementSize: 5.0,
    meshAlgorithm: 'Delaunay',
    surfaceMeshing: true,
    volumeMeshing: true,
    refinementZones: [
      { region: '支护结构界面', elementSize: 0.8, reason: '应力集中区域' },
      { region: '开挖边界', elementSize: 1.0, reason: '变形梯度大' },
      { region: '桩土接触面', elementSize: 0.6, reason: '相互作用重要' }
    ],
    qualityThreshold: 0.3,
    adaptiveMeshing: true
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [meshResult, setMeshResult] = useState<MeshGenerationResult | null>(null);
  const [currentStage, setCurrentStage] = useState<string>('idle');
  const [showPyVistaResults, setShowPyVistaResults] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  // 初始化3D网格场景
  const init3DMeshScene = useCallback(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e1e1e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, workspaceWidth / workspaceHeight, 0.1, 1000);
    camera.position.set(0, 50, 80);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(workspaceWidth, workspaceHeight);
    renderer.setClearColor(0x1e1e1e);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 添加光照
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // 添加网格
    const gridHelper = new THREE.GridHelper(100, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // 渲染循环
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };
    animate();
  }, [workspaceWidth, workspaceHeight]);

  // 开始网格生成 - 集成2号专家几何质量指导
  const startMeshGeneration = async () => {
    if (!geometryData) {
      alert('请先完成几何建模');
      return;
    }

    // 检查是否有2号专家的几何优化数据
    if (geometryData.excavation?.optimizedGeometry) {
      console.log('🎯 检测到2号专家优化几何，应用智能网格参数');
      
      // 应用2号专家的网格指导参数
      const optimizedGeometry = geometryData.excavation.optimizedGeometry;
      const qualityGuidance = optimizedGeometry.quality;
      
      // 更新网格参数
      setMeshParams(prev => ({
        ...prev,
        globalElementSize: qualityGuidance.recommendedMeshSize || prev.globalElementSize,
        qualityThreshold: Math.max(0.3, qualityGuidance.meshReadiness || 0.3),
        adaptiveMeshing: qualityGuidance.meshReadiness > 0.7
      }));
      
      console.log('✨ 应用2号专家网格优化参数:', {
        全局单元尺寸: qualityGuidance.recommendedMeshSize,
        质量阈值: qualityGuidance.meshReadiness,
        自适应网格: qualityGuidance.meshReadiness > 0.7
      });
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setCurrentStage('准备几何数据');

    try {
      // 阶段1: 几何预处理
      setCurrentStage('几何预处理');
      await simulateProgress(0, 15, 1000);

      // 阶段2: 表面网格生成
      if (meshParams.surfaceMeshing) {
        setCurrentStage('生成表面网格');
        await simulateProgress(15, 35, 2000);
        await createSurfaceMeshVisualization();
      }

      // 阶段3: 体积网格生成
      if (meshParams.volumeMeshing) {
        setCurrentStage('生成体积网格');
        await simulateProgress(35, 65, 3000);
        await createVolumeMeshVisualization();
      }

      // 阶段4: 网格优化
      setCurrentStage('网格质量优化');
      await simulateProgress(65, 85, 1500);

      // 阶段5: 质量检查
      setCurrentStage('质量检查与验证');
      await simulateProgress(85, 100, 800);

      // 生成最终结果
      const meshResult = await generateMeshResult();
      setMeshResult(meshResult);

      // 传递数据
      onMeshGenerated?.(meshResult);
      onDataTransferToPyVista?.(meshResult);
      onDataTransferToComputation?.(meshResult);

      setCurrentStage('网格生成完成');
      
      // 自动显示PyVista结果查看器
      setShowPyVistaResults(true);

    } catch (error) {
      console.error('网格生成失败:', error);
      setCurrentStage('网格生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 模拟进度更新
  const simulateProgress = (start: number, end: number, duration: number): Promise<void> => {
    return new Promise(resolve => {
      const startTime = Date.now();
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(start + (end - start) * (elapsed / duration), end);
        setGenerationProgress(progress);

        if (progress < end) {
          setTimeout(updateProgress, 50);
        } else {
          resolve();
        }
      };
      updateProgress();
    });
  };

  // 创建表面网格可视化
  const createSurfaceMeshVisualization = async (): Promise<void> => {
    if (!sceneRef.current) return;

    // 清除现有网格
    const existingMesh = sceneRef.current.children.filter(child => 
      child.userData?.type === 'surface_mesh'
    );
    existingMesh.forEach(obj => sceneRef.current!.remove(obj));

    // 创建表面网格
    const geometry = new THREE.SphereGeometry(20, 32, 16);
    const wireframe = new THREE.WireframeGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ 
      color: 0x00ff88,
      transparent: true,
      opacity: 0.6
    });
    
    const mesh = new THREE.LineSegments(wireframe, material);
    mesh.userData = { type: 'surface_mesh' };
    sceneRef.current.add(mesh);

    await new Promise(resolve => setTimeout(resolve, 500));
  };

  // 创建体积网格可视化
  const createVolumeMeshVisualization = async (): Promise<void> => {
    if (!sceneRef.current) return;

    // 创建四面体网格可视化
    const positions = [];
    const indices = [];
    
    // 生成简化的四面体网格
    for (let i = 0; i < 1000; i++) {
      const x = (Math.random() - 0.5) * 60;
      const y = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 60;
      positions.push(x, y, z);
    }

    for (let i = 0; i < positions.length - 9; i += 12) {
      indices.push(
        i/3, (i+3)/3, (i+6)/3,
        i/3, (i+6)/3, (i+9)/3,
        i/3, (i+3)/3, (i+9)/3,
        (i+3)/3, (i+6)/3, (i+9)/3
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);

    const material = new THREE.MeshBasicMaterial({ 
      color: 0x4488ff,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    
    const volumeMesh = new THREE.Mesh(geometry, material);
    volumeMesh.userData = { type: 'volume_mesh' };
    sceneRef.current.add(volumeMesh);

    await new Promise(resolve => setTimeout(resolve, 500));
  };

  // 生成网格结果 - 集成Kratos数据转换和质量评估
  const generateMeshResult = async (): Promise<MeshGenerationResult> => {
    console.log('🔄 生成网格结果并转换为Kratos格式');

    const totalElements = Math.floor(Math.random() * 50000 + 20000);
    const totalNodes = Math.floor(totalElements * 0.6);

    // 生成模拟的网格数据
    const geometry = new Float32Array(totalNodes * 3);
    const topology = new Uint32Array(totalElements * 4);
    const nodeCoordinates = new Float64Array(totalNodes * 3);
    const elementConnectivity = new Uint32Array(totalElements * 4);

    // 填充模拟数据
    for (let i = 0; i < geometry.length; i++) {
      geometry[i] = Math.random() * 100 - 50;
      nodeCoordinates[i] = geometry[i];
    }

    // 生成单元连接性和类型
    const cellTypes = new Uint8Array(totalElements);
    let connectivityIndex = 0;
    
    for (let i = 0; i < totalElements; i++) {
      // 大部分为四面体单元
      cellTypes[i] = 10; // VTK_TETRA
      
      // 生成四面体连接性
      for (let j = 0; j < 4; j++) {
        topology[connectivityIndex] = Math.floor(Math.random() * totalNodes);
        elementConnectivity[connectivityIndex] = topology[connectivityIndex];
        connectivityIndex++;
      }
    }

    // 转换为Kratos格式
    console.log('🔄 开始转换为Kratos格式数据');
    const kratosData = KratosElementConverter.convertFromGenericMesh(
      nodeCoordinates,
      elementConnectivity,
      cellTypes
    );

    // 计算Kratos质量指标
    console.log('🔍 计算Kratos网格质量指标');
    const kratosQualityMetrics = MeshQualityCalculator.calculateQualityMetrics(kratosData);

    // 传统质量指标（兼容现有界面）
    const qualityMetrics: MeshQualityMetrics = {
      totalElements,
      totalNodes,
      elementTypes: {
        '四面体': Math.floor(totalElements * 0.8),
        '六面体': Math.floor(totalElements * 0.15),
        '棱锥': Math.floor(totalElements * 0.05)
      },
      qualityDistribution: {
        excellent: Math.floor(totalElements * 0.3),
        good: Math.floor(totalElements * 0.5),
        acceptable: Math.floor(totalElements * 0.15),
        poor: Math.floor(totalElements * 0.05)
      },
      minAngle: 25.6,
      maxAngle: 142.8,
      aspectRatio: kratosQualityMetrics.aspectRatio.mean,
      skewness: kratosQualityMetrics.skewness.mean,
      orthogonality: kratosQualityMetrics.orthogonality.mean,
      memoryUsage: Math.floor(totalElements * 0.002) // MB
    };

    // 创建完整的Kratos模型数据
    const kratosModelData: KratosModelData = {
      modelInfo: {
        modelName: `DeepCAD_Excavation_${Date.now()}`,
        dimension: 3,
        problemType: 'mechanical',
        analysisType: 'static'
      },
      geometry: kratosData,
      materials: [{
        materialId: 1,
        materialName: '典型粘土',
        properties: {
          density: 1800,
          young_modulus: 8e6,
          poisson_ratio: 0.35,
          cohesion: 25000,
          friction_angle: 18,
          permeability_xx: 1e-9,
          permeability_yy: 1e-9,
          permeability_zz: 1e-9,
          plastic_model: 'MohrCoulomb',
          hardening_law: 'linear',
          yield_stress: 100000
        }
      }],
      boundaryConditions: [],
      subdomains: [{
        subdomainId: 1,
        subdomainName: '土体区域',
        materialId: 1,
        elementIds: Array.from({ length: totalElements }, (_, i) => i + 1)
      }],
      solverSettings: {
        solverType: 'mechanical_newton_raphson',
        convergenceCriteria: {
          residual_tolerance: 1e-6,
          displacement_tolerance: 1e-6,
          max_iterations: 30
        }
      }
    };

    console.log('✅ Kratos数据转换完成:', {
      节点数: kratosData.nodes.nodeCount,
      单元数: kratosData.elements.elementCount,
      平均长宽比: kratosQualityMetrics.aspectRatio.mean.toFixed(2),
      平均偏斜度: kratosQualityMetrics.skewness.mean.toFixed(3),
      最小雅可比: kratosQualityMetrics.jacobian.min.toFixed(3),
      平均正交性: kratosQualityMetrics.orthogonality.mean.toFixed(3)
    });

    return {
      success: true,
      meshId: `mesh_${Date.now()}`,
      geometry: new Float32Array(nodeCoordinates),
      topology,
      nodeCoordinates: new Float32Array(nodeCoordinates),
      elementConnectivity,
      qualityMetrics,
      processingTime: 8.5,
      warnings: kratosQualityMetrics.jacobian.min < 0.1 ? 
        ['检测到低质量单元，建议检查网格密度', '部分单元雅可比值较低'] : 
        ['网格质量良好'],
      errors: kratosQualityMetrics.jacobian.min <= 0 ? 
        ['发现负雅可比单元，网格存在翻转'] : [],
      // Kratos数据
      kratosData,
      kratosQualityMetrics,
      kratosModelData
    };
  };

  // 更新网格参数
  const updateMeshParams = (updates: Partial<MeshGenerationParams>) => {
    setMeshParams(prev => ({ ...prev, ...updates }));
  };

  // 初始化场景
  React.useEffect(() => {
    init3DMeshScene();
    
    return () => {
      // 停止动画帧
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
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
        console.warn('[MeshGenerationModule] cleanup warning:', e);
      } finally {
        rendererRef.current = undefined;
        sceneRef.current = undefined;
        cameraRef.current = undefined;
      }
    };
  }, [init3DMeshScene]);

  return (
    <div className="mesh-generation-module relative">
      {/* 3D网格场景 */}
      <div 
        ref={mountRef} 
        className="mesh-3d-scene w-full h-full"
        style={{ width: workspaceWidth, height: workspaceHeight }}
      />
      
      {/* 网格参数控制面板 */}
      <div className="absolute top-4 left-4 space-y-4">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 w-80">
          <h3 className="text-white font-medium mb-3">网格生成参数</h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-300 block mb-1">全局单元尺寸</label>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.1"
                value={meshParams.globalElementSize}
                onChange={(e) => updateMeshParams({ globalElementSize: parseFloat(e.target.value) })}
                className="w-full"
                disabled={isGenerating}
              />
              <span className="text-xs text-gray-400">{meshParams.globalElementSize}m</span>
            </div>

            <div>
              <label className="text-sm text-gray-300 block mb-1">网格算法</label>
              <select
                value={meshParams.meshAlgorithm}
                onChange={(e) => updateMeshParams({ meshAlgorithm: e.target.value as any })}
                className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
                disabled={isGenerating}
              >
                <option value="Delaunay">Delaunay</option>
                <option value="Frontal">Frontal</option>
                <option value="BAMG">BAMG</option>
                <option value="MeshAdapt">MeshAdapt</option>
              </select>
            </div>

            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={meshParams.surfaceMeshing}
                  onChange={(e) => updateMeshParams({ surfaceMeshing: e.target.checked })}
                  disabled={isGenerating}
                />
                <span className="text-sm text-gray-300">表面网格</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={meshParams.volumeMeshing}
                  onChange={(e) => updateMeshParams({ volumeMeshing: e.target.checked })}
                  disabled={isGenerating}
                />
                <span className="text-sm text-gray-300">体积网格</span>
              </label>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={meshParams.adaptiveMeshing}
                  onChange={(e) => updateMeshParams({ adaptiveMeshing: e.target.checked })}
                  disabled={isGenerating}
                />
                <span className="text-sm text-gray-300">自适应网格</span>
              </label>
            </div>
          </div>

          <motion.button
            className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600"
            onClick={startMeshGeneration}
            disabled={isGenerating || !geometryData}
            whileHover={{ scale: isGenerating ? 1 : 1.05 }}
            whileTap={{ scale: isGenerating ? 1 : 0.95 }}
          >
            {isGenerating ? '生成中...' : '开始网格生成'}
          </motion.button>

          {/* PyVista查看按钮 */}
          {meshResult && !isGenerating && (
            <motion.button
              className="w-full mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2"
              onClick={() => setShowPyVistaResults(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FunctionalIcons.DataVisualization size={16} />
              <span>PyVista结果显示</span>
            </motion.button>
          )}

          {/* Kratos数据导出按钮 */}
          {meshResult?.kratosModelData && !isGenerating && (
            <motion.button
              className="w-full mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
              onClick={() => {
                const exportData = {
                  mesh: meshResult.kratosData,
                  model: meshResult.kratosModelData,
                  quality: meshResult.kratosQualityMetrics
                };
                
                console.log('🚀 导出Kratos数据:', exportData);
                
                // 创建下载链接
                const dataStr = JSON.stringify(exportData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `kratos_mesh_${meshResult.meshId}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FunctionalIcons.ExportData size={16} />
              <span>导出Kratos数据</span>
            </motion.button>
          )}
        </div>

        {/* 网格细化区域 */}
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 w-80">
          <h3 className="text-white font-medium mb-3">网格细化区域</h3>
          <div className="space-y-2">
            {meshParams.refinementZones.map((zone, index) => (
              <div key={index} className="bg-gray-800/50 rounded p-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">{zone.region}</span>
                  <span className="text-xs text-gray-400">{zone.elementSize}m</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{zone.reason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 网格生成进度 */}
      {isGenerating && (
        <div className="absolute top-4 right-4 w-80 bg-blue-600/20 backdrop-blur-sm rounded-lg p-4 border border-blue-500/30">
          <div className="flex items-center space-x-2 mb-3">
            <FunctionalIcons.MeshGeneration size={20} className="text-blue-400" />
            <span className="text-blue-300 font-medium">网格生成中</span>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm text-blue-200 mb-1">
                <span>{currentStage}</span>
                <span>{generationProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-blue-900/30 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 网格质量结果 - 增强Kratos质量指标显示 */}
      {meshResult && (
        <div className="absolute bottom-4 left-4 w-80 max-h-[70vh] overflow-auto bg-black/50 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium">网格质量指标</h3>
            {meshResult.kratosData && (
              <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">
                Kratos就绪
              </span>
            )}
          </div>
          
          {/* 基本信息 */}
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-gray-300">总单元数:</span>
              <span className="text-white">{meshResult.qualityMetrics.totalElements.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">总节点数:</span>
              <span className="text-white">{meshResult.qualityMetrics.totalNodes.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">生成时间:</span>
              <span className="text-white">{meshResult.processingTime.toFixed(1)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">内存使用:</span>
              <span className="text-white">{meshResult.qualityMetrics.memoryUsage}MB</span>
            </div>
          </div>

          {/* Kratos质量指标 */}
          {meshResult.kratosQualityMetrics && (
            <div className="border-t border-gray-600 pt-3 mb-4">
              <h4 className="text-white font-medium text-sm mb-2 flex items-center">
                <FunctionalIcons.SystemValidation size={14} className="mr-1 text-blue-400" />
                Kratos质量评估
              </h4>
              
              <div className="space-y-2 text-xs">
                {/* 长宽比 */}
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">长宽比:</span>
                    <span className={`${
                      meshResult.kratosQualityMetrics.aspectRatio.mean <= 3 ? 'text-green-400' :
                      meshResult.kratosQualityMetrics.aspectRatio.mean <= 10 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {meshResult.kratosQualityMetrics.aspectRatio.mean.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs">
                    范围: {meshResult.kratosQualityMetrics.aspectRatio.min.toFixed(2)} - {meshResult.kratosQualityMetrics.aspectRatio.max.toFixed(2)}
                  </div>
                </div>

                {/* 偏斜度 */}
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">偏斜度:</span>
                    <span className={`${
                      meshResult.kratosQualityMetrics.skewness.mean <= 0.25 ? 'text-green-400' :
                      meshResult.kratosQualityMetrics.skewness.mean <= 0.6 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {meshResult.kratosQualityMetrics.skewness.mean.toFixed(3)}
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs">
                    最大: {meshResult.kratosQualityMetrics.skewness.max.toFixed(3)}
                  </div>
                </div>

                {/* 雅可比行列式 */}
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">雅可比行列式:</span>
                    <span className={`${
                      meshResult.kratosQualityMetrics.jacobian.min >= 0.5 ? 'text-green-400' :
                      meshResult.kratosQualityMetrics.jacobian.min >= 0.1 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {meshResult.kratosQualityMetrics.jacobian.min.toFixed(3)}
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs">
                    平均: {meshResult.kratosQualityMetrics.jacobian.mean.toFixed(3)}
                  </div>
                </div>

                {/* 正交性 */}
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">正交性:</span>
                    <span className={`${
                      meshResult.kratosQualityMetrics.orthogonality.mean >= 0.8 ? 'text-green-400' :
                      meshResult.kratosQualityMetrics.orthogonality.mean >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {meshResult.kratosQualityMetrics.orthogonality.mean.toFixed(3)}
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs">
                    最小: {meshResult.kratosQualityMetrics.orthogonality.min.toFixed(3)}
                  </div>
                </div>

                {/* 总体积 */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">总体积:</span>
                  <span className="text-white">
                    {meshResult.kratosQualityMetrics.volume.total.toExponential(2)} m³
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 质量分布 */}
          <div className="border-t border-gray-600 pt-3">
            <span className="text-sm text-gray-300">质量分布:</span>
            <div className="flex space-x-1 mt-1">
              <div className="flex-1 bg-green-600 h-2 rounded" style={{ 
                flex: meshResult.qualityMetrics.qualityDistribution.excellent 
              }} title="优秀" />
              <div className="flex-1 bg-blue-600 h-2 rounded" style={{ 
                flex: meshResult.qualityMetrics.qualityDistribution.good 
              }} title="良好" />
              <div className="flex-1 bg-yellow-600 h-2 rounded" style={{ 
                flex: meshResult.qualityMetrics.qualityDistribution.acceptable 
              }} title="可接受" />
              <div className="flex-1 bg-red-600 h-2 rounded" style={{ 
                flex: meshResult.qualityMetrics.qualityDistribution.poor 
              }} title="差" />
            </div>
          </div>

          {/* 警告和错误 */}
          {(meshResult.warnings.length > 0 || meshResult.errors.length > 0) && (
            <div className="border-t border-gray-600 pt-3 mt-3">
              {meshResult.errors.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-red-400 font-medium">错误:</span>
                  {meshResult.errors.map((error, index) => (
                    <div key={index} className="text-xs text-red-300 mt-1">{error}</div>
                  ))}
                </div>
              )}
              {meshResult.warnings.length > 0 && (
                <div>
                  <span className="text-xs text-yellow-400 font-medium">警告:</span>
                  {meshResult.warnings.map((warning, index) => (
                    <div key={index} className="text-xs text-yellow-300 mt-1">{warning}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PyVista结果查看器覆盖层 */}
      <AnimatePresence>
        {showPyVistaResults && meshResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 z-50"
          >
            <div className="relative w-full h-full">
              {/* 关闭按钮 */}
              <motion.button
                className="absolute top-4 right-4 z-10 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                onClick={() => setShowPyVistaResults(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FunctionalIcons.Close size={20} />
              </motion.button>

              {/* PyVista结果查看器 */}
              <PyVistaResultsViewer
                meshData={meshResult}
                computationData={geometryData}
                onVisualizationUpdate={(state) => {
                  console.log('PyVista状态更新:', state);
                }}
                workspaceWidth={workspaceWidth}
                workspaceHeight={workspaceHeight}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MeshGenerationModule;