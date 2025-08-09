/**
 * 网格生成模块（重构）
 * 使用统一布局组件。修复此前补丁导致的结构破坏与语法错误。
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { FunctionalIcons } from './icons/FunctionalIconsQuickFix';
import PyVistaResultsViewer from './PyVistaResultsViewer';
import {
  KratosElementConverter,
  MeshQualityCalculator,
  KratosModelData,
  KratosGeometryData
} from '../services';
import UnifiedModuleLayout from './ui/layout/UnifiedModuleLayout';
import Panel from './ui/layout/Panel';
import MetricCard from './ui/layout/MetricCard';
import './ui/layout/layout.css';

interface MeshGenerationParams {
  globalElementSize: number;
  minElementSize: number;
  maxElementSize: number;
  meshAlgorithm: 'Delaunay' | 'Frontal' | 'BAMG' | 'MeshAdapt';
  surfaceMeshing: boolean;
  volumeMeshing: boolean;
  adaptiveMeshing: boolean;
  refinementZones: Array<{
    region: string;
    elementSize: number;
    reason: string;
  }>;
  qualityThreshold: number;
}

interface MeshGenerationResult {
  success: boolean;
  meshId: string;
  geometry: Float32Array;
  topology: Uint32Array;
  nodeCoordinates: Float32Array;
  elementConnectivity: Uint32Array;
  qualityMetrics: {
    totalElements: number;
    totalNodes: number;
    memoryUsage: number;
    qualityDistribution: { excellent: number; good: number; acceptable: number; poor: number };
  };
  processingTime: number;
  warnings: string[];
  errors: string[];
  kratosData: any; // 使用具体类型 KratosGeometryData 但此处容忍 any 以兼容服务实现
  kratosQualityMetrics: any; // 计算器返回结构
  kratosModelData: KratosModelData;
}

interface Props {
  geometryData?: KratosGeometryData;
  workspaceWidth?: number;
  workspaceHeight?: number;
}

const MeshGenerationModule: React.FC<Props> = ({
  geometryData,
  workspaceWidth = 1200,
  workspaceHeight = 800
}) => {
  // 状态
  const [meshParams, setMeshParams] = useState<MeshGenerationParams>({
    globalElementSize: 5,
    minElementSize: 0.5,
    maxElementSize: 10,
    meshAlgorithm: 'Delaunay',
    surfaceMeshing: true,
    volumeMeshing: true,
    adaptiveMeshing: true,
    refinementZones: [
      { region: '基础边缘', elementSize: 2, reason: '结构应力集中区域' },
      { region: '关键节点', elementSize: 1.2, reason: '提高计算精度' }
    ],
    qualityThreshold: 0.7
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<string>('idle');
  const [meshResult, setMeshResult] = useState<MeshGenerationResult | null>(null);
  const [showPyVistaResults, setShowPyVistaResults] = useState(false);

  // Three.js refs
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number>();

  // 更新参数
  const updateMeshParams = (updates: Partial<MeshGenerationParams>) => {
    setMeshParams(prev => ({ ...prev, ...updates }));
  };

  // 初始化三维场景
  const init3DMeshScene = useCallback(() => {
    if (sceneRef.current) return; // 已初始化
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d1117');
    const camera = new THREE.PerspectiveCamera(50, workspaceWidth / workspaceHeight, 0.1, 2000);
    camera.position.set(120, 90, 120);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(workspaceWidth, workspaceHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    if (mountRef.current) mountRef.current.appendChild(renderer.domElement);

    // 灯光
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(100, 200, 150);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // 占位几何
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(60, 40, 60),
      new THREE.MeshPhongMaterial({ color: 0x1e3a8a, wireframe: true, opacity: 0.25, transparent: true })
    );
    scene.add(box);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();
  }, [workspaceWidth, workspaceHeight]);

  // 体积网格示例
  const createVolumeMeshVisualization = useCallback(async () => {
    if (!sceneRef.current) return;
    // 简化随机点云四面体示意
    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i < 600; i++) {
      const x = (Math.random() - 0.5) * 60;
      const y = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 60;
      positions.push(x, y, z);
    }
    for (let i = 0; i < positions.length - 9; i += 12) {
      indices.push(
        i / 3, (i + 3) / 3, (i + 6) / 3,
        i / 3, (i + 6) / 3, (i + 9) / 3,
        i / 3, (i + 3) / 3, (i + 9) / 3,
        (i + 3) / 3, (i + 6) / 3, (i + 9) / 3
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    const material = new THREE.MeshBasicMaterial({ color: 0x4488ff, wireframe: true, transparent: true, opacity: 0.35 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.type = 'volume_mesh';
    sceneRef.current.add(mesh);
  }, []);

  // 生成网格结果（模拟 + Kratos转换）
  const generateMeshResult = useCallback(async (): Promise<MeshGenerationResult> => {
    const totalElements = Math.floor(Math.random() * 50000 + 20000);
    const totalNodes = Math.floor(totalElements * 0.6);
    const geometry = new Float32Array(totalNodes * 3);
    const topology = new Uint32Array(totalElements * 4);
    const nodeCoordinates = new Float64Array(totalNodes * 3);
    const elementConnectivity = new Uint32Array(totalElements * 4);
    for (let i = 0; i < geometry.length; i++) {
      geometry[i] = Math.random() * 100 - 50;
      nodeCoordinates[i] = geometry[i];
    }
    const cellTypes = new Uint8Array(totalElements);
    let connectivityIndex = 0;
    for (let i = 0; i < totalElements; i++) {
      cellTypes[i] = 10; // VTK_TETRA
      for (let j = 0; j < 4; j++) {
        topology[connectivityIndex] = Math.floor(Math.random() * totalNodes);
        elementConnectivity[connectivityIndex] = topology[connectivityIndex];
        connectivityIndex++;
      }
    }
    const kratosData = KratosElementConverter.convertFromGenericMesh(
      nodeCoordinates,
      elementConnectivity,
      cellTypes
    );
  const kratosQualityMetrics = MeshQualityCalculator.calculateQualityMetrics(kratosData);
    const qualityMetrics = {
      totalElements,
      totalNodes,
      memoryUsage: Math.floor(totalElements * 0.002),
      qualityDistribution: {
        excellent: Math.floor(totalElements * 0.3),
        good: Math.floor(totalElements * 0.5),
        acceptable: Math.floor(totalElements * 0.15),
        poor: Math.floor(totalElements * 0.05)
      }
    };
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
        ['雅可比值偏低，可能存在变形单元', '建议调整全局/局部单元尺寸'] :
        ['网格质量良好'],
      errors: kratosQualityMetrics.jacobian.min <= 0 ? ['存在负雅可比单元，请检查几何或网格参数'] : [],
      kratosData,
      kratosQualityMetrics,
      kratosModelData
    };
  }, []);

  // 启动网格生成流程
  const startMeshGeneration = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerationProgress(0);
    setCurrentStage('预处理');
    setMeshResult(null);

    const stagePlan: { name: string; target: number; delay: number }[] = [
      { name: '预处理', target: 15, delay: 400 },
      { name: '表面网格', target: 35, delay: 600 },
      { name: '体积网格', target: 60, delay: 800 },
      { name: '质量评估', target: 80, delay: 700 },
      { name: 'Kratos转换', target: 92, delay: 500 },
      { name: '完成', target: 100, delay: 300 }
    ];

    for (const stage of stagePlan) {
      setCurrentStage(stage.name);
      await new Promise(r => setTimeout(r, stage.delay));
      setGenerationProgress(stage.target);
      if (stage.name === '体积网格') await createVolumeMeshVisualization();
    }
    const result = await generateMeshResult();
    setMeshResult(result);
    setCurrentStage('完成');
    setIsGenerating(false);
  }, [isGenerating, createVolumeMeshVisualization, generateMeshResult]);

  // 初始化 & 清理
  useEffect(() => {
    init3DMeshScene();
    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [init3DMeshScene]);

  // 导出函数
  const exportKratos = () => {
    if (!meshResult?.kratosModelData) return;
    const exportData = {
      mesh: meshResult.kratosData,
      model: meshResult.kratosModelData,
      quality: meshResult.kratosQualityMetrics
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kratos_mesh_${meshResult.meshId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <UnifiedModuleLayout
      left={<>
        <Panel
          title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FunctionalIcons.MeshGeneration size={16} /> 网格生成</span>}
          subtitle={<span>Kratos + PyVista · 参数驱动</span>}
          footer={<span>阶段: {currentStage === 'idle' ? '等待开始' : currentStage}</span>}
        >
          <div>
            <label className="text-sm block mb-1">全局单元尺寸: {meshParams.globalElementSize}m</label>
            <input type="range" min={0.5} max={10} step={0.1} value={meshParams.globalElementSize}
              onChange={e => updateMeshParams({ globalElementSize: parseFloat(e.target.value) })}
              disabled={isGenerating} />
          </div>
          <div>
            <label className="text-sm block mb-1">网格算法</label>
            <select value={meshParams.meshAlgorithm} onChange={e => updateMeshParams({ meshAlgorithm: e.target.value as any })} disabled={isGenerating}>
              <option value="Delaunay">Delaunay</option>
              <option value="Frontal">Frontal</option>
              <option value="BAMG">BAMG</option>
              <option value="MeshAdapt">MeshAdapt</option>
            </select>
          </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={meshParams.surfaceMeshing} onChange={e => updateMeshParams({ surfaceMeshing: e.target.checked })} disabled={isGenerating} /> 表面</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={meshParams.volumeMeshing} onChange={e => updateMeshParams({ volumeMeshing: e.target.checked })} disabled={isGenerating} /> 体积</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={meshParams.adaptiveMeshing} onChange={e => updateMeshParams({ adaptiveMeshing: e.target.checked })} disabled={isGenerating} /> 自适应</label>
            </div>
          <motion.button className="dc-primary" onClick={startMeshGeneration} disabled={isGenerating || !geometryData}
            whileHover={{ scale: isGenerating ? 1 : 1.02 }} whileTap={{ scale: isGenerating ? 1 : 0.97 }}>
            {isGenerating ? '生成中...' : '开始网格生成'}
          </motion.button>
          {meshResult && !isGenerating && (
            <motion.button className="dc-primary" style={{ background: 'linear-gradient(90deg,#7e22ce,#9333ea)' }}
              onClick={() => setShowPyVistaResults(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FunctionalIcons.ResultVisualization size={16} /> PyVista结果</span>
            </motion.button>
          )}
          {meshResult?.kratosModelData && !isGenerating && (
            <motion.button className="dc-primary" style={{ background: 'linear-gradient(90deg,#16a34a,#22c55e)' }}
              onClick={exportKratos} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FunctionalIcons.ResultVisualization size={16} /> 导出Kratos数据</span>
            </motion.button>
          )}
        </Panel>
        <Panel title="网格细化区域" dense>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {meshParams.refinementZones.map((zone, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span>{zone.region}</span><span style={{ opacity: .7 }}>{zone.elementSize}m</span></div>
                <div style={{ fontSize: 11, marginTop: 2, opacity: .6 }}>{zone.reason}</div>
              </div>
            ))}
          </div>
        </Panel>
      </>}
      right={meshResult && (
        <Panel title="质量指标" subtitle={meshResult.kratosData ? <span style={{ color: '#22c55e' }}>Kratos就绪</span> : undefined}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <MetricCard accent="blue" label="单元" value={meshResult.qualityMetrics.totalElements.toLocaleString()} />
            <MetricCard accent="purple" label="节点" value={meshResult.qualityMetrics.totalNodes.toLocaleString()} />
            <MetricCard accent="green" label="时间" value={`${meshResult.processingTime.toFixed(1)}s`} />
            <MetricCard accent="orange" label="内存" value={`${meshResult.qualityMetrics.memoryUsage}MB`} />
          </div>
          <div style={{ marginTop: 10, fontSize: 11, opacity: .7 }}>质量分布</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            {['excellent', 'good', 'acceptable', 'poor'].map((k, i) => {
              const colors = ['#16a34a', '#2563eb', '#f59e0b', '#dc2626'];
              // @ts-ignore
              const val = meshResult.qualityMetrics.qualityDistribution[k];
              return <div key={k} style={{ flex: val, background: colors[i], height: 6, borderRadius: 2 }} title={`${k}:${val}`} />;
            })}
          </div>
          {(meshResult.warnings.length > 0 || meshResult.errors.length > 0) && (
            <div style={{ marginTop: 12 }}>
              {meshResult.errors.map((e, i) => (<div key={i} style={{ color: '#f87171', fontSize: 11 }}>错误: {e}</div>))}
              {meshResult.warnings.map((w, i) => (<div key={i} style={{ color: '#fbbf24', fontSize: 11 }}>警告: {w}</div>))}
            </div>
          )}
        </Panel>
      )}
    >
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {isGenerating && (
        <div style={{ position: 'absolute', top: 16, right: 16, width: 300 }}>
          <Panel title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FunctionalIcons.MeshGeneration size={16} /> 生成进度</span>} dense>
            <div style={{ fontSize: 12, marginBottom: 6 }}>{currentStage}</div>
            <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${generationProgress}%`, height: '100%', background: 'linear-gradient(90deg,#2563eb,#6366f1)' }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, opacity: .7, marginTop: 4 }}>{generationProgress.toFixed(1)}%</div>
          </Panel>
        </div>
      )}
      <AnimatePresence>
        {showPyVistaResults && meshResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 z-50">
            <div className="relative w-full h-full">
              <motion.button className="absolute top-4 right-4 z-10 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                onClick={() => setShowPyVistaResults(false)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <FunctionalIcons.InterfaceDesign size={20} />
              </motion.button>
              <PyVistaResultsViewer meshData={meshResult} computationData={geometryData}
                onVisualizationUpdate={s => console.log('PyVista状态更新:', s)}
                workspaceWidth={workspaceWidth} workspaceHeight={workspaceHeight} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </UnifiedModuleLayout>
  );
};

export default MeshGenerationModule;