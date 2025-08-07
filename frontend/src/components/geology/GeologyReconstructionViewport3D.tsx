/**
 * 地质重建专用3D视口组件
 * 技术路线: GemPy → PyVista → Three.js
 * 集成几何建模工具栏和地质专用功能
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, Space, Button, Tooltip, message, Switch, Slider, Select, Badge } from 'antd';
import {
  PlayCircleOutlined, PauseOutlined, ReloadOutlined, SettingOutlined,
  EyeOutlined, EyeInvisibleOutlined, BorderOutlined, DashboardOutlined,
  ThunderboltOutlined, ExperimentOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import * as THREE from 'three';
import { safeEmptyContainer } from '../../utils/threejsCleanup';

// 导入现有的技术栈组件
import { GeologicalThreeJSRenderer, GeologicalModelData } from '../../services/GeologicalThreeJSRenderer';
import { PyVistaDataAPI, PyVistaDataSet } from '../../services/PyVistaIntegrationService';
import VerticalToolbar, { VerticalToolType } from '../geometry/VerticalToolbar';

// 导入CAE引擎基础
import { CAEThreeEngineCore, CAEThreeEngineProps } from '../3d/CAEThreeEngine';

const { Option } = Select;

// ==================== 接口定义 ====================

export interface GeologyReconstructionViewport3DProps {
  className?: string;
  style?: React.CSSProperties;
  
  // 地质数据相关
  geologicalData?: GeologicalModelData;
  boreholeData?: BoreholeData[];
  
  // 回调函数
  onToolSelect?: (tool: VerticalToolType) => void;
  onLayerVisibilityChange?: (layerId: string, visible: boolean) => void;
  onRenderModeChange?: (mode: GeologyRenderMode) => void;
  
  // 控制选项
  showToolbar?: boolean;
  showLayerControls?: boolean;
  enableAnimation?: boolean;
}

interface BoreholeData {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  depth: number;
  layers: GeologyLayer[];
}

interface GeologyLayer {
  id: string;
  name: string;
  topDepth: number;
  bottomDepth: number;
  soilType: string;
  color: string;
  visible: boolean;
  opacity: number;
}

type GeologyRenderMode = 'solid' | 'wireframe' | 'transparent' | 'section';

// ==================== 主组件 ====================

const GeologyReconstructionViewport3D: React.FC<GeologyReconstructionViewport3DProps> = ({
  className,
  style,
  geologicalData,
  boreholeData = [],
  onToolSelect,
  onLayerVisibilityChange,
  onRenderModeChange,
  showToolbar = true,
  showLayerControls = true,
  enableAnimation = true
}) => {
  // ==================== 状态管理 ====================
  
  const containerRef = useRef<HTMLDivElement>(null);
  const caeEngineRef = useRef<CAEThreeEngineCore | null>(null);
  const geologicalRendererRef = useRef<GeologicalThreeJSRenderer | null>(null);
  const pyvistaServiceRef = useRef<PyVistaDataAPI | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTool, setActiveTool] = useState<VerticalToolType>('select');
  const [renderMode, setRenderMode] = useState<GeologyRenderMode>('solid');
  const [isPlaying, setIsPlaying] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({});
  const [globalOpacity, setGlobalOpacity] = useState(1.0);
  const [showBoreholes, setShowBoreholes] = useState(true);
  const [sectionMode, setSectionMode] = useState(false);
  const [sectionPosition, setSectionPosition] = useState(0);

  // ==================== 初始化和清理 ====================

  const initializeViewport = useCallback(async () => {
    if (!containerRef.current || caeEngineRef.current) return;

    try {
      console.log('🏔️ 初始化地质重建3D视口...');
      
      // 清理容器内容
      safeEmptyContainer(containerRef.current);
      
      // 1. 初始化CAE引擎
      const engineProps: Partial<CAEThreeEngineProps> = {
        mode: 'geology',
        onModelSelect: (objects) => {
          console.log('地质对象选中:', objects);
        }
      };
      
      caeEngineRef.current = new CAEThreeEngineCore(containerRef.current, engineProps);
      
      // 2. 初始化地质渲染器
      geologicalRendererRef.current = new GeologicalThreeJSRenderer(
        caeEngineRef.current.scene,
        {
          showWireframe: renderMode === 'wireframe',
          transparentMode: renderMode === 'transparent',
          colorBy: 'formation'
        }
      );
      
      // 3. 初始化PyVista集成服务
      pyvistaServiceRef.current = new PyVistaDataAPI();
      
      // 4. 设置地质专用场景
      setupGeologyScene();
      
      // 5. 加载初始数据
      if (geologicalData) {
        await loadGeologicalData(geologicalData);
      }
      
      if (boreholeData.length > 0) {
        renderBoreholeData(boreholeData);
      }
      
      setIsInitialized(true);
      console.log('✅ 地质重建3D视口初始化完成');
      
    } catch (error) {
      console.error('❌ 地质重建3D视口初始化失败:', error);
      message.error('3D视口初始化失败');
    }
  }, [geologicalData, boreholeData, renderMode]);

  const setupGeologyScene = () => {
    if (!caeEngineRef.current) return;
    
    const scene = caeEngineRef.current.scene;
    
    // 设置地质专用背景
    scene.background = new THREE.Color(0x2c3e50);
    scene.fog = new THREE.Fog(0x2c3e50, 100, 500);
    
    // 添加地质专用光照
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    console.log('🌍 地质专用场景设置完成');
  };

  const cleanup = useCallback(() => {
    console.log('🧹 清理地质重建3D视口...');
    
    try {
      // 停止动画循环
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // 清理地质渲染器
      if (geologicalRendererRef.current) {
        try {
          geologicalRendererRef.current.dispose();
        } catch (error) {
          console.warn('地质渲染器清理警告:', error);
        }
        geologicalRendererRef.current = null;
      }
      
      // 清理CAE引擎
      if (caeEngineRef.current) {
        try {
          caeEngineRef.current.dispose();
        } catch (error) {
          console.warn('CAE引擎清理警告:', error);
        }
        caeEngineRef.current = null;
      }
      
      // 清理容器
      if (containerRef.current) {
        safeEmptyContainer(containerRef.current);
      }
      
      console.log('✅ 地质重建3D视口清理完成');
      
    } catch (error) {
      console.error('❌ 地质重建3D视口清理失败:', error);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || isInitialized || caeEngineRef.current) return;

    initializeViewport();

    return () => {
      cleanup();
    };
  }, [initializeViewport, cleanup, isInitialized]);

  // ==================== 数据加载和渲染 ====================

  const loadGeologicalData = async (data: GeologicalModelData) => {
    if (!geologicalRendererRef.current) return;
    
    try {
      console.log('📊 加载地质数据...', data.statistics);
      
      // 使用地质渲染器加载数据
      geologicalRendererRef.current.renderGeologicalModel(data);
      
      // 初始化图层可见性状态
      const visibility: Record<string, boolean> = {};
      Object.keys(data.formations).forEach(formationId => {
        visibility[formationId] = true;
      });
      setLayerVisibility(visibility);
      
      message.success(`地质模型加载完成：${data.statistics.formation_count} 个地层`);
      
    } catch (error) {
      console.error('❌ 地质数据加载失败:', error);
      message.error('地质数据加载失败');
    }
  };

  const renderBoreholeData = (boreholes: BoreholeData[]) => {
    if (!caeEngineRef.current) return;
    
    const scene = caeEngineRef.current.scene;
    
    // 清除现有钻孔
    const existingBoreholes = scene.getObjectByName('boreholes');
    if (existingBoreholes) {
      scene.remove(existingBoreholes);
    }
    
    const boreholesGroup = new THREE.Group();
    boreholesGroup.name = 'boreholes';
    
    boreholes.forEach(borehole => {
      const boreholeObject = createBoreholeVisualization(borehole);
      boreholesGroup.add(boreholeObject);
    });
    
    scene.add(boreholesGroup);
    console.log(`🕳️ 渲染了 ${boreholes.length} 个钻孔`);
  };

  const createBoreholeVisualization = (borehole: BoreholeData): THREE.Group => {
    const group = new THREE.Group();
    group.name = `borehole-${borehole.id}`;
    
    // 钻孔柱状图
    let currentDepth = 0;
    borehole.layers.forEach((layer, index) => {
      const layerHeight = layer.bottomDepth - layer.topDepth;
      
      const geometry = new THREE.CylinderGeometry(0.5, 0.5, layerHeight, 8);
      const material = new THREE.MeshPhongMaterial({ 
        color: layer.color,
        transparent: true,
        opacity: layer.opacity || 0.8
      });
      
      const layerMesh = new THREE.Mesh(geometry, material);
      layerMesh.position.set(
        borehole.x, 
        borehole.z - currentDepth - layerHeight / 2, 
        borehole.y
      );
      layerMesh.userData = { layerId: layer.id, boreholeId: borehole.id };
      
      group.add(layerMesh);
      currentDepth += layerHeight;
    });
    
    // 钻孔标签
    const labelGeometry = new THREE.SphereGeometry(0.8, 8, 6);
    const labelMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      emissive: 0x440000
    });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.set(borehole.x, borehole.z + 1, borehole.y);
    group.add(label);
    
    return group;
  };

  // ==================== 工具栏事件处理 ====================

  const handleToolSelect = useCallback((tool: VerticalToolType) => {
    setActiveTool(tool);
    onToolSelect?.(tool);
    
    if (!caeEngineRef.current) return;
    
    switch (tool) {
      case 'section':
        setSectionMode(!sectionMode);
        message.info(sectionMode ? '退出剖面模式' : '进入剖面模式');
        break;
        
      case 'wireframe':
        const newMode = renderMode === 'wireframe' ? 'solid' : 'wireframe';
        setRenderMode(newMode);
        onRenderModeChange?.(newMode);
        updateRenderMode(newMode);
        break;
        
      case 'explode':
        // 实现爆炸视图逻辑
        message.info('爆炸视图功能开发中...');
        break;
        
      case 'reset':
        resetView();
        break;
        
      default:
        console.log('工具选择:', tool);
    }
  }, [renderMode, sectionMode, onToolSelect, onRenderModeChange]);

  const updateRenderMode = (mode: GeologyRenderMode) => {
    if (!geologicalRendererRef.current) return;
    
    // 更新地质渲染器设置
    // geologicalRendererRef.current.updateRenderMode(mode);
    console.log('更新渲染模式:', mode);
  };

  const resetView = () => {
    if (!caeEngineRef.current) return;
    
    const camera = caeEngineRef.current.camera;
    camera.position.set(50, 50, 50);
    camera.lookAt(0, 0, 0);
    
    const controls = caeEngineRef.current.orbitControls;
    controls.reset();
    
    message.info('视图已重置');
  };

  // ==================== 图层控制 ====================

  const handleLayerVisibilityChange = (layerId: string, visible: boolean) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerId]: visible
    }));
    
    onLayerVisibilityChange?.(layerId, visible);
    
    // 更新场景中的图层可见性
    if (caeEngineRef.current) {
      const scene = caeEngineRef.current.scene;
      const layerObject = scene.getObjectByName(`formation-${layerId}`);
      if (layerObject) {
        layerObject.visible = visible;
      }
    }
  };

  // ==================== 渲染UI ====================

  const renderControlPanel = () => (
    <Card 
      size="small" 
      title="地质控制" 
      className="geology-control-panel"
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        width: '280px',
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(0, 217, 255, 0.3)'
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 渲染模式控制 */}
        <div>
          <label style={{ color: '#ffffff', marginBottom: 8, display: 'block' }}>
            渲染模式
          </label>
          <Select
            value={renderMode}
            onChange={(value) => {
              setRenderMode(value);
              onRenderModeChange?.(value);
              updateRenderMode(value);
            }}
            style={{ width: '100%' }}
          >
            <Option value="solid">实体模式</Option>
            <Option value="wireframe">线框模式</Option>
            <Option value="transparent">透明模式</Option>
            <Option value="section">剖面模式</Option>
          </Select>
        </div>

        {/* 全局透明度 */}
        <div>
          <label style={{ color: '#ffffff', marginBottom: 8, display: 'block' }}>
            全局透明度: {(globalOpacity * 100).toFixed(0)}%
          </label>
          <Slider
            min={0.1}
            max={1.0}
            step={0.1}
            value={globalOpacity}
            onChange={setGlobalOpacity}
          />
        </div>

        {/* 显示控制 */}
        <div>
          <Space>
            <Switch
              checked={showBoreholes}
              onChange={setShowBoreholes}
              checkedChildren="钻孔"
              unCheckedChildren="钻孔"
            />
            <Switch
              checked={sectionMode}
              onChange={setSectionMode}
              checkedChildren="剖面"
              unCheckedChildren="剖面"
            />
          </Space>
        </div>

        {/* 剖面位置控制 */}
        {sectionMode && (
          <div>
            <label style={{ color: '#ffffff', marginBottom: 8, display: 'block' }}>
              剖面位置
            </label>
            <Slider
              min={-50}
              max={50}
              value={sectionPosition}
              onChange={setSectionPosition}
            />
          </div>
        )}
      </Space>
    </Card>
  );

  const renderStatusBar = () => (
    <div
      style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        right: '16px',
        height: '40px',
        background: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid rgba(0, 217, 255, 0.3)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        zIndex: 1000
      }}
    >
      <Space>
        <Badge status="success" text={isInitialized ? "就绪" : "初始化中"} />
        <span style={{ color: '#ffffff' }}>|</span>
        <span style={{ color: '#00d9ff' }}>
          地层: {geologicalData?.statistics.formation_count || 0}
        </span>
        <span style={{ color: '#ffffff' }}>|</span>
        <span style={{ color: '#00d9ff' }}>
          钻孔: {boreholeData.length}
        </span>
        <span style={{ color: '#ffffff' }}>|</span>
        <span style={{ color: '#00d9ff' }}>
          模式: {renderMode}
        </span>
      </Space>
    </div>
  );

  // ==================== 主渲染 ====================

  return (
    <div 
      className={`geology-reconstruction-viewport-3d ${className || ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#1a1a1a',
        overflow: 'hidden',
        ...style
      }}
    >
      {/* 3D渲染容器 */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%'
        }}
      />

      {/* 几何建模工具栏 */}
      {showToolbar && (
        <div
          style={{
            position: 'absolute',
            left: '16px',
            top: '16px',
            bottom: '70px',
            zIndex: 1000
          }}
        >
          <VerticalToolbar
            activeTool={activeTool}
            onToolSelect={handleToolSelect}
          />
        </div>
      )}

      {/* 地质控制面板 */}
      {showLayerControls && renderControlPanel()}

      {/* 状态栏 */}
      {renderStatusBar()}

      {/* 加载指示器 */}
      {!isInitialized && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
        >
          <div style={{ textAlign: 'center', color: '#ffffff' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏔️</div>
            <div style={{ fontSize: '18px' }}>正在初始化地质重建3D视口...</div>
            <div style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
              GemPy → PyVista → Three.js
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeologyReconstructionViewport3D;