/**
 * 2号专家集成工作空间
 * 0号架构师 - 实现地质建模与支护结构系统集成
 * 正确架构：桩基作为支护结构系统的组成部分
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { FunctionalIcons } from './icons/FunctionalIconsQuickFix';
import DataPipelineManager from '../services/DataPipelineManager';

interface GeologyModelData {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    elevation: number;
  };
  soilLayers: Array<{
    name: string;
    depth: number;
    thickness: number;
    soilType: 'clay' | 'sand' | 'gravel' | 'rock';
    properties: {
      cohesion: number;
      friction: number;
      density: number;
      elasticModulus: number;
    };
  }>;
  groundwaterLevel: number;
  bedrockDepth: number;
  geologicalRisk: 'low' | 'medium' | 'high';
  modelingCompleted: boolean;
}

interface SupportStructureIntegration {
  // 地下连续墙配置
  diaphragmWalls: {
    enabled: boolean;
    depth: number;
    thickness: number;
    material: 'reinforced_concrete' | 'steel_concrete';
    segments: number;
    qualityGrade: 'C30' | 'C35' | 'C40';
  };
  
  // 桩基支护配置 (作为支护结构的一部分)
  pileSupports: {
    enabled: boolean;
    pileConfiguration: Array<{
      type: 'BORED_CAST_IN_PLACE' | 'HAND_DUG' | 'PRECAST_DRIVEN' | 'SWM_METHOD' | 'CFG_PILE' | 'HIGH_PRESSURE_JET';
      strategy: 'BEAM_ELEMENT' | 'SHELL_ELEMENT';
      diameter: number;
      length: number;
      spacing: number;
      reinforcement: string;
      concreteGrade: string;
    }>;
    totalPiles: number;
    installationMethod: string;
  };
  
  // 锚索系统配置
  anchorSystems: {
    enabled: boolean;
    anchorType: 'prestressed' | 'ground_anchor' | 'soil_nail';
    levels: number;
    spacing: number;
    capacity: number;
    inclination: number;
  };
  
  // 钢支撑配置
  steelSupports: {
    enabled: boolean;
    levels: number;
    beamType: string;
    spacing: number;
    preloadForce: number;
  };
}

interface GeologyWorkspaceState {
  currentMode: 'geology_modeling' | 'support_design' | 'integration_validation';
  activeModel: GeologyModelData | null;
  supportStructures: SupportStructureIntegration;
  processingStatus: {
    geologyModeling: 'idle' | 'processing' | 'completed' | 'error';
    supportDesign: 'idle' | 'processing' | 'completed' | 'error';
    integration: 'idle' | 'processing' | 'completed' | 'error';
  };
  dataFlowEnabled: boolean;
  expertCollaborationActive: boolean;
}

interface GeologyIntegratedWorkspaceProps {
  projectData?: any;
  onGeologyComplete?: (data: GeologyModelData) => void;
  onSupportStructureComplete?: (data: SupportStructureIntegration) => void;
  onDataTransferTo3号?: (data: any) => void;
  workspaceWidth?: number;
  workspaceHeight?: number;
}

const GeologyIntegratedWorkspace: React.FC<GeologyIntegratedWorkspaceProps> = ({
  projectData,
  onGeologyComplete,
  onSupportStructureComplete,
  onDataTransferTo3号,
  workspaceWidth = 1400,
  workspaceHeight = 900
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  
  const [workspaceState, setWorkspaceState] = useState<GeologyWorkspaceState>({
    currentMode: 'geology_modeling',
    activeModel: null,
    supportStructures: {
      diaphragmWalls: {
        enabled: false,
        depth: 0,
        thickness: 0.8,
        material: 'reinforced_concrete',
        segments: 0,
        qualityGrade: 'C35'
      },
      pileSupports: {
        enabled: false,
        pileConfiguration: [],
        totalPiles: 0,
        installationMethod: 'BORED_CAST_IN_PLACE'
      },
      anchorSystems: {
        enabled: false,
        anchorType: 'prestressed',
        levels: 0,
        spacing: 0,
        capacity: 0,
        inclination: 15
      },
      steelSupports: {
        enabled: false,
        levels: 0,
        beamType: 'H-beam',
        spacing: 0,
        preloadForce: 0
      }
    },
    processingStatus: {
      geologyModeling: 'idle',
      supportDesign: 'idle',
      integration: 'idle'
    },
    dataFlowEnabled: true,
    expertCollaborationActive: true
  });

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [collaborationData, setCollaborationData] = useState<any>(null);

  // 初始化3D场景
  const init3DScene = useCallback(() => {
    if (!mountRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a2a2a);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(75, workspaceWidth / workspaceHeight, 0.1, 1000);
    camera.position.set(0, 50, 100);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(workspaceWidth, workspaceHeight);
    renderer.setClearColor(0x2a2a2a);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 添加光照
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    scene.add(directionalLight);

    // 创建地面网格
    createGroundGrid(scene);
    
    // 开始渲染循环
    startRenderLoop();
  }, [workspaceWidth, workspaceHeight]);

  // 创建地面网格
  const createGroundGrid = (scene: THREE.Scene) => {
    const gridHelper = new THREE.GridHelper(200, 20, 0x888888, 0x444444);
    scene.add(gridHelper);
  };

  // 开始渲染循环
  const startRenderLoop = () => {
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (sceneRef.current && cameraRef.current && rendererRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();
  };

  // 处理地质建模
  const handleGeologyModeling = async () => {
    setWorkspaceState(prev => ({
      ...prev,
      processingStatus: { ...prev.processingStatus, geologyModeling: 'processing' }
    }));
    
    setIsTransitioning(true);

    // 模拟地质建模过程
    await new Promise(resolve => setTimeout(resolve, 3000));

    const geologyModel: GeologyModelData = {
      id: `geology_${Date.now()}`,
      name: projectData?.name || '深基坑地质模型',
      location: projectData?.location || { lat: 39.9042, lng: 116.4074, elevation: 45 },
      soilLayers: [
        {
          name: '填土层',
          depth: 0,
          thickness: 3,
          soilType: 'clay',
          properties: { cohesion: 15, friction: 10, density: 1.8, elasticModulus: 8 }
        },
        {
          name: '粘土层',
          depth: 3,
          thickness: 8,
          soilType: 'clay',
          properties: { cohesion: 25, friction: 15, density: 1.9, elasticModulus: 12 }
        },
        {
          name: '砂层',
          depth: 11,
          thickness: 15,
          soilType: 'sand',
          properties: { cohesion: 0, friction: 35, density: 2.0, elasticModulus: 30 }
        },
        {
          name: '基岩',
          depth: 26,
          thickness: 50,
          soilType: 'rock',
          properties: { cohesion: 100, friction: 45, density: 2.5, elasticModulus: 25000 }
        }
      ],
      groundwaterLevel: 5,
      bedrockDepth: 26,
      geologicalRisk: 'medium',
      modelingCompleted: true
    };

    // 在3D场景中可视化地质模型
    visualizeGeologyModel(geologyModel);

    setWorkspaceState(prev => ({
      ...prev,
      activeModel: geologyModel,
      currentMode: 'support_design',
      processingStatus: { ...prev.processingStatus, geologyModeling: 'completed' }
    }));

    setIsTransitioning(false);
    onGeologyComplete?.(geologyModel);

    // 通过数据管道传递地质数据给支护结构设计
    try {
      await DataPipelineManager.transferData('geology-to-support', {
        geologyModel,
        projectContext: projectData
      });
    } catch (error) {
      console.error('地质数据传输失败:', error);
    }
  };

  // 可视化地质模型
  const visualizeGeologyModel = (model: GeologyModelData) => {
    if (!sceneRef.current) return;

    // 清除现有地质可视化
    const existingGeology = sceneRef.current.children.filter(child => 
      child.userData?.type === 'geology_layer'
    );
    existingGeology.forEach(obj => sceneRef.current!.remove(obj));

    // 创建土层可视化
    let currentDepth = 0;
    model.soilLayers.forEach((layer, index) => {
      const layerGeometry = new THREE.BoxGeometry(100, layer.thickness, 100);
      
      // 根据土层类型选择颜色
      const colors = {
        clay: 0x8B4513,    // 棕色
        sand: 0xF4A460,    // 沙棕色
        gravel: 0x708090,  // 石板灰
        rock: 0x696969     // 暗灰色
      };
      
      const layerMaterial = new THREE.MeshLambertMaterial({
        color: colors[layer.soilType],
        transparent: true,
        opacity: 0.7
      });
      
      const layerMesh = new THREE.Mesh(layerGeometry, layerMaterial);
      layerMesh.position.set(0, -(currentDepth + layer.thickness / 2), 0);
      layerMesh.userData = { type: 'geology_layer', layerData: layer };
      
      sceneRef.current!.add(layerMesh);
      currentDepth += layer.thickness;
    });

    // 添加地下水位线
    const waterGeometry = new THREE.PlaneGeometry(120, 120);
    const waterMaterial = new THREE.MeshBasicMaterial({
      color: 0x4169E1,
      transparent: true,
      opacity: 0.3
    });
    const waterPlane = new THREE.Mesh(waterGeometry, waterMaterial);
    waterPlane.position.set(0, -model.groundwaterLevel, 0);
    waterPlane.rotation.x = -Math.PI / 2;
    waterPlane.userData = { type: 'groundwater' };
    sceneRef.current.add(waterPlane);
  };

  // 处理支护结构设计
  const handleSupportStructureDesign = async () => {
    if (!workspaceState.activeModel) return;

    setWorkspaceState(prev => ({
      ...prev,
      processingStatus: { ...prev.processingStatus, supportDesign: 'processing' }
    }));

    setIsTransitioning(true);

    // 模拟支护结构设计过程
    await new Promise(resolve => setTimeout(resolve, 2500));

    const supportDesign: SupportStructureIntegration = {
      diaphragmWalls: {
        enabled: true,
        depth: Math.max(workspaceState.activeModel.bedrockDepth + 5, 30),
        thickness: 0.8,
        material: 'reinforced_concrete',
        segments: 24,
        qualityGrade: 'C35'
      },
      pileSupports: {
        enabled: true,
        pileConfiguration: [
          {
            type: 'BORED_CAST_IN_PLACE',
            strategy: 'BEAM_ELEMENT',
            diameter: 1.0,
            length: workspaceState.activeModel.bedrockDepth + 8,
            spacing: 2.5,
            reinforcement: '16φ25',
            concreteGrade: 'C30'
          },
          {
            type: 'CFG_PILE',
            strategy: 'SHELL_ELEMENT',
            diameter: 0.6,
            length: workspaceState.activeModel.bedrockDepth - 5,
            spacing: 1.8,
            reinforcement: '12φ20',
            concreteGrade: 'C25'
          }
        ],
        totalPiles: 48,
        installationMethod: 'BORED_CAST_IN_PLACE'
      },
      anchorSystems: {
        enabled: true,
        anchorType: 'prestressed',
        levels: 3,
        spacing: 3.0,
        capacity: 500,
        inclination: 15
      },
      steelSupports: {
        enabled: true,
        levels: 2,
        beamType: 'H500x200x10x16',
        spacing: 6.0,
        preloadForce: 200
      }
    };

    // 在3D场景中可视化支护结构
    visualizeSupportStructures(supportDesign);

    setWorkspaceState(prev => ({
      ...prev,
      supportStructures: supportDesign,
      currentMode: 'integration_validation',
      processingStatus: { ...prev.processingStatus, supportDesign: 'completed' }
    }));

    setIsTransitioning(false);
    onSupportStructureComplete?.(supportDesign);

    // 准备传输给3号专家的数据
    const dataFor3号 = {
      geologyModel: workspaceState.activeModel,
      supportStructures: supportDesign,
      projectBounds: {
        excavationDepth: workspaceState.activeModel.bedrockDepth + 10,
        supportSystemComplexity: 'high',
        meshRequirements: {
          minElementSize: 0.5,
          maxElementSize: 2.0,
          refinementZones: ['pile_interface', 'anchor_points', 'wall_base']
        }
      }
    };

    onDataTransferTo3号?.(dataFor3号);
  };

  // 可视化支护结构
  const visualizeSupportStructures = (supportStructures: SupportStructureIntegration) => {
    if (!sceneRef.current) return;

    // 清除现有支护结构可视化
    const existingSupport = sceneRef.current.children.filter(child => 
      child.userData?.type === 'support_structure'
    );
    existingSupport.forEach(obj => sceneRef.current!.remove(obj));

    // 可视化地下连续墙
    if (supportStructures.diaphragmWalls.enabled) {
      const wallGeometry = new THREE.BoxGeometry(120, supportStructures.diaphragmWalls.depth, supportStructures.diaphragmWalls.thickness);
      const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x808080, transparent: true, opacity: 0.8 });
      
      for (let i = 0; i < 4; i++) {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        const angle = (i * Math.PI) / 2;
        const radius = 60;
        wall.position.set(
          Math.cos(angle) * radius,
          -supportStructures.diaphragmWalls.depth / 2,
          Math.sin(angle) * radius
        );
        wall.rotation.y = angle;
        wall.userData = { type: 'support_structure', subtype: 'diaphragm_wall' };
        sceneRef.current.add(wall);
      }
    }

    // 可视化桩基支护 (作为支护结构的一部分)
    if (supportStructures.pileSupports.enabled) {
      supportStructures.pileSupports.pileConfiguration.forEach((pileConfig, configIndex) => {
        const pileRadius = pileConfig.diameter / 2;
        const pileGeometry = new THREE.CylinderGeometry(pileRadius, pileRadius, pileConfig.length, 8);
        const pileColor = pileConfig.strategy === 'BEAM_ELEMENT' ? 0x4169E1 : 0x32CD32;
        const pileMaterial = new THREE.MeshLambertMaterial({ color: pileColor, transparent: true, opacity: 0.7 });

        const pileCount = Math.floor(supportStructures.pileSupports.totalPiles / supportStructures.pileSupports.pileConfiguration.length);
        
        for (let i = 0; i < pileCount; i++) {
          const pile = new THREE.Mesh(pileGeometry, pileMaterial);
          const angle = (i * 2 * Math.PI) / pileCount;
          const radius = 45 + configIndex * 5;
          
          pile.position.set(
            Math.cos(angle) * radius,
            -pileConfig.length / 2,
            Math.sin(angle) * radius
          );
          pile.userData = { 
            type: 'support_structure', 
            subtype: 'pile_support',
            pileType: pileConfig.type,
            strategy: pileConfig.strategy
          };
          sceneRef.current.add(pile);
        }
      });
    }

    // 可视化锚索系统
    if (supportStructures.anchorSystems.enabled) {
      for (let level = 0; level < supportStructures.anchorSystems.levels; level++) {
        const anchorY = -10 - (level * 8);
        const anchorGeometry = new THREE.CylinderGeometry(0.1, 0.1, 30, 6);
        const anchorMaterial = new THREE.MeshLambertMaterial({ color: 0xFF6347 });
        
        for (let i = 0; i < 16; i++) {
          const anchor = new THREE.Mesh(anchorGeometry, anchorMaterial);
          const angle = (i * 2 * Math.PI) / 16;
          
          anchor.position.set(
            Math.cos(angle) * 65,
            anchorY,
            Math.sin(angle) * 65
          );
          anchor.rotation.z = -supportStructures.anchorSystems.inclination * Math.PI / 180;
          anchor.userData = { type: 'support_structure', subtype: 'anchor_system' };
          sceneRef.current.add(anchor);
        }
      }
    }

    // 可视化钢支撑
    if (supportStructures.steelSupports.enabled) {
      for (let level = 0; level < supportStructures.steelSupports.levels; level++) {
        const supportY = -5 - (level * 12);
        const supportGeometry = new THREE.BoxGeometry(100, 0.5, 0.2);
        const supportMaterial = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 });
        
        // 水平支撑
        for (let i = 0; i < 4; i++) {
          const support = new THREE.Mesh(supportGeometry, supportMaterial);
          support.position.set(0, supportY, 0);
          support.rotation.y = (i * Math.PI) / 2;
          support.userData = { type: 'support_structure', subtype: 'steel_support' };
          sceneRef.current.add(support);
        }
      }
    }
  };

  // 处理模式切换
  const handleModeSwitch = (mode: GeologyWorkspaceState['currentMode']) => {
    setWorkspaceState(prev => ({ ...prev, currentMode: mode }));
  };

  // 初始化场景
  useEffect(() => {
    init3DScene();
    
    return () => {
      // 安全卸载 renderer.domElement（仅当确为其父节点时）
      try {
        const mountNode = mountRef.current;
        const renderer = rendererRef.current;
        const dom = renderer?.domElement;
        if (mountNode && dom && dom.parentNode === mountNode) {
          mountNode.removeChild(dom);
        }
        renderer?.dispose?.();
      } catch (e) {
        // 忽略卸载期间的偶发性错误，避免 NotFoundError 影响卸载流程
        console.warn('[GeologyIntegratedWorkspace] cleanup warning:', e);
      } finally {
        rendererRef.current = undefined;
      }
    };
  }, [init3DScene]);

  // 监听来自1号专家的项目数据
  useEffect(() => {
    const handleEpicData = (data: any) => {
      setCollaborationData(data);
      if (workspaceState.expertCollaborationActive && data.project) {
        // 自动开始地质建模
        setTimeout(() => {
          handleGeologyModeling();
        }, 1000);
      }
    };

    DataPipelineManager.on('epic-to-geology', handleEpicData);
    
    return () => {
      DataPipelineManager.off('epic-to-geology', handleEpicData);
    };
  }, [workspaceState.expertCollaborationActive]);

  return (
    <div className="geology-integrated-workspace relative">
      {/* 3D场景区域 */}
      <div 
        ref={mountRef} 
        className="geology-3d-scene w-full h-full"
        style={{ width: workspaceWidth, height: workspaceHeight }}
      />
      
      {/* 控制面板 */}
      <div className="absolute top-4 left-4 space-y-4">
        {/* 模式切换 */}
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">2号专家工作模式</h3>
          <div className="space-y-2">
            {[
              { mode: 'geology_modeling', label: '地质建模', icon: FunctionalIcons.GeologyAnalysis },
              { mode: 'support_design', label: '支护设计', icon: FunctionalIcons.StructuralEngineering },
              { mode: 'integration_validation', label: '集成验证', icon: FunctionalIcons.SystemValidation }
            ].map(({ mode, label, icon: Icon }) => (
              <motion.button
                key={mode}
                className={`flex items-center space-x-2 w-full px-3 py-2 rounded-lg transition-all ${
                  workspaceState.currentMode === mode 
                    ? 'bg-blue-600 text-white' 
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

        {/* 处理状态 */}
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">处理状态</h3>
          <div className="space-y-2">
            {Object.entries(workspaceState.processingStatus).map(([key, status]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {key === 'geologyModeling' ? '地质建模' : 
                   key === 'supportDesign' ? '支护设计' : '集成验证'}
                </span>
                <div className={`w-3 h-3 rounded-full ${
                  status === 'completed' ? 'bg-green-500' :
                  status === 'processing' ? 'bg-yellow-500 animate-pulse' :
                  status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                }`} />
              </div>
            ))}
          </div>
        </div>

        {/* 协作状态 */}
        {workspaceState.expertCollaborationActive && (
          <div className="bg-blue-600/20 backdrop-blur-sm rounded-lg p-3 border border-blue-500/30">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-blue-300 text-sm">专家协作活跃</span>
            </div>
            {collaborationData && (
              <div className="text-xs text-blue-400 mt-1">
                已接收1号专家项目数据
              </div>
            )}
          </div>
        )}
      </div>

      {/* 操作按钮区域 */}
      <div className="absolute top-4 right-4 space-y-2">
        {workspaceState.currentMode === 'geology_modeling' && (
          <motion.button
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            onClick={handleGeologyModeling}
            disabled={workspaceState.processingStatus.geologyModeling === 'processing'}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {workspaceState.processingStatus.geologyModeling === 'processing' ? '建模中...' : '开始地质建模'}
          </motion.button>
        )}

        {workspaceState.currentMode === 'support_design' && workspaceState.activeModel && (
          <motion.button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={handleSupportStructureDesign}
            disabled={workspaceState.processingStatus.supportDesign === 'processing'}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {workspaceState.processingStatus.supportDesign === 'processing' ? '设计中...' : '设计支护结构'}
          </motion.button>
        )}
      </div>

      {/* 支护结构详情面板 */}
      {workspaceState.currentMode === 'support_design' && workspaceState.supportStructures.pileSupports.enabled && (
        <div className="absolute bottom-4 left-4 w-80 bg-black/50 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">支护结构配置</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-300">地下连续墙:</span>
              <span className="text-white ml-2">
                深度 {workspaceState.supportStructures.diaphragmWalls.depth}m
              </span>
            </div>
            <div>
              <span className="text-gray-300">桩基支护:</span>
              <span className="text-white ml-2">
                {workspaceState.supportStructures.pileSupports.totalPiles} 根桩
              </span>
            </div>
            {workspaceState.supportStructures.pileSupports.pileConfiguration.map((pile, index) => (
              <div key={index} className="ml-4 text-xs text-gray-400">
                • {pile.type} - {pile.strategy} - φ{pile.diameter}m
              </div>
            ))}
            <div>
              <span className="text-gray-300">锚索系统:</span>
              <span className="text-white ml-2">
                {workspaceState.supportStructures.anchorSystems.levels} 层
              </span>
            </div>
            <div>
              <span className="text-gray-300">钢支撑:</span>
              <span className="text-white ml-2">
                {workspaceState.supportStructures.steelSupports.levels} 层
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 过渡动画遮罩 */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="text-white text-center">
              <div className="text-xl font-bold mb-2">
                {workspaceState.processingStatus.geologyModeling === 'processing' ? '地质建模中...' : '支护结构设计中...'}
              </div>
              <div className="text-sm text-gray-300">
                {workspaceState.processingStatus.geologyModeling === 'processing' ? 
                  '正在分析土层结构和地质条件' : 
                  '正在优化支护结构配置'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GeologyIntegratedWorkspace;