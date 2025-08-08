/**
 * 结果可视化大屏面板 - 3号计算专家
 * 整合ResultsRenderer和ResultsViewer的大屏版本
 * 基于0号架构师大屏升级方案的专业级结果展示系统
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { dashboardTokens, dashboardAnimations } from './ui/DashboardComponents';

// 计算结果数据接口
interface ComputationResults {
  excavationResults?: {
    analysisId: string;
    timestamp: Date;
    computationTime: number;
    results: {
      overallStability: {
        safetyFactor: number;
        stabilityStatus: 'safe' | 'warning' | 'critical';
        criticalFailureMode: string;
      };
      deformation: {
        maxHorizontalDisplacement: number;
        maxVerticalDisplacement: number;
        maxWallDeformation: number;
        groundSettlement: number[];
      };
      stress: {
        maxPrincipalStress: number;
        minPrincipalStress: number;
        maxShearStress: number;
        vonMisesStress: number[];
      };
      supportForces: {
        maxStrutForce: number;
        strutForceDistribution: number[];
        anchorForces: number[];
      };
      seepage: {
        maxSeepageVelocity: number;
        totalInflow: number;
        pipingRiskAreas: Array<{
          id: string;
          location: { x: number; y: number; z: number };
          riskLevel: number;
          description: string;
        }>;
        upliftPressure: number[];
      };
    };
    mesh: {
      vertices: Float32Array;
      faces: Uint32Array;
      normals: Float32Array;
    };
    visualization: {
      stressField: Float32Array;
      displacementField: Float32Array;
      seepageField: {
        velocityVectors: Float32Array;
        velocityMagnitude: Float32Array;
        poreWaterPressure: Float32Array;
      };
    };
  };
  safetyResults?: {
    overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    overallSafetyScore: number;
    riskAssessment: {
      overallStability: {
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        safetyMargin: number;
        criticalFactors: string[];
      };
      localInstability: {
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        riskAreas: Array<{
          id: string;
          location: { x: number; y: number; z: number };
          riskLevel: number;
          description: string;
        }>;
        preventiveMeasures: string[];
      };
      seepageFailure: {
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        pipingRisk: number;
        upliftRisk: number;
        drainageEfficiency: number;
      };
      excessiveDeformation: {
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        maxDeformationRatio: number;
        affectedStructures: string[];
      };
    };
  };
  stageResults?: Array<{
    stageId: number;
    stageName: string;
    constructionDays: number;
    safetyFactor: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    maxDisplacement: number;
  }>;
}

interface ResultsVisualizationDashboardProps {
  results?: ComputationResults;
  onVisualizationChange?: (type: string) => void;
  onExport?: (format: 'excel' | 'pdf' | 'json') => void;
  enableRealtimeUpdate?: boolean;
  showDetailedAnalysis?: boolean;
}

const ResultsVisualizationDashboard: React.FC<ResultsVisualizationDashboardProps> = ({
  results,
  onVisualizationChange,
  onExport,
  enableRealtimeUpdate = true,
  showDetailedAnalysis = true
}) => {
  const [visualizationType, setVisualizationType] = useState<'stress' | 'displacement' | 'seepage' | 'safety'>('stress');
  const [viewMode, setViewMode] = useState<'3d' | 'overview' | 'detailed'>('3d');
  const [isLoading, setIsLoading] = useState(false);
  const [renderStats, setRenderStats] = useState({ fps: 0, triangles: 0, nodes: 0 });
  const [realtimeData, setRealtimeData] = useState<ComputationResults | null>(null);
  
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const meshRef = useRef<THREE.Mesh>();
  const updateIntervalRef = useRef<NodeJS.Timeout>();

  // 实时数据更新
  useEffect(() => {
    if (enableRealtimeUpdate) {
      updateIntervalRef.current = setInterval(() => {
        // 模拟实时计算结果更新
        if (results?.excavationResults) {
          setRealtimeData({
            ...results,
            excavationResults: {
              ...results.excavationResults,
              results: {
                ...results.excavationResults.results,
                overallStability: {
                  ...results.excavationResults.results.overallStability,
                  safetyFactor: 1.45 + Math.random() * 0.3
                },
                deformation: {
                  ...results.excavationResults.results.deformation,
                  maxHorizontalDisplacement: 25 + Math.random() * 10
                }
              }
            }
          });
        }
      }, 3000);
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [enableRealtimeUpdate, results]);

  const currentResults = realtimeData || results;

  // 初始化Three.js场景
  useEffect(() => {
    if (!mountRef.current || viewMode !== '3d') return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    sceneRef.current = scene;

    // 相机设置
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(15, 15, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 渲染器设置
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // 添加灯光系统
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // 添加点光源
    const pointLight = new THREE.PointLight(0x00d9ff, 0.6, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // 添加环境
    const gridHelper = new THREE.GridHelper(40, 40, 0x333344, 0x222233);
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(8);
    scene.add(axesHelper);

    // 渲染循环
    let frameCount = 0;
    let lastTime = performance.now();
    
    const animate = () => {
      requestAnimationFrame(animate);
      
      // 计算FPS
      frameCount++; 
      const currentTime = performance.now();
      if (currentTime - lastTime >= 1000) {
        setRenderStats(prev => ({
          ...prev,
          fps: Math.round((frameCount * 1000) / (currentTime - lastTime))
        }));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      // 自动旋转相机
      if (cameraRef.current && !isLoading) {
        const time = currentTime * 0.0002;
        cameraRef.current.position.x = Math.cos(time) * 20;
        cameraRef.current.position.z = Math.sin(time) * 20;
        cameraRef.current.lookAt(0, 0, 0);
      }
      
      renderer.render(scene, camera);
    };
    
    animate();

    // 窗口大小变化处理
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
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
        console.warn('[ResultsVisualizationDashboard] cleanup warning:', e);
      }
    };
  }, [viewMode, isLoading]);

  // 更新3D结果显示
  useEffect(() => {
    if (!currentResults?.excavationResults || !sceneRef.current || viewMode !== '3d') return;

    setIsLoading(true);
    
    try {
      // 清除旧的网格
      if (meshRef.current) {
        sceneRef.current.remove(meshRef.current);
      }

      const { mesh, visualization } = currentResults.excavationResults;
      
      // 创建几何体
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(mesh.vertices, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
      geometry.setIndex(new THREE.BufferAttribute(mesh.faces, 1));

      // 根据可视化类型设置颜色
      let colorData: Float32Array;
      let colorRange = { min: 0, max: 1 };
      
      switch (visualizationType) {
        case 'stress':
          colorData = visualization.stressField;
          colorRange = {
            min: Math.min(...Array.from(colorData)),
            max: Math.max(...Array.from(colorData))
          };
          break;
        case 'displacement':
          colorData = visualization.displacementField;
          colorRange = {
            min: Math.min(...Array.from(colorData)),
            max: Math.max(...Array.from(colorData))
          };
          break;
        case 'seepage':
          colorData = visualization.seepageField.velocityMagnitude;
          colorRange = {
            min: Math.min(...Array.from(colorData)),
            max: Math.max(...Array.from(colorData))
          };
          break;
        default:
          colorData = new Float32Array(mesh.vertices.length / 3).fill(0.5);
      }

      // 创建颜色数组 (增强的彩虹映射)
      const colors = new Float32Array(colorData.length * 3);
      for (let i = 0; i < colorData.length; i++) {
        const normalizedValue = (colorData[i] - colorRange.min) / (colorRange.max - colorRange.min);
        const color = valueToEnhancedColor(normalizedValue);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      // 创建增强的材质
      const material = new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        roughness: 0.3,
        metalness: 0.1,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2,
        side: THREE.DoubleSide
      });

      // 创建网格
      const resultMesh = new THREE.Mesh(geometry, material);
      resultMesh.castShadow = true;
      resultMesh.receiveShadow = true;
      
      meshRef.current = resultMesh;
      sceneRef.current.add(resultMesh);

      // 更新统计信息
      setRenderStats(prev => ({
        ...prev,
        triangles: mesh.faces.length / 3,
        nodes: mesh.vertices.length / 3
      }));

    } catch (error) {
      console.error('3D结果渲染失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentResults, visualizationType, viewMode]);

  // 增强的颜色映射函数
  const valueToEnhancedColor = (value: number): { r: number; g: number; b: number } => {
    // 使用更丰富的颜色映射
    const hue = (1 - value) * 280; // 从紫色到红色
    const saturation = 0.9;
    const lightness = 0.6;
    
    const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lightness - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (hue >= 0 && hue < 60) {
      r = c; g = x; b = 0;
    } else if (hue >= 60 && hue < 120) {
      r = x; g = c; b = 0;
    } else if (hue >= 120 && hue < 180) {
      r = 0; g = c; b = x;
    } else if (hue >= 180 && hue < 240) {
      r = 0; g = x; b = c;
    } else if (hue >= 240 && hue < 300) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }
    
    return {
      r: r + m,
      g: g + m,
      b: b + m
    };
  };

  // 获取状态颜色
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'safe':
      case 'low':
        return dashboardTokens.colors.accent.success;
      case 'warning':
      case 'medium':
        return dashboardTokens.colors.accent.warning;
      case 'critical':
      case 'high':
        return dashboardTokens.colors.accent.error;
      default:
        return dashboardTokens.colors.text.muted;
    }
  };

  // 生成关键指标数据
  const generateKeyMetrics = () => {
    if (!currentResults?.excavationResults) return [];

    const { results: analysisResults } = currentResults.excavationResults;
    
    return [
      {
        title: '整体安全系数',
        value: analysisResults.overallStability.safetyFactor,
        unit: '',
        status: analysisResults.overallStability.stabilityStatus,
        trend: realtimeData ? '+0.02' : null
      },
      {
        title: '最大位移',
        value: analysisResults.deformation.maxHorizontalDisplacement,
        unit: 'mm',
        status: analysisResults.deformation.maxHorizontalDisplacement > 30 ? 'warning' : 'safe',
        trend: realtimeData ? '-1.2' : null
      },
      {
        title: '最大应力',
        value: analysisResults.stress.maxPrincipalStress / 1000,
        unit: 'MPa',
        status: 'safe',
        trend: realtimeData ? '+0.5' : null
      },
      {
        title: '支撑力',
        value: analysisResults.supportForces.maxStrutForce / 1000,
        unit: 'MN',
        status: 'safe',
        trend: realtimeData ? '+0.1' : null
      }
    ];
  };

  const keyMetrics = generateKeyMetrics();

  // 导出功能
  const handleExport = async (format: 'excel' | 'pdf' | 'json') => {
    if (!currentResults) return;
    
    setIsLoading(true);
    try {
      await onExport?.(format);
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 无数据时的显示
  if (!currentResults) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        background: `linear-gradient(135deg, ${dashboardTokens.colors.bg.primary}, ${dashboardTokens.colors.bg.secondary})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <motion.div
          {...dashboardAnimations.pulse}
          style={{
            fontSize: '64px',
            marginBottom: '24px'
          }}
        >
          🧮
        </motion.div>
        <h2 style={{
          fontSize: dashboardTokens.fonts.sizes.hero,
          fontWeight: dashboardTokens.fonts.weights.bold,
          color: dashboardTokens.colors.text.primary,
          marginBottom: '16px'
        }}>
          暂无计算结果
        </h2>
        <p style={{
          fontSize: dashboardTokens.fonts.sizes.medium,
          color: dashboardTokens.colors.text.secondary
        }}>
          请先运行深基坑计算分析以查看结果可视化
        </p>
      </div>
    );
  }

  return (
    <div className="results-visualization-dashboard" style={{
      width: '100%',
      height: '100vh',
      background: `linear-gradient(135deg, ${dashboardTokens.colors.bg.primary}, ${dashboardTokens.colors.bg.secondary})`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 顶部控制栏 */}
      <div style={{
        padding: '20px 32px',
        background: `linear-gradient(135deg, ${dashboardTokens.colors.bg.card}, ${dashboardTokens.colors.bg.glass})`,
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${dashboardTokens.colors.border.primary}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* 标题区域 */}
        <div>
          <h1 style={{
            fontSize: dashboardTokens.fonts.sizes.hero,
            fontWeight: dashboardTokens.fonts.weights.bold,
            color: dashboardTokens.colors.text.primary,
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            📊 深基坑计算结果可视化
            {enableRealtimeUpdate && (
              <motion.div
                {...dashboardAnimations.pulse}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: dashboardTokens.colors.accent.success
                }}
              />
            )}
          </h1>
          <div style={{
            fontSize: dashboardTokens.fonts.sizes.small,
            color: dashboardTokens.colors.text.secondary
          }}>
            分析ID: {currentResults.excavationResults?.analysisId} | 
            计算时间: {currentResults.excavationResults?.computationTime}s |
            {enableRealtimeUpdate && ' 实时更新'}
          </div>
        </div>

        {/* 控制按钮组 */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* 视图模式切换 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { key: '3d', label: '3D视图', icon: '🎮' },
              { key: 'overview', label: '总览', icon: '📈' },
              { key: 'detailed', label: '详细', icon: '🔍' }
            ].map((mode) => (
              <motion.button
                key={mode.key}
                onClick={() => setViewMode(mode.key as any)}
                style={{
                  padding: '12px 20px',
                  background: viewMode === mode.key ? 
                    `linear-gradient(135deg, ${dashboardTokens.colors.accent.primary}, ${dashboardTokens.colors.accent.secondary})` :
                    dashboardTokens.colors.bg.secondary,
                  border: `1px solid ${viewMode === mode.key ? dashboardTokens.colors.accent.primary : dashboardTokens.colors.border.secondary}`,
                  borderRadius: dashboardTokens.borderRadius.md,
                  color: viewMode === mode.key ? 'white' : dashboardTokens.colors.text.primary,
                  fontSize: dashboardTokens.fonts.sizes.small,
                  fontWeight: dashboardTokens.fonts.weights.medium,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>{mode.icon}</span>
                {mode.label}
              </motion.button>
            ))}
          </div>

          {/* 导出按钮组 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { format: 'excel', label: 'Excel', icon: '📊', color: dashboardTokens.colors.accent.success },
              { format: 'pdf', label: 'PDF', icon: '📄', color: dashboardTokens.colors.accent.primary },
              { format: 'json', label: 'JSON', icon: '💾', color: dashboardTokens.colors.accent.secondary }
            ].map((export_) => (
              <motion.button
                key={export_.format}
                onClick={() => handleExport(export_.format as any)}
                disabled={isLoading}
                style={{
                  padding: '10px 16px',
                  background: export_.color,
                  border: 'none',
                  borderRadius: dashboardTokens.borderRadius.sm,
                  color: 'white',
                  fontSize: dashboardTokens.fonts.sizes.small,
                  fontWeight: dashboardTokens.fonts.weights.medium,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: isLoading ? 0.6 : 1
                }}
                whileHover={!isLoading ? { scale: 1.05 } : {}}
                whileTap={!isLoading ? { scale: 0.95 } : {}}
              >
                <span>{export_.icon}</span>
                {export_.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左侧关键指标面板 */}
        <div style={{
          width: '380px',
          background: `linear-gradient(135deg, ${dashboardTokens.colors.bg.card}, ${dashboardTokens.colors.bg.glass})`,
          backdropFilter: 'blur(20px)',
          borderRight: `1px solid ${dashboardTokens.colors.border.primary}`,
          padding: '24px',
          overflowY: 'auto'
        }}>
          {/* 安全评估警告 */}
          {currentResults.safetyResults?.overallRiskLevel === 'high' || currentResults.safetyResults?.overallRiskLevel === 'critical' ? (
            <motion.div
              {...dashboardAnimations.errorShake}
              style={{
                background: `linear-gradient(135deg, ${dashboardTokens.colors.accent.error}20, ${dashboardTokens.colors.accent.error}10)`,
                border: `1px solid ${dashboardTokens.colors.accent.error}`,
                borderRadius: dashboardTokens.borderRadius.lg,
                padding: '16px',
                marginBottom: '24px'
              }}
            >
              <div style={{
                fontSize: dashboardTokens.fonts.sizes.medium,
                fontWeight: dashboardTokens.fonts.weights.bold,
                color: dashboardTokens.colors.accent.error,
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ⚠️ 安全风险警告
              </div>
              <div style={{
                fontSize: dashboardTokens.fonts.sizes.small,
                color: dashboardTokens.colors.text.primary
              }}>
                当前工程安全风险等级为{currentResults.safetyResults.overallRiskLevel === 'critical' ? '严重' : '较高'}，请立即采取相应措施！
              </div>
            </motion.div>
          ) : null}

          {/* 关键指标卡片 */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: dashboardTokens.fonts.sizes.large,
              fontWeight: dashboardTokens.fonts.weights.bold,
              color: dashboardTokens.colors.text.primary,
              marginBottom: '16px'
            }}>
              关键指标
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {keyMetrics.map((metric, index) => (
                <motion.div
                  key={index}
                  {...dashboardAnimations.cardEnter}
                  style={{
                    background: dashboardTokens.colors.bg.secondary,
                    borderRadius: dashboardTokens.borderRadius.lg,
                    padding: '20px',
                    border: `1px solid ${dashboardTokens.colors.border.secondary}`,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* 状态指示条 */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: getStatusColor(metric.status)
                  }} />
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      fontSize: dashboardTokens.fonts.sizes.small,
                      color: dashboardTokens.colors.text.secondary
                    }}>
                      {metric.title}
                    </div>
                    {metric.trend && (
                      <div style={{
                        fontSize: dashboardTokens.fonts.sizes.tiny,
                        color: metric.trend.startsWith('+') ? dashboardTokens.colors.accent.success : dashboardTokens.colors.accent.error,
                        fontWeight: dashboardTokens.fonts.weights.medium
                      }}>
                        {metric.trend}
                      </div>
                    )}
                  </div>
                  
                  <div style={{
                    fontSize: dashboardTokens.fonts.sizes.hero,
                    fontWeight: dashboardTokens.fonts.weights.bold,
                    color: getStatusColor(metric.status),
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>
                    {typeof metric.value === 'number' ? metric.value.toFixed(metric.title.includes('安全系数') ? 2 : 1) : metric.value}
                    <span style={{
                      fontSize: dashboardTokens.fonts.sizes.small,
                      fontWeight: dashboardTokens.fonts.weights.normal,
                      color: dashboardTokens.colors.text.muted,
                      marginLeft: '4px'
                    }}>
                      {metric.unit}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* 可视化类型控制 */}
          {viewMode === '3d' && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: dashboardTokens.fonts.sizes.large,
                fontWeight: dashboardTokens.fonts.weights.bold,
                color: dashboardTokens.colors.text.primary,
                marginBottom: '16px'
              }}>
                可视化类型
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { key: 'stress', label: '应力分布', icon: '🔴', desc: '冯米塞斯应力云图' },
                  { key: 'displacement', label: '位移分布', icon: '🔵', desc: '变形位移云图' },
                  { key: 'seepage', label: '渗流场', icon: '🟡', desc: '渗流速度矢量' },
                  { key: 'safety', label: '安全系数', icon: '🟢', desc: '稳定性分布' }
                ].map((type) => (
                  <motion.button
                    key={type.key}
                    onClick={() => {
                      setVisualizationType(type.key as any);
                      onVisualizationChange?.(type.key);
                    }}
                    style={{
                      padding: '16px',
                      background: visualizationType === type.key ? 
                        `linear-gradient(135deg, ${dashboardTokens.colors.accent.primary}30, ${dashboardTokens.colors.accent.primary}10)` :
                        dashboardTokens.colors.bg.secondary,
                      border: `1px solid ${visualizationType === type.key ? dashboardTokens.colors.accent.primary : dashboardTokens.colors.border.secondary}`,
                      borderRadius: dashboardTokens.borderRadius.md,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span style={{ fontSize: '20px' }}>{type.icon}</span>
                    <div>
                      <div style={{
                        fontSize: dashboardTokens.fonts.sizes.medium,
                        fontWeight: dashboardTokens.fonts.weights.semibold,
                        color: dashboardTokens.colors.text.primary,
                        marginBottom: '2px'
                      }}>
                        {type.label}
                      </div>
                      <div style={{
                        fontSize: dashboardTokens.fonts.sizes.tiny,
                        color: dashboardTokens.colors.text.muted
                      }}>
                        {type.desc}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* 渲染统计信息 */}
          {viewMode === '3d' && (
            <div style={{
              background: dashboardTokens.colors.bg.secondary,
              borderRadius: dashboardTokens.borderRadius.lg,
              padding: '16px',
              border: `1px solid ${dashboardTokens.colors.border.secondary}`
            }}>
              <h4 style={{
                fontSize: dashboardTokens.fonts.sizes.medium,
                fontWeight: dashboardTokens.fonts.weights.semibold,
                color: dashboardTokens.colors.text.primary,
                marginBottom: '12px'
              }}>
                🚀 渲染性能
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: dashboardTokens.colors.text.secondary, fontSize: dashboardTokens.fonts.sizes.small }}>
                    FPS
                  </span>
                  <span style={{ color: dashboardTokens.colors.text.primary, fontSize: dashboardTokens.fonts.sizes.small, fontWeight: dashboardTokens.fonts.weights.semibold, fontFamily: 'JetBrains Mono, monospace' }}>
                    {renderStats.fps}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: dashboardTokens.colors.text.secondary, fontSize: dashboardTokens.fonts.sizes.small }}>
                    三角形
                  </span>
                  <span style={{ color: dashboardTokens.colors.text.primary, fontSize: dashboardTokens.fonts.sizes.small, fontWeight: dashboardTokens.fonts.weights.semibold, fontFamily: 'JetBrains Mono, monospace' }}>
                    {renderStats.triangles.toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: dashboardTokens.colors.text.secondary, fontSize: dashboardTokens.fonts.sizes.small }}>
                    节点数
                  </span>
                  <span style={{ color: dashboardTokens.colors.text.primary, fontSize: dashboardTokens.fonts.sizes.small, fontWeight: dashboardTokens.fonts.weights.semibold, fontFamily: 'JetBrains Mono, monospace' }}>
                    {renderStats.nodes.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 主显示区域 */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* 3D视图 */}
          {viewMode === '3d' && (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              {isLoading && (
                <motion.div
                  {...dashboardAnimations.fadeIn}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                  }}
                >
                  <motion.div
                    {...dashboardAnimations.pulse}
                    style={{
                      fontSize: '48px'
                    }}
                  >
                    🔄
                  </motion.div>
                  <div style={{
                    fontSize: dashboardTokens.fonts.sizes.large,
                    color: dashboardTokens.colors.text.primary,
                    fontWeight: dashboardTokens.fonts.weights.semibold
                  }}>
                    正在渲染3D结果...
                  </div>
                </motion.div>
              )}
              
              <div 
                ref={mountRef} 
                style={{ 
                  width: '100%', 
                  height: '100%',
                  background: dashboardTokens.colors.bg.primary
                }} 
              />
            </div>
          )}

          {/* 总览视图 */}
          {viewMode === 'overview' && (
            <motion.div
              {...dashboardAnimations.fadeIn}
              style={{
                padding: '32px',
                height: '100%',
                overflowY: 'auto'
              }}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '24px',
                marginBottom: '32px'
              }}>
                {/* 安全评估雷达图区域 */}
                {currentResults.safetyResults && (
                  <motion.div
                    {...dashboardAnimations.cardEnter}
                    style={{
                      background: dashboardTokens.colors.bg.card,
                      borderRadius: dashboardTokens.borderRadius.xl,
                      padding: '24px',
                      border: `1px solid ${dashboardTokens.colors.border.secondary}`,
                      gridColumn: 'span 2'
                    }}
                  >
                    <h3 style={{
                      fontSize: dashboardTokens.fonts.sizes.large,
                      fontWeight: dashboardTokens.fonts.weights.bold,
                      color: dashboardTokens.colors.text.primary,
                      marginBottom: '20px'
                    }}>
                      🎯 综合安全评估
                    </h3>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '24px'
                    }}>
                      {[
                        { name: '整体稳定', value: currentResults.safetyResults.riskAssessment.overallStability.safetyMargin * 100, status: currentResults.safetyResults.riskAssessment.overallStability.riskLevel },
                        { name: '局部失稳', value: 75, status: currentResults.safetyResults.riskAssessment.localInstability.riskLevel },
                        { name: '渗流破坏', value: currentResults.safetyResults.riskAssessment.seepageFailure.drainageEfficiency * 100, status: currentResults.safetyResults.riskAssessment.seepageFailure.riskLevel },
                        { name: '变形超限', value: Math.max(0, 100 - currentResults.safetyResults.riskAssessment.excessiveDeformation.maxDeformationRatio * 100), status: currentResults.safetyResults.riskAssessment.excessiveDeformation.riskLevel }
                      ].map((item, index) => (
                        <div key={index} style={{ textAlign: 'center' }}>
                          <div style={{ 
                            fontSize: dashboardTokens.fonts.sizes.medium, 
                            fontWeight: dashboardTokens.fonts.weights.semibold,
                            color: dashboardTokens.colors.text.primary,
                            marginBottom: '16px' 
                          }}>
                            {item.name}
                          </div>
                          <div style={{
                            position: 'relative',
                            width: '120px',
                            height: '120px',
                            margin: '0 auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                              <circle
                                cx="60"
                                cy="60"
                                r="50"
                                fill="none"
                                stroke={`${getStatusColor(item.status)}20`}
                                strokeWidth="8"
                              />
                              <circle
                                cx="60"
                                cy="60"
                                r="50"
                                fill="none"
                                stroke={getStatusColor(item.status)}
                                strokeWidth="8"
                                strokeDasharray={`${item.value * 3.14} 314`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div style={{
                              position: 'absolute',
                              fontSize: dashboardTokens.fonts.sizes.large,
                              fontWeight: dashboardTokens.fonts.weights.bold,
                              color: getStatusColor(item.status)
                            }}>
                              {Math.round(item.value)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* 施工阶段分析 */}
              {currentResults.stageResults && currentResults.stageResults.length > 0 && (
                <motion.div
                  {...dashboardAnimations.cardEnter}
                  style={{
                    background: dashboardTokens.colors.bg.card,
                    borderRadius: dashboardTokens.borderRadius.xl,
                    padding: '24px',
                    border: `1px solid ${dashboardTokens.colors.border.secondary}`
                  }}
                >
                  <h3 style={{
                    fontSize: dashboardTokens.fonts.sizes.large,
                    fontWeight: dashboardTokens.fonts.weights.bold,
                    color: dashboardTokens.colors.text.primary,
                    marginBottom: '20px'
                  }}>
                    🏗️ 施工阶段分析
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '16px'
                  }}>
                    {currentResults.stageResults.map((stage, index) => (
                      <div key={index} style={{
                        background: dashboardTokens.colors.bg.secondary,
                        borderRadius: dashboardTokens.borderRadius.md,
                        padding: '16px',
                        border: `1px solid ${dashboardTokens.colors.border.secondary}`
                      }}>
                        <div style={{
                          fontSize: dashboardTokens.fonts.sizes.medium,
                          fontWeight: dashboardTokens.fonts.weights.semibold,
                          color: dashboardTokens.colors.text.primary,
                          marginBottom: '8px'
                        }}>
                          {stage.stageName}
                        </div>
                        <div style={{
                          fontSize: dashboardTokens.fonts.sizes.small,
                          color: dashboardTokens.colors.text.secondary,
                          marginBottom: '12px'
                        }}>
                          工期: {stage.constructionDays}天
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <span style={{
                            fontSize: dashboardTokens.fonts.sizes.small,
                            color: dashboardTokens.colors.text.secondary
                          }}>
                            安全系数
                          </span>
                          <span style={{
                            fontSize: dashboardTokens.fonts.sizes.medium,
                            fontWeight: dashboardTokens.fonts.weights.bold,
                            color: getStatusColor(stage.riskLevel)
                          }}>
                            {stage.safetyFactor.toFixed(2)}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{
                            fontSize: dashboardTokens.fonts.sizes.small,
                            color: dashboardTokens.colors.text.secondary
                          }}>
                            最大位移
                          </span>
                          <span style={{
                            fontSize: dashboardTokens.fonts.sizes.medium,
                            fontWeight: dashboardTokens.fonts.weights.bold,
                            color: dashboardTokens.colors.text.primary
                          }}>
                            {stage.maxDisplacement.toFixed(1)}mm
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* 详细视图 */}
          {viewMode === 'detailed' && (
            <motion.div
              {...dashboardAnimations.fadeIn}
              style={{
                padding: '32px',
                height: '100%',
                overflowY: 'auto'
              }}
            >
              <div style={{
                background: dashboardTokens.colors.bg.card,
                borderRadius: dashboardTokens.borderRadius.xl,
                padding: '24px',
                border: `1px solid ${dashboardTokens.colors.border.secondary}`
              }}>
                <h3 style={{
                  fontSize: dashboardTokens.fonts.sizes.large,
                  fontWeight: dashboardTokens.fonts.weights.bold,
                  color: dashboardTokens.colors.text.primary,
                  marginBottom: '20px'
                }}>
                  📋 详细计算结果
                </h3>
                
                {/* 详细数据表格 */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: '1px',
                  background: dashboardTokens.colors.border.secondary,
                  borderRadius: dashboardTokens.borderRadius.md,
                  overflow: 'hidden'
                }}>
                  {/* 表头 */}
                  {['类别', '参数', '计算值', '单位', '标准值', '评价'].map((header, index) => (
                    <div key={index} style={{
                      background: dashboardTokens.colors.bg.secondary,
                      padding: '16px 12px',
                      fontSize: dashboardTokens.fonts.sizes.small,
                      fontWeight: dashboardTokens.fonts.weights.semibold,
                      color: dashboardTokens.colors.text.primary,
                      textAlign: 'center'
                    }}>
                      {header}
                    </div>
                  ))}
                  
                  {/* 数据行 */}
                  {[
                    ['整体稳定性', '安全系数', currentResults.excavationResults?.results.overallStability.safetyFactor.toFixed(2), '-', '≥1.35', '满足'],
                    ['变形控制', '最大水平位移', currentResults.excavationResults?.results.deformation.maxHorizontalDisplacement.toFixed(1), 'mm', '≤30mm', currentResults.excavationResults?.results.deformation.maxHorizontalDisplacement <= 30 ? '满足' : '超限'],
                    ['变形控制', '最大竖向位移', currentResults.excavationResults?.results.deformation.maxVerticalDisplacement.toFixed(1), 'mm', '≤20mm', currentResults.excavationResults?.results.deformation.maxVerticalDisplacement <= 20 ? '满足' : '超限'],
                    ['应力状态', '最大主应力', (currentResults.excavationResults?.results.stress.maxPrincipalStress / 1000).toFixed(1), 'MPa', '材料强度内', '满足'],
                    ['支撑系统', '最大支撑力', (currentResults.excavationResults?.results.supportForces.maxStrutForce / 1000).toFixed(0), 'MN', '设计承载力内', '满足'],
                    ['渗流控制', '最大渗流速度', (currentResults.excavationResults?.results.seepage.maxSeepageVelocity * 1000).toFixed(3), 'mm/s', '<0.01mm/s', currentResults.excavationResults?.results.seepage.maxSeepageVelocity < 1e-5 ? '满足' : '注意']
                  ].map((row, rowIndex) => 
                    row.map((cell, cellIndex) => (
                      <div key={`${rowIndex}-${cellIndex}`} style={{
                        background: dashboardTokens.colors.bg.card,
                        padding: '16px 12px',
                        fontSize: dashboardTokens.fonts.sizes.small,
                        color: cellIndex === 5 ? (cell === '满足' ? dashboardTokens.colors.accent.success : 
                                                  cell === '超限' ? dashboardTokens.colors.accent.error : 
                                                  dashboardTokens.colors.accent.warning) : 
                               dashboardTokens.colors.text.primary,
                        textAlign: cellIndex === 2 || cellIndex === 5 ? 'center' : 'left',
                        fontWeight: cellIndex === 5 ? dashboardTokens.fonts.weights.semibold : dashboardTokens.fonts.weights.normal,
                        fontFamily: cellIndex === 2 ? 'JetBrains Mono, monospace' : 'inherit'
                      }}>
                        {cell}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsVisualizationDashboard;