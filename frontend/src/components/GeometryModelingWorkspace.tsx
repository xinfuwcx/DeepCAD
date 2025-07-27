/**
 * 几何建模工作空间
 * 0号架构师 - 2号专家几何建模模块正确架构
 * 集成已有的DXF导入和布尔运算算法
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { FunctionalIcons } from './icons/FunctionalIconsQuickFix';
import DXFBooleanInterface from './geology/DXFBooleanInterface';
import PileTypeSelector from './PileTypeSelector';
import { 
  PileType, 
  PileModelingStrategy,
  geometryAlgorithmIntegration 
} from '../services';

// 导入已有的DXF和布尔运算组件
interface GeologyModelingData {
  id: string;
  soilLayers: Array<{
    name: string;
    depth: number;
    thickness: number;
    soilType: string;
    properties: any;
  }>;
  groundwaterLevel: number;
  bedrockDepth: number;
}

interface ExcavationGeometry {
  id: string;
  contour: Array<{ x: number; y: number }>;
  depth: number;
  excavationSteps: Array<{
    stepNumber: number;
    depth: number;
    description: string;
  }>;
}

interface SupportStructureGeometry {
  diaphragmWalls: boolean;
  pileSupports: {
    enabled: boolean;
    pileType?: PileType;
    modelingStrategy?: PileModelingStrategy;
    configuration?: any;
  };
  anchorSystems: boolean;
  steelSupports: boolean;
  configuration: any;
}

interface GeometryWorkspaceState {
  currentModule: 'geology' | 'excavation' | 'support' | 'boundary' | 'assembly';
  geologyModel?: GeologyModelingData;
  excavationGeometry?: ExcavationGeometry;
  supportStructures?: SupportStructureGeometry;
  boundaryConditions?: any;
  assemblyValidation?: any;
}

interface GeometryModelingWorkspaceProps {
  onGeometryComplete?: (data: any) => void;
  onDataTransferToMesh?: (data: any) => void;
  onDataTransferToComputation?: (data: any) => void;
  workspaceWidth?: number;
  workspaceHeight?: number;
}

const GeometryModelingWorkspace: React.FC<GeometryModelingWorkspaceProps> = ({
  onGeometryComplete,
  onDataTransferToMesh,
  onDataTransferToComputation,
  workspaceWidth = 1400,
  workspaceHeight = 900
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();

  const [workspaceState, setWorkspaceState] = useState<GeometryWorkspaceState>({
    currentModule: 'geology'
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [showPileSelector, setShowPileSelector] = useState(false);

  // 初始化3D场景
  const init3DScene = useCallback(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2c2c2c);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, workspaceWidth / workspaceHeight, 0.1, 1000);
    camera.position.set(0, 60, 80);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(workspaceWidth, workspaceHeight);
    renderer.setClearColor(0x2c2c2c);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 添加光照
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    scene.add(directionalLight);

    // 添加网格
    const gridHelper = new THREE.GridHelper(100, 10, 0x666666, 0x333333);
    scene.add(gridHelper);

    // 渲染循环
    const animate = () => {
      requestAnimationFrame(animate);
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };
    animate();
  }, [workspaceWidth, workspaceHeight]);

  // 处理DXF导入完成 - 集成2号专家算法
  const handleDXFImported = async (result: any) => {
    console.log('🔄 DXF导入完成，开始集成2号专家算法处理:', result);
    
    try {
      // 使用2号专家的增强DXF处理
      if (result.file && result.file instanceof File) {
        const enhancedResult = await geometryAlgorithmIntegration.enhancedDXFProcessing(result.file);
        
        console.log('✨ 2号专家DXF处理完成:', {
          质量评分: enhancedResult.qualityReport.overall.score.toFixed(3),
          网格就绪: enhancedResult.qualityReport.overall.meshReadiness,
          处理时间: enhancedResult.processingStats.processingTime.toFixed(2) + 'ms'
        });
        
        // 将增强的DXF处理结果转换为开挖几何
        if (enhancedResult.cadGeometry.entities && enhancedResult.cadGeometry.entities.length > 0) {
          const excavationGeometry = await convertCADToExcavationGeometry(
            enhancedResult.cadGeometry,
            enhancedResult.qualityReport
          );
          
          setWorkspaceState(prev => ({
            ...prev,
            excavationGeometry,
            currentModule: 'support'
          }));

          // 在3D场景中可视化开挖轮廓
          visualizeExcavationGeometry(excavationGeometry);
        }
      } else if (result.contours && result.contours.length > 0) {
        // 处理传统DXF导入结果
        const mainContour = result.contours[0];
        const excavationGeometry: ExcavationGeometry = {
          id: `excavation_${Date.now()}`,
          contour: mainContour.points.map((p: [number, number]) => ({ x: p[0], y: p[1] })),
          depth: 30,
          excavationSteps: [
            { stepNumber: 1, depth: 10, description: '第一层开挖' },
            { stepNumber: 2, depth: 20, description: '第二层开挖' },
            { stepNumber: 3, depth: 30, description: '第三层开挖' }
          ]
        };

        setWorkspaceState(prev => ({
          ...prev,
          excavationGeometry,
          currentModule: 'support'
        }));

        visualizeExcavationGeometry(excavationGeometry);
      }
    } catch (error) {
      console.error('❌ 2号专家DXF处理失败:', error);
      alert('DXF处理失败，请检查文件格式或联系技术支持');
    }
  };

  // 处理布尔运算完成 - 集成2号专家算法
  const handleBooleanCompleted = async (result: any) => {
    console.log('🔄 布尔运算完成，集成2号专家算法:', result);
    
    try {
      // 如果布尔运算成功，使用2号专家的智能几何优化
      if (result.success && result.geometry) {
        // 构建几何模型数据结构
        const geometryModel = {
          vertices: result.geometry.vertices || [],
          faces: result.geometry.faces || [],
          quality: {
            boundingBox: result.geometry.bounding_box || { min: [0,0,0], max: [1,1,1] },
            vertexCount: result.statistics?.vertex_count || 0,
            triangleCount: result.statistics?.face_count || 0,
            volume: result.geometry.volume || 0,
            surfaceArea: result.geometry.surface_area || 0,
            meshReadiness: result.quality?.mesh_quality || 0.5
          },
          metadata: {
            operation: result.operation || 'boolean',
            timestamp: new Date().toISOString()
          }
        };

        // 应用2号专家的智能几何优化
        const optimizationResult = await geometryAlgorithmIntegration.intelligentGeometryOptimization(
          geometryModel,
          {
            targetMeshSize: 1.75,
            qualityThreshold: 0.65,
            maxElements: 1000000
          }
        );

        console.log('✨ 2号专家智能优化完成:', {
          质量提升: `${(optimizationResult.optimizationReport.improvement.qualityScore * 100).toFixed(1)}%`,
          网格就绪: optimizationResult.optimizedGeometry.quality.meshReadiness,
          优化策略: optimizationResult.optimizationReport.strategiesApplied.length
        });

        // 更新几何状态
        setWorkspaceState(prev => ({
          ...prev,
          excavationGeometry: {
            ...prev.excavationGeometry!,
            optimizedGeometry: optimizationResult.optimizedGeometry
          },
          currentModule: 'assembly'
        }));
      }
    } catch (error) {
      console.error('❌ 2号专家布尔运算优化失败:', error);
      // 降级处理：直接使用原始结果
      if (result.success) {
        setWorkspaceState(prev => ({
          ...prev,
          currentModule: 'assembly'
        }));
      }
    }
  };

  // CAD数据转换为开挖几何的辅助函数
  const convertCADToExcavationGeometry = async (
    cadGeometry: any,
    qualityReport: any
  ): Promise<ExcavationGeometry> => {
    // 从CAD实体中提取轮廓点
    const extractContourFromEntities = (entities: any[]): Array<{x: number, y: number}> => {
      let contourPoints: Array<{x: number, y: number}> = [];
      
      for (const entity of entities) {
        if (entity.type === 'POLYLINE' || entity.type === 'LWPOLYLINE') {
          // 从多边形实体提取点
          const points = entity.points || [];
          contourPoints = points.map((p: any) => ({
            x: Array.isArray(p) ? p[0] : p.x,
            y: Array.isArray(p) ? p[1] : p.y
          }));
          break; // 使用第一个找到的多边形
        }
      }
      
      return contourPoints;
    };

    const contour = extractContourFromEntities(cadGeometry.entities);
    
    // 根据质量报告确定开挖深度和步骤
    const recommendedDepth = qualityReport.meshGuidance?.recommendedMeshSize * 15 || 30;
    const stepCount = Math.max(3, Math.min(6, Math.floor(recommendedDepth / 8)));
    
    const excavationSteps = Array.from({ length: stepCount }, (_, i) => ({
      stepNumber: i + 1,
      depth: (recommendedDepth / stepCount) * (i + 1),
      description: `第${i + 1}层开挖 (深度: ${((recommendedDepth / stepCount) * (i + 1)).toFixed(1)}m)`
    }));

    return {
      id: `excavation_enhanced_${Date.now()}`,
      contour,
      depth: recommendedDepth,
      excavationSteps
    };
  };

  // 可视化开挖几何
  const visualizeExcavationGeometry = (excavationGeom: ExcavationGeometry) => {
    if (!sceneRef.current) return;

    // 清除现有几何
    const existingGeometry = sceneRef.current.children.filter(child => 
      child.userData?.type === 'excavation_geometry'
    );
    existingGeometry.forEach(obj => sceneRef.current!.remove(obj));

    // 创建开挖轮廓线
    const points = excavationGeom.contour.map(p => new THREE.Vector3(p.x, 0, p.y));
    points.push(points[0]); // 闭合轮廓

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff6b35, linewidth: 3 });
    const line = new THREE.Line(geometry, material);
    line.userData = { type: 'excavation_geometry', subtype: 'contour' };
    sceneRef.current.add(line);

    // 创建开挖体积可视化
    const shape = new THREE.Shape();
    excavationGeom.contour.forEach((point, index) => {
      if (index === 0) {
        shape.moveTo(point.x, point.y);
      } else {
        shape.lineTo(point.x, point.y);
      }
    });

    const extrudeGeometry = new THREE.ExtrudeGeometry(shape, {
      depth: excavationGeom.depth,
      bevelEnabled: false
    });
    
    const extrudeMaterial = new THREE.MeshLambertMaterial({
      color: 0x8B4513,
      transparent: true,
      opacity: 0.6
    });
    
    const excavationMesh = new THREE.Mesh(extrudeGeometry, extrudeMaterial);
    excavationMesh.position.y = -excavationGeom.depth / 2;
    excavationMesh.userData = { type: 'excavation_geometry', subtype: 'volume' };
    sceneRef.current.add(excavationMesh);
  };

  // 模块切换处理
  const handleModuleSwitch = (module: GeometryWorkspaceState['currentModule']) => {
    setWorkspaceState(prev => ({ ...prev, currentModule: module }));
  };

  // 处理桩基类型选择
  const handlePileTypeSelect = (pileType: PileType, strategy: PileModelingStrategy) => {
    console.log('🔧 选择桩基类型:', {
      桩基类型: pileType,
      建模策略: strategy
    });

    // 更新支护结构配置
    setWorkspaceState(prev => ({
      ...prev,
      supportStructures: {
        ...prev.supportStructures,
        pileSupports: {
          enabled: true,
          pileType,
          modelingStrategy: strategy,
          configuration: {
            diameter: strategy === PileModelingStrategy.BEAM_ELEMENT ? 800 : 600, // mm
            length: 25, // m
            spacing: 2.0, // m
            layout: 'rectangular'
          }
        }
      } as SupportStructureGeometry
    }));

    setShowPileSelector(false);
    
    console.log('✅ 桩基配置更新完成');
  };

  // 完成几何建模
  const handleGeometryComplete = () => {
    const completeGeometry = {
      geology: workspaceState.geologyModel,
      excavation: workspaceState.excavationGeometry,
      support: workspaceState.supportStructures,
      boundary: workspaceState.boundaryConditions,
      assembly: workspaceState.assemblyValidation
    };

    onGeometryComplete?.(completeGeometry);
    onDataTransferToMesh?.(completeGeometry);
    onDataTransferToComputation?.(completeGeometry);
  };

  // 初始化场景
  React.useEffect(() => {
    init3DScene();
    
    return () => {
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [init3DScene]);

  return (
    <div className="geometry-modeling-workspace relative">
      {/* 3D几何场景 */}
      <div 
        ref={mountRef} 
        className="geometry-3d-scene w-full h-full"
        style={{ width: workspaceWidth, height: workspaceHeight }}
      />
      
      {/* 几何建模模块切换 */}
      <div className="absolute top-4 left-4 space-y-4">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">几何建模模块</h3>
          <div className="space-y-2">
            {[
              { module: 'geology', label: '地质建模', icon: FunctionalIcons.GeologyAnalysis },
              { module: 'excavation', label: '基坑开挖建模', icon: FunctionalIcons.ExcavationDesign },
              { module: 'support', label: '支护结构建模', icon: FunctionalIcons.StructuralEngineering },
              { module: 'boundary', label: '边界条件设置', icon: FunctionalIcons.BoundaryConditions },
              { module: 'assembly', label: '几何装配与校验', icon: FunctionalIcons.SystemValidation }
            ].map(({ module, label, icon: Icon }) => (
              <motion.button
                key={module}
                className={`flex items-center space-x-2 w-full px-3 py-2 rounded-lg transition-all ${
                  workspaceState.currentModule === module 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => handleModuleSwitch(module as any)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon size={16} />
                <span className="text-sm">{label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* 进度指示器 */}
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">建模进度</h3>
          <div className="space-y-2">
            {Object.entries({
              '地质建模': workspaceState.geologyModel ? 'completed' : 'pending',
              '开挖建模': workspaceState.excavationGeometry ? 'completed' : 'pending',
              '支护建模': workspaceState.supportStructures ? 'completed' : 'pending',
              '边界条件': workspaceState.boundaryConditions ? 'completed' : 'pending',
              '装配校验': workspaceState.assemblyValidation ? 'completed' : 'pending'
            }).map(([name, status]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{name}</span>
                <div className={`w-3 h-3 rounded-full ${
                  status === 'completed' ? 'bg-green-500' :
                  status === 'processing' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500'
                }`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="absolute top-4 right-4 w-96 h-full max-h-[calc(100vh-2rem)] overflow-auto">
        <AnimatePresence mode="wait">
          {workspaceState.currentModule === 'excavation' && (
            <motion.div
              key="excavation"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="bg-black/50 backdrop-blur-sm rounded-lg p-4"
            >
              <h3 className="text-white font-medium mb-4">基坑开挖建模</h3>
              <p className="text-gray-300 text-sm mb-4">
                使用DXF导入和布尔运算算法定义开挖轮廓
              </p>
              
              {/* 集成已有的DXF布尔运算界面 */}
              <DXFBooleanInterface
                onDXFImported={handleDXFImported}
                onBooleanCompleted={handleBooleanCompleted}
                onGeometryExport={(entities, format) => {
                  console.log('几何导出:', entities, format);
                }}
                showAdvancedOptions={true}
              />
            </motion.div>
          )}

          {workspaceState.currentModule === 'geology' && (
            <motion.div
              key="geology"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="bg-black/50 backdrop-blur-sm rounded-lg p-4"
            >
              <h3 className="text-white font-medium mb-4">地质建模</h3>
              <p className="text-gray-300 text-sm mb-4">
                定义土层结构、地下水位和地质参数
              </p>
              <motion.button
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                onClick={() => {
                  // 模拟地质建模完成
                  const geologyModel: GeologyModelingData = {
                    id: `geology_${Date.now()}`,
                    soilLayers: [
                      { name: '填土层', depth: 0, thickness: 3, soilType: 'fill', properties: {} },
                      { name: '粘土层', depth: 3, thickness: 8, soilType: 'clay', properties: {} },
                      { name: '砂层', depth: 11, thickness: 15, soilType: 'sand', properties: {} }
                    ],
                    groundwaterLevel: 5,
                    bedrockDepth: 26
                  };
                  setWorkspaceState(prev => ({ ...prev, geologyModel, currentModule: 'excavation' }));
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                完成地质建模
              </motion.button>
            </motion.div>
          )}

          {workspaceState.currentModule === 'support' && (
            <motion.div
              key="support"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="bg-black/50 backdrop-blur-sm rounded-lg p-4"
            >
              <h3 className="text-white font-medium mb-4">支护结构建模</h3>
              <p className="text-gray-300 text-sm mb-4">
                设计地下连续墙、桩基支护、锚索系统、钢支撑
              </p>
              <div className="space-y-3">
                {/* 地下连续墙 */}
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    className="rounded"
                    onChange={(e) => {
                      setWorkspaceState(prev => ({
                        ...prev,
                        supportStructures: {
                          ...prev.supportStructures,
                          diaphragmWalls: e.target.checked
                        } as SupportStructureGeometry
                      }));
                    }}
                  />
                  <span className="text-sm text-gray-300">地下连续墙</span>
                </label>

                {/* 桩基支护 - 专业选择 */}
                <div className="space-y-2">
                  <label className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={workspaceState.supportStructures?.pileSupports?.enabled || false}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setShowPileSelector(true);
                          } else {
                            setWorkspaceState(prev => ({
                              ...prev,
                              supportStructures: {
                                ...prev.supportStructures,
                                pileSupports: { enabled: false }
                              } as SupportStructureGeometry
                            }));
                          }
                        }}
                      />
                      <span className="text-sm text-gray-300">桩基支护</span>
                    </div>
                    {workspaceState.supportStructures?.pileSupports?.enabled && (
                      <motion.button
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        onClick={() => setShowPileSelector(true)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        重新选择
                      </motion.button>
                    )}
                  </label>
                  
                  {/* 当前桩基配置显示 */}
                  {workspaceState.supportStructures?.pileSupports?.enabled && (
                    <div className="ml-6 p-2 bg-gray-800/30 rounded text-xs">
                      <div className="text-gray-400">当前配置:</div>
                      <div className="text-gray-300">
                        类型: {workspaceState.supportStructures.pileSupports.pileType}
                      </div>
                      <div className="text-gray-300">
                        策略: {workspaceState.supportStructures.pileSupports.modelingStrategy}
                      </div>
                    </div>
                  )}
                </div>

                {/* 锚索系统 */}
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    className="rounded"
                    onChange={(e) => {
                      setWorkspaceState(prev => ({
                        ...prev,
                        supportStructures: {
                          ...prev.supportStructures,
                          anchorSystems: e.target.checked
                        } as SupportStructureGeometry
                      }));
                    }}
                  />
                  <span className="text-sm text-gray-300">锚索系统</span>
                </label>

                {/* 钢支撑 */}
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    className="rounded"
                    onChange={(e) => {
                      setWorkspaceState(prev => ({
                        ...prev,
                        supportStructures: {
                          ...prev.supportStructures,
                          steelSupports: e.target.checked
                        } as SupportStructureGeometry
                      }));
                    }}
                  />
                  <span className="text-sm text-gray-300">钢支撑</span>
                </label>
              </div>
              <motion.button
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={() => setWorkspaceState(prev => ({ ...prev, currentModule: 'boundary' }))}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                完成支护建模
              </motion.button>
            </motion.div>
          )}

          {workspaceState.currentModule === 'assembly' && (
            <motion.div
              key="assembly"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="bg-black/50 backdrop-blur-sm rounded-lg p-4"
            >
              <h3 className="text-white font-medium mb-4">几何装配与校验</h3>
              <p className="text-gray-300 text-sm mb-4">
                验证几何完整性并准备传递给网格生成和计算模块
              </p>
              <motion.button
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                onClick={handleGeometryComplete}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                完成几何建模
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 桩基类型选择器模态框 */}
      <AnimatePresence>
        {showPileSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPileSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 关闭按钮 */}
              <motion.button
                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPileSelector(false)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FunctionalIcons.Close size={20} />
              </motion.button>

              {/* 桩基类型选择器 */}
              <PileTypeSelector
                onTypeSelect={handlePileTypeSelect}
                selectedType={workspaceState.supportStructures?.pileSupports?.pileType}
                showTechnicalDetails={true}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GeometryModelingWorkspace;