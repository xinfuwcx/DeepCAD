/**
 * 地质重建专用3D视口组件
 * 技术路线: GemPy → PyVista → Three.js
 * 集成几何建模工具栏和地质专用功能
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Space, Button, Tooltip, message, Badge } from 'antd';
import { FileImageOutlined, CloudDownloadOutlined, FileTextOutlined, ReloadOutlined } from '@ant-design/icons';
import * as THREE from 'three';
// @ts-ignore - types from examples
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { safeEmptyContainer } from '../../utils/threejsCleanup';

// 导入现有的技术栈组件
import { GeologicalThreeJSRenderer, GeologicalModelData, GeologicalFormationData } from '../../services/GeologicalThreeJSRenderer';
import { PyVistaDataAPI } from '../../services/PyVistaIntegrationService';
import type { VerticalToolType } from '../geometry/VerticalToolbar';

// 导入CAE引擎基础
import { CAEThreeEngineCore, CAEThreeEngineProps, CAEInteractionMode } from '../3d/CAEThreeEngine';
import styles from './GeologyReconstructionViewport3D.module.css';

// 控件常量已移除：内部控制面板已废弃

// ==================== 接口定义 ====================

export interface GeologyReconstructionViewport3DProps {
  className?: string;
  style?: React.CSSProperties;
  
  // 地质数据相关
  geologicalData?: GeologicalModelData;
  boreholeData?: BoreholeData[];
  // 新增：直接接入后端 GemPy → Three.js 的三维数据
  threeJsData?: Record<string, RawThreeJsGeometry>;
  // 新增：外部控制
  globalOpacity?: number; // 全局透明度 [0,1]
  showBoreholes?: boolean; // 是否显示钻孔
  // 新增：外部工具触发（用于右侧外挂工具栏联动）
  externalTool?: VerticalToolType;
  // 新增：外部剖切控制（可选）
  externalSectionAxis?: 'x' | 'y' | 'z';
  externalSectionPosition?: number;
  // 新增：外部爆炸视图控制与截图触发
  externalExplodeOffset?: number;
  externalScreenshotNonce?: number;
  
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

// ==================== Three.js原始数据类型定义（后端直出） ====================
export type RawThreeJsGeometry = {
  vertices: number[];
  indices: number[];
  normals?: number[];
  colors?: number[]; // 按顶点的RGB, 0-1范围
  formation_id?: number;
  vertex_count?: number;
  face_count?: number;
};
export type RawThreeJsData = Record<string, RawThreeJsGeometry>;

// ==================== 主组件 ====================

const GeologyReconstructionViewport3D: React.FC<GeologyReconstructionViewport3DProps> = ({
  className,
  geologicalData,
  boreholeData = [],
  threeJsData,
  globalOpacity: globalOpacityProp = 1.0,
  showBoreholes: showBoreholesProp = true,
  externalTool,
  externalSectionAxis,
  externalSectionPosition,
  externalExplodeOffset,
  externalScreenshotNonce,
  onToolSelect,
  onLayerVisibilityChange: _onLayerVisibilityChange,
  onRenderModeChange
}) => {
  // ==================== 状态管理 ====================
  
  const containerRef = useRef<HTMLDivElement>(null);
  const caeEngineRef = useRef<CAEThreeEngineCore | null>(null);
  const geologicalRendererRef = useRef<GeologicalThreeJSRenderer | null>(null);
  const pyvistaServiceRef = useRef<PyVistaDataAPI | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  // 容器尺寸就绪（避免在隐藏的 Tab 或 0 高度时初始化导致相机/渲染器尺寸为 0）
  const [containerReady, setContainerReady] = useState(false);
  // 当前选中工具由外部控制，无需本地状态
  const [renderMode, setRenderMode] = useState<GeologyRenderMode>('solid');
  // 透明度与钻孔可见性由外部控制
  const globalOpacity = globalOpacityProp;
  const showBoreholes = showBoreholesProp;
  const [sectionMode, setSectionMode] = useState(false);
  const [sectionPosition, setSectionPosition] = useState(0);
  const [sectionAxis, setSectionAxis] = useState<'x' | 'y' | 'z'>('x');
  // 体验优化：性能与相机状态
  const [fps, setFps] = useState<number>(0);
  const [cameraInfo, setCameraInfo] = useState<string>('');
  const fpsCounterRef = useRef({ last: performance.now(), frames: 0 });
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const [qualityMode, setQualityMode] = useState<'high' | 'balanced' | 'speed'>('balanced');

  // 测距工具状态
  const [isMeasuringDistance, setIsMeasuringDistance] = useState(false);
  const [isMeasuringAngle, setIsMeasuringAngle] = useState(false);
  const measurementPointsRef = useRef<THREE.Vector3[]>([]);
  const measurementObjectsRef = useRef<THREE.Object3D[]>([]);
  const lastModelDataRef = useRef<GeologicalModelData | null>(null);
  const prevExplodeOffsetRef = useRef<number>(0);

  // 标注与撤销/重做
  const isAnnotatingRef = useRef<boolean>(false);
  const annotationSpritesRef = useRef<THREE.Sprite[]>([]);
  const annotationCounterRef = useRef<number>(1);
  type UndoableCommand = { label: string; apply: () => void; revert: () => void };
  const commandStackRef = useRef<UndoableCommand[]>([]);
  const redoStackRef = useRef<UndoableCommand[]>([]);
  const pushCommand = (cmd: UndoableCommand) => {
    commandStackRef.current.push(cmd);
    redoStackRef.current = [];
  };
  const doUndo = () => {
    const cmd = commandStackRef.current.pop();
    if (!cmd) {
      message.info('没有可撤销的操作');
      return;
    }
    try {
      cmd.revert();
      redoStackRef.current.push(cmd);
      message.success(`撤销: ${cmd.label}`);
    } catch (e) {
      console.error('撤销失败', e);
      message.error('撤销失败');
    }
  };
  const doRedo = () => {
    const cmd = redoStackRef.current.pop();
    if (!cmd) {
      message.info('没有可重做的操作');
      return;
    }
    try {
      cmd.apply();
      commandStackRef.current.push(cmd);
      message.success(`重做: ${cmd.label}`);
    } catch (e) {
      console.error('重做失败', e);
      message.error('重做失败');
    }
  };

  // ==================== 初始化和清理 ====================

  const initializeViewport = useCallback(async () => {
    if (!containerRef.current || caeEngineRef.current || !containerReady) return;

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
      // 优先：直接渲染后端GemPy → Three.js数据
      if (threeJsData && Object.keys(threeJsData).length > 0) {
        const converted = convertThreeJsDataToGeologicalModelData(threeJsData);
        await loadGeologicalData(converted);
      } else if (geologicalData) {
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
  }, [geologicalData, boreholeData, renderMode, threeJsData, containerReady]);

  // 观测容器尺寸，保证非零尺寸后再初始化
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const check = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      // 允许较小阈值，但必须非 0
      setContainerReady(w > 0 && h > 0);
    };
    check();
    // 使用 ResizeObserver 监听容器可见/尺寸变化
    const RO: any = (window as any).ResizeObserver;
    if (RO) {
      const ro = new RO(() => check());
      ro.observe(el);
      return () => ro.disconnect();
    } else {
      const id = window.setInterval(check, 300);
      return () => window.clearInterval(id);
    }
  }, []);

  // 当外部传入threeJsData发生变化时，实时更新渲染
  useEffect(() => {
    if (!geologicalRendererRef.current) return;
    if (!threeJsData || Object.keys(threeJsData).length === 0) return;
    const converted = convertThreeJsDataToGeologicalModelData(threeJsData);
    loadGeologicalData(converted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threeJsData]);

  const setupGeologyScene = () => {
    if (!caeEngineRef.current) return;
    
    const scene = caeEngineRef.current.scene;
    
    // 不再覆盖引擎自带的渐变背景，仅设置雾效以增强景深
    scene.fog = new THREE.Fog(0x2c3e50, 100, 500);
    
    // 添加地质专用光照
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(50, 100, 50);
  directionalLight.castShadow = false; // 默认关闭阴影以提升性能
  dirLightRef.current = directionalLight;
  scene.add(directionalLight);
    
    console.log('🌍 地质专用场景设置完成');
  };

  // 应用性能模式（像素比/阴影/材质面剔除）
  const applyQualityMode = useCallback((mode: 'high' | 'balanced' | 'speed' = qualityMode) => {
    const engine = caeEngineRef.current;
    if (!engine) return;
    const renderer: any = engine.renderer;
    const dpr = (window as any).devicePixelRatio || 1;
    const cap = mode === 'high' ? 2.0 : mode === 'balanced' ? 1.5 : 1.0;
    try {
      renderer?.setPixelRatio?.(Math.min(dpr, cap));
      if (renderer?.shadowMap) renderer.shadowMap.enabled = mode === 'high';
    } catch {}
    if (dirLightRef.current) dirLightRef.current.castShadow = mode === 'high';

    const scene = engine.scene;
    const root = scene.getObjectByName('GeologicalModel') || scene;
    root.traverse(obj => {
      const m = (obj as any).material;
      if (!m) return;
      const mats = Array.isArray(m) ? m : [m];
      mats.forEach(mt => { mt.side = mode === 'speed' ? THREE.FrontSide : THREE.DoubleSide; });
    });
  }, [qualityMode]);

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

  // 初始化后应用一次性能模式，并在模式变化时重应用
  useEffect(() => {
    if (!isInitialized) return;
    applyQualityMode();
  }, [isInitialized, qualityMode, applyQualityMode]);

  // 性能FPS循环（每 ~500ms 更新一次）
  useEffect(() => {
    const loop = () => {
      fpsCounterRef.current.frames++;
      const now = performance.now();
      const elapsed = now - fpsCounterRef.current.last;
      if (elapsed >= 500) {
        const currentFps = (fpsCounterRef.current.frames * 1000) / elapsed;
        setFps(currentFps);
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.last = now;
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // 相机信息：监听控制器变化
  useEffect(() => {
    const update = () => {
      const cam = caeEngineRef.current?.camera as THREE.PerspectiveCamera | undefined;
      if (!cam) return;
      const p = cam.position;
      setCameraInfo(`(${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`);
  // 切换钻孔LOD（远距离使用点标记）
  updateBoreholeLOD();
    };
    update();
    const controls: any = caeEngineRef.current?.orbitControls;
    controls?.addEventListener?.('change', update);
    return () => controls?.removeEventListener?.('change', update);
  }, [isInitialized]);

  // ==================== 数据加载和渲染 ====================

  const loadGeologicalData = async (data: GeologicalModelData) => {
    if (!geologicalRendererRef.current) return;
    
    try {
      console.log('📊 加载地质数据...', data.statistics);
      lastModelDataRef.current = data;
      
      // 使用地质渲染器加载数据
      geologicalRendererRef.current.renderGeologicalModel(data);
      
      message.success(`地质模型加载完成：${data.statistics.formation_count} 个地层`);
      
    } catch (error) {
      console.error('❌ 地质数据加载失败:', error);
      message.error('地质数据加载失败');
    }
  };

  // ==================== 后端Three.js数据 → 统一模型数据转换 ====================
  const convertThreeJsDataToGeologicalModelData = (raw: RawThreeJsData): GeologicalModelData => {
    const formations: Record<string, GeologicalFormationData> = {};

    let totalVertices = 0;
    let totalFaces = 0;

    Object.entries(raw).forEach(([formationKey, geom]) => {
      const vertices = geom.vertices || [];
      const normals = geom.normals || [];
      const indices = geom.indices || [];
      const colors = geom.colors || [];

      const vertexCount = geom.vertex_count ?? Math.floor(vertices.length / 3);
      const faceCount = geom.face_count ?? Math.floor(indices.length / 3);
      totalVertices += vertexCount;
      totalFaces += faceCount;

      // 材质主色：优先取顶点颜色的第一组，否则按formationKey生成稳定颜色
      const materialColor =
        colors.length >= 3
          ? [colors[0], colors[1], colors[2]]
          : generateStableColorFromKey(formationKey);

      formations[formationKey] = {
        type: 'geological_mesh',
        formation: formationKey,
        metadata: {
          vertex_count: vertexCount,
          face_count: faceCount,
          has_normals: normals.length > 0,
          has_colors: colors.length > 0,
          has_scalars: false
        },
        geometry: {
          vertices: vertices,
          normals: normals,
          indices: indices,
          colors: colors,
          scalars: []
        },
        material: {
          color: materialColor,
          opacity: 0.8,
          transparent: true,
          side: 'DoubleSide'
        },
        wireframe: undefined
      };
    });

    const model: GeologicalModelData = {
      type: 'geological_model',
      version: '3.0',
      timestamp: Date.now(),
      metadata: { source: 'gempy_threejs_direct' },
      formations,
      statistics: {
        formation_count: Object.keys(formations).length,
        total_vertices: totalVertices,
        total_faces: totalFaces,
        conversion_time: 0
      },
      lod_levels: {
        enabled: true,
        levels: [
          { distance: 100, detail: 'high' },
          { distance: 300, detail: 'medium' },
          { distance: 800, detail: 'low' }
        ]
      }
    };

    return model;
  };

  const generateStableColorFromKey = (key: string): [number, number, number] => {
    // 简单哈希生成HSL，再转RGB（0-1）
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    const h = (hash % 360) / 360;
    const s = 0.5;
    const l = 0.6;
    const rgb = hslToRgb(h, s, l);
    return [rgb[0], rgb[1], rgb[2]];
  };

  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    if (s === 0) return [l, l, l];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = hue2rgb(p, q, h + 1 / 3);
    const g = hue2rgb(p, q, h);
    const b = hue2rgb(p, q, h - 1 / 3);
    return [r, g, b];
  };

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
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

    // 创建/刷新远景点标记（降低远距离渲染成本）
    const existingMarkers = scene.getObjectByName('boreholes_markers');
    if (existingMarkers) {
      scene.remove(existingMarkers);
    }
    const positions = new Float32Array(boreholes.length * 3);
    for (let i = 0; i < boreholes.length; i++) {
      const b = boreholes[i];
      positions[i * 3 + 0] = b.x;
      positions[i * 3 + 1] = b.z + 1;
      positions[i * 3 + 2] = b.y;
    }
    const markersGeometry = new THREE.BufferGeometry();
    markersGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const markersMaterial = new THREE.PointsMaterial({ color: 0x00d9ff, size: 2, sizeAttenuation: true });
    const markersPoints = new THREE.Points(markersGeometry, markersMaterial);
    const markersGroup = new THREE.Group();
    markersGroup.name = 'boreholes_markers';
    markersGroup.add(markersPoints);
    markersGroup.visible = false;
    scene.add(markersGroup);
  };

  const createBoreholeVisualization = (borehole: BoreholeData): THREE.Group => {
    const group = new THREE.Group();
    group.name = `borehole-${borehole.id}`;
    
    // 钻孔柱状图
    let currentDepth = 0;
  borehole.layers.forEach((layer) => {
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
    const labelMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xff0000,
      emissive: 0x440000
    });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.set(borehole.x, borehole.z + 1, borehole.y);
    group.add(label);
    
    return group;
  };

  // 钻孔LOD：相机远近切换详细/点标记
  const updateBoreholeLOD = (mode: 'high' | 'balanced' | 'speed' = qualityMode) => {
    if (!caeEngineRef.current) return;
    const engine = caeEngineRef.current;
    const cam = engine.camera as THREE.PerspectiveCamera | undefined;
    if (!cam) return;
    const dist = cam.position.length();
    const threshold = mode === 'high' ? Number.POSITIVE_INFINITY : mode === 'balanced' ? 350 : 200;
    const scene = engine.scene;
    const detail = scene.getObjectByName('boreholes');
    const markers = scene.getObjectByName('boreholes_markers');
    const useMarkers = dist > threshold;
    if (detail) (detail.visible = !useMarkers && showBoreholes);
    if (markers) (markers.visible = useMarkers && showBoreholes);
  };

  // ==================== 工具栏事件处理 ====================

  const handleToolSelect = useCallback((tool: VerticalToolType) => {
    onToolSelect?.(tool);
    
    if (!caeEngineRef.current) return;
    
    // 默认关闭标注模式，特定工具再开启
    isAnnotatingRef.current = false;

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

      case 'distance':
        setIsMeasuringDistance(true);
        message.success('距离测量：请选择两个点');
        break;

      case 'angle':
        setIsMeasuringAngle(true);
        message.success('角度测量：请选择三个位点');
        break;
      case 'annotation':
        isAnnotatingRef.current = true;
        setIsMeasuringAngle(false);
        setIsMeasuringDistance(false);
        message.info('标注模式：单击模型添加标签');
        break;
      case 'undo':
        doUndo();
        break;
      case 'redo':
        doRedo();
        break;
        
      case 'select':
        // 切换引擎交互模式为“选择”
        try {
          caeEngineRef.current.setInteractionMode?.(CAEInteractionMode.SELECT);
          message.success('选择模式');
        } catch {}
        break;

      case 'pan':
        try {
          caeEngineRef.current.setInteractionMode?.(CAEInteractionMode.ORBIT);
          message.success('平移模式');
        } catch {}
        break;

      case 'zoom':
        try {
          caeEngineRef.current.setInteractionMode?.(CAEInteractionMode.ORBIT);
          message.success('缩放模式');
        } catch {}
        break;

      default:
        console.log('工具选择:', tool);
    }
  }, [renderMode, sectionMode, onToolSelect, onRenderModeChange]);

  // 外部工具联动
  useEffect(() => {
    if (!externalTool) return;
    handleToolSelect(externalTool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalTool]);

  // 外部剖切轴/位置联动
  useEffect(() => {
    if (externalSectionAxis) setSectionAxis(externalSectionAxis);
  }, [externalSectionAxis]);
  useEffect(() => {
    if (typeof externalSectionPosition === 'number') setSectionPosition(externalSectionPosition);
  }, [externalSectionPosition]);

  const updateRenderMode = (mode: GeologyRenderMode) => {
    if (!geologicalRendererRef.current) return;
    const showWireframe = mode === 'wireframe';
    geologicalRendererRef.current.updateRenderingOptions({ showWireframe });
    console.log('更新渲染模式:', mode);
    // 简易透明模式支持
    if (mode === 'transparent') {
      const scene = caeEngineRef.current?.scene;
      const root = scene?.getObjectByName('GeologicalModel') || scene;
      root?.traverse(obj => {
        const m = (obj as any).material;
        if (m) {
          const mats = Array.isArray(m) ? m : [m];
          mats.forEach(mt => {
            mt.transparent = true;
            mt.opacity = Math.min(globalOpacity, 0.5);
            mt.depthWrite = false;
          });
        }
      });
    }
  };

  const resetView = () => {
    if (!caeEngineRef.current) return;
    
    const camera = caeEngineRef.current.camera;
    // 尝试根据模型自适应
    try {
      geologicalRendererRef.current?.fitCameraToModel(camera);
    } catch {
      camera.position.set(50, 50, 50);
      camera.lookAt(0, 0, 0);
    }
    
    const controls = caeEngineRef.current.orbitControls;
    controls.reset();
    
    message.info('视图已重置');
  };

  // 剖切模式：启用/禁用全局裁剪平面（简单X轴示例，可扩展）
  useEffect(() => {
    if (!caeEngineRef.current) return;
    const renderer = caeEngineRef.current.renderer as any;
    if (!renderer) return;
    renderer.localClippingEnabled = !!sectionMode;
    if (!sectionMode) {
      geologicalRendererRef.current?.applyClippingPlanes(null);
    } else {
      // 根据轴设置裁剪平面，位置由 sectionPosition 控制
      const normal =
        sectionAxis === 'x' ? new THREE.Vector3(-1, 0, 0) :
        sectionAxis === 'y' ? new THREE.Vector3(0, -1, 0) :
                              new THREE.Vector3(0, 0, -1);
      const plane = new THREE.Plane(normal, sectionPosition);
      geologicalRendererRef.current?.applyClippingPlanes([plane]);
    }
  }, [sectionMode, sectionAxis, sectionPosition]);

  // 显示钻孔：联动可见性
  useEffect(() => {
    if (!caeEngineRef.current) return;
    const group = caeEngineRef.current.scene.getObjectByName('boreholes');
    if (group) group.visible = showBoreholes;
  }, [showBoreholes]);

  // 全局透明度：统一调整地质模型材质
  useEffect(() => {
    if (!caeEngineRef.current) return;
    const scene = caeEngineRef.current.scene;
    const root = scene.getObjectByName('GeologicalModel') || scene;
    root.traverse(obj => {
      const m = (obj as any).material;
      if (m) {
        const mats = Array.isArray(m) ? m : [m];
        mats.forEach(mt => {
          if (typeof mt.opacity === 'number') {
            mt.transparent = globalOpacity < 1.0;
            mt.opacity = globalOpacity;
          }
        });
      }
    });
  }, [globalOpacity]);

  // 测距：点击拾取两点
  useEffect(() => {
    if (!isMeasuringDistance || !caeEngineRef.current || !containerRef.current) return;
    const engine = caeEngineRef.current;
    const dom = engine.renderer?.domElement || containerRef.current;
    const scene = engine.scene;
    const camera = engine.camera;
    const raycaster = new THREE.Raycaster();
    const onClick = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      const hit = intersects.find(it => (it.object as any).isMesh);
      if (!hit) return;
      const p = hit.point.clone();
      measurementPointsRef.current.push(p);
      // 可视化点
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xff5555 })
      );
      sphere.position.copy(p);
      scene.add(sphere);
      measurementObjectsRef.current.push(sphere);
      if (measurementPointsRef.current.length === 2) {
        const [p1, p2] = measurementPointsRef.current;
        const geom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0xffffff }));
        scene.add(line);
        measurementObjectsRef.current.push(line);
        const dist = p1.distanceTo(p2);
        message.success(`测距: ${dist.toFixed(2)} m`);
        setIsMeasuringDistance(false);
        // 清空，以便下次测量
        measurementPointsRef.current = [];
      }
    };
    dom.addEventListener('click', onClick);
    return () => dom.removeEventListener('click', onClick);
  }, [isMeasuringDistance]);

  // 测角：点击拾取三点
  useEffect(() => {
    if (!isMeasuringAngle || !caeEngineRef.current || !containerRef.current) return;
    const engine = caeEngineRef.current;
    const dom = engine.renderer?.domElement || containerRef.current;
    const scene = engine.scene;
    const camera = engine.camera;
    const raycaster = new THREE.Raycaster();
    const onClick = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      const hit = intersects.find(it => (it.object as any).isMesh);
      if (!hit) return;
      const p = hit.point.clone();
      measurementPointsRef.current.push(p);
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0x55ff55 })
      );
      sphere.position.copy(p);
      scene.add(sphere);
      measurementObjectsRef.current.push(sphere);
      if (measurementPointsRef.current.length === 3) {
        const [a, b, c] = measurementPointsRef.current; // 角点在 b
        const v1 = a.clone().sub(b).normalize();
        const v2 = c.clone().sub(b).normalize();
        const angle = Math.acos(THREE.MathUtils.clamp(v1.dot(v2), -1, 1));
        const deg = THREE.MathUtils.radToDeg(angle);
        // 简易弧线（仅作为视觉反馈）
        const arcPoints: THREE.Vector3[] = [];
        const steps = 24;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const dir = v1.clone().lerp(v2, t).normalize();
          arcPoints.push(b.clone().add(dir.multiplyScalar(5)));
        }
        const arcGeom = new THREE.BufferGeometry().setFromPoints(arcPoints);
        const arc = new THREE.Line(arcGeom, new THREE.LineBasicMaterial({ color: 0x00ffff }));
        scene.add(arc);
        measurementObjectsRef.current.push(arc);
        message.success(`测角: ${deg.toFixed(1)}°`);
        setIsMeasuringAngle(false);
        measurementPointsRef.current = [];
      }
    };
    dom.addEventListener('click', onClick);
    return () => dom.removeEventListener('click', onClick);
  }, [isMeasuringAngle]);

  // 外部爆炸视图联动
  useEffect(() => {
    if (typeof externalExplodeOffset !== 'number') return;
    const oldValue = prevExplodeOffsetRef.current;
    if (geologicalRendererRef.current) {
      geologicalRendererRef.current.applyExplode(externalExplodeOffset);
      const apply = () => geologicalRendererRef.current?.applyExplode(externalExplodeOffset);
      const revert = () => geologicalRendererRef.current?.applyExplode(oldValue);
      pushCommand({ label: `爆炸强度 ${oldValue} → ${externalExplodeOffset}`, apply, revert });
    }
    prevExplodeOffsetRef.current = externalExplodeOffset;
  }, [externalExplodeOffset]);

  // 截图导出
  const exportScreenshot = useCallback(() => {
    if (!caeEngineRef.current) return;
    const canvas = (caeEngineRef.current.renderer as any)?.domElement as HTMLCanvasElement | undefined;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `geology_view_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      message.success('已导出PNG截图');
    } catch (e) {
      console.error('截图导出失败', e);
      message.error('截图导出失败');
    }
  }, []);

  // 导出 glTF
  const exportGLTF = useCallback(() => {
    if (!caeEngineRef.current) return;
    const exporter = new GLTFExporter();
    const scene = caeEngineRef.current.scene;
    const target = scene.getObjectByName('GeologicalModel') || scene; // 优先导出地质组
    exporter.parse(
      target,
      (result: ArrayBuffer | object) => {
        try {
          let blob: Blob;
          let filename: string;
          if (result instanceof ArrayBuffer) {
            blob = new Blob([result], { type: 'model/gltf-binary' });
            filename = `geology_model_${Date.now()}.glb`;
          } else {
            const json = JSON.stringify(result);
            blob = new Blob([json], { type: 'model/gltf+json' });
            filename = `geology_model_${Date.now()}.gltf`;
          }
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          message.success('已导出 glTF');
        } catch (e) {
          console.error('导出 glTF 失败', e);
          message.error('导出 glTF 失败');
        }
      },
      (error) => {
        console.error('GLTFExporter error', error);
        message.error('导出 glTF 失败');
      },
      { binary: true }
    );
  }, []);

  // 导出 JSON（模型数据）
  const exportJSON = useCallback(() => {
    try {
      const data = lastModelDataRef.current;
      if (!data) {
        message.warning('暂无模型数据可导出');
        return;
      }
      const json = JSON.stringify(data);
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `geology_model_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      message.success('已导出 JSON');
    } catch (e) {
      console.error('导出 JSON 失败', e);
      message.error('导出 JSON 失败');
    }
  }, []);

  // 外部截图触发
  useEffect(() => {
    if (typeof externalScreenshotNonce === 'number') {
      exportScreenshot();
    }
  }, [externalScreenshotNonce, exportScreenshot]);

  // 监听导出事件（从右侧工具区触发）
  useEffect(() => {
    const onExportGLTF = () => exportGLTF();
    const onExportJSON = () => exportJSON();
    window.addEventListener('geology:export:gltf', onExportGLTF);
    window.addEventListener('geology:export:json', onExportJSON);
    return () => {
      window.removeEventListener('geology:export:gltf', onExportGLTF);
      window.removeEventListener('geology:export:json', onExportJSON);
    };
  }, [exportGLTF, exportJSON]);

  // 标注：点击添加标签
  useEffect(() => {
    if (!caeEngineRef.current) return;
    const engine = caeEngineRef.current;
    const dom = (engine.renderer as any)?.domElement || containerRef.current;
    if (!dom) return;

    const onClick = (e: MouseEvent) => {
      if (!isAnnotatingRef.current) return;
      const rect = (dom as HTMLElement).getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const camera = engine.camera as THREE.PerspectiveCamera;
      const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      // 仅对Mesh拾取
      const meshes: THREE.Object3D[] = [];
      engine.scene.traverse(obj => { if ((obj as any).isMesh) meshes.push(obj); });
      const hits = raycaster.intersectObjects(meshes, true);
      if (hits.length === 0) return;
      const hit = hits[0];
      const position = hit.point.clone();
      const baseName = (hit.object?.name) || '注释';
      const labelText = `${baseName}-${annotationCounterRef.current++}`;

      const sprite = createLabelSprite(labelText);
      sprite.position.copy(position);

      let group = engine.scene.getObjectByName('Annotations') as THREE.Group | null;
      if (!group) {
        group = new THREE.Group();
        group.name = 'Annotations';
        engine.scene.add(group);
      }
      group.add(sprite);
      annotationSpritesRef.current.push(sprite);
      message.success('已添加标注');

      const apply = () => group?.add(sprite);
      const revert = () => group?.remove(sprite);
      pushCommand({ label: `添加标注 ${labelText}`, apply, revert });
    };

    (dom as HTMLElement).addEventListener('click', onClick);
    return () => (dom as HTMLElement).removeEventListener('click', onClick);
  }, []);

  function createLabelSprite(text: string): THREE.Sprite {
    const fontSize = 24;
    const padding = 12;
    const radius = 8;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = `${fontSize}px sans-serif`;
    const w = Math.ceil(ctx.measureText(text).width);
    const h = Math.ceil(fontSize * 1.4);
    canvas.width = w + padding * 2;
    canvas.height = h + padding * 2;
    // 背景圆角矩形
    const drawRoundRect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    drawRoundRect(ctx, 0, 0, canvas.width, canvas.height, radius);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,217,255,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 文本
    ctx.fillStyle = '#e6f7ff';
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, padding, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.setScalar(1.0);
    ;(sprite as any).isAnnotation = true;
    return sprite;
  }

  // ==================== 图层控制 ====================
  // 图层可见性由外部面板/数据驱动，如需联动可在此处接入。

  // ==================== 渲染UI ====================

  // 内部地质控制面板已移除，改由外部控制区统一管理

  const renderStatusBar = () => (
  // 渲染状态栏（中文模式标签 + 导出按钮图标）
    <div className={styles.statusBar}>
      <div className={styles.statusLeft}>
        <Badge status={isInitialized ? 'success' : 'processing'} text={isInitialized ? '就绪' : '初始化中'} />
        <span className={styles.sep}>|</span>
        <Tooltip title="性能模式切换（高/均衡/极速）">
          <Button size="small" shape="round" className={styles.pill} onClick={() => setQualityMode(prev => prev === 'high' ? 'balanced' : prev === 'balanced' ? 'speed' : 'high')}>
            性能: {qualityMode === 'high' ? '高' : qualityMode === 'balanced' ? '均' : '速'}
          </Button>
        </Tooltip>
        <span className={styles.sep}>|</span>
        <Tooltip title="地层数量">
          <span className={styles.metricBlue}>地层: {lastModelDataRef.current?.statistics.formation_count ?? (geologicalData?.statistics.formation_count || 0)}</span>
        </Tooltip>
        <span className={styles.sep}>|</span>
        <Tooltip title="钻孔数量">
          <span className={styles.metricBlue}>钻孔: {boreholeData.length}</span>
        </Tooltip>
        <span className={styles.sep}>|</span>
        <Tooltip title="渲染模式">
      <span className={styles.metricBlue}>模式: {{ solid: '实体', wireframe: '线框', transparent: '透明', section: '剖面' }[renderMode]}</span>
        </Tooltip>
        <span className={styles.sep}>|</span>
        <Tooltip title="帧率">
          <span className={fps >= 50 ? styles.fpsGreen : fps >= 30 ? styles.fpsAmber : styles.fpsRed}>FPS: {Math.round(fps)}</span>
        </Tooltip>
        <span className={styles.sep}>|</span>
        <Tooltip title="相机位置">
          <span className={styles.metricCam}>相机: {cameraInfo}</span>
        </Tooltip>
      </div>

      <Space size={8}>
        <Tooltip title="导出PNG截图">
      <Button size="small" shape="round" className={styles.pill} icon={<FileImageOutlined />} onClick={exportScreenshot}>PNG</Button>
        </Tooltip>
        <Tooltip title="导出glTF">
      <Button size="small" shape="round" className={styles.pill} icon={<CloudDownloadOutlined />} onClick={exportGLTF}>glTF</Button>
        </Tooltip>
        <Tooltip title="导出JSON">
      <Button size="small" shape="round" className={styles.pill} icon={<FileTextOutlined />} onClick={exportJSON}>JSON</Button>
        </Tooltip>
        <Tooltip title="重置视图">
      <Button size="small" shape="round" className={styles.pill} icon={<ReloadOutlined />} onClick={resetView}>重置</Button>
        </Tooltip>
      </Space>
    </div>
  );

  // ==================== 主渲染 ====================

  return (
    <div className={`${styles.root} ${className || ''}`}>
      {/* 角标水印 */}
  <div className={styles.watermark}>
        GEOLOGY 3D VIEWPORT
      </div>
  {/* 暗角提升视觉聚焦 */}
  <div className={styles.vignette} />
      {/* 3D渲染容器 */}
  <div ref={containerRef} className={styles.canvas} />

      {/* 几何建模工具栏 - 已禁用，由外部模块控制 */}

      {/* 地质控制面板 - 已禁用，避免与外部右侧栏冲突 */}

      {/* 剖切控制 - 已禁用，由外部模块统一控制 */}

      {/* 状态栏 */}
      {renderStatusBar()}

      {/* 加载指示器 */}
  {(!isInitialized || !containerReady) && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingCard}>
            <div className={styles.loadingIcon}>🏔️</div>
    <div>{containerReady ? '正在初始化地质重建3D视口...' : '容器未就绪，等待布局完成...'}</div>
            <div className={styles.loadingSub}>GemPy → PyVista → Three.js</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeologyReconstructionViewport3D;